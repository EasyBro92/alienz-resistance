// Las voces y los sonidos del dinero, comprobados sin oírlos.
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-voces.mjs
//
// Dos cosas:
//  (1) una partida de un minuto A SU RITMO (las voces van con el reloj del sonido,
//      no con el de la simulación: corriendo la partida deprisa se pisarían todas)
//      y la lista de lo que se ha dicho: quién, qué momento y cuándo. Lo que hay
//      que mirar: que hablan, que no se pisan y que no es un loro.
//  (2) `GRABAR=1`: una demostración grabada de la salida de verdad del juego
//      (monedas, canje, ruleta, premio, y una frase de cada clase por su radio) en
//      `vistas/sonidos-demo.wav`, con el nivel de cada tramo. Es lo que se le
//      manda a Isidro para que lo oiga, que desde aquí no se puede oír.
//
// `NIVEL` elige el tramo (por defecto 9, Atenas: ya hay formas nuevas que avisar).

export default async ({ evaluar, espera, recargar }) => {
  const nivel = Number(process.env.NIVEL ?? 9)
  await evaluar(`__zr.desbloquearTodo()`)
  await recargar()
  await espera(800)
  console.log(await evaluar(`
    const z = __zr
    const espera = ms => new Promise(r => setTimeout(r, ms))
    z.start(${nivel}); await espera(1500); z.start(${nivel}); await espera(1200)
    z.sinVuelo(); z.despausar()
    const { ctx } = z.audio.enchufe()
    await ctx.resume()
    // A que bajen las voces de quien puede salir.
    for (let i = 0; i < 80 && z.voces.estado().cargados.length < 12; i++) await espera(250)
    const e = z.voces.estado()
    return 'sonido ' + ctx.state + ' a ' + ctx.sampleRate + ' Hz · voces a ' + e.taller + ' Hz · cargados ' + e.cargados.length + ': ' + e.cargados.join(' ')
  `))

  if (process.env.GRABAR) {
    console.log(await evaluar(`
      const z = __zr
      const espera = ms => new Promise(r => setTimeout(r, ms))
      const { ctx, master } = z.audio.enchufe()
      // La partida, parada y sin música: aquí solo tiene que sonar lo que se pide
      // (con ella en marcha, el mando canta sus oleadas y pisa la demostración).
      z.pausar(); z.audio.stopMusic()
      await espera(1500)
      // La salida de verdad, copiada a mano según pasa.
      const toma = ctx.createScriptProcessor(4096, 2, 2)
      const trozos = [[], []]
      toma.onaudioprocess = e => { for (let c = 0; c < 2; c++) trozos[c].push(new Float32Array(e.inputBuffer.getChannelData(c))) }
      master.connect(toma); toma.connect(ctx.destination)
      const marcas = []
      // La marca, con la hora de la TOMA (lo que lleva copiado), no con la del reloj:
      // entre las dos hay un par de bloques de retraso.
      const ahora = () => trozos[0].length * 4096 / ctx.sampleRate
      const tramo = async (nombre, hacer, ms) => { marcas.push([nombre, ahora()]); hacer(); await espera(ms) }
      const a = z.audio; const v = z.voces
      await espera(600)
      if (${JSON.stringify(!!process.env.REFERENCIA)}) {
        // Lo que ya sonaba antes, para comparar niveles (no va en la demostración).
        await tramo('ref: colocar', () => a.place(), 800)
        await tramo('ref: denegado', () => a.denied(), 800)
        await tramo('ref: fusil', () => a.shot('rifle', 0), 900)
        await tramo('ref: escopeta', () => a.shot('shotgun', 0), 1100)
        await tramo('ref: explosion', () => a.boom(), 1600)
        await tramo('ref: desbloqueo', () => a.desbloqueo(), 1400)
        await tramo('ref: gruñido', () => a.groan(), 900)
      }
      await tramo('moneda', () => a.coin(), 700)
      await tramo('moneda', () => a.coin(), 700)
      await tramo('varias monedas', () => a.monedas(6), 1100)
      await tramo('billete', () => a.billete(), 1000)
      await tramo('ficha (mejora)', () => a.ficha(), 1000)
      await tramo('caja (compra)', () => a.cobro(), 1500)
      await tramo('canje monedas por billetes', () => a.canje(5), 3000)
      await tramo('ruleta', () => { let n = 0; const dar = () => { a.tic(); if (++n < 26) setTimeout(dar, 45 + n * n * 0.5) }; dar() }, 6200)
      await tramo('premio comun', () => a.premio('comun'), 1200)
      await tramo('premio raro', () => a.premio('raro'), 3000)
      await tramo('premio legendario', () => a.premio('legendario'), 4200)
      const dicho = []
      const voz = async (quien, momento, opciones) => {
        marcas.push(['voz ' + quien + ' ' + momento, ahora()])
        dicho.push(v.decir(quien, momento, opciones) ? 1 : 0)
        await espera(3000)
      }
      await voz('mando', 'inicio', { prioridad: 3 })
      await voz('rifle-m', 'sale', { radio: 0.5 })
      await voz('shotgun-f', 'sale', { radio: 0.5 })
      await voz('sniper-f', 'baja', { radio: 0.5 })
      await voz('flamer-m', 'sale', { radio: 0.5 })
      await voz('gunner-m', 'herido', { radio: 0.5 })
      await voz('jill', 'sale', { radio: 0.5 })
      await voz('ada', 'baja', { radio: 0.5 })
      await voz('mando', 'oleada', { prioridad: 3 })
      await voz('apoyo', 'airstrike', { prioridad: 2 })
      await voz('mando', 'jefe', { prioridad: 3 })
      await voz('mando', 'victoria', { prioridad: 3 })
      // Y una con disparos debajo, para ver cuánto se agachan.
      marcas.push(['voz sobre disparos', ahora()])
      const tiros = setInterval(() => { a.shot('rifle', -0.3); a.shot('gunner', 0.4) }, 110)
      await espera(600); v.decir('rifle-m', 'baja', { radio: 0.5 }); await espera(2200)
      clearInterval(tiros)
      await espera(500)
      master.disconnect(toma); toma.disconnect()
      // A .wav de 16 bits y dos pistas.
      const n = trozos[0].reduce((s, t) => s + t.length, 0)
      const pcm = new Int16Array(n * 2)
      let p = 0
      for (let k = 0; k < trozos[0].length; k++) {
        for (let i = 0; i < trozos[0][k].length; i++, p++) {
          pcm[p * 2] = Math.max(-1, Math.min(1, trozos[0][k][i])) * 32767
          pcm[p * 2 + 1] = Math.max(-1, Math.min(1, trozos[1][k][i])) * 32767
        }
      }
      const cab = new DataView(new ArrayBuffer(44))
      const pon = (o, s) => [...s].forEach((c, i) => cab.setUint8(o + i, c.charCodeAt(0)))
      pon(0, 'RIFF'); cab.setUint32(4, 36 + pcm.byteLength, true); pon(8, 'WAVEfmt ')
      cab.setUint32(16, 16, true); cab.setUint16(20, 1, true); cab.setUint16(22, 2, true)
      cab.setUint32(24, ctx.sampleRate, true); cab.setUint32(28, ctx.sampleRate * 4, true)
      cab.setUint16(32, 4, true); cab.setUint16(34, 16, true); pon(36, 'data'); cab.setUint32(40, pcm.byteLength, true)
      const datos = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(new Blob([cab, pcm])) })
      await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'sonidos-demo.wav', datos }) })
      await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'sonidos-demo.json', datos: 'x,' + btoa(JSON.stringify({ hz: ctx.sampleRate, marcas })) }) })
      return 'grabados ' + (n / ctx.sampleRate).toFixed(1) + ' s · frases dichas ' + dicho.join('')
    `))
    return
  }

  // (1) La partida a su ritmo: 70 s con soldados saliendo, una mejora y un apoyo.
  console.log(await evaluar(`
    const z = __zr
    const espera = ms => new Promise(r => setTimeout(r, ms))
    z.economy.add?.(4000)
    const plan = [[1, 'rifle', 2, 0], [3, 'archer', 1, 0], [5, 'shotgun', 3, 1], [9, 'sniper', 0, 0], [14, 'gunner', 4, 0], [20, 'flamer', 2, 1], [27, 'jill', 1, 1], [34, 'misil', 3, 0]]
    let t = 0
    let apoyo = false
    const t0 = performance.now()
    while (t < 70) {
      z.simulate(1 / 40); t += 1 / 40
      while (plan.length && plan[0][0] <= t) { const [, k, c, f] = plan.shift(); z.place(k, c, f) }
      if (!apoyo && t > 40) { apoyo = true; z.strikeAt(0, -20, 'airstrike') }
      // Al ritmo del reloj de verdad: cada paso, sus 25 ms.
      const debe = t0 + t * 1000
      const falta = debe - performance.now()
      if (falta > 2) await espera(falta)
    }
    const e = z.voces.estado()
    const st = z.state()
    let pisadas = 0
    for (let i = 1; i < e.dichas.length; i++) if (e.dichas[i].t < e.dichas[i - 1].t + e.dichas[i - 1].dura - 0.05) pisadas++
    return 'oleada ' + JSON.stringify(st.wave ?? st.oleada ?? '') + ' · ' + e.dichas.length + ' frases en 70 s, ' + pisadas + ' cortadas por otra\\n' +
      e.dichas.map(d => '  ' + String(d.t).padStart(6) + ' s  ' + d.quien.padEnd(10) + ' ' + d.momento + ' #' + d.i + ' (' + d.dura + ' s)').join('\\n')
  `))
}
