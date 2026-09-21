// El expediente: trece papeles, uno por país, que se encuentran al limpiarlo.
//
// La campaña cuenta lo que ve la compañía; los papeles cuentan lo que no ve:
// que alguien les abrió la puerta. Un programa de gobiernos (el Comité de
// Contacto) y una empresa (el Consorcio Vesta) pactaron con ellos a cambio de
// tecnología, y el Mando del búnker lo supo desde el primer día.
//
// No se guarda nada nuevo: un documento está encontrado si su país está limpio
// (`superados > pais.ultima`), así que quien ya había limpiado países los tiene
// todos al abrir el juego. Solo se apunta cuáles se han leído, para marcar los
// nuevos.
//
// Formato del texto: párrafos en un array; `[[así]]` sale tachado en negro.

import { PAISES } from './campana.js'

export const DOCUMENTOS = [
  {
    tipo: 'Memorando interno', de: 'Consorcio Vesta · Logística', para: 'Dirección del Programa CUNA', fecha: '14/03/2019',
    parrafos: [
      'Asunto: recepción de muestras, zona 1 (Tarragona).',
      'Esta semana han salido seis camiones del polígono. Carga declarada: material sanitario. Carga real: [[cuarenta y dos]] donantes, todos de la lista B.',
      'Recordamos al personal que la palabra correcta es «donante». No se usarán otras, ni por escrito ni en la radio.',
      'El Comité confirma que ninguna desaparición de la zona pasará del juzgado de guardia.'
    ]
  },
  {
    tipo: 'Transcripción', de: 'Comité de Contacto · sesión 31', para: 'Archivo', fecha: '02/11/2023',
    parrafos: [
      '[[DELEGADO 1]]: ¿Y si nos piden que lo detengamos?',
      '[[DELEGADO 4]]: No lo van a pedir. Mientras el búnker de París emita la frase, saben que el acuerdo sigue en pie.',
      '[[DELEGADO 1]]: ¿Qué frase?',
      '[[DELEGADO 4]]: «Seguimos aquí». Cada seis horas. Si un día dice otra cosa, se acabó el trato.',
      '(Risas en la sala.)'
    ]
  },
  {
    tipo: 'Certificado de obra', de: 'Consorcio Vesta · Ingeniería', para: 'Comité de Contacto', fecha: '20/06/2021',
    parrafos: [
      'Galería de tránsito n.º 4 (Apeninos). Longitud: [[312]] km. Estado: terminada.',
      'Une las zonas 2 (Francia) y 3 (Italia) con la salida al mar. Los convoyes pueden cruzar sin salir a la superficie ni aparecer en ningún satélite.',
      'Presupuesto: [[██ ███ ███]] €, cargado a la partida de «infraestructura hídrica».',
      'El pago del socio llegó en la forma pactada: planos del reactor de fusión, lote 6.'
    ]
  },
  {
    tipo: 'Manifiesto de carga', de: 'Capitanía del Pireo', para: 'Puerto de Alejandría', fecha: '09/01/2024',
    parrafos: [
      'Buque: [[AGIA MARINA]]. Carga: 1.400 unidades en sueño inducido. Temperatura de bodega: 4 °C.',
      'Entregado por: Comité de Contacto. Recibido por: [[—]]',
      'Contraprestación: tecnología médica, lote 7 (regeneración de tejido).',
      'Nota a mano en el margen: «Este es el último barco. Después de este, que vengan ellos a por lo suyo».'
    ]
  },
  {
    tipo: 'Acta del acuerdo', de: 'Sala de Gizeh · traducción parcial', para: 'Siete firmantes', fecha: 'Sin fecha',
    parrafos: [
      'Traducido del muro de la sala. Faltan trozos que nadie ha sabido leer.',
      'ELLOS RECIBEN: cada año, un número de personas que nadie reclame. Sin rastro. Sin preguntas.',
      'NOSOTROS RECIBIMOS: energía sin límite, medicina que no existe y el silencio de lo que ya ha pasado.',
      'Firman siete gobiernos. Los nombres están raspados de la piedra. Las siete firmas no.'
    ]
  },
  {
    tipo: 'Nota manuscrita', de: 'Funcionario del censo de Lagos', para: 'Nadie', fecha: 'Encontrada en un cajón', mano: true,
    parrafos: [
      'Yo firmé las listas de Lagos. Me dijeron que eran presos, que iban a otra cárcel.',
      'No eran presos. Eran los barrios que no salen en los mapas: la gente que nadie va a buscar.',
      'Elegían por eso. Por quién no sería echado de menos.',
      'Si alguien encuentra esto, que sepa que yo lo sabía. Que lo sabíamos todos.'
    ]
  },
  {
    tipo: 'Informe técnico', de: 'Consorcio Vesta · Laboratorio 2', para: 'Dirección del Programa CUNA', fecha: '30/08/2024',
    parrafos: [
      'Reescritura: tasa de éxito del 97 %. El 3 % restante no sobrevive al proceso.',
      'Los reescritos no obedecen a los visitantes. Obedecen a una frecuencia de mando.',
      'La frecuencia la diseñó este laboratorio y es propiedad del Consorcio.',
      'Conclusión: el ejército que están fabricando es nuestro. Solo hay que esperar a que terminen de fabricarlo.'
    ]
  },
  {
    tipo: 'Correo interno', de: '[[dirección@vesta]]', para: '[[comité@contacto]]', fecha: '17/02/2025',
    parrafos: [
      'Chongqing ya produce más de lo que ellos necesitan. El excedente sale cada semana.',
      'Los compradores no son ellos. Son tres ejércitos de los que firmaron en Gizeh. Soldados que no comen, no duermen y no desertan.',
      'Los visitantes creen que nos estamos llevando las sobras. Que lo sigan creyendo.',
      'P. D.: la compañía de Madrid ha empezado a limpiar campamentos. Que nos manden las coordenadas de todos.'
    ]
  },
  {
    tipo: 'Telegrama cifrado', de: 'Comité de Contacto', para: 'Estación de Moscú', fecha: '03/12/2025',
    parrafos: [
      'LA RESISTENCIA AVANZA DEMASIADO RÁPIDO STOP',
      'CORTAD LA FRECUENCIA DE MANDO EN LAS ZONAS PERDIDAS STOP LOS HUÉSPEDES ACTUARÁN POR SU CUENTA STOP',
      'SI NO PODEMOS CONTROLARLOS QUE AL MENOS NO LOS CONTROLE NADIE STOP',
      'COMPAÑÍA CUERVO SIGUE SIENDO ÚTIL MIENTRAS NO HAGA PREGUNTAS STOP'
    ]
  },
  {
    tipo: 'Informe de campo', de: 'Búnker del Ártico (Alaska)', para: 'Todos los búnkeres', fecha: 'Último envío',
    parrafos: [
      'Hemos descifrado la señal de Moscú. No era de ellos: era nuestra.',
      'El Mando del búnker de Madrid conoce el acuerdo desde el primer día. Su misión nunca fue liberar el país: es recuperar los campamentos intactos y entregarlos al Consorcio.',
      'Hemos pedido explicaciones. Nos han contestado que la extracción está en camino.',
      'Si nadie vuelve a leer este canal, ya sabéis por qué.'
    ]
  },
  {
    tipo: 'Orden reservada', de: 'MANDO DEL BÚNKER', para: 'Enlace del Consorcio', fecha: '11/04/2026',
    parrafos: [
      'No se destruirá ninguna sala de reescritura. Se informará de su posición antes de cada asalto.',
      'La Compañía Cuervo no debe conocer esta orden.',
      'Las bajas de la compañía se consideran asumibles. Las del material, no.',
      'Firma y sello del Mando.'
    ]
  },
  {
    tipo: 'Transmisión interceptada', de: 'La MADRE de México', para: 'Comité de Contacto', fecha: 'Traducción automática',
    parrafos: [
      'Os dimos el fuego, la medicina y el silencio. Vosotros nos disteis a los vuestros, y no os tembló la mano.',
      'Después quisisteis quedaros también con lo que hacíamos con ellos.',
      'El acuerdo terminó el día en que vuestras armas empezaron a apuntarnos.',
      'Vamos a cobrar lo que falta. A todos. No solo a los que nadie echa de menos.'
    ]
  },
  {
    tipo: 'Diario del primer contacto', de: 'Jefa de la expedición Vesta al Amazonas', para: 'Uso personal', fecha: 'Hace nueve años', mano: true,
    parrafos: [
      'Bajaron aquí primero, donde nadie miraba, y nosotros fuimos los primeros en llegar.',
      'No venían a conquistar. Pedían algo que no tenían: cuerpos que aprender a reescribir. A cambio ofrecían todo lo demás.',
      'Les ofrecimos a los que nadie iba a echar de menos. Aceptaron. Yo firmé la primera lista.',
      'Que Dios nos perdone, porque ellos no lo van a hacer.',
      'Sello en la última página: EXPEDIENTE ENTREGADO A LA PRENSA · COMPAÑÍA CUERVO.'
    ]
  }
]

const CLAVE_LEIDOS = 'alienz-expediente-v1'
const leidos = () => { try { return new Set(JSON.parse(localStorage.getItem(CLAVE_LEIDOS) || '[]')) } catch { return new Set() } }
const marcarLeido = i => {
  const s = leidos()
  s.add(i)
  try { localStorage.setItem(CLAVE_LEIDOS, JSON.stringify([...s])) } catch {}
}

export const encontrado = (i, progreso) => progreso.superados > PAISES[i].ultima
export const cuantosEncontrados = progreso => PAISES.filter((_, i) => encontrado(i, progreso)).length
export const hayNuevos = progreso => PAISES.some((_, i) => encontrado(i, progreso) && !leidos().has(i))

const escapar = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// `[[texto]]` → barra negra del tamaño del texto: se intuye cuánto hay, no qué.
const tachar = t => escapar(t).replace(/\[\[(.+?)\]\]/g, '<span class="tachon">$1</span>')

export function htmlDocumento (i) {
  const d = DOCUMENTOS[i]
  const pais = PAISES[i]
  return `
    <article class="documento${d.mano ? ' documento-mano' : ''}">
      <span class="doc-sello">CONFIDENCIAL</span>
      <header class="doc-cabeza">
        <p class="doc-tipo">${escapar(d.tipo)}</p>
        <dl>
          <dt>De</dt><dd>${tachar(d.de)}</dd>
          <dt>Para</dt><dd>${tachar(d.para)}</dd>
          <dt>Fecha</dt><dd>${escapar(d.fecha)}</dd>
          <dt>Hallado en</dt><dd>${escapar(pais.nombre)}</dd>
        </dl>
      </header>
      ${d.parrafos.map(p => `<p>${tachar(p)}</p>`).join('')}
      <span class="doc-folio">EXP. ${String(i + 1).padStart(2, '0')}/13</span>
    </article>`
}

// Lo que sale en la victoria que limpia un país.
export function htmlHallazgo (i) {
  return `
    <button class="hallazgo" type="button" onclick="abrirDocumento(${i})">
      <span class="hallazgo-carpeta" aria-hidden="true"></span>
      <span><b>DOCUMENTO ENCONTRADO</b><small>${escapar(DOCUMENTOS[i].tipo)} · toca para leerlo</small></span>
    </button>`
}

export function montarExpediente ({ cargarProgreso, audio }) {
  const $ = id => document.getElementById(id)
  const capa = $('expediente-capa')
  const lector = $('documento-capa')
  let volverALista = false

  function pintarBoton () {
    const p = cargarProgreso()
    const b = $('mapa-expediente')
    if (!b) return
    $('expediente-n').textContent = `${cuantosEncontrados(p)}/13`
    b.classList.toggle('con-nuevo', hayNuevos(p))
  }

  function pintarLista () {
    const p = cargarProgreso()
    const ya = leidos()
    $('expediente-lista').innerHTML = PAISES.map((pais, i) => encontrado(i, p)
      ? `<li><button type="button" class="carpeta" data-doc="${i}">
          <span class="carpeta-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="carpeta-txt"><b>${escapar(DOCUMENTOS[i].tipo)}</b><small>${escapar(pais.nombre)}</small></span>
          ${ya.has(i) ? '' : '<i class="carpeta-nuevo">NUEVO</i>'}
        </button></li>`
      : `<li><div class="carpeta cerrada">
          <span class="carpeta-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="carpeta-txt"><b>Sin encontrar</b><small>Limpia ${escapar(pais.nombre)}</small></span>
        </div></li>`).join('')
  }

  function leer (i, desdeLista) {
    volverALista = desdeLista
    $('documento-hoja').innerHTML = htmlDocumento(i)
    $('documento-hoja').scrollTop = 0
    marcarLeido(i)
    lector.classList.remove('hidden')
    audio?.coin?.()
    pintarBoton()
  }

  // Desde la victoria (el botón se pinta en #overlay con onclick).
  window.abrirDocumento = i => leer(i, false)

  $('mapa-expediente')?.addEventListener('click', () => {
    audio?.unlock?.()
    pintarLista()
    capa.classList.remove('hidden')
  })
  $('expediente-lista')?.addEventListener('click', e => {
    const b = e.target.closest('[data-doc]')
    if (b) leer(Number(b.dataset.doc), true)
  })
  $('expediente-volver')?.addEventListener('click', () => capa.classList.add('hidden'))
  $('documento-volver')?.addEventListener('click', () => {
    lector.classList.add('hidden')
    if (volverALista) pintarLista()
  })
  pintarBoton()
  return { pintarBoton }
}
