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
  // Lo que en la foto es FONDO (cielo, pared clara: luminoso y sin color) no se
  // pinta: donde la cabeza del modelo abulta más que la de la foto, el rayo cae
  // fuera de él y el pelo salía con trozos de cielo.
  const fondo = c => { const l = (c[0] + c[1] + c[2]) / 3; const sat = Math.max(...c) - Math.min(...c); return suave(115, 155, l) * (1 - suave(25, 50, sat)) }
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
      let col = muestra(foto, px, py)
      let wf = w * (1 - fondo(col))
      // En lo alto, donde el pelo del modelo (hinchado) abulta más que el de la foto,
      // el fondo se cambia por pelo: oscuro y con su grano, no la piel de la frente estirada.
      if (Y > 1.62 && fondo(col) > 0.3) { const g = 18 + Math.random() * 22; col = [g + 4, g + 2, g]; wf = w }
      if (wf > 0.003) pintar.push({ o: (y * tex.w + x) * 3, w: wf, col })
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

// --- una foto de LADO encima de lo que ya hay (15/10) -----------------------------
//   node … lado <clave> <foto> --puntos "x,y,z>px,py; …"
// Con cinco o más puntos (en metros del modelo y en píxeles de la foto) se ajusta
// una cámara afín —girar, inclinar, escalar y mover—, que para una cara a dos
// metros es casi lo mismo que la de verdad. Pinta lo que esa foto ve de cara,
// respetando lo que ya pintó la de frente (cuanto más de frente mira un punto,
// menos lo toca), y lo pinta también en el OTRO lado, reflejado: sus fotos solo
// enseñan un perfil y una cara es casi simétrica.
if (modo === 'lado') {
  const tex = await leer(actual)
  const foto = await leer(fotoRuta)
  const pares = process.argv[process.argv.indexOf('--puntos') + 1].split(';').map(p => p.split('>').map(t => t.split(',').map(Number)))
  // Mínimos cuadrados: [px, py] = A · [x, y, z, 1]
  const ajustar = col => {
    const M = Array.from({ length: 4 }, () => new Float64Array(5))
    for (const [[x, y, z], q] of pares) {
      const r = [x, y, z, 1]
      for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) M[i][j] += r[i] * r[j]; M[i][4] += r[i] * q[col] }
    }
    for (let c = 0; c < 4; c++) {
      let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
      ;[M[c], M[p]] = [M[p], M[c]]
      for (let r = 0; r < 4; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j < 5; j++) M[r][j] -= k * M[c][j] }
    }
    return M.map((fila, i) => fila[4] / fila[i])
  }
  const ax = ajustar(0); const ay = ajustar(1)
  const aFoto = (x, y, z) => [ax[0] * x + ax[1] * y + ax[2] * z + ax[3], ay[0] * x + ay[1] * y + ay[2] * z + ay[3]]
  let err = 0
  for (const [[x, y, z], q] of pares) { const [px, py] = aFoto(x, y, z); err = Math.max(err, Math.hypot(px - q[0], py - q[1])) }
  // Hacia dónde mira la cámara: lo que la afinidad no ve (el producto de sus filas),
  // con el signo que apunta a la cara.
  let d = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]]
  const ld = Math.hypot(...d); d = d.map(v => v / ld)
  if (d[2] < 0) d = d.map(v => -v)
  console.log('error máximo de los puntos', err.toFixed(1), 'px; la cámara mira desde', d.map(v => v.toFixed(2)).join(', '))
  // Profundidad vista desde esa cámara: se rasteriza la cabeza en coordenadas de la foto.
  const prof = new Float32Array(foto.w * foto.h).fill(-Infinity)
  const enFoto = i => { const [px, py] = aFoto(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); return [px, py, P[i * 3] * d[0] + P[i * 3 + 1] * d[1] + P[i * 3 + 2] * d[2]] }
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (P[i * 3 + 1] < yCabeza - 0.08) continue
    const A = enFoto(i); const B = enFoto(j); const C = enFoto(k)
    triangulo(A[0], A[1], B[0], B[1], C[0], C[1], (x, y, a, b, c) => {
      if (x >= foto.w || y >= foto.h) return
      const z = A[2] * a + B[2] * b + C[2] * c
      if (z > prof[y * foto.w + x]) prof[y * foto.w + x] = z
    })
  }
  const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  // Lo que en la foto es FONDO (cielo, pared clara: luminoso y sin color) no se
  // pinta: donde la cabeza del modelo abulta más que la de la foto, el rayo cae
  // fuera de él y el pelo salía con trozos de cielo.
  const fondo = c => { const l = (c[0] + c[1] + c[2]) / 3; const sat = Math.max(...c) - Math.min(...c); return suave(115, 155, l) * (1 - suave(25, 50, sat)) }
  const ves = (x, y, z) => {
    const [px, py] = aFoto(x, y, z)
    const ix = Math.round(px); const iy = Math.round(py)
    if (ix < 1 || iy < 1 || ix >= foto.w - 1 || iy >= foto.h - 1) return null
    const dd = x * d[0] + y * d[1] + z * d[2]
    return dd >= prof[iy * foto.w + ix] - 0.006 ? [px, py] : null
  }
  const pintar = []
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (U[i * 2] < 0.5 || P[i * 3 + 1] < yCabeza) continue
    triangulo(U[i * 2] * tex.w, U[i * 2 + 1] * tex.h, U[j * 2] * tex.w, U[j * 2 + 1] * tex.h, U[k * 2] * tex.w, U[k * 2 + 1] * tex.h, (x, y, a, b, c) => {
      if (x >= tex.w || y >= tex.h) return
      let X = P[i * 3] * a + P[j * 3] * b + P[k * 3] * c
      const Y = P[i * 3 + 1] * a + P[j * 3 + 1] * b + P[k * 3 + 1] * c
      const Z = P[i * 3 + 2] * a + P[j * 3 + 2] * b + P[k * 3 + 2] * c
      let nx = N[i * 3] * a + N[j * 3] * b + N[k * 3] * c
      const ny = N[i * 3 + 1] * a + N[j * 3 + 1] * b + N[k * 3 + 1] * c
      const nz = N[i * 3 + 2] * a + N[j * 3 + 2] * b + N[k * 3 + 2] * c
      const ln = Math.hypot(nx, ny, nz) || 1
      // El lado que la foto no ve se pinta con su reflejo.
      // --frente: una foto casi de frente que pinta toda la cara, sin reflejar nada.
      const deFrente = process.argv.includes('--frente')
      const espejo = !deFrente && (X * d[0] < 0)
      if (espejo) { X = -X; nx = -nx }
      if (Y < 1.43) return
      // La frente y las cejas, solo de la foto de frente: en las de lado la cara está
      // girada y levantada, y sus cejas caían en mitad de la frente.
      const frente = suave(1.575, 1.6, Y) * (1 - suave(0.045, 0.085, Math.abs(X)))
      const de = ves(X, Y, Z)
      if (!de) return
      const mira = (nx * d[0] + ny * d[1] + nz * d[2]) / ln
      // Lo que mira de frente ya lo pintó la foto de frente.
      const w = deFrente ? suave(0.15, 0.5, mira) : suave(0.25, 0.6, mira) * (1 - suave(0.55, 0.85, nz / ln)) * (espejo ? 0.85 : 1) * (1 - frente)
      if (w <= 0.01) return
      let col = muestra(foto, de[0], de[1])
      let wf = w * (1 - fondo(col))
      if (Y > 1.62 && fondo(col) > 0.3) { const g = 18 + Math.random() * 22; col = [g + 4, g + 2, g]; wf = w }
      if (wf > 0.01) pintar.push({ o: (y * tex.w + x) * 3, w: wf, col })
    })
  }
  // El tono, igualado al de lo que ya hay donde se solapan.
  const sum = [[0, 0, 0], [0, 0, 0]]; let n = 0
  const piel = c => { const l = (c[0] + c[1] + c[2]) / 3; return l > 45 && l < 150 && c[0] > c[2] + 12 }
  for (const p of pintar) { if (p.w > 0.2 && piel(p.col) && piel([tex.d[p.o], tex.d[p.o + 1], tex.d[p.o + 2]])) { for (let c = 0; c < 3; c++) { sum[0][c] += tex.d[p.o + c]; sum[1][c] += p.col[c] } n++ } }
  const razon = [0, 1, 2].map(c => (n && !process.argv.includes('--frente') ? sum[0][c] / Math.max(1, sum[1][c]) : 1))
  const sale = Buffer.from(tex.d)
  for (const p of pintar) for (let c = 0; c < 3; c++) sale[p.o + c] = Math.round(tex.d[p.o + c] * (1 - p.w) + Math.min(255, p.col[c] * razon[c]) * p.w)
  await sharp(sale, { raw: { width: tex.w, height: tex.h, channels: 3 } }).png().toFile(actual)
  console.log(pintar.length + ' píxeles de lado; tono × ' + razon.map(r => r.toFixed(2)).join(' / '))
}

// --- ojos de persona (15/10, la ballestera) ---------------------------------------
//   node … ojos <clave> --ojos "cx,cy;cx,cy" [--iris 0.0062] [--color 70,105,55] [--delante 0.02] [--apagar]
// Hunyuan le pintó los ojos de un verde chillón de lado a lado, sin blanco
// (Isidro: «los ojos son poco realistas, no tiene la parte blanca, solo se ve
// verde»). La abertura del ojo es justo esa mancha verde: dentro se pinta el
// blanco (que oscurece hacia las comisuras y bajo el párpado de arriba), un iris
// redondo de su verde pero apagado, con el aro oscuro del borde, la pupila y un
// brillo pequeño. Centro de cada ojo en metros de la vista de frente (`ver`).
if (modo === 'ojos') {
  const tex = await leer(actual)
  const centros = process.argv[process.argv.indexOf('--ojos') + 1].split(';').map(t => t.split(',').map(Number))
  const R = arg('--iris', [0.0062])[0]
  const base = arg('--color', [70, 105, 55])
  // Lo que quede por detrás de esta profundidad no es la cara (la nuca, el pelo).
  // Cada modelo trae la cara a una: la de la ballestera nueva, a 0, no a 2 cm.
  const delante = arg('--delante', [0.02])[0]
  const apagar = process.argv.includes('--apagar')
  // Desde cuánto verde es «ojo». En la ballestera nueva el borde del ojo es un
  // verde pálido que con 4-22 se quedaba a medias, a manchas: ahí va -6,8.
  const verde = arg('--verde', [4, 22])
  const sale = Buffer.from(tex.d)
  const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  let n = 0
  const tocados = new Set()
  const suma = centros.map(() => [0, 0, 0])
  for (let t = 0; t < I.length; t += 3) {
    const [i, j, k] = [I[t], I[t + 1], I[t + 2]]
    if (U[i * 2] < 0.5) continue
    triangulo(U[i * 2] * tex.w, U[i * 2 + 1] * tex.h, U[j * 2] * tex.w, U[j * 2 + 1] * tex.h, U[k * 2] * tex.w, U[k * 2 + 1] * tex.h, (x, y, a, b, c) => {
      if (x >= tex.w || y >= tex.h) return
      const X = P[i * 3] * a + P[j * 3] * b + P[k * 3] * c
      const Y = P[i * 3 + 1] * a + P[j * 3 + 1] * b + P[k * 3 + 1] * c
      const Z = P[i * 3 + 2] * a + P[j * 3 + 2] * b + P[k * 3 + 2] * c
      const ojo = centros.find(([cx, cy]) => Math.hypot(X - cx, Y - cy) < 0.03)
      if (!ojo || Z < delante) return
      const o = (y * tex.w + x) * 3
      const [r, g, bl] = [tex.d[o], tex.d[o + 1], tex.d[o + 2]]
      // Cuánto es «ojo»: lo verde, con el borde fundido.
      const w = suave(verde[0], verde[1], g - Math.max(r, bl))
      if (w <= 0) return
      // Dónde cae de verdad lo verde de cada ojo, para afinar los centros.
      const s = suma[centros.indexOf(ojo)]; s[0] += X * w; s[1] += Y * w; s[2] += w
      const o3 = (y * tex.w + x) * 3
      if (apagar) {
        // La ballestera del 17/10 ya trae el blanco y la pupila: solo el iris
        // brilla como un neón. Se le deja su dibujo y se lleva a un verde apagado
        // con la misma luz que tenía, algo más oscura.
        const luz = (r + g + bl) / 3 / 255
        const col = base.map(v => v * luz * 1.5)
        for (let ch = 0; ch < 3; ch++) sale[o3 + ch] = Math.round(tex.d[o3 + ch] * (1 - w) + col[ch] * w)
        tocados.add(o3 / 3)
        n++
        return
      }
      const dx = (X - ojo[0]) / R; const dy = (Y - ojo[1]) / R
      const d = Math.hypot(dx, dy)
      let col
      if (d < 1) {
        // iris: rayado radial, más oscuro en el aro y hacia el centro, y la pupila
        const ang = Math.atan2(dy, dx)
        const fibra = 0.85 + 0.15 * Math.sin(ang * 23 + Math.sin(ang * 7) * 2)
        const aro = 1 - 0.55 * suave(0.78, 1, d)
        col = base.map(v => v * fibra * aro * (0.75 + 0.35 * d))
        const pupila = 1 - suave(0.36, 0.44, d)
        col = col.map(v => v * (1 - pupila) + 10 * pupila)
        // el brillo, arriba a un lado
        const br = 1 - suave(0.12, 0.2, Math.hypot(dx + 0.35, dy - 0.35))
        col = col.map(v => v * (1 - br) + 235 * br)
      } else {
        // el blanco, que no es blanco: algo cálido y en sombra hacia los lados
        const lado = suave(1.2, 2.6, Math.abs(dx))
        col = [228, 220, 212].map(v => v * (1 - 0.3 * lado))
      }
      // la sombra del párpado de arriba
      col = col.map(v => v * (1 - 0.35 * suave(0.2, 1.1, dy)))
      for (let ch = 0; ch < 3; ch++) sale[o + ch] = Math.round(tex.d[o + ch] * (1 - w) + col[ch] * w)
      tocados.add(o / 3)
      n++
    })
  }
  // Lo verde que queda en el margen de las islas (sin triángulo encima): a su gris.
  for (let o = 0; o < sale.length; o += 3) {
    const [r, g, b] = [sale[o], sale[o + 1], sale[o + 2]]
    const i0 = o / 3
    let cerca = false
    for (let dy = -6; dy <= 6 && !cerca; dy++) for (let dx = -6; dx <= 6; dx++) if (tocados.has(i0 + dy * tex.w + dx)) { cerca = true; break }
    if (cerca && g > r + 25 && g > b + 25) { const v = (r + b) / 2; sale[o + 1] = Math.round(v + (g - v) * 0.25) }
  }
  await sharp(sale, { raw: { width: tex.w, height: tex.h, channels: 3 } }).png().toFile(actual)
  console.log(n + ' píxeles de ojo repintados; centro de lo verde: ' + suma.map(([x, y, w]) => (x / w).toFixed(4) + ',' + (y / w).toFixed(4)).join(';'))
}

if (modo === 'pegar' || modo === 'fotos' || modo === 'lado' || modo === 'ojos') {
  const tex = await leer(actual)
  const vistas = [0, 35, -35, 75].map(a => vista(tex, a, 1800))
  const fotos = await Promise.all(vistas.map(v => sharp(v.img, { raw: { width: v.W, height: v.H, channels: 3 } }).png().toBuffer()))
  const W = vistas[0].W
  await sharp({ create: { width: W * fotos.length, height: vistas[0].H, channels: 3, background: '#c8c8c8' } })
    .composite(fotos.map((input, i) => ({ input, left: i * W, top: 0 }))).png().toFile(path.join(VISTAS, `cara-${clave}.png`))
  console.log(path.join(VISTAS, `cara-${clave}.png`))
}
