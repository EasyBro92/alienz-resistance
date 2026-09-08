import * as THREE from 'three'
import { brilla } from './resplandor.js'

// Efectos puramente visuales: trazadoras, salpicaduras y números flotantes.
// Nada de esto afecta a la lógica; el daño ya se aplicó al disparar.
export function createEffects (scene, camera) {
  const tracers = []
  const bursts = []
  const texts = []

  const tracerGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5)
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfff0a8 })
  const burstGeo = new THREE.SphereGeometry(0.3, 8, 6)

  function tracer (from, to) {
    const mesh = brilla(new THREE.Mesh(tracerGeo, tracerMat))
    const dir = new THREE.Vector3().subVectors(to, from)
    const len = dir.length()
    mesh.scale.y = len
    mesh.position.copy(from).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    scene.add(mesh)
    tracers.push({ mesh, life: 0.06 })
  }

  function burst (position, color = 0x8fbf4a, count = 6, power = 1) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true })
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(burstGeo, mat)
      m.position.copy(position)
      m.position.y += 0.9
      scene.add(m)
      bursts.push({
        mesh: m,
        life: 0.45,
        v: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6).multiplyScalar(power)
      })
    }
  }

  function floatText (position, label, color = '#ffd24a', size = 64) {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.font = `900 ${size}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#1a1208'
    ctx.strokeText(label, 128, 64)
    ctx.fillStyle = color
    ctx.fillText(label, 128, 64)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false
    }))
    sprite.scale.set(3, 1.5, 1)
    sprite.position.copy(position)
    sprite.position.y += 1.6
    sprite.renderOrder = 20
    scene.add(sprite)
    texts.push({ sprite, life: 1.0 })
  }

  // --- casquillos, humo y proyectiles con vuelo propio ------------------------
  // Un disparo sin cáscara saltando ni humo se lee como un destello y ya. Estos
  // detalles son los que hacen que parezca que el arma funciona.
  const debris = []
  const shellGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.09, 6)
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.25, metalness: 0.9 })
  const smokeGeo = new THREE.SphereGeometry(0.12, 6, 5)
  const arrowShaft = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5)
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.8 })

  function shell (position) {
    const m = new THREE.Mesh(shellGeo, shellMat)
    m.position.copy(position)
    m.castShadow = true
    scene.add(m)
    debris.push({
      mesh: m, life: 1.5, bounce: true,
      v: new THREE.Vector3(1.4 + Math.random(), 2.2 + Math.random(), 0.5 + Math.random() * 0.6),
      spin: new THREE.Vector3(Math.random() * 14, Math.random() * 10, Math.random() * 14)
    })
  }

  function smoke (position, count = 3, color = 0xbfbfbf) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false })
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(smokeGeo, mat)
      m.position.copy(position)
      scene.add(m)
      debris.push({
        mesh: m, life: 0.5 + Math.random() * 0.3, grow: 3.5, fade: true,
        v: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 0.6, -1.2 - Math.random())
      })
    }
  }

  // La flecha vuela de verdad: se ve salir y llegar, que es la gracia del arquero.
  function arrow (from, to) {
    const m = new THREE.Mesh(arrowShaft, arrowMat)
    const dir = new THREE.Vector3().subVectors(to, from)
    const dist = dir.length()
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    m.position.copy(from)
    m.castShadow = true
    scene.add(m)
    debris.push({ mesh: m, life: Math.min(0.55, dist / 42), fly: dir.multiplyScalar(1 / Math.max(0.05, Math.min(0.55, dist / 42))) })
  }

  // Cono de llamas: muchas bolas naranjas que salen despedidas y se apagan.
  function flame (from, dirZ = -1, reach = 7) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.85, depthWrite: false })
    for (let i = 0; i < 7; i++) {
      const m = brilla(new THREE.Mesh(smokeGeo, mat))
      m.position.copy(from)
      scene.add(m)
      debris.push({
        mesh: m, life: 0.22 + Math.random() * 0.16, grow: 9, fade: true,
        v: new THREE.Vector3((Math.random() - 0.5) * 3.4, (Math.random() - 0.4) * 1.6, dirZ * reach * (0.7 + Math.random() * 0.6))
      })
    }
    smoke(from, 1, 0x5a5148)
  }

  // Granada de mortero: sube, cae y revienta donde toca.
  function mortar (from, to, onImpact) {
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.4 }))
    m.position.copy(from)
    m.castShadow = true
    scene.add(m)
    const flight = 0.85
    debris.push({
      mesh: m, life: flight, arc: { from: from.clone(), to: to.clone(), t: 0, total: flight, height: 5.5 }, onDone: onImpact
    })
  }

  function update (dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i]
      d.life -= dt
      if (d.arc) {
        d.arc.t += dt
        const k = Math.min(1, d.arc.t / d.arc.total)
        d.mesh.position.lerpVectors(d.arc.from, d.arc.to, k)
        d.mesh.position.y += Math.sin(k * Math.PI) * d.arc.height
      } else if (d.fly) {
        d.mesh.position.addScaledVector(d.fly, dt)
      } else if (d.v) {
        if (!d.grow) d.v.y -= 11 * dt
        d.mesh.position.addScaledVector(d.v, dt)
        if (d.bounce && d.mesh.position.y < 0.05) { d.mesh.position.y = 0.05; d.v.y = Math.abs(d.v.y) * 0.35; d.v.multiplyScalar(0.6) }
        if (d.spin) d.mesh.rotation.set(d.mesh.rotation.x + d.spin.x * dt, d.mesh.rotation.y + d.spin.y * dt, d.mesh.rotation.z + d.spin.z * dt)
      }
      if (d.grow) d.mesh.scale.setScalar(1 + (1 - Math.max(0, d.life)) * d.grow)
      if (d.fade) d.mesh.material.opacity = Math.max(0, d.life * 1.6)
      if (d.life <= 0) {
        if (d.onDone) d.onDone(d.mesh.position.clone())
        scene.remove(d.mesh)
        debris.splice(i, 1)
      }
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i]
      t.life -= dt
      if (t.life <= 0) { scene.remove(t.mesh); tracers.splice(i, 1) }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]
      b.life -= dt
      b.v.y -= 14 * dt
      b.mesh.position.addScaledVector(b.v, dt)
      b.mesh.scale.setScalar(Math.max(0.05, b.life * 2))
      if (b.life <= 0) { scene.remove(b.mesh); bursts.splice(i, 1) }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]
      t.life -= dt
      t.sprite.position.y += dt * 1.6
      t.sprite.material.opacity = Math.min(1, t.life * 1.8)
      if (t.life <= 0) { scene.remove(t.sprite); texts.splice(i, 1) }
    }
  }

  return { tracer, burst, floatText, shell, smoke, arrow, flame, mortar, update }
}
