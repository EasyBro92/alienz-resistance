// Cómo se viste cada ciudad.
//
// `lugares.js` tiene los nueve tipos de sitio; aquí está qué tipo le toca a cada
// misión y con qué colores, alturas, árboles y adornos, buscando en cada caso
// cómo es el sitio de verdad. Isidro: «busca cada ciudad, playa etc y haz que se
// parezca», «valora cada mapa por diferente».
//
// Cada entrada lleva un comentario con qué se está copiando, porque dentro de un
// año nadie va a recordar por qué las fachadas de Salónica son bloques de
// hormigón y las de Roma tienen persianas.
//
// `semilla` es lo que hace que un sitio se vea SIEMPRE igual: el azar del
// módulo es repetible y esa semilla es su entrada. Dos ciudades no comparten
// semilla para que no salgan con los edificios en el mismo orden.

import { TIPOS } from './lugares.js'

export const CIUDADES = {
  // --- España ---------------------------------------------------------------
  // Playa del Miracle, con el anfiteatro romano en el talud y el mar al este.
  // Tarragona no tiene ni una torre: es ciudad baja de piedra dorada.
  tarragona: ['paseo', {
    semilla: 101, tono: 0xdad2c2, ladoMar: -1, tonoArena: 0xe8d9b6, tonoAgua: 0x2f7f96,
    estilo: 'europeo', paleta: [0xd8c9a8, 0xc9b894, 0xbfab86], alturas: [7, 13], tejado: 0x9b5b3c,
    farolas: 'fernandina', arboles: 'palmera', arbolesMar: 'palmera', pretil: 'piedra',
    cierre: 'monte', tonoMonte: 0x7e7a5e
  }],
  // Ciudad de las Artes: hormigón blanco, láminas de agua turquesa y formas
  // curvas. Aquí no hay arena: el agua es de los estanques.
  valencia: ['paseo', {
    semilla: 102, tono: 0xe8e5dc, brillo: 0.6, ladoMar: -1, arena: false, tonoAgua: 0x36b0bd,
    estilo: 'moderno', paleta: [0xf2f0ea, 0xe6e3da, 0xdcd8cd], alturas: [8, 16],
    farolas: 'recta', arboles: 'palmera', pretil: 'piedra', cierre: 'perfil',
    perfil: [16, 22, 18, 26], tonoPerfil: 0xd6d2c8
  }],

  // --- Francia --------------------------------------------------------------
  // Vieux Port: el agua entra hasta el centro, los barcos amarrados de proa al
  // muelle, las fachadas ocres con persianas y Notre-Dame de la Garde arriba.
  marsella: ['muelle', {
    semilla: 103, tono: 0xc9c2b2, ladoAgua: -1, tonoAgua: 0x2f7a86, barcas: true,
    estilo: 'europeo', paleta: [0xdcc9a4, 0xcbb389, 0xc2a57c], alturas: [12, 20], tejado: 0x9b5b3c,
    farolas: 'fernandina', cierre: 'monte', tonoMonte: 0x8a8164
  }],
  // Ribera del Ródano: el agua verde, las barcazas-bar amarradas, los tejados
  // rojos de la Presqu'île y la colina de Fourvière cerrando.
  lyon: ['paseo', {
    semilla: 104, tono: 0xbdb5a4, ladoMar: -1, arena: false, tonoAgua: 0x4a6b52,
    estilo: 'europeo', paleta: [0xd8c4a0, 0xc9ae87, 0xd2b893], alturas: [13, 21], tejado: 0x9b4a34,
    farolas: 'fernandina', arboles: 'copa', pretil: 'piedra',
    cierre: 'monte', tonoMonte: 0x6f7a5c
  }],
  // Campo de Marte: gravilla, setos recortados, los plátanos en fila y la torre
  // justo encima. En París no hay rascacielos en el centro.
  paris: ['explanada', {
    semilla: 105, tono: 0xc4b79c, bordes: 'setos', arboles: 'copa',
    estilo: 'europeo', paleta: [0xdfd5c0, 0xd4c8b0, 0xcabda4],
    alturas: [16, 22], tejado: 0x5a6068, remate: 0xc8bda6,
    farolas: 'fernandina', cierre: 'fachada'
  }],

  // --- Italia ---------------------------------------------------------------
  // Anillo sur bajo el Vesubio: bloques napolitanos apiñados, persianas,
  // buganvillas, y el volcán cerrando el fondo.
  napoles: ['avenida', {
    semilla: 106, tono: 0x6f6b66, tonoAcera: 0x9c968c, volcan: true, tonoVolcan: 0x39412f, cierre: 'nada',
    estilo: 'europeo', paleta: [0xd8b98e, 0xc9a273, 0xcdb290, 0xbf9a6e], alturas: [14, 24], tejado: 0x8d5c3f,
    // El que cierra la bahía es el Vesubio, no unos cerros cualquiera.
    arboles: 'copa', coches: true, paletaCoches: [0x8d2a2a, 0x24405e, 0xd9d4cc, 0x3d5c3a]
  }],
  // Via dei Fori Imperiali: adoquín, los foros en ruinas a los dos lados, los
  // pinos piñoneros y el Coliseo cerrando la calle.
  roma: ['avenida', {
    semilla: 107, tono: 0x87817a, tonoAcera: 0xa39c91, marcas: false,
    estilo: 'europeo', paleta: [0xd8b487, 0xc99a6a, 0xcaa678], alturas: [12, 18], tejado: 0x9b5b3c,
    arboles: 'pino', coches: false, ruinas: true,
    cierre: 'monte', tonoMonte: 0x6b6a52
  }],
  // Piazza del Duomo: el empedrado en abanico, los pórticos de la plaza y la
  // Galería. Aquí no se ve ni un rascacielos, así que no hay perfil de torres.
  milan: ['plaza', {
    semilla: 108, tono: 0x9e988e, farolas: 'fernandina',
    estilo: 'colonial', paleta: [0xdcd2bc, 0xd0c4ab, 0xc7b99f], alturas: [17, 22], remate: 0xc2b498,
    cierre: 'fachada'
  }],

  // --- Grecia ---------------------------------------------------------------
  // Paseo de mármol de Dionisiou Areopagitou, al pie de la Acrópolis: losa
  // blanca pulida, olivos grises y la roca subiendo al fondo.
  atenas: ['explanada', {
    semilla: 109, tono: 0xe4ddcc, brillo: 0.7, bordes: 'murete', arboles: 'olivo',
    farolas: 'fernandina', cierre: 'monte', tonoMonte: 0x9a9280
  }],
  // Nea Paralia: el paseo nuevo, el golfo Termaico y detrás los bloques de pisos
  // de los años sesenta, que es de lo que está hecha Salónica.
  salonica: ['paseo', {
    semilla: 110, tono: 0xc6c0b2, ladoMar: -1, arena: false, tonoAgua: 0x35768f,
    estilo: 'moderno', paleta: [0xd6d1c6, 0xc6c1b6, 0xbdb7ab], alturas: [16, 26],
    farolas: 'recta', pretil: 'piedra', cierre: 'monte', tonoMonte: 0x7b8272
  }],
  // El espigón veneciano de Heraclión: se va por el rompeolas con agua a los DOS
  // lados y la fortaleza Koules al final. Por eso aquí el campo es de tres.
  heraclion: ['muelle', {
    semilla: 111, tono: 0xd4ccb8, ladoAgua: 0, tonoAgua: 0x2f8ba0, barcas: true, carriles: 3,
    tonoCanto: 0xcfc2a4, cierre: 'monte', tonoMonte: 0x8f8a6e
  }],

  // --- Egipto ---------------------------------------------------------------
  // El Corniche: la bahía en curva, el muro contra el oleaje y una pared de
  // edificios beige de diez plantas sin un hueco. Alejandría es llana.
  alejandria: ['paseo', {
    semilla: 112, tono: 0xc4bda8, ladoMar: -1, arena: false, tonoAgua: 0x2d7f92, pretil: 'muro',
    estilo: 'moderno', paleta: [0xd8cfb4, 0xcabf9f, 0xc0b596], alturas: [20, 30], doblefila: true,
    farolas: 'recta', arbolesMar: 'palmera', cierre: 'perfil',
    perfil: [22, 28, 24, 30], tonoPerfil: 0xc6bca0
  }],
  // Avenida de las esfinges de Karnak: dos filas de carneros echados y los
  // pilonos al fondo por donde se entra al templo.
  luxor: ['explanada', {
    semilla: 113, tono: 0xd9c08f, bordes: 'esfinges', tonoBordes: 0xd2bc92, tonoDuna: 0xd2b47e,
    puerta: 'pilonos', tonoPuerta: 0xd6c193, carriles: 4,
    cierre: 'monte', tonoMonte: 0xc2a97c
  }],
  // Gizeh: la meseta de arena, las pirámides y la Esfinge. Al atardecer, que es
  // cuando se ven de ese color.
  elCairo: ['explanada', {
    semilla: 114, tono: 0xd8bf92, bordes: 'dunas', tonoDuna: 0xd2b47e,
    // Sin cerros: los montículos del cierre caían justo delante de las
    // pirámides y, siendo del mismo color arena, se las tragaban. Aquí lo que
    // cierra el fondo SON las pirámides.
    piramides: true, cierre: 'nada'
  }],

  // --- Nigeria --------------------------------------------------------------
  // Third Mainland Bridge: once kilómetros de viga baja sobre la laguna, sin
  // torres ni tirantes, con los danfos amarillos parados en el atasco.
  lagos: ['puente', {
    semilla: 115, tono: 0x64666a, estructura: 'pilas', carriles: 5, yAgua: -9,
    tonoAgua: 0x3f6b52, tonoHormigon: 0xcfcabc,
    cierre: 'perfil', perfil: [18, 26, 34, 22], tonoPerfil: 0xb6b2a4
  }],
  // La explanada de Aso Rock: el monolito de gneis de cuatrocientos metros, la
  // tierra roja y la mezquita nacional con la cúpula dorada.
  abuja: ['explanada', {
    semilla: 116, tono: 0xc08a5e, bordes: 'setos', arboles: 'copa',
    farolas: 'recta', cierre: 'monte', tonoMonte: 0x8a8076
  }],
  // Mercado de Kurmi: la muralla de adobe de la ciudad vieja, los puestos con
  // toldos de colores y el polvo del Sahel.
  kano: ['plaza', {
    // Las fachadas van más lejos que en las demás plazas: el muro de adobe
    // lleva contrafuertes y los palos de andamio permanentes, y todo eso
    // SOBRESALE hacia la calle.
    semilla: 117, tono: 0xc9a173, desdeX: 9.4,
    estilo: 'adobe', paleta: [0xc39a68, 0xb88d5c, 0xcaa574], alturas: [6, 11],
    puestos: true, tonoToldo: 0xc4552f, cierre: 'fachada'
  }],

  // --- India ----------------------------------------------------------------
  // Bandra-Worli Sea Link: atirantado, sobre el mar Arábigo, con Marine Drive
  // al fondo. Tres carriles porque se pelea en la calzada.
  bombay: ['puente', {
    semilla: 118, tono: 0x6b6d70, estructura: 'tirantes', carriles: 3, yAgua: -15,
    tonoAgua: 0x2c6f80, tonoHormigon: 0xe4e1d8,
    cierre: 'perfil', perfil: [24, 32, 28, 36], tonoPerfil: 0xc2b8a2
  }],
  // Rajpath: la avenida ceremonial de Delhi, con los estanques a los lados, el
  // arenisco rosa y la Puerta de la India cerrando.
  delhi: ['avenida', {
    semilla: 119, tono: 0xcbb096, tonoAcera: 0x6f7a52, marcas: false, canales: true,
    estilo: 'colonial', paleta: [0xc98d6a, 0xba7e5c, 0xd09a75], alturas: [11, 16], remate: 0xc2a081,
    arboles: 'copa', coches: false, cierre: 'monte', tonoMonte: 0x8e8a70
  }],
  // Puente de Howrah: celosía de acero remachado —no lleva un solo tornillo—,
  // los tranvías y el mercado de flores de Mullick Ghat debajo.
  calcuta: ['puente', {
    semilla: 120, tono: 0x63656a, estructura: 'celosia', carriles: 4, yAgua: -13,
    tonoAgua: 0x6b6244, tonoAcero: 0x9aa0a6, tranvia: true, ladoTranvia: 1, puestos: true,
    cierre: 'perfil', perfil: [14, 20, 16, 24], tonoPerfil: 0xafa896
  }],

  // --- China ----------------------------------------------------------------
  // Puente de Nanpu: atirantado sobre el Huangpu, con su rampa en espiral —lo
  // que hace que ese puente sea ese puente— y las torres de Pudong al fondo.
  shanghai: ['puente', {
    semilla: 121, tono: 0x5e6266, estructura: 'tirantes', carriles: 4, yAgua: -20,
    tonoAgua: 0x4a5f68, espiral: true,
    cierre: 'perfil', perfil: [42, 64, 90, 48, 56], tonoPerfil: 0x8fa2b4
  }],
  // Avenida Chang'an frente a Tiananmén: diez carriles de losa gris, los
  // farolillos rojos y la puerta de la Ciudad Prohibida.
  pekin: ['avenida', {
    semilla: 122, tono: 0x8d8a82, tonoAcera: 0xb0aaa0, marcas: false, farolillos: true,
    estilo: 'chino', paleta: [0xbfb3a0, 0xb0a494, 0xc6bbaa], alturas: [12, 18],
    arboles: 'copa', coches: false, cierre: 'fachada'
  }],
  // Yuzhong: la rampa sobre el Yangtsé con Hongyadong colgado de la ladera —once
  // pisos de balcones de madera y farolillos— y el monorraíl pasando.
  chongqing: ['mirador', {
    semilla: 123, tono: 0x7e7870, ladoRio: -1, tonoAgua: 0x4a5f4d, monorail: true,
    tonoMadera: 0x6b3f2a, tonoAlero: 0x2f2a26, cierre: 'monte', tonoMonte: 0x5e6a5a
  }],

  // --- Rusia ----------------------------------------------------------------
  // Puente del Obi: arcos de acero, el hielo del río en placas y la ópera al
  // fondo. Novosibirsk en invierno.
  novosibirsk: ['puente', {
    semilla: 124, tono: 0x8e9094, estructura: 'arcos', carriles: 4, yAgua: -17,
    tonoAgua: 0x5b6b72, tonoAcero: 0xa9aeb4, hielo: true,
    cierre: 'perfil', perfil: [14, 20, 26, 18], tonoPerfil: 0xb4b8bc
  }],
  // Plaza Roja: el adoquín, la muralla del Kremlin con las almenas de cola de
  // golondrina a un lado y la fachada del GUM al otro.
  moscu: ['plaza', {
    semilla: 125, tono: 0x8f857c, muralla: true, ladoMuralla: -1, farolas: 'fernandina',
    lados: [
      // Derecha: el GUM, tres plantas de piedra clara con arcadas.
      { estilo: 'colonial', paleta: [0xd8cfc0, 0xcdc3b2, 0xc4b9a6], alturas: [13, 16], remate: 0xbfb3a0 },
      // Izquierda: detrás de la muralla asoman los palacios del Kremlin.
      { estilo: 'europeo', paleta: [0xd4c7a8, 0xc9bb9a], alturas: [18, 24], tejado: 0x4f6b52 }
    ],
    cierre: 'fachada'
  }],

  // --- Estados Unidos -------------------------------------------------------
  // Seward Highway por la ensenada de Turnagain: el agua del fiordo a un lado,
  // la pared de montaña al otro y abetos. Aquí una carretera SÍ es el sitio.
  anchorage: ['campo', {
    semilla: 126, tono: 0x5e6266, tonoCuneta: 0xd6dde2, ladoAgua: -1, tonoAgua: 0x50707e,
    arboles: 'pino', cierre: 'monte', tonoMonte: 0x7f8894
  }],
  // I-5 junto al puerto: el viaducto, los bloques de cristal del centro, las
  // grúas del muelle y la llovizna del Pacífico.
  seattle: ['avenida', {
    semilla: 127, tono: 0x63666b, tonoAcera: 0x9a9ea2, gruas: true, tonoGrua: 0xc8462f,
    estilo: 'moderno', paleta: [0x9aa4ac, 0x8d98a2, 0xa6afb6], alturas: [24, 40],
    coches: true, paletaCoches: [0x2c3f52, 0x8d2a2a, 0xd9d4cc, 0x3d4c3a],
    cierre: 'perfil', perfil: [30, 44, 58, 36], tonoPerfil: 0x8b98a6
  }],
  // Quinta Avenida: rascacielos de piedra a los dos lados, las banderas
  // saliendo de las fachadas, los taxis amarillos y el Empire State al fondo.
  nuevaYorkQuinta: ['avenida', {
    semilla: 128, tono: 0x5e6165, tonoAcera: 0xa8a49c, banderas: true, tonoBandera: 0xc4303a,
    estilo: 'rascacielos', paleta: [0x8e8579, 0x9c9287, 0x7d7469, 0xa39a8d], alturas: [34, 62],
    coches: true, paletaCoches: [0xe8b528, 0xe8b528, 0x2c2f33, 0xd9d4cc],
    cierre: 'perfil', perfil: [60, 88, 120, 70], tonoPerfil: 0x8a92a0
  }],
  // Times Square de noche: las pantallas son el sitio. Van siempre, no solo en
  // ultra, y son las que dan toda la luz.
  nuevaYorkTimes: ['avenida', {
    semilla: 129, tono: 0x4a4d52, tonoAcera: 0x8e8a84, pantallas: true,
    estilo: 'neon', paleta: [0x4a4f57, 0x3f444b, 0x565c64], alturas: [30, 54],
    coches: true, paletaCoches: [0xe8b528, 0xe8b528, 0x2c2f33],
    cierre: 'fachada'
  }],
  // Isla de la Libertad: la explanada del pedestal, el agua de la bahía
  // alrededor y Manhattan lejos, al otro lado. La estatua ya no está plantada en
  // medio de la ciudad, que era lo que chirriaba.
  nuevaYorkIsla: ['isla', {
    semilla: 130, tono: 0xb9b2a4, carriles: 4, tonoAgua: 0x39647b, arboles: 'copa',
    cierre: 'perfil', perfil: [50, 74, 104, 60], tonoPerfil: 0x93a0ae
  }],

  // --- México ---------------------------------------------------------------
  // Macroplaza: la explanada más grande de América, el Faro del Comercio con su
  // láser verde y el Cerro de la Silla cerrando el valle.
  monterrey: ['plaza', {
    semilla: 131, tono: 0xb0a89a, farolas: 'recta', arboles: 'copa',
    estilo: 'moderno', paleta: [0xc9bfae, 0xbcb2a0, 0xd0c7b6], alturas: [16, 28],
    cierre: 'monte', tonoMonte: 0x7a7a68
  }],
  // Plaza de Armas: el kiosco de hierro, los portales con arcadas y la catedral
  // de las dos torres con teja amarilla.
  guadalajara: ['plaza', {
    semilla: 132, tono: 0x9e948a, farolas: 'fernandina', arboles: 'copa',
    estilo: 'colonial', paleta: [0xd8c4a0, 0xcbb389, 0xd2bc98], alturas: [11, 15], remate: 0xc2a882,
    cierre: 'fachada'
  }],
  // Paseo de la Reforma: la glorieta del Ángel, los jacarandás en flor y las
  // torres de cristal del tramo nuevo.
  ciudadDeMexico: ['avenida', {
    semilla: 133, tono: 0x6b6e72, tonoAcera: 0xa49e94, arboles: 'jacaranda',
    estilo: 'moderno', paleta: [0x9aa2ac, 0xc9bfae, 0x8d96a0], alturas: [26, 44],
    coches: true, paletaCoches: [0x2c3f52, 0x8d2a2a, 0xd9d4cc, 0x2f6b4a],
    cierre: 'perfil', perfil: [34, 52, 68, 40], tonoPerfil: 0x8e9aa8
  }],

  // --- República Dominicana -------------------------------------------------
  // Playa Bávaro: tarima de madera entre las palmeras, hamacas, agua turquesa y
  // hoteles bajos escondidos entre la vegetación. Llano y sin torres.
  puntaCana: ['paseo', {
    semilla: 134, tono: 0xb08a5e, brillo: 0.85, ladoMar: -1, tonoArena: 0xf0e4c4,
    tonoAgua: 0x2fb6b0, tonoSombrilla: 0xe4d9bc,
    estilo: 'colonial', paleta: [0xe8dcc4, 0xd9cdb2, 0xe0d6bf], alturas: [5, 9], remate: 0xd4c8ac,
    arboles: 'palmera', arbolesMar: 'palmera', pretil: 'piedra', cierre: 'nada'
  }],
  // Zona Colonial: la calle Las Damas, la más antigua de América. Adoquín,
  // muros de piedra de coral y el Alcázar de Colón al fondo.
  santoDomingo: ['plaza', {
    semilla: 135, tono: 0x8f867a, carriles: 4, farolas: 'fernandina',
    estilo: 'colonial', paleta: [0xd8c9a8, 0xc9b894, 0xd2bfa0], alturas: [9, 13], remate: 0xc2b090,
    cierre: 'fachada'
  }],
  // Fortaleza de San Felipe sobre el malecón, con el Pico Isabel de Torres
  // detrás —el del teleférico— cerrando el fondo.
  puertoPlata: ['paseo', {
    semilla: 136, tono: 0xc2baa8, ladoMar: -1, arena: false, tonoAgua: 0x2f9aa8, pretil: 'muro',
    estilo: 'colonial', paleta: [0xe0d2b8, 0xd2c4a8, 0xd8cbb0], alturas: [6, 11], remate: 0xcabb9c,
    arboles: 'palmera', arbolesMar: 'palmera', cierre: 'monte', tonoMonte: 0x5e7a56
  }],

  // --- Brasil ---------------------------------------------------------------
  // Copacabana: la baldosa de olas portuguesa, los quioscos, la pared de
  // edificios de la avenida Atlántica y los morros detrás.
  rio: ['paseo', {
    semilla: 137, tono: 0xe0dcd2, ladoMar: -1, tonoArena: 0xe8dcb8, tonoAgua: 0x2f7f8e,
    estilo: 'moderno', paleta: [0xe4ded0, 0xd6d0c2, 0xdcd6c8], alturas: [26, 40], doblefila: true,
    arboles: 'palmera', arbolesMar: 'palmera', pretil: 'piedra',
    cierre: 'monte', tonoMonte: 0x4f6b4a
  }],
  // Plaza São Sebastião: el mismo empedrado en olas que Copacabana —lo trajeron
  // de Lisboa los dos—, el Teatro Amazonas con su cúpula de mosaico y la selva.
  manaos: ['plaza', {
    semilla: 138, tono: 0xc6bca8, farolas: 'fernandina', arboles: 'copa', puestos: true,
    estilo: 'colonial', paleta: [0xd8c4a8, 0xc9ae8c, 0xd4bc9c, 0xc2a884], alturas: [8, 13], remate: 0xc2ac8c,
    tonoToldo: 0x3d7a4a, cierre: 'monte', tonoMonte: 0x3f5e3a
  }]
}

// Los constructores, uno por ciudad, listos para `ESCENARIOS`. Se construyen
// perezosamente: `world.js` solo llama al de la misión que se está cargando.
export const LUGARES = {}
for (const [clave, [tipo, vestido]] of Object.entries(CIUDADES)) {
  LUGARES[clave] = () => {
    const g = TIPOS[tipo]({ ...vestido })
    // Un lugar se traga el decorado de carretera (arenal, vegetación, cerros,
    // mobiliario) pero NO el monumento de la ciudad: `world.js` lo ve por esta
    // marca y lo coloca cerrando el eje de la calle.
    g.userData.conHitos = true
    // Con nombre: sirve para saber desde fuera qué sitio se está viendo, que es
    // como se comprueba que una captura es del mapa que dice ser.
    g.name = 'lugar:' + clave
    return g
  }
}
