# Agra: los jardines del Taj Mahal, al amanecer (09/10/2026).
#   blender -b -P herramientas/blender/lugar_agra.py              (entero)
#   blender -b -P herramientas/blender/lugar_agra.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_agra.py -- --reusar  (retocar la luz)
#
# La misión era Delhi; Isidro eligió para ella el TAJ MAHAL (que está en Agra: la
# misión cambia de nombre), los alienz SALEN DEL MAUSOLEO, al AMANECER con bruma
# rosada y con llegada larga.
#
# Cómo está puesto. Se mira al mausoleo desde el jardín, por el eje del canal:
#   · EL TAJ VA A 0,17 DE SU TAMAÑO (12,7 m hasta el remate; mide 73): jugando solo
#     caben trece metros de alto al fondo, y el Taj es su silueta entera —la
#     cúpula, los cuatro templetes, los cuatro alminares—, no un trozo de pared.
#   · Está sobre su zócalo de mármol (1,2 m). Los alienz nacen dentro, a oscuras,
#     salen por la puerta del gran arco y bajan la escalinata: `hueco` con el
#     suelo LEVANTADO (como el Partenón) y `entrada` con `abanico` (la puerta mide
#     2,4 m) en la misión.
#   · El canal del eje se ha vuelto una vena de resina negra que sale del
#     mausoleo: los alienz lo pisan. A los lados, los paseos de arenisca roja, el
#     césped y las hileras de cipreses.
#   · EL SOL VA CASI A LA ESPALDA: de verdad sale por la derecha (el este), pero
#     con el sol tan bajo los cipreses de ese lado tapaban tres carriles de sombra.
#   · Solo en el vuelo: la gran puerta de arenisca a la espalda, la mezquita y su
#     gemela a los lados, el recinto, el Yamuna detrás y Agra.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.18, 0.32, 0.9)                  # recién salido: bajo, a la espalda y un punto a la derecha
iniciar('agra', 2917, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.3, 0.2, 0.2))

Z_ESC, Z_ZOC = -68.0, -72.0              # donde empieza la escalinata y donde llega arriba (el canto del zócalo)
Y_ZOC = 1.2
MZ = 8.8                                 # medio zócalo
ZB = -81.0                               # el centro del mausoleo
MB, CH = 5.2, 1.5                        # medio cuerpo y su chaflán
HB = 5.6                                 # alto del cuerpo
ZF = ZB + MB                             # su cara de delante
PUERTA, H_PUERTA = 1.2, 3.4
BASE = (12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El eje del jardín: el canal vuelto resina, su brocal de mármol, los dos
    paseos de arenisca roja con su dibujo de estrellas y el césped con parterres."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('leafy_grass', 256, 0x93b060, 0.5))
    a *= (0.9 + 0.2 * nube(PH_, PW, 24, 6))[..., None]
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)
    roja = tejar(foto('stone_pavers', 256, 0xd49a7c, 0.5))
    paseo = (np.abs(xs) < 5.4)
    a[:, paseo] = roja[:, paseo]
    # El dibujo de los paseos: rombos de piedra más clara, y la junta de las losas.
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    mx, mz = xx / KX, yy / KZ
    rombo = (np.abs((mx % 2.0) - 1.0) + np.abs((mz % 2.0) - 1.0)) < 0.34
    a[rombo & paseo[None, :]] = np.clip(a[rombo & paseo[None, :]] * 1.28, 0, 1)
    junta = ((mx % 1.0) < 0.04) | ((mz % 1.0) < 0.04)
    a[junta & paseo[None, :]] *= 0.78
    marmol = tejar(foto('marble_01', 256, 0xe6dfd4, 0.3))
    for x0, x1 in ((-1.4, -1.0), (1.0, 1.4), (-5.7, -5.4), (5.4, 5.7)):          # los brocales del canal y los bordillos del césped
        (c0, _), (c1, _) = a_px(x0, 0), a_px(x1, 0)
        a[:, c0:c1] = marmol[:, c0:c1]
        a[:, c0:c0 + 1] *= 0.7; a[:, c1 - 1:c1] *= 0.7
        a[::int(1.6 * KZ), c0:c1] *= 0.7
    (c0, _), (c1, _) = a_px(-1.0, 0), a_px(1.0, 0)                                # el canal: resina negra con sus venas
    n = c1 - c0
    vena = nube(PH_, n, 90, 3)
    resina = np.stack([0.05 + 0.04 * vena, 0.1 + 0.1 * vena, 0.08 + 0.06 * vena], axis=-1)
    hilo = (np.abs(nube(PH_, n, 40, 2) - 0.5) < 0.02)
    resina[hilo] = (0.1, 0.42, 0.2)
    a[:, c0:c1] = resina
    cm = (c0 + c1) // 2
    for f in range(0, PH_, int(4.0 * KZ)):                                        # los surtidores, que ya no echan agua
        a[f:f + 5, cm - 2:cm + 3] = (0.5, 0.48, 0.44)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx_ = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx_ - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((3.6, -15.0, 1.4), (-3.8, -34.0, 1.5), (4.0, -52.0, 1.3)):      # la guerra
        mancha(x, z, r_ * 1.5, 0.82, 1.1)
        mancha(x, z, r_, 0.45)
    for s in (-1, 1):                                                              # los parterres: flores a puntos
        for z in np.arange(-56.0, 10.0, 6.5):
            for _ in range(70):
                c, f = a_px(s * random.uniform(6.2, 7.6), z + random.uniform(-1.6, 1.6))
                if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                    a[f:f + 2, c:c + 2] = random.choice(((0.85, 0.2, 0.25), (0.9, 0.7, 0.15), (0.9, 0.85, 0.8), (0.7, 0.2, 0.5)))
    for _ in range(40):
        mancha(random.uniform(-5.2, 5.2), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.0), random.uniform(0.82, 0.93), random.uniform(0.6, 1.4))
    return guardar('pista', np.clip(a, 0, 1), 88)

def arco_px (a, cx, y_pie, y_arr, y_clave, medio, color):
    """Pinta un arco apuntado (en píxeles; y hacia abajo): del pie al arranque recto, y de ahí a la clave."""
    Hh, W = a.shape[:2]
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    t = np.clip((y_arr - yy) / max(1.0, y_arr - y_clave), 0, 1)
    ancho = medio * np.sqrt(np.clip(1 - t ** 1.7, 0, 1))
    m = (np.abs(xx - cx) < ancho) & (yy <= y_pie) & (yy >= y_clave)
    a[m] = color if not callable(color) else color(yy)[m]
    return m

def tex_fachada ():
    """Una cara del mausoleo (7,4 × 5,6 m): el gran arco en su marco, con la
    caligrafía alrededor y las flores de las enjutas, y a cada lado dos nichos."""
    W, Hh = 512, 384
    a = np.tile(foto('marble_01', 128, 0xf0e9de, 0.25), (3, 4, 1))
    a *= (0.95 + 0.08 * nube(Hh, W, 6, 8))[..., None]
    fy = lambda y: int((1 - y / HB) * Hh)                                         # de metros a fila
    fx = lambda x: int((x / (2 * (MB - CH)) + 0.5) * W)
    # El marco del gran arco, con su cenefa de caligrafía.
    x0, x1, yt = fx(-1.95), fx(1.95), fy(5.45)
    a[yt:, x0:x1] = np.clip(a[yt:, x0:x1] * 1.03, 0, 1)
    for c0, c1 in ((x0, x0 + 12), (x1 - 12, x1)):
        a[yt:, c0:c1] = (0.9, 0.87, 0.8)
        for f in range(yt + 4, Hh - 4, 7):
            a[f:f + 4, c0 + 3:c1 - 3] = (0.16, 0.15, 0.14) if random.random() < 0.8 else (0.9, 0.87, 0.8)
    a[yt:yt + 12, x0:x1] = (0.9, 0.87, 0.8)
    for c in range(x0 + 4, x1 - 6, 7):
        a[yt + 3:yt + 9, c:c + 4] = (0.16, 0.15, 0.14)
    a[yt - 2:yt, x0 - 2:x1 + 2] *= 0.7; a[yt:, x0 - 2:x0] *= 0.7; a[yt:, x1:x1 + 2] *= 0.7
    # El arco: el hueco en penumbra, más oscuro hacia abajo (ahí está la puerta de verdad).
    sombra = lambda yy: np.stack([0.5 - 0.3 * np.clip((yy - fy(4.6)) / (Hh - fy(4.6)), 0, 1)] * 3, axis=-1) * np.array((1.0, 0.92, 0.86))
    arco_px(a, W / 2, Hh, fy(3.3), fy(4.75), fx(1.5) - W / 2, sombra)
    for s in (-1, 1):                                                              # las flores de las enjutas
        cx, cy = W / 2 + s * (fx(1.25) - W / 2), fy(4.7)
        for k in range(26):
            ang, d = random.uniform(0, 6.28), random.uniform(0, 14)
            c, f = int(cx + d * math.cos(ang)), int(cy + d * 0.7 * math.sin(ang))
            a[f:f + 2, c:c + 2] = random.choice(((0.6, 0.2, 0.16), (0.2, 0.4, 0.22), (0.8, 0.6, 0.2)))
    # Los nichos de los lados, en dos pisos.
    for s in (-1, 1):
        cx = W / 2 + s * (fx(2.85) - W / 2)
        for y_pie, y_arr, y_clave in ((0.1, 1.6, 2.4), (2.95, 4.2, 5.0)):
            m = arco_px(a, cx, fy(y_pie), fy(y_arr), fy(y_clave), fx(0.62) - W / 2, (0.56, 0.5, 0.47))
            arco_px(a, cx, fy(y_pie), fy(y_arr) + 4, fy(y_clave) + 9, fx(0.44) - W / 2, (0.34, 0.3, 0.29))
        a[fy(2.75):fy(2.62)] *= 0.9
    a[:6] *= 0.8; a[6:12] = np.clip(a[6:12] * 1.05, 0, 1)                           # la cornisa
    a[Hh - 14:] *= 0.92                                                            # el zócalo de flores talladas
    return guardar('fachada-taj', np.clip(a, 0, 1), 90)

def tex_chaflan ():
    """El chaflán de cada esquina: dos nichos, uno sobre otro."""
    W, Hh = 128, 384
    a = np.tile(foto('marble_01', 128, 0xf0e9de, 0.25), (3, 1, 1))
    fy = lambda y: int((1 - y / HB) * Hh)
    for y_pie, y_arr, y_clave in ((0.1, 1.6, 2.4), (2.95, 4.2, 5.0)):
        arco_px(a, W / 2, fy(y_pie), fy(y_arr), fy(y_clave), 40, (0.56, 0.5, 0.47))
        arco_px(a, W / 2, fy(y_pie), fy(y_arr) + 4, fy(y_clave) + 9, 28, (0.34, 0.3, 0.29))
    a[:6] *= 0.8
    a[:, :3] *= 0.86; a[:, -3:] *= 0.86
    return guardar('chaflan-taj', np.clip(a, 0, 1), 90)

def tex_zocalo ():
    """El zócalo: mármol con una arquería ciega."""
    a = foto('marble_01', 128, 0xe8e1d6, 0.25).copy()
    for cx in (32, 96):
        arco_px(a, cx, 116, 60, 28, 20, (0.72, 0.68, 0.64))
    a[:8] = np.clip(a[:8] * 1.06, 0, 1); a[8:11] *= 0.76; a[120:] *= 0.88
    return guardar('zocalo-taj', np.clip(a, 0, 1), 88)

def tex_arenisca ():
    """La arenisca roja de la puerta y la mezquita, con sus recuadros de mármol."""
    a = foto('sandstone_blocks_08', 256, 0xb86a50, 0.5).copy()
    for k in range(4):
        cx = k * 64 + 32
        a[40:44, cx - 22:cx + 22] = (0.88, 0.84, 0.78); a[200:204, cx - 22:cx + 22] = (0.88, 0.84, 0.78)
        a[40:204, cx - 22:cx - 19] = (0.88, 0.84, 0.78); a[40:204, cx + 19:cx + 22] = (0.88, 0.84, 0.78)
        arco_px(a, cx, 196, 110, 60, 15, (0.3, 0.16, 0.12))
    return guardar('arenisca-roja', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.95)
FACHADA = material('fachada-taj', tex_fachada(), rug=0.6)
CHAFLAN = material('chaflan-taj', tex_chaflan(), rug=0.6)
ZOCALO = material('zocalo-taj', tex_zocalo(), rug=0.6)
MARMOL = material('marmol', de_polyhaven('marble_01', 512, 0xf0e9de, 0.25), rug=0.5)
ARENISCA = material('arenisca-roja', tex_arenisca(), rug=0.95)
LOSA_ROJA = material('losa-roja', de_polyhaven('stone_pavers', 512, 0xd49a7c, 0.5), rug=0.95)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x93b060, 0.5), rug=1.0)
CAMPO = material('campo', de_polyhaven('sparse_grass', 512, 0xa9a377, 0.4), rug=1.0)
SOLAR = material('solar', de_polyhaven('dirt_floor', 512, 0xc0a383, 0.4), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.66, 0.58, 0.5)))
# OJO: los colores lisos van en LINEAL.
BLANCO = material('marmol-liso', color=(0.82, 0.76, 0.7), rug=0.5)
ROJO = material('arenisca-lisa', color=(0.45, 0.16, 0.1), rug=0.9)
ORO = material('oro', color=(0.8, 0.52, 0.12), rug=0.3)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
RIO = material('rio', color=(0.3, 0.3, 0.36), rug=0.1)                              # el Yamuna, con el cielo rosa encima (va sin luz)
CIPRES = material('cipres', color=(0.06, 0.14, 0.06), rug=1.0)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.13, 0.04), (0.08, 0.16, 0.05), (0.11, 0.19, 0.06)])]
TRONCO = material('tronco', color=(0.1, 0.07, 0.05))
MONTE_L = material('monte-lejos', color=(0.42, 0.36, 0.36), rug=1.0)
FACHADAS = [material(f'f-agra-{i}', tex_postigos(f'agra-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.84, 0.74, 0.62), (0.3, 0.36, 0.4)), ((0.78, 0.6, 0.5), (0.36, 0.26, 0.2)), ((0.9, 0.86, 0.78), (0.24, 0.4, 0.4)), ((0.7, 0.72, 0.8), (0.3, 0.3, 0.36))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.98, 0.76, 0.66)), (0.08, (0.96, 0.72, 0.68)), (0.25, (0.76, 0.68, 0.8)), (0.6, (0.48, 0.58, 0.84)), (1.0, (0.26, 0.4, 0.76))],
    (SOL[0], SOL[2]), 0.08, (0.9, 0.45, 0.2), ((1.0, 0.78, 0.66), (0.8, 0.7, 0.78)), cuanta_nube=0.14), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL JARDÍN
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
RECINTO = 150.0                                                                    # medio jardín
Z_PUERTA = 150.0                                                                   # la gran puerta, a la espalda
Z_TERRAZA = -64.0                                                                  # de aquí al río, la terraza de arenisca
suelo('GN', CESPED, -RECINTO, PX0, Z_TERRAZA, Z_PUERTA, 0.0, 6.0)
suelo('GN', CESPED, PX1, RECINTO, Z_TERRAZA, Z_PUERTA, 0.0, 6.0)
suelo('GN', LOSA_ROJA, PX0, PX1, PZ1, Z_PUERTA, 0.0, 3.0)
suelo('GN', LOSA_ROJA, PX0, PX1, Z_TERRAZA, PZ0, 0.0, 3.0)
suelo('GN', LOSA_ROJA, -RECINTO, RECINTO, -112.0, Z_TERRAZA, 0.0, 3.0)                # la terraza
# Los caminos que cruzan el jardín, con material propio (van encima del césped).
CAMINO = material('camino', imagen_de(LOSA_ROJA), rug=0.95)
for z in (-20.0, 60.0):
    for s in (-1, 1):
        rect('GN', CAMINO, min(s * 9.2, s * RECINTO), max(s * 9.2, s * RECINTO), z - 3.0, z + 3.0, 0.05, 3.0)
for x in (-75.0, 75.0):
    rect('GN', CAMINO, x - 3.0, x + 3.0, Z_TERRAZA, Z_PUERTA, 0.05, 3.0)

for z in np.arange(8.0, -62.0, -6.4):                                               # las dos hileras de cipreses del canal
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 8.0:
            continue
        cipres('EV', CIPRES, s * 8.7, float(z), random.uniform(0.5, 0.62))
for z in np.arange(14.0, Z_PUERTA - 12.0, 6.4):
    for s in (-1, 1):
        cipres('T', CIPRES, s * 8.7, float(z), random.uniform(0.5, 0.62))
for _ in range(34):                                                                 # la arboleda de los cuadros, la que se ve jugando
    s = random.choice((-1, 1))
    x, z = s * random.uniform(12.5, 30.0), random.uniform(-58.0, 6.0)
    if abs(z + 20.0) < 5.0 or (s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < 8.5):
        continue
    arbol('EV', TRONCO, HOJAS, x, z, random.uniform(0.7, 1.1))
for _ in range(420):
    x, z = random.uniform(-RECINTO + 8, RECINTO - 8), random.uniform(Z_TERRAZA + 6, Z_PUERTA - 8)
    if abs(x) < 31.0 and z < 12.0 or abs(x) < 12.0 or abs(z + 20.0) < 5.0 or abs(z - 60.0) < 5.0 or abs(abs(x) - 75.0) < 5.0:
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(0.9, 1.6))
# El ruedo de la base alien: una plataforma de arenisca en el césped.
torno('P', LOSA_ROJA, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.3), (4.8, 0.3), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(LOSA_ROJA), rug=0.95)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for s in (-1, 1):                                                                   # bancos de mármol junto al paseo
    for z in (-8.0, -30.0, -52.0):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        bloque('EV', BLANCO, en(s * 7.9, z, 0.0), (0.6, 1.8, 0.45), mella=0.01)

# ==================================================================================
# 3. EL MAUSOLEO
# ==================================================================================
# El zócalo y su escalinata (en el juego es una rampa: `hueco` con el suelo levantado).
viga('P', ZOCALO, -MZ, MZ, ZB - MZ, Z_ZOC, 0.0, Y_ZOC, u_m=1.6, techo=MARMOL)
N_ESC = 6
for k in range(N_ESC):
    y = Y_ZOC * (k + 1) / N_ESC
    z1 = Z_ESC - (Z_ESC - Z_ZOC) * k / N_ESC
    viga('P', MARMOL, -7.6, 7.6, Z_ZOC, z1, y - Y_ZOC / N_ESC, y, u_m=2.0, techo=MARMOL)
for s in (-1, 1):                                                                   # las zancas
    viga('P', ZOCALO, min(s * 7.6, s * MZ), max(s * 7.6, s * MZ), Z_ZOC, Z_ESC, 0.0, Y_ZOC + 0.25, u_m=1.6, techo=MARMOL)

# El cuerpo: un cuadrado con las esquinas en chaflán. Cada cara lleva su dibujo.
def cara_tex (mat, a_, b, y0, y1, u0, u1, v0, v1, hacia):
    cara('P', mat, [P(a_[0], a_[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y1), P(a_[0], a_[1], y1)], uvs=[(u0, v0), (u1, v0), (u1, v1), (u0, v1)], hacia=hacia)
Y0, Y1 = Y_ZOC, Y_ZOC + HB
L = MB - CH
ancho = 2 * L
u_de = lambda x: (x + L) / ancho
# delante, en tres trozos: la puerta queda abierta de verdad
cara_tex(FACHADA, (-L, ZF), (-PUERTA, ZF), Y0, Y1, 0.0, u_de(-PUERTA), 0.0, 1.0, V((0, -1, 0)))
cara_tex(FACHADA, (PUERTA, ZF), (L, ZF), Y0, Y1, u_de(PUERTA), 1.0, 0.0, 1.0, V((0, -1, 0)))
cara_tex(FACHADA, (-PUERTA, ZF), (PUERTA, ZF), Y0 + H_PUERTA, Y1, u_de(-PUERTA), u_de(PUERTA), H_PUERTA / HB, 1.0, V((0, -1, 0)))
cara_tex(FACHADA, (L, ZB - MB), (-L, ZB - MB), Y0, Y1, 0.0, 1.0, 0.0, 1.0, V((0, 1, 0)))               # detrás
cara_tex(FACHADA, (MB, ZF - CH), (MB, ZB - MB + CH), Y0, Y1, 0.0, 1.0, 0.0, 1.0, V((1, 0, 0)))          # derecha
cara_tex(FACHADA, (-MB, ZB - MB + CH), (-MB, ZF - CH), Y0, Y1, 0.0, 1.0, 0.0, 1.0, V((-1, 0, 0)))       # izquierda
for sx, sz in ((1, 1), (1, -1), (-1, -1), (-1, 1)):                                                    # los cuatro chaflanes
    p0, p1 = (sx * L, ZB + sz * MB), (sx * MB, ZB + sz * (MB - CH))
    if sx * sz < 0:
        p0, p1 = p1, p0
    cara_tex(CHAFLAN, p0, p1, Y0, Y1, 0.0, 1.0, 0.0, 1.0, V((sx, -sz, 0)))
planta = [(-L, ZF), (L, ZF), (MB, ZF - CH), (MB, ZB - MB + CH), (L, ZB - MB), (-L, ZB - MB), (-MB, ZB - MB + CH), (-MB, ZF - CH)]
cara('P', MARMOL, [P(x, z, Y1) for x, z in planta], hacia=ARRIBA, baldosa=3.0)
viga('P', MARMOL, -1.95, 1.95, ZF - 0.3, ZF + 0.12, Y1, Y1 + 0.55, u_m=2.0, techo=MARMOL)              # el marco del gran arco sube sobre la cornisa
for s in (-1, 1):
    barra('EV', BLANCO, P(s * 1.95, ZF + 0.1, Y0), P(s * 1.95, ZF + 0.1, Y1 + 1.0), 0.16)               # y sus dos pináculos
    barra('EV', BLANCO, P(s * MB, ZF - CH / 2 + 0.6, Y1), P(s * MB, ZF - CH / 2 + 0.6, Y1 + 0.7), 0.12)
# Por dentro: a oscuras, con lo que hay ahora en la cámara.
for s in (-1, 1):
    cara('EP', NEGRO, [P(s * PUERTA, ZF, Y0), P(s * PUERTA, ZF - 5.0, Y0), P(s * PUERTA, ZF - 5.0, Y0 + H_PUERTA), P(s * PUERTA, ZF, Y0 + H_PUERTA)], hacia=V((-s, 0, 0)))
cara('EP', NEGRO, [P(-PUERTA, ZF - 5.0, Y0), P(PUERTA, ZF - 5.0, Y0), P(PUERTA, ZF - 5.0, Y0 + H_PUERTA), P(-PUERTA, ZF - 5.0, Y0 + H_PUERTA)], hacia=V((0, -1, 0)))
cara('EP', NEGRO, [P(-PUERTA, ZF, Y0 + H_PUERTA), P(PUERTA, ZF, Y0 + H_PUERTA), P(PUERTA, ZF - 5.0, Y0 + H_PUERTA), P(-PUERTA, ZF - 5.0, Y0 + H_PUERTA)], hacia=V((0, 0, -1)))
cara('EP', NEGRO, [P(-PUERTA, ZF, Y0 + 0.01), P(PUERTA, ZF, Y0 + 0.01), P(PUERTA, ZF - 5.0, Y0 + 0.01), P(-PUERTA, ZF - 5.0, Y0 + 0.01)], hacia=ARRIBA)
for x, y, r in ((-0.6, 1.0, 0.34), (0.5, 2.1, 0.26), (0.1, 0.5, 0.2), (-0.3, 2.7, 0.16)):
    cara('EP', BRILLO_HONDO if r > 0.3 else VERDE, [P(x + r * math.cos(a_), ZF - 4.96, Y0 + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(5):                                                                 # las raíces que bajan la escalinata hasta el canal
    x = -1.0 + k * 0.5
    barra('EV', RESINA, P(x, ZF - 0.5, Y0 + 0.05), P(x * 1.2 + random.uniform(-0.2, 0.2), Z_ZOC, Y0 + 0.06), 0.22)
    barra('EV', RESINA, P(x * 1.2, Z_ZOC, Y0 + 0.06), P(x * 1.1, Z_ESC - 0.2, 0.12), 0.2)

# La cúpula: tambor, bulbo y remate dorado.
torno('P', MARMOL, en(0.0, ZB, Y1), [(1.8, 0.0), (1.8, 1.0), (1.98, 1.12), (2.28, 2.0), (2.3, 2.6), (2.05, 3.4), (1.5, 4.1), (0.85, 4.6), (0.3, 4.9), (0.0, 5.0)], lados=22, u_rep=6, v_m=3.0, tapas=(False, False))
torno('EV', BLANCO, en(0.0, ZB, Y1 + 4.9), [(0.4, 0.0), (0.2, 0.14), (0.0, 0.2)], lados=8, tapas=(False, False))     # el loto
barra('EV', ORO, P(0.0, ZB, Y1 + 5.0), P(0.0, ZB, Y1 + 5.9), 0.1)
elipsoide('EV', ORO, en(0.0, ZB, Y1 + 5.35), (0.2, 0.2, 0.16))
def templete (x, z, y, r, alto, n=6, grupo='EV'):
    """Un chhatri: columnillas, cornisa y su cupulín."""
    for i in range(n):
        a_ = 2 * math.pi * i / n
        barra(grupo, BLANCO, P(x + r * 0.86 * math.cos(a_), z + r * 0.86 * math.sin(a_), y), P(x + r * 0.86 * math.cos(a_), z + r * 0.86 * math.sin(a_), y + alto), r * 0.14)
    torno(grupo, BLANCO, en(x, z, y + alto), [(r * 1.2, 0.0), (r * 1.2, r * 0.12), (r * 0.95, r * 0.16), (r * 1.0, r * 0.5), (r * 0.8, r * 0.9), (r * 0.4, r * 1.2), (0.0, r * 1.36)], lados=10, tapas=(True, False))
    barra(grupo, ORO, P(x, z, y + alto + r * 1.36), P(x, z, y + alto + r * 1.75), r * 0.07)
for sx in (-1, 1):
    for sz in (-1, 1):
        templete(sx * 3.2, ZB + sz * 3.2, Y1, 0.78, 0.8, 8)
# Los cuatro alminares, en las esquinas del zócalo.
for sx in (-1, 1):
    for sz in (-1, 1):
        x, z = sx * (MZ - 0.6), ZB + sz * (MZ - 0.6)
        torno('P', MARMOL, en(x, z, Y_ZOC), [(0.62, 0.0), (0.62, 0.2), (0.5, 0.22), (0.45, 2.4), (0.62, 2.46), (0.62, 2.6), (0.44, 2.62), (0.4, 4.7), (0.57, 4.76), (0.57, 4.9), (0.4, 4.92), (0.36, 6.5), (0.56, 6.56), (0.56, 6.7)],
              lados=12, u_rep=3, v_m=2.4, tapas=(False, True))
        templete(x, z, Y_ZOC + 6.7, 0.46, 0.7, 6)
print('TAJ', round(Y1 + 5.9, 2), 'm; alminares', round(Y_ZOC + 6.7 + 0.7 + 0.46 * 1.75, 2))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-67.5)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: LA MEZQUITA Y SU GEMELA, LA GRAN PUERTA, EL RÍO, AGRA
# ==================================================================================
def cupula_blanca (x, z, y, r):
    torno('T', BLANCO, en(x, z, y), [(r * 0.9, 0.0), (r * 0.9, r * 0.3), (r * 1.08, r * 0.7), (r * 1.0, r * 1.2), (r * 0.6, r * 1.7), (0.0, r * 2.0)], lados=14, tapas=(False, False))
    barra('T', ORO, P(x, z, y + r * 2.0), P(x, z, y + r * 2.5), r * 0.06)
for s in (-1, 1):                                                                   # la mezquita (izquierda) y el jawab (derecha), iguales
    x0, x1 = min(s * 52.0, s * 70.0), max(s * 52.0, s * 70.0)
    viga('C', ARENISCA, x0, x1, ZB - 15.0, ZB + 15.0, 0.0, 7.5, u_m=7.5, techo=AZOTEA)
    viga('C', ARENISCA, min(s * 51.0, s * 55.0), max(s * 51.0, s * 55.0), ZB - 4.5, ZB + 4.5, 0.0, 10.0, u_m=7.5, techo=AZOTEA)     # su arco central
    for dz, r in ((-9.0, 2.4), (0.0, 3.3), (9.0, 2.4)):
        cupula_blanca(s * 62.0, ZB + dz, 7.5, r)
    for dz in (-15.0, 15.0):
        torno('T', ROJO, en(s * 53.0, ZB + dz), [(1.3, 0.0), (1.3, 9.0)], lados=8, tapas=(False, True))
        cupula_blanca(s * 53.0, ZB + dz, 9.0, 1.2)
# La gran puerta, a la espalda: arenisca roja con su arco blanco y la hilera de cupulines.
viga('C', ARENISCA, -22.0, 22.0, Z_PUERTA, Z_PUERTA + 16.0, 0.0, 24.0, u_m=12.0, v_rep=2.0, techo=AZOTEA)
cara('C', MARMOL, [P(-8.0, Z_PUERTA - 0.05, 0.0), P(8.0, Z_PUERTA - 0.05, 0.0), P(8.0, Z_PUERTA - 0.05, 20.0), P(-8.0, Z_PUERTA - 0.05, 20.0)], hacia=V((0, -1, 0)), baldosa=4.0)
cara('CP', NEGRO, [P(4.6 * math.copysign(abs(math.cos(t)) ** 0.8, math.cos(t)), Z_PUERTA - 0.1, 9.0 + 7.0 * math.sin(t) ** 0.9) for t in np.linspace(0, math.pi, 13)] + [P(-4.6, Z_PUERTA - 0.1, 0.0), P(4.6, Z_PUERTA - 0.1, 0.0)], hacia=V((0, -1, 0)))
for k in range(11):
    cupula_blanca(-10.0 + k * 2.0, Z_PUERTA + 0.8, 24.0, 0.7)
for sx in (-1, 1):
    for dz in (0.0, 16.0):
        torno('T', ROJO, en(sx * 22.0, Z_PUERTA + dz), [(2.4, 0.0), (2.4, 26.0)], lados=8, tapas=(False, True))
        cupula_blanca(sx * 22.0, Z_PUERTA + dz, 26.0, 2.2)
# El muro del recinto, a tramos (de una pieza salía negro: las esquinas quedan dentro de otras).
for s in (-1, 1):
    z = Z_PUERTA
    while z > -112.0:
        z1 = max(-112.0, z - 44.0)
        caja('T', ARENISCA, min(s * RECINTO, s * (RECINTO + 3.0)), max(s * RECINTO, s * (RECINTO + 3.0)), z1 + 0.4, z - 0.4, 0.0, 8.0, baldosa=8.0)
        z = z1
    x = 24.0
    while x < RECINTO - 2.0:
        caja('T', ARENISCA, min(s * x, s * (x + 40.0)) + 0.4, max(s * x, s * (x + 40.0)) - 0.4, Z_PUERTA + 4.0, Z_PUERTA + 7.0, 0.0, 8.0, baldosa=8.0)
        x += 42.0
# El Yamuna, detrás, y su otra orilla; y Agra a la espalda.
rect('CP', RIO, -3200.0, 3200.0, -420.0, -112.0, -3.0, 200.0)
for x0 in np.arange(-RECINTO - 3.0, RECINTO, 51.0):
    caja('T', ARENISCA, float(x0) + 0.3, float(x0) + 50.7, -113.5, -112.0, -3.4, 0.0, baldosa=8.0)
suelo('G', CAMPO, -1500.0, 1500.0, -1500.0, -420.0, -2.0, 12.0)
suelo('G', SOLAR, -1500.0, -RECINTO - 3.0, -112.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, RECINTO + 3.0, 1500.0, -112.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -RECINTO - 3.0, RECINTO + 3.0, Z_PUERTA, 1500.0, 0.0, 8.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 34.0):
    for gz in np.arange(-100.0, 1250.0, 34.0):
        cx, cz = gx + 17 + random.uniform(-4, 4), gz + 17 + random.uniform(-4, 4)
        if (abs(cx) < RECINTO + 40.0 and cz < Z_PUERTA + 60.0) or random.random() < 0.25:
            continue
        ax, az = random.choice((8.0, 9.5, 11.0, 12.5)), random.choice((8.0, 9.5, 11.0))
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, random.choice([6, 9, 12, 15]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for _ in range(260):                                                                # arboledas fuera del recinto y en la otra orilla
    if random.random() < 0.5:
        x, z = random.uniform(-900.0, 900.0), random.uniform(-900.0, -440.0)
        arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.4, 2.4), y=-2.0)
    else:
        s = random.choice((-1, 1))
        arbol('T', TRONCO, HOJAS, s * random.uniform(RECINTO + 8.0, RECINTO + 60.0), random.uniform(-100.0, 260.0), random.uniform(1.2, 2.0))
for cx, cz, radio, alto in ((-900.0, -2300.0, 1200.0, 40.0), (1100.0, -2200.0, 1100.0, 36.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=-2.0, seg=20, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-agra', ['P', 'GN', 'EV', 'EP']), ('lugar-agra-ciudad', ['C', 'G', 'T', 'CP'])],
    # Amanecer rosado: como el de Cnosos (sol dorado y fuerte, cielo flojo), con el sol más rosa.
    sol_hacia=SOL, sol_color=(1.0, 0.68, 0.5), sol_fuerza=6.5, sol_ancho=4.0, cielo_fuerza=0.18, cielo_altura=8, cielo_giro=160,
    escala=0.84, satura=1.0, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
