import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Guardar capturas del juego en disco, SOLO en desarrollo.
//
// Hace falta para revisar los mapas: hay cuarenta y un sitios y la única forma
// honesta de decir que uno «se parece» es mirarlo. Sin esto, una captura del
// lienzo se queda dentro del navegador. La página manda el JPEG a /__foto y
// aquí se escribe en `vistas/`, que está fuera de git.
//
// No entra en la versión publicada: `apply: 'serve'` solo lo monta el servidor
// de desarrollo, así que en GitHub Pages esta ruta no existe.
const guardarFotos = () => ({
  name: 'guardar-fotos',
  apply: 'serve',
  configureServer (server) {
    server.middlewares.use('/__foto', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end('solo POST') }
      let cuerpo = ''
      req.on('data', t => { cuerpo += t })
      req.on('end', () => {
        try {
          const { nombre, datos } = JSON.parse(cuerpo)
          // El nombre lo pone quien pide la captura, así que se limpia: nada de
          // subir por el árbol de carpetas desde una página web.
          const limpio = path.basename(String(nombre)).replace(/[^\w.-]/g, '_')
          const dir = path.resolve('vistas')
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, limpio), Buffer.from(String(datos).split(',')[1], 'base64'))
          res.end('ok ' + limpio)
        } catch (e) {
          res.statusCode = 400
          res.end('mal: ' + e.message)
        }
      })
    })
  }
})

export default defineConfig({
  base: './',
  // Firebase en su propio trozo con nombre, para poder dejarlo fuera de la precarga.
  build: {
    rollupOptions: {
      output: { manualChunks: id => (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase') ? 'firebase' : undefined) }
    }
  },
  plugins: [
    guardarFotos(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        // Rutas RELATIVAS, no absolutas. En GitHub Pages el juego no vive en la
        // raíz del dominio sino en /<repositorio>/, y un `start_url: '/'` mandaría
        // al usuario a la portada de github.io al abrir la aplicación instalada.
        // Con './' se resuelven contra la propia ubicación del manifiesto y
        // funciona igual en la raíz que en un subdirectorio.
        id: './',
        start_url: './',
        scope: './',
        lang: 'es',
        name: 'AlienZ Resistance',
        short_name: 'AlienZ',
        description: 'Defiende la última línea. Cada zombi que cae, paga.',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'fullscreen',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Los .glb quedan FUERA de la precarga. Son 7,8 de los 8,5 MB del
        // paquete, y precargarlos significa que la primera visita no ve nada
        // hasta haberse bajado los doce modelos enteros — en el móvil viejo que
        // llevamos dos sesiones cuidando, eso es medio minuto de pantalla de
        // carga antes del menú.
        //
        // Y no hacen falta para empezar: el juego arranca con las figuras y los
        // cascos procedurales, y cada modelo releva al suyo en cuanto termina de
        // bajar. Lo que se pierde esperando es detalle, no partida.
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,ogg}'],
        // Firebase (la cuenta de Google) solo lo descarga quien entra: fuera de la
        // precarga, que si no casi la duplicaba.
        globIgnores: ['**/firebase-*.js'],
        // Pero sí se guardan en cuanto se piden una vez, así que a partir de la
        // segunda partida están en el aparato y la aplicación sigue funcionando
        // entera sin red, que es de lo que va ser una PWA.
        runtimeCaching: [{
          urlPattern: /.glb$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'modelos-3d',
            expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] }
          }
        }],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ]
})
