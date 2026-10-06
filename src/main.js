import * as THREE from 'three'
import './style.css'
import { FIELD, BASE, NIVELES, SOLDIERS, DEFENSES, STRIKES, ZOMBIES, ECONOMY, carrilAbierto, carrilesAbiertos, estrecharCampo, entrarPorElFondo } from './config.js'
import { createWorld, rowZ, laneX } from './world.js'
import { createSoldier, upgradeCost, muzzleWorld, ejectorWorld, ponerVecinos } from './entities/soldier.js'
// El invitado del cooperativo crea copias de los huéspedes que le manda el
// anfitrión; la campaña los crea dentro del director de oleadas.
import { createZombie } from './entities/zombie.js'
import { createEconomy } from './systems/economy.js'
import { createWaveDirector } from './systems/waves.js'
import { createDropship } from './entities/dropship.js'
import { createEffects } from './systems/effects.js'
import { createGrietas } from './systems/grietas.js'
import { crearMarcas } from './systems/marcas.js'
import { crearCuenta, haySesionGuardada } from './systems/cuenta.js'
import { createAmbient } from './systems/ambient.js'
import { createAudio } from './audio.js'
import { createUI, devolucion } from './ui.js'
import { crearGuia } from './guia.js'
import { renderPortraits } from './portraits.js'
import { pintarMapa } from './mapa.js'
import { montarZoomMapa } from './mapaZoom.js'
import { cargarCartera, sumarBilletes, sumarMonedas, PRECIOS, MONEDAS_POR_DOLAR, PREMIOS_UNIDAD, ponerSinMejoras, factorMejora } from './systems/cartera.js'
import { crearDuelo, montarBandeja } from './duelo.js'
import { montarExpediente, htmlHallazgo } from './expediente.js'
import { crearCabina } from './helicoptero.js'
import { BIOMAS } from './biomas.js'
import { pintarVinetas, pintarMiFicha } from './multimenu.js'
import { oleadasArena, azarConSemilla } from './systems/duelo.js'
import { abrirBotin, resumenBotin } from './cofre.js'
import { crearTienda } from './tienda.js'
import { escenaDe, PAISES, paisDe } from './campana.js'
import { NIVEL_DETALLE } from './systems/detalle.js'
import { cargarProgreso, superarNivel, nivelJugable, ESTRELLAS, estrellasDe, estrellasTotales, estrellasQueFaltan, campañaCompleta } from './systems/progreso.js'

// Tres estrellas dibujadas, las ganadas encendidas. Se usa en la pantalla de
// victoria y en cada ficha del informe, y tiene que ser el MISMO dibujo en los
// dos sitios: es la unidad de medida de toda la campaña.
function estrellitas (n, clase = '') {
  return `<span class="estrellas ${clase}">${
    [1, 2, 3].map(i => `<span class="estrella${i <= n ? ' on' : ''}">★</span>`).join('')
  }</span>`
}
import { crearResplandor, marcarBrillo } from './systems/resplandor.js'
import { crearGolpes } from './systems/golpes.js'
import { crearFuego } from './systems/fuego.js'
import { crearCalidad, NIVELES as CALIDADES, leerPreferencia } from './systems/calidad.js'

const canvas = document.getElementById('scene')
const world = createWorld(canvas)
const { scene, camera, renderer } = world
const effects = createEffects(scene, camera)
const grietas = createGrietas(scene, world)
const marcas = crearMarcas(scene)
const economy = createEconomy(scene)
// El ambiente vive aunque la partida esté parada: en el menú también sopla viento.
const ambient = createAmbient(scene)
const audio = createAudio()
// La nave vive fuera de la partida: se queda oculta hasta que el director avisa.
// Va después del sonido porque le pasa un aviso por cada tramo de la secuencia.
const dropship = createDropship(fase => audio.nave(fase))
scene.add(dropship.group)
// El fuego de verdad (láminas animadas de un fuego simulado en Blender). Se lo
// presta a los efectos y a los golpes a través de `effects.fuego`.
const fuego = crearFuego(scene)
effects.fuego = fuego
const golpes = crearGolpes(scene, effects, audio)
// El avión solo se ve si su pasada no atraviesa nada del mapa.
golpes.alCielo(puntos => world.pasoDeAvion(puntos))

// Resplandor selectivo. Se crea después del mundo y la nave para que ya estén
// marcadas las mallas que emiten luz.
marcarBrillo(scene)

// La sombra la proyecta el cuerpo y lo grande; las piezas pequeñas (correas,
// mira, barra de vida, adornos) no. Medido el 01/10: un soldado eran 26 piezas
// y todas se dibujaban otra vez en la pasada de sombras, unas veinte llamadas
// por figura para una sombra que no cambia. Con el tablero lleno calentaba el
// móvil (Isidro: «con muchos alienz se sobrecalienta»).
function sombraSoloDeLoGrande (raiz) {
  raiz.traverse(o => {
    if (!o.isMesh || !o.castShadow || o.isSkinnedMesh) return
    const g = o.geometry
    const tris = (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3
    if (tris < 600) o.castShadow = false
  })
}
const resplandor = crearResplandor(renderer, scene, camera)
world.onResize(resplandor.resize)

// El ajuste de calidad se crea aquí porque necesita el sol —para el tamaño de
// su mapa de sombras—, el resplandor y los efectos, y los tres ya existen.
const calidad = crearCalidad({
  renderer,
  sun: world.sun,
  resplandor,
  effects,
  // Cambiar la resolución de dibujado no reajusta la cámara por su cuenta.
  alCambiar: () => world.resize()
})

const soldiers = []
// Los que andan miran a los demás para no atravesarlos (soldier.js).
ponerVecinos(() => soldiers)
const zombies = []
const occupied = new Map()            // "carril-fila" -> soldado
const slotKey = (lane, row) => `${lane}-${row}`

// Memoria de por dónde ha estado bajando la horda. Entre oleada y oleada no
// hay nadie en el tablero, y sin esto la colocación automática repartía a
// partes iguales por los cinco carriles justo cuando el nivel todavía solo
// manda enemigos por los tres del centro: dos de cada cinco compras se
// quedaban de adorno en los flancos. Se olvida despacio, así que cuando el
// nivel abre los carriles de fuera la memoria se reajusta sola.
const presion = new Array(FIELD.lanes).fill(0)

let baseHp = BASE.hp
let running = false
// Qué nivel se está jugando. Se elige en el menú y hace falta al ganar, para
// saber cuál marcar como superado y cuál ofrecer después.
let nivelActual = 0
// El reto que se está jugando, si se está jugando uno: lleva su propio nivel
// —el escenario de la campaña con las oleadas que montó otro jugador— y es lo
// que hace que la partida no cuente como misión al acabar.
let retoEnCurso = null
// El duelo en curso, si lo hay: lleva la arena, con la horda de la semilla.
let dueloEnCurso = null
const nivelActivo = () => dueloEnCurso?.nivel ?? retoEnCurso?.nivel ?? NIVELES[nivelActual]
let pausado = false
let moving = null                     // soldado esperando destino
let director = null

// ---------------------------------------------------------------------------
// interfaz
// ---------------------------------------------------------------------------
const ui = createUI({
  onSelect (item) {
    moving = null
    // Tropa y barreras se colocan solas en el hueco que más falta hace. Elegir
    // carta y además elegir casilla eran dos decisiones para una sola intención
    // —"me hace falta algo AHÍ"— y la segunda se toma con el pulgar tapando
    // media pantalla. El jugador siempre puede recolocar después.
    if (item && (item.type === 'soldier' || item.type === 'defense')) {
      const hueco = mejorHueco(item)
      ui.clearSelection()
      world.setSlotsVisible(false)
      if (!hueco) { audio.denied(); ui.banner('NO CABEN MÁS'); return }
      place(item, hueco.lane, hueco.row)
      return
    }
    world.setSlotsVisible(!!item && item.type !== 'strike' && item.type !== 'upgrade')
    if (item?.type === 'upgrade') buyUpgrade(item)
  },
  onUpgrade (soldier) {
    const cost = upgradeCost(soldier)
    if (!economy.spend(cost)) return audio.denied()
    soldier.upgrade()
    soldier.invertido = (soldier.invertido ?? soldier.spec.cost ?? 0) + cost   // lo que devuelve retirarlo
    audio.place()
    effects.floatText(soldier.mesh.position, `NV ${soldier.level}`, '#5fd97a', 52)
    ui.refreshInspector(soldier, economy.coins)
  },
  onRetirar (soldier) { retirarSoldado(soldier) },
  onDeselect () { world.setSlotsVisible(false) },

  // Llevar una carta directamente a su casilla, sin pasar por la colocación
  // automática. El gesto lo detecta la tienda —es ahí donde empieza— y aquí solo
  // se resuelve contra el tablero.
  onArrastreCarta (item, fase, e) {
    if (!running || pausado) return
    if (fase === 'inicio') {
      moving = null
      ui.closeInspector()
      world.setSlotsVisible(true)
      return
    }
    if (fase === 'mueve') {
      // Fuera del lienzo no hay casilla, y eso también es información: el
      // resaltado se apaga y se ve que soltar ahí no coloca nada.
      const c = casillaBajoDedo(e, canvas.getBoundingClientRect())
      if (!c) return world.resaltarSlot(-1, -1, false)
      world.resaltarSlot(c.lane, c.row, !occupied.has(slotKey(c.lane, c.row)))
      return
    }

    world.setSlotsVisible(false)
    if (fase === 'cancela') return

    const c = casillaBajoDedo(e, canvas.getBoundingClientRect())
    // Soltar sobre la tienda o fuera del tablero cancela sin cobrar. Es la
    // salida del gesto: si te arrepientes a medias, sueltas donde no hay casilla.
    if (!c) return
    if (occupied.has(slotKey(c.lane, c.row))) return audio.denied()
    place(item, c.lane, c.row)
  }
})

// La guía de la primera partida (guia.js): solo en la campaña, con la partida
// en marcha y fuera del vuelo y de la pausa.
const guia = crearGuia(() => ({
  jugando: running && !vuelo && !pausado && !dueloEnCurso && !coop,
  soldados: soldiers.length,
  monedas: economy.pickups.length,
  recolector: economy.autoCollect,
  apoyoListo: ui.catalog.some(c => c.type === 'strike' && economy.coins >= c.cost && !((recargas.get(c.key)?.resto ?? 0) > 0))
}))

economy.onChange(v => ui.setCoins(v))

// --- billetes -----------------------------------------------------------------
// La moneda que se queda entre partidas. Sale uno por cada 30 monedas cobradas y
// se guarda en el acto: si el jugador cierra a mitad de misión, lo ganado hasta
// ahí es suyo. El marcador enseña el total de la cartera y no solo lo de esta
// partida, porque lo que empuja es ver que ya casi llegas al precio de lo
// siguiente.
let billetesPartida = 0
const elBilletes = document.getElementById('billetes')
const elBilletesValor = document.getElementById('billetes-valor')
function pintarBilletes () { elBilletesValor.textContent = cargarCartera().billetes }
pintarBilletes()
// El cofre avisa cuando acaba su lluvia de billetes: el saldo de la partida, al día.
document.addEventListener('alienz-billetes', pintarBilletes)
// Apagado (Isidro, 29/09): «que al conseguir monedas se gane un billete durante
// las partidas, desactívalo en todo el juego; solo se gana fuera de las partidas».
// Los billetes salen ahora del cofre, de los regalos, de los retos del Mando y
// de cambiar en la tienda las monedas que sobran (100 = 1). Se deja el código
// por si algún día se quiere volver a encender: basta con poner esto a true.
const BILLETES_EN_PARTIDA = false
economy.onBillete(() => {
  // El duelo no da billetes por monedas: su premio es el cofre del ganador.
  if (!BILLETES_EN_PARTIDA || !running || dueloEnCurso) return
  billetesPartida++
  sumarBilletes(1)
  pintarBilletes()
  audio.billete()
  elBilletes.classList.remove('gana')
  void elBilletes.offsetWidth
  elBilletes.classList.add('gana')
})
ui.setBase(1)

ui.el.mute.addEventListener('click', () => {
  const callado = audio.toggleMute()
  ui.el.mute.querySelector('use').setAttribute('href', callado ? '#i-mute' : '#i-sound')
  ui.el.mute.setAttribute('aria-pressed', callado ? 'true' : 'false')
})

// ---------------------------------------------------------------------------
// compras
// ---------------------------------------------------------------------------
function buyUpgrade (item) {
  // Puede llegar sin item si la carta ya se compró y se quitó del catálogo.
  if (item?.key !== 'collector') return
  if (!economy.spend(item.cost)) { audio.denied(); ui.clearSelection(); return }
  economy.enableAutoCollect()
  document.getElementById('recolector')?.classList.remove('hidden')
  ui.removeCard('collector')
  ui.clearSelection()
  audio.coin()
  ui.banner('RECOLECTOR')
}

// Dónde hace más falta lo que se acaba de comprar.
//
// El carril se decide por la diferencia entre lo que viene por él y lo que ya
// lo defiende, no por "el que tenga menos soldados": un carril con dos arqueros
// y un Coloso encima está peor cubierto que uno vacío por el que no baja nadie.
// Amenaza y defensa se normalizan cada una por su máximo porque están en
// unidades distintas —vida contra coste— y sumarlas en crudo dejaba que un solo
// jefe de 1650 puntos de vida se comiera toda la escala.
function mejorHueco (item) {
  const amenaza = new Array(FIELD.lanes).fill(0)
  for (const z of zombies) {
    if (z.dead || z.bajoTierra) continue
    // Lo que ya casi ha llegado pesa mucho más que lo que acaba de salir.
    // Topado entre 0 y 1: con la entrada lejana del duelo, uno recien salido
    // daba avance NEGATIVO y al elevarlo al cuadrado puntuaba como si ya
    // estuviera encima de la base.
    const avance = Math.max(0, Math.min(1, (z.z - FIELD.spawnZ) / (FIELD.baseZ - FIELD.spawnZ)))
    const peso = z.maxHp * (0.3 + avance * avance * 2.5)
    amenaza[z.lane] += peso
    // Los anchos también aprietan a los carriles de al lado.
    if (z.spec.wide) {
      if (z.lane > 0) amenaza[z.lane - 1] += peso * 0.5
      if (z.lane < FIELD.lanes - 1) amenaza[z.lane + 1] += peso * 0.5
    }
  }

  // La defensa se cuenta sobre las casillas ocupadas, NO sobre `soldiers`.
  // Construir una figura tarda un instante y hasta entonces no está en la
  // lista: cuatro toques seguidos veían los cuatro un tablero vacío y plantaban
  // la columna entera en el mismo carril. Las casillas se reservan al momento.
  const defensa = new Array(FIELD.lanes).fill(0)
  const piezas = new Array(FIELD.lanes).fill(0)
  for (const [casilla, ocupante] of occupied) {
    const lane = Number(casilla.slice(0, casilla.indexOf('-')))
    piezas[lane]++
    defensa[lane] += ocupante?.spec
      ? ocupante.spec.cost * (1 + 0.4 * (ocupante.level - 1))
      : ocupante?.coste ?? 50
  }

  const maxA = Math.max(1, ...amenaza)
  const maxP = Math.max(1, ...presion)
  const centro = (FIELD.primerCarril + FIELD.ultimoCarril) / 2
  const orden = []
  for (let l = FIELD.primerCarril; l <= FIELD.ultimoCarril; l++) {
    // Lo ya puesto se descuenta por PIEZAS, no dividiendo por el máximo.
    //
    // Antes era `defensa[l] / maxD`, y dividir por el máximo hace que el carril
    // más defendido puntúe exactamente -1 tenga un arquero o tenga cuatro
    // morteros: a partir del primero, apilar salía GRATIS. Con el término de
    // presión valiendo hasta +1,2, un carril por el que hubiera bajado la horda
    // se llevaba tres seguidos mientras los de al lado se quedaban vacíos.
    //
    // Contando piezas, cada una que se pone encarece la siguiente, así que se
    // reparte a lo ancho primero y solo se apila cuando ya hay algo en todos.
    // El valor sigue contando, pero sobre una referencia fija —no relativa— para
    // que cuatro arqueros no valgan lo mismo que cuatro morteros.
    const ocupacion = piezas[l] * 0.65 + defensa[l] / 500
    const nota = (amenaza[l] / maxA) * 2 + (presion[l] / maxP) * 1.2 -
      ocupacion - Math.abs(l - centro) * 0.08
    orden.push({ lane: l, nota })
  }
  orden.sort((a, b) => b.nota - a.nota)

  // Las barreras van delante, a comerse el primer mordisco; los que disparan,
  // detrás, donde tardan más en tenerlos encima. Con alcances de 15 a 44 llegan
  // igual de lejos desde la última fila.
  // Lo que para o frena va delante; lo que dispara (también la torreta), detrás.
  const filas = item.spec.blocker || item.spec.paso ? [3, 2, 1, 0] : [0, 1, 2, 3]

  // La FILA manda sobre el carril, y esto es lo que estaba al revés.
  //
  // Antes se elegía el mejor carril y se rellenaba esa columna entera antes de
  // pasar al siguiente: por un carril caliente salían tres seguidos, uno detrás
  // de otro, mientras los carriles de al lado seguían vacíos. La puntuación de
  // amenaza llega a +2 y cada pieza solo descontaba 0,65, así que un carril con
  // la horda encima ganaba tres veces seguidas por mucho que se le penalizara.
  //
  // Ahora no se pasa de fila hasta que la fila está llena. Dentro de una fila
  // sigue mandando la amenaza —el primero va donde más falta hace—, pero el
  // segundo ya no puede ponerse detrás del primero habiendo hueco al lado.
  for (const row of filas) {
    for (const { lane } of orden) {
      if (!occupied.has(slotKey(lane, row))) return { lane, row }
    }
  }
  return null
}

async function place (item, lane, row) {
  // De invitado no se coloca nada aquí: se le pide al anfitrión, que es quien
  // lleva la partida. Si colocara en su propia pantalla, tendría un soldado que
  // no existe y que desaparecería en la siguiente instantánea.
  if (modoInvitado()) {
    coop.mandarOrden({ tipo: 'colocar', clave: item.key, clase: item.type, lane, row })
    return
  }
  // En los tramos estrechos (el puente) los carriles de fuera están cerrados.
  if (!carrilAbierto(lane)) return audio.denied()
  const key = slotKey(lane, row)
  if (occupied.has(key)) return audio.denied()
  if (!economy.spend(item.cost)) return audio.denied()

  // La casilla se reserva ANTES del await. Construir la figura tarda, y con la
  // colocación automática dos toques seguidos elegían el mismo hueco libre y el
  // segundo soldado se plantaba encima del primero.
  occupied.set(key, { coste: item.cost })

  const spec = item.type === 'defense' ? DEFENSES[item.key] : SOLDIERS[item.key]
  const s = await createSoldier(item.key, spec, lane, row)
  s.mesh.userData.soldierId = s.id
  marcarBrillo(s.mesh)
  sombraSoloDeLoGrande(s.mesh)

  // No aparecen en su casilla: entran por detrás de la línea y suben andando.
  // Las barreras sí aparecen puestas — un saco terrero no camina.
  if (!spec.fija) {
    const entrada = new THREE.Vector3(laneX(lane), 0, FIELD.baseZ + 2.4)
    s.px = entrada.x
    s.pz = entrada.z
    s.mesh.position.set(entrada.x, 0, entrada.z)
    s.spawnT = 0                      // sin el rebote de "caer del cielo"
    s.moveTo(lane, row, true)
    effects.burst(entrada, 0xffffff, 4, 0.5)
  } else {
    effects.burst(s.mesh.position, 0xffffff, 4, 0.5)
  }

  scene.add(s.mesh)
  soldiers.push(s)
  occupied.set(key, s)
  s.invertido = item.cost
  audio.place()
  guia.hecho('carta')

  if (!economy.canAfford(item.cost)) { ui.clearSelection(); world.setSlotsVisible(false) }
}

// --- retirar un soldado ----------------------------------------------------------
// Isidro (03/10) eligió poder quitar un soldado mal puesto: se va con un
// destello y devuelve la mitad de lo invertido en él (compra y mejoras; la
// cuenta está en `devolucion` de ui.js, que es lo que enseña el botón). De
// invitado en el cooperativo no: la partida es del anfitrión.
function retirarSoldado (s) {
  if (!running || s.dead || modoInvitado()) return audio.denied()
  const i = soldiers.indexOf(s)
  if (i < 0) return
  const vuelve = devolucion(s)
  soldiers.splice(i, 1)
  if (occupied.get(slotKey(s.lane, s.row)) === s) occupied.delete(slotKey(s.lane, s.row))
  s.dead = true                       // por si algo lo tenía apuntado
  s.bar.group.visible = false
  scene.remove(s.mesh)
  effects.burst(s.mesh.position, 0xffffff, 8, 0.8)
  if (vuelve > 0) {
    economy.add(vuelve)
    effects.floatText(s.mesh.position, `+${vuelve}`, '#f3cf62', 52)
  }
  audio.coin()
}

// --- velocidad ×2 ------------------------------------------------------------------
// Isidro (03/10) la eligió para cuando las oleadas van tranquilas. No se dobla
// el paso de tiempo —con 0,1 s de golpe las balas atravesarían a los bichos—:
// se simula DOS veces por fotograma. Solo en campaña: en el duelo y en el
// cooperativo los dos campos van al mismo reloj.
let velocidad = 1
const elVelocidad = document.getElementById('velocidad')
function pintarVelocidad () {
  const vale = !dueloEnCurso && !coop
  elVelocidad.hidden = !vale
  if (!vale) velocidad = 1
  elVelocidad.firstElementChild.textContent = `×${velocidad}`
  elVelocidad.setAttribute('aria-pressed', velocidad > 1 ? 'true' : 'false')
}
elVelocidad.addEventListener('click', () => {
  velocidad = velocidad > 1 ? 1 : 2
  pintarVelocidad()
  audio.unlock()
  try { navigator.vibrate?.(6) } catch {}
})

// La recarga de cada apoyo: segundos que le faltan y los que dura entera. La
// lleva la partida (no la tarjeta) y se vacía al empezar una.
const recargas = new Map()

function useStrike (item, point) {
  const spec = STRIKES[item.key]
  if ((recargas.get(item.key)?.resto ?? 0) > 0) return audio.denied()
  if (!economy.spend(item.cost)) return audio.denied()
  guia.hecho('apoyo')
  const total = (spec.recarga ?? 0) * factorMejora(item.key, 'recarga')
  if (total > 0) {
    recargas.set(item.key, { resto: total, total })
    ui.setRecarga(item.key, total, total)
  }
  // La mejora de «daño» de la tienda: más golpe, o más cura en el botiquín.
  const fuerza = factorMejora(item.key, 'dano')
  const golpe = (donde, radio, dano) => {
    for (const z of zombies) {
      if (z.intocable) continue
      const d = z.mesh.position.distanceTo(donde)
      if (d > radio) continue
      z.hurt(dano * fuerza * (1 - (d / radio) * 0.45), 1)
    }
  }
  const quemado = (donde, radio) => marcas.poner(donde.x, donde.z, 'quemado', radio * 1.5)
  const listo = () => { ui.clearSelection(); world.setSlotsVisible(false) }

  if (item.key === 'artilleria') {
    // Al carril abierto más cercano al toque: el bombardeo es de carril.
    let x = point.x
    let mejor = Infinity
    for (const l of carrilesAbiertos()) {
      const d = Math.abs(laneX(l) - point.x)
      if (d < mejor) { mejor = d; x = laneX(l) }
    }
    golpes.lanzar('artilleria', new THREE.Vector3(x, 0, point.z), (donde, radio) => {
      quemado(donde, radio)
      golpe(donde, radio, spec.damage)
    }, { proyectiles: spec.proyectiles, radio: spec.radius })
    return listo()
  }
  if (item.key === 'dron') {
    // Al de más vida que quede; a igualdad, al más cercano a donde se tocó.
    let objetivo = null
    for (const z of zombies) {
      if (z.dead || z.intocable) continue
      if (!objetivo || z.hp > objetivo.hp ||
        (z.hp === objetivo.hp && z.mesh.position.distanceTo(point) < objetivo.mesh.position.distanceTo(point))) objetivo = z
    }
    golpes.lanzar('dron', objetivo ? objetivo.mesh.position.clone() : point, (donde, radio) => {
      quemado(donde, radio)
      golpe(donde, radio, spec.damage)
    }, { objetivo, radio: spec.radius })
    return listo()
  }
  if (item.key === 'misilGuiado') {
    golpes.lanzar('misilGuiado', point, (donde, radio) => {
      quemado(donde, radio)
      golpe(donde, radio, spec.damage)
    }, { radio: spec.radius })
    return listo()
  }
  if (item.key === 'campoMinas') {
    const cercano = (p, r) => zombies.some(z => !z.dead && !z.intocable &&
      Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) < r)
    golpes.lanzar('campoMinas', point, (donde, radio) => {
      quemado(donde, radio)
      golpe(donde, radio, spec.damage)
    }, { minas: spec.minas, dura: spec.dura, radio: spec.radius, cercano })
    return listo()
  }
  if (item.key === 'botiquin') {
    golpes.lanzar('botiquin', point, () => {
      for (const s of soldiers) {
        if (s.dead) continue
        const cura = Math.round(s.maxHp * spec.cura / 100 * fuerza)
        const antes = s.hp
        s.hp = Math.min(s.maxHp, s.hp + cura)
        s.bar.set(s.hp / s.maxHp)
        effects.burst(s.mesh.position, 0x7dffae, 6, 0.6)
        if (s.hp > antes) effects.floatText(s.mesh.position.clone().setY(2), '+' + Math.round(s.hp - antes), '#7dffae', 52)
      }
    })
    return listo()
  }


  // El daño ya no cae en el mismo fotograma que el toque: cae cuando llega lo
  // que has pedido. Con el avión eso son segundo y medio, y en segundo y medio
  // la horda ha andado: el golpe deja de ser "dónde están" y pasa a ser "dónde
  // van a estar". Por eso el aro marca el sitio desde el instante del toque.
  // La granada la tira el soldado más cercano al blanco (no una defensa).
  let desde = null
  if (item.key === 'grenade') {
    let mejor = Infinity
    for (const s of soldiers) {
      if (s.dead || s.spec.fija) continue
      const d = Math.hypot(s.px - point.x, s.pz - point.z)
      if (d < mejor) { mejor = d; desde = new THREE.Vector3(s.px, 0, s.pz) }
    }
  }
  golpes.lanzar(item.key, point, (donde, radio) => {
    marcas.poner(donde.x, donde.z, 'quemado', radio * 1.5)
    // Temblor y fogonazo según lo gordo que sea lo que cae.
    temblar(item.key === 'airstrike' || item.key === 'misilGuiado' ? 1 : item.key === 'napalm' || item.key === 'artilleria' ? 0.7 : 0.35)
    // Menos daño en el borde: acertar de lleno tiene que valer más que rozar.
    golpe(donde, radio, spec.damage)
    // El napalm no acaba al explotar: deja la calzada ardiendo. Tres focos en
    // vez de uno porque una sola brasa de radio 4,2 es un círculo perfecto y se
    // lee como un decalque; tres solapados se leen como fuego derramado.
    // Isidro (01/10): «muro de fuego a lo largo», como el de verdad: una
    // franja de llamas altas siguiendo la pasada del avión, no tres focos.
    if (spec.brasas) {
      const largo = spec.brasas.largo ?? 0
      const pasos = largo ? Math.round(largo / (spec.brasas.radio * 1.1)) : 0
      for (let i = -pasos; i <= pasos; i++) {
        brasaEn(spec.brasas, {
          x: donde.x + (i ? (Math.random() - 0.5) * 0.8 : 0),
          z: donde.z + i * spec.brasas.radio * 1.1
        })
      }
    }
  }, { desde, alTemblar: temblar })

  ui.clearSelection()
  world.setSlotsVisible(false)
}

// ---------------------------------------------------------------------------
// entrada
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function findSoldierFrom (object) {
  let o = object
  while (o && !o.userData.soldierId) o = o.parent
  return o ? soldiers.find(s => s.id === o.userData.soldierId) : null
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return
  audio.unlock()

  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  pointer.x = (px / rect.width) * 2 - 1
  pointer.y = -(py / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const item = ui.selected
  const ground = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())

  // 1. golpe de efecto: cae donde toques
  if (item?.type === 'strike' && ground) return useStrike(item, ground)

  // 2. colocar o mover en la rejilla
  //
  // Va ANTES que las monedas: si hay una carta elegida, el jugador ha dicho lo
  // que quiere hacer, y una moneda cercana no debe robarle el toque.
  if ((item && item.type !== 'upgrade') || moving) {
    const hits = raycaster.intersectObjects(world.slots.children, false)
    if (hits.length) {
      const { lane, row } = hits[0].object.userData
      if (moving) {
        const dest = slotKey(lane, row)
        if (!occupied.has(dest)) {
          occupied.delete(slotKey(moving.lane, moving.row))
          moving.moveTo(lane, row)
          occupied.set(dest, moving)
          audio.place()
        } else audio.denied()
        moving = null
        world.setSlotsVisible(false)
      } else {
        place(item, lane, row)
      }
      return
    }
  }

  // 2b. con un soldado tocado (su ficha abierta y la flecha encima), tocar el
  // suelo es mandarlo a la casilla libre más cercana a ese punto. Tocar a otro
  // soldado lo cambia por ese (lo resuelve el paso 4), y tocar lejos de toda
  // casilla libre sigue siendo cerrar la ficha.
  const elegido = ui.inspected
  if (elegido && !elegido.dead && !elegido.spec.fija && !item && ground &&
      !raycaster.intersectObjects(soldiers.map(s => s.mesh), true).length) {
    const c = casillaCercana(ground, elegido)
    if (c && occupied.get(slotKey(c.lane, c.row)) !== elegido) {
      ui.closeInspector()
      mandarA(elegido, c)
      return
    }
  }

  // 3. biomasa del suelo, por cercanía en pantalla
  //
  // Con trazado de rayos había que acertar la geometría de la moneda, que en un
  // móvil ocupa una docena de píxeles: la mitad de los toques fallaban. Se cobra
  // todo lo que caiga dentro de un radio del dedo, que es como funciona
  // cualquier objetivo táctil decente.
  if (!economy.autoCollect && economy.pickups.length) {
    const radio = Math.max(44, Math.min(rect.width, rect.height) * 0.11)
    const alcanzadas = []
    for (const p of economy.pickups) {
      const v = p.mesh.position.clone().project(camera)
      if (v.z > 1) continue                                  // detrás de la cámara
      const sx = (v.x + 1) / 2 * rect.width
      const sy = (1 - (v.y + 1) / 2) * rect.height
      if (Math.hypot(sx - px, sy - py) <= radio) alcanzadas.push(p)
    }
    if (alcanzadas.length) {
      let total = 0
      const donde = alcanzadas[0].mesh.position.clone()
      for (const p of alcanzadas) total += economy.collect(p)
      if (total) { audio.coin(); effects.floatText(donde, `+${total}`); guia.hecho('monedas') }
      return
    }
  }

  // 4. tocar un soldado ya colocado
  //
  // Aquí NO se abre el inspector todavía. Un dedo que baja sobre un soldado
  // puede querer dos cosas distintas —consultarlo o arrastrarlo a otra casilla—
  // y solo se sabe cuál al levantarlo. Se anota el candidato y decide `pointerup`.
  const sHits = raycaster.intersectObjects(soldiers.map(s => s.mesh), true)
  if (sHits.length) {
    const s = findSoldierFrom(sHits[0].object)
    if (s && !s.spec.fija) {
      arrastre = { soldado: s, x0: px, y0: py, activo: false }
      return
    }
    if (s) { ui.openInspector(s, economy.coins); return }
  }

  ui.closeInspector()
  ui.clearSelection()
  world.setSlotsVisible(false)
})

// --- arrastrar un soldado a otra casilla -------------------------------------
// El umbral en píxeles es lo que separa un toque de un arrastre. Doce es un
// número medido, no elegido: por debajo, el temblor normal de un pulgar sobre
// una pantalla ya cuenta como arrastre y el inspector deja de abrirse nunca.
const UMBRAL_ARRASTRE = 12
let arrastre = null

// Isidro (03/10): «me gustaría poder mover a los soldados arrastrándolos a la
// posición deseada». Antes había que soltar el dedo justo encima de una casilla,
// que en el móvil son cuadritos de un centímetro: ahora vale soltar en cualquier
// sitio y se busca la casilla LIBRE más cercana a ese punto del suelo (la suya
// cuenta como libre). Más allá de `ALCANCE_CASILLA` no se mueve.
const ALCANCE_CASILLA = 3.5
function casillaBajoDedo (e, rect, soldado) {
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const suelo = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
  return suelo ? casillaCercana(suelo, soldado) : null
}
function casillaCercana (punto, soldado) {
  let mejor = null
  let dMejor = ALCANCE_CASILLA
  for (const c of world.slots.children) {
    if (!c.visible) continue                                   // carril cerrado
    const { lane, row } = c.userData
    const ocupante = occupied.get(slotKey(lane, row))
    if (ocupante && ocupante !== soldado) continue
    const d = Math.hypot(c.position.x - punto.x, c.position.z - punto.z)
    if (d < dMejor) { dMejor = d; mejor = c.userData }
  }
  return mejor
}
// Mandarlo andando a una casilla (la suya es no hacer nada).
function mandarA (soldado, c) {
  if (!c || soldado.dead) return false
  const destino = slotKey(c.lane, c.row)
  if (occupied.get(destino) === soldado) return false
  occupied.delete(slotKey(soldado.lane, soldado.row))
  soldado.moveTo(c.lane, c.row)
  occupied.set(destino, soldado)
  audio.place()
  soldadoEnCamino = soldado
  guia.hecho('mover')
  return true
}

// --- la flecha verde del seleccionado -----------------------------------------
// Encima del soldado que tienes tocado (con su ficha abierta), del que arrastras
// o del que va de camino a su sitio; se quita al llegar. Sin profundidad, para
// que no la tape nada, y meciéndose para que se vea que está viva.
let soldadoEnCamino = null
const flechaSel = (() => {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0x3ddc6a, depthTest: false, transparent: true, opacity: 0.95, fog: false })
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 14), mat)
  punta.rotation.x = Math.PI                                  // apuntando abajo
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 10), mat)
  asta.position.y = 0.36
  g.add(punta, asta)
  g.traverse(o => { o.renderOrder = 20 })
  g.visible = false
  scene.add(g)
  return g
})()
// --- el alcance del soldado tocado ------------------------------------------
// Isidro (03/10) eligió verlo al tocarlo. Un círculo no dice nada (con 15 a 44
// de alcance cubre el tablero entero); lo que decide es CÓMO dispara: su carril
// hasta donde llega (la franja, con una raya al final) y, a los lados, solo lo
// que tiene cerca (`FUERA_DE_CARRIL` del alcance: el medio disco tenue).
const alcanceSel = (() => {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0x3ddc6a, transparent: true, opacity: 0.16, depthWrite: false, fog: false })
  const franja = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  franja.rotation.x = -Math.PI / 2
  const tope = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.22), new THREE.MeshBasicMaterial({ color: 0x3ddc6a, transparent: true, opacity: 0.7, depthWrite: false, fog: false }))
  tope.rotation.x = -Math.PI / 2
  const lados = new THREE.Mesh(new THREE.CircleGeometry(1, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3ddc6a, transparent: true, opacity: 0.08, depthWrite: false, fog: false }))
  lados.rotation.x = -Math.PI / 2
  g.add(franja, tope, lados)
  g.userData = { franja, tope, lados }
  g.traverse(o => { o.renderOrder = 3 })
  g.visible = false
  scene.add(g)
  return g
})()
function pintarAlcance (s) {
  if (!s || !s.spec.range || (s.spec.fija && !s.spec.dispara)) { alcanceSel.visible = false; return }
  const { franja, tope, lados } = alcanceSel.userData
  const ancho = Math.abs(laneX(1) - laneX(0)) * 0.92
  // Hasta donde llega, sin pasar de donde nacen: más allá no hay nada que ver.
  const largo = Math.min(s.spec.range, s.pz - FIELD.spawnZ + 4)
  alcanceSel.visible = true
  alcanceSel.position.set(laneX(s.lane), 0.05, s.pz)
  franja.scale.set(ancho, largo, 1)
  franja.position.set(0, 0, -largo / 2)
  tope.scale.set(ancho, 1, 1)
  tope.position.set(0, 0.01, -largo)
  const r = s.spec.range * FUERA_DE_CARRIL
  lados.scale.set(r, r, 1)
  lados.position.set(0, -0.01, 0)
}
const cajaSel = new THREE.Box3()
let altoSel = { soldado: null, alto: 2 }
function actualizarFlecha (t) {
  if (soldadoEnCamino && (soldadoEnCamino.dead || !soldadoEnCamino.andando)) soldadoEnCamino = null
  const s = arrastre?.soldado ?? moving ?? ui.inspected ?? soldadoEnCamino
  if (!s || s.dead || !running) { flechaSel.visible = false; pintarAlcance(null); return }
  // La altura de la figura se mide una vez por soldado: medirla cada fotograma
  // con sus huesos sería caro, y no cambia.
  if (altoSel.soldado !== s) {
    cajaSel.setFromObject(s.mesh)
    altoSel = { soldado: s, alto: Math.max(1.2, cajaSel.max.y - s.mesh.position.y) }
  }
  flechaSel.visible = true
  pintarAlcance(s === soldadoEnCamino && s !== ui.inspected && s !== arrastre?.soldado ? null : s)
  flechaSel.position.set(s.mesh.position.x, s.mesh.position.y + altoSel.alto + 0.1 + Math.sin(t * 5) * 0.08, s.mesh.position.z)
}

canvas.addEventListener('pointermove', e => {
  if (!arrastre) return
  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  if (!arrastre.activo) {
    if (Math.hypot(px - arrastre.x0, py - arrastre.y0) < UMBRAL_ARRASTRE) return
    arrastre.activo = true
    ui.closeInspector()
    world.setSlotsVisible(true)
  }

  // Se ilumina la casilla libre más cercana al dedo: es a la que irá.
  const c = casillaBajoDedo(e, rect, arrastre.soldado)
  if (c) world.resaltarSlot(c.lane, c.row, true)
})

function soltarArrastre (e) {
  if (!arrastre) return
  const { soldado, activo } = arrastre
  arrastre = null

  if (!activo) {
    // No se movió: era un toque, y un toque sobre un soldado es consultarlo.
    // y se enseñan las casillas: tocando una, va allí andando.
    if (!soldado.dead) { ui.openInspector(soldado, economy.coins); world.setSlotsVisible(true) }
    return
  }

  world.setSlotsVisible(false)
  if (soldado.dead) return

  const c = casillaBajoDedo(e, canvas.getBoundingClientRect(), soldado)
  if (!c) { audio.denied(); return }
  mandarA(soldado, c)
}

canvas.addEventListener('pointerup', soltarArrastre)
// Si el dedo sale del lienzo o el sistema se queda el gesto —una notificación,
// un cambio de aplicación— hay que soltar igual, o el arrastre se queda pegado
// y el siguiente toque en cualquier sitio movería al soldado de antes.
canvas.addEventListener('pointercancel', () => {
  if (arrastre?.activo) world.setSlotsVisible(false)
  arrastre = null
})
canvas.addEventListener('pointerleave', () => {
  if (arrastre?.activo) world.setSlotsVisible(false)
  arrastre = null
})

// ---------------------------------------------------------------------------
// combate
// ---------------------------------------------------------------------------
const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()
const tmpC = new THREE.Vector3()

// Los caídos no se esfuman: se desploman, ruedan un poco y se hunden. Es lo
// que convierte una baja en algo que pasa, en vez de en un objeto que
// desaparece del tablero.
const corpses = []
function dropCorpse (mesh, hint = 0) {
  const tilt = hint || (Math.random() < 0.5 ? -1 : 1)
  corpses.push({ mesh, t: 0, tilt, yaw: (Math.random() - 0.5) * 2.4, y0: mesh.position.y })
}

function updateCorpses (dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i]
    c.t += dt
    const k = Math.min(1, c.t / 0.55)
    const ease = 1 - (1 - k) * (1 - k)              // cae acelerando y frena al tocar
    c.mesh.rotation.x = c.tilt * ease * 1.5
    c.mesh.rotation.y += c.yaw * dt * (1 - k)
    c.mesh.position.y = c.y0 - Math.max(0, c.t - 1.2) * 1.4
    if (c.t > 2.1) { scene.remove(c.mesh); corpses.splice(i, 1) }
  }
}

// A quién le dispara cada uno.
//
// El alcance era una distancia SOLO en z, y encima el objetivo tenía que estar
// en el mismo carril: un fusilero con un huésped a dos metros en el carril de al
// lado se quedaba mirando al frente sin disparar, que es de lo primero que chirría
// cuando lo ves. Ahora el alcance es un radio de verdad y se puede disparar a
// cualquiera que esté dentro.
//
// Pero con eso solo, veinte soldados concentran todo el fuego en el que va más
// adelantado y dejan su propio carril sin cubrir: se gana por acumulación y el
// tablero deja de tener carriles. Así que el carril propio manda — se dispara
// fuera SOLO cuando en el propio no hay nadie a tiro. Nadie se queda quieto
// habiendo blancos, y nadie abandona lo que tiene encima.
// Qué parte del alcance sirve para ayudar a OTRO carril. Está medido, no
// elegido, con el mismo banco de siempre: tres fusileros puestos y ni una moneda
// más gastada en todo el nivel 1.
//
//   solo su carril (como estaba)  · muere en la oleada 4
//   alcance entero fuera          · gana 5/5 con la base al 82%
//   0,35 del alcance              · muere 3 de cada 5 veces, y las que aguanta
//                                   llega a la última oleada con media base
//
// Con el alcance entero, un soldado cubría el tablero de lado a lado y el
// carril dejaba de ser una decisión: se ganaba por acumulación. Con 0,35 cada
// uno sigue cubriendo su carril ENTERO y además lo que tiene cerca a los lados,
// que es lo que se pedía —que no se queden mirando al frente con uno a dos
// metros— sin convertir la línea en una sola masa de fuego.
const FUERA_DE_CARRIL = 0.35

function alcanzables (soldier) {
  const propio = []
  const fuera = []
  const alcance = soldier.spec.range
  const deReojo = alcance * FUERA_DE_CARRIL
  for (const z of zombies) {
    if (z.dead || z.intocable) continue
    const dx = z.mesh.position.x - soldier.px
    const dz = z.z - soldier.pz
    const d = Math.hypot(dx, dz)
    if (d > alcance) continue
    // Los anchos (Coloso y jefe) ocupan tanto que cuentan como propios también
    // desde los carriles de al lado: si no, al jefe solo lo pelea una columna.
    if (Math.abs(z.lane - soldier.lane) <= (z.spec.wide ? 1 : 0)) propio.push(z)
    else if (d <= deReojo) fuera.push(z)
  }
  return propio.length ? propio : fuera
}

function pickTarget (soldier) {
  const cerca = alcanzables(soldier)
  if (!cerca.length) return null

  // Tirador: al más duro, no al más cercano. Con 44 de alcance ve el carril
  // entero, y gastar un disparo de 57 en un Portador de 23 de vida mientras un
  // Coloso avanza por detrás es exactamente lo que no debe hacer.
  if (soldier.spec.buscaDuro) {
    let mejor = cerca[0]
    for (const z of cerca) if (z.maxHp > mejor.maxHp || (z.maxHp === mejor.maxHp && z.z > mejor.z)) mejor = z
    return mejor
  }

  // Mortero: donde más apretados van. Ahora que los huéspedes se estorban y
  // hacen cola, hay corros de verdad que buscar, y una bomba de radio 4,2
  // puesta en el sitio se lleva a seis en vez de a uno.
  if (soldier.spec.buscaCorro) {
    let mejor = null
    let mejorCorro = -1
    for (const z of cerca) {
      let corro = 0
      for (const o of zombies) {
        if (o.dead) continue
        if (o.mesh.position.distanceTo(z.mesh.position) <= soldier.spec.splash) corro += o.maxHp
      }
      // A igualdad de corro, el que va más adelantado.
      if (corro > mejorCorro || (corro === mejorCorro && mejor && z.z > mejor.z)) { mejorCorro = corro; mejor = z }
    }
    return mejor
  }

  let best = null
  for (const z of cerca) if (!best || z.z > best.z) best = z
  return best
}

function splashDamage (center, radius, amount, pierce) {
  for (const z of zombies) {
    if (z.dead || z.intocable) continue
    if (z.mesh.position.distanceTo(center) > radius) continue
    z.hurt(amount, pierce)
  }
}

// El pasillo del misil. Revienta el corro del impacto y sigue por DETRÁS, en
// el mismo carril, con el daño cayendo con la distancia. Es lo que no hace
// nadie más: el Escopetero salpica a los lados y el Mortero en corro.
function danoEnEstela (centro, radio, largo, amount, pierce) {
  for (const z of zombies) {
    if (z.dead || z.intocable) continue
    const p = z.mesh.position
    const cerca = p.distanceTo(centro) <= radio
    // Detrás es hacia -Z: los huéspedes bajan de -Z hacia la base.
    const dz = p.z - centro.z
    const detras = Math.abs(p.x - centro.x) <= radio * 0.85 && dz < 0 && dz > -largo
    if (!cerca && !detras) continue
    z.hurt(amount * (cerca ? 1 : Math.max(0.35, 1 + dz / largo)), pierce)
  }
}

function soldierFire (soldier, target) {
  const spec = soldier.spec
  const from = muzzleWorld(soldier, tmpA)
  const to = tmpB.copy(target.mesh.position).setY(1.0)
  const pierce = spec.armorPierce ?? 0
  soldier.onFire()
  // Cada arma suena en su lado: el campo mide unos doce de ancho.
  audio.shot(spec.arma ?? soldier.key, from.x / 7)

  // Cada arma se ve distinta al disparar, no solo suena distinto.
  if (spec.projectile === 'arrow') {
    effects.arrow(from, to)
  } else if (spec.flame) {
    effects.flame(from, -1, spec.range, soldier.id)
  } else if (spec.misilShot) {
    const impacto = to.clone()
    effects.smoke(from, 3, 0x9a9a9a)
    effects.misil(from, impacto, p => {
      audio.boom()
      effects.burst(p, 0xffd08a, 16, 2.2)
      effects.burst(p, 0x3a3a3a, 10, 1.4)
      marcas.poner(p.x, p.z, 'quemado', spec.splash * 1.2)
      danoEnEstela(p, spec.splash, spec.estela ?? 0, soldier.damage, pierce)
    })
    return   // el daño lo hace la explosión, no el disparo
  } else if (spec.mortarShot) {
    const impact = to.clone()
    effects.smoke(from, 4, 0x8f8f8f)
    effects.mortar(from, impact, p => {
      audio.boom()
      effects.burst(p, 0xffb03a, 14, 1.8)
      effects.burst(p, 0x4a4a4a, 8, 1.1)
      marcas.poner(p.x, p.z, 'quemado', spec.splash * 1.4)
      splashDamage(p, spec.splash, soldier.damage, pierce)
      // Las granadas de Claire son incendiarias: revientan con llamarada y
      // dejan el suelo ardiendo un par de segundos, como el lanzallamas.
      if (spec.brasas) {
        fuego.explosion(p.x, 0, p.z, spec.splash * 0.9)
        brasaEn(spec.brasas, p)
      }
    })
    return   // el daño lo hace la explosión, no el disparo
  } else {
    effects.tracer(from, to)
    effects.shell(ejectorWorld(soldier, tmpC))  // la vaina salta por el costado
    if (Math.random() < 0.4) effects.smoke(from, 1)
  }

  const shots = spec.pellets ?? 1
  target.hurt(soldier.damage * shots, pierce)   // la salpicadura la pone el bucle, al acusar el golpe

  // Arquero: la flecha se queda clavada y el huésped cojea.
  if (spec.clava) target.frenar(spec.clava.factor, spec.clava.dura)

  // Ametrallador: fuego de supresión. Dura poco y se renueva con cada ráfaga,
  // así que lo tiene clavado mientras siga disparándole y arranca en cuanto
  // el ametrallador cambia de objetivo o se pone a recargar.
  if (spec.suprime) target.frenar(spec.suprime.factor, spec.suprime.dura)

  // Escopetero: culatazo. Lo que gana no es daño, es distancia, y contra un
  // Corredor que ya te tiene encima eso vale más que el daño.
  if (spec.empuja) {
    target.mesh.position.z -= spec.empuja
    effects.burst(target.mesh.position, 0xe58227, 4, 0.9)
  }

  // La escopeta salpica a los carriles vecinos: su razón de ser es el desbordamiento.
  if (spec.spread) {
    for (const z of zombies) {
      if (z === target || z.dead) continue
      if (Math.abs(z.lane - soldier.lane) !== 1) continue
      if (z.mesh.position.distanceTo(target.mesh.position) > 3.2) continue
      z.hurt(soldier.damage * 0.5, pierce)
    }
  }

  // Lanzallamas: el asfalto se queda ardiendo donde ha pasado la llamarada.
  // Es lo que convierte al lanzallamas en control de zona y no en otra
  // escopeta cara: sigue cobrando después de dejar de disparar.
  if (spec.brasas) prenderBrasas(soldier, target)

  // Las llamas no apuntan a uno: barren todo lo que haya delante en el carril.
  if (spec.flame) {
    const z0 = soldier.pz
    for (const z of zombies) {
      if (z === target || z.dead || z.lane !== target.lane) continue
      if (z0 - z.z > spec.range || z.z > z0) continue
      z.hurt(soldier.damage, pierce)
      prender(z)
    }
    prender(target)
  }
}

// Temblor de cámara y fogonazo (Isidro, 01/10). El temblor mueve la cámara
// solo mientras se dibuja el fotograma y la devuelve a su sitio después: así no
// se acumula ni pelea con quien la coloque (el vuelo, el asalto). El fogonazo
// es un velo blanco por encima del juego que se apaga en un cuarto de segundo.
let temblorT = 0
let temblorFuerza = 0
const elDestello = document.createElement('div')
elDestello.className = 'destello-bomba'
document.getElementById('app')?.appendChild(elDestello) ?? document.body.appendChild(elDestello)
function temblar (fuerza = 1) {
  temblorT = 0.2 + 0.3 * fuerza
  temblorFuerza = Math.max(temblorFuerza, fuerza)
  if (fuerza >= 0.6) {
    elDestello.style.transition = 'none'
    elDestello.style.opacity = String(0.2 + 0.3 * fuerza)
    elDestello.getBoundingClientRect()
    elDestello.style.transition = 'opacity 0.3s ease-out'
    elDestello.style.opacity = '0'
  }
  if (navigator.vibrate && fuerza >= 0.6) try { navigator.vibrate(30 + 40 * fuerza) } catch {}
}
// Envuelve el dibujado de un fotograma: desplaza la cámara, dibuja y la repone.
const camaraQuieta = new THREE.Vector3()
function conTemblor (dt, dibujar) {
  if (temblorT <= 0) return dibujar()
  temblorT -= dt
  const k = Math.max(0, temblorT) * temblorFuerza * 1.1
  camaraQuieta.copy(camera.position)
  camera.position.x += (Math.random() - 0.5) * k
  camera.position.y += (Math.random() - 0.5) * k * 0.7
  dibujar()
  camera.position.copy(camaraQuieta)
  if (temblorT <= 0) temblorFuerza = 0
}

// Brasas del lanzallamas: manchas de asfalto ardiendo que siguen cobrando
// después de que el soldado deje de disparar. Se reaprovechan de una lista fija
// en vez de crearse y destruirse, porque el lanzallamas dispara seis veces por
// segundo y crear un disco nuevo en cada llamarada llenaba el recolector de
// basura de mallas muertas.
const brasas = []
const BRASA_GEO = new THREE.CircleGeometry(1, 14)

// Un bicho en llamas (Isidro, 01/10): al que toca el fuego le quedan llamas
// encima unos segundos mientras sigue andando. Es solo lo que se ve; el daño
// es el de siempre.
const ARDE = 2.6
function prender (z) {
  if (z.dead) return
  if (!z.llama || z.llama.t >= z.llama.vida) {
    const talla = z.spec.boss ? 3.2 : (z.spec.scale ?? 1)
    z.llama = fuego.llama(z.mesh.position.x, 0, z.mesh.position.z, {
      ancho: 1.1 * talla, alto: 1.9 * talla, dura: ARDE, sigue: z.mesh, sube: 0.5 * talla
    })
  } else z.llama.t = Math.min(z.llama.t, 0.3)
}

function prenderBrasas (soldier, target) {
  brasaEn(soldier.spec.brasas, target.mesh.position)
}

// El lanzallamas prende donde está su objetivo; el napalm, donde cayó la bomba.
// Lo que cambia es el punto, así que el punto es el argumento.
function brasaEn (spec, punto) {
  // Una sola por llamarada, y solo si no hay ya una encendida ahí mismo: sin
  // esto el suelo se cubría de discos superpuestos y el daño se multiplicaba
  // por seis por segundo.
  for (const b of brasas) {
    if (b.t > 0 && Math.abs(b.malla.position.x - punto.x) < 1.2 &&
        Math.abs(b.malla.position.z - punto.z) < 1.2) { b.t = spec.dura; return }
  }

  let brasa = brasas.find(b => b.t <= 0)
  if (!brasa) {
    const malla = new THREE.Mesh(BRASA_GEO, new THREE.MeshBasicMaterial({
      color: 0xff7a2a, transparent: true, opacity: 0, depthWrite: false
    }))
    malla.rotation.x = -Math.PI / 2
    malla.renderOrder = 2
    scene.add(malla)
    brasa = { malla, t: 0, lane: 0 }
    brasas.push(brasa)
  }
  brasa.malla.position.set(punto.x, 0.05, punto.z)
  brasa.malla.scale.setScalar(spec.radio)
  brasa.malla.visible = true
  brasa.t = spec.dura
  brasa.dura = spec.dura
  brasa.daño = spec.daño
  brasa.radio = spec.radio
  // Las llamas de encima: unas cuantas repartidas por la mancha, más altas en
  // el napalm (`alto`) que en el rastro del lanzallamas.
  brasa.alto = spec.alto ?? 1.5
  brasa.llamas = []
  const cuantas = Math.max(2, Math.round(spec.radio * 1.3))
  for (let i = 0; i < cuantas; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * spec.radio * 0.8
    brasa.llamas.push(fuego.llama(punto.x + Math.cos(a) * r, 0, punto.z + Math.sin(a) * r, {
      ancho: brasa.alto * (0.55 + Math.random() * 0.25), alto: brasa.alto * (0.8 + Math.random() * 0.5), dura: 1.2
    }))
  }
}

function updateBrasas (dt) {
  for (const b of brasas) {
    if (b.t <= 0) continue
    b.t -= dt
    if (b.t <= 0) { b.malla.visible = false; continue }
    // Late y se va apagando. Con las llamas encima, el disco es solo el
    // resplandor del suelo: mucho más tenue que cuando era todo el fuego.
    const k = b.t / b.dura
    b.malla.material.opacity = 0.08 + k * 0.2 + Math.sin(b.t * 11) * 0.04
    // Las llamas duran lo que la brasa: se reavivan mientras quede, y al final
    // se dejan apagar solas.
    if (b.t > 0.5) for (const l of b.llamas) if (l.t > 0.6) l.t = 0.3
    b.malla.scale.setScalar(b.radio * (0.9 + k * 0.15))
    for (const z of zombies) {
      if (z.dead) continue
      const dx = z.mesh.position.x - b.malla.position.x
      const dz = z.mesh.position.z - b.malla.position.z
      if (dx * dx + dz * dz > b.radio * b.radio) continue
      // El fuego ignora el blindaje: es lo que hace del lanzallamas la respuesta
      // a los Encostrados y lo que justifica sus doscientas de biomasa.
      z.hurt(b.daño * dt, 1)
      prender(z)
    }
    if (Math.random() < dt * 9) effects.smoke(b.malla.position, 1, 0x3a3632)
  }
}

// Erizos checos: el bicho que está entre ellos va frenado, y cada uno que pasa
// los gasta un poco (una fracción de lo que muerde por segundo).
function erizosAl (z, dt) {
  if (z.intocable) return
  for (const s of soldiers) {
    const f = s.spec.frena
    if (!f || s.dead || s.lane !== z.lane) continue
    if (Math.abs(z.z - s.pz) > 1.4) continue
    z.frenar(f.factor, 0.25)
    s.hurt(z.spec.damage * (z.spec.attackRate ?? 1) * f.desgaste * dt)
  }
}

function blockerAhead (zombie) {
  // Bajo tierra o en el aire no hay nada que le pare.
  if (zombie.intocable) return null
  // El soldado vivo más cercano por delante en su carril.
  let best = null
  for (const s of soldiers) {
    if (s.dead || s.lane !== zombie.lane) continue
    // Los erizos no paran: se pasa entre ellos (frenan aparte, ver `erizosAl`).
    if (s.spec.paso) continue
    if (s.pz <= zombie.z) continue
    if (!best || s.pz < best.pz) best = s
  }
  return best
}

// --- la entrada del jefe -----------------------------------------------------
//
// LA MADRE salía como un huésped más, solo que grande: mismo paso, mismo aviso.
// Ahora la tierra se abre en una onda a sus pies y le queda un halo pegado
// debajo mientras vive, así que en una pantalla llena se sabe dónde está sin
// buscarla.
const ondasJefe = []

function entradaJefe (z) {
  const p = z.mesh.position
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 1.1, 40),
    new THREE.MeshBasicMaterial({ color: 0x8fffc4, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  )
  anillo.rotation.x = -Math.PI / 2
  anillo.position.set(p.x, 0.07, p.z)
  scene.add(anillo)
  ondasJefe.push({ malla: anillo, t: 0 })
  effects.burst(p, 0x8fbf4a, 26, 2.6)
  effects.smoke(p, 6, 0x6b7a4a)

  // El halo va DENTRO de la figura, que ya viene escalada: el radio se divide
  // por su escala o al Coloso le quedaría un plato de quince metros.
  const k = z.spec.scale ?? 1
  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(1.45 / k, 28),
    new THREE.MeshBasicMaterial({ color: 0x7dff9e, transparent: true, opacity: 0.22, depthWrite: false })
  )
  aura.rotation.x = -Math.PI / 2
  aura.position.y = 0.05 / k
  aura.renderOrder = 1
  z.mesh.add(aura)
  z.aura = aura
}

function actualizarJefes (dt, t) {
  for (let i = ondasJefe.length - 1; i >= 0; i--) {
    const o = ondasJefe[i]
    o.t += dt
    const k = o.t / 1.4
    o.malla.scale.setScalar(1 + k * 6)
    o.malla.material.opacity = Math.max(0, 0.85 * (1 - k))
    if (k >= 1) { scene.remove(o.malla); o.malla.geometry.dispose(); o.malla.material.dispose(); ondasJefe.splice(i, 1) }
  }
  for (const z of zombies) {
    if (!z.aura) continue
    z.aura.material.opacity = 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3.4))
  }
}

function killZombie (z, index) {
  zombies.splice(index, 1)
  // El suelo que rompió el Escarbador se recupera ahora, despacio.
  z.rastro?.cerrar()
  if (dueloEnCurso) {
    duelo.alMatar(z.spec)
    // El público de la arena lo celebra; más cuanto más gordo era el bicho.
    world.vitorear(Math.min(1, 0.15 + (z.spec.coins ?? 10) / 120))
  }

  // Revientaesporas: al caer se lleva por delante lo que tenga cerca. Es el
  // único enemigo que castiga apilar tropa en un carril, y por eso el daño va a
  // los SOLDADOS y no a los suyos: reventar contra su propia horda no enseñaría
  // nada al jugador.
  if (z.spec.revienta) {
    const { daño, radio } = z.spec.revienta
    effects.burst(z.mesh.position, 0xffd24a, 26, radio * 0.9)
    effects.burst(z.mesh.position, 0x8a7a2a, 14, radio * 0.6)
    audio.boom()
    for (const s of soldiers) {
      if (s.dead) continue
      const dx = s.px - z.mesh.position.x
      const dz = s.pz - z.mesh.position.z
      const d = Math.hypot(dx, dz)
      if (d > radio) continue
      // Menos daño cuanto más lejos: separar la línea un metro tiene que servir
      // de algo, o el castigo es inevitable y deja de ser una decisión.
      s.hurt(daño * (1 - d / radio * 0.55))
    }
  }
  z.bar.group.visible = false
  // El charco que deja al caer. Se borra solo a los pocos segundos: ver por
  // dónde han caído ayuda, tener el asfalto alfombrado de manchas, no.
  if (!z.bajoTierra) marcas.poner(z.mesh.position.x, z.mesh.position.z, 'icor', 1.1 * (z.spec.scale ?? 1))
  dropCorpse(z.mesh, -1)          // cae de espaldas, hacia donde venía
  economy.drop(z.mesh.position, Math.max(1, Math.round(z.spec.coins * ECONOMY.botinHuesped)))
  effects.burst(z.mesh.position, 0x8fbf4a, z.spec.boss ? 30 : 8, z.spec.boss ? 2.4 : 1)
  audio.groan(z.spec.boss || (z.spec.scale ?? 1) > 1.5)
  if (z.spec.boss) ui.banner('NIDO PURGADO')
}

// Los huéspedes ocupan sitio: si dos se pisan, se apartan. Antes se atravesaban
// y una oleada entera cabía en el mismo metro cuadrado, así que doce enemigos
// se leían como uno. Ahora el que va delante frena a los de atrás y se forma
// cola, que es lo que hace que una horda parezca una horda.
//
// Es O(n²), pero n nunca pasa de treinta: unos cuatrocientos pares por
// fotograma, nada al lado de dibujarlos.
function separarHuespedes () {
  for (let i = 0; i < zombies.length; i++) {
    const a = zombies[i]
    if (a.dead || a.intocable) continue
    const ra = 0.45 * (a.spec.scale ?? 1)
    // El peso va con el cuadrado del tamaño: al Coloso se le aparta uno, no al revés.
    const ma = ra * ra

    for (let j = i + 1; j < zombies.length; j++) {
      const b = zombies[j]
      if (b.dead || b.intocable) continue
      const rb = 0.45 * (b.spec.scale ?? 1)
      const min = ra + rb
      let dx = b.mesh.position.x - a.mesh.position.x
      let dz = b.mesh.position.z - a.mesh.position.z
      const d2 = dx * dx + dz * dz
      if (d2 >= min * min) continue

      const mb = rb * rb
      let d = Math.sqrt(d2)
      if (d < 1e-4) {
        // Exactamente encima: se les da un empujón lateral cualquiera, porque
        // sin dirección la normalización daría NaN y perderíamos a los dos.
        dx = Math.random() - 0.5
        dz = Math.random() - 0.5
        d = Math.hypot(dx, dz) || 1
      }
      const empuje = (min - d) * 0.5
      const ux = (dx / d) * empuje
      const uz = (dz / d) * empuje
      const total = ma + mb
      a.mesh.position.x -= ux * (2 * mb / total)
      a.mesh.position.z -= uz * (2 * mb / total)
      b.mesh.position.x += ux * (2 * ma / total)
      b.mesh.position.z += uz * (2 * ma / total)
    }

    // Que se aparten no significa que puedan cambiarse de carril: la puntería,
    // el lanzallamas y la escopeta razonan por carriles, y un huésped a dos
    // carriles de donde dice estar rompe todo eso.
    // El centro lleva el desvío de la ruina del Coliseo: sin él, este tope
    // devolvía al carril a los que se abrían para rodearla y la atravesaban
    // (el desvío se calculaba, pero se quedaban a 1,2 del centro en vez de a 4).
    const centro = laneX(a.lane) + (a.desvioRuina ?? 0)
    const margen = FIELD.laneWidth * 0.5
    a.mesh.position.x = Math.min(centro + margen, Math.max(centro - margen, a.mesh.position.x))
  }
}

function damageBase (amount) {
  baseHp = Math.max(0, baseHp - amount)
  ui.setBase(baseHp / BASE.hp)
  vibrar(40)
  audio.thud()
  if (baseHp <= 0) lose()
}

// ---------------------------------------------------------------------------
// bucle
// ---------------------------------------------------------------------------
let last = performance.now()

// Lo que pisa un huésped: la plancha de la nave en campaña, los escalones del
// graderío en la arena. Las dos devuelven cero donde no hay nada, así que se
// puede preguntar siempre sin comprobar en qué modo estamos.
function alturaBajoElPie (z) {
  // El hueco (el túnel de París) se SUMA: es negativo, y con el máximo de los
  // otros dos, que valen cero fuera de la rampa y la grada, se perdería.
  return Math.max(dropship.alturaRampa(z.z), world.alturaGrada(z.mesh.position.x, z.mesh.position.z)) +
    world.alturaHueco(z.mesh.position.x, z.mesh.position.z)
}

function simulate (dt) {
  // En pausa no avanza NADA: ni la horda, ni los efectos, ni la nave. Congelar
  // solo la partida y dejar el humo subiendo se lee como que el juego se ha
  // colgado, no como una pausa.
  if (pausado) return
  if (vuelo) { actualizarVuelo(dt); return }
  // De invitado no se simula: se pinta lo que manda el anfitrión.
  if (running && modoInvitado()) { pintarPartidaRemota(dt); return }
  // La arena se carga sola y tarda un momento; en cuanto está, se sabe dónde
  // queda su escalón más alto y ahí es donde tienen que nacer. Se comprueba en
  // el bucle porque el modelo puede llegar después de empezar la partida.
  if (dueloEnCurso) {
    // Nacen justo DELANTE de la cima, nunca detrás: al otro lado del borde ya
    // no hay por dónde bajar.
    const cima = world.cimaGrada()
    if (cima != null && FIELD.entradaZ !== cima + FIELD.entradaAncho) FIELD.entradaZ = cima + FIELD.entradaAncho
  }

  if (running) {
    if (economy.update(dt)) audio.coin()
    director.update(dt, zombies.length)
    if (dueloEnCurso) duelo.tic(dt)

    // El ánimo del Capitán: su carril y los de al lado disparan más rápido. Se
    // recalcula cada fotograma porque los soldados se mueven de casilla y él
    // también; guardarlo al colocar dejaría carriles animados por un capitán
    // que ya se fue.
    for (const s of soldiers) s.animo = 1
    for (const jefe of soldiers) {
      const aura = jefe.spec.anima
      if (!aura || jefe.dead || jefe.andando) continue
      for (const s of soldiers) {
        if (s === jefe || Math.abs(s.lane - jefe.lane) > aura.carriles) continue
        s.animo = Math.max(s.animo, aura.factor)
      }
    }
    // La cura de Rebecca: mientras esté en su casilla, los soldados de su carril
    // y de los de al lado (ella incluida) recuperan vida poco a poco. A las
    // barreras no: una pared de sacos que se cura sola no se rompería nunca.
    for (const medica of soldiers) {
      const sana = medica.spec.sana
      if (!sana || medica.dead || medica.andando) continue
      for (const s of soldiers) {
        if (s.dead || s.spec.fija || s.hp >= s.maxHp || Math.abs(s.lane - medica.lane) > sana.carriles) continue
        s.hp = Math.min(s.maxHp, s.hp + sana.porSegundo * dt)
        s.bar.set(s.hp / s.maxHp)
        if (Math.random() < dt * 1.4) effects.burst(tmpB.copy(s.mesh.position).setY(1.4), 0x9dffb8, 2, 0.5)
      }
    }

    for (let i = soldiers.length - 1; i >= 0; i--) {
      const s = soldiers[i]
      s.update(dt, camera)
      if (s.dead) {
        soldiers.splice(i, 1)
        occupied.delete(slotKey(s.lane, s.row))
        s.bar.group.visible = false
        dropCorpse(s.mesh, 1)          // cae hacia delante, sobre lo que le mordía
        effects.burst(s.mesh.position, 0xd8d8d8, 6, 1)
        if (ui.inspected === s) ui.closeInspector()
        continue
      }
      if (!s.canShoot) continue
      // Se busca objetivo cada fotograma aunque no toque disparar: es lo que
      // decide si el soldado está encarado o con el arma baja.
      const target = pickTarget(s)
      s.hasTarget = !!target
      s.targetPos = target ? target.mesh.position : null

      // Fusilero: se asienta. Mientras siga con el mismo delante, va cogiendo
      // el punto y dispara más rápido; en cuanto cambia de objetivo, vuelve a
      // empezar. Premia la línea estable, que es justo lo que un fusilero es.
      if (s.spec.asienta) {
        if (target && target.id === s.mismoObjetivo) {
          s.asiento = Math.min(s.spec.asienta.tope, s.asiento + dt * s.spec.asienta.porSegundo)
        } else {
          s.mismoObjetivo = target ? target.id : null
          s.asiento = 0
        }
      }
      s.cooldown -= dt
      if (s.cooldown <= 0) {
        if (target && !s.busy) {
          soldierFire(s, target)
          s.cooldown = 1 / (s.fireRate * (1 + (s.asiento ?? 0)))
        } else {
          s.cooldown = 0.05
        }
      }
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i]
      if (z.dead) { killZombie(z, i); continue }

      presion[z.lane] += dt * (z.spec.boss ? 4 : 1)

      // Cartel con lo encajado desde el último aviso. Junto con la barra de vida
      // es lo que dice si un huésped se está muriendo o si le estás haciendo
      // cosquillas, que con un Encostrado es justo la diferencia que hay que ver.
      z.tDaño -= dt
      if (z.dañoAcumulado >= 1 && z.tDaño <= 0) {
        // Un poco más abajo y a un lado: a la altura por defecto el cartel
        // salía justo encima de la barra de vida y se tapaban entre ellos.
        tmpA.copy(z.mesh.position)
        tmpA.x += 0.5
        tmpA.y -= 0.75
        effects.floatText(tmpA, `-${Math.round(z.dañoAcumulado)}`, '#ffe08a', 58)
        z.dañoAcumulado = 0
        z.tDaño = 0.34
      }

      // --- Escarbador: baja de la nave, cava, viaja hundido y sale detrás -----
      // Todo se ve: se enrosca hacia abajo abriendo un agujero, un bulto de
      // tierra avanza dejando un surco agrietado, y al llegar el suelo tiembla,
      // se abre, asoma el taladro y trepa fuera. Un enemigo que aparece de la
      // nada se lee como un fallo, no como una mecánica. La tierra que salta es
      // del color del suelo de la misión.
      if (z.cavar) {
        const c = z.cavar
        const pos = z.mesh.position
        if (c.estado === 'llegar') {
          pos.z += z.velocidad * dt
          c.andado += z.velocidad * dt
          z.suelo = alturaBajoElPie(z)
          z.update(dt, camera, true)
          // Ya en suelo firme, anda su trecho (distinto cada vez) y se pone a cavar.
          c.tocable = z.suelo <= 0.001
          // Si viene del fondo de la niebla (Milán), su trecho empieza a contar
          // al salir de ella: si no, cavaba dentro de la galería, donde no se ve.
          const aLaVista = !FIELD.prisa || pos.z > FIELD.prisa.hasta
          if (c.tocable && aLaVista) c.enSuelo = (c.enSuelo ?? 0) + z.velocidad * dt
          if (c.tocable && c.enSuelo > c.meta) {
            c.tocable = false
            c.estado = 'cavando'
            c.t = 0
            z.rastro = grietas.crear()
            z.rastro.agujero(pos.x, pos.z, 0.8)
            audio.thud()
          }
          continue
        }
        if (c.estado === 'cavando') {
          c.t += dt
          const k = Math.min(1, c.t / 1)
          z.update(dt, camera, false)   // brazos escarbando
          // Se enrosca hacia abajo con el taladro por delante.
          pos.y = -2.2 * k * k
          z.mesh.rotation.y = Math.PI + k * k * Math.PI * 4
          if (Math.random() < dt * 30) effects.burst(tmpB.set(pos.x, 0.15, pos.z), grietas.colorSuelo(), 2, 0.9)
          if (k >= 1) {
            c.estado = 'tunel'
            z.bajoTierra = true
            z.mesh.rotation.y = Math.PI
            c.ultimoZ = pos.z
          }
          continue
        }
        if (c.estado === 'tunel') {
          pos.z += z.velocidad * dt
          pos.y = -2.2
          z.bar.face(camera, dt)
          z.rastro.bulto(pos.x, pos.z)
          if (pos.z - c.ultimoZ > 0.55) { z.rastro.tramo(pos.x, pos.z - 0.3); c.ultimoZ = pos.z }
          if (Math.random() < dt * 14) effects.burst(tmpB.set(pos.x, 0.15, pos.z), grietas.colorSuelo(), 2, 0.5)
          if (z.z >= c.hasta) {
            c.estado = 'saliendo'
            c.t = 0
            z.rastro.quitarBulto()
            z.rastro.agujero(pos.x, pos.z, 1.0)
            z.rastro.crecer(0)
          }
          continue
        }
        // Saliendo: tiembla y se agrieta, asoma el taladro girando, trepa fuera.
        c.t += dt
        const t = c.t
        if (t < 0.45) {
          z.rastro.crecer(t / 0.45)
          pos.x += Math.sin(t * 90) * 0.004
          if (Math.random() < dt * 24) effects.burst(tmpB.set(pos.x + (Math.random() - 0.5) * 1.4, 0.1, pos.z + (Math.random() - 0.5) * 1.4), grietas.colorSuelo(), 1, 0.5)
          continue
        }
        if (z.bajoTierra) {
          z.bajoTierra = false
          z.rastro.crecer(1)
          effects.burst(tmpB.set(pos.x, 0.2, pos.z), grietas.colorSuelo(), 14, 1.4)
          audio.thud()
        }
        z.update(dt, camera, false)   // brazos trepando
        if (t < 0.75) {
          pos.y = -2.2 + 1.3 * ((t - 0.45) / 0.3)
          z.mesh.rotation.y = Math.PI + Math.sin(t * 45) * 0.35
        } else {
          const k = Math.min(1, (t - 0.75) / 0.45)
          pos.y = -0.9 * (1 - k) * (1 - k)
          // Se sacude la tierra al acabar de salir.
          z.mesh.rotation.y = Math.PI + Math.sin(t * 30) * 0.3 * (1 - k)
          if (k >= 1) {
            pos.y = 0
            z.mesh.rotation.y = Math.PI
            z.cavar = null
            effects.burst(pos, grietas.colorSuelo(), 10, 1.2)
          }
        }
        continue
      }

      // --- Saltador: por encima de la barrera -------------------------------
      if (z.salto) {
        const s2 = z.salto
        s2.t += dt
        const k = Math.min(1, s2.t / s2.dur)
        z.mesh.position.z = s2.z0 + (s2.z1 - s2.z0) * k
        // Parábola: sube y baja. Sin la altura se leía como un teletransporte.
        z.mesh.position.y = Math.sin(k * Math.PI) * (s2.alto ?? 2.6)
        z.mesh.rotation.x = -Math.sin(k * Math.PI) * 0.5
        if (k >= 1) {
          z.salto = null
          z.mesh.position.y = 0
          z.mesh.rotation.x = 0
          // El brinco de camino levanta polvo; el salto de verdad, su destello.
          if (s2.libre) effects.burst(z.mesh.position, grietas.colorSuelo(), 4, 0.6)
          else effects.burst(z.mesh.position, 0x7dffe4, 8, 1.1)
        }
        z.bar.face(camera, dt)
        continue
      }

      // La ruina del Coliseo: los demás la rodean (zombie.js); el Saltador la
      // SALTA (Isidro: «el saltador no la salta»). Un salto más largo y más alto
      // que el de las barreras, sin gastar su recarga: no le está saltando a nadie.
      const ruina = FIELD.ruina
      if (ruina && z.spec.salta && !z.saltoRuina && Math.abs(z.xCarril - ruina.x) < ruina.radio &&
          z.mesh.position.z < ruina.z && ruina.z - z.mesh.position.z < ruina.radio + 1.5) {
        z.saltoRuina = true
        z.salto = { t: 0, dur: 1.0, z0: z.mesh.position.z, z1: ruina.z + ruina.radio + 1.5, alto: 4.4 }
        effects.burst(z.mesh.position, 0x7dffe4, 10, 1.3)
        continue
      }

      erizosAl(z, dt)
      const blocker = blockerAhead(z)
      const reach = (z.spec.rangedAttack ?? 1.1) + (z.spec.scale ?? 1) * 0.35
      const gap = blocker ? blocker.pz - z.z : Infinity
      const attacking = !!blocker && gap <= reach

      // Antes de morder, el Saltador prueba a saltárselo. Con recarga: si
      // pudiera saltar siempre, ninguna barrera valdría nada nunca.
      if (z.spec.salta) {
        z.saltoCd -= dt
        if (attacking && z.saltoCd <= 0) {
          z.saltoCd = z.spec.salta.recarga
          z.salto = { t: 0, dur: 0.62, z0: z.mesh.position.z, z1: z.mesh.position.z + z.spec.salta.distancia }
          effects.burst(z.mesh.position, 0x7dffe4, 10, 1.3)
          continue
        }
        // Y de camino avanza A BRINCOS. Isidro: «el personaje nunca salta». Saltar
        // solo saltaba al ir a morder una barrera con la recarga lista: si lo
        // mataban antes o no tenía a nadie delante, no se le veía saltar jamás y
        // era un Corredor más. Estos brincos son solo su forma de andar: mientras
        // dura uno se le puede disparar igual (`libre`), tarda lo mismo que
        // corriendo ese trecho y nunca pasa por encima de nadie: acaba antes de
        // la barrera, de la ruina y de la línea de la base.
        if (!attacking && !z.suelo && (!FIELD.prisa || z.mesh.position.z > FIELD.prisa.hasta)) {
          z.brincoCd = (z.brincoCd ?? 0.6 + Math.random() * 1.6) - dt
          if (z.brincoCd <= 0) {
            const z0 = z.mesh.position.z
            let tope = Math.min(blocker ? blocker.pz - reach - 0.3 : Infinity, FIELD.baseZ - 0.6)
            if (ruina && !z.saltoRuina && z0 < ruina.z && Math.abs(z.xCarril - ruina.x) < ruina.radio) tope = Math.min(tope, ruina.z - ruina.radio - 1.4)
            const largo = Math.min(z.spec.salta.brinco ?? 4.4, tope - z0)
            if (largo >= 2.4) {
              z.brincoCd = 2.2 + Math.random() * 1.2
              z.salto = { t: 0, dur: Math.min(1.6, largo / z.velocidad), z0, z1: z0 + largo, alto: 0.5 + largo * 0.3, libre: true }
              continue
            }
            z.brincoCd = 0.35
          }
        }
      }

      // --- Injertadora: cose a los de alrededor ------------------------------
      if (z.spec.injerta) {
        z.tInjerto -= dt
        if (z.tInjerto <= 0) {
          z.tInjerto = z.spec.injerta.cada
          let cosidos = 0
          for (const o of zombies) {
            if (o === z || o.dead || o.intocable) continue
            if (o.mesh.position.distanceTo(z.mesh.position) > z.spec.injerta.radio) continue
            if (o.curar(z.spec.injerta.cura) > 0) {
              cosidos++
              effects.burst(o.mesh.position, 0x9dffb8, 3, 0.8)
            }
          }
          // El hilo solo se ve si ha curado a alguien: si no, la Injertadora
          // parecía estar haciendo algo constantemente y no se entendía cuándo.
          if (cosidos) effects.burst(z.mesh.position, 0xe86fa8, 5, 1.2)
        }
      }

      z.suelo = alturaBajoElPie(z)
      z.update(dt, camera, !attacking)

      // La salpicadura del golpe, venga de donde venga: de un disparo, del
      // fuego, de una granada o de las púas de un saco terrero. Va aquí y no en
      // cada arma para que todas se vean igual de contundentes.
      if (z.golpeNuevo) {
        z.golpeNuevo = false
        const alto = 0.55 + (z.spec.scale ?? 1) * 0.5
        effects.burst(tmpB.set(z.mesh.position.x, alto, z.mesh.position.z),
          0xc0402f, 2 + Math.round(z.golpeFuerza * 5), 0.5 + z.golpeFuerza * 0.7)
      }

      if (attacking) {
        // Se planta a distancia de mordisco y ahí se queda. Sin este tope, la
        // cola que empuja por detrás acababa colando al de delante AL OTRO LADO
        // del soldado, y desde allí ya nadie le bloqueaba el paso a la base.
        z.mesh.position.z = Math.min(z.mesh.position.z, blocker.pz - reach)
        z.attackCd -= dt
        if (z.attackCd <= 0) {
          z.attackCd = 1 / z.spec.attackRate
          blocker.hurt(z.spec.damage)
          // La carga enterrada no muere: detona. Se mira DESPUÉS del mordisco,
          // que es cuando puede haber bajado a cero, y antes de que el bucle la
          // retire — si no, se la llevaría la limpieza sin haber estallado.
          if (blocker.spec.revienta && blocker.hp <= 0 && !blocker.detonada) {
            blocker.detonada = true
            const { radio } = blocker.spec.revienta
            splashDamage(blocker.mesh.position, radio, blocker.reventon, 1)
            effects.burst(blocker.mesh.position, 0xffb03a, 22, 2.4)
            audio.boom()
          }
          // La alambrada devuelve parte del mordisco: no dispara, pero desangra.
          if (blocker.spec.thorns) {
            z.hurt(blocker.espinas, 0.5)
            effects.burst(z.mesh.position, 0x9c2f24, 2, 0.5)
          }
          effects.burst(blocker.mesh.position, z.spec.rangedAttack ? 0xa05fb8 : 0xd8d8d8, 3, 0.6)
          if (z.spec.rangedAttack) {
            effects.tracer(z.mesh.position.clone().setY(1.2), blocker.mesh.position.clone().setY(1))
          }
        }
      } else {
        z.mesh.position.z += z.velocidad * dt
        if (z.z >= FIELD.baseZ) {
          damageBase(z.spec.damage)
          effects.floatText(z.mesh.position, `-${z.spec.damage}`, '#ff5a4d', 56)
          z.rastro?.cerrar()
          scene.remove(z.mesh)
          zombies.splice(i, 1)
        }
      }
    }

    // La memoria se descuenta siempre, haya horda o no: lo que importa es por
    // dónde han bajado ÚLTIMAMENTE, no el total histórico.
    for (let l = 0; l < FIELD.lanes; l++) presion[l] *= Math.max(0, 1 - dt * 0.06)

    separarHuespedes()

    // En duelo, además, aprieta con el reloj: Isidro echaba en falta que la
    // música se pusiera seria en los últimos minutos.  va de 0
    // a 1 según lo que queda para la muerte súbita.
    audio.setIntensity(Math.min(1,
      zombies.length / 14 + (1 - baseHp / BASE.hp) * 0.6 +
      (dueloEnCurso ? duelo.tension() * 0.55 : 0)))

    // De anfitrión, la foto del campo para el invitado. Va al final del turno,
    // con todo ya movido: mandarla a medias enseñaría medio fotograma viejo.
    if (coop?.esAnfitrion) {
      coop.latir({ zombies, soldiers, baseHp, oleada: director.wave, total: director.total, dinero: economy.coins })
    }
  }

  if (asalto) actualizarAsalto(dt)
  effects.update(dt)
  grietas.update(dt)
  marcas.update(dt)
  actualizarJefes(dt, performance.now() / 1000)
  golpes.update(dt)
  fuego.update(dt)
  // Las recargas del apoyo corren con la partida (en pausa no).
  if (running) {
    for (const [clave, r] of recargas) {
      r.resto = Math.max(0, r.resto - dt)
      ui.setRecarga(clave, r.resto, r.total)
      if (r.resto <= 0) recargas.delete(clave)
    }
  }
  updateCorpses(dt)
  if (running) updateBrasas(dt)
  ambient.update(dt)
  world.animarArena(dt)
  // Fuera del bloque de partida en curso: al perder, la nave tiene que poder
  // terminar de irse en vez de quedarse congelada sobre la carretera.
  dropship.update(dt)
}

// --- vuelo de presentación ---------------------------------------------------------
// Al llegar a una misión la cámara empieza junto al monumento, lo rodea despacio
// y vuela hasta su sitio de juego. En la partida el monumento se ve a medias
// —en vertical no cabe más—, así que este es el momento de verlo entero. Un
// toque lo salta, y mientras dura la partida no avanza.
let vuelo = null
const VUELO = 3.4
// El plano de un sitio, la primera vez que se entra y las siguientes. Isidro lo
// eligió así para Madrid —«entero la primera vez, corto después»— y vale igual
// para los otros cuarenta: la primera vez quieres ver dónde estás, y al tercer
// intento del mismo nivel lo que quieres es jugar.
const LUGAR_ENTERO = 5
const LUGAR_CORTO = 2.4
const LUGARES_VISTOS = 'alienz-lugares-vistos-v1'
function yaVisto (clave) {
  if (!clave) return false
  try {
    const lista = JSON.parse(localStorage.getItem(LUGARES_VISTOS) ?? '[]')
    if (!Array.isArray(lista)) return false
    if (lista.includes(clave)) return true
    lista.push(clave)
    // Sin tope: son cuarenta y una claves cortas, no llega a un kilobyte.
    localStorage.setItem(LUGARES_VISTOS, JSON.stringify(lista))
  } catch { /* modo privado: siempre entero, que tampoco pasa nada */ }
  return false
}
// La llegada en helicóptero dura algo más: hay que ver el paisaje pasar por la
// puerta antes de posarse, y en 3,4 s no daba tiempo a leer que vas dentro.
const VUELO_HELI = 4.4
let cabinaHeli = null
const tmpVueloMira = new THREE.Vector3()
const suave = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2

function empezarVuelo () {
  // Dos tramos llegan de forma distinta, y solo dos: el helicóptero estaba
  // puesto en trece y a Isidro le sobraba en todos menos en el puente de
  // Vladivostok. El resto vuelven al sobrevuelo del monumento de siempre.
  const llegada = nivelActivo().llegada
  if (llegada === 'helicoptero') return empezarLlegadaHeli()
  if (LLEGADAS[llegada]) return empezarLlegadaEstadio(LLEGADAS[llegada])
  const foco = world.focoMonumento()
  if (!foco || foco.isEmpty()) return
  world.resize()
  const centro = foco.getCenter(new THREE.Vector3())
  const tam = foco.getSize(new THREE.Vector3())
  vuelo = {
    t: 0,
    fin: { pos: camera.position.clone(), rot: camera.quaternion.clone() },
    centro,
    alto: tam.y,
    // Siempre por encima del monumento. Con la altura sacada solo de lo alto, en
    // uno bajo y ancho como el Coliseo la cámara pasaba rozando el muro.
    altura: Math.max(8, tam.y * 0.55, Math.max(tam.x, tam.z) * 0.4),
    lado: Math.sign(centro.x) || 1,
    distancia: Math.max(tam.x, tam.y, tam.z) * 1.3 + 6,
    // Algunos monumentos piden su ángulo (el Bernabéu, desde arriba de la avenida).
    vista: world.vistaMonumento()
  }
  // Los tramos que se juegan en un sitio de verdad tienen su propio plano por el
  // eje de la calle, y ese necesita más tiempo: Isidro, «antes se veía la ciudad
  // y luego la batalla, ahora va directo a la batalla». Con 3,4 s repartidos a
  // medias no daba tiempo a mirar nada, porque desde la mitad la cámara ya se
  // está fundiendo con la posición de juego.
  vuelo.dura = vuelo.vista
    ? (yaVisto(nivelActivo().escenario) ? LUGAR_CORTO : LUGAR_ENTERO)
    : VUELO
  // Una vista que mira de lejos (el Duomo de Milán, de frente, a 125) trae su
  // niebla: la del juego se lo comería. Se abre aquí, se va cerrando mientras
  // la cámara baja al campo y `terminarVuelo` deja la de siempre.
  if (vuelo.vista?.niebla && scene.fog) {
    vuelo.niebla = { cerca: scene.fog.near, lejos: scene.fog.far }
    vuelo.lente = { cerca: camera.near, lejos: camera.far }
    camera.far = Math.max(camera.far, vuelo.vista.niebla.lejos + 60)
    camera.updateProjectionMatrix()
  }
  ui.banner(nivelActivo().name.toUpperCase())
  ui.rotulo(nivelActivo().name.toUpperCase(), nivelActivo().lugar, vuelo.dura)
  actualizarVuelo(0)
}

// --- llegada al estadio ------------------------------------------------------
//
// Isidro: «quiero que se vea la ciudad con edificios y que entre la cámara por
// el hueco que hay en el estadio, que la cámara venga volando y entre hasta la
// pantalla de juego».
//
// Un plano solo, de lejos a dentro, en cuatro tiempos: la ciudad entera con el
// estadio en medio, la caída por encima de las manzanas, el roce sobre el techo
// y la entrada por el hueco hasta la posición de juego.
//
// Los números salen del modelo (`herramientas/blender/lugar_madrid.py`):
//
//   · la piel de lamas es un rectángulo redondeado de 144 x 192 y llega a
//     y = 36; la cubierta sube a 39,5 y las vigas de la retráctil a 40,6;
//   · el hueco del techo va de x = -24 a x = 24 y de z = 10 a z = -62, con el
//     videomarcador y los focos colgando de su borde hasta y = 27,8;
//   · el graderío de dentro remata en y = 35.
//
// Por eso la entrada baja a plomo por el centro del hueco. Comprobado lanzando
// un rayo entre cada dos puntos del recorrido: cero cruces con el nivel.
// Isidro, 02/10: «la cámara inicial debería verse desde más lejos, porque nada
// más iniciar atraviesa el estadio y no se entiende nada; que se vea el estadio
// desde fuera y que dure más». Lo que veía era la versión corta: empezaba ya
// encima del techo y entraba en dos segundos. Ahora la primera vez son 9 s y
// las siguientes 5,5, y las dos empiezan FUERA, con el estadio entero a la vista.
const ESTADIO_PLANOS = [
  // El primero no está puesto a ojo: probando las ocho esquinas de la caja del
  // estadio contra la pantalla del móvil, desde aquí ocupa el 86 % del ancho y
  // queda centrado, con sitio de sobra arriba y abajo para que se vea la ciudad.
  // Desde el sur, alto, con la Castellana subiendo a la izquierda hasta las
  // Cuatro Torres: es la foto aérea de siempre del Bernabéu.
  { k: 0, pos: [60, 260, 600], mira: [-55, 60, -90] },
  // Casi un tercio del plano rodeándolo despacio, sin acercarse apenas: es lo
  // que deja VER el estadio por fuera antes de echarse encima.
  { k: 0.3, pos: [-150, 170, 380], mira: [0, 20, -30] },
  { k: 0.56, pos: [-80, 120, 200], mira: [0, 16, -28] },// cayendo por encima de las manzanas
  // Mirando ALTO y lejos al cruzar el techo: con la mirada puesta en el césped,
  // el techo se comía la pantalla entera y el hueco se iba al borde de arriba.
  { k: 0.74, pos: [-4, 60, 44], mira: [0, 24, -40] },   // rozando el techo
  // Ya DENTRO del hueco (va de z = 10 a -62) antes de bajar: la cámara de juego
  // queda bajo el techo, en z = 22, y bajando desde z = 6 se rozaba el borde.
  // Del borde del hueco cuelgan el videomarcador y los focos (hasta y = 27,8):
  // se baja A PLOMO por dentro, por z ≈ -3, y la bajada a la cámara de juego
  // cruza el borde (z ≈ 9) a y ≈ 22, cinco metros por debajo de ellos.
  { k: 0.87, pos: [0, 40, -2.75], mira: [0, 10, -34] }, // sobre el hueco
  { k: 0.93, pos: [0, 30, -4], mira: [0, 3, -34] }       // entrando por el hueco
]
// Valencia (02/10): la Ciudad de las Artes y las Ciencias desde el sureste, cauce
// arriba —el Àgora y el puente del mástil delante, el Museo, el Hemisfèric y el
// Palau detrás—; el giro sobre el Àgora, el paso por ENCIMA del abanico de
// cables del puente (llega a y ≈ 40 sobre el eje) y la bajada al paseo.
const VALENCIA_PLANOS = [
  { k: 0, pos: [130, 200, 480], mira: [0, 10, -70] },
  { k: 0.3, pos: [-95, 135, 340], mira: [5, 14, -70] },
  { k: 0.56, pos: [-28, 92, 205], mira: [0, 12, -80] },
  { k: 0.76, pos: [4, 68, 118], mira: [0, 8, -70] },    // por encima del puente
  { k: 0.9, pos: [0, 36, 62], mira: [0, 3, -34] }
]
// Marsella (03/10, dada la vuelta): desde el mar, entrando por la bocana —el
// fuerte Saint-Jean y el MuCEM a la izquierda, Notre-Dame en su colina a la
// derecha— y siguiendo el agua del puerto hasta bajar al muelle, mirando al
// fondo, donde han varado las barcazas.
const MARSELLA_PLANOS = [
  { k: 0, pos: [40, 190, 900], mira: [170, 40, 220] },
  { k: 0.3, pos: [60, 120, 520], mira: [50, 10, 60] },
  { k: 0.56, pos: [28, 80, 260], mira: [0, 8, -60] },
  { k: 0.76, pos: [6, 45, 120], mira: [0, 5, -60] },
  { k: 0.9, pos: [2, 24, 50], mira: [0, 3, -40] }
]
// París (04/10): la postal desde el Trocadero, por encima del Sena; luego rodea
// la torre por su izquierda a media altura (sin cruzar su celosía), sobrevuela el
// Campo de Marte y vuelve la vista a la torre para bajar al paseo.
const PARIS_PLANOS = [
  { k: 0, pos: [-150, 105, -380], mira: [0, 38, -116] },
  { k: 0.3, pos: [-120, 80, -140], mira: [0, 32, -116] },
  { k: 0.56, pos: [-70, 62, 60], mira: [0, 20, -100] },
  { k: 0.76, pos: [-16, 38, 70], mira: [0, 8, -80] },
  { k: 0.9, pos: [-3, 24, 45], mira: [0, 3, -40] }
]
// Lyon (03/10): desde la Presqu'île, mirando al oeste a Fourvière por encima del
// Saona y del Viejo Lyon; luego gira río abajo y baja al muelle.
const LYON_PLANOS = [
  { k: 0, pos: [-260, 160, 120], mira: [120, 40, -60] },
  { k: 0.3, pos: [-150, 120, 230], mira: [60, 20, -60] },
  { k: 0.56, pos: [-50, 72, 130], mira: [20, 8, -60] },
  { k: 0.76, pos: [-8, 42, 74], mira: [0, 5, -60] },
  { k: 0.9, pos: [-3, 24, 42], mira: [0, 3, -40] }
]
// Nápoles (06/10): la postal desde el mar —el Castel dell'Ovo delante, la ciudad
// a la izquierda y el Vesubio cerrando la bahía—; luego gira hacia el paseo y baja.
const NAPOLES_PLANOS = [
  // El primer plano va en la línea que une el castillo con el volcán: así salen
  // uno delante del otro, que en vertical no caben los dos de lado.
  { k: 0, pos: [45, 110, 330], mira: [260, 110, -1300] },
  { k: 0.3, pos: [70, 92, 170], mira: [180, 50, -700] },
  { k: 0.56, pos: [60, 66, 112], mira: [10, 12, -110] },
  { k: 0.76, pos: [6, 42, 76], mira: [0, 5, -64] },
  { k: 0.9, pos: [-3, 24, 44], mira: [0, 3, -40] }
]
// Roma (06/10): el Coliseo entero desde fuera, con el Arco de Constantino y el
// Foro; gira hasta ponerse a su espalda y entra por la brecha, bajando a la arena.
const ROMA_PLANOS = [
  { k: 0, pos: [-250, 150, 230], mira: [0, 22, -22] },
  { k: 0.3, pos: [-120, 125, 250], mira: [0, 18, -22] },
  { k: 0.56, pos: [-24, 86, 160], mira: [0, 6, -34] },
  { k: 0.76, pos: [-5, 46, 84], mira: [0, 5, -60] },
  { k: 0.9, pos: [-3, 24, 44], mira: [0, 3, -40] }
]
// Atenas (06/10): la roca entera desde el suroeste, con el Odeón al pie y el
// Partenón arriba, dorados por el sol que se pone; sube, pasa por encima de los
// Propileos y baja a la meseta.
const ATENAS_PLANOS = [
  { k: 0, pos: [262, 7, 192], mira: [-4, 0, -70] },
  { k: 0.3, pos: [150, 60, 240], mira: [0, 2, -80] },
  { k: 0.56, pos: [22, 52, 132], mira: [0, 6, -62] },
  { k: 0.76, pos: [4, 36, 72], mira: [0, 5, -58] },
  { k: 0.9, pos: [-2, 23, 43], mira: [0, 3, -40] }
]
// Las llegadas «de película»: un recorrido por planos, largo la primera vez y
// más corto (pero empezando también fuera) las siguientes. Cada una abre la
// niebla y el corte de lejos a su medida, y enciende el modelo de la ciudad.
const LLEGADAS = {
  estadio: { dura: 9, corto: { desde: 0.2, dura: 5.5 }, visto: 'alienz-vuelo-madrid-v1', niebla: { cerca: 700, lejos: 2400 }, lejos: 4200, planos: ESTADIO_PLANOS },
  valencia: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-valencia-v1', niebla: { cerca: 900, lejos: 3200 }, lejos: 4200, planos: VALENCIA_PLANOS },
  lyon: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-lyon-v1', niebla: { cerca: 900, lejos: 3200 }, lejos: 4200, planos: LYON_PLANOS },
  paris: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-paris-v1', niebla: { cerca: 900, lejos: 3200 }, lejos: 4200, planos: PARIS_PLANOS },
  napoles: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-napoles-v1', niebla: { cerca: 900, lejos: 3400 }, lejos: 4400, planos: NAPOLES_PLANOS },
  roma: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-roma-v1', niebla: { cerca: 900, lejos: 3200 }, lejos: 4200, planos: ROMA_PLANOS },
  atenas: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-atenas-v1', niebla: { cerca: 900, lejos: 3400 }, lejos: 4400, planos: ATENAS_PLANOS },
  marsella: { dura: 9, corto: { desde: 0.25, dura: 5.5 }, visto: 'alienz-vuelo-marsella-v1', niebla: { cerca: 900, lejos: 3400 }, lejos: 4400, planos: MARSELLA_PLANOS }
}
// El recorrido es una curva que pasa por los planos, no tramos sueltos: con un
// arranque y un frenazo en cada plano, en nueve segundos la cámara iba a tirones.
function curvasDe (cfg) {
  const curva = campo => new THREE.CatmullRomCurve3(
    cfg.planos.map(p => new THREE.Vector3(...p[campo])), false, 'centripetal')
  cfg.camino ??= curva('pos')
  cfg.mirada ??= curva('mira')
  return cfg
}
const tmpVueloPos = new THREE.Vector3()
// Pone la cámara en el punto k (0-1) del plano, sin la mezcla final.
function planoLlegada (cfg, k) {
  const P = curvasDe(cfg).planos
  let i = 0
  while (i < P.length - 2 && k > P[i + 1].k) i++
  const f = Math.min(1, Math.max(0, (k - P[i].k) / (P[i + 1].k - P[i].k)))
  const u = (i + f) / (P.length - 1)
  camera.position.copy(cfg.camino.getPoint(u, tmpVueloPos))
  camera.lookAt(cfg.mirada.getPoint(u, tmpVueloMira))
}

function empezarLlegadaEstadio (cfg) {
  world.resize()
  let visto = false
  try { visto = localStorage.getItem(cfg.visto) === '1' } catch { /* modo privado */ }
  vuelo = {
    estadio: true,
    cfg,
    t: 0,
    corto: visto,
    dura: visto ? cfg.corto.dura : cfg.dura,
    arranca: visto ? cfg.corto.desde : 0,
    fin: { pos: camera.position.clone(), rot: camera.quaternion.clone() },
    niebla: scene.fog ? { cerca: scene.fog.near, lejos: scene.fog.far } : null,
    lente: { cerca: camera.near, lejos: camera.far }
  }
  try { localStorage.setItem(cfg.visto, '1') } catch { /* modo privado */ }
  // La ciudad de alrededor solo existe durante el plano.
  world.verCiudad(true)
  if (scene.fog) { scene.fog.near = cfg.niebla.cerca; scene.fog.far = cfg.niebla.lejos }
  // La cámara del juego corta a 200 y la ciudad, desde el primer plano, llega a
  // 600: sin abrirle el corte no se ve NADA, sale la pantalla vacía. Se abre
  // para el plano y se le devuelve lo suyo al acabar.
  camera.near = 1
  camera.far = cfg.lejos
  camera.updateProjectionMatrix()
  ui.banner(nivelActivo().name.toUpperCase())
  ui.rotulo(nivelActivo().name.toUpperCase(), nivelActivo().lugar, vuelo?.dura ?? VUELO)
  actualizarVuelo(0)
}

function actualizarEstadio (dt) {
  void dt
  const v = vuelo
  // El estadio y el barrio son dos modelos que llegan un momento después: hasta
  // entonces el plano se queda en su primer fotograma, sin gastar su tiempo.
  if (!world.escenarioListo()) v.t = 0
  // Con tope por abajo: el primer fotograma de un nivel llega a veces con el
  // reloj descolocado, y con k negativa la cámara salía ESTIRADA hacia atrás,
  // más lejos todavía que el primer plano.
  const avance = Math.min(1, Math.max(0, v.t / v.dura))
  // En el corto se entra ya empezado, pero por los mismos puntos.
  const k = v.arranca + (1 - v.arranca) * avance
  const P = v.cfg.planos
  planoLlegada(v.cfg, k)
  // El último tramo se funde con la posición de juego, como el sobrevuelo.
  const ultimo = P[P.length - 1].k
  const mezcla = k < ultimo ? 0 : suave((k - ultimo) / (1 - ultimo))
  if (mezcla > 0) {
    camera.position.lerp(v.fin.pos, mezcla)
    camera.quaternion.slerp(v.fin.rot, mezcla)
  }
  // Y la niebla vuelve a la suya en ese mismo tramo, para que no dé el salto.
  if (v.niebla && scene.fog) {
    scene.fog.near = v.cfg.niebla.cerca + (v.niebla.cerca - v.cfg.niebla.cerca) * mezcla
    scene.fog.far = v.cfg.niebla.lejos + (v.niebla.lejos - v.cfg.niebla.lejos) * mezcla
  }
  if (avance >= 1) terminarVuelo()
}

// --- llegada en helicóptero -------------------------------------------------
// Vas sentado dentro, con la puerta lateral abierta: el paisaje pasa fuera, el
// aparato desciende encarando el campo y, al posarse, la cámara sale y se
// coloca en su sitio de juego. Un solo plano continuo.
function empezarLlegadaHeli () {
  world.resize()
  if (!cabinaHeli) {
    cabinaHeli = crearCabina()
    scene.add(cabinaHeli)
  }
  cabinaHeli.visible = true
  const lado = Math.random() < 0.5 ? -1 : 1
  vuelo = {
    heli: true,
    t: 0,
    lado,
    fin: { pos: camera.position.clone(), rot: camera.quaternion.clone() },
    // Entra de lejos y por un lado, alto, y baja describiendo una curva hasta
    // quedarse justo detrás de la línea de la base.
    desde: new THREE.Vector3(lado * 34, 27, FIELD.spawnZ - 34),
    hasta: camera.position.clone().add(new THREE.Vector3(lado * 3, 2.2, 5))
  }
  ui.banner(nivelActivo().name.toUpperCase())
  ui.rotulo(nivelActivo().name.toUpperCase(), nivelActivo().lugar, vuelo?.dura ?? VUELO)
  actualizarVuelo(0)
}

function actualizarHeli (dt) {
  const v = vuelo
  const k = Math.min(1, v.t / VUELO_HELI)
  const s = suave(k)
  camera.position.lerpVectors(v.desde, v.hasta, s)
  // Vibración del aparato: poca, pero sin ella el plano parece una grúa.
  const tembleque = (1 - k * 0.7) * 0.05
  camera.position.x += Math.sin(v.t * 31) * tembleque
  camera.position.y += Math.sin(v.t * 23 + 1.3) * tembleque
  // Mira hacia el campo, ladeado al principio —vas sentado y el campo queda a
  // un lado— y encarándolo según se posa.
  const miraX = v.lado * 14 * (1 - s)
  camera.lookAt(tmpVueloMira.set(miraX, 1.5, FIELD.spawnZ + 10 + s * 20))
  // El alabeo del helicóptero al enderezarse.
  camera.rotateZ(-v.lado * 0.16 * (1 - s) + Math.sin(v.t * 9) * 0.012)
  // La cabina va pegada a la cámara: su geometría está escrita en coordenadas
  // de cámara, así que basta con copiarle sitio y giro.
  cabinaHeli.position.copy(camera.position)
  cabinaHeli.quaternion.copy(camera.quaternion)
  cabinaHeli.userData.palas.rotation.y += dt * 42
  // Al final, la cámara sale del aparato y se funde con la vista de juego; la
  // cabina se va antes, que si no se ve salir por un lado.
  const mezcla = k < 0.62 ? 0 : suave((k - 0.62) / 0.38)
  if (mezcla > 0) {
    camera.position.lerp(v.fin.pos, mezcla)
    camera.quaternion.slerp(v.fin.rot, mezcla)
    cabinaHeli.visible = mezcla < 0.45
  }
  if (k >= 1) { cabinaHeli.visible = false; terminarVuelo() }
}

function actualizarVuelo (dt) {
  const v = vuelo
  v.t += dt
  if (v.heli) return actualizarHeli(dt)
  if (v.estadio) return actualizarEstadio(dt)
  const k = Math.min(1, v.t / (v.dura ?? VUELO))
  // Por encima de la carretera, acercándose al monumento. La carretera es lo
  // único despejado: desde el descampado de al lado, en las ciudades con
  // avenida, la cámara acababa detrás de un edificio.
  // DOS TIEMPOS, y el primero es para MIRAR. Antes la cámara empezaba a caer
  // desde el primer fotograma y a mitad de plano ya estaba en la partida: se
  // veía el sitio de refilón. Ahora los primeros dos segundos la cámara casi no
  // se mueve —solo se acerca un poco, lo justo para que no parezca una foto— y
  // la bajada al campo pasa en el resto.
  //
  // Solo para los planos con `vista`, que son los de los sitios. El de siempre
  // (monumento de lado) se queda como estaba: ese ya funcionaba.
  const mirando = v.vista ? 0.42 : 0
  const avance = k < mirando ? (k / Math.max(mirando, 0.001)) * 0.18 : 0.18 + (k - mirando) / (1 - mirando) * 0.82
  const acerca = v.vista ? 1 - avance * 0.34 : 1 - Math.min(1, k / 0.5) * 0.3
  if (v.vista) {
    // Desde su punto, acercándose hacia lo que mira.
    const [dx, dy, dz] = v.vista.desde
    const [mx, my, mz] = v.vista.mira
    const f = 1 - acerca
    camera.position.set(dx + (mx - dx) * f, dy + (my - dy) * f, dz + (mz - dz) * f)
    camera.lookAt(tmpVueloMira.set(mx, my, mz))
  } else {
    camera.position.set(
      v.centro.x * 0.25,
      v.altura,
      v.centro.z + v.distancia * acerca
    )
    camera.lookAt(tmpVueloMira.set(v.centro.x, v.alto * 0.45, v.centro.z))
  }
  // Y el fundido con la posición de juego, después de haber mirado.
  // Con el plano de un sitio el fundido empieza más tarde: primero se mira, y
  // la caída al campo se hace en el último 40 %.
  const desde = v.vista ? 0.6 : 0.5
  const mezcla = k < desde ? 0 : suave((k - desde) / (1 - desde))
  if (mezcla > 0) {
    camera.position.lerp(v.fin.pos, mezcla)
    camera.quaternion.slerp(v.fin.rot, mezcla)
  }
  // La niebla abierta vuelve a la suya en ese mismo tramo, sin salto.
  if (v.vista?.niebla && v.niebla && scene.fog) {
    const a = v.vista.niebla
    scene.fog.near = a.cerca + (v.niebla.cerca - a.cerca) * mezcla
    scene.fog.far = a.lejos + (v.niebla.lejos - a.lejos) * mezcla
  }
  if (k >= 1) terminarVuelo()
}

function terminarVuelo () {
  // La niebla que se abrió para enseñar el estadio desde fuera vuelve a lo suyo.
  if (vuelo?.niebla && scene.fog) {
    scene.fog.near = vuelo.niebla.cerca
    scene.fog.far = vuelo.niebla.lejos
  }
  if (vuelo?.lente) {
    camera.near = vuelo.lente.cerca
    camera.far = vuelo.lente.lejos
    camera.updateProjectionMatrix()
  }
  // La ciudad se apaga en cuanto se entra en el estadio: jugando no se ve ni una
  // ventana y tenerla encendida es gastar batería para nada.
  if (vuelo?.estadio) world.verCiudad(false)
  vuelo = null
  world.resize()
}

// Un toque durante el vuelo lo salta, y no llega a nada más: no debe colocar un
// soldado ni abrir la pausa sin querer.
window.addEventListener('pointerdown', e => {
  if (!vuelo) return
  terminarVuelo()
  e.stopPropagation()
  e.preventDefault()
}, true)

// La cortina de los lugares hechos en Blender: la primera vez que se abre uno
// tarda medio segundo en llegar (modelos, mapas de luz, texturas a la tarjeta) y
// se veía montarse a trozos. Mientras `world.escenarioListo()` diga que no, la
// pantalla queda tapada; se pone de golpe y se quita fundiendo. Va por debajo de
// los menús, así que en la portada no estorba aunque se esté cargando detrás.
const cortinaLugar = document.createElement('div')
cortinaLugar.className = 'cortina-lugar'
cortinaLugar.innerHTML = '<span>Cargando…</span>'
document.getElementById('app').appendChild(cortinaLugar)
let cortinaPuesta = false

function frame (now) {
  requestAnimationFrame(frame)
  const tapar = !world.escenarioListo()
  if (tapar !== cortinaPuesta) {
    cortinaPuesta = tapar
    cortinaLugar.classList.toggle('puesta', tapar)
  }
  // El tiempo REAL del fotograma, sin recortar, es el que mide la calidad: con
  // el recorte de 50 ms un móvil ahogado parecería ir siempre a veinte justos.
  const real = now - last
  const dt = Math.min(0.05, real / 1000)
  last = now
  calidad.medir(real)
  // ×2: dos pasos de simulación por fotograma (ver `velocidad`). Nunca en el
  // vuelo de llegada ni en pausa.
  const pasos = running && !vuelo && !pausado ? velocidad : 1
  for (let k = 0; k < pasos; k++) simulate(dt)
  guia.mirar()
  actualizarFlecha(now / 1000)
  conTemblor(dt, () => resplandor.render())
}

// ---------------------------------------------------------------------------
// arranque y final
// ---------------------------------------------------------------------------
// --- asalto a la base ----------------------------------------------------------
// Limpiada la última oleada la partida no se corta en seco: la tropa sale del
// perímetro hacia la base del fondo, la acribilla y la base revienta. Solo
// entonces llega el informe. Es lo que cuenta de qué va esto: venimos a
// quitarles las bases, no solo a aguantar.
let asalto = null
// Si la partida va sin nave (duelo, o una misión con entrada propia como Milán).
let sinNave = false
// `andar`: al trote se tarda más que corriendo (unos 30 m a 3,7 m/s y la espera).
// `fuego` es lo que aguanta la base antes de caer. Estaba en 3,8 y se venía
// abajo casi sin darte tiempo a ver el tiroteo: ahora el doble, que es el final
// de la partida y hay que poder disfrutarlo. `trasExplosion` da un respiro para
// ver la ruina antes de que entre la pantalla de victoria.
const ASALTO = { andar: 9.5, fuego: 7.6, trasExplosion: 2.6 }
const tmpObjetivo = new THREE.Vector3()
const tmpChispa = new THREE.Vector3()

function empezarAsalto () {
  if (!running) return
  // Las monedas que quedan por el suelo se cobran ANTES de cerrar la partida:
  // con `running` en falso los billetes que soltaran no se apuntarían.
  for (const p of [...economy.pickups]) economy.collect(p)
  running = false
  pintarAtras()
  ui.closeInspector()
  ui.banner('¡A POR LA BASE!')
  const base = world.baseActual()
  const tiradores = soldiers.filter(s => !s.dead && !s.spec.fija)
  asalto = { t: 0, fase: 'andar', base, tiradores, sitio: base ? base.position.clone() : null }
  // Cada uno sale por su carril y se para en la franja donde se posaban las
  // naves, a tres profundidades distintas para que no parezca un desfile.
  //
  // Con la torre a un lado (Milán la tiene delante de los pórticos, fuera del
  // paso de los bichos) no vale ir recto: se abren hacia ella y se plantan a
  // diez de su cara. Isidro: «al final de la partida los soldados van a ir a la
  // torre y la destruyen».
  const aUnLado = base && Math.abs(base.position.x) > 4
  tiradores.forEach((s, i) => {
    s.destX = aUnLado ? base.position.x * 0.55 + s.px * 0.6 : s.px * 0.8
    s.destZ = (aUnLado ? base.position.z + 11 : FIELD.spawnZ + 10) - (i % 3) * 2.5
    s.andando = true
    s.entrando = true
    // Al trote, y cada uno arranca cuando le toca: salir todos a la vez, al
    // mismo paso, era un desfile de copias.
    s.modoPaso = 'trote'
    s.espera = Math.random() * 0.8
    s.enAsalto = true
    s.gesture = null
    s.hasTarget = false
    s.targetPos = null
    s.bar.group.visible = false
  })
}

function dispararALaBase (s, objetivo) {
  const from = muzzleWorld(s, tmpA)
  const to = tmpB.set(objetivo.x + (Math.random() - 0.5) * 6, objetivo.y + (Math.random() - 0.5) * 3, objetivo.z)
  s.onFire()
  audio.shot(s.spec.arma ?? s.key, from.x / 7)
  if (s.spec.projectile === 'arrow') effects.arrow(from, to)
  else if (s.spec.projectile === 'mortar') effects.mortar(from.clone(), to.clone(), p => { audio.boom(); effects.burst(p, 0xffb03a, 14, 3) })
  else effects.tracer(from, to)
}

function reventarBase (objetivo) {
  const a = asalto
  const centro = objetivo.clone()
  // Varios golpes seguidos —fogonazo, bola de fuego, llamarada y humo negro—:
  // uno solo se leía como un disparo más.
  ;[[0xffffff, 30, 5], [0xffb03a, 44, 6.5], [0xff5a2a, 32, 5], [0x2e2e2e, 26, 4]].forEach(([color, n, fuerza], i) => {
    setTimeout(() => {
      effects.burst(tmpChispa.set(centro.x + (Math.random() - 0.5) * 4, centro.y + i * 0.8, centro.z), color, n, fuerza)
      audio.boom()
    }, i * 150)
  })
  effects.smoke(centro, 10, 0x2a2a2a)
  if (a.base) {
    // Antes se escondía y la base desaparecía de golpe. Se queda: apagada,
    // chamuscada y con la antena tronchada, que es lo que uno quiere ver
    // después de haberse peleado toda la partida por llegar hasta ella.
    a.base.position.copy(a.sitio)
    a.base.userData.arruinar?.()
  }
  ui.banner('BASE DESTRUIDA')
  vibrar([80, 40, 140])
  for (const s of a.tiradores) { s.hasTarget = false; s.targetPos = null }
}

function actualizarAsalto (dt) {
  const a = asalto
  a.t += dt
  const objetivo = a.sitio
    ? tmpObjetivo.set(a.sitio.x, 2.2, a.sitio.z)
    : tmpObjetivo.set(0, 2, FIELD.spawnZ - 60)

  for (const s of a.tiradores) {
    if (a.fase === 'fuego' && !s.andando) {
      s.hasTarget = true
      s.targetPos = objetivo
    }
    s.update(dt, camera)
  }

  if (a.fase === 'andar') {
    // Sin esperar a los rezagados más de la cuenta: el que no llegó dispara
    // desde donde esté.
    if (a.tiradores.every(s => !s.andando) || a.t > ASALTO.andar) {
      for (const s of a.tiradores) s.andando = false
      a.fase = 'fuego'
      a.t = 0
    }
    return
  }

  if (a.fase === 'fuego') {
    for (const s of a.tiradores) {
      s.cooldown -= dt
      if (s.cooldown > 0 || s.aim < 0.8) continue
      s.cooldown = (1 / s.fireRate) * (0.7 + Math.random() * 0.6)
      dispararALaBase(s, objetivo)
    }
    // La base encaja: tiembla cada vez más y le saltan chispas por todas partes.
    const k = Math.min(1, a.t / ASALTO.fuego)
    if (a.base) {
      a.base.position.set(a.sitio.x + (Math.random() - 0.5) * 0.6 * k, a.sitio.y, a.sitio.z + (Math.random() - 0.5) * 0.4 * k)
    }
    if (Math.random() < dt * (4 + k * 10)) {
      const p = tmpChispa.set(objetivo.x + (Math.random() - 0.5) * 9, 0.5 + Math.random() * 4, objetivo.z + (Math.random() - 0.5) * 3)
      effects.burst(p, Math.random() < 0.5 ? 0xffb03a : 0x7dffe4, 8, 2.4)
      if (Math.random() < 0.3) effects.smoke(p, 2, 0x3a3a3a)
    }
    if (a.t > ASALTO.fuego) {
      reventarBase(objetivo)
      a.fase = 'fin'
      a.t = 0
    }
    return
  }

  // La ruina sigue humeando mientras se ve. Un hierro retorcido y quieto no
  // acaba de leerse como algo que acaba de arder.
  if (Math.random() < dt * 7) {
    effects.smoke(tmpChispa.set(objetivo.x + (Math.random() - 0.5) * 7, 1 + Math.random() * 2.5, objetivo.z + (Math.random() - 0.5) * 3), 2.6, 0x35322e)
  }

  if (a.t > ASALTO.trasExplosion) {
    asalto = null
    win()
  }
}

function win () {
  running = false
  audio.stopMusic()
  cerrarCuentas()
  vibrar([50, 40, 50])
  // Un reto no es una misión de campaña: no desbloquea nada, no da estrellas y
  // su resultado va a la tabla del reto, no a la del tramo.
  if (retoEnCurso) return finReto(true)
  const nivel = NIVELES[nivelActual]
  const antes = cargarProgreso()
  const porcentaje = Math.round(baseHp / BASE.hp * 100)
  const estrellas = estrellasDe(porcentaje)
  const rango = ESTRELLAS[estrellas - 1]
  const primeraVez = nivelActual >= antes.superados
  const progreso = superarNivel(nivelActual, porcentaje)
  // A la tabla del tramo, si hay sesión. Va sin esperar y sin molestar: que el
  // marcador falle no puede estropear la pantalla de victoria.
  if (cuenta.usuario) {
    import('./systems/marcadores.js')
      .then(m => m.publicarPuntuacion(cuenta.usuario, nivelActual, porcentaje, estrellas))
      .catch(e => console.warn('Sin publicar la marca:', e))
  }
  const siguiente = NIVELES[nivelActual + 1]
  const mejora = !(nivelActual in antes.rangos) || estrellas > antes.rangos[nivelActual]
  // Si era la última misión del país, esta victoria cierra el país entero y se
  // cuenta su desenlace. Solo la primera vez: repetirla para mejorar la nota no
  // vuelve a limpiar nada.
  const pais = paisDe(nivelActual)
  const paisIdx = PAISES.indexOf(pais)
  const cierraPais = nivelActual === pais.ultima && primeraVez

  // Ganar ya no abre arsenal: todo se compra en la tienda con billetes, y lo que
  // se lleva uno de cada partida va en el botín de abajo.

  // Los tres últimos niveles no abren arsenal —ya lo tienes todo—, así que su
  // pantalla de victoria se quedaba en un título y una línea. El rango le da a
  // CADA victoria algo que enseñar, y de paso una razón para repetir un nivel
  // que ya está superado: dejarlo mejor de como quedó.
  const sello = `
    <div class="sello sello-${estrellas}">
      ${estrellitas(estrellas, 'grandes')}
      <span class="sello-txt"><b>${rango.nombre}</b><em>Perímetro al ${porcentaje}%${mejora && !primeraVez ? ' · mejor marca' : ''}</em></span>
    </div>`

  if (!siguiente && campañaCompleta(progreso)) {
    // Fin de campaña. No es un nivel más superado: es el último, y merece una
    // pantalla que no se parezca a las otras cinco.
    // Por país y no por misión: treinta y seis líneas seguidas no se leen, y lo
    // que se quiere ver al acabar es cómo quedó cada país.
    const lineasPais = PAISES.map(p => {
      let suyas = 0
      for (let i = p.primera; i <= p.ultima; i++) suyas += progreso.rangos[i] ?? 0
      return `<li><span class="marca-pais">${p.nombre}</span><b>${suyas}</b>&nbsp;<small>/ ${p.misiones.length * 3} ★</small></li>`
    }).join('')
    ui.showOverlay(`
      <p class="eyebrow">Estado Mayor del búnker · informe de cierre</p>
      <h1>PLANETA LIMPIO</h1>
      <p class="tagline">Trece países. Treinta y nueve campamentos. No queda ninguno en pie.</p>
      ${sello}
      <p class="cierre">${nivel.cierre ?? ''} Los búnkeres abren y la gente
      empieza a salir. Pero los túneles siguen bajando en los trece sitios, y
      nadie de los que firmamos aquello sabe hasta dónde.</p>
      <ol class="marcas">${lineasPais}</ol>
      ${cierraPais ? htmlHallazgo(paisIdx) : ''}
      ${htmlBotin()}
      <button class="big-btn" onclick="volverA('mapa')">AL MAPA</button>`)
    abrirCofre(true, estrellas)
    return
  }

  ui.showOverlay(`
    <h1>LÍNEA INTACTA</h1>
    <p class="tagline">«${nivel.name}» bajo control.</p>
    ${sello}
    ${nivel.cierre ? `<p class="cierre">${nivel.cierre}</p>` : ''}
    ${cierraPais ? `<div class="pais-desenlace"><span>${pais.nombre} limpio</span><p>${pais.cierre}</p></div>` : ''}
    ${cierraPais ? htmlHallazgo(paisIdx) : ''}
    ${htmlBotin()}
    ${cierraPais
      ? `<button class="big-btn" onclick="volverA('mapa')">AL MAPA</button>`
      : `<button class="big-btn" onclick="volverA('pais:${paisIdx}')">SIGUIENTE MISIÓN</button>`}`)
  abrirCofre(true, estrellas)
}

function lose () {
  running = false
  audio.stopMusic()
  // En el duelo, caer es perder contra el otro: ni monedas a la cartera ni
  // cofre de consolación.
  if (dueloEnCurso) { ui.banner('DESBORDADOS'); return duelo.perdi() }
  cerrarCuentas()
  if (retoEnCurso) return finReto(false)
  ui.banner('DESBORDADOS')
  setTimeout(() => {
    ui.showOverlay(`
    <h1 class="lost">PERÍMETRO ROTO</h1>
    <p class="tagline">La siembra pasó de la línea en la oleada ${director.wave} de ${director.total} de ${NIVELES[nivelActual].name}.</p>
    ${htmlBotin()}
    <button class="big-btn" onclick="volverA('pais:${PAISES.indexOf(paisDe(nivelActual))}')">REINTENTAR</button>`)
    // También al perder: la partida jugada cuenta, y lo que empuja a volver a
    // intentarlo es salir con algo en la mano.
    abrirCofre(false, 0)
  }, 900)
}

// Dejar el tablero como recién puesto. Empezar significa empezar: sin esto, una
// segunda partida heredaba los defensores y la vida de base de la anterior. Hoy
// lo usan dos sitios —arrancar un nivel y abandonar desde la pausa— y el segundo
// SÍ vuelve al menú sin recargar, así que ya no es una trampa teórica.
function limpiarPartida () {
  for (const s of soldiers) scene.remove(s.mesh)
  for (const z of zombies) scene.remove(z.mesh)
  for (const c of corpses) scene.remove(c.mesh)
  grietas.limpiar()
  marcas.limpiar()
  for (const o of ondasJefe) scene.remove(o.malla)
  ondasJefe.length = 0
  soldiers.length = 0
  zombies.length = 0
  corpses.length = 0
  occupied.clear()
  presion.fill(0)
  economy.reset()
  document.getElementById('recolector')?.classList.add('hidden')
  golpes.limpiar()
  for (const clave of recargas.keys()) ui.setRecarga(clave, 0, 1)
  recargas.clear()
  for (const b of brasas) { b.t = 0; b.malla.visible = false }
  fuego.limpiar()
  dropship.ocultar()
  baseHp = BASE.hp
  ui.setBase(1)
  ui.closeInspector()
}

function alAparecer (z) {
  // Con los pies puestos desde el primer fotograma: si no, el que nace en lo
  // alto del graderío aparece un instante hundido en la piedra.
  z.suelo = alturaBajoElPie(z)
  z.mesh.position.y = z.suelo
  marcarBrillo(z.mesh)
  scene.add(z.mesh)
  sombraSoloDeLoGrande(z.mesh)
  zombies.push(z)
  if (z.spec.boss) entradaJefe(z)
}

function start (indice = nivelActual) {
  nivelActual = Math.max(0, Math.min(NIVELES.length - 1, indice))
  limpiarPartida()
  // El paisaje de la región, antes de enseñar nada: si se vistiera después, el
  // primer fotograma del nivel saldría con la tierra del destino anterior.
  const nivelDeHoy = nivelActivo()
  // En duelo y arena los huéspedes vienen andando desde el horizonte y la nave
  // se posa allí: no se nota el momento en que aparecen. En la campaña se queda
  // la nave de siempre, que forma parte de cómo se cuenta cada misión.
  entrarPorElFondo(!!dueloEnCurso || !!nivelDeHoy.entrada)
  // Una misión puede traer su propia entrada: en Milán salen de la Galleria, por
  // debajo del arco, andando desde dentro de la galería. Sin nave: Isidro, «que
  // no vengan en naves, tienen que ir apareciendo del fondo del arco hacia mí».
  if (nivelDeHoy.entrada) {
    FIELD.entradaZ = nivelDeHoy.entrada.z
    FIELD.entradaAncho = nivelDeHoy.entrada.fondo
  }
  // Y si nacen muy al fondo, dentro de la niebla, traen prisa hasta salir de
  // ella (ver `velocidad` en zombie.js).
  FIELD.prisa = nivelDeHoy.entrada?.prisa ?? null
  // Un estorbo en medio del campo que los huéspedes rodean (la ruina del Coliseo).
  FIELD.ruina = nivelDeHoy.ruina ?? null
  FIELD.columnas = nivelDeHoy.columnas ?? null
  sinNave = !!dueloEnCurso || !!nivelDeHoy.entrada
  dropship.recolocar()
  if (sinNave) dropship.ocultar()
  world.vestir(nivelDeHoy.bioma, nivelDeHoy.hitos, nivelDeHoy.suelo, nivelDeHoy.tonoSuelo, nivelDeHoy.escenario, nivelDeHoy.fondo)
  // Lo que arrastra el viento en este sitio, y por dónde vuelan las naves de paso.
  ambient.vestir(nivelDeHoy, world.alturaEn)
  billetesPartida = 0
  pintarBilletes()
  cuentas = null
  asalto = null
  // Ojo: cerrarlo, no tirarlo. Si se empieza un nivel con el plano anterior a
  // medias (reintentar, o salir al mapa y entrar en otro sitio), poniendo
  // `vuelo = null` se quedaba sin deshacer lo que ese plano había tocado: el de
  // Madrid le abre a la cámara el corte de lejos y la niebla, y se quedaban
  // abiertos en TODO lo que viniera detrás.
  if (vuelo) terminarVuelo()
  // El asalto de la partida anterior dejó la base reventada.
  const baseFondo = world.baseActual()
  if (baseFondo) baseFondo.visible = true
  ui.hideOverlay()
  // Las pantallas de campaña van en capas propias y no las cierra hideOverlay.
  document.getElementById('mapa-capa')?.classList.add('hidden')
  document.getElementById('pais-capa')?.classList.add('hidden')
  audio.unlock()
  audio.startMusic()
  // El invitado tiene que vestir SU escenario igual que el del anfitrión, o
  // estaría defendiendo una playa mientras el otro defiende una avenida.
  if (coop?.esAnfitrion) coop.transporte.mandar('partida', { nivel: nivelActual })
  director = createWaveDirector(
    nivelDeHoy,
    alAparecer,
    (n, total, boss) => {
      ui.setWave(`Oleada ${n} / ${total}`)
      ui.banner(boss ? 'LA MADRE' : `OLEADA ${n}`)
      if (boss) audio.groan(true)
    },
    // En el duelo la horda no se acaba (y si alguien la vaciara, sigue ahí).
    () => { if (!dueloEnCurso) setTimeout(empezarAsalto, 1200) },
    // En la arena no baja ninguna nave: los alienz salen por arriba del
    // graderío y bajan la escalera. La nave es de la campaña, que es donde
    // cuenta algo.
    (n, jefe) => { if (sinNave) return; dropship.llegar(n, jefe); audio.nave(jefe) },
    () => { if (!sinNave) dropship.partir() }
  )
  running = true
  last = performance.now()
  empezarVuelo()
  pintarAtras()
  pintarVelocidad()
}

// --- pausa --------------------------------------------------------------------
const elPausaCapa = document.getElementById('pausa-capa')
const elPausa = document.getElementById('pausa')

function pausar (v) {
  // Solo tiene sentido con una partida en curso: en el menú no hay nada que
  // detener, y el botón está tapado por el propio informe.
  if (!running && v) return
  // Antes de nada: el sonido de la pausa es lo único que confirma el toque
  // cuando el dedo tapa el botón, y además apaga la música, que se quedaba
  // sonando alegremente con el juego congelado.
  audio.pausa(v)
  // En un duelo el rival no se para: la pausa abre el menú, pero tu campo
  // sigue corriendo.
  pausado = v && !dueloEnCurso
  elPausaCapa.classList.toggle('hidden', !v)
  elPausa.setAttribute('aria-pressed', v ? 'true' : 'false')
  // Al reanudar hay que refrescar el reloj: si no, el primer fotograma tras la
  // pausa traería todo el rato transcurrido de golpe y la horda daría un salto.
  if (!v) last = performance.now()
}

elPausa.addEventListener('click', () => pausar(!pausado))

// --- botón de atrás ------------------------------------------------------------
// Arriba a la izquierda y siempre en el mismo sitio. Cada capa ya tenía su botón
// de volver, pero abajo del todo, a veces tras un desplazamiento largo. Este no
// inventa rutas: pulsa el volver de la capa que esté encima. En partida abre la
// pausa, que es donde está abandonar: un toque sin querer no debe tirar la misión.
const elAtras = document.getElementById('atras')
const elHud = document.getElementById('hud')
const elEngranaje = document.getElementById('ir-ajustes')
const CAPAS_ATRAS = [
  ['ajustes-capa', 'ajustes-volver'],
  ['enemigos-capa', 'enemigos-volver'],
  ['pausa-capa', 'pausa-seguir'],
  ['parte-capa', 'parte-volver'],
  ['tienda-capa', 'tienda-volver'],
  ['pais-capa', 'pais-volver'],
  ['documento-capa', 'documento-volver'],
  ['expediente-capa', 'expediente-volver'],
  ['usuarios-capa', 'usuarios-volver'],
  ['duelo-capa', 'duelo-volver'],
  ['ranking-capa', 'ranking-volver'],
  ['retos-capa', 'retos-volver'],
  ['coop-capa', 'coop-volver'],
  ['multi-capa', 'multi-volver'],
  ['mapa-capa', 'mapa-volver']
]
function destinoAtras () {
  for (const [capa, boton] of CAPAS_ATRAS) {
    if (!document.getElementById(capa)?.classList.contains('hidden')) {
      return () => document.getElementById(boton)?.click()
    }
  }
  // Portada, victoria y derrota tienen sus propios botones: ahí no hay "atrás".
  if (!document.getElementById('overlay').classList.contains('hidden')) return null
  return running ? () => pausar(true) : null
}
function pintarAtras () {
  const hay = !!destinoAtras()
  elAtras.classList.toggle('hidden', !hay)
  // En partida el botón va en su propia franja arriba y el marcador baja debajo.
  elHud.classList.toggle('con-atras', hay && running)
  // El engranaje solo en la portada: con otra capa encima, o en la victoria y la
  // derrota (que reescriben #overlay y ya no llevan el botón del mapa), se oculta.
  const enPortada = !document.getElementById('overlay').classList.contains('hidden') &&
    !!document.getElementById('ir-mapa') &&
    !CAPAS_ATRAS.some(([capa]) => !document.getElementById(capa)?.classList.contains('hidden'))
  elEngranaje.classList.toggle('hidden', !enPortada)
  document.getElementById('ir-actualizar').classList.toggle('hidden', !enPortada)
  document.getElementById('ir-cuenta').classList.toggle('hidden', !enPortada)
  if (!enPortada) document.getElementById('cuenta-menu').classList.add('hidden')
}
elAtras.addEventListener('click', () => {
  destinoAtras()?.()
  pintarAtras()
})
// Se entera solo de qué pantalla está encima: todas se abren y cierran con la
// clase `hidden`, así que basta vigilar esa clase en vez de avisar desde cada
// función que abre o cierra algo.
const vigiaAtras = new MutationObserver(pintarAtras)
for (const id of ['overlay', ...CAPAS_ATRAS.map(([capa]) => capa)]) {
  const el = document.getElementById(id)
  if (el) vigiaAtras.observe(el, { attributes: true, attributeFilter: ['class'] })
}
pintarAtras()
// El jefe alien de la portada, en diferido: su modelo pesa y no hace falta para
// jugar, así que no retrasa el arranque.
import('./jefeAlien.js')
  .then(m => m.crearJefeAlien(document.getElementById('portada-escena')))
  .catch(err => console.warn('Sin jefe alien:', err))
document.getElementById('pausa-seguir').addEventListener('click', () => pausar(false))
document.getElementById('pausa-salir').addEventListener('click', () => {
  pausar(false)
  // Salir de un duelo es rendirse: cuenta como derrota.
  if (dueloEnCurso) return duelo.abandonar()
  volverAlInforme()
})

// Volver al informe SIN recargar la página. El menú sigue en el DOM tal cual
// —solo se le puso la clase que lo oculta— así que basta con limpiar la partida
// y volver a enseñarlo. Recargar costaría los doscientos milisegundos de generar
// otra vez las texturas y los retratos, para acabar en el mismo sitio.
function volverAlInforme () {
  running = false
  audio.stopMusic()
  limpiarPartida()
  // Se sale al mapa, no a la portada: quien abandona una misión quiere elegir
  // otra, no volver a leer la historia desde el principio.
  abrirMapa()
  ui.setWave('Preparados')
}

// --- ajustes de calidad -------------------------------------------------------
const elCalidadOps = document.getElementById('calidad-ops')
// La calidad tiene dos mitades. La resolución, las sombras y el resplandor
// cuestan por píxel y se cambian en caliente. Pero cuántos lados tiene cada
// pieza y cuántos adornos lleva se decide al CONSTRUIR la figura, y una figura
// ya construida no se rehace sola — rehacer las veintiuna daría justo el tirón
// que se quiere evitar. Así que ese lado del ajuste entra al recargar, y hay que
// decirlo en vez de dejar al jugador pensando que no ha pasado nada.
const elCalidadPie = document.getElementById('calidad-pie')
const elAjustesValor = document.getElementById('ajustes-valor')

const OPCIONES = [
  ['auto', 'Auto', 'El juego mide cómo va y sube o baja la calidad solo. Es lo recomendable: acierta más que cualquiera de nosotros dos, porque lo mide en TU móvil.'],
  ['ultra', CALIDADES.ultra.nombre, CALIDADES.ultra.detalle],
  ['alta', CALIDADES.alta.nombre, CALIDADES.alta.detalle],
  ['media', CALIDADES.media.nombre, CALIDADES.media.detalle],
  ['baja', CALIDADES.baja.nombre, CALIDADES.baja.detalle]
]

function pintarCalidad () {
  const elegida = calidad.preferencia
  elCalidadOps.innerHTML = ''
  for (const [clave, nombre, detalle] of OPCIONES) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'ajuste-op'
    b.textContent = nombre
    b.classList.toggle('elegida', clave === elegida)
    b.addEventListener('click', () => {
      calidad.elegir(clave)
      pintarCalidad()
    })
    elCalidadOps.appendChild(b)
  }
  const actual = OPCIONES.find(o => o[0] === elegida)
  elCalidadPie.textContent = actual?.[2] ?? ''
  const nivelPedido = elegida === 'auto' ? NIVEL_DETALLE : elegida
  if (nivelPedido !== NIVEL_DETALLE) {
    const aviso = document.createElement('span')
    aviso.className = 'ajuste-aviso'
    aviso.innerHTML = 'El detalle de las figuras se aplica al recargar. ' +
      '<button type="button" class="ajuste-recarga">Recargar ahora</button>'
    aviso.querySelector('button').addEventListener('click', () => location.reload())
    elCalidadPie.appendChild(aviso)
  }
  // En automático se enseña además en qué escalón está ahora mismo, que es la
  // única forma de saber si el móvil está dando de sí o va justo.
  elAjustesValor.textContent = elegida === 'auto'
    ? `Auto · ${CALIDADES[calidad.nivel].nombre}`
    : actual?.[1] ?? ''
}

pintarCalidad()
// El escalón puede cambiar solo mientras se juega, así que la etiqueta se
// refresca al abrir los ajustes en vez de quedarse con lo que había al cargar.


// --- tema claro / oscuro ------------------------------------------------------
// El valor real lo pone un guion en el <head>, antes de la primera pintada.
// Aquí solo se cambia y se guarda.
const CLAVE_TEMA = 'alienz-tema-v1'
const TEMAS = [
  ['auto', 'Auto', 'El del móvil. Si lo tienes en claro, el informe sale claro.'],
  ['oscuro', 'Oscuro', 'Informe de contención sobre fondo negro. El de siempre.'],
  ['claro', 'Claro', 'Papel en vez de pantalla. El tablero no cambia: sigue siendo mediodía.']
]

function temaGuardado () {
  try {
    const v = localStorage.getItem(CLAVE_TEMA)
    return v === 'claro' || v === 'oscuro' ? v : 'auto'
  } catch { return 'auto' }
}

function aplicarTema (pref) {
  const efectivo = pref === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro')
    : pref
  document.documentElement.dataset.tema = efectivo
  try {
    if (pref === 'auto') localStorage.removeItem(CLAVE_TEMA)
    else localStorage.setItem(CLAVE_TEMA, pref)
  } catch { /* modo privado */ }
}

const elTemaOps = document.getElementById('tema-ops')
const elTemaPie = document.getElementById('tema-pie')

function pintarTema () {
  const elegido = temaGuardado()
  elTemaOps.innerHTML = ''
  for (const [clave, nombre, detalle] of TEMAS) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'ajuste-op'
    b.textContent = nombre
    b.classList.toggle('elegida', clave === elegido)
    b.addEventListener('click', () => { aplicarTema(clave); pintarTema() })
    elTemaOps.appendChild(b)
  }
  elTemaPie.textContent = TEMAS.find(t => t[0] === elegido)?.[2] ?? ''
}

pintarTema()

// Si está en automático y el móvil cambia de tema —al anochecer, por ejemplo—
// el informe cambia con él sin tener que recargar.
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (temaGuardado() === 'auto') aplicarTema('auto')
})

// --- sonido, música y vibración ---------------------------------------------------
// Se guardan juntos y se aplican al cargar. La vibración la consultan todos los
// sitios que vibran a través del atributo del documento, así ui.js no tiene que
// saber nada de la cartera de preferencias.
const CLAVE_SONIDO = 'alienz-sonido-v1'
function sonidoGuardado () {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_SONIDO) || '{}')
    return { efectos: v.efectos ?? 100, musica: v.musica ?? 100, vibracion: v.vibracion ?? true }
  } catch { return { efectos: 100, musica: 100, vibracion: true } }
}
function guardarSonido (s) {
  try { localStorage.setItem(CLAVE_SONIDO, JSON.stringify(s)) } catch { /* modo privado */ }
}
function aplicarSonido (s) {
  audio.setVolumen('efectos', s.efectos / 100)
  audio.setVolumen('musica', s.musica / 100)
  document.documentElement.dataset.vibracion = s.vibracion ? 'si' : 'no'
}
function vibrar (patron) {
  if (document.documentElement.dataset.vibracion === 'no') return
  try { navigator.vibrate?.(patron) } catch { /* sin permiso aún */ }
}
aplicarSonido(sonidoGuardado())

const elVolEfectos = document.getElementById('vol-efectos')
const elVolMusica = document.getElementById('vol-musica')
const elVibracionOps = document.getElementById('vibracion-ops')
function pintarSonido () {
  const s = sonidoGuardado()
  elVolEfectos.value = s.efectos
  elVolMusica.value = s.musica
  document.getElementById('vol-efectos-valor').textContent = s.efectos ? `${s.efectos} %` : 'apagado'
  document.getElementById('vol-musica-valor').textContent = s.musica ? `${s.musica} %` : 'apagada'
  elVibracionOps.innerHTML = ''
  for (const [valor, nombre] of [[true, 'Sí'], [false, 'No']]) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'ajuste-op'
    b.textContent = nombre
    b.classList.toggle('elegida', s.vibracion === valor)
    b.addEventListener('click', () => {
      const nuevo = { ...sonidoGuardado(), vibracion: valor }
      guardarSonido(nuevo)
      aplicarSonido(nuevo)
      pintarSonido()
      if (valor) vibrar(30)
    })
    elVibracionOps.appendChild(b)
  }
}
for (const [el, clave] of [[elVolEfectos, 'efectos'], [elVolMusica, 'musica']]) {
  el.addEventListener('input', () => {
    const nuevo = { ...sonidoGuardado(), [clave]: Number(el.value) }
    guardarSonido(nuevo)
    aplicarSonido(nuevo)
    pintarSonido()
    // Al mover los efectos suena uno, para oír a qué volumen queda.
    if (clave === 'efectos') { audio.unlock(); audio.coin() }
  })
}

// --- informe de amenazas ----------------------------------------------------
// Nueve fichas con la cara del bicho. Lo que dice cada una NO es su vida ni su
// velocidad —eso no significa nada antes de haber jugado— sino qué hace y qué
// te va a romper, que es lo único que sirve para prepararse.
import { crearBaraja } from './enemigos.js'

const QUE_HACE = {
  walker:   'Huésped en fase inicial. Todavía camina como una persona.',
  runner:   'Sistema nervioso reescrito. Cruza el carril en segundos.',
  armored:  'El caparazón es tejido nuevo. Las balas normales rebotan: hace falta algo que perfore o que queme.',
  spitter:  'Escupe esporas a distancia. No necesita tocar a tus soldados para matarlos.',
  tank:     'Varios huéspedes fundidos en uno. Tan ancho que le disparan desde los carriles de al lado.',
  leaper:   'Salta por encima de lo que le pongas delante. Una pared de sacos no lo detiene.',
  bloater:  'Al caer estalla y se lleva lo que tenga cerca. No amontones a los tuyos.',
  healer:   'Cose a los de alrededor mientras tú les disparas. Mátala a ella primero o el carril se vuelve una esponja.',
  burrower: 'Va por debajo del asfalto y sale DETRÁS de tu línea, donde están los que menos aguantan.'
}

// En una celda de sesenta y cinco píxeles no cabe "Revientaesporas". El nombre
// entero sale en la ficha de abajo al tocarla, que es donde hay sitio.
const NOMBRE_CORTO = { bloater: 'Revienta', burrower: 'Escarba', healer: 'Injerta', armored: 'Costra' }

const elAmenazas = document.getElementById('amenazas')
const elAmenazasPie = document.getElementById('amenazas-pie')
const elAmenazasN = document.getElementById('amenazas-n')
let barajaAmenazas = null

function pintarAmenazas (caras = null) {
  // La primera pasada monta la baraja sin retratos; la segunda, cuando las
  // fotos están listas, solo rellena las imágenes. Montarla dos veces perdería
  // la carta que el jugador tuviera abierta.
  if (!barajaAmenazas) {
    const claves = Object.keys(ZOMBIES).filter(k => !ZOMBIES[k].boss)
    elAmenazasN.textContent = claves.length
    barajaAmenazas = crearBaraja({
      contenedor: elAmenazas,
      pie: elAmenazasPie,
      capa: document.getElementById('enemigos-capa'),
      claves,
      zombies: ZOMBIES,
      textos: QUE_HACE
    })
    if (import.meta.env.DEV) window.__baraja = barajaAmenazas
  }
  if (caras) barajaAmenazas.ponerCaras(caras)
}

pintarAmenazas()

// --- pantallas de ajustes y enemigos --------------------------------------------
// Salen de la portada: el engranaje arriba a la derecha y el botón ENEMIGOS.
const elAjustesCapa = document.getElementById('ajustes-capa')
const elEnemigosCapa = document.getElementById('enemigos-capa')
document.getElementById('ir-ajustes').addEventListener('click', () => {
  audio.unlock()
  pintarCalidad()
  pintarSonido()
  elAjustesCapa.classList.remove('hidden')
})
document.getElementById('ajustes-volver').addEventListener('click', () => elAjustesCapa.classList.add('hidden'))

// --- actualizar el juego ------------------------------------------------------
// Isidro: «necesito un botón en la portada arriba para actualizar la página y
// ver los cambios, porque no basta con cerrar y volver a abrir».
//
// Y no basta, no es manía suya: esto es una PWA. El aparato sirve lo que tiene
// guardado y solo se entera de que hay versión nueva cuando el service worker
// se decide a mirar; aunque se entere, la página ya está pintada con lo viejo y
// hace falta otra recarga más. Cerrar y abrir puede darte lo mismo tres veces
// seguidas.
//
// Este botón no pide por favor: da de baja el service worker, borra TODAS las
// cachés y recarga con una marca de tiempo nueva en la dirección, para saltarse
// también la caché del navegador. Se lleva por delante los modelos guardados
// (los .glb son lo más gordo del juego y van con nombre fijo, así que si no se
// borran NUNCA se cambian por los nuevos), así que la primera partida después
// de actualizar vuelve a bajarlos.
const elActualizar = document.getElementById('ir-actualizar')
let actualizando = false
elActualizar.addEventListener('click', async () => {
  if (actualizando) return
  actualizando = true
  elActualizar.classList.add('girando')
  // El aviso va en el propio botón: el rótulo grande de `ui.banner` vive por
  // debajo de la portada y ahí no se vería.
  elActualizar.disabled = true
  elActualizar.setAttribute('aria-label', 'Actualizando…')
  try {
    if ('serviceWorker' in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registros.map(r => r.unregister()))
    }
    if (window.caches) {
      const nombres = await caches.keys()
      await Promise.all(nombres.map(n => caches.delete(n)))
    }
  } catch (e) {
    // Si el aparato no deja limpiar, se recarga igual: peor es no hacer nada.
    console.warn('no se pudo limpiar lo guardado', e)
  }
  const donde = new URL(location.href)
  donde.searchParams.set('v', Date.now().toString(36))
  location.replace(donde.toString())
})

// --- cuenta de Google ---
// En Ajustes: entrar guarda el progreso en la nube y lo trae a cualquier móvil.
const elCuentaBoton = document.getElementById('cuenta-boton')
const elCuentaPie = document.getElementById('cuenta-pie')
const cuenta = crearCuenta({
  alCambiar: u => {
    pintarCuenta(u)
    elCuentaBoton.disabled = false
    elCuentaBoton.textContent = u ? 'Cerrar sesión' : 'Entrar con Google'
    document.getElementById('cuenta-correo-boton').hidden = !!u
    elCuentaPie.textContent = u
      ? `Progreso guardado en la nube como ${u.displayName ?? u.email}.`
      : 'Guarda tu progreso en la nube y recupéralo en cualquier móvil.'
    pintarAlias(u)
    montarBandeja({ cuenta, escapar: escaparTexto }).catch(e => console.warn('Sin bandeja:', e))
    if (u) recogerCorreoDelMando(u)
  }
})

// El correo del Mando: el aviso o el regalo que el administrador manda desde la
// lista de usuarios. Se recoge una vez, se aplica y se borra del servidor; aquí
// solo queda enseñarlo encima del mapa.
async function recogerCorreoDelMando (u) {
  try {
    const { recogerCorreo } = await import('./systems/cuenta.js')
    const correo = await recogerCorreo(u)
    if (!correo) return
    // El regalo, con la lluvia de billetes antes de la nota.
    if (correo.billetes) {
      const { celebrarBilletes } = await import('./lluviaBilletes.js')
      await celebrarBilletes({ cantidad: correo.billetes, titulo: 'REGALO', subtitulo: 'billetes del Líder Supremo', audio })
    }
    pintarBilletes()
    const caja = document.getElementById('correo-mando')
    if (!caja) return
    document.getElementById('correo-texto').textContent = correo.texto
    caja.hidden = false
  } catch (e) { console.warn('Sin correo:', e) }
}
document.getElementById('correo-visto')?.addEventListener('click', () => {
  document.getElementById('correo-mando').hidden = true
})

// --- el nombre con el que sales en las tablas ---
// Solo aparece con sesión: sin cuenta no hay tabla en la que salir. Se guarda
// en este móvil y viaja con cada marca que publicas.
const elAjusteAlias = document.getElementById('ajuste-alias')
const elAliasCampo = document.getElementById('alias-campo')
const elAliasPie = document.getElementById('alias-pie')
async function pintarAlias (u) {
  if (!elAjusteAlias) return
  elAjusteAlias.hidden = !u
  if (!u) return
  const { aliasActual } = await import('./systems/marcadores.js')
  elAliasCampo.value = aliasActual(u)
}
document.getElementById('alias-guardar')?.addEventListener('click', async () => {
  const { guardarAlias, aliasPorDefecto } = await import('./systems/marcadores.js')
  const puesto = guardarAlias(elAliasCampo.value)
  if (!puesto) elAliasCampo.value = aliasPorDefecto(cuenta.usuario)
  elAliasPie.textContent = puesto
    ? `Guardado. Sales como ${puesto} en las próximas marcas.`
    : 'Sin nombre propio sales con el de tu cuenta.'
})
elCuentaBoton.addEventListener('click', async () => {
  elCuentaBoton.disabled = true
  try {
    if (cuenta.usuario) await cuenta.salir()
    else await cuenta.entrar()
  } catch (e) {
    console.warn('Cuenta:', e)
    elCuentaPie.textContent = 'No se pudo conectar con Google. Inténtalo otra vez.'
  } finally {
    elCuentaBoton.disabled = false
  }
})

// --- entrar con correo y contraseña (29/09) ------------------------------------
// Isidro: «en iPhone no deja iniciar sesión con Google». Se abre desde Ajustes
// y desde la bienvenida. Los errores de Firebase, traducidos: su código en
// inglés no le dice nada a nadie.
const elCorreoCapa = document.getElementById('correo-capa')
const elCorreoAviso = document.getElementById('correo-aviso')
const elCorreoCampo = document.getElementById('correo-campo')
const elCorreoClave = document.getElementById('correo-clave')
function abrirCorreo () {
  elBienvenida?.classList.add('hidden')
  elCorreoAviso.textContent = ''
  elCorreoAviso.classList.remove('bien')
  elCorreoCapa.classList.remove('hidden')
  setTimeout(() => elCorreoCampo.focus(), 50)
}
function errorDeCorreo (e) {
  const c = e?.code ?? ''
  if (/invalid-email/.test(c)) return 'Ese correo no parece válido.'
  if (/missing-password/.test(c)) return 'Falta la contraseña.'
  if (/weak-password/.test(c)) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (/email-already-in-use/.test(c)) return 'Ya hay una cuenta con ese correo. Pulsa «Entrar».'
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'Correo o contraseña incorrectos.'
  if (/too-many-requests/.test(c)) return 'Demasiados intentos. Espera un poco y vuelve a probar.'
  if (/network/.test(c)) return 'Sin conexión. Revisa la cobertura.'
  if (/operation-not-allowed/.test(c)) return 'El acceso con correo no está activado en el servidor.'
  return 'No se ha podido. Inténtalo otra vez.'
}
async function conCorreo (hacer, boton) {
  const correo = elCorreoCampo.value.trim()
  const clave = elCorreoClave.value
  if (!correo) { elCorreoAviso.textContent = 'Escribe tu correo.'; return }
  boton.disabled = true
  elCorreoAviso.classList.remove('bien')
  elCorreoAviso.textContent = 'Un momento…'
  try {
    await hacer(correo, clave)
    elCorreoClave.value = ''
    elCorreoCapa.classList.add('hidden')
  } catch (e) {
    console.warn('Correo:', e)
    elCorreoAviso.textContent = errorDeCorreo(e)
  } finally {
    boton.disabled = false
  }
}
document.getElementById('correo-form').addEventListener('submit', e => {
  e.preventDefault()
  conCorreo((c, k) => cuenta.entrarConCorreo(c, k), document.getElementById('correo-entrar'))
})
document.getElementById('correo-crear').addEventListener('click', e => {
  if (elCorreoClave.value.length < 6) { elCorreoAviso.textContent = 'La contraseña tiene que tener al menos 6 caracteres.'; return }
  conCorreo((c, k) => cuenta.crearConCorreo(c, k), e.currentTarget)
})
document.getElementById('correo-olvido').addEventListener('click', async e => {
  const correo = elCorreoCampo.value.trim()
  if (!correo) { elCorreoAviso.textContent = 'Escribe tu correo y vuelve a pulsar.'; return }
  e.currentTarget.disabled = true
  try {
    await cuenta.recordarClave(correo)
    elCorreoAviso.classList.add('bien')
    elCorreoAviso.textContent = 'Te hemos mandado un correo para cambiar la contraseña (mira también en spam).'
  } catch (err) {
    elCorreoAviso.textContent = errorDeCorreo(err)
  } finally {
    e.currentTarget.disabled = false
  }
})
document.getElementById('correo-cerrar').addEventListener('click', () => elCorreoCapa.classList.add('hidden'))
document.getElementById('cuenta-correo-boton').addEventListener('click', abrirCorreo)
document.getElementById('bienvenida-correo').addEventListener('click', abrirCorreo)

// Arriba, junto al engranaje: silueta sin sesión (abre la bienvenida) o la
// inicial del correo con ella (abre un menú con el correo y cerrar sesión).
const elIrCuenta = document.getElementById('ir-cuenta')
const elCuentaMenu = document.getElementById('cuenta-menu')
const elBienvenida = document.getElementById('bienvenida')
const elBienvenidaEntrar = document.getElementById('bienvenida-entrar')
function pintarCuenta (u) {
  elIrCuenta.classList.toggle('con-sesion', !!u)
  elIrCuenta.querySelector('.cuenta-inicial').textContent = u ? (u.email ?? u.displayName ?? '?').trim().charAt(0).toUpperCase() : ''
  elIrCuenta.setAttribute('aria-label', u ? 'Cuenta: ' + (u.email ?? '') : 'Entrar con Google')
  document.getElementById('cuenta-correo').textContent = u?.email ?? ''
  if (u) elBienvenida.classList.add('hidden')
  else elCuentaMenu.classList.add('hidden')
}
elIrCuenta.addEventListener('click', e => {
  e.stopPropagation()
  if (cuenta.usuario) elCuentaMenu.classList.toggle('hidden')
  else elBienvenida.classList.remove('hidden')
})
addEventListener('click', e => { if (!elCuentaMenu.contains(e.target)) elCuentaMenu.classList.add('hidden') })
document.getElementById('cuenta-salir').addEventListener('click', () => {
  elCuentaMenu.classList.add('hidden')
  cuenta.salir().catch(err => console.warn('Cuenta:', err))
})

// La bienvenida al abrir: sale mientras no haya cuenta, salvo que en los
// últimos 7 días se haya pulsado «Más tarde».
const CLAVE_MAS_TARDE = 'alienz-cuenta-mas-tarde'
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000
elBienvenidaEntrar.addEventListener('click', async () => {
  elBienvenidaEntrar.disabled = true
  try {
    await cuenta.entrar()
    elBienvenida.classList.add('hidden')
  } catch (err) {
    console.warn('Cuenta:', err)
  } finally {
    elBienvenidaEntrar.disabled = false
  }
})
document.getElementById('bienvenida-luego').addEventListener('click', () => {
  elBienvenida.classList.add('hidden')
  try { localStorage.setItem(CLAVE_MAS_TARDE, String(Date.now())) } catch { /* modo privado */ }
})
// Se espera a que se quite la pantalla de carga: encima de ella no se ve.
const ofrecerCuenta = setInterval(() => {
  // La pantalla de carga se quita del árbol al acabar su fundido.
  if (document.getElementById('carga')) return
  clearInterval(ofrecerCuenta)
  let aparcada = 0
  try { aparcada = Number(localStorage.getItem(CLAVE_MAS_TARDE)) || 0 } catch { /* modo privado */ }
  if (haySesionGuardada() || cuenta.usuario || Date.now() - aparcada < SIETE_DIAS) return
  // Solo sobre la portada: no en mitad de una partida que se reanuda.
  if (!elEngranaje.classList.contains('hidden')) elBienvenida.classList.remove('hidden')
}, 700)
document.getElementById('ir-enemigos').addEventListener('click', () => {
  audio.unlock()
  elEnemigosCapa.classList.remove('hidden')
})
document.getElementById('enemigos-volver').addEventListener('click', () => elEnemigosCapa.classList.add('hidden'))

// --- selector de niveles ----------------------------------------------------
// --- segunda pantalla: el mapa del mundo --------------------------------------
//
// El informe lo tenía todo en una sola pantalla —la historia, las amenazas, los
// ajustes y la campaña— y con doce destinos ya no cabía: el botón de jugar
// tapaba el mapa. Con treinta y seis misiones en doce países, mucho menos.
//
// Ahora son tres pantallas, y cada una cuenta su parte de la historia: la
// portada cuenta de dónde viene todo, el mapa cuenta cómo está el mundo según
// lo que llevas limpiado, y cada país abre con su introducción y cierra con su
// desenlace.
const elMapaCapa = document.getElementById('mapa-capa')
const elPaisCapa = document.getElementById('pais-capa')
const elMapaLienzo = document.getElementById('mapa-lienzo')
const zoomMapa = montarZoomMapa(elMapaLienzo, [document.getElementById('mapa-mas'), document.getElementById('mapa-menos')])
let paisActual = 0

// Volver a una pantalla concreta DESPUÉS de recargar.
//
// Ganar y perder recargan la página, y es a propósito: es la manera segura de
// dejar la escena, la economía y los huéspedes exactamente como al arrancar.
// Pero recargar dejaba al jugador en la portada, a dos toques de donde estaba.
// Se apunta a dónde volver y el arranque lo reabre.
window.volverA = destino => {
  try { sessionStorage.setItem('alienz-abrir', destino) } catch { /* sin almacén: vuelve a la portada */ }
  location.reload()
}

function estadoPais (ip, pr) {
  const p = PAISES[ip]
  if (pr.superados > p.ultima) return 'hecho'
  if (nivelJugable(p.primera, pr.superados, pr)) return 'abierto'
  return 'cerrado'
}

// El país que toca: el último en el que se puede entrar. No el primero sin
// limpiar, porque con el peaje de estrellas pueden no ser el mismo.
function paisQueToca (pr) {
  let ip = 0
  for (let i = 0; i < PAISES.length; i++) if (estadoPais(i, pr) !== 'cerrado') ip = i
  return ip
}

// Cómo está el mundo, en una línea que cambia según lo que llevas hecho. El
// mapa es la pantalla a la que se vuelve después de cada misión, así que es el
// sitio natural para que la historia AVANCE en vez de repetirse.
function relatoDelMundo (limpios) {
  if (limpios === 0) return 'Los gobiernos siguen bajo tierra. Hay un campamento suyo en cada país, y arriba solo salimos nosotros. Empieza por España.'
  if (limpios < 4) return `${limpios} de ${PAISES.length} países limpios. Por primera vez en dos años se abren trampillas de búnker, y sale gente a mirar el cielo.`
  if (limpios < 8) return `${limpios} de ${PAISES.length} países limpios. En la sala de Gizeh hay un mapa con puntos encendidos, y los vamos apagando uno a uno.`
  if (limpios < PAISES.length) return `${limpios} de ${PAISES.length} países limpios. Todo lo que les queda está bajando hacia el Amazonas.`
  return 'Los trece países están limpios y los búnkeres, abiertos. Pero los túneles siguen bajando, y nadie sabe hasta dónde.'
}

function abrirMapa () {
  const pr = cargarProgreso()
  paisActual = paisQueToca(pr)
  const limpios = PAISES.filter((_, i) => estadoPais(i, pr) === 'hecho').length
  document.getElementById('mapa-relato').textContent = relatoDelMundo(limpios)
  document.getElementById('mapa-estrellas').innerHTML =
    `<span class="estrella on">★</span> <b>${estrellasTotales(pr)}</b> de ${NIVELES.length * 3}`
  elMapaLienzo.innerHTML = pintarMapa(PAISES, i => estadoPais(i, pr), paisActual)

  ui.hideOverlay()
  elPaisCapa.classList.add('hidden')
  elMapaCapa.classList.remove('hidden')

  // Centrar el país que toca en la caja deslizable. Con un temporizador y no con
  // requestAnimationFrame: en una pestaña de fondo no llegan fotogramas y el
  // mapa se quedaba en Alaska.
  zoomMapa.reiniciar()
  setTimeout(() => {
    const pin = elMapaLienzo.querySelector('.pin-elegido')
    if (!pin) return
    const caja = elMapaLienzo.getBoundingClientRect()
    const p = pin.getBoundingClientRect()
    elMapaLienzo.scrollLeft += (p.left + p.width / 2) - (caja.left + caja.width / 2)
    elMapaLienzo.scrollTop += (p.top + p.height / 2) - (caja.top + caja.height / 2)
  }, 0)
}

elMapaLienzo.addEventListener('click', e => {
  const g = e.target.closest('.pin')
  if (!g) return
  audio.unlock()
  abrirPais(Number(g.dataset.i))
})

// Un país cerrado también se abre: su introducción se lee igual. Lo que no se
// puede es jugar, y la pantalla dice por qué y qué hacer para entrar.
function abrirPais (ip) {
  const pr = cargarProgreso()
  const pais = PAISES[ip]
  if (!pais) return
  const estado = estadoPais(ip, pr)
  paisActual = ip
  if (estado === 'cerrado') audio.denied()

  document.getElementById('pais-lugar').textContent = `País ${ip + 1} de ${PAISES.length}`
  document.getElementById('pais-nombre').textContent = pais.nombre
  document.getElementById('pais-intro').innerHTML = pais.intro.map(t => `<p>${t}</p>`).join('')

  let suyas = 0
  for (let i = pais.primera; i <= pais.ultima; i++) suyas += pr.rangos[i] ?? 0
  document.getElementById('pais-estrellas').innerHTML =
    `<span class="estrella on">★</span> <b>${suyas}</b> de ${pais.misiones.length * 3} en ${pais.nombre}`

  const faltan = estrellasQueFaltan(pais.primera, pr)
  let aviso = ''
  if (estado === 'hecho') {
    aviso = `<div class="pais-desenlace"><span>${pais.nombre} limpio</span><p>${pais.cierre}</p></div>`
  } else if (estado === 'cerrado') {
    const texto = faltan
      ? `Faltan <b>${faltan} ★</b> para entrar. Vuelve a un país ya limpiado y mejora la nota de alguna misión.`
      : `Limpia primero ${PAISES[ip - 1]?.nombre ?? 'el país anterior'}.`
    aviso = `<p class="pais-peaje">${texto}</p>`
  }
  document.getElementById('pais-aviso').innerHTML = aviso

  document.getElementById('pais-misiones').innerHTML = pais.misiones.map((m, im) => {
    const i = pais.primera + im
    const jugable = nivelJugable(i, pr.superados, pr)
    const hecha = i < pr.superados
    const jefe = NIVELES[i].waves.some(w => w.boss)
    const clase = hecha ? 'mision-hecha' : jugable ? 'mision-abierta' : 'mision-cerrada'
    // El candado como SVG del propio juego y no como emoji: el emoji lo dibuja
    // el sistema, cambia entre Android e iOS y no hereda el color del tema.
    const fin = hecha
      ? estrellitas(pr.rangos[i] ?? 0)
      : jugable
        ? '<i class="mision-ir">▶</i>'
        : '<svg class="mision-candado" viewBox="0 0 24 24" aria-label="cerrada"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>'
    return `
      <li>
        <button type="button" class="mision ${clase}" data-i="${i}" ${jugable ? '' : 'disabled'}>
          <span class="mision-num">${im + 1}</span>
          <span class="mision-txt">
            <b>${m.name}</b>
            <small>${m.lugar}</small>
            <em>${m.resumen}</em>
          </span>
          <span class="mision-fin">
            ${fin}
            ${jefe ? '<i class="mision-jefe">jefe</i>' : ''}
          </span>
        </button>
      </li>`
  }).join('')

  elPaisCapa.classList.remove('hidden')
}

document.getElementById('pais-misiones').addEventListener('click', e => {
  const b = e.target.closest('.mision')
  if (!b || b.disabled) return
  nivelActual = Number(b.dataset.i)
  abrirParte(nivelActual)
})
document.getElementById('pais-volver').addEventListener('click', () => {
  elPaisCapa.classList.add('hidden')
})
document.getElementById('mapa-volver').addEventListener('click', () => {
  elMapaCapa.classList.add('hidden')
  ui.el.overlay.classList.remove('hidden')
})
// --- parte de operaciones ----------------------------------------------------
// Entre elegir el tramo y jugarlo hay una pantalla que cuenta a qué vas. Los
// seis partes seguidos son la historia de la compañía subiendo por la carretera,
// y sin ellos superar un nivel solo significaba desbloquear la ficha siguiente.
const elParteCapa = document.getElementById('parte-capa')

function abrirParte (indice) {
  const n = NIVELES[indice]
  // El mismo dibujo que en la ficha, pero aquí en grande: es la pantalla que se
  // lee antes de bajar, y la primera imagen del sitio al que vas.
  const escena = document.getElementById('parte-escena')
  if (escena) escena.firstElementChild.setAttribute('href', '#esc-' + escenaDe(n))
  // El país por encima del sitio: lo primero que hay que saber de un parte de
  // operaciones es a qué parte del mundo te mandan.
  document.getElementById('parte-lugar').textContent = `${n.pais} · ${n.lugar ?? ''}`
  document.getElementById('parte-nombre').textContent = n.name
  document.getElementById('parte-texto').innerHTML =
    (n.parte ?? [n.resumen ?? '']).map(t => `<p>${t}</p>`).join('')

  const oleadas = n.waves.length
  const conJefe = n.waves.some(w => w.boss)
  const yaSacadas = cargarProgreso().rangos[indice]
  document.getElementById('parte-datos').innerHTML = [
    `<span><b>${oleadas}</b> oleadas</span>`,
    conJefe ? '<span class="dato-jefe"><b>Jefe</b> al final</span>' : '',
    // Volver a un campamento ya limpiado es una jugada legítima —es así como se
    // pagan los peajes de más adelante—, así que el parte tiene que decir con
    // qué nota quedó la última vez y cuánto margen queda.
    yaSacadas ? `<span class="dato-marca">${estrellitas(yaSacadas)}${yaSacadas < 3 ? ' por mejorar' : ' al máximo'}</span>` : ''
  ].filter(Boolean).join('')

  pintarMarcador(indice)
  elParteCapa.classList.remove('hidden')
}

// La tabla del tramo, debajo del parte. Se pide cada vez que se abre, pero solo
// con sesión: sin cuenta no hay marcador que leer ni fila que escribir, y el
// juego entero se puede jugar así.
let marcadorPedido = 0
// `donde` es el prefijo de la caja: 'parte' (antes de bajar) o 'ranking'.
async function pintarMarcador (indice, donde = 'parte') {
  const caja = document.getElementById(donde + '-marcador')
  const lista = document.getElementById(donde + '-marcador-lista')
  const pie = document.getElementById(donde + '-marcador-pie')
  if (!caja) return
  if (!cuenta.usuario) {
    // En el parte se esconde sin más; en el ranking, que es a lo que se viene,
    // hay que decir por qué no sale nada.
    if (donde === 'parte') { caja.hidden = true; return }
    lista.innerHTML = '<li class="marcador-vacio">Entra con tu cuenta en Ajustes para ver el ranking.</li>'
    pie.textContent = ''
    return
  }

  caja.hidden = false
  lista.innerHTML = '<li class="marcador-cargando">Pidiendo la tabla…</li>'
  pie.textContent = ''
  const mio = ++marcadorPedido
  try {
    const { leerMarcador } = await import('./systems/marcadores.js')
    const { filas, mio: yo } = await leerMarcador(indice, cuenta.usuario, 10)
    // Otra pantalla se abrió mientras llegaba: lo que vuelve ya no vale.
    if (mio !== marcadorPedido) return
    if (!filas.length) {
      lista.innerHTML = '<li class="marcador-vacio">Nadie ha limpiado este tramo todavía. Sé el primero.</li>'
      return
    }
    lista.innerHTML = filas.map(f => `
      <li class="${f.uid === cuenta.usuario.uid ? 'marcador-yo' : ''}">
        <span class="marcador-puesto">${f.puesto}</span>
        <span class="marcador-alias">${escaparTexto(f.alias ?? '')}</span>
        <span class="marcador-marca">${estrellitas(f.estrellas ?? 0)} ${f.porcentaje}%</span>
      </li>`).join('')
    pie.textContent = yo
      ? (yo.puesto > filas.length ? `Tú vas el ${yo.puesto}.º, con un ${yo.porcentaje}%.` : '')
      : 'Aún no has limpiado este tramo.'
  } catch (e) {
    if (mio !== marcadorPedido) return
    console.warn('Sin marcador:', e)
    lista.innerHTML = '<li class="marcador-vacio">No se ha podido leer la tabla.</li>'
  }
}

// El alias lo escribe el jugador, así que nunca se mete tal cual en el HTML.
const escaparTexto = t => String(t).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

document.getElementById('parte-ir').addEventListener('click', () => {
  elParteCapa.classList.add('hidden')
  start(nivelActual)
})
document.getElementById('parte-volver').addEventListener('click', () => {
  elParteCapa.classList.add('hidden')
})

// --- tienda y cofre -----------------------------------------------------------
// La tienda reaprovecha los retratos que se sacan al arrancar para la armería.
let retratosGuardados = new Map()
let retratosAlien = new Map()

// Al cerrar la tienda solo se recarga si se ha DESBLOQUEADO algo: la armería de
// la partida se monta al arrancar con lo que hay abierto, y una carta comprada
// no aparecería hasta recargar. Canjear monedas o subir una mejora no cambia la
// armería —la mejora se lee al crear cada soldado—, así que no hace falta.
const tienda = crearTienda({
  audio,
  retratos: () => retratosGuardados,
  alCerrar: (origen, cambio) => { if (cambio) window.volverA(origen) }
})
document.getElementById('ir-tienda').addEventListener('click', () => { audio.unlock(); tienda.abrir('portada') })
document.getElementById('mapa-tienda').addEventListener('click', () => { audio.unlock(); tienda.abrir('mapa') })

// El botín de la partida: lo sacado en billetes y el cofre. Va igual en la
// victoria, en la derrota y en el cierre de campaña.
// Al terminar, las monedas sin gastar pasan a la cartera. Ya no se cambian
// solas (27/09): se cambian en la tienda, 100 por billete, cuando el jugador
// quiera. Una vez por partida, antes de pintar el botín, para poder contarlo.
let cuentas = null
function cerrarCuentas () {
  if (cuentas) return cuentas
  const sobran = Math.max(0, Math.floor(economy.coins))
  sumarMonedas(sobran)
  cuentas = { sobran, guardadas: cargarCartera().monedas }
  pintarBilletes()
  return cuentas
}

function htmlBotin () {
  const sacados = billetesPartida
    ? `<p class="botin-billetes"><svg aria-hidden="true"><use href="#i-billete"></use></svg><b>+${billetesPartida}</b> billetes en esta partida</p>`
    : ''
  const c = cerrarCuentas()
  const ahorro = c.sobran || c.cambiados
    ? `<p class="botin-billetes"><svg aria-hidden="true"><use href="#i-moneda"></use></svg><b>+${c.sobran}</b> monedas a la cartera <small>(${c.guardadas} guardadas · cámbialas en la tienda, ${MONEDAS_POR_DOLAR} = 1 billete)</small></p>`
    : ''
  return `<div class="botin">${sacados}${ahorro}<div class="cofre" id="cofre"></div></div>`
}

// El premio se decide y se GUARDA antes de girar: la tira es solo el espectáculo.
// Si alguien pulsa seguir a mitad de giro, lo que le tocó ya está en su cartera.
// La ruleta sale a pantalla completa encima del resultado (como las cajas de
// Counter-Strike, 30/09) y, al recoger, lo que tocó se queda en el resumen.
function abrirCofre (gano, estrellas) {
  abrirBotin({ gano, estrellas, audio, retratos: retratosGuardados }).then(premio => {
    const caja = document.getElementById('cofre')
    if (caja) caja.innerHTML = resumenBotin(premio)
    pintarBilletes()
  })
}

document.getElementById('ir-mapa').addEventListener('click', () => { audio.unlock(); abrirMapa() })

// Si se vuelve de una partida recargando, se reabre la pantalla de la que se
// venía: el mapa tras limpiar un país, el país tras una misión o una derrota.
try {
  const destino = sessionStorage.getItem('alienz-abrir')
  sessionStorage.removeItem('alienz-abrir')
  if (destino === 'mapa') abrirMapa()
  // El duelo se monta más abajo: se abre en cuanto termina de cargar el módulo.
  else if (destino === 'duelo') { abrirMapa(); elMapaCapa.classList.add('hidden'); setTimeout(() => duelo.abrir()) }
  else if (destino?.startsWith('pais:')) { abrirMapa(); abrirPais(Number(destino.slice(5)) || 0) }
} catch { /* sin almacén de sesión: se queda en la portada */ }

// Consola de pruebas: solo existe en desarrollo, no viaja a la versión publicada.
if (import.meta.env.DEV) {
  window.__zr = {
    start,
    simulate,
    // El mundo entero, para las herramientas de medida del navegador
    // (`herramientas/navegador/`): hace falta para preguntarle por la caja del
    // monumento y por dónde se planta la base alien.
    world,
    // Un reto de prueba sin pasar por la nube: hace falta para poder probar la
    // partida de un reto sin tener dos cuentas de Google delante.
    retoDePrueba: async composicion => {
      const { oleadasDeReto } = await import('./systems/retos.js')
      empezarReto({ codigo: 'PRUEB', alias: 'Prueba', composicion, escenario: nivelActual }, oleadasDeReto(composicion))
    },
    render: () => resplandor.render(),
    // Para medir llamadas de dibujo y triángulos (renderer.info).
    renderer,
    fuego,
    resplandor,
    camera,
    scene,
    THREE,
    dropship,
    soldiers,
    zombies,
    mejorHueco,
    economy,
    brasas,
    get director () { return director },
    get nivel () { return nivelActual },
    state: () => ({
      running,
      baseHp,
      wave: director?.wave ?? 0,
      coins: economy.coins,
      pickups: economy.pickups.length,
      zombies: zombies.length,
      soldiers: soldiers.map(s => ({ key: s.key, lane: s.lane, row: s.row, hp: Math.round(s.hp), level: s.level, aim: +s.aim.toFixed(2), objetivo: s.hasTarget, recargando: +s.reloading.toFixed(2), gesto: s.gesture, yaw: +s.aimYaw.toFixed(2), objetivoXZ: s.targetPos ? [+s.targetPos.x.toFixed(1), +s.targetPos.z.toFixed(1)] : null }))
    }),
    place: (key, lane, row) => place(ui.catalog.find(i => i.key === key), lane, row),
    buyCollector: () => buyUpgrade(ui.catalog.find(i => i.key === 'collector')),
    collectAll: () => { for (const p of [...economy.pickups]) economy.collect(p) },
    // Fija a mano hacia dónde mira el primer soldado, para probar el encare.
    aimTest: (x, z) => { if (soldiers[0]) soldiers[0].targetPos = new THREE.Vector3(x, 0, z) },
    strikeAt: (x, z, clave = 'airstrike') => useStrike(ui.catalog.find(i => i.key === clave), new THREE.Vector3(x, 0, z)),
    // Mejora el soldado más avanzado que se pueda pagar.
    upgradeBest: () => {
      const s = soldiers.filter(s => s.canShoot).sort((a, b) => a.level - b.level)[0]
      if (s && economy.spend(upgradeCost(s))) { s.upgrade(); return s.level }
      return 0
    },
    // Cede el turno cada paso para que se resuelvan las creaciones asíncronas.
    // --- atajos de prueba: cada comprobación en una línea ----------------------
    ganarYa: () => { if (running) win() },
    // Soltar un huésped concreto en un carril, para probar lo suyo sin esperar
    // a que salga en una oleada: __zr.meter('leaper', 2)
    meter: (clave, lane = 2) => createZombie(clave, ZOMBIES[clave], lane, 1).then(z => { if (running) alAparecer(z); else scene.remove(z.mesh); return z }),
    asaltarYa: () => { if (running) empezarAsalto() },
    sinVuelo: () => { if (vuelo) terminarVuelo() },
    // Ver una arena del duelo sin montar un duelo: __zr.arena()
    arena: (i = 0) => { const a = ARENAS[i]; world.vestir(a.bioma, [], a.suelo, a.tono) },
    // El plano de llegada a Madrid en el punto k, con la ciudad encendida.
    verEstadio: (k = 0) => {
      const cfg = LLEGADAS[nivelActivo().llegada]
      if (!cfg) return null
      world.verCiudad(true)
      if (scene.fog) { scene.fog.near = cfg.niebla.cerca; scene.fog.far = cfg.niebla.lejos }
      camera.near = 1; camera.far = cfg.lejos; camera.updateProjectionMatrix()
      planoLlegada(cfg, Math.min(k, cfg.planos.at(-1).k))
      world.renderer.render(scene, camera)
      return camera.position.toArray().map(n => +n.toFixed(1))
    },
    get estadioPlanos () { return LLEGADAS[nivelActivo().llegada]?.planos },
    // Para capturar el vuelo: pone la cámara donde empieza y dibuja.
    verVuelo: (k = 0) => {
      const v = world.vistaMonumento()
      if (!v) return null
      const [dx, dy, dz] = v.desde
      const [mx, my, mz] = v.mira
      camera.position.set(dx + (mx - dx) * k, dy + (my - dy) * k, dz + (mz - dz) * k)
      camera.lookAt(mx, my, mz)
      world.renderer.render(scene, camera)
      return v
    },
    perderYa: () => { if (running) lose() },
    darBilletes: n => { sumarBilletes(n); pintarBilletes(); return cargarCartera().billetes },
    desbloquearTodo: () => {
      const c = cargarCartera()
      c.desbloqueadas = [...new Set([...c.desbloqueadas, ...Object.keys(PRECIOS)])]
      localStorage.setItem('alienz-cartera-v1', JSON.stringify(c))
      return 'recarga para verlo en la armería'
    },
    borrarTodo: () => {
      localStorage.removeItem('alienz-cartera-v1')
      localStorage.removeItem('alienz-progreso-v2')
      return 'recarga para empezar de cero'
    },
    abrir: pantalla => {
      if (pantalla === 'mapa') abrirMapa()
      else if (pantalla === 'tienda') tienda.abrir('portada')
      else if (pantalla?.startsWith('pais:')) { abrirMapa(); abrirPais(Number(pantalla.slice(5))) }
    },
    cartera: () => cargarCartera(),
    // Jugar en seco: adelanta la partida sin esperar a los fotogramas.
    //
    // OJO con ceder el turno. Antes hacía `await null`, que solo vacía las
    // microtareas, y con eso los huéspedes y los soldados NO NACEN NUNCA: se
    // crean con promesas que pasan por el cargador de modelos, y ese cargador
    // espera a una tarea de verdad. Medido: 400 pasos de bucle con `await null`
    // = cero bichos; cediendo 50 ms aparecen nueve de golpe. Es decir, que toda
    // medición hecha con esto —el equilibrio de la campaña, por ejemplo— estaba
    // contando una partida en la que no salía nadie.
    //
    // Ahora se cede una tarea de verdad cada veinte pasos (un segundo de
    // partida). Cuesta unos milisegundos por segundo simulado y a cambio lo que
    // se mide es la partida y no un campo vacío.
    run: async (seconds, dt = 1 / 60) => {
      let n = 0
      for (let t = 0; t < seconds; t += dt) {
        simulate(dt)
        if (++n % 20 === 0) await new Promise(r => setTimeout(r))
        else await null
      }
    },
    // Quitar la pausa desde la consola: al medir, un toque perdido en el botón
    // deja `simulate` sin hacer nada y todo sale a cero sin decir por qué.
    despausar: () => pausar(false),
    pausado: () => pausado
  }
}
addEventListener('resize', () => world.resize())
world.resize()

// Los retratos de la armería se sacan del propio modelo. Va después del primer
// ajuste de tamaño y sin bloquear el arranque: si algo fallara, las fichas se
// quedan con el icono del arma y el juego sigue.
// --- pantalla de carga --------------------------------------------------------
// El texto no es decorativo: dice el paso en el que está de verdad. Una barra
// que avanza sola mientras el móvil se ahoga miente, y en un móvil viejo —que es
// donde este segundo se nota— la mentira dura tres.
const elCarga = document.getElementById('carga')
const elCargaRelleno = document.getElementById('carga-relleno')
const elCargaPaso = document.getElementById('carga-paso')

function pintarCarga (parte, texto) {
  if (!elCarga) return
  elCargaRelleno.style.width = Math.round(parte * 100) + '%'
  if (texto) elCargaPaso.textContent = texto
}

function cerrarCarga () {
  if (!elCarga) return
  pintarCarga(1, 'Línea preparada')
  elCarga.classList.add('fuera')
  // Se quita del árbol al acabar el fundido: dejarlo puesto y transparente
  // seguiría atrapando el primer toque sobre el botón de jugar.
  setTimeout(() => elCarga.remove(), 500)
}

// El tramo ya está levantado —texturas, carretera y luces— cuando llega aquí:
// lo que queda son las figuras del informe, y de esas sí se sabe cuántas son.
pintarCarga(0.12, 'Reconociendo el arsenal')

renderPortraits(renderer, (hechas, total) => {
  // Del 12% al 100%: lo de antes ya está hecho y no se puede volver a contar.
  pintarCarga(0.12 + (hechas / total) * 0.88)
})
  .then(({ retratos, amenazas }) => {
    retratosGuardados = retratos
    retratosAlien = amenazas
    ui.setPortraits(retratos)
    pintarAmenazas(amenazas)
    pintarVinetas({ retratos, amenazas })
  })
  .catch(err => console.warn('Sin retratos:', err))
  // Pase lo que pase con los retratos, la pantalla se quita: si fallaran, el
  // juego sigue con el icono del arma en las fichas, y quedarse tapado detrás de
  // una pantalla de carga eterna sería mucho peor que unas fichas sin foto.
  .finally(cerrarCarga)
requestAnimationFrame(frame)

// --- retos entre jugadores ---------------------------------------------------
//
// Montas una oleada con un presupuesto de biomasa, sale un código de cinco
// letras y se lo pasas a quien quieras. El otro la defiende en el mismo
// escenario y los dos veis quién dejó la base más entera. No hay que jugar a la
// vez, que en un móvil es lo único que funciona de verdad.
const elRetosCapa = document.getElementById('retos-capa')
const elRetosLista = document.getElementById('retos-lista')
const elRetoGastado = document.getElementById('reto-gastado')
const elRetoBarra = document.getElementById('reto-barra')
const elRetoCrear = document.getElementById('reto-crear')
const elRetoAviso = document.getElementById('reto-aviso')
const elRetoHecho = document.getElementById('reto-hecho')
let composicion = {}
let catalogoReto = []

async function abrirRetos () {
  const { CATALOGO, CATALOGO_TODO, PRESUPUESTO } = await import('./systems/retos.js')
  catalogoReto = modoMando ? CATALOGO_TODO : CATALOGO
  document.getElementById('reto-presu').textContent = PRESUPUESTO
  if (!Object.keys(composicion).length) composicion = {}
  elRetoHecho.hidden = true
  elRetoAviso.textContent = cuenta.usuario ? '' : 'Para montar retos o jugarlos hace falta entrar con tu cuenta.'
  pintarFilasReto()
  pintarComposicion()
  elMultiCapa.classList.add('hidden')
  elRetosCapa.classList.remove('hidden')
  pintarMando()
  montarAdminMando().then(() => { if (esAdmin) pintarMando() })
}

function pintarFilasReto () {
  elRetosLista.innerHTML = catalogoReto.map(c => `
    <li class="reto-fila" data-clave="${c.clave}">
      <span class="reto-nombre">${c.nombre}</span>
      <span class="reto-coste">${c.coste}</span>
      <span class="reto-mandos">
        <button type="button" class="reto-mas" data-menos="${c.clave}" aria-label="Quitar un ${c.nombre}">−</button>
        <b class="reto-cuantos" id="reto-n-${c.clave}">0</b>
        <button type="button" class="reto-mas" data-mas="${c.clave}" aria-label="Añadir un ${c.nombre}">+</button>
      </span>
    </li>`).join('')
}

async function pintarComposicion () {
  const { costeDe, PRESUPUESTO } = await import('./systems/retos.js')
  const gastado = costeDe(composicion)
  elRetoGastado.textContent = gastado
  elRetoBarra.style.width = `${Math.min(100, gastado / PRESUPUESTO * 100)}%`
  const pasado = gastado > PRESUPUESTO
  elRetoGastado.closest('.retos-presu').classList.toggle('pasado', pasado)
  elRetoBarra.classList.toggle('pasado', pasado)
  // Los contadores pueden no existir aún (la fila de LA MADRE solo sale en modo
  // Mando): se salta la que falte.
  for (const c of catalogoReto) {
    const n = composicion[c.clave] ?? 0
    if (!document.getElementById('reto-n-' + c.clave)) continue
    const cuenta_ = document.getElementById('reto-n-' + c.clave)
    if (!cuenta_) continue
    cuenta_.textContent = n
    // El botón de sumar se apaga cuando ya no cabe: es más claro que dejarte
    // pulsar y no pasar nada.
    const mas = elRetosLista.querySelector(`[data-mas="${c.clave}"]`)
    // El + no se apaga al llegar al tope: si te pasas, el contador se pone en
    // rojo y no deja crear (Isidro: «si se pasa, que salga en rojo y no deje
    // crear el reto»). Así se ve por cuánto te pasas.
    if (mas) mas.disabled = false
    elRetosLista.querySelector(`[data-menos="${c.clave}"]`).disabled = n === 0
  }
  elRetoCrear.disabled = !gastado || pasado || !cuenta.usuario || modoMando
  const publicar = document.getElementById('mando-publicar')
  if (publicar) publicar.disabled = !modoMando || !gastado || pasado || !document.getElementById('mando-titulo').value.trim()
  const avisoMando = document.getElementById('mando-aviso')
  if (avisoMando && pasado) avisoMando.textContent = `Te pasas de ${PRESUPUESTO} de biomasa: quita alienz para poder publicar.`
}

elRetosLista?.addEventListener('click', async e => {
  const mas = e.target.closest('[data-mas]')?.dataset.mas
  const menos = e.target.closest('[data-menos]')?.dataset.menos
  if (!mas && !menos) return
  const clave = mas ?? menos
  const n = composicion[clave] ?? 0
  composicion[clave] = Math.max(0, n + (mas ? 1 : -1))
  if (!composicion[clave]) delete composicion[clave]
  audio.unlock()
  pintarComposicion()
})

elRetoCrear?.addEventListener('click', async () => {
  elRetoCrear.disabled = true
  try {
    const { crearReto } = await import('./systems/retos.js')
    // El escenario es el último tramo que tocaba en la campaña: el que monta el
    // reto ya lo conoce, y el que lo recibe juega en un sitio de verdad.
    const codigo = await crearReto(cuenta.usuario, composicion, nivelActual)
    document.getElementById('reto-codigo-nuevo').textContent = codigo
    elRetoHecho.hidden = false
  } catch (err) {
    console.warn('Sin crear el reto:', err)
    elRetoAviso.textContent = 'No se ha podido crear el reto. Inténtalo otra vez.'
  } finally {
    elRetoCrear.disabled = false
  }
})

document.getElementById('reto-copiar')?.addEventListener('click', async () => {
  const codigo = document.getElementById('reto-codigo-nuevo').textContent
  try {
    await navigator.clipboard.writeText(codigo)
    elRetoAviso.textContent = `Código ${codigo} copiado.`
  } catch {
    elRetoAviso.textContent = `Apunta el código: ${codigo}`
  }
})

document.getElementById('reto-buscar')?.addEventListener('click', async () => {
  const campo = document.getElementById('reto-codigo')
  elRetoAviso.textContent = 'Buscando…'
  try {
    const { leerReto, oleadasDeReto } = await import('./systems/retos.js')
    const reto = await leerReto(campo.value)
    if (!reto) { elRetoAviso.textContent = 'No hay ningún reto con ese código.'; return }
    empezarReto(reto, oleadasDeReto(reto.composicion))
  } catch (err) {
    console.warn('Sin leer el reto:', err)
    elRetoAviso.textContent = 'No se ha podido leer el reto.'
  }
})

function empezarReto (reto, waves) {
  const base = NIVELES[Math.max(0, Math.min(NIVELES.length - 1, reto.escenario ?? 0))]
  // El escenario de la campaña, con las oleadas del reto encima.
  retoEnCurso = { ...reto, nivel: { ...base, name: reto.mando ? `Reto del Líder Supremo: ${reto.titulo}` : `Reto de ${reto.alias ?? 'otro jugador'}`, waves } }
  // Un reto del Mando puede pedir jugarse sin las mejoras de la tienda. Se pone
  // antes de empezar: cada soldado lee sus mejoras al crearse.
  ponerSinMejoras(!!reto.sinMejoras)
  elRetosCapa.classList.add('hidden')
  start(nivelActual)
}

// Al acabar un reto: se apunta la marca, se piden los intentos de todos y se
// enseña la tabla. Aquí es donde el reto deja de ser una partida suelta.
async function finReto (ganado) {
  const reto = retoEnCurso
  retoEnCurso = null
  ponerSinMejoras(false)
  if (reto.mando) return finRetoMando(reto, ganado)
  const porcentaje = ganado ? Math.round(baseHp / BASE.hp * 100) : 0
  ui.banner(ganado ? 'RETO SUPERADO' : 'DESBORDADOS')
  let tabla = ''
  try {
    const { apuntarIntento, intentosDe } = await import('./systems/retos.js')
    await apuntarIntento(cuenta.usuario, reto.codigo, porcentaje)
    const filas = await intentosDe(reto.codigo)
    tabla = `<ol class="marcador-lista">${filas.map(f => `
      <li class="${f.uid === cuenta.usuario?.uid ? 'marcador-yo' : ''}">
        <span class="marcador-puesto">${f.puesto}</span>
        <span class="marcador-alias">${escaparTexto(f.alias ?? '')}</span>
        <span class="marcador-marca">${f.porcentaje}%</span>
      </li>`).join('')}</ol>`
  } catch (err) {
    console.warn('Sin tabla del reto:', err)
  }
  // Lo cobrado, a lo grande (Isidro: «que se vea más claramente la cantidad
  // ganada… billetes dando vueltas como en GTA»); la pantalla de siempre, después.
  if (cobrado) {
    await new Promise(r => setTimeout(r, 700))
    const { celebrarBilletes } = await import('./lluviaBilletes.js')
    await celebrarBilletes({ cantidad: cobrado, titulo: 'RETO SUPERADO', subtitulo: 'billetes del Líder Supremo', audio })
  }
  setTimeout(() => {
    ui.showOverlay(`
      <h1 class="${ganado ? 'won' : 'lost'}">${ganado ? 'AGUANTASTE' : 'PERÍMETRO ROTO'}</h1>
      <p class="tagline">Reto <b>${escaparTexto(reto.codigo)}</b> de ${escaparTexto(reto.alias ?? 'otro jugador')}. Dejaste la base al ${porcentaje}%.</p>
      <div class="marcador">${tabla || '<p class="marcador-vacio">Sin tabla: no se ha podido leer.</p>'}</div>
      <button class="big-btn" onclick="volverA('mapa')">VOLVER AL MAPA</button>`)
  }, 900)
}

document.getElementById('multi-retos')?.addEventListener('click', () => { audio.unlock(); abrirRetos() })
document.getElementById('retos-volver')?.addEventListener('click', () => {
  elRetosCapa.classList.add('hidden')
  volverAlMulti()
})

// --- retos del Mando (29/09) ---------------------------------------------------
// Los publica el administrador para todos, con premio en billetes (ver
// systems/retosMando.js). Salen arriba del todo en Retos; el botón de Retos del
// menú multijugador lleva NUEVO mientras haya uno abierto que no hayas visto.
const CLAVE_MANDO_VISTO = 'alienz-retos-mando-visto-v1'
let modoMando = false
let esAdmin = false
let retosMandoCache = []

async function pintarMando () {
  const caja = document.getElementById('mando-retos')
  const lista = document.getElementById('mando-lista')
  let retos = []
  try {
    const { listarRetosMando } = await import('./systems/retosMando.js')
    retos = await listarRetosMando()
  } catch (e) {
    console.warn('Sin retos del Mando:', e)
  }
  retosMandoCache = retos
  const ahora = Date.now()
  // Cada jugador ve los abiertos; el administrador ve también los cerrados,
  // para poder retirarlos.
  const visibles = retos.filter(r => esAdmin || (r.cierra ?? 0) > ahora)
  caja.hidden = !visibles.length
  if (!visibles.length) return
  try { localStorage.setItem(CLAVE_MANDO_VISTO, String(Math.max(...retos.map(r => r.creado ?? 0)))) } catch {}
  document.getElementById('retos-nuevo').hidden = true
  const { cuantoQueda, superadosDe, yaLoSupere } = await import('./systems/retosMando.js')
  const filas = await Promise.all(visibles.map(async r => {
    const [superados, hecho] = await Promise.all([
      superadosDe(r.id).catch(() => []),
      yaLoSupere(cuenta.usuario, r.id).catch(() => false)
    ])
    return { r, superados, hecho }
  }))
  const N = NIVELES
  lista.innerHTML = filas.map(({ r, superados, hecho }) => {
    const cerrado = (r.cierra ?? 0) <= ahora
    const mapa = N[r.escenario]?.name ?? ''
    return `<li class="mando-reto ${cerrado ? 'cerrado' : ''}" data-id="${escaparTexto(r.id)}">
      <div class="mando-cabeza"><b>${escaparTexto(r.titulo)}</b><span class="mando-premio">+${Number(r.premio) || 0} billetes</span></div>
      ${r.texto ? `<p>${escaparTexto(r.texto)}</p>` : ''}
      <div class="mando-pie">
        <span>${escaparTexto(cuantoQueda(r.cierra, ahora))}</span>
        ${mapa ? `<span>${escaparTexto(mapa)}</span>` : ''}
        ${DIFICULTADES[r.dificultad] ? `<span class="mando-dificultad" style="--dif:${DIFICULTADES[r.dificultad].color}">${DIFICULTADES[r.dificultad].nombre}</span>` : ''}
        ${r.sinMejoras ? '<span>Sin mejoras</span>' : ''}
        <span>${superados.length} lo ${superados.length === 1 ? 'ha' : 'han'} superado</span>
        ${hecho ? '<span class="mando-hecho">✓ Superado y cobrado</span>' : ''}
        ${cerrado ? '' : `<button type="button" class="chip" data-jugar-mando="${escaparTexto(r.id)}">${hecho ? 'Jugar otra vez' : 'Jugar'}</button>`}
        ${esAdmin ? `<button type="button" class="chip chip-ghost" data-retirar-mando="${escaparTexto(r.id)}">Retirar</button>` : ''}
      </div>
    </li>`
  }).join('')
}

document.getElementById('mando-lista')?.addEventListener('click', async e => {
  const jugar = e.target.closest('[data-jugar-mando]')?.dataset.jugarMando
  const retirar = e.target.closest('[data-retirar-mando]')?.dataset.retirarMando
  if (jugar) {
    const r = retosMandoCache.find(x => x.id === jugar)
    if (!r) return
    audio.unlock()
    const { oleadasDeReto } = await import('./systems/retos.js')
    empezarReto({ ...r, mando: true, codigo: r.id, alias: 'el Líder Supremo' }, oleadasDeReto(r.composicion))
  } else if (retirar) {
    if (!confirm('¿Retirar este reto del Líder Supremo? Deja de verse para todos.')) return
    try {
      const { retirarRetoMando } = await import('./systems/retosMando.js')
      await retirarRetoMando(retirar)
      pintarMando()
    } catch (err) {
      console.warn('Sin retirar:', err)
      alert('No se ha podido retirar.')
    }
  }
})

// El panel de publicar: solo para quien esté en `admins/{uid}`.
async function montarAdminMando () {
  const panel = document.getElementById('mando-admin')
  esAdmin = false
  panel.hidden = true
  if (!cuenta.usuario) return
  try {
    const { soyAdmin } = await import('./systems/retosMando.js')
    esAdmin = await soyAdmin(cuenta.usuario)
  } catch { esAdmin = false }
  panel.hidden = !esAdmin
  if (!esAdmin) return
  const sel = document.getElementById('mando-mapa')
  if (!sel.options.length) {
    sel.innerHTML = NIVELES.map((n, i) => `<option value="${i}">${i + 1}. ${escaparTexto(n.name)}</option>`).join('')
    sel.value = String(Math.max(0, Math.min(NIVELES.length - 1, nivelActual)))
  }
  if (!tituloTocado) ponerTituloDelMapa()
}

document.getElementById('mando-modo')?.addEventListener('change', async e => {
  modoMando = e.target.checked
  document.getElementById('mando-campos').hidden = !modoMando
  const { CATALOGO, CATALOGO_TODO } = await import('./systems/retos.js')
  catalogoReto = modoMando ? CATALOGO_TODO : CATALOGO
  pintarFilasReto()
  pintarComposicion()
})
// El título sale solo del mapa (Isidro: «que sea el nombre de la ciudad, que
// lo coja automático del mapa que le indique»). Si lo escribe a mano, se
// respeta hasta que lo borre.
let tituloTocado = false
function ponerTituloDelMapa () {
  const n = NIVELES[Number(document.getElementById('mando-mapa').value) || 0]
  if (n) document.getElementById('mando-titulo').value = `Reto de ${n.name}`.slice(0, 40)
  pintarComposicion()
}
document.getElementById('mando-mapa')?.addEventListener('change', () => { if (!tituloTocado) ponerTituloDelMapa() })
document.getElementById('mando-titulo')?.addEventListener('input', e => {
  tituloTocado = !!e.target.value.trim()
  pintarComposicion()
})

// Dificultad: sale en la carta del reto y, si se pide, monta una oleada de
// su tamaño (de 400 de biomasa la fácil a 1.980 con LA MADRE la extrema), que
// luego se puede retocar con los + y −.
const DIFICULTADES = {
  facil: { nombre: 'Fácil', color: '#5fd97a', oleada: { walker: 10, runner: 6, spitter: 3 } },
  normal: { nombre: 'Normal', color: '#f0c419', oleada: { walker: 12, runner: 8, armored: 4, spitter: 4, leaper: 3, tank: 1 } },
  dificil: { nombre: 'Difícil', color: '#f08a3c', oleada: { walker: 14, runner: 10, armored: 8, spitter: 5, leaper: 5, bloater: 3, healer: 2, tank: 3 } },
  extrema: { nombre: 'Extrema', color: '#e8523f', oleada: { walker: 10, runner: 9, armored: 10, spitter: 6, leaper: 6, bloater: 4, healer: 3, burrower: 3, tank: 3, boss: 1 } }
}
document.getElementById('mando-sugerir')?.addEventListener('click', () => {
  const d = DIFICULTADES[document.getElementById('mando-dificultad').value] ?? DIFICULTADES.normal
  composicion = Object.fromEntries(Object.entries(d.oleada).filter(([k]) => catalogoReto.some(c => c.clave === k)))
  audio.unlock()
  pintarComposicion()
})

document.getElementById('mando-publicar')?.addEventListener('click', async () => {
  const aviso = document.getElementById('mando-aviso')
  const titulo = document.getElementById('mando-titulo').value.trim().slice(0, 40)
  const texto = document.getElementById('mando-texto').value.trim().slice(0, 140)
  const premio = Math.max(0, Math.floor(Number(document.getElementById('mando-premio').value) || 0))
  const dias = Number(document.getElementById('mando-dias').value) || 7
  const dificultad = DIFICULTADES[document.getElementById('mando-dificultad').value] ? document.getElementById('mando-dificultad').value : 'normal'
  const duracion = dias === 365 ? '1 año' : `${dias} ${dias === 1 ? 'día' : 'días'}`
  const escenario = Number(document.getElementById('mando-mapa').value) || 0
  const sinMejoras = document.getElementById('mando-sinmejoras').checked
  if (!titulo) { aviso.textContent = 'Ponle un título.'; return }
  if (!Object.keys(composicion).length) { aviso.textContent = 'Monta la oleada arriba.'; return }
  if (!premio) { aviso.textContent = 'Pon un premio de al menos 1 billete.'; return }
  const { costeDe, PRESUPUESTO: TOPE } = await import('./systems/retos.js')
  if (costeDe(composicion) > TOPE) { aviso.textContent = `Te pasas de ${TOPE} de biomasa.`; return }
  // El premio lo decide el administrador, sin tope; se le pide confirmar para
  // que un cero de más no se cuele sin verlo.
  if (!confirm(`¿Publicar «${titulo}» para todos, con ${premio} billetes para cada uno que lo supere, durante ${duracion}, dificultad ${DIFICULTADES[dificultad].nombre}?`)) return
  const boton = document.getElementById('mando-publicar')
  boton.disabled = true
  aviso.textContent = 'Publicando…'
  try {
    const { publicarRetoMando } = await import('./systems/retosMando.js')
    await publicarRetoMando(cuenta.usuario, {
      titulo, texto, premio, escenario, sinMejoras, dificultad,
      composicion: { ...composicion },
      cierra: Date.now() + dias * 24 * 60 * 60 * 1000
    })
    aviso.textContent = '¡Publicado! Ya lo ve todo el mundo arriba, en Retos del Líder Supremo.'
    composicion = {}
    tituloTocado = false
    ponerTituloDelMapa()
    document.getElementById('mando-texto').value = ''
    pintarComposicion()
    pintarMando()
  } catch (e) {
    console.warn('Sin publicar:', e)
    aviso.textContent = /permission|denied/i.test(String(e?.message ?? e))
      ? 'El servidor no deja publicar: faltan las reglas nuevas o no estás en administradores.'
      : 'No se ha podido publicar. Inténtalo otra vez.'
  } finally {
    boton.disabled = false
    pintarComposicion()
  }
})

// La marca NUEVO del menú: algún reto abierto más nuevo que el último que viste.
async function comprobarRetosNuevos () {
  try {
    const { listarRetosMando } = await import('./systems/retosMando.js')
    const retos = await listarRetosMando()
    let visto = 0
    try { visto = Number(localStorage.getItem(CLAVE_MANDO_VISTO)) || 0 } catch {}
    const ahora = Date.now()
    document.getElementById('retos-nuevo').hidden = !retos.some(r => (r.cierra ?? 0) > ahora && (r.creado ?? 0) > visto)
  } catch (e) {
    console.warn('Sin mirar retos nuevos:', e)
  }
}

// El final de un reto del Mando: si sobreviviste y tienes cuenta, se cobra (una
// vez); se enseña quién más lo ha superado.
async function finRetoMando (reto, ganado) {
  const porcentaje = ganado ? Math.round(baseHp / BASE.hp * 100) : 0
  ui.banner(ganado ? 'RETO SUPERADO' : 'DESBORDADOS')
  let premio = ''
  let lista = ''
  let cobrado = 0
  try {
    const mod = await import('./systems/retosMando.js')
    if (ganado) {
      if (!cuenta.usuario) {
        premio = '<p class="tagline">Lo has superado, pero para cobrar los billetes hace falta entrar con tu cuenta (en Ajustes).</p>'
      } else {
        const r = await mod.apuntarSuperado(cuenta.usuario, reto)
        if (r === 'cobrado') {
          sumarBilletes(Number(reto.premio) || 0)
          pintarBilletes()
          cobrado = Number(reto.premio) || 0
          premio = `<p class="botin-billetes"><svg aria-hidden="true"><use href="#i-billete"></use></svg><b>+${Number(reto.premio) || 0}</b> billetes del Líder Supremo</p>`
        } else if (r === 'ya') {
          premio = '<p class="tagline">Superado otra vez. El premio ya lo cobraste la primera.</p>'
        } else {
          premio = '<p class="tagline">Superado, pero el reto ya se había cerrado: sin premio.</p>'
        }
      }
    }
    const superados = await mod.superadosDe(reto.id)
    lista = superados.length
      ? `<ol class="marcador-lista">${superados.slice(0, 10).map((f, i) => `
        <li class="${f.uid === cuenta.usuario?.uid ? 'marcador-yo' : ''}">
          <span class="marcador-puesto">${i + 1}</span>
          <span class="marcador-alias">${escaparTexto(f.alias ?? '')}</span>
          <span class="marcador-marca">✓</span>
        </li>`).join('')}</ol>`
      : '<p class="marcador-vacio">Nadie lo ha superado todavía.</p>'
  } catch (e) {
    console.warn('Sin cobrar el reto del Mando:', e)
    premio ||= '<p class="tagline">No se ha podido conectar para cobrar. Vuelve a jugarlo con conexión.</p>'
  }
  setTimeout(() => {
    ui.showOverlay(`
      <h1 class="${ganado ? 'won' : 'lost'}">${ganado ? 'AGUANTASTE' : 'PERÍMETRO ROTO'}</h1>
      <p class="tagline">Reto del Líder Supremo <b>${escaparTexto(reto.titulo ?? '')}</b>. ${ganado ? `Base al ${porcentaje}%.` : 'Sin base no hay premio: puedes intentarlo las veces que quieras.'}</p>
      ${premio}
      <div class="marcador"><p class="retos-tit">Lo han superado</p>${lista}</div>
      <button class="big-btn" onclick="volverA('mapa')">VOLVER AL MAPA</button>`)
  }, 900)
}

// --- menú multijugador y ranking ---------------------------------------------
//
// Todo lo que se juega con otros cuelga de un solo botón del mapa.
const elMultiCapa = document.getElementById('multi-capa')
const elRankingCapa = document.getElementById('ranking-capa')
let tramoRanking = 0

document.getElementById('mapa-multi')?.addEventListener('click', () => {
  audio.unlock()
  document.getElementById('multi-intro').textContent = cuenta.usuario
    ? 'Juega contra otros o junto a ellos.'
    : 'Juega contra otros o junto a ellos. Para los retos y el ranking hace falta entrar con tu cuenta en Ajustes.'
  abrirMulti()
})

// Cada vez que se entra al menu: la ficha puede haber cambiado (una partida
// contra la maquina, un duelo ganado) y los retratos pueden haber terminado
// despues de la primera vez.
function volverAlMulti () {
  elMultiCapa.classList.remove('hidden')
  comprobarRetosNuevos()
  pintarVinetas({ retratos: retratosGuardados, amenazas: retratosAlien })
  pintarMiFicha({ cuenta, escapar: escaparTexto }).catch(e => console.warn('Sin ficha:', e))
}
function abrirMulti () {
  elMapaCapa.classList.add('hidden')
  volverAlMulti()
}
document.getElementById('multi-volver')?.addEventListener('click', () => {
  elMultiCapa.classList.add('hidden')
  elMapaCapa.classList.remove('hidden')
})

function pintarRanking () {
  const n = NIVELES[tramoRanking]
  document.getElementById('ranking-pais').textContent = `${tramoRanking + 1} de ${NIVELES.length} · ${n.pais}`
  document.getElementById('ranking-lugar').textContent = n.name
  document.getElementById('ranking-antes').disabled = tramoRanking === 0
  document.getElementById('ranking-despues').disabled = tramoRanking === NIVELES.length - 1
  pintarMarcador(tramoRanking, 'ranking')
}
document.getElementById('multi-ranking')?.addEventListener('click', () => {
  audio.unlock()
  // Se abre en el último tramo que has tocado, que es el que te interesa.
  tramoRanking = Math.max(0, Math.min(NIVELES.length - 1, nivelActual))
  pintarRanking()
  elMultiCapa.classList.add('hidden')
  elRankingCapa.classList.remove('hidden')
})
document.getElementById('ranking-antes')?.addEventListener('click', () => { tramoRanking = Math.max(0, tramoRanking - 1); pintarRanking() })
document.getElementById('ranking-despues')?.addEventListener('click', () => { tramoRanking = Math.min(NIVELES.length - 1, tramoRanking + 1); pintarRanking() })
// --- expediente ------------------------------------------------------------------
montarExpediente({ cargarProgreso, audio })

// --- 1 contra 1 ------------------------------------------------------------------
// Las arenas, hechas en Blender (herramientas/blender/arena_*.py). El suelo del
// campo va con cada una: arena en el Coliseo, ceniza en el cráter, chapa en la base.
// Las fotos de las figuras para la camara del duelo: una sola vez por sesion,
// y solo si se entra a jugar en linea.
let fotosCampoPedidas = null
const ARENAS = [
  { nombre: 'El Coliseo', bioma: 'arena', suelo: 'tierra', tono: 0x9a8462 },
  { nombre: 'El Cráter', bioma: 'arenaCrater', suelo: 'tierra', tono: 0x6e5e52 },
  { nombre: 'La Base', bioma: 'arenaBase', suelo: 'losas', tono: 0x6a737e }
]
const duelo = crearDuelo({
  cuenta,
  audio,
  escapar: escaparTexto,
  juego: {
    empezar (semilla) {
      // Tres arenas; la semilla elige, así los dos móviles juegan en la misma.
      const arena = ARENAS[semilla % ARENAS.length]
      const nivel = {
        ...NIVELES[0],
        name: arena.nombre,
        pais: 'Arena',
        bioma: arena.bioma,
        suelo: arena.suelo,
        tonoSuelo: arena.tono,
        hitos: [],
        dureza: 0.07,
        waves: oleadasArena(semilla),
        azar: azarConSemilla(semilla),
        escala: () => duelo.escala()
      }
      dueloEnCurso = { nivel }
      // Todo el arsenal abierto y sin mejoras, igual para los dos. El premio
      // único del cofre se queda fuera: no lo tiene casi nadie.
      const todas = new Set([...Object.keys(SOLDIERS), ...Object.keys(DEFENSES), ...Object.keys(STRIKES), 'collector'])
      for (const k of PREMIOS_UNIDAD) todas.delete(k)
      ui.filtrarCartas(todas)
      ponerSinMejoras(true)
      for (const id of ['multi-capa', 'duelo-capa', 'retos-capa', 'coop-capa', 'ranking-capa']) document.getElementById(id)?.classList.add('hidden')
      start(nivelActual)
    },
    meterAlien (clave, lane) {
      const spec = ZOMBIES[clave]
      const escala = (1 + 0.07 * Math.max(0, director.wave - 1)) * duelo.escala()
      createZombie(clave, spec, lane, escala).then(z => { if (running) alAparecer(z); else scene.remove(z.mesh) })
    },
    campo: () => ({
      base: baseHp / BASE.hp * 100,
      zombies: zombies.map(z => ({ key: z.key, x: z.mesh.position.x, z: z.mesh.position.z })),
      soldiers: soldiers.map(s => ({ key: s.key, lane: s.lane, row: s.row }))
    }),
    // La oleada por la que va la partida: aguantando es LA marca, así que el
    // duelo necesita poder preguntarla.
    oleada: () => director.wave,
    parar () { running = false; audio.stopMusic() },
    banner: t => ui.banner(t),
    rotulo: t => ui.setWave(t),
    retratoAlien: k => retratosAlien.get?.(k) ?? null,
    // Para la camara del campo del rival: con que calidad dibujarla, de que
    // color es el suelo de esta arena, y las fotos de las figuras.
    calidad: () => calidad.nivel,
    paleta: () => BIOMAS[nivelActivo()?.bioma] ?? null,
    fotosCampo: () => (fotosCampoPedidas ??= import('./systems/fotosCampo.js').then(async m => {
      const t0 = performance.now()
      const f = await m.fotografiarCampo(renderer)
      if (import.meta.env.DEV) window.__fotos = { cuantas: f.size, ms: Math.round(performance.now() - t0), mapa: f }
      return f
    })),
    final (gane, html, conCofre) {
      setTimeout(() => {
        ui.showOverlay(`${html}
          ${conCofre ? '<div class="botin"><div class="cofre" id="cofre"></div></div>' : ''}
          <button class="big-btn" onclick="volverA('duelo')">OTRO DUELO</button>
          <button class="chip chip-ghost" onclick="volverA('mapa')">Volver al mapa</button>`)
        if (conCofre) abrirCofre(true, 2)
      }, 900)
    }
  }
})
document.getElementById('multi-duelo')?.addEventListener('click', () => {
  audio.unlock()
  elMultiCapa.classList.add('hidden')
  duelo.abrir()
})
document.getElementById('duelo-volver')?.addEventListener('click', () => {
  duelo.cerrar()
  volverAlMulti()
})

document.getElementById('ranking-volver')?.addEventListener('click', () => {
  elRankingCapa.classList.add('hidden')
  volverAlMulti()
})

// --- cooperativo: la pantalla del invitado -----------------------------------
//
// El invitado no simula: mantiene un ESPEJO de lo que hay en el campo del
// anfitrión. Cada instantánea trae quién está vivo y dónde; aquí se crean los
// que aparecen, se mueven los que siguen y se quitan los que ya no vienen.
//
// Las figuras tardan en construirse (modelos y texturas), así que se pide una
// sola vez por identificador y se apunta como "en camino": sin eso, a ocho
// instantáneas por segundo se pedirían ocho copias del mismo huésped.
const espejoZ = new Map()
const espejoS = new Map()
const enCamino = new Set()

function pintarPartidaRemota (dt) {
  const estado = coop.interpolado()
  if (!estado) return

  baseHp = estado.baseHp
  ui.setBase(baseHp / BASE.hp)
  ui.setWave(`Oleada ${estado.oleada} / ${estado.total}`)
  ui.setCoins?.(estado.dinero)

  const vivos = new Set()
  for (const z of estado.zombies) {
    vivos.add(z.id)
    const mio = espejoZ.get(z.id)
    if (!mio) {
      if (enCamino.has('z' + z.id) || !ZOMBIES[z.key]) continue
      enCamino.add('z' + z.id)
      createZombie(z.key, ZOMBIES[z.key], 2).then(nuevo => {
        enCamino.delete('z' + z.id)
        marcarBrillo(nuevo.mesh)
        scene.add(nuevo.mesh)
        espejoZ.set(z.id, nuevo)
      }).catch(() => enCamino.delete('z' + z.id))
      continue
    }
    mio.mesh.position.x = z.x
    mio.mesh.position.z = z.z
    mio.mesh.visible = !z.bajoTierra
    mio.hp = Math.max(0, z.vida * mio.maxHp)
    mio.bar.set(z.vida)
    mio.update(dt, camera, true)
  }
  for (const [id, mio] of espejoZ) {
    if (vivos.has(id)) continue
    scene.remove(mio.mesh)
    espejoZ.delete(id)
  }

  const puestos = new Set()
  for (const s of estado.soldiers) {
    puestos.add(s.id)
    const mio = espejoS.get(s.id)
    if (!mio) {
      const spec = SOLDIERS[s.key] ?? DEFENSES[s.key]
      if (enCamino.has('s' + s.id) || !spec) continue
      enCamino.add('s' + s.id)
      createSoldier(s.key, spec, s.lane, s.row).then(nuevo => {
        enCamino.delete('s' + s.id)
        marcarBrillo(nuevo.mesh)
        scene.add(nuevo.mesh)
        espejoS.set(s.id, nuevo)
      }).catch(() => enCamino.delete('s' + s.id))
      continue
    }
    mio.hp = Math.max(0, s.vida * mio.maxHp)
    mio.bar.set(s.vida)
    mio.update(dt, camera)
  }
  for (const [id, mio] of espejoS) {
    if (puestos.has(id)) continue
    scene.remove(mio.mesh)
    espejoS.delete(id)
  }

  effects.update(dt)
  marcas.update(dt)
  economy.update(dt)
}

function limpiarEspejo () {
  for (const [, z] of espejoZ) scene.remove(z.mesh)
  for (const [, s] of espejoS) scene.remove(s.mesh)
  espejoZ.clear()
  espejoS.clear()
  enCamino.clear()
}

// --- cooperativo: la sala ----------------------------------------------------
//
// Dos transportes posibles (ver `transporte.js`): el de la nube, que es el que
// se usa de verdad, y el local, que solo existe en desarrollo para poder probar
// la partida a dos con dos pestañas de este ordenador.
let coop = null
let tramoDelAnfitrion = 0
const modoInvitado = () => !!coop && !coop.esAnfitrion
const elCoopCapa = document.getElementById('coop-capa')
const elCoopAviso = document.getElementById('coop-aviso')
const elCoopHecho = document.getElementById('coop-hecho')
const elCoopEmpezar = document.getElementById('coop-empezar')

async function abrirTransporte (codigo) {
  // En desarrollo, y sin cuenta, se usa el canal local: así el cooperativo se
  // puede probar entero sin depender de la red ni de tener dos cuentas.
  if (import.meta.env.DEV && !cuenta.usuario) {
    const { transporteLocal } = await import('./systems/transporte.js')
    return transporteLocal(codigo)
  }
  const { transporteNube } = await import('./systems/transporte.js')
  return transporteNube(codigo, cuenta.usuario)
}

async function montarSala (codigo, papel) {
  const { crearSesion } = await import('./systems/cooperativo.js')
  const transporte = await abrirTransporte(codigo)
  coop = crearSesion(transporte, papel)
  coop.codigo = codigo

  if (coop.esAnfitrion) {
    // Las órdenes del invitado: colocar cuesta lo mismo y sale de la misma caja,
    // así que se atienden con el mismo camino que un toque propio.
    coop.alOrden(orden => {
      if (orden?.tipo !== 'colocar') return
      const spec = orden.clase === 'defense' ? DEFENSES[orden.clave] : SOLDIERS[orden.clave]
      if (!spec) return
      place({ key: orden.clave, type: orden.clase, cost: spec.cost }, orden.lane, orden.row)
    })
    coop.alJugadores(lista => {
      const otros = (lista ?? []).filter(j => j !== coop.yo)
      document.getElementById('coop-gente').textContent = otros.length
        ? 'El segundo jugador ya está dentro.'
        : 'Esperando al segundo jugador…'
      elCoopEmpezar.disabled = !otros.length
    })
  } else {
    // El invitado empieza cuando el anfitrión arranca: la primera instantánea
    // que llega es la señal de que la partida está en marcha.
    coop.transporte.escuchar('partida', p => { tramoDelAnfitrion = p?.nivel ?? 0 })
    coop.alEstado(() => {
      if (running) return
      elCoopCapa.classList.add('hidden')
      empezarComoInvitado()
    })
  }
  return coop
}

function empezarComoInvitado () {
  limpiarEspejo()
  // El mismo tramo que el anfitrión: paisaje, suelo y cielo.
  nivelActual = Math.max(0, Math.min(NIVELES.length - 1, tramoDelAnfitrion))
  const suyo = NIVELES[nivelActual]
  world.vestir(suyo.bioma, suyo.hitos, suyo.suelo, suyo.tonoSuelo, suyo.escenario)
  ambient.vestir(suyo, world.alturaEn)
  baseHp = BASE.hp
  running = true
  ui.hideOverlay()
  document.getElementById('mapa-capa')?.classList.add('hidden')
  audio.unlock()
  audio.startMusic()
  ui.banner('DEFENSA COMPARTIDA')
}

document.getElementById('multi-coop')?.addEventListener('click', async () => {
  audio.unlock()
  elCoopHecho.hidden = true
  elCoopAviso.textContent = ''
  elMultiCapa.classList.add('hidden')
  elCoopCapa.classList.remove('hidden')
})

document.getElementById('coop-crear')?.addEventListener('click', async () => {
  elCoopAviso.textContent = 'Abriendo la sala…'
  try {
    const { codigoDeSala } = await import('./systems/cooperativo.js')
    const codigo = codigoDeSala()
    await montarSala(codigo, 'anfitrion')
    coop.yo = cuenta.usuario?.uid ?? 'anfitrion-' + codigo
    coop.presentarse(coop.yo)
    document.getElementById('coop-codigo').textContent = codigo
    elCoopHecho.hidden = false
    elCoopAviso.textContent = ''
  } catch (err) {
    console.warn('Sin sala:', err)
    elCoopAviso.textContent = 'No se ha podido abrir la sala. Falta activar la base de datos en tiempo real.'
  }
})

document.getElementById('coop-unirse')?.addEventListener('click', async () => {
  const codigo = document.getElementById('coop-codigo-campo').value.trim().toUpperCase()
  if (!/^[A-Z2-9]{4}$/.test(codigo)) { elCoopAviso.textContent = 'El código son cuatro letras o números.'; return }
  elCoopAviso.textContent = 'Entrando…'
  try {
    await montarSala(codigo, 'invitado')
    coop.yo = cuenta.usuario?.uid ?? 'invitado-' + Math.random().toString(36).slice(2, 7)
    coop.presentarse(coop.yo)
    elCoopAviso.textContent = 'Dentro. Esperando a que el anfitrión empiece…'
  } catch (err) {
    console.warn('Sin entrar:', err)
    elCoopAviso.textContent = 'No se ha podido entrar en la sala.'
  }
})

elCoopEmpezar?.addEventListener('click', () => {
  elCoopCapa.classList.add('hidden')
  start(nivelActual)
})

document.getElementById('coop-volver')?.addEventListener('click', () => {
  coop?.cerrar()
  coop = null
  limpiarEspejo()
  elCoopCapa.classList.add('hidden')
  volverAlMulti()
})
