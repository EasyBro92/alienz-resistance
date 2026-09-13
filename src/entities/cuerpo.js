import * as THREE from 'three'

// El cuerpo de las figuras de Meshy.
//
// Antes se movían sumando giros sueltos a cada hueso sobre la pose A del
// montador: las piernas con una sinusoide y el fusil colgado de la mano derecha.
// El resultado era un muñeco articulado —el arma apuntaba adonde caía la mano,
// no adonde miraba el soldado, y al andar las piernas iban como tijeras—.
//
// Ahora se hace como se hace un personaje de verdad, en tres capas:
//   1. Piernas y cadera: el ciclo de andar que trae el propio modelo, al ritmo
//      de la velocidad real y con más zancada cuando corre.
//   2. El arma se coloca primero, en el espacio de la figura: culata al hombro y
//      boca al objetivo al apuntar, baja y cruzada en reposo, sobre el pecho al
//      correr. El retroceso y la recarga mueven el ARMA.
//   3. Las manos van al arma por cinemática inversa de dos huesos (hombro-codo),
//      con el codo guiado hacia fuera y abajo. Así las manos siguen al arma y
//      no al revés, y el disparo empuja todo el brazo.
//
// Se escribe en huesos por espacio de mundo, sin suponer hacia dónde apuntan
// sus ejes locales: el montador de Meshy no es simétrico y adivinar signos fue
// justo lo que dejó a los soldados en cruz la primera vez.

// Dónde se agarra cada arma, en el sistema del arma (cañón hacia -Z): la mano
// en la empuñadura, la de apoyo, la distancia a la culata y la escala.
//
// Medido sobre el esqueleto: estas figuras tienen el brazo cortísimo, 0,48 de
// hombro a muñeca para 1,7 de alto. Con el arma a su tamaño, la mano de apoyo
// no llega al guardamanos desde ninguna postura —como mucho a 0,36 de la
// culata— y el brazo se quedaba estirado en el aire. Así que en estas figuras
// el arma va a tamaño de carabina y la mano de apoyo agarra el brocal del
// cargador, que es un agarre de verdad y queda a su alcance.
const AGARRES = {
  rifle: { mano: [0, -0.11, 0.15], apoyo: [0, -0.12, -0.09], culata: 0.45, escala: 0.65 },
  shotgun: { mano: [0, -0.11, 0.13], apoyo: [0, -0.07, -0.05], culata: 0.47, escala: 0.65 },
  sniper: { mano: [0, -0.11, 0.18], apoyo: [0, -0.08, 0.05], culata: 0.62, escala: 0.6 },
  flamer: { mano: [0, -0.11, 0.12], apoyo: [0, -0.05, -0.1], culata: 0.3, escala: 0.7 }
}
const CARGADOR = new THREE.Vector3(0, -0.28, -0.09)
const ARRIBA = new THREE.Vector3(0, 1, 0)
const CERO = new THREE.Vector3()
const EJE_Z = new THREE.Vector3(0, 0, 1)
const IDENTIDAD = new THREE.Quaternion()

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

// Cinemática inversa de dos huesos: lleva la mano a `objetivo` doblando el codo
// hacia `polo`. Las longitudes se leen de la pose, no se suponen.
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
  // El codo: a lo largo de la recta hombro→mano y separado hacia el polo lo que
  // pida el triángulo de los dos huesos.
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

// Inclina un hueso alrededor del eje lateral de la figura. Positivo = hacia
// delante.
function inclinar (hueso, figure, angulo) {
  _eje.set(1, 0, 0).transformDirection(figure.matrixWorld)
  _q.setFromAxisAngle(_eje, -angulo)
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

// Estira un giro del ciclo de andar: la misma pierna, más zancada. Es lo que
// convierte el andar del modelo en carrera sin tener otra animación.
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
    musloR: hueso('RightUpLeg'),
    rodillaR: hueso('RightLeg'),
    pieL: hueso('LeftFoot')
  }
  if (!b.brazoR || !b.antebrazoR || !b.manoR || !b.brazoL || !b.antebrazoL || !b.manoL) return null

  const agarre = AGARRES[key] ?? AGARRES.rifle
  const puntoMano = new THREE.Vector3(...agarre.mano)
  const puntoApoyo = new THREE.Vector3(...agarre.apoyo)
  arma.scale.setScalar(agarre.escala)

  cuerpo.updateMatrixWorld(true)
  const reposo = new Map()
  cuerpo.traverse(o => { if (o.isBone) reposo.set(o, { q: o.quaternion.clone(), p: o.position.clone() }) })

  // Hacia dónde mira la cabeza en su propio sistema. Al crearla la figura mira
  // a -Z, así que basta deshacer su giro de mundo.
  const adelanteCabeza = new THREE.Vector3(0, 0, -1)
  if (b.cabeza) adelanteCabeza.applyQuaternion(b.cabeza.getWorldQuaternion(new THREE.Quaternion()).invert())

  // --- ciclo de andar ------------------------------------------------------------
  const clip = clips.find(c => /walk/i.test(c.name)) ?? clips[0] ?? null
  const mixer = clip ? new THREE.AnimationMixer(cuerpo) : null
  const accion = clip ? mixer.clipAction(clip) : null
  // A qué velocidad avanza el ciclo tal cual, medido sobre el propio pie: lo que
  // se desplaza respecto a la cadera en medio ciclo es lo que recorre el suelo.
  // Con eso el ritmo de la animación sale de la velocidad de verdad y los pies
  // no patinan.
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
    for (const [o, r] of reposo) {
      o.quaternion.copy(r.q)
      o.position.copy(r.p)
    }
    cuerpo.updateMatrixWorld(true)
  }

  let andar = 0
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

  return {
    // e: { andando, velocidad, apuntar (0-1), objetivo (mundo o null),
    //      retroceso (0-1), recarga (0-1), encogido (0-1), mirar, t }
    actualizar (dt, e) {
      andar += ((e.andando ? 1 : 0) - andar) * Math.min(1, dt * 7)
      // 0 = paso vivo, 1 = carrera: el traslado normal ya va a paso ligero, y
      // entrar al tablero o salir al asalto es correr.
      const carrera = THREE.MathUtils.clamp((e.velocidad - 3) / 3.4, 0, 1)

      // 1. Piernas y cadera.
      if (accion) {
        const amplitud = 1 + carrera * 0.5
        accion.setEffectiveWeight(andar)
        if (andar > 0.01) {
          accion.timeScale = THREE.MathUtils.clamp(Math.max(e.velocidad, 1.5) / (pasoNatural * amplitud), 0.5, 3.2)
          mixer.update(dt)
          if (amplitud > 1.01) {
            for (const h of [b.musloL, b.rodillaL, b.musloR, b.rodillaR]) {
              if (h) amplificar(h, reposo.get(h).q, 1 + (amplitud - 1) * andar)
            }
          }
        } else {
          mixer.update(0)
        }
      }

      // 2. Tronco: de perfil para disparar, echado hacia delante al correr,
      // hacia atrás al encajar un mordisco, y respirando.
      const apunta = e.apuntar * (1 - andar)
      figure.rotation.y = -0.38 * apunta
      figure.updateMatrixWorld(true)
      if (b.columna) {
        const respira = Math.sin(e.t * 1.3) * 0.015
        inclinar(b.columna, figure, andar * (0.08 + carrera * 0.22) + apunta * 0.06 + respira - e.encogido * 0.3)
      }

      // 3. El arma.
      figure.worldToLocal(b.brazoR.getWorldPosition(hombro))
      figure.worldToLocal(b.brazoL.getWorldPosition(hombroL))
      // En reposo: baja, cruzada por delante y la boca hacia el suelo.
      // Menos caída que un arma colgando del todo: con la boca casi vertical el
      // brocal del cargador quedaba fuera del alcance de la mano izquierda.
      c1.set(-0.08, -0.15, -0.1).add(hombro)
      d1.set(-0.35, -0.52, -0.78).normalize()
      // Corriendo: cruzada sobre el pecho, sujeta con las dos manos.
      c2.set(-0.08, -0.14, -0.1).add(hombro)
      d2.set(-0.55, -0.4, -0.72).normalize()
      c1.lerp(c2, andar)
      d1.lerp(d2, andar).normalize()
      // Apuntando: la culata en el hueco del hombro y la boca al objetivo.
      // El hueso del brazo está en la articulación, más baja que el hueco del
      // hombro: con la culata ahí el cañón iba a la altura del estómago. Arriba y
      // hacia la barbilla, la línea de tiro queda a la altura de la mejilla.
      c3.set(-0.09, 0.11, -0.05).add(hombro)
      if (e.objetivo) {
        blanco.copy(e.objetivo)
        if (blanco.y < 0.6) blanco.y += 1
        figure.worldToLocal(blanco)
        ultimaDir.subVectors(blanco, c3).normalize()
        ultimaDir.y = THREE.MathUtils.clamp(ultimaDir.y, -0.3, 0.2)
        ultimaDir.normalize()
      }
      culata.copy(c1).lerp(c3, apunta)
      dir.copy(d1).lerp(ultimaDir, apunta).normalize()

      // Culatazo: el arma entra en el hombro y la boca trepa.
      const golpe = e.retroceso * e.retroceso
      culata.addScaledVector(dir, -golpe * 0.07)
      dir.y += golpe * 0.14
      dir.normalize()
      culata.y += Math.sin(e.t * 1.3) * 0.006 * (1 - apunta * 0.6)
      // Recarga: boca abajo y el arma girada hacia el cargador.
      const recarga = Math.sin(e.recarga * Math.PI)
      if (recarga > 0) {
        dir.y -= recarga * 0.5
        dir.normalize()
        culata.y -= recarga * 0.06
      }
      culata.z += e.encogido * 0.06

      _m.lookAt(CERO, dir, ARRIBA)
      arma.quaternion.setFromRotationMatrix(_m)
      if (recarga > 0) arma.quaternion.multiply(_q.setFromAxisAngle(EJE_Z, recarga * 0.6))
      arma.position.copy(culata).addScaledVector(dir, agarre.culata * agarre.escala)
      arma.updateMatrixWorld(true)

      // 4. Las manos al arma. La de apoyo se va al cargador durante la recarga.
      b.manoR.quaternion.copy(reposo.get(b.manoR).q)
      b.manoL.quaternion.copy(reposo.get(b.manoL).q)
      arma.localToWorld(objR.copy(puntoMano))
      arma.localToWorld(objL.copy(puntoApoyo).lerp(CARGADOR, recarga))
      // Codos: el derecho hacia fuera y atrás, el izquierdo por debajo del arma.
      figure.localToWorld(poloR.set(0.4, -0.55, 0.35).add(hombro))
      figure.localToWorld(poloL.set(-0.25, -0.75, 0.05).add(hombroL))
      dosHuesos(b.brazoR, b.antebrazoR, b.manoR, objR, poloR)
      dosHuesos(b.brazoL, b.antebrazoL, b.manoL, objL, poloL)

      // 5. La cabeza: por las miras al apuntar; en reposo, vigilando.
      if (b.cabeza) {
        deseo.set(0, 0, -1).transformDirection(figure.matrixWorld)
        deseo.applyAxisAngle(ARRIBA, (e.mirar ?? 0) * (1 - apunta) * (1 - andar) * 0.8)
        dirMundo.copy(dir).transformDirection(figure.matrixWorld)
        deseo.lerp(dirMundo, apunta * 0.9).normalize()
        mirarHacia(b.cabeza, adelanteCabeza, deseo, 0.8)
      }
    }
  }
}
