import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
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
