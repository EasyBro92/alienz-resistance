import * as THREE from 'three'
import { ECONOMY, FIELD } from '../config.js'
import { MONEDAS_POR_BILLETE } from './cartera.js'

// Moneda acuñada: canto biselado, cara hundida y una estrella en relieve. Oro
// pulido de verdad (metalness 1, rugosidad muy baja) para que el entorno de
// iluminación le saque destellos al girar.
// La moneda: oro con algo de luz propia, pero SIN resplandor.
//
// Sin emisión quedaba parda sobre el asfalto a mediodía y había que buscarla,
// así que se le dio luz propia. Pero se le dio de más: a 1,1 y metida en el
// pase de halo, en calidad alta cada moneda era una bombilla y parecía
// fluorescente. Se queda en 0,42 —suficiente para que el oro se lea como oro y
// no como barro— y fuera del halo, que es para lo que de verdad es luz: la
// espora, los fogonazos, las balizas.
const COIN_MAT = new THREE.MeshStandardMaterial({
  color: 0xffd75e, roughness: 0.1, metalness: 1,
  emissive: 0xffbb22, emissiveIntensity: 0.42
})
const COIN_RIM = new THREE.MeshStandardMaterial({
  color: 0xf0b62c, roughness: 0.18, metalness: 1,
  emissive: 0xc98a12, emissiveIntensity: 0.3
})

function buildCoinGeometry () {
  // Perfil de la moneda girado sobre su eje: canto redondeado, no un cilindro.
  const pts = []
  pts.push(new THREE.Vector2(0, 0.05))
  pts.push(new THREE.Vector2(0.2, 0.055))
  pts.push(new THREE.Vector2(0.26, 0.042))
  pts.push(new THREE.Vector2(0.3, 0.055))
  pts.push(new THREE.Vector2(0.325, 0.03))
  pts.push(new THREE.Vector2(0.33, 0))
  pts.push(new THREE.Vector2(0.325, -0.03))
  pts.push(new THREE.Vector2(0.3, -0.055))
  pts.push(new THREE.Vector2(0.26, -0.042))
  pts.push(new THREE.Vector2(0.2, -0.055))
  pts.push(new THREE.Vector2(0, -0.05))
  return new THREE.LatheGeometry(pts, 28)
}

const COIN_GEO = buildCoinGeometry()
const STAR_GEO = new THREE.CylinderGeometry(0.13, 0.1, 0.025, 5)

// Las monedas caen al suelo y hay que tocarlas. La mejora "Recolector" las cobra
// solas: la comodidad se compra, no se regala.
export function createEconomy (scene) {
  const pickups = []
  let coins = ECONOMY.startCoins
  // Monedas COBRADAS en esta partida, para soltar un billete cada 30. Solo
  // cuentan las que se recogen de un huésped abatido: el goteo gratis no, porque
  // un billete tiene que costar jugar, no esperar.
  let ganadas = 0
  const alBillete = new Set()
  let dripTimer = ECONOMY.dripEvery
  let auto = ECONOMY.autoCollect
  const listeners = new Set()

  const notify = () => listeners.forEach(fn => fn(coins))

  function spawnCoin (position, value) {
    const mesh = new THREE.Group()
    const disc = new THREE.Mesh(COIN_GEO, COIN_MAT)
    disc.castShadow = true
    mesh.add(disc)
    for (const side of [1, -1]) {
      const star = new THREE.Mesh(STAR_GEO, COIN_RIM)
      star.position.y = side * 0.055
      star.rotation.y = 0.3
      mesh.add(star)
    }
    mesh.position.copy(position)
    mesh.position.y = 1.4
    // Inclinada, nunca plana: así el destello barre la cara al girar en vez de
    // quedarse quieto.
    mesh.rotation.x = 0.42
    mesh.rotation.z = (Math.random() - 0.5) * 0.4
    mesh.scale.setScalar(0.8 + Math.min(value, 60) / 90)
    scene.add(mesh)
    pickups.push({ mesh, value, life: ECONOMY.pickupLifetime, vy: 2.6, spin: 2.4 + Math.random() * 1.8, landed: false })
  }

  return {
    pickups,
    get coins () { return coins },
    get autoCollect () { return auto },
    enableAutoCollect () { auto = true },

    // Empezar de cero de verdad. Sin esto, una segunda partida arrancaba con la
    // biomasa de la anterior, con sus monedas todavía tiradas por el asfalto y
    // con el Recolector ya comprado. Hoy no se ve porque reintentar recarga la
    // página, pero es una trampa esperando a que alguien ponga un "otra vez".
    reset () {
      for (const p of pickups) scene.remove(p.mesh)
      pickups.length = 0
      coins = ECONOMY.startCoins
      ganadas = 0
      dripTimer = ECONOMY.dripEvery
      auto = ECONOMY.autoCollect
      notify()
    },
    onChange (fn) { listeners.add(fn); fn(coins) },
    // Un billete cada 30 monedas cobradas. Lo escucha el juego para guardarlo.
    onBillete (fn) { alBillete.add(fn) },

    canAfford: cost => coins >= cost,
    spend (cost) {
      if (coins < cost) return false
      coins -= cost
      notify()
      return true
    },
    add (value) { coins += value; notify() },

    drop (position, value) { spawnCoin(position, value) },

    collect (pickup) {
      const i = pickups.indexOf(pickup)
      if (i < 0) return 0
      pickups.splice(i, 1)
      scene.remove(pickup.mesh)
      coins += pickup.value
      ganadas += pickup.value
      while (ganadas >= MONEDAS_POR_BILLETE) {
        ganadas -= MONEDAS_POR_BILLETE
        for (const fn of alBillete) fn()
      }
      notify()
      return pickup.value
    },

    update (dt) {
      dripTimer -= dt
      if (dripTimer <= 0) {
        dripTimer += ECONOMY.dripEvery
        coins += ECONOMY.dripValue
        notify()
        return ECONOMY.dripValue
      }
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]
        p.t = (p.t ?? Math.random() * 6) + dt
        if (!p.landed) {
          p.vy -= 9.5 * dt
          p.mesh.position.y += p.vy * dt
          if (p.mesh.position.y <= 0.22) { p.mesh.position.y = 0.22; p.landed = true }
        } else {
          // Flota y cabecea: una moneda quieta en el suelo no pide que la cojas.
          p.mesh.position.y = 0.26 + Math.sin(p.t * 2.6) * 0.06
          p.mesh.rotation.x = 0.42 + Math.sin(p.t * 1.7) * 0.12
        }
        p.mesh.rotation.y += p.spin * dt
        p.life -= dt
        if (p.life < 2.5) p.mesh.visible = Math.floor(p.life * 6) % 2 === 0
        // --- el imán del Recolector ------------------------------------------
        //
        // Antes la moneda desaparecía en el sitio en cuanto tocaba el suelo: el
        // número subía y no se veía por qué. Se pagaban doscientas cincuenta por
        // una mejora cuyo único efecto visible era que las monedas dejaban de
        // estar. Ahora salen DISPARADAS hacia la línea, que es lo que hace un
        // imán y lo que se entiende sin leer nada.
        //
        // Acelera en vez de ir a velocidad fija: arranca despacio, como si le
        // costara despegarla del asfalto, y llega lanzada. A velocidad
        // constante parece que la moneda anda, no que tira de ella algo.
        if (auto && p.landed) p.imantada = true
        if (p.imantada) {
          p.vel = Math.min(26, (p.vel ?? 2) + 34 * dt)
          const dx = 0 - p.mesh.position.x
          const dz = FIELD.baseZ - p.mesh.position.z
          const d = Math.hypot(dx, dz)
          if (d < 0.5) { this.collect(p); continue }
          const paso = Math.min(d, p.vel * dt)
          p.mesh.position.x += (dx / d) * paso
          p.mesh.position.z += (dz / d) * paso
          // Se levanta del suelo al venir y gira más rápido cuanto más corre.
          p.mesh.position.y = 0.26 + Math.min(0.5, p.vel * 0.02)
          p.mesh.rotation.y += p.vel * 0.12 * dt
          // Mientras vuela no caduca: una moneda que se apaga a medio camino
          // hacia ti es peor que no haberla imantado.
          p.life = Math.max(p.life, 3)
          continue
        }
        if (p.life <= 0) { pickups.splice(i, 1); scene.remove(p.mesh) }
      }
      return 0
    }
  }
}
