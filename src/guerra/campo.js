// El campo de la Guerra civil: dos bases en las puntas y una carretera que
// cruza por en medio. Provisional, hecho por código: el escenario de verdad de
// cada continente sale de Blender en la fase 2. Aquí solo hace falta que se lea
// quién está en cada lado y por dónde se pelea.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Todo lo que el resto del modo necesita saber del terreno.
export const CAMPO = {
  carriles: 5,
  anchoCarril: 2.4,
  // Líneas de base: quien las cruza entra en la base del otro.
  baseAzul: 10,      // la tuya, abajo
  baseRoja: -40,     // la del rival, arriba
  carretera: -15,    // el centro de la carretera
  anchoCarretera: 7
}
export const carrilX = c => (c - (CAMPO.carriles - 1) / 2) * CAMPO.anchoCarril
export const MITAD = (CAMPO.baseAzul + CAMPO.baseRoja) / 2

export const COLOR = { azul: 0x2f7de0, rojo: 0xd8403a }

export function crearCampo (lienzo) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x9fb4c4)
  scene.fog = new THREE.Fog(0x9fb4c4, 60, 150)
  // Las figuras de Meshy son metal y tela con PBR: sin entorno salen negras.
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x5a5040, 1.1))
  const sol = new THREE.DirectionalLight(0xfff1dc, 2.2)
  sol.position.set(12, 30, 10)
  scene.add(sol)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 220)

  scene.add(suelo(), carretera(), marcasDeCarril())
  scene.add(base('azul', CAMPO.baseAzul, 1), base('rojo', CAMPO.baseRoja, -1))

  function encuadrar () {
    const w = lienzo.clientWidth || window.innerWidth
    const h = lienzo.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // En vertical el ancho es lo que falta: se aleja la cámara hasta que los
    // cinco carriles caben con un poco de margen, en cualquier pantalla.
    const vista = Math.max(1, 0.62 / camera.aspect)
    camera.position.set(0, 21 * vista, CAMPO.baseAzul + 14 * vista)
    camera.lookAt(0, 0, MITAD + 2)
    camera.updateProjectionMatrix()
  }
  encuadrar()
  window.addEventListener('resize', encuadrar)

  return { renderer, scene, camera }
}

function suelo () {
  const g = new THREE.PlaneGeometry(260, 260, 1, 1)
  g.rotateX(-Math.PI / 2)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6d7a45, roughness: 1 }))
  m.position.y = -0.02
  // Tierra pisada en el frente, entre las dos bases.
  const frente = new THREE.Mesh(
    new THREE.PlaneGeometry(CAMPO.carriles * CAMPO.anchoCarril + 6, CAMPO.baseAzul - CAMPO.baseRoja + 16).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 })
  )
  frente.position.set(0, -0.01, MITAD)
  const grupo = new THREE.Group()
  grupo.add(m, frente)
  return grupo
}

function carretera () {
  const grupo = new THREE.Group()
  const asfalto = new THREE.Mesh(
    new THREE.PlaneGeometry(260, CAMPO.anchoCarretera).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.95 })
  )
  asfalto.position.set(0, 0.005, CAMPO.carretera)
  grupo.add(asfalto)
  const raya = new THREE.MeshBasicMaterial({ color: 0xe8e2c8 })
  for (let x = -60; x <= 60; x += 4) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.18).rotateX(-Math.PI / 2), raya)
    r.position.set(x, 0.01, CAMPO.carretera)
    grupo.add(r)
  }
  for (const lado of [-1, 1]) {
    const borde = new THREE.Mesh(new THREE.PlaneGeometry(260, 0.14).rotateX(-Math.PI / 2), raya)
    borde.position.set(0, 0.01, CAMPO.carretera + lado * (CAMPO.anchoCarretera / 2 - 0.4))
    grupo.add(borde)
  }
  // Un par de coches quemados fuera del frente, para que la carretera sea una
  // carretera y no una franja gris.
  const chapa = new THREE.MeshStandardMaterial({ color: 0x3b2f2a, roughness: 0.8, metalness: 0.3 })
  for (const [x, giro] of [[-11, 0.3], [12.5, -0.2], [-19, 1.2]]) {
    const coche = new THREE.Group()
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.8), chapa)
    cuerpo.position.y = 0.6
    const techo = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 1.6), chapa)
    techo.position.set(-0.2, 1.4, 0)
    coche.add(cuerpo, techo)
    coche.position.set(x, 0, CAMPO.carretera + 1)
    coche.rotation.y = giro
    grupo.add(coche)
  }
  return grupo
}

// «Carriles casi imperceptibles»: surcos de tierra muy suaves, que se notan si
// los buscas y no parecen una rejilla.
function marcasDeCarril () {
  const grupo = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0x5c4f38, transparent: true, opacity: 0.05, depthWrite: false })
  const largo = CAMPO.baseAzul - CAMPO.baseRoja
  for (let c = 0; c < CAMPO.carriles - 1; c++) {
    const x = carrilX(c) + CAMPO.anchoCarril / 2
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, largo).rotateX(-Math.PI / 2), mat)
    m.position.set(x, 0.012, MITAD)
    grupo.add(m)
  }
  return grupo
}

// La base: búnker, cuartel y campamento juntos (Isidro: «todo»), con sacos
// alrededor y la bandera del bando. `hacia` es hacia dónde queda el frente.
function base (bando, z, hacia) {
  const grupo = new THREE.Group()
  const color = COLOR[bando]
  const hormigon = new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.95 })
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 1 })
  const lona = new THREE.MeshStandardMaterial({ color: 0x5d6645, roughness: 1 })
  const saco = new THREE.MeshStandardMaterial({ color: 0xb9a176, roughness: 1 })
  const tinte = new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  const fondo = z + hacia * 7   // detrás de la línea

  // Búnker en el centro, con la tronera mirando al frente.
  const bunker = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 4.5), hormigon)
  bunker.position.set(0, 1.3, fondo)
  const tronera = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 0.1), oscuro)
  tronera.position.set(0, 1.9, fondo - hacia * 2.26)
  grupo.add(bunker, tronera)

  // Cuartel a un lado: dos plantas y tejado con el color del bando.
  const cuartel = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), hormigon)
  cuartel.position.set(-10, 2.5, fondo + hacia * 3)
  const tejado = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 5.4), tinte)
  tejado.position.set(-10, 5.25, fondo + hacia * 3)
  grupo.add(cuartel, tejado)
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.05), oscuro)
    v.position.set(-11.6 + i * 1.6, 3.4, fondo + hacia * 3 - hacia * 2.53)
    grupo.add(v)
  }

  // Campamento al otro lado: tres tiendas de lona.
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.9, 2, 4), lona)
    t.position.set(9 + (i % 2) * 3.4, 1, fondo + hacia * (i * 2.6 - 1))
    t.rotation.y = Math.PI / 4
    grupo.add(t)
  }

  // Muro de sacos a lo ancho, con un hueco en cada carril para entrar.
  for (let x = -8; x <= 8; x += 1.1) {
    if (Math.abs(((x + 6) % 2.4) - 1.2) < 0.5) continue
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.6, 3, 6).rotateZ(Math.PI / 2), saco)
    s.position.set(x, 0.3, z + hacia * 0.8)
    grupo.add(s)
  }

  // Bandera alta, que se vea desde la otra punta.
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), oscuro)
  mastil.position.set(4.5, 4, fondo)
  const bandera = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }))
  bandera.position.set(5.8, 7.1, fondo)
  bandera.name = 'bandera'
  grupo.add(mastil, bandera)
  grupo.userData.bandera = bandera
  return grupo
}
