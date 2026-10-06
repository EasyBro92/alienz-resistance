// Las cinco de la caja alienígena en una partida de prueba, apuntando, con fotos
// de cerca de cada una (busto, tres cuartos y espalda) en vistas/soldado-<clave>-*.jpg.
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-cinco.mjs
//
// Con `QUIENES=jill,ada` en el entorno, solo esas; con `VISTAS=busto`, solo esa vista.

export default async ({ evaluar, espera, recargar }) => {
  const quienes = (process.env.QUIENES ?? 'jill,claire,ada,rebecca,sheva').split(',')
  const vistas = (process.env.VISTAS ?? 'busto,trescuartos,espalda').split(',')
  await evaluar(`
    __zr.desbloquearTodo()
    const c = await import('/src/systems/cartera.js')
    for (const k of c.PREMIOS_UNIDAD) c.desbloquearPremio(k)
  `)
  await recargar()
  await evaluar(`await fetch('/herramientas/navegador/foto-soldado.js').then(r => r.text()).then(eval)`)
  console.log(await evaluar(`return await __probar(${JSON.stringify(quienes)})`))
  // Un Coloso por carril, para que todas tengan a quién apuntar un buen rato.
  await evaluar(`for (let l = 0; l < 5; l++) { __zr.meter('tank', l); __zr.meter('tank', l) }`)
  for (let i = 0; i < 40; i++) {
    await espera(500)
    if (await evaluar(`return __zr.state().soldiers.every(s => s.objetivo && s.aim > 0.9)`)) break
  }
  for (const [i, k] of quienes.entries()) {
    // Que no la pille recargando: el arma baja y la foto no vale.
    for (let n = 0; n < 20; n++) {
      if (await evaluar(`return __zr.state().soldiers[${i}].recargando === 0`)) break
      await espera(150)
    }
    console.log(await evaluar(`return await __fotoSoldado(${i}, '${k}', ${JSON.stringify(vistas)})`))
  }
}
