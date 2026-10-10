// El ascensor del hangar (el portaaviones de Nueva York): que los alienz suban
// con él y nadie aparezca en la cubierta por debajo de ella ni atraviese una raya
// cuando no toca.
//
//   $env:NIVEL = 29; $env:ESPERA = 60; node herramientas/navegador/movil.mjs herramientas/navegador/guion-ascensor.mjs
//
// `METER=boss` suelta además ese huésped (LA MADRE, para ver que cabe y sube).
// Dice: cuántos viajes ha hecho, cuánto tarda cada alien desde que nace hasta que
// pisa la cubierta, y los fallos (alguien en la cubierta con los pies por debajo,
// alguien en la plataforma a una altura que no es la suya).

export default async ({ evaluar, espera }) => {
  const n = Number(process.env.NIVEL ?? 29)
  await evaluar(`__zr.desbloquearTodo(); __zr.start(${n})`)
  await espera(1500)
  await evaluar(`__zr.start(${n})`)
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
    await espera(500)
  }
  await evaluar(`__zr.sinVuelo(); __zr.despausar()`)
  await evaluar(`
    window.__asc = { viajes: 0, antes: 'arriba', fallos: [], tiempos: [], vistos: new Map(), t0: performance.now() }
    const paso = () => {
      const a = __zr.world.estadoAscensor()
      const c = __zr.FIELD?.ascensor ?? { zFondo: -64, zBorde: -52, hondo: 6.5 }
      if (a.estado === 'arriba' && __asc.antes !== 'arriba') __asc.viajes++
      __asc.antes = a.estado
      const ahora = (performance.now() - __asc.t0) / 1000
      for (const z of __zr.zombies) {
        const p = z.mesh.position
        let v = __asc.vistos.get(z)
        if (!v) __asc.vistos.set(z, v = { nace: ahora, arriba: null, clave: z.key })
        if (p.z >= c.zBorde && p.y < -0.3 && !z.salto) __asc.fallos.push(['en cubierta por debajo', z.key, +p.y.toFixed(2), +p.z.toFixed(1)])
        if (p.z >= c.zFondo && p.z < c.zBorde && Math.abs(p.y - a.y) > 0.6 && !z.salto) __asc.fallos.push(['fuera de la plataforma', z.key, +p.y.toFixed(2), +a.y.toFixed(2)])
        if (p.z < c.zFondo && p.y > -c.hondo + 0.5) __asc.fallos.push(['en el hangar a otra altura', z.key, +p.y.toFixed(2)])
        if (v.arriba == null && p.z >= c.zBorde) { v.arriba = ahora; __asc.tiempos.push(+(ahora - v.nace).toFixed(1)) }
      }
      requestAnimationFrame(paso)
    }
    paso()
  `)
  if (process.env.METER) {
    await espera(4000)
    console.log('metido', await evaluar(`return String(__zr.meter?.(${JSON.stringify(process.env.METER)}, 2))`))
  }
  await espera(Number(process.env.ESPERA ?? 60) * 1000)
  console.log(JSON.stringify(await evaluar(`
    const t = __asc.tiempos.slice().sort((a, b) => a - b)
    return { viajes: __asc.viajes, nacidos: __asc.vistos.size, llegaron: t.length, tarda: t.length ? { min: t[0], media: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(1), max: t[t.length - 1] } : null,
      fallos: __asc.fallos.length, muestra: __asc.fallos.slice(0, 6), estado: __zr.world.estadoAscensor(), vivos: __zr.zombies.length }
  `)))
}
