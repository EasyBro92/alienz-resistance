// Generar una pieza en Meshy y dejarla lista en public/models/.
//
// El juego se ha construido entero con geometría procedural, y eso sigue siendo
// lo que hace que pese 800 KB y arranque en medio segundo. Esto no lo sustituye:
// es para las piezas donde el volumen manda y la articulación no importa —el
// decorado de la cuneta, un vehículo reventado, la nodriza—, que son las que
// llenan media pantalla de fondo y las que peor aguantan hechas de cajas.
//
// Uso:
//   node herramientas/meshy.mjs --nombre coche-reventado \
//     --prompt "burnt out abandoned sedan car wreck, doors missing, rust" \
//     --polys 4000 --refinar
//
//   node herramientas/meshy.mjs --saldo
//
// Cada generación CUESTA dinero de verdad (5-25 créditos la malla, 10-15 más si
// se refina con textura), así que el guion nunca lanza nada sin que se lo pidan
// con un prompt explícito, y avisa de lo que va gastando.

import fs from 'node:fs'
import path from 'node:path'

// La estética, en un solo sitio y pegada a TODOS los prompts.
//
// Es lo que decide si las piezas parecen del mismo juego o un cajón de sastre.
// El encargo era claro: 3D realista pero arcade, como Top War —no como un juego
// de consola—. Eso se traduce en cosas concretas que hay que pedir y en cosas
// que hay que prohibir expresamente, porque si no Meshy tira por defecto al
// fotorrealismo sucio, que es justo lo contrario.
//
// Lo que se pide: formas gruesas y legibles de lejos, colores vivos y separados,
// sombreado suave. Lo que se prohíbe: fotorrealismo, suciedad, texturas de
// escaneado y grano — todo eso a la escala a la que se ve la figura en un móvil
// se convierte en barro gris.
const ESTILO = [
  'stylized mobile game art style',
  'chunky bold readable shapes',
  'clean silhouette',
  'vibrant saturated colors',
  'soft even shading',
  'semi-realistic arcade look',
  'not photorealistic',
  'no dirt no grunge no noise',
  'simple flat color blocks'
].join(', ')

const RAIZ = path.resolve(import.meta.dirname, '..')
const DESTINO = path.join(RAIZ, 'public', 'models')
const API = 'https://api.meshy.ai'

// --- la clave ----------------------------------------------------------------
// De un archivo, nunca de un argumento: lo que va en la línea de órdenes acaba
// en el historial del intérprete y en la lista de procesos.
function leerClave () {
  const archivo = path.join(RAIZ, '.env.local')
  if (!fs.existsSync(archivo)) {
    salir(`No encuentro ${archivo}.\nCrea el archivo con una línea: MESHY_API_KEY=tu_clave`)
  }
  const linea = fs.readFileSync(archivo, 'utf8').match(/^MESHY_API_KEY=(.+)$/m)
  if (!linea || !linea[1].trim() || linea[1].includes('PEGA_AQUI')) {
    salir('La clave de .env.local está vacía o sin sustituir.')
  }
  return linea[1].trim()
}

const salir = msg => { console.error('\n' + msg + '\n'); process.exit(1) }

// --- argumentos --------------------------------------------------------------
function args () {
  const out = {}
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue
    const clave = a[i].slice(2)
    const valor = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true
    out[clave] = valor
  }
  return out
}

// --- llamadas ----------------------------------------------------------------
async function pedir (clave, ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${clave}`,
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {})
    }
  })
  const texto = await r.text()
  let cuerpo
  try { cuerpo = JSON.parse(texto) } catch { cuerpo = texto }
  if (!r.ok) salir(`La API respondió ${r.status}:\n${JSON.stringify(cuerpo, null, 2)}`)
  return cuerpo
}

const saldo = async clave => (await pedir(clave, '/openapi/v1/balance')).balance

// Meshy trabaja en dos tiempos: primero la malla sin textura (preview) y luego,
// si interesa, la textura encima (refine). Se separan a propósito — una malla
// mala no mejora por texturizarla, y refinar cuesta aparte.
async function esperar (clave, id, etiqueta) {
  let ultimo = -1
  for (;;) {
    const t = await pedir(clave, `/openapi/v2/text-to-3d/${id}`)
    if (t.progress !== ultimo) {
      ultimo = t.progress
      process.stdout.write(`\r  ${etiqueta}: ${t.status} ${t.progress ?? 0}%   `)
    }
    if (t.status === 'SUCCEEDED') { console.log(); return t }
    if (t.status === 'FAILED' || t.status === 'CANCELED') {
      console.log()
      salir(`La tarea terminó en ${t.status}: ${t.task_error?.message ?? 'sin detalle'}`)
    }
    await new Promise(r => setTimeout(r, 5000))
  }
}

async function descargar (url, destino) {
  const r = await fetch(url)
  if (!r.ok) salir(`No pude descargar el modelo: HTTP ${r.status}`)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()))
  return fs.statSync(destino).size
}

// --- programa ----------------------------------------------------------------
const o = args()
const clave = leerClave()

if (o.saldo) {
  console.log(`\nSaldo: ${await saldo(clave)} créditos\n`)
  process.exit(0)
}

if (!o.prompt || !o.nombre) {
  salir([
    'Faltan argumentos.',
    '',
    '  --nombre   cómo se llamará el archivo (sin .glb)',
    '  --prompt   la descripción, en inglés: Meshy entiende mejor su idioma',
    '  --polys    polígonos objetivo (por defecto 4000; en pantalla puede haber 40 piezas)',
    '  --refinar  añade textura PBR. Cuesta créditos aparte.',
    '  --saldo    solo consulta el saldo y sale'
  ].join('\n'))
}

const polys = Number(o.polys ?? 4000)
const antes = await saldo(clave)
console.log(`\nSaldo antes: ${antes} créditos`)
console.log(`Pieza: ${o.nombre}   (${polys} polígonos objetivo)`)

// `lowpoly` y el remallado no son tacañería: esto va a un móvil viejo junto a
// otras cuarenta piezas, y una malla de Meshy sin tocar puede traer cien mil
// triángulos ella sola —más que el tablero entero lleno de soldados.
console.log('\n1/2  Malla')
const previo = await pedir(clave, '/openapi/v2/text-to-3d', {
  method: 'POST',
  body: JSON.stringify({
    mode: 'preview',
    // El prompt del encargo y, detrás, la estética común. En este orden: lo
    // primero pesa más, así que el QUÉ manda sobre el CÓMO.
    prompt: `${o.prompt}. ${ESTILO}`,
    art_style: 'realistic',
    model_type: 'lowpoly',
    ai_model: 'latest',
    should_remesh: true,
    topology: 'triangle',
    target_polycount: polys,
    target_formats: ['glb']
  })
})
let tarea = await esperar(clave, previo.result, 'malla')

if (o.refinar) {
  console.log('\n2/2  Textura')
  const refinado = await pedir(clave, '/openapi/v2/text-to-3d', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'refine',
      preview_task_id: previo.result,
      enable_pbr: true,
      texture_prompt: ESTILO,
      // 2k y no 4k: la pieza se ve de lejos y en un móvil, y cada salto de
      // resolución multiplica por cuatro lo que hay que descargar y subir a la
      // tarjeta gráfica.
      texture_resolution: '2k'
    })
  })
  tarea = await esperar(clave, refinado.result, 'textura')
} else {
  console.log('\n2/2  Textura: saltada (usa --refinar para añadirla)')
}

const url = tarea.model_urls?.glb
if (!url) salir('La tarea terminó bien pero no trae .glb en model_urls.')

const destino = path.join(DESTINO, `${o.nombre}.glb`)
const bytes = await descargar(url, destino)
const despues = await saldo(clave)

console.log(`\nGuardado: public/models/${o.nombre}.glb   (${(bytes / 1024 / 1024).toFixed(2)} MB)`)
console.log(`Gastado: ${antes - despues} créditos   ·   Saldo: ${despues}`)
console.log(`\nQueda declararlo en MODELS, en src/assets.js.\n`)
