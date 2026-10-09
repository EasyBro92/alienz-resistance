# Bombay: la explanada de la Puerta de la India, de día (09/10/2026).
#   blender -b -P herramientas/blender/lugar_bombay.py              (entero)
#   blender -b -P herramientas/blender/lugar_bombay.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_bombay.py -- --reusar  (retocar la luz)
#
# Isidro eligió para Bombay la PUERTA DE LA INDIA (el arco de frente al fondo, el
# hotel Taj Mahal Palace a un lado), los alienz DESEMBARCAN DEL MAR y cruzan por
# debajo del arco, DE DÍA y con llegada larga.
#
# Cómo está puesto. Se mira al mar, con el arco delante:
#   · LA PUERTA VA A LA MITAD DE SU TAMAÑO (13 m con las torrecillas; mide 26): es
#     lo que cabe de alto al fondo de la pantalla. Cuerpo central con su arco
#     apuntado (6 m de luz), dos alas con su arco pequeño y cuatro torrecillas.
#   · Detrás, el muelle y dos barcazas alienígenas con la rampa echada: los alienz
#     nacen en ellas y pasan el arco en abanico (`abanico` en la misión).
#   · A la derecha, el pretil y el mar con las lanchas de Elefanta; la base alien,
#     en un baluarte redondo del muelle. A la izquierda, árboles y farolas.
#   · Solo en el vuelo: el hotel Taj Mahal Palace con sus cúpulas rojas, Colaba y
#     la bahía.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

# Del lado del mar: de la izquierda, la sombra del hotel (27 m, y su torre de 70) tapaba media explanada.
SOL = (0.45, 0.72, 0.5)                  # media mañana: alto, de la derecha (el mar) y algo a la espalda
iniciar('bombay', 2816, eje=(0.0, -60.0), encendidas=0.0, reflejo=(0.07, 0.11, 0.2))

MUELLE = 16.0                            # el canto de la derecha: de ahí en adelante, mar
Z_MAR = -80.0                            # y el del fondo, detrás del arco
MAR_Y = -1.8
ZA0, ZA1 = -66.0, -74.0                  # la puerta: su cara y su espalda
BASE = (12.6, -44.0)
R_BAL = 5.9

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La explanada: losas de basalto gris a matajunta, con cenefas de piedra clara
    en cuadrícula, y lo que deja medio millón de pies al día."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('stone_pavers', 256, 0xb8afa2, 0.5))
    clara = tejar(foto('pavement_02', 256, 0xcdbf9f, 0.45))
    lz, lx = 0.8 * KZ, 0.8 * KX
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + lz))
        c = -(fila % 2) * lx / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + lx))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.92, 1.06)
                a[f0:f1, c0:c0 + 1] *= 0.7
            c += lx
        a[f0:f0 + 1] *= 0.7
        fila += 1; f += lz
    for z in np.arange(-56.0, 12.0, 8.0):                                # las cenefas, de lado a lado…
        (_, f0), (_, f1) = a_px(0, z - 0.3), a_px(0, z + 0.3)
        a[max(0, f0):f1] = clara[max(0, f0):f1]
    for x in (-8.0, -4.0, 0.0, 4.0, 8.0):                                # …y a lo largo
        (c0, _), (c1, _) = a_px(x - 0.3, 0), a_px(x + 0.3, 0)
        a[:, c0:c1] = clara[:, c0:c1]
    a *= (0.92 + 0.14 * nube(PH_, PW, 16, 4))[..., None]
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for _ in range(40):
        mancha(random.uniform(-9, 9), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.2), random.uniform(0.78, 0.92), random.uniform(0.6, 1.5))
    for x, z, r_ in ((4.8, -16.0, 1.5), (-5.0, -35.0, 1.6), (2.0, -53.0, 1.4)):    # la guerra
        mancha(x, z, r_ * 1.5, 0.82, 1.1)
        mancha(x, z, r_, 0.45)
        for _ in range(46):
            ang, d = random.uniform(0, 6.28), r_ * random.uniform(0.3, 1.8)
            c, f = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                a[f:f + 2, c:c + 2] = random.choice(((0.08, 0.08, 0.08), (0.7, 0.66, 0.58)))
    for k in range(9):                                                   # el rastro verdoso de lo que sube del mar
        x, z = -2.6 + k * 0.65 + random.uniform(-0.3, 0.3), PZ0
        for i in range(int(random.uniform(4.0, 14.0) * KZ)):
            x += random.uniform(-0.02, 0.02); z += 1 / KZ
            c, f = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f < PH_:
                a[f, c - 2:c + 3] = a[f, c - 2:c + 3] * 0.6 + np.array((0.05, 0.14, 0.08), np.float32) * 0.4
    for _ in range(700):
        c, f = random.randrange(1, PW - 2), random.randrange(1, PH_ - 2)
        a[f:f + 2, c:c + 1] *= 0.72
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_basalto ():
    """La piedra de la puerta: basalto amarillo de Kharodi en hiladas, con sus aguas."""
    n = 256
    a = foto('yellow_stone_wall', n, 0xd2b077, 0.5)
    for f in range(0, n, 32):
        c = -random.randint(0, 50)
        while c < n:
            ancho = random.randint(40, 80)
            c0, c1 = max(0, c), min(n, c + ancho)
            a[f:f + 32, c0:c1] *= random.uniform(0.92, 1.06)
            a[f:f + 32, c0:c0 + 1] *= 0.72
            c += ancho
        a[f:f + 1] *= 0.72
    a *= (0.9 + 0.16 * nube(n, n, 5, 5))[..., None]
    a *= (0.92 + 0.12 * nube(2, n, 1, 30)[0])[None, :, None]             # chorreras del monzón
    return guardar('basalto', np.clip(a, 0, 1), 88)

def tex_celosia ():
    """Un paño de jali: la celosía de piedra calada, con su marco."""
    n = 128
    a = foto('yellow_stone_wall', n, 0xd8b880, 0.4)
    yy, xx = np.mgrid[0:n, 0:n]
    hueco = (((xx + yy) % 16 < 9) & ((xx - yy) % 16 < 9)) & (xx > 12) & (xx < n - 12) & (yy > 12) & (yy < n - 12)
    a[hueco] *= 0.22
    a[8:12, 8:n - 8] *= 0.6; a[n - 12:n - 8, 8:n - 8] *= 0.6; a[8:n - 8, 8:12] *= 0.6; a[8:n - 8, n - 12:n - 8] *= 0.6
    return guardar('celosia', np.clip(a, 0, 1), 88)

def tex_mar ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((5, 2, 0.0), (9, 3, 1.3), (14, 5, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.9 * np.sin(2 * np.pi * (u * 2 + v * 4)))
    b = np.clip(onda / 3, -1, 1)
    a = np.stack([0.36 + 0.025 * b, 0.47 + 0.03 * b, 0.5 + 0.03 * b], axis=-1)       # el mar Arábigo en la bahía: verde gris, turbio
    a += (np.clip(b - 0.76, 0, 1) * 1.4)[..., None] * np.array((0.6, 0.55, 0.45))
    return guardar('mar-bombay', a, 88)

def tex_taj ():
    """La fachada del hotel: piedra gris con las galerías de arcos blancos y los balcones."""
    a = lienzo(256, 256, (0.56, 0.5, 0.44)) + ruido(256, 256, 0.05)[..., None]
    yy, xx = np.mgrid[0:256, 0:256]
    for f in range(4):
        y0 = f * 64
        for k in range(4):
            cx = k * 64 + 32
            arco = (((xx - cx) / 18.0) ** 2 + ((yy - (y0 + 30)) / 16.0) ** 2 < 1) & (yy <= y0 + 30) | ((np.abs(xx - cx) < 18) & (yy > y0 + 30) & (yy < y0 + 52))
            marco = (((xx - cx) / 22.0) ** 2 + ((yy - (y0 + 30)) / 20.0) ** 2 < 1) & (yy <= y0 + 30) | ((np.abs(xx - cx) < 22) & (yy > y0 + 30) & (yy < y0 + 52))
            a[marco] = (0.86, 0.84, 0.78)
            a[arco] = (0.1, 0.11, 0.13)
        a[y0 + 52:y0 + 58] = (0.88, 0.86, 0.8)                           # el balcón corrido
        a[y0 + 58:y0 + 64] *= 0.7
    return guardar('taj-hotel', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.9)
LOSAS = material('losas', de_polyhaven('stone_pavers', 512, 0xb8afa2, 0.5), rug=0.9)
BASALTO = material('basalto', tex_basalto(), rug=0.95)
CELOSIA = material('celosia', tex_celosia(), rug=0.95)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xb7a482, 0.6), rug=0.9)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xa59c8c, 0.6), rug=0.9)
MAR = material('mar', tex_mar(), rug=0.1)
TAJ = material('taj-hotel', tex_taj(), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.6, 0.56, 0.5)))
# OJO: los colores lisos van en LINEAL.
PIEDRA = material('piedra-puerta', color=(0.62, 0.44, 0.2), rug=1.0)
SOMBRA = material('sombra-arco', color=(0.1, 0.07, 0.04), rug=1.0)
ROJO_C = material('cupula-roja', color=(0.42, 0.1, 0.07), rug=0.7)
BLANCO = material('blanco', color=(0.8, 0.78, 0.7), rug=0.7)
FUNDICION = material('fundicion', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.7), rug=0.3)
MADERA = material('madera', color=(0.2, 0.12, 0.06), rug=0.9)
CABO = material('cabo', color=(0.3, 0.26, 0.2), rug=0.9)
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
ALIEN = material('casco-alien', color=(0.025, 0.035, 0.03), rug=0.5)
ALIEN_2 = material('cubierta-alien', color=(0.05, 0.065, 0.055), rug=0.6)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
CASCOS = [material(f'casco-{i}', color=c, rug=0.6) for i, c in enumerate([(0.8, 0.8, 0.74), (0.04, 0.16, 0.42), (0.5, 0.06, 0.04), (0.03, 0.3, 0.24), (0.85, 0.6, 0.1)])]
TOLDO = [material(f'toldo-{i}', color=c, rug=0.9) for i, c in enumerate([(0.05, 0.2, 0.5), (0.6, 0.1, 0.06), (0.8, 0.76, 0.66)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.13, 0.04), (0.07, 0.16, 0.05), (0.1, 0.19, 0.06)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.15, 0.04), (0.09, 0.18, 0.05)])]
TRONCO = material('tronco', color=(0.1, 0.07, 0.05))
MONTE_L = material('monte-lejos', color=(0.22, 0.3, 0.3), rug=1.0)
FACHADAS = [material(f'f-colaba-{i}', tex_postigos(f'colaba-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.86, 0.78, 0.6), (0.3, 0.36, 0.3)), ((0.8, 0.7, 0.6), (0.36, 0.26, 0.2)), ((0.9, 0.88, 0.8), (0.24, 0.34, 0.44)), ((0.76, 0.6, 0.48), (0.3, 0.3, 0.3))])] + \
    [material(f'f-pisos-{i}', tex_crema(f'bombay-{i}', c, balcon=0.8)) for i, c in enumerate([(0.9, 0.86, 0.78), (0.82, 0.84, 0.82), (0.88, 0.76, 0.6)])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.88, 0.9, 0.9)), (0.07, (0.8, 0.86, 0.92)), (0.25, (0.54, 0.72, 0.92)), (0.6, (0.3, 0.52, 0.86)), (1.0, (0.16, 0.38, 0.78))],
    (SOL[0], SOL[2]), 0.5, (0.3, 0.25, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.24), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA EXPLANADA, EL MUELLE Y EL MAR
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSAS, -24.0, PX0, Z_MAR, 100.0, 0.0, 3.2)
suelo('GN', LOSAS, PX1, MUELLE, Z_MAR, 100.0, 0.0, 3.2)
suelo('GN', LOSAS, PX0, PX1, PZ1, 100.0, 0.0, 3.2)
suelo('GN', LOSAS, PX0, PX1, Z_MAR, PZ0, 0.0, 3.2)
rect('EP', MAR, -3200.0, 3200.0, -3200.0, 3200.0, MAR_Y, baldosa=48.0)
# Los muros del muelle, hasta debajo del agua, y su pretil de balaustres.
cara('P', SILLAR, [P(MUELLE, 100.0, MAR_Y - 1.5), P(MUELLE, Z_MAR, MAR_Y - 1.5), P(MUELLE, Z_MAR, 0.0), P(MUELLE, 100.0, 0.0)], hacia=V((1, 0, 0)), baldosa=3.0)
cara('P', SILLAR, [P(-1500.0, Z_MAR, MAR_Y - 1.5), P(MUELLE, Z_MAR, MAR_Y - 1.5), P(MUELLE, Z_MAR, 0.0), P(-1500.0, Z_MAR, 0.0)], hacia=V((0, -1, 0)), baldosa=3.0)
def pretil (z0, z1):
    viga('P', SILLAR, MUELLE - 0.5, MUELLE, z0, z1, 0.0, 0.3, u_m=2.0)
    viga('P', SILLAR, MUELLE - 0.45, MUELLE - 0.05, z0, z1, 0.86, 1.02, u_m=2.0)
    z = z0 + 0.3
    while z < z1:
        barra('EV', PIEDRA, P(MUELLE - 0.25, z, 0.3), P(MUELLE - 0.25, z, 0.86), 0.16)
        z += 0.6
pretil(Z_MAR + 0.2, BASE[1] - R_BAL + 0.6)
pretil(BASE[1] + R_BAL - 0.6, 30.0)
for x0, x1 in ((-24.0, -14.0), (14.0, MUELLE)):                                       # y en el canto del fondo, a los lados de las barcazas
    viga('P', SILLAR, x0, x1, Z_MAR, Z_MAR + 0.5, 0.0, 0.95, u_m=2.0)

# El baluarte de la base alien, que sale del muelle.
N_B = 28
circ = [(BASE[0] + R_BAL * math.cos(2 * math.pi * i / N_B), BASE[1] + R_BAL * math.sin(2 * math.pi * i / N_B)) for i in range(N_B)]
BALUARTE = material('baluarte', de_polyhaven('stone_pavers', 512, 0x8f897f, 0.5), rug=0.9)
prisma('P', SILLAR, circ, MAR_Y - 1.5, 0.06, techo=BALUARTE, baldosa=3.0)
for i in range(N_B):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_B]
    if (ax + bx) / 2 > MUELLE + 0.2:
        barra('EV', PIEDRA, P(ax, az, 0.5), P(bx, bz, 0.5), 0.3)
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.08)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.82), f(ax, az, 0.82)], hacia=ARRIBA)

def farola (x, z, alto=5.4):
    """La farola de época de la explanada: fuste con basa y cuatro faroles."""
    torno('EV', FUNDICION, en(x, z), [(0.26, 0.0), (0.2, 0.6), (0.09, 0.9), (0.07, alto)], lados=6, tapas=(False, False))
    for dx, dz in ((0.6, 0), (-0.6, 0), (0, 0.6), (0, -0.6)):
        barra('EV', FUNDICION, P(x, z, alto - 0.4), P(x + dx, z + dz, alto - 0.1), 0.06)
        copa('EV', FAROL, x + dx, z + dz, alto + 0.12, 0.2, 0.26, sub=1, baila=0.0)
for z in np.arange(6.0, -62.0, -17.0):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        farola(s * 8.5, float(z))
for z in np.arange(8.0, -62.0, -10.5):                                               # la arboleda de la izquierda, con sus alcorques
    for x in (-12.4, -18.6):
        arbol('EV', TRONCO, HOJAS, x + random.uniform(-0.6, 0.6), float(z) + random.uniform(-1, 1), random.uniform(1.0, 1.4))
for z in (-2.0, -22.0, -40.0):                                                        # bancos de piedra
    bloque('EV', PIEDRA, en(-9.9, z, 0.0), (0.7, 2.2, 0.5), mella=0.02)

# ==================================================================================
# 3. LA PUERTA DE LA INDIA
# ==================================================================================
ZC = (ZA0 + ZA1) / 2
def arco_apuntado (medio, y_arranque, y_clave, n=7):
    """Medio arco apuntado, de derecha a izquierda (antihorario visto de frente)."""
    der = [(medio * math.cos(t) ** 0.8, y_arranque + (y_clave - y_arranque) * math.sin(t) ** 0.9) for t in np.linspace(0, math.pi / 2, n)]
    return der + [(-x, y) for x, y in reversed(der[:-1])]
# El cuerpo central: de una pieza, con el hueco del arco.
MC, HC = 7.6, 10.2
contorno = [(-MC, 0.0), (-3.0, 0.0), (-3.0, 5.0)] + [(x, y) for x, y in reversed(arco_apuntado(3.0, 5.0, 8.3))][1:-1] + [(3.0, 5.0), (3.0, 0.0), (MC, 0.0), (MC, HC), (-MC, HC)]
extruido('P', BASALTO, en(0.0, ZC), contorno, ZA0 - ZA1, baldosa=3.2)
viga('P', BASALTO, -MC - 0.3, MC + 0.3, ZA1 - 0.3, ZA0 + 0.3, HC, HC + 0.3, u_m=3.2)              # la cornisa volada
viga('P', BASALTO, -MC, MC, ZA1, ZA0, HC + 0.3, HC + 1.0, u_m=3.2, techo=PIEDRA)                  # y el antepecho
viga('P', BASALTO, -4.6, 4.6, ZA1 + 1.4, ZA0 - 1.4, HC + 1.0, HC + 1.9, u_m=3.2, techo=PIEDRA)    # el tambor de la cúpula, que apenas asoma
for s in (-1, 1):
    for zc in (ZA0 + 0.02, ZA1 - 0.02):                                                           # los paños de celosía de los machones
        d = 1 if zc > ZC else -1
        cara('P', CELOSIA, [P(s * 4.2 - 0.9, zc, 5.4), P(s * 4.2 + 0.9, zc, 5.4), P(s * 4.2 + 0.9, zc, 8.2), P(s * 4.2 - 0.9, zc, 8.2)], uvs=[(0, 0), (1, 0), (1, 1.5), (0, 1.5)], hacia=V((0, -d, 0)))
        cara('P', CELOSIA, [P(s * 4.2 - 0.9, zc, 1.2), P(s * 4.2 + 0.9, zc, 1.2), P(s * 4.2 + 0.9, zc, 4.0), P(s * 4.2 - 0.9, zc, 4.0)], uvs=[(0, 0), (1, 0), (1, 1.5), (0, 1.5)], hacia=V((0, -d, 0)))
    viga('P', BASALTO, s * 3.0 - 0.25, s * 3.0 + 0.25, ZA1 - 0.2, ZA0 + 0.2, 4.7, 5.0, u_m=3.2)   # la imposta del arco
    # Las cuatro torrecillas: fuste de ocho lados en cada esquina, con su templete y su cupulín.
    for zt in (ZA0, ZA1):
        torno('P', BASALTO, en(s * MC, zt), [(1.05, 0.0), (1.0, HC + 0.6), (1.25, HC + 0.9), (1.25, HC + 1.1), (0.8, HC + 1.15), (0.8, HC + 2.0), (1.0, HC + 2.1), (0.9, HC + 2.3), (0.5, HC + 2.75), (0.0, HC + 2.95)],
              lados=8, u_rep=3, v_m=3.2, tapas=(False, False))
        barra('EV', PIEDRA, P(s * MC, zt, HC + 2.9), P(s * MC, zt, HC + 3.5), 0.1)
    # Las alas: más bajas, cada una con su arco y su celosía encima.
    MA, HA = 2.9, 7.2
    xa = s * (MC + MA)
    ala = [(-MA, 0.0), (-1.5, 0.0), (-1.5, 3.2)] + [(x, y) for x, y in reversed(arco_apuntado(1.5, 3.2, 5.0, 5))][1:-1] + [(1.5, 3.2), (1.5, 0.0), (MA, 0.0), (MA, HA), (-MA, HA)]
    extruido('P', BASALTO, en(xa, ZC), ala, ZA0 - ZA1 - 2.0, baldosa=3.2)
    viga('P', BASALTO, xa - MA - 0.2, xa + MA + 0.2, ZA1 + 0.8, ZA0 - 0.8, HA, HA + 0.6, u_m=3.2, techo=PIEDRA)
    for zc, d in ((ZA0 - 0.98, 1), (ZA1 + 0.98, -1)):
        cara('P', CELOSIA, [P(xa - 1.6, zc, 5.4), P(xa + 1.6, zc, 5.4), P(xa + 1.6, zc, 6.8), P(xa - 1.6, zc, 6.8)], uvs=[(0, 0), (2, 0), (2, 1), (0, 1)], hacia=V((0, -d, 0)))
    torno('P', BASALTO, en(s * (MC + 2 * MA), ZC), [(0.8, 0.0), (0.76, HA + 0.6), (0.95, HA + 0.8), (0.6, HA + 1.5), (0.0, HA + 1.9)], lados=8, u_rep=3, v_m=3.2, tapas=(False, False))
# La inscripción sobre el arco, a bulto, y el escalón de la puerta.
cara('EP', SOMBRA, [P(-2.6, ZA0 + 0.03, 8.8), P(2.6, ZA0 + 0.03, 8.8), P(2.6, ZA0 + 0.03, 9.5), P(-2.6, ZA0 + 0.03, 9.5)], hacia=V((0, -1, 0)))
print('PUERTA', HC + 2.95, 'm; luz del arco 6 m')

# ==================================================================================
# 4. LAS BARCAZAS ALIENÍGENAS Y LAS LANCHAS
# ==================================================================================
def barcaza (cx, z0, largo=18.0, ancho=9.0):
    """Varada de proa contra el muelle, con la cubierta a ras y la rampa echada."""
    z1 = z0 - largo
    x0, x1 = cx - ancho / 2, cx + ancho / 2
    caja('P', ALIEN, x0, x0 + 0.6, z1, z0, MAR_Y - 0.4, 3.2, baldosa=4)
    caja('P', ALIEN, x1 - 0.6, x1, z1, z0, MAR_Y - 0.4, 3.2, baldosa=4)
    caja('P', ALIEN, x0, x1, z1, z1 + 0.6, MAR_Y - 0.4, 3.2, baldosa=4)
    caja('P', ALIEN_2, x0 + 0.6, x1 - 0.6, z1 + 0.6, z0 + 0.4, -0.3, 0.02, baldosa=4)                 # la cubierta, hasta montar en el muelle
    caja('P', ALIEN_2, x0 + 1.6, x1 - 1.6, z1 + 0.6, z1 + 4.4, 0.02, 5.6, baldosa=4)                  # la torre de popa
    for lado in (x0, x1):
        caja('EP', VERDE, lado - 0.06, lado + 0.06, z1, z0, 2.9, 3.1)
    caja('EP', VERDE, x0 + 1.5, x1 - 1.5, z1 + 4.4, z1 + 4.5, 4.0, 4.6)
for cx in (-4.8, 4.8):
    barcaza(cx, Z_MAR)
barcaza(-22.0, Z_MAR - 26.0, 16.0, 8.0)                                              # otra llegando

def lancha (grupo, x, z, giro, largo=11.0):
    """La lancha de Elefanta: casco de madera de dos puntas, toldo corrido y su banderita."""
    c, s = math.cos(giro), math.sin(giro)
    g = lambda dx, dz, y: P(x + dx * c - dz * s, z + dx * s + dz * c, y)
    m = random.choice(CASCOS)
    a_, b = largo / 2, largo * 0.17
    borde = [(-a_, 0), (-a_ * 0.6, b), (a_ * 0.5, b), (a_, 0), (a_ * 0.5, -b), (-a_ * 0.6, -b)]
    centro = g(0, 0, MAR_Y)
    for i in range(6):
        (x0, z0), (x1, z1) = borde[i], borde[(i + 1) % 6]
        q = [g(x0 * 0.82, z0 * 0.7, MAR_Y - 0.2), g(x1 * 0.82, z1 * 0.7, MAR_Y - 0.2), g(x1, z1, MAR_Y + 1.1), g(x0, z0, MAR_Y + 1.1)]
        cara(grupo, m, q, hacia=H._girado((q[0] + q[2]) / 2 - centro))
    cara(grupo, MADERA, [g(px * 0.94, pz * 0.9, MAR_Y + 0.8) for px, pz in borde], hacia=ARRIBA)
    t = random.choice(TOLDO)
    cara(grupo, t, [g(-a_ * 0.55, -b * 0.9, MAR_Y + 3.0), g(a_ * 0.5, -b * 0.9, MAR_Y + 3.0), g(a_ * 0.5, b * 0.9, MAR_Y + 3.0), g(-a_ * 0.55, b * 0.9, MAR_Y + 3.0)], hacia=ARRIBA)
    for px in (-a_ * 0.55, a_ * 0.5):
        for pz in (-b * 0.9, b * 0.9):
            barra(grupo, BLANCO, g(px, pz, MAR_Y + 1.1), g(px, pz, MAR_Y + 3.0), 0.08)
for z in (-8.0, -24.0, -62.0, -72.0):
    lancha('EV', MUELLE + 3.6 + random.uniform(0, 1.0), z, math.pi / 2 + random.uniform(-0.1, 0.1))
for _ in range(46):
    x, z = random.uniform(40.0, 900.0), random.uniform(-700.0, 300.0)
    lancha('T', x, z, random.uniform(0, 6.28), random.uniform(8.0, 16.0))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-64.5)

# ==================================================================================
# 5. EL HOTEL TAJ MAHAL PALACE Y COLABA (solo en el vuelo)
# ==================================================================================
suelo('G', CALZADA, -36.0, -24.0, Z_MAR, 400.0, 0.0, carriles=(-36.0, 4.0, 'z'))
suelo('G', SOLAR, -1500.0, -36.0, Z_MAR, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -24.0, MUELLE, 100.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, MUELLE, 1500.0, 320.0, 1500.0, 0.0, 8.0)
def cupula_roja (grupo, x, z, y, r, lados=12):
    torno(grupo, BLANCO, en(x, z, y), [(r * 1.02, 0.0), (r * 1.02, r * 0.5)], lados=lados, tapas=(False, False))
    torno(grupo, ROJO_C, en(x, z, y + r * 0.5), [(r, 0.0), (r * 1.08, r * 0.35), (r * 0.95, r * 0.8), (r * 0.6, r * 1.15), (r * 0.2, r * 1.38), (0.0, r * 1.7)], lados=lados, tapas=(False, False))
    barra(grupo, BLANCO, P(x, z, y + r * 2.1), P(x, z, y + r * 2.7), r * 0.08)
HX0, HX1, HZ0, HZ1, HH = -92.0, -40.0, -72.0, 2.0, 27.0
# Va en un atlas: con la luz en los vértices, sus esquinas quedan DENTRO de las torres y salía negro entero.
viga('C', TAJ, HX0, HX1, HZ0, HZ1, 0.0, HH, u_m=8.0, v_rep=6.0, techo=AZOTEA)
viga('T', BLANCO, HX0 - 0.6, HX1 + 0.6, HZ0 - 0.6, HZ1 + 0.6, HH, HH + 0.8, u_m=6.0, techo=AZOTEA)
for x, z in ((HX1, HZ0), (HX1, HZ1), (HX0, HZ0), (HX0, HZ1)):                         # las torres de las esquinas
    torno('C', TAJ, en(x, z), [(4.4, 0.0), (4.4, HH + 5.0)], lados=8, u_rep=4, v_m=4.5, tapas=(False, True))
    cupula_roja('T', x, z, HH + 5.0, 4.2, 8)
cx, cz = (HX0 + HX1) / 2 + 8.0, (HZ0 + HZ1) / 2                                       # el cimborrio y la gran cúpula
torno('C', TAJ, en(cx, cz), [(10.0, HH), (10.0, HH + 12.0)], lados=12, u_rep=6, v_m=4.5, tapas=(False, True))
cupula_roja('T', cx, cz, HH + 12.0, 9.4, 16)
caja('C', FACHADAS[4], -92.0, -52.0, 12.0, 46.0, 0.0, 70.0, techo=AZOTEA)             # la torre nueva del hotel, al lado
n_ed = 0
for gx in np.arange(-1300.0, -100.0, 36.0):
    for gz in np.arange(Z_MAR + 6.0, 1300.0, 36.0):
        if random.random() < 0.14:
            continue
        cx, cz = gx + 18 + random.uniform(-4, 4), gz + 18 + random.uniform(-4, 4)
        ax, az = random.choice((10.5, 12.0, 13.5)), random.choice((10.5, 12.0, 13.5))
        lejos_ = math.hypot(cx, cz) > 500.0
        alto = random.choice([14, 17, 20, 23]) + (random.choice([0, 0, 30, 60, 90]) if lejos_ else 0)
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, alto, techo=AZOTEA)
        n_ed += 1
for gx in np.arange(-100.0, 0.0, 36.0):
    for gz in np.arange(110.0, 1300.0, 36.0):
        caja('T', random.choice(FACHADAS), gx + 4, gx + 30, gz + 4, gz + 30, 0.0, random.choice([14, 17, 20]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for z in np.arange(Z_MAR + 6.0, 300.0, 12.0):                                        # las palmeras de la calle del hotel
    palmera('T', TRONCO, PALMA, -37.5, float(z), alto=random.uniform(8.0, 11.0))
for cx, cz, radio, alto in ((1900.0, -900.0, 900.0, 110.0), (2100.0, 600.0, 1000.0, 130.0), (900.0, -2400.0, 900.0, 70.0)):   # Elefanta y la otra orilla de la bahía
    monte('T', MONTE_L, cx, cz, radio, alto, y0=MAR_Y, seg=20, anillos=5, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -60.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
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
    exportes=[('lugar-bombay', ['P', 'GN', 'EV', 'EP']), ('lugar-bombay-ciudad', ['C', 'G', 'T', 'CP'])],
    # De día, la receta de Salónica: sol fuerte y algo dorado, cielo muy flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.88, 0.7), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
