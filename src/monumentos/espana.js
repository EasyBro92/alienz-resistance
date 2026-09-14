// España: Tarragona y Valencia. (Madrid, el Bernabéu, está en biomas.js.)
//
// Todo en coordenadas locales con la carretera hacia -x: el mundo coloca el
// conjunto a la derecha y lo arrima a la barandilla.

import * as THREE from 'three'
import {
  mat, lamina, vidrio, azar, pon, geoCaja, geoCil, geoBola, geoCupula, geoTronco, barra, V,
  arcada, ventanas, almenasRectas, explanada, cesped, arbol, arboleda, gente, farola, casitas, colocar
} from './piezas.js'

// El anfiteatro de Tarraco, junto a la playa del Miracle. La elipse de gradas
// excavada en la ladera —enteras del lado de la ciudad, casi perdidas del lado
// del mar—, la arena con las ruinas de la iglesia visigótica y románica en el
// centro, el muro del podio con sus vomitorios, las vías del tren entre el
// anfiteatro y la carretera, y arriba la Part Alta: el Balcó del Mediterrani,
// la muralla romana, la Torre del Pretori, la catedral y las casas de teja.
export function tarraco () {
  const g = new THREE.Group()
  const piedra = mat(0xc9b28a, 0.95)
  const piedraOscura = mat(0xa38c66, 0.95)
  const arena = mat(0xd9c69e, 1)
  const hueco = mat(0x3a3026, 1)
  const RX = 7.5
  const RZ = 11.5

  // Arena.
  pon(g, geoCil(1, 1, 0.3, 40), arena, 0, 0.15, 0).scale.set(RX, 1, RZ)

  // Podio alrededor de la arena, con los vomitorios en arco.
  pon(g, new THREE.CylinderGeometry(1, 1, 2, 48, 1, true), lamina(0xb89f76, 0.95), 0, 1, 0).scale.set(RX, 1, RZ)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    const x = Math.sin(a) * (RX - 0.02)
    const z = Math.cos(a) * (RZ - 0.02)
    const giro = Math.atan2(Math.sin(a) * RZ, Math.cos(a) * RX)
    const v = new THREE.Group()
    pon(v, geoCaja(0.9, 1.1, 0.1), hueco, 0, 0.55, 0)
    pon(v, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10, 1, false, Math.PI / 2, Math.PI), hueco, 0, 1.1, 0).rotation.x = Math.PI / 2
    v.position.set(x, 0, z)
    v.rotation.y = giro + Math.PI
    g.add(v)
  }

  // Gradas. Del lado de la carretera (y del mar) solo quedan tres; del de la
  // ciudad, diez, subiendo por la ladera.
  const PASO = 0.75
  const ALTO = 0.55
  const SALTO = 1.0
  for (let t = 0; t < 10; t++) {
    const f0 = 1 + (t * PASO) / RX
    const f1 = 1 + ((t + 1) * PASO) / RX
    const entera = t < 3
    const tS = entera ? 0 : Math.PI + SALTO
    const tL = entera ? Math.PI * 2 : Math.PI * 2 - SALTO * 2
    const y = 2 + t * ALTO
    const huella = pon(g, new THREE.RingGeometry(f0, f1, 56, 1, tS, tL), lamina(t % 2 ? 0xc9b28a : 0xbfa77e, 0.95), 0, y + ALTO, 0)
    huella.rotation.x = -Math.PI / 2
    huella.scale.set(RX, RZ, 1)
    // La tabica: CylinderGeometry cuenta el ángulo desde +z, RingGeometry desde +x.
    const tabica = pon(g, new THREE.CylinderGeometry(f0, f0, ALTO, 56, 1, true, tS + Math.PI / 2, tL), lamina(0xa38c66, 0.95), 0, y + ALTO / 2, 0)
    tabica.scale.set(RX, 1, RZ)
  }
  // El muro exterior de coronación, del lado de la ciudad, con sus contrafuertes.
  const fMax = 1 + (10 * PASO) / RX
  pon(g, new THREE.CylinderGeometry(fMax, fMax, 8, 56, 1, true, Math.PI + SALTO + Math.PI / 2, Math.PI * 2 - SALTO * 2), lamina(0xb39b72, 0.95), 0, 4, 0).scale.set(RX, 1, RZ)
  for (let k = 0; k < 14; k++) {
    const a = Math.PI + SALTO + ((k + 0.5) / 14) * (Math.PI * 2 - SALTO * 2)
    const x = Math.cos(a) * RX * (fMax + 0.03)
    const z = -Math.sin(a) * RZ * (fMax + 0.03)
    pon(g, geoCaja(0.8, 7.6, 0.8), piedraOscura, x, 3.8, z).rotation.y = -a
  }

  // La iglesia en la arena: la planta de la basílica, los muros a distintas
  // alturas —está en ruinas— y el ábside.
  const muro = (x, z, largo, alto, enZ) => pon(g, geoCaja(enZ ? 0.45 : largo, alto, enZ ? largo : 0.45), piedraOscura, x, 0.3 + alto / 2, z)
  muro(-2.2, 0, 11, 1.6, true)
  muro(2.2, -1, 9, 2.4, true)
  muro(0, 5.5, 4.8, 1.2, false)
  muro(0, -5.5, 4.8, 3, false)
  pon(g, new THREE.CylinderGeometry(2.2, 2.2, 3.2, 16, 1, true, Math.PI / 2, Math.PI), lamina(0xa38c66, 0.95), 0, 1.9, -5.5)
  arcada(g, hueco, { ancho: 3, alto: 1.8, n: 2, x: 0, y: 0.4, z: -5.3 })
  for (let i = 0; i < 4; i++) pon(g, geoCil(0.25, 0.28, azar(1.2, 2.6), 8), piedra, (i % 2 ? 1 : -1) * 1.1, 1, 3 - i * 2.2)

  // --- el parque del anfiteatro, entre las gradas y la carretera ---
  explanada(g, { x: -12, z: 0, ancho: 7, fondo: 44, color: 0xdcc9a2, juntas: null })
  for (let z = 18; z > -20; z -= 6) arbol(g, -10.5 + azar(-0.4, 0.4), z, 'palmera', 0.9)
  gente(g, 22, { x0: -14, x1: -9, z0: 20, z1: -20 })
  gente(g, 14, { x0: -6, x1: 6, z0: 9, z1: -9, y: 0.3 })
  // Las vías del tren de la costa, pegadas a la carretera.
  const riel = mat(0x6d6a66, 0.4, 0.6)
  pon(g, geoCaja(3.4, 0.25, 60), mat(0x8a8176, 1), -17, 0.12, 0)
  for (const dx of [-0.7, 0.7]) pon(g, geoCaja(0.12, 0.14, 60), riel, -17 + dx, 0.32, 0)
  for (let z = -29; z < 30; z += 1.1) pon(g, geoCaja(2.2, 0.1, 0.3), mat(0x5a4a3a, 1), -17, 0.28, z)
  for (let z = -24; z < 30; z += 12) {
    pon(g, geoCil(0.08, 0.1, 5, 6), mat(0x6d7278, 0.5, 0.5), -15.2, 2.5, z)
    pon(g, geoCaja(2, 0.08, 0.08), mat(0x6d7278, 0.5, 0.5), -16.2, 5, z)
  }

  // --- la ladera y la Part Alta ---
  // La ladera: un escalón de roca detrás del muro de coronación, y encima la
  // ciudad alta.
  const tierra = mat(0xb59b73, 1)
  pon(g, geoCaja(28, 8, 50), tierra, 29.5, 4, 0)
  // El Balcó del Mediterrani: la terraza con su barandilla asomada al anfiteatro.
  explanada(g, { x: 18.5, z: 0, ancho: 5, fondo: 40, color: 0xd9cdb4, juntas: 0xc4b89e, y: 8 })
  const baranda = mat(0x2f3a33, 0.5, 0.4)
  pon(g, geoCaja(0.08, 0.08, 40), baranda, 16.1, 9.2, 0)
  for (let z = -20; z <= 20; z += 1) pon(g, geoCaja(0.05, 1, 0.05), baranda, 16.1, 8.7, z)
  gente(g, 18, { x0: 16.6, x1: 20.5, z0: 18, z1: -18, y: 8.1 })
  for (let z = -16; z <= 16; z += 8) farola(g, 20.6, z, 4)

  // La muralla romana con dos torres cuadradas.
  const muralla = mat(0xb8a47e, 0.95)
  pon(g, geoCaja(2.4, 5, 36), muralla, 23, 10.5, 2)
  almenasRectas(g, muralla, 36, 13.3, 23, 2, true, 0.6)
  for (const z of [-14, 14]) {
    pon(g, geoCaja(5, 8, 5), muralla, 23, 12, z)
    ventanas(g, hueco, { ancho: 3, alto: 5, filas: 2, columnas: 2, x: 20.45, y: 9.5, z, giro: -Math.PI / 2, w: 0.3, h: 0.9 })
  }
  // La Torre del Pretori: cuadrada, alta, con sus ventanas en arco.
  pon(g, geoCaja(6, 15, 7), mat(0xc2ab82, 0.95), 28, 15.5, -8)
  pon(g, geoCaja(6.4, 0.6, 7.4), mat(0xa38c66, 0.95), 28, 23.3, -8)
  for (const y of [11, 15, 19]) arcada(g, hueco, { ancho: 5.5, alto: 1.8, n: 3, x: 24.95, y, z: -8, giro: -Math.PI / 2 })
  // La catedral: la nave, la fachada con el rosetón y el campanario octogonal.
  const catedral = mat(0xcdb68e, 0.95)
  pon(g, geoCaja(12, 10, 8), catedral, 34, 13, 8)
  pon(g, geoTronco(0.2, 1, 3).scale(6, 1, 4), mat(0xa4553a, 0.85), 34, 19.5, 8)
  pon(g, geoCil(1.8, 1.8, 0.1, 20), mat(0x6f7f99, 0.3, 0.3), 27.95, 14.5, 8).rotation.z = Math.PI / 2
  arcada(g, hueco, { ancho: 3, alto: 3.5, n: 1, x: 27.95, y: 8, z: 8, giro: -Math.PI / 2, hueco: 0.8 })
  pon(g, geoCil(2, 2, 12, 8), catedral, 38, 20, 13)
  pon(g, geoCil(0.3, 2.3, 3, 8), mat(0xa4553a, 0.85), 38, 27.5, 13)
  arcada(g, hueco, { ancho: 3, alto: 1.8, n: 2, x: 35.95, y: 22, z: 13, giro: -Math.PI / 2 })
  // Las casas de la Part Alta alrededor.
  const casas = []
  for (let i = 0; i < 12; i++) casas.push([azar(27, 42), azar(-22, 24), azar(4, 6), azar(6, 11), azar(4, 6)])
  const sube = new THREE.Group()
  casitas(sube, casas, { colores: [0xe6d6b2, 0xd9b48a, 0xefe3c8, 0xc9a67a], teja: 0xa4553a })
  sube.position.y = 8
  g.add(sube)

  return colocar(g, 1, -62)
}

// La Ciudad de las Artes y las Ciencias, a la derecha. De cerca a lejos:
// l'Àgora azul, el Museu de les Ciències con sus costillas blancas, el
// Hemisfèric —el ojo— en el estanque, l'Umbracle con sus arcos y sus palmeras,
// y al fondo el Palau de les Arts con su casco y su pluma. Todo blanco y agua
// turquesa, que es lo que la hace reconocible desde el aire.
export function artesValencia () {
  const g = new THREE.Group()
  const blanco = mat(0xf3f4f1, 0.3)
  const blancoLam = lamina(0xf3f4f1, 0.3)
  const cristal = vidrio(0x6f95ab)
  const agua = mat(0x38b3cf, 0.08, 0.2)
  const trencadis = mat(0xe9eef0, 0.2, 0.15)

  // Los estanques y los paseos.
  explanada(g, { x: 8, z: 0, ancho: 40, fondo: 110, color: 0xe7e3da, juntas: 0xd2ccbf, paso: 4 })
  pon(g, geoCaja(14, 0.5, 96), mat(0xdedad0, 0.8), 6, 0.25, -4)
  pon(g, geoCaja(13, 0.52, 95), agua, 6, 0.27, -4)

  // --- el Hemisfèric: el ojo ---
  const HZ = -8
  // El párpado de abajo, de cristal, y su reflejo hace el ojo entero.
  const ojo = pon(g, new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), cristal, 6, 0.5, HZ)
  ojo.scale.set(5, 3.6, 10)
  // Las costillas del párpado de arriba: arcos alrededor del eje largo.
  for (let i = -9; i <= 9; i++) {
    const k = Math.sqrt(1 - Math.pow(i / 10, 2))
    const arco = pon(g, new THREE.TorusGeometry(5.6 * k, 0.12, 4, 18, Math.PI), blanco, 6, 0.5, HZ + i)
    arco.scale.y = 0.78
  }
  const aro = pon(g, new THREE.TorusGeometry(1, 0.06, 6, 40), blanco, 6, 0.6, HZ)
  aro.rotation.x = Math.PI / 2
  aro.scale.set(5.8, 10.6, 1)
  // La pupila: la esfera del cine.
  pon(g, geoBola(2.3, 18, 12), mat(0x3a5f7a, 0.2, 0.3), 6, 2.1, HZ)

  // --- el Museu de les Ciències ---
  const MX = 24
  const MZ0 = 26
  const MZ1 = -30
  const largo = MZ0 - MZ1
  const mz = (MZ0 + MZ1) / 2
  pon(g, geoCaja(12, 1.6, largo), blanco, MX, 0.8, mz)
  pon(g, geoCaja(9, 9, largo - 2), cristal, MX + 0.5, 5.4, mz)
  // Las costillas de la fachada del estanque: árboles de hormigón blanco que se
  // abren hacia arriba y sostienen la cubierta dentada.
  for (let z = MZ0 - 2; z > MZ1 + 1; z -= 3.3) {
    barra(g, blanco, V(MX - 5.6, 1.6, z), V(MX - 4.2, 11, z), 0.55)
    barra(g, blanco, V(MX - 4.9, 6, z), V(MX - 5.8, 11, z - 1.2), 0.3)
    barra(g, blanco, V(MX - 4.9, 6, z), V(MX - 5.8, 11, z + 1.2), 0.3)
  }
  pon(g, geoCaja(13, 0.8, largo), blanco, MX, 11.2, mz)
  for (let z = MZ0 - 1.6; z > MZ1; z -= 3.3) pon(g, geoTronco(0.05, 1, 1.8).scale(1.6, 1, 1.6), blanco, MX - 5.2, 12.5, z)
  // La fachada de atrás: los dientes verticales.
  for (let z = MZ0 - 1; z > MZ1; z -= 2.4) pon(g, geoTronco(0.2, 1, 11).scale(0.9, 1, 0.9), blanco, MX + 5.8, 6.3, z)

  // --- l'Umbracle: arcos parabólicos entre la carretera y el estanque ---
  for (let z = 30; z > -34; z -= 2.6) {
    const a = pon(g, new THREE.TorusGeometry(3.2, 0.22, 4, 16, Math.PI), blanco, -6, 0.3, z)
    a.scale.y = 2.4
  }
  pon(g, geoCaja(0.5, 0.5, 64), blanco, -6, 8, -2)
  for (const dx of [-3.1, 3.1]) pon(g, geoCaja(0.3, 0.3, 64), blanco, -6 + dx, 0.8, -2)
  for (let z = 26; z > -32; z -= 6) arbol(g, -6 + azar(-0.8, 0.8), z, 'palmera', 0.85)
  gente(g, 40, { x0: -9, x1: -3, z0: 30, z1: -32 })

  // --- l'Àgora: la concha azul y blanca, lo más cercano ---
  const ag = new THREE.Group()
  pon(ag, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3f6fa8, 0.25, 0.4), 0, 0, 0).scale.set(8, 9, 8)
  for (let i = 0; i < 14; i++) {
    const c = pon(ag, new THREE.TorusGeometry(1, 0.04, 4, 20, Math.PI), trencadis, 0, 0, 0)
    c.rotation.y = (i / 14) * Math.PI
    c.scale.set(8.08, 9.08, 1)
  }
  ag.position.set(24, 0, 42)
  g.add(ag)

  // --- el Palau de les Arts, al fondo ---
  const pz = -46
  const casco = (sx) => {
    const c = pon(g, new THREE.SphereGeometry(1, 28, 16, 0, Math.PI, 0, Math.PI), trencadis, 8 + sx * 0.4, 8, pz)
    c.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2
    c.scale.set(12, 9, 5)
  }
  casco(1)
  casco(-1)
  for (let i = 0; i < 6; i++) pon(g, geoCil(1, 1, 0.6, 28), cristal, 8, 2 + i * 2.1, pz).scale.set(5 - i * 0.25, 1, 11 - i * 0.6)
  // La pluma: la hoja curva que vuela por encima del casco.
  const pluma = pon(g, new THREE.TorusGeometry(15, 0.5, 6, 40, Math.PI * 0.85), blanco, 8, -2, pz + 2)
  pluma.rotation.y = Math.PI / 2
  pluma.rotation.z = 0.1
  pluma.scale.set(1, 1.2, 4)
  pon(g, geoCaja(4, 1, 30), blanco, 8, 0.5, pz)

  // Palmeras y farolas del paseo, y gente junto al estanque.
  for (let z = 44; z > -52; z -= 7) arbol(g, 14 + azar(-0.3, 0.3), z, 'palmera', 0.8)
  for (let z = 40; z > -50; z -= 10) farola(g, 13, z, 4.5, 0xdcdcdc)
  gente(g, 35, { x0: 13, x1: 17, z0: 44, z1: -50 })
  gente(g, 20, { x0: 16, x1: 30, z0: 52, z1: 34 })

  return colocar(g, 1, -60)
}
