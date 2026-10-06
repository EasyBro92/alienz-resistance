// Capturas del juego en tamaño de MÓVIL sin depender del panel del navegador.
//
// Con el panel oculto la página mide cero y no llegan fotogramas: no hay forma
// de ver cómo queda una carta de la tienda en un teléfono. Esto arranca Edge sin
// ventana (viene con Windows), lo maneja por su puerto de depuración y guarda
// las capturas en `vistas/`. Hace falta el servidor de desarrollo en marcha
// (puerto 5180), porque usa los atajos de `window.__zr`.
//
//   node herramientas/navegador/movil.mjs <guion.mjs> [--ancho 375] [--alto 812]
//
// El guion exporta `default async ({ evaluar, foto, espera, recargar }) => { … }`:
//   evaluar('código')   lo ejecuta en la página y devuelve su valor (espera promesas)
//   foto('nombre')      guarda vistas/<nombre>.jpg con lo que hay en pantalla
//   espera(ms)          deja pasar tiempo (los fotogramas siguen corriendo)
//   recargar()          vuelve a cargar la página y espera a que arranque

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const num = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) : d)
const guion = args.find((a, i) => !a.startsWith('--') && !['--ancho', '--alto', '--puerto'].includes(args[i - 1]))
const ANCHO = num('--ancho', 375)
const ALTO = num('--alto', 812)
const PUERTO = num('--puerto', 9377)
const URL_JUEGO = 'http://localhost:5180/'
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p))
if (!guion || !EDGE) {
  console.error(EDGE ? '\nUso: node herramientas/navegador/movil.mjs <guion.mjs>\n' : 'No encuentro Edge ni Chrome.')
  process.exit(1)
}

const espera = ms => new Promise(r => setTimeout(r, ms))
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'alienz-movil-'))
const navegador = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`, `--window-size=${ANCHO},${ALTO}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--hide-scrollbars',
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank'
], { stdio: 'ignore' })

async function pagina () {
  for (let i = 0; i < 60; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json()
      const p = lista.find(t => t.type === 'page')
      if (p) return p.webSocketDebuggerUrl
    } catch {}
    await espera(250)
  }
  throw new Error('el navegador no arranca')
}

let ws
let id = 0
const pendientes = new Map()
const oyentes = new Map()
function orden (metodo, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id
    pendientes.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method: metodo, params }))
  })
}
const evento = nombre => new Promise(resolve => oyentes.set(nombre, resolve))

try {
  ws = new WebSocket(await pagina())
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  ws.onmessage = m => {
    const d = JSON.parse(m.data)
    if (d.id && pendientes.has(d.id)) {
      const p = pendientes.get(d.id); pendientes.delete(d.id)
      d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result)
    } else if (d.method && oyentes.has(d.method)) { const f = oyentes.get(d.method); oyentes.delete(d.method); f(d.params) }
  }
  await orden('Page.enable')
  await orden('Runtime.enable')
  await orden('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 2, mobile: true })
  await orden('Emulation.setTouchEmulationEnabled', { enabled: true })

  const evaluar = async codigo => {
    const r = await orden('Runtime.evaluate', { expression: `(async () => { ${codigo} })()`, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const recargar = async () => {
    const cargada = evento('Page.loadEventFired')
    await orden('Page.navigate', { url: URL_JUEGO })
    await cargada
    // A que el juego haya montado sus atajos de desarrollo.
    for (let i = 0; i < 80; i++) {
      if (await evaluar('return !!window.__zr')) break
      await espera(250)
    }
    await espera(1200)
  }
  const dir = path.resolve('vistas')
  fs.mkdirSync(dir, { recursive: true })
  const foto = async nombre => {
    const r = await orden('Page.captureScreenshot', { format: 'jpeg', quality: 88 })
    fs.writeFileSync(path.join(dir, nombre + '.jpg'), Buffer.from(r.data, 'base64'))
    return nombre
  }

  await recargar()
  const modulo = await import(pathToFileURL(path.resolve(guion)).href)
  await modulo.default({ evaluar, foto, espera, recargar })
} catch (e) {
  console.error('ERROR', e.message)
  process.exitCode = 1
} finally {
  try { ws?.close() } catch {}
  navegador.kill()
  await espera(400)
  try { fs.rmSync(perfil, { recursive: true, force: true }) } catch {}
}
