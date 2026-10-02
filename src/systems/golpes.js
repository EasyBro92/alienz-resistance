import * as THREE from 'three'
import { brilla } from './resplandor.js'
import { cargarAvion } from '../assets.js'

// Los golpes de apoyo. Primero fueron la granada y el ataque aéreo; el 27/09
// Isidro pidió más («dame más opciones típicas de los juegos de resistencia»)
// y eligió cinco: bombardeo de artillería, dron kamikaze, misil guiado, campo de
// minas y botiquín. Y que se viera QUIÉN lo lanza, no solo la explosión: el
// avión cruza y suelta, los obuses silban desde atrás, el dron sale de tu línea
// y persigue a su blanco, el misil sube desde detrás de la cámara, la caja del
// botiquín baja en paracaídas y la granada la tira el soldado más cercano.
//
// Antes eran instantáneos. Tocabas la pantalla, salían veintidós partículas
// naranjas y los huéspedes caían muertos en el mismo fotograma. Un ataque aéreo
// que cuesta trescientos de biomasa no puede resolverse igual que un disparo de
// fusil: hace falta que ALGO llegue, y que se vea llegar.
//
// El precio de que llegue es que tarda, y eso cambia el juego: ya no señalas
// dónde ESTÁN, señalas dónde VAN A ESTAR. Por eso la marca en el suelo aparece
// en el instante del toque — el jugador tiene que poder leer adónde va la bomba
// mientras la horda sigue andando.

const GRAVEDAD = 22

// --- materiales compartidos ---------------------------------------------------
const CHAPA = new THREE.MeshStandardMaterial({ color: 0x8d97a3, roughness: 0.4, metalness: 0.7 })
const CHAPA_OSCURA = new THREE.MeshStandardMaterial({ color: 0x3b434d, roughness: 0.5, metalness: 0.6 })
const CRISTAL = new THREE.MeshStandardMaterial({ color: 0x1b2c38, roughness: 0.1, metalness: 0.3 })
const TOBERA = new THREE.MeshStandardMaterial({
  color: 0xffd0a0, emissive: 0xff9a3c, emissiveIntensity: 2.4, roughness: 0.4
})
const HIERRO = new THREE.MeshStandardMaterial({ color: 0x4a4f45, roughness: 0.6, metalness: 0.5 })
const FUEGO = new THREE.MeshBasicMaterial({
  color: 0xffb03a, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending
})
const ONDA = new THREE.MeshBasicMaterial({
  color: 0xfff0c0, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide
})
const MARCA = new THREE.MeshBasicMaterial({
  color: 0xff5a4d, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide
})

// --- el avión -----------------------------------------------------------------
// Bombardero de ala en flecha, achatado. Se ve tres cuartos de segundo y de
// lejos: lo que tiene que leerse es la silueta, no los remaches.
function construirAvion () {
  const g = new THREE.Group()

  const fuselaje = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.4, 6, 12), CHAPA)
  fuselaje.rotation.x = Math.PI / 2
  g.add(fuselaje)

  const morro = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 12), CHAPA)
  morro.rotation.x = -Math.PI / 2
  morro.position.z = -2.7
  g.add(morro)

  const cabina = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), CRISTAL)
  cabina.scale.set(1, 0.7, 1.9)
  cabina.position.set(0, 0.42, -1.5)
  g.add(cabina)

  // Alas en flecha: un triángulo por lado, con la punta hacia atrás.
  for (const lado of [-1, 1]) {
    const ala = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.5, 0.16, 3), CHAPA)
    ala.rotation.set(Math.PI / 2, 0, lado * 1.28)
    ala.position.set(lado * 2.1, -0.1, 0.5)
    ala.scale.z = 0.55
    g.add(ala)

    // Motor colgado bajo cada ala, con la tobera encendida.
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 1.5, 10), CHAPA_OSCURA)
    motor.rotation.x = Math.PI / 2
    motor.position.set(lado * 1.9, -0.42, 0.4)
    g.add(motor)
    const llama = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 8), TOBERA)
    llama.rotation.x = -Math.PI / 2
    llama.position.set(lado * 1.9, -0.42, 1.5)
    brilla(llama)
    g.add(llama)
  }

  // Deriva doble: es lo que lo separa de un avión de línea a esta distancia.
  for (const lado of [-1, 1]) {
    const deriva = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.3, 0.12, 3), CHAPA)
    deriva.rotation.set(Math.PI / 2, 0, Math.PI / 2 + lado * 0.25)
    deriva.position.set(lado * 0.75, 0.7, 1.8)
    deriva.scale.z = 0.5
    g.add(deriva)
  }

  // El cazabombardero de Blender (herramientas/blender/armas.py) sustituye al
  // de piezas en cuanto llega (Isidro, 01/10), aquí y en la ficha de la tienda.
  // El de piezas, además, volaba de culo: el morro miraba a -z y avanza a +z.
  cargarAvion().then(modelo => {
    g.clear()
    modelo.traverse(o => {
      if (!o.isMesh) return
      o.castShadow = true
      if (/^brillo/.test(o.material?.name ?? '')) brilla(o)
    })
    modelo.scale.setScalar(0.85)
    // El modelo trae el morro hacia +z y ahora vuela hacia -z, hacia el enemigo.
    modelo.rotation.y = Math.PI
    g.add(modelo)
  }).catch(e => console.warn('Sin avión de Blender:', e))

  g.visible = false
  return g
}

function construirBomba () {
  const g = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), HIERRO)
  cuerpo.rotation.x = Math.PI / 2
  g.add(cuerpo)
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 10), HIERRO)
  punta.rotation.x = -Math.PI / 2
  punta.position.z = -0.5
  g.add(punta)
  // Aletas en cruz al final, que es lo que dice "esto cae" y no "esto vuela".
  for (let i = 0; i < 4; i++) {
    const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.24), HIERRO)
    aleta.position.z = 0.42
    aleta.rotation.z = (i / 4) * Math.PI * 2
    aleta.position.x = Math.cos(aleta.rotation.z) * 0.12
    aleta.position.y = Math.sin(aleta.rotation.z) * 0.12
    g.add(aleta)
  }
  g.visible = false
  return g
}

function construirGranada () {
  const g = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), HIERRO)
  cuerpo.scale.y = 1.25
  g.add(cuerpo)
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), CHAPA_OSCURA)
  cuello.position.y = 0.2
  g.add(cuello)
  g.visible = false
  return g
}

// --- el dron ----------------------------------------------------------------------
// Cuadricóptero: cuerpo, dos brazos en aspa, cuatro rotores (discos que giran) y
// la carga colgando debajo. Con la luz roja que dice que va armado.
const ROTOR = new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.4, depthWrite: false })
const LUZ_ROJA = new THREE.MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xff3b2e, emissiveIntensity: 3 })
const OLIVA = new THREE.MeshStandardMaterial({ color: 0x4d5537, roughness: 0.8 })
const LONA = new THREE.MeshStandardMaterial({ color: 0xe9e3d3, roughness: 0.95, side: THREE.DoubleSide })
const CAJA = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.8 })
const CRUZ = new THREE.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.7 })
const VERDE = new THREE.MeshBasicMaterial({
  color: 0x7dffae, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide
})

function construirDron () {
  const g = new THREE.Group()
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), CHAPA_OSCURA))
  for (const giro of [Math.PI / 4, -Math.PI / 4]) {
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.08), CHAPA)
    brazo.rotation.y = giro
    g.add(brazo)
  }
  const rotores = []
  for (const [x, z] of [[0.39, 0.39], [-0.39, 0.39], [0.39, -0.39], [-0.39, -0.39]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.015, 12), ROTOR)
    r.position.set(x, 0.09, z)
    g.add(r)
    rotores.push(r)
  }
  const carga = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), OLIVA)
  carga.position.y = -0.16
  g.add(carga)
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), LUZ_ROJA)
  luz.position.set(0, 0.02, -0.27)
  brilla(luz)
  g.add(luz)
  g.userData.rotores = rotores
  g.scale.setScalar(1.4)
  // Primero el rumbo y luego el cabeceo: con el orden de siempre, al girar se
  // inclinaba de lado en vez de hacia delante.
  g.rotation.order = 'YXZ'
  g.visible = false
  return g
}

// --- el misil -----------------------------------------------------------------------
function construirMisil () {
  const g = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.7, 12), CHAPA)
  cuerpo.rotation.x = Math.PI / 2
  g.add(cuerpo)
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 12), CHAPA_OSCURA)
  punta.rotation.x = -Math.PI / 2
  punta.position.z = -1.12
  g.add(punta)
  for (let k = 0; k < 4; k++) {
    const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.34), CHAPA_OSCURA)
    aleta.rotation.z = k * Math.PI / 2
    aleta.position.z = 0.7
    g.add(aleta)
  }
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 8), TOBERA)
  llama.rotation.x = Math.PI / 2
  llama.position.z = 1.25
  brilla(llama)
  g.add(llama)
  g.visible = false
  return g
}

// --- el obús de artillería ----------------------------------------------------------
function construirObus () {
  const g = new THREE.Group()
  const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), HIERRO)
  g.add(o)
  g.visible = false
  return g
}

// --- la mina del campo de minas -------------------------------------------------------
function construirMina () {
  const g = new THREE.Group()
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.11, 14), OLIVA)
  disco.position.y = 0.055
  g.add(disco)
  const espoleta = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.05, 10), CHAPA_OSCURA)
  espoleta.position.y = 0.13
  g.add(espoleta)
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), LUZ_ROJA)
  luz.position.set(0.18, 0.13, 0)
  brilla(luz)
  g.add(luz)
  g.userData.luz = luz
  g.visible = false
  return g
}

// --- la caja del botiquín, con su paracaídas ----------------------------------------
function construirCaja () {
  const g = new THREE.Group()
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.9), CAJA)
  caja.position.y = 0.31
  g.add(caja)
  for (const [w, d] of [[0.56, 0.16], [0.16, 0.56]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), CRUZ)
    c.position.y = 0.63
    g.add(c)
  }
  for (const [w, d, x, z] of [[0.02, 0.4, 0.46, 0], [0.02, 0.4, -0.46, 0]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, d), CRUZ)
    c.position.set(x, 0.31, z)
    g.add(c)
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(w, d, 0.13), CRUZ)
    c2.position.set(x, 0.31, z)
    g.add(c2)
  }
  const para = new THREE.Group()
  const lona = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), LONA)
  lona.scale.y = 0.6
  lona.position.y = 2.6
  para.add(lona)
  for (const [x, z] of [[0.95, 0.95], [-0.95, 0.95], [0.95, -0.95], [-0.95, -0.95]]) {
    const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.2, 4), CHAPA_OSCURA)
    cuerda.position.set(x * 0.5, 1.72, z * 0.5)
    cuerda.rotation.set(z * 0.36, 0, -x * 0.36)
    para.add(cuerda)
  }
  g.add(para)
  g.userData.paracaidas = para
  g.visible = false
  return g
}

// La figura de cada apoyo para la ficha de la tienda: lo que lo trae (el
// avión, el dron, el misil, la caja en paracaídas) o lo que cae (la granada,
// los obuses, las minas). El Recolector no tiene: se queda con su icono.
export function figuraDeApoyo (clave) {
  const g = new THREE.Group()
  const pon = (o, x = 0, y = 0, z = 0) => { o.visible = true; o.position.set(x, y, z); g.add(o); return o }
  if (clave === 'grenade') pon(construirGranada())
  else if (clave === 'airstrike') pon(construirAvion())
  else if (clave === 'napalm') { pon(construirAvion(), 0, 0.9, 0); pon(construirBomba(), 0, 0, 0.4) }
  else if (clave === 'artilleria') {
    for (const [x, z] of [[-0.34, 0], [0.34, 0], [0, -0.4]]) pon(construirObus(), x, 0.34, z)
  } else if (clave === 'dron') {
    const d = pon(construirDron())
    d.scale.setScalar(1)
    g.userData.rotores = d.userData.rotores
  } else if (clave === 'misilGuiado') {
    const m = pon(construirMisil())
    m.rotation.x = 0.45
  } else if (clave === 'campoMinas') {
    for (const [x, z] of [[-0.45, 0.2], [0.45, 0.25], [0, -0.4]]) {
      const m = pon(construirMina(), x, 0, z)
      g.userData.luces = [...(g.userData.luces ?? []), m.userData.luz]
    }
  } else if (clave === 'botiquin') pon(construirCaja())
  else return null
  return g
}

export function crearGolpes (scene, effects, audio) {
  const avion = construirAvion()
  const bomba = construirBomba()
  // Las otras dos del ataque aéreo (Isidro, 01/10: «que se vean caer varias
  // bombas en fila»): caen delante y detrás de la principal, escalonadas.
  const bombasFila = [construirBomba(), construirBomba()]
  for (const b of bombasFila) { b.visible = false; scene.add(b) }
  // De cerca a lejos, que es como va el avión: primero la más próxima a ti.
  const FILA = [{ dz: 4.6, dt: -0.16 }, { dz: -4.6, dt: 0.16 }]

  // --- la pasada del avión ----------------------------------------------------
  //
  // Isidro (02/10): «los ataques aéreos tienen más sentido si vienen desde mi
  // lado hacia el de ellos», y «no debe chocar en ningún mapa con los objetos,
  // estadios, etc.; solo se ve en mapas abiertos, como Tarragona».
  //
  // El avión entra por detrás de la cámara (z ≥ 24, fuera del encuadre), vuela
  // hacia el fondo a ocho de altura, suelta cinco metros ANTES del blanco —la
  // bomba lleva su velocidad— y rompe hacia un lado subiendo, que es lo que hace
  // un avión de verdad y además lo saca del camino de la base alien, que está en
  // el eje. Antes de salir se pregunta al mundo (`cielo`) si esa pasada está
  // libre: se prueba rompiendo hacia el lado del blanco, hacia el otro y recto, y
  // si ninguna cabe (un estadio, una galería, un arco) el avión NO SE VE: las
  // bombas caen igual.
  const ALTO_AVION = 8
  const U_SUELTA = 1.05 / 1.55          // en qué punto de la pasada suelta
  let cielo = null
  const puntoDePasada = (v, u, lado, hacia) => {
    const s = Math.max(0, (u - U_SUELTA) / (1 - U_SUELTA))
    return hacia.set(
      v.destino.x * 0.5 + lado * 13 * s * s,
      ALTO_AVION + 7 * s * s,
      v.z0 + (v.z1 - v.z0) * u
    )
  }
  function trazarPasada (v) {
    v.z0 = Math.max(v.destino.z + 50, 24)
    v.z1 = v.z0 + (v.destino.z + 5.3 - v.z0) / U_SUELTA
    v.sueltaZ = v.destino.z + 5.3
    const hacia = Math.sign(v.destino.x) || 1
    v.lado = hacia
    v.conAvion = true
    if (!cielo) return v
    for (const lado of [hacia, -hacia, 0]) {
      const puntos = []
      for (let i = 0; i <= 10; i++) puntos.push(puntoDePasada(v, i / 10, lado, new THREE.Vector3()))
      if (cielo(puntos)) { v.lado = lado; return v }
    }
    v.conAvion = false
    return v
  }
  function moverAvion (v) {
    const u = v.t / (v.entrada + 0.5)
    avion.visible = v.conAvion && u < 1
    puntoDePasada(v, Math.min(1, u), v.lado, avion.position)
    const s = Math.max(0, (Math.min(1, u) - U_SUELTA) / (1 - U_SUELTA))
    // Se ladea hacia donde rompe y levanta el morro.
    avion.rotation.set(-0.06 - s * 0.35, -v.lado * s * 0.5, Math.sin(v.t * 3) * 0.05 - v.lado * s * 0.9)
  }
  const granada = construirGranada()
  scene.add(avion, bomba, granada)

  // Los nuevos, en reserva: se crean la primera vez y se reaprovechan.
  const reservas = { dron: [], misil: [], obus: [], mina: [], caja: [] }
  const construir = { dron: construirDron, misil: construirMisil, obus: construirObus, mina: construirMina, caja: construirCaja }
  function pieza (tipo) {
    let p = reservas[tipo].find(o => !o.userData.enUso)
    if (!p) {
      p = construir[tipo]()
      scene.add(p)
      reservas[tipo].push(p)
    }
    p.userData.enUso = true
    p.visible = true
    return p
  }
  function soltarPieza (p) {
    p.userData.enUso = false
    p.visible = false
  }

  // Las minas sembradas: se quedan en el suelo hasta que alguien las pisa o
  // hasta que se acaba su tiempo.
  const minas = []
  // El aro verde del botiquín, que recorre el campo.
  const aroVerde = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), VERDE)
  aroVerde.rotation.x = -Math.PI / 2
  aroVerde.position.y = 0.1
  aroVerde.renderOrder = 4
  aroVerde.visible = false
  brilla(aroVerde)
  scene.add(aroVerde)
  let aroT = 0

  // Marca de objetivo: un aro que late en el suelo desde el instante del toque.
  // Sin ella, con un golpe que tarda, el jugador no sabría dónde va a caer.
  const marca = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 22), MARCA)
  marca.rotation.x = -Math.PI / 2
  marca.position.y = 0.06
  marca.renderOrder = 3
  marca.visible = false
  scene.add(marca)

  // Bolas de fuego y ondas de choque, reaprovechadas de una reserva: crear y
  // tirar geometría en mitad de una explosión da un tirón justo cuando más
  // cosas se mueven en pantalla.
  const bolas = []
  const ondas = []
  const bolaGeo = new THREE.SphereGeometry(1, 12, 10)
  const ondaGeo = new THREE.RingGeometry(0.86, 1, 28)

  function tomar (lista, geo, mat, rotarPlano) {
    let x = lista.find(o => o.t <= 0)
    if (!x) {
      const malla = new THREE.Mesh(geo, mat.clone())
      if (rotarPlano) malla.rotation.x = -Math.PI / 2
      malla.renderOrder = 4
      brilla(malla)
      scene.add(malla)
      x = { malla, t: 0, dura: 1 }
      lista.push(x)
    }
    x.malla.visible = true
    return x
  }

  // Una explosión completa: destello, bola de fuego, onda por el suelo, cascotes
  // y una columna de humo que se queda un rato. Es lo que separa "han muerto" de
  // "ha caído algo aquí".
  function reventar (punto, radio, grande) {
    // Con el fuego de verdad, la bola es una explosión simulada (fuego.js); la
    // esfera naranja de antes solo queda si no lo hay.
    if (effects.fuego) {
      effects.fuego.explosion(punto.x, 0, punto.z, radio * (grande ? 1.6 : 1.35))
    } else {
      const bola = tomar(bolas, bolaGeo, FUEGO, false)
      bola.malla.position.copy(punto).setY(radio * 0.35)
      bola.t = bola.dura = grande ? 0.65 : 0.45
      bola.radio = radio
    }

    const onda = tomar(ondas, ondaGeo, ONDA, true)
    onda.malla.position.copy(punto).setY(0.08)
    onda.t = onda.dura = grande ? 0.75 : 0.5
    onda.radio = radio * (grande ? 2.1 : 1.6)

    effects.burst(punto, 0xffb03a, grande ? 34 : 18, radio * 0.9)
    effects.burst(punto, 0x3a3a3a, grande ? 22 : 12, radio * 0.7)
    effects.burst(punto, 0x8a7a5a, grande ? 18 : 9, radio * 1.2)
    // Columna: el humo sube durante un par de segundos y marca dónde ha sido.
    for (let i = 0; i < (grande ? 9 : 4); i++) {
      const alto = punto.clone()
      alto.y += i * 0.5
      effects.smoke(alto, 1, 0x6b6259)
    }
    audio.boom()
  }

  // Golpes en vuelo. Nunca hay muchos a la vez —cuestan biomasa—, así que una
  // lista simple sobra.
  const vuelos = []

  return {
    // `alImpacto` recibe el punto: el daño lo aplica quien llama, que es quien
    // sabe de huéspedes. Aquí solo se sabe de aviones y de fuego.
    lanzar (clave, punto, alImpacto, extra = {}) {
      const destino = punto.clone()
      marca.position.set(destino.x, 0.06, destino.z)
      marca.visible = true

      if (clave === 'artilleria') {
        // Los obuses caen en fila por el carril, del fondo hacia la línea, uno
        // cada cuarto de segundo, después de silbar un momento.
        const n = extra.proyectiles ?? 7
        vuelos.push({
          tipo: 'artilleria', t: 0, destino, alImpacto, entrada: 1.1, caida: (n - 1) * 0.26 + 0.55,
          radio: extra.radio ?? 2.4, marca: false, n, hechos: 0,
          obuses: Array.from({ length: n }, () => null),
          zDesde: extra.zDesde ?? -42, zHasta: extra.zHasta ?? -2
        })
        audio.silbido?.()
        return
      }
      if (clave === 'dron') {
        vuelos.push({
          tipo: 'dron', t: 0, destino, alImpacto, entrada: 99, caida: 0, radio: extra.radio ?? 1.8,
          marca: false, objetivo: extra.objetivo ?? null, malla: pieza('dron'),
          pos: new THREE.Vector3(destino.x * 0.3, 3.4, 9)
        })
        return
      }
      if (clave === 'misilGuiado') {
        vuelos.push({
          tipo: 'misil', t: 0, destino, alImpacto, entrada: 0, caida: 1.55, radio: extra.radio ?? 2.6,
          marca: true, malla: pieza('misil'), desde: new THREE.Vector3(destino.x * 0.2, 1.5, 24)
        })
        return
      }
      if (clave === 'campoMinas') {
        // El avión siembra: cada mina sale de la panza en su momento y cae a su
        // sitio, repartidas por la zona sin montarse.
        const n = extra.minas ?? 7
        const sitios = []
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2 + Math.random() * 0.5
          const r = k === 0 ? 0 : 1.4 + Math.random() * 2.1
          sitios.push(new THREE.Vector3(destino.x + Math.cos(a) * r, 0, destino.z + Math.sin(a) * r))
        }
        vuelos.push(trazarPasada({
          tipo: 'siembra', t: 0, destino, alImpacto, entrada: 1.05, caida: 0.7, radio: 3.6,
          marca: true, sitios, sueltas: [], cercano: extra.cercano, dura: extra.dura ?? 45,
          radioMina: extra.radio ?? 2
        }))
        return
      }
      if (clave === 'botiquin') {
        vuelos.push({
          tipo: 'caja', t: 0, destino, alImpacto, entrada: 0, caida: 2.1, radio: 1.2,
          marca: false, malla: pieza('caja')
        })
        return
      }

      // El napalm también lo trae el avión —es una bomba incendiaria, no algo
      // que se tire a mano—, con el mismo radio de aro que su explosión.
      if (clave === 'airstrike' || clave === 'napalm') {
        // El avión entra desde TU lado y pasa por encima (ver `trazarPasada`).
        vuelos.push(trazarPasada({
          tipo: 'avion', t: 0, destino, alImpacto, alTemblar: extra.alTemblar ?? null,
          entrada: 1.05, caida: 0.62, radio: clave === 'napalm' ? 4.6 : 5.5, marca: true,
          fila: clave === 'airstrike' ? FILA.map(f => ({ ...f, hecho: false })) : null
        }))
      } else {
        // La tira el soldado más cercano, si hay alguno; si no, llega de detrás
        // de la línea como antes.
        vuelos.push({
          tipo: 'granada', t: 0, destino, alImpacto,
          entrada: 0, caida: 0.72, radio: 3.4, marca: true, desde: extra.desde ?? null
        })
      }
    },

    // Quién dice si una pasada está libre: recibe los puntos del recorrido.
    alCielo (fn) { cielo = fn },

    limpiar () {
      vuelos.length = 0
      for (const b of bombasFila) b.visible = false
      for (const lista of Object.values(reservas)) for (const p of lista) soltarPieza(p)
      minas.length = 0
      aroVerde.visible = false
      aroT = 0
      avion.visible = bomba.visible = granada.visible = marca.visible = false
      for (const o of [...bolas, ...ondas]) { o.t = 0; o.malla.visible = false }
    },

    update (dt) {
      // --- la marca late mientras haya algo en camino -----------------------
      const conMarca = vuelos.find(v => v.marca)
      marca.visible = !!conMarca
      if (conMarca) {
        marca.position.set(conMarca.destino.x, 0.06, conMarca.destino.z)
        const p = 1 + Math.sin(performance.now() * 0.012) * 0.12
        marca.scale.setScalar(p * (conMarca.radio * 0.45))
        marca.material.opacity = 0.55 + Math.sin(performance.now() * 0.012) * 0.3
      }

      for (let i = vuelos.length - 1; i >= 0; i--) {
        const v = vuelos[i]
        v.t += dt
        const total = v.entrada + v.caida

        if (v.tipo === 'artilleria') {
          // Cada obús cae en picado desde atrás y arriba hasta su punto del
          // carril; revienta al llegar y el siguiente ya viene detrás.
          for (let k = 0; k < v.n; k++) {
            const llega = v.entrada + k * 0.26 + 0.55
            const sale = llega - 0.55
            const zk = v.zDesde + (v.zHasta - v.zDesde) * (k / Math.max(1, v.n - 1))
            if (v.t >= sale && !v.obuses[k]) {
              v.obuses[k] = { malla: pieza('obus'), blanco: new THREE.Vector3(v.destino.x + (Math.random() - 0.5) * 0.3, 0, zk) }
            }
            const o = v.obuses[k]
            if (!o || o.hecho) continue
            if (v.t < llega) {
              const c = (v.t - sale) / 0.55
              o.malla.position.set(o.blanco.x, 26 * (1 - c), o.blanco.z + 16 * (1 - c))
              o.malla.rotation.set(-0.55, 0, 0)
            } else {
              o.hecho = true
              soltarPieza(o.malla)
              reventar(o.blanco, v.radio, false)
              v.alImpacto(o.blanco, v.radio)
            }
          }
          if (v.t >= total + 0.05) vuelos.splice(i, 1)
          continue
        }

        if (v.tipo === 'dron') {
          // Sale de detrás de la línea, vuela a media altura siguiendo a su
          // blanco (que se mueve) y, a cuatro metros, se lanza en picado.
          const m = v.malla
          const vivo = v.objetivo && !v.objetivo.dead
          if (vivo) v.destino.copy(v.objetivo.mesh.position)
          const dx = v.destino.x - v.pos.x
          const dz = v.destino.z - v.pos.z
          const d = Math.hypot(dx, dz)
          const paso = Math.min(d, 13 * dt)
          if (d > 0.01) { v.pos.x += dx / d * paso; v.pos.z += dz / d * paso }
          const alto = d > 4 ? 3.4 : 0.9 + 2.5 * (d / 4)
          v.pos.y += (alto - v.pos.y) * Math.min(1, dt * 8)
          m.position.copy(v.pos)
          m.rotation.set(d > 4 ? -0.25 : -0.7, Math.atan2(-dx, -dz), 0)
          for (const r of m.userData.rotores) r.rotation.y += dt * 60
          if (d < 0.6 || v.t > 7) {
            soltarPieza(m)
            const p = v.pos.clone().setY(0)
            reventar(p, v.radio, false)
            v.alImpacto(p, v.radio, { objetivo: v.objetivo })
            vuelos.splice(i, 1)
          }
          continue
        }

        if (v.tipo === 'misil') {
          // Sube desde detrás de la cámara en un arco alto y cae de morro.
          const c = Math.min(1, v.t / v.caida)
          const m = v.malla
          const antes = m.position.clone()
          m.position.set(
            v.desde.x + (v.destino.x - v.desde.x) * c,
            v.desde.y * (1 - c) + Math.sin(c * Math.PI) * 15,
            v.desde.z + (v.destino.z - v.desde.z) * c
          )
          if (v.t > dt) {
            const dir = m.position.clone().sub(antes)
            if (dir.lengthSq() > 1e-6) m.lookAt(m.position.clone().add(dir))
            // lookAt apunta +z hacia el blanco, y el misil mira a -z: media vuelta.
            m.rotateY(Math.PI)
            if (Math.random() < 0.8) effects.smoke(antes, 1, 0xd9d4cc)
          }
          if (c >= 1) {
            soltarPieza(m)
            reventar(v.destino, v.radio, true)
            v.alImpacto(v.destino, v.radio)
            vuelos.splice(i, 1)
          }
          continue
        }

        if (v.tipo === 'caja') {
          // Baja en paracaídas, meciéndose; al tocar suelo, la onda verde.
          const c = Math.min(1, v.t / v.caida)
          const m = v.malla
          m.position.set(v.destino.x, 13 * (1 - c), v.destino.z)
          m.rotation.z = Math.sin(v.t * 3) * 0.12 * (1 - c)
          m.userData.paracaidas.visible = c < 1
          if (c >= 1 && !v.aterrizo) {
            v.aterrizo = true
            aroVerde.position.set(v.destino.x, 0.1, v.destino.z)
            aroVerde.visible = true
            aroT = 1.1
            effects.burst(v.destino, 0x7dffae, 16, 1.2)
            v.alImpacto(v.destino, v.radio)
          }
          if (v.t > v.caida + 1.6) {
            soltarPieza(m)
            vuelos.splice(i, 1)
          }
          continue
        }

        if (v.tipo === 'siembra') {
          // El mismo avión que el ataque aéreo, pero en vez de una bomba suelta
          // las minas una a una mientras pasa por encima de la zona.
          moverAvion(v)
          v.sitios.forEach((s, k) => {
            const sale = v.entrada * 0.55 + k * 0.08
            if (v.t < sale || v.sueltas[k]) return
            v.sueltas[k] = { malla: pieza('mina'), desde: avion.position.clone(), t: 0, s }
          })
          for (const q of v.sueltas) {
            if (!q || q.puesta) continue
            q.t += dt
            const c = Math.min(1, q.t / v.caida)
            q.malla.position.set(
              q.desde.x + (q.s.x - q.desde.x) * c,
              q.desde.y * (1 - c * c),
              q.desde.z + (q.s.z - q.desde.z) * c
            )
            q.malla.rotation.x += dt * 8
            if (c >= 1) {
              q.puesta = true
              q.malla.rotation.set(0, Math.random() * 6, 0)
              q.malla.position.copy(q.s)
              effects.burst(q.s, 0x8a7a5a, 4, 0.5)
              minas.push({ malla: q.malla, p: q.s, t: 0, vida: v.dura, radio: v.radioMina, cercano: v.cercano, alImpacto: v.alImpacto })
            }
          }
          if (v.sueltas.filter(q => q?.puesta).length === v.sitios.length) vuelos.splice(i, 1)
          continue
        }

        if (v.tipo === 'avion') {
          const k = Math.min(1, v.t / v.entrada)
          // Vuela por el carril del blanco, de tu línea hacia el fondo.
          //
          // A 11,5 de altura no se veía: la cámara va inclinada 25° y el borde
          // superior del encuadre queda por debajo del horizonte, así que
          // cualquier cosa por encima de unos ocho metros sale detrás del
          // marcador. Vuela bajo: es un ataque a ras, no un bombardeo de altura.
          moverAvion(v)

          if (v.t < v.entrada) {
            // La bomba viaja con el avión hasta que se suelta.
            bomba.visible = v.conAvion && k > 0.45
            bomba.position.copy(avion.position).setY(avion.position.y - 0.55)
            bomba.rotation.set(0, 0, 0)
          } else if (!v.exploto) {
            if (!v.silbo) { v.silbo = true; audio.silbido?.() }
            // Caída: parábola desde donde se soltó hasta el blanco.
            const c = Math.min(1, (v.t - v.entrada) / v.caida)
            bomba.visible = true
            const sueltaZ = v.sueltaZ
            bomba.position.set(
              v.destino.x * 0.5 + (v.destino.x - v.destino.x * 0.5) * c,
              7.6 - 7.6 * c * c,
              sueltaZ + (v.destino.z - sueltaZ) * c
            )
            // Se va poniendo de morro conforme cae.
            bomba.rotation.x = c * 1.1
          }
          // Las de la fila: la misma parábola, cada una a su sitio y a su hora.
          if (v.fila && v.t >= v.entrada) {
            const sueltaZ = v.sueltaZ
            v.fila.forEach((f, n) => {
              const b = bombasFila[n]
              if (f.hecho) { b.visible = false; return }
              const c = Math.max(0, Math.min(1, (v.t - v.entrada - f.dt) / v.caida))
              b.visible = true
              b.position.set(
                v.destino.x * 0.5 + (v.destino.x - v.destino.x * 0.5) * c,
                7.6 - 7.6 * c * c,
                sueltaZ + (v.destino.z + f.dz - sueltaZ) * c
              )
              b.rotation.x = c * 1.1
              if (c >= 1) {
                f.hecho = true
                b.visible = false
                reventar(new THREE.Vector3(v.destino.x, 0, v.destino.z + f.dz), v.radio * 0.8, true)
                v.alTemblar?.(0.6)
              }
            })
          }
        } else {
          // Granada: sale de detrás de la línea y describe un arco.
          const c = Math.min(1, v.t / v.caida)
          granada.visible = true
          const x0 = v.desde ? v.desde.x : v.destino.x * 0.35
          const z0 = v.desde ? v.desde.z : 7
          const y0 = v.desde ? 1.5 : 0
          granada.position.set(
            x0 + (v.destino.x - x0) * c,
            y0 * (1 - c) + Math.sin(c * Math.PI) * 4.2 * (1 - c * 0.3),
            z0 + (v.destino.z - z0) * c
          )
          granada.rotation.x += dt * 14
          granada.rotation.z += dt * 9
        }

        if (v.t >= total && !v.exploto) {
          v.exploto = true
          bomba.visible = false
          granada.visible = false
          reventar(v.destino, v.radio, v.tipo === 'avion')
          v.alImpacto(v.destino, v.radio)
        }
        // Con bombas en fila se espera a que caiga la última.
        if (v.exploto && (!v.fila || v.fila.every(f => f.hecho))) {
          for (const b of bombasFila) b.visible = false
          vuelos.splice(i, 1)
        }
      }

      if (!vuelos.some(v => v.tipo === 'avion')) bomba.visible = false
      if (!vuelos.some(v => v.tipo === 'granada')) granada.visible = false

      // --- las minas sembradas ------------------------------------------------
      for (let i = minas.length - 1; i >= 0; i--) {
        const m = minas[i]
        m.t += dt
        // Armada a los cuatro décimos: si no, la que cae encima de un bicho
        // revienta en el aire.
        const armada = m.t > 0.4
        m.malla.userData.luz.visible = (m.t % 1) < (armada ? 0.3 : 0.9)
        if (armada && m.cercano?.(m.p, 0.9)) {
          soltarPieza(m.malla)
          reventar(m.p, m.radio, false)
          m.alImpacto(m.p, m.radio)
          minas.splice(i, 1)
          continue
        }
        if (m.t > m.vida) {
          soltarPieza(m.malla)
          minas.splice(i, 1)
        }
      }

      // --- el aro verde del botiquín ------------------------------------------
      if (aroT > 0) {
        aroT -= dt
        const k = Math.max(0, aroT / 1.1)
        aroVerde.scale.setScalar(1 + (1 - k) * 26)
        aroVerde.material.opacity = k * 0.85
        if (aroT <= 0) aroVerde.visible = false
      }
      // El avión sigue un poco más para salir de cuadro aunque ya haya soltado.
      if (avion.visible && !vuelos.some(v => v.tipo === 'avion' || v.tipo === 'siembra')) {
        avion.position.z += 46 * dt
        if (avion.position.z > 30) avion.visible = false
      }

      // --- fuego y ondas ------------------------------------------------------
      for (const b of bolas) {
        if (b.t <= 0) continue
        b.t -= dt
        const k = Math.max(0, b.t / b.dura)
        // Crece deprisa y se apaga: una bola que crece despacio parece un globo.
        b.malla.scale.setScalar(b.radio * (1.15 - k * 0.85))
        b.malla.material.opacity = k * k
        if (b.t <= 0) b.malla.visible = false
      }
      for (const o of ondas) {
        if (o.t <= 0) continue
        o.t -= dt
        const k = Math.max(0, o.t / o.dura)
        o.malla.scale.setScalar(o.radio * (1.2 - k))
        o.malla.material.opacity = k * 0.75
        if (o.t <= 0) o.malla.visible = false
      }
    }
  }
}
