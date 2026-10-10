import { NIVELES } from '../config.js'
import { cargarCartera } from './cartera.js'

// Lo que el jugador se lleva de una partida a otra: qué niveles ha superado y,
// de ahí, qué cartas tiene abiertas. Vive en el almacén del navegador, que es
// lo único que hay en una aplicación web sin cuentas ni servidor.
//
// Todo lo que sale de aquí está saneado. El almacén es texto que el usuario
// puede editar a mano, y un `superados: 99` o un JSON roto no deben dejar el
// menú en blanco: en el peor caso se empieza de cero, que es un estado válido.

// v2 desde la campaña por países. Los índices de misión cambiaron —eran doce
// destinos y ahora son treinta y seis misiones—, así que el progreso de la v1
// se acreditaría a ciudades equivocadas: las estrellas de Marsella caerían en
// Valencia. Se empieza limpio en vez de mentir.
export const VERSION_PROGRESO = 5
export const CLAVE_PROGRESO = 'alienz-progreso-v5'
const CLAVE = CLAVE_PROGRESO
const CLAVES_VIEJAS = { 4: 'alienz-progreso-v4', 3: 'alienz-progreso-v3', 2: 'alienz-progreso-v2' }

// El progreso se guarda por NÚMERO de misión, así que cada vez que la campaña
// gana o pierde un tramo hay que correr los índices, o las estrellas de una
// ciudad se acreditan a otra. Cada cambio es un PASO de una versión a la
// siguiente, y son funciones puras: valen para el almacén de este móvil y para
// la ficha de la nube, que puede venir de una versión vieja (cuenta.js).
//
// Nunca se empieza de cero: Isidro tiene la campaña jugada y perder sus
// estrellas por un cambio de decorado no vale la pena.
const rangosCon = (p, destino) => {
  const rangos = {}
  for (const k in p?.rangos ?? {}) {
    const i = Number(k)
    const v = Number(p.rangos[k])
    if (!Number.isFinite(i) || !Number.isFinite(v)) continue
    const a = destino(i)
    rangos[a] = Math.max(rangos[a] ?? 0, v)
  }
  return rangos
}
const cuantos = p => { const n = Number(p?.superados); return Number.isFinite(n) ? n : 0 }

// v3: Nueva York pasó de un tramo a tres. Se metieron DOS misiones (Times Square
// y la Isla de la Libertad) detrás de la Quinta Avenida, que era el tramo 29, así
// que México, Dominicana y Brasil se movieron dos sitios. A quien ya hubiera
// pasado Nueva York se le dan los dos nuevos por superados —o se quedaría con
// México bloqueado sin haber perdido nada—, sin estrellas: están para jugarlas.
const CORTE_NY = 30   // el primero de los dos nuevos
const METIDOS = 2
const aV3 = p => ({
  superados: cuantos(p) <= CORTE_NY ? cuantos(p) : cuantos(p) + METIDOS,
  rangos: rangosCon(p, i => i < CORTE_NY ? i : i + METIDOS)
})

// v4: Nigeria se quedó en un solo tramo (09/10: Isidro dejó solo Lagos). Abuja y
// Kano eran el 16 y el 17, así que de la India a Brasil todo baja dos sitios.
// Lagos se queda con la mejor nota de las tres, y quien iba por Abuja o Kano
// sigue en la puerta de la India.
const LAGOS = 15
const QUITADOS = 2
const aV4 = p => ({
  superados: cuantos(p) <= LAGOS + 1 ? cuantos(p) : Math.max(LAGOS + 1, cuantos(p) - QUITADOS),
  rangos: rangosCon(p, i => i <= LAGOS ? i : i <= LAGOS + QUITADOS ? LAGOS : i - QUITADOS)
})

// v5: Nueva York se quedó en dos tramos (10/10: Isidro quitó el de la Quinta
// Avenida al ver el portaaviones). Era el 27, así que Times Square pasa a serlo
// y todo lo de después baja un sitio. Times Square se queda con la mejor nota de
// las dos, y quien ya había pasado la Quinta Avenida tiene pasado el primero de
// Nueva York, que ahora es Times Square.
const QUINTA = 27
const aV5 = p => ({
  superados: cuantos(p) <= QUINTA ? cuantos(p) : Math.max(QUINTA + 1, cuantos(p) - 1),
  rangos: rangosCon(p, i => i <= QUINTA ? i : i - 1)
})

const PASOS = { 2: aV3, 3: aV4, 4: aV5 }

// Lleva un progreso guardado en la versión `desde` a la de ahora.
export function subirProgreso (p, desde) {
  if (!p || typeof p !== 'object') return null
  let q = { superados: cuantos(p), rangos: { ...(p.rangos ?? {}) } }
  for (let v = desde; v < VERSION_PROGRESO; v++) q = PASOS[v] ? PASOS[v](q) : q
  return q
}

// El progreso de este móvil, tal como está guardado y ya en la versión de ahora.
// Si solo hay uno de una versión vieja, se sube y se guarda; las claves viejas se
// dejan donde están: si algo saliera mal, el progreso de verdad sigue ahí.
export function leerProgresoLocal () {
  try {
    const txt = localStorage.getItem(CLAVE)
    if (txt) return JSON.parse(txt)
    for (const v of [4, 3, 2]) {
      const viejo = localStorage.getItem(CLAVES_VIEJAS[v])
      if (!viejo) continue
      const nuevo = subirProgreso(JSON.parse(viejo), v)
      if (!nuevo) continue
      try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)) } catch { /* modo privado */ }
      return nuevo
    }
    return null
  } catch {
    // Almacén bloqueado (modo privado), lleno, o texto que no es JSON.
    return null
  }
}

// Cómo se ganó, en estrellas. Un nivel superado con el perímetro intacto y otro
// arañado con un 5% no son la misma partida.
//
// Tres escalones y no cuatro, y con el corte donde tiene sentido dentro de la
// ficción: o no han entrado, o han entrado, o han entrado y ha costado caro.
// Las estrellas además ya no son solo un adorno: son la llave que abre el
// siguiente país, así que rejugar un tramo antiguo para sacarle la tercera es
// una forma legítima de avanzar.
export const ESTRELLAS = [
  { min: 0,   nombre: 'Aguantó',  detalle: 'Menos de la mitad del perímetro en pie' },
  { min: 55,  nombre: 'Contenido', detalle: 'Entraron, pero el perímetro aguantó' },
  { min: 100, nombre: 'Intacto',  detalle: 'No pasó ninguno' }
]

// 3 si no entró nadie, 2 si entraron pero quedó más del 55% del perímetro,
// 1 si se ganó por debajo de eso.
export function estrellasDe (porcentaje) {
  if (porcentaje >= 100) return 3
  if (porcentaje >= 55) return 2
  return 1
}

// Se mantiene el nombre viejo como índice 0..2 para lo que aún lo use.
export const RANGOS = ESTRELLAS
export const rangoDe = porcentaje => estrellasDe(porcentaje) - 1

export function cargarProgreso () {
  const crudo = leerProgresoLocal()
  const n = Number(crudo?.superados)
  // Los rangos vienen del almacén, que es texto que el usuario puede editar:
  // se filtra índice por índice en vez de confiar en el objeto entero.
  const rangos = {}
  const guardados = crudo?.rangos
  if (guardados && typeof guardados === 'object') {
    for (let i = 0; i < NIVELES.length; i++) {
      const v = Number(guardados[i])
      if (Number.isFinite(v) && v >= 1 && v <= 3) rangos[i] = Math.floor(v)
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
    dispatchEvent(new Event('alienz-guardado'))
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
  const rango = estrellasDe(porcentaje)
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

// Las cartas abiertas.
// Ya no las abre la campaña: son las compradas en la tienda más el arquero, que
// viene de serie. Se conserva el nombre para no tocar a quien lo usa.
export function cartasAbiertas () {
  return new Set(cargarCartera().desbloqueadas)
}

// Cuántas estrellas se llevan en total. Es la moneda con la que se abren los
// países siguientes.
export function estrellasTotales (progreso = cargarProgreso()) {
  let n = 0
  for (const k in progreso.rangos) n += progreso.rangos[k]
  return n
}

// Qué niveles se pueden jugar.
//
// Dos condiciones, y hacen falta las dos. La de siempre: no se salta ninguno,
// porque cada tramo abre el arsenal que hace falta para el siguiente. Y la
// nueva: cada destino puede pedir un mínimo de estrellas ACUMULADAS.
//
// Acumuladas y no "las del nivel anterior" a propósito. Si el peaje fuera lo
// sacado en el tramo justo anterior, un jugador atascado tendría que repetir
// una y otra vez ESE tramo; contando el total, puede volver a cualquiera de los
// que ya superó y sacarle la estrella que le falta. Que es justo para lo que
// sirve poder volver atrás.
export function nivelJugable (indice, superados = cargarProgreso().superados, progreso = null) {
  if (indice > superados) return false
  const piden = NIVELES[indice]?.estrellas ?? 0
  if (!piden) return true
  return estrellasTotales(progreso ?? cargarProgreso()) >= piden
}

// Cuántas estrellas faltan para poder entrar. 0 si ya se puede.
export function estrellasQueFaltan (indice, progreso = cargarProgreso()) {
  const piden = NIVELES[indice]?.estrellas ?? 0
  return Math.max(0, piden - estrellasTotales(progreso))
}

export function borrarProgreso () {
  // También las de versiones viejas: si no, al no encontrar la de ahora se
  // volvería a subir la anterior y el progreso «borrado» reaparecería.
  try {
    localStorage.removeItem(CLAVE)
    for (const k of Object.values(CLAVES_VIEJAS)) localStorage.removeItem(k)
  } catch {}
}
