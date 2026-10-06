// Por dónde entran los alienz en un mapa con entrada propia (salen de un templo,
// suben de un sótano…): de cada uno, dónde nace y a qué altura va según avanza.
//
//   $env:NIVEL = 11; $env:ESPERA = 40; node herramientas/navegador/movil.mjs herramientas/navegador/guion-entrada.mjs
//
// `ESTORBOS="x,z,radio;x,z,radio"` añade columnas u otros estorbos y dice lo más
// cerca que pasa cada alien de su canto. `METER=boss` suelta además ese huésped
// por el carril central (el jefe, para ver si cabe por la puerta).

export default async ({ evaluar, espera }) => {
  const n = Number(process.env.NIVEL ?? 0)
  const estorbos = (process.env.ESTORBOS ?? '').split(';').filter(Boolean).map(t => t.split(',').map(Number))
  await evaluar(`__zr.desbloquearTodo(); __zr.start(${n})`)
  await espera(1500)
  await evaluar(`__zr.start(${n})`)
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
    await espera(500)
  }
  await evaluar(`__zr.sinVuelo(); __zr.despausar()`)
  await evaluar(`
    window.__traza = new Map()
    const estorbos = ${JSON.stringify(estorbos)}
    const paso = () => {
      for (const z of __zr.zombies) {
        const p = z.mesh.position
        let t = __traza.get(z)
        if (!t) __traza.set(z, t = { clave: z.key ?? z.clave ?? z.spec?.name ?? '?', nace: [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)], min: 99, alturas: {}, yMin: 99, yMax: -99 })
        for (const [cx, cz, r] of estorbos) t.min = Math.min(t.min, Math.hypot(p.x - cx, p.z - cz) - r)
        t.yMin = Math.min(t.yMin, p.y); t.yMax = Math.max(t.yMax, p.y)
        const tramo = Math.round(p.z / 4) * 4
        if (p.z < -52 && !(tramo in t.alturas)) t.alturas[tramo] = +p.y.toFixed(2)
        t.ahora = [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)]
      }
      requestAnimationFrame(paso)
    }
    paso()
  `)
  if (process.env.METER) {
    await espera(3000)
    console.log('metido', await evaluar(`return String(__zr.meter?.(${JSON.stringify(process.env.METER)}, 2))`))
  }
  await espera(Number(process.env.ESPERA ?? 40) * 1000)
  const filas = await evaluar(`return [...__traza.values()].map(t => ({ c: t.clave, nace: t.nace, alturas: t.alturas, y: [+t.yMin.toFixed(2), +t.yMax.toFixed(2)], cerca: t.min === 99 ? undefined : +t.min.toFixed(2), ahora: t.ahora }))`)
  for (const f of filas) console.log(JSON.stringify(f))
}
