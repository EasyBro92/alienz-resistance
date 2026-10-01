# El fuego del juego, simulado de verdad (01/10/2026).
#   blender -b -P herramientas/blender/fuego.py -- [llama|chorro|explosion] [--prueba]
#
# Isidro: «el fuego parece gas y no tiene ninguna forma». Era verdad: llamarada,
# explosión y napalm eran bolas naranjas que se encogían. Aquí se simula fuego
# con el simulador de fluidos de Blender (Mantaflow) y se renderiza a una TIRA
# de 64 fotogramas (8 × 8, cada uno de 128 px) con fondo transparente. En el
# juego cada llama es una lámina que pasa esos fotogramas (src/systems/fuego.js):
# se ve fuego de verdad, con sus lenguas y su humo negro, y al móvil le cuesta
# una textura y una llamada de dibujo.
#
# Tres tiras, en public/fuego/:
#   llama.webp      una hoguera que arde sin parar (bucle): suelo ardiendo,
#                   muro de napalm, bichos en llamas.
#   chorro.webp     el chorro del lanzallamas, de lado y de izquierda a derecha.
#   explosion.webp  una explosión entera, de la bola de fuego al humo (una vez).
#
# El fuego lleva algo de densidad además de luz: una llama pura no tiene alfa y
# al guardarla en una imagen normal desaparecería.

import bpy, os, sys, math, shutil, tempfile
import numpy as np

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CUALES = [a for a in ARGS if not a.startswith('--')] or ['llama', 'chorro', 'explosion']
PRUEBA = '--prueba' in ARGS
FOTO = '--foto' in ARGS      # simula y saca UN fotograma grande a vistas/, para ajustar deprisa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'fuego')
os.makedirs(SALIDA, exist_ok=True)
LADO = 128
FOTOGRAMAS = 64

RECETAS = {
    # dominio (x, y, z), resolución, de qué fotograma a cuál se guarda, y la cámara.
    'llama': dict(dominio=(5.0, 5.0, 5.0), res=64, desde=70, cada=1, ancho_camara=5.0, centro_z=2.5),
    'chorro': dict(dominio=(9.0, 4.0, 9.0), res=80, desde=36, cada=1, ancho_camara=9.0, centro_z=4.5),
    'explosion': dict(dominio=(8.0, 8.0, 8.0), res=72, desde=1, cada=1, ancho_camara=8.0, centro_z=4.0),
}

def escena (cual):
    r = RECETAS[cual]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    esc = bpy.context.scene
    dx, dy, dz = r['dominio']

    # --- el dominio ---
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, dz / 2))
    dom = bpy.context.object
    dom.scale = (dx, dy, dz)
    bpy.ops.object.transform_apply(scale=True)
    md = dom.modifiers.new('fluido', 'FLUID')
    md.fluid_type = 'DOMAIN'
    d = md.domain_settings
    d.domain_type = 'GAS'
    d.resolution_max = 32 if PRUEBA else r['res']
    d.use_adaptive_domain = False
    d.vorticity = 0.25 if cual != 'explosion' else 0.9
    d.burning_rate = 0.3      # cuanto más bajo, más alta sube la llama antes de consumirse
    d.flame_smoke = 1.2 if cual != 'chorro' else 0.6
    d.flame_vorticity = 0.6
    d.flame_max_temp = 3.0
    if cual == 'chorro':
        # Poca flotación y llama larga: si no, el fuego sube en vez de salir disparado.
        d.beta = 0.25
        d.burning_rate = 0.22
    if cual == 'explosion':
        # Fuego puro que sube en bola; el humo sale al consumirse (con humo desde
        # el primer instante, envolvía la llama y la apagaba).
        d.beta = 1.6
        d.burning_rate = 0.32
        d.flame_smoke = 2.5
        d.time_scale = 1.3
        d.use_dissolve_smoke = True
        d.dissolve_speed = 130
    d.cache_type = 'ALL'
    d.cache_directory = tempfile.mkdtemp(prefix='fuego-' + cual + '-')
    d.cache_frame_start = 1
    d.cache_frame_end = r['desde'] + FOTOGRAMAS * r['cada'] + 1
    esc.frame_start, esc.frame_end = 1, d.cache_frame_end

    # --- de dónde sale el fuego ---
    if cual == 'llama':
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, location=(0, 0, 0.35), segments=16, ring_count=8)
        f = bpy.context.object
        f.scale = (1.3, 1.3, 0.5)
    elif cual == 'chorro':
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(-dx / 2 + 0.5, 0, 4.0), segments=12, ring_count=6)
        f = bpy.context.object
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(0, 0, 1.3), segments=16, ring_count=8)
        f = bpy.context.object
    mf = f.modifiers.new('fluido', 'FLUID')
    mf.fluid_type = 'FLOW'
    fl = mf.flow_settings
    fl.flow_type = 'FIRE'
    fl.flow_behavior = 'INFLOW'
    fl.fuel_amount = 3.0 if cual == 'explosion' else 2.0
    fl.density = 1.0
    fl.temperature = 2.0
    if cual == 'chorro':
        # El combustible sale disparado hacia la derecha, como de una boquilla.
        fl.use_initial_velocity = True
        fl.velocity_coord = (28.0, 0, 1.5)
        fl.velocity_factor = 0
    if cual == 'explosion':
        fl.use_initial_velocity = True
        fl.velocity_normal = 7.0
        # Solo arde un instante: después es la bola que sube y el humo.
        fl.use_inflow = True
        fl.keyframe_insert('use_inflow', frame=1)
        fl.use_inflow = False
        fl.keyframe_insert('use_inflow', frame=9)
    f.hide_render = True

    # --- el material: luz donde hay llama, hollín donde hay humo ---
    mat = bpy.data.materials.new('fuego')
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    n.clear()
    salida = n.new('ShaderNodeOutputMaterial')
    vol = n.new('ShaderNodeVolumePrincipled')
    l.new(vol.outputs['Volume'], salida.inputs['Volume'])
    llama = n.new('ShaderNodeAttribute'); llama.attribute_name = 'flame'
    humo = n.new('ShaderNodeAttribute'); humo.attribute_name = 'density'
    rampa = n.new('ShaderNodeValToRGB')
    e = rampa.color_ramp.elements
    e[0].position, e[0].color = 0.0, (0, 0, 0, 1)
    e[1].position, e[1].color = 1.0, (1.0, 0.85, 0.4, 1)
    for pos, col in ((0.12, (0.6, 0.05, 0.0, 1)), (0.35, (1.0, 0.28, 0.02, 1)), (0.65, (1.0, 0.62, 0.12, 1))):
        k = e.new(pos); k.color = col
    l.new(llama.outputs['Fac'], rampa.inputs['Fac'])
    l.new(rampa.outputs['Color'], vol.inputs['Emission Color'])
    fuerza = n.new('ShaderNodeMath'); fuerza.operation = 'MULTIPLY'; fuerza.inputs[1].default_value = 1.7 if cual == 'explosion' else 2.6
    l.new(llama.outputs['Fac'], fuerza.inputs[0])
    l.new(fuerza.outputs[0], vol.inputs['Emission Strength'])
    # Densidad: el humo, más un poco donde arde (para que la llama tenga alfa).
    d_humo = n.new('ShaderNodeMath'); d_humo.operation = 'MULTIPLY'; d_humo.inputs[1].default_value = 22.0 if cual == 'explosion' else 6.0
    l.new(humo.outputs['Fac'], d_humo.inputs[0])
    d_llama = n.new('ShaderNodeMath'); d_llama.operation = 'MULTIPLY'; d_llama.inputs[1].default_value = 5.0
    l.new(llama.outputs['Fac'], d_llama.inputs[0])
    suma = n.new('ShaderNodeMath'); suma.operation = 'ADD'
    l.new(d_humo.outputs[0], suma.inputs[0]); l.new(d_llama.outputs[0], suma.inputs[1])
    l.new(suma.outputs[0], vol.inputs['Density'])
    vol.inputs['Color'].default_value = (0.012, 0.011, 0.01, 1)
    vol.inputs['Blackbody Intensity'].default_value = 0
    dom.data.materials.append(mat)

    # --- cámara de frente, sin perspectiva, y una luz para que el humo tenga volumen ---
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = r['ancho_camara']
    cam = bpy.data.objects.new('cam', cd); esc.collection.objects.link(cam)
    cam.location = (0, -20, r['centro_z'])
    cam.rotation_euler = (math.radians(90), 0, 0)
    esc.camera = cam
    sol = bpy.data.lights.new('sol', 'SUN'); sol.energy = 3.0
    so = bpy.data.objects.new('sol', sol); esc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(30))
    mundo = bpy.data.worlds.new('m'); esc.world = mundo; mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.55, 0.65, 1)
    mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

    esc.render.engine = 'CYCLES'
    esc.cycles.samples = 8 if PRUEBA else 20
    esc.cycles.use_denoising = True
    esc.cycles.volume_step_rate = 2.0
    esc.cycles.volume_bounces = 0
    esc.render.film_transparent = True
    esc.render.resolution_x = esc.render.resolution_y = LADO
    esc.render.resolution_percentage = 100
    esc.render.image_settings.file_format = 'PNG'
    esc.render.image_settings.color_mode = 'RGBA'
    # «Standard» y poca fuerza: con AgX la llama salía rosa pálido, y con mucha
    # fuerza el corazón se quemaba a blanco.
    esc.view_settings.view_transform = 'Standard'
    return esc, dom, r

def hacer (cual):
    esc, dom, r = escena(cual)
    bpy.context.view_layer.objects.active = dom
    dom.select_set(True)
    print('SIMULANDO', cual)
    if FOTO:
        dom.modifiers['fluido'].domain_settings.cache_frame_end = r['desde'] + 42
    bpy.ops.fluid.bake_all()
    if FOTO:
        # Una hoja de 4 fotogramas con el MISMO tratamiento que la tira final.
        esc.render.resolution_x = esc.render.resolution_y = LADO
        tira = np.zeros((LADO, 4 * LADO, 4), dtype=np.float32)
        for n, k in enumerate((3, 12, 24, 40)):
            esc.frame_set(r['desde'] + k)
            ruta = os.path.join(RAIZ, 'vistas', 'tmp-fuego.exr')
            esc.render.image_settings.file_format = 'OPEN_EXR'
            esc.render.filepath = ruta
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(ruta)
            crudo = np.array(im.pixels[:], dtype=np.float32).reshape(LADO, LADO, 4)
            bpy.data.images.remove(im)
            luz = 1.0 - np.exp(-np.clip(crudo[..., :3], 0, None) * 1.6)
            alfa = np.clip(np.maximum(crudo[..., 3], luz.max(axis=2) * 1.15), 0, 1)
            color = np.where(alfa[..., None] > 1e-4, luz / np.maximum(alfa[..., None], 1e-4), 0)
            # Sobre un fondo arena, para ver cómo quedará en el juego.
            fondo = np.array([0.6, 0.48, 0.3], dtype=np.float32)
            tira[:, n * LADO:(n + 1) * LADO, :3] = color * alfa[..., None] + fondo * (1 - alfa[..., None])
            tira[:, n * LADO:(n + 1) * LADO, 3] = 1
        out = bpy.data.images.new('tira', 4 * LADO, LADO, alpha=True)
        out.pixels[:] = tira.ravel()
        esc.render.image_settings.file_format = 'PNG'
        out.save_render(os.path.join(RAIZ, 'vistas', 'fuego-' + cual + '.png'))
        print('FOTO', cual)
        return
        for k in (3, 8, 16, 40):
            esc.frame_set(r['desde'] + k)
            esc.render.filepath = os.path.join(RAIZ, 'vistas', f'fuego-{cual}-{k:02d}.png')
            bpy.ops.render.render(write_still=True)
        import numpy
        print('FOTO', esc.render.filepath)
        return
    tmp = tempfile.mkdtemp(prefix='fotos-' + cual + '-')
    hoja = np.zeros((8 * LADO, 8 * LADO, 4), dtype=np.float32)
    for k in range(FOTOGRAMAS):
        esc.frame_set(r['desde'] + k * r['cada'])
        # En EXR: la luz de la llama llega entera aunque no tenga opacidad. Guardada
        # en PNG con fondo transparente, una llama (que es luz, no materia) se
        # quedaba casi sin alfa y la hoja salía invisible.
        ruta = os.path.join(tmp, f'{k:02d}.exr')
        esc.render.image_settings.file_format = 'OPEN_EXR'
        esc.render.image_settings.color_mode = 'RGBA'
        esc.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(ruta)
        crudo = np.array(im.pixels[:], dtype=np.float32).reshape(LADO, LADO, 4)
        bpy.data.images.remove(im)
        # Luz lineal (ya multiplicada por su alfa) → color de pantalla, con el
        # brillo comprimido para que el corazón no se queme a blanco.
        luz = 1.0 - np.exp(-np.clip(crudo[..., :3], 0, None) * 1.6)
        alfa = np.clip(np.maximum(crudo[..., 3], luz.max(axis=2) * 1.15), 0, 1)
        color = np.where(alfa[..., None] > 1e-4, luz / np.maximum(alfa[..., None], 1e-4), 0)
        px = np.empty((LADO, LADO, 4), dtype=np.float32)
        px[..., :3] = np.clip(color, 0, 1)      # la imagen de salida es lineal: Blender la pasa a sRGB al guardar
        px[..., 3] = alfa
        fila, col = k // 8, k % 8
        # La hoja se lee de arriba abajo; las imágenes de Blender empiezan por abajo.
        y0 = (7 - fila) * LADO
        hoja[y0:y0 + LADO, col * LADO:(col + 1) * LADO] = px
    out = bpy.data.images.new('hoja', 8 * LADO, 8 * LADO, alpha=True)
    out.pixels[:] = hoja.ravel()
    esc.render.image_settings.file_format = 'WEBP'
    esc.render.image_settings.color_mode = 'RGBA'
    esc.render.image_settings.quality = 82
    destino = os.path.join(SALIDA, cual + ('-prueba' if PRUEBA else '') + '.webp')
    out.save_render(destino)
    print('HOJA', cual, os.path.getsize(destino), 'alfa media', float(hoja[..., 3].mean()))
    shutil.rmtree(tmp, ignore_errors=True)
    shutil.rmtree(dom.modifiers['fluido'].domain_settings.cache_directory, ignore_errors=True)

for c in CUALES:
    hacer(c)
