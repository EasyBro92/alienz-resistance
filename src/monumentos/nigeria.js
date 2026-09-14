// Nigeria: Lagos, Abuja y Kano.
//
// Construidos a la derecha de la carretera; `colocar` refleja los de la
// izquierda.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, elige, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  aguas, arcada, ventanas, almenas, almenasRectas, columnata, explanada, cesped, estanque, arbol, gente,
  farola, bloques, casitas, coche, bandera, barca, colocar, sub, mar
} from './piezas.js'

const BANDERA_NIGERIA = [0x008751, 0xffffff, 0x008751]
const PIEL = 0x6b4a32

// Puesto de mercado: cuatro palos, un toldo de color y la mercancía.
function puesto (g, x, z, color) {
  const p = sub(g, x, 0, z, azar(-0.2, 0.2))
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pon(p, geoCil(0.05, 0.05, 2.4, 5), mat(0x6b543c), dx, 1.2, dz)
  pon(p, geoTronco(0.3, 1.5, 0.6), lamina(color, 0.8), 0, 2.6, 0)
  pon(p, geoCaja(1.8, 0.7, 1.6), mat(0x8a6a48, 0.9), 0, 0.35, 0)
  for (let i = 0; i < 6; i++) pon(p, geoBola(0.18, 6, 4), mat(elige([0xd9442e, 0xe8b92e, 0x5a9a3a, 0xe07a2e])), azar(-0.7, 0.7), 0.85, azar(-0.6, 0.6))
}

// Danfo: el microbús amarillo con franjas negras.
function danfo (g, x, z, giro = 0) {
  const b = sub(g, x, 0, z, giro)
  const amarillo = mat(0xf2c230, 0.6)
  const negro = mat(0x1d1d1d, 0.8)
  pon(b, geoCaja(2, 2, 4.6), amarillo, 0, 1.3, 0)
  for (const y of [0.9, 1.5]) pon(b, geoCaja(2.02, 0.15, 4.62), negro, 0, y, 0)
  pon(b, geoCaja(2.04, 0.6, 3.4), mat(0x2f3a42, 0.3, 0.3), 0, 1.95, -0.3)
  for (let i = 0; i < 3; i++) pon(b, geoCaja(0.7, 0.5, 0.9), mat(elige([0x8a6a48, 0x3b7fbf, 0xd9442e])), azar(-0.4, 0.4), 2.55, -1.2 + i * 1.2)
  for (const [dx, dz] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) pon(b, geoCil(0.4, 0.4, 0.3, 10), negro, dx, 0.4, dz).rotation.z = Math.PI / 2
}

// Lagos, a la derecha de la avenida: el Teatro Nacional de Iganmu, la gorra de
// general. El cuerpo octogonal bajo con su cristalera, el ala de la cubierta
// que se abre como una visera con sus costillas radiales, la corona central y
// la insignia; la explanada con las astas y las banderas; y alrededor Lagos:
// el paso elevado sobre pilares, los danfos, los puestos de mercado con toldos,
// las vallas publicitarias, las palmeras y la gente.
export function teatroNacional () {
  const g = new THREE.Group()
  const hormigon = mat(0xd9d4c8, 0.8)
  const blanco = mat(0xf2efe8, 0.7)
  const verde = mat(0x2f7a4a, 0.6)
  const TX = 28
  const TZ = 0

  // --- la explanada ---
  explanada(g, { x: TX - 4, z: TZ, ancho: 40, fondo: 64, color: 0xcfc6b4, juntas: 0xb9ae98, paso: 4 })
  cesped(g, { x: TX + 2, z: TZ + 24, ancho: 22, fondo: 10, color: 0x5f9a45 })

  // --- el teatro ---
  // Base: un tambor de ocho caras con el zócalo y la cristalera oscura.
  pon(g, geoCil(15, 16, 1.4, 8), hormigon, TX, 0.7, TZ)
  pon(g, geoCil(13, 13, 5, 8), vidrio(0x2a3a44), TX, 3.9, TZ)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    pon(g, geoCaja(0.4, 5, 0.4), hormigon, TX + Math.cos(a) * 13.1, 3.9, TZ + Math.sin(a) * 13.1)
  }
  pon(g, geoCil(14.5, 13, 1.2, 8), hormigon, TX, 7, TZ)
  // El ala de la gorra: un cono muy abierto que vuela por fuera del tambor.
  pon(g, geoCil(10, 19, 2.6, 32), blanco, TX, 8.9, TZ)
  pon(g, geoCil(19.2, 19.2, 0.4, 32), mat(0xc9c2b4, 0.7), TX, 7.6, TZ)
  // Las costillas radiales del ala, y las del casquete.
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2
    barra(g, hormigon, V(TX + Math.cos(a) * 10, 10.3, TZ + Math.sin(a) * 10), V(TX + Math.cos(a) * 19.1, 7.7, TZ + Math.sin(a) * 19.1), 0.35)
  }
  // El casquete: la copa de la gorra, alta y abombada, con los paneles verticales.
  pon(g, geoCil(9, 10, 3.5, 32), blanco, TX, 11.9, TZ)
  pon(g, geoCupula(9), blanco, TX, 13.6, TZ).scale.y = 0.35
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2
    pon(g, geoCaja(0.3, 3.5, 0.3), mat(0xc9c2b4, 0.7), TX + Math.cos(a) * 9.6, 11.9, TZ + Math.sin(a) * 9.6)
  }
  // La insignia en el frente (hacia la carretera): el escudo verde.
  pon(g, geoCaja(0.3, 2.4, 3), verde, TX - 9.9, 12, TZ)
  pon(g, geoCil(0.9, 0.9, 0.2, 14), mat(0xe2b23e, 0.3, 0.7), TX - 10.1, 12.2, TZ).rotation.z = Math.PI / 2
  // Las escalinatas de acceso a los cuatro lados.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI
    const e = sub(g, TX + Math.cos(a) * 17, 0, TZ + Math.sin(a) * 17, -a)
    for (let s = 0; s < 5; s++) pon(e, geoCaja(1, 0.28, 6), hormigon, -s * 0.6, 0.14 + s * 0.28, 0)
  }
  // Las astas con banderas delante.
  for (let i = 0; i < 6; i++) bandera(g, TX - 22, TZ - 10 + i * 4, 8, BANDERA_NIGERIA)
  gente(g, 50, { x0: TX - 24, x1: TX - 16, z0: TZ + 28, z1: TZ - 28, piel: PIEL })

  // --- el paso elevado ---
  const AX = -2
  pon(g, geoCaja(12, 1.2, 100), mat(0x9a9690, 0.9), AX, 8, TZ)
  pon(g, geoCaja(12.4, 0.8, 100), mat(0xbdb8b0, 0.9), AX, 8.9, TZ)
  for (const dx of [-5.8, 5.8]) pon(g, geoCaja(0.3, 0.9, 100), mat(0xd8d4cc, 0.9), AX + dx, 9.6, TZ)
  for (let z = -45; z <= 45; z += 15) {
    pon(g, geoCaja(2, 7.4, 2), mat(0xa39f98, 0.9), AX, 3.7, z)
    pon(g, geoCaja(10, 1, 2.4), mat(0xa39f98, 0.9), AX, 7.2, z)
  }
  for (let i = 0; i < 8; i++) {
    const c = sub(g, AX + elige([-3, 3]), 9.3, azar(-46, 46))
    if (Math.random() < 0.5) danfo(c, 0, 0, 0)
    else coche(c, 0, 0, 0)
  }

  // --- debajo y alrededor: danfos, mercado, vallas y palmeras ---
  for (let i = 0; i < 7; i++) danfo(g, azar(4, 8), 40 - i * 11 + azar(-2, 2), azar(-0.2, 0.2))
  const toldos = [0xd9442e, 0x2f6fbf, 0xe8b92e, 0x3f8a5a, 0xe07a2e]
  for (let i = 0; i < 14; i++) puesto(g, azar(8, 12), azar(-44, 44), toldos[i % toldos.length])
  gente(g, 80, { x0: -8, x1: 12, z0: 46, z1: -46, piel: PIEL })
  for (const z of [-30, 10]) {
    pon(g, geoCil(0.2, 0.25, 9, 8), mat(0x6d7278, 0.5, 0.5), TX + 20, 4.5, z)
    pon(g, geoCaja(0.4, 5, 10), mat(elige([0xd9442e, 0x2f6fbf, 0x3f8a5a]), 0.6), TX + 20, 10.5, z)
    pon(g, geoCaja(0.45, 3, 8), mat(0xf2efe6, 0.6), TX + 19.95, 10.5, z)
  }
  for (let i = 0; i < 16; i++) arbol(g, azar(10, 48), elige([azar(34, 46), azar(-46, -34)]), 'palmera', 1)
  const fila = []
  for (let z = -40; z <= 40; z += 10) fila.push([TX + 28, z, 9, azar(12, 20), 8])
  bloques(g, fila, 1, { colores: [0xe0d6c0, 0xcfc4ae, 0xd9a878, 0xb8c4c8] })

  // Con avenida el mundo no lo recoloca: el paso elevado queda junto a la acera.
  g.position.set(18, 0, -64)
  g.userData.lados = [1]
  return g
}

// Abuja, a la derecha: la Mezquita Nacional. La gran cúpula dorada con sus
// nervios sobre el tambor de ventanas, las cúpulas doradas menores, los cuatro
// minaretes altísimos con sus balcones y remate verde, el cuerpo blanco con
// arcadas, el patio con fuentes y los jardines, y Aso Rock asomando detrás.
export function mezquitaNacional () {
  const g = new THREE.Group()
  const blanca = mat(0xf0ece2, 0.75)
  const blancaSombra = mat(0xd9d3c6, 0.8)
  const oro = mat(0xe0b23a, 0.25, 0.75)
  const oroOscuro = mat(0xb8903a, 0.4, 0.6)
  const verde = mat(0x2f7a4a, 0.5, 0.2)
  const hueco = mat(0x3a3a3a, 1)

  explanada(g, { x: 14, z: 0, ancho: 52, fondo: 80, color: 0xe6dfd0, juntas: 0xcfc6b4, paso: 4 })
  // Los jardines y las fuentes del patio.
  cesped(g, { x: -4, z: 18, ancho: 12, fondo: 20, color: 0x5f9a45 })
  cesped(g, { x: -4, z: -18, ancho: 12, fondo: 20, color: 0x5f9a45 })
  for (const z of [18, -18]) {
    estanque(g, { x: -4, z, ancho: 5, fondo: 5, redondo: true, color: 0x3fa3cc })
    pon(g, geoCil(0.3, 0.5, 1.4, 10), blanca, -4, 1, z)
  }
  for (let z = 36; z > -38; z -= 6) arbol(g, -12, z, 'palmera', 1)
  gente(g, 45, { x0: -10, x1: 4, z0: 36, z1: -36, piel: PIEL })

  // --- el cuerpo de la mezquita ---
  const MX = 18
  pon(g, geoCaja(26, 7, 30), blanca, MX, 3.5, 0)
  pon(g, geoCaja(27, 0.8, 31), blancaSombra, MX, 7.4, 0)
  for (const [x, z, giro, ancho] of [[MX - 13.05, 0, -Math.PI / 2, 26], [MX, 15.05, 0, 22], [MX, -15.05, Math.PI, 22]]) {
    arcada(g, hueco, { ancho, alto: 4.5, n: 9, x, y: 0.3, z, giro })
  }
  // Pórtico de entrada con tres arcos altos.
  pon(g, geoCaja(4, 10, 14), blanca, MX - 14, 5, 0)
  arcada(g, hueco, { ancho: 12, alto: 7.5, n: 3, x: MX - 16.05, y: 0.3, z: 0, giro: -Math.PI / 2, hueco: 0.7 })
  for (const dz of [-6.5, 6.5]) {
    pon(g, geoCil(0.6, 0.6, 11, 10), blanca, MX - 16, 5.5, dz)
    pon(g, geoCupula(0.7), oro, MX - 16, 11, dz)
  }

  // --- la gran cúpula ---
  pon(g, geoCil(9, 9.5, 4, 32), blanca, MX, 9.8, 0)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    arcada(g, hueco, { ancho: 1.4, alto: 2.4, n: 1, x: MX + Math.cos(a) * 9.1, y: 8.6, z: Math.sin(a) * 9.1, giro: Math.PI / 2 - a, hueco: 0.8 })
  }
  pon(g, geoCil(9.4, 9.4, 0.6, 32), oroOscuro, MX, 12, 0)
  const cupula = pon(g, geoCupula(9.2, 32, 16), oro, MX, 12.3, 0)
  cupula.scale.y = 1.15
  for (let k = 0; k < 16; k++) {
    const n = pon(g, new THREE.TorusGeometry(9.22, 0.12, 4, 24, Math.PI), oroOscuro, MX, 12.3, 0)
    n.rotation.y = (k / 16) * Math.PI
    n.scale.y = 1.15
  }
  pon(g, geoCil(0.6, 1.2, 1.4, 12), oroOscuro, MX, 23.5, 0)
  pon(g, geoCil(0.08, 0.1, 2.4, 6), oro, MX, 25.4, 0)
  pon(g, new THREE.TorusGeometry(0.5, 0.08, 4, 14, Math.PI * 1.4), oro, MX, 26.8, 0)
  // Cúpulas menores en las esquinas del cuerpo.
  for (const [dx, dz] of [[-8, -10], [-8, 10], [8, -10], [8, 10]]) {
    pon(g, geoCil(2.4, 2.4, 1.4, 16), blanca, MX + dx, 8.5, dz)
    pon(g, geoCupula(2.5), oro, MX + dx, 9.2, dz).scale.y = 1.2
    pon(g, geoCil(0.05, 0.08, 1, 6), oro, MX + dx, 12.6, dz)
  }

  // --- los cuatro minaretes ---
  for (const [dx, dz] of [[-17, -20], [-17, 20], [17, -20], [17, 20]]) {
    const x = MX + dx
    pon(g, geoCaja(3, 3, 3), blanca, x, 1.5, dz)
    pon(g, geoCil(0.9, 1.1, 30, 12), blanca, x, 18, dz)
    for (const y of [12, 21, 29]) {
      pon(g, geoCil(1.6, 1.1, 0.8, 12), blancaSombra, x, y, dz)
      pon(g, new THREE.TorusGeometry(1.5, 0.08, 4, 16), oroOscuro, x, y + 0.6, dz).rotation.x = Math.PI / 2
    }
    for (let y = 4; y < 30; y += 2.2) pon(g, geoCaja(0.3, 1, 0.1), hueco, x - 0.95, y, dz)
    pon(g, geoCil(0.9, 0.9, 2.2, 12), blanca, x, 34.1, dz)
    pon(g, geoCil(0.02, 1, 2.8, 12), verde, x, 36.6, dz)
    pon(g, geoCil(0.05, 0.05, 1, 6), oro, x, 38.4, dz)
  }

  // --- Aso Rock detrás ---
  pon(g, new THREE.DodecahedronGeometry(14, 1), mat(0x6e6258, 1), MX + 44, 6, -8).scale.set(1, 1.1, 1.8)
  for (let i = 0; i < 14; i++) arbol(g, MX + azar(30, 40), azar(-34, 22), 'selva', 0.9)
  bandera(g, -8, 0, 10, BANDERA_NIGERIA)

  return colocar(g, 1, -62)
}

// Casa hausa de adobe: cubo de barro con los cuernos (zanko) en las esquinas del
// tejado plano, relieves geométricos en la fachada y la puerta en arco.
function casaHausa (g, x, z, ancho, alto, fondo, color) {
  const adobe = mat(color, 1)
  const relieve = mat(0x8a5a32, 1)
  pon(g, geoCaja(ancho, alto, fondo), adobe, x, alto / 2, z)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pon(g, geoCil(0.05, 0.35, 1.2, 6), adobe, x + dx * (ancho / 2 - 0.3), alto + 0.6, z + dz * (fondo / 2 - 0.3))
  pon(g, geoCaja(0.08, 0.3, fondo * 0.7), relieve, x - ancho / 2 - 0.04, alto - 0.8, z)
  for (let i = 0; i < 3; i++) pon(g, geoCaja(0.08, 0.5, 0.5), relieve, x - ancho / 2 - 0.04, alto * 0.6, z - fondo * 0.25 + i * fondo * 0.25).rotation.x = Math.PI / 4
  pon(g, geoCaja(0.08, 1.8, 1), mat(0x3a2414, 1), x - ancho / 2 - 0.04, 0.9, z)
}

// Kano, a la izquierda: la muralla de adobe con la puerta de Kofar Mata —el
// gran arco, los relieves hausa y los cuernos de las torres—, los pozos de
// tinte añil de Kofar Mata al pie, con las telas tendidas, el barrio de casas
// hausa con sus cuernos, el mercado, los burros y camellos, y los neem.
export function puertaAdobe () {
  const g = new THREE.Group()
  const adobe = mat(0xb9793f, 1)
  const adobeClaro = mat(0xc98d52, 1)
  const relieve = mat(0x8a5a32, 1)
  const hueco = mat(0x2e1c10, 1)

  explanada(g, { x: 10, z: 0, ancho: 50, fondo: 90, color: 0xc9955e, juntas: null })

  // --- los pozos de tinte ---
  for (let i = 0; i < 14; i++) {
    const x = -8 + (i % 7) * 2.8
    const z = 26 + Math.floor(i / 7) * 3
    pon(g, geoCil(1.1, 1.1, 0.35, 14), mat(0x7a5a3a, 1), x, 0.18, z)
    pon(g, geoCil(0.9, 0.9, 0.37, 14), mat(elige([0x1f2f7a, 0x2b3f8f, 0x16235a]), 0.4), x, 0.2, z)
  }
  // Las telas añil tendidas a secar.
  for (let i = 0; i < 5; i++) {
    const z = 36 + i * 2.2
    pon(g, geoCil(0.05, 0.05, 2.6, 5), mat(0x6b543c), -9, 1.3, z)
    pon(g, geoCil(0.05, 0.05, 2.6, 5), mat(0x6b543c), 9, 1.3, z)
    pon(g, geoCaja(17, 0.02, 0.02), mat(0x4a3a2a), 0, 2.55, z)
    for (let k = 0; k < 6; k++) pon(g, geoCaja(2, 1.8, 0.03), lamina(elige([0x1f2f7a, 0x2b3f8f, 0x3b5fbf, 0xe8e2d4]), 0.9), -7 + k * 2.8, 1.6, z)
  }
  gente(g, 25, { x0: -10, x1: 10, z0: 44, z1: 22, piel: PIEL })

  // --- la muralla y la puerta ---
  const MZ = 8
  pon(g, geoCaja(4, 8, 90), adobe, 14, 4, 0)
  for (let z = -44; z <= 44; z += 1.6) pon(g, geoCil(0.1, 0.45, 1, 6), adobe, 12.3, 8.4, z)
  // Torres de la puerta con cuernos.
  for (const dz of [-6, 6]) {
    pon(g, geoCaja(7, 13, 5), adobeClaro, 13, 6.5, MZ + dz)
    for (const [dx, ddz] of [[-3.2, -2.2], [-3.2, 2.2], [3.2, -2.2], [3.2, 2.2]]) pon(g, geoCil(0.05, 0.5, 1.8, 6), adobeClaro, 13 + dx, 13.9, MZ + dz + ddz)
    // Relieves hausa: rombos, espirales y el nudo de Salomón.
    for (let f = 0; f < 4; f++) {
      for (let c = 0; c < 3; c++) {
        pon(g, geoCaja(0.1, 0.8, 0.8), relieve, 9.45, 2.5 + f * 2.4, MZ + dz - 1.4 + c * 1.4).rotation.x = Math.PI / 4
      }
    }
    pon(g, new THREE.TorusGeometry(0.7, 0.12, 4, 14), relieve, 9.4, 11, MZ + dz).rotation.y = Math.PI / 2
  }
  // El paso: arco apuntado y las hojas de madera.
  pon(g, geoCaja(6, 9, 7), adobe, 13, 4.5, MZ)
  pon(g, geoCaja(0.1, 5, 4), hueco, 9.95, 2.5, MZ)
  pon(g, geoTronco(0.02, 2, 2.4).scale(0.05, 1, 1), hueco, 9.95, 6.2, MZ)
  for (const s of [-1, 1]) pon(g, geoCaja(0.2, 5, 1.8), mat(0x5a3a22, 0.9), 9.8, 2.5, MZ + s * 2.4).rotation.y = s * 0.6
  pon(g, geoCaja(0.12, 0.6, 7.2), relieve, 9.96, 7.4, MZ)
  bandera(g, 13, MZ, 5, BANDERA_NIGERIA, 9)

  // --- el barrio ---
  const colores = [0xb9793f, 0xc98d52, 0xa86a34, 0xc28550]
  for (let i = 0; i < 22; i++) {
    casaHausa(g, azar(20, 42), azar(-42, 42), azar(4, 7), azar(3.5, 6), azar(4, 7), elige(colores))
  }
  // El mercado dentro de la muralla y fuera, junto a la carretera.
  const toldos = [0xd9442e, 0x2f6fbf, 0xe8b92e, 0x3f8a5a]
  for (let i = 0; i < 10; i++) puesto(g, azar(-6, 6), azar(-40, 16), toldos[i % toldos.length])
  gente(g, 60, { x0: -10, x1: 10, z0: 18, z1: -42, piel: PIEL })
  // Burros y camellos.
  const pelo = mat(0x7f7266, 0.95)
  for (let i = 0; i < 5; i++) {
    const b = sub(g, azar(-9, 8), 0, azar(-40, 16), azar(0, 3))
    pon(b, geoCaja(0.5, 0.6, 1.2), pelo, 0, 0.9, 0)
    pon(b, geoCaja(0.3, 0.6, 0.35), pelo, 0, 1.3, 0.7).rotation.x = -0.5
    for (const [dx, dz] of [[-0.2, -0.45], [0.2, -0.45], [-0.2, 0.45], [0.2, 0.45]]) pon(b, geoCil(0.05, 0.05, 0.6, 5), pelo, dx, 0.3, dz)
    pon(b, geoCaja(0.8, 0.5, 0.6), mat(0x8a6a48, 0.9), 0, 1.4, 0)
  }
  for (let i = 0; i < 12; i++) arbol(g, azar(-12, 44), azar(-44, 44), 'copa', 1.2)

  return colocar(g, -1, -62)
}
