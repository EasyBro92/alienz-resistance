// El campo de la Guerra civil.
//
// Isidro, al ver la primera versión: «se ve muy básico, usa elementos ya
// creados en otros mapas y dale sentido al mapa». El sentido: UN PUEBLO PARTIDO
// POR LA CARRETERA. Abajo el barrio azul, arriba el rojo; cada uno ha
// fortificado su plaza al final de la calle (la base) y la carretera de en
// medio es tierra de nadie, con lo que quedó de los primeros días: coches
// quemados, un autobús atravesado, contenedores y erizos a los lados.
//
// Todo son piezas que ya existen: las casas y bloques de las ciudades
// (`monumentos/piezas.js`), los restos de la campaña (`RESTOS`, `FLORA`), el
// suelo y el asfalto dibujados por código (`texturas.js`) y las defensas de
// Blender. Lo quieto se funde con `bake`, como en la campaña: lo que ahoga al
// móvil son las llamadas de dibujado, no los triángulos.
//
// El escenario de verdad de cada continente sale de Blender en la fase 2; este
// es el pueblo «de serie».

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { bake, buildDefensaMesh } from '../assets.js'
import { texturasDelSuelo } from '../systems/texturas.js'
import { RESTOS, FLORA } from '../biomas.js'
import { casitas, bloques, coche, farola, mat, pon, geoCaja, geoCil } from '../monumentos/piezas.js'

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

// La calle: el frente va de x = -6 a 6; las aceras llegan a 9 y las fachadas
// empiezan en 10. Nada macizo por dentro de ±6,6, que es por donde se anda.
const LIBRE = 6.6
const ACERA = 9.4

// Semilla fija: el mismo pueblo cada partida.
let semilla = 7
const azar = (a, b) => { semilla = (semilla * 16807) % 2147483647; return a + (semilla / 2147483647) * (b - a) }
const elige = l => l[Math.floor(azar(0, l.length))]

export function crearCampo (lienzo) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  // Cielo de tarde con humo: la guerra se nota también en el aire.
  const cielo = 0xb9a58c
  scene.background = new THREE.Color(cielo)
  scene.fog = new THREE.Fog(cielo, 55, 140)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x4a4036, 0.65))
  const sol = new THREE.DirectionalLight(0xffd9a8, 1.7)
  sol.position.set(-18, 30, 6)
  sol.target.position.set(0, 0, MITAD)
  sol.castShadow = true
  sol.shadow.mapSize.set(1024, 1024)
  Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 40, bottom: -40, near: 1, far: 90 })
  scene.add(sol, sol.target)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.6, 220)

  // Lo quieto, fundido en pocas mallas.
  const quieto = new THREE.Group()
  suelo(quieto)
  calle(quieto)
  barrio(quieto, 'azul')
  barrio(quieto, 'rojo')
  tierraDeNadie(quieto)
  plaza(quieto, 'azul')
  plaza(quieto, 'rojo')
  const fundido = bake(quieto, false)
  fundido.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  scene.add(fundido)

  // El suelo aparte: lleva textura y no se funde.
  const sueloTex = sueloConTextura()
  scene.add(sueloTex)

  // Lo que se mueve o viene de fuera va suelto.
  const vivo = new THREE.Group()
  scene.add(vivo)
  const banderas = []
  const telas = {}
  for (const bando of ['azul', 'rojo']) {
    const lista = banderasDe(vivo, bando)
    telas[bando] = lista[0].material
    banderas.push(...lista)
  }

  // El emblema de la compañía, pintado en su color de fondo. Un lienzo de
  // 256 × 160, la proporción de la tela: el emoji se dibuja con la letra del
  // sistema, así que en cada móvil sale con su propio dibujo.
  function emblema (bando, icono) {
    const tela = telas[bando]
    const lienzo = document.createElement('canvas')
    lienzo.width = 256; lienzo.height = 160
    const ctx = lienzo.getContext('2d')
    ctx.fillStyle = '#' + COLOR[bando].toString(16).padStart(6, '0')
    ctx.fillRect(0, 0, 256, 160)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(0, 0, 256, 10); ctx.fillRect(0, 150, 256, 10)
    if (icono) {
      ctx.beginPath(); ctx.arc(128, 80, 58, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill()
      ctx.font = '76px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(icono, 128, 86)
    }
    const tex = new THREE.CanvasTexture(lienzo)
    tex.colorSpace = THREE.SRGBColorSpace
    tela.map?.dispose()
    tela.map = tex
    tela.color.set(0xffffff)
    tela.needsUpdate = true
    escudoEnElSuelo(bando, icono)
  }

  // Y grande en el suelo de su mitad, como el escudo pintado en un campo: las
  // banderas de tu plaza caen por debajo del cuadro y así el emblema se ve
  // toda la partida. Tumbado hacia la cámara, se lee derecho en los dos lados.
  const escudos = {}
  function escudoEnElSuelo (bando, icono) {
    const lienzo = document.createElement('canvas')
    lienzo.width = lienzo.height = 256
    const ctx = lienzo.getContext('2d')
    const col = '#' + COLOR[bando].toString(16).padStart(6, '0')
    ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2)
    ctx.lineWidth = 12; ctx.strokeStyle = col; ctx.stroke()
    ctx.fillStyle = 'rgba(20,24,30,0.35)'; ctx.fill()
    ctx.font = '150px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(icono, 128, 138)
    const tex = new THREE.CanvasTexture(lienzo)
    tex.colorSpace = THREE.SRGBColorSpace
    if (!escudos[bando]) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 5.2).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, depthWrite: false })
      )
      m.position.set(0, 0.02, bando === 'azul' ? CAMPO.baseAzul - 11 : CAMPO.baseRoja + 10)
      m.rotation.y = girado ? Math.PI : 0
      scene.add(m)
      escudos[bando] = m
    }
    escudos[bando].material.map?.dispose()
    escudos[bando].material.map = tex
    escudos[bando].material.needsUpdate = true
  }
  const humos = columnasDeHumo(vivo)
  const barricadas = new THREE.Group()
  vivo.add(barricadas)
  barricadasDeBlender(barricadas)

  // El mapa de PRUEBA (29/09): el mismo pueblo hecho en Blender con piezas de
  // Kenney y Quaternius (herramientas/blender/prueba_mapa.py). Se carga la
  // primera vez que se pide y apaga el pueblo de siempre; las banderas, el humo
  // y los escudos del suelo se quedan, que valen para los dos.
  let prueba = null
  async function ponerMapa (nombre) {
    const esPrueba = nombre === 'prueba'
    if (esPrueba && !prueba) {
      const cargador = new GLTFLoader().setDRACOLoader(
        new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).setDecoderConfig({ type: 'wasm' }))
      const gltf = await cargador.loadAsync(`${import.meta.env.BASE_URL}models/lugar-prueba.glb`)
      prueba = gltf.scene
      prueba.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true } })
      scene.add(prueba)
    }
    if (prueba) prueba.visible = esPrueba
    fundido.visible = !esPrueba
    sueloTex.visible = !esPrueba
    barricadas.visible = !esPrueba
  }

  // Quien juega de rojo lo ve todo desde su lado: la cámara se pone detrás de
  // la base roja, mirando hacia la azul. Los escudos del suelo se giran con
  // ella para que se sigan leyendo derechos.
  let girado = false
  function girar (si) {
    girado = !!si
    for (const m of Object.values(escudos)) m.rotation.y = girado ? Math.PI : 0
    encuadrar()
  }

  function encuadrar () {
    const w = lienzo.clientWidth || window.innerWidth
    const h = lienzo.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // En vertical el ancho es lo que falta: se aleja la cámara hasta que los
    // cinco carriles caben con un poco de margen, en cualquier pantalla.
    const vista = Math.max(1, 0.62 / camera.aspect)
    if (girado) {
      camera.position.set(0, 21 * vista, CAMPO.baseRoja - 14 * vista)
      camera.lookAt(0, 0, MITAD - 2)
    } else {
      camera.position.set(0, 21 * vista, CAMPO.baseAzul + 14 * vista)
      camera.lookAt(0, 0, MITAD + 2)
    }
    camera.updateProjectionMatrix()
  }
  encuadrar()
  window.addEventListener('resize', encuadrar)

  // Banderas que ondean y humo que sube: lo poco que se mueve en el decorado.
  function animar (t) {
    for (const b of banderas) {
      const p = b.geometry.attributes.position
      const base = b.userData.base
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3]
        p.setZ(i, Math.sin(t * 3 + x * 2.2 + b.userData.fase) * 0.12 * (x + 0.8))
      }
      p.needsUpdate = true
    }
    for (const h of humos) {
      for (const bola of h.children) {
        bola.userData.v = (bola.userData.v + 0.004) % 1
        const v = bola.userData.v
        bola.position.set(Math.sin(v * 5 + bola.userData.f) * 0.6 + v * 2.5, v * 14, Math.cos(v * 4) * 0.4)
        bola.scale.setScalar(0.7 + v * 2.6)
        bola.material.opacity = 0.42 * (1 - v)
      }
    }
  }

  return { renderer, scene, camera, animar, emblema, girar, ponerMapa }
}

// --- suelo ---------------------------------------------------------------------
function sueloConTextura () {
  const piel = texturasDelSuelo()
  const grupo = new THREE.Group()
  // Tierra pisada alrededor: la textura de arena de la campaña, oscurecida.
  const tierra = new THREE.MeshStandardMaterial({
    color: 0x7a6a52, roughness: 1,
    map: piel.arena.map.clone(), normalMap: piel.arena.normalMap.clone()
  })
  for (const t of [tierra.map, tierra.normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.needsUpdate = true }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), tierra)
  m.position.set(0, -0.02, MITAD)
  m.receiveShadow = true
  grupo.add(m)
  // La carretera con el asfalto de verdad.
  const asf = new THREE.MeshStandardMaterial({
    color: 0x8d8d8d, roughness: 0.95,
    map: piel.asfalto.map.clone(), normalMap: piel.asfalto.normalMap?.clone() ?? null
  })
  for (const t of [asf.map, asf.normalMap]) { if (!t) continue; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 1.2); t.needsUpdate = true }
  const via = new THREE.Mesh(new THREE.PlaneGeometry(280, CAMPO.anchoCarretera).rotateX(-Math.PI / 2), asf)
  via.position.set(0, 0.004, CAMPO.carretera)
  via.receiveShadow = true
  grupo.add(via)
  return grupo
}

function suelo (g) {
  // La calle de cada barrio: adoquín gris entre las aceras, más claro que la
  // tierra, para que el frente se lea como una calle y no como un descampado.
  const calle = mat(0x6e675c, 1)
  for (const [z0, z1] of [[CAMPO.baseAzul + 2, CAMPO.carretera + CAMPO.anchoCarretera / 2], [CAMPO.carretera - CAMPO.anchoCarretera / 2, CAMPO.baseRoja - 2]]) {
    const largo = z0 - z1
    pon(g, new THREE.PlaneGeometry(ACERA * 2, largo).rotateX(-Math.PI / 2), calle, 0, 0.002, (z0 + z1) / 2)
  }
  // Surcos de los carriles, casi invisibles (Isidro: «carriles casi
  // imperceptibles»): se notan si se buscan.
  const surco = mat(0x7d7466, 1)
  for (let c = 0; c < CAMPO.carriles - 1; c++) {
    const x = carrilX(c) + CAMPO.anchoCarril / 2
    for (const [z0, z1] of [[CAMPO.baseAzul, CAMPO.carretera + 3.6], [CAMPO.carretera - 3.6, CAMPO.baseRoja]]) {
      pon(g, new THREE.PlaneGeometry(0.1, z0 - z1).rotateX(-Math.PI / 2), surco, x, 0.006, (z0 + z1) / 2)
    }
  }
}

// --- la carretera y lo que quedó en ella ----------------------------------------
function calle (g) {
  const raya = mat(0xe6dfc5, 0.8)
  const z = CAMPO.carretera
  for (let x = -130; x <= 130; x += 5) pon(g, new THREE.PlaneGeometry(2.4, 0.16).rotateX(-Math.PI / 2), raya, x, 0.012, z)
  for (const lado of [-1, 1]) {
    pon(g, new THREE.PlaneGeometry(280, 0.14).rotateX(-Math.PI / 2), raya, 0, 0.012, z + lado * (CAMPO.anchoCarretera / 2 - 0.5))
    // Bordillo.
    pon(g, geoCaja(280, 0.18, 0.35), mat(0xb5ad9d, 0.9), 0, 0.09, z + lado * (CAMPO.anchoCarretera / 2 + 0.1))
  }
  // Aceras a lo largo de la calle de cada barrio, con su bordillo.
  const acera = mat(0x948c7e, 0.95)
  for (const lado of [-1, 1]) {
    for (const [z0, z1] of [[CAMPO.baseAzul + 4, z + 4], [z - 4, CAMPO.baseRoja - 4]]) {
      pon(g, geoCaja(ACERA - LIBRE - 0.4, 0.16, z0 - z1), acera, lado * (LIBRE + (ACERA - LIBRE) / 2 + 0.2), 0.08, (z0 + z1) / 2)
    }
  }
  // Farolas en las aceras, algunas dobladas.
  for (const lado of [-1, 1]) {
    for (let zz = CAMPO.baseAzul; zz >= CAMPO.baseRoja; zz -= 8) {
      if (Math.abs(zz - z) < 5) continue
      const f = new THREE.Group()
      farola(f, 0, 0, 5)
      f.position.set(lado * (ACERA - 0.6), 0, zz)
      if (azar(0, 1) < 0.3) f.rotation.z = lado * azar(0.2, 0.45)
      g.add(f)
    }
  }
  // Guardarraíl a los lados de la carretera, fuera del frente.
  const metal = mat(0x9aa0a4, 0.4, 0.6)
  for (const lado of [-1, 1]) {
    for (const zz of [z - 4.2, z + 4.2]) {
      pon(g, geoCaja(60, 0.3, 0.08), metal, lado * (ACERA + 31), 0.6, zz)
      for (let x = ACERA + 2; x < ACERA + 60; x += 3) pon(g, geoCaja(0.12, 0.6, 0.12), metal, lado * x, 0.3, zz)
    }
  }
}

function tierraDeNadie (g) {
  const z = CAMPO.carretera
  const quemado = [0x2c2622, 0x3a2f28, 0x33302c]
  // Coches quemados en la carretera, a los lados del frente y fuera de él.
  for (const [x, zz, giro] of [[-9.5, z + 1.3, 0.35], [10.5, z - 1, -0.3], [-15, z - 0.8, 1.4], [17, z + 1, 1.7], [-24, z, 1.6], [26, z - 1.2, 1.3]]) {
    coche(g, x, zz, giro, elige(quemado))
  }
  // Un autobús atravesado a la izquierda y una camioneta volcada a la derecha:
  // lo que cortó la carretera el primer día.
  const bus = RESTOS.autobus(0x6a4a2e)
  bus.position.set(-13, 0, z + 0.3)
  bus.rotation.set(0, 1.2, 0)
  g.add(bus)
  const cam = RESTOS.camioneta(0x3f4a3a)
  cam.position.set(13.5, 0, z + 1.5)
  cam.rotation.set(0, -0.6, 0.12)
  g.add(cam)
  // Contenedores de obra en las esquinas del cruce.
  for (const [x, zz, giro, tono] of [[-11, z + 6, 0.1, 0x7a3b2a], [12, z - 6.5, -0.15, 0x2f5a6b]]) {
    const c = RESTOS.contenedor(tono)
    c.position.set(x, 0, zz)
    c.rotation.y = giro
    c.scale.setScalar(0.7)
    g.add(c)
  }
  // Escombros sueltos por el asfalto (planos, no molestan al andar).
  const cascote = mat(0x7a746a, 1)
  for (let i = 0; i < 40; i++) {
    const s = azar(0.12, 0.35)
    const p = pon(g, geoCaja(s, s * 0.5, s * 0.8), cascote, azar(-12, 12), s * 0.2, z + azar(-3, 3))
    p.rotation.y = azar(0, 3)
  }
  // Manchas de quemado en el asfalto.
  const mancha = new THREE.MeshBasicMaterial({ color: 0x1c1a18, transparent: true, opacity: 0.45, depthWrite: false })
  for (const [x, zz, r] of [[-3, z + 1, 1.6], [4, z - 1.5, 1.2], [0.5, z + 5, 1], [-5, z - 8, 1.3]]) {
    pon(g, new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2), mancha, x, 0.014, zz)
  }
}

// --- los barrios -----------------------------------------------------------------
// Cada barrio es su mitad de la calle: casas bajas junto a la carretera y
// bloques más altos hacia su plaza. Los dos de piedra y ladrillo, con persianas,
// toldos y ropa tendida del color de su bando: se ve de quién es cada acera sin
// leer nada.
function barrio (g, bando) {
  const azul = bando === 'azul'
  const color = COLOR[bando]
  const z0 = azul ? CAMPO.baseAzul + 2 : CAMPO.carretera - 5
  const z1 = azul ? CAMPO.carretera + 5 : CAMPO.baseRoja - 2
  const tinte = mat(color, 0.8)
  for (const lado of [-1, 1]) {
    // Fachada a fachada, a lo largo de la calle.
    let z = z0
    let i = 0
    while (z > z1) {
      const fondo = azar(5, 8)
      const zc = z - fondo / 2
      const cercaDeLaCarretera = Math.abs(zc - CAMPO.carretera) < 12
      const ancho = azar(4.5, 7)
      const cx = lado * (ACERA + 0.8 + ancho / 2)
      // Junto a la carretera, casas bajas y alguna en ruinas; hacia la plaza,
      // bloques de pisos. Se hacen en el origen con la fachada hacia -x (como
      // las dejan `casitas` y `bloques`) y se giran para mirar a la calle.
      const ruina = cercaDeLaCarretera && azar(0, 1) < 0.45
      const alto = ruina ? azar(2, 3.5) : cercaDeLaCarretera ? azar(3.8, 5.2) : azar(6.5, 11)
      const casa = new THREE.Group()
      if (cercaDeLaCarretera) {
        casitas(casa, [[0, 0, ancho, alto, fondo]], { colores: [0xd8cbb0, 0xc9b596, 0xbfae92, 0xd6c4a4], teja: ruina ? 0x3a3430 : 0x8f4a36 })
      } else {
        bloques(casa, [[0, 0, ancho, alto, fondo]], 1, { colores: [0xc9c1b2, 0xb8ad9c, 0xd2c6b2, 0xa89d8c] })
        // Persianas del color del bando en cada piso.
        for (let y = 2.4; y < alto - 1.5; y += 3) pon(casa, geoCaja(0.08, 0.8, fondo * 0.7), tinte, -ancho / 2 - 0.08, y + 0.9, 0)
      }
      casa.position.set(cx, 0, zc)
      if (lado < 0) casa.rotation.y = Math.PI
      g.add(casa)
      if (ruina) {
        // Pared rota: cascotes al pie y un hueco negro.
        const escombro = mat(0x8a7f70, 1)
        for (let k = 0; k < 5; k++) pon(g, geoCaja(azar(0.4, 0.9), azar(0.2, 0.5), azar(0.4, 0.9)), escombro, cx - lado * azar(0, ancho / 2 + 1), 0.2, zc + azar(-fondo / 2, fondo / 2)).rotation.y = azar(0, 3)
      } else if (i % 2 === 0) {
        // Ropa tendida o una sábana colgada del color del bando.
        pon(g, geoCaja(0.06, 1.6, 1.1), tinte, lado * (ACERA + 0.72), Math.min(alto - 0.8, 3.2), zc + azar(-1, 1))
      }
      z -= fondo + azar(0.2, 1.4)
      i++
    }
    // Árboles detrás de las casas.
    const arbol = FLORA[azul ? 'olivo' : 'pino']
    for (let zz = z0; zz > z1; zz -= azar(5, 8)) {
      const a = arbol(azul ? 0x6f7d52 : 0x3f5a3c)
      a.position.set(lado * azar(ACERA + 11, ACERA + 22), 0, zz)
      g.add(a)
    }
  }
}

// --- las plazas (las bases) -------------------------------------------------------
// Cada barrio ha convertido su plaza en el cuartel: el búnker en medio, el
// cuartel (el ayuntamiento, con el tejado pintado), un muro de contenedores a
// los lados, el tanque aparcado, las tiendas del campamento y una torre de
// vigía. Por la línea de sacos entra quien gana.
function plaza (g, bando) {
  const azul = bando === 'azul'
  const hacia = azul ? 1 : -1       // hacia dónde queda la retaguardia
  const z = azul ? CAMPO.baseAzul : CAMPO.baseRoja
  const color = COLOR[bando]
  const tinte = mat(color, 0.7)
  const hormigon = mat(0x8e8b84, 0.95)
  const oscuro = mat(0x1d1d1f, 1)
  const fondo = z + hacia * 8

  // Suelo de la plaza: losas.
  pon(g, new THREE.PlaneGeometry(40, 18).rotateX(-Math.PI / 2), mat(0x7d7669, 1), 0, 0.003, z + hacia * 9)

  // Búnker con tronera y el emblema del bando.
  pon(g, geoCaja(7.5, 2.8, 4.5), hormigon, 0, 1.4, fondo)
  pon(g, geoCaja(8.2, 0.4, 5.2), hormigon, 0, 2.95, fondo)
  pon(g, geoCaja(5, 0.35, 0.1), oscuro, 0, 2, fondo - hacia * 2.28)
  pon(g, geoCaja(1.6, 1.6, 0.08), tinte, 0, 1.1, fondo - hacia * 2.3).rotation.z = Math.PI / 4

  // El ayuntamiento hecho cuartel, a un lado, con el tejado del color del bando.
  const cx = -13
  pon(g, geoCaja(8, 6.5, 6), mat(0xcdbf9f, 0.9), cx, 3.25, fondo + hacia * 2)
  pon(g, geoCaja(8.6, 0.6, 6.6), tinte, cx, 6.8, fondo + hacia * 2)
  for (let i = 0; i < 4; i++) {
    for (const y of [2, 4.6]) pon(g, geoCaja(1, 1.3, 0.06), oscuro, cx - 3 + i * 2, y, fondo + hacia * 2 - hacia * 3.03)
  }
  // Torre del reloj encima.
  pon(g, geoCaja(2.2, 3.2, 2.2), mat(0xcdbf9f, 0.9), cx, 8.7, fondo + hacia * 2)
  pon(g, new THREE.ConeGeometry(1.7, 2, 4).rotateY(Math.PI / 4), tinte, cx, 11.3, fondo + hacia * 2)

  // Campamento al otro lado: tiendas de lona.
  const lona = mat(0x5d6645, 1)
  for (let i = 0; i < 4; i++) {
    pon(g, new THREE.CylinderGeometry(0, 2, 2.1, 4).rotateY(Math.PI / 4), lona, 11 + (i % 2) * 4.2, 1.05, fondo + hacia * (Math.floor(i / 2) * 4.5 - 1.5))
  }

  // Muro de contenedores cerrando la plaza por los lados.
  for (const [x, tono] of [[-9, 0x7a3b2a], [9, 0x2f5a6b], [-19, 0x6b6b3a], [19, 0x5a3a5a]]) {
    const c = RESTOS.contenedor(tono)
    c.position.set(x, 0, z + hacia * 3.5)
    c.rotation.y = Math.PI / 2 + azar(-0.08, 0.08)
    c.scale.setScalar(0.75)
    g.add(c)
  }

  // El tanque aparcado junto al cuartel, pintado del color del bando.
  const tanque = RESTOS.oruga(azul ? 0x3d5670 : 0x6b3a34)
  tanque.position.set(-6.5, 0, fondo + hacia * 4.5)
  tanque.rotation.y = azul ? Math.PI : 0
  g.add(tanque)
  const cam = RESTOS.camioneta(azul ? 0x4a5a6a : 0x6a4a44)
  cam.position.set(6.5, 0, fondo + hacia * 4)
  cam.rotation.y = azul ? Math.PI + 0.3 : 0.3
  g.add(cam)

  // Torre de vigía de madera, en la esquina de la línea.
  const madera = mat(0x6b5236, 0.9)
  const tx = 8
  const tz = z + hacia * 1.2
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) pon(g, geoCil(0.1, 0.12, 5, 5), madera, tx + dx, 2.5, tz + dz)
  pon(g, geoCaja(2.6, 0.2, 2.6), madera, tx, 5, tz)
  pon(g, geoCaja(2.6, 0.9, 0.1), madera, tx, 5.5, tz - hacia * 1.25)
  pon(g, new THREE.ConeGeometry(2, 1, 4).rotateY(Math.PI / 4), tinte, tx, 6.9, tz)

  // Pórtico de entrada sobre la línea, con el nombre del bando pintado en la
  // viga: marca exactamente dónde está la base.
  for (const x of [-7.2, 7.2]) pon(g, geoCaja(0.5, 4.2, 0.5), hormigon, x, 2.1, z + hacia * 0.6)
  pon(g, geoCaja(15, 0.7, 0.6), tinte, 0, 4.4, z + hacia * 0.6)
}

// Sacos, erizos y alambradas de Blender: las mismas piezas que se compran en la
// tienda, puestas donde las habría puesto cada barrio. Todas fuera del frente.
async function barricadasDeBlender (grupo) {
  const sitios = [
    // Sacos delante de cada plaza, a los lados del pórtico.
    ['sandbags', -8.6, CAMPO.baseAzul + 0.4, 0], ['sandbags', 8.6, CAMPO.baseAzul + 0.4, 0],
    ['sandbags', -8.6, CAMPO.baseRoja - 0.4, Math.PI], ['sandbags', 8.6, CAMPO.baseRoja - 0.4, Math.PI],
    // Erizos y alambrada en las cunetas de la carretera, a los dos lados.
    ['erizos', -8.4, CAMPO.carretera + 4.6, 0.2], ['erizos', 8.2, CAMPO.carretera - 4.6, -0.3],
    ['erizos', -20, CAMPO.carretera - 4.4, 0.5], ['erizos', 21, CAMPO.carretera + 4.4, 0.1],
    ['spikes', 8.4, CAMPO.carretera + 4.8, 0], ['spikes', -8.4, CAMPO.carretera - 4.8, 0],
    ['spikes', 15, CAMPO.carretera + 4.6, 0.1], ['spikes', -16, CAMPO.carretera - 4.6, -0.1]
  ]
  for (const [key, x, z, giro] of sitios) {
    try {
      const m = await buildDefensaMesh(key, {})
      m.position.set(x, 0, z)
      m.rotation.y = giro
      m.scale.setScalar(0.9)
      grupo.add(m)
    } catch (e) {
      console.warn('Sin barricada', key, e)
    }
  }
}

// Una bandera grande por plaza y otras en los balcones de cada barrio.
function banderasDe (grupo, bando) {
  const azul = bando === 'azul'
  const hacia = azul ? 1 : -1
  const z = azul ? CAMPO.baseAzul : CAMPO.baseRoja
  const lista = []
  const tela = new THREE.MeshStandardMaterial({ color: COLOR[bando], roughness: 0.8, side: THREE.DoubleSide })
  const palo = mat(0xcfcfcf, 0.4, 0.6)
  const sitios = [
    [3.5, z + hacia * 8, 9, 2.8],          // la de la plaza, junto al búnker
    [-ACERA - 0.9, z - hacia * 8, 6, 1.4],  // balcones de la calle
    [ACERA + 0.9, z - hacia * 13, 7, 1.4],
    [-ACERA - 0.9, z - hacia * 18, 5, 1.2]
  ]
  for (const [x, zz, alto, tam] of sitios) {
    pon(grupo, geoCil(0.06, 0.09, alto, 6), palo, x, alto / 2, zz)
    const geo = new THREE.PlaneGeometry(tam * 1.6, tam, 8, 1)
    geo.translate(tam * 0.8, 0, 0)
    const b = new THREE.Mesh(geo, tela)
    b.position.set(x, alto - tam / 2 - 0.1, zz)
    // Las de los balcones salen hacia la calle.
    if (Math.abs(x) > 5) b.rotation.y = x > 0 ? Math.PI : 0
    b.userData.base = geo.attributes.position.array.slice()
    b.userData.fase = azar(0, 6)
    b.castShadow = true
    grupo.add(b)
    lista.push(b)
  }
  return lista
}

// Humo de las casas que siguen ardiendo, junto a la carretera.
function columnasDeHumo (grupo) {
  const lista = []
  const geo = new THREE.SphereGeometry(0.8, 7, 5)
  for (const [x, z] of [[-14, CAMPO.carretera + 8], [15, CAMPO.carretera - 9], [-26, CAMPO.carretera - 3]]) {
    const h = new THREE.Group()
    h.position.set(x, 1, z)
    for (let i = 0; i < 10; i++) {
      const bola = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3b3632, transparent: true, depthWrite: false }))
      bola.userData = { v: i / 10, f: azar(0, 6) }
      h.add(bola)
    }
    grupo.add(h)
    lista.push(h)
  }
  return lista
}
