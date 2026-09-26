// Comprueba LA REGLA de los lugares: nada macizo dentro del pasillo por donde
// andan los bichos.
//
// Por qué hace falta una herramienta y no basta con mirarlo: los escenarios se
// FUNDEN en una sola malla, así que `Box3.setFromObject` devuelve la caja del
// grupo entero y no sirve para saber si la pata de un pilar se mete en el
// camino. Hay que ir pieza a pieza, antes de fundir.
//
// Isidro: «los aliens atraviesan los pilares del puente». Y los atravesaban: las
// patas de los pilones estaban a x = ±5,2 (cara interior 4,1) y los bichos
// llegan a |x| = 4,71. Esto es para que no vuelva a pasar.
//
// **Se muestrean las ARISTAS, no los vértices.** Un poste de farola de siete
// metros es un cilindro con vértices solo arriba y abajo: mirando vértices, los
// dos caen fuera de la franja que importa (entre 0,35 y 4 de alto) y el poste
// pasa la prueba aunque esté plantado en medio del carril. Recorriendo las
// aristas de cada triángulo cada 0,3 eso se ve. Y una diagonal —un tirante que
// cruza por encima— se ve entrar y salir de la franja, que es justo lo que hay
// que distinguir: por encima de la cabeza no estorba.
//
//   node herramientas/pasillo-libre.mjs
//   node herramientas/pasillo-libre.mjs moscu roma        (solo esos)

import * as THREE from 'three'
import { LUGARES } from '../src/ciudades.js'
import { ESCENARIOS } from '../src/escenarios.js'

// El margen sobre el ancho de los carriles abiertos (0,9) sale de medirlo: en el
// puente de tres carriles el bicho que más se aparta llega a |x| = 4,71 contra
// un ancho de carriles de 3,6.
//   5 carriles → ±6,9   4 → ±5,7   3 → ±4,5
const ancho = carriles => carriles * 1.2 + 0.9
// Los bichos andan de donde aparecen (z = -44) a la línea de la base (z = 4).
// Detrás de la base no pisa nadie.
const Z0 = 5
const Z1 = -52
// Por debajo es suelo y por encima pasa por ENCIMA de los bichos: los tirantes
// de un puente, el brazo de una farola, la copa de un árbol o un arco de entrada
// están ahí para verse, no para chocar. El más alto del juego es LA MADRE, así
// que el techo va con holgura sobre ella.
const SUELO = 0.35
const TECHO = 4
const PASO = 0.3

const pedidos = process.argv.slice(2)
const lista = pedidos.length
  ? Object.fromEntries(pedidos.map(k => [k, ESCENARIOS[k]]).filter(([, f]) => f))
  : { ...LUGARES, puente: ESCENARIOS.puente, circuito: ESCENARIOS.circuito }

const a = new THREE.Vector3()
const b = new THREE.Vector3()
const p = new THREE.Vector3()
const caja = new THREE.Box3()
const pasillo = new THREE.Box3()
const filas = []
let malos = 0

for (const [clave, hacer] of Object.entries(lista)) {
  let g
  try { g = hacer() } catch (e) { console.log('REVIENTA', clave, '·', e.message); malos++; continue }
  g.updateMatrixWorld(true)
  const carriles = g.userData.carriles ?? 5
  const limite = ancho(carriles)
  pasillo.set(new THREE.Vector3(-limite, SUELO, Z1), new THREE.Vector3(limite, TECHO, Z0))

  let piezas = 0
  let tri = 0
  let muros = 0
  let peor = 99
  let ejemplo = ''
  const culpables = new Map()

  g.traverse(o => {
    if (!o.isMesh) return
    piezas++
    const pos = o.geometry.attributes.position
    const idx = o.geometry.index
    tri += (idx ? idx.count : pos.count) / 3
    // Un muro que cierra un carril SÍ va en el borde del pasillo: es la pared
    // contra la que se queda el bicho, no un estorbo que atraviesa.
    if (o.userData.muro) { muros++; return }
    // Descarte rápido: si la caja de la pieza no toca el pasillo, no hay nada
    // que mirar. Se lleva por delante casi todas.
    caja.setFromBufferAttribute(pos).applyMatrix4(o.matrixWorld)
    if (!caja.intersectsBox(pasillo)) return

    let dentro = 0
    const cuantos = idx ? idx.count : pos.count
    for (let i = 0; i + 2 < cuantos; i += 3) {
      for (let e = 0; e < 3; e++) {
        const i0 = idx ? idx.getX(i + e) : i + e
        const i1 = idx ? idx.getX(i + (e + 1) % 3) : i + (e + 1) % 3
        a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld)
        b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld)
        const pasos = Math.min(400, Math.max(1, Math.ceil(a.distanceTo(b) / PASO)))
        for (let s = 0; s <= pasos; s++) {
          p.lerpVectors(a, b, s / pasos)
          if (p.y < SUELO || p.y > TECHO) continue
          if (Math.abs(p.x) >= limite || p.z >= Z0 || p.z <= Z1) continue
          dentro++
          if (Math.abs(p.x) < peor) {
            peor = Math.abs(p.x)
            ejemplo = `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} z=${p.z.toFixed(1)}`
          }
        }
      }
    }
    if (!dentro) return
    const nombre = o.geometry.type.replace('Geometry', '') + ' ' +
      Object.values(o.geometry.parameters ?? {}).slice(0, 3)
        .map(n => typeof n === 'number' ? n.toFixed(2) : n).join('×')
    culpables.set(nombre, (culpables.get(nombre) ?? 0) + dentro)
  })

  const dentro = [...culpables.values()].reduce((x, y) => x + y, 0)
  if (dentro) malos++
  filas.push({ clave, piezas, tri: Math.round(tri), carriles, limite, dentro, ejemplo, muros, culpables })
}

filas.sort((x, y) => y.dentro - x.dentro || y.piezas - x.piezas)
console.log('lugar'.padEnd(18) + 'piezas' + 'triáng.'.padStart(9) + '  carr.  pasillo')
for (const f of filas) {
  console.log(
    f.clave.padEnd(18) + String(f.piezas).padStart(6) + String(f.tri).padStart(9) +
    String(f.carriles).padStart(7) + '  ' + (f.dentro
      ? `¡DENTRO de ±${f.limite.toFixed(1)}! lo más adentro en ${f.ejemplo}`
      : `libre (±${f.limite.toFixed(1)})`))
  if (f.dentro) {
    for (const [t, n] of [...f.culpables].sort((x, y) => y[1] - x[1]).slice(0, 4)) {
      console.log(' '.repeat(20) + `${t} · ${n} puntos`)
    }
  }
}
const piezas = filas.reduce((s, f) => s + f.piezas, 0)
console.log(`\n${filas.length} lugares · ${piezas} piezas · ${Math.round(piezas / filas.length)} de media`)
console.log('lugares con el pasillo invadido:', malos)
process.exit(malos ? 1 : 0)
