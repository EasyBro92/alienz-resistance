// República Dominicana: Punta Cana, Santo Domingo y Puerto Plata.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const BANDERA_RD = [0x002d62, 0xce1126, 0x002d62]
const PIEL = 0x9a6a48
const CARIBE = [0xf2c14e, 0x4fb3bf, 0xef7b6b, 0x8fd18a, 0xf29ad8, 0x7fa8e8]

// Techo de cana: cono de palma seca con los anillos de las capas.
function techoCana (g, x, y, z, r, alto, lados = 12) {
  const cana = mat(0xb08a52, 1)
  const canaOscura = mat(0x8a6a3e, 1)
  pon(g, geoCil(0.05, r, alto, lados), cana, x, y + alto / 2, z)
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    pon(g, geoCil(r * (1 - t) + 0.1, r * (1 - t) + 0.1, 0.14, lados), canaOscura, x, y + alto * t, z)
  }
  pon(g, geoCil(0.2, 0.3, 0.6, 8), canaOscura, x, y + alto + 0.2, z)
}

// Punta Cana, a la izquierda (el mar queda a la derecha): un hotel de playa en
// Bávaro. El gran bohío del vestíbulo con su techo de cana, las piscinas de
// formas libres con el bar dentro del agua, las hamacas y las palapas, los
// bloques del hotel de colores claros con balcones, los cocoteros y la gente.
export function bavaro () {
  const g = new THREE.Group()
  const blanco = mat(0xf4f1ea, 0.8)
  const madera = mat(0x7a5a3a, 0.9)

  explanada(g, { x: 14, z: 0, ancho: 40, fondo: 100, color: 0xefe3c4, juntas: null })
  cesped(g, { x: 22, z: 0, ancho: 20, fondo: 80, color: 0x6aa84f })

  // --- las piscinas ---
  const agua = mat(0x39c3d8, 0.08, 0.2)
  for (const [x, z, rx, rz] of [[8, 18, 6, 10], [12, 2, 5, 7], [8, -14, 7, 9], [14, -30, 4, 6]]) {
    pon(g, geoCil(1, 1, 0.5, 28), mat(0xf2efe6, 0.8), x, 0.25, z).scale.set(rx + 0.6, 1, rz + 0.6)
    pon(g, geoCil(1, 1, 0.52, 28), agua, x, 0.27, z).scale.set(rx, 1, rz)
  }
  // El bar dentro del agua.
  pon(g, geoCil(1.8, 1.8, 1.2, 16), madera, 8, 0.6, 18)
  techoCana(g, 8, 3, 18, 3, 2.4)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    pon(g, geoCil(0.08, 0.1, 2.4, 6), madera, 8 + Math.cos(a) * 1.6, 1.8, 18 + Math.sin(a) * 1.6)
  }
  // Hamacas y palapas alrededor.
  for (let i = 0; i < 22; i++) {
    const x = azar(0, 20)
    const z = azar(-44, 44)
    pon(g, geoCaja(0.8, 0.2, 2), blanco, x, 0.35, z).rotation.x = -0.1
    pon(g, geoCaja(0.8, 0.9, 0.2), blanco, x, 0.7, z - 1).rotation.x = -0.6
  }
  for (let i = 0; i < 10; i++) {
    const x = azar(-2, 4)
    const z = -42 + i * 9
    pon(g, geoCil(0.08, 0.1, 2.6, 6), madera, x, 1.3, z)
    techoCana(g, x, 2.4, z, 1.8, 1.2, 10)
  }

  // --- el bohío del vestíbulo ---
  const BX = 26
  const BZ = 14
  pon(g, geoCil(10, 10.5, 0.8, 24), mat(0xd9cdb4, 0.9), BX, 0.4, BZ)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    pon(g, geoCil(0.3, 0.35, 7, 8), madera, BX + Math.cos(a) * 8.6, 4.3, BZ + Math.sin(a) * 8.6)
  }
  pon(g, geoCil(1, 1.2, 8, 10), madera, BX, 4.8, BZ)
  techoCana(g, BX, 7.6, BZ, 11.5, 9, 16)
  // Los sofás y la recepción dentro.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    pon(g, geoCaja(2, 0.7, 0.8), mat(elige([0xe8dcc0, 0x4fb3bf]), 0.8), BX + Math.cos(a) * 5, 1.15, BZ + Math.sin(a) * 5).rotation.y = -a
  }

  // --- los bloques del hotel ---
  for (const [z, color] of [[-36, 0xf2e8d4], [-18, 0xe8dcc0], [34, 0xf4efe0]]) {
    const b = sub(g, 34, 0, z)
    pon(b, geoCaja(10, 12, 14), mat(color, 0.85), 0, 6, 0)
    for (let y = 1.2; y < 12; y += 3) {
      pon(b, geoCaja(1.6, 0.25, 13), blanco, -5.8, y + 1.5, 0)
      for (let dz = -6; dz <= 6; dz += 1.6) pon(b, geoCaja(0.1, 0.8, 0.1), blanco, -6.55, y + 2, dz)
      pon(b, geoCaja(0.1, 2, 12), vidrio(0x4f7f95), -5.05, y + 1, 0)
    }
    techoCana(b, 0, 12, 0, 7, 4, 4)
  }

  // --- cocoteros y gente ---
  for (let i = 0; i < 30; i++) arbol(g, azar(-4, 36), azar(-48, 48), 'palmera', azar(0.9, 1.2))
  gente(g, 70, { x0: -3, x1: 22, z0: 46, z1: -46, piel: PIEL })
  bandera(g, BX - 12, BZ, 8, BANDERA_RD)

  return colocar(g, -1, -62)
}

// Santo Domingo, a la izquierda: la Zona Colonial. El Alcázar de Colón de
// piedra coralina con sus dos pisos de galerías de cinco arcos mirando a la
// Plaza de España, los cuerpos de los extremos, los escudos y la estatua de
// Ovando; alrededor las casas coloniales de colores con balcones de madera y
// las Atarazanas; laureles, flamboyanes y gente. Detrás, la Catedral Primada.
export function alcazarColon () {
  const g = new THREE.Group()
  const coral = mat(0xd8c7a3, 0.95)
  const coralSombra = mat(0xbfae8a, 0.95)
  const hueco = mat(0x3a3128, 1)
  const madera = mat(0x5a3a22, 0.9)

  // --- la Plaza de España ---
  explanada(g, { x: 0, z: 0, ancho: 20, fondo: 90, color: 0xc9b89a, juntas: 0xb3a282, paso: 1.8 })
  gente(g, 70, { x0: -8, x1: 8, z0: 44, z1: -44, piel: PIEL })
  for (let i = 0; i < 10; i++) arbol(g, elige([-8, 8]) + azar(-1, 1), azar(-40, 40), elige(['copa', 'flamboyan']), 1.1)
  for (let z = 36; z > -40; z -= 12) farola(g, -9, z, 4.5, 0x2a2a2a)
  // La estatua de Nicolás de Ovando.
  pon(g, geoCaja(1.6, 2, 1.6), coralSombra, -2, 1, -18)
  pon(g, geoCil(0.35, 0.5, 2, 8), mat(0x3f4a42, 0.5, 0.5), -2, 3, -18)
  pon(g, geoBola(0.3, 8, 6), mat(0x3f4a42, 0.5, 0.5), -2, 4.3, -18)

  // --- el Alcázar ---
  const AX = 16
  const W = 8
  const L = 30
  pon(g, geoCaja(W, 12, L), coral, AX, 6, 0)
  // Las dos galerías de cinco arcos, en sombra.
  pon(g, geoCaja(0.5, 11, L - 10), mat(0x6a5a44, 1), AX - W / 2 + 1.8, 5.5, 0)
  for (const y of [0, 6]) {
    pon(g, geoCaja(2, 0.6, L - 10), coralSombra, AX - W / 2 + 1, y + 5.7, 0)
    for (let i = 0; i <= 5; i++) {
      const z = -(L - 10) / 2 + i * ((L - 10) / 5)
      pon(g, geoCaja(0.9, 5.4, 0.9), coral, AX - W / 2 + 0.1, y + 2.7, z)
    }
    for (let i = 0; i < 5; i++) {
      const z = -(L - 10) / 2 + (i + 0.5) * ((L - 10) / 5)
      const arco = pon(g, new THREE.TorusGeometry(1.6, 0.35, 6, 14, Math.PI), coral, AX - W / 2 + 0.1, y + 3.8, z)
      arco.rotation.y = Math.PI / 2
    }
  }
  // Los cuerpos macizos de los extremos con sus ventanas y los escudos.
  for (const s of [-1, 1]) {
    const z = s * (L / 2 - 2.5)
    pon(g, geoCaja(W + 1, 13, 5), coral, AX - 0.5, 6.5, z)
    for (const y of [2.5, 8.5]) {
      pon(g, geoCaja(0.1, 2.2, 1.4), madera, AX - W / 2 - 1.05, y, z)
      pon(g, geoCaja(0.3, 0.2, 1.8), coralSombra, AX - W / 2 - 1.1, y + 1.3, z)
    }
    pon(g, geoCaja(0.15, 1.4, 1.2), coralSombra, AX - W / 2 - 1.1, 11.5, z)
  }
  pon(g, geoCaja(W + 1.2, 0.5, L + 0.4), coralSombra, AX - 0.3, 12.2, 0)
  for (let z = -L / 2; z <= L / 2; z += 1.4) pon(g, geoCaja(0.4, 0.6, 0.4), coral, AX - W / 2 - 0.3, 12.7, z)
  bandera(g, AX, 0, 5, BANDERA_RD, 12.5)

  // --- las casas coloniales y las Atarazanas ---
  for (let i = 0; i < 8; i++) {
    const z = -44 + i * 11
    if (Math.abs(z) < 18) continue
    const c = sub(g, 30, 0, z)
    const alto = azar(6, 9)
    pon(c, geoCaja(8, alto, 10), mat(elige(CARIBE), 0.85), 0, alto / 2, 0)
    pon(c, geoCaja(1.4, 0.2, 8), madera, -4.7, alto * 0.62, 0)
    for (let dz = -3.5; dz <= 3.5; dz += 0.7) pon(c, geoCaja(0.08, 1, 0.08), madera, -5.3, alto * 0.62 + 0.5, dz)
    for (const dz of [-2.5, 0, 2.5]) {
      pon(c, geoCaja(0.1, 2, 1.2), madera, -4.05, 1.2, dz)
      pon(c, geoCaja(0.1, 1.8, 1.2), madera, -4.05, alto * 0.62 + 1.2, dz)
    }
    pon(c, geoCaja(8.2, 0.4, 10.2), mat(0xf2efe6, 0.8), 0, alto, 0)
  }
  for (let i = 0; i < 5; i++) {
    const at = sub(g, 30, 0, -12 + i * 6)
    pon(at, geoCaja(7, 6, 5.6), coral, 0, 3, 0)
    aguas(sub(at, 0, 0, 0, Math.PI / 2), mat(0xa4553a, 0.85), 5.8, 1.6, 7.2, 0, 6, 0)
    arcada(at, hueco, { ancho: 3, alto: 3.5, n: 1, x: -3.55, y: 0, z: 0, giro: -Math.PI / 2, hueco: 0.8 })
  }

  // --- la Catedral Primada al fondo ---
  const CZ = -52
  pon(g, geoCaja(12, 11, 22), coral, 14, 5.5, CZ)
  pon(g, geoCaja(1, 14, 12), coral, 7.5, 7, CZ)
  arcada(g, hueco, { ancho: 8, alto: 6, n: 2, x: 6.95, y: 0, z: CZ, giro: -Math.PI / 2, hueco: 0.7 })
  pon(g, geoCaja(1.2, 3.5, 12), coralSombra, 7.4, 12.2, CZ)
  for (let i = 0; i < 4; i++) pon(g, geoCaja(0.8, 11, 0.8), coralSombra, 8, 5.5, CZ - 9 + i * 6)

  return colocar(g, -1, -62)
}

// El Faro a Colón, a la derecha: la cruz tumbada de hormigón escalonado —el
// brazo largo y los cortos—, las gradas de sus flancos, la capilla del
// mausoleo en el cruce, los cañones de luz del techo que proyectan la cruz en
// el cielo, los jardines y las banderas de América alrededor.
export function faroColon () {
  const g = new THREE.Group()
  const hormigon = mat(0xa39d92, 0.95)
  const hormigonClaro = mat(0xb9b3a8, 0.9)
  const hueco = mat(0x3a3530, 1)

  explanada(g, { x: 0, z: 0, ancho: 36, fondo: 90, color: 0xc9c2b4, juntas: 0xb3ab9c, paso: 4 })
  cesped(g, { x: -10, z: 0, ancho: 8, fondo: 70, color: 0x5f9a45 })
  // El brazo largo, escalonado.
  for (let k = 0; k < 8; k++) pon(g, geoCaja(12 - k * 1.3, 1.4, 70 - k * 6.5), k % 2 ? hormigonClaro : hormigon, 4, 0.7 + k * 1.4, 0)
  // El brazo corto.
  for (let k = 0; k < 7; k++) pon(g, geoCaja(34 - k * 4, 1.4, 10 - k * 1.1), k % 2 ? hormigonClaro : hormigon, 4, 0.7 + k * 1.4, -10)
  // Las rendijas de luz del lomo y la capilla del cruce.
  for (let z = -30; z <= 30; z += 3) pon(g, geoCaja(1.2, 0.2, 0.6), mat(0xfff6d8, 0.4), 4, 11.3, z)
  pon(g, geoCaja(4, 3, 6), hueco, 4, 1.5, -10)
  // Los cañones de luz y el haz en cruz.
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.28, depthWrite: false })
  for (let i = 0; i < 8; i++) {
    const h = pon(g, geoCil(0.25, 0.5, 40, 8), luz, 4 + azar(-1, 1), 31, -10 + azar(-1, 1))
    h.userData.sinFoco = true
  }
  // Banderas de América a lo largo del paseo.
  const colores = [[0x002d62, 0xce1126], [0x006847, 0xce1126], [0x74acdf, 0xffffff], [0xfcd116, 0x003893], [0x009c3b, 0xffdf00]]
  for (let i = 0; i < 12; i++) bandera(g, -15, -40 + i * 7, 6, elige(colores))
  gente(g, 35, { x0: -14, x1: -4, z0: 40, z1: -40, piel: PIEL })
  for (let i = 0; i < 12; i++) arbol(g, azar(14, 20), azar(-40, 40), elige(['palmera', 'copa']), 1)

  return colocar(g, 1, -62)
}

// Puerto Plata, a la derecha: la fortaleza de San Felipe en su promontorio.
// Los muros bajos de piedra con las troneras y los cañones, el torreón redondo
// con su garita, el foso y el puente, el Malecón con palmeras y gente, el mar
// detrás con las olas rompiendo en las rocas, y al fondo la loma Isabel de
// Torres, verde, con el teleférico subiendo al Cristo de la cima.
export function sanFelipe () {
  const g = new THREE.Group()
  const piedra = mat(0xb8a888, 0.95)
  const piedraSombra = mat(0x9a8c6e, 0.95)
  const hueco = mat(0x2e261e, 1)
  const hierro = mat(0x2a2a2a, 0.5, 0.5)

  // --- el Malecón ---
  explanada(g, { x: -2, z: 0, ancho: 8, fondo: 100, color: 0xd9cdb4, juntas: 0xc2b598, paso: 2 })
  for (let z = 46; z > -48; z -= 7) arbol(g, -5, z, 'palmera', 1)
  for (let z = 44; z > -46; z -= 11) farola(g, 1.4, z, 4.5, 0x2a2a2a)
  gente(g, 50, { x0: -5, x1: 1.5, z0: 48, z1: -48, piel: PIEL })

  // --- el promontorio y el mar ---
  mar(g, { x: 36, z: 0, ancho: 50, fondo: 120, color: 0x2fa3b8 })
  pon(g, geoCil(20, 23, 2.4, 14), mat(0x8a8474, 1), 18, 1.2, 4).scale.z = 1.4
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2
    pon(g, new THREE.DodecahedronGeometry(azar(0.8, 1.8), 0), mat(0x6f6a5e, 1), 18 + Math.cos(a) * 22, azar(0, 1.2), 4 + Math.sin(a) * 30)
  }
  // Espuma rompiendo en las rocas.
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2
    pon(g, geoBola(azar(0.5, 1.2), 8, 6), mat(0xf5faf8, 0.7), 18 + Math.cos(a) * 24, 0.3, 4 + Math.sin(a) * 33).scale.y = 0.3
  }
  cesped(g, { x: 18, z: 4, ancho: 30, fondo: 44, color: 0x6a9a48 })

  // --- la fortaleza ---
  const FX = 18
  const FZ = 4
  const Y = 2.6
  pon(g, geoCaja(24, 0.6, 22), mat(0x4a6f7a, 0.2, 0.2), FX, Y - 0.2, FZ)
  pon(g, geoCaja(20, 5, 18), piedra, FX, Y + 2.5, FZ)
  pon(g, geoCaja(20.6, 0.6, 18.6), piedraSombra, FX, Y + 5.3, FZ)
  explanada(g, { x: FX, z: FZ, ancho: 18, fondo: 16, color: 0xc9b89a, juntas: null, y: Y + 5.4 })
  // Parapeto con troneras y cañones.
  for (const s of [-1, 1]) {
    for (let u = -8.5; u <= 8.5; u += 1.6) {
      pon(g, geoCaja(0.9, 1, 0.8), piedra, FX + u, Y + 6.1, FZ + s * 8.6)
      pon(g, geoCaja(0.8, 1, 0.9), piedra, FX + s * 9.6, Y + 6.1, FZ + u * 0.85)
    }
  }
  for (const [dz, dx] of [[-5, -9.2], [0, -9.2], [5, -9.2]]) {
    pon(g, geoCil(0.25, 0.3, 2.6, 10), hierro, FX + dx - 0.6, Y + 6.2, FZ + dz).rotation.z = Math.PI / 2
    pon(g, geoCaja(1, 0.5, 1), mat(0x5a3a22, 0.9), FX + dx + 0.4, Y + 5.8, FZ + dz)
  }
  for (let i = 0; i < 4; i++) pon(g, geoCaja(0.1, 0.8, 1.2), hueco, FX - 10.05, Y + 2.5, FZ - 6 + i * 4)
  // El torreón redondo con su garita.
  const TX = FX + 8
  const TZ = FZ - 7
  pon(g, geoCil(4, 4.6, 11, 20), piedra, TX, Y + 5.5, TZ)
  almenas(g, piedra, 4, Y + 11.5, 16, TX, TZ, 0.7)
  pon(g, geoCil(1.4, 1.4, 2.4, 12), piedraSombra, TX, Y + 12.2, TZ)
  pon(g, geoCupula(1.5), piedraSombra, TX, Y + 13.4, TZ)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    pon(g, geoCaja(0.15, 1, 0.5), hueco, TX + Math.cos(a) * 4.2, Y + 7, TZ + Math.sin(a) * 4.2).rotation.y = Math.PI / 2 - a
  }
  // La puerta y el puente sobre el foso.
  arcada(g, hueco, { ancho: 3, alto: 3.4, n: 1, x: FX - 10.05, y: Y, z: FZ + 4, giro: -Math.PI / 2, hueco: 0.8 })
  pon(g, geoCaja(4, 0.4, 2.6), mat(0x6b543c, 0.9), FX - 12, Y + 0.2, FZ + 4)
  bandera(g, FX, FZ, 6, BANDERA_RD, Y + 5.5)
  gente(g, 20, { x0: FX - 8, x1: FX + 8, z0: FZ + 7, z1: FZ - 7, y: Y + 5.5, piel: PIEL })

  // --- la loma Isabel de Torres con el teleférico y el Cristo ---
  const fondo = m => { m.userData.sinFoco = true; return m }
  const LX = 30
  const LZ = -50
  fondo(pon(g, geoCil(4, 30, 34, 10), mat(0x3f7a3a, 1), LX, 17, LZ))
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(6, 26)
    const y = 34 * (30 - r) / 26
    fondo(pon(g, geoBola(azar(1.5, 3), 8, 6), mat(0x2f6b2f, 1), LX + Math.cos(a) * r, y, LZ + Math.sin(a) * r))
  }
  fondo(pon(g, geoCaja(1, 2, 1), mat(0xf2efe6, 0.7), LX, 35, LZ))
  fondo(pon(g, geoCaja(3.4, 0.5, 0.5), mat(0xf2efe6, 0.7), LX, 36.2, LZ))
  fondo(pon(g, geoBola(0.4, 8, 6), mat(0xf2efe6, 0.7), LX, 37, LZ))
  fondo(barra(g, hierro, V(6, 6, 30), V(LX - 2, 34, LZ), 0.1))
  for (const t of [0.3, 0.65]) {
    const p = V(6 + (LX - 8) * t, 6 + 28 * t - 1.4, 30 + (LZ - 30) * t)
    fondo(pon(g, geoCaja(1.6, 1.8, 2), mat(0xd23a2a, 0.5), p.x, p.y, p.z))
  }
  fondo(pon(g, geoCaja(4, 6, 4), piedra, 6, 3, 30))

  return colocar(g, 1, -62)
}
