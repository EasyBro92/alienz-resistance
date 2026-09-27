// Busca, mapa a mapa, DÓNDE plantar la base alien para que no la tape nada.
//
// Isidro, 27/09/2026: «gran parte de las veces la torre que se destruye al final
// de la partida queda oculta por algún edificio, recolócala en todos los mapas».
// Y era verdad: medido, la base estaba tapada del todo en 22 de los 41 sitios.
// Estaba en z = -108 y cada lugar se cierra en z = -95: quedaba DETRÁS del
// decorado, y encima caía entre los píxeles 47 y 109 de los 812 de la pantalla,
// justo debajo del marcador de oleada.
//
// Por qué se ejecuta en el navegador y no con node: hace falta la cámara de
// verdad (su distancia depende del aspecto de la pantalla), el decorado ya
// fundido y el monumento ya recolocado. Nada de eso existe fuera de la página.
//
//   fetch('/herramientas/navegador/donde-la-base.js').then(r => r.text()).then(eval)
//   await __dondeLaBase([0, 1, 2])          // o los 41, uno por llamada
//
// CÓMO MIDE: con la tarjeta gráfica, no con rayos. La primera versión lanzaba
// 1.263 rayos por mapa contra el decorado fundido: veinte segundos por mapa, media
// hora los cuarenta y uno. Esta dibuja la escena en una textura de 188×406 y
// COMPARA IMÁGENES:
//
//   · una vez por mapa, la escena sin la base            (B)
//   · una vez por mapa, la pantalla vacía                (D)
//   · por cada sitio que se prueba, la escena con la base pintada de magenta
//     (el cuerpo) y cian (el remate: antena, plato y orbe)           (A)
//   · y la base sola en la pantalla vacía                            (C)
//
// Los píxeles de la base son los que CAMBIAN entre A y B; los que tendría si no
// hubiera nada delante, los que cambian entre C y D. Comparar en vez de buscar un
// color concreto importa: buscando magenta, los neones de Times Square contaban
// como base y ese mapa daba un 135 % de visibilidad.
//
// Se mide el remate aparte del cuerpo porque lo que hace que la torre se LEA es su
// antena con el orbe verde. Si el monumento le tapa la falda pero se ve el remate
// entero, la torre se ve; al contrario, no.
window.__dondeLaBase = async function (indices, opciones = {}) {
  const z = window.__zr, THREE = z.THREE, scene = z.scene, cam = z.camera, renderer = z.world.renderer
  const espera = ms => new Promise(r => setTimeout(r, ms))
  const vis = o => { let x = o; while (x) { if (!x.visible) return false; x = x.parent } return true }

  // La base tal como estaba: escala 0,36 a 130 de la cámara. Isidro quiere que al
  // acercarla se vea «un punto más grande, no el doble»: 1,25 veces.
  const ESCALA = 0.36, DIST = 130, CRECE = 1.25
  // El marcador de oleada y la barra de base llegan al píxel 145 de 812. La
  // interfaz no se toca (decisión suya): se busca que la base caiga por debajo.
  const HUD = opciones.hud ?? 145
  const ALTO_PX = 812, ANCHO_PX = 375
  // Dónde se prueba. La nave de los bichos se posa en z = -54,5 y se queda once
  // segundos, así que de primeras se busca por detrás de ella.
  const ZZ = opciones.zz ?? [-62, -68, -74, -80, -86, -92, -98]
  const XX = opciones.xx ?? [0, -4, 4, -8, 8, -12, 12, -16, 16, -20, 20]
  // Y si con eso no hay sitio limpio —pasa donde el monumento cierra la calle de
  // lado a lado, como el anfiteatro de Tarragona—, se prueba DELANTE de él,
  // apartándose del eje para no comerse la nave.
  const ZZ2 = opciones.zz2 ?? [-58, -54]
  const X_NAVE = 8
  const REMATE = opciones.remate ?? 0.97
  const CUERPO = opciones.limpio ?? 0.85

  const W = 188, H = 406
  const destino = new THREE.WebGLRenderTarget(W, H)
  const imgA = new Uint8Array(W * H * 4)
  const imgB = new Uint8Array(W * H * 4)
  const imgC = new Uint8Array(W * H * 4)
  const imgD = new Uint8Array(W * H * 4)
  const magenta = new THREE.MeshBasicMaterial({ color: 0xff00ff, fog: false })
  const cian = new THREE.MeshBasicMaterial({ color: 0x00ffff, fog: false })

  const pinta = pixeles => {
    renderer.setRenderTarget(destino)
    renderer.render(scene, cam)
    renderer.readRenderTargetPixels(destino, 0, 0, W, H, pixeles)
    renderer.setRenderTarget(null)
  }
  // Los píxeles que cambian entre dos imágenes, repartidos por color y por altura
  // de pantalla.
  const compara = (con, sin) => {
    let cuerpo = 0, remate = 0, bajo = 0, fila0 = ALTO_PX, fila1 = -1
    for (let f = 0; f < H; f++) {
      for (let c = 0; c < W; c++) {
        const k = (f * W + c) * 4
        if (Math.abs(con[k] - sin[k]) < 12 && Math.abs(con[k + 1] - sin[k + 1]) < 12 &&
            Math.abs(con[k + 2] - sin[k + 2]) < 12) continue
        // Que haya cambiado no basta: también cambia el suelo donde cae la SOMBRA
        // de la base, y un píxel de césped en sombra se contaba como remate porque
        // tiene más verde que rojo. Se exige además que el píxel sea del color con
        // el que se ha pintado la base.
        const r2 = con[k], g2 = con[k + 1], b2 = con[k + 2]
        if (r2 > 170 && g2 < 90 && b2 > 170) cuerpo++
        else if (r2 < 90 && g2 > 170 && b2 > 170) remate++
        else continue
        // La textura se lee de abajo arriba: la fila 0 es el pie de la pantalla.
        const py = (1 - f / H) * ALTO_PX
        if (py > HUD) bajo++
        fila0 = Math.min(fila0, py); fila1 = Math.max(fila1, py)
      }
    }
    return { cuerpo, remate, todo: cuerpo + remate, bajo, px: [Math.round(fila0), Math.round(fila1)] }
  }

  const filas = []
  for (const i of indices) {
    z.start(i)
    // OJO: no basta con llamar a `sinVuelo` una vez. El plano de llegada no
    // empieza en el mismo milisegundo en todos los mapas —el primero tarda más
    // porque está cargando— y si se corta ANTES de que empiece, arranca después y
    // la medición se hace con la cámara a cien metros de altura. Medido: en
    // Tarragona salían las cuarenta y tres posiciones como «no cabe en pantalla».
    // Se insiste hasta que la cámara está donde se juega.
    for (let intento = 0; intento < 12; intento++) {
      await espera(300)
      if (z.sinVuelo) z.sinVuelo()
      if (cam.position.y < 20) break
    }
    await espera(200)
    const base = scene.children.find(o => o.userData && o.userData.arruinar && vis(o))
    if (!base) { filas.push({ i, error: 'sin base' }); continue }

    // La base de dos colores, sin el haz de luz (que es humo y no cuenta).
    const suyas = [], guardadas = [], apagadas = []
    base.updateMatrixWorld(true)
    const caja = new THREE.Box3()
    base.traverse(o => { if (o.isMesh && !(o.material && o.material.transparent)) caja.expandByObject(o) })
    const corte = caja.min.y + (caja.max.y - caja.min.y) * 0.45
    base.traverse(o => {
      if (!o.isMesh) return
      if (o.material && o.material.transparent) { apagadas.push([o, o.visible]); o.visible = false; return }
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())
      suyas.push(o); guardadas.push(o.material); o.material = c.y > corte ? cian : magenta
    })
    const naveVisible = z.dropship.group.visible
    z.dropship.group.visible = false
    const zViejo = base.position.z, xViejo = base.position.x, escViejo = base.scale.x

    // B: la escena sin la base. D: la pantalla vacía.
    base.visible = false
    pinta(imgB)
    const antes = scene.children.map(o => o.visible)
    for (const o of scene.children) o.visible = false
    pinta(imgD)
    scene.children.forEach((o, k) => { o.visible = antes[k] })
    base.visible = true

    // El monumento, para no ponerse delante y borrarlo.
    const foco = z.world.focoMonumento ? z.world.focoMonumento() : null
    const zMon = foco && !foco.isEmpty() ? foco.max.z : null

    let mejor = null, mejorFlojo = null
    const probadas = []
    for (let zc of [...ZZ, ...ZZ2]) {
      // Segunda vuelta solo si la primera no ha encontrado nada limpio.
      if (ZZ2.includes(zc) && mejor) continue
      for (let xc of XX) {
        if (ZZ2.includes(zc) && Math.abs(xc) < X_NAVE) continue
        const medirAqui = xc === 'aqui' || zc === 'aqui'
        // 'aqui' = no mover nada: medir la base donde la haya puesto el juego.
        if (xc === 'aqui') xc = base.position.x
        if (zc === 'aqui') zc = base.position.z
        const d = Math.hypot(cam.position.x - xc, cam.position.y, cam.position.z - zc)
        const esc = zc === base.position.z && xc === base.position.x ? base.scale.x : ESCALA * (d / DIST) * CRECE
        const r = 17 * esc, alto = 16.6 * esc
        // ¿Cabe entera en la pantalla? Sin esta comprobación la herramienta
        // «ganaba» poniéndola medio fuera del encuadre: solo asomaba una esquina,
        // y como también asomaba una esquina al dibujarla sola, salía al 100 %.
        let dentro = true
        for (const xx of [xc - r, xc + r]) {
          for (const yy of [0.05, alto]) {
            const q = new THREE.Vector3(xx, yy, zc + r).project(cam)
            const sx = (q.x * 0.5 + 0.5) * ANCHO_PX, sy = (1 - (q.y * 0.5 + 0.5)) * ALTO_PX
            if (q.z > 1 || sx < 6 || sx > ANCHO_PX - 6 || sy < 6 || sy > ALTO_PX - 6) dentro = false
          }
        }
        if (!dentro) { probadas.push([xc, zc, -1]); continue }

        // ¿Hay sitio en el suelo? Ocho rayos hacia abajo sobre su huella.
        if (!medirAqui) {
          const ray = new THREE.Raycaster()
          const abajo = new THREE.Vector3(0, -1, 0)
          let estorbos = 0
          for (let k = 0; k < 8; k++) {
            const a2 = (k / 8) * Math.PI * 2
            ray.set(new THREE.Vector3(xc + Math.cos(a2) * r * 0.7, 70, zc + Math.sin(a2) * r * 0.7), abajo)
            for (const h of ray.intersectObjects(scene.children, true)) {
              if (!h.object.isMesh || !h.object.material || h.object.material.transparent) continue
              let o = h.object, oculto = false
              while (o) { if (!o.visible) { oculto = true; break } o = o.parent }
              if (oculto) continue
              if (70 - h.distance > 1.5) estorbos++
              break
            }
          }
          // Dos de ocho es un poste o un árbol: se le puede plantar al lado. Más
          // es un edificio.
          if (estorbos > 2) { probadas.push([xc, zc, -2]); continue }
        }
        base.position.set(xc, base.position.y, zc)
        base.scale.setScalar(esc)
        base.updateMatrixWorld(true)
        pinta(imgA)
        const con = compara(imgA, imgB)
        if (con.todo < 200) { probadas.push([xc, zc, 0]); continue }
        // La misma base, sola, para saber cuánto tendría que verse.
        const antes2 = scene.children.map(o => o.visible)
        for (const o of scene.children) if (o !== base) o.visible = false
        pinta(imgC)
        scene.children.forEach((o, k) => { o.visible = antes2[k] })
        const sola = compara(imgC, imgD)
        const cuerpo = sola.cuerpo ? con.cuerpo / sola.cuerpo : 0
        const remate = sola.remate ? con.remate / sola.remate : 0
        probadas.push([xc, zc, +cuerpo.toFixed(2), +remate.toFixed(2)])
        const notaFloja = cuerpo + remate * 2
        if (!mejorFlojo || notaFloja > mejorFlojo.notaFloja) {
          mejorFlojo = { x: xc, z: zc, esc: +esc.toFixed(3), cuerpo: +cuerpo.toFixed(2), remate: +remate.toFixed(2), notaFloja, px: con.px, flojo: true }
        }
        if (!medirAqui && (remate < REMATE || cuerpo < CUERPO)) continue
        const bajoHud = con.todo ? con.bajo / con.todo : 0
        const delante = zMon !== null && zc > zMon
        const nota = 3 * bajoHud + 2 * cuerpo + (-zc) / 40 - Math.abs(xc) / 30 - (delante ? 0.6 : 0)
        if (!mejor || nota > mejor.nota) {
          mejor = { x: xc, z: zc, esc: +esc.toFixed(3), nota: +nota.toFixed(2), cuerpo: +cuerpo.toFixed(2), remate: +remate.toFixed(2), bajoHud: +bajoHud.toFixed(2), px: con.px, delante }
        }
      }
    }

    // Todo como estaba.
    base.position.set(xViejo, base.position.y, zViejo)
    base.scale.setScalar(escViejo)
    suyas.forEach((o, k) => { o.material = guardadas[k] })
    for (const [o, v] of apagadas) o.visible = v
    z.dropship.group.visible = naveVisible

    filas.push({ i, mejor: mejor ?? mejorFlojo, zMon: zMon === null ? null : Math.round(zMon), probadas: opciones.detalle ? probadas : undefined })
  }
  destino.dispose()
  return filas
}
// Y la comprobación: cuánto se ve la base DONDE LA PONE EL JUEGO. Misma cuenta,
// sin buscar nada. Es lo que hay que mirar después de tocar un mapa.
//
//   await __baseALaVista([0, 1, 2])
window.__baseALaVista = async function (indices) {
  const fuera = []
  for (const i of indices) {
    const z = window.__zr
    const r = await window.__dondeLaBase([i], { zz: ['aqui'], zz2: [], xx: ['aqui'], limpio: 0, remate: 0 })
    fuera.push(r[0])
    void z
  }
  return fuera
}
'donde-la-base listo'
