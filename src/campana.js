// La campaña: trece países, tres misiones en cada uno (Nigeria, una sola: Lagos).
//
// No cayó una nave: llegó una flota, y llevaba años bajando a por gente sin que
// nadie atara los cabos. Lo que devolvían no eran personas: eran huéspedes,
// gente reescrita para tomar el planeta desde dentro. Donde había una ciudad
// montaron un campamento y siguieron trabajando.
//
// Los gobiernos están en búnkeres. Lo que sale arriba son equipos de limpieza
// como el tuyo, un país cada vez, y por eso la campaña se organiza por países:
// cada uno tiene su introducción, sus tres misiones y su desenlace, y la
// historia se cuenta entera a lo largo del viaje en vez de en una sola pantalla.
//
// --- cómo se arma la dificultad ---------------------------------------------
//
// Las seis tablas de oleadas son las de siempre, probadas. Lo que cambia de una
// misión a otra es `dureza` —cuánto aguanta de más el mismo huésped— y sube en
// línea recta de la primera a la última, así que la curva es monótona aunque se
// repitan tablas. Dentro de cada país la tercera misión es la dura, casi
// siempre con jefe: es el desenlace del país.

import { OLEADAS } from './oleadas.js'

// Coordenadas reales a posición en el mapa plano: x de 0 a 1 de -180 a 180 de
// longitud, y de 0 a 1 bajando de +90 a -90 de latitud.
const sitio = (lat, lon) => ({ x: (lon + 180) / 360, y: (90 - lat) / 180 })

// Qué dibujo le toca a cada misión: por TABLA DE OLEADAS, que informa. Dos
// misiones con el mismo dibujo se juegan igual.
const ESCENA = { avanzadilla: 1, formas: 2, madre: 3, contraflujo: 4, colmena: 5, todas: 6 }
const NOMBRE_TABLA = new Map(Object.entries(OLEADAS).map(([nombre, tabla]) => [tabla, nombre]))
export const escenaDe = destino => ESCENA[NOMBRE_TABLA.get(destino.waves)] ?? 1

// --- los trece países ---------------------------------------------------------
//
// `etq` desplaza el nombre del país en el mapa: en Europa cuatro países caen a
// un palmo y centrados encima se pisaban.
//
// `estrellas` es el peaje para ENTRAR en el país, y está calibrado:
//
//   · con tres estrellas por misión se llevan 9 por país. El peaje es 6 por
//     país, así que quien lo haga perfecto no se atasca nunca;
//   · con dos de media se llevan 6 por país: justo el peaje. Pasa, pero sin
//     margen;
//   · por debajo de eso toca volver a un país ya limpiado y mejorar una nota,
//     que es justo para lo que sirve poder volver atrás.
//
// Cada misión puede llevar su propio `bioma`. Hace falta porque algunos biomas
// traen un hito dentro —el volcán, las pirámides— y Roma no puede tener el
// Vesubio detrás ni Alejandría las pirámides de Gizeh.

export const PAISES = [
  {
    nombre: 'España',
    etq: [-6, 2, 'end'],
    bioma: 'mediterraneo',
    mapa: sitio(40.2, -2.5),
    intro: [
      'El primer campamento que se localizó desde el búnker de Madrid estaba a doce kilómetros de Tarragona. Nadie lo había visto montar.',
      'La orden es simple: limpiar la costa, subir hacia el centro y dejar el país en condiciones de que la gente vuelva a salir.'
    ],
    cierre: 'España queda limpia. La primera trampilla de búnker se abre en Madrid, y sale gente que llevaba dos años sin ver el cielo.',
    misiones: [
      {
        name: 'Tarragona', lugar: 'Playa del Miracle · bajo el anfiteatro', mapa: sitio(41.12, 1.25),
        // La playa al pie del anfiteatro romano, hecha en Blender con texturas de
        // verdad (herramientas/blender/lugar_tarragona.py): el anfiteatro viene en el
        // modelo, así que sin hitos.
        escenario: 'tarragonaMiracle', suelo: 'playa', tonoSuelo: 0xe4d5b2, hitos: [],
        resumen: 'El primer contacto. Vienen de frente y poco más.',
        parte: ['Doce kilómetros de asfalto entre su campamento y lo que queda de la ciudad. La orden es de una línea: que no pasen.',
          'Los primeros llegan sin método. Caminan hacia el ruido porque es lo único que les dejaron saber hacer.'],
        cierre: 'Ninguno pasó. Uno llevaba todavía la tarjeta de empleado de una fábrica de Reus.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Valencia', llegada: 'valencia', lugar: 'Ciudad de las Artes · entre las láminas de agua', mapa: sitio(39.47, -0.38), bioma: 'costa',
        // La Ciudad de las Artes y las Ciencias hecha en Blender
        // (herramientas/blender/lugar_valencia.py): hormigón blanco y agua turquesa.
        escenario: 'valenciaArtes', suelo: 'losas', tonoSuelo: 0xe8e5dc, hitos: [],
        // Salen por la puerta del Palau de les Arts (z = -124) y vienen andando
        // por el paseo, sin nave: nacen detrás de la puerta y hasta pasar el puente
        // vienen a cuatro veces su paso, como en Milán.
        entrada: { z: -127, fondo: 6, prisa: { desde: -118, hasta: -70, por: 4 } },
        // De día y con el aire limpio: la bruma del juego lavaba el Palau.
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xcfe2f0, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Ya no vienen todos iguales.',
        parte: ['El puerto era una de sus zonas de descarga. Aquí llegaban los camiones con la gente que desaparecía.',
          'Hay quien escupe y quien salta. El experimento va más avanzado de lo que creíamos.'],
        cierre: 'En los muelles había contenedores con literas dentro. Vacías.',
        waves: OLEADAS.formas
      },
      {
        name: 'Madrid', llegada: 'estadio', lugar: 'Santiago Bernabéu · sobre el césped', mapa: sitio(40.42, -3.70),
        // Se juega DENTRO del estadio, sobre el cesped y con las gradas
        // cerrando los cuatro lados. Es el campo mas ancho del juego: los cinco
        // carriles enteros.
        bioma: 'ciudad', suelo: 'parque', tonoSuelo: 0x3f7a3a, escenario: 'estadio',
        // Al atardecer (Isidro, 02/10): el cielo y la bruma, del color de la luz
        // que lleva horneada el modelo.
        // La bruma, lejos: dentro del estadio no hay aire que lave las gradas.
        fondo: { cielo: 0xeaa56f, niebla: 0xeeae78, nieblaCerca: 130, nieblaLejos: 380 },
        // Ni pájaros ni nubes del juego: cruzaban por dentro del estadio y por
        // delante de la cámara en el vuelo de llegada.
        sinPajaros: true, sinNubes: true,
        resumen: 'Llegan deprisa. Hay que aguantar hasta que abran el búnker.',
        parte: ['El búnker del gobierno está debajo. Para abrir la trampilla hay que dejar la superficie limpia durante una hora entera.',
          'Todo lo que tienen en la zona viene hacia aquí, y viene deprisa.'],
        cierre: 'La trampilla se abre. El primer ministro sube el primero y no dice nada durante un rato largo.',
        waves: OLEADAS.contraflujo
      }
    ]
  },
  {
    nombre: 'Francia',
    etq: [-4, -6, 'end'],
    bioma: 'costa',
    mapa: sitio(46.6, 2.4),
    intro: [
      'Francia no tuvo tiempo de esconder a nadie. Las naves bajaron sobre Marsella de noche y por la mañana la costa entera era suya.',
      'El búnker de París sigue emitiendo. Cada seis horas, la misma frase: seguimos aquí.'
    ],
    cierre: 'París responde por fin con otra frase. Es la primera vez en dieciocho meses que dice algo distinto.',
    misiones: [
      {
        name: 'Marsella', llegada: 'marsella', lugar: 'Vieux Port · muelle de los pescadores', mapa: sitio(43.30, 5.37),
        // El Vieux-Port hecho en Blender (herramientas/blender/lugar_marsella.py):
        // el muelle norte mirando al fondo del puerto, con la bocana a la
        // espalda: los barcos a la derecha y los soportales a la izquierda, por
        // la mañana.
        escenario: 'marsellaPuerto', suelo: 'losas', tonoSuelo: 0xc9c2b2, hitos: [],
        // Desembarcan: nacen dentro de las barcazas varadas en la dársena del
        // fondo, junto al Quai des Belges, y bajan por la rampa al muelle (z = -124), deprisa hasta -74.
        entrada: { z: -130, fondo: 7, prisa: { desde: -120, hasta: -74, por: 4 } },
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Escupen a distancia, saltan las barreras y revientan al caer.',
        parte: ['El campamento del puerto lleva más tiempo montado, y se nota: los huéspedes ya no vienen todos iguales.',
          'No están improvisando. Están probando qué funciona contra nosotros.'],
        cierre: 'Tres formas nuevas en un solo muelle. Esto no es una plaga: es un taller con turnos.',
        waves: OLEADAS.formas
      },
      {
        name: 'Lyon', llegada: 'lyon', lugar: 'Muelle del Saona · bajo Fourvière', mapa: sitio(45.76, 4.84),
        // El muelle del Saona hecho en Blender (herramientas/blender/lugar_lyon.py):
        // el Viejo Lyon y Fourvière al otro lado del río, de día.
        escenario: 'lyonSaona', suelo: 'adoquin', tonoSuelo: 0xbdb5a4, hitos: [],
        // Bajan de Fourvière y cruzan la pasarela: nacen donde llega al muelle
        // (z = -133) y vienen deprisa hasta -80.
        entrada: { z: -131, fondo: 4, prisa: { desde: -128, hasta: -80, por: 3 } },
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Se cosen entre ellos mientras les disparas.',
        parte: ['Encontramos la primera sala de experimentos entera. Camillas, correas, y un olor que no se va de la ropa.',
          'Los de aquí se curan unos a otros. Hay que elegir a quién matar primero.'],
        cierre: 'En la sala había una lista de nombres. Algunos los conocía alguien de la compañía.',
        waves: OLEADAS.colmena
      },
      {
        name: 'París', llegada: 'paris', lugar: 'Campo de Marte · al pie de la torre', mapa: sitio(48.86, 2.35), bioma: 'parque',
        // El Campo de Marte hecho en Blender (herramientas/blender/lugar_paris.py):
        // el paseo de gravilla entre los céspedes, los castaños y la torre al
        // fondo, de día. La torre va dentro del modelo.
        escenario: 'parisMarte', suelo: 'tierra', tonoSuelo: 0xc4b79c, hitos: [],
        // Salen del túnel de debajo de la torre: nacen dentro de la boca, bajo
        // el suelo, y suben por la rampa (el `hueco` de parisMarte).
        entrada: { z: -127, fondo: 3 },
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 160, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'El primer jefe. Le llaman LA MADRE.',
        parte: ['Todo lo que hemos visto en Francia salió de algo que vive debajo de la ciudad.',
          'Detrás de la horda viene algo que nadie ha visto entero. Le llaman LA MADRE porque no supieron llamarla de otra forma.'],
        cierre: 'La MADRE cayó. Debajo había un túnel que baja. Esto no era el nido: era una puerta.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'Italia',
    etq: [2, -6, 'start'],
    bioma: 'volcanico',
    mapa: sitio(42.5, 12.6),
    intro: [
      'Aquí bajaron pronto y bajaron muchos. Nápoles se vació en cuatro días y nadie de fuera vio cómo.',
      'Los túneles de París siguen hacia el sur. Todo apunta a que se juntan en algún punto bajo los Apeninos.'
    ],
    cierre: 'Bajo Milán, el túnel sigue. Hacia el este. Hacia el mar.',
    misiones: [
      {
        name: 'Nápoles', llegada: 'napoles', lugar: 'Lungomare · Castel dell\'Ovo', mapa: sitio(40.85, 14.26), bioma: 'mediterraneo',
        // El paseo marítimo hecho en Blender (herramientas/blender/lugar_napoles.py):
        // el Castel dell'Ovo en su islote y el Vesubio al otro lado de la bahía, de
        // día. Los alienz llegan en nave, como siempre.
        escenario: 'napolesLungomare', suelo: 'losas', tonoSuelo: 0x74747a, hitos: [],
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Todo llega deprisa. Lo que dispara lento no llega a tiempo.',
        parte: ['La ciudad se vació en cuatro días. En el anillo todo llega deprisa.',
          'Lo que dispara lento no llega a tiempo.'],
        cierre: 'Ya no bajan hacia la ciudad: bajan hacia NOSOTROS. Saben que venimos.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Roma', llegada: 'roma', lugar: 'Dentro del Coliseo', mapa: sitio(41.90, 12.50), bioma: 'mediterraneo',
        // El Coliseo por dentro, como está hoy, hecho en Blender
        // (herramientas/blender/lugar_roma.py): la tarima sobre el hipogeo, de día.
        escenario: 'romaColiseo', suelo: 'losas', tonoSuelo: 0x86705a, hitos: [],
        // Las columnas caídas del medio (las mismas del guion de Blender): los
        // alienz las rodean.
        ruina: { x: 0, z: -32, radio: 4.4 },
        // Salen del túnel de la puerta del fondo: nacen dentro, a oscuras, y
        // vienen deprisa hasta la boca (z = -63,5).
        entrada: { z: -86, fondo: 6, prisa: { desde: -84, hasta: -64, por: 3 } },
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Se curan y el caparazón devuelve las balas.',
        parte: ['Han instalado algo dentro del estadio olímpico. Desde el aire se ve la luz verde por las gradas.',
          'Los que protegen la zona vienen blindados. Hace falta con qué atravesarlos.'],
        cierre: 'Dentro del estadio no había nadie. Solo filas de capullos vacíos, abiertos desde dentro.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Milán', lugar: 'Piazza del Duomo', mapa: sitio(45.46, 9.19), bioma: 'mediterraneo',
        // La plaza hecha en Blender (herramientas/blender/lugar_milan.py): el arco de
        // la Galleria al fondo, el Duomo a la derecha a lo largo del campo y los
        // pórticos en la línea de la Galleria.
        // Sin monumento aparte: el Duomo viene en el modelo.
        escenario: 'milanDuomo', suelo: 'losas', tonoSuelo: 0x8e8983, hitos: [],
        // Salen de la galería, por debajo del arco: nacen al fondo de ella, entre
        // z = -120 y -130, donde la niebla ya los tapa (en el eje cierra del todo
        // a -140), y la cara del arco está en -40. Hasta -105 vienen a cuatro
        // veces su paso y van frenando hasta el suyo a -68, antes de verse bien.
        // Sin nave.
        entrada: { z: -120, fondo: 10, prisa: { desde: -105, hasta: -68, por: 4 } },
        // Sin pájaros ni nubes: la bandada, los buitres y las nubes, que vuelan
        // bajas, cruzaban por dentro del Duomo y de la Galleria.
        sinPajaros: true, sinNubes: true,
        // Al anochecer, como en las fotos de la plaza: el cielo azul arriba, rosa
        // en el horizonte, y los escaparates de la galería encendidos.
        fondo: { hora: 'ocaso', cielo: 0x7f9cc8, niebla: 0xd9b9b4 },
        resumen: 'Formas nuevas. Aquí prueban cosas.',
        parte: ['Milán era su laboratorio de diseño. Lo que funcionaba aquí lo copiaban en el resto de Europa.',
          'Espera formas que no has visto nunca.'],
        cierre: 'Quemamos los planos. Tardarán en rehacerlos, pero los rehacerán.',
        // Isidro, después de jugarla: «el nivel es muy fácil, haz las hordas más
        // largas, pero solo en este mapa». La misma tabla con cada horda de 1,75
        // veces más bichos y saliendo algo más seguidos.
        waves: alargar(OLEADAS.formas, 1.75, 0.85)
      }
    ]
  },
  {
    nombre: 'Grecia',
    etq: [6, 7, 'start'],
    bioma: 'egeo',
    mapa: sitio(39.0, 22.0),
    intro: [
      'El túnel sale al mar en el Pireo. Grecia fue su puerto de salida hacia África.',
      'Por aquí pasaron barcos enteros de gente dormida. Los registros de la capitanía siguen en la oficina, con las fechas.'
    ],
    cierre: 'Los registros acaban en una fecha: la del último barco. Iba a Alejandría.',
    misiones: [
      {
        name: 'Atenas', llegada: 'atenas', lugar: 'Acrópolis · frente al Partenón', mapa: sitio(37.94, 23.65),
        // Arriba, en la roca, hecho en Blender (herramientas/blender/lugar_atenas.py):
        // el Partenón de frente al fondo, las Cariátides a la izquierda, al atardecer.
        escenario: 'atenasAcropolis', suelo: 'losas', tonoSuelo: 0xb39c82, hitos: [],
        // Salen del Partenón: nacen dentro, sobre el pozo, y vienen deprisa hasta
        // el pórtico. Las columnas del centro (las mismas del guion de Blender,
        // las dos filas) las esquivan: cada carril pasa por su hueco.
        entrada: { z: -84, fondo: 6, prisa: { desde: -82, hasta: -67, por: 3 } },
        columnas: [-4.5, -1.5, 1.5, 4.5].flatMap(x => [{ x, z: -62.95, radio: 1.5 }, { x, z: -66.15, radio: 1.5 }]),
        // `cupula`: el cielo de la partida, del mismo atardecer que el del vuelo;
        // `sol`: la luz naranja sobre soldados y alienz.
        fondo: { hora: 'ocaso', cielo: 0xd9a27c, niebla: 0xe6b796, nieblaCerca: 150, nieblaLejos: 470, cupula: [0x8f84b4, 0xf2aa7a], sol: 0xffc890 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Se curan entre ellos y el caparazón devuelve las balas.',
        parte: ['El templo está lleno. No de cuerpos: de estructura.',
          'Han dejado de fabricar soldados y han empezado a fabricar oficio.'],
        cierre: 'Encontramos la primera cámara de cría intacta. Tibia, y con sitio para muchas más de las que hemos matado.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Salónica', llegada: 'salonica', lugar: 'Paseo de Nikis · la Torre Blanca', mapa: sitio(40.64, 22.94),
        // El paseo marítimo hecho en Blender (herramientas/blender/lugar_salonica.py):
        // el mar a la derecha, los bloques de Nikis a la izquierda y la Torre Blanca
        // al fondo, de día. Los alienz llegan en nave, como siempre.
        escenario: 'salonicaPaseo', suelo: 'losas', tonoSuelo: 0xbcb6a9, hitos: [],
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Todo llega deprisa por la costa.',
        parte: ['El puerto del norte sirvió de apoyo. Cuando Atenas cayó, todo lo que quedaba vino hacia aquí.',
          'Llegan en columna por la carretera de la costa.'],
        cierre: 'La columna se acabó. Detrás no venía nadie más, por primera vez.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Heraclión', llegada: 'cnosos', lugar: 'Palacio de Cnosos · el patio central', mapa: sitio(35.34, 25.14),
        // El palacio hecho en Blender (herramientas/blender/lugar_cnosos.py): el patio
        // central por la mañana temprano, con la boca del laberinto al fondo.
        escenario: 'heraclionCnosos', suelo: 'losas', tonoSuelo: 0xb9a888, hitos: [],
        // Salen del laberinto: nacen dentro de la puerta, a oscuras, y suben la rampa
        // deprisa hasta el patio. LA MADRE también, por el centro.
        entrada: { z: -86, fondo: 6, prisa: { desde: -84, hasta: -66, por: 3 } },
        // `cupula` y `sol`: el cielo y la luz de primera hora, como en el vuelo.
        fondo: { hora: 'manana', cielo: 0xa9c6e6, niebla: 0xecd9c4, nieblaCerca: 150, nieblaLejos: 470, cupula: [0x86aede, 0xf6d8b6], sol: 0xffe3c0 },
        sinPajaros: true, sinNubes: true,
        resumen: 'La base de la isla, y lo que la guarda.',
        parte: ['El nido de Creta está debajo del palacio. Si cae, cortamos el puente con África.',
          'Lo guarda algo grande. Lo hemos oído moverse ahí abajo.'],
        cierre: 'La base cae. El último barco que salió de aquí sigue en el radar, parado frente a Egipto.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'Egipto',
    etq: [6, 2, 'start'],
    bioma: 'desierto',
    mapa: sitio(26.8, 30.8),
    intro: [
      'De Egipto salió todo lo que llegó al Mediterráneo. Los satélites llevan meses contando naves que se posan en la meseta de Gizeh.',
      'El barco de Creta sigue parado frente a Alejandría. Nadie ha subido a mirar qué lleva.'
    ],
    cierre: 'Bajo la meseta hay una sala más grande que las pirámides. Y en las paredes hay un mapa del mundo con puntos encendidos.',
    misiones: [
      {
        name: 'Alejandría', llegada: 'alejandria', lugar: 'Fortaleza de Qaitbay · el espigón', mapa: sitio(31.20, 29.92), bioma: 'costa',
        // La fortaleza del puerto hecha en Blender (herramientas/blender/lugar_alejandria.py),
        // de día: el espigón, con el mar abierto a un lado y las barcas al otro.
        escenario: 'alejandriaQaitbay', suelo: 'losas', tonoSuelo: 0xcdbb96, hitos: [],
        // Salen de la fortaleza: nacen dentro de la torre, cruzan el patio deprisa y
        // pasan la puerta del muro en abanico cerrado (es estrecha); se abren después.
        entrada: { z: -89, fondo: 4, prisa: { desde: -89, hasta: -70, por: 3 }, abanico: { ancho: 0.7, hasta: -65.4 } },
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xd3e2ee, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'Subimos al barco. De frente y en masa.',
        parte: ['El barco de Creta lleva a bordo lo mismo que los contenedores de Valencia: gente dormida en literas.',
          'Los de la fortaleza salen todos a la vez para que no lleguemos.'],
        cierre: 'Había cuatrocientas personas en el barco. Ciento doce seguían vivas.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Luxor', llegada: 'luxor', lugar: 'Karnak · avenida de las esfinges', mapa: sitio(25.69, 32.64),
        // La avenida hecha en Blender (herramientas/blender/lugar_luxor.py): las dos
        // filas de esfinges y el pilono del templo al fondo, a mediodía.
        escenario: 'luxorEsfinges', suelo: 'arena', tonoSuelo: 0xd9c08f, hitos: [],
        // Salen del templo: nacen detrás de la puerta del pilono y la cruzan en
        // abanico cerrado (es estrecha); se abren al pasar los colosos.
        entrada: { z: -69, fondo: 6, prisa: { desde: -72, hasta: -63, por: 2.5 }, abanico: { ancho: 0.7, hasta: -58.2 } },
        fondo: { hora: 'alto', cielo: 0x7fb6e6, niebla: 0xe9dcc0, nieblaCerca: 140, nieblaLejos: 460 },
        sinPajaros: true, sinNubes: true,
        resumen: 'El valle está lleno de formas nuevas.',
        parte: ['El valle del Nilo es donde crían las formas del desierto. Aguantan el calor mejor que nosotros.',
          'Espera algo que no has visto en Europa.'],
        cierre: 'Las formas de aquí no se parecían a las de Europa. Se están adaptando a cada sitio.',
        waves: OLEADAS.formas
      },
      {
        name: 'El Cairo', llegada: 'gizeh', lugar: 'Gizeh · a los pies de la Esfinge', mapa: sitio(29.98, 31.13),
        // La Esfinge y la pirámide hechas en Blender (herramientas/blender/lugar_gizeh.py),
        // al atardecer, que es cuando la piedra tiene ese color.
        // `cupula` y `sol`: el cielo y la luz de esa hora, como en el vuelo.
        fondo: { hora: 'ocaso', cielo: 0xe9a367, niebla: 0xe4bb93, nieblaCerca: 150, nieblaLejos: 470, cupula: [0x7d7fb0, 0xf2a878], sol: 0xffc890 },
        escenario: 'gizehEsfinge', suelo: 'arena', tonoSuelo: 0xd8bf92, hitos: [],
        // Salen de debajo de la Esfinge: nacen en la sala de abajo, a oscuras, y suben
        // la rampa deprisa hasta el patio. LA MADRE también, por el centro.
        entrada: { z: -81, fondo: 6, prisa: { desde: -84, hasta: -66, por: 3 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'El campamento de la meseta, y lo que lo dirige.',
        parte: ['De aquí salió todo. Las naves se posan en la meseta a la vista de las pirámides.',
          'Lo que dirige el campamento es una MADRE, y esta ha tenido tiempo de aprender de la de París.'],
        cierre: 'La MADRE cayó. En la sala de abajo, el mapa del mundo tiene un punto que brilla más que los otros. Está en el Amazonas.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'Nigeria',
    etq: [0, 10, 'middle'],
    bioma: 'sabana',
    mapa: sitio(9.5, 8.0),
    intro: [
      'El mapa de Gizeh tiene un punto encendido en Lagos. Es uno de los grandes: de ahí sale lo que baja por toda África.',
      'El paso elevado de Apapa es lo único que une lo que queda de la ciudad con el continente.'
    ],
    // Nigeria se queda en un solo tramo (Isidro, 09/10: «solo deja el mapa de la ciudad más famosa y más poblada»).
    // Abuja y Kano salieron de la campaña; el cierre conserva el hilo que llevaba a la India.
    cierre: 'Por el paso elevado salieron cuatro mil personas mientras la compañía contaba oleadas. El punto de Lagos se apaga en el mapa, y los que quedaban se fueron hacia el este.',
    misiones: [
      {
        name: 'Lagos', llegada: 'lagos', lugar: 'Puente de Lekki-Ikoyi · sobre la laguna', mapa: sitio(6.45, 3.39),
        // El puente atirantado hecho en Blender (herramientas/blender/lugar_lagos.py),
        // al atardecer con bruma. Los alienz llegan en nave, como siempre.
        // `cupula` y `sol`: el cielo y la luz de esa hora, como en el vuelo.
        fondo: { hora: 'ocaso', cielo: 0xe8a468, niebla: 0xe6b78c, nieblaCerca: 110, nieblaLejos: 430, cupula: [0x7d7fb0, 0xf2a878], sol: 0xffc890 },
        escenario: 'lagosPuente', suelo: 'losas', tonoSuelo: 0x5c5c60, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'Llegan deprisa. Hay que aguantar el puente.',
        parte: ['Si cae el paso elevado, aquí no vuelve a entrar nadie.',
          'El búnker dice que aguantemos hasta que evacúen. No dice cuánto.'],
        cierre: 'El puente sigue en pie. La primera columna de evacuados ya ha cruzado.',
        waves: OLEADAS.contraflujo
      }
    ]
  },
  {
    nombre: 'India',
    etq: [0, 10, 'middle'],
    bioma: 'monzon',
    mapa: sitio(21.5, 78.5),
    intro: [
      'Hacia el este: en el mapa de Gizeh, la India tiene tres puntos encendidos. Nunca habíamos visto tantos en un solo país.',
      'Aquí no hubo evacuación. Hubo millones de personas y los campamentos en medio.'
    ],
    cierre: 'Los tres puntos de la India se apagan. Queda uno en China más brillante que todos los que hemos visto.',
    misiones: [
      {
        name: 'Bombay', llegada: 'bombay', lugar: 'Puerta de la India · el muelle', mapa: sitio(19.08, 72.88),
        // La explanada hecha en Blender (herramientas/blender/lugar_bombay.py), de día.
        // Desembarcan detrás del arco y lo cruzan en abanico cerrado (6 m de luz); se
        // abren al salir a la explanada.
        fondo: { hora: 'dia', cielo: 0x8fc0ee, niebla: 0xdbe3e4, nieblaCerca: 140, nieblaLejos: 460 },
        escenario: 'bombayPuerta', suelo: 'losas', tonoSuelo: 0x9c958a, hitos: [],
        entrada: { z: -90, fondo: 5, prisa: { desde: -90, hasta: -68, por: 3 }, abanico: { ancho: 0.9, hasta: -64.5 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'Otra vez de frente, pero nada de esto es como en Tarragona.',
        parte: ['Catorce millones de personas y un campamento en medio.',
          'Vuelven a venir de frente, en masa. La diferencia es cuántos son y lo que aguanta cada uno.'],
        cierre: 'La cuenta del día pasa de mil. El búnker deja de pedirnos el número.',
        waves: OLEADAS.avanzadilla
      },
      {
        // Era Delhi (el Rajpath). Isidro eligió el Taj Mahal, que está en Agra.
        name: 'Agra', llegada: 'agra', lugar: 'Taj Mahal · el jardín', mapa: sitio(27.17, 78.04),
        // Hecho en Blender (herramientas/blender/lugar_agra.py), al amanecer con bruma
        // rosada. Salen del mausoleo: la puerta mide 2,4 m, así que la cruzan en abanico
        // cerrado y se abren al pie de la escalinata.
        fondo: { hora: 'manana', cielo: 0xe7b9a8, niebla: 0xeecbc0, nieblaCerca: 120, nieblaLejos: 430, cupula: [0x8fa0d8, 0xf3c0b0], sol: 0xffd9c4 },
        escenario: 'agraTaj', suelo: 'losas', tonoSuelo: 0xc08468, hitos: [],
        entrada: { z: -79, fondo: 3, prisa: { desde: -80, hasta: -68, por: 2.5 }, abanico: { ancho: 0.45, hasta: -67.5 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'Se curan, se blindan, y son muchos.',
        parte: ['El campamento está montado dentro del Taj Mahal. El jardín es la única entrada.',
          'Los que guardan el mausoleo se cosen entre ellos.'],
        cierre: 'El jardín es nuestro. Dentro del mausoleo, por primera vez en dos años, no se oye nada.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Calcuta', llegada: 'calcuta', lugar: 'Victoria Memorial · el jardín', mapa: sitio(22.57, 88.36),
        // Hecho en Blender (herramientas/blender/lugar_calcuta.py): una tarde de monzón,
        // con el cielo gris y los charcos. Los alienz llegan en nave.
        fondo: { hora: 'dia', cielo: 0xa9b4bd, niebla: 0xc6cdd0, nieblaCerca: 120, nieblaLejos: 430, cupula: [0x6f7b88, 0xc9ced0], sol: 0xfff0dc },
        escenario: 'calcutaMemorial', suelo: 'losas', tonoSuelo: 0xcba88a, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'La MADRE del delta.',
        parte: ['El delta del Ganges es donde bajaron las primeras naves de Asia.',
          'Lo que dirige esto lleva aquí más tiempo que nadie.'],
        cierre: 'La MADRE del delta era más vieja que las otras. Tenía cicatrices de algo que ya la había herido antes.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'China',
    etq: [6, 2, 'start'],
    bioma: 'karstico',
    mapa: sitio(33.0, 106.0),
    intro: [
      'El punto más brillante del mapa está en Chongqing. Es el campamento más grande que se ha localizado nunca.',
      'No fabrican soldados para tomar la ciudad: la ciudad ya es suya. Fabrican para exportar.'
    ],
    cierre: 'Chongqing se apaga. Las naves siguen llegando igual. No las estábamos frenando: las estábamos entreteniendo.',
    misiones: [
      {
        name: 'Shanghái', llegada: 'shanghai', lugar: 'Jardín Yuyuan · la casa de té del lago', mapa: sitio(31.23, 121.47), bioma: 'monzon',
        // Hecho en Blender (herramientas/blender/lugar_shanghai.py): el estanque del
        // Yuyuan al anochecer, con los farolillos encendidos y Pudong detrás.
        fondo: { hora: 'ocaso', cielo: 0x8a6f9e, niebla: 0x9a82a8, nieblaCerca: 130, nieblaLejos: 450, cupula: [0x2b2f66, 0xd98a8c], sol: 0xffc0a6 },
        escenario: 'shanghaiYuyuan', suelo: 'losas', tonoSuelo: 0x8e8c90, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'Formas nuevas en la costa.',
        parte: ['El puerto de Shanghái recibía lo que salía de Chongqing río abajo.',
          'Aquí llegan las formas terminadas. Espera cosas que no has visto.'],
        cierre: 'Río arriba se ve la luz de Chongqing desde aquí. De noche ilumina las nubes.',
        waves: OLEADAS.formas
      },
      {
        name: 'Pekín', llegada: 'pekin', lugar: 'Gran Muralla · Badaling', mapa: sitio(40.36, 116.02), bioma: 'mediterraneo',
        // La muralla hecha en Blender (herramientas/blender/lugar_pekin.py), de día, en
        // otoño. Salen de la torre: la puerta mide 3 m, así que la cruzan en abanico.
        fondo: { hora: 'dia', cielo: 0x86b8ee, niebla: 0xcfdcea, nieblaCerca: 160, nieblaLejos: 520 },
        escenario: 'pekinMuralla', suelo: 'losas', tonoSuelo: 0xb2aa9c, hitos: [],
        entrada: { z: -77, fondo: 3, prisa: { desde: -78, hasta: -68, por: 2.5 }, abanico: { ancho: 0.55, hasta: -66 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'Llegan deprisa por la muralla.',
        parte: ['El búnker de Pekín es el más grande del mundo. Su entrada de emergencia está en la montaña, al pie de la Gran Muralla.',
          'Todo lo que hay en la zona viene por el camino de ronda, de torre en torre, y viene deprisa.'],
        cierre: 'La trampilla se abre. Salen once mil personas. Tardan un día entero.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Chongqing', llegada: 'chongqing', lugar: 'Hongyadong · el paseo del Jialing', mapa: sitio(29.56, 106.55),
        // Hecho en Blender (herramientas/blender/lugar_chongqing.py): de noche, que es
        // cuando Hongyadong se enciende. Los alienz llegan en nave.
        fondo: { hora: 'noche', cielo: 0x141228, niebla: 0x2a2036, nieblaCerca: 130, nieblaLejos: 460, ambiente: 0x2c2630, cupula: [0x060818, 0x3a2440], sol: 0xffd0a0 },
        escenario: 'chongqingHongya', suelo: 'losas', tonoSuelo: 0x55545c, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'El campamento más grande del mundo.',
        parte: ['Todas las formas a la vez, desde las torres del río.',
          'Si cae este, cae la mitad de lo que tienen en Asia.'],
        cierre: 'Reventamos la cría. La luz de las nubes se apaga, y por primera vez se ven las estrellas sobre la ciudad.',
        waves: OLEADAS.todas
      }
    ]
  },
  {
    nombre: 'Rusia',
    bioma: 'taiga',
    mapa: sitio(58.0, 95.0),
    intro: [
      'Lo que escapó de Chongqing se fue al norte, al frío, donde nadie iba a seguirles.',
      'El frío no les hace nada. A nosotros sí: el arma se agarrota y el que cae no se levanta.'
    ],
    cierre: 'En Moscú encontramos sus señales. No iban hacia arriba: iban hacia el otro lado del estrecho. Hacia América.',
    misiones: [
      {
        name: 'Vladivostok', llegada: 'helicoptero', lugar: 'Puente de Zolotói · vano este', mapa: sitio(43.12, 131.89), suelo: 'nieve',
        // Al amanecer: el cielo naranja contra la nieve es media postal de
        // Vladivostok, y de paso el puente deja de ser gris sobre gris.
        fondo: { hora: 'manana', cielo: 0xe8b08a, niebla: 0xd8c0b4 },
        // Aquí no se juega AL LADO del puente: se juega encima. El escenario se
        // come el paisaje y cierra las dos aceras, así que el campo queda en
        // tres carriles en vez de cinco.
        escenario: 'puente',
        resumen: 'Deprisa, y a cuarenta bajo cero.',
        parte: ['Llegan deprisa por el puente. Con la mitad de tu cuerpo dormido de frío.',
          'Lo que dispara lento no llega a tiempo.'],
        cierre: 'Aguantamos el vano. Tres de los nuestros no bajaron del puente.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Novosibirsk', llegada: 'novosibirsk', lugar: 'Río Obi · sobre el hielo', mapa: sitio(55.03, 82.92),
        // Hecho en Blender (herramientas/blender/lugar_novosibirsk.py): el río helado en
        // la noche azul del invierno. Salen de debajo del hielo, por el boquete del fondo.
        fondo: { hora: 'noche', cielo: 0x1c2a52, niebla: 0x33466e, nieblaCerca: 130, nieblaLejos: 460, ambiente: 0x3a4a6a, cupula: [0x070c26, 0x34508a], sol: 0xcfe0ff },
        escenario: 'novosibirskObi', suelo: 'nieve', tonoSuelo: 0xcfdcea, hitos: [],
        entrada: { z: -81, fondo: 5, prisa: { desde: -84, hasta: -66, por: 3 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'Se curan en el hielo.',
        parte: ['El centro de Siberia. Aquí se refugiaron los que huyeron de China.',
          'Se cosen entre ellos y el caparazón aguanta el frío mejor que la carne.'],
        cierre: 'El río está helado. Debajo del hielo se ven formas quietas, esperando la primavera.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Moscú', llegada: 'moscu', lugar: 'Plaza Roja · San Basilio', mapa: sitio(55.76, 37.62),
        // Hecho en Blender (herramientas/blender/lugar_moscu.py): la plaza nevada, de
        // día, con el sol bajo. Salen de debajo de la catedral: nacen abajo, a oscuras,
        // y suben la rampa. LA MADRE también.
        fondo: { hora: 'dia', cielo: 0xb9cfe6, niebla: 0xdfe6ee, nieblaCerca: 140, nieblaLejos: 460, cupula: [0x7fa4d8, 0xf0dccb], sol: 0xffe6c8 },
        escenario: 'moscuPlaza', suelo: 'nieve', tonoSuelo: 0xdfe3ea, hitos: [],
        entrada: { z: -81, fondo: 6, prisa: { desde: -84, hasta: -66, por: 3 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'La MADRE del norte.',
        parte: ['La señal que emiten sale de debajo del Kremlin.',
          'Lo que la emite es una MADRE, y es la primera que no sale a pelear: espera.'],
        cierre: 'Cayó sin levantarse. La señal que emitía era una respuesta. Alguien le hablaba desde América.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'Estados Unidos',
    bioma: 'artico',
    mapa: sitio(45.0, -110.0),
    intro: [
      'La señal de Moscú respondía a algo en Alaska. El búnker del Ártico lleva cuatro meses sin contestar.',
      'Venimos a ver por qué, con la munición contada y sin extracción hasta que esto acabe.'
    ],
    cierre: 'Nueva York queda limpia. En la antena del edificio más alto encontramos el emisor que hablaba con Moscú. Apuntaba al sur.',
    misiones: [
      {
        name: 'Anchorage', llegada: 'anchorage', lugar: 'Seward Highway · ensenada de Turnagain', mapa: sitio(61.22, -149.90),
        // Hecho en Blender (herramientas/blender/lugar_anchorage.py): la carretera entre
        // el agua y la montaña, con el sol de medianoche. Los alienz llegan en nave.
        fondo: { hora: 'ocaso', cielo: 0xe6b27a, niebla: 0xe2c4a4, nieblaCerca: 160, nieblaLejos: 520, cupula: [0x6f86c0, 0xf6c088], sol: 0xffd09a },
        escenario: 'anchorageSeward', suelo: 'losas', tonoSuelo: 0x8a8782, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'Se curan, se blindan, y no viene nadie a relevarte.',
        parte: ['El búnker del Ártico está debajo de la ensenada.',
          'Se cosen entre ellos y el caparazón devuelve las balas.'],
        cierre: 'El búnker estaba lleno. No de gente: de camas ordenadas, con un nombre en cada una.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Seattle', llegada: 'seattle', lugar: 'Pike Place Market · la calle del mercado', mapa: sitio(47.61, -122.33), bioma: 'monzon',
        // Hecho en Blender (herramientas/blender/lugar_seattle.py): tarde de lluvia.
        // Suben del puerto por dentro del mercado y salen por la boca de la galería (6 m),
        // en abanico cerrado; se abren en la calle.
        fondo: { hora: 'dia', cielo: 0x8d98a4, niebla: 0xaab3ba, nieblaCerca: 110, nieblaLejos: 410, cupula: [0x5c6672, 0xb4bcc2], sol: 0xe6eef6 },
        escenario: 'seattlePike', suelo: 'losas', tonoSuelo: 0x6e443c, hitos: [],
        entrada: { z: -76, fondo: 3, prisa: { desde: -78, hasta: -68, por: 2.5 }, abanico: { ancho: 0.9, hasta: -64.5 } },
        sinPajaros: true, sinNubes: true,
        resumen: 'Formas nuevas bajo la lluvia.',
        parte: ['Llueve desde que llegamos. Las formas de aquí salen del agua del puerto.',
          'No se parecen a nada que hayamos visto en Europa ni en Asia.'],
        cierre: 'Las formas del puerto respiraban bajo el agua. Se siguen adaptando.',
        waves: OLEADAS.formas
      },
      {
        name: 'Nueva York', lugar: 'Quinta Avenida · frente al Empire State', mapa: sitio(40.76, -73.97), bioma: 'costa',
        // Rascacielos de piedra pegados a las dos aceras, las banderas saliendo
        // de las fachadas y los taxis amarillos parados.
        escenario: 'nuevaYorkQuinta', suelo: 'carretera',
        resumen: 'Suben por la avenida, entre los rascacielos.',
        parte: ['El emisor está en la antena del edificio más alto de la isla. Para llegar hay que subir la avenida a pie.',
          'Entre las fachadas no hay por dónde salirse: lo que entre por la calle, entra de frente.'],
        cierre: 'La avenida queda despejada hasta la calle 42. Desde ahí se oye el zumbido de las pantallas encendidas.',
        waves: OLEADAS.formas
      },
      {
        name: 'Nueva York', lugar: 'Times Square · de noche', mapa: sitio(40.758, -73.985), bioma: 'costa',
        fondo: { hora: 'noche', cielo: 0x0b1020, niebla: 0x161d31, ambiente: 0x1b2230 },
        // De noche, que es cuando Times Square es Times Square: las pantallas
        // dan casi toda la luz del nivel.
        escenario: 'nuevaYorkTimes', suelo: 'carretera',
        resumen: 'De noche, con las pantallas encendidas.',
        parte: ['Las pantallas siguen dando las noticias de hace cuatro meses, a nadie.',
          'Con esa luz se les ve venir tarde: salen de la sombra ya encima.'],
        cierre: 'Las pantallas se apagaron una por una al cortar el cable. Debajo estaba el acceso al túnel que va a la bahía.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Nueva York', lugar: 'Isla de la Libertad · al pie del pedestal', mapa: sitio(40.689, -74.045), bioma: 'costa',
        // El sitio de la estatua es SU isla, con el agua alrededor y Manhattan
        // al otro lado de la bahía. La explanada del pedestal es estrecha, así
        // que el campo queda en cuatro carriles.
        escenario: 'nuevaYorkIsla', suelo: 'losas', tonoSuelo: 0xb9b2a4, hitos: [['libertad3d']],
        resumen: 'Todas las formas y dos MADRES.',
        parte: ['La isla es su centro de mando en el norte. Por agua solo se entra por el muelle, y el muelle es esto.',
          'Bajarán todas las formas a la vez, y al final vienen dos.'],
        cierre: 'Las dos cayeron al pie del pedestal. Por la antena del edificio seguía entrando una voz desde el sur.',
        waves: OLEADAS.todas
      }
    ]
  },
  {
    nombre: 'México',
    etq: [0, 10, 'middle'],
    bioma: 'altiplano',
    mapa: sitio(23.0, -102.0),
    intro: [
      'La voz de Nueva York venía de México. El altiplano es su última gran base antes del Amazonas.',
      'El Paseo de la Reforma baja recto hasta el centro de la capital, y la han convertido en su avenida.'
    ],
    cierre: 'México queda limpio. Pero antes de caer, la última MADRE mandó algo hacia el sur, y lo que mandó no era una nave.',
    misiones: [
      {
        name: 'Monterrey', llegada: 'monterrey', lugar: 'Macroplaza · el Faro del Comercio', mapa: sitio(25.69, -100.32),
        // Hecho en Blender (herramientas/blender/lugar_monterrey.py): al amanecer, con el
        // Cerro de la Silla en la llegada. Los alienz llegan en nave.
        fondo: { hora: 'manana', cielo: 0xe8b796, niebla: 0xecccb4, nieblaCerca: 150, nieblaLejos: 480, cupula: [0x86a0dc, 0xf6c8a0], sol: 0xffdcb8 },
        escenario: 'monterreyMacroplaza', suelo: 'losas', tonoSuelo: 0xd6ccba, hitos: [],
        sinPajaros: true, sinNubes: true,
        resumen: 'Llegan deprisa desde la frontera.',
        parte: ['Lo que huyó de Estados Unidos entró por aquí.',
          'Llegan deprisa por la carretera del norte.'],
        cierre: 'La frontera queda cerrada. Lo que quedaba al otro lado ya no puede bajar.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Guadalajara', lugar: 'Plaza de Armas · frente a la catedral', mapa: sitio(20.66, -103.35),
        // Los portales con arcadas y la catedral de teja amarilla. Antes era «periférico, salida sur».
        escenario: 'guadalajara', suelo: 'adoquin', tonoSuelo: 0xbdb2a2, hitos: [['catedralGdl']],
        resumen: 'Se curan y se blindan.',
        parte: ['La ciudad es su segundo hospital: aquí reparan lo que les rompemos.',
          'Los que la guardan se cosen entre ellos.'],
        cierre: 'Quemamos las salas de reparación. Lo que se rompa a partir de ahora, se queda roto.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Ciudad de México', lugar: 'Paseo de la Reforma · glorieta del Ángel', mapa: sitio(19.43, -99.13),
        // Los jacarandás en flor y las torres del tramo nuevo.
        escenario: 'ciudadDeMexico', suelo: 'carretera', hitos: [['angel']],
        resumen: 'La MADRE del altiplano.',
        parte: ['Veinte kilómetros de campamento a lo largo de la calzada.',
          'Al fondo hay otra MADRE, y ha tenido tiempo de aprender de todas las anteriores.'],
        cierre: 'Cayó. Pero antes mandó algo hacia el sur, hacia el punto más brillante del mapa de Gizeh.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'República Dominicana',
    etq: [0, 10, 'middle'],
    bioma: 'caribe',
    mapa: sitio(18.8, -70.2),
    intro: [
      'Lo que mandó la MADRE de México no fue directo al Amazonas: hizo escala en el Caribe.',
      'Las playas de la isla se vaciaron en una semana. Desde el búnker de Santo Domingo llegan fotos de hamacas vacías y de un muelle nuevo que nadie construyó.'
    ],
    cierre: 'La isla queda limpia. Lo que salió del muelle antes de que llegáramos iba hacia el sur, hacia el Amazonas.',
    misiones: [
      {
        name: 'Punta Cana', lugar: 'Playa Bávaro · la tarima', mapa: sitio(18.58, -68.40),
        // Tarima de madera entre las palmeras. Llano y sin torres: el mar lo pone el lugar.
        escenario: 'puntaCana', suelo: 'losas', tonoSuelo: 0xb08a5e, hitos: [['bavaro']],
        resumen: 'Salen del mar y cruzan la arena.',
        parte: ['La playa de Bávaro era su muelle: las naves se posan junto al agua y la siembra sale andando por la arena.',
          'Aquí no hay carretera. Solo arena, palmeras y ellos.'],
        cierre: 'La arena queda limpia. Las hamacas siguen colgadas, esperando a alguien.',
        waves: OLEADAS.formas
      },
      {
        name: 'Santo Domingo', lugar: 'Calle Las Damas · Alcázar de Colón', mapa: sitio(18.47, -69.89),
        // La calle más antigua de América, con los muros de piedra de coral.
        escenario: 'santoDomingo', suelo: 'adoquin', tonoSuelo: 0x8f867a, hitos: [['alcazarColon'], ['faroColon']],
        resumen: 'Se curan entre ellos.',
        parte: ['La ciudad vieja es su hospital en el Caribe. Por los adoquines de la calle de las Damas bajan los que ya han cosido.',
          'Al fondo, el Faro a Colón proyecta su cruz de luz: la usan para guiar las naves que cruzan desde México.'],
        cierre: 'Apagamos el Faro. El cielo de la isla vuelve a estar a oscuras, y lo que venía del norte ya no sabe dónde posarse.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Puerto Plata', lugar: 'Malecón · fortaleza de San Felipe', mapa: sitio(19.79, -70.69),
        // El malecón con el Pico Isabel de Torres detrás.
        escenario: 'puertoPlata', suelo: 'losas', tonoSuelo: 0xc2baa8, hitos: [['sanFelipe']],
        resumen: 'La MADRE del Caribe.',
        parte: ['El muelle nuevo está aquí, al pie de la vieja fortaleza. De aquí sale todo lo que cruza hacia el sur.',
          'Sobre la arena espera otra MADRE.'],
        cierre: 'El muelle arde. Lo último que zarpó ya iba camino del Amazonas.',
        waves: OLEADAS.madre
      }
    ]
  },
  {
    nombre: 'Brasil',
    etq: [6, 2, 'start'],
    bioma: 'selva',
    mapa: sitio(-10.0, -52.0),
    intro: [
      'El punto más brillante del mapa de Gizeh está en el Amazonas. Aquí es donde bajaron primero, hace años, cuando todavía nadie miraba.',
      'De aquí salieron los camiones que se llevaban gente sin que constara en ninguna parte. Aquí empezó todo, y aquí se acaba.'
    ],
    cierre: 'Se acabó.',
    misiones: [
      {
        name: 'Río de Janeiro', lugar: 'Copacabana · avenida Atlántica', mapa: sitio(-22.91, -43.17), bioma: 'costa',
        // La baldosa de olas, la pared de edificios y los morros detrás.
        escenario: 'rio', suelo: 'losas', tonoSuelo: 0xe0dcd2, hitos: [['cristo']],
        resumen: 'La costa, y formas que no hemos visto.',
        parte: ['Entramos por la costa. Lo que guarda la entrada al continente no se parece a nada anterior.',
          'Es lo último que han diseñado.'],
        cierre: 'Las formas de aquí eran perfectas. Esto era el final del experimento, no el principio.',
        waves: OLEADAS.formas
      },
      {
        // Interlagos: se corre por la pista, con pianos, grava y muro de
        // neumaticos. El muro de boxes se mete por la derecha, asi que aqui el
        // campo baja a cuatro carriles y ademas de forma asimetrica.
        name: 'São Paulo', lugar: 'Interlagos · recta de meta', mapa: sitio(-23.70, -46.70), escenario: 'circuito', bioma: 'monzon',
        resumen: 'Se curan, y son todos.',
        parte: ['La ciudad más grande del sur es su último hospital.',
          'Todo lo que les queda protege el camino hacia el Amazonas.'],
        cierre: 'El camino al norte queda abierto. Río arriba, el Amazonas.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Manaos', lugar: 'Plaza São Sebastião · frente al Teatro Amazonas', mapa: sitio(-3.12, -60.02),
        // El mismo empedrado en olas que Copacabana: los dos vinieron de Lisboa.
        escenario: 'manaos', suelo: 'adoquin', tonoSuelo: 0xc6bca8, hitos: [['teatroAmazonas']],
        resumen: 'Todo a la vez, y al final no viene una MADRE: vienen dos.',
        parte: ['No queda nadie detrás de nosotros y no hay otro sitio al que ir.',
          'Bajarán todas las formas a la vez, y al final no viene una MADRE: vienen dos.'],
        cierre: 'Se acabó.',
        waves: OLEADAS.todas
      }
    ]
  }
]

// --- la lista plana de misiones ---------------------------------------------
//
// El juego —empezar una partida, guardar el progreso, la pantalla de victoria—
// habla en índices de misión, del 0 en adelante, y no tiene por qué saber de países.
// Se aplana aquí, y cada misión se lleva lo que necesita de su país.

const TOTAL = PAISES.reduce((n, p) => n + p.misiones.length, 0)

export const DESTINOS = []
PAISES.forEach((pais, ip) => {
  pais.primera = DESTINOS.length
  pais.misiones.forEach((m, im) => {
    const i = DESTINOS.length
    DESTINOS.push({
      ...m,
      pais: pais.nombre,
      paisIndice: ip,
      misionIndice: im,
      bioma: m.bioma ?? pais.bioma,
      // El peaje es del PAÍS: se paga al entrar, con la primera misión. Las
      // demás del mismo país ya exigen haber superado la anterior.
      // Dos estrellas por misión ya pasada: seis por país mientras todos tenían tres,
      // y lo justo ahora que Nigeria tiene una sola.
      estrellas: pais.primera * 2,
      // De 0,06 a 0,56 en línea recta a lo largo de toda la campaña.
      dureza: 0.06 + (i / (TOTAL - 1)) * 0.5
    })
  })
  pais.ultima = DESTINOS.length - 1
})

// Una tabla de oleadas con más bichos en cada horda: `veces` multiplica cuántos
// salen de cada tipo y `seguido` acorta lo que tardan en salir uno detrás de
// otro. Copia la tabla: las seis de oleadas.js las comparten muchos destinos.
function alargar (tabla, veces, seguido = 1) {
  return tabla.map(o => ({
    ...o,
    spawns: o.spawns.map(s => ({ ...s, count: Math.ceil(s.count * veces), every: +(s.every * seguido).toFixed(2) }))
  }))
}

export const paisDe = indice => PAISES[DESTINOS[indice]?.paisIndice ?? 0]
