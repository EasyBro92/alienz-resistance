// Egipto: Alejandría, Luxor y El Cairo.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const BANDERA_EGIPTO = [0xce1126, 0xffffff, 0x111111]

// Un camello echado o de pie, con su jinete opcional.
function camello (g, x, z, giro = 0, conJinete = false) {
  const c = sub(g, x, 0, z, giro)
  const pelo = mat(0xb88a52, 0.95)
  pon(c, geoCaja(0.8, 0.8, 2), pelo, 0, 1.7, 0)
  pon(c, geoBola(0.5, 8, 6), pelo, 0, 2.2, -0.1).scale.y = 0.8
  barra(c, pelo, V(0, 1.9, 0.9), V(0, 2.8, 1.5), 0.3)
  pon(c, geoCaja(0.3, 0.3, 0.6), pelo, 0, 2.85, 1.7)
  for (const [dx, dz] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]]) pon(c, geoCil(0.08, 0.07, 1.4, 5), pelo, dx, 0.7, dz)
  pon(c, geoCaja(0.9, 0.12, 0.9), mat(0xb03a2e, 0.8), 0, 2.2, -0.2)
  if (conJinete) {
    pon(c, geoCaja(0.4, 0.8, 0.3), mat(0xf2f0ea, 0.9), 0, 2.7, -0.2)
    pon(c, geoBola(0.15, 6, 4), mat(0xa87858), 0, 3.25, -0.2)
  }
}

// Alejandría, a la derecha: la Bibliotheca Alexandrina. El disco inclinado de
// la cubierta con su retícula de paneles de cristal y aluminio, que sale del
// estanque; el muro de granito curvo con las letras de todos los alfabetos;
// la esfera del planetario en la plaza; la pasarela; y detrás el puerto este
// con las barcas y la ciudadela de Qaitbay en su punta. Palmeras y gente en la
// Corniche.
export function bibliotecaAlejandria () {
  const g = new THREE.Group()
  const granito = mat(0x8e8a84, 0.7)
  const granitoOscuro = mat(0x6e6a66, 0.7)
  const aluminio = mat(0xc9d2d8, 0.25, 0.7)
  const panel = mat(0x7da3b8, 0.15, 0.5)

  // --- la plaza de la Corniche ---
  explanada(g, { x: 0, z: 0, ancho: 26, fondo: 76, color: 0xe3d9c3, juntas: 0xcbbfa5, paso: 3 })
  for (let z = 34; z > -38; z -= 6) arbol(g, -11, z, 'palmera', 1)
  for (let z = 32; z > -36; z -= 12) farola(g, -9, z, 5, 0x2c3a33)
  gente(g, 60, { x0: -12, x1: 12, z0: 36, z1: -36 })

  // --- el estanque y el disco ---
  const DX = 10
  const DZ = -2
  const R = 17
  estanque(g, { x: DX - 2, z: DZ, ancho: 18, fondo: 40, color: 0x3f8fae })
  const disco = sub(g, DX, 0, DZ)
  disco.rotation.z = -0.22
  pon(disco, geoCil(R, R, 1.2, 48), aluminio, 0, 5, 0)
  // La retícula de paneles: juntas oscuras en las dos direcciones y los
  // lucernarios inclinados.
  for (let u = -R + 2; u < R; u += 2.2) {
    const largo = 2 * Math.sqrt(R * R - u * u)
    pon(disco, geoCaja(0.12, 0.08, largo), mat(0x2f3f4a, 0.4, 0.5), u, 5.64, 0)
    pon(disco, geoCaja(largo, 0.08, 0.12), mat(0x2f3f4a, 0.4, 0.5), 0, 5.64, u)
  }
  for (let u = -R + 3; u < R - 2; u += 4.4) {
    for (let v = -R + 3; v < R - 2; v += 4.4) {
      if (u * u + v * v > (R - 2.5) * (R - 2.5)) continue
      pon(disco, geoTronco(0.1, 0.9, 0.7).scale(1.1, 1, 1.1), panel, u, 6, v).rotation.z = 0.3
    }
  }
  // La cara del disco que entra en el suelo, en sombra, y las columnas de
  // debajo que se ven por la cristalera.
  pon(g, geoCil(R - 1, R - 1, 3, 48), vidrio(0x2f4250), DX + 1.5, 1.5, DZ)
  // --- el muro de granito con las letras ---
  const muro = pon(g, new THREE.CylinderGeometry(R + 0.4, R + 0.4, 9, 48, 1, true, 0, Math.PI), lamina(0x8e8a84, 0.7), DX, 4.5, DZ)
  muro.rotation.y = 0
  for (let k = 0; k < 160; k++) {
    const a = Math.random() * Math.PI
    const y = azar(0.8, 8)
    pon(g, geoCaja(0.5, 0.6, 0.08), elige([granitoOscuro, mat(0x55524e, 0.8)]), DX + Math.sin(a) * (R + 0.46), y, DZ + Math.cos(a) * (R + 0.46)).rotation.y = a
  }
  // --- el planetario ---
  pon(g, geoCil(3.6, 3.8, 1.2, 20), granito, -2, 0.6, 22)
  pon(g, geoBola(4.2, 24, 16), mat(0x4a5058, 0.3, 0.5), -2, 4.6, 22)
  pon(g, new THREE.TorusGeometry(4.25, 0.1, 4, 32), mat(0x9aa3aa, 0.3, 0.6), -2, 4.6, 22).rotation.x = Math.PI / 2
  // La pasarela que cruza por encima.
  pon(g, geoCaja(22, 0.5, 3), mat(0xd8d2c6, 0.8), 4, 4, 22)
  for (const x of [-6, 4, 14]) pon(g, geoCil(0.3, 0.3, 4, 8), granito, x, 2, 22)

  // --- el puerto este y la ciudadela de Qaitbay ---
  mar(g, { x: 58, z: 0, ancho: 60, fondo: 110 })
  pon(g, geoCaja(1.2, 1, 90), mat(0xcfc6b4, 0.9), 28.5, 0.5, 0)
  for (let i = 0; i < 12; i++) barca(g, azar(34, 60), azar(-44, 44), azar(0, 3), { largo: 4, color: elige([0x2e5c8a, 0xf2efe6, 0xd9a13a]) })
  const QX = 64
  const QZ = -34
  pon(g, geoCaja(24, 1.2, 20), mat(0xbcae94, 0.95), QX, 0.6, QZ)
  pon(g, geoCaja(22, 5, 18), mat(0xd9c8a4, 0.95), QX, 3.7, QZ)
  almenasRectas(g, mat(0xd9c8a4, 0.95), 22, 6.6, QX, QZ - 9, false)
  almenasRectas(g, mat(0xd9c8a4, 0.95), 22, 6.6, QX, QZ + 9, false)
  pon(g, geoCaja(9, 9, 9), mat(0xe4d4b0, 0.95), QX, 5.7, QZ)
  for (const [dx, dz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) pon(g, geoCil(1.2, 1.3, 11, 12), mat(0xe4d4b0, 0.95), QX + dx, 5.5, QZ + dz)
  pon(g, geoCil(0.6, 0.7, 4, 8), mat(0xe4d4b0, 0.95), QX, 12, QZ)
  bandera(g, QX, QZ, 5, BANDERA_EGIPTO, 10.2)

  // --- la ciudad detrás de la Corniche (del lado de la carretera, al fondo) ---
  const fila = []
  for (let z = -46; z > -56; z -= 12) fila.push([6, z, 20, azar(12, 18), 8])
  bloques(g, fila, 1, { colores: [0xe8dcc0, 0xd9c8a4, 0xefe2c6] })

  return colocar(g, 1, -62)
}

// Luxor, a la izquierda: el templo. El primer pilono con sus relieves y las
// ranuras de los mástiles, los dos colosos sentados de Ramsés II, el obelisco
// que queda (el otro está en París), la avenida de esfinges que llega de
// Karnak, la columnata de Amenhotep III con sus catorce columnas de papiro,
// el patio porticado detrás y la mezquita de Abu Haggag encaramada en las
// ruinas. Palmeras y el Nilo al fondo, con las falucas.
export function temploEgipcio () {
  const g = new THREE.Group()
  const arenisca = mat(0xcfae78, 0.95)
  const areniscaSombra = mat(0xb08f5e, 0.95)
  const grabado = mat(0x8a6a44, 1)
  const hueco = mat(0x2e2418, 1)

  explanada(g, { x: 4, z: 0, ancho: 40, fondo: 84, color: 0xd9c296, juntas: null })

  // --- la avenida de esfinges, llegando al pilono desde la carretera ---
  for (let i = 0; i < 9; i++) {
    for (const s of [-1, 1]) {
      const x = -14 + i * 0
      const z = 40 - i * 2.8
      const e = sub(g, s < 0 ? -6 : 2, 0, z, 0)
      pon(e, geoCaja(1.8, 0.6, 1), areniscaSombra, 0, 0.3, 0)
      pon(e, geoCaja(1.6, 0.9, 0.8), arenisca, -0.1, 1, 0)
      pon(e, geoCaja(0.6, 0.9, 0.7), arenisca, s < 0 ? 0.7 : -0.7, 1.6, 0)
      pon(e, geoTronco(0.2, 0.45, 0.5), arenisca, s < 0 ? 0.7 : -0.7, 2.2, 0)
      void x
    }
  }

  // --- el pilono ---
  const PZ = 14
  const PX = -2
  for (const s of [-1, 1]) {
    const torre = pon(g, geoTronco(2, 3, 14), arenisca, PX + s * 7.5, 7, PZ)
    torre.scale.set(2.3, 1, 1)
    // Relieves de las batallas de Qadesh.
    for (let f = 0; f < 4; f++) {
      for (let c = 0; c < 5; c++) pon(g, geoCaja(0.9, 1.2, 0.06), grabado, PX + s * 7.5 - 3.6 + c * 1.8, 2 + f * 2.4, PZ + 3.1 - f * 0.28)
    }
    // Ranuras de los mástiles de las banderas.
    for (const dx of [-2.2, 2.2]) pon(g, geoCaja(0.5, 12, 0.1), hueco, PX + s * 7.5 + dx, 6, PZ + 3.05 - 0.9)
    pon(g, geoCaja(9.4, 0.8, 5), areniscaSombra, PX + s * 7.5, 14.2, PZ)
  }
  pon(g, geoCaja(4, 9, 4.6), arenisca, PX, 4.5, PZ)
  pon(g, geoCaja(2.4, 6.5, 0.1), hueco, PX, 3.25, PZ + 2.35)
  // Los dos colosos sentados.
  for (const s of [-1, 1]) {
    const c = sub(g, PX + s * 4.4, 0, PZ + 4.6)
    pon(c, geoCaja(2.2, 2, 2.6), areniscaSombra, 0, 1, 0)
    pon(c, geoCaja(1.8, 2.4, 1.2), arenisca, 0, 3.2, -0.6)
    pon(c, geoCaja(1.6, 0.6, 1.8), arenisca, 0, 2.3, 0.4)
    for (const dx of [-0.45, 0.45]) pon(c, geoCaja(0.5, 2, 0.5), arenisca, dx, 1.2, 1.1)
    pon(c, geoCaja(0.8, 0.9, 0.8), arenisca, 0, 4.9, -0.5)
    pon(c, geoTronco(0.25, 0.6, 1), arenisca, 0, 5.8, -0.5)
    pon(c, geoCaja(1.3, 0.5, 0.2), arenisca, 0, 5, -0.9)
  }
  // El obelisco, a un lado, sobre su pedestal con babuinos.
  pon(g, geoCaja(2, 1.4, 2), areniscaSombra, PX - 9, 0.7, PZ + 7)
  pon(g, geoTronco(0.35, 0.7, 16), mat(0xa0624a, 0.85), PX - 9, 9.4, PZ + 7)
  pon(g, geoTronco(0, 0.35, 1.2), mat(0xd9b04a, 0.35, 0.6), PX - 9, 18, PZ + 7)
  for (let y = 3; y < 16; y += 1.2) pon(g, geoCaja(0.5, 0.5, 0.05), mat(0x6f4a38, 1), PX - 9, y, PZ + 7.6 - (y - 3) * 0.02)

  // --- el primer patio (de Ramsés) con su pórtico ---
  const RZ = 0
  pon(g, geoCaja(24, 6, 1.5), areniscaSombra, PX, 3, RZ - 10)
  for (const s of [-1, 1]) pon(g, geoCaja(1.5, 6, 22), areniscaSombra, PX + s * 12, 3, RZ)
  columnata(g, arenisca, { n: 8, largo: 20, alto: 5.5, r: 0.6, x: PX, z: RZ - 7.5 })
  for (const s of [-1, 1]) columnata(g, arenisca, { n: 5, largo: 16, alto: 5.5, r: 0.6, x: PX + s * 9.5, z: RZ, enZ: true })
  // La mezquita de Abu Haggag, alzada sobre la ruina en una esquina del patio.
  const MX = PX + 8
  const MZ = RZ + 5
  pon(g, geoCaja(8, 5, 8), mat(0xe8dcc0, 0.9), MX, 8.5, MZ)
  pon(g, geoCaja(8, 6, 8), areniscaSombra, MX, 3, MZ)
  pon(g, geoCupula(2.2), mat(0xe8dcc0, 0.9), MX - 1, 11, MZ + 1)
  pon(g, geoCil(0.8, 0.9, 9, 8), mat(0xe8dcc0, 0.9), MX + 3, 13.5, MZ - 3)
  pon(g, geoCil(1.1, 1.1, 0.4, 8), mat(0xe8dcc0, 0.9), MX + 3, 15.5, MZ - 3)
  pon(g, geoCil(0.02, 0.6, 1.4, 8), mat(0x6f8a6a, 0.7), MX + 3, 18.7, MZ - 3)

  // --- la columnata de Amenhotep III: catorce columnas de papiro en dos filas ---
  const CZ = -24
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      const x = PX + s * 3
      const z = CZ + 10 - i * 3.3
      pon(g, geoCil(0.95, 1.05, 11, 16), arenisca, x, 5.5, z)
      pon(g, geoCil(1.6, 0.95, 1.6, 16), arenisca, x, 11.8, z)
      pon(g, geoCaja(2.2, 0.6, 2.2), areniscaSombra, x, 12.9, z)
      for (const y of [2.5, 5, 7.5]) pon(g, new THREE.TorusGeometry(1.02, 0.08, 4, 16), grabado, x, y, z).rotation.x = Math.PI / 2
    }
  }
  for (const s of [-1, 1]) pon(g, geoCaja(1.6, 1.4, 24), areniscaSombra, PX + s * 3, 13.9, CZ)

  // --- el patio de Amenhotep III con su doble fila de columnas ---
  const AZ = -44
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      for (const f of [0, 1]) {
        pon(g, geoCil(0.6, 0.7, 7, 12), arenisca, PX + s * (8 + f * 2.2), 3.5, AZ + 7 - i * 2.8)
        pon(g, geoCil(0.9, 0.6, 1, 12), arenisca, PX + s * (8 + f * 2.2), 7.4, AZ + 7 - i * 2.8)
      }
    }
    pon(g, geoCaja(4, 1, 17), areniscaSombra, PX + s * 9.1, 8.3, AZ)
  }

  // --- palmeras, gente, calesas y el Nilo ---
  for (let i = 0; i < 20; i++) arbol(g, azar(-18, -12) + (i % 2 ? 36 : 0), azar(-40, 40), 'palmera', 1)
  gente(g, 45, { x0: -8, x1: 4, z0: 42, z1: -50 })
  mar(g, { x: 44, z: 0, ancho: 40, fondo: 110, color: 0x3d7f8e })
  for (let i = 0; i < 6; i++) barca(g, azar(34, 52), azar(-40, 40), azar(0, 3), { largo: 4.5, vela: true })

  return colocar(g, -1, -62)
}

// El Cairo, a la derecha: la meseta de Gizeh. La Esfinge en su foso excavado,
// con el nemes a rayas, la nariz rota y la estela entre las patas; el templo del
// valle de Kefrén, de bloques de granito; la calzada que sube a las pirámides
// —Kefrén con el remate de revestimiento, Keops y Micerino con las tres de las
// reinas—; camellos, turistas y la valla del recinto.
export function esfinge () {
  const g = new THREE.Group()
  const caliza = mat(0xd4b27a, 0.95)
  const calizaSombra = mat(0xb8955e, 0.95)
  const raya = mat(0x9c7a4c, 0.95)
  const granito = mat(0x8a7466, 0.85)

  explanada(g, { x: 8, z: 10, ancho: 44, fondo: 70, color: 0xd9bf8a, juntas: null })
  pon(g, geoCaja(90, 0.1, 110), mat(0xd9bf8a, 1), 30, 0.03, -20).userData.sinFoco = true

  // --- el foso de la Esfinge ---
  const SX = 0
  const SZ = 8
  pon(g, geoCaja(14, 0.3, 26), mat(0xc4a26e, 1), SX, 0.15, SZ)
  for (const s of [-1, 1]) pon(g, geoCaja(1.6, 3.5, 26), calizaSombra, SX + s * 7.8, 1.75, SZ)
  pon(g, geoCaja(17, 3.5, 1.6), calizaSombra, SX, 1.75, SZ - 13.8)

  // --- la Esfinge, mirando hacia la carretera ---
  const e = sub(g, SX, 0.3, SZ, -Math.PI / 2)
  pon(e, geoCaja(4.4, 3.6, 13), caliza, 0, 1.8, -1)
  for (let i = 0; i < 6; i++) pon(e, geoCaja(4.5, 0.12, 13.1), raya, 0, 0.6 + i * 0.55, -1)
  pon(e, geoCaja(4.6, 1.2, 4), caliza, 0, 3.8, -5.5).rotation.x = 0.2
  for (const dx of [-1.4, 1.4]) {
    pon(e, geoCaja(1.3, 1, 6), caliza, dx, 0.5, 7.5)
    pon(e, geoCaja(1.4, 0.3, 1.2), calizaSombra, dx, 0.2, 10.4)
  }
  pon(e, geoCaja(3.2, 3.2, 3.2), caliza, 0, 4.8, 4.4)
  // El nemes con rayas, las alas a los lados de la cara.
  pon(e, geoTronco(1.2, 2.2, 2.4), caliza, 0, 6.6, 4.2)
  for (let k = 0; k < 6; k++) {
    for (const s of [-1, 1]) pon(e, geoCaja(0.08, 2.4, 0.26), raya, s * 1.9, 5.2, 3.2 + k * 0.45)
  }
  pon(e, geoCaja(1.8, 2, 0.9), caliza, 0, 5.4, 6)
  pon(e, geoCaja(0.4, 0.4, 0.3), calizaSombra, 0, 5.3, 6.5)
  for (const s of [-1, 1]) pon(e, geoCaja(0.35, 0.18, 0.1), mat(0x6f5a3a, 1), s * 0.45, 5.9, 6.46)
  // La estela del sueño entre las patas.
  pon(e, geoCaja(2, 2.4, 0.4), granito, 0, 1.2, 6.8)

  // --- el templo del valle de Kefrén ---
  pon(g, geoCaja(12, 6, 12), granito, SX + 2, 3, SZ - 22)
  for (let y = 0.6; y < 6; y += 1.1) pon(g, geoCaja(12.05, 0.08, 12.05), mat(0x6e5c50, 0.9), SX + 2, y, SZ - 22)
  pon(g, geoCaja(0.1, 3, 2), mat(0x2e2418, 1), SX - 4.05, 1.5, SZ - 22)
  // La calzada que sube.
  const calzada = pon(g, geoCaja(3, 0.6, 50), calizaSombra, SX + 20, 0.3, SZ - 36)
  calzada.rotation.y = -0.75

  // --- las pirámides ---
  // Las pirámides son el fondo: no cuentan al encuadrar, o el vuelo miraba a
  // una pared de piedra y la Esfinge se quedaba fuera.
  const fondo = m => { m.userData.sinFoco = true; return m }
  const piramide = (x, z, alto, base, remate = false) => {
    const p = fondo(pon(g, geoTronco(0.02, base / 2, alto), caliza, x, alto / 2, z))
    // Las hiladas de bloques que se ven de cerca.
    for (let y = 1; y < alto - 0.5; y += 1.4) {
      const lado = base * (1 - y / alto)
      fondo(pon(g, geoCaja(lado + 0.1, 0.1, lado + 0.1), calizaSombra, x, y, z))
    }
    if (remate) fondo(pon(g, geoTronco(0.02, base * 0.13, alto * 0.25), mat(0xe8d6ae, 0.8), x, alto * 0.875, z))
    return p
  }
  piramide(SX + 44, SZ - 58, 34, 52, true)
  piramide(SX + 22, SZ - 86, 36, 56)
  piramide(SX + 64, SZ - 30, 16, 24)
  for (let i = 0; i < 3; i++) piramide(SX + 62 + i * 8, SZ - 12, 6, 9)

  // --- camellos, turistas, autocares y la valla ---
  for (let i = 0; i < 8; i++) camello(g, azar(-12, 20), azar(24, 40), azar(0, 3), i % 2 === 0)
  gente(g, 50, { x0: -12, x1: 16, z0: 44, z1: 22 })
  gente(g, 20, { x0: SX - 7, x1: SX + 7, z0: SZ + 22, z1: SZ + 14 })
  for (let i = 0; i < 3; i++) {
    const bus = sub(g, 16 + i * 5, 0, 32, 0)
    pon(bus, geoCaja(2.4, 2.6, 10), mat(0xf2efe6, 0.6), 0, 1.6, 0)
    pon(bus, geoCaja(2.46, 0.9, 9), mat(0x2f3a42, 0.2, 0.5), 0, 2.2, 0)
  }
  for (let z = 44; z > -40; z -= 3) pon(g, geoCil(0.05, 0.05, 1.4, 5), mat(0x555555, 0.5, 0.5), -14, 0.7, z)
  bandera(g, -12, 20, 7, BANDERA_EGIPTO)

  return colocar(g, 1, -62)
}
