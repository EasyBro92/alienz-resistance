// Cuánto tarda en arrancar el juego y cuánto descarga: hasta que se quita la
// pantalla de carga, y qué archivos pesan más. Lo hice el 18/10/2026 cuando
// Isidro dijo «ahora los tiempos de carga son muy largos» (tras rehacer los
// soldados en Meshy).
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-carga.mjs
export default async ({ evaluar, espera, recargar }) => {
  await recargar()
  // Hasta que la página esté en pie y la pantalla de carga puesta.
  for (let i = 0; i < 40 && !(await evaluar(`return !!document.getElementById('carga')`)); i++) await espera(250)
  let t = 0
  for (; t < 240; t++) {
    if (await evaluar(`return !document.getElementById('carga')`)) break
    await espera(500)
  }
  console.log(await evaluar(`
    const r = performance.getEntriesByType('resource')
    const mb = x => +(x / 1048576).toFixed(1)
    const total = r.reduce((s, e) => s + (e.decodedBodySize || 0), 0)
    const glb = r.filter(e => /\.glb/.test(e.name))
    const gordos = [...r].sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 8).map(e => e.name.split('/').pop() + ' ' + mb(e.decodedBodySize))
    const fin = Math.max(...r.map(e => e.responseEnd))
    return JSON.stringify({ segundos: ${t} / 2, ultimaDescarga: +(fin / 1000).toFixed(1), mb: mb(total), archivos: r.length, glb: glb.length, mbGlb: mb(glb.reduce((s, e) => s + e.decodedBodySize, 0)), gordos })`))
}
