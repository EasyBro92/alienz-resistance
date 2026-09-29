// Retos del Mando (29/09/2026): retos que publica el administrador para todos,
// con premio en billetes.
//
// Isidro: «quiero poder crear mis propios retos con una recompensa en billetes;
// si yo, que soy el admin, creo un reto, quiero darle a publicar y que los demás
// lo vean». Lo que decidió:
//   · Se supera con solo SOBREVIVIR (acabar sin que caiga la base).
//   · Cobra TODO el que lo supere, una vez por cuenta; intentos ilimitados.
//   · Hace falta cuenta (Google o correo) para cobrar; sin cuenta se juega igual.
//   · Dura hasta la fecha que ponga él; puede retirarlo antes.
//   · Él pone título, texto, premio (sin tope), mapa, oleada sin presupuesto
//     (LA MADRE incluida) y si se juega sin las mejoras de la tienda.
//
// Van en la Realtime Database y no en Firestore como los retos normales porque
// la lista de administradores (`admins/{uid}`) vive ahí, y solo las reglas de la
// misma base pueden comprobarla:
//   retosMando/{id}               el reto (lo leen todos; solo lo escribe un admin)
//   superadosMando/{id}/{uid}     quién lo ha superado. Se escribe UNA vez y solo
//                                 antes de que cierre: esa escritura es el cobro,
//                                 así nadie cobra dos veces aunque borre el móvil.

import { cargarFirebase } from './cuenta.js'
import { aliasActual } from './marcadores.js'

async function base () {
  const [{ app }, rtdb] = await Promise.all([cargarFirebase(), import('firebase/database')])
  return { rtdb, db: rtdb.getDatabase(app) }
}

export async function soyAdmin (usuario) {
  if (!usuario) return false
  const { rtdb, db } = await base()
  try { return !!(await rtdb.get(rtdb.ref(db, `admins/${usuario.uid}`))).val() } catch { return false }
}

// Los retos publicados, los más nuevos primero. Los cerrados también vienen
// (el administrador los ve para retirarlos); la pantalla decide qué enseña.
export async function listarRetosMando () {
  const { rtdb, db } = await base()
  const todo = (await rtdb.get(rtdb.ref(db, 'retosMando'))).val() ?? {}
  return Object.entries(todo)
    .map(([id, r]) => ({ id, ...r }))
    .filter(r => r && typeof r.titulo === 'string' && r.composicion)
    .sort((a, b) => (b.creado ?? 0) - (a.creado ?? 0))
}

export async function publicarRetoMando (usuario, datos) {
  const { rtdb, db } = await base()
  const ref = rtdb.push(rtdb.ref(db, 'retosMando'))
  await rtdb.set(ref, { ...datos, autor: usuario.uid, creado: Date.now() })
  return ref.key
}

export async function retirarRetoMando (id) {
  const { rtdb, db } = await base()
  await rtdb.remove(rtdb.ref(db, `retosMando/${id}`))
  await rtdb.remove(rtdb.ref(db, `superadosMando/${id}`)).catch(() => {})
}

// Quién lo ha superado, para la lista del final y el «lo han superado N».
export async function superadosDe (id) {
  const { rtdb, db } = await base()
  const todo = (await rtdb.get(rtdb.ref(db, `superadosMando/${id}`))).val() ?? {}
  return Object.entries(todo).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => (a.en ?? 0) - (b.en ?? 0))
}

export async function yaLoSupere (usuario, id) {
  if (!usuario) return false
  const { rtdb, db } = await base()
  return (await rtdb.get(rtdb.ref(db, `superadosMando/${id}/${usuario.uid}`))).exists()
}

// El cobro. Devuelve 'cobrado', 'ya' (lo cobró antes) o 'cerrado'. Los billetes
// los suma quien llama, y solo si esto devuelve 'cobrado': la regla del servidor
// no deja escribir dos veces ni después del cierre.
export async function apuntarSuperado (usuario, reto) {
  const { rtdb, db } = await base()
  const ref = rtdb.ref(db, `superadosMando/${reto.id}/${usuario.uid}`)
  if ((await rtdb.get(ref)).exists()) return 'ya'
  if (Date.now() > (reto.cierra ?? 0)) return 'cerrado'
  try {
    await rtdb.set(ref, { alias: aliasActual(usuario), en: Date.now() })
    return 'cobrado'
  } catch (e) {
    console.warn('Sin cobrar el reto:', e)
    return (await rtdb.get(ref).catch(() => null))?.exists() ? 'ya' : 'cerrado'
  }
}

// «Quedan 2 d 5 h», «Quedan 3 h 10 min», «Cerrado».
export function cuantoQueda (cierra, ahora = Date.now()) {
  const ms = (cierra ?? 0) - ahora
  if (ms <= 0) return 'Cerrado'
  const min = Math.floor(ms / 60000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  if (d) return `Quedan ${d} d ${h} h`
  if (h) return `Quedan ${h} h ${min % 60} min`
  return `Quedan ${Math.max(1, min)} min`
}
