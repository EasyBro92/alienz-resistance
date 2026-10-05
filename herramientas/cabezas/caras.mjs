// Las caras de los soldados, dibujadas.
//
// Isidro, 05/10/2026, al ver las primeras cabezas de Blender: «no me gustan nada
// las caras… me muestras texturas poco detalladas, dale caras más amigables y
// reconocibles». Aquellas eran piezas de un solo color pegadas a un cráneo: ojos
// de dos bolas, la boca una raya, todos serios.
//
// Ahora la cara se DIBUJA, como una ilustración: ojos grandes con su iris, su
// brillo y sus pestañas, cejas con pelo, sonrisa, colorete, pecas, barba de tres
// días. Se dibuja en vectorial (SVG) y se pasa a imagen con sharp, así que sale
// nítida a cualquier tamaño. `herramientas/blender/cabezas.py` la pone sobre la
// cabeza y le hornea encima las sombras.
//
//   node herramientas/cabezas/caras.mjs [clave ...]
//
// Deja `herramientas/blender/vistas/caras/<clave>.png` (1024 × 1024).
//
// El lienzo es la piel de la cabeza DESENROLLADA: en horizontal, el arco alrededor
// de la cabeza (0 = el centro de la cara); en vertical, la altura. La cara ocupa
// el centro a 4 px por milímetro y los lados van comprimidos, que ahí solo hay
// piel. La misma cuenta (`donde`) está en cabezas.py (`uv_de`): si se toca una,
// se toca la otra.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..', '..')
const sharp = createRequire(path.join(RAIZ, 'package.json'))('sharp')
const SALIDA = path.join(RAIZ, 'herramientas', 'blender', 'vistas', 'caras')

const LADO = 1024
const RADIO = 94            // mm de arco por radián, a la altura de los ojos
const CENTRO = 0.95         // radianes a cada lado que van a toda resolución
const PX_RAD = 380          // px por radián en el centro…
const PX_RAD_LADO = 121     // …y a los lados
const K = PX_RAD / RADIO    // px por milímetro en la cara
const ARRIBA = 118          // mm por encima de los ojos que caben

export function donde (x, z) {
  const a = Math.abs(x) / RADIO
  const u = a <= CENTRO ? a * PX_RAD : CENTRO * PX_RAD + (a - CENTRO) * PX_RAD_LADO
  return [LADO / 2 + Math.sign(x) * Math.min(u, LADO / 2), (ARRIBA - z) * K]
}

// --- color ---
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mezcla = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))

function azar (semilla) {
  let h = 2166136261
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h |= 0; h = h + 0x6D2B79F5 | 0
    let t = Math.imul(h ^ h >>> 15, 1 | h)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function unir (a, b) {
  const r = { ...a }
  for (const [k, v] of Object.entries(b)) {
    r[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...v } : v
  }
  return r
}

export function personajes () {
  const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'herramientas', 'blender', 'cabezas.json'), 'utf8'))
  return Object.fromEntries(Object.entries(cfg.personajes).map(([k, p]) => [k, unir(cfg.base[p.de], p)]))
}

// La línea donde nace el pelo, en milímetros sobre los ojos según el arco. La
// misma que `zona_pelo` en cabezas.py.
function lineaPelo (a, entradas = 0) {
  a = Math.abs(a)
  const sm = (x0, x1, x) => { const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))); return t * t * (3 - 2 * t) }
  let z = a < 0.85 ? 66 : a < 1.2 ? 66 - (a - 0.85) / 0.35 * 90 : a < 1.5 ? -24 : -24 - sm(1.5, 2.2, a) * 50
  z += entradas * 1000 * Math.exp(-(((a - 0.62) / 0.22) ** 2))
  return z
}

// ======================================================================================
export function dibujar (clave, p) {
  const R = azar(clave)
  const B = p.piel
  const sombra = mezcla(B, '#6a2a22', 0.6)
  const luz = mezcla(B, '#fff3e4', 0.65)
  const pelo = p.pelo
  const ceja = p.ceja ?? p.pelo
  const pestana = mezcla(p.pelo, '#120c0a', 0.7)
  const defs = []
  const capas = []
  const P = (x, z) => donde(x, z).map(v => v.toFixed(1)).join(',')
  const k = v => (v * K).toFixed(2)
  const elipse = (x, z, rx, rz, relleno, op = 1, filtro = '') => {
    const [cx, cy] = donde(x, z)
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${k(rx)}" ry="${k(rz)}" fill="${relleno}" opacity="${op}"${filtro ? ` filter="url(#${filtro})"` : ''}/>`
  }
  const poli = pts => pts.map(([x, z]) => P(x, z)).join(' ')

  for (const [id, s] of [['b1', 1.2], ['b2', 2.2], ['b4', 4.5], ['b8', 9], ['b16', 18]]) {
    defs.push(`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s}"/></filter>`)
  }

  // --- la piel: un tono de base y luz por zonas, para que no sea un color plano ---
  capas.push(`<rect width="${LADO}" height="${LADO}" fill="${B}"/>`)
  capas.push(elipse(0, -14, 60, 74, luz, 0.3, 'b16'))
  capas.push(elipse(0, 40, 46, 24, luz, 0.22, 'b16'))                      // la frente
  defs.push(`<linearGradient id="lado"><stop offset="0" stop-color="${sombra}" stop-opacity="0.34"/><stop offset="1" stop-color="${sombra}" stop-opacity="0"/></linearGradient>`)
  defs.push(`<linearGradient id="lado2" x1="1" x2="0"><stop offset="0" stop-color="${sombra}" stop-opacity="0.34"/><stop offset="1" stop-color="${sombra}" stop-opacity="0"/></linearGradient>`)
  capas.push(`<rect x="0" y="0" width="250" height="${LADO}" fill="url(#lado)"/><rect x="${LADO - 250}" y="0" width="250" height="${LADO}" fill="url(#lado2)"/>`)
  defs.push(`<linearGradient id="abajo" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${sombra}" stop-opacity="0"/><stop offset="1" stop-color="${sombra}" stop-opacity="0.5"/></linearGradient>`)
  const yMenton = donde(0, -78)[1]
  capas.push(`<rect x="0" y="${yMenton.toFixed(0)}" width="${LADO}" height="${(LADO - yMenton).toFixed(0)}" fill="url(#abajo)"/>`)
  // Los mofletes y la barbilla, un punto de luz.
  for (const s of [-1, 1]) capas.push(elipse(s * 40, -30, 17, 15, luz, 0.2, 'b8'))
  capas.push(elipse(0, -84, 13, 8, luz, 0.2, 'b8'))

  // --- pelo rapado: no es un volumen, es un tono en el cráneo ---
  if (p.rapado) {
    const borde = []
    for (let i = 0; i <= 60; i++) { const a = -2.2 + 4.4 * i / 60; borde.push([a * RADIO, lineaPelo(a, p.entradas)]) }
    borde.push([2.2 * RADIO, 130], [-2.2 * RADIO, 130])
    capas.push(`<polygon points="${poli(borde)}" fill="${pelo}" opacity="${0.85 * p.rapado}" filter="url(#b4)"/>`)
  }

  // --- barba de tres días: una sombra y, encima, los puntos del pelo ---
  if (p.sombra_barba) {
    const zona = [[-112, 2], [-96, -6], [-84, -22], [-66, -44], [-44, -54], [-27, -53], [-17, -46.5], [0, -47.5], [17, -46.5], [27, -53], [44, -54],
      [66, -44], [84, -22], [96, -6], [112, 2], [130, -30], [130, -140], [-130, -140], [-130, -30]]
    defs.push(`<clipPath id="zbarba"><polygon points="${poli(zona)}"/></clipPath>`)
    capas.push(`<polygon points="${poli(zona)}" fill="${mezcla(pelo, B, 0.25)}" opacity="${0.5 * p.sombra_barba}" filter="url(#b8)"/>`)
    let puntos = ''
    for (let i = 0; i < 2600; i++) {
      const x = (R() * 2 - 1) * 112; const z = -140 + R() * 142
      const [cx, cy] = donde(x, z)
      puntos += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(0.7 + R() * 0.8).toFixed(2)}"/>`
    }
    capas.push(`<g clip-path="url(#zbarba)" fill="${mezcla(pelo, '#000000', 0.2)}" opacity="${0.42 * p.sombra_barba}">${puntos}</g>`)
  }

  // --- colorete ---
  defs.push(`<radialGradient id="rubor"><stop offset="0" stop-color="#ff5d55" stop-opacity="${p.rubor}"/><stop offset="1" stop-color="#ff5d55" stop-opacity="0"/></radialGradient>`)
  for (const s of [-1, 1]) capas.push(elipse(s * 38, -27, 19, 15, 'url(#rubor)'))

  // --- la nariz: el bulto lo pone la malla; aquí van su sombra, sus aletas y su brillo ---
  const zn = -38
  capas.push(elipse(6.5, zn + 10, 3.6, 13, sombra, 0.2, 'b4'))
  capas.push(elipse(0, zn - 8.5, 11.5, 3.2, sombra, 0.3, 'b2'))
  for (const s of [-1, 1]) capas.push(elipse(s * 5.6, zn - 5.4, 2.7, 1.5, mezcla(sombra, '#2a0f0c', 0.45), 0.7, 'b1'))
  capas.push(elipse(0, zn + 0.5, 6.5, 5.5, '#ff7d70', 0.16, 'b4'))
  capas.push(elipse(-1.6, zn + 2.6, 3.0, 2.3, '#ffffff', 0.42, 'b2'))
  capas.push(elipse(-0.8, zn + 17, 1.5, 9, '#ffffff', 0.2, 'b2'))

  // --- los ojos ---
  const o = p.ojo
  const SEP = o.sep
  const iris = p.iris
  defs.push(`<radialGradient id="iris" cx="0.5" cy="0.62" r="0.62"><stop offset="0" stop-color="${mezcla(iris, '#ffffff', 0.38)}"/><stop offset="0.5" stop-color="${iris}"/><stop offset="1" stop-color="${mezcla(iris, '#0a0606', 0.62)}"/></radialGradient>`)
  defs.push(`<linearGradient id="parpado" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a2030" stop-opacity="0.5"/><stop offset="0.5" stop-color="#3a2030" stop-opacity="0"/></linearGradient>`)
  for (const s of [-1, 1]) {
    if (p.parche === s) continue
    const cx = s * SEP
    // La esquina de fuera sube un poco: el ojo que sonríe.
    const xi = cx - s * o.rx; const zi = -o.inclina * 0.5
    const xo = cx + s * o.rx; const zo = o.inclina
    const arriba = `C ${P(xi + s * o.rx * 0.32, zi + o.arriba * 1.3)} ${P(xo - s * o.rx * 0.5, zo + o.arriba * 1.18)} ${P(xo, zo)}`
    const abajo = `C ${P(xo - s * o.rx * 0.38, zo - o.abajo * 1.3)} ${P(xi + s * o.rx * 0.5, zi - o.abajo * 1.2)} ${P(xi, zi)}`
    const forma = `M ${P(xi, zi)} ${arriba} ${abajo} Z`
    defs.push(`<clipPath id="ojo${s}"><path d="${forma}"/></clipPath>`)
    // La sombra del hueco, entre el ojo y la ceja.
    capas.push(elipse(cx, o.arriba * 0.55 + 3, o.rx + 4.5, o.arriba * 0.7 + 3, sombra, 0.26, 'b4'))
    capas.push(elipse(cx, -o.abajo - 1.5, o.rx, 2.6, sombra, 0.16, 'b2'))
    let ojo = `<path d="${forma}" fill="#fbf9f4"/>`
    const ix = cx - s * 0.9; const iz = 0.6
    ojo += elipse(ix, iz, o.iris, o.iris, 'url(#iris)')
    ojo += `<circle cx="${donde(ix, iz)[0].toFixed(1)}" cy="${donde(ix, iz)[1].toFixed(1)}" r="${k(o.iris - 0.35)}" fill="none" stroke="${mezcla(iris, '#0a0606', 0.75)}" stroke-width="${k(0.7)}"/>`
    ojo += elipse(ix, iz - o.iris * 0.46, o.iris * 0.6, o.iris * 0.34, mezcla(iris, '#ffffff', 0.55), 0.55, 'b1')
    ojo += elipse(ix, iz, o.iris * 0.46, o.iris * 0.46, '#0d0909')
    ojo += `<path d="${forma}" fill="url(#parpado)"/>`
    // Los brillos van al mismo lado en los dos ojos: la luz viene de un sitio.
    ojo += elipse(ix - 2.5, iz + 2.9, o.iris * 0.3, o.iris * 0.3, '#ffffff')
    ojo += elipse(ix + 2.9, iz - 2.8, o.iris * 0.13, o.iris * 0.13, '#ffffff', 0.85)
    capas.push(`<g clip-path="url(#ojo${s})">${ojo}</g>`)
    // La línea de las pestañas, con su rabillo; el pliegue del párpado; la línea de abajo.
    const grosor = p.pestanas ? 2.7 : 2.1
    capas.push(`<path d="M ${P(xi, zi)} ${arriba}" fill="none" stroke="${pestana}" stroke-width="${k(grosor)}" stroke-linecap="round"/>`)
    const rabo = p.pestanas ? [[4.6, 3.6, 1.7], [2.4, 5.0, 1.2], [-1.5, 6.4, 1.0]] : [[2.6, 1.9, 1.4]]
    const [ax, az] = [xo - s * 1.2, zo + 0.6]
    for (const [dx, dz, g] of rabo) capas.push(`<path d="M ${P(ax, az)} L ${P(ax + s * dx, az + dz)}" stroke="${pestana}" stroke-width="${k(g)}" stroke-linecap="round"/>`)
    capas.push(`<path d="M ${P(xi + s * 3, zi + o.arriba * 0.72 + 3.4)} Q ${P(cx, o.arriba + 4.6)} ${P(xo - s * 1.5, zo + o.arriba * 0.5 + 3.2)}" fill="none" stroke="${sombra}" stroke-width="${k(0.75)}" stroke-linecap="round" opacity="0.6"/>`)
    capas.push(`<path d="M ${P(xo - s * 1.5, zo - 1.2)} Q ${P(cx + s * 3, -o.abajo * 1.02)} ${P(cx - s * 4, -o.abajo * 0.94)}" fill="none" stroke="${sombra}" stroke-width="${k(0.7)}" stroke-linecap="round" opacity="0.55"/>`)
  }

  // --- las cejas: una forma que se afila hacia fuera, con sus pelos ---
  const c = p.cejas
  const zb = o.arriba + 9.2 + c.alto
  for (const s of [-1, 1]) {
    const p0 = [SEP - o.rx - 1.5, zb + c.dentro]; const p1 = [SEP + 3, zb + c.arco * 1.9]; const p2 = [SEP + o.rx + 4.5, zb - 2.6]
    const lomo = []; const vientre = []; const eje = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const x = (1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0]
      const z = (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1]
      const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
      const dz = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
      const n = Math.hypot(dx, dz)
      const g = c.grosor * (5.7 * (1 - t) ** 0.65 + 1.0) * (t < 0.1 ? 0.62 + 3.8 * t : 1) / 2
      lomo.push([s * (x - dz / n * g), z + dx / n * g])
      vientre.push([s * (x + dz / n * g), z - dx / n * g])
      eje.push([x, z, dx / n, dz / n, g])
    }
    capas.push(`<polygon points="${poli([...lomo, ...vientre.reverse()])}" fill="${ceja}" stroke="${ceja}" stroke-width="${k(0.6)}" stroke-linejoin="round"/>`)
    // Los pelos: rayitas más claras y más oscuras siguiendo la ceja.
    let pelos = ''
    for (let i = 0; i < 26; i++) {
      const e = eje[1 + Math.floor(R() * 14)]
      const d = (R() * 2 - 1) * e[4] * 0.8
      const x = e[0] - e[3] * d; const z = e[1] + e[2] * d
      const largo = 2.2 + R() * 2
      pelos += `<path d="M ${P(s * x, z)} L ${P(s * (x + e[2] * largo), z + e[3] * largo + 0.5)}" stroke="${R() < 0.5 ? mezcla(ceja, '#ffffff', 0.28) : mezcla(ceja, '#000000', 0.35)}" stroke-width="${k(0.32)}" stroke-linecap="round" opacity="0.7"/>`
    }
    capas.push(pelos)
  }

  // --- la boca ---
  const b = p.boca
  const zm = -62
  const w = b.ancho
  const linea = mezcla(B, '#3d0f0c', 0.82)
  const labio = p.labio ?? mezcla(B, '#b5403a', 0.42)
  const fuerza = p.labio ? 0.95 : 0.5
  capas.push(elipse(0, zm - b.curva - 9.5, w * 0.55, 2.6, sombra, 0.3, 'b2'))          // la sombra bajo el labio
  if (b.tipo === 'risa') {
    // Boca abierta: se ven los dientes de arriba y la lengua.
    const alto = b.abre ?? 12
    const forma = `M ${P(-w, zm + 3)} Q ${P(0, zm - 0.5)} ${P(w, zm + 3)} Q ${P(w * 0.72, zm - alto)} ${P(0, zm - alto - 1)} Q ${P(-w * 0.72, zm - alto)} ${P(-w, zm + 3)} Z`
    defs.push(`<clipPath id="boca"><path d="${forma}"/></clipPath>`)
    capas.push(`<path d="${forma}" fill="${labio}" opacity="${fuerza}" stroke="${labio}" stroke-width="${k(3.2)}" stroke-linejoin="round"/>`)
    let dentro = `<path d="${forma}" fill="#4a1216"/>`
    dentro += elipse(0, zm - alto - 0.5, w * 0.55, alto * 0.42, '#e0736f')
    dentro += `<path d="M ${P(-w, zm + 4)} Q ${P(0, zm)} ${P(w, zm + 4)} L ${P(w, zm - 1.5)} Q ${P(0, zm - 5.4)} ${P(-w, zm - 1.5)} Z" fill="#fdfbf5"/>`
    dentro += `<path d="M ${P(-w, zm - 1.5)} Q ${P(0, zm - 5.4)} ${P(w, zm - 1.5)}" fill="none" stroke="#c9bfb4" stroke-width="${k(0.5)}"/>`
    capas.push(`<g clip-path="url(#boca)">${dentro}</g>`)
    capas.push(`<path d="${forma}" fill="none" stroke="${linea}" stroke-width="${k(1.3)}" stroke-linejoin="round"/>`)
  } else {
    const izq = b.tipo === 'media' ? -0.6 : 2.4
    const der = b.tipo === 'media' ? 3.8 : 2.4
    const fondo = zm - b.curva
    // Los labios: el de arriba con su arco, el de abajo más lleno.
    capas.push(`<path d="M ${P(-w * 0.86, zm + izq * 0.6)} Q ${P(-w * 0.34, zm + 3.6)} ${P(0, zm + 2.1)} Q ${P(w * 0.34, zm + 3.6)} ${P(w * 0.86, zm + der * 0.6)} Q ${P(0, fondo - 0.3)} ${P(-w * 0.86, zm + izq * 0.6)} Z" fill="${mezcla(labio, '#3d0f0c', 0.18)}" opacity="${fuerza}"/>`)
    capas.push(`<path d="M ${P(-w * 0.8, zm + izq * 0.45)} Q ${P(0, fondo - 0.2)} ${P(w * 0.8, zm + der * 0.45)} Q ${P(0, fondo - 9.5)} ${P(-w * 0.8, zm + izq * 0.45)} Z" fill="${labio}" opacity="${fuerza}"/>`)
    capas.push(elipse(-1.5, fondo - 2.6, w * 0.26, 1.1, '#ffffff', 0.32, 'b1'))
    capas.push(`<path d="M ${P(-w, zm + izq)} Q ${P(0, fondo - b.curva * 0.9)} ${P(w, zm + der)}" fill="none" stroke="${linea}" stroke-width="${k(1.45)}" stroke-linecap="round"/>`)
    // Las comisuras: el hoyuelo de la sonrisa.
    for (const [s, alto] of [[-1, izq], [1, der]]) {
      capas.push(`<path d="M ${P(s * (w + 1.2), zm + alto + 2.2)} Q ${P(s * (w + 2.4), zm + alto + 0.2)} ${P(s * (w + 1.0), zm + alto - 1.8)}" fill="none" stroke="${sombra}" stroke-width="${k(0.9)}" stroke-linecap="round" opacity="0.75"/>`)
    }
  }

  // --- lo que es de cada uno ---
  for (let i = 0; i < (p.pecas ?? 0); i++) {
    const x = (R() * 2 - 1) * 46; const z = -14 - R() * 22 + Math.abs(x) * 0.12
    capas.push(elipse(x, z, 0.55 + R() * 0.5, 0.5 + R() * 0.4, mezcla(B, '#8a4a28', 0.7), 0.75))
  }
  for (const [x, z, r] of p.lunares ?? []) capas.push(elipse(x, z, r, r, '#4a2a1e', 0.9))
  for (const [x0, z0, x1, z1] of p.cicatrices ?? []) {
    const mx = (x0 + x1) / 2 + 1.6; const mz = (z0 + z1) / 2
    const d = `M ${P(x0, z0)} Q ${P(mx, mz)} ${P(x1, z1)}`
    capas.push(`<path d="${d}" fill="none" stroke="${mezcla(B, '#a8483f', 0.7)}" stroke-width="${k(2.3)}" stroke-linecap="round"/>`)
    capas.push(`<path d="${d}" fill="none" stroke="${mezcla(B, '#ffe1d6', 0.75)}" stroke-width="${k(0.7)}" stroke-linecap="round"/>`)
  }
  if (p.pintura) {
    for (const s of [-1, 1]) {
      capas.push(`<path d="M ${P(s * 17, -15.5)} L ${P(s * 47, -13.5)}" stroke="${p.pintura}" stroke-width="${k(4.2)}" stroke-linecap="round" opacity="0.88"/>`)
    }
  }
  if (p.arrugas) {
    const raya = (d, op = 0.5, g = 0.6) => capas.push(`<path d="${d}" fill="none" stroke="${sombra}" stroke-width="${k(g)}" stroke-linecap="round" opacity="${op}"/>`)
    for (const s of [-1, 1]) {
      const x = s * (SEP + o.rx + 2)
      for (const dz of [3.5, 0, -3.5]) raya(`M ${P(x, o.inclina + dz * 0.5)} L ${P(x + s * 6, o.inclina + dz * 1.6)}`)
      raya(`M ${P(s * 9.5, zn - 2)} Q ${P(s * 17, zn - 12)} ${P(s * (w + 4.5), zm + 1)}`, 0.5, 0.8)
    }
    raya(`M ${P(-24, zb + 14)} Q ${P(0, zb + 16.5)} ${P(24, zb + 14)}`, 0.4)
    raya(`M ${P(-18, zb + 20)} Q ${P(0, zb + 22)} ${P(18, zb + 20)}`, 0.32)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}"><defs>${defs.join('')}</defs>${capas.join('')}</svg>`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(SALIDA, { recursive: true })
  const todos = personajes()
  const pedidas = process.argv.slice(2)
  for (const clave of pedidas.length ? pedidas : Object.keys(todos)) {
    await sharp(Buffer.from(dibujar(clave, todos[clave]))).png().toFile(path.join(SALIDA, clave + '.png'))
    console.log('CARA', clave)
  }
}
