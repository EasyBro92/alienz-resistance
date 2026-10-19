# Nueva York: en medio de Times Square, de noche, con las pantallas encendidas (20/10/2026).
#   blender -b -P herramientas/blender/lugar_timessquare.py              (entero)
#   blender -b -P herramientas/blender/lugar_timessquare.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_timessquare.py -- --reusar  (retocar la luz)
#
# Era uno de los tres tramos que seguían hechos de piezas (`ciudades.js`). Isidro
# eligió (20/10): EN MEDIO DE TIMES SQUARE, los alienz SALEN DEL METRO por una
# boca reventada al fondo de la calle, DE NOCHE con las pantallas encendidas y
# llegada LARGA. El parte de la misión ya lo contaba: «las pantallas siguen dando
# las noticias de hace cuatro meses, a nadie», y al final «debajo estaba el acceso
# al túnel».
#
# Cómo está puesto. Se mira hacia el sur, por Broadway, desde la escalinata roja:
#   · la calzada con sus pasos de cebra y, a los dos lados, las plazas peatonales
#     de granito con las mesas y sillas rojas, las farolas y los quioscos del metro
#     con sus faroles verdes;
#   · los edificios forrados de pantallas gigantes, ENCENDIDAS: son las que
#     iluminan la calle (se hornean como luz) — noticias de la invasión, anuncios
#     inventados, la marquesina de Broadway; ninguna marca de verdad;
#   · al fondo de la calle la calle se ha hundido en el túnel del metro: una rampa
#     de asfalto roto que baja 4,6 m a las vías, con los azulejos blancos de la
#     estación y la boca negra del túnel, por donde suben los alienz (`hueco` y
#     `entrada`, como en Moscú);
#   · detrás, el One Times Square con su torre de pantallas y la bola de Nochevieja;
#   · la base alien en la plaza de la derecha;
#   · solo en el vuelo: la escalinata roja del TKTS, Manhattan alrededor y el
#     Empire State al sureste.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.3, 0.75, 0.6)                  # la luna, alta y detrás: de noche manda la luz de las pantallas
iniciar('timessquare', 4207, eje=(0.0, -80.0), encendidas=0.35, reflejo=(0.18, 0.12, 0.2))

CALLE = 9.2                              # media calzada (los cinco carriles)
PLAZA = 19.0                             # donde empiezan las fachadas
ZANJA = 7.6
Z_BOCA, Z_PIE = -62.0, -78.0
HONDO = 4.6
Z_TUNEL = Z_PIE - 14.0
BASE = (12.6, -44.0)
Z_ONE = -150.0                           # la cara del One Times Square, en el eje

# Letras que faltan en el cartel de horneado.py (5 x 5, como las suyas).
H.LETRAS.update({
    'B': ['11110', '10001', '11110', '10001', '11110'], 'R': ['11110', '10001', '11110', '10100', '10011'],
    'K': ['10001', '10010', '11100', '10010', '10001'], 'G': ['01111', '10000', '10011', '10001', '01111'],
    'W': ['10001', '10001', '10101', '11011', '10001'], 'S': ['01111', '10000', '01110', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100'], 'Y': ['10001', '01010', '00100', '00100', '00100'],
    'D': ['11110', '10001', '10001', '10001', '11110'], 'O': ['01110', '10001', '10001', '10001', '01110'],
    'V': ['10001', '10001', '10001', '01010', '00100'], 'C': ['01111', '10000', '10000', '10000', '01111'],
    'U': ['10001', '10001', '10001', '10001', '01110'], 'Q': ['01110', '10001', '10101', '10010', '01101'],
    'M': ['10001', '11011', '10101', '10001', '10001'], 'H': ['10001', '10001', '11111', '10001', '10001'],
    'P': ['11110', '10001', '11110', '10000', '10000'], 'F': ['11111', '10000', '11110', '10000', '10000'],
    '4': ['10010', '10010', '11111', '00010', '00010'], '2': ['11110', '00001', '01110', '10000', '11111'],
    '!': ['00100', '00100', '00100', '00000', '00100'], '-': ['00000', '00000', '11111', '00000', '00000'],
})
def rotulo (a, texto, y0, px, color, x0=None):
    """Un texto centrado (o desde x0) en la imagen `a`."""
    ancho = len(texto) * 6 * px
    if x0 is None:
        x0 = max(0, (a.shape[1] - ancho) // 2)
    escribir(a, texto, x0, y0, px, color)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -PLAZA, PLAZA, Z_BOCA, 12.0
PW, PH_ = 1024, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

# Los colores de las pantallas, para pintar su reflejo en el suelo mojado.
TONOS = [(1.0, 0.1, 0.12), (0.1, 0.5, 1.0), (1.0, 0.75, 0.15), (0.85, 0.2, 0.9), (0.1, 0.9, 0.6), (1.0, 0.45, 0.1)]

def tex_pista ():
    """La calzada y las dos plazas, de una pieza: asfalto con los pasos de cebra en
    el centro, losas de granito a los lados con su bordillo, todo mojado y con
    los reflejos de colores de las pantallas estirados hacia el centro."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    asfalto = tejar(foto('asphalt_02', 256, 0x2c2c30, 0.7))
    granito = tejar(foto('stone_pavers', 256, 0x6a6a70, 0.55))
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    es_calle = (np.abs(xs) < CALLE).astype(np.float32)[..., None]
    a = asfalto * es_calle + granito * (1 - es_calle)
    for s in (-1, 1):                                                    # el bordillo
        c, _ = a_px(s * CALLE, 0)
        a[:, c - 3:c + 3] = np.array((0.42, 0.42, 0.44), np.float32)
    for zc in (-6.0, -54.0):                                             # los pasos de cebra
        _, f0 = a_px(0, zc - 2.0); _, f1 = a_px(0, zc + 2.0)
        for x in np.arange(-CALLE + 0.4, CALLE, 1.2):
            c0, _ = a_px(x, 0); c1, _ = a_px(x + 0.6, 0)
            a[f0:f1, c0:c1] = a[f0:f1, c0:c1] * 0.25 + 0.62
    for x in (-0.12, 0.12):                                              # la doble raya amarilla del centro
        c, _ = a_px(x, 0)
        a[:, c - 2:c + 2] = (0.6, 0.48, 0.1)
    a *= (0.8 + 0.3 * nube(PH_, PW, 14, 6))[..., None]
    # Los reflejos: manchas largas de color que salen de cada fachada hacia el centro.
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    luz = np.zeros((PH_, PW, 3), np.float32)
    # Con reflejos solo junto a las fachadas, el centro de la calle (donde se
    # juega) salía negro: llegan hasta el otro lado, y encima va un baño de color
    # de todas las pantallas a la vez y el charco de luz de cada farola.
    for k in range(40):
        s = -1 if k % 2 else 1
        z = random.uniform(PZ0, PZ1)
        c, f = a_px(s * PLAZA, z)
        largo, ancho = random.uniform(16.0, 30.0) * KX, random.uniform(2.5, 5.0) * KZ
        w = np.exp(-(((xx - c) / largo) ** 2 + ((yy - f) / ancho) ** 2))
        luz += w[..., None] * np.array(random.choice(TONOS), np.float32) * random.uniform(0.3, 0.55)
    bano = np.stack([0.5 + 0.5 * nube(PH_, PW, 10, 3), 0.3 + 0.4 * nube(PH_, PW, 8, 3), 0.6 + 0.4 * nube(PH_, PW, 9, 3)], -1)
    luz += bano * 0.16
    for z in np.arange(10.0, PZ0, -16.0):
        for s in (-1, 1):
            c, f = a_px(s * (CALLE - 0.9), z)
            w = np.exp(-(((xx - c) / (4.0 * KX)) ** 2 + ((yy - f) / (4.0 * KZ)) ** 2))
            luz += w[..., None] * np.array((1.0, 0.85, 0.6), np.float32) * 0.5
    a = a * 0.7 + luz * (0.45 + 0.7 * a)
    def mancha (x, z, r_, k):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-3.4, -18.0, 1.6), (4.2, -36.0, 1.8), (-1.0, -48.0, 1.4), (12.0, -10.0, 1.4), (-13.0, -30.0, 1.6)):
        mancha(x, z, r_ * 1.6, 0.75)
        mancha(x, z, r_, 0.35)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_pantalla (i):
    """Una pantalla gigante: noticias de la invasión, anuncios inventados (sin
    marcas), la marquesina de Broadway. Fila 0 arriba."""
    Hh, W = 256, 512
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    v, u = yy / Hh, xx / W
    if i == 0:     # ÚLTIMA HORA
        a = lienzo(Hh, W, (0.02, 0.06, 0.2)) + (1 - v)[..., None] * np.array((0.0, 0.1, 0.3), np.float32)
        a[150:210] = (0.85, 0.05, 0.05)
        rotulo(a, 'BREAKING NEWS', 165, 6, (1.0, 1.0, 1.0))
        rotulo(a, 'STAY INDOORS', 50, 7, (1.0, 0.95, 0.6))
    elif i == 1:   # EVACUAR
        a = lienzo(Hh, W, (0.0, 0.0, 0.0))
        a[::8] = (0.15, 0.12, 0.0)
        rotulo(a, 'EVACUATE', 80, 10, (1.0, 0.8, 0.0))
        a[200:220] = (1.0, 0.8, 0.0)
    elif i == 2:   # anuncio: degradado con un círculo enorme
        a = np.stack([0.8 * (1 - u) + 0.3 * u, 0.1 + 0.2 * v, 0.6 + 0.4 * u], -1)
        d = np.hypot(xx - W * 0.66, yy - Hh * 0.5)
        a[d < 90] = (1.0, 0.85, 0.95)
        a[(d > 96) & (d < 104)] = (1.0, 1.0, 1.0)
    elif i == 3:   # anuncio: rayas en diagonal
        a = np.where((((xx + yy) // 40) % 2 == 0)[..., None], np.array((0.0, 0.7, 0.8), np.float32), np.array((0.02, 0.2, 0.3), np.float32))
        a[90:170, 60:450] = (1.0, 1.0, 1.0)
        a[100:160, 70:440] = (0.95, 0.3, 0.1)
    elif i == 4:   # la marquesina de un musical de Broadway, con sus bombillas
        a = lienzo(Hh, W, (0.3, 0.02, 0.04))
        rotulo(a, 'BROADWAY', 80, 10, (1.0, 0.85, 0.4))
        for x in range(10, W, 24):
            for y in (10, Hh - 18):
                a[y:y + 8, x:x + 8] = (1.0, 0.95, 0.7)
        for y in range(10, Hh, 24):
            for x in (10, W - 18):
                a[y:y + 8, x:x + 8] = (1.0, 0.95, 0.7)
    elif i == 5:   # las pantallas tomadas: el verde de ellos
        a = lienzo(Hh, W, (0.0, 0.03, 0.0))
        a += (np.sin(yy * 0.5) * 0.5 + 0.5)[..., None] * np.array((0.0, 0.12, 0.03), np.float32)
        rotulo(a, 'ALIENZ', 80, 13, (0.2, 1.0, 0.4))
    elif i == 6:   # anuncio: naranja con manchas blancas
        a = np.stack([1.0 - 0.2 * v, 0.45 + 0.3 * u, 0.05 + 0.1 * v], -1)
        for _ in range(7):
            cx, cy, r = random.uniform(40, W - 40), random.uniform(30, Hh - 30), random.uniform(18, 50)
            a[np.hypot(xx - cx, yy - cy) < r] = (1.0, 0.97, 0.9)
    else:          # la cinta de noticias: renglones blancos sobre azul
        a = lienzo(Hh, W, (0.0, 0.12, 0.45))
        for y in range(30, Hh - 20, 40):
            x = 20
            while x < W - 40:
                L = random.randint(20, 90)
                a[y:y + 14, x:min(W - 20, x + L)] = (0.95, 0.95, 1.0)
                x += L + 12
        rotulo(a, 'NEWS 24', 6, 3, (1.0, 1.0, 1.0), x0=16)
    return guardar(f'pantalla-{i}', np.clip(a, 0, 1), 86)

def tex_azulejo ():
    """Los azulejos blancos de la estación, con el friso y el nombre en mosaico."""
    a = lienzo(512, 512, (0.82, 0.8, 0.74))
    a[::16] *= 0.7
    a[:, ::32] *= 0.7
    a[40:110] = (0.5, 0.18, 0.12)
    rotulo(a, 'TIMES SQ', 55, 6, (0.9, 0.86, 0.7))
    a *= (0.75 + 0.3 * nube(512, 512, 6, 6))[..., None]
    return guardar('azulejo-metro', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.35)
ASFALTO = material('asfalto-ny', de_polyhaven('asphalt_02', 512, 0x2c2c30, 0.7), rug=0.4)
GRANITO = material('granito', de_polyhaven('stone_pavers', 512, 0x5a5a60, 0.55), rug=0.5)
RAMPA = material('rampa-rota', de_polyhaven('cracked_concrete_wall', 512, 0x3a3a3c, 0.7), rug=0.6)
AZULEJO = material('azulejo-metro', tex_azulejo(), rug=0.4)
PANTALLAS = [material(f'brillo-pantalla-{i}', tex_pantalla(i), emite=2.2) for i in range(8)]
OFICINAS = [material(f'ny-of-{i}', tex_oficina(f'ny-of-{i}', c, (0.05, 0.07, 0.12))) for i, c in enumerate([(0.3, 0.28, 0.27), (0.22, 0.22, 0.25), (0.36, 0.3, 0.24)])]
VIDRIO = material('ny-vidrio', tex_vidrio('ny-vidrio', (0.06, 0.09, 0.16)))
AZOTEA = material('azotea', tex_azotea((0.2, 0.2, 0.22)))
# OJO: los colores lisos van en LINEAL.
NEGRO = material('negro', color=(0.004, 0.004, 0.006))
ACERO = material('acero', color=(0.05, 0.05, 0.06), rug=0.5)
HIERRO = material('hierro-verde', color=(0.02, 0.06, 0.03), rug=0.6)
ROJO_SILLA = material('silla-roja', color=(0.5, 0.03, 0.03), rug=0.6)
TKTS = material('brillo-tkts', color=(1.0, 0.08, 0.06), emite=1.8)
GLOBO = material('brillo-metro', color=(0.2, 1.0, 0.4), emite=2.4)
FAROLA = material('brillo-farola', color=(1.0, 0.85, 0.6), emite=2.6)
BOLA = material('brillo-bola', color=(1.0, 0.95, 0.85), emite=3.0)
SIRENA = [material('brillo-sirena-r', color=(1.0, 0.05, 0.05), emite=3.0), material('brillo-sirena-a', color=(0.1, 0.3, 1.0), emite=3.0)]
AMARILLO = material('taxi', color=(0.6, 0.38, 0.02), rug=0.4)
LUNA = material('luna-coche', color=(0.02, 0.02, 0.03), rug=0.2)
CHAPAS = [material(f'chapa-{i}', color=c, rug=0.5) for i, c in enumerate([(0.02, 0.02, 0.025), (0.3, 0.3, 0.3), (0.2, 0.02, 0.02)])]
QUEMADO = material('quemado', color=(0.012, 0.01, 0.01), rug=0.9)
RESINA = material('resina', color=(0.02, 0.035, 0.022), rug=0.45)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
CARRIL = material('carril', color=(0.08, 0.07, 0.06), rug=0.4)
TRAVIESA = material('traviesa', color=(0.04, 0.03, 0.025), rug=0.9)
VENTANA = material('brillo-ventana', color=(1.0, 0.75, 0.4), emite=1.8)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.3, 0.16, 0.22)), (0.06, (0.16, 0.1, 0.2)), (0.25, (0.05, 0.05, 0.12)), (1.0, (0.01, 0.01, 0.04))],
    (SOL[0], SOL[2]), 0.6, (0.06, 0.06, 0.1), ((0.22, 0.16, 0.26), (0.08, 0.06, 0.12)), cuanta_nube=0.25), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA CALLE, LAS PLAZAS Y LA BOCA DEL METRO
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-60, 60), (-300, 120))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
# Fuera del trozo pintado: la calzada y las plazas siguen, hacia el norte y hacia el sur.
suelo('GP', ASFALTO, -CALLE, CALLE, PZ1, 400.0, 0.0, 8.0)
suelo('GP', GRANITO, -PLAZA, -CALLE, PZ1, 400.0, 0.0, 4.0)
suelo('GP', GRANITO, CALLE, PLAZA, PZ1, 400.0, 0.0, 4.0)
suelo('GP', GRANITO, -PLAZA, -ZANJA, Z_PIE, Z_BOCA, 0.0, 4.0)
suelo('GP', GRANITO, ZANJA, PLAZA, Z_PIE, Z_BOCA, 0.0, 4.0)
suelo('GP', ASFALTO, -CALLE, CALLE, -400.0, Z_PIE, 0.0, 8.0)
suelo('GP', GRANITO, -PLAZA, -CALLE, -400.0, Z_PIE, 0.0, 4.0)
suelo('GP', GRANITO, CALLE, PLAZA, -400.0, Z_PIE, 0.0, 4.0)
# La rampa: la calle hundida en el túnel. Luego el andén y las vías.
cara('P', RAMPA, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)], uvs=[(0, 0), (4, 0), (4, 4.4), (0, 4.4)], hacia=ARRIBA)
cara('P', RAMPA, [P(-ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_TUNEL, -HONDO), P(-ZANJA, Z_TUNEL, -HONDO)], uvs=[(0, 4.4), (4, 4.4), (4, 8), (0, 8)], hacia=ARRIBA)
for s in (-1, 1):
    # Las paredes de la estación: azulejo blanco con el nombre en el friso.
    cara('P', AZULEJO, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_PIE, 0.0)], hacia=V((-s, 0, 0)), baldosa=4.0)
    cara('P', AZULEJO, [P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_TUNEL, -HONDO), P(s * ZANJA, Z_TUNEL, 0.0), P(s * ZANJA, Z_PIE, 0.0)], hacia=V((-s, 0, 0)), uvs=[(0, 0), (2.5, 0), (2.5, 1), (0, 1)])
    # El borde de la calle partida: losa con su canto.
    viga('P', RAMPA, min(s * ZANJA, s * (ZANJA + 0.6)), max(s * ZANJA, s * (ZANJA + 0.6)), Z_PIE, Z_BOCA - 0.2, -0.4, 0.12, u_m=3.0)
    for x in (s * 2.2, s * 5.2):                                     # las vías
        for dx in (-0.72, 0.72):
            barra('EV', CARRIL, P(x + dx, Z_PIE, -HONDO + 0.12), P(x + dx, Z_TUNEL, -HONDO + 0.12), 0.12)
        for z in np.arange(Z_TUNEL, Z_PIE, 1.2):
            cubo('EV', TRAVIESA, P(x, float(z), -HONDO + 0.04), (2.4, 0.3, 0.1))
# La boca del túnel, negra, con los ojos verdes dentro.
Y_BOCA = -0.4
viga('P', AZULEJO, -ZANJA - 0.6, ZANJA + 0.6, Z_TUNEL - 1.4, Z_TUNEL, Y_BOCA, 0.0, u_m=3.0)
cara('EP', NEGRO, [P(-ZANJA, Z_TUNEL + 0.05, -HONDO), P(ZANJA, Z_TUNEL + 0.05, -HONDO), P(ZANJA, Z_TUNEL + 0.05, Y_BOCA), P(-ZANJA, Z_TUNEL + 0.05, Y_BOCA)], hacia=V((0, -1, 0)))
for x, y, r in ((-4.6, 1.0, 0.5), (-1.8, 2.4, 0.38), (1.2, 1.2, 0.62), (4.2, 2.6, 0.42), (0.2, 0.6, 0.3), (-6.0, 2.9, 0.26), (6.2, 0.9, 0.36)):
    cara('EP', BRILLO_HONDO if r > 0.4 else VERDE, [P(x + r * math.cos(a_), Z_TUNEL + 0.1, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
# Un vagón descarrilado, volcado contra la pared de la izquierda, al fondo del andén.
cubo('EV', CHAPAS[1], P(-5.6, Z_TUNEL + 6.0, -HONDO + 1.6), (2.6, 11.0, 3.0), 0.12)
for k in range(5):
    cubo('EP', VENTANA, P(-4.28, Z_TUNEL + 2.0 + k * 2.0, -HONDO + 2.2), (0.06, 1.1, 0.8), 0.12)
for k in range(9):                                                   # la resina que sube por la rampa
    x = -6.4 + k * 1.6 + random.uniform(-0.4, 0.4)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, Z_PIE - 0.2, -HONDO + 0.1), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.42))
# Los quioscos del metro a los dos lados de la boca: barandilla verde y los dos faroles verdes.
for s in (-1, 1):
    for z in (Z_BOCA + 2.0, Z_BOCA - 10.0):
        x = s * 11.0
        for dz in (-1.6, 1.6):
            barra('EV', HIERRO, P(x - 1.2, z + dz, 0.0), P(x - 1.2, z + dz, 1.0), 0.08)
            barra('EV', HIERRO, P(x + 1.2, z + dz, 0.0), P(x + 1.2, z + dz, 1.0), 0.08)
        barra('EV', HIERRO, P(x - 1.2, z - 1.6, 1.0), P(x - 1.2, z + 1.6, 1.0), 0.08)
        barra('EV', HIERRO, P(x + 1.2, z - 1.6, 1.0), P(x + 1.2, z + 1.6, 1.0), 0.08)
        for dx in (-1.2, 1.2):
            barra('EV', HIERRO, P(x + dx, z + 1.6, 0.0), P(x + dx, z + 1.6, 2.2), 0.1)
            elipsoide('EP', GLOBO, en(x + dx, z + 1.6, 2.45), (0.2, 0.2, 0.22), sub=2)

# ==================================================================================
# 3. LO QUE HAY EN LAS PLAZAS
# ==================================================================================
def mesa (x, z):
    """Una mesa redonda de terraza con sus sillas rojas, como las de la plaza."""
    barra('EV', ACERO, P(x, z, 0.0), P(x, z, 0.72), 0.06)
    torno('EV', ACERO, en(x, z, 0.72), [(0.0, 0.0), (0.38, 0.0), (0.38, 0.03), (0.0, 0.03)], lados=10, tapas=(False, False))
    for k in range(random.randint(2, 4)):
        a_ = random.uniform(0, 6.28)
        sx, sz = x + 0.62 * math.cos(a_), z + 0.62 * math.sin(a_)
        if random.random() < 0.25:                                   # alguna, tirada
            cubo('EV', ROJO_SILLA, P(sx, sz, 0.12), (0.45, 0.8, 0.12), a_)
        else:
            cubo('EV', ROJO_SILLA, P(sx, sz, 0.45), (0.42, 0.42, 0.05), a_)
            cubo('EV', ROJO_SILLA, P(sx + 0.2 * math.cos(a_), sz + 0.2 * math.sin(a_), 0.7), (0.05, 0.42, 0.5), a_)
for s in (-1, 1):
    for z in np.arange(8.0, -60.0, -6.5):
        x = s * random.uniform(14.0, 17.4)
        if s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < 6.6:
            continue
        mesa(x, float(z) + random.uniform(-1.5, 1.5))
    for z in np.arange(10.0, -260.0, -16.0):                           # farolas de Nueva York
        x = s * (CALLE + 0.9)
        barra('EV', ACERO, P(x, float(z), 0.0), P(x, float(z), 7.6), 0.18)
        barra('EV', ACERO, P(x, float(z), 7.6), P(x - s * 1.6, float(z), 7.9), 0.12)
        cubo('EP', FAROLA, P(x - s * 1.8, float(z), 7.8), (0.6, 0.3, 0.14))
# Taxis abandonados y un coche de policía con la sirena encendida, por las plazas y
# en la calle de más allá de la boca (por donde no pasa nadie).
def taxi (x, z, giro, quemado=False):
    coche('EV', [QUEMADO if quemado else AMARILLO], LUNA, x, z, giro)
    if not quemado:
        cubo('EP', VENTANA, P(x, z, 1.35), (0.5, 0.25, 0.18), giro)
for x, z, g in ((13.2, 4.0, 0.3), (-14.6, -20.0, -0.2), (-12.6, -52.0, 0.9), (16.0, -24.0, 1.4), (-4.0, -100.0, 0.6), (5.0, -112.0, -0.4), (0.5, -128.0, 1.2), (-13.0, -96.0, 0.1)):
    taxi(x, z, g, quemado=random.random() < 0.3)
coche('EV', CHAPAS[:1], LUNA, 12.6, -90.0, 0.4)
cubo('EP', SIRENA[0], P(12.6 - 0.25, -90.0, 1.38), (0.45, 0.3, 0.14), 0.4)
cubo('EP', SIRENA[1], P(12.6 + 0.25, -90.0, 1.38), (0.45, 0.3, 0.14), 0.4)
# La base alien en la plaza de la derecha: el plato de resina y su anillo.
bx, bz = BASE
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(bx + r * math.cos(a_), bz + r * math.sin(a_), 0.04) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)
for _ in range(12):
    a_ = random.uniform(-1.2, 1.2); r = random.uniform(4.8, 6.2)          # solo hacia fuera: hacia la calle tapaban el carril
    elipsoide('EV', RESINA, en(bx + r * math.cos(a_), bz + r * math.sin(a_), 0.0), (random.uniform(0.4, 0.8), random.uniform(0.4, 0.8), random.uniform(0.3, 0.7)), sub=2)

comprobar_paso(('P', 'EV', 'EP'), z_lejos=-63.5)

# ==================================================================================
# 4. LAS FACHADAS Y SUS PANTALLAS
# ==================================================================================
def edificio (s, z0, z1, alto, pantallas, grupo='E'):
    """Un edificio a un lado de la calle: la fachada de oficinas y, encima, sus
    pantallas encendidas, que van un palmo por delante."""
    x0, x1 = (PLAZA, PLAZA + 30.0) if s > 0 else (-PLAZA - 30.0, -PLAZA)
    caja(grupo, random.choice(OFICINAS + [VIDRIO]), x0, x1, z0, z1, 0.0, alto, techo=AZOTEA, baldosa=14.0)
    cara_x = s * (PLAZA - 0.15)
    for y0, y1, za, zb in pantallas:
        m = random.choice(PANTALLAS)
        cara('EP', m, [P(cara_x, za, y0), P(cara_x, zb, y0), P(cara_x, zb, y1), P(cara_x, za, y1)], uvs=[(1, 0), (0, 0), (0, 1), (1, 1)] if s < 0 else [(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((-s, 0, 0)))
        # El marco de la pantalla, negro.
        caja('EV', ACERO, min(cara_x, cara_x + s * 0.3), max(cara_x, cara_x + s * 0.3), min(za, zb) - 0.3, max(za, zb) + 0.3, y0 - 0.3, y0)
n_pant = 0
for s in (-1, 1):
    z = 60.0
    while z > -250.0:
        largo = random.uniform(22.0, 40.0)
        z1, z0 = z, z - largo
        alto = random.choice([45.0, 60.0, 80.0, 110.0, 150.0])
        pant = []
        y = random.uniform(3.5, 6.0)
        while y < min(alto - 6.0, 46.0):                                 # pantallas apiladas, de tamaños distintos
            h = random.uniform(5.0, 12.0)
            za, zb = z0 + random.uniform(0.5, 3.0), z1 - random.uniform(0.5, 3.0)
            if zb - za > 8.0 and random.random() < 0.85:
                pant.append((y, y + h, za, zb))
                n_pant += 1
            y += h + random.uniform(0.4, 2.5)
        edificio(s, z0, z1, alto, pant, 'E' if z0 > -140.0 else 'C')
        z = z0 - (12.0 if random.random() < 0.18 else 0.6)              # de vez en cuando, una calle que cruza
print('PANTALLAS', n_pant)
# El One Times Square, en el eje al fondo: la torre estrecha forrada de pantallas y la bola.
caja('E', OFICINAS[2], -11.0, 11.0, Z_ONE - 22.0, Z_ONE, 0.0, 112.0, techo=AZOTEA, baldosa=12.0)
y = 5.0
while y < 92.0:
    h = random.uniform(7.0, 13.0)
    cara('EP', random.choice(PANTALLAS), [P(-10.6, Z_ONE + 0.2, y), P(10.6, Z_ONE + 0.2, y), P(10.6, Z_ONE + 0.2, y + h), P(-10.6, Z_ONE + 0.2, y + h)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
    y += h + 1.0
barra('EV', ACERO, P(0, Z_ONE - 11.0, 112.0), P(0, Z_ONE - 11.0, 124.0), 0.4)
elipsoide('EP', BOLA, en(0.0, Z_ONE - 11.0, 125.5), (1.8, 1.8, 1.8), sub=2)

# ==================================================================================
# 5. MANHATTAN, LA ESCALINATA ROJA Y EL EMPIRE STATE (solo en el vuelo)
# ==================================================================================
# La escalinata roja del TKTS, a la espalda de la línea: brilla de rojo por dentro.
for k in range(16):
    caja('C', GRANITO, -7.0, 7.0, 46.0 + k * 1.0, 47.0 + k * 1.0, 0.0, 0.4 + k * 0.4)
    cara('CP', TKTS, [P(-7.0, 46.0 + k * 1.0 - 0.02, k * 0.4), P(7.0, 46.0 + k * 1.0 - 0.02, k * 0.4), P(7.0, 46.0 + k * 1.0 - 0.02, 0.4 + k * 0.4), P(-7.0, 46.0 + k * 1.0 - 0.02, 0.4 + k * 0.4)], hacia=V((0, 1, 0)))
suelo('G', ASFALTO, -1500.0, -PLAZA - 30.0, -1500.0, 1500.0, 0.0, 10.0)
suelo('G', ASFALTO, PLAZA + 30.0, 1500.0, -1500.0, 1500.0, 0.0, 10.0)
n_ed = 0
for gx in np.arange(-1200.0, 1200.0, 70.0):                          # la cuadrícula de Manhattan
    for gz in np.arange(-1200.0, 1200.0, 60.0):
        cx, cz = gx + 35.0, gz + 30.0
        if abs(cx) < PLAZA + 40.0 or random.random() < 0.08:
            continue
        a, b = random.uniform(20.0, 28.0), random.uniform(18.0, 24.0)
        alto = random.choice([30.0, 50.0, 70.0, 90.0, 120.0, 160.0, 220.0])
        caja('T', random.choice(OFICINAS + [VIDRIO]), cx - a, cx + a, cz - b, cz + b, 0.0, alto, techo=AZOTEA, baldosa=16.0)
        n_ed += 1
print('EDIFICIOS', n_ed)
# El Empire State, al sureste: cuerpo, escalonado, la aguja iluminada.
EX, EZ = -520.0, -820.0
for (r, y0, y1) in ((40.0, 0.0, 100.0), (30.0, 100.0, 200.0), (22.0, 200.0, 300.0), (14.0, 300.0, 360.0)):
    caja('T', OFICINAS[0], EX - r, EX + r, EZ - r * 0.7, EZ + r * 0.7, y0, y1, techo=AZOTEA, baldosa=12.0)
torno('CP', FAROLA, en(EX, EZ, 360.0), [(10.0, 0.0), (8.0, 20.0), (4.0, 40.0), (1.0, 70.0), (0.2, 90.0)], lados=8, tapas=(False, False))

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-timessquare', ['P', 'E', 'GP', 'EV', 'EP']), ('lugar-timessquare-ciudad', ['C', 'G', 'T', 'CP'])],
    # Noche: casi sin luna. La luz de verdad la ponen las pantallas, que se hornean
    # como emisoras y tiñen de colores la calle y las fachadas de enfrente.
    sol_hacia=SOL, sol_color=(0.6, 0.7, 1.0), sol_fuerza=1.6, sol_ancho=6.0, cielo_fuerza=0.08, cielo_altura=30, cielo_giro=150,
    escala=2.0, satura=0.95, no_alumbran=('CP',), suaves=(), fundir=True)
