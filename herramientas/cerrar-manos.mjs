// Cerrarle las manos a un cuerpo de Meshy que viene con ellas abiertas.
//
// Para que el montador de esqueletos no falle hay que pedirle a Meshy la figura
// con los brazos separados y las manos ABIERTAS y vacías (con algo en la mano, o
// el puño pegado al muslo, el esqueleto sale mal). Pero su esqueleto no tiene
// huesos en los dedos: la mano se queda como vino, y un soldado que sujeta el
// arma con la palma abierta y los dedos tiesos parece que está pidiendo que no
// le disparen (el Arquero del 10/10, con los dedos por encima de la cabeza).
//
// Aquí se le enrollan los dedos sobre la palma, moviendo los vértices de la
// propia malla: los que manda el hueso de la mano y quedan más allá de los
// nudillos se doblan en arco hacia la palma. Esqueleto, pesos, UV y animaciones
// no se tocan; solo cambian posiciones y normales.
//
// Uso:  node herramientas/cerrar-manos.mjs <archivo.glb> [--giro 3.6] [--nudillos 0.42] [--ver] [--al-reves]
//       (escribe encima; pasarlo UNA vez: dos veces enrolla el puño ya hecho)
//       `--ver` solo mide y dice hacia dónde ve la palma, sin tocar nada.

import fs from 'node:fs'
import * as THREE from 'three'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/cerrar-manos.mjs <archivo.glb> [--giro 3.6] [--nudillos 0.42] [--ver]\n')
  process.exit(1)
}
const opcion = (nombre, defecto) => process.argv.includes(nombre) ? Number(process.argv[process.argv.indexOf(nombre) + 1]) : defecto
const GIRO = opcion('--giro', 3.6)            // cuánto se enrolla el dedo entero, en radianes
const NUDILLOS = opcion('--nudillos', 0.42)   // dónde está la línea de los nudillos, de la muñeca (0) a la punta (1)
const soloVer = process.argv.includes('--ver')

const glb = fs.readFileSync(archivo)
const largoJson = glb.readUInt32LE(12)
const json = JSON.parse(glb.subarray(20, 20 + largoJson).toString('utf8'))
const iBin = 20 + largoJson + 8
const bin = glb.subarray(iBin, iBin + glb.readUInt32LE(20 + largoJson))

const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
// Dónde cae en el binario el dato `c` del elemento `k` de un accesor.
function sitio (i) {
  const a = json.accessors[i]
  const v = json.bufferViews[a.bufferView]
  const tam = BYTES[a.componentType]
  const paso = v.byteStride || tam * COMPS[a.type]
  const base = (v.byteOffset || 0) + (a.byteOffset || 0)
  return { a, de: (k, c) => base + k * paso + c * tam }
}
function numero (i) {
  const { a, de } = sitio(i)
  const t = a.componentType
  return (k, c) => {
    const p = de(k, c)
    const x = t === 5126 ? bin.readFloatLE(p) : t === 5123 ? bin.readUInt16LE(p) : t === 5121 ? bin.readUInt8(p) : bin.readUInt32LE(p)
    return a.normalized ? x / (t === 5121 ? 255 : 65535) : x
  }
}

const piel = json.skins[0]
const nombres = piel.joints.map(n => json.nodes[n].name)
const ibm = numero(piel.inverseBindMatrices)
// Dónde está cada hueso en reposo, en el espacio de la malla: la inversa de su matriz de enlace.
const dondeHueso = nombre => {
  const j = nombres.indexOf(nombre)
  if (j < 0) { console.error(`\nNo encuentro el hueso «${nombre}».\n`); process.exit(1) }
  const m = new THREE.Matrix4().fromArray(Array.from({ length: 16 }, (_, c) => ibm(j, c))).invert()
  return { j, p: new THREE.Vector3().setFromMatrixPosition(m) }
}

for (const malla of json.meshes) {
  for (const prim of malla.primitives) {
    const at = prim.attributes
    if (at.JOINTS_0 == null) continue
    const n = json.accessors[at.POSITION].count
    const pos = numero(at.POSITION); const nor = at.NORMAL != null ? numero(at.NORMAL) : null
    const hue = numero(at.JOINTS_0); const pes = numero(at.WEIGHTS_0)
    const dPos = sitio(at.POSITION).de; const dNor = at.NORMAL != null ? sitio(at.NORMAL).de : null
    const P = k => new THREE.Vector3(pos(k, 0), pos(k, 1), pos(k, 2))

    for (const lado of ['Left', 'Right']) {
      const mano = dondeHueso(lado + 'Hand')
      const codo = dondeHueso(lado + 'ForeArm')
      // Los vértices de la mano: los que manda sobre todo su hueso.
      const suyos = []
      for (let k = 0; k < n; k++) {
        let w = 0
        for (let c = 0; c < 4; c++) if (hue(k, c) === mano.j) w += pes(k, c)
        if (w > 0.5) suyos.push(k)
      }
      if (suyos.length < 20) { console.log(`  ${lado}: sin mano que cerrar (${suyos.length} vértices)`); continue }
      // Hacia dónde van los dedos: la media de los vértices más lejanos de la muñeca.
      const lejos = suyos.map(k => ({ k, d: P(k).distanceTo(mano.p) })).sort((a, b) => b.d - a.d)
      const dedos = new THREE.Vector3()
      for (const { k } of lejos.slice(0, Math.max(6, Math.floor(lejos.length * 0.12)))) dedos.add(P(k).sub(mano.p))
      dedos.normalize()
      const largo = Math.max(...suyos.map(k => P(k).sub(mano.p).dot(dedos)))
      // El pulgar: lo que más se aparta del eje de los dedos a media mano (ni en la
      // muñeca, donde un puño de guante o un brazal abultan hacia todos lados, ni en
      // la punta de los dedos).
      let pulgar = new THREE.Vector3(); let aparta = 0
      for (const k of suyos) {
        const r = P(k).sub(mano.p); const u = r.dot(dedos)
        if (u < largo * 0.25 || u > largo * 0.7) continue
        r.addScaledVector(dedos, -u)
        if (r.length() > aparta) { aparta = r.length(); pulgar = r.clone().normalize() }
      }
      // La palma: con los dedos hacia delante y la palma hacia abajo, el pulgar
      // de la derecha cae a la izquierda y el de la izquierda, a la derecha.
      // El plano de la palma: la dirección, de las que cruzan los dedos, en la que
      // la mano es más delgada.
      const a1 = pulgar.clone(); const a2 = new THREE.Vector3().crossVectors(dedos, pulgar).normalize()
      const medio = suyos.filter(k => { const u = P(k).sub(mano.p).dot(dedos); return u > largo * 0.1 && u < largo * 0.5 })
      const centro = medio.reduce((t, k) => t.add(P(k)), new THREE.Vector3()).multiplyScalar(1 / medio.length)
      let palma = a2.clone(); let menor = Infinity
      for (let g = 0; g < 180; g += 2) {
        const dir = a1.clone().multiplyScalar(Math.cos(g * Math.PI / 180)).addScaledVector(a2, Math.sin(g * Math.PI / 180))
        const ancho = medio.reduce((t, k) => t + P(k).sub(centro).dot(dir) ** 2, 0)
        if (ancho < menor) { menor = ancho; palma = dir }
      }
      // Y de sus dos caras, cuál es la palma. Ni el pulgar ni la curva de los
      // dedos lo dicen de fiar (probado: cada seña acertó en un cuerpo y falló en
      // el otro). Lo que no falla en una figura en pose A es la anatomía: la
      // palma mira hacia el cuerpo, hacia delante o hacia arriba; nunca hacia
      // fuera ni hacia atrás. El modelo mira a +Z. `--al-reves` por si acaso.
      const dentro = new THREE.Vector3(-Math.sign(mano.p.x), 0.5, 0.5)
      if (palma.dot(dentro) < 0) palma.negate()
      if (process.argv.includes('--al-reves')) palma.negate()
      const u0 = largo * NUDILLOS
      const radio = (largo - u0) / GIRO
      const eje = new THREE.Vector3().crossVectors(dedos, palma).normalize()     // la línea de los nudillos
      console.log(`  ${lado}: ${suyos.length} vértices, mano de ${(largo * 100).toFixed(1)} (×escala), palma hacia (${palma.toArray().map(x => x.toFixed(2)).join(', ')}), dedos hacia (${dedos.toArray().map(x => x.toFixed(2)).join(', ')}), brazo hacia (${mano.p.clone().sub(codo.p).normalize().toArray().map(x => x.toFixed(2)).join(', ')})`)
      if (soloVer) continue
      const q = new THREE.Quaternion()
      for (const k of suyos) {
        const r = P(k).sub(mano.p)
        const u = r.dot(dedos); const v = r.dot(palma); const w = r.dot(eje)
        if (u <= u0) continue
        // Doblar en arco: lo que estaba a `d` de los nudillos pasa a estar a un
        // ángulo d / radio alrededor de un eje que queda `radio` por el lado de la palma.
        const ang = (u - u0) / radio
        const r2 = radio - v
        const nu = u0 + r2 * Math.sin(ang)
        const nv = radio - r2 * Math.cos(ang)
        const p = mano.p.clone().addScaledVector(dedos, nu).addScaledVector(palma, nv).addScaledVector(eje, w)
        bin.writeFloatLE(p.x, dPos(k, 0)); bin.writeFloatLE(p.y, dPos(k, 1)); bin.writeFloatLE(p.z, dPos(k, 2))
        if (nor) {
          // La normal gira lo mismo: de «dedos» hacia «palma».
          q.setFromAxisAngle(eje, ang)
          const m = new THREE.Vector3(nor(k, 0), nor(k, 1), nor(k, 2)).applyQuaternion(q)
          bin.writeFloatLE(m.x, dNor(k, 0)); bin.writeFloatLE(m.y, dNor(k, 1)); bin.writeFloatLE(m.z, dNor(k, 2))
        }
      }
    }
    // La caja de las posiciones, que es obligatoria y ha cambiado.
    const ap = json.accessors[at.POSITION]
    ap.min = [Infinity, Infinity, Infinity]; ap.max = [-Infinity, -Infinity, -Infinity]
    for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) { const x = pos(k, c); ap.min[c] = Math.min(ap.min[c], x); ap.max[c] = Math.max(ap.max[c], x) }
  }
}

if (!soloVer) {
  // El binario se ha escrito en su sitio; el JSON solo cambia en la caja, pero puede cambiar de largo.
  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  texto = Buffer.concat([texto, Buffer.alloc((4 - (texto.length % 4)) % 4, 0x20)])
  const cab = Buffer.alloc(12)
  cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + texto.length + 8 + bin.length, 8)
  const cJson = Buffer.alloc(8); cJson.writeUInt32LE(texto.length, 0); cJson.writeUInt32LE(0x4e4f534a, 4)
  const cBin = Buffer.alloc(8); cBin.writeUInt32LE(bin.length, 0); cBin.writeUInt32LE(0x004e4942, 4)
  fs.writeFileSync(archivo, Buffer.concat([cab, cJson, texto, cBin, bin]))
  console.log(`${archivo}: manos cerradas`)
}
