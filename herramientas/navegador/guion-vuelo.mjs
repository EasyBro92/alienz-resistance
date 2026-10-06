// ¿Atraviesa algo la cámara en el vuelo de llegada de un mapa?
//
//   $env:NIVEL = 9; node herramientas/navegador/movil.mjs herramientas/navegador/guion-vuelo.mjs
//
// Recorre el vuelo de `LLEGADAS` en 240 pasos (con `__zr.verEstadio`, o sea por
// donde pasa de verdad, y de ahí a la cámara de juego) y lanza un rayo de cada
// punto al siguiente contra todo lo macizo que se ve. Tiene que decir 0 cruces:
// un cruce es un fotograma con la cámara dentro de un muro o de una copa.

export default async ({ evaluar, espera }) => {
  const n = Number(process.env.NIVEL ?? 0)
  await evaluar(`__zr.desbloquearTodo(); __zr.start(${n})`)
  await espera(1500)
  await evaluar(`__zr.start(${n})`)
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
    await espera(500)
  }
  await espera(1000)
  console.log(await evaluar(`
    const T = __zr.THREE
    const juego = __zr.camera.position.clone()
    const pts = []
    const fin = __zr.estadioPlanos.at(-1).k
    for (let i = 0; i <= 240; i++) { __zr.verEstadio(fin * i / 240); pts.push(__zr.camera.position.clone()) }
    for (let i = 1; i <= 20; i++) pts.push(pts[240].clone().lerp(juego, i / 20))
    const macizo = []
    __zr.scene.traverse(o => {
      if (!o.isMesh || /cielo/.test(o.material?.name ?? '') || o.material?.isShaderMaterial) return
      for (let p = o; p; p = p.parent) if (!p.visible) return
      macizo.push(o)
    })
    const rayo = new T.Raycaster()
    const cruces = []
    let cerca = Infinity
    for (let i = 0; i < pts.length - 1; i++) {
      const d = pts[i + 1].clone().sub(pts[i])
      const largo = d.length()
      if (largo < 1e-4) continue
      rayo.set(pts[i], d.normalize())
      rayo.far = largo
      const toca = rayo.intersectObjects(macizo, false)[0]
      if (toca) cruces.push({ paso: i, en: pts[i].toArray().map(v => +v.toFixed(1)), con: toca.object.material?.name ?? toca.object.name })
    }
    __zr.sinVuelo()
    return JSON.stringify({ mallas: macizo.length, pasos: pts.length, cruces: cruces.length, donde: cruces.slice(0, 8) })
  `))
}
