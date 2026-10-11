// Quién habla en el juego y qué dice (Isidro, 11/10: «sonidos de los personajes
// que hablen en algún momento, que tengan frases recurrentes»).
//
// LAS FRASES SON DE ISIDRO: se acuerdan con él («negociemos las frases cuando
// haga falta»). Estas las aprobó el 11/10/2026 tal cual, después de pedir el tono
// «con humor y gamberras» y luego «más gamberras aún»; las de soldado caído y
// derrota se quedan serias. No añadir ni cambiar ninguna sin enseñársela antes.
//
// Cada hablante tiene su voz (una de las cinco de Piper, con su tono y su ritmo)
// y sus frases por momento. Para cambiar una frase, o añadirle otra a alguien, se
// toca aquí y se pasa `node herramientas/voces/montar.mjs`: rehace solo lo que
// haya cambiado.
//
// `{o/a}` es la terminación de chico o de chica: los nueve soldados de la tienda
// tienen las dos versiones y cada una habla con su voz.
//
// Los momentos de un soldado: `sale` (al ponerlo en el campo), `baja` (acaba de
// tumbar a uno), `herido` (le queda poca vida) y `mejora` (se le sube de nivel).
//
// Dos cosas del texto que no son erratas:
//   · los nombres que no son castellanos van COMO SUENAN («Yil», «Cler», «Robin
//     Jud»): la voz lee en castellano y «Jill» lo diría con jota y elle. Nadie
//     lee estas frases en pantalla, solo se oyen;
//   · quien tiene voz mexicana (la Escopetera, la Lanzallamas, los dos del
//     misil, el Mortero, Claire, Rebecca, Sheva y el piloto) no dice «vosotros»:
//     «aguantad» con ese acento chocaba. Como chico y chica comparten el texto,
//     esas frases van sin «vosotros» para los dos.

const SOLDADOS = {
  archer: {
    sale: ['Flechas listas. Bichos, a temblar.', 'Sin pilas y sin ruido.', 'Abierta la veda de bichos feos.'],
    baja: ['¡Pincho de alien!', '¡Toma palo, cabezón!', '¡Diana! ¿Quién da más?'],
    herido: ['¡Que yo soy de lejos, leches!', '¡Quitádmelos, que me comen!'],
    mejora: ['Robin Jud, a mi lado, un pringado.']
  },
  rifle: {
    sale: ['¡A currar, que hay bichos!', '¿Esto se paga como hora extra?', '¡Fusiler{o/a} list{o/a}! ¿Dónde están esos feos?'],
    baja: ['¡A tu planeta, guapo!', '¡Chúpate esa!', '¡Que pase el siguiente pringado!'],
    herido: ['¡Que me muerden el culo!', '¡Joder, una ayudita!'],
    mejora: ['¡Ahora sí que la lío!']
  },
  shotgun: {
    sale: ['¡Que se acerquen, que tengo hambre!', 'De cerca no fallo. De lejos, ni lo intento.', '¿Quién quiere perdigones en la cara?'],
    baja: ['¡Trágate esa!', '¡Hecho papilla!', '¡Y con propina, feo!'],
    herido: ['¡De uno en uno, sin colarse!', '¡Aguanto, pero no soy de piedra!'],
    mejora: ['Más plomo. Casi lloro.']
  },
  sniper: {
    sale: ['Silencio, que trabaja {el/la} artista.', 'A ese le veo hasta los empastes.', 'Tengo visual. Y qué feos son.'],
    baja: ['Buenas noches, guapo.', 'Ni se ha enterado, el pobre.', 'Entre ceja y ceja.'],
    herido: ['¡Esto de cerca es una guarrada!', '¡Me han pillado! ¡Qué mala educación!'],
    mejora: ['Ahora les cuento las pestañas.']
  },
  flamer: {
    sale: ['¿Alguien ha pedido barbacoa?', '¡Hora de asar bichos!', '¡Hoy ceno alien a la brasa!'],
    baja: ['¡Vuelta y vuelta!', '¡Bien churruscado!', '¡Huele a pollo quemado!'],
    herido: ['¡Que {el/la} que quema soy yo!', '¡Atrás, bichos, o los hago chicharrón!'],
    mejora: ['¡Más gasolina! ¡Qué feliz soy!']
  },
  gunner: {
    sale: ['¡A hacer ruido, que es gratis!', '¡Hoy llueve plomo!', '¡Vecinos, perdonad el escándalo!'],
    baja: ['¡Caen como moscas!', '¡Y aún me sobran balas!', '¡Colador de alien!'],
    herido: ['¡Que no doy abasto, leches!', '¡Se me suben a la chepa!'],
    mejora: ['¡Más balas por segundo, más alegría!']
  },
  misil: {
    sale: ['¡Aparta, que salpica!', '¡Correo urgente para los feos!', '¡Traigo fuegos artificiales!'],
    baja: ['¡Bum! ¡Adiós, guapo!', '¡A volar, bonito!', '¡Quedó en trocitos!'],
    herido: ['¡Tan cerca no, que volamos todos!', '¡Espérense, que estoy recargando!'],
    mejora: ['Ahora el bum es más gordo.']
  },
  mortar: {
    sale: ['¡Cuidado, que caen cosas!', 'A ojo... más o menos por ahí.', '¡Ojo al cielo, feos!'],
    baja: ['¡Y eso que tiraba a ojo!', '¡Les llovió encima!', '¡Tortilla de alien!'],
    herido: ['¡Que yo tiro de lejos, quita!', '¡Me rodean! ¡Qué pesados!'],
    mejora: ['Más lejos y más gordo.']
  },
  capitan: {
    sale: ['¡Tranquilos, ya ha llegado {el jefe/la jefa}!', '¡Capit{án/ana} Cuervo! Los autógrafos, luego.', '¡Conmigo, inútiles! Con cariño.'],
    baja: ['¡Así se hace! Tomad nota.', '¡Aprended, novatos!', '¡Otro para mi colección!'],
    herido: ['¡Es solo un rasguño!', '¡No me duele, es que grito así!'],
    mejora: ['Más medallas. Ya no me caben.']
  }
}

// Las voces de Piper (`bajar-piper.mjs`): dos hombres y una mujer de España y un
// hombre y una mujer de México. `windows` es la que la sustituye si se montan
// con las de Windows (`montar.mjs --windows`).
export const VOCES_PIPER = {
  dave: { modelo: 'es_ES-davefx-medium', windows: 'pablo' },
  sharM: { modelo: 'es_ES-sharvard-medium', hablante: 0, windows: 'pablo' },
  sharF: { modelo: 'es_ES-sharvard-medium', hablante: 1, windows: 'helena' },
  ald: { modelo: 'es_MX-ald-medium', windows: 'pablo' },
  claude: { modelo: 'es_MX-claude-high', windows: 'laura' }
}

// La voz de cada uno: [chica, chico], y de cada cual [voz, tono %, ritmo %]. Con
// cinco voces, lo que distingue a un soldado de otro que comparte la suya es el
// tono (más grave: más corpulento; más agudo: más joven) y el ritmo. La Capitana
// lleva voz de España: es quien más órdenes da, y las da de «vosotros».
const VOZ = {
  archer: [['sharF', -3, 6], ['sharM', -3, 6]],
  rifle: [['sharF', 3, 12], ['dave', 0, 12]],
  shotgun: [['claude', -8, 15], ['dave', -12, 15]],
  sniper: [['sharF', -8, 2], ['sharM', -9, 2]],
  flamer: [['claude', 5, 16], ['sharM', 6, 16]],
  gunner: [['sharF', -12, 14], ['dave', -7, 14]],
  misil: [['claude', 0, 12], ['ald', -4, 18]],
  mortar: [['sharF', 8, 8], ['ald', -11, 16]],
  capitan: [['sharF', -10, 10], ['dave', -16, 10]]
}

// Las cinco de la caja alienígena: son quien son, con una sola voz. Frases
// propias del juego, ninguna sacada de los suyos.
const UNICAS = {
  jill: {
    voz: ['sharF', -5, 8],
    sale: ['Apartad, que tengo prisa.', 'Yo me encargo. Como siempre.', 'Yil al aparato. ¿A quién hay que reventar?'],
    baja: ['¿Eso era todo?', 'Demasiado fácil. Me aburro.', 'Siguiente pringado.'],
    herido: ['¡Vale, esto ya no tiene gracia!', '¡Quitadme a estos babosos!'],
    mejora: ['Pistola a punto. Agarraos.']
  },
  claire: {
    voz: ['claude', 7, 12],
    sale: ['¿Quién quiere una granada?', 'Esto va a arder. Y me encanta.', '¡Cler, lista! ¡Corran, feos!'],
    baja: ['¡Toma esa!', '¡Chamuscado!', '¡Y no vuelvas, baboso!'],
    herido: ['¡Oigan, de uno en uno!', '¡Ya, ya, qué intensos!'],
    mejora: ['Granadas nuevas. Qué ilusión.']
  },
  ada: {
    voz: ['sharF', -14, 5],
    sale: ['No me esperéis despiertos.', 'Trabajo sola. Vosotros estorbáis.', 'Ni me oirán llegar.'],
    baja: ['No era nada personal.', 'Elegante. Como yo.', 'Qué poco aguante.'],
    herido: ['Esto no estaba en el plan.', 'Qué vulgares, atacando en grupo.'],
    mejora: ['Interesante. Sigue.']
  },
  rebecca: {
    voz: ['claude', 12, 12],
    sale: ['¡Aguanten, que traigo vendas!', '¡Rebeca, médica! No se me mueran.', 'Botiquín listo. Y la metralleta también.'],
    baja: ['¡Y sin receta!', '¡A ese no lo curo!', '¡Diagnóstico: bien muerto!'],
    herido: ['¿Hay un médico por aquí? Ah, que soy yo.', '¡Ahora la herida soy yo!'],
    mejora: ['Vendas nuevas. Qué lujo.']
  },
  sheva: {
    voz: ['claude', -5, 4],
    sale: ['A ver quién asoma la cabeza.', 'Sheva, cubriendo el flanco.', 'Objetivo fijado. Pobrecito.'],
    baja: ['Ese ya no molesta.', 'Camino despejado. De nada.', 'Abatido. Siguiente.'],
    herido: ['¡Los tengo encima! ¡Qué confianzas!', '¡Me alcanzan!'],
    mejora: ['Fusil calibrado. Corran.']
  }
}

// La radio: quien manda (oleadas, la base, el final) y quien trae el apoyo.
const RADIO = {
  mando: {
    voz: ['sharM', -12, 14],
    inicio: ['Buenos días. Hoy tampoco hay descanso.', 'Que no pase ni uno. Ni medio.', 'Soldados, a ganarse el sueldo.'],
    oleada: ['¡Más bichos! ¡Qué sorpresa!', 'Vienen más. Y no traen flores.', '¡Ahí vienen, y siguen igual de feos!', '¡Nueva oleada! ¿No se cansan nunca?', '¡Contacto al frente! ¡A repartir!'],
    ultima: ['¡La última! ¡Luego invito yo!', '¡Última oleada! ¡Aguantad, leches!'],
    jefe: ['¡La madre que los parió! Literalmente.', '¡La Madre! ¡Y viene enfadada!'],
    grande: ['¡Ese no cabe por la puerta!', '¡Coloso a la vista! ¡Qué bestia!'],
    nuevo: ['¿Y eso qué demonios es?', 'Bicho nuevo. Y más feo que el anterior.'],
    base: ['¡Que se nos cuelan en casa!', '¡Han roto la línea! ¿Estáis dormidos?'],
    apurada: ['¡La base no aguanta más!', '¡Un golpe más y nos vamos al paro!'],
    // Estas dos, serias: aquí no hay broma.
    caido: ['¡Soldado caído!', '¡Hemos perdido a uno!', '¡Baja en la línea!'],
    asalto: ['¡Ahora nos toca a nosotros!', '¡A por la base! ¡Sin piedad!'],
    victoria: ['¡Victoria! Las cañas las pago yo.', '¡Zona asegurada! Sois unos bestias.'],
    derrota: ['¡Nos desbordan! ¡Retirada!', 'Hemos perdido la posición.']
  },
  apoyo: {
    voz: ['ald', -5, 30],
    grenade: ['¡Granada va! ¡Agáchense!'],
    airstrike: ['Aquí Halcón. Traigo regalitos.', 'Aquí Halcón. Bombas fuera, y de nada.'],
    napalm: ['Aquí Halcón. Hoy toca barbacoa.', 'Napalm en camino. ¡Quítense de ahí!'],
    artilleria: ['Tápense los oídos.', 'Artillería, ¡fuego! Que tiemble todo.'],
    dron: ['El dron ya eligió a su favorito.', 'Dron en el aire. Sonríe, feo.'],
    misilGuiado: ['Pájaro en el aire.', 'Misil lanzado. Despídanse.'],
    campoMinas: ['Minas puestas. Cuidado dónde pisan.', 'Sembrando minas. Sorpresa, sorpresa.'],
    botiquin: ['Ahí va el botiquín. De nada.', '¡Sanitario en camino! Aguanten.']
  }
}

const deSexo = (texto, chico) => texto.replace(/\{([^/}]*)\/([^}]*)\}/g, (_, o, a) => (chico ? o : a))

// Todo junto: { hablante: { voz: [nombre, tono %, ritmo %], frases: { momento: [textos] } } }.
// Los soldados de la tienda salen dos veces, `rifle-f` y `rifle-m`.
export function reparto () {
  const todos = {}
  for (const [clave, frases] of Object.entries(SOLDADOS)) {
    for (const chico of [0, 1]) {
      const suyas = {}
      for (const [momento, lista] of Object.entries(frases)) suyas[momento] = lista.map(t => deSexo(t, chico))
      todos[`${clave}-${chico ? 'm' : 'f'}`] = { voz: VOZ[clave][chico], frases: suyas }
    }
  }
  for (const [clave, { voz, ...frases }] of Object.entries({ ...UNICAS, ...RADIO })) todos[clave] = { voz, frases }
  return todos
}
