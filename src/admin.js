// La lista de usuarios, solo para el administrador.
//
// Cada jugador con cuenta de Google deja su resumen en la Realtime Database
// (`usuarios/{uid}`, ver `apuntarEnLista` en cuenta.js) y solo los de `admins`
// pueden leerla: las reglas del servidor lo impiden a cualquier otro, aunque
// encontrara esta pantalla en el código. Los puntos del 1 contra 1 se cruzan con
// la clasificación de Firestore, que ya es pública para quien tiene sesión.

const $ = id => document.getElementById(id)

const fecha = ms => (ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

function hace (ms) {
  if (!ms) return '—'
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 2) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d < 30 ? `hace ${d} día${d === 1 ? '' : 's'}` : fecha(ms)
}

export function montarUsuarios ({ almacen, escapar, total }) {
  const capa = $('usuarios-capa')
  const lista = $('usuarios-lista')
  const buscar = $('usuarios-buscar')
  if (!capa || !lista) return
  let filas = []
  let puntos = new Map()

  function pintar () {
    const q = (buscar.value ?? '').trim().toLowerCase()
    const vista = filas.filter(([, u]) => !q || `${u.alias} ${u.correo}`.toLowerCase().includes(q))
    $('usuarios-cuenta').textContent = `${filas.length} registrado${filas.length === 1 ? '' : 's'}`
    lista.innerHTML = vista.length
      ? vista.map(([uid, u]) => `
        <li>
          <div class="usuario-cabeza">
            <b>${escapar(u.alias ?? '¿?')}</b>
            <span class="usuario-ultima">${hace(u.ultima)}</span>
          </div>
          <p class="usuario-correo">${escapar(u.correo ?? '')}</p>
          <div class="usuario-datos">
            <span><b>${u.tramos ?? 0}</b>/39 tramos</span>
            <span><b>${u.estrellas ?? 0}</b> ★</span>
            <span><b>${u.billetes ?? 0}</b> billetes</span>
            <span><b>${puntos.get(uid) ?? '—'}</b> pts 1c1</span>
          </div>
          <small>Alta: ${fecha(u.alta)}</small>
        </li>`).join('')
      : '<li class="marcador-vacio">Nadie coincide con la búsqueda.</li>'
  }

  almacen.alCambiar('usuarios', todos => {
    filas = Object.entries(todos ?? {}).sort((a, b) => (b[1].ultima ?? 0) - (a[1].ultima ?? 0))
    total?.(filas.length)
    pintar()
  })
  buscar.addEventListener('input', pintar)

  $('ver-usuarios')?.addEventListener('click', async () => {
    capa.classList.remove('hidden')
    // Los puntos del duelo, cada vez que se abre: cambian con cada partida.
    try {
      const { cargarFirebase } = await import('./systems/cuenta.js')
      const { fs, db } = await cargarFirebase()
      const docs = await fs.getDocs(fs.collection(db, 'duelo'))
      puntos = new Map(docs.docs.map(d => [d.id, d.data().puntos]))
      pintar()
    } catch (e) { console.warn('Sin puntos de duelo:', e) }
  })
  $('usuarios-volver')?.addEventListener('click', () => capa.classList.add('hidden'))
}
