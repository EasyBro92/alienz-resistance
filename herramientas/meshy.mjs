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
  'flat separated color blocks',
  'soft even shading',
  'semi-realistic arcade look',
  'military sci-fi',
  'not photorealistic',
  'no dirt no grunge no noise',
  'no gold trim, no ornate decoration, no filigree, no fantasy ornament'
].join(', ')

// Para los monumentos el encargo es el contrario: que se reconozcan al primer
// vistazo. Se pide fidelidad al original y textura realista; `--realista`
// cambia la estética común por esta.
const ESTILO_REAL = [
  'highly detailed realistic 3D landmark model',
  'accurate real-world proportions and architecture',
  'realistic PBR materials and textures',
  'clean game-ready asset, isolated, no ground plane, no people'
].join(', ')

// Para criaturas que se ven de cerca (el jefe alien de la portada): piel,
// músculo y detalle orgánico de verdad. `--criatura` cambia la estética común
// por esta; la de los monumentos pedía "sin personas" y la común, estilizado.
const ESTILO_CRIATURA = [
  'highly detailed realistic creature model, cinematic quality',
  'anatomically believable musculature and skin',
  'realistic PBR materials: wet glossy skin, subsurface scattering look, chitin plates',
  'clean game-ready asset, isolated, no ground plane, no background'
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
    '  --persona  figura humanoide: sale en pose A y se le puede poner esqueleto',
    '  --rig      le monta esqueleto y descarga la versión que anda (exige --persona)',
    '  --saldo    solo consulta el saldo y sale'
  ].join('\n'))
}

const polys = Number(o.polys ?? 4000)
const antes = await saldo(clave)
// Suelo de créditos: si el saldo no llega, no se empieza. Una pieza con textura
// cuesta hasta unos 40, así que con --minimo 240 nunca se baja de 200.
if (o.minimo && antes < Number(o.minimo)) salir(`Saldo ${antes} por debajo del mínimo ${o.minimo}: no genero nada.`)
console.log(`\nSaldo antes: ${antes} créditos`)
console.log(`Pieza: ${o.nombre}   (${polys} polígonos objetivo)`)

// `lowpoly` y el remallado no son tacañería: esto va a un móvil viejo junto a
// otras cuarenta piezas, y una malla de Meshy sin tocar puede traer cien mil
// triángulos ella sola —más que el tablero entero lleno de soldados.
// `--desde <id>`: la malla ya se hizo (con `--solo-malla`) y se revisó; se sigue
// con la textura sobre ella sin volver a pagarla.
let previoId = o.desde
let tarea
if (previoId) {
  console.log(`\n1/2  Malla: la de la tarea ${previoId}`)
  tarea = await pedir(clave, `/openapi/v2/text-to-3d/${previoId}`)
} else {
console.log('\n1/2  Malla')
const previo = await pedir(clave, '/openapi/v2/text-to-3d', {
  method: 'POST',
  body: JSON.stringify({
    mode: 'preview',
    // El prompt del encargo y, detrás, la estética común. En este orden: lo
    // primero pesa más, así que el QUÉ manda sobre el CÓMO.
    prompt: `${o.prompt}. ${o.criatura ? ESTILO_CRIATURA : o.realista ? ESTILO_REAL : ESTILO}`,
    art_style: 'realistic',
    // Los modelos baratos no admiten `lowpoly`: ahí el recorte lo hace el remallado.
    model_type: o.modelo ? 'standard' : 'lowpoly',
    // `--modelo meshy-5` para ahorrar: la generación más reciente cuesta varias
    // veces más por malla.
    ai_model: o.modelo ?? 'latest',
    should_remesh: true,
    topology: 'triangle',
    // Pose A solo para figuras humanas. El montador de esqueletos necesita ver
    // los miembros separados del cuerpo; una figura con los brazos pegados al
    // costado le sale con el hombro fundido al torso.
    ...(o.persona ? { pose_mode: 'a-pose' } : {}),
    target_polycount: polys,
    target_formats: ['glb']
  })
})
previoId = previo.result
tarea = await esperar(clave, previoId, 'malla')
}

// `--solo-malla`: se para aquí para revisar la postura antes de pagar textura y
// esqueleto. Un modelo agachado, con peana o con los brazos pegados no admite
// esqueleto o se deforma al moverse, y eso solo se ve mirando la malla.
if (o['solo-malla']) {
  const url = tarea.model_urls?.glb
  if (!url) salir('La malla terminó bien pero no trae .glb.')
  const revisar = path.join(RAIZ, 'herramientas', 'revisar')
  fs.mkdirSync(revisar, { recursive: true })
  const destino = path.join(revisar, `${o.nombre}-malla.glb`)
  const bytes = await descargar(url, destino)
  console.log(`\nMalla para revisar: herramientas/revisar/${o.nombre}-malla.glb (${(bytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`Tarea: ${previoId}   ·   Gastado: ${antes - (await saldo(clave))}`)
  console.log(`Si vale: --desde ${previoId} --refinar (mismo --nombre y --prompt)\n`)
  process.exit(0)
}

if (o.refinar) {
  console.log('\n2/2  Textura')
  const refinado = await pedir(clave, '/openapi/v2/text-to-3d', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'refine',
      preview_task_id: previoId,
      enable_pbr: true,
      // El prompt ENTERO, no solo el estilo.
      //
      // Aquí estaba el fallo de la primera flota. Pasando únicamente `ESTILO`,
      // la fase que pinta no sabía qué objeto tenía delante ni de qué color
      // tocaba: las cinco naves salieron del mismo rojo y oro pese a que cada
      // prompt pedía su paleta. El color se decide al texturizar, así que es
      // aquí donde hay que repetirlo.
      texture_prompt: `${o.prompt}. ${o.criatura ? ESTILO_CRIATURA : o.realista ? ESTILO_REAL : ESTILO}`,
      // 2k y no 4k: la pieza se ve de lejos y en un móvil, y cada salto de
      // resolución multiplica por cuatro lo que hay que descargar y subir a la
      // tarjeta gráfica.
      texture_resolution: '2k'
    })
  })
  tarea = await esperar(clave, refinado.result, 'textura')
  // Para ponerle esqueleto después: `meshy-rig.mjs --tarea <id>`.
  console.log(`Tarea con textura: ${refinado.result}`)
} else {
  console.log('\n2/2  Textura: saltada (usa --refinar para añadirla)')
}

let url = tarea.model_urls?.glb
if (!url) salir('La tarea terminó bien pero no trae .glb en model_urls.')

// --- esqueleto ---------------------------------------------------------------
// Aquí está la diferencia entre una pieza de decorado y un personaje. Las
// figuras del juego se animan moviendo piezas sueltas —brazo, pierna, cabeza—,
// y una malla de Meshy es una sola pieza: puesta tal cual, el soldado se
// desliza tieso por el asfalto. El montador de esqueletos le mete huesos y
// devuelve, además del personaje en reposo, un .glb con la animación de andar
// DENTRO. Ese es el que se guarda: trae malla, huesos y ciclo en un archivo.
if (o.rig) {
  if (!o.refinar) salir('El esqueleto exige textura: usa --refinar junto a --rig.')
  console.log(String.fromCharCode(10) + '3/3  Esqueleto')
  const rig = await pedir(clave, '/openapi/v1/rigging', {
    method: 'POST',
    body: JSON.stringify({
      input_task_id: tarea.id ?? previoId,
      // La altura de verdad del personaje. No es cosmético: de aquí saca las
      // proporciones del esqueleto, y con el valor por defecto a un soldado
      // achaparrado le colocaba las rodillas donde no van.
      height_meters: Number(o.altura ?? 1.75)
    })
  })
  let t = { status: '' }
  let ultimo = -1
  for (;;) {
    t = await pedir(clave, `/openapi/v1/rigging/${rig.result}`)
    if (t.progress !== ultimo) {
      ultimo = t.progress
      process.stdout.write(`  esqueleto: ${t.status} ${t.progress ?? 0}%   `)
    }
    if (t.status === 'SUCCEEDED') { console.log(); break }
    if (t.status === 'FAILED' || t.status === 'CANCELED') {
      console.log()
      salir(`El esqueleto terminó en ${t.status}: ${t.task_error?.message ?? 'sin detalle'}`)
    }
    await new Promise(r => setTimeout(r, 5000))
  }
  const r = t.result ?? {}
  url = r.basic_animations?.walking_glb_url ?? r.rigged_character_glb_url
  if (!url) salir('El esqueleto terminó bien pero no trae .glb utilizable.')
  // El de reposo también, para poder comparar y para tener la pose de quieto.
  if (r.rigged_character_glb_url) {
    await descargar(r.rigged_character_glb_url, path.join(DESTINO, `${o.nombre}-reposo.glb`))
  }
}

const destino = path.join(DESTINO, `${o.nombre}.glb`)
const bytes = await descargar(url, destino)
const despues = await saldo(clave)

console.log(`\nGuardado: public/models/${o.nombre}.glb   (${(bytes / 1024 / 1024).toFixed(2)} MB)`)
console.log(`Gastado: ${antes - despues} créditos   ·   Saldo: ${despues}`)
console.log(`\nQueda declararlo en MODELS, en src/assets.js.\n`)
