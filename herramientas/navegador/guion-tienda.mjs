// Una captura de cada carta de Soldados de la tienda, en tamaño de móvil y con
// todo desbloqueado (también los de la caja alienígena), que es como se ven las
// mejoras al pie y la figura con menos sitio.
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-tienda.mjs
//
// Deja vistas/tienda-01.jpg … Con `SOLO=10,12` en el entorno, solo esas cartas.

export default async ({ evaluar, foto, espera, recargar }) => {
  await evaluar(`
    __zr.desbloquearTodo()
    const c = await import('/src/systems/cartera.js')
    for (const k of c.PREMIOS_UNIDAD) c.desbloquearPremio(k)
  `)
  await recargar()
  await evaluar(`__zr.abrir('tienda')`)
  await espera(2500)
  const puntos = `document.querySelectorAll('#tienda-capa .baraja .baraja-puntos > *')`
  const n = await evaluar(`return ${puntos}.length`)
  const solo = process.env.SOLO ? process.env.SOLO.split(',').map(Number) : null
  for (let i = 0; i < n; i++) {
    if (solo && !solo.includes(i + 1)) continue
    await evaluar(`${puntos}[${i}].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await espera(3000)
    console.log(await foto('tienda-' + String(i + 1).padStart(2, '0')))
  }
}
