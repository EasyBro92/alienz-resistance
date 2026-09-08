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

  // --- rodadoras --------------------------------------------------------------
  // Cruzan la carretera empujadas por el viento. Ruedan de verdad y rebotan.
  const weedMat = new THREE.MeshStandardMaterial({ color: 0xa28f4e, roughness: 1, wireframe: true })
  const weedGeo = new THREE.IcosahedronGeometry(0.55, 1)
  const weeds = []
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(weedGeo, weedMat)
    m.visible = false
    m.castShadow = true
    scene.add(m)
    weeds.push({ mesh: m, timer: rand(2, 18), active: false, vx: 0, vy: 0, spin: 0 })
  }

  function launchWeed (w) {
    const dir = Math.random() < 0.5 ? 1 : -1
    w.mesh.position.set(dir * -(half + 9), 0.55, rand(FIELD.spawnZ + 4, FIELD.baseZ + 2))
    w.mesh.visible = true
    w.active = true
    w.vx = dir * rand(5, 9)
    w.vy = 0
    w.spin = rand(4, 8)
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

  // Exploradores que cruzan el cielo de vez en cuando, con el haz encendido.
  const scouts = []
  for (let i = 0; i < 2; i++) {
    const s = makeSaucer(1.5 + i * 0.7, true)
    s.visible = false
    scene.add(s)
    scouts.push({ ship: s, timer: rand(6, 22), active: false, speed: 0, dir: 1 })
  }

  function launchScout (sc) {
    sc.dir = Math.random() < 0.5 ? 1 : -1
    sc.ship.position.set(sc.dir * -120, rand(3, 5.5), rand(-88, -52))
    sc.ship.visible = true
    sc.active = true
    sc.speed = sc.dir * rand(13, 22)
    if (sc.ship.userData.beam) sc.ship.userData.beam.visible = Math.random() < 0.6
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
      mother.position.y = 6 + Math.sin(clock * 0.25) * 0.5
      if (mother.position.x > 90) mother.position.x = -90

      for (const sc of scouts) {
        if (!sc.active) {
          sc.timer -= dt
          if (sc.timer <= 0) launchScout(sc)
          continue
        }
        blink(sc.ship, 1.2)
        sc.ship.position.x += sc.speed * dt
        sc.ship.position.y += Math.sin(clock * 1.6 + sc.speed) * 0.012
        sc.ship.rotation.z = -sc.speed * 0.008
        if (Math.abs(sc.ship.position.x) > 130) {
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

      // rodadoras
      for (const w of weeds) {
        if (!w.active) {
          w.timer -= dt
          if (w.timer <= 0) launchWeed(w)
          continue
        }
        w.vy -= 16 * dt
        w.mesh.position.x += w.vx * dt
        w.mesh.position.y += w.vy * dt
        if (w.mesh.position.y < 0.5) { w.mesh.position.y = 0.5; w.vy = rand(2.5, 4.5) }  // botes
        w.mesh.rotation.z -= Math.sign(w.vx) * w.spin * dt
        w.mesh.rotation.x += w.spin * 0.4 * dt
        if (Math.abs(w.mesh.position.x) > half + 11) {
          w.active = false
          w.mesh.visible = false
          w.timer = rand(6, 22)
        }
      }

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
