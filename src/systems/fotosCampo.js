import * as THREE from 'three'
import { ZOMBIES, SOLDIERS, DEFENSES } from '../config.js'
import { buildSoldierMesh, buildSandbagsMesh, buildZombieMesh } from '../assets.js'

// Las figuras del campo del rival, fotografiadas.
//
// La pantalla del rival era un lienzo con círculos de colores sobre rayas: se
// entendía, pero parecía un plano de metro, no una partida. Lo que quería
// Isidro es que se vea como una CÁMARA apuntando a su campo, con los alienz
// reconocibles, y sin que eso cueste rendimiento.
//
// La forma barata de conseguirlo es la de siempre en los videojuegos: no montar
// un segundo mundo en tres dimensiones, sino FOTOGRAFIAR las figuras de verdad
// una vez y estampar esas fotos en el lienzo, más pequeñas cuanto más lejos
// estén. El Coloso de la cámara es el Coloso del juego, no un dibujo aparte; si
// mañana cambia el modelo, cambia la cámara sola. Y por fotograma no se gasta
// nada: son `drawImage`, no geometría ni luces.
//
// Dos poses por huésped, no una: con una sola la figura se ve resbalar por el
// asfalto, y alternando dos —pierna adelantada y pierna atrasada— se ve andar.
//
// El ángulo es el MISMO que el de la cámara del juego (25° de picado, mirando
// hacia -Z), y eso importa para dos cosas: que la cámara del rival encaje con
// la vista a la que el jugador está acostumbrado, y que la foto se pueda medir.
// Al fotografiar con una cámara ortográfica se sabe exactamente cuántas
// unidades de mundo mide cada foto, así que al pintarla se le puede dar el
// tamaño exacto que le tocaría a esa distancia.
//
// Coste: unas treinta fotos pequeñas, una sola vez, al ENTRAR en el duelo (no
// al arrancar el juego: en campaña esto no se usa). Unos dos megas de memoria
// de vídeo y medio segundo de trabajo repartido para no atascar la pantalla.

const ALTO = 128            // alto de cada foto en píxeles; el ancho, según la figura
const PICADO = THREE.MathUtils.degToRad(25)
// Las dos poses: zancada hacia un lado y hacia el otro, que es donde más se
// diferencian las piernas. En el medio la figura está de paso y se ve plana.
const FASES = [Math.PI / 2, -Math.PI / 2]

const respirar = () => new Promise(r => {
  let hecho = false
  const una = () => { if (!hecho) { hecho = true; r() } }
  requestAnimationFrame(una)
  setTimeout(una, 60)
})

// La pose de andar, la misma cuenta que hace `zombie.js` en cada fotograma. Se
// copia en vez de llamarla porque allí vive dentro del `update` de la entidad, y
// aquí no hay entidad: hay una figura suelta a la que hay que ponerle una pose
// para el retrato.
export function posarAndando (malla, fase) {
  // Los modelos con esqueleto se colocan solos al dibujarse: leen estos dos
  // datos en su `onBeforeRender` (ver `alienDeMeshy` en assets.js).
  malla.userData.andando = true
  malla.userData.fasePaso = fase
  const limbs = malla.userData.limbs
  if (!limbs) return
  const swing = Math.sin(fase)
  const lag = Math.sin(fase - 0.7)
  limbs.legL.rotation.x = swing * 0.6
  limbs.legR.rotation.x = -swing * 0.6
  limbs.legL.userData.lower.rotation.x = limbs.legL.userData.restBend - Math.max(0, -lag) * 0.7
  limbs.legR.userData.lower.rotation.x = limbs.legR.userData.restBend - Math.max(0, lag) * 0.7
  limbs.armL.rotation.x = 1.32 + swing * 0.1
  limbs.armR.rotation.x = 1.2 - swing * 0.1
  limbs.armL.userData.lower.rotation.x = limbs.armL.userData.restBend + swing * 0.12
  limbs.armR.userData.lower.rotation.x = limbs.armR.userData.restBend - swing * 0.12
  if (malla.userData.lean) malla.userData.lean.rotation.z = swing * 0.07
}

// Los puntos con los que medir la figura.
//
// `Box3.setFromObject` no sirve con mallas de esqueleto: devuelve la caja de la
// pose de reposo del archivo, que no tiene nada que ver con lo que se ve. Con
// esqueleto se miden los HUESOS, que sí llevan su transformación de verdad, y
// luego se engorda un poco el resultado porque los huesos van por dentro de la
// carne.
function puntosDe (raiz) {
  raiz.updateMatrixWorld(true)
  const ps = []
  let conEsqueleto = false
  raiz.traverse(o => {
    if (o.isSkinnedMesh) { conEsqueleto = true; return }
    if (o.isBone) { ps.push(o.getWorldPosition(new THREE.Vector3())); return }
    if (!o.isMesh || !o.geometry) return
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox
    if (!b) return
    for (let i = 0; i < 8; i++) {
      ps.push(new THREE.Vector3(
        i & 1 ? b.max.x : b.min.x,
        i & 2 ? b.max.y : b.min.y,
        i & 4 ? b.max.z : b.min.z
      ).applyMatrix4(o.matrixWorld))
    }
  })
  return { ps, conEsqueleto }
}

export async function fotografiarCampo (renderer, alAvanzar) {
  const fotos = new Map()
  const escena = new THREE.Scene()

  // Luz de exterior, no de retrato: aquí la figura va a caer sobre una
  // carretera vista desde lejos, así que interesa que se lea la silueta y que
  // el volumen se note un poco, nada más.
  const sol = new THREE.DirectionalLight(0xfff2de, 2.3)
  sol.position.set(-1.8, 3.2, 2.6)
  const relleno = new THREE.DirectionalLight(0xbcd2ff, 0.7)
  relleno.position.set(2.6, 1.4, 1.8)
  escena.add(sol, relleno, new THREE.HemisphereLight(0xcfe0ff, 0x6a5c48, 0.75))

  // Ortográfica a propósito: sin perspectiva, la foto mide lo mismo arriba que
  // abajo y se puede convertir a píxeles con una multiplicación.
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60)
  const desde = new THREE.Vector3(0, Math.sin(PICADO), Math.cos(PICADO)).multiplyScalar(18)
  camara.position.copy(desde)
  camara.lookAt(0, 0, 0)
  camara.updateMatrixWorld(true)
  const aCamara = camara.matrixWorldInverse.clone()
  // El suelo bajo la figura, en coordenadas de la cámara: es el punto que se
  // usará de ancla al pintar (los pies van ahí).
  const ySuelo = new THREE.Vector3(0, 0, 0).applyMatrix4(aCamara).y

  const objetivo = new THREE.WebGLRenderTarget(256, ALTO, { colorSpace: THREE.SRGBColorSpace, samples: 4 })
  const previo = {
    target: renderer.getRenderTarget(),
    clearAlpha: renderer.getClearAlpha(),
    clearColor: renderer.getClearColor(new THREE.Color())
  }
  renderer.setClearColor(0x000000, 0)

  const total = Object.keys(ZOMBIES).length + Object.keys(SOLDIERS).length + Object.keys(DEFENSES).length
  let hechas = 0

  const medir = malla => {
    const { ps, conEsqueleto } = puntosDe(malla)
    if (!ps.length) return null
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity
    const v = new THREE.Vector3()
    for (const p of ps) {
      v.copy(p).applyMatrix4(aCamara)
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x)
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y)
    }
    // Los huesos van por dentro: se engorda la caja lo que abulta la carne.
    if (conEsqueleto) {
      const g = (y1 - y0) * 0.13
      x0 -= g; x1 += g; y0 -= g * 0.5; y1 += g
    }
    return { x0, x1, y0, y1 }
  }

  const fotografiar = async (clave, malla, poses) => {
    escena.add(malla)
    // La caja se mide con las dos poses puestas y se queda la que las abarca:
    // así las dos fotos salen del mismo tamaño y encajan una sobre otra al
    // alternarlas. Si cada pose llevara su encuadre, la figura daría un brinco
    // en cada paso.
    let caja = null
    for (const f of poses) {
      // `null` es «déjala como está»: los defensores se quedan en su postura de
      // apuntar. Poniéndoles la pose de andar salían con los brazos abiertos en
      // cruz, que es la pose de un huésped, no la de alguien con un fusil.
      if (f != null) posarAndando(malla, f)
      malla.updateMatrixWorld(true)
      const m = medir(malla)
      if (!m) continue
      caja = caja
        ? { x0: Math.min(caja.x0, m.x0), x1: Math.max(caja.x1, m.x1), y0: Math.min(caja.y0, m.y0), y1: Math.max(caja.y1, m.y1) }
        : m
    }
    if (!caja) { escena.remove(malla); return }
    const margen = (caja.y1 - caja.y0) * 0.04
    caja.x0 -= margen; caja.x1 += margen; caja.y0 -= margen; caja.y1 += margen
    const alto = caja.y1 - caja.y0
    const ancho = caja.x1 - caja.x0
    const h = ALTO
    const w = Math.max(16, Math.min(256, Math.round(ALTO * ancho / Math.max(alto, 1e-4))))

    camara.left = caja.x0; camara.right = caja.x1
    camara.top = caja.y1; camara.bottom = caja.y0
    camara.updateProjectionMatrix()
    objetivo.setSize(w, h)
    renderer.setRenderTarget(objetivo)

    const buffer = new Uint8Array(w * h * 4)
    const cuadros = []
    for (const f of poses) {
      if (f != null) posarAndando(malla, f)
      malla.updateMatrixWorld(true)
      // El fondo transparente se pide ANTES DE CADA foto, no una vez al
      // empezar: entre foto y foto se le cede el hilo al navegador para que la
      // pantalla no se quede tiesa, y en ese hueco el juego dibuja su fotograma
      // y deja puesto el color de cielo del nivel. Las figuras salian con un
      // recuadro negro alrededor, como pegatinas mal recortadas.
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      renderer.render(escena, camara)
      renderer.readRenderTargetPixels(objetivo, 0, 0, w, h, buffer)
      const lienzo = document.createElement('canvas')
      lienzo.width = w
      lienzo.height = h
      const ctx = lienzo.getContext('2d')
      const img = ctx.createImageData(w, h)
      // WebGL entrega las filas de abajo arriba.
      for (let y = 0; y < h; y++) {
        const o = (h - 1 - y) * w * 4
        img.data.set(buffer.subarray(o, o + w * 4), y * w * 4)
      }
      ctx.putImageData(img, 0, 0)
      cuadros.push(lienzo)
    }

    fotos.set(clave, {
      cuadros,
      alto,                       // lo que mide la foto en unidades de mundo…
      ancho,                      // …de alto y de ancho, medido en el plano de la cámara
      pie: caja.y0 - ySuelo       // cuánto cae el borde de abajo por debajo del suelo
    })

    escena.remove(malla)
    malla.traverse(o => { if (o.isMesh && o.userData.fundida) o.geometry.dispose() })
    alAvanzar?.(++hechas, total, clave)
    await respirar()
  }

  for (const [clave, spec] of Object.entries(ZOMBIES)) {
    try { await fotografiar(clave, await buildZombieMesh(clave, spec), FASES) } catch (e) { console.warn('Sin foto de', clave, e) }
  }
  // Los defensores no andan: se quedan en su casilla disparando, así que con
  // una pose basta y se ahorra la mitad de memoria.
  for (const [clave, spec] of Object.entries(SOLDIERS)) {
    try { await fotografiar(clave, await buildSoldierMesh(clave, spec), [null]) } catch (e) { console.warn('Sin foto de', clave, e) }
  }
  for (const [clave, spec] of Object.entries(DEFENSES)) {
    try {
      const malla = buildSandbagsMesh(spec)
      await fotografiar(clave, malla, [null])
    } catch (e) { console.warn('Sin foto de', clave, e) }
  }

  renderer.setRenderTarget(previo.target)
  renderer.setClearColor(previo.clearColor, previo.clearAlpha)
  objetivo.dispose()
  return fotos
}
