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
    return V((x, -z, y))

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
            d = hacia
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
             hacia=V((medio.x - centro.x, medio.y - centro.y, 0)))
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
             hacia=V((medio.x - c.x, medio.y - c.y, 0)))
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
            h = hacia(sum(pts, V((0, 0, 0))) / len(pts)) if callable(hacia) else hacia
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
def arbol (grupo, tronco, hojas, x, z, tam=1.0, fino=False, y=0.0):
    alto_tronco = 2.6 * tam
    cubo(grupo, tronco, P(x, z, y + alto_tronco / 2 - 0.3), (0.35 * tam, 0.35 * tam, alto_tronco + 0.6))
    bm, _, _ = lote(grupo, random.choice(hojas))
    r = bmesh.ops.create_icosphere(bm, subdivisions=2 if fino else 1, radius=1.0,
        matrix=M.Translation(P(x, z, y + alto_tronco + 1.9 * tam)) @ M.Rotation(random.random() * 6.3, 4, 'Z') @ M.Diagonal((2.5 * tam, 2.5 * tam, 2.2 * tam, 1)))
    for v in r['verts']:
        v.co += V((random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(-0.25, 0.25))) * tam

def palmera (grupo, tronco, hojas, x, z, alto=7.0, y=0.0):
    """Tronco fino algo torcido y una corona de hojas caídas."""
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
# HORNEAR Y EXPORTAR
# ==================================================================================
def a_srgb (x):
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-6), 1 / 2.4) - 0.055)

def terminar (grupos, exportes, sol_hacia, sol_color=(1.0, 0.96, 0.88), sol_fuerza=3.5, sol_ancho=3.0,
              cielo_fuerza=0.7, cielo_altura=50.0, cielo_giro=0.0, escala=0.5, satura=1.0, rebotes=3,
              no_alumbran=()):
    """grupos: {clave: (nombre del objeto, tipo, mapa)}; tipo 'atlas' | 'planta' |
    'vert' | 'plano' | 'juego'; `mapa` es el nombre del mapa de luz (luzE…), y dos
    grupos de tipo 'planta' pueden compartirlo.
    exportes: [(archivo sin extensión, [claves])].
    sol_hacia: hacia el sol, en (x, y, z) del JUEGO."""
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
        print('  ', mapa, 'media', round(float(e[e > 0].mean()), 3), 'p50', round(float(np.percentile(e[e > 0], 50)), 3), 'p95', round(float(np.percentile(e[e > 0], 95)), 3), 'p99', round(float(np.percentile(e[e > 0], 99)), 3))
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
        col[:, :3] = np.clip(saturar(curva(col[:, :3] * escala)), 0, 1)
        col[:, 3] = 1
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
