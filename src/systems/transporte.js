// El cable del cooperativo.
//
// El juego en red no habla con Firebase: habla con un "transporte", que es un
// buzón con tres cosas —mandar estado, mandar órdenes y escuchar—. Así la
// lógica del cooperativo se puede probar entera en este ordenador, con dos
// pestañas y sin red, y el día que la Realtime Database esté encendida se
// cambia el transporte y no se toca nada más.
//
// Hay dos:
//   · `transporteLocal`  — dos pestañas del mismo navegador (BroadcastChannel).
//     Es el que se usa para probar; no sale del equipo.
//   · `transporteNube`   — Realtime Database de Firebase, que es lo que hace
//     falta para jugar con alguien de verdad.
//
// El reparto de papeles es siempre el mismo: el ANFITRIÓN simula la partida y
// manda instantáneas; el INVITADO solo pinta lo que le llega y manda lo que
// toca. Con los dos simulando, dos móviles distintos acaban viendo partidas
// distintas al primer decimal que no cuadre.

const CANAL = 'alienz-coop'

export function transporteLocal (codigo) {
  const canal = new BroadcastChannel(`${CANAL}-${codigo}`)
  const oyentes = new Map()
  const presentes = new Set()
  const avisar = (tipo, datos) => { for (const f of oyentes.get(tipo) ?? []) f(datos) }
  canal.onmessage = e => {
    const { tipo, datos } = e.data ?? {}
    if (tipo === 'yo') {
      // El que llega se presenta; los que ya estaban contestan, para que el
      // recién llegado sepa también quién había.
      const nuevo = !presentes.has(datos)
      presentes.add(datos)
      if (nuevo) for (const uid of presentes) canal.postMessage({ tipo: 'hola', datos: uid })
      avisar('jugadores', [...presentes])
      return
    }
    if (tipo === 'hola') { presentes.add(datos); avisar('jugadores', [...presentes]); return }
    avisar(tipo, datos)
  }
  return {
    nombre: 'local',
    mandar (tipo, datos) {
      if (tipo === 'yo') presentes.add(datos)
      canal.postMessage({ tipo, datos })
    },
    escuchar (tipo, fn) {
      if (!oyentes.has(tipo)) oyentes.set(tipo, [])
      oyentes.get(tipo).push(fn)
    },
    cerrar () { canal.close() }
  }
}

// El mismo buzón, pero en la Realtime Database. Cada sala es una rama de
// `/salas/{codigo}`: el estado se sobrescribe (solo importa el último) y las
// órdenes se encolan y el anfitrión las va vaciando.
export async function transporteNube (codigo, usuario) {
  const [{ initializeApp, getApps }, rtdb, { CONFIG }] = await Promise.all([
    import('firebase/app'), import('firebase/database'), import('./cuenta.js')
  ])
  const app = getApps()[0] ?? initializeApp(CONFIG)
  const db = rtdb.getDatabase(app)
  const raiz = rtdb.ref(db, `salas/${codigo}`)
  const sueltas = []

  // Si el móvil se apaga o se va la cobertura, la sala no puede quedarse con un
  // jugador fantasma dentro: el servidor borra su rama al perder la conexión.
  const mio = rtdb.ref(db, `salas/${codigo}/jugadores/${usuario.uid}`)
  rtdb.onDisconnect(mio).remove()

  return {
    nombre: 'nube',
    mandar (tipo, datos) {
      if (tipo === 'estado') return rtdb.set(rtdb.child(raiz, 'estado'), datos)
      if (tipo === 'orden') return rtdb.push(rtdb.child(raiz, 'ordenes'), datos)
      // Cada uno se apunta en SU fila: así, al perder la conexión, el servidor
      // borra solo la suya y el otro se entera de que se ha ido.
      if (tipo === 'yo') return rtdb.set(mio, { en: rtdb.serverTimestamp() })
      return rtdb.set(rtdb.child(raiz, tipo), datos)
    },
    escuchar (tipo, fn) {
      if (tipo === 'orden') {
        // Las órdenes se consumen: se atiende cada una y se borra, para que la
        // sala no crezca sin fin durante la partida.
        sueltas.push(rtdb.onChildAdded(rtdb.child(raiz, 'ordenes'), s => {
          fn(s.val())
          rtdb.remove(s.ref)
        }))
        return
      }
      if (tipo === 'jugadores') {
        sueltas.push(rtdb.onValue(rtdb.child(raiz, 'jugadores'), s => fn(Object.keys(s.val() ?? {}))))
        return
      }
      sueltas.push(rtdb.onValue(rtdb.child(raiz, tipo), s => {
        const v = s.val()
        if (v != null) fn(v)
      }))
    },
    cerrar () {
      for (const quitar of sueltas) quitar()
      rtdb.remove(mio).catch(() => {})
    }
  }
}
