# AlienZ Resistance — guía para Claude

Juego de defensa por carriles para móvil en vertical, instalable como PWA. Three.js + Vite, JavaScript plano (sin TypeScript).
Publicado en https://easybro92.github.io/alienz-resistance/ (repo `EasyBro92/alienz-resistance`, rama `main`; GitHub Actions despliega al hacer push).

## Reglas del proyecto

- **Todo procedural**: geometría, texturas y sonido por código. Única excepción: modelos de Meshy en `public/models/` (soldados y cascos de nave), siempre pasados por `herramientas/adelgazar.mjs`.
- **Comentarios en español** que explican el porqué. Es el estilo de todo el código: mantenerlo.
- **Commit y push directamente** cuando algo esté hecho y comprobado. Mensaje en español que acaba con `Co-Authored-By`.
- **Meshy**: no gastar créditos sin permiso; dejar siempre unos 200.
- Compilar con `npx vite build`. La precarga del PWA ronda 830 KB; los `.glb` van en caché de ejecución, no en la precarga.

## Mapa del código

| Archivo | Qué hay |
|---|---|
| `src/main.js` | Bucle, colocación y arrastre, combate, `win`/`lose`, pantallas de mapa, país y parte, conexión de tienda y cofre, `window.__zr` (solo DEV) |
| `src/config.js` | `FIELD`, `BASE`, `ECONOMY`, `SOLDIERS`, `DEFENSES`, `STRIKES`, `UPGRADES`, `ZOMBIES`, `INICIALES` (solo el arquero). `NIVELES` se reexporta de `campana.js` |
| `src/campana.js` | `PAISES` (12 países × 3 misiones), `DESTINOS` aplanado (= `NIVELES`), peaje de estrellas (6 por país), `dureza` de 0,06 a 0,56, bioma por misión |
| `src/oleadas.js` | Las 6 tablas de oleadas compartidas |
| `src/biomas.js` | `BIOMAS` (paleta, calzada, flora, restos, hito), `FLORA`, `HITOS`, `RESTOS` |
| `src/world.js` | Escena, carretera y decorado. `world.vestir(bioma)` retiñe sin reconstruir |
| `src/mapa.js` | Mapa del mundo en SVG (`pintarMapa`) |
| `src/assets.js` | Figuras procedurales, `bake()`, `MODELS` (Meshy), `armarPersona` (huesos manejados con mandos), `buildWeapon` |
| `src/entities/soldier.js` | Soldado. Mandos → huesos; mejoras de tienda aplicadas en `damage` y `fireRate` |
| `src/entities/zombie.js` | Huésped. `suelo` (altura de la rampa) y reparto a su carril |
| `src/entities/dropship.js` | Nave: casco (Meshy o procedural) + bodega y rampa procedurales; `alturaRampa(z)` |
| `src/systems/cartera.js` | Billetes, monedas guardadas, desbloqueos, mejoras, `PRECIOS` (clave `alienz-cartera-v1`) |
| `src/systems/progreso.js` | Misiones superadas y estrellas (clave `alienz-progreso-v2`), `nivelJugable`, `cartasAbiertas` (sale de la cartera) |
| `src/systems/economy.js` | Monedas de partida; `onBillete` cada 30 cobradas |
| `src/cofre.js` | Sorteo del cofre y carrusel del final de partida |
| `src/tienda.js` | Pantalla de tienda |
| `src/ui.js` | Marcador y armería |
| `src/audio.js` | Todo el sonido, sintetizado |
| `src/systems/` | `calidad.js`, `detalle.js`, `resplandor.js` (halo; `apagarEmision` para modelos de fuera), `texturas.js`, `golpes.js` |
| `herramientas/` | `meshy.mjs` (generar), `adelgazar.mjs` (reducir texturas) |

## Pantallas (capas de `index.html`)

`#carga` · `#overlay` (portada, y también victoria y derrota: `ui.showOverlay` **reescribe su contenido entero**) · `#mapa-capa` · `#pais-capa` · `#tienda-capa` · `#parte-capa` · `#pausa-capa`.
Ganar y perder recargan la página; `window.volverA('mapa' | 'pais:N' | 'portada')` apunta en `sessionStorage` a qué pantalla volver.

## Cómo probar

- Servidor: vista previa `z-resistance`, puerto 5180.
- `window.__zr` (solo en desarrollo):
  - `start(i)`, `place(clave, carril, fila)`, `state()`, `soldiers`, `zombies`, `economy`, `director`, `collectAll()`, `strikeAt(x, z, clave)`.
  - `run(segundos, dt)`: llamarlo **de una tirada**. Encadenado en trozos cortos, el estado que se lee va desfasado.
  - Atajos: `ganarYa()`, `perderYa()`, `darBilletes(n)`, `desbloquearTodo()`, `borrarTodo()`, `abrir('mapa' | 'tienda' | 'pais:N')`, `cartera()`.
- `place()` solo funciona con cartas desbloqueadas: `desbloquearTodo()` y recargar.
- Con el panel del navegador oculto no llega `requestAnimationFrame`: lo que dependa de él no avanza. Usar `setTimeout`.
- Las capturas son caras y a veces salen del fotograma anterior: comprobar con JavaScript siempre que se pueda.
- Los heredocs de bash con JavaScript grande fallan: escribir con la herramienta de archivos y aplicar con un script.

## Equilibrio medido (no cambiar sin volver a medir)

- Tarragona solo con arqueros: 10 ganan con el perímetro al 74 %; 6 pierden.
- Peaje de estrellas: con 3★ o 2★ de media se llega a las 36 misiones; con 1,5★ te atascas a la entrada de Francia.
- Billetes por partida cobrando todas las monedas: de 27 (Tarragona) a 237 (misiones finales).
