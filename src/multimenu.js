import { rangoDe, insignia, PUNTOS_INICIALES } from './systems/duelo.js'

// El menú del multijugador: tu ficha arriba y la portada de cada modo.
//
// Isidro: «mejora el aspecto visual del multijugador». Entrabas a cuatro fichas
// grises con un icono pequeño y ni siquiera sabías con qué nombre juegas. Ahora
// lo primero que ves es dónde estás —insignia, rango, puntos, racha contra la
// máquina y partidas ganadas— y cada modo tiene su color y su portada.
//
// Las portadas NO son imágenes traídas de fuera: son los retratos que el juego
// ya se hace de sus propias figuras al arrancar (ver `portraits.js`), puestos
// sobre un degradado. Cero descarga, cero memoria nueva, y si mañana cambia un
// soldado cambia la portada del modo con él. Es la misma idea que la cámara del
// rival: fotografiar lo que ya tenemos en vez de dibujar aparte algo que se
// desincroniza a la primera.

const $ = id => document.getElementById(id)

// Qué figura sale en cada modo. Dos enfrentadas para el duelo (que es de lo que
// va), dos juntas para el cooperativo, y un huésped para los retos, que es lo
// que montas cuando creas uno.
const ARTE = {
  duelo: { soldados: ['rifle', 'shotgun'], pose: 'enfrentados' },
  coop: { soldados: ['gunner', 'sniper'], pose: 'juntos' },
  retos: { alienz: ['tank'], pose: 'centro' },
  ranking: { podio: true }
}

export function pintarVinetas ({ retratos, amenazas }) {
  for (const hueco of document.querySelectorAll('.multi-vineta')) {
    if (hueco.dataset.puesto) continue
    const arte = ARTE[hueco.dataset.arte]
    if (!arte) continue
    if (arte.podio) {
      // El ranking no tiene figura: tiene un podio de tres escalones.
      hueco.innerHTML = '<span class="podio"><i style="height:16px"></i><i style="height:26px"></i><i style="height:11px"></i></span>'
      hueco.dataset.puesto = '1'
      continue
    }
    const fuente = arte.soldados ? retratos : amenazas
    const claves = arte.soldados ?? arte.alienz
    const imgs = claves.map(k => fuente?.get?.(k)).filter(Boolean)
    if (imgs.length < claves.length) continue        // todavía no están hechos
    hueco.innerHTML = arte.pose === 'centro'
      ? `<img class="centro" src="${imgs[0]}" alt="">`
      : `<img class="izq" src="${imgs[0]}" alt=""><img class="der" src="${imgs[1]}" alt="">`
    hueco.dataset.puesto = '1'
  }
}

// Tu ficha. Se pinta con lo que hay a mano (alias, racha contra la máquina) y
// los puntos de rango se rellenan después si hay cuenta: pedirlos primero
// dejaría la ficha en blanco mientras responde el servidor.
export async function pintarMiFicha ({ cuenta, escapar }) {
  const caja = $('multi-yo')
  if (!caja) return

  let alias = 'Invitado'
  try {
    const { aliasActual } = await import('./systems/marcadores.js')
    if (cuenta.usuario) alias = aliasActual(cuenta.usuario)
  } catch {}

  const { marcaMaquina } = await import('./systems/bot.js')
  const m = marcaMaquina()

  const pintar = (puntos, conCuenta) => {
    const r = rangoDe(puntos)
    caja.innerHTML = `
      ${insignia(r.indice, 46)}
      <span class="multi-yo-datos">
        <span class="multi-yo-alias">${escapar(alias)}</span>
        <span class="multi-yo-rango">${conCuenta ? `${r.nombre} · ${puntos} puntos` : 'Sin rango · juegas como invitado'}</span>
        <span class="multi-yo-cifras">
          <span><b>${m.ganadas}</b> a la máquina</span>
          <span>racha <b>${m.racha}</b></span>
          <span>mejor <b>${m.mejorRacha}</b></span>
        </span>
      </span>`
  }

  pintar(PUNTOS_INICIALES, false)
  if (!cuenta.usuario) return
  try {
    const { cargarFirebase } = await import('./systems/cuenta.js')
    const { fs, db } = await cargarFirebase()
    const ficha = (await fs.getDoc(fs.doc(db, 'duelo', cuenta.usuario.uid))).data()
    pintar(ficha?.puntos ?? PUNTOS_INICIALES, true)
  } catch (e) {
    console.warn('Sin ficha de duelo:', e)
    pintar(PUNTOS_INICIALES, true)
  }
}
