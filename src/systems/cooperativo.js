// Cooperativo en vivo: dos jugadores defendiendo el mismo tramo.
//
// Reparto de papeles, que es la decisión que manda sobre todas las demás:
//
//   · El ANFITRIÓN juega la partida de siempre. Simula todo —horda, soldados,
//     dinero— y ocho veces por segundo manda una instantánea de cómo está el
//     campo.
//   · El INVITADO no simula nada. Pinta lo que le llega, interpolando entre la
//     última instantánea y la anterior para que no se vea a saltos, y lo único
//     que manda son sus órdenes: dónde coloca y qué compra.
//
// Con los dos simulando a la vez haría falta que las dos partidas dieran
// exactamente el mismo resultado fotograma a fotograma, y no lo dan: basta un
// `Math.random` —y aquí hay muchos, en la salida de cada huésped— para que a
// los diez segundos cada uno vea una partida distinta. Así no: hay una sola
// partida, la del anfitrión, y el invitado mira por una ventana.
//
// La instantánea va en listas de números y no en objetos con nombres: cada
// nombre repetido treinta veces, ocho veces por segundo, son kilobytes por
// minuto de datos del móvil del jugador para no decir nada.

import { ZOMBIES, SOLDIERS, DEFENSES } from '../config.js'

const CLAVES_Z = Object.keys(ZOMBIES)
const CLAVES_S = [...Object.keys(SOLDIERS), ...Object.keys(DEFENSES)]

// Ocho por segundo. Con menos se nota el tirón aunque se interpole; con más se
// gasta batería y datos para dibujar lo mismo.
export const POR_SEGUNDO = 8

export function empaquetar ({ zombies, soldiers, baseHp, oleada, total, dinero }) {
  return {
    t: Date.now(),
    b: Math.round(baseHp),
    o: [oleada, total],
    d: Math.round(dinero),
    z: zombies.map(z => [
      z.id,
      CLAVES_Z.indexOf(z.key),
      Math.round(z.mesh.position.x * 100),
      Math.round(z.mesh.position.z * 100),
      Math.round(z.hp / z.maxHp * 100),
      z.bajoTierra ? 1 : 0
    ]),
    s: soldiers.map(s => [
      s.id,
      CLAVES_S.indexOf(s.key),
      s.lane,
      s.row,
      Math.round(s.hp / s.maxHp * 100)
    ])
  }
}

export function desempaquetar (p) {
  return {
    t: p.t,
    baseHp: p.b,
    oleada: p.o?.[0] ?? 0,
    total: p.o?.[1] ?? 0,
    dinero: p.d ?? 0,
    zombies: (p.z ?? []).map(([id, k, x, z, vida, bajo]) => ({
      id, key: CLAVES_Z[k], x: x / 100, z: z / 100, vida: vida / 100, bajoTierra: !!bajo
    })),
    soldiers: (p.s ?? []).map(([id, k, lane, row, vida]) => ({
      id, key: CLAVES_S[k], lane, row, vida: vida / 100
    }))
  }
}

// Código de sala: mismo alfabeto que los retos, para que se lea igual por
// teléfono y no haya que explicar dos veces que no hay oes ni unos.
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const codigoDeSala = () =>
  Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')

// La sesión: envuelve un transporte y lleva la cuenta del ritmo de envío y de
// las dos últimas instantáneas, que es lo que hace falta para interpolar.
export function crearSesion (transporte, papel) {
  let ultimoEnvio = 0
  let previa = null
  let actual = null
  const oyentes = { estado: [], orden: [], jugadores: [] }

  transporte.escuchar('estado', bruto => {
    previa = actual
    actual = desempaquetar(bruto)
    for (const f of oyentes.estado) f(actual)
  })
  transporte.escuchar('orden', o => { for (const f of oyentes.orden) f(o) })
  transporte.escuchar('jugadores', j => { for (const f of oyentes.jugadores) f(j) })

  return {
    papel,
    transporte,
    esAnfitrion: papel === 'anfitrion',

    alEstado (fn) { oyentes.estado.push(fn) },
    alOrden (fn) { oyentes.orden.push(fn) },
    alJugadores (fn) { oyentes.jugadores.push(fn) },

    // El anfitrión manda; se le pone freno aquí y no en el bucle del juego.
    latir (partida) {
      const ahora = performance.now()
      if (ahora - ultimoEnvio < 1000 / POR_SEGUNDO) return
      ultimoEnvio = ahora
      transporte.mandar('estado', empaquetar(partida))
    },

    mandarOrden (orden) { transporte.mandar('orden', orden) },
    anunciar (jugadores) { transporte.mandar('jugadores', jugadores) },

    // Dónde estaría el campo AHORA, entre las dos últimas instantáneas. Sin
    // esto, el invitado ve la horda avanzar a ocho fotogramas por segundo.
    interpolado () {
      if (!actual) return null
      if (!previa) return actual
      const salto = Math.max(1, actual.t - previa.t)
      const k = Math.min(1.4, (Date.now() - actual.t) / salto)
      const antes = new Map(previa.zombies.map(z => [z.id, z]))
      return {
        ...actual,
        zombies: actual.zombies.map(z => {
          const v = antes.get(z.id)
          if (!v) return z
          return { ...z, x: v.x + (z.x - v.x) * (1 + k), z: v.z + (z.z - v.z) * (1 + k) }
        })
      }
    },

    cerrar () { transporte.cerrar() }
  }
}
