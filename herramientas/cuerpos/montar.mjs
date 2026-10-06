// Monta el cuerpo de un personaje de la caja alienígena sobre el esqueleto de
// un soldado de Meshy.
//
// Isidro, 06/10/2026, de las cinco de la caja alienígena: «se sienten igual que
// los otros… hazlas más sexys, como en las películas, que van con trajes y
// vestidos». Eran el cuerpo de un soldado con otra cabeza. Sin créditos de Meshy,
// el cuerpo nuevo se hace en Blender (`herramientas/blender/cuerpos.py`), pero NO
// se exporta desde allí: el exportador rehace los huesos a su manera y el juego
// escribe en ellos dando por hechos los ejes de Meshy. Aquí se coge el .glb de un
// soldado y se le cambia SOLO la malla y la textura: esqueleto, pesos de reposo y
// animación de andar quedan byte a byte como estaban.
//
//   node herramientas/cuerpos/montar.mjs --esqueleto      deja cuerpos-esqueleto.json
//   node herramientas/cuerpos/montar.mjs jill ada …       public/models/cuerpo-<clave>-f.glb
//
// El primero lo lee cuerpos.py para saber dónde está cada hueso; el segundo lee
// lo que cuerpos.py deja en `herramientas/blender/vistas/cuerpos/`.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..', '..')
const BASE = path.join(RAIZ, 'public', 'models', 'soldado-fusil-f.glb')
const BLENDER = path.join(RAIZ, 'herramientas', 'blender')
const TRABAJO = path.join(BLENDER, 'vistas', 'cuerpos')

const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

function abrir (archivo) {
  const glb = fs.readFileSync(archivo)
  const largoJson = glb.readUInt32LE(12)
  const json = JSON.parse(glb.slice(20, 20 + largoJson).toString('utf8'))
  const bin = glb.slice(20 + largoJson + 8, 20 + largoJson + 8 + glb.readUInt32LE(20 + largoJson))
  return { json, bin }
}

function leer ({ json, bin }, i) {
  const a = json.accessors[i]
  const v = json.bufferViews[a.bufferView]
  const tam = BYTES[a.componentType] * COMPS[a.type]
  const paso = v.byteStride || tam
  const base = (v.byteOffset || 0) + (a.byteOffset || 0)
  const out = Buffer.alloc(tam * a.count)
  for (let k = 0; k < a.count; k++) bin.copy(out, k * tam, base + k * paso, base + k * paso + tam)
  return out
}

// Inversa de una matriz 4 × 4 de las de glTF (por columnas), que aquí siempre es
// giro + escala uniforme + traslación: basta con lo de siempre.
function inversa (m) {
  const a = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]]
  const t = [m[12], m[13], m[14]]
  const det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  const c = (i, j) => {
    const f = [0, 1, 2].filter(x => x !== i); const k = [0, 1, 2].filter(x => x !== j)
    return ((i + j) % 2 ? -1 : 1) * (a[f[0]][k[0]] * a[f[1]][k[1]] - a[f[0]][k[1]] * a[f[1]][k[0]])
  }
  const inv = [0, 1, 2].map(i => [0, 1, 2].map(j => c(j, i) / det))
  const p = inv.map(f => -(f[0] * t[0] + f[1] * t[1] + f[2] * t[2]))
  return { giro: inv, pos: p }
}

function esqueleto () {
  const g = abrir(BASE)
  const piel = g.json.skins[0]
  const ibm = leer(g, piel.inverseBindMatrices)
  const padre = new Map()
  g.json.nodes.forEach((n, i) => (n.children ?? []).forEach(h => padre.set(h, i)))
  const huesos = {}
  piel.joints.forEach((nodo, k) => {
    const m = Array.from({ length: 16 }, (_, c) => ibm.readFloatLE(k * 64 + c * 4))
    // Dónde está el hueso con el esqueleto en reposo, en el espacio de la malla
    // (metros, Y arriba, la cara hacia +Z): la inversa de su matriz de enlace.
    const { pos } = inversa(m)
    huesos[g.json.nodes[nodo].name] = {
      pos: pos.map(v => +v.toFixed(5)),
      padre: g.json.nodes[padre.get(nodo)]?.name ?? null
    }
  })
  fs.writeFileSync(path.join(BLENDER, 'cuerpos-esqueleto.json'), JSON.stringify({ de: path.basename(BASE), huesos }, null, 1))
  for (const [n, h] of Object.entries(huesos)) console.log(n.padEnd(14), h.pos.map(v => v.toFixed(3).padStart(7)).join(' '), ' ←', h.padre)
}

async function montar (clave) {
  const g = abrir(BASE)
  const { json, bin } = g
  const datos = JSON.parse(fs.readFileSync(path.join(TRABAJO, clave + '.json'), 'utf8'))
  const n = datos.pos.length / 3
  const prim = json.meshes[0].primitives[0]
  const nombres = json.skins[0].joints.map(i => json.nodes[i].name)

  const nuevos = new Map()
  const flotantes = lista => { const b = Buffer.alloc(lista.length * 4); lista.forEach((v, k) => b.writeFloatLE(v, k * 4)); return b }
  nuevos.set(prim.attributes.POSITION, flotantes(datos.pos))
  nuevos.set(prim.attributes.NORMAL, flotantes(datos.normal))
  nuevos.set(prim.attributes.TEXCOORD_0, flotantes(datos.uv))
  // Los pesos llegan por NOMBRE de hueso: aquí se pasan al número que tiene cada
  // uno en este esqueleto, cuatro por vértice y sumando uno.
  // Los pesos van en un byte cada uno (de 0 a 255, sumando 255): cuatro veces
  // menos que en coma flotante, y a un hueso le da igual un 0,4 %.
  const huesos = Buffer.alloc(n * 4)
  const pesos = Buffer.alloc(n * 4)
  datos.pesos.forEach((lista, v) => {
    const cuatro = lista.map(([nombre, w]) => [nombres.indexOf(nombre), w]).sort((a, b) => b[1] - a[1]).slice(0, 4)
    if (cuatro.some(([i]) => i < 0)) throw new Error('hueso desconocido en ' + JSON.stringify(lista))
    const suma = cuatro.reduce((s, [, w]) => s + w, 0)
    const bytes = cuatro.map(([, w]) => Math.round(w / suma * 255))
    bytes[0] += 255 - bytes.reduce((s, b) => s + b, 0)
    cuatro.forEach(([i], k) => { huesos[v * 4 + k] = i; pesos[v * 4 + k] = bytes[k] })
  })
  nuevos.set(prim.attributes.JOINTS_0, huesos)
  nuevos.set(prim.attributes.WEIGHTS_0, pesos)
  Object.assign(json.accessors[prim.attributes.WEIGHTS_0], { componentType: 5121, normalized: true })
  const corto = n <= 65535
  const bi = Buffer.alloc(datos.indices.length * (corto ? 2 : 4))
  datos.indices.forEach((v, k) => (corto ? bi.writeUInt16LE(v, k * 2) : bi.writeUInt32LE(v, k * 4)))
  nuevos.set(prim.indices, bi)

  for (const acc of Object.values(prim.attributes)) json.accessors[acc].count = n
  const ai = json.accessors[prim.indices]
  ai.count = datos.indices.length
  ai.componentType = corto ? 5123 : 5125
  const ap = json.accessors[prim.attributes.POSITION]
  ap.min = [0, 1, 2].map(c => Math.min(...datos.pos.filter((_, k) => k % 3 === c)))
  ap.max = [0, 1, 2].map(c => Math.max(...datos.pos.filter((_, k) => k % 3 === c)))

  // La textura horneada, a WebP, y un material mate sin metal, como el de la
  // cabeza. El de Meshy no vale: no dice cuánto metal lleva, glTF entiende que
  // todo, y la piel salía oscura y anaranjada al lado de la cara.
  const imagen = await sharp(path.join(TRABAJO, clave + '.png')).webp({ quality: 86 }).toBuffer()
  json.materials = [{
    name: 'cuerpo-' + clave,
    doubleSided: true,      // faldas y chalecos se ven también por dentro
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.76 }
  }]
  json.textures = [{ sampler: json.textures[0].sampler, source: 0 }]
  delete json.extensionsUsed
  json.meshes[0].name = 'cuerpo-' + clave

  // --- volver a montar el binario (como simplificar.mjs) ---------------------------
  const usadas = new Set()
  json.accessors.forEach((a, i) => { if (!nuevos.has(i) && a.bufferView != null) usadas.add(a.bufferView) })
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
  json.images = [{ mimeType: 'image/webp', bufferView: vistas.length }]
  vistas.push({ buffer: 0, byteOffset: pon(imagen), byteLength: imagen.length })
  json.bufferViews = vistas
  const relleno = (4 - (largo % 4)) % 4
  if (relleno) { trozos.push(Buffer.alloc(relleno)); largo += relleno }
  json.buffers = [{ byteLength: largo }]

  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  if (texto.length % 4) texto = Buffer.concat([texto, Buffer.alloc(4 - (texto.length % 4), 0x20)])
  const cabecera = Buffer.alloc(12)
  cabecera.writeUInt32LE(0x46546C67, 0); cabecera.writeUInt32LE(2, 4); cabecera.writeUInt32LE(12 + 8 + texto.length + 8 + largo, 8)
  const cj = Buffer.alloc(8); cj.writeUInt32LE(texto.length, 0); cj.writeUInt32LE(0x4E4F534A, 4)
  const cb = Buffer.alloc(8); cb.writeUInt32LE(largo, 0); cb.writeUInt32LE(0x004E4942, 4)
  const salida = path.join(RAIZ, 'public', 'models', `cuerpo-${clave}-f.glb`)
  fs.writeFileSync(salida, Buffer.concat([cabecera, cj, texto, cb, ...trozos]))
  console.log(`MONTADO cuerpo-${clave}-f.glb ${fs.statSync(salida).size} bytes, ${n} vértices, ${datos.indices.length / 3} triángulos, textura ${imagen.length}`)
}

const args = process.argv.slice(2)
if (args.includes('--esqueleto')) esqueleto()
for (const clave of args.filter(a => !a.startsWith('--'))) await montar(clave)
