import * as THREE from 'three'
import './style.css'
import { FIELD, BASE, NIVELES, SOLDIERS, DEFENSES, STRIKES, ZOMBIES } from './config.js'
import { createWorld, rowZ, laneX } from './world.js'
import { createSoldier, upgradeCost, muzzleWorld, ejectorWorld } from './entities/soldier.js'
import { createEconomy } from './systems/economy.js'
import { createWaveDirector } from './systems/waves.js'
import { createDropship } from './entities/dropship.js'
import { createEffects } from './systems/effects.js'
import { createAmbient } from './systems/ambient.js'
import { createAudio } from './audio.js'
import { createUI } from './ui.js'
import { renderPortraits } from './portraits.js'
import { cargarProgreso, superarNivel, nivelJugable, RANGOS, rangoDe, campañaCompleta } from './systems/progreso.js'
import { crearResplandor, marcarBrillo } from './systems/resplandor.js'
import { crearGolpes } from './systems/golpes.js'
import { crearCalidad, NIVELES as CALIDADES, leerPreferencia } from './systems/calidad.js'

const canvas = document.getElementById('scene')
const world = createWorld(canvas)
const { scene, camera, renderer } = world
const effects = createEffects(scene, camera)
const economy = createEconomy(scene)
// El ambiente vive aunque la partida esté parada: en el menú también sopla viento.
const ambient = createAmbient(scene)
// La nave vive fuera de la partida: se queda oculta hasta que el director avisa.
const dropship = createDropship()
scene.add(dropship.group)
const audio = createAudio()
const golpes = crearGolpes(scene, effects, audio)

// Resplandor selectivo. Se crea después del mundo y la nave para que ya estén
// marcadas las mallas que emiten luz.
marcarBrillo(scene)
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
    audio.place()
    effects.floatText(soldier.mesh.position, `NV ${soldier.level}`, '#5fd97a', 52)
    ui.refreshInspector(soldier, economy.coins)
  },
  onMove (soldier) {
    moving = soldier
    ui.clearSelection()
    world.setSlotsVisible(true)
  },
  onDeselect () { world.setSlotsVisible(false) }
})

economy.onChange(v => ui.setCoins(v))
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
    const avance = (z.z - FIELD.spawnZ) / (FIELD.baseZ - FIELD.spawnZ)
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
  const centro = (FIELD.lanes - 1) / 2
  const orden = []
  for (let l = 0; l < FIELD.lanes; l++) {
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
  const filas = item.spec.blocker ? [3, 2, 1, 0] : [0, 1, 2, 3]
  for (const { lane } of orden) {
    for (const row of filas) {
      if (!occupied.has(slotKey(lane, row))) return { lane, row }
    }
  }
  return null
}

async function place (item, lane, row) {
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

  // No aparecen en su casilla: entran por detrás de la línea y suben andando.
  // Las barreras sí aparecen puestas — un saco terrero no camina.
  if (!spec.blocker) {
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
  audio.place()

  if (!economy.canAfford(item.cost)) { ui.clearSelection(); world.setSlotsVisible(false) }
}

function useStrike (item, point) {
  if (!economy.spend(item.cost)) return audio.denied()
  const spec = STRIKES[item.key]

  // El daño ya no cae en el mismo fotograma que el toque: cae cuando llega lo
  // que has pedido. Con el avión eso son segundo y medio, y en segundo y medio
  // la horda ha andado: el golpe deja de ser "dónde están" y pasa a ser "dónde
  // van a estar". Por eso el aro marca el sitio desde el instante del toque.
  golpes.lanzar(item.key, point, (donde, radio) => {
    for (const z of zombies) {
      if (z.intocable) continue
      const d = z.mesh.position.distanceTo(donde)
      if (d > radio) continue
      // Menos daño en el borde: acertar de lleno tiene que valer más que rozar.
      z.hurt(spec.damage * (1 - (d / radio) * 0.45), 1)
    }
  })

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
      if (total) { audio.coin(); effects.floatText(donde, `+${total}`) }
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
    if (s && !s.spec.blocker) {
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

function casillaBajoDedo (e, rect) {
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(world.slots.children, false)
  return hits.length ? hits[0].object.userData : null
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

  const c = casillaBajoDedo(e, rect)
  if (!c) return
  const ocupante = occupied.get(slotKey(c.lane, c.row))
  // Su propia casilla cuenta como libre: soltar donde estaba es cancelar.
  world.resaltarSlot(c.lane, c.row, !ocupante || ocupante === arrastre.soldado)
})

function soltarArrastre (e) {
  if (!arrastre) return
  const { soldado, activo } = arrastre
  arrastre = null

  if (!activo) {
    // No se movió: era un toque, y un toque sobre un soldado es consultarlo.
    if (!soldado.dead) ui.openInspector(soldado, economy.coins)
    return
  }

  world.setSlotsVisible(false)
  if (soldado.dead) return

  const c = casillaBajoDedo(e, canvas.getBoundingClientRect())
  if (!c) return
  const destino = slotKey(c.lane, c.row)
  if (occupied.has(destino)) {
    // Si es la suya, no hay nada que hacer y tampoco es un error.
    if (occupied.get(destino) !== soldado) audio.denied()
    return
  }
  occupied.delete(slotKey(soldado.lane, soldado.row))
  soldado.moveTo(c.lane, c.row)
  occupied.set(destino, soldado)
  audio.place()
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

// A quién le dispara cada uno. Por defecto, al más adelantado del carril: el que
// está a punto de cruzar es el que importa. Dos unidades no siguen esa regla, y
// es justo lo que las hace valer su precio.
//
// Los huéspedes marcados como anchos (Coloso y jefe) ocupan tanto que también
// les disparan desde los carriles de al lado; si no, al jefe solo lo pelea una
// columna de cinco soldados y es imbatible.
function alcanzables (soldier) {
  const lista = []
  for (const z of zombies) {
    if (z.dead || z.intocable) continue
    if (Math.abs(z.lane - soldier.lane) > (z.spec.wide ? 1 : 0)) continue
    if (Math.abs(z.z - soldier.pz) > soldier.spec.range) continue
    lista.push(z)
  }
  return lista
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

function soldierFire (soldier, target) {
  const spec = soldier.spec
  const from = muzzleWorld(soldier, tmpA)
  const to = tmpB.copy(target.mesh.position).setY(1.0)
  const pierce = spec.armorPierce ?? 0
  soldier.onFire()
  audio.shot(soldier.key)

  // Cada arma se ve distinta al disparar, no solo suena distinto.
  if (spec.projectile === 'arrow') {
    effects.arrow(from, to)
  } else if (spec.flame) {
    effects.flame(from, -1, spec.range)
  } else if (spec.mortarShot) {
    const impact = to.clone()
    effects.smoke(from, 4, 0x8f8f8f)
    effects.mortar(from, impact, p => {
      audio.boom()
      effects.burst(p, 0xffb03a, 14, 1.8)
      effects.burst(p, 0x4a4a4a, 8, 1.1)
      splashDamage(p, spec.splash, soldier.damage, pierce)
    })
    return   // el daño lo hace la explosión, no el disparo
  } else {
    effects.tracer(from, to)
    effects.shell(ejectorWorld(soldier, tmpC))  // la vaina salta por el costado
    if (Math.random() < 0.4) effects.smoke(from, 1)
  }

  const shots = spec.pellets ?? 1
  target.hurt(soldier.damage * shots, pierce)
  effects.burst(target.mesh.position, 0xc0402f, 3, 0.7)

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
      if (z === target || z.dead || z.lane !== soldier.lane) continue
      if (z0 - z.z > spec.range || z.z > z0) continue
      z.hurt(soldier.damage, pierce)
    }
  }
}

// Brasas del lanzallamas: manchas de asfalto ardiendo que siguen cobrando
// después de que el soldado deje de disparar. Se reaprovechan de una lista fija
// en vez de crearse y destruirse, porque el lanzallamas dispara seis veces por
// segundo y crear un disco nuevo en cada llamarada llenaba el recolector de
// basura de mallas muertas.
const brasas = []
const BRASA_GEO = new THREE.CircleGeometry(1, 14)

function prenderBrasas (soldier, target) {
  const spec = soldier.spec.brasas
  // Una sola por llamarada, y solo si no hay ya una encendida ahí mismo: sin
  // esto el suelo se cubría de discos superpuestos y el daño se multiplicaba
  // por seis por segundo.
  for (const b of brasas) {
    if (b.t > 0 && Math.abs(b.malla.position.x - target.mesh.position.x) < 1.2 &&
        Math.abs(b.malla.position.z - target.mesh.position.z) < 1.2) { b.t = spec.dura; return }
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
  brasa.malla.position.set(target.mesh.position.x, 0.05, target.mesh.position.z)
  brasa.malla.scale.setScalar(spec.radio)
  brasa.malla.visible = true
  brasa.t = spec.dura
  brasa.dura = spec.dura
  brasa.daño = spec.daño
  brasa.radio = spec.radio
}

function updateBrasas (dt) {
  for (const b of brasas) {
    if (b.t <= 0) continue
    b.t -= dt
    if (b.t <= 0) { b.malla.visible = false; continue }
    // Late y se va apagando: un disco naranja fijo parecía una calcomanía.
    const k = b.t / b.dura
    b.malla.material.opacity = 0.15 + k * 0.4 + Math.sin(b.t * 11) * 0.06
    b.malla.scale.setScalar(b.radio * (0.9 + k * 0.15))
    for (const z of zombies) {
      if (z.dead) continue
      const dx = z.mesh.position.x - b.malla.position.x
      const dz = z.mesh.position.z - b.malla.position.z
      if (dx * dx + dz * dz > b.radio * b.radio) continue
      // El fuego ignora el blindaje: es lo que hace del lanzallamas la respuesta
      // a los Encostrados y lo que justifica sus doscientas de biomasa.
      z.hurt(b.daño * dt, 1)
    }
    if (Math.random() < dt * 9) effects.smoke(b.malla.position, 1, 0x6b6b6b)
  }
}

function blockerAhead (zombie) {
  // Bajo tierra o en el aire no hay nada que le pare.
  if (zombie.intocable) return null
  // El soldado vivo más cercano por delante en su carril.
  let best = null
  for (const s of soldiers) {
    if (s.dead || s.lane !== zombie.lane) continue
    if (s.pz <= zombie.z) continue
    if (!best || s.pz < best.pz) best = s
  }
  return best
}

function killZombie (z, index) {
  zombies.splice(index, 1)

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
  dropCorpse(z.mesh, -1)          // cae de espaldas, hacia donde venía
  economy.drop(z.mesh.position, z.spec.coins)
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
    const centro = laneX(a.lane)
    const margen = FIELD.laneWidth * 0.5
    a.mesh.position.x = Math.min(centro + margen, Math.max(centro - margen, a.mesh.position.x))
  }
}

function damageBase (amount) {
  baseHp = Math.max(0, baseHp - amount)
  ui.setBase(baseHp / BASE.hp)
  audio.thud()
  if (baseHp <= 0) lose()
}

// ---------------------------------------------------------------------------
// bucle
// ---------------------------------------------------------------------------
let last = performance.now()

function simulate (dt) {
  // En pausa no avanza NADA: ni la horda, ni los efectos, ni la nave. Congelar
  // solo la partida y dejar el humo subiendo se lee como que el juego se ha
  // colgado, no como una pausa.
  if (pausado) return
  if (running) {
    if (economy.update(dt)) audio.coin()
    director.update(dt, zombies.length)

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

      // --- Escarbador: viaja hundido y sale por detrás de la línea ----------
      if (z.bajoTierra) {
        z.mesh.position.z += z.velocidad * dt
        z.mesh.position.y = -2.2
        // Un montículo de tierra que avanza: sin esto sería un enemigo que
        // aparece de la nada, y eso se lee como un fallo, no como una mecánica.
        if (Math.random() < dt * 14) effects.burst(tmpB.set(z.mesh.position.x, 0.1, z.mesh.position.z), 0xc4a173, 2, 0.5)
        if (z.z >= z.spec.escarba.hasta) { z.bajoTierra = false; z.emergiendo = 0.55 }
        continue
      }
      if (z.emergiendo > 0) {
        z.emergiendo -= dt
        const k = Math.max(0, z.emergiendo / 0.55)
        z.mesh.position.y = -2.2 * k * k
        if (z.emergiendo <= 0) {
          z.mesh.position.y = 0
          effects.burst(z.mesh.position, 0xc4a173, 16, 1.6)
          audio.thud()
        }
        z.update(dt, camera, true)
        continue
      }

      // --- Saltador: por encima de la barrera -------------------------------
      if (z.salto) {
        const s2 = z.salto
        s2.t += dt
        const k = Math.min(1, s2.t / s2.dur)
        z.mesh.position.z = s2.z0 + (s2.z1 - s2.z0) * k
        // Parábola: sube y baja. Sin la altura se leía como un teletransporte.
        z.mesh.position.y = Math.sin(k * Math.PI) * 2.6
        z.mesh.rotation.x = -Math.sin(k * Math.PI) * 0.5
        if (k >= 1) {
          z.salto = null
          z.mesh.position.y = 0
          z.mesh.rotation.x = 0
          effects.burst(z.mesh.position, 0x7dffe4, 8, 1.1)
        }
        z.bar.face(camera, dt)
        continue
      }

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

      z.update(dt, camera, !attacking)

      if (attacking) {
        // Se planta a distancia de mordisco y ahí se queda. Sin este tope, la
        // cola que empuja por detrás acababa colando al de delante AL OTRO LADO
        // del soldado, y desde allí ya nadie le bloqueaba el paso a la base.
        z.mesh.position.z = Math.min(z.mesh.position.z, blocker.pz - reach)
        z.attackCd -= dt
        if (z.attackCd <= 0) {
          z.attackCd = 1 / z.spec.attackRate
          blocker.hurt(z.spec.damage)
          // La alambrada devuelve parte del mordisco: no dispara, pero desangra.
          if (blocker.spec.thorns) {
            z.hurt(blocker.spec.thorns, 0.5)
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
          scene.remove(z.mesh)
          zombies.splice(i, 1)
        }
      }
    }

    // La memoria se descuenta siempre, haya horda o no: lo que importa es por
    // dónde han bajado ÚLTIMAMENTE, no el total histórico.
    for (let l = 0; l < FIELD.lanes; l++) presion[l] *= Math.max(0, 1 - dt * 0.06)

    separarHuespedes()

    audio.setIntensity(Math.min(1, zombies.length / 14 + (1 - baseHp / BASE.hp) * 0.6))
  }

  effects.update(dt)
  golpes.update(dt)
  updateCorpses(dt)
  if (running) updateBrasas(dt)
  ambient.update(dt)
  // Fuera del bloque de partida en curso: al perder, la nave tiene que poder
  // terminar de irse en vez de quedarse congelada sobre la carretera.
  dropship.update(dt)
}

function frame (now) {
  requestAnimationFrame(frame)
  // El tiempo REAL del fotograma, sin recortar, es el que mide la calidad: con
  // el recorte de 50 ms un móvil ahogado parecería ir siempre a veinte justos.
  const real = now - last
  const dt = Math.min(0.05, real / 1000)
  last = now
  calidad.medir(real)
  simulate(dt)
  resplandor.render()
}

// ---------------------------------------------------------------------------
// arranque y final
// ---------------------------------------------------------------------------
function win () {
  running = false
  audio.stopMusic()
  const nivel = NIVELES[nivelActual]
  const antes = cargarProgreso()
  const porcentaje = Math.round(baseHp / BASE.hp * 100)
  const rango = RANGOS[rangoDe(porcentaje)]
  const primeraVez = nivelActual >= antes.superados
  const progreso = superarNivel(nivelActual, porcentaje)
  const siguiente = NIVELES[nivelActual + 1]
  const mejora = !(nivelActual in antes.rangos) || rangoDe(porcentaje) > antes.rangos[nivelActual]

  // Lo que se acaba de abrir, con su nombre de verdad. "Has desbloqueado 2
  // objetos" no dice nada; "Escopetero, Alambrada" sí.
  const nuevas = primeraVez
    ? (nivel.desbloquea ?? []).map(k => (SOLDIERS[k] ?? DEFENSES[k] ?? STRIKES[k] ?? { name: k }).name)
    : []

  // Los tres últimos niveles no abren arsenal —ya lo tienes todo—, así que su
  // pantalla de victoria se quedaba en un título y una línea. El rango le da a
  // CADA victoria algo que enseñar, y de paso una razón para repetir un nivel
  // que ya está superado: dejarlo mejor de como quedó.
  const sello = `
    <div class="sello sello-${rangoDe(porcentaje)}">
      <span class="sello-letra">${rango.corto}</span>
      <span class="sello-txt"><b>${rango.nombre}</b><em>Perímetro al ${porcentaje}%${mejora && !primeraVez ? ' · mejor marca' : ''}</em></span>
    </div>`

  if (!siguiente && campañaCompleta(progreso)) {
    // Fin de campaña. No es un nivel más superado: es el último, y merece una
    // pantalla que no se parezca a las otras cinco.
    const marcas = NIVELES.map((n, i) => {
      const r = RANGOS[progreso.rangos[i] ?? 0]
      return `<li><span class="marca-letra marca-${progreso.rangos[i] ?? 0}">${r.corto}</span>${n.name}</li>`
    }).join('')
    ui.showOverlay(`
      <p class="eyebrow">Carretera 7 · informe de cierre</p>
      <h1>CARRETERA LIMPIA</h1>
      <p class="tagline">Seis tramos. La siembra no pasó de ninguno.</p>
      ${sello}
      <p class="cierre">${nivel.cierre ?? ''} La compañía cobra y levanta el
      campamento. Pero el túnel del nido sigue bajando, y nadie de los que
      firmaron aquel contrato sabe hasta dónde.</p>
      <ol class="marcas">${marcas}</ol>
      <button class="big-btn" onclick="location.reload()">VOLVER AL INFORME</button>`)
    return
  }

  ui.showOverlay(`
    <h1>LÍNEA INTACTA</h1>
    <p class="tagline">«${nivel.name}» bajo control.</p>
    ${sello}
    ${nivel.cierre ? `<p class="cierre">${nivel.cierre}</p>` : ''}
    ${nuevas.length ? `<div class="premio"><span class="premio-tit">Arsenal liberado</span>${nuevas.map(n => `<b>${n}</b>`).join('')}</div>` : ''}
    <button class="big-btn" onclick="location.reload()">${siguiente ? 'AL SIGUIENTE' : 'VOLVER AL INFORME'}</button>`)
}

function lose () {
  running = false
  audio.stopMusic()
  ui.banner('DESBORDADOS')
  setTimeout(() => ui.showOverlay(`
    <h1 class="lost">PERÍMETRO ROTO</h1>
    <p class="tagline">La siembra pasó de la línea en la oleada ${director.wave} de ${director.total} de ${NIVELES[nivelActual].name}.</p>
    <button class="big-btn" onclick="location.reload()">REINTENTAR</button>`), 900)
}

// Dejar el tablero como recién puesto. Empezar significa empezar: sin esto, una
// segunda partida heredaba los defensores y la vida de base de la anterior. Hoy
// lo usan dos sitios —arrancar un nivel y abandonar desde la pausa— y el segundo
// SÍ vuelve al menú sin recargar, así que ya no es una trampa teórica.
function limpiarPartida () {
  for (const s of soldiers) scene.remove(s.mesh)
  for (const z of zombies) scene.remove(z.mesh)
  for (const c of corpses) scene.remove(c.mesh)
  soldiers.length = 0
  zombies.length = 0
  corpses.length = 0
  occupied.clear()
  presion.fill(0)
  economy.reset()
  golpes.limpiar()
  for (const b of brasas) { b.t = 0; b.malla.visible = false }
  dropship.ocultar()
  baseHp = BASE.hp
  ui.setBase(1)
  ui.closeInspector()
}

function start (indice = nivelActual) {
  nivelActual = Math.max(0, Math.min(NIVELES.length - 1, indice))
  limpiarPartida()
  ui.hideOverlay()
  audio.unlock()
  audio.startMusic()
  director = createWaveDirector(
    NIVELES[nivelActual],
    z => { marcarBrillo(z.mesh); scene.add(z.mesh); zombies.push(z) },
    (n, total, boss) => {
      ui.setWave(`Oleada ${n} / ${total}`)
      ui.banner(boss ? 'LA MADRE' : `OLEADA ${n}`)
      if (boss) audio.groan(true)
    },
    () => setTimeout(win, 1200),
    (n, jefe) => dropship.llegar(n, jefe),
    () => dropship.partir()
  )
  running = true
  last = performance.now()
}

// --- pausa --------------------------------------------------------------------
const elPausaCapa = document.getElementById('pausa-capa')
const elPausa = document.getElementById('pausa')

function pausar (v) {
  // Solo tiene sentido con una partida en curso: en el menú no hay nada que
  // detener, y el botón está tapado por el propio informe.
  if (!running && v) return
  pausado = v
  elPausaCapa.classList.toggle('hidden', !v)
  elPausa.setAttribute('aria-pressed', v ? 'true' : 'false')
  // Al reanudar hay que refrescar el reloj: si no, el primer fotograma tras la
  // pausa traería todo el rato transcurrido de golpe y la horda daría un salto.
  if (!v) last = performance.now()
}

elPausa.addEventListener('click', () => pausar(!pausado))
document.getElementById('pausa-seguir').addEventListener('click', () => pausar(false))
document.getElementById('pausa-salir').addEventListener('click', () => {
  pausar(false)
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
  ui.el.overlay.innerHTML.includes('niveles') || pintarNiveles()
  ui.el.overlay.classList.remove('hidden')
  ui.setWave('Preparados')
}

// --- ajustes de calidad -------------------------------------------------------
const elCalidadOps = document.getElementById('calidad-ops')
const elCalidadPie = document.getElementById('calidad-pie')
const elAjustesValor = document.getElementById('ajustes-valor')

const OPCIONES = [
  ['auto', 'Auto', 'El juego mide cómo va y sube o baja la calidad solo. Es lo recomendable: acierta más que cualquiera de nosotros dos, porque lo mide en TU móvil.'],
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
  // En automático se enseña además en qué escalón está ahora mismo, que es la
  // única forma de saber si el móvil está dando de sí o va justo.
  elAjustesValor.textContent = elegida === 'auto'
    ? `Auto · ${CALIDADES[calidad.nivel].nombre}`
    : actual?.[1] ?? ''
}

pintarCalidad()
// El escalón puede cambiar solo mientras se juega, así que la etiqueta se
// refresca al abrir los ajustes en vez de quedarse con lo que había al cargar.
document.getElementById('ajustes').addEventListener('toggle', pintarCalidad)

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

// --- informe de amenazas ----------------------------------------------------
// Nueve fichas con la cara del bicho. Lo que dice cada una NO es su vida ni su
// velocidad —eso no significa nada antes de haber jugado— sino qué hace y qué
// te va a romper, que es lo único que sirve para prepararse.
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
const fichasAmenaza = new Map()

function pintarAmenazas (caras = null) {
  // La primera pasada monta la cuadrícula sin retratos; la segunda, cuando las
  // fotos están listas, solo rellena las imágenes. Montarla dos veces perdería
  // la ficha que el jugador tuviera abierta.
  if (!fichasAmenaza.size) {
    const claves = Object.keys(ZOMBIES).filter(k => !ZOMBIES[k].boss)
    elAmenazasN.textContent = claves.length
    for (const clave of claves) {
      const spec = ZOMBIES[clave]
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'amenaza'
      b.style.setProperty('--a-tinte', '#' + spec.color.toString(16).padStart(6, '0'))
      b.innerHTML = `<img class="amenaza-cara" alt="" hidden><b>${NOMBRE_CORTO[clave] ?? spec.name}</b>`
      b.addEventListener('click', () => {
        for (const [, otra] of fichasAmenaza) otra.classList.remove('elegida')
        b.classList.add('elegida')
        elAmenazasPie.innerHTML = `<b>${spec.name}.</b> ${QUE_HACE[clave] ?? ''}`
      })
      elAmenazas.appendChild(b)
      fichasAmenaza.set(clave, b)
    }
  }
  if (!caras) return
  for (const [clave, ficha] of fichasAmenaza) {
    const url = caras.get(clave)
    if (!url) continue
    const img = ficha.querySelector('.amenaza-cara')
    img.src = url
    img.hidden = false
    img.alt = ZOMBIES[clave].name
  }
}

pintarAmenazas()

// --- selector de niveles ----------------------------------------------------
// El menú deja elegir entre los superados y el siguiente, nunca más allá: cada
// nivel abre el arsenal que hace falta para el que viene, y saltarse uno deja
// al jugador delante de una oleada que no puede responder con lo que tiene.
const elNiveles = document.getElementById('niveles')
const elStart = document.getElementById('start')

// Seis niveles no caben como seis tarjetas: el botón de jugar acababa tapando
// la tercera y las tres últimas quedaban fuera de la pantalla. Se dibujan como
// una fila de fichas numeradas y, debajo, el detalle SOLO del elegido — que
// además es como se usa esto: eliges uno, no te lees los seis.
function pintarNiveles () {
  const { superados, rangos } = cargarProgreso()
  // El que toca: el primero sin superar, o el último si ya está todo hecho.
  nivelActual = Math.min(superados, NIVELES.length - 1)
  elNiveles.innerHTML = ''

  const fila = document.createElement('div')
  fila.className = 'nivel-fila'
  NIVELES.forEach((nivel, i) => {
    const abierto = nivelJugable(i, superados)
    const hecho = i < superados
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'nivel-ficha'
    b.disabled = !abierto
    b.dataset.estado = hecho ? 'hecho' : abierto ? 'abierto' : 'cerrado'
    // La ficha de un nivel hecho enseña CÓMO se hizo, no solo que se hizo:
    // una S y una C son la misma victoria pero no la misma partida, y eso da
    // una razón para volver a un nivel ya superado.
    b.textContent = hecho ? RANGOS[rangos[i] ?? 0].corto : abierto ? String(i + 1) : '🔒'
    if (hecho) b.dataset.rango = rangos[i] ?? 0
    b.setAttribute('aria-label', `Nivel ${i + 1}: ${abierto ? nivel.name : 'bloqueado'}`)
    b.addEventListener('click', () => { nivelActual = i; marcarElegido() })
    fila.appendChild(b)
  })
  elNiveles.appendChild(fila)

  const detalle = document.createElement('div')
  detalle.className = 'nivel-detalle'
  detalle.id = 'nivel-detalle'
  elNiveles.appendChild(detalle)

  marcarElegido()
}

function marcarElegido () {
  const { superados, rangos } = cargarProgreso()
  const fichas = [...elNiveles.querySelector('.nivel-fila').children]
  for (const [i, b] of fichas.entries()) b.classList.toggle('elegida', i === nivelActual)

  const nivel = NIVELES[nivelActual]
  const total = nivel.waves.length
  const conJefe = nivel.waves.some(w => w.boss)
  const abre = (nivel.desbloquea ?? []).length
  document.getElementById('nivel-detalle').innerHTML = `
    <b>${nivelActual + 1} · ${nivel.name}</b>
    <span class="nivel-lugar">${nivel.lugar}</span>
    <em>${nivel.resumen}</em>
    <span class="nivel-datos">
      <i>${total} oleadas</i>
      ${conJefe ? '<i class="jefe">con jefe</i>' : ''}
      ${abre ? `<i class="abre">abre ${abre}</i>` : ''}
    </span>`

  // Texto corto y fijo: con el nombre del nivel dentro se partía en dos líneas.
  // Cuál se va a jugar ya lo dice la ficha marcada justo encima.
  elStart.textContent = 'AGUANTAR LA LÍNEA'
}

pintarNiveles()
// --- parte de operaciones ----------------------------------------------------
// Entre elegir el tramo y jugarlo hay una pantalla que cuenta a qué vas. Los
// seis partes seguidos son la historia de la compañía subiendo por la carretera,
// y sin ellos superar un nivel solo significaba desbloquear la ficha siguiente.
const elParteCapa = document.getElementById('parte-capa')

function abrirParte (indice) {
  const n = NIVELES[indice]
  document.getElementById('parte-lugar').textContent = n.lugar ?? ''
  document.getElementById('parte-nombre').textContent = n.name
  document.getElementById('parte-texto').innerHTML =
    (n.parte ?? [n.resumen ?? '']).map(t => `<p>${t}</p>`).join('')

  const oleadas = n.waves.length
  const conJefe = n.waves.some(w => w.boss)
  document.getElementById('parte-datos').innerHTML = [
    `<span><b>${oleadas}</b> oleadas</span>`,
    conJefe ? '<span class="dato-jefe"><b>Jefe</b> al final</span>' : '',
    n.desbloquea?.length ? `<span><b>${n.desbloquea.length}</b> por liberar</span>` : ''
  ].filter(Boolean).join('')

  elParteCapa.classList.remove('hidden')
}

document.getElementById('parte-ir').addEventListener('click', () => {
  elParteCapa.classList.add('hidden')
  start(nivelActual)
})
document.getElementById('parte-volver').addEventListener('click', () => {
  elParteCapa.classList.add('hidden')
})

elStart.addEventListener('click', () => abrirParte(nivelActual))

// Consola de pruebas: solo existe en desarrollo, no viaja a la versión publicada.
if (import.meta.env.DEV) {
  window.__zr = {
    start,
    simulate,
    render: () => resplandor.render(),
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
    run: async (seconds, dt = 1 / 60) => {
      for (let t = 0; t < seconds; t += dt) { simulate(dt); await null }
    }
  }
}
addEventListener('resize', () => world.resize())
world.resize()

// Los retratos de la armería se sacan del propio modelo. Va después del primer
// ajuste de tamaño y sin bloquear el arranque: si algo fallara, las fichas se
// quedan con el icono del arma y el juego sigue.
renderPortraits(renderer)
  .then(({ retratos, amenazas }) => { ui.setPortraits(retratos); pintarAmenazas(amenazas) })
  .catch(err => console.warn('Sin retratos:', err))
requestAnimationFrame(frame)
