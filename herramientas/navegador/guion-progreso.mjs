// Los pasos de versión del progreso, en el navegador de verdad: se deja un
// progreso viejo en su clave, se borra el de ahora, se recarga y se lee lo que
// el juego ha guardado.
export default async ({ evaluar, espera, recargar }) => {
  const casos = [
    ['v4 completo', 4, { superados: 30, rangos: { 0: 3, 26: 2, 27: 1, 28: 3, 29: 2, 30: 3 } }],
    ['v4: pasó solo la Quinta', 4, { superados: 28, rangos: { 27: 2 } }],
    ['v4: antes de Nueva York', 4, { superados: 27, rangos: { 26: 3 } }],
    ['v2 antiguo', 2, { superados: 36, rangos: { 15: 3, 16: 2, 17: 1, 29: 3, 30: 2 } }]
  ]
  for (const [nombre, v, datos] of casos) {
    await evaluar(`for (const k of [2,3,4,5]) localStorage.removeItem('alienz-progreso-v' + k); localStorage.setItem('alienz-progreso-v${v}', ${JSON.stringify(JSON.stringify(datos))})`)
    await recargar()
    await espera(2500)
    console.log(nombre, '→', await evaluar(`return localStorage.getItem('alienz-progreso-v5')`))
  }
  await evaluar(`for (const k of [2,3,4,5]) localStorage.removeItem('alienz-progreso-v' + k)`)
}
