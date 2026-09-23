// Un rival de mentira para el 1 contra 1.
//
// La gracia está en cómo se enchufa: el duelo entero habla con un «almacén»
// (`almacen.js`) y no sabe ni le importa si al otro lado hay una persona, otra
// pestaña o nadie. Así que la máquina no es un modo aparte lleno de `if`: es un
// almacén más, con la misma interfaz, que además tiene un bicho dentro que se
// apunta a la sala, manda alienz y acaba cayendo.
//
// Ventaja práctica: no hace falta conexión, ni cuenta, ni un segundo móvil.
// Isidro no podía probar el duelo él solo.
//
// La máquina lleva SU propio campo, simulado a lo bruto: le baja la misma horda
// que a ti, la para con los soldados que va comprando y encaja lo que le mandas.
// No es una cuenta atrás disfrazada: si le mandas bichos, cae antes de verdad.

import { ZOMBIES, SOLDIERS, DEFENSES, FIELD } from '../config.js'

const CLAVES_Z = Object.keys(ZOMBIES)
const CLAVES_S = [...Object.keys(SOLDIERS), ...Object.keys(DEFENSES)]
const trozos = ruta => ruta.split('/').filter(Boolean)
const azar = (a, b) => a + Math.random() * (b - a)

// Lo que sale por su lado. Los mismos bichos que bajan por el tuyo, que la
// horda es compartida.
const HORDA = ['walker', 'runner', 'armored', 'spitter', 'leaper', 'bloater', 'healer', 'tank']

// El pulso de la máquina. Son los números que deciden si es un rival digno o un
// muñeco, y están puestos para que una partida decente dure de tres a seis
// minutos:
const MAQUINA = {
  // Cada cuánto le baja un bicho, al principio y a los seis minutos.
  huecoInicial: 3.4,
  huecoFinal: 0.85,
  // Cada cuánto compra un soldado, y cuántos llega a tener como mucho.
  compraCada: 6.5,
  tope: 14,
  // Daño por segundo de CADA soldado suyo. Es la perilla que la hace más
  // blanda o más dura.
  dañoPorSoldado: 22,
  // Lo que le quita a su base cada bicho que llega.
  mordisco: 7,
  // Biomasa que le da cada bicho que mata, y cada cuánto gasta lo que tiene.
  biomasaPorMuerte: 9,
  atacaCada: 11,
  // Cada cuántos segundos la horda se hace una vez más dura. Sin esto la
  // máquina era INVENCIBLE y no es exageración: los alienz tienen entre 17 y
  // 340 de vida, sus catorce soldados hacen más de 300 por segundo, y con eso
  // los mata nada más salir. Medido: cinco minutos con la base intacta. El
  // juego de verdad endurece la horda en cada oleada; aquí, igual.
  endureceCada: 45
}

export function almacenBot ({ alias = 'La Máquina', sinRival = false } = {}) {
  const uid = 'tu-' + Math.random().toString(36).slice(2, 8)
  const botUid = 'maquina-' + Math.random().toString(36).slice(2, 6)
  let arbol = {}
  const oyentes = []
  let raiz = null
  let reloj = null

  const obtener = ruta => trozos(ruta).reduce((n, k) => (n == null ? n : n[k]), arbol)

  function aplicar (op) {
    const t = trozos(op.ruta)
    let n = arbol
    for (const k of t.slice(0, -1)) n = n[k] ??= {}
    const ultima = t[t.length - 1]
    if (op.valor == null) delete n[ultima]
    else n[ultima] = op.valor
    for (const o of oyentes) {
      const dentro = op.ruta.startsWith(o.ruta + '/') || op.ruta === o.ruta || o.ruta.startsWith(op.ruta + '/')
      if (!dentro) continue
      if (o.tipo === 'valor') o.fn(obtener(o.ruta) ?? null)
      else if (op.nuevo && t.slice(0, -1).join('/') === trozos(o.ruta).join('/')) o.fn(op.valor, ultima)
    }
    mirarSala(op)
  }

  // --- la máquina se apunta y arranca ------------------------------------------
  function mirarSala (op) {
    // Con `sinRival` el almacen es solo un arbol en memoria: lo usa el modo de
    // aguantar en la arena, donde no hay nadie enfrente pero el duelo sigue
    // escribiendo su campo y sus avisos como siempre. Asi no hay que blindar
    // una por una todas las escrituras.
    if (sinRival) return
    const t = trozos(op.ruta)
    // Te acabas de apuntar a una sala: se apunta ella detrás, con un momento de
    // espera para que no parezca que estaba esperándote con el abrigo puesto.
    if (t.length === 4 && t[0] === 'duelos' && t[2] === 'jugadores' && t[3] === uid && op.valor) {
      raiz = `duelos/${t[1]}`
      setTimeout(() => {
        if (!raiz) return
        aplicar({ ruta: `${raiz}/jugadores/${botUid}`, valor: { alias, puntos: 1000, cuenta: false } })
      }, 900)
    }
    // Y cuando el juego da el pistoletazo, empieza a jugar lo suyo.
    if (t.length === 3 && t[0] === 'duelos' && t[2] === 'inicio' && op.valor) arrancar()
  }

  // --- su partida ---------------------------------------------------------------
  const campo = { base: 100, t: 0, bichos: [], soldados: [], biomasa: 0 }
  let paraBicho = 1.5
  let paraCompra = 2
  let paraAtaque = MAQUINA.atacaCada

  function arrancar () {
    if (reloj) return
    // Asa de desarrollo, como `__zr`: sin esto no hay forma de comprobar que su
    // base baja de verdad ni que lo que le mandas le hace dano.
    if (import.meta.env.DEV) window.__maquina = { campo, MAQUINA, latir, meter: meterBicho }
    campo.base = 100
    campo.t = 0
    campo.bichos = []
    campo.soldados = []
    campo.biomasa = 0
    paraBicho = 1.5
    paraCompra = 2
    paraAtaque = MAQUINA.atacaCada
    reloj = setInterval(() => latir(0.25), 250)
  }

  function parar () {
    if (reloj) clearInterval(reloj)
    reloj = null
  }

  // El hueco entre bichos se va cerrando con el tiempo, igual que aprieta la
  // horda por tu lado.
  function huecoAhora () {
    const k = Math.min(1, campo.t / 360)
    return MAQUINA.huecoInicial + (MAQUINA.huecoFinal - MAQUINA.huecoInicial) * k
  }

  function latir (dt) {
    if (campo.base <= 0) return
    campo.t += dt

    // --- le bajan bichos -------------------------------------------------------
    paraBicho -= dt
    if (paraBicho <= 0) {
      paraBicho = huecoAhora() * azar(0.7, 1.3)
      meterBicho(HORDA[Math.floor(Math.random() * HORDA.length)], Math.floor(Math.random() * FIELD.lanes))
    }

    // --- compra soldados -------------------------------------------------------
    paraCompra -= dt
    if (paraCompra <= 0 && campo.soldados.length < MAQUINA.tope) {
      paraCompra = MAQUINA.compraCada * azar(0.8, 1.2)
      const libres = []
      for (let l = 0; l < FIELD.lanes; l++) {
        for (let f = 0; f < FIELD.rows; f++) {
          if (!campo.soldados.some(s => s.lane === l && s.row === f)) libres.push({ lane: l, row: f })
        }
      }
      if (libres.length) {
        const sitio = libres[Math.floor(Math.random() * libres.length)]
        const clave = CLAVES_S[Math.floor(Math.random() * Math.min(5, CLAVES_S.length))]
        campo.soldados.push({ ...sitio, k: CLAVES_S.indexOf(clave) })
      }
    }

    // --- dispara y avanza ------------------------------------------------------
    // El daño de todos sus soldados se reparte entre los tres bichos más
    // adelantados: repartirlo entre todos deja media horda viva y llegando.
    const daño = campo.soldados.length * MAQUINA.dañoPorSoldado * dt
    const enCabeza = [...campo.bichos].sort((a, b) => b.z - a.z).slice(0, 3)
    for (const b of enCabeza) {
      b.hp -= daño / enCabeza.length
    }
    for (let i = campo.bichos.length - 1; i >= 0; i--) {
      const b = campo.bichos[i]
      if (b.hp <= 0) {
        campo.bichos.splice(i, 1)
        campo.biomasa += MAQUINA.biomasaPorMuerte
        continue
      }
      b.z += b.vel * dt
      if (b.z >= FIELD.baseZ) {
        campo.bichos.splice(i, 1)
        campo.base = Math.max(0, campo.base - MAQUINA.mordisco * (b.gordo ? 2 : 1))
      }
    }

    // --- te ataca --------------------------------------------------------------
    paraAtaque -= dt
    if (paraAtaque <= 0 && raiz) {
      paraAtaque = MAQUINA.atacaCada * azar(0.7, 1.3)
      // Lo más caro que pueda pagar: un rival que solo manda basura no asusta.
      const posibles = ['tank', 'bloater', 'armored', 'runner', 'walker']
        .filter(k => ZOMBIES[k] && campo.biomasa >= (ZOMBIES[k].coins ?? 40))
      const clave = posibles[0] ?? 'walker'
      campo.biomasa = Math.max(0, campo.biomasa - (ZOMBIES[clave]?.coins ?? 40))
      const clav = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      aplicar({
        ruta: `${raiz}/envios/${uid}/${clav}`,
        valor: { k: clave, l: Math.floor(Math.random() * FIELD.lanes) },
        nuevo: true
      })
    }

    // --- se lo enseña al rival -------------------------------------------------
    if (raiz) {
      aplicar({
        ruta: `${raiz}/campo/${botUid}`,
        valor: {
          b: Math.round(campo.base),
          z: campo.bichos.map(b => [b.k, Math.round(b.x * 10), Math.round(b.z * 10)]),
          s: campo.soldados.map(s => [s.k, s.lane, s.row])
        }
      })
    }

    if (campo.base <= 0) {
      parar()
      if (raiz) aplicar({ ruta: `${raiz}/fin/${botUid}`, valor: true })
    }
  }

  function meterBicho (clave, lane) {
    const spec = ZOMBIES[clave]
    if (!spec) return
    campo.bichos.push({
      k: CLAVES_Z.indexOf(clave),
      lane,
      x: (lane - (FIELD.lanes - 1) / 2) * FIELD.laneWidth,
      z: FIELD.spawnZ,
      hp: (spec.hp ?? 100) * (1 + campo.t / MAQUINA.endureceCada),
      vel: spec.speed ?? 3,
      gordo: !!spec.wide
    })
  }

  // --- la interfaz de almacén ----------------------------------------------------
  return {
    uid,
    // Para que el duelo sepa que no hay nadie de verdad enfrente: ni puntos, ni
    // cofre, ni tabla. Es entrenamiento.
    esMaquina: true,
    poner: (ruta, valor) => { aplicar({ ruta, valor }); return Promise.resolve() },
    añadir: (ruta, valor) => {
      const clave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      aplicar({ ruta: `${ruta}/${clave}`, valor, nuevo: true })
      // Lo que le mandas le hace daño de verdad: no es un adorno.
      if (/\/envios\//.test(ruta)) {
        const spec = ZOMBIES[valor?.k]
        if (spec) {
          setTimeout(() => meterBicho(valor.k, valor.l ?? 0), 400)
        }
      }
      return clave
    },
    quitar: ruta => { aplicar({ ruta, valor: null }); return Promise.resolve() },
    leer: async ruta => obtener(ruta) ?? null,
    alCambiar (ruta, fn) {
      const o = { ruta, fn, tipo: 'valor' }
      oyentes.push(o)
      fn(obtener(ruta) ?? null)
      return () => oyentes.splice(oyentes.indexOf(o), 1)
    },
    alNuevo (ruta, fn) {
      const o = { ruta, fn, tipo: 'nuevo' }
      oyentes.push(o)
      return () => oyentes.splice(oyentes.indexOf(o), 1)
    },
    alIrme: () => {},
    async transaccion (ruta, fn) {
      const v = fn(obtener(ruta) ?? null)
      if (v !== undefined) aplicar({ ruta, valor: v })
      return obtener(ruta) ?? null
    },
    marcaDeTiempo: () => Date.now(),
    cerrar () { parar(); raiz = null; oyentes.length = 0 }
  }
}
