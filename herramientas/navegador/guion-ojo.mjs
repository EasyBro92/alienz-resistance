// Mirar un mapa desde donde haga falta: pone la cámara en un punto y saca la foto.
//
//   $env:NIVEL = 12; $env:OJOS = "40,12,-80>0,3,-70;-30,20,-60>0,5,-88"
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-ojo.mjs
//
// Cada ojo es `x,y,z>x,y,z` (desde > hacia), separados por `;`. Deja
// vistas/ojo-<n>-<i>.jpg, con la ciudad encendida y la niebla del vuelo: sirve
// para buscar de cerca un fallo que en los planos de la llegada se ve pequeño.

export default async ({ evaluar, espera }) => {
  const n = Number(process.env.NIVEL ?? 0)
  const ojos = (process.env.OJOS ?? '').split(';').filter(Boolean).map(t => t.split('>').map(p => p.split(',').map(Number)))
  await evaluar(`__zr.desbloquearTodo(); __zr.start(${n})`)
  await espera(1500)
  await evaluar(`__zr.start(${n})`)
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
    await espera(500)
  }
  await espera(1200)
  for (const [i, [desde, hacia]] of ojos.entries()) {
    console.log(await evaluar(`
      __zr.verEstadio(0)
      __zr.camera.position.set(${desde.join(',')})
      __zr.camera.lookAt(${hacia.join(',')})
      __zr.renderer.render(__zr.scene, __zr.camera)
      const datos = __zr.renderer.domElement.toDataURL('image/jpeg', 0.9)
      return await (await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'ojo-${n}-${i}.jpg', datos }) })).text()
    `))
  }
  await evaluar(`__zr.sinVuelo()`)
}
