// La campaña: doce países, tres misiones en cada uno.
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

// --- los doce países ---------------------------------------------------------
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
        name: 'Tarragona', lugar: 'Carretera 7 · kilómetro 12', mapa: sitio(41.12, 1.25),
        resumen: 'El primer contacto. Vienen de frente y poco más.',
        parte: ['Doce kilómetros de asfalto entre su campamento y lo que queda de la ciudad. La orden es de una línea: que no pasen.',
          'Los primeros llegan sin método. Caminan hacia el ruido porque es lo único que les dejaron saber hacer.'],
        cierre: 'Ninguno pasó. Uno llevaba todavía la tarjeta de empleado de una fábrica de Reus.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Valencia', lugar: 'Avenida del Saler · Ciudad de las Artes', mapa: sitio(39.47, -0.38),
        bioma: 'costa', hitos: [['artesYCiencias']],
        resumen: 'Ya no vienen todos iguales.',
        parte: ['El puerto era una de sus zonas de descarga. Aquí llegaban los camiones con la gente que desaparecía.',
          'Hay quien escupe y quien salta. El experimento va más avanzado de lo que creíamos.'],
        cierre: 'En los muelles había contenedores con literas dentro. Vacías.',
        waves: OLEADAS.formas
      },
      {
        name: 'Madrid', lugar: 'Paseo de la Castellana · Chamartín', mapa: sitio(40.42, -3.70),
        bioma: 'ciudad', hitos: [['castellana', -1, -52, -92], ['bernabeu']],
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
        name: 'Marsella', lugar: 'Puerto viejo · dique norte', mapa: sitio(43.30, 5.37),
        resumen: 'Escupen a distancia, saltan las barreras y revientan al caer.',
        parte: ['El campamento del puerto lleva más tiempo montado, y se nota: los huéspedes ya no vienen todos iguales.',
          'No están improvisando. Están probando qué funciona contra nosotros.'],
        cierre: 'Tres formas nuevas en un solo muelle. Esto no es una plaga: es un taller con turnos.',
        waves: OLEADAS.formas
      },
      {
        name: 'Lyon', lugar: 'Confluencia del Ródano', mapa: sitio(45.76, 4.84),
        resumen: 'Se cosen entre ellos mientras les disparas.',
        parte: ['Encontramos la primera sala de experimentos entera. Camillas, correas, y un olor que no se va de la ropa.',
          'Los de aquí se curan unos a otros. Hay que elegir a quién matar primero.'],
        cierre: 'En la sala había una lista de nombres. Algunos los conocía alguien de la compañía.',
        waves: OLEADAS.colmena
      },
      {
        name: 'París', lugar: 'Périphérique · porte de Bagnolet', mapa: sitio(48.86, 2.35),
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
        resumen: 'Todo llega deprisa. Lo que dispara lento no llega a tiempo.',
        parte: ['La ciudad se vació en cuatro días. En el anillo todo llega deprisa.',
          'Lo que dispara lento no llega a tiempo.'],
        cierre: 'Ya no bajan hacia la ciudad: bajan hacia NOSOTROS. Saben que venimos.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Roma', lugar: 'Grande Raccordo Anulare', mapa: sitio(41.90, 12.50), bioma: 'mediterraneo',
        resumen: 'Se curan y el caparazón devuelve las balas.',
        parte: ['Han instalado algo dentro del estadio olímpico. Desde el aire se ve la luz verde por las gradas.',
          'Los que protegen la zona vienen blindados. Hace falta con qué atravesarlos.'],
        cierre: 'Dentro del estadio no había nadie. Solo filas de capullos vacíos, abiertos desde dentro.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Milán', lugar: 'Tangenziale Est', mapa: sitio(45.46, 9.19), bioma: 'mediterraneo',
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
        name: 'Atenas', lugar: 'Pireo · terminal de contenedores', mapa: sitio(37.94, 23.65),
        resumen: 'Se curan entre ellos y el caparazón devuelve las balas.',
        parte: ['La terminal está llena. No de cuerpos: de estructura.',
          'Han dejado de fabricar soldados y han empezado a fabricar oficio.'],
        cierre: 'Encontramos la primera cámara de cría intacta. Tibia, y con sitio para muchas más de las que hemos matado.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Salónica', lugar: 'Carretera del puerto', mapa: sitio(40.64, 22.94),
        resumen: 'Todo llega deprisa por la costa.',
        parte: ['El puerto del norte sirvió de apoyo. Cuando Atenas cayó, todo lo que quedaba vino hacia aquí.',
          'Llegan en columna por la carretera de la costa.'],
        cierre: 'La columna se acabó. Detrás no venía nadie más, por primera vez.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Heraclión', lugar: 'Creta · base naval', mapa: sitio(35.34, 25.14),
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
        name: 'Alejandría', lugar: 'Corniche · puerto este', mapa: sitio(31.20, 29.92), bioma: 'costa',
        resumen: 'Subimos al barco. De frente y en masa.',
        parte: ['El barco de Creta lleva a bordo lo mismo que los contenedores de Valencia: gente dormida en literas.',
          'Los del puerto bajan todos a la vez para que no lleguemos.'],
        cierre: 'Había cuatrocientas personas en el barco. Ciento doce seguían vivas.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Luxor', lugar: 'Carretera del Nilo', mapa: sitio(25.69, 32.64),
        resumen: 'El valle está lleno de formas nuevas.',
        parte: ['El valle del Nilo es donde crían las formas del desierto. Aguantan el calor mejor que nosotros.',
          'Espera algo que no has visto en Europa.'],
        cierre: 'Las formas de aquí no se parecían a las de Europa. Se están adaptando a cada sitio.',
        waves: OLEADAS.formas
      },
      {
        name: 'El Cairo', lugar: 'Gizeh · carretera de la meseta', mapa: sitio(29.98, 31.13),
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
        name: 'Lagos', lugar: 'Apapa · paso elevado', mapa: sitio(6.45, 3.39),
        resumen: 'Llegan deprisa. Hay que aguantar el puente.',
        parte: ['Si cae el paso elevado, aquí no vuelve a entrar nadie.',
          'El búnker dice que aguantemos hasta que evacúen. No dice cuánto.'],
        cierre: 'El puente sigue en pie. La primera columna de evacuados ya ha cruzado.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Abuja', lugar: 'Autopista del aeropuerto', mapa: sitio(9.08, 7.40),
        resumen: 'Se cosen y se blindan.',
        parte: ['El aeropuerto de la capital es la única pista larga que queda en la región. Hace falta para sacar a la gente.',
          'Lo protegen los que se curan entre ellos.'],
        cierre: 'La pista queda libre. Despega el primer avión con evacuados en año y medio.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Kano', lugar: 'Carretera del desierto', mapa: sitio(12.00, 8.52),
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
        name: 'Bombay', lugar: 'Bandra · enlace del mar', mapa: sitio(19.08, 72.88),
        resumen: 'Otra vez de frente, pero nada de esto es como en Tarragona.',
        parte: ['Catorce millones de personas y un campamento en medio.',
          'Vuelven a venir de frente, en masa. La diferencia es cuántos son y lo que aguanta cada uno.'],
        cierre: 'La cuenta del día pasa de mil. El búnker deja de pedirnos el número.',
        waves: OLEADAS.avanzadilla
      },
      {
        name: 'Delhi', lugar: 'Ring Road · puente del Yamuna', mapa: sitio(28.61, 77.21),
        resumen: 'Se curan, se blindan, y son muchos.',
        parte: ['El campamento de la capital está montado alrededor del río. Cruzar el puente es la única entrada.',
          'Los que guardan el puente se cosen entre ellos.'],
        cierre: 'El puente es nuestro. Al otro lado, la ciudad está en silencio.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Calcuta', lugar: 'Puente de Howrah', mapa: sitio(22.57, 88.36),
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
        name: 'Shanghái', lugar: 'Puente de Nanpu', mapa: sitio(31.23, 121.47), bioma: 'monzon',
        resumen: 'Formas nuevas en la costa.',
        parte: ['El puerto de Shanghái recibía lo que salía de Chongqing río abajo.',
          'Aquí llegan las formas terminadas. Espera cosas que no has visto.'],
        cierre: 'Río arriba se ve la luz de Chongqing desde aquí. De noche ilumina las nubes.',
        waves: OLEADAS.formas
      },
      {
        name: 'Pekín', lugar: 'Tercer anillo', mapa: sitio(39.90, 116.41), bioma: 'mediterraneo',
        resumen: 'Llegan deprisa por los anillos.',
        parte: ['El búnker de Pekín es el más grande del mundo. Lleva un año pidiendo que alguien abra la superficie.',
          'Todo lo que hay en la zona baja por los anillos, y baja deprisa.'],
        cierre: 'La trampilla se abre. Salen once mil personas. Tardan un día entero.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Chongqing', lugar: 'Yuzhong · rampa del río', mapa: sitio(29.56, 106.55),
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
        name: 'Vladivostok', lugar: 'Puente de Zolotói · vano este', mapa: sitio(43.12, 131.89),
        resumen: 'Deprisa, y a cuarenta bajo cero.',
        parte: ['Llegan deprisa por el puente. Con la mitad de tu cuerpo dormido de frío.',
          'Lo que dispara lento no llega a tiempo.'],
        cierre: 'Aguantamos el vano. Tres de los nuestros no bajaron del puente.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Novosibirsk', lugar: 'Puente del Obi', mapa: sitio(55.03, 82.92),
        resumen: 'Se curan en el hielo.',
        parte: ['El centro de Siberia. Aquí se refugiaron los que huyeron de China.',
          'Se cosen entre ellos y el caparazón aguanta el frío mejor que la carne.'],
        cierre: 'El río está helado. Debajo del hielo se ven formas quietas, esperando la primavera.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Moscú', lugar: 'MKAD · anillo exterior', mapa: sitio(55.76, 37.62),
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
        name: 'Anchorage', lugar: 'Ensenada de Turnagain', mapa: sitio(61.22, -149.90),
        resumen: 'Se curan, se blindan, y no viene nadie a relevarte.',
        parte: ['El búnker del Ártico está debajo de la ensenada.',
          'Se cosen entre ellos y el caparazón devuelve las balas.'],
        cierre: 'El búnker estaba lleno. No de gente: de camas ordenadas, con un nombre en cada una.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Seattle', lugar: 'I-5 · puerto', mapa: sitio(47.61, -122.33), bioma: 'monzon',
        resumen: 'Formas nuevas bajo la lluvia.',
        parte: ['Llueve desde que llegamos. Las formas de aquí salen del agua del puerto.',
          'No se parecen a nada que hayamos visto en Europa ni en Asia.'],
        cierre: 'Las formas del puerto respiraban bajo el agua. Se siguen adaptando.',
        waves: OLEADAS.formas
      },
      {
        name: 'Nueva York', lugar: 'Puente de Brooklyn', mapa: sitio(40.71, -74.01), bioma: 'costa',
        resumen: 'Todas las formas y dos MADRES.',
        parte: ['La isla es su centro de mando en el norte. Cruzar el puente es la única forma de entrar.',
          'Bajarán todas las formas a la vez, y al final vienen dos.'],
        cierre: 'Las dos cayeron sobre el puente. Por la antena del edificio seguía entrando una voz desde el sur.',
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
      'La calzada de Tlalpan baja recta hasta el centro de la capital, y la han convertido en su avenida.'
    ],
    cierre: 'México queda limpio. Pero antes de caer, la última MADRE mandó algo hacia el sur, y lo que mandó no era una nave.',
    misiones: [
      {
        name: 'Monterrey', lugar: 'Carretera del norte', mapa: sitio(25.69, -100.32),
        resumen: 'Llegan deprisa desde la frontera.',
        parte: ['Lo que huyó de Estados Unidos entró por aquí.',
          'Llegan deprisa por la carretera del norte.'],
        cierre: 'La frontera queda cerrada. Lo que quedaba al otro lado ya no puede bajar.',
        waves: OLEADAS.contraflujo
      },
      {
        name: 'Guadalajara', lugar: 'Periférico · salida sur', mapa: sitio(20.66, -103.35),
        resumen: 'Se curan y se blindan.',
        parte: ['La ciudad es su segundo hospital: aquí reparan lo que les rompemos.',
          'Los que la guardan se cosen entre ellos.'],
        cierre: 'Quemamos las salas de reparación. Lo que se rompa a partir de ahora, se queda roto.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Ciudad de México', lugar: 'Calzada de Tlalpan', mapa: sitio(19.43, -99.13),
        resumen: 'La MADRE del altiplano.',
        parte: ['Veinte kilómetros de campamento a lo largo de la calzada.',
          'Al fondo hay otra MADRE, y ha tenido tiempo de aprender de todas las anteriores.'],
        cierre: 'Cayó. Pero antes mandó algo hacia el sur, hacia el punto más brillante del mapa de Gizeh.',
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
        name: 'Río de Janeiro', lugar: 'Puente Río-Niterói', mapa: sitio(-22.91, -43.17), bioma: 'costa',
        resumen: 'La costa, y formas que no hemos visto.',
        parte: ['Entramos por la costa. Lo que guarda la entrada al continente no se parece a nada anterior.',
          'Es lo último que han diseñado.'],
        cierre: 'Las formas de aquí eran perfectas. Esto era el final del experimento, no el principio.',
        waves: OLEADAS.formas
      },
      {
        name: 'São Paulo', lugar: 'Marginal Tietê', mapa: sitio(-23.55, -46.63), bioma: 'monzon',
        resumen: 'Se curan, y son todos.',
        parte: ['La ciudad más grande del sur es su último hospital.',
          'Todo lo que les queda protege el camino hacia el Amazonas.'],
        cierre: 'El camino al norte queda abierto. Río arriba, el Amazonas.',
        waves: OLEADAS.colmena
      },
      {
        name: 'Manaos', lugar: 'El nido · confluencia de los ríos', mapa: sitio(-3.12, -60.02),
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
