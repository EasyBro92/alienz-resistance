// Quitarle triángulos a un .glb con esqueleto sin tocar nada más.
//
// Medido el 01/10/2026 con Isidro («con muchos alienz o la madre entrando se
// sobrecalienta el móvil»): cada soldado traía 17.000 triángulos de cuerpo y
// cada huésped 6.250, y todos se dibujan dos veces por fotograma (la imagen y
// la sombra). A la distancia de la cámara del juego una figura ocupa unos 60
// píxeles de alto: con 5.000 y 3.000 se ve lo mismo.
//
// Usa meshoptimizer, que SOLO elige qué triángulos se quedan: los vértices que
// sobreviven conservan su sitio, su UV, sus huesos y sus pesos tal cual, así que
// ni el esqueleto ni la animación ni la textura cambian. Luego se tiran los
// vértices que ya no usa nadie y se vuelve a montar el archivo.
//
// Uso:  node herramientas/simplificar.mjs <archivo.glb> <triángulos> [--error 0.03]
//       (escribe encima; el original queda en git)

import fs from 'node:fs'
import { MeshoptSimplifier } from 'meshoptimizer'

const [archivo, objetivoTxt] = process.argv.slice(2)
const objetivo = Number(objetivoTxt)
if (!archivo || !fs.existsSync(archivo) || !objetivo) {
  console.error('\nUso: node herramientas/simplificar.mjs <archivo.glb> <triángulos> [--error 0.03]\n')
  process.exit(1)
}
const errorMax = Number(process.argv.includes('--error') ? process.argv[process.argv.indexOf('--error') + 1] : 0.03)

// --- leer el contenedor ----------------------------------------------------------
const glb = fs.readFileSync(archivo)
const largoJson = glb.readUInt32LE(12)
const json = JSON.parse(glb.slice(20, 20 + largoJson).toString('utf8'))
const bin = glb.slice(20 + largoJson + 8, 20 + largoJson + 8 + glb.readUInt32LE(20 + largoJson))

const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

// Los bytes de cada elemento de un accesor, uno detrás de otro (deshace el
// entrelazado si lo hay).
function leer (i) {
  const a = json.accessors[i]
  const v = json.bufferViews[a.bufferView]
  const tam = BYTES[a.componentType] * COMPS[a.type]
  const paso = v.byteStride || tam
  const base = (v.byteOffset || 0) + (a.byteOffset || 0)
  const out = Buffer.alloc(tam * a.count)
  for (let k = 0; k < a.count; k++) bin.copy(out, k * tam, base + k * paso, base + k * paso + tam)
  return { datos: out, tam }
}

// Los trozos nuevos del binario: se van apilando y al final se monta todo.
const nuevos = new Map()      // índice de accesor → Buffer con sus datos nuevos
await MeshoptSimplifier.ready

let antes = 0
let despues = 0
for (const malla of json.meshes) {
  for (const prim of malla.primitives) {
    if (prim.indices == null || prim.mode != null && prim.mode !== 4) continue
    const ai = json.accessors[prim.indices]
    const crudo = leer(prim.indices).datos
    const indices = new Uint32Array(ai.count)
    for (let k = 0; k < ai.count; k++) {
      indices[k] = ai.componentType === 5125 ? crudo.readUInt32LE(k * 4) : ai.componentType === 5123 ? crudo.readUInt16LE(k * 2) : crudo[k]
    }
    const pos = leer(prim.attributes.POSITION).datos
    const posiciones = new Float32Array(pos.buffer, pos.byteOffset, pos.length / 4).slice()
    antes += ai.count / 3
    // Reparte el objetivo entre las primitivas según lo que pesa cada una.
    const total = json.meshes.reduce((s, m) => s + m.primitives.reduce((t, p) => t + (p.indices != null ? json.accessors[p.indices].count / 3 : 0), 0), 0)
    const meta = Math.max(12, Math.floor(objetivo * (ai.count / 3) / total) * 3)
    if (meta >= ai.count) { despues += ai.count / 3; continue }
    const [menos] = MeshoptSimplifier.simplify(indices, posiciones, 3, meta, errorMax)
    despues += menos.length / 3

    // Los vértices que siguen en uso, en el orden en que aparecen.
    const viejoANuevo = new Int32Array(posiciones.length / 3).fill(-1)
    const orden = []
    const reindexado = new Uint32Array(menos.length)
    for (let k = 0; k < menos.length; k++) {
      const v = menos[k]
      if (viejoANuevo[v] < 0) { viejoANuevo[v] = orden.length; orden.push(v) }
      reindexado[k] = viejoANuevo[v]
    }
    // Cada atributo, solo con los vértices que quedan.
    for (const acc of Object.values(prim.attributes)) {
      const { datos, tam } = leer(acc)
      const out = Buffer.alloc(tam * orden.length)
      orden.forEach((v, k) => datos.copy(out, k * tam, v * tam, v * tam + tam))
      nuevos.set(acc, out)
      json.accessors[acc].count = orden.length
    }
    // Los índices, en 16 bits si caben.
    const corto = orden.length <= 65535
    const bi = Buffer.alloc(reindexado.length * (corto ? 2 : 4))
    reindexado.forEach((v, k) => (corto ? bi.writeUInt16LE(v, k * 2) : bi.writeUInt32LE(v, k * 4)))
    nuevos.set(prim.indices, bi)
    ai.count = reindexado.length
    ai.componentType = corto ? 5123 : 5125
    // La caja de las posiciones, que es obligatoria.
    const ap = json.accessors[prim.attributes.POSITION]
    const p = nuevos.get(prim.attributes.POSITION)
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let k = 0; k < orden.length; k++) {
      for (let c = 0; c < 3; c++) {
        const x = p.readFloatLE(k * 12 + c * 4)
        if (x < min[c]) min[c] = x
        if (x > max[c]) max[c] = x
      }
    }
    ap.min = min; ap.max = max
  }
}

// --- volver a montar el binario ---------------------------------------------------
// Cada vista vieja que no se haya sustituido se copia tal cual; cada accesor
// nuevo estrena vista propia. Las vistas que se quedan sin dueño desaparecen.
const usadas = new Set()
json.accessors.forEach((a, i) => { if (!nuevos.has(i) && a.bufferView != null) usadas.add(a.bufferView) })
for (const im of json.images ?? []) if (im.bufferView != null) usadas.add(im.bufferView)
const trozos = []
let largo = 0
const pon = b => {
  const relleno = (4 - (largo % 4)) % 4
  if (relleno) { trozos.push(Buffer.alloc(relleno)); largo += relleno }
  const en = largo
  trozos.push(b); largo += b.length
  return en
}
const vistas = []
const mapa = new Map()
json.bufferViews.forEach((v, i) => {
  if (!usadas.has(i)) return
  const en = pon(bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength))
  mapa.set(i, vistas.length)
  vistas.push({ ...v, buffer: 0, byteOffset: en })
})
json.accessors.forEach((a, i) => {
  if (nuevos.has(i)) {
    const b = nuevos.get(i)
    a.bufferView = vistas.length
    a.byteOffset = 0
    vistas.push({ buffer: 0, byteOffset: pon(b), byteLength: b.length })
  } else if (a.bufferView != null) a.bufferView = mapa.get(a.bufferView)
})
for (const im of json.images ?? []) if (im.bufferView != null) im.bufferView = mapa.get(im.bufferView)
json.bufferViews = vistas
const binNuevo = Buffer.concat([...trozos, Buffer.alloc((4 - (largo % 4)) % 4)])
json.buffers = [{ byteLength: binNuevo.length }]

let txt = Buffer.from(JSON.stringify(json), 'utf8')
txt = Buffer.concat([txt, Buffer.alloc((4 - (txt.length % 4)) % 4, 0x20)])
const cab = Buffer.alloc(12)
cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + txt.length + 8 + binNuevo.length, 8)
const cj = Buffer.alloc(8); cj.writeUInt32LE(txt.length, 0); cj.writeUInt32LE(0x4e4f534a, 4)
const cb = Buffer.alloc(8); cb.writeUInt32LE(binNuevo.length, 0); cb.writeUInt32LE(0x004e4942, 4)
fs.writeFileSync(archivo, Buffer.concat([cab, cj, txt, cb, binNuevo]))
console.log(`${archivo}: ${antes} → ${despues} triángulos, ${(glb.length / 1024).toFixed(0)} → ${((12 + 16 + txt.length + binNuevo.length) / 1024).toFixed(0)} KB`)
