import { NIVELES, INICIALES } from '../config.js'

// Lo que el jugador se lleva de una partida a otra: qué niveles ha superado y,
// de ahí, qué cartas tiene abiertas. Vive en el almacén del navegador, que es
// lo único que hay en una aplicación web sin cuentas ni servidor.
//
// Todo lo que sale de aquí está saneado. El almacén es texto que el usuario
// puede editar a mano, y un `superados: 99` o un JSON roto no deben dejar el
// menú en blanco: en el peor caso se empieza de cero, que es un estado válido.

const CLAVE = 'alienz-progreso-v1'

function leerCrudo () {
  try {
    const txt = localStorage.getItem(CLAVE)
    if (!txt) return null
    return JSON.parse(txt)
  } catch {
    // Almacén bloqueado (modo privado), lleno, o texto que no es JSON.
    return null
  }
}

// Cómo se ganó, según lo que quedó en pie. Un nivel superado con el perímetro
// intacto y otro arañado con un 5% no son la misma partida, y hasta ahora las
// dos daban exactamente la misma pantalla: un título y una línea.
export const RANGOS = [
  { min: 0,   nombre: 'Por los pelos', corto: 'C' },
  { min: 40,  nombre: 'Con bajas',     corto: 'B' },
  { min: 75,  nombre: 'Contenido',     corto: 'A' },
  { min: 100, nombre: 'Intacto',       corto: 'S' }
]

export function rangoDe (porcentaje) {
  let i = 0
  for (let r = 0; r < RANGOS.length; r++) if (porcentaje >= RANGOS[r].min) i = r
  return i
}

export function cargarProgreso () {
  const crudo = leerCrudo()
  const n = Number(crudo?.superados)
  // Los rangos vienen del almacén, que es texto que el usuario puede editar:
  // se filtra índice por índice en vez de confiar en el objeto entero.
  const rangos = {}
  const guardados = crudo?.rangos
  if (guardados && typeof guardados === 'object') {
    for (let i = 0; i < NIVELES.length; i++) {
      const v = Number(guardados[i])
      if (Number.isFinite(v) && v >= 0 && v < RANGOS.length) rangos[i] = Math.floor(v)
    }
  }
  return {
    // Cuántos niveles seguidos lleva superados. Nunca más de los que hay.
    superados: Number.isFinite(n) ? Math.max(0, Math.min(NIVELES.length, Math.floor(n))) : 0,
    rangos
  }
}

export function guardarProgreso (p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ superados: p.superados, rangos: p.rangos ?? {} }))
  } catch {
    // Si no se puede guardar, la partida sigue: se pierde el progreso al salir,
    // que es mucho mejor que reventar a mitad de una victoria.
  }
}

// Marca un nivel como superado. Solo avanza si es el que tocaba: rehacer el
// primero cuando ya vas por el tercero no debe echarte atrás.
// Solo se guarda el MEJOR rango de cada nivel: rejugar y hacerlo peor no debe
// borrar lo que ya se demostró.
export function superarNivel (indice, porcentaje = 0) {
  const p = cargarProgreso()
  const rango = rangoDe(porcentaje)
  let cambia = false
  if (indice + 1 > p.superados) { p.superados = Math.min(NIVELES.length, indice + 1); cambia = true }
  if (!(indice in p.rangos) || rango > p.rangos[indice]) { p.rangos[indice] = rango; cambia = true }
  if (cambia) guardarProgreso(p)
  return p
}

// La campaña entera hecha: los seis superados.
export function campañaCompleta (progreso = cargarProgreso()) {
  return progreso.superados >= NIVELES.length
}

// Las cartas abiertas: las de salida más lo que haya soltado cada nivel hecho.
export function cartasAbiertas (superados = cargarProgreso().superados) {
  const set = new Set(INICIALES)
  for (let i = 0; i < superados && i < NIVELES.length; i++) {
    for (const clave of NIVELES[i].desbloquea ?? []) set.add(clave)
  }
  return set
}

// Qué niveles se pueden jugar: los superados, más el siguiente. Nunca se salta
// uno, porque cada nivel abre el arsenal que hace falta para el siguiente.
export function nivelJugable (indice, superados = cargarProgreso().superados) {
  return indice <= superados
}

export function borrarProgreso () {
  try { localStorage.removeItem(CLAVE) } catch {}
}
