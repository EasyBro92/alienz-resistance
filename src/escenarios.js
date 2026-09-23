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

// --- el estadio --------------------------------------------------------------
// Se juega sobre el césped, con las gradas cerrando los cuatro lados. Aquí no
// se estrecha nada: cinco carriles son los que tiene el juego, y es el campo
// más ancho que se puede dar.
function estadio () {
  const g = new THREE.Group()
  const cesped = mat(0x3a7135, 0.95)
  const cespedClaro = mat(0x447f3d, 0.95)
  const cespedRaya = new THREE.MeshBasicMaterial({ color: 0xf2f5ef, transparent: true, opacity: 0.55 })
  const hormigon = mat(0xb9b5ad, 0.9)
  const hormigonHondo = mat(0x7d7a74, 0.92)
  const asiento = mat(0xdcdcd8, 0.85)
  const asientoAzul = mat(0x27407a, 0.85)
  const acero = mat(0xc3c7cb, 0.4, 0.5)

  // Medido sobre la camara real: el borde de pantalla pasa por x ~13 a z=-40 y
  // x ~22 a z=-90. Con el cesped a 26 las gradas se quedaban FUERA del encuadre
  // y no se veia que estuvieras dentro de un estadio.
  const MEDIO = 12          // media anchura del césped
  const FONDO = -118        // fondo del campo
  const FRENTE = 16

  // --- el césped y sus rayas -------------------------------------------------
  pon(g, new THREE.PlaneGeometry(MEDIO * 2, FRENTE - FONDO), cesped, 0, -0.02, (FRENTE + FONDO) / 2)
    .rotation.x = -Math.PI / 2
  // Franjas de siega. Ademas de ser lo propio de un campo, disimulan la costura
  // entre este cesped y la franja central, que es la calzada del juego teñida.
  for (let z = FRENTE; z > FONDO; z -= 16) {
    pon(g, new THREE.PlaneGeometry(MEDIO * 2, 8), cespedClaro, 0, -0.012, z - 4)
      .rotation.x = -Math.PI / 2
  }
  const raya = (ancho, largo, x, z) => {
    const m = pon(g, new THREE.PlaneGeometry(ancho, largo), cespedRaya, x, 0.015, z)
    m.rotation.x = -Math.PI / 2
    return m
  }
  for (const lado of [-1, 1]) raya(0.3, FRENTE - FONDO - 8, lado * (MEDIO - 2), (FRENTE + FONDO) / 2)
  raya(MEDIO * 2 - 4, 0.3, 0, (FRENTE + FONDO) / 2)                 // medio campo
  for (const z of [FRENTE - 4, FONDO + 4]) raya(MEDIO * 2 - 4, 0.3, 0, z)
  for (const z of [FRENTE - 20, FONDO + 20]) {                      // áreas
    raya(20, 0.3, 0, z)
    for (const lado of [-1, 1]) raya(0.3, 16, lado * 10, z + (z > 0 ? 8 : -8))
  }
  const circulo = pon(g, new THREE.RingGeometry(7.2, 7.5, 40), cespedRaya, 0, 0.015, (FRENTE + FONDO) / 2)
  circulo.rotation.x = -Math.PI / 2

  // --- las gradas ------------------------------------------------------------
  // Cuatro tribunas en anillo. Cada una son peldaños que suben hacia fuera: a
  // esta distancia un plano inclinado con asientos pintados no se lee, y los
  // escalones de verdad sí dan la sensación de estar dentro de un cuenco.
  const PELDANOS = 16
  const construyeGrada = (largo, x, z, giro) => {
    const t = new THREE.Group()
    t.position.set(x, 0, z)
    t.rotation.y = giro
    for (let k = 0; k < PELDANOS; k++) {
      const y = 1.1 + k * 1.05
      const fuera = 3 + k * 1.35
      pon(t, new THREE.BoxGeometry(largo, 1.05, 1.5), k % 4 === 3 ? hormigonHondo : hormigon, 0, y - 0.5, fuera)
      // Fila de asientos, uno de cada cuatro en azul: rompe la mancha gris.
      const butacas = Math.floor(largo / 2.4)
      for (let i = 0; i < butacas; i++) {
        pon(t, new THREE.BoxGeometry(1.5, 0.5, 0.55), (i % 7 === 2) ? asientoAzul : asiento,
          -largo / 2 + 1.2 + i * 2.4, y + 0.25, fuera - 0.35)
      }
    }
    // Voladizo: la visera de la cubierta, que es lo que cierra el cuenco.
    const visera = pon(t, new THREE.BoxGeometry(largo, 0.5, 14), hormigonHondo, 0, 1.1 + PELDANOS * 1.05 + 4, 12)
    visera.rotation.x = -0.08
    for (let i = -1; i <= 1; i += 2) {
      pon(t, new THREE.BoxGeometry(0.7, 12, 0.7), acero, i * (largo / 2 - 2), 1.1 + PELDANOS * 1.05 - 2, 18)
    }
    g.add(t)
  }
  // Muro de cierre del terreno de juego: entre el borde del césped y el primer
  // peldaño hay hueco, y sin muro el campo parecía acabarse en el aire.
  for (const lado of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(0.6, 2.2, FRENTE - FONDO + 6), hormigonHondo, lado * (MEDIO + 0.6), 1.1, (FRENTE + FONDO) / 2)
  }
  for (const z of [FONDO - 0.6, FRENTE + 0.6]) {
    pon(g, new THREE.BoxGeometry(MEDIO * 2 + 2, 2.2, 0.6), hormigonHondo, 0, 1.1, z)
  }

  const LARGO_LATERAL = FRENTE - FONDO + 10
  // Ojo con el giro: los peldaños crecen hacia el +z LOCAL de cada tribuna, así
  // que la de la izquierda tiene que mirar a -x y la de la derecha a +x. Con los
  // giros al revés las gradas crecían HACIA DENTRO y llenaban el campo de
  // bloques gigantes.
  construyeGrada(LARGO_LATERAL, -MEDIO - 1, (FRENTE + FONDO) / 2, -Math.PI / 2)
  construyeGrada(LARGO_LATERAL, MEDIO + 1, (FRENTE + FONDO) / 2, Math.PI / 2)
  construyeGrada(MEDIO * 2 + 10, 0, FONDO - 1, Math.PI)
  construyeGrada(MEDIO * 2 + 10, 0, FRENTE + 1, 0)

  // --- porterías -------------------------------------------------------------
  for (const [z, giro] of [[FONDO + 4, 0], [FRENTE - 4, Math.PI]]) {
    const p = new THREE.Group()
    p.position.set(0, 0, z)
    p.rotation.y = giro
    for (const lado of [-1, 1]) pon(p, new THREE.BoxGeometry(0.22, 2.6, 0.22), asiento, lado * 3.7, 1.3, 0)
    pon(p, new THREE.BoxGeometry(7.6, 0.22, 0.22), asiento, 0, 2.6, 0)
    g.add(p)
  }

  // --- focos y marcador ------------------------------------------------------
  for (const lado of [-1, 1]) {
    for (const z of [FONDO + 14, FRENTE - 14]) {
      pon(g, new THREE.CylinderGeometry(0.5, 0.8, 34, 8), acero, lado * (MEDIO + 26), 17, z)
      const panel = pon(g, new THREE.BoxGeometry(7, 3.4, 0.7), mat(0xf7f3dc, 0.35), lado * (MEDIO + 23), 33, z)
      panel.rotation.y = lado * 0.4
    }
  }
  pon(g, new THREE.BoxGeometry(22, 8, 1), mat(0x191b20, 0.8), 0, 24, FONDO - 4)
  pon(g, new THREE.BoxGeometry(19, 5.4, 0.4), mat(0x2b3a24, 0.6), 0, 24, FONDO - 4.6)

  g.userData.carriles = 5
  g.userData.tapaElMundo = true
  return g
}

// --- el circuito -------------------------------------------------------------
// Se corre por la pista de verdad, con pianos, escapatoria de grava, muros de
// neumáticos y la valla de seguridad. El muro de boxes se mete por un lado, así
// que aquí el campo baja a cuatro carriles y además de forma ASIMÉTRICA: el que
// se cierra es solo el de un lado.
function circuito () {
  const g = new THREE.Group()
  const piano = mat(0xd63a2f, 0.75)
  const pianoBlanco = mat(0xf0efe9, 0.75)
  const cesped = mat(0x4c7a3f, 0.95)
  const grava = mat(0xb9b2a2, 1)
  const goma = mat(0x22242a, 0.95)
  const gomaColor = [mat(0xd63a2f, 0.9), mat(0xf0efe9, 0.9), mat(0x2b62b0, 0.9)]
  const acero = mat(0xc3c7cb, 0.4, 0.55)
  const hormigon = mat(0xb9b5ad, 0.9)

  const BORDE = 6.9
  const DESDE = 30
  const HASTA = -260

  for (const lado of [-1, 1]) {
    // Piano: bloques rojos y blancos alternos pegados al asfalto.
    for (let z = DESDE, i = 0; z > HASTA; z -= 2.4, i++) {
      pon(g, new THREE.BoxGeometry(1.5, 0.12, 2.4), i % 2 ? piano : pianoBlanco, lado * (BORDE + 0.75), 0.06, z)
    }
    // Césped artificial y después la grava de la escapatoria.
    pon(g, new THREE.PlaneGeometry(4, DESDE - HASTA), cesped, lado * (BORDE + 3.6), 0.005, (DESDE + HASTA) / 2)
      .rotation.x = -Math.PI / 2
    pon(g, new THREE.PlaneGeometry(16, DESDE - HASTA), grava, lado * (BORDE + 13.6), 0, (DESDE + HASTA) / 2)
      .rotation.x = -Math.PI / 2
    // Muro de neumáticos: tres alturas, con la fila de arriba de colores.
    for (let z = DESDE; z > HASTA; z -= 1.5) {
      for (let k = 0; k < 3; k++) {
        const m = k === 2 ? gomaColor[(z | 0) % 3] : goma
        const r = pon(g, new THREE.CylinderGeometry(0.55, 0.55, 0.42, 9), m, lado * (BORDE + 22), 0.22 + k * 0.42, z)
        r.rotation.x = Math.PI / 2
      }
    }
    // Y detrás, la valla de seguridad: postes altos con su malla.
    for (let z = DESDE; z > HASTA; z -= 6) {
      pon(g, new THREE.BoxGeometry(0.16, 5.5, 0.16), acero, lado * (BORDE + 23.4), 2.75, z)
    }
    for (const y of [1.4, 3, 4.6]) {
      pon(g, new THREE.BoxGeometry(0.1, 0.12, DESDE - HASTA), acero, lado * (BORDE + 23.4), y, (DESDE + HASTA) / 2)
    }
  }

  // --- el muro de boxes, que es lo que estrecha la pista ---------------------
  // Va por el carril 4, el de la derecha: pared de hormigón con publicidad y el
  // muro de tiempos por encima.
  const X_MURO = 4.9
  for (let z = DESDE; z > HASTA; z -= 4) {
    pon(g, new THREE.BoxGeometry(0.5, 1.05, 3.9), hormigon, X_MURO, 0.52, z)
    pon(g, new THREE.BoxGeometry(0.56, 0.5, 3.9), (z | 0) % 8 === 0 ? piano : mat(0xe8e6e0, 0.7), X_MURO, 1.3, z)
  }
  // Los garajes al otro lado del muro.
  for (let z = DESDE - 6; z > -150; z -= 12) {
    pon(g, new THREE.BoxGeometry(11, 6.5, 11), hormigon, X_MURO + 9, 3.25, z)
    pon(g, new THREE.BoxGeometry(11.3, 0.6, 1.2), mat(0x2b3138, 0.8), X_MURO + 9, 5.6, z - 5.6)
  }

  // --- el pórtico de meta ----------------------------------------------------
  for (const z of [-8, -120]) {
    for (const lado of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(1.1, 11, 1.1), acero, lado * (BORDE + 2.6), 5.5, z)
    }
    pon(g, new THREE.BoxGeometry((BORDE + 3.2) * 2, 1.9, 1.6), mat(0x22262c, 0.7), 0, 11.4, z)
    pon(g, new THREE.BoxGeometry((BORDE + 2) * 2, 1.1, 0.5), mat(0xe8e6e0, 0.6), 0, 11.4, z - 0.9)
    // Los semáforos de salida.
    for (let k = -2; k <= 2; k++) {
      pon(g, new THREE.SphereGeometry(0.34, 8, 6), k < 0 ? mat(0x3a1010, 0.5) : mat(0x120c0c, 0.5), k * 2.2, 10.2, z - 0.9)
    }
  }

  // --- tribuna al otro lado --------------------------------------------------
  for (let k = 0; k < 11; k++) {
    pon(g, new THREE.BoxGeometry(150, 0.9, 1.5), k % 4 === 3 ? mat(0x7d7a74, 0.92) : hormigon,
      0, 1 + k * 0.9, -(BORDE + 30 + k * 1.5))
  }
  for (let i = 0; i < 90; i++) {
    pon(g, new THREE.BoxGeometry(1, 0.5, 0.55), i % 6 === 1 ? mat(0xd63a2f, 0.85) : mat(0xdcdcd8, 0.85),
      -72 + (i % 45) * 3.2, 1.6 + Math.floor(i / 45) * 2.7, -(BORDE + 31.5 + Math.floor(i / 45) * 4.5))
  }

  g.userData.carriles = 4
  g.userData.tapaElMundo = true
  return g
}

export const ESCENARIOS = { puente, estadio, circuito }
