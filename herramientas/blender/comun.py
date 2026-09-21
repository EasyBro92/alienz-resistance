# Piezas comunes de las arenas del 1 contra 1 (ver arena_*.py).
#
# Se piensa en coordenadas del JUEGO (x derecha, y arriba, z hacia la cámara;
# la horda sale en z = -44 y la base está en z = 4) y `P()` las pasa a Blender.

import bpy, bmesh, math, random, os, sys
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELOS = os.path.join(RAIZ, 'public', 'models')
VISTAS = os.path.join(os.path.dirname(__file__), 'vistas')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

def P (x, y, z):
    return Vector((x, -z, y))

def empezar (semilla):
    random.seed(semilla)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene

def lin (h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

def material (nombre, color, rugosidad=0.9, emision=None, fuerza=0.0, metal=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rugosidad
    b.inputs['Metallic'].default_value = metal
    if emision is not None:
        b.inputs['Emission Color'].default_value = (*lin(emision), 1)
        b.inputs['Emission Strength'].default_value = fuerza
    return m

def malla (nombre, construir, mats):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    construir(bm)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(o)
    return o

def quad (bm, a, b, c, d, mat):
    f = bm.faces.new([bm.verts.new(a), bm.verts.new(b), bm.verts.new(c), bm.verts.new(d)])
    f.material_index = mat
    return f

def caja (bm, c, tam, giro, mat, inclina=0.0):
    # Caja orientada: `c` centro, `tam` (ancho, alto, fondo), `giro` en y.
    ca, sa = math.cos(giro), math.sin(giro)
    ci, si = math.cos(inclina), math.sin(inclina)
    w, h, d = tam[0] / 2, tam[1] / 2, tam[2] / 2
    esquinas = []
    for dy in (-h, h):
        for dx, dz in ((-w, -d), (w, -d), (w, d), (-w, d)):
            # Inclinación alrededor del eje x local, luego giro.
            y2 = dy * ci - dz * si
            z2 = dy * si + dz * ci
            x = c[0] + dx * ca + z2 * sa
            z = c[2] - dx * sa + z2 * ca
            esquinas.append(bm.verts.new(P(x, c[1] + y2, z)))
    abajo, arriba = esquinas[:4], esquinas[4:]
    caras = [abajo[::-1], arriba]
    for i in range(4):
        j = (i + 1) % 4
        caras.append([abajo[i], abajo[j], arriba[j], arriba[i]])
    for c4 in caras:
        f = bm.faces.new(c4)
        f.material_index = mat

def cilindro (bm, c, radio, alto, lados, mat, tapa=True):
    anillo = []
    for dy in (0, alto):
        fila = []
        for i in range(lados):
            a = 2 * math.pi * i / lados
            fila.append(bm.verts.new(P(c[0] + math.cos(a) * radio, c[1] + dy, c[2] + math.sin(a) * radio)))
        anillo.append(fila)
    for i in range(lados):
        j = (i + 1) % lados
        f = bm.faces.new([anillo[0][i], anillo[0][j], anillo[1][j], anillo[1][i]])
        f.material_index = mat
    if tapa:
        f = bm.faces.new(anillo[1])
        f.material_index = mat

def importar (archivo):
    # La malla de un .glb, sin su nodo padre, con giro y escala aplicados y el
    # origen en los pies: los de Meshy lo traen a media altura y tumbados.
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, archivo))
    o = [x for x in bpy.data.objects if x not in antes and x.type == 'MESH'][0]
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
    for x in [x for x in bpy.data.objects if x not in antes and x is not o]:
        bpy.data.objects.remove(x)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    vs = o.data.vertices
    bajo = min(v.co.z for v in vs)
    cx = (min(v.co.x for v in vs) + max(v.co.x for v in vs)) / 2
    cy = (min(v.co.y for v in vs) + max(v.co.y for v in vs)) / 2
    for v in vs:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= bajo
    o.location = (0, 0, 0)
    return o

def simplificar (o, caras):
    d = o.modifiers.new('menos', 'DECIMATE')
    d.ratio = caras / max(caras, len(o.data.polygons))
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='menos')

def modelo (archivo, nombre, tam, pos, giro=0.0, inclina=(0.0, 0.0), caras=3000, por='ancho'):
    # Un modelo del juego colocado a una talla: `por` 'ancho' o 'alto'.
    o = importar(archivo)
    simplificar(o, caras)
    medida = max(o.dimensions[0], o.dimensions[1]) if por == 'ancho' else o.dimensions[2]
    o.scale = [tam / medida] * 3
    o.location = P(*pos)
    o.rotation_euler = (inclina[0], inclina[1], giro)
    o.name = nombre
    return o

# --- público ---------------------------------------------------------------------------
TIPOS = ['alien-portador', 'alien-corredor', 'alien-sembrador', 'alien-encostrado', 'alien-injertadora']

def publico (sitios, caras=550, talla=(2.8, 3.4)):
    # `sitios`: lista de (x, y, z, mira_x, mira_z). Se reparten en tres grupos
    # (publico_0…2) que el juego mece cada uno a su ritmo.
    moldes = {}
    for t in TIPOS:
        o = importar(t + '.glb')
        simplificar(o, caras)
        o.hide_set(True)
        o.hide_render = True
        moldes[t] = o
    grupos = [[], [], []]
    for n, (x, y, z, mx, mz) in enumerate(sitios):
        t = random.choice(TIPOS)
        o = moldes[t].copy()
        o.data = moldes[t].data
        bpy.context.scene.collection.objects.link(o)
        o.hide_set(False)
        o.hide_render = False
        s = random.uniform(*talla) / moldes[t].dimensions[2]
        o.scale = (s, s, s)
        o.location = P(x, y, z)
        o.rotation_euler = (0, 0, math.atan2(-(mx - x), -(mz - z)))
        grupos[n % 3].append(o)
    for i, g in enumerate(grupos):
        if not g:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in g:
            o.select_set(True)
        bpy.context.view_layer.objects.active = g[0]
        bpy.ops.object.make_single_user(object=True, obdata=True)
        bpy.ops.object.join()
        g[0].name = f'publico_{i}'
    for m in moldes.values():
        bpy.data.objects.remove(m)
    print('PUBLICO', len(sitios))

def panel_foco (i, pos, mira=(0, 0, -20), ancho=4.8, alto=2.8, mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1)
    p = bpy.context.active_object
    p.name = f'foco_{i}'
    p.data.materials.append(mat)
    p.scale = (ancho, alto, 1)
    p.location = P(*pos)
    d = (P(*mira) - p.location).normalized()
    p.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    p.location += d * 0.35
    return p

# --- salida ------------------------------------------------------------------------------
def exportar (nombre):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.type == 'MESH' and not o.hide_render:
            o.select_set(True)
    salida = os.path.join(MODELOS, nombre + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=salida, export_format='GLB', use_selection=True,
        export_apply=True, export_image_format='JPEG', export_jpeg_quality=80,
        export_yup=True, export_lights=False, export_cameras=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7
    )
    print('EXPORTADO', salida, os.path.getsize(salida))

def vistas (nombre, cielo=0x0d1426):
    # Fotos de prueba: la cámara del juego en vertical y una general. Luz de
    # mentira; la de verdad la pone el juego.
    if '--vista' not in ARGS:
        return
    esc = bpy.context.scene
    os.makedirs(VISTAS, exist_ok=True)
    bpy.ops.mesh.primitive_plane_add(size=1)
    suelo = bpy.context.active_object
    suelo.scale = (160, 200, 1)
    suelo.location = P(0, -0.02, -20)
    suelo.data.materials.append(material('suelo-prueba', 0x6d5a40))
    bpy.ops.mesh.primitive_plane_add(size=1)
    pista = bpy.context.active_object
    pista.scale = (12, 50, 1)
    pista.location = P(0, 0.01, -20)
    pista.data.materials.append(material('pista-prueba', 0x8a7a62))
    mundo = bpy.data.worlds.new('noche')
    mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin(cielo), 1)
    mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    esc.world = mundo
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 50))
    sol = bpy.context.active_object
    sol.data.energy = 2.5
    sol.rotation_euler = (math.radians(40), 0, math.radians(25))
    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    esc.collection.objects.link(cam)
    esc.camera = cam
    esc.render.engine = 'BLENDER_EEVEE'
    esc.view_settings.view_transform = 'Standard'
    def foto (archivo, pos, mira, fov, w, h):
        cam.location = P(*pos)
        d = (P(*mira) - cam.location).normalized()
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam_d.sensor_fit = 'VERTICAL'
        cam_d.angle = math.radians(fov)
        esc.render.resolution_x = w
        esc.render.resolution_y = h
        esc.render.filepath = os.path.join(VISTAS, archivo)
        bpy.ops.render.render(write_still=True)
    foto(f'{nombre}-juego.png', (0, 11, 14.6), (0, 0, -9), 48, 800, 470)
    foto(f'{nombre}-general.png', (45, 50, 45), (0, 5, -30), 50, 800, 500)
