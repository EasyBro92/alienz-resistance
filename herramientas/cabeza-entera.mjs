// Pegar al hueso de la cabeza TODA la cabeza de un cuerpo con esqueleto de Meshy.
//
// Isidro, 17/10/2026, con la ballestera de cara seria: «en la tienda parece que
// tenga bigote o algo negro en la cara». El esqueleto de Meshy no tiene cuello:
// el hueso `Head` arranca a la altura de la nuez y la barbilla, la boca y el
// mechón que cae junto a la cara quedaron repartidos entre la cabeza y los
// hombros (unos 330 vértices). Al apuntar, el juego le baja la cabeza; la parte
// de los hombros se queda donde estaba y la de abajo de la cara se arruga en
// una mancha oscura con el mechón por delante de la boca: el bigote.
//
// Aquí, lo que está por encima del arranque del hueso (y cerca de él, no los
// hombros) pasa a ser de la cabeza: del todo a partir de `--alto` (por defecto
// 3 cm sobre el hueso) y fundido hasta cero en el propio hueso, para que el
// cuello siga doblando. Solo cambian los pesos.
//
// Uso:  node herramientas/cabeza-entera.mjs <archivo.glb> [--alto 0.03] [--ancho 0.15] [--ver]
import fs from 'node:fs'
import * as THREE from 'three'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/cabeza-entera.mjs <archivo.glb> [--alto 0.03] [--ancho 0.15] [--ver]\n')
  process.exit(1)
}
const opcion = (nombre, defecto) => process.argv.includes(nombre) ? Number(process.argv[process.argv.indexOf(nombre) + 1]) : defecto
const ALTO = opcion('--alto', 0.03)
const ANCHO = opcion('--ancho', 0.15)
const soloVer = process.argv.includes('--ver')

const glb = fs.readFileSync(archivo)
const largoJson = glb.readUInt32LE(12)
const json = JSON.parse(glb.subarray(20, 20 + largoJson).toString('utf8'))
const iBin = 20 + largoJson + 8
const bin = glb.subarray(iBin, iBin + glb.readUInt32LE(20 + largoJson))

const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
function sitio (i) {
  const a = json.accessors[i]
  const v = json.bufferViews[a.bufferView]
  const tam = BYTES[a.componentType]
  const paso = v.byteStride || tam * COMPS[a.type]
  const base = (v.byteOffset || 0) + (a.byteOffset || 0)
  return { a, de: (k, c) => base + k * paso + c * tam }
}
const normal = t => t === 5121 ? 255 : 65535
function lector (i) {
  const { a, de } = sitio(i)
  const t = a.componentType
  return (k, c) => {
    const p = de(k, c)
    const x = t === 5126 ? bin.readFloatLE(p) : t === 5123 ? bin.readUInt16LE(p) : t === 5121 ? bin.readUInt8(p) : bin.readUInt32LE(p)
    return a.normalized ? x / normal(t) : x
  }
}
function escritor (i) {
  const { a, de } = sitio(i)
  const t = a.componentType
  return (k, c, x) => {
    const p = de(k, c)
    if (a.normalized) x = Math.round(x * normal(t))
    if (t === 5126) bin.writeFloatLE(x, p); else if (t === 5123) bin.writeUInt16LE(x, p); else if (t === 5121) bin.writeUInt8(x, p); else bin.writeUInt32LE(x, p)
  }
}

const piel = json.skins[0]
const nombres = piel.joints.map(n => json.nodes[n].name)
const jCabeza = nombres.indexOf('Head')
if (jCabeza < 0) { console.error('\nNo encuentro el hueso «Head».\n'); process.exit(1) }
const ibm = lector(piel.inverseBindMatrices)
const cabeza = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(Array.from({ length: 16 }, (_, c) => ibm(jCabeza, c))).invert())

let tocados = 0
for (const malla of json.meshes) {
  for (const prim of malla.primitives) {
    const at = prim.attributes
    if (at.JOINTS_0 == null) continue
    const n = json.accessors[at.POSITION].count
    const pos = lector(at.POSITION)
    const hue = lector(at.JOINTS_0); const pes = lector(at.WEIGHTS_0)
    const ponHue = escritor(at.JOINTS_0); const ponPes = escritor(at.WEIGHTS_0)
    for (let k = 0; k < n; k++) {
      const sube = pos(k, 1) - cabeza.y
      if (sube <= 0 || Math.hypot(pos(k, 0) - cabeza.x, pos(k, 2) - cabeza.z) > ANCHO) continue
      const quiere = Math.min(1, sube / ALTO)
      const w = [0, 1, 2, 3].map(c => pes(k, c)); const j = [0, 1, 2, 3].map(c => hue(k, c))
      let c0 = j.indexOf(jCabeza)
      const tiene = c0 < 0 ? 0 : w[c0]
      if (tiene >= quiere - 0.01) continue
      // Si la cabeza no estaba entre sus cuatro huesos, entra en el hueco del que menos pesa.
      if (c0 < 0) { c0 = w.indexOf(Math.min(...w)); j[c0] = jCabeza; w[c0] = 0 }
      const resto = w.reduce((s, x, c) => c === c0 ? s : s + x, 0)
      for (let c = 0; c < 4; c++) w[c] = c === c0 ? quiere : resto > 0 ? w[c] * (1 - quiere) / resto : 0
      tocados++
      if (soloVer) continue
      for (let c = 0; c < 4; c++) { ponHue(k, c, j[c]); ponPes(k, c, w[c]) }
    }
  }
}
console.log(`cabeza en y = ${cabeza.y.toFixed(3)}: ${tocados} vértices ${soloVer ? 'por pegar' : 'pegados a la cabeza'}`)

if (!soloVer) {
  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  texto = Buffer.concat([texto, Buffer.alloc((4 - (texto.length % 4)) % 4, 0x20)])
  const cab = Buffer.alloc(12)
  cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + texto.length + 8 + bin.length, 8)
  const cJson = Buffer.alloc(8); cJson.writeUInt32LE(texto.length, 0); cJson.writeUInt32LE(0x4e4f534a, 4)
  const cBin = Buffer.alloc(8); cBin.writeUInt32LE(bin.length, 0); cBin.writeUInt32LE(0x004e4942, 4)
  fs.writeFileSync(archivo, Buffer.concat([cab, cJson, texto, cBin, bin]))
}
