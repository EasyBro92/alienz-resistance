// Quién habla en el juego y qué dice (Isidro, 11/10: «sonidos de los personajes
// que hablen en algún momento, que tengan frases recurrentes»).
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

const SOLDADOS = {
  archer: {
    sale: ['Flechas listas.', 'En silencio.', 'De caza.'],
    baja: ['Ni lo ha oído.', '¡Diana!', 'Otra flecha, otro menos.'],
    herido: ['¡Los tengo encima!', '¡Necesito ayuda aquí!'],
    mejora: ['Mejor arco, mejor puntería.']
  },
  rifle: {
    sale: ['¡Fusiler{o/a} en posición!', '¡List{o/a} para el combate!', '¡A sus órdenes!'],
    baja: ['¡Uno menos!', '¡Blanco abatido!', '¡Siguiente!'],
    herido: ['¡Me están mordiendo!', '¡Apoyo, necesito apoyo!'],
    mejora: ['¡Así da gusto!']
  },
  shotgun: {
    sale: ['¡Que se acerquen!', 'De cerca no fallo.', '¡Escopeta cargada!'],
    baja: ['¡A bocajarro!', '¡Toma perdigones!', '¡Hecho papilla!'],
    herido: ['¡Vienen demasiados!', '¡Aguanto, pero daos prisa!'],
    mejora: ['Más plomo. Me gusta.']
  },
  sniper: {
    sale: ['Tengo visual.', 'Objetivo en la mira.', 'En posición de tiro.'],
    baja: ['Blanco eliminado.', 'Un disparo, una baja.', 'Limpio.'],
    herido: ['¡Me han localizado!', '¡Los tengo encima, cubridme!'],
    mejora: ['Mira ajustada.']
  },
  flamer: {
    sale: ['¡Hora de asar bichos!', '¡Que arda todo!', '¡Mechero encendido!'],
    baja: ['¡Bien churruscado!', '¡Al punto!', '¡Huele a victoria!'],
    herido: ['¡Atrás, bichos, atrás!', '¡Necesito cobertura!'],
    mejora: ['¡Más gasolina!']
  },
  gunner: {
    sale: ['¡Fuego de cobertura!', '¡Ametralladora lista!', '¡Lluvia de plomo!'],
    baja: ['¡Barridos!', '¡Caen como moscas!', '¡Que no quede ni uno!'],
    herido: ['¡Se me echan encima!', '¡No puedo con todos!'],
    mejora: ['¡Más cadencia!']
  },
  misil: {
    sale: ['¡Misil preparado!', '¡Despejad la zona!', '¡Lanzador en posición!'],
    baja: ['¡Impacto directo!', '¡Bum! ¡Adiós!', '¡Por los aires!'],
    herido: ['¡Están demasiado cerca!', '¡Cubridme mientras recargo!'],
    mejora: ['Carga más potente.']
  },
  mortar: {
    sale: ['¡Mortero listo!', '¡Fuego va!', 'Calculando distancia.'],
    baja: ['¡En el blanco!', '¡Les ha llovido encima!', '¡Justo en medio!'],
    herido: ['¡Han llegado a mi posición!', '¡Me rodean!'],
    mejora: ['Más alcance, más daño.']
  },
  capitan: {
    sale: ['¡Capit{án/ana} Cuervo al mando!', '¡Conmigo, soldados!', '¡Aguantad la línea!'],
    baja: ['¡Así se hace!', '¡Ni un paso atrás!', '¡Seguid disparando!'],
    herido: ['¡No cedáis!', '¡Estoy bien, seguid!'],
    mejora: ['Bien. Ahora, en serio.']
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
// tono (más grave: más corpulento; más agudo: más joven) y el ritmo.
const VOZ = {
  archer: [['sharF', -3, 6], ['sharM', -3, 6]],
  rifle: [['sharF', 3, 12], ['dave', 0, 12]],
  shotgun: [['claude', -8, 8], ['dave', -12, 8]],
  sniper: [['sharF', -8, 0], ['sharM', -9, 0]],
  flamer: [['claude', 5, 16], ['sharM', 6, 16]],
  gunner: [['sharF', -12, 14], ['dave', -7, 14]],
  misil: [['claude', 0, 12], ['ald', -4, 18]],
  mortar: [['sharF', 8, 8], ['ald', -11, 16]],
  capitan: [['claude', -13, 4], ['dave', -16, 4]]
}

// Las cinco de la caja alienígena: son quien son, con una sola voz. Frases
// propias del juego, ninguna sacada de los suyos.
const UNICAS = {
  jill: {
    voz: ['sharF', -5, 8],
    sale: ['Yo me encargo.', 'Jill, en posición.', 'Abro paso.'],
    baja: ['Fuera de combate.', 'Demasiado fácil.', 'Siguiente.'],
    herido: ['¡Me tienen rodeada!', '¡Necesito un respiro!'],
    mejora: ['Pistola a punto.']
  },
  claire: {
    voz: ['claude', 7, 12],
    sale: ['¡Claire, lista!', 'Esto va a arder.', '¡Granada cargada!'],
    baja: ['¡Toma esa!', '¡Chamuscado!', '¡Y no vuelvas!'],
    herido: ['¡Son demasiados!', '¡Ayuda por aquí!'],
    mejora: ['Mejor munición.']
  },
  ada: {
    voz: ['sharF', -14, 0],
    sale: ['Trabajo sola.', 'Ni me oirán llegar.', 'Ada, en el campo.'],
    baja: ['Sin hacer ruido.', 'Elegante.', 'Uno menos del que preocuparse.'],
    herido: ['Esto no estaba en el plan.', 'Se complica.'],
    mejora: ['Interesante.']
  },
  rebecca: {
    voz: ['claude', 12, 10],
    sale: ['¡Rebecca, médica en posición!', '¡Aguantad, que os curo!', 'Botiquín listo.'],
    baja: ['¡También sé disparar!', '¡Le he dado!', '¡Fuera de aquí!'],
    herido: ['¡Ahora la herida soy yo!', '¡Necesito ayuda!'],
    mejora: ['Vendas nuevas.']
  },
  sheva: {
    voz: ['claude', -5, 4],
    sale: ['Sheva, cubriendo el flanco.', 'Objetivo fijado.', 'Estoy lista.'],
    baja: ['Abatido.', 'Buen disparo.', 'Camino despejado.'],
    herido: ['¡Los tengo encima!', '¡Me alcanzan!'],
    mejora: ['Fusil calibrado.']
  }
}

// La radio: quien manda (oleadas, la base, el final) y quien trae el apoyo.
const RADIO = {
  mando: {
    voz: ['sharM', -12, 14],
    inicio: ['Soldados, defended la línea.', 'Que no pase ni uno.', 'En posición. Ya vienen.'],
    oleada: ['¡Ahí vienen!', '¡Nueva oleada!', '¡Contacto al frente!', '¡Atentos, llegan más!', 'Movimiento al fondo.'],
    ultima: ['¡Última oleada! ¡Aguantad!', '¡Es la última! ¡Dadlo todo!'],
    jefe: ['¡Es la Madre! ¡Fuego con todo!', '¡Ahí está la Madre! ¡No dejéis de disparar!'],
    grande: ['¡Coloso a la vista!', '¡Viene uno grande!'],
    nuevo: ['Forma desconocida. ¡Cuidado!', 'Eso no lo habíamos visto antes.'],
    base: ['¡Han roto la línea!', '¡Están entrando en la base!'],
    apurada: ['¡La base no aguanta más!', '¡Un golpe más y caemos!'],
    caido: ['¡Soldado caído!', '¡Hemos perdido a uno!', '¡Baja en la línea!'],
    asalto: ['¡A por la base! ¡Avanzad!', '¡Es nuestra! ¡Al asalto!'],
    victoria: ['¡Zona asegurada! Buen trabajo.', '¡Victoria! La ciudad es nuestra.'],
    derrota: ['¡Nos desbordan! ¡Retirada!', 'Hemos perdido la posición.']
  },
  apoyo: {
    voz: ['ald', -5, 22],
    grenade: ['¡Granada va!'],
    airstrike: ['Aquí Halcón. Bombas fuera.', 'Ataque aéreo en camino.'],
    napalm: ['Napalm en camino. ¡A cubierto!', 'Aquí Halcón. Soltando napalm.'],
    artilleria: ['Artillería, ¡fuego!', 'Bombardeo en camino.'],
    dron: ['Dron en el aire.', 'Dron fijado al objetivo.'],
    misilGuiado: ['Misil lanzado.', 'Pájaro en el aire.'],
    campoMinas: ['Sembrando minas.', 'Campo de minas listo.'],
    botiquin: ['¡Sanitario en camino!', 'Botiquín lanzado.']
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
