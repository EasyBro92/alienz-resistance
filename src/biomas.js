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

// --- hitos de ciudad ---------------------------------------------------------
// Los de arriba cuentan una región; estos, una ciudad concreta, y por eso van en
// la MISIÓN y no en el bioma. Cada uno declara en `userData.lados` qué lado de
// la carretera ocupa, para que la vegetación de ese lado se quede en la acera
// en vez de salirle de dentro.

// La Ciudad de las Artes y las Ciencias, a la derecha: el estanque largo, las
// costillas blancas del Museu, el Hemisfèric con forma de ojo y, al fondo, el
// casco del Palau de les Arts con su pluma. Blanco y agua: es lo que la hace
// reconocible desde cualquier distancia.
function artesYCiencias () {
  const g = new THREE.Group()
  const blanco = mat(0xf2f3ef, 0.35)
  const agua = mat(0x3fa3cc, 0.12, 0.15)
  const vidrio = mat(0x7fa8bd, 0.2, 0.35)

  // En vertical la cámara ve poco más que la calzada: todo va pegado a la
  // barandilla y alto, para que asome por el borde de la pantalla.
  const estanque = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 96), agua)
  estanque.position.set(2, 0.12, -44)
  g.add(estanque)

  // Museu: costillas inclinadas bajo una cubierta larga.
  for (let i = 0; i < 13; i++) {
    const costilla = new THREE.Mesh(new THREE.BoxGeometry(1.1, 13, 1.1), blanco)
    costilla.position.set(-3.5, 6.2, -6 - i * 3.3)
    costilla.rotation.z = 0.28
    g.add(costilla)
  }
  const cubierta = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 44), blanco)
  cubierta.position.set(-1.6, 12.6, -25.8)
  g.add(cubierta)

  // Hemisfèric: media cúpula de cristal, alargada a lo largo del estanque, bajo
  // un párpado blanco.
  const ojo = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), vidrio)
  ojo.scale.set(5.5, 4.2, 9)
  ojo.position.set(0, 0.2, -58)
  g.add(ojo)
  const parpado = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.55, 6, 26, Math.PI), blanco)
  parpado.scale.set(1, 0.62, 1)
  parpado.rotation.y = Math.PI / 2
  parpado.position.set(0, 0.2, -58)
  g.add(parpado)

  // Palau de les Arts: el casco alargado y la pluma que lo cruza por encima.
  const palau = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), blanco)
  palau.scale.set(9, 20, 16)
  palau.position.set(0, 14, -90)
  g.add(palau)
  const pluma = new THREE.Mesh(new THREE.TorusGeometry(16, 0.8, 6, 26, Math.PI * 0.8), blanco)
  pluma.rotation.y = Math.PI / 2
  pluma.position.set(0, 4, -90)
  g.add(pluma)

  // Medido con la cámara del móvil en vertical: el borde de la pantalla pasa
  // por x ≈ 13 a z = -40 y por x ≈ 18 a z = -70, y por encima de unos 10 de
  // alto lo tapa el marcador. Lo que no cabe en esa cuña no se ve, así que el
  // conjunto va reducido y pegado a la barandilla.
  g.scale.setScalar(0.65)
  g.position.set(14, 0, -30)
  g.userData.lados = [1]
  return g
}

// El paseo de la Castellana: oficinas a los dos lados de la avenida, con sus
// bandas de ventanas mirando a la calzada, y al fondo las Cuatro Torres. Puede
// dejar un hueco en un lado para otro hito, que es donde va el estadio.
function castellana (huecoLado = 0, desde = 0, hasta = 0) {
  const g = new THREE.Group()
  const fachadas = [0xd9d2c4, 0xc6c1b6, 0xb6ae9f, 0xe4ded1, 0xa9abaf, 0xcfc4b0]
  const ventana = mat(0x3b4955, 0.25, 0.4)
  for (const lado of [-1, 1]) {
    let z = 10
    while (z > -118) {
      const fondo = azar(9, 15)
      const ancho = azar(8, 12)
      const alto = azar(14, 32)
      const zc = z - fondo / 2
      if (lado === huecoLado && zc < desde && zc > hasta) { z -= fondo + 2; continue }
      const x = lado * (12 + ancho / 2)
      const color = fachadas[Math.floor(Math.random() * fachadas.length)]
      const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), mat(color, 0.85))
      cuerpo.position.set(x, alto / 2, zc)
      g.add(cuerpo)
      // Sin las bandas de ventanas son cajas; con ellas, oficinas.
      const cara = x - lado * (ancho / 2 + 0.06)
      for (let y = 3; y < alto - 2; y += 3.4) {
        const banda = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, fondo * 0.82), ventana)
        banda.position.set(cara, y, zc)
        g.add(banda)
      }
      z -= fondo + azar(1.5, 4)
    }
  }

  // Las Cuatro Torres al final de la avenida, entre la niebla: una de cristal,
  // la cilíndrica, una de acero y la del arco, dos pilares unidos arriba.
  const vidrio = mat(0x6f8ea6, 0.2, 0.5)
  const acero = mat(0x9ca3aa, 0.35, 0.6)
  const torres = new THREE.Group()
  const prisma = (x, alto, w, material) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, alto, w), material)
    t.position.set(x, alto / 2, 0)
    torres.add(t)
  }
  prisma(-30, 58, 8, vidrio)
  const cilindro = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 54, 16), vidrio)
  cilindro.position.set(-12, 27, 0)
  torres.add(cilindro)
  prisma(12, 56, 7, acero)
  for (const dx of [-3.4, 3.4]) {
    const pilar = new THREE.Mesh(new THREE.BoxGeometry(3, 62, 7), vidrio)
    pilar.position.set(30 + dx, 31, 0)
    torres.add(pilar)
  }
  const arco = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 7), acero)
  arco.position.set(30, 60, 0)
  torres.add(arco)
  // Detrás del final de la calzada. En el móvil en vertical solo asoman las
  // bases bajo el marcador; en pantallas más anchas se ven enteras.
  torres.position.set(0, 0, -105)
  g.add(torres)

  g.userData.lados = [-1, 1]
  return g
}

// El Bernabéu, a la izquierda: el óvalo con la piel de lamas metálicas de la
// reforma, el remate de la cubierta y las cuatro torres de las esquinas. Con el
// lado largo mirando a la avenida, que es como se ve desde la Castellana.
function bernabeu () {
  const g = new THREE.Group()
  const piel = mat(0xc3c8cd, 0.3, 0.65)
  const oscuro = mat(0x5d6166, 0.7, 0.3)

  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 24, 44), oscuro)
  cuerpo.scale.set(20, 1, 26)
  cuerpo.position.y = 12
  g.add(cuerpo)

  const n = 64
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const lama = new THREE.Mesh(new THREE.BoxGeometry(0.5, 25, 2.6), piel)
    lama.position.set(Math.cos(a) * 20.6, 12.5, Math.sin(a) * 26.6)
    lama.rotation.y = -a
    g.add(lama)
  }

  const cubierta = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.4, 44), piel)
  cubierta.scale.set(21.4, 1, 27.4)
  cubierta.position.y = 25
  g.add(cubierta)

  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 28, 16), piel)
    torre.position.set(sx * 15, 14, sz * 21)
    g.add(torre)
  }

  // Reducido para caber en la cuña visible junto a la barandilla (ver
  // artesYCiencias): el borde del óvalo queda en x ≈ -12.
  g.scale.setScalar(0.6)
  g.position.set(-24, 0, -72)
  g.userData.lados = [-1]
  return g
}

export const HITOS = { piramides, volcan, karst, columnas, artesYCiencias, castellana, bernabeu }

// --- las doce regiones -------------------------------------------------------
//
// `tierra` es lo que más manda: es la mitad de la pantalla. `cielo` y `niebla`
// van juntas —una niebla que no case con el cielo deja un horizonte cortado— y
// `sol` tiñe la luz, que es lo que separa un mediodía de Egipto de uno de
// Alaska aunque el suelo fuera del mismo color.
//
// `flora` es una lista de [tipo, tono, cuántos]. `hito` es opcional a propósito:
// puesto en los doce dejaría de significar nada.
// La calzada también es del sitio. Hasta ahora el asfalto, la pintura y el
// bordillo eran idénticos en Tarragona y en Manaos, y eso delata que es el mismo
// escenario repintado: lo que pisas es la mitad de la pantalla.
//
// El asfalto es negro de basalto bajo el Vesubio, tierra roja en la sabana
// —donde no hay asfalto, hay pista—, hielo prensado en Siberia y polvo comido
// en Egipto. La pintura acompaña: una raya blanca impecable sobre una pista de
// tierra sería el detalle que rompe todo lo demás.
export const BIOMAS = {
  mediterraneo: {
    restos: [['camioneta', 0x9a6a4a, 2]],
    asfalto: 0x83807a, raya: 0xe8dcc0, bordillo: 0xbdb6a8,
    tierra: 0xd8bd8a, cerro: 0xb99a72, meseta: 0xc7ab86,
    cielo: 0x7cb6e0, niebla: 0xc2d6dd, sol: 0xfff2d8, ambiente: 0xd6a86f,
    flora: [['pino', 0x4e6b3c, 16], ['olivo', 0x8a9b78, 10]]
  },
  costa: {
    restos: [['contenedor', 0xa8563f, 2]],
    asfalto: 0x8e8b83, raya: 0xf0e8d2, bordillo: 0xd2cbb8,
    tierra: 0xe2d3ae, cerro: 0xc9bda4, meseta: 0xd6cdb6,
    cielo: 0x6fb2e8, niebla: 0xd2e2ea, sol: 0xfff6e4, ambiente: 0xc9c2ac,
    flora: [['cipres', 0x33532f, 14], ['pino', 0x4e6b3c, 10]]
  },
  volcanico: {
    restos: [['autobus', 0xc4923a, 2]],
    asfalto: 0x4a453f, raya: 0xd8cdae, bordillo: 0x6e675c,
    tierra: 0x6e6258, cerro: 0x574c45, meseta: 0x4a413a,
    cielo: 0x9ab4c4, niebla: 0xa8a49c, sol: 0xffe6c4, ambiente: 0x6b5f52,
    flora: [['cipres', 0x2c4a2b, 16], ['pino', 0x3f5c34, 8]],
    hito: ['volcan', 0x4a3f38, false]
  },
  egeo: {
    restos: [['contenedor', 0x3f6f92, 3]],
    asfalto: 0x939086, raya: 0xf2ead0, bordillo: 0xd8d0b8,
    tierra: 0xdcd2b6, cerro: 0xc3bda6, meseta: 0xd0c9b0,
    cielo: 0x59a8e6, niebla: 0xdae8ee, sol: 0xfff4dc, ambiente: 0xcfc7ae,
    flora: [['olivo', 0x94a184, 18], ['cipres', 0x3a5836, 6]],
    hito: ['columnas', 0xddd6c2]
  },
  desierto: {
    restos: [['autobus', 0xd8b45c, 2]],
    asfalto: 0x9c927e, raya: 0xefe2be, bordillo: 0xc9bb96,
    tierra: 0xf2d48f, cerro: 0xdcb877, meseta: 0xe8c98d,
    cielo: 0x86c2e8, niebla: 0xf0dcb4, sol: 0xfff0c8, ambiente: 0xe0b878,
    flora: [['palmera', 0x4f7a3a, 12]],
    hito: ['piramides', 0xd9bd88]
  },
  sabana: {
    restos: [['camioneta', 0xb4703a, 3]],
    asfalto: 0x9b7742, raya: 0xc9a86a, bordillo: 0xa8894f,
    tierra: 0xd9b757, cerro: 0xc0a054, meseta: 0xcdae5c,
    cielo: 0x8fc4dd, niebla: 0xe6d6a0, sol: 0xffe8b0, ambiente: 0xd2ab5c,
    flora: [['acacia', 0x6d7f42, 18], ['palmera', 0x5c7a3c, 6]]
  },
  monzon: {
    restos: [['autobus', 0x5a8f6a, 2]],
    asfalto: 0x6f7269, raya: 0xdcd8c4, bordillo: 0x8e9084,
    tierra: 0x9aa565, cerro: 0x7f8c58, meseta: 0x8b9760,
    cielo: 0xa8bcc8, niebla: 0xc4cdd0, sol: 0xf2eddc, ambiente: 0x8a9470,
    flora: [['palmera', 0x3f6b33, 16], ['ceiba', 0x40663a, 8]]
  },
  karstico: {
    restos: [['contenedor', 0x8a5a4a, 3]],
    asfalto: 0x787d76, raya: 0xe0dcc8, bordillo: 0x969a90,
    tierra: 0x8a9478, cerro: 0x6f7c66, meseta: 0x7b876f,
    cielo: 0xb6c4ca, niebla: 0xcdd6d6, sol: 0xf0ead8, ambiente: 0x7f8a74,
    flora: [['bambu', 0x5d8046, 20]],
    hito: ['karst', 0x76836c]
  },
  taiga: {
    restos: [['oruga', 0x5c6350, 2]],
    asfalto: 0x8d9298, raya: 0xdde4ea, bordillo: 0xb4bcc4,
    tierra: 0xdfe6ea, cerro: 0xc2cdd4, meseta: 0xd2dade,
    cielo: 0x9db4c4, niebla: 0xd8e2e8, sol: 0xeaf0f8, ambiente: 0xb8c6d0,
    flora: [['abeto', 0x2b402f, 22]]
  },
  artico: {
    restos: [['oruga', 0x6a6f5e, 2]],
    asfalto: 0xa6aeb6, raya: 0xe8eef4, bordillo: 0xc8d0d8,
    tierra: 0xeef3f6, cerro: 0xd4dee6, meseta: 0xe2e9ee,
    cielo: 0x8fa8bc, niebla: 0xe4ecf2, sol: 0xe6f0fa, ambiente: 0xc4d2de,
    flora: [['abeto', 0x24382b, 18]]
  },
  altiplano: {
    restos: [['autobus', 0xd4a03c, 2]],
    asfalto: 0x8a7f70, raya: 0xe6d8ac, bordillo: 0xb0a288,
    tierra: 0xc9a173, cerro: 0xa8855e, meseta: 0xb89267,
    cielo: 0x74b0e0, niebla: 0xd8cdb2, sol: 0xfff0d0, ambiente: 0xc09468,
    flora: [['cactus', 0x5f7a48, 16], ['acacia', 0x7a8450, 6]],
    hito: ['volcan', 0x5a4a40, true]
  },
  // La ciudad: acera clara en vez de campo, árboles de alineación y coches
  // aparcados. Es lo que convierte la carretera en una avenida.
  ciudad: {
    restos: [['camioneta', 0x8a8f96, 2]],
    asfalto: 0x5e5f62, raya: 0xf2f2ee, bordillo: 0xcfcac0,
    tierra: 0xb3aea4, cerro: 0x9a958c, meseta: 0xa6a198,
    cielo: 0x8fbfe6, niebla: 0xcfd8de, sol: 0xfff4e0, ambiente: 0xb8b0a0,
    flora: [['olivo', 0x55783f, 14]]
  },
  selva: {
    restos: [['barcaza', 0x7a6a52, 2]],
    asfalto: 0x6b6f5e, raya: 0xd4d6b8, bordillo: 0x878a74,
    tierra: 0x6b7c48, cerro: 0x4f6339, meseta: 0x5a6d40,
    cielo: 0x9cb8b0, niebla: 0xb4c8ba, sol: 0xeef2da, ambiente: 0x6f8055,
    flora: [['ceiba', 0x2f5730, 20], ['palmera', 0x3a6b38, 10]]
  }
}

// --- restos ------------------------------------------------------------------
// Lo que quedó tirado en la cuneta cuando la gente huyó, y no es lo mismo en
// todas partes. La chatarra genérica —el mismo turismo reventado— vale para una
// carretera europea y delata el escenario repintado en cuanto sales de ahí: en
// la sabana lo que se queda tirado es una camioneta, en Siberia una oruga y en
// el Amazonas una barcaza.
//
// Van tumbados o de costado a propósito. Un vehículo bien aparcado no cuenta
// nada; uno volcado cuenta que aquí pasó algo y que nadie ha vuelto.

function camioneta (tono) {
  const g = new THREE.Group()
  const chapa = mat(tono, 0.7, 0.2)
  const oscuro = mat(0x3a322b, 0.85)
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), chapa)
  cabina.position.set(0, 0.95, -1.3)
  g.add(cabina)
  const caja = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 2.8), chapa)
  caja.position.set(0, 0.75, 0.8)
  g.add(caja)
  // La jaula de la caja: cuatro barras. Es lo que la hace camioneta de sabana y
  // no furgoneta.
  for (const x of [-0.95, 0.95]) {
    for (const z of [-0.5, 2]) {
      const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5), oscuro)
      barra.position.set(x, 1.6, z)
      g.add(barra)
    }
  }
  const rueda = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 9)
  for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, 1.4], [1, 1.4]]) {
    const r = new THREE.Mesh(rueda, oscuro)
    r.position.set(x, 0.4, z)
    r.rotation.z = Math.PI / 2
    g.add(r)
  }
  return g
}

function autobus (tono) {
  const g = new THREE.Group()
  const chapa = mat(tono, 0.65, 0.25)
  const cristal = mat(0x2c3a40, 0.3, 0.4)
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 9), chapa)
  cuerpo.position.y = 1.5
  g.add(cuerpo)
  // Ventanillas: una tira a cada lado. Sin ellas es un contenedor.
  for (const lado of [-1, 1]) {
    const tira = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 7.4), cristal)
    tira.position.set(lado * 1.32, 2.1, 0.2)
    g.add(tira)
  }
  // Volcado de costado, que es como acaban los autobuses de las evacuaciones.
  g.rotation.z = Math.PI / 2.1
  g.position.y = 1.2
  return g
}

function oruga (tono) {
  const g = new THREE.Group()
  const chapa = mat(tono, 0.6, 0.4)
  const oscuro = mat(0x2a2723, 0.9)
  const casco = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 5), chapa)
  casco.position.y = 1.35
  g.add(casco)
  const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.8, 7), chapa)
  torre.position.set(0, 2.2, -0.4)
  g.add(torre)
  // Las cadenas: dos cajas largas y bajas a los lados. Es lo que la separa de
  // un camión, y a esta distancia es todo lo que se ve.
  for (const lado of [-1, 1]) {
    const cadena = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 5.2), oscuro)
    cadena.position.set(lado * 1.6, 0.72, 0)
    g.add(cadena)
  }
  return g
}

function barcaza (tono) {
  const g = new THREE.Group()
  const casco = mat(tono, 0.8, 0.1)
  const madera = mat(0x6b563c, 0.95)
  // Casco de fondo plano y proa levantada: varada de lado en la orilla.
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8), casco)
  cuerpo.position.y = 0.8
  g.add(cuerpo)
  const proa = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 4), casco)
  proa.position.set(0, 0.9, -5)
  proa.rotation.x = -Math.PI / 2
  proa.rotation.y = Math.PI / 4
  g.add(proa)
  const techo = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 3.4), madera)
  techo.position.set(0, 2.3, 1.4)
  g.add(techo)
  for (const [x, z] of [[-1.1, 0], [1.1, 0], [-1.1, 2.8], [1.1, 2.8]]) {
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 5), madera)
    poste.position.set(x, 1.5, z)
    g.add(poste)
  }
  g.rotation.z = 0.22
  return g
}

function contenedor (tono) {
  const g = new THREE.Group()
  const chapa = mat(tono, 0.75, 0.3)
  const caja = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), chapa)
  caja.position.y = 1.2
  g.add(caja)
  // Los nervios verticales, que es lo que hace que se lea como contenedor.
  const nervio = mat(0x000000, 0.9)
  nervio.color.setHex(tono).multiplyScalar(0.72)
  for (let i = -2.4; i <= 2.4; i += 0.6) {
    const n = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.2, 0.07), nervio)
    n.position.set(0, 1.2, i)
    g.add(n)
  }
  g.rotation.x = 0.06
  return g
}

export const RESTOS = { camioneta, autobus, oruga, barcaza, contenedor }
