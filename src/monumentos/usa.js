// Estados Unidos: Anchorage y Seattle. (Nueva York lleva la Libertad de Meshy.)
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar, espejo
} from './piezas.js'

const NIEVE = 0xf2f5f7

// Tótem tallado: tramos con caras (ojos, cejas y pico o boca), alas del pájaro
// del trueno arriba y los colores de la costa noroeste.
function totem (g, x, z, alto, giro = 0) {
  const t = sub(g, x, 0, z, giro)
  const madera = mat(0x8a6a4a, 0.9)
  const rojo = mat(0xb8342a, 0.8)
  const negro = mat(0x1f1f1f, 0.8)
  const turquesa = mat(0x2f8f88, 0.8)
  const blanco = mat(0xf2ede0, 0.8)
  pon(t, geoCil(0.55, 0.62, alto, 12), madera, 0, alto / 2, 0)
  for (let y = 1; y < alto - 1.4; y += 1.8) {
    const fila = Math.round(y / 1.8)
    const color = [rojo, turquesa, negro][fila % 3]
    for (const s of [-1, 1]) {
      pon(t, geoCaja(0.36, 0.2, 0.08), negro, s * 0.22, y + 0.5, 0.58)
      pon(t, geoCaja(0.22, 0.2, 0.06), blanco, s * 0.22, y + 0.3, 0.6)
    }
    if (fila % 2) pon(t, geoTronco(0.05, 0.25, 0.9).rotateX(Math.PI / 2), color, 0, y, 0.95)
    else pon(t, geoCaja(0.5, 0.2, 0.1), rojo, 0, y - 0.2, 0.6)
    pon(t, new THREE.TorusGeometry(0.6, 0.08, 4, 16), color, 0, y - 0.6, 0).rotation.x = Math.PI / 2
  }
  // El pájaro del trueno con las alas abiertas.
  pon(t, geoCaja(4.4, 0.35, 0.5), turquesa, 0, alto - 0.6, 0.1)
  for (const s of [-1, 1]) pon(t, geoCaja(1.2, 0.3, 0.52), rojo, s * 1.8, alto - 0.35, 0.1)
  pon(t, geoCaja(0.6, 0.8, 0.7), negro, 0, alto + 0.2, 0.2)
  pon(t, geoTronco(0.02, 0.2, 0.7).rotateX(Math.PI / 2), mat(0xe8b92e, 0.7), 0, alto + 0.1, 0.8)
}

// Avioneta de flotadores, roja y blanca.
function hidroavion (g, x, z, giro = 0) {
  const a = sub(g, x, 0, z, giro)
  const rojo = mat(0xd23a2a, 0.5)
  const blanco = mat(0xf2efe6, 0.5)
  pon(a, geoCaja(1.1, 1.2, 5.2), rojo, 0, 2.4, 0)
  pon(a, geoCaja(1.12, 0.5, 1.6), mat(0x2a3540, 0.2, 0.5), 0, 2.8, 1)
  pon(a, geoCaja(9, 0.16, 1.4), blanco, 0, 3.1, 0.8)
  pon(a, geoCaja(3, 0.12, 0.9), blanco, 0, 2.6, -2.4)
  pon(a, geoCaja(0.12, 1.2, 0.9), rojo, 0, 3.1, -2.4)
  pon(a, geoCil(0.1, 0.1, 1.8, 6), mat(0x2a2a2a), 0, 2.4, 2.7).rotation.z = Math.PI / 2
  for (const s of [-1, 1]) {
    pon(a, geoCaja(0.5, 0.5, 4.8), blanco, s * 1.3, 0.35, 0)
    barra(a, blanco, V(s * 1.3, 0.6, 1), V(s * 0.4, 1.8, 1), 0.08)
    barra(a, blanco, V(s * 1.3, 0.6, -1), V(s * 0.4, 1.8, -1), 0.08)
  }
}

// Alce.
function alce (g, x, z, giro = 0) {
  const a = sub(g, x, 0, z, giro)
  const pelo = mat(0x4a3526, 0.95)
  pon(a, geoCaja(0.9, 1.1, 2.2), pelo, 0, 1.9, 0)
  pon(a, geoCaja(0.55, 0.7, 0.9), pelo, 0, 2.3, 1.4).rotation.x = 0.4
  for (const [dx, dz] of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) pon(a, geoCil(0.08, 0.07, 1.4, 5), pelo, dx, 0.7, dz)
  for (const s of [-1, 1]) pon(a, geoCaja(0.9, 0.08, 0.5), mat(0xcfc0a0, 0.9), s * 0.6, 2.9, 1.3).rotation.z = s * 0.3
}

// Anchorage, a la derecha: la orilla de Turnagain Arm. El parque de tótems con
// la casa de clan pintada, las avionetas de flotadores amarradas en el
// pantalán, el tren de Alaska —amarillo y azul— por la vía de la costa, los
// alces, los abetos nevados, las cabañas, y detrás las montañas Chugach con
// los glaciares. En el agua, placas de hielo.
export function totems () {
  const g = new THREE.Group()
  const nieve = mat(NIEVE, 0.9)

  explanada(g, { x: 8, z: 0, ancho: 40, fondo: 96, color: 0xe8ecef, juntas: null })

  // --- el agua con hielo y el pantalán ---
  mar(g, { x: -10, z: 0, ancho: 12, fondo: 110, color: 0x5f8fa0 })
  for (let i = 0; i < 18; i++) pon(g, geoCil(azar(0.6, 1.8), azar(0.6, 1.8), 0.2, 7), mat(0xe6eef2, 0.6), azar(-15, -5), 0.2, azar(-54, 54))
  const tabla = mat(0x6b543c, 0.9)
  pon(g, geoCaja(10, 0.3, 2), tabla, -8, 0.6, 20)
  pon(g, geoCaja(10, 0.3, 2), tabla, -8, 0.6, -6)
  for (const z of [26, 14]) hidroavion(g, -9, z, Math.PI / 2)
  hidroavion(g, -9, -12, -Math.PI / 2)
  hidroavion(g, -8, 4, Math.PI / 2 + 0.3)

  // --- la vía y el tren ---
  const TX = -1.5
  pon(g, geoCaja(3.2, 0.3, 110), mat(0x7a7470, 1), TX, 0.15, 0)
  for (const dx of [-0.7, 0.7]) pon(g, geoCaja(0.12, 0.14, 110), mat(0x6d6a66, 0.4, 0.6), TX + dx, 0.37, 0)
  for (let z = -54; z < 55; z += 1.2) pon(g, geoCaja(2.2, 0.1, 0.3), mat(0x4a3a2a, 1), TX, 0.3, z)
  const amarillo = mat(0xe8b92e, 0.5)
  const azul = mat(0x1f3f7a, 0.5)
  for (let i = 0; i < 5; i++) {
    const v = sub(g, TX, 0.5, 30 - i * 11.5)
    pon(v, geoCaja(2.8, 3.4, 11), i === 0 ? azul : amarillo, 0, 2.1, 0)
    pon(v, geoCaja(2.85, 0.8, 11.05), i === 0 ? amarillo : azul, 0, 1.2, 0)
    ventanas(v, mat(0x2a3540, 0.2, 0.5), { ancho: 9, alto: 1.2, filas: 1, columnas: 6, x: -1.45, y: 2.3, z: 0, giro: -Math.PI / 2, w: 1, h: 0.9 })
    pon(v, geoCaja(2.9, 0.3, 11.1), nieve, 0, 3.95, 0)
    if (i === 0) pon(v, geoCaja(2, 1, 2), azul, 0, 4.3, 3)
  }

  // --- el parque de tótems y la casa de clan ---
  explanada(g, { x: 10, z: 8, ancho: 14, fondo: 30, color: 0xcfc6b4, juntas: null })
  totem(g, 5, 18, 11, -Math.PI / 2)
  totem(g, 5, 8, 9, -Math.PI / 2)
  totem(g, 5, -2, 12, -Math.PI / 2)
  totem(g, 9, 24, 8, -Math.PI / 2)
  const casa = sub(g, 14, 0, 8)
  pon(casa, geoCaja(9, 5, 12), mat(0x6b4a32, 0.9), 0, 2.5, 0)
  aguas(casa, mat(0x4a3526, 0.9), 10, 2.4, 13, 0, 5, 0)
  pon(casa, geoCaja(10.2, 0.4, 13.2), nieve, 0, 7.6, 0).scale.set(0.3, 1, 1)
  // La fachada pintada: la gran cara de dos ojos con la puerta redonda.
  pon(casa, geoCaja(0.1, 4.4, 10), mat(0xe8dcc0, 0.9), -4.55, 2.8, 0)
  for (const s of [-1, 1]) {
    pon(casa, geoCil(1.2, 1.2, 0.1, 18), mat(0x1f1f1f, 0.8), -4.62, 3.4, s * 2.6).rotation.z = Math.PI / 2
    pon(casa, geoCil(0.5, 0.5, 0.12, 14), mat(0xb8342a, 0.8), -4.66, 3.4, s * 2.6).rotation.z = Math.PI / 2
  }
  pon(casa, geoCil(0.8, 0.8, 0.12, 16), mat(0x2a1d18, 1), -4.66, 1, 0).rotation.z = Math.PI / 2
  gente(g, 25, { x0: 3, x1: 18, z0: 26, z1: -8, piel: 0xd9b48a })

  // --- cabañas, alces y abetos ---
  for (let i = 0; i < 6; i++) {
    const c = sub(g, azar(18, 28), 0, azar(-44, -12), azar(-0.3, 0.3))
    pon(c, geoCaja(5, 3.2, 6), mat(elige([0x8a5a3a, 0x6b4a32, 0xa86a3a]), 0.9), 0, 1.6, 0)
    aguas(c, mat(0x3a3a3a, 0.8), 5.6, 2, 6.6, 0, 3.2, 0)
    pon(c, geoCaja(2, 0.3, 6.8), nieve, 0, 5, 0)
    pon(c, geoCaja(0.6, 1.4, 0.6), mat(0x6f6a66, 0.9), 1.5, 5, 1.5)
  }
  for (const [x, z, giro] of [[2, -20, 0.4], [6, -30, -1.2], [12, 36, 2]]) alce(g, x, z, giro)
  for (let i = 0; i < 40; i++) arbol(g, azar(16, 40), azar(-48, 48), 'nevado', azar(0.9, 1.3))

  // --- las Chugach ---
  const fondo = m => { m.userData.sinFoco = true; return m }
  for (const [x, z, r, alto] of [[62, -30, 22, 30], [56, 10, 18, 24], [70, 36, 24, 34], [48, 48, 14, 18]]) {
    fondo(pon(g, geoCil(0.5, r, alto, 7), mat(0x6f7a80, 1), x, alto / 2, z))
    fondo(pon(g, geoCil(0.5, r * 0.45, alto * 0.45, 7), nieve, x, alto * 0.78, z))
  }

  return colocar(g, 1, -62)
}

// Seattle, a la izquierda de la avenida: el Seattle Center. La Space Needle
// —las patas en reloj de arena, la cintura, el platillo con el mirador de
// cristal y la aguja—, el monorraíl sobre sus pilares con el tren rojo y
// plata, el MoPOP con sus curvas de colores, la cúpula de la fuente
// internacional, los arcos blancos del Pacific Science Center, el césped y la
// gente; y al fondo el monte Rainier nevado.
export function spaceNeedle () {
  const g = new THREE.Group()
  const blanco = mat(0xf0efeb, 0.55, 0.2)
  const naranja = mat(0xd9912e, 0.45, 0.35)
  const cristal = vidrio(0x3a4a58)

  explanada(g, { x: 10, z: 0, ancho: 44, fondo: 96, color: 0xcfcac0, juntas: 0xb9b3a8, paso: 4 })
  cesped(g, { x: 18, z: -20, ancho: 22, fondo: 28, color: 0x5f9a45 })
  gente(g, 70, { x0: -6, x1: 30, z0: 44, z1: -44, piel: 0xd9b48a })
  for (let i = 0; i < 16; i++) arbol(g, azar(-8, 34), elige([azar(34, 46), azar(-46, -36)]), elige(['copa', 'abeto']), 1)

  // --- la Space Needle ---
  const NX = 10
  const NZ = 12
  const H = 48
  const cintura = H * 0.33
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    for (const dA of [-0.18, 0.18]) {
      const b = a + dA
      barra(g, blanco, V(NX + Math.cos(b) * 7, 0, NZ + Math.sin(b) * 7), V(NX + Math.cos(a) * 1.4, cintura, NZ + Math.sin(a) * 1.4), 0.55)
      barra(g, blanco, V(NX + Math.cos(a) * 1.4, cintura, NZ + Math.sin(a) * 1.4), V(NX + Math.cos(b) * 4.2, H * 0.86, NZ + Math.sin(b) * 4.2), 0.45)
    }
    pon(g, geoCaja(2.4, 1.2, 2.4), mat(0xb8b4ac, 0.8), NX + Math.cos(a) * 7, 0.6, NZ + Math.sin(a) * 7)
  }
  pon(g, geoCil(1.2, 1.2, H * 0.86, 12), mat(0xd8d6d0, 0.6), NX, H * 0.43, NZ)
  pon(g, new THREE.TorusGeometry(2.3, 0.3, 6, 24), blanco, NX, cintura, NZ).rotation.x = Math.PI / 2
  // El platillo: la bandeja inferior, el anillo de cristal, el tejado naranja
  // en halo y la corona.
  pon(g, geoCil(7.5, 4, 2.2, 36), blanco, NX, H * 0.86 + 1.1, NZ)
  pon(g, geoCil(7.6, 7.6, 2.4, 36), cristal, NX, H * 0.86 + 3.4, NZ)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    pon(g, geoCaja(0.15, 2.4, 0.15), blanco, NX + Math.cos(a) * 7.65, H * 0.86 + 3.4, NZ + Math.sin(a) * 7.65)
  }
  pon(g, geoCil(9, 7.8, 1, 36), naranja, NX, H * 0.86 + 5.1, NZ)
  pon(g, geoCil(5.5, 8.6, 1.4, 36), blanco, NX, H * 0.86 + 6.3, NZ)
  pon(g, geoCil(2.4, 3.2, 1.6, 20), blanco, NX, H * 0.86 + 7.8, NZ)
  pon(g, geoCil(0.12, 0.45, 9, 8), blanco, NX, H * 0.86 + 13, NZ)
  for (let y = 6; y < H * 0.84; y += 5) pon(g, geoCaja(1.6, 0.8, 1.6), cristal, NX, y, NZ)

  // --- el monorraíl ---
  const MX = -4
  pon(g, geoCaja(1.6, 1.2, 96), mat(0xd8d6d0, 0.7), MX, 7, 0)
  for (let z = -44; z <= 44; z += 12) {
    pon(g, geoCil(0.6, 0.8, 6.4, 10), mat(0xb8b4ac, 0.7), MX, 3.2, z)
    pon(g, geoCaja(3, 0.6, 1.4), mat(0xb8b4ac, 0.7), MX, 6.3, z)
  }
  const tren = sub(g, MX, 7.6, -12)
  for (let i = 0; i < 3; i++) {
    pon(tren, geoCaja(2.6, 2.8, 7.2), mat(0xc9ced2, 0.35, 0.6), 0, 1.2, i * 7.6)
    pon(tren, geoCaja(2.65, 0.8, 7.25), mat(0xd23a2a, 0.5), 0, 0.2, i * 7.6)
    pon(tren, geoCaja(2.68, 1, 6.4), cristal, 0, 1.6, i * 7.6)
  }

  // --- el MoPOP: volúmenes curvos de colores ---
  const pop = sub(g, 2, 0, -22)
  for (const [dx, dz, r, alto, color] of [[0, 0, 5, 9, 0x7a3fa0], [4, -4, 4, 11, 0xd9442e], [-3, -6, 4.5, 8, 0x2f6fbf], [3, 4, 3.5, 7, 0xc9a23a], [-4, 3, 3.2, 10, 0xb8b4ac]]) {
    const b = pon(pop, geoBola(r, 18, 12), mat(color, 0.25, 0.6), dx, alto * 0.45, dz)
    b.scale.set(1, alto / (r * 2), 1.3)
    b.rotation.y = azar(0, 3)
  }

  // --- la fuente internacional y el Pacific Science Center ---
  pon(g, geoCil(9, 9, 0.3, 32), mat(0xd9d4c8, 0.8), 22, 0.15, 28)
  pon(g, geoCupula(3.4), mat(0xc9ced2, 0.3, 0.7), 22, 0.3, 28)
  for (const s of [-1, 1]) {
    const arco = pon(g, new THREE.TorusGeometry(5, 0.35, 6, 24, Math.PI), blanco, 30 + s * 3, 0, -2)
    arco.rotation.y = Math.PI / 2 + s * 0.4
    arco.scale.y = 2.4
  }
  estanque(g, { x: 30, z: -2, ancho: 10, fondo: 8, color: 0x3f9cc4 })

  // --- el monte Rainier al fondo ---
  const r1 = pon(g, geoCil(1, 44, 30, 9), mat(0x7a8590, 1), 60, 15, -60)
  const r2 = pon(g, geoCil(1, 22, 15, 9), mat(NIEVE, 0.9), 60, 22.5, -60)
  r1.userData.sinFoco = true
  r2.userData.sinFoco = true

  // Con avenida el mundo no lo recoloca: se refleja y se pone junto a la acera.
  // A -14 los pilares del monorraíl pisaban la barandilla.
  espejo(g)
  g.position.set(-19, 0, -60)
  g.userData.lados = [-1]
  return g
}
