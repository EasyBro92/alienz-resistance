// La guía de la primera partida (Isidro, 03/10, de una tanda de mejoras: «guía
// primera partida»). Cuatro avisos cortos que salen cuando hacen falta, no
// todos de golpe: se enseña el primero pendiente cuya situación ya se da, y se
// quita en cuanto el jugador lo hace (o lo cierra con la ×). Lo hecho se guarda
// en `alienz-guia-v1`, así que cada aviso sale una vez en la vida.
//
// main.js le da una función `estado()` con lo que hace falta mirar y avisa con
// `hecho(clave)` cuando el jugador hace la cosa; `mirar()` va en cada fotograma.

const CLAVE = 'alienz-guia-v1'

const PASOS = [
  { clave: 'carta', texto: 'Toca una carta de abajo: el soldado se coloca solo en su sitio.',
    cuando: e => e.soldados === 0 },
  { clave: 'monedas', texto: 'Toca las monedas del suelo para cobrarlas: con ellas pones más tropa.',
    cuando: e => e.monedas > 0 && !e.recolector },
  { clave: 'mover', texto: 'Para mover a un soldado, arrástralo con el dedo, o tócalo y luego toca dónde ir.',
    cuando: (e, hecho) => hecho.has('carta') && e.soldados >= 2 },
  { clave: 'apoyo', texto: 'Las cartas de apoyo (avión, napalm…) se eligen y luego se toca dónde caen.',
    cuando: e => e.apoyoListo }
]

export function crearGuia (estado) {
  let hecho
  try { hecho = new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')) } catch { hecho = new Set() }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify([...hecho])) } catch { /* modo privado */ } }

  const el = document.createElement('div')
  el.className = 'guia'
  el.innerHTML = '<span class="guia-texto"></span><button class="guia-cerrar" aria-label="Cerrar el aviso">×</button>'
  document.getElementById('app').appendChild(el)
  const texto = el.querySelector('.guia-texto')
  let visto = null          // el paso que se está enseñando
  let desde = 0             // cuándo empezó la partida: no se avisa nada nada más entrar

  el.querySelector('.guia-cerrar').addEventListener('click', e => {
    e.stopPropagation()
    if (visto) api.hecho(visto)
  })

  function enseñar (paso) {
    visto = paso?.clave ?? null
    if (paso) texto.textContent = paso.texto
    el.classList.toggle('show', !!paso)
  }

  const api = {
    hecho (clave) {
      if (hecho.has(clave)) return
      hecho.add(clave)
      guardar()
      if (visto === clave) enseñar(null)
    },
    mirar () {
      if (hecho.size >= PASOS.length) { if (visto) enseñar(null); return }
      const e = estado()
      if (!e.jugando) { desde = 0; if (visto) enseñar(null); return }
      const ahora = performance.now()
      if (!desde) desde = ahora
      if (ahora - desde < 1500) return
      const paso = PASOS.find(p => !hecho.has(p.clave) && p.cuando(e, hecho))
      if ((paso?.clave ?? null) !== visto) enseñar(paso)
    }
  }
  return api
}
