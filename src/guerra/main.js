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

const $ = id => document.getElementById(id)
const lienzo = $('gc-lienzo')
const { renderer, scene, camera, animar } = crearCampo(lienzo)
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
const enMiMitad = (bando, z) => bando.dir < 0 ? z > MITAD + 1 : z < MITAD - 1

// --- crear unidades -----------------------------------------------------------------
async function crearUnidad (bando, key, x, z, orden) {
  const esDefensa = !!DEFENSES[key]
  const spec = esDefensa ? DEFENSES[key] : SOLDIERS[key]
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
      n.color.lerp(c, cuanto)
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
    if (quien === bandos.azul) effects.floatText(tmpA.copy(p).setY(2), `+${botin}`)
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

function disparar (u, blanco) {
  const s = u.s
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
    for (const e of unidades) {
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
      enArea(u.bando, p, spec.splash, s.damage)
    })
    return
  } else {
    effects.tracer(from, to)
    if (Math.random() < 0.3) effects.smoke(from, 1)
  }
  herir(blanco, daño, u.bando)
}

function paso (dt) {
  if (!jugando) return
  tiempo += dt
  for (const b of [bandos.azul, bandos.rojo]) b.monedas += REGLAS.goteo * dt
  maquina(dt)

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
      s.dead = true
      audio.boom()
      effects.burst(tmpA.copy(s.mesh.position).setY(1.2), COLOR[u.bando.nombre], 18, 2)
      effects.floatText(tmpA.copy(s.mesh.position).setY(2.5), `-${daño}`, '#ff6a5a')
    }
  }

  // Limpiar a los caídos.
  unidades = unidades.filter(u => {
    if (!u.s.dead) return true
    scene.remove(u.s.mesh)
    return false
  })

  effects.update(dt)

  if (bandos.azul.vida <= 0 || bandos.rojo.vida <= 0 || tiempo >= REGLAS.duracion) terminar()
}

// --- la máquina -------------------------------------------------------------------
// Juega con las mismas reglas y las mismas monedas que tú. Ahorra para un
// soldado elegido de antemano (si comprara siempre lo más barato, nunca vería
// un mortero), manda por donde más le aprietan, levanta sacos al principio y
// de vez en cuando junta una línea para salir todos a la vez.
let ia = null
function nuevaIA () {
  return { plan: null, pensar: 1.5, linea: 0, sacos: 0, carga: 35 + Math.random() * 20 }
}

function planIA () {
  const t = tiempo
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
  if (tiempo > 15 && ia.sacos < 2 && yo.monedas >= DEFENSES.sandbags.cost) {
    ia.sacos++
    ponerDefensa(yo, 'sandbags', carrilX(1 + ia.sacos) + (Math.random() - 0.5) * 0.4, CAMPO.baseRoja + 9)
    return
  }
  // Mejora lo que más usa a partir de la mitad.
  if (tiempo > 120 && Math.random() < 0.15) {
    const k = ['rifle', 'gunner', 'sniper'][Math.floor(Math.random() * 3)]
    const n = nivelDe(yo, k)
    const precio = REGLAS.precioMejora(SOLDIERS[k].cost, n)
    if (n < REGLAS.nivelMax && yo.monedas > precio + 150) { yo.monedas -= precio; subirNivel(yo, k) }
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
      if (bando === bandos.azul) effects.floatText(tmpA.copy(u.s.mesh.position).setY(2.4), `NV ${u.s.level}`, '#5fd97a', 52)
    }
  }
}

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
  const yo = bandos.azul
  if (!elegida) return pista('Elige primero algo de abajo.')
  const ancho = (CAMPO.carriles * CAMPO.anchoCarril) / 2
  const x = Math.max(-ancho + 0.6, Math.min(ancho - 0.6, punto.x))
  if (elegida.tipo === 'tropa') {
    const spec = SOLDIERS[elegida.key]
    if (yo.monedas < spec.cost) { audio.denied(); return pista('No te llega.') }
    if (modo === 'colocar' && !enMiMitad(yo, punto.z)) { audio.denied(); return pista('Para colocar, toca en tu mitad del campo.') }
    const holdZ = Math.min(CAMPO.baseAzul - 1, punto.z)
    // Soltando se sale por el centro del carril tocado (con algo de holgura,
    // para que no vayan en fila india).
    const carril = Math.max(0, Math.min(CAMPO.carriles - 1, Math.round(x / CAMPO.anchoCarril + (CAMPO.carriles - 1) / 2)))
    const xs = modo === 'soltar' ? carrilX(carril) + (Math.random() - 0.5) * 0.8 : x
    mandarTropa(yo, elegida.key, xs, modo === 'colocar' ? 'mantener' : 'avanza', holdZ)
    audio.place()
  } else {
    const spec = DEFENSES[elegida.key]
    if (yo.monedas < spec.cost) { audio.denied(); return pista('No te llega.') }
    if (!enMiMitad(yo, punto.z) || punto.z > CAMPO.baseAzul - 0.5) { audio.denied(); return pista('Las defensas van en tu mitad.') }
    ponerDefensa(yo, elegida.key, x, punto.z)
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
  let n = 0
  for (const u of unidades) if (u.bando === bandos.azul && u.orden === 'mantener') { u.orden = 'avanza'; n++ }
  if (n) { audio.place(); pista(`¡${n} al ataque!`) }
}

// --- dónde se puede poner -----------------------------------------------------------
// Isidro: «que selecciones un personaje y te indique dónde puedes ponerlo». Al
// elegir carta se ilumina en el suelo lo que vale: soltando, los cinco
// carriles de punta a punta (se toca el carril por el que sale); colocando o
// con una defensa, tu mitad del campo.
const zona = (() => {
  const g = new THREE.Group()
  const verde = new THREE.MeshBasicMaterial({ color: 0x5fd97a, transparent: true, opacity: 0.18, depthWrite: false })
  const borde = new THREE.MeshBasicMaterial({ color: 0x8fffa8, transparent: true, opacity: 0.8, depthWrite: false })
  const ancho = CAMPO.carriles * CAMPO.anchoCarril
  // Tu mitad.
  const z0 = MITAD + 1
  const z1 = CAMPO.baseAzul - 0.5
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
  const yo = bandos.azul
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
  const yo = bandos.azul
  const accion = b.dataset.accion
  if (accion === 'mejora') {
    const n = nivelDe(yo, k)
    if (n >= REGLAS.nivelMax) return
    const p = REGLAS.precioMejora(SOLDIERS[k].cost, n)
    if (yo.monedas < p) { audio.denied(); return pista('No te llega.') }
    yo.monedas -= p
    subirNivel(yo, k)
    audio.coin()
    pista(`${SOLDIERS[k].name} a nivel ${n + 1}: los que hay y los que vengan.`)
  } else if (accion === 'desbloquear') {
    const p = Math.round(SOLDIERS[k].cost * REGLAS.precioDesbloqueo)
    if (yo.monedas < p) { audio.denied(); return pista('No te llega.') }
    yo.monedas -= p
    yo.tengo.add(k)
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
  const az = bandos.azul
  const ro = bandos.rojo
  $('gc-vida-azul').style.width = `${az.vida}%`
  $('gc-vida-rojo').style.width = `${ro.vida}%`
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
  $('gc-menu').hidden = true
  $('gc-final').hidden = true
  $('gc-carga').hidden = false
  audio.unlock()
  for (const u of unidades) scene.remove(u.s.mesh)
  unidades = []
  const cartera = cargarCartera()
  const mio = new Set([...INICIALES, ...cartera.desbloqueadas])
  bandos = {
    azul: nuevoBando('azul', mio),
    // La máquina lleva todas las tropas corrientes y las defensas básicas.
    rojo: nuevoBando('rojo', ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil', 'mortar', 'sandbags'])
  }
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

function terminar () {
  jugando = false
  const az = bandos.azul
  const ro = bandos.rojo
  let titulo, texto
  if (ro.vida <= 0) { titulo = 'VICTORIA'; texto = 'Tu compañía ha entrado en la base enemiga.' }
  else if (az.vida <= 0) { titulo = 'DERROTA'; texto = 'Han entrado en tu base.' }
  else if (az.dañoHecho > ro.dañoHecho) { titulo = 'VICTORIA'; texto = 'Se acabó el tiempo y le has hecho más daño a su base.' }
  else if (az.dañoHecho < ro.dañoHecho) { titulo = 'DERROTA'; texto = 'Se acabó el tiempo y te han hecho más daño.' }
  else { titulo = 'EMPATE'; texto = 'Se acabó el tiempo con las dos bases igual.' }
  texto += ` Bajas: ${az.bajas} tuyas contra ${ro.bajas} suyas. Partida de práctica: no cuenta para el mapa.`
  $('gc-final-titulo').textContent = titulo
  $('gc-final-texto').textContent = texto
  $('gc-hud').hidden = true
  $('gc-final').hidden = false
  if (titulo === 'VICTORIA') audio.desbloqueo?.()
}

$('gc-maquina').onclick = empezar
$('gc-otra').onclick = empezar
$('gc-menu-otra').onclick = () => { $('gc-final').hidden = true; $('gc-menu').hidden = false }
$('gc-salir').onclick = () => {
  if (!confirm('¿Salir de la partida?')) return
  jugando = false
  $('gc-hud').hidden = true
  $('gc-menu').hidden = false
}

// --- bucle ----------------------------------------------------------------------
let antes = performance.now()
function fotograma (ahora) {
  requestAnimationFrame(fotograma)
  const dt = Math.min(0.05, (ahora - antes) / 1000)
  antes = ahora
  paso(dt)
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
