// Repaso de salud: que nada esté roto (19/10/2026, al «limpiar y dejarlo
// ordenado»: se borraron 37 modelos y el código de las cabezas de Blender).
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-salud.mjs
//   (NIVELES=0,5 para solo esos)
//
// Recoge los errores de la página (excepciones, promesas sin atrapar,
// console.error y los avisos de «Sin modelo para…», que es cuando un soldado
// sale con la figura de piezas porque su .glb no está), pasa por todas las
// cartas de la tienda y entra en cada mapa con soldados de todos los tipos.
export default async ({ evaluar, espera }) => {
  await evaluar(`
    window.__fallos = []
    const apunta = (tipo, t) => window.__fallos.push(tipo + ': ' + String(t).slice(0, 200))
    addEventListener('error', e => apunta('error', e.message))
    addEventListener('unhandledrejection', e => apunta('promesa', e.reason?.message ?? e.reason))
    const ce = console.error.bind(console), cw = console.warn.bind(console)
    console.error = (...a) => { apunta('console.error', a.join(' ')); ce(...a) }
    console.warn = (...a) => { if (/Sin modelo|Sin foto|Sin retratos/.test(String(a[0]))) apunta('aviso', a.join(' ')); cw(...a) }
    __zr.desbloquearTodo()
    const c = await import('/src/systems/cartera.js')
    for (const k of c.PREMIOS_UNIDAD) c.desbloquearPremio(k)
    await fetch('/herramientas/navegador/foto-soldado.js').then(r => r.text()).then(eval)`)

  // La tienda: todas las cartas de soldados.
  await evaluar(`__zr.abrir('tienda')`)
  await espera(2000)
  const cartas = await evaluar(`return document.querySelectorAll('#tienda-capa .baraja .baraja-puntos > *').length`)
  for (let i = 0; i < cartas; i++) {
    await evaluar(`document.querySelectorAll('#tienda-capa .baraja .baraja-puntos > *')[${i}].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await espera(1200)
  }
  console.log(`tienda: ${cartas} cartas vistas`)

  // Los mapas, con un soldado de cada tipo repartido entre ellos.
  const tipos = await evaluar(`const { SOLDIERS } = await import('/src/config.js'); return Object.keys(SOLDIERS)`)
  const total = await evaluar(`return __zr.niveles?.length ?? 38`)
  const lista = process.env.NIVELES ? process.env.NIVELES.split(',').map(Number) : [...Array(total).keys()]
  for (const n of lista) {
    const cinco = [0, 1, 2, 3, 4].map(i => tipos[(n * 5 + i) % tipos.length])
    const puestos = await evaluar(`return await __probar(${JSON.stringify(cinco)}, ${n})`)
    await evaluar(`await __zr.run(3)`)
    const vivos = await evaluar(`return __zr.soldiers.length`)
    console.log(`mapa ${n}: ${puestos} (${vivos} en el campo)`)
  }
  const fallos = await evaluar(`return [...new Set(window.__fallos)]`)
  console.log(fallos.length ? 'FALLOS:\n  ' + fallos.join('\n  ') : 'SIN FALLOS')
}
