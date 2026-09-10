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

  function ensure () {
    if (ctx) return ctx
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master)
    musicFilter = ctx.createBiquadFilter()
    musicFilter.type = 'lowpass'
    musicFilter.frequency.value = 20000        // abierto: no toca nada
    musicFilter.connect(master)
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(musicFilter)
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

  const api = {
    unlock () { ensure(); if (ctx.state === 'suspended') ctx.resume() },
    get muted () { return muted },
    toggleMute () {
      muted = !muted
      if (master) master.gain.value = muted ? 0 : 0.9
      return muted
    },

    shot (kind = 'rifle') {
      play(() => {
        const src = ctx.createBufferSource()
        src.buffer = noiseBuffer(0.14)
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = kind === 'sniper' ? 900 : kind === 'shotgun' ? 500 : 1500
        filter.Q.value = 0.8
        const g = ctx.createGain()
        env(g, kind === 'sniper' ? 0.5 : 0.28, 0.001, kind === 'shotgun' ? 0.16 : 0.07)
        src.connect(filter).connect(g).connect(sfxGain)
        src.start()
        src.stop(ctx.currentTime + 0.25)
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

    boom () {
      play(() => {
        const src = ctx.createBufferSource()
        src.buffer = noiseBuffer(1.0)
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.setValueAtTime(1800, ctx.currentTime)
        f.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.7)
        const g = ctx.createGain()
        env(g, 0.85, 0.005, 0.8)
        src.connect(f).connect(g).connect(sfxGain)
        src.start(); src.stop(ctx.currentTime + 1.1)
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
      musicGain.gain.setTargetAtTime(parando ? 0.03 : 0.22, t, 0.08)
      musicFilter.frequency.cancelScheduledValues(t)
      musicFilter.frequency.setTargetAtTime(parando ? 260 : 20000, t, 0.08)
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
      musicGain.gain.setValueAtTime(0.22, t)
      musicFilter.frequency.cancelScheduledValues(t)
      musicFilter.frequency.setValueAtTime(20000, t)
    },
    setIntensity (v) { intensity = Math.max(0, Math.min(1, v)) }
  }

  return api
}
