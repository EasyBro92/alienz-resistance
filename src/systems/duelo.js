// Duelo: uno contra uno en directo. Aquí solo va la parte que no pinta nada —la
// horda compartida, lo que cuesta mandar cada alien, los rangos, los puntos y el
// filtro del chat— para que se pueda leer y ajustar sin abrir el juego entero.
//
// La idea que manda: los dos juegan la MISMA horda a la vez, cada uno en su
// móvil y con su simulación. No hace falta que las dos partidas cuadren al
// milímetro: cada uno defiende su campo, y lo único que cruza la red es lo que
// uno le manda al otro, la miniatura y el final. Para que la horda sea la misma,
// sale de una semilla que reparte la sala: mismo número, mismas oleadas y mismo
// orden de carriles en los dos teléfonos.

import { ZOMBIES } from '../config.js'

// --- azar con semilla (mulberry32) --------------------------------------------
export function azarConSemilla (semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const semillaNueva = () => Math.floor(Math.random() * 2 ** 31)

// --- la arena -----------------------------------------------------------------
//
// Seis minutos de horda que va a más y, después, muerte súbita: los huéspedes
// salen el doble de duros cada minuto. Nadie aguanta eso mucho rato, que es la
// idea: la partida tiene que acabar.
// Cuatro minutos, no seis. Isidro lo probó y le pareció demasiado larga: a los
// seis minutos ya se había decidido todo y el final se arrastraba.
export const MUERTE_SUBITA = 4 * 60

// Qué va entrando y cuándo. Cada tipo tiene la oleada a partir de la que sale y
// su peso en el reparto; los caros entran tarde y en pocas unidades.
const REPERTORIO = [
  { tipo: 'walker', desde: 0, peso: 6 },
  { tipo: 'runner', desde: 1, peso: 3 },
  { tipo: 'armored', desde: 3, peso: 2 },
  { tipo: 'leaper', desde: 4, peso: 2 },
  { tipo: 'spitter', desde: 5, peso: 2 },
  { tipo: 'burrower', desde: 7, peso: 1.5 },
  { tipo: 'bloater', desde: 8, peso: 1.5 },
  { tipo: 'healer', desde: 10, peso: 1 },
  { tipo: 'tank', desde: 12, peso: 0.6 }
]

export function oleadasArena (semilla, cuantas = 80) {
  const azar = azarConSemilla(semilla ^ 0x5bd1e995)
  const oleadas = []
  for (let n = 0; n < cuantas; n++) {
    const abiertos = REPERTORIO.filter(r => n >= r.desde)
    const total = abiertos.reduce((s, r) => s + r.peso, 0)
    const cuantos = Math.round(5 + n * 1.6)
    const cuenta = {}
    for (let i = 0; i < cuantos; i++) {
      let x = azar() * total
      const r = abiertos.find(r => (x -= r.peso) < 0) ?? abiertos[0]
      cuenta[r.tipo] = (cuenta[r.tipo] ?? 0) + 1
    }
    oleadas.push({
      // La calma entre oleadas se acorta hasta quedarse en cuatro segundos.
      gap: n === 0 ? 7 : Math.max(4, 9 - n * 0.4),
      spawns: Object.entries(cuenta).map(([type, count]) => ({
        type, count, every: Math.max(0.45, 1.4 - n * 0.05)
      }))
    })
  }
  return oleadas
}

// --- mandar alienz al rival ---------------------------------------------------
//
// La biomasa sale de lo que matas y solo sirve para esto; las monedas siguen
// siendo para tu defensa. Así cada baja es una decisión: más defensa, o más
// presión sobre el otro. Cada tipo tiene su recarga para que no se pueda mandar
// una pared de Colosos de golpe en cuanto se ahorra.
export const ENVIOS = {
  walker: { precio: 20, recarga: 2 },
  runner: { precio: 30, recarga: 3 },
  leaper: { precio: 45, recarga: 5 },
  armored: { precio: 55, recarga: 5 },
  spitter: { precio: 60, recarga: 6 },
  burrower: { precio: 65, recarga: 7 },
  bloater: { precio: 70, recarga: 7 },
  healer: { precio: 80, recarga: 8 },
  tank: { precio: 200, recarga: 18 }
}
export const CLAVES_ENVIO = Object.keys(ENVIOS).filter(k => ZOMBIES[k])

// Biomasa por baja: algo más de la mitad de las monedas del bicho.
// Subida del 0,55 al 0,95 por muerte: Isidro se pasaba media partida sin poder
// mandar nada y el duelo se quedaba en defender cada uno lo suyo, que es
// justo lo que el modo NO tiene que ser.
export const biomasaDe = spec => Math.max(4, Math.round((spec.coins ?? 10) * 0.95))

// Lo que tarda en caer lo que te mandan: el aviso sale antes, con el carril.
// Bajado de 2,5 a 1,2: con dos segundos y medio te veías venir el bicho con
// toda la calma y perdía la gracia.
export const AVISO = 1.2

// --- rangos -------------------------------------------------------------------
//
// Dieciocho, como en Counter-Strike, pero con nombres de ejército. La insignia
// copia la idea de aquellas placas: un escudo de color por familia —plata,
// oro, acero, águila— con galones o estrellas que suben dentro de cada familia.
export const PUNTOS_INICIALES = 1000

export const RANGOS = [
  'Recluta I', 'Recluta II', 'Recluta III', 'Recluta de élite',
  'Soldado I', 'Soldado II', 'Soldado de élite',
  'Cabo', 'Cabo primero', 'Sargento', 'Sargento primero',
  'Brigada', 'Teniente', 'Capitán', 'Comandante',
  'Coronel', 'General', 'Mariscal'
]

// Cada familia, su color de placa. Plata para empezar, oro al medio, acero
// azulado para los mandos y el águila roja y dorada arriba del todo.
const FAMILIAS = [
  { hasta: 3, fondo: ['#d9dee4', '#8c96a3'], borde: '#5d6672', marca: '#2e343b' },
  { hasta: 6, fondo: ['#f4d77a', '#b98a1c'], borde: '#7a5a0e', marca: '#3b2b05' },
  { hasta: 10, fondo: ['#a9c4e8', '#3e6aa8'], borde: '#23446f', marca: '#f2f6fb' },
  { hasta: 14, fondo: ['#8fd3a8', '#1f7a4a'], borde: '#0f4a2b', marca: '#f4f1d0' },
  { hasta: 17, fondo: ['#f06a5a', '#8e1a14'], borde: '#f0c419', marca: '#f0c419' }
]

// Un tramo de rango cada 60 puntos, con el primero por debajo de los 760.
export function rangoDe (puntos = PUNTOS_INICIALES) {
  const i = Math.max(0, Math.min(RANGOS.length - 1, Math.floor((puntos - 700) / 60)))
  return { indice: i, nombre: RANGOS[i] }
}

let idInsignia = 0
export function insignia (indice, tam = 44) {
  const fam = FAMILIAS.find(f => indice <= f.hasta)
  const primero = indice === 0 ? 0 : FAMILIAS[FAMILIAS.indexOf(fam) - 1].hasta + 1
  const paso = indice - primero          // 0, 1, 2… dentro de la familia
  const id = `ins${++idInsignia}`
  let marcas = ''
  if (FAMILIAS.indexOf(fam) < 2) {
    // Galones: uno por paso, apilados como en la manga.
    for (let k = 0; k <= paso; k++) {
      const y = 30 - k * 6
      marcas += `<path d="M14 ${y} 24 ${y - 5} 34 ${y}" fill="none" stroke="${fam.marca}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  } else {
    // Estrellas en fila, como en las hombreras de oficial.
    const n = paso + 1
    for (let k = 0; k < n; k++) {
      const x = 24 + (k - (n - 1) / 2) * 8.5
      marcas += `<path transform="translate(${x} 24) scale(.62)" d="M0-7 2 -2.2 7.2-2.2 3-.9 4.6 5.2 0 2 -4.6 5.2 -3-.9 -7.2-2.2 -2-2.2Z" fill="${fam.marca}"/>`
    }
  }
  // Los dos últimos llevan alas: el águila de arriba del todo.
  const alas = indice >= 16
    ? `<path d="M6 16c-4 2-5 7-3 11 2-2 4-3 7-3M42 16c4 2 5 7 3 11-2-2-4-3-7-3" fill="${fam.borde}" opacity=".9"/>`
    : ''
  return `<svg class="insignia" viewBox="0 0 48 48" width="${tam}" height="${tam}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fam.fondo[0]}"/><stop offset="1" stop-color="${fam.fondo[1]}"/></linearGradient></defs>
    ${alas}
    <path d="M9 8h30l3 6v14c0 7-8 12-18 16C14 40 6 35 6 28V14z" fill="url(#${id})" stroke="${fam.borde}" stroke-width="2"/>
    <path d="M11 11h26" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/>
    ${marcas}
  </svg>`
}

// --- puntos (Elo) -------------------------------------------------------------
//
// Ganar a alguien más fuerte da mucho y a alguien más flojo, poco. Perder, lo
// contrario. Nunca menos de 5 puntos: una victoria siempre tiene que notarse.
export function cambioDePuntos (mios, suyos, gane) {
  const esperado = 1 / (1 + 10 ** ((suyos - mios) / 400))
  const d = Math.round(32 * ((gane ? 1 : 0) - esperado))
  return gane ? Math.max(5, d) : Math.min(-5, d)
}

// --- chat ---------------------------------------------------------------------
export const FRASES = ['¡Buena!', '¡Ahí va eso!', 'Uf, por poco', '¿Eso es todo?', 'Bien jugado', 'GG']
export const MAX_MENSAJE = 60
export const ESPERA_MENSAJE = 3

// Lista corta y a propósito: es un filtro para lo evidente, no un moderador.
// Lo que se le escape se denuncia y lo ve una persona.
const FEAS = [
  'puta', 'puto', 'putas', 'putos', 'mierda', 'cabron', 'cabrona', 'gilipollas', 'imbecil',
  'idiota', 'subnormal', 'retrasado', 'maricon', 'marica', 'zorra', 'polla',
  'follar', 'pendejo', 'pendeja', 'culero', 'mamon', 'capullo', 'estupido', 'estupida',
  'guarra', 'nazi', 'negrata', 'sudaca',
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut'
]
const sinTildes = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MOLDES = FEAS.map(p => new RegExp(`\\b${sinTildes(p).replace(/o/g, '[o0]').replace(/a/g, '[a4@]').replace(/e/g, '[e3]').replace(/i/g, '[i1!]')}\\b`, 'g'))

export function filtrar (texto) {
  let limpio = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_MENSAJE)
  // Se busca sobre la versión sin tildes y se tapa en la original: misma
  // longitud, así que las posiciones cuadran.
  const plano = sinTildes(limpio)
  const tapar = []
  for (const m of MOLDES) {
    m.lastIndex = 0
    let r
    while ((r = m.exec(plano))) tapar.push([r.index, r[0].length])
  }
  if (!tapar.length) return limpio
  const letras = limpio.split('')
  if (letras.length !== plano.length) return limpio.replace(/./g, '*')
  for (const [i, n] of tapar) for (let k = i; k < i + n; k++) letras[k] = '*'
  return letras.join('')
}
