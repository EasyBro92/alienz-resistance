// El soldado del mapa de PRUEBA (29/09/2026): el de Quaternius (Toon Shooter
// Game Kit, CC0), con sus propias animaciones, en vez del de Meshy con los
// brazos movidos por código.
//
// Tiene la MISMA cara que devuelve `createSoldier` (px, pz, andando, destX,
// targetPos, hurt, upgrade, update…), así `main.js` de la Guerra civil lo
// mueve, lo apunta y lo mata sin saber cuál de los dos es. Lo que cambia es
// cómo se anima: aquí no hay mandos ni huesos a mano, se elige clip —quieto,
// andar, correr, disparar, morir— y se funde con el anterior.
//
// El archivo trae las trece armas del kit colgadas de la mano; cada tipo de
// soldado enseña la suya (`ARMA`) y esconde las demás.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as clonarConHuesos } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { createHealthBar } from '../entities/healthbar.js'

const ARMA = {
  archer: 'Revolver_Small', rifle: 'AK', shotgun: 'Shotgun', sniper: 'Sniper',
  flamer: 'ShortCannon', gunner: 'SMG', misil: 'RocketLauncher', mortar: 'GrenadeLauncher',
  capitan: 'Revolver'
}
// Los materiales del uniforme del kit: son los que se tiñen del bando.
const UNIFORME = new Set(['Character_Main', 'Pants', 'Grey', 'Grey2', 'LightGrey'])
const TODAS = ['AK', 'GrenadeLauncher', 'Knife_1', 'Knife_2', 'Pistol', 'Revolver', 'Revolver_Small',
  'RocketLauncher', 'ShortCannon', 'Shotgun', 'Shovel', 'SMG', 'Sniper', 'Sniper_2']

// El soldado del kit mide unas 2,4 de alto; los del juego, 1,7.
// Un poco más grande que la talla de verdad: desde la cámara de juego se
// quedaban en muñequitos al lado de los coches.
const ESCALA = 0.88
const PASO = 3.2
const VELOCIDAD = { correr: 1.7, trote: 1.15, agachado: 0.75, gatear: 0.42 }

let molde = null
export function cargarSoldadoPrueba () {
  molde ??= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/prueba-soldado.glb`)
  return molde
}

let siguienteId = 500000

export async function crearSoldadoPrueba (key, spec) {
  const gltf = await cargarSoldadoPrueba()
  const figura = clonarConHuesos(gltf.scene)
  figura.scale.setScalar(ESCALA)
  // El kit mira hacia +Z; en el juego «de frente» es -Z.
  figura.rotation.y = Math.PI
  const suya = ARMA[key] ?? 'AK'
  figura.traverse(o => {
    if (TODAS.includes(o.name)) o.visible = o.name === suya
    if (!o.isMesh) return
    o.castShadow = true
    o.frustumCulled = false
    // El color del bando, solo en el uniforme y fuerte; piel, botas, correas y
    // arma con el suyo. Con todo teñido a medias salían celestes y blancos.
    o.material = o.material.clone()
    o.material.userData.tinte = UNIFORME.has(o.material.name) ? 0.8 : 0
  })

  const mesh = new THREE.Group()
  mesh.add(figura)
  // De dónde salen las trazas: delante del pecho, a la altura del arma. Lo lee
  // `muzzleWorld` como el fogonazo de los soldados de siempre.
  const boca = new THREE.Object3D()
  boca.position.set(0.18, 1.12, -0.7)
  mesh.add(boca)
  mesh.userData.flash = boca

  const bar = createHealthBar(1.4, 2.2)
  mesh.add(bar.group)

  const mixer = new THREE.AnimationMixer(figura)
  const clips = Object.fromEntries(gltf.animations.map(c => [c.name, mixer.clipAction(c)]))
  let actual = null
  function poner (nombre, fundido = 0.2) {
    const a = clips[nombre]
    if (!a || a === actual) return
    a.reset().play()
    if (nombre === 'Death') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true }
    if (actual) actual.crossFadeTo(a, fundido, false)
    actual = a
  }
  poner('Idle', 0)

  const s = {
    id: siguienteId++,
    kind: 'soldier',
    key,
    spec,
    mesh,
    bar,
    hp: spec.hp,
    maxHp: spec.hp,
    level: 1,
    cooldown: Math.random() * 0.4,
    dead: false,
    px: 0,
    pz: 0,
    destX: 0,
    destZ: 0,
    andando: false,
    entrando: false,
    modoPaso: 'trote',
    targetPos: null,
    hasTarget: false,
    aim: 0,
    aimYaw: 0,
    wantYaw: 0,
    yawReposo: 0,
    ritmo: 0.9 + Math.random() * 0.2,
    animo: 1,
    shotsLeft: spec.magazine ?? 8,
    reloading: 0,
    spawnT: 1,
    // Sabe hacer su animación de morir: main.js lo deja caer en vez de quitarlo.
    animaMuerte: true,
    hundir: 0,

    get canShoot () { return !this.andando },
    get busy () { return this.reloading > 0 },
    get damage () { return spec.damage * (1 + 0.55 * (this.level - 1)) },
    get fireRate () { return spec.fireRate * (1 + 0.18 * (this.level - 1)) * this.animo },

    upgrade () {
      this.level++
      this.maxHp = Math.round(spec.hp * (1 + 0.35 * (this.level - 1)))
      this.hp = this.maxHp
      this.bar.set(1)
    },
    hurt (cuanto) {
      this.hp -= cuanto
      this.bar.set(this.hp / this.maxHp)
      if (this.hp <= 0) this.dead = true
    },
    onFire () {
      if (--this.shotsLeft <= 0) {
        this.shotsLeft = spec.magazine ?? 8
        this.reloading = spec.reloadTime ?? 1.1
      }
    },

    update (dt, camera) {
      this.bar.face(camera, dt)
      if (this.dead) {
        // Cayendo: ni se mueve ni gira, solo la animación y luego se hunde.
        this.bar.group.visible = false
        poner('Death', 0.1)
        mixer.update(dt)
        mesh.position.set(this.px, -this.hundir, this.pz)
        return
      }
      if (this.reloading > 0) this.reloading = Math.max(0, this.reloading - dt)

      // Andar hacia su sitio, como el soldado de siempre.
      let rumbo = null
      if (this.andando) {
        const dx = this.destX - this.px
        const dz = this.destZ - this.pz
        const falta = Math.hypot(dx, dz)
        const vel = PASO * (VELOCIDAD[this.modoPaso] ?? 1) * this.ritmo
        if (falta <= vel * dt || falta < 1e-4) {
          this.px = this.destX
          this.pz = this.destZ
          this.andando = false
          this.entrando = false
        } else {
          this.px += (dx / falta) * vel * dt
          this.pz += (dz / falta) * vel * dt
          rumbo = Math.atan2(-dx / falta, -dz / falta)
        }
      }

      // Hacia dónde mira: adonde va, a quien dispara o al frente.
      if (rumbo !== null) this.wantYaw = rumbo
      else if (this.targetPos) this.wantYaw = Math.atan2(-(this.targetPos.x - this.px), -(this.targetPos.z - this.pz))
      else this.wantYaw = this.yawReposo
      let d = this.wantYaw - this.aimYaw
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      this.aimYaw += d * Math.min(1, dt * 8)
      this.aim += Math.max(-dt * 3, Math.min(dt * 5, (this.hasTarget ? 1 : 0) - this.aim))

      // El clip que toca. Corriendo con alguien delante, corre disparando.
      if (this.dead) poner('Death', 0.1)
      else if (this.andando) poner(this.modoPaso === 'correr' || this.modoPaso === 'trote' ? (this.hasTarget ? 'Run_Shoot' : 'Run') : 'Walk')
      else if (this.hasTarget) poner('Idle_Shoot')
      else poner('Idle')
      mixer.update(dt * (this.andando ? (VELOCIDAD[this.modoPaso] ?? 1) * this.ritmo / 1.4 : 1))

      mesh.position.set(this.px, 0, this.pz)
      mesh.rotation.y = this.aimYaw
      // Al aparecer, un saltito de nada: como el de los soldados de siempre.
      if (this.spawnT > 0) {
        this.spawnT = Math.max(0, this.spawnT - dt * 2.6)
        mesh.position.y = this.spawnT * this.spawnT * 1.2
      }
    }
  }
  return s
}
