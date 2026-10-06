// Pega varias fotos en una tira (o en varias filas) para verlas de un vistazo.
//
//   node herramientas/cuerpos/tira.mjs <salida.png> [--alto 600] [--filas 2] <foto> <foto> …

import sharp from 'sharp'

const args = process.argv.slice(2)
const num = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) : d)
const alto = num('--alto', 600)
const filas = num('--filas', 1)
const fotos = args.filter((a, i) => !a.startsWith('--') && !['--alto', '--filas'].includes(args[i - 1]))
const salida = fotos.shift()
const porFila = Math.ceil(fotos.length / filas)
const piezas = []
let x = 0; let y = 0; let ancho = 0
for (const [i, f] of fotos.entries()) {
  if (i && i % porFila === 0) { x = 0; y += alto }
  const img = sharp(f).resize({ height: alto })
  const b = await img.toBuffer({ resolveWithObject: true })
  piezas.push({ input: b.data, left: x, top: y })
  x += b.info.width
  ancho = Math.max(ancho, x)
}
await sharp({ create: { width: ancho, height: y + alto, channels: 3, background: '#bdc2c7' } }).composite(piezas).png().toFile(salida)
console.log(salida)
