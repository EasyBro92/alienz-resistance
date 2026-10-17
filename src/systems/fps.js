// El contador de FPS (fotogramas por segundo), que se enciende en Ajustes.
//
// Isidro, 17/10/2026: «añade en opciones un botón para activar y desactivar los
// fps, los quiero arriba en una esquina o en el medio, donde no moleste, en
// pequeño». Va arriba en el centro, por ENCIMA del marcador (que empieza más
// abajo), con letra pequeña y sin recoger toques: los botones de las esquinas
// (volver, monedas, velocidad, pausa, sonido) quedan libres.
//
// Cuenta con su propio requestAnimationFrame, no con el bucle del juego: así
// también mide en la portada y en la tienda, que es donde se ve si el móvil
// sufre con los modelos. Se refresca dos veces por segundo; el número es la
// media de ese medio segundo, y entre paréntesis el peor fotograma (en ms), que
// es lo que se nota como tirón aunque la media sea buena.

const CLAVE = 'alienz-fps-v1'

let el = null
let pedido = 0
let cuenta = 0
let desde = 0
let ultimo = 0
let peor = 0

export function fpsGuardado () {
  try { return localStorage.getItem(CLAVE) === 'si' } catch { return false }
}

function paso (t) {
  pedido = requestAnimationFrame(paso)
  if (ultimo) peor = Math.max(peor, t - ultimo)
  ultimo = t
  cuenta++
  if (t - desde < 500) return
  const fps = Math.round(cuenta * 1000 / (t - desde))
  el.textContent = `${fps} FPS · ${Math.round(peor)} ms`
  // Verde si va fluido, ámbar si se nota, rojo si va a tirones.
  el.dataset.nivel = fps >= 50 ? 'bien' : fps >= 30 ? 'justo' : 'mal'
  cuenta = 0
  peor = 0
  desde = t
}

export function ponerFps (encendido) {
  try { localStorage.setItem(CLAVE, encendido ? 'si' : 'no') } catch { /* modo privado: solo esta vez */ }
  if (encendido && !el) {
    el = document.createElement('div')
    el.id = 'contador-fps'
    el.setAttribute('aria-hidden', 'true')
    el.textContent = '… FPS'
    document.body.appendChild(el)
    desde = performance.now()
    ultimo = 0
    cuenta = 0
    pedido = requestAnimationFrame(paso)
  } else if (!encendido && el) {
    cancelAnimationFrame(pedido)
    el.remove()
    el = null
  }
}
