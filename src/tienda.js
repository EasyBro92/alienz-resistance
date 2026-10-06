// La tienda: lo que se compra con billetes y se queda para siempre.
//
// Soldados, defensas y apoyo se DESBLOQUEAN: una vez comprados aparecen en la
// armería de todas las partidas, donde se siguen pagando con las monedas de la
// partida para colocarlos. Lo que ya es tuyo se mejora para siempre desde su
// misma carta (daño y cadencia los soldados, vida las defensas, recarga el apoyo).
//
// Hay dos monedas y es fácil liarse, así que cada artículo dice las dos cosas:
// lo que cuesta desbloquearlo en billetes y lo que cuesta ponerlo en partida.

import { SOLDIERS, DEFENSES, STRIKES, UPGRADES } from './config.js'
import { buildDefensaMesh, buildSoldierMesh, sexoDe, cambiarSexo, dosSexos } from './assets.js'
import { figuraDeApoyo } from './systems/golpes.js'
import { crearBaraja } from './enemigos.js'
import { CAJAS, verCaja } from './cofre.js'
import { TINTE_APOYO } from './ui.js'
import {
  cargarCartera, PRECIOS, comprar, canjear, precioMejora, comprarMejora,
  MEJORAS, NIVEL_MAX, MONEDAS_POR_DOLAR, pistasMejora
} from './systems/cartera.js'

const PESTANAS = [
  { id: 'cajas', nombre: 'Cajas' },
  { id: 'soldados', nombre: 'Soldados' },
  { id: 'defensas', nombre: 'Defensas' },
  { id: 'apoyo', nombre: 'Apoyo' },
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

const hex = n => '#' + n.toString(16).padStart(6, '0')

// --- las fichas de Soldados, Defensas y Apoyo ---------------------------------------
// Isidro, 27/09: «fichas con la figura en 3D, como la baraja de Enemigos». Son
// la misma baraja (enemigos.js) con otra ficha: cada artículo con su figura
// girando, su papel, sus números en barras, lo que tiene de especial y, al pie,
// lo que cuesta y el botón de comprar. Los Soldados eran todavía un mosaico de
// retratos, y el 03/10 Isidro pidió «déjalos todos tipo tarjeta, como los
// misiles»: ahora son la misma baraja, con su figura de pie respirando.
const ROL = {
  archer: 'El más barato', rifle: 'Constante', shotgun: 'Cuerpo a cuerpo', sniper: 'Matajefes',
  flamer: 'Fuego', gunner: 'Frena la horda', misil: 'Atraviesa la fila', mortar: 'Contra grupos',
  capitan: 'Anima a los suyos',
  jill: 'Pistolera', claire: 'Granadas de fuego', ada: 'Ballesta', rebecca: 'Médica', sheva: 'Tiradora de pie',
  sandbags: 'Aguanta el golpe', spikes: 'Devuelve el mordisco', mines: 'Revienta', erizos: 'Frena sin parar',
  torreta: 'Dispara sola',
  grenade: 'A mano', airstrike: 'Desde el aire', napalm: 'Incendiario', artilleria: 'Un carril entero',
  dron: 'Contra jefes', misilGuiado: 'El golpe más gordo', campoMinas: 'Se queda esperando', botiquin: 'Cura',
  collector: 'Economía'
}
// Daño de una defensa en su número: por segundo la torreta, por mordisco la
// alambrada, de una vez la carga.
const danoDefensa = s => s.dispara ? s.damage * s.fireRate : s.revienta ? s.revienta.daño : (s.thorns ?? 0)
const textoDanoDefensa = s => s.dispara ? `${Math.round(s.damage * s.fireRate)}/s` : s.revienta ? String(s.revienta.daño) : s.thorns ? String(s.thorns) : '—'
const tope = (lista, f) => Math.max(...lista.map(f))

const danoPorSegundo = s => s.damage * (s.pellets ?? 1) * s.fireRate
const rotuloSexo = clave => `${sexoDe(clave) ? 'Chico' : 'Chica'} · toca para cambiar`

function fichaTienda (grupo) {
  const soldados = grupo === 'soldados'
  const specs = soldados ? SOLDIERS : grupo === 'defensas' ? DEFENSES : { ...STRIKES, ...UPGRADES }
  const todas = Object.values(specs)
  const maxVida = tope(Object.values(DEFENSES), s => s.hp)
  const maxDanoDef = tope(Object.values(DEFENSES), danoDefensa)
  const maxCoste = tope(todas, s => s.cost)
  const maxDano = tope(Object.values(STRIKES), s => s.damage ?? 0)
  const maxRadio = tope(Object.values(STRIKES), s => s.radius ?? 0)
  const maxRecarga = tope(Object.values(STRIKES), s => s.recarga ?? 0)
  const monedas = s => ['Monedas', s.cost, maxCoste, s.cost]
  return {
    specs,
    etiqueta: soldados ? 'Soldado' : grupo === 'defensas' ? 'Barrera' : 'Apoyo',
    tinte: (clave, s) => s.color ?? TINTE_APOYO[clave] ?? 0x8fbf5a,
    rol: clave => ROL[clave] ?? '',
    barras (clave, s) {
      if (soldados) {
        const lista = Object.values(SOLDIERS)
        const dps = danoPorSegundo(s)
        return [
          ['Daño/s', dps, tope(lista, danoPorSegundo), Math.round(dps)],
          ['Alcance', s.range, tope(lista, x => x.range), `${s.range} m`],
          ['Vida', s.hp, tope(lista, x => x.hp), s.hp],
          monedas(s)
        ]
      }
      if (grupo === 'defensas') {
        return [['Vida', s.hp, maxVida, s.hp], ['Daño', danoDefensa(s), maxDanoDef, textoDanoDefensa(s)], monedas(s)]
      }
      if (!STRIKES[clave]) return [monedas(s)]
      const efecto = s.cura != null ? ['Cura', s.cura, 100, `${s.cura} %`] : ['Daño', s.damage, maxDano, s.damage]
      const alcance = s.proyectiles ? ['Alcance', maxRadio, maxRadio, 'carril'] : s.cura != null ? ['Alcance', maxRadio, maxRadio, 'todos'] : ['Alcance', s.radius, maxRadio, `${String(s.radius).replace('.', ',')} m`]
      return [efecto, alcance, ['Recarga', s.recarga, maxRecarga, `${s.recarga} s`], monedas(s)]
    },
    texto: (clave, s) => s.blurb ?? '',
    dones (s) {
      const d = []
      if (s.clava) d.push('Deja la flecha clavada')
      if (s.asienta) d.push('Se asienta en el blanco')
      if (s.pellets) d.push(`${s.pellets} perdigones`)
      if (s.empuja) d.push('Los echa para atrás')
      if (s.buscaDuro) d.push('Apunta al más duro')
      if (s.suprime) d.push('Frena lo que tiene delante')
      if (s.estela) d.push('Daña la fila de detrás')
      if (s.buscaCorro) d.push('Apunta al corro')
      if (s.anima) d.push('Acelera a sus vecinos')
      if (s.sana) d.push('Cura a sus vecinos')
      if (soldados && s.splash) d.push(`Salpica ${String(s.splash).replace('.', ',')} m`)
      if (soldados && s.armorPierce >= 0.8) d.push('Atraviesa blindaje')
      if (s.blocker) d.push('Para al bicho')
      if (s.paso) d.push('Se cruza, pero frena')
      if (s.thorns) d.push('Devuelve cada mordisco')
      if (s.revienta) d.push(`Revienta en ${s.revienta.radio} m`)
      if (s.dispara) d.push('No recarga nunca')
      if (s.brasas) d.push(`Deja fuego ${s.brasas.dura} s`)
      if (s.proyectiles) d.push(`${s.proyectiles} obuses`)
      if (s.minas) d.push(`${s.minas} minas, ${s.dura} s`)
      if (s.cura != null) d.push('A todos a la vez')
      return d
    },
    icono: clave => document.getElementById('i-' + clave)
      ? `<svg class="carta-icono" aria-hidden="true"><use href="#i-${clave}"></use></svg>`
      : '',
    pie: true,
    crecer: true,
    giraEntero: !soldados,
    // De la cabeza a medio muslo: de cuerpo entero no se les ve la cara.
    plano: soldados ? 0.6 : 0,
    // Chico o chica: se cambia tocando la figura y se queda guardado, también
    // para las partidas (`sexoDe` en assets.js).
    insignia: clave => soldados && dosSexos(clave) ? `<span class="carta-sexo">${rotuloSexo(clave)}</span>` : '',
    alTocar (clave, carta) {
      if (!soldados || cambiarSexo(clave) == null) return false
      carta.ventana.querySelector('.carta-sexo').textContent = rotuloSexo(clave)
    },
    construir: (clave, s) => soldados ? buildSoldierMesh(clave, s) : grupo === 'defensas' ? buildDefensaMesh(clave, s) : figuraDeApoyo(clave),
    animar (figura, dt, t, s, alturaBase) {
      if (soldados) {
        // De cara, girando despacio a un lado y a otro como los huéspedes de la
        // baraja de Enemigos, y con el cuerpo vivo: respira y sostiene el arma.
        figura.rotation.y = Math.PI + Math.sin(t * 0.55) * 0.75
        figura.position.y = alturaBase
        const cuerpo = figura.userData.cuerpo
        if (cuerpo) {
          figura.updateMatrixWorld(true)
          // Todos los campos: uno sin poner (el encogido) es un NaN que deja la
          // figura sin medio cuerpo. De pie, aunque sea de los que se arrodillan.
          cuerpo.actualizar(dt, { andando: false, velocidad: 0, modo: null, forzarPie: true, apuntar: 0.25, objetivo: null, retroceso: 0, recarga: 0, encogido: 0, mirar: null, t })
        }
        return
      }
      // Da la vuelta entera, despacio: de una barrera importa también lo que ve
      // el bicho, que es el otro lado.
      figura.rotation.y = t * 0.55
      figura.position.y = alturaBase
      const ud = figura.userData
      if (ud.cabezal) ud.cabezal.rotation.y = Math.sin(t * 1.3) * 0.6
      if (ud.rotores) for (const r of ud.rotores) r.rotation.y += dt * 40
      if (ud.luces) for (const l of ud.luces) l.visible = (t % 1) < 0.35
    }
  }
}
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

  function pieCompra (clave, c) {
    const tuya = c.desbloqueadas.includes(clave)
    const precio = PRECIOS[clave]
    const puede = !tuya && precio != null && c.billetes >= precio
    // Cuando no llega el dinero, el botón no se limita a estar apagado: dice
    // cuánto falta. Es la diferencia entre "no puedo" y "me faltan 30".
    const falta = !tuya && precio != null ? precio - c.billetes : 0
    // Lo que no tiene precio y no es de serie es un premio del cofre: se enseña
    // bloqueado y sin botón, porque no hay forma de pagarlo.
    const premio = !tuya && precio == null
    return premio
      ? '<span class="articulo-premio">Solo en la caja alienígena</span>'
      : tuya
      ? `<span class="articulo-tuyo">${precio == null ? 'De serie' : 'Tuyo'}</span>`
      : `<button type="button" class="articulo-comprar" data-comprar="${clave}" ${puede ? '' : 'disabled'}>${billete}${precio}</button>
         ${falta > 0 ? `<span class="articulo-falta">Te faltan ${billete}${falta}</span>` : ''}`
  }

  // El número de partida de cada mejora: daño por disparo (o por mordisco en la
  // alambrada, o del reventón en la carga), disparos por segundo o vida.
  const valorBase = (spec, tipo) => tipo === 'vida' ? spec.hp
    : tipo === 'cadencia' ? spec.fireRate
      : tipo === 'recarga' ? spec.recarga
        : (spec.damage ?? spec.thorns ?? spec.revienta?.daño ?? spec.cura ?? 0)

  // Las mejoras de un artículo, una fila por cosa que se le puede subir. Van AL
  // PIE DE SU CARTA (Isidro, 05/10: «que las mejoras estén dentro de la tarjeta
  // de cada personaje»): antes eran una pestaña aparte con una lista, y había
  // que buscar ahí al soldado que se acababa de mirar en la baraja.
  function pistas (clave, spec, c) {
    return pistasMejora(clave).map(tipo => [tipo, MEJORAS[tipo]]).map(([tipo, m]) => {
      const nivel = c.mejoras[clave]?.[tipo] ?? 0
      const precio = precioMejora(clave, tipo)
      const pips = Array.from({ length: NIVEL_MAX }, (_, i) => `<i class="${i < nivel ? 'on' : ''}"></i>`).join('')
      const boton = precio == null
        ? '<span class="mejora-max">Máximo</span>'
        : `<button type="button" class="articulo-comprar" data-mejora="${clave}:${tipo}" ${c.billetes >= precio ? '' : 'disabled'}>${billete}${precio}</button>`
      // Lo que se gana, en el número que importa: daño por disparo y disparos
      // por segundo. Un "+15%" no dice nada; "9,5 → 10,9" sí.
      const base = valorBase(spec, tipo)
      const val = n => (base * (1 + n * m.paso)).toFixed(base < 10 ? 1 : 0).replace('.', ',')
      const salto = precio == null
        ? `<span class="mejora-salto">${val(nivel)}</span>`
        : `<span class="mejora-salto">${val(nivel)} <i>→</i> <b>${val(nivel + 1)}</b></span>`
      return `
        <div class="mejora-pista">
          <span class="mejora-nombre">${tipo === 'dano' && spec.cura ? 'Curación' : m.nombre}</span>
          ${salto}
          <span class="pips">${pips}</span>
          ${boton}
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

  // Una baraja por pestaña, hecha la primera vez que se abre y guardada: al
  // comprar se repintan solo los pies, y la carta que estabas mirando sigue ahí.
  const barajas = {}
  function baraja (grupo) {
    if (barajas[grupo]) return barajas[grupo]
    const contenedor = document.createElement('div')
    contenedor.className = 'baraja baraja-tienda'
    elLista.replaceChildren(contenedor)
    const ficha = fichaTienda(grupo)
    const api = crearBaraja({ contenedor, pie: null, capa, claves: Object.keys(ficha.specs), ficha })
    const caras = retratos?.()
    if (caras) api.ponerCaras(caras)
    barajas[grupo] = { contenedor, api, ficha }
    return barajas[grupo]
  }

  // Las cajas del botín (30/09): se tocan, se ven en grande y se abren.
  function cajas (c) {
    const FOTOS = `${import.meta.env.BASE_URL}premios/`
    const fichas = Object.entries(CAJAS).map(([tipo, def]) => {
      const n = c.cajas[tipo]
      return `
        <button type="button" class="caja-ficha r-${def.rareza}${n ? '' : ' vacia'}" data-caja="${tipo}">
          <img src="${FOTOS}caja-${tipo}.webp" alt="">
          <span class="caja-ficha-nombre">${def.nombre}</span>
          <span class="caja-ficha-cuantas">${n ? `Tienes ${n}` : 'No tienes ninguna'}</span>
        </button>`
    }).join('')
    return `<div class="cajas-lista">${fichas}</div>
      <p class="tienda-pie">Las cajas salen muy de vez en cuando en el botín de las victorias: la militar, más o menos una de cada cien; la alienígena, muchísimo menos. No se compran.</p>`
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
              role="tab" aria-selected="${p.id === pestana}">${p.nombre}${p.id === 'cajas' && c.cajas.militar + c.cajas.alien ? ` <span class="pestana-num">${c.cajas.militar + c.cajas.alien}</span>` : ''}</button>`).join('')

    elLista.classList.toggle('lista-mejoras', pestana === 'comparar')
    const enBaraja = pestana === 'soldados' || pestana === 'defensas' || pestana === 'apoyo'
    elLista.classList.toggle('lista-baraja', enBaraja)
    if (enBaraja) {
      const b = baraja(pestana)
      if (b.contenedor.parentNode !== elLista) elLista.replaceChildren(b.contenedor)
      b.api.ponerPies(clave => {
        const s = b.ficha.specs[clave]
        // Lo que ya es tuyo enseña sus mejoras donde antes solo ponía «Tuyo»;
        // lo que no, el precio de desbloquearlo. Lo que no se mejora (el
        // Recolector) se queda con su rótulo.
        const filas = c.desbloqueadas.includes(clave) ? pistas(clave, s, c) : ''
        return `<small>En partida: ${s.cost} monedas${s.recarga ? ` · recarga ${s.recarga} s` : ''}</small>${filas ? `<div class="carta-mejoras">${filas}</div>` : pieCompra(clave, c)}`
      })
      return
    }
    elLista.innerHTML = pestana === 'cajas' ? cajas(c) : comparar(c)
  }

  elPestanas.addEventListener('click', e => {
    const b = e.target.closest('[data-pestana]')
    if (!b) return
    pestana = b.dataset.pestana
    pintar()
  })

  elLista.addEventListener('click', e => {
    const caja = e.target.closest('[data-caja]')
    if (caja) {
      audio?.place?.()
      verCaja(caja.dataset.caja, { audio, retratos: typeof retratos === 'function' ? retratos() : retratos, alCerrar: () => { cambio = true; pintar() } })
      return
    }
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
