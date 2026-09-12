import * as THREE from 'three'

// Resplandor: la luz de la espora se derrama fuera de la figura en vez de
// quedarse dentro de su silueta. Es lo que separa "pintura verde" de "algo que
// emite luz", y en un juego de alienígenas es la mitad del carácter.
//
// SELECTIVO, no por umbral de brillo. La escena es un mediodía de desierto: el
// arenal, el cielo y las líneas de la calzada son más brillantes que ninguna
// espora, así que un resplandor por umbral emborronaba el desierto entero y las
// esporas ni se notaban. La capa 1 marca lo que brilla y solo eso entra.
//
// SIN COMPOSITOR. El primer montaje pasaba la escena entera por un
// EffectComposer y costaba 11 ms de los 16 que hay por fotograma. Y no era el
// desenfoque —bajarlo a un tercio de resolución no cambió el número ni una
// décima—: era meter la escena en un destino de coma flotante y sacarla con dos
// pasadas más a pantalla completa. Aquí la escena sigue yendo DIRECTA a
// pantalla, como siempre, y el resplandor es solo un dibujado diminuto de lo que
// emite, dos desenfoques a un tercio de resolución, y un cuadrado sumado encima.
export const CAPA_BRILLO = 1

// A qué fracción de la pantalla se calcula. Es una imagen borrosa por
// definición: nadie ve que el desenfoque se hizo sobre menos píxeles.
const ESCALA = 0.34

const VERT = /* glsl */`
  varying vec2 vUv;
  void main () {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`

// Desenfoque separable: primero en horizontal, luego en vertical. Nueve
// muestras en cada eje salen mucho más baratas que las ochenta y una que
// costaría hacerlo de una sola pasada, y el resultado es el mismo.
const BORRON = /* glsl */`
  uniform sampler2D mapa;
  uniform vec2 paso;
  varying vec2 vUv;
  void main () {
    vec4 c = texture2D(mapa, vUv) * 0.227027;
    c += (texture2D(mapa, vUv + paso * 1.3846) + texture2D(mapa, vUv - paso * 1.3846)) * 0.316216;
    c += (texture2D(mapa, vUv + paso * 3.2308) + texture2D(mapa, vUv - paso * 3.2308)) * 0.070270;
    gl_FragColor = c;
  }`

const SUMA = /* glsl */`
  uniform sampler2D mapa;
  uniform float fuerza;
  varying vec2 vUv;
  void main () {
    gl_FragColor = texture2D(mapa, vUv) * fuerza;
  }`

// Marca como "brilla" todo lo que tenga emisión de verdad. Se llama con la raíz
// de cada cosa nueva que entra en la escena; recorrerla entera cada fotograma
// para averiguarlo costaría más que el propio efecto.
export function marcarBrillo (raiz) {
  raiz.traverse(o => {
    if (!o.isMesh || !o.material) return
    const m = o.material
    if (m.emissive && m.emissive.getHex() !== 0x000000 && (m.emissiveIntensity ?? 1) > 0.4) {
      o.layers.enable(CAPA_BRILLO)
    }
  })
}

// Apunta a mano una malla que debe resplandecer. Hace falta para lo que es luz
// pero no lleva material con emisión: el fogonazo, la trazadora, las llamas.
// Se marca la malla y todo lo que cuelgue de ella.
export function brilla (obj) {
  obj.traverse ? obj.traverse(o => o.layers.enable(CAPA_BRILLO)) : obj.layers.enable(CAPA_BRILLO)
  return obj
}

// Quita la luz propia que traen de fábrica los modelos de fuera.
//
// Los modelos de Meshy salen con una textura de emisión al cien por cien: los
// soldados y las naves se iluminaban solos y además `marcarBrillo` los metía en
// el halo por tener emisión, así que en calidad alta parecían fluorescentes. Lo
// que brilla en este juego lo decide el juego —el fogonazo, el cañón al rojo,
// las balizas—, no el exportador de un modelo.
export function apagarEmision (raiz) {
  raiz.traverse(o => {
    if (!o.isMesh) return
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.emissive) continue
      m.emissive.setHex(0x000000)
      m.emissiveMap = null
      m.emissiveIntensity = 0
      m.needsUpdate = true
    }
  })
  return raiz
}

function destino (w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    // Bytes, no coma flotante: es un halo de colores saturados, no hay rango
    // dinámico que preservar, y el destino flotante es justo lo que costaba caro.
    type: THREE.UnsignedByteType,
    depthBuffer: true
  })
}

export function crearResplandor (renderer, scene, camera) {
  const tam = new THREE.Vector2()
  renderer.getSize(tam)
  let w = Math.max(1, Math.round(tam.x * ESCALA))
  let h = Math.max(1, Math.round(tam.y * ESCALA))

  const a = destino(w, h)
  const b = destino(w, h)

  // Cámara gemela que solo ve la capa que brilla.
  const camBrillo = camera.clone()
  camBrillo.layers.set(CAPA_BRILLO)

  // Un cuadrado a pantalla completa, reutilizado por las tres pasadas.
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
  const escenaQuad = new THREE.Scene()
  escenaQuad.add(quad)
  const camQuad = new THREE.Camera()

  const matBorron = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: null }, paso: { value: new THREE.Vector2() } },
    vertexShader: VERT, fragmentShader: BORRON, depthTest: false, depthWrite: false
  })
  const matSuma = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: a.texture }, fuerza: { value: 1.25 } },
    vertexShader: VERT, fragmentShader: SUMA,
    transparent: true, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false
  })

  function pasada (material, destinoRT) {
    quad.material = material
    renderer.setRenderTarget(destinoRT)
    renderer.render(escenaQuad, camQuad)
  }

  let activo = true
  // El halo se recalcula uno de cada dos fotogramas y se reutiliza en el otro.
  //
  // Lo que cuesta de esta técnica no es el desenfoque —que va a un tercio de
  // resolución sobre un centenar de mallas diminutas—, sino que dibujar la capa
  // que brilla obliga a construir la lista de dibujado de la escena ENTERA por
  // segunda vez: con el tablero lleno son mil ciento cuarenta mallas que hay
  // que recorrer, cribar y ordenar dos veces por fotograma.
  //
  // La cámara está fija y el halo es una mancha borrosa: a treinta veces por
  // segundo no hay forma de notar que va a la mitad de ritmo que el resto, y es
  // la mitad del coste.
  let turno = 0
  const negro = new THREE.Color(0x000000)
  const colorAntes = new THREE.Color()

  return {
    get activo () { return activo },
    set activo (v) { activo = v },
    get fuerza () { return matSuma.uniforms.fuerza.value },
    set fuerza (v) { matSuma.uniforms.fuerza.value = v },

    resize (anchoPantalla, altoPantalla) {
      w = Math.max(1, Math.round(anchoPantalla * ESCALA))
      h = Math.max(1, Math.round(altoPantalla * ESCALA))
      a.setSize(w, h)
      b.setSize(w, h)
    },

    render () {
      if (!activo) {
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
        return
      }

      // 1. Solo lo que emite, sobre negro. Sin cielo ni niebla: sobre azul el
      //    desenfoque teñiría la pantalla entera, y con niebla una espora del
      //    fondo salía blanca azulada en vez de verde.
      if ((turno++ & 1) === 0) {
        const fondo = scene.background
        const niebla = scene.fog
        scene.background = null
        scene.fog = null
        camBrillo.position.copy(camera.position)
        camBrillo.quaternion.copy(camera.quaternion)
        camBrillo.fov = camera.fov
        camBrillo.aspect = camera.aspect
        camBrillo.updateProjectionMatrix()

        renderer.getClearColor(colorAntes)
        const alfaAntes = renderer.getClearAlpha()
        renderer.setClearColor(negro, 1)
        // NADA de sombras en esta pasada. Un renderizado normal reconstruye el
        // mapa de sombras —2048×2048 con las mil trescientas mallas de la
        // escena—, y aquí eso se hacía por segunda vez cada fotograma para una
        // imagen en la que las sombras ni se ven: eran diez de los once
        // milisegundos que costaba el efecto.
        const sombrasAntes = renderer.shadowMap.autoUpdate
        renderer.shadowMap.autoUpdate = false
        renderer.setRenderTarget(a)
        renderer.clear()
        renderer.render(scene, camBrillo)
        renderer.shadowMap.autoUpdate = sombrasAntes
        renderer.setClearColor(colorAntes, alfaAntes)
        scene.background = fondo
        scene.fog = niebla

        // 2. Desenfoque en dos ejes.
        matBorron.uniforms.mapa.value = a.texture
        matBorron.uniforms.paso.value.set(1 / w, 0)
        pasada(matBorron, b)
        matBorron.uniforms.mapa.value = b.texture
        matBorron.uniforms.paso.value.set(0, 1 / h)
        pasada(matBorron, a)
      }

      // 3. La escena, directa a pantalla, sin intermediarios.
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)

      // 4. El halo, sumado encima. `autoClear` apagado, o borraría lo anterior.
      const limpiaba = renderer.autoClear
      renderer.autoClear = false
      matSuma.uniforms.mapa.value = a.texture
      quad.material = matSuma
      renderer.render(escenaQuad, camQuad)
      renderer.autoClear = limpiaba
    }
  }
}
