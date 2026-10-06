// Todos los números del juego viven aquí. Para reequilibrar, toca solo este archivo.

export const FIELD = {
  lanes: 5,
  laneWidth: 2.4,
  rows: 4,          // filas donde se pueden colocar soldados
  rowDepth: 3.2,    // separación entre filas
  baseZ: 4,         // línea de la base (los zombis que llegan aquí hacen daño)
  frontRowZ: 0,     // fila de colocación más cercana a la base
  spawnZ: -44,      // aparecen al fondo, junto al horizonte, no a media pista
  // Carriles abiertos. Casi siempre los cinco, pero los tramos que se juegan
  // DENTRO de algo estrechan el campo: en el puente de Vladivostok se pelea en
  // la calzada y las aceras quedan cerradas tras la barrera.
  //
  // Se estrecha cerrando carriles, no cambiando `lanes`: el ancho de la
  // calzada, los chevrones, las vallas y la rejilla de casillas se construyen
  // una sola vez a partir de `lanes`, y tocarlo obligaría a rehacer toda esa
  // geometría en cada misión.
  primerCarril: 0,
  ultimoCarril: 4,
  // Dónde aparecen los huéspedes. Normalmente en la punta de la rampa de la
  // nave, a la altura de `spawnZ`. En duelo y arena la nave se posa en el
  // HORIZONTE y vienen andando desde mucho más atrás: Isidro no quería que se
  // notara el momento en que aparecen, sino que parezca que llevan rato
  // caminando y van saliendo de la niebla.
  entradaZ: -44,
  // En la arena bajan por la grada, que es una escalera de verdad: aparecen en
  // el escalón de arriba y se reparten a lo ancho de ella. En campaña salen por
  // la rampa de la nave, que mide 7,2, y ahí el abanico tiene que ser estrecho.
  porElFondo: false,
  entradaAncho: 6
}

// -82 y no más lejos por una razón medida: la niebla cierra del todo a 152 de
// la cámara (que está en z≈22), así que a -82 ya se ven borrosos y pequeños
// pero se ven. Más atrás no se distinguirían y la primera oleada tardaría medio
// minuto en llegar.
export function entrarPorElFondo (on) {
  FIELD.porElFondo = on
  // -82 es solo el valor de partida: en cuanto la arena está cargada, el mundo
  // mide dónde queda el escalón más alto de la grada y lo corrige (ver
  // `cimaGrada` en world.js). Cada arena tiene la suya.
  FIELD.entradaZ = on ? -82 : FIELD.spawnZ
  FIELD.entradaAncho = on ? 1.4 : 6
}

export const carrilAbierto = l => l >= FIELD.primerCarril && l <= FIELD.ultimoCarril
export const carrilesAbiertos = () => {
  const a = []
  for (let l = FIELD.primerCarril; l <= FIELD.ultimoCarril; l++) a.push(l)
  return a
}
// Deja abiertos `cuantos` carriles centrados. Los que sobran se cierran a
// partes iguales por los dos lados.
export function estrecharCampo (cuantos = FIELD.lanes) {
  const sobran = Math.max(0, FIELD.lanes - cuantos)
  FIELD.primerCarril = Math.floor(sobran / 2)
  FIELD.ultimoCarril = FIELD.lanes - 1 - Math.ceil(sobran / 2)
}

export const BASE = { hp: 100 }

// Economía: el goteo automático te da aire, las bajas te dan el sueldo de verdad.
export const ECONOMY = {
  startCoins: 200,
  // Parte de las `coins` de su ficha que suelta cada huésped al morir. Bajado un
  // 25 %: los billetes salen de las monedas y tienen que costar partidas.
  botinHuesped: 0.75,
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
  // La octava. Va entre el Ametrallador y el Mortero de precio, pero no es un
  // punto intermedio: hace algo que no hace nadie. El Escopetero salpica a los
  // lados, el Mortero cae en corro, y este abre un PASILLO —revienta al que
  // toca y sigue reventando por detrás, a lo largo del carril—. Contra una fila
  // que baja en columna no hay nada mejor; contra uno suelto es un desperdicio.
  misil: {
    name: 'Misilera', cost: 290, hp: 95, color: 0xe0559b, accent: 0x7a2352,
    damage: 74, fireRate: 0.5, range: 30, armorPierce: 0.9, splash: 2.6, misilShot: true,
    magazine: 1, reloadTime: 1.8,
    // Rasgo: la estela. Lo que quede detrás del impacto, en el mismo carril y
    // hasta nueve de fondo, también se lo come (menos cuanto más lejos).
    estela: 9,
    blurb: 'Misil directo que revienta al primero y sigue abriendo pasillo por detrás. Lenta y cara.'
  },
  mortar: {
    name: 'Mortero', cost: 320, hp: 90, color: 0xd9c23a, accent: 0x5f5218,
    damage: 90, fireRate: 0.4, range: 40, armorPierce: 0.8, splash: 4.2, mortarShot: true,
    magazine: 1, reloadTime: 1.4,
    // Rasgo: apunta donde hay más juntos, no al que va primero.
    buscaCorro: true,
    blurb: 'Bomba en arco que cae donde más apretados van. Lento, caro y devastador.'
  },
  // El Capitán no se compra: solo sale del cofre, y casi nunca. Es el premio
  // más raro del juego, así que no puede ser "un fusilero mejor": hace algo que
  // no hace nadie más, tirar del resto de la línea.
  capitan: {
    name: 'Capitán Cuervo', cost: 300, hp: 190, color: 0xd8b04a, accent: 0x6b4f14,
    damage: 22, fireRate: 2.4, range: 22, armorPierce: 0.45,
    magazine: 12, reloadTime: 1.2,
    // Rasgo: los soldados de su carril y de los de al lado disparan más rápido.
    anima: { factor: 1.25, carriles: 1 },
    blurb: 'No se compra: solo sale de la caja alienígena. Su carril y los de al lado disparan un 25% más rápido.'
  },

  // --- Las cinco de la caja alienígena (06/10) ----------------------------------
  // Isidro: «busca fotos de las chicas de Resident Evil y recrea varios
  // personajes»; eligió las cinco, como personajes NUEVOS de la caja alienígena
  // (eran los exclusivos que le faltaban) y sin casco, como las originales.
  // Tampoco se compran. Van AL FINAL: las claves viajan por índice en el
  // multijugador.
  //
  // «Se sienten igual que los otros… corrige las armas, alguno pone ballesta pero
  // es solo un arco» (Isidro, el mismo día, al verlas). Así que cada una tiene su
  // CUERPO (`cuerpos.py`), su ARMA propia (`arma`: de ahí salen el modelo de
  // `buildWeapon`, cómo la agarra y cómo suena) y un rasgo que no tiene nadie.
  //
  // Jill: la pistola. Rapidísima, se asienta en el blanco y además lo frena.
  jill: {
    name: 'Jill', cost: 280, hp: 170, color: 0x3f6fd0, accent: 0x1a2f66, arma: 'pistola', sinGalones: true,
    damage: 11, fireRate: 5.0, range: 18, armorPierce: 0.4,
    magazine: 15, reloadTime: 0.8,
    asienta: { porSegundo: 0.3, tope: 0.9 },
    suprime: { factor: 0.75, dura: 0.5 },
    blurb: 'Solo en la caja alienígena. Pistola de las fuerzas especiales: dispara rapidísimo, cada vez más certera, y frena al que le da. Aguanta mucho.'
  },
  // Claire: el lanzagranadas incendiario. Como el Mortero, pero más rápida, de
  // menos pegada, y donde cae la granada el suelo se queda ardiendo.
  claire: {
    name: 'Claire', cost: 300, hp: 130, color: 0xc8323a, accent: 0x5f1418, arma: 'lanzagranadas', sinGalones: true,
    damage: 50, fireRate: 0.75, range: 26, armorPierce: 0.6, splash: 3.2, mortarShot: true,
    magazine: 6, reloadTime: 2.0,
    buscaCorro: true,
    brasas: { daño: 8, dura: 2.6, radio: 1.7 },
    blurb: 'Solo en la caja alienígena. Lanzagranadas incendiario: seis granadas seguidas donde más apretados van, y el suelo se queda ardiendo.'
  },
  // Ada: la ballesta. Silenciosa, busca al más duro y lo deja casi parado.
  ada: {
    name: 'Ada', cost: 290, hp: 110, color: 0xb0183a, accent: 0x4a0a18, arma: 'ballesta', sinGalones: true,
    damage: 46, fireRate: 1.1, range: 36, armorPierce: 0.9,
    magazine: 1, reloadTime: 0.55, projectile: 'arrow', silent: true,
    clava: { factor: 0.4, dura: 3 },
    buscaDuro: true,
    blurb: 'Solo en la caja alienígena. Ballesta: atraviesa blindajes, elige al más duro y lo deja clavado casi en el sitio.'
  },
  // Rebecca: la médica. Dispara poco, pero cura a los suyos mientras aguanta en pie.
  rebecca: {
    name: 'Rebecca', cost: 240, hp: 120, color: 0x3fa060, accent: 0x1a4a2a, arma: 'subfusil', sinGalones: true,
    damage: 8, fireRate: 2.6, range: 15, armorPierce: 0.2,
    magazine: 12, reloadTime: 1.1,
    // Rasgo: cura poco a poco a los soldados de su carril y de los de al lado.
    sana: { porSegundo: 7, carriles: 1 },
    blurb: 'Solo en la caja alienígena. Médica: cura sin parar a los soldados de su carril y de los de al lado.'
  },
  // Sheva: la tiradora rápida. Menos pegada que el Tirador, casi el doble de
  // cadencia, y dispara DE PIE: no se arrodilla, así que no pierde el medio
  // segundo de levantarse cada vez que se la mueve.
  sheva: {
    name: 'Sheva', cost: 300, hp: 110, color: 0x8a5ad0, accent: 0x3a2466, arma: 'dragunov', sinGalones: true,
    damage: 42, fireRate: 1.5, range: 44, armorPierce: 1.0,
    magazine: 6, reloadTime: 1.4,
    buscaDuro: true,
    empuja: 0.8,
    blurb: 'Solo en la caja alienígena. Fusil de tiradora semiautomático: dispara de pie, atraviesa blindajes, elige al más duro y lo echa para atrás.'
  },
  // Sherry: PRUEBA de un modelo hecho fuera (Hunyuan3D), para ver su realismo
  // dentro del juego. Es una `estatua`: viene posada y con su fusil fundido, así
  // que se dibuja quieta en vez de la malla del esqueleto (`sinArma` esconde el
  // arma del juego) y ni anda ni apunta. Para hacerla de verdad hace falta el
  // modelo en pose A y sin arma. Se reduce con `cuerpo_de_fuera.py`.
  sherry: {
    name: 'Sherry', cost: 260, hp: 140, color: 0x6f9fc8, accent: 0x2a4a66, arma: 'rifle', sinGalones: true, sinArma: true, estatua: true,
    damage: 12, fireRate: 3.6, range: 18, armorPierce: 0.4,
    magazine: 20, reloadTime: 1.1,
    asienta: { porSegundo: 0.3, tope: 0.9 },
    blurb: 'Solo en la caja alienígena. De prueba: un modelo realista hecho con otra herramienta. Todavía no anda ni apunta.'
  }
}

// Todas llevan `fija`: son cosas, no soldados. No andan, no se mueven de casilla,
// no marchan al asalto final y no se visten con las mejoras. `blocker` es otra
// cosa: que el bicho se pare delante a morderla. Los erizos son fijos pero NO
// paran (`paso`), y la torreta es fija pero dispara (`dispara`).
export const DEFENSES = {
  sandbags: {
    name: 'Sacos terreros', cost: 45, hp: 300, color: 0xc9b184, accent: 0x8a7350,
    blocker: true, fija: true,
    blurb: 'No dispara. Se lo comen a él mientras los tuyos disparan.'
  },
  spikes: {
    name: 'Alambrada', cost: 80, hp: 150, color: 0x8d949c, accent: 0x4a5058,
    blocker: true, fija: true, thorns: 14,
    blurb: 'Frena y desangra: cada mordisco que recibe se lo devuelve al zombi.'
  },
  // La tercera barrera, y juega distinto a las otras dos. Los sacos aguantan y
  // la alambrada desangra; esta no aguanta nada —doce puntos de vida, el primer
  // mordisco se la lleva— pero al caer revienta y se lleva por delante al corro
  // que tenía encima. Es la respuesta a las hordas apelotonadas de la segunda
  // mitad de la campaña, donde aguantar ya no basta.
  mines: {
    name: 'Carga enterrada', cost: 120, hp: 12, color: 0x6d6a5c, accent: 0xc4622f,
    blocker: true, fija: true, revienta: { daño: 260, radio: 3.6 },
    blurb: 'No aguanta nada. Al romperse revienta y se lleva al corro entero.'
  },
  // Las dos nuevas del 27/09 (Isidro eligió estas entre cuatro). Van AL FINAL:
  // el duelo y el cooperativo mandan las claves por su índice, y meterlas en
  // medio cambiaría el de las que ya había.
  //
  // Erizos checos: no paran a nadie, se pasa entre ellos, pero frenan a todo el
  // que los cruza. Y se gastan: cada bicho que pasa les quita un poco.
  erizos: {
    name: 'Erizos checos', cost: 70, hp: 260, color: 0x5f5851, accent: 0x86512f,
    fija: true, paso: true, frena: { factor: 0.4, desgaste: 0.3 },
    blurb: 'No paran a nadie, pero todo el que los cruza va a menos de la mitad de paso.'
  },
  // Torreta automática: una ametralladora sin soldado. Cara a propósito —Isidro:
  // «la torreta debe ser cara, unos 500», en billetes y en monedas—, y a cambio
  // no recarga nunca, aguanta como tres soldados y no se cansa.
  torreta: {
    name: 'Torreta automática', cost: 500, hp: 420, color: 0x58624b, accent: 0x2c2f30,
    fija: true, dispara: true,
    damage: 11, fireRate: 7, range: 26, armorPierce: 0.25, shake: true,
    magazine: 100000, reloadTime: 0.1,
    blurb: 'Dispara sola a su carril sin parar ni recargar. Cara, pero no se cansa.'
  }
}

// Duelo y cooperativo mandan cada pieza por su ÍNDICE en esta lista, así que lo
// nuevo va siempre AL FINAL, sea soldado o defensa. Las cinco de la caja
// alienígena entraron en SOLDIERS cuando las defensas ya tenían su número:
// contando «soldados y luego defensas» se habrían corrido todas cinco puestos, y
// un móvil sin actualizar vería una torreta donde el otro puso unos sacos.
const TARDIAS = ['jill', 'claire', 'ada', 'rebecca', 'sheva', 'sherry']
export const CLAVES_RED = [
  ...Object.keys(SOLDIERS).filter(k => !TARDIAS.includes(k)),
  ...Object.keys(DEFENSES),
  ...TARDIAS
]

// `recarga`: los segundos que tarda en volver a estar listo después de usarlo.
// Isidro, 27/09: «monedas y recarga», y la recarga «según lo fuerte»: granada y
// botiquín unos diez, lo intermedio veinticinco o treinta, y el misil y el
// bombardeo cuarenta y cinco.
export const STRIKES = {
  grenade: {
    name: 'Granada', cost: 90, damage: 120, radius: 3.4, recarga: 10,
    blurb: 'Barata y a mano. Para un apuro pequeño.'
  },
  airstrike: {
    name: 'Ataque aéreo', cost: 300, damage: 400, radius: 5.5, recarga: 30,
    blurb: 'Arrasa una zona. Para cuando ya no llegas.'
  },
  // El aéreo mata de golpe y se acabó. Este mata poco y sigue matando: deja el
  // asfalto ardiendo veinte segundos, así que no resuelve una oleada, la
  // ESTRANGULA. Contra las hordas largas del final vale más que el golpe seco,
  // y contra un jefe no vale casi nada. Que elija el jugador.
  napalm: {
    name: 'Napalm', cost: 260, damage: 90, radius: 4.6, recarga: 30,
    // Un muro de fuego a lo largo del carril (Isidro, 01/10): siete focos de
    // radio 2,2 en fila son 17 de largo y 4,4 de ancho. Antes eran tres círculos
    // de 4,2: la misma superficie ardiendo, estirada.
    brasas: { daño: 46, dura: 20, radio: 2.2, largo: 7.3, alto: 3.4 },
    blurb: 'Poco golpe y mucho rato: un muro de fuego que arde veinte segundos.'
  },
  // Los cinco del 27/09, elegidos por Isidro entre «opciones típicas de los
  // juegos de resistencia». Cada uno resuelve algo que los otros no.
  //
  // Bombardeo de artillería: no es una zona, es un CARRIL entero, de punta a
  // punta. Contra la columna que viene en fila.
  artilleria: {
    name: 'Bombardeo de artillería', cost: 280, damage: 110, radius: 2.4, recarga: 45,
    proyectiles: 7,
    blurb: 'Siete obuses que barren el carril que toques, del fondo hacia tu línea.'
  },
  // Dron kamikaze: no va donde tocas, va a por el bicho con más vida. Contra
  // los jefes y los colosos, que es donde el aéreo se queda corto.
  dron: {
    name: 'Dron kamikaze', cost: 220, damage: 520, radius: 1.8, recarga: 25,
    blurb: 'Busca al bicho con más vida y se estrella contra él. Para los jefes.'
  },
  // Misil guiado: el golpe más gordo del juego, en un sitio pequeño.
  misilGuiado: {
    name: 'Misil guiado', cost: 340, damage: 800, radius: 2.6, recarga: 45,
    blurb: 'Sube desde tu retaguardia y cae donde toques: el impacto más fuerte que hay.'
  },
  // Campo de minas: se queda. Siete minas que esperan en el suelo a que alguien
  // las pise, cuarenta y cinco segundos.
  campoMinas: {
    name: 'Campo de minas', cost: 220, damage: 150, radius: 2, recarga: 30,
    minas: 7, dura: 45,
    blurb: 'Un avión siembra siete minas en la zona; revientan cuando las pisan.'
  },
  // Botiquín: no mata. Cura al 40 % de su vida a todo lo tuyo que siga en pie.
  botiquin: {
    name: 'Botiquín', cost: 150, cura: 40, recarga: 10,
    blurb: 'Cae en paracaídas y cura de golpe a todos tus soldados y defensas.'
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
// El 2026-09-21, a petición: los pequeños (Portador, Corredor, Sembrador,
// Saltador) un 10% más rápidos y los grandes (Encostrado, Coloso,
// Revientaesporas, LA MADRE) un 15% más duros. Ese orden sí cambia a propósito.
export const ZOMBIES = {
  walker: {
    name: 'Portador', hp: 26, speed: 3.75, damage: 18, attackRate: 1.3,
    coins: 14, scale: 1, color: 0x7fa855, accent: 0x4a6b30
  },
  runner: {
    name: 'Corredor', hp: 17, speed: 7.9, damage: 12, attackRate: 2.0,
    coins: 16, scale: 0.9, color: 0xb8d14a, accent: 0x6d7d24
  },
  armored: {
    name: 'Encostrado', hp: 70, speed: 2.8, damage: 26, attackRate: 1.0,
    coins: 28, scale: 1.1, color: 0x6b7a86, accent: 0x39434b, armor: 0.7
  },
  spitter: {
    name: 'Sembrador', hp: 39, speed: 3.15, damage: 20, attackRate: 0.9,
    coins: 30, scale: 1, color: 0xa05fb8, accent: 0x5c2f6d, rangedAttack: 11
  },
  tank: {
    name: 'Coloso', hp: 340, speed: 1.8, damage: 70, attackRate: 0.8,
    coins: 85, scale: 1.9, color: 0xd39a8f, accent: 0x8d5a52, wide: true
  },
  // --- los cuatro con maneras ------------------------------------------------
  // Cada uno existe para romper UNA forma de jugar. Un enemigo que solo tiene
  // más vida o más velocidad no cambia nada: cambias el número de soldados y ya.
  // Estos obligan a cambiar la línea, que es lo que hace que haya que pensar.

  // Rompe la barrera: la salta. Contra una pared de sacos, esta pasa por encima.
  leaper: {
    name: 'Saltador', hp: 32, speed: 4.6, damage: 22, attackRate: 1.2,
    coins: 22, scale: 0.95, color: 0x4fb8c4, accent: 0x1f5f6b,
    salta: { distancia: 6.5, recarga: 5 }
  },

  // Rompe la aglomeración: al morir revienta y se lleva por delante lo que
  // tenga cerca. Apilar siete soldados en un carril deja de salir gratis.
  bloater: {
    name: 'Revientaesporas', hp: 92, speed: 2.4, damage: 16, attackRate: 0.9,
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
    name: 'LA MADRE', hp: 2185, speed: 1.4, damage: 120, attackRate: 0.7,
    coins: 500, scale: 3.4, color: 0xe0a397, accent: 0x9a5b52, boss: true, wide: true
  }
}

// Con qué se empieza: el arquero y nada más. Todo lo demás se compra en la
// tienda con billetes, que salen jugando. Comprobado que se puede: diez
// arqueros bien puestos ganan Tarragona con el perímetro al 74%, y seis la
// pierden en la última oleada, así que la primera misión se gana pero exige.
export const INICIALES = ['archer']

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
