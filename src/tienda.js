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
  MEJORAS, NIVEL_MAX, MONEDAS_POR_DOLAR
} from './systems/cartera.js'

const PESTANAS = [
  { id: 'soldados', nombre: 'Soldados' },
  { id: 'defensas', nombre: 'Defensas' },
  { id: 'apoyo', nombre: 'Apoyo' },
  { id: 'mejoras', nombre: 'Mejoras' },
  { id: 'comparar', nombre: 'Comparar' }
]

// Las columnas de la tabla de comparar. `dpm` no está en la ficha de nadie: es
// daño por segundo, que es lo que de verdad se compara entre dos soldados y lo
// que no se puede calcular de cabeza mirando dos fichas distintas.
const COLUMNAS = [
  // Cuatro columnas y no seis: en un móvil, la séptima se sale de la pantalla y
  // golpe y cadencia ya están dentro de daño por segundo.
  { id: 'dps', nombre: 'Daño/s', valor: s => s.damage * (s.pellets ?? 1) * s.fireRate },
  { id: 'range', nombre: 'Alcance', valor: s => s.range },
  { id: 'hp', nombre: 'Vida', valor: s => s.hp },
  { id: 'cost', nombre: 'Monedas', valor: s => s.cost, bajoMejor: true }
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
    // Cuando no llega el dinero, el botón no se limita a estar apagado: dice
    // cuánto falta. Es la diferencia entre "no puedo" y "me faltan 30".
    const falta = !tuya && precio != null ? precio - c.billetes : 0
    // Lo que no tiene precio y no es de serie es un premio del cofre: se enseña
    // bloqueado y sin botón, porque no hay forma de pagarlo.
    const premio = !tuya && precio == null
    const pie = premio
      ? '<span class="articulo-premio">Solo en el cofre</span>'
      : tuya
      ? `<span class="articulo-tuyo">${precio == null ? 'De serie' : 'Tuyo'}</span>`
      : `<button type="button" class="articulo-comprar" data-comprar="${clave}" ${puede ? '' : 'disabled'}>${billete}${precio}</button>
         ${falta > 0 ? `<span class="articulo-falta">Te faltan ${billete}${falta}</span>` : ''}`
    return `
      <div class="articulo${tuya ? ' propio' : ''}${premio ? ' bloqueado' : ''}" style="--u-tint:${tinte}">
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
        // Lo que se gana, en el número que importa: daño por disparo y disparos
        // por segundo. Un "+15%" no dice nada; "9,5 → 10,9" sí.
        const base = tipo === 'dano' ? spec.damage : spec.fireRate
        const val = n => (base * (1 + n * m.paso)).toFixed(base < 10 ? 1 : 0).replace('.', ',')
        const salto = precio == null
          ? `<span class="mejora-salto">${val(nivel)}</span>`
          : `<span class="mejora-salto">${val(nivel)} <i>→</i> <b>${val(nivel + 1)}</b></span>`
        return `
          <div class="mejora-pista">
            <span class="mejora-nombre">${m.nombre}</span>
            ${salto}
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

  // La tabla de comparar. Cada columna pinta una barra sobre el mejor de todos,
  // que es lo que deja ver de un vistazo quién pega más y quién cuesta menos,
  // sin leer seis fichas seguidas. Los que aún no son tuyos salen en gris.
  function comparar (c) {
    const filas = Object.entries(SOLDIERS)
    const topes = Object.fromEntries(COLUMNAS.map(col =>
      [col.id, Math.max(...filas.map(([, s]) => col.valor(s)))]))
    const num = v => v >= 100 ? Math.round(v) : v.toFixed(1).replace('.0', '').replace('.', ',')
    return `
      <table class="comparar">
        <thead>
          <tr><th>Soldado</th>${COLUMNAS.map(col => `<th>${col.nombre}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${filas.map(([clave, s]) => `
            <tr class="${c.desbloqueadas.includes(clave) ? 'tuyo' : 'ajeno'}" style="--u-tint:${hex(s.color)}">
              <th scope="row"><i class="comparar-color"></i>${s.name}</th>
              ${COLUMNAS.map(col => {
                const v = col.valor(s)
                const parte = Math.max(0.06, v / topes[col.id])
                return `<td><span class="comparar-barra" style="--parte:${(parte * 100).toFixed(0)}%"></span><em>${num(v)}</em></td>`
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="tienda-nota">Daño/s es lo que hace en un segundo disparando sin parar. Monedas es lo que cuesta ponerlo en el campo.</p>`
  }

  function pintar () {
    const c = cargarCartera()
    elBilletes.textContent = c.billetes
    elMonedas.textContent = c.monedas

    const cambiables = Math.floor(c.monedas / MONEDAS_POR_DOLAR)
    elCanjear.textContent = cambiables
      ? `Cambiar ${cambiables * MONEDAS_POR_DOLAR} monedas por ${cambiables} billete${cambiables === 1 ? '' : 's'}`
      : `Cada ${MONEDAS_POR_DOLAR} monedas guardadas son un billete`
    elCanjear.disabled = !cambiables

    elPestanas.innerHTML = PESTANAS.map(p => `
      <button type="button" class="pestana${p.id === pestana ? ' activa' : ''}" data-pestana="${p.id}"
              role="tab" aria-selected="${p.id === pestana}">${p.nombre}</button>`).join('')

    elLista.classList.toggle('lista-mejoras', pestana === 'mejoras' || pestana === 'comparar')
    elLista.innerHTML = pestana === 'mejoras'
      ? mejoras(c)
      : pestana === 'comparar'
        ? comparar(c)
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
