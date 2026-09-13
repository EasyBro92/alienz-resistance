import * as THREE from 'three'
import { FIELD } from '../config.js'
import { fieldWidth } from '../world.js'

// Vida del escenario. Nada de esto toca la partida: son cosas que pasan por su
// cuenta para que el sitio no parezca una maqueta parada. Todo va por encima o
// por fuera de los carriles, para no competir con lo que el jugador tiene que
// leer.
export function createAmbient (scene) {
  const rand = (a, b) => a + Math.random() * (b - a)
  const half = fieldWidth / 2

  // --- nubes ------------------------------------------------------------------
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85
  })
  const puffGeo = new THREE.IcosahedronGeometry(1, 1)
  const clouds = []
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Group()
    const n = 3 + (Math.random() * 3 | 0)
    for (let k = 0; k < n; k++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat)
      puff.position.set(rand(-6, 6), rand(-1, 1), rand(-3, 3))
      puff.scale.set(rand(4.5, 8.5), rand(1.8, 3), rand(3, 5))
      cloud.add(puff)
    }
    // La cámara está muy picada: por encima de y≈24 a esta distancia ya no entra
    // en el encuadre. Todo el ambiente aéreo vuela bajo para que se vea.
    // Dentro del alcance de la niebla (152): más lejos se las traga entera.
    cloud.position.set(rand(-140, 140), rand(8, 13), rand(-142, -96))
    scene.add(cloud)
    clouds.push({ group: cloud, speed: rand(0.35, 0.9) })
  }

  // --- pájaros ----------------------------------------------------------------
  // Un pájaro es dos alas que baten. A esta distancia no hace falta más, y con
  // el aleteo desfasado la bandada se lee viva.
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2b2b30, side: THREE.DoubleSide })
  const wingGeo = new THREE.BufferGeometry()
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, 1.1, 0.12, -0.35, 1.0, 0, 0.4
  ]), 3))
  wingGeo.computeVertexNormals()

  function makeBird () {
    const g = new THREE.Group()
    const l = new THREE.Mesh(wingGeo, birdMat)
    const r = new THREE.Mesh(wingGeo, birdMat)
    r.scale.x = -1
    g.add(l, r)
    g.userData = { l, r, phase: Math.random() * Math.PI * 2, rate: rand(4.5, 7) }
    return g
  }

  // Bandada que cruza el cielo entera y vuelve a pasar al rato.
  const flock = new THREE.Group()
  const birds = []
  for (let i = 0; i < 9; i++) {
    const b = makeBird()
    // formación en uve
    const side = i % 2 ? 1 : -1
    const rank = Math.ceil(i / 2)
    b.position.set(side * rank * rand(1.6, 2.4), rand(-1, 1), rank * rand(1.8, 2.6))
    b.scale.setScalar(rand(0.5, 0.8))
    flock.add(b)
    birds.push(b)
  }
  scene.add(flock)
  let flockTimer = rand(3, 10)
  let flockActive = false

  function launchFlock () {
    flockActive = true
    const dir = Math.random() < 0.5 ? 1 : -1
    // Medido sobre la cámara real: la franja de cielo del encuadre corresponde a
    // y≈6-11 y z más allá de -60. Más cerca, un pájaro se ve como un manchón.
    flock.position.set(dir * -170, rand(6.5, 10.5), rand(-115, -62))
    flock.rotation.y = dir > 0 ? 0 : Math.PI
    flock.userData.speed = dir * rand(11, 17)
  }
  flock.visible = false

  // --- buitres ----------------------------------------------------------------
  // Dan vueltas sobre el campo sin irse nunca: el detalle que dice "aquí ya ha
  // muerto gente".
  const vultures = []
  for (let i = 0; i < 3; i++) {
    const v = makeBird()
    v.scale.setScalar(rand(0.9, 1.3))
    scene.add(v)
    vultures.push({
      bird: v,
      angle: Math.random() * Math.PI * 2,
      radius: rand(14, 26),
      speed: rand(0.16, 0.28),
      height: rand(6.5, 9.5),
      centerZ: rand(-72, -46)
    })
  }

  // --- lo que arrastra el viento -----------------------------------------------
  // Antes era una rodadora en todos los mapas, también en la nieve o en París.
  // Ahora cada sitio tiene lo suyo: rodadoras solo en el desierto, una pelota en
  // la playa, hojas de periódico en la ciudad, bolas de nieve en la nieve y hojas
  // secas en parques, bosques y costa. En la zona volcánica, nada.
  const VIENTO = {
    rodadora: () => new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshStandardMaterial({ color: 0xa28f4e, roughness: 1, wireframe: true })
    ),
    pelota: () => {
      const g = new THREE.Group()
      const colores = [0xe8402f, 0xf2f2ee, 0x2f7fd8, 0xf2c230]
      for (let k = 0; k < 4; k++) {
        g.add(new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 12, 10, (k / 4) * Math.PI * 2, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: colores[k], roughness: 0.5 })
        ))
      }
      return g
    },
    hojas: () => {
      const g = new THREE.Group()
      const tonos = [0xc9772e, 0xd9a13a, 0x9a4f2a, 0x7a8f3a]
      for (let k = 0; k < 7; k++) {
        const hoja = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.14),
          new THREE.MeshStandardMaterial({ color: tonos[k % 4], roughness: 0.9, side: THREE.DoubleSide })
        )
        hoja.position.set(rand(-0.6, 0.6), rand(-0.3, 0.5), rand(-0.6, 0.6))
        hoja.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
        g.add(hoja)
      }
      return g
    },
    periodico: () => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.95, side: THREE.DoubleSide })
      ))
      const tinta = new THREE.MeshBasicMaterial({ color: 0x6a6a66, side: THREE.DoubleSide })
      for (let k = 0; k < 4; k++) {
        const linea = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.03), tinta)
        linea.position.set(0, -0.15 + k * 0.1, 0.002)
        g.add(linea)
      }
      return g
    },
    bolaNieve: () => new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4, 2),
      new THREE.MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.9 })
    )
  }
  // Cómo va cada cosa: cuánto bota, cuánto pesa, a qué altura rueda, cuánto gira.
  const VUELO = {
    rodadora: { bote: [2.5, 4.5], gravedad: 16, suelo: 0.5, giro: [4, 8], velocidad: [5, 9], sombra: true },
    pelota: { bote: [4, 6], gravedad: 14, suelo: 0.42, giro: [2, 4], velocidad: [3, 6], sombra: true },
    hojas: { bote: [0.8, 1.6], gravedad: 3, suelo: 0.4, giro: [1, 3], velocidad: [4, 7], sombra: false },
    periodico: { bote: [1.2, 2.2], gravedad: 5, suelo: 0.3, giro: [3, 6], velocidad: [4, 8], sombra: false },
    bolaNieve: { bote: [0, 0.4], gravedad: 16, suelo: 0.4, giro: [3, 6], velocidad: [3, 5], sombra: true }
  }
  const cacheViento = new Map()
  let tipoViento = 'rodadora'
  const weeds = []
  for (let i = 0; i < 3; i++) weeds.push({ mesh: null, timer: rand(2, 18), active: false, vx: 0, vy: 0, spin: 0 })
  function mallaViento (tipo, i) {
    const clave = tipo + i
    if (!cacheViento.has(clave)) {
      const m = VIENTO[tipo]()
      m.visible = false
      m.traverse(o => { if (o.isMesh) o.castShadow = VUELO[tipo].sombra })
      scene.add(m)
      cacheViento.set(clave, m)
    }
    return cacheViento.get(clave)
  }

  function launchWeed (w, i) {
    if (!VIENTO[tipoViento]) return
    const v = VUELO[tipoViento]
    w.mesh = mallaViento(tipoViento, i)
    const dir = Math.random() < 0.5 ? 1 : -1
    w.mesh.position.set(dir * -(half + 9), v.suelo + 0.05, rand(FIELD.spawnZ + 4, FIELD.baseZ + 2))
    w.mesh.visible = true
    w.active = true
    w.vx = dir * rand(...v.velocidad)
    w.vy = 0
    w.spin = rand(...v.giro)
    w.mesh.scale.setScalar(rand(0.7, 1.3))
  }

  // --- polvo en el viento -----------------------------------------------------
  // Una sola malla de puntos: mil partículas costarían lo mismo que una.
  const dustCount = 90
  const dustPos = new Float32Array(dustCount * 3)
  const dustVel = []
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = rand(-40, 40)
    dustPos[i * 3 + 1] = rand(0.2, 7)
    dustPos[i * 3 + 2] = rand(FIELD.spawnZ - 10, FIELD.baseZ + 6)
    dustVel.push(rand(3, 7))
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xe8d5a8, size: 0.16, transparent: true, opacity: 0.5, depthWrite: false
  }))
  scene.add(dust)

  // --- trapos y humo ----------------------------------------------------------
  // Jirones de tela atados a los postes: se mueven con el viento y son lo único
  // del decorado del borde que no está clavado.
  const ragMat = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.95, side: THREE.DoubleSide })
  const rags = []
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1
    const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42, 4, 2), ragMat)
    rag.position.set(side * (half + 1.1), rand(0.75, 1.1), FIELD.baseZ - 3 - i * 4.4)
    rag.castShadow = true
    scene.add(rag)
    rags.push({ mesh: rag, phase: Math.random() * 6 })
  }

  // Columna de humo de un coche que sigue ardiendo al borde de la carretera.
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x6e6a66, transparent: true, opacity: 0.4, depthWrite: false })
  const smokeGeo = new THREE.SphereGeometry(0.45, 6, 5)
  const stack = []
  const stackX = (Math.random() < 0.5 ? -1 : 1) * (half + 4.5)
  const stackZ = rand(FIELD.spawnZ + 8, FIELD.baseZ - 8)
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(smokeGeo, smokeMat.clone())
    p.position.set(stackX, 0, stackZ)
    scene.add(p)
    stack.push({ mesh: p, t: i / 9 })
  }

  // ===========================================================================
  // presencia alienígena
  // ===========================================================================
  const glow = (color, intensity = 2) => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity, roughness: 0.3, metalness: 0.1
  })
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2b3540, roughness: 0.32, metalness: 0.8 })
  const hullDark = new THREE.MeshStandardMaterial({ color: 0x161c23, roughness: 0.4, metalness: 0.7 })
  const lampMat = glow(0x8dffb4, 2.6)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x8dffb4, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide
  })

  // Platillo: casco lenticular, cúpula y un anillo de luces que rota. La forma
  // se reconoce en silueta aunque esté lejos y pequeño.
  function makeSaucer (radius, withBeam) {
    const g = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -0.18), new THREE.Vector2(0.42, -0.1),
      new THREE.Vector2(1, 0), new THREE.Vector2(0.5, 0.13),
      new THREE.Vector2(0.001, 0.16)
    ].map(v => new THREE.Vector2(v.x * radius, v.y * radius)), 18), hullMat)
    g.add(hull)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow(0x6fe0ff, 1.1))
    dome.position.y = radius * 0.14
    g.add(dome)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.3, 12, 8), hullDark)
    belly.position.y = -radius * 0.16
    belly.scale.y = 0.5
    g.add(belly)

    const lamps = []
    const n = 8
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const l = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.075, 8, 6), lampMat)
      l.position.set(Math.cos(a) * radius * 0.82, -radius * 0.055, Math.sin(a) * radius * 0.82)
      g.add(l)
      lamps.push(l)
    }

    let beam = null
    if (withBeam) {
      // Haz que baja hasta el suelo. Va abierto hacia abajo y semitransparente.
      beam = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.5, 26, 14, 1, true), beamMat)
      beam.position.y = -13
      beam.visible = false
      g.add(beam)
    }
    g.userData = { lamps, beam, spin: 0 }
    return g
  }

  // Nave nodriza al fondo: enorme, lentísima, siempre ahí. Es la que sembró
  // todo esto y conviene que se vea desde la primera partida.
  const mother = makeSaucer(12, false)
  // A y=26 quedaba por encima del encuadre: la franja de cielo visible a esta
  // distancia se acaba sobre y≈14. Vale para todo lo que vuela.
  // A z=-150 caía fuera del alcance de la niebla (152) y desaparecía del todo.
  // Rasante sobre el horizonte: más arriba queda tapada por el marcador, que
  // ocupa justo la franja de cielo que hay.
  mother.position.set(-60, 6, -100)
  mother.rotation.z = 0.07
  scene.add(mother)

  // Por dónde vuelan las naves de paso en esta misión. Lo decide `vestir` con la
  // altura del decorado: antes cruzaban siempre a la misma altura y atravesaban
  // los edificios y los monumentos.
  let vueloExplorador = { z: -70, y: 4.2 }
  let alturaNodriza = 6
  let zNodriza = -100

  // Exploradores que cruzan el cielo de vez en cuando, con el haz encendido.
  const scouts = []
  for (let i = 0; i < 2; i++) {
    const s = makeSaucer(1.5 + i * 0.7, true)
    s.visible = false
    scene.add(s)
    scouts.push({ ship: s, timer: rand(6, 22), active: false, speed: 0, dir: 1 })
  }

  // A lo largo de la carretera, desde el fondo hacia la cámara. Cruzando de lado
  // a lado atravesaban edificios, colinas y monumentos; por encima del campo no
  // hay nada contra lo que chocar, y así además se ven enteros.
  function launchScout (sc) {
    sc.dir = Math.random() < 0.5 ? 1 : -1
    sc.ship.position.set(sc.dir * rand(1.5, 4), vueloExplorador.y + rand(-0.4, 0.4), -150)
    sc.ship.visible = true
    sc.active = true
    sc.speed = rand(14, 22)
    if (sc.ship.userData.beam) sc.ship.userData.beam.visible = false
  }

  // Cápsulas de siembra: caen del cielo con estela verde y revientan en el
  // horizonte. Cuentan que la infección sigue llegando, no solo caminando.
  const podMat = glow(0x9dff6e, 3)
  const pods = []
  for (let i = 0; i < 2; i++) {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), podMat)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 5, 8, 1, true), beamMat)
    tail.rotation.x = Math.PI
    tail.position.y = 2.5
    const g2 = new THREE.Group()
    g2.add(core, tail)
    g2.visible = false
    scene.add(g2)
    pods.push({ mesh: g2, timer: rand(5, 25), active: false, v: new THREE.Vector3(), flash: 0 })
  }
  const flashLight = new THREE.PointLight(0x9dff6e, 0, 90)
  scene.add(flashLight)

  function launchPod (p) {
    const x = rand(-90, 90)
    p.mesh.position.set(x, rand(38, 52), rand(-150, -105))
    p.mesh.visible = true
    p.active = true
    p.v.set(rand(-6, 6), -rand(20, 30), rand(-4, 4))
  }

  // Esporas flotando: motas verdes que suben despacio. Es el polvo del sitio,
  // pero vivo.
  const sporeCount = 70
  const sporePos = new Float32Array(sporeCount * 3)
  const sporeRise = []
  for (let i = 0; i < sporeCount; i++) {
    sporePos[i * 3] = rand(-26, 26)
    sporePos[i * 3 + 1] = rand(0, 9)
    sporePos[i * 3 + 2] = rand(FIELD.spawnZ, FIELD.baseZ + 4)
    sporeRise.push(rand(0.35, 1.1))
  }
  const sporeGeo = new THREE.BufferGeometry()
  sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3))
  const spores = new THREE.Points(sporeGeo, new THREE.PointsMaterial({
    color: 0x8dffb4, size: 0.22, transparent: true, opacity: 0.75, depthWrite: false
  }))
  scene.add(spores)

  let clock = 0

  return {
    // Al empezar cada misión: qué arrastra el viento y por dónde vuelan las naves
    // de paso. `alturaEn(zMin, zMax)` la da el mundo.
    vestir (destino = {}, alturaEn = null) {
      const { bioma, suelo, hitos = [] } = destino
      const conAvenida = hitos.some(h => h[0] === 'castellana')
      let tipo = 'hojas'
      if (suelo === 'playa') tipo = 'pelota'
      else if (conAvenida || bioma === 'ciudad' || suelo === 'losas' || suelo === 'adoquin') tipo = 'periodico'
      else if (bioma === 'desierto' || bioma === 'altiplano' || suelo === 'arena') tipo = 'rodadora'
      else if (bioma === 'taiga' || bioma === 'artico' || suelo === 'nieve') tipo = 'bolaNieve'
      else if (bioma === 'volcanico') tipo = null
      if (tipo !== tipoViento) {
        tipoViento = tipo
        for (const w of weeds) {
          if (w.mesh) w.mesh.visible = false
          w.mesh = null
          w.active = false
          w.timer = rand(2, 12)
        }
      }
      if (alturaEn) {
        // El carril con el decorado más bajo, y por encima de él. En una ciudad
        // de rascacielos eso las saca del encuadre: mejor que verlas atravesar
        // una fachada.
        // Exploradores: por encima del campo, que nunca tiene decorado, y lo
        // bastante altos para no rozar la nave que aterriza.
        vueloExplorador = { z: -70, y: Math.max(8.5, alturaEn(-150, -6, -6, 6) + 2) }
        // Nodriza: patrulla detrás entre x -40 y 40 (con sus doce de radio,
        // -52 a 52), en la franja de profundidad con el decorado más bajo. Si ni
        // así queda bajo el marcador, ese mapa se queda sin nodriza antes que
        // verla atravesar una colina.
        let mejor = null
        for (const z of [-96, -104, -112, -120]) {
          const h = alturaEn(z - 12, z + 12, -52, 52)
          if (!mejor || h < mejor.h) mejor = { z, h }
        }
        zNodriza = mejor.z
        alturaNodriza = Math.max(6, mejor.h + 3)
        mother.visible = alturaNodriza <= 11
        if (mother.position.x < -40 || mother.position.x > 40) mother.position.x = -40
        for (const sc of scouts) {
          sc.active = false
          sc.ship.visible = false
          sc.timer = rand(6, 22)
        }
      }
    },
    update (dt) {
      clock += dt

      // --- naves ---------------------------------------------------------------
      const blink = (ship, rate) => {
        const u = ship.userData
        u.spin += dt * rate
        for (let i = 0; i < u.lamps.length; i++) {
          const on = Math.sin(u.spin * 3 + i * 0.8) > 0.2
          u.lamps[i].scale.setScalar(on ? 1.25 : 0.55)
        }
        ship.rotation.y += dt * 0.25
      }

      blink(mother, 0.35)
      mother.position.x += dt * 0.55
      mother.position.y = alturaNodriza + Math.sin(clock * 0.25) * 0.5
      mother.position.z = zNodriza
      if (mother.position.x > 40) mother.position.x = -40

      for (const sc of scouts) {
        if (!sc.active) {
          sc.timer -= dt
          if (sc.timer <= 0) launchScout(sc)
          continue
        }
        blink(sc.ship, 1.2)
        sc.ship.position.z += sc.speed * dt
        sc.ship.position.y += Math.sin(clock * 1.6 + sc.speed) * 0.012
        sc.ship.rotation.x = sc.speed * 0.006
        sc.ship.rotation.z = Math.sin(clock * 0.9 + sc.speed) * 0.08
        if (sc.ship.position.z > -6) {
          sc.active = false
          sc.ship.visible = false
          sc.timer = rand(10, 30)
        }
      }

      // --- cápsulas de siembra --------------------------------------------------
      for (const p of pods) {
        if (!p.active) {
          p.timer -= dt
          if (p.timer <= 0) launchPod(p)
          continue
        }
        p.mesh.position.addScaledVector(p.v, dt)
        p.mesh.rotation.z += dt * 3
        if (p.mesh.position.y <= 0) {
          // Impacto: fogonazo verde que ilumina el fondo un instante.
          p.active = false
          p.mesh.visible = false
          p.timer = rand(14, 40)
          flashLight.position.copy(p.mesh.position).setY(3)
          flashLight.intensity = 500
        }
      }
      if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 2600)

      // --- esporas flotando -----------------------------------------------------
      const sp = sporeGeo.attributes.position.array
      for (let i = 0; i < sporeCount; i++) {
        sp[i * 3 + 1] += sporeRise[i] * dt
        sp[i * 3] += Math.sin(clock * 0.6 + i) * 0.25 * dt
        if (sp[i * 3 + 1] > 10) {
          sp[i * 3 + 1] = 0
          sp[i * 3] = rand(-26, 26)
          sp[i * 3 + 2] = rand(FIELD.spawnZ, FIELD.baseZ + 4)
        }
      }
      sporeGeo.attributes.position.needsUpdate = true

      // nubes
      for (const c of clouds) {
        c.group.position.x += c.speed * dt
        if (c.group.position.x > 150) c.group.position.x = -150
      }

      // aleteo compartido por pájaros y buitres
      const flap = b => {
        const u = b.userData
        u.phase += dt * u.rate
        const a = Math.sin(u.phase) * 0.7
        u.l.rotation.z = a
        u.r.rotation.z = -a
      }

      // bandada de paso
      if (!flockActive) {
        flockTimer -= dt
        if (flockTimer <= 0) { launchFlock(); flock.visible = true }
      } else {
        flock.position.x += flock.userData.speed * dt
        for (const b of birds) flap(b)
        if (Math.abs(flock.position.x) > 175) {
          flockActive = false
          flock.visible = false
          flockTimer = rand(8, 26)
        }
      }

      // buitres en círculo
      for (const v of vultures) {
        v.angle += v.speed * dt
        v.bird.position.set(Math.cos(v.angle) * v.radius, v.height, v.centerZ + Math.sin(v.angle) * v.radius * 0.7)
        v.bird.rotation.y = -v.angle + Math.PI / 2
        v.bird.rotation.z = 0.25
        flap(v.bird)
      }

      // lo que arrastra el viento
      weeds.forEach((w, i) => {
        if (!w.active) {
          w.timer -= dt
          if (w.timer <= 0) {
            w.timer = rand(6, 22)
            launchWeed(w, i)
          }
          return
        }
        const v = VUELO[tipoViento] ?? VUELO.rodadora
        w.vy -= v.gravedad * dt
        w.mesh.position.x += w.vx * dt
        w.mesh.position.y += w.vy * dt
        if (w.mesh.position.y < v.suelo) { w.mesh.position.y = v.suelo; w.vy = rand(...v.bote) }
        w.mesh.rotation.z -= Math.sign(w.vx) * w.spin * dt
        w.mesh.rotation.x += w.spin * 0.4 * dt
        if (Math.abs(w.mesh.position.x) > half + 11) {
          w.active = false
          w.mesh.visible = false
          w.timer = rand(6, 22)
        }
      })

      // polvo arrastrado
      const arr = dustGeo.attributes.position.array
      for (let i = 0; i < dustCount; i++) {
        arr[i * 3] += dustVel[i] * dt
        arr[i * 3 + 1] += Math.sin(performance.now() * 0.001 + i) * 0.2 * dt
        if (arr[i * 3] > 42) {
          arr[i * 3] = -42
          arr[i * 3 + 1] = rand(0.2, 7)
          arr[i * 3 + 2] = rand(FIELD.spawnZ - 10, FIELD.baseZ + 6)
        }
      }
      dustGeo.attributes.position.needsUpdate = true

      // trapos ondeando
      for (const r of rags) {
        r.phase += dt * 3.4
        r.mesh.rotation.y = Math.sin(r.phase) * 0.5
        r.mesh.rotation.z = Math.sin(r.phase * 1.7) * 0.25
      }

      // columna de humo: cada bola sube, se hincha y se desvanece en bucle
      for (const p of stack) {
        p.t += dt * 0.22
        if (p.t > 1) p.t -= 1
        p.mesh.position.y = 0.6 + p.t * 9
        p.mesh.position.x = stackX + Math.sin(p.t * 3) * 1.4 + p.t * 2.5
        p.mesh.scale.setScalar(0.5 + p.t * 2.4)
        p.mesh.material.opacity = 0.42 * (1 - p.t)
      }
    }
  }
}
