// Qué formas de alien se ha encontrado ya el jugador.
//
// Isidro, 10/10: «que en la parte de Enemigos salgan solo las siluetas, sin
// nombre, hasta que te los encuentras». Hasta entonces la pantalla de Enemigos
// enseñaba las nueve fichas enteras el primer día, antes de la primera partida:
// no quedaba nada por descubrir. Ahora cada país estrena una forma (ver
// `NUEVO_EN_PAIS` en campana.js) y su ficha se abre la primera vez que sale en
// una partida, en el modo que sea.
//
// Dos fuentes, y vale cualquiera de las dos:
//   · lo apuntado al verlo (`marcarVisto`, lo llama main.js cuando un alien
//     aparece en el campo), que se guarda en el aparato;
//   · lo que traen las oleadas de los tramos YA SUPERADOS: quien llevaba media
//     campaña jugada antes de este cambio no tiene nada apuntado, y sería
//     absurdo taparle lo que lleva semanas matando. Sale del progreso, así que
//     viaja con la cuenta sin guardar nada más.

import { DESTINOS as NIVELES } from '../campana.js'
import { cargarProgreso } from './progreso.js'

const CLAVE = 'alienz-vistos-v1'
let apuntados = null

function leer () {
  if (!apuntados) {
    try { apuntados = new Set(JSON.parse(localStorage.getItem(CLAVE)) ?? []) } catch { apuntados = new Set() }
  }
  return apuntados
}

// Devuelve true si es la primera vez: quien llama puede querer celebrarlo.
export function marcarVisto (clave) {
  const v = leer()
  if (v.has(clave)) return false
  v.add(clave)
  try { localStorage.setItem(CLAVE, JSON.stringify([...v])) } catch { /* sin almacén dura lo que la sesión */ }
  return true
}

export function formasVistas () {
  const vistas = new Set(leer())
  const superados = cargarProgreso().superados
  for (let i = 0; i < superados && i < NIVELES.length; i++) {
    for (const oleada of NIVELES[i].waves) for (const s of oleada.spawns) vistas.add(s.type)
  }
  return vistas
}
