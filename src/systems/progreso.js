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

export function cargarProgreso () {
  const crudo = leerCrudo()
  const n = Number(crudo?.superados)
  return {
    // Cuántos niveles seguidos lleva superados. Nunca más de los que hay.
    superados: Number.isFinite(n) ? Math.max(0, Math.min(NIVELES.length, Math.floor(n))) : 0
  }
}

export function guardarProgreso (p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ superados: p.superados }))
  } catch {
    // Si no se puede guardar, la partida sigue: se pierde el progreso al salir,
    // que es mucho mejor que reventar a mitad de una victoria.
  }
}

// Marca un nivel como superado. Solo avanza si es el que tocaba: rehacer el
// primero cuando ya vas por el tercero no debe echarte atrás.
export function superarNivel (indice) {
  const p = cargarProgreso()
  if (indice + 1 > p.superados) {
    p.superados = Math.min(NIVELES.length, indice + 1)
    guardarProgreso(p)
  }
  return p
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
