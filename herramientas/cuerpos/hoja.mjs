// Junta en una hoja las fotos que deja `cuerpos.py -- --vista`, una fila por
// personaje, para repasarlas de un vistazo.
//
//   node herramientas/cuerpos/hoja.mjs [--solo 1-frente,4-espalda] [clave …]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const VISTAS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'blender', 'vistas')
const args = process.argv.slice(2)
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1].split(',') : ['1-frente', '2-trescuartos', '3-perfil', '4-espalda', '5-juego']
const prefijo = args.includes('--de') ? args[args.indexOf('--de') + 1] : 'cuerpo'
const claves = args.filter((a, i) => !a.startsWith('--') && !['--solo', '--de'].includes(args[i - 1]))
const W = 372, Hh = 540
const piezas = []
for (const [f, clave] of claves.entries()) {
  for (const [c, vista] of solo.entries()) {
    const archivo = path.join(VISTAS, `${prefijo}-${clave}-${vista}.png`)
    if (!fs.existsSync(archivo)) continue
    piezas.push({ input: await sharp(archivo).resize(W, Hh, { fit: 'cover' }).toBuffer(), left: c * W, top: f * Hh })
  }
}
const salida = path.join(VISTAS, 'CUERPOS.png')
await sharp({ create: { width: solo.length * W, height: claves.length * Hh, channels: 3, background: '#bdc2c7' } }).composite(piezas).png().toFile(salida)
console.log(salida)
