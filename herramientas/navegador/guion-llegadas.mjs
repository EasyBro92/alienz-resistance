// Los dos primeros planos de la llegada de varios mapas, para repasar de una
// tirada lo que solo se ve desde arriba (montes, ciudad, bosque).
//
//   $env:NIVELES = '20,25,29'; node herramientas/navegador/movil.mjs herramientas/navegador/guion-llegadas.mjs
//
// Deja vistas/llegada-<n>-0.jpg y -1.jpg (`PLANOS=0,2` para otros). Con el equipo
// cargado (un horneado en marcha) el primer fotograma sale a veces negro o con la
// pantalla de carga: un JPEG negro pesa cuatro perras, así que se repite hasta
// que pese como una foto.

export default async ({ evaluar, espera }) => {
  const lista = (process.env.NIVELES ?? '0').split(',').map(Number)
  const cuales = (process.env.PLANOS ?? '0,1').split(',').map(Number)
  await evaluar(`__zr.desbloquearTodo()`)
  for (const n of lista) {
    await evaluar(`__zr.start(${n})`)
    await espera(1200)
    await evaluar(`__zr.start(${n})`)
    for (let i = 0; i < 120; i++) {
      if (await evaluar(`return __zr.world.escenarioListo?.() ?? true`)) break
      await espera(500)
    }
    await espera(1500)
    const planos = await evaluar(`return (__zr.estadioPlanos ?? []).map(p => p.k)`)
    const hechas = []
    for (const i of cuales) {
      if (planos[i] == null) continue
      let peso = 0
      for (let intento = 0; intento < 5 && peso < 40000; intento++) {
        if (intento) await espera(1500)
        peso = await evaluar(`
          document.querySelector('#carga')?.classList.add('hidden')
          __zr.verEstadio(${planos[i]})
          __zr.render?.()
          const datos = __zr.renderer.domElement.toDataURL('image/jpeg', 0.9)
          await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'llegada-${n}-${i}.jpg', datos }) })
          return datos.length
        `)
      }
      hechas.push(i + ':' + Math.round(peso / 1000) + 'k')
    }
    console.log(n, hechas.join(' '))
  }
}
