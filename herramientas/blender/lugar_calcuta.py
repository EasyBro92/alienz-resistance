# Calcuta: los jardines del Victoria Memorial, una tarde de monzón (09/10/2026).
#   blender -b -P herramientas/blender/lugar_calcuta.py              (entero)
#   blender -b -P herramientas/blender/lugar_calcuta.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_calcuta.py -- --reusar  (retocar la luz)
#
# Isidro eligió para Calcuta el VICTORIA MEMORIAL de frente al fondo, los alienz
# EN NAVE como siempre (es la misión de LA MADRE del delta), por la TARDE con
# cielo de monzón y con llegada larga.
#
# Cómo está puesto. Se mira al palacio por el paseo del jardín:
#   · EL PALACIO VA A 0,23 DE SU TAMAÑO (12,9 m hasta el Ángel; mide 56 y 103 de
#     ancho): jugando caben trece metros de alto al fondo, y el Memorial es su
#     silueta —la cúpula con el Ángel de la Victoria, los cuatro cupulines, las
#     dos alas de columnas y las torres de las esquinas—. La nave se posa delante
#     y la cúpula asoma por encima, en el hueco que deja el marcador.
#   · El paseo es de gravilla rojiza con charcos (acaba de llover), entre bordillos
#     de mármol; a los lados, césped, un estanque a la izquierda, palmeras y la
#     estatua de bronce en su pedestal. La base alien, en un ruedo a la derecha.
#   · Solo en el vuelo: el Maidan, la catedral de San Pablo, la avenida con los
#     taxis amarillos y la ciudad.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.35, 0.6, 0.72)                 # un claro entre nubes: a la espalda y algo a la izquierda
iniciar('calcuta', 3018, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.16, 0.18, 0.2))

ZF = -80.0                               # la cara del palacio
FONDO = 11.0                             # su fondo
ZC = ZF - FONDO / 2
Y_Z = 0.5                                # el zócalo
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
    """El paseo: gravilla rojiza apisonada, con rodadas, charcos de la lluvia y los
    bordillos de mármol; fuera, el césped mojado."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('gravel_stones', 256, 0xcba88a, 0.4))
    a *= (0.88 + 0.22 * nube(PH_, PW, 20, 5))[..., None]
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)
    hierba = tejar(foto('leafy_grass', 256, 0x7fa055, 0.5)) * (0.9 + 0.2 * nube(PH_, PW, 24, 6))[..., None]
    fuera = np.abs(xs) > 8.1
    a[:, fuera] = hierba[:, fuera]
    marmol = tejar(foto('marble_01', 256, 0xdcd8d0, 0.3))
    for x0, x1 in ((-8.1, -7.75), (7.75, 8.1)):
        (c0, _), (c1, _) = a_px(x0, 0), a_px(x1, 0)
        a[:, c0:c1] = marmol[:, c0:c1]
        a[:, c0:c0 + 1] *= 0.7; a[:, c1 - 1:c1] *= 0.7
        a[::int(1.5 * KZ), c0:c1] *= 0.7
    for x in (-4.6, -2.9, 2.9, 4.6):                                      # las rodadas
        (c, _) = a_px(x, 0)
        a[:, c - 5:c + 5] *= (0.86 + 0.08 * nube(PH_, 10, 40, 2))[..., None]
    # Los charcos: el cielo gris en el agua, con el borde de gravilla mojada.
    cielo = np.array((0.66, 0.67, 0.68), np.float32)
    ch = nube(PH_, PW, 26, 7)
    charco = np.clip((ch - 0.73) / 0.04, 0, 1) * (np.abs(xs) < 7.5)[None, :]
    mojado = np.clip((ch - 0.62) / 0.1, 0, 1) * (np.abs(xs) < 7.7)[None, :]
    a *= (1 - 0.3 * mojado)[..., None]
    a = a * (1 - charco[..., None]) + cielo * (0.9 + 0.14 * nube(PH_, PW, 60, 9))[..., None] * charco[..., None]
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.2, -13.0, 1.5), (4.8, -31.0, 1.6), (-1.0, -50.0, 1.4)):   # la guerra
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.42)
    for _ in range(900):
        c, f = random.randrange(1, PW - 2), random.randrange(1, PH_ - 2)
        a[f, c] = a[f, c] * 0.5 + np.array((0.86, 0.8, 0.72), np.float32) * 0.5
    return guardar('pista', np.clip(a, 0, 1), 88)

def arco_px (a, cx, y_pie, y_arr, medio, color):
    """Un arco de medio punto, en píxeles (y hacia abajo)."""
    Hh, W = a.shape[:2]
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    m = ((np.abs(xx - cx) < medio) & (yy <= y_pie) & (yy >= y_arr)) | ((((xx - cx) / medio) ** 2 + ((yy - y_arr) / medio) ** 2 < 1) & (yy <= y_arr))
    a[m] = color
    return m

def tex_ala ():
    """Un tramo de ala (6 × 4,2 m): arriba la galería de columnas, abajo los arcos del basamento."""
    W, Hh = 256, 192
    a = np.tile(foto('marble_01', 64, 0xeeeae2, 0.25), (3, 4, 1))
    a *= (0.95 + 0.08 * nube(Hh, W, 4, 6))[..., None]
    for k in range(4):
        cx = k * 64 + 32
        a[30:100, cx - 22:cx + 22] = np.array((0.34, 0.33, 0.34))                 # el hueco de la galería, en sombra
        a[30:100, cx - 26:cx - 21] = (0.93, 0.92, 0.88); a[30:100, cx + 21:cx + 26] = (0.93, 0.92, 0.88)   # las columnas
        a[26:31, cx - 28:cx + 28] = (0.96, 0.95, 0.91)
        a[92:100, cx - 20:cx + 20] = (0.84, 0.82, 0.78)                           # la balaustrada
        arco_px(a, cx, 186, 140, 15, (0.4, 0.38, 0.38))
        arco_px(a, cx, 186, 144, 10, (0.2, 0.19, 0.2))
    a[100:108] = np.clip(a[100:108] * 1.05, 0, 1); a[108:112] *= 0.74             # la cornisa intermedia
    a[:10] = np.clip(a[:10] * 1.05, 0, 1); a[10:16] *= 0.72; a[16:22] = np.clip(a[16:22] * 1.04, 0, 1)   # el entablamento
    a[186:] *= 0.9
    return guardar('ala-memorial', np.clip(a, 0, 1), 90)

def tex_central ():
    """El pabellón central (9 × 6 m): el gran arco de la entrada entre dos pares de columnas, y el frontón."""
    W, Hh = 384, 256
    a = np.tile(foto('marble_01', 64, 0xf0ece4, 0.25), (4, 6, 1))
    a *= (0.95 + 0.08 * nube(Hh, W, 4, 6))[..., None]
    arco_px(a, W / 2, Hh, 120, 62, (0.5, 0.48, 0.47))
    arco_px(a, W / 2, Hh, 124, 52, (0.2, 0.19, 0.2))
    a[150:Hh, W // 2 - 2:W // 2 + 2] = (0.34, 0.32, 0.32)
    for s in (-1, 1):
        for d in (92, 122):
            c = W // 2 + s * d
            a[52:Hh, c - 9:c + 9] = np.clip(a[52:Hh, c - 9:c + 9] * 1.06, 0, 1)
            a[52:Hh, c - 10:c - 8] *= 0.72; a[52:Hh, c + 8:c + 10] *= 0.72
            a[46:54, c - 13:c + 13] = (0.96, 0.95, 0.91)
        a[60:Hh, W // 2 + s * 107 - 5:W // 2 + s * 107 + 5] *= 0.7                 # la sombra entre cada par
        for y in (90, 170):                                                       # ventanas de los costados
            arco_px(a, W // 2 + s * 165, y + 40, y, 12, (0.24, 0.23, 0.25))
    a[34:46] = np.clip(a[34:46] * 1.05, 0, 1); a[28:34] *= 0.72; a[:28] = np.clip(a[:28] * 1.03, 0, 1)
    return guardar('central-memorial', np.clip(a, 0, 1), 90)

def tex_tambor ():
    """El tambor de la cúpula: ventanas de arco entre pilastras."""
    a = foto('marble_01', 64, 0xeeeae2, 0.25).copy()
    arco_px(a, 32, 56, 26, 11, (0.26, 0.25, 0.27))
    a[:6] = np.clip(a[:6] * 1.06, 0, 1); a[6:9] *= 0.72; a[58:] *= 0.86
    a[:, :4] = np.clip(a[:, :4] * 1.06, 0, 1); a[:, 60:] = np.clip(a[:, 60:] * 1.06, 0, 1)
    return guardar('tambor-memorial', np.clip(a, 0, 1), 90)

PISTA = material('pista', tex_pista(), rug=0.9)
ALA = material('ala-memorial', tex_ala(), rug=0.6)
CENTRAL = material('central-memorial', tex_central(), rug=0.6)
TAMBOR = material('tambor-memorial', tex_tambor(), rug=0.6)
MARMOL = material('marmol', de_polyhaven('marble_01', 512, 0xeeeae2, 0.25), rug=0.5)
GRAVA = material('grava', de_polyhaven('gravel_stones', 512, 0xcba88a, 0.4), rug=1.0)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x7fa055, 0.5), rug=1.0)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xa59c8c, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.56, 0.54, 0.5)))
# OJO: los colores lisos van en LINEAL.
BLANCO = material('marmol-liso', color=(0.78, 0.76, 0.72), rug=0.5)
BRONCE = material('bronce', color=(0.04, 0.07, 0.05), rug=0.5)
NEGRO_B = material('bronce-negro', color=(0.02, 0.022, 0.022), rug=0.4)
PIZARRA = material('pizarra', color=(0.2, 0.22, 0.24), rug=0.7)
ESTANQUE = material('estanque', color=(0.42, 0.47, 0.5), rug=0.1)                    # el cielo gris en el agua (va sin luz)
FUNDICION = material('fundicion', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
TAXI = material('taxi', color=(0.85, 0.6, 0.02), rug=0.4)
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
PIEDRA_G = material('piedra-gris', color=(0.5, 0.48, 0.44), rug=0.9)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.04, 0.12, 0.04), (0.06, 0.15, 0.05), (0.09, 0.18, 0.06)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.14, 0.04), (0.08, 0.17, 0.05)])]
TRONCO = material('tronco', color=(0.09, 0.07, 0.05))
MONTE_L = material('monte-lejos', color=(0.3, 0.36, 0.36), rug=1.0)
FACHADAS = [material(f'f-calcuta-{i}', tex_postigos(f'calcuta-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.82, 0.74, 0.56), (0.2, 0.36, 0.26)), ((0.74, 0.6, 0.5), (0.3, 0.26, 0.2)), ((0.86, 0.84, 0.76), (0.22, 0.36, 0.3)), ((0.7, 0.66, 0.6), (0.4, 0.2, 0.16))])] + \
    [material(f'f-pisos-{i}', tex_crema(f'calcuta-p{i}', c, balcon=0.7)) for i, c in enumerate([(0.84, 0.8, 0.72), (0.76, 0.78, 0.76)])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.82, 0.8)), (0.08, (0.74, 0.76, 0.78)), (0.3, (0.56, 0.6, 0.66)), (0.6, (0.42, 0.47, 0.56)), (1.0, (0.32, 0.38, 0.5))],
    (SOL[0], SOL[2]), 0.42, (0.4, 0.34, 0.24), ((0.96, 0.94, 0.9), (0.44, 0.46, 0.5)), cuanta_nube=0.62), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL JARDÍN
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
JX, JZ0, JZ1 = 210.0, -420.0, 190.0                                                # (hondo por detrás: con la ciudad pegada, el palacio parecía una maqueta)                                                # el recinto del jardín
suelo('GN', CESPED, -JX, PX0, JZ0, JZ1, 0.0, 6.0)
suelo('GN', CESPED, PX1, JX, JZ0, JZ1, 0.0, 6.0)
suelo('GN', GRAVA, PX0, PX1, PZ1, JZ1, 0.0, 3.0)
suelo('GN', GRAVA, PX0, PX1, JZ0, PZ0, 0.0, 3.0)
CAMINO = material('camino', imagen_de(GRAVA), rug=1.0)                              # encima del césped: material propio
rect('GN', CAMINO, -40.0, 40.0, ZF + 2.0, ZF + 14.0, 0.04, 3.0)                     # la explanada de delante del palacio
for s in (-1, 1):
    rect('GN', CAMINO, min(s * 40.0, s * 46.0), max(s * 40.0, s * 46.0), JZ0 + 20.0, JZ1 - 20.0, 0.04, 3.0)
# El estanque de la izquierda, con su brocal.
EX0, EX1, EZ0, EZ1 = -40.0, -13.0, -58.0, -8.0
AGUA = material('agua-camino', imagen_de(GRAVA), rug=1.0)
rect('EP', ESTANQUE, EX0, EX1, EZ0, EZ1, 0.06, 20.0)
for x0, x1, z0, z1 in ((EX0 - 0.4, EX1 + 0.4, EZ1, EZ1 + 0.4), (EX0 - 0.4, EX1 + 0.4, EZ0 - 0.4, EZ0), (EX1, EX1 + 0.4, EZ0, EZ1), (EX0 - 0.4, EX0, EZ0, EZ1)):
    viga('P', MARMOL, x0, x1, z0, z1, 0.0, 0.3, u_m=2.0, techo=MARMOL)

def farola (x, z, alto=4.6):
    torno('EV', FUNDICION, en(x, z), [(0.24, 0.0), (0.18, 0.5), (0.08, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', FAROL, x, z, alto + 0.22, 0.24, 0.3, sub=1, baila=0.0)
for z in np.arange(6.0, -62.0, -17.0):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        farola(s * 8.6, float(z))
for z in np.arange(10.0, -62.0, -9.5):                                              # las palmeras reales del paseo
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 8.0:
            continue
        palmera('EV', TRONCO, PALMA, s * 10.8, float(z) + 3.0, alto=random.uniform(6.0, 7.5))
for _ in range(26):                                                                 # la arboleda de la derecha, la que se ve jugando
    x, z = random.uniform(15.0, 34.0), random.uniform(-60.0, 6.0)
    if math.hypot(x - BASE[0], z - BASE[1]) < 8.5:
        continue
    arbol('EV', TRONCO, HOJAS, x, z, random.uniform(0.9, 1.4))
for _ in range(520):
    x, z = random.uniform(-JX + 6, JX - 6), random.uniform(JZ0 + 6, JZ1 - 6)
    if (abs(x) < 50.0 and z < 14.0) or abs(x) < 12.0 or abs(abs(x) - 43.0) < 5.0:
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.0, 1.8))
# El ruedo de la base alien.
torno('P', MARMOL, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.3), (4.8, 0.3), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(GRAVA), rug=1.0)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
# La estatua de bronce, sentada en su trono, y los dos leones del paseo.
EXS, EZS = -10.6, -30.0
viga('P', MARMOL, EXS - 1.3, EXS + 1.3, EZS - 1.3, EZS + 1.3, 0.0, 0.5, u_m=2.0, techo=MARMOL)
viga('P', MARMOL, EXS - 0.95, EXS + 0.95, EZS - 0.95, EZS + 0.95, 0.5, 2.4, u_m=2.0, techo=MARMOL)
bloque('EV', BRONCE, en(EXS, EZS - 0.2, 2.4), (1.2, 1.0, 1.5), mella=0.0)             # el trono
elipsoide('EV', BRONCE, en(EXS, EZS + 0.25, 3.2), (0.52, 0.5, 0.75))                  # el cuerpo, con el manto
elipsoide('EV', BRONCE, en(EXS, EZS + 0.3, 4.15), (0.22, 0.24, 0.27))                 # la cabeza
torno('EV', BRONCE, en(EXS, EZS + 0.3, 4.36), [(0.2, 0.0), (0.24, 0.14), (0.0, 0.2)], lados=8, tapas=(False, False))   # la corona
for s in (-1, 1):
    x, z = s * 10.4, -57.5
    if s > 0:
        x = 10.4
    viga('P', MARMOL, x - 0.7, x + 0.7, z - 1.4, z + 1.4, 0.0, 1.0, u_m=2.0, techo=MARMOL)
    elipsoide('EV', BLANCO, en(x, z - 0.2, 1.42), (0.42, 1.0, 0.44))
    elipsoide('EV', BLANCO, en(x, z + 0.8, 1.86), (0.34, 0.36, 0.38))

# ==================================================================================
# 3. EL VICTORIA MEMORIAL
# ==================================================================================
MC, HCn = 4.5, 6.0                                                                  # medio pabellón central y su alto
MA, HA = 12.0, 4.2                                                                  # hasta donde llegan las alas, y su alto
Y0 = Y_Z
viga('P', MARMOL, -MA - 2.2, MA + 2.2, ZF - FONDO - 1.0, ZF + 1.6, 0.0, Y_Z, u_m=2.0, techo=MARMOL)       # el zócalo
for k in range(3):                                                                  # la escalinata de la entrada
    viga('P', MARMOL, -MC + 0.4, MC - 0.4, ZF + 1.6, ZF + 2.2 + k * 0.5, 0.0, Y_Z * (3 - k) / 4, u_m=2.0, techo=MARMOL)
def cara_tex (mat, a_, b, y0, y1, u1, hacia, v1=1.0):
    cara('P', mat, [P(a_[0], a_[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y1), P(a_[0], a_[1], y1)], uvs=[(0, 0), (u1, 0), (u1, v1), (0, v1)], hacia=hacia)
# El pabellón central, adelantado, con su frontón.
zc0 = ZF + 0.9
cara_tex(CENTRAL, (-MC, zc0), (MC, zc0), Y0, Y0 + HCn, 1.0, V((0, -1, 0)))
cara_tex(CENTRAL, (MC, ZF - FONDO - 0.6), (-MC, ZF - FONDO - 0.6), Y0, Y0 + HCn, 1.0, V((0, 1, 0)))
for s in (-1, 1):
    p0, p1 = (s * MC, zc0), (s * MC, ZF - FONDO - 0.6)
    if s < 0:
        p0, p1 = p1, p0
    cara_tex(ALA, p0, p1, Y0 + HA, Y0 + HCn, 2.0, V((s, 0, 0)), v1=0.45)
cara('P', MARMOL, [P(-MC, zc0, Y0 + HCn), P(MC, zc0, Y0 + HCn), P(MC, ZF - FONDO - 0.6, Y0 + HCn), P(-MC, ZF - FONDO - 0.6, Y0 + HCn)], hacia=ARRIBA, baldosa=3.0)
extruido('P', MARMOL, en(0.0, zc0 - 0.2), [(-MC - 0.2, Y0 + HCn), (MC + 0.2, Y0 + HCn), (0.0, Y0 + HCn + 1.2)], 0.5, baldosa=3.0)    # el frontón
# Las dos alas, con su galería, y las torres de las esquinas.
for s in (-1, 1):
    x0, x1 = (MC, MA) if s > 0 else (-MA, -MC)
    cara_tex(ALA, (x0, ZF), (x1, ZF), Y0, Y0 + HA, (MA - MC) / 6.0, V((0, -1, 0)))
    cara_tex(ALA, (x1, ZF - FONDO), (x0, ZF - FONDO), Y0, Y0 + HA, (MA - MC) / 6.0, V((0, 1, 0)))
    cara('P', MARMOL, [P(x0, ZF, Y0 + HA), P(x1, ZF, Y0 + HA), P(x1, ZF - FONDO, Y0 + HA), P(x0, ZF - FONDO, Y0 + HA)], hacia=ARRIBA, baldosa=3.0)
    viga('P', MARMOL, x0, x1, ZF - 0.25, ZF + 0.25, Y0 + HA, Y0 + HA + 0.35, u_m=2.0, techo=MARMOL)      # la balaustrada de arriba
    xe = s * (MA + 1.0)                                                             # el lado, con su ala corta
    pa, pb = (xe + s * 1.2, ZF), (xe + s * 1.2, ZF - FONDO)
    if s < 0:
        pa, pb = pb, pa
    cara_tex(ALA, pa, pb, Y0, Y0 + HA, FONDO / 6.0, V((s, 0, 0)))
    for zt in (ZF + 0.3, ZF - FONDO - 0.3):                                         # las torres: cuerpo cuadrado, templete y cupulín
        viga('P', CENTRAL, xe - 1.3, xe + 1.3, zt - 1.3, zt + 1.3, Y0, Y0 + 5.4, u_m=7.0, techo=MARMOL)
        viga('P', MARMOL, xe - 1.5, xe + 1.5, zt - 1.5, zt + 1.5, Y0 + 5.4, Y0 + 5.7, u_m=2.0, techo=MARMOL)
        torno('P', TAMBOR, en(xe, zt, Y0 + 5.7), [(0.95, 0.0), (0.95, 1.0)], lados=8, u_rep=8, v_m=1.0, tapas=(False, False))
        torno('EV', BLANCO, en(xe, zt, Y0 + 6.7), [(1.08, 0.0), (1.08, 0.12), (0.9, 0.16), (0.82, 0.6), (0.5, 0.95), (0.0, 1.12)], lados=12, tapas=(True, False))
        barra('EV', BLANCO, P(xe, zt, Y0 + 7.8), P(xe, zt, Y0 + 8.3), 0.07)
# La cúpula: el tambor con sus ventanas, el casquete y la linterna con el Ángel de la Victoria.
YT = Y0 + HCn
viga('P', MARMOL, -3.0, 3.0, ZC - 3.0, ZC + 3.0, YT, YT + 0.5, u_m=2.0, techo=MARMOL)
torno('P', TAMBOR, en(0.0, ZC, YT + 0.5), [(2.25, 0.0), (2.25, 1.7)], lados=16, u_rep=16, v_m=1.7, tapas=(False, False))
torno('P', MARMOL, en(0.0, ZC, YT + 2.2), [(2.45, 0.0), (2.45, 0.16), (2.25, 0.2), (2.2, 0.8), (1.9, 1.6), (1.35, 2.25), (0.7, 2.62), (0.5, 2.7)], lados=22, u_rep=6, v_m=3.0, tapas=(True, False))
torno('EV', BLANCO, en(0.0, ZC, YT + 4.9), [(0.5, 0.0), (0.5, 0.5), (0.62, 0.55), (0.3, 0.9), (0.0, 1.0)], lados=8, tapas=(True, False))
# El Ángel: bronce negro, con la trompeta y las alas abiertas.
YA = YT + 5.9
elipsoide('EV', NEGRO_B, en(0.0, ZC, YA + 0.16), (0.2, 0.2, 0.16))                    # el globo
elipsoide('EV', NEGRO_B, en(0.0, ZC, YA + 0.72), (0.14, 0.14, 0.42))                  # el cuerpo
elipsoide('EV', NEGRO_B, en(0.0, ZC, YA + 1.2), (0.09, 0.09, 0.1))
for s in (-1, 1):
    cara('EV', NEGRO_B, [P(s * 0.08, ZC - 0.06, YA + 0.75), P(s * 0.62, ZC - 0.12, YA + 1.1), P(s * 0.5, ZC - 0.12, YA + 0.5)], hacia=V((0, -1, 0)))
    cara('EV', NEGRO_B, [P(s * 0.08, ZC - 0.07, YA + 0.75), P(s * 0.5, ZC - 0.13, YA + 0.5), P(s * 0.62, ZC - 0.13, YA + 1.1)], hacia=V((0, 1, 0)))
barra('EV', NEGRO_B, P(0.06, ZC + 0.08, YA + 1.12), P(0.3, ZC + 0.5, YA + 1.3), 0.04)
for sx in (-1, 1):                                                                  # los cuatro cupulines que la rodean
    for sz in (-1, 1):
        x, z = sx * 3.5, ZC + sz * 3.6
        torno('P', TAMBOR, en(x, z, YT), [(0.72, 0.0), (0.72, 0.9)], lados=8, u_rep=8, v_m=0.9, tapas=(False, False))
        torno('EV', BLANCO, en(x, z, YT + 0.9), [(0.84, 0.0), (0.84, 0.1), (0.7, 0.14), (0.62, 0.5), (0.36, 0.8), (0.0, 0.94)], lados=10, tapas=(True, False))
print('MEMORIAL', round(YA + 1.3, 2), 'm de alto;', 2 * (MA + 2.3), 'de ancho')

comprobar_paso(('E', 'EP', 'P', 'EV'))

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: EL MAIDAN, LA CATEDRAL, LA AVENIDA Y LA CIUDAD
# ==================================================================================
suelo('G', CESPED, -1500.0, -JX, -1500.0, 1500.0, 0.0, 12.0)                         # el Maidan, a la izquierda: prado hasta donde se ve
suelo('G', CESPED, -JX, JX, JZ1, 1500.0, 0.0, 12.0)
suelo('G', CALZADA, JX, JX + 16.0, -1500.0, 1500.0, 0.0, carriles=(JX, 4.0, 'z'))    # la avenida de la derecha
suelo('G', SOLAR, JX + 16.0, 1500.0, -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -JX, JX, -1500.0, JZ0, 0.0, 8.0)
z = -400.0
while z < 500.0:                                                                    # los taxis amarillos
    for carril in range(3):
        if random.random() < 0.6:
            x = JX + 2.0 + carril * 4.0
            cubo('T', TAXI, P(x, z + random.uniform(-3, 3), 0.55), (1.7, 4.2, 0.8))
            cubo('T', VIDRIO, P(x, z + random.uniform(-0.3, 0.3), 1.2), (1.5, 2.2, 0.5))
    z += random.uniform(7.0, 16.0)
# La catedral de San Pablo: blanca, gótica, con su torre.
CX, CZ = 120.0, -330.0
caja('T', BLANCO, CX - 9.0, CX + 9.0, CZ - 36.0, CZ + 20.0, 0.0, 16.0, techo=PIZARRA)
tejado('T', PIZARRA, CX - 9.0, CX + 9.0, CZ - 36.0, CZ + 20.0, 16.0, 7.0)
caja('T', BLANCO, CX - 5.0, CX + 5.0, CZ - 6.0, CZ + 4.0, 0.0, 40.0, techo=PIZARRA)
torno('T', BLANCO, en(CX, CZ - 1.0, 40.0), [(4.0, 0.0), (2.4, 9.0), (0.0, 22.0)], lados=4, tapas=(False, False))
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 36.0):
    for gz in np.arange(-1250.0, 1250.0, 36.0):
        cx, cz = gx + 18 + random.uniform(-4, 4), gz + 18 + random.uniform(-4, 4)
        dentro = (cx > JX + 22.0) or (cz < JZ0 - 16.0 and cx > -JX - 100.0 and not (abs(cx - CX) < 60.0 and abs(cz - CZ) < 70.0))
        if not dentro or random.random() < 0.16:
            continue
        ax, az = random.choice((10.5, 12.0, 13.5)), random.choice((10.5, 12.0, 13.5))
        alto = random.choice([12, 15, 18, 21]) + (random.choice([0, 0, 24, 50]) if cx > JX + 60.0 else 0)
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, alto, techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for _ in range(360):                                                                # los árboles sueltos del Maidan
    x, z = random.uniform(-1300.0, -JX - 10.0), random.uniform(-1200.0, 1200.0)
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.4, 2.6))
for cx, cz, radio, alto in ((-1900.0, -1700.0, 1000.0, 30.0), (1700.0, -2000.0, 1100.0, 34.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=20, anillos=4, pico=0.7)

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
    exportes=[('lugar-calcuta', ['P', 'GN', 'EV', 'EP']), ('lugar-calcuta-ciudad', ['G', 'T', 'CP'])],
    # Monzón: un claro de sol blanco entre nubes y mucho cielo gris. El cielo de
    # Blender es azul, así que se le baja el color (`satura`) para que la sombra salga gris.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.76), sol_fuerza=6.0, sol_ancho=8.0, cielo_fuerza=0.15, cielo_altura=40, cielo_giro=150,
    escala=0.7, satura=0.6, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
