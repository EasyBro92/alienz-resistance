# Arena 1: el Coliseo invadido.
#
# Se genera entero por script para poder rehacerlo cuando haga falta:
#   blender -b -P herramientas/blender/arena_coliseo.py -- [--vista]
# Deja `public/models/arena-coliseo.glb` y, con --vista, dos fotos de prueba en
# `herramientas/blender/vistas/`.
#
# Coordenadas: se piensa en las del JUEGO (x a la derecha, y arriba, z hacia la
# cámara; la horda sale en z = -44 y la base está en z = 4) y se pasa a Blender
# con `P()`. El exportador de glTF deshace el cambio de ejes.

import bpy, bmesh, math, random, os, sys
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELOS = os.path.join(RAIZ, 'public', 'models')
VISTAS = os.path.join(os.path.dirname(__file__), 'vistas')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
random.seed(11)

def P (x, y, z):
    return Vector((x, -z, y))

bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene

def importar (archivo):
    # Trae la malla de un .glb, sin su nodo padre y con el giro y la escala ya
    # aplicados a los vértices: así se puede girar y escalar desde cero sin que
    # se tumbe (el importador los pone de pie con un giro de 90°).
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
    # El origen, en los pies y centrado: los de Meshy lo traen a media altura y
    # medio cuerpo se quedaba enterrado en la grada.
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

# --- materiales -------------------------------------------------------------------
def material (nombre, color, rugosidad=0.9, emision=None, fuerza=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rugosidad
    if emision:
        b.inputs['Emission Color'].default_value = (*emision, 1)
        b.inputs['Emission Strength'].default_value = fuerza
    return m

def lin (h):
    # Color en hexadecimal (sRGB) a lineal, que es lo que guarda Blender.
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

M_PIEDRA = material('piedra', lin(0xcbb48c))
M_PIEDRA_OSC = material('piedra-oscura', lin(0x8a7658))
M_PODIO = material('podio', lin(0x6f5d48))
M_TELA = material('estandarte', lin(0x8e1a14), 0.8)
M_METAL = material('metal', lin(0x3a3f46), 0.5)
M_FOCO = material('foco', lin(0xfff4d6), 0.3, lin(0xfff1cc), 6.0)

# --- el graderío --------------------------------------------------------------------
# Una elipse alrededor del campo: el centro, a media pista; los semiejes, lo justo
# para que el campo, el arenal y el campamento quepan dentro.
ZC = -22.0
A0, B0 = 17.0, 42.0          # borde interior (el podio)
# La cámara del juego mira casi al horizonte y corta a media grada: con gradas
# bajas se ve más público y menos pared.
ALTO_PODIO = 2.4
GRADAS = 8
HUELLA = 1.9                 # lo que avanza cada grada hacia fuera
TABICA = 1.15                # lo que sube cada grada
N = 128                      # segmentos de la vuelta
# Solo la parte que ve la cámara: fuera el trozo de detrás del jugador.
Z_CORTE = 14.0

def punto (i, k):
    t = 2 * math.pi * k / N
    a = A0 + i * HUELLA
    b = B0 + i * HUELLA
    return a * math.cos(t), ZC + b * math.sin(t)

def visible (k):
    _, z = punto(0, k)
    _, z2 = punto(0, k + 1)
    return z < Z_CORTE and z2 < Z_CORTE

def malla (nombre, construir, mats):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    construir(bm)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(nombre, me)
    esc.collection.objects.link(o)
    return o

def quad (bm, a, b, c, d, mat):
    f = bm.faces.new([bm.verts.new(a), bm.verts.new(b), bm.verts.new(c), bm.verts.new(d)])
    f.material_index = mat
    return f

def graderio (bm):
    for k in range(N):
        if not visible(k):
            continue
        k2 = k + 1
        # Podio: el muro del borde de la arena.
        x1, z1 = punto(0, k)
        x2, z2 = punto(0, k2)
        quad(bm, P(x1, 0, z1), P(x2, 0, z2), P(x2, ALTO_PODIO, z2), P(x1, ALTO_PODIO, z1), 2)
        for i in range(GRADAS):
            h = ALTO_PODIO + i * TABICA
            xa, za = punto(i, k)
            xb, zb = punto(i, k2)
            xc, zc = punto(i + 1, k2)
            xd, zd = punto(i + 1, k)
            # Huella (lo que se pisa) y tabica (el escalón).
            quad(bm, P(xa, h, za), P(xd, h, zd), P(xc, h, zc), P(xb, h, zb), 0)
            quad(bm, P(xd, h, zd), P(xd, h + TABICA, zd), P(xc, h + TABICA, zc), P(xc, h, zc), 1)
        # La última huella, arriba del todo.
        h = ALTO_PODIO + GRADAS * TABICA
        xa, za = punto(GRADAS, k)
        xb, zb = punto(GRADAS, k2)
        xc, zc = punto(GRADAS + 1, k2)
        xd, zd = punto(GRADAS + 1, k)
        quad(bm, P(xa, h, za), P(xd, h, zd), P(xc, h, zc), P(xb, h, zb), 0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

grad = malla('graderio', graderio, [M_PIEDRA, M_PIEDRA_OSC, M_PODIO])

# --- el ático con arcos, roto a trozos ---------------------------------------------------
# Pilares y dinteles sobre la última grada: vistos de lejos, es la arquería del
# Coliseo. Donde el ruido dice "ruina", el pilar se queda a medias y no hay dintel.
H_TOPE = ALTO_PODIO + GRADAS * TABICA
ruina = [random.random() for _ in range(N)]
def suave (k):
    return (ruina[k % N] + ruina[(k + 1) % N] + ruina[(k - 1) % N]) / 3

def caja (bm, c, tam, giro, mat):
    # Caja orientada: `c` centro (juego), `tam` (ancho, alto, fondo), `giro` en y.
    ca, sa = math.cos(giro), math.sin(giro)
    w, h, d = tam[0] / 2, tam[1] / 2, tam[2] / 2
    esquinas = []
    for dy in (-h, h):
        for dx, dz in ((-w, -d), (w, -d), (w, d), (-w, d)):
            x = c[0] + dx * ca + dz * sa
            z = c[2] - dx * sa + dz * ca
            esquinas.append(bm.verts.new(P(x, c[1] + dy, z)))
    abajo, arriba = esquinas[:4], esquinas[4:]
    caras = [abajo[::-1], arriba]
    for i in range(4):
        j = (i + 1) % 4
        caras.append([abajo[i], abajo[j], arriba[j], arriba[i]])
    for c4 in caras:
        f = bm.faces.new(c4)
        f.material_index = mat

def atico (bm):
    for k in range(0, N, 2):
        if not visible(k):
            continue
        x, z = punto(GRADAS + 0.5, k)
        xn, zn = punto(GRADAS + 0.5, k + 2)
        giro = math.atan2(-(zn - z), xn - x)
        r = suave(k)
        alto = 7.5 if r < 0.62 else 7.5 * (0.25 + r * 0.4)
        caja(bm, (x, H_TOPE + alto / 2, z), (0.9, alto, 1.3), giro, 0)
        if r < 0.55:
            # Dintel hasta el pilar siguiente.
            mx, mz = (x + xn) / 2, (z + zn) / 2
            largo = math.hypot(xn - x, zn - z)
            caja(bm, (mx, H_TOPE + 7.5 - 0.5, mz), (largo + 0.2, 1.0, 1.3), giro, 1)
            caja(bm, (mx, H_TOPE + 3.6, mz), (largo, 0.4, 1.1), giro, 1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

atic = malla('atico', atico, [M_PIEDRA, M_PIEDRA_OSC])

# --- estandartes rojos colgando del ático --------------------------------------------------
def estandartes (bm):
    for k in range(3, N, 12):
        if not visible(k) or suave(k) >= 0.55:
            continue
        x, z = punto(GRADAS + 0.2, k)
        # Hacia dentro de la arena, pegado al ático.
        ang = math.atan2(z - ZC, x)
        nx, nz = -math.cos(ang), -math.sin(ang)
        tx, tz = -nz, nx
        w = 1.1
        y1, y0 = H_TOPE + 6.8, H_TOPE + 1.0
        quad(bm, P(x - tx * w, y0, z - tz * w), P(x + tx * w, y0, z + tz * w),
             P(x + tx * w, y1, z + tz * w), P(x - tx * w, y1, z - tz * w), 0)

est = malla('estandartes', estandartes, [M_TELA])

# --- torres de focos ---------------------------------------------------------------------
# Cuatro, en las esquinas de lo que se ve. El panel brilla: la luz de verdad la
# pone el juego, que sabe dónde están por su nombre (`foco_0`…).
focos = []
for i, (fx, fz) in enumerate([(-24, -52), (24, -52), (-27, -8), (27, -8)]):
    def torre (bm, fx=fx, fz=fz):
        caja(bm, (fx, 13, fz), (0.8, 26, 0.8), 0, 0)
        caja(bm, (fx, 26.5, fz), (5.2, 3.2, 0.6), math.atan2(fz - ZC, -fx) if False else 0, 0)
    o = malla(f'torre_{i}', torre, [M_METAL])
    # El panel de luces, girado hacia el centro del campo.
    bpy.ops.mesh.primitive_plane_add(size=1)
    panel = bpy.context.active_object
    panel.name = f'foco_{i}'
    panel.data.materials.append(M_FOCO)
    panel.scale = (4.8, 2.8, 1)
    panel.location = P(fx, 26.5, fz)
    objetivo = P(0, 0, -20)
    dirv = (objetivo - panel.location).normalized()
    panel.rotation_euler = dirv.to_track_quat('Z', 'Y').to_euler()
    panel.location += dirv * 0.35
    focos.append(panel)

# --- el público ----------------------------------------------------------------------------
# Alienz de las fichas del juego, simplificados a unas 450 caras (desde la grada
# no se ve más) y repartidos en tres grupos. El juego mece cada grupo con su
# propio ritmo: así se mueve la grada sin animar cien esqueletos.
TIPOS = ['alien-portador', 'alien-corredor', 'alien-sembrador', 'alien-encostrado', 'alien-injertadora']
moldes = {}
for t in TIPOS:
    nuevo = importar(t + '.glb')
    dec = nuevo.modifiers.new('menos', 'DECIMATE')
    dec.ratio = 550 / max(550, len(nuevo.data.polygons))
    bpy.context.view_layer.objects.active = nuevo
    bpy.ops.object.modifier_apply(modifier='menos')
    nuevo.hide_set(True)
    nuevo.hide_render = True
    moldes[t] = nuevo

GIRO_MODELO = float(os.environ.get('GIRO_MODELO', '0'))
grupos = [[], [], []]
n = 0
for fila in range(1, GRADAS, 1):
    paso = 2 if fila < 4 else 3
    for k in range(fila % 3, N, paso):
        if not visible(k) or random.random() < 0.2:
            continue
        x, z = punto(fila + 0.45, k)
        # Nadie en la grada que queda justo delante de la cámara, tapando.
        if z > 6:
            continue
        if abs(x) < 6.5 and z < ZC - B0 + 4 and fila < 5:
            continue
        t = random.choice(TIPOS)
        o = moldes[t].copy()
        o.data = moldes[t].data
        esc.collection.objects.link(o)
        o.hide_set(False)
        o.hide_render = False
        # Todos de la misma talla de base (2,3 de alto) y luego un poco de variedad.
        s = random.uniform(2.8, 3.4) / moldes[t].dimensions[2]
        o.scale = (s, s, s)
        o.location = P(x, ALTO_PODIO + fila * TABICA, z)
        # Mirando al centro de la arena.
        mira = math.atan2(-(ZC - z), 0 - x) if False else math.atan2((0 - x), -(ZC - z))
        o.rotation_euler = (0, 0, math.atan2(-(0 - x), (-(ZC - z))) + GIRO_MODELO)
        grupos[n % 3].append(o)
        n += 1

publico = []
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
    publico.append(g[0])
for m in moldes.values():
    bpy.data.objects.remove(m)
print('PUBLICO', n)

# --- la palco imperial y LA MADRE ---------------------------------------------------------------
# Al fondo, justo detrás de la base alien y en el eje: es lo primero que se ve.
def palco (bm):
    x, z = punto(3, N * 3 // 4)       # el punto del fondo (sin = -1)
    caja(bm, (0, ALTO_PODIO + TABICA + 0.9, z - 2.5), (11, 1.8, 7), 0, 0)
    caja(bm, (0, ALTO_PODIO + TABICA + 1.95, z - 2.5), (11.8, 0.3, 7.6), 0, 1)
pal = malla('palco', palco, [M_PIEDRA, M_PODIO])
madre = importar('alien-madre.glb')
_, zf = punto(3, N * 3 // 4)
dims = madre.dimensions
madre.scale = [6.5 / max(dims)] * 3
madre.location = P(0, ALTO_PODIO + TABICA + 2.1, zf - 3.5)
madre.rotation_euler = (0, 0, GIRO_MODELO)
madre.name = 'madre'

# --- naves ------------------------------------------------------------------------------------
def nave (archivo, nombre, diametro, pos, inclinacion=0.0):
    o = importar(archivo)
    o.scale = [diametro / max(o.dimensions[0], o.dimensions[1])] * 3
    o.location = P(*pos)
    o.rotation_euler = (inclinacion, 0, 0)
    o.name = nombre
    d = o.modifiers.new('menos', 'DECIMATE')
    d.ratio = 3000 / max(3000, len(o.data.polygons))
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='menos')
    return o

# Detrás de la grada del fondo: en partida casi no se ve, pero preside el vuelo
# de entrada y las pantallas apaisadas.
nodriza = nave('nave-nodriza.glb', 'nodriza', 70, (0, 34, -125), 0.1)
plat0 = nave('nave-platillo.glb', 'platillo_0', 7, (-20, 30, -60))
plat1 = nave('nave-platillo.glb', 'platillo_1', 6, (22, 36, -74))

# --- exportar ------------------------------------------------------------------------------------
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.select_set(True)
salida = os.path.join(MODELOS, 'arena-coliseo.glb')
bpy.ops.export_scene.gltf(
    filepath=salida, export_format='GLB', use_selection=True,
    export_apply=True, export_image_format='JPEG', export_jpeg_quality=80,
    export_yup=True, export_lights=False, export_cameras=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7
)
print('EXPORTADO', salida, os.path.getsize(salida))

# --- fotos de prueba -------------------------------------------------------------------------------
if '--vista' in args:
    os.makedirs(VISTAS, exist_ok=True)
    # Un campo de mentira para juzgar el encuadre: la pista, el arenal y la base.
    bpy.ops.mesh.primitive_plane_add(size=1)
    suelo = bpy.context.active_object
    suelo.scale = (120, 160, 1)
    suelo.location = P(0, -0.01, -20)
    suelo.data.materials.append(material('arena', lin(0xb89a6a)))
    bpy.ops.mesh.primitive_plane_add(size=1)
    pista = bpy.context.active_object
    pista.scale = (12, 50, 1)
    pista.location = P(0, 0.01, -20)
    pista.data.materials.append(material('pista', lin(0x7d7466)))

    mundo = bpy.data.worlds.new('noche')
    mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin(0x0d1426), 1)
    mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    esc.world = mundo
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 50))
    luna = bpy.context.active_object
    luna.data.energy = 0.8
    luna.data.color = lin(0x9fb4ff)
    luna.rotation_euler = (math.radians(50), 0, math.radians(30))
    for f in focos:
        bpy.ops.object.light_add(type='SPOT', location=f.location)
        l = bpy.context.active_object
        l.data.energy = 60000
        l.data.spot_size = math.radians(70)
        d = (P(0, 0, -20) - f.location).normalized()
        l.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        l.data.color = lin(0xfff1cc)

    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    esc.collection.objects.link(cam)
    esc.camera = cam
    try:
        esc.render.engine = 'BLENDER_EEVEE'
    except Exception:
        esc.render.engine = 'BLENDER_EEVEE_NEXT'
    esc.view_settings.view_transform = 'Standard'

    def foto (nombre, pos, mira, fov, w, h):
        cam.location = P(*pos)
        d = (P(*mira) - cam.location).normalized()
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam_d.sensor_fit = 'VERTICAL'
        cam_d.angle = math.radians(fov)
        esc.render.resolution_x = w
        esc.render.resolution_y = h
        esc.render.filepath = os.path.join(VISTAS, nombre)
        bpy.ops.render.render(write_still=True)

    # La cámara del juego en un móvil en vertical, y una vista general.
    foto('coliseo-juego.png', (0, 12.6, 18), (0, 0, -9), 48, 375, 700)
    foto('coliseo-general.png', (40, 45, 40), (0, 5, -30), 50, 800, 500)
    # De cerca, para ver hacia dónde mira el público.
    foto('coliseo-grada.png', (0, 4, -20), (-17, 6, -34), 40, 600, 400)
    print('VISTAS', VISTAS)
