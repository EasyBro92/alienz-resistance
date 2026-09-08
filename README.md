# AlienZ Resistance

Defensa por carriles en 3D para el móvil. Una carretera, cinco carriles y lo
último que hay antes de la base. Compras defensores con la biomasa que sueltan
los huéspedes al caer, y la armería no pausa nada: se compra mientras la horda
sigue andando.

**Jugar:** https://easybro92.github.io/alienz-resistance/

Desde el móvil, el navegador ofrece instalarlo como aplicación: pantalla
completa, vertical y jugable sin conexión una vez cargado.

## Qué tiene

- **Campaña de tres niveles** con el arsenal bloqueado al principio. Cada nivel
  superado abre dos o tres cartas nuevas, y el progreso se guarda en el
  navegador.
- **Siete defensores, cada uno con un rasgo que no tiene ningún otro**: el
  arquero clava y ralentiza, el fusilero se asienta con el mismo objetivo, el
  escopetero empuja, el tirador escoge al más duro, el lanzallamas deja el suelo
  ardiendo, el ametrallador suprime y el mortero apunta al corro más denso.
- **Nueve huéspedes**, cuatro de ellos con maneras: uno salta las barreras, otro
  estalla al morir, otra cura a los suyos y otro pasa por debajo y sale detrás
  de tu línea.
- **Nave de desembarco** distinta por ronda: aterriza al fondo de la carretera,
  abre la compuerta y de ahí salen.
- Instalable como aplicación: funciona sin conexión una vez cargada.

## Cómo está hecho

Three.js y Vite, sin ningún archivo de modelo ni de imagen. **Todo es
procedural**: las figuras se construyen con primitivas, las texturas del asfalto
y la arena se dibujan por código al arrancar, y los retratos de la armería y del
informe de amenazas se fotografían del modelo de verdad — si cambia el modelo,
cambia el retrato solo.

`src/config.js` tiene todos los números del juego. Para reequilibrar, se toca
solo ese archivo.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # versión publicable en dist/
```
