// La campaña: trece países, tres misiones en cada uno.
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
        // La playa al pie del anfiteatro romano. Tarragona no tiene ni una torre.
        escenario: 'tarragona', suelo: 'playa', tonoSuelo: 0xe4d5b2, hitos: [['tarraco']],
        resumen: 'El primer contacto. Vienen de frente y poco más.',
        parte: ['Doce kilómetros de asfalto entre su campamento y lo que queda de la ciudad. La orden es de una línea: que no pasen.',
          'Los primeros llegan sin método. Caminan hacia el ruido porque es lo único que les dejaron saber hacer.'],
        cierre: 'Ninguno pasó. Uno llevaba todavía la tarjeta de empleado de una fábrica de Reus.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Valencia', lugar: 'Ciudad de las Artes · entre las láminas de agua', mapa: sitio(39.47, -0.38), bioma: 'costa',
        // Hormigón blanco y el agua turquesa de los estanques.
        escenario: 'valencia', suelo: 'losas', tonoSuelo: 0xe8e5dc,
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
        name: 'Marsella', lugar: 'Vieux Port · muelle de los pescadores', mapa: sitio(43.30, 5.37),
        // El puerto viejo, con los barcos amarrados de proa al muelle.
        escenario: 'marsella', suelo: 'losas', tonoSuelo: 0xc9c2b2, hitos: [['notreDameGarde']],
        resumen: 'Escupen a distancia, saltan las barreras y revientan al caer.',
        parte: ['El campamento del puerto lleva más tiempo montado, y se nota: los huéspedes ya no vienen todos iguales.',
          'No están improvisando. Están probando qué funciona contra nosotros.'],
        cierre: 'Tres formas nuevas en un solo muelle. Esto no es una plaga: es un taller con turnos.',
        waves: OLEADAS.formas
      },
      {
        name: 'Lyon', lugar: 'Muelles del Ródano · la confluencia', mapa: sitio(45.76, 4.84),
        // La ribera del Ródano y los tejados rojos, con Fourvière arriba.
        escenario: 'lyon', suelo: 'adoquin', tonoSuelo: 0xbdb5a4, hitos: [['fourviere']],
        resumen: 'Se cosen entre ellos mientras les disparas.',
        parte: ['Encontramos la primera sala de experimentos entera. Camillas, correas, y un olor que no se va de la ropa.',
          'Los de aquí se curan unos a otros. Hay que elegir a quién matar primero.'],
        cierre: 'En la sala había una lista de nombres. Algunos los conocía alguien de la compañía.',
        waves: OLEADAS.colmena
      },
      {
        name: 'París', lugar: 'Campo de Marte · al pie de la torre', mapa: sitio(48.86, 2.35), bioma: 'parque',
        // Gravilla, setos recortados y los plátanos del Campo de Marte. La explanada la pone el lugar, así que el hito es solo la torre.
        escenario: 'paris', suelo: 'tierra', tonoSuelo: 0xc4b79c, hitos: [['eiffelFondo']],
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
        name: 'Nápoles', lugar: 'Bajo el Vesubio · anillo sur', mapa: sitio(40.85, 14.26),
        // Bloques napolitanos con persianas y el volcán cerrando la bahía, con
        // la vista abierta para que el Vesubio se vea de verdad.
        fondo: { nieblaCerca: 85, nieblaLejos: 250 },
        escenario: 'napoles', suelo: 'carretera', hitos: [['maschioAngioino']],
        resumen: 'Todo llega deprisa. Lo que dispara lento no llega a tiempo.',
        parte: ['La ciudad se vació en cuatro días. En el anillo todo llega deprisa.',
          'Lo que dispara lento no llega a tiempo.'],
        cierre: 'Ya no bajan hacia la ciudad: bajan hacia NOSOTROS. Saben que venimos.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Roma', lugar: 'Via dei Fori Imperiali', mapa: sitio(41.90, 12.50), bioma: 'mediterraneo',
        // Los foros en ruinas a los dos lados y el Coliseo cerrando la calle.
        escenario: 'roma', suelo: 'adoquin', tonoSuelo: 0x87817a, hitos: [['coliseo3d']],
        resumen: 'Se curan y el caparazón devuelve las balas.',
        parte: ['Han instalado algo dentro del estadio olímpico. Desde el aire se ve la luz verde por las gradas.',
          'Los que protegen la zona vienen blindados. Hace falta con qué atravesarlos.'],
        cierre: 'Dentro del estadio no había nadie. Solo filas de capullos vacíos, abiertos desde dentro.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Milán', lugar: 'Piazza del Duomo', mapa: sitio(45.46, 9.19), bioma: 'mediterraneo',
        // La plaza con los pórticos. Aquí no se ve ni un rascacielos: los de Porta Nuova están a dos kilómetros.
        escenario: 'milan', suelo: 'losas', tonoSuelo: 0x9e988e, hitos: [['duomo']],
        resumen: 'Formas nuevas. Aquí prueban cosas.',
        parte: ['Milán era su laboratorio de diseño. Lo que funcionaba aquí lo copiaban en el resto de Europa.',
          'Espera formas que no has visto nunca.'],
        cierre: 'Quemamos los planos. Tardarán en rehacerlos, pero los rehacerán.',
        waves: OLEADAS.formas
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
        name: 'Atenas', lugar: 'Dionisiou Areopagitou · bajo la Acrópolis', mapa: sitio(37.94, 23.65),
        // El paseo de mármol al pie de la roca, con los olivos. Antes se jugaba en la terminal de contenedores del Pireo, que no se reconocía.
        escenario: 'atenas', suelo: 'losas', tonoSuelo: 0xe4ddcc, hitos: [['partenon']],
        resumen: 'Se curan entre ellos y el caparazón devuelve las balas.',
        parte: ['La terminal está llena. No de cuerpos: de estructura.',
          'Han dejado de fabricar soldados y han empezado a fabricar oficio.'],
        cierre: 'Encontramos la primera cámara de cría intacta. Tibia, y con sitio para muchas más de las que hemos matado.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Salónica', lugar: 'Nea Paralia · el paseo nuevo', mapa: sitio(40.64, 22.94),
        // El paseo del golfo Termaico y los bloques de los años sesenta.
        escenario: 'salonica', suelo: 'losas', tonoSuelo: 0xc6c0b2, hitos: [['torreBlanca']],
        resumen: 'Todo llega deprisa por la costa.',
        parte: ['El puerto del norte sirvió de apoyo. Cuando Atenas cayó, todo lo que quedaba vino hacia aquí.',
          'Llegan en columna por la carretera de la costa.'],
        cierre: 'La columna se acabó. Detrás no venía nadie más, por primera vez.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Heraclión', lugar: 'Espigón veneciano · fortaleza de Koules', mapa: sitio(35.34, 25.14),
        // Se va por el rompeolas con agua a los DOS lados: por eso el campo queda en tres carriles.
        escenario: 'heraclion', suelo: 'losas', tonoSuelo: 0xd4ccb8, hitos: [['koules']],
        resumen: 'La base de la isla, y lo que la guarda.',
        parte: ['La base naval de Creta coordinaba los barcos. Si cae, cortamos el puente con África.',
          'La guarda algo grande. Lo hemos visto moverse desde el agua.'],
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
        name: 'Alejandría', lugar: 'Corniche · bahía este', mapa: sitio(31.20, 29.92), bioma: 'costa',
        // La bahía en curva, el muro contra el oleaje y la pared de edificios beige.
        escenario: 'alejandria', suelo: 'losas', tonoSuelo: 0xc4bda8, hitos: [['bibliotecaAlejandria']],
        resumen: 'Subimos al barco. De frente y en masa.',
        parte: ['El barco de Creta lleva a bordo lo mismo que los contenedores de Valencia: gente dormida en literas.',
          'Los del puerto bajan todos a la vez para que no lleguemos.'],
        cierre: 'Había cuatrocientas personas en el barco. Ciento doce seguían vivas.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Luxor', lugar: 'Karnak · avenida de las esfinges', mapa: sitio(25.69, 32.64),
        // Las dos filas de carneros echados y los pilonos del templo. Antes era «carretera del Nilo», que no era ningún sitio.
        escenario: 'luxor', suelo: 'arena', tonoSuelo: 0xd9c08f, hitos: [['temploEgipcio']],
        resumen: 'El valle está lleno de formas nuevas.',
        parte: ['El valle del Nilo es donde crían las formas del desierto. Aguantan el calor mejor que nosotros.',
          'Espera algo que no has visto en Europa.'],
        cierre: 'Las formas de aquí no se parecían a las de Europa. Se están adaptando a cada sitio.',
        waves: OLEADAS.formas
      },
      {
        name: 'El Cairo', lugar: 'Gizeh · explanada de las pirámides', mapa: sitio(29.98, 31.13),
        // La meseta de arena al atardecer, que es cuando las pirámides tienen
        // ese color y la sombra se va medio kilómetro.
        // Con la vista abierta: las pirámides están lejos y son el sitio.
        fondo: { hora: 'ocaso', cielo: 0xe9a367, niebla: 0xe4bb93, nieblaCerca: 90, nieblaLejos: 260 },
        escenario: 'elCairo', suelo: 'arena', tonoSuelo: 0xd8bf92, hitos: [['esfinge']],
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
    cierre: 'Por el paso elevado salieron cuatro mil personas mientras la compañía contaba oleadas. El punto de Lagos se apaga en el mapa.',
    misiones: [
      {
        name: 'Lagos', lugar: 'Third Mainland Bridge · sobre la laguna', mapa: sitio(6.45, 3.39),
        // Once kilómetros de viga baja sobre la laguna, sin torres ni tirantes.
        escenario: 'lagos', suelo: 'carretera', hitos: [['teatroNacional'], ['danfos']],
        resumen: 'Llegan deprisa. Hay que aguantar el puente.',
        parte: ['Si cae el paso elevado, aquí no vuelve a entrar nadie.',
          'El búnker dice que aguantemos hasta que evacúen. No dice cuánto.'],
        cierre: 'El puente sigue en pie. La primera columna de evacuados ya ha cruzado.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Abuja', lugar: 'Explanada de Aso Rock', mapa: sitio(9.08, 7.40),
        // El monolito y la mezquita de cúpula dorada. Antes era «autopista del aeropuerto».
        escenario: 'abuja', suelo: 'tierra', tonoSuelo: 0xc08a5e, hitos: [['asoRock'], ['mezquitaNacional']],
        resumen: 'Se cosen y se blindan.',
        parte: ['El aeropuerto de la capital es la única pista larga que queda en la región. Hace falta para sacar a la gente.',
          'Lo protegen los que se curan entre ellos.'],
        cierre: 'La pista queda libre. Despega el primer avión con evacuados en año y medio.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Kano', lugar: 'Mercado de Kurmi · muralla de adobe', mapa: sitio(12.00, 8.52),
        // Muros de barro con contrafuertes y los puestos del mercado. Antes era «carretera del desierto».
        escenario: 'kano', suelo: 'tierra', tonoSuelo: 0xc9a173, hitos: [['puertaAdobe']],
        resumen: 'Todas las formas a la vez, y dos MADRES.',
        parte: ['El campamento del norte es de los grandes. Aquí juntaron todo lo que criaban en África.',
          'Bajarán todas las formas a la vez. Y al final no viene una MADRE: vienen dos.'],
        cierre: 'Las dos cayeron. Pero antes de caer, las dos miraron hacia el este.',
        waves: OLEADAS.todas
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
        name: 'Bombay', lugar: 'Bandra-Worli · enlace del mar', mapa: sitio(19.08, 72.88),
        // Aquí no se juega AL LADO del enlace: se juega encima. Atirantado, sobre el mar Arábigo y con Marine Drive al fondo, así que el puente atirantado que había de adorno ya no hace falta.
        escenario: 'bombay', suelo: 'carretera',
        resumen: 'Otra vez de frente, pero nada de esto es como en Tarragona.',
        parte: ['Catorce millones de personas y un campamento en medio.',
          'Vuelven a venir de frente, en masa. La diferencia es cuántos son y lo que aguanta cada uno.'],
        cierre: 'La cuenta del día pasa de mil. El búnker deja de pedirnos el número.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Delhi', lugar: 'Rajpath · Puerta de la India', mapa: sitio(28.61, 77.21),
        // La avenida ceremonial con los estanques a los lados.
        escenario: 'delhi', suelo: 'losas', tonoSuelo: 0xcbb096, hitos: [['puertaIndia']],
        resumen: 'Se curan, se blindan, y son muchos.',
        parte: ['El campamento de la capital está montado alrededor de la Puerta de la India. El Rajpath es la única entrada.',
          'Los que guardan la avenida se cosen entre ellos.'],
        cierre: 'La avenida es nuestra. Al otro lado, la ciudad está en silencio.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Calcuta', lugar: 'Puente de Howrah', mapa: sitio(22.57, 88.36),
        // Celosía de acero remachado —el de verdad no lleva un solo tornillo— con los tranvías y el mercado de flores.
        escenario: 'calcuta', suelo: 'carretera', hitos: [['victoriaMemorial']],
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
        name: 'Shanghái', lugar: 'Puente de Nanpu · sobre el Huangpu', mapa: sitio(31.23, 121.47), bioma: 'monzon',
        // Con su rampa en espiral, que es lo que hace que ese puente sea ese
        // puente, y Pudong encendido al anochecer al otro lado del río.
        fondo: { hora: 'ocaso', cielo: 0xb98fa8, niebla: 0xc0a3b0 },
        escenario: 'shanghai', suelo: 'carretera', hitos: [['perlaOriental']],
        resumen: 'Formas nuevas en la costa.',
        parte: ['El puerto de Shanghái recibía lo que salía de Chongqing río abajo.',
          'Aquí llegan las formas terminadas. Espera cosas que no has visto.'],
        cierre: 'Río arriba se ve la luz de Chongqing desde aquí. De noche ilumina las nubes.',
        waves: OLEADAS.formas
      },
      {
        name: 'Pekín', lugar: 'Avenida Chang\'an · Tiananmén', mapa: sitio(39.90, 116.41), bioma: 'mediterraneo',
        // Los farolillos rojos y la puerta de la Ciudad Prohibida cerrando.
        escenario: 'pekin', suelo: 'losas', tonoSuelo: 0x8d8a82, hitos: [['ciudadProhibida']],
        resumen: 'Llegan deprisa por Chang’an.',
        parte: ['El búnker de Pekín es el más grande del mundo. Lleva un año pidiendo que alguien abra la superficie.',
          'Todo lo que hay en la zona baja por la avenida hacia la puerta, y baja deprisa.'],
        cierre: 'La trampilla se abre. Salen once mil personas. Tardan un día entero.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Chongqing', lugar: 'Yuzhong · rampa del río', mapa: sitio(29.56, 106.55),
        // La terraza sobre el Yangtsé, con el monorraíl pasando y el río veinte
        // metros más abajo. Al anochecer, que es cuando Hongyadong se enciende.
        fondo: { hora: 'ocaso', cielo: 0xc08a72, niebla: 0xbfa091 },
        escenario: 'chongqing', suelo: 'adoquin', tonoSuelo: 0x7e7870, hitos: [['hongyadong']],
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
        name: 'Novosibirsk', lugar: 'Puente del Obi', mapa: sitio(55.03, 82.92),
        // Arcos de acero y el hielo del río en placas.
        escenario: 'novosibirsk', suelo: 'nieve', tonoSuelo: 0x8e9094, hitos: [['operaNovosibirsk']],
        resumen: 'Se curan en el hielo.',
        parte: ['El centro de Siberia. Aquí se refugiaron los que huyeron de China.',
          'Se cosen entre ellos y el caparazón aguanta el frío mejor que la carne.'],
        cierre: 'El río está helado. Debajo del hielo se ven formas quietas, esperando la primavera.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Moscú', lugar: 'Plaza Roja', mapa: sitio(55.76, 37.62),
        // La muralla del Kremlin con las almenas de cola de golondrina a un lado y el GUM al otro.
        escenario: 'moscu', suelo: 'adoquin', tonoSuelo: 0x8f857c, hitos: [['sanBasilio']],
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
        name: 'Anchorage', lugar: 'Seward Highway · ensenada de Turnagain', mapa: sitio(61.22, -149.90),
        // Aquí una carretera SÍ es el sitio: va de verdad entre el fiordo y la pared de montaña.
        escenario: 'anchorage', suelo: 'carretera', hitos: [['totems']],
        resumen: 'Se curan, se blindan, y no viene nadie a relevarte.',
        parte: ['El búnker del Ártico está debajo de la ensenada.',
          'Se cosen entre ellos y el caparazón devuelve las balas.'],
        cierre: 'El búnker estaba lleno. No de gente: de camas ordenadas, con un nombre en cada una.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Seattle', lugar: 'I-5 · junto al puerto', mapa: sitio(47.61, -122.33), bioma: 'monzon',
        // El viaducto, los bloques de cristal y las grúas del muelle.
        escenario: 'seattle', suelo: 'carretera', hitos: [['spaceNeedle']],
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
        name: 'Monterrey', lugar: 'Macroplaza · el Faro del Comercio', mapa: sitio(25.69, -100.32),
        // La explanada más grande de América, con el Cerro de la Silla cerrando el valle. Antes era «carretera del norte».
        escenario: 'monterrey', suelo: 'losas', tonoSuelo: 0xb0a89a, hitos: [['faroComercio'], ['cerroSilla']],
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
// habla en índices de misión, del 0 al 35, y no tiene por qué saber de países.
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
      estrellas: ip * 6,
      // De 0,06 a 0,56 en línea recta a lo largo de toda la campaña.
      dureza: 0.06 + (i / (TOTAL - 1)) * 0.5
    })
  })
  pais.ultima = DESTINOS.length - 1
})

export const paisDe = indice => PAISES[DESTINOS[indice]?.paisIndice ?? 0]
