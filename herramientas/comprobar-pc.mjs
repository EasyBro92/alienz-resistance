// Comprueba que este PC tiene todo lo que hace falta para trabajar en el juego.
// Pensado para después de cambiar de ordenador (ver TRASLADO.md en la carpeta de
// arriba), pero vale cualquier día que algo no arranque.
//
//   node herramientas/comprobar-pc.mjs            lo básico (segundos)
//   node herramientas/comprobar-pc.mjs --blender  además, la prueba de horneado
//
// No instala ni cambia nada: solo mira y dice qué falta y cómo se arregla.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hay = p => fs.existsSync(path.join(RAIZ, p))
let fallos = 0
const bien = t => console.log('  bien   ' + t)
const mal = (t, arreglo) => { fallos++; console.log('  FALTA  ' + t + (arreglo ? '\n         → ' + arreglo : '')) }
const aviso = t => console.log('  ojo    ' + t)
const sale = (orden) => { try { return execSync(orden, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

console.log('\nEl ordenador')
const cpu = os.cpus()
console.log(`  ${cpu[0]?.model?.trim()} · ${cpu.length} hilos · ${(os.totalmem() / 2 ** 30).toFixed(1)} GB de memoria`)
if (os.totalmem() < 7.5 * 2 ** 30) aviso('poca memoria: cerrar el navegador y lo demás mientras Blender calcula')

console.log('\nProgramas')
const mayor = +process.versions.node.split('.')[0]
if (mayor === 22) bien('Node ' + process.versions.node)
else mal('Node 22 (hay ' + process.versions.node + ')', 'winget install --id OpenJS.NodeJS.22')
const git = sale('git --version')
git ? bien(git) : mal('git', 'winget install --id Git.Git')

// Blender: la versión más nueva que haya en su carpeta de siempre.
const base = 'C:/Program Files/Blender Foundation'
const versiones = fs.existsSync(base) ? fs.readdirSync(base).filter(d => fs.existsSync(`${base}/${d}/blender.exe`)).sort() : []
const blender = versiones.length ? `${base}/${versiones.at(-1)}/blender.exe` : null
if (blender) {
  bien('Blender en ' + blender)
  if (!/5\.2/.test(blender)) aviso('los guiones se escribieron para Blender 5.2: con otra versión puede fallar alguna orden')
} else mal('Blender', 'winget install --id BlenderFoundation.Blender   (los mapas ya hechos funcionan sin él; solo hace falta para rehacerlos)')

console.log('\nEl proyecto')
hay('node_modules/vite') ? bien('dependencias instaladas') : mal('dependencias (node_modules)', 'npm install')
hay('.env.local') ? bien('.env.local (la clave de Meshy)') : mal('.env.local con MESHY_API_KEY', 'copiarlo del PC anterior; sin él solo falla generar modelos con Meshy')
const ph = path.join(RAIZ, 'herramientas/paquetes/polyhaven')
const cuenta = d => fs.existsSync(path.join(ph, d)) ? fs.readdirSync(path.join(ph, d)).length : 0
const [tex, mod] = [cuenta('texturas'), cuenta('modelos')]
if (tex >= 22 && mod >= 19) bien(`Poly Haven: ${tex} texturas y ${mod} objetos`)
else mal(`paquetes de Poly Haven (hay ${tex} texturas y ${mod} objetos; hacen falta 22 y 19)`, 'node herramientas/polyhaven.mjs')
const crudos = fs.existsSync(path.join(ph, '_reducidas')) ? fs.readdirSync(path.join(ph, '_reducidas')).filter(f => f.endsWith('.npy')).length : 0
crudos ? bien(`${crudos} horneados guardados en crudo (permiten retocar la luz con --reusar sin volver a calcular)`)
  : aviso('sin horneados en crudo: retocar la luz de Madrid o Valencia obliga a calcularla entera otra vez')
for (const p of ['kenney', 'quaternius']) {
  if (!fs.existsSync(path.join(RAIZ, 'herramientas/paquetes', p))) aviso(`no está herramientas/paquetes/${p} (solo lo usa el mapa de prueba «para el otro juego»; AlienZ no lo necesita)`)
}
const remoto = sale(`git -C "${RAIZ}" remote get-url origin`)
remoto ? bien('repositorio: ' + remoto) : mal('repositorio git', 'git clone https://github.com/EasyBro92/alienz-resistance.git')
const sucio = sale(`git -C "${RAIZ}" status --porcelain`)
if (sucio) aviso('hay cambios sin subir:\n' + sucio.split('\n').slice(0, 8).map(l => '           ' + l).join('\n'))

if (process.argv.includes('--blender') && blender) {
  console.log('\nPrueba de horneado en Blender (puede tardar un minuto)')
  try {
    const t = Date.now()
    const out = execFileSync(blender, ['-b', '-P', path.join(RAIZ, 'herramientas/blender/prueba_pc.py')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15 * 60 * 1000 })
    const linea = out.split('\n').find(l => l.startsWith('PRUEBA_OK'))
    if (linea) {
      bien(linea.trim())
      const seg = +(/horneado ([\d.]+)/.exec(linea)?.[1] ?? 0)
      console.log(`         referencia: 4,5 s en el PC anterior (i5-1335U), donde un mapa entero son 8 minutos. Aquí serían unos ${Math.round(seg / 4.5 * 8)}.`)
    } else mal('Blender arrancó pero la prueba no terminó', 'mirar la salida: ' + out.slice(-400))
    void t
  } catch (e) {
    mal('Blender no ha podido hacer la prueba', 'si ni arranca, este procesador no vale para esta versión: probar Blender 4.2 LTS. ' + String(e.message).slice(0, 200))
  }
}
console.log(fallos ? `\n${fallos} cosa(s) por arreglar.\n` : '\nTodo en su sitio.\n')
process.exit(fallos ? 1 : 0)
