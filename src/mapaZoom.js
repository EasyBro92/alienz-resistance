// Zoom del mapa de la campaña.
//
// En Europa hay cuatro campamentos a un palmo: con el mapa a tamaño fijo, un
// dedo tapaba tres y acertarle al que querías era cuestión de suerte. Con zoom
// el problema desaparece sin tocar el dibujo, que es lo que se quería.
//
// El mapa no se escala con `transform`: se le cambia el ancho. Un SVG dibuja
// a la resolución que tenga en pantalla, así que al ampliarlo las costas y los
// nombres siguen nítidos en vez de verse el zoom de una foto. La caja de fuera
// desliza en los dos ejes y el navegador se encarga del arrastre con el dedo.

const MIN = 1
const MAX = 3.2

export function montarZoomMapa (caja, botones) {
  let escala = MIN

  // El punto de la imagen que está en el centro de la caja se queda en el
  // centro al ampliar. Sin esto, cada toque del botón te manda al Atlántico.
  const aplicar = (nueva, foco) => {
    nueva = Math.min(MAX, Math.max(MIN, nueva))
    if (Math.abs(nueva - escala) < 0.001) return
    const r = caja.getBoundingClientRect()
    const fx = foco ? foco.x - r.left : r.width / 2
    const fy = foco ? foco.y - r.top : r.height / 2
    const k = nueva / escala
    const izq = (caja.scrollLeft + fx) * k - fx
    const arr = (caja.scrollTop + fy) * k - fy
    escala = nueva
    caja.style.setProperty('--mapa-zoom', escala)
    caja.classList.toggle('mapa-ampliado', escala > MIN + 0.01)
    caja.scrollLeft = izq
    caja.scrollTop = arr
    botones?.forEach(b => { b.disabled = b.dataset.paso > 0 ? escala >= MAX - 0.01 : escala <= MIN + 0.01 })
  }

  botones?.forEach(b => b.addEventListener('click', e => {
    e.stopPropagation()
    aplicar(escala * (Number(b.dataset.paso) > 0 ? 1.5 : 1 / 1.5))
  }))

  // Pellizco con dos dedos. Se llevan los punteros a mano porque la caja
  // desliza: con `touch-action` suelto, el navegador se queda el gesto y el
  // mapa se va de viaje mientras pellizcas.
  const dedos = new Map()
  let partida = 0
  let base = MIN
  caja.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return
    dedos.set(e.pointerId, e)
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()]
      partida = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      base = escala
    }
  })
  caja.addEventListener('pointermove', e => {
    if (!dedos.has(e.pointerId)) return
    dedos.set(e.pointerId, e)
    if (dedos.size !== 2 || !partida) return
    e.preventDefault()
    const [a, b] = [...dedos.values()]
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    aplicar(base * (d / partida), { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
  }, { passive: false })
  const soltar = e => { dedos.delete(e.pointerId); if (dedos.size < 2) partida = 0 }
  caja.addEventListener('pointerup', soltar)
  caja.addEventListener('pointercancel', soltar)

  // Rueda con Ctrl y doble clic, para quien juegue en el ordenador.
  caja.addEventListener('wheel', e => {
    if (!e.ctrlKey) return
    e.preventDefault()
    aplicar(escala * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { x: e.clientX, y: e.clientY })
  }, { passive: false })
  caja.addEventListener('dblclick', e => {
    aplicar(escala > MIN + 0.01 ? MIN : 2, { x: e.clientX, y: e.clientY })
  })

  return {
    escala: () => escala,
    reiniciar: () => { escala = MIN; caja.style.setProperty('--mapa-zoom', MIN); caja.classList.remove('mapa-ampliado'); botones?.forEach(b => { b.disabled = b.dataset.paso < 0 }) }
  }
}
