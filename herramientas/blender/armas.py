# El lanzallamas y el cazabombardero, hechos en Blender (01/10/2026).
#   blender -b -P herramientas/blender/armas.py -- [--vista]
#
# Isidro: «el lanzallamas debería ser más realista como los demás», y del ataque
# aéreo quería un avión de verdad. Eran seis tubos hechos por código y un avión
# de cápsulas que, además, volaba de culo (el morro miraba a -z y avanzaba a +z).
#
#   public/models/arma-lanzallamas.glb   dos objetos:
#       «lanza»     la lanza, apuntando a -z del juego, con la empuñadura en el
#                   origen (donde la agarra la mano): tubo, protector térmico
#                   perforado, boquilla, encendedor con su botella de gas,
#                   empuñaduras, cuerpo de válvulas y la manguera que baja.
#       «bombonas»  la mochila: dos depósitos de combustible, la botella de
#                   presión, el bastidor, las válvulas y las correas. Se cuelga
#                   del hueso del pecho; el origen queda entre los omóplatos.
#   public/models/avion-ataque.glb       el cazabombardero, morro a +z del juego
#       (que es hacia donde vuela), con las toberas en un material «brillo-».
#
# Colores lisos por material: el juego los funde con `bake`, que mete el color
# en los vértices, así que cada pieza acaba en una o dos llamadas de dibujo.
#
# Coordenadas: se construye en las del JUEGO (x derecha, y arriba, z hacia la
# cámara) y `P` las pasa a Blender.

import bpy, bmesh, os, sys, math, mathutils

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELOS = os.path.join(RAIZ, 'public', 'models')
V = mathutils.Vector
bpy.ops.wm.read_factory_settings(use_empty=True)

def P (x, y, z):
    return V((x, -z, y))

mats = {}
def mat (nombre, color, rug=0.6, metal=0.0, brillo=0.0):
    if nombre in mats:
        return mats[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = [((color >> s) & 255) / 255 for s in (16, 8, 0)]
    b.inputs['Base Color'].default_value = c + [1]
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = metal
    if brillo:
        b.inputs['Emission Color'].default_value = c + [1]
        b.inputs['Emission Strength'].default_value = brillo
    mats[nombre] = m
    return m

ACERO = mat('acero', 0x4a4f52, 0.45, 0.6)
NEGRO = mat('negro', 0x1c1d1f, 0.6, 0.2)
GOMA = mat('goma', 0x18181a, 0.9)
OLIVA = mat('oliva', 0x55603a, 0.7, 0.1)
OLIVA_OSC = mat('oliva-oscuro', 0x3c4428, 0.75, 0.1)
LATON = mat('laton', 0xb8923a, 0.4, 0.8)
ROJO = mat('rojo', 0x9a2a22, 0.5, 0.2)
LONA = mat('lona', 0x6b6248, 0.95)

piezas = []
def nuevo (nombre, bm, material, suave=True):
    me = bpy.data.meshes.new(nombre)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    me.materials.append(material)
    if suave:
        for p in me.polygons:
            p.use_smooth = True
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    piezas.append(o)
    return o

def tubo (a, b, r0, r1, material, lados=12, tapas=True):
    """Un cilindro (o cono) entre dos puntos del juego."""
    pa, pb = P(*a), P(*b)
    eje = pb - pa
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=tapas, segments=lados, radius1=r0, radius2=r1, depth=eje.length)
    giro = V((0, 0, 1)).rotation_difference(eje.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=mathutils.Matrix.Translation((pa + pb) / 2) @ giro, verts=bm.verts)
    return nuevo('tubo', bm, material)

def caja (c, tam, material, giro=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=V((tam[0], tam[2], tam[1])), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(tam) * 0.18, segments=2, affect='EDGES')
    rot = mathutils.Euler((giro[0], -giro[2], giro[1])).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=mathutils.Matrix.Translation(P(*c)) @ rot, verts=bm.verts)
    return nuevo('caja', bm, material)

def bola (c, r, material, escala=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=r)
    bmesh.ops.scale(bm, vec=V((escala[0], escala[2], escala[1])), verts=bm.verts)
    bmesh.ops.translate(bm, vec=P(*c), verts=bm.verts)
    return nuevo('bola', bm, material)

def manguera (puntos, r, material):
    """Un tubo que pasa por unos puntos (curva suave)."""
    cu = bpy.data.curves.new('manguera', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    sp = cu.splines.new('NURBS')
    sp.points.add(len(puntos) - 1)
    for p, q in zip(sp.points, puntos):
        p.co = (*P(*q), 1)
    sp.use_endpoint_u = True
    sp.order_u = 3
    o = bpy.data.objects.new('manguera', cu)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    o.select_set(False)
    piezas.append(o)
    return o

def unir (nombre, desde):
    """Funde las piezas hechas desde `desde` en un objeto con ese nombre."""
    grupo = piezas[desde:]
    bpy.ops.object.select_all(action='DESELECT')
    for o in grupo:
        o.select_set(True)
    bpy.context.view_layer.objects.active = grupo[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = nombre
    del piezas[desde:]
    piezas.append(o)
    return o

def exportar (archivo, objetos):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objetos:
        o.select_set(True)
    ruta = os.path.join(MODELOS, archivo)
    bpy.ops.export_scene.gltf(filepath=ruta, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_lights=False, export_cameras=False, export_animations=False)
    print('EXPORTADO', archivo, os.path.getsize(ruta), sum(len(o.data.polygons) for o in objetos), 'caras')

# ==================================================================================
# LA LANZA (apunta a -z; la mano va en el origen)
# ==================================================================================
n = len(piezas)
tubo((0, 0.03, 0.1), (0, 0.03, -0.62), 0.02, 0.02, ACERO)                      # el tubo
# Protector térmico: una camisa más ancha con sus aros (lo que hace que se lea
# como lanzallamas y no como una escoba).
tubo((0, 0.03, -0.3), (0, 0.03, -0.6), 0.036, 0.036, NEGRO, 14)
for z in (-0.3, -0.375, -0.45, -0.525, -0.6):
    tubo((0, 0.03, z + 0.008), (0, 0.03, z - 0.008), 0.042, 0.042, ACERO, 14)
tubo((0, 0.03, -0.6), (0, 0.03, -0.72), 0.03, 0.048, NEGRO, 14)                  # la boquilla, acampanada
tubo((0, 0.03, -0.715), (0, 0.03, -0.725), 0.05, 0.05, ACERO, 14)
# El encendedor: un tubito debajo con la punta de latón, y su botella de gas.
tubo((0, -0.015, -0.42), (0, -0.01, -0.7), 0.009, 0.009, ACERO, 8)
tubo((0, -0.01, -0.7), (0, 0.0, -0.735), 0.012, 0.007, LATON, 8)
tubo((0, -0.03, -0.12), (0, -0.03, -0.34), 0.024, 0.024, ROJO, 10)
bola((0, -0.03, -0.34), 0.024, ROJO)
bola((0, -0.03, -0.12), 0.024, ROJO)
# Empuñadura delantera, cuerpo de válvulas, gatillo y empuñadura de atrás.
tubo((0, 0.01, -0.2), (0, -0.13, -0.17), 0.019, 0.017, NEGRO, 10)
caja((0, 0.03, 0.02), (0.052, 0.075, 0.2), ACERO)
caja((0, -0.055, 0.07), (0.04, 0.12, 0.055), NEGRO, (0.35, 0, 0))
tubo((0, -0.02, -0.03), (0, -0.055, -0.01), 0.006, 0.006, ACERO, 6)
tubo((0.03, 0.05, 0.05), (0.06, 0.05, 0.05), 0.012, 0.012, ROJO, 8)             # la palanca de la válvula
caja((0, 0.03, 0.2), (0.045, 0.06, 0.2), OLIVA_OSC)                             # culata corta
# La manguera: sale de atrás y baja hacia la mochila.
manguera([(0, 0.0, 0.26), (0.02, -0.06, 0.36), (0.07, -0.2, 0.4), (0.1, -0.34, 0.33)], 0.014, GOMA)
lanza = unir('lanza', n)

# ==================================================================================
# LA MOCHILA DE BOMBONAS (el soldado mira a -z: la espalda es +z)
# ==================================================================================
n = len(piezas)
for lado in (-1, 1):
    x = lado * 0.105
    tubo((x, -0.26, 0.2), (x, 0.2, 0.2), 0.092, 0.092, OLIVA, 16)                # depósito
    bola((x, 0.2, 0.2), 0.092, OLIVA, (1, 0.6, 1))
    bola((x, -0.26, 0.2), 0.092, OLIVA, (1, 0.6, 1))
    for y in (-0.16, 0.1):                                                      # cinchas
        tubo((x, y - 0.012, 0.2), (x, y + 0.012, 0.2), 0.097, 0.097, OLIVA_OSC, 16)
    tubo((x, 0.25, 0.2), (x, 0.3, 0.2), 0.02, 0.02, ACERO, 8)                    # cuello
    tubo((x, 0.3, 0.2), (x, 0.315, 0.2), 0.034, 0.034, ROJO, 10)                 # tapón
    caja((lado * 0.11, 0.02, 0.03), (0.05, 0.42, 0.02), LONA)                    # correa al hombro
# La botella de presión, entre las dos y por fuera.
tubo((0, -0.14, 0.31), (0, 0.12, 0.31), 0.05, 0.05, ACERO, 12)
bola((0, 0.12, 0.31), 0.05, ACERO)
bola((0, -0.14, 0.31), 0.05, ACERO)
tubo((0, 0.17, 0.31), (0, 0.21, 0.31), 0.014, 0.014, LATON, 8)
tubo((-0.03, 0.21, 0.31), (0.03, 0.21, 0.31), 0.008, 0.008, ROJO, 6)             # volante de la válvula
# Bastidor y tubería de abajo, de donde sale la manguera.
caja((0, -0.02, 0.105), (0.3, 0.44, 0.02), OLIVA_OSC)
tubo((-0.105, -0.3, 0.2), (0.105, -0.3, 0.2), 0.016, 0.016, ACERO, 8)
manguera([(0.105, -0.3, 0.2), (0.2, -0.34, 0.12), (0.24, -0.3, -0.05), (0.22, -0.22, -0.18)], 0.014, GOMA)
bombonas = unir('bombonas', n)
exportar('arma-lanzallamas.glb', [lanza, bombonas])

# ==================================================================================
# EL CAZABOMBARDERO (morro a +z, que es hacia donde vuela)
# ==================================================================================
GRIS = mat('caza', 0x78828a, 0.5, 0.35)
GRIS_OSC = mat('caza-oscuro', 0x4d555c, 0.55, 0.35)
CRISTAL = mat('cristal', 0x1b2a3a, 0.12, 0.6)
TOBERA = mat('brillo-tobera', 0xff8a2a, 0.4, 0.0, 4.0)
BOMBA = mat('bomba', 0x4a5236, 0.6, 0.2)

def lamina (contorno, grosor, material, simetrico_y=True):
    """Una pieza plana (ala, deriva) a partir de su planta, con canto."""
    bm = bmesh.new()
    arriba = [bm.verts.new(P(x, y + grosor / 2, z)) for x, y, z in contorno]
    abajo = [bm.verts.new(P(x, y - grosor / 2, z)) for x, y, z in contorno]
    bm.faces.new(arriba)
    bm.faces.new(list(reversed(abajo)))
    k = len(contorno)
    for i in range(k):
        bm.faces.new([arriba[i], abajo[i], abajo[(i + 1) % k], arriba[(i + 1) % k]])
    return nuevo('lamina', bm, material, suave=False)

n = len(piezas)
# Fuselaje: un cuerpo largo que se afina hacia el morro y hacia la cola.
bola((0, 0, 0.2), 1.0, GRIS, (0.62, 0.55, 3.4))
tubo((0, -0.02, 3.1), (0, -0.08, 4.5), 0.34, 0.03, GRIS, 14)                     # morro
tubo((0, -0.06, 4.5), (0, -0.07, 5.0), 0.02, 0.012, NEGRO, 6)                    # sonda
bola((0, 0.36, 1.9), 0.4, CRISTAL, (0.72, 0.72, 2.3))                            # cabina
bola((0, 0.3, 0.2), 0.5, GRIS, (0.5, 0.5, 3.0))                                  # lomo
# Tomas de aire a los lados y los dos motores con sus toberas.
for lado in (-1, 1):
    caja((lado * 0.62, -0.1, 1.2), (0.42, 0.46, 1.6), GRIS)
    caja((lado * 0.62, -0.1, 2.02), (0.34, 0.38, 0.06), NEGRO)
    tubo((lado * 0.42, -0.05, -1.4), (lado * 0.42, -0.05, -3.3), 0.38, 0.34, GRIS_OSC, 14)
    tubo((lado * 0.42, -0.05, -3.3), (lado * 0.42, -0.05, -3.6), 0.32, 0.24, NEGRO, 14)
    tubo((lado * 0.42, -0.05, -3.58), (lado * 0.42, -0.05, -3.62), 0.22, 0.2, TOBERA, 12)
    # Ala en flecha, con la punta recortada.
    lamina([(lado * 0.5, 0, 1.4), (lado * 3.6, 0.05, -1.3), (lado * 3.6, 0.05, -2.0), (lado * 0.5, 0, -1.7)], 0.1, GRIS)
    # Estabilizador horizontal.
    lamina([(lado * 0.5, 0, -2.5), (lado * 1.9, 0.02, -3.5), (lado * 1.9, 0.02, -3.9), (lado * 0.5, 0, -3.6)], 0.07, GRIS)
    # Deriva doble, inclinada hacia fuera.
    d = lamina([(0, 0.2, -2.0), (0, 1.5, -3.3), (0, 1.5, -3.8), (0, 0.2, -3.5)], 0.07, GRIS_OSC)
    d.rotation_euler = (0, math.radians(lado * 16), 0)
    d.location = P(lado * 0.72, 0, 0) - P(0, 0, 0)
    d.location.x = lado * 0.72
    # Una bomba y un depósito bajo cada ala.
    tubo((lado * 1.6, -0.3, 0.3), (lado * 1.6, -0.3, -1.0), 0.16, 0.16, BOMBA, 10)
    tubo((lado * 1.6, -0.3, 0.3), (lado * 1.6, -0.3, 0.75), 0.16, 0.02, BOMBA, 10)
    tubo((lado * 2.5, -0.26, -0.6), (lado * 2.5, -0.26, -1.5), 0.11, 0.11, BOMBA, 8)
    tubo((lado * 2.5, -0.26, -0.6), (lado * 2.5, -0.26, -0.25), 0.11, 0.02, BOMBA, 8)
    caja((lado * 1.6, -0.15, -0.3), (0.06, 0.22, 0.5), GRIS_OSC)
avion = unir('avion', n)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
exportar('avion-ataque.glb', [avion])

if '--vista' in ARGS:
    esc = bpy.context.scene
    esc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'CYCLES'
    mundo = bpy.data.worlds.new('m'); esc.world = mundo; mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.68, 1)
    sol = bpy.data.lights.new('sol', 'SUN'); sol.energy = 3.5
    so = bpy.data.objects.new('sol', sol); esc.collection.objects.link(so)
    so.rotation_euler = (math.radians(45), 0, math.radians(35))
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cd); esc.collection.objects.link(cam); esc.camera = cam
    esc.render.resolution_x, esc.render.resolution_y = 640, 480
    def foto (nombre, objs, escala, centro):
        for o in (lanza, bombonas, avion):
            o.hide_render = o not in objs
        cd.ortho_scale = escala
        d = V((0.8, -1.0, 0.6)).normalized()
        cam.location = V(centro) + d * 30
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        esc.render.filepath = os.path.join(RAIZ, 'vistas', nombre + '.png')
        bpy.ops.render.render(write_still=True)
    foto('arma-lanzallamas', [lanza, bombonas], 1.5, (0, -0.1, 0))
    foto('avion-ataque', [avion], 10, (0, 0, 0))
