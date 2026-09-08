import * as THREE from 'three'
import { SOLDIERS, DEFENSES, ZOMBIES } from './config.js'
import { buildSoldierMesh, buildSandbagsMesh, buildZombieMesh } from './assets.js'

// Retratos de la armería.
//
// La ficha enseñaba solo el arma, así que no se veía a QUIÉN estabas comprando.
// En vez de dibujar unas siluetas a mano —que se desincronizarían con el modelo
// a la primera— se fotografía la figura de verdad: se monta cada defensor en una
// escena aparte, se le hace un retrato y se vuelca a una imagen para la ficha.
// Si mañana cambia el modelo, cambia el retrato solo.
//
// Lo mismo vale para los huéspedes. El informe del menú los listaba con una
// etiqueta de color y una frase: nueve filas de texto que nadie lee. Con la cara
// delante, el jugador reconoce al Coloso cuando lo ve bajar por la carretera,
// que es justo para lo que sirve un informe de amenazas.
//
// Coste: veintiún renders de 176x220 una sola vez al arrancar, reutilizando el
// renderer del juego. Cero coste por fotograma.
const ANCHO = 176
const ALTO = 220

export async function renderPortraits (renderer) {
  const escena = new THREE.Scene()

  // Luz propia del retrato, no la del nivel: aquí interesa que se lea la figura,
  // no que encaje en la carretera. Un frontal cálido, un relleno frío desde el
  // lado contrario y un contraluz que despegue la silueta del fondo.
  const key = new THREE.DirectionalLight(0xfff4e2, 2.6)
  key.position.set(-2.2, 3.4, 3.2)
  const fill = new THREE.DirectionalLight(0xbcd6ff, 0.85)
  fill.position.set(3.4, 1.2, 2.2)
  const rim = new THREE.DirectionalLight(0xcfe4ff, 1.5)
  rim.position.set(1.6, 2.6, -3.4)
  escena.add(key, fill, rim, new THREE.HemisphereLight(0xcfe0ff, 0x6a5c48, 0.7))

  // Tres cuartos desde delante y algo por encima: así se ven a la vez la cara,
  // el arma y el hombro con la mochila, que es donde vive la identidad.
  const camara = new THREE.PerspectiveCamera(26, ANCHO / ALTO, 0.1, 40)
  camara.position.set(1.55, 1.62, 3.0)
  camara.lookAt(0, 0.98, 0)

  const objetivo = new THREE.WebGLRenderTarget(ANCHO, ALTO, {
    colorSpace: THREE.SRGBColorSpace,
    samples: 4
  })

  const previo = {
    target: renderer.getRenderTarget(),
    clearAlpha: renderer.getClearAlpha(),
    clearColor: renderer.getClearColor(new THREE.Color())
  }
  renderer.setClearColor(0x000000, 0)   // fondo transparente: la ficha pone el suyo

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  lienzo.height = ALTO
  const ctx = lienzo.getContext('2d')
  const buffer = new Uint8Array(ANCHO * ALTO * 4)
  const imagen = ctx.createImageData(ANCHO, ALTO)

  const retratos = new Map()
  const amenazas = new Map()

  const fotografiar = async (clave, malla, destino = retratos) => {
    // El modelo mira a -Z (hacia los huéspedes); se gira para que dé la cara.
    malla.rotation.y = Math.PI - 0.34
    escena.add(malla)

    renderer.setRenderTarget(objetivo)
    renderer.clear()
    renderer.render(escena, camara)
    renderer.readRenderTargetPixels(objetivo, 0, 0, ANCHO, ALTO, buffer)

    // WebGL entrega las filas de abajo arriba: hay que darle la vuelta o el
    // soldado sale cabeza abajo.
    for (let y = 0; y < ALTO; y++) {
      const origen = (ALTO - 1 - y) * ANCHO * 4
      imagen.data.set(buffer.subarray(origen, origen + ANCHO * 4), y * ANCHO * 4)
    }
    ctx.putImageData(imagen, 0, 0)
    destino.set(clave, lienzo.toDataURL('image/png'))

    escena.remove(malla)
  }

  for (const [clave, spec] of Object.entries(SOLDIERS)) {
    await fotografiar(clave, await buildSoldierMesh(clave, spec))
  }
  for (const [clave, spec] of Object.entries(DEFENSES)) {
    const malla = buildSandbagsMesh(spec)
    malla.position.y = 0.45          // los sacos son bajos: se suben al encuadre
    await fotografiar(clave, malla)
  }

  // Los huéspedes, para el informe de amenazas. Van con su propia cámara: el
  // Coloso es casi el doble de alto que un soldado y con el encuadre de la
  // armería salía sin cabeza, y LA MADRE ni eso.
  for (const [clave, spec] of Object.entries(ZOMBIES)) {
    const malla = await buildZombieMesh(clave, spec)
    const escala = spec.scale ?? 1
    // Se encoge al tamaño de un soldado en vez de alejar la cámara: así los
    // nueve salen del mismo tamaño en la ficha, que es lo que hace que la
    // cuadrícula se lea como una cuadrícula y no como un escaparate desordenado.
    //
    // DIVIDIR, no sustituir: la figura ya viene construida a su escala —y con
    // su pizca de variación por instancia—, así que un `setScalar(1/escala)`
    // dejaba al Coloso a 0,53 en vez de a 1 y salía diminuto en su ficha.
    malla.scale.multiplyScalar(1 / escala)
    await fotografiar(clave, malla, amenazas)
  }

  renderer.setRenderTarget(previo.target)
  renderer.setClearColor(previo.clearColor, previo.clearAlpha)
  objetivo.dispose()

  return { retratos, amenazas }
}
