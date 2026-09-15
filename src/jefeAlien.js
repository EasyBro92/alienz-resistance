// El jefe alien de la portada.
//
// Un escenario propio, aparte del tablero: su lienzo, su cámara y sus luces. En
// la portada no hay partida, así que el tablero no tiene nada que enseñar, y el
// menú necesitaba algo que diera miedo nada más abrir el juego.
//
// El modelo es de Meshy, con textura realista (`public/models/jefe-alien.glb`).
// No trae esqueleto, así que la vida se la da el escenario y el movimiento del
// cuerpo entero: respira, se balancea, gira la cabeza —el modelo entero— hacia
// un lado y otro, y alrededor la niebla se arrastra, suben esporas, laten las
// luces verdes y de vez en cuando cae un relámpago. Si el modelo no llega,
// quedan dos ojos brillando en la oscuridad: la portada no se queda vacía.
//
// Solo se dibuja mientras la portada está a la vista: en cuanto se abre otra
// pantalla encima o empieza una misión, el bucle se para.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const CAPAS_ENCIMA = ['mapa-capa', 'pais-capa', 'tienda-capa', 'enemigos-capa', 'ajustes-capa']

export function crearJefeAlien (contenedor) {
  if (!contenedor) return null
  const lienzo = document.createElement('canvas')
  contenedor.appendChild(lienzo)

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, powerPreference: 'low-power' })
  } catch {
    // Sin WebGL para un segundo lienzo: la portada se queda con su fondo.
    lienzo.remove()
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.45

  const escena = new THREE.Scene()
  // Los dos temas: la noche verde de siempre y, con el tema claro, una niebla
  // blanca de amanecer. Se cambia en vivo al elegir el tema en Ajustes.
  let FONDO = 0x05080a
  escena.background = new THREE.Color(FONDO)
  escena.fog = new THREE.FogExp2(FONDO, 0.07)

  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  // Mirando a media altura del pecho: la cabeza queda a un tercio de la
  // pantalla, entre el logo y las viñetas de la historia.
  const MIRA = new THREE.Vector3(0, 2.1, 0)

  // --- luces: poca de frente, mucho contraluz verde ---
  // Con la primera luz, medida en el móvil, el jefe era una silueta negra: se
  // adivinaban los ojos y poco más. Ahora la luz de clave no decae con la
  // distancia, hay un relleno frío de frente y el contraluz verde recorta el
  // contorno.
  const hemi = new THREE.HemisphereLight(0x5f7f70, 0x0a0d0c, 0.9)
  escena.add(hemi)
  const clave = new THREE.SpotLight(0xe6f4ec, 4.5, 0, 0.55, 0.6, 0)
  clave.position.set(1.8, 6, 5)
  clave.target.position.copy(MIRA)
  escena.add(clave, clave.target)
  const relleno = new THREE.DirectionalLight(0x9fc4d8, 0.9)
  relleno.position.set(-2.5, 2.5, 6)
  escena.add(relleno)
  const contraIzq = new THREE.PointLight(0x39ff88, 20, 12, 1.2)
  contraIzq.position.set(-2.2, 2.8, -1.4)
  const contraDer = new THREE.PointLight(0x2bd47a, 16, 12, 1.2)
  contraDer.position.set(2.4, 2.2, -1.6)
  escena.add(contraIzq, contraDer)
  const relampago = new THREE.DirectionalLight(0xbfe0ff, 0)
  relampago.position.set(-3, 8, 2)
  escena.add(relampago)

  // --- el suelo mojado y la niebla que se arrastra ---
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b1110, roughness: 0.25, metalness: 0.6 })
  )
  suelo.rotation.x = -Math.PI / 2
  escena.add(suelo)

  const texNiebla = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const x = c.getContext('2d')
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(160,220,190,0.55)')
    gr.addColorStop(0.5, 'rgba(90,150,120,0.18)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = gr
    x.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  const nieblas = []
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNiebla, transparent: true, depthWrite: false, opacity: 0.35 + Math.random() * 0.3 }))
    const tam = 2.5 + Math.random() * 3
    s.scale.set(tam, tam * 0.45, 1)
    s.position.set((Math.random() - 0.5) * 9, 0.25 + Math.random() * 0.5, -2 + Math.random() * 4)
    s.userData.v = (Math.random() - 0.5) * 0.25
    escena.add(s)
    nieblas.push(s)
  }

  // --- esporas que suben ---
  const N_ESPORAS = 160
  const posEsporas = new Float32Array(N_ESPORAS * 3)
  for (let i = 0; i < N_ESPORAS; i++) {
    posEsporas[i * 3] = (Math.random() - 0.5) * 7
    posEsporas[i * 3 + 1] = Math.random() * 5
    posEsporas[i * 3 + 2] = (Math.random() - 0.5) * 5
  }
  const geoEsporas = new THREE.BufferGeometry()
  geoEsporas.setAttribute('position', new THREE.BufferAttribute(posEsporas, 3))
  const matEsporas = new THREE.PointsMaterial({
    color: 0x7dffb0, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
  })
  const esporas = new THREE.Points(geoEsporas, matEsporas)
  escena.add(esporas)

  // --- el jefe ---
  const jefe = new THREE.Group()
  escena.add(jefe)
  let cuerpo = null
  let altoJefe = 3.4

  // Los ojos: dos puntos de luz que se quedan aunque no llegue el modelo, y que
  // con el modelo se colocan a la altura de la cara.
  const ojoMat = new THREE.MeshBasicMaterial({ color: 0x7dffb0, fog: false })
  const ojos = new THREE.Group()
  for (const lado of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), ojoMat)
    o.position.set(lado * 0.09, 0, 0)
    o.scale.set(1.6, 0.8, 1)
    ojos.add(o)
  }
  const luzOjos = new THREE.PointLight(0x5dff9a, 3, 2.5, 2)
  ojos.add(luzOjos)
  ojos.position.set(0, 2.95, 0.3)
  jefe.add(ojos)

  new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/jefe-alien.glb`).then(gltf => {
    const m = gltf.scene
    m.traverse(o => {
      if (!o.isMesh) return
      o.castShadow = false
      // La piel húmeda: algo más de brillo del que trae la textura.
      if (o.material && 'roughness' in o.material) o.material.roughness = Math.min(o.material.roughness ?? 1, 0.55)
    })
    const caja = new THREE.Box3().setFromObject(m)
    const tam = caja.getSize(new THREE.Vector3())
    const escala = altoJefe / Math.max(tam.y, 1e-3)
    m.scale.setScalar(escala)
    caja.setFromObject(m)
    const centro = caja.getCenter(new THREE.Vector3())
    m.position.set(-centro.x, -caja.min.y, -centro.z)
    jefe.add(m)
    cuerpo = m
    // Los ojos del modelo ya se ven: los de luz se quedan como brillo delante
    // de la cara, a nueve décimas del alto.
    ojos.position.set(0, altoJefe * 0.9, (caja.max.z - caja.min.z) * 0.32)
    ojoMat.opacity = 0.85
    ojoMat.transparent = true
  }).catch(() => { /* sin modelo: quedan los ojos en la oscuridad */ })

  // --- tamaño ---
  function ajustar () {
    const w = contenedor.clientWidth || window.innerWidth
    const h = contenedor.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camara.aspect = w / h
    // En vertical se aleja: el jefe tiene que caber de la cintura para arriba
    // entre el logo y los botones.
    const vertical = h > w
    camara.fov = vertical ? 38 : 30
    camara.updateProjectionMatrix()
  }
  window.addEventListener('resize', ajustar)

  // --- el tema ---
  let claro = false
  function aplicarTema () {
    claro = document.documentElement.dataset.tema === 'claro'
    FONDO = claro ? 0xdfe7e3 : 0x05080a
    escena.background.setHex(FONDO)
    escena.fog.color.setHex(FONDO)
    escena.fog.density = claro ? 0.05 : 0.07
    suelo.material.color.setHex(claro ? 0xc3cec8 : 0x0b1110)
    suelo.material.roughness = claro ? 0.6 : 0.25
    suelo.material.metalness = claro ? 0.1 : 0.6
    hemi.color.setHex(claro ? 0xf4fbf7 : 0x5f7f70)
    hemi.groundColor.setHex(claro ? 0x8a9a92 : 0x0a0d0c)
    hemi.intensity = claro ? 1.5 : 0.9
    renderer.toneMappingExposure = claro ? 1.15 : 1.45
    matEsporas.color.setHex(claro ? 0x178041 : 0x7dffb0)
    matEsporas.blending = claro ? THREE.NormalBlending : THREE.AdditiveBlending
    matEsporas.needsUpdate = true
    for (const n of nieblas) n.material.opacity = claro ? 0.55 : 0.4
  }
  aplicarTema()
  new MutationObserver(aplicarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })

  // --- girarlo con el dedo ---
  let arrastrando = false
  let ultimoX = 0
  let giroUsuario = 0
  let velGiro = 0
  let puntero = null
  contenedor.addEventListener('pointerdown', e => {
    arrastrando = true
    puntero = e.pointerId
    ultimoX = e.clientX
    velGiro = 0
    try { contenedor.setPointerCapture(e.pointerId) } catch { /* sin captura: sigue igual */ }
  })
  contenedor.addEventListener('pointermove', e => {
    if (!arrastrando || e.pointerId !== puntero) return
    const dx = e.clientX - ultimoX
    ultimoX = e.clientX
    // Una pantalla de ancho es algo más de una vuelta.
    const giro = (dx / Math.max(contenedor.clientWidth, 1)) * Math.PI * 2.4
    giroUsuario += giro
    velGiro = giro
  })
  const soltar = e => {
    if (e.pointerId !== puntero) return
    arrastrando = false
    puntero = null
  }
  contenedor.addEventListener('pointerup', soltar)
  contenedor.addEventListener('pointercancel', soltar)

  // --- el bucle, solo con la portada a la vista ---
  let activo = false
  let pedido = 0
  let t0 = performance.now()
  let proximoRelampago = 3 + Math.random() * 5
  let luzRelampago = 0

  function dibujar (ahora) {
    if (!activo) return
    pedido = requestAnimationFrame(dibujar)
    const t = (ahora - t0) / 1000
    const dt = 1 / 60

    // Respira, se balancea y mira a un lado y a otro.
    const respira = Math.sin(t * 1.3)
    jefe.scale.set(1 + respira * 0.006, 1 + respira * 0.012, 1 + respira * 0.01)
    // El giro del dedo manda; el balanceo se suma encima, más suave mientras se
    // arrastra. Al soltar sigue girando con inercia y se frena solo.
    if (!arrastrando) {
      giroUsuario += velGiro
      velGiro *= 0.93
      if (Math.abs(velGiro) < 0.0004) velGiro = 0
    }
    const balanceo = Math.sin(t * 0.23) * 0.22 + Math.sin(t * 0.61) * 0.05
    jefe.rotation.y = giroUsuario + balanceo * (arrastrando ? 0.2 : 1)
    jefe.rotation.z = Math.sin(t * 0.37) * 0.015
    jefe.position.y = Math.sin(t * 1.3 + 0.6) * 0.015
    if (cuerpo) cuerpo.rotation.x = Math.sin(t * 0.5) * 0.02

    // La cámara se acerca y se aleja muy despacio, un poco por debajo de los
    // ojos: así el jefe se ve enorme.
    camara.position.set(Math.sin(t * 0.11) * 0.6, 1.9 + Math.sin(t * 0.17) * 0.12, 7.6 + Math.sin(t * 0.09) * 0.4)
    camara.lookAt(MIRA.x, MIRA.y + 0.2, MIRA.z)

    // Luces que laten.
    const late = 0.5 + 0.5 * Math.sin(t * 2.1)
    contraIzq.intensity = 16 + late * 10
    contraDer.intensity = 12 + (1 - late) * 8
    luzOjos.intensity = 2 + late * 3
    ojoMat.color.setHSL(0.39, 1, 0.55 + late * 0.2)

    // Relámpago de vez en cuando: dos destellos seguidos.
    proximoRelampago -= dt
    if (proximoRelampago <= 0) {
      luzRelampago = 1
      proximoRelampago = 5 + Math.random() * 7
    }
    luzRelampago = Math.max(0, luzRelampago - dt * 2.2)
    const destello = luzRelampago > 0.55 ? luzRelampago : luzRelampago > 0.3 ? 0 : luzRelampago * 1.4
    relampago.intensity = destello * 6
    escena.background.setHex(FONDO).lerp(new THREE.Color(claro ? 0xffffff : 0x1a2630), destello * 0.6)

    // Niebla y esporas.
    for (const s of nieblas) {
      s.position.x += s.userData.v * dt
      if (s.position.x > 5) s.position.x = -5
      if (s.position.x < -5) s.position.x = 5
    }
    const p = geoEsporas.attributes.position
    for (let i = 0; i < N_ESPORAS; i++) {
      let y = p.getY(i) + dt * (0.12 + (i % 5) * 0.03)
      if (y > 5) y = 0
      p.setY(i, y)
      p.setX(i, p.getX(i) + Math.sin(t + i) * 0.0015)
    }
    p.needsUpdate = true

    renderer.render(escena, camara)
  }

  function visible () {
    const portada = document.getElementById('overlay')
    if (!portada || portada.classList.contains('hidden') || !portada.querySelector('.panel-portada')) return false
    return !CAPAS_ENCIMA.some(id => {
      const c = document.getElementById(id)
      return c && !c.classList.contains('hidden')
    })
  }

  function revisar () {
    const debe = visible() && !document.hidden
    contenedor.classList.toggle('hidden', !visible())
    if (debe && !activo) {
      activo = true
      ajustar()
      t0 = performance.now() - 2000
      pedido = requestAnimationFrame(dibujar)
    } else if (!debe && activo) {
      activo = false
      cancelAnimationFrame(pedido)
    }
  }

  const observador = new MutationObserver(revisar)
  for (const id of ['overlay', ...CAPAS_ENCIMA]) {
    const el = document.getElementById(id)
    if (el) observador.observe(el, { attributes: true, attributeFilter: ['class'], childList: id === 'overlay' })
  }
  document.addEventListener('visibilitychange', revisar)
  revisar()

  return { revisar }
}
