// La campaña: doce destinos por el mundo.
//
// La historia es la que da sentido al mapa. No cayó una nave: llegó una flota,
// y llevaba años bajando a por gente sin que nadie lo contara. Lo que devuelven
// no son personas: son huéspedes, gente reescrita para tomar el planeta desde
// dentro. Donde había una ciudad montan un campamento y siguen trabajando.
//
// Los gobiernos están en búnkeres. Lo que queda arriba son misiones de limpieza
// como esta, una zona cada vez, y por eso la campaña es un mapa y no una
// carretera: cada destino es un campamento suyo en un sitio real.
//
// --- cómo se arma la dificultad ---------------------------------------------
//
// Las seis tablas de oleadas son las de siempre, que están probadas y
// equilibradas. Lo que cambia de un destino a otro es `dureza` —cuánto aguanta
// de más el mismo huésped en cada oleada— y qué tabla le toca. Hacer doce
// tablas a mano habría dado doce niveles sin medir; así la curva sube sola y de
// forma monótona, y si mañana hay que retocar una oleada se retoca en un sitio.

import { OLEADAS } from './oleadas.js'

// De coordenadas reales a la posición en el mapa, que va en proyección plana:
// x de 0 a 1 recorriendo de -180 a 180, y de 0 a 1 bajando de +90 a -90. Se
// calcula aquí y no a mano para que un destino nuevo solo necesite su latitud y
// su longitud, que se buscan en cualquier sitio.
// El paisaje de cada destino vive en biomas.js: la paleta de tierra, cielo y
// luz, la vegetación típica y, donde de verdad ancla el sitio, un hito al fondo.
const sitio = (lat, lon) => ({ x: (lon + 180) / 360, y: (90 - lat) / 180 })

// El peaje de estrellas de cada destino, y está CALIBRADO, no puesto a ojo.
//
// La regla que no se puede romper: quien saque tres estrellas en todo tiene que
// poder seguir siempre. Con tres por destino se llevan 3i estrellas al llegar
// al destino i, así que ningún peaje puede pasar de ahí — el primer reparto que
// escribí dejaba a un jugador PERFECTO atascado en el séptimo destino, que es
// un muro puesto por accidente.
//
// Y la regla que sí se quiere: quien saque dos de media se atasca de vez en
// cuando. Con dos por destino se llevan 2i, y a partir del quinto el peaje pasa
// de eso: ahí es donde toca volver a un campamento ya limpiado y sacarle la
// estrella que faltó. Que es justo lo que hace que puedas volver atrás.
// Qué dibujo le toca a cada destino.
//
// Los seis dibujos del informe son escenas de carretera, y con doce destinos
// repartirlos por orden hacía que Bombay enseñara el kilómetro 12 de Tarragona.
// Se reparten por TABLA DE OLEADAS, que además informa: dos destinos con el
// mismo dibujo se juegan igual, y quien haya sufrido Nápoles reconoce de un
// vistazo que Vladivostok le va a exigir lo mismo.
const ESCENA = {
  avanzadilla: 1,   // carretera abierta y nada más: el primer contacto
  formas: 2,        // el cruce: aquí aparecen maneras nuevas
  madre: 3,         // el nido: campamento grande y un jefe al fondo
  contraflujo: 4,   // la bajada: todo llega deprisa
  colmena: 5,       // el área de servicio: se cosen entre ellos
  todas: 6          // el kilómetro cero: todo a la vez
}

// La tabla se guarda por referencia en cada destino, así que el nombre se
// recupera dando la vuelta al objeto. Preferible a repetir el nombre a mano en
// los doce, que es una copia más que puede quedarse desfasada.
const NOMBRE_TABLA = new Map(Object.entries(OLEADAS).map(([nombre, tabla]) => [tabla, nombre]))
export const escenaDe = destino => ESCENA[NOMBRE_TABLA.get(destino.waves)] ?? 1

export const DESTINOS = [
  {
    name: 'Tarragona',
    pais: 'España',
    lugar: 'Carretera 7 · kilómetro 12',
    resumen: 'El primer campamento. Vienen de frente y poco más.',
    parte: [
      'Doce kilómetros de asfalto entre su campamento y lo que queda de la ciudad. La orden del búnker es de una línea: que no pasen.',
      'Los primeros llegan sin método. Caminan hacia el ruido porque es lo único que les dejaron saber hacer.'
    ],
    cierre: 'Ninguno pasó. Al recoger los cuerpos, uno llevaba todavía la tarjeta de empleado de una fábrica de Reus.',
    bioma: 'mediterraneo',
    mapa: sitio(41.12, 1.25),
    estrellas: 0,
    desbloquea: ['shotgun', 'spikes'],
    dureza: 0.06,
    waves: OLEADAS.avanzadilla
  },
  {
    name: 'Marsella',
    pais: 'Francia',
    lugar: 'Puerto viejo · dique norte',
    resumen: 'Escupen a distancia, saltan las barreras y revientan al caer.',
    parte: [
      'El campamento del puerto lleva más tiempo montado, y se nota: los huéspedes ya no vienen todos iguales.',
      'Hay quien escupe, quien salta y quien revienta. No están improvisando: están probando qué funciona contra nosotros.'
    ],
    cierre: 'Tres formas nuevas en un solo muelle. Esto no es una plaga: es un taller con turnos.',
    bioma: 'costa',
    mapa: sitio(43.30, 5.37),
    estrellas: 2,
    desbloquea: ['sniper', 'flamer', 'collector'],
    dureza: 0.10,
    waves: OLEADAS.formas
  },
  {
    name: 'Nápoles',
    pais: 'Italia',
    lugar: 'Bajo el Vesubio · anillo sur',
    resumen: 'Todo llega deprisa. Lo que dispara lento no llega a tiempo.',
    parte: [
      'Aquí bajaron pronto y bajaron muchos. La ciudad se vació en cuatro días y nadie de fuera vio cómo.',
      'En la carretera del anillo todo llega deprisa. Lo que dispara lento no llega a tiempo.'
    ],
    cierre: 'Ya no bajan hacia la ciudad: bajan hacia NOSOTROS. Saben que venimos.',
    bioma: 'volcanico',
    mapa: sitio(40.85, 14.26),
    estrellas: 4,
    dureza: 0.14,
    waves: OLEADAS.contraflujo
  },
  {
    name: 'Atenas',
    pais: 'Grecia',
    lugar: 'Pireo · terminal de contenedores',
    resumen: 'Se curan entre ellos y el caparazón devuelve las balas.',
    parte: [
      'La terminal está llena. No de cuerpos: de estructura. Han dejado de fabricar soldados y han empezado a fabricar oficio.',
      'Se cosen entre ellos mientras les disparas. Hay que elegir a quién matar primero.'
    ],
    cierre: 'Encontramos la primera cámara de cría intacta. Tibia, vacía, y con sitio para muchas más de las que hemos matado.',
    bioma: 'egeo',
    mapa: sitio(37.94, 23.65),
    estrellas: 6,
    desbloquea: ['gunner'],
    dureza: 0.18,
    waves: OLEADAS.colmena
  },
  {
    name: 'El Cairo',
    pais: 'Egipto',
    lugar: 'Gizeh · carretera de la meseta',
    resumen: 'El primer campamento grande. Y lo que lo dirige.',
    parte: [
      'De aquí salió todo lo que hemos visto en el Mediterráneo. Los satélites del búnker llevan meses contando naves posándose en la meseta.',
      'Detrás de la horda viene algo que ninguno de nosotros ha visto entero. Le llaman LA MADRE porque no supieron llamarla de otra forma.'
    ],
    cierre: 'La MADRE cayó. Debajo, en la arena reventada, había un túnel que baja. Esto no era el nido: era una puerta.',
    bioma: 'desierto',
    mapa: sitio(29.98, 31.13),
    estrellas: 9,
    desbloquea: ['mortar', 'airstrike'],
    dureza: 0.21,
    waves: OLEADAS.madre
  },
  {
    name: 'Lagos',
    pais: 'Nigeria',
    lugar: 'Apapa · paso elevado',
    resumen: 'Más campamento, más túnel, y todo a la vez.',
    parte: [
      'El paso elevado es lo único que une lo que queda de la ciudad con el continente. Si cae, aquí no vuelve a entrar nadie.',
      'Bajarán todas las formas a la vez. El búnker dice que aguantemos hasta que evacúen. No dice cuánto.'
    ],
    cierre: 'El puente sigue en pie. Debajo pasaron cuatro mil personas mientras nosotros contábamos oleadas.',
    bioma: 'sabana',
    mapa: sitio(6.45, 3.39),
    estrellas: 12,
    dureza: 0.25,
    waves: OLEADAS.todas
  },
  {
    name: 'Bombay',
    pais: 'India',
    lugar: 'Bandra · enlace del mar',
    resumen: 'Otra vez de frente, pero nada de esto es como en Tarragona.',
    parte: [
      'Aquí no hubo evacuación. Hubo catorce millones de personas y un campamento en medio.',
      'Vuelven a venir de frente, en masa, como los primeros. La diferencia es cuántos son y lo que aguanta cada uno.'
    ],
    cierre: 'La cuenta del día pasa de mil. El búnker deja de pedirnos el número.',
    bioma: 'monzon',
    mapa: sitio(19.08, 72.88),
    estrellas: 15,
    dureza: 0.30,
    waves: OLEADAS.avanzadilla
  },
  {
    name: 'Chongqing',
    pais: 'China',
    lugar: 'Yuzhong · rampa del río',
    resumen: 'Formas nuevas otra vez. Aquí experimentan con lo que funciona.',
    parte: [
      'Este es el campamento más grande que hemos localizado. No fabrican soldados para tomar la ciudad: la ciudad ya es suya.',
      'Fabrican para exportar. Lo que salga de aquí bajará luego por media Asia.'
    ],
    cierre: 'Reventamos la cría y las naves siguieron llegando igual. No las estábamos frenando: las estábamos entreteniendo.',
    bioma: 'karstico',
    mapa: sitio(29.56, 106.55),
    estrellas: 18,
    dureza: 0.34,
    waves: OLEADAS.formas
  },
  {
    name: 'Vladivostok',
    pais: 'Rusia',
    lugar: 'Puente de Zolotói · vano este',
    resumen: 'Deprisa, y a cuarenta bajo cero.',
    parte: [
      'El frío no les hace nada. A nosotros sí: el arma se agarrota y el que cae no se levanta.',
      'Y vienen deprisa. Aquí lo que dispara lento no llega a tiempo, igual que en Nápoles, pero con la mitad de tu cuerpo dormido.'
    ],
    cierre: 'Aguantamos el vano. Tres de los nuestros no bajaron del puente.',
    bioma: 'taiga',
    mapa: sitio(43.12, 131.89),
    estrellas: 21,
    dureza: 0.38,
    waves: OLEADAS.contraflujo
  },
  {
    name: 'Anchorage',
    pais: 'Alaska',
    lugar: 'Ensenada de Turnagain',
    resumen: 'Se curan, se blindan, y aquí no viene nadie a relevarte.',
    parte: [
      'El búnker del Ártico lleva cuatro meses sin responder. Venimos a ver por qué, con la munición contada.',
      'Se cosen entre ellos y el caparazón devuelve las balas. Y no hay extracción hasta que esto acabe.'
    ],
    cierre: 'El búnker estaba lleno. No de gente: de camas, ordenadas, con nombre en cada una.',
    bioma: 'artico',
    mapa: sitio(61.22, -149.90),
    estrellas: 24,
    dureza: 0.42,
    waves: OLEADAS.colmena
  },
  {
    name: 'Ciudad de México',
    pais: 'México',
    lugar: 'Calzada de Tlalpan',
    resumen: 'La segunda MADRE, y esta sabe lo que le pasó a la primera.',
    parte: [
      'La calzada baja recta hasta el centro y ellos la han convertido en su avenida. Veinte kilómetros de campamento.',
      'Al fondo hay otra MADRE. Y a diferencia de la del Cairo, esta ha tenido tiempo de aprender de la nuestra.'
    ],
    cierre: 'Cayó. Pero antes mandó algo hacia el sur, y lo que mandó no era una nave.',
    bioma: 'altiplano',
    mapa: sitio(19.43, -99.13),
    estrellas: 27,
    dureza: 0.46,
    waves: OLEADAS.madre
  },
  {
    name: 'Manaos',
    pais: 'Amazonas',
    lugar: 'El nido · confluencia de los ríos',
    resumen: 'Todo a la vez, y al final no viene una MADRE: vienen dos.',
    parte: [
      'Aquí es donde bajaron primero, hace años, cuando todavía nadie miraba. De aquí salieron los camiones que se llevaban gente sin que constara en ninguna parte.',
      'No queda nadie detrás de nosotros y no hay otro sitio al que ir. Bajarán todas las formas a la vez, y al final no viene una MADRE: vienen dos.'
    ],
    cierre: 'Se acabó.',
    bioma: 'selva',
    mapa: sitio(-3.12, -60.02),
    estrellas: 30,
    dureza: 0.52,
    waves: OLEADAS.todas
  }
]
