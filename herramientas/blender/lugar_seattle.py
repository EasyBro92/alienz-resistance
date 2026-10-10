# Seattle: la calle de Pike Place Market, una tarde de lluvia (10/10/2026).
#   blender -b -P herramientas/blender/lugar_seattle.py              (entero)
#   blender -b -P herramientas/blender/lugar_seattle.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_seattle.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). La Space Needle mide 184 m y jugando caben trece: lo que sí cabe, y es
# igual de Seattle, es el mercado de Pike Place con su rótulo rojo y su reloj. El
# parte dice que «las formas salen del agua del puerto», que está justo detrás y
# debajo del mercado: los alienz SALEN DEL MERCADO. Tarde de LLUVIA.
#
# Cómo está puesto. Se mira calle abajo, hacia la bahía:
#   · al fondo, el mercado: la galería con sus puestos encendidos, la marquesina
#     verde y, en el tejado, el rótulo PUBLIC MARKET con el reloj (11,6 m);
#   · la boca de la galería (6 m) es por donde salen, en abanico (`abanico`);
#   · la calle es de ladrillo mojado, con los reflejos del neón; a los lados,
#     casas de ladrillo con toldos, postes, una furgoneta de reparto, y la base
#     alien en un ruedo a la derecha;
#   · solo en el vuelo: la bahía con la noria y los muelles, la Space Needle y
#     las torres del centro.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

H.LETRAS.update({
    'P': ['11110', '10001', '11110', '10000', '10000'], 'U': ['10001', '10001', '10001', '10001', '01110'],
    'B': ['11110', '10001', '11110', '10001', '11110'], 'C': ['01111', '10000', '10000', '10000', '01111'],
    'M': ['10001', '11011', '10101', '10001', '10001'], 'R': ['11110', '10001', '11110', '10010', '10001'],
    'K': ['10001', '10010', '11100', '10010', '10001'], 'T': ['11111', '00100', '00100', '00100', '00100'],
    'F': ['11111', '10000', '11110', '10000', '10000'], 'S': ['01111', '10000', '01110', '00001', '11110'],
    'H': ['10001', '10001', '11111', '10001', '10001'], 'O': ['01110', '10001', '10001', '10001', '01110']})

SOL = (-0.3, 0.6, 0.74)                  # un claro que apenas se nota: a la espalda
iniciar('seattle', 3726, eje=(0.0, -80.0), encendidas=0.3, reflejo=(0.16, 0.18, 0.2))

ZM = -70.0                               # la cara del mercado
FONDO_M = 16.0
MM = 22.0                                # medio mercado
BOCA = 3.0                               # media boca de la galería
H1, H2 = 3.6, 6.8                        # la marquesina y la cornisa
FX = 15.0                                # las fachadas de la calle
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
    """La calle: ladrillo rojo en espiga, mojado, con los charcos, los parches de
    asfalto, las rayas de aparcamiento a medio borrar y el rojo del rótulo en el agua."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('red_brick', 256, 0x8a5448, 0.6))
    a *= (0.82 + 0.3 * nube(PH_, PW, 18, 5))[..., None]
    asfalto = tejar(foto('asphalt_02', 256, 0x5a5a5e, 0.6))
    parche = np.clip((nube(PH_, PW, 14, 4) - 0.76) / 0.04, 0, 1)[..., None]
    a = a * (1 - parche) + asfalto * parche
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    for x in (-7.4, 7.4):                                                # las plazas de aparcamiento, en batería
        (c, _) = a_px(x, 0)
        c0, c1 = sorted((c, c - int(1.8 * KX * np.sign(x))))
        for f in range(0, PH_, int(2.6 * KZ)):
            a[f:f + 3, c0:c1] = a[f:f + 3, c0:c1] * 0.4 + 0.5
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    zs = PZ0 + yy / KZ
    ch = nube(PH_, PW, 26, 7)
    mojado = np.clip((ch - 0.4) / 0.2, 0, 1)[..., None]
    a *= 1 - 0.34 * mojado                                               # el ladrillo mojado es más oscuro…
    charco = np.clip((ch - 0.75) / 0.04, 0, 1)[..., None]                 # …y los charcos devuelven el cielo gris
    a = a * (1 - charco) + np.array((0.56, 0.6, 0.64), np.float32) * (0.9 + 0.14 * nube(PH_, PW, 60, 9))[..., None] * charco
    cerca = (np.clip((zs - PZ0) / 26.0, 0, 1) ** 0.5)                    # el rojo del rótulo, a rayas, cerca del mercado
    rojo = (1 - cerca) * (0.5 + 0.5 * nube(4, PW, 1, 30)[0][None, :]) * np.clip(1 - np.abs(xs) / 9.0, 0, 1)
    a += rojo[..., None] * np.array((0.5, 0.08, 0.05), np.float32) * (0.4 + 0.6 * mojado)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.2, -14.0, 1.5), (-4.6, -33.0, 1.6), (1.4, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    for k in range(9):                                                   # el rastro de lo que sube del puerto
        x, z = -2.6 + k * 0.65 + random.uniform(-0.3, 0.3), PZ0
        for i in range(int(random.uniform(4.0, 13.0) * KZ)):
            x += random.uniform(-0.02, 0.02); z += 1 / KZ
            c, f = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f < PH_:
                a[f, c - 2:c + 3] = a[f, c - 2:c + 3] * 0.55 + np.array((0.04, 0.14, 0.08), np.float32) * 0.45
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_puestos ():
    """La galería del mercado (12 × 3,6 m): entre columna y columna, un puesto
    encendido con su género —fruta, flores, pescado sobre hielo— y su rótulo. Sin luz."""
    W, Hh = 512, 128
    a = lienzo(Hh, W, (0.16, 0.13, 0.1))
    for k in range(4):
        x0 = k * 128
        a[10:118, x0 + 8:x0 + 120] = np.array((0.9, 0.74, 0.46)) * (0.5 + 0.3 * nube(108, 112, 2, 3))[..., None]
        colores = random.choice([((0.8, 0.2, 0.1), (0.9, 0.6, 0.1), (0.3, 0.6, 0.15)), ((0.8, 0.3, 0.5), (0.9, 0.8, 0.3), (0.5, 0.2, 0.6)), ((0.7, 0.76, 0.8), (0.86, 0.5, 0.4), (0.6, 0.66, 0.7))])
        for _ in range(160):                                             # el género, a puntos
            c, f = random.randrange(x0 + 12, x0 + 114), random.randrange(64, 112)
            a[f:f + 4, c:c + 4] = random.choice(colores)
        a[10:26, x0 + 14:x0 + 114] = random.choice(((0.1, 0.3, 0.2), (0.5, 0.1, 0.08), (0.1, 0.16, 0.36)))
        for c in range(x0 + 20, x0 + 108, 9):
            a[14:22, c:c + 5] = (0.92, 0.9, 0.82)
        a[:, x0:x0 + 8] = (0.2, 0.34, 0.26); a[:, x0 + 120:x0 + 128] = (0.2, 0.34, 0.26)   # las columnas, verde mercado
    a[118:] = (0.12, 0.1, 0.08)
    return guardar('puestos', np.clip(a, 0, 1), 90)

def tex_rotulo ():
    """El rótulo del tejado: PUBLIC / MARKET en rojo neón sobre su celosía. Sin luz."""
    W, Hh = 512, 192
    a = lienzo(Hh, W, (0.04, 0.035, 0.04))
    a[::16] = (0.1, 0.09, 0.09); a[:, ::16] = (0.1, 0.09, 0.09)          # la celosía de acero
    rojo = (1.0, 0.14, 0.08)
    escribir(a, 'PUBLIC', 152, 20, 9, rojo)
    escribir(a, 'MARKET', 152, 96, 9, rojo)
    yy, xx = np.mgrid[0:Hh, 0:W]
    d = np.hypot(xx - 76, yy - 96)
    a[d < 62] = (0.95, 0.9, 0.78)                                        # el reloj
    a[(d > 56) & (d < 64)] = rojo
    for k in range(12):
        ang = 2 * math.pi * k / 12
        c, f = int(76 + 48 * math.sin(ang)), int(96 - 48 * math.cos(ang))
        a[f - 3:f + 3, c - 3:c + 3] = (0.1, 0.08, 0.08)
    a[58:98, 74:78] = (0.1, 0.08, 0.08); a[94:98, 74:108] = (0.1, 0.08, 0.08)   # las diez y diez… las tres menos algo: da igual, lleva parado desde la guerra
    return guardar('rotulo-mercado', np.clip(a, 0, 1), 92)

PISTA = material('pista', tex_pista(), rug=0.5)
LADRILLO_S = material('ladrillo-suelo', de_polyhaven('red_brick', 512, 0x6e443c, 0.6), rug=0.6)
ACERA = material('acera', de_polyhaven('concrete_floor_worn_001', 512, 0x84868a, 0.5), rug=0.8)
LADRILLO = material('ladrillo', de_polyhaven('red_brick', 512, 0x9a5c4c, 0.7), rug=0.95)
PUESTOS = material('puestos', tex_puestos(), rug=0.8)
ROTULO = material('rotulo-mercado', tex_rotulo(), rug=0.8)
CREMA = material('f-mercado', tex_crema('mercado', (0.8, 0.76, 0.64), balcon=0.0))
ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x55565a, 0.6), rug=0.8)
BAHIA = material('bahia', color=(0.34, 0.4, 0.44), rug=0.2)                           # Elliott Bay bajo la lluvia (sin luz)
AZOTEA = material('azotea', tex_azotea((0.36, 0.36, 0.38)))
# OJO: los colores lisos van en LINEAL.
VERDE_M = material('verde-mercado', color=(0.04, 0.14, 0.09), rug=0.7)
ACERO = material('acero', color=(0.2, 0.2, 0.22), rug=0.5)
MADERA = material('madera', color=(0.1, 0.07, 0.05), rug=0.9)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
GOMA = material('goma', color=(0.012, 0.012, 0.014), rug=0.9)
BLANCO = material('blanco', color=(0.7, 0.7, 0.68), rug=0.6)
TOLDOS = [material(f'toldo-{i}', color=c, rug=0.9) for i, c in enumerate([(0.04, 0.16, 0.1), (0.3, 0.04, 0.03), (0.05, 0.1, 0.24), (0.3, 0.2, 0.05)])]
NEON = [material(f'brillo-neon-{i}', color=c, emite=1.8) for i, c in enumerate([(1.0, 0.14, 0.08), (0.2, 0.7, 1.0), (1.0, 0.7, 0.2), (0.3, 1.0, 0.5)])]
FAROL = material('brillo-farola', color=(1.0, 0.86, 0.6), emite=2.2)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.12, 0.05), (0.07, 0.15, 0.06)])]
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
MONTE_L = material('monte-lejos', color=(0.3, 0.35, 0.38), rug=1.0)
FACHADAS = [material(f'f-seattle-{i}', tex_ladrillo(f'seattle-{i}', c)) for i, c in enumerate([(0.5, 0.26, 0.2), (0.42, 0.24, 0.2), (0.56, 0.4, 0.3)])] + \
    [material('f-seattle-c', tex_crema('seattle-c', (0.74, 0.72, 0.66), balcon=0.0))]
TORRES = [material('t-vidrio-0', tex_vidrio('se-0', (0.26, 0.34, 0.4))), material('t-vidrio-1', tex_vidrio('se-1', (0.2, 0.26, 0.3))), material('t-oficina-0', tex_oficina('se-of', (0.5, 0.5, 0.5), (0.14, 0.2, 0.24)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.74, 0.76, 0.76)), (0.08, (0.64, 0.68, 0.7)), (0.3, (0.48, 0.52, 0.58)), (1.0, (0.3, 0.34, 0.42))],
    (SOL[0], SOL[2]), 0.4, (0.2, 0.18, 0.14), ((0.8, 0.8, 0.78), (0.4, 0.42, 0.46)), cuanta_nube=0.7), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA CALLE Y SUS LADOS
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z_ATRAS = 200.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LADRILLO_S, PX0, PX1, ZM, PZ0, 0.0, 2.4)
suelo('GN', LADRILLO_S, PX0, PX1, PZ1, Z_ATRAS, 0.0, 2.4)
for s in (-1, 1):
    x0, x1 = min(s * 9.2, s * FX), max(s * 9.2, s * FX)
    viga('P', ACERA, x0, x1, ZM, 30.0, 0.0, 0.16, u_m=2.4, techo=ACERA)
    suelo('GN', ACERA, x0, x1, 30.0, Z_ATRAS, 0.16, 2.4)

def casa (grupo, s, z0, z1, plantas):
    """Una casa de ladrillo de la calle: los bajos con su escaparate encendido y su toldo, y los pisos encima."""
    x0, x1 = (FX, FX + 14.0) if s > 0 else (-FX - 14.0, -FX)
    alto = 4.0 + plantas * 3.4
    cara_x = FX * s
    cara('EP' if grupo == 'E' else 'CP', PUESTOS, [P(cara_x, z1 if s > 0 else z0, 0.2), P(cara_x, z0 if s > 0 else z1, 0.2), P(cara_x, z0 if s > 0 else z1, 3.8), P(cara_x, z1 if s > 0 else z0, 3.8)],
         uvs=[(0, 0), (round(abs(z1 - z0) / 12.0) or 1, 0), (round(abs(z1 - z0) / 12.0) or 1, 1), (0, 1)], hacia=V((-s, 0, 0)))
    caja(grupo, random.choice(FACHADAS), x0, x1, z0, z1, 3.8, alto, techo=AZOTEA)
    caja(grupo, FACHADAS[0], x0 + (0.3 if s > 0 else 0.0), x1 - (0.0 if s > 0 else 0.3), z0, z1, 0.0, 3.8, baldosa=6.0)
    toldo = random.choice(TOLDOS)
    cara('EV' if grupo == 'E' else 'T', toldo, [P(cara_x, z0 + 0.6, 3.7), P(cara_x, z1 - 0.6, 3.7), P(cara_x - s * 2.2, z1 - 0.6, 3.0), P(cara_x - s * 2.2, z0 + 0.6, 3.0)], hacia=ARRIBA)
    if grupo == 'E' and random.random() < 0.7:                                       # un rótulo de neón en banderola
        zc = (z0 + z1) / 2
        cubo('EP', random.choice(NEON), P(cara_x - s * 0.9, zc, 5.6), (1.6, 0.14, 2.2))
for s in (-1, 1):
    z = 60.0
    while z > ZM + 2.0:
        largo = random.choice((14.0, 18.0, 24.0))
        z1 = max(ZM + 2.0, z - largo)
        casa('E' if z1 > -72 and z < 40 else 'C', s, z1, z - 0.4, random.choice((2, 3, 3, 4)))
        z = z1
def farola (x, z):
    """La farola de globos del mercado: tres bolas encendidas."""
    barra('EV', VERDE_M, P(x, z, 0.16), P(x, z, 4.2), 0.14)
    for dx, dz, dy in ((0, 0, 0.5), (0.4, 0, 0.1), (-0.4, 0, 0.1)):
        copa('EP', FAROL, x + dx, z + dz, 4.2 + dy, 0.22, 0.26, sub=1, baila=0.0)
for z in np.arange(4.0, -62.0, -13.0):
    farola(-9.9, float(z))
    if abs(z - BASE[1]) > 9.0:
        farola(9.9, float(z))
for z in (-4.0, -30.0, -56.0):                                                       # postes de la luz, con sus cables
    barra('EV', MADERA, P(-FX + 0.6, z, 0.16), P(-FX + 0.6, z, 9.5), 0.22)
    barra('EV', MADERA, P(-FX + 0.6 - 1.1, z, 8.8), P(-FX + 0.6 + 1.1, z, 8.8), 0.12)
for dx in (-1.0, 1.0):
    barra('EV', NEGRO, P(-FX + 0.6 + dx, -4.0, 8.9), P(-FX + 0.6 + dx, -56.0, 8.9), 0.04)
def furgoneta (x, z):
    caja('EV', BLANCO, x - 1.0, x + 1.0, z - 2.6, z + 2.6, 0.5, 2.6, baldosa=4)
    cubo('EV', VIDRIO, P(x, z + 2.62, 1.9), (1.7, 0.06, 0.8))
    for zr in (z - 1.7, z + 1.7):
        for s in (-1, 1):
            cubo('EV', GOMA, P(x + s * 0.92, zr, 0.4), (0.26, 0.76, 0.76))
furgoneta(-11.6, -18.0); furgoneta(11.6, -8.0); furgoneta(-11.8, -46.0)
for x, z in ((10.8, -24.0), (-10.6, -30.0), (11.0, -60.0)):                          # cajas de fruta apiladas
    for k in range(3):
        cubo('EV', MADERA, P(x + random.uniform(-0.3, 0.3), z + random.uniform(-0.3, 0.3), 0.36 + k * 0.4), (0.8, 0.6, 0.38), random.uniform(0, 0.6))
# El ruedo de la base alien, en la acera de la derecha.
torno('P', ACERA, en(BASE[0], BASE[1]), [(5.2, 0.0), (5.2, 0.34), (4.8, 0.34)], lados=28, u_rep=10, v_m=1.5, tapas=(False, True))
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.37) for r, a_ in ((4.6, a0), (4.6, a1), (4.4, a1), (4.4, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. EL MERCADO
# ==================================================================================
def pano (x0, x1, y0, y1, mat, u1, grupo='EP'):
    cara(grupo, mat, [P(x0, ZM, y0), P(x1, ZM, y0), P(x1, ZM, y1), P(x0, ZM, y1)], uvs=[(0, 0), (u1, 0), (u1, 1), (0, 1)], hacia=V((0, -1, 0)))
pano(-MM, -BOCA, 0.0, H1, PUESTOS, round((MM - BOCA) / 12.0 * 2) / 2)               # la galería, a los lados de la boca
pano(BOCA, MM, 0.0, H1, PUESTOS, round((MM - BOCA) / 12.0 * 2) / 2)
viga('P', CREMA, -MM, MM, ZM - FONDO_M, ZM - 0.02, H1, H2, u_m=12.0, techo=AZOTEA)    # el piso de arriba
for s in (-1, 1):
    caja('P', LADRILLO, min(s * BOCA, s * MM), max(s * BOCA, s * MM), ZM - FONDO_M, ZM - 0.04, 0.0, H1, baldosa=6.0)
    barra('EV', VERDE_M, P(s * BOCA, ZM + 0.1, 0.0), P(s * BOCA, ZM + 0.1, H1), 0.4)   # las columnas de la boca
# La marquesina verde, corrida, y la cornisa.
cara('EV', VERDE_M, [P(-MM, ZM, H1 + 0.2), P(MM, ZM, H1 + 0.2), P(MM, ZM + 3.0, H1 - 0.3), P(-MM, ZM + 3.0, H1 - 0.3)], hacia=ARRIBA)
cara('EV', VERDE_M, [P(-MM, ZM + 3.0, H1 - 0.3), P(MM, ZM + 3.0, H1 - 0.3), P(MM, ZM + 3.0, H1 - 0.7), P(-MM, ZM + 3.0, H1 - 0.7)], hacia=V((0, -1, 0)))
for x in np.arange(-MM + 2.0, MM, 5.0):
    if abs(x) > BOCA + 0.4:
        barra('EV', VERDE_M, P(float(x), ZM + 2.9, 0.16), P(float(x), ZM + 2.9, H1 - 0.4), 0.16)
viga('P', CREMA, -MM - 0.3, MM + 0.3, ZM - 0.3, ZM + 0.2, H2, H2 + 0.4, u_m=12.0, techo=AZOTEA)
# Dentro de la boca: a oscuras, con la escalera que baja al puerto.
for s in (-1, 1):
    cara('EP', NEGRO, [P(s * BOCA, ZM, 0.0), P(s * BOCA, ZM - 9.0, 0.0), P(s * BOCA, ZM - 9.0, H1), P(s * BOCA, ZM, H1)], hacia=V((-s, 0, 0)))
cara('EP', NEGRO, [P(-BOCA, ZM - 9.0, 0.0), P(BOCA, ZM - 9.0, 0.0), P(BOCA, ZM - 9.0, H1), P(-BOCA, ZM - 9.0, H1)], hacia=V((0, -1, 0)))
cara('EP', NEGRO, [P(-BOCA, ZM, H1), P(BOCA, ZM, H1), P(BOCA, ZM - 9.0, H1), P(-BOCA, ZM - 9.0, H1)], hacia=V((0, 0, -1)))
cara('EP', NEGRO, [P(-BOCA, ZM, 0.01), P(BOCA, ZM, 0.01), P(BOCA, ZM - 9.0, 0.01), P(-BOCA, ZM - 9.0, 0.01)], hacia=ARRIBA)
for x, y, r in ((-1.6, 1.0, 0.4), (0.9, 2.1, 0.3), (0.2, 0.6, 0.22), (2.0, 1.4, 0.26), (-0.6, 2.8, 0.18)):
    cara('EP', BRILLO_HONDO if r > 0.3 else VERDE, [P(x + r * math.cos(a_), ZM - 8.96, y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(7):
    x = -2.4 + k * 0.8
    barra('EV', RESINA, P(x, ZM - 1.0, 0.05), P(x * 2.0 + random.uniform(-0.3, 0.3), ZM + random.uniform(3.0, 7.0), 0.04), 0.22)
# El rótulo del tejado, en su armazón, con el reloj.
RX0, RX1, RY0, RY1 = -7.6, 7.6, H2 + 0.5, H2 + 6.2
for dz, d in ((0.0, 1), (-0.5, -1)):
    cara('EP', ROTULO, [P(RX0 if d > 0 else RX1, ZM - 1.0 + dz, RY0), P(RX1 if d > 0 else RX0, ZM - 1.0 + dz, RY0), P(RX1 if d > 0 else RX0, ZM - 1.0 + dz, RY1), P(RX0 if d > 0 else RX1, ZM - 1.0 + dz, RY1)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))
for x in (RX0, -2.8, 2.8, RX1):
    barra('EV', ACERO, P(x, ZM - 1.25, H2 + 0.4), P(x, ZM - 1.25, RY1), 0.2)
    barra('EV', ACERO, P(x, ZM - 1.25, RY1 - 1.0), P(x, ZM - 5.0, H2 + 0.4), 0.14)
print('MERCADO', RY1, 'm con el rótulo; boca de', 2 * BOCA)

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'), z_lejos=-64.5)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: LA BAHÍA, LA NORIA, LA SPACE NEEDLE Y EL CENTRO
# ==================================================================================
Z_AGUA = ZM - 60.0                                                                   # de aquí en adelante, Elliott Bay
suelo('G', ASFALTO, -1500.0, 1500.0, Z_AGUA, ZM - FONDO_M, -6.0, 6.0)                 # el viaducto y los muelles, más abajo
suelo('G', ASFALTO, -1500.0, -FX - 14.0, ZM - FONDO_M, 1500.0, 0.0, 6.0)
suelo('G', ASFALTO, FX + 14.0, 1500.0, ZM - FONDO_M, 1500.0, 0.0, 6.0)
suelo('G', ASFALTO, -FX - 14.0, FX + 14.0, Z_ATRAS, 1500.0, 0.0, 6.0)
rect('CP', BAHIA, -3200.0, 3200.0, -3200.0, Z_AGUA, -8.0, 200.0)
for x in np.arange(-500.0, 500.0, 90.0):                                             # los muelles con sus naves
    caja('T', FACHADAS[3], float(x), float(x) + 28.0, Z_AGUA - 110.0, Z_AGUA + 6.0, -8.0, 4.0, techo=AZOTEA)
# La gran noria, al borde del agua.
NX, NZ, NR = -90.0, Z_AGUA - 120.0, 26.0
for i in range(24):
    a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
    barra('CP', NEON[1], P(NX + NR * math.cos(a0), NZ, 24.0 + NR * math.sin(a0)), P(NX + NR * math.cos(a1), NZ, 24.0 + NR * math.sin(a1)), 0.8)
    if i % 2 == 0:
        barra('T', BLANCO, P(NX, NZ, 24.0), P(NX + NR * math.cos(a0), NZ, 24.0 + NR * math.sin(a0)), 0.3)
for s in (-1, 1):
    barra('T', BLANCO, P(NX + s * 10.0, NZ, -8.0), P(NX, NZ, 24.0), 1.0)
# La Space Needle: las tres patas, el platillo y la aguja.
SX, SZ = 420.0, -380.0
for k in range(3):
    a_ = 2 * math.pi * k / 3
    barra('T', BLANCO, P(SX + 16.0 * math.cos(a_), SZ + 16.0 * math.sin(a_), 0.0), P(SX + 3.0 * math.cos(a_), SZ + 3.0 * math.sin(a_), 100.0), 3.0)
    barra('T', BLANCO, P(SX + 3.0 * math.cos(a_), SZ + 3.0 * math.sin(a_), 100.0), P(SX + 9.0 * math.cos(a_), SZ + 9.0 * math.sin(a_), 150.0), 2.6)
torno('T', BLANCO, en(SX, SZ, 148.0), [(9.0, 0.0), (20.0, 5.0), (21.0, 8.0), (12.0, 12.0), (5.0, 15.0), (1.0, 18.0), (0.4, 36.0)], lados=18, tapas=(True, False))
torno('CP', NEON[2], en(SX, SZ, 153.0), [(20.6, 0.0), (21.2, 2.6)], lados=18, tapas=(False, False))
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 44.0):
    for gz in np.arange(ZM - 10.0, 1250.0, 44.0):
        cx, cz = gx + 22 + random.uniform(-5, 5), gz + 22 + random.uniform(-5, 5)
        if (abs(cx) < FX + 30.0 and cz < Z_ATRAS + 20.0) or random.random() < 0.2:
            continue
        a = random.uniform(11.0, 16.0)
        centro = cx < -120.0 and cz > 60.0                                           # el centro, con sus torres, al sur
        if centro and random.random() < 0.5:
            caja('T', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, random.uniform(80.0, 240.0), techo=AZOTEA, baldosa=17.0)
        else:
            caja('T', random.choice(FACHADAS), cx - a, cx + a, cz - a, cz + a, 0.0, random.choice([10, 14, 18, 24]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for cx, cz, radio, alto in ((-800.0, -2600.0, 1300.0, 220.0), (900.0, -2500.0, 1100.0, 160.0)):   # las Olímpicas, al otro lado del agua
    monte('T', MONTE_L, cx, cz, radio, alto, y0=-8.0, seg=18, anillos=4, pico=0.9)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-seattle', ['P', 'E', 'GN', 'EV', 'EP']), ('lugar-seattle-ciudad', ['C', 'G', 'T', 'CP'])],
    # Lluvia: casi todo es cielo gris, y un sol blanco, flojo y muy ancho (sombras blandas).
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.88), sol_fuerza=3.0, sol_ancho=20.0, cielo_fuerza=0.18, cielo_altura=40, cielo_giro=150,
    escala=0.95, satura=0.45, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
