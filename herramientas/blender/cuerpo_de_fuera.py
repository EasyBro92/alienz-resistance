# Un personaje hecho FUERA (Hunyuan3D, Tripo…) reducido y llevado al esqueleto del
# juego, de PRUEBA: toda la malla va pegada a la cadera, como una estatua.
#
# Isidro, 06/10/2026: las cinco de la caja alienígena hechas aquí le parecían «de
# PS1» y probó a generar un personaje con Hunyuan3D. Salió realista, pero con
# millón y medio de triángulos, sin esqueleto, en una postura cualquiera (una mano
# en la cadera) y con el arma fundida en la malla. Para repartir pesos de verdad
# hace falta que venga en pose A; esto solo sirve para VER el modelo dentro del
# juego: se desliza sin mover las piernas y no apunta.
#
#   blender -b -P herramientas/blender/cuerpo_de_fuera.py -- <archivo.glb> <clave> [triángulos]
#   node herramientas/cuerpos/montar.mjs <clave>
#
# Deja malla y textura en vistas/cuerpos/, en el formato de cuerpos.py.

import bpy, sys, os, json, math
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
TRABAJO = os.path.join(AQUI, 'vistas', 'cuerpos')
args = sys.argv[sys.argv.index('--') + 1:]
ruta, clave = args[0], args[1]
meta = int(args[2]) if len(args) > 2 else 14000
with open(os.path.join(AQUI, 'cuerpos-esqueleto.json'), encoding='utf-8') as f:
    H = {n: Vector(h['pos']) for n, h in json.load(f)['huesos'].items()}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ruta)
o = max((x for x in bpy.data.objects if x.type == 'MESH'), key=lambda x: len(x.data.vertices))
bpy.context.view_layer.objects.active = o
o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
caras = len(o.data.polygons)
# Aquí NO se reduce: reduciendo en Blender las costuras de la textura se rompían
# (rayas negras), y volviendo a desplegar y hornear salían parches. El modelo llega
# ya reducido con `simplificar.mjs`, que conserva los vértices y su desplegado.
mod = o.modifiers.new("tri", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier="tri")
bpy.ops.object.shade_smooth()
horneada = None
for n in o.data.materials[0].node_tree.nodes:
    if n.type == "BSDF_PRINCIPLED" and n.inputs["Base Color"].links:
        horneada = n.inputs["Base Color"].links[0].from_node.image
horneada.scale(2048, 2048)

me = o.data
xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
alto = max(zs) - min(zs)
# A la talla del esqueleto: de los pies a la coronilla (`head_end`), y centrado
# sobre la cadera. En Blender la figura mira a -Y; en el .glb, a +Z.
k = (H['head_end'].y - 0.0) / alto
cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2; z0 = min(zs)
def a_gltf (co):
    x, y, z = (co.x - cx) * k, (co.y - cy) * k, (co.z - z0) * k
    return (x + H['Hips'].x, z, -y + H['Hips'].z + 0.03)

uv = me.uv_layers.active.data
nor = me.corner_normals
vistos, pos, normal, uvs, indices = {}, [], [], [], []
for pol in me.polygons:
    for li in pol.loop_indices:
        vi = me.loops[li].vertex_index
        u = uv[li].uv
        n = nor[li].vector
        llave = (vi, round(u[0], 5), round(u[1], 5), round(n.x, 2), round(n.y, 2), round(n.z, 2))
        if llave not in vistos:
            vistos[llave] = len(vistos)
            pos += [round(c, 5) for c in a_gltf(me.vertices[vi].co)]
            normal += [round(n.x, 4), round(n.z, 4), round(-n.y, 4)]
            uvs += [round(u[0], 5), round(1 - u[1], 5)]
        indices.append(vistos[llave])
nv = len(vistos)
os.makedirs(TRABAJO, exist_ok=True)
with open(os.path.join(TRABAJO, clave + '.json'), 'w', encoding='utf-8') as f:
    json.dump({'pos': pos, 'normal': normal, 'uv': uvs, 'pesos': [[['Spine01', 1.0]]] * nv, 'indices': indices}, f, separators=(',', ':'))

img = horneada
img.filepath_raw = os.path.join(TRABAJO, clave + '.png')
img.file_format = 'PNG'
img.save()
print(f'HECHO {clave}: de {caras} a {len(me.polygons)} triangulos, {nv} vertices, escala {k:.3f}')
