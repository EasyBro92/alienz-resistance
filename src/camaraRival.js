import * as THREE from 'three'
import { FIELD, ZOMBIES, SOLDIERS, DEFENSES } from './config.js'

// La cámara del campo del rival.
//
// Antes era un plano: rayas de carril y círculos de color moviéndose a saltos.
// Isidro lo dijo claro —«se ve una pantalla cutre»— y pidió que pareciera una
// cámara apuntando al campo del otro, con los alienz reconocibles, pero sin que
// el juego se ponga a pedalear por ello.
//
// Cómo se consigue lo segundo. Aquí NO hay un segundo mundo en tres
// dimensiones: hay un lienzo de dos dimensiones y las figuras de verdad ya
// fotografiadas (ver `systems/fotosCampo.js`). De la cámara de three solo se usa
// la CUENTA: se le pide que proyecte unos cuantos puntos de mundo a píxeles, que
// son treinta multiplicaciones de matriz por fotograma, y con eso el suelo sale
// en perspectiva y cada figura sale del tamaño que le toca a su distancia. Ni
// una luz, ni una sombra, ni un triángulo.
//
// Y lo tercero, que es lo que hace que se vea como una cámara y no como un
// dibujo: el grano, las líneas de barrido y los bordes oscurecidos. Además de
// la estética, tienen un efecto práctico: la imagen se dibuja a MENOS resolución
// de la que ocupa, y el grano tapa que está ampliada. Cuanto peor va el móvil,
// más pequeña se dibuja y menos veces por segundo, y sigue viéndose igual de
// bien porque lo que se pierde se lo come el ruido.
//
// Por la red solo cruzan tipo, x y z cuatro veces por segundo. Todo lo demás
// —que anden, que disparen, que se deshagan al morir— se finge aquí con lo que
// ya se sabe. No es exacto al milímetro y no pasa nada: es una cámara, no un
// informe.

const CLAVES_Z = Object.keys(ZOMBIES)
const CLAVES_S = [...Object.keys(SOLDIERS), ...Object.keys(DEFENSES)]
const PICADO = THREE.MathUtils.degToRad(25)
const PASO_DATO = 0.25        // cada cuánto llega una instantánea
const SIN_SENAL = 1.5         // sin datos más de esto, se cae la señal
const ALCANCE = 19            // hasta dónde se finge que dispara un defensor

// Lo que se recorta cuando el móvil va justo. Con grano encima, bajar de 1 a
// 0,55 de resolución no se nota: se nota MUCHO en lo que tarda en pintarse.
const CALIDADES = {
  alta: { escala: 1, fps: 20, ruido: 0.075 },
  media: { escala: 0.78, fps: 15, ruido: 0.09 },
  baja: { escala: 0.55, fps: 11, ruido: 0.12 }
}

const PALETA_POR_DEFECTO = {
  asfalto: 0x4a423c, raya: 0xf0c419, bordillo: 0x3d3430,
  tierra: 0x4a3c34, cielo: 0x141a22, niebla: 0x222a34
}

const hex = n => '#' + ((n ?? 0) & 0xffffff).toString(16).padStart(6, '0')
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
const mezclar = (a, b, k) => {
  const r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k)
  const g = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k)
  const z = Math.round((a & 255) * (1 - k) + (b & 255) * k)
  return (r << 16) | (g << 8) | z
}
const xDeCarril = l => (l - (FIELD.lanes - 1) / 2) * FIELD.laneWidth
const zDeFila = f => FIELD.frontRowZ - f * FIELD.rowDepth

export function crearCamaraRival (lienzo, { calidad = () => 'alta', paleta = () => null } = {}) {
  const pincel = lienzo.getContext('2d')
  if (!pincel) return null

  let fotos = null
  let nombre = 'Rival'
  let reloj = ''
  let vida = 100
  let bichos = []               // { k, x, z, tx, tz, vel, fase, nace }
  let soldados = []             // { k, lane, row, fuego, tira }
  let polvo = []                // { x, z, t }
  let rotulos = []              // { t, texto }
  let ultimoDato = 99
  let destello = 0
  let acercar = null            // { t, x }
  let vistos = new Set()
  let desdeDibujo = 0
  let reloj0 = performance.now() / 1000

  // --- el ruido, las líneas y el viñeteado, hechos una sola vez --------------
  const tejaRuido = document.createElement('canvas')
  tejaRuido.width = tejaRuido.height = 64
  {
    const c = tejaRuido.getContext('2d')
    const img = c.createImageData(64, 64)
    for (let i = 0; i < 64 * 64; i++) {
      const v = 120 + Math.random() * 135
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    c.putImageData(img, 0, 0)
  }
  const patronRuido = pincel.createPattern(tejaRuido, 'repeat')

  const tejaLineas = document.createElement('canvas')
  tejaLineas.width = 1
  tejaLineas.height = 3
  {
    const c = tejaLineas.getContext('2d')
    c.fillStyle = 'rgba(0,0,0,0.26)'
    c.fillRect(0, 0, 1, 1)
  }
  const patronLineas = pincel.createPattern(tejaLineas, 'repeat')

  let sombra = null             // el viñeteado, cacheado por tamaño
  let sombraW = 0
  let sombraH = 0

  // --- la cámara -------------------------------------------------------------
  const camara = new THREE.PerspectiveCamera(48, 1, 0.1, 400)
  // El mismo punto al que mira la camara del juego. Medido: con esto su base
  // cae al 93 % de alto (se ve caer, que es lo que importa) y los que acaban de
  // entrar al 21 %. Acercando la camara se veia mejor a los bichos, pero su
  // base se salia por abajo.
  const mira = new THREE.Vector3(0, 0, -9)
  const v = new THREE.Vector3()
  const arribaCam = new THREE.Vector3()
  let W = 1
  let H = 1

  function colocarCamara (w, h) {
    camara.aspect = w / h
    // La misma cuenta que en `world.js`: la cámara se aleja lo justo para que la
    // calzada entera entre de ancho. Así la cámara del rival encuadra como la
    // tuya, que es lo que pidió: «igual que tu partida».
    const ancho = FIELD.lanes * FIELD.laneWidth
    const vFov = THREE.MathUtils.degToRad(camara.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camara.aspect)
    let dist = Math.max((ancho + 2.2) / 2 / Math.tan(hFov / 2), 26)
    const m = mira.clone()
    if (acercar) {
      // Se acerca al carril donde le están mordiendo y vuelve sola. Es el
      // momento que quieres ver, y en una ventana pequeña no se ve si no.
      const k = Math.sin(Math.min(1, acercar.t / 1.9) * Math.PI) * 0.8
      m.x += acercar.x * k
      m.z += (FIELD.baseZ - mira.z) * k
      dist *= 1 - 0.42 * k
    }
    camara.position.set(m.x, m.y + Math.sin(PICADO) * dist, m.z + Math.cos(PICADO) * dist)
    camara.lookAt(m)
    camara.updateMatrixWorld(true)
    camara.updateProjectionMatrix()
    arribaCam.set(0, 1, 0).applyQuaternion(camara.quaternion)
  }

  const aPantalla = (x, y, z) => {
    v.set(x, y, z).project(camara)
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, dentro: v.z < 1 }
  }
  // Píxeles por unidad de mundo medida en el plano de la cámara, a esa
  // distancia. Es lo que convierte el tamaño de una foto en su tamaño en
  // pantalla, y sale de proyectar dos puntos separados un metro.
  const porUnidad = (x, z) => {
    const a = aPantalla(x, 0, z)
    const b = aPantalla(x + arribaCam.x, arribaCam.y, z + arribaCam.z)
    return Math.abs(a.y - b.y) || 1
  }

  // --- lo que llega por la red ----------------------------------------------
  function datos (c) {
    ultimoDato = 0
    if (!c) return
    const antesVida = vida
    vida = c.b ?? vida
    if (vida < antesVida) {
      destello = 0.5
      // ¿Por qué carril le han entrado? El bicho que estaba más cerca de su
      // base en la instantánea anterior. No hay forma de saberlo mejor con lo
      // que cruza por la red, y acierta casi siempre.
      const puntero = bichos.slice().sort((a, b) => b.z - a.z)[0]
      acercar = { t: 0, x: puntero ? puntero.x : 0 }
      rotulo('BASE ALCANZADA')
    }

    // Emparejar los bichos de antes con los de ahora. Las instantáneas no
    // traen identificador —serían más datos por la red—, así que se empareja por
    // cercanía dentro del mismo tipo: los que quedan sin pareja arriba acaban
    // de entrar, y los que quedan sin pareja abajo se acaban de morir.
    const libres = bichos.map(b => ({ b, tomado: false }))
    const salen = []
    for (const [k, x10, z10] of c.z ?? []) {
      const x = x10 / 10
      const z = z10 / 10
      let mejor = null
      let d2 = 49                // no se empareja nada a más de 7 de distancia
      for (const l of libres) {
        if (l.tomado || l.b.k !== k) continue
        const dd = (l.b.tx - x) ** 2 + (l.b.tz - z) ** 2
        if (dd < d2) { d2 = dd; mejor = l }
      }
      if (mejor) {
        mejor.tomado = true
        const b = mejor.b
        // La velocidad, del propio movimiento: así los que están parados
        // atacando no mueven las piernas y los que corren las mueven rápido.
        const paso = Math.hypot(x - b.tx, z - b.tz)
        b.vel = b.vel * 0.55 + (paso / PASO_DATO) * 0.45
        b.tx = x
        b.tz = z
        salen.push(b)
      } else {
        salen.push({ k, x, z, tx: x, tz: z, vel: ZOMBIES[CLAVES_Z[k]]?.speed ?? 3, fase: Math.random() * 6.28, nace: 0 })
        const clave = CLAVES_Z[k]
        // Aviso de los gordos, una vez por partida y por tipo: enterarse de que
        // al otro le ha caído un Coloso es información, no adorno.
        if (clave && !vistos.has(clave) && (ZOMBIES[clave]?.scale ?? 1) >= 1.4) {
          vistos.add(clave)
          rotulo(`${ZOMBIES[clave].name.toUpperCase()} EN SU CAMPO`)
        }
      }
    }
    for (const l of libres) {
      if (l.tomado) continue
      // Se ha muerto (o ha llegado a la base). Un poco de polvo donde estaba.
      if (l.b.nace > 0.2) polvo.push({ x: l.b.x, z: l.b.z, t: 0 })
    }
    bichos = salen

    soldados = (c.s ?? []).map(([k, lane, row]) => {
      const antes = soldados.find(s => s.lane === lane && s.row === row && s.k === k)
      return antes ?? { k, lane, row, fuego: Math.random() * 0.4, tira: 0 }
    })
  }

  function rotulo (texto) {
    // Dos mordiscos seguidos ponian dos veces el mismo cartel, uno debajo del
    // otro: se refresca el que ya esta en vez de apilar otro igual.
    const ultimo = rotulos[rotulos.length - 1]
    if (ultimo && ultimo.texto === texto) { ultimo.t = 0; return }
    rotulos.push({ t: 0, texto })
    if (rotulos.length > 2) rotulos.shift()
  }

  // --- el latido -------------------------------------------------------------
  function tic (dt) {
    ultimoDato += dt
    const parado = ultimoDato > SIN_SENAL
    if (!parado) {
      for (const b of bichos) {
        b.nace = Math.min(1, b.nace + dt * 3)
        // Entre dato y dato se rellena el hueco: la figura va hacia donde le
        // toca en vez de aparecer allí de golpe. Sin esto los bichos andaban a
        // saltos de cuatro por segundo, que era la mitad de la sensación de
        // pantalla cutre.
        const k = Math.min(1, dt / PASO_DATO * 1.35)
        b.x += (b.tx - b.x) * k
        b.z += (b.tz - b.z) * k
        if (b.vel > 0.35) b.fase += dt * b.vel * 2.4
      }
      for (const s of soldados) {
        const blanco = bichos.find(b => Math.abs(b.x - xDeCarril(s.lane)) < FIELD.laneWidth * 0.75 &&
          b.z < zDeFila(s.row) && b.z > zDeFila(s.row) - ALCANCE)
        s.tira = Math.max(0, s.tira - dt)
        s.fuego -= dt
        if (blanco && s.fuego <= 0) { s.fuego = 0.34; s.tira = 0.075; s.blanco = blanco }
        if (!blanco) s.blanco = null
      }
      for (let i = polvo.length - 1; i >= 0; i--) {
        polvo[i].t += dt
        if (polvo[i].t > 0.55) polvo.splice(i, 1)
      }
    }
    destello = Math.max(0, destello - dt)
    if (acercar) { acercar.t += dt; if (acercar.t > 1.9) acercar = null }
    for (let i = rotulos.length - 1; i >= 0; i--) {
      rotulos[i].t += dt
      if (rotulos[i].t > 2.4) rotulos.splice(i, 1)
    }

    // A menos fotogramas por segundo que el juego: los datos llegan cuatro
    // veces por segundo, así que pintar sesenta veces sería tirar el trabajo.
    const cal = CALIDADES[calidad()] ?? CALIDADES.alta
    desdeDibujo += dt
    if (desdeDibujo < 1 / cal.fps) return
    desdeDibujo = 0
    pintar()
  }

  // --- pintar ----------------------------------------------------------------
  // `forzar` es para el último plano del final: se pide a un tamaño fijo en vez
  // de al que tenga la ventana en ese momento, que puede ser la miniatura de
  // 92 píxeles y sale una foto borrosa al ampliarla en la pantalla de premio.
  function pintar (forzar) {
    const caja = forzar ?? lienzo.getBoundingClientRect()
    if (!caja.width || !caja.height) return
    const cal = CALIDADES[calidad()] ?? CALIDADES.alta
    const k = forzar ? 1 : Math.min(2, devicePixelRatio || 1) * cal.escala
    const w = Math.max(1, Math.round(caja.width * k))
    const h = Math.max(1, Math.round(caja.height * k))
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; sombra = null }
    W = lienzo.width
    H = lienzo.height
    colocarCamara(W, H)
    const t = performance.now() / 1000 - reloj0
    const p = { ...PALETA_POR_DEFECTO, ...(paleta() ?? {}) }

    pincel.setTransform(1, 0, 0, 1, 0, 0)
    pincel.globalAlpha = 1

    // El horizonte: donde cae el suelo visto de infinitamente lejos.
    const horizonte = aPantalla(0, 0, -600).y

    // Cielo y tierra.
    const cielo = pincel.createLinearGradient(0, 0, 0, Math.max(1, horizonte))
    cielo.addColorStop(0, hex(mezclar(p.cielo, 0x000000, 0.25)))
    cielo.addColorStop(1, hex(mezclar(p.cielo, p.niebla, 0.85)))
    pincel.fillStyle = cielo
    pincel.fillRect(0, 0, W, Math.max(0, horizonte))
    pincel.fillStyle = hex(mezclar(p.tierra, 0x000000, 0.18))
    pincel.fillRect(0, Math.max(0, horizonte), W, H - Math.max(0, horizonte))

    // La calzada, en perspectiva de verdad: cuatro esquinas proyectadas.
    const media = FIELD.lanes * FIELD.laneWidth / 2
    const zFondo = FIELD.spawnZ - 6
    const zFrente = FIELD.baseZ + 4
    const quad = (x0, z0, x1, z1, relleno) => {
      const a = aPantalla(x0, 0, z0)
      const b = aPantalla(x1, 0, z0)
      const c = aPantalla(x1, 0, z1)
      const d = aPantalla(x0, 0, z1)
      pincel.beginPath()
      pincel.moveTo(a.x, a.y); pincel.lineTo(b.x, b.y); pincel.lineTo(c.x, c.y); pincel.lineTo(d.x, d.y)
      pincel.closePath()
      pincel.fillStyle = relleno
      pincel.fill()
    }
    quad(-media - 1.1, zFondo, media + 1.1, zFrente, hex(p.bordillo))
    quad(-media, zFondo, media, zFrente, hex(p.asfalto))

    // Rayas de carril, a trazos y solo en los carriles abiertos.
    pincel.lineWidth = Math.max(1, W * 0.004)
    for (let i = FIELD.primerCarril + 1; i <= FIELD.ultimoCarril; i++) {
      const x = xDeCarril(i) - FIELD.laneWidth / 2
      pincel.strokeStyle = rgba(p.raya, 0.32)
      pincel.beginPath()
      for (let z = zFondo; z < zFrente; z += 6) {
        const a = aPantalla(x, 0.02, z)
        const b = aPantalla(x, 0.02, Math.min(zFrente, z + 3.4))
        pincel.moveTo(a.x, a.y)
        pincel.lineTo(b.x, b.y)
      }
      pincel.stroke()
    }
    // Los carriles cerrados, tapados: en el puente y el estadio se pelea en
    // menos ancho y hay que verlo.
    if (FIELD.primerCarril > 0) quad(-media, zFondo, xDeCarril(FIELD.primerCarril) - FIELD.laneWidth / 2, zFrente, rgba(0x000000, 0.42))
    if (FIELD.ultimoCarril < FIELD.lanes - 1) quad(xDeCarril(FIELD.ultimoCarril) + FIELD.laneWidth / 2, zFondo, media, zFrente, rgba(0x000000, 0.42))

    // La línea de su base, con su vida encima.
    const base0 = aPantalla(-media - 1.1, 0, FIELD.baseZ)
    const base1 = aPantalla(media + 1.1, 0, FIELD.baseZ + 2.6)
    pincel.fillStyle = rgba(0x000000, 0.5)
    pincel.fillRect(Math.min(base0.x, base1.x), base0.y, Math.abs(base1.x - base0.x), Math.max(2, base1.y - base0.y))
    const vidaK = Math.max(0, Math.min(1, vida / 100))
    pincel.fillStyle = vidaK > 0.5 ? '#4ad07a' : vidaK > 0.25 ? '#e0a83c' : '#e8523f'
    pincel.fillRect(Math.min(base0.x, base1.x), base0.y, Math.abs(base1.x - base0.x) * vidaK, Math.max(2, H * 0.012))

    // Niebla al fondo: además de ser lo que hace el juego, tapa el borde donde
    // se acaba la calzada dibujada.
    const niebla = pincel.createLinearGradient(0, Math.max(0, horizonte - H * 0.02), 0, Math.max(1, horizonte + H * 0.3))
    niebla.addColorStop(0, rgba(p.niebla, 0.95))
    niebla.addColorStop(1, rgba(p.niebla, 0))
    pincel.fillStyle = niebla
    pincel.fillRect(0, Math.max(0, horizonte - H * 0.02), W, H * 0.34)

    // --- las figuras, de lejos a cerca ---------------------------------------
    const cosas = []
    for (const s of soldados) cosas.push({ tipo: 's', d: s, x: xDeCarril(s.lane), z: zDeFila(s.row) })
    for (const b of bichos) cosas.push({ tipo: 'z', d: b, x: b.x, z: b.z })
    cosas.sort((a, b) => a.z - b.z)

    for (const c of cosas) {
      const clave = c.tipo === 'z' ? CLAVES_Z[c.d.k] : CLAVES_S[c.d.k]
      const foto = fotos?.get(clave)
      const u = porUnidad(c.x, c.z)
      if (!foto) {
        // Sin fotos todavía (se hacen al entrar en el duelo): una mancha, para
        // que la cámara no salga vacía mientras cargan.
        const spec = c.tipo === 'z' ? ZOMBIES[clave] : (SOLDIERS[clave] ?? DEFENSES[clave])
        const pt = aPantalla(c.x, 0.6, c.z)
        pincel.fillStyle = hex(spec?.color ?? 0x9fb4c8)
        pincel.beginPath()
        pincel.arc(pt.x, pt.y, Math.max(1.5, u * 0.35), 0, 6.2832)
        pincel.fill()
        continue
      }
      const pie = aPantalla(c.x + arribaCam.x * foto.pie, arribaCam.y * foto.pie, c.z + arribaCam.z * foto.pie)
      const alto = foto.alto * u
      const ancho = foto.ancho * u
      if (alto < 1 || !pie.dentro) continue
      const cuadro = foto.cuadros[c.tipo === 'z' && foto.cuadros.length > 1
        ? (Math.sin(c.d.fase) > 0 ? 0 : 1)
        : 0]
      const aparece = c.tipo === 'z' ? c.d.nace : 1
      if (aparece < 1) pincel.globalAlpha = aparece
      pincel.drawImage(cuadro, pie.x - ancho / 2, pie.y - alto, ancho, alto)
      pincel.globalAlpha = 1

      // El fogonazo del defensor y la traza del disparo. Por la red no cruza
      // nada de esto: se finge con quién tiene delante. No es exacto, pero es
      // lo que da vida a la imagen, y cuesta dos líneas por soldado.
      if (c.tipo === 's' && c.d.tira > 0) {
        const boca = aPantalla(c.x + 0.34, 1.16, c.z - 0.5)
        pincel.fillStyle = 'rgba(255,238,190,0.95)'
        pincel.beginPath()
        pincel.arc(boca.x, boca.y, Math.max(1.2, u * 0.16), 0, 6.2832)
        pincel.fill()
        if (c.d.blanco) {
          const dest = aPantalla(c.d.blanco.x, 0.9, c.d.blanco.z)
          pincel.strokeStyle = 'rgba(255,236,170,0.5)'
          pincel.lineWidth = Math.max(1, W * 0.003)
          pincel.beginPath()
          pincel.moveTo(boca.x, boca.y)
          pincel.lineTo(dest.x, dest.y)
          pincel.stroke()
        }
      }
    }

    // El polvo de los que caen.
    for (const q of polvo) {
      const u = porUnidad(q.x, q.z)
      const pt = aPantalla(q.x, 0.45, q.z)
      const k2 = q.t / 0.55
      pincel.fillStyle = `rgba(206,190,166,${(1 - k2) * 0.5})`
      pincel.beginPath()
      pincel.arc(pt.x, pt.y, Math.max(1.5, u * (0.25 + k2 * 0.6)), 0, 6.2832)
      pincel.fill()
    }

    // --- que parezca una cámara ----------------------------------------------
    // Barrido, grano y bordes oscurecidos. Este es el trozo que convierte un
    // dibujo en una imagen de monitor, y el que deja bajar la resolución sin
    // que se note.
    pincel.fillStyle = patronLineas
    pincel.fillRect(0, 0, W, H)

    pincel.globalAlpha = cal.ruido + (ultimoDato > SIN_SENAL ? 0.4 : 0)
    const rx = Math.floor(Math.random() * 64)
    const ry = Math.floor(Math.random() * 64)
    pincel.translate(-rx, -ry)
    pincel.fillStyle = patronRuido
    pincel.fillRect(rx, ry, W + 64, H + 64)
    pincel.setTransform(1, 0, 0, 1, 0, 0)
    pincel.globalAlpha = 1

    if (!sombra || sombraW !== W || sombraH !== H) {
      sombra = pincel.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72)
      sombra.addColorStop(0, 'rgba(0,0,0,0)')
      sombra.addColorStop(1, 'rgba(0,0,0,0.62)')
      sombraW = W
      sombraH = H
    }
    pincel.fillStyle = sombra
    pincel.fillRect(0, 0, W, H)

    if (destello > 0) {
      pincel.fillStyle = `rgba(232,82,63,${destello * 0.28})`
      pincel.fillRect(0, 0, W, H)
    }

    // --- los rótulos de la cámara --------------------------------------------
    const cuerpo = Math.max(7, Math.round(H * 0.045))
    pincel.font = `800 ${cuerpo}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    pincel.textBaseline = 'top'
    pincel.shadowColor = 'rgba(0,0,0,0.85)'
    pincel.shadowBlur = 3
    const borde = Math.round(cuerpo * 0.6)

    // Arriba a la izquierda: el punto rojo y el nombre.
    if ((t % 1.4) < 0.85) {
      pincel.fillStyle = '#ff4030'
      pincel.beginPath()
      pincel.arc(borde + cuerpo * 0.3, borde + cuerpo * 0.45, cuerpo * 0.3, 0, 6.2832)
      pincel.fill()
    }
    pincel.fillStyle = 'rgba(240,232,220,0.92)'
    pincel.fillText('EN DIRECTO', borde + cuerpo * 0.85, borde)
    pincel.fillText(nombre.toUpperCase().slice(0, 14), borde, borde + cuerpo * 1.25)

    // Arriba a la derecha: el reloj del duelo.
    if (reloj) {
      pincel.textAlign = 'right'
      pincel.fillText(reloj, W - borde, borde)
      pincel.textAlign = 'left'
    }

    // Abajo: su vida y cuántos bichos tiene encima.
    pincel.font = `800 ${Math.round(cuerpo * 1.5)}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    pincel.fillStyle = vidaK > 0.5 ? '#bfe8cd' : vidaK > 0.25 ? '#f0d49a' : '#ffb4a8'
    pincel.textBaseline = 'bottom'
    pincel.fillText(`${Math.round(vida)}%`, borde, H - borde)
    pincel.font = `700 ${cuerpo}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    pincel.fillStyle = 'rgba(240,232,220,0.8)'
    pincel.textAlign = 'right'
    pincel.fillText(`${bichos.length} ALIENZ`, W - borde, H - borde)
    pincel.textAlign = 'left'

    // Los rótulos de lo que pasa, tipo cámara de seguridad.
    if (rotulos.length) {
      pincel.textBaseline = 'middle'
      pincel.font = `800 ${cuerpo}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
      let y = H * 0.5
      for (const r of rotulos) {
        const a = r.t < 0.2 ? r.t / 0.2 : r.t > 2 ? Math.max(0, (2.4 - r.t) / 0.4) : 1
        pincel.globalAlpha = a
        const ancho = pincel.measureText(r.texto).width
        pincel.fillStyle = 'rgba(120,16,10,0.75)'
        pincel.fillRect(W / 2 - ancho / 2 - cuerpo * 0.5, y - cuerpo * 0.85, ancho + cuerpo, cuerpo * 1.7)
        pincel.fillStyle = '#ffe6dc'
        pincel.textAlign = 'center'
        pincel.fillText(r.texto, W / 2, y)
        pincel.textAlign = 'left'
        y += cuerpo * 2.1
      }
      pincel.globalAlpha = 1
    }

    // Sin señal: la imagen se queda quieta, se llena de nieve y lo dice. Con
    // esta estética, un tropiezo de la red parece parte del juego en vez de un
    // error, que es justo lo que se quería.
    if (ultimoDato > SIN_SENAL) {
      pincel.fillStyle = 'rgba(8,10,12,0.45)'
      pincel.fillRect(0, 0, W, H)
      pincel.font = `800 ${Math.round(cuerpo * 1.2)}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
      pincel.textAlign = 'center'
      pincel.textBaseline = 'middle'
      pincel.fillStyle = '#ffd7cf'
      pincel.fillText('SIN SEÑAL', W / 2, H * 0.42)
      pincel.textAlign = 'left'
    }

    pincel.shadowBlur = 0
    pincel.textBaseline = 'alphabetic'
  }

  return {
    // Las fotos llegan cuando estén: mientras, la cámara pinta manchas.
    ponerFotos (m) { fotos = m },
    ponerNombre (n) { nombre = n || 'Rival' },
    ponerReloj (r) { reloj = r },
    datos,
    rotulo,
    tic,
    pintar,
    reiniciar () {
      bichos = []
      soldados = []
      polvo = []
      rotulos = []
      vistos = new Set()
      vida = 100
      ultimoDato = 99
      destello = 0
      acercar = null
      reloj0 = performance.now() / 1000
    },
    // Un último plano para la pantalla de resultado, a tamaño de foto y no al
    // de la ventanita. Después se repinta para dejar el lienzo como estaba.
    foto () {
      try {
        pintar({ width: 520, height: 300 })
        const d = lienzo.toDataURL('image/jpeg', 0.75)
        pintar()
        return d
      } catch { return null }
    }
  }
}
