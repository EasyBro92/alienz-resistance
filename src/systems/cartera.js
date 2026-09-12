// La cartera: lo que se queda de una partida a otra.
//
// Dentro de una partida se juega con monedas, y esas se pierden al acabar. La
// cartera guarda lo que dura: los BILLETES, que salen jugando —uno por cada 30
// monedas cobradas y lo que toque en el cofre— y se gastan en la tienda; las
// MONEDAS GUARDADAS, que da el cofre y se cambian por billetes al juntar 30; lo
// que se ha desbloqueado; y las mejoras de arma de cada soldado.
//
// Todo pasa por aquí para sumar billetes. Es a propósito: si algún día se venden
// billetes con dinero real, esa compra entra por `sumarBilletes` como cualquier
// otra y no hay que tocar ni la tienda ni el juego.
//
// Como el progreso, vive en el almacén del navegador y se sanea al leer: es
// texto que cualquiera puede editar, y un `billetes: -5` o un JSON roto no deben
// romper la tienda.

import { INICIALES } from '../config.js'

const CLAVE = 'alienz-cartera-v1'

export const MONEDAS_POR_BILLETE = 30

// Precio en billetes para desbloquear cada cosa. El arquero no está: viene de
// serie.
//
// Caros a propósito, y medidos contra lo que da una partida: Tarragona da unos
// 27 billetes si se cobra todo, las misiones de Francia unos 60-120 y las del
// final hasta 237. El fusilero sale a las dos partidas; el mortero, cerca del
// final de la campaña. Lo que se quiere es que siempre haya algo a tiro de
// dos o tres partidas más.
export const PRECIOS = {
  rifle: 45,
  shotgun: 120,
  sniper: 220,
  flamer: 320,
  gunner: 450,
  mortar: 600,
  sandbags: 30,
  spikes: 90,
  mines: 180,
  grenade: 40,
  airstrike: 280,
  napalm: 350,
  collector: 150
}

// Mejoras de arma: permanentes, por soldado, tres niveles cada una. Suben poco
// por nivel a propósito —un soldado con todo al máximo hace un 45% más de daño
// y dispara un 30% más rápido— para que mejorar ayude sin romper la dificultad
// de la campaña, que está medida sin mejoras.
export const MEJORAS = {
  dano: { nombre: 'Daño', paso: 0.15 },
  cadencia: { nombre: 'Cadencia', paso: 0.10 }
}
export const NIVEL_MAX = 3

// El precio de cada nivel sale del precio del soldado: mejorar un mortero cuesta
// lo que cuesta un mortero. El arquero, que es gratis, cuenta como 30.
const ESCALERA = [0.5, 1, 1.8]
const baseMejora = clave => PRECIOS[clave] ?? 30

const entero = v => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function leer () {
  try {
    const txt = localStorage.getItem(CLAVE)
    return txt ? JSON.parse(txt) : null
  } catch {
    return null
  }
}

function guardar (c) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c))
  } catch {
    // Sin almacén (modo privado, lleno): se juega igual, solo que no se guarda.
  }
}

export function cargarCartera () {
  const crudo = leer() ?? {}
  const validas = new Set([...INICIALES, ...Object.keys(PRECIOS)])

  const desbloqueadas = new Set(INICIALES)
  if (Array.isArray(crudo.desbloqueadas)) {
    for (const k of crudo.desbloqueadas) if (validas.has(k)) desbloqueadas.add(k)
  }

  const mejoras = {}
  if (crudo.mejoras && typeof crudo.mejoras === 'object') {
    for (const [k, m] of Object.entries(crudo.mejoras)) {
      if (!validas.has(k) || !m || typeof m !== 'object') continue
      mejoras[k] = {
        dano: Math.min(NIVEL_MAX, entero(m.dano)),
        cadencia: Math.min(NIVEL_MAX, entero(m.cadencia))
      }
    }
  }

  return {
    billetes: entero(crudo.billetes),
    monedas: entero(crudo.monedas),
    desbloqueadas: [...desbloqueadas],
    mejoras
  }
}

export function sumarBilletes (n) {
  const c = cargarCartera()
  c.billetes += entero(n)
  guardar(c)
  return c.billetes
}

export function sumarMonedas (n) {
  const c = cargarCartera()
  c.monedas += entero(n)
  guardar(c)
  return c.monedas
}

// Cambia todas las monedas guardadas que se puedan por billetes. Las que sobran
// —menos de 30— se quedan para la próxima.
export function canjear () {
  const c = cargarCartera()
  const billetes = Math.floor(c.monedas / MONEDAS_POR_BILLETE)
  if (!billetes) return { billetes: 0, monedas: 0 }
  c.monedas -= billetes * MONEDAS_POR_BILLETE
  c.billetes += billetes
  guardar(c)
  return { billetes, monedas: billetes * MONEDAS_POR_BILLETE }
}

export function comprar (clave) {
  const precio = PRECIOS[clave]
  const c = cargarCartera()
  if (precio == null || c.desbloqueadas.includes(clave) || c.billetes < precio) return false
  c.billetes -= precio
  c.desbloqueadas.push(clave)
  guardar(c)
  return true
}

export function nivelMejora (clave, tipo) {
  return cargarCartera().mejoras[clave]?.[tipo] ?? 0
}

// null si ya está al máximo.
export function precioMejora (clave, tipo) {
  const nivel = nivelMejora(clave, tipo)
  return nivel >= NIVEL_MAX ? null : Math.round(baseMejora(clave) * ESCALERA[nivel])
}

export function comprarMejora (clave, tipo) {
  if (!MEJORAS[tipo]) return false
  const c = cargarCartera()
  if (!c.desbloqueadas.includes(clave)) return false
  const nivel = c.mejoras[clave]?.[tipo] ?? 0
  if (nivel >= NIVEL_MAX) return false
  const precio = Math.round(baseMejora(clave) * ESCALERA[nivel])
  if (c.billetes < precio) return false
  c.billetes -= precio
  c.mejoras[clave] = {
    dano: c.mejoras[clave]?.dano ?? 0,
    cadencia: c.mejoras[clave]?.cadencia ?? 0,
    [tipo]: nivel + 1
  }
  guardar(c)
  return true
}

// Por cuánto se multiplica el daño o la cadencia de un soldado. 1 si no tiene
// mejoras o si no es un soldado.
export function factorMejora (clave, tipo) {
  const m = MEJORAS[tipo]
  if (!m) return 1
  return 1 + nivelMejora(clave, tipo) * m.paso
}
