// La tienda: lo que se compra con billetes y se queda para siempre.
//
// Cuatro pestañas. Soldados, defensas y apoyo se DESBLOQUEAN: una vez comprados
// aparecen en la armería de todas las partidas, donde se siguen pagando con las
// monedas de la partida para colocarlos. Mejoras sube para siempre el daño y la
// cadencia de cada soldado que ya tengas.
//
// Hay dos monedas y es fácil liarse, así que cada artículo dice las dos cosas:
// lo que cuesta desbloquearlo en billetes y lo que cuesta ponerlo en partida.

import { SOLDIERS, DEFENSES, STRIKES, UPGRADES } from './config.js'
import {
  cargarCartera, PRECIOS, comprar, canjear, precioMejora, comprarMejora,
  MEJORAS, NIVEL_MAX, MONEDAS_POR_BILLETE
} from './systems/cartera.js'

const PESTANAS = [
  { id: 'soldados', nombre: 'Soldados' },
  { id: 'defensas', nombre: 'Defensas' },
  { id: 'apoyo', nombre: 'Apoyo' },
  { id: 'mejoras', nombre: 'Mejoras' }
]

const GRUPOS = {
  soldados: [SOLDIERS],
  defensas: [DEFENSES],
  apoyo: [STRIKES, UPGRADES]
}

const hex = n => '#' + n.toString(16).padStart(6, '0')
const billete = '<svg aria-hidden="true"><use href="#i-billete"></use></svg>'

export function crearTienda ({ audio, retratos, alCerrar }) {
  const capa = document.getElementById('tienda-capa')
  const elPestanas = document.getElementById('tienda-pestanas')
  const elLista = document.getElementById('tienda-lista')
  const elBilletes = document.getElementById('tienda-billetes')
  const elMonedas = document.getElementById('tienda-monedas')
  const elCanjear = document.getElementById('tienda-canjear')

  let pestana = 'soldados'
  let origen = 'portada'
  // Si se ha desbloqueado algo, la armería de la partida está desfasada: se
  // monta al arrancar con lo que había abierto.
  let cambio = false

  // La cara del artículo: el retrato de la figura si ya está hecho, el icono si
  // no, y nada si tampoco hay icono.
  function cara (clave) {
    const url = retratos?.()?.get?.(clave)
    if (url) return `<img src="${url}" alt="">`
    if (document.getElementById('i-' + clave)) return `<svg aria-hidden="true"><use href="#i-${clave}"></use></svg>`
    return ''
  }

  function articulo (clave, spec, c) {
    const tuya = c.desbloqueadas.includes(clave)
    const precio = PRECIOS[clave]
    const puede = !tuya && precio != null && c.billetes >= precio
    const tinte = spec.color != null ? hex(spec.color) : 'var(--verde-texto)'
    const pie = tuya
      ? `<span class="articulo-tuyo">${precio == null ? 'De serie' : 'Tuyo'}</span>`
      : `<button type="button" class="articulo-comprar" data-comprar="${clave}" ${puede ? '' : 'disabled'}>${billete}${precio}</button>`
    return `
      <div class="articulo${tuya ? ' propio' : ''}" style="--u-tint:${tinte}">
        <div class="articulo-cara">${cara(clave)}</div>
        <b>${spec.name}</b>
        <p>${spec.blurb ?? ''}</p>
        <small>En partida: ${spec.cost} monedas</small>
        ${pie}
      </div>`
  }

  function mejoras (c) {
    const mias = Object.entries(SOLDIERS).filter(([k]) => c.desbloqueadas.includes(k))
    if (!mias.length) return '<p class="tienda-vacia">Desbloquea soldados para poder mejorarlos.</p>'
    return mias.map(([clave, spec]) => {
      const pistas = Object.entries(MEJORAS).map(([tipo, m]) => {
        const nivel = c.mejoras[clave]?.[tipo] ?? 0
        const precio = precioMejora(clave, tipo)
        const pips = Array.from({ length: NIVEL_MAX }, (_, i) => `<i class="${i < nivel ? 'on' : ''}"></i>`).join('')
        const boton = precio == null
          ? '<span class="mejora-max">Máximo</span>'
          : `<button type="button" class="articulo-comprar" data-mejora="${clave}:${tipo}" ${c.billetes >= precio ? '' : 'disabled'}>${billete}${precio}</button>`
        return `
          <div class="mejora-pista">
            <span class="mejora-nombre">${m.nombre} <em>+${Math.round(nivel * m.paso * 100)}%</em></span>
            <span class="pips">${pips}</span>
            ${boton}
          </div>`
      }).join('')
      return `
        <div class="mejora" style="--u-tint:${hex(spec.color)}">
          <div class="mejora-cabeza">
            <div class="articulo-cara mini">${cara(clave)}</div>
            <b>${spec.name}</b>
          </div>
          ${pistas}
        </div>`
    }).join('')
  }

  function pintar () {
    const c = cargarCartera()
    elBilletes.textContent = c.billetes
    elMonedas.textContent = c.monedas

    const cambiables = Math.floor(c.monedas / MONEDAS_POR_BILLETE)
    elCanjear.textContent = cambiables
      ? `Cambiar ${cambiables * MONEDAS_POR_BILLETE} monedas por ${cambiables} billete${cambiables === 1 ? '' : 's'}`
      : `Cada ${MONEDAS_POR_BILLETE} monedas guardadas son un billete`
    elCanjear.disabled = !cambiables

    elPestanas.innerHTML = PESTANAS.map(p => `
      <button type="button" class="pestana${p.id === pestana ? ' activa' : ''}" data-pestana="${p.id}"
              role="tab" aria-selected="${p.id === pestana}">${p.nombre}</button>`).join('')

    elLista.classList.toggle('lista-mejoras', pestana === 'mejoras')
    elLista.innerHTML = pestana === 'mejoras'
      ? mejoras(c)
      : GRUPOS[pestana].flatMap(g => Object.entries(g)).map(([k, s]) => articulo(k, s, c)).join('')
  }

  elPestanas.addEventListener('click', e => {
    const b = e.target.closest('[data-pestana]')
    if (!b) return
    pestana = b.dataset.pestana
    pintar()
  })

  elLista.addEventListener('click', e => {
    const compra = e.target.closest('[data-comprar]')
    if (compra) {
      if (comprar(compra.dataset.comprar)) {
        cambio = true
        audio?.desbloqueo?.()
        pintar()
      } else {
        audio?.denied?.()
      }
      return
    }
    const mejora = e.target.closest('[data-mejora]')
    if (mejora) {
      const [clave, tipo] = mejora.dataset.mejora.split(':')
      if (comprarMejora(clave, tipo)) {
        audio?.place?.()
        pintar()
      } else {
        audio?.denied?.()
      }
    }
  })

  elCanjear.addEventListener('click', () => {
    if (canjear().billetes) {
      audio?.coin?.()
      pintar()
    }
  })

  document.getElementById('tienda-volver').addEventListener('click', () => {
    capa.classList.add('hidden')
    alCerrar?.(origen, cambio)
  })

  return {
    abrir (desde = 'portada') {
      origen = desde
      cambio = false
      pintar()
      capa.classList.remove('hidden')
    }
  }
}
