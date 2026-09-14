// China: Shanghái, Pekín y Chongqing.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const ROJO_CHINA = 0xde2910
const PIEL = 0xd9b48a

// Tejado chino a cuatro aguas con los aleros levantados en las esquinas: el
// faldón en tronco de pirámide, la cumbrera y las puntas curvadas.
function tejadoChino (g, x, y, z, ancho, fondo, alto, material, cumbrera = material) {
  pon(g, geoTronco(0.35, 1, alto).scale(ancho / 2, 1, fondo / 2), material, x, y + alto / 2, z)
  pon(g, geoCaja(ancho * 0.36, alto * 0.25, 0.3), cumbrera, x, y + alto + alto * 0.12, z)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const punta = pon(g, geoCil(0.02, 0.2, 1.4, 5), material, x + sx * ancho / 2, y + 0.3, z + sz * fondo / 2)
    punta.rotation.set(sz * 0.9, 0, -sx * 0.9)
  }
  for (const sx of [-1, 1]) pon(g, geoCaja(0.4, alto * 0.5, 0.4), cumbrera, x + sx * ancho * 0.18, y + alto * 1.2, z)
}

// Farolillo rojo.
function farolillo (g, x, y, z, k = 1) {
  pon(g, geoBola(0.35 * k, 10, 8), mat(0xd9281e, 0.5), x, y, z).scale.y = 1.2
  pon(g, geoCil(0.2 * k, 0.2 * k, 0.12 * k, 8), mat(0xe2b23e, 0.4, 0.6), x, y + 0.45 * k, z)
  pon(g, geoCil(0.2 * k, 0.2 * k, 0.12 * k, 8), mat(0xe2b23e, 0.4, 0.6), x, y - 0.45 * k, z)
}

// Shanghái, a la derecha: Lujiazui visto desde el Bund. El Huangpu delante con
// los barcos turísticos; en la orilla de Pudong la Perla Oriental —trípode,
// tres columnas, la gran esfera con sus anillos de ventanas, las cuentas del
// medio, la esfera alta y la aguja—, la Shanghai Tower retorcida, la Jin Mao
// escalonada como una pagoda y el World Financial Center con su abertura.
export function perlaOriental () {
  const g = new THREE.Group()
  const rosa = mat(0xc2456e, 0.3, 0.35)
  const hormigon = mat(0xd9d4cc, 0.75)
  const ventanal = mat(0x2a3540, 0.25, 0.5)

  // --- el Bund y el río ---
  explanada(g, { x: -2, z: 0, ancho: 6, fondo: 110, color: 0xd6cdb8, juntas: 0xbfb49e })
  for (let z = 52; z > -54; z -= 8) farola(g, 0.5, z, 5, 0x2a2a2a)
  gente(g, 70, { x0: -4.5, x1: 0.8, z0: 54, z1: -54, piel: PIEL })
  mar(g, { x: 18, z: 0, ancho: 28, fondo: 130, color: 0x5f7f7a })
  for (let i = 0; i < 6; i++) {
    const b = sub(g, azar(8, 28), 0, azar(-50, 50), elige([0, Math.PI]))
    pon(b, geoCaja(3.4, 1.2, 12), mat(0xf2efe6, 0.6), 0, 0.6, 0)
    pon(b, geoCaja(3, 1.4, 8), mat(0xe8e2d4, 0.6), 0, 1.9, -0.5)
    pon(b, geoCaja(3.05, 0.5, 8), mat(0x2a3540, 0.3, 0.5), 0, 2, -0.5)
    pon(b, geoCaja(2.6, 1, 4), mat(0xd9281e, 0.6), 0, 3.1, -1)
  }

  // --- la orilla de Pudong ---
  explanada(g, { x: 52, z: 0, ancho: 40, fondo: 120, color: 0xcfc8ba, juntas: 0xb8b0a0, paso: 5 })
  cesped(g, { x: 42, z: 20, ancho: 16, fondo: 24, color: 0x5f9a45 })
  for (let i = 0; i < 18; i++) arbol(g, azar(34, 48), azar(-50, 50), 'copa', 1)

  // --- la Perla Oriental ---
  const PX = 44
  const PZ = -6
  const A = 1.6
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    barra(g, hormigon, V(PX + Math.cos(a) * 9, 0, PZ + Math.sin(a) * 9), V(PX + Math.cos(a) * 2, 16, PZ + Math.sin(a) * 2), 1.1)
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 3
    pon(g, geoCil(0.9, 0.9, 66, 12), hormigon, PX + Math.cos(a) * 1.9, 33, PZ + Math.sin(a) * 1.9)
  }
  pon(g, geoCil(1, 1, 70, 12), hormigon, PX, 35, PZ)
  // La gran esfera, con sus tres anillos de ventanas.
  pon(g, geoBola(8 * A * 0.8, 28, 20), rosa, PX, 18, PZ)
  for (const dy of [-2.5, 0, 2.5]) {
    const r = Math.sqrt(Math.max(0, (8 * A * 0.8) ** 2 - dy * dy))
    pon(g, new THREE.TorusGeometry(r + 0.05, 0.25, 4, 36), ventanal, PX, 18 + dy, PZ).rotation.x = Math.PI / 2
  }
  // Las cuentas del fuste.
  for (let i = 0; i < 5; i++) pon(g, geoBola(1.8, 14, 10), rosa, PX, 36 + i * 3.6, PZ)
  // La esfera alta con su mirador.
  pon(g, geoBola(5.4, 24, 16), rosa, PX, 60, PZ)
  pon(g, new THREE.TorusGeometry(5.45, 0.25, 4, 32), ventanal, PX, 60, PZ).rotation.x = Math.PI / 2
  pon(g, geoCil(1.2, 1.4, 6, 12), hormigon, PX, 68, PZ)
  pon(g, geoBola(1.9, 14, 10), rosa, PX, 72, PZ)
  pon(g, geoCil(0.1, 0.5, 14, 8), hormigon, PX, 81, PZ)
  // Esferas pequeñas en los pies del trípode.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    pon(g, geoBola(2.2, 14, 10), rosa, PX + Math.cos(a) * 6.5, 4.8, PZ + Math.sin(a) * 6.5)
  }

  // --- la Shanghai Tower: planta triangular redondeada que gira al subir ---
  const SX = 60
  const SZ = -34
  for (let i = 0; i < 26; i++) {
    const r = 5.4 - i * 0.11
    const t = pon(g, geoCil(r, r + 0.12, 3.4, 3), vidrio(0x8fb1c4), SX, 1.7 + i * 3.4, SZ)
    t.rotation.y = i * 0.07
    t.scale.set(1, 1, 1)
    pon(g, new THREE.TorusGeometry(r * 0.72, 0.12, 3, 12), mat(0xd8dde0, 0.4, 0.5), SX, 3.4 + i * 3.4, SZ).rotation.x = Math.PI / 2
  }
  pon(g, geoCil(1, 2.5, 4, 8), vidrio(0x8fb1c4), SX, 90, SZ)

  // --- la Jin Mao: escalonada como una pagoda ---
  const JX = 64
  const JZ = 6
  for (let i = 0; i < 14; i++) {
    const w = 7 - i * 0.28 - (i % 2) * 0.3
    pon(g, geoCaja(w, 5, w), vidrio(0x7f93a0), JX, 2.5 + i * 5, JZ)
    pon(g, geoCaja(w + 0.5, 0.3, w + 0.5), mat(0xc9ced2, 0.4, 0.6), JX, 5 + i * 5, JZ)
  }
  pon(g, geoCil(0.2, 1.8, 8, 8), mat(0xc9ced2, 0.4, 0.6), JX, 76, JZ)

  // --- el World Financial Center, con el hueco arriba ---
  const WX = 72
  const WZ = -16
  pon(g, geoTronco(0.3, 1, 74).scale(6, 1, 4), vidrio(0x6f8fa6), WX, 37, WZ)
  pon(g, geoCaja(0.2, 5, 4), mat(0xcfc8ba, 0.9), WX, 68, WZ)

  // Más torres de Lujiazui.
  const torres = []
  for (let i = 0; i < 10; i++) torres.push([azar(52, 80), azar(-54, 54), azar(6, 9), azar(22, 48), azar(6, 9)])
  for (const [x, z, a, h, f] of torres) {
    if (Math.hypot(x - PX, z - PZ) < 12) continue
    pon(g, geoCaja(a, h, f), vidrio(elige([0x5f7f95, 0x6f8fa6, 0x4f6a7f, 0x7f93a0])), x, h / 2, z)
    for (let y = 3; y < h; y += 4) pon(g, geoCaja(a + 0.1, 0.25, f + 0.1), mat(0xd8dde0, 0.4, 0.5), x, y, z)
  }

  // A escala real los rascacielos obligaban a alejar tanto la cámara que la
  // niebla se los comía. Con avenida el mundo no lo recoloca.
  g.scale.setScalar(0.6)
  g.position.set(16, 0, -60)
  g.userData.lados = [1]
  return g
}

// Pekín, a la izquierda: la puerta de Tiananmén. La muralla roja sobre su
// basamento con los cinco pasos, el retrato sobre el central, la balaustrada
// de mármol, la sala de columnas rojas con el doble tejado de tejas amarillas
// y aleros levantados, los farolillos; delante el foso con los cinco puentes
// de mármol blanco, los dos huabiao y los leones, las banderas rojas y la
// gente; detrás, los tejados dorados de la Ciudad Prohibida.
export function ciudadProhibida () {
  const g = new THREE.Group()
  const rojo = mat(0xa3312a, 0.85)
  const rojoOscuro = mat(0x7d2620, 0.9)
  const teja = mat(0xd6a13a, 0.45, 0.3)
  const tejaOscura = mat(0xa87a2a, 0.5, 0.3)
  const marmol = mat(0xefebe2, 0.7)
  const hueco = mat(0x2a1d18, 1)

  // --- la plaza delante ---
  explanada(g, { x: -6, z: 0, ancho: 14, fondo: 100, color: 0xdcd6ca, juntas: 0xc4bcae, paso: 2.5 })
  gente(g, 100, { x0: -13, x1: 0, z0: 48, z1: -48, piel: PIEL })
  for (let z = 44; z > -48; z -= 10) {
    pon(g, geoCil(0.12, 0.15, 7, 8), mat(0xe8e2d4, 0.5), -12, 3.5, z)
    for (const dy of [5.5, 6.4]) for (const dz of [-0.6, 0.6]) pon(g, geoBola(0.3, 8, 6), mat(0xfff1d8, 0.4), -12, dy, z + dz)
  }
  for (let z = -40; z <= 40; z += 10) bandera(g, -3, z, 6, [ROJO_CHINA, ROJO_CHINA])

  // --- el foso y los puentes ---
  const FX = 3
  pon(g, geoCaja(4, 0.4, 90), mat(0x4f7f80, 0.1, 0.2), FX, 0.1, 0)
  for (const x of [FX - 2.2, FX + 2.2]) {
    pon(g, geoCaja(0.4, 0.8, 90), marmol, x, 0.4, 0)
    for (let z = -44; z <= 44; z += 1.5) pon(g, geoCaja(0.2, 1, 0.2), marmol, x, 1, z)
  }
  for (const dz of [-10, -5, 0, 5, 10]) {
    const puente = pon(g, geoCaja(6, 0.6, dz === 0 ? 3.4 : 2.4), marmol, FX, 0.9, dz)
    puente.scale.y = 1.2
    for (const s of [-1, 1]) {
      for (let x = -2.6; x <= 2.6; x += 0.65) pon(g, geoCaja(0.18, 0.7, 0.18), marmol, FX + x, 1.6, dz + s * (dz === 0 ? 1.6 : 1.1))
    }
  }
  // Los huabiao: columnas de mármol con la nube y el animal arriba.
  for (const dz of [-15, 15]) {
    pon(g, geoCaja(1.6, 0.8, 1.6), marmol, FX - 5, 0.4, dz)
    pon(g, geoCil(0.35, 0.4, 9, 8), marmol, FX - 5, 5, dz)
    pon(g, geoCaja(1.6, 0.35, 0.3), marmol, FX - 5, 8.2, dz)
    pon(g, geoCil(0.7, 0.5, 0.4, 8), marmol, FX - 5, 9.6, dz)
    pon(g, geoBola(0.3, 8, 6), marmol, FX - 5, 10.1, dz)
    // Leones de piedra.
    pon(g, geoCaja(1, 0.8, 1.2), marmol, FX - 1, 0.4, dz * 0.55)
    pon(g, geoCaja(0.7, 1.3, 0.8), mat(0x8a8f8a, 0.7), FX - 1, 1.45, dz * 0.55)
  }

  // --- la puerta ---
  const TX = 14
  const W = 62
  const D = 12
  // Basamento rojo inclinado con los cinco pasos.
  pon(g, geoTronco(0.94, 1, 11).scale(D / 2, 1, W / 2), rojo, TX, 5.5, 0)
  pon(g, geoCaja(D + 1.8, 0.8, W + 1.8), marmol, TX, 0.4, 0)
  for (const [dz, alto, ancho] of [[0, 6, 3.4], [-8, 4.6, 2.4], [8, 4.6, 2.4], [-16, 3.8, 2], [16, 3.8, 2]]) {
    arcada(g, hueco, { ancho, alto, n: 1, x: TX - D / 2 - 0.2, y: 0.8, z: dz, giro: -Math.PI / 2, hueco: 0.95 })
  }
  // El retrato sobre el paso central, con los carteles a los lados.
  pon(g, geoCaja(0.2, 3.4, 2.6), mat(0x4a4a44, 0.8), TX - D / 2 - 0.35, 8.2, 0)
  pon(g, geoCaja(0.22, 2.6, 2), mat(0xc9b08a, 0.8), TX - D / 2 - 0.4, 8.2, 0)
  for (const dz of [-10, 10]) pon(g, geoCaja(0.2, 1.6, 7), mat(0xe8e2d4, 0.8), TX - D / 2 - 0.35, 8, dz)
  // Balaustrada de mármol blanco sobre el basamento.
  pon(g, geoCaja(D + 0.4, 0.4, W + 0.4), marmol, TX, 11.2, 0)
  for (let z = -W / 2; z <= W / 2; z += 1.1) pon(g, geoCaja(0.2, 1, 0.2), marmol, TX - D / 2 - 0.1, 11.9, z)
  pon(g, geoCaja(0.25, 0.25, W + 0.4), marmol, TX - D / 2 - 0.1, 12.5, 0)
  // La sala: columnas rojas, muros, ventanas y el doble tejado.
  const SY = 11.4
  pon(g, geoCaja(D - 3, 7, W - 10), rojoOscuro, TX, SY + 3.5, 0)
  for (let z = -(W - 10) / 2; z <= (W - 10) / 2 + 0.1; z += 4.2) pon(g, geoCil(0.45, 0.45, 7, 10), rojo, TX - (D - 3) / 2 - 0.9, SY + 3.5, z)
  ventanas(g, mat(0xd6a13a, 0.6, 0.2), { ancho: W - 14, alto: 4, filas: 1, columnas: 12, x: TX - (D - 3) / 2 - 0.05, y: SY + 1.5, z: 0, giro: -Math.PI / 2, w: 2.2, h: 3.2 })
  pon(g, geoCaja(D - 0.6, 1, W - 6), mat(0x2f6b5a, 0.7), TX, SY + 7.4, 0)
  tejadoChino(g, TX, SY + 7.9, 0, D + 3, W - 2, 2.6, teja, tejaOscura)
  pon(g, geoCaja(D - 3.5, 2.6, W - 16), rojoOscuro, TX, SY + 11.6, 0)
  tejadoChino(g, TX, SY + 12.9, 0, D + 1, W - 10, 3.2, teja, tejaOscura)
  for (let z = -24; z <= 24; z += 8) farolillo(g, TX - D / 2 - 0.4, SY + 6.2, z, 1.4)

  // --- la Ciudad Prohibida detrás ---
  for (const [x, z, a, f] of [[36, 0, 14, 40], [58, 0, 14, 44], [46, -36, 10, 16], [46, 36, 10, 16]]) {
    pon(g, geoCaja(a, 2, f), marmol, x, 1, z)
    pon(g, geoCaja(a - 3, 6, f - 4), rojoOscuro, x, 5, z)
    tejadoChino(g, x, 8, z, a + 2, f, 3, teja, tejaOscura)
  }
  explanada(g, { x: 47, z: 0, ancho: 38, fondo: 100, color: 0xcfc6b4, juntas: 0xb9ae98, paso: 4 })
  for (const x of [26, 68]) pon(g, geoCaja(2, 9, 100), rojo, x, 4.5, 0)

  // A escala real la puerta llenaba la pantalla entera en el vuelo.
  g.scale.setScalar(0.62)
  return colocar(g, -1, -62)
}

// Chongqing, a la izquierda: Hongyadong. El edificio de pilotes de once pisos
// pegado al acantilado junto al Jialing: plantas escalonadas de madera oscura
// con barandillas rojas, ventanas encendidas y aleros curvos de teja gris,
// farolillos rojos por todas partes, los pilares de abajo sobre la orilla, y
// arriba del acantilado los rascacielos del centro. En el río, un barco
// turístico y el puente.
export function hongyadong () {
  const g = new THREE.Group()
  const madera = mat(0x5a3a26, 0.9)
  const maderaOscura = mat(0x3f2a1c, 0.9)
  const teja = mat(0x3a3836, 0.8)
  const rojo = mat(0x9a2a22, 0.8)
  const luz = mat(0xffcf7a, 0.5)
  const roca = mat(0x6f6a5e, 1)

  // --- el río y la orilla ---
  mar(g, { x: -14, z: 0, ancho: 16, fondo: 120, color: 0x6a7f6a })
  explanada(g, { x: -3, z: 0, ancho: 6, fondo: 110, color: 0xbdb3a2, juntas: null })
  gente(g, 50, { x0: -5.5, x1: -0.5, z0: 52, z1: -52, piel: PIEL })
  const barco = sub(g, -14, 0, 18)
  pon(barco, geoCaja(4, 1.4, 16), mat(0xf2efe6, 0.6), 0, 0.7, 0)
  for (let p = 0; p < 3; p++) {
    pon(barco, geoCaja(3.4, 1.2, 12 - p * 2.5), mat(0xe8e2d4, 0.6), 0, 2 + p * 1.3, -p * 0.5)
    for (let z = -5 + p; z < 5 - p; z += 1.2) farolillo(barco, 1.8, 2.4 + p * 1.3, z, 0.4)
  }

  // --- el acantilado ---
  pon(g, geoCaja(22, 34, 110), roca, 22, 17, 0)
  for (let i = 0; i < 30; i++) pon(g, new THREE.DodecahedronGeometry(azar(1, 2.4), 0), mat(0x5f5a50, 1), 10.5 + azar(0, 1), azar(2, 32), azar(-54, 54))

  // --- Hongyadong: once plantas escalonadas ---
  const LARGO = 64
  for (let piso = 0; piso < 11; piso++) {
    const y = piso * 3
    const x = 3 + piso * 0.7
    const ancho = 7.5 - piso * 0.25
    const cx = x + ancho / 2
    pon(g, geoCaja(ancho, 2.8, LARGO - piso * 1.2), madera, cx, y + 1.4, 0)
    // Pilares de la planta baja.
    if (piso === 0) for (let z = -30; z <= 30; z += 3) pon(g, geoCaja(0.5, 3, 0.5), maderaOscura, x - 0.3, 1.5, z)
    // Ventanas encendidas y barandilla roja del balcón.
    for (let z = -(LARGO - piso * 1.2) / 2 + 1; z < (LARGO - piso * 1.2) / 2 - 0.5; z += 1.6) {
      pon(g, geoCaja(0.08, 1.4, 1), luz, x - 0.05, y + 1.4, z)
    }
    pon(g, geoCaja(0.12, 0.6, LARGO - piso * 1.2), rojo, x - 0.6, y + 0.4, 0)
    pon(g, geoCaja(0.9, 0.12, LARGO - piso * 1.2), maderaOscura, x - 0.4, y + 0.05, 0)
    // El alero de teja gris, cada dos plantas con las puntas levantadas.
    if (piso % 2 === 1) tejadoChino(g, cx, y + 2.7, 0, ancho + 2.6, LARGO - piso * 1.2 + 1.2, 1.2, teja)
    else pon(g, geoTronco(0.6, 1, 0.6).scale((ancho + 2) / 2, 1, (LARGO - piso * 1.2 + 1) / 2), teja, cx, y + 3, 0)
    // Farolillos colgando del alero.
    for (let z = -(LARGO - piso * 1.2) / 2 + 2; z < (LARGO - piso * 1.2) / 2 - 1; z += 3.2) farolillo(g, x - 0.9, y + 2.3, z, 0.7)
  }
  // Pabellones de remate en lo alto, con tejado de pagoda.
  for (const z of [-20, 0, 20]) {
    pon(g, geoCaja(5, 3, 7), madera, 13, 34.5, z)
    tejadoChino(g, 13, 36, z, 7.5, 9.5, 1.8, teja)
    tejadoChino(g, 13, 38.6, z, 5, 6.5, 1.6, teja)
    farolillo(g, 10.3, 35.3, z, 1)
  }

  // --- los rascacielos de arriba ---
  const torres = []
  for (let i = 0; i < 9; i++) torres.push([azar(24, 34), azar(-52, 52), azar(6, 9), azar(20, 42), azar(6, 9)])
  for (const [x, z, a, h, f] of torres) {
    pon(g, geoCaja(a, h, f), vidrio(elige([0x5f7f95, 0x6f8fa6, 0x4f6a7f])), x, 34 + h / 2, z)
    for (let y = 36; y < 34 + h; y += 3) pon(g, geoCaja(a + 0.1, 0.3, f + 0.1), luz, x, y, z)
  }

  // --- el puente de Qiansimen, al fondo del río ---
  const acero = mat(0x9aa0a6, 0.4, 0.6)
  pon(g, geoCaja(24, 1.4, 5), acero, -8, 18, -48)
  for (const x of [-16, 0]) pon(g, geoCaja(2, 18, 3), mat(0xb8b4ac, 0.8), x, 9, -48)

  g.scale.setScalar(0.65)
  return colocar(g, -1, -62)
}
