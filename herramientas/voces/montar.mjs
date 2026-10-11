// Las voces del juego, de la lista de frases a lo que carga el navegador.
//
//   node herramientas/voces/montar.mjs            rehace lo que haya cambiado
//   node herramientas/voces/montar.mjs --muestra  además deja vistas/voces-muestra.mp3,
//                                                 una frase de cada uno por la radio, para oírlas
//   node herramientas/voces/montar.mjs --windows  las dice con las voces de Windows en vez de
//                                                 con Piper (peores, pero no hay que bajar nada)
//
// Qué hace: (1) lee `frases.mjs`; (2) las frases que aún no están dichas las
// dice con Piper (`bajar-piper.mjs` lo trae) y deja un .wav por frase en `crudo/`
// (fuera de git; el nombre es la huella de motor + voz + tono + ritmo + texto,
// así que solo se vuelve a decir lo que cambia); (3) a cada una le pone su tono,
// le quita el silencio, la iguala de volumen y la pasa a MP3; (4) junta las de
// cada hablante en UN archivo, `public/voces/<hablante>.<huella>.mp3`, y apunta
// en `src/voces.json` en qué byte empieza cada frase.
//
// Un archivo por hablante y no uno por frase (serían 250 peticiones) ni uno para
// todos (un mega que casi nadie oiría entero): el juego baja el de un soldado
// cuando ese soldado sale al campo. La huella en el nombre deja que el móvil lo
// guarde para siempre sin quedarse nunca con uno viejo.
//
// EL TONO. Piper no tiene mando de tono, solo de ritmo. Para que con cinco voces
// salgan veinticinco personas, el tono se hace aquí: se le pide la frase más
// lenta (o más rápida) de la cuenta y se reproduce más deprisa (o más despacio)
// justo lo contrario. Dura lo mismo y suena más aguda (o más grave), con la boca
// más pequeña (o más grande): otra persona, no la misma con la voz forzada.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { reparto, VOCES_PIPER } from './frases.mjs'
import { EJECUTABLE, modeloDe, entornoPiper } from './bajar-piper.mjs'
import { leerWav, recortar, igualar, afinar, porRadio, aMp3, silencio, juntar } from './sonido.mjs'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '../..')
const crudo = path.join(aqui, 'crudo')
const destino = path.join(raiz, 'public/voces')
const huella = (...cosas) => crypto.createHash('sha1').update(cosas.join('|')).digest('hex')
const conSigno = n => `${n >= 0 ? '+' : ''}${n}%`
const HZ = 16000
const conWindows = process.argv.includes('--windows')

const todos = reparto()

// --- (2) decir lo que falte ---------------------------------------------------------
const lineas = []
for (const [quien, { voz, frases }] of Object.entries(todos)) {
  const [nombre, tono, ritmo] = voz
  const motor = conWindows ? 'windows' : 'piper'
  for (const [momento, lista] of Object.entries(frases)) {
    lista.forEach((texto, i) => {
      lineas.push({ quien, momento, i, texto, nombre, tono, ritmo, motor, id: huella(motor, nombre, tono, ritmo, texto).slice(0, 14) })
    })
  }
}
fs.mkdirSync(crudo, { recursive: true })
const wav = l => path.join(crudo, l.id + '.wav')
const faltan = lineas.filter(l => !fs.existsSync(wav(l)))

if (faltan.length && conWindows) {
  // Windows sí tiene mando de tono: se lo pone él y aquí no se afina nada.
  const lista = path.join(crudo, '_faltan.json')
  fs.writeFileSync(lista, JSON.stringify(faltan.map(l => ({ id: l.id, voz: VOCES_PIPER[l.nombre].windows, texto: l.texto, tono: conSigno(l.tono), ritmo: conSigno(l.ritmo) }))))
  console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(aqui, 'hablar.ps1'), lista, crudo], { encoding: 'utf8' }).trim())
  fs.rmSync(lista)
} else if (faltan.length) {
  if (!fs.existsSync(EJECUTABLE)) throw new Error('Falta Piper: node herramientas/voces/bajar-piper.mjs (o pasar --windows)')
  // Una tanda por hablante: el ritmo se le da al programa al arrancar, no por frase.
  const tandas = new Map()
  for (const l of faltan) {
    const clave = [l.nombre, l.tono, l.ritmo].join('|')
    if (!tandas.has(clave)) tandas.set(clave, [])
    tandas.get(clave).push(l)
  }
  for (const tanda of tandas.values()) {
    const { nombre, tono, ritmo } = tanda[0]
    const v = VOCES_PIPER[nombre]
    // Lo que tarda cada sonido: más si luego se va a acelerar para subirle el
    // tono, menos si lleva prisa.
    const largo = (1 + tono / 100) / (1 + ritmo / 100)
    const entrada = tanda.map(l => JSON.stringify({ text: l.texto, ...(v.hablante != null ? { speaker_id: v.hablante } : {}), output_file: wav(l) })).join('\n') + '\n'
    const r = spawnSync(EJECUTABLE, ['--model', modeloDe(v.modelo), '--json-input', '--length_scale', largo.toFixed(3), '--sentence_silence', '0.1', '--quiet'], { env: entornoPiper(), input: Buffer.from(entrada, 'utf8') })
    if (r.status !== 0) throw new Error(`Piper falla con ${nombre} (${r.status}): ${r.stderr?.toString().slice(0, 300)}`)
  }
  console.log(`${faltan.length} frases dichas con Piper`)
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
      const { hz, datos } = leerWav(wav(l))
      // A 16 kHz y, si viene de Piper, con su tono.
      const d = igualar(recortar(afinar(datos, hz, HZ, l.motor === 'piper' ? 1 + l.tono / 100 : 1), HZ))
      limpias.set(l, d)
      const mp3 = aMp3(d, HZ, 32)
      trozos.push(mp3)
      suyas[momento].push([p, mp3.length])
      p += mp3.length
      segundos += d.length / HZ
      // Una frase de más de dos segundos y medio pisa a la siguiente: avisar.
      if (d.length / HZ > 2.6) { largas++; console.log(`  larga (${(d.length / HZ).toFixed(1)} s): ${quien} · ${l.texto}`) }
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
    trozos.push(porRadio(limpias.get(l), HZ), silencio(HZ, 0.45))
  }
  const salida = path.join(raiz, 'vistas/voces-muestra.mp3')
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  fs.writeFileSync(salida, aMp3(juntar(trozos), HZ, 48))
  console.log('muestra en vistas/voces-muestra.mp3')
}
