// Las voces del juego, de la lista de frases a lo que carga el navegador.
//
//   node herramientas/voces/montar.mjs            rehace lo que haya cambiado
//   node herramientas/voces/montar.mjs --muestra  además deja vistas/voces-muestra.mp3,
//                                                 una frase de cada uno por la radio, para oírlas
//
// Qué hace: (1) lee `frases.mjs`; (2) las frases que aún no están dichas se las
// pasa a `hablar.ps1`, que las dice con las voces de Windows y deja un .wav por
// frase en `crudo/` (fuera de git; el nombre es la huella de voz + tono + ritmo +
// texto, así que solo se vuelve a decir lo que cambia); (3) a cada una le quita
// el silencio, la iguala de volumen y la pasa a MP3; (4) junta las de cada
// hablante en UN archivo, `public/voces/<hablante>.<huella>.mp3`, y apunta en
// `src/voces.json` en qué byte empieza cada frase.
//
// Un archivo por hablante y no uno por frase (serían 250 peticiones) ni uno para
// todos (un mega que casi nadie oiría entero): el juego baja el de un soldado
// cuando ese soldado sale al campo. La huella en el nombre deja que el móvil lo
// guarde para siempre sin quedarse nunca con uno viejo.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { reparto } from './frases.mjs'
import { leerWav, recortar, igualar, porRadio, aMp3, silencio, juntar } from './sonido.mjs'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '../..')
const crudo = path.join(aqui, 'crudo')
const destino = path.join(raiz, 'public/voces')
const huella = (...cosas) => crypto.createHash('sha1').update(cosas.join('|')).digest('hex')
const conSigno = n => `${n >= 0 ? '+' : ''}${n}%`

const todos = reparto()

// --- (2) decir lo que falte ---------------------------------------------------------
const lineas = []
for (const [quien, { voz, frases }] of Object.entries(todos)) {
  for (const [momento, lista] of Object.entries(frases)) {
    lista.forEach((texto, i) => {
      const [nombre, tono, ritmo] = voz
      lineas.push({ quien, momento, i, texto, id: huella(nombre, tono, ritmo, texto).slice(0, 14), voz: nombre, tono: conSigno(tono), ritmo: conSigno(ritmo) })
    })
  }
}
fs.mkdirSync(crudo, { recursive: true })
const faltan = lineas.filter(l => !fs.existsSync(path.join(crudo, l.id + '.wav')))
if (faltan.length) {
  const lista = path.join(crudo, '_faltan.json')
  fs.writeFileSync(lista, JSON.stringify(faltan.map(({ id, voz, texto, tono, ritmo }) => ({ id, voz, texto, tono, ritmo }))))
  console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(aqui, 'hablar.ps1'), lista, crudo], { encoding: 'utf8' }).trim())
  fs.rmSync(lista)
}

// --- (3) y (4) preparar y empaquetar ------------------------------------------------
fs.mkdirSync(destino, { recursive: true })
const indice = {}
const limpias = new Map()
let segundos = 0; let bytes = 0; let largas = 0
for (const [quien, { frases }] of Object.entries(todos)) {
  const trozos = []
  const suyas = {}
  let p = 0
  for (const momento of Object.keys(frases)) {
    suyas[momento] = []
    for (const l of lineas.filter(l => l.quien === quien && l.momento === momento)) {
      const { hz, datos } = leerWav(path.join(crudo, l.id + '.wav'))
      const d = igualar(recortar(datos, hz))
      limpias.set(l, { d, hz })
      const mp3 = aMp3(d, hz, 32)
      trozos.push(mp3)
      suyas[momento].push([p, mp3.length])
      p += mp3.length
      segundos += d.length / hz
      // Una frase de más de dos segundos y medio pisa a la siguiente: avisar.
      if (d.length / hz > 2.6) { largas++; console.log(`  larga (${(d.length / hz).toFixed(1)} s): ${quien} · ${l.texto}`) }
    }
  }
  const todo = Buffer.concat(trozos)
  const archivo = `${quien}.${huella(todo.toString('base64')).slice(0, 8)}.mp3`
  for (const viejo of fs.readdirSync(destino)) if (viejo.startsWith(quien + '.') && viejo !== archivo) fs.rmSync(path.join(destino, viejo))
  fs.writeFileSync(path.join(destino, archivo), todo)
  indice[quien] = { a: archivo, f: suyas }
  bytes += todo.length
}
// Lo que ya no habla nadie.
for (const f of fs.readdirSync(destino)) if (!Object.values(indice).some(v => v.a === f)) fs.rmSync(path.join(destino, f))
fs.writeFileSync(path.join(raiz, 'src/voces.json'), JSON.stringify(indice) + '\n')
console.log(`${lineas.length} frases de ${Object.keys(todos).length} hablantes: ${segundos.toFixed(0)} s, ${(bytes / 1024).toFixed(0)} KB en public/voces` + (largas ? ` · ${largas} largas` : ''))

// --- la muestra para oír -----------------------------------------------------------
if (process.argv.includes('--muestra')) {
  const trozos = []
  for (const quien of Object.keys(todos)) {
    const l = lineas.find(l => l.quien === quien)
    const { d, hz } = limpias.get(l)
    trozos.push(porRadio(d, hz), silencio(hz, 0.45))
  }
  const salida = path.join(raiz, 'vistas/voces-muestra.mp3')
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  fs.writeFileSync(salida, aMp3(juntar(trozos), 16000, 48))
  console.log('muestra en vistas/voces-muestra.mp3')
}
