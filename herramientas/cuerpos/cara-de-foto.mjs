// Pegar la cara de una FOTO sobre la cabeza de un cuerpo hecho fuera (el de
// `cuerpo_de_fuera.py`, que deja en vistas/cuerpos/<clave>.json la malla y en
// <clave>.png la textura, con la cabeza en la mitad derecha).
//
// Isidro, 14/10/2026: generó con Hunyuan3D un personaje parecido a él y pidió
// «ponle mi cara», con una foto suya de frente. La IA no saca una cara clavada a
// partir de una descripción; la foto sí lo es. Lo que se hace:
//
//   1. Se mira la cabeza DE FRENTE (`ver`): una foto ortográfica con una regla,
//      para leer dónde caen los ojos y la boca del modelo.
//   2. Se dan esos tres puntos y los mismos tres de la foto, y con eso queda una
//      afinidad (girar, escalar, estirar y mover) de la cara del modelo vista de
//      frente a la foto. Con tres puntos encaja exacta: ojos y boca caen en su
//      sitio aunque las proporciones de la cara no sean las mismas.
//   3. Para cada píxel de la textura de la cabeza se busca su punto en 3D, se
//      mira si se ve de frente (si no, la foto no sabe qué hay ahí: la oreja, la
//      nuca) y se pinta con la foto, con más fuerza cuanto más de cara mira el
//      punto y dentro de un óvalo que va de las cejas a la barba, difuminado en
//      el borde. Fuera del óvalo se queda la piel del modelo, y para que no se
//      note la costura la foto se lleva hacia el tono de piel del modelo.
//
//   node herramientas/cuerpos/cara-de-foto.mjs ver <clave>
//   node herramientas/cuerpos/cara-de-foto.mjs pegar <clave> <foto> --modelo ox,oy,dx,dy,bx,by --foto ox,oy,dx,dy,bx,by
//        [--ovalo cx,cy,rx,ry] [--tono 0.7]
//   node herramientas/cuerpos/cara-de-foto.mjs fotos <clave>       frente y tres cuartos, para revisar
//
// Puntos del modelo en METROS (x, y de la vista de frente, como los da `ver`);
// los de la foto, en píxeles. El orden: ojo izquierdo de la imagen, ojo derecho, boca.
// `pegar` guarda la textura original como <clave>-sin-cara.png la primera vez y
// siempre parte de ella: se puede repetir con otros puntos sin acumular capas.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const TRABAJO = path.resolve(aqui, '../blender/vistas/cuerpos')
const VISTAS = path.resolve(aqui, '../../vistas')
const [modo, clave, fotoRuta] = process.argv.slice(2)
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1].split(',').map(Number) : d }

const malla = JSON.parse(fs.readFileSync(path.join(TRABAJO, clave + '.json'), 'utf8'))
const P = malla.pos; const N = malla.normal; const U = malla.uv; const I = malla.indices
const original = path.join(TRABAJO, clave + '-sin-cara.png')
const actual = path.join(TRABAJO, clave + '.png')
if (modo === 'pegar' && !fs.existsSync(original)) fs.copyFileSync(actual, original)

async function leer (ruta) {
  const { data, info } = await sharp(ruta).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height }
}
const muestra = (img, x, y) => {
  // bilineal
  x = Math.max(0, Math.min(img.w - 1.001, x)); y = Math.max(0, Math.min(img.h - 1.001, y))
  const x0 = Math.floor(x); const y0 = Math.floor(y); const fx = x - x0; const fy = y - y0
  const s = [0, 0, 0]
  for (const [dx, dy, k] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const o = ((y0 + dy) * img.w + x0 + dx) * 3
    for (let c = 0; c < 3; c++) s[c] += img.d[o + c] * k
  }
  return s
}

// Rellenar un triángulo de pantalla llamando a `f(x, y, a, b, c)` con sus baricéntricas.
function triangulo (ax, ay, bx, by, cx, cy, f) {
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))); const x1 = Math.ceil(Math.max(ax, bx, cx))
  const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))); const y1 = Math.ceil(Math.max(ay, by, cy))
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
  if (Math.abs(area) < 1e-12) return
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5; const py = y + 0.5
      const a = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
      const b = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
      const c = 1 - a - b
      if (a < -1e-6 || b < -1e-6 || c < -1e-6) continue
      f(x, y, a, b, c)
    }
  }
}

// La cabeza: de la coronilla a 0,32 m por debajo.
let ymax = -Infinity
for (let i = 1; i < P.length; i += 3) ymax = Math.max(ymax, P[i])
const yCabeza = ymax - 0.32

// Foto ortográfica girada `ang` grados alrededor del eje vertical, de la cabeza.
// Devuelve la imagen (y, si se pide, la profundidad) a `escala` píxeles por metro.
function vista (tex, ang, escala, conLuz = true) {
  const ca = Math.cos(ang * Math.PI / 180); const sa = Math.sin(ang * Math.PI / 180)
  const giro = (x, z) => [x * ca + z * sa, -x * sa + z * ca]
  const W = Math.round(0.36 * escala); const H = Math.round(0.36 * escala)
  const x0 = -0.18; const yTop = ymax + 0.02
  const pant = i => { const [x, z] = giro(P[i * 3], P[i * 3 + 2]); return [(x - x0) * escala, (yTop - P[i * 3 + 1]) * escala, z] }
  const z = new Float32Array(W * H).fill(-Infinity)
  const img = Buffer.alloc(W * H * 3, 200)
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (P[i * 3 + 1] < yCabeza - 0.05) continue
    const a = pant(i); const b = pant(j); const c = pant(k)
    triangulo(a[0], a[1], b[0], b[1], c[0], c[1], (x, y, wa, wb, wc) => {
      if (x >= W || y >= H) return
      const zz = a[2] * wa + b[2] * wb + c[2] * wc
      const o = y * W + x
      if (zz <= z[o]) return
      z[o] = zz
      const u = U[i * 2] * wa + U[j * 2] * wb + U[k * 2] * wc
      const v = U[i * 2 + 1] * wa + U[j * 2 + 1] * wb + U[k * 2 + 1] * wc
      const col = muestra(tex, u * tex.w, v * tex.h)
      let luz = 1
      if (conLuz) {
        const nx = N[i * 3] * wa + N[j * 3] * wb + N[k * 3] * wc
        const nz = N[i * 3 + 2] * wa + N[j * 3 + 2] * wb + N[k * 3 + 2] * wc
        const ny = N[i * 3 + 1] * wa + N[j * 3 + 1] * wb + N[k * 3 + 1] * wc
        const [rx, rz] = giro(nx, nz)
        const l = Math.hypot(rx, ny, rz) || 1
        luz = 0.55 + 0.5 * Math.max(0, (rx * -0.3 + ny * 0.35 + rz * 0.88) / l)
      }
      for (let ch = 0; ch < 3; ch++) img[o * 3 + ch] = Math.min(255, col[ch] * luz)
    })
  }
  return { img, z, W, H, x0, yTop, escala }
}

if (modo === 'ver') {
  const tex = await leer(actual)
  const v = vista(tex, 0, 2500, false)
  // Regla cada centímetro (cada 5, más marcada) con su valor en metros.
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${v.W}" height="${v.H}">`
  for (let cm = -18; cm <= 18; cm++) {
    const x = (cm / 100 - v.x0) * v.escala
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${v.H}" stroke="${cm % 5 ? '#0f0' : '#f00'}" stroke-opacity="0.45"/>`
    if (!(cm % 5)) svg += `<text x="${x + 2}" y="14" fill="#ff0" font-size="13">${(cm / 100).toFixed(2)}</text>`
  }
  for (let cm = 0; cm <= 36; cm++) {
    const y = cm / 100 * v.escala; const val = v.yTop - cm / 100
    svg += `<line x1="0" y1="${y}" x2="${v.W}" y2="${y}" stroke="${Math.round(val * 100) % 5 ? '#0f0' : '#f00'}" stroke-opacity="0.45"/>`
    if (!(Math.round(val * 100) % 5)) svg += `<text x="2" y="${y - 2}" fill="#ff0" font-size="13">${val.toFixed(2)}</text>`
  }
  svg += '</svg>'
  const salida = path.join(VISTAS, `cara-${clave}-regla.png`)
  await sharp(v.img, { raw: { width: v.W, height: v.H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).png().toFile(salida)
  console.log(salida)
}

if (modo === 'pegar') {
  const tex = await leer(original)
  const foto = await leer(fotoRuta)
  const m = arg('--modelo'); const f = arg('--foto')
  if (!m || !f) throw new Error('faltan --modelo y --foto')
  // Afinidad: (x, y) del modelo → (px, py) de la foto, exacta en los tres puntos.
  const resolver = (k) => {
    // [x y 1] · [a b c]ᵀ = k, para los tres puntos (Cramer).
    const A = [[m[0], m[1], 1], [m[2], m[3], 1], [m[4], m[5], 1]]
    const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    const D = det(A)
    return [0, 1, 2].map(col => det(A.map((fila, r) => fila.map((v, c) => (c === col ? k[r] : v)))) / D)
  }
  const ax = resolver([f[0], f[2], f[4]]); const ay = resolver([f[1], f[3], f[5]])
  const aFoto = (x, y) => [ax[0] * x + ax[1] * y + ax[2], ay[0] * x + ay[1] * y + ay[2]]
  const [cx, cy, rx, ry] = arg('--ovalo', [(f[0] + f[2]) / 2, (f[1] + f[3]) / 2 + 0.55 * (f[5] - (f[1] + f[3]) / 2), 1.0 * (f[2] - f[0]), 1.6 * (f[5] - (f[1] + f[3]) / 2)])
  const tono = arg('--tono', [0.7])[0]
  // Qué se ve de frente: la profundidad de la vista frontal.
  const frente = vista(tex, 0, 1500, false)
  const seVe = (x, y, z) => {
    const px = Math.round((x - frente.x0) * frente.escala); const py = Math.round((frente.yTop - y) * frente.escala)
    if (px < 0 || py < 0 || px >= frente.W || py >= frente.H) return false
    return z >= frente.z[py * frente.W + px] - 0.006
  }
  const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  // Primero se recogen los píxeles a pintar con su peso y su color de foto.
  const pintar = []
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (U[i * 2] < 0.5 || P[i * 3 + 1] < yCabeza) continue
    triangulo(U[i * 2] * tex.w, U[i * 2 + 1] * tex.h, U[j * 2] * tex.w, U[j * 2 + 1] * tex.h, U[k * 2] * tex.w, U[k * 2 + 1] * tex.h, (x, y, a, b, c) => {
      if (x >= tex.w || y >= tex.h) return
      const X = P[i * 3] * a + P[j * 3] * b + P[k * 3] * c
      const Y = P[i * 3 + 1] * a + P[j * 3 + 1] * b + P[k * 3 + 1] * c
      const Z = P[i * 3 + 2] * a + P[j * 3 + 2] * b + P[k * 3 + 2] * c
      const nz = N[i * 3 + 2] * a + N[j * 3 + 2] * b + N[k * 3 + 2] * c
      if (!seVe(X, Y, Z)) return
      const [px, py] = aFoto(X, Y)
      const e = Math.hypot((px - cx) / rx, (py - cy) / ry)
      const w = (1 - suave(0.78, 1.0, e)) * suave(0.2, 0.55, nz)
      if (w <= 0.003) return
      pintar.push({ o: (y * tex.w + x) * 3, w, col: muestra(foto, px, py) })
    })
  }
  // El tono: en la franja del borde se compara la piel del modelo con la de la
  // foto y la foto entera se acerca a la del modelo en la parte `tono`.
  const sum = [[0, 0, 0], [0, 0, 0]]; let n = 0
  for (const p of pintar) {
    if (p.w < 0.15 || p.w > 0.6) continue
    for (let c = 0; c < 3; c++) { sum[0][c] += tex.d[p.o + c]; sum[1][c] += p.col[c] }
    n++
  }
  const razon = [0, 1, 2].map(c => n ? 1 + tono * (sum[0][c] / Math.max(1, sum[1][c]) - 1) : 1)
  const sale = Buffer.from(tex.d)
  for (const p of pintar) {
    for (let c = 0; c < 3; c++) {
      const v = Math.min(255, p.col[c] * razon[c])
      sale[p.o + c] = Math.round(tex.d[p.o + c] * (1 - p.w) + v * p.w)
    }
  }
  // Las costuras: la textura guarda unos píxeles de margen alrededor de cada isla
  // (para que al alejarse no se cuele el color de la de al lado), y esos no los
  // toca ningún triángulo. Sin rellenarlos se veían rayitas claras en la frente.
  // Se extiende lo pintado a los vecinos sin pintar, en la mitad de la cabeza.
  // Solo los del margen: lo que cubre algún triángulo (pelo, nuca) no se toca.
  const hecho = new Uint8Array(tex.w * tex.h)
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (U[i * 2] < 0.5) continue
    triangulo(U[i * 2] * tex.w, U[i * 2 + 1] * tex.h, U[j * 2] * tex.w, U[j * 2 + 1] * tex.h, U[k * 2] * tex.w, U[k * 2 + 1] * tex.h, (x, y) => { if (x < tex.w && y < tex.h) hecho[y * tex.w + x] = 3 })
  }
  for (const p of pintar) hecho[p.o / 3] = 1
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const nuevos = []
    for (let y = 1; y < tex.h - 1; y++) {
      for (let x = (tex.w >> 1) + 1; x < tex.w - 1; x++) {
        const i = y * tex.w + x
        if (hecho[i]) continue
        let n = 0; const c = [0, 0, 0]
        for (const j of [i - 1, i + 1, i - tex.w, i + tex.w]) {
          if (hecho[j] !== 1 && hecho[j] !== 2) continue
          for (let k = 0; k < 3; k++) c[k] += sale[j * 3 + k]
          n++
        }
        if (n) nuevos.push([i, c.map(v => v / n)])
      }
    }
    for (const [i, c] of nuevos) { hecho[i] = 2; for (let k = 0; k < 3; k++) sale[i * 3 + k] = Math.round(c[k]) }
  }
  await sharp(sale, { raw: { width: tex.w, height: tex.h, channels: 3 } }).png().toFile(actual)
  console.log(`${pintar.length} píxeles pintados; tono de la foto × ${razon.map(r => r.toFixed(2)).join(' / ')}`)
}

if (modo === 'pegar' || modo === 'fotos') {
  const tex = await leer(actual)
  const vistas = [0, 35, -35, 75].map(a => vista(tex, a, 1800))
  const fotos = await Promise.all(vistas.map(v => sharp(v.img, { raw: { width: v.W, height: v.H, channels: 3 } }).png().toBuffer()))
  const W = vistas[0].W
  await sharp({ create: { width: W * fotos.length, height: vistas[0].H, channels: 3, background: '#c8c8c8' } })
    .composite(fotos.map((input, i) => ({ input, left: i * W, top: 0 }))).png().toFile(path.join(VISTAS, `cara-${clave}.png`))
  console.log(path.join(VISTAS, `cara-${clave}.png`))
}
