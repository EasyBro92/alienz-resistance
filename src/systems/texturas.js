import * as THREE from 'three'
import { DETALLE } from './detalle.js'

// Texturas dibujadas por código al arrancar. Ni un archivo de imagen: la regla
// del proyecto es que todo sea procedural, y además una textura generada se
// puede repetir sin costura y cambiar de tono con un parámetro.
//
// Cada superficie sale de un campo de alturas. De ahí se derivan las dos cosas
// que hacen falta: el color, y el mapa de normales que hace que el relieve
// reaccione a la luz del sol. Un color con grano pero sin relieve sigue
// leyéndose plano; es la normal la que mete la piedra del asfalto dentro de la
// escena.

// Generar las cuatro texturas de 512 cuesta 149 ms, y son cuatro píxeles de
// trabajo por cada uno de 256. El asfalto se ve en escorzo y repetido veintidós
// veces a lo largo de la carretera: a la mitad de lado nadie nota la diferencia,
// y el arranque se acorta en más de cien milisegundos.
const LADO = DETALLE > 0.7 ? 512 : 256

// --- ruido -------------------------------------------------------------------
// Ruido de valor con envoltura: la rejilla se toma en módulo, así que el borde
// derecho continúa en el izquierdo y la textura se repite sin junta visible.
function crearRuido (semilla) {
  let e = semilla >>> 0
  const azar = () => {
    e ^= e << 13; e >>>= 0
    e ^= e >> 17
    e ^= e << 5; e >>>= 0
    return e / 4294967296
  }
  return { azar }
}

const suave = t => t * t * (3 - 2 * t)

// Campo de valores en una rejilla de `n`×`n` que se interpola y envuelve.
function capa (n, azar) {
  const v = new Float32Array(n * n)
  for (let i = 0; i < v.length; i++) v[i] = azar()
  return (x, y) => {
    const fx = x * n, fy = y * n
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const tx = suave(fx - x0), ty = suave(fy - y0)
    const i0 = ((x0 % n) + n) % n, j0 = ((y0 % n) + n) % n
    const i1 = (i0 + 1) % n, j1 = (j0 + 1) % n
    const a = v[j0 * n + i0], b = v[j0 * n + i1]
    const c = v[j1 * n + i0], d = v[j1 * n + i1]
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty
  }
}

// Varias capas de distinto tamaño sumadas: es lo que separa "ruido de
// televisión" de algo que parece un material.
function campo (semilla, octavas) {
  const { azar } = crearRuido(semilla)
  const capas = octavas.map(([n]) => capa(n, azar))
  const pesos = octavas.map(([, p]) => p)
  const suma = pesos.reduce((a, b) => a + b, 0)
  return (x, y) => {
    let t = 0
    for (let i = 0; i < capas.length; i++) t += capas[i](x, y) * pesos[i]
    return t / suma
  }
}

// --- de altura a normal --------------------------------------------------------
// Sobel sobre el campo de alturas. Sin tangentes: three.js las deduce de las
// derivadas de pantalla, así que basta con que la geometría tenga coordenadas.
function normalDesdeAltura (altura, fuerza) {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = LADO
  const ctx = lienzo.getContext('2d')
  const img = ctx.createImageData(LADO, LADO)
  const en = (x, y) => altura[((y + LADO) % LADO) * LADO + ((x + LADO) % LADO)]
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const dx = (en(x + 1, y) - en(x - 1, y)) * fuerza
      const dy = (en(x, y + 1) - en(x, y - 1)) * fuerza
      // Normalizar el vector (-dx, -dy, 1) y llevarlo al rango 0..1 del píxel.
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1)
      const i = (y * LADO + x) * 4
      img.data[i] = (-dx * inv * 0.5 + 0.5) * 255
      img.data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(lienzo)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// El mapa de color MULTIPLICA al color del material. Si la textura lleva el
// tono dentro, se multiplican dos grises medios y sale casi negro: es lo que
// pasó al primer intento, la carretera quedó de alquitrán fresco y el arenal
// naranja chillón. Así que las texturas se pintan casi blancas y solo modulan;
// el color de verdad lo sigue poniendo el material, que es donde se ajusta.
function texturaColor (pinta) {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = LADO
  const ctx = lienzo.getContext('2d')
  const img = ctx.createImageData(LADO, LADO)
  pinta(img.data)
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(lienzo)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  // Anisotropía alta: la carretera se ve casi de canto en el fondo del
  // encuadre, y sin esto el grano se convierte allí en una papilla que hierve.
  t.anisotropy = 8
  return t
}

// --- asfalto -------------------------------------------------------------------
function asfalto () {
  // Solo grano fino. Todo lo que sea más grande que el propio azulejo se ve
  // repetirse: la primera versión llevaba manchas de remiendo dentro y, con la
  // textura repetida veintidós veces a lo largo de la carretera, las manchas
  // salían en franjas regulares y se leía el azulejo. Los remiendos grandes van
  // aparte, como manchas de verdad sobre el asfalto.
  const grano = campo(0x51ff3d, [[256, 1], [64, 0.5], [24, 0.3]])
  const altura = new Float32Array(LADO * LADO)

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const u = x / LADO, v = y / LADO
      // El árido: piedra suelta dentro del betún. Se eleva al cubo para que
      // haya pocas piedras marcadas y mucho fondo liso, como es de verdad.
      const g = Math.pow(grano(u, v), 3)
      altura[y * LADO + x] = g
    }
  }

  const map = texturaColor(datos => {
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        const g = altura[y * LADO + x]
        const c = 236 + (g - 0.25) * 64
        const i = (y * LADO + x) * 4
        datos[i] = c
        datos[i + 1] = c * 0.995
        datos[i + 2] = c * 0.985
        datos[i + 3] = 255
      }
    }
  })

  return { map, normalMap: normalDesdeAltura(altura, 150) }
}

// --- arena ---------------------------------------------------------------------
function arena () {
  const grano = campo(0x1f77b4, [[300, 1], [90, 0.4]])
  const dunas = campo(0x2ca02c, [[10, 1], [26, 0.4]])
  const altura = new Float32Array(LADO * LADO)

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const u = x / LADO, v = y / LADO
      // Onda de viento sobre el grano: la arena del desierto se peina.
      const onda = Math.sin((u * 26 + dunas(u, v) * 5) * Math.PI * 2) * 0.5 + 0.5
      altura[y * LADO + x] = grano(u, v) * 0.6 + onda * 0.4
    }
  }

  const map = texturaColor(datos => {
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        const h = altura[y * LADO + x]
        const d = dunas(x / LADO, y / LADO)
        const c = 238 + (h - 0.5) * 22 + (d - 0.5) * 16
        const i = (y * LADO + x) * 4
        datos[i] = c
        datos[i + 1] = c * 0.985
        datos[i + 2] = c * 0.95
        datos[i + 3] = 255
      }
    }
  })

  return { map, normalMap: normalDesdeAltura(altura, 70) }
}

// Se generan una sola vez y se comparten: son dos texturas de medio mega cada
// una y no tiene ningún sentido tener dos copias de la misma arena.
let cache = null

export function texturasDelSuelo () {
  if (!cache) cache = { asfalto: asfalto(), arena: arena() }
  return cache
}
