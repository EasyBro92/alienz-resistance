// PRUEBA del 14/10/2026 (cara de Isidro): deforma la cabeza de un cuerpo de
// `cuerpo_de_fuera.py` con una placa delgada para que sus rasgos, vistos de frente,
// caigan donde los de su foto. Los puntos están puestos a mano para ese modelo y
// esa foto (medidos con `cara-de-foto.mjs ver`); falta el perfil y el pelo.
//   node herramientas/cuerpos/deformar-cara.mjs <clave>   (desde la raíz del juego)
import fs from 'node:fs'
const dir = 'herramientas/blender/vistas/cuerpos/'
const clave = process.argv[2]
const orig = dir + clave + '-orig.json'
if (!fs.existsSync(orig)) fs.copyFileSync(dir + clave + '.json', orig)
const m = JSON.parse(fs.readFileSync(orig, 'utf8'))
const aM = ([px, py]) => [px / 2500 - 0.18, 1.738 - py / 2500]
const modelo = [[360,405],[545,403],[400,592],[500,592],[450,505],[405,515],[497,515],[450,720],[290,590],[612,590],[268,420],[628,420],[450,215],[290,300],[615,300],[450,55],[220,250],[665,250],[205,450],[668,450]].map(aM)
const foto = [[227,290],[368,297],[247,428],[338,428],[292,375],[255,370],[330,372],[292,522],[175,430],[410,430],[163,300],[425,305],[300,150],[175,215],[420,220],[300,45],[140,180],[458,185],[133,330],[452,335]]
// foto → modelo con la afinidad de los ojos y la boca (la misma que usa pegar)
const M3 = [modelo[0], modelo[1], [0, 1.5]]; const F3 = [foto[0], foto[1], foto[2].map((v, i) => i ? 428 : 292)]
F3[2] = [292, 428]
const det = A => A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1]) - A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0]) + A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0])
const res = (P, k) => { const A = P.map(p => [p[0], p[1], 1]); const D = det(A); return [0,1,2].map(c => det(A.map((f, r) => f.map((v, j) => j === c ? k[r] : v))) / D) }
// inversa: de foto a modelo
const bx = res(F3, M3.map(p => p[0])); const by = res(F3, M3.map(p => p[1]))
const destino = foto.map(([x, y]) => [bx[0]*x + bx[1]*y + bx[2], by[0]*x + by[1]*y + by[2]])
// placa delgada
const n = modelo.length
const U = r => r < 1e-9 ? 0 : r * r * Math.log(r)
const A = Array.from({ length: n + 3 }, () => new Float64Array(n + 3))
for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] = U(Math.hypot(modelo[i][0]-modelo[j][0], modelo[i][1]-modelo[j][1])); A[i][i] += 1e-6; A[i][n] = 1; A[i][n+1] = modelo[i][0]; A[i][n+2] = modelo[i][1]; A[n][i] = 1; A[n+1][i] = modelo[i][0]; A[n+2][i] = modelo[i][1] }
function resolver (b) {
  const M = A.map((f, i) => [...f, b[i]]); const N = n + 3
  for (let c = 0; c < N; c++) { let p = c; for (let r = c+1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < N; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= N; k++) M[r][k] -= f * M[c][k] } }
  return M.map((f, i) => f[N] / f[i])
}
const wx = resolver([...destino.map(d => d[0]), 0, 0, 0]); const wy = resolver([...destino.map(d => d[1]), 0, 0, 0])
const f = (w, x, y) => { let s = w[n] + w[n+1]*x + w[n+2]*y; for (let i = 0; i < n; i++) s += w[i] * U(Math.hypot(x-modelo[i][0], y-modelo[i][1])); return s }
// solo la cabeza: entero por encima de 1,47, nada por debajo de 1,40 (el cuello sigue pegado al cuerpo)
const P = m.pos
let movido = 0
for (let i = 0; i < P.length; i += 3) {
  const y = P[i+1]; const k = Math.max(0, Math.min(1, (y - 1.40) / 0.07))
  if (!k) continue
  const k2 = k * k * (3 - 2 * k)
  const nx = f(wx, P[i], y); const ny = f(wy, P[i], y)
  // en profundidad, la cabeza crece lo que crece de ancho (el pelo, sobre todo)
  P[i+2] = P[i+2]
  P[i] += (nx - P[i]) * k2; P[i+1] += (ny - y) * k2; movido++
}
fs.writeFileSync(dir + clave + '.json', JSON.stringify(m))
console.log('vértices movidos', movido, 'destinos', destino.map(d => d.map(v => v.toFixed(3)).join(',')).slice(0, 3).join(' '))
