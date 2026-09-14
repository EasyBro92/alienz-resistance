// Francia: Marsella y Lyon. (París lleva la torre de Meshy.)
//
// Construidos a la derecha de la carretera (hacia -x queda la calzada);
// `colocar` refleja los de la izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, barra, V,
  aguas, arcada, ventanas, almenas, columnata, explanada, arbol, gente, farola, bloques,
  barca, colocar, sub, colina
} from './piezas.js'

// Estatua dorada en lo alto (la Bonne Mère, la Virgen de Fourvière).
function virgenDorada (g, x, y, z, k = 1) {
  const oro = mat(0xe2b23e, 0.3, 0.75)
  pon(g, geoCil(0.25 * k, 0.6 * k, 2.6 * k, 10), oro, x, y + 1.3 * k, z)
  pon(g, geoBola(0.3 * k, 10, 8), oro, x, y + 2.9 * k, z)
  pon(g, geoBola(0.22 * k, 8, 6), oro, x + 0.35 * k, y + 2.1 * k, z)
  pon(g, new THREE.TorusGeometry(0.4 * k, 0.05 * k, 4, 14), oro, x, y + 3.1 * k, z).rotation.x = Math.PI / 2
}

// Muro a franjas horizontales (la piedra blanca de Calissanne y la verde de
// Florencia de Notre-Dame de la Garde).
function franjas (g, colores, ancho, alto, fondo, x, y0, z, capa = 0.5) {
  const n = Math.round(alto / capa)
  for (let i = 0; i < n; i++) pon(g, geoCaja(ancho, capa, fondo), colores[i % colores.length], x, y0 + capa * (i + 0.5), z)
}

// Marsella, a la derecha: el Vieux-Port con su bosque de mástiles pegado a la
// carretera, el muelle con terrazas, los bloques de fachada crema y teja, y
// arriba del todo, sobre la colina de roca y pinos, Notre-Dame de la Garde:
// el bastión, la basílica a franjas blancas y verdes con sus cúpulas y el
// campanario con la Virgen dorada.
export function notreDame () {
  const g = new THREE.Group()

  // --- el puerto ---
  pon(g, geoCaja(12, 0.3, 66), mat(0x2f86a8, 0.08, 0.25), -10, 0.15, 0)
  const piedraMuelle = mat(0xd8cdb6, 0.95)
  pon(g, geoCaja(1.2, 0.9, 66), piedraMuelle, -16.6, 0.45, 0)
  pon(g, geoCaja(1.2, 0.9, 66), piedraMuelle, -3.4, 0.45, 0)
  const tabla = mat(0x8a6a48, 0.9)
  for (let z = 28; z > -30; z -= 7) {
    pon(g, geoCaja(9, 0.2, 0.9), tabla, -9.5, 0.45, z)
    for (const zb of [z + 1.5, z - 1.5]) {
      for (const xb of [-13, -9.5, -6]) {
        if (Math.random() < 0.2) continue
        barca(g, xb, zb, Math.PI / 2 + azar(-0.05, 0.05), { largo: 3.6, color: elige([0xf2efe6, 0xe8e2d4, 0x2e5c8a, 0xd9d4c4]), vela: Math.random() < 0.7 })
      }
    }
  }

  // --- el muelle: paseo, terrazas y gente ---
  explanada(g, { x: 0.5, z: 0, ancho: 6.5, fondo: 66, color: 0xe4dac6, juntas: 0xcdc2ab })
  gente(g, 45, { x0: -2.5, x1: 3.5, z0: 32, z1: -32 })
  for (let z = 30; z > -32; z -= 10) farola(g, -2.2, z, 4.5, 0x2c3a33)
  const toldo = [0xb03a2e, 0x2f5f8a, 0xd9a13a]
  for (let z = 28; z > -30; z -= 8) {
    pon(g, geoCaja(1.8, 0.1, 5.5), lamina(elige(toldo), 0.8), 2.9, 3.2, z).rotation.z = -0.2
    for (let i = 0; i < 3; i++) {
      pon(g, geoCil(0.35, 0.35, 0.06, 10), mat(0xeeeeee, 0.6), 2.4, 0.8, z - 1.6 + i * 1.6)
      pon(g, geoCil(0.05, 0.05, 0.7, 6), mat(0x333333, 0.6), 2.4, 0.45, z - 1.6 + i * 1.6)
    }
  }

  // --- la ciudad al pie de la colina ---
  const fachadas = [0xefe2c6, 0xe6cfa3, 0xdcb98a, 0xf2e8d4, 0xd9a878]
  const filaA = []
  // Bajos a propósito: desde el aire tapaban la basílica.
  for (let z = 30; z > -32; z -= 7.5) filaA.push([7, z, 6, azar(5.5, 8), 7])
  bloques(g, filaA, 1, { colores: fachadas, tejado: 0xb5613f })
  const filaB = []
  for (let z = 30; z > -32; z -= 8) filaB.push([13.5, z, 6, azar(7, 10), 7.5])
  bloques(g, filaB, 1, { colores: fachadas, tejado: 0xb5613f })

  // --- la colina de la Garde ---
  const CX = 30
  colina(g, { x: CX, z: -2, rAbajo: 16, rArriba: 6.5, alto: 17, color: 0x9a9582, roca: 0x8a847a, rocas: 22, escalaZ: 1.6 })
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(7, 15)
    const y = 17 * (16 - r) / 9.5
    const s = sub(g, CX + Math.cos(a) * r, Math.max(0, y) - 0.3, -2 + Math.sin(a) * r * 1.6)
    arbol(s, 0, 0, 'pino', 0.8)
  }

  // --- el bastión ---
  const BY = 17
  const piedraFuerte = mat(0xb9ad92, 0.95)
  pon(g, geoCaja(13, 3, 12), piedraFuerte, CX, BY + 1.5, -2)
  pon(g, geoCaja(13.6, 0.5, 12.6), mat(0xa39880, 0.95), CX, BY + 3.2, -2)
  for (let z = -7.5; z <= 3.5; z += 1.2) pon(g, geoCaja(0.12, 0.8, 0.5), mat(0x3a3a3a, 1), CX - 6.53, BY + 1.3, z)
  explanada(g, { x: CX, z: -2, ancho: 12.6, fondo: 12, color: 0xd9cdb4, juntas: null, y: BY + 3.3 })
  gente(g, 20, { x0: CX - 6, x1: CX - 3, z0: 3.5, z1: -7.5, y: BY + 3.45 })

  // --- la basílica ---
  const Y = BY + 3.45
  const blanca = mat(0xece6d6, 0.8)
  const verde = mat(0x6f8a6a, 0.8)
  const hueco = mat(0x2e2a26, 1)
  // Nave a lo largo de x, con el campanario a poniente (del lado de la carretera).
  franjas(g, [blanca, verde], 9, 5, 4.6, CX + 1.5, Y, -2)
  aguas(sub(g, CX + 1.5, 0, -2, Math.PI / 2), mat(0x8a8f80, 0.7), 4.8, 1.2, 9.2, 0, Y + 5, 0)
  for (const s of [-1, 1]) arcada(g, hueco, { ancho: 8, alto: 1.8, n: 5, x: CX + 1.5, y: Y + 1.6, z: -2 + s * 2.32, giro: s > 0 ? 0 : Math.PI })
  // La cúpula mayor sobre su tambor a franjas, con nervios verdes.
  franjas(g, [blanca, verde], 1, 1.6, 1, CX + 2.5, Y + 5, -2, 0.4)
  pon(g, geoCil(2, 2, 1.6, 20), blanca, CX + 2.5, Y + 5.8, -2)
  for (let i = 0; i < 4; i++) pon(g, new THREE.TorusGeometry(2.02, 0.07, 4, 24), verde, CX + 2.5, Y + 5.2 + i * 0.4, -2).rotation.x = Math.PI / 2
  pon(g, geoCupula(2.1), blanca, CX + 2.5, Y + 6.6, -2)
  for (let i = 0; i < 8; i++) pon(g, new THREE.TorusGeometry(2.12, 0.06, 4, 16, Math.PI), verde, CX + 2.5, Y + 6.6, -2).rotation.y = (i / 8) * Math.PI
  pon(g, geoCil(0.35, 0.45, 1, 8), blanca, CX + 2.5, Y + 9, -2)
  pon(g, geoCupula(0.45), verde, CX + 2.5, Y + 9.5, -2)
  // Cúpula menor y ábside.
  pon(g, geoCil(1.3, 1.3, 1, 16), blanca, CX + 5.5, Y + 5.5, -2)
  pon(g, geoCupula(1.35), blanca, CX + 5.5, Y + 6, -2)
  pon(g, new THREE.CylinderGeometry(2.3, 2.3, 4.6, 16, 1, false, 0, Math.PI), blanca, CX + 6, Y + 2.3, -2).rotation.y = Math.PI / 2
  // El campanario: franjas hasta el campanil, arcos del campanario, cornisa,
  // tambor octogonal y la Virgen dorada.
  const TX = CX - 5
  franjas(g, [blanca, verde], 3.4, 11, 3.4, TX, Y, -2)
  arcada(g, hueco, { ancho: 2.6, alto: 3, n: 1, x: TX - 1.72, y: Y + 0.3, z: -2, giro: -Math.PI / 2, hueco: 0.7 })
  for (const [dx, dz, giro] of [[-1.72, 0, -Math.PI / 2], [1.72, 0, Math.PI / 2], [0, 1.72, 0], [0, -1.72, Math.PI]]) {
    arcada(g, hueco, { ancho: 2.6, alto: 2.4, n: 2, x: TX + dx, y: Y + 7.6, z: -2 + dz, giro })
  }
  pon(g, geoCaja(3.9, 0.5, 3.9), blanca, TX, Y + 11.25, -2)
  pon(g, geoCil(1.5, 1.6, 2.2, 8), blanca, TX, Y + 12.6, -2)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoCaja(0.4, 1.3, 0.1), hueco, TX + Math.cos(a) * 1.55, Y + 12.6, -2 + Math.sin(a) * 1.55).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(1.1, 1.5, 0.8, 8), verde, TX, Y + 14.1, -2)
  pon(g, geoCil(0.6, 0.8, 1.2, 8), blanca, TX, Y + 15.1, -2)
  virgenDorada(g, TX, Y + 15.7, -2, 1.3)

  return colocar(g, 1, -62)
}

// Lyon, a la izquierda: el Saona con su muelle de piedra y plátanos y una
// pasarela colgante, las casas altas de colores del Vieux Lyon con teja roja,
// y encima la colina verde de Fourvière con la basílica blanca —cuatro torres
// octogonales almenadas, el pórtico de columnas y el arcángel dorado—, la
// capilla vieja con su Virgen dorada y la torre metálica.
export function fourviere () {
  const g = new THREE.Group()

  // --- el Saona ---
  pon(g, geoCaja(11, 0.3, 70), mat(0x557f7c, 0.1, 0.2), -11, 0.15, 0)
  const sillar = mat(0xc9bfae, 0.95)
  for (const x of [-16.9, -5.1]) pon(g, geoCaja(1.2, 1.2, 70), sillar, x, 0.6, 0)
  // La pasarela Saint-Georges: tablero, dos pórticos y los cables.
  const hierro = mat(0x4a5a52, 0.5, 0.5)
  pon(g, geoCaja(13, 0.35, 2.2), hierro, -11, 2.4, 8)
  for (const x of [-17.2, -4.8]) {
    for (const dz of [-1.1, 1.1]) pon(g, geoCil(0.12, 0.15, 6, 8), hierro, x, 3, 8 + dz)
  }
  for (const dz of [-1.1, 1.1]) {
    for (let i = 0; i <= 12; i++) {
      const x = -17.2 + (i / 12) * 12.4
      const t = i / 12
      const y = 6 - 4 * t * (1 - t) * 3.2
      if (i < 12) {
        const x2 = -17.2 + ((i + 1) / 12) * 12.4
        const t2 = (i + 1) / 12
        barra(g, hierro, V(x, y, 8 + dz), V(x2, 6 - 4 * t2 * (1 - t2) * 3.2, 8 + dz), 0.06)
      }
      barra(g, hierro, V(x, y, 8 + dz), V(x, 2.6, 8 + dz), 0.03)
    }
  }
  // Una péniche amarrada.
  const pen = sub(g, -13.5, 0, -14)
  pon(pen, geoCaja(2.6, 1, 11), mat(0x2f3f4c, 0.6), 0, 0.5, 0)
  pon(pen, geoCaja(2.2, 1.3, 5), mat(0xe8dcc0, 0.8), 0, 1.6, -1.5)
  pon(pen, geoCaja(2.3, 0.1, 5.2), mat(0xb03a2e, 0.7), 0, 2.3, -1.5)

  // --- el muelle del Vieux Lyon ---
  explanada(g, { x: -2, z: 0, ancho: 4.8, fondo: 70, color: 0xd6ccb8, juntas: null })
  for (let z = 32; z > -34; z -= 5.5) arbol(g, -3.4, z, 'copa', 1.05)
  gente(g, 30, { x0: -3.6, x1: 0.2, z0: 33, z1: -33 })
  const colores = [0xe0a060, 0xd98a6a, 0xe8c38a, 0xc97b5a, 0xf0d7a8, 0xe6b07a]
  const casas = []
  // Más bajas que las de verdad: desde el aire tapaban la colina.
  for (let z = 32; z > -34; z -= 4.6) casas.push([3.5, z, 5, azar(7, 10), 4.4])
  bloques(g, casas, 1, { colores, tejado: 0xb5613f })
  const detras = []
  for (let z = 30; z > -32; z -= 6) detras.push([9, z, 6, azar(6, 9), 5.5])
  bloques(g, detras, 1, { colores, tejado: 0xb5613f })

  // --- la colina de Fourvière ---
  const CX = 31
  colina(g, { x: CX, z: 0, rAbajo: 20, rArriba: 11, alto: 15, color: 0x6d8a4f, roca: 0x6a6a58, rocas: 8, escalaZ: 1.5 })
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(11.5, 19)
    const y = 15 * (20 - r) / 9
    arbol(sub(g, CX + Math.cos(a) * r, Math.max(0, y) - 0.3, Math.sin(a) * r * 1.5), 0, 0, elige(['copa', 'copa', 'cipres']), 0.95)
  }
  const Y = 15
  explanada(g, { x: CX, z: 0, ancho: 21, fondo: 30, color: 0xd9d2c2, juntas: 0xc6beac, y: Y })

  // --- la basílica ---
  const blanca = mat(0xf1ece0, 0.75)
  const granito = mat(0xc9a4a0, 0.6)
  const hueco = mat(0x2f2c2a, 1)
  const BX = CX - 1
  pon(g, geoCaja(15, 8, 8), blanca, BX + 1.5, Y + 4, 0)
  aguas(sub(g, BX + 1.5, 0, 0, Math.PI / 2), mat(0x7f8a8f, 0.6, 0.3), 8.2, 2.4, 15.2, 0, Y + 8, 0)
  pon(g, new THREE.CylinderGeometry(3.9, 3.9, 8, 16, 1, false, 0, Math.PI), blanca, BX + 9, Y + 4, 0).rotation.y = Math.PI / 2
  for (const s of [-1, 1]) {
    ventanas(g, hueco, { ancho: 12, alto: 5, filas: 2, columnas: 5, x: BX + 1.5, y: Y + 1.5, z: s * 4.04, giro: s > 0 ? 0 : Math.PI, w: 0.8, h: 1.6 })
  }
  // Las cuatro torres octogonales almenadas.
  for (const [tx, tz] of [[BX - 5.5, -4.4], [BX - 5.5, 4.4], [BX + 8.5, -4.4], [BX + 8.5, 4.4]]) {
    pon(g, geoCil(1.5, 1.6, 12, 8), blanca, tx, Y + 6, tz)
    pon(g, geoCil(1.8, 1.8, 0.6, 8), blanca, tx, Y + 12.2, tz)
    almenas(g, blanca, 1.7, Y + 12.9, 8, tx, tz, 0.45)
    pon(g, geoCil(0.2, 1.1, 1.6, 8), mat(0x7f8a8f, 0.6, 0.3), tx, Y + 13.6, tz)
    for (const y of [Y + 4, Y + 8.5]) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2
        pon(g, geoCaja(0.35, 1.6, 0.1), hueco, tx + Math.cos(a) * 1.58, y, tz + Math.sin(a) * 1.58).rotation.y = Math.PI / 2 - a
      }
    }
  }
  // Fachada: pórtico de cuatro columnas de granito, frontón con galería de
  // arcos y el arcángel dorado arriba.
  columnata(g, granito, { n: 4, largo: 5.4, alto: 4.2, r: 0.34, x: BX - 7.2, y: Y, z: 0, enZ: true })
  pon(g, geoCaja(2, 0.8, 7), blanca, BX - 7.2, Y + 4.8, 0)
  arcada(g, hueco, { ancho: 6, alto: 2, n: 5, x: BX - 6.03, y: Y + 5.4, z: 0, giro: -Math.PI / 2 })
  pon(g, geoCaja(0.8, 2.6, 5), blanca, BX - 6.4, Y + 6.5, 0)
  arcada(g, hueco, { ancho: 3.4, alto: 3.2, n: 1, x: BX - 6.03, y: Y, z: 0, giro: -Math.PI / 2, hueco: 0.7 })
  virgenDorada(g, BX - 6.4, Y + 7.8, 0, 0.8)
  gente(g, 30, { x0: CX - 10, x1: CX - 7.5, z0: 13, z1: -13, y: Y + 0.12 })
  for (let z = -12; z <= 12; z += 6) farola(g, CX - 9.8, z, 4, 0x2c3a33)

  // La capilla vieja y su campanario con la Virgen dorada.
  const cap = mat(0xe6dcc6, 0.85)
  pon(g, geoCaja(6, 5, 4.5), cap, CX + 2, Y + 2.5, -10.5)
  aguas(sub(g, CX + 2, 0, -10.5, Math.PI / 2), mat(0xa4553a, 0.85), 4.8, 1.4, 6.2, 0, Y + 5, 0)
  pon(g, geoCaja(2.4, 9, 2.4), cap, CX - 1.6, Y + 4.5, -10.5)
  pon(g, geoCupula(1.4), mat(0x7f8a8f, 0.5, 0.4), CX - 1.6, Y + 9, -10.5)
  virgenDorada(g, CX - 1.6, Y + 10.3, -10.5, 1)

  // La torre metálica: cuatro patas que se juntan, en celosía.
  const acero = mat(0x7d8288, 0.45, 0.6)
  const TX = CX + 7
  const TZ = 11
  const ancho = y => 2.4 * (1 - y / 24) + 0.25
  for (let t = 0; t < 8; t++) {
    const ya = t * 3
    const yb = (t + 1) * 3
    const pa = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => V(TX + a * ancho(ya), Y + ya, TZ + b * ancho(ya)))
    const pb = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => V(TX + a * ancho(yb), Y + yb, TZ + b * ancho(yb)))
    for (let e = 0; e < 4; e++) {
      const f = (e + 1) % 4
      barra(g, acero, pa[e], pb[e], 0.16)
      barra(g, acero, pa[e], pb[f], 0.07)
      barra(g, acero, pb[e], pb[f], 0.08)
    }
  }
  pon(g, geoCil(0.05, 0.2, 4, 6), acero, TX, Y + 26, TZ)

  return colocar(g, -1, -62)
}
