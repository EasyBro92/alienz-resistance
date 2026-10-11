// Las cuatro cuentas de audio que hacen falta para preparar las voces, sin
// programas de fuera: leer un .wav, recortarle el silencio, igualar el volumen y
// pasarlo a MP3. Todo sobre Float32Array de una sola pista.
import fs from 'node:fs'
import { Mp3Encoder } from '@breezystack/lamejs'

// Un .wav de 16 bits → { hz, datos }. Busca los trozos por su nombre: el de
// Windows trae un bloque de más entre la cabecera y el sonido.
export function leerWav (ruta) {
  const b = fs.readFileSync(ruta)
  let p = 12
  let hz = 16000; let canales = 1; let bits = 16; let datos = null
  while (p + 8 <= b.length) {
    const nombre = b.toString('ascii', p, p + 4)
    const largo = b.readUInt32LE(p + 4)
    if (nombre === 'fmt ') {
      canales = b.readUInt16LE(p + 10); hz = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22)
    } else if (nombre === 'data') {
      const n = Math.floor(Math.min(largo, b.length - p - 8) / (bits / 8) / canales)
      datos = new Float32Array(n)
      for (let i = 0; i < n; i++) datos[i] = b.readInt16LE(p + 8 + i * 2 * canales) / 32768
    }
    p += 8 + largo + (largo & 1)
  }
  if (!datos || bits !== 16) throw new Error('wav raro: ' + ruta)
  return { hz, datos }
}

// Fuera el silencio de delante y de detrás (Windows deja medio segundo), con un
// margen corto y una rampa para que no chasquee al empezar ni al cortar.
export function recortar (d, hz, umbral = 0.012) {
  let a = 0; let b = d.length - 1
  while (a < b && Math.abs(d[a]) < umbral) a++
  while (b > a && Math.abs(d[b]) < umbral) b--
  a = Math.max(0, a - Math.round(hz * 0.012))
  b = Math.min(d.length - 1, b + Math.round(hz * 0.05))
  const s = d.slice(a, b + 1)
  const rampa = Math.min(Math.round(hz * 0.006), s.length >> 1)
  for (let i = 0; i < rampa; i++) { s[i] *= i / rampa; s[s.length - 1 - i] *= i / rampa }
  return s
}

// Las pausas de dentro, a raya. Una frase de dos golpes («Aquí Halcón. Bombas
// fuera.») sale con medio segundo de silencio entre uno y otro, que leyendo un
// cuento está bien y en mitad de una batalla es una eternidad: todo silencio de
// más de `tope` segundos se queda en `tope`, con una rampa a cada lado del corte.
export function apretar (d, hz, tope = 0.14, umbral = 0.012) {
  const max = Math.round(hz * tope)
  const rampa = Math.round(hz * 0.004)
  const trozos = []
  let desde = 0; let i = 0
  while (i < d.length) {
    if (Math.abs(d[i]) >= umbral) { i++; continue }
    let j = i
    while (j < d.length && Math.abs(d[j]) < umbral) j++
    if (j - i > max && i > 0 && j < d.length) {
      // Se queda la mitad del tope pegada a cada lado y se tira lo de en medio.
      const a = d.slice(desde, i + (max >> 1)); const b = j - (max >> 1)
      for (let k = 0; k < rampa && k < a.length; k++) a[a.length - 1 - k] *= k / rampa
      trozos.push(a)
      desde = b
    }
    i = j
  }
  if (!trozos.length) return d
  const resto = d.slice(desde)
  for (let k = 0; k < rampa && k < resto.length; k++) resto[k] *= k / rampa
  trozos.push(resto)
  return juntar(trozos)
}

// Todas las frases igual de fuertes: se iguala la energía media de lo que suena
// (no la del silencio de entre palabras) y se pone un techo al pico.
export function igualar (d, objetivo = 0.13, techo = 0.89) {
  let suma = 0; let n = 0
  for (const v of d) if (Math.abs(v) > 0.02) { suma += v * v; n++ }
  const media = Math.sqrt(suma / Math.max(1, n))
  let k = media > 0 ? objetivo / media : 1
  let pico = 0
  for (const v of d) pico = Math.max(pico, Math.abs(v))
  if (pico * k > techo) k = techo / pico
  return d.map(v => v * k)
}

// Un filtro de segundo orden (las fórmulas de siempre, las de Bristow-Johnson).
export function filtrar (d, hz, tipo, f, q = 0.707) {
  const w = 2 * Math.PI * f / hz
  const c = Math.cos(w); const alfa = Math.sin(w) / (2 * q)
  let b0, b1, b2
  if (tipo === 'paso-bajo') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0 } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0 }
  const a0 = 1 + alfa; const a1 = -2 * c; const a2 = 1 - alfa
  const s = new Float32Array(d.length)
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  for (let i = 0; i < d.length; i++) {
    const y = (b0 * d[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = d[i]; y2 = y1; y1 = y
    s[i] = y
  }
  return s
}

// Cambiar de frecuencia de muestreo y, de paso, de tono: `tono` 1,1 la deja un
// 10 % más aguda y un 10 % más corta (quien la pide ya la encargó un 10 % más
// larga, y se queda en lo que tenía que durar). Antes de quitar muestras se
// filtra lo que no cabe en la frecuencia nueva, o vuelve doblado como un siseo.
export function afinar (d, hzEntrada, hzSalida, tono = 1) {
  const paso = tono * hzEntrada / hzSalida
  if (Math.abs(paso - 1) < 1e-6) return d
  let s = d
  if (paso > 1) {
    const corte = 0.45 * hzEntrada / paso
    s = filtrar(filtrar(s, hzEntrada, 'paso-bajo', corte, 0.54), hzEntrada, 'paso-bajo', corte, 1.31)
  }
  const n = Math.floor((s.length - 1) / paso)
  const sale = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = i * paso
    const a = Math.floor(x)
    sale[i] = s[a] + (s[a + 1] - s[a]) * (x - a)
  }
  return sale
}

// La voz por una radio de campaña, para las muestras que se mandan a oír. En el
// juego esto mismo lo hace `voces.js` con nodos de audio; aquí va a mano.
export function porRadio (d, hz, { grave = 420, agudo = 3000, empuje = 2.6, ruido = 0.012 } = {}) {
  let s = filtrar(filtrar(d, hz, 'paso-alto', grave), hz, 'paso-bajo', agudo)
  s = s.map(v => Math.tanh(v * empuje) / Math.tanh(empuje) * 0.8)
  // El chasquido del pulsador al abrir y al soltar, y la paja de fondo mientras habla.
  const clic = Math.round(hz * 0.035)
  const todo = new Float32Array(s.length + clic * 2)
  for (let i = 0; i < todo.length; i++) todo[i] = (Math.random() * 2 - 1) * ruido
  for (let i = 0; i < clic; i++) {
    const k = (1 - i / clic) * 0.22
    todo[i] += (Math.random() * 2 - 1) * k
    todo[todo.length - clic + i] += (Math.random() * 2 - 1) * (i / clic) * 0.22
  }
  for (let i = 0; i < s.length; i++) todo[i + clic] += s[i]
  return filtrar(todo, hz, 'paso-bajo', 3400)
}

// Float32 → MP3 de una pista. A 24 kbps y 16 kHz una frase de un segundo pesa 3 KB.
export function aMp3 (d, hz, kbps = 32) {
  const cod = new Mp3Encoder(1, hz, kbps)
  const pcm = new Int16Array(d.length)
  for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, Math.round(d[i] * 32767)))
  const trozos = []
  for (let i = 0; i < pcm.length; i += 1152) {
    const t = cod.encodeBuffer(pcm.subarray(i, i + 1152))
    if (t.length) trozos.push(Buffer.from(t))
  }
  const fin = cod.flush()
  if (fin.length) trozos.push(Buffer.from(fin))
  return Buffer.concat(trozos)
}

export const silencio = (hz, segundos) => new Float32Array(Math.round(hz * segundos))

export function juntar (trozos) {
  const todo = new Float32Array(trozos.reduce((n, t) => n + t.length, 0))
  let p = 0
  for (const t of trozos) { todo.set(t, p); p += t.length }
  return todo
}
