// Todos los números del juego viven aquí. Para reequilibrar, toca solo este archivo.

export const FIELD = {
  lanes: 5,
  laneWidth: 2.4,
  rows: 4,          // filas donde se pueden colocar soldados
  rowDepth: 3.2,    // separación entre filas
  baseZ: 4,         // línea de la base (los zombis que llegan aquí hacen daño)
  frontRowZ: 0,     // fila de colocación más cercana a la base
  spawnZ: -44       // aparecen al fondo, junto al horizonte, no a media pista
}

export const BASE = { hp: 100 }

// Economía: el goteo automático te da aire, las bajas te dan el sueldo de verdad.
export const ECONOMY = {
  startCoins: 200,
  dripEvery: 4.5,     // segundos entre monedas gratis: es un salvavidas, no un sueldo
  dripValue: 15,
  pickupLifetime: 9,  // segundos antes de que una moneda del suelo se pierda
  autoCollect: false  // lo activa la mejora "Recolector"
}

// Cada unidad tiene UN rasgo que no tiene ninguna otra. Sin eso los siete eran
// el mismo soldado con distintos números, y elegir se reducía a comprar el más
// caro que pudieras pagar; con esto cada uno resuelve un problema distinto y la
// composición de la línea pasa a ser una decisión de verdad.
//
// `magazine` y `reloadTime` no son solo números: obligan a parar cada pocos
// disparos y es cuando se ve al soldado hacer el gesto de recargar.
export const SOLDIERS = {
  archer: {
    name: 'Arquero', cost: 25, hp: 80, color: 0xa8895c, accent: 0x8a4a3a,
    damage: 8, fireRate: 1.1, range: 15, armorPierce: 0.0,
    magazine: 1, reloadTime: 0.5, projectile: 'arrow', silent: true,
    // Rasgo: la flecha se queda clavada y el huésped cojea.
    clava: { factor: 0.55, dura: 2.4 },
    blurb: 'Lo más barato que hay. Flojo, pero deja la flecha clavada y lo que toca camina cojo.'
  },
  rifle: {
    name: 'Fusilero', cost: 50, hp: 100, color: 0x3d7dd8, accent: 0x1b3f75,
    damage: 9.5, fireRate: 3.2, range: 16, armorPierce: 0.25,
    magazine: 10, reloadTime: 1.1,
    // Rasgo: cuanto más tiempo lleva castigando al mismo, mejor le va.
    asienta: { porSegundo: 0.22, tope: 0.7 },
    blurb: 'Barato y constante. Se asienta: cuanto más castiga al mismo, más rápido dispara.'
  },
  shotgun: {
    name: 'Escopetero', cost: 110, hp: 160, color: 0xe58227, accent: 0x7a3018,
    damage: 13, pellets: 4, fireRate: 1.7, range: 7, armorPierce: 0.1, spread: true,
    magazine: 5, reloadTime: 1.4,
    // Rasgo: el impacto los manda para atrás. Lo que gana es tiempo, no daño.
    empuja: 1.5,
    blurb: 'Destroza de cerca, salpica a los vecinos y los manda para atrás de un culatazo.'
  },
  sniper: {
    name: 'Tirador', cost: 175, hp: 70, color: 0x49b88a, accent: 0x1e5c43,
    damage: 57, fireRate: 0.85, range: 44, armorPierce: 1.0,
    magazine: 5, reloadTime: 1.6,
    // Rasgo: no dispara al más cercano, dispara al más duro. Es el matajefes.
    buscaDuro: true,
    blurb: 'Alcanza todo el carril, atraviesa blindajes y escoge siempre al más duro. Frágil de cerca.'
  },
  flamer: {
    name: 'Lanzallamas', cost: 200, hp: 130, color: 0x8f2118, accent: 0x3f2a26,
    damage: 5, fireRate: 6, range: 8, armorPierce: 0.6, flame: true,
    magazine: 60, reloadTime: 2.2,
    // Rasgo: el suelo se queda ardiendo detrás de la llamarada.
    brasas: { daño: 11, dura: 3.2, radio: 1.5 },
    blurb: 'Achicharra el carril entero y deja el asfalto ardiendo. Al blindaje no le sirve de nada.'
  },
  gunner: {
    name: 'Ametrallador', cost: 260, hp: 120, color: 0x7a6ad4, accent: 0x38307a,
    damage: 6, fireRate: 11, range: 20, armorPierce: 0.15, shake: true,
    magazine: 90, reloadTime: 2.6,
    // Rasgo: no mata rápido, pero lo que tiene enfrente casi no avanza.
    suprime: { factor: 0.45, dura: 0.7 },
    blurb: 'Un chorro de balas que clava en el sitio lo que tenga delante. Se atasca con los blindados.'
  },
  mortar: {
    name: 'Mortero', cost: 320, hp: 90, color: 0xd9c23a, accent: 0x5f5218,
    damage: 90, fireRate: 0.4, range: 40, armorPierce: 0.8, splash: 4.2, mortarShot: true,
    magazine: 1, reloadTime: 1.4,
    // Rasgo: apunta donde hay más juntos, no al que va primero.
    buscaCorro: true,
    blurb: 'Bomba en arco que cae donde más apretados van. Lento, caro y devastador.'
  }
}

export const DEFENSES = {
  sandbags: {
    name: 'Sacos terreros', cost: 45, hp: 300, color: 0xc9b184, accent: 0x8a7350,
    blocker: true,
    blurb: 'No dispara. Se lo comen a él mientras los tuyos disparan.'
  },
  spikes: {
    name: 'Alambrada', cost: 80, hp: 150, color: 0x8d949c, accent: 0x4a5058,
    blocker: true, thorns: 14,
    blurb: 'Frena y desangra: cada mordisco que recibe se lo devuelve al zombi.'
  }
}

export const STRIKES = {
  grenade: {
    name: 'Granada', cost: 90, damage: 120, radius: 3.4,
    blurb: 'Barata y a mano. Para un apuro pequeño.'
  },
  airstrike: {
    name: 'Ataque aéreo', cost: 300, damage: 400, radius: 5.5,
    blurb: 'Arrasa una zona. Para cuando ya no llegas.'
  }
}

export const UPGRADES = {
  collector: {
    name: 'Recolector', cost: 250,
    blurb: 'Las monedas se cobran solas. Deja de recogerlas a mano.'
  }
}

// La vida subió un 15% en todos el 2026-09-08. A TODOS por igual y a la vez:
// tocar solo a unos cuantos cambiaría quién es duro respecto a quién, y el
// jugador ya ha aprendido ese orden. Lo que cambia es cuánto plomo hace falta.
export const ZOMBIES = {
  walker: {
    name: 'Portador', hp: 26, speed: 3.4, damage: 18, attackRate: 1.3,
    coins: 14, scale: 1, color: 0x7fa855, accent: 0x4a6b30
  },
  runner: {
    name: 'Corredor', hp: 17, speed: 7.2, damage: 12, attackRate: 2.0,
    coins: 16, scale: 0.9, color: 0xb8d14a, accent: 0x6d7d24
  },
  armored: {
    name: 'Encostrado', hp: 61, speed: 2.8, damage: 26, attackRate: 1.0,
    coins: 28, scale: 1.1, color: 0x6b7a86, accent: 0x39434b, armor: 0.7
  },
  spitter: {
    name: 'Sembrador', hp: 39, speed: 2.85, damage: 20, attackRate: 0.9,
    coins: 30, scale: 1, color: 0xa05fb8, accent: 0x5c2f6d, rangedAttack: 11
  },
  tank: {
    name: 'Coloso', hp: 296, speed: 1.8, damage: 70, attackRate: 0.8,
    coins: 85, scale: 1.9, color: 0xd39a8f, accent: 0x8d5a52, wide: true
  },
  // --- los cuatro con maneras ------------------------------------------------
  // Cada uno existe para romper UNA forma de jugar. Un enemigo que solo tiene
  // más vida o más velocidad no cambia nada: cambias el número de soldados y ya.
  // Estos obligan a cambiar la línea, que es lo que hace que haya que pensar.

  // Rompe la barrera: la salta. Contra una pared de sacos, esta pasa por encima.
  leaper: {
    name: 'Saltador', hp: 32, speed: 4.2, damage: 22, attackRate: 1.2,
    coins: 22, scale: 0.95, color: 0x4fb8c4, accent: 0x1f5f6b,
    salta: { distancia: 6.5, recarga: 5 }
  },

  // Rompe la aglomeración: al morir revienta y se lleva por delante lo que
  // tenga cerca. Apilar siete soldados en un carril deja de salir gratis.
  bloater: {
    name: 'Revientaesporas', hp: 80, speed: 2.4, damage: 16, attackRate: 0.9,
    coins: 34, scale: 1.25, color: 0xd8b04a, accent: 0x7a5a18,
    revienta: { daño: 42, radio: 3.4 }
  },

  // Rompe el goteo de daño: cura a los de alrededor. Si no la matas a ella
  // primero, el carril entero se vuelve una esponja.
  healer: {
    name: 'Injertadora', hp: 46, speed: 3.0, damage: 10, attackRate: 0.8,
    coins: 40, scale: 1, color: 0xe86fa8, accent: 0x7a2a52,
    injerta: { cura: 11, radio: 5.5, cada: 1.2 }
  },

  // Rompe la línea de frente: pasa por debajo y sale POR DETRÁS de tus tropas,
  // donde están los que menos vida tienen. Obliga a mirar el fondo del tablero.
  burrower: {
    name: 'Escarbador', hp: 52, speed: 3.2, damage: 24, attackRate: 1.1,
    coins: 32, scale: 1.05, color: 0x8a6a4a, accent: 0x46331f,
    escarba: { hasta: -2.5, prisa: 1.5 }
  },

  boss: {
    name: 'LA MADRE', hp: 1900, speed: 1.4, damage: 120, attackRate: 0.7,
    coins: 500, scale: 3.4, color: 0xe0a397, accent: 0x9a5b52, boss: true, wide: true
  }
}

// Con qué se empieza. El resto se gana jugando: doce cartas de golpe en la
// primera partida es un muro, y además no hay forma de aprender para qué sirve
// cada una si aparecen todas a la vez. Cada nivel superado abre dos o tres.
export const INICIALES = ['archer', 'rifle', 'sandbags', 'grenade']

// Un nivel = oleadas contadas + jefe. `gap` son los segundos de calma antes de la oleada.
// La calma se acorta según avanza: al final apenas te da tiempo a recolocar.
//
// El primero enseña, el segundo aprieta, el tercero es el que tenías. El orden
// de los enemigos no es decorativo: cada nivel presenta como mucho dos maneras
// nuevas, porque si aparecen tres a la vez el jugador no sabe cuál le ha roto
// la línea y se lleva la impresión de que el juego hace trampas.
// La campaña vive en campana.js: doce destinos por el mundo, cada uno con su
// sitio en el mapa, su peaje de estrellas y su tabla de oleadas de oleadas.js.
// Aquí solo se reexporta para no romper a quien ya importaba NIVELES de config.
export { DESTINOS as NIVELES } from './campana.js'
