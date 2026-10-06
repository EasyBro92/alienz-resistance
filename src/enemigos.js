// La baraja de enemigos.
//
// El informe de amenazas era una cuadrícula de nueve caras pequeñas y una línea
// de texto debajo al tocar una. Ahora cada huésped es una carta: su cara, su
// nombre, qué papel juega, sus números en barras y lo que hace. Se pasan
// deslizando como las páginas de un libro: la carta de arriba gira sobre su
// borde izquierdo, oscureciéndose al doblarse, y descubre la de debajo; al
// soltar, la página termina de pasar con un pequeño rebote.
//
// La carta que queda arriba cobra vida: en vez del retrato se ve la figura de
// verdad, andando y girando despacio, del mismo modelo que baja por la
// carretera. Las demás llevan su retrato fijo, que no cuesta nada.
//
// Desde el 27/09 la baraja no sabe de huéspedes: lo que pinta cada carta lo
// dice una FICHA (`fichaHuesped` aquí abajo; las de Defensas y Apoyo de la
// tienda están en tienda.js). Isidro pidió la tienda «como la baraja de
// Enemigos», y la manera de que sea igual es que sea la misma.

import * as THREE from 'three'
import { buildZombieMesh } from './assets.js'

const ROL = {
  walker: 'Fase inicial',
  runner: 'Velocista',
  armored: 'Acorazado',
  spitter: 'Ataca a distancia',
  tank: 'Coloso',
  leaper: 'Salta barreras',
  bloater: 'Explosivo',
  healer: 'Sanadora',
  burrower: 'Excavador'
}

const hex = n => '#' + n.toString(16).padStart(6, '0')

// Lo que tiene de especial, en etiquetas cortas.
function dones (spec) {
  const d = []
  if (spec.armor) d.push(`Blindaje ${Math.round(spec.armor * 100)} %`)
  if (spec.rangedAttack) d.push(`Ataca a ${spec.rangedAttack} m`)
  if (spec.salta) d.push('Salta barreras')
  if (spec.revienta) d.push(`Estalla: ${spec.revienta.daño} de daño`)
  if (spec.injerta) d.push(`Cura ${spec.injerta.cura} cada ${spec.injerta.cada} s`)
  if (spec.escarba) d.push('Sale por detrás')
  if (spec.wide) d.push('Muy ancho')
  return d
}

// Solo lo fundido por `bake` es propio de la figura; lo demás es caché común.
function soltar (raiz) {
  raiz.traverse(o => { if (o.isMesh && o.userData.fundida) o.geometry.dispose() })
}

// La ficha de un huésped: lo que la baraja de Enemigos ha pintado siempre.
function fichaHuesped (zombies, textos, claves) {
  const specs = claves.map(k => zombies[k])
  const max = {
    hp: Math.max(...specs.map(s => s.hp)),
    speed: Math.max(...specs.map(s => s.speed)),
    damage: Math.max(...specs.map(s => s.damage)),
    coins: Math.max(...specs.map(s => s.coins))
  }
  let fase = 0
  return {
    specs: zombies,
    etiqueta: 'Huésped',
    tinte: (clave, spec) => spec.color,
    rol: clave => ROL[clave] ?? '',
    barras: (clave, spec) => [
      ['Vida', spec.hp, max.hp, spec.hp],
      ['Velocidad', spec.speed, max.speed, spec.speed],
      ['Daño', spec.damage, max.damage, spec.damage],
      ['Botín', spec.coins, max.coins, spec.coins]
    ],
    texto: clave => textos[clave] ?? '',
    dones,
    pieTexto: (k, N) => k < N - 1 ? 'Desliza la carta hacia la izquierda para pasar la página.' : 'Última forma confirmada. Desliza a la derecha para volver.',
    async construir (clave, spec) {
      const malla = await buildZombieMesh(clave, spec)
      // Al tamaño de un soldado, como en los retratos: el Coloso no se sale.
      malla.scale.multiplyScalar(1 / (spec.scale ?? 1))
      fase = 0
      return malla
    },
    animar (figura, dt, t, spec, alturaBase) {
      fase += dt * 5.2 * Math.min(1.8, Math.max(0.6, spec.speed / 3.4))
      // El mismo paso que en la carretera (ver zombie.js), andando en el sitio.
      const swing = Math.sin(fase)
      const lag = Math.sin(fase - 0.7)
      const limbs = figura.userData.limbs
      if (limbs) {
        limbs.legL.rotation.x = swing * 0.6
        limbs.legR.rotation.x = -swing * 0.6
        limbs.legL.userData.lower.rotation.x = limbs.legL.userData.restBend - Math.max(0, -lag) * 0.7
        limbs.legR.userData.lower.rotation.x = limbs.legR.userData.restBend - Math.max(0, lag) * 0.7
        limbs.armL.rotation.x = 1.32 + swing * 0.1
        limbs.armR.rotation.x = 1.2 - swing * 0.1
        limbs.armL.userData.lower.rotation.x = limbs.armL.userData.restBend + swing * 0.12
        limbs.armR.userData.lower.rotation.x = limbs.armR.userData.restBend - swing * 0.12
      }
      if (figura.userData.lean) figura.userData.lean.rotation.z = swing * 0.07
      // De cara, girando despacio a un lado y a otro para enseñar el perfil.
      figura.rotation.y = Math.PI + Math.sin(t * 0.55) * 0.75
      figura.position.y = alturaBase + Math.abs(swing) * 0.025
    }
  }
}

export function crearBaraja ({ contenedor, pie, capa, claves, zombies, textos, ficha = null }) {
  const F = ficha ?? fichaHuesped(zombies, textos, claves)

  contenedor.innerHTML = ''
  const pila = document.createElement('div')
  pila.className = 'baraja-pila'
  contenedor.appendChild(pila)

  // --- las cartas ---
  const cartas = claves.map((clave, i) => {
    const spec = F.specs[clave]
    const el = document.createElement('article')
    el.className = 'carta'
    el.style.setProperty('--a-tinte', hex(F.tinte(clave, spec) ?? 0x8fbf5a))
    // Una barra sin tope (un apoyo que no hace daño) sale vacía y con un guion.
    const barra = (nombre, valor, tope, texto) =>
      `<li><span>${nombre}</span><b class="barra"><i style="--v:${tope ? Math.max(6, Math.round((valor / tope) * 100)) : 0}%"></i></b><em>${texto}</em></li>`
    el.innerHTML = `
      <div class="carta-marco">
        <header class="carta-cab"><span>${String(i + 1).padStart(2, '0')} / ${String(claves.length).padStart(2, '0')}</span><span>${F.etiqueta}</span></header>
        <div class="carta-ventana">
          <div class="carta-halo"></div>
          ${F.icono?.(clave) ?? ''}
          <img class="carta-cara" alt="${spec.name}" hidden>
          ${F.insignia?.(clave) ?? ''}
        </div>
        <h3 class="carta-nombre">${spec.name}</h3>
        <p class="carta-rol">${F.rol(clave, spec)}</p>
        <ul class="carta-stats">
          ${F.barras(clave, spec).map(b => barra(...b)).join('')}
        </ul>
        <p class="carta-texto">${F.texto(clave, spec)}</p>
        <div class="carta-dones">${F.dones(spec, clave).map(t => `<span>${t}</span>`).join('')}</div>
        ${F.pie ? '<div class="carta-pie"></div>' : ''}
        <div class="carta-brillo"></div>
      </div>
      <div class="carta-sombra"></div>`
    pila.appendChild(el)
    return {
      clave,
      el,
      cara: el.querySelector('.carta-cara'),
      ventana: el.querySelector('.carta-ventana'),
      sombra: el.querySelector('.carta-sombra'),
      pie: el.querySelector('.carta-pie')
    }
  })
  const N = cartas.length

  // --- mandos: flechas y puntos ---
  const mandos = document.createElement('div')
  mandos.className = 'baraja-mandos'
  const flecha = (dir, etiqueta) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'baraja-flecha'
    b.setAttribute('aria-label', etiqueta)
    b.innerHTML = dir < 0
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
    b.addEventListener('click', () => ir(Math.round(objetivo) + dir))
    return b
  }
  const puntos = document.createElement('div')
  puntos.className = 'baraja-puntos'
  const botonesPunto = cartas.map((c, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('aria-label', F.specs[c.clave].name)
    b.addEventListener('click', () => ir(i))
    puntos.appendChild(b)
    return b
  })
  const anterior = flecha(-1, 'Carta anterior')
  const siguiente = flecha(1, 'Carta siguiente')
  mandos.append(anterior, puntos, siguiente)
  contenedor.appendChild(mandos)

  // --- la física de la página ---
  // `pos` es la carta de arriba con decimales: 2,4 es la tercera carta a medio
  // pasar. Un muelle lleva `pos` hasta `objetivo`, algo por debajo del
  // amortiguamiento crítico para que la página rebote un pelo al asentarse.
  let pos = 0
  let objetivo = 0
  let vel = 0
  let bucleMuelle = 0
  let activa = -1

  function pintar () {
    for (let i = 0; i < N; i++) {
      const c = cartas[i]
      const rel = i - pos
      const s = c.el.style
      if (rel <= -1 || rel >= 3.2) {
        s.visibility = 'hidden'
        continue
      }
      s.visibility = 'visible'
      if (rel <= 0) {
        // La página que se pasa: gira sobre su borde izquierdo y se oscurece al
        // doblarse; pasados los noventa grados ya no se ve.
        const angulo = rel * 118
        s.transformOrigin = 'left center'
        s.transform = `translateZ(${-rel * 30}px) rotateY(${angulo}deg)`
        s.zIndex = 300
        s.opacity = rel < -0.82 ? String(Math.max(0, (1 + rel) / 0.18)) : '1'
        s.filter = ''
        c.sombra.style.opacity = String(Math.min(0.7, -rel * 1.1))
        c.sombra.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.75))'
      } else {
        // Las de debajo, apiladas con un leve abanico: se ve que es un mazo.
        const r = Math.min(rel, 2.4)
        const abanico = (i % 2 ? 1 : -1) * r * 1.6
        s.transformOrigin = 'center center'
        s.transform = `translate3d(0, ${r * 11}px, ${-r * 50}px) rotateZ(${abanico}deg) scale(${1 - r * 0.045})`
        s.zIndex = String(200 - Math.round(rel * 20))
        s.opacity = rel > 2.2 ? String(Math.max(0, (3.2 - rel))) : '1'
        s.filter = `brightness(${1 - Math.min(0.45, r * 0.22)})`
        c.sombra.style.opacity = '0'
      }
    }
    const k = Math.round(pos)
    botonesPunto.forEach((b, i) => b.classList.toggle('activo', i === k))
    anterior.disabled = k <= 0
    siguiente.disabled = k >= N - 1
  }

  function muelle (ahora) {
    const dt = Math.min(0.05, (ahora - (muelle.ultimo ?? ahora)) / 1000) || 1 / 60
    muelle.ultimo = ahora
    const K = 95
    const C = 2 * Math.sqrt(K) * 0.78
    vel += ((objetivo - pos) * K - vel * C) * dt
    pos += vel * dt
    pintar()
    if (Math.abs(objetivo - pos) < 0.002 && Math.abs(vel) < 0.01) {
      pos = objetivo
      vel = 0
      pintar()
      bucleMuelle = 0
      muelle.ultimo = undefined
      asentar()
      return
    }
    bucleMuelle = requestAnimationFrame(muelle)
  }

  // La carta de destino se activa en cuanto se elige, no al terminar de pasar la
  // página: sus barras se llenan y su figura aparece mientras gira la anterior.
  // Y un seguro por temporizador: sin fotogramas (pestaña en segundo plano, un
  // móvil que los recorta) el muelle no avanza, y la baraja se quedaba a medio
  // pasar con la carta de antes marcada como activa.
  let seguro = 0
  function ir (i) {
    objetivo = Math.max(0, Math.min(N - 1, i))
    asentar(objetivo)
    if (!bucleMuelle) bucleMuelle = requestAnimationFrame(muelle)
    clearTimeout(seguro)
    seguro = setTimeout(() => {
      if (arrastre) return
      cancelAnimationFrame(bucleMuelle)
      bucleMuelle = 0
      muelle.ultimo = undefined
      pos = objetivo
      vel = 0
      pintar()
    }, 1400)
  }

  function asentar (k = Math.round(pos)) {
    if (k === activa) return
    activa = k
    cartas.forEach((c, i) => c.el.classList.toggle('activa', i === k))
    if (pie && F.pieTexto) pie.textContent = F.pieTexto(k, N)
    mostrarVivo(cartas[k])
  }

  // --- el dedo ---
  let arrastre = null
  pila.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return
    cancelAnimationFrame(bucleMuelle)
    clearTimeout(seguro)
    bucleMuelle = 0
    muelle.ultimo = undefined
    arrastre = { x0: e.clientX, y0: e.clientY, pos0: pos, id: e.pointerId, historia: [[performance.now(), pos]], horizontal: null, blanco: e.target }
  })
  pila.addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return
    const dx = e.clientX - arrastre.x0
    const dy = e.clientY - arrastre.y0
    // Hasta saber si el gesto es horizontal no se roba el desplazamiento de la
    // pantalla: hacia arriba o abajo tiene que seguir haciendo scroll.
    if (arrastre.horizontal === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      arrastre.horizontal = Math.abs(dx) > Math.abs(dy)
      if (arrastre.horizontal) { try { pila.setPointerCapture(e.pointerId) } catch { /* sigue igual */ } }
    }
    if (!arrastre.horizontal) return
    const ancho = cartas[0].el.clientWidth || 280
    let p = arrastre.pos0 - dx / (ancho * 0.9)
    // Goma en los extremos: se deja estirar un poco pero vuelve.
    if (p < 0) p *= 0.3
    if (p > N - 1) p = N - 1 + (p - (N - 1)) * 0.3
    pos = p
    arrastre.historia.push([performance.now(), pos])
    if (arrastre.historia.length > 6) arrastre.historia.shift()
    pintar()
  })
  const soltarDedo = e => {
    if (!arrastre || e.pointerId !== arrastre.id) return
    const h = arrastre.historia
    const [t0, p0] = h[0]
    const [t1, p1] = h[h.length - 1]
    const v = t1 > t0 ? ((p1 - p0) / (t1 - t0)) * 1000 : 0
    const eraHorizontal = arrastre.horizontal
    // Un toque es soltar sin haber movido el dedo: ni pasar página ni scroll.
    const toque = arrastre.horizontal === null && e.type === 'pointerup' ? arrastre.blanco : null
    arrastre = null
    if (!eraHorizontal) {
      ir(Math.round(pos))
      // Tocar la figura de la carta de arriba (en la tienda: chico o chica).
      // La ficha hace lo suyo y, si no dice que no, la figura se rehace.
      const carta = cartas[activa]
      if (toque && F.alTocar && carta?.ventana.contains(toque) && F.alTocar(carta.clave, carta) !== false) {
        claveViva = null
        mostrarVivo(carta)
      }
      return
    }
    // Un golpe rápido pasa la página aunque no se haya arrastrado hasta la mitad.
    let destino = Math.round(pos)
    if (Math.abs(v) > 1.2) destino = v > 0 ? Math.floor(pos) + 1 : Math.ceil(pos) - 1
    vel = v
    ir(destino)
  }
  pila.addEventListener('pointerup', soltarDedo)
  pila.addEventListener('pointercancel', soltarDedo)
  window.addEventListener('keydown', e => {
    if (capa?.classList.contains('hidden')) return
    // En la tienda hay dos barajas en la misma capa: solo manda la que se ve.
    if (!contenedor.isConnected || !contenedor.offsetWidth) return
    if (e.key === 'ArrowRight') ir(Math.round(objetivo) + 1)
    if (e.key === 'ArrowLeft') ir(Math.round(objetivo) - 1)
  })

  // --- la carta viva ---
  let renderer = null
  let lienzo = null
  let escena = null
  let camara = null
  let contraluz = null
  let figura = null
  let claveViva = null
  let turnoCarga = 0

  function prepararVivo () {
    if (renderer) return true
    lienzo = document.createElement('canvas')
    lienzo.className = 'carta-vivo'
    try {
      renderer = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      renderer = null
      return false
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    escena = new THREE.Scene()
    // La misma luz que los retratos, más un contraluz del color de la carta.
    const key = new THREE.DirectionalLight(0xfff4e2, 2.6)
    key.position.set(-2.2, 3.4, 3.2)
    const fill = new THREE.DirectionalLight(0xbcd6ff, 0.85)
    fill.position.set(3.4, 1.2, 2.2)
    contraluz = new THREE.DirectionalLight(0xcfe4ff, 2.2)
    contraluz.position.set(1.6, 2.6, -3.4)
    escena.add(key, fill, contraluz, new THREE.HemisphereLight(0xcfe0ff, 0x6a5c48, 0.7))
    camara = new THREE.PerspectiveCamera(26, 4 / 5, 0.1, 40)
    camara.position.set(0, 1.45, 3.9)
    camara.lookAt(0, 0.95, 0)
    return true
  }

  async function mostrarVivo (carta) {
    if (!prepararVivo()) return
    for (const c of cartas) c.el.classList.remove('vivo')
    carta.ventana.appendChild(lienzo)
    if (claveViva === carta.clave && figura) {
      carta.el.classList.add('vivo')
      return
    }
    const turno = ++turnoCarga
    const spec = F.specs[carta.clave]
    let malla
    try {
      malla = await F.construir(carta.clave, spec)
    } catch {
      return
    }
    // Lo que no tiene figura (el Recolector) se queda con su icono.
    if (!malla) return
    if (turno !== turnoCarga) { soltar(malla); return }
    if (figura) { escena.remove(figura); soltar(figura) }
    figura = malla
    // Se encuadra en cuanto tenga su pose de verdad: las piezas que se añaden
    // por código (el taladro del Escarbador, la jeringa, el saco) no están
    // colocadas hasta el primer fotograma, y con la cámara fija se salían.
    encuadre = 0
    claveViva = carta.clave
    escena.add(malla)
    contraluz.color.setHex(F.tinte(carta.clave, spec) ?? 0xffffff).lerp(new THREE.Color(0xffffff), 0.35)
    if (cartas[activa] === carta) carta.el.classList.add('vivo')
  }

  let bucleVivo = 0
  let ultimoVivo = 0
  // Cuántos fotogramas lleva la figura de arriba; a los pocos se mide y se
  // ajusta para que quepa entera en la carta. -1 = ya encuadrada.
  let encuadre = -1
  // A qué altura queda la figura ya encuadrada; el paso sube y baja sobre ella.
  let alturaBase = 0
  const cajaFigura = new THREE.Box3()
  function encuadrar () {
    figura.updateMatrixWorld(true)
    cajaFigura.setFromObject(figura)
    const alto = cajaFigura.max.y - cajaFigura.min.y
    const dx = cajaFigura.max.x - cajaFigura.min.x
    const dz = cajaFigura.max.z - cajaFigura.min.z
    // Lo que da la vuelta entera (las fichas de la tienda) tiene que caber de
    // cualquier lado: se mide por la diagonal, o al girar se salía de la carta.
    const ancho = F.giraEntero ? Math.hypot(dx, dz) : Math.max(dx, dz * 0.6)
    if (!isFinite(alto) || alto <= 0) return
    // Lo que se ve a la distancia de la cámara, con un margen.
    const visibleAlto = 2 * Math.tan((camara.fov * Math.PI / 180) / 2) * camara.position.z
    // Plano medio (los soldados de la tienda): de la cabeza a medio muslo. De
    // cuerpo entero la cabeza son veinte píxeles y la cara no se ve; así se le
    // ve la cara y el equipo, y las piernas se salen por abajo. `plano` es la
    // parte de la persona que entra, y la persona mide 1,7 por su escala.
    if (F.plano) {
      // Cuánta persona entra depende de la FORMA de la ventana, que no es fija:
      // la carta reparte su alto y, cuanto más texto lleva debajo, más baja y
      // apaisada queda la ventana. Con la misma porción en todas, en las
      // apaisadas la figura era una miniatura en medio de un hueco (Isidro: «las
      // imágenes de la tienda no acaban de estar bien cuadradas»). Ahora en una
      // ventana apaisada se acerca —de la cabeza a la cintura— y la figura ocupa
      // de ancho más o menos lo mismo en todas las cartas.
      const porcion = Math.max(0.28, Math.min(F.plano, 0.64 / camara.aspect))
      const escala = (visibleAlto * 0.86) / (1.7 * porcion)
      figura.scale.multiplyScalar(escala / figura.scale.y)
      figura.updateMatrixWorld(true)
      // La cabeza arriba, medida de verdad (casco, pelo o capucha: cada una llega
      // a una altura), con un dedo de aire. Sin cabeza suelta, por la coronilla.
      const cabeza = figura.getObjectByName('cabeza')
      const tope = cabeza ? cajaFigura.setFromObject(cabeza).max.y - figura.position.y : 1.7 * escala
      figura.position.y = 0.95 + visibleAlto * 0.44 - tope
      return
    }
    // Los huéspedes solo se encogen; lo de la tienda (una granada, una mina)
    // también crece, o se quedaba en un punto en medio de la carta.
    const k = Math.min(F.crecer ? Infinity : 1, (visibleAlto * 0.86) / alto, (visibleAlto * camara.aspect * 0.86) / Math.max(ancho, 1e-3))
    figura.scale.multiplyScalar(k)
    figura.updateMatrixWorld(true)
    cajaFigura.setFromObject(figura)
    // Centrado en el punto al que mira la cámara.
    figura.position.y -= (cajaFigura.min.y + cajaFigura.max.y) / 2 - 0.95
  }
  function dibujarVivo (ahora) {
    bucleVivo = requestAnimationFrame(dibujarVivo)
    if (!renderer || !figura) return
    const dt = Math.min(0.05, (ahora - (ultimoVivo || ahora)) / 1000)
    ultimoVivo = ahora
    const w = lienzo.clientWidth
    const h = lienzo.clientHeight
    if (!w || !h) return
    if (lienzo.width !== Math.round(w * renderer.getPixelRatio()) || lienzo.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false)
      camara.aspect = w / h
      camara.updateProjectionMatrix()
    }
    const spec = F.specs[claveViva]
    const t = ahora / 1000
    if (encuadre >= 0) {
      // Hasta encuadrarla, sin el vaivén: se mide la figura quieta.
      F.animar(figura, dt, t, spec, 0)
      if (++encuadre > 4) { encuadrar(); encuadre = -1; alturaBase = figura.position.y }
    } else {
      F.animar(figura, dt, t, spec, alturaBase)
    }
    renderer.render(escena, camara)
  }

  function revisar () {
    const visible = capa && !capa.classList.contains('hidden') && !document.hidden
    if (visible && !bucleVivo) {
      ultimoVivo = 0
      bucleVivo = requestAnimationFrame(dibujarVivo)
      if (activa >= 0) mostrarVivo(cartas[activa])
    } else if (!visible && bucleVivo) {
      cancelAnimationFrame(bucleVivo)
      bucleVivo = 0
    }
  }
  if (capa) new MutationObserver(revisar).observe(capa, { attributes: true, attributeFilter: ['class'] })
  document.addEventListener('visibilitychange', revisar)

  pintar()
  asentar()
  revisar()

  return {
    // El pie de cada carta (en la tienda: el precio y el botón de comprar). Se
    // repinta sin rehacer la baraja, que se quedaría sin su sitio y sin su
    // figura cada vez que se compra algo.
    ponerPies (html) {
      for (const c of cartas) if (c.pie) c.pie.innerHTML = html(c.clave)
    },
    ponerCaras (caras) {
      for (const c of cartas) {
        const url = caras?.get(c.clave)
        if (!url) continue
        c.cara.src = url
        c.cara.hidden = false
      }
    },
    ir,
    estado: () => ({ pos, objetivo, vel, activa, bucleMuelle, arrastrando: !!arrastre })
  }
}
