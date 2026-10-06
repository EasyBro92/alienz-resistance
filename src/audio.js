// Todo el sonido se genera por código: cero archivos, cero licencias que revisar
// y la descarga sigue pesando nada. Cuando quieras música compuesta, se sustituye
// startMusic() por un <audio> en bucle.
export function createAudio () {
  let ctx = null
  let master = null
  let musicGain = null
  let sfxGain = null
  let musicTimer = null
  // Filtro fijo en la cadena de la música. En marcha está abierto del todo y no
  // se nota; al pausar se cierra, y eso es lo que hace que suene "detrás del
  // cristal" en vez de simplemente bajar de volumen.
  let musicFilter = null
  let step = 0
  let intensity = 0
  let muted = false
  // Volúmenes elegidos en Ajustes (de 0 a 1), sobre la mezcla de siempre.
  let volEfectos = 1
  let volMusica = 1

  function ensure () {
    if (ctx) return ctx
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55 * volEfectos; sfxGain.connect(master)
    musicFilter = ctx.createBiquadFilter()
    musicFilter.type = 'lowpass'
    musicFilter.frequency.value = 20000        // abierto: no toca nada
    musicFilter.connect(master)
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22 * volMusica; musicGain.connect(musicFilter)
    return ctx
  }

  function noiseBuffer (seconds = 0.4) {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  function env (node, peak, attack, decay) {
    const t = ctx.currentTime
    node.gain.setValueAtTime(0.0001, t)
    node.gain.exponentialRampToValueAtTime(peak, t + attack)
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  function play (build) {
    if (muted) return
    ensure()
    if (ctx.state === 'suspended') ctx.resume()
    build()
  }

  // --- las piezas de un disparo ---------------------------------------------------
  // Un solo trozo de ruido para todo (antes se fabricaba uno nuevo en cada
  // disparo) y una sala: una reverberación corta hecha con ruido que se apaga,
  // que es lo que hace que un tiro suene en un sitio y no dentro del altavoz.
  let ruido = null
  let sala = null
  const ultimo = {}
  const HUECO = { rifle: 0.04, gunner: 0.045, torreta: 0.05, flamer: 0.13, archer: 0.05, shotgun: 0.08, sniper: 0.1, misil: 0.12, mortar: 0.12, pistola: 0.04, subfusil: 0.04, lanzagranadas: 0.12, ballesta: 0.05, dragunov: 0.09 }

  function preparar () {
    if (ruido) return
    ruido = noiseBuffer(2)
    const largo = Math.floor(ctx.sampleRate * 0.9)
    const eco = ctx.createBuffer(2, largo, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = eco.getChannelData(c)
      let suave = 0
      for (let i = 0; i < largo; i++) {
        // Ruido que se apaga y pierde agudos según pasa: una calle, no un baño.
        const k = i / largo
        suave += ((Math.random() * 2 - 1) - suave) * (0.55 - 0.45 * k)
        d[i] = suave * Math.exp(-5.5 * k)
      }
    }
    sala = ctx.createConvolver()
    sala.buffer = eco
    const vuelta = ctx.createGain()
    vuelta.gain.value = 0.55
    sala.connect(vuelta).connect(sfxGain)
  }

  // Por dónde sale un sonido: su sitio entre izquierda y derecha y cuánto manda a la sala.
  function voz (x = 0, aSala = 0.25) {
    preparar()
    const salida = ctx.createGain()
    let destino = sfxGain
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.max(-0.75, Math.min(0.75, x))
      pan.connect(sfxGain)
      destino = pan
    }
    salida.connect(destino)
    const envio = ctx.createGain()
    envio.gain.value = aSala
    salida.connect(envio).connect(sala)
    return salida
  }

  // Una capa de ruido filtrado: `f0` → `f1` es por dónde viaja el filtro.
  function soplo (salida, t, { tipo = 'bandpass', f0, f1 = f0, q = 0.8, pico, ataque = 0.001, cae, viaje = cae }) {
    const src = ctx.createBufferSource()
    src.buffer = ruido
    const f = ctx.createBiquadFilter()
    f.type = tipo
    f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + viaje)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(pico, t + ataque)
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + cae)
    src.connect(f).connect(g).connect(salida)
    const largo = ataque + cae + 0.03
    src.start(t, Math.random() * (2 - largo - 0.01), largo)
  }

  // Una capa de tono que cae: el golpe grave de un disparo, la cuerda de un arco.
  function tono (salida, t, { forma = 'sine', f0, f1 = f0, pico, ataque = 0.002, cae }) {
    const o = ctx.createOscillator()
    o.type = forma
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + ataque + cae)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(pico, t + ataque)
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + cae)
    o.connect(g).connect(salida)
    o.start(t)
    o.stop(t + ataque + cae + 0.03)
  }

  // Un clic de metal: la corredera, el cerrojo, el casquillo.
  const clic = (s, t, f, pico = 0.1) => soplo(s, t, { f0: f, q: 2.5, pico, cae: 0.022 })

  const ARMAS = {
    // Fusil: chasquido seco, cuerpo corto y un golpe grave debajo.
    rifle (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 2400 * v, pico: 0.42, cae: 0.045 })
      soplo(s, t, { tipo: 'lowpass', f0: 1100 * v, f1: 280, pico: 0.5, cae: 0.12 })
      tono(s, t, { f0: 170 * v, f1: 55, pico: 0.5, cae: 0.09 })
    },
    // Ametralladora: más grave y más corta que el fusil, para que la ráfaga no se empaste.
    gunner (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 1700 * v, pico: 0.34, cae: 0.032 })
      soplo(s, t, { tipo: 'lowpass', f0: 800 * v, f1: 200, pico: 0.55, cae: 0.085 })
      tono(s, t, { f0: 125 * v, f1: 44, pico: 0.6, cae: 0.075 })
    },
    // Torreta: metálica y aguda, se distingue de los soldados.
    torreta (s, t, v) {
      soplo(s, t, { f0: 3200 * v, q: 1.6, pico: 0.62, cae: 0.035 })
      soplo(s, t, { tipo: 'lowpass', f0: 1300 * v, f1: 400, pico: 0.62, cae: 0.07 })
      tono(s, t, { forma: 'square', f0: 210 * v, f1: 90, pico: 0.26, cae: 0.05 })
    },
    // Escopeta: un trueno ancho, y después la corredera: clac-clac.
    shotgun (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 1500 * v, pico: 0.38, cae: 0.06 })
      soplo(s, t, { tipo: 'lowpass', f0: 1600 * v, f1: 150, pico: 0.85, cae: 0.3 })
      tono(s, t, { f0: 115 * v, f1: 36, pico: 0.85, cae: 0.2 })
      clic(s, t + 0.3, 1500 * v, 0.13)
      clic(s, t + 0.41, 2300 * v, 0.11)
    },
    // Tirador: el chasquido más fuerte, una cola larga que rueda, y el cerrojo.
    sniper (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 3200 * v, pico: 0.7, cae: 0.035 })
      soplo(s, t, { tipo: 'lowpass', f0: 2000 * v, f1: 180, pico: 0.75, cae: 0.26 })
      tono(s, t, { f0: 150 * v, f1: 38, pico: 0.75, cae: 0.2 })
      clic(s, t + 0.5, 1900 * v, 0.09)
      clic(s, t + 0.64, 2700 * v, 0.08)
    },
    // Arco: la cuerda que vibra y la flecha cortando el aire. Sin pólvora.
    archer (s, t, v) {
      tono(s, t, { forma: 'triangle', f0: 250 * v, f1: 150, pico: 0.5, cae: 0.17 })
      tono(s, t, { forma: 'triangle', f0: 505 * v, f1: 300, pico: 0.18, cae: 0.09 })
      soplo(s, t, { f0: 1100, f1: 3400, q: 1.2, pico: 0.26, ataque: 0.025, cae: 0.15 })
    },
    // Lanzallamas: no dispara, ruge.
    flamer (s, t, v) {
      soplo(s, t, { f0: 520 * v, f1: 900, q: 0.5, pico: 0.75, ataque: 0.05, cae: 0.34 })
      soplo(s, t, { tipo: 'lowpass', f0: 190 * v, pico: 0.7, ataque: 0.04, cae: 0.3 })
      soplo(s, t, { tipo: 'highpass', f0: 4200, pico: 0.14, ataque: 0.03, cae: 0.25 })
    },
    // Misil: el golpe del encendido y el motor que se va, cada vez más agudo.
    misil (s, t, v) {
      tono(s, t, { f0: 95 * v, f1: 48, pico: 0.6, cae: 0.16 })
      soplo(s, t, { f0: 380 * v, f1: 2600, q: 0.9, pico: 0.62, ataque: 0.03, cae: 0.6, viaje: 0.5 })
      soplo(s, t, { tipo: 'highpass', f0: 3000, pico: 0.12, ataque: 0.02, cae: 0.4 })
    },
    // Mortero: el «tump» hueco del tubo, con su resto metálico.
    mortar (s, t, v) {
      tono(s, t, { f0: 155 * v, f1: 50, pico: 0.95, cae: 0.24 })
      soplo(s, t, { tipo: 'lowpass', f0: 750 * v, f1: 180, pico: 0.42, cae: 0.15 })
      tono(s, t, { forma: 'triangle', f0: 540 * v, pico: 0.07, cae: 0.22 })
    },
    // --- las de la caja alienígena: cada una suena a lo suyo ---
    // Pistola: un chasquido corto y agudo, sin cola, y el casquillo.
    pistola (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 3000 * v, pico: 0.46, cae: 0.028 })
      soplo(s, t, { tipo: 'lowpass', f0: 1500 * v, f1: 420, pico: 0.4, cae: 0.07 })
      tono(s, t, { f0: 240 * v, f1: 90, pico: 0.34, cae: 0.05 })
      clic(s, t + 0.12, 3600 * v, 0.045)
    },
    // Subfusil: más fino y seco que el fusil, hecho para ir en ráfaga.
    subfusil (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 2700 * v, pico: 0.34, cae: 0.024 })
      soplo(s, t, { f0: 1300 * v, f1: 600, q: 1.1, pico: 0.42, cae: 0.05 })
      tono(s, t, { f0: 200 * v, f1: 80, pico: 0.3, cae: 0.045 })
    },
    // Lanzagranadas: el «pum» hueco del tubo ancho y el clac al cerrarlo.
    lanzagranadas (s, t, v) {
      tono(s, t, { f0: 210 * v, f1: 62, pico: 0.9, cae: 0.16 })
      soplo(s, t, { tipo: 'lowpass', f0: 520 * v, f1: 160, pico: 0.5, cae: 0.12 })
      soplo(s, t, { f0: 1800, q: 1.4, pico: 0.12, cae: 0.04 })
      clic(s, t + 0.34, 1300 * v, 0.1)
    },
    // Ballesta: el latigazo de las palas, más seco que un arco, y el virote silbando.
    ballesta (s, t, v) {
      tono(s, t, { forma: 'triangle', f0: 190 * v, f1: 85, pico: 0.55, cae: 0.07 })
      soplo(s, t, { f0: 900 * v, q: 2.2, pico: 0.4, cae: 0.03 })
      soplo(s, t, { f0: 1600, f1: 4200, q: 1.6, pico: 0.2, ataque: 0.02, cae: 0.11 })
      clic(s, t + 0.02, 2400 * v, 0.08)
    },
    // Fusil de tiradora, semiautomático: chasquido fuerte y cola media, sin cerrojo.
    dragunov (s, t, v) {
      soplo(s, t, { tipo: 'highpass', f0: 2900 * v, pico: 0.6, cae: 0.035 })
      soplo(s, t, { tipo: 'lowpass', f0: 1700 * v, f1: 220, pico: 0.66, cae: 0.18 })
      tono(s, t, { f0: 160 * v, f1: 46, pico: 0.62, cae: 0.13 })
    }
  }
  // Cuánto de cada arma se va a la sala: el tirador, mucho (es el que retumba).
  Object.assign(ARMAS.rifle, { sala: 0.26 })
  Object.assign(ARMAS.gunner, { sala: 0.16 })
  Object.assign(ARMAS.torreta, { sala: 0.14 })
  Object.assign(ARMAS.shotgun, { sala: 0.4 })
  Object.assign(ARMAS.sniper, { sala: 0.75 })
  Object.assign(ARMAS.archer, { sala: 0.08 })
  Object.assign(ARMAS.flamer, { sala: 0.1 })
  Object.assign(ARMAS.misil, { sala: 0.3 })
  Object.assign(ARMAS.mortar, { sala: 0.36 })
  Object.assign(ARMAS.pistola, { sala: 0.2 })
  Object.assign(ARMAS.subfusil, { sala: 0.16 })
  Object.assign(ARMAS.lanzagranadas, { sala: 0.3 })
  Object.assign(ARMAS.ballesta, { sala: 0.08 })
  Object.assign(ARMAS.dragunov, { sala: 0.55 })

  const api = {
    unlock () { ensure(); if (ctx.state === 'suspended') ctx.resume() },
    get muted () { return muted },
    setVolumen (tipo, v) {
      const k = Math.max(0, Math.min(1, v))
      if (tipo === 'efectos') {
        volEfectos = k
        if (sfxGain) sfxGain.gain.value = 0.55 * k
      }
      if (tipo === 'musica') {
        volMusica = k
        if (musicGain) musicGain.gain.value = 0.22 * k
      }
    },
    toggleMute () {
      muted = !muted
      if (master) master.gain.value = muted ? 0 : 0.9
      return muted
    },

    // El disparo de cada arma (Isidro, 06/10: «céntrate en el sonido de las
    // armas»). Antes todas eran el mismo soplido de ruido con el filtro en otro
    // sitio: el arco sonaba a fusil y el mortero a escopeta. Ahora cada una se
    // monta con sus capas —el chasquido, el cuerpo, el golpe grave, la cola de
    // la sala y su mecánica (la corredera de la escopeta, el cerrojo del
    // tirador)— y `x` la coloca a izquierda o derecha según su carril.
    shot (kind = 'rifle', x = 0) {
      play(() => {
        const t = ctx.currentTime
        // Veinte fusileros a la vez no son veinte disparos: son una pasta. Cada
        // arma tiene un hueco mínimo entre dos sonidos suyos.
        const hueco = HUECO[kind] ?? 0.035
        if (t - (ultimo[kind] ?? -1) < hueco) return
        ultimo[kind] = t
        const v = 0.93 + Math.random() * 0.14        // ningún disparo es igual al anterior
        const receta = ARMAS[kind] ?? ARMAS.rifle
        receta(voz(x, receta.sala ?? 0.25), t, v)
      })
    },

    coin () {
      play(() => {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.setValueAtTime(880, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(1620, ctx.currentTime + 0.09)
        const g = ctx.createGain()
        env(g, 0.22, 0.005, 0.14)
        o.connect(g).connect(sfxGain)
        o.start(); o.stop(ctx.currentTime + 0.2)
      })
    },

    groan (big = false) {
      play(() => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        const base = big ? 58 : 110 + Math.random() * 40
        o.frequency.setValueAtTime(base, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(base * 0.6, ctx.currentTime + 0.5)
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'; f.frequency.value = big ? 380 : 700
        const g = ctx.createGain()
        env(g, big ? 0.5 : 0.16, 0.06, big ? 0.9 : 0.4)
        o.connect(f).connect(g).connect(sfxGain)
        o.start(); o.stop(ctx.currentTime + 1.2)
      })
    },

    // La explosión (misil, mortero, granada, bombas): el estampido, el cuerpo
    // que se hunde, el golpe en el pecho y los cascotes que caen después.
    boom () {
      play(() => {
        const t = ctx.currentTime
        if (t - (ultimo.boom ?? -1) < 0.06) return
        ultimo.boom = t
        const s = voz(0, 0.5)
        const v = 0.9 + Math.random() * 0.2
        soplo(s, t, { tipo: 'highpass', f0: 1800, pico: 0.35, cae: 0.05 })
        soplo(s, t, { tipo: 'lowpass', f0: 1900 * v, f1: 85, pico: 0.85, ataque: 0.005, cae: 0.8, viaje: 0.7 })
        tono(s, t, { f0: 95 * v, f1: 30, pico: 0.9, ataque: 0.004, cae: 0.5 })
        for (let i = 0; i < 4; i++) clic(s, t + 0.22 + Math.random() * 0.45, 900 + Math.random() * 2200, 0.05)
      })
    },

    thud () {
      play(() => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(180, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.25)
        const g = ctx.createGain()
        env(g, 0.7, 0.004, 0.3)
        o.connect(g).connect(sfxGain)
        o.start(); o.stop(ctx.currentTime + 0.4)
      })
    },

    place () {
      play(() => {
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.setValueAtTime(320, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.07)
        const g = ctx.createGain()
        env(g, 0.14, 0.004, 0.09)
        o.connect(g).connect(sfxGain)
        o.start(); o.stop(ctx.currentTime + 0.2)
      })
    },

    denied () {
      play(() => {
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.setValueAtTime(220, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12)
        const g = ctx.createGain()
        env(g, 0.12, 0.004, 0.12)
        o.connect(g).connect(sfxGain)
        o.start(); o.stop(ctx.currentTime + 0.25)
      })
    },

    // La nave de desembarco, por fases.
    //
    // Es lo más grande que pasa en pantalla y era lo único que pasaba en
    // silencio: bajaba trece metros, apoyaba, abría una compuerta y volvía a
    // subir sin hacer ruido. Con sonido, además, se oye venir la oleada antes de
    // verla —la nave avisa con 3,4 segundos de antelación—, así que da tiempo a
    // levantar la vista del arsenal.
    nave (fase) {
      play(() => {
        const t = ctx.currentTime
        if (fase === 'bajando') {
          // Zumbido grave que se acerca: dos osciladores desafinados entre sí,
          // que es lo que hace que "bata" en vez de sonar a pitido de horno.
          for (const [hz, det] of [[42, 0], [42, 1.6]]) {
            const o = ctx.createOscillator()
            o.type = 'sawtooth'
            o.frequency.setValueAtTime(hz + det, t)
            o.frequency.linearRampToValueAtTime(hz * 1.5 + det, t + 2.4)
            const f = ctx.createBiquadFilter()
            f.type = 'lowpass'
            f.frequency.setValueAtTime(180, t)
            f.frequency.linearRampToValueAtTime(620, t + 2.4)
            const g = ctx.createGain()
            g.gain.setValueAtTime(0.0001, t)
            g.gain.exponentialRampToValueAtTime(0.3, t + 1.9)
            g.gain.exponentialRampToValueAtTime(0.0001, t + 2.55)
            o.connect(f).connect(g).connect(sfxGain)
            o.start(t); o.stop(t + 2.6)
          }
          return
        }

        if (fase === 'posada') {
          // El golpe de las patas contra el asfalto y el polvo que levanta: un
          // seno que se desploma y una ráfaga de ruido filtrada encima.
          const o = ctx.createOscillator()
          o.type = 'sine'
          o.frequency.setValueAtTime(120, t)
          o.frequency.exponentialRampToValueAtTime(34, t + 0.5)
          const g = ctx.createGain()
          env(g, 0.8, 0.006, 0.55)
          o.connect(g).connect(sfxGain)
          o.start(t); o.stop(t + 0.7)

          const src = ctx.createBufferSource()
          src.buffer = noiseBuffer(0.9)
          const f = ctx.createBiquadFilter()
          f.type = 'bandpass'
          f.frequency.setValueAtTime(1400, t)
          f.frequency.exponentialRampToValueAtTime(320, t + 0.8)
          const ng = ctx.createGain()
          env(ng, 0.3, 0.03, 0.8)
          src.connect(f).connect(ng).connect(sfxGain)
          src.start(t); src.stop(t + 1)
          return
        }

        if (fase === 'rampa') {
          // Servo hidráulico: un tono que sube despacio mientras la compuerta
          // baja, y un chasquido metálico al llegar al asfalto.
          const o = ctx.createOscillator()
          o.type = 'square'
          o.frequency.setValueAtTime(70, t)
          o.frequency.linearRampToValueAtTime(128, t + 0.9)
          const f = ctx.createBiquadFilter()
          f.type = 'lowpass'; f.frequency.value = 900
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.12, t + 0.08)
          g.gain.setValueAtTime(0.12, t + 0.82)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1)
          o.connect(f).connect(g).connect(sfxGain)
          o.start(t); o.stop(t + 1.05)

          const golpe = ctx.createOscillator()
          golpe.type = 'triangle'
          golpe.frequency.setValueAtTime(240, t + 0.95)
          golpe.frequency.exponentialRampToValueAtTime(90, t + 1.15)
          const gg = ctx.createGain()
          gg.gain.setValueAtTime(0.0001, t + 0.95)
          gg.gain.exponentialRampToValueAtTime(0.34, t + 0.965)
          gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
          golpe.connect(gg).connect(sfxGain)
          golpe.start(t + 0.95); golpe.stop(t + 1.35)
          return
        }

        if (fase === 'subiendo') {
          // Se va: el zumbido al revés, subiendo de tono y alejándose.
          const o = ctx.createOscillator()
          o.type = 'sawtooth'
          o.frequency.setValueAtTime(64, t)
          o.frequency.exponentialRampToValueAtTime(150, t + 2.6)
          const f = ctx.createBiquadFilter()
          f.type = 'lowpass'
          f.frequency.setValueAtTime(700, t)
          f.frequency.exponentialRampToValueAtTime(150, t + 2.6)
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.22, t + 0.25)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.7)
          o.connect(f).connect(g).connect(sfxGain)
          o.start(t); o.stop(t + 2.8)
        }
      })
    },

    // La nave posándose al fondo de la carretera.
    //
    // Era lo único grande del juego que pasaba en silencio: baja una nave del
    // tamaño de un edificio, abre la compuerta y no se oye nada. Y es además el
    // aviso de que empieza la oleada, así que suena ANTES de que se vea llegar
    // —el jugador está mirando su línea, no el fondo— y da los segundos que
    // faltan para colocar.
    //
    // Dos capas. Un bajo que cae de tono: es el motor frenando contra el suelo,
    // y lo que hace que se lea como algo que se POSA y no como algo que pasa de
    // largo. Y encima un siseo filtrado que se abre, que es el aire de la
    // compuerta. Con el jefe todo baja de tono y dura más: la misma nave, pero
    // más grande.
    nave (jefe = false) {
      play(() => {
        const t = ctx.currentTime
        const largo = jefe ? 2.6 : 1.8

        const motor = ctx.createOscillator()
        motor.type = 'sawtooth'
        const hz = jefe ? 62 : 96
        motor.frequency.setValueAtTime(hz, t)
        motor.frequency.exponentialRampToValueAtTime(hz * 0.42, t + largo)
        const filtro = ctx.createBiquadFilter()
        filtro.type = 'lowpass'
        filtro.frequency.setValueAtTime(420, t)
        filtro.frequency.exponentialRampToValueAtTime(120, t + largo)
        const gm = ctx.createGain()
        gm.gain.setValueAtTime(0.0001, t)
        gm.gain.exponentialRampToValueAtTime(jefe ? 0.5 : 0.32, t + 0.5)
        gm.gain.exponentialRampToValueAtTime(0.0001, t + largo)
        motor.connect(filtro).connect(gm).connect(sfxGain)
        motor.start(t); motor.stop(t + largo + 0.1)

        // El aire de la compuerta, en la segunda mitad: primero se posa y
        // DESPUÉS abre. Al revés no se entiende qué ha pasado.
        const aire = ctx.createBufferSource()
        aire.buffer = noiseBuffer(1.2)
        const fa = ctx.createBiquadFilter()
        fa.type = 'bandpass'
        fa.frequency.setValueAtTime(300, t + largo * 0.55)
        fa.frequency.exponentialRampToValueAtTime(1800, t + largo)
        fa.Q.value = 0.7
        const ga = ctx.createGain()
        ga.gain.setValueAtTime(0.0001, t + largo * 0.55)
        ga.gain.exponentialRampToValueAtTime(0.2, t + largo * 0.78)
        ga.gain.exponentialRampToValueAtTime(0.0001, t + largo + 0.5)
        aire.connect(fa).connect(ga).connect(sfxGain)
        aire.start(t + largo * 0.55); aire.stop(t + largo + 0.6)
      })
    },

    // Un clic seco por cada pieza del cofre que pasa bajo la marca. Tiene que
    // ser cortísimo y flojo: suena decenas de veces seguidas y cualquier cola
    // se amontonaría en un zumbido.
    tic () {
      play(() => {
        const t = ctx.currentTime
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.setValueAtTime(1800, t)
        const g = ctx.createGain()
        env(g, 0.05, 0.001, 0.025)
        o.connect(g).connect(sfxGain)
        o.start(t); o.stop(t + 0.05)
      })
    },

    // El billete: dos notas que suben, más alegres que la moneda. Suena poco
    // —uno cada 30 monedas— y tiene que distinguirse de ella a oído.
    billete () {
      play(() => {
        const t = ctx.currentTime
        ;[660, 990].forEach((hz, i) => {
          const t0 = t + i * 0.07
          const o = ctx.createOscillator()
          o.type = 'triangle'
          o.frequency.setValueAtTime(hz, t0)
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t0)
          g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01)
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
          o.connect(g).connect(sfxGain)
          o.start(t0); o.stop(t0 + 0.22)
        })
      })
    },

    // Pausa. Dos cosas a la vez, y las dos hacen falta.
    //
    // El sonido: un golpe seco que BAJA de tono al parar y SUBE al seguir. Es la
    // misma información que da el icono, pero llega antes que la vista y sin
    // mirar, que es lo que se quiere de un botón de pausa.
    //
    // Y la música, que se quedaba sonando igual con el juego congelado. Eso se
    // lee como que la aplicación se ha colgado: todo quieto y la banda sonora
    // tan tranquila. Se apaga casi del todo y se cierra el filtro, así que queda
    // un rumor sordo de fondo —sigue habiendo partida, solo que detenida— en vez
    // de un silencio de "esto se ha muerto".
    pausa (parando) {
      play(() => {
        const t = ctx.currentTime
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.setValueAtTime(parando ? 440 : 220, t)
        o.frequency.exponentialRampToValueAtTime(parando ? 165 : 470, t + 0.11)
        const g = ctx.createGain()
        env(g, 0.2, 0.004, 0.13)
        o.connect(g).connect(sfxGain)
        o.start(t); o.stop(t + 0.3)
      })
      // Fuera de `play`: si está silenciado no suena nada, pero el estado de la
      // música tiene que quedar bien igualmente para cuando se quite el silencio.
      if (!ctx) return
      const t = ctx.currentTime
      musicGain.gain.cancelScheduledValues(t)
      musicGain.gain.setTargetAtTime((parando ? 0.03 : 0.22) * volMusica, t, 0.08)
      musicFilter.frequency.cancelScheduledValues(t)
      musicFilter.frequency.setTargetAtTime(parando ? 260 : 20000, t, 0.08)
    },

    // La bomba cayendo: un silbido que baja de tono hasta el impacto.
    silbido () {
      play(() => {
        const t = ctx.currentTime
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(1900, t)
        o.frequency.exponentialRampToValueAtTime(520, t + 0.6)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.11, t + 0.08)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62)
        o.connect(g).connect(sfxGain)
        o.start(t); o.stop(t + 0.65)
      })
    },

    // La caja registradora del final de la lluvia de billetes: el golpe seco
    // del cajón y dos campanillas altas, «ka-ching».
    caja () {
      play(() => {
        const t = ctx.currentTime
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.setValueAtTime(180, t)
        o.frequency.exponentialRampToValueAtTime(60, t + 0.06)
        const g = ctx.createGain()
        env(g, 0.2, 0.002, 0.06)
        o.connect(g).connect(sfxGain)
        o.start(t); o.stop(t + 0.08)
        ;[1318.5, 1760].forEach((hz, i) => {
          const t0 = t + 0.06 + i * 0.09
          const c = ctx.createOscillator()
          c.type = 'sine'
          c.frequency.setValueAtTime(hz, t0)
          const gc = ctx.createGain()
          gc.gain.setValueAtTime(0.0001, t0)
          gc.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005)
          gc.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6)
          c.connect(gc).connect(sfxGain)
          c.start(t0); c.stop(t0 + 0.65)
        })
      })
    },

    // Arsenal liberado. Un arpegio corto que sube, con la última nota más larga
    // y algo más brillante: tiene que sonar a recompensa y no confundirse con la
    // moneda, que suena veinte veces por oleada.
    desbloqueo () {
      play(() => {
        const base = ctx.currentTime
        const notas = [392, 523.25, 659.25, 783.99]   // sol, do, mi, sol
        notas.forEach((hz, i) => {
          const t = base + i * 0.085
          const ultima = i === notas.length - 1
          const o = ctx.createOscillator()
          o.type = ultima ? 'triangle' : 'square'
          o.frequency.setValueAtTime(hz, t)
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(ultima ? 0.26 : 0.16, t + 0.012)
          g.gain.exponentialRampToValueAtTime(0.0001, t + (ultima ? 0.75 : 0.16))
          o.connect(g).connect(sfxGain)
          o.start(t); o.stop(t + (ultima ? 0.9 : 0.25))
        })
      })
    },

    // Bucle de tensión: un bajo que late y un acorde que entra según lo apurado
    // que vaya el jugador. `setIntensity(0..1)` lo sube.
    startMusic () {
      ensure()
      if (musicTimer) return
      const scale = [55, 58.27, 65.41, 73.42, 77.78]
      musicTimer = setInterval(() => {
        if (muted || ctx.state !== 'running') return
        const t = ctx.currentTime
        const bass = ctx.createOscillator()
        bass.type = 'triangle'
        bass.frequency.value = scale[step % 2 === 0 ? 0 : (step % 5)]
        const bg = ctx.createGain()
        bg.gain.setValueAtTime(0.0001, t)
        bg.gain.exponentialRampToValueAtTime(0.5 + intensity * 0.35, t + 0.04)
        bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.72)
        bass.connect(bg).connect(musicGain)
        bass.start(t); bass.stop(t + 0.8)

        if (step % 4 === 2 && intensity > 0.15) {
          const pad = ctx.createOscillator()
          pad.type = 'sawtooth'
          pad.frequency.value = scale[(step / 2) % scale.length | 0] * 4
          const f = ctx.createBiquadFilter()
          f.type = 'lowpass'
          f.frequency.value = 320 + intensity * 900
          const pg = ctx.createGain()
          pg.gain.setValueAtTime(0.0001, t)
          pg.gain.exponentialRampToValueAtTime(0.10 + intensity * 0.14, t + 0.3)
          pg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
          pad.connect(f).connect(pg).connect(musicGain)
          pad.start(t); pad.stop(t + 1.6)
        }
        step++
      }, 640)
    },

    stopMusic () {
      clearInterval(musicTimer); musicTimer = null
      // Se deja la cadena como estaba. Si se sale al informe desde la pausa, la
      // música de la partida siguiente arrancaría amortiguada y sin volumen.
      if (!ctx) return
      // Con automatizaciones pendientes, escribir `.value` a secas se ignora:
      // hay que cancelarlas y fijar el valor en la línea de tiempo.
      const t = ctx.currentTime
      musicGain.gain.cancelScheduledValues(t)
      musicGain.gain.setValueAtTime(0.22 * volMusica, t)
      musicFilter.frequency.cancelScheduledValues(t)
      musicFilter.frequency.setValueAtTime(20000, t)
    },
    setIntensity (v) { intensity = Math.max(0, Math.min(1, v)) }
  }

  return api
}
