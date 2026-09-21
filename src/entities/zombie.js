import { buildZombieMesh } from '../assets.js'
import { laneX } from '../world.js'
import { createHealthBar } from './healthbar.js'
import { FIELD } from '../config.js'

let nextId = 1

// Lo que dura el respingo del golpe. Más largo se convierte en un baile y tapa
// el ciclo de andar; más corto no llega a verse en un móvil.
const GOLPE_DURA = 0.18

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

  // El Escarbador baja de la nave como los demás; al pisar suelo firme cava,
  // viaja hundido y sale detrás de la línea (ver `cavar` en el bucle de main.js).

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
    golpe: 0,
    golpeFuerza: 0,
    golpeNuevo: false,
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
    // Escarbador: en qué punto va ('llegar', 'cavando', 'tunel', 'saliendo'),
    // si está bajo tierra y el suelo roto que va dejando (`rastro`).
    // `meta`: lo que anda tras bajar de la nave antes de cavar (antes cavaba a
    // un paso de la rampa y parecía que escarbaba en la plancha). `hasta`: dónde
    // sale, siempre detrás de la primera fila pero no siempre en el mismo sitio.
    cavar: spec.escarba
      ? { estado: 'llegar', t: 0, andado: 0, ultimoZ: 0, tocable: false, meta: 3 + Math.random() * 6, hasta: -8.2 + Math.random() * 9.6 }
      : null,
    bajoTierra: false,
    rastro: null,
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
    // El Escarbador tampoco mientras baja de la rampa y cava: antes ya salía
    // hundido, y dejarle tocable ahí cambiaría lo que aguanta.
    // Andando por el suelo, antes de cavar, sí se le puede disparar; al salir,
    // no hasta que ha salido del todo: le mataban a medio asomar, sin llegar a
    // verse qué era.
    get intocable () { return this.bajoTierra || !!this.salto || (!!this.cavar && !this.cavar.tocable) },

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
      // Acusa el golpe: se sacude y retrocede un instante. Sin esto, dispararle
      // a un huésped no se distinguía de no dispararle hasta que caía muerto.
      // La fuerza va con lo que le has quitado de su vida, no con el daño en
      // bruto: al Coloso un fusilazo lo despeina, al Portador lo dobla.
      this.golpe = GOLPE_DURA
      this.golpeFuerza = Math.min(1, 0.25 + (real / this.maxHp) * 3)
      this.golpeNuevo = true
      if (this.hp <= 0) this.dead = true
      return real
    },

    update (dt, camera, walking = true) {
      // Bajo tierra no hay barra que enseñar: no se le ve, no se le puede tocar.
      this.bar.group.visible = this.bar.group.visible && !this.bajoTierra
      this.bar.face(camera, dt)

      // El respingo del golpe. La figura se echa atrás y se dobla, y vuelve a su
      // sitio sola: va sobre la figura y no sobre el grupo, que es quien lleva
      // el avance por el carril.
      if (this.golpe > 0) {
        this.golpe = Math.max(0, this.golpe - dt)
        const k = this.golpe / GOLPE_DURA
        const f = this.mesh.userData.figura
        const doblez = Math.sin(k * Math.PI) * 0.16 * this.golpeFuerza
        if (f) {
          f.position.z = -k * 0.2 * this.golpeFuerza
          f.rotation.x = doblez
        } else {
          this.mesh.rotation.x = doblez
        }
        if (this.golpe === 0) {
          if (f) { f.position.z = 0; f.rotation.x = 0 } else this.mesh.rotation.x = 0
        }
      }

      if (this.tLastre > 0) {
        this.tLastre -= dt
        if (this.tLastre <= 0) this.lastre = 1
      }

      // Ciclo de andares: las piernas van a contrafase y el cuerpo sube en cada
      // paso. Es lo que separa "figura deslizándose" de "cosa que camina".
      // Con esqueleto, los grandes dan pasos más largos y lentos: al mismo ritmo
      // que un huésped pequeño, el Coloso trotaba como un juguete de cuerda.
      const rig = this.mesh.userData.esqueleto
      if (walking) this.walkPhase += dt * this.velocidad * (rig ? 2.6 / (this.spec.scale ?? 1) : 3.4)
      else this.walkPhase += dt * 5   // al atacar, zarpazos rápidos

      const swing = Math.sin(this.walkPhase)
      // Los modelos de Meshy se animan solos con su esqueleto automático (ver
      // `alienDeMeshy` en assets.js): solo necesitan saber esto.
      this.mesh.userData.andando = walking
      this.mesh.userData.fasePaso = this.walkPhase
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

      // Con esqueleto, el balanceo y el bote los pone la cadera (ver `alienDeMeshy`).
      this.mesh.rotation.z = rig ? 0 : swing * 0.05
      // `suelo` es la altura del terreno bajo los pies, y lo pone el bucle desde
      // fuera. Vale cero en todo el asfalto y sube en la plancha de la rampa:
      // sin esto, los que acaban de salir aparecían a ras de carretera, o sea
      // ATRAVESANDO la rampa desde abajo en vez de bajando por ella.
      this.mesh.position.y = (this.suelo ?? 0) + (rig ? 0 : Math.abs(swing) * 0.09)
    }
  }
}

export { nextId }
