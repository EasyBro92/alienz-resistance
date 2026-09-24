// La lista de usuarios, solo para el administrador.
//
// Cada jugador con cuenta de Google deja su resumen en la Realtime Database
// (`usuarios/{uid}`, ver `apuntarEnLista` en cuenta.js) y solo los de `admins`
// pueden leerla: las reglas del servidor lo impiden a cualquier otro, aunque
// encontrara esta pantalla en el código. Los puntos del 1 contra 1 se cruzan con
// la clasificación de Firestore, que ya es pública para quien tiene sesión.
//
// Isidro pidió poder filtrar («por nombre, cuenta etc») y poder hacer cosas
// desde aquí: abrir la ficha de uno, silenciarle el chat, mandarle un aviso,
// regalarle billetes, ver sus denuncias y sacar la lista a un archivo.
//
// Dos avisos sobre lo que se puede y lo que no:
//
//   · Los invitados (sesión anónima) NO salen en la lista: no tienen ni nombre
//     ni correo que enseñar. De ellos solo se cuenta cuántos son, que es lo que
//     dice si el juego tiene gente aunque no se registre.
//   · El aviso y el regalo escriben en `avisos/{uid}` y `regalos/{uid}`, que son
//     rutas nuevas. Hasta que se publiquen las reglas (`firebase deploy --only
//     database`) el servidor las rechaza, y aquí se dice en vez de fallar en
//     silencio.

const $ = id => document.getElementById(id)

const fecha = ms => (ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const DIA = 86400000

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

// Los tramos de la campaña. Se piden aquí y no se cablea un 39 a mano: si
// mañana entra otro país, el filtro de «campaña acabada» sigue valiendo.
const TOTAL_TRAMOS = 39

const ORDENES = {
  ultima: { nombre: 'Últimos en jugar', valor: u => u.ultima ?? 0, mayor: true },
  alta: { nombre: 'Los más nuevos', valor: u => u.alta ?? 0, mayor: true },
  estrellas: { nombre: 'Más estrellas', valor: u => u.estrellas ?? 0, mayor: true },
  tramos: { nombre: 'Más tramos', valor: u => u.tramos ?? 0, mayor: true },
  puntos: { nombre: 'Rango 1 contra 1', valor: u => u.puntos ?? -1, mayor: true },
  alias: { nombre: 'Por orden alfabético', valor: u => (u.alias ?? '').toLowerCase(), mayor: false }
}

export function montarUsuarios ({ almacen, escapar, total }) {
  const capa = $('usuarios-capa')
  const lista = $('usuarios-lista')
  const buscar = $('usuarios-buscar')
  if (!capa || !lista) return
  let filas = []                 // [uid, datos] tal cual llegan
  let puntos = new Map()
  let denuncias = []             // [id, denuncia]
  let bloqueados = new Set()
  let actividad = 'todos'
  let avance = 'todos'
  let orden = 'ultima'
  let abierta = null             // uid de la ficha abierta

  // --- qué filas pasan los filtros -----------------------------------------
  function visibles () {
    const q = (buscar.value ?? '').trim().toLowerCase()
    const ahora = Date.now()
    const pasa = ([uid, u]) => {
      if (q && !`${u.alias ?? ''} ${u.correo ?? ''}`.toLowerCase().includes(q)) return false
      const dias = u.ultima ? (ahora - u.ultima) / DIA : Infinity
      if (actividad === 'hoy' && dias > 1) return false
      if (actividad === '7' && dias > 7) return false
      if (actividad === '30' && dias > 30) return false
      if (actividad === 'dormidos' && dias <= 30) return false
      const t = u.tramos ?? 0
      if (avance === 'nuevos' && t > 5) return false
      if (avance === 'medias' && (t <= 5 || t >= TOTAL_TRAMOS)) return false
      if (avance === 'fin' && t < TOTAL_TRAMOS) return false
      if (avance === 'rango' && !puntos.has(uid)) return false
      return true
    }
    const o = ORDENES[orden] ?? ORDENES.ultima
    const con = filas.filter(pasa).map(([uid, u]) => [uid, { ...u, puntos: puntos.get(uid) }])
    return con.sort((a, b) => {
      const va = o.valor(a[1])
      const vb = o.valor(b[1])
      if (va === vb) return (b[1].ultima ?? 0) - (a[1].ultima ?? 0)
      if (o.mayor) return vb > va ? 1 : -1
      return va > vb ? 1 : -1
    })
  }

  function pintar () {
    const vista = visibles()
    $('usuarios-cuenta').textContent = vista.length === filas.length
      ? `${filas.length} registrado${filas.length === 1 ? '' : 's'}${invitados != null ? ` · ${invitados} invitado${invitados === 1 ? '' : 's'}` : ''}`
      : `${vista.length} de ${filas.length}${invitados != null ? ` · ${invitados} invitados` : ''}`
    lista.innerHTML = vista.length
      ? vista.map(([uid, u]) => `
        <li data-uid="${uid}">
          <div class="usuario-cabeza">
            <b>${escapar(u.alias ?? '¿?')}</b>
            <span class="usuario-ultima">${hace(u.ultima)}</span>
          </div>
          <p class="usuario-correo">${escapar(u.correo ?? '')}${bloqueados.has(uid) ? ' <i class="usuario-mudo">chat silenciado</i>' : ''}</p>
          <div class="usuario-datos">
            <span><b>${u.tramos ?? 0}</b>/${TOTAL_TRAMOS} tramos</span>
            <span><b>${u.estrellas ?? 0}</b> ★</span>
            <span><b>${u.billetes ?? 0}</b> billetes</span>
            <span><b>${u.puntos ?? '—'}</b> pts 1c1</span>
          </div>
          <small>Alta: ${fecha(u.alta)}</small>
        </li>`).join('')
      : '<li class="marcador-vacio">Nadie coincide con el filtro.</li>'
  }

  // --- la ficha de uno ------------------------------------------------------
  function abrirFicha (uid) {
    const u = filas.find(f => f[0] === uid)?.[1]
    if (!u) return
    abierta = uid
    const suyas = denuncias.filter(([, d]) => d.de === uid)
    const mudo = bloqueados.has(uid)
    $('usuario-ficha').hidden = false
    $('usuario-ficha').innerHTML = `
      <div class="panel panel-retos">
        <p class="eyebrow">Ficha de jugador</p>
        <h2>${escapar(u.alias ?? '¿?')}</h2>
        <p class="usuario-correo">${escapar(u.correo ?? '')}</p>
        <div class="usuario-datos ficha-datos">
          <span><b>${u.tramos ?? 0}</b>/${TOTAL_TRAMOS} tramos</span>
          <span><b>${u.estrellas ?? 0}</b> estrellas</span>
          <span><b>${u.billetes ?? 0}</b> billetes</span>
          <span><b>${puntos.get(uid) ?? '—'}</b> puntos 1c1</span>
        </div>
        <p class="ajuste-pie">Alta el ${fecha(u.alta)} · última vez ${hace(u.ultima)}</p>

        <p class="retos-tit">Chat</p>
        <button class="chip ${mudo ? '' : 'chip-ghost'}" id="ficha-mudo" type="button">
          ${mudo ? 'Quitarle el silencio' : 'Silenciarle el chat'}
        </button>

        <p class="retos-tit">Mandarle un aviso</p>
        <div class="ficha-fila">
          <input id="ficha-aviso" class="alias-campo" type="text" maxlength="140" placeholder="Le saldrá al entrar en el juego">
          <button class="chip" id="ficha-mandar" type="button">Mandar</button>
        </div>

        <p class="retos-tit">Regalarle billetes</p>
        <div class="ficha-fila ficha-regalos">
          ${[100, 500, 1000].map(n => `<button class="chip chip-ghost ficha-regalo" data-n="${n}" type="button">${n}</button>`).join('')}
        </div>

        <p class="retos-tit">Sus denuncias (${suyas.length})</p>
        ${suyas.length
          ? `<ul class="usuarios-lista">${suyas.map(([, d]) => `
              <li><p>«${escapar(d.texto ?? '')}»</p><small>${d.en ? new Date(d.en).toLocaleString('es-ES') : ''}</small></li>`).join('')}</ul>`
          : '<p class="ajuste-pie">Nadie le ha denunciado.</p>'}

        <p class="ficha-resultado" id="ficha-resultado"></p>
        <button class="chip chip-ghost" id="ficha-cerrar" type="button">Cerrar</button>
      </div>`

    const decir = (texto, malo = false) => {
      const p = $('ficha-resultado')
      p.textContent = texto
      p.className = `ficha-resultado${malo ? ' malo' : ''}`
    }

    $('ficha-cerrar').addEventListener('click', cerrarFicha)
    $('ficha-mudo').addEventListener('click', async e => {
      e.target.disabled = true
      try {
        if (mudo) await almacen.quitar(`bloqueados/${uid}`)
        else await almacen.poner(`bloqueados/${uid}`, { alias: u.alias ?? '', en: almacen.marcaDeTiempo() })
        if (mudo) bloqueados.delete(uid); else bloqueados.add(uid)
        abrirFicha(uid)
        pintar()
      } catch (err) {
        console.warn('Sin bloqueo:', err)
        decir('No se ha podido. Revisa la conexión.', true)
        e.target.disabled = false
      }
    })
    $('ficha-mandar').addEventListener('click', async () => {
      const texto = $('ficha-aviso').value.trim()
      if (!texto) return
      try {
        await almacen.poner(`avisos/${uid}`, { t: texto.slice(0, 140), en: almacen.marcaDeTiempo() })
        $('ficha-aviso').value = ''
        decir('Aviso mandado. Le saldrá la próxima vez que entre.')
      } catch (err) { fallaRegla(err, decir) }
    })
    for (const b of document.querySelectorAll('.ficha-regalo')) {
      b.addEventListener('click', async () => {
        const n = Number(b.dataset.n)
        try {
          await almacen.poner(`regalos/${uid}`, { billetes: n, en: almacen.marcaDeTiempo() })
          decir(`${n} billetes de camino. Los recogerá al entrar.`)
        } catch (err) { fallaRegla(err, decir) }
      })
    }
  }

  // Las dos rutas nuevas necesitan que se publiquen las reglas. Decirlo con su
  // nombre es más útil que un «error»: es una orden que se copia y se pega.
  function fallaRegla (err, decir) {
    console.warn('Sin escribir:', err)
    decir(/permission|denied/i.test(String(err?.message ?? err))
      ? 'El servidor no deja escribir ahí todavía: falta publicar las reglas (firebase deploy --only database).'
      : 'No se ha podido. Revisa la conexión.', true)
  }

  function cerrarFicha () {
    abierta = null
    $('usuario-ficha').hidden = true
    $('usuario-ficha').innerHTML = ''
  }

  // --- la lista a un archivo ------------------------------------------------
  function descargar () {
    const cabecera = ['alias', 'correo', 'alta', 'ultima', 'tramos', 'estrellas', 'billetes', 'puntos1c1']
    const escapaCampo = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lineas = visibles().map(([, u]) => [
      u.alias, u.correo,
      u.alta ? new Date(u.alta).toISOString() : '',
      u.ultima ? new Date(u.ultima).toISOString() : '',
      u.tramos ?? 0, u.estrellas ?? 0, u.billetes ?? 0, u.puntos ?? ''
    ].map(escapaCampo).join(','))
    // Con el BOM por delante, Excel abre las tildes bien en vez de en garabatos.
    const csv = '﻿' + [cabecera.join(','), ...lineas].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `alienz-usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  // --- lo que llega del servidor -------------------------------------------
  let invitados = null

  almacen.alCambiar('usuarios', todos => {
    filas = Object.entries(todos ?? {})
    total?.(filas.length)
    pintar()
    if (abierta) abrirFicha(abierta)
  })
  // Los invitados no se listan: solo se cuentan. Si las reglas todavía no
  // permiten leer esa rama, se calla y la cuenta no sale.
  almacen.leer('invitados')
    .then(v => { invitados = v ? Object.keys(v).length : 0; pintar() })
    .catch(() => {})
  almacen.alCambiar('bloqueados', todos => {
    bloqueados = new Set(Object.keys(todos ?? {}))
    pintar()
    if (abierta) abrirFicha(abierta)
  })
  almacen.alCambiar('denuncias', todas => {
    denuncias = Object.entries(todas ?? {})
    if (abierta) abrirFicha(abierta)
  })

  // --- mandos ---------------------------------------------------------------
  buscar.addEventListener('input', pintar)
  lista.addEventListener('click', e => {
    const li = e.target.closest('li[data-uid]')
    if (li) abrirFicha(li.dataset.uid)
  })
  $('usuarios-csv')?.addEventListener('click', descargar)
  $('usuarios-orden')?.addEventListener('change', e => { orden = e.target.value; pintar() })
  for (const fila of document.querySelectorAll('.filtro-fila')) {
    fila.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]')
      if (!b) return
      for (const otro of fila.querySelectorAll('button')) otro.classList.toggle('on', otro === b)
      if (fila.dataset.filtro === 'actividad') actividad = b.dataset.v
      else avance = b.dataset.v
      pintar()
    })
  }

  $('ver-usuarios')?.addEventListener('click', async () => {
    capa.classList.remove('hidden')
    cerrarFicha()
    // Los puntos del duelo, cada vez que se abre: cambian con cada partida.
    try {
      const { cargarFirebase } = await import('./systems/cuenta.js')
      const { fs, db } = await cargarFirebase()
      const docs = await fs.getDocs(fs.collection(db, 'duelo'))
      puntos = new Map(docs.docs.map(d => [d.id, d.data().puntos]))
      pintar()
    } catch (e) { console.warn('Sin puntos de duelo:', e) }
  })
  $('usuarios-volver')?.addEventListener('click', () => {
    if (abierta) return cerrarFicha()
    capa.classList.add('hidden')
  })
}
