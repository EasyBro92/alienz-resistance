// La lluvia de billetes (Isidro, 30/09: «que se vea más claramente la cantidad
// ganada… billetes dando vueltas como en GTA»). Sale al cobrar un reto del
// Mando, un regalo del administrador o billetes del cofre.
//
// Tres tiempos, como el «misión superada» de GTA:
//   1. se oscurece todo y entra el título de golpe;
//   2. llueven billetes girando en 3D mientras la cifra sube de 0 al premio;
//   3. un puñado sale volando hasta el saldo de arriba, que va subiendo con cada
//      uno, y suena la caja registradora.
// Tocar la pantalla lo salta y deja las cuentas ya hechas.
//
// Es HTML con transformaciones 3D de CSS, no una escena de three: son unas
// decenas de rectángulos y así no hace falta otro renderizador ni tocar el del
// juego. La luz se finge oscureciendo el billete según lo de canto que esté.
//
// Crece con el premio: hasta 50 una lluvia suave, hasta 500 una buena, y más
// allá una tormenta dorada más larga.

import { cargarCartera } from './systems/cartera.js'

const NIVELES = [
  { hasta: 50, billetes: 18, dura: 2.8 },
  { hasta: 500, billetes: 36, dura: 3.4 },
  { hasta: Infinity, billetes: 60, dura: 4.2, dorado: true }
]
const VUELAN = 12
const al = (a, b) => a + Math.random() * (b - a)

// `cantidad` ya está sumada a la cartera cuando se llama: el saldo va de
// (total - cantidad) a total.
export function celebrarBilletes ({ cantidad, titulo = 'PREMIO', subtitulo = '', audio } = {}) {
  cantidad = Math.max(0, Math.round(Number(cantidad) || 0))
  if (!cantidad) return Promise.resolve()
  const nivel = NIVELES.find(n => cantidad <= n.hasta)
  const saldoFinal = cargarCartera().billetes
  const saldoAntes = Math.max(0, saldoFinal - cantidad)
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches

  const capa = document.createElement('div')
  capa.className = 'lluvia' + (nivel.dorado ? ' lluvia-dorada' : '')
  capa.innerHTML = `
    <div class="lluvia-saldo"><svg aria-hidden="true"><use href="#i-billete"></use></svg><span>${saldoAntes}</span></div>
    <div class="lluvia-cielo"></div>
    <div class="lluvia-centro">
      <p class="lluvia-titulo">${titulo}</p>
      <p class="lluvia-cifra"><span class="lluvia-mas">+</span><b>0</b><svg aria-hidden="true"><use href="#i-billete"></use></svg></p>
      <p class="lluvia-sub">${subtitulo || 'billetes'}</p>
    </div>
    <p class="lluvia-pista">Toca para seguir</p>`
  document.body.appendChild(capa)
  const cielo = capa.querySelector('.lluvia-cielo')
  const cifra = capa.querySelector('.lluvia-cifra b')
  const chapa = capa.querySelector('.lluvia-saldo')
  const saldo = chapa.querySelector('span')

  return new Promise(resolve => {
    let acabado = false
    let raf = 0
    const cerrar = () => {
      if (acabado) return
      acabado = true
      cancelAnimationFrame(raf)
      cifra.textContent = cantidad
      saldo.textContent = saldoFinal
      capa.classList.add('lluvia-fuera')
      setTimeout(() => { capa.remove(); resolve() }, 350)
    }
    capa.addEventListener('pointerdown', () => { audio?.caja?.(); cerrar() })

    if (quieto) {
      cifra.textContent = cantidad
      saldo.textContent = saldoFinal
      audio?.caja?.()
      setTimeout(cerrar, 1800)
      return
    }

    const W = innerWidth
    const H = innerHeight
    const destino = chapa.getBoundingClientRect()
    const dx = destino.left + destino.width / 2
    const dy = destino.top + destino.height / 2

    // Cada billete con su caída, su vaivén y sus tres giros.
    const billetes = Array.from({ length: nivel.billetes }, (_, i) => {
      const el = document.createElement('div')
      el.className = 'lluvia-billete'
      el.innerHTML = '<i></i>'
      cielo.appendChild(el)
      return {
        el,
        x: al(-20, W - 40),
        y: -60 - al(0, H * 0.9),
        vy: al(140, 260),
        vaiven: al(18, 60),
        fase: al(0, 6.3),
        ritmo: al(1.2, 2.6),
        rx: al(0, 360), ry: al(0, 360), rz: al(-30, 30),
        vrx: al(180, 520) * (Math.random() < 0.5 ? -1 : 1),
        vry: al(240, 720) * (Math.random() < 0.5 ? -1 : 1),
        vrz: al(-90, 90),
        escala: al(0.75, 1.15),
        // Los primeros que caen son los que luego vuelan al saldo.
        vuela: i < VUELAN,
        salida: null
      }
    })

    const dura = nivel.dura
    const cuentaHasta = dura * 0.55        // la cifra acaba de subir aquí
    const vueloDesde = dura * 0.62         // y aquí empiezan a volar al saldo
    let t0 = performance.now()
    let ultimoTic = 0
    let llegados = 0
    audio?.billete?.()

    const paso = ahora => {
      if (acabado) return
      const t = (ahora - t0) / 1000
      const dt = Math.min(0.05, (ahora - (paso.ultimo ?? ahora)) / 1000)
      paso.ultimo = ahora

      // La cifra, frenando al final como un marcador de puntos.
      const k = Math.min(1, t / cuentaHasta)
      const valor = Math.round(cantidad * (1 - Math.pow(1 - k, 3)))
      if (String(valor) !== cifra.textContent) {
        cifra.textContent = valor
        if (ahora - ultimoTic > 70 && k < 1) { ultimoTic = ahora; audio?.tic?.() }
      }

      for (const b of billetes) {
        if (b.vuela && t >= vueloDesde) {
          // Hacia el saldo, en curva, encogiendo.
          if (!b.salida) b.salida = { x: b.x, y: b.y, t, dura: al(0.45, 0.7) + billetes.indexOf(b) * 0.04 }
          const s = Math.min(1, (t - b.salida.t) / b.salida.dura)
          const e = s * s * (3 - 2 * s)
          const cx = (b.salida.x + dx) / 2 + 80
          const cy = Math.min(b.salida.y, dy) - 120
          const x = (1 - e) * (1 - e) * b.salida.x + 2 * (1 - e) * e * cx + e * e * dx
          const y = (1 - e) * (1 - e) * b.salida.y + 2 * (1 - e) * e * cy + e * e * dy
          b.rz += b.vrz * dt * 3
          b.el.style.transform = `translate3d(${x - 32}px, ${y - 16}px, 0) rotateZ(${b.rz}deg) scale(${b.escala * (1 - e * 0.7)})`
          b.el.style.filter = ''
          if (s >= 1 && !b.llego) {
            b.llego = true
            b.el.remove()
            llegados++
            saldo.textContent = Math.round(saldoAntes + cantidad * llegados / VUELAN)
            chapa.classList.remove('lluvia-pop'); void chapa.offsetWidth; chapa.classList.add('lluvia-pop')
            audio?.coin?.()
            if (llegados === VUELAN) { audio?.caja?.(); setTimeout(cerrar, 900) }
          }
          continue
        }
        b.y += b.vy * dt
        // Los que no vuelan siguen cayendo y vuelven a arriba mientras dure.
        if (b.y > H + 40 && t < dura) { b.y = -60; b.x = al(-20, W - 40) }
        b.rx += b.vrx * dt; b.ry += b.vry * dt; b.rz += b.vrz * dt
        const x = b.x + Math.sin(t * b.ritmo + b.fase) * b.vaiven
        // Luz fingida: de canto se ve más oscuro, de cara más claro.
        const luz = 0.55 + 0.45 * Math.abs(Math.cos(b.rx * Math.PI / 180) * Math.cos(b.ry * Math.PI / 180))
        b.el.style.transform = `translate3d(${x}px, ${b.y}px, 0) rotateX(${b.rx}deg) rotateY(${b.ry}deg) rotateZ(${b.rz}deg) scale(${b.escala})`
        b.el.style.filter = `brightness(${luz.toFixed(2)})`
      }
      // Por si algún vuelo no llega a cerrarse (pestaña en segundo plano).
      if (t > dura + 2.5) return cerrar()
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(a => { t0 = a; paso(a) })
    // Sin fotogramas (pestaña oculta) se cierra igual con las cuentas hechas.
    setTimeout(() => { if (!acabado) cerrar() }, (dura + 4) * 1000)
  })
}
