// Tramos que se juegan DENTRO de algo.
//
// La queja de Isidro era que los mapas se sienten repetitivos: «en Vladivostok,
// en vez de jugar al lado del puente, sería mejor jugar en el propio puente».
// Tenía razón — el puente de Zolotói estaba ahí al lado, de adorno, mientras la
// partida pasaba en una carretera igual que las otras treinta y ocho.
//
// Un escenario no es un monumento más: sustituye TODO lo de alrededor. Se traga
// el arenal, la vegetación, las vallas y los cerros, y decide cuántos carriles
// quedan abiertos. En el puente se pelea en la calzada y las dos aceras quedan
// cerradas tras la barrera, así que el campo pasa de cinco carriles a tres.
//
// Todo va por código, como el resto del decorado del juego.

import * as THREE from 'three'
import { NIVEL_DETALLE, seg } from './systems/detalle.js'

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness })

const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  g.add(m)
  return m
}

// Hasta dónde llega el tablero y dónde empieza el vacío. La calzada mide 13,6
// (6,8 a cada lado); la acera va de la barrera al pretil.
const MEDIO_TABLERO = 7.6
const BARRERA_X = 4.05      // entre el carril 0 y el 1, y entre el 3 y el 4
const LARGO = 300           // hasta bien dentro de la niebla por los dos lados
const DESDE_Z = 30
const HASTA_Z = -270
const FONDO_MAR = -46

// --- el puente de Zolotói ----------------------------------------------------
function puente () {
  const g = new THREE.Group()
  const hormigon = mat(0xe4e2dc, 0.8)
  const hormigonSucio = mat(0xc6c3bb, 0.85)
  const hormigonHondo = mat(0x9a978f, 0.9)
  const acero = mat(0xb9bec4, 0.45, 0.55)
  const cable = mat(0xf2f2ef, 0.35, 0.5)
  const agua = new THREE.MeshStandardMaterial({ color: 0x33607a, roughness: 0.22, metalness: 0.35 })
  const hielo = mat(0xdfe9ee, 0.7)

  // --- el mar, muy abajo -----------------------------------------------------
  // Es lo que convierte la carretera en un puente: si por el borde no se ve el
  // vacío, esto es una calzada con vallas bonitas.
  const mar = pon(g, new THREE.PlaneGeometry(900, 900), agua, 0, FONDO_MAR, -120)
  mar.rotation.x = -Math.PI / 2
  // Placas de hielo sueltas, que esto es Vladivostok en invierno.
  for (let i = 0; i < 46; i++) {
    const r = 3 + Math.random() * 11
    const placa = pon(g, new THREE.CylinderGeometry(r, r * 0.92, 0.5, 6), hielo,
      (Math.random() - 0.5) * 320, FONDO_MAR + 0.3, -140 + (Math.random() - 0.5) * 300)
    placa.rotation.y = Math.random() * Math.PI
  }

  // --- el tablero ------------------------------------------------------------
  // Por debajo tiene canto: desde la cámara, picada como está, se le ve el
  // costado, y sin canto el puente era una lámina de papel.
  pon(g, new THREE.BoxGeometry(MEDIO_TABLERO * 2, 1.5, LARGO), hormigonSucio, 0, -0.78, (DESDE_Z + HASTA_Z) / 2)
  // Dos vigas cajón bajo el tablero, que es lo que aguanta de verdad.
  for (const lado of [-1, 1]) {
    pon(g, new THREE.BoxGeometry(1.8, 2.2, LARGO), hormigonHondo, lado * 4.6, -2.3, -120)
  }
  // Nervios transversales cada pocos metros: le dan escala al canto.
  for (let z = DESDE_Z; z > HASTA_Z; z -= 7) {
    pon(g, new THREE.BoxGeometry(MEDIO_TABLERO * 2 - 0.6, 1.1, 0.5), hormigonHondo, 0, -2, z)
  }

  // --- barreras de la calzada ------------------------------------------------
  // Las que cierran el campo a tres carriles. Perfil de barrera de hormigón:
  // ancha abajo y estrecha arriba, con su pasamanos de acero.
  for (const lado of [-1, 1]) {
    for (let z = DESDE_Z; z > HASTA_Z; z -= 4) {
      const zoca = pon(g, new THREE.BoxGeometry(0.62, 0.42, 3.8), hormigon, lado * BARRERA_X, 0.21, z)
      zoca.castShadow = true
      pon(g, new THREE.BoxGeometry(0.34, 0.38, 3.8), hormigon, lado * BARRERA_X, 0.6, z)
    }
    // El pasamanos, de una pieza: es fino y así no se ven las juntas.
    pon(g, new THREE.BoxGeometry(0.42, 0.1, LARGO), acero, lado * BARRERA_X, 0.84, -120)
  }

  // --- acera y pretil exterior ----------------------------------------------
  for (const lado of [-1, 1]) {
    // La acera, un escalón por encima de la calzada.
    pon(g, new THREE.BoxGeometry(MEDIO_TABLERO - 4.3, 0.16, LARGO), hormigonSucio,
      lado * (4.3 + (MEDIO_TABLERO - 4.3) / 2), 0.08, -120)
    // El pretil del borde: montantes y dos largueros. Por aquí se ve el vacío.
    for (let z = DESDE_Z; z > HASTA_Z; z -= 2.6) {
      pon(g, new THREE.BoxGeometry(0.1, 1.15, 0.1), acero, lado * (MEDIO_TABLERO - 0.25), 0.66, z)
    }
    for (const y of [0.72, 1.18]) {
      pon(g, new THREE.BoxGeometry(0.12, 0.09, LARGO), acero, lado * (MEDIO_TABLERO - 0.25), y, -120)
    }
    // Farolas del puente, altas y cada mucho.
    for (let z = DESDE_Z - 10; z > HASTA_Z; z -= 34) {
      pon(g, new THREE.CylinderGeometry(0.11, 0.15, 7, 7), acero, lado * (MEDIO_TABLERO - 0.7), 3.5, z)
      const brazo = pon(g, new THREE.BoxGeometry(1.5, 0.12, 0.12), acero, lado * (MEDIO_TABLERO - 1.4), 7, z)
      brazo.rotation.z = lado * 0.12
      pon(g, new THREE.BoxGeometry(0.7, 0.14, 0.32), mat(0xf6f1d8, 0.4), lado * (MEDIO_TABLERO - 2.1), 6.9, z)
    }
  }

  // --- los pilonos en V y sus tirantes ---------------------------------------
  // Los dos de verdad del Zolotói. En uve, que es su forma, y muy altos: son lo
  // único que dice «puente colgante» desde la cámara del juego.
  const pilonos = [-26, -128]
  for (const zp of pilonos) {
    for (const lado of [-1, 1]) {
      // La pata sale del borde del tablero y se inclina hacia dentro.
      //
      // Isidro: «en Vladivostok los aliens atraviesan los pilares del puente». Y
      // era verdad: la pata estaba en x = 5,2 con 2,2 de ancho, o sea que su
      // cara de dentro caía en 4,1, y un huésped grande andando por el carril de
      // fuera llega a 4,7 (medido en partida). Se lleva al BORDE del tablero,
      // que además es donde va en el Zolotói de verdad: la pata en 6,5 con 1,8
      // de ancho arranca en 5,6 y no la alcanza ni el más ancho.
      const alto = 40
      const pata = pon(g, new THREE.BoxGeometry(1.8, alto, 2.6), hormigon, lado * 6.5, alto / 2 - 2, zp)
      pata.rotation.z = -lado * 0.1
      pata.castShadow = true
    }
    // El travesaño donde se juntan, arriba.
    // Los travesaños, alargados con las patas: antes medían 11 y 13 para unas
    // patas en 5,2, y con ellas en 6,5 se quedaban cortos, colgando en el aire.
    pon(g, new THREE.BoxGeometry(13.6, 2, 2.8), hormigon, 0, 36, zp)
    pon(g, new THREE.BoxGeometry(15.4, 1.4, 2.2), hormigon, 0, 12, zp)

    // Los abanicos de tirantes: del alto del pilono al tablero, hacia los dos
    // lados. Cada uno es un cilindro estirado y girado a su sitio.
    // Abanico a los cuatro lados: hacia delante y hacia atrás de cada pilono, y
    // por los dos costados. Con un solo sentido el pilono parecía estar tirando
    // del puente hacia un lado.
    for (const lado of [-1, 1]) {
      for (const sentido of [-1, 1]) {
        for (let k = 1; k <= 8; k++) {
          const arriba = new THREE.Vector3(lado * 3.6, 34 - k * 2.4, zp)
          const abajo = new THREE.Vector3(lado * (MEDIO_TABLERO - 1.4), 1, zp + sentido * k * 8.5)
          const medio = arriba.clone().add(abajo).multiplyScalar(0.5)
          const t = pon(g, new THREE.CylinderGeometry(0.07, 0.07, arriba.distanceTo(abajo), 4),
            cable, medio.x, medio.y, medio.z)
          t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), abajo.clone().sub(arriba).normalize())
        }
      }
    }
  }

  // --- la orilla al fondo ----------------------------------------------------
  // Colinas nevadas con bloques, para que el puente vaya a alguna parte.
  const ladera = mat(0xd8dee2, 0.95)
  const bloque = mat(0x9aa3ab, 0.85)
  for (let i = 0; i < 9; i++) {
    const r = 30 + Math.random() * 60
    const c = pon(g, new THREE.SphereGeometry(r, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), ladera,
      (Math.random() - 0.5) * 460, FONDO_MAR, -300 - Math.random() * 130)
    c.scale.y = 0.34 + Math.random() * 0.3
  }
  for (let i = 0; i < 26; i++) {
    const h = 8 + Math.random() * 26
    pon(g, new THREE.BoxGeometry(5 + Math.random() * 7, h, 5 + Math.random() * 7), bloque,
      (Math.random() - 0.5) * 380, FONDO_MAR + h / 2 + 6, -300 - Math.random() * 110)
  }

  g.userData.carriles = 3
  // El puente se come el horizonte: ni cerros, ni vegetación, ni arenal.
  g.userData.tapaElMundo = true
  return g
}

// --- el estadio --------------------------------------------------------------
// Se juega sobre el césped, con las gradas cerrando los cuatro lados. Aquí no
// se estrecha nada: cinco carriles son los que tiene el juego, y es el campo
// más ancho que se puede dar.
function estadio () {
  const g = new THREE.Group()
  const cesped = mat(0x3a7135, 0.95)
  const cespedClaro = mat(0x447f3d, 0.95)
  const cespedRaya = new THREE.MeshBasicMaterial({ color: 0xf2f5ef, transparent: true, opacity: 0.55 })
  const hormigon = mat(0x9c988f, 0.9)
  const hormigonHondo = mat(0x7d7a74, 0.92)
  hormigon.emissive = new THREE.Color(0x2a2926); hormigon.emissiveIntensity = 1
  hormigonHondo.emissive = new THREE.Color(0x1c1b19); hormigonHondo.emissiveIntensity = 1
  // Por dentro el estadio es azul marino de arriba abajo, con las letras de la
  // grada del fondo en butacas blancas. El gris de antes era del Bernabéu viejo.
  const asiento = mat(0xeef2f6, 0.85)        // las butacas blancas de las letras
  const asientoAzul = mat(0x1d2f5e, 0.85)    // el azul marino de todas las demás
  const asientoHondo = mat(0x16244a, 0.85)   // una fila de cada tantas, más oscura
  // Dentro de un estadio cerrado no entra el sol, y el del juego va bajo: sin un
  // poco de luz propia las butacas y el hormigón salían negros. Es más barato
  // que encender focos de verdad, que costarían por píxel en toda la partida.
  asientoAzul.emissive = new THREE.Color(0x121d3a); asientoAzul.emissiveIntensity = 1
  asientoHondo.emissive = new THREE.Color(0x0d1630); asientoHondo.emissiveIntensity = 1
  asiento.emissive = new THREE.Color(0x3a4048); asiento.emissiveIntensity = 1
  const acero = mat(0xc3c7cb, 0.4, 0.5)

  // Medido sobre la cámara real: el borde de pantalla pasa por x ~13 a z = -40 y
  // x ~22 a z = -90. Con el césped a 26 las gradas se quedaban FUERA del
  // encuadre y no se veía que estuvieras dentro de un estadio.
  //
  // Isidro: «la raya que marca dónde iría la portería debería ser donde esté mi
  // base, recorta un poco». Así que la línea de gol va en `FIELD.baseZ` (z = 4),
  // con seis metros de césped por detrás, y el campo acaba en z = -62, justo
  // detrás de donde aparecen los huéspedes (`FIELD.spawnZ` = -44).
  //
  // Eso arregla de paso lo que peor estaba: antes el césped medía 24 x 134, seis
  // veces más largo que ancho, y desde el aire el estadio parecía una canoa.
  // Ahora son 24 x 72 y el conjunto queda con la proporción del de verdad.
  const MEDIO = 12          // media anchura del césped
  const FONDO = -62         // fondo del campo, por detrás de donde aparecen
  const FRENTE = 10         // seis metros por detrás de la línea de la base
  const LINEA_BASE = 4      // = FIELD.baseZ: la línea de gol que defiendes
  const LINEA_FONDO = FONDO + 6

  // --- el césped y sus rayas -------------------------------------------------
  pon(g, new THREE.PlaneGeometry(MEDIO * 2, FRENTE - FONDO), cesped, 0, -0.02, (FRENTE + FONDO) / 2)
    .rotation.x = -Math.PI / 2
  // Franjas de siega. Ademas de ser lo propio de un campo, disimulan la costura
  // entre este cesped y la franja central, que es la calzada del juego teñida.
  for (let z = FRENTE; z > FONDO; z -= 16) {
    pon(g, new THREE.PlaneGeometry(MEDIO * 2, 8), cespedClaro, 0, -0.012, z - 4)
      .rotation.x = -Math.PI / 2
  }
  const raya = (ancho, largo, x, z) => {
    const m = pon(g, new THREE.PlaneGeometry(ancho, largo), cespedRaya, x, 0.015, z)
    m.rotation.x = -Math.PI / 2
    return m
  }
  const MEDIO_CAMPO = (LINEA_BASE + LINEA_FONDO) / 2
  for (const lado of [-1, 1]) raya(0.3, LINEA_BASE - LINEA_FONDO, lado * (MEDIO - 2), MEDIO_CAMPO)
  raya(MEDIO * 2 - 4, 0.3, 0, MEDIO_CAMPO)                          // medio campo
  // Las dos líneas de gol. La de delante cae justo sobre la base.
  for (const z of [LINEA_BASE, LINEA_FONDO]) raya(MEDIO * 2 - 4, 0.3, 0, z)
  for (const z of [LINEA_BASE - 13, LINEA_FONDO + 13]) {            // áreas
    raya(20, 0.3, 0, z)
    for (const lado of [-1, 1]) raya(0.3, 13, lado * 10, z + (z > MEDIO_CAMPO ? 6.5 : -6.5))
  }
  const circulo = pon(g, new THREE.RingGeometry(7.2, 7.5, 40), cespedRaya, 0, 0.015, MEDIO_CAMPO)
  circulo.rotation.x = -Math.PI / 2

  // --- el graderío ------------------------------------------------------------
  //
  // Isidro: «me gustaba el estadio que había hace unos días, el Santiago
  // Bernabéu», y manda fotos del de verdad: la carcasa plateada de rayas
  // horizontales, el techo cerrado con su hueco rectangular encima del campo, y
  // por dentro cuatro anfiteatros de butacas azul marino con el anillo de
  // pantallas dando la vuelta.
  //
  // El problema es que el campo del juego mide 24 de ancho por 134 de largo —los
  // bichos tienen que venir de lejos— y el estadio de verdad es casi cuadrado.
  // Así que se construyen DOS cosas, que además es como es en la realidad:
  //
  //   1. el GRADERÍO, pegado al campo, estrecho, para que jugando se vea que
  //      estás dentro de un estadio (el borde de la pantalla del móvil pasa por
  //      x ~13 a z = -40: más abierto y no se vería);
  //   2. la CARCASA, por fuera y mucho más ancha, con la forma buena de las
  //      fotos, que es lo que se ve durante el vuelo de llegada.
  //
  // El techo va de la carcasa al borde del hueco, así que desde dentro tapa el
  // espacio que queda entre las dos y no se nota el truco.
  //
  // Todo esto se construye con ANILLOS, no con piezas sueltas. La primera
  // versión ponía un bloque por peldaño y por punto del contorno: 11.929 piezas,
  // y fundirlas al entrar en el nivel costaba OCHO SEGUNDOS Y MEDIO de pantalla
  // parada. Cada anillo es una sola geometría —la forma de pista, hueca por
  // dentro, estirada hacia abajo— y además no tiene juntas en las curvas, que
  // era el otro problema de las piezas sueltas.
  const RADIO = 13.2
  const Z_DELANTE = FRENTE + 2
  const Z_FONDO = FONDO - 2
  const MEDIO_Z = (Z_DELANTE + Z_FONDO) / 2
  const MEDIA_LARGO = (Z_DELANTE - Z_FONDO) / 2

  // La forma de pista de atletismo: dos rectas y dos medias vueltas exactas.
  // Con `absarc` son círculos de verdad; con curvas de Bézier las esquinas
  // salían achatadas y en el estadio nuevo las esquinas son lo que se reconoce.
  const formaPista = (mx, mz, r, centro, Clase) => {
    const f = new Clase()
    f.moveTo(mx, centro - (mz - r))
    f.lineTo(mx, centro + mz - r)
    f.absarc(mx - r, centro + mz - r, r, 0, Math.PI / 2, false)
    f.lineTo(-(mx - r), centro + mz)
    f.absarc(-(mx - r), centro + mz - r, r, Math.PI / 2, Math.PI, false)
    f.lineTo(-mx, centro - (mz - r))
    f.absarc(-(mx - r), centro - (mz - r), r, Math.PI, Math.PI * 1.5, false)
    f.lineTo(mx - r, centro - mz)
    f.absarc(mx - r, centro - (mz - r), r, Math.PI * 1.5, Math.PI * 2, false)
    return f
  }

  // Un anillo de esa forma, con pared de `grueso` metros y `alto` de altura,
  // colgando de `yArriba`. Ojo al girarlo: con `rotation.x = PI/2` la Y de la
  // forma pasa a ser la Z del mundo y el estirado va hacia ABAJO.
  const anillo = (material, mx, mz, r, centro, grueso, alto, yArriba, lados = 18) => {
    const forma = formaPista(mx, mz, r, centro, THREE.Shape)
    forma.holes.push(formaPista(mx - grueso, mz - grueso, Math.max(0.05, r - grueso), centro, THREE.Path))
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: false, curveSegments: lados }),
      material)
    m.rotation.x = Math.PI / 2
    m.position.y = yArriba
    g.add(m)
    return m
  }
  // Un anillo del graderío, a tantos metros hacia fuera del borde del césped.
  const anilloGrada = (material, fuera, grueso, alto, yArriba, lados = 18) =>
    anillo(material, RADIO + fuera, MEDIA_LARGO + RADIO + fuera, RADIO + fuera, MEDIO_Z, grueso, alto, yArriba, lados)

  // El foso: entre el borde del césped y el primer peldaño hay quince metros de
  // nada, porque el graderío acaba en media vuelta y el césped es recto. Sin
  // suelo ahí, desde dentro se veía el vacío por debajo de la grada.
  const foso = mat(0x33503a, 0.95)
  const sueloFoso = new THREE.Mesh(
    new THREE.ShapeGeometry(formaPista(RADIO + 3, MEDIA_LARGO + RADIO + 3, RADIO + 3, MEDIO_Z, THREE.Shape), 18),
    new THREE.MeshStandardMaterial({ color: 0x33503a, roughness: 0.95, side: THREE.DoubleSide }))
  sueloFoso.rotation.x = Math.PI / 2
  sueloFoso.position.y = -0.06
  g.add(sueloFoso)
  void foso

  // Cuatro anfiteatros, cada uno más empinado que el de abajo, con su paseo y su
  // pretil entre medias. Es lo que se ve en las fotos de dentro y lo que separa
  // un estadio de un montón de escalones.
  const TRAMOS = [
    { peldanos: 6, huella: 1.45, tabica: 0.8 },    // grada baja, tendida
    { peldanos: 6, huella: 1.2, tabica: 1.15 },    // segundo anfiteatro
    { peldanos: 5, huella: 1.05, tabica: 1.45 },   // tercero, ya empinado
    { peldanos: 5, huella: 0.95, tabica: 1.6 }     // cuarto, casi en vertical
  ]
  let fuera = 3
  let y = 1.1
  let yAnillo = 0                  // dónde acaba el segundo anfiteatro: ahí va la cinta
  let fueraAnillo = 0
  for (let t = 0; t < TRAMOS.length; t++) {
    const tramo = TRAMOS[t]
    for (let k = 0; k < tramo.peldanos; k++) {
      anilloGrada(k % 4 === 3 ? hormigonHondo : hormigon, fuera + 0.75, 1.5, tramo.tabica, y)
      // Butacas azul marino, con una fila de cada cinco más oscura: de lejos se
      // lee como un graderío lleno y no como una mancha plana.
      // Las butacas cubren casi toda la huella: desde el aire, un graderío es
      // AZUL, no una escalera de hormigón con una fila de butacas encima.
      anilloGrada(k % 5 === 2 ? asientoHondo : asientoAzul, fuera + 0.55, 1.3, 0.55, y + 0.55)
      fuera += tramo.huella
      y += tramo.tabica
    }
    if (t < TRAMOS.length - 1) {
      anilloGrada(hormigonHondo, fuera + 2, 2.4, 0.5, y)          // el paseo
      anilloGrada(hormigon, fuera - 0.1, 0.35, 1.5, y + 1.5)      // y su pretil
      fuera += 2.2
      y += 1.6
      if (t === 1) { yAnillo = y; fueraAnillo = fuera - 2.2 }
    }
  }
  const yGrada = y
  const fueraGrada = fuera
  // El muro que cierra el terreno de juego: entre el césped y el primer peldaño
  // hay foso, y sin muro el campo parecía acabarse en el aire.
  anilloGrada(hormigonHondo, 0.3, 0.6, 2.2, 2.2)

  // --- la cinta de pantallas --------------------------------------------------
  // El anillo de vídeo de 360 grados, encima del segundo anfiteatro: es lo
  // primero que se ve en las fotos de dentro.
  const pantalla = new THREE.MeshBasicMaterial({ color: 0x1b3fa8 })
  const marcoPantalla = mat(0x13161c, 0.7)
  anilloGrada(marcoPantalla, fueraAnillo + 0.1, 0.5, 2.4, yAnillo + 2.6)
  anilloGrada(pantalla, fueraAnillo - 0.25, 0.3, 1.7, yAnillo + 2.3)

  // --- las letras del fondo ---------------------------------------------------
  //
  // En la grada del fondo hay letras gigantes hechas con butacas blancas. Va el
  // nombre del juego y no el del club de verdad: el estadio se reconoce igual, y
  // meter la marca de un equipo en un juego publicado es un lío que no hace
  // falta.
  const LETRAS = {
    A: ['01110', '10001', '10001', '11111', '10001'],
    L: ['10000', '10000', '10000', '10000', '11111'],
    I: ['11111', '00100', '00100', '00100', '11111'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001'],
    Z: ['11111', '00010', '00100', '01000', '11111']
  }
  const PALABRA = 'ALIENZ'
  const geoLetra = new THREE.BoxGeometry(0.82, 0.55, 0.9)
  const anchoLetras = PALABRA.length * 6 - 1
  for (let l = 0; l < PALABRA.length; l++) {
    const dibujo = LETRAS[PALABRA[l]]
    for (let f = 0; f < 5; f++) {
      for (let c = 0; c < 5; c++) {
        if (dibujo[f][c] !== '1') continue
        const x = (l * 6 + c - (anchoLetras - 1) / 2) * 0.95
        // Apoyadas en la pendiente del tercer anfiteatro del fondo: la fila de
        // arriba, más alta y más atrás, como se sientan las butacas de verdad.
        pon(g, geoLetra, asiento, x, 22.4 - f * 1.45, Z_FONDO - (RADIO + 24.4 + f * 1.05))
      }
    }
  }

  // --- porterías --------------------------------------------------------------
  // Isidro: que su base quede dentro de la portería. Lo que defiende ES la
  // portería, y así se entiende de un vistazo que los bichos vienen a marcar.
  const palo = mat(0xf2f4f6, 0.6)
  for (const [z, giro] of [[LINEA_FONDO, 0], [LINEA_BASE, Math.PI]]) {
    const portería = new THREE.Group()
    portería.position.set(0, 0, z)
    portería.rotation.y = giro
    for (const lado of [-1, 1]) pon(portería, new THREE.BoxGeometry(0.22, 2.6, 0.22), palo, lado * 3.7, 1.3, 0)
    pon(portería, new THREE.BoxGeometry(7.6, 0.22, 0.22), palo, 0, 2.6, 0)
    // La red: dos paños finos, lo justo para que se lea como una portería.
    const red = new THREE.MeshBasicMaterial({ color: 0xe8ecf0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    const fondoRed = pon(portería, new THREE.PlaneGeometry(7.6, 2.6), red, 0, 1.3, -1.6)
    fondoRed.rotation.x = 0.2
    for (const lado of [-1, 1]) {
      const costado = pon(portería, new THREE.PlaneGeometry(1.7, 2.6), red, lado * 3.7, 1.3, -0.85)
      costado.rotation.y = Math.PI / 2
    }
    g.add(portería)
  }

  // --- la carcasa de fuera ----------------------------------------------------
  //
  // La piel plateada de rayas horizontales: un rectángulo muy redondeado —en las
  // fotos las esquinas son casi un cuarto de círculo— que da la vuelta entera,
  // con barriga: se abre hacia la mitad de la altura y se recoge arriba y abajo.
  // Cada raya es un anillo de verdad y no un dibujo, porque desde el aire el
  // relieve es justo lo que la hace reconocible.
  // Con el campo recortado, el cuenco mide 97 de ancho por 173 de largo, así que
  // la carcasa cabe en 144 x 192: proporción 1,33, que es la del Bernabéu de
  // verdad (230 x 180). Ya no hace falta disimular nada.
  const CARCASA = { x: 72, z: 96, r: 56, alto: 36 }
  const LADOS = NIVEL_DETALLE === 'alta' ? 22 : NIVEL_DETALLE === 'media' ? 14 : 9
  const GRUESO = NIVEL_DETALLE === 'alta' ? 1.45 : NIVEL_DETALLE === 'media' ? 1.9 : 2.6
  const chapa = mat(0xc9ced6, 0.42, 0.55)
  const chapaHonda = mat(0x8b939d, 0.5, 0.45)
  const zocalo = mat(0x2b2f36, 0.8)
  const carcasaAnillo = (material, sale, grueso, alto, yArriba) =>
    anillo(material, CARCASA.x + sale, CARCASA.z + sale, CARCASA.r + sale, MEDIO_Z, grueso, alto, yArriba, LADOS)

  // La barriga: nada abajo, tres metros y pico en la mitad, nada arriba.
  const barriga = alto => Math.sin(Math.PI * Math.min(1, Math.max(0, alto / CARCASA.alto))) * 3.4
  carcasaAnillo(zocalo, 0.6, 2.4, 3.6, 3.6)
  for (let alto = 3.9; alto < CARCASA.alto; alto += GRUESO) {
    carcasaAnillo(Math.round(alto / GRUESO) % 7 === 0 ? chapaHonda : chapa,
      barriga(alto), 1.3, GRUESO * 0.74, alto)
  }

  // --- el techo ---------------------------------------------------------------
  //
  // La corona cerrada con el hueco rectangular encima del campo, que es por donde
  // entra la cámara al empezar el nivel (ver `ESTADIO_PLANOS` en main.js). Va de
  // una pieza, con el hueco recortado de verdad, y cierra por arriba todo el
  // espacio que queda entre el graderío y la carcasa: desde dentro no se ve que
  // son dos cosas distintas.
  const HUECO = { x: 24, z: 36, centro: MEDIO_CAMPO, r: 14 }
  const formaTecho = formaPista(CARCASA.x, CARCASA.z, CARCASA.r, MEDIO_Z, THREE.Shape)
  formaTecho.holes.push(formaPista(HUECO.x, HUECO.z, HUECO.r, HUECO.centro, THREE.Path))
  const techo = new THREE.Mesh(
    new THREE.ExtrudeGeometry(formaTecho, { depth: 1.3, bevelEnabled: false, curveSegments: LADOS }),
    chapaHonda)
  techo.rotation.x = Math.PI / 2
  techo.position.y = CARCASA.alto + 1.3
  g.add(techo)
  // Los aros del techo: en las fotos la cubierta no es una chapa lisa, son
  // anillos concéntricos que se van cerrando hacia el hueco. Son seis piezas y
  // es lo que hace que desde el aire se lea como un techo y no como una tapa.
  const aroTecho = mat(0x77808d, 0.45, 0.5)
  for (let i = 0; i < 6; i++) {
    const f = (i + 1) / 7
    const mx = CARCASA.x + (HUECO.x - CARCASA.x) * f
    const mz = CARCASA.z + (HUECO.z - CARCASA.z) * f
    const centro = MEDIO_Z + (HUECO.centro - MEDIO_Z) * f
    const r = CARCASA.r + (HUECO.r - CARCASA.r) * f
    anillo(aroTecho, mx, mz, r, centro, 0.9, 0.35, CARCASA.alto + 1.6, LADOS)
  }

  // Las cerchas blancas por debajo, cruzando el hueco de lado a lado, y las
  // barras de focos pegadas a los dos bordes largos: es lo que se ve al mirar
  // arriba desde el campo.
  const cercha = mat(0xe8ebef, 0.45, 0.3)
  const foco = new THREE.MeshBasicMaterial({ color: 0xfdfbef })
  const geoCercha = new THREE.BoxGeometry(HUECO.x * 2 + 6, 0.55, 0.55)
  const geoTirante = new THREE.BoxGeometry(HUECO.x * 2 + 6, 0.3, 0.3)
  const geoFoco = new THREE.BoxGeometry(2.6, 0.45, 0.7)
  for (let z = HUECO.centro - HUECO.z + 4; z < HUECO.centro + HUECO.z; z += 8.5) {
    pon(g, geoCercha, cercha, 0, CARCASA.alto - 0.6, z)
    pon(g, geoTirante, cercha, 0, CARCASA.alto - 2.6, z)
  }
  for (let z = HUECO.centro - HUECO.z + 5; z < HUECO.centro + HUECO.z; z += 5) {
    for (const lado of [-1, 1]) pon(g, geoFoco, foco, lado * (HUECO.x - 1.4), CARCASA.alto - 1.4, z)
  }
  void yGrada; void fueraGrada

  g.userData.carriles = 5
  g.userData.tapaElMundo = true
  // La base alien se planta en el campo, no a 108 de distancia: con el césped
  // recortado, allí se quedaría por detrás del graderío y el asalto final se
  // vería contra una pared de butacas.
  g.userData.baseZ = LINEA_FONDO - 4
  g.userData.sinSombra = true
  // La ciudad va aparte y NO cuelga del estadio: se funde por su cuenta y se
  // enciende solo durante el vuelo de llegada (ver `verCiudad` en world.js).
  // Jugando estás dentro, con el techo encima, y no se ve ni una ventana: tenerla
  // encendida toda la partida sería gastar batería para nada.
  g.userData.extra = ciudadDeMadrid(CARCASA, MEDIO_Z)
  return g
}

// --- la ciudad de alrededor ---------------------------------------------------
//
// Isidro: «quiero que se vea la ciudad con edificios», y manda fotos aéreas del
// Bernabéu con sus manzanas pegadas, la Castellana pasando por delante con sus
// hileras de árboles, y un par de torres de oficinas.
//
// No es la ciudad entera hasta el horizonte: son las manzanas de al lado, que es
// lo que se ve durante el vuelo. Cuánto se construye depende del detalle elegido
// (`detalle.js`), porque esto se monta ANTES de poder medir nada y en un móvil
// justo cada edificio son piezas que hay que fundir al entrar en el nivel.
function ciudadDeMadrid (carcasa, medioZ) {
  const g = new THREE.Group()
  // Números repetibles: la misma ciudad cada vez que se entra en Madrid, no una
  // distinta en cada partida.
  let semilla = 20260925
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
  const entre = (a, b) => a + azar() * (b - a)

  const CUANTOS = NIVEL_DETALLE === 'alta' ? { casas: 64, arboles: 90, coches: 36 }
    : NIVEL_DETALLE === 'media' ? { casas: 40, arboles: 50, coches: 18 }
      : { casas: 24, arboles: 22, coches: 8 }

  const suelo = mat(0x6d6a64, 0.96)
  const explanada = mat(0x8e8b84, 0.94)
  const asfalto = mat(0x3c3f45, 0.92)
  const raya = new THREE.MeshBasicMaterial({ color: 0xd8d5c6 })
  const tronco = mat(0x5a4632, 0.95)
  const copa = mat(0x3f6b34, 0.95)
  const copaClara = mat(0x4d7d3c, 0.95)
  const chapaCoche = [mat(0x9ea4ab, 0.5, 0.3), mat(0x7b2f2a, 0.5, 0.2), mat(0x2b3c5c, 0.5, 0.2), mat(0xd6d2c8, 0.5, 0.2)]
  const cristalCoche = mat(0x20252c, 0.35, 0.3)
  // Ladrillo, crema, gris y blanco: Madrid de verdad, que es lo que hay en las fotos.
  const FACHADAS = [mat(0x9a6b52, 0.92), mat(0xd8cdb8, 0.9), mat(0x8d5f49, 0.92), mat(0xb4816a, 0.92), mat(0xa9a9a4, 0.9), mat(0xcfcfc8, 0.9), mat(0x7d5240, 0.92)]
  const ventanas = mat(0x3a3f46, 0.7)
  const azotea = mat(0x6f6c66, 0.95)

  // El suelo, que si no el estadio flota sobre el vacío en el plano de llegada.
  const plano = pon(g, new THREE.PlaneGeometry(760, 820), suelo, 0, -0.5, medioZ)
  plano.rotation.x = -Math.PI / 2
  const patio = pon(g, new THREE.PlaneGeometry(carcasa.x * 2 + 44, carcasa.z * 2 + 44), explanada, 0, -0.42, medioZ)
  patio.rotation.x = -Math.PI / 2

  // --- la avenida -------------------------------------------------------------
  // Pasa por el lado de levante, pegada al estadio, como la Castellana.
  const AV = { x: 121, ancho: 26, desde: medioZ - 260, hasta: medioZ + 230 }
  const largoAv = AV.hasta - AV.desde
  const calzada = pon(g, new THREE.PlaneGeometry(AV.ancho, largoAv), asfalto, AV.x, -0.38, (AV.desde + AV.hasta) / 2)
  calzada.rotation.x = -Math.PI / 2
  for (let z = AV.desde + 4; z < AV.hasta; z += 9) {
    const linea = pon(g, new THREE.PlaneGeometry(0.4, 4.4), raya, AV.x, -0.34, z)
    linea.rotation.x = -Math.PI / 2
  }
  // La cuadrícula de calles: sin ellas los bloques parecían puestos encima de una
  // losa gris. Son planos finos y valen para que se lea como una ciudad.
  for (let x = -250; x <= 250; x += 44) {
    if (Math.abs(x) < carcasa.x + 18 || Math.abs(x - AV.x) < 20) continue
    const calle = pon(g, new THREE.PlaneGeometry(11, 620), asfalto, x, -0.4, medioZ - 20)
    calle.rotation.x = -Math.PI / 2
  }
  for (let zz = medioZ - 300; zz <= medioZ + 260; zz += 44) {
    if (Math.abs(zz - medioZ) < carcasa.z + 18) continue
    const calle = pon(g, new THREE.PlaneGeometry(560, 11), asfalto, 0, -0.4, zz)
    calle.rotation.x = -Math.PI / 2
  }

  // Y una calle cruzada por detrás del fondo.
  const cruce = pon(g, new THREE.PlaneGeometry(430, 20), asfalto, 0, -0.38, medioZ - 172)
  cruce.rotation.x = -Math.PI / 2

  // --- los bloques de pisos ---------------------------------------------------
  const geoBanda = new THREE.BoxGeometry(1, 0.55, 1)
  const sitios = []
  for (let x = -250; x <= 250; x += 44) {
    for (let z = medioZ - 300; z <= medioZ + 260; z += 44) {
      // Ni encima del estadio, ni encima de la avenida, ni en la calle cruzada.
      if (Math.abs(x) < carcasa.x + 30 && Math.abs(z - medioZ) < carcasa.z + 30) continue
      if (Math.abs(x - AV.x) < 24) continue
      if (Math.abs(z - (medioZ - 172)) < 20) continue
      // Lo lejos que queda del estadio, para quedarse con las manzanas de al lado.
      const fuera = Math.max(Math.abs(x) - carcasa.x, Math.abs(z - medioZ) - carcasa.z)
      if (fuera > 170) continue
      sitios.push({ x, z, fuera })
    }
  }
  sitios.sort((a, b) => a.fuera - b.fuera)
  for (const sitio of sitios.slice(0, CUANTOS.casas)) {
    const ancho = entre(16, 26)
    const fondo = entre(14, 24)
    // Dos torres de oficinas altas, como las que asoman en las fotos.
    const torre = azar() < 0.06
    const alto = torre ? entre(52, 68) : entre(16, 30)
    const x = sitio.x + entre(-6, 6)
    const z = sitio.z + entre(-6, 6)
    const fachada = torre ? mat(0x8f99a6, 0.55, 0.3) : FACHADAS[Math.floor(azar() * FACHADAS.length)]
    pon(g, new THREE.BoxGeometry(ancho, alto, fondo), fachada, x, alto / 2, z)
    pon(g, new THREE.BoxGeometry(ancho + 0.8, 0.6, fondo + 0.8), azotea, x, alto + 0.3, z)
    // Las filas de ventanas: una banda que da la vuelta al bloque por cada dos
    // plantas. De lejos es lo que hace que se lea como un edificio y no una caja.
    const plantas = Math.max(2, Math.floor(alto / (torre ? 4.2 : 3.2)))
    for (let k = 1; k <= plantas; k += 2) {
      const banda = pon(g, geoBanda, ventanas, x, k * (alto / (plantas + 1)), z)
      banda.scale.set(ancho + 0.3, 1, fondo + 0.3)
    }
    // Los trastos de la azotea.
    if (!torre && azar() < 0.6) {
      pon(g, new THREE.BoxGeometry(entre(3, 6), 2.4, entre(3, 6)), azotea, x + entre(-5, 5), alto + 1.8, z + entre(-5, 5))
    }
  }

  // --- árboles ----------------------------------------------------------------
  // Son lo que más vida da en una foto aérea: hileras a los dos lados de la
  // avenida y alguno suelto por las calles.
  const geoTronco = new THREE.CylinderGeometry(0.28, 0.4, 3.4, seg(6))
  const geoCopa = new THREE.SphereGeometry(2.4, seg(8), seg(6))
  const arbol = (x, z, escala) => {
    pon(g, geoTronco, tronco, x, 1.7, z)
    const c = pon(g, geoCopa, azar() < 0.5 ? copa : copaClara, x, 4.6, z)
    c.scale.setScalar(escala)
  }
  const porFila = Math.max(4, Math.round(CUANTOS.arboles / 3))
  for (let i = 0; i < porFila; i++) {
    const z = AV.desde + largoAv * (i + 0.5) / porFila
    for (const lado of [-1, 1]) arbol(AV.x + lado * (AV.ancho / 2 + 4), z + entre(-2, 2), entre(0.8, 1.25))
  }
  for (let i = 0; i < CUANTOS.arboles - porFila * 2; i++) {
    // Sueltos, en el descampado que rodea al estadio.
    const a = azar() * Math.PI * 2
    const d = entre(carcasa.x + 26, carcasa.x + 110)
    arbol(Math.cos(a) * d, medioZ + Math.sin(a) * (d + 40), entre(0.7, 1.15))
  }

  // --- coches parados ---------------------------------------------------------
  // Parados, no circulando: esto es una ciudad invadida, y además moverlos
  // costaría cuentas en cada fotograma de un plano que dura cinco segundos.
  const geoCoche = new THREE.BoxGeometry(1.9, 1.1, 4.4)
  const geoCabina = new THREE.BoxGeometry(1.7, 0.75, 2.1)
  for (let i = 0; i < CUANTOS.coches; i++) {
    const lado = azar() < 0.5 ? -1 : 1
    const x = AV.x + lado * entre(4, AV.ancho / 2 - 1.5)
    const z = entre(AV.desde + 6, AV.hasta - 6)
    pon(g, geoCoche, chapaCoche[Math.floor(azar() * chapaCoche.length)], x, 0.7, z)
    pon(g, geoCabina, cristalCoche, x, 1.5, z + entre(-0.4, 0.4))
  }

  return g
}

// --- el circuito -------------------------------------------------------------
// Se corre por la pista de verdad, con pianos, escapatoria de grava, muros de
// neumáticos y la valla de seguridad. El muro de boxes se mete por un lado, así
// que aquí el campo baja a cuatro carriles y además de forma ASIMÉTRICA: el que
// se cierra es solo el de un lado.
function circuito () {
  const g = new THREE.Group()
  const piano = mat(0xd63a2f, 0.75)
  const pianoBlanco = mat(0xf0efe9, 0.75)
  const cesped = mat(0x4c7a3f, 0.95)
  const grava = mat(0xb9b2a2, 1)
  const goma = mat(0x22242a, 0.95)
  const gomaColor = [mat(0xd63a2f, 0.9), mat(0xf0efe9, 0.9), mat(0x2b62b0, 0.9)]
  const acero = mat(0xc3c7cb, 0.4, 0.55)
  const hormigon = mat(0xb9b5ad, 0.9)

  const BORDE = 6.9
  const DESDE = 30
  const HASTA = -260

  for (const lado of [-1, 1]) {
    // Piano: bloques rojos y blancos alternos pegados al asfalto.
    for (let z = DESDE, i = 0; z > HASTA; z -= 2.4, i++) {
      pon(g, new THREE.BoxGeometry(1.5, 0.12, 2.4), i % 2 ? piano : pianoBlanco, lado * (BORDE + 0.75), 0.06, z)
    }
    // Césped artificial y después la grava de la escapatoria.
    pon(g, new THREE.PlaneGeometry(4, DESDE - HASTA), cesped, lado * (BORDE + 3.6), 0.005, (DESDE + HASTA) / 2)
      .rotation.x = -Math.PI / 2
    pon(g, new THREE.PlaneGeometry(16, DESDE - HASTA), grava, lado * (BORDE + 13.6), 0, (DESDE + HASTA) / 2)
      .rotation.x = -Math.PI / 2
    // Muro de neumáticos: tres alturas, con la fila de arriba de colores.
    for (let z = DESDE; z > HASTA; z -= 1.5) {
      for (let k = 0; k < 3; k++) {
        const m = k === 2 ? gomaColor[(z | 0) % 3] : goma
        const r = pon(g, new THREE.CylinderGeometry(0.55, 0.55, 0.42, 9), m, lado * (BORDE + 22), 0.22 + k * 0.42, z)
        r.rotation.x = Math.PI / 2
      }
    }
    // Y detrás, la valla de seguridad: postes altos con su malla.
    for (let z = DESDE; z > HASTA; z -= 6) {
      pon(g, new THREE.BoxGeometry(0.16, 5.5, 0.16), acero, lado * (BORDE + 23.4), 2.75, z)
    }
    for (const y of [1.4, 3, 4.6]) {
      pon(g, new THREE.BoxGeometry(0.1, 0.12, DESDE - HASTA), acero, lado * (BORDE + 23.4), y, (DESDE + HASTA) / 2)
    }
  }

  // --- el muro de boxes, que es lo que estrecha la pista ---------------------
  // Va por el carril 4, el de la derecha: pared de hormigón con publicidad y el
  // muro de tiempos por encima.
  const X_MURO = 4.9
  for (let z = DESDE; z > HASTA; z -= 4) {
    pon(g, new THREE.BoxGeometry(0.5, 1.05, 3.9), hormigon, X_MURO, 0.52, z)
    pon(g, new THREE.BoxGeometry(0.56, 0.5, 3.9), (z | 0) % 8 === 0 ? piano : mat(0xe8e6e0, 0.7), X_MURO, 1.3, z)
  }
  // Los garajes al otro lado del muro.
  for (let z = DESDE - 6; z > -150; z -= 12) {
    pon(g, new THREE.BoxGeometry(11, 6.5, 11), hormigon, X_MURO + 9, 3.25, z)
    pon(g, new THREE.BoxGeometry(11.3, 0.6, 1.2), mat(0x2b3138, 0.8), X_MURO + 9, 5.6, z - 5.6)
  }

  // --- el pórtico de meta ----------------------------------------------------
  for (const z of [-8, -120]) {
    for (const lado of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(1.1, 11, 1.1), acero, lado * (BORDE + 2.6), 5.5, z)
    }
    pon(g, new THREE.BoxGeometry((BORDE + 3.2) * 2, 1.9, 1.6), mat(0x22262c, 0.7), 0, 11.4, z)
    pon(g, new THREE.BoxGeometry((BORDE + 2) * 2, 1.1, 0.5), mat(0xe8e6e0, 0.6), 0, 11.4, z - 0.9)
    // Los semáforos de salida.
    for (let k = -2; k <= 2; k++) {
      pon(g, new THREE.SphereGeometry(0.34, 8, 6), k < 0 ? mat(0x3a1010, 0.5) : mat(0x120c0c, 0.5), k * 2.2, 10.2, z - 0.9)
    }
  }

  // --- tribuna al otro lado --------------------------------------------------
  for (let k = 0; k < 11; k++) {
    pon(g, new THREE.BoxGeometry(150, 0.9, 1.5), k % 4 === 3 ? mat(0x7d7a74, 0.92) : hormigon,
      0, 1 + k * 0.9, -(BORDE + 30 + k * 1.5))
  }
  for (let i = 0; i < 90; i++) {
    pon(g, new THREE.BoxGeometry(1, 0.5, 0.55), i % 6 === 1 ? mat(0xd63a2f, 0.85) : mat(0xdcdcd8, 0.85),
      -72 + (i % 45) * 3.2, 1.6 + Math.floor(i / 45) * 2.7, -(BORDE + 31.5 + Math.floor(i / 45) * 4.5))
  }

  g.userData.carriles = 4
  g.userData.tapaElMundo = true
  return g
}

export const ESCENARIOS = { puente, estadio, circuito }
