import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FIELD } from '../config.js'
import { brilla, apagarEmision } from '../systems/resplandor.js'

// Nave de desembarco. Antes cada oleada aparecía de la nada al fondo de la
// carretera: los huéspedes se materializaban en el asfalto y no había ninguna
// razón visible para que llegaran justo ahí. Ahora baja una nave, apoya las
// patas, abre la compuerta y salen de dentro.
//
// La nave es ANCHA a propósito, tanto como la carretera. Con una nave estrecha
// habría que sacar a los huéspedes por el centro y luego repartirlos a sus
// carriles, y eso obliga a inventarles un camino en diagonal que no encaja con
// nada del juego. Así cada uno aparece ya en su carril, al pie de la rampa.
//
// Hay un casco distinto por ronda. Lo que cambia es SOLO el casco: la bodega,
// la rampa y las patas son las mismas piezas para todos, porque la punta de la
// rampa es la que decide dónde aparecen los huéspedes y no puede moverse de una
// oleada a otra. Los cascos se construyen todos al arrancar y se enciende uno;
// crearlos y destruirlos en cada oleada daría un tirón justo al aterrizar.

const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// Tiempo total desde que se avisa hasta que la compuerta queda abierta. El
// director de oleadas se apoya en este número para llamar con antelación.
export const LLEGADA = 3.4
const T_BAJADA = 2.4
const T_RAMPA = 1.0
const T_SUBIDA = 2.8
// Lo mínimo que la compuerta se queda abierta desde que termina de abrirse.
const ESPERA = 3
// Desde dónde baja. Parece poco, y lo es a propósito: la cámara va inclinada
// 25° y el borde superior del encuadre queda justo por debajo del horizonte, así
// que al fondo de la carretera solo hay unos trece metros de aire visibles. Con
// una entrada desde 44 la nave pasaba nueve décimas partes de la bajada tapada
// por el marcador y aparecía de golpe a un palmo del suelo.
const ALTURA = 13

const metal = (color, rough = 0.38, mtl = 0.7) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: mtl })
const brillo = color =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.3 })

// Un casco por ronda. `luz` es el color de las balizas y también el de la
// bodega y los listones de la rampa, así que cada nave llega con su propio
// color de luz y se distinguen de un vistazo aunque estén lejos y con niebla.
const FLOTA = [
  { nombre: 'platillo', casco: 0x5a6572, oscuro: 0x2a323b, luz: 0x6fe39a, cristal: 0x123024 },
  { nombre: 'cuña', casco: 0xa89678, oscuro: 0x4a4034, luz: 0xffb03a, cristal: 0x3a2410 },
  { nombre: 'lóbulos', casco: 0x6b5a86, oscuro: 0x2e2542, luz: 0xc07ad8, cristal: 0x2a1038 },
  { nombre: 'anillo', casco: 0x4d6d78, oscuro: 0x21343c, luz: 0x7fd8ff, cristal: 0x0d2a38 },
  { nombre: 'nodriza', casco: 0x7a4038, oscuro: 0x33191a, luz: 0xff5a4d, cristal: 0x3a0f12 }
]

// Cada constructor devuelve el grupo del casco y va apuntando sus balizas en
// `balizas`. Todos dejan libre la franja de delante (z > 3.6) y por debajo de
// y = 1.2, que es por donde asoman la bodega y la rampa.
const CASCOS = [

  // 0 · Platillo. El de siempre: prisma de ocho lados achatado con cúpula.
  (M, balizas) => {
    const g = new THREE.Group()
    const casco = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.7, 1.6, 8), M.casco)
    casco.scale.z = 0.8
    casco.position.y = 3.3
    casco.castShadow = true
    g.add(casco)

    const panza = new THREE.Mesh(new THREE.CylinderGeometry(6.7, 3.4, 1.5, 8), M.oscuro)
    panza.scale.z = 0.8
    panza.position.y = 1.85
    g.add(panza)

    const cresta = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 5.2, 1.1, 8), M.casco)
    cresta.scale.z = 0.8
    cresta.position.y = 4.6
    g.add(cresta)

    const puente = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.cristal)
    puente.scale.set(1, 0.62, 0.8)
    puente.position.set(0, 5.1, 0.6)
    g.add(puente)

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      baliza(g, balizas, M, Math.cos(a) * 6.3, 2.7, Math.sin(a) * 6.3 * 0.8, i * 0.8)
    }
    return g
  },

  // 1 · Cuña. Un prisma de tres lados con la punta hacia atrás: desde la cámara
  // se ve el lado ancho, y la nave parece una plancha que viene de frente.
  (M, balizas) => {
    const g = new THREE.Group()
    const R = 7.6
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.86, 2, 3), M.casco)
    cuerpo.rotation.y = Math.PI          // la punta, atrás; el canto ancho, delante
    cuerpo.position.y = 4.3
    cuerpo.castShadow = true
    g.add(cuerpo)

    const quilla = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 0.42, 1.6, 3), M.oscuro)
    quilla.rotation.y = Math.PI
    quilla.position.y = 3
    g.add(quilla)

    // Aleta dorsal: le da un perfil que no es solo una loncha.
    const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.3, 5.4), M.casco)
    aleta.position.set(0, 6.1, -2.2)
    aleta.rotation.x = -0.18
    g.add(aleta)

    // Dos toberas al fondo, que es lo que se ve cuando ya se está yendo.
    for (const sx of [-3.4, 3.4]) {
      const tobera = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 2.2, 12), M.oscuro)
      tobera.rotation.x = Math.PI / 2
      tobera.position.set(sx, 4.3, -4.6)
      g.add(tobera)
      const fuego = new THREE.Mesh(new THREE.CircleGeometry(0.95, 12), M.luz)
      fuego.position.set(sx, 4.3, -5.72)
      fuego.rotation.y = Math.PI
      g.add(fuego)
    }

    for (let i = 0; i < 5; i++) {
      baliza(g, balizas, M, -5.2 + i * 2.6, 3.4, 3.5, i * 1.1)
    }
    return g
  },

  // 2 · Lóbulos. Tres cápsulas fundidas en fila, la del centro más alta. Es la
  // silueta más orgánica de la flota: parece crecida, no fabricada.
  (M, balizas) => {
    const g = new THREE.Group()
    const espina = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.1, 3.4), M.oscuro)
    espina.position.y = 2.9
    g.add(espina)

    const lobulos = [[-4.6, 2.9, 2.7], [0, 3.6, 3.7], [4.6, 2.9, 2.7]]
    for (const [lx, ly, r] of lobulos) {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), M.casco)
      pod.scale.set(1, 0.62, 0.78)
      pod.position.set(lx, ly, 0)
      pod.castShadow = true
      g.add(pod)
      // Franja de ojos por debajo de cada cápsula.
      for (let i = 0; i < 3; i++) {
        baliza(g, balizas, M, lx - 0.9 + i * 0.9, ly - r * 0.5, r * 0.7, lx * 0.3 + i * 0.7)
      }
    }

    const ojo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.cristal)
    ojo.scale.set(1, 0.7, 0.8)
    ojo.position.set(0, 5.5, 0.8)
    g.add(ojo)
    return g
  },

  // 3 · Anillo. Un toro que gira despacio alrededor de un núcleo. El giro está
  // en el propio casco, no en el grupo: así sigue girando ya posada.
  (M, balizas) => {
    const g = new THREE.Group()
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(5.9, 1.05, 10, 22), M.casco)
    anillo.rotation.x = -Math.PI / 2
    anillo.scale.z = 0.8
    anillo.position.set(0, 3.9, -1.2)
    anillo.castShadow = true
    g.add(anillo)
    g.userData.gira = anillo         // lo hace rodar update()

    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(2.9, 18, 12), M.oscuro)
    nucleo.scale.set(1, 0.72, 0.85)
    nucleo.position.set(0, 4, -1.2)
    g.add(nucleo)

    const corona = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.cristal)
    corona.scale.set(1, 0.8, 0.85)
    corona.position.set(0, 5.1, -1)
    g.add(corona)

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      baliza(g, balizas, M, Math.cos(a) * 4.1, 4, -1.2 + Math.sin(a) * 4.1 * 0.8, i * 1.05)
    }
    return g
  },

  // 4 · Nodriza. Solo baja en la oleada del jefe: más grande que las demás,
  // con una corona de púas y el doble de balizas.
  (M, balizas) => {
    const g = new THREE.Group()
    const plato = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.6, 1.4, 12), M.casco)
    plato.scale.z = 0.82
    plato.position.y = 2.9
    plato.castShadow = true
    g.add(plato)

    const segundo = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 6.4, 1.5, 12), M.oscuro)
    segundo.scale.z = 0.82
    segundo.position.y = 4.1
    g.add(segundo)

    const torre = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 1.6, 12), M.casco)
    torre.scale.z = 0.85
    torre.position.y = 5.4
    g.add(torre)

    const nido = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.cristal)
    nido.scale.set(1, 0.85, 0.85)
    nido.position.y = 6.1
    g.add(nido)

    // Púas hacia fuera, inclinadas: la única de la flota que se lee agresiva.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const pua = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.6, 6), M.oscuro)
      pua.position.set(Math.cos(a) * 7, 2.6, Math.sin(a) * 7 * 0.82)
      pua.rotation.z = -Math.cos(a) * 1.1
      pua.rotation.x = Math.sin(a) * 1.1
      g.add(pua)
      baliza(g, balizas, M, Math.cos(a) * 6.1, 3.6, Math.sin(a) * 6.1 * 0.82, i * 0.55)
    }
    return g
  }
]

// Los cascos modelados, uno por nave de la flota y en el mismo orden.
//
// Solo el CASCO. La bodega, la rampa y las patas siguen siendo las piezas de
// siempre, y no por pereza: la punta de la rampa es la que decide en qué punto
// del asfalto aparece cada huésped, y no puede moverse de una oleada a otra.
// Una malla de un archivo tampoco se abre, y aquí hay una compuerta que abrir.
const CASCOS_3D = [
  'models/nave-platillo.glb',
  'models/nave-cuna.glb',
  'models/nave-lobulos.glb',
  'models/nave-anillo.glb',
  'models/nave-nodriza.glb'
]

// Dónde tiene que caber el casco para no tapar lo que importa.
//
// La nave es ancha como la carretera a propósito, y por debajo de y = 1.2 y por
// delante de z = 3.6 va la bodega con su compuerta. Un casco que invada esa
// franja tapa el hueco por donde salen los huéspedes, que es literalmente lo
// único que la nave tiene que hacer. Se mide la pieza que venga y se encaja.
// El casco, más ancho que la bodega que cuelga de él pero sin pasarse: con la
// bodega otra vez en 8,4, doce y medio ya la deja sobresaliendo por los dos
// lados —que es lo que hace que la bodega parezca colgada DE la nave y no
// atornillada delante— y la nave vuelve a tener el tamaño que tenía.
const ANCHO = 12.5
// La panza del casco, y va a propósito por DEBAJO del dintel de la bodega: el
// casco se come el metro de arriba del marco y la bodega deja de leerse como una
// caja apoyada delante para leerse como un hueco abierto EN la nave. Colocado
// por encima, quedaban separados y parecía un garaje con un platillo encima.
const SUELO = 2.6
// Y el morro sobresale por delante de la boca de la bodega (z = 4,8), así que
// la nave hace de visera sobre su propia compuerta.
const FRENTE = 5.6

function encajarCasco (raiz) {
  // Los cascos de Meshy traen luz propia de fábrica y se veían fluorescentes.
  apagarEmision(raiz)
  raiz.updateWorldMatrix(true, true)
  const caja = new THREE.Box3().setFromObject(raiz)
  const tam = caja.getSize(new THREE.Vector3())
  if (tam.x < 0.01) return null

  raiz.scale.multiplyScalar(ANCHO / tam.x)
  raiz.updateWorldMatrix(true, true)
  caja.setFromObject(raiz)

  // Apoyada por abajo en el techo de la bodega y retirada por delante: lo que
  // sobresalga hacia atrás da igual, ahí no hay nada.
  raiz.position.y += SUELO - caja.min.y
  raiz.position.z += FRENTE - caja.max.z
  raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  return raiz
}

// Las balizas no vienen en el archivo, y son la mitad de la lectura: es lo que
// dice desde lejos de qué nave se trata y lo que late mientras baja. Se ponen
// en corona alrededor del casco ya encajado, con su color de flota.
function balizasEnCorona (casco, lista, M, cuantas = 8) {
  casco.updateWorldMatrix(true, true)
  const caja = new THREE.Box3().setFromObject(casco)
  const cx = (caja.min.x + caja.max.x) / 2
  const cz = (caja.min.z + caja.max.z) / 2
  const rx = (caja.max.x - caja.min.x) * 0.46
  const rz = (caja.max.z - caja.min.z) * 0.46
  const y = caja.min.y + (caja.max.y - caja.min.y) * 0.34
  for (let i = 0; i < cuantas; i++) {
    const a = (i / cuantas) * Math.PI * 2
    baliza(casco, lista, M, cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz, i * 0.7)
  }
}

function baliza (padre, lista, M, x, y, z, fase) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), M.luz.clone())
  b.position.set(x, y, z)
  b.userData.fase = fase
  brilla(b)
  padre.add(b)
  lista.push(b)
}

// `alFase` avisa de cada tramo de la secuencia: bajando, posada, rampa,
// subiendo. Se pasa desde fuera en vez de que la nave llame al sonido ella
// misma, porque una entidad que solo sabe de geometría y de tiempos es la que se
// puede probar sin montar medio juego alrededor.
export function createDropship (alFase) {
  const group = new THREE.Group()
  group.visible = false

  // --- flota ---------------------------------------------------------------
  const balizas = []
  const cascos = FLOTA.map(p => {
    const M = {
      casco: metal(p.casco),
      oscuro: metal(p.oscuro, 0.5, 0.6),
      cristal: new THREE.MeshStandardMaterial({ color: p.cristal, roughness: 0.12, metalness: 0.2 }),
      luz: brillo(p.luz)
    }
    const propias = []
    const g = CASCOS[FLOTA.indexOf(p)](M, propias)
    g.visible = false
    group.add(g)
    balizas.push(...propias)
    return g
  })
  let casco = cascos[0]

  // --- cascos modelados, cuando lleguen ------------------------------------
  //
  // Se cargan DESPUES y sin bloquear. La partida arranca con los cascos de
  // cajas y cilindros de siempre y cada uno se releva en cuanto su archivo
  // termina de bajar: si la red va lenta, o si un archivo falta, se juega
  // exactamente igual con el casco procedural. Un adorno no puede impedir que
  // empiece una oleada.
  //
  // El relevo es por indice, asi que la nave que ya este en el aire no cambia
  // a media bajada: la siguiente llamada a vestir() elige de la lista nueva.
  const cargador = new GLTFLoader()
  CASCOS_3D.forEach((url, i) => {
    cargador.loadAsync(url).then(gltf => {
      const nuevo = encajarCasco(gltf.scene)
      if (!nuevo) return
      const envoltura = new THREE.Group()
      envoltura.add(nuevo)
      balizasEnCorona(nuevo, balizas, { luz: brillo(FLOTA[i].luz) })
      envoltura.visible = false
      group.add(envoltura)
      // El de cajas se queda en la escena pero apagado: si el modelado diera
      // problemas, volver es cambiar una linea.
      const viejo = cascos[i]
      viejo.visible = false
      cascos[i] = envoltura
      // Si el casco que estaba puesto era justo este y la nave no esta en el
      // aire, se releva en el sitio. En el aire no se toca: cambiarle el
      // cuerpo a una nave a media bajada se ve como un parpadeo.
      if (casco === viejo && estado === 'oculta') casco = envoltura
    }).catch(e => console.warn('Casco sin modelo, va el de cajas:', url, e.message))
  })

  // --- piezas comunes ------------------------------------------------------
  // Grafito neutro: sirve con las cinco paletas y no hay que repintarlo.
  const GRIS = metal(0x555f6b, 0.42, 0.65)
  const GRIS_OSCURO = metal(0x272e36, 0.5, 0.6)
  // Estas dos SÍ se repintan en cada llegada, con el color de la nave que toca.
  const LUZ_RAMPA = brillo(0x6fe39a)
  // Emisión moderada: es una superficie grande y plana, y con la misma que un
  // cristal de espora del tamaño de un dedo resplandecía cien veces más área.
  const INTERIOR = new THREE.MeshStandardMaterial({
    color: 0x2bd47a, emissive: 0x2bd47a, emissiveIntensity: 0.45, roughness: 0.6, side: THREE.DoubleSide
  })

  const pataGeo = new THREE.BoxGeometry(0.42, 2.6, 0.42)
  const pieGeo = new THREE.CylinderGeometry(0.75, 0.9, 0.26, 8)
  for (const [px, pz] of [[-4.6, -3], [4.6, -3], [-4.6, 3], [4.6, 3]]) {
    const pata = new THREE.Mesh(pataGeo, GRIS_OSCURO)
    pata.position.set(px, 1.3, pz)
    pata.rotation.z = px < 0 ? 0.22 : -0.22
    pata.castShadow = true
    group.add(pata)
    const pie = new THREE.Mesh(pieGeo, GRIS_OSCURO)
    pie.position.set(px + (px < 0 ? -0.3 : 0.3), 0.13, pz)
    group.add(pie)
  }

  // --- compuerta -----------------------------------------------------------
  // La bodega sobresale del casco. Metida dentro, la puerta quedaba por detrás
  // de la propia panza y no se veía nada: hace falta una cara plana por delante
  // donde montar el hueco y la bisagra.
  //
  // El marco va en cuatro piezas, no en una caja maciza: con la caja entera el
  // frente tapaba la bodega y la compuerta abierta daba a una pared lisa.
  // El hueco mide 2,15 de alto: lo justo para un huésped de 1,8 y ni un palmo
  // más. Con el dintel a 4,5 la bahía asomaba por encima de los cascos planos y
  // parecía un contenedor atornillado delante de la nave.
  // La bodega vuelve a su ancho de siempre.
  //
  // Estirarla a lo ancho de la carretera arreglaba el problema de verdad —los
  // carriles de los extremos caían fuera de la plancha— pero a costa de una nave
  // que parecía un hangar. La nave se queda estrecha y son los huéspedes los que
  // se adaptan: salen por el CENTRO de la rampa, como se sale de una nave, y se
  // reparten a sus carriles al pisar el asfalto.
  const MARCO = [
    [-3.85, 2.4, 0.7, 3.3],   // jamba izquierda
    [3.85, 2.4, 0.7, 3.3],    // jamba derecha
    [0, 3.85, 8.4, 0.7],      // dintel
    [0, 1.05, 8.4, 0.6]       // umbral, justo por debajo de la bisagra
  ]
  for (const [mx, my, mw, mh] of MARCO) {
    const pieza = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, 1.9), GRIS)
    pieza.position.set(mx, my, 4.8)
    pieza.castShadow = true
    group.add(pieza)
  }

  for (const wx of [-3.5, 3.5]) {
    const pared = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.15), GRIS_OSCURO)
    pared.position.set(wx, 2.42, 4.75)
    pared.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2
    group.add(pared)
  }
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.1), GRIS_OSCURO)
  techo.position.set(0, 3.5, 4.75)
  techo.rotation.x = Math.PI / 2
  group.add(techo)
  // El SUELO de la bodega es lo que brilla, no el fondo. La cámara mira desde
  // arriba: por un hueco de dos metros de fondo lo que se ve es el piso, y una
  // pared del fondo iluminada no llegaba a asomar por el hueco.
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.1), INTERIOR)
  piso.position.set(0, 1.38, 4.75)
  piso.rotation.x = -Math.PI / 2
  group.add(piso)
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.15), INTERIOR)
  fondo.position.set(0, 2.42, 3.7)
  group.add(fondo)

  // La rampa gira sobre su bisagra, no sobre su centro: por eso cuelga de un
  // grupo colocado en el borde de la bodega y la plancha va desplazada dentro.
  const bisagra = new THREE.Group()
  bisagra.position.set(0, 1.5, 5.75)
  group.add(bisagra)

  const LARGO = 5
  const plancha = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, LARGO), GRIS)
  plancha.position.z = LARGO / 2
  plancha.castShadow = true
  plancha.receiveShadow = true
  bisagra.add(plancha)
  for (const rx of [-3.3, 3.3]) {
    const listón = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, LARGO), LUZ_RAMPA)
    listón.position.set(rx, 0.16, LARGO / 2)
    bisagra.add(listón)
  }

  // Cerrada: de pie, tapando el hueco. Abierta: inclinada justo lo necesario
  // para que la punta toque el asfalto desde la altura de la bisagra.
  const CERRADA = -Math.PI / 2
  const ABIERTA = Math.asin(bisagra.position.y / LARGO)
  bisagra.rotation.x = CERRADA

  // Punta de la rampa medida en el mundo: ahí es donde tienen que aparecer los
  // huéspedes, así que la nave se coloca a partir de ese número y no al revés.
  const alcance = bisagra.position.z + Math.cos(ABIERTA) * LARGO
  group.position.set(0, 0, FIELD.spawnZ - alcance)

  // La anchura útil de la plancha, para que el huésped sepa por dónde puede
  // bajar sin salirse. Se mide de la propia pieza en vez de repetir el número.
  const ANCHO_RAMPA = 7.2

  // Cuánto sube la plancha por cada metro que se retrocede desde su punta, y
  // hasta dónde llega. Los huéspedes aparecen unos metros por detrás de la punta
  // —dentro de la nave— y salían a ras de suelo, o sea ATRAVESANDO la plancha
  // desde abajo. Con esto la pisan y bajan por ella, que es lo que tiene que
  // hacer una rampa.
  const RAMPA = {
    // Desde la punta hacia dentro de la nave, en z de mundo.
    desde: FIELD.spawnZ,
    largo: Math.cos(ABIERTA) * LARGO,
    alto: bisagra.position.y
  }

  // Polvo del aterrizaje: un anillo que se abre y se apaga.
  const polvo = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.35, 24),
    new THREE.MeshBasicMaterial({ color: 0xe8d3a6, transparent: true, opacity: 0, depthWrite: false })
  )
  polvo.rotation.x = -Math.PI / 2
  polvo.position.y = 0.05
  group.add(polvo)
  let tPolvo = -1

  let estado = 'oculta'
  let t = 0
  let despedida = false      // ya han salido todos: se irá en cuanto pueda

  function vestir (i) {
    casco.visible = false
    casco = cascos[i]
    casco.visible = true
    const luz = FLOTA[i].luz
    LUZ_RAMPA.color.setHex(luz)
    LUZ_RAMPA.emissive.setHex(luz)
    INTERIOR.color.setHex(luz)
    INTERIOR.emissive.setHex(luz)
  }
  vestir(0)

  return {
    group,
    // A qué altura está la plancha en un punto de la carretera. Cero fuera de
    // ella, así que se puede llamar siempre sin preguntar nada.
    // Media anchura por la que se puede bajar, con un margen para no pisar el
    // borde. La usan los huéspedes para saber cuánto pueden abrirse al salir.
    get medioAnchoRampa () { return ANCHO_RAMPA / 2 - 0.9 },

    alturaRampa (z) {
      if (estado !== 'rampa' && estado !== 'abierta') return 0
      const dentro = RAMPA.desde - z
      if (dentro <= 0 || dentro > RAMPA.largo) return 0
      return (dentro / RAMPA.largo) * RAMPA.alto
    },
    get estado () { return estado },
    get abierta () { return estado === 'abierta' },
    get nave () { return FLOTA[cascos.indexOf(casco)].nombre },

    // `n` es la oleada que viene (1 en adelante). Las oleadas normales van
    // rotando por la flota; la del jefe siempre trae la nodriza.
    llegar (n = 1, jefe = false) {
      if (estado === 'bajando' || estado === 'rampa' || estado === 'abierta') return
      vestir(jefe ? FLOTA.length - 1 : (n - 1) % (FLOTA.length - 1))
      estado = 'bajando'
      alFase?.('bajando')
      t = 0
      despedida = false
      group.visible = true
      group.position.y = ALTURA
      bisagra.rotation.x = CERRADA
    },

    // No cierra en el acto: solo anota que ya no queda nadie dentro. Las
    // primeras oleadas sueltan a sus cuatro huéspedes en cuatro segundos, y
    // cerrar ahí dejaba la compuerta abierta menos de lo que tarda en verse.
    partir () {
      if (estado === 'oculta' || estado === 'cerrando' || estado === 'subiendo') return
      despedida = true
    },

    // Corta la secuencia en seco: al reiniciar la partida no debe quedarse una
    // nave a medio bajar de la anterior.
    ocultar () {
      estado = 'oculta'
      t = 0
      despedida = false
      group.visible = false
      bisagra.rotation.x = CERRADA
      polvo.material.opacity = 0
      tPolvo = -1
    },

    update (dt) {
      if (estado === 'oculta') return
      t += dt

      switch (estado) {
        case 'bajando': {
          group.position.y = ALTURA * (1 - easeOut(Math.min(1, t / T_BAJADA)))
          // La compuerta se abre DURANTE la bajada, no después de posarse.
          // Esperar a tocar suelo para empezar a abrir dejaba a la nave un
          // segundo largo ahí plantada y cerrada, sin que pasara nada; y una
          // nave de desembarco de verdad llega con la panza ya abierta.
          // Arranca a la mitad del descenso y termina justo al posarse.
          const abre = Math.max(0, (t / T_BAJADA - 0.45) / 0.55)
          bisagra.rotation.x = CERRADA + (ABIERTA - CERRADA) * easeInOut(Math.min(1, abre))
          // Un balanceo que se va calmando: una nave que baja recta como un
          // ascensor parece un decorado bajando por un raíl.
          const resto = Math.max(0, 1 - t / T_BAJADA)
          group.rotation.z = Math.sin(t * 3.1) * 0.05 * resto
          group.rotation.x = Math.sin(t * 2.3 + 1) * 0.035 * resto
          if (t >= T_BAJADA) {
            estado = 'rampa'
            // Dos avisos en el mismo instante: el golpe de las patas y el
            // servo de la compuerta, que empieza a abrir acto seguido.
            alFase?.('posada')
            alFase?.('rampa')
            t = 0; group.rotation.set(0, 0, 0); tPolvo = 0
          }
          break
        }
        case 'rampa': {
          // La compuerta ya terminó de abrirse durante la bajada. Este tramo se
          // queda por los TIEMPOS: el director de oleadas avisa con `LLEGADA` de
          // antelación y esa cuenta incluye este segundo. Quitarlo adelantaría
          // la salida de todas las oleadas de todos los niveles.
          bisagra.rotation.x = ABIERTA
          if (t >= T_RAMPA) { estado = 'abierta'; t = 0 }
          break
        }
        case 'abierta': {
          if (despedida && t >= ESPERA) { estado = 'cerrando'; t = 0 }
          break
        }
        case 'cerrando': {
          const k = Math.min(1, t / T_RAMPA)
          bisagra.rotation.x = ABIERTA + (CERRADA - ABIERTA) * easeInOut(k)
          if (k >= 1) { estado = 'subiendo'; alFase?.('subiendo'); t = 0 }
          break
        }
        case 'subiendo': {
          group.position.y = ALTURA * easeInOut(Math.min(1, t / T_SUBIDA))
          group.rotation.y += dt * 0.35
          if (t >= T_SUBIDA) { estado = 'oculta'; group.visible = false; group.rotation.set(0, 0, 0) }
          break
        }
      }

      if (casco.userData.gira) casco.userData.gira.rotation.z += dt * 0.6

      if (tPolvo >= 0) {
        tPolvo += dt
        const k = Math.min(1, tPolvo / 1.4)
        polvo.scale.setScalar(1 + k * 7)
        polvo.material.opacity = 0.5 * (1 - k)
        if (k >= 1) tPolvo = -1
      }

      // Las balizas laten desfasadas; con todas a la vez la nave parpadeaba
      // entera como un semáforo. Solo las del casco encendido: las demás están
      // ocultas y repasarlas no pinta nada.
      const ahora = t + performance.now() * 0.001
      for (const b of balizas) {
        if (!b.parent.visible) continue
        b.material.emissiveIntensity = 1.2 + 1.6 * (0.5 + 0.5 * Math.sin(ahora * 3 + b.userData.fase))
      }
    }
  }
}
