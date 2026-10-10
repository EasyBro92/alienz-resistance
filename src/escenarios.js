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
import { LUGARES } from './ciudades.js'

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
      const alta = pon(g, new THREE.BoxGeometry(0.34, 0.38, 3.8), hormigon, lado * BARRERA_X, 0.6, z)
      // `muro`: esto CIERRA el carril, o sea que estar en el borde del pasillo
      // es su trabajo. `herramientas/pasillo-libre.mjs` lo salta.
      zoca.userData.muro = true
      alta.userData.muro = true
    }
    // El pasamanos, de una pieza: es fino y así no se ven las juntas.
    const pasamanos = pon(g, new THREE.BoxGeometry(0.42, 0.1, LARGO), acero, lado * BARRERA_X, 0.84, -120)
    pasamanos.userData.muro = true
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
      // Y OJO CON LA INCLINACIÓN, que la primera vez se me pasó: mover el centro
      // de la pata a 6,5 no bastaba, porque la pata va inclinada y el PIE se iba
      // dos metros hacia dentro. Con la inclinación de antes el pie arrancaba en
      // x = 3,6 y los bichos del carril de fuera (4,7 medido) seguían
      // atravesándolo por abajo. Ahora se inclina al revés —abierta abajo y
      // recogida arriba, que es como se ve la uve del Zolotói desde el coche— y
      // la cuenta sale: pie en 7,0 menos 0,9 de medio ancho = 6,1, contra 4,7.
      // Comprobado con `herramientas/pasillo-libre.mjs`.
      const alto = 40
      const pata = pon(g, new THREE.BoxGeometry(1.8, alto, 2.6), hormigon, lado * 6, alto / 2 - 2, zp)
      pata.rotation.z = lado * 0.05
      pata.castShadow = true
    }
    // Los travesaños donde se juntan. Su ancho sale de dónde están las patas a
    // esa altura: a 36 las patas se han recogido a 5,1 y a 12 están en 6,3.
    pon(g, new THREE.BoxGeometry(11.2, 2, 2.8), hormigon, 0, 36, zp)
    pon(g, new THREE.BoxGeometry(13.4, 1.4, 2.2), hormigon, 0, 12, zp)

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
//
// El Santiago Bernabéu nuevo y su barrio, hechos en Blender
// (herramientas/blender/lugar_madrid.py, 02/10/2026). Isidro: «rehazlo para que
// se vea ultra realista… tal como está me gusta, pero es muy, muy básico».
// Antes eran anillos de colores lisos montados aquí; ahora son dos modelos con
// texturas y con la LUZ DEL ATARDECER HORNEADA (mapas de luz y color de
// vértices): `lugar-madrid.glb` es el estadio, donde se juega, y
// `lugar-madrid-ciudad.glb` el barrio, que solo se enseña en el vuelo de llegada.
//
// Los números que comparten el guion y el juego: el césped va de x = ±12 y de
// z = 10 a -62, la línea de gol que defiendes cae en `FIELD.baseZ`, el hueco
// del techo va de x = ±24 y de z = 10 a -62, y la cubierta llega a y = 40,6
// (las vigas de la retráctil). Con ellos está trazado el vuelo (main.js).
function estadio () {
  const g = new THREE.Group()
  g.name = 'estadio'
  Object.assign(g.userData, {
    modelo: 'lugar-madrid',
    modeloCiudad: 'lugar-madrid-ciudad',
    // El prefijo de los mapas de luz: lugar-madrid-luzE.webp, -luzC y -luzG.
    luz: 'lugar-madrid',
    carriles: 5,
    // Bajo techo: el avión de los apoyos no se ve (las bombas caen igual).
    sinAvion: true,
    tapaElMundo: true,
    sinSombra: true,
    // El césped es el del modelo, con sus franjas de siega y sus rayas.
    sinCalzada: true
  })
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
    const bajo = pon(g, new THREE.BoxGeometry(0.5, 1.05, 3.9), hormigon, X_MURO, 0.52, z)
    const alto = pon(g, new THREE.BoxGeometry(0.56, 0.5, 3.9), (z | 0) % 8 === 0 ? piano : mat(0xe8e6e0, 0.7), X_MURO, 1.3, z)
    // El muro de boxes es lo que cierra el carril de la derecha (ver `muro` en
    // el puente).
    bajo.userData.muro = true
    alto.userData.muro = true
  }
  // Los garajes al otro lado del muro.
  for (let z = DESDE - 6; z > -150; z -= 12) {
    pon(g, new THREE.BoxGeometry(11, 6.5, 11), hormigon, X_MURO + 9, 3.25, z)
    pon(g, new THREE.BoxGeometry(11.3, 0.6, 1.2), mat(0x2b3138, 0.8), X_MURO + 9, 5.6, z - 5.6)
  }

  // --- el pórtico de meta ----------------------------------------------------
  // OJO CON LA ALTURA: el travesaño cruza la pista de lado a lado y la línea de
  // visión desde la cámara hasta la antena de la base alien pasa por y = 11,1 a
  // esta z. Con el travesaño en 11,4 cortaba justo la antena y de la base solo se
  // veía la falda (medido: 7 % de antena a la vista). A 14 pasa por debajo.
  for (const z of [-8, -120]) {
    for (const lado of [-1, 1]) {
      pon(g, new THREE.BoxGeometry(1.1, 14, 1.1), acero, lado * (BORDE + 2.6), 7, z)
    }
    pon(g, new THREE.BoxGeometry((BORDE + 3.2) * 2, 1.9, 1.6), mat(0x22262c, 0.7), 0, 14, z)
    pon(g, new THREE.BoxGeometry((BORDE + 2) * 2, 1.1, 0.5), mat(0xe8e6e0, 0.6), 0, 14, z - 0.9)
    // Los semáforos de salida.
    for (let k = -2; k <= 2; k++) {
      pon(g, new THREE.SphereGeometry(0.34, 8, 6), k < 0 ? mat(0x3a1010, 0.5) : mat(0x120c0c, 0.5), k * 2.2, 12.8, z - 0.9)
    }
  }

  // --- tribuna al otro lado --------------------------------------------------
  // OJO CON LA Z: la tribuna mide 150 de ancho y cruza la pista de lado a lado,
  // así que tiene que quedar DETRÁS de donde aparecen los bichos (z = -44) o la
  // atraviesan entera cada oleada. Estaba en -36,9 y lo hacían.
  for (let k = 0; k < 11; k++) {
    pon(g, new THREE.BoxGeometry(150, 0.9, 1.5), k % 4 === 3 ? mat(0x7d7a74, 0.92) : hormigon,
      0, 1 + k * 0.9, -(BORDE + 56 + k * 1.5))
  }
  for (let i = 0; i < 90; i++) {
    pon(g, new THREE.BoxGeometry(1, 0.5, 0.55), i % 6 === 1 ? mat(0xd63a2f, 0.85) : mat(0xdcdcd8, 0.85),
      -72 + (i % 45) * 3.2, 1.6 + Math.floor(i / 45) * 2.7, -(BORDE + 57.5 + Math.floor(i / 45) * 4.5))
  }

  g.userData.carriles = 4
  g.userData.tapaElMundo = true
  // Interlagos tampoco tenía plano de llegada: no lleva monumento y sin `foco`
  // el vuelo ni empieza. Con esto entra por la misma puerta que los lugares y
  // se recorre la recta de meta desde arriba antes de la primera oleada.
  g.userData.conHitos = true
  g.userData.altoVuelo = 34
  return g
}

// Los treinta y ocho lugares de `ciudades.js` entran por aqui: para
// `world.ponerEscenario` son escenarios como el puente o el estadio, y no hay
// que tocar nada mas. Cada uno se construye la primera vez que se entra en su
// mision y se queda en cache.
// --- Milán, hecho en Blender --------------------------------------------------
//
// Isidro, 27/09/2026: «no me están gustando nada las distribuciones, los mapas
// ahora no son nada reconocibles. Recrea el mapa de Milán con el Duomo al lado
// derecho y que los enemigos vengan debajo del arco, que no vengan en naves...
// el mapa hazlo con Blender». Es el primero de los lugares que no sale de las
// piezas de `lugares.js` sino de un modelo: `herramientas/blender/lugar_milan.py`
// deja `public/models/lugar-milan.glb` y aquí solo se dice qué es cada cosa.
//
// El grupo va vacío: el modelo lo carga `world.ponerEscenario` al verlo en
// `modelo` y lo cuelga dentro cuando llega. Los números que hay aquí son los del
// guion de Blender, y si se retoca uno hay que retocar el otro:
//   · el arco de la Galleria, centrado en el eje, con la cara en z = -40; por él
//     salen los bichos (`entrada` en la misión de campana.js),
//   · el Duomo a la derecha, a lo largo del campo, con la fachada en x = 18
//     mirando a los carriles (centro en z = -12), como lo dibujó Isidro,
//   · los pórticos en la línea de la Galleria, a su izquierda (cara en z = -40).
function milanDuomo () {
  const g = new THREE.Group()
  g.name = 'lugar:milanDuomo'
  Object.assign(g.userData, {
    modelo: 'lugar-milan',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    // Se trata como un lugar (deja pasar los hitos, se vuela por su vista), pero
    // sin hitos: el Duomo ya viene en el modelo.
    conHitos: true,
    // La lastra con sus líneas blancas es el modelo: la calzada del juego, que va
    // por encima, la taparía.
    sinCalzada: true,
    // La torre a un lado, delante de los pórticos y fuera del paso de los bichos
    // (el pasillo acaba en x = 6,9 y el disco de la torre empieza en 7,6).
    // En (-10,5, -35,5): delante del ala izquierda de la Galleria (su cara está
    // en -40) y a la vista en el móvil, donde el borde del cuadro pasa por x ≈ 13.
    baseX: -10.5,
    baseZ: -35.5,
    altoVuelo: 40,
    // La llegada empieza mirando al Duomo —Isidro: «al principio de la partida
    // tiene que verse la cámara viendo al Duomo y luego se coloca en posición de
    // batalla»—, y DE FRENTE Y DE LEJOS, como en su foto: «queda más plano, o
    // sea un poco más alejado y más recto». Para que quepan sus 46 de ancho en
    // un móvil en vertical hay que irse a 120, y ahí la niebla del juego (que
    // cierra a 152) se lo comería: por eso el vuelo la abre (`niebla`) y la
    // devuelve a la suya mientras baja al campo. La cámara arranca en la plaza, a
    // la izquierda y a la altura del centro de la fachada, mirando a la derecha;
    // luego avanza, gira hacia el arco y se coloca en su sitio.
    vista: { desde: [-102, 13, -12], mira: [18, 26, -12], niebla: { cerca: 150, lejos: 330 } },
    foco: [[13, 0, -36], [82, 72, 12]]
  })
  return g
}

// Tarragona: la Platja del Miracle con el anfiteatro, hecha en Blender
// (herramientas/blender/lugar_tarragona.py, 30/09). Se juega en la arena, el mar
// a la izquierda y, a la derecha, la vía del tren, el talud y el anfiteatro.
// Jugando solo se ve la vía y el borde del anfiteatro (en un móvil en vertical
// no cabe más a ese lado): la llegada lo enseña entero, desde el mar.
function tarragonaMiracle () {
  const g = new THREE.Group()
  g.name = 'lugar:tarragonaMiracle'
  Object.assign(g.userData, {
    modelo: 'lugar-tarragona',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    conHitos: true,
    sinCalzada: true,
    altoVuelo: 30,
    // Desde el mar, a la izquierda y más allá del fondo, mirando en diagonal al
    // anfiteatro: de frente, la base alien y la nave quedaban en medio
    // (la arena está en x ≈ 28, z = -64, a 2,6 de alto).
    vista: { desde: [-52, 34, -122], mira: [28, 4, -62], niebla: { cerca: 160, lejos: 460 } },
    foco: [[16, 0, -100], [62, 22, -28]]
  })
  return g
}

// Valencia: la Ciudad de las Artes y las Ciencias, hecha en Blender con la luz
// horneada como Madrid (herramientas/blender/lugar_valencia.py, 02/10). Se juega
// en el paseo entre los dos estanques: el Hemisfèric a la izquierda, las costillas
// del Museo a la derecha y, al fondo, el puente de Monteolivete y la puerta del
// Palau de les Arts, por donde salen los alienz andando (`entrada` en la misión).
// La base alien va en una plataforma metida en el estanque, a un lado, como en
// Milán: en el eje, los que vienen del fondo la atravesarían.
function valenciaArtes () {
  const g = new THREE.Group()
  g.name = 'lugar:valenciaArtes'
  Object.assign(g.userData, {
    modelo: 'lugar-valencia',
    modeloCiudad: 'lugar-valencia-ciudad',
    luz: 'lugar-valencia',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    // Dentro del estanque, en su plataforma (los mismos números que el guion).
    baseX: -12.6,
    baseZ: -44
  })
  return g
}

// Marsella: el Vieux-Port, hecho en Blender con la luz horneada
// (herramientas/blender/lugar_marsella.py, 03/10). Se juega en el Quai du Port
// mirando al fondo del puerto (el mapa se dio la vuelta: la bocana queda a la
// espalda de los soldados): los soportales a la izquierda, el agua y los barcos
// a la derecha y, al fondo, las barcazas alienígenas varadas en la dársena con
// la rampa sobre el muelle, de donde bajan (`entrada` en la misión). La base
// alien va encima de otra barcaza amarrada de popa al muelle, entre los barcos.
function marsellaPuerto () {
  const g = new THREE.Group()
  g.name = 'lugar:marsellaPuerto'
  Object.assign(g.userData, {
    modelo: 'lugar-marsella',
    modeloCiudad: 'lugar-marsella-ciudad',
    luz: 'lugar-marsella',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    // La niebla de la misión cierra a 460: jugando se dibuja hasta ahí, con el
    // fondo del puerto (el Quai des Belges y la ciudad de detrás) en el modelo
    // de juego.
    lejos: 470,
    // Lo que sigue ardiendo después del combate (lugar_marsella.py, «la
    // guerra»): el coche y el autobús calcinados, el velero quemado, el boquete
    // de una fachada y dos incendios de la ciudad, al fondo. [x, z, ancho, alto, y0]
    humos: [[-11.2, -30, 2.6, 18], [-14.6, -80, 3.6, 28], [12.6, -70, 2.8, 22],
      [-19.6, -15, 2.2, 12, 13], [17, -138, 4, 40, 3], [40, -280, 16, 80], [-70, -230, 12, 60]],
    // En la cubierta de su barcaza (BASE del guion, ya girada).
    baseX: 13,
    baseZ: -44
  })
  return g
}

// Lyon: el muelle del Saona bajo Fourvière, hecho en Blender con la luz horneada
// (herramientas/blender/lugar_lyon.py, 03/10). Se juega en el muelle de la
// Presqu'île mirando río abajo: el parapeto con los plátanos a la derecha, la
// calzada y las mansardas a la izquierda y, al fondo, la pasarela Saint-Georges,
// por la que entran los que bajan de Fourvière (`entrada` en la misión). La base
// alien va en una isleta de la calzada, a un lado.
function lyonSaona () {
  const g = new THREE.Group()
  g.name = 'lugar:lyonSaona'
  Object.assign(g.userData, {
    modelo: 'lugar-lyon',
    modeloCiudad: 'lugar-lyon-ciudad',
    luz: 'lugar-lyon',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    baseX: -12.6,
    baseZ: -44
  })
  return g
}

// París: el Campo de Marte al pie de la torre, hecho en Blender con la luz
// horneada (herramientas/blender/lugar_paris.py, 04/10). Se mira por el eje del
// campo hacia la torre de Meshy, horneada con el sitio. Los alienz salen de un
// túnel entre sus patas: nacen dentro, tres metros bajo el suelo, y suben por
// la rampa (`hueco`, que world.js convierte en altura bajo los pies). La base
// alien va en una glorieta del césped izquierdo.
function parisMarte () {
  const g = new THREE.Group()
  g.name = 'lugar:parisMarte'
  Object.assign(g.userData, {
    modelo: 'lugar-paris',
    modeloCiudad: 'lugar-paris-ciudad',
    luz: 'lugar-paris',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    // La zanja del túnel (los mismos números que el guion): de ancho ±x, con
    // el fondo a `hondo` bajo el suelo en zFondo y la rampa subiendo hasta zBorde.
    hueco: { x: 7.6, zFondo: -124, zBorde: -106, hondo: 3 },
    baseX: -13,
    baseZ: -50
  })
  return g
}

// Nápoles: el Lungomare con el Castel dell'Ovo y el Vesubio, hecho en Blender con
// la luz horneada (herramientas/blender/lugar_napoles.py, 06/10). Se juega en el
// paseo mirando al este: la balaustrada, la escollera y el mar a la derecha; la
// calzada con palmeras y los hoteles a la izquierda. Los alienz llegan en nave,
// como siempre, y la base alien va en su sitio de siempre, en el eje.
function napolesLungomare () {
  const g = new THREE.Group()
  g.name = 'lugar:napolesLungomare'
  Object.assign(g.userData, {
    modelo: 'lugar-napoles',
    modeloCiudad: 'lugar-napoles-ciudad',
    luz: 'lugar-napoles',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470
  })
  return g
}

// Roma: dentro del Coliseo como está hoy, hecho en Blender con la luz horneada
// (herramientas/blender/lugar_roma.py, 06/10). Se juega sobre una tarima de
// madera que cruza la arena, con el hipogeo abierto a los lados; el muro de
// fuera sigue en pie a la izquierda y al fondo, y a la derecha está la mitad
// caída. Los alienz salen del túnel de la puerta del fondo (`entrada` en la
// misión) y la base alien va sobre un tambor de piedra, a la izquierda.
function romaColiseo () {
  const g = new THREE.Group()
  g.name = 'lugar:romaColiseo'
  Object.assign(g.userData, {
    modelo: 'lugar-roma',
    modeloCiudad: 'lugar-roma-ciudad',
    luz: 'lugar-roma',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    sinAvion: true,
    lejos: 470,
    baseX: -13.5,
    baseZ: -44
  })
  return g
}

// Atenas: arriba, en la Acrópolis, con el Partenón de frente al fondo del campo,
// al atardecer (herramientas/blender/lugar_atenas.py, 06/10). Isidro: «hay muchas
// columnas en una zona alta» y «salen del Partenón». Los alienz nacen dentro del
// templo, cruzan entre las columnas (`columnas` en la misión: las esquivan) y
// bajan sus tres escalones: el `hueco` va con el fondo NEGATIVO, o sea, hacia
// arriba; es el suelo del templo, 1,15 por encima de la roca, con su rampa.
// A la izquierda, las Cariátides; a la derecha, la base alien.
function atenasAcropolis () {
  const g = new THREE.Group()
  g.name = 'lugar:atenasAcropolis'
  Object.assign(g.userData, {
    modelo: 'lugar-atenas',
    modeloCiudad: 'lugar-atenas-ciudad',
    luz: 'lugar-atenas',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -62.0, zBorde: -60.6, hondo: -1.15 },
    baseX: 13.2,
    baseZ: -47
  })
  return g
}

// Salónica: el paseo de Nikis mirando a la Torre Blanca, de día
// (herramientas/blender/lugar_salonica.py, 06/10). El mar a la derecha, con las
// barcas y la goleta; la calzada, las terrazas y los bloques a la izquierda. Los
// alienz llegan en nave, como siempre, y la torre asoma por encima de ella: va
// casi en el eje porque arriba, en el centro, es donde el marcador deja un hueco.
// Por eso la base alien va a un lado, plantada en la bocacalle de la izquierda.
function salonicaPaseo () {
  const g = new THREE.Group()
  g.name = 'lugar:salonicaPaseo'
  Object.assign(g.userData, {
    modelo: 'lugar-salonica',
    modeloCiudad: 'lugar-salonica-ciudad',
    luz: 'lugar-salonica',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: -12.8,
    baseZ: -44,
    // El coche que sigue ardiendo en la calzada.
    humos: [[-10.75, -28, 1.6, 11, 1.0]]
  })
  return g
}

// Heraclión: el patio central del palacio de Cnosos, por la mañana temprano
// (herramientas/blender/lugar_cnosos.py, 06/10). Isidro: «lo más famoso» y «salen
// del laberinto». Al fondo, la rampa que baja a los sótanos del palacio y, encima
// de su puerta, la galería de las columnas rojas con el fresco del toro. Los
// alienz nacen dentro, a oscuras, y suben la rampa: `hueco` es esa rampa (3,6 de
// hondo al pie) y `entrada`, en la misión, dónde nacen. A los lados, tinajas y
// columnas; a la derecha, la base alien dentro de una kulura.
function heraclionCnosos () {
  const g = new THREE.Group()
  g.name = 'lugar:heraclionCnosos'
  Object.assign(g.userData, {
    modelo: 'lugar-cnosos',
    modeloCiudad: 'lugar-cnosos-ciudad',
    luz: 'lugar-cnosos',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -80.0, zBorde: -62.0, hondo: 3.6 },
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Alejandría: la explanada de la fortaleza de Qaitbay, de día
// (herramientas/blender/lugar_alejandria.py, 07/10). Isidro eligió la fortaleza y
// que los alienz SALGAN DE ELLA: nacen dentro de la torre del homenaje, cruzan el
// patio y salen por la puerta del muro, que es estrecha (`entrada.abanico` en la
// misión). El mar abierto a la izquierda, el puerto con sus barcas a la derecha,
// y la base alien en un baluarte redondo del espigón.
function alejandriaQaitbay () {
  const g = new THREE.Group()
  g.name = 'lugar:alejandriaQaitbay'
  Object.assign(g.userData, {
    modelo: 'lugar-alejandria',
    modeloCiudad: 'lugar-alejandria-ciudad',
    luz: 'lugar-alejandria',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Luxor: la avenida de las esfinges de Karnak, a mediodía
// (herramientas/blender/lugar_luxor.py, 07/10). Las dos filas de esfinges con
// cabeza de carnero a los lados y, al fondo, el pilono con su puerta, los dos
// colosos y el obelisco. Los alienz SALEN DEL TEMPLO por esa puerta, que es
// estrecha: vienen en abanico cerrado y se abren al pasar los colosos
// (`entrada.abanico` en la misión). La base alien, en un claro de la fila derecha.
function luxorEsfinges () {
  const g = new THREE.Group()
  g.name = 'lugar:luxorEsfinges'
  Object.assign(g.userData, {
    modelo: 'lugar-luxor',
    modeloCiudad: 'lugar-luxor-ciudad',
    luz: 'lugar-luxor',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// El Cairo: a los pies de la Esfinge, al atardecer
// (herramientas/blender/lugar_gizeh.py, 07/10). La Esfinge de frente al fondo (a
// 0,6 de su tamaño: la cabeza cae en el hueco que deja el marcador) y la pirámide
// de Kefrén pegada detrás. Los alienz, y LA MADRE, salen DE DEBAJO de ella: una
// rampa que baja 4,6 m hasta una boca a oscuras bajo las patas (`hueco`, como en
// Cnosos y en París; `entrada` en la misión dice dónde nacen).
function gizehEsfinge () {
  const g = new THREE.Group()
  g.name = 'lugar:gizehEsfinge'
  Object.assign(g.userData, {
    modelo: 'lugar-gizeh',
    modeloCiudad: 'lugar-gizeh-ciudad',
    luz: 'lugar-gizeh',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -78.0, zBorde: -62.0, hondo: 4.6 },
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Lagos: encima del puente atirantado de Lekki-Ikoyi, al atardecer
// (herramientas/blender/lugar_lagos.py, 09/10). Isidro dejó Nigeria en este solo
// mapa y el sitio a mi elección («el que sea más bonito y reconocible»). El
// pilono al fondo con sus tirantes, los danfos amarillos en las aceras, la laguna
// con las casas sobre pilotes a los lados, y la base alien en un mirador redondo
// que sale del tablero a la derecha. Los alienz llegan en nave.
function lagosPuente () {
  const g = new THREE.Group()
  g.name = 'lugar:lagosPuente'
  Object.assign(g.userData, {
    modelo: 'lugar-lagos',
    modeloCiudad: 'lugar-lagos-ciudad',
    luz: 'lugar-lagos',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44,
    // El danfo que sigue ardiendo en la acera de la izquierda.
    humos: [[-10.35, -31, 1.6, 11, 1.4]]
  })
  return g
}

// Bombay: la explanada de la Puerta de la India, de día
// (herramientas/blender/lugar_bombay.py, 09/10). El arco de frente al fondo, a la
// mitad de su tamaño; detrás, las barcazas alienígenas varadas contra el muelle:
// los alienz nacen en ellas y cruzan por debajo del arco (`entrada` con
// `abanico`, en la misión). El mar a la derecha, con la base alien en un
// baluarte redondo del muelle.
function bombayPuerta () {
  const g = new THREE.Group()
  g.name = 'lugar:bombayPuerta'
  Object.assign(g.userData, {
    modelo: 'lugar-bombay',
    modeloCiudad: 'lugar-bombay-ciudad',
    luz: 'lugar-bombay',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Agra: los jardines del Taj Mahal, al amanecer
// (herramientas/blender/lugar_agra.py, 09/10). El mausoleo entero al fondo, a 0,17
// de su tamaño, sobre su zócalo de mármol: los alienz nacen dentro, salen por la
// puerta del gran arco y bajan la escalinata. `hueco` con `hondo` negativo es
// ese suelo levantado (1,2 m) con su rampa, como en el Partenón.
function agraTaj () {
  const g = new THREE.Group()
  g.name = 'lugar:agraTaj'
  Object.assign(g.userData, {
    modelo: 'lugar-agra',
    modeloCiudad: 'lugar-agra-ciudad',
    luz: 'lugar-agra',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -72.0, zBorde: -68.0, hondo: -1.2 },
    baseX: 12.6,
    baseZ: -44,
  })
  return g
}

// Calcuta: el paseo del jardín del Victoria Memorial, una tarde de monzón
// (herramientas/blender/lugar_calcuta.py, 09/10). El palacio entero al fondo, a
// 0,23 de su tamaño; la nave se posa delante y la cúpula con el Ángel asoma por
// encima. Estanque a la izquierda y la base alien en un ruedo a la derecha.
function calcutaMemorial () {
  const g = new THREE.Group()
  g.name = 'lugar:calcutaMemorial'
  Object.assign(g.userData, {
    modelo: 'lugar-calcuta',
    modeloCiudad: 'lugar-calcuta-ciudad',
    luz: 'lugar-calcuta',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Pekín: encima de la Gran Muralla, en Badaling, un día de otoño
// (herramientas/blender/lugar_pekin.py, 10/10; sitio, entrada y hora elegidos por
// mí: Isidro pidió seguir sin preguntar). Se juega en el camino de ronda; al
// fondo, la torre: los alienz nacen dentro y salen por su puerta (`entrada` con
// `abanico`, en la misión). La base alien, en un cubo redondo de la muralla.
function pekinMuralla () {
  const g = new THREE.Group()
  g.name = 'lugar:pekinMuralla'
  Object.assign(g.userData, {
    modelo: 'lugar-pekin',
    modeloCiudad: 'lugar-pekin-ciudad',
    luz: 'lugar-pekin',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Shanghái: la terraza del estanque del Jardín Yuyuan, al anochecer
// (herramientas/blender/lugar_shanghai.py, 10/10; elegido por mí). Al fondo, la
// casa de té con sus tres tejados y las celosías encendidas; farolillos rojos en
// las barandillas, el puente en zigzag a la izquierda y la base alien en una
// isleta del estanque a la derecha. Pudong, encendido, solo en la llegada.
function shanghaiYuyuan () {
  const g = new THREE.Group()
  g.name = 'lugar:shanghaiYuyuan'
  Object.assign(g.userData, {
    modelo: 'lugar-shanghai',
    modeloCiudad: 'lugar-shanghai-ciudad',
    luz: 'lugar-shanghai',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Chongqing: el paseo del río al pie de Hongyadong, de noche
// (herramientas/blender/lugar_chongqing.py, 10/10; elegido por mí). Las casas
// sobre pilotes llenan el fondo, encendidas en oro; el río a la izquierda, los
// puestos con sus farolillos a la derecha y la base alien en un ruedo entre ellos.
function chongqingHongya () {
  const g = new THREE.Group()
  g.name = 'lugar:chongqingHongya'
  Object.assign(g.userData, {
    modelo: 'lugar-chongqing',
    modeloCiudad: 'lugar-chongqing-ciudad',
    luz: 'lugar-chongqing',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Moscú: la Plaza Roja nevada, un día de invierno
// (herramientas/blender/lugar_moscu.py, 10/10; elegido por mí). San Basilio
// entero al fondo, a 0,27 de su tamaño; delante, la rampa que baja a lo que hay
// debajo: por ahí suben los alienz y LA MADRE (`hueco`, como en Gizeh). A la
// derecha, la muralla del Kremlin, el mausoleo y la base alien en un ruedo.
function moscuPlaza () {
  const g = new THREE.Group()
  g.name = 'lugar:moscuPlaza'
  Object.assign(g.userData, {
    modelo: 'lugar-moscu',
    modeloCiudad: 'lugar-moscu-ciudad',
    luz: 'lugar-moscu',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -78.0, zBorde: -62.0, hondo: 4.6 },
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Novosibirsk: encima del Obi helado, en la noche azul del invierno
// (herramientas/blender/lugar_novosibirsk.py, 10/10; elegido por mí, siguiendo el
// parte de la misión: «se curan en el hielo»). Al fondo, el boquete: una losa de
// hielo vencida que baja 3,6 m al agua (`hueco`); por ahí suben los alienz.
// Detrás, el puente de Bugrinski encendido. La base alien, en un cerco de hielo.
function novosibirskObi () {
  const g = new THREE.Group()
  g.name = 'lugar:novosibirskObi'
  Object.assign(g.userData, {
    modelo: 'lugar-novosibirsk',
    modeloCiudad: 'lugar-novosibirsk-ciudad',
    luz: 'lugar-novosibirsk',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    hueco: { x: 7.6, zFondo: -78.0, zBorde: -64.0, hondo: 3.6 },
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Anchorage: la carretera de Seward junto a la ensenada, con el sol de medianoche
// (herramientas/blender/lugar_anchorage.py, 10/10; elegido por mí). El agua con
// los hielos a la izquierda; a la derecha los tótems, el tren del Alaska Railroad
// parado en la vía y la ladera de abetos; las montañas nevadas alrededor. La base
// alien, en un paso de tablones sobre la vía.
function anchorageSeward () {
  const g = new THREE.Group()
  g.name = 'lugar:anchorageSeward'
  Object.assign(g.userData, {
    modelo: 'lugar-anchorage',
    modeloCiudad: 'lugar-anchorage-ciudad',
    luz: 'lugar-anchorage',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Seattle: la calle de Pike Place Market, una tarde de lluvia
// (herramientas/blender/lugar_seattle.py, 10/10; elegido por mí). Al fondo, el
// mercado con su galería encendida y el rótulo rojo con el reloj en el tejado;
// los alienz suben del puerto y salen por la boca de la galería (`entrada` con
// `abanico`, en la misión). Ladrillo mojado, toldos, neones y la base alien en
// un ruedo de la acera.
function seattlePike () {
  const g = new THREE.Group()
  g.name = 'lugar:seattlePike'
  Object.assign(g.userData, {
    modelo: 'lugar-seattle',
    modeloCiudad: 'lugar-seattle-ciudad',
    luz: 'lugar-seattle',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Monterrey: la Macroplaza al amanecer
// (herramientas/blender/lugar_monterrey.py, 10/10; elegido por mí). El Faro del
// Comercio al fondo, a la mitad de su tamaño (una losa naranja que se sale por
// arriba de la pantalla), la catedral a su izquierda y la fuente a su derecha;
// explanada de losas con jardineras y palmeras. Los alienz, en nave.
function monterreyMacroplaza () {
  const g = new THREE.Group()
  g.name = 'lugar:monterreyMacroplaza'
  Object.assign(g.userData, {
    modelo: 'lugar-monterrey',
    modeloCiudad: 'lugar-monterrey-ciudad',
    luz: 'lugar-monterrey',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Guadalajara: la plaza, delante de la catedral, a media tarde
// (herramientas/blender/lugar_guadalajara.py, 10/10; elegido por mí). La catedral
// entera al fondo, a 0,2 de su tamaño, con sus dos agujas de azulejo; los alienz
// nacen dentro y salen por la puerta (`entrada` con `abanico`). Naranjos,
// bancos, el quiosco de hierro a la izquierda y la base alien en un ruedo.
function guadalajaraCatedral () {
  const g = new THREE.Group()
  g.name = 'lugar:guadalajaraCatedral'
  Object.assign(g.userData, {
    modelo: 'lugar-guadalajara',
    modeloCiudad: 'lugar-guadalajara-ciudad',
    luz: 'lugar-guadalajara',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Ciudad de México: el Paseo de la Reforma con las jacarandas en flor
// (herramientas/blender/lugar_cdmx.py, 10/10; elegido por mí). Al fondo, en su
// glorieta, el Ángel de la Independencia entero, a 0,28 de su tamaño; a los
// lados, jacarandas, bancas y las estatuas de los próceres. LA MADRE, en nave.
function cdmxReforma () {
  const g = new THREE.Group()
  g.name = 'lugar:cdmxReforma'
  Object.assign(g.userData, {
    modelo: 'lugar-cdmx',
    modeloCiudad: 'lugar-cdmx-ciudad',
    luz: 'lugar-cdmx',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Punta Cana: la playa de Bávaro, a mediodía
// (herramientas/blender/lugar_puntacana.py, 10/10; elegido por mí). Se juega en
// la arena, con el mar turquesa pegado a la izquierda; palmeras, hamacas y
// sombrillas de cana a la derecha. Al fondo, el muelle alien que entra del mar:
// los alienz nacen en él y bajan a la arena (`entrada` con `abanico`).
function puntaCanaBavaro () {
  const g = new THREE.Group()
  g.name = 'lugar:puntaCanaBavaro'
  Object.assign(g.userData, {
    modelo: 'lugar-puntacana',
    modeloCiudad: 'lugar-puntacana-ciudad',
    luz: 'lugar-puntacana',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

// Santo Domingo: la Plaza de España ante el Alcázar de Colón, de noche
// (herramientas/blender/lugar_santodomingo.py, 10/10; elegido por mí). El Alcázar
// al fondo, a 0,8 de su tamaño, iluminado; faroles coloniales, la estatua de
// Ovando, la muralla con sus cañones y la base alien en un ruedo. El Faro a Colón
// y su cruz de luz, en la llegada. Los alienz, en nave.
function santoDomingoAlcazar () {
  const g = new THREE.Group()
  g.name = 'lugar:santoDomingoAlcazar'
  Object.assign(g.userData, {
    modelo: 'lugar-santodomingo',
    modeloCiudad: 'lugar-santodomingo-ciudad',
    luz: 'lugar-santodomingo',
    carriles: 5,
    tapaElMundo: true,
    sinSombra: true,
    sinCalzada: true,
    lejos: 470,
    baseX: 12.6,
    baseZ: -44
  })
  return g
}

export const ESCENARIOS = { puente, estadio, circuito, milanDuomo, tarragonaMiracle, valenciaArtes, marsellaPuerto, lyonSaona, parisMarte, napolesLungomare, romaColiseo, atenasAcropolis, salonicaPaseo, heraclionCnosos, alejandriaQaitbay, luxorEsfinges, gizehEsfinge, lagosPuente, bombayPuerta, agraTaj, calcutaMemorial, pekinMuralla, shanghaiYuyuan, chongqingHongya, moscuPlaza, novosibirskObi, anchorageSeward, seattlePike, monterreyMacroplaza, guadalajaraCatedral, cdmxReforma, puntaCanaBavaro, santoDomingoAlcazar, ...LUGARES }
