import * as THREE from 'three'

const BAR_GEO = new THREE.PlaneGeometry(1, 0.2)
const MARCO_GEO = new THREE.PlaneGeometry(1.1, 0.32)

// Distancia a la que la barra se ve a su tamaño nominal. Más cerca se encoge y
// más lejos se agranda, de forma que en pantalla mide SIEMPRE lo mismo.
const REFERENCIA = 34

// Barra de vida que siempre mira a cámara. Solo aparece cuando la unidad está
// tocada, para no llenar la pantalla de interfaz.
//
// El tamaño se compensa con la distancia. Antes era una barra de 1,4 × 0,14
// unidades del mundo, y un huésped recién salido está a más de cuarenta de la
// cámara: la barra medía ahí unos ocho píxeles de ancho por uno de alto y no
// había forma de verla. La compensación tiene tope por arriba y por abajo, para
// que ni el fondo de la carretera se llene de barras enormes ni la de un
// Coloso a un palmo de la base tape media pantalla.
export function createHealthBar (width = 1, y = 2) {
  const group = new THREE.Group()

  // Marco oscuro por detrás: sobre la arena clara, una barra verde sin borde se
  // desvanecía; el rojo del final se confundía con las manchas del asfalto.
  const marco = new THREE.Mesh(MARCO_GEO, new THREE.MeshBasicMaterial({
    color: 0x0d1117, depthTest: false, transparent: true, opacity: 0.85
  }))
  const back = new THREE.Mesh(BAR_GEO, new THREE.MeshBasicMaterial({
    color: 0x3a2c2c, depthTest: false, transparent: true
  }))
  const fill = new THREE.Mesh(BAR_GEO, new THREE.MeshBasicMaterial({
    color: 0x5fd97a, depthTest: false, transparent: true
  }))
  marco.renderOrder = 9
  back.renderOrder = 10
  fill.renderOrder = 11
  group.add(marco, back, fill)
  group.position.y = y
  group.visible = false

  // El golpe: al recibir daño la barra da un respingo y vuelve. Es lo que hace
  // que se vea que ha PASADO algo, y no solo que hay menos verde que antes.
  let golpe = 0
  let ratio = 1

  return {
    group,

    set (r) {
      const v = Math.max(0, Math.min(1, r))
      if (v < ratio - 0.0001) golpe = 1
      ratio = v
      group.visible = v < 0.999
      fill.scale.x = v
      fill.position.x = -(1 - v) / 2
      fill.material.color.setHex(v > 0.55 ? 0x5fd97a : v > 0.25 ? 0xf0c445 : 0xe8523f)
    },

    face (camera, dt = 0) {
      if (!group.visible) return

      // Mirar a cámara es una orientación de MUNDO, y `quaternion` es local. La
      // barra cuelga de la figura, y la de un huésped va girada 180° para mirar
      // a la base: al copiar ahí la rotación de la cámara, la barra acababa
      // apuntando justo al lado contrario. Un plano de una cara no se ve por
      // detrás, así que las barras de los huéspedes no se habían visto nunca.
      // Se descuenta la rotación del padre para que la de mundo salga exacta.
      if (group.parent) {
        group.parent.getWorldQuaternion(_q).invert()
        group.quaternion.copy(_q).multiply(camera.quaternion)
      } else {
        group.quaternion.copy(camera.quaternion)
      }

      golpe = Math.max(0, golpe - dt * 4)
      const punch = 1 + golpe * golpe * 0.45

      // Escala igual a la distancia: en perspectiva el tamaño aparente va con
      // 1/d, así que multiplicar por d lo deja clavado en pantalla.
      group.getWorldPosition(_v)
      const d = camera.position.distanceTo(_v)
      const k = Math.min(1.9, Math.max(0.55, d / REFERENCIA))

      // La barra cuelga de la figura, así que hereda su escala: la del Coloso
      // es 3,4 veces la de un Portador y la de los soldados respira con ellos.
      // Se descuenta para que el tamaño en pantalla sea el mismo para todos.
      let padre = 1
      if (group.parent) padre = group.parent.getWorldScale(_e).x || 1
      const s = width * k * punch / padre
      group.scale.set(s, s, 1)
    }
  }
}

const _v = new THREE.Vector3()
const _e = new THREE.Vector3()
const _q = new THREE.Quaternion()
