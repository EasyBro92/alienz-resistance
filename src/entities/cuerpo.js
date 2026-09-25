import * as THREE from 'three'

// El cuerpo de las figuras de Meshy.
//
// Antes se movían sumando giros sueltos a cada hueso sobre la pose A del
// montador: el arma apuntaba adonde caía la mano y las piernas iban como
// tijeras. Ahora se anima por capas, todo por código (sin animaciones de pago):
//   1. Postura de base: de pie, agachado, rodilla en tierra o cuerpo a tierra.
//      Se mezclan con suavidad, así que se ve arrodillarse y tumbarse.
//   2. Piernas: el ciclo de andar que trae el modelo al correr; a gatas, un
//      ciclo propio; y en cualquier postura los pies vuelven al suelo por
//      cinemática inversa, que es lo que permite agacharse sin hundirse.
//   3. El arma se coloca en la figura según el estilo de cada uno (al hombro,
//      desde la cadera, a la cintura) y las manos van a ella.
//
// Posturas decididas con Isidro:
//   - tirador: de rodilla mientras espera, cuerpo a tierra al empezar a
//     disparar, a gatas al cambiar de casilla y de pie para el asalto final;
//   - fusilero: de pie, al hombro; escopetero: desde la cadera;
//   - lanzallamas: de pie, bien plantado y echado hacia delante;
//   - para moverse: agachados a la casilla de al lado, corriendo si es lejos o
//     si entran desde atrás.
//
// Se escribe en huesos por espacio de mundo, sin suponer hacia dónde apuntan
// sus ejes locales: el montador de Meshy no es simétrico y adivinar signos fue
// justo lo que dejó a los soldados en cruz la primera vez.

// Dónde se agarra cada arma, en el sistema del arma (cañón hacia -Z): la mano
// en la empuñadura, la de apoyo, la distancia a la culata y la escala.
//
// Medido sobre el esqueleto: estas figuras tienen el brazo cortísimo, 0,48 de
// hombro a muñeca para 1,7 de alto. Con el arma a su tamaño, la mano de apoyo
// no llega al guardamanos desde ninguna postura, así que en estas figuras el
// arma va a tamaño de carabina y la mano de apoyo agarra el brocal del cargador.
const AGARRES = {
  rifle: { mano: [0, -0.11, 0.15], apoyo: [0, -0.12, -0.09], culata: 0.45, escala: 0.65 },
  shotgun: { mano: [0, -0.11, 0.13], apoyo: [0, -0.07, -0.05], culata: 0.47, escala: 0.65 },
  sniper: { mano: [0, -0.11, 0.18], apoyo: [0, -0.08, 0.05], culata: 0.62, escala: 0.6 },
  flamer: { mano: [0, -0.11, 0.12], apoyo: [0, -0.05, -0.1], culata: 0.3, escala: 0.7 },
  // El arco va justo al revés que un fusil, y aquí `mano` es la DERECHA y
  // `apoyo` la IZQUIERDA. En el arco la derecha tira de la cuerda hasta la
  // mejilla (el culatín, en z = +0,26 del arma) y la izquierda es la que
  // sujeta, con el brazo estirado, la empuñadura (z = -0,13). Puestos al revés
  // el arquero abrazaba el arco contra el pecho. Los dos números salen de la
  // geometría del arco en `buildWeapon`.
  archer: { mano: [0, 0.03, 0.26], apoyo: [0, 0, -0.13], culata: 0.3, escala: 0.78 },
  // La ametralladora es larga y pesada: se lleva más baja y con la mano de
  // apoyo bien adelante, en el bípode.
  gunner: { mano: [0, -0.11, 0.16], apoyo: [0, -0.1, -0.16], culata: 0.5, escala: 0.62 },
  // El mortero se sujeta por el tubo con las dos manos, cerca del cuerpo.
  mortar: { mano: [0, -0.1, 0.12], apoyo: [0, -0.02, -0.14], culata: 0.36, escala: 0.6 },
  // El lanzamisiles va al hombro: la mano de apoyo delante, en el asa.
  misil: { mano: [0, -0.1, 0.14], apoyo: [0, -0.06, -0.18], culata: 0.42, escala: 0.62 },
  capitan: { mano: [0, -0.11, 0.15], apoyo: [0, -0.12, -0.09], culata: 0.45, escala: 0.65 }
}
// Cómo dispara cada uno: dónde va la culata respecto al hombro, cuánto se echa
// hacia delante el tronco y cuánto abre las piernas.
const ESTILOS = {
  rifle: { culata: [-0.09, 0.11, -0.05], inclina: 0.06, abre: 0 },
  sniper: { culata: [-0.09, 0.11, -0.05], inclina: 0.06, abre: 0 },
  shotgun: { culata: [-0.1, -0.3, -0.06], inclina: 0.12, abre: 0.1 },
  flamer: { culata: [-0.12, -0.34, -0.05], inclina: 0.24, abre: 0.2 },
  // El arquero tira con el culatín en la mejilla: más alto que un fusil y con
  // los pies un poco abiertos, como se tira de verdad.
  archer: { culata: [-0.07, 0.2, 0], inclina: 0.03, abre: 0.08 },
  gunner: { culata: [-0.11, -0.16, -0.06], inclina: 0.18, abre: 0.16 },
  mortar: { culata: [-0.1, -0.2, -0.04], inclina: 0.14, abre: 0.12 },
  misil: { culata: [-0.13, 0.14, -0.05], inclina: 0.1, abre: 0.12 },
  capitan: { culata: [-0.09, 0.11, -0.05], inclina: 0.06, abre: 0 }
}
const CARGADOR = new THREE.Vector3(0, -0.28, -0.09)
const ARRIBA = new THREE.Vector3(0, 1, 0)
const CERO = new THREE.Vector3()
const EJE_Z = new THREE.Vector3(0, 0, 1)
const IDENTIDAD = new THREE.Quaternion()

// Cuánto baja la cadera agachado y de rodilla, y cuánto se inclina tumbado.
const BAJADA_AGACHADO = 0.2
const BAJADA_RODILLA = 0.46
// Algo menos de horizontal: apoyado en los codos, como tira un francotirador. Del
// todo plano la cabeza y el pecho se hundían en el suelo.
const TUMBADO = 1.35
// Segundos que el tirador sigue tumbado tras perder el objetivo: sin esto se
// levantaba y se tumbaba entre disparo y disparo.
const MEMORIA_TUMBADO = 4

// Temporales compartidos: esto corre por soldado y por fotograma.
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _d = new THREE.Vector3()
const _e = new THREE.Vector3()
const _f = new THREE.Vector3()
const _p = new THREE.Vector3()
const _u = new THREE.Vector3()
const _v = new THREE.Vector3()
const _eje = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _qw = new THREE.Quaternion()
const _qp = new THREE.Quaternion()
const _m = new THREE.Matrix4()

// Cambia la orientación de un hueso EN MUNDO y la devuelve a su espacio local.
function girarEnMundo (hueso, giro) {
  hueso.getWorldQuaternion(_qw).premultiply(giro)
  hueso.parent.getWorldQuaternion(_qp).invert()
  hueso.quaternion.copy(_qp.multiply(_qw))
  hueso.updateMatrixWorld(true)
}

// Gira el hueso para que la dirección desde→hacia pase a ser desde→destino.
function orientar (hueso, desde, hacia, destino) {
  _u.subVectors(hacia, desde)
  _v.subVectors(destino, desde)
  if (_u.lengthSq() < 1e-10 || _v.lengthSq() < 1e-10) return
  _q.setFromUnitVectors(_u.normalize(), _v.normalize())
  girarEnMundo(hueso, _q)
}

// Cinemática inversa de dos huesos: lleva la punta a `objetivo` doblando la
// articulación del medio hacia `polo`. Las longitudes se leen de la pose.
function dosHuesos (brazo, antebrazo, mano, objetivo, polo) {
  brazo.getWorldPosition(_a)
  antebrazo.getWorldPosition(_b)
  mano.getWorldPosition(_c)
  const l1 = _a.distanceTo(_b)
  const l2 = _b.distanceTo(_c)
  _d.subVectors(objetivo, _a)
  let dist = _d.length()
  if (dist < 1e-4) return
  const alcance = (l1 + l2) * 0.999
  dist = Math.min(dist, alcance)
  _d.normalize()
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x))
  _p.subVectors(polo, _a)
  _p.addScaledVector(_d, -_p.dot(_d))
  if (_p.lengthSq() > 1e-8) _p.normalize()
  _e.copy(_a).addScaledVector(_d, x).addScaledVector(_p, h)
  _f.copy(_a).addScaledVector(_d, dist)
  orientar(brazo, _a, _b, _e)
  antebrazo.getWorldPosition(_b)
  mano.getWorldPosition(_c)
  orientar(antebrazo, _b, _c, _f)
}

// Inclina un hueso alrededor del eje lateral de la figura. Positivo = delante.
function inclinar (hueso, figure, angulo) {
  _eje.set(1, 0, 0).transformDirection(figure.matrixWorld)
  _q.setFromAxisAngle(_eje, -angulo)
  girarEnMundo(hueso, _q)
}

// Gira un hueso alrededor del eje vertical de la figura.
function girarVertical (hueso, figure, angulo) {
  _eje.set(0, 1, 0).transformDirection(figure.matrixWorld)
  _q.setFromAxisAngle(_eje, angulo)
  girarEnMundo(hueso, _q)
}

// Orienta un hueso para que su "delante" mire hacia `deseado`, solo en parte.
function mirarHacia (hueso, adelanteLocal, deseado, cuanto) {
  hueso.getWorldQuaternion(_qw)
  _u.copy(adelanteLocal).applyQuaternion(_qw)
  _q.setFromUnitVectors(_u.normalize(), deseado)
  _q.slerp(IDENTIDAD, 1 - cuanto)
  girarEnMundo(hueso, _q)
}

// Estira un giro del ciclo de andar: un poco más de zancada al correr. Solo en
// el muslo y poco: estirar también la rodilla dejaba los pies de gelatina.
function amplificar (hueso, reposo, k) {
  _q.copy(reposo).invert().multiply(hueso.quaternion)
  if (_q.w < 0) _q.set(-_q.x, -_q.y, -_q.z, -_q.w)
  const s = Math.sqrt(Math.max(0, 1 - _q.w * _q.w))
  if (s < 1e-4) return
  const angulo = 2 * Math.acos(Math.min(1, _q.w))
  _eje.set(_q.x / s, _q.y / s, _q.z / s)
  _q.setFromAxisAngle(_eje, angulo * k)
  hueso.quaternion.copy(reposo).multiply(_q)
}

// --- figuras de piezas ------------------------------------------------------------
// Arquero, ametrallador, mortero (y cualquier soldado cuyo modelo no cargue) no
// tienen esqueleto, pero sí brazos de dos tramos: aquí se llevan las manos al
// arma que mueve el bucle de siempre.
const AGARRES_PIEZAS = {
  rifle: { mano: [0, -0.11, 0.13], apoyo: [0, -0.03, -0.36] },
  shotgun: { mano: [0, -0.11, 0.11], apoyo: [0, -0.05, -0.3] },
  sniper: { mano: [0, -0.11, 0.16], apoyo: [0, -0.04, -0.3] },
  // La ametralladora es más larga que el brazo: se dispara desde la cadera
  // cogida del asa de transporte, que es como se lleva de verdad.
  gunner: { mano: [0, -0.11, 0.2], apoyo: [0, 0.09, 0.02] },
  flamer: { mano: [0, -0.11, 0.1], apoyo: [0, -0.03, -0.34] },
  archer: { mano: [0, 0.02, 0.1], apoyo: [0, 0, -0.1] },
  mortar: { mano: [0.04, 0.2, -0.16], apoyo: [-0.05, 0.1, 0.05] }
}
const CARGADOR_PIEZAS = new THREE.Vector3(0, -0.19, -0.09)
const POLO_R = new THREE.Vector3(0.3, -0.45, 0.3)
const POLO_L = new THREE.Vector3(-0.25, -0.5, -0.1)

export function crearManosDePiezas ({ figure, limbs, weapon, key, rest }) {
  if (!limbs?.armL?.userData.lower || !limbs?.armR?.userData.lower || !weapon) return null
  const agarre = AGARRES_PIEZAS[key] ?? AGARRES_PIEZAS.rifle
  const puntoMano = new THREE.Vector3(...agarre.mano)
  const puntoApoyo = new THREE.Vector3(...agarre.apoyo)
  const puntas = {}
  for (const n of ['armL', 'armR']) {
    const p = new THREE.Object3D()
    p.position.set(0, -0.316, -0.03)
    limbs[n].userData.lower.add(p)
    puntas[n] = p
  }
  const objR = new THREE.Vector3()
  const objL = new THREE.Vector3()
  const poloR = new THREE.Vector3()
  const poloL = new THREE.Vector3()
  return {
    actualizar (recarga = 0) {
      for (const n of ['armL', 'armR']) {
        const brazo = limbs[n]
        brazo.rotation.set(brazo.rotation.x, 0, rest?.armRoll?.[n] ?? 0)
        brazo.userData.lower.rotation.set(brazo.userData.lower.rotation.x, 0, 0)
      }
      figure.updateMatrixWorld(true)
      const objetivos = () => {
        weapon.updateMatrixWorld(true)
        weapon.localToWorld(objR.copy(puntoMano))
        weapon.localToWorld(objL.copy(puntoApoyo).lerp(CARGADOR_PIEZAS, recarga))
      }
      objetivos()
      // Si un agarre queda fuera del alcance, el arma se acerca a ese hombro lo
      // que falte. Mejor un arma algo más recogida que una mano en el aire.
      for (let pasada = 0; pasada < 2; pasada++) {
        for (const [n, obj] of [['armR', objR], ['armL', objL]]) {
          const brazo = limbs[n]
          brazo.getWorldPosition(_a)
          brazo.userData.lower.getWorldPosition(_b)
          puntas[n].getWorldPosition(_c)
          const falta = _a.distanceTo(obj) - (_a.distanceTo(_b) + _b.distanceTo(_c)) * 0.97
          if (falta <= 0) continue
          _d.subVectors(_a, obj).normalize().multiplyScalar(falta)
          weapon.getWorldPosition(_e).add(_d)
          weapon.parent.worldToLocal(_e)
          weapon.position.copy(_e)
          objetivos()
        }
      }
      figure.localToWorld(poloR.copy(limbs.armR.position).add(POLO_R))
      figure.localToWorld(poloL.copy(limbs.armL.position).add(POLO_L))
      dosHuesos(limbs.armR, limbs.armR.userData.lower, puntas.armR, objR, poloR)
      dosHuesos(limbs.armL, limbs.armL.userData.lower, puntas.armL, objL, poloL)
    }
  }
}

export function crearCuerpo ({ figure, cuerpo, arma, key, clips = [] }) {
  const hueso = nombre => {
    let h = null
    cuerpo.traverse(o => { if (!h && o.name === nombre) h = o })
    return h
  }
  const b = {
    cadera: hueso('Hips'),
    columna: hueso('Spine01'),
    cabeza: hueso('Head'),
    brazoR: hueso('RightArm'),
    antebrazoR: hueso('RightForeArm'),
    manoR: hueso('RightHand'),
    brazoL: hueso('LeftArm'),
    antebrazoL: hueso('LeftForeArm'),
    manoL: hueso('LeftHand'),
    musloL: hueso('LeftUpLeg'),
    rodillaL: hueso('LeftLeg'),
    pieL: hueso('LeftFoot'),
    musloR: hueso('RightUpLeg'),
    rodillaR: hueso('RightLeg'),
    pieR: hueso('RightFoot')
  }
  if (!b.brazoR || !b.antebrazoR || !b.manoR || !b.brazoL || !b.antebrazoL || !b.manoL) return null
  const conPiernas = !!(b.musloL && b.rodillaL && b.pieL && b.musloR && b.rodillaR && b.pieR)

  const agarre = AGARRES[key] ?? AGARRES.rifle
  const estilo = ESTILOS[key] ?? ESTILOS.rifle
  const puntoMano = new THREE.Vector3(...agarre.mano)
  const puntoApoyo = new THREE.Vector3(...agarre.apoyo)
  const culataEstilo = new THREE.Vector3(...estilo.culata)
  // Tumbado todos llevan el arma al hombro, sea cual sea su estilo de pie.
  const culataHombro = new THREE.Vector3(...ESTILOS.rifle.culata)
  arma.scale.setScalar(agarre.escala)
  const esTirador = key === 'sniper'

  cuerpo.updateMatrixWorld(true)
  const reposo = new Map()
  cuerpo.traverse(o => { if (o.isBone) reposo.set(o, { q: o.quaternion.clone(), p: o.position.clone() }) })
  // Los huesos que se giran cada fotograma. Vuelven a su reposo al empezar cada
  // uno: la inclinación del tronco y la mirada giran SOBRE lo que tenga el hueso.
  const tocados = [b.columna, b.cabeza, b.brazoR, b.antebrazoR, b.manoR, b.brazoL, b.antebrazoL, b.manoL, b.musloL, b.rodillaL, b.pieL, b.musloR, b.rodillaR, b.pieR]
    .filter(h => h && reposo.has(h))
  const basePos = cuerpo.position.clone()
  const baseRot = cuerpo.rotation.clone()

  // Medidas de la pose de reposo, en el espacio de la figura: la altura de la
  // cadera (sobre la que se tumba) y dónde pisa cada pie.
  const alturaCadera = b.cadera ? figure.worldToLocal(b.cadera.getWorldPosition(new THREE.Vector3())).y : 0.85
  const pieL0 = conPiernas ? figure.worldToLocal(b.pieL.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3()
  const pieR0 = conPiernas ? figure.worldToLocal(b.pieR.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3()

  const adelanteCabeza = new THREE.Vector3(0, 0, -1)
  if (b.cabeza) adelanteCabeza.applyQuaternion(b.cabeza.getWorldQuaternion(new THREE.Quaternion()).invert())

  // --- ciclo de andar ------------------------------------------------------------
  const clip = clips.find(c => /walk/i.test(c.name)) ?? clips[0] ?? null
  const mixer = clip ? new THREE.AnimationMixer(cuerpo) : null
  const accion = clip ? mixer.clipAction(clip) : null
  // A qué velocidad avanza el ciclo tal cual, medido sobre el propio pie: con eso
  // el ritmo sale de la velocidad de verdad y los pies no patinan.
  let pasoNatural = 1.2
  if (accion) {
    accion.play()
    accion.setEffectiveWeight(1)
    if (b.pieL && b.cadera) {
      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < 24; i++) {
        mixer.setTime((i / 24) * clip.duration)
        cuerpo.updateMatrixWorld(true)
        const dz = b.pieL.getWorldPosition(_a).z - b.cadera.getWorldPosition(_b).z
        min = Math.min(min, dz)
        max = Math.max(max, dz)
      }
      if (max - min > 0.05) pasoNatural = (max - min) / (clip.duration * 0.5)
    }
    accion.setEffectiveWeight(0)
    mixer.setTime(0)
    // Cada figura empieza su ciclo en un punto distinto: todas desde el primer
    // fotograma daban un pelotón que pisaba con el mismo pie a la vez.
    accion.time = Math.random() * clip.duration
    for (const [o, r] of reposo) {
      o.quaternion.copy(r.q)
      o.position.copy(r.p)
    }
    cuerpo.updateMatrixWorld(true)
  }

  // Mezclas de postura, de 0 a 1.
  let andar = 0
  let agache = 0
  let rodilla = 0
  let tumbado = 0
  let gateo = 0
  let faseGateo = 0
  let memoriaTumbado = 0

  const ultimaDir = new THREE.Vector3(0, -0.05, -1).normalize()
  const culata = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const hombro = new THREE.Vector3()
  const hombroL = new THREE.Vector3()
  const c1 = new THREE.Vector3()
  const d1 = new THREE.Vector3()
  const c2 = new THREE.Vector3()
  const d2 = new THREE.Vector3()
  const c3 = new THREE.Vector3()
  const blanco = new THREE.Vector3()
  const objR = new THREE.Vector3()
  const objL = new THREE.Vector3()
  const poloR = new THREE.Vector3()
  const poloL = new THREE.Vector3()
  const deseo = new THREE.Vector3()
  const dirMundo = new THREE.Vector3()
  const pieActual = new THREE.Vector3()
  const sitioPie = new THREE.Vector3()
  const poloPie = new THREE.Vector3()
  const mundoPie = new THREE.Vector3()
  const mundoPolo = new THREE.Vector3()

  const acercar = (v, obj, vel, dt) => v + THREE.MathUtils.clamp(obj - v, -dt * vel, dt * vel)

  return {
    // e: { andando, velocidad, modo ('correr' | 'agachado' | 'gatear'),
    //      apuntar (0-1), objetivo (mundo o null), retroceso, recarga,
    //      encogido, mirar, t, forzarPie }
    actualizar (dt, e) {
      // --- 1. postura ---------------------------------------------------------------
      const moviendose = !!e.andando
      const modo = moviendose ? (e.modo ?? 'correr') : null
      if (e.objetivo) memoriaTumbado = MEMORIA_TUMBADO
      else memoriaTumbado = Math.max(0, memoriaTumbado - dt)
      let quiereAgache = 0
      let quiereRodilla = 0
      let quiereTumbado = 0
      if (moviendose) {
        if (modo === 'agachado') quiereAgache = 1
        if (modo === 'gatear') quiereTumbado = 1
      } else if (esTirador && !e.forzarPie) {
        if (memoriaTumbado > 0) quiereTumbado = 1
        else quiereRodilla = 1
      }
      agache = acercar(agache, quiereAgache, 4, dt)
      rodilla = acercar(rodilla, quiereRodilla, 2.5, dt)
      tumbado = acercar(tumbado, quiereTumbado, 1.6, dt)
      gateo = acercar(gateo, modo === 'gatear' ? 1 : 0, 3, dt)
      andar += ((moviendose && modo !== 'gatear' ? 1 : 0) - andar) * Math.min(1, dt * 7)
      const deRodilla = rodilla * (1 - tumbado)
      const agachado = agache * (1 - tumbado)
      const carrera = THREE.MathUtils.clamp((e.velocidad - 3) / 3.4, 0, 1)

      // Aquí estaba el escopetero doblado por la mitad: quieto, sin ciclo de
      // andar que sobrescribiera la columna, la inclinación se sumaba fotograma
      // a fotograma hasta plegarlo. Todo a reposo antes de posar.
      for (const h of tocados) h.quaternion.copy(reposo.get(h).q)

      // --- 2. ciclo de andar (no tumbado) --------------------------------------
      if (accion) {
        const peso = andar * (1 - tumbado)
        const amplitud = 1 + carrera * 0.25
        accion.setEffectiveWeight(peso)
        if (peso > 0.01) {
          accion.timeScale = THREE.MathUtils.clamp(Math.max(e.velocidad, 1.5) / (pasoNatural * amplitud), 0.5, 2.6)
          mixer.update(dt)
          if (amplitud > 1.01) {
            for (const h of [b.musloL, b.musloR]) if (h) amplificar(h, reposo.get(h).q, 1 + (amplitud - 1) * peso)
          }
        } else {
          mixer.update(0)
        }
      }

      // --- 3. el cuerpo entero: bajar la cadera y tumbarse ---------------------
      // Tumbarse es girar la figura hacia delante sobre los pies y correrla para
      // que la cadera quede en su casilla y no a medio metro por delante.
      const apunta = e.apuntar * (1 - andar)
      const angulo = TUMBADO * tumbado
      cuerpo.position.copy(basePos)
      cuerpo.rotation.copy(baseRot)
      cuerpo.position.y -= BAJADA_AGACHADO * agachado + BAJADA_RODILLA * deRodilla
      cuerpo.rotation.x = -angulo
      cuerpo.position.z += alturaCadera * Math.sin(angulo)
      cuerpo.position.y += 0.22 * tumbado
      if (gateo > 0.01) {
        faseGateo += dt * 5
        cuerpo.rotation.z = Math.sin(faseGateo) * 0.08 * gateo
      }
      figure.rotation.y = -0.38 * apunta * (1 - tumbado)
      figure.updateMatrixWorld(true)

      // --- 4. tronco -----------------------------------------------------------------
      if (b.columna) {
        const respira = Math.sin(e.t * 1.3) * 0.015
        const inclina = andar * (0.08 + carrera * 0.22) + agachado * 0.25 + apunta * estilo.inclina + deRodilla * 0.05
        inclinar(b.columna, figure, (inclina + respira - e.encogido * 0.3) * (1 - tumbado * 0.8))
      }

      // --- 5. piernas ---------------------------------------------------------------
      if (conPiernas && tumbado < 0.6) {
        const abre = estilo.abre * apunta
        if (agachado + deRodilla + abre > 0.01) {
          for (const [lado, muslo, rod, pie, pie0] of [[-1, b.musloL, b.rodillaL, b.pieL, pieL0], [1, b.musloR, b.rodillaR, b.pieR, pieR0]]) {
            // Donde pisa ahora el pie (lo que haya dejado el ciclo de andar),
            // devuelto al suelo lo que haya bajado la cadera.
            figure.worldToLocal(pie.getWorldPosition(pieActual))
            sitioPie.set(pieActual.x, Math.max(pieActual.y + BAJADA_AGACHADO * agachado + BAJADA_RODILLA * deRodilla, pie0.y), pieActual.z)
            // Plantado: pies separados y el izquierdo adelantado.
            sitioPie.x += lado * abre
            if (lado < 0) sitioPie.z -= abre
            // De rodilla: el derecho atrás con la rodilla en el suelo y el
            // izquierdo delante con la rodilla arriba.
            if (deRodilla > 0) {
              if (lado > 0) sitioPie.lerp(_u.set(pie0.x, pie0.y + 0.04, 0.42), deRodilla)
              else sitioPie.lerp(_u.set(pie0.x - 0.02, pie0.y, -0.4), deRodilla)
            }
            if (lado > 0 && deRodilla > 0.3) poloPie.set(pie0.x, -0.3, -1)
            else poloPie.set(pie0.x + lado * 0.1, 0.9, -1.2)
            figure.localToWorld(mundoPie.copy(sitioPie))
            figure.localToWorld(mundoPolo.copy(poloPie))
            dosHuesos(muslo, rod, pie, mundoPie, mundoPolo)
          }
        }
      }
      // A gatas: las piernas se abren y encogen por turnos, como una rana.
      if (conPiernas && gateo > 0.01) {
        const s = Math.sin(faseGateo)
        girarVertical(b.musloL, figure, Math.max(0, s) * 0.7 * gateo)
        girarVertical(b.rodillaL, figure, -Math.max(0, s) * 1.1 * gateo)
        girarVertical(b.musloR, figure, -Math.max(0, -s) * 0.7 * gateo)
        girarVertical(b.rodillaR, figure, Math.max(0, -s) * 1.1 * gateo)
      }

      // --- 6. el arma -------------------------------------------------------------------
      figure.worldToLocal(b.brazoR.getWorldPosition(hombro))
      figure.worldToLocal(b.brazoL.getWorldPosition(hombroL))
      // En reposo: baja y cruzada por delante.
      c1.set(-0.08, -0.15, -0.1).add(hombro)
      d1.set(-0.35, -0.52, -0.78).normalize()
      // Corriendo: cruzada sobre el pecho.
      c2.set(-0.08, -0.14, -0.1).add(hombro)
      d2.set(-0.55, -0.4, -0.72).normalize()
      c1.lerp(c2, andar)
      d1.lerp(d2, andar).normalize()
      // Disparando: según el estilo; tumbado, al hombro.
      c3.copy(culataEstilo).lerp(culataHombro, tumbado).add(hombro)
      if (e.objetivo) {
        blanco.copy(e.objetivo)
        if (blanco.y < 0.6) blanco.y += 1 - tumbado * 0.7
        figure.worldToLocal(blanco)
        ultimaDir.subVectors(blanco, c3).normalize()
        ultimaDir.y = THREE.MathUtils.clamp(ultimaDir.y, -0.3, 0.2)
        ultimaDir.normalize()
      }
      // Tumbado el arma va siempre lista; de pie y de rodilla se baja sin blanco.
      const lista = Math.max(apunta, tumbado)
      culata.copy(c1).lerp(c3, lista)
      dir.copy(d1).lerp(ultimaDir, lista).normalize()

      const golpe = e.retroceso * e.retroceso
      culata.addScaledVector(dir, -golpe * 0.07)
      dir.y += golpe * 0.14
      dir.normalize()
      culata.y += Math.sin(e.t * 1.3) * 0.006 * (1 - lista * 0.6)
      const recarga = Math.sin(e.recarga * Math.PI)
      if (recarga > 0) {
        dir.y -= recarga * 0.5
        dir.normalize()
        culata.y -= recarga * 0.06
      }
      culata.z += e.encogido * 0.06
      // A gatas el arma va arrastrada con la mano derecha, que avanza y retrocede.
      if (gateo > 0.01) culata.z -= Math.sin(faseGateo + Math.PI) * 0.12 * gateo

      _m.lookAt(CERO, dir, ARRIBA)
      arma.quaternion.setFromRotationMatrix(_m)
      if (recarga > 0) arma.quaternion.multiply(_q.setFromAxisAngle(EJE_Z, recarga * 0.6))
      arma.position.copy(culata).addScaledVector(dir, agarre.culata * agarre.escala)
      arma.updateMatrixWorld(true)

      // --- 7. manos ------------------------------------------------------------------
      b.manoR.quaternion.copy(reposo.get(b.manoR).q)
      b.manoL.quaternion.copy(reposo.get(b.manoL).q)
      arma.localToWorld(objR.copy(puntoMano))
      arma.localToWorld(objL.copy(puntoApoyo).lerp(CARGADOR, recarga))
      // Si un agarre queda fuera del alcance del brazo, el arma se acerca a ese
      // hombro lo que falte, una pasada por mano. Con estos brazos tan cortos, desde
      // la cadera la mano de apoyo se quedaba a diez centímetros del arma.
      for (let pasada = 0; pasada < 2; pasada++) {
        for (const [brazo, antebrazo, manoHueso, obj] of [[b.brazoR, b.antebrazoR, b.manoR, objR], [b.brazoL, b.antebrazoL, b.manoL, objL]]) {
          brazo.getWorldPosition(_a)
          antebrazo.getWorldPosition(_b)
          manoHueso.getWorldPosition(_c)
          const falta = _a.distanceTo(obj) - (_a.distanceTo(_b) + _b.distanceTo(_c)) * 0.97
          if (falta <= 0) continue
          _d.subVectors(_a, obj).normalize()
          arma.getWorldPosition(_e).addScaledVector(_d, falta)
          figure.worldToLocal(_e)
          arma.position.copy(_e)
          arma.updateMatrixWorld(true)
          arma.localToWorld(objR.copy(puntoMano))
          arma.localToWorld(objL.copy(puntoApoyo).lerp(CARGADOR, recarga))
        }
      }
      // A gatas la izquierda no sujeta el arma: se apoya en el suelo por delante,
      // a su alcance (antes la ponía medio metro por delante y no llegaba).
      if (gateo > 0.5) figure.localToWorld(objL.set(hombroL.x - 0.05, 0.06, hombroL.z - 0.15 - Math.sin(faseGateo) * 0.12))
      figure.localToWorld(poloR.set(0.4, -0.55, 0.35).add(hombro))
      figure.localToWorld(poloL.set(-0.25, -0.75, 0.05).add(hombroL))
      dosHuesos(b.brazoR, b.antebrazoR, b.manoR, objR, poloR)
      dosHuesos(b.brazoL, b.antebrazoL, b.manoL, objL, poloL)

      // --- 8. cabeza -----------------------------------------------------------------
      if (b.cabeza) {
        deseo.set(0, 0, -1).transformDirection(figure.matrixWorld)
        deseo.applyAxisAngle(ARRIBA, (e.mirar ?? 0) * (1 - lista) * (1 - andar) * 0.8)
        dirMundo.copy(dir).transformDirection(figure.matrixWorld)
        deseo.lerp(dirMundo, lista * 0.9).normalize()
        // Tumbado, la cabeza se levanta para mirar al frente y no al suelo.
        mirarHacia(b.cabeza, adelanteCabeza, deseo, 0.8 + tumbado * 0.15)
      }
    }
  }
}
