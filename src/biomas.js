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
import { brilla } from './systems/resplandor.js'

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
// `conTorres` en falso la deja como avenida de oficinas cualquiera: sirve para
// cualquier ciudad grande.
function castellana (huecoLado = 0, desde = 0, hasta = 0, conTorres = true) {
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
  if (conTorres) g.add(torres)

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

// --- más monumentos de ciudad ------------------------------------------------
// Todos siguen la misma regla de encuadre que los de arriba: centro a unos 14-19
// de la calzada, entre z = -55 y z = -80, y lo importante por debajo de 10 de
// alto. Lo que sobresale por arriba lo tapa el marcador en el móvil.

// Torre Eiffel, a la derecha: cuatro patas que se juntan, dos plataformas y el
// fuste afilado. Del color bronce oscuro de la pintura real.
function torreEiffel () {
  const g = new THREE.Group()
  const hierro = mat(0x6f5f4c, 0.65, 0.35)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pata = new THREE.Mesh(new THREE.BoxGeometry(0.9, 9, 0.9), hierro)
      pata.position.set(sx * 2.6, 4.2, sz * 2.6)
      pata.rotation.set(-sz * 0.26, 0, sx * 0.26)
      g.add(pata)
    }
    // Los arcos de la base, de pata a pata, en las dos caras que se ven.
    const arco = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 5, 14, Math.PI), hierro)
    arco.position.set(0, 1, sx * 2.9)
    g.add(arco)
  }
  const primera = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 6.4), hierro)
  primera.position.y = 3.8
  g.add(primera)
  const segunda = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.45, 3.3), hierro)
  segunda.position.y = 8.3
  g.add(segunda)
  const fuste = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.6, 9, 4), hierro)
  fuste.rotation.y = Math.PI / 4
  fuste.position.y = 12.9
  g.add(fuste)
  const aguja = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 2.6, 4), hierro)
  aguja.position.y = 18.6
  g.add(aguja)
  g.scale.setScalar(0.62)
  g.position.set(16, 0, -76)
  g.userData.lados = [1]
  return g
}

// Coliseo, a la derecha y con el lado roto mirando a la carretera: tres pisos
// de arcos en óvalo y el ático, que falta en el tramo derrumbado.
// Roma lleva los cuatro pisos; Tarragona, un anfiteatro más bajo y más redondo.
function coliseo (pisosAltos = 4, rx = 6.5, rz = 10) {
  const g = new THREE.Group()
  const piedra = mat(0xcdb994, 0.9)
  const arena = mat(0xc2a878, 1)

  const n = 30
  const suelo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 24), arena)
  suelo.scale.set(rx - 1.2, 1, rz - 1.2)
  g.add(suelo)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = Math.cos(a) * rx
    const z = Math.sin(a) * rz
    // El tramo que da a la calzada (x negativo) está caído: solo el primer piso.
    const roto = Math.cos(a) < -0.55
    const pisos = roto ? Math.min(pisosAltos, 1 + (i % 2)) : pisosAltos
    const giro = -Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx)
    for (let p = 0; p < pisos; p++) {
      const alto = p === 3 ? 1.6 : 2.3
      const y = p * 2.5 + alto / 2
      const pilar = new THREE.Mesh(new THREE.BoxGeometry(p === 3 ? 2.1 : 0.7, alto, 1.1), piedra)
      pilar.position.set(x, y, z)
      pilar.rotation.y = giro
      g.add(pilar)
      if (p < 3) {
        const dintel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 1.2), piedra)
        dintel.position.set(x, y + alto / 2, z)
        dintel.rotation.y = giro
        g.add(dintel)
      }
    }
  }
  g.position.set(17, 0, -62)
  g.userData.lados = [1]
  return g
}

// San Basilio, a la izquierda: el cuerpo de ladrillo, la torre central con su
// chapitel y las cúpulas de cebolla de colores alrededor.
function sanBasilio () {
  const g = new THREE.Group()
  const ladrillo = mat(0xa8432f, 0.9)
  const oro = mat(0xd9b04a, 0.35, 0.6)
  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 8), ladrillo)
  base.position.y = 1.5
  g.add(base)
  const central = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 8, 8), ladrillo)
  central.position.y = 7
  g.add(central)
  const chapitel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.4, 4, 8), mat(0x3f8a5a, 0.6))
  chapitel.position.y = 13
  g.add(chapitel)
  const colores = [0x2f7a4a, 0xd9b12f, 0x2d5fa8, 0xc8483a]
  ;[[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]].forEach(([x, z], i) => {
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 4.5, 8), ladrillo)
    torre.position.set(x, 5.2, z)
    g.add(torre)
    const cebolla = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), mat(colores[i], 0.55))
    cebolla.scale.set(1, 1.2, 1)
    cebolla.position.set(x, 8.4, z)
    g.add(cebolla)
    const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.55, 1.7, 8), mat(colores[i], 0.55))
    punta.position.set(x, 10.3, z)
    g.add(punta)
    const cruz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), oro)
    cruz.position.set(x, 11.2, z)
    g.add(cruz)
  })
  g.scale.setScalar(0.8)
  g.position.set(-16, 0, -70)
  g.userData.lados = [-1]
  return g
}

// Estatua de la Libertad, a la izquierda sobre su isla: pedestal de piedra,
// cobre verde, la corona de puntas y la antorcha dorada en alto.
function libertad () {
  const g = new THREE.Group()
  const piedra = mat(0xb9ae98, 0.9)
  const cobre = mat(0x6fa596, 0.6, 0.2)
  const isla = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.6, 0.6, 12), piedra)
  isla.position.y = 0.3
  g.add(isla)
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), piedra)
  zocalo.position.y = 1.85
  g.add(zocalo)
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 2.6), piedra)
  pedestal.position.y = 4.6
  g.add(pedestal)
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, 4, 8), cobre)
  cuerpo.position.y = 8.1
  g.add(cuerpo)
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), cobre)
  cabeza.position.y = 10.5
  g.add(cabeza)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI - Math.PI / 2
    const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 0.8, 4), cobre)
    rayo.position.set(Math.sin(a) * 0.45, 10.9, Math.cos(a) * 0.45)
    rayo.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9)
    g.add(rayo)
  }
  const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.3, 0.3), cobre)
  brazo.position.set(0.55, 11.1, 0)
  brazo.rotation.z = -0.15
  g.add(brazo)
  const antorcha = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 0.5, 8), mat(0xe2b23e, 0.35, 0.6))
  antorcha.position.set(0.72, 12.4, 0)
  g.add(antorcha)
  const tablilla = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.6), cobre)
  tablilla.position.set(-0.65, 8.4, 0.2)
  g.add(tablilla)
  g.scale.setScalar(0.85)
  g.position.set(-16, 0, -68)
  g.userData.lados = [-1]
  return g
}

// Cristo Redentor, a la derecha: el morro del Corcovado y la figura con los
// brazos abiertos arriba.
function cristo () {
  const g = new THREE.Group()
  const monte = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 9, 11, 9), mat(0x4f7a3e, 1))
  monte.position.y = 5.5
  g.add(monte)
  const roca = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.2, 3, 7), mat(0x7a7468, 1))
  roca.position.set(0.8, 9.6, 0.5)
  g.add(roca)
  const blanco = mat(0xe8e4da, 0.6)
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1), blanco)
  pedestal.position.y = 11.6
  g.add(pedestal)
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 2.7, 8), blanco)
  cuerpo.position.y = 13.5
  g.add(cuerpo)
  const brazos = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.35), blanco)
  brazos.position.y = 14.5
  g.add(brazos)
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), blanco)
  cabeza.position.y = 15.1
  g.add(cabeza)
  g.scale.setScalar(0.6)
  g.position.set(15.5, 0, -70)
  g.userData.lados = [1]
  return g
}

// Puerta de Tiananmén, a la izquierda: el muro rojo con sus cinco pasos, la sala
// de arriba y el tejado dorado de dos aleros. De frente a la calzada.
function ciudadProhibida () {
  const g = new THREE.Group()
  const rojo = mat(0xa3312a, 0.85)
  const tejado = mat(0xd6a13a, 0.5, 0.25)
  const hueco = mat(0x2a1d18, 1)
  const muro = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 5), rojo)
  muro.position.y = 2
  g.add(muro)
  for (let i = -2; i <= 2; i++) {
    const paso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.1), hueco)
    paso.position.set(i * 2.6, 1.2, 2.52)
    g.add(paso)
  }
  const sala = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 3.6), rojo)
  sala.position.y = 5.5
  g.add(sala)
  // Un cilindro de cuatro caras girado 45° es un tejado a cuatro aguas.
  const alero = (rArriba, rAbajo, alto, y, ancho, fondo) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(rArriba, rAbajo, alto, 4), tejado)
    t.rotation.y = Math.PI / 4
    t.scale.set(ancho / (rAbajo * 1.414), 1, fondo / (rAbajo * 1.414))
    t.position.y = y
    g.add(t)
  }
  alero(4, 8, 1.4, 7.7, 13, 5.4)
  const alta = new THREE.Mesh(new THREE.BoxGeometry(8, 1.3, 2.6), rojo)
  alta.position.y = 8.9
  g.add(alta)
  alero(2.5, 6, 1.3, 10.1, 10, 4)
  g.rotation.y = Math.PI / 2
  g.position.set(-15, 0, -66)
  g.userData.lados = [-1]
  return g
}

// Puerta de la India, a la derecha: el arco de arenisca, la cornisa y la
// cúpula baja de arriba.
function puertaIndia () {
  const g = new THREE.Group()
  const arenisca = mat(0xc99a6b, 0.9)
  for (const x of [-3.2, 3.2]) {
    const pilar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 9, 2.6), arenisca)
    pilar.position.set(x, 4.5, 0)
    g.add(pilar)
  }
  const arco = new THREE.Mesh(new THREE.TorusGeometry(2, 0.5, 6, 14, Math.PI), arenisca)
  arco.position.y = 7
  g.add(arco)
  const dintel = new THREE.Mesh(new THREE.BoxGeometry(9, 2.5, 2.6), arenisca)
  dintel.position.y = 10.25
  g.add(dintel)
  const cornisa = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 3), arenisca)
  cornisa.position.y = 11.7
  g.add(cornisa)
  const cupula = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 1, 12), arenisca)
  cupula.position.y = 12.4
  g.add(cupula)
  g.scale.setScalar(0.8)
  g.position.set(16, 0, -72)
  g.userData.lados = [1]
  return g
}

// Ángel de la Independencia, a la izquierda: basamento redondo, columna y la
// victoria dorada con las alas abiertas.
function angel () {
  const g = new THREE.Group()
  const piedra = mat(0xbdb6a6, 0.85)
  const oro = mat(0xe2b23e, 0.35, 0.6)
  const escalon = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.6, 1.5, 16), piedra)
  escalon.position.y = 0.75
  g.add(escalon)
  const basa = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 2.4, 16), piedra)
  basa.position.y = 2.7
  g.add(basa)
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 13, 12), piedra)
  columna.position.y = 10.4
  g.add(columna)
  const capitel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.65, 0.9, 12), piedra)
  capitel.position.y = 17.3
  g.add(capitel)
  const figura = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1.8, 8), oro)
  figura.position.y = 18.6
  g.add(figura)
  for (const s of [-1, 1]) {
    const ala = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1), oro)
    ala.position.set(s * 0.45, 19.3, -0.2)
    ala.rotation.z = s * 0.5
    g.add(ala)
  }
  g.scale.setScalar(0.55)
  g.position.set(-15, 0, -60)
  g.userData.lados = [-1]
  return g
}

// --- piezas para montar monumentos -------------------------------------------
// Con veinte monumentos más, repetir `new THREE.Mesh` + posición + `add` en cada
// pieza triplicaba el código sin decir nada.
const geoCaja = (ancho, alto, fondo) => new THREE.BoxGeometry(ancho, alto, fondo)
const geoCil = (arriba, abajo, alto, lados = 10) => new THREE.CylinderGeometry(arriba, abajo, alto, lados)
const geoBola = (r, a = 12, b = 8) => new THREE.SphereGeometry(r, a, b)
const geoCupula = r => new THREE.SphereGeometry(r, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2)
// Tronco de pirámide de base cuadrada (pilonos, obeliscos): un cilindro de
// cuatro caras girado en la propia geometría, para que escalarlo dé un
// rectángulo y no un rombo.
const geoTronco = (arriba, abajo, alto) => new THREE.CylinderGeometry(arriba * 1.414, abajo * 1.414, alto, 4).rotateY(Math.PI / 4)
const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, material)
  o.position.set(x, y, z)
  g.add(o)
  return o
}
// Tejado a dos aguas a lo largo de z: un prisma triangular con la arista arriba.
// `y` es la altura del alero.
const aguas = (g, material, ancho, alto, largo, x, y, z) => {
  const t = pon(g, geoCil(1, 1, largo, 3), material, x, y + alto / 3, z)
  t.rotation.x = -Math.PI / 2
  t.scale.set(ancho / 1.732, 1, alto / 1.5)
  return t
}
const almenas = (g, material, radio, y, n, cx = 0, cz = 0) => {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    pon(g, geoCaja(0.55, 0.7, 0.55), material, cx + Math.cos(a) * radio, y, cz + Math.sin(a) * radio).rotation.y = -a
  }
}
const cerrito = (g, radio, alto, color, x = 0, z = 0) => pon(g, geoCil(radio * 0.35, radio, alto, 9), mat(color, 1), x, alto / 2, z)
// Escala y sitio en la cuña visible (ver el encuadre en CLAUDE.md).
const colocar = (g, escala, x, z, lado) => {
  g.scale.setScalar(escala)
  g.position.set(x, 0, z)
  g.userData.lados = lado ? [lado] : []
  return g
}

// Castillo de torres redondas almenadas. Nápoles: el Maschio Angioino, con el
// arco de triunfo blanco entre las torres. Sin torres es la fortaleza del
// puerto de Heraclión, sobre su dique.
function castillo (color = 0x6a6258, torres = 4, arco = false, lado = -1) {
  const g = new THREE.Group()
  const piedra = mat(color, 0.95)
  pon(g, geoCaja(12, 5, 9), piedra, 0, 2.5, 0)
  for (let x = -5.5; x <= 5.5; x += 1.25) {
    pon(g, geoCaja(0.6, 0.7, 0.6), piedra, x, 5.35, 4.2)
    pon(g, geoCaja(0.6, 0.7, 0.6), piedra, x, 5.35, -4.2)
  }
  for (const [x, z] of [[-6, 4.5], [6, 4.5], [-6, -4.5], [6, -4.5]].slice(0, torres)) {
    pon(g, geoCil(2, 2.4, 8, 12), piedra, x, 4, z)
    almenas(g, piedra, 2, 8.4, 8, x, z)
  }
  if (arco) {
    pon(g, geoCaja(3, 7, 0.8), mat(0xe8e2d4, 0.8), 0, 3.5, 4.8)
    pon(g, geoCaja(1.4, 3, 0.1), mat(0x2a221c, 1), 0, 1.5, 5.25)
  }
  if (!torres) pon(g, geoCaja(16, 0.8, 30), mat(0x8d877c, 1), 0, 0.4, -4)
  return colocar(g, 0.9, lado * 17, -66, lado)
}

// Notre-Dame de la Garde, a la derecha: la basílica a rayas en lo alto de su
// colina y la Virgen dorada sobre el campanario.
function notreDameGarde () {
  const g = new THREE.Group()
  const blanca = mat(0xe6dcc8, 0.8)
  const verde = mat(0x5d7a5a, 0.8)
  cerrito(g, 9, 6, 0x8a8470)
  pon(g, geoCaja(3, 2.6, 7), blanca, 0, 7.3, 0)
  pon(g, geoCaja(3.05, 0.35, 7.05), verde, 0, 7.6, 0)
  pon(g, geoCil(1.2, 1.2, 1.4, 12), blanca, 0, 9.3, -1.5)
  pon(g, geoCupula(1.2), verde, 0, 10, -1.5)
  pon(g, geoCaja(1.8, 7, 1.8), blanca, 0, 9.5, 3)
  pon(g, geoCaja(1.85, 0.3, 1.85), verde, 0, 8, 3)
  pon(g, geoCaja(1.85, 0.3, 1.85), verde, 0, 10.5, 3)
  pon(g, geoCil(0.4, 0.9, 1.2, 8), blanca, 0, 13.6, 3)
  pon(g, geoCil(0.15, 0.3, 2.2, 8), mat(0xd9b04a, 0.35, 0.6), 0, 15.3, 3)
  return colocar(g, 0.72, 16, -72, 1)
}

// Fourvière, a la izquierda: la basílica blanca de cuatro torres sobre la colina
// y, al lado, la torre metálica que parece una Eiffel pequeña.
function fourviere () {
  const g = new THREE.Group()
  const blanca = mat(0xefe9dc, 0.75)
  cerrito(g, 10, 5, 0x6d7f52)
  pon(g, geoCaja(4, 4, 8), blanca, 0, 7, 0)
  aguas(g, blanca, 4, 1.8, 8, 0, 9, 0)
  for (const [x, z] of [[-2.2, -4.2], [2.2, -4.2], [-2.2, 4.2], [2.2, 4.2]]) {
    pon(g, geoCil(0.9, 0.9, 7, 8), blanca, x, 8.5, z)
    almenas(g, blanca, 0.9, 12.3, 6, x, z)
  }
  pon(g, geoCil(0.15, 1.3, 12, 4), mat(0x8c8f93, 0.5, 0.6), 7, 11, 3)
  return colocar(g, 0.7, -17, -70, -1)
}

// El Duomo de Milán, a la derecha: mármol blanco rosado erizado de pináculos
// y la aguja mayor con la Madonnina dorada.
function duomo () {
  const g = new THREE.Group()
  const marmol = mat(0xeee4dc, 0.7)
  pon(g, geoCaja(8, 6, 16), marmol, 0, 3, 0)
  aguas(g, marmol, 8, 2.6, 16, 0, 6, 0)
  pon(g, geoCaja(8.4, 8.5, 0.8), marmol, 0, 4.25, 8)
  for (let z = -7; z <= 7; z += 2) {
    for (const x of [-4, 4]) pon(g, geoCil(0.02, 0.22, 2.6, 6), marmol, x, 7.3, z)
  }
  for (const x of [-4, -2, 0, 2, 4]) pon(g, geoCil(0.02, 0.25, 3, 6), marmol, x, 10, 8)
  pon(g, geoCil(0.05, 0.7, 7, 8), marmol, 0, 12, -1)
  pon(g, geoCil(0.1, 0.2, 0.8, 6), mat(0xd9b04a, 0.35, 0.6), 0, 15.8, -1)
  return colocar(g, 0.75, 16, -70, 1)
}

// El Partenón, a la derecha, sobre la meseta de la Acrópolis. Le faltan
// columnas: está en ruinas desde mucho antes de la invasión.
function partenon () {
  const g = new THREE.Group()
  const marmol = mat(0xe2d9c4, 0.8)
  pon(g, geoCil(8, 11, 5, 7), mat(0xa39a86, 1), 0, 2.5, 0)
  pon(g, geoCaja(7, 0.6, 12), marmol, 0, 5.3, 0)
  const columna = geoCil(0.3, 0.36, 3.6, 8)
  const puestos = []
  for (let i = 0; i < 6; i++) puestos.push([-3 + i * 1.2, -5.6], [-3 + i * 1.2, 5.6])
  for (let j = 1; j < 8; j++) puestos.push([-3, -5.6 + j * 1.4], [3, -5.6 + j * 1.4])
  puestos.forEach(([x, z], i) => { if (i % 7 !== 3) pon(g, columna, marmol, x, 7.4, z) })
  pon(g, geoCaja(6.8, 0.9, 11.6), marmol, 0, 9.6, 0)
  aguas(g, marmol, 6.8, 1.4, 11.6, 0, 10.05, 0)
  return colocar(g, 0.75, 17, -72, 1)
}

// La Torre Blanca de Salónica, a la izquierda: el cilindro almenado del paseo
// marítimo y su torreón de arriba.
function torreBlanca () {
  const g = new THREE.Group()
  const blanco = mat(0xf1eee6, 0.8)
  const hueco = mat(0x3a3a3a, 1)
  pon(g, geoCil(3, 3.2, 9, 16), blanco, 0, 4.5, 0)
  almenas(g, blanco, 3, 9.35, 14)
  pon(g, geoCil(1.6, 1.6, 2.6, 12), blanco, 0, 10.3, 0)
  almenas(g, blanco, 1.6, 11.9, 8)
  for (const y of [3, 6]) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      pon(g, geoCaja(0.45, 0.9, 0.1), hueco, Math.cos(a) * 3.08, y, Math.sin(a) * 3.08).rotation.y = Math.PI / 2 - a
    }
  }
  return colocar(g, 0.85, -15, -66, -1)
}

// La Biblioteca de Alejandría, a la derecha: el disco de cristal inclinado que
// sale del agua y el muro curvo de granito.
function bibliotecaAlejandria () {
  const g = new THREE.Group()
  pon(g, geoCil(10.5, 10.5, 0.2, 32), mat(0x3fa3cc, 0.12, 0.15), 0, 0.1, 0)
  pon(g, geoCil(9, 9, 1.4, 32), mat(0x6f9fb6, 0.2, 0.4), 0, 1.8, 0).rotation.x = 0.3
  pon(g, new THREE.CylinderGeometry(9.3, 9.3, 2.2, 32, 1, true, -Math.PI / 2, Math.PI), mat(0x8e8a84, 0.7), 0, 1.1, 0)
  return colocar(g, 0.8, 18, -68, 1)
}

// Templo de Luxor, a la izquierda: los dos pilonos, la puerta, los obeliscos
// delante y la hilera de columnas de papiro detrás.
function temploEgipcio () {
  const g = new THREE.Group()
  const arenisca = mat(0xcfae78, 0.95)
  for (const x of [-3.6, 3.6]) pon(g, geoTronco(1.1, 1.6, 8), arenisca, x, 4, 0).scale.set(2, 1, 1)
  pon(g, geoCaja(1.6, 5, 2), arenisca, 0, 2.5, 0)
  pon(g, geoCaja(1, 3.4, 0.1), mat(0x3a2e22, 1), 0, 1.7, 1.05)
  for (const x of [-1.8, 1.8]) {
    pon(g, geoTronco(0.25, 0.45, 9), mat(0xb07a5a, 0.9), x, 4.5, 3.2)
    pon(g, geoTronco(0, 0.25, 0.8), mat(0xd9b04a, 0.35, 0.6), x, 9.4, 3.2)
  }
  for (let i = 0; i < 4; i++) {
    for (const x of [-2, 2]) {
      pon(g, geoCil(0.55, 0.45, 5, 10), arenisca, x, 2.5, -3 - i * 2.2)
      pon(g, geoCil(0.8, 0.5, 0.6, 10), arenisca, x, 5.3, -3 - i * 2.2)
    }
  }
  return colocar(g, 0.9, -16, -66, -1)
}

// La Esfinge, a la derecha, mirando a la carretera, con una pirámide detrás.
function esfinge () {
  const g = new THREE.Group()
  const caliza = mat(0xd4b27a, 0.95)
  pon(g, geoCaja(4, 3.4, 11), caliza, 0, 1.7, 0)
  pon(g, geoCaja(1.3, 1, 5), caliza, -1.2, 0.5, 7)
  pon(g, geoCaja(1.3, 1, 5), caliza, 1.2, 0.5, 7)
  pon(g, geoCaja(3.2, 3.6, 3.4), caliza, 0, 4.4, 4.2)
  pon(g, geoTronco(1.3, 2.3, 2.6), caliza, 0, 5.6, 3.8)
  pon(g, geoCaja(1.6, 1.8, 1), caliza, 0, 5.2, 5.6)
  pon(g, geoTronco(0, 7, 8), mat(0xc9a66e, 1), 3, 4, -14)
  return colocar(g, 0.9, 16, -62, 1)
}

// Los danfos de Lagos: los microbuses amarillos con franja negra, aparcados en
// fila en la acera izquierda.
function danfos () {
  const g = new THREE.Group()
  const amarillo = mat(0xf2c230, 0.6)
  const negro = mat(0x1d1d1d, 0.8)
  const vidrio = mat(0x2f3a42, 0.3, 0.3)
  for (let i = 0; i < 6; i++) {
    const bus = new THREE.Group()
    pon(bus, geoCaja(2, 2, 4.6), amarillo, 0, 1.3, 0)
    pon(bus, geoCaja(2.02, 0.25, 4.62), negro, 0, 1.2, 0)
    pon(bus, geoCaja(2.04, 0.7, 3.4), vidrio, 0, 1.9, -0.3)
    for (const [x, z] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
      pon(bus, geoCil(0.4, 0.4, 0.3, 10), negro, x, 0.4, z).rotation.z = Math.PI / 2
    }
    bus.position.set(-11.2, 0, -22 - i * 9 - azar(0, 3))
    bus.rotation.y = azar(-0.15, 0.15)
    g.add(bus)
  }
  g.userData.lados = []
  return g
}

// La Mezquita Nacional de Abuja, a la derecha: cúpula dorada y cuatro minaretes.
function mezquitaNacional () {
  const g = new THREE.Group()
  const blanca = mat(0xefeae0, 0.8)
  const oro = mat(0xd9b04a, 0.3, 0.7)
  pon(g, geoCaja(9, 4, 9), blanca, 0, 2, 0)
  pon(g, geoCil(3.2, 3.2, 1.2, 16), blanca, 0, 4.6, 0)
  pon(g, geoCupula(3.4), oro, 0, 5.2, 0).scale.y = 1.15
  pon(g, geoCil(0.1, 0.1, 1.4, 6), oro, 0, 9.4, 0)
  for (const [x, z] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) {
    pon(g, geoCil(0.45, 0.55, 12, 10), blanca, x, 6, z)
    pon(g, geoCil(0.75, 0.75, 0.4, 10), blanca, x, 9, z)
    pon(g, geoCil(0.02, 0.5, 1.6, 10), oro, x, 12.8, z)
  }
  return colocar(g, 0.75, 16, -70, 1)
}

// Aso Rock, a la izquierda: el monolito que domina Abuja.
function asoRock () {
  const g = new THREE.Group()
  pon(g, new THREE.DodecahedronGeometry(10, 1), mat(0x6e6258, 1), 0, 4, 0).scale.set(1.3, 0.9, 1.6)
  return colocar(g, 1, -26, -84, -1)
}

// Puerta de la muralla de Kano, a la izquierda: adobe rojizo con los cuernos
// de las esquinas que remata la arquitectura hausa, y los pozos de tinte añil.
function puertaAdobe () {
  const g = new THREE.Group()
  const adobe = mat(0xb9793f, 1)
  pon(g, geoCaja(12, 5.5, 3), adobe, 0, 2.75, 0)
  pon(g, geoCaja(4.4, 7.5, 3.6), adobe, 0, 3.75, 0)
  pon(g, geoCaja(1.8, 3.4, 0.1), mat(0x3a2414, 1), 0, 1.7, 1.85)
  for (const x of [-2.2, 2.2]) pon(g, geoCil(0.05, 0.45, 1.6, 6), adobe, x, 8.3, 1.4)
  for (const x of [-6, 6]) pon(g, geoCil(0.05, 0.45, 1.6, 6), adobe, x, 6.3, 1.2)
  for (let i = 0; i < 5; i++) pon(g, geoCil(0.9, 0.9, 0.12, 12), mat(0x2b3f8f, 0.6), -4 + i * 2, 0.06, 4.5)
  return colocar(g, 0.9, -16, -64, -1)
}

// Puente atirantado junto a la carretera. Bombay: el pilono en Y griega del
// enlace de Bandra. Vladivostok: los mástiles en V del puente de Zolotói.
function puenteAtirantado (forma = 'Y', lado = 1) {
  const g = new THREE.Group()
  const hormigon = mat(0xd8d4cc, 0.8)
  const cable = mat(0xf2f2f2, 0.5, 0.3)
  const alto = 22
  pon(g, geoCaja(4, 0.8, 70), mat(0x6b6d70, 0.9), 0, 6, 0)
  if (forma === 'Y') {
    for (const s of [-1, 1]) pon(g, geoCaja(0.9, 10.4, 0.9), hormigon, s * 1.5, 5, 0).rotation.z = s * 0.29
    pon(g, geoCaja(1, alto - 10, 1), hormigon, 0, 10 + (alto - 10) / 2, 0)
  } else {
    for (const s of [-1, 1]) pon(g, geoCaja(0.9, alto, 0.9), hormigon, s * 2.5, alto / 2, 0).rotation.z = -s * 0.12
  }
  for (const dir of [-1, 1]) {
    for (let i = 1; i <= 6; i++) {
      const zFin = dir * i * 5
      const dy = alto - 1 - i * 0.6 - 6
      pon(g, geoCaja(0.08, Math.hypot(dy, zFin), 0.08), cable, 0, 6 + dy / 2, zFin / 2).rotation.x = Math.atan2(-zFin, dy)
    }
  }
  return colocar(g, 0.55, lado * 17, -72, lado)
}

// El Victoria Memorial de Calcuta, a la izquierda: mármol blanco, cúpula
// central con el ángel negro y cuatro cupulinos en las esquinas.
function victoriaMemorial () {
  const g = new THREE.Group()
  const marmol = mat(0xf2efe8, 0.6)
  pon(g, geoCaja(14, 4, 6), marmol, 0, 2, 0)
  pon(g, geoCaja(5, 5.5, 6.4), marmol, 0, 2.75, 0)
  pon(g, geoCil(2.4, 2.6, 1.8, 16), marmol, 0, 6.4, 0)
  pon(g, geoCupula(2.5), marmol, 0, 7.3, 0).scale.y = 1.25
  pon(g, geoCil(0.12, 0.3, 1.2, 6), mat(0x2a2a2a, 0.5, 0.4), 0, 11, 0)
  for (const x of [-6.2, 6.2]) {
    for (const z of [-2.2, 2.2]) {
      pon(g, geoCil(0.8, 0.8, 1.6, 8), marmol, x, 4.8, z)
      pon(g, geoCupula(0.85), marmol, x, 5.6, z)
    }
  }
  return colocar(g, 0.75, -17, -70, -1)
}

// La Perla Oriental de Shanghái, a la derecha: trípode, fuste y las esferas
// rosas ensartadas.
function perlaOriental () {
  const g = new THREE.Group()
  const rosa = mat(0xc2456e, 0.35, 0.3)
  const hormigon = mat(0xd4d0c8, 0.8)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    pon(g, geoCil(0.35, 0.45, 9, 8), hormigon, Math.cos(a) * 1.6, 4.3, Math.sin(a) * 1.6)
      .rotation.set(-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35)
  }
  pon(g, geoCil(0.5, 0.6, 26, 10), hormigon, 0, 13, 0)
  pon(g, geoBola(3, 18, 12), rosa, 0, 9, 0)
  pon(g, geoBola(2, 16, 10), rosa, 0, 19, 0)
  pon(g, geoBola(0.8, 12, 8), rosa, 0, 24, 0)
  pon(g, geoCil(0.04, 0.25, 5, 6), hormigon, 0, 28, 0)
  return colocar(g, 0.5, 15, -66, 1)
}

// Hongyadong, a la izquierda: las casas sobre pilotes pegadas al acantilado de
// Chongqing, piso sobre piso, con aleros oscuros y farolillos.
function hongyadong () {
  const g = new THREE.Group()
  const madera = mat(0x5a3a26, 0.9)
  const teja = mat(0x2e2b2a, 0.8)
  const farol = mat(0xffb04a, 0.5)
  pon(g, geoCaja(10, 14, 30), mat(0x6f6a5e, 1), -3, 7, 0)
  for (let piso = 0; piso < 4; piso++) {
    const y = 1.6 + piso * 3
    const x = 3.2 - piso * 0.9
    pon(g, geoCaja(3, 2.4, 26), madera, x, y, 0)
    aguas(g, teja, 3.8, 0.9, 26.4, x, y + 1.2, 0)
    for (let z = -12; z <= 12; z += 3) pon(g, geoBola(0.22, 8, 6), farol, x + 1.6, y + 0.6, z)
  }
  return colocar(g, 0.7, -17, -70, -1)
}

// Teatro de cúpula con pórtico. Novosibirsk: la cúpula plateada de la Ópera.
// Manaos: el Teatro Amazonas, fachada rosa y cúpula de azulejos a rayas.
function teatroCupula (colorCupula = 0xb9c2c8, colorFachada = 0xe8e0cf, rayas = false, lado = 1) {
  const g = new THREE.Group()
  const fachada = mat(colorFachada, 0.85)
  const blanco = mat(0xf4f1ea, 0.8)
  pon(g, geoCaja(12, 5, 10), fachada, 0, 2.5, 0)
  for (let i = 0; i < 6; i++) pon(g, geoCil(0.3, 0.3, 4.4, 8), blanco, -lado * 6.6, 2.2, -3.75 + i * 1.5)
  pon(g, geoCaja(1.6, 0.6, 9), blanco, -lado * 6.6, 4.7, 0)
  pon(g, geoCil(3.6, 3.8, 2, 20), fachada, 0, 6, 0)
  const alto = rayas ? 1.1 : 0.8
  pon(g, geoCupula(3.7), mat(colorCupula, 0.35, rayas ? 0.1 : 0.7), 0, 7, 0).scale.y = alto
  if (rayas) {
    for (let k = 0; k < 8; k++) {
      const franja = pon(g, new THREE.TorusGeometry(3.72, 0.12, 4, 16, Math.PI), mat(k % 2 ? 0x2f7a4a : 0x2d5fa8, 0.5), 0, 7, 0)
      franja.rotation.y = (k / 8) * Math.PI
      franja.scale.y = alto
    }
  }
  pon(g, geoCil(0.1, 0.5, 1.4, 8), blanco, 0, 7 + 3.7 * alto + 0.6, 0)
  return colocar(g, 0.75, lado * 16, -70, lado)
}

// Tótems de Anchorage, a la derecha, y la avioneta de flotadores que es como se
// viaja por Alaska.
function totems () {
  const g = new THREE.Group()
  const colores = [0xb8342a, 0x1f1f1f, 0x2f8f88, 0xe8d9b0]
  for (let t = 0; t < 3; t++) {
    const x = t * 3.5 - 3.5
    const z = -t * 5
    const alto = 7 + t
    for (let k = 0; k < alto; k += 1.4) {
      pon(g, geoCil(0.55, 0.6, 1.4, 10), mat(colores[(Math.round(k / 1.4) + t) % 4], 0.8), x, k + 0.7, z)
    }
    pon(g, geoCaja(3.4, 0.4, 0.5), mat(colores[(t + 2) % 4], 0.8), x, alto - 0.6, z)
    pon(g, geoCaja(0.4, 0.9, 1.1), mat(0xe8d9b0, 0.8), x, alto - 1.8, z + 0.6)
  }
  const avion = new THREE.Group()
  const blanco = mat(0xe8e2d4, 0.6)
  pon(avion, geoCaja(1, 1.1, 5), mat(0xd23a2a, 0.6), 0, 2, 0)
  pon(avion, geoCaja(8, 0.18, 1.3), blanco, 0, 2.6, 0.5)
  for (const s of [-1, 1]) pon(avion, geoCaja(0.5, 0.5, 4.6), blanco, s * 1.4, 0.35, 0)
  avion.position.set(4, 0, -14)
  avion.rotation.y = 0.6
  g.add(avion)
  return colocar(g, 1, 15, -60, 1)
}

// La Space Needle de Seattle, a la izquierda: patas en reloj de arena y el
// platillo dorado arriba.
function spaceNeedle () {
  const g = new THREE.Group()
  const blanco = mat(0xeeeeea, 0.6, 0.2)
  const pata = (r, y, alto, inclina, a) => {
    pon(g, geoCil(0.18, 0.25, alto, 6), blanco, Math.cos(a) * r, y, Math.sin(a) * r)
      .rotation.set(-Math.sin(a) * inclina, 0, Math.cos(a) * inclina)
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    pata(1.95, 7, 14.2, 0.18, a)
    pata(1.35, 18.5, 9.1, -0.14, a)
  }
  pon(g, geoCil(3.2, 4.6, 1.2, 24), blanco, 0, 22.6, 0)
  pon(g, geoCil(5, 3, 1.6, 24), mat(0xd9912e, 0.5, 0.3), 0, 23.8, 0)
  pon(g, geoCil(0.05, 0.3, 4, 6), blanco, 0, 27, 0)
  return colocar(g, 0.4, -13, -50, -1)
}

// El Cerro de la Silla de Monterrey, al fondo a la izquierda: la montaña con
// sus dos cuernos.
function cerroSilla () {
  const g = new THREE.Group()
  const roca = mat(0x7d7a62, 1)
  pon(g, geoCil(2, 14, 7, 9), roca, 0, 3.5, 0).scale.z = 0.6
  pon(g, geoCil(0.4, 4.5, 7, 7), roca, -6.5, 9.5, 0)
  pon(g, geoCil(0.4, 4.5, 6, 7), roca, 6, 9, 0)
  return colocar(g, 0.6, -18, -88, -1)
}

// El Faro del Comercio, a la derecha: la lámina naranja con el láser verde
// que barre la ciudad.
function faroComercio () {
  const g = new THREE.Group()
  pon(g, geoCaja(1.4, 26, 4.5), mat(0xd9652b, 0.8), 0, 13, 0)
  const laser = new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.5 })
  pon(g, geoCil(0.08, 0.08, 40, 6), laser, -12, 24, 0).rotation.z = 1.2
  return colocar(g, 0.5, 14, -60, 1)
}

// La catedral de Guadalajara, a la derecha: las dos agujas de azulejo amarillo.
function catedralGdl () {
  const g = new THREE.Group()
  const cantera = mat(0xe6d9b8, 0.85)
  const amarillo = mat(0xe8b92e, 0.5, 0.1)
  pon(g, geoCaja(8, 7, 14), cantera, 0, 3.5, 0)
  aguas(g, cantera, 8, 2, 14, 0, 7, 0)
  for (const x of [-3.2, 3.2]) {
    pon(g, geoCaja(2.4, 11, 2.4), cantera, x, 5.5, 6)
    pon(g, geoCil(0.05, 1.5, 6, 8), amarillo, x, 14, 6)
  }
  pon(g, geoCil(2, 2, 1.5, 12), cantera, 0, 8.4, -2)
  pon(g, geoCupula(2), amarillo, 0, 9.1, -2)
  return colocar(g, 0.62, 16, -70, 1)
}

// El MASP de São Paulo, a la izquierda: los dos pórticos rojos y la caja de
// cristal colgada con el vano libre debajo.
function masp () {
  const g = new THREE.Group()
  const rojo = mat(0xc8231e, 0.6)
  for (const z of [-9, 9]) {
    for (const x of [-2.8, 2.8]) pon(g, geoCaja(1, 8, 1.4), rojo, x, 4, z)
    pon(g, geoCaja(6.6, 1.2, 1.4), rojo, 0, 8.6, z)
  }
  pon(g, geoCaja(5.2, 3.4, 20), mat(0x2b3237, 0.25, 0.4), 0, 5.2, 0)
  pon(g, geoCaja(12, 0.3, 26), mat(0x9a9a96, 0.9), 0, 0.15, 0)
  return colocar(g, 0.8, -16, -64, -1)
}

// --- la base alienígena -------------------------------------------------------
// Al fondo de la carretera en cada misión: es lo que venimos a limpiar y de
// donde salen las naves. Tres cuerpos (cúpula, colmena, trípode) y la misma
// antena encima, con anillos que giran y el haz que sube al cielo.
//
// Materiales propios y sin niebla: a esa distancia la niebla la borraba del
// todo. Para que se lea lejana va pequeña y en tonos grises azulados, como vista
// a través de la bruma, pero con las luces verdes nítidas.
export function baseAlien (variante = 0) {
  const g = new THREE.Group()
  const casco = new THREE.MeshStandardMaterial({ color: 0x7a8292, roughness: 0.6, metalness: 0.3, fog: false })
  const carne = new THREE.MeshStandardMaterial({ color: 0x86778f, roughness: 0.8, metalness: 0.1, fog: false })
  const plato = new THREE.MeshStandardMaterial({ color: 0x8b919c, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide, fog: false })
  const luz = new THREE.MeshStandardMaterial({ color: 0x2bd47a, emissive: 0x2bd47a, emissiveIntensity: 1.6, fog: false })
  const haz = new THREE.MeshBasicMaterial({ color: 0x5dffa6, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const brillan = []
  const aro = (radio, grueso, y) => {
    const a = pon(g, new THREE.TorusGeometry(radio, grueso, 4, 40), luz, 0, y, 0)
    a.rotation.x = Math.PI / 2
    brillan.push(a)
  }

  pon(g, geoCil(15, 17, 1.6, 8), casco, 0, 0.8, 0)
  aro(16, 0.22, 1.7)
  let tope
  if (variante === 0) {
    pon(g, new THREE.SphereGeometry(8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), casco, 0, 1.6, 0).scale.y = 0.72
    aro(8.05, 0.2, 2.6)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      pon(g, geoCil(0.12, 1.1, 10, 6), casco, Math.cos(a) * 11.5, 6.5, Math.sin(a) * 11.5)
        .rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25)
      brillan.push(pon(g, geoBola(0.45), luz, Math.cos(a) * 12.8, 11.4, Math.sin(a) * 12.8))
    }
    tope = 1.6 + 8 * 0.72
  } else if (variante === 1) {
    for (const [x, z, r] of [[0, 0, 4], [-7, 3, 3.6], [6.5, 2, 4], [-3, -6, 3.4], [4, -6, 3]]) {
      pon(g, geoBola(r, 16, 12), carne, x, 1.6 + r * 0.5, z).scale.y = 1.25
      brillan.push(pon(g, geoBola(r * 0.16, 8, 6), luz, x + r * 0.7, 1.6 + r * 0.9, z + r * 0.5))
    }
    tope = 8.6
  } else {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      pon(g, geoCil(0.35, 0.6, 8.6, 8), casco, Math.cos(a) * 4.5, 4.8, Math.sin(a) * 4.5)
        .rotation.set(-Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62)
    }
    pon(g, geoCil(9, 5, 2.2, 20), casco, 0, 8.4, 0)
    brillan.push(pon(g, geoCil(5.2, 5.2, 0.25, 20), luz, 0, 7.2, 0))
    tope = 9.5
  }

  // La antena.
  // Corta a propósito: en el móvil en vertical el marcador tapa todo lo que
  // pase de unos 7 de alto a esta distancia, y una antena alta no se veía nunca.
  pon(g, geoCil(0.3, 0.9, 7, 8), casco, 0, tope + 3.5, 0)
  pon(g, new THREE.SphereGeometry(2.6, 18, 6, 0, Math.PI * 2, 0, 0.9), plato, 0, tope + 6.2, 0).rotation.x = Math.PI
  const anillos = [2.4, 1.7].map((r, i) => {
    const a = pon(g, new THREE.TorusGeometry(r, 0.12, 6, 32), luz, 0, tope + 6.4 + i * 1.1, 0)
    brillan.push(a)
    return a
  })
  const orbe = pon(g, geoBola(0.75, 14, 10), luz, 0, tope + 8.4, 0)
  brillan.push(orbe)
  pon(g, new THREE.CylinderGeometry(0.4, 1.8, 70, 14, 1, true), haz, 0, tope + 8.4 + 35, 0)
  // Se anima sola al dibujarse: así no hace falta que el bucle del juego sepa
  // que existe.
  orbe.onBeforeRender = () => {
    const t = performance.now() / 1000
    anillos[0].rotation.set(Math.PI / 2 + Math.sin(t * 0.7) * 0.5, t * 1.3, 0)
    anillos[1].rotation.set(Math.PI / 2 - Math.sin(t * 0.9) * 0.6, 0, -t * 1.7)
    orbe.scale.setScalar(1 + Math.sin(t * 4) * 0.25)
    haz.opacity = 0.13 + Math.sin(t * 4) * 0.05
  }
  for (const b of brillan) brilla(b)
  // Bien al fondo, más allá de donde acaba la calzada. Ahí la franja libre bajo
  // el marcador da unos 5 de alto: el cuerpo cabe entero y la antena asoma.
  g.scale.setScalar(0.36)
  g.position.set(0, 0, -108)
  return g
}

export const HITOS = {
  piramides, volcan, karst, columnas,
  artesYCiencias, castellana, bernabeu,
  torreEiffel, coliseo, sanBasilio, libertad, cristo, ciudadProhibida, puertaIndia, angel,
  castillo, notreDameGarde, fourviere, duomo, partenon, torreBlanca, bibliotecaAlejandria,
  temploEgipcio, esfinge, danfos, mezquitaNacional, asoRock, puertaAdobe, puenteAtirantado,
  victoriaMemorial, perlaOriental, hongyadong, teatroCupula, totems, spaceNeedle,
  cerroSilla, faroComercio, catedralGdl, masp
}

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
