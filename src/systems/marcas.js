import * as THREE from 'three'

// Marcas de batalla en el suelo: el charco que deja un huésped al caer y el
// tiznón de una explosión.
//
// Aparecen y se borran solas en unos segundos. Es a propósito: acumuladas,
// después de tres oleadas el asfalto es una alfombra parda y deja de leerse
// dónde está cada cosa, que es lo único que el suelo tiene que hacer. Y quedan
// las suficientes a la vez para que, mientras dura la pelea, se vea por dónde
// ha pasado.
//
// Es una bolsa fija de planos reutilizados. Ni se crean ni se destruyen mallas
// en mitad de una oleada: la marca más vieja es la que se recicla.

const CUANTAS = 22
const DURA = 7
const DESVANECE = 2.2   // los últimos segundos, bajando de opacidad

// Las texturas se dibujan una vez, en un lienzo pequeño: a ras de suelo y de
// lejos, 96 píxeles bastan y caben en cualquier móvil.
function textura (dibujar) {
  const c = document.createElement('canvas')
  c.width = c.height = 96
  dibujar(c.getContext('2d'))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function manchaIcor (g) {
  // Salpicadura: un cuerpo central irregular y unas gotas alrededor.
  g.clearRect(0, 0, 96, 96)
  g.fillStyle = 'rgba(120, 38, 30, 0.85)'
  g.beginPath()
  for (let i = 0; i <= 18; i++) {
    const a = i / 18 * Math.PI * 2
    const r = 26 + Math.sin(i * 2.3) * 7 + Math.cos(i * 1.4) * 5
    g[i ? 'lineTo' : 'moveTo'](48 + Math.cos(a) * r, 48 + Math.sin(a) * r * 0.9)
  }
  g.fill()
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2
    const d = 28 + Math.random() * 16
    g.globalAlpha = 0.5 + Math.random() * 0.3
    g.beginPath()
    g.arc(48 + Math.cos(a) * d, 48 + Math.sin(a) * d * 0.9, 1.5 + Math.random() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

function tiznon (g) {
  // Quemadura: negro en el centro y ceniza deshilachada hacia fuera.
  const r = g.createRadialGradient(48, 48, 4, 48, 48, 46)
  r.addColorStop(0, 'rgba(18, 16, 14, 0.9)')
  r.addColorStop(0.55, 'rgba(38, 32, 26, 0.6)')
  r.addColorStop(1, 'rgba(60, 52, 42, 0)')
  g.fillStyle = r
  g.fillRect(0, 0, 96, 96)
  g.strokeStyle = 'rgba(26, 22, 18, 0.55)'
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2
    g.lineWidth = 0.7 + Math.random() * 1.6
    g.beginPath()
    g.moveTo(48 + Math.cos(a) * 12, 48 + Math.sin(a) * 12)
    g.lineTo(48 + Math.cos(a) * (30 + Math.random() * 16), 48 + Math.sin(a) * (30 + Math.random() * 16))
    g.stroke()
  }
}

export function crearMarcas (scene) {
  const geo = new THREE.PlaneGeometry(1, 1)
  const mapas = { icor: textura(manchaIcor), quemado: textura(tiznon) }
  const bolsa = []
  let siguiente = 0

  for (let i = 0; i < CUANTAS; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2
    }))
    m.rotation.x = -Math.PI / 2
    m.visible = false
    m.renderOrder = 1
    scene.add(m)
    bolsa.push({ malla: m, t: 0 })
  }

  return {
    poner (x, z, tipo = 'icor', tam = 1.4) {
      const marca = bolsa[siguiente]
      siguiente = (siguiente + 1) % CUANTAS
      marca.t = DURA
      marca.malla.material.map = mapas[tipo] ?? mapas.icor
      marca.malla.material.needsUpdate = true
      marca.malla.material.opacity = tipo === 'quemado' ? 0.75 : 0.6
      marca.malla.position.set(x, 0.035, z)
      marca.malla.rotation.z = Math.random() * Math.PI * 2
      marca.malla.scale.setScalar(tam * (0.85 + Math.random() * 0.4))
      marca.malla.visible = true
    },

    update (dt) {
      for (const marca of bolsa) {
        if (marca.t <= 0) continue
        marca.t -= dt
        if (marca.t <= 0) { marca.malla.visible = false; continue }
        if (marca.t < DESVANECE) marca.malla.material.opacity = (marca.t / DESVANECE) * 0.6
      }
    },

    limpiar () {
      for (const marca of bolsa) { marca.t = 0; marca.malla.visible = false }
    }
  }
}
