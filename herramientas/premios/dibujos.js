// Las texturas de los premios del cofre (30/09/2026): el billete, la cara de la
// moneda y el emblema de las cajas. Se dibujan con el lienzo del navegador
// (letras, líneas finas) y se guardan en vistas/ con la ruta /__foto del
// servidor de desarrollo; de ahí las coge herramientas/blender/premios.py.
//
//   En la consola de la página de desarrollo:
//   fetch('/herramientas/premios/dibujos.js').then(r => r.text()).then(eval)
//
// El billete es propio de AlienZ (ni dólar ni euro): papel verde grisáceo,
// guilloquis, marco, medallón con la Z y el valor en las esquinas.

(async () => {
  const guardar = async (nombre, lienzo) => {
    const r = await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre, datos: lienzo.toDataURL('image/png') }) })
    console.log(await r.text())
  }
  const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }

  // --- el billete ---------------------------------------------------------------
  {
    const W = 1024, H = 436
    const [c, g] = lienzo(W, H)
    const tinta = '#1c3a26'
    const fondo = g.createLinearGradient(0, 0, W, H)
    fondo.addColorStop(0, '#c4d6ac'); fondo.addColorStop(0.5, '#b3cb98'); fondo.addColorStop(1, '#bfd2a6')
    g.fillStyle = fondo; g.fillRect(0, 0, W, H)
    // Grano del papel.
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(60,80,50,${Math.random() * 0.06})`
      g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
    }
    // Guilloquis: ondas finas que se cruzan, como en los billetes de verdad.
    g.lineWidth = 0.7
    for (let k = 0; k < 46; k++) {
      g.strokeStyle = `rgba(36,69,47,${0.1 + (k % 3) * 0.05})`
      g.beginPath()
      for (let x = 0; x <= W; x += 4) {
        const y = H / 2 + Math.sin(x / 38 + k * 0.4) * (60 + k * 2.4) * Math.cos(x / 170 + k * 0.12)
        x ? g.lineTo(x, y) : g.moveTo(x, y)
      }
      g.stroke()
    }
    // Marco doble con una greca de rombos entre las dos líneas.
    g.strokeStyle = tinta
    g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28)
    g.lineWidth = 2; g.strokeRect(34, 34, W - 68, H - 68)
    g.fillStyle = tinta
    for (let x = 30; x < W - 20; x += 16) {
      for (const y of [24, H - 24]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-3, -3, 6, 6); g.restore() }
    }
    for (let y = 30; y < H - 20; y += 16) {
      for (const x of [24, W - 24]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-3, -3, 6, 6); g.restore() }
    }
    // El medallón de la izquierda: rosetón de líneas y la Z.
    const mx = 250, my = H / 2
    g.fillStyle = '#a9c28c'; g.beginPath(); g.ellipse(mx, my, 132, 132, 0, 0, 7); g.fill()
    g.strokeStyle = 'rgba(36,69,47,0.55)'; g.lineWidth = 0.8
    for (let a = 0; a < 180; a++) {
      const t = a / 180 * Math.PI * 2
      g.beginPath(); g.ellipse(mx + Math.cos(t) * 40, my + Math.sin(t) * 40, 86, 86, 0, 0, 7); g.stroke()
    }
    g.fillStyle = '#c4d6ac'; g.beginPath(); g.arc(mx, my, 72, 0, 7); g.fill()
    g.strokeStyle = tinta; g.lineWidth = 5; g.beginPath(); g.arc(mx, my, 72, 0, 7); g.stroke()
    g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 132, 0, 7); g.stroke()
    g.fillStyle = tinta; g.font = '900 104px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('Z', mx, my + 6)
    // Textos.
    g.font = '700 32px Georgia, serif'; g.fillText('ALIENZ RESISTANCE', 610, 88)
    g.font = 'italic 600 21px Georgia, serif'; g.fillText('Billete de la Resistencia', 610, 124)
    g.font = '900 150px Georgia, serif'; g.fillText('100', 660, 250)
    g.font = '700 17px Georgia, serif'; g.fillText('CIEN  ·  PAGADERO  EN  EL  BÚNKER  ·  CIEN', 610, 346)
    g.font = '900 52px Georgia, serif'
    g.fillText('100', 108, 84); g.fillText('100', W - 108, 84); g.fillText('100', 108, H - 78); g.fillText('100', W - 108, H - 78)
    // Número de serie en rojo, como los de verdad.
    g.fillStyle = '#9a2a22'; g.font = '700 26px "Courier New", monospace'
    g.fillText('AZ 0417 2926 R', 560, 392)
    g.fillText('AZ 0417 2926 R', 860, 170)
    // Un sello de tinta encima, algo ladeado.
    g.save(); g.translate(880, 300); g.rotate(-0.25)
    g.strokeStyle = 'rgba(40,70,120,0.5)'; g.lineWidth = 4
    g.beginPath(); g.arc(0, 0, 50, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 40, 0, 7); g.stroke()
    g.fillStyle = 'rgba(40,70,120,0.5)'; g.font = '800 18px Georgia, serif'; g.fillText('BÚNKER', 0, 0)
    g.restore()
    await guardar('premio-billete.png', c)
  }

  // --- la cara de la moneda: relieve en grises (blanco = alto) -------------------
  {
    const S = 512
    const [c, g] = lienzo(S, S)
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S)
    const m = S / 2
    // Canto alto, campo hundido.
    g.fillStyle = '#fff'; g.beginPath(); g.arc(m, m, 250, 0, 7); g.fill()
    g.fillStyle = '#3a3a3a'; g.beginPath(); g.arc(m, m, 222, 0, 7); g.fill()
    // Gráfila de puntos.
    g.fillStyle = '#c8c8c8'
    for (let i = 0; i < 90; i++) {
      const t = i / 90 * Math.PI * 2
      g.beginPath(); g.arc(m + Math.cos(t) * 208, m + Math.sin(t) * 208, 4, 0, 7); g.fill()
    }
    // Leyenda alrededor.
    g.font = '800 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    const leyenda = 'ALIENZ  ·  RESISTENCIA  ·  2026  ·  '
    for (let i = 0; i < leyenda.length; i++) {
      const t = -Math.PI / 2 + (i / leyenda.length) * Math.PI * 2
      g.save(); g.translate(m + Math.cos(t) * 176, m + Math.sin(t) * 176); g.rotate(t + Math.PI / 2)
      g.fillText(leyenda[i], 0, 0); g.restore()
    }
    // La Z en el centro, dentro de un anillo.
    g.strokeStyle = '#e0e0e0'; g.lineWidth = 10; g.beginPath(); g.arc(m, m, 130, 0, 7); g.stroke()
    g.fillStyle = '#ffffff'; g.font = '900 190px Georgia, serif'; g.fillText('Z', m, m + 10)
    // Suavizado: el relieve con aristas vivas da dientes de sierra al renderizar.
    const [c2, g2] = lienzo(S, S)
    g2.filter = 'blur(1.6px)'; g2.drawImage(c, 0, 0)
    await guardar('premio-moneda.png', c2)
  }

  // --- el emblema de las cajas (plantilla de pintura, fondo transparente) --------
  {
    const W = 1024, H = 512
    const [c, g] = lienzo(W, H)
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'
    g.lineWidth = 22; g.beginPath(); g.arc(220, H / 2, 170, 0, 7); g.stroke()
    g.font = '900 250px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('Z', 220, H / 2 + 14)
    g.font = '900 150px Impact, "Arial Black", sans-serif'; g.textAlign = 'left'
    g.fillText('ALIENZ', 430, H / 2 - 50)
    g.font = '700 58px Impact, "Arial Black", sans-serif'
    g.fillText('SUMINISTROS · R-26', 436, H / 2 + 84)
    // Cortes de plantilla: la pintura con los puentes típicos del estarcido.
    g.globalCompositeOperation = 'destination-out'
    g.fillRect(0, H / 2 - 4, 420, 8)
    await guardar('premio-emblema.png', c)
  }
})()
