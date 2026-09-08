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
        globPatterns: ['**/*.{js,css,html,svg,png,glb,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      }
    })
  ]
})
