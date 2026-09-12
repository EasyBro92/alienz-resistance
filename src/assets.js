import * as THREE from 'three'
import { brilla } from './systems/resplandor.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as clonarConHuesos } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { seg as lados, CON_OCLUSION, CON_ADORNOS, FUNDE_TONOS } from './systems/detalle.js'

// ---------------------------------------------------------------------------
// PUNTO DE CAMBIO DE MODELOS
//
// Mientras no haya modelos 3D, cada unidad se construye aquí con piezas
// articuladas que el juego anima. Cuando tengas un .glb, ponlo en public/models/
// y decláralo aquí. Ver public/models/LEEME.md.
// ---------------------------------------------------------------------------
// Una lista por clave: el juego elige una al azar por figura. Es lo que evita
// que los cinco fusileros del tablero sean gemelos, y es donde entran las
// mujeres — cada unidad tiene su versión de las dos.
//
// El color de la unidad va en el chaleco y el casco, no en un brazalete: a la
// distancia a la que se juega, un brazalete no existe, y el tablero se lee por
// el color de cada pieza. Dos manchas de caqui no se distinguen de nada.
//
// La clave que no esté aquí sigue con su figura procedural, y el Mortero se
// queda así a propósito.
export const MODELS = {
  rifle: ['models/soldado-fusil-f.glb', 'models/soldado-fusil-m.glb'],
  shotgun: ['models/soldado-escopeta-f.glb', 'models/soldado-escopeta-m.glb'],
  sniper: ['models/soldado-tirador-f.glb', 'models/soldado-tirador-m.glb'],
  flamer: ['models/soldado-lanzallamas-f.glb', 'models/soldado-lanzallamas-m.glb']
  // Arquero, Ametrallador y Mortero se quedan con su figura de piezas: el
  // presupuesto de generacion daba para cinco unidades en las dos versiones y
  // se han gastado en las que mas salen al tablero.
}

const loader = new GLTFLoader()
const cache = new Map()

// El .glb entero, no solo la escena: los modelos con esqueleto traen las
// animaciones aparte y se pierden si uno se queda con `gltf.scene`.
async function cargarGLTF (url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url))
  return cache.get(url)
}

async function loadModel (url) {
  const gltf = await cargarGLTF(url)
  // `clone(true)` de three NO sirve para mallas con esqueleto: copia los huesos
  // pero deja a la malla clonada apuntando al esqueleto del ORIGINAL, así que
  // todas las copias se mueven a la vez. `SkeletonUtils` rehace el vínculo.
  const copia = clonarConHuesos(gltf.scene)
  copia.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  return copia
}

// Un mando a distancia para un hueso.
//
// El bucle de `soldier.js` posa brazos y piernas en CADA fotograma: el encare,
// el retroceso del disparo, la respiración, el reparto del peso de una pierna a
// otra, los gestos. Todo eso es lo que hace que un soldado parezca vivo, y está
// escrito contra la figura de piezas: escribe ángulos absolutos en `rotation.x`
// de un miembro que arranca sin girar.
//
// A un hueso de verdad no se le puede escribir así. Viene con su orientación de
// reposo, que es un giro cualquiera en los tres ejes, y meterle un `rotation.x`
// absoluto lo arranca de sitio: el brazo sale del hombro mirando a otra parte.
//
// Así que el bucle escribe en un mando —un objeto suelto que empieza a cero— y
// al final del fotograma lo que haya escrito se aplica al hueso COMO DESVÍO
// sobre su reposo. El juego sigue sin saber que hay huesos, y el soldado de
// Meshy recupera todo lo que hacía el de piezas.
// Bajar los brazos de la pose A.
//
// La figura se pide en pose A —brazos abiertos como una letra A— porque es lo
// que el montador de esqueletos necesita para reconocer dónde acaba el torso y
// empieza el brazo. Pero el bucle del juego posa desde una figura con los
// brazos CAÍDOS, y sus ángulos son pequeños: medio radián arriba o abajo del
// costado. Sumados sobre una pose A, los soldados se quedaban en cruz, con las
// manos en alto y el fusil apuntando al cielo.
//
// Así que al reposo del hueso se le encadena esta corrección, y a partir de ahí
// el juego escribe como si la figura tuviera los brazos donde siempre.
const _aux = new THREE.Quaternion()
const _eje = new THREE.Vector3(0, 0, 1)
function bajarBrazo (signo) {
  return _aux.clone().setFromAxisAngle(_eje, signo * 0.95)
}

function mandoDeHueso (hueso, huesoLower, ajuste = null) {
  const nudo = new THREE.Object3D()
  const lower = new THREE.Object3D()
  nudo.add(lower)
  nudo.userData.lower = lower
  nudo.userData.restBend = 0
  if (hueso) {
    nudo.userData.hueso = hueso
    const reposo = hueso.quaternion.clone()
    if (ajuste) reposo.multiply(ajuste)
    nudo.userData.reposo = reposo
  }
  if (huesoLower) {
    lower.userData.hueso = huesoLower
    lower.userData.reposo = huesoLower.quaternion.clone()
  }
  return nudo
}

// Envolver un modelo con esqueleto en la forma que el juego espera.
async function armarPersona (key, spec, urls) {
  const url = Array.isArray(urls) ? urls[Math.floor(Math.random() * urls.length)] : urls
  const gltf = await cargarGLTF(url)
  const cuerpo = await loadModel(url)

  const g = new THREE.Group()
  const figure = new THREE.Group()
  g.add(figure)
  figure.add(cuerpo)

  // Meshy monta el esqueleto con la cara hacia +Z; el juego mira hacia -Z, que
  // es de donde bajan los huéspedes. Media vuelta o el soldado dispara a su
  // propia base.
  cuerpo.rotation.y = Math.PI

  // A la altura del juego. La figura procedural mide 1,7 y todo está medido
  // contra eso: los carriles, la cámara, la barra de vida.
  // Se mide por los HUESOS, no por la caja envolvente.
  //
  // `Box3.setFromObject` no sirve con una malla de esqueleto: coge la caja de la
  // geometría, que está en pose de reposo y en las unidades del montador, y la
  // multiplica por la matriz del nodo. El resultado no tiene que ver con lo que
  // se ve. Midiendo así, la figura entraba en el tablero midiendo 140 y tapaba
  // la pantalla entera.
  //
  // Los huesos sí llevan su transformación de verdad, y el esqueleto trae uno
  // llamado `head_end` justo en la coronilla y otro en la punta del pie. La
  // distancia entre esos dos ES la altura del personaje.
  const hueso = nombre => { let h = null; cuerpo.traverse(o => { if (!h && o.name === nombre) h = o }); return h }
  cuerpo.updateWorldMatrix(true, true)

  const arriba = hueso('head_end') ?? hueso('Head')
  const abajo = hueso('LeftToeBase') ?? hueso('LeftFoot')
  let alto = 0
  const pa = new THREE.Vector3(); const pb = new THREE.Vector3()
  if (arriba && abajo) {
    arriba.getWorldPosition(pa)
    abajo.getWorldPosition(pb)
    alto = pa.y - pb.y
  }
  if (alto > 0.01) {
    // El hueso de la coronilla no llega al alto del casco: se compensa un poco o
    // los soldados salen medio palmo bajos respecto a los procedurales.
    cuerpo.scale.multiplyScalar(1.7 / (alto * 1.06))
    cuerpo.updateWorldMatrix(true, true)
    abajo.getWorldPosition(pb)
    cuerpo.position.y -= pb.y              // los pies al suelo, no al centro
    cuerpo.updateWorldMatrix(true, true)
  }

  // --- el arma, colgada de la mano -------------------------------------------
  // Las figuras salen sin arma a propósito: el juego ya construye cada arma
  // pieza a pieza, con su cañón que se calienta y su puerto de casquillos, y así
  // el mismo cuerpo sirve para las siete unidades.
  let mano = null
  cuerpo.traverse(o => { if (!mano && o.name === 'RightHand') mano = o })
  const arma = buildWeapon(key, spec)
  if (mano) {
    mano.add(arma)
    // La mano viene en la escala del esqueleto, que no es la del mundo: se
    // deshace para que el arma salga del tamaño que se construyó.
    const k = new THREE.Vector3()
    mano.getWorldScale(k)
    arma.scale.setScalar(1 / (k.x || 1))
    arma.position.set(0, 0.02, 0)
    arma.rotation.set(0, Math.PI, 0)
  } else {
    figure.add(arma)
    arma.position.set(0.2, 1.26, -0.42)
  }

  g.add(contactShadow(0.85))

  // Los nombres son los del montador de esqueletos, que usa la convención de
  // siempre: hombro y antebrazo, muslo y tibia.
  g.userData.limbs = {
    // Los signos están medidos sobre el esqueleto, no deducidos: el brazo se
    // extiende por su +Y local y gira sobre Z, y el rig no es simétrico —al
    // izquierdo lo baja el giro positivo y al derecho el negativo—. Con los
    // signos cambiados los soldados salían en cruz, apuntando al cielo.
    armL: mandoDeHueso(hueso('LeftArm'), hueso('LeftForeArm'), bajarBrazo(1)),
    armR: mandoDeHueso(hueso('RightArm'), hueso('RightForeArm'), bajarBrazo(-1)),
    legL: mandoDeHueso(hueso('LeftUpLeg'), hueso('LeftLeg')),
    legR: mandoDeHueso(hueso('RightUpLeg'), hueso('RightLeg'))
  }
  g.userData.head = mandoDeHueso(hueso('Head'), null)
  // El arma cuelga del hueso de la mano, así que la mueve la mano. El mando
  // recoge lo que el bucle le escriba —el retroceso, el arma recogida al
  // andar— y lo aplica al antebrazo de disparo, que es lo que de verdad
  // levanta el cañón.
  g.userData.weapon = mandoDeHueso(null, null)
  g.userData.rest = {
    arm: { armL: 0, armR: 0 }, leg: { legL: 0, legR: 0 },
    armBend: { armL: 0, armR: 0 }, legBend: { legL: 0, legR: 0 },
    armRoll: { armL: 0, armR: 0 },
    weaponRest: new THREE.Vector3(0, 0, 0), headY: 1.66
  }
  // Estos SÍ son los de verdad: se leen por matriz de mundo al disparar, así que
  // siguen a la mano sin que nadie los mueva a mano.
  const fogonazo = montarFogonazo(arma)
  arma.add(fogonazo)
  g.userData.flash = fogonazo
  g.userData.canon = arma.userData.canon ?? null
  g.userData.puerto = arma.userData.puerto ?? null
  if (g.userData.canon) brilla(g.userData.canon)

  g.userData.figure = figure
  g.userData.stance = 0
  g.userData.headYaw = 0
  g.userData.build = 1
  g.userData.animado = true
  g.userData.clips = gltf.animations ?? []
  return g
}

// --- utilidades -------------------------------------------------------------

const matCache = new Map()
// Metalicidad 0 por defecto: tela, piel, cuero, lino, trapos, hueso y carne no
// son metales. Con 0.05 de fondo, todo lo orgánico cogía un reflejo que no le
// toca y se ensuciaba el color.
function mat (color, rough = 0.5, metal = 0) {
  const key = `${color}-${rough}-${metal}`
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  }
  return matCache.get(key)
}

// Material que emite luz propia. Lo que brilla en los huéspedes es la espora,
// no un reflejo: sin emisión se vería como pintura verde y no como algo vivo.
function glow (color, intensity = 1.4) {
  const key = `glow-${color}-${intensity}`
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: intensity, roughness: 0.35, metalness: 0
    }))
  }
  return matCache.get(key)
}

const geoCache = new Map()
function geo (key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make())
  return geoCache.get(key)
}

// Todas las primitivas pasan sus divisiones por `lados()`, que las recorta según
// el detalle elegido. Se recorta AQUÍ y no en cada figura porque así ninguna
// pieza nueva se olvida de hacerlo, y porque el número recortado entra en la
// clave de caché.
const box = (w, h, d, r = 0.02, s = 2) => {
  const v = lados(s, 1)
  return geo(`rb${w},${h},${d},${r},${v}`, () => new RoundedBoxGeometry(w, h, d, v, Math.min(r, w / 2.05, h / 2.05, d / 2.05)))
}

const cap = (r, len, cs = 5, rs = 12) => {
  // La cápsula gasta anillos x radios: recortar los dos multiplica el ahorro.
  const a = lados(cs, 2); const b = lados(rs, 5)
  return geo(`c${r},${len},${a},${b}`, () => new THREE.CapsuleGeometry(r, len, a, b))
}
const ball = (r, w = 14, h = 10) => {
  const a = lados(w, 5); const b = lados(h, 4)
  return geo(`s${r},${a},${b}`, () => new THREE.SphereGeometry(r, a, b))
}
const tube = (rt, rb, h, s = 10) => {
  const v = lados(s, 5)
  return geo(`y${rt},${rb},${h},${v}`, () => new THREE.CylinderGeometry(rt, rb, h, v))
}
// Perfil girado: sirve para torsos, cascos y cualquier volumen orgánico que no
// se pueda sacar de una cápsula.
//
// El orden de los puntos decide hacia dónde miran las caras. Un perfil escrito
// de arriba abajo sale con las normales hacia dentro y la pieza se vuelve
// invisible desde fuera — así se perdieron los cascos, que estaban ahí pero
// renderizados del revés. Se normaliza aquí para que dé igual cómo se escriba.
const lathe = (key, pts, s = 16) => {
  const v = lados(s, 6)
  return geo(`l${key},${v}`, () => {
    const ordered = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts
    return new THREE.LatheGeometry(ordered.map(([x, y]) => new THREE.Vector2(x, y)), v)
  })
}

const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex()
const jitterColor = (hex, amount) => {
  const c = new THREE.Color(hex)
  c.offsetHSL((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount * 0.6)
  return c.getHex()
}

// Materiales gemelos que leen el color por vértice. No se puede activar
// `vertexColors` en el material compartido: lo usan también mallas sueltas sin
// ese atributo, y una malla con vertexColors y sin colores se dibuja en negro.
const conAO = new Map()
function materialAO (base) {
  if (!conAO.has(base)) {
    const m = base.clone()
    m.vertexColors = true
    conAO.set(base, m)
  }
  return conAO.get(base)
}

// Oclusión cocida en los vértices.
//
// La luz del sol y el mapa de sombras resuelven la sombra que una figura
// proyecta sobre el suelo, pero no la que se hace a sí misma: el hueco bajo el
// casco, la axila, la juntura de la coraza, el sitio donde la mochila se apoya
// en la espalda. Sin eso todo queda igual de iluminado y las figuras se leen
// como plástico moldeado de una pieza.
//
// El truco es que estas figuras están hechas de primitivas que SE SOLAPAN: allí
// donde dos piezas se meten una dentro de otra hay, por definición, un rincón.
// Así que en vez de trazar rayos —que a la carga costaría segundos— se mide,
// para cada vértice, dentro de cuántas otras piezas cae. Cuantas más, más
// oscuro. Sale gratis en marcha: es un atributo más de la geometría.
const AO_FUERZA = 0.55       // cuánto llega a oscurecer un rincón cerrado
const AO_MARGEN = 0.035      // holgura: los vértices justo fuera también cuentan

function cocerAO (geos, esferas) {
  for (const { g, i: propia, esfera } of geos) {
    // Si la geometría ya trae color propio —el degradado de la sombra de
    // contacto, por ejemplo— se respeta: pisarlo la volvería un disco opaco.
    if (g.attributes.color) continue

    // Solo las piezas que de verdad tocan a esta. Sin este filtro cada vértice
    // se comparaba con las noventa piezas del soldado: cinco millones y medio de
    // distancias por figura, decenas de milésimas cada vez que se coloca una.
    // Una pieza que ni siquiera roza la esfera de esta no puede ocluirla.
    const cerca = []
    for (let e = 0; e < esferas.length; e++) {
      if (e === propia) continue
      const o = esferas[e]
      const dx = o.x - esfera.x, dy = o.y - esfera.y, dz = o.z - esfera.z
      const alcance = o.r + AO_MARGEN + esfera.r / 0.72   // el radio real, sin encoger
      if (dx * dx + dy * dy + dz * dz < alcance * alcance) cerca.push(o)
    }
    const pos = g.attributes.position
    const col = new Float32Array(pos.count * 3)
    if (!cerca.length) {
      col.fill(1)
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      continue
    }
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v)
      let dentro = 0
      for (let e = 0; e < cerca.length; e++) {
        const s = cerca[e]
        const dx = x - s.x, dy = y - s.y, dz = z - s.z
        const r = s.r + AO_MARGEN
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 >= r * r) continue
        // Suave: en el centro de la otra pieza ocluye del todo, en el borde nada.
        dentro += 1 - Math.sqrt(d2) / r
      }
      // Se satura enseguida: a partir de dos o tres solapes el rincón ya está
      // igual de cerrado y seguir oscureciendo lo pone negro.
      const k = 1 - AO_FUERZA * (1 - Math.exp(-dentro * 1.6))
      col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = k
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
}

// Junta las piezas quietas en una malla por material: sin esto cada soldado
// serían casi cien llamadas de dibujo y el móvil se arrastraría.
export function bake (parts, quiereAO = true) {
  // En detalle bajo no se cuece la oclusión: son unos seis milisegundos por
  // figura y un color por vértice en toda la malla. Se nota al colocar soldados,
  // que es justo el momento en que el móvil viejo se traba.
  const ao = quiereAO && CON_OCLUSION
  parts.updateMatrixWorld(true)
  const byMat = new Map()
  const todas = []
  const esferas = []
  parts.traverse(o => {
    if (!o.isMesh) return
    let g = o.geometry.clone()
    if (g.index) g = g.toNonIndexed()
    g.applyMatrix4(o.matrixWorld)
    g.deleteAttribute('uv')
    if (ao) {
      g.computeBoundingSphere()
      const b = g.boundingSphere
      // Se encoge un poco: con la esfera entera, dos piezas que solo se rozan
      // ya se oscurecían la una a la otra por completo.
      const esfera = { x: b.center.x, y: b.center.y, z: b.center.z, r: b.radius * 0.72 }
      esferas.push(esfera)
      todas.push({ g, i: esferas.length - 1, esfera })
    }
    const clave = FUNDE_TONOS ? familia(o.material) : o.material
    if (!byMat.has(clave)) byMat.set(clave, { material: o.material, lista: [], origen: new Set() })
    const grupo = byMat.get(clave)
    grupo.lista.push(g)
    grupo.origen.add(o.material)
  })

  // El coste va con vértices × piezas. En un soldado son unos ocho mil por
  // noventa: setecientas mil cuentas, unas pocas milésimas UNA vez, al construir.
  if (ao) cocerAO(todas, esferas)

  const out = new THREE.Group()
  for (const { material, lista: list, origen } of byMat.values()) {
    const mesh = new THREE.Mesh(list.length > 1 ? mergeGeometries(list, false) : list[0],
      ao ? materialAO(material) : material)
    // Lo plano y transparente (marcas del asfalto) no debe proyectar sombra.
    mesh.castShadow = !material.transparent
    // Las marcas transparentes van encima del asfalto, nunca al revés.
    mesh.renderOrder = material.transparent ? 2 : 0
    mesh.receiveShadow = true
    // De qué material salió: es la única forma de volver a encontrar una pieza
    // concreta —el cañón, por ejemplo— después de haber fundido noventa en cinco.
    // Geometría propia de esta figura, no una de la caché compartida: se puede
    // soltar sin dejar sin cuerpo a las demás.
    mesh.userData.fundida = true
    mesh.userData.baseMat = material
    // Con la fusión, un dibujo puede venir de varios materiales: hay que poder
    // encontrar la pieza por cualquiera de ellos.
    mesh.userData.baseMats = origen
    out.add(mesh)
  }
  return out
}

// Un soldado sale de `bake` con veinticinco materiales, o sea veinticinco
// llamadas de dibujado por figura; con el tablero lleno eran mil trescientas.
// Pero muchos de esos veinticinco son el mismo caqui con medio tono de
// diferencia: correa, funda, cantimplora, cinchas. A setenta píxeles de alto esa
// diferencia no existe, así que en detalle bajo se agrupan por color redondeado
// y las cuatro piezas acaban en un solo dibujo.
//
// No entran en la fusión: lo transparente (se ordena aparte), lo que emite luz
// (lo lee el resplandor) y lo que esté marcado `solo` — el cañón, que se calienta
// cambiando SU material y teñiría de rojo a todo lo que estuviera fundido con él.
const TRAMO = 0.14
function familia (m) {
  if (m.transparent || m.userData?.solo) return m
  if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) return m
  const q = c => Math.round(c / TRAMO)
  return `f${q(m.color.r)},${q(m.color.g)},${q(m.color.b)},${Math.round(m.roughness * 3)},${Math.round(m.metalness * 2)}`
}

// Detalle que solo se aprecia de cerca. Se monta igual que `piece`, pero en
// detalle bajo no se monta: son piezas de dos centímetros —una vértebra, una
// vena, un jirón— que a la distancia de juego son un píxel, y cada una cuesta
// vértices y una entrada más en la fusión de materiales.
function adorno (...args) {
  return CON_ADORNOS ? piece(...args) : null
}

function piece (parent, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  parent.add(m)
  return m
}

// Sombra de contacto con borde difuminado. Un disco de opacidad plana se
// recorta contra el asfalto y se lee como una pegatina; el degradado por
// vértice la funde con el suelo sin costar nada.
const CONTACT_MAT = new THREE.MeshBasicMaterial({
  color: 0x2a1e12, transparent: true, opacity: 1, depthWrite: false, vertexColors: true
})
const contactGeo = (() => {
  const g = new THREE.CircleGeometry(0.5, 20)
  const p = g.attributes.position
  // Cuatro componentes, no tres: la alfa por vértice solo se activa con RGBA.
  const col = new Float32Array(p.count * 4)
  for (let i = 0; i < p.count; i++) {
    // El círculo se construye en el plano XY, antes de tumbarlo: el radio sale
    // de X e Y, no de X y Z.
    const r = Math.hypot(p.getX(i), p.getY(i)) / 0.5
    col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1
    col[i * 4 + 3] = 0.46 * Math.pow(1 - r, 1.6)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4))
  return g
})()
function contactShadow (radius = 1) {
  const m = new THREE.Mesh(contactGeo, CONTACT_MAT)
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.02
  m.scale.setScalar(radius)
  // Orden 3, por encima de las marcas del asfalto (orden 2): con orden 1 una
  // mancha de sangre podía dibujarse ENCIMA de la sombra de un soldado.
  m.renderOrder = 3
  return m
}

// Extremidad de dos tramos. El tramo bajo es más fino que el alto, y hay una
// bola en cada articulación: es lo que hace que un brazo doblado no se vea
// como dos palos pegados.
// `extraUpper` / `extraLower` reciben el grupo ANTES de fundirlo. Todo lo que se
// colgaba a mano después (rodilleras, garras, brazales, tiras de sandalia) era
// una llamada de dibujo suelta por pieza: ocho por huésped, que con la horda en
// pantalla son más de doscientas que no tenían por qué existir.
function limb ({ length, thickness, material, joint, end, endMat, bend = 0, endOffset = 0, lowerMat, extraUpper, extraLower }) {
  const half = length / 2

  // Cada tramo se funde en sus propias mallas: solo giran dos pivotes, así que
  // dentro de cada tramo las piezas son rígidas entre sí.
  const upperParts = new THREE.Group()
  piece(upperParts, ball(thickness * 1.35, 12, 10), joint ?? material)
  piece(upperParts, cap(thickness, half * 0.66, 5, 12), material, 0, -half / 2, 0)
  if (extraUpper) extraUpper(upperParts, half, thickness)

  const lowerParts = new THREE.Group()
  piece(lowerParts, ball(thickness * 1.05, 10, 8), joint ?? material)
  piece(lowerParts, cap(thickness * 0.8, half * 0.66, 5, 12), lowerMat ?? material, 0, -half / 2, 0)
  piece(lowerParts, ball(thickness * 0.72, 10, 8), lowerMat ?? material, 0, -half * 0.92, 0)
  if (end) piece(lowerParts, end, endMat ?? material, 0, -half - thickness * 0.1, endOffset)
  if (extraLower) extraLower(lowerParts, half, thickness)

  const pivot = new THREE.Group()
  pivot.add(bake(upperParts))
  const lower = new THREE.Group()
  lower.position.y = -half
  lower.rotation.x = bend
  lower.add(bake(lowerParts))
  pivot.add(lower)

  pivot.userData.lower = lower
  pivot.userData.restBend = bend
  return pivot
}

// ---------------------------------------------------------------------------
// armas: cada una montada pieza a pieza, con las partes que tiene de verdad
// (cajón, guardamanos, cargador, empuñadura, culata, óptica). Es lo que hace
// que se lea como un arma y no como un palo negro.
// ---------------------------------------------------------------------------
function buildWeapon (key) {
  const w = new THREE.Group()
  // El cañón lleva material PROPIO de cada arma, no el compartido: se pone al
  // rojo con el fuego sostenido, y con un material compartido se habrían puesto
  // al rojo todos los cañones del tablero a la vez.
  const canonMat = new THREE.MeshStandardMaterial({
    color: 0x141619, roughness: 0.3, metalness: 0.6, emissive: 0x000000
  })
  // Fuera de la fusión de tonos: al calentarse cambia su emisivo, y fundido con
  // el resto del arma pondría al rojo la culata y el cargador con él.
  canonMat.userData.solo = true
  const steel = mat(0x24272c, 0.30, 0.75)
  const black = mat(0x141619, 0.3, 0.6)
  const polymer = mat(0x2f3a33, 0.72, 0.05)
  const wood = mat(0x4a3324, 0.72)
  const glass = mat(0x7fd8ff, 0.08, 0.3)
  const sling = mat(0x33302a, 0.95)

  const grip = (z, tilt = 0.38) => {
    piece(w, box(0.055, 0.2, 0.09, 0.02), polymer, 0, -0.15, z, tilt)
    piece(w, box(0.06, 0.045, 0.05, 0.015), black, 0, -0.055, z - 0.05)   // guardamonte
  }

  if (key === 'archer') {
    // Arco de madera con la cuerda tensada y el carcaj lleno de flechas.
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + (i / 8) * 1.8
      piece(w, cap(0.022, 0.1, 3, 6), wood, 0, Math.sin(a) * 0.46, -Math.cos(a) * 0.14 - 0.1, a * 0.9)
    }
    piece(w, box(0.05, 0.16, 0.07, 0.02), mat(0x6b4a2c, 0.85), 0, 0, -0.1)          // empuñadura
    for (let i = 0; i < 7; i++) {                                                    // cuerda
      piece(w, cap(0.007, 0.11, 3, 5), mat(0xd8cfae, 0.9), 0, -0.36 + i * 0.12, 0.02)
    }
    piece(w, tube(0.014, 0.014, 0.62, 5), mat(0x6a4a2c, 0.8), 0, 0, -0.34, Math.PI / 2)  // flecha montada
    piece(w, box(0.03, 0.09, 0.06, 0.01), mat(0xc9c2ad, 0.8), 0, 0.02, -0.02)
    piece(w, tube(0.06, 0.07, 0.34, 8), mat(0x5b4028, 0.9), 0.22, -0.06, 0.34, 0.3)  // carcaj
    for (let i = 0; i < 5; i++) {
      piece(w, tube(0.01, 0.01, 0.24, 4), mat(0x6a4a2c, 0.8), 0.2 + (i % 3) * 0.03, 0.14, 0.3 + (i % 2) * 0.04, 0.3)
      piece(w, box(0.02, 0.07, 0.05, 0.008), mat(0xb8563f, 0.85), 0.2 + (i % 3) * 0.03, 0.24, 0.31)
    }
  } else if (key === 'gunner') {
    // Ametralladora con bípode, cinta de munición y culata de asa.
    piece(w, box(0.085, 0.13, 0.62, 0.02), steel, 0, 0, -0.06)
    piece(w, tube(0.026, 0.03, 0.62, 10), canonMat, 0, 0.01, -0.66, Math.PI / 2)
    for (let i = 0; i < 7; i++) piece(w, tube(0.042, 0.042, 0.02, 8), canonMat, 0, 0.01, -0.5 - i * 0.06, Math.PI / 2)  // camisa refrigerada
    piece(w, tube(0.05, 0.05, 0.08, 10), canonMat, 0, 0.01, -0.96, Math.PI / 2)
    piece(w, box(0.09, 0.16, 0.2, 0.03), steel, 0, -0.12, -0.06)                     // caja de cinta
    for (let i = 0; i < 6; i++) {                                                     // cinta colgando
      piece(w, box(0.05, 0.03, 0.03, 0.008), mat(0xc9a63c, 0.4, 0.7), -0.05, -0.2 - i * 0.035, -0.02 + i * 0.012)
    }
    piece(w, box(0.06, 0.05, 0.22, 0.02), black, 0, 0.09, 0.02)                       // asa de transporte
    for (const side of [-1, 1]) {
      piece(w, cap(0.013, 0.3, 3, 6), black, side * 0.09, -0.22, -0.52, 0, 0, side * 0.5)  // bípode
    }
    grip(0.2, 0.42)
    piece(w, box(0.07, 0.15, 0.3, 0.03), polymer, 0, -0.02, 0.34)
  } else if (key === 'flamer') {
    // Solo la lanza. Las bombonas viven en la ESPALDA del soldado, no aquí: en
    // el grupo del arma se hundían y se volcaban con ella cada vez que bajaba
    // el arma, y el objeto más grande del modelo se bamboleaba en el aire.
    piece(w, tube(0.035, 0.035, 0.66, 10), steel, 0, 0, -0.28, Math.PI / 2)
    piece(w, tube(0.055, 0.045, 0.14, 10), black, 0, 0, -0.62, Math.PI / 2)          // boquilla
    piece(w, tube(0.016, 0.016, 0.1, 6), mat(0xffb03a, 0.2), 0.05, 0.045, -0.6, Math.PI / 2)  // piloto
    piece(w, box(0.055, 0.11, 0.2, 0.02), steel, 0, -0.06, 0.04)
    grip(0.1, 0.4)
    piece(w, box(0.05, 0.09, 0.12, 0.02), polymer, 0, -0.04, 0.26)
  } else if (key === 'mortar') {
    // Mortero de trípode: tubo inclinado al cielo y bombas en el suelo.
    piece(w, tube(0.075, 0.09, 0.78, 12), steel, 0, 0.14, -0.06, -0.95)
    piece(w, tube(0.09, 0.09, 0.06, 12), canonMat, 0.02, 0.44, -0.32, -0.95)             // boca
    piece(w, box(0.3, 0.05, 0.3, 0.02), black, -0.02, -0.2, 0.14)                     // placa base
    for (const side of [-1, 1]) {
      piece(w, cap(0.016, 0.42, 3, 6), steel, side * 0.14, -0.02, 0.06, 0.4, 0, side * 0.45)
    }
    piece(w, box(0.05, 0.09, 0.05, 0.015), mat(0xb8a13c, 0.5, 0.3), 0.13, 0.06, 0.06)  // alza
    for (let i = 0; i < 3; i++) {                                                       // bombas de reserva
      piece(w, cap(0.045, 0.1, 5, 8), mat(0x3a3f45, 0.5, 0.4), -0.2 + i * 0.09, -0.2, 0.3)
      piece(w, tube(0.045, 0.01, 0.08, 6), mat(0x2a2e33, 0.6), -0.2 + i * 0.09, -0.32, 0.3)
    }
  } else if (key === 'sniper') {
    piece(w, box(0.07, 0.09, 0.56, 0.02), steel, 0, 0, -0.02)             // cajón
    piece(w, tube(0.021, 0.024, 0.78, 10), canonMat, 0, 0.005, -0.66, Math.PI / 2)  // cañón
    piece(w, tube(0.036, 0.036, 0.1, 10), canonMat, 0, 0.005, -1.03, Math.PI / 2)   // freno de boca
    for (let i = 0; i < 3; i++) piece(w, tube(0.038, 0.038, 0.012, 10), steel, 0, 0.005, -0.99 + i * 0.03, Math.PI / 2)
    piece(w, tube(0.045, 0.045, 0.34, 12), black, 0, 0.115, -0.1, Math.PI / 2)   // visor
    piece(w, tube(0.055, 0.055, 0.06, 12), black, 0, 0.115, -0.29, Math.PI / 2)  // parasol
    piece(w, ball(0.043, 12, 8), glass, 0, 0.115, -0.31)
    piece(w, tube(0.028, 0.028, 0.05, 8), steel, 0, 0.155, -0.06, 0, 0, Math.PI / 2)  // torreta
    for (const z of [-0.02, 0.14]) piece(w, box(0.05, 0.05, 0.03, 0.01), steel, 0, 0.07, z)  // monturas
    piece(w, cap(0.012, 0.06, 3, 6), steel, 0.06, 0.02, 0.1, 0, 0, -0.9)  // cerrojo
    piece(w, ball(0.022, 8, 6), steel, 0.1, -0.01, 0.1)
    grip(0.16, 0.3)
    piece(w, box(0.06, 0.14, 0.34, 0.03), wood, 0, -0.02, 0.42)           // culata
    piece(w, box(0.07, 0.06, 0.2, 0.025), wood, 0, 0.07, 0.38)            // carrillera
    piece(w, box(0.075, 0.11, 0.05, 0.02), sling, 0, -0.02, 0.6)          // cantonera
    for (const side of [-1, 1]) {                                          // bípode
      piece(w, cap(0.011, 0.26, 3, 6), black, side * 0.075, -0.19, -0.52, 0, 0, side * 0.42)
    }
  } else if (key === 'shotgun') {
    piece(w, box(0.075, 0.1, 0.34, 0.025), steel, 0, 0, 0)                // cajón
    piece(w, tube(0.028, 0.028, 0.52, 10), canonMat, 0, 0.025, -0.42, Math.PI / 2)  // cañón
    piece(w, tube(0.024, 0.024, 0.42, 10), steel, 0, -0.035, -0.37, Math.PI / 2) // tubo cargador
    piece(w, box(0.062, 0.07, 0.16, 0.03), wood, 0, -0.035, -0.3)         // corredera
    for (let i = 0; i < 4; i++) piece(w, box(0.066, 0.012, 0.014, 0.005), black, 0, -0.035, -0.36 + i * 0.04)
    piece(w, ball(0.014, 8, 6), steel, 0, 0.052, -0.66)                   // punto de mira
    piece(w, box(0.06, 0.05, 0.09, 0.02), black, 0, -0.02, 0.13)          // cartuchos
    for (let i = 0; i < 3; i++) piece(w, tube(0.016, 0.016, 0.05, 8), mat(0x9c2f24, 0.5), 0.045, -0.02 + i * 0.035, 0.14, 0, 0, Math.PI / 2)
    grip(0.11, 0.42)
    piece(w, box(0.06, 0.12, 0.26, 0.03), wood, 0, -0.04, 0.32)           // culata
    piece(w, box(0.07, 0.1, 0.04, 0.02), sling, 0, -0.05, 0.46)
  } else {
    piece(w, box(0.062, 0.1, 0.4, 0.02), steel, 0, 0, 0)                  // cajón
    piece(w, box(0.055, 0.055, 0.28, 0.02), black, 0, 0.055, -0.06)       // riel superior
    for (let i = 0; i < 6; i++) piece(w, box(0.058, 0.012, 0.016, 0.004), steel, 0, 0.082, -0.16 + i * 0.05)
    piece(w, box(0.058, 0.07, 0.3, 0.025), polymer, 0, 0, -0.36)          // guardamanos
    for (let i = 0; i < 4; i++) {                                          // ranuras de ventilación
      piece(w, box(0.062, 0.016, 0.05, 0.005), black, 0, 0.01, -0.28 - i * 0.06)
    }
    piece(w, tube(0.017, 0.019, 0.34, 8), canonMat, 0, 0.005, -0.66, Math.PI / 2)  // cañón
    piece(w, tube(0.028, 0.028, 0.07, 8), canonMat, 0, 0.005, -0.83, Math.PI / 2)  // apagallamas
    piece(w, box(0.05, 0.28, 0.09, 0.02), black, 0, -0.19, -0.09, 0.22)   // cargador curvo
    piece(w, box(0.052, 0.06, 0.085, 0.02), steel, 0, -0.06, -0.09)       // pozo
    piece(w, box(0.045, 0.06, 0.05, 0.015), black, 0, 0.08, 0.12)         // alza plegable
    piece(w, cap(0.012, 0.045, 3, 6), steel, 0.045, 0.05, 0.14, 0, 0, Math.PI / 2)  // manija
    grip(0.13, 0.4)
    piece(w, box(0.05, 0.075, 0.22, 0.025), polymer, 0, 0.005, 0.28)      // tubo de culata
    piece(w, box(0.062, 0.13, 0.12, 0.03), polymer, 0, -0.01, 0.36)       // culata regulable
    piece(w, box(0.07, 0.09, 0.035, 0.015), sling, 0, -0.01, 0.44)
  }

  const g = bake(w)
  g.userData.muzzleZ = { sniper: -1.1, shotgun: -0.7, archer: -0.7, gunner: -1.02, flamer: -0.72, mortar: -0.4 }[key] ?? -0.88
  // La malla del cañón, para poder calentarla. `bake` clona el material al
  // activarle el color por vértice, así que se busca por el original.
  g.userData.canon = g.children.find(c => c.userData.baseMats.has(canonMat)) ?? null

  // Puerto de expulsión: por aquí salen los casquillos. Antes salían por la boca
  // del cañón, que es por donde sale la bala, no la vaina.
  const puerto = new THREE.Object3D()
  puerto.position.set(0.05, 0.03, -0.02)
  g.add(puerto)
  g.userData.puerto = puerto
  return g
}

// ---------------------------------------------------------------------------
// soldados
//
// Proporciones humanas: unas cinco cabezas de alto, hombros marcados, cintura
// más estrecha que el pecho y piernas largas. La versión anterior era una
// cápsula con una bola encima — tres cabezas y media, es decir, un muñeco.
// ---------------------------------------------------------------------------
const TORSO_PROFILE = [
  [0.001, 0.00], [0.155, 0.015], [0.175, 0.06], [0.165, 0.14],
  [0.145, 0.22], [0.155, 0.31], [0.185, 0.40], [0.205, 0.48],
  [0.20, 0.55], [0.16, 0.615], [0.10, 0.655], [0.001, 0.665]
]

function placeholderSoldier (key, spec) {
  const g = new THREE.Group()
  // El cuerpo va dentro de un grupo ladeado. Un tirador no se planta de frente:
  // se pone de perfil. Y de paso resuelve un problema de cámara — mirando desde
  // atrás, un soldado cuadrado al frente esconde el arma detrás del torso, y el
  // arma es justo lo que se quiere ver.
  const figure = new THREE.Group()
  g.add(figure)
  const statics = new THREE.Group()

  // El color de la unidad NO viste al soldado entero.
  //
  // Antes sí: el chaleco era ese color oscurecido, el pantalón era su acento
  // —que es el mismo tono aún más oscuro— y las mangas otra vez el color. Desde
  // la cámara, un escopetero era un tubo naranja de los hombros a las botas. Lo
  // que hace que un uniforme parezca un uniforme no es el color: es que las
  // prendas se distingan unas de otras.
  //
  // Así que la identidad se queda donde de verdad manda —torso, hombreras y
  // disco del casco, que es lo que ocupa más píxeles desde 25° de picado— y el
  // resto se viste de faena, igual para todos. Los siete se siguen
  // distinguiendo de un vistazo, y ahora además parecen vestidos.
  const cloth = mat(spec.color, 0.78)
  const clothDark = mat(shade(spec.color, 0.7), 0.78)
  // Ropa de campaña: caqui sucio, común a toda la tropa.
  const faena = mat(0x7b7460, 0.86)
  const faenaOsc = mat(0x585341, 0.88)
  const trousers = faena
  const gear = mat(0x6a6250, 0.62, 0.10)
  const gearDark = mat(0x444034, 0.68)
  const webbing = mat(0x514a3a, 0.95)
  const skin = mat(jitterColor(0xc98d63, 0.12), 0.78)
  const steel = mat(0x24272c, 0.32, 0.7)
  const glove = mat(0x231f1a, 0.85)

  // El arquero no es un soldado moderno pintado de verde: es de otra época y
  // tiene que vestir de otra época. Todo su equipo se construye aparte.
  const ancient = key === 'archer'
  const heavy = key === 'shotgun' || key === 'gunner' || key === 'flamer'
  const lean = key === 'sniper' || ancient
  const HIP = 0.88
  const SHOULDER = 1.49
  const shoulderX = heavy ? 0.27 : lean ? 0.225 : 0.245
  // Ancho del yugo. Va aparte de `shoulderX`, que es el pivote de los brazos y
  // no se toca: esto es solo volumen de hombros.
  const SH = heavy ? 0.29 : lean ? 0.245 : 0.27

  const leather = mat(0x5e3d24, 0.88)
  const leatherDark = mat(0x3a2515, 0.9)
  const bronze = mat(0xb8873a, 0.48, 0.95)
  // Lino claro y frío: si la túnica cae en la gama de la piel, la figura entera
  // se lee como un bloque de un solo color.
  const linen = mat(0xe6dfca, 0.96)

  // --- torso ------------------------------------------------------------------
  const torso = piece(statics, lathe('torso', TORSO_PROFILE, 18), ancient ? linen : cloth, 0, 0.86, 0)
  torso.scale.set(heavy ? 1.15 : lean ? 0.94 : 1, 1, heavy ? 0.95 : 0.85)

  if (ancient) {
    // Túnica corta ceñida, coraza de tiras de cuero y faldellín. Nada de kevlar.
    const tunic = piece(statics, lathe('tunic', [
      [0.001, 0.0], [0.19, 0.02], [0.235, 0.12], [0.245, 0.24], [0.2, 0.36], [0.16, 0.44], [0.001, 0.46]
    ], 16), linen, 0, 0.78, 0)
    tunic.scale.z = 0.88
    for (let i = 0; i < 4; i++) {                                  // lorica de tiras
      piece(statics, box(0.34, 0.055, 0.24, 0.02), leather, 0, 1.09 + i * 0.075, 0)
    }
    piece(statics, box(0.1, 0.34, 0.22, 0.03), leatherDark, 0, 1.2, 0, 0, 0, 0.5)   // correa cruzada
    piece(statics, tube(0.185, 0.185, 0.075, 16), leather, 0, 0.96, 0)              // cinturón ancho
    piece(statics, box(0.09, 0.08, 0.03, 0.01), bronze, 0, 0.96, -0.19)             // hebilla
    for (let i = 0; i < 7; i++) {                                                    // cíngulo colgante
      const x = -0.12 + i * 0.04
      piece(statics, box(0.03, 0.2, 0.02, 0.008), leatherDark, x, 0.85, -0.185)
      piece(statics, ball(0.018, 6, 5), bronze, x, 0.74, -0.185)
    }
    // Manto sujeto al hombro con un broche.
    const cloak = piece(statics, lathe('cloak', [
      [0.001, 0.0], [0.16, 0.03], [0.24, 0.2], [0.26, 0.42], [0.2, 0.56], [0.001, 0.6]
    ], 12), mat(0xa8322a, 0.94), 0, 0.82, 0.13)
    cloak.scale.set(1.05, 1, 0.5)
    piece(statics, ball(0.045, 8, 6), bronze, -0.2, 1.4, 0.05)                      // broche
    piece(statics, tube(0.075, 0.09, 0.3, 10), leatherDark, 0.2, 1.05, 0.16, 0.25)  // carcaj a la espalda
    for (let i = 0; i < 4; i++) {
      piece(statics, tube(0.011, 0.011, 0.26, 4), mat(0x6a4a2c, 0.85), 0.19 + (i % 2) * 0.035, 1.28, 0.13 + (i % 2) * 0.03, 0.25)
      piece(statics, box(0.02, 0.07, 0.05, 0.008), mat(0xb8563f, 0.9), 0.19 + (i % 2) * 0.035, 1.4, 0.14)
    }
    // Hombros dentro del fundido, con la tela de la manga: dos llamadas menos.
    for (const side of [-1, 1]) piece(statics, ball(0.085, 12, 10), linen, side * shoulderX, SHOULDER, 0)
  } else {
    // chaleco portaplacas con placa frontal y trasera
    piece(statics, box(0.38, 0.42, 0.24, 0.05), clothDark, 0, 1.24, 0)
    piece(statics, box(0.31, 0.3, 0.03, 0.01), gearDark, 0, 1.26, -0.13)
    piece(statics, box(0.33, 0.32, 0.03, 0.01), gearDark, 0, 1.26, 0.12)
    for (const side of [-1, 1]) {
      piece(statics, box(0.075, 0.26, 0.20, 0.03), webbing, side * (SH - 0.03), 1.30, 0, 0, 0, side * 0.1)  // hombreras
      piece(statics, box(0.09, 0.11, 0.07, 0.02), gear, side * 0.11, 1.14, -0.14)                  // cargadores
    }

    // Yugo de hombros. Los deltoides eran dos bolas colgadas de `figure` DESPUÉS
    // del fundido, o sea dos llamadas de dibujo sueltas por soldado. Aquí van
    // dentro, y de paso ensanchan la parte alta: desde 25° de picado el trapecio
    // se ve casi de plano y es lo que más define la silueta.
    piece(statics, box(SH * 2 + 0.06, 0.15, 0.27, 0.07), clothDark, 0, 1.455, 0.01)
    for (const side of [-1, 1]) {
      piece(statics, cap(0.088, 0.10, 5, 10), cloth, side * SH, 1.45, 0, 0, 0, Math.PI / 2)
      piece(statics, box(0.15, 0.10, 0.26, 0.05), webbing, side * (SH - 0.01), 1.50, 0.01, 0, 0, side * 0.24)
    }
    piece(statics, box(0.1, 0.1, 0.06, 0.02), gear, 0, 1.14, -0.14)
    // Cuello alto: entre el casco y el chaleco asomaba la piel desnuda, y desde
    // atrás era una mancha clara justo en el centro de la figura.
    piece(statics, tube(0.072, 0.078, 0.13, 10), faenaOsc, 0, 1.52, 0.01)
    // Botiquín colgado del costado de la mochila: en el pecho no lo veía nadie.
    piece(statics, box(0.07, 0.09, 0.05, 0.02), mat(0x6b2b22, 0.7), -0.185, 1.14, 0.235)

    if (key === 'gunner') {
      // Cinta de munición cruzando el hombro IZQUIERDO, por la espalda. Estaba
      // en el pecho con un comentario que decía "se le reconoce de espaldas":
      // la cámara mira desde atrás, así que era presupuesto gastado en la cara.
      for (let i = 0; i < 7; i++) {
        piece(statics, box(0.05, 0.035, 0.035, 0.008), mat(0xc9a63c, 0.4, 0.7),
          -0.19 + i * 0.031, 1.44 - i * 0.028, 0.135)
      }
    }
    if (key === 'flamer') {
      // Delantal ignífugo (ya fundido, no cuesta) y la esclavina sobre los
      // hombros, que es la parte que sí se ve: capa clara sobre rojo profundo.
      piece(statics, box(0.36, 0.44, 0.05, 0.02), mat(0x8a7a5c, 0.95), 0, 1.06, -0.15)
      piece(statics, box(0.46, 0.26, 0.05, 0.03), mat(0x8a7a5c, 0.95), 0, 1.36, 0.15, -0.35)
      piece(statics, box(0.46, 0.04, 0.05, 0.015), leatherDark, 0, 1.22, 0.19)
    }

    // cinturón, cartucheras y pistolera
    piece(statics, tube(0.175, 0.175, 0.07, 16), webbing, 0, 0.96, 0)
    for (const [x, z] of [[-0.13, -0.1], [0.13, -0.1], [-0.15, 0.08], [0.15, 0.07]]) {
      piece(statics, box(0.09, 0.11, 0.07, 0.02), gear, x, 0.93, z)
    }
    piece(statics, box(0.08, 0.16, 0.06, 0.02), gearDark, 0.17, 0.82, 0.02)   // pistolera en el muslo
    piece(statics, box(0.055, 0.06, 0.03, 0.01), webbing, 0.17, 0.7, 0.02)

    // --- la mochila, que es donde de verdad hay que gastar la identidad ------
    // Desde 25° de picado la espalda ocupa más píxeles que la cara, el arma y
    // las piernas juntas, y hasta ahora era idéntica en seis de los siete tipos.
    if (key !== 'flamer') {
      piece(statics, box(0.30, 0.30, 0.15, 0.05), gear, 0, 1.24, 0.20)
      piece(statics, box(0.26, 0.05, 0.04, 0.015), gearDark, 0, 1.32, 0.28)
      piece(statics, box(0.26, 0.05, 0.04, 0.015), gearDark, 0, 1.16, 0.28)
    }
    // Asa de arrastre: asoma por encima del techo de la mochila, así que se ve.
    piece(statics, box(0.14, 0.045, 0.09, 0.022), gearDark, 0, 1.455, 0.115, -0.5)

    if (key === 'rifle') {
      piece(statics, cap(0.055, 0.24, 5, 10), clothDark, 0, 1.42, 0.22, 0, 0, Math.PI / 2)
      piece(statics, box(0.09, 0.15, 0.05, 0.02), gearDark, 0.09, 1.34, 0.28)          // radio
      piece(statics, cap(0.008, 0.34, 3, 6), steel, 0.09, 1.62, 0.27, 0.2)             // antena: silueta pura
    } else if (key === 'shotgun') {
      // Perfil rechoncho con la rueda de cartuchos roja.
      piece(statics, box(0.40, 0.20, 0.17, 0.05), gear, 0, 1.12, 0.21)
      piece(statics, tube(0.13, 0.13, 0.10, 12), gearDark, 0, 1.34, 0.24, Math.PI / 2)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        piece(statics, tube(0.03, 0.03, 0.06, 6), mat(0x9c2f24, 0.5),
          Math.cos(a) * 0.085, 1.34 + Math.sin(a) * 0.085, 0.26, Math.PI / 2)
      }
    } else if (key === 'sniper') {
      piece(statics, cap(0.055, 0.52, 4, 8), clothDark, 0, 1.26, 0.25, 0, 0, 0.95)     // manta enrollada
      piece(statics, box(0.09, 0.09, 0.62, 0.03), gearDark, -0.02, 1.20, 0.27, 0.35)   // funda del rifle
      for (let i = 0; i < 6; i++) {
        adorno(statics, box(0.035, 0.17, 0.02, 0.008), mat(shade(spec.accent, 1.2), 0.97),
          -0.11 + i * 0.044, 1.05, 0.28, 0.2)                                          // tiras de camuflaje
      }
    } else if (key === 'gunner') {
      for (const [x, y] of [[-0.05, 1.14], [0.11, 1.30]]) {
        piece(statics, box(0.17, 0.13, 0.13, 0.02), gearDark, x, y, 0.23)
        piece(statics, box(0.175, 0.03, 0.135, 0.01), mat(0xc9a63c, 0.4, 0.7), x, y, 0.235)
      }
    } else if (key === 'mortar') {
      // Tres bombas de pie: el único tipo que se reconoce por el contorno de
      // arriba, porque rompen la línea de hombros.
      for (const x of [-0.09, 0, 0.09]) {
        piece(statics, cap(0.05, 0.13, 5, 8), mat(0x3a3f45, 0.5, 0.4), x, 1.44, 0.24)
        piece(statics, tube(0.05, 0.012, 0.07, 6), mat(0x3a3f45, 0.5, 0.4), x, 1.30, 0.24)
      }
    } else if (key === 'flamer') {
      // Los depósitos SON su mochila. Antes colgaban del grupo del arma, que se
      // hunde y se vuelca en reposo: el objeto más grande del modelo flotaba
      // detrás de la espalda y se bamboleaba.
      const tank = mat(0xb8452f, 0.45, 0.30)
      const tankDark = mat(0x8a3423, 0.5, 0.3)
      for (const side of [-1, 1]) {
        piece(statics, tube(0.085, 0.085, 0.40, 12), tank, side * 0.105, 1.22, 0.25)
        piece(statics, ball(0.085, 10, 8), tank, side * 0.105, 1.42, 0.25)
        piece(statics, ball(0.085, 10, 8), tankDark, side * 0.105, 1.02, 0.25)
      }
      piece(statics, box(0.32, 0.05, 0.05, 0.015), gearDark, 0, 1.34, 0.31)            // fleje
      // La manguera sale del hombro y se queda ahí: si intentara alcanzar el
      // arma, que se hunde 28 cm al bajarla, se leería fatal.
      for (let i = 0; i < 4; i++) {
        const t = i / 3
        piece(statics, cap(0.018, 0.09, 3, 6), mat(0x141619, 0.3, 0.6),
          0.105 - t * 0.03, 1.46 - t * 0.02, 0.24 - t * 0.16, -0.9 + t * 0.6)
      }
    }
  }

  // --- cabeza -----------------------------------------------------------------
  const headParts = new THREE.Group()
  piece(headParts, lathe('skull', [
    [0.001, -0.16], [0.075, -0.155], [0.115, -0.1], [0.14, -0.02],
    [0.15, 0.06], [0.135, 0.12], [0.09, 0.16], [0.001, 0.17]
  ], 16), skin, 0, 0, 0).scale.set(1.15, 1.25, 1.25)
  piece(headParts, box(0.115, 0.075, 0.09, 0.03), skin, 0, -0.11, -0.09)   // mandíbula
  piece(headParts, ball(0.028, 8, 6), skin, 0, -0.045, -0.185)             // nariz
  for (const side of [-1, 1]) piece(headParts, ball(0.032, 8, 6), skin, side * 0.16, -0.03, 0.01)
  piece(headParts, cap(0.06, 0.06, 6, 10), skin, 0, -0.21, 0.01)           // cuello

  // --- que no sean clones ------------------------------------------------------
  // Con el tablero lleno hay hasta veinte figuras a la vez, y de un mismo tipo
  // salían todas idénticas: una fila de fusileros se leía como una fila de
  // copias. Estos añadidos se sortean por soldado y se funden en la cabeza, así
  // que no cuestan ni una llamada de dibujo más.
  const sorteo = Math.random()

  if (ancient) {
    // Casco de bronce con cimera roja, carrilleras y cubrenuca. Barba incluida:
    // es lo que separa a un civil armado de un soldado con casco.
    piece(headParts, lathe('galea', [
      [0.001, 0.23], [0.09, 0.215], [0.16, 0.13], [0.195, 0.01], [0.2, -0.08], [0.001, -0.085]
    ], 16), bronze, 0, 0.02, 0)
    piece(headParts, box(0.24, 0.06, 0.16, 0.02), bronze, 0, -0.04, 0.15)          // cubrenuca
    for (const side of [-1, 1]) {                                                   // carrilleras
      piece(headParts, box(0.05, 0.16, 0.11, 0.03), bronze, side * 0.18, -0.09, -0.02, 0, 0, side * 0.12)
    }
    for (let i = 0; i < 7; i++) {                                                   // cimera
      piece(headParts, box(0.04, 0.055 + Math.sin(i / 6 * Math.PI) * 0.045, 0.055, 0.012),
        mat(0xa8322a, 0.95), 0, 0.245, -0.13 + i * 0.042)
    }
    piece(headParts, box(0.13, 0.09, 0.07, 0.03), mat(0x4a3524, 0.95), 0, -0.13, -0.13)  // barba
  } else if (lean) {
    piece(headParts, lathe('hood', [
      [0.001, 0.245], [0.15, 0.2], [0.22, 0.06], [0.235, -0.07], [0.22, -0.19], [0.16, -0.235], [0.001, -0.245]
    ], 14), clothDark, 0, 0.02, 0.01)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      // Una de cada cuatro tiras trepa a la coronilla: rompe la cúpula lisa, que
      // es la superficie que la cámara ve más de plano. Cero piezas nuevas.
      const alto = i % 4 === 0
      adorno(headParts, box(0.035, 0.19, 0.025, 0.01), mat(shade(spec.accent, 1.2), 0.97),
        Math.cos(a) * 0.18, alto ? 0.14 : -0.2 - (i % 3) * 0.05, Math.sin(a) * 0.18, 0.24, a, 0)
    }
  } else if (heavy) {
    piece(headParts, lathe('helmF', [
      [0.001, 0.235], [0.115, 0.215], [0.185, 0.11], [0.215, -0.02], [0.215, -0.14], [0.175, -0.19], [0.001, -0.195]
    ], 16), mat(0x3c4038, 0.30, 0.20), 0, 0.02, 0)
    piece(headParts, box(0.24, 0.1, 0.06, 0.02), mat(0x14181e, 0.12, 0.75), 0, -0.02, -0.15)   // visor
    // La placa superior ya era una marca de coronilla, pero estaba apagada al
    // 52%: a pleno color, sobre un casco oscuro, identifica la unidad desde arriba.
    piece(headParts, box(0.28, 0.05, 0.19, 0.02), mat(spec.color, 0.4, 0.3), 0, 0.155, 0.01)
    piece(headParts, box(0.06, 0.05, 0.05, 0.015), gearDark, 0.17, 0.02, -0.06)               // linterna
  } else {
    // Casco apagado y disco de tipo encima: lo que se ve de plano lleva el color.
    piece(headParts, lathe('helm', [
      [0.001, 0.23], [0.105, 0.21], [0.175, 0.12], [0.205, 0.0], [0.215, -0.06], [0.001, -0.065]
    ], 16), mat(0x4b4f42, 0.34, 0.16), 0, 0.02, 0)

    // Funda de tela sobre el casco, a uno de cada tres. Cambia la silueta de la
    // coronilla, que es lo que la cámara ve más de plano.
    if (sorteo < 0.34) {
      piece(headParts, lathe('funda', [
        [0.001, 0.245], [0.112, 0.222], [0.184, 0.126], [0.216, 0.0], [0.226, -0.07], [0.001, -0.075]
      ], 14), faenaOsc, 0, 0.02, 0)
      for (let i = 0; i < 5; i++) {                                        // jirones de camuflaje
        const a = (i / 5) * Math.PI * 2 + 0.4
        adorno(headParts, box(0.03, 0.1, 0.02, 0.008), faena,
          Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.17, 0.3, a, 0)
      }
    }
    piece(headParts, tube(0.115, 0.125, 0.014, 12), cloth, 0, 0.212, 0.015)       // disco de tipo
    piece(headParts, box(0.22, 0.10, 0.07, 0.025), gearDark, 0, -0.075, 0.145)    // cubrenuca
    piece(headParts, box(0.17, 0.03, 0.05, 0.012), gearDark, 0, 0.105, 0.115)     // cinta trasera
    piece(headParts, box(0.16, 0.03, 0.05, 0.01), gearDark, 0, -0.03, -0.16)      // cinta del casco
    // `cloth` en vez de `clothDark` a propósito: así el disco no añade un
    // material nuevo al fundido de la cabeza y sale gratis en llamadas de dibujo.
    piece(headParts, box(0.06, 0.07, 0.04, 0.015), cloth, 0.15, 0.05, 0.08)       // parche lateral
    piece(headParts, box(0.055, 0.05, 0.04, 0.01), steel, 0, 0.09, -0.14)         // soporte de gafas
    piece(headParts, box(0.2, 0.05, 0.05, 0.015), mat(0x14181e, 0.2, 0.6), 0, -0.02, -0.145)
    piece(headParts, box(0.04, 0.05, 0.05, 0.015), gearDark, -0.14, -0.06, 0.02)  // auricular
  }

  // Pañuelo tapando la boca: a poco más de un tercio de la tropa, y a ninguno de
  // época. Es el detalle que más cambia la cara desde cerca por menos piezas.
  if (!ancient && sorteo > 0.55) {
    piece(headParts, lathe('pañuelo', [
      [0.001, 0.02], [0.14, -0.02], [0.17, -0.09], [0.15, -0.17], [0.001, -0.2]
    ], 12), sorteo > 0.8 ? faenaOsc : mat(shade(spec.accent, 1.25), 0.95), 0, -0.02, 0.01)
  }
  // Gafas subidas a la frente, a otro tercio. Nunca junto con la funda del casco:
  // dos añadidos a la vez en una cabeza de veinte píxeles se convierten en una masa.
  if (!ancient && sorteo > 0.34 && sorteo < 0.55) {
    piece(headParts, tube(0.16, 0.165, 0.05, 12), gearDark, 0, 0.115, 0, Math.PI / 2)
    piece(headParts, box(0.17, 0.06, 0.03, 0.01), mat(0x2a3a44, 0.15, 0.5), 0, 0.125, -0.15)
  }

  const head = bake(headParts)
  head.position.set(0, 1.66, 0)
  figure.add(head)

  const body = bake(statics)
  figure.add(body)

  // --- extremidades -----------------------------------------------------------
  // Postura de tirador: cuerpo ligeramente ladeado, pierna de apoyo atrás,
  // brazo de disparo cerrado sobre la empuñadura y brazo de apoyo cruzado bajo
  // el guardamanos. Los dos brazos hacen cosas distintas, como en la realidad.
  const limbs = {}
  const jit = () => (Math.random() - 0.5) * 0.1
  // Ojo con el signo: girar en +X lleva el miembro hacia delante. El codo se
  // cierra hacia delante (positivo) y la rodilla hacia atrás (negativo). Con el
  // codo en negativo, las manos acababan a la espalda y el arma sin sujetar.
  const armPose = { armL: 0.46 + jit(), armR: 0.3 + jit() }
  const armBend = { armL: 1.26, armR: 1.58 }
  const armRoll = { armL: 0.34, armR: -0.26 }
  const legPose = { legL: 0.26 + jit(), legR: -0.2 + jit() }
  const legBend = { legL: -0.3, legR: -0.16 }

  // El de época va con los brazos y las piernas al aire: mangas cortas, brazal
  // de cuero en el antebrazo y sandalias con tiras en vez de botas.
  const armMat = ancient ? skin : faena
  const legMat = ancient ? skin : trousers

  for (const [name, side] of [['armL', -1], ['armR', 1]]) {
    const arm = limb({
      length: 0.62, thickness: 0.062, material: armMat, lowerMat: armMat,
      bend: armBend[name],   // sin material propio de articulación: una malla menos por tramo
      end: box(0.075, 0.09, 0.1, 0.03), endMat: ancient ? leather : glove, endOffset: -0.03,
      // Todo esto se funde dentro del tramo en vez de colgarse suelto después.
      extraUpper: ancient
        ? up => piece(up, tube(0.09, 0.1, 0.13, 10), linen, 0, -0.09, 0)
        : up => {
            // Brazalete estrecho, no una hombrera: el deltoides que cuelga del
            // yugo YA va del color de la unidad, y al añadir aquí un anillo
            // ancho los dos se sumaban y el hombro quedaba como un flotador.
            piece(up, tube(0.072, 0.076, 0.055, 10), cloth, 0, -0.17, 0)
            piece(up, box(0.1, 0.09, 0.11, 0.03), faenaOsc, 0, -0.29, 0)
          },
      extraLower: ancient
        ? lo => piece(lo, tube(0.075, 0.075, 0.12, 10), leather, 0, -0.19, 0)
        : lo => piece(lo, tube(0.07, 0.072, 0.07, 8), faenaOsc, 0, -0.31, 0)   // puño
    })
    arm.position.set(side * shoulderX, SHOULDER, 0)
    arm.rotation.set(armPose[name], 0, armRoll[name])
    figure.add(arm)
    limbs[name] = arm
  }
  for (const [name, side] of [['legL', -1], ['legR', 1]]) {
    const boot = mat(0x201c17, 0.85)
    const leg = limb({
      length: 0.9, thickness: 0.085, material: legMat, lowerMat: legMat,
      bend: legBend[name],
      extraUpper: ancient ? null : up => {
        // Bolsillo de muslo: el pantalón de faena tiene uno enorme y es lo que
        // más lo separa de una pernera lisa.
        piece(up, box(0.075, 0.15, 0.11, 0.03), faenaOsc, side * 0.075, -0.2, -0.01)
        piece(up, box(0.075, 0.03, 0.11, 0.012), webbing, side * 0.075, -0.13, -0.01)
      },
      end: box(0.11, 0.075, 0.26, 0.03), endMat: ancient ? leatherDark : boot, endOffset: -0.06,
      extraLower: ancient
        ? lo => {
            for (let i = 0; i < 3; i++) {                                        // tiras de la sandalia
              piece(lo, tube(0.088, 0.088, 0.022, 8), leatherDark, 0, -0.38 + i * 0.07, 0)
            }
          }
        : lo => {
            piece(lo, box(0.11, 0.1, 0.06, 0.03), gearDark, 0, -0.02, -0.06)     // rodillera
            // Polaina sobre la caña: parte la pierna en tres tramos y es lo que
            // impide que se lea como un tubo de un solo color.
            piece(lo, tube(0.09, 0.094, 0.13, 10), faenaOsc, 0, -0.25, 0)
            // La caña es lo único que evita que el tobillo se lea como un
            // ladrillo; el resto del detalle de la bota mide cuatro píxeles.
            piece(lo, cap(0.078, 0.09, 5, 10), boot, 0, -0.34, 0)
            piece(lo, box(0.115, 0.05, 0.28, 0.02), boot, 0, -0.478, -0.055)     // suela con vuelo
          }
    })
    leg.position.set(side * 0.115, HIP, 0)
    leg.rotation.x = legPose[name]
    figure.add(leg)
    limbs[name] = leg
  }


  // --- arma en las manos ------------------------------------------------------
  const weapon = new THREE.Group()
  const built = buildWeapon(key)
  weapon.add(built)
  // El arma queda fuera del grupo ladeado: el cuerpo va de perfil pero el cañón
  // sigue apuntando recto por el carril, que es hacia donde dispara.
  const weaponRest = new THREE.Vector3(0.2, 1.26, -0.42)
  weapon.position.copy(weaponRest)
  weapon.rotation.set(0.05, 0, 0)
  g.add(weapon)

  const flash = montarFogonazo(built)
  weapon.add(flash)

  g.add(contactShadow(heavy ? 0.95 : 0.85))
  g.userData.limbs = limbs
  g.userData.head = head
  g.userData.weapon = weapon
  g.userData.flash = flash
  // El cañón que se pone al rojo y el puerto por donde salta la vaina. Se
  // guardan resueltos: buscarlos en cada disparo sería recorrer el arma entera.
  g.userData.canon = built.userData.canon
  g.userData.puerto = built.userData.puerto
  // Empieza negro, así que `marcarBrillo` no lo ve venir: hay que apuntarlo a
  // mano para que el rojo del acero resplandezca cuando llegue.
  if (built.userData.canon) brilla(built.userData.canon)
  g.userData.rest = { arm: armPose, leg: legPose, armBend, legBend, armRoll, weaponRest, headY: 1.66 }
  g.userData.build = 0.96 + Math.random() * 0.1
  g.scale.set(1, g.userData.build, 1)

  // Postura de perfil, con la cabeza girada de vuelta hacia el objetivo.
  // Ladeo hacia el otro lado: así la mano de disparo va atrás y afuera y la de
  // apoyo delante, que es como se sujeta un fusil — y deja el arma a la vista.
  g.userData.figure = figure
  g.userData.stance = -0.46 + (Math.random() - 0.5) * 0.12
  figure.rotation.y = g.userData.stance
  g.userData.headYaw = -g.userData.stance * 0.75 + (Math.random() - 0.5) * 0.14
  head.rotation.y = g.userData.headYaw
  return g
}

// ---------------------------------------------------------------------------
// zombis: mismo esqueleto humano, pero demacrado, torcido y roto. Cada ejemplar
// se genera con sus propias heridas, su tono de piel y sus taras.
// ---------------------------------------------------------------------------
const RIB_PROFILE = [
  [0.001, 0.00], [0.14, 0.02], [0.155, 0.09], [0.135, 0.17],
  [0.11, 0.25], [0.135, 0.34], [0.165, 0.43], [0.17, 0.51],
  [0.15, 0.575], [0.1, 0.62], [0.001, 0.635]
]

function placeholderZombie (spec) {
  const g = new THREE.Group()
  const statics = new THREE.Group()
  const rnd = Math.random

  const skinHex = jitterColor(spec.color, 0.16)
  const flesh = mat(skinHex, 0.88)
  const fleshDark = mat(shade(skinHex, 0.78), 0.9)
  const rot = mat(jitterColor(spec.accent, 0.14), 0.92)
  const rags = mat(shade(spec.accent, 0.48), 0.99)
  const ragsAlt = mat(shade(spec.accent, 0.62), 0.99)
  const bone = mat(0xd9cdb0, 0.62)
  const gore = mat(0x6b1a14, 0.45)
  const dark = mat(0x120c07, 0.4)

  // Por escala, no por nombre: comparar contra el nombre se rompe en cuanto se
  // renombra una unidad, y eso ya pasó al cambiar "Tanque" por "Coloso".
  const bulky = spec.boss || (spec.scale ?? 1) >= 1.5
  const HIP = 0.84
  const SHOULDER = 1.42
  const shoulderX = bulky ? 0.28 : 0.2

  // Tronco colgando de un pivote inclinado: la joroba es la firma de la silueta.
  const lean = new THREE.Group()
  lean.rotation.x = -0.3 - rnd() * 0.14
  lean.rotation.z = (rnd() - 0.5) * 0.1
  lean.position.y = HIP
  g.add(lean)
  const trunk = new THREE.Group()

  const torso = piece(trunk, lathe('ribcage', RIB_PROFILE, 16), flesh, 0, 0, 0)
  torso.scale.set(bulky ? 1.5 : 1, 1, bulky ? 1.35 : 0.86)

  if (bulky) {
    piece(trunk, ball(0.26, 14, 12), flesh, 0, 0.24, -0.16).scale.set(1.3, 1, 1)   // barrigón
    for (let i = 0; i < 4; i++) {
      piece(trunk, box(0.52, 0.07, 0.34, 0.03), mat(0xcfc7b4, 0.8), 0, 0.14 + i * 0.08, -0.06, 0, 0, (rnd() - 0.5) * 0.2)
    }
  }

  // camisa reventada: cuello, media manga y jirones sueltos por el bajo
  piece(trunk, lathe('shirt', [
    [0.001, 0.3], [0.15, 0.31], [0.175, 0.42], [0.185, 0.5], [0.16, 0.57], [0.1, 0.61], [0.001, 0.62]
  ], 14), rags, 0, 0, 0).scale.set(bulky ? 1.5 : 1.06, 1, bulky ? 1.35 : 0.92)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = (bulky ? 0.26 : 0.17)
    adorno(trunk, box(0.06, 0.14 + rnd() * 0.12, 0.02, 0.008), i % 2 ? rags : ragsAlt,
      Math.cos(a) * r, 0.24 - rnd() * 0.1, Math.sin(a) * r * 0.9, rnd() * 0.4, a, (rnd() - 0.5) * 0.5)
  }

  // costillar y clavículas al aire por el costado abierto
  for (let i = 0; i < 4; i++) {
    adorno(trunk, cap(0.019, 0.2, 3, 8), bone, 0.05, 0.3 + i * 0.075, -0.12, 0, 0, Math.PI / 2 + 0.14)
  }
  piece(trunk, ball(0.09, 10, 8), gore, -0.1, 0.36, -0.14).scale.set(1, 1.3, 0.6)   // herida abierta
  for (const side of [-1, 1]) {
    piece(trunk, cap(0.016, 0.13, 3, 6), bone, side * 0.09, 0.55, -0.09, 0, 0, Math.PI / 2 + side * 0.35)
  }
  // vértebras marcadas en la espalda
  for (let i = 0; i < 6; i++) adorno(trunk, ball(0.026, 8, 6), fleshDark, 0, 0.24 + i * 0.065, 0.13)

  // --- lo que no es humano ----------------------------------------------------
  // Cristales de espora saliendo de la espalda y el hombro. Son lo primero que
  // se ve de lejos y lo que dice, sin texto, que esto no es un cadáver normal.
  const spore = glow(0x7dff9e, 1.7)
  const sporeDim = glow(0x39d17a, 0.9)
  const crests = bulky ? 7 : 4
  for (let i = 0; i < crests; i++) {
    const t = i / crests
    const h = 0.1 + rnd() * (bulky ? 0.26 : 0.16)
    piece(trunk, tube(0.001, 0.035 + rnd() * 0.02, h, 5), i % 2 ? spore : sporeDim,
      (rnd() - 0.5) * 0.14, 0.26 + t * 0.34, 0.12 + rnd() * 0.05,
      -0.5 - rnd() * 0.5, rnd() * 3, (rnd() - 0.5) * 0.6)
  }
  for (const side of [-1, 1]) {
    piece(trunk, tube(0.001, 0.03, 0.16 + rnd() * 0.1, 5), spore,
      side * 0.16, 0.5, 0.02, -0.3, 0, side * 0.9)
  }

  // Venas de espora recorriendo el pecho: la cosa respirando bajo la piel.
  for (let i = 0; i < 5; i++) {
    adorno(trunk, cap(0.012, 0.07 + rnd() * 0.09, 3, 5), sporeDim,
      (rnd() - 0.5) * 0.24, 0.24 + rnd() * 0.3, -0.13, rnd() * 0.5, 0, (rnd() - 0.5) * 1.4)
  }

  // Tentáculos cortos colgando de las costillas abiertas.
  for (let i = 0; i < 3; i++) {
    const a = -0.5 + i * 0.5
    piece(trunk, cap(0.022, 0.14, 4, 7), fleshDark,
      Math.sin(a) * 0.13, 0.18 - i * 0.03, -0.16, 0.5 + rnd() * 0.4, 0, a)
    piece(trunk, ball(0.026, 8, 6), sporeDim, Math.sin(a) * 0.16, 0.05 - i * 0.03, -0.19)
  }

  // --- cabeza -----------------------------------------------------------------
  const headParts = new THREE.Group()
  piece(headParts, lathe('zskull', [
    [0.001, -0.17], [0.07, -0.16], [0.11, -0.1], [0.135, -0.01],
    [0.145, 0.07], [0.125, 0.13], [0.08, 0.165], [0.001, 0.175]
  ], 14), flesh, 0, 0, 0).scale.set(1.1, 1.2, 1.2)

  // Cuencas hundidas con el ojo encendido por dentro: la espora mira desde
  // detrás de la cara del huésped.
  for (const side of [-1, 1]) {
    piece(headParts, ball(0.055, 10, 8), dark, side * 0.075, -0.005, -0.115)
    piece(headParts, ball(0.032, 8, 6), glow(0xa8ff6e, 1.6), side * 0.078, -0.01, -0.14)
    piece(headParts, box(0.07, 0.022, 0.03, 0.008), fleshDark, side * 0.078, 0.05, -0.13, 0, 0, side * 0.3)  // ceja
    // Ojo secundario: el par de más es lo que rompe la cara humana.
    piece(headParts, ball(0.02, 8, 6), glow(0x7dff9e, 1.3), side * 0.115, -0.075, -0.115)
  }
  piece(headParts, ball(0.023, 8, 6), glow(0xa8ff6e, 1.5), 0, 0.075, -0.115)   // tercer ojo
  piece(headParts, ball(0.022, 8, 6), fleshDark, 0, -0.06, -0.16)          // nariz rota
  // mandíbula descolgada con dentadura
  const jaw = new THREE.Group()
  jaw.position.set(0, -0.11, -0.03)
  jaw.rotation.x = 0.5 + rnd() * 0.25
  headParts.add(jaw)
  piece(jaw, box(0.12, 0.06, 0.11, 0.025), fleshDark, 0, -0.03, -0.04)
  for (let i = 0; i < 5; i++) piece(jaw, box(0.016, 0.026, 0.014, 0.004), bone, -0.04 + i * 0.02, 0.005, -0.085)
  for (let i = 0; i < 5; i++) piece(headParts, box(0.016, 0.026, 0.014, 0.004), bone, -0.04 + i * 0.02, -0.095, -0.115)
  piece(headParts, cap(0.05, 0.05, 6, 10), flesh, 0, -0.22, 0.01)          // cuello
  piece(headParts, cap(0.013, 0.1, 3, 6), bone, 0.04, -0.21, 0.03, 0.3)    // vértebra asomando

  // pelo a mechones y un desgarro en el cuero cabelludo
  for (let i = 0; i < 7; i++) {
    piece(headParts, box(0.04, 0.09 + rnd() * 0.06, 0.03, 0.01), rot,
      (rnd() - 0.5) * 0.2, 0.13 + rnd() * 0.05, (rnd() - 0.5) * 0.22, rnd() * 0.6, 0, (rnd() - 0.5) * 0.9)
  }
  piece(headParts, ball(0.05, 8, 6), gore, 0.07, 0.09, 0.06).scale.set(1, 0.5, 1)

  // Mandíbulas laterales: la boca del huésped se abrió en dos para dejar salir
  // lo que hay dentro. Con esto ya no hay forma de confundirlo con un humano.
  for (const side of [-1, 1]) {
    piece(headParts, cap(0.022, 0.07, 4, 6), fleshDark, side * 0.11, -0.1, -0.11, 0.5, 0, side * 0.75)
    piece(headParts, cap(0.013, 0.05, 3, 5), bone, side * 0.145, -0.145, -0.13, 0.7, 0, side * 0.9)
  }
  // Espinas de espora coronando el cráneo.
  for (let i = 0; i < 3; i++) {
    piece(headParts, tube(0.001, 0.02, 0.09 + rnd() * 0.06, 5), glow(0x7dff9e, 1.5),
      (rnd() - 0.5) * 0.13, 0.19, 0.02 + (rnd() - 0.5) * 0.1, -0.35 - rnd() * 0.4, 0, (rnd() - 0.5) * 0.7)
  }

  if (spec.armor) {
    piece(trunk, box(0.44, 0.4, 0.3, 0.05), mat(0x59626d, 0.55, 0.6), 0, 0.4, -0.02)
    piece(trunk, box(0.5, 0.06, 0.32, 0.02), mat(0x3d454e, 0.55, 0.58), 0, 0.62, -0.02)
    for (const side of [-1, 1]) piece(trunk, box(0.13, 0.14, 0.2, 0.05), mat(0x4f5862, 0.55, 0.55), side * 0.24, 0.58, 0)
    piece(headParts, lathe('zhelm', [
      [0.001, 0.235], [0.105, 0.21], [0.17, 0.105], [0.2, -0.01], [0.2, -0.08], [0.001, -0.085]
    ], 14), mat(0x49525c, 0.55, 0.58), 0, 0.02, 0)
    piece(headParts, box(0.2, 0.05, 0.05, 0.015), mat(0x2b3138, 0.5, 0.7), 0, -0.01, -0.14)
  }

  if (spec.rangedAttack) {
    // buche y garganta hinchados: se ve venir el escupitajo
    piece(trunk, ball(0.19, 14, 10), mat(shade(skinHex, 1.35), 0.25), 0, 0.42, -0.16).scale.set(1.1, 0.85, 0.8)
    piece(headParts, ball(0.075, 10, 8), mat(shade(skinHex, 1.4), 0.25), 0, -0.19, -0.07)
    for (let i = 0; i < 5; i++) {
      piece(trunk, ball(0.04, 8, 6), mat(0xc8f04e, 0.15), (rnd() - 0.5) * 0.3, 0.34 + rnd() * 0.2, -0.28)
    }
  }

  // --- los cuatro con maneras -------------------------------------------------
  // Una mecánica que no se ve venir no es una mecánica, es una trampa. Cada uno
  // lleva encima la señal de lo que va a hacer, y a tamaño suficiente para
  // leerse desde el fondo de la carretera.

  // Saltador: piernas de saltamontes y un fuelle de espora en la espalda que es
  // de donde sale el impulso.
  if (spec.salta) {
    piece(trunk, ball(0.2, 12, 10), glow(0x7dffe4, 1.2), 0, 0.34, 0.16).scale.set(1.1, 0.9, 0.7)
    for (const side of [-1, 1]) {
      piece(trunk, cap(0.03, 0.3, 4, 6), sporeDim, side * 0.13, 0.2, 0.16, 0.6, 0, side * 0.2)
    }
  }

  // Revientaesporas: una bolsa enorme y tirante, con las venas a punto de
  // reventar. Si el jugador ve eso y aun así apiña la tropa, es cosa suya.
  if (spec.revienta) {
    const bolsa = piece(trunk, ball(0.34, 14, 12), mat(shade(skinHex, 1.25), 0.45), 0, 0.42, 0.06)
    bolsa.scale.set(1.15, 1.05, 1.2)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      piece(trunk, cap(0.02, 0.26, 3, 5), glow(0xffd24a, 1.4),
        Math.cos(a) * 0.3, 0.42 + Math.sin(a) * 0.24, 0.16, 0, 0, a + Math.PI / 2)
    }
    piece(trunk, ball(0.13, 10, 8), glow(0xffb03a, 1.9), 0, 0.42, 0.34)
  }

  // Injertadora: brazos de tentáculo que llegan a los de al lado, y un halo
  // verde que se ve desde lejos. Es la que hay que matar primero.
  if (spec.injerta) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      piece(trunk, cap(0.026, 0.44, 4, 7), glow(0x9dffb8, 1.5),
        Math.cos(a) * 0.2, 0.5 + rnd() * 0.1, Math.sin(a) * 0.16,
        -0.8 - rnd() * 0.4, a, (rnd() - 0.5) * 0.7)
      piece(trunk, ball(0.045, 8, 6), glow(0xd8ffe4, 2.2), Math.cos(a) * 0.34, 0.74, Math.sin(a) * 0.26)
    }
    piece(headParts, lathe('corona', [
      [0.001, 0.3], [0.13, 0.24], [0.19, 0.1], [0.19, 0.04], [0.001, 0.02]
    ], 12), glow(0xffa8d4, 1.1), 0, 0.06, 0)
  }

  // Escarbador: manos de pala y cabeza acorazada de topo. Se lee "esto excava"
  // antes de que excave nada.
  if (spec.escarba) {
    for (const side of [-1, 1]) {
      piece(trunk, box(0.2, 0.06, 0.3, 0.02), mat(0x6b5638, 0.9), side * 0.26, 0.12, -0.1, 0, side * 0.3, 0)
    }
    piece(headParts, lathe('morro', [
      [0.001, 0.02], [0.1, -0.02], [0.13, -0.12], [0.08, -0.22], [0.001, -0.26]
    ], 12), mat(shade(skinHex, 0.7), 0.75), 0, -0.04, -0.12)
    for (let i = 0; i < 4; i++) {
      piece(headParts, tube(0.001, 0.022, 0.11, 5), bone,
        -0.06 + i * 0.04, -0.14, -0.22, Math.PI / 2 + 0.3, 0, 0)
    }
  }

  const head = bake(headParts)
  head.position.set((rnd() - 0.5) * 0.04, 0.78, -0.05)
  head.rotation.set(rnd() * 0.2, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4)
  trunk.add(head)
  lean.add(bake(trunk))

  // --- extremidades -----------------------------------------------------------
  const limbs = {}
  const barefoot = rnd() < 0.4
  const boneArm = rnd() < 0.3      // a uno de cada tres se le ve el hueso del antebrazo

  for (const [name, side] of [['armL', -1], ['armR', 1]]) {
    const exposed = boneArm && side < 0
    const arm = limb({
      length: 0.76, thickness: 0.058, material: flesh,
      lowerMat: exposed ? bone : flesh,
      bend: -0.28 - rnd() * 0.5,
      end: box(0.07, 0.06, 0.11, 0.025), endMat: rot, endOffset: -0.04,
      // Garras y hombro fundidos dentro del tramo. Sueltos eran cuatro llamadas
      // de dibujo por brazo, ocho por huésped: con la horda en pantalla, más de
      // doscientas que no tenían por qué existir.
      extraUpper: up => piece(up, ball(0.075, 10, 8), flesh, 0, 0, 0),
      extraLower: lo => {
        for (let i = 0; i < 3; i++) {
          piece(lo, cap(0.014, 0.05, 3, 6), rot, -0.025 + i * 0.025, -0.44, -0.1, 0.7)
        }
      }
    })
    arm.position.set(side * shoulderX, SHOULDER, 0)
    arm.rotation.set(1.24 - side * 0.14 + (rnd() - 0.5) * 0.34, 0, (rnd() - 0.5) * 0.32)
    g.add(arm)
    limbs[name] = arm
    arm.userData.restBend = arm.userData.lower.rotation.x
  }
  for (const [name, side] of [['legL', -1], ['legR', 1]]) {
    const leg = limb({
      length: 0.86, thickness: 0.078, material: rags, lowerMat: rnd() < 0.5 ? flesh : rags,
      bend: -0.14 - rnd() * 0.24,
      end: box(0.1, 0.07, 0.24, 0.03), endMat: barefoot && side < 0 ? flesh : rot, endOffset: -0.05
    })
    leg.position.set(side * 0.11, HIP, 0)
    leg.rotation.z = (rnd() - 0.5) * 0.14
    g.add(leg)
    limbs[name] = leg
    leg.userData.restBend = leg.userData.lower.rotation.x
  }

  g.add(contactShadow(spec.boss ? 1.5 : 0.95))
  g.userData.limbs = limbs
  g.userData.lean = lean
  // Sin `head`: en los huéspedes la cabeza se funde dentro del tronco, así que
  // exponerla haría creer que se puede animar por separado. No se puede.
  g.scale.setScalar((spec.scale ?? 1) * (0.92 + rnd() * 0.16))
  return g
}

// El fogonazo de la boca del cañón. Fuera de `placeholderSoldier` porque lo
// necesitan las dos clases de figura, y sin él el arma dispara a oscuras.
function montarFogonazo (arma) {
  const flash = new THREE.Mesh(
    lathe('flash', [[0.001, 0.14], [0.075, 0.02], [0.11, -0.04], [0.06, -0.1], [0.001, -0.16]], 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95 })
  )
  flash.rotation.x = -Math.PI / 2
  flash.position.z = arma.userData.muzzleZ
  flash.scale.set(1, 2.2, 1)
  flash.visible = false
  brilla(flash)
  return flash
}

export async function buildSoldierMesh (key, spec) {
  if (MODELS[key]) {
    try {
      return await armarPersona(key, spec, MODELS[key])
    } catch (e) {
      // Un archivo que falta o que viene roto no puede tumbar la partida. La
      // figura procedural sigue ahí y hace exactamente lo mismo: se avisa por
      // consola y se juega igual, con el soldado de piezas.
      console.warn(`Sin modelo para ${key}, va la figura de piezas:`, e.message)
    }
  }
  return placeholderSoldier(key, spec)
}

export async function buildZombieMesh (key, spec) {
  if (MODELS[key]) {
    const m = await loadModel(MODELS[key])
    m.scale.setScalar(spec.scale ?? 1)
    return m
  }
  return placeholderZombie(spec)
}

export function buildSandbagsMesh (spec) {
  const parts = new THREE.Group()
  const a = mat(spec.color, 0.97)
  const b = mat(spec.accent, 0.97)
  let i = 0
  for (const [y, xs] of [[0.26, [-0.56, 0, 0.56]], [0.72, [-0.28, 0.28]]]) {
    for (const x of xs) {
      const s = piece(parts, cap(0.28, 0.48, 5, 12), i++ % 2 ? a : b, x, y, 0, 0, (Math.random() - 0.5) * 0.3, Math.PI / 2)
      s.scale.set(1, 1, 0.82)
    }
  }
  piece(parts, box(0.1, 1.05, 0.1, 0.03), mat(0x6b543a, 0.92), 0.7, 0.52, 0)
  for (let k = 0; k < 3; k++) {
    piece(parts, cap(0.016, 0.85, 3, 6), mat(0x8d8f92, 0.5, 0.4), 0.7, 0.32 + k * 0.26, 0, 0, 0, Math.PI / 2)
  }

  const g = bake(parts)
  g.add(contactShadow(1.2))
  return g
}
