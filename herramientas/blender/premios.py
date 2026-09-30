# Las fotos de los premios del cofre (30/09/2026).
#   blender -b -P herramientas/blender/premios.py
#
# Isidro, con un vídeo de las cajas de Counter-Strike: «los billetes dentro
# tienen que tener una estética más real, igual que las monedas». Se hacen como
# en ese juego: objetos de verdad renderizados con luz de estudio, en imagen.
# En el móvil no cuestan nada (una foto por carta) y se ven mejor que cualquier
# 3D en directo.
#
# Texturas: herramientas/premios/dibujos.js las dibuja en el navegador y las deja
# en vistas/; se copian a herramientas/premios/ (premio-billete.png,
# premio-moneda.png, premio-emblema.png), que es de donde las lee este guion.
# La caja militar es la de Poly Haven (CC0, herramientas/paquetes/polyhaven/).
#
# Sale a public/premios/<nombre>.webp con fondo transparente:
#   billetes-1..5  de unos pocos sueltos a un montón de fajos
#   monedas-1..3   de tres monedas a un montón
#   caja-militar, caja-alien  (carta) y caja-*-grande (para verla abierta)

import bpy, bmesh, os, math, random, mathutils

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VISTAS = os.path.join(RAIZ, 'herramientas', 'premios')   # copiadas de vistas/ para que estén en git
PH = os.path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')
SALIDA = os.path.join(RAIZ, 'public', 'premios')
os.makedirs(SALIDA, exist_ok=True)
random.seed(7)
V = mathutils.Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene
esc.render.engine = 'CYCLES'
esc.cycles.samples = 96
esc.cycles.use_denoising = True
esc.render.film_transparent = True
esc.view_settings.view_transform = 'AgX'
esc.view_settings.look = 'AgX - Medium High Contrast'
esc.view_settings.exposure = -0.35

# --- luz de estudio ------------------------------------------------------------------
mundo = bpy.data.worlds.new('estudio')
esc.world = mundo
mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.34, 0.38, 1)
mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.45

def luz (nombre, pos, fuerza, tam, color=(1, 1, 1)):
    d = bpy.data.lights.new(nombre, 'AREA')
    d.energy, d.size, d.color = fuerza, tam, color
    o = bpy.data.objects.new(nombre, d)
    esc.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (V((0, 0, 0)) - V(pos)).to_track_quat('-Z', 'Y').to_euler()
    return o

luz('clave', (-3, -4, 5), 900, 3)
luz('relleno', (5, -2, 2), 250, 4, (0.85, 0.9, 1))
luz('recorte', (1, 5, 4), 600, 2)
# Cajas de luz que solo ven los reflejos: sin ellas el oro sale plano o negro.
for i, (p, f) in enumerate((((-2.5, -3, 3), 6), ((3, -1, 2.5), 3), ((0, 3, 3.5), 4))):
    bpy.ops.mesh.primitive_plane_add(size=3, location=p)
    ref = bpy.context.object
    ref.name = f'reflejo{i}'
    ref.rotation_euler = (V((0, 0, 0)) - V(p)).to_track_quat('Z', 'Y').to_euler()
    m = bpy.data.materials.new(f'reflejo{i}')
    m.use_nodes = True
    n = m.node_tree.nodes
    n.remove(n['Principled BSDF'])
    em = n.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = f
    m.node_tree.links.new(em.outputs[0], n['Material Output'].inputs[0])
    ref.data.materials.append(m)
    ref.visible_camera = False
    ref.visible_shadow = False

cam_d = bpy.data.cameras.new('cam')
cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_d)
esc.collection.objects.link(cam)
esc.camera = cam

# --- materiales ----------------------------------------------------------------------------
def material (nombre, color=(0.8, 0.8, 0.8), rug=0.5, metal=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = metal
    return m

def img (nombre, color=True):
    im = bpy.data.images.load(os.path.join(VISTAS, nombre), check_existing=True)
    if not color:
        im.colorspace_settings.name = 'Non-Color'
    return im

# El billete: la cara con la textura y un poco de relieve de papel.
def mat_billete ():
    m = material('billete', rug=0.75)
    n, l = m.node_tree.nodes, m.node_tree.links
    t = n.new('ShaderNodeTexImage'); t.image = img('premio-billete.png')
    # Con la luz de estudio el papel se lavaba casi a blanco: se le da el verde
    # de los billetes de verdad multiplicando.
    tinte = n.new('ShaderNodeMix'); tinte.data_type = 'RGBA'; tinte.blend_type = 'MULTIPLY'
    tinte.inputs['Factor'].default_value = 1; tinte.inputs['B'].default_value = (0.62, 0.8, 0.58, 1)
    l.new(t.outputs['Color'], tinte.inputs['A'])
    l.new(tinte.outputs['Result'], n['Principled BSDF'].inputs['Base Color'])
    ruido = n.new('ShaderNodeTexNoise'); ruido.inputs['Scale'].default_value = 400
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
    l.new(ruido.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], n['Principled BSDF'].inputs['Normal'])
    return m
MB = mat_billete()
# Los cantos del fajo: rayas finas de hojas apiladas.
def mat_canto ():
    m = material('canto', (0.78, 0.83, 0.72), 0.8)
    n, l = m.node_tree.nodes, m.node_tree.links
    coord = n.new('ShaderNodeTexCoord')
    ola = n.new('ShaderNodeTexWave'); ola.wave_type = 'BANDS'; ola.bands_direction = 'Z'
    ola.inputs['Scale'].default_value = 90; ola.inputs['Distortion'].default_value = 2
    l.new(coord.outputs['Object'], ola.inputs['Vector'])
    rampa = n.new('ShaderNodeValToRGB')
    rampa.color_ramp.elements[0].color = (0.55, 0.62, 0.5, 1)
    rampa.color_ramp.elements[1].color = (0.86, 0.9, 0.8, 1)
    l.new(ola.outputs['Fac'], rampa.inputs['Fac'])
    l.new(rampa.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.3
    l.new(ola.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], n['Principled BSDF'].inputs['Normal'])
    return m
MC = mat_canto()
MFAJA = material('faja', (0.72, 0.55, 0.3), 0.6)

# El oro de las monedas: relieve de la cara en las tapas y estrías en el canto.
def mat_oro ():
    m = material('oro', (1.0, 0.72, 0.3), 0.22, 1.0)
    n, l = m.node_tree.nodes, m.node_tree.links
    coord = n.new('ShaderNodeTexCoord')
    cara = n.new('ShaderNodeTexImage'); cara.image = img('premio-moneda.png', False)
    cara.extension = 'CLIP'
    l.new(coord.outputs['Generated'], cara.inputs['Vector'])
    # La normal de la PROPIA moneda: con la del mundo, una moneda inclinada
    # confundía la cara con el canto y le salían rayas.
    sep = n.new('ShaderNodeSeparateXYZ'); l.new(coord.outputs['Normal'], sep.inputs[0])
    absz = n.new('ShaderNodeMath'); absz.operation = 'ABSOLUTE'; l.new(sep.outputs['Z'], absz.inputs[0])
    tapa = n.new('ShaderNodeMath'); tapa.operation = 'GREATER_THAN'; tapa.inputs[1].default_value = 0.5
    l.new(absz.outputs[0], tapa.inputs[0])
    estria = n.new('ShaderNodeTexWave'); estria.wave_type = 'RINGS'; estria.rings_direction = 'Z'
    estria.inputs['Scale'].default_value = 0.1
    # Las estrías del canto: bandas según el ángulo alrededor del eje.
    grad = n.new('ShaderNodeTexGradient'); grad.gradient_type = 'RADIAL'
    l.new(coord.outputs['Object'], grad.inputs['Vector'])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 120
    l.new(grad.outputs['Fac'], mul.inputs[0])
    sen = n.new('ShaderNodeMath'); sen.operation = 'SINE'
    mul2 = n.new('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = 6.283
    l.new(mul.outputs[0], mul2.inputs[0]); l.new(mul2.outputs[0], sen.inputs[0])
    mez = n.new('ShaderNodeMix'); mez.data_type = 'FLOAT'
    l.new(tapa.outputs[0], mez.inputs['Factor'])
    l.new(sen.outputs[0], mez.inputs['A'])
    l.new(cara.outputs['Color'], mez.inputs['B'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.9; bump.inputs['Distance'].default_value = 0.02
    l.new(mez.outputs['Result'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], n['Principled BSDF'].inputs['Normal'])
    # Lo hundido algo más oscuro: da la sensación de pátina en los huecos.
    tono = n.new('ShaderNodeMix'); tono.data_type = 'RGBA'
    tono.inputs['A'].default_value = (0.62, 0.4, 0.12, 1); tono.inputs['B'].default_value = (1.0, 0.75, 0.32, 1)
    fac = n.new('ShaderNodeMath'); fac.operation = 'MAXIMUM'
    l.new(cara.outputs['Color'], fac.inputs[0]); inv = n.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1; l.new(tapa.outputs[0], inv.inputs[1]); l.new(inv.outputs[0], fac.inputs[1])
    l.new(fac.outputs[0], tono.inputs['Factor'])
    l.new(tono.outputs['Result'], n['Principled BSDF'].inputs['Base Color'])
    return m
MORO = mat_oro()

# --- piezas --------------------------------------------------------------------------------
L, A = 1.56, 0.66        # un billete (proporción de los de verdad)

def billete_suelto (col, pos, giro, curva=0.05):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=16, y_subdivisions=4, size=1)
    o = bpy.context.object
    o.scale = (L, A, 1)
    bpy.ops.object.transform_apply(scale=True)
    for v in o.data.vertices:
        v.co.z = curva * (1 - (2 * v.co.x / L) ** 2) + random.uniform(-0.004, 0.004)
    sol = o.modifiers.new('grosor', 'SOLIDIFY'); sol.thickness = 0.004
    o.data.materials.append(MB)
    o.location = pos
    o.rotation_euler = (random.uniform(-0.03, 0.03), random.uniform(-0.03, 0.03), math.radians(giro))
    mover(o, col)
    return o

def fajo (col, pos, giro=0.0, alto=0.11):
    """Cien billetes con su faja de papel."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.scale = (L, A, alto)
    bpy.ops.object.transform_apply(scale=True)
    bev = o.modifiers.new('bisel', 'BEVEL'); bev.width = 0.012; bev.segments = 2
    o.data.materials.append(MC)
    o.data.materials.append(MB)
    for p in o.data.polygons:
        if p.normal.z > 0.9 or p.normal.z < -0.9:
            p.material_index = 1
    # UV de las caras de arriba y abajo: el billete entero.
    bm = bmesh.new(); bm.from_mesh(o.data)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co.x / L + 0.5, lp.vert.co.y / A + 0.5)
    bm.to_mesh(o.data); bm.free()
    o.location = V(pos) + V((0, 0, alto / 2))
    o.rotation_euler = (0, 0, math.radians(giro))
    mover(o, col)
    # La faja, un poco más ancha que el fajo, cruzando por el medio.
    bpy.ops.mesh.primitive_cube_add(size=1)
    f = bpy.context.object
    f.scale = (0.3, A + 0.012, alto + 0.012)
    f.data.materials.append(MFAJA)
    f.location = o.location.copy()
    f.rotation_euler = o.rotation_euler.copy()
    mover(f, col)
    # Una hoja de encima algo movida: sin eso parece un ladrillo.
    billete_suelto(col, V(pos) + V((random.uniform(-0.03, 0.03), random.uniform(-0.02, 0.02), alto + 0.006)),
                   giro + random.uniform(-4, 4), 0.01)
    return o

def moneda (col, pos, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.24, depth=0.035)
    o = bpy.context.object
    bev = o.modifiers.new('bisel', 'BEVEL'); bev.width = 0.006; bev.segments = 3
    o.data.materials.append(MORO)
    bpy.ops.object.shade_smooth()
    o.location = pos
    o.rotation_euler = rot
    mover(o, col)
    return o

def pila (col, x, y, n):
    for i in range(n):
        moneda(col, (x + random.uniform(-0.012, 0.012), y + random.uniform(-0.012, 0.012), 0.018 + i * 0.036),
               (0, 0, random.uniform(0, 6.3)))

def mover (o, col):
    for c in o.users_collection:
        c.objects.unlink(o)
    col.objects.link(o)

def coleccion (nombre):
    c = bpy.data.collections.new(nombre)
    esc.collection.children.link(c)
    return c

# --- los premios ---------------------------------------------------------------------------
premios = {}

c = coleccion('billetes-1'); premios[c.name] = c          # 2 billetes: tres sueltos en abanico
for i, g in enumerate((-18, 0, 16)):
    billete_suelto(c, (i * 0.08 - 0.08, i * 0.05, 0.01 + i * 0.012), g)

c = coleccion('billetes-2'); premios[c.name] = c          # 5-12: un fajo y dos sueltos
fajo(c, (0, 0, 0), 8)
billete_suelto(c, (0.45, -0.35, 0.01), -25)

c = coleccion('billetes-3'); premios[c.name] = c          # 30: dos fajos
fajo(c, (-0.1, 0.15, 0), 5)
fajo(c, (0.1, -0.2, 0), -12)

c = coleccion('billetes-4'); premios[c.name] = c          # 120 y cofres pequeños: cinco fajos
for (x, y, z, g) in ((-0.35, 0.2, 0, 3), (0.4, 0.15, 0, -6), (0, -0.3, 0, 10), (-0.15, 0.1, 0.122, -4), (0.2, -0.05, 0.122, 14)):
    fajo(c, (x, y, z), g)

c = coleccion('billetes-5'); premios[c.name] = c          # cofres gordos: el montón
k = 0
for piso in range(3):
    for fila in range(3 - piso):
        for col_ in range(2):
            fajo(c, (col_ * 1.62 - 0.81 + piso * 0.05, fila * 0.7 - 0.35 * (2 - piso) + random.uniform(-0.03, 0.03), piso * 0.122),
                 random.uniform(-3, 3))
            k += 1

c = coleccion('monedas-1'); premios[c.name] = c           # 20 monedas: tres
moneda(c, (-0.2, 0, 0.018))
moneda(c, (0.22, 0.12, 0.018), (0, 0, 1))
moneda(c, (0.02, -0.02, 0.1), (math.radians(62), 0, math.radians(20)))

c = coleccion('monedas-2'); premios[c.name] = c           # 45: una pila y sueltas
pila(c, 0, 0.05, 9)
moneda(c, (0.5, -0.1, 0.018))
moneda(c, (-0.45, -0.2, 0.05), (math.radians(20), 0, 0.3))

c = coleccion('monedas-3'); premios[c.name] = c           # 90: el montón
for (x, y, n) in ((-0.5, 0.2, 8), (0, 0.3, 12), (0.5, 0.1, 6), (-0.2, -0.25, 5), (0.35, -0.3, 9)):
    pila(c, x, y, n)
for i in range(9):
    t = random.uniform(0, 6.3)
    moneda(c, (math.cos(t) * random.uniform(0.7, 1.0), math.sin(t) * random.uniform(0.5, 0.7), 0.03),
           (random.uniform(0, 0.4), random.uniform(0, 0.4), random.uniform(0, 6.3)))

# La caja militar: la de Poly Haven con el emblema pintado en el frente.
def pintura_emblema (color, brillo=0.0):
    m = bpy.data.materials.new('emblema')
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    t = n.new('ShaderNodeTexImage'); t.image = img('premio-emblema.png')
    b = n.new('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = 0.85
    if brillo:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = brillo
    tr = n.new('ShaderNodeBsdfTransparent')
    mez = n.new('ShaderNodeMixShader')
    l.new(t.outputs['Alpha'], mez.inputs['Fac'])
    l.new(tr.outputs[0], mez.inputs[1]); l.new(b.outputs[0], mez.inputs[2])
    l.new(mez.outputs[0], n['Material Output'].inputs[0])
    return m

def calcomania (col, centro, ancho, mat, giro_z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=1)
    o = bpy.context.object
    o.scale = (ancho, ancho / 2, 1)
    o.rotation_euler = (math.radians(90), 0, giro_z)
    o.location = centro
    o.data.materials.append(mat)
    mover(o, col)
    return o

c = coleccion('caja-militar'); premios[c.name] = c
antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(PH, 'modelos', 'wooden_military_crate', 'wooden_military_crate_1k.gltf'))
bpy.context.view_layer.update()
nuevos = [o for o in bpy.data.objects if o not in antes]
for o in nuevos:
    mover(o, c)
mallas = [o for o in nuevos if o.type == 'MESH']
esquinas = [o.matrix_world @ V(k) for o in mallas for k in o.bound_box]
mn = V((min(p.x for p in esquinas), min(p.y for p in esquinas), min(p.z for p in esquinas)))
mx = V((max(p.x for p in esquinas), max(p.y for p in esquinas), max(p.z for p in esquinas)))
print('CAJA', tuple(round(v, 2) for v in mn), tuple(round(v, 2) for v in mx))
# El frente largo que mira a la cámara (-Y o -X, el que sea más ancho).
if (mx.x - mn.x) >= (mx.y - mn.y):
    calcomania(c, V(((mn.x + mx.x) / 2, mn.y - 0.003, (mn.z + mx.z) / 2)), (mx.x - mn.x) * 0.62, pintura_emblema((0.86, 0.84, 0.74)))
else:
    calcomania(c, V((mn.x - 0.003, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2)), (mx.y - mn.y) * 0.62, pintura_emblema((0.86, 0.84, 0.74)), math.radians(-90))

# La caja alienígena: contenedor de metal oscuro con luces verdes.
c = coleccion('caja-alien'); premios[c.name] = c
metal = material('metal-alien', (0.07, 0.085, 0.09), 0.32, 0.9)
nm = metal.node_tree.nodes; lm = metal.node_tree.links
ladr = nm.new('ShaderNodeTexBrick'); ladr.inputs['Scale'].default_value = 3; ladr.inputs['Mortar Size'].default_value = 0.008
bm_ = nm.new('ShaderNodeBump'); bm_.inputs['Strength'].default_value = 0.25
lm.new(ladr.outputs['Fac'], bm_.inputs['Height']); lm.new(bm_.outputs['Normal'], nm['Principled BSDF'].inputs['Normal'])
verde = material('luz-verde', (0.2, 1.0, 0.45), 0.3)
verde.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (0.3, 1.0, 0.5, 1)
verde.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 8
canto = material('canto-alien', (0.3, 0.33, 0.35), 0.25, 1.0)
AX, AY, AZ = 1.2, 0.75, 0.72
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, AZ / 2))
cuerpo = bpy.context.object; cuerpo.scale = (AX, AY, AZ)
bpy.ops.object.transform_apply(scale=True)
bev = cuerpo.modifiers.new('bisel', 'BEVEL'); bev.width = 0.05; bev.segments = 4
cuerpo.data.materials.append(metal); mover(cuerpo, c)
# Tapa algo más ancha y la ranura de luz entre las dos.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, AZ + 0.06))
tapa = bpy.context.object; tapa.scale = (AX + 0.06, AY + 0.06, 0.14)
bpy.ops.object.transform_apply(scale=True)
b2 = tapa.modifiers.new('bisel', 'BEVEL'); b2.width = 0.04; b2.segments = 3
tapa.data.materials.append(metal); mover(tapa, c)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, AZ - 0.015))
ranura = bpy.context.object; ranura.scale = (AX + 0.01, AY + 0.01, 0.02)
ranura.data.materials.append(verde); mover(ranura, c)
# Esquineras y tiras de luz verticales.
for sx in (-1, 1):
    for sy in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * AX / 2, sy * AY / 2, AZ / 2))
        e = bpy.context.object; e.scale = (0.1, 0.1, AZ + 0.02)
        e.data.materials.append(canto); mover(e, c)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * AX * 0.36, -AY / 2 - 0.005, AZ * 0.45))
    t = bpy.context.object; t.scale = (0.025, 0.01, AZ * 0.6)
    t.data.materials.append(verde); mover(t, c)
calcomania(c, V((0, -AY / 2 - 0.008, AZ * 0.45)), AX * 0.55, pintura_emblema((0.3, 1.0, 0.5), 5))

# --- foto de cada uno ------------------------------------------------------------------------
def encuadrar (col, elev=32, giro=-28, margen=1.12):
    objs = [o for o in col.all_objects if o.type == 'MESH']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ V(k) for o in objs for k in o.bound_box]
    centro = sum(pts, V()) / len(pts)
    e, g = math.radians(elev), math.radians(giro)
    d = V((math.sin(g) * math.cos(e), -math.cos(g) * math.cos(e), math.sin(e)))
    cam.location = centro + d * 20
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    der = cam.matrix_world.to_3x3() @ V((1, 0, 0))
    arr = cam.matrix_world.to_3x3() @ V((0, 1, 0))
    ancho = max(abs((p - centro).dot(der)) for p in pts) * 2
    alto = max(abs((p - centro).dot(arr)) for p in pts) * 2
    aspecto = esc.render.resolution_x / esc.render.resolution_y
    cam_d.ortho_scale = max(ancho, alto * aspecto) * margen

def foto (nombre, col, w, h, **kw):
    for c in premios.values():
        c.hide_render = c is not col
    esc.render.resolution_x, esc.render.resolution_y = w, h
    esc.render.resolution_percentage = 100
    encuadrar(col, **kw)
    s = esc.render.image_settings
    s.file_format, s.color_mode, s.quality = 'WEBP', 'RGBA', 86
    esc.render.filepath = os.path.join(SALIDA, nombre + '.webp')
    bpy.ops.render.render(write_still=True)
    print('FOTO', nombre, os.path.getsize(esc.render.filepath))

for nombre, col in premios.items():
    foto(nombre, col, 480, 360)
for nombre in ('caja-militar', 'caja-alien'):
    foto(nombre + '-grande', premios[nombre], 900, 900, margen=1.3)
