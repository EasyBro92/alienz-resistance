// Rusia: Vladivostok, Novosibirsk y Moscú.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const BANDERA_RUSIA = [0xffffff, 0x1c3f94, 0xd52b1e]
const NIEVE = 0xf2f5f7

// Bloque soviético de paneles, con la nieve en la azotea.
function jrushchovka (g, x, z, ancho, alto, fondo, color) {
  pon(g, geoCaja(ancho, alto, fondo), mat(color, 0.9), x, alto / 2, z)
  pon(g, geoCaja(ancho + 0.2, 0.3, fondo + 0.2), mat(NIEVE, 0.9), x, alto + 0.15, z)
  ventanas(g, mat(0x3b4955, 0.3, 0.4), { ancho: fondo - 1, alto: alto - 1.5, filas: Math.floor(alto / 2.8), columnas: Math.floor(fondo / 2), x: x - ancho / 2 - 0.05, y: 1, z, giro: -Math.PI / 2, w: 0.9, h: 1.1 })
}

// Cebolla rusa: bulbo apuntado sobre su tambor, con la cruz dorada.
function cebolla (g, x, y, z, r, material, { tambor = 0xf1ece2, alto = 2 } = {}) {
  pon(g, geoCil(r * 0.7, r * 0.7, alto, 14), mat(tambor, 0.8), x, y + alto / 2, z)
  const perfil = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    const rr = t < 0.55 ? r * Math.sin((t / 0.55) * Math.PI * 0.62) * 1.05 : r * 1.02 * (1 - (t - 0.55) / 0.45) ** 1.6
    perfil.push(new THREE.Vector2(Math.max(0.01, rr), t * r * 2.4))
  }
  pon(g, new THREE.LatheGeometry(perfil, 16), material, x, y + alto, z)
  pon(g, geoCil(0.04, 0.06, r * 0.9, 6), mat(0xe2b23e, 0.3, 0.75), x, y + alto + r * 2.8, z)
  pon(g, geoCaja(r * 0.5, 0.06, 0.06), mat(0xe2b23e, 0.3, 0.75), x, y + alto + r * 3, z)
}

// Moscú, a la izquierda: la Plaza Roja. La catedral de San Basilio —la torre
// central con su chapitel en tienda, las ocho capillas con cebollas de colores
// a rayas, espirales y rombos, el campanario, las galerías de arcos y el
// ladrillo rojo con las molduras blancas—; el monumento a Minin y Pozharski;
// la muralla del Kremlin con sus almenas de cola de golondrina y la torre
// Spásskaya con el reloj y la estrella roja; el GUM enfrente; adoquines y gente.
export function sanBasilio () {
  const g = new THREE.Group()
  const ladrillo = mat(0xa8432f, 0.9)
  const ladrilloOscuro = mat(0x8a3424, 0.9)
  const blanco = mat(0xf1ece2, 0.8)
  const oro = mat(0xe2b23e, 0.3, 0.75)
  const hueco = mat(0x2e2622, 1)
  const verde = mat(0x2f7a4a, 0.6)

  // --- la plaza ---
  explanada(g, { x: 0, z: 0, ancho: 30, fondo: 110, color: 0x8e8784, juntas: 0x77706c, paso: 1.4 })
  gente(g, 110, { x0: -13, x1: 13, z0: 54, z1: -54 })

  // --- San Basilio ---
  const CX = 4
  const CZ = -34
  pon(g, geoCaja(20, 3.5, 20), ladrillo, CX, 1.75, CZ)
  arcada(g, hueco, { ancho: 18, alto: 2.2, n: 8, x: CX - 10.05, y: 0.4, z: CZ, giro: -Math.PI / 2 })
  arcada(g, hueco, { ancho: 18, alto: 2.2, n: 8, x: CX, y: 0.4, z: CZ + 10.05 })
  pon(g, geoCaja(20.4, 0.4, 20.4), blanco, CX, 3.7, CZ)
  // La torre central y su tienda.
  pon(g, geoCil(3, 3.3, 9, 8), ladrillo, CX, 8.4, CZ)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, new THREE.TorusGeometry(0.7, 0.14, 4, 10, Math.PI), blanco, CX + Math.cos(a) * 3.05, 12.2, CZ + Math.sin(a) * 3.05).rotation.y = Math.PI / 2 - a
    pon(g, geoCaja(0.4, 1.6, 0.1), hueco, CX + Math.cos(a) * 3.1, 7, CZ + Math.sin(a) * 3.1).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(3.4, 3.4, 0.5, 8), blanco, CX, 13, CZ)
  pon(g, geoCil(0.4, 3, 9, 8), ladrillo, CX, 17.7, CZ)
  for (let y = 14.5; y < 21; y += 1.5) {
    const r = 3 - (y - 13.2) * 0.29
    pon(g, geoCil(r + 0.08, r + 0.08, 0.2, 8), blanco, CX, y, CZ)
  }
  cebolla(g, CX, 22, CZ, 0.9, oro, { alto: 1 })

  // Las ocho capillas con sus cebollas, cada una de su color y dibujo.
  const colores = [
    [0x2f7a4a, 0xd9b12f], [0xd9b12f, 0x2f7a4a], [0x2d5fa8, 0xf1ece2], [0xc8483a, 0x2f7a4a],
    [0x2f7a4a, 0xc8483a], [0xd9b12f, 0xc8483a], [0x2d5fa8, 0xd9b12f], [0xc8483a, 0xf1ece2]
  ]
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    const grande = k % 2 === 0
    const r = grande ? 6.6 : 5.6
    const x = CX + Math.cos(a) * r
    const z = CZ + Math.sin(a) * r
    const alto = grande ? 8 : 6
    pon(g, geoCil(grande ? 1.7 : 1.3, grande ? 1.9 : 1.4, alto, 8), grande ? ladrillo : ladrilloOscuro, x, 3.5 + alto / 2, z)
    pon(g, geoCil(grande ? 1.9 : 1.5, grande ? 1.9 : 1.5, 0.35, 8), blanco, x, 3.5 + alto, z)
    for (let j = 0; j < 4; j++) {
      const b = (j / 4) * Math.PI * 2
      pon(g, new THREE.TorusGeometry(0.4, 0.1, 4, 10, Math.PI), blanco, x + Math.cos(b) * (grande ? 1.72 : 1.32), 3.5 + alto - 0.8, z + Math.sin(b) * (grande ? 1.72 : 1.32)).rotation.y = Math.PI / 2 - b
    }
    const [c1, c2] = colores[k]
    const rc = grande ? 1.7 : 1.3
    cebolla(g, x, 3.5 + alto, z, rc, mat(c1, 0.5), { tambor: 0xf1ece2, alto: 0.8 })
    // El dibujo: franjas en espiral o rombos.
    for (let j = 0; j < 7; j++) {
      const t = j / 7
      const yy = 3.5 + alto + 0.8 + t * rc * 1.6 + 0.2
      const rr = rc * Math.sin(((t * 1.6) / 2.4 / 0.55) * Math.PI * 0.62) * 1.06
      const aro = pon(g, new THREE.TorusGeometry(Math.max(0.2, rr), 0.12, 4, 16), mat(c2, 0.5), x, yy, z)
      aro.rotation.set(Math.PI / 2 + (k % 3 === 0 ? 0.35 : 0), 0, j * 0.5)
    }
  }
  // El campanario con su tienda verde.
  const BX = CX + 11
  const BZ = CZ + 8
  pon(g, geoCaja(3.4, 8, 3.4), ladrillo, BX, 4, BZ)
  pon(g, geoCil(1.6, 1.6, 3, 8), blanco, BX, 9.5, BZ)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoCaja(0.5, 2, 0.1), hueco, BX + Math.cos(a) * 1.62, 9.5, BZ + Math.sin(a) * 1.62).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(0.3, 1.8, 4, 8), verde, BX, 13, BZ)
  cebolla(g, BX, 15, BZ, 0.5, oro, { alto: 0.4 })

  // Minin y Pozharski delante.
  pon(g, geoCaja(3, 3.5, 2.2), mat(0x8a8176, 0.7), CX - 12, 1.75, CZ + 2)
  const bronce = mat(0x3f4a42, 0.5, 0.5)
  pon(g, geoCil(0.35, 0.5, 2.4, 8), bronce, CX - 12.5, 4.7, CZ + 1.5)
  pon(g, geoCaja(1.2, 1, 0.8), bronce, CX - 11.5, 4, CZ + 2.5)
  pon(g, geoBola(0.3, 8, 6), bronce, CX - 12.5, 6.1, CZ + 1.5)

  // --- la muralla del Kremlin y la torre Spásskaya ---
  const MX = 22
  pon(g, geoCaja(3, 10, 110), ladrillo, MX, 5, 0)
  for (let z = -54; z <= 54; z += 1.6) {
    const m = pon(g, geoCaja(0.7, 1.2, 0.9), ladrillo, MX - 1.1, 10.6, z)
    pon(g, geoCaja(0.72, 0.5, 0.3), ladrillo, MX - 1.1, 11.4, z - 0.3)
    pon(g, geoCaja(0.72, 0.5, 0.3), ladrillo, MX - 1.1, 11.4, z + 0.3)
    void m
  }
  // Nieve en el paseo de ronda.
  pon(g, geoCaja(2.8, 0.2, 110), mat(NIEVE, 0.9), MX + 0.2, 10.1, 0)
  const SZ = -8
  pon(g, geoCaja(8, 18, 8), ladrillo, MX, 9, SZ)
  arcada(g, hueco, { ancho: 3, alto: 5, n: 1, x: MX - 4.05, y: 0, z: SZ, giro: -Math.PI / 2, hueco: 0.9 })
  pon(g, geoCaja(6.4, 5, 6.4), ladrillo, MX, 20.5, SZ)
  // El reloj.
  pon(g, geoCil(2, 2, 0.15, 24), mat(0x1c2d4a, 0.5), MX - 3.3, 20.6, SZ).rotation.z = Math.PI / 2
  pon(g, new THREE.TorusGeometry(2, 0.18, 4, 24), oro, MX - 3.35, 20.6, SZ).rotation.y = Math.PI / 2
  barra(g, oro, V(MX - 3.45, 20.6, SZ), V(MX - 3.45, 21.9, SZ), 0.12)
  barra(g, oro, V(MX - 3.45, 20.6, SZ), V(MX - 3.45, 20.6, SZ + 0.9), 0.12)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    pon(g, geoCil(0.2, 0.3, 2.5, 8), blanco, MX + Math.cos(a) * 3.1, 24.3, SZ + Math.sin(a) * 3.1)
  }
  pon(g, geoCil(2.4, 3, 3, 8), ladrillo, MX, 24.5, SZ)
  pon(g, geoCil(1.4, 2, 3, 8), blanco, MX, 27.5, SZ)
  pon(g, geoCil(0.2, 1.5, 7, 8), verde, MX, 32.5, SZ)
  // La estrella roja.
  const estrella = new THREE.Shape()
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2
    const r = k % 2 ? 0.55 : 1.4
    if (k === 0) estrella.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else estrella.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const e = pon(g, new THREE.ExtrudeGeometry(estrella, { depth: 0.3, bevelEnabled: false }), mat(0xd9281e, 0.3, 0.3), MX, 37, SZ)
  e.rotation.y = Math.PI / 2

  // --- el GUM, enfrente, del lado de la carretera al fondo ---
  const GZ = 40
  pon(g, geoCaja(14, 10, 18), mat(0xd9cfc0, 0.85), 4, 5, GZ)
  arcada(g, hueco, { ancho: 16, alto: 3.5, n: 7, x: 4, y: 0.4, z: GZ - 9.05, giro: Math.PI })
  ventanas(g, hueco, { ancho: 16, alto: 4, filas: 2, columnas: 8, x: 4, y: 4.6, z: GZ - 9.05, giro: Math.PI, w: 0.9, h: 1.3 })
  for (const dx of [-6, 0, 6]) {
    pon(g, geoTronco(0.1, 1, 3).scale(1.6, 1, 1.6), mat(0x6a7a6a, 0.6), 4 + dx, 11.5, GZ - 8)
  }
  bandera(g, 4, GZ - 8, 4, BANDERA_RUSIA, 13)
  for (let z = 50; z > -54; z -= 12) farola(g, -13, z, 5, 0x2a2a2a)

  return colocar(g, -1, -62)
}

// Novosibirsk, a la derecha: el Teatro de Ópera y Ballet. La gran cúpula
// plateada —más grande que la del Bolshói— sobre su tambor, el cuerpo
// constructivista con el pórtico de columnas y las esculturas del ático, las
// alas laterales y la torre de la caja escénica; delante la plaza con Lenin
// y sus figuras, los abetos nevados, las farolas y la gente abrigada; y
// alrededor los bloques soviéticos.
export function operaNovosibirsk () {
  const g = new THREE.Group()
  const fachada = mat(0xd9ccb4, 0.85)
  const fachadaSombra = mat(0xbfb29a, 0.9)
  const blanco = mat(0xf2efe8, 0.8)
  const plata = mat(0xc9d2d8, 0.25, 0.75)
  const hueco = mat(0x3a3a3a, 1)
  const nieve = mat(NIEVE, 0.9)

  // --- la plaza con Lenin ---
  explanada(g, { x: -4, z: 0, ancho: 18, fondo: 90, color: 0xdfe3e6, juntas: 0xc9cfd4, paso: 3 })
  pon(g, geoCaja(4, 3, 4), mat(0x6f6a66, 0.7), -6, 1.5, 12)
  const bronce = mat(0x3f4a42, 0.5, 0.5)
  pon(g, geoCil(0.5, 0.8, 4, 10), bronce, -6, 5, 12)
  pon(g, geoBola(0.45, 10, 8), bronce, -6, 7.4, 12)
  barra(g, bronce, V(-6, 6.3, 12), V(-7.3, 7.2, 12.4), 0.25)
  for (const [dx, dz] of [[-2.5, 3], [2.5, 3], [-2.5, -3], [2.5, -3]]) {
    pon(g, geoCaja(1.2, 1, 1.2), mat(0x6f6a66, 0.7), -6 + dx, 0.5, 12 + dz)
    pon(g, geoCil(0.3, 0.45, 2.2, 8), bronce, -6 + dx, 2.1, 12 + dz)
  }
  for (let i = 0; i < 14; i++) arbol(g, azar(-13, -9), azar(-42, 42), 'nevado', 1)
  for (let z = 40; z > -42; z -= 10) farola(g, 3.4, z, 5, 0x2a2a2a)
  gente(g, 60, { x0: -12, x1: 3, z0: 42, z1: -42, piel: 0xe0c0a0 })

  // --- el teatro ---
  const TX = 22
  const TZ = -2
  // El cuerpo principal y las alas.
  pon(g, geoCaja(30, 12, 42), fachada, TX, 6, TZ)
  pon(g, geoCaja(30.6, 0.8, 42.6), fachadaSombra, TX, 12.4, TZ)
  pon(g, geoCaja(30.6, 0.3, 42.6), nieve, TX, 12.95, TZ)
  for (const s of [-1, 1]) {
    ventanas(g, hueco, { ancho: 26, alto: 9, filas: 3, columnas: 9, x: TX, y: 1.5, z: TZ + s * 21.05, giro: s > 0 ? 0 : Math.PI, w: 1.2, h: 1.8 })
  }
  // El pórtico hacia la plaza: columnas pareadas, el entablamento y las
  // esculturas del ático.
  pon(g, geoCaja(4, 14, 22), fachada, TX - 17, 7, TZ)
  columnata(g, blanco, { n: 8, largo: 18, alto: 10, r: 0.5, x: TX - 19.6, y: 0.8, z: TZ, enZ: true })
  pon(g, geoCaja(2, 1.6, 21), blanco, TX - 19.6, 11.8, TZ)
  pon(g, geoCaja(6, 3, 22.4), fachadaSombra, TX - 17.5, 14.5, TZ)
  for (let i = 0; i < 7; i++) {
    const z = TZ - 9 + i * 3
    pon(g, geoCaja(0.8, 0.6, 0.8), fachadaSombra, TX - 20.4, 16.3, z)
    pon(g, geoCil(0.25, 0.4, 1.8, 8), bronce, TX - 20.4, 17.5, z)
    pon(g, geoBola(0.22, 6, 4), bronce, TX - 20.4, 18.6, z)
  }
  for (let s = 0; s < 4; s++) pon(g, geoCaja(3.4 - s * 0.6, 0.3, 24), fachadaSombra, TX - 22 + s * 0.6, 0.15 + s * 0.3, TZ)
  arcada(g, hueco, { ancho: 16, alto: 5, n: 5, x: TX - 19.05, y: 0.8, z: TZ, giro: -Math.PI / 2, hueco: 0.7 })

  // --- la cúpula plateada ---
  pon(g, geoCil(12, 12.5, 4, 36), fachada, TX + 2, 15, TZ)
  ventanas(g, hueco, { ancho: 0.01, alto: 2, filas: 1, columnas: 1, x: TX, y: 14, z: TZ })
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    pon(g, geoCaja(1.2, 2.2, 0.1), hueco, TX + 2 + Math.cos(a) * 12.05, 15, TZ + Math.sin(a) * 12.05).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(12.6, 12.6, 0.6, 36), fachadaSombra, TX + 2, 17.3, TZ)
  const cupula = pon(g, geoCupula(12.2, 40, 20), plata, TX + 2, 17.6, TZ)
  cupula.scale.y = 0.62
  for (let k = 0; k < 24; k++) {
    const n = pon(g, new THREE.TorusGeometry(12.22, 0.09, 4, 24, Math.PI), mat(0x9aa3aa, 0.3, 0.7), TX + 2, 17.6, TZ)
    n.rotation.y = (k / 24) * Math.PI
    n.scale.y = 0.62
  }
  for (const r of [9, 5]) pon(g, new THREE.TorusGeometry(r, 0.12, 4, 32), mat(0x9aa3aa, 0.3, 0.7), TX + 2, 17.6 + Math.sqrt(12.2 * 12.2 - r * r) * 0.62, TZ).rotation.x = Math.PI / 2
  pon(g, geoCil(1.6, 2, 1.6, 16), plata, TX + 2, 25.9, TZ)
  // La caja escénica detrás.
  pon(g, geoCaja(12, 20, 26), fachadaSombra, TX + 20, 10, TZ)
  pon(g, geoCaja(12.2, 0.3, 26.2), nieve, TX + 20, 20.15, TZ)
  bandera(g, TX + 20, TZ, 5, BANDERA_RUSIA, 20.3)

  // --- los bloques soviéticos alrededor ---
  const tonos = [0xcfc6b8, 0xb8b0a4, 0xd9d2c4, 0xa9a39a]
  for (let i = 0; i < 6; i++) jrushchovka(g, 52 + (i % 2) * 14, -40 + i * 16, 9, azar(14, 22), 14, elige(tonos))
  for (let i = 0; i < 16; i++) arbol(g, azar(36, 46), azar(-42, 42), 'nevado', 1.1)
  explanada(g, { x: 22, z: 0, ancho: 50, fondo: 90, color: 0xe8ecef, juntas: null, y: -0.02 })

  return colocar(g, 1, -62)
}

// Vladivostok, a la derecha: el puente del Cuerno de Oro. Los dos pilonos en
// V de hormigón blanco, los abanicos de tirantes a los dos lados del tablero,
// los viaductos de acceso sobre la ladera, la bahía helada en la orilla con
// los barcos de la flota del Pacífico amarrados, y la ciudad subiendo por las
// colinas nevadas con sus bloques y la iglesia de cúpulas doradas.
export function puenteZolotoi () {
  const g = new THREE.Group()
  const hormigon = mat(0xe8e6e0, 0.75)
  const hormigonOscuro = mat(0xc9c6be, 0.8)
  const cable = mat(0xf5f5f2, 0.4, 0.4)
  const nieve = mat(NIEVE, 0.9)

  // --- la bahía ---
  mar(g, { x: 26, z: 0, ancho: 56, fondo: 130, color: 0x3f6f86 })
  // Placas de hielo en la orilla.
  for (let i = 0; i < 20; i++) pon(g, geoCil(azar(1, 3), azar(1, 3), 0.2, 7), mat(0xe6eef2, 0.6), azar(0, 10), 0.2, azar(-60, 60))
  explanada(g, { x: -4, z: 0, ancho: 8, fondo: 130, color: 0xdfe3e6, juntas: null })
  gente(g, 30, { x0: -7, x1: -1, z0: 60, z1: -60, piel: 0xe0c0a0 })

  // --- barcos de la flota ---
  for (let i = 0; i < 3; i++) {
    const b = sub(g, 14 + i * 12, 0, -30 + i * 10, Math.PI / 2 * (i % 2 ? 1 : -1))
    const gris = mat(0x7d858c, 0.6, 0.3)
    pon(b, geoCaja(4, 2, 22), gris, 0, 1, 0)
    pon(b, geoTronco(0.05, 2, 4).rotateX(Math.PI / 2), gris, 0, 1, 12.5)
    pon(b, geoCaja(3, 3, 6), gris, 0, 3.5, -2)
    pon(b, geoCaja(2, 2, 3), gris, 0, 6, -2.5)
    pon(b, geoCil(0.1, 0.15, 5, 6), gris, 0, 9, -3)
    pon(b, geoCil(0.4, 0.4, 3, 8), gris, 0, 2.8, 6).rotation.x = Math.PI / 2
    bandera(b, 0, -10, 3, [0xffffff, 0x1c5fa8], 2)
  }

  // --- el puente ---
  const Y = 16
  const DX = 10
  pon(g, geoCaja(10, 1.4, 140), mat(0x8a8680, 0.9), DX, Y, 0)
  for (const s of [-1, 1]) pon(g, geoCaja(0.4, 1, 140), mat(0xd8d4cc, 0.8), DX + s * 4.8, Y + 1.2, 0)
  for (let i = 0; i < 10; i++) {
    const c = sub(g, DX + elige([-2, 2]), Y + 0.7, azar(-66, 66))
    coche(c, 0, 0, 0)
  }
  for (let z = -64; z <= 64; z += 12) {
    for (const s of [-1, 1]) {
      pon(g, geoCil(0.06, 0.08, 4, 6), mat(0x9aa0a6, 0.4, 0.6), DX + s * 4.6, Y + 2.7, z)
      pon(g, geoCaja(0.8, 0.14, 0.25), mat(0xfff1c2, 0.4), DX + s * 4.2, Y + 4.7, z)
    }
  }
  // Pilas de los viaductos.
  for (const z of [-62, -48, 48, 62]) pon(g, geoCaja(3, Y, 3), hormigonOscuro, DX, Y / 2, z)
  // Los pilonos en V.
  for (const PZ of [-24, 24]) {
    const alto = 56
    pon(g, geoCaja(8, 3, 6), hormigon, DX, 1.5, PZ)
    for (const s of [-1, 1]) barra(g, hormigon, V(DX, 2, PZ), V(DX + s * 10, alto, PZ), 1.8)
    pon(g, geoCaja(12, 1.2, 1.6), hormigon, DX, Y - 1, PZ)
    // Tirantes: de cada brazo al borde del tablero, hacia delante y atrás.
    for (const s of [-1, 1]) {
      for (let k = 1; k <= 10; k++) {
        const y = alto - k * 2.8
        const xb = DX + s * (10 * (y - 2) / (alto - 2))
        for (const dir of [-1, 1]) {
          const zf = PZ + dir * (4 + k * 3.6)
          if (Math.abs(zf) > 70) continue
          barra(g, cable, V(xb, y, PZ), V(DX + s * 4.6, Y + 0.8, zf), 0.1)
        }
      }
    }
  }

  // --- la ciudad en las colinas nevadas ---
  // Es el fondo: no cuenta al encuadrar, o el vuelo miraba la colina y el
  // puente se quedaba fuera.
  const antesDeLaCiudad = g.children.length
  pon(g, geoCil(16, 40, 18, 12), mat(0xe8ecef, 1), 70, 9, 0).scale.z = 1.8
  const tonos = [0xcfc6b8, 0xb8b0a4, 0xd9d2c4, 0xe0d0b8]
  for (let i = 0; i < 10; i++) {
    const a = azar(-0.8, 0.8)
    const r = azar(20, 34)
    const s = sub(g, 70 - Math.cos(a) * r, 18 * (40 - r) / 24 - 1, Math.sin(a) * r * 1.8)
    jrushchovka(s, 0, 0, 8, azar(10, 18), 14, elige(tonos))
  }
  for (let i = 0; i < 20; i++) {
    const a = azar(-1.2, 1.2)
    const r = azar(18, 38)
    arbol(sub(g, 70 - Math.cos(a) * r, Math.max(0, 18 * (40 - r) / 24 - 0.5), Math.sin(a) * r * 1.8), 0, 0, 'nevado', 1)
  }
  // La iglesia de cúpulas doradas en lo alto.
  const iglesia = sub(g, 66, 17, 10)
  pon(iglesia, geoCaja(6, 6, 8), mat(0xf2efe8, 0.8), 0, 3, 0)
  cebolla(iglesia, 0, 6, 0, 1.6, mat(0xe2b23e, 0.3, 0.75))
  for (const [dx, dz] of [[-2.2, -3], [2.2, -3], [-2.2, 3], [2.2, 3]]) cebolla(iglesia, dx, 6, dz, 0.7, mat(0xe2b23e, 0.3, 0.75), { alto: 1 })
  for (const o of g.children.slice(antesDeLaCiudad)) o.traverse(m => { if (m.isMesh) m.userData.sinFoco = true })

  return colocar(g, 1, -62)
}
