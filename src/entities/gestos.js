// Cómo ataca, cómo anda y cómo cae cada forma de alien.
//
// Isidro, 10/10: «mejora las animaciones y los ataques de los alienz», y al
// preguntarle marcó las cuatro cosas: un ataque propio por tipo, golpes que se
// notan, muertes distintas y andar con más vida. Hasta aquí los nueve hacían lo
// mismo: al llegar a un soldado, zarpazos alternos al compás del paso (no del
// mordisco: el brazo bajaba cuando tocaba y el daño caía cuando tocaba), y al
// morir, todos de espaldas.
//
// Aquí no hay huesos ni escena: solo las COREOGRAFÍAS. Las aplica `alienAnimado`
// (assets.js) sobre el esqueleto de Meshy de cada figura, encima de su ciclo de
// andar, y los cadáveres los mueve `updateCorpses` (main.js).
//
// Un ataque se escribe sobre su FASE `f`, que da el juego: 0 justo después de
// pegar y 1 en el instante en que pega (`ataqueFase` = 1 - attackCd × attackRate).
// Así el golpe de la animación y el daño caen en el mismo fotograma.
//
// Lo que recibe cada ataque (`p`):
//   gira(hueso, eje, ángulo)   eje 'x' = el lateral de la figura (positivo lleva
//                              hacia delante lo que cuelga —un brazo— y hacia
//                              atrás lo que se levanta —el tronco: negativo lo
//                              echa adelante—); 'y' = el vertical (torcerse);
//                              'z' = el de la marcha (ladearse)
//   mueve(adelante, arriba)    la figura entera, en metros
//   tronco, pecho, cabeza, brazos[izq, der], antebrazos[izq, der], todo (la figura)
//
// Los BRAZOS llegan al ataque colgando rectos (lo deja así `alienAnimado`: cada
// modelo trae los suyos de una manera y girarlos desde ahí los retorcía). Así
// que `brazo(p, i, hombro, codo)` habla siempre de lo mismo: `hombro` es cuánto
// se levanta hacia delante (1,57 = horizontal, 3 = arriba del todo; negativo,
// hacia atrás) y `codo`, cuánto se dobla.

const suave = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }

// La curva de un golpe a lo largo de su ciclo: se recoge despacio (0 → 1) entre
// 0,25 y 0,8, descarga de golpe (1 → -0,4) hasta 1, que es cuando pega, y en el
// primer cuarto del ciclo siguiente vuelve a su sitio. Tomar impulso es lo que
// hace que el golpe se vea venir.
export function golpe (f) {
  if (f < 0.25) return -0.4 * (1 - suave(f / 0.25))
  if (f < 0.8) return suave((f - 0.25) / 0.55)
  const k = (f - 0.8) / 0.2
  return 1 - 1.4 * k * k
}
// Cuánto se echa encima con el cuerpo: nada casi todo el ciclo, de golpe al pegar
// y de vuelta enseguida.
export function empuje (f) {
  if (f > 0.82) return ((f - 0.82) / 0.18) ** 2
  return f < 0.22 ? 1 - suave(f / 0.22) : 0
}

const brazo = (p, i, hombro, codo, a) => {
  p.gira(p.brazos[i], 'x', hombro * a)
  p.gira(p.antebrazos[i], 'x', codo * a)
}

export const ATAQUES = {
  // Portador: zarpazos alternos, un brazo cada vez, torciendo el cuerpo con él.
  walker (p, f, lado, a) {
    const g = golpe(f)
    const s = lado ? 1 : 0
    brazo(p, s, g > 0 ? 0.5 + g * 2.0 : 0.5 + g * 1.6, 1.1 - Math.max(0, g) * 0.6 + Math.min(0, g) * 1.6, a)
    brazo(p, 1 - s, 0.7, 1.3, a)
    p.gira(p.tronco, 'x', -(0.16 + empuje(f) * 0.36) * a)
    p.gira(p.tronco, 'y', (s ? -1 : 1) * g * 0.4 * a)
    p.gira(p.cabeza, 'x', 0.25 * a)
  },
  // Corredor: se echa atrás y se lanza de cabeza, con los brazos barridos.
  runner (p, f, lado, a) {
    const g = Math.max(0, golpe(f))
    const e = empuje(f)
    p.mueve((e * 0.55 - g * 0.16) * a, e * 0.05 * a)
    p.gira(p.todo, 'x', (g * 0.3 - e * 0.5) * a)
    brazo(p, 0, -(0.3 + g * 0.6) + e * 1.6, 0.5, a)
    brazo(p, 1, -(0.3 + g * 0.6) + e * 1.6, 0.5, a)
    p.gira(p.cabeza, 'x', (0.2 - e * 0.5) * a)
  },
  // Encostrado: agacha, presenta el hombro del caparazón y embiste con él.
  armored (p, f, lado, a) {
    const g = Math.max(0, golpe(f))
    const e = empuje(f)
    const s = lado ? 1 : -1
    p.mueve((e * 0.4 - g * 0.1) * a, -g * 0.07 * a)
    p.gira(p.todo, 'y', s * (g * 0.55 + e * 0.2) * a)
    p.gira(p.todo, 'x', -(0.1 + e * 0.32) * a)
    brazo(p, 0, 0.5, 1.7, a)
    brazo(p, 1, 0.5, 1.7, a)
    p.gira(p.cabeza, 'x', -0.2 * a)
  },
  // Sembrador: hincha el pecho echándose atrás y escupe con un latigazo del cuello.
  spitter (p, f, lado, a) {
    const g = Math.max(0, golpe(f))
    const e = empuje(f)
    p.gira(p.tronco, 'x', (g * 0.38 - e * 0.42) * a)
    p.gira(p.pecho, 'x', g * 0.15 * a)
    p.gira(p.cabeza, 'x', (g * 0.5 - e * 0.75) * a)
    brazo(p, 0, -g * 0.5 + 0.2, 0.5 + e * 0.4, a)
    brazo(p, 1, -g * 0.5 + 0.2, 0.5 + e * 0.4, a)
  },
  // Coloso: los dos puños arriba, despacio, y abajo a la vez con todo el peso.
  tank (p, f, lado, a) {
    const g = golpe(f)
    const e = empuje(f)
    for (const s of [0, 1]) brazo(p, s, g > 0 ? 0.4 + g * 2.4 : 0.4 + g * 0.6, 0.5 - Math.max(0, g) * 0.3 + e * 0.3, a)
    p.gira(p.tronco, 'x', (Math.max(0, g) * 0.22 - e * 0.5) * a)
    p.gira(p.cabeza, 'x', (0.2 + e * 0.2) * a)
    p.mueve(e * 0.12 * a, -e * 0.1 * a)
  },
  // Saltador: dos zarpazos cortos por mordisco, uno con cada garra, dando un botecito.
  leaper (p, f, lado, a) {
    const f2 = (f * 2) % 1
    const g = golpe(f2)
    const s = f < 0.5 ? 0 : 1
    brazo(p, s, g > 0 ? 0.6 + g * 1.7 : 0.6 + g * 1.4, 1.2 - Math.max(0, g) * 0.8, a)
    brazo(p, 1 - s, 0.9, 1.3, a)
    p.gira(p.tronco, 'x', -(0.3 + empuje(f2) * 0.2) * a)
    p.gira(p.tronco, 'y', (s ? -1 : 1) * g * 0.3 * a)
    p.mueve(empuje(f2) * 0.15 * a, Math.abs(Math.sin(f * Math.PI * 2)) * 0.14 * a)
  },
  // Revientaesporas: coge carrerilla con la barriga y da con ella, los brazos abiertos atrás.
  bloater (p, f, lado, a) {
    const g = Math.max(0, golpe(f))
    const e = empuje(f)
    p.mueve((e * 0.36 - g * 0.12) * a, e * 0.04 * a)
    p.gira(p.todo, 'x', (g * 0.2 + e * 0.16) * a)        // echa el cuerpo atrás: la barriga va por delante
    brazo(p, 0, -(0.3 + g * 0.5), 0.4, a)
    brazo(p, 1, -(0.3 + g * 0.5), 0.4, a)
    p.gira(p.cabeza, 'x', -0.3 * a)
  },
  // Injertadora: pincha con la jeringa (el brazo derecho): la recoge atrás con el
  // codo doblado y la clava de frente con el brazo estirado.
  healer (p, f, lado, a) {
    const g = golpe(f)
    const e = empuje(f)
    const recoge = Math.max(0, g)
    brazo(p, 1, g > 0 ? 0.9 - recoge * 1.3 : 0.9 + (-g / 0.4) * 0.65, 0.5 + recoge * 1.3 - e * 0.4, a)
    brazo(p, 0, 0.5, 1.1, a)
    p.gira(p.tronco, 'y', (recoge * 0.4 - e * 0.35) * a)
    p.gira(p.tronco, 'x', -(0.12 + e * 0.25) * a)
    p.mueve(e * 0.18 * a, 0)
  },
  // Escarbador: apoya el taladro (brazo derecho) y empuja con el cuerpo, temblando.
  burrower (p, f, lado, a, t) {
    const e = empuje(f)
    const tiembla = Math.sin(t * 46) * 0.035
    brazo(p, 1, 1.4 + tiembla + e * 0.15, 0.25 - e * 0.15, a)
    brazo(p, 0, 0.6, 1.2, a)
    p.gira(p.tronco, 'x', -(0.32 + e * 0.16) * a)
    p.gira(p.tronco, 'y', -0.25 * a)
    p.mueve((0.06 + e * 0.14 + tiembla * 0.4) * a, 0)
  }
}

// El andar de cada forma, encima de su ciclo de Meshy. Cada individuo lo lleva a
// su manera (más o menos marcado, a su compás y algo torcido): con el mismo ciclo
// exacto en todos, una horda era un desfile.
//   inclina   cuánto va echado hacia delante
//   balanceo  cuánto se ladea a cada paso
//   bote      cuánto sube y baja de más
//   cojera    cuánto carga más un lado que el otro
//   cabeza    cuánto mueve la cabeza mirando a los lados
// (Los brazos, al andar, se quedan como los trae el ciclo: sumarles un giro sin
// saber cómo los lleva cada modelo los retorcía.)
export const PASOS = {
  walker: { inclina: 0.04, balanceo: 0.07, bote: 0.02, cojera: 0.7, cabeza: 0.12 },
  runner: { inclina: 0.2, balanceo: 0.03, bote: 0.03, cabeza: 0.04 },
  armored: { inclina: 0.12, balanceo: 0.035, bote: 0.01, cabeza: 0.03 },
  spitter: { inclina: 0.02, balanceo: 0.05, bote: 0.015, cabeza: 0.28 },
  tank: { inclina: 0.06, balanceo: 0.085, bote: 0.035, cabeza: 0.06 },
  leaper: { inclina: 0.16, balanceo: 0.04, bote: 0.07, cabeza: 0.1 },
  bloater: { inclina: -0.05, balanceo: 0.13, bote: 0.02, cabeza: 0.05 },
  healer: { inclina: 0.03, balanceo: 0.03, bote: 0.008, cabeza: 0.16 },
  burrower: { inclina: 0.24, balanceo: 0.05, bote: 0.02, cabeza: 0.07 }
}

// Cómo cae cada uno. `c` es el cadáver ({ mesh, t, lado, y0, z0, s0 }; `lado` es -1 o 1, al azar) y `dt` el
// paso; cada función coloca la malla para el instante `c.t` (en segundos desde
// que murió). A los 1,2 s todos empiezan a hundirse y a los 2,1 se retiran: eso
// lo lleva quien llama. `rotation.x` positivo es hacia delante (hacia la base).
const cae = (t, dura) => { const k = Math.min(1, t / dura); return 1 - (1 - k) * (1 - k) }
export const MUERTES = {
  // De espaldas, hacia donde venía: el de siempre.
  walker (c) { c.mesh.rotation.x = -1.5 * cae(c.t, 0.55) },
  // Venía lanzado: da de bruces y resbala un trecho.
  runner (c) {
    const k = cae(c.t, 0.5)
    c.mesh.rotation.x = 1.5 * k
    c.mesh.position.z = c.z0 + 1.5 * cae(c.t, 0.8)
  },
  // Primero cede de rodillas y luego cae de frente, despacio, como una losa.
  armored (c) {
    const k1 = cae(c.t, 0.35)
    const k2 = cae(Math.max(0, c.t - 0.35), 0.6)
    c.mesh.position.y = c.y0 - 0.32 * k1 * (1 - k2)
    c.mesh.rotation.x = 0.22 * k1 + 1.3 * k2
  },
  // Se desploma de lado, con el saco por delante.
  spitter (c) { c.mesh.rotation.z = c.lado * 1.5 * cae(c.t, 0.6) },
  // Se tambalea medio segundo, y cuando cae tiembla el suelo (lo pone main.js en `golpea`).
  tank (c) {
    const antes = Math.min(1, c.t / 0.5)
    const k = cae(Math.max(0, c.t - 0.5), 0.55)
    c.mesh.rotation.z = Math.sin(c.t * 13) * 0.1 * (1 - antes)
    c.mesh.rotation.x = 0.12 * antes + 1.38 * k
    return c.t >= 1.0 && !c.golpeado ? (c.golpeado = true) : false
  },
  // Sale despedido hacia atrás dando una vuelta en el aire.
  leaper (c) {
    const k = Math.min(1, c.t / 0.6)
    c.mesh.rotation.x = -(Math.PI * 2 + 1.5) * (1 - (1 - k) * (1 - k))
    c.mesh.position.y = c.y0 + Math.sin(k * Math.PI) * 1.3
    c.mesh.position.z = c.z0 - 1.6 * k
  },
  // Se hincha un instante y revienta: no queda cuerpo.
  bloater (c) {
    const k = Math.min(1, c.t / 0.14)
    c.mesh.scale.setScalar(c.s0 * (1 + 0.5 * k))
    if (c.t > 0.14) c.mesh.visible = false
  },
  // Gira sobre sí misma, cada vez más despacio, mientras se le doblan las piernas.
  healer (c) {
    const k = cae(c.t, 0.8)
    c.mesh.rotation.y = Math.PI + c.lado * 7 * k
    c.mesh.rotation.x = 1.4 * cae(Math.max(0, c.t - 0.35), 0.5)
    c.mesh.position.y = c.y0 - 0.2 * k
  },
  // Se lo traga la tierra por donde vino.
  burrower (c) {
    const k = cae(c.t, 0.9)
    c.mesh.position.y = c.y0 - 2.1 * k
    c.mesh.rotation.y = Math.PI + c.lado * 2.2 * k
  },
  // LA MADRE: se viene abajo despacio, de frente, con sacudidas.
  boss (c) {
    const k = cae(c.t, 1.1)
    c.mesh.rotation.x = 0.9 * k
    c.mesh.rotation.z = Math.sin(c.t * 9) * 0.07 * (1 - k)
    c.mesh.position.y = c.y0 - 0.5 * k
    return c.t >= 0.9 && !c.golpeado ? (c.golpeado = true) : false
  }
}
