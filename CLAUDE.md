# AlienZ Resistance — guía para Claude

Juego de defensa por carriles para móvil en vertical, instalable como PWA. Three.js + Vite, JavaScript plano (sin TypeScript).
Publicado en https://easybro92.github.io/alienz-resistance/ (repo `EasyBro92/alienz-resistance`, rama `main`; GitHub Actions despliega al hacer push).

## Reglas del proyecto

- **Todo procedural**: geometría, texturas y sonido por código. Única excepción: modelos de Meshy en `public/models/` (soldados y cascos de nave), siempre pasados por `herramientas/adelgazar.mjs`.
- **Comentarios en español** que explican el porqué. Es el estilo de todo el código: mantenerlo.
- **Commit y push directamente** cuando algo esté hecho y comprobado. Mensaje en español que acaba con `Co-Authored-By`.
- **Meshy**: no gastar créditos sin permiso; dejar siempre unos 200. (El 15/09/2026 Isidro autorizó bajar de ahí para el jefe alien de la portada: 30 créditos, saldo 170.)
- Compilar con `npx vite build`. La precarga del PWA ronda 830 KB; los `.glb` van en caché de ejecución, no en la precarga.

## Mapa del código

| Archivo | Qué hay |
|---|---|
| `src/main.js` | Bucle, colocación y arrastre, combate, asalto final a la base (`empezarAsalto` → `win`), `cerrarCuentas` (monedas sobrantes a la cartera), `win`/`lose`, pantallas de mapa, país y parte, conexión de tienda y cofre, `window.__zr` (solo DEV) |
| `src/config.js` | `FIELD`, `BASE`, `ECONOMY`, `SOLDIERS`, `DEFENSES`, `STRIKES`, `UPGRADES`, `ZOMBIES`, `INICIALES` (solo el arquero). `NIVELES` se reexporta de `campana.js` |
| `src/campana.js` | `PAISES` (13 países × 3 misiones; República Dominicana va entre México y Brasil), `DESTINOS` aplanado (= `NIVELES`), peaje de estrellas (6 por país), `dureza` de 0,06 a 0,56, bioma por misión, `suelo` por misión (`carretera`, `parque`, `adoquin`, `losas`, `arena`, `playa`, `tierra`, `nieve`; todo lo que no es carretera apaga rayas, baches, bordillos y vallas) y `tonoSuelo` opcional |
| `src/oleadas.js` | Las 6 tablas de oleadas compartidas |
| `src/biomas.js` | `BIOMAS` (paleta, `terreno` de alrededor —hierba, tierra, nieve, roca, losas o arena—, calzada, flora, restos, hito), hito `playa(lado)` (mar en ese lado), `FLORA`, `HITOS` (de región, y de ciudad: todas las misiones llevan el suyo; `castellana` sirve de avenida genérica con `conTorres = false`), piezas `pon`/`aguas`/`colocar`/`barra`/`arcada`, `conModelo` (monumento de Meshy con respaldo de código: `eiffel3d`, `eiffelFondo`, `libertad3d`; `coliseo3d` ya no usa el modelo de Meshy, que salía deformado: es `coliseoRoma` de `src/monumentos/italia.js`), `baseAlien(variante)` (base del fondo con antena animada, sin niebla), `RESTOS`. Un hito puede pedir su ángulo de vuelo con `userData.vista = { desde, mira }` (absolutos); el `bernabeu` lo usa y va `aparte` para que su rótulo conserve la textura |
| `src/monumentos/` | Los monumentos detallados de cada ciudad con su entorno, un archivo por país (`espana`, `francia`, `italia`, `grecia`, `egipto`, `nigeria`, `india`, `china`, `rusia`, `usa`, `mexico`, `dominicana`, `brasil`), registrados al final de `HITOS` en `biomas.js` (sustituyen a los antiguos del mismo nombre). `piezas.js`: materiales en caché, `explanada`, `arbol`/`arboleda` (copa, palmera, ciprés, pino, abeto, nevado, selva, jacaranda, flamboyán), `gente`, `farola`, `bloques`, `casitas`, `coche`, `barca`, `bandera`, `mar`, `colina`, `sub`. **Todo se construye a la derecha** (calzada hacia -x) y `colocar(g, lado, z)` refleja con `espejo` los de la izquierda. En ciudades con `castellana` el mundo no llama a `agrandar`: el monumento se coloca a mano (`g.position`) y la avenida abre hueco con `desde = 10, hasta = -110`. Mallas con `userData.sinFoco` (agua, pirámides, montañas, rascacielos de fondo) no cuentan al encuadrar el vuelo ni al agrandar |
| `src/world.js` | Escena, carretera y decorado. `world.vestir(bioma, hitos)` retiñe sin reconstruir; los `hitos` de la misión (campo `hitos` en `campana.js`) esconden la nave estrellada; `agrandar` los hace crecer hacia la barandilla (salvo en ciudades con avenida); `focoMonumento()` para el vuelo; `baseActual()` |
| `src/jefeAlien.js` | El jefe alien animado de la portada: lienzo y escena propios detrás de `#overlay` (`#portada-escena`), modelo `public/models/jefe-alien.glb` (Meshy con `--criatura --refinar`, adelgazado a 0,6 MB) animado por código (respira, se balancea, luces verdes que laten, niebla, esporas, relámpagos). Se carga en diferido desde `main.js` y solo dibuja con la portada a la vista. La portada fuerza los colores del tema oscuro en los dos temas; las demás pantallas del menú tienen fondo opaco (`--fondo-capa`) |
| `src/mapa.js` | Mapa del mundo en SVG (`pintarMapa`) |
| `src/assets.js` | Figuras procedurales, `bake()`, `MODELS` (Meshy), `armarPersona` (huesos manejados con mandos), `buildWeapon` |
| `src/entities/soldier.js` | Soldado. Mandos → huesos (figuras de piezas); mejoras de tienda aplicadas en `damage` y `fireRate` |
| `src/entities/cuerpo.js` | Animación de las figuras de Meshy: ciclo de andar del modelo (más zancada al correr), arma colocada en la figura (hombro/objetivo, baja, cruzada) y manos por cinemática inversa. `AGARRES` por arma |
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
| `herramientas/` | `meshy.mjs` (generar; `--realista` para monumentos, `--minimo N` no empieza si el saldo no llega), `adelgazar.mjs` (reducir texturas; `--color 1024` en monumentos) |

## Pantallas (capas de `index.html`)

`#carga` · `#overlay` (portada, y también victoria y derrota: `ui.showOverlay` **reescribe su contenido entero**) · `#mapa-capa` · `#pais-capa` · `#tienda-capa` · `#parte-capa` · `#pausa-capa`.
Ganar y perder recargan la página; `window.volverA('mapa' | 'pais:N' | 'portada')` apunta en `sessionStorage` a qué pantalla volver.

## Cómo probar

- Servidor: vista previa `z-resistance`, puerto 5180.
- `window.__zr` (solo en desarrollo):
  - `start(i)`, `place(clave, carril, fila)`, `state()`, `soldiers`, `zombies`, `economy`, `director`, `collectAll()`, `strikeAt(x, z, clave)`.
  - `run(segundos, dt)`: llamarlo **de una tirada**. Encadenado en trozos cortos, el estado que se lee va desfasado.
  - Al empezar una misión hay un vuelo de cámara de 3,4 s (`sinVuelo()` lo salta); `run()` lo consume antes de simular la partida. El vuelo mira desde arriba en diagonal (`world.vistaMonumento()`, calculada en `poblar` salvo que el hito traiga `userData.vista`); `verVuelo(k)` pone la cámara en ese punto para capturarlo (antes pausar la partida, o el bucle la recoloca).
  - Con el panel oculto las capturas salen de la pantalla de carga: quitar `#carga` con la clase `hidden` y llamar a `render()` antes de capturar.
  - Atajos: `asaltarYa()` (salta al asalto final), `ganarYa()`, `perderYa()`, `darBilletes(n)`, `desbloquearTodo()`, `borrarTodo()`, `abrir('mapa' | 'tienda' | 'pais:N')`, `cartera()`.
- `place()` solo funciona con cartas desbloqueadas: `desbloquearTodo()` y recargar.
- Con el panel del navegador oculto no llega `requestAnimationFrame`: lo que dependa de él no avanza. Usar `setTimeout`.
- Las capturas son caras y a veces salen del fotograma anterior: comprobar con JavaScript siempre que se pueda.
- Los heredocs de bash con JavaScript grande fallan: escribir con la herramienta de archivos y aplicar con un script.

## Equilibrio medido (no cambiar sin volver a medir)

- Tarragona solo con arqueros: 10 ganan con el perímetro al 74 %; 6 pierden.
- Peaje de estrellas: con 3★ o 2★ de media se llega a las 36 misiones; con 1,5★ te atascas a la entrada de Francia. (Medido con 12 países; ahora son 13 y 39 misiones: falta volver a medir.)
- Billetes por partida cobrando todas las monedas: de 27 (Tarragona) a 237 (misiones finales).
- **Todo lo anterior se midió con el botín de cada huésped al 100 %.** Ahora está al 75 % (`ECONOMY.botinHuesped`) y el goteo también cuenta para el billete: falta volver a medir.
- Monedas: 1 billete cada 30 que entran en partida (`MONEDAS_POR_BILLETE`); las que sobran al acabar van a la cartera y cada 100 guardadas son 1 billete (`MONEDAS_POR_DOLAR`, cambio automático en `cerrarCuentas`).

## Encuadre en el móvil vertical (375×812)

- Junto a la carretera solo se ve una cuña: el borde de pantalla pasa por x ≈ 10 a z = -25, x ≈ 13 a z = -40, x ≈ 18 a z = -70 y x ≈ 22 a z = -90. Por encima de unos 10 de alto lo tapa el marcador. La barandilla está en x = ±9,4.
- Un monumento que no quepa en esa cuña no se ve en el móvil. Medirlo con `__zr.camera` y `Vector3.project` antes de hacer capturas.
