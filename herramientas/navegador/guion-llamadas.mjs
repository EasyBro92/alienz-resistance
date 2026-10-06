// Cuánto cuesta dibujar un mapa: llamadas de dibujado y triángulos, jugando.
//
//   $env:NIVELES = "9,10"; node herramientas/navegador/movil.mjs herramientas/navegador/guion-llamadas.mjs
//
// Lo que ahoga a un móvil son las llamadas (una por malla y material), no los
// triángulos. Mide cada mapa recién empezado, sin soldados ni alienz, y dice
// también cuántas mallas trae el sitio.

export default async ({ evaluar, espera }) => {
  const niveles = (process.env.NIVELES ?? '0').split(',').map(Number)
  await evaluar(`__zr.desbloquearTodo()`)
  for (const n of niveles) {
    await evaluar(`__zr.start(${n})`)
    await espera(1500)
    await evaluar(`__zr.start(${n})`)
    for (let i = 0; i < 60; i++) {
      if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
      await espera(500)
    }
    await evaluar(`__zr.sinVuelo(); __zr.despausar()`)
    await espera(2500)
    console.log(await evaluar(`
      const r = __zr.renderer
      __zr.renderer.render(__zr.scene, __zr.camera)
      let mallas = 0
      __zr.scene.traverse(o => { if (o.isMesh && /^lugar/.test(o.parent?.name ?? '') ) mallas++ })
      let sitio = 0
      __zr.scene.traverse(o => {
        if (!o.isMesh) return
        for (let p = o; p; p = p.parent) { if (!p.visible) return }
        for (let p = o; p; p = p.parent) if (/^lugar:/.test(p.name ?? '')) { sitio++; return }
      })
      return JSON.stringify({ nivel: ${n}, llamadas: r.info.render.calls, triangulos: r.info.render.triangles, mallasDelSitio: sitio })
    `))
  }
}
