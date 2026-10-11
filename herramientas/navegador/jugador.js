// Un jugador automático, para MEDIR la dificultad de un tramo en vez de opinarla.
//
// Va DENTRO de la página (`fetch('/herramientas/navegador/jugador.js').then(r => r.text()).then(eval)`),
// porque juega con las mismas piezas que el juego: coloca con `__zr.place`, cobra
// con `collectAll` y adelanta la partida con `simulate`. Lo llama
// `guion-equilibrio.mjs`, un tramo por recarga de página.
//
//   await __jugar(3, { arsenal: ['archer', 'rifle'] })
//
// Juega como alguien normal, no como un contable:
//   · cobra las monedas del suelo cada `cobra` segundos (no al instante);
//   · con menos de media línea puesta compra lo que más rinde por moneda;
//   · luego ahorra para la pieza que más vale de las que tiene a tiro (le faltan menos de `ahorra`
//     monedas); si se ve apurado —un alien a punto de llegar, o entrando por un
//     carril donde no tiene a nadie— compra lo mejor que pueda pagar en ese momento;
//   · coloca donde el propio juego colocaría con el botón automático (`mejorHueco`);
//   · con la línea llena, mejora al soldado más flojo (`mejora`).
// No usa apoyo aéreo ni mejoras de la tienda: lo que mide es el tramo contra una
// línea de soldados de ese arsenal, que es el suelo de lo que tendrá un jugador.
//
// OJO: cede una tarea de verdad cada veinte pasos. Con `await null` (solo
// microtareas) los alienz y los soldados no llegan a nacer —se crean con promesas
// que pasan por el cargador de modelos— y se mide un campo vacío.

window.__jugar = async (nivel, { arsenal = ['archer'], cobra = 1.5, ahorra = 90, mejora = true, tope = 1100, dt = 1 / 40 } = {}) => {
  const z = window.__zr
  const { SOLDIERS, BASE } = await import('/src/config.js')
  const espera = ms => new Promise(r => setTimeout(r, ms))
  z.start(nivel); await espera(1200); z.start(nivel)
  for (let i = 0; i < 160; i++) {
    if (z.world.escenarioListo?.() ?? true) break
    await espera(250)
  }
  z.sinVuelo(); z.despausar()
  // Lo que vale cada pieza a ojos de quien juega: lo que pega por segundo, algo más
  // si llega lejos, si atraviesa el caparazón o si revienta en corro. No es una
  // cuenta fina: es lo que hace que, pudiendo pagar un Fusilero, nadie siga
  // comprando Arqueros (que es lo que hacía la primera versión de este jugador).
  const vale = s => s.damage * s.fireRate * (s.pellets ?? 1) * (0.6 + 0.4 * Math.min(s.range, 20) / 20) * (1 + 0.5 * (s.armorPierce ?? 0)) * (s.splash ? 1.5 : 1)
  const lista = arsenal.map(k => ({ key: k, type: 'soldier', cost: SOLDIERS[k].cost, spec: SOLDIERS[k], vale: vale(SOLDIERS[k]) })).sort((a, b) => b.vale - a.vale)
  const barata = [...lista].sort((a, b) => a.cost - b.cost)[0]
  // Y lo que rinde por moneda: con la línea a medio hacer se compra por esto (dos
  // Fusileros antes que cuatro Arqueros); con media línea puesta, por lo que vale
  // la pieza, que las casillas se acaban.
  const rinde = [...lista].sort((a, b) => b.vale / b.cost - a.vale / a.cost)
  const compras = {}
  let t = 0; let tCobro = 0; let tDecide = 0; let n = 0
  let minBase = BASE.hp; let mejoras = 0; let llena = 0; let gastado = 0
  // Lo que tarda en llegar el primer mordisco a la base, y cuánta vida de alien
  // había viva de media: dos números que dicen si la línea iba holgada o ahogada.
  let primerDaño = null; let vivos = 0; let muestras = 0
  // Y lo que de verdad dice si iba apurado aunque no le tocaran la base: cuántos
  // soldados ha perdido y cuánto tiempo ha tenido alienz pegados a la línea.
  let comprados = 0; let encima = 0
  while (t < tope) {
    const e = z.state()
    if (!e.running && t > 3) break
    z.simulate(dt); t += dt
    if (++n % 20 === 0) await espera(0)
    if (e.baseHp < minBase) { minBase = e.baseHp; if (primerDaño == null) primerDaño = Math.round(t) }
    if (t - tCobro >= cobra) { tCobro = t; z.collectAll() }
    if (t - tDecide < 0.5) continue
    tDecide = t
    vivos += z.zombies.length; muestras++
    if (z.zombies.some(b => !b.dead && !b.bajoTierra && b.z > -4)) encima++
    const monedas = z.economy.coins
    // Apuro: un alien a punto de llegar, o entrando por un carril donde no hay nadie.
    const cubiertos = new Set(e.soldiers.map(s => s.lane))
    const cerca = z.zombies.some(b => !b.dead && !b.bajoTierra && (b.z > -7 || (b.z > -30 && !cubiertos.has(b.lane))))
    // Al empezar no ahorra: reparte lo que tiene entre los cuatro primeros, para
    // tener algo en varios carriles antes de que llegue nadie.
    const puestos = e.soldiers.length
    const quiero = puestos < 10
      ? (rinde.find(u => u.cost <= monedas + (cerca || puestos < 2 ? 0 : 25)) ?? barata)
      : (lista.find(u => u.cost <= monedas + (cerca ? 0 : ahorra)) ?? barata)
    if (quiero.cost > monedas) continue
    const hueco = z.mejorHueco(quiero)
    if (hueco) {
      await z.place(quiero.key, hueco.lane, hueco.row)
      compras[quiero.key] = (compras[quiero.key] ?? 0) + 1
      comprados++
      gastado += quiero.cost
    } else {
      llena++
      if (mejora && z.upgradeBest()) mejoras++
    }
  }
  const fin = z.state()
  return {
    nivel,
    nombre: z.niveles[nivel].name,
    gana: !fin.running && fin.baseHp > 0,
    base: Math.round(Math.max(0, fin.baseHp) / BASE.hp * 100),
    oleada: fin.wave,
    de: z.director?.total ?? 0,
    t: Math.round(t),
    primerDaño,
    vivos: +(vivos / Math.max(1, muestras)).toFixed(1),
    soldados: fin.soldiers.length,
    bajas: comprados - fin.soldiers.length,
    encima: Math.round(encima / Math.max(1, muestras) * 100),
    mejoras,
    gastado,
    sobran: Math.round(fin.coins),
    compras
  }
}
