# Dónde van los modelos 3D

Deja aquí los archivos `.glb` y luego decláralos en `src/assets.js`, en el
objeto `MODELS`:

```js
export const MODELS = {
  rifle:  'models/soldado-fusil.glb',
  walker: 'models/zombi-caminante.glb'
}
```

Cada clave es la misma que en `src/config.js` (`rifle`, `shotgun`, `sniper`,
`walker`, `runner`, `armored`, `spitter`, `tank`, `boss`). La que no esté
declarada sigue usando la figura provisional de formas simples. No hay que tocar
nada más: ni la lógica, ni el combate, ni la interfaz.

## Requisitos del modelo

- Formato `.glb` (glTF binario), con las texturas dentro del archivo.
- Mirando hacia **-Z**, de pie sobre el origen (los pies en Y = 0).
- Aproximadamente 1,7 unidades de alto. El juego aplica la escala de cada tipo.
- Cuanto más bajo de polígonos, mejor: en pantalla puede haber 40 a la vez.

## De dónde sacarlos

- **kenney.nl** — gratis y sin ataduras de licencia, estilo achaparrado.
- **quaternius.com** — gratis, con zombis y soldados animados.
- **mixamo.com** — gratis, para animar cualquier humanoide.
- **sketchfab.com** / **itch.io** — de pago, para piezas concretas como el jefe.

Comprueba siempre la licencia antes de usar algo en una versión publicada.
