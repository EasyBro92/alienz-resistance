// Una foto de cada menú en tamaño de móvil, para compararlos entre sí (18/10/2026:
// Isidro quiere que los del multijugador y la Guerra civil se vean igual que el
// resto). Abre cada capa quitándole `hidden` y escondiendo las demás.
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-menus.mjs
//   (MENUS=multi-capa,ajustes-capa para solo esas; TEMA=claro u oscuro)
export default async ({ evaluar, foto, espera, recargar }) => {
  if (process.env.TEMA) { await evaluar(`localStorage.setItem('alienz-tema-v1', '${process.env.TEMA}')`); await recargar() }
  const todas = ['overlay', 'mapa-capa', 'ajustes-capa', 'multi-capa', 'duelo-capa', 'ranking-capa', 'retos-capa', 'coop-capa', 'usuarios-capa']
  const menus = process.env.MENUS ? process.env.MENUS.split(',') : todas
  // La bienvenida (ofrecer la cuenta) tapa todo: «Más tarde».
  await evaluar(`document.getElementById('bienvenida-luego')?.click()`)
  await espera(400)
  for (const id of menus) {
    await evaluar(`
      for (const el of document.querySelectorAll('.overlay')) el.classList.add('hidden')
      document.getElementById('${id}')?.classList.remove('hidden')`)
    await espera(700)
    console.log(await foto('menu-' + (process.env.TEMA ? process.env.TEMA + '-' : '') + id))
  }
}
