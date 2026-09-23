// Tramos que se juegan DENTRO de algo.
//
// La queja de Isidro era que los mapas se sienten repetitivos: «en Vladivostok,
// en vez de jugar al lado del puente, sería mejor jugar en el propio puente».
// Tenía razón — el puente de Zolotói estaba ahí al lado, de adorno, mientras la
// partida pasaba en una carretera igual que las otras treinta y ocho.
//
// Un escenario no es un monumento más: sustituye TODO lo de alrededor. Se traga
// el arenal, la vegetación, las vallas y los cerros, y decide cuántos carriles
// quedan abiertos. En el puente se pelea en la calzada y las dos aceras quedan
// cerradas tras la barrera, así que el campo pasa de cinco carriles a tres.
//
// Todo va por código, como el resto del decorado del juego.

import * as THREE from 'three'

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness })

const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  g.add(m)
  return m
}

// Hasta dónde llega el tablero y dónde empieza el vacío. La calzada mide 13,6
// (6,8 a cada lado); la acera va de la barrera al pretil.
const MEDIO_TABLERO = 7.6
const BARRERA_X = 4.05      // entre el carril 0 y el 1, y entre el 3 y el 4
const LARGO = 300           // hasta bien dentro de la niebla por los dos lados
const DESDE_Z = 30
const HASTA_Z = -270
const FONDO_MAR = -46

// --- el puente de Zolotói ----------------------------------------------------
function puente () {
  const g = new THREE.Group()
  const hormigon = mat(0xe4e2dc, 0.8)
  const hormigonSucio = mat(0xc6c3bb, 0.85)
  const hormigonHondo = mat(0x9a978f, 0.9)
  const acero = mat(0xb9bec4, 0.45, 0.55)
  const cable = mat(0xf2f2ef, 0.35, 0.5)
  const agua = new THREE.MeshStandardMaterial({ color: 0x33607a, roughness: 0.22, metalness: 0.35 })
  const hielo = mat(0xdfe9ee, 0.7)

  // --- el mar, muy abajo -----------------------------------------------------
  // Es lo que convierte la carretera en un puente: si por el borde no se ve el
  // vacío, esto es una calzada con vallas bonitas.
  const mar = pon(g, new THREE.PlaneGeometry(900, 900), agua, 0, FONDO_MAR, -120)
  mar.rotation.x = -Math.PI / 2
  // Placas de hielo sueltas, que esto es Vladivostok en invierno.
  for (let i = 0; i < 46; i++) {
    const r = 3 + Math.random() * 11
    const placa = pon(g, new THREE.CylinderGeometry(r, r * 0.92, 0.5, 6), hielo,
      (Math.random() - 0.5) * 320, FONDO_MAR + 0.3, -140 + (Math.random() - 0.5) * 300)
    placa.rotation.y = Math.random() * Math.PI
  }

  // --- el tablero ------------------------------------------------------------
  // Por debajo tiene canto: desde la cámara, picada como está, se le ve el
  // costado, y sin canto el puente era una lámina de papel.
  pon(g, new THREE.BoxGeometry(MEDIO_TABLERO * 2, 1.5, LARGO), hormigonSucio, 0, -0.78, (DESDE_Z + HASTA_Z) / 2)
  // Dos vigas cajón bajo el tablero, que es lo que aguanta de verdad.
  for (const lado of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(1.8, 2.2, LARGO), hormigonHondo, lado * 4.6, -2.3, -120)
  }
  // Nervios transversales cada pocos metros: le dan escala al canto.
  for (let z = DESDE_Z; z > HASTA_Z; z -= 7) {
    pon(g, new THREE.BoxGeometry(MEDIO_TABLERO * 2 - 0.6, 1.1, 0.5), hormigonHondo, 0, -2, z)
  }

  // --- barreras de la calzada ------------------------------------------------
  // Las que cierran el campo a tres carriles. Perfil de barrera de hormigón:
  // ancha abajo y estrecha arriba, con su pasamanos de acero.
  for (const lado of [-1, 1]) {
    for (let z = DESDE_Z; z > HASTA_Z; z -= 4) {
      const zoca = pon(g, new THREE.BoxGeometry(0.62, 0.42, 3.8), hormigon, lado * BARRERA_X, 0.21, z)
      zoca.castShadow = true
      pon(g, new THREE.BoxGeometry(0.34, 0.38, 3.8), hormigon, lado * BARRERA_X, 0.6, z)
    }
    // El pasamanos, de una pieza: es fino y así no se ven las juntas.
    pon(g, new THREE.BoxGeometry(0.42, 0.1, LARGO), acero, lado * BARRERA_X, 0.84, -120)
  }

  // --- acera y pretil exterior ----------------------------------------------
  for (const lado of [-1, 1]) {
    // La acera, un escalón por encima de la calzada.
    pon(g, new THREE.BoxGeometry(MEDIO_TABLERO - 4.3, 0.16, LARGO), hormigonSucio,
      lado * (4.3 + (MEDIO_TABLERO - 4.3) / 2), 0.08, -120)
    // El pretil del borde: montantes y dos largueros. Por aquí se ve el vacío.
    for (let z = DESDE_Z; z > HASTA_Z; z -= 2.6) {
      pon(g, new THREE.BoxGeometry(0.1, 1.15, 0.1), acero, lado * (MEDIO_TABLERO - 0.25), 0.66, z)
    }
    for (const y of [0.72, 1.18]) {
      pon(g, new THREE.BoxGeometry(0.12, 0.09, LARGO), acero, lado * (MEDIO_TABLERO - 0.25), y, -120)
    }
    // Farolas del puente, altas y cada mucho.
    for (let z = DESDE_Z - 10; z > HASTA_Z; z -= 34) {
      pon(g, new THREE.CylinderGeometry(0.11, 0.15, 7, 7), acero, lado * (MEDIO_TABLERO - 0.7), 3.5, z)
      const brazo = pon(g, new THREE.BoxGeometry(1.5, 0.12, 0.12), acero, lado * (MEDIO_TABLERO - 1.4), 7, z)
      brazo.rotation.z = lado * 0.12
      pon(g, new THREE.BoxGeometry(0.7, 0.14, 0.32), mat(0xf6f1d8, 0.4), lado * (MEDIO_TABLERO - 2.1), 6.9, z)
    }
  }

  // --- los pilonos en V y sus tirantes ---------------------------------------
  // Los dos de verdad del Zolotói. En uve, que es su forma, y muy altos: son lo
  // único que dice «puente colgante» desde la cámara del juego.
  const pilonos = [-26, -128]
  for (const zp of pilonos) {
    for (const lado of [-1, 1]) {
      // La pata sale del borde del tablero y se inclina hacia dentro.
      const alto = 40
      const pata = pon(g, new THREE.BoxGeometry(2.2, alto, 2.6), hormigon, lado * 5.2, alto / 2 - 2, zp)
      pata.rotation.z = -lado * 0.1
      pata.castShadow = true
    }
    // El travesaño donde se juntan, arriba.
    pon(g, new THREE.BoxGeometry(11, 2, 2.8), hormigon, 0, 36, zp)
    pon(g, new THREE.BoxGeometry(13, 1.4, 2.2), hormigon, 0, 12, zp)

    // Los abanicos de tirantes: del alto del pilono al tablero, hacia los dos
    // lados. Cada uno es un cilindro estirado y girado a su sitio.
    // Abanico a los cuatro lados: hacia delante y hacia atrás de cada pilono, y
    // por los dos costados. Con un solo sentido el pilono parecía estar tirando
    // del puente hacia un lado.
    for (const lado of [-1, 1]) {
      for (const sentido of [-1, 1]) {
        for (let k = 1; k <= 8; k++) {
          const arriba = new THREE.Vector3(lado * 3.6, 34 - k * 2.4, zp)
          const abajo = new THREE.Vector3(lado * (MEDIO_TABLERO - 1.4), 1, zp + sentido * k * 8.5)
          const medio = arriba.clone().add(abajo).multiplyScalar(0.5)
          const t = pon(g, new THREE.CylinderGeometry(0.07, 0.07, arriba.distanceTo(abajo), 4),
            cable, medio.x, medio.y, medio.z)
          t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), abajo.clone().sub(arriba).normalize())
        }
      }
    }
  }

  // --- la orilla al fondo ----------------------------------------------------
  // Colinas nevadas con bloques, para que el puente vaya a alguna parte.
  const ladera = mat(0xd8dee2, 0.95)
  const bloque = mat(0x9aa3ab, 0.85)
  for (let i = 0; i < 9; i++) {
    const r = 30 + Math.random() * 60
    const c = pon(g, new THREE.SphereGeometry(r, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), ladera,
      (Math.random() - 0.5) * 460, FONDO_MAR, -300 - Math.random() * 130)
    c.scale.y = 0.34 + Math.random() * 0.3
  }
  for (let i = 0; i < 26; i++) {
    const h = 8 + Math.random() * 26
    pon(g, new THREE.BoxGeometry(5 + Math.random() * 7, h, 5 + Math.random() * 7), bloque,
      (Math.random() - 0.5) * 380, FONDO_MAR + h / 2 + 6, -300 - Math.random() * 110)
  }

  g.userData.carriles = 3
  // El puente se come el horizonte: ni cerros, ni vegetación, ni arenal.
  g.userData.tapaElMundo = true
  return g
}

export const ESCENARIOS = { puente }
