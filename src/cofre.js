// El cofre del final de partida: una tira de premios que pasa bajo una marca y
// frena sobre lo que te toca, como las cajas de Counter-Strike.
//
// Sale al acabar CUALQUIER partida, se gane o se pierda, y es gratis. Es lo que
// hace que perder no sea salir con las manos vacías y lo que da ganas de echar
// otra. Ganando con estrellas sube la probabilidad de lo bueno.
//
// El premio se decide y se guarda ANTES de girar. La tira es el espectáculo, no
// el sorteo: si alguien pulsa seguir a mitad de giro, lo que le tocó ya está en
// su cartera.
//
// Solo da moneda del juego —billetes y monedas guardadas— y así tiene que
// seguir si algún día se venden billetes con dinero real: un cofre aleatorio
// que se pudiera pagar con dinero sería una caja de botín de las que regulan
// varios países.

import { sumarBilletes, sumarMonedas } from './systems/cartera.js'

export const RAREZAS = {
  comun: 'Común',
  poco: 'Poco común',
  raro: 'Raro',
  epico: 'Épico',
  legendario: 'Legendario'
}

// Pesos al PERDER. De media dan unos tres billetes; con tres estrellas, unos
// cinco. Una partida da de 27 a 237 billetes, así que el cofre suma sin
// sustituir a jugar bien, y de vez en cuando cae uno gordo.
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

function sortear (pesos) {
  const total = pesos.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < PREMIOS.length; i++) {
    r -= pesos[i]
    if (r <= 0) return PREMIOS[i]
  }
  return PREMIOS[PREMIOS.length - 1]
}

const PESOS_BASE = PREMIOS.map(p => p.peso)

// Decide el premio y lo guarda. Ganar multiplica lo que no es común: con tres
// estrellas, lo raro sale casi el triple de veces que perdiendo.
export function tirarCofre ({ gano = false, estrellas = 0 } = {}) {
  const f = gano ? 1 + estrellas * 0.6 : 1
  const premio = sortear(PREMIOS.map(p => (p.rareza === 'comun' ? p.peso : p.peso * f)))
  if (premio.tipo === 'billetes') sumarBilletes(premio.cantidad)
  else sumarMonedas(premio.cantidad)
  return premio
}

const ANCHO = 84
const HUECO = 8
const PASO = ANCHO + HUECO
const PIEZAS = 44
// La ganadora va casi al final de la tira: así pasan treinta y tantas por
// delante antes de frenar, que es lo que da la sensación de ruleta.
const GANADORA = 38
const DURA = 5200

const pieza = p => `
  <div class="cofre-pieza r-${p.rareza}">
    <svg aria-hidden="true"><use href="#${p.tipo === 'billetes' ? 'i-billete' : 'i-moneda'}"></use></svg>
    <b>${p.cantidad}</b>
    <small>${p.tipo}</small>
  </div>`

export function girarCarrusel (caja, premio, audio) {
  caja.innerHTML = `
    <p class="cofre-tit">Cofre de la partida</p>
    <div class="cofre-ventana">
      <div class="cofre-marca"></div>
      <div class="cofre-tira"></div>
    </div>
    <p class="cofre-resultado" aria-live="polite"></p>`
  const ventana = caja.querySelector('.cofre-ventana')
  const tira = caja.querySelector('.cofre-tira')
  const resultado = caja.querySelector('.cofre-resultado')

  // Las de relleno se sortean con los pesos de siempre: una tira llena de
  // legendarios delataría que lo que pasa por delante no es lo que puede tocar.
  const piezas = Array.from({ length: PIEZAS }, (_, i) => (i === GANADORA ? premio : sortear(PESOS_BASE)))
  tira.innerHTML = piezas.map(pieza).join('')

  const ancho = ventana.clientWidth || 320
  // No frena siempre en el centro exacto de la pieza: parar clavado en el medio
  // cada vez es lo que hace que se note que estaba decidido.
  const desvio = (Math.random() - 0.5) * ANCHO * 0.6
  const destino = -(GANADORA * PASO + ANCHO / 2) + ancho / 2 + desvio

  let hecho = false
  let reloj = null
  const acabar = () => {
    if (hecho) return
    hecho = true
    clearInterval(reloj)
    tira.children[GANADORA]?.classList.add('gana')
    resultado.innerHTML = premio.tipo === 'billetes'
      ? `<span class="r-${premio.rareza}">${RAREZAS[premio.rareza]}</span> · <b>+${premio.cantidad} billetes</b>`
      : `<span class="r-${premio.rareza}">${RAREZAS[premio.rareza]}</span> · <b>+${premio.cantidad} monedas</b> guardadas: cada 30 son un billete en la tienda`
    if (premio.rareza === 'raro' || premio.rareza === 'epico' || premio.rareza === 'legendario') audio?.desbloqueo?.()
    else audio?.coin?.()
  }

  // Quien tiene pedido reducir movimiento no ve la tira girar: ve directamente
  // lo que le ha tocado.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tira.style.transform = `translateX(${destino}px)`
    acabar()
    return
  }

  tira.style.transform = 'translateX(0px)'
  tira.getBoundingClientRect()
  tira.style.transition = `transform ${DURA}ms cubic-bezier(0.06, 0.62, 0.1, 1)`
  tira.style.transform = `translateX(${destino}px)`

  // Un clic por cada pieza que pasa bajo la marca. Se lee la posición real de la
  // tira en vez de calcularla con la curva: así los clics frenan exactamente al
  // ritmo que frena lo que se ve.
  let ultima = -1
  reloj = setInterval(() => {
    const m = new DOMMatrixReadOnly(getComputedStyle(tira).transform)
    const bajoMarca = Math.floor((ancho / 2 - m.m41) / PASO)
    if (bajoMarca !== ultima) {
      ultima = bajoMarca
      audio?.tic?.()
    }
  }, 25)

  tira.addEventListener('transitionend', acabar, { once: true })
  // Por si el navegador no avisa del final (pestaña en segundo plano): el
  // premio se enseña igual.
  setTimeout(acabar, DURA + 500)
}
