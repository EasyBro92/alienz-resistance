// Adelgazar un .glb reduciendo sus texturas.
//
// La nodriza salió de Meshy con 4.224 triángulos —una miseria— y 6,75 MB de
// texturas: cuatro JPEG a 2048 píxeles. Ahí está TODO el peso. Y 2k es el mínimo
// que ofrece su API, así que recortar hay que hacerlo aquí.
//
// A la escala a la que se ve una nave en un móvil, al fondo de la carretera, un
// mapa de 2048 no aporta nada sobre uno de 512: el píxel de textura acaba siendo
// más pequeño que el píxel de pantalla y el móvil se traga cuatro megas para no
// enseñar ni un detalle más. El mapa de color va algo más alto que los demás
// porque es el único que se mira de verdad; la rugosidad y la oclusión pueden
// bajar mucho más sin que nadie lo note.
//
// Uso:  node herramientas/adelgazar.mjs public/models/nave-nodriza.glb [--color 512]

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const archivo = process.argv[2]
if (!archivo || !fs.existsSync(archivo)) {
  console.error('\nUso: node herramientas/adelgazar.mjs <archivo.glb> [--color 512]\n')
  process.exit(1)
}
const anchoColor = Number(process.argv.includes('--color')
  ? process.argv[process.argv.indexOf('--color') + 1] : 512)

// --- leer el contenedor ------------------------------------------------------
// Un .glb son dos trozos pegados: una cabecera JSON que describe la escena y un
// bloque binario con los datos. Las imágenes viven dentro del binario, cada una
// señalada por un `bufferView` con su desplazamiento y su longitud.
const bruto = fs.readFileSync(archivo)
const lenJSON = bruto.readUInt32LE(12)
const json = JSON.parse(bruto.slice(20, 20 + lenJSON).toString('utf8'))
const binInicio = 20 + lenJSON + 8
const bin = bruto.slice(binInicio, binInicio + bruto.readUInt32LE(20 + lenJSON))

// De qué tira cada material, para saber cuánto recorte aguanta cada imagen.
// El color se mira; la normal da el relieve y aguanta la mitad; la rugosidad y
// la oclusión son casi planas y no las mira nadie.
const papel = new Map()
for (const m of json.materials ?? []) {
  const p = m.pbrMetallicRoughness ?? {}
  const marcar = (t, clase) => { if (t) papel.set(json.textures[t.index].source, clase) }
  marcar(p.baseColorTexture, 'color')
  marcar(m.normalTexture, 'normal')
  marcar(p.metallicRoughnessTexture, 'plano')
  marcar(m.occlusionTexture, 'plano')
  marcar(m.emissiveTexture, 'color')
}
const ANCHOS = { color: anchoColor, normal: Math.round(anchoColor / 2), plano: Math.round(anchoColor / 4) }

// --- recomprimir cada imagen -------------------------------------------------
const trozos = []
let cursor = 0
let antes = 0
let despues = 0

for (const [i, img] of (json.images ?? []).entries()) {
  const bv = json.bufferViews[img.bufferView]
  const inicio = bv.byteOffset ?? 0
  const datos = bin.slice(inicio, inicio + bv.byteLength)
  const clase = papel.get(i) ?? 'color'
  const ancho = ANCHOS[clase]

  const nueva = await sharp(datos)
    .resize(ancho, ancho, { fit: 'inside', withoutEnlargement: true })
    // WebP y no JPEG: mismo aspecto a la mitad de bytes, y lo entiende cualquier
    // navegador que mueva WebGL2. La malla ya no pesa, así que esto es el juego.
    .webp({ quality: clase === 'color' ? 82 : 74 })
    .toBuffer()

  antes += datos.length
  despues += nueva.length
  console.log(`  imagen ${i} (${clase}): ${(datos.length / 1024).toFixed(0)} KB → ${(nueva.length / 1024).toFixed(0)} KB  @${ancho}px`)

  img.mimeType = 'image/webp'
  trozos.push({ img, bv, nueva })
}

// --- rehacer el binario ------------------------------------------------------
// Solo se reescriben las vistas de las imágenes; el resto del binario (posiciones,
// normales, índices) se copia tal cual. Se reconstruye entero en orden nuevo
// porque al cambiar de tamaño cada imagen, todos los desplazamientos se mueven.
const noImagen = new Set(trozos.map(t => json.bufferViews.indexOf(t.bv)))
const salida = []

for (const [i, bv] of json.bufferViews.entries()) {
  const t = trozos.find(x => json.bufferViews.indexOf(x.bv) === i)
  const datos = t ? t.nueva : bin.slice(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
  // Alineado a 4 bytes: glTF lo exige para las vistas que leen los accesores, y
  // saltárselo hace que algunos lectores devuelvan geometría basura.
  const relleno = (4 - (cursor % 4)) % 4
  if (relleno) { salida.push(Buffer.alloc(relleno)); cursor += relleno }
  bv.byteOffset = cursor
  bv.byteLength = datos.length
  salida.push(datos)
  cursor += datos.length
}
void noImagen

const nuevoBin = Buffer.concat(salida)
json.buffers[0].byteLength = nuevoBin.length
delete json.buffers[0].uri

// El JSON también va alineado a 4, y el relleno tiene que ser ESPACIOS: un cero
// dentro del trozo JSON hace que el analizador se atragante.
let txt = Buffer.from(JSON.stringify(json), 'utf8')
if (txt.length % 4) txt = Buffer.concat([txt, Buffer.alloc(4 - (txt.length % 4), 0x20)])
const binAl = nuevoBin.length % 4
  ? Buffer.concat([nuevoBin, Buffer.alloc(4 - (nuevoBin.length % 4))])
  : nuevoBin

const cabecera = Buffer.alloc(12)
cabecera.write('glTF', 0)
cabecera.writeUInt32LE(2, 4)
cabecera.writeUInt32LE(12 + 8 + txt.length + 8 + binAl.length, 8)

const cabJSON = Buffer.alloc(8)
cabJSON.writeUInt32LE(txt.length, 0)
cabJSON.write('JSON', 4)

const cabBIN = Buffer.alloc(8)
cabBIN.writeUInt32LE(binAl.length, 0)
cabBIN.write('BIN\0', 4)

const final = Buffer.concat([cabecera, cabJSON, txt, cabBIN, binAl])
fs.writeFileSync(archivo, final)

console.log(`\n  texturas: ${(antes / 1024 / 1024).toFixed(2)} MB → ${(despues / 1024 / 1024).toFixed(2)} MB`)
console.log(`  ${path.basename(archivo)}: ${(bruto.length / 1024 / 1024).toFixed(2)} MB → ${(final.length / 1024 / 1024).toFixed(2)} MB\n`)
