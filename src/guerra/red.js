// La Guerra civil en directo (28/09/2026): emparejamiento rápido, sala con
// código y chat.
//
// Isidro: «activa emparejamiento rápido y jugar con código, también activa el
// chat en las partidas contra personas reales». Aún no hay mapa del mundo: se
// juega en el mismo pueblo que contra la máquina.
//
// Quién simula: el ANFITRIÓN (el que abre la sala, que juega de azul) lleva la
// partida entera, como en el cooperativo, y manda cómo está el campo ocho
// veces por segundo. El INVITADO (rojo) no simula nada: pinta ese campo desde
// su lado y manda órdenes (soldado, defensa, mejora, al ataque). Así no hay dos
// partidas que se desincronicen, que con soldados que se disparan entre sí
// sería cuestión de segundos.
//
// Rutas, en la Realtime Database (reglas en `database.rules.json`):
//   guerras/{codigo}/jugadores/{uid}   nombre de la compañía, emblema, bando y lo desbloqueado
//   guerras/{codigo}/inicio            lo pone el anfitrión al haber dos
//   guerras/{codigo}/estado            el campo, del anfitrión
//   guerras/{codigo}/ordenes           lo que manda el invitado
//   guerras/{codigo}/chat              los mensajes
//   guerras/{codigo}/fin               quién ganó
//   colaGuerra                         la casilla del emparejamiento rápido
//
// En desarrollo, `?local` en dos pestañas juega sin cuentas por
// BroadcastChannel (el mismo `almacenLocal` del duelo).

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const codigoNuevo = () => Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')
const modoLocal = () => import.meta.env.DEV && new URLSearchParams(location.search).has('local')

export function crearRed () {
  let almacen = null
  let yo = null            // { uid, alias, icono, tengo }
  let sala = null          // { codigo, anfitrion, raiz, rival }
  let sueltas = []
  let buscando = null
  let renovar = null
  const oyentes = { rival: [], inicio: [], estado: [], orden: [], chat: [], fin: [] }
  const emitir = (tipo, ...a) => { for (const fn of oyentes[tipo]) try { fn(...a) } catch (e) { console.warn(e) } }

  async function conectar () {
    if (almacen) return almacen
    if (modoLocal()) {
      const { almacenLocal } = await import('../systems/almacen.js')
      almacen = almacenLocal('local-' + Math.random().toString(36).slice(2, 8))
      // Las otras pestañas le mandan su copia del árbol al abrirse: sin esperar,
      // la primera lectura salía vacía y «no había ninguna sala».
      await new Promise(r => setTimeout(r, 400))
      return almacen
    }
    const { cargarFirebase, asegurarSesion } = await import('../systems/cuenta.js')
    const { sesion } = await cargarFirebase()
    // La sesión de Google del juego se recupera sola, pero no al instante: sin
    // esperar, se abría una anónima encima de la cuenta.
    await sesion.authStateReady?.()
    const u = sesion.currentUser ?? await asegurarSesion()
    const { almacenNube } = await import('../systems/almacen.js')
    almacen = await almacenNube(u)
    return almacen
  }

  async function entrar (codigo, anfitrion) {
    salir()
    sala = { codigo, anfitrion, raiz: `guerras/${codigo}`, rival: null }
    const fila = `${sala.raiz}/jugadores/${almacen.uid}`
    const apuntarme = () => {
      almacen.alIrme(fila)
      return almacen.poner(fila, { alias: yo.alias, icono: yo.icono, bando: anfitrion ? 'azul' : 'rojo', tengo: yo.tengo })
    }
    await apuntarme()
    if (almacen.alConexion) sueltas.push(almacen.alConexion(ok => { if (ok && sala) apuntarme() }))
    sueltas.push(almacen.alCambiar(`${sala.raiz}/jugadores`, gente => {
      if (!sala) return
      const otros = Object.entries(gente ?? {}).filter(([uid]) => uid !== almacen.uid)
      const antes = sala.rival
      sala.rival = otros[0] ? { uid: otros[0][0], ...otros[0][1] } : null
      emitir('rival', sala.rival, antes)
      // El anfitrión arranca en cuanto hay dos; la casilla de la cola ya sobra.
      if (sala.rival && sala.anfitrion && !sala.arrancada) {
        sala.arrancada = true
        dejarDeBuscar()
        almacen.poner(`${sala.raiz}/inicio`, { en: Date.now() })
      }
    }))
    sueltas.push(almacen.alCambiar(`${sala.raiz}/inicio`, v => { if (v && sala && !sala.empezada) { sala.empezada = true; emitir('inicio', sala) } }))
    if (anfitrion) {
      sueltas.push(almacen.alNuevo(`${sala.raiz}/ordenes`, (o, clave) => {
        emitir('orden', o)
        almacen.quitar(`${sala.raiz}/ordenes/${clave}`)?.catch?.(() => {})
      }))
    } else {
      sueltas.push(almacen.alCambiar(`${sala.raiz}/estado`, e => { if (e) emitir('estado', e) }))
    }
    sueltas.push(almacen.alNuevo(`${sala.raiz}/chat`, m => emitir('chat', m), 30))
    sueltas.push(almacen.alCambiar(`${sala.raiz}/fin`, f => { if (f) emitir('fin', f) }))
  }

  function dejarDeBuscar () {
    clearInterval(renovar)
    renovar = null
    if (buscando && almacen) {
      const mia = buscando
      almacen.transaccion('colaGuerra', a => (a?.codigo === mia ? null : a)).catch(() => {})
    }
    buscando = null
  }

  function salir () {
    dejarDeBuscar()
    for (const q of sueltas) try { q?.() } catch {}
    sueltas = []
    if (sala && almacen) almacen.quitar(`${sala.raiz}/jugadores/${almacen.uid}`)?.catch?.(() => {})
    sala = null
  }

  return {
    get sala () { return sala },
    get uid () { return almacen?.uid },
    en (tipo, fn) { oyentes[tipo].push(fn) },
    conectar,
    ponerYo (datos) { yo = datos },

    // Sala con código: el que la abre juega de azul y la simula.
    async crearSala () {
      await conectar()
      const codigo = codigoNuevo()
      await entrar(codigo, true)
      return codigo
    },
    async unirse (codigo) {
      await conectar()
      const gente = await almacen.leer(`guerras/${codigo}/jugadores`)
      const n = Object.keys(gente ?? {}).length
      if (!n) return 'No hay ninguna sala abierta con ese código.'
      if (n >= 2 && !gente[almacen.uid]) return 'Esa sala ya está llena.'
      await entrar(codigo, false)
      return null
    },

    // Emparejamiento rápido: una casilla. Si hay alguien esperando desde hace
    // menos de un minuto se entra en su sala; si no, se deja la tuya.
    async rapida () {
      await conectar()
      const mia = codigoNuevo()
      let cogida = null
      await almacen.transaccion('colaGuerra', actual => {
        cogida = null
        if (actual && actual.uid !== almacen.uid && Date.now() - (actual.en ?? 0) < 60000) {
          cogida = actual
          return null
        }
        return { codigo: mia, uid: almacen.uid, en: Date.now() }
      })
      if (cogida) { await entrar(cogida.codigo, false); return 'dentro' }
      await entrar(mia, true)
      buscando = mia
      // La casilla caduca al minuto, por si alguien cierra buscando: mientras
      // se sigue buscando se renueva.
      renovar = setInterval(() => {
        if (buscando !== mia) return clearInterval(renovar)
        almacen.transaccion('colaGuerra', a => (a?.codigo === mia ? { ...a, en: Date.now() } : a)).catch(() => {})
      }, 25000)
      return 'esperando'
    },
    cancelar () { dejarDeBuscar(); salir() },
    salir,

    // En partida.
    mandarEstado (e) { if (sala) almacen.poner(`${sala.raiz}/estado`, e)?.catch?.(() => {}) },
    mandarOrden (o) { if (sala) almacen.añadir(`${sala.raiz}/ordenes`, o) },
    mandarFin (f) { if (sala) return almacen.poner(`${sala.raiz}/fin`, f)?.catch?.(() => {}) },
    hablar (t, alias) {
      if (sala) almacen.añadir(`${sala.raiz}/chat`, { de: almacen.uid, alias, t, en: almacen.marcaDeTiempo() })
    },
    async denunciar (m) {
      await almacen.añadir('denuncias', {
        de: m.de, alias: m.alias ?? '', texto: String(m.t).slice(0, 60),
        por: almacen.uid, sala: sala?.codigo ?? '', en: almacen.marcaDeTiempo()
      })
    },
    async bloqueado () {
      return !!(await almacen.leer(`bloqueados/${almacen.uid}`).catch(() => null))
    }
  }
}
