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
// Las caras REALISTAS (las cinco de la caja alienígena).
//
// Isidro, 06/10/2026: «las caras de las chicas que me has creado quiero que sean
// más realistas, copia mejor las caras, pero solo de las nuevas». Las demás son
// de muñeco a propósito (ojos enormes, nariz chata, colorete): estas llevan las
// proporciones de una cara de verdad —ojos de 28 mm con su párpado, cejas de
// pelo, nariz con puente y aletas, labios con su arco— y los rasgos de cada una
// (`real` en cabezas.json). La cabeza también cambia de forma en cabezas.py
// (`punto_real`): más estrecha y más larga de los ojos al mentón.
//
// Aquí se dibuja en milímetros DE VERDAD, vistos de frente. El lienzo no es eso:
// en horizontal es el ángulo alrededor de la cabeza, y la cabeza se estrecha
// hacia el mentón, así que la misma anchura ocupa más ángulo cuanto más abajo.
// `Xr` hace esa cuenta (la misma forma que `punto_real`): sin ella una boca de
// 48 mm salía de 40.
function dibujarReal (clave, p) {
  const R = azar(clave + ':real')
  const r = p.real === true ? {} : p.real
  const o = { sep: 31.5, ancho: 28.5, arriba: 5.9, abajo: 4.3, inclina: 2.0, iris: 5.9, pliegue: 2.8, ...(r.ojo ?? {}) }
  // Un punto más grandes que en la realidad: la figura se ve de lejos, y con el
  // ojo a su tamaño exacto la mirada se perdía.
  for (const q of ['ancho', 'arriba', 'abajo', 'iris']) o[q] *= r.ojos_talla ?? 1.15
  const c = { alto: 12.6, grosor: 5.0, arco: 3.0, cae: 1.5, ...(r.ceja ?? {}) }
  const n = { ancho: 16.5, punta: -37.5, ...(r.nariz ?? {}) }
  const b = { z: -62.5, ancho: 24.5, arriba: 6.6, abajo: 9.2, sonrisa: 1.4, arco: 1.3, brillo: 0.3, ...(r.boca ?? {}) }
  const delineado = r.delineado ?? 0.4
  const B = p.piel
  const sombra = mezcla(B, '#4f1f1a', 0.55)
  // En una piel oscura la luz no puede ser casi blanca: salían parches claros.
  const clara = rgb(B)[0] * 0.3 + rgb(B)[1] * 0.59 + rgb(B)[2] * 0.11 > 160
  const luz = mezcla(B, '#fff0e0', clara ? 0.6 : 0.3)
  const ceja = p.ceja ?? mezcla(p.pelo, '#1a120e', 0.35)
  const negro = mezcla(p.pelo, '#0c0807', 0.82)
  const defs = []
  const capas = []
  const sm = (x0, x1, x) => { const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))); return t * t * (3 - 2 * t) }
  const RX = p.ancho * 1000; const RY = 97; const RZA = 112; const RZB = 110
  const Xr = (x, z, sale = 0) => {
    const s = z < 0 ? Math.min(0.985, -z / RZB) : 0
    const ct = z < 0 ? Math.sqrt(1 - s * s) : Math.sqrt(Math.max(0.02, 1 - (z / RZA) ** 2))
    const jx = (1 - p.mandibula * s ** 2.5) * (1 - 0.04 * sm(30, 100, z))
    const hondo = RY * (1 - 0.05 * s * s) * (z < 0 ? Math.sqrt(ct) : ct)
    const sf = Math.max(-0.995, Math.min(0.995, x / (RX * jx * ct)))
    return Math.atan2(x, hondo * Math.sqrt(1 - sf * sf) + sale) * RADIO
  }
  const pt = (x, z, sale = 0) => donde(Xr(x, z, sale), z)
  const P = (x, z, sale = 0) => pt(x, z, sale).map(v => v.toFixed(1)).join(',')
  const k = v => (v * K).toFixed(2)
  const ex = (x, z, sale = 0) => Xr(x + 0.5, z, sale) - Xr(x - 0.5, z, sale)
  const elipse = (x, z, rx, rz, relleno, op = 1, filtro = '', giro = 0, sale = 0) => {
    const [cx, cy] = pt(x, z, sale)
    const t = giro ? ` transform="rotate(${giro} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : ''
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${k(rx * ex(x, z, sale))}" ry="${k(rz)}" fill="${relleno}" opacity="${op}"${filtro ? ` filter="url(#${filtro})"` : ''}${t}/>`
  }
  const poli = (pts, sale = 0) => pts.map(([x, z]) => P(x, z, sale)).join(' ')
  const trazo = (pts, color, ancho, op = 1, filtro = '', sale = 0) =>
    `<polyline points="${poli(pts, sale)}" fill="none" stroke="${color}" stroke-width="${k(ancho)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"${filtro ? ` filter="url(#${filtro})"` : ''}/>`
  const relleno = (pts, color, op = 1, filtro = '', sale = 0) =>
    `<polygon points="${poli(pts, sale)}" fill="${color}" opacity="${op}"${filtro ? ` filter="url(#${filtro})"` : ''}/>`
  const bez = (p0, p1, p2, p3, pasos = 24) => Array.from({ length: pasos + 1 }, (_, i) => {
    const t = i / pasos; const u = 1 - t
    return [0, 1].map(q => u * u * u * p0[q] + 3 * u * u * t * p1[q] + 3 * u * t * t * p2[q] + t * t * t * p3[q])
  })
  // Una curva desplazada en perpendicular lo que diga `cuanto(u)`: positivo hacia
  // ARRIBA, se recorra en el sentido que se recorra (cada ojo va en el suyo).
  const desplazar = (pts, cuanto) => pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)]; const d = pts[Math.min(pts.length - 1, i + 1)]
    const dx = d[0] - a[0]; const dz = d[1] - a[1]; const l = Math.hypot(dx, dz) || 1
    const g = cuanto(i / (pts.length - 1)) * (dx >= 0 ? 1 : -1)
    return [q[0] - dz / l * g, q[1] + dx / l * g]
  })

  for (const [id, s] of [['b05', 0.7], ['b1', 1.2], ['b2', 2.2], ['b4', 4.5], ['b8', 9], ['b16', 18]]) {
    defs.push(`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s}"/></filter>`)
  }

  // --- la piel: el volumen de la cara, a base de luces y sombras muy fundidas ---
  capas.push(`<rect width="${LADO}" height="${LADO}" fill="${B}"/>`)
  capas.push(elipse(0, -22, 50, 68, luz, 0.2, 'b16'))
  capas.push(elipse(0, 40, 40, 22, luz, 0.24, 'b16'))                              // la frente
  defs.push(`<linearGradient id="lado"><stop offset="0" stop-color="${sombra}" stop-opacity="0.22"/><stop offset="1" stop-color="${sombra}" stop-opacity="0"/></linearGradient>`)
  defs.push(`<linearGradient id="lado2" x1="1" x2="0"><stop offset="0" stop-color="${sombra}" stop-opacity="0.22"/><stop offset="1" stop-color="${sombra}" stop-opacity="0"/></linearGradient>`)
  capas.push(`<rect x="0" y="0" width="250" height="${LADO}" fill="url(#lado)"/><rect x="${LADO - 250}" y="0" width="250" height="${LADO}" fill="url(#lado2)"/>`)
  defs.push(`<linearGradient id="abajo" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${sombra}" stop-opacity="0"/><stop offset="0.5" stop-color="${sombra}" stop-opacity="0.5"/><stop offset="1" stop-color="${sombra}" stop-opacity="0.5"/></linearGradient>`)
  const yMenton = donde(0, -91)[1]
  capas.push(`<rect x="0" y="${yMenton.toFixed(0)}" width="${LADO}" height="${(LADO - yMenton).toFixed(0)}" fill="url(#abajo)"/>`)
  const pomulo = r.pomulo ?? 1
  for (const s of [-1, 1]) {
    capas.push(elipse(s * 41, -15, 13, 8, luz, 0.26 * pomulo, 'b8'))               // el pómulo, a la luz
    capas.push(elipse(s * 48, -44, 7, 19, sombra, 0.08 * pomulo, 'b8', s * 36))    // y la mejilla que se hunde debajo
    capas.push(elipse(s * 60, 6, 9, 26, sombra, 0.16, 'b8'))                       // la sien
  }
  capas.push(elipse(0, -90, 11, 7, luz, 0.22, 'b8'))                               // la barbilla
  capas.push(elipse(0, -78.5, 12, 2.2, sombra, 0.18, 'b2'))                         // el surco sobre ella
  defs.push(`<radialGradient id="rubor"><stop offset="0" stop-color="#e0564e" stop-opacity="${r.rubor ?? 0.17}"/><stop offset="1" stop-color="#e0564e" stop-opacity="0"/></radialGradient>`)
  for (const s of [-1, 1]) capas.push(elipse(s * 42, -27, 18, 13, 'url(#rubor)'))
  // El grano de la piel: motas apenas visibles, que de cerca quitan el aspecto de plástico.
  let grano = ''
  for (let i = 0; i < 520; i++) {
    const x = (R() * 2 - 1) * 62; const z = 58 - R() * 160
    const [cx, cy] = pt(x * Math.min(1, 1.25 - Math.abs(z + 20) / 160), z)
    grano += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(0.5 + R() * 0.9).toFixed(2)}" fill="${R() < 0.6 ? sombra : luz}" opacity="${(0.05 + R() * 0.07).toFixed(3)}"/>`
  }
  capas.push(grano)

  // --- la nariz: el bulto lo pone la malla; aquí, sus planos, sus aletas y sus orificios ---
  const zn = n.punta
  const na = n.ancho
  // Los dos lados del puente: el de la sombra (la luz viene de su derecha) pesa más.
  for (const [s, op] of [[-1, 0.07], [1, 0.13]]) {
    capas.push(trazo(bez([s * 8.5, 9], [s * 5.5, -4], [s * 5.5, -22], [s * (na * 0.62), zn + 3]), sombra, 4.6, op, 'b4', 8))
  }
  capas.push(elipse(-0.5, -15, 1.7, 15, '#ffffff', 0.16, 'b2', 0, 8))                // el filo del puente
  capas.push(elipse(-0.8, zn + 2.6, 3.4, 2.7, '#ffffff', 0.3, 'b2', 0, 18))          // el brillo de la punta
  capas.push(elipse(0, zn + 1, na * 0.5, 5.5, '#e0685e', 0.1, 'b4', 0, 14))
  capas.push(elipse(0, zn - 5.6, na * 0.62, 2.6, sombra, 0.34, 'b2', 0, 8))          // la sombra bajo la punta
  for (const s of [-1, 1]) {
    // La aleta: su pliegue contra la mejilla y la sombra que deja fuera.
    capas.push(trazo(bez([s * (na - 5.5), zn + 3.2], [s * (na + 1.2), zn + 2.5], [s * (na + 1.4), zn - 4.6], [s * (na - 3.6), zn - 6.2], 14), sombra, 0.9, 0.4, 'b1', 7))
    capas.push(elipse(s * (na + 2.5), zn - 3.5, 3.6, 4.6, sombra, 0.15, 'b4', 0, 5))
    capas.push(elipse(s * na * 0.4, zn - 4.9, na * 0.2, 1.55, mezcla(sombra, '#1c0908', 0.6), 0.86, 'b1', s * -14, 9))   // el orificio
    capas.push(trazo([[s * 3.3, zn - 8.5], [s * 4.3, zn - 17.5]], sombra, 1.0, 0.16, 'b1', 5))                          // el surco hasta el labio
  }

  // --- los ojos ---
  const iris = p.iris
  defs.push(`<radialGradient id="irisR" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="${mezcla(iris, r.centro_iris ?? '#c98a4a', 0.34)}"/><stop offset="0.55" stop-color="${mezcla(iris, '#ffffff', 0.16)}"/><stop offset="0.82" stop-color="${iris}"/><stop offset="1" stop-color="${mezcla(iris, '#050404', 0.72)}"/></radialGradient>`)
  for (const s of [-1, 1]) {
    const cx = s * o.sep
    const xi = cx - s * o.ancho / 2; const zi = -o.inclina * 0.4
    const xo = cx + s * o.ancho / 2; const zo = o.inclina * 0.6
    // El párpado de arriba tiene su punto más alto hacia dentro; el de abajo, hacia fuera.
    const arriba = bez([xi, zi], [xi + s * o.ancho * 0.2, zi + o.arriba * 1.3], [xo - s * o.ancho * 0.4, zo + o.arriba * 1.24], [xo, zo], 30)
    const abajo = bez([xo, zo], [xo - s * o.ancho * 0.28, zo - o.abajo * 1.22], [xi + s * o.ancho * 0.42, zi - o.abajo * 1.34], [xi, zi], 30)
    // La cuenca: del ojo a la ceja y, sobre todo, el rincón contra la nariz.
    capas.push(elipse(cx, 6.5, o.ancho / 2 + 6, 8.5, sombra, 0.2, 'b4'))
    capas.push(elipse(cx - s * (o.ancho / 2 + 3), 1.5, 5, 9.5, sombra, 0.12, 'b4'))
    capas.push(elipse(cx, -o.abajo - 3.4, o.ancho * 0.42, 1.9, sombra, 0.17, 'b2'))  // la ojera, un punto
    if (r.sombra_ojos) {
      const tope = desplazar(arriba, u => (o.pliegue + 2.6) * Math.sin(Math.PI * Math.min(1, u * 1.08)) ** 0.6)
      capas.push(relleno([...arriba, ...tope.reverse()], r.color_sombra ?? '#3a2026', r.sombra_ojos, 'b2'))
    }
    defs.push(`<clipPath id="ojo${s}"><polygon points="${poli([...arriba, ...abajo])}"/></clipPath>`)
    let ojo = relleno([...arriba, ...abajo], '#efe9e3')
    ojo += elipse(xi + s * 1.7, zi - 0.3, 2.3, 1.7, '#d98f85', 0.8, 'b05')                // el lagrimal
    ojo += elipse(xo, zo, 5.5, 4.5, '#7d716c', 0.38, 'b2')                               // el rincón de fuera, en sombra
    const ix = cx - s * 0.5; const iz = o.arriba * 0.17
    ojo += elipse(ix, iz, o.iris, o.iris, 'url(#irisR)')
    // Las fibras del iris.
    for (let i = 0; i < 44; i++) {
      const a = Math.PI * 2 * (i + R() * 0.6) / 44
      const r0 = o.iris * (0.4 + R() * 0.1); const r1 = o.iris * (0.78 + R() * 0.18)
      ojo += trazo([[ix + Math.cos(a) * r0, iz + Math.sin(a) * r0], [ix + Math.cos(a) * r1, iz + Math.sin(a) * r1]],
        R() < 0.5 ? mezcla(iris, '#ffffff', 0.5) : mezcla(iris, '#000000', 0.5), 0.16, 0.4)
    }
    const [icx, icy] = pt(ix, iz)
    ojo += `<ellipse cx="${icx.toFixed(1)}" cy="${icy.toFixed(1)}" rx="${k((o.iris - 0.25) * ex(ix, iz))}" ry="${k(o.iris - 0.25)}" fill="none" stroke="${mezcla(iris, '#050404', 0.8)}" stroke-width="${k(0.55)}" opacity="0.85"/>`
    ojo += elipse(ix, iz, 2.15, 2.15, '#0b0808')
    // La sombra que el párpado y las pestañas echan sobre el ojo.
    ojo += relleno([...arriba, ...desplazar(arriba, u => -2.6).reverse()], '#22161a', 0.5, 'b1')
    ojo += elipse(ix - 1.7, iz + 1.9, 1.15, 1.0, '#ffffff', 0.95)
    ojo += elipse(ix + 1.9, iz - 1.7, 0.6, 0.5, '#ffffff', 0.5, 'b05')
    ojo += trazo(desplazar(abajo, u => 0.5), '#f0cabf', 0.7, 0.8)                       // el borde húmedo del párpado de abajo
    capas.push(`<g clip-path="url(#ojo${s})">${ojo}</g>`)
    // La línea de las pestañas: fina en el lagrimal, gruesa hacia fuera, y el rabillo si va pintada.
    const grueso = u => 0.3 + (1.0 + 0.7 * delineado) * Math.sin(Math.PI * Math.min(1, u * 0.86 + 0.06)) ** 0.9 * (0.55 + 0.6 * u)
    capas.push(relleno([...arriba, ...desplazar(arriba, grueso).reverse()], negro))
    if (delineado >= 0.6) capas.push(relleno([[xo - s * 3, zo + 1.4], [xo, zo - 0.2], [xo + s * (1.8 + 2.4 * delineado), zo + 1.2 + 1.5 * delineado]], negro))
    let pestanas = ''
    for (let i = 0; i < 15; i++) {
      const u = 0.24 + 0.74 * (i + R() * 0.5) / 15
      const q = arriba[Math.round(u * 30)]
      const largo = (1.2 + 1.5 * u + R() * 0.5) * (0.85 + 0.5 * delineado)
      const a = (62 - 44 * u) * Math.PI / 180                                          // hacia arriba dentro, tendidas hacia fuera
      pestanas += trazo([q, [q[0] + s * Math.cos(a) * largo, q[1] + Math.sin(a) * largo]], negro, 0.24, 0.9)
    }
    capas.push(pestanas)
    capas.push(trazo(abajo.slice(1, 22), mezcla(sombra, negro, 0.35 + 0.3 * delineado), 0.42 + 0.25 * delineado, 0.6))
    // El pliegue del párpado.
    capas.push(trazo(desplazar(arriba, u => o.pliegue * (0.62 + 0.5 * Math.sin(Math.PI * u))).slice(2, 29), sombra, 0.6, r.pliegue_fuerza ?? 0.62))
  }

  // --- las cejas: pelo a pelo sobre una base fundida ---
  for (const s of [-1, 1]) {
    const q0 = [o.sep - o.ancho * 0.6, c.alto - 0.6]
    const q1 = [o.sep + o.ancho * 0.14, c.alto + c.arco * 2.1]
    const q2 = [o.sep + o.ancho * 0.71, c.alto - c.cae]
    const eje = Array.from({ length: 33 }, (_, i) => {
      const t = i / 32; const u = 1 - t
      const x = u * u * q0[0] + 2 * u * t * q1[0] + t * t * q2[0]
      const z = u * u * q0[1] + 2 * u * t * q1[1] + t * t * q2[1]
      const dx = 2 * u * (q1[0] - q0[0]) + 2 * t * (q2[0] - q1[0]); const dz = 2 * u * (q1[1] - q0[1]) + 2 * t * (q2[1] - q1[1])
      const l = Math.hypot(dx, dz)
      const g = c.grosor / 2 * (1 - 0.74 * t ** 1.5) * (t < 0.08 ? 0.5 + 6.2 * t : 1)
      return { x, z, tx: dx / l, tz: dz / l, g, t }
    })
    const lomo = eje.map(e => [s * (e.x - e.tz * e.g), e.z + e.tx * e.g])
    const vientre = eje.map(e => [s * (e.x + e.tz * e.g), e.z - e.tx * e.g])
    capas.push(relleno([...lomo, ...vientre.reverse()], ceja, 0.5, 'b1'))
    let pelos = ''
    for (let i = 0; i < 130; i++) {
      const e = eje[1 + Math.floor(R() * 30)]
      const d = (R() * 2 - 1) * e.g * 0.95
      const x = e.x - e.tz * d; const z = e.z + e.tx * d
      // En la cabeza de la ceja el pelo sube; luego se tiende hacia la cola. Los
      // de arriba bajan un poco y los de abajo suben, y se cruzan en el lomo.
      const sube = (72 * (1 - sm(0, 0.3, e.t)) + 14) * (d < 0 ? 1 : -0.5) * Math.PI / 180
      const a = Math.atan2(e.tz, e.tx) + sube
      const largo = (2.1 + R() * 1.8) * (1 - 0.35 * e.t)
      pelos += trazo([[s * x, z], [s * (x + Math.cos(a) * largo), z + Math.sin(a) * largo]],
        R() < 0.35 ? mezcla(ceja, '#ffffff', 0.18) : mezcla(ceja, '#000000', 0.3 * R()), 0.27, 0.82)
    }
    capas.push(pelos)
  }

  // --- la boca: los dos labios con su forma, fundidos con la piel, y la línea entre ellos ---
  const W = b.ancho
  const zm = b.z
  const tB = x => Math.min(1, Math.abs(x) / W)
  const zLinea = x => zm + b.sonrisa * tB(x) ** 2.2 - 0.55 * Math.exp(-((x / 5) ** 2)) + 0.4 * Math.exp(-(((Math.abs(x) - 7.5) / 4) ** 2))
  const zArriba = x => zLinea(x) + b.arriba * (1 - tB(x) ** 2.2) ** 0.8 * (1 - 0.2 * (b.arco / 1.3) * Math.exp(-((x / 3.4) ** 2)))
  const zAbajo = x => zLinea(x) - b.abajo * (1 - tB(x) ** 2.4) ** 0.7
  const xs = Array.from({ length: 49 }, (_, i) => -W + 2 * W * i / 48)
  const lin = xs.map(x => [x, zLinea(x)])
  const labio = p.labio ?? mezcla(B, '#b5403a', 0.45)
  const fz = r.pintalabios ? 0.97 : 0.9
  capas.push(elipse(0, zm - b.abajo - 4.6, W * 0.5, 3, sombra, 0.3, 'b4', 0, 4))                         // la sombra bajo el labio
  let labios = relleno([...xs.map(x => [x, zArriba(x)]), ...lin.slice().reverse()], mezcla(labio, '#3a0e0c', 0.22), fz, '', 5)
  labios += relleno([...lin, ...xs.map(x => [x, zAbajo(x)]).reverse()], labio, fz, '', 5)
  capas.push(`<g filter="url(#b05)">${labios}</g>`)
  capas.push(trazo(lin, mezcla(labio, '#2a0808', 0.6), 2.6, 0.32, 'b1', 5))                              // hacia dentro, más oscuro
  capas.push(trazo(xs.slice(8, 41).map(x => [x, zAbajo(x) + 0.4]), sombra, 1.3, 0.22, 'b1', 5))
  capas.push(elipse(-1.5, zm - b.abajo * 0.5, W * 0.34, 1.6, '#ffffff', b.brillo, 'b2', 0, 6))            // el brillo del labio de abajo
  for (const s of [-1, 1]) capas.push(elipse(s * 4.6, zm + b.arriba * 0.86, 1.6, 0.8, '#ffffff', 0.2, 'b1', 0, 5))   // el arco de arriba
  capas.push(trazo(lin, mezcla(labio, '#1c0606', 0.78), 0.85, 0.92, '', 5))
  for (const s of [-1, 1]) capas.push(elipse(s * (W + 0.7), zLinea(W) + 0.2, 1.2, 1.0, sombra, 0.6, 'b05', 0, 3))     // las comisuras

  // --- lo que es de cada una ---
  for (let i = 0; i < (r.pecas ?? 0); i++) {
    const x = (R() * 2 - 1) * 44; const z = -8 - R() * 26 + Math.abs(x) * 0.1
    capas.push(elipse(x, z, 0.32 + R() * 0.3, 0.3 + R() * 0.25, mezcla(B, '#8a4a28', 0.6), 0.28 + R() * 0.2))
  }
  for (const [x, z, rr] of r.lunares ?? []) capas.push(elipse(x, z, rr, rr, '#4a2a1e', 0.85))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}"><defs>${defs.join('')}</defs>${capas.join('')}</svg>`
}

export function dibujar (clave, p) {
  if (p.real) return dibujarReal(clave, p)
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
    const lg = p.labio_grosor ?? 1                    // labios más o menos llenos
    // Los labios: el de arriba con su arco, el de abajo más lleno.
    capas.push(`<path d="M ${P(-w * 0.86, zm + izq * 0.6)} Q ${P(-w * 0.34, zm + 3.6 * lg)} ${P(0, zm + 2.1 * lg)} Q ${P(w * 0.34, zm + 3.6 * lg)} ${P(w * 0.86, zm + der * 0.6)} Q ${P(0, fondo - 0.3)} ${P(-w * 0.86, zm + izq * 0.6)} Z" fill="${mezcla(labio, '#3d0f0c', 0.18)}" opacity="${fuerza}"/>`)
    capas.push(`<path d="M ${P(-w * 0.8, zm + izq * 0.45)} Q ${P(0, fondo - 0.2)} ${P(w * 0.8, zm + der * 0.45)} Q ${P(0, fondo - 9.5 * lg)} ${P(-w * 0.8, zm + izq * 0.45)} Z" fill="${labio}" opacity="${fuerza}"/>`)
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
