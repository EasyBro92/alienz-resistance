import * as THREE from 'three'

// Calidad gráfica.
//
// Tres niveles y un modo automático. El automático es el que manda por defecto,
// porque es el único que puede acertar: un móvil de hace cinco años y uno de
// este año son el mismo código pidiendo cosas muy distintas, y nadie entra en
// los ajustes de un juego antes de haber jugado.
//
// Qué se recorta y en qué orden NO es arbitrario. Va de lo que menos se ve a lo
// que más:
//   1. La resolución de dibujado. En una pantalla de móvil, bajar de 2x a 1,5x
//      es casi invisible con el dedo a treinta centímetros y ahorra la mitad
//      del trabajo de pintado. Es el primer recorte siempre.
//   2. El resplandor. Es un halo, no información: sin él la espora se sigue
//      viendo verde, solo deja de derramarse.
//   3. Las sombras. Lo último, porque son lo que mete a las figuras dentro de
//      la escena en vez de dejarlas pegadas encima.
// Las partículas acompañan a cada escalón: no cuestan tanto como para ser un
// escalón propio, pero en una explosión grande se notan.

const CLAVE = 'alienz-calidad-v1'

export const NIVELES = {
  alta: {
    nombre: 'Alta',
    detalle: 'Todo al máximo. Resolución doble, sombras suaves y resplandor.',
    pixeles: 2, sombras: 2048, suaves: true, resplandor: true, particulas: 1
  },
  media: {
    nombre: 'Media',
    detalle: 'Resolución a la mitad y sombras más duras. Se ve casi igual.',
    pixeles: 1.5, sombras: 1024, suaves: false, resplandor: true, particulas: 0.7
  },
  baja: {
    nombre: 'Baja',
    detalle: 'Sin sombras ni resplandor. Para que vaya fino cueste lo que cueste.',
    pixeles: 1, sombras: 0, suaves: false, resplandor: false, particulas: 0.45
  }
}

const ORDEN = ['baja', 'media', 'alta']

// --- lo que el automático vigila ---------------------------------------------
// Se mide la MEDIANA, no la media: un solo fotograma largo —el navegador
// recogiendo basura, el sistema haciendo algo por su cuenta— arrastra la media
// y haría bajar la calidad por un tropiezo que no se repite.
const VENTANA = 90          // fotogramas por medición: metro y medio de segundo
const LENTO = 21            // por encima de esto, sobra calidad puesta
const HOLGADO = 12          // por debajo, cabe subir
const ESPERA = 4            // segundos mínimos entre cambios

export function leerPreferencia () {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'alta' || v === 'media' || v === 'baja' || v === 'auto' ? v : 'auto'
  } catch { return 'auto' }
}

function guardarPreferencia (v) {
  try { localStorage.setItem(CLAVE, v) } catch { /* modo privado: se pierde al salir */ }
}

export function crearCalidad ({ renderer, sun, resplandor, effects, alCambiar }) {
  let preferencia = leerPreferencia()
  // El automático empieza arriba y baja si hace falta. Al revés —empezar abajo y
  // subir— el jugador vería los primeros segundos feos en un móvil que puede con
  // todo, y esa es justo la primera impresión.
  let actual = preferencia === 'auto' ? 'alta' : preferencia

  const muestras = []
  let desdeElCambio = 0
  let arrancando = 1.5      // segundos de cortesía: los primeros fotogramas de
                            // una escena nueva siempre son lentos por compilar

  function aplicar (clave) {
    const n = NIVELES[clave]
    if (!n) return
    actual = clave

    renderer.setPixelRatio(Math.min(devicePixelRatio, n.pixeles))

    if (n.sombras === 0) {
      renderer.shadowMap.enabled = false
    } else {
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = n.suaves ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap
      if (sun.shadow.mapSize.width !== n.sombras) {
        sun.shadow.mapSize.set(n.sombras, n.sombras)
        // Sin tirar el mapa viejo, three.js se queda con el del tamaño anterior:
        // el cambio no se ve hasta que algo más lo obligue a rehacerlo.
        sun.shadow.map?.dispose()
        sun.shadow.map = null
      }
      renderer.shadowMap.needsUpdate = true
    }

    // Se apunta el escalón al que ha llegado el ajuste automático. La calidad de
    // dibujado se cambia en caliente, pero cuánta geometría lleva cada figura se
    // decide al construirla: si este móvil ha acabado en «baja» hoy, mañana
    // conviene construir ya en bajo desde el principio, sin esperar a que se
    // trabe otra vez para descubrirlo. Lo lee `detalle.js` al arrancar.
    if (preferencia === 'auto') {
      try { localStorage.setItem('alienz-detalle-v1', clave) } catch { /* modo privado */ }
    }

    resplandor.activo = n.resplandor
    effects.setDensidad?.(n.particulas)
    alCambiar?.()
  }

  aplicar(actual)

  return {
    get nivel () { return actual },
    get preferencia () { return preferencia },
    get automatico () { return preferencia === 'auto' },

    elegir (v) {
      preferencia = v
      guardarPreferencia(v)
      muestras.length = 0
      desdeElCambio = 0
      arrancando = 1
      // Al volver a automático se sube del todo y se deja que vuelva a bajar si
      // hace falta. Si se quedara donde estaba, alguien que probó "Baja" y
      // volvió a "Auto" seguiría viendo el juego feo sin entender por qué:
      // el automático solo baja, nunca sube por encima de donde lo dejaron.
      aplicar(v === 'auto' ? 'alta' : v)
    },

    // Se llama con el tiempo REAL del fotograma, sin recortar. El bucle limita
    // `dt` a 50 ms para que la simulación no dé saltos, y con ese número
    // recortado un móvil ahogado parecería ir a veinte fotogramas justos.
    medir (msReales) {
      if (preferencia !== 'auto') return
      if (arrancando > 0) { arrancando -= msReales / 1000; return }

      desdeElCambio += msReales / 1000
      muestras.push(msReales)
      if (muestras.length < VENTANA) return

      const orden = [...muestras].sort((a, b) => a - b)
      const mediana = orden[orden.length >> 1]
      muestras.length = 0
      if (desdeElCambio < ESPERA) return

      const i = ORDEN.indexOf(actual)
      if (mediana > LENTO && i > 0) {
        desdeElCambio = 0
        aplicar(ORDEN[i - 1])
      } else if (mediana < HOLGADO && i < ORDEN.length - 1) {
        // Subir cuesta más que bajar: si sube y vuelve a ir lento, el jugador ve
        // la calidad oscilando, que molesta más que quedarse un escalón por
        // debajo de lo que el móvil podría dar.
        desdeElCambio = -ESPERA
        aplicar(ORDEN[i + 1])
      }
    }
  }
}
