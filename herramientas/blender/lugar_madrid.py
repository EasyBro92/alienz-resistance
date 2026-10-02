# Madrid: el Santiago Bernabéu nuevo y su barrio, hechos en Blender (02/10/2026).
#   blender -b -P herramientas/blender/lugar_madrid.py            (entero, ~20 min)
#   blender -b -P herramientas/blender/lugar_madrid.py -- --rapido (luz a 512, 1 min)
#
# Isidro: «ahora que tienes Blender, ¿podrías rehacerlo para que se vea ultra
# realista? Busca fotos de cómo es actualmente el Santiago Bernabéu y sus
# alrededores. Tal como está me gusta, pero es muy, muy básico». Eligió: TODO
# (interior y exterior), barrio con torres, al ATARDECER y gradas VACÍAS.
#
# Cómo es de verdad, y cómo queda aquí (x = este, z = sur, como un plano):
#   · la piel de LAMAS de acero inoxidable, en bandas horizontales que ondulan,
#     con barriga y más vuelo en la fachada de la Castellana (oeste); abajo, el
#     zócalo de vidrio con los accesos encendidos;
#   · la cubierta fija clara con el hueco de la retráctil abierta, y colgando
#     del borde el videomarcador de 360° y las líneas de focos;
#   · dentro, cuatro anfiteatros de butacas azul marino, palcos entre el
#     primero y el segundo, vallas de publicidad encendidas y el césped a rayas;
#   · fuera, la Castellana al oeste (calzada central, laterales y bulevares con
#     árboles), Concha Espina al sur, Padre Damián al este, el Palacio de
#     Congresos enfrente, AZCA al suroeste (Torre Picasso, Torre Europa, BBVA)
#     y, al norte, al final de la Castellana, las Cuatro Torres.
#
# LA LUZ VA HORNEADA. El sol bajo, las sombras largas y el rebote se calculan
# aquí con Cycles y se guardan: en mapas de luz (segundo juego de UV, `luz`) para
# el estadio, los edificios cercanos y el suelo, y en el color de los vértices
# para árboles, coches y edificios lejanos. En el juego esos materiales no
# calculan luz ninguna (son baratos) y se ven como en un render.
#
# Los números de dentro son los del juego y NO se tocan sin tocar main.js: el
# césped va de x = ±12 y de z = 10 a -62, el hueco del techo de x = ±24 y de
# z = 10 a -62, la cubierta llega a y = 39,5 y la carcasa mide 144 × 192.

import bpy, bmesh, os, sys, math, random, time, mathutils
import numpy as np

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RAPIDO = '--rapido' in ARGS
REUSAR = '--reusar' in ARGS             # no hornea: retoca la luz ya calculada (curva, color)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PH = os.path.join(RAIZ, 'herramientas', 'paquetes', 'polyhaven')
MODELOS = os.path.join(RAIZ, 'public', 'models')
TMP = os.path.join(PH, '_reducidas')
os.makedirs(TMP, exist_ok=True)
LADO_LUZ = 512 if RAPIDO else 2048
MUESTRAS = 10 if RAPIDO else 40
random.seed(1947)                       # el año en que se inauguró
rng = np.random.default_rng(1947)
bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene
esc.view_settings.view_transform = 'Standard'
V = mathutils.Vector
M = mathutils.Matrix
T0 = time.time()

MZ = -26.0                              # el centro del estadio en z

def P (x, z, y=0.0):
    return V((x, -z, y))

def rgb (h):
    return [((h >> s) & 255) / 255 for s in (16, 8, 0)]

# ==================================================================================
# 1. TEXTURAS
# ==================================================================================
def guardar (nombre, arr, calidad=82):
    """arr: alto × ancho × 3, valores sRGB de 0 a 1, la fila 0 arriba."""
    h, w, _ = arr.shape
    im = bpy.data.images.new(nombre, w, h, alpha=False)
    px = np.ones((h, w, 4), np.float32)
    px[..., :3] = np.clip(arr[::-1], 0, 1)
    im.pixels.foreach_set(px.ravel())
    ruta = os.path.join(TMP, f'madrid-{nombre}.jpg')
    im.filepath_raw = ruta
    im.file_format = 'JPEG'
    im.save(quality=calidad)
    bpy.data.images.remove(im)
    return bpy.data.images.load(ruta)

def de_polyhaven (nombre, lado=512, tono=None):
    ruta = os.path.join(PH, 'texturas', nombre, f'{nombre}_diff_1k.jpg')
    im = bpy.data.images.load(ruta)
    im.scale(lado, lado)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(lado, lado, 4)[::-1, :, :3]
    bpy.data.images.remove(im)
    if tono is not None:
        meta = np.array(rgb(tono), np.float32)
        px = meta + (px - px.mean(axis=(0, 1))) * 0.75
    return guardar(f'{nombre}-{tono or 0:06x}', px)

def ruido (h, w, grano=1.0):
    """Ruido suave que repite en los bordes (suma de octavas de ruido blanco ampliado)."""
    out = np.zeros((h, w), np.float32)
    for paso, peso in ((1, 0.5), (4, 0.3), (16, 0.2)):
        r = rng.random((max(1, h // paso), max(1, w // paso))).astype(np.float32)
        r = np.repeat(np.repeat(r, paso, axis=0), paso, axis=1)[:h, :w]
        if r.shape != (h, w):
            r = np.pad(r, ((0, h - r.shape[0]), (0, w - r.shape[1])), mode='wrap')
        out += r * peso
    return (out - 0.5) * grano

def lienzo (h, w, color):
    a = np.empty((h, w, 3), np.float32)
    a[:] = color
    return a

# --- las butacas: cuatro filas, veintidós butacas y una escalera ----------------
def tex_butacas (color, nombre, escalera=True):
    H, W, FILAS, COLS = 256, 1024, 4, 24
    a = lienzo(H, W, (0.36, 0.36, 0.35))
    a += ruido(H, W, 0.05)[..., None]
    fh, cw = H // FILAS, W / COLS
    for f in range(FILAS):
        y0 = f * fh
        a[y0:y0 + 5] = (0.52, 0.52, 0.5)                       # el canto del peldaño
        a[y0 + fh - 6:y0 + fh] *= 0.55                         # la sombra bajo la fila
        for c in range(COLS):
            x0, x1 = int(c * cw), int((c + 1) * cw)
            if escalera and c in (0, COLS - 1):
                a[y0 + 5:y0 + fh - 6, x0:x1] = (0.47, 0.47, 0.45)
                for k in range(3):
                    a[y0 + 8 + k * 18:y0 + 10 + k * 18, x0:x1] = (0.3, 0.3, 0.3)
                if c == 0:
                    a[y0:y0 + fh, x1 - 3:x1] = (0.92, 0.82, 0.2)   # el borde amarillo
                continue
            v = 1 + (random.random() - 0.5) * 0.14
            col = np.array(color) * v
            a[y0 + 10:y0 + 44, x0 + 4:x1 - 4] = col               # el respaldo
            a[y0 + 10:y0 + 15, x0 + 5:x1 - 5] = np.minimum(col * 1.9 + 0.06, 1)  # el brillo de arriba
            a[y0 + 44:y0 + 56, x0 + 5:x1 - 5] = col * 0.6         # el asiento plegado
    return guardar(nombre, a)

# --- la piel de lamas: toda la vuelta en una imagen -----------------------------
def tex_piel ():
    H, W, LAMAS = 512, 2048, 30
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / W, yy / H
    f = (yy * LAMAS / H) % 1.0                                  # 0 arriba de la lama, 1 abajo
    base = 0.60 + 0.26 * (1 - f) ** 1.5
    base[f > 0.86] = 0.2                                        # la rendija entre lamas
    # Cada lama está girada un poco distinta según por dónde va: de ahí salen
    # las aguas que se ven en las fotos, que cambian a lo largo de la fachada.
    aguas = 0.5 + 0.5 * np.sin(2 * np.pi * (u * 4 + 0.9 * np.sin(2 * np.pi * (v * 0.8 + u * 2))))
    aguas2 = 0.5 + 0.5 * np.sin(2 * np.pi * (u * 9 - v * 1.6 + 0.3 * np.sin(2 * np.pi * u * 3)))
    base *= 0.74 + 0.3 * aguas + 0.1 * aguas2
    # Los paneles: tramos de lama con su tono.
    lama = (yy * LAMAS / H).astype(np.int32)
    tramo = ((xx + lama * 37) // 28).astype(np.int32)
    tabla = rng.random(40000).astype(np.float32)
    base *= 0.93 + 0.14 * tabla[(lama * 131 + tramo * 17) % 40000]
    base[(xx + lama * 37) % 28 < 1] *= 0.8                      # la junta entre paneles
    # Las tres grietas que recorren la fachada en diagonal, por donde respira.
    for fase, amp, medio in ((0.05, 0.3, 0.52), (0.4, 0.22, 0.34), (0.72, 0.18, 0.7)):
        linea = (medio + amp * np.sin(2 * np.pi * (u * 2 + fase))) * H
        d = np.abs(yy - linea)
        base = np.where(d < 5, 0.14, np.where(d < 9, base * 0.75, base))
    # El acero no tiene color propio: devuelve el del cielo, y a esta hora el
    # cielo es dorado. Por eso va claro y un punto cálido.
    base = np.clip(base * 1.3, 0, 1)
    a = np.stack([base * 1.0, base * 0.94, base * 0.85], axis=-1)
    return guardar('piel', a, 85)

def tex_techo ():
    H, W = 256, 256
    a = lienzo(H, W, (0.8, 0.81, 0.82)) + ruido(H, W, 0.04)[..., None]
    a[:, :4] = (0.5, 0.52, 0.55); a[:, 124:128] *= 0.9
    a[:3] = (0.62, 0.64, 0.66); a[125:128] *= 0.92
    return guardar('techo', a)

def tex_bajo_techo ():
    H, W = 256, 256
    a = lienzo(H, W, (0.2, 0.21, 0.23)) + ruido(H, W, 0.03)[..., None]
    for k in range(0, 256, 64):
        a[k:k + 5] = (0.72, 0.73, 0.75); a[:, k:k + 5] = (0.72, 0.73, 0.75)
    for k in range(256):                                         # las diagonales de la cercha
        a[k, (k * 1) % 256] = (0.6, 0.6, 0.62); a[k, (255 - k) % 256] = (0.6, 0.6, 0.62)
    return guardar('bajo-techo', a)

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

def tex_video ():
    H, W = 128, 1024
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    a = np.stack([0.04 + 0.05 * xx / W, 0.12 + 0.2 * np.sin(np.pi * xx / W) ** 2, 0.5 + 0.4 * np.sin(np.pi * xx / W)], axis=-1).astype(np.float32)
    a[8:12] = (0.9, 0.95, 1); a[116:120] = (0.9, 0.95, 1)
    escribir(a, 'ALIENZ', 70, 34, 12, (1, 1, 1))
    a[30:98, 560:566] = (1, 1, 1)
    for k in range(6):                                           # los bloques de datos de la derecha
        a[34 + k * 10:40 + k * 10, 600:600 + int(120 + 200 * random.random())] = (0.55, 0.85, 1)
    a[34:94, 880:960] = (0.2, 0.9, 0.5)
    return guardar('video', a, 88)

def tex_vallas ():
    H, W = 32, 512
    a = lienzo(H, W, (0.95, 0.96, 1.0))
    a[:, 0:170] = (0.1, 0.25, 0.75)
    escribir(a, 'ALIENZ', 24, 8, 3, (1, 1, 1))
    a[:, 340:512] = (0.1, 0.7, 0.4)
    escribir(a, 'ALIENZ', 200, 8, 3, (0.1, 0.2, 0.6))
    escribir(a, 'ZIA', 380, 8, 3, (1, 1, 1))
    a[:2] *= 0.3; a[-2:] *= 0.3
    return guardar('vallas', a, 88)

def tex_palcos ():
    H, W = 64, 256
    a = lienzo(H, W, (0.05, 0.06, 0.08))
    for k in range(8):
        calido = random.random() < 0.7
        a[10:52, k * 32 + 3:k * 32 + 29] = (1.0, 0.78, 0.5) if calido else (0.25, 0.3, 0.38)
        a[40:52, k * 32 + 3:k * 32 + 29] *= 0.55
    a[:6] = (0.75, 0.76, 0.78)
    return guardar('palcos', a)

def tex_acceso ():
    H, W = 128, 512
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    calor = 0.55 + 0.45 * np.sin(np.pi * xx / 128) ** 2
    a = np.stack([calor * 1.0, calor * 0.8, calor * 0.52], axis=-1).astype(np.float32)
    a[yy < 34] *= 0.35                                           # el dintel, más apagado
    for k in range(0, W, 32):
        a[:, k:k + 3] = (0.05, 0.05, 0.06)
    a[30:34] = (0.05, 0.05, 0.06); a[:8] = (0.5, 0.52, 0.55)
    for k in (96, 352):                                          # dos puertas por tramo
        a[40:, k:k + 64] *= 1.25; a[40:, k + 31:k + 33] = (0.05, 0.05, 0.06)
    return guardar('acceso', a)

def tex_cesped ():
    H = W = 256
    n = ruido(H, W, 0.12)
    hebra = (rng.random((H, W)).astype(np.float32) - 0.5) * 0.1
    a = np.stack([0.21 + n * 0.5 + hebra * 0.5, 0.47 + n + hebra, 0.15 + n * 0.4 + hebra * 0.3], axis=-1)
    return guardar('cesped', a, 88)

# --- las fachadas: cuatro vanos por cuatro plantas en 512 -----------------------
def ventanas_sueltas (a, base, marco, alto_v=(30, 100), ancho_v=(30, 98), balcon=0.3, luz=0.14):
    for f in range(4):
        for c in range(4):
            x0, y0 = c * 128, f * 128
            cris = np.array((0.10, 0.13, 0.18)) * (0.8 + 0.5 * random.random())
            encendida = random.random() < luz
            v = a[y0 + alto_v[0]:y0 + alto_v[1], x0 + ancho_v[0]:x0 + ancho_v[1]]
            v[:] = marco
            dentro = v[4:-4, 4:-4]
            hh = dentro.shape[0]
            grad = np.linspace(1.9, 0.8, hh, dtype=np.float32)[:, None, None]
            dentro[:] = np.array((1.0, 0.76, 0.45)) * 0.95 if encendida else np.clip(cris * grad + np.array((0.10, 0.06, 0.02)) * (grad - 0.8), 0, 1)
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

def tex_crema (nombre, base):
    a = lienzo(512, 512, base) + ruido(512, 512, 0.05)[..., None]
    ventanas_sueltas(a, base, (0.34, 0.3, 0.26), alto_v=(18, 104), ancho_v=(36, 92), balcon=0.6)
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
            luz = random.random() < 0.18
            grad = np.linspace(1.7, 0.8, 70, dtype=np.float32)[:, None, None]
            a[y0 + 34:y0 + 104, x0 + 2:x0 + 30] = (1.0, 0.8, 0.5) if luz else np.clip(c * grad + np.array((0.12, 0.07, 0.02)) * (grad - 0.8), 0, 1)
        a[y0 + 104:y0 + 110] = np.array(antepecho) * 0.6
        a[y0 + 28:y0 + 34] = np.array(antepecho) * 1.08
    return guardar(nombre, a)

def tex_vidrio (nombre, cristal, montante=(0.1, 0.11, 0.13)):
    yy, xx = np.mgrid[0:512, 0:512].astype(np.float32)
    a = lienzo(512, 512, cristal)
    for f in range(8):
        for c in range(8):
            v = 0.75 + 0.5 * random.random()
            luz = random.random() < 0.1
            a[f * 64:(f + 1) * 64, c * 64:(c + 1) * 64] = (0.95, 0.8, 0.55) if luz else np.array(cristal) * v
    a *= (0.8 + 0.5 * (1 - (yy % 128) / 128))[..., None]            # el reflejo del cielo, planta a planta
    a[:, ::64] = montante; a[:, 1::64] = montante; a[::64] = montante; a[1::64] = montante
    a[::128] = np.array(montante) * 2; a[2::128] = np.array(montante) * 2
    return guardar(nombre, a)

def tex_nervios (nombre, blanco, hueco):
    a = lienzo(512, 512, blanco) + ruido(512, 512, 0.03)[..., None]
    for k in range(0, 512, 32):
        a[:, k + 9:k + 23] = hueco
        for f in range(0, 512, 128):
            if random.random() < 0.15:
                a[f + 20:f + 120, k + 9:k + 23] = (1.0, 0.8, 0.5)
    for f in range(0, 512, 128):
        a[f:f + 10] = np.array(blanco) * 0.92
    return guardar(nombre, a)

def tex_azotea ():
    a = lienzo(256, 256, (0.36, 0.34, 0.32)) + ruido(256, 256, 0.1)[..., None]
    for _ in range(9):
        x, y = random.randint(8, 210), random.randint(8, 210)
        w, h = random.randint(10, 36), random.randint(10, 30)
        a[y:y + h, x:x + w] = random.choice([(0.55, 0.55, 0.56), (0.22, 0.22, 0.23), (0.62, 0.36, 0.26)])
        a[y + h:y + h + 3, x:x + w + 3] *= 0.5
    a[:4] = (0.5, 0.48, 0.45); a[:, :4] = (0.5, 0.48, 0.45)
    return guardar('azotea', a)

SOL_GAME = (-0.93, 0.3)                                  # hacia el sol, en x y z del juego
def tex_cielo ():
    """La cúpula: u da la vuelta (0 = este), v sube del horizonte al cénit."""
    H, W = 256, 1024
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    e = 1 - yy / (H - 1)                                           # 0 en el horizonte, 1 arriba
    u = xx / W
    u_sol = (math.atan2(SOL_GAME[1], SOL_GAME[0]) / (2 * math.pi)) % 1.0
    du = np.abs(((u - u_sol + 0.5) % 1.0) - 0.5)                    # 0 hacia el sol, 0,5 a su espalda
    paradas = [(0.0, (0.93, 0.68, 0.47)), (0.06, (0.95, 0.66, 0.46)), (0.16, (0.86, 0.6, 0.56)), (0.34, (0.56, 0.52, 0.68)), (0.62, (0.3, 0.38, 0.62)), (1.0, (0.2, 0.28, 0.52))]
    a = np.zeros((H, W, 3), np.float32)
    for (e0, c0), (e1, c1) in zip(paradas, paradas[1:]):
        t = np.clip((e - e0) / (e1 - e0), 0, 1)[..., None]
        dentro = ((e >= e0) & (e <= e1))[..., None]
        a = np.where(dentro, np.array(c0) * (1 - t) + np.array(c1) * t, a)
    # A la espalda del sol el cielo es más frío y más oscuro.
    lejos = (du * 2)[..., None] ** 1.5
    a = a * (1 - 0.3 * lejos) + np.array((0.1, 0.12, 0.3)) * 0.25 * lejos * (1 - e[..., None] * 0.3)
    # El resplandor de poniente, y el disco.
    g = np.exp(-((du * 7) ** 2 + (e * 4.5) ** 2))[..., None]
    a += np.array((0.5, 0.26, 0.02)) * g
    disco = np.exp(-(((du * W / 1024 * 60) ** 2) + (((e - 0.07) * 30) ** 2)))[..., None]
    a += np.array((1.0, 0.85, 0.5)) * np.clip(disco * 1.4, 0, 1)
    # Nubes: jirones alargados, encendidos por debajo hacia el sol.
    n = np.zeros((H, W), np.float32)
    for fx, fy, peso in ((3, 5, 0.5), (7, 11, 0.3), (15, 23, 0.2)):
        fase = rng.random(2) * 6.28
        n += peso * (np.sin(2 * np.pi * u * fx + fase[0] + 2.5 * np.sin(2 * np.pi * e * fy * 0.5 + fase[1])) * np.sin(2 * np.pi * e * fy + fase[1] + np.sin(2 * np.pi * u * fx * 2)))
    nube = np.clip((n - 0.12) * 3, 0, 1) * np.clip((e - 0.07) * 9, 0, 1) * np.clip((0.6 - e) * 4, 0, 1)
    color_nube = np.array((1.0, 0.62, 0.42)) * (1 - lejos) + np.array((0.52, 0.44, 0.56)) * lejos
    a = a * (1 - nube[..., None] * 0.75) + color_nube * nube[..., None] * 0.75
    return guardar('cielo', a, 90)

def tex_calzada ():
    """Asfalto con la raya discontinua en el borde izquierdo: una baldosa por carril."""
    a = lienzo(512, 128, (0.2, 0.2, 0.21)) + ruido(512, 128, 0.07)[..., None]
    a[40:260, 0:5] = (0.82, 0.82, 0.78)
    a[:, 60:68] *= 0.93                                           # la rodada
    return guardar('calzada', a)

# ==================================================================================
# 2. MATERIALES
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
    b.inputs['Metallic'].default_value = metal
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
        b.inputs['Emission Strength'].default_value = emite
        b.inputs['Base Color'].default_value = (0, 0, 0, 1) if salida is None else b.inputs['Base Color'].default_value
    if alfa < 1:
        b.inputs['Alpha'].default_value = alfa
        m.blend_method = 'BLEND'
    mats[nombre] = m
    return m

NAVY = (0.075, 0.13, 0.30)
CESPED = material('cesped', tex_cesped(), rug=0.95)
CESPED_B = material('cesped-oscuro', CESPED.node_tree.nodes['Image Texture'].image, tinte=0xa9c4a4, rug=0.95)
RAYA = material('raya', color=(0.86, 0.9, 0.86))
BUTACAS = material('butacas', tex_butacas(NAVY, 'butacas'))
BUTACAS_BLANCAS = material('butacas-blancas', tex_butacas((0.86, 0.88, 0.9), 'butacas-blancas', False))
HORMIGON = material('hormigon', de_polyhaven('concrete_floor_worn_001', 512, 0x9a9892))
HORMIGON_OSCURO = material('hormigon-oscuro', HORMIGON.node_tree.nodes['Image Texture'].image, tinte=0x6c7078)
ACOLCHADO = material('acolchado', color=(0.05, 0.08, 0.2))
PIEL = material('piel', tex_piel(), rug=0.5)                 # sin metal: el paso difuso de un metal sale a oscuras
TECHO = material('techo', tex_techo(), rug=0.7)
BAJO_TECHO = material('bajo-techo', tex_bajo_techo())
BORDE_TECHO = material('borde-techo', color=(0.62, 0.64, 0.67), rug=0.5)
VIDEO = material('brillo-video', tex_video(), emite=2.2)
VALLAS = material('brillo-vallas', tex_vallas(), emite=1.6)
PALCOS = material('brillo-palcos', tex_palcos(), emite=1.3)
ACCESO = material('brillo-acceso', tex_acceso(), emite=2.0)
FOCOS = material('brillo-focos', color=(1.0, 0.97, 0.9), emite=1.0)   # la fuerza de verdad, abajo
CINTA = material('brillo-cinta', color=(0.5, 0.75, 1.0), emite=1.5)
PALO = material('palo', color=(0.93, 0.94, 0.95))
RED = material('red', color=(0.9, 0.92, 0.94), alfa=0.22)
BANQUILLO = material('banquillo', color=(0.12, 0.14, 0.2), rug=0.4)

ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x35363a), rug=0.95)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0x8f8a82), rug=0.9)
PLAZA = material('plaza', de_polyhaven('concrete_floor_worn_001', 512, 0xb4ada2), rug=0.9)
PARQUE = material('parque', de_polyhaven('leafy_grass', 512, 0x4f6b34), rug=1.0)
CIELO = material('cielo', tex_cielo(), emite=1.0)
LEJOS = material('lejos', color=(0.33, 0.31, 0.3), rug=1.0)
AZOTEA = material('azotea', tex_azotea())
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.09, 0.19, 0.06), (0.12, 0.22, 0.07), (0.15, 0.24, 0.08), (0.2, 0.23, 0.08)])]
TRONCO = material('tronco', color=(0.2, 0.15, 0.1))
METAL = material('metal-oscuro', color=(0.12, 0.12, 0.13), rug=0.5)
FAROLA = material('brillo-farola', color=(1.0, 0.82, 0.5), emite=3.0)
COCHES = [material(f'coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.75, 0.76, 0.78), (0.1, 0.1, 0.11), (0.5, 0.08, 0.07), (0.1, 0.18, 0.4), (0.82, 0.8, 0.74), (0.3, 0.32, 0.34)])]
LUNA = material('coche-luna', color=(0.04, 0.05, 0.07), rug=0.2)

F_LADRILLO = [material(f'f-ladrillo-{i}', tex_ladrillo(f'ladrillo-{i}', c)) for i, c in enumerate([(0.52, 0.27, 0.19), (0.6, 0.36, 0.25), (0.44, 0.24, 0.18)])]
F_CREMA = [material(f'f-crema-{i}', tex_crema(f'crema-{i}', c)) for i, c in enumerate([(0.8, 0.74, 0.62), (0.72, 0.7, 0.66), (0.84, 0.8, 0.72)])]
F_OFICINA = [material('f-oficina-0', tex_oficina('oficina-0', (0.72, 0.7, 0.66), (0.1, 0.14, 0.2))),
             material('f-oficina-1', tex_oficina('oficina-1', (0.34, 0.3, 0.27), (0.12, 0.13, 0.15)))]
F_VIDRIO = [material('f-vidrio-0', tex_vidrio('vidrio-0', (0.16, 0.26, 0.36)), rug=0.2),
            material('f-vidrio-1', tex_vidrio('vidrio-1', (0.2, 0.3, 0.3)), rug=0.2),
            material('f-vidrio-2', tex_vidrio('vidrio-2', (0.1, 0.13, 0.17)), rug=0.2)]
F_PICASSO = material('f-picasso', tex_nervios('picasso', (0.9, 0.9, 0.88), (0.1, 0.11, 0.13)))
F_EUROPA = material('f-europa', tex_nervios('europa', (0.62, 0.6, 0.56), (0.08, 0.09, 0.1)))
F_BBVA = material('f-bbva', tex_oficina('bbva', (0.5, 0.3, 0.16), (0.12, 0.1, 0.09)))
F_PWC = material('f-pwc', tex_oficina('pwc', (0.86, 0.86, 0.84), (0.14, 0.2, 0.26)))
F_CONGRESOS = material('f-congresos', tex_nervios('congresos', (0.78, 0.76, 0.72), (0.16, 0.14, 0.13)))
print('TEXTURAS', round(time.time() - T0, 1), 's')

# ==================================================================================
# 3. GEOMETRÍA: lotes por grupo y material
# ==================================================================================
# Grupos: E estadio con mapa de luz · S el césped (luz del juego, recibe sombras)
#         EP estadio sin luz (rayas, red) y lo que brilla · C edificios cercanos
#         G suelo de la ciudad · T árboles, coches y lo lejano (luz en vértices)
#         CP ciudad sin luz y lo que brilla
lotes = {}
def lote (grupo, mat):
    k = (grupo, mat.name)
    if k not in lotes:
        bm = bmesh.new()
        lotes[k] = (bm, bm.loops.layers.uv.new('UVMap'), mat)
    return lotes[k]

ARRIBA, ABAJO = V((0, 0, 1)), V((0, 0, -1))
EJE = P(0, MZ)
def cara (grupo, mat, pts, uvs=None, hacia=None, baldosa=None):
    bm, uv, _ = lote(grupo, mat)
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs)
    f.normal_update()
    if hacia is not None:
        c = f.calc_center_median()
        d = V((c.x - EJE.x, c.y - EJE.y, 0)) if hacia == 'fuera' else V((EJE.x - c.x, EJE.y - c.y, 0)) if hacia == 'dentro' else hacia
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

def prisma (grupo, mat, planta, y0, y1, techo=None, baldosa=12.0):
    """planta: lista de (x, z) en orden; paredes y tapa."""
    cx = sum(p[0] for p in planta) / len(planta); cz = sum(p[1] for p in planta) / len(planta)
    u = 0.0
    for i in range(len(planta)):
        (ax, az), (bx, bz) = planta[i], planta[(i + 1) % len(planta)]
        largo = math.hypot(bx - ax, bz - az)
        pts = [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)]
        medio = (pts[0] + pts[2]) / 2
        c = P(cx, cz)
        cara(grupo, mat, pts, uvs=[(u, 0), (u + largo / baldosa, 0), (u + largo / baldosa, (y1 - y0) / baldosa), (u, (y1 - y0) / baldosa)],
             hacia=V((medio.x - c.x, medio.y - c.y, 0)))
        u += largo / baldosa
    cara(grupo, techo or mat, [P(x, z, y1) for x, z in planta], hacia=ARRIBA, baldosa=24.0)

# --- el contorno de «rectángulo redondeado», con sus normales --------------------
def rr (hx, hz, r, cz=MZ, arc=6, rec=4):
    r = min(r, hx - 0.01, hz - 0.01)
    esq = [(hx - r, cz + hz - r, 0), (-(hx - r), cz + hz - r, 90), (-(hx - r), cz - (hz - r), 180), (hx - r, cz - (hz - r), 270)]
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

def franja (grupo, mat, A, ya, B, yb, hacia, u_baldosa=None, v0=0.0, v1=1.0, u_total=None):
    """Una tira de caras entre dos contornos del mismo número de puntos."""
    n = len(A)
    ya = ya if isinstance(ya, (list, tuple)) else [ya] * n
    yb = yb if isinstance(yb, (list, tuple)) else [yb] * n
    acc = [0.0]
    for i in range(n):
        j = (i + 1) % n
        acc.append(acc[-1] + math.hypot((A[j][0] + B[j][0] - A[i][0] - B[i][0]) / 2, (A[j][1] + B[j][1] - A[i][1] - B[i][1]) / 2))
    total = acc[-1]
    reps = u_total if u_total is not None else max(1, round(total / u_baldosa))
    for i in range(n):
        j = (i + 1) % n
        u0, u1 = acc[i] / total * reps, acc[i + 1] / total * reps
        cara(grupo, mat, [P(A[i][0], A[i][1], ya[i]), P(A[j][0], A[j][1], ya[j]), P(B[j][0], B[j][1], yb[j]), P(B[i][0], B[i][1], yb[i])],
             uvs=[(u0, v0), (u1, v0), (u1, v1), (u0, v1)], hacia=hacia)

def cubo (grupo, mat, centro, tam, giro=0.0):
    bm, uv, _ = lote(grupo, mat)
    m = M.Translation(centro) @ M.Rotation(giro, 4, 'Z') @ M.Diagonal((tam[0], tam[1], tam[2], 1))
    bmesh.ops.create_cube(bm, size=1, matrix=m)

# ==================================================================================
# 4. EL ESTADIO
# ==================================================================================
# --- el césped, a franjas de siega ----------------------------------------------
BX, BZ, BR = 15.5, 53.0, 8.0            # el borde interior del graderío
for k, z in enumerate(range(28, -80, -6)):
    rect('S', CESPED if k % 2 else CESPED_B, -BX - 0.5, BX + 0.5, z, z - 6, 0.0, baldosa=4.0)
def raya (x0, x1, z0, z1):
    rect('EP', RAYA, x0, x1, z0, z1, 0.05)
G1, G2 = 4.0, -56.0                     # las dos líneas de gol (la de delante es tu base)
for lado in (-1, 1):
    raya(lado * 10 - 0.15, lado * 10 + 0.15, G1, G2)
for z in (G1, G2, MZ):
    raya(-10, 10, z - 0.15, z + 0.15)
for z, s in ((G1, -1), (G2, 1)):
    raya(-10 + 2.5, 10 - 2.5, z + s * 11 - 0.15, z + s * 11 + 0.15)             # el área
    for lado in (-1, 1):
        raya(lado * 7.5 - 0.15, lado * 7.5 + 0.15, z, z + s * 11)
        raya(lado * 3.6 - 0.12, lado * 3.6 + 0.12, z, z + s * 4)                # el área pequeña
    raya(-3.6, 3.6, z + s * 4 - 0.12, z + s * 4 + 0.12)
    raya(-0.25, 0.25, z + s * 7.6 - 0.25, z + s * 7.6 + 0.25)                   # el punto de penalti
for i in range(40):                                                             # el círculo central
    a0, a1 = 2 * math.pi * i / 40, 2 * math.pi * (i + 1) / 40
    cara('EP', RAYA, [P(6.0 * math.cos(a0), MZ + 6.0 * math.sin(a0), 0.05), P(6.3 * math.cos(a0), MZ + 6.3 * math.sin(a0), 0.05),
                      P(6.3 * math.cos(a1), MZ + 6.3 * math.sin(a1), 0.05), P(6.0 * math.cos(a1), MZ + 6.0 * math.sin(a1), 0.05)], hacia=ARRIBA)

# --- las porterías: la de delante es la que defiendes ------------------------------
for z, s in ((G1, 1), (G2, -1)):
    for lado in (-1, 1):
        caja('E', PALO, lado * 3.7 - 0.1, lado * 3.7 + 0.1, z - 0.1, z + 0.1, 0, 2.6)
        cara('EP', RED, [P(lado * 3.7, z, 0), P(lado * 3.7, z + s * 1.7, 0), P(lado * 3.7, z + s * 1.0, 2.6), P(lado * 3.7, z, 2.6)])
    caja('E', PALO, -3.8, 3.8, z - 0.1, z + 0.1, 2.5, 2.7)
    cara('EP', RED, [P(-3.7, z + s * 1.7, 0), P(3.7, z + s * 1.7, 0), P(3.7, z + s * 1.0, 2.6), P(-3.7, z + s * 1.0, 2.6)])
    cara('EP', RED, [P(-3.7, z, 2.6), P(3.7, z, 2.6), P(3.7, z + s * 1.0, 2.6), P(-3.7, z + s * 1.0, 2.6)])

# --- las vallas de publicidad, encendidas ----------------------------------------
V_IN = rr(BX - 1.6, BZ - 1.6, BR - 1.2)
franja('EP', VALLAS, V_IN, 0.0, V_IN, 0.95, 'dentro', u_baldosa=16.0)
franja('E', ACOLCHADO, [(p[0] + p[2] * 0.25, p[1] + p[3] * 0.25) for p in V_IN], 0.0, [(p[0] + p[2] * 0.25, p[1] + p[3] * 0.25) for p in V_IN], 0.95, 'fuera', u_baldosa=8)

# --- el graderío ---------------------------------------------------------------
def anillo (d, arc=6, rec=6):
    return rr(BX + d, BZ + d, BR + d, arc=arc, rec=rec)
FILA = 0.95
def grada (d0, y0, d1, y1):
    filas = round(math.hypot(d1 - d0, y1 - y0) / (FILA * 1.12))
    franja('E', BUTACAS, anillo(d0), y0, anillo(d1), y1, ARRIBA, u_baldosa=12.0, v0=0, v1=filas / 4)
def frente (d, y0, y1, mat, grupo='E', baldosa=6.0, hacia='dentro'):
    franja(grupo, mat, anillo(d), y0, anillo(d), y1, hacia, u_baldosa=baldosa, v0=0, v1=(y1 - y0) / baldosa if baldosa < 20 else 1)
def paseo (d0, d1, y, mat=HORMIGON):
    franja('E', mat, anillo(d0), y, anillo(d1), y, ARRIBA, u_baldosa=6.0, v0=0, v1=(d1 - d0) / 6)

frente(0, 0, 1.25, ACOLCHADO)                                   # el muro del foso
paseo(0, 0.5, 1.25, HORMIGON_OSCURO)
grada(0.5, 1.1, 9, 5.9)                                         # primer anfiteatro
paseo(9, 11, 5.9)
franja('EP', PALCOS, anillo(11), 5.9, anillo(11), 8.3, 'dentro', u_baldosa=16.0)    # los palcos
grada(11, 8.3, 18.5, 15.2)                                      # segundo
frente(18.5, 15.2, 17.4, HORMIGON_OSCURO)
franja('EP', CINTA, anillo(18.45), 16.5, anillo(18.45), 16.95, 'dentro', u_total=1)  # la cinta de luz
grada(18.5, 17.4, 24, 25.4)                                     # tercero
frente(24, 25.4, 27, HORMIGON)
grada(24, 27, 29, 35)                                           # cuarto, casi en vertical
frente(29, 35, 36, HORMIGON_OSCURO)

# Las letras ALIENZ en butacas blancas, en el segundo anfiteatro del fondo (el
# nombre del juego y no el del club: es lo mismo que había).
def recorrido (d):
    pts = rr(BX + d, BZ + d, BR + d, arc=24, rec=16)
    i0 = min(range(len(pts)), key=lambda i: (pts[i][1], abs(pts[i][0])))    # el centro del fondo
    return pts, i0
def punto_en (d, s):
    pts, i = recorrido(d)
    paso = 1 if s >= 0 else -1
    resto = abs(s)
    while True:
        j = (i + paso) % len(pts)
        tramo = math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1])
        if tramo >= resto:
            t = resto / tramo
            return pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t
        resto -= tramo; i = j
def y_grada2 (d):
    return 8.3 + (d - 11) * (15.2 - 8.3) / 7.5 + 0.07
PALABRA, CELDA = 'ALIENZ', 1.1
ncol = len(PALABRA) * 6 - 1
for l, ch in enumerate(PALABRA):
    for f, fila in enumerate(LETRAS[ch]):
        for c, bit in enumerate(fila):
            if bit != '1':
                continue
            s0 = (l * 6 + c - ncol / 2) * CELDA
            d0 = 11 + FILA * (1.6 + (4 - f)); d1 = d0 + FILA
            esquinas = [(d0, s0), (d0, s0 + CELDA), (d1, s0 + CELDA), (d1, s0)]
            pts = []
            for d, s in esquinas:
                x, z = punto_en(d, s)
                pts.append(P(x, z, y_grada2(d)))
            cara('E', BUTACAS_BLANCAS, pts, uvs=[(0, 0), (2 / 24 * 12 / 12 + 1 / 24, 0), (2 / 24 + 1 / 24, 0.25), (0, 0.25)], hacia=ARRIBA)

# Los banquillos, a la izquierda y fuera del paso.
for z in (-14, -38):
    caja('E', BANQUILLO, -14.6, -13.3, z - 4, z + 4, 0, 1.5)

# --- la piel de lamas -----------------------------------------------------------
SX, SZ, SR = 72.0, 96.0, 56.0
ALTO = 36.0
base_piel = rr(SX, SZ, SR, arc=16, rec=5)
NP = len(base_piel)
def vuelo (t, x, z):
    ang = math.atan2(z - MZ, x)
    oeste = max(0.0, -math.cos(ang)) ** 2                        # la fachada de la Castellana
    return (0.3 + 3.6 * math.sin(math.pi * t) ** 0.8
            + 1.5 * math.sin(math.pi * t) * math.sin(2 * ang + 0.7)
            + 2.6 * t * oeste)
def contorno_piel (t):
    return [(x + nx * vuelo(t, x, z), z + nz * vuelo(t, x, z)) for x, z, nx, nz in base_piel]
NIVELES = 16
Y_PIEL = 4.2
for k in range(NIVELES):
    t0, t1 = k / NIVELES, (k + 1) / NIVELES
    franja('E', PIEL, contorno_piel(t0), Y_PIEL + (ALTO - Y_PIEL) * t0, contorno_piel(t1), Y_PIEL + (ALTO - Y_PIEL) * t1, 'fuera', u_total=1, v0=1 - t0, v1=1 - t1)
# El zócalo de vidrio, metido hacia dentro, con los accesos encendidos.
zocalo = rr(SX - 1.8, SZ - 1.8, SR - 1.8, arc=16, rec=5)
franja('EP', ACCESO, zocalo, -0.4, zocalo, Y_PIEL, 'fuera', u_baldosa=24.0)
franja('E', BORDE_TECHO, zocalo, Y_PIEL, contorno_piel(0), Y_PIEL, ABAJO, u_baldosa=8)   # el sofito

# --- la cubierta ----------------------------------------------------------------
HX, HZ, HR = 24.0, 36.0, 14.0           # el hueco, encima del campo
hueco = rr(HX, HZ, HR, arc=16, rec=5)
corona = contorno_piel(1.0)
def entre (f):
    return [(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f) for a, b in zip(corona, hueco)]
PERFIL = [(0, 36.0), (0.12, 38.2), (0.5, 39.5), (0.88, 38.6), (1, 37.3)]
for (f0, y0), (f1, y1) in zip(PERFIL, PERFIL[1:]):
    franja('E', TECHO, entre(f0), y0, entre(f1), y1, ARRIBA, u_total=44, v0=f0 * 5, v1=f1 * 5)
franja('E', BAJO_TECHO, corona, 35.5, hueco, 35.5, ABAJO, u_baldosa=10.0, v0=0, v1=5)
franja('E', BORDE_TECHO, hueco, 33.9, hueco, 37.3, 'dentro', u_baldosa=8)                 # el canto del hueco
franja('E', BORDE_TECHO, corona, 35.5, corona, 36.0, 'fuera', u_baldosa=8)
# Las dos vigas de la retráctil, a lo largo del hueco (abierta, recogida).
for lado in (-1, 1):
    caja('E', BORDE_TECHO, lado * 27 - 1.6, lado * 27 + 1.6, MZ - HZ - 14, MZ + HZ + 14, 37.8, 40.6, baldosa=8)
    for z in range(int(MZ - HZ), int(MZ + HZ) + 1, 9):
        caja('E', TECHO, lado * 29, lado * 44, z - 3.4, z + 3.4, 38.4, 39.9, baldosa=8)     # los paños recogidos

# --- el videomarcador de 360° y los focos, colgados del borde ----------------------
arriba_v = rr(HX - 0.9, HZ - 0.9, HR - 0.9, arc=16, rec=5)
abajo_v = rr(HX - 1.7, HZ - 1.7, HR - 1.7, arc=16, rec=5)
franja('EP', VIDEO, abajo_v, 27.8, arriba_v, 33.2, 'dentro', u_total=6, v0=0, v1=1)
franja('E', BORDE_TECHO, [(p[0] + p[2] * 0.2, p[1] + p[3] * 0.2) for p in abajo_v], 27.8, [(p[0] + p[2] * 0.2, p[1] + p[3] * 0.2) for p in arriba_v], 33.2, 'fuera', u_baldosa=8)
focos = rr(HX - 0.5, HZ - 0.5, HR - 0.5, arc=16, rec=5)
franja('EP', FOCOS, focos, 33.35, [(p[0] - p[2] * 0.5, p[1] - p[3] * 0.5) for p in focos], 33.75, ABAJO, u_total=1)

# ==================================================================================
# 5. LA CIUDAD
# ==================================================================================
X0, X1, Z0, Z1 = -1500.0, 1500.0, -2300.0, 900.0        # hasta donde llega el suelo
CORTES_X = [X0, -340.0, 340.0, X1]                      # la parte fina del mapa de luz, y la basta
CORTES_Z = [Z0, -430.0, 310.0, Z1]
PESOS = [0.14, 0.72, 0.14]
def uv_suelo (x, z):
    def eje (v, cortes):
        acc = 0.0
        for i in range(3):
            if v <= cortes[i + 1] or i == 2:
                return acc + PESOS[i] * (v - cortes[i]) / (cortes[i + 1] - cortes[i])
            acc += PESOS[i]
    return eje(x, CORTES_X), 1 - eje(z, CORTES_Z)
piezas_suelo = []
def suelo (mat, x0, x1, z0, z1, y, baldosa=8.0, carriles=None):
    """Un rectángulo de suelo, partido por los cortes del mapa de luz."""
    x0, x1 = max(X0, min(x0, x1)), min(X1, max(x0, x1)); z0, z1 = max(Z0, min(z0, z1)), min(Z1, max(z0, z1))
    xs = [x0] + [c for c in CORTES_X if x0 < c < x1] + [x1]
    zs = [z0] + [c for c in CORTES_Z if z0 < c < z1] + [z1]
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            a, b, c, d = xs[i], xs[i + 1], zs[j], zs[j + 1]
            if carriles:        # (x de origen, ancho de carril, a lo largo de z o de x)
                o, w, eje = carriles
                uv = [((px - o) / w, pz / 12) if eje == 'z' else ((pz - o) / w, px / 12) for px, pz in ((a, d), (b, d), (b, c), (a, c))]
                rect('G', mat, a, b, c, d, y, uvs=uv)
            else:
                rect('G', mat, a, b, c, d, y, baldosa=baldosa)

suelo(ACERA, X0, X1, Z0, Z1, -0.3, 6.0)
# La explanada del estadio, de granito claro.
suelo(PLAZA, -100, 100, -175, 100, -0.2, 10.0)

# --- la Castellana: laterales, bulevares con árboles y calzada central --------------
CAS = -135.0
suelo(CALZADA, CAS - 14, CAS + 14, Z0, Z1, -0.24, carriles=(CAS - 14, 3.5, 'z'))
for lado in (-1, 1):
    suelo(PARQUE, CAS + lado * 14, CAS + lado * 20, Z0, Z1, -0.2, 5.0)
    suelo(CALZADA, CAS + lado * 20, CAS + lado * 28, Z0, Z1, -0.24, carriles=(CAS + lado * 20, 4.0, 'z'))
rect('CP', RAYA, CAS - 0.25, CAS + 0.25, -1400, 800, -0.2)

# --- las calles: una cuadrícula con las manzanas dentro ---------------------------
PASO = 66.0
PLAZA_X, PLAZA_Z = (-100.0, 100.0), (-180.0, 104.0)
def sin_castellana (x):
    return not (CAS - 40 < x < CAS + 40)
calles_x = sorted(112.0 if x == 96.0 else float(x) for x in np.arange(-1422.0, 1423.0, PASO) if sin_castellana(x))   # 112 = Padre Damián
calles_z = sorted({-178.0: -186.0, 86.0: 112.0}.get(float(z), float(z)) for z in np.arange(-2224.0, 880.0, PASO))     # Rafael Salgado y Concha Espina
for x in calles_x:
    tramos = [(Z0, PLAZA_Z[0] - 12), (PLAZA_Z[1] + 14, Z1)] if PLAZA_X[0] < x < PLAZA_X[1] else [(Z0, Z1)]
    for a, b in tramos:
        suelo(CALZADA, x - 6, x + 6, a, b, -0.24, carriles=(x - 6, 6.0, 'z'))
for z in calles_z:
    w = 10 if z == 112.0 else 6
    este = 112.0 if PLAZA_Z[0] < z < PLAZA_Z[1] else CAS + 28
    for a, b in ((X0, CAS - 28), (este, X1)):
        suelo(CALZADA, a, b, z - w, z + w, -0.235, carriles=(z - w, w, 'x'))
# El despiece de la explanada: bandas de granito oscuro cada dieciséis metros.
for x in np.arange(-96.0, 97.0, 16.0):
    if abs(x) > 80:
        suelo(HORMIGON_OSCURO, x - 0.4, x + 0.4, PLAZA_Z[0] + 2, PLAZA_Z[1] - 2, -0.185, 6.0)
    else:
        suelo(HORMIGON_OSCURO, x - 0.4, x + 0.4, PLAZA_Z[0] + 2, -128, -0.185, 6.0)
        suelo(HORMIGON_OSCURO, x - 0.4, x + 0.4, 76, PLAZA_Z[1] - 2, -0.185, 6.0)
for z in np.arange(-176.0, 100.0, 16.0):
    for a, b in ((-98, -80), (80, 98)):
        suelo(HORMIGON_OSCURO, a, b, z - 0.4, z + 0.4, -0.185, 6.0)

# --- edificios -------------------------------------------------------------------
ocupado = []                                              # lo que ya tiene dueño: (x0, x1, z0, z1)
def libre (x0, x1, z0, z1):
    return all(x1 <= a or x0 >= b or z1 <= c or z0 >= d for a, b, c, d in ocupado)
def reservar (x0, x1, z0, z1):
    ocupado.append((min(x0, x1), max(x0, x1), min(z0, z1), max(z0, z1)))
reservar(-100, 100, -180, 104)                            # el estadio y su explanada
reservar(CAS - 34, CAS + 34, Z0, Z1)                      # la Castellana

def cerca (x, z):
    return math.hypot(x, z - MZ) < 360
def edificio (x0, x1, z0, z1, plantas, fachada, grupo=None, atico=True):
    alto = plantas * 3.0
    g = grupo or ('C' if cerca((x0 + x1) / 2, (z0 + z1) / 2) else 'T')
    caja(g, fachada, x0, x1, z0, z1, -0.3, alto, techo=AZOTEA)
    if g == 'C' and atico:                                # el pretil y el casetón
        for (a, b, c, d) in ((x0, x1, z0, z0 + 0.5), (x0, x1, z1 - 0.5, z1), (x0, x0 + 0.5, z0, z1), (x1 - 0.5, x1, z0, z1)):
            caja(g, HORMIGON, a, b, c, d, alto, alto + 0.9, baldosa=6)
        cx, cz = random.uniform(x0 + 4, x1 - 8), random.uniform(z0 + 4, z1 - 8)
        caja(g, HORMIGON_OSCURO, cx, cx + random.uniform(3, 6), cz, cz + random.uniform(3, 6), alto, alto + 2.6, baldosa=6)
    return alto

# AZCA, al suroeste: la Torre Picasso, la Torre Europa, la del BBVA y compañía.
def hito (x0, x1, z0, z1):
    reservar(x0 - 4, x1 + 4, z0 - 4, z1 + 4)
hito(-330, -296, 236, 262); caja('C', F_PICASSO, -330, -296, 236, 262, -0.3, 104, techo=AZOTEA)
caja('C', F_PICASSO, -326, -300, 240, 258, 104, 108, techo=AZOTEA)
europa = [(-215 + 14 * math.cos(2 * math.pi * i / 16), 158 + 14 * math.sin(2 * math.pi * i / 16)) for i in range(16)]
hito(-229, -201, 144, 172); prisma('C', F_EUROPA, europa, -0.3, 80, techo=AZOTEA)
prisma('C', HORMIGON_OSCURO, [(-215 + 9 * math.cos(2 * math.pi * i / 12), 158 + 9 * math.sin(2 * math.pi * i / 12)) for i in range(12)], 80, 86)
hito(-222, -196, 318, 340); caja('C', F_BBVA, -222, -196, 318, 340, -0.3, 72, techo=AZOTEA)
hito(-300, -276, 372, 396); caja('C', F_VIDRIO[2], -300, -276, 372, 396, -0.3, 70, techo=AZOTEA)
hito(-268, -240, 250, 290); caja('C', F_VIDRIO[0], -268, -240, 250, 290, -0.3, 54, techo=AZOTEA)
hito(-232, -190, 216, 240); caja('C', F_OFICINA[0], -232, -190, 216, 240, -0.3, 45, techo=AZOTEA)
hito(-320, -250, 150, 200); caja('C', F_CREMA[1], -320, -250, 150, 200, -0.3, 18, techo=AZOTEA)      # los grandes almacenes
suelo(PLAZA, -340, -172, 128, 420, -0.2, 10.0)
# El Palacio de Congresos, enfrente del estadio al otro lado de la Castellana.
hito(-262, -176, 40, 100); caja('C', F_CONGRESOS, -262, -176, 40, 100, -0.3, 15, techo=AZOTEA)
caja('C', HORMIGON, -266, -172, 36, 104, 15, 17.5, techo=AZOTEA, baldosa=6)
# Las Cuatro Torres (y la quinta), al norte, donde acaba la Castellana.
def torre_base (tx, z, w=40):
    hito(tx - w / 2, tx + w / 2, z - w / 2, z + w / 2)
tx, tz = -252, -640                                                                                   # Emperador
torre_base(tx, tz); caja('T', F_VIDRIO[1], tx - 17, tx + 17, tz - 17, tz + 17, -0.3, 150, techo=AZOTEA)
caja('T', F_VIDRIO[1], tx - 13, tx + 13, tz - 13, tz + 13, 150, 158, techo=AZOTEA)
tx, tz = -196, -705                                                                                   # de Cristal, con la coronación en bisel
torre_base(tx, tz); caja('T', F_VIDRIO[2], tx - 16, tx + 16, tz - 16, tz + 16, -0.3, 148, techo=AZOTEA)
cara('T', F_VIDRIO[2], [P(tx - 16, tz + 16, 148), P(tx + 16, tz + 16, 148), P(tx + 16, tz - 16, 168), P(tx - 16, tz - 16, 160)], hacia=ARRIBA, baldosa=12)
cara('T', F_VIDRIO[2], [P(tx - 16, tz - 16, 148), P(tx + 16, tz - 16, 148), P(tx + 16, tz - 16, 168), P(tx - 16, tz - 16, 160)], hacia=V((0, 1, 0)), baldosa=12)
cara('T', F_VIDRIO[2], [P(tx + 16, tz + 16, 148), P(tx + 16, tz - 16, 148), P(tx + 16, tz - 16, 168)], hacia=V((1, 0, 0)), baldosa=12)
cara('T', F_VIDRIO[2], [P(tx - 16, tz + 16, 148), P(tx - 16, tz - 16, 148), P(tx - 16, tz - 16, 160)], hacia=V((-1, 0, 0)), baldosa=12)
tx, tz = -266, -775                                                                                   # PwC, de planta en trébol
torre_base(tx, tz); prisma('T', F_PWC, [(tx + 18 * math.cos(2 * math.pi * i / 14) * (1 + 0.16 * math.cos(6 * math.pi * i / 14)), tz + 18 * math.sin(2 * math.pi * i / 14) * (1 + 0.16 * math.cos(6 * math.pi * i / 14))) for i in range(14)], -0.3, 142, techo=AZOTEA)
tx, tz = -200, -850                                                                                   # Cepsa: dos patas y tres cajas colgadas
torre_base(tx, tz)
for lado in (-1, 1):
    caja('T', HORMIGON_OSCURO, tx + lado * 15 - 4, tx + lado * 15 + 4, tz - 14, tz + 14, -0.3, 150, baldosa=8)
for y0, y1 in ((8, 46), (50, 88), (92, 130)):
    caja('T', F_VIDRIO[0], tx - 11, tx + 11, tz - 12, tz + 12, y0, y1, techo=AZOTEA, tapa_abajo=True)
caja('T', HORMIGON_OSCURO, tx - 19, tx + 19, tz - 14, tz + 14, 146, 150, baldosa=8, tapa_abajo=True)
tx, tz = -250, -925                                                                                   # Caleido
torre_base(tx, tz); caja('T', F_VIDRIO[2], tx - 8, tx + 8, tz - 18, tz + 18, -0.3, 110, techo=AZOTEA)
caja('T', F_VIDRIO[0], tx - 20, tx + 20, tz - 14, tz + 14, -0.3, 22, techo=AZOTEA)

# Las manzanas: cada hueco de la cuadrícula se llena con dos o tres edificios.
bordes_x = sorted(calles_x + [CAS - 28, CAS + 28])
bordes_z = sorted(calles_z)
n_ed = 0
for i in range(len(bordes_x) - 1):
    for j in range(len(bordes_z) - 1):
        ax, bx = bordes_x[i] + 10, bordes_x[i + 1] - 10        # la acera
        az, bz = bordes_z[j] + (14 if bordes_z[j] == 112.0 else 10), bordes_z[j + 1] - (14 if bordes_z[j + 1] == 112.0 else 10)
        if bx - ax < 18 or bz - az < 18 or bx - ax > 120 or bz - az > 120:
            continue
        cx, cz = (ax + bx) / 2, (az + bz) / 2
        dist = math.hypot(cx, cz - MZ)
        if dist > 1500 and random.random() < 0.5:
            continue
        if not libre(ax, bx, az, bz):
            continue
        castellana = abs(cx - CAS) < 100
        junto = cerca(cx, cz)
        partes = 1 if not junto else random.choice([2, 2, 3])
        a_lo_largo = (bz - az) > (bx - ax) if random.random() < 0.7 else random.random() < 0.5
        for k in range(partes):
            if a_lo_largo:
                x0, x1 = ax, bx; z0 = az + (bz - az) * k / partes; z1 = az + (bz - az) * (k + 1) / partes
            else:
                z0, z1 = az, bz; x0 = ax + (bx - ax) * k / partes; x1 = ax + (bx - ax) * (k + 1) / partes
            # medidas en múltiplos de vano (3) para que las ventanas no se corten
            x1 = x0 + max(9, round((x1 - x0) / 3) * 3); z1 = z0 + max(9, round((z1 - z0) / 3) * 3)
            if castellana and random.random() < 0.6:
                plantas = random.randint(10, 17); fach = random.choice(F_OFICINA + F_VIDRIO[:2] + F_CREMA[1:2])
            else:
                plantas = random.randint(5, 9); fach = random.choice(F_LADRILLO * 2 + F_CREMA + F_OFICINA[:1])
            if dist > 700:
                plantas = max(4, plantas - 1)
            edificio(x0, x1, z0, z1, plantas, fach)
            n_ed += 1
print('EDIFICIOS', n_ed)

# --- árboles -------------------------------------------------------------------
def arbol (x, z, tam=1.0, fino=False):
    alto_tronco = 2.6 * tam
    cubo('T', TRONCO, P(x, z, alto_tronco / 2 - 0.3), (0.35 * tam, 0.35 * tam, alto_tronco + 0.6))
    bm, _, _ = lote('T', random.choice(HOJAS))
    r = bmesh.ops.create_icosphere(bm, subdivisions=2 if fino else 1, radius=1.0,
        matrix=M.Translation(P(x, z, alto_tronco + 1.9 * tam)) @ M.Rotation(random.random() * 6.3, 4, 'Z') @ M.Diagonal((2.5 * tam, 2.5 * tam, 2.2 * tam, 1)))
    for v in r['verts']:
        v.co += V((random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(-0.25, 0.25))) * tam
n_arb = 0
for z in np.arange(-1300, 760, 10.0):                    # los bulevares de la Castellana
    for dx in (-31.5, -17, 17, 31.5):
        if abs(dx) > 30 and not (-520 < z < 480):
            continue
        arbol(CAS + dx + random.uniform(-0.6, 0.6), z + random.uniform(-1.5, 1.5), random.uniform(1.0, 1.5), fino=-260 < z < 300)
        n_arb += 1
for x in calles_x:                                       # y las aceras de las calles cercanas
    if abs(x) > 420:
        continue
    for z in np.arange(-420, 460, 14.0):
        for lado in (-1, 1):
            px, pz = x + lado * 7.6, z + random.uniform(-2, 2)
            if libre(px - 1, px + 1, pz - 1, pz + 1) and random.random() < 0.8:
                arbol(px, pz, random.uniform(0.75, 1.1)); n_arb += 1
for z in np.arange(-172.0, 100.0, 8.0):                 # los de la explanada, en hileras a los dos lados
    for px in (-96, -88, 88, 96):
        arbol(px + random.uniform(-0.4, 0.4), z + random.uniform(-0.8, 0.8), random.uniform(0.9, 1.25), fino=True); n_arb += 1
for x in np.arange(-76.0, 77.0, 8.0):                   # y delante de los dos fondos
    for pz in (92, 99, -160, -170):
        arbol(x + random.uniform(-0.4, 0.4), pz, random.uniform(0.9, 1.25), fino=True); n_arb += 1
for z in np.arange(-168.0, 96.0, 24.0):                 # las columnas de luz de la explanada
    for px in (-82, 82):
        cubo('T', METAL, P(px, z, 3.4), (0.3, 0.3, 7.4))
        cubo('CP', FAROLA, P(px, z, 7.3), (0.5, 0.5, 0.9))
print('ARBOLES', n_arb)

# --- coches (la ciudad está evacuada: parados donde quedaron) ------------------------
def coche (x, z, giro):
    col = random.choice(COCHES)
    cubo('T', col, P(x, z, 0.35), (1.8, 4.3, 0.75), giro)
    cubo('T', LUNA, P(x, z, 0.98) + V((math.sin(giro) * 0.2, -math.cos(giro) * 0.2, 0)), (1.6, 2.2, 0.55), giro)
n_co = 0
for _ in range(150):
    carril = random.choice([-12.2, -8.7, -5.2, -1.7, 1.7, 5.2, 8.7, 12.2, -24, 24])
    coche(CAS + carril + random.uniform(-0.5, 0.5), random.uniform(-700, 520), random.gauss(0, 0.12) + (math.pi if carril < 0 else 0)); n_co += 1
for x in calles_x:
    if abs(x) > 330:
        continue
    for _ in range(9):
        coche(x + random.choice([-4.4, 4.4]), random.uniform(-400, 300), random.gauss(0, 0.06)); n_co += 1
for _ in range(40):
    coche(random.uniform(-90, 380), 112 + random.choice([-7, -3, 3, 7]), math.pi / 2 + random.gauss(0, 0.1)); n_co += 1
print('COCHES', n_co)

# --- farolas de la Castellana ---------------------------------------------------
for z in np.arange(-900, 640, 26.0):
    for dx in (-17, 17):
        cubo('T', METAL, P(CAS + dx, z, 4.5), (0.22, 0.22, 9.6))
        cubo('CP', FAROLA, P(CAS + dx * 0.93, z, 9.3), (1.1, 0.5, 0.3))

# --- la cúpula del cielo ---------------------------------------------------------
R_CIELO = 3000.0
SEG_A, SEG_E = 32, 9
def p_cielo (i, j):
    az = 2 * math.pi * i / SEG_A
    el = math.radians(-4 + 94 * j / SEG_E)
    return P(R_CIELO * math.cos(el) * math.cos(az), MZ + R_CIELO * math.cos(el) * math.sin(az), R_CIELO * math.sin(el))
for i in range(SEG_A):
    for j in range(SEG_E):
        v0, v1 = max(0.0, (-4 + 94 * j / SEG_E) / 90), max(0.0, (-4 + 94 * (j + 1) / SEG_E) / 90)
        cara('CP', CIELO, [p_cielo(i, j), p_cielo(i + 1, j), p_cielo(i + 1, j + 1), p_cielo(i, j + 1)],
             uvs=[(i / SEG_A, v0), ((i + 1) / SEG_A, v0), ((i + 1) / SEG_A, v1), (i / SEG_A, v1)])

# ==================================================================================
# 6. COMPROBACIÓN: nada macizo en el paso de los bichos
# ==================================================================================
malos = set()
for (grupo, nombre), (bm, _, _) in lotes.items():
    if grupo not in ('E', 'EP') or nombre in ('raya', 'palo', 'red'):
        continue
    for v in bm.verts:
        if abs(v.co.x) < 7.4 and -60 < -v.co.y < 5 and 0.35 < v.co.z < 4:
            malos.add(nombre)
if malos:
    raise SystemExit('PASO OCUPADO: ' + ', '.join(sorted(malos)))

# ==================================================================================
# 7. DE LOTES A OBJETOS, UNO POR GRUPO
# ==================================================================================
grupos = {}
for (grupo, nombre), (bm, _, mat) in lotes.items():
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    me = bpy.data.meshes.new(f'{grupo}-{nombre}')
    bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(f'{grupo}-{nombre}', me)
    bpy.context.collection.objects.link(o)
    grupos.setdefault(grupo, []).append(o)
NOMBRES = {'E': 'luzE', 'S': 'suelo-cesped', 'EP': 'planoE', 'C': 'luzC', 'G': 'luzG', 'T': 'vertT', 'CP': 'planoC'}
objetos = {}
for grupo, lista in grupos.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in lista:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lista[0]
    if len(lista) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = NOMBRES[grupo]
    objetos[grupo] = o
    print('GRUPO', grupo, len(o.data.polygons), 'caras', len(o.data.materials), 'materiales')

# ==================================================================================
# 8. LA LUZ: sol bajo de poniente, horneado con Cycles
# ==================================================================================
esc.render.engine = 'CYCLES'
esc.cycles.device = 'CPU'
esc.cycles.samples = MUESTRAS
esc.cycles.max_bounces = 3
esc.cycles.use_denoising = False
mundo = bpy.data.worlds.new('atardecer'); esc.world = mundo; mundo.use_nodes = True
cielo = mundo.node_tree.nodes.new('ShaderNodeTexSky')
cielo.sun_disc = False
cielo.sun_elevation = math.radians(9)
cielo.sun_rotation = math.radians(-107)
mundo.node_tree.links.new(cielo.outputs[0], mundo.node_tree.nodes['Background'].inputs[0])
mundo.node_tree.nodes['Background'].inputs[1].default_value = float(os.environ.get('MADRID_CIELO', '0.7'))
# El sol va aparte, para saber seguro de dónde viene: del oeste-suroeste, a 11°.
SOL_DIR = V((-0.93, -0.3, 0.3)).normalized()                 # hacia el sol, en Blender
sol = bpy.data.lights.new('sol', 'SUN')
sol.energy = float(os.environ.get('MADRID_SOL', '3.5'))
sol.color = (1.0, 0.45, 0.15)
sol.angle = math.radians(3)
osol = bpy.data.objects.new('sol', sol); bpy.context.collection.objects.link(osol)
osol.rotation_euler = (-SOL_DIR).to_track_quat('-Z', 'Y').to_euler()
objetos['CP'].hide_render = True                              # la cúpula pintada y los faroles no alumbran
# Los focos de dentro: es lo que ilumina el graderío, que del sol ya no recibe.
FOCOS.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = float(os.environ.get('MADRID_FOCOS', '400'))

def capa_luz (o):
    luz = o.data.uv_layers.new(name='luz')
    o.data.uv_layers['UVMap'].active_render = True
    o.data.uv_layers.active = luz
    return luz

def desplegar (o):
    capa_luz(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0015, area_weight=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')

CRUDO = os.path.join(TMP, f'madrid-crudo-{LADO_LUZ}')
def hornear (o, nombre):
    # Lo calculado se guarda en crudo: retocar la curva o el color (`--reusar`)
    # son segundos, y hornear de nuevo son ocho minutos.
    if REUSAR:
        return np.load(f'{CRUDO}-{nombre}.npy')
    px = hornear_de_verdad(o, nombre)
    np.save(f'{CRUDO}-{nombre}.npy', px)
    return px
def hornear_de_verdad (o, nombre):
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
    print('HORNEADO', nombre, round(time.time() - t), 's')
    return px.reshape(LADO_LUZ, LADO_LUZ, 4)[..., :3]

# El suelo: su UV de luz es el plano, con más detalle cerca del estadio.
og = objetos['G']
luz = capa_luz(og)
for lp in og.data.loops:
    co = og.data.vertices[lp.vertex_index].co
    luz.data[lp.index].uv = uv_suelo(co.x, -co.y)
desplegar(objetos['C'])
desplegar(objetos['E'])

mapas = {'luzG': hornear(og, 'luzG'), 'luzC': hornear(objetos['C'], 'luzC'), 'luzE': hornear(objetos['E'], 'luzE')}
# Una sola escala para todo: lo más iluminado por el sol queda cerca del tope.
juntos = np.concatenate([m[m.sum(axis=-1) > 1e-5].reshape(-1, 3) for m in (mapas['luzG'], mapas['luzC'])])
lum = juntos @ np.array([0.2126, 0.7152, 0.0722], np.float32)
# Fija, no medida: al sol le toca a muy poca superficie (las sombras son largas)
# y escalando por percentiles lo soleado se quemaba a blanco y perdía el dorado.
ESCALA = float(os.environ.get('MADRID_ESCALA', '0.5'))
print('ESCALA', ESCALA, 'percentiles', [round(float(np.percentile(lum, p)) * ESCALA, 3) for p in (5, 25, 50, 75, 95, 99)])
CODIGO = 0.5                                                  # el juego lo multiplica por 2
def a_srgb (x):
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-6), 1 / 2.4) - 0.055)
def curva (x):
    # Lo oscuro se queda como está y lo muy iluminado se comprime en vez de
    # quemarse a blanco: así el tejado al sol sigue teniendo color.
    return x / (1 + x / 2.4) * 1.25
SATURA = float(os.environ.get('MADRID_SATURA', '1.5'))
def saturar (x):
    # La hora dorada: lo que da el sol, más naranja; la sombra, más azul. Es lo
    # que hace el acero de la piel al reflejar el cielo, y el horneado difuso no.
    gris = (x @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    return np.clip(gris + (x - gris) * SATURA, 0, None)
def suavizar (a, veces=1):
    for _ in range(veces):
        a = (a * 4 + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 8
    return a
for nombre, m in mapas.items():
    lin = np.clip(saturar(curva(suavizar(m, 2) * ESCALA)) * CODIGO, 0, 1)
    e = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    print('  ', nombre, 'media', round(float(e[e > 0].mean()), 3), 'p95', round(float(np.percentile(e[e > 0], 95)), 3))
    im = bpy.data.images.new(nombre + '-fin', LADO_LUZ, LADO_LUZ, alpha=False)
    px = np.ones((LADO_LUZ, LADO_LUZ, 4), np.float32); px[..., :3] = a_srgb(lin)
    im.pixels.foreach_set(px.ravel())
    ruta = os.path.join(MODELOS, f'lugar-madrid-{nombre}.webp')
    im.filepath_raw = ruta; im.file_format = 'WEBP'
    im.save(quality=86)
    print('  ', ruta, os.path.getsize(ruta))

# Árboles, coches y lo lejano: la luz, en el color de los vértices.
ot = objetos['T']
atr = ot.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
ot.data.color_attributes.active_color = atr
ot.data.color_attributes.render_color_index = ot.data.color_attributes.find('Col')
bpy.ops.object.select_all(action='DESELECT')
ot.select_set(True); bpy.context.view_layer.objects.active = ot
esc.render.bake.target = 'VERTEX_COLORS'
t = time.time()
if REUSAR:
    col = np.load(f'{CRUDO}-vertT.npy')
else:
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'})
    col = np.empty(len(atr.data) * 4, np.float32)
    atr.data.foreach_get('color', col)
    np.save(f'{CRUDO}-vertT.npy', col)
col = col.reshape(-1, 4)
col[:, :3] = np.clip(saturar(curva(col[:, :3] * ESCALA)), 0, 1)
col[:, 3] = 1
atr.data.foreach_set('color', col.ravel())
print('VERTICES', round(time.time() - t), 's', 'media', col[:, :3].mean(axis=0))

# ==================================================================================
# 9. EXPORTAR: el estadio y la ciudad, por separado
# ==================================================================================
bpy.data.objects.remove(osol)
objetos['CP'].hide_render = False
def exportar (claves, nombre):
    bpy.ops.object.select_all(action='DESELECT')
    caras = 0
    for k in claves:
        objetos[k].select_set(True); caras += len(objetos[k].data.polygons)
    ruta = os.path.join(MODELOS, nombre + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=ruta, export_format='GLB', use_selection=True, export_apply=True,
        export_image_format='JPEG', export_jpeg_quality=82, export_yup=True,
        export_lights=False, export_cameras=False, export_animations=False,
        export_vertex_color='ACTIVE', export_all_vertex_colors=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_texcoord_quantization=14, export_draco_position_quantization=16)
    print('EXPORTADO', nombre, caras, 'caras', os.path.getsize(ruta), 'bytes')
exportar(['E', 'S', 'EP'], 'lugar-madrid')
exportar(['C', 'G', 'T', 'CP'], 'lugar-madrid-ciudad')
print('TOTAL', round(time.time() - T0), 's')
