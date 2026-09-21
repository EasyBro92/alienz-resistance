# Arena 3: dentro de la base alien.
#   blender -b -P herramientas/blender/arena_base.py -- [--vista]
# Gradas de metal oscuro con franjas verdes, vainas de cultivo brillando
# alrededor del campo, tuberías, el jefe alien como estatua gigante al fondo y
# el público en las pasarelas.

import sys, os, math, random
sys.path.append(os.path.dirname(__file__))
from comun import *

empezar(37)

M_CHAPA = material('chapa', 0x3a424c, 0.45, metal=0.7)
M_CHAPA_OSC = material('chapa-oscura', 0x22272e, 0.5, metal=0.6)
M_PODIO = material('podio-alien', 0x2b2f3a, 0.4, metal=0.5)
M_TUBO = material('tubo', 0x4a5a52, 0.35, metal=0.8)
# `brillo_…`: el juego les deja la emisión.
M_FRANJA = material('brillo-franja', 0x3cff8a, 0.3, 0x3cff8a, 4.0)
M_VAINA = material('brillo-vaina', 0x7cff6a, 0.2, 0x5aff4a, 2.5)
M_FOCO = material('foco', 0xe6fff0, 0.3, 0xd8ffe6, 5.0)

ZC = -22.0
A0, B0 = 17.5, 42.5
ALTO_PODIO = 3.0
GRADAS = 7
HUELLA = 2.1
TABICA = 1.3
N = 120
Z_CORTE = 14.0

def punto (i, k):
    t = 2 * math.pi * k / N
    return (A0 + i * HUELLA) * math.cos(t), ZC + (B0 + i * HUELLA) * math.sin(t)

def visible (k):
    return punto(0, k)[1] < Z_CORTE and punto(0, k + 1)[1] < Z_CORTE

# Gradas de chapa: huella clara, tabica oscura y una franja verde en cada canto.
def gradas (bm):
    for k in range(N):
        if not visible(k):
            continue
        x1, z1 = punto(0, k)
        x2, z2 = punto(0, k + 1)
        quad(bm, P(x1, 0, z1), P(x2, 0, z2), P(x2, ALTO_PODIO, z2), P(x1, ALTO_PODIO, z1), 2)
        for i in range(GRADAS + 1):
            h = ALTO_PODIO + i * TABICA
            xa, za = punto(i, k)
            xb, zb = punto(i, k + 1)
            xc, zc = punto(i + 1, k + 1)
            xd, zd = punto(i + 1, k)
            quad(bm, P(xa, h, za), P(xd, h, zd), P(xc, h, zc), P(xb, h, zb), 0)
            if i < GRADAS:
                quad(bm, P(xd, h, zd), P(xd, h + TABICA, zd), P(xc, h + TABICA, zc), P(xc, h, zc), 1)
malla('graderio', gradas, [M_CHAPA, M_CHAPA_OSC, M_PODIO])

def franjas (bm):
    for k in range(N):
        if not visible(k):
            continue
        for i in (0, 2, 4, 6):
            h = ALTO_PODIO + i * TABICA + 0.02
            xa, za = punto(i + 0.02, k)
            xb, zb = punto(i + 0.02, k + 1)
            xc, zc = punto(i + 0.12, k + 1)
            xd, zd = punto(i + 0.12, k)
            quad(bm, P(xa, h, za), P(xd, h, zd), P(xc, h, zc), P(xb, h, zb), 0)
        # Y una línea en lo alto del podio.
        xa, za = punto(-0.01, k)
        xb, zb = punto(-0.01, k + 1)
        quad(bm, P(xa, ALTO_PODIO - 0.5, za), P(xb, ALTO_PODIO - 0.5, zb), P(xb, ALTO_PODIO - 0.3, zb), P(xa, ALTO_PODIO - 0.3, za), 0)
malla('brillo_franjas', franjas, [M_FRANJA])

# Muro del fondo, más alto que las gradas, con costillas y tuberías.
H_TOPE = ALTO_PODIO + (GRADAS + 1) * TABICA
def muro (bm):
    for k in range(0, N, 1):
        if not visible(k):
            continue
        x1, z1 = punto(GRADAS + 1, k)
        x2, z2 = punto(GRADAS + 1, k + 1)
        quad(bm, P(x1, H_TOPE, z1), P(x2, H_TOPE, z2), P(x2, H_TOPE + 9, z2), P(x1, H_TOPE + 9, z1), 1)
        if k % 5 == 0:
            ang = math.atan2(-(z2 - z1), x2 - x1)
            caja(bm, (x1, H_TOPE + 5, z1), (1.1, 11, 1.6), ang, 0)
malla('muro', muro, [M_CHAPA, M_CHAPA_OSC])

def tubos (bm):
    for k in range(3, N, 9):
        if not visible(k):
            continue
        x, z = punto(GRADAS + 0.7, k)
        cilindro(bm, (x, H_TOPE, z), 0.55, 12, 8, 0)
malla('tubos', tubos, [M_TUBO])

# Vainas de cultivo al pie del podio: cápsulas de cristal verde que brillan.
def vainas (bm):
    for k in range(1, N, 4):
        if not visible(k):
            continue
        x, z = punto(-0.9, k)
        if z > 8:
            continue
        cilindro(bm, (x, 0, z), 0.75, 2.8, 10, 0)
malla('brillo_vainas', vainas, [M_VAINA])
def peanas (bm):
    for k in range(1, N, 4):
        if not visible(k):
            continue
        x, z = punto(-0.9, k)
        if z > 8:
            continue
        cilindro(bm, (x, 0, z), 0.95, 0.35, 10, 0)
        cilindro(bm, (x, 2.8, z), 0.95, 0.3, 10, 0)
malla('peanas', peanas, [M_TUBO])

# El jefe alien, estatua gigante sobre un pedestal en el fondo.
_, zf = punto(0, N * 3 // 4)
def pedestal (bm):
    cilindro(bm, (0, 0, zf - 4), 4.5, ALTO_PODIO + 0.6, 16, 0)
    cilindro(bm, (0, ALTO_PODIO + 0.6, zf - 4), 5.0, 0.4, 16, 1)
malla('pedestal', pedestal, [M_PODIO, M_TUBO])
modelo('jefe-alien.glb', 'jefe', 16, (0, ALTO_PODIO + 1.0, zf - 4), caras=5000, por='alto')

# Focos verdosos en lo alto del muro.
focos = [(-24, -52), (24, -52), (-27, -12), (27, -12)]
def torres (bm):
    for (fx, fz) in focos:
        caja(bm, (fx, H_TOPE + 10, fz), (5.2, 3.2, 0.6), 0, 0)
malla('soportes', torres, [M_CHAPA_OSC])
for i, (fx, fz) in enumerate(focos):
    panel_foco(i, (fx, H_TOPE + 10, fz), mat=M_FOCO)

modelo('nave-platillo.glb', 'platillo_0', 7, (-20, 30, -60), caras=2000)
modelo('nave-anillo.glb', 'platillo_1', 8, (22, 36, -74), caras=2000)

# Público en las gradas; nadie delante de la estatua.
sitios = []
for fila in range(1, GRADAS):
    paso = 2 if fila < 4 else 3
    for k in range(fila % 3, N, paso):
        if not visible(k) or random.random() < 0.22:
            continue
        x, z = punto(fila + 0.45, k)
        if z > 6 or (abs(x) < 8 and z < ZC - B0 + 5):
            continue
        sitios.append((x, ALTO_PODIO + fila * TABICA, z, 0, ZC))
publico(sitios)

exportar('arena-base')
vistas('base', 0x0a1a14)
