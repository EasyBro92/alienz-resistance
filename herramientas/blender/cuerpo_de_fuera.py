# Un personaje hecho FUERA (Hunyuan3D, Tripo…) reducido para el juego.
#
# Isidro, 06/10/2026: las cinco de la caja alienígena hechas aquí le parecían «de
# PS1» y generó un personaje con Hunyuan3D. Salió realista, pero con millón y
# medio de triángulos, sin esqueleto, en una postura cualquiera (una mano en la
# cadera) y con el arma fundida en la malla. Esto lo deja en lo que aguanta un
# móvil SIN perder la cara ni la textura, que es lo que falló la primera vez
# («la cara está un poco deformada y el cuerpo tiene cosas negras»).
#
#   blender -b -P herramientas/blender/cuerpo_de_fuera.py -- <archivo.glb> <clave> [--cabeza 9000] [--cuerpo 9000] [--vista]
#   node herramientas/cuerpos/montar.mjs <clave>
#
# Cómo, y por qué así:
#
#   1. SOLDAR. El .glb trae los vértices partidos por cada costura de su textura
#      (y un modelo de IA tiene miles de costuras): sin soldar, la malla son miles
#      de parches sueltos, cada uno se reduce por su cuenta y no casan.
#   2. REDUCIR EN DOS TIEMPOS. Primero todo por igual hasta que la cabeza queda
#      con sus triángulos; después solo el cuerpo, con la cabeza protegida.
#      Reduciendo todo por igual a 14.000, a la cara le tocaban unos pocos cientos.
#   3. DESPLEGAR DE NUEVO, cabeza y cuerpo aparte: media textura para cada uno
#      (como las cabezas de cabezas.py), así la cara tiene píxeles de sobra.
#   4. HORNEAR del modelo entero al reducido el color y el RELIEVE (mapa de
#      normales): las arrugas, el pelo y las costuras que ya no están en la malla
#      siguen estando en la luz. Antes se le quita el metal al modelo entero: un
#      material con metal sale NEGRO en el paso de color.
#
# Deja en vistas/cuerpos/ la malla y las dos texturas, en el formato de cuerpos.py.
# Toda la malla va pegada a un hueso: el modelo viene posado y con el arma en la
# mano, así que el juego lo trata de estatua (`estatua` en config.js). Para
# repartir pesos de verdad hace falta que venga en pose A y sin arma.

import bpy, bmesh, sys, os, json, math
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
VISTAS = os.path.join(AQUI, 'vistas')
TRABAJO = os.path.join(VISTAS, 'cuerpos')
args = sys.argv[sys.argv.index('--') + 1:]
ruta, clave = args[0], args[1]
num = lambda n, d: int(args[args.index(n) + 1]) if n in args else d
T_CABEZA, T_CUERPO = num('--cabeza', 9000), num('--cuerpo', 9000)
ANCHO, ALTO = 2048, 1024
with open(os.path.join(AQUI, 'cuerpos-esqueleto.json'), encoding='utf-8') as f:
    H = {n: Vector(h['pos']) for n, h in json.load(f)['huesos'].items()}

def solo (o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

def aplicar (o, tipo, **ajustes):
    mod = o.modifiers.new(tipo, tipo)
    for k, v in ajustes.items(): setattr(mod, k, v)
    bpy.ops.object.modifier_apply(modifier=mod.name)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ruta)
alta = max((x for x in bpy.data.objects if x.type == 'MESH'), key=lambda x: len(x.data.vertices))
solo(alta)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
caras = len(alta.data.polygons)

# --- 1. soldar (en una copia: el molde se queda como vino) ---
baja = alta.copy(); baja.data = alta.data.copy()
bpy.context.scene.collection.objects.link(baja)
bm = bmesh.new()
bm.from_mesh(baja.data)
antes = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bm.to_mesh(baja.data)
bm.free()
print(f'SOLDADO: de {antes} a {len(baja.data.vertices)} vertices')

zs = [v.co.z for v in baja.data.vertices]
z0, alto = min(zs), max(zs) - min(zs)
# Dónde empieza la cabeza: del mentón para arriba (una persona mide siete
# cabezas y media), con un trozo de cuello de paso.
Z_CORTE = z0 + alto * 0.855
arriba_de = lambda me: sum(1 for p in me.polygons if p.center.z > Z_CORTE)

# --- 2. reducir en dos tiempos ---
solo(baja)
arriba = arriba_de(baja.data)
parte = arriba / max(1, len(baja.data.polygons))
# Primero todo por igual, hasta que arriba queden los de la cabeza.
aplicar(baja, 'DECIMATE', ratio=min(1.0, T_CABEZA / max(1, arriba)))
aplicar(baja, 'TRIANGULATE')
arriba = arriba_de(baja.data)
total = len(baja.data.polygons)
print(f'PRIMER PASO: {total} triangulos, {arriba} en la cabeza ({parte * 100:.1f} % del modelo)')
# Después solo el cuerpo: los vértices del grupo (peso 1) se reducen sin trabas y
# los de fuera (la cabeza, peso 0) cuestan tanto que no se tocan. Entre unos y
# otros, una banda de paso para que no quede un escalón de malla en el cuello.
grupo = baja.vertex_groups.new(name='cuerpo')
banda = alto * 0.02
por_peso = {}
for v in baja.data.vertices:
    w = round(max(0.0, min(1.0, (Z_CORTE - v.co.z) / banda)) * 4) / 4
    if w > 0: por_peso.setdefault(w, []).append(v.index)
for w, lista in por_peso.items(): grupo.add(lista, w, 'REPLACE')
aplicar(baja, 'DECIMATE', vertex_group='cuerpo', vertex_group_factor=50.0, ratio=min(1.0, (arriba + T_CUERPO) / max(1, total)))
aplicar(baja, 'TRIANGULATE')
bm = bmesh.new()
bm.from_mesh(baja.data)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(baja.data)
bm.free()
bpy.ops.object.shade_smooth()
me = baja.data
print(f'SEGUNDO PASO: {len(me.polygons)} triangulos, {arriba_de(me)} en la cabeza')

# --- 3. desplegar: el cuerpo a la mitad izquierda de la textura, la cabeza a la derecha ---
for cabeza, u0 in ((False, 0.0), (True, 0.5)):
    for p in me.polygons: p.select = (p.center.z > Z_CORTE) == cabeza
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = me.uv_layers.active.data
    for p in me.polygons:
        if (p.center.z > Z_CORTE) != cabeza: continue
        for li in p.loop_indices:
            u = uv[li].uv
            uv[li].uv = (u0 + 0.004 + u[0] * 0.492, 0.006 + u[1] * 0.988)

# --- 4. hornear el color y el relieve del modelo entero ---
for m in alta.data.materials:
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for l in list(bsdf.inputs['Metallic'].links): m.node_tree.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0
color = bpy.data.images.new('color', ANCHO, ALTO, alpha=False)
relieve = bpy.data.images.new('relieve', ANCHO, ALTO, alpha=False)
relieve.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new('baja'); mat.use_nodes = True
nodo = mat.node_tree.nodes.new('ShaderNodeTexImage')
mat.node_tree.nodes.active = nodo
me.materials.clear(); me.materials.append(mat)
for p in me.polygons: p.material_index = 0
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8
b = sc.render.bake
b.use_selected_to_active = True
# El rayo sale de un poco por fuera del reducido y busca hacia dentro. Con poco
# margen, donde el reducido se aparta del entero el rayo no llega y sale negro.
b.cage_extrusion = alto * 0.008
b.max_ray_distance = alto * 0.03
b.margin = 16
solo(alta)
baja.select_set(True)
bpy.context.view_layer.objects.active = baja
nodo.image = color
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
nodo.image = relieve
b.normal_space = 'TANGENT'
bpy.ops.object.bake(type='NORMAL')
os.makedirs(TRABAJO, exist_ok=True)
for img, nombre in ((color, clave), (relieve, clave + '-normal')):
    img.filepath_raw = os.path.join(TRABAJO, nombre + '.png')
    img.file_format = 'PNG'
    img.save()

# --- la malla, a la talla del esqueleto ---
xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zz = [v.co.z for v in me.vertices]
# De los pies a la coronilla (`head_end`), centrada sobre la cadera. En Blender
# la figura mira a -Y; en el .glb, a +Z.
k = H['head_end'].y / (max(zz) - min(zz))
cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2
def a_gltf (co):
    x, y, z = (co.x - cx) * k, (co.y - cy) * k, (co.z - min(zz)) * k
    return (x + H['Hips'].x, z, -y + H['Hips'].z + 0.03)
uv = me.uv_layers.active.data
nor = me.corner_normals
vistos, pos, normal, uvs, indices = {}, [], [], [], []
for pol in me.polygons:
    for li in pol.loop_indices:
        vi = me.loops[li].vertex_index
        u = uv[li].uv
        n = nor[li].vector
        llave = (vi, round(u[0], 5), round(u[1], 5))
        if llave not in vistos:
            vistos[llave] = len(vistos)
            pos += [round(c, 5) for c in a_gltf(me.vertices[vi].co)]
            normal += [round(n.x, 4), round(n.z, 4), round(-n.y, 4)]
            uvs += [round(u[0], 5), round(1 - u[1], 5)]
        indices.append(vistos[llave])
nv = len(vistos)
with open(os.path.join(TRABAJO, clave + '.json'), 'w', encoding='utf-8') as f:
    json.dump({'pos': pos, 'normal': normal, 'uv': uvs, 'pesos': [[['Hips', 1.0]]] * nv, 'indices': indices}, f, separators=(',', ':'))
print(f'HECHO {clave}: de {caras} a {len(me.polygons)} triangulos, {nv} vertices, escala {k:.3f}')

# --- fotos del reducido con sus texturas, para compararlo con el entero ---
if '--vista' in args:
    alta.hide_render = True
    ver = bpy.data.materials.new('ver'); ver.use_nodes = True
    nt = ver.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.75
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = color
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = relieve
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    me.materials.clear(); me.materials.append(ver)
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.74, 0.76, 0.78, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 2.2
    sc.collection.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'
    centro = Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zz) + min(zz)) / 2))
    def foto (nombre, ang, mira, escala, res):
        a = math.radians(ang)
        d = Vector((math.sin(a), -math.cos(a), 0.05)).normalized()
        cam.location = mira + d * 6
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = escala
        sol.rotation_euler = (Vector((0.35, 0, -0.5)) - d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.resolution_x, sc.render.resolution_y = res
        sc.render.filepath = os.path.join(VISTAS, f'fuera-{clave}-{nombre}.png')
        bpy.ops.render.render(write_still=True)
    for n, ang in (('1-frente', 0), ('2-trescuartos', 40), ('4-espalda', 180)):
        foto(n, ang, centro, alto * 1.08, (560, 900))
    cara = Vector((centro.x, centro.y, max(zz) - alto * 0.075))
    foto('5-cara', 0, cara, alto * 0.22, (800, 800))
    foto('6-cara34', 35, cara, alto * 0.22, (800, 800))
