// Marcadores: la tabla pública de cada misión.
//
// Primera pieza del multijugador. No hay partida compartida todavía: hay gente
// jugando lo mismo y un sitio donde se ve quién aguantó mejor, que es lo que
// convierte una campaña en solitario en una competición.
//
// Una fila por jugador y misión, en `marcadores/{nivel}/puestos/{uid}`. Se
// guarda el MEJOR resultado, nunca el último: perder una partida no puede
// borrarte de la tabla. Eso se comprueba aquí y también en las reglas del
// servidor, porque lo que se comprueba solo en el móvil no está comprobado.
//
// El nombre que sale es un alias que elige el jugador. Por defecto, el nombre
// de pila de su cuenta de Google y nunca el correo: la tabla la lee cualquiera
// que tenga el juego.

import { cargarFirebase } from './cuenta.js'

const CLAVE_ALIAS = 'alienz-alias-v1'
const MAX_ALIAS = 24

const leer = clave => {
  try { return localStorage.getItem(clave) } catch { return null }
}

// Un alias decente por defecto: el nombre de pila de la cuenta, o la parte del
// correo antes de la arroba si Google no da nombre.
export function aliasPorDefecto (usuario) {
  const dado = (usuario?.displayName ?? '').trim().split(/\s+/)[0]
  if (dado) return dado.slice(0, MAX_ALIAS)
  const correo = (usuario?.email ?? '').split('@')[0]
  return (correo || 'Recluta').slice(0, MAX_ALIAS)
}

export function aliasActual (usuario) {
  const mio = (leer(CLAVE_ALIAS) ?? '').trim()
  return mio ? mio.slice(0, MAX_ALIAS) : aliasPorDefecto(usuario)
}

export function guardarAlias (texto) {
  const limpio = (texto ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_ALIAS)
  try { localStorage.setItem(CLAVE_ALIAS, limpio) } catch { /* modo privado */ }
  return limpio
}

// Sube el resultado de una misión si mejora lo que ya había. Devuelve `false`
// sin hacer nada si no hay sesión: el juego se puede jugar entero sin cuenta.
export async function publicarPuntuacion (usuario, nivel, porcentaje, estrellas) {
  if (!usuario) return false
  const { fs, db } = await cargarFirebase()
  const ref = fs.doc(db, 'marcadores', String(nivel), 'puestos', usuario.uid)
  const antes = (await fs.getDoc(ref)).data()
  if (antes && (antes.porcentaje ?? 0) >= porcentaje) return false
  await fs.setDoc(ref, {
    alias: aliasActual(usuario),
    porcentaje: Math.max(0, Math.min(100, Math.round(porcentaje))),
    estrellas: Math.max(0, Math.min(3, Math.round(estrellas))),
    fecha: fs.serverTimestamp()
  })
  return true
}

// Los mejores de una misión y, aparte, dónde queda uno mismo: si eres el 148.º
// no sales en la lista, y saber que existes es la mitad de la gracia.
export async function leerMarcador (nivel, usuario, cuantos = 20) {
  const { fs, db } = await cargarFirebase()
  const col = fs.collection(db, 'marcadores', String(nivel), 'puestos')
  const listado = await fs.getDocs(fs.query(col, fs.orderBy('porcentaje', 'desc'), fs.limit(cuantos)))
  const filas = listado.docs.map((d, i) => ({ puesto: i + 1, uid: d.id, ...d.data() }))
  const mio = usuario ? filas.find(f => f.uid === usuario.uid) ?? null : null
  if (mio || !usuario) return { filas, mio }

  // No está entre los primeros: se pide su fila y se cuenta cuántos le ganan.
  const suya = (await fs.getDoc(fs.doc(col, usuario.uid))).data()
  if (!suya) return { filas, mio: null }
  const mejores = await fs.getCountFromServer(fs.query(col, fs.where('porcentaje', '>', suya.porcentaje)))
  return { filas, mio: { puesto: mejores.data().count + 1, uid: usuario.uid, ...suya } }
}
