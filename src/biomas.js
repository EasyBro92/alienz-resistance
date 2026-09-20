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
import { brilla, apagarEmision } from './systems/resplandor.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as ESPANA from './monumentos/espana.js'
import * as FRANCIA from './monumentos/francia.js'
import * as ITALIA from './monumentos/italia.js'
import * as GRECIA from './monumentos/grecia.js'
import * as EGIPTO from './monumentos/egipto.js'
import * as NIGERIA from './monumentos/nigeria.js'
import * as INDIA from './monumentos/india.js'
import * as CHINA from './monumentos/china.js'
import * as RUSIA from './monumentos/rusia.js'
import * as USA from './monumentos/usa.js'
import * as MEXICO from './monumentos/mexico.js'
import * as DOMINICANA from './monumentos/dominicana.js'
import * as BRASIL from './monumentos/brasil.js'

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
  // L'Umbracle: la galería de arcos blancos junto al estanque, y la pupila del
  // Hemisfèric dentro del ojo.
  for (let i = 0; i < 14; i++) {
    pon(g, new THREE.TorusGeometry(3.2, 0.25, 4, 14, Math.PI), blanco, -6, 0, -4 - i * 3).rotation.y = Math.PI / 2
  }
  pon(g, geoCaja(0.4, 0.4, 42), blanco, -6, 3.2, -23.5)
  pon(g, geoBola(2.1, 16, 10), mat(0x33556e, 0.2, 0.3), 0, 1.2, -58)
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
  // Acompaña al monumento, no es el monumento: el vuelo de presentación no la
  // enfoca a ella.
  g.userData.acompaña = true
  return g
}

// Contorno del Bernabéu reformado: ni óvalo ni rectángulo, un rectángulo de
// esquinas muy redondeadas (superelipse). Con un óvalo parecía una plaza de
// toros; lo que lo hace reconocible es esa forma de almohada.
const superelipse = (u, n) => {
  const c = Math.cos(u)
  const s = Math.sin(u)
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]
}

// Una piel que da la vuelta al contorno siguiendo un perfil. Cada fila es un
// anillo: `k` escala el contorno (0 lo cierra en el centro, para cubiertas), `d`
// lo separa hacia fuera y `y` es su altura. `ola(u)` sube o baja la fila según
// por dónde pase.
function geoContorno (rx, rz, n, filas, { columnas = 96, ola = null } = {}) {
  const pos = []
  const idx = []
  for (const { k = 1, d = 0, y } of filas) {
    for (let j = 0; j <= columnas; j++) {
      const u = (j / columnas) * Math.PI * 2
      const [ex, ez] = superelipse(u, n)
      pos.push((rx * k + d) * ex, y + (ola ? ola(u) : 0), (rz * k + d) * ez)
    }
  }
  const paso = columnas + 1
  for (let f = 0; f < filas.length - 1; f++) {
    for (let j = 0; j < columnas; j++) {
      const a = f * paso + j
      // Con este orden la normal mira hacia fuera (y hacia arriba en la cubierta).
      idx.push(a, a + paso, a + 1, a + 1, a + paso, a + paso + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// El rótulo de la fachada, pintado en un lienzo: letras de palo seco blancas y
// una insignia redonda. Va aparte de lo fundido, que pierde las coordenadas de
// textura.
function rotuloBernabeu () {
  const lienzo = document.createElement('canvas')
  lienzo.width = 1024
  lienzo.height = 96
  const c = lienzo.getContext('2d')
  c.fillStyle = '#f3f5f7'
  c.strokeStyle = '#f3f5f7'
  c.font = '600 54px Arial, Helvetica, sans-serif'
  c.textBaseline = 'middle'
  const texto = 'ESTADIO SANTIAGO BERNABÉU'
  c.fillText(texto, 10, 50)
  const cx = c.measureText(texto).width + 62
  c.lineWidth = 5
  c.beginPath()
  c.arc(cx, 50, 34, 0, Math.PI * 2)
  c.stroke()
  // Una corona sencilla dentro del círculo.
  c.beginPath()
  c.moveTo(cx - 17, 60)
  c.lineTo(cx - 19, 34)
  c.lineTo(cx - 8, 46)
  c.lineTo(cx, 30)
  c.lineTo(cx + 8, 46)
  c.lineTo(cx + 19, 34)
  c.lineTo(cx + 17, 60)
  c.closePath()
  c.fill()
  const tex = new THREE.CanvasTexture(lienzo)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const ancho = 15
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, ancho * lienzo.height / lienzo.width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  m.renderOrder = 3
  return m
}

// El Bernabéu reformado, a la DERECHA de la Castellana, con el lado largo
// mirando a la avenida, como en la foto aérea desde Nuevos Ministerios:
//   · la piel de lamas de acero en bandas horizontales que ondulan, abombada
//     a media altura y recogida arriba en el remate de la cubierta;
//   · abajo, metida hacia dentro, la planta baja oscura de vidrio y los
//     machones de bronce de las esquinas;
//   · la cubierta clara con su retícula;
//   · el rótulo «ESTADIO SANTIAGO BERNABÉU» en la fachada de la avenida;
//   · la explanada de losa clara con árboles, farolas, la rotonda ajardinada y
//     gente, y bloques de viviendas detrás.
// Medido para el móvil en vertical: la fachada queda en x ≈ 13-16, dentro de la
// cuña visible entre z = -50 y z = -90; entero se ve en el vuelo del principio.
function bernabeu () {
  const h = new THREE.Group()
  // Lo fundible va en el primer hijo; el rótulo, con textura, en otro.
  const g = new THREE.Group()
  h.add(g)
  const CX = 26
  const CZ = -70
  // Todo el conjunto se adelanta hacia la cámara: más al fondo lo tapaba el
  // marcador y en la partida solo asomaba una esquina.
  const ADELANTE = 12
  const RX = 13
  const RZ = 20
  const N = 5
  const lamina = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o })
  const piel = lamina({ color: 0xaab1b8, roughness: 0.22, metalness: 0.72 })
  const nucleo = mat(0x252a30, 0.65, 0.3)
  const vidrio = lamina({ color: 0x1b2229, roughness: 0.12, metalness: 0.6 })
  const bronce = lamina({ color: 0x4d3f33, roughness: 0.5, metalness: 0.4 })
  const techo = lamina({ color: 0xc9d0d6, roughness: 0.3, metalness: 0.35 })
  const nervio = mat(0x8a929a, 0.35, 0.55)
  const contorno = (material, filas, opciones) => {
    const m = pon(g, geoContorno(RX, RZ, N, filas, opciones), material, CX, 0, CZ)
    return m
  }

  // --- planta baja: vidrio oscuro metido bajo el vuelo de la piel ---
  contorno(vidrio, [{ d: -1.9, y: 0 }, { d: -1.9, y: 2.5 }])
  // Los machones de bronce: donde el edificio toca el suelo en las esquinas.
  for (let q = 0; q < 4; q++) {
    const u = Math.PI / 4 + q * Math.PI / 2
    const [ex, ez] = superelipse(u, N)
    const m = pon(g, geoCaja(4.6, 3.4, 1.4), bronce, CX + (RX - 1.4) * ex, 1.7, CZ + (RZ - 1.4) * ez)
    m.rotation.y = -Math.atan2(RZ * ez, RX * ex) + Math.PI / 2
  }
  // El núcleo oscuro que asoma entre las lamas.
  contorno(nucleo, [{ d: -2, y: 2.3 }, { d: -2, y: 12.4 }])

  // --- la piel de lamas ---
  // Perfil de la fachada (separación, altura): entra abajo, se abomba a media
  // altura y se recoge arriba hacia la cubierta.
  const perfil = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 2.4, 0),
    new THREE.Vector3(-0.3, 4.4, 0),
    new THREE.Vector3(0.55, 6.9, 0),
    new THREE.Vector3(0.7, 9.4, 0),
    new THREE.Vector3(0.25, 11.4, 0),
    new THREE.Vector3(-0.8, 12.35, 0)
  ])
  const BANDAS = 32
  for (let b = 0; b < BANDAS; b++) {
    const s0 = b / BANDAS
    const s1 = s0 + 0.74 / BANDAS
    const sb = (s0 + s1) / 2
    // Las bandas ondulan: bajan en el centro de los lados largos y suben en las
    // esquinas, más en la mitad de la fachada que arriba o abajo.
    const amplitud = Math.sin(Math.PI * sb)
    const ola = u => amplitud * (-0.42 * Math.cos(2 * u) + 0.16 * Math.sin(4 * u + sb * 5))
    const filas = [s0, (s0 + s1) / 2, s1].map(s => {
      const p = perfil.getPointAt(s)
      return { d: p.x, y: p.y }
    })
    contorno(piel, filas, { columnas: 120, ola })
  }

  // --- cubierta ---
  // El borde metálico que remata la piel y, dentro, la cubierta clara.
  contorno(piel, [{ d: -0.8, y: 12.35 }, { k: 0.97, d: -0.8, y: 12.6 }, { k: 0.88, d: -0.8, y: 12.78 }])
  contorno(techo, [{ k: 0.88, d: -0.8, y: 12.78 }, { k: 0.6, d: -0.5, y: 12.95 }, { k: 0.3, d: -0.2, y: 13 }, { k: 0, d: 0, y: 13 }])
  // La retícula: nervios en las dos direcciones, recortados al contorno.
  const rxI = RX * 0.88 - 0.8
  const rzI = RZ * 0.88 - 0.8
  for (let x = -rxI + 1; x < rxI - 0.4; x += 1.5) {
    const largo = 2 * rzI * Math.pow(1 - Math.pow(Math.abs(x / rxI), N), 1 / N)
    pon(g, geoCaja(0.08, 0.1, largo * 0.96), nervio, CX + x, 13.02, CZ)
  }
  for (let z = -rzI + 1; z < rzI - 0.4; z += 2) {
    const largo = 2 * rxI * Math.pow(1 - Math.pow(Math.abs(z / rzI), N), 1 / N)
    pon(g, geoCaja(largo * 0.96, 0.1, 0.08), nervio, CX, 13.02, CZ + z)
  }

  // --- la explanada ---
  const losa = mat(0xe4dfd3, 0.95)
  const junta = mat(0xcbc4b5, 0.95)
  pon(g, geoCaja(33, 0.1, 82), losa, 29.2, 0.05, -61)
  // Las juntas en diagonal de la plaza del sur.
  for (let i = 0; i < 9; i++) {
    const r = pon(g, geoCaja(0.12, 0.02, 14), junta, 16 + i * 3.2, 0.11, -45)
    r.rotation.y = 0.7
  }
  // La rotonda ajardinada de la esquina.
  pon(g, geoCil(3.2, 3.3, 0.35, 20), mat(0x5b8742, 1), 18, 0.2, -44)
  pon(g, geoCil(3.35, 3.35, 0.45, 20), mat(0xb9b3a6, 0.9), 18, 0.12, -44)

  const tronco = mat(0x5f4a36)
  const copas = [mat(0x4b7336, 0.95), mat(0x3f6530, 0.95), mat(0x58813d, 0.95)]
  const arbol = (x, z, r = azar(1.1, 1.6)) => {
    const alto = r * 2.2
    pon(g, geoCil(0.12, 0.18, alto, 5), tronco, x, alto / 2, z)
    const c = pon(g, geoBola(r, 8, 6), copas[Math.floor(Math.random() * copas.length)], x, alto + r * 0.5, z)
    c.scale.y = 0.85
  }
  // Una fila junto a la avenida, espaciada para dejar ver la fachada, y un
  // bosquete en la plaza del sur.
  for (let z = -46; z > -98; z -= 13) arbol(13.4 + azar(-0.3, 0.3), z, azar(0.9, 1.2))
  for (let i = 0; i < 9; i++) arbol(azar(22, 42), azar(-39, -47))
  // La plaza sigue hacia la cámara: arboleda en cuadrícula, como la del paseo.
  for (let x = 16; x < 44; x += 5) for (let z = -28; z > -36; z -= 5) arbol(x + azar(-0.6, 0.6), z + azar(-0.6, 0.6))
  arbol(18, -44, 1.5)
  for (let i = 0; i < 6; i++) arbol(azar(42, 44), azar(-52, -96))

  // Farolas y los mástiles altos de la plaza.
  const acero = mat(0x6d7278, 0.5, 0.6)
  for (const [x, z, alto] of [[21, -41, 11], [30, -40.5, 11], [38, -42, 11], [14.8, -60, 5], [14.8, -80, 5], [42, -70, 5]]) {
    pon(g, geoCil(0.08, 0.12, alto, 6), acero, x, alto / 2, z)
    pon(g, geoCaja(0.9, 0.2, 0.3), acero, x, alto, z)
  }

  // La gente de la explanada: un puñado de figuras mínimas, que a esta
  // distancia es lo que se ve.
  const ropa = [mat(0x2f3338), mat(0x7a3434), mat(0x33507a), mat(0xd8d2c4), mat(0x4f6b3a)]
  const cabeza = mat(0xc99b78)
  for (let i = 0; i < 90; i++) {
    const enPlaza = i < 60
    const x = enPlaza ? azar(15, 40) : azar(14.2, 15.2)
    const z = enPlaza ? azar(-39.5, -49) : azar(-52, -92)
    pon(g, geoCaja(0.36, 0.95, 0.26), ropa[i % ropa.length], x, 0.57, z)
    pon(g, geoBola(0.14, 6, 4), cabeza, x, 1.18, z)
  }

  // Bloques de viviendas detrás, como los de la calle de Concha Espina.
  const ventana = mat(0x3b4955, 0.25, 0.4)
  for (const [z, alto, fondo] of [[-47, 22, 12], [-62, 16, 13], [-78, 26, 12], [-94, 18, 12]]) {
    const x = 54
    pon(g, geoCaja(12, alto, fondo), mat([0xcfc4b0, 0xb8ab99, 0xd9d2c4, 0x9c8f80][Math.abs(z) % 4], 0.85), x, alto / 2, z)
    for (let y = 2.6; y < alto - 1.5; y += 3) pon(g, geoCaja(0.12, 1.2, fondo * 0.8), ventana, x - 6.06, y, z)
  }

  // --- el rótulo ---
  // En la fachada de la avenida, sobre la parte abombada de la piel.
  const rotulo = rotuloBernabeu()
  rotulo.rotation.y = -Math.PI / 2
  rotulo.position.set(CX - (RX + 0.9), 8.6, CZ + 4)
  h.add(rotulo)

  h.userData.lados = [1]
  // No se funde con el decorado (el rótulo necesita su textura).
  h.userData.aparte = true
  // El vuelo del principio lo mira desde arriba de la avenida, por el sur, que
  // es el ángulo de la foto aérea: desde la carretera no se veía la cubierta.
  h.userData.vista = { desde: [-3, 44, -12 + ADELANTE], mira: [CX, 3, CZ - 2 + ADELANTE] }
  h.position.z = ADELANTE
  return h
}

// --- más monumentos de ciudad ------------------------------------------------
// Todos siguen la misma regla de encuadre que los de arriba: centro a unos 14-19
// de la calzada, entre z = -55 y z = -80, y lo importante por debajo de 10 de
// alto. Lo que sobresale por arriba lo tapa el marcador en el móvil.

// Torre Eiffel, a la derecha: cuatro patas que se juntan, dos plataformas y el
// fuste afilado. Del color bronce oscuro de la pintura real.
// Celosía de verdad: cuatro patas que se curvan hasta juntarse, cada una con sus
// cuatro largueros, aspas y travesaños en todas las caras; los arcos de la
// base, las dos plataformas y el fuste de arriba, también calado. Con patas
// macizas era una pirámide cualquiera: lo que la hace la Eiffel es el hierro
// cruzado y la curva.
function torreEiffel () {
  const g = new THREE.Group()
  const hierro = mat(0x6f5f4c, 0.65, 0.35)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  // Semiancho de la torre a cada altura: la curva exponencial de la de verdad.
  const ancho = y => 6.2 * Math.exp(-y / 7.2) + 0.25
  const TRAMOS = 6
  const ESQUINAS = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  const columna = (y0, y1, centro, semiancho, grueso) => {
    for (let t = 0; t < TRAMOS; t++) {
      const ya = y0 + (y1 - y0) * (t / TRAMOS)
      const yb = y0 + (y1 - y0) * ((t + 1) / TRAMOS)
      const ca = centro(ya)
      const cb = centro(yb)
      const pa = ESQUINAS.map(([ex, ez]) => V(ca.x + ex * semiancho(ya), ya, ca.z + ez * semiancho(ya)))
      const pb = ESQUINAS.map(([ex, ez]) => V(cb.x + ex * semiancho(yb), yb, cb.z + ez * semiancho(yb)))
      for (let e = 0; e < 4; e++) {
        const f = (e + 1) % 4
        barra(g, hierro, pa[e], pb[e], grueso)
        barra(g, hierro, pa[e], pb[f], grueso * 0.5)
        barra(g, hierro, pa[f], pb[e], grueso * 0.5)
        barra(g, hierro, pb[e], pb[f], grueso * 0.6)
      }
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const semi = y => 1.15 - y * 0.05
      columna(0, 11, y => { const c = ancho(y) - semi(y); return V(sx * c, 0, sz * c) }, semi, 0.22)
    }
  }
  columna(11, 27, () => V(0, 0, 0), y => ancho(y) * 0.95, 0.16)
  for (const [y, alto] of [[5.6, 0.7], [11, 0.5]]) {
    const semi = ancho(y) + 0.4
    pon(g, geoCaja(semi * 2, alto, semi * 2), hierro, 0, y, 0)
    // La barandilla: un borde alto y fino alrededor de la plataforma.
    pon(g, geoCaja(semi * 2 + 0.1, 0.5, semi * 2 + 0.1), mat(0x5a4c3c, 0.7, 0.3), 0, y + alto / 2 + 0.25, 0).scale.set(1, 1, 1)
  }
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    const arco = pon(g, new THREE.TorusGeometry(3.6, 0.18, 4, 18, Math.PI), hierro, Math.sin(a) * 4.1, 1.6, Math.cos(a) * 4.1)
    arco.rotation.y = a
  }
  pon(g, geoCaja(1.2, 1.3, 1.2), hierro, 0, 27.5, 0)
  pon(g, geoCil(0.05, 0.14, 3.4, 6), hierro, 0, 29.8, 0)
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
  // El muro interior en sombra, detrás de los arcos: sin fondo oscuro los arcos
  // se leían como una valla y no como una fachada con galerías.
  const fondo = pon(g, new THREE.CylinderGeometry(1, 1, pisosAltos * 2.5, 30, 1, true), mat(0x5b4a38, 1), 0, pisosAltos * 1.25, 0)
  fondo.scale.set(rx - 0.7, 1, rz - 0.7)
  // Gradas: anillos escalonados hacia la arena.
  for (let r = 0; r < 3; r++) {
    const grada = pon(g, new THREE.CylinderGeometry(1, 1, 0.5, 30, 1, true), piedra, 0, 1 + r * 1.4, 0)
    grada.scale.set(rx - 3.2 + r * 0.8, 1, rz - 3.2 + r * 0.8)
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
  // Los kokoshniki —arcos en escalera— alrededor de la torre central, las
  // franjas blancas que dan vueltas a cada cebolla y las ventanas de las torres.
  const blanco = mat(0xf1ece2, 0.8)
  const hueco = mat(0x2e2622, 1)
  for (let piso = 0; piso < 2; piso++) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const r = 1.72 - piso * 0.22
      pon(g, new THREE.TorusGeometry(0.42, 0.09, 4, 10, Math.PI), blanco, Math.cos(a) * r, 3.4 + piso * 1.7, Math.sin(a) * r).rotation.y = Math.PI / 2 - a
    }
  }
  ;[[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]].forEach(([x, z]) => {
    for (let k = 0; k < 3; k++) {
      const aro = pon(g, new THREE.TorusGeometry(1.25 - Math.abs(k - 1) * 0.3, 0.1, 4, 18), blanco, x, 7.8 + k * 0.6, z)
      aro.rotation.set(Math.PI / 2 + 0.3, 0, (k - 1) * 0.4)
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2
      pon(g, geoCaja(0.28, 0.9, 0.08), hueco, x + Math.cos(a) * 1.08, 5.2, z + Math.sin(a) * 1.08).rotation.y = Math.PI / 2 - a
    }
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
  // Pliegues de la túnica y la cornisa del pedestal.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    pon(g, geoCaja(0.12, 3.6, 0.12), cobre, Math.cos(a) * 0.78, 7.9, Math.sin(a) * 0.78).rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1)
  }
  pon(g, geoCaja(2.9, 0.4, 2.9), piedra, 0, 6.2, 0)
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
  // Rocas y selva por las laderas: el Corcovado es un pico verde y rocoso, no un
  // cono liso.
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(3, 8.2)
    const y = ((9 - r) * 11) / 8.4
    pon(g, new THREE.DodecahedronGeometry(azar(0.6, 1.5), 0), mat(0x7a7468, 1), Math.cos(a) * r, y, Math.sin(a) * r)
  }
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(2.5, 8.5)
    const y = ((9 - r) * 11) / 8.4
    pon(g, geoCil(0.05, 0.9, 1.8, 6), mat(0x3f6b33, 1), Math.cos(a) * r, y + 0.6, Math.sin(a) * r)
  }
  // El vuelo de la túnica y las manos.
  pon(g, geoCil(0.5, 0.75, 1.1, 10), blanco, 0, 12.6, 0)
  for (const s of [-1, 1]) pon(g, geoBola(0.2, 8, 6), blanco, s * 1.85, 14.5, 0)
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
  // Balaustrada de mármol sobre el muro, columnas rojas en la fachada de la
  // sala, el retrato sobre el paso central y farolillos bajo el alero.
  const marmol = mat(0xe9e4da, 0.8)
  pon(g, geoCaja(14.2, 0.7, 0.3), marmol, 0, 4.35, 2.4)
  for (let x = -6.8; x <= 6.8; x += 0.85) pon(g, geoCaja(0.12, 0.5, 0.12), marmol, x, 4.25, 2.4)
  for (let i = -4; i <= 4; i++) pon(g, geoCil(0.18, 0.18, 3, 8), rojo, i * 1.25, 5.5, 1.9)
  pon(g, geoCaja(1.1, 1.4, 0.1), mat(0x3b3b3b, 0.8), 0, 2.9, 2.56)
  for (const x of [-4.5, -1.5, 1.5, 4.5]) pon(g, geoBola(0.3, 10, 8), mat(0xd23a2a, 0.6), x, 6.6, 2.3)
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
  // La franja con la inscripción, los paneles hundidos de los pilares, las
  // escalinatas y la llama eterna delante.
  const grabado = mat(0x9f7650, 0.95)
  pon(g, geoCaja(9.1, 0.8, 2.7), grabado, 0, 9.4, 0)
  for (const x of [-3.2, 3.2]) {
    for (const y of [2.2, 5.6]) pon(g, geoCaja(1.5, 2.4, 2.7), grabado, x, y, 0)
  }
  for (let s = 0; s < 3; s++) pon(g, geoCaja(11 - s * 1.2, 0.3, 4.4 - s * 0.6), arenisca, 0, 0.15 + s * 0.3, 0)
  pon(g, geoCil(0.55, 0.35, 0.5, 10), mat(0x444444, 0.6, 0.4), 0, 0.25, 3.6)
  pon(g, geoBola(0.3, 8, 6), mat(0xffa030, 0.5), 0, 0.7, 3.6)
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
  // Las cuatro estatuas de bronce de las esquinas del basamento, la barandilla
  // y los anillos que marcan los tambores de la columna.
  const bronce = mat(0x4a4a44, 0.6, 0.4)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    pon(g, geoCaja(1.3, 1.2, 1.3), piedra, Math.cos(a) * 4.3, 2.1, Math.sin(a) * 4.3)
    pon(g, geoCil(0.35, 0.6, 1.9, 8), bronce, Math.cos(a) * 4.3, 3.6, Math.sin(a) * 4.3)
  }
  pon(g, new THREE.TorusGeometry(3.4, 0.12, 4, 28), piedra, 0, 4.1, 0).rotation.x = Math.PI / 2
  for (const y of [6, 9, 12, 15]) pon(g, new THREE.TorusGeometry(0.72, 0.1, 4, 16), piedra, 0, y, 0).rotation.x = Math.PI / 2
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

// Barra entre dos puntos: largueros y aspas de celosía, cables.
const barra = (g, material, a, b, grueso = 0.08) => {
  const d = new THREE.Vector3().subVectors(b, a)
  const largo = d.length()
  const m = pon(g, geoCaja(grueso, largo, grueso), material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  return m
}
// Fila de arcos oscuros (portadas, galerías, ventanales). Mira hacia +z; `giro`
// la orienta a otra cara.
const arcada = (g, oscuro, { ancho, alto, n, x = 0, y = 0, z = 0, giro = 0 }) => {
  const fila = new THREE.Group()
  const paso = ancho / n
  const r = paso * 0.3
  for (let i = 0; i < n; i++) {
    const u = -ancho / 2 + (i + 0.5) * paso
    const recto = Math.max(0.1, alto - r)
    pon(fila, geoCaja(r * 2, recto, 0.1), oscuro, u, recto / 2, 0)
    pon(fila, new THREE.CylinderGeometry(r, r, 0.1, 12, 1, false, Math.PI / 2, Math.PI), oscuro, u, recto, 0).rotation.x = Math.PI / 2
  }
  fila.position.set(x, y, z)
  fila.rotation.y = giro
  g.add(fila)
  return fila
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
  // Talud de la base, aspilleras en el muro y en las torres.
  const aspillera = mat(0x2a221c, 1)
  pon(g, geoCaja(12.6, 1, 9.6), piedra, 0, 0.5, 0)
  for (let x = -4.5; x <= 4.5; x += 1.5) pon(g, geoCaja(0.2, 0.9, 0.08), aspillera, x, 3.3, 4.53)
  for (const [x, z] of [[-6, 4.5], [6, 4.5], [-6, -4.5], [6, -4.5]].slice(0, torres)) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      pon(g, geoCaja(0.2, 0.9, 0.08), aspillera, x + Math.cos(a) * 2.18, 5.5, z + Math.sin(a) * 2.18).rotation.y = Math.PI / 2 - a
    }
  }
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
  // Basamento del fuerte, ventanas en arco de la nave y vanos del campanario.
  const hueco = mat(0x3a3a3a, 1)
  pon(g, geoCil(3.8, 3.8, 1.2, 12), mat(0xb9ad92, 0.9), 0, 6.2, 0)
  for (let z = -2.5; z <= 2.5; z += 1.25) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.1, 1, 0.5), hueco, s * 1.53, 7.3, z)
  }
  for (const s of [-1, 1]) {
    pon(g, geoCaja(0.1, 1.6, 0.7), hueco, s * 0.92, 11.4, 3)
    pon(g, geoCaja(0.7, 1.6, 0.1), hueco, 0, 11.4, 3 + s * 0.92)
  }
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
  // Rosetón, portada de tres arcos y ventanales en los flancos.
  const oscuro = mat(0x3a3a3a, 1)
  pon(g, geoCil(0.9, 0.9, 0.1, 16), mat(0x5a6f8a, 0.3, 0.3), 0, 7.6, 4.05).rotation.x = Math.PI / 2
  arcada(g, oscuro, { ancho: 3.2, alto: 1.8, n: 3, y: 5, z: 4.06 })
  for (const s of [-1, 1]) arcada(g, oscuro, { ancho: 6.5, alto: 1.5, n: 5, x: s * 2.06, y: 6.5, giro: (s * Math.PI) / 2 })
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
  // Portadas y rosetón en la fachada, contrafuertes y ventanales góticos en los
  // flancos, y más agujas sobre la cumbrera.
  const oscuro = mat(0x4a4540, 1)
  arcada(g, oscuro, { ancho: 6, alto: 3, n: 3, z: 8.42 })
  pon(g, geoCil(1, 1, 0.1, 16), mat(0x6a7f99, 0.3, 0.3), 0, 6, 8.45).rotation.x = Math.PI / 2
  for (let z = -7; z <= 7; z += 2) {
    for (const s of [-1, 1]) {
      pon(g, geoCaja(0.45, 4.6, 0.5), marmol, s * 4.3, 2.3, z)
      pon(g, geoCaja(0.08, 3, 0.7), oscuro, s * 4.03, 3.4, z + 1)
    }
  }
  for (let z = -6; z <= 6; z += 3) pon(g, geoCil(0.02, 0.18, 2.2, 6), marmol, 0, 9.6, z)
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
  // Los tres escalones, la cella en sombra detrás de las columnas y los
  // triglifos del friso.
  pon(g, geoCaja(7.8, 0.3, 12.8), marmol, 0, 5.15, 0)
  pon(g, geoCaja(4.4, 3.6, 8.4), mat(0xbdb39c, 0.95), 0, 7.4, 0)
  for (let x = -3.2; x <= 3.2; x += 0.64) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.22, 0.5, 0.05), mat(0x9c9483, 1), x, 9.75, s * 5.84)
  }
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
  // Cornisa, bandera griega y la plaza del paseo marítimo.
  pon(g, new THREE.TorusGeometry(3.15, 0.12, 4, 28), blanco, 0, 7.8, 0).rotation.x = Math.PI / 2
  pon(g, geoCil(0.05, 0.05, 3, 6), mat(0x888888, 0.5, 0.5), 0, 13, 0)
  pon(g, geoCaja(1.4, 0.9, 0.05), mat(0x2d5fa8, 0.7), 0.72, 14, 0)
  pon(g, geoCil(5.5, 5.5, 0.3, 24), mat(0xcfc6b4, 0.9), 0, 0.15, 0)
  return colocar(g, 0.85, -15, -66, -1)
}

// La Biblioteca de Alejandría, a la derecha: el disco de cristal inclinado que
// sale del agua y el muro curvo de granito.
function bibliotecaAlejandria () {
  const g = new THREE.Group()
  pon(g, geoCil(10.5, 10.5, 0.2, 32), mat(0x3fa3cc, 0.12, 0.15), 0, 0.1, 0)
  pon(g, geoCil(9, 9, 1.4, 32), mat(0x6f9fb6, 0.2, 0.4), 0, 1.8, 0).rotation.x = 0.3
  pon(g, new THREE.CylinderGeometry(9.3, 9.3, 2.2, 32, 1, true, -Math.PI / 2, Math.PI), mat(0x8e8a84, 0.7), 0, 1.1, 0)
  // Las juntas del disco de cristal y las letras de todos los alfabetos talladas
  // en el muro de granito.
  const rejilla = new THREE.Group()
  rejilla.position.set(0, 1.8, 0)
  rejilla.rotation.x = 0.3
  g.add(rejilla)
  const junta = mat(0x2f3f4a, 0.4, 0.5)
  for (let i = -8; i <= 8; i += 2) {
    const largo = 2 * Math.sqrt(81 - i * i)
    pon(rejilla, geoCaja(0.08, 0.06, largo), junta, i, 0.72, 0)
    pon(rejilla, geoCaja(largo, 0.06, 0.08), junta, 0, 0.72, i)
  }
  for (let k = 0; k < 44; k++) {
    const a = -Math.PI / 2 + Math.random() * Math.PI
    pon(g, geoCaja(0.28, 0.38, 0.05), mat(0x5a5650, 1), Math.sin(a) * 9.36, azar(0.4, 1.9), Math.cos(a) * 9.36).rotation.y = a
  }
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
  // Relieves en los pilonos, mástiles en sus hendiduras y la avenida de esfinges
  // que llega a la puerta.
  const grabado = mat(0x8a6a44, 1)
  for (const x of [-3.6, 3.6]) {
    for (let f = 0; f < 3; f++) {
      for (let c = 0; c < 4; c++) pon(g, geoCaja(0.5, 0.7, 0.05), grabado, x - 1.6 + c * 1.07, 1.2 + f * 1.3, 1.62 - f * 0.08)
    }
  }
  for (const s of [-1, 1]) pon(g, geoCil(0.07, 0.07, 9.5, 6), mat(0x6b4a2a, 0.9), s * 1.1, 4.75, 1.4)
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const z = 5.5 + i * 2.3
      pon(g, geoCaja(0.9, 0.5, 1.5), arenisca, s * 2.5, 0.55, z)
      pon(g, geoCaja(0.8, 0.3, 1.9), arenisca, s * 2.5, 0.15, z)
      pon(g, geoCaja(0.55, 0.65, 0.55), arenisca, s * 2.5, 1.05, z + 0.55)
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
  // Rayas del nemes, barba y la pirámide escalonada de detrás, con su remate.
  const raya = mat(0xa88b5c, 0.95)
  for (let k = 0; k < 5; k++) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.08, 2.1, 0.22), raya, s * 1.22, 5.3, 2.9 + k * 0.45)
  }
  pon(g, geoCaja(0.45, 0.9, 0.4), caliza, 0, 3.9, 6.2)
  for (let s = 1; s < 8; s++) {
    const lado = 7 * (1 - s / 8) * 2 + 0.3
    pon(g, geoCaja(lado, 0.12, lado), mat(0xb8955e, 1), 3, s, -14)
  }
  pon(g, geoTronco(0, 0.9, 1), mat(0xe6d3a8, 0.8), 3, 7.5, -14)
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
  g.userData.acompaña = true
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
    // Anillos de los minaretes.
    for (const y of [3.5, 7.5, 10.6]) pon(g, new THREE.TorusGeometry(0.58, 0.08, 4, 14), blanca, x, y, z).rotation.x = Math.PI / 2
  }
  // Arcos en las cuatro fachadas, nervios de la cúpula y la media luna.
  const oscuro = mat(0x3a3a3a, 1)
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    arcada(g, oscuro, { ancho: 7, alto: 2.4, n: 5, x: Math.sin(a) * 4.52, y: 0.4, z: Math.cos(a) * 4.52, giro: a })
  }
  for (let k = 0; k < 12; k++) {
    const nervio = pon(g, new THREE.TorusGeometry(3.42, 0.06, 4, 16, Math.PI), mat(0xb8903a, 0.4, 0.6), 0, 5.2, 0)
    nervio.rotation.y = (k / 12) * Math.PI
    nervio.scale.y = 1.15
  }
  pon(g, new THREE.TorusGeometry(0.4, 0.07, 4, 12, Math.PI * 1.4), oro, 0, 10.4, 0)
  return colocar(g, 0.75, 16, -70, 1)
}

// Aso Rock, a la izquierda: el monolito que domina Abuja.
function asoRock () {
  const g = new THREE.Group()
  pon(g, new THREE.DodecahedronGeometry(10, 1), mat(0x6e6258, 1), 0, 4, 0).scale.set(1.3, 0.9, 1.6)
  colocar(g, 1, -26, -84, -1).userData.acompaña = true
  return g
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
  // Relieves en la puerta, almenas redondeadas, gárgolas de madera y el arco.
  const relieve = mat(0xa86a34, 1)
  for (let i = 0; i < 6; i++) pon(g, geoCaja(0.5, 0.5, 0.08), relieve, -1.3 + (i % 3) * 1.3, 4.4 + Math.floor(i / 3) * 1.1, 1.85)
  for (let x = -5.6; x <= 5.6; x += 0.8) pon(g, geoCil(0.05, 0.3, 0.6, 6), adobe, x, 5.8, 0)
  for (const x of [-4, 4]) pon(g, geoCil(0.08, 0.08, 1, 6), mat(0x5a3a22, 0.9), x, 4.4, 1.9).rotation.x = Math.PI / 2
  pon(g, new THREE.CylinderGeometry(0.9, 0.9, 0.1, 12, 1, false, Math.PI / 2, Math.PI), mat(0x3a2414, 1), 0, 3.4, 1.86).rotation.x = Math.PI / 2
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
  // Segundo plano de cables, barandillas y farolas del tablero, y el cimiento.
  for (const dir of [-1, 1]) {
    for (let i = 1; i <= 6; i++) {
      for (const s of [-1, 1]) {
        barra(g, cable, new THREE.Vector3(0, alto - 1 - i * 0.6, 0), new THREE.Vector3(s * 1.8, 6.4, dir * (i * 5 + 2.5)), 0.06)
      }
    }
  }
  const gris = mat(0xcfcfcf, 0.6, 0.3)
  for (const s of [-1, 1]) {
    pon(g, geoCaja(0.12, 0.6, 70), gris, s * 2, 6.7, 0)
    for (let z = -32; z <= 32; z += 8) {
      pon(g, geoCil(0.05, 0.05, 2, 6), gris, s * 2, 7.4, z)
      pon(g, geoBola(0.15, 8, 6), mat(0xfff2c0, 0.5), s * 2, 8.4, z)
    }
  }
  pon(g, geoCaja(5, 2, 5), hormigon, 0, 1, 0)
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
  // Ventanas en arco de las alas, pórtico de columnas, el estanque del jardín y
  // la estatua de la reina delante.
  const hueco = mat(0x44423e, 1)
  for (const s of [-1, 1]) arcada(g, hueco, { ancho: 4, alto: 2, n: 4, x: s * 4.6, y: 0.8, z: 3.02 })
  for (let i = -2; i <= 2; i++) pon(g, geoCil(0.2, 0.2, 4, 8), marmol, i * 0.9, 2.75, 3.4)
  pon(g, geoCaja(5, 0.5, 1.2), marmol, 0, 5, 3.3)
  pon(g, geoCaja(12, 0.1, 5), mat(0x3f7fa8, 0.15, 0.2), 0, 0.05, 8)
  pon(g, geoCil(0.3, 0.5, 2, 8), mat(0x2a2a2a, 0.5, 0.4), 0, 1, 5.5)
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
  // Las tres columnas que unen las esferas, las cuentas pequeñas entre ellas y
  // las cristaleras de las dos grandes.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 3
    pon(g, geoCil(0.25, 0.25, 10, 8), hormigon, Math.cos(a) * 1.2, 14, Math.sin(a) * 1.2)
    pon(g, geoBola(0.9, 12, 8), rosa, Math.cos(a) * 1.3, 4.6, Math.sin(a) * 1.3)
  }
  for (let i = 0; i < 4; i++) pon(g, geoBola(0.55, 10, 8), rosa, 0, 13.2 + i * 1.3, 0)
  for (const [y, r] of [[9, 3.03], [19, 2.03]]) pon(g, new THREE.TorusGeometry(r, 0.14, 4, 24), mat(0x2a3540, 0.3, 0.5), 0, y, 0).rotation.x = Math.PI / 2
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
    // Barandilla roja y ventanas encendidas en cada piso.
    pon(g, geoCaja(0.1, 0.5, 26), mat(0x8a2a22, 0.8), x + 1.55, y - 0.9, 0)
    for (let z = -11; z <= 11; z += 2) pon(g, geoCaja(0.06, 0.9, 0.9), mat(0xffd08a, 0.6), x + 1.52, y + 0.1, z)
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
  // Ventanales en arco en las fachadas largas y frontón sobre el pórtico.
  const hueco = mat(0x4a4540, 1)
  for (const s of [-1, 1]) arcada(g, hueco, { ancho: 9, alto: 1.6, n: 6, y: 1, z: s * 5.03, giro: s > 0 ? 0 : Math.PI })
  aguas(g, blanco, 1.8, 1.2, 9, -lado * 6.6, 5, 0)
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
  // Las caras talladas: ojos blancos y un pico en cada tramo de cada tótem.
  for (let t = 0; t < 3; t++) {
    const x = t * 3.5 - 3.5
    const z = -t * 5
    for (let k = 0.7; k < 7 + t; k += 1.4) {
      for (const s of [-1, 1]) pon(g, geoCaja(0.22, 0.14, 0.06), mat(0xf2f2f2, 0.8), x + s * 0.2, k + 0.25, z + 0.58)
      pon(g, geoCaja(0.12, 0.35, 0.14), mat(0x1f1f1f, 0.8), x, k - 0.1, z + 0.6)
    }
  }
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
  // Núcleo de ascensores, anillo de la cintura y la cristalera del platillo.
  pon(g, geoCil(0.45, 0.45, 22, 8), blanco, 0, 11, 0)
  pon(g, new THREE.TorusGeometry(2.4, 0.12, 4, 24), blanco, 0, 14, 0).rotation.x = Math.PI / 2
  pon(g, new THREE.TorusGeometry(4.95, 0.14, 4, 32), mat(0x2a3540, 0.3, 0.5), 0, 23.6, 0).rotation.x = Math.PI / 2
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
  colocar(g, 0.6, -18, -88, -1).userData.acompaña = true
  return g
}

// El Faro del Comercio, a la derecha: la lámina naranja con el láser verde
// que barre la ciudad.
function faroComercio () {
  const g = new THREE.Group()
  pon(g, geoCaja(1.4, 26, 4.5), mat(0xd9652b, 0.8), 0, 13, 0)
  const laser = new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.5 })
  pon(g, geoCil(0.08, 0.08, 40, 6), laser, -12, 24, 0).rotation.z = 1.2
  // Zócalo de la plaza y la linterna del láser arriba.
  pon(g, geoCaja(4, 1, 7), mat(0x9a9a96, 0.9), 0, 0.5, 0)
  pon(g, geoCaja(1.5, 1.2, 1.2), mat(0x2a2a2a, 0.6), 0, 24.5, 0)
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
  // Portada, reloj, vanos de los campanarios con sus cruces y ventanales en los
  // flancos.
  const oscuro = mat(0x4a4540, 1)
  arcada(g, oscuro, { ancho: 3, alto: 2.6, n: 1, z: 7.02 })
  pon(g, geoCil(0.6, 0.6, 0.1, 14), mat(0xf2efe6, 0.6), 0, 5.2, 7.05).rotation.x = Math.PI / 2
  for (const x of [-3.2, 3.2]) {
    arcada(g, oscuro, { ancho: 1.6, alto: 1.5, n: 1, x, y: 8.3, z: 7.22 })
    pon(g, geoCaja(0.08, 0.7, 0.08), oscuro, x, 17.3, 6)
    pon(g, geoCaja(0.4, 0.08, 0.08), oscuro, x, 17.4, 6)
  }
  for (const s of [-1, 1]) arcada(g, oscuro, { ancho: 10, alto: 2.2, n: 5, x: s * 4.02, y: 2, giro: (s * Math.PI) / 2 })
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
  // Los montantes de la cristalera, que es lo que deja ver que la caja cuelga.
  for (let z = -9.5; z <= 9.5; z += 1.2) {
    for (const s of [-1, 1]) pon(g, geoCaja(0.06, 3.4, 0.06), mat(0x777a7e, 0.4, 0.6), s * 2.62, 5.2, z)
  }
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

// --- monumentos de Meshy ---------------------------------------------------------
// Los tres más conocidos llevan modelo 3D de verdad. Mientras carga —o si no
// está— se ve el de código, ya colocado y a la misma altura; al llegar el modelo
// ocupa su sitio. Van aparte del decorado fundido, porque llegan tarde.
//
// Más grandes que los de código y más cerca: en el móvil solo se ve la parte de
// abajo, pero una pata de la Eiffel se reconoce y un bloque de cuatro cajas no.
// Entero se ve en el vuelo de presentación del principio.
// La playa. Arena clara a los dos lados del campo; en uno el mar —arena mojada,
// espuma de la orilla, olas y la torre del socorrista— y en el otro palmeras
// inclinadas, sombrillas de paja y hamacas. El lado del mar queda despejado de
// árboles y restos.
function playa (lado = 1) {
  const g = new THREE.Group()
  const plano = (ancho, largo, material, x, y, z = -80) => {
    const p = pon(g, new THREE.PlaneGeometry(ancho, largo), material, x, y, z)
    p.rotation.x = -Math.PI / 2
    return p
  }
  const agua = new THREE.MeshStandardMaterial({ color: 0x27a9c2, roughness: 0.12, metalness: 0.15 })
  plano(240, 340, agua, lado * 133, 0.04)
  plano(9, 340, mat(0xf1e4c2, 1), lado * 8.6, 0.02)
  plano(2.2, 340, mat(0xcdb487, 1), lado * 12, 0.03)
  plano(0.7, 340, mat(0xf5faf8, 0.9), lado * 13.1, 0.05)
  for (let i = 0; i < 7; i++) plano(0.3, 340, mat(0x8fdde6, 0.5), lado * (16 + i * 5.5), 0.05)
  plano(12, 340, mat(0xf1e4c2, 1), -lado * 12.8, 0.02)
  const otro = -lado
  const troncoMat = mat(0x8a6a48, 0.95)
  const hojaMat = mat(0x3f7f3a, 0.8)
  for (let z = 6; z > -120; z -= 8 + Math.random() * 4) {
    const palmera = new THREE.Group()
    for (let k = 0; k < 6; k++) pon(palmera, geoCil(0.16 - k * 0.012, 0.2 - k * 0.012, 1.1, 7), troncoMat, 0, 0.55 + k * 1.05, 0)
    for (let k = 0; k < 7; k++) {
      const hoja = pon(palmera, geoCaja(0.5, 0.06, 2.6), hojaMat, 0, 6.5, 0)
      hoja.rotation.set(0.45, (k / 7) * Math.PI * 2, 0)
      hoja.translateZ(1.1)
    }
    palmera.position.set(otro * azar(14, 21), 0, z)
    palmera.rotation.set(0, Math.random() * Math.PI, otro * azar(0.12, 0.3))
    g.add(palmera)
  }
  for (let z = 0; z > -90; z -= 11) {
    const x = otro * azar(9.5, 12)
    pon(g, geoCil(0.05, 0.05, 2.4, 6), mat(0x7a5a3a, 0.9), x, 1.2, z)
    pon(g, geoCil(0.02, 1.4, 0.7, 12), mat(0xc9a15a, 1), x, 2.5, z)
    pon(g, geoCaja(0.7, 0.15, 1.8), mat(0xf2f2ee, 0.8), x + otro * 1.1, 0.35, z + 0.4)
  }
  const tx = lado * 10.8
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) pon(g, geoCil(0.06, 0.06, 2.2, 6), mat(0xe8e2d4, 0.8), tx + dx, 1.1, -34 + dz)
  pon(g, geoCaja(1.6, 1.1, 1.6), mat(0xd2452f, 0.7), tx, 2.75, -34)
  pon(g, geoTronco(0, 1.2, 0.7), mat(0xe8e2d4, 0.8), tx, 3.65, -34)
  pon(g, geoCil(0.03, 0.03, 1.6, 5), mat(0x777777, 0.6), tx, 4.6, -34)
  pon(g, geoCaja(0.6, 0.35, 0.03), mat(0xf2d22e, 0.7), tx + 0.3, 5.1, -34)
  g.userData.lados = [lado]
  g.userData.despejar = [lado]
  g.userData.acompaña = true
  return g
}

// El Alcázar de Colón, a la izquierda: el palacio de piedra coralina con sus dos
// pisos de galerías mirando a la plaza, los torreones de los extremos y la
// estatua delante.
function alcazarColon () {
  const g = new THREE.Group()
  const coral = mat(0xd8c7a3, 0.95)
  const oscuro = mat(0x3a3128, 1)
  pon(g, geoCaja(4, 8, 22), coral, 0, 4, 0)
  for (const y of [0.3, 4.4]) arcada(g, oscuro, { ancho: 18, alto: 3.2, n: 6, x: 2.02, y, giro: Math.PI / 2 })
  pon(g, geoCaja(4.4, 0.4, 22.4), coral, 0, 4.1, 0)
  pon(g, geoCaja(4.4, 0.5, 22.4), coral, 0, 8.2, 0)
  for (const z of [-11, 11]) pon(g, geoCaja(4.6, 9, 3), coral, 0.2, 4.5, z)
  pon(g, geoCaja(1.2, 1.6, 1.2), mat(0xb9b2a6, 0.9), 5, 0.8, 0)
  pon(g, geoCil(0.25, 0.4, 1.8, 8), mat(0x3f4a3f, 0.5, 0.5), 5, 2.5, 0)
  return colocar(g, 1, -15, -62, -1)
}

// El Faro a Colón, a la derecha: la cruz tumbada de hormigón escalonado y el haz
// de luz que sube al cielo desde el cruce.
function faroColon () {
  const g = new THREE.Group()
  const hormigon = mat(0xa39d92, 0.95)
  for (let k = 0; k < 5; k++) pon(g, geoCaja(8 - k * 1.2, 1.6, 40 - k * 5), hormigon, 0, 0.8 + k * 1.6, 0)
  for (let k = 0; k < 4; k++) pon(g, geoCaja(22 - k * 3.5, 1.6, 6 - k * 0.9), hormigon, 0, 0.8 + k * 1.6, -6)
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.35, depthWrite: false })
  pon(g, geoCil(0.35, 0.8, 30, 8), luz, 0, 23, -6)
  return colocar(g, 0.8, 18, -66, 1)
}

// El Campo de Marte. La misión de París no va por carretera: va por el césped
// que lleva a la torre. Aquí está todo el parque —paseos de albero a los lados,
// el seto bajo que enmarca el césped, dos hileras de plátanos podados en caja
// por lado, farolas de hierro, bancos, parterres de flores y los paseos que
// cruzan—. La torre va aparte (`eiffelFondo`).
function campoDeMarte () {
  const g = new THREE.Group()
  const albero = mat(0xd9c9a0, 1)
  const seto = mat(0x3f6a34, 0.95)
  const copa = mat(0x4d7a3a, 0.9)
  const tronco = mat(0x6b5a48, 0.9)
  const hierro = mat(0x2f4a3a, 0.5, 0.4)
  const madera = mat(0x3f6b4a, 0.7)
  const plano = (ancho, largo, material, x, z, y = 0.012) => {
    const p = pon(g, new THREE.PlaneGeometry(ancho, largo), material, x, y, z)
    p.rotation.x = -Math.PI / 2
    return p
  }
  for (const s of [-1, 1]) {
    plano(5, 150, albero, s * 9.5, -55)
    for (let z = 8; z > -128; z -= 9) pon(g, geoCaja(0.6, 0.55, 7.6), seto, s * 7.1, 0.27, z - 3.8)
    for (const fila of [13.5, 18]) {
      for (let z = 4; z > -130; z -= 6.5) {
        pon(g, geoCil(0.16, 0.22, 2.6, 6), tronco, s * fila, 1.3, z)
        pon(g, geoCaja(3.2, 2.6, 5.6), copa, s * fila, 3.9, z)
      }
    }
    for (let z = 2; z > -125; z -= 12) {
      pon(g, geoCil(0.07, 0.1, 3.4, 6), hierro, s * 11.6, 1.7, z)
      pon(g, geoCaja(0.45, 0.55, 0.45), mat(0xf4ecd0, 0.6), s * 11.6, 3.6, z)
      pon(g, geoCaja(0.5, 0.08, 1.8), madera, s * 11.6, 0.45, z - 6)
      pon(g, geoCaja(0.08, 0.5, 1.8), madera, s * 11.85, 0.75, z - 6)
    }
    for (let k = 0; k < 3; k++) {
      pon(g, geoCil(1, 1, 0.25, 14), mat(k % 2 ? 0xd8454a : 0xf2efe6, 0.8), s * 9.5, 0.13, -2 - k * 5).scale.set(1.3, 1, 1.8)
    }
  }
  // Paseos que cruzan el césped: anchos y pálidos, caminos y no marcas.
  plano(40, 2.2, albero, 0, -24, 0.015)
  plano(40, 2.2, albero, 0, -70, 0.015)
  g.userData.lados = [-1, 1]
  g.userData.acompaña = true
  return g
}

const cargadorMonumentos = new GLTFLoader()
function conModelo (nombre, respaldo, { altura, x, z, giro = 0 }) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.userData.lados = [Math.sign(x)]
  g.userData.aparte = true
  respaldo.position.set(0, 0, 0)
  respaldo.updateMatrixWorld(true)
  const alto = new THREE.Box3().setFromObject(respaldo).getSize(new THREE.Vector3()).y
  if (alto > 0) respaldo.scale.multiplyScalar(altura / alto)
  g.add(respaldo)
  cargadorMonumentos.loadAsync(`${import.meta.env.BASE_URL}models/${nombre}.glb`).then(gltf => {
    const m = gltf.scene
    apagarEmision(m)
    m.rotation.y = giro
    m.updateMatrixWorld(true)
    const caja = new THREE.Box3().setFromObject(m)
    const tam = caja.getSize(new THREE.Vector3())
    if (tam.y < 1e-4) return
    m.scale.setScalar(altura / tam.y)
    m.updateMatrixWorld(true)
    caja.setFromObject(m)
    const centro = caja.getCenter(new THREE.Vector3())
    m.position.set(-centro.x, -caja.min.y, -centro.z)
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    // `clear` y no `remove(respaldo)`: el mundo cambia el respaldo por su versión
    // fundida al montar el paisaje.
    g.clear()
    g.add(m)
  }).catch(() => { /* sin modelo se queda el de código */ })
  return g
}

export const HITOS = {
  campoDeMarte, playa, alcazarColon, faroColon,
  // La torre al fondo del parque, centrada: sus patas enmarcan el final del
  // césped y la base alienígena queda debajo, entre ellas.
  eiffelFondo: () => conModelo('monumento-eiffel', torreEiffel(), { altura: 42, x: 0, z: -92 }),
  eiffel3d: () => conModelo('monumento-eiffel', torreEiffel(), { altura: 34, x: 18, z: -70 }),
  coliseo3d: () => conModelo('monumento-coliseo', coliseo(), { altura: 8, x: 24.5, z: -64 }),
  libertad3d: () => conModelo('monumento-libertad', libertad(), { altura: 22, x: -14, z: -52 }),
  piramides, volcan, karst, columnas,
  artesYCiencias, castellana, bernabeu,
  torreEiffel, coliseo, sanBasilio, libertad, cristo, ciudadProhibida, puertaIndia, angel,
  castillo, notreDameGarde, fourviere, duomo, partenon, torreBlanca, bibliotecaAlejandria,
  temploEgipcio, esfinge, danfos, mezquitaNacional, asoRock, puertaAdobe, puenteAtirantado,
  victoriaMemorial, perlaOriental, hongyadong, teatroCupula, totems, spaceNeedle,
  cerroSilla, faroComercio, catedralGdl, masp,
  // Los monumentos detallados, con su entorno (src/monumentos/). Donde
  // comparten nombre con uno de arriba, lo sustituyen.
  tarraco: ESPANA.tarraco,
  artesYCiencias: ESPANA.artesValencia,
  notreDameGarde: FRANCIA.notreDame,
  fourviere: FRANCIA.fourviere,
  maschioAngioino: ITALIA.maschioAngioino,
  // El Coliseo de Meshy salía deformado: Roma usa ya el de código.
  coliseo3d: ITALIA.coliseoRoma,
  duomo: ITALIA.duomo,
  partenon: GRECIA.partenon,
  torreBlanca: GRECIA.torreBlanca,
  koules: GRECIA.koules,
  bibliotecaAlejandria: EGIPTO.bibliotecaAlejandria,
  temploEgipcio: EGIPTO.temploEgipcio,
  esfinge: EGIPTO.esfinge,
  teatroNacional: NIGERIA.teatroNacional,
  mezquitaNacional: NIGERIA.mezquitaNacional,
  puertaAdobe: NIGERIA.puertaAdobe,
  puenteAtirantado: INDIA.puenteAtirantado,
  puertaIndia: INDIA.puertaIndia,
  victoriaMemorial: INDIA.victoriaMemorial,
  perlaOriental: CHINA.perlaOriental,
  ciudadProhibida: CHINA.ciudadProhibida,
  hongyadong: CHINA.hongyadong,
  sanBasilio: RUSIA.sanBasilio,
  operaNovosibirsk: RUSIA.operaNovosibirsk,
  puenteZolotoi: RUSIA.puenteZolotoi,
  totems: USA.totems,
  spaceNeedle: USA.spaceNeedle,
  faroComercio: MEXICO.faroComercio,
  catedralGdl: MEXICO.catedralGdl,
  angel: MEXICO.angel,
  bavaro: DOMINICANA.bavaro,
  alcazarColon: DOMINICANA.alcazarColon,
  faroColon: DOMINICANA.faroColon,
  sanFelipe: DOMINICANA.sanFelipe,
  cristo: BRASIL.cristo,
  masp: BRASIL.masp,
  teatroAmazonas: BRASIL.teatroAmazonas
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
    hora: 'tarde',
    restos: [['camioneta', 0x9a6a4a, 3], ['contenedor', 0x8a6f4a, 2]],
    asfalto: 0x83807a, raya: 0xe8dcc0, bordillo: 0xbdb6a8,
    terreno: 'hierba', tierra: 0xaab27c, cerro: 0xb99a72, meseta: 0xc7ab86,
    cielo: 0x7cb6e0, niebla: 0xc2d6dd, sol: 0xfff2d8, ambiente: 0xd6a86f,
    flora: [['pino', 0x4e6b3c, 16], ['olivo', 0x8a9b78, 10]]
  },
  // París no es una región, es un jardín. Sin restos ni flora suelta: el parque
  // lo pone el hito `campoDeMarte`. Los cerros del fondo, en verde oscuro, se
  // leen como arboledas lejanas.
  parque: {
    hora: 'dia',
    restos: [],
    asfalto: 0x8fb46a, raya: 0x8fb46a, bordillo: 0xd9c9a0,
    terreno: 'hierba', tierra: 0x86ad62, cerro: 0x4a6b3a, meseta: 0x5a7c46,
    cielo: 0x8cc0ea, niebla: 0xd5e3e6, sol: 0xfff3e0, ambiente: 0xbfc8ae,
    flora: []
  },
  costa: {
    hora: 'manana',
    restos: [['contenedor', 0xa8563f, 3], ['camioneta', 0x8a5f4a, 2]],
    asfalto: 0x8e8b83, raya: 0xf0e8d2, bordillo: 0xd2cbb8,
    terreno: 'hierba', tierra: 0xa2b47e, cerro: 0xc9bda4, meseta: 0xd6cdb6,
    cielo: 0x6fb2e8, niebla: 0xd2e2ea, sol: 0xfff6e4, ambiente: 0xc9c2ac,
    flora: [['cipres', 0x33532f, 14], ['pino', 0x4e6b3c, 10]]
  },
  volcanico: {
    hora: 'ocaso',
    restos: [['autobus', 0xc4923a, 2], ['contenedor', 0x9a6a3a, 3]],
    asfalto: 0x4a453f, raya: 0xd8cdae, bordillo: 0x6e675c,
    terreno: 'roca', tierra: 0x8a7e74, cerro: 0x574c45, meseta: 0x4a413a,
    cielo: 0x9ab4c4, niebla: 0xa8a49c, sol: 0xffe6c4, ambiente: 0x6b5f52,
    flora: [['cipres', 0x2c4a2b, 16], ['pino', 0x3f5c34, 8]],
    hito: ['volcan', 0x4a3f38, false]
  },
  egeo: {
    hora: 'alto',
    restos: [['contenedor', 0x3f6f92, 4], ['camioneta', 0x6a7f92, 2]],
    asfalto: 0x939086, raya: 0xf2ead0, bordillo: 0xd8d0b8,
    terreno: 'tierra', tierra: 0xd9c8a6, cerro: 0xc3bda6, meseta: 0xd0c9b0,
    cielo: 0x59a8e6, niebla: 0xdae8ee, sol: 0xfff4dc, ambiente: 0xcfc7ae,
    flora: [['olivo', 0x94a184, 18], ['cipres', 0x3a5836, 6]],
    hito: ['columnas', 0xddd6c2]
  },
  desierto: {
    hora: 'alto',
    restos: [['autobus', 0xd8b45c, 2], ['camioneta', 0xb49a5c, 3]],
    asfalto: 0x9c927e, raya: 0xefe2be, bordillo: 0xc9bb96,
    terreno: 'arena', tierra: 0xf2d48f, cerro: 0xdcb877, meseta: 0xe8c98d,
    cielo: 0x86c2e8, niebla: 0xf0dcb4, sol: 0xfff0c8, ambiente: 0xe0b878,
    flora: [['palmera', 0x4f7a3a, 12]],
    hito: ['piramides', 0xd9bd88]
  },
  sabana: {
    hora: 'tarde',
    restos: [['camioneta', 0xb4703a, 4], ['contenedor', 0x94603a, 2]],
    asfalto: 0x9b7742, raya: 0xc9a86a, bordillo: 0xa8894f,
    terreno: 'tierra', tierra: 0xc99a5c, cerro: 0xc0a054, meseta: 0xcdae5c,
    cielo: 0x8fc4dd, niebla: 0xe6d6a0, sol: 0xffe8b0, ambiente: 0xd2ab5c,
    flora: [['acacia', 0x6d7f42, 18], ['palmera', 0x5c7a3c, 6]]
  },
  monzon: {
    hora: 'dia',
    restos: [['autobus', 0x5a8f6a, 2], ['contenedor', 0x4a6f5a, 3]],
    asfalto: 0x6f7269, raya: 0xdcd8c4, bordillo: 0x8e9084,
    terreno: 'hierba', tierra: 0x8fa860, cerro: 0x7f8c58, meseta: 0x8b9760,
    cielo: 0xa8bcc8, niebla: 0xc4cdd0, sol: 0xf2eddc, ambiente: 0x8a9470,
    flora: [['palmera', 0x3f6b33, 16], ['ceiba', 0x40663a, 8]]
  },
  karstico: {
    hora: 'manana',
    restos: [['contenedor', 0x8a5a4a, 4], ['camioneta', 0x7a6a5a, 2]],
    asfalto: 0x787d76, raya: 0xe0dcc8, bordillo: 0x969a90,
    terreno: 'hierba', tierra: 0x88a06e, cerro: 0x6f7c66, meseta: 0x7b876f,
    cielo: 0xb6c4ca, niebla: 0xcdd6d6, sol: 0xf0ead8, ambiente: 0x7f8a74,
    flora: [['bambu', 0x5d8046, 20]],
    hito: ['karst', 0x76836c]
  },
  taiga: {
    hora: 'dia',
    restos: [['oruga', 0x5c6350, 2], ['contenedor', 0x4c5350, 3]],
    asfalto: 0x8d9298, raya: 0xdde4ea, bordillo: 0xb4bcc4,
    terreno: 'nieve', tierra: 0xeef3f6, cerro: 0xc2cdd4, meseta: 0xd2dade,
    cielo: 0x9db4c4, niebla: 0xd8e2e8, sol: 0xeaf0f8, ambiente: 0xb8c6d0,
    flora: [['abeto', 0x2b402f, 22]]
  },
  artico: {
    hora: 'ocaso',
    restos: [['oruga', 0x6a6f5e, 2], ['camioneta', 0x7a7f6e, 2]],
    asfalto: 0xa6aeb6, raya: 0xe8eef4, bordillo: 0xc8d0d8,
    terreno: 'nieve', tierra: 0xf4f8fb, cerro: 0xd4dee6, meseta: 0xe2e9ee,
    cielo: 0x8fa8bc, niebla: 0xe4ecf2, sol: 0xe6f0fa, ambiente: 0xc4d2de,
    flora: [['abeto', 0x24382b, 18]]
  },
  altiplano: {
    hora: 'alto',
    restos: [['autobus', 0xd4a03c, 2]],
    asfalto: 0x8a7f70, raya: 0xe6d8ac, bordillo: 0xb0a288,
    terreno: 'tierra', tierra: 0xcaa67b, cerro: 0xa8855e, meseta: 0xb89267,
    cielo: 0x74b0e0, niebla: 0xd8cdb2, sol: 0xfff0d0, ambiente: 0xc09468,
    flora: [['cactus', 0x5f7a48, 16], ['acacia', 0x7a8450, 6]],
    hito: ['volcan', 0x5a4a40, true]
  },
  // La ciudad: acera clara en vez de campo, árboles de alineación y coches
  // aparcados. Es lo que convierte la carretera en una avenida.
  ciudad: {
    hora: 'ocaso',
    restos: [['camioneta', 0x8a8f96, 3], ['contenedor', 0x6a7f86, 2]],
    asfalto: 0x5e5f62, raya: 0xf2f2ee, bordillo: 0xcfcac0,
    terreno: 'losas', tierra: 0xc9c4ba, cerro: 0x9a958c, meseta: 0xa6a198,
    cielo: 0x8fbfe6, niebla: 0xcfd8de, sol: 0xfff4e0, ambiente: 0xb8b0a0,
    flora: [['olivo', 0x55783f, 14]]
  },
  // El Caribe: arena blanca, palmeras y cerros verdes al fondo. Sin restos: lo
  // que hay abandonado en la playa lo pone el hito `playa`.
  caribe: {
    hora: 'manana',
    restos: [],
    asfalto: 0x8e8b83, raya: 0xf0e8d2, bordillo: 0xd2cbb8,
    terreno: 'arena', tierra: 0xf3e6c4, cerro: 0x3f7a45, meseta: 0x4f8a4f,
    cielo: 0x5fb8f0, niebla: 0xd6eef4, sol: 0xfff6e0, ambiente: 0xd8d0b0,
    flora: [['palmera', 0x3f8a3a, 18]]
  },
  selva: {
    hora: 'dia',
    restos: [['barcaza', 0x7a6a52, 2], ['contenedor', 0x6a7a62, 3]],
    asfalto: 0x6b6f5e, raya: 0xd4d6b8, bordillo: 0x878a74,
    terreno: 'hierba', tierra: 0x5f7a40, cerro: 0x4f6339, meseta: 0x5a6d40,
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
