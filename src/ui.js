import { SOLDIERS, DEFENSES, STRIKES, UPGRADES } from './config.js'
import { upgradeCost } from './entities/soldier.js'
import { cartasAbiertas } from './systems/progreso.js'

// Matrícula de cada ficha. Es decorado de ficción — parte de leerse como el
// inventario de un puesto de contención y no como una lista de la compra.
const SERIAL = {
  archer: 'A-01', rifle: 'R-02', shotgun: 'S-03', sniper: 'T-04',
  flamer: 'F-05', gunner: 'M-06', mortar: 'X-07',
  sandbags: 'B-01', spikes: 'B-02',
  grenade: 'G-01', airstrike: 'G-02', collector: 'C-00'
}

// La chapa manda un nombre corto porque el largo no entra en 76 px y se cortaba
// con puntos suspensivos: AMETRALLAD… y SACOS TERR… hay que descifrarlos. El
// nombre completo sigue vivo en la franja de estado y en la etiqueta hablada.
const CORTO = { flamer: 'Fuego', gunner: 'Metralla', sandbags: 'Sacos', airstrike: 'Aéreo' }

// Los apoyos no tienen figura en el tablero, así que toman el color de su propio
// efecto: el naranja de la explosión, el azul del cristal de la óptica y el oro
// exacto de la moneda.
const TINTE_APOYO = { grenade: 0xffb03a, airstrike: 0x7fd8ff, collector: 0xffcf45 }

const GRUPO = { soldier: 'Tropa', defense: 'Barreras', strike: 'Apoyo', upgrade: 'Mando' }
const PISTA = {
  soldier: 'toca un carril',
  defense: 'toca un carril',
  strike: 'toca dónde debe caer',
  upgrade: 'toca otra vez para confirmar'
}

const hex = n => '#' + n.toString(16).padStart(6, '0')
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`

// Catálogo de la armería: todo lo comprable en un único sitio, para que añadir
// cosas nuevas sea una línea aquí y nada más.
//
// Solo entra lo que el jugador tenga abierto. Lo cerrado no se pinta en gris:
// se queda fuera del carril. Una fila de cartas apagadas que no puedes usar
// ocupa el sitio de las que sí, y en una barra de móvil el sitio es todo.
export function buildCatalog (abiertas = cartasAbiertas()) {
  const items = []
  const meter = (obj, type) => {
    for (const [key, spec] of Object.entries(obj)) {
      if (!abiertas.has(key)) continue
      items.push({ key, type, spec, cost: spec.cost })
    }
  }
  meter(SOLDIERS, 'soldier')
  meter(DEFENSES, 'defense')
  meter(STRIKES, 'strike')
  meter(UPGRADES, 'upgrade')
  return items
}

export function createUI ({ onSelect, onUpgrade, onMove, onDeselect }) {
  const el = {
    coins: document.getElementById('coins'),
    coinValue: document.getElementById('coin-value'),
    waveLabel: document.getElementById('wave-label'),
    baseFill: document.getElementById('base-fill'),
    banner: document.getElementById('banner'),
    armory: document.getElementById('armory'),
    armed: document.getElementById('armed'),
    armedName: document.getElementById('armed-name'),
    armedHint: document.getElementById('armed-hint'),
    armedBlurb: document.getElementById('armed-blurb'),
    inspector: document.getElementById('inspector'),
    inspectorTitle: document.getElementById('inspector-title'),
    actUpgrade: document.getElementById('act-upgrade'),
    actMove: document.getElementById('act-move'),
    actClose: document.getElementById('act-close'),
    overlay: document.getElementById('overlay'),
    mute: document.getElementById('mute')
  }

  const catalog = buildCatalog()
  const cards = new Map()
  let selected = null
  let inspected = null

  let purse = 0
  let prevType = null

  catalog.forEach((item, i) => {
    // Separador etiquetado al cambiar de familia. El catálogo ya sale ordenado
    // por tipo, así que basta con mirar cuándo cambia.
    // Solo ENTRE grupos: uno delante del primero se comería el borde izquierdo,
    // donde además la máscara del carril lo corta.
    if (prevType !== null && item.type !== prevType) {
      const sep = document.createElement('span')
      sep.className = 'armory-sep'
      sep.dataset.label = GRUPO[item.type] ?? ''
      el.armory.appendChild(sep)
    }
    prevType = item.type

    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'card'

    // El color de la carta es el color REAL de la figura que compra. Así el
    // jugador aprende una sola vez que azul es el Fusilero y ya lee el tablero
    // de un vistazo; antes eran dos vocabularios distintos, el emoji y el muñeco.
    const tinte = item.spec.color ?? TINTE_APOYO[item.key] ?? 0x8fbf5a
    const tinta = item.spec.accent ?? tinte
    card.style.setProperty('--u-tint', hex(tinte))
    card.style.setProperty('--u-ink', hex(tinta))
    card.style.setProperty('--u-glow', rgba(tinte, 0.42))
    card.style.setProperty('--i', i)
    card.dataset.kind = item.type
    card.dataset.key = item.key
    card.dataset.label = item.spec.name
    card.setAttribute('aria-pressed', 'false')

    // El retrato (la figura real, fotografiada del modelo) se inyecta luego con
    // setPortrait: hasta que llega, el icono del arma hace de reserva.
    card.innerHTML = `
      <span class="card-rail"></span>
      <span class="card-serial">${SERIAL[item.key] ?? '--'}</span>
      <span class="card-art">
        <img class="card-face" alt="" hidden>
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${item.key}"/></svg>
      </span>
      <span class="card-name">${CORTO[item.key] ?? item.spec.name}</span>
      <span class="card-cost"><i class="coin-dot xs"></i>${item.cost}</span>
      <span class="card-meter"></span>`

    card.addEventListener('click', () => {
      // Sin biomasa no se selecciona: antes se podía elegir, tocar el carril y
      // solo entonces oír el rechazo, lejos de donde se había pulsado.
      if (purse < item.cost) {
        card.classList.remove('nope')
        void card.offsetWidth
        card.classList.add('nope')
        return
      }
      selected = selected?.key === item.key ? null : item
      refreshSelection()
      // El navegador rechaza vibrar si aún no ha habido un toque real, y cada
      // rechazo es un error en consola: en una sesión de pruebas automáticas se
      // acumulaban cientos y tapaban los errores que sí importan.
      try { navigator.vibrate?.(selected ? 9 : 4) } catch {}
      onSelect(selected)
    })

    el.armory.appendChild(card)
    cards.set(item.key, card)
  })

  function refreshSelection () {
    for (const [key, card] of cards) {
      const on = selected?.key === key
      card.classList.toggle('selected', on)
      card.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
    // La franja de estado se pinta con el color de lo que llevas en la mano, y
    // por fin muestra el texto de la ficha: `card.title` no se ve jamás en un móvil.
    el.armed.hidden = !selected
    if (selected) {
      const tinte = selected.spec.color ?? TINTE_APOYO[selected.key] ?? 0x8fbf5a
      el.armed.style.setProperty('--u-tint', hex(tinte))
      el.armedName.textContent = selected.spec.name.toUpperCase()
      el.armedHint.textContent = PISTA[selected.type] ?? ''
      el.armedBlurb.textContent = selected.spec.blurb ?? ''
    }
  }

  el.actClose.addEventListener('click', () => api.closeInspector())
  el.actUpgrade.addEventListener('click', () => inspected && onUpgrade(inspected))
  el.actMove.addEventListener('click', () => { if (inspected) { onMove(inspected); api.closeInspector(true) } })

  const api = {
    el,
    catalog,

    setCoins (value) {
      purse = value
      el.coinValue.textContent = value
      el.coins.classList.remove('flash')
      void el.coins.offsetWidth
      el.coins.classList.add('flash')
      for (const item of catalog) {
        const card = cards.get(item.key)
        if (!card) continue
        const corto = value < item.cost
        card.dataset.state = corto ? 'broke' : 'ready'
        card.setAttribute('aria-disabled', corto ? 'true' : 'false')
        card.setAttribute('aria-label',
          `${item.spec.name}, ${item.cost} de biomasa, ${corto ? 'sin biomasa suficiente' : 'disponible'}`)
        // Cuánto falta, no solo "no puedes": una barrita que se llena deja ver
        // qué carta está a punto de desbloquearse sin hacer restas mentales.
        card.style.setProperty('--afford', Math.min(1, value / item.cost).toFixed(3))
      }
      if (inspected) api.refreshInspector(inspected, value)
    },

    // Cuando llega el retrato, el arma se encoge a una insignia en la esquina:
    // sigue diciendo el rol, pero manda la figura.
    setPortraits (retratos) {
      for (const [clave, url] of retratos) {
        const card = cards.get(clave)
        if (!card) continue
        const img = card.querySelector('.card-face')
        img.src = url
        img.hidden = false
        img.alt = card.dataset.label
        card.classList.add('has-face')
      }
    },

    setWave (text) { el.waveLabel.textContent = text },

    setBase (ratio) {
      el.baseFill.style.width = `${Math.max(0, ratio) * 100}%`
      el.baseFill.style.background = ratio > 0.5
        ? 'linear-gradient(90deg,#4ad07a,#8ee87f)'
        : ratio > 0.25
          ? 'linear-gradient(90deg,#e0a83c,#f3cf62)'
          : 'linear-gradient(90deg,#c53a2c,#e8523f)'
    },

    banner (text) {
      el.banner.textContent = text
      el.banner.classList.remove('show')
      void el.banner.offsetWidth
      el.banner.classList.add('show')
    },

    clearSelection () { selected = null; refreshSelection() },
    get selected () { return selected },

    removeCard (key) {
      cards.get(key)?.remove()
      cards.delete(key)
      const i = catalog.findIndex(c => c.key === key)
      if (i >= 0) catalog.splice(i, 1)
    },

    openInspector (soldier, coins) {
      inspected = soldier
      el.inspector.classList.remove('hidden')
      api.refreshInspector(soldier, coins)
    },

    refreshInspector (soldier, coins) {
      if (soldier.dead) return api.closeInspector()
      const cost = upgradeCost(soldier)
      el.inspectorTitle.textContent = `${soldier.spec.name} · nivel ${soldier.level}`
      el.actUpgrade.textContent = `Mejorar ${cost}`
      el.actUpgrade.disabled = coins < cost
      el.actMove.style.display = soldier.spec.blocker ? 'none' : ''
    },

    closeInspector (keepTarget = false) {
      el.inspector.classList.add('hidden')
      if (!keepTarget) { inspected = null; onDeselect?.() }
    },

    get inspected () { return inspected },

    showOverlay (html) {
      el.overlay.innerHTML = `<div class="panel">${html}</div>`
      el.overlay.classList.remove('hidden')
    },

    hideOverlay () { el.overlay.classList.add('hidden') }
  }

  // El alto de la barra lo dicta el contenido de la ficha, y los retratos la
  // hicieron 18 px más alta de golpe. La franja de estado y el inspector se
  // cuelgan de --armory-h, así que si se adivina el número se descuadran en
  // silencio a la siguiente. Se mide, y se vuelve a medir cuando cambie.
  //
  // Se mide el <nav>, NO el carril: el carril añade el margen inferior seguro
  // del móvil, y los dos que la consumen ya lo suman por su cuenta. Medir el
  // carril lo contaría dos veces.
  const medirArmeria = () => {
    const h = el.armory.offsetHeight
    if (h) document.documentElement.style.setProperty('--armory-h', `${h}px`)
  }
  new ResizeObserver(medirArmeria).observe(el.armory)
  medirArmeria()

  return api
}
