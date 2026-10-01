// El fuego (01/10/2026). Isidro: «el fuego parece gas y no tiene ninguna forma».
//
// Antes, llamarada, explosión y napalm eran bolas naranjas que se encogían.
// Ahora cada llama es una LÁMINA que pasa los fotogramas de un fuego simulado
// de verdad en Blender (herramientas/blender/fuego.py → public/fuego/*.webp,
// 64 fotogramas en una hoja de 8 × 8). Tres hojas:
//
//   llama      una hoguera que arde sin parar: suelo ardiendo, muro de napalm,
//              bichos en llamas.
//   chorro     el chorro del lanzallamas, tumbado a lo largo del disparo.
//   explosion  de la bola de fuego al humo, una sola vez.
//
// Cada hoja es UNA malla con instancias: cien llamas son una llamada de
// dibujo, que es lo que le importa a un móvil. La lámina se orienta en el
// sombreador: de pie y de cara a la cámara (llama, explosión) o tendida a lo
// largo de un eje y girada hacia la cámara (chorro). Entre fotograma y
// fotograma se funde, así 64 fotogramas no dan saltos a 60 por segundo.

import * as THREE from 'three'
import { brilla } from './resplandor.js'

const VERT = /* glsl */`
  attribute vec3 centro;
  attribute vec3 eje;
  attribute vec2 tam;
  attribute float cuadro;
  attribute float alfa;
  uniform vec4 recorte;      // qué trozo del fotograma se usa (u0, v0, u1, v1)
  uniform float tumbado;     // 1: la imagen va a lo largo del eje (chorro)
  varying vec2 vUv;
  varying float vCuadro;
  varying float vAlfa;
  void main () {
    vec3 aCamara = normalize(cameraPosition - centro);
    vec3 lado = normalize(cross(eje, aCamara));
    // position.x va de -0,5 a 0,5 (ancho) y position.y de 0 a 1 (a lo largo del eje).
    vec3 p = centro + eje * position.y * tam.y + lado * position.x * tam.x;
    vec2 uv = tumbado > 0.5 ? vec2(position.y, position.x + 0.5) : vec2(position.x + 0.5, position.y);
    vUv = mix(recorte.xy, recorte.zw, uv);
    vCuadro = cuadro;
    vAlfa = alfa;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`

const FRAG = /* glsl */`
  uniform sampler2D hoja;
  uniform float bucle;       // 1: el último fotograma se funde con el primero
  varying vec2 vUv;
  varying float vCuadro;
  varying float vAlfa;
  vec4 fotograma (float k) {
    float col = mod(k, 8.0);
    float fila = floor(k / 8.0);
    return texture2D(hoja, vec2((col + vUv.x) / 8.0, 1.0 - (fila + 1.0 - vUv.y) / 8.0));
  }
  void main () {
    float a = floor(vCuadro);
    float b = bucle > 0.5 ? mod(a + 1.0, 64.0) : min(a + 1.0, 63.0);
    vec4 c = mix(fotograma(a), fotograma(b), fract(vCuadro));
    gl_FragColor = vec4(c.rgb, c.a * vAlfa);
    if (gl_FragColor.a < 0.01) discard;
    #include <colorspace_fragment>
  }`

// La lámina: ancho centrado en x, y el alto subiendo desde la base.
function lamina () {
  const g = new THREE.InstancedBufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

function capa (scene, archivo, cupo, { bucle, tumbado = false, recorte = [0, 0, 1, 1] }) {
  const g = lamina()
  const datos = {
    centro: new Float32Array(cupo * 3), eje: new Float32Array(cupo * 3), tam: new Float32Array(cupo * 2),
    cuadro: new Float32Array(cupo), alfa: new Float32Array(cupo)
  }
  const tamaños = { centro: 3, eje: 3, tam: 2, cuadro: 1, alfa: 1 }
  for (const [k, v] of Object.entries(datos)) {
    const a = new THREE.InstancedBufferAttribute(v, tamaños[k])
    a.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute(k, a)
  }
  const tex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}fuego/${archivo}.webp`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false          // con mipmaps, cada fotograma se mancha del de al lado
  tex.minFilter = tex.magFilter = THREE.LinearFilter
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      hoja: { value: tex }, bucle: { value: bucle ? 1 : 0 }, tumbado: { value: tumbado ? 1 : 0 },
      recorte: { value: new THREE.Vector4(...recorte) }
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  })
  const malla = new THREE.Mesh(g, mat)
  malla.frustumCulled = false
  malla.renderOrder = 6
  g.instanceCount = 0
  brilla(malla)
  scene.add(malla)
  return { g, datos, cupo, vivas: [], bucle }
}

export function crearFuego (scene) {
  // Los recortes salen de MEDIR las hojas (la caja de lo que no es transparente
  // en los 64 fotogramas): la llama ocupa el centro de su fotograma, el chorro
  // una franja a media altura y la explosión los tres cuartos de abajo.
  const capas = {
    llama: capa(scene, 'llama', 180, { bucle: true, recorte: [0.2, 0.03, 0.74, 0.99] }),
    chorro: capa(scene, 'chorro', 24, { bucle: true, tumbado: true, recorte: [0.01, 0.25, 0.9, 0.75] }),
    explosion: capa(scene, 'explosion', 24, { bucle: false, recorte: [0.04, 0, 0.92, 0.75] })
  }
  const ARRIBA = new THREE.Vector3(0, 1, 0)
  const chorros = new Map()

  function nueva (c, s) {
    if (c.vivas.length >= c.cupo) {
      // Sin sitio: se recicla la que menos le queda.
      let peor = 0
      for (let i = 1; i < c.vivas.length; i++) if (c.vivas[i].vida - c.vivas[i].t < c.vivas[peor].vida - c.vivas[peor].t) peor = i
      c.vivas.splice(peor, 1)
    }
    c.vivas.push(s)
    return s
  }

  return {
    // Una llama que arde `dura` segundos en un sitio, o pegada a algo que se
    // mueve (`sigue`: un objeto con `position`). Devuelve la llama: ponerle
    // `t = 0` la reaviva sin crear otra.
    llama (x, y, z, { ancho = 1.5, alto = 2.4, dura = 1.5, sigue = null, sube = 0 } = {}) {
      return nueva(capas.llama, {
        x, y, z, w: ancho, h: alto, t: 0, vida: dura, cuadro: Math.random() * 64, fps: 22 + Math.random() * 6,
        eje: ARRIBA, sigue, sube, entra: 0.18, sale: 0.35
      })
    },

    // La explosión entera: 64 fotogramas en algo más de dos segundos.
    explosion (x, y, z, tam = 7) {
      return nueva(capas.explosion, {
        x, y, z, w: tam, h: tam * 0.85, t: 0, vida: 2.3, cuadro: 0, fps: 64 / 2.3, eje: ARRIBA, entra: 0, sale: 0.5
      })
    },

    // El chorro del lanzallamas de un soldado. Se llama en cada disparo: mientras
    // sigan llegando llamadas el chorro se mantiene; al parar, se apaga solo.
    chorro (id, desde, dirZ, largo) {
      let s = chorros.get(id)
      if (!s || s.t >= s.vida) {
        s = nueva(capas.chorro, { t: 0, vida: 0.4, cuadro: Math.random() * 64, fps: 30, entra: 0.08, sale: 0.22, eje: new THREE.Vector3() })
        chorros.set(id, s)
      } else if (s.t > 0.1) s.t = 0.1          // reavivado: se queda en lo alto, sin volver a entrar
      s.x = desde.x; s.y = desde.y; s.z = desde.z
      s.eje.set(0, 0.04, dirZ).normalize()
      s.w = 1.9; s.h = largo
    },

    update (dt) {
      for (const c of Object.values(capas)) {
        const v = c.vivas
        for (let i = v.length - 1; i >= 0; i--) {
          const s = v[i]
          s.t += dt
          if (s.t >= s.vida) { v.splice(i, 1); continue }
          s.cuadro += dt * s.fps
          if (c.bucle) s.cuadro %= 64
          else s.cuadro = Math.min(63, s.cuadro)
          if (s.sigue) { s.x = s.sigue.position.x; s.y = s.sigue.position.y + s.sube; s.z = s.sigue.position.z }
        }
        // De lejos a cerca, que es como se mezclan bien las transparencias (la
        // cámara mira hacia -z).
        v.sort((a, b) => a.z - b.z)
        const d = c.datos
        for (let i = 0; i < v.length; i++) {
          const s = v[i]
          d.centro[i * 3] = s.x; d.centro[i * 3 + 1] = s.y; d.centro[i * 3 + 2] = s.z
          d.eje[i * 3] = s.eje.x; d.eje[i * 3 + 1] = s.eje.y; d.eje[i * 3 + 2] = s.eje.z
          d.tam[i * 2] = s.w; d.tam[i * 2 + 1] = s.h
          d.cuadro[i] = s.cuadro
          const entra = s.entra ? Math.min(1, s.t / s.entra) : 1
          const sale = Math.min(1, (s.vida - s.t) / s.sale)
          d.alfa[i] = entra * sale
        }
        c.g.instanceCount = v.length
        for (const k of Object.keys(d)) c.g.attributes[k].needsUpdate = true
      }
      for (const [id, s] of chorros) if (s.t >= s.vida) chorros.delete(id)
    },

    limpiar () {
      for (const c of Object.values(capas)) { c.vivas.length = 0; c.g.instanceCount = 0 }
      chorros.clear()
    },

    // Para medir en desarrollo.
    cuantas: () => Object.fromEntries(Object.entries(capas).map(([k, c]) => [k, c.vivas.length]))
  }
}
