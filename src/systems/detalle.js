// Cuánta geometría se construye. NO es lo mismo que la calidad de dibujado.
//
// El ajuste de calidad bajaba resolución, sombras y resplandor: cosas que
// cuestan por PÍXEL. Pero el juego también pesa por lo que hay que dibujar, y
// eso no lo tocaba nadie: con el tablero lleno son 1368 llamadas de dibujado y
// un millón y medio de vértices, los mismos en «Alta» que en «Baja». En un móvil
// viejo eso se traba aunque pintes a un cuarto de resolución.
//
// Este módulo decide, ANTES de construir nada, con cuánto detalle se hacen las
// figuras. Va aparte de `calidad.js` a propósito: la calidad se puede cambiar en
// mitad de una partida y se aplica al instante, pero el detalle solo puede
// aplicarse a lo que se construya A PARTIR de ese momento — una figura ya hecha
// no se rehace sola, y rehacerlas todas daría justo el tirón que se quiere
// evitar.

const CLAVE = 'alienz-calidad-v1'

// Factor sobre los segmentos de cada primitiva. Un cilindro de diez lados con
// factor 0,6 pasa a seis: en una figura de setenta píxeles de alto no se
// distingue, y una esfera baja de 14x10 a 8x6, que es la mitad de vértices.
export const FACTORES = { alta: 1, media: 0.8, baja: 0.55 }

function adivinarPorElAparato () {
  // Con la calidad en automático la mejor pista es lo que pasó la última vez:
  // `calidad.js` apunta el escalón en el que acabó el ajuste automático después
  // de medir fotogramas de verdad en ESTE móvil. Si la última partida terminó en
  // bajo, se construye ya en bajo en vez de volver a trabarse para descubrirlo.
  try {
    const v = localStorage.getItem('alienz-detalle-v1')
    if (v === 'alta' || v === 'media' || v === 'baja') return v
  } catch { /* modo privado */ }

  // Primera vez en este móvil: no hay medición todavía, y las figuras hay que
  // construirlas antes de poder medir nada. Estas dos señales son lo único que
  // hay a tiempo, y fallan por el lado bueno — si se queda corto, lo que se
  // pierde es detalle que a esa distancia no se ve.
  const nucleos = navigator.hardwareConcurrency ?? 4
  const memoria = navigator.deviceMemory ?? 4
  if (nucleos <= 4 && memoria <= 3) return 'baja'
  if (nucleos <= 6 || memoria <= 4) return 'media'
  return 'alta'
}

function elegir () {
  let pref = 'auto'
  try { pref = localStorage.getItem(CLAVE) ?? 'auto' } catch { /* modo privado */ }
  if (pref === 'alta' || pref === 'media' || pref === 'baja') return pref
  return adivinarPorElAparato()
}

const nivel = elegir()

export const NIVEL_DETALLE = nivel
export const DETALLE = FACTORES[nivel] ?? 1

// Los adornos: cristales de espora sueltos, tiras de camuflaje, jirones, venas.
// Cada uno es una pieza más con su material, o sea una llamada de dibujo más por
// figura. De cerca dan vida; a la distancia de juego son ruido caro.
export const CON_ADORNOS = DETALLE > 0.7

// Cocer la oclusión cuesta unos seis milisegundos por figura y añade un color
// por vértice a toda la malla. En un móvil justo, ese tiempo se nota al colocar.
export const CON_OCLUSION = DETALLE > 0.7

// Agrupar materiales casi iguales en un solo dibujo. Ahorra llamadas de dibujado
// —lo que de verdad ahoga a un móvil viejo— a cambio de perder medio tono entre
// piezas de campaña que a esa distancia nadie separa.
export const FUNDE_TONOS = DETALLE <= 0.7

// Cuántos lados le tocan a una primitiva con este detalle. Nunca menos de tres,
// que es el mínimo para que un cilindro siga siendo un cuerpo.
export const seg = (n, minimo = 3) => Math.max(minimo, Math.round(n * DETALLE))
