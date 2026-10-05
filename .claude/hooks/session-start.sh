#!/bin/bash
# Prepara el ordenador de la nube al empezar cada sesión de Claude Code en la web.
# Ese ordenador empieza de cero cada vez, así que aquí se instala todo lo que el
# PC de casa ya tiene: dependencias del juego, Blender y los paquetes de Poly Haven.
# En el PC propio no hace nada (allí se instala una vez con winget, ver CLAUDE.md).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Dependencias del juego (vite, three, firebase, sharp, meshoptimizer…)
npm install --no-audit --no-fund

# Blender: la página de descarga está cerrada en la nube, pero PyPI no. El módulo
# bpy es Blender entero dentro de Python; la 5.0.1 es la más nueva para Python 3.11
# (los guiones se escribieron con la 5.2).
if ! python3 -c "import bpy" 2>/dev/null; then
  pip install --quiet bpy==5.0.1
fi

# Lanzador con el nombre de siempre, para que valga la misma orden que en casa:
#   blender -b -P herramientas/blender/<guion>.py -- <argumentos>
cat > /usr/local/bin/blender <<'PY'
#!/usr/bin/env python3
import sys, runpy
a = sys.argv[1:]
if '--version' in a or '-v' in a:
    import bpy; print('Blender', bpy.app.version_string); sys.exit(0)
if '-P' not in a:
    sys.exit('uso: blender -b -P guion.py [-- argumentos]')
guion = a[a.index('-P') + 1]
import bpy
sys.argv = ['blender'] + a  # los guiones leen lo que va detrás de '--'
runpy.run_path(guion, run_name='__main__')
PY
chmod +x /usr/local/bin/blender

# Poly Haven: si la red del entorno no deja pasar a api.polyhaven.com y
# dl.polyhaven.org, se sigue sin ello (solo lo necesitan algunos guiones de Blender).
node herramientas/polyhaven.mjs || echo "Poly Haven no se ha podido bajar: revisar la red del entorno"
