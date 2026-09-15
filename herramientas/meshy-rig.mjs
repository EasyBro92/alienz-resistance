// Poner esqueleto en Meshy a un modelo que ya está publicado y bajar sus
// animaciones de andar y correr.
//
// Los huéspedes se generaron sin esqueleto y el que se les monta por código
// no pasa de muñeco. El montador de Meshy mete huesos de verdad y devuelve dos
// ciclos hechos con captura de movimiento. Cuesta 5 créditos por modelo.
//
// Uso:
//   node herramientas/meshy-rig.mjs --nombre alien-portador --altura 1.8 --minimo 5
//
// Lee el modelo de la web publicada (Meshy necesita una URL pública) y deja en
// public/models/ `<nombre>-andar.glb` y `<nombre>-correr.glb`.

import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DESTINO = path.join(RAIZ, 'public', 'models')
const API = 'https://api.meshy.ai'
const WEB = 'https://easybro92.github.io/alienz-resistance/models/'

const salir = msg => { console.error('\n' + msg + '\n'); process.exit(1) }

// De un archivo, nunca de un argumento: lo que va en la línea de órdenes acaba
// en el historial y en la lista de procesos.
function leerClave () {
  const archivo = path.join(RAIZ, '.env.local')
  if (!fs.existsSync(archivo)) salir(`No encuentro ${archivo}.`)
  const linea = fs.readFileSync(archivo, 'utf8').match(/^MESHY_API_KEY=(.+)$/m)
  if (!linea || !linea[1].trim()) salir('La clave de .env.local está vacía.')
  return linea[1].trim()
}

function args () {
  const out = {}
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue
    out[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true
  }
  return out
}

async function pedir (clave, ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { Authorization: `Bearer ${clave}`, ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) }
  })
  const texto = await r.text()
  let cuerpo
  try { cuerpo = JSON.parse(texto) } catch { cuerpo = texto }
  if (!r.ok) salir(`La API respondió ${r.status}:\n${JSON.stringify(cuerpo, null, 2)}`)
  return cuerpo
}

async function descargar (url, destino) {
  const r = await fetch(url)
  if (!r.ok) salir(`No pude descargar ${destino}: HTTP ${r.status}`)
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()))
  return fs.statSync(destino).size
}

const o = args()
if (!o.nombre) salir('Falta --nombre (el .glb publicado, sin extensión).')
const clave = leerClave()
const saldo = async () => (await pedir(clave, '/openapi/v1/balance')).balance
const antes = await saldo()
if (o.minimo && antes < Number(o.minimo)) salir(`Saldo ${antes} por debajo de ${o.minimo}: no empiezo.`)
console.log(`Saldo antes: ${antes}   ·   ${o.nombre}`)

const tarea = await pedir(clave, '/openapi/v1/rigging', {
  method: 'POST',
  body: JSON.stringify({
    model_url: WEB + o.nombre + '.glb',
    // De la altura saca las proporciones del esqueleto.
    height_meters: Number(o.altura ?? 1.8)
  })
})

let t
let ultimo = -1
for (;;) {
  t = await pedir(clave, `/openapi/v1/rigging/${tarea.result}`)
  if (t.progress !== ultimo) { ultimo = t.progress; console.log(`  esqueleto: ${t.status} ${t.progress ?? 0}%`) }
  if (t.status === 'SUCCEEDED') break
  if (t.status === 'FAILED' || t.status === 'CANCELED') salir(`Terminó en ${t.status}: ${t.task_error?.message ?? 'sin detalle'}`)
  await new Promise(r => setTimeout(r, 5000))
}

const r = t.result ?? {}
const anim = r.basic_animations ?? {}
const bajadas = [
  ['andar', anim.walking_glb_url],
  ['correr', anim.running_glb_url],
  ['reposo', r.rigged_character_glb_url]
]
for (const [sufijo, url] of bajadas) {
  if (!url) { console.log(`  sin ${sufijo}`); continue }
  const bytes = await descargar(url, path.join(DESTINO, `${o.nombre}-${sufijo}.glb`))
  console.log(`  ${o.nombre}-${sufijo}.glb   ${(bytes / 1024 / 1024).toFixed(2)} MB`)
}
console.log(`Gastado: ${antes - (await saldo())}`)
