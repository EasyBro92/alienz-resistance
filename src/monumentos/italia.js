// Italia: Nápoles y Milán. (Roma lleva el Coliseo de Meshy.)
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, geoArco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, coche, colocar, sub
} from './piezas.js'

// Torre redonda almenada con matacanes, como las del Maschio Angioino.
function torreonAngevino (g, piedra, x, z, r, alto) {
  pon(g, geoCil(r, r * 1.22, 2.4, 20), piedra, x, 1.2, z)
  pon(g, geoCil(r, r, alto - 2.4, 20), piedra, x, 2.4 + (alto - 2.4) / 2, z)
  pon(g, geoCil(r + 0.45, r, 0.8, 20), piedra, x, alto + 0.2, z)
  almenas(g, piedra, r + 0.25, alto + 1, 14, x, z, 0.55)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    pon(g, geoCaja(0.18, 0.9, 0.06), mat(0x2a241e, 1), x + Math.cos(a) * (r + 0.02), alto * 0.55, z + Math.sin(a) * (r + 0.02)).rotation.y = Math.PI / 2 - a
  }
}

// Nápoles, a la izquierda: el Castel Nuovo, el Maschio Angioino. Muralla de
// toba gris oscura con cinco torres redondas almenadas, el arco de triunfo de
// mármol blanco encajado entre las dos torres de la fachada, el foso con sus
// jardines, y delante la Piazza Municipio con la fuente, palmeras, farolas y
// gente. Detrás, los edificios del puerto de fachadas pompeyanas.
export function maschioAngioino () {
  const g = new THREE.Group()
  const toba = mat(0x6a6258, 0.95)
  const tobaClara = mat(0x7d7468, 0.95)
  const marmol = mat(0xefe9dd, 0.7)
  const hueco = mat(0x28221c, 1)

  // --- la plaza y el foso ---
  explanada(g, { x: -9, z: 0, ancho: 12, fondo: 60, color: 0xd3c8b4, juntas: 0xbdb19a, paso: 2.5 })
  cesped(g, { x: 5, z: 0, ancho: 26, fondo: 34, color: 0x5d8a45 })
  // La fuente del Nettuno con su taza y los chorros.
  estanque(g, { x: -9, z: 14, ancho: 6, fondo: 6, redondo: true })
  pon(g, geoCil(0.6, 1, 1.6, 12), marmol, -9, 1.2, 14)
  pon(g, geoCil(1.6, 0.4, 0.5, 14), marmol, -9, 2.2, 14)
  pon(g, geoCil(0.2, 0.3, 1.6, 8), mat(0x5a5a52, 0.5, 0.5), -9, 3.2, 14)
  for (let z = 26; z > -28; z -= 7) arbol(g, -14, z, 'palmera', 0.95)
  for (let z = 24; z > -26; z -= 8) farola(g, -4.2, z, 4.5, 0x2a2a2a)
  gente(g, 55, { x0: -14, x1: -4, z0: 29, z1: -29 })
  for (let i = 0; i < 4; i++) coche(g, -13.5 + i * 0.1, -22 + i * 5, 0)

  // --- el castillo ---
  const CX = 5
  const CZ = 0
  const W = 20
  const D = 26
  pon(g, geoCaja(W, 12, D), toba, CX, 6, CZ)
  pon(g, geoCaja(W + 1.2, 1, D + 1.2), toba, CX, 1.3, CZ)
  almenasRectas(g, toba, D, 12.4, CX - W / 2 + 0.3, CZ, true, 0.6)
  almenasRectas(g, toba, D, 12.4, CX + W / 2 - 0.3, CZ, true, 0.6)
  almenasRectas(g, toba, W, 12.4, CX, CZ - D / 2 + 0.3, false, 0.6)
  almenasRectas(g, toba, W, 12.4, CX, CZ + D / 2 - 0.3, false, 0.6)
  // Hileras de sillares más claros y aspilleras.
  for (const y of [4, 8]) pon(g, geoCaja(W + 0.05, 0.25, D + 0.05), tobaClara, CX, y, CZ)
  ventanas(g, hueco, { ancho: D - 8, alto: 6, filas: 2, columnas: 6, x: CX - W / 2 - 0.05, y: 3.5, z: CZ, giro: -Math.PI / 2, w: 0.25, h: 0.9 })
  // Las cinco torres: dos flanqueando el arco (del lado de la plaza), dos
  // atrás y la del mar.
  const R = 3.3
  torreonAngevino(g, toba, CX - W / 2, CZ - 4.5, R, 15)
  torreonAngevino(g, toba, CX - W / 2, CZ + 4.5, R, 15)
  torreonAngevino(g, toba, CX - W / 2, CZ - D / 2, R, 14)
  torreonAngevino(g, toba, CX + W / 2, CZ - D / 2, R, 14)
  torreonAngevino(g, toba, CX + W / 2, CZ + D / 2, R, 14)
  torreonAngevino(g, toba, CX - W / 2, CZ + D / 2, R, 14)
  // El arco de triunfo de Alfonso de Aragón: dos arcos superpuestos, el friso
  // del cortejo, la hornacina con estatuas y el frontón curvo con San Miguel.
  const AX = CX - W / 2 - 3.4
  pon(g, geoCaja(1.6, 13, 5.6), marmol, AX + 0.6, 6.5, CZ)
  arcada(g, hueco, { ancho: 3, alto: 4.4, n: 1, x: AX - 0.22, y: 0.2, z: CZ, giro: -Math.PI / 2, hueco: 0.85 })
  for (const dz of [-1.9, 1.9]) {
    pon(g, geoCil(0.28, 0.28, 4, 10), marmol, AX - 0.35, 2.4, CZ + dz)
    pon(g, geoCil(0.25, 0.25, 3.2, 10), marmol, AX - 0.35, 8.6, CZ + dz)
  }
  pon(g, geoCaja(2, 1.4, 5.8), marmol, AX + 0.4, 5.4, CZ)
  for (let i = 0; i < 9; i++) pon(g, geoCaja(0.1, 0.8, 0.35), mat(0xc9c1b2, 0.8), AX - 0.62, 5.4, CZ - 2.4 + i * 0.6)
  arcada(g, hueco, { ancho: 2.6, alto: 3.2, n: 1, x: AX - 0.22, y: 6.8, z: CZ, giro: -Math.PI / 2, hueco: 0.8 })
  pon(g, geoCaja(2, 0.8, 5.8), marmol, AX + 0.4, 10.6, CZ)
  for (let i = 0; i < 4; i++) pon(g, geoCil(0.18, 0.22, 1.2, 8), marmol, AX - 0.3, 11.6, CZ - 1.8 + i * 1.2)
  pon(g, new THREE.CylinderGeometry(2.2, 2.2, 1.4, 16, 1, false, 0, Math.PI), marmol, AX + 0.5, 12.2, CZ).rotation.x = Math.PI / 2
  pon(g, geoCil(0.2, 0.35, 1.6, 8), mat(0xdcd4c4, 0.7), AX + 0.3, 14.5, CZ)
  // Cubierta: el tejado de la Sala dei Baroni asomando.
  cuatroTejado(g, CX + 2, CZ - 3, 10, 12)

  // --- los edificios del puerto, detrás ---
  const fachadas = [0xd9a06b, 0xe8c08a, 0xcf8a5e, 0xefd9b0, 0xc97a52]
  const fila = []
  for (let z = 28; z > -30; z -= 8) fila.push([26, z, 8, azar(14, 20), 7])
  bloques(g, fila, 1, { colores: fachadas })

  return colocar(g, -1, -62)
}

// Roma, a la derecha: el Coliseo desde la Via dei Fori Imperiali. Sustituye al
// modelo de Meshy, que salía deformado —los arcos derretidos y un cuenco sin
// forma—. El anillo exterior de travertino con sus ochenta arcos en tres
// órdenes de semicolumnas y el ático con pilastras, ventanas y ménsulas; del
// lado de la carretera el anillo exterior falta, como en el de verdad, y se ve
// el interior con sus arcadas a distintas alturas y los contrafuertes de
// ladrillo en los cortes; dentro, las gradas arruinadas con los muros radiales
// y el hipogeo al descubierto con un trozo de arena reconstruida. Alrededor, la
// plaza de travertino, el Arco de Constantino, la Meta Sudans, el templo de
// Venus y Roma, el Palatino con sus pinos piñoneros, las calesas y los turistas.
export function coliseoRoma () {
  const g = new THREE.Group()
  const trav = mat(0xd9c9a8, 0.9)
  const travOsc = mat(0xbfab86, 0.95)
  const ladrillo = mat(0xb5715a, 0.95)
  const sombra = mat(0x4a3e32, 1)

  const CX = 14
  const CZ = 0
  const RX = 14
  const RZ = 17
  const N = 80
  const PISO = 2.9
  const Y0 = 0.5
  const punto = (a, off, y) => V(CX + (RX + off) * Math.cos(a), y, CZ + (RZ + off) * Math.sin(a))
  // Local +z hacia fuera, perpendicular a la elipse.
  const giro = (a, off) => Math.atan2(Math.cos(a) / (RX + off), Math.sin(a) / (RZ + off))
  const poner = (geo, m, a, off, y) => {
    const p = punto(a, off, y)
    const o = pon(g, geo, m, p.x, p.y, p.z)
    o.rotation.y = giro(a, off)
    return o
  }
  const angulo = i => (i / N) * Math.PI * 2
  // El lado que da a la carretera (x negativo) ha perdido el anillo exterior.
  const entero = a => Math.cos(a) > -0.35

  // --- el zócalo escalonado alrededor ---
  for (let i = 0; i < N; i++) {
    const a = angulo(i + 0.5)
    const ancho = punto(angulo(i), 1.2, 0).distanceTo(punto(angulo(i + 1), 1.2, 0))
    poner(geoCaja(ancho + 0.05, 0.25, 2.4), travOsc, a, 0.6, 0.12)
    poner(geoCaja(ancho + 0.05, 0.25, 1.6), trav, a, 0.2, 0.37)
  }

  // Un arco de una arcada: pilar, semicolumna, arco y enjuta, en el anillo `off`.
  const arcoDeArcada = (i, off, y, alto, orden, fondo = 1) => {
    const a = angulo(i)
    const am = angulo(i + 0.5)
    const ancho = punto(a, off, 0).distanceTo(punto(angulo(i + 1), off, 0))
    const r = Math.max(0.2, (ancho - 0.5) / 2)
    poner(geoCaja(0.5, alto, fondo), trav, a, off, y + alto / 2)
    if (orden >= 0) {
      poner(geoCil(0.15, 0.17, alto - 0.35, 8), orden === 2 ? travOsc : trav, a, off + fondo / 2 + 0.08, y + (alto - 0.35) / 2)
      poner(geoCaja(0.45, 0.18, 0.35), travOsc, a, off + fondo / 2 + 0.08, y + alto - 0.3)
    }
    const hueco = alto - 0.7
    poner(geoArco(r, 0.14, fondo), trav, am, off, y + hueco - r)
    poner(geoCaja(ancho + 0.02, alto - hueco, fondo), trav, am, off, y + hueco + (alto - hueco) / 2)
    poner(geoCaja(ancho + 0.02, 0.22, fondo + 0.4), travOsc, am, off + 0.1, y + alto)
  }

  // --- el anillo exterior: tres órdenes de arcos y el ático ---
  for (let i = 0; i < N; i++) {
    const am = angulo(i + 0.5)
    if (!entero(am)) continue
    for (let p = 0; p < 3; p++) arcoDeArcada(i, 0, Y0 + p * PISO, PISO, p)
    const yA = Y0 + 3 * PISO
    const ancho = punto(angulo(i), 0, 0).distanceTo(punto(angulo(i + 1), 0, 0))
    poner(geoCaja(ancho + 0.02, 2.5, 1), trav, am, 0, yA + 1.25)
    poner(geoCaja(0.3, 2.3, 0.2), travOsc, angulo(i), 0.55, yA + 1.15)
    if (i % 2) poner(geoCaja(0.42, 0.65, 0.1), sombra, am, 0.52, yA + 1.1)
    poner(geoCaja(0.22, 0.28, 0.35), travOsc, am, 0.62, yA + 2.25)
    poner(geoCaja(ancho + 0.05, 0.35, 1.3), travOsc, am, 0.05, yA + 2.65)
  }
  // Los contrafuertes de ladrillo en los dos cortes del anillo.
  const corte = Math.acos(-0.35)
  for (const dir of [-1, 1]) {
    const a = dir > 0 ? corte : Math.PI * 2 - corte
    for (let s = 0; s < 6; s++) {
      const alto = Y0 + 3 * PISO + 2.8 - s * 2
      poner(geoCaja(0.9, alto, 1.3), ladrillo, a + dir * (0.012 + s * 0.022), 0.1, alto / 2)
    }
  }

  // --- el anillo interior, que se ve por el lado roto ---
  const OFF_IN = -2.6
  for (let i = 0; i < N; i++) {
    const am = angulo(i + 0.5)
    const pisos = entero(am) ? 3 : 1 + ((i * 7) % 3)
    for (let p = 0; p < pisos; p++) arcoDeArcada(i, OFF_IN, Y0 + p * PISO, PISO, -1, 0.9)
  }
  // Las bóvedas del corredor entre los dos anillos, en el lado roto.
  for (let i = 0; i < N; i++) {
    const am = angulo(i + 0.5)
    if (entero(am)) continue
    const ancho = punto(angulo(i), -1.3, 0).distanceTo(punto(angulo(i + 1), -1.3, 0))
    poner(geoCaja(ancho + 0.02, 0.3, 2.2), travOsc, am, -1.3, Y0 + PISO)
    if (i % 3 === 0) poner(geoCaja(0.4, 2.6, 2), ladrillo, angulo(i), -1.3, Y0 + 1.3)
  }
  // El muro oscuro del fondo del corredor.
  pon(g, new THREE.CylinderGeometry(1, 1, 8, 72, 1, true), lamina(0x4a3e32, 1), CX, 4.5, CZ).scale.set(RX - 3.6, 1, RZ - 3.6)

  // --- las gradas arruinadas ---
  const RXA = RX - 8.8
  const RZA = RZ - 8.8
  for (let t = 0; t < 5; t++) {
    const f0 = 1 + (t * 1) / RXA
    const f1 = 1 + ((t + 1) * 1) / RXA
    const grada = pon(g, new THREE.RingGeometry(f0, f1, 64), lamina(t % 2 ? 0xc2ae88 : 0xb09a74, 0.95), CX, 1.6 + t * 1.25, CZ)
    grada.rotation.x = -Math.PI / 2
    grada.scale.set(RXA, RZA + t * 0.35, 1)
  }
  // Los muros radiales de las bóvedas que sostenían las gradas.
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    const alto = 2 + ((i * 5) % 7) * 0.8
    poner(geoCaja(0.35, alto, 5.4), i % 2 ? ladrillo : travOsc, a, -6.4, alto / 2 + 0.4)
  }

  // --- la arena y el hipogeo ---
  pon(g, geoCil(1, 1, 0.1, 40), sombra, CX, 0.05, CZ).scale.set(RXA, 1, RZA)
  pon(g, new THREE.CylinderGeometry(1, 1, 2.2, 48, 1, true), lamina(0xa38c66, 0.95), CX, 1.1, CZ).scale.set(RXA, 1, RZA)
  for (let x = -RXA + 0.8; x < RXA - 0.5; x += 0.9) {
    const largo = 2 * RZA * Math.sqrt(Math.max(0, 1 - (x / RXA) ** 2)) * 0.92
    pon(g, geoCaja(0.28, 1.5, largo), ladrillo, CX + x, 0.8, CZ)
  }
  for (let z = -RZA + 1.5; z < RZA - 1; z += 2.2) {
    const largo = 2 * RXA * Math.sqrt(Math.max(0, 1 - (z / RZA) ** 2)) * 0.9
    pon(g, geoCaja(largo, 1.2, 0.25), ladrillo, CX, 0.65, CZ + z)
  }
  // El trozo de arena reconstruido, de tablones.
  pon(g, geoCaja(RXA * 1.6, 0.25, RZA * 0.7), mat(0x9a7a52, 0.9), CX, 1.65, CZ + RZA * 0.5)
  for (let x = -RXA * 0.8; x < RXA * 0.8; x += 0.6) pon(g, geoCaja(0.05, 0.02, RZA * 0.7), mat(0x7a5a3a, 0.9), CX + x, 1.79, CZ + RZA * 0.5)

  // --- la plaza y la Via dei Fori Imperiali ---
  explanada(g, { x: 12, z: 0, ancho: 50, fondo: 84, color: 0xd3c7ae, juntas: 0xbdb096, paso: 3 })
  explanada(g, { x: -10, z: 0, ancho: 6, fondo: 84, color: 0x77716c, juntas: 0x5f5a56, paso: 1 })
  gente(g, 140, { x0: -12, x1: 32, z0: 40, z1: -40, piel: 0xd9b48a })
  for (let z = 36; z > -40; z -= 12) farola(g, -6.5, z, 5, 0x2a2a2a)
  // Calesas.
  for (let i = 0; i < 2; i++) {
    const c = sub(g, -8, 0, 12 - i * 22, 0)
    pon(c, geoCaja(1.4, 0.9, 2.6), mat(0x2a2a2a, 0.5), 0, 1.1, 0)
    pon(c, geoCaja(1.4, 0.1, 1.6), mat(0x2a2a2a, 0.5), 0, 2.3, -0.5)
    pon(c, geoCaja(0.6, 1.1, 2), mat(0xf2efe6, 0.8), 0, 1.2, 2.6)
    pon(c, geoCaja(0.3, 0.6, 0.6), mat(0xf2efe6, 0.8), 0, 2, 3.7).rotation.x = -0.5
  }

  // --- el Arco de Constantino ---
  // Detrás del Coliseo visto desde el vuelo: delante tapaba medio anfiteatro.
  const AX = -1
  const AZ = -34
  const mármol = mat(0xe6dcc6, 0.8)
  pon(g, geoCaja(3.6, 9, 16), mármol, AX, 4.5, AZ)
  arcada(g, sombra, { ancho: 5, alto: 6.5, n: 1, x: AX - 1.82, y: 0, z: AZ, giro: -Math.PI / 2, hueco: 0.9 })
  for (const dz of [-5.4, 5.4]) arcada(g, sombra, { ancho: 2.8, alto: 4, n: 1, x: AX - 1.82, y: 0, z: AZ + dz, giro: -Math.PI / 2, hueco: 0.9 })
  for (const dz of [-7, -3.4, 3.4, 7]) {
    pon(g, geoCaja(1.1, 1.6, 1.1), mármol, AX - 2.4, 0.8, AZ + dz)
    pon(g, geoCil(0.35, 0.38, 5, 12), mat(0xd9c9a8, 0.7), AX - 2.4, 4.1, AZ + dz)
    pon(g, geoCaja(0.9, 0.4, 0.9), mármol, AX - 2.4, 6.8, AZ + dz)
    pon(g, geoCil(0.25, 0.3, 1.6, 8), mármol, AX - 2.4, 10.6, AZ + dz)
  }
  pon(g, geoCaja(4, 0.6, 16.4), travOsc, AX, 9.3, AZ)
  pon(g, geoCaja(3.8, 3, 16), mármol, AX, 11.1, AZ)
  pon(g, geoCaja(0.1, 2, 6), mat(0xcfc2a8, 0.8), AX - 1.95, 11.1, AZ)
  for (const dz of [-5.4, 5.4]) pon(g, geoCaja(0.1, 1.6, 2.4), mat(0xb8ab92, 0.9), AX - 1.95, 11.1, AZ + dz)
  // La Meta Sudans.
  pon(g, geoCil(3, 3, 0.6, 20), travOsc, 6, 0.3, -24)

  // --- el templo de Venus y Roma, bajo, delante ---
  const TZ = 32
  pon(g, geoCaja(10, 1.4, 22), travOsc, 2, 0.7, TZ)
  columnata(g, mármol, { n: 9, largo: 18, alto: 4.5, r: 0.3, x: -2, y: 1.4, z: TZ, enZ: true })
  for (const [dz, alto] of [[-6, 3], [2, 4.5], [7, 2]]) pon(g, geoCil(0.32, 0.34, alto, 10), mármol, 5, 1.4 + alto / 2, TZ + dz)

  // --- el Palatino y los pinos ---
  const fondo = m => { m.userData.sinFoco = true; return m }
  fondo(pon(g, geoCil(20, 34, 10, 12), mat(0x6f8a4f, 1), 58, 5, -8)).scale.z = 1.6
  for (let i = 0; i < 16; i++) fondo(pon(g, geoCaja(azar(2, 5), azar(2, 6), azar(2, 5)), ladrillo, azar(44, 66), 10 + azar(0, 2), azar(-40, 24)))
  for (let i = 0; i < 26; i++) arbol(g, azar(34, 42), azar(-42, 42), elige(['pino', 'pino', 'cipres']), 1.2)
  for (let i = 0; i < 10; i++) arbol(g, azar(-6, 2), elige([azar(-44, -24), azar(38, 44)]), 'pino', 1.2)
  // La boca de metro con su M roja.
  pon(g, geoCil(0.08, 0.08, 3.4, 6), mat(0x555555, 0.5, 0.5), -5, 1.7, -18)
  pon(g, geoCaja(0.2, 1, 1), mat(0xd23a2a, 0.6), -5, 3.6, -18)

  return colocar(g, 1, -62)
}

function cuatroTejado (g, x, z, ancho, fondo) {
  pon(g, geoTronco(0.3, 1, 3).scale(ancho / 2, 1, fondo / 2), mat(0x8a5a44, 0.85), x, 13.5, z)
}

// Milán, a la derecha: la Piazza del Duomo con su enlosado, la estatua ecuestre
// y la gente, la entrada de la Galería Vittorio Emanuele con su arco y la
// cúpula de cristal, y el Duomo: mármol blanco rosado, la fachada de cinco
// portadas con sus agujas, los contrafuertes rematados en pináculos a los dos
// lados de la nave, las ventanas góticas, el cimborrio y la aguja mayor con la
// Madonnina dorada.
export function duomo () {
  const g = new THREE.Group()
  const marmol = mat(0xf1e6de, 0.6)
  const marmolSombra = mat(0xd9cdc4, 0.7)
  const hueco = mat(0x3b3530, 1)
  const vidriera = mat(0x4a5f7a, 0.3, 0.3)
  const oro = mat(0xe2b23e, 0.3, 0.75)

  // --- la plaza ---
  explanada(g, { x: -2, z: 10, ancho: 22, fondo: 70, color: 0xd8d0c4, juntas: 0xc0b6a8, paso: 2.2 })
  // Las franjas de piedra oscura del enlosado.
  for (let z = 40; z > -24; z -= 8) pon(g, geoCaja(22, 0.03, 0.5), mat(0x8a817a, 0.9), -2, 0.14, z)
  // Estatua ecuestre de Vittorio Emanuele II.
  pon(g, geoCaja(3, 3, 5), mat(0xcfc7ba, 0.8), -6, 1.5, 24)
  const bronce = mat(0x3f4a42, 0.5, 0.5)
  pon(g, geoCaja(1.1, 1.4, 3), bronce, -6, 3.9, 24)
  pon(g, geoCaja(0.8, 1.2, 0.8), bronce, -6, 4.8, 25.6).rotation.x = -0.4
  for (const [dx, dz] of [[-0.35, -1], [0.35, -1], [-0.35, 1], [0.35, 1]]) pon(g, geoCil(0.12, 0.1, 1.6, 6), bronce, -6 + dx, 2.4 + 0.8, 24 + dz)
  pon(g, geoCil(0.3, 0.4, 1.6, 8), bronce, -6, 5.2, 23.8)
  gente(g, 90, { x0: -12, x1: 8, z0: 44, z1: -24 })
  for (let z = 40; z > -24; z -= 10) farola(g, -12.5, z, 5, 0x2a2a2a)

  // --- la Galería, a la izquierda de la fachada ---
  const galeria = mat(0xe6d5bf, 0.85)
  pon(g, geoCaja(24, 16, 10), galeria, 2, 8, 40)
  arcada(g, hueco, { ancho: 7, alto: 13, n: 1, x: -2, y: 0.1, z: 34.95, giro: Math.PI, hueco: 0.9 })
  ventanas(g, hueco, { ancho: 22, alto: 12, filas: 3, columnas: 8, x: -9.98, y: 2, z: 40, giro: -Math.PI / 2, w: 0.8, h: 1.8 })
  columnata(g, galeria, { n: 6, largo: 8, alto: 5, r: 0.3, x: -10.3, y: 8.5, z: 40, enZ: true })
  pon(g, geoCaja(4.5, 3, 10.6), galeria, -2, 17.5, 40)
  // La cúpula de cristal del Ottagono asomando por encima.
  pon(g, geoCupula(4.5), mat(0x7fa0b0, 0.2, 0.4), 6, 16, 44)
  for (let i = 0; i < 8; i++) pon(g, new THREE.TorusGeometry(4.52, 0.08, 4, 16, Math.PI), mat(0x3a4a44, 0.5, 0.5), 6, 16, 44).rotation.y = (i / 8) * Math.PI

  // --- el Duomo ---
  // Orientado a lo largo de x: la fachada mira a la plaza (hacia -x) y la nave
  // se aleja de la carretera.
  const FX = 10
  const L = 34
  const W = 20
  const cx = FX + L / 2
  // Naves: la central más alta y las laterales escalonadas.
  pon(g, geoCaja(L, 12, W), marmol, cx, 6, 0)
  pon(g, geoCaja(L, 17, W * 0.45), marmol, cx, 8.5, 0)
  aguas(sub(g, cx, 0, 0, Math.PI / 2), marmolSombra, W * 0.45, 2.4, L, 0, 17, 0)
  for (const s of [-1, 1]) {
    pon(g, geoTronco(0.4, 1, 1.6).scale(L / 2, 1, W * 0.14), marmolSombra, cx, 12.8, s * W * 0.36)
  }
  // Contrafuertes con pináculos y ventanales góticos en los dos flancos.
  for (let x = FX + 2; x < FX + L - 1; x += 3.4) {
    for (const s of [-1, 1]) {
      pon(g, geoCaja(1, 13, 1), marmol, x, 6.5, s * (W / 2 + 0.4))
      pon(g, geoCil(0.02, 0.3, 3.4, 6), marmol, x, 14.7, s * (W / 2 + 0.4))
      pon(g, geoBola(0.12, 6, 4), marmol, x, 16.5, s * (W / 2 + 0.4))
      pon(g, geoCaja(0.9, 0.9, 0.9), marmol, x, 13, s * (W / 4.5))
      pon(g, geoCil(0.02, 0.26, 3, 6), marmol, x, 15, s * (W / 4.5))
      pon(g, geoCil(0.02, 0.24, 2.6, 6), marmol, x, 18.8, s * (W * 0.24))
      barra(g, marmol, V(x, 11.5, s * (W / 2 + 0.3)), V(x, 15.5, s * (W * 0.23)), 0.25)
    }
    for (const s of [-1, 1]) {
      pon(g, geoCaja(1.6, 6, 0.08), vidriera, x + 1.7, 5.5, s * (W / 2 + 0.05))
      pon(g, geoTronco(0, 0.8, 1).scale(1, 1, 0.06), vidriera, x + 1.7, 9, s * (W / 2 + 0.05))
    }
  }
  // La fachada: el hastial escalonado, cinco portadas, ventanales y agujas.
  const fachada = sub(g, FX - 0.4, 0, 0, -Math.PI / 2)
  pon(fachada, geoCaja(W, 14, 0.8), marmol, 0, 7, 0)
  pon(fachada, geoCaja(W * 0.5, 4, 0.8), marmol, 0, 16, 0)
  pon(fachada, geoTronco(0, 1, 3).scale(W * 0.25, 1, 0.4), marmol, 0, 19.5, 0)
  for (const [x, alto, ancho] of [[0, 5.5, 2.6], [-4.4, 4.4, 1.8], [4.4, 4.4, 1.8], [-8, 3.8, 1.6], [8, 3.8, 1.6]]) {
    arcada(fachada, hueco, { ancho, alto, n: 1, x, y: 0.1, z: 0.45, hueco: 0.9 })
    pon(fachada, geoCaja(ancho + 0.6, 0.4, 0.3), marmolSombra, x, alto + 0.6, 0.5)
    pon(fachada, geoTronco(0, 0.9, 1.4).scale(ancho * 0.7, 1, 0.3), marmol, x, alto + 1.6, 0.5)
  }
  for (const x of [-6, -2, 2, 6]) {
    pon(fachada, geoCaja(1.1, 3.6, 0.1), vidriera, x, 9.5, 0.45)
    pon(fachada, geoTronco(0, 0.7, 0.8).scale(1, 1, 0.08), vidriera, x, 11.7, 0.45)
  }
  pon(fachada, geoCil(1.2, 1.2, 0.1, 18), vidriera, 0, 13.5, 0.45).rotation.x = Math.PI / 2
  // Las seis pilastras que suben de la fachada y acaban en aguja con estatua.
  for (const x of [-9.6, -6.2, -2.4, 2.4, 6.2, 9.6]) {
    const alto = Math.abs(x) < 3 ? 19 : Math.abs(x) < 7 ? 15.5 : 13
    pon(fachada, geoCaja(0.8, alto, 1.2), marmol, x, alto / 2, 0.2)
    pon(fachada, geoCil(0.02, 0.35, 3.6, 6), marmol, x, alto + 1.8, 0.2)
    pon(fachada, geoBola(0.14, 6, 4), marmol, x, alto + 3.7, 0.2)
  }
  // El cimborrio octogonal con su corona de agujas y la aguja mayor.
  const AX = FX + L * 0.72
  pon(g, geoCil(4, 4.4, 5, 8), marmol, AX, 19.5, 0)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoCil(0.02, 0.3, 4.5, 6), marmol, AX + Math.cos(a) * 4.3, 23, Math.sin(a) * 4.3)
    pon(g, geoCaja(1.2, 2.6, 0.08), vidriera, AX + Math.cos(a) * 4.1, 19.5, Math.sin(a) * 4.1).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(2.2, 3.6, 3, 8), marmol, AX, 23.5, 0)
  pon(g, geoCil(0.12, 1.4, 11, 8), marmol, AX, 30.5, 0)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    barra(g, marmol, V(AX + Math.cos(a) * 2.6, 25, Math.sin(a) * 2.6), V(AX + Math.cos(a) * 0.5, 33, Math.sin(a) * 0.5), 0.12)
  }
  pon(g, geoCil(0.1, 0.3, 1.8, 8), oro, AX, 36.8, 0)
  pon(g, geoBola(0.2, 8, 6), oro, AX, 37.8, 0)
  // El ábside poligonal al final.
  pon(g, geoCil(W / 2, W / 2, 12, 10, 1, false), marmol, FX + L, 6, 0).scale.x = 0.6
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k / 6) * Math.PI
    pon(g, geoCil(0.02, 0.3, 3.2, 6), marmol, FX + L + Math.cos(a) * W * 0.3, 13.6, Math.sin(a) * W / 2)
  }

  // Los edificios porticados de la plaza, al otro lado.
  const fila = []
  for (let z = -30; z > -44; z -= 12) fila.push([6, z, 22, 16, 10])
  bloques(g, fila, 1, { colores: [0xe8d9c0, 0xdcc9a8] })
  columnata(g, marmolSombra, { n: 8, largo: 18, alto: 4, r: 0.3, x: 6, y: 0, z: -24.8 })

  return colocar(g, 1, -62)
}
