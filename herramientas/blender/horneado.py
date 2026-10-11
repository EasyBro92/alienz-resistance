# Lo común de los lugares con la LUZ HORNEADA (02/10/2026).
#
# Madrid fue el primero (lugar_madrid.py, que lleva su propia copia de todo esto
# y no se ha tocado: Isidro ya lo dio por bueno) y Valencia el segundo. La receta:
#
#   1. Texturas hechas aquí con numpy (fachadas, cielo, calzada…) o traídas de
#      Poly Haven y reducidas.
#   2. La geometría se va echando en LOTES por grupo y material: caras sueltas con
#      su UV de textura. Cada grupo acaba siendo un objeto.
#   3. `terminar` suelda vértices, despliega un SEGUNDO juego de UV (`luz`),
#      hornea con Cycles la luz difusa (directa + rebotes) y la guarda:
#        · tipo 'atlas'  → mapa de luz desplegado automáticamente,
#        · tipo 'planta' → mapa de luz proyectado en planta (el suelo),
#        · tipo 'vert'   → luz en el color de los vértices (árboles, lo lejano),
#        · tipo 'plano'  → sin luz (lo que brilla, rayas, la cúpula del cielo),
#        · tipo 'juego'  → material normal: lo ilumina el juego y recibe sombras.
#   4. En el juego (`conLuzHorneada`, world.js) manda el NOMBRE del objeto:
#      luzX, vert…, plano…, suelo….
#
# Tres cosas que hay que saber:
#   · Lo FINO (cables, barras, arcos) va a un grupo 'vert': en un atlas cada barra
#     es una isla de menos de un píxel y sale negra o con la luz del vecino.
#   · En el suelo ('planta') dos capas que se pisan comparten píxeles del mapa, y
#     gana la última que se añadió: PRIMERO la base y DESPUÉS lo que va encima
#     (calzadas, caminos, agua). Al revés, lo de encima se queda con el negro de la
#     base tapada.
#   · Un material con `metal` sale a oscuras en el paso difuso.
#
# Coordenadas del JUEGO (x derecha, y arriba, z hacia la cámara); `P` las pasa a
# Blender.
#
#   -- --rapido   mapas de 512 con 10 muestras (un minuto), para ajustar
#   -- --reusar   no hornea: reaplica curva, escala y color a lo ya calculado

import bpy, bmesh, os, sys, math, random, time, mathutils
import numpy as np

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RAPIDO = '--rapido' in ARGS
REUSAR = '--reusar' in ARGS
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PH = os.path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')
MODELOS = os.path.join(RAIZ, 'public', 'models')
TMP = os.path.join(PH, '_reducidas')
os.makedirs(TMP, exist_ok=True)
LADO_LUZ = 512 if RAPIDO else 2048
MUESTRAS = 10 if RAPIDO else 40
V = mathutils.Vector
M = mathutils.Matrix
ARRIBA, ABAJO = V((0, 0, 1)), V((0, 0, -1))

class _Estado:
    nombre = 'lugar'
    rng = None
    eje = V((0, 0, 0))
    vuelta = None                # z del eje de la media vuelta, o nada
    encendidas = 0.14            # cuántas ventanas hay con la luz dada
    reflejo = (0.10, 0.06, 0.02) # el color que devuelve el cristal (el del cielo)
    t0 = 0.0
E = _Estado()

def iniciar (nombre, semilla, eje=(0.0, 0.0), encendidas=0.14, reflejo=(0.10, 0.06, 0.02)):
    """Escena vacía y azar repetible. `eje`: el centro (x, z) para 'fuera' y 'dentro'."""
    E.nombre = nombre
    random.seed(semilla)
    E.rng = np.random.default_rng(semilla)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.view_settings.view_transform = 'Standard'
    E.eje = P(eje[0], eje[1])
    E.encendidas = encendidas
    E.reflejo = reflejo
    E.t0 = time.time()
    lotes.clear(); mats.clear()

def P (x, z, y=0.0):
    if E.vuelta is not None:             # el sitio entero girado media vuelta (ver `dar_la_vuelta`)
        x, z = -x, 2 * E.vuelta - z
    return V((x, -z, y))

def dar_la_vuelta (z_eje):
    """Gira todo lo que se construya después media vuelta alrededor de (0, z_eje):
    el guion sigue escrito en sus coordenadas y el juego lo ve al revés. Así se
    cambia qué extremo queda a la espalda de los soldados sin rehacer el mapa.
    Llamarlo ANTES de `iniciar`; el sol de `terminar` hay que darlo ya girado."""
    E.vuelta = z_eje

def _girado (d):
    return d if E.vuelta is None else V((-d.x, -d.y, d.z))

def rgb (h):
    return [((h >> s) & 255) / 255 for s in (16, 8, 0)]

# ==================================================================================
# TEXTURAS
# ==================================================================================
def guardar (nombre, arr, calidad=82):
    """arr: alto × ancho × 3, valores sRGB de 0 a 1, la fila 0 arriba."""
    h, w, _ = arr.shape
    im = bpy.data.images.new(nombre, w, h, alpha=False)
    px = np.ones((h, w, 4), np.float32)
    px[..., :3] = np.clip(arr[::-1], 0, 1)
    im.pixels.foreach_set(px.ravel())
    ruta = os.path.join(TMP, f'{E.nombre}-{nombre}.jpg')
    im.filepath_raw = ruta
    im.file_format = 'JPEG'
    im.save(quality=calidad)
    bpy.data.images.remove(im)
    return bpy.data.images.load(ruta)

def de_polyhaven (nombre, lado=512, tono=None, contraste=0.75):
    ruta = os.path.join(PH, 'texturas', nombre, f'{nombre}_diff_1k.jpg')
    im = bpy.data.images.load(ruta)
    im.scale(lado, lado)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(lado, lado, 4)[::-1, :, :3]
    bpy.data.images.remove(im)
    if tono is not None:
        # Llevarla a un color medio: un tinte solo oscurece.
        meta = np.array(rgb(tono), np.float32)
        px = meta + (px - px.mean(axis=(0, 1))) * contraste
    return guardar(f'{nombre}-{tono or 0:06x}', px)

def ruido (h, w, grano=1.0):
    """Ruido suave que repite en los bordes (octavas de ruido blanco ampliado)."""
    out = np.zeros((h, w), np.float32)
    for paso, peso in ((1, 0.5), (4, 0.3), (16, 0.2)):
        r = E.rng.random((max(1, h // paso), max(1, w // paso))).astype(np.float32)
        r = np.repeat(np.repeat(r, paso, axis=0), paso, axis=1)[:h, :w]
        if r.shape != (h, w):
            r = np.pad(r, ((0, h - r.shape[0]), (0, w - r.shape[1])), mode='wrap')
        out += r * peso
    return (out - 0.5) * grano

def lienzo (h, w, color):
    a = np.empty((h, w, 3), np.float32)
    a[:] = color
    return a

LETRAS = {
    'A': ['01110', '10001', '10001', '11111', '10001'], 'L': ['10000', '10000', '10000', '10000', '11111'],
    'I': ['11111', '00100', '00100', '00100', '11111'], 'E': ['11111', '10000', '11110', '10000', '11111'],
    'N': ['10001', '11001', '10101', '10011', '10001'], 'Z': ['11111', '00010', '00100', '01000', '11111'],
    ' ': ['00000'] * 5
}
def escribir (a, texto, x0, y0, px, color):
    for i, ch in enumerate(texto):
        for f, fila in enumerate(LETRAS[ch]):
            for c, bit in enumerate(fila):
                if bit == '1':
                    a[y0 + f * px:y0 + (f + 1) * px, x0 + (i * 6 + c) * px:x0 + (i * 6 + c + 1) * px] = color

# --- las fachadas: cuatro vanos por cuatro plantas en 512 -----------------------
def _cristal (c, alto):
    grad = np.linspace(1.9, 0.8, alto, dtype=np.float32)[:, None, None]
    return np.clip(c * grad + np.array(E.reflejo) * (grad - 0.8), 0, 1)

def ventanas_sueltas (a, base, marco, alto_v=(30, 100), ancho_v=(30, 98), balcon=0.3):
    for f in range(4):
        for c in range(4):
            x0, y0 = c * 128, f * 128
            cris = np.array((0.10, 0.13, 0.18)) * (0.8 + 0.5 * random.random())
            encendida = random.random() < E.encendidas
            v = a[y0 + alto_v[0]:y0 + alto_v[1], x0 + ancho_v[0]:x0 + ancho_v[1]]
            v[:] = marco
            dentro = v[4:-4, 4:-4]
            hh = dentro.shape[0]
            dentro[:] = np.array((1.0, 0.76, 0.45)) * 0.95 if encendida else _cristal(cris, hh)
            if not encendida and random.random() < 0.45:         # la persiana a medio bajar
                dentro[:int(hh * random.uniform(0.25, 0.8))] = np.array(base) * 0.55 + 0.33
            dentro[:, dentro.shape[1] // 2 - 1:dentro.shape[1] // 2 + 1] = marco
            a[y0 + alto_v[1]:y0 + alto_v[1] + 4, x0 + ancho_v[0] - 4:x0 + ancho_v[1] + 4] = np.array(marco) * 0.9
            if random.random() < balcon:
                a[y0 + alto_v[1] - 26:y0 + alto_v[1] - 23, x0 + 18:x0 + 110] = (0.12, 0.12, 0.13)
                for k in range(x0 + 18, x0 + 110, 6):
                    a[y0 + alto_v[1] - 26:y0 + alto_v[1] + 2, k:k + 1] = (0.12, 0.12, 0.13)
                a[y0 + alto_v[1] + 2:y0 + alto_v[1] + 8, x0 + 14:x0 + 114] = (0.7, 0.68, 0.64)
        a[f * 128 + 122:f * 128 + 128] = np.array(base) * 0.8 + 0.12  # el canto del forjado

def tex_ladrillo (nombre, base):
    a = lienzo(512, 512, base) + ruido(512, 512, 0.08)[..., None]
    for y in range(0, 512, 8):
        a[y:y + 1] *= 0.72
        for x in range((y // 8 % 2) * 12, 512, 24):
            a[y:y + 8, x:x + 1] *= 0.78
    ventanas_sueltas(a, base, (0.9, 0.89, 0.85))
    return guardar(nombre, a)

def tex_crema (nombre, base, balcon=0.6):
    a = lienzo(512, 512, base) + ruido(512, 512, 0.05)[..., None]
    ventanas_sueltas(a, base, (0.34, 0.3, 0.26), alto_v=(18, 104), ancho_v=(36, 92), balcon=balcon)
    for c in range(4):
        a[:, c * 128:c * 128 + 2] *= 0.88
    return guardar(nombre, a)

def tex_oficina (nombre, antepecho, cristal):
    a = lienzo(512, 512, antepecho) + ruido(512, 512, 0.04)[..., None]
    for f in range(4):
        y0 = f * 128
        for k in range(16):
            x0 = k * 32
            c = np.array(cristal) * (0.75 + 0.55 * random.random())
            luz = random.random() < E.encendidas * 1.3
            grad = np.linspace(1.7, 0.8, 70, dtype=np.float32)[:, None, None]
            a[y0 + 34:y0 + 104, x0 + 2:x0 + 30] = (1.0, 0.8, 0.5) if luz else np.clip(c * grad + np.array(E.reflejo) * 1.2 * (grad - 0.8), 0, 1)
        a[y0 + 104:y0 + 110] = np.array(antepecho) * 0.6
        a[y0 + 28:y0 + 34] = np.array(antepecho) * 1.08
    return guardar(nombre, a)

def tex_vidrio (nombre, cristal, montante=(0.1, 0.11, 0.13)):
    yy, xx = np.mgrid[0:512, 0:512].astype(np.float32)
    a = lienzo(512, 512, cristal)
    for f in range(8):
        for c in range(8):
            v = 0.75 + 0.5 * random.random()
            luz = random.random() < E.encendidas * 0.7
            a[f * 64:(f + 1) * 64, c * 64:(c + 1) * 64] = (0.95, 0.8, 0.55) if luz else np.array(cristal) * v
    a *= (0.8 + 0.5 * (1 - (yy % 128) / 128))[..., None]            # el reflejo del cielo, planta a planta
    a[:, ::64] = montante; a[:, 1::64] = montante; a[::64] = montante; a[1::64] = montante
    a[::128] = np.array(montante) * 2; a[2::128] = np.array(montante) * 2
    return guardar(nombre, a)

def tex_nervios (nombre, blanco, hueco, paso=32, ancho=14, forjado=True):
    """Nervios verticales claros con el hueco (cristal) entre ellos."""
    a = lienzo(512, 512, blanco) + ruido(512, 512, 0.03)[..., None]
    for k in range(0, 512, paso):
        a[:, k + (paso - ancho) // 2:k + (paso + ancho) // 2] = hueco
        for f in range(0, 512, 128):
            if random.random() < E.encendidas:
                a[f + 20:f + 120, k + (paso - ancho) // 2:k + (paso + ancho) // 2] = (1.0, 0.8, 0.5)
    if forjado:
        for f in range(0, 512, 128):
            a[f:f + 10] = np.array(blanco) * 0.92
    return guardar(nombre, a)

# Fachada mediterránea con contraventanas (Marsella, Lyon): ver tex_postigos.
def tex_postigos (nombre, base, postigo, plantas_bajo=False):
    """Fachada marsellesa: piedra clara, ventanas altas con contraventanas de
    color, algunas cerradas, y balcones de hierro."""
    a = lienzo(512, 512, base) + ruido(512, 512, 0.05)[..., None]
    for f in range(4):
        for c in range(4):
            x0, y0 = c * 128, f * 128
            cris = np.array((0.08, 0.1, 0.13)) * (0.8 + 0.5 * random.random())
            v = a[y0 + 16:y0 + 104, x0 + 40:x0 + 88]
            v[:] = (0.86, 0.84, 0.8)                                  # el marco
            grad = np.linspace(1.6, 0.8, 80, dtype=np.float32)[:, None, None]
            v[4:-4, 4:-4] = np.clip(cris * grad + np.array(E.reflejo) * (grad - 0.8), 0, 1)
            cerrada = random.random()
            pc = np.array(postigo) * (0.85 + 0.3 * random.random())
            if cerrada < 0.3:                                       # cerrada del todo
                v[2:-2, 2:-2] = pc
                for k in range(8, 84, 6):
                    v[k:k + 1, 2:-2] *= 0.7                          # las lamas
            else:
                for lado in (0, 1):                                  # abiertas, a los lados
                    x = x0 + (16 if lado == 0 else 90)
                    a[y0 + 16:y0 + 104, x:x + 22] = pc
                    for k in range(y0 + 20, y0 + 100, 6):
                        a[k:k + 1, x:x + 22] *= 0.72
            if random.random() < 0.45:                              # balcón de hierro
                a[y0 + 98:y0 + 101, x0 + 30:x0 + 98] = (0.1, 0.1, 0.11)
                for k in range(x0 + 30, x0 + 98, 5):
                    a[y0 + 80:y0 + 101, k:k + 1] = (0.1, 0.1, 0.11)
                a[y0 + 101:y0 + 106, x0 + 26:x0 + 102] = np.array(base) * 0.75
            a[y0 + 104:y0 + 108, x0 + 36:x0 + 92] = np.array(base) * 0.8   # el alféizar
        a[f * 128 + 124:f * 128 + 128] = np.array(base) * 0.85        # la imposta
    return guardar(nombre, a)

def tex_azotea (base=(0.36, 0.34, 0.32)):
    a = lienzo(256, 256, base) + ruido(256, 256, 0.1)[..., None]
    for _ in range(9):
        x, y = random.randint(8, 210), random.randint(8, 210)
        w, h = random.randint(10, 36), random.randint(10, 30)
        a[y:y + h, x:x + w] = random.choice([(0.55, 0.55, 0.56), (0.22, 0.22, 0.23), (0.62, 0.36, 0.26)])
        a[y + h:y + h + 3, x:x + w + 3] *= 0.5
    a[:4] = np.array(base) * 1.35; a[:, :4] = np.array(base) * 1.35
    return guardar('azotea', a)

def tex_calzada ():
    """Asfalto con la raya discontinua en el borde izquierdo: una baldosa por carril."""
    a = lienzo(512, 128, (0.2, 0.2, 0.21)) + ruido(512, 128, 0.07)[..., None]
    a[40:260, 0:5] = (0.82, 0.82, 0.78)
    a[:, 60:68] *= 0.93                                           # la rodada
    return guardar('calzada', a)

def tex_cielo (paradas, sol_xz, sol_alto, resplandor, nubes, cuanta_nube=0.12):
    """La cúpula: u da la vuelta (0 = este), v sube del horizonte al cénit.
    paradas: [(altura 0-1, color)], sol_xz: hacia el sol en (x, z) del juego,
    sol_alto: su altura (0-1), resplandor: color que suma alrededor del sol,
    nubes: (color hacia el sol, color a su espalda)."""
    H, W = 256, 1024
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    e = 1 - yy / (H - 1)
    u = xx / W
    u_sol = (math.atan2(sol_xz[1], sol_xz[0]) / (2 * math.pi)) % 1.0
    du = np.abs(((u - u_sol + 0.5) % 1.0) - 0.5)
    a = np.zeros((H, W, 3), np.float32)
    for (e0, c0), (e1, c1) in zip(paradas, paradas[1:]):
        t = np.clip((e - e0) / (e1 - e0), 0, 1)[..., None]
        dentro = ((e >= e0) & (e <= e1))[..., None]
        a = np.where(dentro, np.array(c0) * (1 - t) + np.array(c1) * t, a)
    lejos = (du * 2)[..., None] ** 1.5
    g = np.exp(-((du * 7) ** 2 + ((e - sol_alto) * 4.5) ** 2))[..., None]
    a += np.array(resplandor) * g
    disco = np.exp(-(((du * 60) ** 2) + (((e - sol_alto) * 30) ** 2)))[..., None]
    a += np.array((1.0, 0.95, 0.8)) * np.clip(disco * 1.4, 0, 1)
    n = np.zeros((H, W), np.float32)
    for fx, fy, peso in ((3, 5, 0.5), (7, 11, 0.3), (15, 23, 0.2)):
        fase = E.rng.random(2) * 6.28
        n += peso * (np.sin(2 * np.pi * u * fx + fase[0] + 2.5 * np.sin(2 * np.pi * e * fy * 0.5 + fase[1])) * np.sin(2 * np.pi * e * fy + fase[1] + np.sin(2 * np.pi * u * fx * 2)))
    nube = np.clip((n - cuanta_nube) * 3, 0, 1) * np.clip((e - 0.07) * 9, 0, 1) * np.clip((0.6 - e) * 4, 0, 1)
    color_nube = np.array(nubes[0]) * (1 - lejos) + np.array(nubes[1]) * lejos
    a = a * (1 - nube[..., None] * 0.8) + color_nube * nube[..., None] * 0.8
    return guardar('cielo', a, 90)

# ==================================================================================
# MATERIALES
# ==================================================================================
mats = {}
def material (nombre, imagen=None, color=None, tinte=None, rug=0.85, metal=0.0, emite=0.0, alfa=1.0):
    if nombre in mats:
        return mats[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n['Principled BSDF']
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = metal        # ojo: con metal, el horneado difuso sale a oscuras
    salida = None
    if imagen is not None:
        t = n.new('ShaderNodeTexImage'); t.image = imagen
        salida = t.outputs['Color']
        if tinte is not None:
            mez = n.new('ShaderNodeMix'); mez.data_type = 'RGBA'; mez.blend_type = 'MULTIPLY'
            mez.inputs['Factor'].default_value = 1
            l.new(salida, mez.inputs['A'])
            mez.inputs['B'].default_value = rgb(tinte) + [1]
            salida = mez.outputs['Result']
        l.new(salida, b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (rgb(color) if isinstance(color, int) else list(color)) + [1]
    if emite:
        if salida is not None:
            l.new(t.outputs['Color'], b.inputs['Emission Color'])
        else:
            b.inputs['Emission Color'].default_value = b.inputs['Base Color'].default_value
            b.inputs['Base Color'].default_value = (0, 0, 0, 1)
        b.inputs['Emission Strength'].default_value = emite
    if alfa < 1:
        b.inputs['Alpha'].default_value = alfa
        m.blend_method = 'BLEND'
    mats[nombre] = m
    return m

def imagen_de (mat):
    return mat.node_tree.nodes['Image Texture'].image

# ==================================================================================
# GEOMETRÍA: lotes por grupo y material
# ==================================================================================
lotes = {}
def lote (grupo, mat):
    k = (grupo, mat.name)
    if k not in lotes:
        bm = bmesh.new()
        lotes[k] = (bm, bm.loops.layers.uv.new('UVMap'), mat)
    return lotes[k]

def cara (grupo, mat, pts, uvs=None, hacia=None, baldosa=None):
    """hacia: un vector, 'fuera' o 'dentro' (respecto al eje del sitio), o nada."""
    bm, uv, _ = lote(grupo, mat)
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs)
    f.normal_update()
    if hacia is not None:
        c = f.calc_center_median()
        if isinstance(hacia, str):
            d = V((c.x - E.eje.x, c.y - E.eje.y, 0)) * (1 if hacia == 'fuera' else -1)
        else:
            d = _girado(hacia)           # las direcciones escritas a mano giran con el sitio
        if f.normal.dot(d) < 0:
            f.normal_flip()
    if uvs is not None:
        tabla = {v: uvs[i] for i, v in enumerate(vs)}
        for lp in f.loops:
            lp[uv].uv = tabla[lp.vert]
    elif baldosa:
        nrm = f.normal
        for lp in f.loops:
            c = lp.vert.co
            if abs(nrm.z) > 0.7:
                lp[uv].uv = (c.x / baldosa, c.y / baldosa)
            elif abs(nrm.x) > abs(nrm.y):
                lp[uv].uv = (c.y / baldosa, c.z / baldosa)
            else:
                lp[uv].uv = (c.x / baldosa, c.z / baldosa)
    return f

def rect (grupo, mat, x0, x1, z0, z1, y, baldosa=8.0, uvs=None):
    x0, x1 = min(x0, x1), max(x0, x1); z0, z1 = min(z0, z1), max(z0, z1)
    cara(grupo, mat, [P(x0, z1, y), P(x1, z1, y), P(x1, z0, y), P(x0, z0, y)], uvs=uvs, hacia=ARRIBA, baldosa=None if uvs else baldosa)

def caja (grupo, mat, x0, x1, z0, z1, y0, y1, techo=None, baldosa=12.0, tapa_abajo=False):
    """Paredes con la baldosa pegada a la esquina y al suelo (las plantas no se cortan)."""
    x0, x1 = min(x0, x1), max(x0, x1); z0, z1 = min(z0, z1), max(z0, z1)
    centro = P((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2)
    esquinas = [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]
    for i in range(4):
        (ax, az), (bx, bz) = esquinas[i], esquinas[(i + 1) % 4]
        largo = math.hypot(bx - ax, bz - az)
        pts = [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)]
        medio = (pts[0] + pts[2]) / 2
        cara(grupo, mat, pts, uvs=[(0, 0), (largo / baldosa, 0), (largo / baldosa, (y1 - y0) / baldosa), (0, (y1 - y0) / baldosa)],
             hacia=_girado(V((medio.x - centro.x, medio.y - centro.y, 0))))   # ya girada: que no gire dos veces
    cara(grupo, techo or mat, [P(x0, z1, y1), P(x1, z1, y1), P(x1, z0, y1), P(x0, z0, y1)], hacia=ARRIBA, baldosa=24.0)
    if tapa_abajo:
        cara(grupo, mat, [P(x0, z1, y0), P(x1, z1, y0), P(x1, z0, y0), P(x0, z0, y0)], hacia=ABAJO, baldosa=24.0)

def tejado (grupo, mat, x0, x1, z0, z1, y, alto, piñon=None, baldosa=6.0):
    """Tejado a dos aguas con la cumbrera a lo largo del lado largo; `piñon` es el
    material de los dos triángulos de los extremos (por defecto, el del tejado)."""
    x0, x1 = min(x0, x1), max(x0, x1); z0, z1 = min(z0, z1), max(z0, z1)
    if (x1 - x0) >= (z1 - z0):
        zm = (z0 + z1) / 2
        cara(grupo, mat, [P(x0, z1, y), P(x1, z1, y), P(x1, zm, y + alto), P(x0, zm, y + alto)], hacia=V((0, -1, 1)), baldosa=baldosa)
        cara(grupo, mat, [P(x0, z0, y), P(x1, z0, y), P(x1, zm, y + alto), P(x0, zm, y + alto)], hacia=V((0, 1, 1)), baldosa=baldosa)
        cara(grupo, piñon or mat, [P(x0, z0, y), P(x0, z1, y), P(x0, zm, y + alto)], hacia=V((-1, 0, 0)), baldosa=baldosa)
        cara(grupo, piñon or mat, [P(x1, z0, y), P(x1, z1, y), P(x1, zm, y + alto)], hacia=V((1, 0, 0)), baldosa=baldosa)
    else:
        xm = (x0 + x1) / 2
        cara(grupo, mat, [P(x0, z0, y), P(x0, z1, y), P(xm, z1, y + alto), P(xm, z0, y + alto)], hacia=V((-1, 0, 1)), baldosa=baldosa)
        cara(grupo, mat, [P(x1, z0, y), P(x1, z1, y), P(xm, z1, y + alto), P(xm, z0, y + alto)], hacia=V((1, 0, 1)), baldosa=baldosa)
        cara(grupo, piñon or mat, [P(x0, z1, y), P(x1, z1, y), P(xm, z1, y + alto)], hacia=V((0, -1, 0)), baldosa=baldosa)
        cara(grupo, piñon or mat, [P(x0, z0, y), P(x1, z0, y), P(xm, z0, y + alto)], hacia=V((0, 1, 0)), baldosa=baldosa)

def prisma (grupo, mat, planta, y0, y1, techo=None, baldosa=12.0):
    """planta: lista de (x, z) en orden; paredes y tapa."""
    cx = sum(p[0] for p in planta) / len(planta); cz = sum(p[1] for p in planta) / len(planta)
    c = P(cx, cz)
    u = 0.0
    for i in range(len(planta)):
        (ax, az), (bx, bz) = planta[i], planta[(i + 1) % len(planta)]
        largo = math.hypot(bx - ax, bz - az)
        pts = [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)]
        medio = (pts[0] + pts[2]) / 2
        cara(grupo, mat, pts, uvs=[(u, 0), (u + largo / baldosa, 0), (u + largo / baldosa, (y1 - y0) / baldosa), (u, (y1 - y0) / baldosa)],
             hacia=_girado(V((medio.x - c.x, medio.y - c.y, 0))))
        u += largo / baldosa
    cara(grupo, techo or mat, [P(x, z, y1) for x, z in planta], hacia=ARRIBA, baldosa=24.0)

def rr (hx, hz, r, cx=0.0, cz=0.0, arc=6, rec=4):
    """Contorno de rectángulo redondeado: lista de (x, z, nx, nz)."""
    r = min(r, hx - 0.01, hz - 0.01)
    esq = [(cx + hx - r, cz + hz - r, 0), (cx - (hx - r), cz + hz - r, 90), (cx - (hx - r), cz - (hz - r), 180), (cx + hx - r, cz - (hz - r), 270)]
    out = []
    for k, (ex, ez, a0) in enumerate(esq):
        for j in range(arc + 1):
            a = math.radians(a0 + 90 * j / arc)
            out.append((ex + r * math.cos(a), ez + r * math.sin(a), math.cos(a), math.sin(a)))
        sx, sz, sa = esq[(k + 1) % 4]
        a1 = math.radians(sa)
        qx, qz = sx + r * math.cos(a1), sz + r * math.sin(a1)
        px, pz, nx, nz = out[-1]
        for j in range(1, rec):
            t = j / rec
            out.append((px + (qx - px) * t, pz + (qz - pz) * t, nx, nz))
    return out

def franja (grupo, mat, A, ya, B, yb, hacia, u_baldosa=None, v0=0.0, v1=1.0, u_total=None, cerrada=True):
    """Una tira de caras entre dos líneas del mismo número de puntos (x, z, …)."""
    n = len(A)
    ya = ya if isinstance(ya, (list, tuple)) else [ya] * n
    yb = yb if isinstance(yb, (list, tuple)) else [yb] * n
    tramos = n if cerrada else n - 1
    acc = [0.0]
    for i in range(tramos):
        j = (i + 1) % n
        acc.append(acc[-1] + math.hypot((A[j][0] + B[j][0] - A[i][0] - B[i][0]) / 2, (A[j][1] + B[j][1] - A[i][1] - B[i][1]) / 2,
                                        (ya[j] + yb[j] - ya[i] - yb[i]) / 2))
    total = acc[-1] or 1.0
    reps = u_total if u_total is not None else max(1, round(total / u_baldosa))
    for i in range(tramos):
        j = (i + 1) % n
        u0, u1 = acc[i] / total * reps, acc[i + 1] / total * reps
        cara(grupo, mat, [P(A[i][0], A[i][1], ya[i]), P(A[j][0], A[j][1], ya[j]), P(B[j][0], B[j][1], yb[j]), P(B[i][0], B[i][1], yb[i])],
             uvs=[(u0, v0), (u1, v0), (u1, v1), (u0, v1)], hacia=hacia)

def malla (grupo, mat, filas, hacia, u_rep=1.0, v_rep=1.0, cerrada_u=False, girar=False):
    """Una superficie: `filas` es una lista de filas de puntos de Blender (todas
    del mismo largo). u corre a lo largo de la fila y v de fila en fila; con
    `girar`, al revés (para que los nervios de una textura sigan a las filas)."""
    nf, nc = len(filas), len(filas[0])
    for i in range(nf - 1):
        for j in range(nc if cerrada_u else nc - 1):
            k = (j + 1) % nc
            a, b, c, d = filas[i][j], filas[i][k], filas[i + 1][k], filas[i + 1][j]
            if (a - b).length < 1e-5 and (c - d).length < 1e-5:
                continue
            pts = [a, b, c, d]
            uvs = [(j / (nc - 1) * u_rep, i / (nf - 1) * v_rep), ((j + 1) / (nc - 1) * u_rep, i / (nf - 1) * v_rep),
                   ((j + 1) / (nc - 1) * u_rep, (i + 1) / (nf - 1) * v_rep), (j / (nc - 1) * u_rep, (i + 1) / (nf - 1) * v_rep)]
            # los triángulos de las puntas
            if girar:
                uvs = [(v, u) for u, v in uvs]
            if (a - b).length < 1e-5:
                pts, uvs = [a, c, d], [uvs[0], uvs[2], uvs[3]]
            elif (c - d).length < 1e-5:
                pts, uvs = [a, b, c], [uvs[0], uvs[1], uvs[2]]
            h = _girado(hacia(sum(pts, V((0, 0, 0))) / len(pts))) if callable(hacia) else hacia
            cara(grupo, mat, pts, uvs=uvs, hacia=h)

def cubo (grupo, mat, centro, tam, giro=0.0):
    bm, uv, _ = lote(grupo, mat)
    m = M.Translation(centro) @ M.Rotation(giro, 4, 'Z') @ M.Diagonal((tam[0], tam[1], tam[2], 1))
    bmesh.ops.create_cube(bm, size=1, matrix=m)

def barra (grupo, mat, a, b, grueso):
    """Una barra de sección cuadrada entre dos puntos de Blender (cables, nervios)."""
    bm, uv, _ = lote(grupo, mat)
    d = b - a
    m = M.Translation((a + b) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ M.Diagonal((grueso, grueso, d.length, 1))
    bmesh.ops.create_cube(bm, size=1, matrix=m)

# --- el suelo: su mapa de luz es la planta, con más detalle en el centro ----------
class _Suelo:
    x0 = x1 = z0 = z1 = 0.0
    cortes_x = cortes_z = None
    pesos = (0.14, 0.72, 0.14)
S = _Suelo()
def config_suelo (x0, x1, z0, z1, fino_x, fino_z, pesos=(0.14, 0.72, 0.14)):
    S.x0, S.x1, S.z0, S.z1 = x0, x1, z0, z1
    S.cortes_x = [x0, fino_x[0], fino_x[1], x1]
    S.cortes_z = [z0, fino_z[0], fino_z[1], z1]
    S.pesos = pesos

def uv_suelo (x, z):
    def eje (v, cortes):
        acc = 0.0
        for i in range(3):
            if v <= cortes[i + 1] or i == 2:
                return acc + S.pesos[i] * (v - cortes[i]) / (cortes[i + 1] - cortes[i])
            acc += S.pesos[i]
    return eje(x, S.cortes_x), 1 - eje(z, S.cortes_z)

def suelo (grupo, mat, x0, x1, z0, z1, y, baldosa=8.0, carriles=None):
    """Un rectángulo de suelo, partido por los cortes del mapa de luz.
    carriles: (origen, ancho de carril, 'z' o 'x') para la textura de calzada."""
    x0, x1 = max(S.x0, min(x0, x1)), min(S.x1, max(x0, x1)); z0, z1 = max(S.z0, min(z0, z1)), min(S.z1, max(z0, z1))
    if x1 <= x0 or z1 <= z0:
        return
    xs = [x0] + [c for c in S.cortes_x if x0 < c < x1] + [x1]
    zs = [z0] + [c for c in S.cortes_z if z0 < c < z1] + [z1]
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            a, b, c, d = xs[i], xs[i + 1], zs[j], zs[j + 1]
            if carriles:
                o, w, eje = carriles
                uv = [((px - o) / w, pz / 12) if eje == 'z' else ((pz - o) / w, px / 12) for px, pz in ((a, d), (b, d), (b, c), (a, c))]
                rect(grupo, mat, a, b, c, d, y, uvs=uv)
            else:
                rect(grupo, mat, a, b, c, d, y, baldosa=baldosa)

# --- cosas de calle -----------------------------------------------------------------
# Las hojas de cada árbol, apuntadas por quien lo planta: nombre del material →
# cuánto se mece. Antes solo se mecía (y solo llevaría textura de hoja) lo que se
# LLAMABA como un árbol (`FOLLAJE`), y los de otoño de Pekín, que se llaman
# `otono-…`, se quedaban quietos.
follaje = {}
def _es_hoja (mats_, cuanto):
    for m in (mats_ if isinstance(mats_, (list, tuple)) else [mats_]):
        follaje.setdefault(m.name, cuanto)

def arbol (grupo, tronco, hojas, x, z, tam=1.0, fino=False, y=0.0):
    _es_hoja(hojas, 0.5)
    alto_tronco = 2.6 * tam
    cubo(grupo, tronco, P(x, z, y + alto_tronco / 2 - 0.3), (0.35 * tam, 0.35 * tam, alto_tronco + 0.6))
    bm, _, _ = lote(grupo, random.choice(hojas))
    r = bmesh.ops.create_icosphere(bm, subdivisions=2 if fino else 1, radius=1.0,
        matrix=M.Translation(P(x, z, y + alto_tronco + 1.9 * tam)) @ M.Rotation(random.random() * 6.3, 4, 'Z') @ M.Diagonal((2.5 * tam, 2.5 * tam, 2.2 * tam, 1)))
    for v in r['verts']:
        v.co += V((random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(-0.25, 0.25))) * tam

def palmera (grupo, tronco, hojas, x, z, alto=7.0, y=0.0):
    """Tronco fino algo torcido y una corona de hojas caídas."""
    for m in hojas:
        se_mece.setdefault(m.name, 0.6)          # se mece, pero sin textura de hoja: son láminas
    dx, dz = random.uniform(-0.5, 0.5), random.uniform(-0.5, 0.5)
    barra(grupo, tronco, P(x, z, y), P(x + dx, z + dz, y + alto), 0.34)
    cima = P(x + dx, z + dz, y + alto)
    hoja = random.choice(hojas)
    n = 7
    g0 = random.random() * 6.28
    for i in range(n):
        a = g0 + 2 * math.pi * i / n
        d = V((math.cos(a), math.sin(a), 0))
        lado = V((-d.y, d.x, 0))
        largo = random.uniform(2.6, 3.3)
        p1 = cima + d * largo * 0.55 + V((0, 0, 0.5))
        p2 = cima + d * largo + V((0, 0, -0.9))
        cara(grupo, hoja, [cima - lado * 0.12, cima + lado * 0.12, p1 + lado * 0.55, p1 - lado * 0.55], hacia=ARRIBA)
        cara(grupo, hoja, [p1 - lado * 0.55, p1 + lado * 0.55, p2 + lado * 0.1, p2 - lado * 0.1], hacia=ARRIBA)

def coche (grupo, chapas, luna, x, z, giro, y=0.0):
    cubo(grupo, random.choice(chapas), P(x, z, y + 0.35), (1.8, 4.3, 0.75), giro)
    cubo(grupo, luna, P(x, z, y + 0.98) + V((math.sin(giro) * 0.2, -math.cos(giro) * 0.2, 0)), (1.6, 2.2, 0.55), giro)

def cupula (grupo, mat, radio, cx=0.0, cz=0.0, seg_a=32, seg_e=9):
    """El cielo pintado: una semiesfera vista desde dentro."""
    def p (i, j):
        az = 2 * math.pi * i / seg_a
        el = math.radians(-4 + 94 * j / seg_e)
        return P(cx + radio * math.cos(el) * math.cos(az), cz + radio * math.cos(el) * math.sin(az), radio * math.sin(el))
    for i in range(seg_a):
        for j in range(seg_e):
            v0, v1 = max(0.0, (-4 + 94 * j / seg_e) / 90), max(0.0, (-4 + 94 * (j + 1) / seg_e) / 90)
            cara(grupo, mat, [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)],
                 uvs=[(i / seg_a, v0), ((i + 1) / seg_a, v0), ((i + 1) / seg_a, v1), (i / seg_a, v1)])

# --- las manzanas de una ciudad en cuadrícula ---------------------------------------
ocupado = []
def libre (x0, x1, z0, z1):
    return all(x1 <= a or x0 >= b or z1 <= c or z0 >= d for a, b, c, d in ocupado)
def reservar (x0, x1, z0, z1):
    ocupado.append((min(x0, x1), max(x0, x1), min(z0, z1), max(z0, z1)))

importados = {}
def importar (ruta, grupo, altura, x, z, giro=0.0):
    """Mete un modelo ya hecho (un .glb, por ejemplo de Meshy) en un grupo, con
    la base en el suelo, centrado en (x, z) y escalado a `altura`. Se hornea con
    lo demás: en un grupo `vert` su textura se queda y le cae la luz del sitio
    (sombras, oclusión) en los vértices. El metal se quita: horneado a oscuras
    (trampa 3 de la cabecera)."""
    antes = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = [o for o in bpy.context.scene.objects if o not in antes]
    mallas = [o for o in nuevos if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in mallas:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mallas[0]
    if len(mallas) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for v in nuevos:
        if v != o and v.name in bpy.data.objects:
            bpy.data.objects.remove(v)
    vs = np.array([v.co[:] for v in o.data.vertices])
    lo, hi = vs.min(axis=0), vs.max(axis=0)
    k = altura / (hi[2] - lo[2])
    c = P(x, z, 0)
    m = M.Translation((c.x, c.y, 0)) @ M.Rotation(giro, 4, 'Z') @ M.Diagonal((k, k, k, 1)) @ M.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))
    o.data.transform(m)
    o.data.update()
    for s in o.material_slots:
        if s.material and s.material.use_nodes:
            b = s.material.node_tree.nodes.get('Principled BSDF')
            if b:
                b.inputs['Metallic'].default_value = 0.0
                for l in list(b.inputs['Metallic'].links):
                    s.material.node_tree.links.remove(l)
    importados.setdefault(grupo, []).append(o)
    return o

# Lo que se MECE con el viento (10/10; Isidro: «los árboles no tienen animación»):
# banderas, toldos y copas de árbol. En los grupos `vert`, el canal alfa del
# color de cada vértice dice cuánto se mueve (1 = quieto, 0 = todo lo que da) y el
# juego lo mueve en el sombreador (`mece` en world.js). `cuanto` es un número
# de 0 a 1 o una función del punto (en coordenadas de Blender) que lo devuelve:
# una bandera no se mueve junto al mástil y sí en la punta.
se_mece = {}
def mecer (mat, cuanto=1.0):
    se_mece[mat.name] = cuanto
    return mat
# El follaje se mece SOLO, por el nombre de su material (así valen los mapas de
# antes sin tocar sus guiones, volviéndolos a exportar con `--reusar`): las copas
# la mitad que una bandera, las palmas algo más y las coníferas menos. Los troncos
# llevan otro material y se quedan quietos. (`copa` no sirve para saberlo: con
# ella se hacen también los globos de las farolas.)
import re
FOLLAJE = [(re.compile(r'^palma'), 0.6), (re.compile(r'^(pino|cipres|abeto)(-|d|$)'), 0.35),
           (re.compile(r'^(hojas?|selva|olivo|sauce|jacaranda|ipe|arbol|mata)(-|d|$)'), 0.5)]
def cuanto_mece (nombre):
    if nombre in se_mece:
        return se_mece[nombre]
    if nombre in follaje:
        return follaje[nombre]
    for patron, cuanto in FOLLAJE:
        if patron.match(nombre):
            return cuanto
    return None

def es_follaje (nombre):
    """Copas, palmas y matas (por el nombre del material): lo que lleva la textura de hoja."""
    return nombre in follaje or any(patron.match(nombre) for patron, _ in FOLLAJE[1:])     # las palmas no: son láminas

# Las copas, con hoja (10/10; Isidro: «no quiero que el juego sea tan poligonal,
# quiero más detalles hasta en los lugares más simples»). Un árbol era una bola de
# veinte caras planas de un solo verde, cada cara con su luz: se le veían todas.
# Ahora, sin tocar la malla (así vale `--reusar`), `terminar` hace tres cosas con
# todo material de follaje de color liso: le promedia la luz por vértice (la copa
# sale redonda, no a facetas), pasa su verde a los vértices y le pone ESTA textura
# —manojos de hojas claros sobre el hueco oscuro de entre ramas, en gris para que
# valga con cualquier verde—, proyectada en el mundo (`BALDOSA_HOJA` metros por
# baldosa): todas las copas llevan la hoja del mismo tamaño, sea la copa grande o
# pequeña.
BALDOSA_HOJA = 4.5
_tex_hojas = []
def tex_hojas ():
    if _tex_hojas:
        return _tex_hojas[0]
    rng = np.random.default_rng(81)                               # azar propio: el del mapa no se toca
    n, k = 256, 210
    pts, brillo = rng.random((k, 2)), 0.8 + 0.2 * rng.random(k)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    cerca, quien = np.full((n, n), 9.0, np.float32), np.zeros((n, n), np.int32)
    for i, (px, py) in enumerate(pts):
        dx, dy = np.abs(xx - px), np.abs(yy - py)
        d = np.hypot(np.minimum(dx, 1 - dx), np.minimum(dy, 1 - dy))
        m = d < cerca
        cerca[m] = d[m]; quien[m] = i
    # Más claro que oscuro (el hueco entre ramas es poco y estrecho): la textura
    # solo puede oscurecer, y con una media baja había que subir tanto el color
    # de los vértices que las jacarandas, que son claras, se quemaban a blanco.
    manojo = np.clip(1 - cerca / 0.06, 0, 1) ** 0.5
    a = (0.5 + 0.5 * manojo) * brillo[quien] * (0.8 + 0.2 * _manchas_fft(rng, n, 0.6)) * (0.88 + 0.12 * _manchas_fft(rng, n, 1.8))
    a = np.clip(a / np.percentile(a, 99.5), 0, 1)
    media = float((((a + 0.055) / 1.055) ** 2.4).mean())
    _tex_hojas.append((guardar('hojas', np.repeat(a[..., None], 3, axis=2), calidad=80), media))
    return _tex_hojas[0]

def copiar (o, grupo, m4):
    """Otra copia de un modelo ya importado (`importar` lo trae una vez), puesta
    con la matriz `m4` de Blender en el grupo que se diga."""
    c = o.copy()
    c.data = o.data.copy()
    bpy.context.collection.objects.link(c)
    c.data.transform(m4)
    c.data.update()
    importados.setdefault(grupo, []).append(c)
    return c

def aligerar (o, caras):
    """Deja un modelo importado en unas `caras` caras (conserva su textura)."""
    antes = len(o.data.polygons)
    if antes <= caras:
        return o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    d = o.modifiers.new('aligerar', 'DECIMATE'); d.ratio = caras / antes
    bpy.ops.object.modifier_apply(modifier=d.name)
    return o

def comprobar_paso (grupos, salvo=(), ancho=7.4, z_lejos=-60, z_cerca=5):
    """Nada macizo donde andan los bichos."""
    malos = set()
    for (grupo, nombre), (bm, _, _) in lotes.items():
        if grupo not in grupos or nombre in salvo:
            continue
        for v in bm.verts:
            if abs(v.co.x) < ancho and z_lejos < -v.co.y < z_cerca and 0.35 < v.co.z < 4:
                malos.add(nombre)
                break
    if malos:
        raise SystemExit('PASO OCUPADO: ' + ', '.join(sorted(malos)))

# ==================================================================================
# PIEDRA CON OFICIO (06/10): fotos mezcladas, piezas de torno y sillares
# ==================================================================================
# Nacieron en lugar_roma.py para la arena del Coliseo («los objetos se ven muy
# cutres, el suelo también») y pasan aquí para los mapas siguientes (Grecia…).
# Roma conserva sus copias, que ya se dio por buena.
def foto (nombre, lado=256, tono=None, contraste=0.85):
    """Una textura de Poly Haven como matriz (la fila 0 arriba), llevada a un tono."""
    ruta = os.path.join(PH, 'texturas', nombre, f'{nombre}_diff_1k.jpg')
    im = bpy.data.images.load(ruta)
    im.scale(lado, lado)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(lado, lado, 4)[::-1, :, :3].copy()
    bpy.data.images.remove(im)
    if tono is not None:
        px = np.array(rgb(tono), np.float32) + (px - px.mean(axis=(0, 1))) * contraste
    return np.clip(px, 0, 1)

def nube (h, w, cy, cx):
    """Manchas grandes y suaves, de 0 a 1: `cy` × `cx` celdas repartidas por la imagen.
    Para mezclar dos fotos sin que se note que cada una se repite."""
    r = E.rng.random((cy + 2, cx + 2)).astype(np.float32)
    ys, xs = np.linspace(0, cy, h, dtype=np.float32), np.linspace(0, cx, w, dtype=np.float32)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = (fy * fy * (3 - 2 * fy))[:, None], (fx * fx * (3 - 2 * fx))[None, :]
    return (r[y0][:, x0] * (1 - fy) * (1 - fx) + r[y0 + 1][:, x0] * fy * (1 - fx) + r[y0][:, x0 + 1] * (1 - fy) * fx + r[y0 + 1][:, x0 + 1] * fy * fx)

def sm (a, b, x):
    f = max(0.0, min(1.0, (x - a) / (b - a)))
    return f * f * (3 - 2 * f)

def en (x, z, y=0.0, giro=0.0, vuelco=(0.0, 0.0)):
    """La matriz de una pieza puesta en (x, z) del juego, a la altura y, girada y volcada."""
    return M.Translation(P(x, z, y)) @ mathutils.Euler((vuelco[0], vuelco[1], giro)).to_matrix().to_4x4()

def torno (grupo, mat, m4, perfil, lados=18, u_rep=1.0, v_m=2.4, tapas=(True, True), roto=0.0):
    """Una pieza de revolución: `perfil` es una lista de (radio, altura) a lo largo
    del eje Z de `m4` (una matriz de Blender). Lleva sus UV: u da la vuelta y v sube
    en metros. Con `roto`, el último anillo sale mellado."""
    aros = []
    for k, (r, h) in enumerate(perfil):
        ultimo = k == len(perfil) - 1
        aros.append([m4 @ V((r * math.cos(2 * math.pi * i / lados), r * math.sin(2 * math.pi * i / lados),
                               h + (random.uniform(-roto, roto) if ultimo and roto else 0.0))) for i in range(lados)])
    for k in range(len(perfil) - 1):
        eje = m4 @ V((0, 0, (perfil[k][1] + perfil[k + 1][1]) / 2))
        for i in range(lados):
            j = (i + 1) % lados
            pts = [aros[k][i], aros[k][j], aros[k + 1][j], aros[k + 1][i]]
            uvs = [(i / lados * u_rep, perfil[k][1] / v_m), ((i + 1) / lados * u_rep, perfil[k][1] / v_m),
                   ((i + 1) / lados * u_rep, perfil[k + 1][1] / v_m), (i / lados * u_rep, perfil[k + 1][1] / v_m)]
            # Un anillo de radio cero (la punta de un cono): triángulos, no cuadros.
            if (pts[0] - pts[1]).length < 1e-5:
                pts, uvs = pts[1:], uvs[1:]
            elif (pts[2] - pts[3]).length < 1e-5:
                pts, uvs = pts[:3], uvs[:3]
            if len({tuple(round(c, 5) for c in p) for p in pts}) < 3:
                continue
            cara(grupo, mat, pts, uvs=uvs, hacia=sum(pts, V((0, 0, 0))) / len(pts) - eje)
    z = m4.to_3x3() @ V((0, 0, 1))
    if tapas[0] and perfil[0][0] > 1e-4:
        cara(grupo, mat, aros[0], hacia=-z, baldosa=1.4)
    if tapas[1] and perfil[-1][0] > 1e-4:
        cara(grupo, mat, aros[-1], hacia=z, baldosa=1.4)

def bloque (grupo, mat, m4, tam, baldosa=1.5, mella=0.03):
    """Un sillar: una caja apoyada en la base de `m4`, con las esquinas algo
    comidas y sus UV por cara, a `baldosa` metros por repetición."""
    w, d, h = tam
    esq = {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (0, 1):
                esq[(sx, sy, sz)] = m4 @ V((sx * w / 2 * (1 - random.uniform(0, mella)), sy * d / 2 * (1 - random.uniform(0, mella)), sz * h * (1 - random.uniform(0, mella) * sz)))
    centro = m4 @ V((0, 0, h / 2))
    caras = [([(-1, -1, 0), (1, -1, 0), (1, -1, 1), (-1, -1, 1)], w, h), ([(1, 1, 0), (-1, 1, 0), (-1, 1, 1), (1, 1, 1)], w, h),
             ([(1, -1, 0), (1, 1, 0), (1, 1, 1), (1, -1, 1)], d, h), ([(-1, 1, 0), (-1, -1, 0), (-1, -1, 1), (-1, 1, 1)], d, h),
             ([(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)], w, d), ([(-1, 1, 0), (1, 1, 0), (1, -1, 0), (-1, -1, 0)], w, d)]
    for claves, a, b in caras:
        pts = [esq[c] for c in claves]
        cara(grupo, mat, pts, uvs=[(0, 0), (a / baldosa, 0), (a / baldosa, b / baldosa), (0, b / baldosa)], hacia=(pts[0] + pts[2]) / 2 - centro)

def viga (grupo, mat, x0, x1, z0, z1, y0, y1, u_m=1.5, v_rep=1.0, tapas=True, techo=None):
    """Una pieza recta con la textura a lo LARGO de cada cara: u avanza un metro
    de textura cada `u_m` metros y v va de 0 a `v_rep` en todo el alto. Para un
    friso, una cornisa o un escalón, donde `caja` cortaría el dibujo."""
    x0, x1 = min(x0, x1), max(x0, x1); z0, z1 = min(z0, z1), max(z0, z1)
    centro = P((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2)
    esquinas = [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]
    for i in range(4):
        (ax, az), (bx, bz) = esquinas[i], esquinas[(i + 1) % 4]
        largo = math.hypot(bx - ax, bz - az)
        pts = [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)]
        medio = (pts[0] + pts[2]) / 2
        cara(grupo, mat, pts, uvs=[(0, 0), (largo / u_m, 0), (largo / u_m, v_rep), (0, v_rep)],
             hacia=_girado(V((medio.x - centro.x, medio.y - centro.y, 0))))
    if tapas:
        cara(grupo, techo or mat, [P(x0, z1, y1), P(x1, z1, y1), P(x1, z0, y1), P(x0, z0, y1)], hacia=ARRIBA, baldosa=u_m * 2)
        cara(grupo, techo or mat, [P(x0, z1, y0), P(x1, z1, y0), P(x1, z0, y0), P(x0, z0, y0)], hacia=ABAJO, baldosa=u_m * 2)

# ==================================================================================
# MONTES Y ÁRBOLES (06/10)
# ==================================================================================
# Nacieron en lugar_atenas.py (que conserva los suyos, ya dados por buenos) y
# quedan aquí para los mapas siguientes. Todo esto va en grupos 'vert'; a los
# montes les sienta bien ir en `suaves` de `terminar`, o se les ven las facetas.
# Los montes, rehechos el 10/10 (Isidro: «las montañas son muy cutres»): eran
# conos lisos de dieciocho lados y un solo color. Ahora:
#   · el triple de caras en cada sentido (`fino`; el doble en las lomas tendidas,
#     que de lejos no lo lucen), con ARISTAS VIVAS: contrafuertes que bajan de la
#     cima en punta, con la vaguada redonda entre uno y otro (`_filo`), cada uno a
#     su distancia del de al lado. Una ondulación suave (la primera prueba) dejaba
#     el monte como una bola de plastilina. El pie y la cima no cambian, así que
#     lo que ya estaba colocado alrededor sigue en su sitio;
#   · la luz horneada les saca el relieve (van solos en `suaves`), y encima un
#     MATIZ por vértice (`matices`, lo aplica `terminar`): en lo más empinado de
#     CADA monte asoma la roca —oscura bajo la nieve, parda bajo el verde, con sus
#     estratos en uno de piedra— y todo va a manchas grandes.
# Gastan las MISMAS tiradas de azar que antes (lo nuevo usa un azar propio): el
# resto del mapa no se mueve. Pero la malla cambia, así que un mapa con montes no
# vale con `--reusar` hasta que se hornee entero otra vez.
#   · y una TEXTURA de detalle (`tex_monte`), que es lo que les quita el aire de
#     plastilina: gris, para que valga con cualquier color (el color del monte
#     pasa a los vértices, con la luz), y enrollada al monte —u da la vuelta, v
#     sube del pie a la cima—, así sus manchas, alargadas, bajan por la ladera
#     como torrenteras y se juntan en la cumbre. Cuatro: roca (torrenteras y
#     vetas), nieve (blanca, con las costillas de peña que asoman), bosque (copas
#     vistas desde arriba, con el grano de la hoja) y arena (lisa, con las ondas
#     del viento: las dunas y las lomas nevadas que apenas levantan). Y la roca
#     tiene una versión floja, `loma`, para los cerros tendidos. La elige el color del material; uno que ya trae textura se queda
#     con la suya.
matices = {}
_tex_montes = {}
def _tipo_monte (mat):
    """'bosque', 'nieve' o 'roca' según el color liso del material ('arena' lo decide `monte`,
    por lo tendido); None si ya lleva textura."""
    b = mat.node_tree.nodes['Principled BSDF'].inputs['Base Color']
    if b.is_linked:
        return None
    r, g, a = b.default_value[:3]
    return 'bosque' if g > r * 1.15 and g > a * 1.15 else 'nieve' if min(r, g, a) > 0.5 else 'roca'

def _manchas_fft (rng, n, beta, estira=(1.0, 1.0)):
    """Ruido de manchas que repite en los bordes, de 0 a 1. `estira` las alarga a lo alto o a lo ancho."""
    fy = np.fft.fftfreq(n)[:, None] * estira[0]
    fx = np.fft.fftfreq(n)[None, :] * estira[1]
    fr = np.sqrt(fx * fx + fy * fy); fr[0, 0] = 1
    esp = (rng.normal(size=(n, n)) + 1j * rng.normal(size=(n, n))) / fr ** beta
    esp[0, 0] = 0
    a = np.fft.ifft2(esp).real
    lo, hi = np.percentile(a, (1, 99))
    return np.clip((a - lo) / (hi - lo), 0, 1).astype(np.float32)

def tex_monte (tipo):
    """La textura de detalle de los montes y su valor medio en lineal (para compensarlo en los vértices)."""
    if tipo in _tex_montes:
        return _tex_montes[tipo]
    rng = np.random.default_rng({'roca': 71, 'nieve': 72, 'bosque': 73, 'arena': 74, 'loma': 75}[tipo])   # azar propio: el del mapa no se toca
    n = 512
    grande = _manchas_fft(rng, n, 1.7, (3.0, 1.0))
    fino = _manchas_fft(rng, n, 0.9)
    if tipo == 'bosque':
        # Copas vistas desde arriba: cada punto, un árbol; claro en el centro y oscuro entre uno y otro.
        k = 420
        pts, brillo = rng.random((k, 2)), 0.8 + 0.2 * rng.random(k)
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
        cerca, quien = np.full((n, n), 9.0, np.float32), np.zeros((n, n), np.int32)
        for i, (px, py) in enumerate(pts):
            dx, dy = np.abs(xx - px), np.abs(yy - py)
            d = np.hypot(np.minimum(dx, 1 - dx), np.minimum(dy, 1 - dy))
            m = d < cerca
            cerca[m] = d[m]; quien[m] = i
        copa = np.clip(1 - cerca / 0.04, 0, 1) ** 0.8
        # Sobre las copas, el grano de la hoja: solo con los redondeles, de lejos era
        # una piel de escamas.
        hoja = _manchas_fft(rng, n, 0.55) ** 1.3
        a = (0.74 + 0.26 * copa) * brillo[quien] * (0.6 + 0.4 * hoja) * (0.78 + 0.22 * grande)
    else:
        # Torrenteras: las curvas de nivel de otro ruido, alargado ladera abajo.
        surco = np.clip(np.abs(_manchas_fft(rng, n, 1.5, (4.5, 1.0)) - 0.5) * 2 / 0.1, 0, 1)
        veta = np.clip(np.abs(_manchas_fft(rng, n, 1.3, (1.0, 3.0)) - 0.5) * 2 / 0.07, 0, 1)      # estratos, de lado a lado
        if tipo == 'arena':
            # Lisa, con las ondas que le deja el viento, de lado a lado.
            onda = (1 - np.abs(2 * _manchas_fft(rng, n, 1.4, (1.0, 5.0)) - 1)) ** 2
            a = (0.9 + 0.1 * grande) * (1 - 0.14 * onda) * (0.97 + 0.03 * fino)
        elif tipo == 'nieve':
            # Costillas de peña que asoman entre la nieve, ladera abajo y de borde roto:
            # es lo que tiene una montaña nevada vista de lejos. (Solo con vetas finas
            # parecía mármol.)
            pena = np.clip((_manchas_fft(rng, n, 1.15, (3.5, 1.0)) + 0.2 * (fino - 0.5) - 0.66) / 0.05, 0, 1)
            a = (0.93 + 0.07 * grande) * (1 - pena * (0.4 + 0.1 * veta)) * (0.92 + 0.08 * surco)
        else:
            # Torrenteras a tres tamaños, de borde blando (las curvas de nivel de tres
            # ruidos): con una sola línea fina por tamaño, la ladera parecía garabateada.
            cauce = sum(peso * (1 - np.abs(2 * _manchas_fft(rng, n, beta, (est, 1.0)) - 1)) ** 3
                        for peso, beta, est in ((0.5, 1.7, 4.0), (0.32, 1.3, 3.0), (0.18, 0.9, 2.0)))
            if tipo == 'loma':
                a = (0.88 + 0.12 * grande) * (1 - 0.16 * cauce) * (0.97 + 0.03 * fino)
            else:
                a = (0.8 + 0.2 * grande) * (1 - 0.5 * cauce) * (0.9 + 0.1 * veta) * (0.94 + 0.06 * fino)
    a = np.clip(a / np.percentile(a, 99.5), 0, 1)
    media = float((((a + 0.055) / 1.055) ** 2.4).mean())
    _tex_montes[tipo] = (guardar('monte-' + tipo, np.repeat(a[..., None], 3, axis=2), calidad=80), media)
    return _tex_montes[tipo]

def _filo (x):
    """Una arista: en punta en la cresta, redonda en la vaguada, y centrada en cero."""
    return 1.0 - abs(math.sin(x)) - 0.363

def monte (grupo, mat, cx, cz, radio, alto, y0=0.0, seg=18, anillos=7, pico=0.75, baldosa=26.0, fino=None):
    """Un cerro. Devuelve una función con su altura en (x, z) —o None fuera de él—,
    para plantarle cosas encima. `pico` menor que 1 lo hace cúpula; mayor, cono.
    La textura va proyectada en planta: dándole la vuelta al cerro se aprieta en
    la cima y de cerca es una mancha borrosa."""
    fases = [random.uniform(0, 6.28) for _ in range(3)]
    az = random.Random(int(fases[0] * 1e6) + int(radio))
    g = [az.uniform(0, 6.28) for _ in range(6)]
    k1, k2 = az.choice((5, 6, 7, 8)), az.choice((11, 13, 15))
    fino = fino or (3 if alto > 0.9 * radio else 2)
    # Cada arista necesita sus cuatro o seis caras de ancho, o sale en dientes de sierra.
    k1, k2 = min(k1, max(3, seg * fino // 6)), min(k2, max(5, seg * fino // 4))
    tipo = _tipo_monte(mat)
    if alto < 0.3 * radio and (tipo == 'nieve' or (tipo == 'roca' and mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[0] > 0.5)):
        tipo = 'arena'                                            # una duna, o una loma nevada: lisa, sin grietas ni peñas
    elif tipo == 'roca' and alto < 0.45 * radio:
        tipo = 'loma'                                             # un cerro tendido: con las torrenteras de un pico parecía un pedrusco
    tipo = matices.setdefault(mat.name, tipo)
    u_rep, v_rep = (16, 4.0) if tipo == 'bosque' else (8, 2.0) if tipo == 'nieve' else (6, 1.5)
    # Una loma tendida lleva las aristas más flojas: marcadas, parecería un pastel a gajos.
    brio = min(1.0, 0.45 + 1.1 * alto / radio)
    def forma (t, a):
        lomo = math.sin(math.pi * t)
        b = a + 0.22 * math.sin(a * 3 + g[5])                     # cada arista, a su distancia de la de al lado
        c1 = _filo(b * k1 / 2 + g[0] + t * 1.1) * (0.7 + 0.3 * math.sin(a * 2 + g[2])) * brio
        c2 = _filo(b * k2 / 2 + g[1] - t * 1.7) * brio
        r = radio * (1 - t) ** pico * (1 + 0.14 * math.sin(a * 2 + fases[0]) + 0.08 * math.sin(a * 5 + fases[1] + t * 3)
                                       + lomo * (0.2 * c1 + 0.08 * c2))
        # (El vaivén de la altura se apaga al llegar arriba: la cima es UN punto. Antes
        # cada lado subía a su altura y la cumbre de una cúpula era un abanico de
        # rajas por las que se veía el cielo.)
        y = y0 + alto * (math.sin(t * math.pi / 2) * (1 + 0.05 * math.sin(a * 3 + fases[2]) * (1 - t ** 6))
                         + lomo * (0.075 * c1 + 0.03 * c2 + 0.02 * math.sin(t * 11 + g[4])))
        return r, y
    seg, anillos = seg * fino, anillos * fino
    paso = 2 * math.pi / seg
    tabla = [[forma(j / anillos, paso * i) for i in range(seg)] for j in range(anillos + 1)]
    filas = [[P(cx + r * math.cos(paso * i), cz + r * math.sin(paso * i), y) for i, (r, y) in enumerate(fila)] for fila in tabla]
    for j in range(anillos):
        for i in range(seg):
            k = (i + 1) % seg
            pts = [filas[j][i], filas[j][k], filas[j + 1][k], filas[j + 1][i]]
            cuantos = 3 if j == anillos - 1 else 4
            if tipo:
                uvs = [(i / seg * u_rep, j / anillos * v_rep), ((i + 1) / seg * u_rep, j / anillos * v_rep),
                       ((i + 1) / seg * u_rep, (j + 1) / anillos * v_rep), (i / seg * u_rep, (j + 1) / anillos * v_rep)]
                cara(grupo, mat, pts[:cuantos], uvs=uvs[:cuantos], hacia=ARRIBA)
            else:
                cara(grupo, mat, pts[:cuantos], hacia=ARRIBA, baldosa=baldosa)
    def altura (x, z):
        # Por la MALLA, no por la fórmula: con aristas en punta, entre dos vértices
        # la cara corta por debajo de la cresta y lo plantado quedaría en el aire.
        a, d = math.atan2(z - cz, x - cx) % (2 * math.pi), math.hypot(x - cx, z - cz)
        i = int(a / paso) % seg
        k, f = (i + 1) % seg, a / paso - int(a / paso)
        def en (j):
            (ra, ya), (rb, yb) = tabla[j][i], tabla[j][k]
            return ra * (1 - f) + rb * f, ya * (1 - f) + yb * f
        r0, h0 = en(0)
        if d >= r0:
            return None
        for j in range(anillos):                                  # entre qué dos anillos cae
            r1, h1 = en(j + 1)
            if d >= r1:
                u = (r0 - d) / max(1e-6, r0 - r1)
                return h0 * (1 - u) + h1 * u
            r0, h0 = r1, h1
        return h0
    return altura

def sierra (grupo, mat, x0, z0, x1, z1, ancho, alto, y0=0.0, n=28, m=4, fino=2):
    """Una sierra de lejos: una loma larga de (x0, z0) a (x1, z1), con la cresta
    que sube y baja en picos y contrafuertes que bajan de ella. El pie va en `y0`: si queda
    DEBAJO de otro suelo, sus vértices se hornean a oscuras y dibujan una franja negra."""
    largo = math.hypot(x1 - x0, z1 - z0)
    ux, uz = (x1 - x0) / largo, (z1 - z0) / largo
    f = [random.uniform(0, 6.28) for _ in range(4)]
    az = random.Random(int(f[0] * 1e6) + int(largo))
    g = [az.uniform(0, 6.28) for _ in range(5)]
    kc = az.choice((24, 29, 34))
    n, m = n * fino, m * fino
    filas = []
    for j in range(-m, m + 1):                                    # de un pie al otro, pasando por la cresta
        s = j / m
        fila = []
        for i in range(n + 1):
            t = i / n
            cresta = alto * math.sin(math.pi * t) ** 0.55 * (0.74 + 0.15 * math.sin(t * 8 + f[0]) + 0.11 * math.sin(t * 21 + f[1])
                                                             + 0.09 * _filo(t * 19 + g[0]) + 0.04 * _filo(t * 47 + g[3]))
            lado = ancho * (0.8 + 0.2 * math.sin(t * 6 + f[2])) * s
            comba = 0.05 * largo * math.sin(math.pi * t) * math.sin(f[3])
            falda = 1 - abs(s) ** 1.4
            # Los contrafuertes: aristas que bajan de la cresta, más marcadas a media falda
            # y echadas un poco de lado según bajan.
            contra = 1 + math.sin(math.pi * abs(s)) * (0.34 * _filo(t * kc + g[1] + abs(s) * 1.3) + 0.13 * _filo(t * kc * 2.3 + g[2] - s))
            fila.append(P(x0 + ux * largo * t - uz * (lado + comba), z0 + uz * largo * t + ux * (lado + comba), y0 + cresta * falda * contra))
        filas.append(fila)
    if matices.setdefault(mat.name, _tipo_monte(mat)):
        malla(grupo, mat, filas, ARRIBA, u_rep=max(2, round(largo / ancho * (3.0 if matices[mat.name] == 'bosque' else 1.0))), v_rep=6.0 if matices[mat.name] == 'bosque' else 2.0)
    else:
        malla(grupo, mat, filas, ARRIBA)

def copa (grupo, mat, x, z, y, rx, ry, sub=1, baila=0.12):
    """Una masa de hojas: una bola de caras planas, algo deformada."""
    bm, _, _ = lote(grupo, mat)
    r = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0,
        matrix=M.Translation(P(x, z, y)) @ M.Rotation(random.random() * 6.3, 4, 'Z') @ M.Diagonal((rx, rx, ry, 1)))
    for v in r['verts']:
        v.co += V((random.uniform(-1, 1) * rx, random.uniform(-1, 1) * rx, random.uniform(-1, 1) * ry)) * baila

def pino (grupo, tronco, hojas, x, z, tam=1.0, y=0.0):
    """Pino piñonero: tronco largo y la copa ancha y chata, como un paraguas."""
    _es_hoja(hojas, 0.35)
    alto = random.uniform(4.2, 6.0) * tam
    dx, dz = random.uniform(-0.5, 0.5) * tam, random.uniform(-0.5, 0.5) * tam
    barra(grupo, tronco, P(x, z, y - 0.8), P(x + dx, z + dz, y + alto), 0.36 * tam)
    copa(grupo, random.choice(hojas), x + dx, z + dz, y + alto + 0.6 * tam, random.uniform(2.4, 3.3) * tam, random.uniform(1.0, 1.4) * tam)

def cipres (grupo, mat, x, z, tam=1.0, y=0.0):
    _es_hoja(mat, 0.35)
    torno(grupo, mat, en(x, z, y - 0.6), [(0.85 * tam, 0.0), (1.0 * tam, 2.4 * tam), (0.6 * tam, 6.5 * tam), (0.0, random.uniform(9, 12) * tam)], lados=6, tapas=(False, False))

def platano (grupo, tronco, hojas, x, z, tam=1.0, y=0.0):
    """Árbol de paseo (plátano, tilo): tronco recto y la copa en tres masas."""
    _es_hoja(hojas, 0.5)
    alto = random.uniform(3.2, 4.2) * tam
    barra(grupo, tronco, P(x, z, y - 0.3), P(x, z, y + alto), 0.4 * tam)
    for k in range(3):
        a = random.uniform(0, 6.28)
        d = (0.0 if k == 0 else random.uniform(0.9, 1.5)) * tam
        copa(grupo, random.choice(hojas), x + d * math.cos(a), z + d * math.sin(a), y + alto + random.uniform(1.2, 2.4) * tam,
             random.uniform(1.9, 2.5) * tam, random.uniform(1.5, 2.0) * tam)

# ==================================================================================
# PINTAR A MANO (07/10): frescos, relieves y siluetas
# ==================================================================================
# Nacieron en lugar_cnosos.py para el fresco del toro (que conserva los suyos).
def lienzo_dibujo (Hh, W, fondo):
    """Un lienzo con utilidades para pintar: devuelve (a, elipse, poligono, trazo).
    Todo en píxeles, con la fila 0 arriba. `fondo` es un color o una matriz ya hecha."""
    a = lienzo(Hh, W, fondo) if not isinstance(fondo, np.ndarray) else fondo
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    def elipse (cx, cy, rx, ry, color, giro=0.0):
        c, s = math.cos(giro), math.sin(giro)
        u, v = (xx - cx) * c + (yy - cy) * s, -(xx - cx) * s + (yy - cy) * c
        a[(u / rx) ** 2 + (v / ry) ** 2 < 1] = color
    def poligono (pts, color):
        dentro = np.zeros((Hh, W), bool)
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if y0 == y1:
                continue
            dentro ^= ((yy >= min(y0, y1)) & (yy < max(y0, y1))) & (xx < x0 + (yy - y0) * (x1 - x0) / (y1 - y0))
        a[dentro] = color
    def trazo (pts, color, grosor=2.0):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            lx, ly = x1 - x0, y1 - y0
            t = np.clip(((xx - x0) * lx + (yy - y0) * ly) / max(1e-6, lx * lx + ly * ly), 0, 1)
            a[np.hypot(xx - x0 - t * lx, yy - y0 - t * ly) < grosor] = color
    return a, elipse, poligono, trazo

def extruido (grupo, mat, m4, contorno, grueso, baldosa=1.2):
    """Una silueta con fondo: `contorno` es una lista de (x, alto) en el plano de
    `m4`, en sentido ANTIHORARIO (así se sabe hacia dónde mira cada canto aunque
    la figura tenga entrantes)."""
    q = m4.to_3x3()
    a_ = [m4 @ V((x, -grueso / 2, y)) for x, y in contorno]
    b = [m4 @ V((x, grueso / 2, y)) for x, y in contorno]
    cara(grupo, mat, a_, hacia=q @ V((0, -1, 0)), baldosa=baldosa)
    cara(grupo, mat, b, hacia=q @ V((0, 1, 0)), baldosa=baldosa)
    n = len(contorno)
    for i in range(n):
        j = (i + 1) % n
        dx, dy = contorno[j][0] - contorno[i][0], contorno[j][1] - contorno[i][1]
        cara(grupo, mat, [a_[i], a_[j], b[j], b[i]], hacia=q @ V((dy, 0, -dx)), baldosa=baldosa)

def elipsoide (grupo, mat, m4, radios, sub=1):
    """Una bola achatada o alargada (el lomo de una esfinge, una cabeza): `radios`
    en los ejes de `m4`. No lleva dibujo: para materiales de color liso."""
    bm, _, _ = lote(grupo, mat)
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=m4 @ M.Diagonal((radios[0], radios[1], radios[2], 1)))

# ==================================================================================
# HORNEAR Y EXPORTAR
# ==================================================================================
def a_srgb (x):
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-6), 1 / 2.4) - 0.055)

def terminar (grupos, exportes, sol_hacia, sol_color=(1.0, 0.96, 0.88), sol_fuerza=3.5, sol_ancho=3.0,
              cielo_fuerza=0.7, cielo_altura=50.0, cielo_giro=0.0, escala=0.5, satura=1.0, rebotes=3,
              no_alumbran=(), suaves=(), fundir=False):
    """grupos: {clave: (nombre del objeto, tipo, mapa)}; tipo 'atlas' | 'planta' |
    'vert' | 'plano' | 'juego'; `mapa` es el nombre del mapa de luz (luzE…), y dos
    grupos de tipo 'planta' pueden compartirlo.
    exportes: [(archivo sin extensión, [claves])].
    sol_hacia: hacia el sol, en (x, y, z) del JUEGO.
    suaves: nombres de material que, en los grupos 'vert', llevan la luz
    promediada por vértice (montes y lomas: con una luz por esquina de cada cara
    se les ven las facetas; en un edificio, en cambio, es lo que hace falta).
    fundir: en los grupos 'vert', junta en un solo material todos los de color
    liso (menos llamadas de dibujado; se ve igual)."""
    esc = bpy.context.scene
    env = lambda k, d: float(os.environ.get(f'{E.nombre.upper()}_{k}', d))
    escala, satura = env('ESCALA', escala), env('SATURA', satura)
    # --- de lotes a objetos -------------------------------------------------------
    sueltos = {}
    for (grupo, nombre), (bm, _, mat) in lotes.items():
        # Las caras se crean sueltas: sin soldar, cada una sería una isla del mapa.
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
        me = bpy.data.meshes.new(f'{grupo}-{nombre}')
        bm.to_mesh(me); bm.free()
        me.materials.append(mat)
        o = bpy.data.objects.new(f'{grupo}-{nombre}', me)
        bpy.context.collection.objects.link(o)
        sueltos.setdefault(grupo, []).append(o)
    lotes.clear()
    for grupo, lista in importados.items():                   # los modelos ya hechos (`importar`)
        sueltos.setdefault(grupo, []).extend(lista)
    importados.clear()
    objetos = {}
    for grupo, lista in sueltos.items():
        if grupo not in grupos:
            raise SystemExit(f'grupo sin declarar: {grupo}')
        bpy.ops.object.select_all(action='DESELECT')
        for o in lista:
            o.select_set(True)
        bpy.context.view_layer.objects.active = lista[0]
        if len(lista) > 1:
            bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active
        o.name = grupos[grupo][0]
        objetos[grupo] = o
        print('GRUPO', grupo, o.name, len(o.data.polygons), 'caras', len(o.data.materials), 'materiales')

    # --- la luz ---------------------------------------------------------------------
    esc.render.engine = 'CYCLES'
    esc.cycles.device = 'CPU'
    esc.cycles.samples = MUESTRAS
    esc.cycles.max_bounces = rebotes
    esc.cycles.use_denoising = False
    mundo = bpy.data.worlds.new('cielo'); esc.world = mundo; mundo.use_nodes = True
    cielo = mundo.node_tree.nodes.new('ShaderNodeTexSky')
    cielo.sun_disc = False
    cielo.sun_elevation = math.radians(cielo_altura)
    cielo.sun_rotation = math.radians(cielo_giro)
    mundo.node_tree.links.new(cielo.outputs[0], mundo.node_tree.nodes['Background'].inputs[0])
    mundo.node_tree.nodes['Background'].inputs[1].default_value = env('CIELO', cielo_fuerza)
    # El sol va aparte, para saber seguro de dónde viene.
    dir_sol = V((sol_hacia[0], -sol_hacia[2], sol_hacia[1])).normalized()
    sol = bpy.data.lights.new('sol', 'SUN')
    sol.energy = env('SOL', sol_fuerza)
    sol.color = sol_color
    sol.angle = math.radians(sol_ancho)
    osol = bpy.data.objects.new('sol', sol); bpy.context.collection.objects.link(osol)
    osol.rotation_euler = (-dir_sol).to_track_quat('-Z', 'Y').to_euler()
    for k in no_alumbran:
        if k in objetos:
            objetos[k].hide_render = True

    def capa_luz (o):
        luz = o.data.uv_layers.new(name='luz')
        o.data.uv_layers['UVMap'].active_render = True
        o.data.uv_layers.active = luz
        return luz

    crudo = os.path.join(TMP, f'{E.nombre}-crudo-{LADO_LUZ}')
    def hornear (o, nombre):
        if REUSAR:
            return np.load(f'{crudo}-{nombre}.npy')
        t = time.time()
        im = bpy.data.images.new(nombre, LADO_LUZ, LADO_LUZ, alpha=False, float_buffer=True)
        nodos = []
        for m in o.data.materials:
            nd = m.node_tree.nodes.new('ShaderNodeTexImage'); nd.image = im
            m.node_tree.nodes.active = nd
            nodos.append((m, nd))
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True); bpy.context.view_layer.objects.active = o
        esc.render.bake.target = 'IMAGE_TEXTURES'
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6 if not RAPIDO else 2)
        for m, nd in nodos:
            m.node_tree.nodes.remove(nd)
        px = np.empty(LADO_LUZ * LADO_LUZ * 4, np.float32)
        im.pixels.foreach_get(px)
        bpy.data.images.remove(im)
        px = px.reshape(LADO_LUZ, LADO_LUZ, 4)[..., :3]
        np.save(f'{crudo}-{nombre}.npy', px)
        print('HORNEADO', nombre, round(time.time() - t), 's')
        return px

    def curva (x):
        # Lo muy iluminado se comprime en vez de quemarse a blanco.
        return x / (1 + x / 2.4) * 1.25
    def saturar (x):
        gris = (x @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
        return np.clip(gris + (x - gris) * satura, 0, None)
    def suavizar (a, veces=1):
        for _ in range(veces):
            a = (a * 4 + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 8
        return a

    # Primero todos los UV de luz (el despliegue no depende de la luz)…
    for grupo, o in objetos.items():
        tipo = grupos[grupo][1]
        if tipo == 'planta':
            luz = capa_luz(o)
            for lp in o.data.loops:
                co = o.data.vertices[lp.vertex_index].co
                luz.data[lp.index].uv = uv_suelo(co.x, -co.y)
        elif tipo == 'atlas':
            capa_luz(o)
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0015, area_weight=0.0)
            bpy.ops.object.mode_set(mode='OBJECT')
    # …y luego se hornea. Los que comparten mapa se juntan quedándose con lo más claro.
    mapas = {}
    for grupo, o in objetos.items():
        nombre, tipo, mapa = grupos[grupo]
        if tipo in ('planta', 'atlas'):
            px = hornear(o, f'{mapa}-{grupo}')
            mapas[mapa] = px if mapa not in mapas else np.maximum(mapas[mapa], px)
    CODIGO = 0.5                                              # el juego lo multiplica por 2
    for mapa, m in mapas.items():
        lin = np.clip(saturar(curva(suavizar(m, 2) * escala)) * CODIGO, 0, 1)
        e = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        print('  ', mapa, 'media', round(float(e[e > 0].mean()), 3), 'p50', round(float(np.percentile(e[e > 0], 50)), 3), 'p95', round(float(np.percentile(e[e > 0], 95)), 3), 'p99', round(float(np.percentile(e[e > 0], 99)), 3),
              'color', np.round(lin[e > 0].mean(axis=0), 3), 'al sol', np.round(lin[e > np.percentile(e[e > 0], 80)].mean(axis=0), 3))
        im = bpy.data.images.new(mapa + '-fin', LADO_LUZ, LADO_LUZ, alpha=False)
        px = np.ones((LADO_LUZ, LADO_LUZ, 4), np.float32); px[..., :3] = a_srgb(lin)
        im.pixels.foreach_set(px.ravel())
        ruta = os.path.join(MODELOS, f'lugar-{E.nombre}-{mapa}.webp')
        im.filepath_raw = ruta; im.file_format = 'WEBP'
        im.save(quality=86)
        print('  ', os.path.basename(ruta), os.path.getsize(ruta))
    # La luz en los vértices.
    for grupo, o in objetos.items():
        if grupos[grupo][1] != 'vert':
            continue
        atr = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        o.data.color_attributes.active_color = atr
        o.data.color_attributes.render_color_index = o.data.color_attributes.find('Col')
        if REUSAR:
            col = np.load(f'{crudo}-vert-{grupo}.npy')
        else:
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True); bpy.context.view_layer.objects.active = o
            esc.render.bake.target = 'VERTEX_COLORS'
            bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'})
            col = np.empty(len(atr.data) * 4, np.float32)
            atr.data.foreach_get('color', col)
            np.save(f'{crudo}-vert-{grupo}.npy', col)
        col = col.reshape(-1, 4)
        # (`suaves` admite también la clave de un GRUPO entero: un modelo importado —un
        # caza, una estatua— con la luz por vértice no enseña las facetas y, al
        # compartir vértices, el archivo pesa la mitad.)
        lisos = [i for i, m in enumerate(o.data.materials) if m and (m.name in suaves or grupo in suaves or m.name in matices or es_follaje(m.name))]
        if lisos:
            me = o.data
            vert = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', vert)
            mat_cara = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mat_cara)
            lados = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', lados)
            es = np.isin(np.repeat(mat_cara, lados), lisos)   # las esquinas van cara tras cara, en orden
            suma, cuantas = np.zeros((len(me.vertices), 3)), np.zeros(len(me.vertices))
            np.add.at(suma, vert[es], col[es, :3]); np.add.at(cuantas, vert[es], 1)
            col[es, :3] = (suma[vert[es]] / cuantas[vert[es]][:, None]).astype(np.float32)
        col[:, :3] = np.clip(saturar(curva(col[:, :3] * escala)), 0, 1)
        # El matiz de los montes (ver `monte`): multiplica la luz, vértice a vértice.
        if matices:
            me = o.data
            mat_cara = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mat_cara)
            lados = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', lados)
            de_esquina = np.repeat(mat_cara, lados)
            vert = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', vert)
            sitios = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', sitios)
            normales = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('normal', normales)
            sitios, normales = sitios.reshape(-1, 3), normales.reshape(-1, 3)
            for i, m in enumerate(me.materials):
                if not m or m.name not in matices:
                    continue
                es = np.nonzero(de_esquina == i)[0]
                if not len(es):
                    continue
                pos, nz = sitios[vert[es]], normales[vert[es], 2]
                bsdf = m.node_tree.nodes['Principled BSDF']
                base = np.array(bsdf.inputs['Base Color'].default_value[:3], np.float32)
                liso = not bsdf.inputs['Base Color'].is_linked
                verde = liso and base[1] > base[0] * 1.15 and base[1] > base[2] * 1.15
                nieve = liso and base.min() > 0.5
                # La roca asoma en lo más empinado DE ESTE monte (el cuarenta por ciento
                # de más pendiente, y del todo en el diez): medida con un número fijo,
                # un cono afilado salía entero de roca y una cúpula, sin ninguna. Y a
                # una loma que apenas levanta no le sale.
                q_poca, q_toda = np.percentile(nz, (40, 10))
                fuerza = float(np.clip((0.93 - q_toda) / 0.22, 0, 1))
                roca = (np.clip((q_poca - nz) / max(q_poca - q_toda, 0.03), 0, 1) * fuerza)[:, None]
                if nieve:
                    a_roca = np.array((0.27, 0.26, 0.3), np.float32) / base      # la peña oscura bajo la nieve
                elif verde:
                    a_roca = np.array((0.3, 0.27, 0.23), np.float32) / np.maximum(base, 0.02)
                else:
                    a_roca = np.float32(0.66)
                alto_ = max(float(pos[:, 2].max() - pos[:, 2].min()), 1.0)
                # Estratos: bandas a la altura, algo torcidas. Solo se ven en la roca.
                bandas = 0.5 + 0.5 * np.sin((pos[:, 2] - pos[:, 2].min()) / alto_ * 46 + 1.8 * np.sin(pos[:, 0] * 0.013) + 1.3 * np.sin(pos[:, 1] * 0.017))
                manchas = 0.5 + 0.5 * np.sin(pos[:, 0] * 0.021 + 2.3 * np.sin(pos[:, 1] * 0.017)) * np.cos(pos[:, 1] * 0.026 + 1.7 * np.sin(pos[:, 2] * 0.04))
                grano = 0.5 + 0.5 * np.sin(pos[:, 0] * 0.19 + pos[:, 2] * 0.23) * np.sin(pos[:, 1] * 0.17)
                tono = (0.86 + 0.22 * manchas + 0.08 * grano)[:, None] * (1 - 0.16 * roca * bandas[:, None])
                col[es, :3] *= (1 - roca + roca * a_roca) * tono
                # Y la textura de detalle: el color del monte pasa a los vértices
                # (entre la media de la textura, para que el conjunto no se oscurezca)
                # y sus caras, al material de su tipo. Uno por tipo en cada malla.
                tipo = matices[m.name]
                if tipo:
                    imagen, media = tex_monte(tipo)
                    col[es, :3] = np.clip(col[es, :3] * base / media, 0, 1)
                    det = material('monte-det-' + tipo, imagen, rug=1.0)
                    ya = [k for k, otro in enumerate(me.materials) if otro == det]
                    if ya:
                        mat_cara[mat_cara == i] = ya[0]
                    else:
                        me.materials[i] = det
            me.polygons.foreach_set('material_index', mat_cara)
            me.update()
        # Lo que se mece: el alfa, ANTES de fundir materiales (después ya no se
        # sabe cuál era cada uno).
        alfa = np.ones(len(col), np.float32)
        if True:
            me = o.data
            mat_cara = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mat_cara)
            lados = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', lados)
            de_esquina = np.repeat(mat_cara, lados)
            vert = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', vert)
            for i, m in enumerate(me.materials):
                cuanto = cuanto_mece(m.name) if m else None
                if cuanto is None:
                    continue
                es = np.nonzero(de_esquina == i)[0]
                if callable(cuanto):
                    alfa[es] = 1 - np.clip([cuanto(me.vertices[v].co) for v in vert[es]], 0, 1)
                else:
                    alfa[es] = 1 - cuanto
        # La hoja del follaje (ver `tex_hojas`). Después de apuntar lo que se mece,
        # que va por el nombre del material y aquí el material cambia.
        me = o.data
        con_hoja = [i for i, m in enumerate(me.materials) if m and es_follaje(m.name) and not m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].is_linked
                    and m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value >= 1]
        if con_hoja and me.uv_layers.active:
            imagen, media = tex_hojas()
            hoja = material('hojas-det', imagen, rug=1.0)
            mat_cara = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mat_cara)
            lados = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', lados)
            de_esquina = np.repeat(mat_cara, lados)
            vert = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', vert)
            sitios = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', sitios)
            p = sitios.reshape(-1, 3)[vert]
            # Proyectada en el mundo y al sesgo (ninguna cara de una copa queda de canto
            # a la vez en los dos ejes). Cada cara, con sus vueltas enteras quitadas: la
            # textura repite, y con los números pequeños el archivo los guarda finos.
            uv = np.stack(((p[:, 0] * 0.8 + p[:, 1] * 0.45 + p[:, 2] * 0.4) / BALDOSA_HOJA, (p[:, 2] * 0.85 + p[:, 1] * 0.5 - p[:, 0] * 0.15) / BALDOSA_HOJA), axis=1)
            empieza = np.cumsum(lados) - lados
            uv -= np.repeat(np.floor(np.minimum.reduceat(uv, empieza, axis=0)), lados, axis=0)
            todas = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get('uv', todas)
            todas = todas.reshape(-1, 2)
            destino = None
            for i in con_hoja:
                es = de_esquina == i
                if not es.any():
                    continue
                base = np.array(me.materials[i].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3], np.float32)
                # Sin pasarse de uno: un verde claro se queda algo más oscuro antes que quemado.
                sube = base / media
                col[es, :3] = np.clip(col[es, :3] * sube / max(1.0, float(sube.max())), 0, 1)
                todas[es] = uv[es]
                if destino is None:
                    destino = i
                    me.materials[i] = hoja
                else:
                    mat_cara[mat_cara == i] = destino
            me.uv_layers.active.data.foreach_set('uv', todas.ravel())
            me.polygons.foreach_set('material_index', mat_cara)
            me.update()
        if fundir:
            # Los materiales de color liso se quedan en UNO: su color pasa a los
            # vértices, multiplicado por la luz (el juego hace esa misma cuenta).
            # Cada material es una llamada de dibujado, y un paseo con farolas,
            # bancos, coches y barcas juntaba cuarenta.
            me = o.data
            mat_cara = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mat_cara)
            lados = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', lados)
            de_esquina = np.repeat(mat_cara, lados)
            comun = None
            for i, m in enumerate(me.materials):
                b = m.node_tree.nodes['Principled BSDF']
                if b.inputs['Base Color'].is_linked or b.inputs['Emission Strength'].default_value > 0 or b.inputs['Alpha'].default_value < 1:
                    continue
                col[de_esquina == i, :3] *= np.array(b.inputs['Base Color'].default_value[:3], np.float32)
                if comun is None:
                    comun = i
                    me.materials[i] = material('liso', color=(1.0, 1.0, 1.0), rug=0.9)
                else:
                    mat_cara[mat_cara == i] = comun
            me.polygons.foreach_set('material_index', mat_cara)
            me.update()
        col[:, 3] = alfa
        atr.data.foreach_set('color', col.ravel())
        print('VERTICES', grupo, 'media', np.round(col[:, :3].mean(axis=0), 3))

    # --- exportar -------------------------------------------------------------------
    bpy.data.objects.remove(osol)
    for o in objetos.values():
        o.hide_render = False
    for archivo, claves in exportes:
        bpy.ops.object.select_all(action='DESELECT')
        caras = 0
        for k in claves:
            if k in objetos:
                objetos[k].select_set(True); caras += len(objetos[k].data.polygons)
        ruta = os.path.join(MODELOS, archivo + '.glb')
        bpy.ops.export_scene.gltf(
            filepath=ruta, export_format='GLB', use_selection=True, export_apply=True,
            export_image_format='JPEG', export_jpeg_quality=82, export_yup=True,
            export_lights=False, export_cameras=False, export_animations=False,
            export_vertex_color='ACTIVE', export_all_vertex_colors=False,
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
            export_draco_texcoord_quantization=14, export_draco_position_quantization=16)
        print('EXPORTADO', archivo, caras, 'caras', os.path.getsize(ruta), 'bytes')
    print('TOTAL', round(time.time() - E.t0), 's')
    return objetos
