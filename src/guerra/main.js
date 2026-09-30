// Guerra civil (27/09/2026): soldados contra soldados, sin alienz.
//
// Isidro lo quería «como una guerra de bandas por el territorio»: dos bases en
// las puntas, una carretera en medio, cada uno manda soldados que avanzan
// disparando y gana la compañía que entra en la base del otro. Y sobre todo que
// no afecte al juego: por eso vive en su propia página y solo toma prestadas
// las figuras, los efectos y el sonido.
//
// Reglas que solo valen aquí:
//   · Las mejoras de la tienda NO cuentan. Se mejora dentro de la partida, con
//     las monedas de la partida, y se pierde al salir.
//   · Se juega con lo desbloqueado, y lo que no se tiene se puede desbloquear
//     para esa partida (más caro).
//   · Monedas: goteo fijo más un extra por cada baja.
//   · Cinco minutos. Si nadie ha entrado, gana quien más vida le quitó al otro.

import * as THREE from 'three'
import './guerra.css'
import { SOLDIERS, DEFENSES, INICIALES, BASE } from '../config.js'
import { createSoldier, muzzleWorld } from '../entities/soldier.js'
import { buildSoldierMesh } from '../assets.js'
import { createEffects } from '../systems/effects.js'
import { createAudio } from '../audio.js'
import { renderPortraits } from '../portraits.js'
import { cargarCartera, ponerSinMejoras } from '../systems/cartera.js'
import { crearCampo, CAMPO, carrilX, MITAD, COLOR } from './campo.js'
import { crearRed } from './red.js'
import { filtrar, FRASES, MAX_MENSAJE, ESPERA_MENSAJE } from '../systems/duelo.js'

ponerSinMejoras(true)

// --- números del modo (todos aquí, para reequilibrar sin buscar) ----------------
const REGLAS = {
  duracion: 300,
  monedasIniciales: 200,
  goteo: 5,              // monedas por segundo, para cada bando
  botinBaja: 0.5,        // parte del coste de la baja que cobra quien la hace
  botinDefensa: 0.3,
  precioDesbloqueo: 2.5, // × coste, para lo que no tienes desbloqueado
  nivelMax: 3,
  // Mejorar un tipo sube a TODOS los de ese tipo, los que hay y los que vengan.
  precioMejora: (coste, nivel) => Math.round(coste * 1.2 * Math.pow(2, nivel - 1)),
  dañoEntrada: coste => Math.round(6 + coste / 40)
}
const TROPAS = ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil', 'mortar', 'capitan']
const DEFENSAS = ['sandbags', 'spikes', 'mines', 'erizos', 'torreta']
// El capitán no se desbloquea en partida: solo lo trae quien lo sacó del cofre.
const SOLO_COFRE = new Set(['capitan'])
// De serie en la Guerra civil (Isidro, 29/09): empezando de cero solo había
// arquero y todo lo demás con candado. Aquí se tiene la mitad de la tropa (las
// cuatro más baratas) y los sacos, aunque en la campaña no estén comprados.
// Solo en este modo: la cartera no se toca.
const DE_SERIE = ['archer', 'rifle', 'shotgun', 'sniper', 'sandbags']

const $ = id => document.getElementById(id)
const lienzo = $('gc-lienzo')
const { renderer, scene, camera, animar, emblema, girar, ponerMapa } = crearCampo(lienzo)
// 'pueblo' (el de siempre) o 'prueba' (texturas y objetos de Poly Haven). Solo se
// juega en el de prueba contra la máquina, desde su botón del menú.
let mapa = 'pueblo'
const effects = createEffects(scene, camera)
const audio = createAudio()

// --- estado de la partida ---------------------------------------------------------
let bandos = null
let unidades = []
let jugando = false
let tiempo = 0
let elegida = null      // { tipo: 'tropa' | 'defensa', key }
let modo = 'soltar'     // 'soltar' sale y avanza; 'colocar' se queda donde toques

function nuevoBando (nombre, tengo) {
  const azul = nombre === 'azul'
  return {
    nombre,
    monedas: REGLAS.monedasIniciales,
    vida: BASE.hp,
    dañoHecho: 0,
    bajas: 0,
    // Hacia dónde avanza: el azul sube (z negativa), el rojo baja.
    dir: azul ? -1 : 1,
    miBase: azul ? CAMPO.baseAzul : CAMPO.baseRoja,
    suBase: azul ? CAMPO.baseRoja : CAMPO.baseAzul,
    tengo: new Set(tengo),
    niveles: {}
  }
}
const rival = b => b === bandos.azul ? bandos.rojo : bandos.azul
const nivelDe = (bando, key) => bando.niveles[key] ?? 1
// La línea de defensa: hasta aquí llega como mínimo lo que colocas. Isidro:
// «al sacar un soldado debería avanzar mínimo hasta la línea que defiende,
// porque si no queda oculto»: lo que se quedaba pegado a la base caía debajo de
// la tira de cartas.
const LINEA = CAMPO.baseAzul - 7
const enMiMitad = (bando, z) => bando.dir < 0 ? z > MITAD + 1 : z < MITAD - 1

// --- crear unidades -----------------------------------------------------------------
async function crearUnidad (bando, key, x, z, orden) {
  const esDefensa = !!DEFENSES[key]
  const spec = esDefensa ? DEFENSES[key] : SOLDIERS[key]
  // Los soldados de siempre también en el mapa de prueba: el de Quaternius
  // (soldadoPrueba.js) no era el estilo del juego y se guarda para otro.
  const s = await createSoldier(key, spec, 2, 0)
  if (!jugando) return null
  s.px = s.destX = x
  s.pz = s.destZ = z
  s.mesh.position.set(x, 0, z)
  if (bando.dir > 0) {
    s.yawReposo = Math.PI
    s.aimYaw = s.wantYaw = Math.PI
  }
  for (let i = 1; i < nivelDe(bando, key); i++) s.upgrade()
  pintarBando(s.mesh, COLOR[bando.nombre], esDefensa ? 0.15 : 0.5)
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.78, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: COLOR[bando.nombre], transparent: true, opacity: 0.85, depthWrite: false })
  )
  aro.position.y = 0.03
  s.mesh.add(aro)
  scene.add(s.mesh)
  const u = {
    s, bando, key, esDefensa, orden,
    x, holdZ: z,
    ritmoBase: s.ritmo,
    // Las cargas van enterradas y los erizos no se pueden «matar» a tiros: el
    // rival no los ve como blanco, se los encuentra.
    oculta: key === 'mines' || key === 'erizos'
  }
  unidades.push(u)
  return u
}

// Mismo soldado, otro uniforme: se tiñe cada material hacia el color del
// bando. Se clonan porque las figuras comparten materiales entre copias.
function pintarBando (raiz, color, cuanto) {
  const c = new THREE.Color(color)
  raiz.traverse(o => {
    if (!o.isMesh || !o.material) return
    const lista = Array.isArray(o.material) ? o.material : [o.material]
    const nuevos = lista.map(m => {
      if (!m.color || m.depthTest === false) return m   // la barra de vida no
      const n = m.clone()
      // `tinte` lo fija quien hizo la figura (el soldado del kit); `ropa` es la
      // del arquero, que se tiñe poco.
      const k = typeof m.userData?.tinte === 'number' ? m.userData.tinte : m.userData?.ropa ? cuanto * 0.3 : cuanto
      n.color.lerp(c, k)
      return n
    })
    o.material = Array.isArray(o.material) ? nuevos : nuevos[0]
  })
}

async function mandarTropa (bando, key, x, orden, holdZ) {
  const spec = SOLDIERS[key]
  if (bando.monedas < spec.cost) return false
  bando.monedas -= spec.cost
  const u = await crearUnidad(bando, key, x, bando.miBase + bando.dir * -0.5, orden)
  if (!u) return false
  if (orden === 'mantener') u.holdZ = holdZ
  u.s.entrando = true
  return true
}

async function ponerDefensa (bando, key, x, z) {
  const spec = DEFENSES[key]
  if (bando.monedas < spec.cost) return false
  bando.monedas -= spec.cost
  await crearUnidad(bando, key, x, z, 'fija')
  return true
}

// --- combate ------------------------------------------------------------------------
const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()

function blancoPara (u) {
  const s = u.s
  const alcance = s.spec.range ?? 0
  if (!alcance) return null
  let mejor = null
  let mejorValor = Infinity
  for (const o of unidades) {
    if (o.bando === u.bando || o.s.dead || o.oculta) continue
    const dx = o.s.px - s.px
    const dz = o.s.pz - s.pz
    const d = Math.hypot(dx, dz)
    if (d > alcance) continue
    // El tirador busca al más duro; el resto, al más cercano.
    const valor = s.spec.buscaDuro ? -o.s.hp : d
    if (valor < mejorValor) { mejor = o; mejorValor = valor }
  }
  return mejor
}

// Detrás de unos sacos propios se recibe menos: es para lo que están.
function cobertura (o) {
  if (o.esDefensa) return 1
  for (const d of unidades) {
    if (d.bando !== o.bando || d.key !== 'sandbags' || d.s.dead) continue
    const delante = (d.s.pz - o.s.pz) * o.bando.dir
    if (Math.abs(d.s.px - o.s.px) < 1.3 && delante > 0 && delante < 3) return 0.6
  }
  return 1
}

function herir (o, daño, quien) {
  if (o.s.dead) return
  o.s.hurt(daño * cobertura(o))
  if (o.s.dead) morir(o, quien)
}

function morir (o, quien) {
  o.s.dead = true
  const p = o.s.mesh.position
  effects.burst(tmpA.copy(p).setY(1), o.esDefensa ? 0x9a8a6a : 0x8a1f1f, 8, 1)
  if (quien) {
    const botin = Math.round(o.s.spec.cost * (o.esDefensa ? REGLAS.botinDefensa : REGLAS.botinBaja))
    quien.monedas += botin
    quien.bajas++
    if (quien === yoB()) effects.floatText(tmpA.copy(p).setY(2), `+${botin}`)
  }
  if (o.s.spec.revienta) reventar(o)
}

function reventar (o) {
  const { daño, radio } = o.s.spec.revienta
  const p = o.s.mesh.position
  audio.boom()
  effects.burst(tmpA.copy(p).setY(0.6), 0xffb03a, 16, 2)
  effects.burst(tmpA.copy(p).setY(0.6), 0x3a3a3a, 10, 1.3)
  for (const e of unidades) {
    if (e.bando === o.bando || e.s.dead) continue
    if (Math.hypot(e.s.px - p.x, e.s.pz - p.z) < radio) herir(e, daño, o.bando)
  }
}

function enArea (bando, centro, radio, daño) {
  for (const e of unidades) {
    if (e.bando === bando || e.s.dead || e.oculta) continue
    const d = Math.hypot(e.s.px - centro.x, e.s.pz - centro.z)
    if (d < radio) herir(e, daño * (1 - 0.5 * d / radio), bando)
  }
}

// `soloVer`: el invitado pinta los disparos que le llegan, sin hacer daño (la
// vida ya la calcula el anfitrión).
function disparar (u, blanco, soloVer = false) {
  const s = u.s
  u.disparos = (u.disparos ?? 0) + 1
  u.blancoId = blanco.s.id
  const spec = s.spec
  const from = muzzleWorld(s, tmpA)
  const to = tmpB.copy(blanco.s.mesh.position).setY(1)
  s.onFire()
  audio.shot(u.key === 'torreta' ? 'gunner' : u.key)
  const daño = s.damage * (s.spec.pellets ?? 1)
  if (spec.projectile === 'arrow') {
    effects.arrow(from, to)
  } else if (spec.flame) {
    effects.flame(from, u.bando.dir, spec.range)
    // La llamarada quema todo lo que tiene delante en su franja.
    if (!soloVer) for (const e of unidades) {
      if (e.bando === u.bando || e.s.dead || e.oculta) continue
      const delante = (e.s.pz - s.pz) * u.bando.dir
      if (delante > 0 && delante < spec.range && Math.abs(e.s.px - s.px) < 1.4) herir(e, s.damage, u.bando)
    }
    return
  } else if (spec.misilShot || spec.mortarShot) {
    const impacto = to.clone()
    effects.smoke(from, 3, 0x9a9a9a)
    effects[spec.misilShot ? 'misil' : 'mortar'](from, impacto, p => {
      if (!jugando) return
      audio.boom()
      effects.burst(p, 0xffb03a, 14, 1.8)
      effects.burst(p, 0x4a4a4a, 8, 1.1)
      if (!soloVer) enArea(u.bando, p, spec.splash, s.damage)
    })
    return
  } else {
    effects.tracer(from, to)
    if (Math.random() < 0.3) effects.smoke(from, 1)
  }
  if (!soloVer) herir(blanco, daño, u.bando)
}

function paso (dt) {
  if (!jugando) return
  tiempo += dt
  bandos.azul.monedas += REGLAS.goteo * dt
  bandos.rojo.monedas += REGLAS.goteo * (rol === 'solo' ? duro.ingreso : 1) * dt
  if (rol === 'solo') maquina(dt)
  else for (const o of colaOrdenes.splice(0)) ejecutar(bandos.rojo, o)

  // El capitán anima a los suyos de alrededor, como en la campaña.
  for (const u of unidades) u.s.animo = 1
  for (const c of unidades) {
    if (c.key !== 'capitan' || c.s.dead) continue
    for (const u of unidades) {
      if (u.bando === c.bando && u !== c && Math.hypot(u.s.px - c.s.px, u.s.pz - c.s.pz) < 5) u.s.animo = 1.25
    }
  }

  for (const u of unidades) {
    const s = u.s
    if (s.dead) continue

    // Lo que tienen en el suelo los del otro bando: frena, pincha o revienta.
    let frena = 1
    if (!u.esDefensa) {
      for (const d of unidades) {
        if (!d.esDefensa || d.bando === u.bando || d.s.dead) continue
        if (Math.abs(d.s.px - s.px) > 1.3 || Math.abs(d.s.pz - s.pz) > 1.1) continue
        if (d.key === 'mines') { herir(d, 999, u.bando); continue }
        if (d.key === 'erizos') {
          frena = Math.min(frena, d.s.spec.frena.factor)
          d.s.hurt(d.s.spec.frena.desgaste * 20 * dt)
          if (d.s.dead) morir(d, u.bando)
        }
        if (d.key === 'spikes') {
          frena = Math.min(frena, 0.5)
          herir(u, d.s.spec.thorns * dt, d.bando)
        }
      }
      if (s.dead) continue
    }
    s.ritmo = u.ritmoBase * frena

    const blanco = blancoPara(u)
    if (blanco) {
      s.andando = false
      s.targetPos = blanco.s.mesh.position
      s.hasTarget = true
      s.cooldown -= dt
      if (s.canShoot && s.cooldown <= 0 && !s.busy && s.aim > 0.6) {
        s.cooldown = 1 / s.fireRate
        disparar(u, blanco)
      }
    } else if (!u.esDefensa) {
      s.targetPos = null
      s.hasTarget = false
      // Un muro enemigo delante corta el paso: hay que tirarlo.
      const muro = unidades.find(d => d.bando !== u.bando && d.s.spec.blocker && !d.s.dead && !d.oculta &&
        Math.abs(d.s.px - s.px) < 1.2 && (d.s.pz - s.pz) * u.bando.dir > 0 && (d.s.pz - s.pz) * u.bando.dir < 1.4)
      if (muro) {
        s.andando = false
      } else if (u.orden === 'avanza') {
        s.destX = u.x
        s.destZ = u.bando.suBase + u.bando.dir * 4
        s.andando = true
        s.modoPaso = 'trote'
      } else if (u.orden === 'mantener' && Math.abs(s.pz - u.holdZ) > 0.2) {
        s.destX = u.x
        s.destZ = u.holdZ
        s.andando = true
        s.modoPaso = 'correr'
      }
    }

    s.update(dt, camera)

    // ¿Ha entrado en la base del otro?
    if (!u.esDefensa && (s.pz - u.bando.suBase) * u.bando.dir > 0.5) {
      const daño = REGLAS.dañoEntrada(s.spec.cost)
      const otro = rival(u.bando)
      otro.vida = Math.max(0, otro.vida - daño)
      u.bando.dañoHecho += daño
      u.entro = true
      s.dead = true
      audio.boom()
      effects.burst(tmpA.copy(s.mesh.position).setY(1.2), COLOR[u.bando.nombre], 18, 2)
      effects.floatText(tmpA.copy(s.mesh.position).setY(2.5), `-${daño}`, '#ff6a5a')
    }
  }

  // Limpiar a los caídos. Los que saben morir (el soldado del mapa de prueba)
  // se quedan un momento en el suelo haciendo su animación.
  unidades = unidades.filter(u => {
    if (!u.s.dead) return true
    if (u.s.animaMuerte && !u.entro) caidos.push({ s: u.s, t: 0 })
    else scene.remove(u.s.mesh)
    return false
  })

  effects.update(dt)
  if (rol === 'anfitrion') publicar(dt)

  if (bandos.azul.vida <= 0 || bandos.rojo.vida <= 0 || tiempo >= REGLAS.duracion) terminar()
}

// --- la máquina -------------------------------------------------------------------
// Juega con las mismas reglas y las mismas monedas que tú. Ahorra para un
// soldado elegido de antemano (si comprara siempre lo más barato, nunca vería
// un mortero), manda por donde más le aprietan, levanta sacos al principio y
// de vez en cuando junta una línea para salir todos a la vez.
//
// Por niveles (Isidro: «si gano una partida bien, pero si sigo jugando y
// ganando, debería ser más difícil»). Ganar sube uno; perder o empatar lo deja
// donde está. Cada nivel le da más ingreso y más dinero al empezar, le adelanta
// las tropas caras y las mejoras, y le deja poner más sacos y, desde el cuarto,
// torretas. El 1 es un poco más blando que la máquina de antes (0,85 de
// ingreso), para aprender.
const CLAVE_NIVEL = 'alienz-guerra-maquina-v1'
function leerNivel () {
  try {
    const n = JSON.parse(localStorage.getItem(CLAVE_NIVEL))?.nivel
    return Number.isInteger(n) && n >= 1 ? n : 1
  } catch { return 1 }
}
function guardarNivel (n) {
  try { localStorage.setItem(CLAVE_NIVEL, JSON.stringify({ nivel: n })) } catch {}
}
let nivelMaquina = leerNivel()
function dureza (n) {
  const k = n - 1
  return {
    ingreso: Math.min(2.6, 0.85 + 0.14 * k),
    inicial: REGLAS.monedasIniciales + 40 * k,
    prisa: 1 + 0.18 * k,
    sacos: Math.min(5, 2 + Math.floor(k / 2)),
    torretas: k >= 3 ? Math.min(3, Math.floor((k - 1) / 2)) : 0,
    mejoraDesde: Math.max(30, 120 - 15 * k),
    mejoraProb: Math.min(0.5, 0.15 + 0.05 * k),
    reserva: Math.max(40, 150 - 15 * k)
  }
}
let duro = dureza(1)

let ia = null
function nuevaIA () {
  return { plan: null, pensar: 1.5, linea: 0, sacos: 0, torretas: 0, carga: 35 + Math.random() * 20 }
}

function planIA () {
  const t = tiempo * duro.prisa
  const pool = t < 50 ? ['archer', 'rifle', 'rifle', 'shotgun']
    : t < 130 ? ['rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'rifle']
      : ['rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil', 'mortar', 'gunner']
  return pool[Math.floor(Math.random() * pool.length)]
}

function carrilConMasPresion () {
  const cuenta = new Array(CAMPO.carriles).fill(0)
  for (const u of unidades) {
    if (u.bando !== bandos.azul || u.esDefensa) continue
    const c = Math.round(u.x / CAMPO.anchoCarril + (CAMPO.carriles - 1) / 2)
    cuenta[Math.max(0, Math.min(CAMPO.carriles - 1, c))] += (u.s.pz < MITAD ? 2 : 1)
  }
  const max = Math.max(...cuenta)
  if (max === 0 || Math.random() < 0.35) return Math.floor(Math.random() * CAMPO.carriles)
  return cuenta.indexOf(max)
}

function maquina (dt) {
  const yo = bandos.rojo
  ia.pensar -= dt
  if (ia.pensar > 0) return
  ia.pensar = 0.8 + Math.random() * 0.7

  // Sacos delante de la base al principio.
  if (tiempo > 15 && ia.sacos < duro.sacos && yo.monedas >= DEFENSES.sandbags.cost) {
    ia.sacos++
    ponerDefensa(yo, 'sandbags', carrilX(ia.sacos % CAMPO.carriles) + (Math.random() - 0.5) * 0.4, CAMPO.baseRoja + 8 + (ia.sacos > 3 ? 4 : 0))
    return
  }
  // Torretas desde el nivel 4, cuando le sobra para pagarlas.
  if (tiempo > 60 && ia.torretas < duro.torretas && yo.monedas >= DEFENSES.torreta.cost + 60) {
    ia.torretas++
    ponerDefensa(yo, 'torreta', carrilX(ia.torretas === 1 ? 2 : ia.torretas === 2 ? 0 : 4), CAMPO.baseRoja + 6)
    return
  }
  // Mejora lo que más usa a partir de la mitad.
  if (tiempo > duro.mejoraDesde && Math.random() < duro.mejoraProb) {
    const k = ['rifle', 'gunner', 'sniper'][Math.floor(Math.random() * 3)]
    const n = nivelDe(yo, k)
    const precio = REGLAS.precioMejora(SOLDIERS[k].cost, n)
    if (n < REGLAS.nivelMax && yo.monedas > precio + duro.reserva) { yo.monedas -= precio; subirNivel(yo, k) }
  }
  if (!ia.plan) ia.plan = planIA()
  if (yo.monedas < SOLDIERS[ia.plan].cost) return
  const carril = carrilConMasPresion()
  const x = carrilX(carril) + (Math.random() - 0.5) * 0.9
  // Cada rato junta una línea en su mitad y la suelta de golpe.
  ia.carga -= 1
  const junta = ia.linea < 4 && ia.carga < 0
  mandarTropa(yo, ia.plan, x, junta ? 'mantener' : 'avanza', CAMPO.baseRoja + 12 + Math.random() * 4)
  if (junta) ia.linea++
  if (ia.linea >= 4) {
    for (const u of unidades) if (u.bando === yo && u.orden === 'mantener') u.orden = 'avanza'
    ia.linea = 0
    ia.carga = 30 + Math.random() * 25
  }
  ia.plan = null
}

function subirNivel (bando, key) {
  bando.niveles[key] = nivelDe(bando, key) + 1
  for (const u of unidades) {
    if (u.bando === bando && u.key === key && !u.s.dead) {
      u.s.upgrade()
      if (bando === yoB()) effects.floatText(tmpA.copy(u.s.mesh.position).setY(2.4), `NV ${u.s.level}`, '#5fd97a', 52)
    }
  }
}

// --- en directo ------------------------------------------------------------------
// 'solo' contra la máquina; en directo, 'anfitrion' (azul, simula la partida) o
// 'invitado' (rojo, pinta lo que le manda el anfitrión y le manda órdenes).
let rol = 'solo'
const red = crearRed()
let rivalRed = null           // { alias, icono, tengo } del otro jugador
const yoB = () => rol === 'invitado' ? bandos.rojo : bandos.azul
const enDirecto = () => rol !== 'solo'
const CLAVES = [...TROPAS, ...DEFENSAS]
const anchoCampo = (CAMPO.carriles * CAMPO.anchoCarril) / 2
const clampX = x => Math.max(-anchoCampo + 0.6, Math.min(anchoCampo - 0.6, x))
// Lo colocado llega como mínimo a la línea de defensa de SU bando.
const aLinea = (bando, z) => bando.dir < 0 ? Math.min(LINEA, z) : Math.max(CAMPO.baseRoja + (CAMPO.baseAzul - LINEA), z)

// Todo lo que hace un jugador pasa por aquí. Jugando solo o de anfitrión se
// hace en el acto; de invitado se le manda al anfitrión, que lo comprueba
// (monedas, desbloqueos, mitad del campo) antes de hacerlo: el invitado no
// puede colar nada que no podría hacer tocando.
function ordenar (o) {
  if (rol === 'invitado') red.mandarOrden(o)
  else ejecutar(bandos.azul, o)
}

function ejecutar (bando, o) {
  if (!o || typeof o !== 'object') return
  const k = o.k
  if (o.tipo === 'tropa' && SOLDIERS[k] && bando.tengo.has(k)) {
    mandarTropa(bando, k, clampX(+o.x || 0), o.orden === 'mantener' ? 'mantener' : 'avanza', aLinea(bando, +o.z || 0))
  } else if (o.tipo === 'defensa' && DEFENSES[k] && bando.tengo.has(k)) {
    const z = +o.z || 0
    if (enMiMitad(bando, z)) ponerDefensa(bando, k, clampX(+o.x || 0), aLinea(bando, z))
  } else if (o.tipo === 'mejora' && SOLDIERS[k] && bando.tengo.has(k)) {
    const n = nivelDe(bando, k)
    const p = REGLAS.precioMejora(SOLDIERS[k].cost, n)
    if (n >= REGLAS.nivelMax || bando.monedas < p) return
    bando.monedas -= p
    subirNivel(bando, k)
  } else if (o.tipo === 'desbloquear' && SOLDIERS[k] && !SOLO_COFRE.has(k) && !bando.tengo.has(k)) {
    const p = Math.round(SOLDIERS[k].cost * REGLAS.precioDesbloqueo)
    if (bando.monedas < p) return
    bando.monedas -= p
    bando.tengo.add(k)
  } else if (o.tipo === 'ataque') {
    for (const u of unidades) if (u.bando === bando && u.orden === 'mantener') u.orden = 'avanza'
  }
}

// El anfitrión manda el campo ocho veces por segundo: cada unidad en una fila
// corta [id, clave, bando, x, z, vida %, disparos, blanco, quieta, nivel].
let colaOrdenes = []
let publicarT = 0
function publicar (dt) {
  publicarT -= dt
  if (publicarT > 0) return
  publicarT = 0.125
  const az = bandos.azul
  const ro = bandos.rojo
  red.mandarEstado({
    t: Math.round(tiempo * 10) / 10,
    m: [Math.floor(az.monedas), Math.floor(ro.monedas)],
    v: [az.vida, ro.vida],
    d: [az.dañoHecho, ro.dañoHecho],
    b: [az.bajas, ro.bajas],
    n: [{ ...az.niveles, _: 1 }, { ...ro.niveles, _: 1 }],
    g: [[...az.tengo].join(','), [...ro.tengo].join(',')],
    u: unidades.filter(u => !u.s.dead).map(u => [
      u.s.id, CLAVES.indexOf(u.key), u.bando === az ? 0 : 1,
      Math.round(u.s.px * 10), Math.round(u.s.pz * 10), Math.round(100 * Math.max(0, u.s.hp) / u.s.maxHp),
      u.disparos ?? 0, u.blancoId ?? 0, u.orden === 'mantener' ? 1 : 0, u.s.level
    ])
  })
}

// El invitado pinta ese campo. Cada unidad del anfitrión tiene aquí su figura
// (la misma `crearUnidad`, sin combate): anda hacia donde le dicen, se encara
// con su blanco y dispara cuando el contador de disparos sube. El daño no lo
// hace nadie aquí: la vida llega hecha.
let estadoRed = null
let ultimoEstado = 0
const espejo = new Map()
const pendientes = new Set()
function pasoEspejo (dt) {
  const e = estadoRed
  estadoRed = null
  if (e) {
    ultimoEstado = performance.now()
    const az = bandos.azul
    const ro = bandos.rojo
    tiempo = e.t ?? tiempo
    if (e.m) { az.monedas = e.m[0]; ro.monedas = e.m[1] }
    if (e.v) { az.vida = e.v[0]; ro.vida = e.v[1] }
    if (e.d) { az.dañoHecho = e.d[0]; ro.dañoHecho = e.d[1] }
    if (e.b) { az.bajas = e.b[0]; ro.bajas = e.b[1] }
    if (e.n) { az.niveles = { ...e.n[0] }; ro.niveles = { ...e.n[1] } }
    if (e.g) {
      az.tengo = new Set(e.g[0] ? e.g[0].split(',') : [])
      ro.tengo = new Set(e.g[1] ? e.g[1].split(',') : [])
    }
    const vistos = new Set()
    for (const f of e.u ?? []) {
      const [id, ki, b, x10, z10, hp, disp, blanco, quieta, nivel] = f
      vistos.add(id)
      const u = espejo.get(id)
      const meta = { x: x10 / 10, z: z10 / 10, hp, disp, blanco, quieta, nivel }
      if (u) { u.meta = meta; continue }
      if (pendientes.has(id) || !CLAVES[ki]) continue
      pendientes.add(id)
      crearUnidad(b ? ro : az, CLAVES[ki], meta.x, meta.z, quieta ? 'mantener' : 'avanza').then(n => {
        pendientes.delete(id)
        if (!n) return
        n.meta = meta
        n.disparosVistos = disp
        espejo.set(id, n)
      })
    }
    for (const [id, u] of espejo) {
      if (vistos.has(id)) continue
      espejo.delete(id)
      desaparecer(u)
    }
  }
  for (const u of espejo.values()) {
    const s = u.s
    const m = u.meta
    if (m) {
      const d = Math.hypot(m.x - s.px, m.z - s.pz)
      if (d > 4) { s.px = m.x; s.pz = m.z }
      if (!u.esDefensa) {
        s.destX = m.x
        s.destZ = m.z
        s.andando = d > 0.12
        s.modoPaso = 'trote'
      }
      u.orden = u.esDefensa ? 'fija' : m.quieta ? 'mantener' : 'avanza'
      while (s.level < (m.nivel ?? 1)) s.upgrade()
      s.hp = (m.hp / 100) * s.maxHp
      s.bar.set(m.hp / 100)
      const bl = espejo.get(m.blanco)
      if (bl && !s.andando) { s.targetPos = bl.s.mesh.position; s.hasTarget = true } else if (!bl) { s.targetPos = null; s.hasTarget = false }
      if (m.disp > (u.disparosVistos ?? 0)) {
        u.disparosVistos = m.disp
        if (bl) disparar(u, bl, true)
      }
    }
    s.update(dt, camera)
  }
  effects.update(dt)
}

// Los que están cayendo: 1,4 s de animación de morir, y luego se hunden en el
// suelo y se quitan. Fuera de `unidades`: ya no disparan ni reciben tiros.
let caidos = []
function pasoCaidos (dt) {
  caidos = caidos.filter(c => {
    c.t += dt
    c.s.hundir = Math.max(0, c.t - 1.4) * 0.9
    c.s.update(dt, camera)
    if (c.t < 2.6) return true
    scene.remove(c.s.mesh)
    return false
  })
}

function desaparecer (u) {
  const p = u.s.mesh.position
  // Si se ha ido pasada la base del otro, ha entrado: explosión en la base.
  if (!u.esDefensa && (u.s.pz - u.bando.suBase) * u.bando.dir > -1.5) {
    audio.boom()
    effects.burst(tmpA.copy(p).setY(1.2), COLOR[u.bando.nombre], 18, 2)
  } else {
    effects.burst(tmpA.copy(p).setY(1), u.esDefensa ? 0x9a8a6a : 0x8a1f1f, 8, 1)
    if (u.key === 'mines') { audio.boom(); effects.burst(tmpA.copy(p).setY(0.6), 0xffb03a, 16, 2) }
    // En el espejo del invitado también se ven caer.
    if (u.s.animaMuerte) {
      u.s.dead = true
      caidos.push({ s: u.s, t: 0 })
      unidades = unidades.filter(o => o !== u)
      return
    }
  }
  scene.remove(u.s.mesh)
  unidades = unidades.filter(o => o !== u)
}

// Si el otro se va (o deja de llegar el campo) veinte segundos, gana el que
// se queda.
let ausencia = 0
function vigilarRival (dt) {
  if (!jugando || !enDirecto()) return
  const falta = !red.sala?.rival || (rol === 'invitado' && performance.now() - ultimoEstado > 4000)
  if (!falta) { if (ausencia > 0) { ausencia = 0; pista('El rival ha vuelto.') } return }
  ausencia += dt
  if (Math.floor(ausencia) !== Math.floor(ausencia - dt)) pista(`Rival desconectado… ${Math.max(0, 20 - Math.floor(ausencia))} s`)
  if (ausencia >= 20) terminar({ g: yoB().nombre, r: 'abandono' })
}

red.en('orden', o => { if (rol === 'anfitrion' && jugando) colaOrdenes.push(o) })
red.en('estado', e => { if (rol === 'invitado') estadoRed = e })
red.en('fin', f => {
  if (!jugando || rol !== 'invitado') return
  if (f.d) { bandos.azul.dañoHecho = f.d[0]; bandos.rojo.dañoHecho = f.d[1] }
  if (f.b) { bandos.azul.bajas = f.b[0]; bandos.rojo.bajas = f.b[1] }
  mostrarFinal(f)
})
// El anfitrión también se entera si el invitado se rinde.
red.en('fin', f => { if (jugando && rol === 'anfitrion' && f.r === 'abandono' && f.g === 'azul') mostrarFinal(f) })
red.en('inicio', async sala => {
  mapa = 'pueblo'
  await ponerMapa('pueblo')
  // El nombre y el emblema del otro pueden llegar un pelo después del arranque.
  for (let i = 0; i < 30 && !sala.rival; i++) await new Promise(r => setTimeout(r, 100))
  rivalRed = sala.rival
  dejarDeEsperar()
  empezarPartida(sala.anfitrion ? 'anfitrion' : 'invitado')
})

// --- vestíbulo: emparejamiento rápido y sala con código -------------------------------
// Isidro: «el emparejamiento rápido no parece funcionar, se puede pulsar pero no
// busca a nadie; debería salir como en el 1 contra 1, un radar buscando». Antes
// se conectaba primero y solo después salía el radar: si la conexión fallaba
// (sin reglas publicadas, sin cobertura) el aviso caía al fondo del menú y
// parecía que el botón no hacía nada. Ahora el radar sale al tocar, y lo que
// pase se cuenta ahí, en grande.
const aviso = t => { $('gc-aviso').textContent = t }
function datosYo () {
  const cartera = cargarCartera()
  return { alias: nombreCompania(), icono: compania.icono, tengo: [...new Set([...INICIALES, ...DE_SERIE, ...cartera.desbloqueadas])].filter(k => CLAVES.includes(k)) }
}

// Por qué no se ha podido, en palabras de persona.
function motivo (e, deQue) {
  const txt = `${e?.code ?? ''} ${e?.message ?? e ?? ''}`
  if (/operation-not-allowed|admin-restricted/.test(txt)) return 'Hace falta entrar con tu cuenta (en Ajustes del juego) para jugar en línea.'
  if (/permission|denied/i.test(txt)) return 'El servidor todavía no deja jugar a la Guerra civil en línea: faltan por publicar sus reglas.'
  if (/network|offline|unavailable|timeout/i.test(txt)) return 'Sin conexión con el servidor. Revisa la cobertura e inténtalo otra vez.'
  return `No se ha podido ${deQue}. Inténtalo otra vez.`
}

let esperaDesde = 0
let esperaTic = null
let esperaTitulo = ''
function esperar (titulo, { codigo = '', pie = '' } = {}) {
  esperaTitulo = titulo
  $('gc-espera').hidden = false
  $('gc-espera').classList.remove('fallo')
  $('gc-espera-titulo').textContent = titulo
  $('gc-espera-codigo').textContent = codigo
  $('gc-espera-codigo').hidden = !codigo
  $('gc-espera-pie').textContent = pie
  $('gc-espera-maquina').hidden = true
  $('gc-cancelar').textContent = 'CANCELAR'
  esperaDesde = performance.now()
  clearInterval(esperaTic)
  const pintar = () => {
    const seg = Math.floor((performance.now() - esperaDesde) / 1000)
    $('gc-espera-reloj').textContent = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
    // Como en el 1 contra 1: a los 15 s se ofrece la máquina, que es mejor
    // jugar que mirar una pantalla.
    if (seg >= 15 && esperaTitulo === 'BUSCANDO RIVAL') {
      $('gc-espera-pie').textContent = 'Se está haciendo largo. Mientras tanto puedes jugar contra la máquina.'
      $('gc-espera-maquina').hidden = false
    }
  }
  pintar()
  esperaTic = setInterval(pintar, 1000)
}
function fallar (texto) {
  clearInterval(esperaTic)
  $('gc-espera').hidden = false
  $('gc-espera').classList.add('fallo')
  $('gc-espera-titulo').textContent = 'NO SE HA PODIDO'
  $('gc-espera-reloj').textContent = ''
  $('gc-espera-codigo').hidden = true
  $('gc-espera-pie').textContent = texto
  $('gc-espera-maquina').hidden = false
  $('gc-cancelar').textContent = 'VOLVER'
}
function dejarDeEsperar () {
  clearInterval(esperaTic)
  $('gc-espera').hidden = true
}

async function conectar () {
  red.ponerYo(datosYo())
  await red.conectar()
}

$('gc-rapida').onclick = async () => {
  audio.unlock()
  aviso('')
  esperar('BUSCANDO RIVAL', { pie: 'Conectando…' })
  try {
    await conectar()
    $('gc-espera-pie').textContent = 'Tarda lo que tarde en entrar alguien más.'
    const r = await red.rapida()
    if (r === 'dentro') esperar('¡RIVAL ENCONTRADO!', { pie: 'Preparando el pueblo…' })
  } catch (e) {
    console.warn('Sin emparejamiento:', e)
    red.cancelar()
    fallar(motivo(e, 'buscar partida'))
  }
}
$('gc-codigo').onclick = () => { $('gc-sala').hidden = !$('gc-sala').hidden }
$('gc-crear').onclick = async () => {
  audio.unlock()
  aviso('')
  esperar('ABRIENDO SALA', { pie: 'Conectando…' })
  try {
    await conectar()
    const codigo = await red.crearSala()
    esperar('TU SALA', { codigo, pie: 'Pásale este código a tu rival. Empieza en cuanto entre.' })
  } catch (e) {
    console.warn('Sin sala:', e)
    red.cancelar()
    fallar(motivo(e, 'abrir la sala'))
  }
}
$('gc-entrar').onclick = async () => {
  audio.unlock()
  const codigo = $('gc-codigo-campo').value.trim().toUpperCase()
  if (!/^[A-Z2-9]{4}$/.test(codigo)) return aviso('El código son cuatro letras o números.')
  aviso('')
  esperar('ENTRANDO', { codigo, pie: 'Conectando…' })
  try {
    await conectar()
    const error = await red.unirse(codigo)
    if (error) return fallar(error)
    esperar('DENTRO', { codigo, pie: 'Empezando…' })
  } catch (e) {
    console.warn('Sin entrar:', e)
    red.cancelar()
    fallar(motivo(e, 'entrar en la sala'))
  }
}
$('gc-cancelar').onclick = () => { red.cancelar(); dejarDeEsperar(); aviso('') }
$('gc-espera-maquina').onclick = () => { red.cancelar(); dejarDeEsperar(); empezar() }

// --- chat ---------------------------------------------------------------------------
// Como el del 1 contra 1: frases rápidas, texto libre filtrado, un mensaje cada
// tres segundos y botón para denunciar lo del otro. Lo que se le escape al
// filtro lo ve una persona en la bandeja de Ajustes.
let ultimoMensaje = 0
let chatBloqueado = false
$('gc-frases').innerHTML = FRASES.map(f => `<button type="button" class="gc-frase">${f}</button>`).join('')
$('gc-chat-boton').onclick = () => {
  const abrir = $('gc-chat').hidden
  $('gc-chat').hidden = !abrir
  $('gc-chat-boton').classList.remove('nuevo')
  $('gc-chat-nuevo').textContent = ''
  if (abrir) $('gc-mensajes').scrollTop = $('gc-mensajes').scrollHeight
}
$('gc-frases').onclick = e => { const b = e.target.closest('.gc-frase'); if (b) hablar(b.textContent) }
$('gc-escribir-form').onsubmit = e => {
  e.preventDefault()
  if (hablar($('gc-escribir').value)) $('gc-escribir').value = ''
}
function hablar (texto) {
  if (!enDirecto() || !red.sala) return false
  if (chatBloqueado) { pista('Tu chat está silenciado.'); return false }
  const limpio = filtrar(texto)
  if (!limpio) return false
  const ahora = performance.now() / 1000
  if (ahora - ultimoMensaje < ESPERA_MENSAJE) { pista('Espera un momento para volver a escribir.'); return false }
  ultimoMensaje = ahora
  red.hablar(limpio.slice(0, MAX_MENSAJE), nombreCompania())
  return true
}
red.en('chat', m => {
  if (!m || typeof m.t !== 'string') return
  const lista = $('gc-mensajes')
  const li = document.createElement('li')
  const mio = m.de === red.uid
  li.className = mio ? 'mio' : 'suyo'
  li.innerHTML = `<b></b> <span></span>`
  li.querySelector('b').textContent = m.alias ?? ''
  li.querySelector('span').textContent = filtrar(m.t)
  if (!mio) {
    const d = document.createElement('button')
    d.type = 'button'
    d.className = 'gc-denunciar'
    d.textContent = 'Denunciar'
    d.onclick = async () => {
      d.disabled = true
      try { await red.denunciar(m); d.textContent = 'Denunciado' } catch { d.textContent = 'Error'; d.disabled = false }
    }
    li.append(' ', d)
    if ($('gc-chat').hidden) {
      $('gc-chat-boton').classList.add('nuevo')
      $('gc-chat-nuevo').textContent = 'mensaje nuevo'
    }
  }
  lista.append(li)
  while (lista.children.length > 30) lista.firstElementChild.remove()
  lista.scrollTop = lista.scrollHeight
})

// --- toques ---------------------------------------------------------------------
const rayo = new THREE.Raycaster()
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const punto = new THREE.Vector3()

lienzo.addEventListener('pointerdown', e => {
  if (!jugando) return
  audio.unlock()
  const r = lienzo.getBoundingClientRect()
  rayo.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera)
  if (!rayo.ray.intersectPlane(plano, punto)) return
  const yo = yoB()
  if (!elegida) return pista('Elige primero algo de abajo.')
  const x = clampX(punto.x)
  if (elegida.tipo === 'tropa') {
    const spec = SOLDIERS[elegida.key]
    if (yo.monedas < spec.cost) { audio.denied(); return pista('No te llega.') }
    if (modo === 'colocar' && !enMiMitad(yo, punto.z)) { audio.denied(); return pista('Para colocar, toca en tu mitad del campo.') }
    // Soltando se sale por el centro del carril tocado (con algo de holgura,
    // para que no vayan en fila india).
    const carril = Math.max(0, Math.min(CAMPO.carriles - 1, Math.round(x / CAMPO.anchoCarril + (CAMPO.carriles - 1) / 2)))
    const xs = modo === 'soltar' ? carrilX(carril) + (Math.random() - 0.5) * 0.8 : x
    ordenar({ tipo: 'tropa', k: elegida.key, x: xs, z: punto.z, orden: modo === 'colocar' ? 'mantener' : 'avanza' })
    audio.place()
  } else {
    const spec = DEFENSES[elegida.key]
    if (yo.monedas < spec.cost) { audio.denied(); return pista('No te llega.') }
    if (!enMiMitad(yo, punto.z)) { audio.denied(); return pista('Las defensas van en tu mitad.') }
    ordenar({ tipo: 'defensa', k: elegida.key, x, z: punto.z })
    audio.place()
  }
  pintarHud(true)
})

let pistaT = 0
function pista (texto) { $('gc-pista').textContent = texto; pistaT = 3 }

$('gc-modo').onclick = () => {
  modo = modo === 'soltar' ? 'colocar' : 'soltar'
  audio.unlock()
  pintarModo()
}
function pintarModo () {
  $('gc-modo').innerHTML = modo === 'soltar'
    ? '<b>SOLTAR</b><small>avanzan solos</small>'
    : '<b>COLOCAR</b><small>esperan la orden</small>'
  pista(modo === 'soltar' ? 'Salen de tu base y avanzan solos.' : 'Se quedan donde toques hasta que pulses ¡AL ATAQUE!')
}
$('gc-avanzar').onclick = () => {
  const n = unidades.filter(u => u.bando === yoB() && u.orden === 'mantener' && !u.s.dead).length
  if (!n) return
  ordenar({ tipo: 'ataque' })
  audio.place()
  pista(`¡${n} al ataque!`)
}

// --- dónde se puede poner -----------------------------------------------------------
// Isidro: «que selecciones un personaje y te indique dónde puedes ponerlo». Al
// elegir carta se ilumina en el suelo lo que vale: soltando, los cinco
// carriles de punta a punta (se toca el carril por el que sale); colocando o
// con una defensa, tu mitad del campo.
const zona = (() => {
  const g = new THREE.Group()
  // Por las dos caras: al rojo se le pinta reflejada (escala -1), y reflejada
  // la cara de arriba pasa a ser la de abajo.
  const verde = new THREE.MeshBasicMaterial({ color: 0x5fd97a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  const borde = new THREE.MeshBasicMaterial({ color: 0x8fffa8, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })
  const ancho = CAMPO.carriles * CAMPO.anchoCarril
  // Tu mitad.
  const z0 = MITAD + 1
  const z1 = LINEA + 0.6
  const mitad = new THREE.Group()
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, z1 - z0).rotateX(-Math.PI / 2), verde)
  suelo.position.set(0, 0.03, (z0 + z1) / 2)
  mitad.add(suelo)
  for (const [w, d, x, z] of [[ancho, 0.12, 0, z0], [ancho, 0.12, 0, z1], [0.12, z1 - z0, -ancho / 2, (z0 + z1) / 2], [0.12, z1 - z0, ancho / 2, (z0 + z1) / 2]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), borde)
    l.position.set(x, 0.035, z)
    mitad.add(l)
  }
  // Los carriles, con flechas a la salida de cada uno.
  const carriles = new THREE.Group()
  const largo = CAMPO.baseAzul - CAMPO.baseRoja
  const flecha = new THREE.Shape([new THREE.Vector2(-0.7, 0), new THREE.Vector2(0, 1.1), new THREE.Vector2(0.7, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0, 0.5), new THREE.Vector2(-0.35, 0)])
  for (let c = 0; c < CAMPO.carriles; c++) {
    const col = new THREE.Mesh(new THREE.PlaneGeometry(CAMPO.anchoCarril - 0.35, largo).rotateX(-Math.PI / 2), verde)
    col.position.set(carrilX(c), 0.03, (CAMPO.baseAzul + CAMPO.baseRoja) / 2)
    carriles.add(col)
    for (let k = 0; k < 3; k++) {
      // La forma se dibuja en x-y; al tumbarla, +y pasa a -z: apunta al frente.
      const f = new THREE.Mesh(new THREE.ShapeGeometry(flecha).rotateX(-Math.PI / 2), borde)
      f.position.set(carrilX(c), 0.036, CAMPO.baseAzul - 7 - k * 1.4)
      carriles.add(f)
    }
  }
  g.add(mitad, carriles)
  g.visible = false
  scene.add(g)
  return {
    pintar (t) {
      g.visible = jugando && !!elegida
      if (!g.visible) return
      g.scale.z = rol === 'invitado' ? -1 : 1
      g.position.z = rol === 'invitado' ? 2 * MITAD : 0
      const soltando = elegida.tipo === 'tropa' && modo === 'soltar'
      carriles.visible = soltando
      mitad.visible = !soltando
      verde.opacity = 0.24 + 0.1 * Math.sin(t * 4)
      borde.opacity = 0.7 + 0.3 * Math.sin(t * 4)
    }
  }
})()

// --- cartas ---------------------------------------------------------------------
// Una sola tira, como la armería de la campaña: TROPA, BARRERAS y MEJORAS
// separadas, con el retrato de cada figura.
let retratos = new Map()
// Con su propio renderizador: el de la partida, mientras hace las fotos, tiene
// puesto el lienzo de la foto y el campo se veía negro.
const fotografo = new THREE.WebGLRenderer({ antialias: true, alpha: true })
fotografo.outputColorSpace = THREE.SRGBColorSpace
renderPortraits(fotografo).then(r => { retratos = r.retratos; if (bandos) pintarCartas(); fotografo.dispose() }).catch(() => {})

function pintarCartas () {
  const yo = yoB()
  let html = '<span class="gc-sep" data-label="Tropa"></span>'
  for (const k of TROPAS) {
    const spec = SOLDIERS[k]
    const tiene = yo.tengo.has(k)
    if (!tiene && SOLO_COFRE.has(k)) continue
    if (tiene) {
      html += carta({ k, accion: 'tropa', nombre: spec.name, precio: spec.cost, caro: yo.monedas < spec.cost, activa: elegida?.key === k, nivel: `NV ${nivelDe(yo, k)}` })
    } else {
      const p = Math.round(spec.cost * REGLAS.precioDesbloqueo)
      html += carta({ k, accion: 'desbloquear', nombre: spec.name, precio: p, caro: yo.monedas < p, clase: 'bloqueada', nota: 'desbloquear', candado: true })
    }
  }
  const defensas = DEFENSAS.filter(k => yo.tengo.has(k))
  if (defensas.length) {
    html += '<span class="gc-sep" data-label="Barreras"></span>'
    for (const k of defensas) {
      const spec = DEFENSES[k]
      html += carta({ k, accion: 'defensa', nombre: spec.name, precio: spec.cost, caro: yo.monedas < spec.cost, activa: elegida?.key === k })
    }
  }
  html += '<span class="gc-sep" data-label="Mejoras"></span>'
  for (const k of TROPAS) {
    if (!yo.tengo.has(k)) continue
    const n = nivelDe(yo, k)
    const lleno = n >= REGLAS.nivelMax
    const p = lleno ? '—' : REGLAS.precioMejora(SOLDIERS[k].cost, n)
    html += carta({ k, accion: 'mejora', nombre: SOLDIERS[k].name, precio: p, caro: !lleno && yo.monedas < p, clase: 'mejora' + (lleno ? ' caro' : ''), nota: lleno ? 'al máximo' : `▲ NV ${n + 1}` })
  }
  const caja = $('gc-cartas')
  const scroll = caja.scrollLeft
  caja.innerHTML = html
  caja.scrollLeft = scroll
}

function carta ({ k, accion, nombre, precio, caro, activa, nivel = '', clase = '', nota = '', candado = false }) {
  const url = retratos.get(k)
  const cara = url ? `<img src="${url}" alt="">` : `<em>${DEFENSES[k] ? '▦' : '♟'}</em>`
  return `<button class="gc-carta ${caro ? 'caro' : ''} ${activa ? 'elegida' : ''} ${clase}" data-key="${k}" data-accion="${accion}" type="button">` +
    (nivel ? `<span class="gc-nivel">${nivel}</span>` : '') + (candado ? '<span class="gc-candado">🔒</span>' : '') +
    `<span class="gc-cara">${cara}</span>${nombre}<b>${precio}</b>${nota ? `<small>${nota}</small>` : ''}</button>`
}

$('gc-cartas').addEventListener('click', e => {
  const b = e.target.closest('.gc-carta')
  if (!b) return
  audio.unlock()
  const k = b.dataset.key
  const yo = yoB()
  const accion = b.dataset.accion
  if (accion === 'mejora') {
    const n = nivelDe(yo, k)
    if (n >= REGLAS.nivelMax) return
    const p = REGLAS.precioMejora(SOLDIERS[k].cost, n)
    if (yo.monedas < p) { audio.denied(); return pista('No te llega.') }
    ordenar({ tipo: 'mejora', k })
    audio.coin()
    pista(`${SOLDIERS[k].name} a nivel ${n + 1}: los que hay y los que vengan.`)
  } else if (accion === 'desbloquear') {
    const p = Math.round(SOLDIERS[k].cost * REGLAS.precioDesbloqueo)
    if (yo.monedas < p) { audio.denied(); return pista('No te llega.') }
    ordenar({ tipo: 'desbloquear', k })
    audio.coin()
    elegida = { tipo: 'tropa', key: k }
    pista(`${SOLDIERS[k].name} desbloqueado solo para esta partida.`)
  } else {
    elegida = elegida?.key === k ? null : { tipo: accion, key: k }
    if (elegida) pista(accion === 'tropa'
      ? (modo === 'soltar' ? 'Toca el carril por el que sale.' : 'Toca en la zona verde: se queda ahí.')
      : 'Toca en la zona verde para ponerla.')
  }
  pintarHud(true)
})

// --- marcador -------------------------------------------------------------------
let hudT = 0
let ultimoHud = ''
function pintarHud (forzar = false) {
  const az = yoB()
  const ro = rival(az)
  // `gc-vida-azul` es la barra de abajo (la tuya) y `gc-vida-rojo` la de
  // arriba (la del otro); el color sigue al bando de verdad.
  $('gc-vida-azul').style.width = `${az.vida}%`
  $('gc-vida-rojo').style.width = `${ro.vida}%`
  $('gc-vida-azul').closest('.gc-vida').className = `gc-vida gc-${az.nombre}`
  $('gc-vida-rojo').closest('.gc-vida').className = `gc-vida gc-${ro.nombre}`
  const falta = Math.max(0, REGLAS.duracion - tiempo)
  $('gc-reloj').textContent = `${Math.floor(falta / 60)}:${String(Math.floor(falta % 60)).padStart(2, '0')}`
  $('gc-monedas').textContent = Math.floor(az.monedas)
  const quietos = unidades.filter(u => u.bando === az && u.orden === 'mantener' && !u.s.dead).length
  $('gc-quietos').textContent = quietos ? `${quietos} esperando` : 'nadie esperando'
  $('gc-avanzar').disabled = !quietos
  // Las cartas solo se repintan si cambia lo que se puede pagar.
  const firma = (elegida?.key ?? '') + '|' + [...TROPAS, ...DEFENSAS].map(k => {
    const spec = SOLDIERS[k] ?? DEFENSES[k]
    const mejora = SOLDIERS[k] ? REGLAS.precioMejora(spec.cost, nivelDe(az, k)) : 0
    return [az.monedas >= spec.cost, az.monedas >= mejora, az.monedas >= spec.cost * REGLAS.precioDesbloqueo, nivelDe(az, k), az.tengo.has(k)].map(Number).join('')
  }).join(',')
  if (forzar || firma !== ultimoHud) { ultimoHud = firma; pintarCartas() }
}

// --- partida --------------------------------------------------------------------
async function empezar () {
  mapa = 'pueblo'
  await ponerMapa('pueblo')
  return empezarPartida('solo')
}

// El mapa de PRUEBA (Isidro, 29/09: «crea un mapa aparte que se llame prueba,
// solo para probarlo»): contra la máquina, con el pueblo y los soldados de los
// paquetes nuevos.
async function empezarPrueba () {
  $('gc-menu').hidden = true
  $('gc-carga').hidden = false
  mapa = 'prueba'
  try {
    await ponerMapa('prueba')
  } catch (e) {
    console.warn('Sin mapa de prueba:', e)
    mapa = 'pueblo'
    await ponerMapa('pueblo')
  }
  return empezarPartida('solo')
}

async function empezarPartida (rolNuevo) {
  rol = rolNuevo
  $('gc-menu').hidden = true
  $('gc-final').hidden = true
  $('gc-carga').hidden = false
  audio.unlock()
  for (const u of unidades) scene.remove(u.s.mesh)
  unidades = []
  espejo.clear()
  for (const c of caidos) scene.remove(c.s.mesh)
  caidos = []
  pendientes.clear()
  estadoRed = null
  colaOrdenes = []
  ausencia = 0
  ultimoEstado = performance.now()
  const cartera = cargarCartera()
  const mio = new Set([...INICIALES, ...DE_SERIE, ...cartera.desbloqueadas])
  // La máquina lleva todas las tropas corrientes y las defensas básicas; una
  // persona, lo que tenga desbloqueado en su juego.
  const suyo = rol === 'solo'
    ? ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil', 'mortar', 'sandbags', 'torreta']
    : (Array.isArray(rivalRed?.tengo) ? rivalRed.tengo : [...INICIALES, ...DE_SERIE])
  bandos = rol === 'invitado'
    ? { azul: nuevoBando('azul', suyo), rojo: nuevoBando('rojo', mio) }
    : { azul: nuevoBando('azul', mio), rojo: nuevoBando('rojo', suyo) }
  duro = dureza(rol === 'solo' ? nivelMaquina : 1)
  if (rol === 'solo') bandos.rojo.monedas = duro.inicial
  girar(rol === 'invitado')
  const suIcono = rol === 'solo' ? '🤖' : (rivalRed?.icono ?? '🏴')
  emblema(yoB().nombre, compania.icono)
  emblema(rival(yoB()).nombre, suIcono)
  $('gc-nombre-rival').textContent = rol === 'solo' ? `Máquina · nv ${nivelMaquina}` : `${suIcono} ${rivalRed?.alias ?? 'Rival'}`
  $('gc-chat-boton').hidden = !enDirecto()
  $('gc-chat').hidden = true
  $('gc-mensajes').replaceChildren()
  if (enDirecto()) red.bloqueado().then(b => { chatBloqueado = b }).catch(() => {})
  ia = nuevaIA()
  tiempo = 0
  elegida = null
  // Las figuras se cargan antes de empezar: el primer soldado no puede tardar
  // dos segundos en salir mientras el rival ya está andando.
  const claves = new Set([...bandos.azul.tengo, ...bandos.rojo.tengo].filter(k => SOLDIERS[k]))
  await Promise.all([...claves].map(k => buildSoldierMesh(k, SOLDIERS[k]).catch(() => null)))
  $('gc-carga').hidden = true
  $('gc-hud').hidden = false
  jugando = true
  pintarModo()
  pista('Elige un soldado y toca el campo para mandarlo.')
  pintarHud(true)
}

function resultado () {
  const az = bandos.azul
  const ro = bandos.rojo
  if (ro.vida <= 0) return { g: 'azul', r: 'base' }
  if (az.vida <= 0) return { g: 'rojo', r: 'base' }
  if (az.dañoHecho !== ro.dañoHecho) return { g: az.dañoHecho > ro.dañoHecho ? 'azul' : 'rojo', r: 'tiempo' }
  return { g: null, r: 'tiempo' }
}

// Lo decide quien simula (tú jugando solo, el anfitrión en directo) y se lo
// cuenta al otro por `fin`.
function terminar (res = resultado()) {
  if (!jugando) return
  if (rol === 'anfitrion' || (rol === 'invitado' && res.r === 'abandono')) {
    red.mandarFin({ ...res, d: [bandos.azul.dañoHecho, bandos.rojo.dañoHecho], b: [bandos.azul.bajas, bandos.rojo.bajas] })
  }
  mostrarFinal(res)
}

function mostrarFinal (res) {
  jugando = false
  const yo = yoB()
  const otro = rival(yo)
  const gano = res.g === yo.nombre
  const pierdo = !!res.g && !gano
  const titulo = gano ? 'VICTORIA' : pierdo ? 'DERROTA' : 'EMPATE'
  const suNombre = rol === 'solo' ? 'La máquina' : (rivalRed?.alias ?? 'Tu rival')
  let texto
  if (res.r === 'base') texto = gano ? `${compania.icono} ${nombreCompania()} ha entrado en la base enemiga.` : 'Han entrado en tu base.'
  else if (res.r === 'abandono') texto = gano ? `${suNombre} se ha retirado.` : 'Te has retirado.'
  else texto = gano ? 'Se acabó el tiempo y le has hecho más daño a su base.' : pierdo ? 'Se acabó el tiempo y te han hecho más daño.' : 'Se acabó el tiempo con las dos bases igual.'
  texto += ` Bajas: ${yo.bajas} hechas por ti, ${otro.bajas} por el otro bando.`
  if (rol === 'solo') {
    if (gano) {
      texto += ` Nivel ${nivelMaquina} superado: la próxima vez la máquina juega al ${nivelMaquina + 1}, con más dinero, tropas caras antes y más defensas.`
      nivelMaquina++
      guardarNivel(nivelMaquina)
    } else {
      texto += ` Sigues en el nivel ${nivelMaquina}.`
    }
    texto += ' Práctica: no cuenta para el mapa.'
    $('gc-otra').textContent = gano ? `SIGUIENTE: NIVEL ${nivelMaquina}` : `REPETIR NIVEL ${nivelMaquina}`
    pintarNivelMenu()
  } else {
    texto += ` Contra ${suNombre}, en directo.`
    $('gc-otra').textContent = 'BUSCAR OTRA PARTIDA'
    // La sala ya no pinta nada; el chat se queda abierto un momento por si
    // queda algo que decirse, y luego se cierra.
    setTimeout(() => { if (!jugando) red.salir() }, 8000)
  }
  $('gc-final-titulo').textContent = gano ? `${compania.icono} VICTORIA` : titulo
  $('gc-final-texto').textContent = texto
  $('gc-hud').hidden = true
  $('gc-final').hidden = false
  if (gano) audio.desbloqueo?.()
}

// --- tu compañía ---------------------------------------------------------------
// Isidro: «que puedas elegir el nombre de tu compañía o equipo, con un logo de
// una lista de iconos prefijados». Se guarda en el móvil; cuando haya partidas
// en directo, es lo que verá el rival.
const EMBLEMAS = ['🐺', '🦅', '🐍', '🦂', '🐻', '🦁', '🐉', '🦈', '💀', '🔥', '⚡', '⭐', '⚔️', '🛡️', '🎯', '💣', '⚓', '👑', '☢️', '🌪️', '🗡️', '🏴', '🦏', '🐗']
const CLAVE_COMPANIA = 'alienz-guerra-compania-v1'
const compania = (() => {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_COMPANIA)) ?? {}
    return {
      nombre: typeof c.nombre === 'string' ? c.nombre.slice(0, 20) : '',
      icono: EMBLEMAS.includes(c.icono) ? c.icono : EMBLEMAS[0]
    }
  } catch { return { nombre: '', icono: EMBLEMAS[0] } }
})()
const nombreCompania = () => compania.nombre.trim() || 'Tu compañía'
function guardarCompania () {
  try { localStorage.setItem(CLAVE_COMPANIA, JSON.stringify(compania)) } catch {}
}
function pintarCompania () {
  $('gc-escudo').textContent = compania.icono
  $('gc-nombre').value = compania.nombre
  $('gc-nombre-mio').textContent = `${compania.icono} ${nombreCompania()}`
  for (const b of $('gc-iconos').children) b.setAttribute('aria-selected', String(b.dataset.icono === compania.icono))
  emblema('azul', compania.icono)
}
$('gc-iconos').innerHTML = EMBLEMAS.map(i => `<button type="button" role="option" data-icono="${i}" aria-label="Emblema ${i}">${i}</button>`).join('')
$('gc-escudo').onclick = () => {
  const abrir = $('gc-iconos').hidden
  $('gc-iconos').hidden = !abrir
  $('gc-escudo').setAttribute('aria-expanded', String(abrir))
}
$('gc-iconos').onclick = e => {
  const b = e.target.closest('[data-icono]')
  if (!b) return
  compania.icono = b.dataset.icono
  guardarCompania()
  pintarCompania()
  $('gc-iconos').hidden = true
  $('gc-escudo').setAttribute('aria-expanded', 'false')
}
$('gc-nombre').oninput = () => {
  // Sin saltos ni caracteres de control; espacios dobles fuera.
  compania.nombre = $('gc-nombre').value.replace(/[\u0000-\u001f]/g, '').replace(/\s{2,}/g, ' ').slice(0, 20)
  guardarCompania()
  $('gc-nombre-mio').textContent = `${compania.icono} ${nombreCompania()}`
}
pintarCompania()
// La máquina también lleva el suyo.
emblema('rojo', '🤖')

function pintarNivelMenu () {
  $('gc-maquina').innerHTML = `CONTRA LA MÁQUINA <small>práctica · nivel ${nivelMaquina}</small>`
}
pintarNivelMenu()
$('gc-maquina').onclick = empezar
$('gc-prueba').onclick = empezarPrueba
$('gc-otra').onclick = () => {
  if (rol === 'solo') return mapa === 'prueba' ? empezarPrueba() : empezar()
  red.salir()
  $('gc-final').hidden = true
  $('gc-menu').hidden = false
  $('gc-rapida').click()
}
$('gc-menu-otra').onclick = () => { if (enDirecto()) red.salir(); $('gc-final').hidden = true; $('gc-menu').hidden = false }
$('gc-salir').onclick = () => {
  if (!confirm(enDirecto() ? '¿Retirarte? Tu rival ganará la partida.' : '¿Salir de la partida?')) return
  if (enDirecto()) {
    red.mandarFin({ g: rival(yoB()).nombre, r: 'abandono', d: [bandos.azul.dañoHecho, bandos.rojo.dañoHecho], b: [bandos.azul.bajas, bandos.rojo.bajas] })
    setTimeout(() => red.salir(), 500)
  }
  jugando = false
  $('gc-hud').hidden = true
  $('gc-menu').hidden = false
}

// --- bucle ----------------------------------------------------------------------
let antes = performance.now()
let ultimoFotograma = antes
// Con la pestaña en segundo plano no llegan fotogramas, y el anfitrión es el
// que lleva la partida de los dos: si se para, se para para el otro también.
// Mientras tanto se sigue simulando a ritmo de reloj.
setInterval(() => {
  if (rol !== 'anfitrion' || !jugando || performance.now() - ultimoFotograma < 250) return
  paso(0.1)
  vigilarRival(0.1)
}, 100)
function fotograma (ahora) {
  requestAnimationFrame(fotograma)
  const dt = Math.min(0.05, (ahora - antes) / 1000)
  antes = ahora
  ultimoFotograma = ahora
  if (rol === 'invitado') { if (jugando) pasoEspejo(dt) } else paso(dt)
  pasoCaidos(dt)
  vigilarRival(dt)
  if (jugando) {
    hudT -= dt
    if (hudT <= 0) { hudT = 0.2; pintarHud() }
    if (pistaT > 0 && (pistaT -= dt) <= 0) $('gc-pista').textContent = ''
  } else {
    effects.update(dt)
  }
  animar(ahora / 1000)
  zona.pintar(ahora / 1000)
  renderer.render(scene, camera)
}
requestAnimationFrame(fotograma)

// Para probar sin mirar (solo en desarrollo), como `__zr` en la campaña.
if (import.meta.env.DEV) {
  window.__gc = {
    empezar,
    camera,
    nivel: n => { if (n) { nivelMaquina = n; pintarNivelMenu() } return nivelMaquina },
    rol: () => rol,
    caidos: () => caidos,
    red,
    estado: () => ({ tiempo: Math.round(tiempo), jugando, azul: bandos && { ...bandos.azul, tengo: [...bandos.azul.tengo] }, rojo: bandos && { ...bandos.rojo, tengo: [...bandos.rojo.tengo] }, unidades: unidades.length }),
    unidades: () => unidades,
    mandar: (key, carril, orden = 'avanza') => mandarTropa(bandos.azul, key, carrilX(carril), orden, CAMPO.baseAzul - 6),
    dar: n => { bandos.azul.monedas += n },
    async correr (seg, dt = 1 / 30) {
      for (let i = 0; i < seg / dt && jugando; i++) {
        paso(dt)
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0))
      }
      return this.estado()
    }
  }
}
