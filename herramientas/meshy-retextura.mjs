// Volver a pintar en Meshy la textura de un modelo sin tocar su malla.
//
// Isidro, 17/10/2026: al Arquero y al Lanzallamas (cuerpos de Meshy del 10/10,
// con las cabezas dibujadas de Blender encima) «cambia las caras para que sean
// del estilo de Sherry y la ballestera». Rehacerlos enteros costaba 35 cada uno
// y podía cambiarles el traje, que le gusta; repintar cuesta 10 y la forma se
// queda igual. Lo que sale no trae esqueleto: después, `meshy-rig.mjs --archivo`.
//
// Uso:
//   node herramientas/meshy-retextura.mjs --archivo <glb> --nombre <salida> --prompt "<texto>" [--minimo 540]
//
// Deja herramientas/revisar/<nombre>.glb. El archivo va dentro de la petición
// (data URI), como en meshy-rig: no hace falta publicarlo antes.
import fs from 'node:fs'
import path from 'node:path'

const API = 'https://api.meshy.ai'
const RAIZ = path.resolve(import.meta.dirname, '..')
const REVISAR = path.join(RAIZ, 'herramientas', 'revisar')
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

const o = args()
if (!o.archivo || !o.nombre || !o.prompt) salir('Faltan --archivo, --nombre o --prompt.')
const clave = leerClave()
const saldo = async () => (await pedir(clave, '/openapi/v1/balance')).balance
const antes = await saldo()
if (o.minimo && antes < Number(o.minimo)) salir(`Saldo ${antes} por debajo de ${o.minimo}: no empiezo.`)
console.log(`Saldo antes: ${antes}   ·   ${o.nombre}`)

const tarea = await pedir(clave, '/openapi/v1/retexture', {
  method: 'POST',
  body: JSON.stringify({
    model_url: 'data:application/octet-stream;base64,' + fs.readFileSync(o.archivo).toString('base64'),
    text_style_prompt: o.prompt,
    // Las costuras de la textura de antes: así la malla sale idéntica.
    enable_original_uv: true,
    enable_pbr: true
  })
})

let t
let ultimo = -1
for (;;) {
  t = await pedir(clave, `/openapi/v1/retexture/${tarea.result}`)
  if (t.progress !== ultimo) { ultimo = t.progress; console.log(`  textura: ${t.status} ${t.progress ?? 0}%`) }
  if (t.status === 'SUCCEEDED') break
  if (t.status === 'FAILED' || t.status === 'CANCELED') salir(`Terminó en ${t.status}: ${t.task_error?.message ?? 'sin detalle'}`)
  await new Promise(r => setTimeout(r, 5000))
}

const url = t.model_urls?.glb
if (!url) salir('Terminó bien pero no trae .glb.')
const destino = path.join(REVISAR, `${o.nombre}.glb`)
const r = await fetch(url)
if (!r.ok) salir(`No pude descargarlo: HTTP ${r.status}`)
fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()))
console.log(`herramientas/revisar/${o.nombre}.glb   ${(fs.statSync(destino).size / 1024 / 1024).toFixed(2)} MB`)
console.log(`Tarea: ${tarea.result}   ·   Gastado: ${antes - (await saldo())}`)
