// Quitarle a un cuerpo de Meshy la capucha que trae, para que lleve la de su cabeza de Blender.
//
// El juego ya le quita a cada cuerpo la cabeza vieja al cargarlo (`quitarCabeza`
// en assets.js: lo que manda el hueso de la cabeza y lo que sube pegado al eje
// del cuello). Con el Arquero del 10/10 no basta: su capucha es honda, cuelga
// veinte centímetros por detrás de la nuca, y a esa tela el montador de
// esqueletos la colgó de los HOMBROS. Se quedaba puesta, y al levantar el brazo
// para tensar el arco asomaba como un segundo pico detrás de la capucha nueva.
//
// No se puede quitar por sitio: a esa misma altura y a un palmo están las bocas
// de los dos carcajes, con sus flechas, que sí se quedan. Se quita por COLOR: de
// lo que queda por encima del arranque del cuello, cerca de su eje, se van los
// triángulos de tela verde (la capucha) y se quedan el cuero y las plumas.
//
// Uso:  node herramientas/quitar-capucha.mjs <archivo.glb> [--sobre 0.09] [--radio 0.38] [--tono 45,135] [--ver]
//       (escribe encima; `--ver` solo cuenta)

import fs from 'node:fs'
import sharp from 'sharp'
import * as THREE from 'three'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/quitar-capucha.mjs <archivo.glb> [--sobre 0.09] [--radio 0.38] [--tono 45,135] [--ver]\n')
  process.exit(1)
}
const opcion = (nombre, defecto) => process.argv.includes(nombre) ? process.argv[process.argv.indexOf(nombre) + 1] : defecto
const SOBRE = Number(opcion('--sobre', 0.09))          // cuánto por encima del arranque del cuello empieza a quitarse
const RADIO = Number(opcion('--radio', 0.38))          // y hasta qué distancia de su eje
const [TONO0, TONO1] = String(opcion('--tono', '45,135')).split(',').map(Number)   // el verde, en grados de la rueda de color

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
  return { a, tam, de: (k, c) => base + k * paso + c * tam }
}
function numero (i) {
  const { a, de } = sitio(i)
  const t = a.componentType
  return (k, c = 0) => {
    const p = de(k, c)
    const x = t === 5126 ? bin.readFloatLE(p) : t === 5123 ? bin.readUInt16LE(p) : t === 5121 ? bin.readUInt8(p) : bin.readUInt32LE(p)
    return a.normalized ? x / (t === 5121 ? 255 : 65535) : x
  }
}

const piel = json.skins[0]
const nombres = piel.joints.map(n => json.nodes[n].name)
const ibm = numero(piel.inverseBindMatrices)
const j = nombres.indexOf('neck')
const cuello = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(Array.from({ length: 16 }, (_, c) => ibm(j, c))).invert())

let quitados = 0
for (const malla of json.meshes) {
  for (const prim of malla.primitives) {
    const at = prim.attributes
    if (at.JOINTS_0 == null || at.TEXCOORD_0 == null || prim.indices == null) continue
    // La textura de color, a píxeles.
    const tex = json.textures[json.materials[prim.material].pbrMetallicRoughness.baseColorTexture.index]
    const vista = json.bufferViews[json.images[tex.extensions?.EXT_texture_webp?.source ?? tex.source].bufferView]
    const { data, info } = await sharp(bin.subarray(vista.byteOffset ?? 0, (vista.byteOffset ?? 0) + vista.byteLength)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const pos = numero(at.POSITION); const uv = numero(at.TEXCOORD_0)
    const n = json.accessors[at.POSITION].count
    const esCapucha = new Uint8Array(n)
    const color = new THREE.Color(); const hsl = {}
    for (let k = 0; k < n; k++) {
      const x = pos(k, 0) - cuello.x; const y = pos(k, 1) - cuello.y; const z = pos(k, 2) - cuello.z
      if (y < SOBRE || Math.hypot(x, z) > RADIO) continue
      const px = Math.min(info.width - 1, Math.max(0, Math.floor((uv(k, 0) % 1 + 1) % 1 * info.width)))
      const py = Math.min(info.height - 1, Math.max(0, Math.floor((uv(k, 1) % 1 + 1) % 1 * info.height)))
      const o = (py * info.width + px) * 3
      color.setRGB(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255).getHSL(hsl)
      const tono = hsl.h * 360
      // Verde, o tan oscuro o tan gris que no se sabe (la sombra de un pliegue): también se va.
      if ((tono >= TONO0 && tono <= TONO1 && hsl.s >= 0.12) || hsl.l < 0.06) esCapucha[k] = 1
    }
    const ind = numero(prim.indices)
    const { a: ai, tam, de } = sitio(prim.indices)
    const quedan = []
    for (let t = 0; t < ai.count; t += 3) {
      const a = ind(t); const b = ind(t + 1); const c = ind(t + 2)
      // Con dos vértices de capucha basta. (Con uno se llevaba por delante las
      // plumas de las flechas, que tocan la tela.)
      if (esCapucha[a] + esCapucha[b] + esCapucha[c] >= 2) { quitados++; continue }
      quedan.push(a, b, c)
    }
    // Y las astillas: los trozos sueltos que quedan flotando en la zona, de pocos
    // triángulos y con algo de tela. Sueltos de verdad: se sueldan antes los
    // vértices que la textura parte en dos.
    const soldado = new Map(); const uno = new Int32Array(n)
    for (let k = 0; k < n; k++) {
      const clave = `${pos(k, 0).toFixed(4)},${pos(k, 1).toFixed(4)},${pos(k, 2).toFixed(4)}`
      if (!soldado.has(clave)) soldado.set(clave, k)
      uno[k] = soldado.get(clave)
    }
    const raiz = new Int32Array(n).map((_, k) => k)
    const busca = k => { while (raiz[k] !== k) { raiz[k] = raiz[raiz[k]]; k = raiz[k] } return k }
    for (let t = 0; t < quedan.length; t += 3) {
      const r = busca(uno[quedan[t]])
      raiz[busca(uno[quedan[t + 1]])] = r; raiz[busca(uno[quedan[t + 2]])] = r
    }
    const trozos = new Map()
    for (let t = 0; t < quedan.length; t += 3) {
      const r = busca(uno[quedan[t]])
      const z = trozos.get(r) ?? { tri: 0, tela: 0, fuera: 0 }
      z.tri++
      for (let c = 0; c < 3; c++) {
        const k = quedan[t + c]
        z.tela += esCapucha[k]
        if (pos(k, 1) - cuello.y < SOBRE - 0.03 || Math.hypot(pos(k, 0) - cuello.x, pos(k, 2) - cuello.z) > RADIO) z.fuera++
      }
      trozos.set(r, z)
    }
    const limpio = []
    for (let t = 0; t < quedan.length; t += 3) {
      const z = trozos.get(busca(uno[quedan[t]]))
      if (z.tri < 80 && z.fuera === 0 && z.tela >= z.tri * 0.6) { quitados++; continue }
      limpio.push(quedan[t], quedan[t + 1], quedan[t + 2])
    }
    quedan.length = 0
    quedan.push(...limpio)
    if (!process.argv.includes('--ver')) {
      // Los que quedan, al principio de su sitio; el accesor ya no cuenta el resto.
      quedan.forEach((v, k) => (tam === 2 ? bin.writeUInt16LE(v, de(k, 0)) : bin.writeUInt32LE(v, de(k, 0))))
      ai.count = quedan.length
    }
  }
}
console.log(`${archivo}: ${quitados} triángulos de capucha${process.argv.includes('--ver') ? ' (sin tocar nada)' : ' quitados'}`)

if (!process.argv.includes('--ver')) {
  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  texto = Buffer.concat([texto, Buffer.alloc((4 - (texto.length % 4)) % 4, 0x20)])
  const cab = Buffer.alloc(12)
  cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + texto.length + 8 + bin.length, 8)
  const cJson = Buffer.alloc(8); cJson.writeUInt32LE(texto.length, 0); cJson.writeUInt32LE(0x4e4f534a, 4)
  const cBin = Buffer.alloc(8); cBin.writeUInt32LE(bin.length, 0); cBin.writeUInt32LE(0x004e4942, 4)
  fs.writeFileSync(archivo, Buffer.concat([cab, cJson, texto, cBin, bin]))
}
