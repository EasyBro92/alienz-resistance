# El mapa de PRUEBA de la Guerra civil, segunda versión (30/09/2026).
#   blender -b -P herramientas/blender/prueba_mapa.py
#
# La primera (Kenney y Quaternius, ahora en prueba_mapa_kenney.py) no era el
# estilo de AlienZ: Isidro la guarda para otro juego. Esta es el mismo pueblo
# partido por la carretera, con material de Poly Haven (CC0) «no ultra
# realista, que mantenga mi estilo»:
#   · texturas de verdad para suelos, paredes y tejados;
#   · objetos a talla real: barreras, cajas militares, bidones, farolas...
#   · los edificios son cajas hechas aquí, con esas texturas y ventanas.
# El material vive en herramientas/paquetes/polyhaven/ (fuera de git).
#
# Las medidas son las de src/guerra/campo.js: bases en z = 10 (azul) y -40
# (roja), carretera en z = -15, y NADA macizo entre x = -6,6 y 6,6, que es por
# donde se anda. Se escribe en coordenadas del juego (x, z) y `P` las pasa a las
# de Blender (el juego mira a -z; Blender tiene el suelo en x-y). 1 = 1 metro.

import bpy, bmesh, os, math, random, mathutils

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PH = os.path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')
SALIDA = os.path.join(RAIZ, 'public', 'models', 'lugar-prueba.glb')
TMP = os.path.join(PH, '_reducidas')
os.makedirs(TMP, exist_ok=True)

BASE_AZUL, BASE_ROJA, CARRETERA = 10.0, -40.0, -15.0
LIBRE = 6.6
# Lo que pesan las texturas en el móvil: suelos y paredes a 512, objetos a 256.
LADO_SUELO, LADO_OBJETO = 512, 256

random.seed(30)
bpy.ops.wm.read_factory_settings(use_empty=True)

def P (x, z, y=0.0):
    return mathutils.Vector((x, -z, y))

# --- materiales con las texturas --------------------------------------------------
imagenes = {}
def imagen (ruta, lado, color=True):
    if ruta not in imagenes:
        # Se guarda ya reducida y en JPEG al 75: si no, el exportador mete el
        # relieve casi sin comprimir (1-1,5 MB cada uno).
        im = bpy.data.images.load(ruta)
        if im.size[0] > lado:
            im.scale(lado, lado)
        chica = os.path.join(TMP, f'{lado}-' + os.path.basename(ruta))
        esc = bpy.context.scene.render.image_settings
        esc.file_format, esc.quality, esc.color_mode = 'JPEG', 75, 'RGB'
        im.save_render(chica)
        bpy.data.images.remove(im)
        im = bpy.data.images.load(chica)
        if not color:
            im.colorspace_settings.name = 'Non-Color'
        imagenes[ruta] = im
    return imagenes[ruta]

mats = {}
def textura (nombre, rugosidad=0.9, tinte=None):
    """Material con el color y el relieve de una textura de Poly Haven."""
    clave = (nombre, tinte)
    if clave in mats:
        return mats[clave]
    d = os.path.join(PH, 'texturas', nombre)
    m = bpy.data.materials.new(nombre + ('' if tinte is None else f'-{tinte:06x}'))
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bsdf = n['Principled BSDF']
    col = n.new('ShaderNodeTexImage')
    col.image = imagen(os.path.join(d, f'{nombre}_diff_1k.jpg'), LADO_SUELO)
    if tinte is None:
        l.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        # Un mismo yeso en varios colores de fachada.
        mez = n.new('ShaderNodeMix')
        mez.data_type = 'RGBA'
        mez.blend_type = 'MULTIPLY'
        mez.inputs['Factor'].default_value = 1
        l.new(col.outputs['Color'], mez.inputs['A'])
        mez.inputs['B'].default_value = [((tinte >> s) & 255) / 255 for s in (16, 8, 0)] + [1]
        l.new(mez.outputs['Result'], bsdf.inputs['Base Color'])
    rel = n.new('ShaderNodeTexImage')
    rel.image = imagen(os.path.join(d, f'{nombre}_nor_gl_1k.jpg'), LADO_SUELO, False)
    nm = n.new('ShaderNodeNormalMap')
    l.new(rel.outputs['Color'], nm.inputs['Color'])
    l.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = rugosidad
    mats[clave] = m
    return m

def liso (nombre, color, rugosidad=0.6, metal=0.0):
    if nombre in mats:
        return mats[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = [((color >> s) & 255) / 255 for s in (16, 8, 0)] + [1]
    b.inputs['Roughness'].default_value = rugosidad
    b.inputs['Metallic'].default_value = metal
    mats[nombre] = m
    return m

# --- geometría: todo con UV «de mundo» (un metro = 1 / baldosa) --------------------
def malla (nombre, caras, mat, baldosa):
    """`caras`: listas de puntos de Blender. UV según la cara: en planta para las
    horizontales y a lo largo de la pared para las verticales."""
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    for pts in caras:
        f = bm.faces.new([bm.verts.new(p) for p in pts])
        nrm = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized()
        for lp in f.loops:
            c = lp.vert.co
            if abs(nrm.z) > 0.7:
                lp[uv].uv = (c.x / baldosa, c.y / baldosa)
            elif abs(nrm.x) > abs(nrm.y):
                lp[uv].uv = (c.y / baldosa, c.z / baldosa)
            else:
                lp[uv].uv = (c.x / baldosa, c.z / baldosa)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    return o

def plano (nombre, x0, x1, z0, z1, mat, baldosa, y=0.0):
    return malla(nombre, [[P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y)]], mat, baldosa)

def caja (nombre, x0, x1, z0, z1, y0, y1, mat, baldosa, suelo=False):
    a, b, c, d = P(x0, z0), P(x1, z0), P(x1, z1), P(x0, z1)
    abajo = lambda v: mathutils.Vector((v.x, v.y, y0))
    arriba = lambda v: mathutils.Vector((v.x, v.y, y1))
    caras = [[abajo(p), abajo(q), arriba(q), arriba(p)] for p, q in ((a, b), (b, c), (c, d), (d, a))]
    caras.append([arriba(a), arriba(b), arriba(c), arriba(d)])
    if suelo:
        caras.append([abajo(d), abajo(c), abajo(b), abajo(a)])
    o = malla(nombre, caras, mat, baldosa)
    # Que las normales miren afuera sea cual sea el orden de las esquinas.
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    return o

# --- objetos de Poly Haven -----------------------------------------------------------
cache = {}
# Caras que se quedan de cada objeto (1.200 si no se dice).
TOPE_CARAS = {'covered_car': 3000, 'street_lamp_01': 600, 'modular_chainlink_fence': 400, 'cement_bag': 300, 'trashbag': 400}
def poner (nombre, x, z, giro=0.0, escala=1.0, y=0.0):
    """Importa (o copia si ya se importó) un modelo y lo coloca. `giro` en
    grados, como en el juego (0 = mirando a -z)."""
    if nombre not in cache:
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(PH, 'modelos', nombre, f'{nombre}_1k.gltf'))
        nuevos = [o for o in bpy.data.objects if o not in antes]
        bpy.context.view_layer.update()
        mallas = [o for o in nuevos if o.type == 'MESH']
        for o in mallas:
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
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
        # Vienen para verlos de cerca (hasta 200.000 caras); desde la cámara del
        # juego basta con unas pocas: se adelgazan hasta TOPE_CARAS.
        caras = len(molde.data.polygons)
        if caras > TOPE_CARAS.get(nombre, 1200):
            d = molde.modifiers.new('menos', 'DECIMATE')
            d.ratio = TOPE_CARAS.get(nombre, 1200) / caras
            bpy.ops.object.modifier_apply(modifier='menos')
        print('OBJETO', nombre, caras, '->', len(molde.data.polygons))
        molde.hide_render = True
        molde.hide_set(True)
        cache[nombre] = molde
    molde = cache[nombre]
    o = molde.copy()
    o.data = molde.data
    o.hide_render = False
    bpy.context.collection.objects.link(o)
    o.location = P(x, z, y)
    o.rotation_euler = (0, 0, math.radians(giro))
    o.scale = (escala, escala, escala)
    return o

# --- suelo ----------------------------------------------------------------------------
NORTE, SUR = BASE_AZUL + 16, BASE_ROJA - 16
plano('suelo-tierra', -90, 90, 60, -110, textura('brown_mud_dry', 1.0), 4, -0.02)
plano('suelo-calle', -6.9, 6.9, NORTE, SUR, textura('cobblestone_floor_04', 0.9), 2.5, 0.0)
for lado in (-1, 1):
    x0, x1 = sorted((lado * 6.9, lado * 9.4))
    caja(f'acera{lado}', x0, x1, NORTE, SUR, -0.1, 0.12, textura('pavement_02', 0.85), 2.0)
# La carretera que cruza, de asfalto, con las líneas pintadas.
plano('suelo-carretera', -90, 90, CARRETERA + 4, CARRETERA - 4, textura('asphalt_02', 0.8), 4, 0.01)
blanco = liso('pintura', 0xd9d4c4, 0.7)
for i in range(-30, 31):
    x = i * 3
    if abs(x) < 8:
        continue
    plano(f'raya{i}', x - 0.9, x + 0.9, CARRETERA + 0.08, CARRETERA - 0.08, blanco, 10, 0.02)

# --- los barrios -------------------------------------------------------------------------
# Casas de dos y tres plantas de cara a la calle, de ladrillo o yeso de colores,
# con ventanas oscuras, puertas y tejado de teja o azotea.
YESOS = [0xe8dcc0, 0xd9b48a, 0xc9c2b0, 0xe0c9a6, 0xb8c4c0, 0xd6a58a]
vidrio = liso('ventana', 0x1c2226, 0.25)
madera = liso('puerta', 0x4a3424, 0.8)
marco = liso('marco', 0xcfc8b8, 0.8)
teja = textura('ceramic_roof_01', 0.9)
azotea = textura('concrete_floor_worn_001', 0.95)

def casa (n, lado, zc, ancho, fondo, plantas):
    x_cara = lado * 10.6                      # la fachada, a 1,2 del bordillo
    x_atras = lado * (10.6 + fondo)
    x0, x1 = sorted((x_cara, x_atras))
    z0, z1 = zc + ancho / 2, zc - ancho / 2
    alto = plantas * 3.1 + 0.4
    pared = textura('red_brick', 0.9) if random.random() < 0.4 else textura('painted_plaster_wall', 0.95, random.choice(YESOS))
    caja(f'casa{n}', x0, x1, z0, z1, 0, alto, pared, 2.2)
    # Ventanas y puerta, un dedo por delante de la fachada.
    xv = x_cara - lado * 0.04
    huecos = max(2, int(ancho // 2.6))
    for p in range(plantas):
        for h in range(huecos):
            zz = z0 - (h + 0.5) * ancho / huecos
            if p == 0 and h == huecos // 2:
                caja(f'puerta{n}', xv - 0.02, xv + 0.02, zz + 0.6, zz - 0.6, 0, 2.3, madera, 1)
                continue
            y = p * 3.1 + (0.9 if p == 0 else 1.0)
            caja(f'marco{n}-{p}-{h}', xv - 0.03, xv + 0.03, zz + 0.62, zz - 0.62, y - 0.08, y + 1.58, marco, 1)
            caja(f'vent{n}-{p}-{h}', xv - lado * 0.03 - 0.02, xv - lado * 0.03 + 0.02, zz + 0.52, zz - 0.52, y, y + 1.5, vidrio, 1)
    if random.random() < 0.55:
        # Tejado a dos aguas, la caída hacia la calle.
        cumbre = alto + 2.2
        xm = (x0 + x1) / 2
        caras = [
            [P(x_cara, z0, alto), P(x_cara, z1, alto), P(xm, z1, cumbre), P(xm, z0, cumbre)],
            [P(x_atras, z1, alto), P(x_atras, z0, alto), P(xm, z0, cumbre), P(xm, z1, cumbre)],
        ]
        malla(f'tejado{n}', caras, teja, 2.0)
        for zz in (z0, z1):
            malla(f'hastial{n}{zz}', [[P(x_cara, zz, alto), P(x_atras, zz, alto), P(xm, zz, cumbre)]], pared, 2.2)
    else:
        caja(f'azotea{n}', x0 - 0.15, x1 + 0.15, z0 + 0.15, z1 - 0.15, alto, alto + 0.35, azotea, 2.0)

n = 0
for lado in (-1, 1):
    for (za, zb) in ((NORTE - 1, CARRETERA + 5), (CARRETERA - 5, SUR + 1)):
        z = za
        while z - 6 > zb:
            ancho = random.uniform(6.5, 9.5)
            ancho = min(ancho, z - zb)
            casa(n, lado, z - ancho / 2, ancho, random.uniform(7, 9), random.choice((2, 2, 3)))
            n += 1
            z -= ancho + random.uniform(0.2, 1.6)

# --- la calle: farolas, bancos, papeleras y cosas en la acera (fuera del paso) ----------
for lado in (-1, 1):
    giro = 90 if lado < 0 else -90
    for z in range(int(NORTE - 3), int(SUR + 3), -9):
        if abs(z - CARRETERA) < 6:
            continue
        poner('street_lamp_01', lado * 8.9, z, giro)
    for z in (BASE_AZUL - 9, CARRETERA + 11, CARRETERA - 12, BASE_ROJA + 8):
        cosa = random.choice(('metal_trash_can', 'painted_wooden_bench', 'fire_hydrant', 'utility_box_01', 'trashbag'))
        poner(cosa, lado * 8.3, z + random.uniform(-1.5, 1.5), giro)
# Coches tapados con lona, aparcados en la carretera que cruza, a los lados.
for x, z, g in ((-14, CARRETERA + 2, 92), (19, CARRETERA - 2.2, -86), (-31, CARRETERA - 2, 88), (35, CARRETERA + 2, 95)):
    poner('covered_car', x, z, g)

# --- tierra de nadie: la carretera, cortada a los lados -------------------------------------
for x, z, g in ((-8.6, CARRETERA + 3.6, 90), (8.6, CARRETERA - 3.6, 90), (-11.5, CARRETERA - 3.4, 80), (11.8, CARRETERA + 3.4, 100)):
    poner('concrete_road_barrier', x, z, g)
for x, z in ((-9.6, CARRETERA + 1), (9.8, CARRETERA - 1.2), (-25, CARRETERA + 0.5)):
    poner('wooden_barrels_01', x, z, random.uniform(0, 360))
for x, z in ((-8.1, CARRETERA - 1.4), (8.2, CARRETERA + 1.6)):
    poner('trashbag', x, z, random.uniform(0, 360))

# --- las bases: la plaza de cada barrio, fortificada -----------------------------------------
# Hormigón en el suelo; detrás, el cuartel (un bloque de hormigón más alto); a
# los lados cajas militares, munición, bidones y sacos. Delante, sacos solo en
# las esquinas: el frente queda libre.
hormigon = textura('cracked_concrete_wall', 0.95)
for bando, zb, hacia in (('azul', BASE_AZUL, 1), ('rojo', BASE_ROJA, -1)):
    za, zz = zb + hacia * 1, zb + hacia * 16
    plano(f'plaza-{bando}', -16, 16, max(za, zz), min(za, zz), textura('concrete_floor_worn_001', 0.95), 3.0, 0.03)
    fondo = zb + hacia * 11
    z0, z1 = sorted((fondo, fondo + hacia * 7), reverse=True)
    caja(f'cuartel-{bando}', -7, 7, z0, z1, 0, 9, hormigon, 3.0)
    caja(f'cuartel-techo-{bando}', -7.2, 7.2, z0 + 0.2, z1 - 0.2, 9, 9.4, azotea, 2.0)
    # La cara que mira al campo, con ventanas estrechas en dos plantas y el portón.
    zf = fondo - hacia * 0.04
    for y in (3.4, 6.4):
        for x in (-5.5, -3.3, -1.1, 1.1, 3.3, 5.5):
            caja(f'cuartel-marco-{bando}{x}{y}', x - 0.55, x + 0.55, zf + 0.03, zf - 0.03, y - 0.1, y + 1.5, marco, 1)
            caja(f'cuartel-vent-{bando}{x}{y}', x - 0.45, x + 0.45, zf - hacia * 0.03 + 0.02, zf - hacia * 0.03 - 0.02, y, y + 1.4, vidrio, 1)
    caja(f'cuartel-porton-{bando}', -1.6, 1.6, zf + 0.03, zf - 0.03, 0, 2.8, liso('porton', 0x3d4a3a, 0.7, 0.3), 1)
    for x in (-8.4, 8.4):
        for k in range(3):
            poner('cement_bag', x + (k - 1) * 0.55, zb + hacia * 0.3, 0)
            poner('cement_bag', x + (k - 0.5) * 0.55, zb + hacia * 0.3, 0, 1.0, 0.22)
    for x in (-12.5, 12.5):
        poner('concrete_road_barrier', x, zb + hacia * 1.2, 0)
        poner('modular_chainlink_fence', x, zb + hacia * 9, 90)
    for x, z, cosa in ((-8, zb + hacia * 5, 'wooden_military_crate'), (-9.5, zb + hacia * 6.5, 'old_military_crate'),
                       (8.3, zb + hacia * 5.2, 'ammo_box'), (9.4, zb + hacia * 6, 'metal_jerrycan'),
                       (10.5, zb + hacia * 4, 'barrel_03'), (-11, zb + hacia * 3.8, 'wooden_crate_01')):
        poner(cosa, x, z, random.uniform(0, 360) if cosa != 'wooden_military_crate' else 90)

# --- nada macizo en el paso ------------------------------------------------------------------
bpy.context.view_layer.update()
malos = []
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render or o.name.startswith(('suelo', 'acera', 'plaza', 'raya')):
        continue
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        gz = -w.y
        if abs(w.x) < LIBRE and BASE_ROJA - 0.5 < gz < BASE_AZUL + 0.5 and w.z > 0.2:
            malos.append(o.name)
            break
if malos:
    raise SystemExit('PASO OCUPADO: ' + ', '.join(sorted(set(malos))[:12]))

# --- fundir y exportar -------------------------------------------------------------------------
for m in list(cache.values()):
    bpy.data.objects.remove(m)
bpy.ops.object.select_all(action='DESELECT')
vis = [o for o in bpy.data.objects if o.type == 'MESH']
for o in vis:
    o.select_set(True)
    o.data = o.data.copy()
bpy.context.view_layer.objects.active = vis[0]
bpy.ops.object.join()
unido = bpy.context.view_layer.objects.active
unido.name = 'lugar-prueba'
print('CARAS', len(unido.data.polygons), 'MATERIALES', len(unido.data.materials))
bpy.ops.export_scene.gltf(
    filepath=SALIDA, export_format='GLB', use_selection=True,
    export_apply=True, export_image_format='JPEG', export_jpeg_quality=80,
    export_yup=True, export_lights=False, export_cameras=False, export_animations=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7
)
print('EXPORTADO', SALIDA, os.path.getsize(SALIDA))
