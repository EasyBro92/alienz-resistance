// Los gestos de cada forma de alien, de perfil: andando, recogiendo el golpe,
// pegando y dos momentos de su caída. Para revisar `ATAQUES`, `PASOS` y `MUERTES`
// (src/entities/gestos.js) sin esperar a que salgan en una partida.
//
//   $env:FORMAS = 'tank,runner'; node herramientas/navegador/movil.mjs herramientas/navegador/guion-gestos.mjs
//
// Sin `FORMAS`, las nueve. Deja vistas/gesto-<forma>-<anda|recoge|pega|cae1|cae2>.jpg.
// La partida se pausa para posar: con el bucle parado nadie pisa lo que se le
// escribe a la figura (`andando`, `ataqueFase`), y el dibujado sigue animándola.

export default async ({ evaluar, espera, recargar }) => {
  const formas = (process.env.FORMAS ?? 'walker,runner,armored,spitter,tank,leaper,bloater,healer,burrower').split(',')
  await evaluar(`__zr.desbloquearTodo()`)
  await recargar()
  await espera(800)
  await evaluar(`
    const z = __zr
    const espera = ms => new Promise(r => setTimeout(r, ms))
    z.start(0); await espera(1200); z.start(0); await espera(1000)
    z.sinVuelo(); z.despausar()
    for (let i = 0; i < 20; i++) z.simulate(1 / 40)
    const { THREE, renderer, scene } = z
    const cam = new THREE.PerspectiveCamera(32, 0.75, 0.1, 400)
    window.__fotoAlien = async (b, nombre, talla = 1) => {
      const p = b.mesh.position
      cam.position.set(p.x - 5.2 * talla, 1.5 * talla, p.z + 0.4)
      cam.lookAt(p.x, 0.95 * talla, p.z + 0.5)
      cam.updateMatrixWorld()
      const viejo = new THREE.Vector2(); renderer.getSize(viejo)
      const proporcion = renderer.getPixelRatio()
      renderer.setPixelRatio(1); renderer.setSize(420, 560, false)
      // Varias pasadas: el gesto entra mezclando, no de golpe.
      for (let i = 0; i < 14; i++) { renderer.render(scene, cam); await espera(34) }
      // Y la foto, de un dibujado hecho en este mismo instante: tras una espera el
      // lienzo ya está borrado y sale negra.
      renderer.render(scene, cam)
      const datos = renderer.domElement.toDataURL('image/jpeg', 0.88)
      await fetch('/__foto', { method: 'POST', body: JSON.stringify({ nombre: 'gesto-' + nombre + '.jpg', datos }) })
      renderer.setPixelRatio(proporcion); renderer.setSize(viejo.x, viejo.y, false)
    }
  `)
  for (const k of formas) {
    console.log(await evaluar(`
      const z = __zr
      const espera = ms => new Promise(r => setTimeout(r, ms))
      const b = await z.meter('${k}', 2)
      const talla = b.spec.scale ?? 1
      b.mesh.position.set(0, 0, -14); b.suelo = 0
      for (let i = 0; i < 6; i++) z.simulate(1 / 40)
      z.pausar()
      if (!z.pausado()) return 'no se pausa'
      const u = b.mesh.userData
      u.andando = true; u.ataqueFase = null; u.fasePaso = 2.2
      await __fotoAlien(b, '${k}-anda', talla)
      u.andando = false
      u.ataqueFase = 0.74; await __fotoAlien(b, '${k}-recoge', talla)
      u.ataqueFase = 0.985; await __fotoAlien(b, '${k}-pega', talla)
      z.despausar()
      b.hurt(1e6)
      for (let i = 0; i < 14; i++) z.simulate(1 / 40)          // 0,35 s de caída
      z.pausar()
      await __fotoAlien(b, '${k}-cae1', talla)
      z.despausar()
      for (let i = 0; i < 22; i++) z.simulate(1 / 40)          // 0,9 s
      z.pausar()
      await __fotoAlien(b, '${k}-cae2', talla)
      z.despausar()
      for (let i = 0; i < 70; i++) z.simulate(1 / 40)
      return '${k} ok'
    `))
  }
}
