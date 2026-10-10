// Repaso de TODOS los mapas (o de los que se digan) tal como se ven jugando: una
// foto limpia de cada uno desde la cámara de juego, sin marcador, y sus números.
//
//   $env:NIVELES = '0,1,2'; node herramientas/navegador/movil.mjs herramientas/navegador/guion-repaso.mjs
//
// Sin `NIVELES`, los 38. Deja vistas/repaso-<n>.jpg y dice de cada mapa: si se ve
// la ciudad de fondo, hasta dónde llega la bruma, cuánta agua se mueve, cuántas
// mallas se mecen, si hay nodriza y por dónde pasan los exploradores, y las
// llamadas de dibujado y los triángulos.

export default async ({ evaluar, espera }) => {
  const total = await evaluar(`return __zr.niveles?.length ?? 38`)
  const lista = process.env.NIVELES ? process.env.NIVELES.split(',').map(Number) : [...Array(total).keys()]
  await evaluar(`__zr.desbloquearTodo()`)
  for (const n of lista) {
    await evaluar(`__zr.start(${n})`)
    await espera(800)
    for (let i = 0; i < 80; i++) {
      if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
      await espera(500)
    }
    await espera(600)
    await evaluar(`__zr.sinVuelo(); __zr.despausar()`)
    await espera(2200)
    console.log(await evaluar(`
      const r = __zr.renderer
      __zr.render()
      const datos = r.domElement.toDataURL('image/jpeg', 0.88)
      await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'repaso-${n}.jpg', datos }) })
      let agua = 0, mecen = 0, ciudad = null, nombre = ''
      __zr.scene.traverse(o => {
        if (/^lugar:/.test(o.name) && o.visible) nombre = o.name.slice(6)
        if (o.name === 'ciudad') ciudad = o.visible
        if (!o.isMesh || !o.visible || !o.material?.userData?.conMovimiento) return
        let v = o; while (v && v.visible) v = v.parent
        if (v) return
        if (/^(agua|mar|rio|laguna|lago|sena|estanque|ensenada|caribe|atlantico|bahia|piscina)/.test(o.material.name)) agua++
        else { const c = o.geometry.attributes.color; if (c?.itemSize === 4) { for (let i = 0; i < c.count; i += 7) if (c.getW(i) < 0.99) { mecen++; break } } }
      })
      const naves = __zr.ambiente?.() ?? null
      return JSON.stringify({ n: ${n}, nombre, ciudad, bruma: Math.round(__zr.scene.fog?.far ?? 0), lejos: Math.round(__zr.camera.far), agua, mecen, naves, llamadas: r.info.render.calls, tri: r.info.render.triangles })
    `))
  }
}
