// Arreglar un .glb para que el juego se lo trague.
//
// Compañera de `revisar-glb.mjs`: aquella dice qué está mal, esta lo corrige.
// Las tres cosas que el código da por hechas y que un modelo de fuera casi
// nunca trae bien:
//
//   1. Los nombres de hueso. Mixamo los saca como `mixamorig:Hips`, y el juego
//      busca `Hips` a secas: el bicho anda, pero no ataca ni lleva su trasto en
//      la mano, porque los adornos y el zarpazo no encuentran a quién agarrarse.
//   2. Hacia dónde mira. El juego le da media vuelta dando por hecho que viene
//      mirando a +Z; si viene del revés, camina de espaldas.
//   3. El ciclo tiene que andar EN EL SITIO. Quien lleva la posición en el
//      carril es `zombie.js`; si el clip además desplaza la cadera, la figura se
//      va sola y deja atrás su barra de vida y su sombra.
//
// Uso:  node herramientas/arreglar-glb.mjs entrada.glb [salida.glb]
//
// Sin salida, escribe `<entrada>-arreglado.glb`. No toca nunca el original.

import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'

const entrada = process.argv[2]
if (!entrada || !fs.existsSync(entrada)) {
  console.error('\nUso: node herramientas/arreglar-glb.mjs <entrada.glb> [salida.glb]\n')
  process.exit(1)
}
const salida = process.argv[3] ??
  path.join(path.dirname(entrada), path.basename(entrada, '.glb') + '-arreglado.glb')

// --- abrir -------------------------------------------------------------------
const bruto = fs.readFileSync(entrada)
if (bruto.readUInt32LE(0) !== 0x46546c67) {
  console.error('\nEsto no es un .glb.\n')
  process.exit(1)
}
const lenJSON = bruto.readUInt32LE(12)
const json = JSON.parse(bruto.slice(20, 20 + lenJSON).toString('utf8'))
const lenBIN = bruto.readUInt32LE(20 + lenJSON)
// Copia, no vista: hay que poder escribir encima.
const bin = Buffer.from(bruto.slice(20 + lenJSON + 8, 20 + lenJSON + 8 + lenBIN))

const hechos = []
const nodos = json.nodes ?? []

// --- 1. los nombres de hueso -------------------------------------------------
// Solo se tocan los NOMBRES. Las pieles y las animaciones apuntan a los nodos
// por índice, así que renombrar no rompe nada.
let renombrados = 0
for (const n of nodos) {
  if (!n.name) continue
  const limpio = n.name.replace(/^mixamorig[:_]?/i, '')
  if (limpio !== n.name) { n.name = limpio; renombrados++ }
}
if (renombrados) hechos.push(`Quitado el «mixamorig:» de ${renombrados} huesos.`)

const porNombre = new Map()
nodos.forEach((n, i) => { if (n.name && !porNombre.has(n.name)) porNombre.set(n.name, i) })

// --- dónde está cada hueso de verdad ------------------------------------------
// Con matrices completas, no sumando traslaciones: lo que pone a un modelo del
// revés es un GIRO, y sumando solo traslaciones no se ve. Aquí se tropezó la
// primera versión, que no detectaba el caso para el que se escribió.
const padreDe = new Map()
nodos.forEach((n, k) => { for (const h of n.children ?? []) padreDe.set(h, k) })
const matrizDe = n => {
  const m = new THREE.Matrix4()
  if (n.matrix) return m.fromArray(n.matrix)
  return m.compose(
    new THREE.Vector3().fromArray(n.translation ?? [0, 0, 0]),
    new THREE.Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(n.scale ?? [1, 1, 1])
  )
}
function matrizMundoDe (i) {
  const m = new THREE.Matrix4()
  if (i == null) return m
  const cadena = []
  let k = i
  while (k != null) { cadena.unshift(k); k = padreDe.get(k) }
  for (const c of cadena) m.multiply(matrizDe(nodos[c]))
  return m
}
function sitioDe (nombre) {
  const i = porNombre.get(nombre)
  if (i == null) return null
  return new THREE.Vector3().setFromMatrixPosition(matrizMundoDe(i))
}

// La altura, por huesos: con una malla de esqueleto la caja envolvente sale de
// la pose de reposo y no vale para nada.
const arriba = sitioDe('head_end') ?? sitioDe('Head')
const abajo = sitioDe('LeftToeBase') ?? sitioDe('LeftFoot')
const alto = arriba && abajo ? Math.abs(arriba.y - abajo.y) : 0

// --- 2. hacia dónde mira -----------------------------------------------------
// Con Y arriba y mirando a +Z, la izquierda del bicho cae en +X. Si cae en -X,
// viene del revés y hay que darle media vuelta en la raíz.
const izq = sitioDe('LeftArm') ?? sitioDe('LeftUpLeg') ?? sitioDe('LeftHand')
const der = sitioDe('RightArm') ?? sitioDe('RightUpLeg') ?? sitioDe('RightHand')
let giroAplicado = false
if (izq && der && Math.abs(izq.x - der.x) > 1e-4 && izq.x < der.x) {
  const escena = json.scenes?.[json.scene ?? 0] ?? json.scenes?.[0]
  nodos.push({ name: 'MediaVuelta', rotation: [0, 1, 0, 0], children: [...(escena.nodes ?? [])] })
  escena.nodes = [nodos.length - 1]
  giroAplicado = true
  hechos.push('Venía mirando a -Z: se le ha dado media vuelta.')
}

// --- 3. el ciclo, a andar en el sitio ----------------------------------------
const PIEZAS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
let aplanados = 0
for (const a of json.animations ?? []) {
  for (const c of a.channels) {
    if (c.target.path !== 'translation') continue
    const nombre = nodos[c.target.node]?.name ?? ''
    if (!/^(hips|root|armature)$/i.test(nombre)) continue
    const ac = json.accessors[a.samplers[c.sampler].output]
    if (ac?.bufferView == null || ac.componentType !== 5126 || PIEZAS[ac.type] !== 3) continue
    const bv = json.bufferViews[ac.bufferView]
    const paso = bv.byteStride || 12
    const base = (bv.byteOffset ?? 0) + (ac.byteOffset ?? 0)
    // La altura se respeta —la cadera sube y baja al andar, y eso es bueno—;
    // lo que se congela es el avance por el suelo.
    let sx = 0
    let sz = 0
    for (let i = 0; i < ac.count; i++) {
      sx += bin.readFloatLE(base + i * paso)
      sz += bin.readFloatLE(base + i * paso + 8)
    }
    const mx = sx / ac.count
    const mz = sz / ac.count
    // Al MUNDO para medir: la cadera se mueve en las unidades de su padre, y
    // compararlas con una altura en unidades de mundo daba un 306 % de zancada
    // en un modelo perfectamente sano. Lo que se escribe sigue siendo local.
    const delPadre = matrizMundoDe(padreDe.get(c.target.node))
    const aMundo = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(delPadre)
    const centro = aMundo(mx, mz)
    let recorrido = 0
    for (let i = 0; i < ac.count; i++) {
      const o = base + i * paso
      const p = aMundo(bin.readFloatLE(o), bin.readFloatLE(o + 8))
      recorrido = Math.max(recorrido, Math.hypot(p.x - centro.x, p.z - centro.z))
    }
    // Andar en el sitio balancea la cadera un poco, y ESO HAY QUE DEJARLO: sin
    // balanceo la figura anda como una plancha. Solo se aplana una zancada de
    // verdad, que recorre casi lo que mide el bicho. Al 15% de su altura ya no
    // hay duda. La primera versión aplanaba cualquier movimiento y le quitaba
    // el balanceo a modelos que estaban perfectos.
    const parte = alto > 1e-4 ? recorrido / alto : 0
    if (parte <= 0.15) continue
    for (let i = 0; i < ac.count; i++) {
      const o = base + i * paso
      bin.writeFloatLE(mx, o)
      bin.writeFloatLE(mz, o + 8)
    }
    aplanados++
    hechos.push(`Aplanada la zancada de «${a.name ?? 'sin nombre'}»: la cadera recorría el ${(parte * 100).toFixed(0)} % de su altura y ahora se queda en su sitio.`)
    // Los mínimos y máximos del accessor ya no valen.
    if (ac.min && ac.max) { ac.min[0] = ac.max[0] = mx; ac.min[2] = ac.max[2] = mz }
  }
}

// --- volver a pegar los dos trozos -------------------------------------------
const txt = Buffer.from(JSON.stringify(json), 'utf8')
const relleno = (4 - (txt.length % 4)) % 4
const trozoJSON = Buffer.concat([txt, Buffer.alloc(relleno, 0x20)])
const rellenoBIN = (4 - (bin.length % 4)) % 4
const trozoBIN = Buffer.concat([bin, Buffer.alloc(rellenoBIN, 0)])

const cab = Buffer.alloc(12)
cab.writeUInt32LE(0x46546c67, 0)
cab.writeUInt32LE(2, 4)
cab.writeUInt32LE(12 + 8 + trozoJSON.length + 8 + trozoBIN.length, 8)
const c1 = Buffer.alloc(8); c1.writeUInt32LE(trozoJSON.length, 0); c1.writeUInt32LE(0x4e4f534a, 4)
const c2 = Buffer.alloc(8); c2.writeUInt32LE(trozoBIN.length, 0); c2.writeUInt32LE(0x004e4942, 4)
fs.writeFileSync(salida, Buffer.concat([cab, c1, trozoJSON, c2, trozoBIN]))

console.log('\n' + path.basename(entrada) + '  →  ' + path.basename(salida) + '\n')
if (!hechos.length) console.log('  No hacía falta tocar nada.')
else hechos.forEach((h, i) => console.log(`  ${i + 1}. ${h}`))
if (!renombrados && !giroAplicado && !aplanados) console.log('  (el archivo se ha copiado igual)')
console.log('\nAhora: node herramientas/revisar-glb.mjs ' + salida + '\n')
