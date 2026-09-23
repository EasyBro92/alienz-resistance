// Revisar un .glb recién descargado, venga de donde venga (Meshy, Tripo,
// TRELLIS, Hunyuan3D, Mixamo o Blender), antes de meterlo en el juego.
//
// Por qué hace falta: el juego NO se traga cualquier modelo. `assets.js` da por
// hechas tres cosas, y si alguna falla la figura entra rota y cuesta media tarde
// averiguar por qué:
//
//   1. Los huesos se llaman como los llama Meshy (`Spine01`, `Head`, `LeftArm`,
//      `LeftUpLeg`...). El ataque por código, los adornos (taladro, jeringa,
//      saco) y el acortar la zancada buscan esos nombres EXACTOS. Mixamo los
//      saca con `mixamorig:` delante y no encuentra ninguno: la figura anda,
//      pero no ataca ni lleva su trasto en la mano.
//   2. La figura mira hacia +Z. El juego le da media vuelta (`rotation.y = PI`)
//      porque los huéspedes bajan hacia -Z. Si viene ya mirando a -Z, camina de
//      espaldas.
//   3. El ciclo anda SIN MOVERSE DEL SITIO. Quien lleva la posición en el carril
//      es `zombie.js`; si el clip además desplaza la cadera, la figura se va
//      sola y se separa de su barra de vida y de su sombra.
//
// El tamaño no hay que mirarlo: el juego escala solo a la altura del huésped y
// le pone los pies en el suelo.
//
// Uso:  node herramientas/revisar-glb.mjs public/models/jefe-nuevo.glb

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import * as THREE from 'three'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/revisar-glb.mjs <archivo.glb>\n')
  process.exit(1)
}

// Los nombres de hueso que el código busca por ahí. Sacados de `src/`:
// si falta uno, lo que dependa de él no funciona.
const HUESOS_PEDIDOS = {
  'Hips': 'la raíz; sin ella no hay esqueleto que valga',
  'Spine01': 'el tronco gira aquí al atacar (vale `Spine`)',
  'Spine02': 'el pecho; de él cuelgan el saco y los bultos',
  'Head': 'la cabeza, para mirar y para los disparos a la cabeza',
  'LeftArm': 'brazo al atacar', 'RightArm': 'brazo al atacar',
  'LeftForeArm': 'antebrazo al atacar', 'RightForeArm': 'antebrazo al atacar',
  'LeftHand': 'de aquí cuelgan taladro y jeringa', 'RightHand': 'de aquí cuelgan taladro y jeringa',
  'LeftUpLeg': 'para acortar la zancada', 'RightUpLeg': 'para acortar la zancada',
  'LeftLeg': 'para acortar la zancada', 'RightLeg': 'para acortar la zancada',
  'LeftFoot': 'para medir la altura por huesos', 'RightFoot': 'para medir la altura por huesos'
}
// Estos dos no son obligatorios, pero si están se mide mejor.
const HUESOS_EXTRA = { 'head_end': 'la coronilla', 'LeftToeBase': 'la punta del pie' }

// --- abrir el contenedor -----------------------------------------------------
const bruto = fs.readFileSync(archivo)
if (bruto.readUInt32LE(0) !== 0x46546c67) {
  console.error('\nEsto no es un .glb (le falta la marca glTF). Si es un .gltf suelto o un .fbx,')
  console.error('hay que exportarlo a .glb primero.\n')
  process.exit(1)
}
const lenJSON = bruto.readUInt32LE(12)
const json = JSON.parse(bruto.slice(20, 20 + lenJSON).toString('utf8'))
const bin = bruto.slice(20 + lenJSON + 8, 20 + lenJSON + 8 + bruto.readUInt32LE(20 + lenJSON))

const draco = (json.extensionsRequired ?? []).includes('KHR_draco_mesh_compression')

// --- leer datos de un accessor ----------------------------------------------
const PIEZAS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
const LEER = {
  5126: (b, o) => b.readFloatLE(o), 5125: (b, o) => b.readUInt32LE(o),
  5123: (b, o) => b.readUInt16LE(o), 5121: (b, o) => b.readUInt8(o),
  5122: (b, o) => b.readInt16LE(o), 5120: (b, o) => b.readInt8(o)
}
const BYTES = { 5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1 }

function datos (indice) {
  const a = json.accessors[indice]
  if (a == null || a.bufferView == null) return null
  const bv = json.bufferViews[a.bufferView]
  const piezas = PIEZAS[a.type]
  const ancho = BYTES[a.componentType]
  const paso = bv.byteStride || piezas * ancho
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0)
  const leer = LEER[a.componentType]
  const fuera = []
  for (let i = 0; i < a.count; i++) {
    const fila = []
    for (let p = 0; p < piezas; p++) fila.push(leer(bin, base + i * paso + p * ancho))
    fuera.push(piezas === 1 ? fila[0] : fila)
  }
  return fuera
}

// --- recorrer el árbol de nodos ---------------------------------------------
function matrizDe (n) {
  const m = new THREE.Matrix4()
  if (n.matrix) return m.fromArray(n.matrix)
  return m.compose(
    new THREE.Vector3().fromArray(n.translation ?? [0, 0, 0]),
    new THREE.Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(n.scale ?? [1, 1, 1])
  )
}
const mundo = new Array((json.nodes ?? []).length)
const padre = new Array((json.nodes ?? []).length).fill(-1)
;(function bajar (indices, arriba) {
  for (const i of indices ?? []) {
    const n = json.nodes[i]
    mundo[i] = new THREE.Matrix4().multiplyMatrices(arriba, matrizDe(n))
    for (const h of n.children ?? []) padre[h] = i
    bajar(n.children, mundo[i])
  }
})((json.scenes?.[json.scene ?? 0] ?? json.scenes?.[0])?.nodes, new THREE.Matrix4())

const porNombre = new Map()
;(json.nodes ?? []).forEach((n, i) => { if (n.name && !porNombre.has(n.name)) porNombre.set(n.name, i) })
// Un archivo de Mixamo llama a todo `mixamorig:Hips`, `mixamorig:Head`... Eso hay
// que arreglarlo antes de meterlo (se avisa más abajo), pero el resto de la
// revisión —hacia dónde mira, si se mueve del sitio, cuánto mide— tiene que
// funcionar igual: sin esto salía un 309 % de zancada que no era verdad.
const crudo = new Map(porNombre)
for (const [n, i] of crudo) {
  const limpio = n.replace(/^mixamorig[:_]?/i, '')
  if (limpio !== n && !porNombre.has(limpio)) porNombre.set(limpio, i)
}
const sitioDe = nombre => {
  const i = porNombre.get(nombre)
  if (i == null || !mundo[i]) return null
  return new THREE.Vector3().setFromMatrixPosition(mundo[i])
}

// --- caja envolvente y triángulos -------------------------------------------
const caja = new THREE.Box3()
let triangulos = 0
;(json.nodes ?? []).forEach((n, i) => {
  if (n.mesh == null || !mundo[i]) return
  for (const p of json.meshes[n.mesh].primitives ?? []) {
    const pos = json.accessors[p.attributes?.POSITION]
    if (pos?.min && pos?.max) {
      for (let e = 0; e < 8; e++) {
        caja.expandByPoint(new THREE.Vector3(
          e & 1 ? pos.max[0] : pos.min[0],
          e & 2 ? pos.max[1] : pos.min[1],
          e & 4 ? pos.max[2] : pos.min[2]
        ).applyMatrix4(mundo[i]))
      }
    }
    const idx = json.accessors[p.indices]
    triangulos += Math.floor((idx?.count ?? pos?.count ?? 0) / 3)
  }
})
const ancho = caja.max.x - caja.min.x
const fondo = caja.max.z - caja.min.z

// La altura de verdad se mide por los HUESOS, no por la caja. Con una malla de
// esqueleto la caja sale de la geometría en pose de reposo, en las unidades del
// montador, multiplicada por la matriz del nodo: el Portador da 0,02 de alto.
// `assets.js` ya tropezó con esto. Los huesos sí llevan su sitio de verdad.
const arriba = sitioDe('head_end') ?? sitioDe('Head')
const abajo = sitioDe('LeftToeBase') ?? sitioDe('LeftFoot')
const altoHueso = arriba && abajo ? arriba.y - abajo.y : 0
const alto = altoHueso > 1e-4 ? altoHueso : caja.max.y - caja.min.y
const medidoPorHuesos = altoHueso > 1e-4

// --- imágenes ----------------------------------------------------------------
const imagenes = []
for (const img of json.images ?? []) {
  if (img.bufferView == null) { imagenes.push({ nota: 'fuera del archivo' }); continue }
  const bv = json.bufferViews[img.bufferView]
  const trozo = bin.slice(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
  let m = {}
  try { m = await sharp(trozo).metadata() } catch {}
  imagenes.push({ px: m.width ? `${m.width}×${m.height}` : '?', tipo: m.format ?? '?', bytes: bv.byteLength })
}
const pesoImagenes = imagenes.reduce((s, i) => s + (i.bytes ?? 0), 0)

// --- informe -----------------------------------------------------------------
const mb = b => (b / 1048576).toFixed(2) + ' MB'
const kb = b => Math.round(b / 1024) + ' kB'
const avisos = []
const bien = []

console.log('\n' + path.basename(archivo))
console.log('='.repeat(path.basename(archivo).length) + '\n')

console.log('PESO')
console.log(`  archivo entero ..... ${mb(bruto.length)}`)
console.log(`  texturas ........... ${mb(pesoImagenes)}  (${imagenes.length} imágenes)`)
console.log(`  malla y huesos ..... ${mb(bruto.length - pesoImagenes)}`)
for (const i of imagenes) console.log(`     · ${(i.px ?? i.nota).padEnd(11)} ${i.tipo ?? ''} ${i.bytes ? kb(i.bytes) : ''}`)
console.log(`  triángulos ......... ${triangulos.toLocaleString('es-ES')}${draco ? ' (comprimido con Draco, es aproximado)' : ''}`)
console.log(`  comprimido ......... ${draco ? 'sí, Draco' : 'no'}`)
console.log()

console.log('TAMAÑO')
if (medidoPorHuesos) {
  console.log(`  alto (por huesos) ..  ${alto.toFixed(2)}, de la punta del pie a la coronilla`)
  console.log('  (la caja envolvente no vale con esqueleto: sale de la pose de reposo)')
} else {
  console.log(`  alto × ancho × fondo  ${alto.toFixed(2)} × ${ancho.toFixed(2)} × ${fondo.toFixed(2)}`)
  console.log(`  pies en Y = ........  ${caja.min.y.toFixed(3)}`)
}
console.log('  (el juego lo escala solo y le baja los pies al suelo: da igual que no venga a escala)')
console.log()

console.log('ESQUELETO')
const esqueleto = (json.skins ?? []).length > 0
// Un decorado —una nave, un monumento, una arena— no tiene por qué llevar
// huesos ni mirar a ningún lado, y aguanta muchos más triángulos porque sale
// uno solo en pantalla. El Coliseo lleva 118.000 y va fino. Se reconoce porque
// no tiene esqueleto y es grande o muy poblado; si acierta mal, `--decorado`.
const decorado = process.argv.includes('--decorado') ||
  (!esqueleto && (alto > 6 || triangulos > 40000))
if (esqueleto) {
  const huesos = json.skins.reduce((s, k) => s + k.joints.length, 0)
  console.log(`  tiene esqueleto .... sí, ${huesos} huesos en ${json.skins.length} piel(es)`)
} else {
  console.log('  tiene esqueleto .... NO')
}
console.log(`  animaciones ........ ${(json.animations ?? []).length}`)
for (const a of json.animations ?? []) {
  const tiempos = a.channels.map(c => json.accessors[a.samplers[c.sampler].input]?.max?.[0] ?? 0)
  console.log(`     · «${a.name ?? 'sin nombre'}» ${Math.max(0, ...tiempos).toFixed(2)} s`)
}
console.log()

if (esqueleto) {
  // 1. Nombres de hueso
  const faltan = Object.keys(HUESOS_PEDIDOS).filter(h => !porNombre.has(h))
  const conSpine = faltan.filter(h => h === 'Spine01').length && porNombre.has('Spine')
  const mixamo = [...crudo.keys()].some(n => /^mixamorig[:_]?/i.test(n))
  console.log('NOMBRES DE HUESO')
  if (mixamo) {
    console.log('  vienen de Mixamo, con «mixamorig:» delante. El juego no los encuentra.')
    avisos.push('Quitar el «mixamorig:» de todos los huesos (lo hago yo con un script, es automático).')
  } else if (faltan.length === 0) {
    console.log('  están todos los que el juego busca.')
    bien.push('Los huesos se llaman como el juego espera.')
  } else if (faltan.length <= 2 && conSpine) {
    console.log('  falta `Spine01`, pero hay `Spine`: el código ya prueba ese, vale igual.')
    bien.push('Los huesos valen (usa `Spine` en vez de `Spine01`).')
  } else {
    console.log(`  faltan ${faltan.length}:`)
    for (const h of faltan) console.log(`     · ${h} — ${HUESOS_PEDIDOS[h]}`)
    avisos.push('Renombrar los huesos que faltan, o el bicho andará pero no atacará ni llevará su trasto.')
  }
  for (const [h, para] of Object.entries(HUESOS_EXTRA)) {
    if (porNombre.has(h)) console.log(`  además trae \`${h}\` (${para}): mejor.`)
  }
  console.log()

  // 2. Hacia dónde mira. Con Y arriba y mirando a +Z, la izquierda del bicho
  //    cae en +X. Si cae en -X es que viene mirando al revés.
  const izq = sitioDe('LeftArm') ?? sitioDe('LeftUpLeg') ?? sitioDe('LeftHand')
  const der = sitioDe('RightArm') ?? sitioDe('RightUpLeg') ?? sitioDe('RightHand')
  console.log('HACIA DÓNDE MIRA')
  if (izq && der && Math.abs(izq.x - der.x) > 1e-4) {
    if (izq.x > der.x) {
      console.log('  a +Z, que es lo que el juego da por hecho.')
      bien.push('Mira hacia donde toca.')
    } else {
      console.log('  a -Z: viene del revés.')
      avisos.push('Viene mirando a -Z: hay que quitarle el `rotation.y = Math.PI` o girarlo al importar, o caminará de espaldas.')
    }
  } else {
    console.log('  no se puede saber por los huesos: hay que mirarlo con los ojos.')
  }
  console.log()

  // 3. ¿El ciclo se mueve del sitio?
  console.log('EL CICLO, ¿SE MUEVE DEL SITIO?')
  let viaja = false
  let mirados = 0
  for (const a of json.animations ?? []) {
    for (const c of a.channels) {
      if (c.target.path !== 'translation') continue
      const nombre = json.nodes[c.target.node]?.name ?? ''
      if (!/hips|root|armature|^$/i.test(nombre)) continue
      const v = datos(a.samplers[c.sampler].output)
      if (!v) continue
      // Al mundo: la cadera se mueve en las unidades de su padre, y comparar eso
      // con la altura sin convertir da sustos que no son.
      const suPadre = mundo[padre[c.target.node]] ?? new THREE.Matrix4()
      const pts = v.map(p => new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(suPadre))
      let recorrido = 0
      for (const p of pts) recorrido = Math.max(recorrido, Math.hypot(p.x - pts[0].x, p.z - pts[0].z))
      const parte = alto > 1e-4 ? recorrido / alto : 0
      mirados++
      // Andar en el sitio balancea la cadera un poco; una zancada de verdad
      // recorre casi lo que mide el bicho. Al 15% ya no hay duda.
      if (parte > 0.15) {
        viaja = true
        console.log(`  «${a.name ?? 'sin nombre'}» mueve \`${nombre}\` ${(parte * 100).toFixed(0)} % de su altura por el suelo.`)
      } else {
        console.log(`  «${a.name ?? 'sin nombre'}»: la cadera solo se balancea (${(parte * 100).toFixed(0)} % de su altura). Bien.`)
      }
    }
  }
  if (viaja) {
    avisos.push('El ciclo desplaza la cadera. Hay que aplanarlo (lo hago yo): si no, la figura se va sola y deja atrás su barra de vida y su sombra.')
  } else if (mirados) {
    bien.push('El ciclo anda en el sitio.')
  } else if ((json.animations ?? []).length) {
    console.log('  no se encuentra la pista de la cadera: hay que mirarlo con los ojos.')
  } else {
    console.log('  no hay ciclo que mirar.')
  }
  console.log()
} else if (decorado) {
  console.log('DECORADO')
  console.log('  Por el tamaño y los triángulos, esto es escenario (nave, monumento, arena),')
  console.log('  no un bicho. Va quieto y entra tal cual: no se le miran huesos ni hacia')
  console.log('  dónde mira. Si me he equivocado, vuelve a lanzarlo con `--decorado` quitado')
  console.log('  del sitio o dímelo.')
  console.log()
} else {
  console.log('SIN ESQUELETO')
  console.log('  Es una figura quieta. Sirve para naves, monumentos y adornos tal cual.')
  console.log('  Para un bicho que anda hacen falta huesos: o se los pone Meshy / Mixamo,')
  console.log('  o le monto un esqueleto por código como el de LA MADRE.')
  console.log('  No es un defecto, es una decisión: LA MADRE entró así y se mueve por código.')
  console.log()
}

// --- qué hacer ---------------------------------------------------------------
if (pesoImagenes > 2 * 1048576) {
  avisos.push(`Las texturas pesan ${mb(pesoImagenes)}. Adelgazarlas: node herramientas/adelgazar.mjs ${archivo}`)
}
// El tope no es el mismo: de un bicho salen veinte a la vez en pantalla, de un
// decorado sale uno.
const topeTri = decorado ? 200000 : 60000
if (triangulos > topeTri) {
  avisos.push(`${triangulos.toLocaleString('es-ES')} triángulos pasan del tope de ${topeTri.toLocaleString('es-ES')} para ${decorado ? 'un decorado' : 'un bicho'}: hay que bajarlos con Blender.`)
}
if (!draco && bruto.length > 1.5 * 1048576) {
  avisos.push('Pesa más de 1,5 MB sin comprimir: le viene bien pasarlo por Draco.')
}

console.log('QUÉ HAY QUE ARREGLAR')
if (!avisos.length) {
  console.log('  Nada. Entra en el juego tal cual.')
} else {
  avisos.forEach((a, i) => console.log(`  ${i + 1}. ${a}`))
}
if (bien.length) {
  console.log('\nLO QUE YA ESTÁ BIEN')
  bien.forEach(b => console.log(`  · ${b}`))
}
console.log()
