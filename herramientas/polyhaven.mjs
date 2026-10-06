// Descarga (o vuelve a descargar) las texturas y los objetos de Poly Haven que
// usan los guiones de Blender. Son CC0 y van a `herramientas/paquetes/polyhaven`,
// que está fuera de git: en un PC nuevo, o si se borra la carpeta, esto la rehace.
//
//   node herramientas/polyhaven.mjs          baja lo que falte (unos 150 MB)
//   node herramientas/polyhaven.mjs mirar    solo dice qué falta y cuánto pesa
//
// Para usar una textura o un objeto nuevo: añadir su nombre a la lista y volver a
// ejecutar. Los nombres son los de la dirección de polyhaven.com/a/<nombre>.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEST = path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')

const TEXTURAS = [
  // el mapa de prueba de la Guerra civil
  'asphalt_02', 'cobblestone_floor_04', 'dirt_floor', 'brown_mud_dry', 'red_brick', 'painted_plaster_wall',
  'concrete_floor_worn_001', 'cracked_concrete_wall', 'sandy_gravel_02', 'pavement_02', 'ceramic_roof_01',
  'rusty_metal_02', 'sparse_grass', 'plywood',
  // Tarragona
  'coast_sand_01', 'sand_01', 'sandstone_blocks_08', 'seaworn_sandstone_brick', 'rock_face_03',
  'castle_wall_varriation', 'leafy_grass', 'gravel_stones',
  // Grecia (06/10; Isidro dio permiso para bajar de Poly Haven lo que haga falta
  // en cada mapa): mármol, la roca de la Acrópolis, tierra seca con piedras, y
  // losas y muros de piedra para el paseo de Salónica y el palacio de Cnosos
  'marble_01', 'rock_ground', 'dry_ground_rocks', 'old_stone_wall', 'plastered_stone_wall', 'stone_pavers', 'rock_tile_floor',
  'yellow_stone_wall'
]
const MODELOS = [
  'ammo_box', 'barrel_03', 'cement_bag', 'concrete_road_barrier', 'covered_car', 'fire_hydrant', 'metal_jerrycan',
  'metal_trash_can', 'modular_chainlink_fence', 'old_military_crate', 'street_lamp_01', 'trashbag', 'utility_box_01',
  'wooden_barrels_01', 'wooden_crate_01', 'wooden_military_crate', 'painted_wooden_bench',
  'coast_rocks_01', 'coast_land_rocks_03'
]

const soloMirar = process.argv[2] === 'mirar'
let bajado = 0
let falta = 0
let estaban = 0

async function traer (url, tam, ruta) {
  if (fs.existsSync(ruta) && fs.statSync(ruta).size === tam) { estaban++; return }
  falta += tam
  if (soloMirar) return
  fs.mkdirSync(path.dirname(ruta), { recursive: true })
  const r = await fetch(url)
  if (!r.ok) throw new Error(url + ' ' + r.status)
  fs.writeFileSync(ruta, Buffer.from(await r.arrayBuffer()))
  bajado += tam
}
const ficha = async id => (await fetch('https://api.polyhaven.com/files/' + id)).json()

for (const id of TEXTURAS) {
  const f = await ficha(id)
  for (const mapa of ['Diffuse', 'nor_gl', 'Rough']) {
    const x = f[mapa]?.['1k']?.jpg
    if (!x) { console.log('no existe', id, mapa); continue }
    await traer(x.url, x.size, path.join(DEST, 'texturas', id, path.basename(x.url)))
  }
}
for (const id of MODELOS) {
  const g = (await ficha(id)).gltf?.['1k']?.gltf
  if (!g) { console.log('no existe', id); continue }
  await traer(g.url, g.size, path.join(DEST, 'modelos', id, path.basename(g.url)))
  for (const [rel, x] of Object.entries(g.include ?? {})) await traer(x.url, x.size, path.join(DEST, 'modelos', id, rel))
}
const mb = n => (n / 1e6).toFixed(1) + ' MB'
console.log(`${estaban} archivos ya estaban. ` + (soloMirar ? `Faltan ${mb(falta)}.` : `Bajados ${mb(bajado)}.`))
