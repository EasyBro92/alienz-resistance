// Piezas comunes de los monumentos detallados y de lo que los rodea.
//
// Un monumento suelto sobre el campo parece una maqueta. Lo que lo hace sitio
// es lo de alrededor: la explanada que lo separa de la carretera, los árboles
// de esa ciudad, la gente, las farolas y los bloques de detrás. Todo eso se
// repite de una ciudad a otra cambiando colores y proporciones, así que vive
// aquí y cada monumento pone solo lo suyo.
//
// Todo acaba fundido por `bake`: cientos de piezas pequeñas cuestan lo mismo
// que un puñado, porque se agrupan por material.

import * as THREE from 'three'

const cacheMat = new Map()
export const mat = (color, rough = 0.9, metal = 0) => {
  const clave = color + ':' + rough + ':' + metal
  if (!cacheMat.has(clave)) cacheMat.set(clave, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  return cacheMat.get(clave)
}
// Para superficies finas que se ven por las dos caras (lamas, toldos, velas).
export const lamina = (color, rough = 0.8, metal = 0) => {
  const clave = 'doble:' + color + ':' + rough + ':' + metal
  if (!cacheMat.has(clave)) cacheMat.set(clave, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side: THREE.DoubleSide }))
  return cacheMat.get(clave)
}
export const vidrio = (color = 0x2f3f4c) => mat(color, 0.15, 0.55)

export const azar = (a, b) => a + Math.random() * (b - a)
export const elige = lista => lista[Math.floor(Math.random() * lista.length)]

export const geoCaja = (ancho, alto, fondo) => new THREE.BoxGeometry(ancho, alto, fondo)
export const geoCil = (arriba, abajo, alto, lados = 12) => new THREE.CylinderGeometry(arriba, abajo, alto, lados)
export const geoBola = (r, a = 12, b = 8) => new THREE.SphereGeometry(r, a, b)
export const geoCupula = (r, a = 20, b = 10) => new THREE.SphereGeometry(r, a, b, 0, Math.PI * 2, 0, Math.PI / 2)
// Tronco de pirámide de base cuadrada, girado para que escalarlo dé un
// rectángulo y no un rombo.
export const geoTronco = (arriba, abajo, alto) => new THREE.CylinderGeometry(arriba * 1.414, abajo * 1.414, alto, 4).rotateY(Math.PI / 4)
// Arco de medio punto (media corona), en el plano XY.
export const geoArco = (r, grueso, fondo = 0.3) => {
  const forma = new THREE.Shape()
  forma.absarc(0, 0, r + grueso, 0, Math.PI, false)
  forma.absarc(0, 0, r, Math.PI, 0, true)
  return new THREE.ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -fondo / 2)
}

export const pon = (g, geo, material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, material)
  o.position.set(x, y, z)
  g.add(o)
  return o
}

// Barra entre dos puntos: celosías, cables, tirantes.
export const barra = (g, material, a, b, grueso = 0.08) => {
  const d = new THREE.Vector3().subVectors(b, a)
  const m = pon(g, geoCaja(grueso, d.length(), grueso), material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  return m
}
export const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Tejado a dos aguas con la cumbrera a lo largo de z. `y` es el alero.
export const aguas = (g, material, ancho, alto, largo, x, y, z) => {
  const t = pon(g, geoCil(1, 1, largo, 3), material, x, y + alto / 3, z)
  t.rotation.x = -Math.PI / 2
  t.scale.set(ancho / 1.732, 1, alto / 1.5)
  return t
}
// Tejado a cuatro aguas (o tronco de pirámide): `arriba` 0 lo cierra en punta.
export const cuatroAguas = (g, material, ancho, fondo, alto, x, y, z, arriba = 0.25) => {
  const t = pon(g, geoTronco(arriba, 1, alto), material, x, y + alto / 2, z)
  t.scale.set(ancho / 2, 1, fondo / 2)
  return t
}

// Fila de huecos en arco (ventanas, galerías, portadas) sobre una fachada que
// mira hacia +z; `giro` la orienta a otra cara.
export const arcada = (g, oscuro, { ancho, alto, n, x = 0, y = 0, z = 0, giro = 0, hueco = 0.6 }) => {
  const fila = new THREE.Group()
  const paso = ancho / n
  const r = (paso * hueco) / 2
  for (let i = 0; i < n; i++) {
    const u = -ancho / 2 + (i + 0.5) * paso
    const recto = Math.max(0.1, alto - r)
    pon(fila, geoCaja(r * 2, recto, 0.1), oscuro, u, recto / 2, 0)
    pon(fila, new THREE.CylinderGeometry(r, r, 0.1, 12, 1, false, Math.PI / 2, Math.PI), oscuro, u, recto, 0).rotation.x = Math.PI / 2
  }
  fila.position.set(x, y, z)
  fila.rotation.y = giro
  g.add(fila)
  return fila
}
// Ventanas rectangulares en rejilla sobre una fachada que mira hacia +z.
export const ventanas = (g, material, { ancho, alto, filas, columnas, x = 0, y = 0, z = 0, giro = 0, w = 0.5, h = 0.8 }) => {
  const f = new THREE.Group()
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      const u = -ancho / 2 + (j + 0.5) * (ancho / columnas)
      const v = (i + 0.5) * (alto / filas)
      pon(f, geoCaja(w, h, 0.08), material, u, v, 0)
    }
  }
  f.position.set(x, y, z)
  f.rotation.y = giro
  g.add(f)
  return f
}
export const almenas = (g, material, radio, y, n, cx = 0, cz = 0, tam = 0.55) => {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    pon(g, geoCaja(tam, tam * 1.3, tam), material, cx + Math.cos(a) * radio, y, cz + Math.sin(a) * radio).rotation.y = -a
  }
}
// Almenas en línea recta a lo largo de x (o de z con `enZ`).
export const almenasRectas = (g, material, largo, y, x, z, enZ = false, tam = 0.55) => {
  for (let u = -largo / 2 + tam; u <= largo / 2 - tam / 2; u += tam * 2.2) {
    pon(g, geoCaja(tam, tam * 1.3, tam), material, enZ ? x : x + u, y, enZ ? z + u : z)
  }
}
// Columnata con basa y capitel, a lo largo de x.
export const columnata = (g, material, { n, largo, alto, r = 0.3, x = 0, y = 0, z = 0, enZ = false }) => {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : -largo / 2 + (i / (n - 1)) * largo
    const cx = enZ ? x : x + u
    const cz = enZ ? z + u : z
    pon(g, geoCil(r, r * 1.12, alto, 10), material, cx, y + alto / 2, cz)
    pon(g, geoCaja(r * 2.6, r * 0.5, r * 2.6), material, cx, y + alto + r * 0.25, cz)
    pon(g, geoCaja(r * 2.6, r * 0.4, r * 2.6), material, cx, y + r * 0.2, cz)
  }
}

// --- entorno -----------------------------------------------------------------

// Mar, río o puerto grande. Marcado para que no cuente al medir el monumento:
// con el agua dentro, el vuelo acababa mirando al mar y `agrandar` lo encogía.
export function mar (g, { x, z, ancho, fondo, color = 0x2f86a8, y = 0.02 }) {
  const m = pon(g, geoCaja(ancho, 0.3, fondo), mat(color, 0.08, 0.25), x, y, z)
  m.userData.sinFoco = true
  return m
}

// Explanada: una losa baja con juntas, del color de la piedra del sitio.
export function explanada (g, { x, z, ancho, fondo, color = 0xe2dccf, juntas = 0xcac3b4, paso = 3, y = 0 }) {
  pon(g, geoCaja(ancho, 0.12, fondo), mat(color, 0.95), x, y + 0.06, z)
  if (!juntas) return
  const m = mat(juntas, 0.95)
  for (let u = -ancho / 2 + paso; u < ancho / 2; u += paso) pon(g, geoCaja(0.08, 0.02, fondo), m, x + u, y + 0.13, z)
  for (let u = -fondo / 2 + paso; u < fondo / 2; u += paso) pon(g, geoCaja(ancho, 0.02, 0.08), m, x, y + 0.13, z + u)
}

export function cesped (g, { x, z, ancho, fondo, color = 0x5f8d45, borde = 0xcfc8b6 }) {
  pon(g, geoCaja(ancho + 0.5, 0.2, fondo + 0.5), mat(borde, 0.9), x, 0.1, z)
  pon(g, geoCaja(ancho, 0.26, fondo), mat(color, 1), x, 0.13, z)
}

export function estanque (g, { x, z, ancho, fondo, redondo = false, color = 0x3f9cc4, borde = 0xd9d2c2 }) {
  if (redondo) {
    pon(g, geoCil(ancho / 2 + 0.4, ancho / 2 + 0.4, 0.5, 28), mat(borde, 0.85), x, 0.25, z).scale.z = fondo / ancho
    pon(g, geoCil(ancho / 2, ancho / 2, 0.52, 28), mat(color, 0.1, 0.2), x, 0.27, z).scale.z = fondo / ancho
  } else {
    pon(g, geoCaja(ancho + 0.8, 0.5, fondo + 0.8), mat(borde, 0.85), x, 0.25, z)
    pon(g, geoCaja(ancho, 0.52, fondo), mat(color, 0.1, 0.2), x, 0.27, z)
  }
}

// Un árbol de la ciudad. Los tipos son los que se leen desde el aire.
export function arbol (g, x, z, tipo = 'copa', k = 1) {
  const tronco = mat(0x5f4a36)
  if (tipo === 'palmera') {
    const alto = azar(5, 7) * k
    const inclina = azar(-0.12, 0.12)
    for (let i = 0; i < 5; i++) pon(g, geoCil(0.14, 0.18, alto / 5 + 0.05, 6), mat(0x8a7350), x + inclina * i, (i + 0.5) * (alto / 5), z)
    const hoja = mat(0x3f7f3a, 0.8)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const h = pon(g, geoCaja(0.45, 0.06, 2.4 * k), hoja, x + inclina * 5 + Math.cos(a) * 1.0 * k, alto - 0.3, z + Math.sin(a) * 1.0 * k)
      h.rotation.set(0, -a + Math.PI / 2, 0)
      h.rotateX(0.45)
    }
    return
  }
  if (tipo === 'cipres') {
    const alto = azar(5, 7.5) * k
    pon(g, geoCil(0.02, azar(0.6, 0.8) * k, alto, 7), mat(0x2f4d2c, 0.95), x, alto / 2 + 0.3, z)
    return
  }
  if (tipo === 'pino') {
    const alto = azar(4.5, 6) * k
    pon(g, geoCil(0.12, 0.2, alto, 5), mat(0x6b543c), x, alto / 2, z)
    pon(g, geoBola(1.9 * k, 9, 6), mat(0x44643a, 0.95), x, alto, z).scale.y = 0.45
    return
  }
  if (tipo === 'abeto') {
    const alto = azar(5, 7.5) * k
    pon(g, geoCil(0.1, 0.16, alto * 0.3, 5), tronco, x, alto * 0.15, z)
    for (let i = 0; i < 3; i++) pon(g, geoCil(0.02, (1.7 - i * 0.4) * k, alto * 0.42, 8), mat(0x2f4a36, 0.95), x, alto * (0.32 + i * 0.22), z)
    return
  }
  if (tipo === 'nevado') {
    const alto = azar(5, 7.5) * k
    pon(g, geoCil(0.1, 0.16, alto * 0.3, 5), tronco, x, alto * 0.15, z)
    for (let i = 0; i < 3; i++) {
      pon(g, geoCil(0.02, (1.7 - i * 0.4) * k, alto * 0.42, 8), mat(0x34503c, 0.95), x, alto * (0.32 + i * 0.22), z)
      pon(g, geoCil(0.02, (1.2 - i * 0.3) * k, alto * 0.18, 8), mat(0xf2f5f7, 0.9), x, alto * (0.42 + i * 0.22), z)
    }
    return
  }
  if (tipo === 'selva') {
    const alto = azar(6, 9) * k
    pon(g, geoCil(0.18, 0.35, alto, 6), mat(0x6a5b47), x, alto / 2, z)
    for (let i = 0; i < 3; i++) pon(g, geoBola(azar(1.4, 2.2) * k, 8, 6), mat(elige([0x2f6b2f, 0x3b7a33, 0x2a5c2a]), 0.95), x + azar(-1, 1), alto - azar(0, 1), z + azar(-1, 1)).scale.y = 0.6
    return
  }
  // Copa redonda: plátanos, jacarandas, robles.
  const r = azar(1.1, 1.6) * k
  const alto = r * 2.1
  pon(g, geoCil(0.12, 0.18, alto, 5), tronco, x, alto / 2, z)
  const color = tipo === 'jacaranda' ? elige([0x8d6cc4, 0x9b7bd0]) : tipo === 'flamboyan' ? elige([0xd9442e, 0xe0592f]) : elige([0x4b7336, 0x3f6530, 0x58813d])
  pon(g, geoBola(r, 9, 7), mat(color, 0.95), x, alto + r * 0.45, z).scale.y = 0.85
}

// Hilera o rejilla de árboles.
export function arboleda (g, { x0, x1, z0, z1, paso = 5, tipo = 'copa', k = 1, hueco = 0.15 }) {
  for (let x = x0; x <= x1; x += paso) {
    for (let z = z0; z >= z1; z -= paso) {
      if (Math.random() < hueco) continue
      arbol(g, x + azar(-0.5, 0.5), z + azar(-0.5, 0.5), tipo, k)
    }
  }
}

// Gente: una figura mínima (cuerpo y cabeza), que es lo que llega desde arriba.
const ROPA = [0x2f3338, 0x7a3434, 0x33507a, 0xd8d2c4, 0x4f6b3a, 0xc9a23a, 0x8a5a9a]
export function gente (g, n, { x0, x1, z0, z1, y = 0, piel = 0xc99b78 }) {
  const cabeza = mat(piel)
  for (let i = 0; i < n; i++) {
    const x = azar(x0, x1)
    const z = azar(z1, z0)
    pon(g, geoCaja(0.36, 0.95, 0.26), mat(ROPA[i % ROPA.length]), x, y + 0.57, z)
    pon(g, geoBola(0.14, 6, 4), cabeza, x, y + 1.18, z)
  }
}

export function farola (g, x, z, alto = 5, color = 0x3a3f44) {
  pon(g, geoCil(0.07, 0.11, alto, 6), mat(color, 0.5, 0.5), x, alto / 2, z)
  pon(g, geoCaja(0.8, 0.14, 0.28), mat(color, 0.5, 0.5), x, alto, z)
  pon(g, geoCaja(0.4, 0.1, 0.22), mat(0xfff1c2, 0.4), x, alto - 0.1, z)
}

// Bloques de ciudad detrás del monumento, con sus bandas de ventanas mirando a
// la carretera (hacia -x si están a la derecha, +x si a la izquierda).
export function bloques (g, lista, lado = 1, { colores = [0xd9d2c4, 0xc6c1b6, 0xb6ae9f, 0xe4ded1, 0xcfc4b0], tejado = null } = {}) {
  const ventana = mat(0x3b4955, 0.25, 0.4)
  for (const [x, z, ancho, alto, fondo] of lista) {
    pon(g, geoCaja(ancho, alto, fondo), mat(elige(colores), 0.85), x, alto / 2, z)
    const cara = x - lado * (ancho / 2 + 0.05)
    for (let y = 2.6; y < alto - 1.4; y += 3) pon(g, geoCaja(0.1, 1.2, fondo * 0.82), ventana, cara, y, z)
    if (tejado) cuatroAguas(g, mat(tejado, 0.8), ancho + 0.6, fondo + 0.6, 2, x, alto, z, 0.3)
  }
}

// Casitas bajas de tejado a dos aguas (pueblos, barrios coloniales).
export function casitas (g, lista, { colores = [0xe8dcc0, 0xd9b48a, 0xe6cfa8], teja = 0xa4553a } = {}) {
  const hueco = mat(0x3a3028, 1)
  for (const [x, z, ancho, alto, fondo] of lista) {
    pon(g, geoCaja(ancho, alto, fondo), mat(elige(colores), 0.9), x, alto / 2, z)
    aguas(g, mat(teja, 0.85), ancho + 0.4, 1.4, fondo + 0.4, x, alto, z).rotation.z = 0
    for (let u = -fondo / 2 + 1.2; u < fondo / 2 - 0.6; u += 1.8) {
      pon(g, geoCaja(0.1, 0.9, 0.6), hueco, x - ancho / 2 - 0.04, alto * 0.55, z + u)
    }
  }
}

export function coche (g, x, z, giro = 0, color = elige([0xb03a2e, 0x2e5c8a, 0xd8d8d2, 0x2a2a2a, 0x7f8c8d])) {
  const c = new THREE.Group()
  pon(c, geoCaja(1.7, 0.7, 3.8), mat(color, 0.4, 0.4), 0, 0.6, 0)
  pon(c, geoCaja(1.5, 0.6, 2), mat(0x28323a, 0.2, 0.5), 0, 1.2, -0.2)
  for (const [dx, dz] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) pon(c, geoCil(0.33, 0.33, 0.25, 10), mat(0x1c1c1c), dx, 0.33, dz).rotation.z = Math.PI / 2
  c.position.set(x, 0, z)
  c.rotation.y = giro
  g.add(c)
}

// Bandera en su mástil.
export function bandera (g, x, z, alto, colores, y = 0) {
  pon(g, geoCil(0.05, 0.07, alto, 6), mat(0xcfcfcf, 0.4, 0.6), x, y + alto / 2, z)
  const franja = 0.9 / colores.length
  colores.forEach((c, i) => pon(g, geoCaja(0.04, franja, 1.5), mat(c, 0.8), x, y + alto - 0.2 - franja * (i + 0.5), z + 0.8))
}

// Barca sencilla (faluca, pesquero, lancha).
export function barca (g, x, z, giro = 0, { largo = 5, color = 0xe8e2d4, vela = false } = {}) {
  const b = new THREE.Group()
  pon(b, geoCaja(1.6, 0.8, largo), mat(color, 0.7), 0, 0.3, 0)
  pon(b, geoTronco(0.05, 0.8, 1.2).rotateX(Math.PI / 2), mat(color, 0.7), 0, 0.3, largo / 2 + 0.5)
  pon(b, geoCaja(1.4, 0.1, largo - 0.4), mat(0x8a6a48, 0.9), 0, 0.72, 0)
  if (vela) {
    pon(b, geoCil(0.05, 0.06, 6, 6), mat(0x6b543c), 0, 3.5, 0)
    const v = pon(b, new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 5.5), new THREE.Vector2(3.2, 0.2)])), lamina(0xf4efe4), 0, 0.9, 0)
    v.rotation.y = Math.PI / 2
  }
  b.position.set(x, 0, z)
  b.rotation.y = giro
  g.add(b)
}

// Refleja un conjunto de izquierda a derecha. Todos se construyen a la derecha
// de la carretera; los de la izquierda se reflejan. Con `scale.x = -1` los
// triángulos quedaban del revés y se veía el interior: aquí se hornea la
// reflexión en cada geometría y se da la vuelta al orden de los vértices.
export function espejo (g) {
  g.updateMatrixWorld(true)
  const inversa = new THREE.Matrix4().copy(g.matrixWorld).invert()
  const refleja = new THREE.Matrix4().makeScale(-1, 1, 1)
  const mallas = []
  g.traverse(o => { if (o.isMesh) mallas.push(o) })
  const nuevas = mallas.map(m => {
    const geo = m.geometry.clone()
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inversa, m.matrixWorld)).applyMatrix4(refleja)
    if (geo.index) {
      const a = geo.index.array
      for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t }
    } else {
      for (const nombre of Object.keys(geo.attributes)) {
        const at = geo.attributes[nombre]
        const s = at.itemSize
        const arr = at.array
        for (let tri = 0; tri < at.count; tri += 3) {
          for (let c = 0; c < s; c++) {
            const i1 = (tri + 1) * s + c
            const i2 = (tri + 2) * s + c
            const t = arr[i1]; arr[i1] = arr[i2]; arr[i2] = t
          }
        }
      }
    }
    const nueva = new THREE.Mesh(geo, m.material)
    nueva.renderOrder = m.renderOrder
    nueva.userData = { ...m.userData }
    return nueva
  })
  g.clear()
  for (const m of nuevas) g.add(m)
  return g
}

// Coloca el conjunto: lado de la carretera y profundidad. `agrandar` del mundo
// lo ajusta después a la barandilla salvo en las ciudades con avenida.
export function colocar (g, lado, z = -64) {
  if (lado < 0) espejo(g)
  g.position.set(lado * 22, 0, z)
  g.userData.lados = [lado]
  return g
}

// Un grupo a una altura y con un giro: para poner piezas sobre una colina o
// girar un tejado sin tocar la función que lo hace.
export function sub (g, x = 0, y = 0, z = 0, giroY = 0) {
  const s = new THREE.Group()
  s.position.set(x, y, z)
  s.rotation.y = giroY
  g.add(s)
  return s
}

// Colina de ladera suave: troncos de cono apilados y achatados, con rocas.
// Devuelve la altura del terreno a una distancia del centro.
export function colina (g, { x, z, rAbajo, rArriba, alto, color = 0x8a8470, roca = 0x77716a, rocas = 14, escalaZ = 1 }) {
  const c = pon(g, geoCil(rArriba, rAbajo, alto, 12), mat(color, 1), x, alto / 2, z)
  c.scale.z = escalaZ
  for (let i = 0; i < rocas; i++) {
    const a = Math.random() * Math.PI * 2
    const r = azar(rArriba, rAbajo * 0.95)
    const y = alto * (rAbajo - r) / (rAbajo - rArriba)
    pon(g, new THREE.DodecahedronGeometry(azar(0.8, 2), 0), mat(roca, 1), x + Math.cos(a) * r, y, z + Math.sin(a) * r * escalaZ)
  }
  return r => r <= rArriba ? alto : Math.max(0, alto * (rAbajo - r) / (rAbajo - rArriba))
}
