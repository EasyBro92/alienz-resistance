import * as THREE from 'three'

// Suelo roto del Escarbador: el agujero por donde se mete, el surco agrietado
// que deja al viajar bajo tierra, el bulto de tierra que avanza encima de él y
// el agujero por donde sale. Los cascotes usan el MISMO material que el suelo
// de la misión (asfalto, arena, césped, losas…), así que salen del color y la
// textura de lo que se está rompiendo. Todo sigue ahí mientras el Escarbador
// vive; al morir, el suelo se recupera despacio en cinco segundos.

const DURA_RECUPERA = 5
const MAX_CASCOTES = 260

// Grietas dibujadas: líneas quebradas que salen del centro y se ramifican, y,
// para los agujeros, un pozo oscuro en medio.
function texturaGrieta (conAgujero) {
  const n = 256
  const lienzo = document.createElement('canvas')
  lienzo.width = n
  lienzo.height = n
  const c = lienzo.getContext('2d')
  const m = n / 2
  if (conAgujero) {
    const pozo = c.createRadialGradient(m, m, 0, m, m, n * 0.3)
    pozo.addColorStop(0, 'rgba(8,6,4,0.98)')
    pozo.addColorStop(0.55, 'rgba(22,16,10,0.9)')
    pozo.addColorStop(1, 'rgba(30,22,14,0)')
    c.fillStyle = pozo
    c.fillRect(0, 0, n, n)
  }
  c.strokeStyle = 'rgba(14,10,6,0.9)'
  c.lineCap = 'round'
  const rama = (x, y, ang, largo, grosor) => {
    if (largo < 6 || grosor < 0.6) return
    c.lineWidth = grosor
    c.beginPath()
    c.moveTo(x, y)
    let px = x
    let py = y
    const tramos = 4
    for (let i = 0; i < tramos; i++) {
      ang += (Math.random() - 0.5) * 0.7
      px += Math.cos(ang) * largo / tramos
      py += Math.sin(ang) * largo / tramos
      c.lineTo(px, py)
    }
    c.stroke()
    if (Math.random() < 0.7) rama(px, py, ang + (Math.random() - 0.5) * 1.4, largo * 0.55, grosor * 0.65)
    if (Math.random() < 0.4) rama(px, py, ang - (Math.random() - 0.5) * 1.4, largo * 0.5, grosor * 0.6)
  }
  const brazos = conAgujero ? 9 : 5
  for (let i = 0; i < brazos; i++) {
    const a = (i / brazos) * Math.PI * 2 + Math.random() * 0.5
    const r0 = conAgujero ? n * 0.12 : 0
    rama(m + Math.cos(a) * r0, m + Math.sin(a) * r0, a, n * (conAgujero ? 0.3 : 0.38), conAgujero ? 5 : 3.5)
  }
  const t = new THREE.CanvasTexture(lienzo)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createGrietas (scene, world) {
  const texAgujero = texturaGrieta(true)
  const texGrieta = texturaGrieta(false)
  const plano = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const cascoteGeo = new THREE.DodecahedronGeometry(0.5, 0)
  const bultoGeo = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)
  const tmp = new THREE.Object3D()
  const rastros = []

  // Color medio del suelo (textura por su tinte), para las nubes de tierra.
  const medias = new Map()
  const tinte = new THREE.Color()
  function colorSuelo () {
    const mat = world.road.material
    const mapa = mat.map
    let media = medias.get(mapa)
    if (!media && mapa?.image) {
      try {
        const l = document.createElement('canvas')
        l.width = l.height = 4
        const cx = l.getContext('2d')
        cx.drawImage(mapa.image, 0, 0, 4, 4)
        const d = cx.getImageData(0, 0, 4, 4).data
        let r = 0, g = 0, b = 0
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
        media = new THREE.Color(r / 16 / 255, g / 16 / 255, b / 16 / 255)
      } catch { media = new THREE.Color(1, 1, 1) }
      medias.set(mapa, media)
    }
    tinte.copy(mat.color)
    if (media) tinte.multiply(media)
    return tinte.getHex()
  }

  function crear () {
    const grupo = new THREE.Group()
    scene.add(grupo)
    const cascotes = new THREE.InstancedMesh(cascoteGeo, world.road.material, MAX_CASCOTES)
    cascotes.count = 0
    cascotes.castShadow = true
    cascotes.receiveShadow = true
    cascotes.frustumCulled = false
    grupo.add(cascotes)
    const piezas = []
    const calcas = []
    let bulto = null
    let ultimoAgujero = null

    const calca = (tex, x, z, ancho, largo, giro) => {
      const mat = new THREE.MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false, roughness: 1,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      })
      const m = new THREE.Mesh(plano, mat)
      m.position.set(x, 0.02 + calcas.length * 0.0005, z)
      m.rotation.y = giro
      m.scale.set(ancho, 1, largo)
      m.receiveShadow = true
      m.userData.base = { ancho, largo }
      grupo.add(m)
      calcas.push(m)
      return m
    }
    const cascote = (x, z, s, alto = 0) => {
      if (piezas.length >= MAX_CASCOTES) return
      piezas.push({ x, z, y: s * 0.3 + alto, s, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, edad: 0 })
    }

    const r = {
      grupo,
      t: 0,
      cerrando: false,
      // Agujero de entrada o de salida: pozo con grietas y un anillo de cascotes.
      agujero (x, z, radio) {
        ultimoAgujero = calca(texAgujero, x, z, radio * 3.2, radio * 3.2, Math.random() * 6)
        const n = Math.round(10 + radio * 6)
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2
          const d = radio * (0.75 + Math.random() * 0.6)
          cascote(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.1 + Math.random() * 0.22)
        }
      },
      // Tramo de surco: grieta alargada y cascotes levantados a los lados.
      tramo (x, z) {
        calca(texGrieta, x, z, 1.3, 1.5, (Math.random() - 0.5) * 0.5)
        for (const lado of [-1, 1]) {
          for (let i = 0; i < 2; i++) cascote(x + lado * (0.35 + Math.random() * 0.25), z + (Math.random() - 0.5) * 0.5, 0.06 + Math.random() * 0.12)
        }
      },
      // El agujero de salida se abre poco a poco antes de que asome.
      crecer (k) {
        if (!ultimoAgujero) return
        const { ancho, largo } = ultimoAgujero.userData.base
        const e = 0.25 + 0.75 * k
        ultimoAgujero.scale.set(ancho * e, 1, largo * e)
      },
      bulto (x, z) {
        if (!bulto) {
          bulto = new THREE.Mesh(bultoGeo, world.road.material)
          bulto.castShadow = true
          bulto.receiveShadow = true
          grupo.add(bulto)
        }
        bulto.visible = true
        bulto.position.set(x, -0.05, z)
        // Late con cada empujón de tierra.
        const s = 1 + Math.sin(performance.now() / 90) * 0.08
        bulto.scale.set(1.1 * s, 0.55 * s, 1.3)
      },
      quitarBulto () { if (bulto) bulto.visible = false },
      cerrar () {
        if (this.cerrando) return
        this.cerrando = true
        this.t = 0
        if (bulto) bulto.visible = false
      },
      actualizar (dt) {
        let factor = 1
        if (this.cerrando) {
          this.t += dt
          factor = Math.max(0, 1 - this.t / DURA_RECUPERA)
          for (const m of calcas) m.material.opacity = factor
        }
        let cambio = this.cerrando
        cascotes.count = piezas.length
        for (let i = 0; i < piezas.length; i++) {
          const p = piezas[i]
          if (p.edad < 0.3) { p.edad += dt; cambio = true }
          // Saltan hacia fuera con un rebote al aparecer; al cerrar se hunden.
          const brote = Math.min(1, p.edad / 0.25)
          const s = p.s * brote * (1.15 - 0.15 * brote) * factor
          tmp.position.set(p.x, p.y * factor - (1 - factor) * p.s, p.z)
          tmp.rotation.set(p.rx, p.ry, p.rz)
          tmp.scale.setScalar(Math.max(1e-4, s))
          tmp.updateMatrix()
          cascotes.setMatrixAt(i, tmp.matrix)
        }
        if (cambio) cascotes.instanceMatrix.needsUpdate = true
        return !(this.cerrando && factor <= 0)
      },
      tirar () {
        scene.remove(grupo)
        for (const m of calcas) m.material.dispose()
        cascotes.dispose()
      }
    }
    rastros.push(r)
    return r
  }

  return {
    crear,
    colorSuelo,
    update (dt) {
      for (let i = rastros.length - 1; i >= 0; i--) {
        if (!rastros[i].actualizar(dt)) {
          rastros[i].tirar()
          rastros.splice(i, 1)
        }
      }
    },
    limpiar () {
      for (const r of rastros) r.tirar()
      rastros.length = 0
    }
  }
}
