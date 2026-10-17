// Cuánto cuesta dibujar la TROPA: llamadas y triángulos con el tablero lleno,
// y el tiempo de fotograma. Lo hice el 17/10/2026 al rehacer todos los
// soldados en Meshy (cada uno con 13.000 triángulos en vez de unos 7.500 con la
// cabeza de Blender), para ver cuánto pesan en una partida.
//
//   $env:NIVEL = 1; $env:TROPA = 15; node herramientas/navegador/movil.mjs herramientas/navegador/guion-tropa.mjs
//
// Mide el mapa vacío y luego con TROPA soldados variados (cinco por fila).
export default async ({ evaluar, espera }) => {
  const n = Number(process.env.NIVEL ?? 1)
  const tropa = Number(process.env.TROPA ?? 15)
  await evaluar(`await fetch('/herramientas/navegador/foto-soldado.js').then(r => r.text()).then(eval)`)
  const medir = `
    const z = __zr, r = z.renderer
    r.render(z.scene, z.camera)
    const info = { llamadas: r.info.render.calls, triangulos: r.info.render.triangles }
    let t0 = performance.now(); for (let i = 0; i < 30; i++) r.render(z.scene, z.camera); 
    r.getContext().finish()
    info.msPorFotograma = +((performance.now() - t0) / 30).toFixed(1)
    return JSON.stringify(info)`
  await evaluar(`await __probar([], ${n})`)
  console.log('vacío', await evaluar(medir))
  const claves = ['rifle', 'shotgun', 'sniper', 'gunner', 'misil', 'mortar', 'capitan', 'archer', 'flamer', 'jill', 'claire', 'ada', 'rebecca', 'sheva', 'sherry', 'ballestera']
  await evaluar(`await __probar(${JSON.stringify(Array.from({ length: tropa }, (_, i) => claves[i % claves.length]))}, ${n})`)
  await espera(2000)
  console.log(`${tropa} soldados`, await evaluar(medir))
}
