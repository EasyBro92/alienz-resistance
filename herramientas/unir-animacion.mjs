// Meterle a un .glb con esqueleto las animaciones de OTRO .glb del mismo esqueleto.
//
// Meshy, al montar el esqueleto, devuelve el andar y el correr en dos archivos
// distintos, y cada uno trae su copia de la malla y de las texturas: publicar los
// dos sería bajar el personaje dos veces para aprovechar del segundo unos pocos
// kilobytes de curvas. Aquí se copian SOLO las curvas: los datos de cada canal
// se pegan al final del bloque binario del primero y se apuntan a sus huesos por
// NOMBRE (el orden de los nodos puede no coincidir de un archivo a otro).
//
// Uso:  node herramientas/unir-animacion.mjs <destino.glb> <con-la-animacion.glb>
//       (escribe encima del destino; una animación que ya tenga con ese nombre no se repite)

import fs from 'node:fs'

const [destino, fuente] = process.argv.slice(2)
if (!destino || !fuente || !fs.existsSync(destino) || !fs.existsSync(fuente)) {
  console.error('\nUso: node herramientas/unir-animacion.mjs <destino.glb> <con-la-animacion.glb>\n')
  process.exit(1)
}

// Un .glb: cabecera de 12 bytes, un trozo JSON y un trozo binario.
function leer (ruta) {
  const b = fs.readFileSync(ruta)
  const nJson = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + nJson).toString('utf8'))
  const iBin = 20 + nJson
  const nBin = b.readUInt32LE(iBin)
  return { json, bin: b.subarray(iBin + 8, iBin + 8 + nBin) }
}

const a = leer(destino)
const o = leer(fuente)
const nodoPorNombre = new Map(a.json.nodes.map((n, i) => [n.name, i]))
const trozos = [a.bin]
let largo = a.bin.length
const relleno = n => (4 - (n % 4)) % 4

// Cada accesor de la fuente que haga falta, copiado una sola vez (el de los
// tiempos lo comparten casi todos los canales).
const copiados = new Map()
function copiarAccesor (i) {
  if (copiados.has(i)) return copiados.get(i)
  const acc = o.json.accessors[i]
  if (acc.componentType !== 5126) {
    console.error('\nUna curva que no va en coma flotante: no sé copiarla.\n')
    process.exit(1)
  }
  const vista = o.json.bufferViews[acc.bufferView]
  const desde = (vista.byteOffset ?? 0) + (acc.byteOffset ?? 0)
  const porDato = { SCALAR: 1, VEC3: 3, VEC4: 4 }[acc.type] * 4      // las curvas van en coma flotante
  const datos = o.bin.subarray(desde, desde + acc.count * porDato)
  const hueco = relleno(largo)
  if (hueco) { trozos.push(Buffer.alloc(hueco)); largo += hueco }
  a.json.bufferViews.push({ buffer: 0, byteOffset: largo, byteLength: datos.length })
  trozos.push(datos)
  largo += datos.length
  const { bufferView, byteOffset, ...resto } = acc
  a.json.accessors.push({ ...resto, bufferView: a.json.bufferViews.length - 1 })
  copiados.set(i, a.json.accessors.length - 1)
  return copiados.get(i)
}

let metidas = 0
for (const anim of o.json.animations ?? []) {
  if ((a.json.animations ?? []).some(x => x.name === anim.name)) continue
  const canales = []
  const muestreos = []
  for (const canal of anim.channels) {
    const nombre = o.json.nodes[canal.target.node].name
    if (!nodoPorNombre.has(nombre)) {
      console.error(`\nEl destino no tiene el hueso «${nombre}»: no son el mismo esqueleto.\n`)
      process.exit(1)
    }
    const m = anim.samplers[canal.sampler]
    muestreos.push({ ...m, input: copiarAccesor(m.input), output: copiarAccesor(m.output) })
    canales.push({ sampler: muestreos.length - 1, target: { node: nodoPorNombre.get(nombre), path: canal.target.path } })
  }
  ;(a.json.animations ??= []).push({ name: anim.name, channels: canales, samplers: muestreos })
  metidas++
}

// Y a montar el archivo otra vez: el JSON relleno con espacios y el binario con ceros.
const cola = relleno(largo)
if (cola) { trozos.push(Buffer.alloc(cola)); largo += cola }
a.json.buffers[0].byteLength = largo
let texto = Buffer.from(JSON.stringify(a.json), 'utf8')
texto = Buffer.concat([texto, Buffer.alloc(relleno(texto.length), 0x20)])
const cab = Buffer.alloc(12)
cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + texto.length + 8 + largo, 8)
const cJson = Buffer.alloc(8); cJson.writeUInt32LE(texto.length, 0); cJson.writeUInt32LE(0x4e4f534a, 4)
const cBin = Buffer.alloc(8); cBin.writeUInt32LE(largo, 0); cBin.writeUInt32LE(0x004e4942, 4)
fs.writeFileSync(destino, Buffer.concat([cab, cJson, texto, cBin, ...trozos]))
console.log(`${destino}: ${metidas} animación(es) añadida(s); ahora trae ${a.json.animations.map(x => x.name).join(', ')}  (${(fs.statSync(destino).size / 1024).toFixed(0)} KB)`)
