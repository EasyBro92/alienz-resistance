// El relieve del terreno de alrededor.
//
// El problema que resuelve: los tramos se veían como una carretera de cinco
// carriles apoyada sobre un cristal, la misma en los 39, fuera césped, arena o
// nieve. Lo que delataba el truco no era la calzada sino todo lo demás: un
// plano perfectamente liso de 480 × 480 hasta la niebla.
//
// Por qué montículos y no deformar el plano entero: encima del asfalto hay
// líneas de carril, arcenes, grava y chevrones pintados como planos lisos de
// 260 de largo. Si la calzada ondula, todo eso la atraviesa. Con montículos
// sueltos se controla exactamente dónde sube el terreno, la calzada no se toca
// y lo que se apoya en el suelo se puede subir a su altura uno a uno.
//
// Cada montículo es una campana suave de soporte limitado: fuera de su radio
// vale cero exacto, así que sumarlos sale barato y el terreno vuelve a ser
// plano donde no hay ninguno.

// Un número al azar repetible: el mismo tramo tiene siempre el mismo terreno.
// Sin esto, el relieve cambiaba cada vez que se reiniciaba la misión y las
// piedras y los árboles bailaban de sitio.
function azarDe (semilla) {
  let s = 0
  for (let i = 0; i < String(semilla).length; i++) s = (s * 31 + String(semilla).charCodeAt(i)) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// La campana. `t` va de 0 en el centro a 1 en el borde; el cuadrado del
// paraboloide da una curva que entra y sale del suelo sin esquina.
function campana (t) {
  if (t >= 1) return 0
  const k = 1 - t * t
  return k * k
}

export function crearRelieve (semilla, { borde, desdeZ, hastaZ, ocupado = {} } = {}) {
  const rnd = azarDe(semilla)
  const bultos = []

  // Lo pegado a la calzada: taludes y cunetas de la cuneta hacia fuera. Son los
  // que de verdad se ven en el móvil, porque el borde de pantalla a media
  // distancia no llega mucho más allá de x ≈ 22.
  for (const lado of [-1, 1]) {
    // En el lado que ocupa un monumento no se mete nada: ese lado ya tiene su
    // explanada y su terreno, y un montículo por debajo lo levantaría en vano.
    if (ocupado[lado]) continue
    const cuantos = 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < cuantos; i++) {
      const radio = 7 + rnd() * 14
      // Un tercio son hondonadas. Solo lomas, y el terreno parece un campo de
      // topos; con hoyos parece terreno.
      const hondo = rnd() < 0.34
      bultos.push({
        x: lado * (borde + 2 + rnd() * 26),
        z: desdeZ + rnd() * (hastaZ - desdeZ),
        radio,
        alto: hondo ? -(0.3 + rnd() * 0.55) : 0.45 + rnd() * 1.7
      })
    }
  }

  // El fondo: lomas grandes y lentas más allá de donde acaba la calzada. Dan
  // horizonte, que es lo que convierte un plano en un sitio.
  for (let i = 0; i < 6; i++) {
    bultos.push({
      x: (rnd() < 0.5 ? -1 : 1) * (25 + rnd() * 150),
      z: -170 - rnd() * 150,
      radio: 55 + rnd() * 80,
      alto: 2.5 + rnd() * 9
    })
  }

  // El pasillo de juego se queda plano y a cero. La máscara sube de 0 a 1 en
  // seis unidades a partir del borde, así que el terreno arranca justo donde
  // acaba la grava en vez de dar un escalón.
  const mascara = x => {
    const a = (Math.abs(x) - borde) / 6
    if (a <= 0) return 0
    return a >= 1 ? 1 : a * a * (3 - 2 * a)
  }

  // Techo que crece con la distancia. Sin él, dos o tres montículos que se
  // solapan se suman y sale un muro: medido, salían taludes de 6 pegados al
  // carril —que tapan la partida— y paredones de 33 al fondo. Cerca casi nada,
  // y lomas de verdad solo donde ya no estorban a nadie.
  const techo = x => Math.min(26, 1.1 + Math.max(0, Math.abs(x) - borde) * 0.13)

  function alto (x, z) {
    const m = mascara(x)
    if (m === 0) return 0
    let y = 0
    for (const b of bultos) {
      const dx = x - b.x; const dz = z - b.z
      const d2 = dx * dx + dz * dz
      if (d2 >= b.radio * b.radio) continue
      y += b.alto * campana(Math.sqrt(d2) / b.radio)
    }
    return Math.max(-1.1, Math.min(techo(x), y)) * m
  }

  return { alto, bultos }
}
