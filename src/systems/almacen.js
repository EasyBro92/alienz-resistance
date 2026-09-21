// Un almacén con forma de Realtime Database, para el duelo.
//
// El duelo habla con rutas (`duelos/ABCD/chat`) y cinco verbos: poner, añadir,
// quitar, escuchar el valor y escuchar lo nuevo. Hay dos almacenes con esa misma
// cara:
//
//   · `almacenNube`  — la Realtime Database de verdad.
//   · `almacenLocal` — un árbol en memoria que las pestañas de este navegador
//     se copian por BroadcastChannel. Solo existe para probar el duelo en este
//     ordenador, con dos pestañas y sin cuentas.

const trozos = ruta => ruta.split('/').filter(Boolean)

// --- nube -----------------------------------------------------------------------
export async function almacenNube (usuario) {
  const [{ getApps }, rtdb] = await Promise.all([import('firebase/app'), import('firebase/database')])
  const db = rtdb.getDatabase(getApps()[0])
  const ref = ruta => rtdb.ref(db, ruta)
  return {
    uid: usuario.uid,
    poner: (ruta, valor) => rtdb.set(ref(ruta), valor),
    añadir: (ruta, valor) => rtdb.push(ref(ruta), valor).key,
    quitar: ruta => rtdb.remove(ref(ruta)),
    leer: async ruta => (await rtdb.get(ref(ruta))).val(),
    alCambiar: (ruta, fn) => rtdb.onValue(ref(ruta), s => fn(s.val())),
    // Solo lo que llega a partir de ahora: el historial de una sala no le
    // interesa a quien acaba de entrar.
    alNuevo: (ruta, fn, ultimos = 0) => {
      const q = ultimos ? rtdb.query(ref(ruta), rtdb.limitToLast(ultimos)) : ref(ruta)
      return rtdb.onChildAdded(q, s => fn(s.val(), s.key))
    },
    alIrme: ruta => rtdb.onDisconnect(ref(ruta)).remove(),
    transaccion: async (ruta, fn) => (await rtdb.runTransaction(ref(ruta), fn)).snapshot.val(),
    // Cada vez que el móvil recupera (o pierde) la conexión con el servidor.
    alConexion: fn => rtdb.onValue(ref('.info/connected'), s => fn(!!s.val())),
    marcaDeTiempo: () => rtdb.serverTimestamp(),
    cerrar () {}
  }
}

// --- local ----------------------------------------------------------------------
export function almacenLocal (uid) {
  const canal = new BroadcastChannel('alienz-duelo-local')
  let arbol = {}
  const oyentes = []          // { ruta, fn, tipo: 'valor' | 'nuevo' }
  const alSalir = []

  const obtener = ruta => trozos(ruta).reduce((n, k) => (n == null ? n : n[k]), arbol)
  function aplicar (op) {
    const t = trozos(op.ruta)
    if (op.tipo === 'arbol') { arbol = { ...op.valor, ...arbol }; return avisarTodo() }
    let n = arbol
    for (const k of t.slice(0, -1)) n = n[k] ??= {}
    const ultima = t[t.length - 1]
    if (op.valor == null) delete n[ultima]
    else n[ultima] = op.valor
    for (const o of oyentes) {
      const dentro = op.ruta.startsWith(o.ruta + '/') || op.ruta === o.ruta || o.ruta.startsWith(op.ruta + '/')
      if (!dentro) continue
      if (o.tipo === 'valor') o.fn(obtener(o.ruta) ?? null)
      else if (op.nuevo && t.slice(0, -1).join('/') === trozos(o.ruta).join('/')) o.fn(op.valor, ultima)
    }
  }
  const avisarTodo = () => { for (const o of oyentes) if (o.tipo === 'valor') o.fn(obtener(o.ruta) ?? null) }
  const mandar = op => { aplicar(op); canal.postMessage(op) }

  canal.onmessage = e => {
    const op = e.data
    if (op.tipo === 'pedir') return canal.postMessage({ tipo: 'arbol', ruta: '', valor: arbol })
    aplicar(op)
  }
  canal.postMessage({ tipo: 'pedir' })
  addEventListener('pagehide', () => { for (const r of alSalir) canal.postMessage({ ruta: r, valor: null }) })

  return {
    uid,
    poner: (ruta, valor) => mandar({ ruta, valor }),
    añadir: (ruta, valor) => {
      const clave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      mandar({ ruta: `${ruta}/${clave}`, valor, nuevo: true })
      return clave
    },
    quitar: ruta => mandar({ ruta, valor: null }),
    leer: async ruta => obtener(ruta) ?? null,
    alCambiar (ruta, fn) {
      const o = { ruta, fn, tipo: 'valor' }
      oyentes.push(o)
      fn(obtener(ruta) ?? null)
      return () => oyentes.splice(oyentes.indexOf(o), 1)
    },
    alNuevo (ruta, fn) {
      const o = { ruta, fn, tipo: 'nuevo' }
      oyentes.push(o)
      return () => oyentes.splice(oyentes.indexOf(o), 1)
    },
    alIrme: ruta => alSalir.push(ruta),
    async transaccion (ruta, fn) {
      const v = fn(obtener(ruta) ?? null)
      if (v !== undefined) mandar({ ruta, valor: v })
      return obtener(ruta) ?? null
    },
    marcaDeTiempo: () => Date.now(),
    cerrar () { canal.close() }
  }
}
