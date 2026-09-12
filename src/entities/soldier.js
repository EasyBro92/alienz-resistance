import * as THREE from 'three'
import { buildSoldierMesh, buildSandbagsMesh } from '../assets.js'
import { laneX, rowZ } from '../world.js'
import { createHealthBar } from './healthbar.js'

// Uno solo para todos los soldados: esto se usa seis veces por figura y por
// fotograma, y crear un cuaternión cada vez es basura que recoger cuarenta
// veces por segundo.
const _giro = new THREE.Quaternion()

let nextId = 1

// Repertorio de gestos de espera. Cada uno recibe `k` (0 → 1 → 0, una campana)
// y desplaza la pose base; nada de esto sustituye la animación de fondo, se
// suma encima, así que la respiración y el balanceo siguen por debajo.
const GESTURES = {
  // Se separa el arma del cuerpo y la mira: ¿cuánto me queda?
  revisarArma: {
    dur: 1.5,
    apply (k, limbs, ud) {
      if (ud.weapon) {
        ud.weapon.position.y += k * 0.16
        ud.weapon.position.z += k * 0.1
        ud.weapon.rotation.z += k * 0.6
      }
      limbs.armL.rotation.x += k * 0.5
      limbs.armR.rotation.x += k * 0.35
      if (ud.head) ud.head.rotation.x += k * 0.45
    }
  },
  // Mano a la cabeza para recolocarse el casco.
  ajustarCasco: {
    dur: 1.3,
    apply (k, limbs, ud) {
      limbs.armL.rotation.x += k * 1.5
      limbs.armL.userData.lower.rotation.x += k * 0.9
      limbs.armL.rotation.z -= k * 0.5
      if (ud.head) ud.head.rotation.z += k * 0.15
    }
  },
  // Mira atrás por encima del hombro. El más efectivo de todos: parece que
  // está pendiente de algo que el jugador no ve.
  mirarAtras: {
    dur: 1.8,
    apply (k, limbs, ud) {
      if (ud.head) {
        ud.head.rotation.y += k * 1.5
        ud.head.rotation.x -= k * 0.12
      }
      if (ud.figure) ud.figure.rotation.y += k * 0.28
    }
  },
  // Estira el cuello y los hombros: lleva horas de pie.
  estirar: {
    dur: 1.6,
    apply (k, limbs, ud) {
      if (ud.head) ud.head.rotation.x -= k * 0.35
      limbs.armL.rotation.x -= k * 0.3
      limbs.armR.rotation.x -= k * 0.22
      limbs.legL.userData.lower.rotation.x -= k * 0.12
    }
  },
  // Dos golpecitos al cargador para asentarlo.
  golpearCargador: {
    dur: 1.1,
    apply (k, limbs, ud) {
      const tap = Math.abs(Math.sin(k * Math.PI * 2.5)) * k
      limbs.armL.rotation.x += tap * 0.55
      limbs.armL.userData.lower.rotation.x -= tap * 0.4
      if (ud.weapon) ud.weapon.position.y -= tap * 0.03
    }
  },
  // Cambia el peso de pie con un paso corto.
  reacomodarse: {
    dur: 1.4,
    apply (k, limbs, ud) {
      limbs.legR.rotation.x += k * 0.3
      limbs.legR.userData.lower.rotation.x -= k * 0.45
      if (ud.figure) ud.figure.rotation.y -= k * 0.12
    }
  }
}
const GESTURE_KEYS = Object.keys(GESTURES)

// A qué velocidad se reubica un soldado, en unidades por segundo. Un carril
// mide 2,4 y una fila 3,2: a este paso un traslado a la casilla de al lado sale
// por menos de un segundo, y el peor caso —de esquina a esquina— por algo más de
// tres, que es lo que debe costar mover una pieza sin que deje de compensar.
const PASO = 3.2

export async function createSoldier (key, spec, lane, row) {
  const mesh = spec.blocker ? buildSandbagsMesh(spec) : await buildSoldierMesh(key, spec)
  mesh.position.set(laneX(lane), 0, rowZ(row))

  // Figuras con esqueleto: el ciclo de andar viene dentro del archivo y lo
  // reproduce un mezclador. Las procedurales no tienen ninguno y siguen
  // animándose pieza a pieza, como siempre.
  //
  // El paso se reproduce SIEMPRE, pero con peso: a cero cuando el soldado está
  // plantado en su casilla y a uno cuando cruza el descampado. Encenderlo y
  // apagarlo daba un tirón en la pierna cada vez que se le mandaba mover,
  // porque la animación arrancaba de su primer fotograma en vez de seguir
  // donde estaba.
  // Los huesos que el bucle mueve a través de sus mandos. Se recogen una vez:
  // buscarlos cada fotograma sería recorrer el esqueleto entero cuarenta veces
  // por segundo.
  const mandos = []
  if (mesh.userData.animado) {
    const ud = mesh.userData
    for (const m of [...Object.values(ud.limbs), ud.head]) {
      if (m?.userData.hueso) mandos.push(m)
      if (m?.userData.lower?.userData.hueso) mandos.push(m.userData.lower)
    }
  }

  const bar = createHealthBar(1.4, spec.blocker ? 1.6 : 2.45)
  mesh.add(bar.group)

  return {
    id: nextId++,
    kind: 'soldier',
    key,
    spec,
    lane,
    row,
    mesh,
    bar,
    hp: spec.hp,
    maxHp: spec.hp,
    level: 1,
    cooldown: Math.random() * 0.4,
    dead: false,
    recoil: 0,
    flashTime: 0,
    idle: Math.random() * 12,
    phase: Math.random() * Math.PI * 2,
    sizeBoost: 1,
    aim: 0,                            // 0 relajado, 1 encarado — se interpola
    hasTarget: false,
    targetPos: null,                   // hacia dónde mira; lo pone el bucle
    aimYaw: 0,                         // giro actual, se persigue al deseado
    shotsLeft: spec.magazine ?? 8,
    reloading: 0,                      // segundos que quedan de recarga
    scanTarget: 0,
    scanHold: 0,
    // Gestos sueltos: lo que de verdad quita el aire de autómata no es que se
    // mueva, es que haga cosas distintas cada rato y sin ritmo fijo.
    gesture: null,
    gestureT: 0,
    gestureCd: 2 + Math.random() * 7,
    flinch: 0,                         // encogimiento al recibir un mordisco
    spawnT: 1,                         // aterriza al colocarlo, no aparece de golpe

    // Ancla real de la figura en el suelo. Casi siempre es la casilla, pero
    // durante un traslado va por el camino, así que TODO lo que antes leía
    // laneX(lane)/rowZ(row) lee ahora esto: si no, el soldado andaba visualmente
    // pero disparaba y era mordido desde su casilla de destino.
    px: laneX(lane),
    pz: rowZ(row),
    andando: false,
    // Entrar en el tablero y recolocarse son el mismo andar, pero no el mismo
    // paso: quien llega de la retaguardia viene al trote, y quien ya está en el
    // frente se mueve andando. Sin esto, comprar un mortero para la última fila
    // costaba cinco segundos de figura cruzando el asfalto sin disparar.
    entrando: false,
    destX: laneX(lane),
    destZ: rowZ(row),
    pasoFase: 0,

    // Asentamiento del fusilero: cuánta cadencia extra lleva acumulada y sobre
    // quién. Lo gestiona el bucle de combate, que es el que sabe a quién apunta.
    asiento: 0,
    mismoObjetivo: null,

    // Calor del cañón. Sube con cada disparo y baja solo. Los incrementos están
    // puestos para que solo el fuego SOSTENIDO llegue a verse: un fusilero a
    // tres disparos por segundo apenas pasa de tibio, mientras que el
    // ametrallador a once se pone al rojo en unos segundos, que es justo la
    // diferencia entre las dos armas y ahora se ve sin leer ninguna ficha.
    calor: 0,

    get canShoot () { return !spec.blocker && !this.andando },
    // Cada mejora sube daño y cadencia: pagar por uno bueno compite de verdad
    // con pagar por uno más.
    get damage () { return spec.damage * (1 + 0.55 * (this.level - 1)) },
    get fireRate () { return spec.fireRate * (1 + 0.18 * (this.level - 1)) },

    // Reubicar ya no es teletransportar: el soldado se va andando. La casilla se
    // le asigna en el acto —para que nadie más la ocupe mientras cruza— pero su
    // posición real tarda lo que tarde en llegar.
    moveTo (newLane, newRow, entrando = false) {
      this.lane = newLane
      this.row = newRow
      this.destX = laneX(newLane)
      this.destZ = rowZ(newRow)
      this.andando = true
      this.entrando = entrando
      this.gesture = null
      this.asiento = 0
      this.mismoObjetivo = null
    },

    upgrade () {
      this.level++
      this.maxHp = Math.round(this.spec.hp * (1 + 0.35 * (this.level - 1)))
      this.hp = this.maxHp
      // La escala real la aplica update() cada fotograma junto con la respiración.
      this.sizeBoost = 1 + 0.06 * (this.level - 1)
      this.bar.set(1)
    },

    hurt (amount) {
      this.hp -= amount
      this.bar.set(this.hp / this.maxHp)
      this.flinch = 1
      this.gesture = null     // un mordisco corta cualquier gesto a medias
      if (this.hp <= 0) this.dead = true
    },

    update (dt, camera) {
      this.bar.face(camera, dt)
      this.idle += dt

      // Los mandos se ponen a cero al empezar el fotograma. El bucle escribe
      // sumando sobre lo que haya —`rotation.x += ...` en media docena de
      // sitios—, así que sin limpiar se acumularía hasta darle la vuelta al
      // brazo en tres segundos.
      for (const m of mandos) m.rotation.set(0, 0, 0)

      const ud = this.mesh.userData
      const limbs = ud.limbs
      const rest = ud.rest

      // --- traslado ---------------------------------------------------------
      // Avanza en línea recta hacia la casilla nueva. Mientras anda no apunta a
      // nadie: bajar el arma para cruzar el descampado es parte del precio de
      // mover una pieza en mitad de una oleada.
      let rumbo = null
      if (this.andando) {
        const dx = this.destX - this.px
        const dz = this.destZ - this.pz
        const falta = Math.hypot(dx, dz)
        const avance = PASO * (this.entrando ? 2 : 1) * dt
        if (falta <= avance || falta < 1e-4) {
          this.px = this.destX
          this.pz = this.destZ
          this.andando = false
          this.entrando = false
          this.pasoFase = 0
        } else {
          this.px += (dx / falta) * avance
          this.pz += (dz / falta) * avance
          this.pasoFase += dt * (this.entrando ? 14 : 9)
          rumbo = Math.atan2(-dx / falta, -dz / falta)
        }
        this.hasTarget = false
        this.targetPos = null
      }

      // Recarga: se para de disparar y se hace el gesto completo.
      if (this.reloading > 0) this.reloading = Math.max(0, this.reloading - dt)

      // Encararse cuesta un momento, y bajar el arma otro: `aim` viaja entre las
      // dos posturas en vez de saltar. Es lo que hace que se vea reaccionar.
      const want = this.hasTarget ? 1 : 0
      this.aim += Math.max(-dt * 2.6, Math.min(dt * 4.5, want - this.aim))

      if (limbs && rest) {
        // Nada late al mismo compás: la respiración, el balanceo del peso y el
        // cabeceo van a frecuencias distintas y desfasadas. Si todo comparte
        // ritmo, el conjunto se lee como un mecanismo.
        const t = this.idle
        const a = this.aim
        const relax = 1 - a
        // Relajado respira hondo y se mueve más; encarado se queda firme.
        const breath = Math.sin(t * (1.1 + a * 0.5) + this.phase) * (0.6 + relax * 0.8)
        const shift = Math.sin(t * 0.62 + this.phase * 1.7)
        const drift = Math.sin(t * 0.41 + this.phase * 0.6)

        // Vigilancia: la cabeza no barre en seno, va a saltos y se queda mirando
        // un rato. El movimiento continuo es justo lo que delata a una máquina.
        this.scanHold -= dt
        if (this.scanHold <= 0) {
          this.scanHold = 0.8 + Math.random() * 2.2
          this.scanTarget = (Math.random() - 0.5) * (relax > 0.5 ? 1.1 : 0.35)
        }

        const k = this.sizeBoost
        this.mesh.scale.set(k * (1 + breath * 0.035), k * ud.build * (1 + breath * 0.05), k * (1 + breath * 0.035))
        // El peso se desplaza de verdad: el cuerpo se va de lado, no solo se inclina.
        this.mesh.position.x = this.px + shift * 0.05 * (0.5 + relax)
        this.mesh.rotation.z = shift * 0.06 * (0.4 + relax)

        // Encarar al objetivo. Antes el soldado miraba siempre al frente y la
        // trazadora salía igual hacia el lado correcto: se veía disparar de
        // costado, o por la espalda, sin girarse.
        //
        // Con rotación cero la figura mira hacia -Z, así que el giro que lleva
        // ese eje hasta el objetivo es atan2(-dx, -dz).
        if (rumbo !== null) {
          this.wantYaw = rumbo                  // andando se mira hacia donde se va
        } else if (this.targetPos) {
          const dx = this.targetPos.x - this.mesh.position.x
          const dz = this.targetPos.z - this.pz
          this.wantYaw = Math.atan2(-dx, -dz)
        } else {
          this.wantYaw = 0
        }
        // Giro por el camino corto: sin normalizar la diferencia, pasar de +179°
        // a -179° daría una vuelta entera al soldado.
        let d = this.wantYaw - this.aimYaw
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        this.aimYaw += d * Math.min(1, dt * 7)
        this.mesh.rotation.y = this.aimYaw + drift * 0.09 * (0.3 + relax)

        // Encarado: arma arriba y brazos cerrados. Relajado: arma colgando y
        // brazos caídos. Todo el tramo intermedio se interpola.
        const drop = relax * 0.62
        limbs.armL.rotation.x = rest.arm.armL - drop + breath * 0.06
        limbs.armR.rotation.x = rest.arm.armR - drop * 0.85 + breath * 0.05
        limbs.armL.userData.lower.rotation.x = rest.armBend.armL - relax * 0.55 - breath * 0.07
        limbs.armR.userData.lower.rotation.x = rest.armBend.armR - relax * 0.7 - breath * 0.06

        // El peso pasa de una pierna a otra: las rodillas se turnan, y en reposo
        // el balanceo es mucho más amplio.
        const knee = 0.12 + relax * 0.2
        limbs.legL.userData.lower.rotation.x = rest.legBend.legL + Math.max(0, shift) * knee
        limbs.legR.userData.lower.rotation.x = rest.legBend.legR + Math.max(0, -shift) * knee
        limbs.legL.rotation.x = rest.leg.legL + shift * 0.05
        limbs.legR.rotation.x = rest.leg.legR - shift * 0.05

        if (ud.figure) ud.figure.rotation.y = ud.stance * (0.35 + a * 0.65)

        if (ud.head) {
          ud.head.rotation.y += (ud.headYaw + this.scanTarget - ud.head.rotation.y) * Math.min(1, dt * 4)
          ud.head.rotation.x = breath * 0.06 + relax * 0.05
          ud.head.position.y = rest.headY + breath * 0.012
        }
        if (ud.weapon) {
          // En reposo el arma cuelga apuntando al suelo; al encarar sube.
          ud.weapon.position.set(
            rest.weaponRest.x - relax * 0.02,
            rest.weaponRest.y + breath * 0.02 - relax * 0.28,
            rest.weaponRest.z + relax * 0.1
          )
          ud.weapon.rotation.x = 0.06 + breath * 0.03 + relax * 0.75
          ud.weapon.rotation.z = relax * 0.2
        }

        // Gesto de recarga: baja el arma, la mano de apoyo va al cargador y sube.
        if (this.reloading > 0 && ud.weapon) {
          const total = this.spec.reloadTime ?? 1.1
          const p = 1 - this.reloading / total          // 0 → 1
          const swing = Math.sin(p * Math.PI)           // sube y baja
          ud.weapon.rotation.x += swing * 0.55
          ud.weapon.rotation.z += swing * 0.5
          ud.weapon.position.y -= swing * 0.16
          limbs.armL.rotation.x -= swing * 0.85
          limbs.armL.userData.lower.rotation.x += swing * 0.9
          limbs.armR.rotation.x -= swing * 0.2
          if (ud.head) ud.head.rotation.x += swing * 0.3
        }
      }

      // --- zancada del traslado ---------------------------------------------
      // Se pinta ENCIMA de la pose de reposo, no en lugar de ella: la
      // respiración y el balanceo siguen por debajo, y al llegar el andar se
      // apaga solo sin ningún salto de postura.
      if (rumbo !== null && limbs && rest) {
        const p = Math.sin(this.pasoFase)
        const lag = Math.sin(this.pasoFase - 0.7)      // la rodilla va con retraso
        limbs.legL.rotation.x = rest.leg.legL + p * 0.62
        limbs.legR.rotation.x = rest.leg.legR - p * 0.62
        // Solo se dobla la rodilla de la pierna que va hacia atrás, como al andar.
        limbs.legL.userData.lower.rotation.x = rest.legBend.legL - Math.max(0, -lag) * 0.85
        limbs.legR.userData.lower.rotation.x = rest.legBend.legR - Math.max(0, lag) * 0.85
        // Los brazos van a contrafase de las piernas, con el arma recogida.
        limbs.armL.rotation.x = rest.arm.armL - 0.5 - p * 0.32
        limbs.armR.rotation.x = rest.arm.armR - 0.5 + p * 0.32
        limbs.armL.userData.lower.rotation.x = rest.armBend.armL - 0.4
        limbs.armR.userData.lower.rotation.x = rest.armBend.armR - 0.5
        // De frente al camino: la postura ladeada es para disparar.
        if (ud.figure) ud.figure.rotation.y = 0
        if (ud.head) ud.head.rotation.y = 0
        this.mesh.rotation.z = p * 0.05
      }

      // --- gestos sueltos --------------------------------------------------
      // Solo cuando no hay nada delante: si está encarado, no se pone a
      // ajustarse el casco. Cada gesto dura poco y no se repite a ritmo fijo.
      if (limbs && rest) {
        if (this.gesture) {
          this.gestureT += dt
          const g = GESTURES[this.gesture]
          const k = this.gestureT / g.dur
          if (k >= 1) {
            this.gesture = null
            this.gestureCd = 3 + Math.random() * 9
          } else {
            g.apply(Math.sin(k * Math.PI), limbs, ud, rest)
          }
        } else if (this.aim < 0.25 && this.reloading <= 0) {
          this.gestureCd -= dt
          if (this.gestureCd <= 0) {
            this.gesture = GESTURE_KEYS[Math.floor(Math.random() * GESTURE_KEYS.length)]
            this.gestureT = 0
          }
        }
      }

      // Cuánto retrocede la figura este fotograma. Se acumula aquí y se aplica
      // al final sobre SU eje, no sobre el del mundo: ahora que el soldado gira
      // para encarar, empujarlo siempre hacia +Z lo movía de lado.
      let backOff = 0

      // --- encogimiento al recibir daño -------------------------------------
      if (this.flinch > 0) {
        this.flinch = Math.max(0, this.flinch - dt * 4)
        const f = this.flinch * this.flinch
        backOff += f * 0.14
        this.mesh.rotation.x = f * 0.18
        if (ud.head) ud.head.rotation.x += f * 0.3
        if (limbs) {
          limbs.armL.rotation.x -= f * 0.4
          limbs.armR.rotation.x -= f * 0.3
        }
      } else {
        this.mesh.rotation.x = 0
      }

      // --- aterrizaje al colocarlo ------------------------------------------
      if (this.spawnT > 0) {
        this.spawnT = Math.max(0, this.spawnT - dt * 2.6)
        const s = this.spawnT
        this.mesh.position.y = s * s * 2.2
        // Rebote al tocar el suelo: se aplasta y se recupera.
        const squash = 1 + Math.sin(s * Math.PI) * 0.22
        this.mesh.scale.y *= (s < 0.35 ? 2 - squash : squash)
      } else {
        // Bamboleo del paso: el cuerpo sube en cada zancada. Sin esto la figura
        // mueve las piernas pero se desliza como sobre raíles.
        this.mesh.position.y = this.andando ? Math.abs(Math.sin(this.pasoFase)) * 0.06 : 0
      }

      if (this.recoil > 0) {
        this.recoil = Math.max(0, this.recoil - dt * 9)
        const r = this.recoil
        // Curva del culatazo: golpe seco hacia atrás y arriba, y vuelta lenta.
        const kick = r * r
        backOff += kick * 0.1
        if (limbs && rest) {
          limbs.armL.rotation.x -= kick * 0.22
          limbs.armR.rotation.x -= kick * 0.26
          limbs.armR.userData.lower.rotation.x -= kick * 0.18
          if (ud.head) ud.head.rotation.x -= kick * 0.16
          if (ud.weapon) {
            // El cañón trepa: el arma retrocede y levanta la boca.
            ud.weapon.position.z += kick * 0.09
            ud.weapon.position.y += kick * 0.02
            ud.weapon.rotation.x += kick * 0.26
          }
        }
      }

      // Retroceso a lo largo de su propia mirada.
      this.mesh.position.x += Math.sin(this.aimYaw) * backOff
      this.mesh.position.z = this.pz + Math.cos(this.aimYaw) * backOff

      // El acero se enfría solo, y despacio: si bajara rápido el cañón
      // parpadearía entre disparo y disparo en vez de mantener el rojo.
      if (this.calor > 0) {
        this.calor = Math.max(0, this.calor - dt * 0.3)
        const canon = ud.canon
        if (canon) {
          // Del negro al naranja pasando por el rojo oscuro, como el acero de
          // verdad: primero rojo apagado, y solo al final asoma el amarillo.
          const k = this.calor
          canon.material.emissive.setRGB(k * 0.95, k * k * 0.35, k * k * k * 0.08)
          canon.material.emissiveIntensity = k * 2.2
        }
      }

      const flash = this.mesh.userData.flash
      if (flash) {
        this.flashTime = Math.max(0, this.flashTime - dt)
        flash.visible = this.flashTime > 0
        if (flash.visible) flash.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1.8)
      }

      // Y ahora, al hueso. Lo último del fotograma, cuando ya está escrito todo:
      // el encare, el paso, el retroceso del disparo y el gesto que toque.
      //
      // Se compone POR LA DERECHA —reposo × desvío— y no al revés. El desvío
      // está en el sistema del propio hueso: doblar el codo es girar sobre el
      // eje X DEL BRAZO, no sobre el X del mundo. Multiplicando al otro lado,
      // el codo se doblaría hacia donde mire el personaje y los brazos salían
      // disparados en cuanto el soldado giraba a encarar un carril de al lado.
      for (const m of mandos) {
        const h = m.userData.hueso
        h.quaternion.copy(m.userData.reposo).multiply(
          _giro.setFromEuler(m.rotation)
        )
      }
    },

    get busy () { return this.reloading > 0 },

    // Cuánto sube el cañón por disparo. Inverso a la cadencia: lo que quema el
    // acero es el ritmo, no el disparo suelto.
    get subidaDeCalor () {
      const c = this.spec.fireRate
      return c >= 8 ? 0.055 : c >= 5 ? 0.075 : 0.1
    },

    onFire () {
      // La ametralladora vibra en vez de dar culatazos sueltos; el arco no da
      // culatazo ninguno.
      if (!this.spec.silent) this.calor = Math.min(1, this.calor + this.subidaDeCalor)
      this.recoil = this.spec.shake ? 0.45 : this.spec.projectile === 'arrow' ? 0.3 : 1
      this.flashTime = this.spec.silent ? 0 : 0.05
      if (--this.shotsLeft <= 0) {
        this.shotsLeft = this.spec.magazine ?? 8
        this.reloading = this.spec.reloadTime ?? 1.1
      }
    }
  }
}

export function upgradeCost (soldier) {
  return Math.round(soldier.spec.cost * 0.75 * Math.pow(1.8, soldier.level - 1))
}

// La boca del cañón se lee del propio fogonazo, que cuelga del arma: así sigue
// siendo correcta aunque el arma se mueva con el retroceso o cambie de modelo.
// Por dónde salta la vaina. Antes los casquillos salían por la boca del cañón,
// que es por donde sale la bala: el arma escupía latón por delante en vez de
// tirarlo al suelo por el costado.
export function ejectorWorld (soldier, out = new THREE.Vector3()) {
  const node = soldier.mesh.userData.puerto
  if (!node) return muzzleWorld(soldier, out)
  node.updateWorldMatrix(true, false)
  return out.setFromMatrixPosition(node.matrixWorld)
}

export function muzzleWorld (soldier, out = new THREE.Vector3()) {
  const node = soldier.mesh.userData.flash
  if (!node) return out.copy(soldier.mesh.position).setY(1.2)
  node.updateWorldMatrix(true, false)
  return out.setFromMatrixPosition(node.matrixWorld)
}
