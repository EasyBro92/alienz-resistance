import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FIELD, carrilAbierto, estrecharCampo } from './config.js'
import { texturasDelSuelo } from './systems/texturas.js'
import { bake } from './assets.js'
import { BIOMAS, FLORA, HITOS, RESTOS, baseAlien } from './biomas.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { apagarEmision } from './systems/resplandor.js'
import { crearRelieve } from './relieve.js'
import { ESCENARIOS } from './escenarios.js'

export const laneX = i => (i - (FIELD.lanes - 1) / 2) * FIELD.laneWidth
export const rowZ = r => FIELD.frontRowZ - r * FIELD.rowDepth
export const fieldWidth = FIELD.lanes * FIELD.laneWidth

export function laneFromX (x) {
  const i = Math.round(x / FIELD.laneWidth + (FIELD.lanes - 1) / 2)
  // Topado a los carriles ABIERTOS: arrastrando hacia la acera de un puente,
  // el soldado se queda en el ultimo carril bueno en vez de no poder soltarse.
  return Math.min(FIELD.ultimoCarril, Math.max(FIELD.primerCarril, i))
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
// La caja de un monumento sin su agua (mar, río, puerto): el agua ocupa mucho
// y no es lo que hay que encuadrar ni arrimar a la barandilla.
function cajaMonumento (h, caja = new THREE.Box3()) {
  caja.makeEmpty()
  h.updateMatrixWorld(true)
  h.traverse(o => { if (o.isMesh && !o.userData.sinFoco) caja.expandByObject(o) })
  if (caja.isEmpty()) caja.setFromObject(h)
  return caja
}

function agrandar (h) {
  const lado = h.userData.lados[0]
  const caja = cajaMonumento(h)
  const tam = caja.getSize(new THREE.Vector3())
  const factor = Math.min(1.8, 70 / Math.max(tam.z, 1), 60 / Math.max(tam.x, 1))
  if (factor > 1.02) h.scale.multiplyScalar(factor)
  cajaMonumento(h, caja)
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

  // --- el campamento de la base ----------------------------------------------
  //
  // Detrás de la línea roja no había nada: la base que defiendes era una raya
  // pintada en el suelo. Esto le pone su campamento —tiendas, sacos terreros,
  // un camión, la antena y los bidones—, pero a los lados y por fuera del
  // corredor: en el centro taparía la fila de delante, que es donde se juega.
  // Va en tonos apagados a propósito, porque es fondo y no tablero.
  const campo = new THREE.Group()
  const lona = std(0x5c6348, 0.95)
  const lonaOscura = std(0x474d38, 0.95)
  const saco = std(0x7d7358, 0.98)
  const chapa = std(0x4a5140, 0.7, 0.25)
  const acero = std(0x6e7472, 0.55, 0.5)

  for (const side of [-1, 1]) {
    const x0 = side * (fieldWidth / 2 + 1.1)

    // Dos tiendas de campaña: un prisma tumbado de seis caras hace la lona.
    for (let i = 0; i < 2; i++) {
      const tienda = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.2, 3, 1, true), i ? lonaOscura : lona)
      tienda.rotation.set(0, 0, Math.PI / 2)
      tienda.rotation.y = Math.PI / 6
      tienda.position.set(x0 + side * (0.9 + i * 1.5), 0.75, -11 - i * 7)
      tienda.scale.set(1, 1, 0.78)
      campo.add(tienda)
    }

    // Muro de sacos terreros mirando al campo: dos hileras, la de arriba a media
    // traba, como se apilan de verdad.
    for (let fila = 0; fila < 2; fila++) {
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 3, 6), saco)
        s.rotation.z = Math.PI / 2
        s.position.set(x0 + side * (fila ? 0.31 : 0), 0.22 + fila * 0.4, -5.6 - i * 0.62)
        campo.add(s)
      }
    }

    // Bidones y cajas sueltos, que es lo que hace que un campamento parezca
    // usado y no una maqueta.
    for (let i = 0; i < 3; i++) {
      const caja = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), chapa)
      caja.position.set(x0 + side * rand(0.4, 2.6), 0.25, rand(-20, -4))
      caja.rotation.y = rand(0, Math.PI)
      campo.add(caja)
    }
  }

  // El camión de intendencia, a un lado, y la antena de mando al otro.
  const camion = new THREE.Group()
  const caja = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 4.4), lonaOscura)
  caja.position.y = 1.35
  camion.add(caja)
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(2, 1.25, 1.7), chapa)
  cabina.position.set(0, 1.2, 2.9)
  camion.add(cabina)
  for (const [x, z] of [[-1, 2.6], [1, 2.6], [-1, -0.6], [1, -0.6], [-1, -1.9], [1, -1.9]]) {
    const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.36, 10), std(0x22262a, 0.95))
    rueda.rotation.z = Math.PI / 2
    rueda.position.set(x * 1.05, 0.55, z)
    camion.add(rueda)
  }
  camion.position.set(-(fieldWidth / 2 + 1.7), 0, -17)
  camion.rotation.y = 0.12
  campo.add(camion)

  const antena = new THREE.Group()
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.4, 6), acero)
  mastil.position.y = 2.7
  antena.add(mastil)
  const plato = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), chapa)
  plato.position.set(0, 4.6, 0.3)
  plato.rotation.x = -1.15
  antena.add(plato)
  for (let i = 0; i < 3; i++) {
    const viento = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.6, 4), acero)
    const a = i * Math.PI * 2 / 3
    viento.position.set(Math.cos(a) * 0.9, 2.2, Math.sin(a) * 0.9)
    viento.rotation.set(Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38)
    antena.add(viento)
  }
  antena.position.set(fieldWidth / 2 + 1.6, 0, -20)
  campo.add(antena)

  campo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  scene.add(campo)

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

  // --- el cielo --------------------------------------------------------------
  //
  // Antes era un color liso, y el horizonte se leía como una raya: la niebla
  // acababa en un tono y el cielo empezaba en otro. Ahora es una cúpula con
  // degradado, del color de la niebla abajo al del cielo arriba, así que la
  // tierra se funde con el aire como pasa de verdad y el cielo gana hondura.
  //
  // Va sin niebla (la cúpula ES el fondo) y sigue a la cámara: si se quedara
  // quieta, en el vuelo de presentación se le vería el borde.
  const cielos = {
    cenit: { value: new THREE.Color(0x4f8fc8) },
    horizonte: { value: new THREE.Color(0xc2d6dd) }
  }
  const cupula = new THREE.Mesh(
    new THREE.SphereGeometry(185, 24, 12),
    new THREE.ShaderMaterial({
      uniforms: cielos,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main () {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 cenit;
        uniform vec3 horizonte;
        varying vec3 vDir;
        void main () {
          // Casi todo el cambio ocurre cerca del horizonte, que es lo que se ve
          // desde la cámara del juego: arriba del todo casi no se mira.
          float h = pow(clamp(vDir.y + 0.02, 0.0, 1.0), 0.5);
          gl_FragColor = vec4(mix(horizonte, cenit, h), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })
  )
  cupula.renderOrder = -10
  cupula.frustumCulled = false
  cupula.onBeforeRender = (r, s, cam) => { cupula.position.copy(cam.position) }
  scene.add(cupula)

  // --- la ciudad al fondo ------------------------------------------------------
  //
  // Una fila de edificios en el horizonte, detrás de los cerros, casi comida por
  // la niebla. No se ve ningún detalle y no hace falta: basta el perfil para que
  // se sepa que ahí detrás hay una ciudad que estás defendiendo, que es la
  // profundidad que le faltaba al fondo. Solo sale en las regiones con ciudad;
  // en la taiga o en el desierto un perfil de rascacielos no pinta nada.
  const perfil = new THREE.Group()
  const matPerfil = new THREE.MeshLambertMaterial({ color: 0x7d8a92 })
  const geoBloque = new THREE.BoxGeometry(1, 1, 1)
  // Las cuarenta y seis torres van en UNA malla. Eran cuarenta y seis llamadas
  // de dibujado para quinientos triángulos: lo que ahoga a un móvil no son los
  // triángulos, son las llamadas, y esto es un perfil quieto en el horizonte
  // que no se toca nunca.
  const trozos = []
  const meterBloque = (sx, sy, sz, x, y, z) => {
    const g = geoBloque.clone()
    g.scale(sx, sy, sz)
    g.translate(x, y, z)
    trozos.push(g)
  }
  for (let i = 0; i < 46; i++) {
    const ancho = 3 + Math.random() * 6
    // Más altos hacia el centro, como el centro de una ciudad de verdad.
    const x = (Math.random() - 0.5) * 150
    const alto = (6 + Math.random() * 12) * (1.25 - Math.min(1, Math.abs(x) / 75) * 0.6)
    const z = -104 - Math.random() * 12
    meterBloque(ancho, alto, 4 + Math.random() * 4, x, alto / 2 - 1, z)
    // Alguna antena en lo alto de los más altos: rompe la fila de cajas.
    if (alto > 16 && Math.random() < 0.5) {
      const altoAntena = 4 + Math.random() * 3
      meterBloque(0.3, altoAntena, 0.3, x, alto - 1 + altoAntena / 2, z)
    }
  }
  perfil.add(new THREE.Mesh(mergeGeometries(trozos, false), matPerfil))
  perfil.visible = false
  scene.add(perfil)
  const CON_CIUDAD = new Set(['ciudad', 'costa', 'mediterraneo', 'egeo', 'parque', 'caribe', 'monzon'])

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
  // El arenal ya no es un solo cuadro liso: lleva una rejilla con el paso
  // GRADUADO —fina donde se juega y basta hacia el fondo— para poder moldearle
  // el relieve. Uniforme no valía: para que se lea un montículo de 10 de radio
  // hace falta un paso de 3, y a paso 3 en 480 × 480 salen 51.000 triángulos
  // para dibujar arena que además está detrás de la niebla. Graduada son 11.000
  // y el detalle se concentra donde se mira.
  function ejeGraduado (min, max, finoMin, finoMax, paso, factor) {
    const c = []
    for (let v = finoMin; v <= finoMax + 1e-6; v += paso) c.push(v)
    let p = paso; let v = finoMin
    while (v > min) { p *= factor; v = Math.max(v - p, min); c.unshift(v) }
    p = paso; v = finoMax
    while (v < max) { p *= factor; v = Math.min(v + p, max); c.push(v) }
    return c
  }
  const ejeX = ejeGraduado(-240, 240, -60, 60, 3, 1.35)
  const ejeZ = ejeGraduado(-380, 100, -210, 40, 3, 1.35)
  const geoArenal = (() => {
    const g = new THREE.BufferGeometry()
    const pos = []; const uv = []; const idx = []
    for (const z of ejeZ) {
      for (const x of ejeX) {
        pos.push(x, 0, z)
        // Las mismas coordenadas de textura que tenía el plano de antes, para
        // que la repetición de 24 siga cayendo cada 20 unidades.
        uv.push((x + 240) / 480, (z + 380) / 480)
      }
    }
    const ancho = ejeX.length
    for (let j = 0; j < ejeZ.length - 1; j++) {
      for (let i = 0; i < ancho - 1; i++) {
        const a = j * ancho + i
        idx.push(a, a + ancho, a + 1, a + 1, a + ancho, a + ancho + 1)
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  })()

  const sand = new THREE.Mesh(
    geoArenal,
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
  // La rejilla ya viene tumbada y en coordenadas del mundo: ni giro ni traslado.
  sand.receiveShadow = true
  scene.add(sand)

  // El relieve del tramo que se esté jugando. Lo monta `poblar`, que es quien
  // sabe qué lados ocupa el monumento; mientras no haya ninguno, todo plano.
  let relieve = null
  const alturaSuelo = (x, z) => (relieve ? relieve.alto(x, z) : 0)

  // Moldear el arenal: subir cada vértice a su altura y rehacer las normales,
  // que sin eso el terreno sube y baja pero la luz lo sigue tratando como un
  // plano y no se ve ni una loma.
  function moldearArenal () {
    const pos = sand.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, alturaSuelo(pos.getX(i), pos.getZ(i)))
    }
    pos.needsUpdate = true
    sand.geometry.computeVertexNormals()
    sand.geometry.computeBoundingSphere()
  }

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
  // La lámina con los detalles de la región (piedras, charcos, hojas, hielo…),
  // un pelo por encima del campo. Sin escribir en el buffer de profundidad: lo
  // que se coloque encima —soldados, cascotes, charcos de icor— la tapa igual.
  const detalleSuelo = new THREE.Mesh(
    road.geometry,
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.85 })
  )
  detalleSuelo.rotation.x = -Math.PI / 2
  detalleSuelo.position.set(0, 0.014, road.position.z)
  detalleSuelo.renderOrder = 1
  detalleSuelo.visible = false
  scene.add(detalleSuelo)
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
  // La textura de los detalles de región: fondo transparente y encima lo que
  // pida el bioma. Va en su propia lámina sobre el campo (`detalleSuelo`), así
  // que sirve igual sobre asfalto, adoquín, nieve o arena.
  const LADO_DETALLE = 7
  function texturaDetalle (clave, extra) {
    return lienzo(`detalle:${clave}`, (x, n) => {
      for (const [tipo, color, cuantas] of extra) EXTRAS[tipo]?.(x, n, color, cuantas)
    }, (fieldWidth + 1.6) / LADO_DETALLE, roadLength / LADO_DETALLE)
  }
  const mancha = (x, n, color, cuantas, rMin, rMax) => {
    for (let k = 0; k < cuantas; k++) {
      x.fillStyle = color(Math.random())
      x.beginPath()
      x.arc(Math.random() * n, Math.random() * n, rMin + Math.random() * (rMax - rMin), 0, Math.PI * 2)
      x.fill()
    }
  }
  // --- lo que hace distinto el suelo de cada país ---------------------------
  //
  // La baldosa base dice de qué es el suelo (tierra, losas, nieve…); esto dice
  // DÓNDE está. Se pinta encima de la misma baldosa, así que dos misiones con la
  // misma tierra no se parecen: la de Egipto tiene arena amontonada y piedras,
  // la de la India charcos, y la de Vladivostok hielo y pisadas. Cada bioma pide
  // los suyos en `sueloExtra`.
  const rgba = (c, a) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`
  const EXTRAS = {
    // Grietas ramificadas, como las del barro seco o el asfalto viejo.
    grietas (x, n, color, cuantas) {
      x.lineCap = 'round'
      for (let k = 0; k < cuantas; k++) {
        let px = Math.random() * n
        let py = Math.random() * n
        let ang = Math.random() * Math.PI * 2
        x.strokeStyle = rgba(color, 0.18 + Math.random() * 0.22)
        x.lineWidth = 0.7 + Math.random()
        x.beginPath()
        x.moveTo(px, py)
        const tramos = 3 + Math.floor(Math.random() * 4)
        for (let i = 0; i < tramos; i++) {
          ang += (Math.random() - 0.5) * 1.1
          px += Math.cos(ang) * (4 + Math.random() * 9)
          py += Math.sin(ang) * (4 + Math.random() * 9)
          x.lineTo(px, py)
        }
        x.stroke()
      }
    },
    // Charcos: mancha oscura con un reflejo claro arriba.
    charcos (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const cx = Math.random() * n
        const cy = Math.random() * n
        const r = 5 + Math.random() * 13
        x.fillStyle = rgba(color, 0.3)
        x.beginPath()
        x.ellipse(cx, cy, r, r * (0.5 + Math.random() * 0.3), Math.random() * 3, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = 'rgba(255,255,255,0.14)'
        x.beginPath()
        x.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.45, r * 0.16, 0.3, 0, Math.PI * 2)
        x.fill()
      }
    },
    // Hojarasca: hojitas sueltas, cada una girada a su aire.
    hojas (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        x.save()
        x.translate(Math.random() * n, Math.random() * n)
        x.rotate(Math.random() * Math.PI)
        x.fillStyle = rgba(color, 0.3 + Math.random() * 0.4)
        x.beginPath()
        x.ellipse(0, 0, 2.5 + Math.random() * 3.5, 1 + Math.random() * 1.4, 0, 0, Math.PI * 2)
        x.fill()
        x.restore()
      }
    },
    // Placas de hielo: claras, con el borde marcado.
    hielo (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const cx = Math.random() * n
        const cy = Math.random() * n
        const r = 8 + Math.random() * 18
        x.beginPath()
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2
          const rr = r * (0.7 + Math.random() * 0.5)
          x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7)
        }
        x.closePath()
        x.fillStyle = rgba(color, 0.22)
        x.fill()
        x.strokeStyle = 'rgba(255,255,255,0.35)'
        x.lineWidth = 1
        x.stroke()
      }
    },
    // Ceniza y carbonilla: motas finas y algún manchón apagado.
    ceniza (x, n, color, cuantas) {
      mancha(x, n, a => rgba(color, a * 0.16), Math.round(cuantas / 6), 8, 26)
      for (let k = 0; k < cuantas; k++) {
        x.fillStyle = rgba(color, 0.25 + Math.random() * 0.45)
        x.fillRect(Math.random() * n, Math.random() * n, 1, 1 + Math.random())
      }
    },
    // Piedras sueltas, con su sombrita para que se despeguen del suelo.
    piedras (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const cx = Math.random() * n
        const cy = Math.random() * n
        const r = 1.2 + Math.random() * 2.6
        x.fillStyle = 'rgba(0,0,0,0.16)'
        x.beginPath()
        x.ellipse(cx + 0.8, cy + 0.8, r, r * 0.8, 0, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = rgba(color, 0.55 + Math.random() * 0.35)
        x.beginPath()
        x.ellipse(cx, cy, r, r * 0.8, Math.random() * 3, 0, Math.PI * 2)
        x.fill()
      }
    },
    // Musgo en las juntas y en los rincones húmedos.
    musgo (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const cx = Math.random() * n
        const cy = Math.random() * n
        x.fillStyle = rgba(color, 0.1 + Math.random() * 0.2)
        x.beginPath()
        x.ellipse(cx, cy, 3 + Math.random() * 9, 2 + Math.random() * 5, Math.random() * 3, 0, Math.PI * 2)
        x.fill()
      }
    },
    // Roderas: las rodadas que dejan los camiones a lo largo del tramo.
    roderas (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const px = Math.random() * n
        x.fillStyle = rgba(color, 0.12)
        x.fillRect(px, 0, 5 + Math.random() * 7, n)
        x.fillStyle = rgba(color, 0.08)
        x.fillRect(px - 9, 0, 4, n)
      }
    },
    // Pisadas: rastros de huellas que se pierden.
    huellas (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        let px = Math.random() * n
        let py = Math.random() * n
        const ang = Math.random() * Math.PI * 2
        const pasos = 4 + Math.floor(Math.random() * 5)
        for (let i = 0; i < pasos; i++) {
          x.save()
          x.translate(px + (i % 2 ? 3 : -3) * Math.cos(ang + 1.57), py + (i % 2 ? 3 : -3) * Math.sin(ang + 1.57))
          x.rotate(ang)
          x.fillStyle = rgba(color, 0.16)
          x.beginPath()
          x.ellipse(0, 0, 1.6, 3.2, 0, 0, Math.PI * 2)
          x.fill()
          x.restore()
          px += Math.cos(ang) * 7
          py += Math.sin(ang) * 7
        }
      }
    },
    // Arena que el viento amontona sobre el suelo duro.
    arenaSuelta (x, n, color, cuantas) {
      for (let k = 0; k < cuantas; k++) {
        const cx = Math.random() * n
        const cy = Math.random() * n
        x.fillStyle = rgba(color, 0.12 + Math.random() * 0.2)
        x.beginPath()
        x.ellipse(cx, cy, 10 + Math.random() * 26, 3 + Math.random() * 7, Math.random() * 0.6 - 0.3, 0, Math.PI * 2)
        x.fill()
      }
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
  // Los veintidós chevrones se juntan en dos mallas, una por color, y los dos
  // raíles en una: son veinticuatro llamadas de dibujado para cuarenta y ocho
  // triángulos, y están pintados en el suelo, quietos, delante de la cámara.
  const chevronGeo = new THREE.PlaneGeometry(W / N * 0.95, 0.5)
  const chevrones = [[], []]
  for (let i = 0; i < N; i++) {
    const g = chevronGeo.clone()
    g.rotateZ(0.5)                           // inclinado: chevrón, no damero
    g.rotateX(-Math.PI / 2)
    g.translate(-W / 2 + (i + 0.5) * W / N, 0.03, FIELD.baseZ)
    chevrones[i % 2].push(g)
  }
  scene.add(new THREE.Mesh(mergeGeometries(chevrones[0], false), hazardB))
  scene.add(new THREE.Mesh(mergeGeometries(chevrones[1], false), hazardA))
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8d8f92, roughness: 0.5, metalness: 0.4 })
  const railes = [-0.3, 0.3].map(dz => {
    const g = new THREE.BoxGeometry(W, 0.06, 0.08)
    g.translate(0, 0.03, FIELD.baseZ + dz)
    return g
  })
  scene.add(new THREE.Mesh(mergeGeometries(railes, false), railMat))

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
  // Guardado, no solo anadido: dentro de un escenario cerrado hay que poder
  // esconderlo entero. En el puente, los camiones y los sacos de la cuneta
  // quedaban flotando sobre el mar.
  // Los materiales que se usan como INTERRUPTOR (apagar el material apaga su
  // parte del decorado) tienen que quedarse cada uno en su malla: si la fusión
  // los mete en un grupo con otro representante, apagarlos no apaga nada. Esto
  // es lo que dejaba los cerros puestos en la playa de Punta Cana.
  for (const m of [...soloCarretera, ...(pintables.mobiliarioVia ?? []), ...(pintables.farolas ?? []), pintables.cerro, pintables.meseta, pintables.matojo]) {
    if (m) m.userData.solo = true
  }
  const decoradoFijo = bake(decor, false)
  scene.add(decoradoFijo)

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
      // En un tramo estrecho los carriles cerrados no ofrecen casilla: si se
      // enseñan, el jugador apunta ahí y el toque no hace nada.
      const abierto = carrilAbierto(c.userData.lane)
      c.visible = abierto
      c.material.opacity = on && abierto ? 0.16 : 0
      c.material.color.setHex(0xffffff)
    }
  }

  // La casilla que hay debajo del dedo mientras se arrastra. Sin esto, con la
  // rejilla entera al 16% no hay forma de saber dónde se va a soltar: todas las
  // casillas se ven igual y el jugador suelta a ciegas.
  function resaltarSlot (lane, row, libre = true) {
    for (const c of slots.children) {
      const suya = c.userData.lane === lane && c.userData.row === row
      const suCarril = c.userData.lane === lane
      // El carril entero se enciende un punto más que el resto: al soltar a un
      // soldado, lo que importa no es solo la casilla, es por dónde le van a
      // venir. Con la rejilla plana no se leía el carril que estabas eligiendo.
      c.material.opacity = suya ? (libre ? 0.5 : 0.34) : suCarril ? 0.26 : 0.12
      c.material.color.setHex(suya ? (libre ? 0x8dffb8 : 0xff7a6a) : suCarril ? 0xd6ffe6 : 0xffffff)
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

  function poblar (clave, b, hitosMision = [], suelo = 'carretera', dentroDeLugar = false) {
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

    // El relieve, ya sabiendo qué lados ocupa el monumento: donde hay
    // monumento no se mete terreno, que ya trae el suyo. La semilla es la clave
    // del tramo, así que cada sitio tiene SIEMPRE el mismo terreno y las
    // piedras no bailan al reintentar la misión.
    //
    // Se guarda CON su decorado, no en una variable suelta: el decorado se
    // cachea por bioma y solo se construye una vez, así que un relieve global
    // se quedaba pegado al del último tramo construido y el arenal no se
    // correspondía con el sitio que estabas jugando.
    const relieveTramo = crearRelieve(clave, {
      borde,
      desdeZ: FIELD.spawnZ - 40,
      hastaZ: FIELD.baseZ + 10,
      ocupado
    })
    // Dentro de un lugar no se suelta nada por el campo: los arboles, las
    // farolas y lo tirado por el suelo los pone el lugar, colocados donde tienen
    // sentido. Sueltos salian palmeras creciendo dentro de una fachada.
    for (const [tipo, tono, cuantos] of dentroDeLugar ? [] : (b.flora ?? [])) {
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
    const sinRestos = dentroDeLugar || suelo === 'playa' || suelo === 'parque'
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

    // Árboles y restos, a la altura que les toque. Se colocan a y = 0 y hasta
    // aquí el suelo era plano, así que valía; ahora hay que subirlos o se
    // quedan enterrados en una loma o flotando sobre una hondonada.
    // Va antes del monumento a propósito: el monumento trae su propia
    // explanada y en su lado no se ha puesto relieve.
    for (const pieza of g.children) {
      pieza.position.y += relieveTramo.alto(pieza.position.x, pieza.position.z)
    }

    // El hito de REGION (el que comparten las tres misiones de un pais) no
    // entra en un lugar: cada sitio trae el suyo propio.
    if (b.hito && !dentroDeLugar) {
      const [tipo, ...args] = b.hito
      if (HITOS[tipo]) g.add(HITOS[tipo](...args))
    }
    // Los que llevan modelo de Meshy van aparte: llegan tarde y no se pueden
    // fundir con lo demás.
    // En las ciudades con avenida los huecos entre edificios ya están medidos
    // para el monumento; agrandarlo lo metería dentro de las fachadas.
    const conAvenida = deMision.some(h => (h.userData.lados?.length ?? 0) === 2)
    for (const h of deMision) {
      if (dentroDeLugar || conAvenida || h.userData.acompaña || h.userData.aparte || (h.userData.lados?.length ?? 0) !== 1) continue
      agrandar(h)
    }
    // Dentro de un lugar el monumento se pone a CERRAR EL EJE, que es como se ve
    // en cualquier foto del sitio: el Coliseo al final de la Via dei Fori, la
    // Puerta de la India al fondo del Rajpath, el Empire State cerrando la
    // Quinta Avenida. Centrado y detras de donde aparecen los bichos (z = -52),
    // asi que no estorba el pasillo. El segundo y el tercero, a los lados y mas
    // atras, que son acompañamiento.
    if (dentroDeLugar) {
      let n = 0
      for (const h of deMision) {
        let caja = cajaMonumento(h)
        if (caja.isEmpty()) continue
        let t = caja.getSize(new THREE.Vector3())
        // DOS cajas, y hacen falta las dos. `cajaMonumento` deja fuera lo
        // marcado `sinFoco` —el agua, las pirámides, las montañas, los
        // rascacielos de relleno—, que es lo que hay que mirar para saber cómo
        // de grande se ve LA COSA que da nombre al sitio. Pero para COLOCARLO
        // hay que contar con todo: en Gizeh la caja del foco es la Esfinge, y
        // centrando por ella las pirámides se iban a x = 70 y z = -209, o sea
        // detrás de la niebla y fuera de la pantalla. Se veía una explanada de
        // arena vacía.
        const todo = new THREE.Box3().setFromObject(h)
        let tt = todo.getSize(new THREE.Vector3())
        // El principal se agranda hasta llenar el final de la calle. Estaban
        // hechos para mirarlos de lado a once metros, y puestos al fondo del eje
        // se quedaban en un juguete. Los topes salen del encuadre del móvil
        // vertical: más de 46 de ancho no cabe, y por encima de unos 40 de alto
        // a esa distancia ya lo tapa el marcador.
        //
        // Los de Meshy no se tocan: su caja de verdad llega con el modelo, y
        // agrandar el respaldo de código dejaría una Estatua de la Libertad de
        // cien metros en cuanto cargara la buena.
        if (n === 0 && !h.userData.aparte) {
          // Se agranda hasta llenar el final de la calle, pero sin que el
          // conjunto entero se salga: más de 100 de ancho no cabe en la cuña
          // que se ve en un móvil vertical y más de 84 de fondo se lo come la
          // niebla, que cierra del todo a z ≈ -130.
          const f = Math.min(2.4,
            46 / Math.max(t.x, 1), 40 / Math.max(t.y, 1),
            100 / Math.max(tt.x, 1), 84 / Math.max(tt.z, 1))
          if (f < 0.98 || f > 1.05) {
            h.scale.multiplyScalar(f)
            caja = cajaMonumento(h)
            t = caja.getSize(new THREE.Vector3())
            todo.setFromObject(h)
            tt = todo.getSize(new THREE.Vector3())
          }
        }
        const c = todo.getCenter(new THREE.Vector3())
        // Su cara de delante justo detrás de donde aparecen los bichos (-52):
        // así se ve grande sin estorbar el pasillo.
        const destino = n === 0
          ? new THREE.Vector3(0, 0, -56 - tt.z / 2)
          : new THREE.Vector3((n % 2 ? 1 : -1) * (30 + Math.min(40, tt.x) / 2), 0, -100)
        h.position.x += destino.x - c.x
        h.position.z += destino.z - c.z
        n++
      }
    }
    const aparte = deMision.filter(h => h.userData.aparte)
    for (const h of deMision) if (!h.userData.aparte) g.add(h)
    // El monumento principal, para el vuelo de presentación: el primero que no
    // sea acompañamiento (la avenida, los microbuses, un cerro).
    // Sin monumento no hay vuelo: enfocar una playa entera o una avenida ponía la
    // cámara a cientos de metros.
    const principal = deMision.find(h => !h.userData.acompaña) ?? null
    let foco = null
    if (principal) foco = cajaMonumento(principal)
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
    // Desde dónde lo mira el vuelo. Si el monumento no pide un ángulo propio, uno
    // aéreo: por encima de la carretera, por delante y en diagonal, como una foto
    // de dron. Los de Meshy siguen con el vuelo de siempre: su caja cambia cuando
    // llega el modelo.
    let vista = principal?.userData.vista ?? null
    if (!vista && foco && !principal.userData.aparte) {
      const c = foco.getCenter(new THREE.Vector3())
      const t = foco.getSize(new THREE.Vector3())
      const lado = Math.sign(c.x) || 1
      // Con el ancho topado: un conjunto de cien metros ponía la cámara tan lejos
      // que la niebla se lo comía entero.
      const ancho = Math.min(80, Math.max(t.x, t.z))
      // Los muy altos (rascacielos, torres) se miran desde más atrás y más
      // arriba, o la cámara se quedaba a media altura del fuste.
      const altoExtra = Math.max(0, t.y - 30)
      vista = {
        desde: [c.x - lado * (ancho * 0.5 + 10 + altoExtra * 0.2), Math.min(64, Math.max(conAvenida ? 40 : 26, t.y * 1.1 + 16)), c.z + ancho * 0.85 + 20 + altoExtra * 0.6],
        mira: [c.x, t.y * 0.3, c.z]
      }
    }
    fundido.userData.vista = vista
    // El relieve viaja con el decorado fundido, que es lo que se cachea y lo
    // que devuelve esta funcion; en el grupo suelto se perdia al fundir.
    fundido.userData.relieve = relieveTramo
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
  // La hora del día de cada región. No es adorno: el sol bajo alarga las
  // sombras por la calzada y cambia por completo la cara de un nivel, así que
  // doce destinos seguidos dejan de parecer el mismo mediodía con otra pintura.
  // El sol se mueve y cambia de fuerza; el contraluz sube donde el sol baja,
  // para que las siluetas se sigan leyendo.
  const HORAS = {
    dia: { pos: [-11, 36, 13], sol: 2.6, rim: 0.7, ambiente: 0.6, ancho: 16 },
    alto: { pos: [-4, 44, 6], sol: 3.0, rim: 0.5, ambiente: 0.75, ancho: 16 },
    // Con el sol bajo, la sombra de un soldado se va cuatro metros de lado: si
    // la caja de sombra no se ensancha con él, se corta en seco a media calzada.
    tarde: { pos: [-26, 15, 16], sol: 2.4, rim: 0.9, ambiente: 0.55, ancho: 26 },
    ocaso: { pos: [-32, 9, 12], sol: 2.0, rim: 1.15, ambiente: 0.5, ancho: 32 },
    manana: { pos: [22, 18, 14], sol: 2.3, rim: 0.85, ambiente: 0.6, ancho: 24 },
    // Las arenas del duelo: de noche, y la "luz del sol" hace de foco de estadio,
    // alto y a un lado, para que el campo se vea claro y lo de alrededor no.
    noche: { pos: [16, 34, 18], sol: 1.75, rim: 0.3, ambiente: 0.3, ancho: 20 }
  }

  // --- arenas del 1 contra 1 -----------------------------------------------------
  //
  // Hechas en Blender (herramientas/blender/) con piezas del propio juego. Se
  // cargan la primera vez que hacen falta y luego solo se enseñan o esconden.
  // Por nombre, el juego encuentra lo que tiene que moverse: el público
  // (publico_0…2, cada grupo con su ritmo) y los platillos (platillo_0…).
  const cargadorArenas = new GLTFLoader().setDRACOLoader(
    new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).setDecoderConfig({ type: 'wasm' })
  )
  const arenas = new Map()
  let arenaPedida = null
  let arenaVista = null
  let vitoreo = 0
  // --- tramos que se juegan DENTRO de algo -----------------------------------
  // Un escenario no es un monumento más: se traga todo lo de alrededor —el
  // arenal, la vegetación, los cerros— y decide cuántos carriles quedan
  // abiertos. Se construye una vez y se guarda, como las arenas.
  const escenariosHechos = new Map()
  let escenarioVisto = null
  // Si el escenario se come el horizonte. Lo miran el bosque, los cerros y el
  // mobiliario de la carretera al final de `vestir`.
  let escenarioTapa = false
  function ponerEscenario (nombre) {
    for (const [n, g] of escenariosHechos) g.visible = n === nombre
    if (nombre && !escenariosHechos.has(nombre) && ESCENARIOS[nombre]) {
      const crudo = ESCENARIOS[nombre]()
      // Fundido: el estadio son casi cuatro mil piezas entre peldanos y butacas,
      // y como grupo suelto eso es una llamada de dibujo por butaca. Fundido se
      // queda en una por material. Nada de esto se mueve, asi que no se pierde.
      const g = bake(crudo, false)
      g.userData = crudo.userData
      // El nombre también: `bake` devuelve un grupo nuevo, y sin esto no hay forma
      // de saber desde fuera qué sitio se está viendo.
      g.name = crudo.name
      // Lo de `extra` se funde APARTE y cuelga en su propio grupo: es la ciudad
      // de alrededor del estadio, que solo se enciende durante el vuelo de
      // llegada. Fundida junto con el estadio no habría forma de apagarla —
      // `bake` junta por material y mezclaría ladrillo con hormigón.
      if (crudo.userData.extra) {
        const ciudad = bake(crudo.userData.extra, false)
        ciudad.name = 'ciudad'
        ciudad.visible = false
        g.add(ciudad)
        g.userData.ciudad = ciudad
      }
      // El estadio pide no proyectar sombra (`sinSombra`): es un cajón cerrado de
      // 36 de alto y el sol del juego va bajo, así que su techo dejaba TODO el
      // graderío a oscuras. Lo que tiene que proyectar sombra son los soldados y
      // los bichos, no el decorado.
      const sombra = !crudo.userData.sinSombra
      g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = sombra } })
      scene.add(g)
      escenariosHechos.set(nombre, g)
    }
    escenarioVisto = nombre ? escenariosHechos.get(nombre) ?? null : null
    // Al cambiar de escenario la ciudad se apaga siempre: solo la enciende el
    // vuelo de llegada, y solo en la historia.
    for (const [, e] of escenariosHechos) if (e.userData.ciudad) e.userData.ciudad.visible = false
    // El campo se estrecha a lo que pida el escenario, y vuelve a los cinco
    // carriles en cuanto se sale de él.
    estrecharCampo(escenarioVisto?.userData.carriles ?? FIELD.lanes)
    // Las casillas de los carriles cerrados, fuera desde el primer momento y no
    // solo cuando se arrastra: si no, el dedo apunta ahi y el toque no hace nada.
    for (const c of slots.children) c.visible = carrilAbierto(c.userData.lane)
    // Lo de alrededor sobra: el puente va por encima del mar y un arenal a la
    // altura de la calzada lo convertiría otra vez en una carretera.
    escenarioTapa = !!escenarioVisto?.userData.tapaElMundo
    sand.visible = !escenarioTapa
    decoradoFijo.visible = !escenarioTapa
  }

  // --- la escalera de la grada -----------------------------------------------
  //
  // Isidro: «en la arena no quiero que vengan naves, que los enemigos vengan
  // del fondo y ya, he visto que hay una escalera, quiero que vayan bajando por
  // la escalera».
  //
  // La escalera es el graderío (en el Cráter, la ladera). No se copian aquí los
  // números de los scripts de Blender —serían tres juegos de números que se
  // desincronizan en cuanto se retoque una arena—: se MIDE la malla ya cargada
  // tirando rayos hacia abajo, una sola vez, y queda una tablita de alturas.
  // Medido: 3.744 triángulos y unos 0,12 ms por rayo, así que la tabla entera
  // sale por menos de una décima de segundo al cargar la arena.
  const GRADA = {
    x0: -9, x1: 9, pasoX: 1.5,      // solo el ancho por donde se baja al campo
    z0: -88, z1: -56, pasoZ: 0.8
  }
  const rayo = new THREE.Raycaster()
  const abajo = new THREE.Vector3(0, -1, 0)
  const desde = new THREE.Vector3()

  function medirGrada (g) {
    const suelos = []
    g.traverse(o => { if (o.isMesh && /graderio|ladera/.test(o.name)) suelos.push(o) })
    if (!suelos.length) return null
    const nx = Math.round((GRADA.x1 - GRADA.x0) / GRADA.pasoX) + 1
    const nz = Math.round((GRADA.z1 - GRADA.z0) / GRADA.pasoZ) + 1
    const datos = new Float32Array(nx * nz)
    let cima = null
    let alto = null
    for (let j = 0; j < nz; j++) {
      const z = GRADA.z0 + j * GRADA.pasoZ
      for (let i = 0; i < nx; i++) {
        const x = GRADA.x0 + i * GRADA.pasoX
        // Desde bien arriba: el graderío del Coliseo sube a 11,6.
        rayo.set(desde.set(x, 60, z), abajo)
        const tocado = rayo.intersectObjects(suelos, true)
        const y = tocado.length ? tocado[0].point.y : 0
        datos[j * nx + i] = y
        // La cima es el punto MÁS ALTO del centro, no el primero que aparece:
        // el Coliseo es una escalera que sube hasta el último escalón, pero el
        // Cráter es un borde que sube y vuelve a bajar por fuera, y naciendo en
        // lo primero que se toca saldrían en la falda de fuera, de espaldas al
        // campo. Con empate (el escalón de arriba es plano) se queda el de más
        // atrás, que deja sitio para nacer.
        if (Math.abs(x) < 1.6 && y > (alto ?? 0) + 0.2) { alto = y; cima = z }
      }
    }
    return { nx, nz, datos, cima }
  }

  // Altura del graderío bajo un punto, con interpolación: los escalones se
  // siguen notando (miden 1,9 de huella y la tabla va a 0,8) pero la figura no
  // pega botes de un fotograma.
  function alturaGrada (x, z) {
    const p = arenaVista?.userData?.grada
    if (!p) return 0
    const fx = (x - GRADA.x0) / GRADA.pasoX
    const fz = (z - GRADA.z0) / GRADA.pasoZ
    if (fx < 0 || fz < 0 || fx > p.nx - 1 || fz > p.nz - 1) return 0
    const i = Math.floor(fx); const j = Math.floor(fz)
    const i2 = Math.min(i + 1, p.nx - 1); const j2 = Math.min(j + 1, p.nz - 1)
    const tx = fx - i; const tz = fz - j
    const a = p.datos[j * p.nx + i] * (1 - tx) + p.datos[j * p.nx + i2] * tx
    const b = p.datos[j2 * p.nx + i] * (1 - tx) + p.datos[j2 * p.nx + i2] * tx
    return a * (1 - tz) + b * tz
  }

  // El escalón de arriba de la arena que se esté jugando, o nada si no hay.
  const cimaGrada = () => arenaVista?.userData?.grada?.cima ?? null

  function ponerArena (nombre) {
    arenaPedida = nombre
    for (const [n, a] of arenas) if (a.grupo) a.grupo.visible = n === nombre
    arenaVista = nombre ? arenas.get(nombre)?.grupo ?? null : null
    if (!nombre || arenas.has(nombre)) return
    const a = { grupo: null }
    arenas.set(nombre, a)
    cargadorArenas.loadAsync(`${import.meta.env.BASE_URL}models/${nombre}.glb`).then(gltf => {
      const g = gltf.scene
      // Los paneles de los focos SÍ brillan; lo demás, como el resto de modelos.
      g.traverse(o => {
        if (!o.isMesh) return
        // Lo que se llama foco_… o brillo… (o su material) conserva su luz.
        if (!/^(foco_|brillo)/.test(o.name) && !/^(foco|brillo)/.test(o.material?.name ?? '')) apagarEmision(o)
        o.receiveShadow = /graderio|palco|ladera|pedestal/.test(o.name)
        o.castShadow = false
      })
      g.userData.publico = [0, 1, 2].map(i => g.getObjectByName(`publico_${i}`)).filter(Boolean)
      // El grupo está donde estaba su primer alien, no en el suelo: se guarda su
      // altura para mecerlo SUMANDO a ella.
      for (const p of g.userData.publico) p.userData.y0 = p.position.y
      g.add(destellos(g.userData.publico))
      g.userData.platillos = [0, 1].map(i => g.getObjectByName(`platillo_${i}`)).filter(Boolean)
        .map(o => ({ o, r: Math.hypot(o.position.x, o.position.z + 60), y: o.position.y, a: Math.atan2(o.position.z + 60, o.position.x) }))
      g.userData.grada = medirGrada(g)
      scene.add(g)
      a.grupo = g
      g.visible = arenaPedida === nombre
      if (g.visible) arenaVista = g
    }).catch(e => console.warn('Sin arena:', e))
  }

  // Flashes de cámara por la grada: puntos sobre las cabezas del público que se
  // encienden un instante cada uno a su ritmo. De noche es lo que dice "aquí
  // hay un estadio lleno", y cuesta una sola llamada de dibujo.
  let matDestellos = null
  function destellos (publico) {
    const pos = []
    const fase = []
    const v = new THREE.Vector3()
    // Cada grupo llega como varias mallas, una por material (tipo de alien).
    const mallas = []
    for (const g of publico) g.traverse(o => { if (o.isMesh) mallas.push(o) })
    for (const p of mallas) {
      p.updateMatrixWorld(true)
      const at = p.geometry.attributes.position
      // Vértices al azar de la mitad de arriba de cada figura: las cabezas y
      // las manos, más o menos, que es de donde sale un flash.
      for (let i = 0; i < 40; i++) {
        v.fromBufferAttribute(at, Math.floor(Math.random() * at.count)).applyMatrix4(p.matrixWorld)
        pos.push(v.x, v.y + 0.6, v.z)
        fase.push(Math.random() * 100, 0.4 + Math.random() * 1.4)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('fase', new THREE.Float32BufferAttribute(fase, 2))
    matDestellos = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 } },
      vertexShader: `
        attribute vec2 fase;
        uniform float t;
        varying float vLuz;
        void main () {
          float s = fract(t * fase.y * 0.23 + fase.x);
          vLuz = pow(max(0.0, 1.0 - s * 14.0), 2.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 26.0 * vLuz * (60.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vLuz;
        void main () {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vLuz;
          gl_FragColor = vec4(1.0, 0.97, 0.9, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    })
    const puntos = new THREE.Points(geo, matDestellos)
    puntos.frustumCulled = false
    return puntos
  }

  // El público: cada grupo se mece a su ritmo, y cuando pasa algo gordo
  // (vitorear) saltan todos un rato.
  function animarArena (dt) {
    const g = arenaVista
    if (!g) return
    const t = performance.now() / 1000
    vitoreo = Math.max(0, vitoreo - dt * 0.6)
    // Con el público animado, más flashes.
    if (matDestellos) matDestellos.uniforms.t.value = t * (1 + vitoreo * 2)
    g.userData.publico.forEach((p, i) => {
      const salto = Math.abs(Math.sin(t * (2.2 + i * 0.7) + i * 2.1))
      p.position.y = p.userData.y0 + salto * (0.08 + vitoreo * 0.55)
    })
    g.userData.platillos.forEach((p, i) => {
      const a = p.a + t * (0.12 + i * 0.05) * (i % 2 ? -1 : 1)
      p.o.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.8 + i) * 0.8, -60 + Math.sin(a) * p.r)
      p.o.rotation.y = t * 0.6
    })
  }

  // `fondo` lo trae la misión (campo `fondo` en `campana.js`) y manda sobre lo
  // que decide la región:
  //   · `ciudad: false` quita el perfil de rascacielos del horizonte,
  //   · `cerros: false` quita los montículos y las mesetas,
  //   · `terreno: 'arena'` cambia lo que hay a los lados de la calzada.
  //
  // Isidro: «hay edificios o montañas en algunas zonas de playa, o edificios al
  // fondo sin sentido». Y los había, porque todo eso se decidía por REGIÓN: el
  // mismo interruptor valía para Punta Cana y para Nueva York por ser las dos
  // «costa». Ahora la región pone el valor por defecto y cada sitio corrige el
  // suyo.
  function vestir (clave, hitosMision = [], suelo = 'carretera', tonoSuelo = null, escenario = null, fondo = null) {
    const b = BIOMAS[clave]
    const llave = clave + '|' + (hitosMision ?? []).map(h => h.join(':')).join(',') + '|' + suelo + '|' + tonoSuelo + '|' + escenario +
      '|' + (fondo ? JSON.stringify(fondo) : '')
    if (!b || llave === bioma) return
    bioma = llave
    ponerEscenario(escenario)
    // La nave estrellada tapaba justo el sitio de los monumentos.
    const estrellada = scene.getObjectByName('nave-estrellada')
    // Y tampoco dentro de un escenario: en el puente aparecia flotando sobre el mar.
    if (estrellada) estrellada.visible = !(hitosMision?.length) && !b.arena && !escenarioTapa
    // En una arena, el recinto cierra el horizonte: fuera cerros y mesetas.
    ponerArena(b.arena ?? null)
    // Los cerros y las mesetas, salvo donde el sitio es llano de verdad.
    //
    // OJO: esto se escribía en `pintables.cerro`, que es un MATERIAL, y a un
    // material no se le puede decir `visible`: la línea no hacía nada y los
    // cerros salían hasta en la playa de Punta Cana. Se apaga el grupo que los
    // contiene, que es `ridge`.
    const conCerros = (fondo?.cerros ?? true) && !b.arena && !escenarioTapa
    pintables.cerro.visible = conCerros
    pintables.meseta.visible = conCerros
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
    // Dónde se planta. Normalmente al fondo del todo, en la niebla; un escenario
    // puede pedir otro sitio, y el estadio lo hace: con el césped recortado, la
    // de siempre se quedaba por detrás del graderío.
    baseVisible.position.z = escenarioVisto?.userData.baseZ ?? -108

    sand.material.color.setHex(b.tierra)
    road.material.color.setHex(b.asfalto)
    // Parque: fuera el asfalto y todo lo que solo existe sobre asfalto —rayas de
    // carril, baches, bordillos, vallas—; la calzada y el arenal pasan a césped.
    // Los carriles siguen estando, pero ya no se ven.
    const campo = texturaCampo(suelo)
    for (const m of soloCarretera) m.visible = !campo
    for (const m of pintables.mobiliarioVia ?? []) m.visible = !campo && !escenarioTapa
    // Dentro de un lugar las farolas las pone el lugar, con la forma que le
    // toque (fernandina en Marsella, recta en Salonica). Las del mundo se
    // apagan o saldrian dos juegos de farolas en la misma acera.
    const conFarolas = (!campo || suelo === 'adoquin' || suelo === 'losas') && !escenarioTapa
    for (const m of pintables.farolas ?? []) m.visible = conFarolas
    // Los detalles de la región, encima de lo que sea el suelo.
    const extra = b.sueloExtra
    detalleSuelo.visible = !!extra?.length
    if (extra?.length) detalleSuelo.material.map = texturaDetalle(clave, extra)
    road.material.map = campo ?? pielCarretera.map
    road.material.normalMap = campo ? null : pielCarretera.normalMap
    if (campo) road.material.color.setHex(tonoSuelo ?? COLOR_CAMPO[suelo] ?? 0xffffff)
    // El terreno de alrededor es de la región: arena solo en desierto y playa.
    const terreno = fondo?.terreno ?? b.terreno ?? 'arena'
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

    scene.background.setHex(fondo?.cielo ?? b.cielo)
    scene.fog.color.setHex(fondo?.niebla ?? b.niebla)
    scene.fog.near = fondo?.nieblaCerca ?? 62
    scene.fog.far = fondo?.nieblaLejos ?? 152
    // Arriba, el cielo de la región un punto más hondo; abajo, su niebla, para
    // que el horizonte no tenga costura.
    cielos.cenit.value.setHex(b.cielo).multiplyScalar(0.78)
    cielos.horizonte.value.setHex(b.niebla)
    // El perfil de la ciudad, en el tono de los cerros de la región y un punto
    // más frío: lejos, todo tira a azul.
    perfil.visible = (fondo?.ciudad ?? CON_CIUDAD.has(clave)) && !escenarioTapa
    matPerfil.color.setHex(b.cerro).lerp(new THREE.Color(b.niebla), 0.35).multiplyScalar(0.8)
    sun.color.setHex(b.sol)
    cielo.color.setHex(fondo?.cielo ?? b.cielo)
    cielo.groundColor.setHex(fondo?.ambiente ?? b.ambiente)

    const hora = HORAS[fondo?.hora ?? b.hora] ?? HORAS.dia
    sun.position.set(...hora.pos)
    sun.intensity = hora.sol
    rim.intensity = hora.rim
    cielo.intensity = hora.ambiente
    sun.shadow.camera.left = -hora.ancho
    sun.shadow.camera.right = hora.ancho
    sun.shadow.camera.updateProjectionMatrix()

    for (const [k, g] of bosques) g.visible = k === llave
    // `conHitos` lo traen los lugares de `ciudades.js`: se tragan el decorado
    // de carretera igual que el puente, pero dejan el monumento de la ciudad,
    // que es lo que cierra el eje de la calle.
    const dentroDeLugar = !!escenarioVisto?.userData.conHitos
    const mio = bosques.get(llave) ?? poblar(llave, b, hitosMision, suelo, dentroDeLugar)
    // En un escenario cerrado, el decorado de carretera no pinta nada.
    mio.visible = !escenarioTapa || dentroDeLugar
    bosqueVisible = mio
    // El arenal se moldea al relieve del tramo que toca. Aquí y no en `poblar`,
    // que solo se ejecuta la primera vez que se ve cada bioma.
    relieve = mio.userData.relieve ?? null
    moldearArenal()
  }

  return {
    // `sun` sale fuera porque el ajuste de calidad cambia el tamaño de su mapa
    // de sombras, y ese mapa es lo más caro que hay en la escena.
    // `road` sale para el Escarbador: sus cascotes usan el material del suelo.
    renderer, scene, camera, sun, resize, slots, setSlotsVisible, resaltarSlot, vestir, road,
    animarArena,
    // La altura del terreno en un punto. Dentro del pasillo de juego es cero
    // siempre: la calzada no se toca.
    alturaSuelo,
    // La escalera de la arena: a qué altura está el graderío bajo un punto y
    // en qué z queda su escalón más alto (donde nacen los alienz del duelo).
    alturaGrada,
    cimaGrada,
    // La ciudad de alrededor del estadio: encendida durante el plano de llegada
    // y apagada el resto del tiempo (jugando estás dentro y no se ve ni una
    // ventana). Devuelve si había ciudad que encender.
    verCiudad (encendida) {
      const ciudad = escenarioVisto?.userData.ciudad
      if (!ciudad) return false
      ciudad.visible = encendida
      return true
    },
    vitorear: (fuerza = 1) => { vitoreo = Math.min(1, vitoreo + fuerza) },
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
        // Sin el haz de luz: es transparente y sube setenta unidades, y con él en
        // la cuenta todo lo que volaba acababa por encima del encuadre.
        const c = new THREE.Box3()
        baseVisible.updateMatrixWorld(true)
        baseVisible.traverse(o => { if (o.isMesh && !o.material.transparent) c.expandByObject(o) })
        if (!c.isEmpty() && c.max.z >= zMin && c.min.z <= zMax && c.max.x >= xMin && c.min.x <= xMax) h = Math.max(h, c.max.y)
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
    vistaMonumento: () => bosqueVisible?.userData.vista ?? null,
    onResize (fn) { oyentesTam.push(fn) }
  }
}
