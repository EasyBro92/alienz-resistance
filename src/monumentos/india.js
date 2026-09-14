// India: Bombay, Delhi y Calcuta.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const BANDERA_INDIA = [0xff9933, 0xffffff, 0x138808]
const PIEL = 0x9a6a48

// Chhatri: templete de cuatro columnas con cúpula y remate, la pieza que corona
// medio edificio indo-sarraceno.
function chhatri (g, x, y, z, r, material, cupula = material) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pon(g, geoCil(r * 0.12, r * 0.14, r * 1.4, 8), material, x + dx * r * 0.7, y + r * 0.7, z + dz * r * 0.7)
  pon(g, geoCaja(r * 1.9, r * 0.2, r * 1.9), material, x, y + r * 1.5, z)
  pon(g, geoCupula(r * 0.85, 14, 7), cupula, x, y + r * 1.6, z).scale.y = 1.2
  pon(g, geoCil(r * 0.03, r * 0.1, r * 0.6, 6), cupula, x, y + r * 2.9, z)
}

// Bombay, a la derecha: el Bandra-Worli Sea Link sobre el mar de Arabia. El
// tablero curvo sobre sus pilas, los dos pilonos de hormigón en Y invertida
// con la punta afilada, los abanicos de tirantes a los dos lados, las farolas
// y el tráfico; en la orilla, las ruinas del fuerte de Bandra, las barcas de
// los pescadores koli y detrás los rascacielos de Worli.
export function puenteAtirantado () {
  const g = new THREE.Group()
  const hormigon = mat(0xd8d4cc, 0.8)
  const hormigonOscuro = mat(0xb8b4ac, 0.85)
  const cable = mat(0xf2f2f2, 0.4, 0.4)

  mar(g, { x: 30, z: 0, ancho: 64, fondo: 130, color: 0x3a8fa3 })
  // La orilla con las rocas y el paseo.
  explanada(g, { x: -4, z: 0, ancho: 8, fondo: 130, color: 0xcfc6b4, juntas: null })
  for (let i = 0; i < 50; i++) pon(g, new THREE.DodecahedronGeometry(azar(0.5, 1.3), 0), mat(0x5a5650, 1), azar(0, 2.5), azar(0, 0.6), azar(-62, 62))
  gente(g, 40, { x0: -7, x1: -1, z0: 60, z1: -60, piel: PIEL })
  for (let z = 56; z > -60; z -= 14) farola(g, -1.5, z, 5, 0x2a2a2a)

  // --- el tablero, ligeramente curvo ---
  const Y = 7
  const deck = t => V(14 + Math.sin(t * Math.PI) * 6, Y, 60 - t * 120)
  for (let i = 0; i < 24; i++) {
    const a = deck(i / 24)
    const b = deck((i + 1) / 24)
    const tramo = barra(g, mat(0x8a8680, 0.9), a, b, 1)
    tramo.scale.set(8, 1, 0.9)
    // Pila bajo el tablero.
    if (i % 3 === 0) {
      pon(g, geoCaja(1.6, Y, 3), hormigonOscuro, a.x - 2.2, Y / 2, a.z)
      pon(g, geoCaja(1.6, Y, 3), hormigonOscuro, a.x + 2.2, Y / 2, a.z)
    }
    for (const s of [-1, 1]) barra(g, mat(0xe8e4dc, 0.8), V(a.x + s * 3.8, Y + 0.6, a.z), V(b.x + s * 3.8, Y + 0.6, b.z), 0.3)
    if (i % 2 === 0) {
      for (const s of [-1, 1]) {
        pon(g, geoCil(0.05, 0.06, 3, 6), mat(0x9aa0a6, 0.4, 0.6), a.x + s * 3.6, Y + 2, a.z)
        pon(g, geoCaja(0.6, 0.12, 0.25), mat(0xfff1c2, 0.4), a.x + s * 3.3, Y + 3.5, a.z)
      }
    }
  }
  // Coches y autobuses por el tablero.
  for (let i = 0; i < 12; i++) {
    const t = Math.random()
    const p = deck(t)
    const c = sub(g, p.x + elige([-1.8, 1.8]), Y + 0.5, p.z)
    coche(c, 0, 0, 0, elige([0xd9b82e, 0x2a2a2a, 0xe8e2d4, 0xb03a2e]))
  }

  // --- los dos pilonos en Y invertida ---
  for (const t of [0.32, 0.72]) {
    const p = deck(t)
    const alto = 40
    for (const s of [-1, 1]) {
      barra(g, hormigon, V(p.x + s * 5.5, 0, p.z), V(p.x + s * 1.2, Y + 12, p.z), 1.4)
      barra(g, hormigon, V(p.x + s * 1.2, Y + 12, p.z), V(p.x + s * 0.5, alto - 4, p.z), 1.2)
    }
    pon(g, geoCaja(12, 1.5, 2.2), hormigon, p.x, Y - 0.6, p.z)
    pon(g, geoTronco(0.05, 1.1, 8), hormigon, p.x, alto, p.z)
    // Los abanicos de tirantes, delante y detrás del pilono, a los dos lados.
    for (const dir of [-1, 1]) {
      for (let k = 1; k <= 11; k++) {
        const q = deck(Math.min(1, Math.max(0, t + dir * k * 0.018)))
        for (const s of [-1, 1]) {
          barra(g, cable, V(p.x + s * 0.3, alto - 3 - k * 1.2, p.z), V(q.x + s * 3.4, Y + 0.8, q.z), 0.08)
        }
      }
    }
  }

  // --- el fuerte de Bandra y las barcas ---
  const fuerte = mat(0x7a6e5e, 1)
  pon(g, geoCaja(8, 5, 10), fuerte, -6, 2.5, 50)
  for (const dz of [-4, 0, 4]) pon(g, geoCaja(0.4, 3, 1.4), mat(0x2e261e, 1), -1.9, 2.5, 50 + dz)
  almenasRectas(g, fuerte, 10, 5.4, -2.2, 50, true, 0.6)
  for (let i = 0; i < 10; i++) barca(g, azar(4, 26), azar(-58, 58), azar(0, 3), { largo: 5, color: elige([0x2e5c8a, 0xd9442e, 0xe8b92e, 0x3f8a5a]) })

  // --- Worli: rascacielos de cristal detrás ---
  const torres = []
  for (let i = 0; i < 8; i++) torres.push([azar(48, 66), azar(-60, 30), azar(8, 12), azar(28, 55), azar(8, 12)])
  for (const [x, z, a, h, f] of torres) {
    pon(g, geoCaja(a, h, f), vidrio(elige([0x5f7f95, 0x6f8fa6, 0x4f6a7f])), x, h / 2, z)
    for (let y = 3; y < h; y += 3) pon(g, geoCaja(a + 0.1, 0.25, f + 0.1), mat(0xd8dde0, 0.4, 0.5), x, y, z)
  }

  return colocar(g, 1, -62)
}

// Delhi, a la derecha: la Puerta de la India en el Kartavya Path. El arco de
// arenisca roja y beige con sus impostas escalonadas, los arcos laterales, la
// inscripción INDIA en el ático y el cuenco de la cima; la llama eterna
// delante; el templete de arenisca (el chhatri vacío) detrás; los estanques
// alargados, el césped, los árboles jamun, los vendedores de helados y la
// gente.
export function puertaIndia () {
  const g = new THREE.Group()
  const beige = mat(0xd9b48a, 0.9)
  const roja = mat(0xb9705a, 0.9)
  const sombra = mat(0x9f6a50, 0.95)
  const hueco = mat(0x3a2a20, 1)

  // --- el paseo y los estanques ---
  explanada(g, { x: 4, z: 0, ancho: 36, fondo: 96, color: 0xd9cdb4, juntas: 0xc4b89e, paso: 4 })
  for (const s of [-1, 1]) {
    cesped(g, { x: 4 + s * 12, z: 0, ancho: 10, fondo: 90, color: 0x6a9a48 })
    estanque(g, { x: 4 + s * 6.2, z: -8, ancho: 2.4, fondo: 60, color: 0x4f9fb8, borde: 0xcfc2a8 })
  }
  for (let z = 42; z > -46; z -= 7) {
    for (const s of [-1, 1]) arbol(g, 4 + s * 16, z, 'copa', 1.2)
  }
  gente(g, 90, { x0: -8, x1: 16, z0: 46, z1: -46, piel: PIEL })
  for (let i = 0; i < 6; i++) {
    const c = sub(g, azar(-4, 12), 0, azar(-40, 40), azar(0, 3))
    pon(c, geoCaja(1.2, 1, 0.8), mat(0xf2efe6, 0.6), 0, 0.9, 0)
    pon(c, geoTronco(0.1, 0.9, 0.5), lamina(elige([0xd9442e, 0x2f6fbf, 0xe8b92e]), 0.7), 0, 2.2, 0)
    pon(c, geoCil(0.03, 0.03, 1.4, 5), mat(0x555555), 0, 1.5, 0)
  }

  // --- la puerta ---
  const GX = 4
  const GZ = 6
  const W = 16
  const D = 5
  for (let s = 0; s < 3; s++) pon(g, geoCaja(W + 6 - s * 1.5, 0.4, D + 5 - s * 1.2), beige, GX, 0.2 + s * 0.4, GZ)
  const y0 = 1.2
  for (const s of [-1, 1]) {
    const px = GX + s * 5.5
    pon(g, geoCaja(5, 16, D), beige, px, y0 + 8, GZ)
    // Base de arenisca roja y paneles hundidos.
    pon(g, geoCaja(5.2, 3, D + 0.2), roja, px, y0 + 1.5, GZ)
    for (const f of [-1, 1]) pon(g, geoCaja(3, 7, 0.1), sombra, px, y0 + 7.5, GZ + f * (D / 2 + 0.02))
    // Los arcos laterales, en las caras cortas.
    arcada(g, hueco, { ancho: 2.6, alto: 6, n: 1, x: GX + s * 8.02, y: y0 + 3, z: GZ, giro: s * Math.PI / 2, hueco: 0.9 })
    // Las fechas talladas en la imposta.
    pon(g, geoCaja(3.6, 0.6, 0.1), sombra, px, y0 + 12.5, GZ + D / 2 + 0.03)
  }
  // El gran arco.
  pon(g, geoCaja(6, 5, D), beige, GX, y0 + 13.5, GZ)
  const arco = pon(g, new THREE.CylinderGeometry(3, 3, D + 0.1, 20, 1, false, Math.PI / 2, Math.PI), hueco, GX, y0 + 11, GZ)
  arco.rotation.x = Math.PI / 2
  pon(g, geoCaja(6, 11, 0.1), hueco, GX, y0 + 5.5, GZ + D / 2 + 0.01)
  pon(g, geoCaja(6, 11, 0.1), hueco, GX, y0 + 5.5, GZ - D / 2 - 0.01)
  for (const f of [-1, 1]) pon(g, geoCaja(6.6, 0.5, 0.3), roja, GX, y0 + 14.4, GZ + f * (D / 2 + 0.1))
  // Cornisas escalonadas, el ático con INDIA y el cuenco de la cima.
  pon(g, geoCaja(W + 0.8, 0.8, D + 0.8), roja, GX, y0 + 16.4, GZ)
  pon(g, geoCaja(W, 3.2, D), beige, GX, y0 + 18.4, GZ)
  for (const f of [-1, 1]) {
    const letras = [-3, -1.5, 0, 1.5, 3]
    for (const dx of letras) pon(g, geoCaja(0.8, 1.6, 0.1), sombra, GX + dx, y0 + 18.4, GZ + f * (D / 2 + 0.03))
  }
  pon(g, geoCaja(W - 2, 0.8, D - 0.6), roja, GX, y0 + 20.4, GZ)
  pon(g, geoCaja(W - 5, 1.2, D - 1.4), beige, GX, y0 + 21.4, GZ)
  pon(g, geoCil(2.6, 1.6, 1.4, 20), beige, GX, y0 + 22.7, GZ)
  pon(g, geoCil(2.8, 2.8, 0.3, 20), roja, GX, y0 + 23.5, GZ)

  // --- la llama eterna ---
  pon(g, geoCaja(3, 1, 3), mat(0x2a2a2a, 0.6), GX, 1.7, GZ + 8)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    pon(g, geoCil(0.2, 0.25, 0.5, 8), mat(0x555555, 0.5, 0.5), GX + dx, 2.45, GZ + 8 + dz)
    pon(g, geoBola(0.22, 8, 6), mat(0xffa030, 0.4), GX + dx, 2.85, GZ + 8 + dz)
  }
  bandera(g, GX - 4, GZ + 8, 8, BANDERA_INDIA, 1.2)

  // --- el templete (canopy) de arenisca detrás ---
  const CZ = -22
  pon(g, geoCaja(8, 1.2, 8), roja, GX, 0.6, CZ)
  chhatri(g, GX, 1.2, CZ, 5, beige, roja)

  // --- los edificios del gobierno al fondo ---
  const fila = []
  for (let z = -50; z > -60; z -= 12) fila.push([GX + 10, z, 26, 10, 10])
  bloques(g, fila, 1, { colores: [0xd9b48a, 0xc98f70] })

  return colocar(g, 1, -62)
}

// Calcuta, a la izquierda: el Victoria Memorial. Mármol blanco de Makrana, la
// gran cúpula sobre su tambor de arcos con el Ángel de la Victoria negro en lo
// alto, los cuatro chhatris de las esquinas, los pórticos con columnas, las
// alas con ventanales, los estanques del jardín y la estatua de la reina. Al
// fondo, sobre el Hugli, la silueta de acero del puente de Howrah.
export function victoriaMemorial () {
  const g = new THREE.Group()
  const marmol = mat(0xf2efe8, 0.55)
  const marmolSombra = mat(0xdcd8cf, 0.6)
  const hueco = mat(0x44423e, 1)
  const bronce = mat(0x2a2a2a, 0.5, 0.4)

  // --- los jardines ---
  cesped(g, { x: 0, z: 0, ancho: 30, fondo: 90, color: 0x5f9a45 })
  explanada(g, { x: 0, z: 0, ancho: 8, fondo: 90, color: 0xd9cdb4, juntas: null })
  estanque(g, { x: -8, z: 30, ancho: 8, fondo: 22, color: 0x4f9fb8 })
  estanque(g, { x: -8, z: -30, ancho: 8, fondo: 22, color: 0x4f9fb8 })
  for (let i = 0; i < 26; i++) arbol(g, azar(-14, 14), elige([azar(34, 44), azar(-44, -34)]), elige(['copa', 'palmera']), 1)
  gente(g, 70, { x0: -4, x1: 4, z0: 44, z1: -44, piel: PIEL })
  // La reina Victoria en su trono, en el eje.
  pon(g, geoCaja(2.4, 2.4, 2.4), marmolSombra, -4, 1.2, 0)
  pon(g, geoCil(0.6, 0.9, 2.2, 10), bronce, -4, 3.5, 0)
  pon(g, geoBola(0.35, 8, 6), bronce, -4, 4.9, 0)

  // --- el edificio ---
  const MX = 14
  pon(g, geoCaja(12, 1.6, 44), marmolSombra, MX, 0.8, 0)
  pon(g, geoCaja(10, 9, 40), marmol, MX, 6.1, 0)
  pon(g, geoCaja(10.6, 0.6, 40.6), marmolSombra, MX, 10.9, 0)
  for (let x = MX - 4; x <= MX + 4; x += 2) {
    for (const f of [-1, 1]) {
      pon(g, geoCaja(0.4, 0.8, 0.4), marmol, x, 11.6, f * 20.1)
    }
  }
  // Ventanales de las alas y las galerías.
  for (const s of [-1, 1]) arcada(g, hueco, { ancho: 13, alto: 3, n: 5, x: MX - 5.03, y: 3, z: s * 12, giro: -Math.PI / 2 })
  // El pórtico central con columnas pareadas y el frontón.
  pon(g, geoCaja(4, 10, 12), marmol, MX - 6.5, 6.6, 0)
  columnata(g, marmol, { n: 6, largo: 10, alto: 6.5, r: 0.35, x: MX - 8.8, y: 1.6, z: 0, enZ: true })
  pon(g, geoCaja(1.6, 1, 11), marmolSombra, MX - 8.8, 8.6, 0)
  arcada(g, hueco, { ancho: 6, alto: 5.5, n: 3, x: MX - 8.52, y: 1.6, z: 0, giro: -Math.PI / 2 })
  // Cúpulas pequeñas sobre los pórticos de las esquinas.
  for (const s of [-1, 1]) {
    pon(g, geoCaja(5, 11, 6), marmol, MX - 3, 7, s * 21)
    chhatri(g, MX - 3, 12.5, s * 21, 2.2, marmol)
  }
  // Los cuatro chhatris de las esquinas de la cubierta.
  for (const [dx, dz] of [[-4, -16], [-4, 16], [4, -16], [4, 16]]) chhatri(g, MX + dx, 11.2, dz, 2.6, marmol)

  // --- la gran cúpula ---
  pon(g, geoCil(7, 7.5, 3, 24), marmol, MX, 12.7, 0)
  pon(g, geoCil(5.8, 5.8, 4.5, 24), marmol, MX, 16.4, 0)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    arcada(g, hueco, { ancho: 1.2, alto: 2.8, n: 1, x: MX + Math.cos(a) * 5.82, y: 14.9, z: Math.sin(a) * 5.82, giro: Math.PI / 2 - a, hueco: 0.8 })
    pon(g, geoCil(0.18, 0.18, 4.2, 8), marmol, MX + Math.cos(a + 0.2) * 6.2, 16.4, Math.sin(a + 0.2) * 6.2)
  }
  pon(g, geoCil(6.3, 6.3, 0.6, 24), marmolSombra, MX, 18.9, 0)
  pon(g, geoCupula(6, 28, 14), marmol, MX, 19.2, 0).scale.y = 1.3
  pon(g, geoCil(0.9, 1.3, 1.8, 12), marmol, MX, 27.9, 0)
  // El Ángel de la Victoria.
  pon(g, geoCil(0.4, 0.5, 0.6, 10), bronce, MX, 29.1, 0)
  pon(g, geoCil(0.18, 0.35, 2, 8), bronce, MX, 30.4, 0)
  pon(g, geoBola(0.2, 8, 6), bronce, MX, 31.6, 0)
  for (const s of [-1, 1]) pon(g, geoCaja(0.08, 1.3, 0.8), bronce, MX, 30.9, s * 0.5).rotation.x = s * 0.6
  pon(g, geoCil(0.02, 0.02, 2, 5), bronce, MX + 0.4, 31.2, 0)

  // --- el Hugli y el puente de Howrah al fondo ---
  mar(g, { x: 60, z: 0, ancho: 30, fondo: 130, color: 0x6a8a7a })
  const acero = mat(0x7a7f84, 0.5, 0.6)
  const HX = 60
  for (const dz of [-24, 24]) {
    for (const dx of [-5, 5]) pon(g, geoCaja(1.6, 26, 1.6), acero, HX + dx, 13, dz)
    pon(g, geoCaja(12, 1.4, 1.6), acero, HX, 26, dz)
  }
  pon(g, geoCaja(12, 1, 110), mat(0x5a5a58, 0.8), HX, 8, 0)
  for (const dx of [-5, 5]) {
    for (let z = -54; z < 54; z += 6) {
      const alto = z > -24 && z < 24 ? 8 + 10 * Math.cos((z / 24) * Math.PI / 2) : 8 + 18 * (1 - Math.min(1, (Math.abs(z) - 24) / 30))
      barra(g, acero, V(HX + dx, 8, z), V(HX + dx, alto, z + 3), 0.3)
      barra(g, acero, V(HX + dx, alto, z + 3), V(HX + dx, 8, z + 6), 0.3)
      pon(g, geoCaja(0.4, 0.4, 6), acero, HX + dx, alto, z + 3)
    }
  }

  return colocar(g, -1, -62)
}
