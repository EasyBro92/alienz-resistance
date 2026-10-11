// La campaña jugada por el jugador automático (`jugador.js`), tramo a tramo.
//
//   $env:NIVELES = '0,1,2'; node herramientas/navegador/movil.mjs herramientas/navegador/guion-equilibrio.mjs
//
// Sin `NIVELES`, los 38. Una línea por tramo: si gana, con cuánta base, en qué
// oleada cae si pierde, cuánto tarda y qué ha comprado. `VECES=3` repite cada
// tramo (las hordas llevan azar) y `ARSENAL=archer,rifle` fuerza el arsenal.
// `CURVA='{"biomasa":[1200,7000]}'` prueba otros números de la curva de la campaña
// (`CURVA` en campana.js) sin tocar el archivo: solo vale en desarrollo.
//
// `MEJORAS=2` le pone a todos los soldados ese nivel de las mejoras de la tienda
// (daño y cadencia; de 0 a 3), y `MEJORAS=tramo` el que tendría a esas alturas
// quien va comprando alguna: 0 hasta Italia, 1 hasta la India, 2 hasta Rusia, 3
// después.
//
// El ARSENAL de referencia de cada tramo es lo que habrá abierto en la tienda un
// jugador que avanza sin prisa: empieza solo con el Arquero y va abriendo una
// pieza cada dos o tres tramos, por orden de precio. Sin mejoras de la tienda y
// sin apoyo aéreo: es el suelo, y lo que el jugador compre de más es su margen.

export const ARSENAL_EN = [
  [0, ['archer']],
  [2, ['archer', 'rifle']],
  [5, ['archer', 'rifle', 'shotgun']],
  [9, ['archer', 'rifle', 'shotgun', 'sniper']],
  [14, ['archer', 'rifle', 'shotgun', 'sniper', 'flamer']],
  [19, ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner']],
  [25, ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil']],
  [31, ['archer', 'rifle', 'shotgun', 'sniper', 'flamer', 'gunner', 'misil', 'mortar']]
]
export const arsenalDe = n => ARSENAL_EN.filter(([desde]) => desde <= n).at(-1)[1]

export const mejorasEn = n => (n < 9 ? 0 : n < 19 ? 1 : n < 28 ? 2 : 3)

export default async ({ evaluar, espera, recargar }) => {
  await evaluar(`__zr.desbloquearTodo()`)
  await evaluar(process.env.CURVA ? `localStorage.setItem('alienz-curva', ${JSON.stringify(process.env.CURVA)})` : `localStorage.removeItem('alienz-curva')`)
  const total = await evaluar(`return __zr.niveles.length`)
  const lista = process.env.NIVELES ? process.env.NIVELES.split(',').map(Number) : [...Array(total).keys()]
  const veces = Number(process.env.VECES ?? 1)
  const forzado = process.env.ARSENAL ? process.env.ARSENAL.split(',') : null
  const quiere = process.env.MEJORAS ?? '0'
  for (const n of lista) {
    const nivel = quiere === 'tramo' ? mejorasEn(n) : Number(quiere)
    await evaluar(`
      const c = JSON.parse(localStorage.getItem('alienz-cartera-v1'))
      const { SOLDIERS } = await import('/src/config.js')
      c.mejoras = Object.fromEntries(Object.keys(SOLDIERS).map(k => [k, { dano: ${nivel}, cadencia: ${nivel} }]))
      localStorage.setItem('alienz-cartera-v1', JSON.stringify(c))
    `)
    for (let v = 0; v < veces; v++) {
      await recargar()
      await espera(600)
      await evaluar(`await fetch('/herramientas/navegador/jugador.js').then(r => r.text()).then(eval)`)
      const r = await evaluar(`return JSON.stringify(await __jugar(${n}, { arsenal: ${JSON.stringify(forzado ?? arsenalDe(n))} }))`)
      const d = JSON.parse(r)
      if (!d.gana && d.base > 0) d.nombre = (d.nombre + ' (tiempo)').slice(0, 16)
      console.log(`${String(d.nivel).padStart(2)} ${d.nombre.padEnd(16)} ${d.gana ? 'GANA  ' : 'PIERDE'} m${nivel} base ${String(d.base).padStart(3)} %  oleada ${d.oleada}/${d.de}  ${String(d.t).padStart(4)} s  1er daño ${String(d.primerDaño ?? '-').padStart(4)}  vivos ${String(d.vivos).padStart(5)}  sold ${String(d.soldados).padStart(2)} bajas ${String(d.bajas).padStart(2)} encima ${String(d.encima).padStart(2)} % mej ${String(d.mejoras).padStart(2)}  sobran ${String(d.sobran).padStart(4)}  ${Object.entries(d.compras).map(([k, c]) => k + '×' + c).join(' ')}`)
    }
  }
}
