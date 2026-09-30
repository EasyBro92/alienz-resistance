// El botín y las cajas (rehecho el 30/09/2026 a partir de un vídeo de las cajas
// de Counter-Strike que mandó Isidro).
//
// Dos cosas con la misma ruleta:
//
//   · El BOTÍN de cada partida: sale al acabar CUALQUIER partida, se gane o se
//     pierda, y da monedas o billetes. Ganando con estrellas sube lo bueno. Y
//     solo ganando, muy de vez en cuando, toca una CAJA.
//   · Las CAJAS: se guardan en la tienda y se abren cuando quieras, con premios
//     gordos. La militar (1 % por victoria, y segura a las 150 victorias sin
//     ninguna) da de 500 a 3.000 billetes; la alienígena, mucho más rara, da
//     los personajes que no se venden en la tienda.
//
// El premio se decide y se GUARDA antes de girar. La tira es el espectáculo, no
// el sorteo: si alguien cierra a mitad de giro, lo suyo ya está en la cartera.
//
// Solo da cosas del juego y así tiene que seguir si algún día se venden
// billetes con dinero real: una caja aleatoria que se pudiera pagar con dinero
// sería una caja de botín de las que regulan varios países.
//
// Las fotos de los premios salen de Blender (herramientas/blender/premios.py).

import { sumarBilletes, sumarMonedas, desbloquearPremio, cargarCartera, sumarCaja, gastarCaja, victoriaSinCaja, PREMIOS_UNIDAD } from './systems/cartera.js'
import { SOLDIERS } from './config.js'
import { celebrarBilletes } from './lluviaBilletes.js'

const FOTOS = `${import.meta.env.BASE_URL}premios/`

export const RAREZAS = {
  comun: 'Común',
  poco: 'Poco común',
  raro: 'Raro',
  epico: 'Épico',
  legendario: 'Legendario',
  // El escalón de arriba del todo: las cajas y lo que solo sale de ellas.
  unico: 'Excepcional'
}

export const CAJAS = {
  militar: {
    nombre: 'Caja militar',
    contiene: 'De 500 a 3.000 billetes.',
    rareza: 'unico'
  },
  alien: {
    nombre: 'Caja alienígena',
    contiene: 'Personajes exclusivos que no se venden en la tienda. Si ya los tienes todos, de 1.500 a 3.000 billetes.',
    rareza: 'unico'
  }
}

// Isidro: una caja cada cien victorias más o menos, y la alienígena mucho más
// rara. El seguro: a las 150 victorias seguidas sin caja, la siguiente la trae.
const PROB_MILITAR = 0.01
const PROB_ALIEN = 0.002
const SEGURO = 150

// El botín de siempre. Pesos al PERDER; ganando se multiplica lo que no es común.
export const PREMIOS = [
  { tipo: 'monedas', cantidad: 20, rareza: 'comun', peso: 30 },
  { tipo: 'monedas', cantidad: 45, rareza: 'comun', peso: 22 },
  { tipo: 'billetes', cantidad: 2, rareza: 'comun', peso: 22 },
  { tipo: 'billetes', cantidad: 5, rareza: 'poco', peso: 12 },
  { tipo: 'monedas', cantidad: 90, rareza: 'poco', peso: 8 },
  { tipo: 'billetes', cantidad: 12, rareza: 'raro', peso: 4 },
  { tipo: 'billetes', cantidad: 30, rareza: 'epico', peso: 1.6 },
  { tipo: 'billetes', cantidad: 120, rareza: 'legendario', peso: 0.4 }
]
const CAJA_MILITAR = { tipo: 'caja', caja: 'militar', rareza: 'unico' }
const CAJA_ALIEN = { tipo: 'caja', caja: 'alien', rareza: 'unico' }

function sortear (lista, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < lista.length; i++) {
    r -= pesos[i]
    if (r <= 0) return lista[i]
  }
  return lista[lista.length - 1]
}

// Lo que pasa por delante sin tocar: el botín con sus pesos y, de vez en cuando,
// una caja, para que se vea que existen (en el sorteo de verdad son mucho más raras).
const RELLENO_BOTIN = [...PREMIOS, CAJA_MILITAR, CAJA_ALIEN]
const PESOS_RELLENO = [...PREMIOS.map(p => p.peso), 2.5, 0.8]
const rellenoBotin = () => sortear(RELLENO_BOTIN, PESOS_RELLENO)

// Decide el botín de una partida y lo guarda.
export function tirarCofre ({ gano = false, estrellas = 0 } = {}) {
  if (gano) {
    const seguro = cargarCartera().sinCaja + 1 >= SEGURO
    if (Math.random() < PROB_ALIEN) { sumarCaja('alien'); return CAJA_ALIEN }
    if (seguro || Math.random() < PROB_MILITAR) { sumarCaja('militar'); return CAJA_MILITAR }
    victoriaSinCaja()
  }
  const f = gano ? 1 + estrellas * 0.6 : 1
  const premio = sortear(PREMIOS, PREMIOS.map(p => (p.rareza === 'comun' ? p.peso : p.peso * f)))
  if (premio.tipo === 'billetes') sumarBilletes(premio.cantidad)
  else sumarMonedas(premio.cantidad)
  return premio
}

// --- lo que hay dentro de las cajas -----------------------------------------------
// De 50 en 50, y cuanto más alto menos sale: con la caída de 400, la media ronda
// los 900 (Isidro: «a más billetes, menos porcentaje»).
function montonDeBilletes (desde, hasta, caida) {
  const valores = []
  for (let v = desde; v <= hasta; v += 50) valores.push(v)
  const cantidad = sortear(valores, valores.map(v => Math.exp(-(v - desde) / caida)))
  return { tipo: 'billetes', cantidad, rareza: rarezaDeMonton(cantidad) }
}
const rarezaDeMonton = v => (v < 800 ? 'poco' : v < 1200 ? 'raro' : v < 1800 ? 'epico' : v < 2500 ? 'legendario' : 'unico')

const personajesQueFaltan = () => {
  const tengo = new Set(cargarCartera().desbloqueadas)
  return PREMIOS_UNIDAD.filter(k => !tengo.has(k))
}
const personaje = clave => ({ tipo: 'unidad', clave, nombre: SOLDIERS[clave]?.name ?? clave, rareza: 'unico' })

function contenidoDe (tipo) {
  if (tipo === 'alien') {
    const faltan = personajesQueFaltan()
    return faltan.length ? personaje(faltan[Math.floor(Math.random() * faltan.length)]) : montonDeBilletes(1500, 3000, 600)
  }
  return montonDeBilletes(500, 3000, 400)
}

function rellenoDe (tipo) {
  if (tipo === 'alien') {
    return () => (Math.random() < 0.3 && PREMIOS_UNIDAD.length
      ? personaje(PREMIOS_UNIDAD[Math.floor(Math.random() * PREMIOS_UNIDAD.length)])
      : montonDeBilletes(1500, 3000, 600))
  }
  return () => montonDeBilletes(500, 3000, 700)
}

function aplicar (premio) {
  if (premio.tipo === 'billetes') sumarBilletes(premio.cantidad)
  else if (premio.tipo === 'monedas') sumarMonedas(premio.cantidad)
  else if (premio.tipo === 'unidad') desbloquearPremio(premio.clave)
}

// --- las fotos ---------------------------------------------------------------------
function foto (p) {
  if (p.tipo === 'caja') return `${FOTOS}caja-${p.caja}.webp`
  if (p.tipo === 'monedas') return `${FOTOS}monedas-${p.cantidad <= 20 ? 1 : p.cantidad <= 45 ? 2 : 3}.webp`
  if (p.tipo === 'billetes') {
    const n = p.cantidad <= 2 ? 1 : p.cantidad <= 12 ? 2 : p.cantidad <= 30 ? 3 : p.cantidad < 1000 ? 4 : 5
    return `${FOTOS}billetes-${n}.webp`
  }
  return null
}

const nombreDe = p => (p.tipo === 'caja'
  ? CAJAS[p.caja].nombre
  : p.tipo === 'unidad'
    ? p.nombre
    : `${p.cantidad.toLocaleString('es-ES')} ${p.tipo}`)

function carta (p, retratos) {
  const src = foto(p)
  const retrato = p.tipo === 'unidad' ? retratos?.get?.(p.clave) : null
  const dibujo = src || retrato
    ? `<img src="${src || retrato}" alt="" draggable="false">`
    : '<svg aria-hidden="true"><use href="#i-rifle"></use></svg>'
  return `
    <div class="ruleta-carta r-${p.rareza}">
      ${dibujo}
      <span class="ruleta-nombre">${nombreDe(p)}</span>
    </div>`
}

// --- la ruleta a pantalla completa ---------------------------------------------------
// Como la de Counter-Strike: la caja desenfocada detrás, la tira de cartas con
// fondo gris que baja al color de su rareza, la raya amarilla en medio, y la
// carta que pasa por debajo de la raya crece. Al parar, la ganadora se queda
// grande en el centro con su nombre y el botón de recoger.
const ANCHO = 150
const HUECO = 6
const PASO = ANCHO + HUECO
const PIEZAS = 46
const GANADORA = 40
const DURA = 5600

function ruleta ({ premio, relleno, titulo, caja, nota, fondo, audio, retratos, pieFinal }) {
  const capa = document.createElement('div')
  capa.className = 'ruleta'
  capa.innerHTML = `
    <div class="ruleta-fondo" style="background-image:url('${FOTOS}caja-${fondo}-grande.webp')"></div>
    <header class="ruleta-cabeza">
      <p class="ruleta-tit">${titulo}</p>
      <p class="ruleta-sub">Abrir <b>${caja}</b></p>
      <p class="ruleta-nota">${nota}</p>
    </header>
    <div class="ruleta-ventana">
      <div class="ruleta-tira"></div>
      <div class="ruleta-aguja"></div>
    </div>
    <div class="ruleta-final" hidden></div>`
  document.body.appendChild(capa)
  const ventana = capa.querySelector('.ruleta-ventana')
  const tira = capa.querySelector('.ruleta-tira')
  const final = capa.querySelector('.ruleta-final')

  const piezas = Array.from({ length: PIEZAS }, (_, i) => (i === GANADORA ? premio : relleno()))
  tira.innerHTML = piezas.map(p => carta(p, retratos)).join('')
  const cartas = [...tira.children]

  return new Promise(resolve => {
    const ancho = ventana.clientWidth || 360
    // No frena en el centro exacto de la carta: parar clavado cada vez delata
    // que estaba decidido.
    const desvio = (Math.random() - 0.5) * ANCHO * 0.7
    const destino = -(GANADORA * PASO + ANCHO / 2) + ancho / 2 + desvio
    let hecho = false
    let raf = 0
    let ultima = -1

    const acabar = () => {
      if (hecho) return
      hecho = true
      cancelAnimationFrame(raf)
      tira.style.transition = 'none'
      tira.style.transform = `translateX(${destino}px)`
      cartas.forEach(c => { c.style.transform = '' })
      cartas[GANADORA].classList.add('gana')
      capa.classList.add('ruleta-parada')
      const sello = `<span class="r-${premio.rareza}">${RAREZAS[premio.rareza]}</span>`
      final.innerHTML = `
        ${carta(premio, retratos)}
        <p class="ruleta-resultado">${sello}<b>${nombreDe(premio)}</b></p>
        <p class="ruleta-pie">${pieFinal?.(premio) ?? ''}</p>
        <button class="big-btn ruleta-recoger" type="button">RECOGER</button>`
      final.querySelector('.ruleta-carta').classList.add('gana', 'grande')
      final.hidden = false
      if (premio.rareza === 'comun' || premio.rareza === 'poco') audio?.coin?.()
      else audio?.desbloqueo?.()
      final.querySelector('.ruleta-recoger').addEventListener('click', async () => {
        capa.classList.add('ruleta-fuera')
        setTimeout(() => capa.remove(), 300)
        if (premio.tipo === 'billetes') {
          await celebrarBilletes({ cantidad: premio.cantidad, titulo: premio.rareza === 'comun' ? 'BOTÍN' : 'PREMIO', subtitulo: RAREZAS[premio.rareza], audio })
          document.dispatchEvent(new Event('alienz-billetes'))
        }
        resolve(premio)
      }, { once: true })
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return acabar()

    tira.style.transform = 'translateX(0px)'
    tira.getBoundingClientRect()
    tira.style.transition = `transform ${DURA}ms cubic-bezier(0.05, 0.6, 0.08, 1)`
    tira.style.transform = `translateX(${destino}px)`

    // Cada fotograma: la carta bajo la raya crece y suena un clic al pasar cada una.
    const centro = ancho / 2
    const paso = () => {
      const x = new DOMMatrixReadOnly(getComputedStyle(tira).transform).m41
      const bajo = Math.floor((centro - x) / PASO)
      if (bajo !== ultima) { ultima = bajo; audio?.tic?.() }
      for (let i = Math.max(0, bajo - 3); i <= Math.min(PIEZAS - 1, bajo + 3); i++) {
        const d = Math.abs(x + i * PASO + ANCHO / 2 - centro)
        cartas[i].style.transform = `scale(${1 + 0.16 * Math.max(0, 1 - d / PASO)})`
      }
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    tira.addEventListener('transitionend', acabar, { once: true })
    // Por si el navegador no avisa del final (pestaña en segundo plano).
    setTimeout(acabar, DURA + 400)
    // Tocar la tira la salta.
    ventana.addEventListener('pointerdown', acabar, { once: true })
  })
}

// El botín del final de partida. Devuelve el premio cuando se recoge.
export function abrirBotin ({ gano, estrellas, audio, retratos }) {
  const premio = tirarCofre({ gano, estrellas })
  return ruleta({
    premio,
    relleno: rellenoBotin,
    titulo: 'Botín de la partida',
    caja: 'cofre de campaña',
    nota: gano ? 'Ganando salen cosas mejores. Muy de vez en cuando, una caja.' : 'Perdiendo también hay botín. Las cajas solo salen ganando.',
    fondo: 'militar',
    audio,
    retratos,
    pieFinal: p => (p.tipo === 'caja'
      ? 'Guardada en la tienda, pestaña Cajas: ábrela cuando quieras.'
      : p.tipo === 'monedas' ? 'Guardadas en la cartera: cada 100 son un billete en la tienda.' : '')
  })
}

// Lo que se enseña en el resumen de la partida después de recoger.
export function resumenBotin (p) {
  return `<div class="botin-premio r-${p.rareza}"><img src="${foto(p) ?? ''}" alt=""><span><small>${RAREZAS[p.rareza]}</small><b>${nombreDe(p)}</b>${p.tipo === 'caja' ? '<em>en la tienda</em>' : ''}</span></div>`
}

// --- ver una caja y abrirla (desde la tienda) ------------------------------------------
export function verCaja (tipo, { audio, retratos, alCerrar } = {}) {
  const def = CAJAS[tipo]
  const capa = document.createElement('div')
  capa.className = `ruleta caja-vista caja-${tipo}`
  const pintar = () => {
    const tengo = cargarCartera().cajas[tipo]
    capa.innerHTML = `
      <div class="ruleta-fondo" style="background-image:url('${FOTOS}caja-${tipo}-grande.webp')"></div>
      <header class="ruleta-cabeza">
        <p class="ruleta-tit">${def.nombre}</p>
        <p class="ruleta-sub">Tienes <b>${tengo}</b></p>
      </header>
      <img class="caja-grande" src="${FOTOS}caja-${tipo}-grande.webp" alt="">
      <p class="caja-contiene"><b>Puede contener</b>${def.contiene}</p>
      <button class="big-btn caja-abrir" type="button" ${tengo ? '' : 'disabled'}>ABRIR</button>
      <button class="chip chip-ghost caja-volver" type="button">Volver</button>`
  }
  pintar()
  document.body.appendChild(capa)
  const cerrar = () => { capa.remove(); alCerrar?.() }
  capa.addEventListener('click', async e => {
    if (e.target.closest('.caja-volver')) return cerrar()
    if (!e.target.closest('.caja-abrir') || !gastarCaja(tipo)) return
    audio?.unlock?.()
    const premio = contenidoDe(tipo)
    aplicar(premio)
    capa.hidden = true
    await ruleta({
      premio,
      relleno: rellenoDe(tipo),
      titulo: 'Abrir contenedor',
      caja: def.nombre,
      nota: 'Lo que toque se guarda al momento.',
      fondo: tipo,
      audio,
      retratos,
      pieFinal: p => (p.tipo === 'unidad' ? 'Desbloqueado para siempre: ya lo tienes en tu armería.' : '')
    })
    pintar()
    capa.hidden = false
    if (!cargarCartera().cajas[tipo]) cerrar()
  })
}
