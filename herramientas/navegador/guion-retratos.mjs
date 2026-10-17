// Sacar los retratos de la armería y del informe de amenazas UNA VEZ y dejarlos
// en public/retratos/, para que el juego no tenga que bajarse todos los modelos
// al arrancar solo para fotografiarlos (18/10/2026: eran 37,6 MB antes de poder
// jugar; ver `retratosHechos` en src/portraits.js).
//
//   node herramientas/navegador/movil.mjs herramientas/navegador/guion-retratos.mjs
//
// Hay que volver a pasarlo CADA VEZ QUE CAMBIE UN MODELO (un soldado, una
// defensa, un alien). Fotografía con el mismo código que el juego
// (`renderPortraits` con `vivo`), pasa cada PNG a webp con su transparencia y le
// pone en el nombre la huella de su contenido: una foto nueva llega con otro
// nombre y la caché del móvil no puede servir la vieja. Borra las que sobran.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

export default async ({ evaluar }) => {
  const fotos = JSON.parse(await evaluar(`
    const { renderPortraits } = await import('/src/portraits.js')
    const { SOLDIERS, DEFENSES } = await import('/src/config.js')
    const { retratos, amenazas } = await renderPortraits(__zr.renderer, null, { vivo: true })
    const soldados = {}, defensas = {}
    for (const [k, v] of retratos) (SOLDIERS[k] ? soldados : defensas)[k] = v
    return JSON.stringify({ soldados, defensas, amenazas: Object.fromEntries(amenazas) })`))

  const dir = path.resolve('public', 'retratos')
  fs.mkdirSync(dir, { recursive: true })
  const indice = { soldados: {}, defensas: {}, amenazas: {} }
  const quedan = new Set(['indice.json'])
  let bytes = 0
  for (const [grupo, lista] of Object.entries(fotos)) {
    for (const [clave, datos] of Object.entries(lista)) {
      const png = Buffer.from(datos.split(',')[1], 'base64')
      const webp = await sharp(png).webp({ quality: 86, alphaQuality: 90 }).toBuffer()
      const huella = crypto.createHash('sha1').update(webp).digest('hex').slice(0, 8)
      const nombre = `${grupo[0]}-${clave}.${huella}.webp`
      fs.writeFileSync(path.join(dir, nombre), webp)
      indice[grupo][clave] = nombre
      quedan.add(nombre)
      bytes += webp.length
    }
  }
  for (const f of fs.readdirSync(dir)) if (!quedan.has(f)) fs.rmSync(path.join(dir, f))
  fs.writeFileSync(path.join(dir, 'indice.json'), JSON.stringify(indice, null, 1) + '\n')
  const n = Object.values(indice).reduce((s, g) => s + Object.keys(g).length, 0)
  console.log(`${n} retratos en public/retratos/ (${(bytes / 1024).toFixed(0)} KB)`)
}
