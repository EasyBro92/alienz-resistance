# El mapa de PRUEBA de la Guerra civil (29/09/2026).
#   blender -b -P herramientas/blender/prueba_mapa.py
#
# Isidro: «empieza por guerra civil, crea un mapa aparte que se llame prueba,
# solo para probarlo». Es el mismo pueblo partido por la carretera, pero hecho
# con piezas de paquetes libres (CC0) en vez de cajas por código:
#   · Kenney City Kit (Commercial y Suburban): edificios y casas.
#   · Kenney City Kit (Roads): la carretera que cruza.
#   · Kenney Car Kit: coches aparcados.
#   · Quaternius Toon Shooter Game Kit: sacos, barreras, contenedores, coche
#     destrozado, escombros, farolas y neumáticos.
# Los paquetes viven en herramientas/paquetes/ (fuera de git).
#
# Las medidas son las de src/guerra/campo.js: bases en z = 10 (azul) y -40
# (roja), carretera en z = -15, y NADA macizo entre x = -6,6 y 6,6, que es por
# donde se anda. Se escribe en coordenadas del juego (x, z) y `P` las pasa a las
# de Blender (el juego mira a -z; Blender tiene el suelo en x-y).

import bpy, os, math, random, mathutils

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAQ = os.path.join(RAIZ, 'herramientas', 'paquetes')
KEN = os.path.join(PAQ, 'kenney')
TOON = os.path.join(PAQ, 'quaternius', 'toon-shooter', 'Toon Shooter Game Kit - Dec 2022', 'Environment', 'glTF')
SALIDA = os.path.join(RAIZ, 'herramientas', 'paquetes', 'lugar-prueba-kenney.glb')  # para el otro juego: ya no va en AlienZ

BASE_AZUL, BASE_ROJA, CARRETERA = 10.0, -40.0, -15.0
LIBRE = 6.6

# Escalas: la ciudad de Kenney está en miniatura (un bloque = 1) y sus coches
# en otra; los objetos del Toon Shooter van a la talla de su soldado (unos 2,4
# de alto, que en el juego mide 1,7).
K_CIUDAD = 6.0
K_COCHE = 1.65
K_TOON = 0.7

random.seed(12)
bpy.ops.wm.read_factory_settings(use_empty=True)

def P (x, z, y=0.0):
    return mathutils.Vector((x, -z, y))

def kenney (kit, nombre):
    return os.path.join(KEN, kit, 'Models', 'GLB format', nombre + '.glb')

cache = {}
def poner (archivo, x, z, giro=0.0, escala=1.0, y=0.0):
    """Importa (o copia si ya se importó) un modelo y lo coloca. `giro` en
    grados alrededor de la vertical, como en el juego (0 = mirando a -z)."""
    if archivo not in cache:
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=archivo)
        nuevos = [o for o in bpy.data.objects if o not in antes]
        # Todo bajo un vacío para moverlo de una pieza, y con las transformaciones
        # de dentro ya aplicadas.
        mallas = [o for o in nuevos if o.type == 'MESH']
        for o in nuevos:
            if o.type != 'MESH':
                continue
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
        for o in nuevos:
            if o.type != 'MESH':
                bpy.data.objects.remove(o)
        bpy.ops.object.select_all(action='DESELECT')
        for o in mallas:
            o.select_set(True)
        bpy.context.view_layer.objects.active = mallas[0]
        if len(mallas) > 1:
            bpy.ops.object.join()
        molde = bpy.context.view_layer.objects.active
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        molde.hide_render = True
        molde.hide_set(True)
        cache[archivo] = molde
    molde = cache[archivo]
    o = molde.copy()
    o.data = molde.data
    o.hide_render = False
    bpy.context.collection.objects.link(o)
    o.location = P(x, z, y)
    o.rotation_euler = (0, 0, math.radians(giro))
    o.scale = (escala, escala, escala)
    return o

def plano (nombre, x0, x1, z0, z1, color, y=0.0):
    me = bpy.data.meshes.new(nombre)
    v = [P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y)]
    me.from_pydata(v, [], [(0, 1, 2, 3)])
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    r, g, b = [((color >> s) & 255) / 255 for s in (16, 8, 0)]
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (r, g, b, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    me.materials.append(mat)
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    return o

# --- suelo ---------------------------------------------------------------------
plano('suelo-tierra', -90, 90, 60, -110, 0x7c6b4e, -0.02)
plano('suelo-calle', -9.4, 9.4, BASE_AZUL + 14, BASE_ROJA - 14, 0x847a6c, 0.0)
# Aceras un palmo más altas, de lado a lado de la calle.
for lado in (-1, 1):
    plano(f'acera{lado}', lado * 6.9, lado * 9.4, BASE_AZUL + 14, BASE_ROJA - 14, 0xa39a8c, 0.05) if lado > 0 else \
        plano(f'acera{lado}', lado * 9.4, lado * 6.9, BASE_AZUL + 14, BASE_ROJA - 14, 0xa39a8c, 0.05)

# --- la carretera que cruza: tramos de Kenney a lo ancho ---------------------------
ANCHO_VIA = 7.0
for i in range(-12, 13):
    x = i * ANCHO_VIA
    # La pieza de Kenney va a lo largo de su eje y: se gira para que cruce.
    poner(kenney('kenney_city-kit-roads', 'road-straight'), x, CARRETERA, 90, ANCHO_VIA, 0.01)

# --- los barrios ------------------------------------------------------------------
# Tiendas y bloques de la ciudad cerca de la carretera; casas con jardín hacia
# las plazas. Todos de cara a la calle.
tiendas = 'abcdefghijklmn'
casas = 'abcdefghijklmnopqrstu'
for lado in (-1, 1):
    giro = 90 if lado < 0 else -90       # la fachada, hacia el centro
    for (z0, z1) in ((BASE_AZUL + 12, CARRETERA + 6), (CARRETERA - 6, BASE_ROJA - 12)):
        z = z0
        while z > z1:
            cerca = abs(z - CARRETERA) < 16
            if cerca:
                archivo = kenney('kenney_city-kit-commercial_2.1', 'building-' + random.choice(tiendas))
                fondo = 5.8
            else:
                archivo = kenney('kenney_city-kit-suburban_20', 'building-type-' + random.choice(casas))
                fondo = 7.6
            poner(archivo, lado * 13.2, z - fondo / 2, giro, K_CIUDAD)
            z -= fondo + random.uniform(0.3, 1.2)
        # Árboles detrás.
        for zz in range(int(z0), int(z1), -6):
            poner(kenney('kenney_city-kit-suburban_20', 'tree-large'), lado * random.uniform(20, 26), zz, random.uniform(0, 360), K_CIUDAD)

# --- coches aparcados en el bordillo (fuera del paso) -----------------------------
coches = ['sedan', 'van', 'taxi', 'hatchback-sports', 'suv', 'delivery', 'police', 'truck']
for lado in (-1, 1):
    for z in (BASE_AZUL - 4, BASE_AZUL - 13, CARRETERA + 8, CARRETERA - 9, BASE_ROJA + 14, BASE_ROJA + 5):
        if random.random() < 0.25:
            continue
        poner(kenney('kenney_car-kit', random.choice(coches)), lado * 7.9, z, 0 if lado < 0 else 180, K_COCHE)

# --- tierra de nadie: lo que quedó en la carretera --------------------------------
toon = lambda n: os.path.join(TOON, n + '.gltf')
for x, z, g in ((-10.5, CARRETERA + 1.2, 70), (11.5, CARRETERA - 1.5, -60), (-22, CARRETERA - 0.6, 95), (24, CARRETERA + 0.8, 80)):
    poner(toon('Debris_BrokenCar'), x, z, g, K_TOON)
for x, z in ((-8.4, CARRETERA + 4.2), (8.4, CARRETERA - 4.2), (-16, CARRETERA - 4.4), (17, CARRETERA + 4.4)):
    poner(toon('Debris_Pile'), x, z, random.uniform(0, 360), K_TOON)
for x, z in ((-8.2, CARRETERA - 4.0), (8.3, CARRETERA + 4.1)):
    poner(toon('Debris_Tires'), x, z, random.uniform(0, 360), K_TOON)
for x, z in ((-13, CARRETERA + 5.5), (13.5, CARRETERA - 5.8)):
    poner(toon('Container_Long'), x, z, 90 + random.uniform(-8, 8), K_TOON)
for x, z in ((-9.8, CARRETERA - 5.2), (9.8, CARRETERA + 5.2), (-30, CARRETERA + 4.8), (31, CARRETERA - 4.8)):
    poner(kenney('kenney_city-kit-roads', 'construction-barrier'), x, z, random.uniform(-20, 20), K_CIUDAD)

# Farolas a lo largo de las aceras.
for lado in (-1, 1):
    for z in range(int(BASE_AZUL + 6), int(BASE_ROJA - 6), -9):
        if abs(z - CARRETERA) < 6:
            continue
        poner(toon('StreetLight'), lado * 8.9, z, 0 if lado < 0 else 180, K_TOON)

# --- las bases: la plaza de cada barrio, fortificada -------------------------------
# Detrás de la línea: un edificio alto hecho cuartel, contenedores a los lados,
# barreras y sacos. Delante, sacos solo en las esquinas (el frente queda libre).
for bando, zb, hacia in (('azul', BASE_AZUL, 1), ('rojo', BASE_ROJA, -1)):
    fondo = zb + hacia * 8
    plano(f'plaza-{bando}', -16, 16, zb + hacia * 1, zb + hacia * 16, 0x8e877b, 0.02)
    poner(kenney('kenney_city-kit-commercial_2.1', 'building-skyscraper-' + ('a' if bando == 'azul' else 'b')), 0, fondo + hacia * 2, 0 if hacia > 0 else 180, K_CIUDAD * 0.8)
    for x in (-10, 10):
        poner(toon('Container_Long'), x, zb + hacia * 3.5, 90, K_TOON)
    for x in (-8.4, 8.4):
        poner(toon('SackTrench'), x, zb + hacia * 0.3, 0, K_TOON)
    for x in (-13.5, 13.5):
        poner(toon('Barrier_Large'), x, zb + hacia * 1.2, 0, K_TOON)
    for x, z in ((-6.5, fondo), (6.5, fondo)):
        poner(toon('Crate'), x, z, random.uniform(0, 90), K_TOON)
    poner(toon('ExplodingBarrel'), -8.5, zb + hacia * 5, 0, K_TOON)
    poner(toon('GasTank'), 8.5, zb + hacia * 6, 0, K_TOON)

# --- nada macizo en el paso ---------------------------------------------------------
# Como `pasillo-libre.mjs` en la campaña: se mira cada pieza colocada y se niega a
# exportar si algo entra entre x = ±6,6 dentro del campo.
# Sin esto las posiciones de las últimas piezas aún no están calculadas y
# salen todas en el origen, o sea en mitad del paso.
bpy.context.view_layer.update()
malos = []
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render or o.name.startswith(('suelo', 'acera', 'plaza')) or 'road' in (o.data.name or ''):
        continue
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        gz = -w.y
        if abs(w.x) < LIBRE and BASE_ROJA - 0.5 < gz < BASE_AZUL + 0.5 and w.z > 0.2:
            malos.append(o.name)
            break
if malos:
    raise SystemExit('PASO OCUPADO: ' + ', '.join(sorted(set(malos))[:12]))

# --- fundir y exportar ---------------------------------------------------------------
# Lo que ahoga al móvil son las llamadas de dibujado: todo en una malla (que
# luego el exportador parte por material).
for m in list(cache.values()):
    bpy.data.objects.remove(m)
bpy.ops.object.select_all(action='DESELECT')
vis = [o for o in bpy.data.objects if o.type == 'MESH']
for o in vis:
    o.select_set(True)
    o.data = o.data.copy()          # los que comparten malla no se pueden fundir tal cual
bpy.context.view_layer.objects.active = vis[0]
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.object.join()
unido = bpy.context.view_layer.objects.active
unido.name = 'lugar-prueba'
print('CARAS', len(unido.data.polygons), 'MATERIALES', len(unido.data.materials))
bpy.ops.export_scene.gltf(
    filepath=SALIDA, export_format='GLB', use_selection=True,
    export_apply=True, export_image_format='AUTO',
    export_yup=True, export_lights=False, export_cameras=False, export_animations=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7
)
print('EXPORTADO', SALIDA, os.path.getsize(SALIDA))
