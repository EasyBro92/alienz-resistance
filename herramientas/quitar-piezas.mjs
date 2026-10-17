// Quitarle a un cuerpo de Meshy una pieza suelta que no debía traer.
//
// Isidro, 17/10/2026: la Tiradora rehecha con la cara despejada salió con un
// fusil pegado al pecho (el texto decía «sniper», y Meshy le pone el arma
// aunque se le pidan las manos vacías). El juego ya le da el suyo. Rehacerla
// costaba 35 créditos; el fusil es una pieza SUELTA de la malla (no comparte
// vértices con el cuerpo), así que se puede quitar.
//
// Junta los triángulos en piezas (soldando por posición, que el .glb parte los
// vértices por las costuras de la textura) y, sin `--caja`, las lista con su
// tamaño y su caja. Con `--caja x0,y0,z0,x1,y1,z1` quita las piezas cuyo
// centro cae dentro. Solo se quitan triángulos: lo demás queda igual.
//
// Uso:  node herramientas/quitar-piezas.mjs <archivo.glb> [--caja x0,y0,z0,x1,y1,z1] [--min 200]
import fs from 'node:fs'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/quitar-piezas.mjs <archivo.glb> [--caja x0,y0,z0,x1,y1,z1] [--min 200]\n')
  process.exit(1)
}
const arg = n => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null
const caja = arg('--caja')?.split(',').map(Number)
const MIN = Number(arg('--min') ?? 200)

const glb = fs.readFileSync(archivo)
const largoJson = glb.readUInt32LE(12)
const json = JSON.parse(glb.subarray(20, 20 + largoJson).toString('utf8'))
const iBin = 20 + largoJson + 8
const bin = glb.subarray(iBin, iBin + glb.readUInt32LE(20 + largoJson))

const BYTES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
function lector (i) {
  const a = json.accessors[i]
  const v = json.bufferViews[a.bufferView]
  const tam = BYTES[a.componentType]
  const paso = v.byteStride || tam * COMPS[a.type]
  const base = (v.byteOffset || 0) + (a.byteOffset || 0)
  const t = a.componentType
  return {
    a,
    leer: (k, c = 0) => { const p = base + k * paso + c * tam; return t === 5126 ? bin.readFloatLE(p) : t === 5123 ? bin.readUInt16LE(p) : t === 5121 ? bin.readUInt8(p) : bin.readUInt32LE(p) },
    poner: (k, x) => { const p = base + k * paso; if (t === 5123) bin.writeUInt16LE(x, p); else if (t === 5121) bin.writeUInt8(x, p); else bin.writeUInt32LE(x, p) }
  }
}

let quitados = 0
for (const malla of json.meshes) {
  for (const prim of malla.primitives) {
    if (prim.indices == null) continue
    const pos = lector(prim.attributes.POSITION)
    const ind = lector(prim.indices)
    const nV = pos.a.count; const nI = ind.a.count
    // Soldar por posición: mismo sitio, mismo vértice.
    const clave = new Map(); const raiz = new Int32Array(nV)
    for (let k = 0; k < nV; k++) {
      const c = [0, 1, 2].map(j => Math.round(pos.leer(k, j) * 1e4)).join(',')
      if (!clave.has(c)) clave.set(c, k)
      raiz[k] = clave.get(c)
    }
    const padre = Int32Array.from({ length: nV }, (_, i) => i)
    const busca = x => { while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x] } return x }
    const une = (a, b) => { a = busca(a); b = busca(b); if (a !== b) padre[a] = b }
    for (let t = 0; t < nI; t += 3) { une(raiz[ind.leer(t)], raiz[ind.leer(t + 1)]); une(raiz[ind.leer(t)], raiz[ind.leer(t + 2)]) }
    const piezas = new Map()
    for (let t = 0; t < nI; t += 3) {
      const r = busca(raiz[ind.leer(t)])
      let p = piezas.get(r)
      if (!p) piezas.set(r, p = { tris: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], suma: [0, 0, 0] })
      p.tris.push(t)
      for (let e = 0; e < 3; e++) {
        const k = ind.leer(t + e)
        for (let j = 0; j < 3; j++) { const x = pos.leer(k, j); p.min[j] = Math.min(p.min[j], x); p.max[j] = Math.max(p.max[j], x); p.suma[j] += x }
      }
    }
    const lista = [...piezas.values()].map(p => ({ ...p, centro: p.suma.map(s => s / (p.tris.length * 3)) })).sort((a, b) => b.tris.length - a.tris.length)
    const f = v => v.map(x => x.toFixed(2)).join(',')
    if (!caja) {
      for (const p of lista.filter(p => p.tris.length >= MIN)) console.log(`${p.tris.length} triángulos   centro ${f(p.centro)}   caja ${f(p.min)} → ${f(p.max)}`)
      console.log(`(${lista.length} piezas; se listan las de ${MIN} triángulos o más)`)
      continue
    }
    const dentro = c => c.every((x, j) => x >= caja[j] && x <= caja[j + 3])
    // Un triángulo quitado se queda con los tres índices iguales: no se dibuja y
    // no hay que rehacer el accesor.
    for (const p of lista.filter(p => dentro(p.centro))) {
      console.log(`quito ${p.tris.length} triángulos (centro ${f(p.centro)})`)
      for (const t of p.tris) { const k = ind.leer(t); ind.poner(t + 1, k); ind.poner(t + 2, k) }
      quitados += p.tris.length
    }
  }
}

if (caja) {
  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  texto = Buffer.concat([texto, Buffer.alloc((4 - (texto.length % 4)) % 4, 0x20)])
  const cab = Buffer.alloc(12)
  cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + texto.length + 8 + bin.length, 8)
  const cJson = Buffer.alloc(8); cJson.writeUInt32LE(texto.length, 0); cJson.writeUInt32LE(0x4e4f534a, 4)
  const cBin = Buffer.alloc(8); cBin.writeUInt32LE(bin.length, 0); cBin.writeUInt32LE(0x004e4942, 4)
  fs.writeFileSync(archivo, Buffer.concat([cab, cJson, texto, cBin, bin]))
  console.log(`${archivo}: ${quitados} triángulos quitados`)
}
