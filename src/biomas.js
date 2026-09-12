// De qué está hecho cada sitio del mundo.
//
// Los doce destinos se jugaban todos en el mismo secarral ocre: da igual que
// pusiera Lagos o Vladivostok en el parte, lo que se veía era la carretera de
// Tarragona. Un mapa del mundo con un solo paisaje es un mapa decorativo.
//
// Aquí va lo que cambia de una región a otra, y es lo mínimo que hace falta
// para que se reconozca sin leer nada:
//
//   · la PALETA — tierra, cielo, niebla y luz. Es el 80% del trabajo. Nadie
//     identifica una acacia a cien metros, pero todo el mundo sabe que la
//     sabana es amarilla y que Siberia es blanca y gris.
//   · la VEGETACIÓN — cuatro siluetas por sitio, de las que se leen de lejos.
//   · el HITO — una sola silueta grande al fondo que ancla el sitio: las
//     pirámides, el Vesubio humeando, un volcán nevado, los karst chinos.
//
// Todo procedural, como el resto del juego: ni un archivo de imagen.

import * as THREE from 'three'

// Un material por color, compartido. Sin caché, cada árbol se fabricaba los
// suyos y `bake` no podía fundirlos: doce palmeras salían con noventa y seis
// materiales distintos, o sea noventa y seis llamadas de dibujado para un
// puñado de siluetas al borde de la carretera. Con caché son cuatro.
const cacheMat = new Map()
const mat = (color, rough = 0.9, metal = 0) => {
  const clave = color + ':' + rough + ':' + metal
  if (!cacheMat.has(clave)) {
    cacheMat.set(clave, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  }
  return cacheMat.get(clave)
}
const azar = (a, b) => a + Math.random() * (b - a)

// --- vegetación --------------------------------------------------------------
// Cada una es una silueta, no un árbol. A la distancia a la que se ven —y con la
// niebla encima— lo único que llega es el contorno, así que se construyen con
// las tres o cuatro piezas que definen ese contorno y ni una más.

// Pino mediterráneo: tronco desnudo y copa achatada arriba del todo.
function pino (tono) {
  const g = new THREE.Group()
  const alto = azar(3.4, 5.6)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, alto, 5), mat(0x6b543c))
  tronco.position.y = alto / 2
  g.add(tronco)
  for (let i = 0; i < 3; i++) {
    const r = azar(1.1, 1.9) * (1 - i * 0.22)
    const copa = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mat(tono))
    copa.position.set(azar(-0.5, 0.5), alto - azar(0, 0.7), azar(-0.5, 0.5))
    copa.scale.y = 0.5
    g.add(copa)
  }
  return g
}

// Ciprés: la vertical pura. Es lo que hace que un cerro parezca italiano.
function cipres (tono) {
  const g = new THREE.Group()
  const alto = azar(4.5, 7.5)
  const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(azar(0.5, 0.8), alto, 6), mat(tono))
  cuerpo.position.y = alto / 2
  g.add(cuerpo)
  return g
}

// Palmera: tronco curvado y penacho. Sin la curva parece un poste con hojas.
function palmera (tono) {
  const g = new THREE.Group()
  const alto = azar(4, 7)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, alto, 6), mat(0x8a7350))
  tronco.position.y = alto / 2
  tronco.rotation.z = azar(-0.16, 0.16)
  g.add(tronco)
  const copa = new THREE.Group()
  copa.position.y = alto
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.38, azar(2, 3), 4), mat(tono))
    hoja.position.set(Math.cos(a) * 1.1, -0.2, Math.sin(a) * 1.1)
    hoja.rotation.set(Math.PI / 2.2, 0, -a + Math.PI / 2)
    copa.add(hoja)
  }
  g.add(copa)
  return g
}

// Acacia de sabana: la copa PLANA y ancha sobre un tronco fino. Es la silueta
// más reconocible del mundo después de la palmera.
function acacia (tono) {
  const g = new THREE.Group()
  const alto = azar(3.2, 5)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, alto, 5), mat(0x6d5b42))
  tronco.position.y = alto / 2
  g.add(tronco)
  const copa = new THREE.Mesh(new THREE.SphereGeometry(azar(2.2, 3.4), 8, 5), mat(tono))
  copa.position.y = alto + 0.2
  copa.scale.y = 0.26
  g.add(copa)
  return g
}

// Abeto: el cono con faldones. Nieve y frío.
function abeto (tono) {
  const g = new THREE.Group()
  const alto = azar(4, 7)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, alto * 0.3, 5), mat(0x4a3c2e))
  tronco.position.y = alto * 0.15
  g.add(tronco)
  for (let i = 0; i < 3; i++) {
    const t = i / 3
    const cono = new THREE.Mesh(new THREE.ConeGeometry(azar(1.2, 1.8) * (1 - t * 0.4), alto * 0.45, 6), mat(tono))
    cono.position.y = alto * (0.3 + t * 0.3)
    g.add(cono)
  }
  return g
}

// Árbol de selva: tronco alto y desnudo con la copa arriba. La selva se lee por
// la ALTURA y por la densidad, no por la forma de la hoja.
function ceiba (tono) {
  const g = new THREE.Group()
  const alto = azar(6, 11)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, alto, 6), mat(0x6a5b47))
  tronco.position.y = alto / 2
  g.add(tronco)
  for (let i = 0; i < 4; i++) {
    const copa = new THREE.Mesh(new THREE.SphereGeometry(azar(1.6, 2.6), 7, 5), mat(tono))
    copa.position.set(azar(-1.2, 1.2), alto - azar(0, 1.4), azar(-1.2, 1.2))
    copa.scale.y = 0.62
    g.add(copa)
  }
  return g
}

// Saguaro / agave del altiplano: brazos hacia arriba.
function cactus (tono) {
  const g = new THREE.Group()
  const alto = azar(2.4, 4.4)
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, alto, 3, 7), mat(tono))
  cuerpo.position.y = alto / 2 + 0.34
  g.add(cuerpo)
  for (const lado of [-1, 1]) {
    if (Math.random() > 0.7) continue
    const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, azar(0.8, 1.5), 3, 6), mat(tono))
    brazo.position.set(lado * 0.6, alto * azar(0.5, 0.75), 0)
    brazo.rotation.z = lado * 0.5
    g.add(brazo)
  }
  return g
}

// Bambú: cañas altísimas y finas, en mata.
function bambu (tono) {
  const g = new THREE.Group()
  for (let i = 0; i < 6; i++) {
    const alto = azar(4, 8)
    const cana = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, alto, 5), mat(tono))
    cana.position.set(azar(-0.7, 0.7), alto / 2, azar(-0.7, 0.7))
    cana.rotation.z = azar(-0.12, 0.12)
    g.add(cana)
  }
  return g
}

// Olivo: retorcido y bajo, copa gris plateada.
function olivo (tono) {
  const g = new THREE.Group()
  const alto = azar(2, 3.2)
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, alto, 6), mat(0x7a6a55))
  tronco.position.y = alto / 2
  tronco.rotation.z = azar(-0.2, 0.2)
  g.add(tronco)
  for (let i = 0; i < 3; i++) {
    const copa = new THREE.Mesh(new THREE.SphereGeometry(azar(1, 1.6), 7, 5), mat(tono))
    copa.position.set(azar(-0.8, 0.8), alto + azar(0, 0.5), azar(-0.8, 0.8))
    copa.scale.y = 0.7
    g.add(copa)
  }
  return g
}

export const FLORA = { pino, cipres, palmera, acacia, abeto, ceiba, cactus, bambu, olivo }

// --- hitos -------------------------------------------------------------------
// Una sola cosa grande al fondo, y solo donde de verdad ancla el sitio. Puestas
// en todas partes dejarían de significar nada.

// Las pirámides de Gizeh: tres, de tamaños distintos y en diagonal, que es como
// están de verdad y como se reconocen en cualquier silueta.
function piramides (tono) {
  const g = new THREE.Group()
  for (const [x, k] of [[-34, 1], [6, 0.86], [38, 0.66]]) {
    const alto = 26 * k
    const p = new THREE.Mesh(new THREE.ConeGeometry(alto * 0.92, alto, 4), mat(tono, 1))
    p.position.set(x, alto / 2 - 2, -96 + x * 0.2)
    p.rotation.y = Math.PI / 4
    g.add(p)
  }
  return g
}

// Un volcán: cono truncado con la boca oscura y una columna de humo. Sirve para
// el Vesubio y para el altiplano mexicano cambiándole el color y la nieve.
function volcan (tono, conNieve = false) {
  const g = new THREE.Group()
  const alto = 44
  const cono = new THREE.Mesh(new THREE.CylinderGeometry(alto * 0.22, alto * 0.95, alto, 9), mat(tono, 1))
  cono.position.y = alto / 2 - 4
  g.add(cono)
  if (conNieve) {
    const nieve = new THREE.Mesh(new THREE.CylinderGeometry(alto * 0.23, alto * 0.42, alto * 0.3, 9), mat(0xeef2f6, 0.8))
    nieve.position.y = alto * 0.85 - 4
    g.add(nieve)
  }
  const boca = new THREE.Mesh(new THREE.CylinderGeometry(alto * 0.19, alto * 0.21, 2, 9), mat(0x2a211c, 1))
  boca.position.y = alto - 4
  g.add(boca)
  // El humo: tres bolas que suben y se abren. Sin humo es un cerro cualquiera;
  // con humo es un volcán, y eso lo entiende todo el mundo sin pensarlo.
  for (let i = 0; i < 4; i++) {
    const h = new THREE.Mesh(
      new THREE.SphereGeometry(4 + i * 2.6, 7, 5),
      new THREE.MeshBasicMaterial({ color: 0xcfc8c2, transparent: true, opacity: 0.3 - i * 0.05, depthWrite: false })
    )
    h.position.set(i * 1.6, alto + 2 + i * 6, 0)
    g.add(h)
  }
  g.position.set(-62, 0, -104)
  return g
}

// Karst: los pilares verticales del sur de China, que no se parecen a ninguna
// otra montaña del mundo.
function karst (tono) {
  const g = new THREE.Group()
  for (let i = 0; i < 9; i++) {
    const alto = azar(22, 46)
    const r = azar(4, 9)
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, alto, 7), mat(tono, 1))
    const lado = i % 2 ? 1 : -1
    p.position.set(lado * azar(34, 118), alto / 2 - 3, azar(-128, -86))
    p.rotation.y = azar(0, 3)
    g.add(p)
  }
  return g
}

// Columnas rotas: dos o tres en pie y una tirada. Grecia en cuatro piezas.
function columnas (tono) {
  const g = new THREE.Group()
  for (const [x, alto] of [[-38, 9], [-31, 11], [-24, 6.5], [32, 10]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, alto, 10), mat(tono, 1))
    c.position.set(x, alto / 2 - 1, -78)
    g.add(c)
  }
  const caida = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 12, 10), mat(tono, 1))
  caida.position.set(-14, 0.6, -74)
  caida.rotation.z = Math.PI / 2
  caida.rotation.y = 0.3
  g.add(caida)
  return g
}

export const HITOS = { piramides, volcan, karst, columnas }

// --- las doce regiones -------------------------------------------------------
//
// `tierra` es lo que más manda: es la mitad de la pantalla. `cielo` y `niebla`
// van juntas —una niebla que no case con el cielo deja un horizonte cortado— y
// `sol` tiñe la luz, que es lo que separa un mediodía de Egipto de uno de
// Alaska aunque el suelo fuera del mismo color.
//
// `flora` es una lista de [tipo, tono, cuántos]. `hito` es opcional a propósito:
// puesto en los doce dejaría de significar nada.
export const BIOMAS = {
  mediterraneo: {
    tierra: 0xd8bd8a, cerro: 0xb99a72, meseta: 0xc7ab86,
    cielo: 0x7cb6e0, niebla: 0xc2d6dd, sol: 0xfff2d8, ambiente: 0xd6a86f,
    flora: [['pino', 0x4e6b3c, 16], ['olivo', 0x8a9b78, 10]]
  },
  costa: {
    tierra: 0xe2d3ae, cerro: 0xc9bda4, meseta: 0xd6cdb6,
    cielo: 0x6fb2e8, niebla: 0xd2e2ea, sol: 0xfff6e4, ambiente: 0xc9c2ac,
    flora: [['cipres', 0x33532f, 14], ['pino', 0x4e6b3c, 10]]
  },
  volcanico: {
    tierra: 0x6e6258, cerro: 0x574c45, meseta: 0x4a413a,
    cielo: 0x9ab4c4, niebla: 0xa8a49c, sol: 0xffe6c4, ambiente: 0x6b5f52,
    flora: [['cipres', 0x2c4a2b, 16], ['pino', 0x3f5c34, 8]],
    hito: ['volcan', 0x4a3f38, false]
  },
  egeo: {
    tierra: 0xdcd2b6, cerro: 0xc3bda6, meseta: 0xd0c9b0,
    cielo: 0x59a8e6, niebla: 0xdae8ee, sol: 0xfff4dc, ambiente: 0xcfc7ae,
    flora: [['olivo', 0x94a184, 18], ['cipres', 0x3a5836, 6]],
    hito: ['columnas', 0xddd6c2]
  },
  desierto: {
    tierra: 0xf2d48f, cerro: 0xdcb877, meseta: 0xe8c98d,
    cielo: 0x86c2e8, niebla: 0xf0dcb4, sol: 0xfff0c8, ambiente: 0xe0b878,
    flora: [['palmera', 0x4f7a3a, 12]],
    hito: ['piramides', 0xd9bd88]
  },
  sabana: {
    tierra: 0xd9b757, cerro: 0xc0a054, meseta: 0xcdae5c,
    cielo: 0x8fc4dd, niebla: 0xe6d6a0, sol: 0xffe8b0, ambiente: 0xd2ab5c,
    flora: [['acacia', 0x6d7f42, 18], ['palmera', 0x5c7a3c, 6]]
  },
  monzon: {
    tierra: 0x9aa565, cerro: 0x7f8c58, meseta: 0x8b9760,
    cielo: 0xa8bcc8, niebla: 0xc4cdd0, sol: 0xf2eddc, ambiente: 0x8a9470,
    flora: [['palmera', 0x3f6b33, 16], ['ceiba', 0x40663a, 8]]
  },
  karstico: {
    tierra: 0x8a9478, cerro: 0x6f7c66, meseta: 0x7b876f,
    cielo: 0xb6c4ca, niebla: 0xcdd6d6, sol: 0xf0ead8, ambiente: 0x7f8a74,
    flora: [['bambu', 0x5d8046, 20]],
    hito: ['karst', 0x76836c]
  },
  taiga: {
    tierra: 0xdfe6ea, cerro: 0xc2cdd4, meseta: 0xd2dade,
    cielo: 0x9db4c4, niebla: 0xd8e2e8, sol: 0xeaf0f8, ambiente: 0xb8c6d0,
    flora: [['abeto', 0x2b402f, 22]]
  },
  artico: {
    tierra: 0xeef3f6, cerro: 0xd4dee6, meseta: 0xe2e9ee,
    cielo: 0x8fa8bc, niebla: 0xe4ecf2, sol: 0xe6f0fa, ambiente: 0xc4d2de,
    flora: [['abeto', 0x24382b, 18]]
  },
  altiplano: {
    tierra: 0xc9a173, cerro: 0xa8855e, meseta: 0xb89267,
    cielo: 0x74b0e0, niebla: 0xd8cdb2, sol: 0xfff0d0, ambiente: 0xc09468,
    flora: [['cactus', 0x5f7a48, 16], ['acacia', 0x7a8450, 6]],
    hito: ['volcan', 0x5a4a40, true]
  },
  selva: {
    tierra: 0x6b7c48, cerro: 0x4f6339, meseta: 0x5a6d40,
    cielo: 0x9cb8b0, niebla: 0xb4c8ba, sol: 0xeef2da, ambiente: 0x6f8055,
    flora: [['ceiba', 0x2f5730, 20], ['palmera', 0x3a6b38, 10]]
  }
}
