// Los sitios donde se juega.
//
// Isidro: «que no siempre sea una carretera sin más en medio de un lugar en el
// que no existen. Busca fotos en internet y recrea plazas, puentes, ciudades».
// Tenía razón: había treinta y nueve misiones repartidas por el mundo y casi
// todas eran el mismo tramo de asfalto con un monumento asomando por detrás.
//
// Aquí están los NUEVE tipos de lugar que cubren el mundo del juego —plaza,
// paseo marítimo, puente, avenida, muelle, explanada, isla, mirador y carretera
// de campo— y en `ciudades.js` está cómo se viste cada uno para cada ciudad.
// Nueve tipos y no treinta y nueve sitios a mano por una razón medida: el
// estadio de Madrid, construido pieza a pieza, fueron casi doce mil piezas y
// ocho segundos de pantalla congelada. Un tipo bien hecho y vestido distinto se
// reconoce igual y cuesta lo que el móvil puede pagar.
//
// LA REGLA QUE NO SE ROMPE: nada macizo dentro del pasillo por donde andan los
// bichos. El pasillo es |x| < 6,6 y z entre -52 y 8. Se comprueba con
// `herramientas/pasillo-libre.mjs`, que recorre los vértices de verdad —los
// escenarios se funden en una sola malla y `Box3.setFromObject` devuelve la
// caja del grupo entero, que no sirve para esto—. Los pilares del puente de
// Vladivostok estaban a 5,2 y los aliens llegaban a 4,71: los atravesaban.

import * as THREE from 'three'
import { CON_EXTRAS, seg } from './systems/detalle.js'

// --- piezas ------------------------------------------------------------------

export const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness })

export const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  g.add(m)
  return m
}

// El pasillo libre. Todo lo que se construya con altura tiene que quedar fuera.
export const LIBRE_X = 6.6
// Lo ancho que es cada tipo de sitio, de eje a primera fachada. Una ciudad puede
// pedir el suyo con `desdeX`.
const ANCHOS = { plaza: 17, paseo: 12.5, avenida: 13, muelle: 12.5 }
// Donde empieza el mobiliario de calle: farolas, barandillas, bolardos, troncos.
// Es LA raya. Un poste en 6,9 se lo encuentra el bicho que más se aparta (medido
// con `herramientas/pasillo-libre.mjs`); en 7,4 el más gordo deja sitio.
const FUERA = 7.4
const fuera = x => Math.max(FUERA, x)
export const LIBRE_Z0 = 8
export const LIBRE_Z1 = -52

// Hasta dónde se construye. La niebla cierra del todo a unos 152 de la cámara
// (que está en z≈22), así que más allá de -150 no se ve nada y solo cuesta.
const LARGO = 260
const DESDE_Z = 26
const HASTA_Z = -150

// Azar repetible: el mismo sitio se ve igual cada vez que se entra. Con
// `Math.random()` los edificios de Roma cambiaban de altura entre partidas, y
// eso hace que un sitio no se recuerde como un sitio.
function dado (semilla) {
  let s = semilla | 0
  return () => {
    s = (s * 1664525 + 1013904223) | 0
    return ((s >>> 8) & 0xffff) / 0xffff
  }
}

// El suelo por donde se anda. Una losa grande y ancha; lo que la hace de un
// sitio o de otro es el tono y lo que lleva encima.
function suelo (g, v) {
  const piso = mat(v.tono ?? 0x9a958d, v.brillo ?? 0.9)
  const s = pon(g, new THREE.PlaneGeometry(v.ancho ?? 40, LARGO), piso, 0, 0.005, (DESDE_Z + HASTA_Z) / 2)
  s.rotation.x = -Math.PI / 2
  return s
}

// Una fila de edificios a un lado. Es la pieza más usada del módulo: lo que
// distingue a Roma de Moscú no es la forma de la plaza, son estas fachadas.
//
// `estilo` cambia la silueta y los añadidos:
//   europeo     · cinco o seis alturas, cornisa, balcones y persianas
//   colonial    · tres plantas, arcadas abajo, tejado plano con pretil
//   moderno     · bloques lisos con bandas de ventanas
//   rascacielos · torres muy altas y estrechas, escalonadas
//   adobe       · muros de barro redondeados, sin ventanas casi
//   chino       · bloques con tejado de alero y letreros verticales
//   indio       · bloques bajos apiñados, toldos y depósitos de agua arriba
//   neon        · como rascacielos pero con pantallas por toda la fachada
function fachadas (g, v, lado, desdeX, opciones = {}) {
  const az = dado(v.semilla + lado * 77 + (opciones.fila ?? 0) * 13)
  const estilo = opciones.estilo ?? v.estilo ?? 'europeo'
  const paleta = opciones.paleta ?? v.paleta ?? [0xd8cfc0, 0xc9b9a4, 0xbfae9a]
  const [hMin, hMax] = opciones.alturas ?? v.alturas ?? [9, 18]
  const z0 = opciones.z0 ?? DESDE_Z
  const z1 = opciones.z1 ?? HASTA_Z
  const ventana = mat(estilo === 'neon' ? 0x1b2330 : 0x39414d, 0.5, 0.15)
  const remate = mat(opciones.remate ?? 0xb4a893, 0.85)

  let z = z0
  while (z > z1) {
    const fondo = 7 + az() * 9          // lo que mide el edificio de largo
    const alto = hMin + az() * (hMax - hMin)
    const grueso = estilo === 'rascacielos' || estilo === 'neon' ? 14 : 10
    const x = lado * (desdeX + grueso / 2)
    const cuerpo = mat(paleta[(az() * paleta.length) | 0], 0.88)
    pon(g, new THREE.BoxGeometry(grueso, alto, fondo), cuerpo, x, alto / 2, z - fondo / 2)

    // La cornisa o el pretil: es lo que hace que un cubo parezca un edificio.
    if (estilo === 'europeo' || estilo === 'colonial') {
      pon(g, new THREE.BoxGeometry(grueso + 0.7, 0.5, fondo + 0.7), remate, x, alto + 0.2, z - fondo / 2)
    }
    if (estilo === 'europeo' && az() > 0.5) {
      // Tejado a dos aguas, girado para que la cumbrera vaya con la calle.
      const t = pon(g, new THREE.CylinderGeometry(grueso * 0.62, grueso * 0.62, fondo, 3, 1),
        mat(opciones.tejado ?? 0x8d5c3f, 0.9), x, alto + 1.3, z - fondo / 2)
      t.rotation.z = Math.PI / 2
      t.rotation.y = Math.PI / 2
      t.scale.y = 0.5
    }
    if (estilo === 'chino') {
      const t = pon(g, new THREE.BoxGeometry(grueso + 2.4, 0.6, fondo + 2.4), mat(0x7a2f28, 0.9), x, alto + 0.4, z - fondo / 2)
      t.rotation.x = 0
    }
    if (estilo === 'adobe') {
      // Nada de ventanas ni cornisa: un muro de barro con contrafuertes y los
      // palos de andamio permanentes que asoman, que es lo que se ve en
      // cualquier foto de la muralla de Kano o de Djenne.
      for (let k = 0; k < 3; k++) {
        const zc = z - 1.5 - k * (fondo - 3) / 2
        pon(g, new THREE.BoxGeometry(1.4, alto * 0.9, 1.4), cuerpo, x - lado * (grueso / 2), alto * 0.45, zc)
        pon(g, new THREE.CylinderGeometry(0.1, 0.1, 2.2, 4), mat(0x6e5335, 0.9),
          x - lado * (grueso / 2 + 0.7), alto * 0.8, zc)
      }
      pon(g, new THREE.BoxGeometry(grueso * 0.3, 1.6, fondo * 0.3), cuerpo, x, alto + 0.8, z - fondo / 2)
    }
    if (estilo === 'indio') {
      // Los depósitos de agua negros de las azoteas, que en Bombay están en
      // todos los tejados y se ven desde cualquier foto de la ciudad.
      for (let k = 0; k < 2; k++) {
        pon(g, new THREE.CylinderGeometry(0.5, 0.5, 0.9, seg(7)), mat(0x2b2b2e, 0.8),
          x + (az() - 0.5) * grueso * 0.6, alto + 0.45, z - fondo / 2 + (az() - 0.5) * fondo * 0.6)
      }
    }

    // Las ventanas. Una sola pieza alargada por planta y no un cristal por
    // hueco: a la distancia de juego se ve igual y cuesta la décima parte.
    const plantas = estilo === 'adobe' ? 0 : Math.max(1, Math.floor(alto / 3.2))
    for (let p = 0; p < plantas; p++) {
      const y = 2 + p * 3.2
      if (y > alto - 1) break
      pon(g, new THREE.BoxGeometry(0.2, estilo === 'neon' ? 2.2 : 1.5, fondo * 0.82), ventana,
        x - lado * (grueso / 2 + 0.06), y, z - fondo / 2)
      if (estilo === 'europeo' && p > 0 && az() > 0.45) {
        // Un balcón corrido, que es lo que se ve en cualquier calle del sur de
        // Europa y lo que más se echa en falta si no está.
        pon(g, new THREE.BoxGeometry(0.7, 0.14, fondo * 0.5), remate,
          x - lado * (grueso / 2 + 0.3), y - 0.8, z - fondo / 2)
      }
    }
    if (estilo === 'colonial') {
      // La arcada de la planta baja: tres o cuatro pilares y el dintel.
      for (let k = 0; k < 4; k++) {
        pon(g, new THREE.BoxGeometry(0.5, 3, 0.5), remate,
          x - lado * (grueso / 2 - 0.3), 1.5, z - 1.2 - k * (fondo - 2.4) / 3)
      }
    }
    z -= fondo + 0.6 + az() * 1.5
  }
}

// El agua. Un plano grande y bajo; lo que la vende es que se vea el borde y que
// se mueva un poco (`userData.ola`, que mueve el mundo por su cuenta).
function agua (g, y, tono, lado = 0, desdeX = 12) {
  const m = new THREE.MeshStandardMaterial({ color: tono, roughness: 0.2, metalness: 0.4 })
  const anchos = lado === 0 ? [-1, 1] : [lado]
  for (const l of anchos) {
    const p = pon(g, new THREE.PlaneGeometry(420, 520), m, l * (desdeX + 210), y, -110)
    p.rotation.x = -Math.PI / 2
  }
  return m
}

// La barandilla o el pretil del borde. Sin esto, un paseo marítimo es una
// carretera con el mar pintado al lado.
function barandilla (g, lado, x, estilo = 'hierro', z0 = DESDE_Z, z1 = HASTA_Z) {
  const largo = z0 - z1
  const zc = (z0 + z1) / 2
  x = fuera(x)
  if (estilo === 'muro') {
    pon(g, new THREE.BoxGeometry(0.6, 1.1, largo), mat(0xcfc6b4, 0.9), lado * x, 0.55, zc)
    return
  }
  const barra = mat(estilo === 'piedra' ? 0xd9d2c2 : 0x2f3338, 0.6, estilo === 'piedra' ? 0 : 0.3)
  pon(g, new THREE.BoxGeometry(0.16, 0.14, largo), barra, lado * x, 1.05, zc)
  pon(g, new THREE.BoxGeometry(0.12, 0.1, largo), barra, lado * x, 0.6, zc)
  for (let z = z0; z > z1; z -= 3.4) {
    pon(g, new THREE.BoxGeometry(0.14, 1.1, 0.14), barra, lado * x, 0.55, z)
  }
}

// Las farolas. Van siempre fuera del pasillo y con el brazo hacia dentro.
function farolas (g, lado, x, estilo = 'recta', paso = 14) {
  x = fuera(x)
  const poste = mat(estilo === 'fernandina' ? 0x23282c : 0x4e545a, 0.6, 0.3)
  const luz = new THREE.MeshStandardMaterial({ color: 0xffeec2, emissive: 0xffe2a0, emissiveIntensity: 0.6, roughness: 0.4 })
  for (let z = DESDE_Z - 6; z > -96; z -= paso) {
    const alto = estilo === 'fernandina' ? 4.4 : 7
    pon(g, new THREE.CylinderGeometry(0.11, 0.16, alto, seg(7)), poste, lado * x, alto / 2, z)
    if (estilo === 'fernandina') {
      pon(g, new THREE.SphereGeometry(0.34, seg(8), seg(6)), luz, lado * x, alto + 0.3, z)
    } else {
      const brazo = pon(g, new THREE.BoxGeometry(1.5, 0.12, 0.12), poste, lado * (x - 0.7), alto, z)
      brazo.rotation.z = lado * 0.08
      pon(g, new THREE.BoxGeometry(0.8, 0.16, 0.34), luz, lado * (x - 1.4), alto - 0.06, z)
    }
  }
}

// Los árboles. Tres siluetas, que es lo que de verdad cambia de una ciudad a
// otra: la palmera del Caribe, el plátano de sombra europeo y el pino.
function arboles (g, lado, x, tipo = 'copa', paso = 16) {
  x = fuera(x)
  const tronco = mat(tipo === 'palmera' ? 0x8a7350 : tipo === 'olivo' ? 0x7d7360 : 0x5a4636, 0.9)
  const hoja = mat(
    tipo === 'pino' ? 0x2c4a33
      : tipo === 'palmera' ? 0x4c7f43
        : tipo === 'olivo' ? 0x7f8b6a          // el olivo tira a gris, no a verde
          : tipo === 'jacaranda' ? 0x7d6bb0    // los jacarandas de Reforma en flor
            : 0x3f6b3c, 0.95)
  const az = dado((x * 31 + lado * 7) | 0)
  for (let z = DESDE_Z - 10; z > -104; z -= paso) {
    const alto = (tipo === 'palmera' ? 7 : 5.5) + az() * 2.5
    pon(g, new THREE.CylinderGeometry(0.16, 0.26, alto, seg(7)), tronco, lado * x, alto / 2, z)
    if (tipo === 'palmera') {
      for (let h = 0; h < 6; h++) {
        const a = (h / 6) * Math.PI * 2 + az()
        const f = pon(g, new THREE.BoxGeometry(2.8, 0.1, 0.5), hoja,
          lado * x + Math.cos(a) * 1.3, alto - 0.1, z + Math.sin(a) * 1.3)
        f.rotation.y = -a
        f.rotation.z = -0.35
      }
    } else if (tipo === 'pino') {
      for (let k = 0; k < 3; k++) {
        const r = 2.1 - k * 0.5
        pon(g, new THREE.ConeGeometry(r, 2.4, seg(8)), hoja, lado * x, alto * 0.55 + k * 1.5, z)
      }
    } else {
      const c = pon(g, new THREE.SphereGeometry(1.9 + az() * 0.6, seg(9), seg(7)), hoja, lado * x, alto + 0.6, z)
      c.scale.y = 0.8
    }
  }
}

// Coches parados. Isidro los quiso quietos: «árboles sí, coches parados».
function coches (g, lado, x, paleta = [0x8d2a2a, 0x24405e, 0xd9d4cc, 0x2c2f33], paso = 11) {
  const az = dado((x * 17 + lado * 5) | 0)
  const cristal = mat(0x2b3440, 0.4, 0.3)
  for (let z = DESDE_Z - 8; z > -78; z -= paso) {
    if (az() > 0.72) continue
    const color = mat(paleta[(az() * paleta.length) | 0], 0.5, 0.25)
    pon(g, new THREE.BoxGeometry(1.8, 0.75, 4.2), color, lado * x, 0.55, z)
    pon(g, new THREE.BoxGeometry(1.65, 0.6, 2.1), cristal, lado * x, 1.2, z - 0.2)
    for (const [dx, dz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) {
      const r = pon(g, new THREE.CylinderGeometry(0.32, 0.32, 0.22, seg(8)), mat(0x1b1b1d, 0.9),
        lado * x + dx, 0.32, z + dz)
      r.rotation.z = Math.PI / 2
    }
  }
}

// Lo que cierra el fondo. Sin esto los bichos salen de un vacío gris y el sitio
// se acaba en nada.
function cierre (g, v) {
  const z = -95
  if (v.cierre === 'monte') {
    const roca = mat(v.tonoMonte ?? 0x6d7264, 0.95)
    const az = dado(v.semilla + 3)
    for (let i = 0; i < 8; i++) {
      // El radio manda en la z: una media esfera de 86 puesta en -95 llega por
      // delante hasta z = -9, o sea que los bichos suben andando por el monte.
      // Se planta de forma que su falda quede SIEMPRE detrás de -58.
      const r = 26 + az() * 22
      const c = pon(g, new THREE.SphereGeometry(r, seg(10), seg(7), 0, Math.PI * 2, 0, Math.PI / 2),
        roca, (az() - 0.5) * 230, -2, Math.min(z, -58 - r) - az() * 22)
      c.scale.y = 0.55 + az() * 0.5
    }
  } else if (v.cierre === 'perfil') {
    // Un perfil de torres propio del sitio, no el genérico de antes. Las
    // alturas vienen en `v.perfil` para que Manhattan no se parezca a Lagos.
    const az = dado(v.semilla + 9)
    const torre = mat(v.tonoPerfil ?? 0x8e97a4, 0.85)
    const alturas = v.perfil ?? [26, 34, 48, 30, 40]
    for (let i = 0; i < 22; i++) {
      const h = alturas[i % alturas.length] * (0.7 + az() * 0.6)
      pon(g, new THREE.BoxGeometry(9 + az() * 9, h, 9 + az() * 9), torre,
        (az() - 0.5) * 260, h / 2 - 2, z - 8 - az() * 46)
    }
  } else if (v.cierre === 'fachada') {
    // Al fondo sí se cierra el eje: los edificios de la acera de enfrente, que
    // es lo que se ve al final de cualquier calle.
    fachadas(g, v, 1, 5, { z0: z + 10, z1: z - 26, alturas: v.alturas })
    fachadas(g, v, -1, 5, { z0: z + 10, z1: z - 26, alturas: v.alturas })
  }
  // 'nada' o 'agua': el horizonte lo cierran la niebla y el agua.
}

// El arco, la puerta o el pórtico por donde entran. Va a z = -56, justo detrás
// de donde aparecen: se ve entrar a los bichos por él y no estorba el pasillo.
function puerta (g, v) {
  if (!v.puerta) return
  const z = -56
  const piedra = mat(v.tonoPuerta ?? 0xd6cbb4, 0.9)
  if (v.puerta === 'arco') {
    pon(g, new THREE.BoxGeometry(2.6, 14, 4), piedra, -8.4, 7, z)
    pon(g, new THREE.BoxGeometry(2.6, 14, 4), piedra, 8.4, 7, z)
    const a = pon(g, new THREE.TorusGeometry(5, 1.3, seg(8), seg(14), Math.PI), piedra, 0, 13.6, z)
    a.rotation.z = 0
    pon(g, new THREE.BoxGeometry(22, 2.2, 4.4), piedra, 0, 15.6, z)
  } else if (v.puerta === 'pilonos') {
    // Los pilonos de un templo egipcio: dos moles inclinadas y el hueco entre
    // ellas. Es la silueta de Karnak y de Luxor.
    for (const l of [-1, 1]) {
      const p = pon(g, new THREE.BoxGeometry(9, 16, 5), piedra, l * 12, 8, z)
      p.scale.x = 1
      p.rotation.z = l * 0.035
    }
  } else if (v.puerta === 'paifang') {
    const rojo = mat(0x8d2b24, 0.9)
    for (const l of [-1, 1]) pon(g, new THREE.BoxGeometry(1.2, 12, 1.2), rojo, l * 9, 6, z)
    pon(g, new THREE.BoxGeometry(20, 1, 2.4), rojo, 0, 10.5, z)
    pon(g, new THREE.BoxGeometry(23, 0.7, 3.4), mat(0x3f6b3c, 0.9), 0, 11.6, z)
  }
}

// --- los nueve tipos ---------------------------------------------------------

// 1. PLAZA. Empedrado, fachadas cerrando los dos lados y el fondo, y lo que
// haga famosa a la plaza puesto al final por `hitos` o por `remate`.
export function plaza (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 46 })
  fachadas(g, v, 1, v.desdeX ?? ANCHOS.plaza, v.lados?.[0] ?? {})
  fachadas(g, v, -1, v.desdeX ?? ANCHOS.plaza, v.lados?.[1] ?? {})
  if (v.cierre === undefined) v.cierre = 'fachada'
  cierre(g, v)
  puerta(g, v)
  if (v.farolas) { farolas(g, 1, 10, v.farolas, 24); farolas(g, -1, 10, v.farolas, 24) }
  if (v.arboles) { arboles(g, 1, 12, v.arboles, 20); arboles(g, -1, 12, v.arboles, 20) }
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 2. PASEO MARÍTIMO. Agua y arena a un lado, ciudad al otro. El suelo es la
// baldosa del paseo, que en Copacabana y en Manaos es la misma onda portuguesa.
export function paseo (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 30 })
  const ladoMar = v.ladoMar ?? -1
  const ladoCiudad = -ladoMar

  // La playa y el mar. La arena baja un poco desde el paseo.
  if (v.arena !== false) {
    const arena = pon(g, new THREE.PlaneGeometry(40, LARGO), mat(v.tonoArena ?? 0xe6d6b0, 0.95),
      ladoMar * 28, -0.6, (DESDE_Z + HASTA_Z) / 2)
    arena.rotation.x = -Math.PI / 2
    // Las hamacas y las sombrillas, solo en ultra: el sitio se reconoce sin
    // ellas y son cuarenta piezas más.
    if (CON_EXTRAS) {
      const az = dado(v.semilla + 21)
      const lona = mat(v.tonoSombrilla ?? 0xd9d2c2, 0.9)
      for (let i = 0; i < 16; i++) {
        const x = ladoMar * (12 + az() * 30)
        const z = 10 - az() * 120
        pon(g, new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4), mat(0x8a7350, 0.9), x, 0.6, z)
        const s = pon(g, new THREE.ConeGeometry(1.8, 0.7, seg(9)), lona, x, 2, z)
        s.rotation.y = az()
      }
    }
  }
  agua(g, -1.2, v.tonoAgua ?? 0x2f6f86, ladoMar, v.arena === false ? 8 : 46)
  barandilla(g, ladoMar, 7.2, v.pretil ?? 'piedra')

  const desdeX = v.desdeX ?? ANCHOS.paseo
  fachadas(g, v, ladoCiudad, desdeX)
  if (v.doblefila) fachadas(g, v, ladoCiudad, desdeX + 12, { fila: 1, alturas: [(v.alturas?.[0] ?? 9) + 6, (v.alturas?.[1] ?? 18) + 12] })
  farolas(g, ladoCiudad, 8.4, v.farolas ?? 'recta', 18)
  if (v.arboles) arboles(g, ladoCiudad, 10.2, v.arboles, 17)
  if (v.arbolesMar) arboles(g, ladoMar, 9.4, v.arbolesMar, 15)
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 3. PUENTE. El vacío a los dos lados es lo que lo hace un puente. La
// estructura cambia la ciudad: tirantes en Bombay, vigas remachadas en Calcuta,
// arcos en Novosibirsk, la rampa en espiral de Nanpu en Shanghái.
export function puenteDe (v) {
  const g = new THREE.Group()
  const medio = v.medioTablero ?? 7.6
  const calzada = mat(v.tono ?? 0x6f6f72, 0.9)
  const hormigon = mat(v.tonoHormigon ?? 0xdedbd4, 0.85)
  const acero = mat(v.tonoAcero ?? 0xb9bec4, 0.45, 0.55)

  pon(g, new THREE.BoxGeometry(medio * 2, 1.1, LARGO), hormigon, 0, -0.55, (DESDE_Z + HASTA_Z) / 2)
  const s = pon(g, new THREE.PlaneGeometry(medio * 2 - 1.6, LARGO), calzada, 0, 0.005, (DESDE_Z + HASTA_Z) / 2)
  s.rotation.x = -Math.PI / 2
  for (const l of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(0.5, 1.2, LARGO), hormigon, l * (medio - 0.3), 0.6, (DESDE_Z + HASTA_Z) / 2)
    barandilla(g, l, medio - 0.3, 'hierro')
  }
  agua(g, v.yAgua ?? -42, v.tonoAgua ?? 0x33607a, 0, 0)

  // Las torres y los tirantes, siempre a partir de x = 7,4: los pilares del
  // puente de Vladivostok estaban a 5,2 y los bichos los atravesaban.
  const zTorres = v.zTorres ?? [-14, -92]
  if (v.estructura === 'tirantes') {
    for (const zp of zTorres) {
      for (const l of [-1, 1]) {
        pon(g, new THREE.BoxGeometry(1.8, 44, 2.6), hormigon, l * 7.4, 20, zp)
        for (let k = 1; k <= 8; k++) {
          const arriba = new THREE.Vector3(l * 7.4, 38 - k * 2.6, zp)
          const abajo = new THREE.Vector3(l * (medio - 0.3), 0.6, zp + (k % 2 ? 1 : -1) * k * 8)
          const c = arriba.clone().add(abajo).multiplyScalar(0.5)
          const t = pon(g, new THREE.CylinderGeometry(0.07, 0.07, arriba.distanceTo(abajo), 4),
            mat(0xf2f2ef, 0.35, 0.5), c.x, c.y, c.z)
          t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), abajo.clone().sub(arriba).normalize())
        }
      }
      pon(g, new THREE.BoxGeometry(16.6, 2, 2.8), hormigon, 0, 40, zp)
    }
  } else if (v.estructura === 'celosia') {
    // El de Howrah: dos celosías de acero remachado a los lados y las cruces
    // por encima. No tiene un solo tornillo, es todo remache.
    for (const l of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(0.9, 1.2, LARGO), acero, l * 7.6, 12, -60)
      pon(g, new THREE.BoxGeometry(0.9, 1.2, LARGO), acero, l * 7.6, 1.2, -60)
      for (let z = DESDE_Z; z > -140; z -= 7) {
        const d = pon(g, new THREE.BoxGeometry(0.6, 13.6, 0.6), acero, l * 7.6, 6.6, z)
        d.rotation.x = 0.44
      }
      for (let z = DESDE_Z; z > -140; z -= 14) {
        pon(g, new THREE.BoxGeometry(0.7, 12, 0.7), acero, l * 7.6, 6.6, z)
      }
    }
    for (let z = DESDE_Z; z > -140; z -= 14) {
      pon(g, new THREE.BoxGeometry(16.1, 0.7, 0.7), acero, 0, 12.4, z)
    }
  } else if (v.estructura === 'pilas') {
    // Pilas por debajo del tablero y nada por encima: el Third Mainland Bridge
    // son once kilometros de viga sobre la laguna, sin torres ni tirantes.
    for (let z = DESDE_Z; z > -140; z -= 18) {
      for (const l of [-1, 1]) {
        pon(g, new THREE.BoxGeometry(2.2, 12, 2.6), hormigon, l * 7.4, -6.5, z)
      }
      pon(g, new THREE.BoxGeometry(17, 1.2, 2.2), hormigon, 0, -1.4, z)
    }
  } else if (v.estructura === 'arcos') {
    for (const l of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const zc = -10 - i * 34
        const a = pon(g, new THREE.TorusGeometry(15, 0.55, seg(7), seg(16), Math.PI), acero, l * 7.5, -0.4, zc)
        a.rotation.y = Math.PI / 2
      }
    }
  }
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 3
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  g.userData.baseZ = -96
  return g
}

// 4. AVENIDA. Calzada ancha, aceras, y edificios pegados a los dos lados. Es el
// tipo de la Quinta Avenida, de Times Square, de Reforma y de Chang'an.
export function avenida (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 34 })
  // La acera: una losa un dedo más alta a cada lado, fuera del pasillo.
  for (const l of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(6, 0.3, LARGO), mat(v.tonoAcera ?? 0xa9a49a, 0.9),
      l * 10, 0.15, (DESDE_Z + HASTA_Z) / 2)
    fachadas(g, v, l, v.desdeX ?? ANCHOS.avenida, v.lados?.[l > 0 ? 0 : 1] ?? {})
    farolas(g, l, 8.2, v.farolas ?? 'recta', 16)
    if (v.arboles) arboles(g, l, 10.4, v.arboles, 16)
    if (v.coches !== false) coches(g, l, 8.6, v.paletaCoches)
  }
  // La línea discontinua del centro, que es lo que dice «esto es una calzada».
  if (v.marcas !== false) {
    const blanco = mat(0xe8e6de, 0.8)
    for (let z = DESDE_Z; z > -110; z -= 6) {
      const m = pon(g, new THREE.PlaneGeometry(0.18, 3), blanco, 0, 0.04, z)
      m.rotation.x = -Math.PI / 2
    }
  }
  cierre(g, v)
  puerta(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 5. MUELLE. Losa sobre el agua, bolardos, y barcas o grúas al lado. Marsella,
// Heraclión y Seattle.
export function muelle (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 30 })
  const ladoAgua = v.ladoAgua ?? 0
  agua(g, -1.8, v.tonoAgua ?? 0x2b5b6b, ladoAgua, 8)
  const canto = mat(v.tonoCanto ?? 0xcfc6b4, 0.9)
  for (const l of (ladoAgua === 0 ? [-1, 1] : [ladoAgua])) {
    pon(g, new THREE.BoxGeometry(1.4, 2.2, LARGO), canto, l * 8.1, -0.6, (DESDE_Z + HASTA_Z) / 2)
    // Los bolardos de amarre.
    for (let z = DESDE_Z - 4; z > -110; z -= 9) {
      pon(g, new THREE.CylinderGeometry(0.28, 0.34, 0.7, seg(8)), mat(0x3a3f45, 0.7, 0.2), l * FUERA, 0.35, z)
    }
    if (v.barcas) barcas(g, l, v)
  }
  if (ladoAgua !== 0) {
    fachadas(g, v, -ladoAgua, v.desdeX ?? ANCHOS.muelle)
    farolas(g, -ladoAgua, 7.6, v.farolas ?? 'fernandina')
  }
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// Barcas amarradas, con el mástil. Se balancean (`ola`), que es una de las tres
// o cuatro cosas vivas por mapa que Isidro quiso.
function barcas (g, lado, v) {
  const az = dado(v.semilla + 44)
  const casco = mat(0xe4e1d8, 0.7)
  const linea = mat(0x24405e, 0.6)
  const palo = mat(0xd8d4c8, 0.5)
  for (let i = 0; i < 9; i++) {
    const z = 4 - i * 12 - az() * 4
    const x = lado * (11 + az() * 5)
    const b = new THREE.Group()
    b.position.set(x, -1.3, z)
    b.rotation.y = lado * (1.4 + (az() - 0.5) * 0.4)
    const c = pon(b, new THREE.CylinderGeometry(1.1, 1.1, 5.6, seg(9), 1, false, 0, Math.PI), casco, 0, 0.6, 0)
    c.rotation.z = Math.PI / 2
    c.rotation.y = Math.PI
    pon(b, new THREE.BoxGeometry(5.6, 0.2, 2.2), linea, 0, 1.15, 0)
    if (v.mastiles !== false) pon(b, new THREE.CylinderGeometry(0.07, 0.09, 9, 4), palo, 0, 5.6, 0)
    b.userData.ola = 0.5 + az()
    g.add(b)
  }
}

// 6. EXPLANADA. Suelo llano y grande, poco a los lados y el monumento al fondo.
// Gizeh, Karnak, el Campo de Marte, la Acrópolis, Aso Rock.
export function explanada (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 70 })
  // Los bordes: setos, columnas, muretes o nada.
  if (v.bordes === 'columnas') {
    const piedra = mat(v.tonoBordes ?? 0xd8cbac, 0.92)
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 8; z > -96; z -= 9) {
        pon(g, new THREE.CylinderGeometry(1.5, 1.7, 13, seg(11)), piedra, l * 9.6, 6.5, z)
        pon(g, new THREE.BoxGeometry(4, 1.2, 4), piedra, l * 9.6, 13.2, z)
      }
    }
  } else if (v.bordes === 'esfinges') {
    // La avenida de las esfinges de Karnak: dos filas de carneros echados.
    const piedra = mat(v.tonoBordes ?? 0xd2bc92, 0.92)
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 8; z > -100; z -= 7.5) {
        pon(g, new THREE.BoxGeometry(2, 1.5, 4.4), piedra, l * 9.2, 0.75, z)
        pon(g, new THREE.BoxGeometry(1.6, 1.6, 1.6), piedra, l * 9.2, 2.1, z - 1.5)
      }
    }
  } else if (v.bordes === 'setos') {
    for (const l of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(2.2, 1.6, LARGO), mat(0x3f6b3c, 0.95), l * 9, 0.8, (DESDE_Z + HASTA_Z) / 2)
      arboles(g, l, 13, v.arboles ?? 'copa', 12)
    }
  } else if (v.bordes === 'dunas') {
    const az = dado(v.semilla + 12)
    const arena = mat(v.tonoDuna ?? 0xd0b078, 0.97)
    for (const l of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const r = 9 + az() * 16
        // El centro se pone a partir del RADIO, no a ojo: una duna de 25 plantada
        // en x = 11 llega hasta el eje aunque su centro esté fuera del pasillo.
        const d = pon(g, new THREE.SphereGeometry(r, seg(9), seg(6), 0, Math.PI * 2, 0, Math.PI / 2),
          arena, l * (r + 9 + az() * 18), -0.6, 10 - az() * 120)
        d.scale.y = 0.16 + az() * 0.22
      }
      // Cuatro piedras sueltas, que es lo que hay de verdad entre las dunas.
      for (let i = 0; i < 4; i++) {
        const r = 1 + az() * 2
        pon(g, new THREE.DodecahedronGeometry(r, 0), mat(0xb49a70, 0.95),
          l * (10 + az() * 14), r * 0.4, -az() * 100)
      }
    }
  } else if (v.bordes === 'murete') {
    for (const l of [-1, 1]) barandilla(g, l, 8.4, 'muro')
  }
  if (v.farolas) for (const l of [-1, 1]) farolas(g, l, 9.5, v.farolas, 22)
  cierre(g, v)
  puerta(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 7. ISLA. Plataforma con agua alrededor y la ciudad lejos. La Isla de la
// Libertad: se juega en la explanada del pedestal, con Manhattan al otro lado
// de la bahía.
export function isla (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 24 })
  // El canto de la isla y el espigón.
  const canto = mat(v.tonoCanto ?? 0xb9b2a4, 0.9)
  for (const l of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(2.4, 2.6, 150), canto, l * 8.4, -0.8, -50)
    barandilla(g, l, 7.4, 'piedra', DESDE_Z, -120)
    arboles(g, l, 10.6, v.arboles ?? 'copa', 14)
  }
  agua(g, -2.2, v.tonoAgua ?? 0x39647b, 0, 6)
  // El césped de la explanada, en su franja.
  for (const l of [-1, 1]) {
    const c = pon(g, new THREE.PlaneGeometry(2.6, 140), mat(0x4a7a45, 0.95), l * 7.2, 0.06, -50)
    c.rotation.x = -Math.PI / 2
  }
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 4
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 8. MIRADOR. La rampa del río de Chongqing: se pelea en una terraza con el
// edificio de balcones colgantes a un lado y el río muy abajo al otro.
export function mirador (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 26 })
  const ladoRio = v.ladoRio ?? -1
  // El tajo: la terraza acaba y debajo está el río.
  pon(g, new THREE.BoxGeometry(3, 26, LARGO), mat(v.tonoCanto ?? 0x8c8579, 0.92),
    ladoRio * 8.6, -13, (DESDE_Z + HASTA_Z) / 2)
  barandilla(g, ladoRio, 7.3, 'hierro')
  agua(g, -24, v.tonoAgua ?? 0x4a5f4d, ladoRio, 10)

  // El edificio colgado de la ladera, al otro lado: pisos con alero y farolillos.
  const madera = mat(v.tonoMadera ?? 0x6b3f2a, 0.9)
  const alero = mat(v.tonoAlero ?? 0x2f2a26, 0.9)
  const luz = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb84d, emissiveIntensity: 0.8, roughness: 0.5 })
  for (let p = 0; p < 7; p++) {
    const y = 1 + p * 3.4
    // Desde 13,6 hacia fuera: los pisos vuelan sobre la ladera, no sobre el
    // sitio por donde se pelea.
    const x = -ladoRio * (13.6 + p * 0.55)
    pon(g, new THREE.BoxGeometry(9, 3, 120), madera, x, y + 1.5, -46)
    pon(g, new THREE.BoxGeometry(11, 0.4, 122), alero, x, y + 3.2, -46)
    for (let z = 8; z > -100; z -= 7) {
      pon(g, new THREE.BoxGeometry(0.3, 0.5, 0.3), luz, -ladoRio * (Math.abs(x) - 4.4), y + 2.4, z)
    }
  }
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// 9. CARRETERA DE CAMPO. Para los sitios donde eso ES lo que hay: la Seward
// Highway de Anchorage va de verdad entre el fiordo y la montaña.
export function campo (v) {
  const g = new THREE.Group()
  suelo(g, { ...v, ancho: 20 })
  const cuneta = mat(v.tonoCuneta ?? 0x6b7256, 0.95)
  for (const l of [-1, 1]) {
    const c = pon(g, new THREE.PlaneGeometry(40, LARGO), cuneta, l * 27, -0.05, (DESDE_Z + HASTA_Z) / 2)
    c.rotation.x = -Math.PI / 2
  }
  if (v.guardarrail !== false) {
    for (const l of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(0.16, 0.5, LARGO), mat(0xb6bbc0, 0.5, 0.4), l * 7.2, 0.7, (DESDE_Z + HASTA_Z) / 2)
      for (let z = DESDE_Z; z > -110; z -= 8) {
        pon(g, new THREE.BoxGeometry(0.14, 0.9, 0.14), mat(0x8d9298, 0.6, 0.3), l * 7.2, 0.45, z)
      }
    }
  }
  if (v.ladoAgua) {
    agua(g, -3.4, v.tonoAgua ?? 0x50707e, v.ladoAgua, 20)
  }
  if (v.arboles) for (const l of [-1, 1]) arboles(g, l, 12 + Math.random() * 0, v.arboles, 11)
  const blanco = mat(0xe8e6de, 0.8)
  for (let z = DESDE_Z; z > -110; z -= 7) {
    const m = pon(g, new THREE.PlaneGeometry(0.16, 3.4), blanco, 0, 0.04, z)
    m.rotation.x = -Math.PI / 2
  }
  cierre(g, v)
  vestirExtras(g, v)
  g.userData.carriles = v.carriles ?? 5
  g.userData.tapaElMundo = true
  g.userData.sinSombra = true
  return g
}

// --- los adornos de cada sitio ----------------------------------------------
// Lo que hace que un tipo de lugar sea UNA ciudad y no otra. Todo lo de aquí es
// opcional y casi todo solo se construye en calidad ultra.
function vestirExtras (g, v) {
  if (v.banderas) {
    // Las banderas de la Quinta Avenida, que salen de las fachadas en diagonal.
    const tela = mat(v.tonoBandera ?? 0xc4303a, 0.9)
    const palo = mat(0x6a6f75, 0.6, 0.3)
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 10; z > -90; z -= 12) {
        const p = pon(g, new THREE.CylinderGeometry(0.06, 0.06, 3.4, 4), palo, l * 12.4, 7, z)
        p.rotation.z = l * 0.9
        const b = pon(g, new THREE.BoxGeometry(2.2, 1.3, 0.06), tela, l * 10.6, 6.2, z)
        b.userData.ola = 0.8
      }
    }
  }
  if (v.pantallas) {
    // Times Square: las pantallas son lo que ES el sitio, así que van siempre,
    // no solo en ultra. Emisivas y sin textura: cuatro planos de color que dan
    // toda la luz de neón.
    const tonos = [0xff3b5c, 0x2fd2ff, 0xffd23b, 0x7a3bff, 0x3bff88, 0xff8a1f, 0xffffff]
    const az = dado(v.semilla + 55)
    const desdeX = v.desdeX ?? 13
    // Un material por TONO y no uno por pantalla: siete materiales son siete
    // llamadas de dibujo; una por pantalla serían sesenta.
    const mats = tonos.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, roughness: 0.6 }))
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 4; z > -100; z -= 5.5) {
        const m = mats[(az() * mats.length) | 0]
        const alto = 3 + az() * 8
        const p = pon(g, new THREE.BoxGeometry(0.3, alto, 4.6 + az() * 2.6), m, l * (desdeX - 0.3), 4 + az() * 11, z)
        p.userData.neon = 0.4 + az()
      }
      // La cinta corrida de noticias, a la altura de la calle y de una pieza.
      pon(g, new THREE.BoxGeometry(0.34, 1.2, 150), mats[2], l * (desdeX - 0.35), 3.4, -50)
    }
  }
  if (v.puestos && CON_EXTRAS) {
    // Los puestos del mercado: cuatro palos y un toldo. Kano, Calcuta, Manaos.
    const az = dado(v.semilla + 66)
    const palo = mat(0x7a6244, 0.9)
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 12; z > -92; z -= 10) {
        const x = l * (8.4 + az() * 2)
        for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
          pon(g, new THREE.CylinderGeometry(0.07, 0.07, 2.4, 4), palo, x + dx, 1.2, z + dz)
        }
        const t = pon(g, new THREE.BoxGeometry(3.2, 0.12, 3.2), mat(v.tonoToldo ?? 0xc4552f, 0.9), x, 2.5, z)
        t.rotation.z = (az() - 0.5) * 0.1
      }
    }
  }
  if (v.piramides) {
    // OJO CON EL TONO: a z = -84 la niebla ya tapa la mitad, y unas pirámides
    // color arena contra un cielo color arena desaparecen —estaban construidas y
    // no se veía ni una—. Van bastante más oscuras de lo que son de verdad para
    // que la niebla las deje en silueta, que es como se ven desde El Cairo.
    const caliza = mat(0xa8823f, 0.95)
    const punta = mat(0xd6b978, 0.9)
    // Keops, Kefrén y Micerinos, en su diagonal y a los tres tamaños. Con cuatro
    // lados y giradas 45° para que se vea una arista de frente, como en las
    // fotos, y no una cara plana.
    // Y OJO CON EL TAMAÑO: a 106 de la cámara, una pirámide de 46 de base tapa
    // media pantalla y deja de leerse como pirámide para ser una mancha. Estas
    // son las tres a escala de PAISAJE: se reconocen enteras, con su silueta.
    for (const [x, z, alto, base] of [[-21, -99, 34, 27], [15, -117, 28, 22], [37, -105, 20, 16]]) {
      const p = pon(g, new THREE.ConeGeometry(base, alto, 4), caliza, x, alto / 2 - 1, z)
      p.rotation.y = Math.PI / 4
      // El casquete de caliza pulida que a Kefrén le queda en la punta.
      if (alto > 30) {
        const c = pon(g, new THREE.ConeGeometry(base * 0.22, alto * 0.2, 4), punta, x, alto * 0.91 - 1, z)
        c.rotation.y = Math.PI / 4
      }
    }
  }
  if (v.volcan) {
    // El Vesubio. Cerrando la bahía, con su doble cumbre —el Monte Somma al
    // lado, que es lo que le da la silueta partida que se reconoce desde
    // Nápoles— y el cono de ceniza oscuro arriba.
    // Oscuro por lo mismo que las pirámides: a esa distancia la niebla se come
    // cualquier tono medio.
    const ladera = mat(v.tonoVolcan ?? 0x39412f, 0.95)
    const ceniza = mat(0x241f1c, 0.95)
    pon(g, new THREE.ConeGeometry(40, 36, seg(16)), ladera, 14, 15, -120)
    pon(g, new THREE.ConeGeometry(13, 10, seg(14)), ceniza, 14, 36, -120)
    const somma = pon(g, new THREE.ConeGeometry(24, 22, seg(14)), ladera, -34, 7, -124)
    somma.scale.y = 0.9
  }
  if (v.gruas) {
    // Las grúas del puerto, al fondo y al lado: cuatro piezas cada una.
    const az = dado(v.semilla + 77)
    const metal = mat(v.tonoGrua ?? 0xc8462f, 0.6, 0.35)
    for (let i = 0; i < 5; i++) {
      const x = (az() < 0.5 ? -1 : 1) * (22 + az() * 30)
      const z = -60 - az() * 60
      pon(g, new THREE.BoxGeometry(1.2, 30, 1.2), metal, x - 3, 15, z)
      pon(g, new THREE.BoxGeometry(1.2, 30, 1.2), metal, x + 3, 15, z)
      pon(g, new THREE.BoxGeometry(24, 1.4, 1.4), metal, x + 4, 30, z)
    }
  }
  if (v.monorail) {
    // El monorraíl de Chongqing, que pasa por dentro de un edificio. La viga es
    // fija; el tren se mueve solo si algún día se quiere (`userData.riel`).
    const viga = mat(0xc8c4bc, 0.8)
    pon(g, new THREE.BoxGeometry(2.2, 0.9, 150), viga, -(v.ladoRio ?? -1) * 17, 13, -50)
    for (let z = 10; z > -110; z -= 22) {
      pon(g, new THREE.BoxGeometry(1.4, 26, 1.4), viga, -(v.ladoRio ?? -1) * 17, 0, z)
    }
  }
  if (v.ruinas) {
    // Los Foros Imperiales: columnas partidas y muros de ladrillo a media
    // altura. Va sin ultra porque en la Via dei Fori Imperiali ESO es el sitio.
    const az = dado(v.semilla + 88)
    const marmol = mat(0xded5c2, 0.92)
    const ladrillo = mat(0x9a6449, 0.92)
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 6; z > -104; z -= 8) {
        if (az() > 0.6) continue
        const alto = 3 + az() * 8
        pon(g, new THREE.CylinderGeometry(0.62, 0.7, alto, seg(9)), marmol, l * (10.5 + az() * 4.5), alto / 2, z)
      }
      for (let z = DESDE_Z - 10; z > -100; z -= 17) {
        pon(g, new THREE.BoxGeometry(7, 3 + az() * 3, 10), ladrillo, l * 17, 1.8, z)
      }
    }
  }
  if (v.canales) {
    // Los estanques del Rajpath, a los dos lados de la avenida ceremonial.
    const m = new THREE.MeshStandardMaterial({ color: 0x4f7a86, roughness: 0.18, metalness: 0.4 })
    for (const l of [-1, 1]) {
      const p = pon(g, new THREE.PlaneGeometry(5, 200), m, l * 12, 0.08, -60)
      p.rotation.x = -Math.PI / 2
      pon(g, new THREE.BoxGeometry(5.8, 0.4, 200), mat(0xd9cbb4, 0.9), l * 12, 0.02, -60)
    }
  }
  if (v.muralla) {
    // La muralla del Kremlin: ladrillo rojo y las almenas de cola de golondrina.
    const rojo = mat(0x8e3a33, 0.9)
    const l = v.ladoMuralla ?? 1
    pon(g, new THREE.BoxGeometry(3, 11, 200), rojo, l * 9.6, 5.5, -60)
    for (let z = DESDE_Z; z > -140; z -= 3.2) {
      pon(g, new THREE.BoxGeometry(3.4, 1.6, 1.8), rojo, l * 9.6, 11.6, z)
    }
    for (const z of [-12, -70]) {
      pon(g, new THREE.BoxGeometry(6, 20, 6), rojo, l * 11, 10, z)
      pon(g, new THREE.ConeGeometry(4.6, 11, seg(8)), mat(0x2f6b4a, 0.85), l * 11, 25, z)
    }
  }
  if (v.espiral) {
    // La rampa en espiral del puente de Nanpu, que es lo que hace que ese
    // puente sea ESE puente. Va lejos, al lado, fuera del pasillo.
    const hormigon = mat(0xdedbd4, 0.85)
    const cx = -34
    const cz = -96
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 4
      const r = 19
      const t = pon(g, new THREE.BoxGeometry(7, 0.8, 5.6), hormigon,
        cx + Math.cos(a) * r, 1 + i * 0.85, cz + Math.sin(a) * r)
      t.rotation.y = -a
    }
  }
  if (v.hielo) {
    const az = dado(v.semilla + 99)
    const placa = mat(0xdfe9ee, 0.7)
    for (let i = 0; i < 26; i++) {
      const r = 3 + az() * 9
      const p = pon(g, new THREE.CylinderGeometry(r, r * 0.9, 0.4, 6), placa,
        (az() - 0.5) * 300, (v.yAgua ?? -16) + 0.3, -120 + (az() - 0.5) * 260)
      p.rotation.y = az() * Math.PI
    }
  }
  if (v.farolillos) {
    // Los farolillos rojos de Chang'an, colgados de las farolas.
    const rojo = new THREE.MeshStandardMaterial({ color: 0xc4303a, emissive: 0x8d1f24, emissiveIntensity: 0.5, roughness: 0.8 })
    for (const l of [-1, 1]) {
      for (let z = DESDE_Z - 6; z > -96; z -= 13) {
        for (const d of [-0.8, 0.8]) {
          const f = pon(g, new THREE.SphereGeometry(0.42, seg(8), seg(6)), rojo, l * 8.6, 5.4, z + d)
          f.scale.y = 1.25
        }
      }
    }
  }
  if (v.tranvia && CON_EXTRAS) {
    const cuerpo = mat(v.tonoTranvia ?? 0xf0d048, 0.7)
    for (const z of [-24, -74]) {
      pon(g, new THREE.BoxGeometry(2.4, 2.8, 9), cuerpo, (v.ladoTranvia ?? 1) * 10.4, 1.6, z)
      pon(g, new THREE.BoxGeometry(2.5, 0.9, 7), mat(0x2b3440, 0.4, 0.3), (v.ladoTranvia ?? 1) * 10.4, 2.5, z)
    }
  }
}

// --- el catálogo -------------------------------------------------------------
export const TIPOS = { plaza, paseo, puente: puenteDe, avenida, muelle, explanada, isla, mirador, campo }
