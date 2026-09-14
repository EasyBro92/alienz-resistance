// México: Monterrey, Guadalajara y Ciudad de México.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar, espejo
} from './piezas.js'

const BANDERA_MEXICO = [0x006847, 0xffffff, 0xce1126]
const PIEL = 0xb07a52

// Monterrey, a la derecha: la Macroplaza. El Faro del Comercio —la lámina
// naranja de Barragán con su ranura y el láser verde—, la catedral de cantera
// con su campanario barroco, el Palacio Municipal sobre sus pilotes, la fuente
// de Neptuno, los jardines, las astas y la gente.
export function faroComercio () {
  const g = new THREE.Group()
  const naranja = mat(0xd9652b, 0.85)
  const cantera = mat(0xd9c29a, 0.9)
  const canteraSombra = mat(0xbfa67c, 0.9)
  const hormigon = mat(0xb8b4ac, 0.85)
  const hueco = mat(0x3a3026, 1)

  explanada(g, { x: 8, z: 0, ancho: 36, fondo: 96, color: 0xd6c8ae, juntas: 0xbfb096, paso: 4 })
  cesped(g, { x: 2, z: 30, ancho: 14, fondo: 16, color: 0x5f9a45 })
  cesped(g, { x: 2, z: -34, ancho: 14, fondo: 18, color: 0x5f9a45 })
  for (let i = 0; i < 20; i++) arbol(g, azar(-8, 20), elige([azar(24, 44), azar(-46, -26)]), 'copa', 1.1)
  gente(g, 70, { x0: -8, x1: 22, z0: 44, z1: -44, piel: PIEL })

  // --- el Faro del Comercio ---
  const FX = 6
  const FZ = 0
  pon(g, geoCaja(6, 1, 12), hormigon, FX, 0.5, FZ)
  pon(g, geoCaja(2.2, 38, 7), naranja, FX, 20, FZ)
  pon(g, geoCaja(2.25, 30, 0.6), hueco, FX, 17, FZ + 1.6)
  pon(g, geoCaja(2.5, 1.6, 2), mat(0x2a2a2a, 0.6), FX, 39.5, FZ - 2)
  const laser = new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.45, depthWrite: false })
  const rayo = pon(g, geoCil(0.12, 0.12, 70, 6), laser, FX + 20, 44, FZ - 18)
  rayo.rotation.set(0.5, 0, -1.1)
  rayo.userData.sinFoco = true

  // --- la fuente de Neptuno ---
  estanque(g, { x: -2, z: 14, ancho: 10, fondo: 10, redondo: true, color: 0x3f9cc4 })
  pon(g, geoCaja(1.6, 1.4, 1.6), cantera, -2, 1, 14)
  pon(g, geoCil(0.35, 0.5, 2.6, 8), mat(0x3f4a42, 0.5, 0.5), -2, 3, 14)
  barra(g, mat(0x3f4a42, 0.5, 0.5), V(-2, 3.5, 14), V(-2.4, 5.4, 14.2), 0.08)

  // --- la catedral ---
  const CX = 24
  const CZ = 22
  pon(g, geoCaja(10, 10, 20), cantera, CX, 5, CZ)
  aguas(g, canteraSombra, 10, 2.4, 20, CX, 10, CZ)
  pon(g, geoCaja(1.2, 13, 12), cantera, CX - 5.4, 6.5, CZ)
  arcada(g, hueco, { ancho: 3, alto: 4.4, n: 1, x: CX - 6.05, y: 0, z: CZ, giro: -Math.PI / 2, hueco: 0.8 })
  for (const dz of [-3, 3]) {
    pon(g, geoCil(0.3, 0.3, 5, 10), cantera, CX - 6.3, 2.5, CZ + dz)
    pon(g, geoCil(0.25, 0.25, 4, 10), cantera, CX - 6.3, 7.5, CZ + dz)
  }
  pon(g, geoCil(0.9, 0.9, 0.1, 16), mat(0x6f7f99, 0.3, 0.3), CX - 6.08, 8.5, CZ).rotation.z = Math.PI / 2
  pon(g, geoTronco(0.1, 1, 2.4).scale(1, 1, 5), cantera, CX - 5.4, 14.2, CZ)
  // El campanario barroco.
  const BZ = CZ - 8
  pon(g, geoCaja(4, 16, 4), cantera, CX - 3, 8, BZ)
  for (const y of [11, 14.5]) {
    for (const [dx, dz, giro] of [[-2.02, 0, -Math.PI / 2], [0, 2.02, 0], [0, -2.02, Math.PI], [2.02, 0, Math.PI / 2]]) {
      arcada(g, hueco, { ancho: 2.8, alto: 2.4, n: 1, x: CX - 3 + dx, y, z: BZ + dz, giro, hueco: 0.8 })
    }
  }
  pon(g, geoCaja(4.6, 0.5, 4.6), canteraSombra, CX - 3, 16.3, BZ)
  pon(g, geoCaja(3, 3, 3), cantera, CX - 3, 18, BZ)
  pon(g, geoCupula(1.6), mat(0x3f6fa8, 0.4, 0.3), CX - 3, 19.5, BZ).scale.y = 1.3
  pon(g, geoCil(0.05, 0.05, 1.8, 6), mat(0x2a2a2a), CX - 3, 22.2, BZ)

  // --- el Palacio Municipal sobre pilotes ---
  const PX = 24
  const PZ = -24
  for (let dz = -10; dz <= 10; dz += 5) {
    for (const dx of [-4, 4]) pon(g, geoCaja(1.2, 7, 1.2), hormigon, PX + dx, 3.5, PZ + dz)
  }
  pon(g, geoCaja(12, 7, 26), hormigon, PX, 10.5, PZ)
  for (let y = 8; y < 14; y += 1.8) pon(g, geoCaja(12.1, 0.8, 26.1), mat(0x3b4955, 0.3, 0.4), PX, y, PZ)
  bandera(g, PX - 8, PZ, 12, BANDERA_MEXICO)

  // --- el Teatro de la Ciudad y los edificios alrededor ---
  const fila = []
  for (let z = -44; z <= 44; z += 11) fila.push([42, z, 10, azar(12, 24), 9])
  bloques(g, fila, 1, { colores: [0xe0d6c0, 0xcfc4ae, 0xd9a878, 0xb8c4c8] })

  return colocar(g, 1, -62)
}

// Guadalajara, a la derecha: la catedral con sus dos torres neogóticas de
// azulejo amarillo, la fachada de cantera con los contrafuertes y el reloj, la
// cúpula; delante la Plaza de Armas con el quiosco modernista de hierro, los
// laureles de la India y las jacarandas, la Rotonda de los Jaliscienses
// Ilustres con su columnata, el Palacio de Gobierno y las calandrias.
export function catedralGdl () {
  const g = new THREE.Group()
  const cantera = mat(0xe6d9b8, 0.85)
  const canteraSombra = mat(0xcbbd98, 0.9)
  const amarillo = mat(0xe8b92e, 0.4, 0.15)
  const azul = mat(0x2f5fa8, 0.4, 0.15)
  const hueco = mat(0x4a4540, 1)
  const hierro = mat(0x3a4a44, 0.5, 0.5)

  explanada(g, { x: 6, z: 0, ancho: 34, fondo: 96, color: 0xd9cdb4, juntas: 0xc2b598, paso: 3 })

  // --- la Plaza de Armas con el quiosco ---
  const QX = -2
  const QZ = 22
  cesped(g, { x: QX, z: QZ, ancho: 16, fondo: 16, color: 0x5f9a45 })
  pon(g, geoCil(3.6, 3.8, 1.4, 12), cantera, QX, 0.7, QZ)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoCil(0.1, 0.12, 4, 8), hierro, QX + Math.cos(a) * 3.2, 3.4, QZ + Math.sin(a) * 3.2)
    pon(g, new THREE.TorusGeometry(0.6, 0.06, 4, 10, Math.PI), hierro, QX + Math.cos(a + 0.39) * 3.1, 5.2, QZ + Math.sin(a + 0.39) * 3.1).rotation.y = Math.PI / 2 - a - 0.39
  }
  pon(g, geoCil(0.6, 4.4, 1.8, 16), mat(0x5a7a6a, 0.4, 0.5), QX, 6.3, QZ)
  pon(g, geoCupula(0.8), mat(0x5a7a6a, 0.4, 0.5), QX, 7.2, QZ)
  for (let i = 0; i < 12; i++) arbol(g, QX + azar(-7, 7), QZ + elige([azar(-8, -5), azar(5, 8)]), i % 3 === 0 ? 'jacaranda' : 'copa', 1)

  // --- la catedral ---
  const CX = 18
  const CZ = 0
  pon(g, geoCaja(14, 12, 30), cantera, CX, 6, CZ)
  aguas(sub(g, CX, 0, CZ, 0), canteraSombra, 14, 3, 30, 0, 12, 0)
  for (let z = CZ - 13; z <= CZ + 13; z += 4.3) {
    for (const s of [-1, 1]) {
      pon(g, geoCaja(0.8, 12, 0.8), canteraSombra, CX + s * 7.3, 6, z)
      pon(g, geoCaja(0.1, 4.5, 1.4), hueco, CX + s * 7.05, 6.5, z + 2)
    }
  }
  // La fachada: pilastras, portada, reloj y remate.
  const FX = CX - 7.1
  pon(g, geoCaja(1.2, 15, 12), cantera, FX, 7.5, CZ)
  arcada(g, hueco, { ancho: 4, alto: 6, n: 1, x: FX - 0.65, y: 0, z: CZ, giro: -Math.PI / 2, hueco: 0.8 })
  for (const dz of [-3.6, -2.4, 2.4, 3.6]) pon(g, geoCil(0.3, 0.3, 7, 10), cantera, FX - 0.9, 3.5, CZ + dz)
  pon(g, geoCaja(1.4, 1, 10), canteraSombra, FX - 0.1, 7.5, CZ)
  arcada(g, hueco, { ancho: 3, alto: 3.5, n: 1, x: FX - 0.65, y: 8.2, z: CZ, giro: -Math.PI / 2 })
  pon(g, geoCil(1.1, 1.1, 0.12, 20), mat(0xf2efe6, 0.6), FX - 0.66, 13, CZ).rotation.z = Math.PI / 2
  pon(g, geoTronco(0.05, 1, 3).scale(0.6, 1, 4), cantera, FX, 16.5, CZ)
  // Las dos torres con sus agujas de azulejo amarillo y las franjas azules.
  for (const s of [-1, 1]) {
    const tz = CZ + s * 8.2
    pon(g, geoCaja(4.6, 20, 4.6), cantera, FX + 1.2, 10, tz)
    for (const y of [12.5, 17]) {
      for (const [dx, dz, giro] of [[-2.32, 0, -Math.PI / 2], [0, 2.32, 0], [0, -2.32, Math.PI], [2.32, 0, Math.PI / 2]]) {
        arcada(g, hueco, { ancho: 3, alto: 3, n: 2, x: FX + 1.2 + dx, y, z: tz + dz, giro })
      }
    }
    pon(g, geoCaja(5.2, 0.6, 5.2), canteraSombra, FX + 1.2, 20.3, tz)
    for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) pon(g, geoCil(0.02, 0.35, 2.4, 6), cantera, FX + 1.2 + dx, 21.8, tz + dz)
    const aguja = pon(g, geoCil(0.05, 2.3, 11, 8), amarillo, FX + 1.2, 26.1, tz)
    aguja.rotation.y = Math.PI / 8
    for (const y of [22.5, 25, 27.5]) {
      const r = 2.3 * (1 - (y - 20.6) / 11)
      pon(g, geoCil(r + 0.04, r + 0.04, 0.35, 8), azul, FX + 1.2, y, tz).rotation.y = Math.PI / 8
    }
    pon(g, geoCaja(0.08, 1.2, 0.08), mat(0x2a2a2a), FX + 1.2, 32.2, tz)
    pon(g, geoCaja(0.08, 0.08, 0.6), mat(0x2a2a2a), FX + 1.2, 32.4, tz)
  }
  // La cúpula del crucero.
  pon(g, geoCil(3.6, 3.6, 3, 16), cantera, CX + 3, 13.5, CZ)
  pon(g, geoCupula(3.8), amarillo, CX + 3, 15, CZ).scale.y = 1.2
  for (let k = 0; k < 8; k++) pon(g, new THREE.TorusGeometry(3.82, 0.08, 4, 16, Math.PI), azul, CX + 3, 15, CZ).rotation.y = (k / 8) * Math.PI
  pon(g, geoCil(0.5, 0.7, 1.6, 8), cantera, CX + 3, 20.2, CZ)

  // --- la Rotonda de los Jaliscienses Ilustres ---
  const RX = -2
  const RZ = -26
  pon(g, geoCil(8, 8.4, 0.8, 32), cantera, RX, 0.4, RZ)
  for (let k = 0; k < 17; k++) {
    const a = (k / 17) * Math.PI * 2
    pon(g, geoCil(0.35, 0.4, 6, 12), cantera, RX + Math.cos(a) * 6.5, 3.8, RZ + Math.sin(a) * 6.5)
  }
  pon(g, new THREE.TorusGeometry(6.5, 0.5, 6, 34), cantera, RX, 7, RZ).rotation.x = Math.PI / 2
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    pon(g, geoCaja(0.8, 1.4, 0.8), canteraSombra, RX + Math.cos(a) * 3.5, 0.9, RZ + Math.sin(a) * 3.5)
    pon(g, geoCil(0.25, 0.35, 1.6, 8), mat(0x3f4a42, 0.5, 0.5), RX + Math.cos(a) * 3.5, 2.4, RZ + Math.sin(a) * 3.5)
  }

  // --- calandrias, gente y el Palacio de Gobierno ---
  for (let i = 0; i < 3; i++) {
    const c = sub(g, -12, 0, 30 - i * 14, 0)
    pon(c, geoCaja(1.6, 1, 3), mat(0x2a2a2a, 0.5), 0, 1.2, 0)
    pon(c, geoCaja(1.6, 0.1, 2), mat(0x2a2a2a, 0.5), 0, 2.6, -0.5)
    for (const s of [-1, 1]) pon(c, geoCil(0.6, 0.6, 0.1, 12), mat(0x5a3a22), s * 0.85, 0.6, -0.8).rotation.z = Math.PI / 2
    pon(c, geoCaja(0.6, 1.2, 2), mat(0xf2efe6, 0.8), 0, 1.3, 2.8)
    pon(c, geoCaja(0.3, 0.6, 0.6), mat(0xf2efe6, 0.8), 0, 2.1, 3.9).rotation.x = -0.5
  }
  gente(g, 80, { x0: -10, x1: 12, z0: 44, z1: -44, piel: PIEL })
  pon(g, geoCaja(12, 10, 24), mat(0xc9b08a, 0.85), 22, 5, -30)
  arcada(g, hueco, { ancho: 22, alto: 4, n: 9, x: 15.95, y: 0.3, z: -30, giro: -Math.PI / 2 })
  bandera(g, 15, -30, 6, BANDERA_MEXICO, 10)

  return colocar(g, 1, -62)
}

// Ciudad de México, a la izquierda del Paseo de la Reforma: el Ángel de la
// Independencia en su glorieta. El basamento escalonado con la balaustrada,
// las cuatro estatuas de bronce de las esquinas y el león con el niño, la
// columna con sus anillos y guirnaldas, el capitel corintio y la Victoria
// alada dorada con la corona de laurel y la cadena rota. Alrededor, los
// coches dando la vuelta, las jacarandas moradas, y los rascacielos de
// Reforma: la Torre Reforma de hormigón y la BBVA con su celosía.
export function angel () {
  const g = new THREE.Group()
  const cantera = mat(0xd9d2c2, 0.8)
  const canteraSombra = mat(0xbdb6a6, 0.85)
  const oro = mat(0xe2b23e, 0.3, 0.75)
  const bronce = mat(0x3f4a42, 0.5, 0.5)
  const hueco = mat(0x3a3a3a, 1)

  // --- la glorieta ---
  const AX = 14
  const AZ = 0
  pon(g, geoCil(15, 15, 0.12, 40), mat(0x5a5a5c, 0.9), AX, 0.06, AZ)
  cesped(g, { x: AX, z: AZ, ancho: 18, fondo: 18, color: 0x5f9a45 })
  pon(g, geoCil(8.4, 8.6, 0.4, 32), cantera, AX, 0.4, AZ)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    coche(g, AX + Math.cos(a) * 12, AZ + Math.sin(a) * 12, -a, elige([0xd9b82e, 0xe8e2d4, 0x2a2a2a, 0xb03a2e, 0x2e5c8a]))
  }

  // --- el basamento ---
  for (let s = 0; s < 4; s++) pon(g, geoCil(7.5 - s * 0.5, 7.5 - s * 0.5, 0.4, 32), cantera, AX, 0.8 + s * 0.4, AZ)
  const yb = 2.4
  pon(g, geoCaja(9, 3.2, 9), cantera, AX, yb + 1.6, AZ)
  for (const [dx, dz, giro] of [[-4.55, 0, -Math.PI / 2], [4.55, 0, Math.PI / 2], [0, 4.55, 0], [0, -4.55, Math.PI]]) {
    arcada(g, hueco, { ancho: 3, alto: 2.2, n: 1, x: AX + dx, y: yb + 0.2, z: AZ + dz, giro, hueco: 0.7 })
  }
  pon(g, geoCaja(9.6, 0.5, 9.6), canteraSombra, AX, yb + 3.4, AZ)
  for (let u = -4.4; u <= 4.4; u += 0.7) {
    for (const [dx, dz] of [[u, -4.6], [u, 4.6], [-4.6, u], [4.6, u]]) pon(g, geoCaja(0.18, 0.7, 0.18), cantera, AX + dx, yb + 4, AZ + dz)
  }
  // Las cuatro estatuas: Paz, Ley, Justicia y Guerra, sentadas en las esquinas.
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    pon(g, geoCaja(1.6, 1, 1.6), canteraSombra, AX + dx * 1.15, yb + 0.5, AZ + dz * 1.15)
    pon(g, geoCil(0.5, 0.8, 2, 10), bronce, AX + dx * 1.15, yb + 2, AZ + dz * 1.15)
    pon(g, geoBola(0.35, 8, 6), bronce, AX + dx * 1.15, yb + 3.3, AZ + dz * 1.15)
  }
  // El león guiado por el niño, hacia Reforma.
  pon(g, geoCaja(1.4, 1.2, 2.4), bronce, AX - 5.8, yb + 0.6, AZ)
  pon(g, geoBola(0.6, 8, 6), bronce, AX - 6, yb + 1.4, AZ - 1.2)
  pon(g, geoCil(0.2, 0.25, 1.2, 8), bronce, AX - 6.4, yb + 0.6, AZ + 1.4)
  // El cuerpo octogonal sobre el basamento.
  pon(g, geoCil(3, 3.4, 4, 8), cantera, AX, yb + 5.6, AZ)
  pon(g, geoCil(3.6, 3.6, 0.6, 8), canteraSombra, AX, yb + 7.9, AZ)

  // --- la columna ---
  const yc = yb + 8.2
  const H = 26
  pon(g, geoCil(1.2, 1.5, H, 16), cantera, AX, yc + H / 2, AZ)
  for (let y = 3; y < H; y += 4) {
    pon(g, new THREE.TorusGeometry(1.35 - y * 0.008, 0.15, 6, 20), canteraSombra, AX, yc + y, AZ).rotation.x = Math.PI / 2
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      pon(g, geoBola(0.2, 6, 4), mat(0xc9b08a, 0.7), AX + Math.cos(a) * 1.4, yc + y + 1.4, AZ + Math.sin(a) * 1.4)
    }
  }
  // El capitel corintio y el pedestal de la Victoria.
  pon(g, geoCil(2.2, 1.3, 2, 16), cantera, AX, yc + H + 1, AZ)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoBola(0.4, 6, 4), cantera, AX + Math.cos(a) * 1.8, yc + H + 1.4, AZ + Math.sin(a) * 1.8)
  }
  pon(g, geoCaja(3.2, 0.6, 3.2), canteraSombra, AX, yc + H + 2.3, AZ)
  pon(g, geoCil(0.9, 1.1, 1.4, 12), cantera, AX, yc + H + 3.3, AZ)

  // --- la Victoria alada ---
  const yv = yc + H + 4
  pon(g, geoCil(0.35, 0.7, 3, 10), oro, AX, yv + 1.5, AZ)
  pon(g, geoBola(0.38, 10, 8), oro, AX, yv + 3.4, AZ)
  for (const s of [-1, 1]) {
    const ala = sub(g, AX - 0.3, yv + 2.6, AZ + s * 0.5)
    for (let i = 0; i < 4; i++) pon(ala, geoCaja(0.08, 2.4 - i * 0.4, 0.5), oro, -i * 0.25, 0.4 + i * 0.3, s * (0.3 + i * 0.35)).rotation.x = s * (0.5 + i * 0.1)
  }
  // Brazo con la corona de laurel en alto, y la cadena en la otra mano.
  barra(g, oro, V(AX, yv + 2.9, AZ - 0.3), V(AX + 0.8, yv + 4.6, AZ - 0.7), 0.16)
  pon(g, new THREE.TorusGeometry(0.4, 0.07, 4, 14), oro, AX + 0.85, yv + 4.9, AZ - 0.75)
  barra(g, oro, V(AX, yv + 2.7, AZ + 0.3), V(AX + 0.6, yv + 1.8, AZ + 0.9), 0.14)
  for (let i = 0; i < 4; i++) pon(g, new THREE.TorusGeometry(0.1, 0.03, 4, 8), oro, AX + 0.6, yv + 1.5 - i * 0.2, AZ + 0.95).rotation.y = i * 1.5

  // --- Reforma: jacarandas y rascacielos ---
  for (let i = 0; i < 24; i++) arbol(g, azar(-6, 32), elige([azar(18, 48), azar(-48, -18)]), 'jacaranda', 1.1)
  gente(g, 40, { x0: -4, x1: 30, z0: 46, z1: -46, piel: PIEL })
  // La Torre Reforma: hormigón con las ranuras en zigzag.
  pon(g, geoCaja(10, 60, 10), mat(0xc9c2b4, 0.8), 34, 30, -30)
  for (let y = 4; y < 60; y += 6) pon(g, geoCaja(10.1, 1.5, 3), vidrio(0x3a4a58), 34, y, -30 + ((y / 6) % 2 ? 2 : -2))
  // La BBVA con su celosía.
  pon(g, geoCaja(12, 50, 12), vidrio(0x5f7f95), 36, 25, 26)
  for (let y = 3; y < 50; y += 5) {
    for (const f of [-1, 1]) {
      barra(g, mat(0xd8dde0, 0.4, 0.5), V(30, y, 26 + f * 6.05), V(42, y + 5, 26 + f * 6.05), 0.35)
      barra(g, mat(0xd8dde0, 0.4, 0.5), V(42, y, 26 + f * 6.05), V(30, y + 5, 26 + f * 6.05), 0.35)
    }
  }
  const fila = []
  for (let z = -46; z <= 46; z += 16) fila.push([50, z, 12, azar(24, 40), 12])
  for (const [x, z, a, h, f] of fila) {
    pon(g, geoCaja(a, h, f), vidrio(elige([0x5f7f95, 0x6f8fa6, 0x7f93a0])), x, h / 2, z)
    for (let y = 3; y < h; y += 3.5) pon(g, geoCaja(a + 0.1, 0.3, f + 0.1), mat(0xd8dde0, 0.4, 0.5), x, y, z)
  }
  // Los rascacielos son el fondo: el vuelo encuadra el Ángel.
  g.traverse(o => { if (o.isMesh && o.position.x > 28) o.userData.sinFoco = true })

  // Con avenida el mundo no lo recoloca: se refleja y se pone junto a la acera.
  espejo(g)
  g.position.set(-12, 0, -60)
  g.userData.lados = [-1]
  return g
}
