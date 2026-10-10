# Anchorage: la carretera de Seward, junto a la ensenada de Turnagain (10/10/2026).
#   blender -b -P herramientas/blender/lugar_anchorage.py              (entero)
#   blender -b -P herramientas/blender/lugar_anchorage.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_anchorage.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Alaska no es un edificio: es la carretera entre el agua y la montaña.
# Se conserva el sitio de la misión (la Seward Highway en la ensenada), ahora en
# Blender; los alienz EN NAVE; con el SOL DE MEDIANOCHE, bajo y dorado.
#
# Cómo está puesto. Se mira ensenada adentro:
#   · la calzada, con su doble raya amarilla y la escarcha;
#   · a la izquierda, el quitamiedos, la escollera y el agua con los hielos a la
#     deriva; a la derecha, los tótems, la vía con el tren del Alaska Railroad
#     parado (azul y amarillo) y la ladera de abetos;
#   · al fondo, y alrededor en la llegada, las montañas nevadas cayendo al agua.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.5, 0.26, 0.82)                 # el sol de medianoche: muy bajo, a la espalda y a la izquierda (sobre el agua)
iniciar('anchorage', 3625, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.3, 0.22, 0.14))

AGUA = -3.2
QUITA = 9.5                              # el quitamiedos, a la izquierda
VIA = 12.6                               # el eje de la vía, a la derecha
LADERA = 16.0                            # donde empieza a subir el monte
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
    """La carretera: asfalto viejo y agrietado por las heladas, la doble raya amarilla,
    las blancas del arcén, gravilla en los bordes y escarcha en lo que no pisa nadie."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('asphalt_02', 256, 0x8a8782, 0.6))
    a *= (0.88 + 0.22 * nube(PH_, PW, 18, 5))[..., None]
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    grava = tejar(foto('gravel_stones', 256, 0xa39a8c, 0.5))
    borde = np.clip((np.abs(xs) - 7.4) / 0.5 + 0.6 * (nube(PH_, PW, 60, 4) - 0.5), 0, 1)[..., None]
    a = a * (1 - borde) + grava * borde
    gasta = np.clip(nube(PH_, PW, 60, 6) * 1.5, 0.3, 1)[..., None]
    for x, color in ((-0.2, (0.85, 0.62, 0.1)), (0.2, (0.85, 0.62, 0.1)), (-6.9, (0.84, 0.84, 0.8)), (6.9, (0.84, 0.84, 0.8))):
        (c, _) = a_px(x, 0)
        a[:, c:c + 3] = a[:, c:c + 3] * (1 - gasta[:, c:c + 3]) + np.array(color, np.float32) * gasta[:, c:c + 3]
    for _ in range(90):                                                  # las grietas de la helada, selladas con brea
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(40, 200)):
            ang += random.uniform(-0.3, 0.3)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 2 and 1 <= fi < PH_ - 1:
                a[fi, ci:ci + 2] *= 0.5
    escarcha = np.clip((nube(PH_, PW, 26, 7) + 0.3 * np.clip((np.abs(xs) - 4.0) / 5.0, 0, 1) - 0.66) / 0.3, 0, 1)[..., None]
    a = a * (1 - 0.34 * escarcha) + np.array((0.86, 0.9, 0.94), np.float32) * 0.34 * escarcha
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.2, -14.0, 1.5), (4.6, -33.0, 1.6), (-1.2, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_ensenada ():
    """El agua de la ensenada con el sol bajo: gris acero con una calle de oro. Va sin luz."""
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    b = np.sin(yy / 4.0 + 2.0 * np.sin(xx / 21.0)) * 0.5 + 0.5
    a = np.stack([0.38 + 0.03 * b, 0.42 + 0.03 * b, 0.5 + 0.03 * b], axis=-1)                  # casi liso: a rayas fuertes parecía una cebra
    a += (np.clip(b - 0.9, 0, 1) * 3.0)[..., None] * np.array((0.9, 0.6, 0.26))
    return guardar('ensenada', np.clip(a, 0, 1), 88)

def tex_vagon (base, raya):
    """El costado de un coche del Alaska Railroad: azul con la franja amarilla y las ventanas."""
    a = lienzo(128, 256, base) + ruido(128, 256, 0.04)[..., None]
    a[56:72] = raya
    for c in range(14, 244, 38):
        a[20:50, c:c + 28] = np.array((0.1, 0.13, 0.16)) + np.linspace(0.3, 0.0, 30, dtype=np.float32)[:, None, None] * np.array((1.0, 0.7, 0.4))
    a[112:] *= 0.5
    return guardar(f'vagon-{int(base[2] * 100)}', np.clip(a, 0, 1), 88)

def tex_totem ():
    """Un tótem: caras apiladas, en rojo, negro y turquesa sobre el cedro."""
    a = np.tile(foto('plywood', 64, 0x9a6a44, 0.6), (4, 1, 1))
    for k in range(4):
        y0 = k * 64
        a[y0 + 6:y0 + 10] = (0.06, 0.05, 0.05)
        for cx in (18, 46):                                              # los ojos
            a[y0 + 16:y0 + 30, cx - 9:cx + 9] = (0.06, 0.05, 0.05)
            a[y0 + 19:y0 + 27, cx - 6:cx + 6] = (0.86, 0.84, 0.76)
            a[y0 + 21:y0 + 25, cx - 2:cx + 2] = (0.06, 0.05, 0.05)
        a[y0 + 36:y0 + 44, 20:44] = random.choice(((0.6, 0.1, 0.07), (0.08, 0.4, 0.42)))   # el pico o la nariz
        a[y0 + 48:y0 + 56, 10:54] = (0.6, 0.1, 0.07)
        a[y0 + 51:y0 + 53, 12:52] = (0.86, 0.84, 0.76)
    return guardar('totem', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.95)
ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x8a8782, 0.6), rug=0.95)
GRAVA = material('grava', de_polyhaven('gravel_stones', 512, 0xa39a8c, 0.5), rug=1.0)
BALASTO = material('balasto', de_polyhaven('gravel_stones', 512, 0x7c746c, 0.6), rug=1.0)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0x7c7a7a, 0.6), rug=1.0)
MONTE_C = material('ladera-abetos', de_polyhaven('sparse_grass', 512, 0x6a6e4e, 0.5), rug=1.0)
ENSENADA = material('ensenada', tex_ensenada(), rug=0.1)
VAGON = material('vagon', tex_vagon((0.06, 0.14, 0.4), (0.9, 0.66, 0.08)), rug=0.5)
TOTEM = material('totem', tex_totem(), rug=0.9)
# OJO: los colores lisos van en LINEAL.
ACERO = material('acero', color=(0.3, 0.31, 0.33), rug=0.4)
AZUL_T = material('azul-tren', color=(0.02, 0.06, 0.24), rug=0.5)
AMARILLO = material('amarillo', color=(0.8, 0.45, 0.03), rug=0.5)
NEGRO = material('negro', color=(0.012, 0.012, 0.014))
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
MADERA = material('madera', color=(0.14, 0.08, 0.04), rug=0.9)
ROJO_T = material('rojo-totem', color=(0.36, 0.05, 0.03), rug=0.8)
HIELO = material('hielo', color=(0.74, 0.8, 0.86), rug=0.5)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
ABETO = [material(f'abeto-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.07, 0.04), (0.03, 0.09, 0.05), (0.04, 0.1, 0.05)])]
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
NIEVE_M = material('monte-nieve', color=(0.78, 0.76, 0.8), rug=1.0)                   # las cumbres, rosadas por el sol
ROCA_M = material('monte-roca', color=(0.2, 0.2, 0.26), rug=1.0)
FALDA_M = material('monte-falda', color=(0.07, 0.11, 0.09), rug=1.0)
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.8, 0.5)), (0.06, (0.98, 0.72, 0.5)), (0.2, (0.8, 0.68, 0.66)), (0.5, (0.46, 0.56, 0.78)), (1.0, (0.2, 0.32, 0.62))],
    (SOL[0], SOL[2]), 0.07, (0.9, 0.5, 0.14), ((1.0, 0.74, 0.5), (0.74, 0.64, 0.7)), cuanta_nube=0.24), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA CARRETERA, LA ESCOLLERA Y EL AGUA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
Z0, Z1 = -700.0, 420.0                                                              # de dónde a dónde va la costa recta
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', ASFALTO, -7.4, 7.4, Z0, PZ0, 0.0, 4.0)
suelo('GN', ASFALTO, -7.4, 7.4, PZ1, Z1, 0.0, 4.0)
for x0, x1 in ((-QUITA - 0.6, -7.4), (7.4, 10.6)):
    suelo('GN', GRAVA, x0, x1, Z0, PZ0, 0.0, 3.0)
    suelo('GN', GRAVA, x0, x1, PZ1, Z1, 0.0, 3.0)
suelo('GN', GRAVA, -QUITA - 0.6, PX0, PZ0, PZ1, 0.0, 3.0)
suelo('GN', GRAVA, PX1, 10.6, PZ0, PZ1, 0.0, 3.0)
suelo('GN', BALASTO, 10.6, LADERA, Z0, Z1, 0.0, 3.0)                                  # la caja de la vía
rect('EP', ENSENADA, -3200.0, -QUITA - 0.6, -3200.0, 3200.0, AGUA, 60.0)
# El quitamiedos: postes y la banda de acero.
z = 20.0
while z > -76.0:
    barra('EV', MADERA, P(-QUITA, z, 0.0), P(-QUITA, z, 0.8), 0.16)
    z -= 3.8
barra('EV', ACERO, P(-QUITA + 0.1, 20.0, 0.62), P(-QUITA + 0.1, -76.0, 0.62), 0.28)
# La escollera, del arcén al agua, y los hielos a la deriva.
cara('P', ROCA, [P(-QUITA - 0.6, 30.0, 0.0), P(-QUITA - 0.6, -90.0, 0.0), P(-QUITA - 6.0, -90.0, AGUA - 0.3), P(-QUITA - 6.0, 30.0, AGUA - 0.3)], hacia=V((-1, 0, 1)), baldosa=5.0)
for z in np.arange(26.0, -88.0, -2.6):
    bloque('P', ROCA, en(-QUITA - random.uniform(1.4, 5.0), float(z), random.uniform(-2.6, -0.6), random.uniform(0, 3), (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4))),
           (random.uniform(1.0, 2.2), random.uniform(1.0, 2.0), random.uniform(0.8, 1.6)), baldosa=3.0, mella=0.15)
for _ in range(130):
    x, z = -random.uniform(QUITA + 8.0, 500.0), random.uniform(-600.0, 300.0)
    r = random.uniform(1.0, 4.5)
    n = random.randint(5, 7)
    g0 = random.uniform(0, 6.28)
    cara('EV' if x > -60 and -90 < z < 20 else 'T', HIELO, [P(x + r * random.uniform(0.7, 1.0) * math.cos(g0 + 2 * math.pi * i / n), z + r * random.uniform(0.7, 1.0) * math.sin(g0 + 2 * math.pi * i / n), AGUA + 0.12) for i in range(n)], hacia=ARRIBA)

# ==================================================================================
# 3. LA VÍA, EL TREN, LOS TÓTEMS Y LA LADERA
# ==================================================================================
for dx in (-0.72, 0.72):                                                            # los carriles
    barra('EV', ACERO, P(VIA + dx, 30.0, 0.16), P(VIA + dx, -140.0, 0.16), 0.12)
    barra('T', ACERO, P(VIA + dx, Z1, 0.16), P(VIA + dx, 30.0, 0.16), 0.12)
    barra('T', ACERO, P(VIA + dx, -140.0, 0.16), P(VIA + dx, Z0, 0.16), 0.12)
for z in np.arange(28.0, -140.0, -1.6):                                             # las traviesas
    if abs(z - BASE[1]) < 5.6:
        continue
    cubo('EV', MADERA, P(VIA, float(z), 0.05), (2.5, 0.26, 0.14))
def vagon (z0, largo=22.0, loco=False):
    """Un coche (o la locomotora), parado en la vía: caja, techo, bogies."""
    z1 = z0 - largo
    if loco:
        caja('P', AZUL_T, VIA - 1.5, VIA + 1.5, z1, z0, 1.0, 4.4, baldosa=6.0)
        caja('P', AMARILLO, VIA - 1.52, VIA + 1.52, z1 - 0.02, z0 + 0.02, 1.9, 2.5, baldosa=6.0)
        cubo('EV', VIDRIO, P(VIA, z0 + 0.03, 3.6), (2.4, 0.08, 0.9))
        cubo('EV', AMARILLO, P(VIA, z0 + 0.5, 1.2), (3.0, 1.0, 0.5))                 # el quitanieves
    else:
        viga('P', VAGON, VIA - 1.5, VIA + 1.5, z1, z0, 1.0, 4.2, u_m=largo, techo=AZUL_T)
    for zb in (z0 - 3.0, z1 + 3.0):
        cubo('EV', NEGRO, P(VIA, zb, 0.6), (2.4, 3.4, 0.8))
vagon(-56.0, 18.0, loco=True)
vagon(-75.0); vagon(-98.0); vagon(-121.0)
vagon(24.0); vagon(1.0, 20.0)                                                       # y dos coches sueltos, más acá
# Los tótems, junto al arcén.
def totem (x, z, alto=5.6):
    torno('P', TOTEM, en(x, z), [(0.5, 0.0), (0.46, alto)], lados=10, u_rep=2.0, v_m=alto / 1.0, tapas=(False, True))
    cara('EV', ROJO_T, [P(x - 2.0, z, alto * 0.74), P(x + 2.0, z, alto * 0.74), P(x + 1.7, z, alto * 0.74 + 0.9), P(x - 1.7, z, alto * 0.74 + 0.9)], hacia=V((0, -1, 0)))   # las alas del cuervo
    cara('EV', ROJO_T, [P(x - 2.0, z + 0.03, alto * 0.74), P(x - 1.7, z + 0.03, alto * 0.74 + 0.9), P(x + 1.7, z + 0.03, alto * 0.74 + 0.9), P(x + 2.0, z + 0.03, alto * 0.74)], hacia=V((0, 1, 0)))
for z in (-12.0, -27.0):
    totem(9.6, z, random.uniform(5.0, 6.2))
# El ruedo de la base alien: un paso a nivel de tablones, sobre la vía.
TABLONES = material('tablones', de_polyhaven('plywood', 256, 0x7a5a3c, 0.6), rug=0.95)
torno('P', TABLONES, en(BASE[0], BASE[1]), [(5.1, -0.1), (5.1, 0.3), (4.8, 0.3)], lados=28, u_rep=10, v_m=1.5, tapas=(False, True))
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.33) for r, a_ in ((4.6, a0), (4.6, a1), (4.4, a1), (4.4, a0))], hacia=ARRIBA)
# La ladera: sube desde la vía, con sus abetos.
CAE = 0.55
ladera_y = lambda x: max(0.0, (x - LADERA) * CAE)
cara('P', MONTE_C, [P(LADERA, 40.0, 0.0), P(LADERA, -150.0, 0.0), P(120.0, -150.0, ladera_y(120.0)), P(120.0, 40.0, ladera_y(120.0))], hacia=ARRIBA, baldosa=9.0)
cara('P', ROCA, [P(LADERA - 0.2, 40.0, -0.1), P(LADERA - 0.2, -150.0, -0.1), P(LADERA + 1.6, -150.0, 1.0), P(LADERA + 1.6, 40.0, 1.0)], hacia=V((-1, 0, 1)), baldosa=4.0)   # el corte de roca al pie
for _ in range(210):
    x, z = random.uniform(LADERA + 2.0, 112.0), random.uniform(-146.0, 36.0)
    pino('EV' if x < 40.0 and -90.0 < z < 14.0 else 'T', TRONCO, ABETO, x, z, random.uniform(1.2, 2.2), y=ladera_y(x) - 0.3)

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'))

# ==================================================================================
# 4. LAS MONTAÑAS (lo que se ve al fondo y en la llegada)
# ==================================================================================
def montana (cx, cz, radio, alto, y0=0.0):
    """Una montaña de Alaska: la falda de bosque, la roca y la cumbre nevada, una dentro de otra."""
    monte('T', FALDA_M, cx, cz, radio, alto * 0.42, y0=y0, seg=16, anillos=4, pico=0.8)
    monte('T', ROCA_M, cx, cz, radio * 0.78, alto * 0.74, y0=y0, seg=14, anillos=5, pico=1.0)
    monte('T', NIEVE_M, cx, cz, radio * 0.52, alto, y0=y0 + alto * 0.2, seg=12, anillos=5, pico=1.1)
for cx, cz, radio, alto in ((300.0, -260.0, 260.0, 240.0), (220.0, 60.0, 230.0, 200.0), (420.0, -620.0, 340.0, 330.0), (330.0, 380.0, 300.0, 260.0), (160.0, -900.0, 380.0, 300.0),
                            (-900.0, -500.0, 420.0, 360.0), (-1100.0, 200.0, 460.0, 320.0), (-700.0, -1200.0, 520.0, 420.0), (-1300.0, -1100.0, 500.0, 380.0), (-800.0, 900.0, 480.0, 300.0),
                            (-260.0, -1700.0, 600.0, 460.0), (900.0, -1300.0, 560.0, 400.0)):
    montana(cx, cz, radio, alto, y0=AGUA if cx < 0 else 0.0)
suelo('G', GRAVA, LADERA, 1500.0, -1500.0, -150.0, 0.0, 6.0)
suelo('G', GRAVA, LADERA, 1500.0, 40.0, 1500.0, 0.0, 6.0)
suelo('G', GRAVA, 120.0, 1500.0, -150.0, 40.0, 0.0, 6.0)
suelo('G', GRAVA, -QUITA - 0.6, LADERA, -1500.0, Z0, 0.0, 6.0)
suelo('G', GRAVA, -QUITA - 0.6, LADERA, Z1, 1500.0, 0.0, 6.0)

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
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-anchorage', ['P', 'GN', 'EV', 'EP']), ('lugar-anchorage-ciudad', ['G', 'T', 'CP'])],
    # El sol de medianoche: rasante y dorado, como un atardecer que no acaba.
    sol_hacia=SOL, sol_color=(1.0, 0.66, 0.36), sol_fuerza=7.0, sol_ancho=4.0, cielo_fuerza=0.26, cielo_altura=5, cielo_giro=200,
    escala=0.78, satura=1.0, no_alumbran=('CP',), suaves=('monte-nieve', 'monte-roca', 'monte-falda'), fundir=True)
