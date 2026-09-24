// Duelo en directo: la sala, el emparejamiento, lo que se ve durante la partida
// (miniatura del rival, biomasa para atacar, avisos, chat) y el final.
//
// Cada jugador simula SU campo. Por la red solo cruza:
//   duelos/{codigo}/jugadores/{uid}   quién está (se borra solo si se cae)
//   duelos/{codigo}/inicio            la semilla de la horda, cuando están los dos
//   duelos/{codigo}/campo/{uid}       la miniatura, cuatro veces por segundo
//   duelos/{codigo}/envios/{uid}      los alienz que le mandan a ese jugador
//   duelos/{codigo}/chat              los mensajes
//   duelos/{codigo}/fin/{uid}         «he caído»
// y, fuera de la sala, `cola` (partida rápida), `denuncias` y `bloqueados`.
//
// La lógica de la partida sigue en main.js: aquí se le pide lo justo a través
// de `juego` (empezar, meter un alien, leer el campo, pintar el final).

import { ZOMBIES, SOLDIERS, DEFENSES, FIELD } from './config.js'
import {
  semillaNueva, ENVIOS, CLAVES_ENVIO, biomasaDe, AVISO, MUERTE_SUBITA,
  PUNTOS_INICIALES, rangoDe, insignia, cambioDePuntos,
  FRASES, MAX_MENSAJE, ESPERA_MENSAJE, filtrar
} from './systems/duelo.js'
import { crearCamaraRival } from './camaraRival.js'

const CLAVES_Z = Object.keys(ZOMBIES)
const CLAVES_S = [...Object.keys(SOLDIERS), ...Object.keys(DEFENSES)]
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const codigoNuevo = () => Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')
// v2: el tamaño por defecto pasa a ser el grande, y con la clave vieja los que
// ya habían jugado se quedaban con el pequeño guardado de antes.
const CLAVE_VISTA = 'alienz-duelo-vista-v2'
const MARCA_AGUANTE = 'alienz-aguante-v1'
const CLAVE_FIJA = 'alienz-duelo-bandeja-v1'
const ESPERA_VUELTA = 20
const hex = n => '#' + (n ?? 0x888888).toString(16).padStart(6, '0')
const $ = id => document.getElementById(id)

// Con `?local` en desarrollo, el duelo va entre pestañas de este navegador y
// no necesita cuenta ni red: es como se prueba en el ordenador.
const modoLocal = () => import.meta.env.DEV && new URLSearchParams(location.search).has('local')

export function crearDuelo ({ cuenta, audio, escapar, juego }) {
  let almacen = null
  let yo = null                 // { uid, alias, puntos, conCuenta }
  let sala = null               // { codigo, anfitrion, rival, semilla, … }
  let sueltas = []
  let enCurso = false
  let t = 0
  let biomasa = 0
  let recargas = {}
  let avisos = []
  let envioCampo = 0
  let carrilElegido = -1
  let silenciado = false
  let ultimoMensaje = 0
  let bloqueado = false
  let ausencia = null           // segundos que lleva fuera el rival
  let subita = false
  let terminado = false
  let buscando = null
  // Contra la maquina: mismo duelo, misma arena y misma horda, pero al otro
  // lado no hay nadie. Sirve para practicar sin esperar rival, sin conexion y
  // sin un segundo movil.
  let contraLaMaquina = false
  // Aguantar en la arena: el mismo tablero, las mismas oleadas que se van
  // endureciendo y las mismas cartas, pero sin nadie enfrente. Se gana tiempo,
  // no se gana la partida.
  let modoAguantar = false
  // La bandeja de atacar, clavada abierta. Isidro quería poder elegir: abrirla
  // y cerrarla como hasta ahora, o dejarla fija y mandar de un toque.
  let bandejaFija = false
  let ultimaOla = 0

  const lienzo = $('duelo-mini')
  // La pantalla del rival ya no es un plano con circulos: es una camara
  // apuntando a su campo, con sus alienz de verdad. Ver `camaraRival.js`.
  const camara = lienzo ? crearCamaraRival(lienzo, {
    calidad: () => juego.calidad?.() ?? 'alta',
    paleta: () => juego.paleta?.() ?? null
  }) : null
  // Las fotos de las figuras se hacen al ENTRAR en el duelo, no al arrancar el
  // juego: en campana esto no se usa y serian treinta renders para nada.
  let fotosPedidas = false
  function pedirFotos () {
    if (fotosPedidas || !camara || !juego.fotosCampo) return
    fotosPedidas = true
    juego.fotosCampo().then(m => camara?.ponerFotos(m)).catch(e => console.warn('Sin fotos de campo:', e))
  }

  // Para probar el duelo desde la consola sin dos moviles delante.
  if (import.meta.env.DEV) {
    window.__duelo = {
      get sala () { return sala },
      get camara () { return camara },
      get enCurso () { return enCurso }
    }
  }

  // --- conexión -----------------------------------------------------------------
  //
  // Una sola conexión a la vez, y la que se queda a medias se tira.
  //
  // Antes cada llamada abría la suya: al entrar en la pantalla del duelo se
  // abría la de la nube, y si mientras tanto elegías «contra la máquina» se
  // abría la de mentira encima. La primera llegaba tarde, pisaba el almacén de
  // la máquina y la partida se quedaba en «Preparando a la máquina…» para
  // siempre, porque el rival que encontraba en la sala era uno mismo. Costaba
  // verlo porque hacía falta que la nube tardara: con el móvil fino no pasaba
  // casi nunca.
  let conexion = null
  let generacion = 0

  function soltarConexion () {
    generacion++
    if (almacen?.cerrar) try { almacen.cerrar() } catch {}
    almacen = null
    conexion = null
  }

  function conectar () {
    if (almacen) return Promise.resolve(almacen)
    if (!conexion) {
      conexion = abrirConexion(generacion)
      conexion.catch(() => {}).then(() => { conexion = null })
    }
    return conexion
  }

  async function abrirConexion (gen) {
    let tienda
    if (contraLaMaquina) {
      const { almacenBot } = await import('./systems/bot.js')
      tienda = almacenBot()
    } else if (modoLocal()) {
      const { almacenLocal } = await import('./systems/almacen.js')
      tienda = almacenLocal('local-' + Math.random().toString(36).slice(2, 8))
    } else {
      const { asegurarSesion } = await import('./systems/cuenta.js')
      const u = cuenta.usuario ?? await asegurarSesion()
      const { almacenNube } = await import('./systems/almacen.js')
      tienda = await almacenNube(u)
    }
    // Mientras se abría, alguien ha cambiado de modo: esta ya no vale.
    if (gen !== generacion) { try { tienda.cerrar?.() } catch {} ; return null }
    const { aliasActual } = await import('./systems/marcadores.js')
    // Contra la maquina no se puntua: seria regalarse el rango.
    const conCuenta = !!cuenta.usuario && !modoLocal() && !contraLaMaquina
    const ficha = {
      uid: tienda.uid,
      alias: conCuenta ? aliasActual(cuenta.usuario) : 'Invitado ' + tienda.uid.slice(-4).toUpperCase(),
      conCuenta,
      puntos: conCuenta ? (await leerFicha())?.puntos ?? PUNTOS_INICIALES : PUNTOS_INICIALES
    }
    if (gen !== generacion) { try { tienda.cerrar?.() } catch {} ; return null }
    almacen = tienda
    yo = ficha
    bloqueado = !!(await almacen.leer(`bloqueados/${yo.uid}`).catch(() => null))
    return almacen
  }

  async function leerFicha () {
    const { cargarFirebase } = await import('./systems/cuenta.js')
    const { fs, db } = await cargarFirebase()
    return (await fs.getDoc(fs.doc(db, 'duelo', cuenta.usuario.uid))).data() ?? null
  }

  // --- vestíbulo -----------------------------------------------------------------
  const aviso = texto => { $('duelo-aviso').textContent = texto }

  async function abrir () {
    $('duelo-capa').classList.remove('hidden')
    // Se empiezan a hacer ya: entre elegir modo, emparejar y la cuenta atras
    // hay de sobra para que esten listas antes del primer fotograma.
    pedirFotos()
    $('duelo-sala').hidden = true
    aviso('')
    $('duelo-sin-cuenta').hidden = !!cuenta.usuario
    pintarMiRango()
    pintarTabla()
    try {
      await conectar()
      pintarMiRango()
    } catch (e) {
      console.warn('Sin duelo:', e)
      // Sin cuenta se entra con una sesión anónima; si el servidor no la
      // permite, lo honrado es decir qué hacer en vez de un error genérico.
      aviso(!cuenta.usuario && /operation-not-allowed|admin-restricted/.test(e?.code ?? '')
        ? 'Ahora mismo hace falta entrar con tu cuenta (en Ajustes) para jugar en línea.'
        : 'No se ha podido conectar. Revisa la conexión e inténtalo otra vez.')
    }
  }

  function pintarMiRango () {
    const caja = $('duelo-yo')
    if (!cuenta.usuario) {
      caja.innerHTML = `${insignia(rangoDe(PUNTOS_INICIALES).indice, 52)}<div><b>Sin rango</b><small>Juegas como invitado</small></div>`
      return
    }
    const p = yo?.puntos ?? PUNTOS_INICIALES
    const r = rangoDe(p)
    caja.innerHTML = `${insignia(r.indice, 52)}<div><b>${r.nombre}</b><small>${p} puntos</small></div>`
  }

  async function pintarTabla () {
    const lista = $('duelo-tabla')
    if (!cuenta.usuario) { lista.innerHTML = '<li class="marcador-vacio">Entra con tu cuenta para ver la clasificación.</li>'; return }
    lista.innerHTML = '<li class="marcador-cargando">Pidiendo la tabla…</li>'
    try {
      const { cargarFirebase } = await import('./systems/cuenta.js')
      const { fs, db } = await cargarFirebase()
      const q = fs.query(fs.collection(db, 'duelo'), fs.orderBy('puntos', 'desc'), fs.limit(10))
      const filas = (await fs.getDocs(q)).docs.map((d, i) => ({ puesto: i + 1, uid: d.id, ...d.data() }))
      lista.innerHTML = filas.length
        ? filas.map(f => `
          <li class="${f.uid === cuenta.usuario.uid ? 'marcador-yo' : ''}">
            <span class="marcador-puesto">${f.puesto}</span>
            <span class="marcador-alias duelo-fila">${insignia(rangoDe(f.puntos).indice, 20)}${escapar(f.alias ?? '')}</span>
            <span class="marcador-marca">${f.puntos}</span>
          </li>`).join('')
        : '<li class="marcador-vacio">Nadie ha jugado todavía. Estrena la tabla.</li>'
    } catch (e) {
      console.warn('Sin tabla de duelo:', e)
      lista.innerHTML = '<li class="marcador-vacio">No se ha podido leer la tabla.</li>'
    }
  }

  async function crearSala () {
    await conectar()
    await entrarEnSala(codigoNuevo(), true)
    $('duelo-codigo').textContent = sala.codigo
    $('duelo-sala').hidden = false
    aviso('')
  }

  async function unirse (codigo) {
    if (!/^[A-Z2-9]{4}$/.test(codigo)) return aviso('El código son cuatro letras o números.')
    await conectar()
    const gente = await almacen.leer(`duelos/${codigo}/jugadores`)
    const n = Object.keys(gente ?? {}).length
    if (!n) return aviso('No hay ninguna sala abierta con ese código.')
    if (n >= 2 && !gente[yo.uid]) return aviso('Esa sala ya está llena.')
    await entrarEnSala(codigo, false)
    aviso('Dentro. Empieza en cuanto la sala esté lista…')
  }

  // Partida rápida: una sola casilla, `cola`. Si hay alguien esperando (y no
  // lleva más de un minuto), se entra en su sala; si no, se deja la tuya y se
  // espera a que alguien la coja.
  async function partidaRapida () {
    await conectar()
    const mia = codigoNuevo()
    let cogida = null
    await almacen.transaccion('cola', actual => {
      cogida = null
      if (actual && actual.uid !== yo.uid && Date.now() - (actual.en ?? 0) < 60000) {
        cogida = actual
        return null
      }
      return { codigo: mia, uid: yo.uid, en: Date.now() }
    })
    if (cogida) {
      await entrarEnSala(cogida.codigo, false)
      aviso('¡Rival encontrado! Preparando la arena…')
      return
    }
    await entrarEnSala(mia, true)
    buscando = mia
    // La cola caduca al minuto (por si alguien cierra el juego buscando), así
    // que mientras sigas buscando se renueva la hora.
    const renovar = setInterval(() => {
      if (buscando !== mia) return clearInterval(renovar)
      almacen.transaccion('cola', actual => (actual?.codigo === mia ? { ...actual, en: Date.now() } : actual)).catch(() => {})
    }, 25000)
    aviso('Buscando rival… (tarda lo que tarde en entrar alguien más)')
    $('duelo-cancelar').hidden = false
  }

  // Contra la maquina. Se monta una sala como cualquier otra, solo que el
  // almacen es de mentira y trae rival dentro: se apunta solo y el arranque
  // sale por el mismo camino de siempre.
  async function contraMaquina () {
    contraLaMaquina = true
    soltarConexion()
    await conectar()
    pintarMiRango()
    await entrarEnSala(codigoNuevo(), true)
    aviso('Preparando a la máquina…')
  }

  async function aguantar () {
    contraLaMaquina = false
    modoAguantar = true
    soltarConexion()
    const { almacenBot } = await import('./systems/bot.js')
    almacen = almacenBot({ sinRival: true })
    const { aliasActual } = await import('./systems/marcadores.js')
    yo = {
      uid: almacen.uid,
      alias: cuenta.usuario ? aliasActual(cuenta.usuario) : 'Tú',
      conCuenta: false,
      puntos: PUNTOS_INICIALES
    }
    sala = { codigo: codigoNuevo(), anfitrion: true, rival: null, raiz: 'aguantar' }
    cuentaAtras({ semilla: semillaNueva() })
  }

  async function cancelarBusqueda () {
    $('duelo-cancelar').hidden = true
    if (buscando && almacen) {
      const mia = buscando
      await almacen.transaccion('cola', actual => (actual?.codigo === mia ? null : actual)).catch(() => {})
    }
    buscando = null
    salirDeSala()
    aviso('')
  }

  async function entrarEnSala (codigo, anfitrion) {
    salirDeSala()
    sala = { codigo, anfitrion, rival: null, raiz: `duelos/${codigo}` }
    const fila = `${sala.raiz}/jugadores/${yo.uid}`
    const apuntarme = () => {
      almacen.alIrme(fila)
      return almacen.poner(fila, { alias: yo.alias, puntos: yo.puntos, cuenta: yo.conCuenta })
    }
    await apuntarme()
    // Si el móvil pierde la cobertura un momento, el servidor le borra la fila;
    // al volver hay que apuntarse otra vez o el rival le daría por ido.
    if (almacen.alConexion) sueltas.push(almacen.alConexion(ok => { if (ok && sala) apuntarme() }))

    sueltas.push(almacen.alCambiar(`${sala.raiz}/jugadores`, gente => alCambiarGente(gente ?? {})))
    sueltas.push(almacen.alCambiar(`${sala.raiz}/inicio`, inicio => { if (inicio && !enCurso && !sala.cuenta) cuentaAtras(inicio) }))
  }

  function alCambiarGente (gente) {
    if (!sala || modoAguantar) return
    const otros = Object.entries(gente).filter(([uid]) => uid !== yo.uid)
    const [uidRival, datos] = otros[0] ?? []
    if (uidRival) sala.rival = { uid: uidRival, ...datos }
    $('duelo-gente').textContent = uidRival ? `Rival: ${datos.alias}` : 'Esperando al rival…'

    if (enCurso) {
      // Durante la partida, que el rival desaparezca abre la cuenta de 20 s.
      if (!uidRival && ausencia == null) { ausencia = 0; juego.banner('RIVAL DESCONECTADO') }
      if (uidRival && ausencia != null) { ausencia = null; $('duelo-ausencia').hidden = true }
      return
    }
    // El anfitrión arranca en cuanto hay dos. En partida rápida, además, la
    // casilla de la cola ya no pinta nada.
    if (uidRival && sala.anfitrion && !sala.cuenta) {
      if (buscando) { buscando = null; $('duelo-cancelar').hidden = true }
      almacen.poner(`${sala.raiz}/inicio`, { semilla: semillaNueva() })
    }
  }

  function salirDeSala () {
    for (const quitar of sueltas) try { quitar?.() } catch {}
    sueltas = []
    if (sala && almacen) almacen.quitar(`${sala.raiz}/jugadores/${yo.uid}`)?.catch?.(() => {})
    sala = null
  }

  // --- cuenta atrás y arranque -------------------------------------------------------
  // Antes de la cuenta, la presentación: quién tienes enfrente, su rango y —si
  // es una de las máquinas— cómo juega. Isidro lo pidió «como en los juegos de
  // pelea», y además resuelve media queja suya: saber a qué te enfrentas.
  function presentar () {
    const capa = $('duelo-presenta')
    if (!capa) return 0
    // Aguantando no hay rival que presentar, pero sí hay que explicar a qué se
    // juega: Isidro lo probó y «no entendí gran cosa». No se gana; se aguanta.
    if (modoAguantar) {
      capa.innerHTML = `
        <div class="duelo-presenta-ficha">
          <b>AGUANTAR EN LA ARENA</b>
          <i>no se gana: se aguanta</i>
          <p>Oleadas sin fin, y cada una más dura que la anterior. No hay rival ni final feliz: lo único que cuenta es hasta qué oleada llegas.</p>
          <small>Tu marca: ${marcaAguante()}</small>
        </div>`
      capa.hidden = false
      setTimeout(() => { capa.hidden = true }, 3600)
      return 3600
    }
    const r = sala.rival
    if (!r) return 0
    const rango = rangoDe(r.puntos ?? PUNTOS_INICIALES)
    const cara = r.siglas
      ? `<span class="duelo-cara" style="--tinte:${hex(r.color)}">${escapar(r.siglas)}</span>`
      : insignia(rango.indice, 72)
    capa.innerHTML = `
      <div class="duelo-presenta-ficha">
        ${cara}
        <b>${escapar(r.alias ?? 'Rival')}</b>
        ${r.mote ? `<i>«${escapar(r.mote)}»</i>` : `<i>${rango.nombre}</i>`}
        ${r.como ? `<p>${escapar(r.como)}</p>` : ''}
        ${r.nivel != null ? `<small>Nivel ${r.nivel + 1} de 6</small>` : ''}
      </div>`
    capa.hidden = false
    setTimeout(() => { capa.hidden = true }, 2400)
    return 2400
  }

  function cuentaAtras (inicio) {
    sala.semilla = inicio.semilla
    sala.cuenta = true
    $('duelo-capa').classList.add('hidden')
    setTimeout(() => {
      let n = 3
      juego.banner(modoAguantar ? `AGUANTA · ${n}` : `${sala.rival?.alias ?? 'RIVAL'} · ${n}`)
      audio.coin?.()
      const tic = setInterval(() => {
        n--
        if (n > 0) { juego.banner(String(n)); audio.coin?.(); return }
        clearInterval(tic)
        empezar()
      }, 1000)
    }, presentar())
  }

  function empezar () {
    enCurso = true
    terminado = false
    t = 0
    biomasa = 0
    recargas = {}
    avisos = []
    ausencia = null
    subita = false
    carrilElegido = -1
    $('duelo-hud').hidden = false
    // Aguantando no hay a quien mirar ni a quien mandarle nada.
    $('duelo-rival').hidden = modoAguantar
    $('duelo-atacar').hidden = modoAguantar
    $('duelo-chat-boton').hidden = modoAguantar
    $('duelo-rival-nombre').textContent = sala.rival?.alias ?? 'Rival'
    camara?.reiniciar()
    camara?.ponerNombre(sala.rival?.alias ?? 'Rival')
    pedirFotos()
    aplicarVista(leerVista())
    try { bandejaFija = !!localStorage.getItem(CLAVE_FIJA) } catch {}
    $('duelo-fijar')?.setAttribute('aria-pressed', String(bandejaFija))
    $('duelo-bandeja').hidden = !bandejaFija
    pintarBandeja()
    pintarBiomasa()
    $('duelo-mensajes').innerHTML = ''
    pintarChatBloqueado()
    juego.empezar(sala.semilla)

    sueltas.push(almacen.alCambiar(`${sala.raiz}/campo/${sala.rival?.uid}`, c => {
      // Rótulos de cómo le va, sacados de su propia instantánea: sin esto no
      // había forma de saber si ibas ganando la carrera, que era la queja.
      const antes = sala.campoRival?.b
      sala.campoRival = c
      camara?.datos(c)
      const ahora = c?.b
      if (antes == null || ahora == null) return
      for (const u of [75, 50, 25]) {
        if (antes > u && ahora <= u) {
          juego.banner(u === 25 ? `${(sala.rival?.alias ?? 'EL RIVAL').toUpperCase()} SE CAE` : `${(sala.rival?.alias ?? 'EL RIVAL').toUpperCase()} AL ${u} %`)
          audio.coin?.()
        }
      }
    }))
    sueltas.push(almacen.alNuevo(`${sala.raiz}/envios/${yo.uid}`, (e, clave) => {
      almacen.quitar(`${sala.raiz}/envios/${yo.uid}/${clave}`)
      recibirEnvio(e)
    }))
    sueltas.push(almacen.alNuevo(`${sala.raiz}/chat`, m => pintarMensaje(m), 30))
    sueltas.push(almacen.alCambiar(`${sala.raiz}/fin`, fin => {
      if (!fin || terminado) return
      if (fin[sala.rival?.uid]) acabar(true, 'cayó')
    }))
  }

  // --- durante la partida --------------------------------------------------------------
  function tic (dt) {
    if (!enCurso || terminado) return
    t += dt
    for (const k in recargas) recargas[k] = Math.max(0, recargas[k] - dt)

    if (modoAguantar) {
      // Aquí no hay muerte súbita: las oleadas ya se endurecen solas, y sumar
      // las dos cosas mataba en dos minutos. Lo que se enseña es lo que llevas
      // aguantado, que es la marca.
      // La OLEADA manda sobre el reloj: es lo que se compara y lo que se
      // entiende. El tiempo va detrás, en pequeño.
      const ola = juego.oleada?.() ?? 0
      if (ola !== ultimaOla) {
        ultimaOla = ola
        if (ola > 1) { juego.banner(`OLEADA ${ola}`); audio.groan?.(false) }
      }
      juego.rotulo(`OLEADA ${ola} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`)
    } else {
      if (!subita && t >= MUERTE_SUBITA) { subita = true; juego.banner('MUERTE SÚBITA'); audio.groan?.(true) }
      const resta = Math.max(0, MUERTE_SUBITA - t)
      juego.rotulo(subita
        ? `Muerte súbita · ×${escala().toFixed(1)}`
        : `Duelo · ${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}`)
      camara?.ponerReloj(subita
        ? 'SÚBITA'
        : `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}`)
    }

    for (let i = avisos.length - 1; i >= 0; i--) {
      const a = avisos[i]
      a.queda -= dt
      if (a.queda <= 0) {
        avisos.splice(i, 1)
        a.el.remove()
        juego.meterAlien(a.k, a.l)
      } else {
        a.el.querySelector('i').style.width = `${a.queda / AVISO * 100}%`
      }
    }

    apartarSiEstorba()
    // La camara va a su ritmo (entre 11 y 20 veces por segundo segun el movil),
    // pero necesita el latido para rellenar el hueco entre instantaneas.
    if (!modoAguantar) camara?.tic(dt)

    envioCampo -= dt
    if (envioCampo <= 0) {
      envioCampo = 0.25
      almacen.poner(`${sala.raiz}/campo/${yo.uid}`, empaquetarCampo())
      refrescarBandeja()
    }

    if (ausencia != null) {
      ausencia += dt
      const queda = Math.ceil(ESPERA_VUELTA - ausencia)
      $('duelo-ausencia').hidden = false
      $('duelo-ausencia').textContent = `El rival se ha desconectado. Ganas por abandono en ${Math.max(0, queda)} s`
      if (ausencia >= ESPERA_VUELTA) acabar(true, 'abandono')
    }
  }

  // Muerte súbita: el doble de duros por cada minuto que pase de los seis.
  const escala = () => (modoAguantar || t <= MUERTE_SUBITA ? 1 : 1 + (t - MUERTE_SUBITA) / 60)

  // Cuánto aprieta el reloj, de 0 a 1. Aguantando sube con las oleadas, porque
  // ahí no hay muerte súbita a la que temer.
  const tension = () => {
    if (!enCurso) return 0
    if (modoAguantar) return Math.min(1, (juego.oleada?.() ?? 0) / 14)
    return Math.min(1, t / MUERTE_SUBITA)
  }

  function empaquetarCampo () {
    const c = juego.campo()
    misAlienz = c.zombies.length
    return {
      b: Math.round(c.base),
      z: c.zombies.map(z => [CLAVES_Z.indexOf(z.key), Math.round(z.x * 10), Math.round(z.z * 10)]),
      s: c.soldiers.map(s => [CLAVES_S.indexOf(s.key), s.lane, s.row])
    }
  }

  function alMatar (spec) {
    if (!enCurso) return
    biomasa += biomasaDe(spec)
    pintarBiomasa()
  }

  function pintarBiomasa () { $('duelo-biomasa').textContent = biomasa }

  function mandar (clave) {
    const e = ENVIOS[clave]
    if (!e || biomasa < e.precio || recargas[clave] > 0) return audio.denied?.()
    biomasa -= e.precio
    recargas[clave] = e.recarga
    const lane = carrilElegido >= 0 ? carrilElegido : Math.floor(Math.random() * FIELD.lanes)
    almacen.añadir(`${sala.raiz}/envios/${sala.rival.uid}`, { k: clave, l: lane })
    audio.place?.()
    pintarBiomasa()
    refrescarBandeja()
    // Con la chincheta puesta, la bandeja se queda: mandar uno detrás de otro
    // sin tener que volver a abrirla en cada uno.
    if (!bandejaFija) $('duelo-bandeja').hidden = true
  }

  function recibirEnvio ({ k, l }) {
    if (!ZOMBIES[k] || terminado) return
    const lane = Math.max(0, Math.min(FIELD.lanes - 1, l | 0))
    const el = document.createElement('div')
    el.className = 'duelo-aviso'
    el.style.setProperty('--tinte', hex(ZOMBIES[k].color))
    el.innerHTML = `<b>${ZOMBIES[k].name}</b> por el carril ${lane + 1}<i></i>`
    $('duelo-avisos').appendChild(el)
    avisos.push({ k, l: lane, queda: AVISO, el })
    audio.groan?.(false)
  }

  function pintarBandeja () {
    $('duelo-carriles').innerHTML = ['Azar', 1, 2, 3, 4, 5].map((c, i) =>
      `<button type="button" class="duelo-carril${i === 0 ? ' on' : ''}" data-carril="${i - 1}">${c}</button>`).join('')
    $('duelo-tropas').innerHTML = CLAVES_ENVIO.map(k => {
      const cara = juego.retratoAlien?.(k)
      return `<button type="button" class="duelo-envio" data-clave="${k}" style="--tinte:${hex(ZOMBIES[k].color)}">
        <span class="duelo-envio-cara">${cara ? `<img src="${cara}" alt="">` : '<svg aria-hidden="true"><use href="#i-enemigos"></use></svg>'}</span>
        <b>${ZOMBIES[k].name}</b><small>${ENVIOS[k].precio}</small><i class="duelo-recarga"></i>
      </button>`
    }).join('')
  }

  function refrescarBandeja () {
    for (const b of document.querySelectorAll('.duelo-envio')) {
      const k = b.dataset.clave
      const r = recargas[k] ?? 0
      b.disabled = biomasa < ENVIOS[k].precio || r > 0
      b.querySelector('.duelo-recarga').style.height = `${r / ENVIOS[k].recarga * 100}%`
    }
  }

  // --- miniatura del rival ---------------------------------------------------------------
  const marcaAguante = () => {
    try {
      const m = JSON.parse(localStorage.getItem(MARCA_AGUANTE) ?? 'null')
      if (!m) return 'ninguna todavía'
      if (typeof m === 'number') return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`
      return `oleada ${m.oleada} · ${Math.floor(m.seg / 60)}:${String(Math.floor(m.seg % 60)).padStart(2, '0')}`
    } catch { return 'ninguna todavía' }
  }

  const leerVista = () => { try { return localStorage.getItem(CLAVE_VISTA) || 'grande' } catch { return 'grande' } }
  // Isidro quiso el campo del rival «grande pero que se aparta»: grande de
  // verdad, y encogiendo solo cuando te están entrando enemigos, que es cuando
  // necesitas la pantalla para lo tuyo.
  let vistaPedida = 'grande'
  function aplicarVista (v) {
    vistaPedida = v
    $('duelo-rival').classList.toggle('grande', v === 'grande')
    try { localStorage.setItem(CLAVE_VISTA, v) } catch {}
    // Justo debajo de la barra de arriba, que cambia de alto según el móvil.
    const hud = document.getElementById('hud')?.getBoundingClientRect()
    if (hud) $('duelo-rival').style.top = `${Math.round(hud.bottom + 4)}px`
    camara?.pintar()
  }

  // Se aparta sola mientras hay avisos de bichos entrando, y vuelve al tamaño
  // que hayas elegido en cuanto pasa el apuro.
  let apartada = false
  let misAlienz = 0
  function apartarSiEstorba () {
    // Se aparta en cuanto hay ALGO en tu campo, no solo cuando te manda algo el
    // rival: la ventana grande se come justo la parte de arriba, que es por
    // donde bajan los alienz, y con ella puesta no se ve venir nada. Grande
    // durante la calma, pequeña en cuanto empieza el lío.
    const estorba = (avisos.length > 0 || misAlienz > 0) && vistaPedida === 'grande'
    if (estorba === apartada) return
    apartada = estorba
    $('duelo-rival').classList.toggle('grande', !estorba)
  }

  // --- chat -----------------------------------------------------------------------------
  function pintarChatBloqueado () {
    $('duelo-escribir').disabled = bloqueado
    $('duelo-escribir').placeholder = bloqueado ? 'Tu chat está bloqueado' : `Escribe (máx. ${MAX_MENSAJE})`
    $('duelo-frases').innerHTML = FRASES.map(f => `<button type="button" class="chip duelo-frase">${f}</button>`).join('')
  }

  function enviarMensaje (texto) {
    if (bloqueado || !sala) return
    const limpio = filtrar(texto)
    if (!limpio) return
    const ahora = performance.now() / 1000
    if (ahora - ultimoMensaje < ESPERA_MENSAJE) { $('duelo-escribir').placeholder = 'Espera un momento…'; return }
    ultimoMensaje = ahora
    almacen.añadir(`${sala.raiz}/chat`, { de: yo.uid, alias: yo.alias, t: limpio, en: almacen.marcaDeTiempo() })
  }

  function pintarMensaje (m) {
    if (!m?.t) return
    const mio = m.de === yo.uid
    if (!mio && silenciado) return
    const li = document.createElement('li')
    li.className = mio ? 'mio' : 'suyo'
    li.innerHTML = `<b>${escapar(m.alias ?? '')}</b> ${escapar(filtrar(m.t))}`
    if (!mio) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'duelo-denunciar'
      b.textContent = 'Denunciar'
      b.addEventListener('click', () => denunciar(m, b))
      li.appendChild(b)
      // Aviso discreto de mensaje nuevo si el chat está cerrado.
      if ($('duelo-chat').hidden) $('duelo-chat-boton').classList.add('nuevo')
    }
    const lista = $('duelo-mensajes')
    lista.appendChild(li)
    while (lista.children.length > 30) lista.firstElementChild.remove()
    lista.scrollTop = lista.scrollHeight
  }

  async function denunciar (m, boton) {
    boton.disabled = true
    try {
      await almacen.añadir('denuncias', {
        de: m.de, alias: m.alias ?? '', texto: String(m.t).slice(0, MAX_MENSAJE),
        por: yo.uid, sala: sala?.codigo ?? '', en: almacen.marcaDeTiempo()
      })
      boton.textContent = 'Denunciado'
    } catch (e) {
      console.warn('Sin denuncia:', e)
      boton.textContent = 'Error'
      boton.disabled = false
    }
  }

  // --- final ------------------------------------------------------------------------------
  function perdi () {
    if (!enCurso || terminado) return
    almacen.poner(`${sala.raiz}/fin/${yo.uid}`, true)
    acabar(false, 'cayó')
  }

  async function acabar (gane, motivo) {
    if (terminado) return
    terminado = true
    enCurso = false
    juego.parar()
    for (const a of avisos) a.el.remove()
    avisos = []
    $('duelo-hud').hidden = true
    $('duelo-ausencia').hidden = true
    const rival = sala?.rival
    let puntos = ''
    if (yo.conCuenta) {
      try {
        const antes = yo.puntos
        const d = cambioDePuntos(antes, rival?.puntos ?? PUNTOS_INICIALES, gane)
        yo.puntos = Math.max(0, antes + d)
        await guardarFicha(gane)
        const r = rangoDe(yo.puntos)
        const subio = rangoDe(antes).indice !== r.indice
        puntos = `<div class="duelo-resultado">${insignia(r.indice, 64)}
          <div><b>${r.nombre}</b><small>${yo.puntos} puntos (${d > 0 ? '+' : ''}${d})${subio ? (d > 0 ? ' · ¡Subes de rango!' : ' · Bajas de rango') : ''}</small></div></div>`
      } catch (e) {
        console.warn('Sin puntos:', e)
        puntos = '<p class="ajuste-pie">No se han podido guardar los puntos.</p>'
      }
    } else {
      puntos = contraLaMaquina ? await cerrarMaquina(gane)
        : '<p class="ajuste-pie">Juegas sin cuenta: esta partida no suma puntos ni da cofre. Entra con Google en Ajustes para progresar.</p>'
    }
    const reloj = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    if (modoAguantar) {
      // La marca es la OLEADA, no los minutos: se entiende mejor y no premia
      // esconderse. El tiempo se guarda de acompañamiento.
      const ola = juego.oleada?.() ?? 0
      let previa = null
      try { const g = JSON.parse(localStorage.getItem(MARCA_AGUANTE) ?? 'null'); previa = typeof g === 'number' ? { oleada: 0, seg: g } : g } catch {}
      const esRecord = !previa || ola > previa.oleada || (ola === previa.oleada && t > previa.seg)
      if (esRecord) { try { localStorage.setItem(MARCA_AGUANTE, JSON.stringify({ oleada: ola, seg: Math.round(t) })) } catch {} }
      const m = marcaAguante()
      // La tabla en línea del aguante, que es lo que pidió. Reutiliza la de
      // los tramos con la clave 'aguante': la OLEADA va en el sitio del
      // porcentaje —llegan hasta 80 y el tope es 100— así que no hace falta
      // tocar ni una regla del servidor.
      let tabla = ''
      if (cuenta.usuario) {
        try {
          const { publicarPuntuacion, leerMarcador } = await import('./systems/marcadores.js')
          await publicarPuntuacion(cuenta.usuario, 'aguante', ola, 0)
          const { filas, mio } = await leerMarcador('aguante', cuenta.usuario, 5)
          if (filas.length) {
            tabla = `<ol class="marcador-lista duelo-aguante-tabla">` +
              filas.map(f => `<li class="${f.uid === cuenta.usuario.uid ? 'marcador-yo' : ''}">
                <span class="marcador-puesto">${f.puesto}</span>
                <span class="marcador-alias">${escapar(f.alias ?? '')}</span>
                <span class="marcador-marca">oleada ${f.porcentaje}</span></li>`).join('') +
              (mio && !filas.some(f => f.uid === mio.uid)
                ? `<li class="marcador-yo"><span class="marcador-puesto">${mio.puesto}</span>
                   <span class="marcador-alias">${escapar(mio.alias ?? '')}</span>
                   <span class="marcador-marca">oleada ${mio.porcentaje}</span></li>`
                : '') + '</ol>'
          }
        } catch (e) { console.warn('Sin tabla de aguante:', e) }
      }
      juego.final(false, `
        <h1 class="lost">SE ACABÓ</h1>
        <p class="tagline">Llegaste a la <b>oleada ${ola}</b> y aguantaste ${reloj}.${esRecord ? ' Es tu mejor marca.' : ` Tu mejor marca: ${m}.`}</p>
        ${tabla}
        <p class="ajuste-pie">Aguantar en la arena no suma puntos de rango: es para practicar.${cuenta.usuario ? '' : ' Entra con tu cuenta para salir en la tabla.'}</p>`, false)
      const raizA = sala?.raiz
      salirDeSala()
      void raizA
      return
    }
    // Un ultimo plano de su campo, congelado: el remate de la camara.
    const plano = camara?.foto()
    const foto = plano ? `<figure class="duelo-plano"><img src="${plano}" alt=""><figcaption>Último plano · ${escapar(rival?.alias ?? 'rival')}</figcaption></figure>` : ''
    const texto = gane
      ? (motivo === 'abandono' ? `${escapar(rival?.alias ?? 'El rival')} abandonó la partida.` : `Aguantaste más que ${escapar(rival?.alias ?? 'tu rival')}.`)
      : `${escapar(rival?.alias ?? 'Tu rival')} aguantó más que tú.`
    juego.final(gane, `
      <h1 class="${gane ? 'won' : 'lost'}">${gane ? 'VICTORIA' : 'DERROTA'}</h1>
      <p class="tagline">${texto} Duelo de ${reloj}.</p>
      ${foto}
      ${puntos}`, gane && yo.conCuenta)
    // La sala ya no pinta nada: se deja de escuchar y se borra lo propio.
    const raiz = sala?.raiz
    salirDeSala()
    if (raiz && almacen) setTimeout(() => almacen.quitar(`${raiz}/campo/${yo.uid}`)?.catch?.(() => {}), 3000)
  }

  // Contra la máquina no hay rango —sería regalárselo— pero sí marcador propio
  // y unos billetes, que Isidro pidió «poquitos»: 40 por victoria, cuando una
  // misión da entre 33 y 230. Sirve para algo sin ser el atajo para hacerse rico.
  const PREMIO_MAQUINA = 40
  async function cerrarMaquina (gane) {
    const { apuntarMaquina } = await import('./systems/bot.js')
    const m = apuntarMaquina(gane)
    let premio = ''
    if (gane) {
      const { sumarBilletes } = await import('./systems/cartera.js')
      sumarBilletes(PREMIO_MAQUINA)
      premio = ` Te llevas <b>${PREMIO_MAQUINA} billetes</b>.`
    }
    return `<p class="ajuste-pie">Entrenamiento: no suma puntos de rango.${premio}<br>
      Victorias seguidas: <b>${m.racha}</b> · mejor racha: <b>${m.mejorRacha}</b> · ganadas: ${m.ganadas}.<br>
      ${gane ? 'La máquina sube de nivel para la próxima.' : 'La máquina baja un punto: te lo pondrá más fácil.'}</p>`
  }

  async function guardarFicha (gane) {
    const { cargarFirebase } = await import('./systems/cuenta.js')
    const { fs, db } = await cargarFirebase()
    const ref = fs.doc(db, 'duelo', cuenta.usuario.uid)
    const antes = (await fs.getDoc(ref)).data() ?? {}
    await fs.setDoc(ref, {
      alias: yo.alias,
      puntos: yo.puntos,
      ganadas: (antes.ganadas ?? 0) + (gane ? 1 : 0),
      perdidas: (antes.perdidas ?? 0) + (gane ? 0 : 1),
      fecha: fs.serverTimestamp()
    })
  }

  // Abandonar desde la pausa cuenta como perder: si no, bastaría con salir
  // cuando va mal.
  function abandonar () { if (enCurso) perdi() }

  // --- botones ------------------------------------------------------------------------------
  const pulsar = (id, fn) => $(id)?.addEventListener('click', e => {
    audio.unlock?.()
    Promise.resolve(fn(e)).catch(err => { console.warn(err); aviso('Algo ha fallado. Inténtalo otra vez.') })
  })
  pulsar('duelo-rapida', partidaRapida)
  pulsar('duelo-maquina', contraMaquina)
  pulsar('duelo-aguantar', aguantar)
  pulsar('duelo-crear', crearSala)
  pulsar('duelo-unirse', () => unirse($('duelo-codigo-campo').value.trim().toUpperCase()))
  pulsar('duelo-cancelar', cancelarBusqueda)
  pulsar('duelo-rival', () => aplicarVista($('duelo-rival').classList.contains('grande') ? 'mini' : 'grande'))
  pulsar('duelo-atacar', () => {
    const abrir = $('duelo-bandeja').hidden
    $('duelo-bandeja').hidden = !abrir
    $('duelo-chat').hidden = true
    if (abrir) refrescarBandeja()
  })
  pulsar('duelo-fijar', e => {
    e.stopPropagation()
    bandejaFija = !bandejaFija
    $('duelo-fijar').setAttribute('aria-pressed', String(bandejaFija))
    try { localStorage.setItem(CLAVE_FIJA, bandejaFija ? '1' : '') } catch {}
  })
  pulsar('duelo-chat-boton', () => {
    $('duelo-chat').hidden = !$('duelo-chat').hidden
    $('duelo-bandeja').hidden = true
    $('duelo-chat-boton').classList.remove('nuevo')
  })
  $('duelo-carriles')?.addEventListener('click', e => {
    const b = e.target.closest('.duelo-carril')
    if (!b) return
    carrilElegido = Number(b.dataset.carril)
    for (const x of document.querySelectorAll('.duelo-carril')) x.classList.toggle('on', x === b)
  })
  $('duelo-tropas')?.addEventListener('click', e => {
    const b = e.target.closest('.duelo-envio')
    if (b) mandar(b.dataset.clave)
  })
  $('duelo-frases')?.addEventListener('click', e => {
    const b = e.target.closest('.duelo-frase')
    if (b) enviarMensaje(b.textContent)
  })
  $('duelo-escribir-form')?.addEventListener('submit', e => {
    e.preventDefault()
    enviarMensaje($('duelo-escribir').value)
    $('duelo-escribir').value = ''
  })
  pulsar('duelo-silenciar', () => {
    silenciado = !silenciado
    $('duelo-silenciar').textContent = silenciado ? 'Quitar silencio' : 'Silenciar rival'
    if (silenciado) for (const li of document.querySelectorAll('#duelo-mensajes .suyo')) li.remove()
  })

  return {
    abrir,
    cerrar () { if (buscando) cancelarBusqueda(); else if (!enCurso) salirDeSala(); $('duelo-capa').classList.add('hidden') },
    tic,
    alMatar,
    perdi,
    abandonar,
    escala,
    tension,
    get enCurso () { return enCurso }
  }
}

// --- bandeja de denuncias ---------------------------------------------------------------------
//
// Solo la ve quien esté en `admins/{uid}` de la Realtime Database, y eso solo
// se puede apuntar desde la consola de Firebase: el juego no tiene forma de
// hacer administrador a nadie.
export async function montarBandeja ({ cuenta, escapar }) {
  const caja = $('denuncias-bloque')
  if (!caja) return
  caja.hidden = true
  if (!cuenta.usuario) return
  const { almacenNube } = await import('./systems/almacen.js')
  const { cargarFirebase } = await import('./systems/cuenta.js')
  await cargarFirebase()
  const almacen = await almacenNube(cuenta.usuario)
  const soy = await almacen.leer(`admins/${cuenta.usuario.uid}`).catch(() => null)
  if (!soy) return
  caja.hidden = false
  import('./admin.js').then(m => m.montarUsuarios({
    almacen, escapar, total: n => { $('usuarios-n').textContent = `(${n})` }
  })).catch(e => console.warn('Sin usuarios:', e))
  const lista = $('denuncias-lista')
  almacen.alCambiar('denuncias', todas => {
    const filas = Object.entries(todas ?? {}).sort((a, b) => (b[1].en ?? 0) - (a[1].en ?? 0))
    $('denuncias-cuenta').textContent = filas.length ? `(${filas.length})` : ''
    lista.innerHTML = filas.length
      ? filas.map(([id, d]) => `
        <li data-id="${id}" data-de="${escapar(d.de ?? '')}" data-alias="${escapar(d.alias ?? '')}">
          <p><b>${escapar(d.alias ?? '¿?')}</b> escribió: «${escapar(d.texto ?? '')}»</p>
          <small>${d.en ? new Date(d.en).toLocaleString('es-ES') : ''} · sala ${escapar(d.sala ?? '')}</small>
          <div class="denuncia-botones">
            <button type="button" class="chip" data-accion="bloquear">Bloquear su chat</button>
            <button type="button" class="chip chip-ghost" data-accion="descartar">Descartar</button>
          </div>
        </li>`).join('')
      : '<li class="marcador-vacio">No hay denuncias pendientes.</li>'
  })
  lista.onclick = async e => {
    const b = e.target.closest('button[data-accion]')
    if (!b) return
    const li = b.closest('li')
    b.disabled = true
    if (b.dataset.accion === 'bloquear') {
      await almacen.poner(`bloqueados/${li.dataset.de}`, { alias: li.dataset.alias, en: almacen.marcaDeTiempo() })
    }
    await almacen.quitar(`denuncias/${li.dataset.id}`)
  }
}
