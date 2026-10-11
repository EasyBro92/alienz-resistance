// Lo que mide cada tramo de la demostración grabada por `guion-voces.mjs`
// (`GRABAR=1`): pico, energía de lo que suena y cuánto dura. Es la forma de
// «oír» desde aquí: que nada sature, que nada quede mudo y que las voces no
// queden por debajo de los disparos.
//
//   node herramientas/voces/niveles.mjs [--mp3] [--solo-voces]
//
// `--mp3` deja además vistas/sonidos-demo.mp3; con `--solo-voces`, solo el trozo
// de las frases, en vistas/voces-demo.mp3.
import fs from 'node:fs'
import { Mp3Encoder } from '@breezystack/lamejs'

const b = fs.readFileSync('vistas/sonidos-demo.wav')
const { hz, marcas } = JSON.parse(fs.readFileSync('vistas/sonidos-demo.json', 'utf8'))
const n = (b.length - 44) / 4
const izq = new Float32Array(n); const der = new Float32Array(n)
for (let i = 0; i < n; i++) { izq[i] = b.readInt16LE(44 + i * 4) / 32768; der[i] = b.readInt16LE(46 + i * 4) / 32768 }
const db = v => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf').padStart(6)
const retraso = 0
marcas.push(['fin', n / hz])
for (let k = 0; k < marcas.length - 1; k++) {
  const a = Math.round((marcas[k][1] + retraso) * hz); const z = Math.min(n, Math.round((marcas[k + 1][1] + retraso) * hz))
  let pico = 0; let suma = 0; let cuenta = 0; let ultimo = a
  for (let i = a; i < z; i++) {
    const v = Math.max(Math.abs(izq[i]), Math.abs(der[i]))
    pico = Math.max(pico, v)
    if (v > 0.01) { suma += (izq[i] ** 2 + der[i] ** 2) / 2; cuenta++; ultimo = i }
  }
  console.log(marcas[k][0].padEnd(30), 'pico', db(pico), 'dB · media', db(Math.sqrt(suma / Math.max(1, cuenta))), 'dB · suena', ((ultimo - a) / hz).toFixed(2), 's')
}
if (process.argv.includes('--mp3')) {
  const soloVoces = process.argv.includes('--solo-voces')
  const desde = soloVoces ? Math.max(0, Math.round((marcas.find(m => m[0].startsWith('voz'))?.[1] ?? 0) * hz) - Math.round(hz * 0.3)) : 0
  const cod = new Mp3Encoder(2, hz, 128)
  const a16 = Int16Array.from(izq, v => v * 32767); const b16 = Int16Array.from(der, v => v * 32767)
  const trozos = []
  for (let i = desde; i < n; i += 1152) { const t = cod.encodeBuffer(a16.subarray(i, i + 1152), b16.subarray(i, i + 1152)); if (t.length) trozos.push(Buffer.from(t)) }
  trozos.push(Buffer.from(cod.flush()))
  const salida = soloVoces ? 'vistas/voces-demo.mp3' : 'vistas/sonidos-demo.mp3'
  fs.writeFileSync(salida, Buffer.concat(trozos))
  console.log(salida, (fs.statSync(salida).size / 1024).toFixed(0), 'KB')
}
