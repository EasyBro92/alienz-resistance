// Baja Piper, el programa de voces con el que se dicen las frases del juego, y
// sus voces en castellano (Isidro dio permiso el 11/10/2026: «te doy permiso para
// Piper»). Son 275 MB y van a `herramientas/paquetes/piper/`, fuera de git: en un
// PC nuevo hay que volver a pasarlo.
//
//   node herramientas/voces/bajar-piper.mjs          baja lo que falte
//   node herramientas/voces/bajar-piper.mjs mirar    solo dice qué falta
//
// De dónde sale cada cosa, y de ningún otro sitio:
//   · el programa, de las publicaciones oficiales de su repositorio en GitHub
//     (rhasspy/piper, licencia MIT; la última con ejecutable para Windows);
//   · las voces, del repositorio oficial rhasspy/piper-voices en Hugging Face.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
export const PIPER = path.resolve(aqui, '../paquetes/piper')
export const EJECUTABLE = path.join(PIPER, 'programa/piper/piper.exe')
export const modeloDe = nombre => path.join(PIPER, 'voces', nombre + '.onnx')

// Piper necesita las bibliotecas de Visual C++ de Microsoft (vcruntime140,
// msvcp140) y este Windows no las tiene instaladas: salía con el código
// 0xC0000135, «falta una DLL», sin decir cuál. Blender las trae en su carpeta
// `blender.crt`, así que se le presta esa carpeta en el PATH a Piper y solo a
// él: no se instala ni se copia nada. Con las de sistema instaladas, no hace falta.
const CRT_DE_BLENDER = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.crt'
export function entornoPiper () {
  const sistema = path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32/vcruntime140.dll')
  if (fs.existsSync(sistema)) return process.env
  if (!fs.existsSync(path.join(CRT_DE_BLENDER, 'vcruntime140.dll'))) {
    throw new Error('A Piper le faltan las bibliotecas de Visual C++ (vcruntime140.dll): ni están en Windows ni en la carpeta blender.crt de Blender')
  }
  const env = { ...process.env }
  const clave = Object.keys(env).find(k => k.toLowerCase() === 'path') ?? 'PATH'
  env[clave] = path.resolve(CRT_DE_BLENDER) + path.delimiter + (env[clave] ?? '')
  return env
}

const PROGRAMA = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip'
const VOCES = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/'
// Dos de España (la segunda trae un hombre y una mujer) y dos de México.
export const MODELOS = {
  'es_ES-davefx-medium': 'es_ES/davefx/medium/',
  'es_ES-sharvard-medium': 'es_ES/sharvard/medium/',
  'es_MX-ald-medium': 'es_MX/ald/medium/',
  'es_MX-claude-high': 'es_MX/claude/high/'
}

async function bajar (url, destino) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} al bajar ${url}`)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  // A un nombre provisional: si se corta, no queda un archivo a medias con el nombre bueno.
  const parcial = destino + '.parcial'
  const salida = fs.createWriteStream(parcial)
  let bytes = 0
  for await (const trozo of r.body) { bytes += trozo.length; if (!salida.write(trozo)) await new Promise(ok => salida.once('drain', ok)) }
  await new Promise(ok => salida.end(ok))
  fs.renameSync(parcial, destino)
  console.log(`  ${path.basename(destino)}  ${(bytes / 1048576).toFixed(1)} MB`)
}

const pendientes = []
if (!fs.existsSync(EJECUTABLE)) pendientes.push(['programa', PROGRAMA])
for (const [nombre, carpeta] of Object.entries(MODELOS)) {
  for (const cola of ['.onnx', '.onnx.json']) {
    if (!fs.existsSync(path.join(PIPER, 'voces', nombre + cola))) pendientes.push(['voz', VOCES + carpeta + nombre + cola, path.join(PIPER, 'voces', nombre + cola)])
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!pendientes.length) console.log('Piper está entero en herramientas/paquetes/piper')
  else if (process.argv[2] === 'mirar') console.log('Falta:\n' + pendientes.map(p => '  ' + p[1]).join('\n'))
  else {
    for (const [tipo, url, destino] of pendientes) {
      if (tipo === 'voz') { await bajar(url, destino); continue }
      // El programa viene en un .zip: se abre en su propia carpeta, vacía.
      const zip = path.join(PIPER, 'piper_windows_amd64.zip')
      await bajar(url, zip)
      const carpeta = path.join(PIPER, 'programa')
      fs.rmSync(carpeta, { recursive: true, force: true })
      execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${carpeta}'`])
      fs.rmSync(zip)
    }
    console.log('hecho')
  }
}
