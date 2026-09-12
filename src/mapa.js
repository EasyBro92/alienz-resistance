// El mapa del mundo del informe: dónde está cada campamento y por cuál vas.
//
// Dibujado a mano en SVG, como todo lo demás del proyecto: ni un archivo de
// imagen. Va en proyección plana —longitud a lo ancho, latitud a lo alto— para
// que la posición de un destino salga de su latitud y su longitud reales sin
// más cuentas, y añadir uno nuevo sea buscar dos números.
//
// Los contornos son deliberadamente bastos. No es un atlas: es el tablero de
// una campaña, y lo que tiene que hacer es que reconozcas el continente de un
// vistazo en una pantalla de móvil, con los chinchetas encima sin taparse. Un
// contorno fiel a esta escala sería una mancha de ruido.

// Coordenadas en el sistema del mapa: x = longitud + 180, y = 90 - latitud.
// El viewBox es 0 0 360 180, así que un grado es una unidad.
const TIERRAS = [
  // América del Norte
  `M12,24 24,19 50,20 85,17 100,27 116,30 125,38 114,45 105,54 99,65 83,64
   75,70 70,67 63,58 56,50 55,41 45,32 30,30 15,28 Z`,
  // Groenlandia
  'M135,30 125,20 135,7 160,10 160,20 150,25 Z',
  // América del Sur
  `M99,82 103,95 99,108 109,120 106,135 110,145 118,140 122,128 132,115
   142,103 145,96 130,90 120,82 108,78 Z`,
  // África
  `M163,75 163,69 170,59 180,54 191,53 205,58 215,67 223,78 231,78 221,92
   220,105 215,115 200,125 198,124 192,108 189,91 180,85 172,85 167,81 Z`,
  // Eurasia
  `M170,53 171,46 180,41 185,37 188,32 200,35 205,25 210,20 240,18 270,15
   300,17 340,20 350,24 340,30 320,40 310,48 302,60 288,69 280,77 272,68
   260,75 253,70 248,65 240,65 230,62 225,52 215,54 208,49 200,50 195,52
   192,45 183,47 Z`,
  // Australia
  'M294,112 302,108 310,102 322,101 325,108 333,117 330,128 320,128 310,122 295,124 Z',
  // Un par de islas que se echan de menos si no están
  'M347,110 352,104 356,110 352,122 Z',            // Nueva Zelanda
  'M288,88 296,86 300,92 292,95 Z'                 // Insulindia
]

// El trazo que une los destinos en orden. No es decorativo: es lo que convierte
// doce chinchetas sueltas en una RUTA, y de un vistazo se ve de dónde vienes y
// hacia dónde tira la campaña.
function ruta (destinos) {
  return destinos.map((d, i) =>
    `${i ? 'L' : 'M'}${(d.mapa.x * 360).toFixed(1)},${(d.mapa.y * 180).toFixed(1)}`
  ).join(' ')
}

// `estado(i)` devuelve 'hecho' | 'actual' | 'abierto' | 'cerrado'.
export function pintarMapa (destinos, estado, elegido) {
  const chinchetas = destinos.map((d, i) => {
    const e = estado(i)
    const x = (d.mapa.x * 360).toFixed(1)
    const y = (d.mapa.y * 180).toFixed(1)
    // El punto se dibuja con dos círculos: el de fuera es el aro de estado y el
    // de dentro el relleno. Con uno solo no se distingue un destino hecho de
    // uno cerrado sin mirar el color de cerca, que en un móvil no se mira.
    // Sirve igual para misiones y para países: el país se llama `nombre` y la
    // misión `name`. El nombre va escrito junto a la chincheta, desplazado según
    // `etq` donde hace falta: en Europa cuatro países caen a un palmo y los
    // nombres centrados encima se pisaban unos a otros.
    const nombre = d.nombre ?? d.name
    const [dx, dy, ancla] = d.etq ?? [0, -6, 'middle']
    return `
      <g class="pin pin-${e}${i === elegido ? ' pin-elegido' : ''}" data-i="${i}"
         transform="translate(${x} ${y})" role="button" tabindex="0"
         aria-label="${nombre}${d.pais ? ', ' + d.pais : ''}">
        ${i === elegido ? '<circle class="pin-halo" r="7"/>' : ''}
        <circle class="pin-toque" r="9"/>
        <circle class="pin-aro" r="3.6"/>
        <circle class="pin-centro" r="1.7"/>
        <text class="pin-nombre" x="${dx}" y="${dy}" text-anchor="${ancla}">${nombre}</text>
      </g>`
  }).join('')

  return `
    <!-- El viewBox recorta por arriba y por abajo: los primeros doce grados y los
         treinta ultimos son casquete polar vacio. Recortarlos sube el tamano de
         todo un cuarto sin perder un solo destino, y en un movil ese cuarto es
         la diferencia entre acertarle a una chincheta y no. -->
    <svg class="mapa" viewBox="0 12 360 138" role="img" aria-label="Mapa de la campaña">
      <rect class="mapa-mar" x="0" y="0" width="360" height="180"/>
      <g class="mapa-rejilla">
        ${[30, 60, 90, 120, 150].map(y => `<line x1="0" y1="${y}" x2="360" y2="${y}"/>`).join('')}
        ${[60, 120, 180, 240, 300].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="180"/>`).join('')}
      </g>
      <g class="mapa-tierra">${TIERRAS.map(d => `<path d="${d}"/>`).join('')}</g>
      <path class="mapa-ruta" d="${ruta(destinos)}"/>
      ${chinchetas}
    </svg>`
}
