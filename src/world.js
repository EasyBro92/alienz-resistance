import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FIELD } from './config.js'
import { texturasDelSuelo } from './systems/texturas.js'
import { bake } from './assets.js'
import { BIOMAS, FLORA, HITOS, RESTOS, baseAlien } from './biomas.js'

export const laneX = i => (i - (FIELD.lanes - 1) / 2) * FIELD.laneWidth
export const rowZ = r => FIELD.frontRowZ - r * FIELD.rowDepth
export const fieldWidth = FIELD.lanes * FIELD.laneWidth

export function laneFromX (x) {
  const i = Math.round(x / FIELD.laneWidth + (FIELD.lanes - 1) / 2)
  return Math.min(FIELD.lanes - 1, Math.max(0, i))
}

export function rowFromZ (z) {
  const r = Math.round((FIELD.frontRowZ - z) / FIELD.rowDepth)
  return Math.min(FIELD.rows - 1, Math.max(0, r))
}

// Pintura y desgaste del asfalto. Todo va tumbado en el suelo y en tonos
// apagados: tiene que dar textura sin robarle contraste a las unidades, que son
// lo único que el jugador necesita leer rápido.
function paintRoad (scene, pintables) {
  const rand = (a, b) => a + Math.random() * (b - a)
  const half = fieldWidth / 2

  const flat = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })

  const patchMat = flat(0x5f5b57, 0.15)
  const crackMat = flat(0x3a3733, 0.26)
  const skidMat = flat(0x2b2825, 0.13)
  const stainMat = flat(0x4a1310, 0.2)
  const paintMat = pintables.raya

  const put = (mesh, x, z, rotZ = 0, y = 0.014) => {
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = rotZ
    mesh.position.set(x, y, z)
    mesh.renderOrder = 2
    scene.add(mesh)
    return mesh
  }

  // parches de reasfaltado
  for (let i = 0; i < 16; i++) {
    // Círculos irregulares en vez de rectángulos: un parche de alquitrán no
    // tiene esquinas, y en rectángulo se leía como un papel tirado.
    put(new THREE.Mesh(new THREE.CircleGeometry(rand(0.5, 1.5), 6), patchMat),
      rand(-half, half), rand(FIELD.spawnZ - 18, FIELD.baseZ + 3), rand(0, Math.PI))
  }
  // grietas: tiras finas y quebradas
  for (let i = 0; i < 16; i++) {
    const x = rand(-half, half)
    const z = rand(FIELD.spawnZ - 18, FIELD.baseZ + 3)
    const a = rand(0, Math.PI)
    put(new THREE.Mesh(new THREE.PlaneGeometry(rand(0.04, 0.09), rand(0.9, 3.4)), crackMat), x, z, a)
    if (Math.random() < 0.6) {
      put(new THREE.Mesh(new THREE.PlaneGeometry(rand(0.03, 0.07), rand(0.5, 1.6)), crackMat),
        x + Math.cos(a) * 0.6, z + Math.sin(a) * 0.6, a + rand(0.5, 1.2))
    }
  }
  // frenazos: pares de tiras paralelas
  for (let i = 0; i < 5; i++) {
    const x = rand(-half + 1, half - 1)
    const z = rand(FIELD.spawnZ - 14, FIELD.baseZ)
    const len = rand(3, 7)
    for (const dx of [-0.7, 0.7]) {
      put(new THREE.Mesh(new THREE.PlaneGeometry(0.24, len), skidMat), x + dx, z, rand(-0.05, 0.05))
    }
  }
  // manchas de sangre seca, más cerca de la base: cuenta que aquí ya se peleó
  for (let i = 0; i < 5; i++) {
    const s = rand(0.4, 1.0)
    const stain = put(new THREE.Mesh(new THREE.CircleGeometry(s, 9), stainMat),
      rand(-half, half), rand(FIELD.baseZ - 16, FIELD.baseZ + 3), rand(0, Math.PI), 0.016)
    stain.scale.set(1, rand(0.5, 1), 1)
    for (let k = 0; k < 3; k++) {
      put(new THREE.Mesh(new THREE.CircleGeometry(rand(0.1, 0.3), 7), stainMat),
        stain.position.x + rand(-s * 1.6, s * 1.6), stain.position.z + rand(-s * 1.6, s * 1.6), 0, 0.016)
    }
  }
  // tapas de alcantarilla
  const tapaMat = flat(0x4a4742, 0.55)
  const aroMat = flat(0x6a665f, 0.5)
  for (let i = 0; i < 4; i++) {
    const x = rand(-half + 0.6, half - 0.6)
    const z = rand(FIELD.spawnZ - 14, FIELD.baseZ)
    put(new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), tapaMat), x, z)
    put(new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 14), aroMat), x, z, 0, 0.015)
  }
  // flechas de dirección descoloridas, apuntando hacia la base
  for (let i = 0; i < 3; i++) {
    const x = laneX(1 + i * 1.5)
    const z = FIELD.spawnZ - 4 - i * 11
    put(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.2), paintMat), x, z)
    put(new THREE.Mesh(new THREE.CircleGeometry(0.55, 3), paintMat), x, z + 1.4, -Math.PI / 2)
  }
  // Lo que solo tiene sentido sobre asfalto, para poder apagarlo en un parque.
  return [patchMat, crackMat, skidMat, stainMat, tapaMat, aroMat]
}

// Decorado del borde de la carretera. Nada de esto interviene en el juego: está
// para que el campo no parezca una hoja de cálculo. Todo queda fuera de los
// carriles para no competir con las unidades.
// Lo que hay que poder reteñir al cambiar de región. Se recogen los materiales
// al construir en vez de buscarlos después recorriendo la escena: son siempre
// los mismos cuatro y así el cambio de bioma es asignar colores, no una batida.
// Agranda un monumento sin meterlo en la calzada: crece y se reubica para que su
// borde más cercano quede junto a la barandilla, a media distancia. En el móvil
// se ve solo la parte de abajo, pero se reconoce mejor que entero en miniatura.
function agrandar (h) {
  const lado = h.userData.lados[0]
  h.updateMatrixWorld(true)
  const caja = new THREE.Box3().setFromObject(h)
  const tam = caja.getSize(new THREE.Vector3())
  const factor = Math.min(1.8, 70 / Math.max(tam.z, 1), 60 / Math.max(tam.x, 1))
  if (factor > 1.02) h.scale.multiplyScalar(factor)
  h.updateMatrixWorld(true)
  caja.setFromObject(h)
  const cerca = lado > 0 ? caja.min.x : caja.max.x
  h.position.x += lado * 11.5 - cerca
  // El centro entre z = -50 y -75: más cerca se sale por abajo de la pantalla y
  // más lejos lo tapa el marcador.
  const cz = (caja.min.z + caja.max.z) / 2
  h.position.z += Math.max(-75, Math.min(-50, cz)) - cz
}

// Apunta lo que sobresale del decorado (a más de 3,5 de alto y fuera de la
// calzada), pieza a pieza y antes de fundir: las naves que cruzan el escenario
// lo consultan para volar por encima en vez de atravesar edificios.
const _cajaAlto = new THREE.Box3()
function medirAltos (raiz, lista) {
  raiz.updateMatrixWorld(true)
  raiz.traverse(o => {
    if (!o.isMesh) return
    _cajaAlto.setFromObject(o)
    if (_cajaAlto.max.y < 3.5) return
    if (_cajaAlto.max.x > -7 && _cajaAlto.min.x < 7) return
    lista.push({ minX: _cajaAlto.min.x, maxX: _cajaAlto.max.x, minZ: _cajaAlto.min.z, maxZ: _cajaAlto.max.z, maxY: _cajaAlto.max.y })
  })
}

// `aparte` recibe la nave estrellada y su surco: no se funden con el resto
// para poder esconderlos en las misiones con monumento.
function decorate (scene, pintables, aparte = scene) {
  const std = (color, rough = 0.85, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })

  const edge = fieldWidth / 2 + 2.2
  const rand = (a, b) => a + Math.random() * (b - a)

  // Sierra del fondo: da profundidad y tapa el corte del horizonte.
  //
  // El corredor central se deja libre a propósito. La carretera se va a un punto
  // de fuga en x=0, así que cualquier cerro que caiga ahí aparece plantado en
  // mitad de la pista como una pirámide y rompe la perspectiva.
  const ridge = new THREE.Group()
  const CLEAR = 30
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1
    const h = rand(5, 15)
    // Cerros de muchos lados y aplastados: colinas, no pirámides.
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rand(11, 22), h, rand(6, 9) | 0), pintables.cerro)
    hill.position.set(side * rand(CLEAR, 120), h / 2 - 2.5, rand(-110, -76))
    hill.rotation.y = rand(0, Math.PI)
    hill.scale.z = rand(0.7, 1.3)
    ridge.add(hill)
  }
  // Banda de mesetas lejanas cruzando todo el horizonte, incluida la zona
  // central: cierra el fondo sin meterse en la carretera.
  for (let i = 0; i < 14; i++) {
    const w = rand(24, 46)
    const h = rand(2, 3.6)
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.5, h, 7), pintables.meseta)
    mesa.position.set(rand(-150, 150), h / 2 - 1.5, rand(-138, -118))
    mesa.rotation.y = rand(-0.2, 0.2)
    ridge.add(mesa)
  }
  scene.add(ridge)

  // Cápsula alienígena estrellada, clavada de canto en la arena con el surco
  // que dejó al arar el suelo. Es el origen de todo: conviene que se vea.
  const wreckShip = new THREE.Group()
  const hull = new THREE.Mesh(new THREE.LatheGeometry([
    [0.001, -1.1], [2.4, -0.7], [5.2, 0], [2.8, 0.85], [0.001, 1.2]
  ].map(([x, y]) => new THREE.Vector2(x, y)), 16), std(0x5a6674, 0.42, 0.5))
  wreckShip.add(hull)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x7dff9e, emissive: 0x2f7a45, emissiveIntensity: 1.2, roughness: 0.3 }))
  dome.position.y = 0.9
  wreckShip.add(dome)
  for (let i = 0; i < 5; i++) {                                  // grietas encendidas
    const a = rand(0, Math.PI * 2)
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, rand(1.4, 3)),
      new THREE.MeshStandardMaterial({ color: 0x9dff6e, emissive: 0x9dff6e, emissiveIntensity: 2, roughness: 0.4 }))
    crack.position.set(Math.cos(a) * 3.4, rand(-0.3, 0.5), Math.sin(a) * 3.4)
    crack.rotation.y = a + rand(-0.6, 0.6)
    wreckShip.add(crack)
  }
  const shipSide = Math.random() < 0.5 ? -1 : 1
  // En vertical la pantalla es estrecha: más allá de x≈16 se sale del encuadre.
  wreckShip.position.set(shipSide * rand(12, 16), 1.6, rand(FIELD.spawnZ - 4, FIELD.spawnZ + 12))
  wreckShip.rotation.set(0.85, rand(0, 3), 0.4)
  wreckShip.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  // Con nombre, para que `vestir` la quite donde estorba a un monumento.
  aparte.add(wreckShip)

  // Surco de tierra levantada por detrás del impacto.
  for (let i = 0; i < 9; i++) {
    const t = i / 9
    const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.5) * (1 - t * 0.5), 0), pintables.piedra)
    mound.position.set(
      wreckShip.position.x + Math.sign(shipSide) * (5 + i * 3.2),
      0.2,
      wreckShip.position.z - 8 - i * 3.4
    )
    mound.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
    mound.castShadow = true
    aparte.add(mound)
  }

  // Matojos secos y piedras a los lados.
  const bushMat = pintables.matojo
  const rockMat = pintables.piedra
  for (let i = 0; i < 46; i++) {
    const side = Math.random() < 0.5 ? -1 : 1
    const z = rand(FIELD.spawnZ - 22, FIELD.baseZ + 6)
    if (Math.random() < 0.55) {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.3, 0.75), 0), bushMat)
      bush.position.set(side * rand(edge, edge + 16), 0.2, z)
      bush.scale.y = 0.6
      bush.castShadow = true
      scene.add(bush)
    } else {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.35, 1.1), 0), rockMat)
      rock.position.set(side * rand(edge, edge + 20), 0.1, z)
      rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
      rock.castShadow = true
      scene.add(rock)
    }
  }

  // Chatarra: coches reventados y bidones. Cuentan de dónde vienen los zombis.
  const wreckBody = std(0x8c4b3d, 0.7, 0.25)
  const wreckDark = std(0x40342e, 0.8)
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 1 : -1
    const car = new THREE.Group()
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.2), wreckBody)
    chassis.position.y = 0.62
    car.add(chassis)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 1.9), wreckDark)
    cabin.position.set(0, 1.24, 0.2)
    car.add(cabin)
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10)
    for (const [x, z] of [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]]) {
      const w = new THREE.Mesh(wheelGeo, wreckDark)
      w.position.set(x, 0.34, z)
      w.rotation.z = Math.PI / 2
      car.add(w)
    }
    car.position.set(side * rand(edge + 1.5, edge + 5), 0, rand(FIELD.spawnZ - 18, FIELD.baseZ - 4))
    car.rotation.y = rand(-0.9, 0.9)
    car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(car)
  }

  const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.05, 12)
  const barrelMats = [std(0xc4622f, 0.6, 0.3), std(0x4f7a4a, 0.6, 0.3), std(0xb0a437, 0.6, 0.3)]
  for (let i = 0; i < 14; i++) {
    const side = Math.random() < 0.5 ? -1 : 1
    const barrel = new THREE.Mesh(barrelGeo, barrelMats[i % barrelMats.length])
    const lying = Math.random() < 0.35
    barrel.position.set(side * rand(edge, edge + 9), lying ? 0.4 : 0.53, rand(FIELD.spawnZ - 20, FIELD.baseZ + 4))
    if (lying) { barrel.rotation.z = Math.PI / 2; barrel.rotation.y = rand(0, 3) }
    barrel.castShadow = true
    barrel.receiveShadow = true
    scene.add(barrel)
  }

  // Conos, neumáticos y una señal: chatarra pequeña que llena el arcén.
  const coneMat = std(0xd8622a, 0.7)
  const coneBase = std(0x2c2c2e, 0.9)
  for (let i = 0; i < 5; i++) {
    const side = Math.random() < 0.5 ? -1 : 1
    const x = side * rand(fieldWidth / 2 + 0.9, fieldWidth / 2 + 2.6)
    const z = rand(FIELD.spawnZ - 16, FIELD.baseZ + 2)
    const cone = new THREE.Group()
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 10), coneMat)
    body.position.y = 0.34
    cone.add(body)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), coneBase)
    base.position.y = 0.03
    cone.add(base)
    cone.position.set(x, 0, z)
    if (Math.random() < 0.4) { cone.rotation.z = rand(1.2, 1.8); cone.position.y = 0.24 }
    cone.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(cone)
  }

  const tyreMat = std(0x22201f, 0.95)
  for (let i = 0; i < 9; i++) {
    const side = Math.random() < 0.5 ? -1 : 1
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 8, 14), tyreMat)
    tyre.rotation.x = -Math.PI / 2
    tyre.position.set(side * rand(fieldWidth / 2 + 1, fieldWidth / 2 + 8), 0.13, rand(FIELD.spawnZ - 18, FIELD.baseZ + 3))
    tyre.castShadow = true
    scene.add(tyre)
  }

  // Materiales de la señal compartidos por las tres: así se pueden apagar de una
  // vez en los mapas sin carretera.
  const signPostMat = std(0x8d8f92, 0.5, 0.4)
  const signBoardMat = std(0xb9ac7e, 0.8)
  const signStripeMat = std(0x6d2a22, 0.8)
  for (let i = 0; i < 3; i++) {
    const side = i % 2 ? 1 : -1
    const sign = new THREE.Group()
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), signPostMat)
    post.position.y = 1.2
    sign.add(post)
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.8, 0.06), signBoardMat)
    board.position.y = 2.1
    sign.add(board)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.03), signStripeMat)
    stripe.position.set(0, 2.1, -0.05)
    sign.add(stripe)
    sign.position.set(side * (fieldWidth / 2 + 2.1), 0, FIELD.baseZ - 9 - i * 13)
    sign.rotation.y = side * 0.25 + rand(-0.15, 0.15)
    sign.traverse(o => { if (o.isMesh) o.castShadow = true })
    scene.add(sign)
  }

  // Postes de luz caídos y en pie: dan altura al horizonte.
  const poleMat = std(0x6d6963, 0.7, 0.3)
  // Mobiliario de carretera, para que `vestir` lo apague donde no hay carretera:
  // conos, neumáticos y señales en una playa o en una plaza no pintan nada. Las
  // farolas van aparte porque en adoquín y losas sí tienen sentido.
  pintables.mobiliarioVia = [coneMat, coneBase, tyreMat, signPostMat, signBoardMat, signStripeMat]
  pintables.farolas = [poleMat]
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1
    const pole = new THREE.Group()
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 6.4, 8), poleMat)
    mast.position.y = 3.2
    pole.add(mast)
    // El brazo terminaba en el aire, sin farola: no era un adorno flojo, era un
    // objeto sin acabar. Y es el más alto del escenario, así que se ve.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), poleMat)
    arm.position.set(-side * 1.2, 6.3, 0)
    pole.add(arm)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.26), poleMat)
    head.position.set(-side * 2.2, 6.24, 0)
    head.rotation.z = -side * 0.12
    if (Math.random() < 0.34) head.rotation.x = rand(0.5, 1.1)   // alguna descolgada
    pole.add(head)
    // Repartidas donde de verdad entran en cuadro: con el reparto anterior tres
    // de las ocho caían detrás de la cámara.
    pole.position.set(side * (edge + 2.4), 0, FIELD.baseZ - 26 - i * 8)
    // Los derribados caen SIEMPRE hacia fuera: si caen hacia dentro cruzan los
    // carriles y estorban la lectura del campo.
    if (Math.random() < 0.3) pole.rotation.z = -side * 1.2
    pole.traverse(o => { if (o.isMesh) o.castShadow = true })
    scene.add(pole)
  }
}

export function createWorld (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Neutral levanta los medios más que ACES y no lava los colores de identidad,
  // que es lo único que manda aquí: el jugador tiene que distinguir siete tipos.
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x7cb6e0)
  scene.fog = new THREE.Fog(0xc2d6dd, 62, 152)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200)
  const camTarget = new THREE.Vector3(0, 0, -9)

  // Sol de mediodía: sombras marcadas y limpias, como en la referencia.
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.6)
  sun.position.set(-11, 36, 13)
  sun.castShadow = true
  // Caja de sombra apretada al campo real: cinco carriles de 2,4 dan un borde
  // exterior en x=±6, así que ±22 estaba desperdiciando la mitad del mapa. En
  // profundidad se queda en -46 porque los huéspedes aparecen en -44: con menos,
  // su sombra aparecería de golpe unos metros después de salir, y eso se ve.
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -16
  sun.shadow.camera.right = 16
  sun.shadow.camera.top = 10
  sun.shadow.camera.bottom = -46
  sun.shadow.camera.near = 16
  sun.shadow.camera.far = 80
  // normalBias, no solo bias: todo cuerpo del juego son cápsulas y esferas, y
  // sobre superficie curva un sesgo negativo a secas despega la sombra del pie.
  sun.shadow.bias = -0.0001
  sun.shadow.normalBias = 0.022
  scene.add(sun, sun.target)
  sun.target.position.copy(camTarget)

  const cielo = new THREE.HemisphereLight(0xbcdcff, 0xd6a86f, 0.6)
  scene.add(cielo)

  // Contraluz desde el fondo del carril. El sol está en z=+13 y la cámara en
  // z=+14.6: la misma banda, así que la única cara que vemos estaba iluminada
  // de plano y casco, hombros y mochila se fundían en una mancha del color del
  // uniforme. Un filo frío desde atrás dibuja el contorno, que es justo lo que
  // hay que leer. Sin sombras: cuesta por fragmento, cero mallas.
  const rim = new THREE.DirectionalLight(0xcfe4ff, 0.7)
  rim.position.set(9, 13, -34)
  scene.add(rim, rim.target)
  rim.target.position.copy(camTarget)

  // Entorno de iluminación. Un metal sin nada que reflejar se ve gris muerto:
  // esto le da algo que reflejar y es lo que hace que las monedas brillen como
  // monedas y las armas parezcan acero en vez de plástico oscuro.
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.32
  pmrem.dispose()

  // --- suelo -----------------------------------------------------------------
  // Grano, veta y relieve dibujados por código al arrancar. El suelo ocupa la
  // mitad de la pantalla: mientras fue un plano de color liso, ninguna otra
  // mejora visual iba a notarse por encima de eso.
  const piel = texturasDelSuelo()

  // El arenal llega mucho más lejos que la niebla. Con 220 su borde caía a 172
  // de la cámara y aún se leía como un escalón contra el cielo.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 480),
    new THREE.MeshStandardMaterial({
      color: 0xf0cd8b, roughness: 0.95,
      map: piel.arena.map,
      normalMap: piel.arena.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8)
    })
  )
  // Una repetición cada 20 unidades. A 120 el grano y las ondas de viento
  // caían por debajo del píxel y el arenal volvía a ser un amarillo liso: no
  // sirve de nada un relieve que no se puede ver.
  piel.arena.map.repeat.set(24, 24)
  piel.arena.normalMap.repeat.set(24, 24)
  sand.rotation.x = -Math.PI / 2
  sand.position.z = -140
  sand.receiveShadow = true
  scene.add(sand)

  // La carretera no debe acabarse a la vista. La niebla cierra del todo a 152
  // de la cámara, que está en z≈22: cualquier borde por delante de z≈-129 se ve
  // como un corte. Con 260 el final cae en z=-250 y para entonces ya es niebla.
  const roadLength = 260
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(fieldWidth + 1.6, roadLength),
    new THREE.MeshStandardMaterial({
      color: 0x83807a, roughness: 0.9,
      map: piel.asfalto.map,
      normalMap: piel.asfalto.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1)
    })
  )
  // La repetición sigue la forma de la calzada: cuadrada, no estirada. Con un
  // solo número el árido salía como churros a lo largo de la carretera.
  piel.asfalto.map.repeat.set(7, roadLength / (fieldWidth + 1.6) * 7)
  piel.asfalto.normalMap.repeat.set(7, roadLength / (fieldWidth + 1.6) * 7)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.01, FIELD.baseZ - roadLength / 2 + 6)
  road.receiveShadow = true
  scene.add(road)

  // Césped para las misiones de parque. Siega en damero de cuadros de unas 3,4
  // unidades: no coinciden con los carriles de 2,4, así que no los delatan.
  const cesped = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        x.fillStyle = (i + j) % 2 ? '#c9d9b0' : '#b3c796'
        x.fillRect(i * 128, j * 128, 128, 128)
      }
    }
    // La hierba: miles de trazos cortos de verdes distintos.
    for (let k = 0; k < 9000; k++) {
      const v = 150 + Math.random() * 90
      x.fillStyle = `rgba(${(v * 0.55) | 0},${v | 0},${(v * 0.45) | 0},0.35)`
      x.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 3)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  })()
  cesped.repeat.set(2, 38)
  const pielCarretera = { map: road.material.map, normalMap: road.material.normalMap }
  const pielArena = { map: sand.material.map, normalMap: sand.material.normalMap }

  // --- suelos y terrenos -----------------------------------------------------------
  // Antes todo era asfalto rodeado de arena, y todos los sitios parecían el mismo
  // desierto. Ahora hay dos cosas distintas:
  //   - el TERRENO de alrededor, que es de la región (`terreno` en el bioma):
  //     hierba, tierra, nieve, roca volcánica, losas de ciudad o arena;
  //   - el SUELO que se pisa, que es de la misión (`suelo` en la campaña):
  //     carretera, parque, adoquín, losas, arena, playa, tierra o nieve.
  // Las texturas se pintan en lienzo la primera vez que hacen falta. Van en tonos
  // claros para que el color del bioma, o el `tonoSuelo` de la misión, las tiña.
  const texturasSuelo = new Map()
  const lienzo = (clave, pintar, rx, ry) => {
    if (texturasSuelo.has(clave)) return texturasSuelo.get(clave)
    const c = document.createElement('canvas')
    c.width = c.height = 256
    pintar(c.getContext('2d'), 256)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    t.repeat.set(rx, ry)
    texturasSuelo.set(clave, t)
    return t
  }
  const mancha = (x, n, color, cuantas, rMin, rMax) => {
    for (let k = 0; k < cuantas; k++) {
      x.fillStyle = color(Math.random())
      x.beginPath()
      x.arc(Math.random() * n, Math.random() * n, rMin + Math.random() * (rMax - rMin), 0, Math.PI * 2)
      x.fill()
    }
  }
  const PINTORES = {
    hierba (x, n) {
      x.fillStyle = '#dfe8d2'
      x.fillRect(0, 0, n, n)
      mancha(x, n, a => `rgba(90,110,60,${a * 0.08})`, 600, 6, 24)
      for (let k = 0; k < 9000; k++) {
        const v = 150 + Math.random() * 100
        x.fillStyle = `rgba(${(v * 0.75) | 0},${v | 0},${(v * 0.6) | 0},0.45)`
        x.fillRect(Math.random() * n, Math.random() * n, 1, 2 + Math.random() * 4)
      }
    },
    tierra (x, n) {
      x.fillStyle = '#e8ddcb'
      x.fillRect(0, 0, n, n)
      mancha(x, n, a => `rgba(120,90,60,${a * 0.1})`, 500, 4, 22)
      for (let k = 0; k < 1400; k++) {
        const v = 120 + Math.random() * 110
        x.fillStyle = `rgb(${v | 0},${(v * 0.9) | 0},${(v * 0.8) | 0})`
        x.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2.5, 1 + Math.random() * 2)
      }
    },
    nieve (x, n) {
      x.fillStyle = '#ffffff'
      x.fillRect(0, 0, n, n)
      mancha(x, n, a => `rgba(150,175,200,${a * 0.09})`, 400, 6, 30)
      for (let k = 0; k < 900; k++) {
        x.fillStyle = `rgba(120,150,180,${0.1 + Math.random() * 0.15})`
        x.fillRect(Math.random() * n, Math.random() * n, 1, 1)
      }
    },
    roca (x, n) {
      x.fillStyle = '#c9c4be'
      x.fillRect(0, 0, n, n)
      mancha(x, n, () => {
        const v = 60 + Math.random() * 150
        return `rgb(${v | 0},${(v * 0.96) | 0},${(v * 0.92) | 0})`
      }, 2600, 0.8, 3.5)
    },
    // Sampietrini: filas de cantos cuadrados corridas media pieza, la junta
    // oscura y cada piedra de su tono. Dieciséis filas pares: empalma sin corte.
    adoquin (x, n) {
      x.fillStyle = '#5f5a52'
      x.fillRect(0, 0, n, n)
      const p = 16
      for (let f = 0; f < n / p; f++) {
        const desfase = f % 2 ? p / 2 : 0
        for (let c = -1; c <= n / p; c++) {
          const v = 125 + Math.random() * 60
          x.fillStyle = `rgb(${v | 0},${(v * 0.95) | 0},${(v * 0.88) | 0})`
          const px = c * p + desfase + 1.2
          const py = f * p + 1.2
          x.beginPath()
          if (x.roundRect) x.roundRect(px, py, p - 2.4, p - 2.4, 3)
          else x.rect(px, py, p - 2.4, p - 2.4)
          x.fill()
          x.fillStyle = 'rgba(255,255,255,0.08)'
          x.fillRect(px + 2, py + 2, p - 8, 3)
        }
      }
    },
    // Losas a matajunta, claras y con motas.
    losas (x, n) {
      x.fillStyle = '#9a9388'
      x.fillRect(0, 0, n, n)
      const p = 64
      for (let f = 0; f < 4; f++) {
        const desfase = f % 2 ? p / 2 : 0
        for (let c = -1; c < 5; c++) {
          const v = 200 + Math.random() * 35
          x.fillStyle = `rgb(${v | 0},${(v * 0.97) | 0},${(v * 0.92) | 0})`
          x.fillRect(c * p + desfase + 1.5, f * p + 1.5, p - 3, p - 3)
        }
      }
      for (let k = 0; k < 2500; k++) {
        x.fillStyle = `rgba(90,85,78,${Math.random() * 0.18})`
        x.fillRect(Math.random() * n, Math.random() * n, 1, 1)
      }
    },
    // Arena fina y clara, con las ondas suaves del viento.
    arena (x, n) {
      x.fillStyle = '#f3e7c9'
      x.fillRect(0, 0, n, n)
      for (let k = 0; k < 7000; k++) {
        const v = 200 + Math.random() * 55
        x.fillStyle = `rgba(${v | 0},${(v * 0.92) | 0},${(v * 0.78) | 0},0.5)`
        x.fillRect(Math.random() * n, Math.random() * n, 1, 1)
      }
      x.strokeStyle = 'rgba(180,150,110,0.12)'
      x.lineWidth = 2
      for (let y = 8; y < n; y += 22) {
        x.beginPath()
        for (let px = 0; px <= n; px += 16) x.lineTo(px, y + Math.sin((px / n) * Math.PI * 4 + y) * 3)
        x.stroke()
      }
    }
  }
  // Unidades de mundo que ocupa cada baldosa de textura. Ninguna es 2,4, el
  // ancho del carril: si coincidiera, las juntas dibujarían los carriles.
  const LADO_CAMPO = { adoquin: 2.1, losas: 3.3, arena: 6, playa: 6, tierra: 5, nieve: 6 }
  const PINTOR_CAMPO = { playa: 'arena' }
  const COLOR_CAMPO = { parque: 0x8fb46a, arena: 0xf2dca8, playa: 0xffffff }
  function texturaCampo (suelo) {
    if (suelo === 'parque') return cesped
    const lado = LADO_CAMPO[suelo]
    if (!lado) return null
    const pintor = PINTOR_CAMPO[suelo] ?? suelo
    return lienzo('campo:' + pintor, PINTORES[pintor], (fieldWidth + 1.6) / lado, roadLength / lado)
  }
  function texturaTerreno (tipo) {
    const lado = { hierba: 9, tierra: 10, nieve: 12, roca: 8, losas: 6 }[tipo] ?? 10
    return lienzo('terreno:' + tipo, PINTORES[tipo], 480 / lado, 480 / lado)
  }

  // Los materiales que cambian con la región. Se crean aquí y se le pasan a
  // `decorate`, que los usa en vez de inventarse los suyos: así reteñir un
  // bioma entero es asignar cuatro colores, sin recorrer la escena buscando
  // mallas ni reconstruir nada. Funciona porque `bake` va sin oclusión y no
  // clona los materiales — con oclusión los clonaría y esto no valdría.
  const pintables = {
    cerro: new THREE.MeshStandardMaterial({ color: 0xb99a72, roughness: 1 }),
    meseta: new THREE.MeshStandardMaterial({ color: 0xc7ab86, roughness: 1 }),
    matojo: new THREE.MeshStandardMaterial({ color: 0x9c8a52, roughness: 1 }),
    piedra: new THREE.MeshStandardMaterial({ color: 0xa39079, roughness: 1 }),
    // La calzada: lo que se pisa es la mitad de la pantalla, y era idéntica en
    // Tarragona y en Manaos. La raya va como material básico transparente,
    // igual que el resto de marcas del asfalto, para que se funda con ellas.
    raya: new THREE.MeshBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0.3, depthWrite: false }),
    bordillo: new THREE.MeshStandardMaterial({ color: 0xbdb6a8, roughness: 0.85 }),
    bordilloOscuro: new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 0.9 })
  }

  // A partir de aquí, todo lo que no se mueve se construye dentro de `decor` y
  // se funde al final en un puñado de mallas.
  const decor = new THREE.Group()

  // --- bordillo ----------------------------------------------------------------
  // La calzada terminaba en un corte a ras de arena, como una alfombra puesta
  // encima. Un bordillo de diez centímetros con su cara vista es lo que hace que
  // la carretera esté metida en el terreno y no apoyada sobre él.
  const bordilloMat = pintables.bordillo
  const bordilloOscuro = pintables.bordilloOscuro
  for (const side of [-1, 1]) {
    // A trozos, con junta: una viga de 260 metros de largo no es un bordillo.
    for (let z = FIELD.baseZ + 6; z > -132; z -= 3.1) {
      const alto = 0.22 + (Math.random() - 0.5) * 0.04
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, alto, 2.9), Math.random() < 0.18 ? bordilloOscuro : bordilloMat)
      b.position.set(side * (fieldWidth / 2 + 1.05), alto / 2 - 0.03, z)
      b.rotation.y = (Math.random() - 0.5) * 0.02
      b.castShadow = true
      decor.add(b)
    }
  }

  // --- baches ------------------------------------------------------------------
  // Hundidos de verdad: un cono invertido metido en el asfalto. Con una mancha
  // plana el jugador ve una pegatina; con volumen, la sombra del sol le entra
  // dentro y se lee como un agujero.
  const bacheMat = new THREE.MeshStandardMaterial({ color: 0x4f4b46, roughness: 1 })
  for (let i = 0; i < 14; i++) {
    const r = 0.35 + Math.random() * 0.55
    const bache = new THREE.Mesh(new THREE.ConeGeometry(r, 0.28, 7 + (Math.random() * 3 | 0)), bacheMat)
    bache.position.set(
      (Math.random() - 0.5) * (fieldWidth + 1),
      -0.13,
      FIELD.spawnZ + Math.random() * 46
    )
    bache.rotation.y = Math.random() * Math.PI
    bache.scale.z = 0.7 + Math.random() * 0.7
    decor.add(bache)
  }

  // Líneas de carril discontinuas: separan los 5 carriles y, al pasar por
  // debajo de los zombis, dan sensación de avance.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf0e6cf, transparent: true, opacity: 0.42 })
  const dashGeo = new THREE.PlaneGeometry(0.1, 1.5)
  for (let i = 1; i < FIELD.lanes; i++) {
    const x = laneX(i) - FIELD.laneWidth / 2
    // Las rayas se apagaban en z=-70, a un tercio de niebla: se veía dónde
    // terminaba la carretera aunque el asfalto siguiera. Ahora llegan hasta
    // donde la niebla ya es opaca.
    for (let z = FIELD.baseZ + 4; z > -150; z -= 2.9) {
      const dash = new THREE.Mesh(dashGeo, lineMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.02, z)
      decor.add(dash)
    }
  }

  // Arcén: línea continua y grava a los lados. Enmarca el campo de juego.
  const grava = new THREE.MeshStandardMaterial({ color: 0xa8a196, roughness: 1 })
  for (const side of [-1, 1]) {
    const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, roadLength), lineMat)
    edgeLine.rotation.x = -Math.PI / 2
    edgeLine.position.set(side * (fieldWidth / 2 + 0.42), 0.02, road.position.z)
    decor.add(edgeLine)

    const gravel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, roadLength),
      grava
    )
    gravel.rotation.x = -Math.PI / 2
    gravel.position.set(side * (fieldWidth / 2 + 1.5), 0.008, road.position.z)
    decor.add(gravel)
  }

  // Línea de la base: es la que decide la partida, está cerquísima de la cámara
  // y era lo único del suelo sin ningún trabajo — un rectángulo rojo liso.
  // Banda de chevrones, con la franja oscura en marrón y nunca en negro puro,
  // que en pantalla de móvil vibra.
  const W = fieldWidth + 1.6
  const N = 22
  const hazardA = new THREE.MeshBasicMaterial({ color: 0xff5a4d })
  const hazardB = new THREE.MeshBasicMaterial({ color: 0x2b2119 })
  const chevronGeo = new THREE.PlaneGeometry(W / N * 0.95, 0.5)
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(chevronGeo, i % 2 ? hazardA : hazardB)
    s.rotation.x = -Math.PI / 2
    s.rotation.z = 0.5                       // inclinado: chevrón, no damero
    s.position.set(-W / 2 + (i + 0.5) * W / N, 0.03, FIELD.baseZ)
    scene.add(s)
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8d8f92, roughness: 0.5, metalness: 0.4 })
  for (const dz of [-0.3, 0.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.08), railMat)
    rail.position.set(0, 0.03, FIELD.baseZ + dz)
    scene.add(rail)
  }

  // Vallas laterales.
  const postGeo = new THREE.BoxGeometry(0.16, 0.9, 0.16)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 })
  for (let z = FIELD.baseZ + 4; z > -130; z -= 3.2) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(side * (fieldWidth / 2 + 1.1), 0.45, z)
      // Los postes de la valla no proyectan: son decenas y sus sombras largas
      // cruzaban la carretera y la llenaban de rayas.
      post.castShadow = false
      decor.add(post)
      if (z < FIELD.baseZ - 2) {
        const wire = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 3.2), postMat)
        wire.position.set(side * (fieldWidth / 2 + 1.1), 0.72, z - 1.6)
        decor.add(wire)
      }
    }
  }

  // Todo el decorado se funde en un puñado de mallas. Suelto eran más de mil
  // piezas y el fotograma se iba a 22 ms: un móvil no lo aguanta.
  // Fundida con el resto perdía el nombre y `vestir` no la encontraba.
  const estrellada = new THREE.Group()
  estrellada.name = 'nave-estrellada'
  decorate(decor, pintables, estrellada)
  scene.add(estrellada)
  const marcasAsfalto = paintRoad(decor, pintables)
  // Todo lo que es de carretera y desaparece en un parque. `bake` agrupa por
  // material, así que apagar el material apaga su parte de la malla fundida.
  const soloCarretera = [...marcasAsfalto, bacheMat, lineMat, grava, postMat, pintables.raya, pintables.bordillo, pintables.bordilloOscuro]
  // Sin oclusión: son piezas sueltas repartidas por el descampado, no hay
  // rincones entre ellas, y cocerla costaría media carga a cambio de nada.
  const obstaculosFijos = []
  medirAltos(decor, obstaculosFijos)
  scene.add(bake(decor, false))

  // --- rejilla de colocación --------------------------------------------------
  const slots = new THREE.Group()
  const slotGeo = new THREE.PlaneGeometry(FIELD.laneWidth * 0.86, FIELD.rowDepth * 0.8)
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    for (let row = 0; row < FIELD.rows; row++) {
      const cell = new THREE.Mesh(slotGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false
      }))
      cell.rotation.x = -Math.PI / 2
      cell.position.set(laneX(lane), 0.04, rowZ(row))
      cell.userData = { lane, row }
      slots.add(cell)
    }
  }
  scene.add(slots)

  function setSlotsVisible (on) {
    for (const c of slots.children) {
      c.material.opacity = on ? 0.16 : 0
      c.material.color.setHex(0xffffff)
    }
  }

  // La casilla que hay debajo del dedo mientras se arrastra. Sin esto, con la
  // rejilla entera al 16% no hay forma de saber dónde se va a soltar: todas las
  // casillas se ven igual y el jugador suelta a ciegas.
  function resaltarSlot (lane, row, libre = true) {
    for (const c of slots.children) {
      const suya = c.userData.lane === lane && c.userData.row === row
      c.material.opacity = suya ? (libre ? 0.5 : 0.34) : 0.14
      c.material.color.setHex(suya ? (libre ? 0x8dffb8 : 0xff7a6a) : 0xffffff)
    }
  }

  // Encaja el campo en pantalla sea cual sea la forma del móvil.
  // Quien necesite enterarse de los cambios de tamaño se apunta aquí: el
  // compositor del resplandor tiene sus propios destinos de render y se queda a
  // media resolución si nadie se lo dice.
  const oyentesTam = []

  function resize () {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    // Si el lienzo mide cero — pestaña en segundo plano, contenedor todavía sin
    // medir — el aspecto sale 0/0 y toda la cadena se vuelve NaN: la cámara
    // queda con posición inválida y ya no se recupera sola. Mejor no tocar nada
    // y esperar al siguiente aviso de tamaño.
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
    const needed = (fieldWidth + 2.2) / 2 / Math.tan(hFov / 2)
    const dist = Math.max(needed, 26)
    // 30° dejaba una franja de cielo del 3%: no cabía nada volando. A 25° entra
    // cielo suficiente para que los pájaros y las nubes se vean de verdad.
    const pitch = THREE.MathUtils.degToRad(25)
    camera.position.set(0, camTarget.y + Math.sin(pitch) * dist, camTarget.z + Math.cos(pitch) * dist)
    camera.lookAt(camTarget)
    camera.updateProjectionMatrix()
    for (const fn of oyentesTam) fn(w, h)
  }

  // --- vestir la región ------------------------------------------------------
  //
  // Los doce destinos se jugaban en el mismo secarral ocre: daba igual que el
  // parte dijera Lagos o Vladivostok. Esto le pone a cada uno su tierra, su
  // cielo, su luz, su vegetación y, donde toca, su hito al fondo.
  //
  // Se RETIÑE y se enseña o esconde; no se reconstruye nada. Rehacer el mundo al
  // empezar cada nivel costaría la misma pausa que costaba generar las texturas,
  // y ya sabemos lo que se nota eso en un móvil viejo.
  const bosques = new Map()
  // Las bases alienígenas del fondo: tres modelos, uno visible cada vez.
  const bases = new Map()
  let baseVisible = null
  let bosqueVisible = null
  let bioma = null

  function poblar (clave, b, hitosMision = [], suelo = 'carretera') {
    const g = new THREE.Group()
    const borde = fieldWidth / 2 + 3.4
    // Los hitos de la misión se construyen ANTES que la vegetación, para saber
    // qué lados de la carretera ocupan.
    const deMision = []
    const ocupado = { '-1': false, '1': false }
    // Lados donde no va nada suelto: el del mar en una playa.
    const despejado = {}
    for (const [tipo, ...args] of hitosMision ?? []) {
      if (!HITOS[tipo]) continue
      const h = HITOS[tipo](...args)
      for (const l of h.userData.lados ?? []) ocupado[l] = true
      for (const l of h.userData.despejar ?? []) despejado[l] = true
      deMision.push(h)
    }
    for (const [tipo, tono, cuantos] of b.flora ?? []) {
      const hacer = FLORA[tipo]
      if (!hacer) continue
      for (let i = 0; i < cuantos; i++) {
        const pieza = hacer(tono)
        // A los lados de la carretera y nunca encima: el corredor central es por
        // donde se juega, y un árbol ahí tapa media partida.
        const lado = Math.random() < 0.5 ? -1 : 1
        if (despejado[lado]) continue
        // En el lado de un hito de ciudad, los árboles se quedan en la acera,
        // entre la calzada y los edificios: sueltos por el campo acababan
        // saliendo de dentro de un estanque o de una fachada.
        pieza.position.set(
          lado * (borde + Math.random() * (ocupado[lado] ? 2.5 : 26)),
          0,
          FIELD.spawnZ - 24 + Math.random() * (FIELD.baseZ - FIELD.spawnZ + 30)
        )
        pieza.rotation.y = Math.random() * Math.PI * 2
        pieza.traverse(o => { if (o.isMesh) o.castShadow = true })
        g.add(pieza)
      }
    }
    // Los restos van más pegados a la calzada que los árboles: lo que se quedó
    // tirado se quedó tirado EN la carretera o al borde, no en mitad del campo.
    // Coches y contenedores abandonados en la arena o en el césped no pintan nada.
    const sinRestos = suelo === 'playa' || suelo === 'parque'
    for (const [tipo, tono, cuantos] of sinRestos ? [] : (b.restos ?? [])) {
      const hacer = RESTOS[tipo]
      if (!hacer) continue
      for (let i = 0; i < cuantos; i++) {
        const pieza = hacer(tono)
        const lado = i % 2 ? 1 : -1
        pieza.position.x += lado * (borde + Math.random() * 7)
        pieza.position.z += FIELD.spawnZ - 18 + Math.random() * (FIELD.baseZ - FIELD.spawnZ + 14)
        pieza.rotation.y += Math.random() * Math.PI * 2
        pieza.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        g.add(pieza)
      }
    }

    if (b.hito) {
      const [tipo, ...args] = b.hito
      if (HITOS[tipo]) g.add(HITOS[tipo](...args))
    }
    // Los que llevan modelo de Meshy van aparte: llegan tarde y no se pueden
    // fundir con lo demás.
    // En las ciudades con avenida los huecos entre edificios ya están medidos
    // para el monumento; agrandarlo lo metería dentro de las fachadas.
    const conAvenida = deMision.some(h => (h.userData.lados?.length ?? 0) === 2)
    for (const h of deMision) {
      if (conAvenida || h.userData.acompaña || h.userData.aparte || (h.userData.lados?.length ?? 0) !== 1) continue
      agrandar(h)
    }
    const aparte = deMision.filter(h => h.userData.aparte)
    for (const h of deMision) if (!h.userData.aparte) g.add(h)
    // El monumento principal, para el vuelo de presentación: el primero que no
    // sea acompañamiento (la avenida, los microbuses, un cerro).
    // Sin monumento no hay vuelo: enfocar una playa entera o una avenida ponía la
    // cámara a cientos de metros.
    const principal = deMision.find(h => !h.userData.acompaña) ?? null
    let foco = null
    if (principal) {
      principal.updateMatrixWorld(true)
      foco = new THREE.Box3().setFromObject(principal)
    }
    // Se funden en un puñado de mallas, igual que el resto del decorado: veinte
    // árboles sueltos son veinte llamadas de dibujo por nada.
    const obstaculos = []
    medirAltos(g, obstaculos)
    for (const h of aparte) medirAltos(h, obstaculos)
    const fundido = bake(g, false)
    // El respaldo de código de los monumentos de Meshy también se funde: la
    // Eiffel de celosía son cientos de barras, y sin fundir serían cientos de
    // llamadas de dibujo si el modelo no llegara.
    for (const h of aparte) {
      const respaldo = h.children[0]
      if (respaldo) {
        const sitio = h.position.clone()
        h.position.set(0, 0, 0)
        h.updateMatrixWorld(true)
        const cocido = bake(respaldo, false)
        h.position.copy(sitio)
        h.remove(respaldo)
        h.add(cocido)
      }
      fundido.add(h)
    }
    fundido.userData.foco = foco
    fundido.userData.obstaculos = obstaculos
    // Si el principal es de Meshy su caja se mide al pedirla: el modelo llega
    // después y no ocupa lo mismo que el respaldo (el Coliseo de verdad es casi
    // el doble de ancho que el de código).
    fundido.userData.vivo = principal?.userData.aparte ? principal : null
    fundido.visible = false
    scene.add(fundido)
    bosques.set(clave, fundido)
    return fundido
  }

  // `hitosMision` son los monumentos de una ciudad concreta. Forman parte de la
  // llave del bosque: Valencia y Tarragona comparten bioma pero no paisaje.
  // `suelo`: 'parque' quita la carretera (París, el Campo de Marte).
  function vestir (clave, hitosMision = [], suelo = 'carretera', tonoSuelo = null) {
    const b = BIOMAS[clave]
    const llave = clave + '|' + (hitosMision ?? []).map(h => h.join(':')).join(',') + '|' + suelo + '|' + tonoSuelo
    if (!b || llave === bioma) return
    bioma = llave
    // La nave estrellada tapaba justo el sitio de los monumentos.
    const estrellada = scene.getObjectByName('nave-estrellada')
    if (estrellada) estrellada.visible = !(hitosMision?.length)
    // Al fondo, la base que venimos a limpiar. El modelo sale del nombre de la
    // misión: cada sitio tiene la suya y no cambia al repetir.
    let semilla = 7
    for (const c of llave) semilla = (semilla * 31 + c.charCodeAt(0)) >>> 0
    const variante = semilla % 3
    if (!bases.has(variante)) {
      const base = baseAlien(variante)
      scene.add(base)
      bases.set(variante, base)
    }
    for (const [v, base] of bases) base.visible = v === variante
    baseVisible = bases.get(variante)

    sand.material.color.setHex(b.tierra)
    road.material.color.setHex(b.asfalto)
    // Parque: fuera el asfalto y todo lo que solo existe sobre asfalto —rayas de
    // carril, baches, bordillos, vallas—; la calzada y el arenal pasan a césped.
    // Los carriles siguen estando, pero ya no se ven.
    const campo = texturaCampo(suelo)
    for (const m of soloCarretera) m.visible = !campo
    for (const m of pintables.mobiliarioVia ?? []) m.visible = !campo
    const conFarolas = !campo || suelo === 'adoquin' || suelo === 'losas'
    for (const m of pintables.farolas ?? []) m.visible = conFarolas
    road.material.map = campo ?? pielCarretera.map
    road.material.normalMap = campo ? null : pielCarretera.normalMap
    if (campo) road.material.color.setHex(tonoSuelo ?? COLOR_CAMPO[suelo] ?? 0xffffff)
    // El terreno de alrededor es de la región: arena solo en desierto y playa.
    const terreno = b.terreno ?? 'arena'
    const tierraTex = terreno === 'arena' ? null : texturaTerreno(terreno)
    sand.material.map = tierraTex ?? pielArena.map
    sand.material.normalMap = tierraTex ? null : pielArena.normalMap
    road.material.needsUpdate = true
    sand.material.needsUpdate = true
    // Los matojos secos del borde, fuera de la playa: no crecen en la arena del mar.
    pintables.matojo.visible = suelo !== 'playa'
    pintables.raya.color.setHex(b.raya)
    pintables.bordillo.color.setHex(b.bordillo)
    // El bordillo salpicado va un escalón más oscuro que el suyo, no a un gris
    // fijo: con un color fijo, sobre el hielo quedaban manchas pardas.
    pintables.bordilloOscuro.color.setHex(b.bordillo).multiplyScalar(0.74)
    pintables.cerro.color.setHex(b.cerro)
    pintables.meseta.color.setHex(b.meseta)
    // El matojo y la piedra tiran del tono de la tierra: puestos a un color
    // fijo, en la nieve quedaban dos manchas marrones flotando en blanco.
    pintables.matojo.color.setHex(b.cerro)
    pintables.piedra.color.setHex(b.meseta)

    scene.background.setHex(b.cielo)
    scene.fog.color.setHex(b.niebla)
    sun.color.setHex(b.sol)
    cielo.color.setHex(b.cielo)
    cielo.groundColor.setHex(b.ambiente)

    for (const [k, g] of bosques) g.visible = k === llave
    const mio = bosques.get(llave) ?? poblar(llave, b, hitosMision, suelo)
    mio.visible = true
    bosqueVisible = mio
  }

  return {
    // `sun` sale fuera porque el ajuste de calidad cambia el tamaño de su mapa
    // de sombras, y ese mapa es lo más caro que hay en la escena.
    renderer, scene, camera, sun, resize, slots, setSlotsVisible, resaltarSlot, vestir,
    // La base del fondo de esta misión: el asalto final la hace reventar.
    baseActual: () => baseVisible,
    // La caja del monumento de esta misión, para el vuelo de presentación.
    // Lo más alto del decorado entre dos profundidades (colinas, edificios,
    // monumentos y la base del fondo), para que lo que vuela pase por encima.
    alturaEn (zMin, zMax, xMin = -Infinity, xMax = Infinity) {
      let h = 0
      for (const lista of [obstaculosFijos, bosqueVisible?.userData.obstaculos ?? []]) {
        for (const o of lista) {
          if (o.maxZ >= zMin && o.minZ <= zMax && o.maxX >= xMin && o.minX <= xMax) h = Math.max(h, o.maxY)
        }
      }
      if (baseVisible?.visible) {
        const c = new THREE.Box3().setFromObject(baseVisible)
        if (c.max.z >= zMin && c.min.z <= zMax && c.max.x >= xMin && c.min.x <= xMax) h = Math.max(h, c.max.y)
      }
      return h
    },
    focoMonumento: () => {
      const vivo = bosqueVisible?.userData.vivo
      if (vivo) {
        vivo.updateMatrixWorld(true)
        return new THREE.Box3().setFromObject(vivo)
      }
      return bosqueVisible?.userData.foco ?? null
    },
    onResize (fn) { oyentesTam.push(fn) }
  }
}
