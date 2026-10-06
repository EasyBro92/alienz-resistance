// Fotos de cerca de un soldado ya colocado en la partida, desde donde se pida.
//
// Va DENTRO de la página (`fetch('/herramientas/navegador/foto-soldado.js').then(r => r.text()).then(eval)`),
// porque lo que hay que ver es la figura con la animación y las manos al arma
// que le pone el juego, no la pose de reposo de Blender. Deja un JPEG por vista
// en `vistas/` (ruta /__foto del servidor de desarrollo).
//
//   await __fotoSoldado(0, 'jill')                      frente, tres cuartos, espalda y la vista de juego
//   await __fotoSoldado(0, 'jill', ['frente'], 0.6)     solo una, más cerca

// Una partida de prueba con los soldados que se pidan, uno por carril, ya
// colocados y asentados: `await __probar(['jill', 'ada'])`.
window.__probar = async (claves, nivel = 0) => {
  const z = window.__zr
  const espera = ms => new Promise(r => setTimeout(r, ms))
  z.start(nivel); await espera(1500); z.start(nivel)
  z.sinVuelo?.(); z.despausar(); await espera(2500)
  z.economy.add(9000)
  claves.forEach((k, i) => z.place(k, i % 5, Math.floor(i / 5)))
  await espera(3500)
  z.despausar()
  for (let i = 0; i < 60; i++) z.simulate(1 / 30)
  return z.soldiers.map(s => s.key).join(' ')
}

window.__fotoSoldado = async (indice, nombre, vistas = ['frente', 'trescuartos', 'espalda', 'juego'], lejos = 1) => {
  const z = window.__zr
  const { THREE, renderer, scene } = z
  const s = z.soldiers[indice]
  if (!s) return 'no hay soldado ' + indice
  const p = s.mesh.position
  // El soldado mira a -Z: de frente se le ve desde más allá, mirando hacia +Z.
  const DESDE = {
    frente: [0, 1.15, -3.0], trescuartos: [-1.9, 1.3, -2.4], perfil: [-3.0, 1.1, 0],
    espalda: [0.5, 1.5, 3.0], juego: [0.9, 3.4, 3.6], busto: [-0.5, 1.5, -1.5]
  }
  const cam = new THREE.PerspectiveCamera(30, 0.7, 0.1, 400)
  const ancho = 560; const alto = 800
  const viejo = new THREE.Vector2()
  renderer.getSize(viejo)
  const proporcion = renderer.getPixelRatio()
  const hechas = []
  for (const v of vistas) {
    const d = DESDE[v]
    cam.position.set(p.x + d[0] * lejos, d[1] + (v === 'busto' ? 0 : 0), p.z + d[2] * lejos)
    cam.lookAt(p.x, v === 'busto' ? 1.4 : 0.95, p.z)
    cam.updateMatrixWorld()
    renderer.setPixelRatio(1)
    renderer.setSize(ancho, alto, false)
    renderer.render(scene, cam)
    const datos = renderer.domElement.toDataURL('image/jpeg', 0.9)
    const r = await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: `soldado-${nombre}-${v}.jpg`, datos }) })
    hechas.push(await r.text())
  }
  renderer.setPixelRatio(proporcion)
  renderer.setSize(viejo.x, viejo.y, false)
  z.render?.()
  return hechas.join(' · ')
}
