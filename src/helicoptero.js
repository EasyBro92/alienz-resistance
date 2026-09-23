// La llegada en helicóptero.
//
// Isidro: «que la cámara se vea como soldados llegando en helicóptero, con la
// vista desde los asientos, como pasa en las películas bélicas».
//
// Va todo montado alrededor de la cámara, no al revés: la cabina se coloca cada
// fotograma en la posición y el giro de la cámara, con la geometría escrita en
// coordenadas de cámara (x a la derecha, y arriba, z hacia atrás). Así no hay
// que tocar la jerarquía de la escena ni meter la cámara dentro de nada.
//
// Lo que se ve tiene que quedarse en los BORDES del encuadre: en un móvil de
// 375 px, un asiento en medio de la pantalla tapa la llegada en vez de
// enmarcarla. Por eso son el suelo abajo, el techo arriba, el montante a la
// derecha y el borde de la puerta a la izquierda; el centro queda libre.

import * as THREE from 'three'

const mat = (color, roughness = 0.85, metalness = 0.15) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, fog: false })

const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  g.add(m)
  return m
}

export function crearCabina () {
  const g = new THREE.Group()
  // Nada de esto debe recibir la niebla ni sombras: está a medio metro de la
  // cámara y con niebla se teñía del color del horizonte.
  const chapa = mat(0x3b4a3e, 0.8, 0.25)
  const chapaOsc = mat(0x2a352d, 0.85, 0.2)
  const lona = mat(0x4a4436, 0.95, 0)
  const acero = mat(0x9aa0a6, 0.4, 0.7)
  const correa = mat(0x2b2b24, 0.95, 0)

  // OJO CON EL SIGNO: la cámara mira hacia su -Z, así que lo que se ve va en z
  // NEGATIVO. Puesto en positivo, toda la cabina quedaba justo detrás de la
  // nuca y en pantalla no salía nada.

  // --- suelo, abajo del todo --------------------------------------------------
  // Largo hacia delante a propósito: la cámara va PICADA mirando al campo, y
  // con el suelo pegado a los pies se quedaba por debajo del encuadre. El borde
  // de la chapa a 3,6 es lo que enseña el vacío por la puerta.
  pon(g, new THREE.BoxGeometry(3.4, 0.11, 5), chapaOsc, 0, -1.32, -2.2)
  for (let i = 0; i < 4; i++) {
    pon(g, new THREE.BoxGeometry(3.3, 0.05, 0.14), acero, 0, -1.24, -0.9 - i * 0.95)
  }
  // El canto de la chapa, en el borde: sin él el suelo se corta en el aire.
  pon(g, new THREE.BoxGeometry(3.4, 0.16, 0.14), acero, 0, -1.26, -4.6)

  // --- techo ------------------------------------------------------------------
  pon(g, new THREE.BoxGeometry(3.4, 0.13, 4.4), chapaOsc, 0, 1.15, -1.6)
  pon(g, new THREE.CylinderGeometry(0.05, 0.05, 4, 8), acero, 0, 1.02, -1.6).rotation.x = Math.PI / 2

  // --- el montante de la derecha ----------------------------------------------
  pon(g, new THREE.BoxGeometry(0.26, 2.6, 0.34), chapa, 1.5, -0.08, -1.1)
  // Y el costado cerrado de ese lado, que enmarca por la derecha.
  pon(g, new THREE.BoxGeometry(0.15, 2.6, 3.4), chapa, 1.56, -0.08, -3)

  // --- el borde de la puerta abierta, a la izquierda ---------------------------
  // Solo el marco: es lo que dice «esto está abierto» sin tapar el paisaje.
  pon(g, new THREE.BoxGeometry(0.24, 2.6, 0.32), chapa, -1.54, -0.08, -1.1)
  pon(g, new THREE.BoxGeometry(0.28, 0.2, 3), chapa, -1.52, 1.06, -3)
  pon(g, new THREE.BoxGeometry(0.28, 0.2, 3), chapa, -1.52, -1.26, -3)

  // --- lo de dentro, pegado a los bordes ---------------------------------------
  // Caja de munición y bidón amarrados al suelo, en el rincón de la derecha.
  pon(g, new THREE.BoxGeometry(0.54, 0.34, 0.76), mat(0x55603f, 0.9), 1.06, -1.09, -2.7)
  pon(g, new THREE.BoxGeometry(0.48, 0.3, 0.66), mat(0x47512f, 0.9), 1.06, -0.79, -2.75)
  // Eslingas colgando del raíl, a los lados.
  for (const x of [-1.15, 1.15]) {
    pon(g, new THREE.BoxGeometry(0.07, 1.3, 0.05), correa, x, 0.36, -1.5)
  }
  // El borde del banco asomando por abajo: vas sentado en él.
  const banco = pon(g, new THREE.BoxGeometry(3, 0.18, 0.8), lona, 0, -0.98, -0.25)
  banco.rotation.x = -0.05

  // --- el rotor ---------------------------------------------------------------
  // Un disco medio transparente por encima del techo, girando. Es lo que dice
  // «helicóptero» en el primer fotograma, antes de que dé tiempo a leer nada.
  const rotor = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 24),
    new THREE.MeshBasicMaterial({ color: 0x1d241f, transparent: true, opacity: 0.2, side: THREE.DoubleSide, fog: false, depthWrite: false })
  )
  rotor.rotation.x = -Math.PI / 2
  rotor.position.set(0, 1.98, -2.2)
  g.add(rotor)
  const palas = new THREE.Group()
  palas.position.copy(rotor.position)
  for (let i = 0; i < 4; i++) {
    const pala = pon(palas, new THREE.BoxGeometry(10.6, 0.07, 0.44), chapaOsc, 0, 0, 0)
    pala.rotation.y = (i / 4) * Math.PI * 2
  }
  g.add(palas)

  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
  // Se dibuja la última y por encima de todo: está pegada a la cámara y si
  // entra en la ordenación normal, el decorado lejano se le cuela por delante.
  g.renderOrder = 999
  g.userData.palas = palas
  return g
}
