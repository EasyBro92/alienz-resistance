// Retos: una oleada que montas tú y le mandas a otro para que la aguante.
//
// Es el multijugador que de verdad encaja en un juego de defensa por carriles:
// nadie tiene que estar conectado a la vez, no hay que sincronizar nada, y aun
// así juegas CONTRA una persona. Tú eliges qué baja de la nave con un
// presupuesto de biomasa; el otro pone la línea. Gana quien deje mejor la base.
//
// Un reto es un documento pequeño en `retos/{codigo}` con la composición, y los
// resultados van en `retos/{codigo}/intentos/{uid}`: una fila por jugador.

import { ZOMBIES } from '../config.js'
import { cargarFirebase } from './cuenta.js'
import { aliasActual } from './marcadores.js'

// El presupuesto. Da para una oleada larga de las baratas o para tres Colosos
// con escolta: suficiente para que elegir signifique renunciar a algo.
export const PRESUPUESTO = 700

// Lo que cuesta cada uno. Se usa lo que suelta al morir, que es la medida que
// el juego ya tiene de lo que vale cada huésped, y así no hay dos tablas que
// mantener. LA MADRE se queda fuera: es el final de la campaña, no un cromo.
export const CATALOGO = Object.entries(ZOMBIES)
  .filter(([, s]) => !s.boss)
  .map(([clave, s]) => ({ clave, nombre: s.name, coste: s.coins }))
  .sort((a, b) => a.coste - b.coste)

const COSTE = Object.fromEntries(CATALOGO.map(c => [c.clave, c.coste]))

// Cada cuánto baja uno de cada clase. Los caros salen más espaciados: ocho
// Colosos seguidos no son un reto, son una pared.
const RITMO = { walker: 1, runner: 1.5, leaper: 2.4, armored: 2.2, burrower: 2.6, spitter: 3, bloater: 3.2, healer: 3, tank: 5.5 }

export const costeDe = composicion =>
  Object.entries(composicion).reduce((t, [k, n]) => t + (COSTE[k] ?? 0) * n, 0)

// De la composición a las oleadas que entiende el director.
//
// Se reparte en tres tandas y de menos a más: los baratos abren, los caros
// cierran. Repartido al azar, la mitad de los retos empezaban con un Coloso y
// se acababan en veinte segundos.
export function oleadasDeReto (composicion) {
  const clases = CATALOGO.filter(c => (composicion[c.clave] ?? 0) > 0)
  const tandas = [[], [], []]
  for (const c of clases) {
    const total = composicion[c.clave]
    // Los baratos cargan las primeras tandas; los caros, las últimas.
    const barato = c.coste <= 20
    for (let t = 0; t < 3; t++) {
      const parte = barato
        ? [0.45, 0.3, 0.25][t]
        : [0.15, 0.35, 0.5][t]
      const cuantos = t === 2
        ? total - tandas[0].filter(s => s.type === c.clave).reduce((n, s) => n + s.count, 0)
            - tandas[1].filter(s => s.type === c.clave).reduce((n, s) => n + s.count, 0)
        : Math.round(total * parte)
      if (cuantos > 0) tandas[t].push({ type: c.clave, count: cuantos, every: RITMO[c.clave] ?? 2 })
    }
  }
  return tandas.filter(t => t.length).map((spawns, i) => ({ gap: i ? 9 : 6, spawns }))
}

// Código corto y legible en voz alta: sin O ni 0, sin I ni 1.
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const codigoNuevo = () => Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')

export async function crearReto (usuario, composicion, escenario) {
  if (!usuario) throw new Error('sin sesión')
  const { fs, db } = await cargarFirebase()
  const datos = {
    autor: usuario.uid,
    alias: aliasActual(usuario),
    composicion,
    escenario,
    creado: fs.serverTimestamp()
  }
  // Tres intentos de código libre. Con 32^5 combinaciones, chocar dos veces
  // seguidas es más raro que ganar a la lotería, pero pisar el reto de otro
  // sería perderlo, así que se comprueba.
  for (let i = 0; i < 3; i++) {
    const codigo = codigoNuevo()
    const ref = fs.doc(db, 'retos', codigo)
    if ((await fs.getDoc(ref)).exists()) continue
    await fs.setDoc(ref, datos)
    return codigo
  }
  throw new Error('no hay código libre')
}

export async function leerReto (codigo) {
  const { fs, db } = await cargarFirebase()
  const limpio = String(codigo ?? '').trim().toUpperCase()
  if (!/^[A-Z2-9]{5}$/.test(limpio)) return null
  const snap = await fs.getDoc(fs.doc(db, 'retos', limpio))
  return snap.exists() ? { codigo: limpio, ...snap.data() } : null
}

export async function apuntarIntento (usuario, codigo, porcentaje) {
  if (!usuario) return
  const { fs, db } = await cargarFirebase()
  const ref = fs.doc(db, 'retos', codigo, 'intentos', usuario.uid)
  const antes = (await fs.getDoc(ref)).data()
  if (antes && (antes.porcentaje ?? 0) >= porcentaje) return
  await fs.setDoc(ref, {
    alias: aliasActual(usuario),
    porcentaje: Math.max(0, Math.min(100, Math.round(porcentaje))),
    fecha: fs.serverTimestamp()
  })
}

export async function intentosDe (codigo, cuantos = 10) {
  const { fs, db } = await cargarFirebase()
  const col = fs.collection(db, 'retos', codigo, 'intentos')
  const listado = await fs.getDocs(fs.query(col, fs.orderBy('porcentaje', 'desc'), fs.limit(cuantos)))
  return listado.docs.map((d, i) => ({ puesto: i + 1, uid: d.id, ...d.data() }))
}

// Los retos que ha montado uno, para poder volver a pasar el código.
export async function misRetos (usuario, cuantos = 5) {
  if (!usuario) return []
  const { fs, db } = await cargarFirebase()
  const listado = await fs.getDocs(fs.query(
    fs.collection(db, 'retos'), fs.where('autor', '==', usuario.uid), fs.limit(cuantos)))
  return listado.docs.map(d => ({ codigo: d.id, ...d.data() }))
}
