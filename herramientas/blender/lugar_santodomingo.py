# Santo Domingo: la Plaza de España, ante el Alcázar de Colón, de noche (10/10/2026).
#   blender -b -P herramientas/blender/lugar_santodomingo.py              (entero)
#   blender -b -P herramientas/blender/lugar_santodomingo.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_santodomingo.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). La misión ya era el Alcázar de Colón, y su parte habla del Faro a
# Colón, que «proyecta su cruz de luz» para guiar a las naves: es DE NOCHE. Los
# alienz, EN NAVE.
#
# Cómo está puesto. Se mira al Alcázar desde la plaza:
#   · EL ALCÁZAR VA A 0,8 DE SU TAMAÑO (10 m de alto y 35 de ancho): las dos
#     galerías de cinco arcos, una sobre otra, entre los dos cuerpos macizos,
#     iluminado de abajo arriba; la nave se posa delante;
#   · la plaza de losas de piedra coralina, con sus faroles, la estatua de Ovando
#     a la izquierda y los cañones de la muralla a la derecha; la base alien, en
#     un ruedo;
#   · solo en el vuelo: las Atarazanas con sus terrazas, la muralla, el río Ozama
#     y, al otro lado, el Faro con la cruz de luz en el cielo.
#   · LA LUZ: como en Chongqing, lo que brilla va sin luz y la claridad de los
#     faroles va pintada en el suelo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.3, 0.75, 0.6)                  # la luna
iniciar('santodomingo', 4231, eje=(0.0, -80.0), encendidas=0.3, reflejo=(0.2, 0.16, 0.1))

ZF = -80.0                               # la cara del Alcázar
MA, HA = 17.5, 10.0                      # medio ancho y alto
MG = 7.5                                 # media galería (los cinco arcos)
BASE = (12.6, -44.0)
Z_FAROLES = [float(z) for z in np.arange(6.0, -62.0, -13.0)]

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La plaza: losas grandes de piedra coralina, gastadas. De noche, lo que se ve
    es el charco de cada farol y el resplandor cálido del Alcázar que llega del fondo."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('concrete_floor_worn_001', 256, 0xd2c4a8, 0.5))
    l = 1.4
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + l * KZ))
        c = -(fila % 2) * l * KX / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + l * KX))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.88, 1.08)
                a[f0:f1, c0:c0 + 1] *= 0.62
            c += l * KX
        a[f0:f0 + 1] *= 0.62
        fila += 1; f += l * KZ
    a *= (0.86 + 0.24 * nube(PH_, PW, 16, 4))[..., None]
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    zs = PZ0 + yy / KZ
    cerca = np.clip((6.0 - zs) / 68.0, 0, 1) ** 1.8
    luz = np.zeros((PH_, PW), np.float32)
    for z in Z_FAROLES:
        for s in (-1, 1):
            c, f_ = a_px(s * 8.9, z)
            luz += np.exp(-(((xx - c) / (3.4 * KX)) ** 2 + ((yy - f_) / (3.4 * KZ)) ** 2))
    calida = np.array((1.0, 0.72, 0.4), np.float32)
    a = a * (0.4 + (0.4 * cerca + 0.6 * np.clip(luz, 0, 1))[..., None] * calida)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.0, -16.0, 1.5), (4.6, -35.0, 1.6), (-1.4, -53.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_alcazar ():
    """La fachada entera (35 × 10 m), iluminada de abajo arriba: los dos cuerpos
    macizos con sus ventanas pequeñas y, en medio, las dos galerías de cinco arcos. Sin luz."""
    W, Hh = 1024, 320
    a = np.tile(foto('yellow_stone_wall', 128, 0xd8bc8c, 0.5), (3, 8, 1))[:Hh]
    for f in range(0, Hh, 20):                                           # las hiladas de sillar
        a[f:f + 1] *= 0.7
        for c in range((f // 20 % 2) * 22, W, 44):
            a[f:f + 20, c:c + 1] *= 0.78
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    foco = 0.5 + 0.7 * (yy / Hh) ** 1.4                                   # los focos, desde el suelo: más luz abajo
    a *= foco[..., None] * np.array((1.0, 0.86, 0.62), np.float32)
    fx = lambda x: (x + MA) / (2 * MA) * W
    fy = lambda y: (1 - y / HA) * Hh
    oscuro = np.array((0.1, 0.07, 0.05), np.float32)
    for piso, (y0, y1) in enumerate(((0.4, 4.2), (5.2, 8.8))):            # las dos galerías
        paso = 2 * MG / 5
        for k in range(5):
            cx = fx(-MG + paso * (k + 0.5))
            medio = (fx(paso) - fx(0)) * 0.36
            arco = ((np.abs(xx - cx) < medio) & (yy <= fy(y0)) & (yy >= fy(y1 - 1.0))) | ((((xx - cx) / medio) ** 2 + ((yy - fy(y1 - 1.0)) / (fy(y1 - 1.0) - fy(y1))) ** 2 < 1) & (yy <= fy(y1 - 1.0)))
            dentro = oscuro + np.array((0.5, 0.3, 0.1), np.float32) * np.clip(1 - np.abs(yy - fy(y0 + 1.2)) / 60.0, 0, 1)[..., None] * (0.5 if piso else 0.3)
            a[arco] = dentro[arco]
        if piso:                                                         # la balaustrada del piso alto
            a[int(fy(y0 + 0.9)):int(fy(y0)), int(fx(-MG)):int(fx(MG))] *= 0.8
    for s in (-1, 1):                                                    # las ventanas de los cuerpos macizos
        for x, y in ((11.0, 2.2), (14.6, 2.2), (11.0, 6.6), (14.6, 6.6), (12.8, 6.6)):
            c, f = int(fx(s * x)), int(fy(y))
            a[f - 12:f + 12, c - 7:c + 7] = oscuro
            a[f - 14:f - 12, c - 9:c + 9] *= 1.2
    a[:8] = np.clip(a[:8] * 1.2, 0, 1); a[8:12] *= 0.6                    # la cornisa
    return guardar('alcazar', np.clip(a, 0, 1), 90)

def tex_rio ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    b = np.sin(yy / 4.0 + 2.0 * np.sin(xx / 19.0)) * 0.5 + 0.5
    a = np.stack([0.02 + 0.03 * b, 0.03 + 0.04 * b, 0.06 + 0.06 * b], axis=-1)
    for _ in range(14):
        c, f = random.randrange(8, W - 8), random.randrange(0, Hh - 60)
        largo = random.randint(20, 50)
        a[f:f + largo, c:c + 2] += 0.6 * np.array(random.choice(((0.8, 0.5, 0.14), (0.7, 0.8, 1.0))), np.float32) * np.linspace(1, 0, largo, dtype=np.float32)[:, None, None]
    return guardar('rio-ozama', np.clip(a, 0, 1), 88)

def tex_colonial ():
    """Una casa colonial de noche: muro encalado apenas visible, y las puertas y ventanas con luz. Sin luz."""
    a = lienzo(128, 256, (0.2, 0.17, 0.14)) + ruido(128, 256, 0.02)[..., None]
    for k in range(4):
        cx = k * 64 + 32
        luz = random.random() < 0.6
        a[60:128, cx - 12:cx + 12] = (np.array((1.0, 0.7, 0.34)) * random.uniform(0.6, 1.0)) if luz else (0.05, 0.04, 0.04)
        a[60:128, cx - 1:cx + 1] = (0.1, 0.06, 0.04)
        a[14:40, cx - 8:cx + 8] = (np.array((1.0, 0.7, 0.34)) * random.uniform(0.3, 0.8)) if random.random() < 0.4 else (0.05, 0.04, 0.04)
    a[:6] = (0.3, 0.26, 0.2)
    return guardar('colonial-noche', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.8)
LOSA = material('losa', de_polyhaven('concrete_floor_worn_001', 512, 0x4c463c, 0.5), rug=0.9)
ALCAZAR = material('alcazar', tex_alcazar(), rug=0.9)
CORAL = material('piedra-coral', de_polyhaven('yellow_stone_wall', 512, 0x76684e, 0.5), rug=0.95)
COLONIAL = material('colonial-noche', tex_colonial(), rug=0.9)
RIO = material('rio', tex_rio(), rug=0.1)
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 256, 0x4e3428, 0.8), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.14, 0.13, 0.13)))
# OJO: los colores lisos van en LINEAL.
HIERRO = material('hierro', color=(0.03, 0.03, 0.035), rug=0.5)
BRONCE = material('bronce', color=(0.04, 0.06, 0.05), rug=0.5)
PIEDRA = material('piedra', color=(0.2, 0.17, 0.12), rug=0.9)
FAROL = material('brillo-farol', color=(1.0, 0.72, 0.36), emite=2.6)
FOCO = material('brillo-foco', color=(1.0, 0.86, 0.6), emite=2.4)
HAZ = material('brillo-haz', color=(0.72, 0.84, 1.0), emite=1.2, alfa=0.45)           # los rayos del Faro
CRUZ = material('brillo-cruz', color=(0.86, 0.92, 1.0), emite=1.6, alfa=0.6)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
TELAS = [material(f'tela-{i}', color=c, rug=0.9) for i, c in enumerate([(0.3, 0.05, 0.04), (0.3, 0.26, 0.2), (0.05, 0.12, 0.2)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.06, 0.03), (0.03, 0.08, 0.035)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.05, 0.03), (0.03, 0.07, 0.035)])]
TRONCO = material('tronco', color=(0.05, 0.04, 0.03))
MONTE_L = material('monte-lejos', color=(0.04, 0.05, 0.08), rug=1.0)
TORRES = [material('t-noche-0', tex_oficina('sd-of-0', (0.16, 0.16, 0.2), (0.05, 0.08, 0.14))), material('t-noche-1', tex_vidrio('sd-0', (0.06, 0.09, 0.16)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.2, 0.18, 0.3)), (0.08, (0.12, 0.12, 0.26)), (0.3, (0.05, 0.07, 0.2)), (1.0, (0.015, 0.025, 0.1))],
    (SOL[0], SOL[2]), 0.6, (0.1, 0.1, 0.16), ((0.26, 0.26, 0.36), (0.1, 0.11, 0.2)), cuanta_nube=0.34), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA PLAZA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
PL0, PL1, PLZ0, PLZ1 = -46.0, 40.0, -112.0, 110.0                                    # la plaza: de las Atarazanas (izquierda) a la muralla (derecha)
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSA, PL0, PX0, PLZ0, PLZ1, 0.0, 2.8)
suelo('GN', LOSA, PX1, PL1, PLZ0, PLZ1, 0.0, 2.8)
suelo('GN', LOSA, PX0, PX1, PZ1, PLZ1, 0.0, 2.8)
suelo('GN', LOSA, PX0, PX1, PLZ0, PZ0, 0.0, 2.8)
def farol (x, z, alto=4.6):
    """El farol colonial: fuste de hierro y la linterna de cuatro cristales, encendida."""
    torno('EV', HIERRO, en(x, z), [(0.22, 0.0), (0.16, 0.5), (0.07, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    cubo('EP', FAROL, P(x, z, alto + 0.3), (0.36, 0.36, 0.5))
    torno('EV', HIERRO, en(x, z, alto + 0.55), [(0.3, 0.0), (0.0, 0.3)], lados=4, tapas=(False, False))
for z in Z_FAROLES:
    farol(-9.5, z)
    if abs(z - BASE[1]) > 9.0:
        farol(9.5, z)
# La estatua de Nicolás de Ovando, a la izquierda.
OX, OZ = -15.0, -34.0
viga('P', CORAL, OX - 1.6, OX + 1.6, OZ - 1.6, OZ + 1.6, 0.0, 0.5, u_m=2.0, techo=CORAL)
viga('P', CORAL, OX - 1.0, OX + 1.0, OZ - 1.0, OZ + 1.0, 0.5, 3.0, u_m=2.0, techo=CORAL)
elipsoide('EV', BRONCE, en(OX, OZ, 4.1), (0.42, 0.36, 1.1))
elipsoide('EV', BRONCE, en(OX, OZ, 5.36), (0.2, 0.2, 0.24))
cubo('EP', FOCO, P(OX, OZ + 2.2, 0.16), (0.4, 0.3, 0.2))
# La muralla, a la derecha, con sus cañones mirando al río.
MX = 26.0
z = 30.0
while z > -76.0:
    z1 = max(-76.0, z - 22.0)
    caja('P', CORAL, MX, MX + 2.4, z1 + 0.2, z - 0.2, 0.0, 1.5, techo=CORAL, baldosa=3.0)
    z = z1
for z in (-8.0, -22.0, -62.0):
    bloque('EV', PIEDRA, en(MX - 1.4, z, 0.0), (1.0, 1.4, 0.6), mella=0.02)
    barra('EV', BRONCE, P(MX - 2.0, z, 0.9), P(MX + 0.6, z, 1.2), 0.36)
for z in (-14.0, -52.0, 4.0):
    palmera('EV', TRONCO, PALMA, 18.0, z, alto=8.0)
# El ruedo de la base alien.
torno('P', CORAL, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.34), (4.8, 0.34), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(LOSA), rug=0.9)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.08) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. EL ALCÁZAR DE COLÓN
# ==================================================================================
FONDO_A = 12.0
cara('EP', ALCAZAR, [P(-MA, ZF, 0.0), P(MA, ZF, 0.0), P(MA, ZF, HA), P(-MA, ZF, HA)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
caja('P', CORAL, -MA, MA, ZF - FONDO_A, ZF - 0.05, 0.0, HA, techo=AZOTEA, baldosa=4.0)
for s in (-1, 1):                                                                    # los dos cuerpos macizos sobresalen un poco de las galerías
    viga('P', CORAL, min(s * MG, s * MA), max(s * MG, s * MA), ZF, ZF + 0.6, 0.0, 0.5, u_m=2.0, techo=CORAL)
viga('P', CORAL, -MG - 0.4, MG + 0.4, ZF, ZF + 1.6, 0.0, 0.4, u_m=2.0, techo=CORAL)   # la grada de la galería
for k in range(6):                                                                   # las columnas de las dos galerías, de bulto
    x = -MG + 2 * MG / 5 * k
    for y0, y1 in ((0.4, 3.2), (5.2, 7.8)):
        barra('EV', PIEDRA, P(x, ZF + 0.3, y0), P(x, ZF + 0.3, y1), 0.34)
for x in np.arange(-MA + 2.0, MA, 4.0):                                              # los focos que lo alumbran, en el suelo
    cubo('EP', FOCO, P(float(x), ZF + 3.0, 0.14), (0.5, 0.3, 0.2))
print('ALCÁZAR', HA, 'm de alto;', 2 * MA, 'de ancho')

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'))

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: LAS ATARAZANAS, EL RÍO Y EL FARO CON SU CRUZ
# ==================================================================================
def casa (x0, x1, z0, z1, alto, hacia_x):
    caja('T', CORAL, x0, x1, z0, z1, 0.0, alto, techo=AZOTEA, baldosa=4.0)
    x = x1 if hacia_x > 0 else x0
    cara('CP', COLONIAL, [P(x + hacia_x * 0.05, z1 if hacia_x > 0 else z0, 0.0), P(x + hacia_x * 0.05, z0 if hacia_x > 0 else z1, 0.0), P(x + hacia_x * 0.05, z0 if hacia_x > 0 else z1, min(alto, 5.0)), P(x + hacia_x * 0.05, z1 if hacia_x > 0 else z0, min(alto, 5.0))],
         uvs=[(0, 0), (max(1, round(abs(z1 - z0) / 10.0)), 0), (max(1, round(abs(z1 - z0) / 10.0)), 1), (0, 1)], hacia=V((hacia_x, 0, 0)))
z = PLZ1
while z > PLZ0:                                                                      # las Atarazanas: la hilera de casas con terraza, a la izquierda
    z1 = max(PLZ0, z - random.choice((12.0, 16.0, 20.0)))
    casa(PL0 - 14.0, PL0, z1 + 0.2, z - 0.2, random.choice((5.0, 6.5, 8.0)), 1)
    if random.random() < 0.7:                                                        # su toldo y su luz
        cara('T', random.choice(TELAS), [P(PL0, z1 + 1.0, 3.2), P(PL0, z - 1.0, 3.2), P(PL0 + 3.0, z - 1.0, 2.6), P(PL0 + 3.0, z1 + 1.0, 2.6)], hacia=ARRIBA)
        cubo('CP', FAROL, P(PL0 + 1.6, (z + z1) / 2, 2.4), (0.3, 0.3, 0.3))
    z = z1
suelo('G', LOSA, -1500.0, PL0, -1500.0, 1500.0, 0.0, 6.0)
suelo('G', LOSA, PL0, PL1, PLZ1, 1500.0, 0.0, 6.0)
suelo('G', LOSA, PL0, PL1, -1500.0, PLZ0, 0.0, 6.0)
RX0, RX1 = PL1 + 14.0, PL1 + 330.0                                                    # el Ozama, a la derecha, bajo la muralla
rect('CP', RIO, RX0, RX1, -3200.0, 3200.0, -8.0, 40.0)
z = -700.0
while z < 700.0:                                                                     # el paredón del río
    caja('T', CORAL, PL1, RX0, z + 0.3, z + 59.7, -9.0, 0.0, techo=LOSA, baldosa=5.0)
    z += 60.0
suelo('G', LOSA, RX1, 1500.0, -1500.0, 1500.0, 0.0, 6.0)
n_ed = 0
for gx in np.arange(-1250.0, PL0 - 20.0, 30.0):                                      # la ciudad colonial, baja, de tejados
    for gz in np.arange(-900.0, 900.0, 30.0):
        if random.random() < 0.22:
            continue
        cx, cz = gx + 15, gz + 15
        a = random.uniform(9.0, 12.0)
        alto = random.choice((5.0, 6.5, 8.0)) if cx > -500.0 else random.choice((12.0, 20.0, 40.0, 70.0))
        if cx > -500.0:
            casa(cx - a, cx + a, cz - a, cz + a, alto, random.choice((-1, 1)))
        else:
            caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, alto, techo=AZOTEA, baldosa=17.0)
        n_ed += 1
for gx in np.arange(RX1 + 20.0, 1250.0, 36.0):                                       # la otra orilla
    for gz in np.arange(-900.0, 900.0, 36.0):
        if random.random() < 0.5 and math.hypot(gx - 760.0, gz + 300.0) > 150.0:
            casa(float(gx), float(gx) + 22.0, float(gz), float(gz) + 22.0, random.choice((5.0, 8.0)), -1)
            n_ed += 1
print('EDIFICIOS', n_ed)
# El Faro a Colón: la mole de hormigón en cruz tumbada, y sus rayos subiendo a pintar la cruz en las nubes.
FX_, FZ_ = 760.0, -300.0
caja('T', CORAL, FX_ - 20.0, FX_ + 20.0, FZ_ - 105.0, FZ_ + 105.0, 0.0, 30.0, baldosa=8.0)
caja('T', CORAL, FX_ - 60.0, FX_ + 60.0, FZ_ + 40.0, FZ_ + 70.0, 0.0, 30.0, baldosa=8.0)
Y_NUBE = 900.0
for dz in np.arange(-100.0, 101.0, 25.0):
    barra('CP', HAZ, P(FX_, FZ_ + dz, 30.0), P(FX_, FZ_ + dz * 3.4, Y_NUBE), 1.6)
for dx in (-50.0, 0.0, 50.0):
    barra('CP', HAZ, P(FX_ + dx, FZ_ + 55.0, 30.0), P(FX_ + dx * 3.4, FZ_ + 55.0 * 3.4, Y_NUBE), 1.6)
barra('CP', CRUZ, P(FX_, FZ_ - 340.0, Y_NUBE), P(FX_, FZ_ + 340.0, Y_NUBE), 9.0)
barra('CP', CRUZ, P(FX_ - 190.0, FZ_ + 187.0, Y_NUBE), P(FX_ + 190.0, FZ_ + 187.0, Y_NUBE), 9.0)
for cx, cz, radio, alto in ((-1900.0, -1900.0, 1000.0, 120.0), (1900.0, 1900.0, 1000.0, 80.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=16, anillos=4, pico=0.7)

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
    exportes=[('lugar-santodomingo', ['P', 'GN', 'EV', 'EP']), ('lugar-santodomingo-ciudad', ['G', 'T', 'CP'])],
    # Noche, la receta de Chongqing: una luna azulada, poco cielo y la escala alta.
    sol_hacia=SOL, sol_color=(0.7, 0.8, 1.0), sol_fuerza=2.4, sol_ancho=6.0, cielo_fuerza=0.12, cielo_altura=30, cielo_giro=150,
    escala=1.5, satura=0.8, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
