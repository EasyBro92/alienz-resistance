# Novosibirsk: encima del Obi helado, en la noche azul de Siberia (10/10/2026).
#   blender -b -P herramientas/blender/lugar_novosibirsk.py              (entero)
#   blender -b -P herramientas/blender/lugar_novosibirsk.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_novosibirsk.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). El parte de la misión ya lo decía: «se curan en el hielo» y «debajo del
# hielo se ven formas quietas». Así que se juega SOBRE EL RÍO HELADO, los alienz
# SALEN DE DEBAJO DEL HIELO por un boquete, y es la NOCHE AZUL del invierno
# siberiano.
#
# Cómo está puesto. Se mira río arriba:
#   · el hielo, con sus grietas, la nieve barrida y, donde está limpio, las formas
#     oscuras de lo que espera debajo;
#   · al fondo, el boquete: una rampa de hielo roto de ±7,6 que baja 3,6 m al agua
#     negra (`hueco` y `entrada`), y detrás los bloques de hielo levantados y el
#     puente de Bugrinski, con su arco rojo, encendido;
#   · a los lados, casetas de pescar en el hielo, una barcaza atrapada a la
#     izquierda y la base alien en un ruedo a la derecha;
#   · solo en el vuelo: el arco entero, las dos orillas y la ciudad con la cúpula
#     de la Ópera.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.3, 0.6, 0.74)                  # la luna, a la espalda y algo a la izquierda
iniciar('novosibirsk', 3524, eje=(0.0, -80.0), encendidas=0.3, reflejo=(0.1, 0.16, 0.3))

ZANJA = 7.6
Z_BOCA, Z_PIE = -64.0, -78.0
HONDO = 3.6
BASE = (12.6, -44.0)
ZP = -104.0                              # el puente
Y_TABLERO = 10.5
ORILLA = 130.0                           # medio río (más estrecho que el de verdad: así las orillas se ven)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_BOCA, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def hielo (h, w, semilla_y=20, semilla_x=6):
    """Hielo de río: azul pálido donde está limpio, blanco donde el viento dejó la nieve."""
    limpio = np.array((0.5, 0.64, 0.78), np.float32) * (0.8 + 0.3 * nube(h, w, semilla_y, semilla_x))[..., None]
    nieve = np.array((0.86, 0.9, 0.95), np.float32) * (0.92 + 0.1 * nube(h, w, semilla_y * 2, semilla_x * 2))[..., None]
    m = np.clip((nube(h, w, semilla_y + 6, semilla_x + 2) - 0.22) / 0.34, 0, 1)[..., None]      # más nieve que hielo limpio: a medias parecía camuflaje
    return limpio * (1 - m) + nieve * m, m[..., 0]

def grietas (a, cuantas, largo=(40, 220)):
    Hh, W = a.shape[:2]
    for _ in range(cuantas):
        c, f = random.uniform(0, W), random.uniform(0, Hh)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(*largo)):
            ang += random.uniform(-0.25, 0.25)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < W - 1 and 1 <= fi < Hh - 1:
                a[fi, ci] = (0.88, 0.94, 0.98)
                a[fi, ci + 1] *= 0.86

def tex_pista ():
    """El hielo donde se juega: grietas blancas, nieve barrida y, bajo el hielo
    limpio, las siluetas oscuras de lo que espera la primavera."""
    a, m = hielo(PH_, PW)
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    for _ in range(26):                                                  # las formas de debajo: bultos alargados, verdosos
        x, z = random.uniform(-8.0, 8.0), random.uniform(PZ0 + 2, PZ1 - 2)
        c, f = a_px(x, z)
        giro = random.uniform(0, 3.14)
        dx, dy = (xx - c) * math.cos(giro) + (yy - f) * math.sin(giro), -(xx - c) * math.sin(giro) + (yy - f) * math.cos(giro)
        d = np.hypot(dx / (random.uniform(0.9, 1.5) * KX), dy / (random.uniform(0.35, 0.55) * KZ))
        forma = np.clip(1 - d, 0, 1) ** 0.7 * (1 - 0.6 * m) * 0.6
        a = a * (1 - forma[..., None]) + np.array((0.03, 0.1, 0.08), np.float32) * forma[..., None]
    grietas(a, 70)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.4, -14.0, 1.5), (-4.8, -33.0, 1.6), (1.6, -52.0, 1.4)):       # la guerra: hielo quemado
        mancha(x, z, r_ * 1.5, 0.7, 1.1)
        mancha(x, z, r_, 0.4)
    for k in range(13):                                                  # las grietas grandes que salen del boquete
        x, z = -7.0 + k * 1.16, PZ0
        ang = math.pi / 2 + random.uniform(-0.6, 0.6)
        for i in range(int(random.uniform(4.0, 16.0) * KZ)):
            ang += random.uniform(-0.1, 0.1)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            c, f_ = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f_ < PH_ - 1:
                a[f_, c - 1:c + 2] = (0.05, 0.12, 0.14)
                a[f_, c + 2] = (0.9, 0.95, 1.0)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_hielo ():
    a, _ = hielo(512, 512, 8, 8)
    grietas(a, 30, (60, 300))
    return guardar('hielo-obi', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.5)
HIELO = material('hielo-obi', tex_hielo(), rug=0.5)
NIEVE = material('nieve', guardar('nieve-sib', np.clip(lienzo(128, 128, (0.86, 0.9, 0.95)) * (0.94 + 0.08 * nube(128, 128, 5, 5))[..., None], 0, 1), 88), rug=1.0)
OXIDO_T = material('casco-oxido', de_polyhaven('rusty_metal_02', 256, 0x8a5a44, 0.6), rug=0.9)
HORMIGON = material('hormigon', de_polyhaven('cracked_concrete_wall', 512, 0x9aa0a8, 0.5), rug=0.95)
AZOTEA = material('azotea', tex_azotea((0.74, 0.8, 0.88)))
# OJO: los colores lisos van en LINEAL.
HIELO_B = material('hielo-bloque', color=(0.4, 0.6, 0.74), rug=0.3)
BLANCO = material('nieve-lisa', color=(0.74, 0.8, 0.88), rug=1.0)
ROJO_P = material('brillo-arco', color=(0.9, 0.1, 0.06), emite=1.4)                  # el arco, iluminado de rojo
LUZ_P = material('brillo-puente', color=(1.0, 0.86, 0.6), emite=2.2)
NEGRO = material('negro', color=(0.004, 0.008, 0.012))
AGUA_N = material('agua-negra', color=(0.01, 0.02, 0.03), rug=0.1)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
AURORA = [material(f'brillo-aurora-{i}', color=c, emite=1.0, alfa=0.5) for i, c in enumerate([(0.16, 0.9, 0.5), (0.2, 0.7, 0.8), (0.5, 0.3, 0.8)])]
CASETAS = [material(f'caseta-{i}', color=c, rug=0.9) for i, c in enumerate([(0.3, 0.05, 0.04), (0.04, 0.14, 0.3), (0.3, 0.24, 0.04), (0.05, 0.2, 0.1)])]
VENTANA = material('brillo-ventana', color=(1.0, 0.7, 0.3), emite=2.0)
HIERRO = material('hierro', color=(0.03, 0.03, 0.04), rug=0.5)
ABETO = [material(f'abeto-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.06, 0.05), (0.03, 0.08, 0.06)])]
TRONCO = material('tronco', color=(0.05, 0.04, 0.04))
ORO = material('brillo-oro', color=(1.0, 0.8, 0.5), emite=1.2)
PLATA = material('plata-cupula', color=(0.46, 0.5, 0.58), rug=0.4)
MONTE_L = material('monte-lejos', color=(0.1, 0.14, 0.24), rug=1.0)
TORRES = [material('t-noche-0', tex_vidrio('nv-0', (0.06, 0.09, 0.18))), material('t-noche-1', tex_oficina('nv-of-0', (0.2, 0.22, 0.28), (0.05, 0.08, 0.14))),
          material('t-noche-2', tex_oficina('nv-of-1', (0.26, 0.24, 0.26), (0.06, 0.08, 0.12)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.36, 0.44, 0.66)), (0.08, (0.2, 0.3, 0.56)), (0.3, (0.07, 0.12, 0.34)), (1.0, (0.02, 0.03, 0.14))],
    (SOL[0], SOL[2]), 0.5, (0.1, 0.12, 0.2), ((0.34, 0.4, 0.56), (0.12, 0.16, 0.3)), cuanta_nube=0.14), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL HIELO, EL BOQUETE Y LO QUE SALE DE ÉL
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GP', HIELO, -ORILLA, PX0, -1500.0, 1500.0, 0.0, 24.0)
suelo('GP', HIELO, PX1, ORILLA, -1500.0, 1500.0, 0.0, 24.0)
suelo('GP', HIELO, PX0, PX1, PZ1, 1500.0, 0.0, 24.0)
suelo('GP', HIELO, PX0, -ZANJA, Z_PIE, Z_BOCA, 0.0, 24.0)
suelo('GP', HIELO, ZANJA, PX1, Z_PIE, Z_BOCA, 0.0, 24.0)
suelo('GP', HIELO, PX0, PX1, -1500.0, Z_PIE, 0.0, 24.0)
Z_TUNEL = Z_PIE - 12.0
cara('P', HIELO, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=ARRIBA)   # la losa de hielo vencida
cara('EP', AGUA_N, [P(-ZANJA, Z_PIE, -HONDO + 0.05), P(ZANJA, Z_PIE, -HONDO + 0.05), P(ZANJA, Z_TUNEL, -HONDO + 0.05), P(-ZANJA, Z_TUNEL, -HONDO + 0.05)], hacia=ARRIBA)
for s in (-1, 1):                                                                    # el canto del hielo roto, con su grosor azul
    cara('P', HIELO, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_TUNEL, -HONDO), P(s * ZANJA, Z_TUNEL, 0.0)], hacia=V((-s, 0, 0)), baldosa=6.0)
cara('EP', NEGRO, [P(-ZANJA, Z_TUNEL + 0.05, -HONDO), P(ZANJA, Z_TUNEL + 0.05, -HONDO), P(ZANJA, Z_TUNEL + 0.05, 0.0), P(-ZANJA, Z_TUNEL + 0.05, 0.0)], hacia=V((0, -1, 0)))
for x, y, r in ((-4.6, 1.0, 0.5), (-1.8, 2.2, 0.38), (1.2, 1.2, 0.6), (4.2, 2.4, 0.42), (0.2, 0.6, 0.3), (6.2, 0.9, 0.36)):
    cara('EP', BRILLO_HONDO if r > 0.4 else VERDE, [P(x + r * math.cos(a_), Z_TUNEL + 0.08, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
def bloques_hielo (x0, x1, z0, z1, cuantos, alto=(0.8, 2.6), grupo='P'):
    """Hielo levantado y amontonado: losas gruesas, cada una a su aire."""
    for _ in range(cuantos):
        t = random.uniform(*alto)
        bloque(grupo, HIELO, en(random.uniform(x0, x1), random.uniform(z0, z1), -0.2, random.uniform(0, 3.1), (random.uniform(-0.5, 0.5), random.uniform(-0.5, 0.5))),
               (random.uniform(1.4, 3.2), random.uniform(1.0, 2.2), t), baldosa=5.0, mella=0.12)
for s in (-1, 1):                                                                    # el hielo roto a los lados del boquete y detrás
    bloques_hielo(min(s * (ZANJA + 0.8), s * (ZANJA + 4.5)), max(s * (ZANJA + 0.8), s * (ZANJA + 4.5)), Z_TUNEL, Z_BOCA - 1.0, 9)
bloques_hielo(-11.0, 11.0, Z_TUNEL - 5.0, Z_TUNEL - 0.6, 14, (1.2, 3.4))
for k in range(8):                                                                   # las raíces que suben por la losa
    x = -6.2 + k * 1.76 + random.uniform(-0.4, 0.4)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, Z_PIE - 0.2, -HONDO + 0.1), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.4))

# ==================================================================================
# 3. LO QUE HAY EN EL HIELO
# ==================================================================================
def caseta (x, z, grupo='EV'):
    """Una caseta de pescar: cuatro tablas pintadas, el tejadillo nevado, su tubo y la ventana encendida."""
    m = random.choice(CASETAS)
    giro = random.uniform(-0.3, 0.3)
    cubo(grupo, m, P(x, z, 1.05), (2.0, 2.4, 2.1), giro)
    cubo(grupo, BLANCO, P(x, z, 2.2), (2.3, 2.7, 0.22), giro)
    barra(grupo, HIERRO, P(x + 0.6, z, 2.2), P(x + 0.6, z, 3.0), 0.12)
    cubo('EP' if grupo == 'EV' else 'CP', VENTANA, P(x - 1.02 * math.cos(giro) * (1 if x > 0 else -1), z + 0.2, 1.3), (0.06, 0.6, 0.5), giro)
for x, z in ((-11.4, -8.0), (-13.5, -26.0), (-11.0, -50.0), (11.2, -14.0), (14.5, -24.0), (11.4, -62.0), (-15.0, -40.0)):
    caseta(x, z)
for _ in range(60):
    x, z = random.uniform(-120.0, 120.0), random.uniform(-90.0, 400.0)
    if abs(x) > 24.0:
        caseta(x, z, 'T')
# La barcaza atrapada en el hielo, a la izquierda.
BX, BZ0, BZ1 = -22.0, -64.0, -22.0
prisma('P', OXIDO_T, [(BX - 4.0, BZ1), (BX + 4.0, BZ1), (BX + 4.4, BZ0 + 8.0), (BX, BZ0), (BX - 4.4, BZ0 + 8.0)], -0.6, 2.6, techo=NIEVE, baldosa=4.0)
caja('P', OXIDO_T, BX - 2.6, BX + 2.6, BZ1 - 8.0, BZ1 - 1.0, 2.6, 5.4, techo=NIEVE, baldosa=4.0)
barra('EV', HIERRO, P(BX, BZ1 - 4.5, 5.4), P(BX, BZ1 - 4.5, 8.4), 0.14)
cubo('EP', VENTANA, P(BX + 2.62, BZ1 - 4.5, 4.4), (0.06, 3.0, 0.7))
# El ruedo de la base alien: un cerco de bloques de hielo.
for i in range(18):
    a_ = 2 * math.pi * i / 18
    if abs(math.pi - a_) < 0.9:                                                      # abierto hacia el campo
        continue
    bloque('P', HIELO, en(BASE[0] + 5.3 * math.cos(a_), BASE[1] + 5.3 * math.sin(a_), -0.1, -a_ + random.uniform(-0.2, 0.2)), (0.9, 1.6, random.uniform(0.6, 1.3)), baldosa=5.0, mella=0.1)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.04) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)
for _ in range(16):                                                                  # ventisqueros
    s = random.choice((-1, 1))
    x, z = s * random.uniform(10.0, 19.0), random.uniform(-60.0, 8.0)
    if (s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < 7.0) or (s < 0 and x < BX + 6.0 and BZ0 - 2 < z < BZ1 + 2):
        continue
    elipsoide('EV', BLANCO, en(x, z, 0.0), (random.uniform(1.0, 2.0), random.uniform(1.0, 2.4), random.uniform(0.3, 0.6)))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-63.5)

# ==================================================================================
# 4. EL PUENTE DE BUGRINSKI
# ==================================================================================
# El tablero cruza el río de lado a lado; jugando se ven sus pilas, el canto encendido y el arranque del arco.
z0, z1 = ZP - 9.0, ZP + 9.0
x = -ORILLA - 60.0
while x < ORILLA + 60.0:
    x1 = min(ORILLA + 60.0, x + 60.0)
    g = 'P' if -70.0 < x < 60.0 else 'T'
    caja(g, HORMIGON, x + 0.2, x1 - 0.2, z0, z1, Y_TABLERO, Y_TABLERO + 2.0, baldosa=6.0)
    cara('EP' if g == 'P' else 'CP', LUZ_P, [P(x, z1 + 0.05, Y_TABLERO + 1.5), P(x1, z1 + 0.05, Y_TABLERO + 1.5), P(x1, z1 + 0.05, Y_TABLERO + 1.8), P(x, z1 + 0.05, Y_TABLERO + 1.8)], hacia=V((0, -1, 0)))
    x = x1
for px in (-116.0, -38.0, 38.0, 116.0):               # las pilas, en el hielo
    g = 'P' if abs(px) < 60.0 else 'T'
    caja(g, HORMIGON, px - 3.0, px + 3.0, ZP - 6.0, ZP + 6.0, -1.0, Y_TABLERO, baldosa=6.0)
    if g == 'P':
        bloques_hielo(px - 6.0, px + 6.0, ZP + 6.5, ZP + 10.0, 5, (0.8, 2.0))
# El arco rojo: una red de tubos entre -190 y 190, 70 m por encima del tablero.
LUZ_ARCO, FLECHA = 116.0, 52.0
arco_y = lambda x: Y_TABLERO + 2.0 + FLECHA * (1 - (x / LUZ_ARCO) ** 2)
xs = np.linspace(-LUZ_ARCO, LUZ_ARCO, 25)
for a, b in zip(xs, xs[1:]):
    for dz in (-7.0, 7.0):
        k = 1 - 0.75 * (1 - (((a + b) / 2) / LUZ_ARCO) ** 2)                         # los dos arcos se juntan arriba
        barra('CP' if abs((a + b) / 2) > 50.0 else 'EP', ROJO_P, P(float(a), ZP + dz * (1 - 0.75 * (1 - (a / LUZ_ARCO) ** 2)), arco_y(a)), P(float(b), ZP + dz * (1 - 0.75 * (1 - (b / LUZ_ARCO) ** 2)), arco_y(b)), 2.2)
for i, x in enumerate(xs[1:-1]):                                                     # las péndolas, cruzadas
    for dz in (-7.0, 7.0):
        barra('T', HIERRO, P(float(x), ZP + dz * (1 - 0.75 * (1 - (x / LUZ_ARCO) ** 2)), arco_y(x)), P(float(x) + (14.0 if i % 2 else -14.0), ZP + dz, Y_TABLERO + 2.0), 0.3)
print('PUENTE: tablero a', Y_TABLERO, 'm; arco hasta', Y_TABLERO + 2.0 + FLECHA)

# ==================================================================================
# 5. LAS ORILLAS, LA CIUDAD Y LA AURORA (solo en el vuelo)
# ==================================================================================
for s in (-1, 1):
    suelo('G', NIEVE, min(s * ORILLA, s * 1500.0), max(s * ORILLA, s * 1500.0), -1500.0, 1500.0, 2.0, 12.0)
    x = s * ORILLA
    for zz in np.arange(-1500.0, 1500.0, 60.0):                                      # el talud de la orilla
        caja('T', BLANCO, min(x, x + s * 4.0), max(x, x + s * 4.0), float(zz) + 0.3, float(zz) + 59.7, -0.5, 2.0, baldosa=8.0)
    for _ in range(170):
        pino('T', TRONCO, ABETO, s * random.uniform(ORILLA + 8.0, ORILLA + 90.0), random.uniform(-900.0, 900.0), random.uniform(1.6, 2.8), y=2.0)
n_ed = 0
for gx in np.arange(ORILLA + 100.0, 1250.0, 44.0):                                   # la ciudad, en la orilla derecha
    for gz in np.arange(-1100.0, 1100.0, 44.0):
        if random.random() < 0.25:
            continue
        cx, cz = gx + 22 + random.uniform(-5, 5), gz + 22 + random.uniform(-5, 5)
        if math.hypot(cx - 330.0, cz + 200.0) < 80.0:
            continue
        a = random.uniform(11.0, 16.0)
        caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 2.0, 2.0 + random.choice([18, 24, 30, 45, 70]), techo=AZOTEA, baldosa=17.0)
        n_ed += 1
for gx in np.arange(-1250.0, -ORILLA - 100.0, 44.0):                                 # y la izquierda, más baja
    for gz in np.arange(-1100.0, 1100.0, 44.0):
        if random.random() < 0.5:
            continue
        cx, cz = gx + 22, gz + 22
        a = random.uniform(11.0, 15.0)
        caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 2.0, 2.0 + random.choice([15, 18, 24]), techo=AZOTEA, baldosa=17.0)
        n_ed += 1
print('EDIFICIOS', n_ed)
# El Teatro de Ópera: el pórtico de columnas y la gran cúpula plateada, iluminada.
OX, OZ = 330.0, -200.0
caja('T', BLANCO, OX - 50.0, OX + 50.0, OZ - 40.0, OZ + 40.0, 2.0, 24.0, techo=AZOTEA)
for k in range(12):
    barra('CP', ORO, P(OX - 51.0, OZ - 22.0 + k * 4.0, 2.0), P(OX - 51.0, OZ - 22.0 + k * 4.0, 22.0), 1.6)
caja('CP', ORO, OX - 50.4, OX - 50.0, OZ - 40.0, OZ + 40.0, 2.0, 24.0)             # la fachada, iluminada
torno('T', PLATA, en(OX, OZ, 24.0), [(34.0, 0.0), (34.0, 6.0), (31.0, 14.0), (23.0, 23.0), (11.0, 29.0), (0.0, 31.0)], lados=20, tapas=(False, False))
# (La aurora se probó con cortinas de caras y no valía: de lejos eran rectángulos, como edificios de cristal.)
for cx, cz, radio, alto in ((-1900.0, -1900.0, 900.0, 60.0), (1800.0, 2000.0, 900.0, 50.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=2.0, seg=16, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'GP': ('luzG-hielo', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-novosibirsk', ['P', 'GP', 'EV', 'EP']), ('lugar-novosibirsk-ciudad', ['G', 'T', 'CP'])],
    # Noche de luna sobre el hielo: luz azul, fría, y la nieve devolviéndola. Más
    # clara que la noche de Chongqing: aquí no hay farolas que pintar en el suelo.
    sol_hacia=SOL, sol_color=(0.72, 0.82, 1.0), sol_fuerza=3.2, sol_ancho=6.0, cielo_fuerza=0.2, cielo_altura=30, cielo_giro=150,
    escala=0.9, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
