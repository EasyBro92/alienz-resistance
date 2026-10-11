// Las voces: los soldados dicen lo suyo al salir al campo, al tumbar a uno, al
// pedir ayuda y al subir de nivel, y por la radio hablan quien manda (oleadas, la
// base, el final) y quien trae el apoyo (Isidro, 11/10: «sonidos de los
// personajes que hablen en algún momento, que tengan frases recurrentes»).
//
// Es lo único del sonido que NO se hace por código: una frase no se sintetiza
// con osciladores. Las dice `herramientas/voces/montar.mjs` con las voces de
// Windows y aquí llegan en un archivo por hablante (`public/voces/`), con
// `src/voces.json` diciendo en qué byte empieza cada frase. Lo que sí se hace
// aquí es la RADIO —la banda estrecha, la saturación, el chasquido del pulsador
// y la paja de fondo—, que es además lo que le quita a la voz lo que tiene de
// lector de pantalla.
//
// Tres reglas para que no canse:
//   · habla UNO cada vez. Lo que manda más (el final, el jefe, la oleada) corta
//     a quien esté hablando; un comentario se calla si hay alguien al aparato;
//   · cada momento tiene su descanso (`hueco`): nadie celebra cada baja;
//   · nadie repite la frase que acaba de decir.
import INDICE from '../voces.json'

// Cuánto suenan sobre la mezcla. Medido con `guion-voces.mjs`: con 0,8 una frase
// queda entre el fusil y la escopeta (pico a -8 dB); las monedas y los botones
// van unos diez decibelios por debajo.
const NIVEL = 0.8

export function crearVoces (audio, { sexoDe = () => 1 } = {}) {
  let ctx = null
  let salida = null
  let ruido = null
  let volumen = 1
  // Un contexto aparte a 16 kHz, solo para decodificar. `decodeAudioData` deja
  // el sonido a la frecuencia de SU contexto: con el de la partida (48 kHz) cada
  // frase ocuparía el triple de memoria para sonar igual, que la voz ya viene a 16.
  let taller = null
  const paquetes = new Map()        // hablante → { frases, promesa }
  const anterior = new Map()        // hablante|momento → la última que dijo
  const ultimo = {}                 // momento → cuándo sonó por última vez
  let hablando = null               // { hasta, prioridad, corte }
  let enCola = null
  const dichas = []                 // las últimas, para las pruebas

  function enchufar () {
    if (ctx) return true
    try {
      const e = audio.enchufe()
      ctx = e.ctx
      ruido = e.ruido
      salida = ctx.createGain()
      salida.gain.value = NIVEL * volumen
      salida.connect(e.master)
      try {
        const Taller = window.OfflineAudioContext || window.webkitOfflineAudioContext
        taller = new Taller(1, 1, 16000)
      } catch { taller = null }
      return true
    } catch { return false }
  }

  // Quién es en el reparto: las cinco de la caja y la radio, por su nombre; los
  // soldados de la tienda, con la voz de chica o de chico que lleven puesta.
  const hablante = clave => (INDICE[clave] ? clave : `${clave}-${sexoDe(clave) ? 'm' : 'f'}`)

  const decodificar = bytes => new Promise((resolve, reject) => {
    const c = taller ?? ctx
    // Las dos formas: la de promesa y la antigua de Safari, con funciones.
    const p = c.decodeAudioData(bytes, resolve, reject)
    p?.then?.(resolve, reject)
  })

  // El MP3 deja unas centésimas de silencio delante: se salta, que la frase
  // tiene que caer cuando pasa lo que cuenta.
  function medir (buf) {
    const d = buf.getChannelData(0)
    let a = 0
    while (a < d.length && Math.abs(d[a]) < 0.02) a++
    let b = d.length - 1
    while (b > a && Math.abs(d[b]) < 0.02) b--
    const desde = Math.max(0, a / buf.sampleRate - 0.01)
    return { buf, desde, dura: Math.max(0.1, (b - a) / buf.sampleRate + 0.05) }
  }

  function cargar (quien) {
    const ficha = INDICE[quien]
    if (!ficha) return Promise.resolve(null)
    let p = paquetes.get(quien)
    if (p) return p.promesa
    p = { frases: null }
    paquetes.set(quien, p)
    p.promesa = (async () => {
      const todo = await (await fetch('voces/' + ficha.a)).arrayBuffer()
      const frases = {}
      for (const [momento, lista] of Object.entries(ficha.f)) {
        frases[momento] = []
        for (const [desde, largo] of lista) frases[momento].push(medir(await decodificar(todo.slice(desde, desde + largo))))
      }
      p.frases = frases
      return frases
    })().catch(() => { paquetes.delete(quien); return null })   // sin red: se queda callado y lo reintenta otra vez
    return p.promesa
  }

  // La saturación de la radio: una curva que redondea los picos.
  const curvas = new Map()
  function curva (empuje) {
    if (!curvas.has(empuje)) {
      const c = new Float32Array(257)
      for (let i = 0; i < 257; i++) c[i] = Math.tanh((i / 128 - 1) * empuje) / Math.tanh(empuje)
      curvas.set(empuje, c)
    }
    return curvas.get(empuje)
  }

  // Un chasquido del pulsador: ruido cortísimo que se apaga.
  function chasquido (t, fuerza, destino) {
    const src = ctx.createBufferSource()
    src.buffer = ruido
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7
    const g = ctx.createGain()
    g.gain.setValueAtTime(fuerza, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    src.connect(f).connect(g).connect(destino)
    src.start(t, Math.random() * 1.5, 0.07)
  }

  // `radio` dice cuánta: 1 la de quien habla desde lejos (el mando, el piloto),
  // con su paja de fondo y sus dos chasquidos; 0,5 la del casco de un soldado
  // que está ahí mismo, más abierta, sin paja y colocada en su lado del campo.
  function sonar (frase, { x = 0, radio = 1 }) {
    const lejos = radio > 0.75
    const t = ctx.currentTime + 0.03
    const entra = t + (lejos ? 0.05 : 0.02)
    const fin = entra + frase.dura

    const corte = ctx.createGain()
    let destino = salida
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner()
      pan.pan.value = lejos ? 0 : Math.max(-0.6, Math.min(0.6, x))
      pan.connect(salida)
      destino = pan
    }
    corte.connect(destino)

    const src = ctx.createBufferSource()
    src.buffer = frase.buf
    // Ninguna vez suena idéntica a la anterior.
    src.playbackRate.value = 0.975 + Math.random() * 0.05
    const alto = ctx.createBiquadFilter()
    alto.type = 'highpass'; alto.frequency.value = lejos ? 430 : 260
    const bajo = ctx.createBiquadFilter()
    bajo.type = 'lowpass'; bajo.frequency.value = lejos ? 2900 : 3700
    const sat = ctx.createWaveShaper()
    sat.curve = curva(lejos ? 2.6 : 1.5)
    const nivel = ctx.createGain()
    nivel.gain.value = lejos ? 0.8 : 0.95
    src.connect(alto).connect(bajo).connect(sat).connect(nivel).connect(corte)
    src.start(entra, frase.desde)

    chasquido(t, lejos ? 0.22 : 0.1, corte)
    if (lejos) {
      chasquido(fin, 0.2, corte)
      const paja = ctx.createBufferSource()
      paja.buffer = ruido
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.5
      const g = ctx.createGain()
      g.gain.value = 0.02
      paja.connect(f).connect(g).connect(corte)
      // En bucle: el trozo de ruido dura dos segundos y hay frases más largas.
      paja.loop = true
      paja.start(t, Math.random())
      paja.stop(fin + 0.04)
    }
    return { hasta: fin + 0.25, corte, src }
  }

  function callar () {
    if (!hablando) return
    const t = ctx.currentTime
    hablando.corte.gain.setTargetAtTime(0, t, 0.025)
    try { hablando.src.stop(t + 0.15) } catch { /* ya había acabado */ }
    hablando = null
  }

  // Alguien dice algo. Devuelve si ha llegado a sonar.
  //   prioridad  3 manda (corta a los demás y, si hay otro 3 hablando, espera su turno),
  //              2 un soldado que sale o pide ayuda, 1 un comentario
  //   hueco      segundos mínimos desde la última vez que sonó este mismo momento
  //   prob       de cada cuántas veces lo dice
  //   cola       si hay alguien hablando, espera a que acabe en vez de callarse
  //              (un sitio solo: el aviso de una forma nueva llega justo cuando
  //              se está cantando la oleada, y si no, no sonaría nunca)
  function decir (quien, momento, { x = 0, prioridad = 1, hueco = 0, prob = 1, radio = 1, cola = false } = {}) {
    const ficha = INDICE[quien]
    if (!ficha?.f[momento] || audio.muted || volumen <= 0) return false
    if (prob < 1 && Math.random() > prob) return false
    if (!enchufar() || ctx.state !== 'running') return false
    const t = ctx.currentTime
    if (t - (ultimo[momento] ?? -99) < hueco) return false
    const p = paquetes.get(quien)
    if (!p?.frases) { cargar(quien); return false }      // aún bajando: esta vez se queda callado
    if (hablando && t < hablando.hasta) {
      if (prioridad < 3 || hablando.prioridad >= 3) {
        // Dos avisos del mando seguidos: el segundo espera a que acabe el primero.
        if ((prioridad >= 3 || cola) && !enCola) {
          enCola = setTimeout(() => { enCola = null; decir(quien, momento, { x, prioridad, hueco, radio }) }, (hablando.hasta - t) * 1000 + 60)
        }
        return false
      }
      callar()
    }
    const lista = p.frases[momento]
    let i = Math.floor(Math.random() * lista.length)
    const clave = quien + '|' + momento
    if (lista.length > 1 && i === anterior.get(clave)) i = (i + 1) % lista.length
    anterior.set(clave, i)
    hablando = { ...sonar(lista[i], { x, radio }), prioridad }
    ultimo[momento] = t
    dichas.push({ t: +t.toFixed(2), quien, momento, i, dura: +lista[i].dura.toFixed(2) })
    if (dichas.length > 80) dichas.shift()
    audio.agachar(lista[i].dura + 0.15)
    return true
  }

  return {
    decir,
    // Un soldado, por su clave de unidad (`rifle`, `jill`…): con su voz y por la
    // radio de su casco.
    soldado: (clave, momento, opciones = {}) => decir(hablante(clave), momento, { radio: 0.5, ...opciones }),
    // Lo mismo fuera de una partida (la tienda), donde su archivo aún no ha
    // bajado: lo trae y entonces habla.
    async presentar (clave, momento = 'sale') {
      if (!enchufar()) return false
      await cargar(hablante(clave))
      return decir(hablante(clave), momento, { radio: 0.5, prioridad: 3 })
    },
    // Quien manda y quien trae el apoyo: por la radio de verdad.
    mando: (momento, opciones = {}) => decir('mando', momento, { prioridad: 3, ...opciones }),
    apoyo: (momento, opciones = {}) => decir('apoyo', momento, { prioridad: 2, ...opciones }),
    // Bajar ya los archivos de quien puede hablar en esta partida, de uno en uno
    // (son 40 KB cada uno): así la primera frase de cada cual no se pierde.
    async precargar (claves) {
      if (!enchufar()) return
      for (const c of ['mando', 'apoyo', ...claves]) await cargar(INDICE[c] ? c : hablante(c))
    },
    callar,
    setVolumen (v) {
      volumen = Math.max(0, Math.min(1, v))
      if (salida) salida.gain.value = NIVEL * volumen
    },
    // Para las pruebas: qué hay cargado y si alguien habla.
    estado: () => ({
      cargados: [...paquetes].filter(([, p]) => p.frases).map(([q]) => q),
      hablando: !!hablando && ctx.currentTime < hablando.hasta,
      dichas: [...dichas],
      taller: taller?.sampleRate ?? null
    })
  }
}
