// Cuenta de Google y progreso en la nube (Firebase).
//
// Sin cuenta se juega igual: todo se guarda en el móvil como siempre. Al entrar
// con Google, la ficha del jugador (jugadores/{uid} en Firestore) se fusiona
// con lo que haya en este móvil y desde ahí cada guardado se sube solo. Las
// reglas de Firestore (firestore.rules) solo dejan a cada uno tocar su ficha.
//
// Firebase pesa: se carga en diferido y solo si hay sesión abierta o se pulsa
// «Entrar», así que quien no la usa no descarga nada.

// La configuración web de Firebase es pública por diseño; la usa también el
// cooperativo para abrir la Realtime Database.
export const CONFIG = {
  apiKey: 'AIzaSyAwzbv3vb6Ju-ie3mgYPBp9C-V0QMw_ZKY',
  authDomain: 'alienz-resistance.firebaseapp.com',
  projectId: 'alienz-resistance',
  storageBucket: 'alienz-resistance.firebasestorage.app',
  messagingSenderId: '134292140642',
  appId: '1:134292140642:web:a204f937309a7c933a573b',
  // La base del cooperativo está en Bélgica: sin su dirección, el SDK la busca
  // en Estados Unidos y no la encuentra.
  databaseURL: 'https://alienz-resistance-default-rtdb.europe-west1.firebasedatabase.app'
}

const CLAVE_CARTERA = 'alienz-cartera-v1'
const CLAVE_PROGRESO = 'alienz-progreso-v2'
// Marca de que en este móvil hubo sesión: solo entonces se carga Firebase al arrancar.
const CLAVE_SESION = 'alienz-cuenta-v1'

let fb = null
// La usa también el multijugador (marcadores y retos): una sola carga de
// Firebase para todo, y solo cuando de verdad hace falta.
export function cargarFirebase () {
  fb ??= Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/firestore')
  ]).then(([app, auth, fs]) => {
    // Si el cooperativo abrió Firebase primero, se reutiliza: una segunda
    // app por defecto hace saltar un error.
    const a = app.getApps()[0] ?? app.initializeApp(CONFIG)
    return { app: a, auth, fs, sesion: auth.getAuth(a), db: fs.getFirestore(a) }
  })
  return fb
}

// Una sesión para jugar en red SIN cuenta: anónima, no guarda progreso y no
// cuenta como «haber entrado». La usa el duelo para quien juega sin Google.
export async function asegurarSesion () {
  const { auth, sesion } = await cargarFirebase()
  if (sesion.currentUser) return sesion.currentUser
  return (await auth.signInAnonymously(sesion)).user
}

const leer = clave => {
  try { return JSON.parse(localStorage.getItem(clave) || 'null') } catch { return null }
}
const escribir = (clave, v) => {
  try { localStorage.setItem(clave, JSON.stringify(v)) } catch { /* modo privado */ }
}
const entero = v => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0)

// Fusión de dos fichas. Lo que solo crece (misiones, estrellas, desbloqueos,
// mejoras) se queda con lo mejor de cada lado; lo que se gasta (billetes y
// monedas) va con el guardado más reciente, o se regalaría dinero al fusionar.
export function fusionar (a, b) {
  const ca = a?.cartera ?? {}
  const cb = b?.cartera ?? {}
  const reciente = entero(cb.actualizado) > entero(ca.actualizado) ? cb : ca
  const mejoras = {}
  for (const k of new Set([...Object.keys(ca.mejoras ?? {}), ...Object.keys(cb.mejoras ?? {})])) {
    const x = ca.mejoras?.[k] ?? {}
    const y = cb.mejoras?.[k] ?? {}
    mejoras[k] = { dano: Math.max(entero(x.dano), entero(y.dano)), cadencia: Math.max(entero(x.cadencia), entero(y.cadencia)) }
  }
  const pa = a?.progreso ?? {}
  const pb = b?.progreso ?? {}
  const rangos = { ...(pa.rangos ?? {}) }
  for (const [i, v] of Object.entries(pb.rangos ?? {})) rangos[i] = Math.max(entero(rangos[i]), entero(v))
  return {
    cartera: {
      billetes: entero(reciente.billetes),
      monedas: entero(reciente.monedas),
      desbloqueadas: [...new Set([...(ca.desbloqueadas ?? []), ...(cb.desbloqueadas ?? [])])],
      mejoras,
      actualizado: Math.max(entero(ca.actualizado), entero(cb.actualizado))
    },
    progreso: { superados: Math.max(entero(pa.superados), entero(pb.superados)), rangos }
  }
}

const fichaLocal = () => ({ cartera: leer(CLAVE_CARTERA) ?? {}, progreso: leer(CLAVE_PROGRESO) ?? {} })

// Si en este móvil hubo sesión (antes de que Firebase confirme que sigue abierta).
export const haySesionGuardada = () => !!leer(CLAVE_SESION)

export function crearCuenta ({ alCambiar }) {
  let usuario = null
  let subida = 0
  let arrancado = false

  async function subir () {
    if (!usuario) return
    const { fs, db } = await cargarFirebase()
    await fs.setDoc(fs.doc(db, 'jugadores', usuario.uid), { ...fichaLocal(), guardado: fs.serverTimestamp() })
    apuntarEnLista().catch(e => console.warn('Sin lista:', e))
  }

  // La fila de este jugador en la lista de usuarios que ve el administrador
  // (Realtime Database, `usuarios/{uid}`; solo la leen los de `admins`). Un
  // resumen y no la ficha entera: para saber quién juega y cuánto, basta.
  async function apuntarEnLista () {
    if (!usuario) return
    const [{ app }, rtdb, { aliasActual }] = await Promise.all([
      cargarFirebase(), import('firebase/database'), import('./marcadores.js')
    ])
    const f = fichaLocal()
    let estrellas = 0
    for (const v of Object.values(f.progreso.rangos ?? {})) estrellas += entero(v)
    const alta = Date.parse(usuario.metadata?.creationTime ?? '')
    await rtdb.update(rtdb.ref(rtdb.getDatabase(app), `usuarios/${usuario.uid}`), {
      alias: aliasActual(usuario),
      correo: usuario.email ?? '',
      alta: Number.isFinite(alta) ? alta : rtdb.serverTimestamp(),
      ultima: rtdb.serverTimestamp(),
      tramos: entero(f.progreso.superados),
      estrellas,
      billetes: entero(f.cartera.billetes)
    })
  }

  async function sincronizar () {
    const { fs, db } = await cargarFirebase()
    const ref = fs.doc(db, 'jugadores', usuario.uid)
    const nube = (await fs.getDoc(ref)).data() ?? null
    const local = fichaLocal()
    const junta = fusionar(local, nube)
    const cambia = JSON.stringify(junta) !== JSON.stringify(fusionar(local, null))
    escribir(CLAVE_CARTERA, junta.cartera)
    escribir(CLAVE_PROGRESO, junta.progreso)
    await fs.setDoc(ref, { ...junta, guardado: fs.serverTimestamp() })
    apuntarEnLista().catch(e => console.warn('Sin lista:', e))
    // Si la nube traía algo nuevo, los menús ya pintados están desfasados.
    if (cambia) location.reload()
  }

  async function arrancar () {
    if (arrancado) return
    arrancado = true
    const { auth, sesion } = await cargarFirebase()
    // Vuelta de un inicio por redirección (móviles que bloquean la ventana).
    auth.getRedirectResult(sesion).catch(() => {})
    auth.onAuthStateChanged(sesion, async bruto => {
      // La sesión anónima del duelo no es una cuenta: ni sincroniza ni sale
      // como «conectado» en Ajustes.
      const u = bruto && !bruto.isAnonymous ? bruto : null
      usuario = u
      if (u) {
        escribir(CLAVE_SESION, true)
        try { await sincronizar() } catch (e) { console.warn('Sin sincronizar:', e) }
      }
      alCambiar(u)
    })
  }

  // Cada guardado del juego avisa; se sube agrupado para no escribir a cada moneda.
  addEventListener('alienz-guardado', () => {
    if (!usuario) return
    clearTimeout(subida)
    subida = setTimeout(() => subir().catch(e => console.warn('Sin subir:', e)), 2500)
  })

  if (leer(CLAVE_SESION)) arrancar()

  return {
    get usuario () { return usuario },
    async entrar () {
      const { auth, sesion } = await cargarFirebase()
      arrancar()
      const proveedor = new auth.GoogleAuthProvider()
      try {
        await auth.signInWithPopup(sesion, proveedor)
      } catch (e) {
        if (/popup-blocked|operation-not-supported/.test(e.code ?? '')) await auth.signInWithRedirect(sesion, proveedor)
        else throw e
      }
    },
    async salir () {
      const { auth, sesion } = await cargarFirebase()
      try { localStorage.removeItem(CLAVE_SESION) } catch {}
      await auth.signOut(sesion)
    }
  }
}
