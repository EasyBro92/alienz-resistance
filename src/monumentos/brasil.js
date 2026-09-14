// Brasil: Río de Janeiro, São Paulo y Manaos.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar, espejo
} from './piezas.js'

const BANDERA_BRASIL = [0x009c3b, 0xffdf00, 0x009c3b]
const PIEL = 0xa87850

// Río de Janeiro, a la derecha: el Corcovado desde Botafogo. El pico de granito
// casi vertical cubierto de selva, con sus paredes de roca desnuda; en la cima
// la plataforma, la capilla del pedestal y el Cristo Redentor art déco —la
// túnica con sus pliegues, los brazos abiertos con las manos, la cabeza
// inclinada y el corazón—; el tren de cremallera subiendo por la ladera. En la
// ensenada, los veleros, y al fondo el Pan de Azúcar con su teleférico.
export function cristo () {
  const g = new THREE.Group()
  const granito = mat(0x6f6a62, 1)
  const selva = mat(0x2f6b2f, 1)
  const selvaClara = mat(0x3f7f35, 1)
  const piedraJabon = mat(0xe3ded2, 0.6)

  // --- la ensenada de Botafogo ---
  mar(g, { x: -6, z: 0, ancho: 14, fondo: 100, color: 0x2f8fa8 })
  for (let i = 0; i < 14; i++) barca(g, azar(-12, 0), azar(-46, 46), azar(0, 3), { largo: 4, vela: Math.random() < 0.8 })
  explanada(g, { x: 4, z: 0, ancho: 6, fondo: 100, color: 0xe8dcc0, juntas: null })
  for (let z = 46; z > -48; z -= 7) arbol(g, 4, z, 'palmera', 1)
  gente(g, 40, { x0: 1.5, x1: 6.5, z0: 48, z1: -48, piel: PIEL })
  // Los edificios de Botafogo al pie del monte.
  const fila = []
  for (let z = -44; z <= 44; z += 9) fila.push([11, z, 6, azar(10, 20), 7])
  bloques(g, fila, 1, { colores: [0xefe6d2, 0xe0d0b0, 0xf2ede4, 0xd9c8a4] })

  // --- el Corcovado ---
  const MX = 34
  const MZ = -6
  const ALTO = 34
  pon(g, geoCil(3, 20, ALTO, 11), selva, MX, ALTO / 2, MZ).scale.z = 1.3
  pon(g, geoCil(2.4, 9, ALTO * 0.45, 9), granito, MX - 2, ALTO * 0.78, MZ + 1)
  // Paredes de roca y manchas de selva.
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2
    const t = Math.random()
    const r = 3 + (1 - t) * 16
    const y = t * ALTO
    pon(g, new THREE.DodecahedronGeometry(azar(1.2, 3), 0), t > 0.6 ? granito : elige([selva, selvaClara]), MX + Math.cos(a) * r, y, MZ + Math.sin(a) * r * 1.3)
  }
  // El tren de cremallera.
  const via = mat(0x5a5650, 0.6)
  for (let i = 0; i < 14; i++) {
    const t = i / 14
    const a = -2.4 + t * 2
    const r = 18 - t * 14
    pon(g, geoCaja(1.2, 0.3, 2.4), via, MX + Math.cos(a) * r, t * ALTO * 0.85 + 0.5, MZ + Math.sin(a) * r * 1.3).rotation.y = -a
  }
  const tren = sub(g, MX + Math.cos(-1.6) * 11, ALTO * 0.35, MZ + Math.sin(-1.6) * 11 * 1.3, 1.6)
  pon(tren, geoCaja(2, 2.2, 5), mat(0xd23a2a, 0.5), 0, 1.2, 0)
  pon(tren, geoCaja(2.05, 0.8, 4.2), mat(0x2a3540, 0.2, 0.5), 0, 1.7, 0)

  // --- la cima: plataforma, pedestal y el Cristo ---
  const Y = ALTO + 0.5
  pon(g, geoCil(5, 4, 1.4, 16), mat(0xd9d4c8, 0.8), MX, Y - 0.7, MZ)
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2
    pon(g, geoCaja(0.1, 0.8, 1.4), mat(0x3a3a3a, 0.5, 0.5), MX + Math.cos(a) * 4.9, Y + 0.4, MZ + Math.sin(a) * 4.9).rotation.y = Math.PI / 2 - a
  }
  gente(g, 25, { x0: MX - 4, x1: MX + 4, z0: MZ + 3.5, z1: MZ - 3.5, y: Y, piel: PIEL })
  pon(g, geoCaja(2.6, 3, 2.6), piedraJabon, MX, Y + 1.5, MZ)
  pon(g, geoCaja(3, 0.4, 3), piedraJabon, MX, Y + 3.2, MZ)
  pon(g, geoCaja(0.1, 1.6, 0.9), mat(0x3a3028, 1), MX - 1.35, Y + 1, MZ)
  // La figura: túnica en tronco de cono con los pliegues verticales.
  const cy = Y + 3.4
  pon(g, geoCil(0.95, 1.35, 6, 12), piedraJabon, MX, cy + 3, MZ)
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2
    barra(g, piedraJabon, V(MX + Math.cos(a) * 1.35, cy, MZ + Math.sin(a) * 1.35), V(MX + Math.cos(a) * 0.95, cy + 6, MZ + Math.sin(a) * 0.95), 0.22)
  }
  // Los brazos abiertos, con las mangas cayendo y las manos.
  pon(g, geoCaja(0.9, 0.9, 11), piedraJabon, MX, cy + 6.6, MZ)
  for (const s of [-1, 1]) {
    pon(g, geoTronco(0.3, 0.55, 1.6).rotateX(Math.PI), piedraJabon, MX, cy + 5.6, MZ + s * 3.4)
    pon(g, geoCaja(0.5, 0.9, 0.5), piedraJabon, MX, cy + 6.3, MZ + s * 5.7)
  }
  pon(g, geoCil(0.55, 0.9, 1, 12), piedraJabon, MX, cy + 7.3, MZ)
  pon(g, geoBola(0.6, 12, 10), piedraJabon, MX - 0.1, cy + 8.3, MZ).scale.y = 1.15
  pon(g, geoCil(0.62, 0.62, 0.5, 12), piedraJabon, MX + 0.05, cy + 8.8, MZ)
  pon(g, geoCaja(0.1, 0.6, 0.6), mat(0xc9c2b4, 0.6), MX - 0.96, cy + 5.6, MZ)

  // --- el Pan de Azúcar al fondo ---
  const fondo = m => { m.userData.sinFoco = true; return m }
  const pan = (x, z, r, alto) => {
    const p = fondo(pon(g, geoBola(r, 16, 12), granito, x, alto * 0.45, z))
    p.scale.set(1, alto / (r * 1.8), 1)
    fondo(pon(g, geoBola(r * 0.9, 12, 8), selva, x, alto * 0.15, z)).scale.y = 0.5
  }
  pan(50, -54, 10, 28)
  pan(40, -44, 6, 14)
  fondo(barra(g, mat(0x2a2a2a, 0.5, 0.5), V(40, 14, -44), V(50, 28, -54), 0.08))
  fondo(pon(g, geoCaja(1.6, 1.4, 2.2), mat(0xd23a2a, 0.5), 45, 20.6, -49))

  bandera(g, 4, -30, 6, BANDERA_BRASIL)
  return colocar(g, 1, -62)
}

// São Paulo, a la izquierda de la avenida Paulista: el MASP. Los dos pórticos
// rojos que sostienen la caja de cristal oscuro colgada, con el vano libre de
// setenta y cuatro metros debajo, la feria de antigüedades en ese vano, las
// escaleras al belvedere; enfrente el parque Trianon de mata atlántica; y los
// rascacielos de la Paulista con sus antenas de televisión rojas y blancas.
export function masp () {
  const g = new THREE.Group()
  const rojo = mat(0xc8231e, 0.55)
  const cristal = vidrio(0x1f2a30)
  const hormigon = mat(0xa8a49c, 0.9)

  // --- el belvedere ---
  explanada(g, { x: 10, z: 0, ancho: 22, fondo: 70, color: 0xb9b3a8, juntas: 0xa39d92, paso: 3 })
  // La feria bajo el vano.
  for (let i = 0; i < 12; i++) {
    const t = sub(g, azar(4, 16), 0, azar(-18, 18), 0)
    pon(t, geoCaja(2, 0.8, 1.2), mat(0x6b543c, 0.9), 0, 0.4, 0)
    pon(t, geoTronco(0.3, 1.2, 0.5), lamina(elige([0xf2efe6, 0x2f6fbf, 0xd9442e]), 0.8), 0, 2.3, 0)
    pon(t, geoCil(0.04, 0.04, 2, 5), mat(0x444444), 0, 1.2, 0)
  }
  gente(g, 80, { x0: 0, x1: 20, z0: 32, z1: -32, piel: PIEL })

  // --- los pórticos y la caja ---
  const X = 10
  const L = 44
  const H = 12
  for (const s of [-1, 1]) {
    const z = s * (L / 2)
    for (const dx of [-5.2, 5.2]) pon(g, geoCaja(1.6, H, 2.2), rojo, X + dx, H / 2, z)
    pon(g, geoCaja(12, 2, 2.2), rojo, X, H + 1, z)
    pon(g, geoCaja(12, 1.4, 2.2), rojo, X, H - 5.4, z)
  }
  // Las dos vigas largas por encima de la caja.
  for (const dx of [-5.2, 5.2]) pon(g, geoCaja(1.6, 2, L + 2.2), rojo, X + dx, H + 1, 0)
  // La caja de cristal colgada, con los montantes.
  pon(g, geoCaja(9.4, 6.2, L - 2), cristal, X, H - 3.2, 0)
  for (let z = -L / 2 + 2; z <= L / 2 - 2; z += 1.6) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.08, 6.2, 0.08), mat(0x777a7e, 0.4, 0.6), X + s * 4.72, H - 3.2, z)
  }
  pon(g, geoCaja(9.6, 0.4, L - 1.6), hormigon, X, H - 6.4, 0)
  // Escaleras y ascensor al nivel de abajo.
  for (let s = 0; s < 8; s++) pon(g, geoCaja(3, 0.3, 1), hormigon, X + 6.5, -0.15 - s * 0.3, -6 + s * 1)
  pon(g, geoCaja(2, 3, 2), cristal, X - 7.5, 1.5, 8)

  // --- el parque Trianon ---
  cesped(g, { x: 30, z: 0, ancho: 14, fondo: 70, color: 0x3f7f35 })
  for (let i = 0; i < 40; i++) arbol(g, azar(24, 36), azar(-34, 34), elige(['selva', 'copa', 'palmera']), azar(0.9, 1.2))

  // --- los rascacielos de la Paulista ---
  const torres = [[48, -30, 12, 44], [50, -8, 14, 36], [48, 14, 10, 52], [50, 34, 14, 40]]
  for (const [x, z, a, h] of torres) {
    const m = pon(g, geoCaja(a, h, a), elige([vidrio(0x5f7f95), mat(0xd9d2c4, 0.8), mat(0xcfc6b8, 0.8)]), x, h / 2, z)
    m.userData.sinFoco = true
    for (let y = 3; y < h; y += 3.2) pon(g, geoCaja(a + 0.1, 0.9, a + 0.1), mat(0x3b4955, 0.3, 0.4), x, y, z).userData.sinFoco = true
    // Antena roja y blanca.
    if (h > 40) {
      for (let t = 0; t < 6; t++) pon(g, geoCil(0.3 - t * 0.03, 0.34 - t * 0.03, 2, 6), mat(t % 2 ? 0xf2efe6 : 0xd23a2a, 0.6), x, h + 1 + t * 2, z).userData.sinFoco = true
    }
  }
  bandera(g, -2, 0, 7, BANDERA_BRASIL)

  // Con avenida el mundo no lo recoloca: se refleja y se pone junto a la acera.
  espejo(g)
  g.position.set(-12, 0, -60)
  g.userData.lados = [-1]
  return g
}

// Manaos, a la izquierda: el Teatro Amazonas. La fachada rosa renacentista con
// el pórtico de columnas blancas y el balcón, las alas con sus ventanas, la
// cúpula de azulejos en verde, amarillo y azul y su linterna; delante la
// plaza de San Sebastián con el pavimento de ondas blancas y negras —el
// encuentro de las aguas— y el monumento a la Apertura de los Puertos con sus
// proas de barco; la iglesia de San Sebastián, las casas coloniales y la selva.
export function teatroAmazonas () {
  const g = new THREE.Group()
  const rosa = mat(0xe4a7a0, 0.8)
  const rosaSombra = mat(0xcc8f88, 0.85)
  const blanco = mat(0xf4f1ea, 0.75)
  const hueco = mat(0x4a4540, 1)

  // --- la plaza con las ondas ---
  explanada(g, { x: -2, z: 0, ancho: 18, fondo: 84, color: 0xf2efe8, juntas: null })
  const negro = mat(0x2a2a2a, 0.8)
  for (let fila = 0; fila < 14; fila++) {
    for (let i = 0; i < 24; i++) {
      const z = -40 + i * 3.5
      const x = -10 + fila * 1.3 + Math.sin(z * 0.35 + fila) * 0.5
      pon(g, geoCaja(0.6, 0.03, 3.6), negro, x, 0.14, z).rotation.y = Math.cos(z * 0.35 + fila) * 0.35
    }
  }
  // El monumento a la Apertura de los Puertos.
  pon(g, geoCaja(4, 1.2, 4), blanco, -3, 0.6, -12)
  pon(g, geoCil(0.6, 0.8, 7, 10), mat(0xd9d2c4, 0.7), -3, 4.7, -12)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    const proa = pon(g, geoTronco(0.05, 0.9, 2.4).rotateX(Math.PI / 2), mat(0x3f4a42, 0.5, 0.5), -3 + Math.cos(a) * 2.6, 2, -12 + Math.sin(a) * 2.6)
    proa.rotation.y = -a + Math.PI / 2
  }
  pon(g, geoCil(0.3, 0.5, 2, 8), mat(0x3f4a42, 0.5, 0.5), -3, 9.2, -12)
  gente(g, 60, { x0: -10, x1: 6, z0: 40, z1: -40, piel: PIEL })
  for (let z = 36; z > -40; z -= 12) farola(g, 6, z, 4.5, 0x2a2a2a)

  // --- el teatro ---
  const TX = 20
  const TZ = 0
  pon(g, geoCaja(22, 12, 28), rosa, TX, 6, TZ)
  pon(g, geoCaja(22.6, 0.8, 28.6), blanco, TX, 12.3, TZ)
  for (let x = TX - 10; x <= TX + 10; x += 1.6) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.3, 0.8, 0.3), blanco, x, 13.1, TZ + s * 14.2)
  }
  for (const s of [-1, 1]) {
    ventanas(g, blanco, { ancho: 20, alto: 9, filas: 2, columnas: 8, x: TX, y: 1.8, z: TZ + s * 14.05, giro: s > 0 ? 0 : Math.PI, w: 1.2, h: 2.4 })
    for (let x = TX - 9; x <= TX + 9; x += 2.5) pon(g, geoCaja(0.5, 12, 0.3), rosaSombra, x, 6, TZ + s * 14.1)
  }
  // El pórtico: escalinata, columnas, balcón y frontón.
  for (let s = 0; s < 6; s++) pon(g, geoCaja(4 - s * 0.5, 0.3, 16), blanco, TX - 14 + s * 0.5, 0.15 + s * 0.3, TZ)
  pon(g, geoCaja(4, 12, 14), rosa, TX - 12, 6, TZ)
  columnata(g, blanco, { n: 6, largo: 11, alto: 5, r: 0.35, x: TX - 14.2, y: 1.8, z: TZ, enZ: true })
  arcada(g, hueco, { ancho: 11, alto: 4, n: 3, x: TX - 14.05, y: 1.8, z: TZ, giro: -Math.PI / 2, hueco: 0.7 })
  pon(g, geoCaja(2.4, 0.5, 13), blanco, TX - 14.4, 7.3, TZ)
  for (let z = TZ - 6; z <= TZ + 6; z += 0.8) pon(g, geoCaja(0.12, 0.9, 0.12), blanco, TX - 15.5, 8, z)
  columnata(g, blanco, { n: 6, largo: 11, alto: 3.6, r: 0.28, x: TX - 14.2, y: 7.6, z: TZ, enZ: true })
  const fronton = sub(g, TX - 14, 0, TZ, Math.PI / 2)
  aguas(fronton, blanco, 13, 2.4, 1.6, 0, 12, 0)
  for (let x = -5; x <= 5; x += 2.5) pon(g, geoCaja(0.4, 1.2, 0.4), blanco, TX - 14, 15.3, TZ + x)

  // --- la cúpula de azulejos ---
  pon(g, geoCil(6.5, 7, 3, 32), rosa, TX + 3, 14.3, TZ)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    pon(g, geoCaja(0.9, 1.8, 0.1), hueco, TX + 3 + Math.cos(a) * 6.55, 14.3, TZ + Math.sin(a) * 6.55).rotation.y = Math.PI / 2 - a
  }
  pon(g, geoCil(7, 7, 0.5, 32), blanco, TX + 3, 16, TZ)
  const cupula = pon(g, geoCupula(6.6, 32, 16), mat(0x2f8f4a, 0.3, 0.2), TX + 3, 16.2, TZ)
  cupula.scale.y = 1.15
  // Las franjas de colores de la bandera en los gajos y los anillos.
  const colores = [0xe8c32e, 0x2d5fa8, 0x2f8f4a]
  for (let k = 0; k < 24; k++) {
    const gajo = pon(g, new THREE.TorusGeometry(6.62, 0.18, 4, 20, Math.PI), mat(colores[k % 3], 0.3, 0.2), TX + 3, 16.2, TZ)
    gajo.rotation.y = (k / 24) * Math.PI
    gajo.scale.y = 1.15
  }
  for (const [r, y] of [[6, 19.4], [4.6, 22.2]]) pon(g, new THREE.TorusGeometry(r, 0.25, 4, 32), mat(0xe8c32e, 0.3, 0.2), TX + 3, y, TZ).rotation.x = Math.PI / 2
  pon(g, geoCil(1, 1.2, 2, 12), blanco, TX + 3, 24.6, TZ)
  pon(g, geoCupula(1.1), mat(0xe8c32e, 0.3, 0.2), TX + 3, 25.6, TZ)
  pon(g, geoCil(0.05, 0.08, 1.4, 6), mat(0x2a2a2a), TX + 3, 27.2, TZ)

  // --- la iglesia de San Sebastián y las casas ---
  const IZ = -34
  pon(g, geoCaja(8, 9, 12), blanco, 10, 4.5, IZ)
  aguas(sub(g, 10, 0, IZ, Math.PI / 2), mat(0xa4553a, 0.85), 12.4, 3, 8.4, 0, 9, 0)
  pon(g, geoCaja(3.2, 16, 3.2), blanco, 5.8, 8, IZ - 3.5)
  pon(g, geoTronco(0.05, 1.6, 3), mat(0x2d5fa8, 0.5), 5.8, 17.5, IZ - 3.5)
  arcada(g, hueco, { ancho: 3, alto: 4, n: 1, x: 5.95, y: 0, z: IZ + 1.5, giro: -Math.PI / 2, hueco: 0.8 })
  for (let i = 0; i < 6; i++) {
    const c = sub(g, 36, 0, -40 + i * 16)
    const alto = azar(5, 8)
    pon(c, geoCaja(8, alto, 12), mat(elige([0xf2c14e, 0x4fb3bf, 0xef7b6b, 0xe8dcc0, 0x8fd18a]), 0.85), 0, alto / 2, 0)
    aguas(c, mat(0xa4553a, 0.85), 8.4, 1.8, 12.4, 0, alto, 0)
    ventanas(c, blanco, { ancho: 10, alto: alto - 1.5, filas: 2, columnas: 4, x: -4.05, y: 0.8, z: 0, giro: -Math.PI / 2, w: 1, h: 1.6 })
  }
  // La selva alrededor.
  for (let i = 0; i < 40; i++) arbol(g, azar(-12, 48), elige([azar(40, 52), azar(-52, -44)]), 'selva', azar(1, 1.4))
  for (let i = 0; i < 10; i++) arbol(g, azar(4, 8), azar(-24, 30), 'palmera', 1.1)
  bandera(g, 6, 20, 8, BANDERA_BRASIL)

  return colocar(g, -1, -62)
}
