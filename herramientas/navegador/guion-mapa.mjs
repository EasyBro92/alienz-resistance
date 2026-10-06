// Un mapa en el móvil: los planos de su llegada y la vista de juego, con y sin alienz.
//
//   $env:NIVEL = 9; node herramientas/navegador/movil.mjs herramientas/navegador/guion-mapa.mjs
//
// Deja en vistas/: mapa-<n>-vuelo-0…3.jpg (los planos de `LLEGADAS`, sin marcador),
// mapa-<n>-juego.jpg (recién llegados, con el marcador) y mapa-<n>-juego2.jpg
// (unos segundos después, con la primera oleada en el campo). `ESPERA` (segundos)
// alarga esa espera; `SOLDADOS=sniper,rifle` coloca algunos antes.

export default async ({ evaluar, foto, espera }) => {
  const n = Number(process.env.NIVEL ?? 0)
  await evaluar(`__zr.desbloquearTodo(); __zr.start(${n})`)
  await espera(1500)
  await evaluar(`__zr.start(${n})`)
  // A que lleguen los modelos del lugar (los dos .glb y sus mapas de luz).
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
    await espera(500)
  }
  await espera(1500)
  const planos = await evaluar(`return (__zr.estadioPlanos ?? []).map(p => p.k)`)
  for (const [i, k] of planos.slice(0, 4).entries()) {
    console.log(await evaluar(`
      __zr.verEstadio(${k})
      const datos = __zr.renderer.domElement.toDataURL('image/jpeg', 0.9)
      return await (await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'mapa-${n}-vuelo-${i}.jpg', datos }) })).text()
    `))
  }
  await evaluar(`__zr.sinVuelo(); __zr.despausar(); __zr.economy.add(4000)`)
  const soldados = (process.env.SOLDADOS ?? 'rifle,sniper,gunner,rifle,shotgun').split(',').filter(Boolean)
  await evaluar(`${JSON.stringify(soldados)}.forEach((k, i) => __zr.place(k, i % 5, 0))`)
  await espera(2500)
  console.log(await foto(`mapa-${n}-juego`))
  await espera(Number(process.env.ESPERA ?? 16) * 1000)
  console.log(await foto(`mapa-${n}-juego2`))
  console.log(await evaluar(`return JSON.stringify({ alienz: __zr.zombies.length, donde: __zr.zombies.slice(0, 8).map(z => [+z.mesh.position.x.toFixed(1), +z.mesh.position.y.toFixed(1), +z.mesh.position.z.toFixed(0)]) })`))
}
