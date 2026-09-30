# Tarragona: la Platja del Miracle con el anfiteatro romano, hecha en Blender
# (30/09/2026).
#   blender -b -P herramientas/blender/lugar_tarragona.py
#
# Isidro: «recrea el primer mapa, el de Tarragona; me gustaba la playa con el
# coliseo a un lado… lo más fiel posible, pero que sea jugable». Con texturas
# de Poly Haven (CC0, herramientas/paquetes/polyhaven/), como el mapa de prueba
# de la Guerra civil que le gustó.
#
# Cómo es de verdad (y cómo queda aquí, mirando desde la base hacia el fondo):
#   · a la IZQUIERDA el Mediterráneo: la arena dorada baja a la orilla, con
#     espigones de roca. Los bichos desembarcan al fondo de la playa.
#   · se juega sobre la ARENA.
#   · a la DERECHA, pegada a la playa, la vía del tren (doble, con balasto,
#     traviesas y catenaria) detrás de un pretil de piedra, y el talud.
#   · encima del talud, el ANFITEATRO (130 × 102 m, aquí a 0,55): la arena
#     elíptica con el podio, las gradas subiendo hacia la ciudad, en parte
#     talladas en la roca del talud; el lado del mar ya no existe (lo cortó la
#     vía), y por eso desde la playa se ve la arena por encima del podio. En el
#     centro, las ruinas de Santa Maria del Miracle (iglesia románica de una
#     nave, cruz latina y ábside cuadrado) sobre la planta de la basílica
#     visigoda, y las dos fosas en cruz.
#   · alrededor, el parque con pinos piñoneros; arriba, el Balcó del
#     Mediterrani con su barandilla de hierro y la ciudad de piedra dorada.
#   · al fondo, el puerto con sus grúas, y un tren de cercanías parado.
#
# Jugando, en un móvil en vertical, del lado derecho solo cabe hasta x ≈ 11 a
# mitad del campo y 18 al fondo, y nada por encima de unos 8 de alto (medido con
# la cámara del juego): se ve la vía, la catenaria, el talud y el borde de la
# arena. El anfiteatro entero lo enseña el vuelo de llegada, como el Duomo.
#
# Coordenadas del JUEGO (x derecha, y arriba, z hacia la cámara); `P` las pasa
# a Blender. Nada macizo en el paso de los bichos (±7,4 entre z = -60 y 5).

import bpy, bmesh, os, math, random, mathutils

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PH = os.path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')
SALIDA = os.path.join(RAIZ, 'public', 'models', 'lugar-tarragona.glb')
TMP = os.path.join(PH, '_reducidas')
os.makedirs(TMP, exist_ok=True)
LADO_SUELO, LADO_OBJETO = 512, 256
LIBRE = 7.4
random.seed(41)
bpy.ops.wm.read_factory_settings(use_empty=True)
V = mathutils.Vector

def P (x, z, y=0.0):
    return V((x, -z, y))

# --- materiales con las texturas (la misma receta que prueba_mapa.py) ------------
imagenes = {}
def imagen (ruta, lado, color=True, tono=None):
    clave = (ruta, tono)
    if clave not in imagenes:
        im = bpy.data.images.load(ruta)
        if im.size[0] > lado:
            im.scale(lado, lado)
        if tono:
            # Llevar la textura a un color medio (y bajarle el contraste): un tinte
            # solo oscurece, y la arena de Poly Haven es marrón (130, 114, 92).
            import numpy as np
            px = np.array(im.pixels[:], dtype=np.float32).reshape(-1, 4)
            meta = np.array([((tono >> s) & 255) / 255 for s in (16, 8, 0)], dtype=np.float32)
            media = px[:, :3].mean(axis=0)
            px[:, :3] = np.clip(meta + (px[:, :3] - media) * 0.7, 0, 1)
            im.pixels[:] = px.ravel()
            im.update()
        chica = os.path.join(TMP, f'{lado}-{tono or 0:06x}-' + os.path.basename(ruta))
        s = bpy.context.scene.render.image_settings
        s.file_format, s.quality, s.color_mode = 'JPEG', 75, 'RGB'
        im.save_render(chica)
        bpy.data.images.remove(im)
        im = bpy.data.images.load(chica)
        if not color:
            im.colorspace_settings.name = 'Non-Color'
        imagenes[clave] = im
    return imagenes[clave]

mats = {}
def textura (nombre, rug=0.9, tinte=None, tono=None):
    clave = (nombre, tinte, tono)
    if clave in mats:
        return mats[clave]
    d = os.path.join(PH, 'texturas', nombre)
    m = bpy.data.materials.new(nombre + ('' if tinte is None else f'-{tinte:06x}') + ('' if tono is None else f'-t{tono:06x}'))
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n['Principled BSDF']
    col = n.new('ShaderNodeTexImage'); col.image = imagen(os.path.join(d, f'{nombre}_diff_1k.jpg'), LADO_SUELO, True, tono)
    if tinte is None:
        l.new(col.outputs['Color'], b.inputs['Base Color'])
    else:
        mez = n.new('ShaderNodeMix'); mez.data_type = 'RGBA'; mez.blend_type = 'MULTIPLY'
        mez.inputs['Factor'].default_value = 1
        l.new(col.outputs['Color'], mez.inputs['A'])
        mez.inputs['B'].default_value = [((tinte >> s) & 255) / 255 for s in (16, 8, 0)] + [1]
        l.new(mez.outputs['Result'], b.inputs['Base Color'])
    rel = n.new('ShaderNodeTexImage'); rel.image = imagen(os.path.join(d, f'{nombre}_nor_gl_1k.jpg'), LADO_SUELO, False)
    nm = n.new('ShaderNodeNormalMap')
    l.new(rel.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rug
    mats[clave] = m
    return m

def liso (nombre, color, rug=0.6, metal=0.0, brillo=0.0):
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

# --- geometría con UV «de mundo» -------------------------------------------------
def objeto (nombre, bm, mat_lista):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    for m in mat_lista:
        me.materials.append(m)
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    return o

def uv_mundo (bm, baldosa):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        f.normal_update()
        nrm = f.normal
        for lp in f.loops:
            c = lp.vert.co
            if abs(nrm.z) > 0.7:
                lp[uv].uv = (c.x / baldosa, c.y / baldosa)
            elif abs(nrm.x) > abs(nrm.y):
                lp[uv].uv = (c.y / baldosa, c.z / baldosa)
            else:
                lp[uv].uv = (c.x / baldosa, c.z / baldosa)

def caras (nombre, lista, mat, baldosa):
    bm = bmesh.new()
    for pts in lista:
        bm.faces.new([bm.verts.new(p) for p in pts])
    uv_mundo(bm, baldosa)
    return objeto(nombre, bm, [mat])

def plano (nombre, x0, x1, z0, z1, mat, baldosa, y=0.0):
    return caras(nombre, [[P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y)]], mat, baldosa)

def caja (nombre, x0, x1, z0, z1, y0, y1, mat, baldosa=2.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = P(x0 + (v.co.x + 0.5) * (x1 - x0), z0 + (v.co.y + 0.5) * (z1 - z0), y0 + (v.co.z + 0.5) * (y1 - y0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv_mundo(bm, baldosa)
    return objeto(nombre, bm, [mat])

# Muchas cajas en una sola malla (traviesas, sillares): una llamada de dibujo.
def cajas (nombre, lista, mat, baldosa=2.0):
    bm = bmesh.new()
    for (x0, x1, z0, z1, y0, y1) in lista:
        r = bmesh.ops.create_cube(bm, size=1)
        for v in r['verts']:
            v.co = P(x0 + (v.co.x + 0.5) * (x1 - x0), z0 + (v.co.y + 0.5) * (z1 - z0), y0 + (v.co.z + 0.5) * (y1 - y0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv_mundo(bm, baldosa)
    return objeto(nombre, bm, [mat])

# --- objetos de Poly Haven, adelgazados ----------------------------------------------
cache = {}
def poner (nombre, x, z, giro=0.0, escala=1.0, y=0.0, caras_max=1500):
    if nombre not in cache:
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(PH, 'modelos', nombre, f'{nombre}_1k.gltf'))
        bpy.context.view_layer.update()
        nuevos = [o for o in bpy.data.objects if o not in antes]
        mallas = [o for o in nuevos if o.type == 'MESH']
        for o in mallas:
            mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        for o in nuevos:
            if o.type != 'MESH':
                bpy.data.objects.remove(o)
        bpy.ops.object.select_all(action='DESELECT')
        for o in mallas:
            o.select_set(True)
            for mt in o.data.materials:
                for nd in (mt.node_tree.nodes if mt and mt.use_nodes else []):
                    if nd.type == 'TEX_IMAGE' and nd.image and nd.image.size[0] > LADO_OBJETO:
                        nd.image.scale(LADO_OBJETO, LADO_OBJETO)
        bpy.context.view_layer.objects.active = mallas[0]
        if len(mallas) > 1:
            bpy.ops.object.join()
        molde = bpy.context.view_layer.objects.active
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        n = len(molde.data.polygons)
        if n > caras_max:
            d = molde.modifiers.new('menos', 'DECIMATE'); d.ratio = caras_max / n
            bpy.ops.object.modifier_apply(modifier='menos')
        print('OBJETO', nombre, n, '->', len(molde.data.polygons))
        # Centrado en su planta y apoyado en el suelo, y medido: los de Poly Haven
        # traen el origen donde sea y cada uno a su tamaño.
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        dz = molde.dimensions.z / 2
        molde.location = (0, 0, 0)
        for v in molde.data.vertices:
            v.co.z += dz
        print('  MIDE', tuple(round(d, 2) for d in molde.dimensions))
        molde.hide_render = True; molde.hide_set(True)
        cache[nombre] = molde
    o = cache[nombre].copy()
    o.data = cache[nombre].data
    o.hide_render = False
    bpy.context.collection.objects.link(o)
    o.location = P(x, z, y)
    o.rotation_euler = (0, 0, math.radians(giro))
    o.scale = (escala, escala, escala)
    return o

# --- materiales del sitio --------------------------------------------------------------
ARENA = textura('sand_01', 0.95, None, 0xeccf92)
ARENA_MOJADA = textura('sand_01', 0.6, None, 0xb39866)
ARENA_ANFI = textura('sand_01', 0.95, None, 0xd9c092)
SILLAR = textura('sandstone_blocks_08', 0.9, 0xf0dcb4)       # la piedra dorada de Tarraco
SILLAR_GASTADO = textura('seaworn_sandstone_brick', 0.95, 0xe6d0a4)
ROCA = textura('rock_face_03', 0.95, 0xd9c29a)
HORMIGON_ROMANO = textura('castle_wall_varriation', 0.95, 0xd8c8a8)
CESPED = textura('leafy_grass', 1.0, 0xb8c79a)
BALASTO = textura('gravel_stones', 0.95, 0xb0a898)
AGUA = liso('agua', 0x1f6f86, 0.08, 0.15)
AGUA_ORILLA = liso('agua-orilla', 0x5fb3b8, 0.1)
ESPUMA = liso('espuma', 0xf2f4f0, 0.9)
HIERRO = liso('hierro', 0x3a3d40, 0.45, 0.8)
RAIL = liso('rail', 0x8a8580, 0.3, 1.0)
HORMIGON = liso('traviesa', 0x9c978e, 0.9)
OSCURO = liso('fosa', 0x2a241c, 1.0)
PINO_COPA = liso('pino-copa', 0x3f5a2c, 0.95)
PINO_TRONCO = liso('pino-tronco', 0x5b4330, 0.95)
PALMERA = liso('palmera-hoja', 0x557a35, 0.9)
PALMERA_TRONCO = liso('palmera-tronco', 0x8a7454, 0.95)
VIDRIO = liso('ventana', 0x1c2226, 0.25)
TEJA = textura('ceramic_roof_01', 0.9)

# ==================================================================================
# 1. LA PLAYA Y EL MAR
# ==================================================================================
Z_CERCA, Z_LEJOS = 60, -330
# La arena: llana donde se juega y bajando hacia el agua a la izquierda.
bm = bmesh.new()
xs = [9.6, 4, 0, -4, -8, -11, -13.5, -17, -24]
ys = [0, 0, 0, 0, 0, -0.05, -0.25, -0.7, -1.4]
zs = list(range(Z_CERCA, Z_LEJOS - 1, -10))
filas = []
for z in zs:
    # La orilla hace una curva suave: la playa se abre hacia el fondo.
    abre = -0.012 * (z - 20) if z < 20 else 0
    filas.append([bm.verts.new(P(x - (abre if x < -8 else 0), z, y)) for x, y in zip(xs, ys)])
for i in range(len(filas) - 1):
    for j in range(len(xs) - 1):
        bm.faces.new([filas[i][j], filas[i][j + 1], filas[i + 1][j + 1], filas[i + 1][j]])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:
    f.normal_update()
    if f.normal.z < 0:
        f.normal_flip()
uv_mundo(bm, 3.0)
suelo = objeto('suelo-playa', bm, [ARENA, ARENA_MOJADA])
for p in suelo.data.polygons:
    if p.center.x < -9:
        p.material_index = 1

# El mar hasta el horizonte, y una franja clara de poca agua junto a la orilla.
plano('mar', -700, -12, 200, -900, AGUA, 40, -0.12)
bm = bmesh.new()
lista = []
for z in range(Z_CERCA, Z_LEJOS - 1, -10):
    abre = -0.012 * (z - 20) if z < 20 else 0
    lista.append(z)
for i in range(len(lista) - 1):
    z0, z1 = lista[i], lista[i + 1]
    a0 = -0.012 * (z0 - 20) if z0 < 20 else 0
    a1 = -0.012 * (z1 - 20) if z1 < 20 else 0
    bm.faces.new([bm.verts.new(P(-12.6 - a0, z0, -0.1)), bm.verts.new(P(-22 - a0, z0, -0.1)),
                  bm.verts.new(P(-22 - a1, z1, -0.1)), bm.verts.new(P(-12.6 - a1, z1, -0.1))])
    # La espuma: una raya blanca irregular donde rompe.
    w = random.uniform(0.25, 0.6)
    bm.faces.new([bm.verts.new(P(-12.2 - a0, z0, -0.06)), bm.verts.new(P(-12.2 - a0 - w, z0, -0.06)),
                  bm.verts.new(P(-12.2 - a1 - w, z1, -0.06)), bm.verts.new(P(-12.2 - a1, z1, -0.06))])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv_mundo(bm, 10)
orilla = objeto('orilla', bm, [AGUA_ORILLA, ESPUMA])
for k, p in enumerate(orilla.data.polygons):
    p.material_index = k % 2

# Espigones de roca que entran en el mar (los de la Platja del Miracle).
# Los bloques se hacen aquí: las «rocas» de Poly Haven son calas enteras (una
# mide 60 × 42 m).
ESCOLLERA = textura('rock_face_03', 0.95, 0xa8a49c)
bm = bmesh.new()
for z0 in (-48, -135, 28):
    for k in range(13):
        for fila in (-1, 0, 1):
            r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1)
            x = -13.8 - k * 2.2 + random.uniform(-0.4, 0.4)
            z = z0 + fila * 1.7 + random.uniform(-0.3, 0.3)
            t = random.uniform(1.0, 1.5) * (1.2 if fila == 0 else 0.9)
            y = (0.6 if fila == 0 else 0.1) - k * 0.06
            for v in r['verts']:
                v.co = P(x + v.co.x * t * random.uniform(0.8, 1.2), z + v.co.y * t * random.uniform(0.8, 1.2),
                         y + v.co.z * t * 0.75 * random.uniform(0.8, 1.2))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv_mundo(bm, 2.5)
objeto('espigones', bm, [ESCOLLERA])

# Una torre de socorrista y sombrillas abandonadas, fuera del paso.
def socorrista (x, z):
    blanco = liso('socorrista', 0xe9e6de, 0.7)
    rojo = liso('socorrista-rojo', 0xc0392b, 0.7)
    cajas('socorrista-patas', [(x - 0.9 + dx, x - 0.75 + dx, z - 0.9 + dz, z - 0.75 + dz, 0, 2.2) for dx in (0, 1.65) for dz in (0, 1.65)], blanco)
    caja('socorrista-plataforma', x - 1, x + 1, z - 1, z + 1, 2.2, 2.35, blanco)
    caja('socorrista-asiento', x - 0.4, x + 0.4, z - 0.3, z + 0.3, 2.35, 3.1, rojo)
    caja('socorrista-techo', x - 1.1, x + 1.1, z - 1.1, z + 1.1, 3.9, 4.0, rojo)
    cajas('socorrista-postes', [(x - 1, x - 0.9, z - 1, z - 0.9, 2.35, 3.9), (x + 0.9, x + 1, z + 0.9, z + 1, 2.35, 3.9)], blanco)
socorrista(-9.8, -32)

def sombrilla (x, z, color, caida=0.0):
    tela = liso(f'sombrilla-{color:06x}', color, 0.8)
    bm = bmesh.new()
    alto = 2.2
    r = bmesh.ops.create_cone(bm, cap_ends=False, segments=8, radius1=1.3, radius2=0.02, depth=0.45)
    for v in r['verts']:
        v.co.z += alto
    o = objeto('sombrilla', bm, [tela])
    bm = bmesh.new()
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.03, radius2=0.03, depth=alto)
    for v in r['verts']:
        v.co.z += alto / 2
    palo = objeto('sombrilla-palo', bm, [HIERRO])
    for obj in (o, palo):
        obj.location = P(x, z, 0)
        obj.rotation_euler = (caida, 0, random.uniform(0, 6))
sombrilla(-9.2, -14, 0x2e86c1)
sombrilla(-10.6, -21, 0xe67e22, 1.2)     # tumbada: la playa lleva dos años vacía
sombrilla(-8.6, -75, 0xf1c40f)

# ==================================================================================
# 2. LA VÍA DEL TREN
# ==================================================================================
# Pretil de piedra entre la arena y la vía.
caja('pretil', 9.6, 10.2, Z_CERCA, Z_LEJOS, 0, 1.0, SILLAR_GASTADO, 1.5)
caja('pretil-albardilla', 9.5, 10.3, Z_CERCA, Z_LEJOS, 1.0, 1.1, liso('albardilla', 0xd8ccb4, 0.8), 1.5)
# El balasto, las traviesas y los carriles: dos vías.
caja('balasto', 10.2, 15.4, Z_CERCA, Z_LEJOS, 0, 0.55, BALASTO, 1.2)
VIAS = (11.7, 13.9)
travs = []
for x in VIAS:
    z = Z_CERCA
    while z > Z_LEJOS:
        travs.append((x - 1.3, x + 1.3, z, z - 0.26, 0.55, 0.68))
        z -= 0.7
cajas('traviesas', travs, HORMIGON, 1.0)
cajas('carriles', [(x + s * 0.84 - 0.04, x + s * 0.84 + 0.04, Z_CERCA, Z_LEJOS, 0.68, 0.82) for x in VIAS for s in (-1, 1)], RAIL)
# La catenaria: postes cada 27 m al lado del talud, ménsula y los dos hilos.
postes, mensulas, hilos = [], [], []
z = Z_CERCA - 4
while z > Z_LEJOS:
    postes.append((15.6, 15.9, z, z - 0.3, 0.5, 7.6))
    mensulas.append((11.0, 15.9, z, z - 0.14, 6.9, 7.05))
    z -= 27
for x in VIAS:
    hilos.append((x - 0.02, x + 0.02, Z_CERCA, Z_LEJOS, 5.9, 5.94))
    hilos.append((x - 0.02, x + 0.02, Z_CERCA, Z_LEJOS, 6.85, 6.88))
cajas('catenaria-postes', postes, HIERRO, 1.0)
cajas('catenaria-mensulas', mensulas, HIERRO, 1.0)
cajas('catenaria-hilos', hilos, HIERRO, 1.0)
# El talud: muro de hormigón romano y roca que sube al nivel del anfiteatro.
NIVEL = 2.6
caja('talud', 15.4, 16.4, Z_CERCA, Z_LEJOS, 0, NIVEL + 0.3, HORMIGON_ROMANO, 2.5)

# Un tren de cercanías parado, lejos (se ve en el vuelo, no tapa el anfiteatro).
tren_blanco = liso('tren', 0xeeeeea, 0.35, 0.2)
tren_rojo = liso('tren-rojo', 0xd6362c, 0.4)
for k in range(3):
    z0 = -150 - k * 26
    caja(f'tren{k}', VIAS[1] - 1.45, VIAS[1] + 1.45, z0, z0 - 25, 0.9, 4.6, tren_blanco, 3)
    caja(f'tren-franja{k}', VIAS[1] - 1.47, VIAS[1] + 1.47, z0 - 0.2, z0 - 24.8, 1.3, 1.7, tren_rojo, 3)
    caja(f'tren-ventanas{k}', VIAS[1] - 1.47, VIAS[1] + 1.47, z0 - 1.5, z0 - 23.5, 2.4, 3.5, VIDRIO, 3)

# ==================================================================================
# 3. EL ANFITEATRO
# ==================================================================================
ESC = 0.55
A_ARENA, B_ARENA = 61.5 / 2 * ESC, 38.5 / 2 * ESC      # semiejes de la arena (z, x)
A_FUERA, B_FUERA = 130 / 2 * ESC, 102 / 2 * ESC        # del conjunto
CZ = -64.0
CX = 17.2 + B_ARENA                                   # el borde de la arena, justo tras el talud
CORTE = 16.4                                          # por aquí pasó la vía: no queda nada
PODIO = 1.5
FILAS = 16
ALZA = 0.62
N = 128

def elipse (a, b, t):
    return CX + b * math.sin(t), CZ + a * math.cos(t)

def terreno (x):
    # La ladera del parque, del talud al Balcó: de 2,6 a 21.
    k = max(0.0, min(1.0, (x - CORTE) / 44))
    return NIVEL + (k ** 1.15) * 18.4

# La arena del anfiteatro.
bm = bmesh.new()
centro = bm.verts.new(P(CX, CZ, NIVEL))
anillo = [bm.verts.new(P(*elipse(A_ARENA, B_ARENA, i / N * 2 * math.pi), NIVEL)) for i in range(N)]
for i in range(N):
    bm.faces.new([centro, anillo[i], anillo[(i + 1) % N]])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv_mundo(bm, 3)
objeto('suelo-arena-anfiteatro', bm, [ARENA_ANFI])

# El podio y las gradas: anillos escalonados de la arena hacia fuera. Solo existe
# lo que queda a la derecha del corte de la vía; donde se corta se cierra con
# un paramento de hormigón romano (la ruina, vista de lado).
def ejes (k):
    return A_ARENA + (A_FUERA - A_ARENA) * k, B_ARENA + (B_FUERA - B_ARENA) * k

bm = bmesh.new()
alto_fila = []
for i in range(FILAS + 1):
    # Dos pasillos (praecinctiones) separan los tres sectores: un escalón más alto.
    extra = 0.5 if i in (6, 11) else 0
    alto_fila.append((alto_fila[-1] + ALZA + extra) if alto_fila else NIVEL + PODIO)

def vivo (x):
    return x >= CORTE

# Podio: pared vertical alrededor de la arena.
for i in range(N):
    t0, t1 = i / N * 2 * math.pi, (i + 1) / N * 2 * math.pi
    x0, z0 = elipse(A_ARENA, B_ARENA, t0)
    x1, z1 = elipse(A_ARENA, B_ARENA, t1)
    if not (vivo(x0) and vivo(x1)):
        continue
    bm.faces.new([bm.verts.new(P(x0, z0, NIVEL)), bm.verts.new(P(x1, z1, NIVEL)),
                  bm.verts.new(P(x1, z1, NIVEL + PODIO)), bm.verts.new(P(x0, z0, NIVEL + PODIO))])
podio = bm
uv_mundo(podio, 1.6)
objeto('anfiteatro-podio', podio, [SILLAR])

bm = bmesh.new()
tapas = bmesh.new()
for f in range(FILAS):
    a0, b0 = ejes(f / FILAS)
    a1, b1 = ejes((f + 1) / FILAS)
    y = alto_fila[f]
    y_sig = alto_fila[f + 1]
    dentro_antes = False
    for i in range(N):
        t0, t1 = i / N * 2 * math.pi, (i + 1) / N * 2 * math.pi
        p00, p01 = elipse(a0, b0, t0), elipse(a0, b0, t1)
        p10, p11 = elipse(a1, b1, t0), elipse(a1, b1, t1)
        dentro = all(vivo(p[0]) for p in (p00, p01, p10, p11))
        if dentro:
            # La huella (lo que se pisa) y la contrahuella del escalón siguiente.
            bm.faces.new([bm.verts.new(P(*p00, y)), bm.verts.new(P(*p10, y)), bm.verts.new(P(*p11, y)), bm.verts.new(P(*p01, y))])
            bm.faces.new([bm.verts.new(P(*p10, y)), bm.verts.new(P(*p11, y)), bm.verts.new(P(*p11, y_sig)), bm.verts.new(P(*p10, y_sig))])
        # Donde empieza o acaba lo que queda en pie, el corte de la ruina.
        if dentro != dentro_antes and i > 0:
            pa, pb = (p00, p10)
            tapas.faces.new([tapas.verts.new(P(*pa, NIVEL)), tapas.verts.new(P(*pb, NIVEL)),
                             tapas.verts.new(P(*pb, y)), tapas.verts.new(P(*pa, y))])
        dentro_antes = dentro
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv_mundo(bm, 2.2)
gradas = objeto('anfiteatro-gradas', bm, [SILLAR, ROCA])
# Las filas de abajo del lado de la ciudad, talladas en la roca del talud.
for p in gradas.data.polygons:
    c = p.center
    if -c.y < CZ + A_ARENA * 0.6 and -c.y > CZ - A_ARENA * 0.6 and c.x > CX and c.z < NIVEL + PODIO + 4:
        p.material_index = 1
uv_mundo(tapas, 2.2)
objeto('anfiteatro-ruina', tapas, [HORMIGON_ROMANO])

# El muro de fuera: del borde de la última fila hasta el terreno (hacia arriba
# donde el anfiteatro está excavado en la ladera, hacia abajo donde se apoya
# en bóvedas).
bm = bmesh.new()
tope = alto_fila[FILAS]
for i in range(N):
    t0, t1 = i / N * 2 * math.pi, (i + 1) / N * 2 * math.pi
    x0, z0 = elipse(A_FUERA, B_FUERA, t0)
    x1, z1 = elipse(A_FUERA, B_FUERA, t1)
    if not (vivo(x0) and vivo(x1)):
        continue
    for (xa, za, xb, zb) in ((x0, z0, x1, z1),):
        ya, yb = terreno(xa), terreno(xb)
        bm.faces.new([bm.verts.new(P(xa, za, min(ya, tope))), bm.verts.new(P(xb, zb, min(yb, tope))),
                      bm.verts.new(P(xb, zb, max(yb, tope))), bm.verts.new(P(xa, za, max(ya, tope)))])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv_mundo(bm, 2.5)
muro = objeto('anfiteatro-muro', bm, [SILLAR_GASTADO, ROCA])
for p in muro.data.polygons:
    if p.center.z > tope - 0.1:
        p.material_index = 1     # por encima de la última fila es la roca de la ladera

# Las fosas en cruz: dos zanjas oscuras con su brocal de piedra.
LZ, LX, ANCHO = A_ARENA * 1.5, B_ARENA * 1.5, 2.2
caja('fosa-larga', CX - ANCHO / 2, CX + ANCHO / 2, CZ + LZ / 2, CZ - LZ / 2, NIVEL - 0.02, NIVEL + 0.02, OSCURO, 1)
caja('fosa-corta', CX - LX / 2, CX + LX / 2, CZ + ANCHO / 2, CZ - ANCHO / 2, NIVEL - 0.02, NIVEL + 0.02, OSCURO, 1)
brocal = []
for s in (-1, 1):
    brocal.append((CX + s * ANCHO / 2 - 0.2, CX + s * ANCHO / 2 + 0.2, CZ + LZ / 2, CZ - LZ / 2, NIVEL, NIVEL + 0.25))
    brocal.append((CX - LX / 2, CX + LX / 2, CZ + s * ANCHO / 2 - 0.2, CZ + s * ANCHO / 2 + 0.2, NIVEL, NIVEL + 0.25))
cajas('fosa-brocal', brocal, SILLAR_GASTADO, 1.2)

# Santa Maria del Miracle: una nave con crucero y ábside cuadrado, muros en
# ruina a alturas distintas, sobre la planta de la basílica visigoda (cimientos
# bajos, más ancha). La iglesia mira al este: el ábside hacia la ciudad (+x).
muros = []
def muro_ruina (x0, x1, z0, z1, alto):
    # Un muro roto: tramos de un metro con altura irregular.
    largo = max(abs(x1 - x0), abs(z1 - z0))
    n = max(1, int(largo))
    for k in range(n):
        a, b = k / n, (k + 1) / n
        h = alto * random.uniform(0.35, 1.0)
        if abs(x1 - x0) > abs(z1 - z0):
            muros.append((x0 + (x1 - x0) * a, x0 + (x1 - x0) * b, z0 - 0.4, z0 + 0.4, NIVEL, NIVEL + h))
        else:
            muros.append((x0 - 0.4, x0 + 0.4, z0 + (z1 - z0) * a, z0 + (z1 - z0) * b, NIVEL, NIVEL + h))
IX = CX - 4        # la nave, de oeste (mar) a este (ábside)
NAVE_L, NAVE_A = 13, 5.4
muro_ruina(IX - NAVE_L / 2, IX + NAVE_L / 2, CZ + NAVE_A / 2, 0, 3.8)
muro_ruina(IX - NAVE_L / 2, IX + NAVE_L / 2, CZ - NAVE_A / 2, 0, 3.4)
muro_ruina(IX - NAVE_L / 2, IX - NAVE_L / 2, CZ + NAVE_A / 2, CZ - NAVE_A / 2, 2.2)      # fachada, muy baja
# El crucero.
TX = IX + NAVE_L / 2 - 2.5
muro_ruina(TX - 1.8, TX - 1.8, CZ + NAVE_A / 2, CZ + NAVE_A / 2 + 3.2, 3.0)
muro_ruina(TX + 1.8, TX + 1.8, CZ + NAVE_A / 2, CZ + NAVE_A / 2 + 3.2, 3.0)
muro_ruina(TX - 1.8, TX + 1.8, CZ + NAVE_A / 2 + 3.2, 0, 2.6)
muro_ruina(TX - 1.8, TX - 1.8, CZ - NAVE_A / 2, CZ - NAVE_A / 2 - 3.2, 3.0)
muro_ruina(TX + 1.8, TX + 1.8, CZ - NAVE_A / 2, CZ - NAVE_A / 2 - 3.2, 3.0)
muro_ruina(TX - 1.8, TX + 1.8, CZ - NAVE_A / 2 - 3.2, 0, 2.6)
# El ábside cuadrado, lo más alto que queda en pie.
AX0 = IX + NAVE_L / 2
muro_ruina(AX0, AX0 + 3.4, CZ + 1.8, 0, 4.6)
muro_ruina(AX0, AX0 + 3.4, CZ - 1.8, 0, 4.6)
muro_ruina(AX0 + 3.4, AX0 + 3.4, CZ + 1.8, CZ - 1.8, 4.4)
cajas('iglesia', muros, SILLAR_GASTADO, 1.2)
# La basílica visigoda: solo los cimientos, un palmo sobre la arena.
cimientos = []
for (x0, x1, z0, z1) in ((IX - 9, IX + 9, CZ + 6.5, CZ + 5.9), (IX - 9, IX + 9, CZ - 5.9, CZ - 6.5),
                         (IX - 9, IX - 8.4, CZ + 6.5, CZ - 6.5), (IX + 8.4, IX + 9, CZ + 6.5, CZ - 6.5),
                         (IX - 9, IX + 9, CZ + 2.2, CZ + 1.8), (IX - 9, IX + 9, CZ - 1.8, CZ - 2.2)):
    cimientos.append((x0, x1, z0, z1, NIVEL, NIVEL + 0.35))
cajas('basilica', cimientos, SILLAR_GASTADO, 1.2)

# ==================================================================================
# 4. LA LADERA, EL PARQUE Y EL BALCÓ
# ==================================================================================
# La ladera de césped, con el hueco del anfiteatro.
bm = bmesh.new()
XS = [CORTE + k * 2 for k in range(0, 24)]
ZS = list(range(Z_CERCA, Z_LEJOS - 1, -4))
malla_v = [[bm.verts.new(P(x, z, terreno(x))) for x in XS] for z in ZS]
for i in range(len(ZS) - 1):
    for j in range(len(XS) - 1):
        cx = (XS[j] + XS[j + 1]) / 2
        cz = (ZS[i] + ZS[i + 1]) / 2
        # Fuera del anfiteatro (con un poco de margen para que el muro tape el borde).
        if ((cx - CX) / (B_FUERA + 0.6)) ** 2 + ((cz - CZ) / (A_FUERA + 0.6)) ** 2 < 1:
            continue
        bm.faces.new([malla_v[i][j], malla_v[i][j + 1], malla_v[i + 1][j + 1], malla_v[i + 1][j]])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:
    f.normal_update()
    if f.normal.z < 0:
        f.normal_flip()
uv_mundo(bm, 4)
objeto('suelo-ladera', bm, [CESPED])
# Un camino de tierra que baja del Balcó al anfiteatro, en zigzag.
X_BALCO = CORTE + 46
Y_BALCO = terreno(X_BALCO)
# La terraza del Balcó del Mediterrani con su barandilla de hierro.
caja('balco-terraza', X_BALCO - 1, X_BALCO + 8, -10, -118, Y_BALCO - 0.5, Y_BALCO + 0.15, liso('balco-suelo', 0xd9ccb2, 0.8), 2)
caja('balco-muro', X_BALCO - 1.4, X_BALCO - 1, -10, -118, Y_BALCO - 6, Y_BALCO + 0.15, SILLAR, 2)
barandilla = [(X_BALCO - 1.3, X_BALCO - 1.1, -10, -118, Y_BALCO + 1.05, Y_BALCO + 1.12)]
z = -10
while z > -118:
    barandilla.append((X_BALCO - 1.25, X_BALCO - 1.15, z, z - 0.08, Y_BALCO + 0.15, Y_BALCO + 1.1))
    z -= 0.9
cajas('balco-barandilla', barandilla, HIERRO, 1)

# La ciudad de piedra dorada encima: casas de 3 a 5 plantas, de cara al mar.
PIEDRAS = [0xe6d0a0, 0xdcc08e, 0xefdcb4, 0xd4b88a]
def casa (n, zc, ancho, plantas, x_cara):
    fondo = random.uniform(9, 13)
    y0 = Y_BALCO
    alto = plantas * 3.2
    pared = textura('painted_plaster_wall', 0.95, random.choice(PIEDRAS)) if random.random() < 0.6 else SILLAR
    caja(f'casa{n}', x_cara, x_cara + fondo, zc + ancho / 2, zc - ancho / 2, y0 - 2, y0 + alto, pared, 2.4)
    vent = []
    huecos = max(2, int(ancho // 2.8))
    for p in range(plantas):
        for h in range(huecos):
            zz = zc + ancho / 2 - (h + 0.5) * ancho / huecos
            y = y0 + p * 3.2 + 0.9
            vent.append((x_cara - 0.05, x_cara + 0.02, zz + 0.55, zz - 0.55, y, y + 1.6))
    cajas(f'casa-ventanas{n}', vent, VIDRIO, 1)
    caja(f'casa-tejado{n}', x_cara - 0.3, x_cara + fondo + 0.3, zc + ancho / 2 + 0.3, zc - ancho / 2 - 0.3, y0 + alto, y0 + alto + 0.5, TEJA, 2)
z = -6
n = 0
while z > -170:
    ancho = random.uniform(9, 15)
    casa(n, z - ancho / 2, ancho, random.choice((3, 4, 4, 5)), X_BALCO + 9 + random.uniform(0, 2))
    n += 1
    z -= ancho + random.uniform(0.3, 1.2)

# Pinos piñoneros (copa en paraguas) por la ladera, y alguna palmera.
def pino (x, z):
    y = terreno(x)
    alto = random.uniform(7, 11)
    inclina = random.uniform(-0.15, 0.15)
    bm = bmesh.new()
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.35, radius2=0.22, depth=alto)
    for v in r['verts']:
        v.co.z += alto / 2
        v.co.x += v.co.z * inclina
    t = objeto('pino-tronco', bm, [PINO_TRONCO])
    t.location = P(x, z, y)
    bm = bmesh.new()
    for k in range(4):
        r = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
        rx, rz = random.uniform(-1.8, 1.8), random.uniform(-1.8, 1.8)
        for v in r['verts']:
            v.co.x = v.co.x * random.uniform(3.2, 4.2) + rx + alto * inclina
            v.co.y = v.co.y * random.uniform(3.2, 4.2) + rz
            v.co.z = v.co.z * 1.1 + alto + random.uniform(-0.5, 0.3)
    c = objeto('pino-copa', bm, [PINO_COPA])
    c.location = P(x, z, y)

def palmera (x, z):
    y = terreno(x) if x > CORTE else 0.55
    alto = random.uniform(7, 9.5)
    bm = bmesh.new()
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.3, radius2=0.2, depth=alto)
    for v in r['verts']:
        v.co.z += alto / 2
        v.co.x += (v.co.z / alto) ** 2 * 0.8
    t = objeto('palmera-tronco', bm, [PALMERA_TRONCO])
    t.location = P(x, z, y)
    bm = bmesh.new()
    for k in range(9):
        a = k / 9 * 2 * math.pi
        largo = random.uniform(3.2, 4.2)
        # Una hoja: dos triángulos que caen en arco.
        pts = []
        for s in range(5):
            f = s / 4
            d = largo * f
            pts.append(V((0.8 + math.cos(a) * d, math.sin(a) * d, alto + 0.4 - 1.6 * f * f)))
        for s in range(4):
            ancho = 0.45 * math.sin(math.pi * (s + 0.5) / 4)
            perp = V((-math.sin(a), math.cos(a), 0)) * ancho
            bm.faces.new([bm.verts.new(pts[s] - perp), bm.verts.new(pts[s + 1] - perp),
                          bm.verts.new(pts[s + 1] + perp), bm.verts.new(pts[s] + perp)])
    h = objeto('palmera-hojas', bm, [PALMERA])
    h.location = P(x, z, y)

puestos = 0
intentos = 0
while puestos < 34 and intentos < 600:
    intentos += 1
    x = random.uniform(CORTE + 1.5, X_BALCO - 3)
    z = random.uniform(-4, -150)
    if ((x - CX) / (B_FUERA + 3)) ** 2 + ((z - CZ) / (A_FUERA + 3)) ** 2 < 1:
        continue
    pino(x, z)
    puestos += 1
for z in (-8, -22, -104, -118):
    palmera(17.4, z)

# ==================================================================================
# 5. EL PUERTO AL FONDO
# ==================================================================================
grua = liso('grua', 0x6d7f8f, 0.6, 0.3)
grua_roja = liso('grua-roja', 0xb03a2e, 0.6)
for k, (x, z) in enumerate(((-70, -300), (-40, -305), (-10, -310), (-100, -290))):
    patas = [(x + dx, x + dx + 1.2, z + dz, z + dz - 1.2, 0, 34) for dx in (0, 14) for dz in (0, -16)]
    cajas(f'grua{k}-patas', patas, grua, 3)
    caja(f'grua{k}-viga', x - 30, x + 20, z + 1, z - 17, 34, 37, grua, 3)
    caja(f'grua{k}-cabina', x + 3, x + 11, z - 3, z - 13, 29, 34, grua_roja, 3)
    caja(f'grua{k}-torre', x + 5, x + 9, z - 6, z - 10, 37, 48, grua, 3)
# El muelle y pilas de contenedores.
caja('muelle', -140, 30, -285, -330, -1, 1.2, liso('muelle', 0x8c8984, 0.9), 6)
COLORES = [0xb03a2e, 0x2e6da4, 0x3d8b3d, 0xd9a21b, 0x8e8e8e]
cont = {}
for k in range(60):
    cx = random.uniform(-130, 20)
    cz = random.uniform(-312, -326)
    pisos = random.randint(1, 4)
    color = random.choice(COLORES)
    cont.setdefault(color, []).append((cx, cx + 12, cz, cz - 2.5, 1.2, 1.2 + pisos * 2.6))
for color, lista in cont.items():
    cajas(f'contenedores-{color:06x}', lista, liso(f'contenedor-{color:06x}', color, 0.7), 4)

# ==================================================================================
# 6. COMPROBACIÓN: nada macizo en el paso de los bichos
# ==================================================================================
bpy.context.view_layer.update()
malos = []
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render or o.name.startswith(('suelo', 'mar', 'orilla')):
        continue
    for c in o.bound_box:
        w = o.matrix_world @ V(c)
        if abs(w.x) < LIBRE and -60 < -w.y < 5 and 0.35 < w.z < 4:
            malos.append(o.name)
            break
if malos:
    raise SystemExit('PASO OCUPADO: ' + ', '.join(sorted(set(malos))[:12]))

# ==================================================================================
# 7. FUNDIR Y EXPORTAR
# ==================================================================================
for m in list(cache.values()):
    bpy.data.objects.remove(m)
bpy.ops.object.select_all(action='DESELECT')
vis = [o for o in bpy.data.objects if o.type == 'MESH']
# El suelo va aparte (recibe sombras: el juego lo busca por el nombre «suelo»).
suelos = [o for o in vis if o.name.startswith('suelo')]
resto = [o for o in vis if not o.name.startswith('suelo')]
for grupo, nombre in ((suelos, 'suelo-tarragona'), (resto, 'lugar-tarragona')):
    bpy.ops.object.select_all(action='DESELECT')
    for o in grupo:
        o.select_set(True)
        o.data = o.data.copy()
    bpy.context.view_layer.objects.active = grupo[0]
    bpy.ops.object.join()
    bpy.context.view_layer.objects.active.name = nombre
bpy.ops.object.select_all(action='DESELECT')
total = 0
for o in bpy.data.objects:
    if o.type == 'MESH' and not o.hide_render:
        o.select_set(True)
        total += len(o.data.polygons)
print('CARAS', total, 'MATERIALES', len(bpy.data.materials))
bpy.ops.export_scene.gltf(
    filepath=SALIDA, export_format='GLB', use_selection=True,
    export_apply=True, export_image_format='JPEG', export_jpeg_quality=80,
    export_yup=True, export_lights=False, export_cameras=False, export_animations=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7
)
print('EXPORTADO', SALIDA, os.path.getsize(SALIDA))
