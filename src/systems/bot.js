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


// Los rivales. Isidro pidió que la máquina tuviera cara y nombre, y varios: sale
// uno al azar y cada uno juega distinto de verdad, no solo de nombre.
//
//   defensa  — lo bien que para su horda. Por encima de 1 aguanta más.
//   agresion — cada cuánto te manda algo. Por encima de 1, más seguido.
//   gordos   — cuánto tira de bichos caros cuando te ataca.
export const RIVALES = [
  { id: 'vela', nombre: 'Sargento Vela', mote: 'el que no se mueve', color: 0x4e7ab5, siglas: 'SV',
    defensa: 1.22, agresion: 0.8, gordos: 0.5,
    como: 'Se atrinchera. Cuesta tumbarlo, pero te deja respirar.' },
  { id: 'brea', nombre: 'Cabo Brea', mote: 'el impaciente', color: 0xc9673a, siglas: 'CB',
    defensa: 0.86, agresion: 1.5, gordos: 0.45,
    como: 'No para de mandarte bichos. Aguanta poco, pero no te deja montar la línea.' },
  { id: 'orzua', nombre: 'Teniente Orzúa', mote: 'el de manual', color: 0x5aa06a, siglas: 'TO',
    defensa: 1, agresion: 1, gordos: 0.6,
    como: 'Juega de libro: ni se atrinchera ni se lanza. El rival honrado.' },
  { id: 'carnicera', nombre: 'La Carnicera', mote: 'todo o nada', color: 0xb33f5e, siglas: 'LC',
    defensa: 0.74, agresion: 1.35, gordos: 0.95,
    como: 'Se gasta todo en Colosos. O la revientas pronto o te entierra.' },
  { id: 'topo', nombre: 'El Topo', mote: 'la paciencia', color: 0x8a7a4a, siglas: 'ET',
    defensa: 1.32, agresion: 0.62, gordos: 0.8,
    como: 'Ahorra y aguanta. Ataca poco, pero cuando lo hace duele.' }
]

// El nivel sube solo con las victorias, como pidió: no hay que elegir nada.
// Va de 0 a 5; cada victoria tuya lo sube y cada derrota lo baja.
const CLAVE_MAQUINA = 'alienz-maquina-v1'
export function marcaMaquina () {
  try {
    const m = JSON.parse(localStorage.getItem(CLAVE_MAQUINA) ?? '{}')
    return { nivel: m.nivel ?? 0, ganadas: m.ganadas ?? 0, racha: m.racha ?? 0, mejorRacha: m.mejorRacha ?? 0 }
  } catch { return { nivel: 0, ganadas: 0, racha: 0, mejorRacha: 0 } }
}
export function apuntarMaquina (gane) {
  const m = marcaMaquina()
  const racha = gane ? m.racha + 1 : 0
  const nuevo = {
    nivel: Math.max(0, Math.min(5, m.nivel + (gane ? 1 : -1))),
    ganadas: m.ganadas + (gane ? 1 : 0),
    racha,
    mejorRacha: Math.max(m.mejorRacha, racha)
  }
  try { localStorage.setItem(CLAVE_MAQUINA, JSON.stringify(nuevo)) } catch {}
  return nuevo
}

export function almacenBot ({ sinRival = false } = {}) {
  const uid = 'tu-' + Math.random().toString(36).slice(2, 8)
  const botUid = 'maquina-' + Math.random().toString(36).slice(2, 6)
  // Quién te toca hoy y cómo de dura está. El nivel sube solo con tus
  // victorias: no hay menú de dificultad, se ajusta a ti.
  const rival = RIVALES[Math.floor(Math.random() * RIVALES.length)]
  const nivel = marcaMaquina().nivel
  // De nivel 0 a 5: defiende entre un 15 % peor y un 30 % mejor, y ataca
  // entre un 20 % menos y un 40 % más seguido.
  const fuerza = 0.85 + nivel * 0.09
  const prisa = 0.8 + nivel * 0.12
  const alias = rival.nombre
  let arbol = {}
  const oyentes = []
  let raiz = null
  let reloj = null
  let saludado = false

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
        aplicar({
          ruta: `${raiz}/jugadores/${botUid}`,
          valor: { alias, puntos: 1000, cuenta: false, maquina: rival.id, mote: rival.mote, como: rival.como, siglas: rival.siglas, color: rival.color, nivel }
        })
      }, 900)
    }
    // Y cuando el juego da el pistoletazo, empieza a jugar lo suyo.
    if (t.length === 3 && t[0] === 'duelos' && t[2] === 'inicio' && op.valor) arrancar()
    // Se presenta en cuanto el jugador manda su primera instantánea, que es la
    // señal de que la partida ya está EN MARCHA. Saludando antes, el duelo
    // vaciaba el chat al arrancar y el saludo se perdía.
    if (t.length === 4 && t[2] === 'campo' && t[3] === uid && !saludado) {
      saludado = true
      setTimeout(() => { ultimoDicho = -99; decir(rival.como, 'hola', true) }, 600)
    }
  }


  // --- lo que dice ------------------------------------------------------------
  // Isidro: «que diga lo que hace» y «que hable por el chat». Las dos cosas
  // salen de aquí: escribe en el chat de la sala, que el duelo ya pinta, así que
  // no hace falta tubería nueva. Con freno, que un rival que no calla cansa.
  const dichas = new Set()
  let ultimoDicho = -99
  function decir (texto, marca, unaVez = false) {
    if (!raiz) return
    if (unaVez && dichas.has(marca)) return
    // Un comentario cada seis segundos como mucho, y el de atacar solo a veces:
    // si canta cada bicho que manda, es ruido.
    if (campo.t - ultimoDicho < 6) return
    if (marca === 'ataca' && Math.random() > 0.45) return
    dichas.add(marca)
    ultimoDicho = campo.t
    const clave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    aplicar({ ruta: `${raiz}/chat/${clave}`, // La misma forma que usa el chat de verdad: { de, alias, t }. Con otra, el
      // duelo descartaba el mensaje sin decir nada.
      valor: { de: botUid, alias, t: texto, en: Date.now() }, nuevo: true })
  }

  // Cómo le va, contado por ella misma. Es lo que Isidro echaba en falta: sin
  // esto la máquina era una caja negra y no sabías si ibas ganando.
  function comentarComoVa () {
    const v = campo.base
    if (v <= 25) decir('Se me cae la base. Aguanto lo que pueda.', 'v25', true)
    else if (v <= 50) decir('Me están entrando. Esto se complica.', 'v50', true)
    else if (v <= 75) decir('Primer mordisco. Nada grave.', 'v75', true)
    if (campo.bichos.length >= 9) decir('Menuda oleada me ha caído.', 'oleada')
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
    if (paraCompra <= 0 && campo.soldados.length < Math.round(MAQUINA.tope * rival.defensa)) {
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
    const daño = campo.soldados.length * MAQUINA.dañoPorSoldado * rival.defensa * fuerza * dt
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
      paraAtaque = (MAQUINA.atacaCada / (rival.agresion * prisa)) * azar(0.7, 1.3)
      // Isidro: «igual de seguido pero más gordo». Ahorra hasta poder pagar algo
      // que dé miedo en vez de gastar en cuanto tiene para un Portador; cuánto
      // aguanta sin gastar depende de su estilo (`gordos`).
      const menu = ['tank', 'bloater', 'armored', 'leaper', 'runner', 'walker']
      const puede = menu.filter(k => ZOMBIES[k] && campo.biomasa >= (ZOMBIES[k].coins ?? 40))
      // Si no le llega para nada, espera un par de segundos y vuelve a mirar.
      // Nada de salirse del latido aquí: detrás va la instantánea de su campo y
      // la comprobación de si ha caído, y sin ellas se queda congelada.
      if (!puede.length) paraAtaque = 2
      else {
        // El mejor que puede pagar, o uno peor si es de los que no ahorran.
        const hasta = Math.max(1, Math.round(puede.length * (1 - rival.gordos)))
        const clave = puede[Math.floor(Math.random() * hasta)]
        campo.biomasa = Math.max(0, campo.biomasa - (ZOMBIES[clave]?.coins ?? 40))
        const clav = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        aplicar({
          ruta: `${raiz}/envios/${uid}/${clav}`,
          valor: { k: clave, l: Math.floor(Math.random() * FIELD.lanes) },
          nuevo: true
        })
        decir(`Te va ${ZOMBIES[clave].name}.`, 'ataca')
      }
    }

    comentarComoVa()

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
      ultimoDicho = -99
      decir('Se acabó. Me has podido.', 'fin', true)
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
