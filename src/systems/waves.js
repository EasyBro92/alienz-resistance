import { ZOMBIES, FIELD } from '../config.js'
import { createZombie } from '../entities/zombie.js'
import { LLEGADA } from '../entities/dropship.js'

// Director de oleadas: prepara la cola de apariciones de cada oleada y las va
// soltando. Entre oleada y oleada hay calma para gastar monedas.
export function createWaveDirector (level, onSpawn, onWaveStart, onCleared, onLlegada, onUltimo) {
  let waveIndex = -1
  // La primera oleada arrancaba en el mismo instante en que se pulsaba jugar.
  // Ahora se le deja exactamente lo que tarda la nave en posarse y abrir: ni un
  // segundo más, para no cambiar el ritmo de salida.
  let timer = level.waves[0].gap - LLEGADA
  let queue = []
  let running = false
  let finished = false
  let pending = 0   // zombis pedidos cuyo modelo aún se está creando
  // La nave tarda en bajar y abrir la compuerta. Se avisa con esa antelación
  // DENTRO de la calma que ya había, no añadiéndole tiempo: si la oleada se
  // retrasara hasta que la nave aterriza, cada oleada regalaría tres segundos
  // largos de respiro y el ritmo del nivel cambiaría entero.
  let avisado = false
  let vaciada = false

  // Reparto de carriles como una baraja, no como un dado. Con carril al azar
  // puro salían partidas en las que tres seguidos caían en el mismo sitio y
  // otras repartidas: la misma defensa ganaba o perdía por suerte. Barajando
  // los carriles y repartiendo hasta agotarlos, el orden sigue siendo sorpresa
  // pero deja de haber rachas.
  let deck = []
  let deckKey = ''
  function drawLane (pool) {
    const key = pool.join(',')
    if (key !== deckKey || deck.length === 0) {
      deckKey = key
      deck = [...pool]
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
    }
    return deck.pop()
  }

  function startWave () {
    waveIndex++
    const wave = level.waves[waveIndex]
    running = true
    queue = []
    for (const s of wave.spawns) {
      for (let i = 0; i < s.count; i++) {
        queue.push({ type: s.type, at: i * s.every + Math.random() * 0.35, lanes: s.lanes })
      }
    }
    queue.sort((a, b) => a.at - b.at)
    timer = 0
    avisado = false
    vaciada = false
    onWaveStart(waveIndex + 1, level.waves.length, !!wave.boss)
  }

  return {
    get wave () { return waveIndex + 1 },
    get total () { return level.waves.length },
    get finished () { return finished },
    get spawning () { return running && queue.length > 0 },

    update (dt, aliveCount) {
      if (finished) return
      timer += dt

      if (!running) {
        const calma = level.waves[waveIndex + 1]?.gap ?? Infinity
        if (!avisado && timer >= calma - LLEGADA) {
          avisado = true
          const proxima = level.waves[waveIndex + 1]
          onLlegada?.(waveIndex + 2, !!proxima?.boss)
        }
        if (timer >= calma) startWave()
        return
      }

      while (queue.length && queue[0].at <= timer) {
        const { type, lanes } = queue.shift()
        const spec = ZOMBIES[type]
        // `lanes` deja abrir el nivel por el centro: las primeras oleadas no
        // castigan por no poder cubrir los cinco carriles todavía.
        const pool = lanes ?? Array.from({ length: FIELD.lanes }, (_, i) => i)
        const lane = spec.boss ? Math.floor(FIELD.lanes / 2) : drawLane(pool)
        pending++
        // Cada oleada endurece un poco a la horda: el mismo zombi aguanta más.
        // Cuánto, lo decide el nivel: el primero enseña y apenas sube, el último
        // tiene que apretar de verdad en las oleadas finales.
        const scale = 1 + (level.dureza ?? 0.09) * waveIndex
        createZombie(type, spec, lane, scale).then(z => { pending--; onSpawn(z) })
      }

      // En cuanto ha salido el último, la nave ya no pinta nada ahí y se va:
      // esperar a que muera el último huésped la dejaba aparcada al fondo
      // durante toda la limpieza de la oleada.
      if (!vaciada && !queue.length) { vaciada = true; onUltimo?.() }

      // La oleada termina cuando no queda nadie por salir, nadie en camino y
      // nadie vivo. Sin contar los que están en camino, una oleada se daba por
      // superada en el mismo instante en que se lanzaba.
      if (!queue.length && pending === 0 && aliveCount === 0) {
        running = false
        timer = 0
        if (waveIndex >= level.waves.length - 1) {
          finished = true
          onCleared()
        }
      }
    }
  }
}
