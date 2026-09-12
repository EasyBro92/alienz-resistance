import * as THREE from 'three'
import { brilla } from './resplandor.js'

// Los golpes de apoyo: la granada y el ataque aéreo.
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

export function crearGolpes (scene, effects, audio) {
  const avion = construirAvion()
  const bomba = construirBomba()
  const granada = construirGranada()
  scene.add(avion, bomba, granada)

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
    const bola = tomar(bolas, bolaGeo, FUEGO, false)
    bola.malla.position.copy(punto).setY(radio * 0.35)
    bola.t = bola.dura = grande ? 0.65 : 0.45
    bola.radio = radio

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
    lanzar (clave, punto, alImpacto) {
      const destino = punto.clone()
      marca.position.set(destino.x, 0.06, destino.z)
      marca.visible = true

      // El napalm también lo trae el avión —es una bomba incendiaria, no algo
      // que se tire a mano—, con el mismo radio de aro que su explosión.
      if (clave === 'airstrike' || clave === 'napalm') {
        // El avión entra desde el fondo de la carretera y pasa por encima. La
        // bomba se suelta ANTES de llegar, porque una bomba soltada justo
        // encima del blanco caería detrás: lleva la velocidad del avión.
        vuelos.push({
          tipo: 'avion', t: 0, destino, alImpacto,
          entrada: 1.05, caida: 0.62, radio: clave === 'napalm' ? 4.6 : 5.5, marca: true
        })
      } else {
        vuelos.push({
          tipo: 'granada', t: 0, destino, alImpacto,
          entrada: 0, caida: 0.72, radio: 3.4, marca: true
        })
      }
    },

    limpiar () {
      vuelos.length = 0
      avion.visible = bomba.visible = granada.visible = marca.visible = false
      for (const o of [...bolas, ...ondas]) { o.t = 0; o.malla.visible = false }
    },

    update (dt) {
      // --- la marca late mientras haya algo en camino -----------------------
      const enCamino = vuelos.length > 0
      marca.visible = enCamino
      if (enCamino) {
        const p = 1 + Math.sin(performance.now() * 0.012) * 0.12
        marca.scale.setScalar(p * (vuelos[0].radio * 0.45))
        marca.material.opacity = 0.55 + Math.sin(performance.now() * 0.012) * 0.3
      }

      for (let i = vuelos.length - 1; i >= 0; i--) {
        const v = vuelos[i]
        v.t += dt
        const total = v.entrada + v.caida

        if (v.tipo === 'avion') {
          const k = Math.min(1, v.t / v.entrada)
          // Vuela recto por el carril del blanco, desde la niebla hacia la base.
          //
          // A 11,5 de altura no se veía: la cámara va inclinada 25° y el borde
          // superior del encuadre queda por debajo del horizonte, así que
          // cualquier cosa por encima de unos ocho metros sale detrás del
          // marcador. Y entrando desde 62 pasaba media pasada dentro de la
          // niebla. Vuela bajo y entra cerca: es un ataque a ras, no un
          // bombardeo de altura.
          const z0 = v.destino.z - 44
          const z1 = v.destino.z + 22
          avion.visible = v.t < v.entrada + 0.5
          avion.position.set(v.destino.x * 0.5, 8, z0 + (z1 - z0) * (v.t / (v.entrada + 0.5)))
          avion.rotation.set(0.06, 0, Math.sin(v.t * 3) * 0.05)

          if (v.t < v.entrada) {
            // La bomba viaja con el avión hasta que se suelta.
            bomba.visible = k > 0.45
            bomba.position.copy(avion.position).setY(avion.position.y - 0.55)
            bomba.rotation.set(0, 0, 0)
          } else {
            // Caída: parábola desde donde se soltó hasta el blanco.
            const c = Math.min(1, (v.t - v.entrada) / v.caida)
            bomba.visible = true
            const sueltaZ = z0 + (z1 - z0) * (v.entrada / (v.entrada + 0.5))
            bomba.position.set(
              v.destino.x * 0.5 + (v.destino.x - v.destino.x * 0.5) * c,
              7.6 - 7.6 * c * c,
              sueltaZ + (v.destino.z - sueltaZ) * c
            )
            // Se va poniendo de morro conforme cae.
            bomba.rotation.x = -c * 1.1
          }
        } else {
          // Granada: sale de detrás de la línea y describe un arco.
          const c = Math.min(1, v.t / v.caida)
          granada.visible = true
          const x0 = v.destino.x * 0.35
          const z0 = 7
          granada.position.set(
            x0 + (v.destino.x - x0) * c,
            Math.sin(c * Math.PI) * 4.2 * (1 - c * 0.3),
            z0 + (v.destino.z - z0) * c
          )
          granada.rotation.x += dt * 14
          granada.rotation.z += dt * 9
        }

        if (v.t >= total) {
          bomba.visible = false
          granada.visible = false
          reventar(v.destino, v.radio, v.tipo === 'avion')
          v.alImpacto(v.destino, v.radio)
          vuelos.splice(i, 1)
        }
      }

      if (!vuelos.length) { bomba.visible = false; granada.visible = false }
      // El avión sigue un poco más para salir de cuadro aunque ya haya soltado.
      if (avion.visible && !vuelos.some(v => v.tipo === 'avion')) {
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
