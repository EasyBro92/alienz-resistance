import { buildZombieMesh } from '../assets.js'
import { laneX } from '../world.js'
import { createHealthBar } from './healthbar.js'
import { FIELD } from '../config.js'

let nextId = 1

export async function createZombie (key, spec, lane, waveScale = 1) {
  const mesh = await buildZombieMesh(key, spec)
  const jitter = (Math.random() - 0.5) * FIELD.laneWidth * 0.3
  // Su sitio final: el carril que le toca. Pero NO es donde aparece.
  const xCarril = laneX(lane) + jitter

  // Se sale por el centro de la rampa, porque es una nave y no un muelle de
  // carga: la plancha mide 7,2 y la carretera 12, así que salir ya en el carril
  // dejaba a los de los extremos apareciendo en el aire, al lado de la rampa.
  //
  // El abanico es pequeño —un poco a cada lado según el carril de destino— y
  // sirve para dos cosas: que no salgan los cinco pisándose por el mismo punto,
  // y que cada uno empiece a tirar hacia su lado desde el primer paso, así que
  // el reparto de después ya viene encarrilado en vez de ser un cruce de todos
  // con todos.
  const centro = (FIELD.lanes - 1) / 2
  const xSalida = (lane - centro) * 0.62 + jitter * 0.5
  mesh.position.set(xSalida, 0, FIELD.spawnZ - Math.random() * 6)
  mesh.rotation.y = Math.PI // mirando hacia la base

  // El Escarbador entra ya bajo tierra: sale del suelo, no de la rampa. La
  // figura arranca hundida y sin barra, y el bucle la saca cuando toca.
  if (spec.escarba) mesh.position.y = -2.2

  const maxHp = Math.round(spec.hp * waveScale)
  // Ancho y altura NOMINALES, sin multiplicar por la escala del bicho: la barra
  // cuelga de la figura y ya hereda su escala. Al multiplicar aquí también, la
  // del Coloso salía elevada al cuadrado y le quedaba flotando a diez metros
  // sobre la cabeza.
  const bar = createHealthBar(spec.boss ? 2.2 : 1.5, spec.boss ? 1.85 : 2.55)
  mesh.add(bar.group)

  return {
    id: nextId++,
    kind: 'zombie',
    key,
    spec,
    lane,
    mesh,
    bar,
    hp: maxHp,
    maxHp,
    dead: false,
    target: null,
    attackCd: 0,
    // Daño encajado desde el último cartel, y cuánto falta para el siguiente.
    // Un ametrallador dispara once veces por segundo: un número por disparo era
    // una nevada ilegible. Se acumula y sale una cifra sola cada poco.
    dañoAcumulado: 0,
    tDaño: 0,
    // Lastre: lo que le frena y cuánto le queda. La flecha del arquero se clava
    // y el ametrallador suprime; los dos escriben aquí y gana el más fuerte,
    // que si no, dos fuentes flojas se multiplicaban y lo dejaban parado.
    lastre: 1,
    // Altura del suelo bajo los pies. La pone el bucle: cero en el asfalto, la
    // plancha de la rampa mientras están saliendo de la nave.
    suelo: 0,
    // A dónde tiene que acabar yendo, y si todavía le queda camino lateral.
    // Se reparten al PISAR el asfalto, no en la rampa: abrirse en la plancha
    // les haría salirse de ella por el costado.
    xCarril,
    repartiendo: true,
    tLastre: 0,

    // Saltador: cuánto le falta para poder volver a saltar, y el salto en curso.
    saltoCd: 1.5,
    salto: null,
    // Injertadora: reloj de su propio injerto.
    tInjerto: Math.random() * 1.2,
    // Escarbador: bajo tierra hasta que llega a su profundidad de salida.
    bajoTierra: !!spec.escarba,
    emergiendo: 0,
    walkPhase: Math.random() * Math.PI * 2,

    get z () { return this.mesh.position.z },

    // Velocidad real de este fotograma, con el lastre aplicado. Bajo tierra va
    // más rápido: es lo que hace que el Escarbador sorprenda de verdad y no dé
    // tiempo a recolocar media línea antes de que asome.
    get velocidad () {
      const base = this.spec.speed * (this.bajoTierra ? (this.spec.escarba.prisa ?? 1) : 1)
      return base * (this.tLastre > 0 ? this.lastre : 1)
    },

    // Mientras está bajo tierra o en el aire nadie le dispara ni le bloquea el
    // paso: si no, un Saltador recibía el mordisco a mitad de vuelo y un
    // Escarbador moría sin haber salido, que es justo lo contrario de lo suyo.
    get intocable () { return this.bajoTierra || !!this.salto },

    curar (n) {
      if (this.hp >= this.maxHp) return 0
      const antes = this.hp
      this.hp = Math.min(this.maxHp, this.hp + n)
      this.bar.set(this.hp / this.maxHp)
      return this.hp - antes
    },

    frenar (factor, dura) {
      if (factor < this.lastre || this.tLastre <= 0) this.lastre = factor
      this.tLastre = Math.max(this.tLastre, dura)
    },

    hurt (amount, pierce = 0) {
      // El blindaje reduce el daño salvo que el arma perfore.
      const armor = (this.spec.armor ?? 0) * (1 - pierce)
      const real = amount * (1 - armor)
      this.hp -= real
      this.dañoAcumulado += real
      this.bar.set(this.hp / this.maxHp)
      if (this.hp <= 0) this.dead = true
      return real
    },

    update (dt, camera, walking = true) {
      // Bajo tierra no hay barra que enseñar: no se le ve, no se le puede tocar.
      this.bar.group.visible = this.bar.group.visible && !this.bajoTierra
      this.bar.face(camera, dt)
      if (this.tLastre > 0) {
        this.tLastre -= dt
        if (this.tLastre <= 0) this.lastre = 1
      }

      // Ciclo de andares: las piernas van a contrafase y el cuerpo sube en cada
      // paso. Es lo que separa "figura deslizándose" de "cosa que camina".
      if (walking) this.walkPhase += dt * this.velocidad * 3.4
      else this.walkPhase += dt * 5   // al atacar, zarpazos rápidos

      const swing = Math.sin(this.walkPhase)
      const limbs = this.mesh.userData.limbs
      if (limbs) {
        const lag = Math.sin(this.walkPhase - 0.7)   // la rodilla va con retraso
        if (walking) {
          limbs.legL.rotation.x = swing * 0.6
          limbs.legR.rotation.x = -swing * 0.6
          // Rodillas: solo se dobla la pierna que va hacia atrás, como al andar.
          limbs.legL.userData.lower.rotation.x = limbs.legL.userData.restBend - Math.max(0, -lag) * 0.7
          limbs.legR.userData.lower.rotation.x = limbs.legR.userData.restBend - Math.max(0, lag) * 0.7
          limbs.armL.rotation.x = 1.32 + swing * 0.1
          limbs.armR.rotation.x = 1.2 - swing * 0.1
          limbs.armL.userData.lower.rotation.x = limbs.armL.userData.restBend + swing * 0.12
          limbs.armR.userData.lower.rotation.x = limbs.armR.userData.restBend - swing * 0.12
        } else {
          // atacando: los brazos suben y bajan a dentelladas, cerrando el codo
          const a = Math.abs(swing)
          const b = Math.abs(Math.sin(this.walkPhase + 0.6))
          limbs.armL.rotation.x = 1.9 - a * 0.75
          limbs.armR.rotation.x = 1.9 - b * 0.75
          limbs.armL.userData.lower.rotation.x = -0.2 - a * 0.6
          limbs.armR.userData.lower.rotation.x = -0.2 - b * 0.6
        }
      }

      const lean = this.mesh.userData.lean
      if (lean) lean.rotation.z = swing * 0.07

      // --- reparto a los carriles -------------------------------------------
      // En cuanto tocan la carretera se van abriendo hacia su carril. Se mueve
      // por PASOS y no fijando la x: el sistema de estorbo entre huéspedes
      // también escribe ahí, y sobrescribirla de golpe deshacía sus empujones y
      // volvían a meterse unos dentro de otros.
      if (this.repartiendo && !this.suelo) {
        const dx = this.xCarril - this.mesh.position.x
        // Se abre a la mitad de lo que avanza: el desvío queda en diagonal
        // suave, no en un giro de noventa grados nada más pisar el suelo.
        const paso = this.velocidad * 0.5 * dt
        if (Math.abs(dx) <= paso) {
          this.mesh.position.x = this.xCarril
          this.repartiendo = false
        } else {
          this.mesh.position.x += Math.sign(dx) * paso
        }
      }

      this.mesh.rotation.z = swing * 0.05
      // `suelo` es la altura del terreno bajo los pies, y lo pone el bucle desde
      // fuera. Vale cero en todo el asfalto y sube en la plancha de la rampa:
      // sin esto, los que acaban de salir aparecían a ras de carretera, o sea
      // ATRAVESANDO la rampa desde abajo en vez de bajando por ella.
      this.mesh.position.y = (this.suelo ?? 0) + Math.abs(swing) * 0.09
    }
  }
}

export { nextId }
