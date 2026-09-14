// Grecia: Atenas, Salónica y Heraclión.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const AZUL_GRECIA = 0x1f5fb4

// Templo dórico períptero: crepidoma de tres escalones, columnas estriadas
// (dieciséis caras), arquitrabe, friso de triglifos, frontones y cubierta. Las
// `faltan` son índices de columnas que no están.
function temploDorico (g, { x, y, z, frente, fondo, alto, r, marmol, sombra, faltan = new Set(), sinTejado = false }) {
  const paso = frente / 7.2
  const nF = Math.round(frente / paso) + 1
  const nL = Math.round(fondo / paso) + 1
  const ancho = (nF - 1) * paso
  const largo = (nL - 1) * paso
  for (let s = 0; s < 3; s++) pon(g, geoCaja(ancho + 3 - s * 0.6, 0.35, largo + 3 - s * 0.6), marmol, x, y + 0.175 + s * 0.35, z)
  const y0 = y + 1.05
  const puestos = []
  for (let i = 0; i < nF; i++) puestos.push([-ancho / 2 + i * paso, -largo / 2], [-ancho / 2 + i * paso, largo / 2])
  for (let j = 1; j < nL - 1; j++) puestos.push([-ancho / 2, -largo / 2 + j * paso], [ancho / 2, -largo / 2 + j * paso])
  const fuste = geoCil(r * 0.8, r, alto, 16)
  puestos.forEach(([u, v], i) => {
    if (faltan.has(i)) return
    pon(g, fuste, marmol, x + u, y0 + alto / 2, z + v)
    pon(g, geoCil(r * 1.25, r * 0.85, r * 0.5, 16), marmol, x + u, y0 + alto + r * 0.25, z + v)
    pon(g, geoCaja(r * 2.6, r * 0.3, r * 2.6), marmol, x + u, y0 + alto + r * 0.65, z + v)
  })
  // La cella en sombra detrás de las columnas.
  pon(g, geoCaja(ancho - paso * 1.6, alto * 0.9, largo - paso * 2.2), sombra, x, y0 + alto * 0.45, z)
  const yA = y0 + alto + r * 0.8
  pon(g, geoCaja(ancho + r * 2.4, r * 1.6, largo + r * 2.4), marmol, x, yA + r * 0.8, z)
  // Triglifos en las cuatro caras.
  const trig = mat(0x9c9483, 1)
  for (let u = -ancho / 2; u <= ancho / 2 + 0.01; u += paso / 2) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.22, r * 1.1, 0.06), trig, x + u, yA + r * 2.2, z + s * (largo / 2 + r * 1.22))
  }
  for (let v = -largo / 2; v <= largo / 2 + 0.01; v += paso / 2) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.06, r * 1.1, 0.22), trig, x + s * (ancho / 2 + r * 1.22), yA + r * 2.2, z + v)
  }
  pon(g, geoCaja(ancho + r * 2.6, r * 1.4, largo + r * 2.6), marmol, x, yA + r * 2.3, z)
  if (sinTejado) return yA + r * 3
  // Frontones a los extremos del eje largo (z) y la cubierta.
  aguas(g, marmol, ancho + r * 2.6, r * 3.2, largo + r * 2.6, x, yA + r * 3, z)
  return yA + r * 6
}

// Atenas, a la derecha: la roca de la Acrópolis con sus murallas; encima el
// Partenón con columnas que faltan y la grúa de la restauración, el Erecteion
// con el pórtico de las Cariátides, los Propileos y el templo de Atenea Niké,
// y la bandera griega en el mirador. Abajo, la Plaka: casas blancas con teja,
// olivos y cipreses, y el Odeón de Herodes Ático excavado en la ladera.
export function partenon () {
  const g = new THREE.Group()
  const marmol = mat(0xe6dcc6, 0.75)
  const marmolViejo = mat(0xd6c8a8, 0.85)
  const sombra = mat(0xa89c82, 0.95)
  const roca = mat(0x9a8c74, 1)
  const muralla = mat(0xb3a283, 0.95)

  // --- la roca ---
  const RX = 20
  const RY = 13
  pon(g, geoCil(15, 19, RY, 11), roca, RX, RY / 2, 0).scale.z = 2.1
  pon(g, geoCaja(26, 3, 60), muralla, RX, RY + 1.5, 0)
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2
    pon(g, new THREE.DodecahedronGeometry(azar(1, 2.6), 0), mat(elige([0x8e806a, 0xa3957b]), 1), RX + Math.cos(a) * azar(15, 19), azar(0, RY - 2), Math.sin(a) * azar(15, 19) * 2.1)
  }
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(19, 26)
    arbol(g, RX + Math.cos(a) * r, Math.sin(a) * r * 1.8, elige(['cipres', 'pino', 'copa']), 0.8)
  }
  const Y = RY + 3
  explanada(g, { x: RX, z: 0, ancho: 26, fondo: 60, color: 0xd9cfb8, juntas: null, y: Y - 0.1 })

  // --- el Partenón, con las columnas que faltan y su grúa ---
  const faltan = new Set([3, 9, 22, 31])
  const techo = temploDorico(g, { x: RX + 2, y: Y, z: 4, frente: 13, fondo: 30, alto: 5.8, r: 0.52, marmol, sombra, faltan, sinTejado: true })
  // Sin cubierta: se ven los muros de la cella y el hueco.
  pon(g, geoCaja(9, 0.3, 24), mat(0x8a7f6a, 1), RX + 2, techo - 0.2, 4)
  // Los frontones, rotos: solo la mitad del de poniente.
  aguas(g, marmol, 14, 1.8, 1.2, RX + 2, techo - 0.5, 4 + 15.6)
  const tercio = aguas(g, marmol, 7, 1.8, 1.2, RX - 1.5, techo - 0.5, 4 - 15.6)
  tercio.scale.x *= 1
  // La grúa torre de la restauración.
  const grua = mat(0xe8c53a, 0.6, 0.3)
  const GX = RX + 12
  const GZ = 12
  for (let t = 0; t < 8; t++) {
    const ya = Y + t * 3
    const yb = ya + 3
    for (const [a, b] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) barra(g, grua, V(GX + a, ya, GZ + b), V(GX + a, yb, GZ + b), 0.14)
    barra(g, grua, V(GX - 0.7, ya, GZ - 0.7), V(GX + 0.7, yb, GZ - 0.7), 0.06)
    barra(g, grua, V(GX - 0.7, ya, GZ + 0.7), V(GX + 0.7, yb, GZ + 0.7), 0.06)
  }
  barra(g, grua, V(GX - 16, Y + 24.5, GZ - 6), V(GX + 5, Y + 24.5, GZ + 2), 0.4)
  pon(g, geoCaja(1.6, 1.6, 1.6), mat(0x4a4a4a, 0.6), GX + 4, Y + 24, GZ + 1.6)
  pon(g, geoCil(0.02, 0.02, 10, 4), mat(0x2a2a2a, 0.5, 0.5), GX - 9, Y + 19.5, GZ - 3.3)
  pon(g, geoCaja(1.2, 0.8, 1.2), marmol, GX - 9, Y + 14.4, GZ - 3.3)

  // --- el Erecteion y las Cariátides ---
  const EX = RX + 8
  const EZ = -14
  pon(g, geoCaja(6, 5.5, 10), marmolViejo, EX, Y + 2.75, EZ)
  columnata(g, marmol, { n: 6, largo: 5.4, alto: 5, r: 0.28, x: EX - 3.5, y: Y, z: EZ, enZ: true })
  pon(g, geoCaja(1.4, 0.8, 7), marmol, EX - 3.5, Y + 5.6, EZ)
  aguas(sub(g, EX, 0, EZ, 0), marmol, 6.6, 1.2, 10.4, 0, Y + 5.5, 0)
  // El pórtico de las Cariátides: seis figuras sobre un podio, del lado de la
  // carretera.
  pon(g, geoCaja(3.4, 1.6, 4.2), marmolViejo, EX - 1.5, Y + 0.8, EZ + 6.6)
  for (let i = 0; i < 6; i++) {
    const cx = EX - 2.6 + (i % 3) * 1.1
    const cz = EZ + 5.4 + Math.floor(i / 3) * 2.2
    pon(g, geoCil(0.2, 0.28, 2.2, 10), marmol, cx, Y + 2.7, cz)
    pon(g, geoBola(0.17, 8, 6), marmol, cx, Y + 3.95, cz)
    pon(g, geoCil(0.25, 0.2, 0.3, 8), marmol, cx, Y + 4.25, cz)
  }
  pon(g, geoCaja(3.6, 0.6, 4.4), marmol, EX - 1.5, Y + 4.7, EZ + 6.6)

  // --- los Propileos y Atenea Niké, al extremo ---
  const PZ = -26
  pon(g, geoCaja(14, 0.8, 5), marmol, RX - 2, Y + 0.4, PZ)
  columnata(g, marmol, { n: 6, largo: 8, alto: 5, r: 0.36, x: RX - 2, y: Y + 0.8, z: PZ + 2 })
  columnata(g, marmol, { n: 6, largo: 8, alto: 5, r: 0.36, x: RX - 2, y: Y + 0.8, z: PZ - 2 })
  pon(g, geoCaja(10, 1, 5.4), marmol, RX - 2, Y + 6.6, PZ)
  aguas(sub(g, RX - 2, 0, PZ, Math.PI / 2), marmol, 5.4, 1.4, 10, 0, Y + 7.1, 0)
  for (const dx of [-7.5, 3.5]) pon(g, geoCaja(4, 5.5, 5), marmolViejo, RX + dx, Y + 3.5, PZ)
  const NX = RX - 9.5
  pon(g, geoCaja(3.6, 1.2, 5), muralla, NX, Y + 0.6, PZ + 1)
  columnata(g, marmol, { n: 4, largo: 2.6, alto: 3, r: 0.2, x: NX, y: Y + 1.2, z: PZ + 3.1 })
  columnata(g, marmol, { n: 4, largo: 2.6, alto: 3, r: 0.2, x: NX, y: Y + 1.2, z: PZ - 1.1 })
  pon(g, geoCaja(3.2, 0.6, 4.6), marmol, NX, Y + 4.5, PZ + 1)
  aguas(g, marmol, 3.2, 0.8, 4.6, NX, Y + 4.8, PZ + 1)

  // La bandera en el mirador de poniente y la gente paseando por la roca.
  bandera(g, RX - 10, 22, 7, [AZUL_GRECIA, 0xffffff, AZUL_GRECIA, 0xffffff, AZUL_GRECIA], Y)
  gente(g, 60, { x0: RX - 11, x1: RX + 11, z0: 28, z1: -28, y: Y })

  // --- el Odeón de Herodes Ático, en la ladera del lado de la carretera ---
  const OZ = -20
  pon(g, geoCaja(2, 9, 16), marmolViejo, -1, 4.5, OZ)
  for (const y of [1, 4.8]) arcada(g, mat(0x3a3026, 1), { ancho: 14, alto: 3, n: 5, x: -2.05, y, z: OZ, giro: -Math.PI / 2 })
  for (let t = 0; t < 7; t++) {
    const gr = pon(g, new THREE.CylinderGeometry(3 + t * 1.1, 3 + t * 1.1, 0.6, 24, 1, false, 0, Math.PI), marmol, 0, 0.3 + t * 0.6, OZ)
    gr.rotation.y = -Math.PI / 2
  }

  // --- la Plaka ---
  const casas = []
  for (let i = 0; i < 16; i++) casas.push([azar(-6, 4), azar(-2, 32), azar(3.5, 5.5), azar(4, 7), azar(3.5, 5.5)])
  casitas(g, casas, { colores: [0xf4f1ea, 0xefe6d2, 0xe8d8b8, 0xf2ede4], teja: 0xb2593c })
  for (let i = 0; i < 10; i++) arbol(g, azar(-8, 6), azar(-4, 34), elige(['copa', 'cipres']), 0.8)
  gente(g, 25, { x0: -8, x1: 5, z0: 34, z1: -4 })

  return colocar(g, 1, -62)
}

// Salónica, a la izquierda: la Torre Blanca en su paseo marítimo. El cuerpo de
// dieciséis caras con las ventanas en espiral, la galería almenada y el torreón
// de arriba con la bandera; la estatua ecuestre de Alejandro con los escudos y
// las sarisas; los Paraguas de Zongolópulos sobre el agua, y el mar detrás.
export function torreBlanca () {
  const g = new THREE.Group()
  const blanco = mat(0xf1eee6, 0.8)
  const blancoSombra = mat(0xd9d4c8, 0.85)
  const hueco = mat(0x3a3a3a, 1)

  // --- el paseo y el mar ---
  explanada(g, { x: 0, z: 0, ancho: 26, fondo: 70, color: 0xdcd6c8, juntas: 0xc4bcaa, paso: 3 })
  cesped(g, { x: -6, z: 0, ancho: 8, fondo: 30, color: 0x648f4a })
  mar(g, { x: 53, z: 0, ancho: 80, fondo: 120, color: 0x2f7fa0 })
  pon(g, geoCaja(0.8, 1, 70), mat(0xcfc6b4, 0.9), 13.4, 0.5, 0)
  for (let z = 32; z > -34; z -= 4) pon(g, geoCil(0.12, 0.12, 1, 6), mat(0x2f3a33, 0.5, 0.5), 12.6, 0.8, z)
  for (let z = 30; z > -34; z -= 8) arbol(g, -11, z, 'copa', 1.1)
  for (let z = 28; z > -32; z -= 10) farola(g, 11.5, z, 5, 0x2a2a2a)
  gente(g, 70, { x0: -12, x1: 12, z0: 34, z1: -34 })

  // --- la torre ---
  const TX = 2
  const TZ = 8
  pon(g, geoCil(5.2, 5.4, 1, 16), blancoSombra, TX, 0.5, TZ)
  pon(g, geoCil(4.6, 4.9, 16, 16), blanco, TX, 8, TZ)
  // Ventanas en espiral, como la rampa de dentro.
  for (let k = 0; k < 30; k++) {
    const a = k * 0.72
    const y = 2 + k * 0.42
    pon(g, geoCaja(0.4, 0.8, 0.1), hueco, TX + Math.cos(a) * 4.82, y, TZ + Math.sin(a) * 4.82).rotation.y = Math.PI / 2 - a
  }
  arcada(g, hueco, { ancho: 1.6, alto: 2.4, n: 1, x: TX - 4.85, y: 1, z: TZ, giro: -Math.PI / 2, hueco: 0.9 })
  // La cornisa con matacanes y las almenas.
  pon(g, geoCil(5.3, 4.7, 1, 16), blanco, TX, 16.5, TZ)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    pon(g, geoCaja(0.3, 0.9, 0.3), blancoSombra, TX + Math.cos(a) * 5, 15.7, TZ + Math.sin(a) * 5)
  }
  almenas(g, blanco, 5.05, 17.5, 22, TX, TZ, 0.7)
  // El torreón de arriba.
  pon(g, geoCil(2.4, 2.4, 4, 16), blanco, TX, 19, TZ)
  almenas(g, blanco, 2.4, 21.4, 12, TX, TZ, 0.55)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4
    pon(g, geoCaja(0.4, 1, 0.1), hueco, TX + Math.cos(a) * 2.42, 19.3, TZ + Math.sin(a) * 2.42).rotation.y = Math.PI / 2 - a
  }
  bandera(g, TX, TZ, 5, [AZUL_GRECIA, 0xffffff, AZUL_GRECIA, 0xffffff, AZUL_GRECIA], 21)

  // --- Alejandro Magno a caballo, con sus escudos y sarisas ---
  const AX = -2
  const AZ = -18
  pon(g, geoCaja(3, 2.4, 4.5), mat(0x8a8176, 0.8), AX, 1.2, AZ)
  const bronce = mat(0x3d4a44, 0.5, 0.55)
  pon(g, geoCaja(1.1, 1.3, 3), bronce, AX, 3.6, AZ).rotation.x = -0.25
  pon(g, geoCaja(0.8, 1.3, 0.8), bronce, AX, 4.9, AZ + 1.5).rotation.x = -0.6
  for (const [dx, dz, rx] of [[-0.35, -1.1, 0.3], [0.35, -1.1, 0.3], [-0.35, 1, -0.9], [0.35, 1, -0.9]]) pon(g, geoCil(0.12, 0.1, 1.6, 6), bronce, AX + dx, 2.9, AZ + dz).rotation.x = rx
  pon(g, geoCil(0.25, 0.35, 1.5, 8), bronce, AX, 5, AZ - 0.2)
  for (let i = 0; i < 6; i++) {
    const z = AZ - 3 + i * 1.3
    pon(g, geoCil(0.55, 0.55, 0.1, 14), bronce, AX + 3, 1.1, z).rotation.z = Math.PI / 2
    barra(g, bronce, V(AX + 3.3, 0, z), V(AX + 2, 6.5, z + 0.8), 0.06)
  }

  // --- los Paraguas, sobre el agua ---
  const acero = mat(0xd8dde0, 0.3, 0.7)
  for (const [px, pz, alto, giro] of [[20, -6, 13, 0.3], [23, -2, 11, -0.2], [26, 1, 12.5, 0.5]]) {
    const p = sub(g, px, 0, pz, giro)
    pon(p, geoCil(0.1, 0.12, alto, 8), acero, 0, alto / 2, 0)
    const tela = pon(p, new THREE.ConeGeometry(3, 1.2, 10, 1, true), lamina(0xdfe3e6, 0.35, 0.6), 0, alto + 0.6, 0)
    tela.rotation.z = 0.35
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      barra(p, acero, V(0, alto + 1.1, 0), V(Math.cos(a) * 2.9, alto + 0.1 + Math.cos(a) * 1, Math.sin(a) * 2.9), 0.05)
    }
  }
  for (let i = 0; i < 4; i++) barca(g, azar(18, 34), azar(-30, 30), azar(0, 3), { largo: 4, vela: true })

  // --- la ciudad detrás del paseo ---
  const fila = []
  for (let z = 32; z > -34; z -= 9) fila.push([-19, z, 8, azar(15, 22), 8])
  bloques(g, fila, -1, { colores: [0xe8e2d4, 0xd9d2c4, 0xefe8da, 0xcfc8b8] })

  return colocar(g, -1, -62)
}

// Heraclión, a la derecha: el puerto veneciano. El dique largo que entra en el
// mar con su paseo y la gente, las barcas de pesca amarradas, el faro rojo de
// la punta, y la fortaleza de Koules: muros de sillería dorada con las esquinas
// redondeadas, troneras, el león alado de San Marcos sobre la puerta y la
// bandera arriba. En la orilla, las bóvedas de los Arsenales.
export function koules () {
  const g = new THREE.Group()
  const sillar = mat(0xc9b48a, 0.95)
  const sillarOscuro = mat(0xa8936a, 0.95)
  const hueco = mat(0x2e261e, 1)

  // --- el agua del puerto ---
  mar(g, { x: 14, z: 0, ancho: 46, fondo: 90 })

  // --- el dique ---
  pon(g, geoCaja(7, 1.6, 80), mat(0xbcae94, 0.95), 2, 0.8, -4)
  explanada(g, { x: 2, z: -4, ancho: 5.6, fondo: 80, color: 0xd9ceb6, juntas: 0xc4b89e, y: 1.6 })
  for (let i = 0; i < 40; i++) pon(g, new THREE.DodecahedronGeometry(azar(0.6, 1.2), 0), mat(0x9a9080, 1), 5.6 + azar(0, 1.5), azar(0, 1), azar(-44, 36))
  gente(g, 40, { x0: 0, x1: 4, z0: 34, z1: -40, y: 1.6 })
  for (let z = 30; z > -40; z -= 10) farola(sub(g, 0, 1.6, 0), 0.2, z, 4, 0x2a2a2a)
  for (let i = 0; i < 9; i++) barca(g, -2.5 - azar(0, 1), 24 - i * 5.5, azar(-0.2, 0.2), { largo: 4.5, color: elige([0x2e5c8a, 0xf2efe6, 0x3f8a5a, 0xd2452f]) })
  // El faro de la punta.
  const faroY = 1.6
  pon(g, geoCil(1, 1.2, 6, 12), mat(0xd23a2a, 0.7), 2, faroY + 3, -42)
  pon(g, geoCil(1.2, 1.2, 0.4, 12), mat(0xf2f2ee, 0.7), 2, faroY + 6.2, -42)
  pon(g, geoCil(0.6, 0.6, 1, 10), mat(0xfff3c0, 0.3), 2, faroY + 6.9, -42)
  pon(g, geoCupula(0.7), mat(0xd23a2a, 0.7), 2, faroY + 7.4, -42)

  // --- Koules ---
  const KX = 12
  const KZ = 18
  const muroRedondo = (w, d, alto, y, material, r = 3) => {
    const forma = new THREE.Shape()
    const x0 = -w / 2
    const z0 = -d / 2
    forma.moveTo(x0 + r, z0)
    forma.lineTo(x0 + w - r, z0)
    forma.absarc(x0 + w - r, z0 + r, r, -Math.PI / 2, 0, false)
    forma.lineTo(x0 + w, z0 + d - r)
    forma.absarc(x0 + w - r, z0 + d - r, r, 0, Math.PI / 2, false)
    forma.lineTo(x0 + r, z0 + d)
    forma.absarc(x0 + r, z0 + d - r, r, Math.PI / 2, Math.PI, false)
    forma.lineTo(x0, z0 + r)
    forma.absarc(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, false)
    const geo = new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: false, curveSegments: 10 })
    geo.rotateX(-Math.PI / 2)
    return pon(g, geo, material, KX, y, KZ)
  }
  // Talud de la base, cuerpo y parapeto.
  muroRedondo(24, 34, 2, 0, sillarOscuro, 4.2)
  muroRedondo(22, 32, 9, 2, sillar, 3.6)
  muroRedondo(22.8, 32.8, 0.6, 11, sillarOscuro, 3.9)
  muroRedondo(22.4, 32.4, 1.3, 11.6, sillar, 3.7)
  explanada(g, { x: KX, z: KZ, ancho: 18, fondo: 28, color: 0xcdbd9c, juntas: null, y: 12.4 })
  // Troneras en los dos pisos, del lado del dique y del mar.
  for (const y of [4.5, 8.5]) {
    for (let z = KZ - 12; z <= KZ + 12; z += 4) {
      pon(g, geoCaja(0.12, 0.7, 1), hueco, KX - 11.05, y, z)
      pon(g, geoCaja(0.12, 0.7, 1), hueco, KX + 11.05, y, z)
    }
  }
  // La puerta hacia el dique con el león de San Marcos encima.
  arcada(g, hueco, { ancho: 3, alto: 4, n: 1, x: KX - 11.05, y: 2, z: KZ - 4, giro: -Math.PI / 2, hueco: 0.9 })
  pon(g, geoCaja(0.3, 2.2, 3.4), sillarOscuro, KX - 11.15, 7.8, KZ - 4)
  pon(g, geoCaja(0.2, 1, 1.8), mat(0x8a7a5a, 0.9), KX - 11.35, 7.6, KZ - 4)
  pon(g, geoBola(0.4, 8, 6), mat(0x8a7a5a, 0.9), KX - 11.35, 8.3, KZ - 3.1)
  for (const s of [-1, 1]) pon(g, geoCaja(0.08, 0.9, 1.3), mat(0x8a7a5a, 0.9), KX - 11.35, 8.4, KZ - 4 + s * 0.3).rotation.x = s * 0.6
  // Garitas y la torre de vigía con la bandera.
  for (const [dx, dz] of [[-9, -13], [9, -13], [-9, 13], [9, 13]]) {
    pon(g, geoCil(0.9, 0.9, 2.2, 10), sillar, KX + dx, 13.5, KZ + dz)
    pon(g, geoCupula(1), sillarOscuro, KX + dx, 14.6, KZ + dz)
  }
  pon(g, geoCaja(5, 4, 5), sillar, KX + 4, 14.4, KZ + 6)
  bandera(g, KX + 4, KZ + 6, 5, [AZUL_GRECIA, 0xffffff, AZUL_GRECIA, 0xffffff, AZUL_GRECIA], 16.4)
  gente(g, 20, { x0: KX - 8, x1: KX + 8, z0: KZ + 12, z1: KZ - 12, y: 12.5 })

  // --- los Arsenales venecianos, en la orilla ---
  const AX = 30
  pon(g, geoCaja(12, 0.4, 70), mat(0xd9ceb6, 0.95), AX + 2, 0.2, -10)
  for (let i = 0; i < 6; i++) {
    const z = -32 + i * 7
    pon(g, geoCaja(10, 6, 6), sillar, AX + 4, 3, z)
    pon(g, new THREE.CylinderGeometry(3, 3, 10, 14, 1, false, 0, Math.PI), sillarOscuro, AX + 4, 6, z).rotation.z = Math.PI / 2
    arcada(g, hueco, { ancho: 4.4, alto: 4.2, n: 1, x: AX - 1.05, y: 0.4, z, giro: -Math.PI / 2, hueco: 0.9 })
  }
  const fila = []
  for (let z = -30; z < 34; z += 9) fila.push([AX + 16, z, 9, azar(10, 16), 8])
  bloques(g, fila, 1, { colores: [0xefe6d2, 0xe0cfa8, 0xd9b48a] })

  return colocar(g, 1, -62)
}
