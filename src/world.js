import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FIELD } from './config.js'
import { texturasDelSuelo } from './systems/texturas.js'
import { bake } from './assets.js'
import { BIOMAS, FLORA, HITOS, RESTOS } from './biomas.js'

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
  for (let i = 0; i < 4; i++) {
    const x = rand(-half + 0.6, half - 0.6)
    const z = rand(FIELD.spawnZ - 14, FIELD.baseZ)
    put(new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), flat(0x4a4742, 0.55)), x, z)
    put(new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 14), flat(0x6a665f, 0.5)), x, z, 0, 0.015)
  }
  // flechas de dirección descoloridas, apuntando hacia la base
  for (let i = 0; i < 3; i++) {
    const x = laneX(1 + i * 1.5)
    const z = FIELD.spawnZ - 4 - i * 11
    put(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.2), paintMat), x, z)
    put(new THREE.Mesh(new THREE.CircleGeometry(0.55, 3), paintMat), x, z + 1.4, -Math.PI / 2)
  }
}

// Decorado del borde de la carretera. Nada de esto interviene en el juego: está
// para que el campo no parezca una hoja de cálculo. Todo queda fuera de los
// carriles para no competir con las unidades.
// Lo que hay que poder reteñir al cambiar de región. Se recogen los materiales
// al construir en vez de buscarlos después recorriendo la escena: son siempre
// los mismos cuatro y así el cambio de bioma es asignar colores, no una batida.
function decorate (scene, pintables) {
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
  scene.add(wreckShip)

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
    scene.add(mound)
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

  for (let i = 0; i < 3; i++) {
    const side = i % 2 ? 1 : -1
    const sign = new THREE.Group()
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), std(0x8d8f92, 0.5, 0.4))
    post.position.y = 1.2
    sign.add(post)
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.8, 0.06), std(0xb9ac7e, 0.8))
    board.position.y = 2.1
    sign.add(board)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.03), std(0x6d2a22, 0.8))
    stripe.position.set(0, 2.1, -0.05)
    sign.add(stripe)
    sign.position.set(side * (fieldWidth / 2 + 2.1), 0, FIELD.baseZ - 9 - i * 13)
    sign.rotation.y = side * 0.25 + rand(-0.15, 0.15)
    sign.traverse(o => { if (o.isMesh) o.castShadow = true })
    scene.add(sign)
  }

  // Postes de luz caídos y en pie: dan altura al horizonte.
  const poleMat = std(0x6d6963, 0.7, 0.3)
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
  for (const side of [-1, 1]) {
    const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, roadLength), lineMat)
    edgeLine.rotation.x = -Math.PI / 2
    edgeLine.position.set(side * (fieldWidth / 2 + 0.42), 0.02, road.position.z)
    decor.add(edgeLine)

    const gravel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, roadLength),
      new THREE.MeshStandardMaterial({ color: 0xa8a196, roughness: 1 })
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
  decorate(decor, pintables)
  paintRoad(decor, pintables)
  // Sin oclusión: son piezas sueltas repartidas por el descampado, no hay
  // rincones entre ellas, y cocerla costaría media carga a cambio de nada.
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
  let bioma = null

  function poblar (clave, b) {
    const g = new THREE.Group()
    const borde = fieldWidth / 2 + 3.4
    for (const [tipo, tono, cuantos] of b.flora ?? []) {
      const hacer = FLORA[tipo]
      if (!hacer) continue
      for (let i = 0; i < cuantos; i++) {
        const pieza = hacer(tono)
        // A los lados de la carretera y nunca encima: el corredor central es por
        // donde se juega, y un árbol ahí tapa media partida.
        const lado = Math.random() < 0.5 ? -1 : 1
        pieza.position.set(
          lado * (borde + Math.random() * 26),
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
    for (const [tipo, tono, cuantos] of b.restos ?? []) {
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
    // Se funden en un puñado de mallas, igual que el resto del decorado: veinte
    // árboles sueltos son veinte llamadas de dibujo por nada.
    const fundido = bake(g, false)
    fundido.visible = false
    scene.add(fundido)
    bosques.set(clave, fundido)
    return fundido
  }

  function vestir (clave) {
    const b = BIOMAS[clave]
    if (!b || clave === bioma) return
    bioma = clave

    sand.material.color.setHex(b.tierra)
    road.material.color.setHex(b.asfalto)
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

    for (const [k, g] of bosques) g.visible = k === clave
    const mio = bosques.get(clave) ?? poblar(clave, b)
    mio.visible = true
  }

  return {
    // `sun` sale fuera porque el ajuste de calidad cambia el tamaño de su mapa
    // de sombras, y ese mapa es lo más caro que hay en la escena.
    renderer, scene, camera, sun, resize, slots, setSlotsVisible, resaltarSlot, vestir,
    onResize (fn) { oyentesTam.push(fn) }
  }
}
