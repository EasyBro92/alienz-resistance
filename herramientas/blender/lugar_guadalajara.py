# Guadalajara: la plaza, delante de la catedral, a media tarde (10/10/2026).
#   blender -b -P herramientas/blender/lugar_guadalajara.py              (entero)
#   blender -b -P herramientas/blender/lugar_guadalajara.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_guadalajara.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Se conserva el sitio de la misión —la plaza frente a la catedral—,
# ahora en Blender. Guadalajara son las dos agujas de azulejo amarillo de su
# catedral; los alienz SALEN DE LA CATEDRAL («aquí reparan lo que les rompemos»);
# a MEDIA TARDE, con luz dorada.
#
# Cómo está puesto:
#   · LA CATEDRAL VA A 0,2 DE SU TAMAÑO (13 m hasta la punta de las agujas; mide
#     65): es su silueta —la portada entre las dos torres y las dos agujas— o no
#     se reconoce.
#   · Los alienz nacen dentro y salen por la puerta (2,4 m) en abanico (`abanico`).
#   · La plaza de cantera con naranjos, bancos y farolas; a la izquierda el
#     quiosco de hierro de la Plaza de Armas; la base alien en un ruedo a la derecha.
#   · Solo en el vuelo: el Sagrario, el Palacio de Gobierno, el Teatro Degollado
#     y la ciudad.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.36, 0.5, 0.79)                 # media tarde: a la espalda y algo a la izquierda
iniciar('guadalajara', 3928, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.26, 0.2, 0.14))

ZF = -76.0                               # la cara de la catedral
MF = 2.6                                 # media portada (entre torres)
MT = 1.15                                # media torre
XT = MF + MT                             # el eje de cada torre
H_CUERPO, H_TORRE = 5.4, 7.6
PUERTA, H_PUERTA = 1.2, 3.0
Y_ATRIO = 0.0
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
    """La plaza: losas de cantera rosada y gris en damero, con cenefas, y lo que deja el uso y la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    clara = tejar(foto('concrete_floor_worn_001', 256, 0xd2c0ac, 0.5))
    rosa = tejar(foto('stone_pavers', 256, 0xccb09e, 0.5))
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    mx, mz = (xx / KX) % 2.4, (yy / KZ) % 2.4
    a = np.where((((mx < 1.2) ^ (mz < 1.2)))[..., None], clara, rosa)
    a[(mx % 1.2 < 0.04) | (mz % 1.2 < 0.04)] *= 0.74
    gris = tejar(foto('rock_tile_floor', 128, 0x8c8884, 0.6))
    for x in (-7.8, 7.8, 0.0):
        (c0, _), (c1, _) = a_px(x - 0.3, 0), a_px(x + 0.3, 0)
        a[:, c0:c1] = gris[:, c0:c1]
    for z in np.arange(-54.0, 12.0, 12.0):
        (_, f0), (_, f1) = a_px(0, z - 0.3), a_px(0, z + 0.3)
        a[max(0, f0):f1] = gris[max(0, f0):f1]
    a *= (0.9 + 0.16 * nube(PH_, PW, 16, 4))[..., None]
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx_ = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx_ - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for _ in range(40):
        mancha(random.uniform(-9, 9), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.1), random.uniform(0.8, 0.93), random.uniform(0.6, 1.5))
    for x, z, r_ in ((4.2, -14.0, 1.5), (-4.6, -33.0, 1.6), (1.2, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    for k in range(7):                                                   # el rastro que sale de la catedral
        x, z = -2.0 + k * 0.66 + random.uniform(-0.2, 0.2), PZ0
        for i in range(int(random.uniform(4.0, 12.0) * KZ)):
            x += random.uniform(-0.02, 0.02); z += 1 / KZ
            c, f = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f < PH_:
                a[f, c - 2:c + 3] = a[f, c - 2:c + 3] * 0.55 + np.array((0.04, 0.14, 0.08), np.float32) * 0.45
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_portada ():
    """La portada (5,2 × 5,4 m, entre las dos torres): la puerta de arco entre columnas
    pareadas, el relieve de encima, el reloj y el frontón."""
    W, Hh = 256, 256
    a = np.tile(foto('yellow_stone_wall', 128, 0xb9a488, 0.4), (2, 2, 1))
    fy = lambda y: int((1 - y / H_CUERPO) * Hh)
    fx = lambda x: int((x / (2 * MF) + 0.5) * W)
    yy, xx = np.mgrid[0:Hh, 0:W]
    arco = (((xx - W / 2) / (fx(PUERTA) - W / 2)) ** 2 + ((yy - fy(H_PUERTA - 1.0)) / (fy(H_PUERTA - 1.0) - fy(H_PUERTA + 0.3))) ** 2 < 1) & (yy <= fy(H_PUERTA - 1.0))
    a[arco] = (0.3, 0.24, 0.18)                                          # el tímpano del arco, en sombra (la puerta de verdad va debajo)
    for s in (-1, 1):
        for d in (1.5, 2.0):
            c = fx(s * d)
            a[fy(3.6):Hh, c - 6:c + 6] = np.clip(a[fy(3.6):Hh, c - 6:c + 6] * 1.14, 0, 1)
            a[fy(3.6):Hh, c + 6:c + 8] *= 0.66
    a[fy(3.8):fy(3.6)] = np.clip(a[fy(3.8):fy(3.6)] * 1.14, 0, 1); a[fy(3.6):fy(3.6) + 3] *= 0.66
    a[fy(4.6):fy(3.95), fx(-1.0):fx(1.0)] *= 0.8                          # el relieve de la Asunción, a bulto
    a[fy(4.5):fy(4.05), fx(-0.3):fx(0.3)] = np.clip(a[fy(4.5):fy(4.05), fx(-0.3):fx(0.3)] * 1.3, 0, 1)
    a[:6] = np.clip(a[:6] * 1.12, 0, 1); a[6:9] *= 0.66
    return guardar('portada-gdl', np.clip(a, 0, 1), 90)

def tex_torre ():
    """Una cara de torre (2,3 × 7,6 m): cantera, con la ventana alargada de cada cuerpo y sus cornisas."""
    W, Hh = 64, 256
    a = np.tile(foto('yellow_stone_wall', 64, 0xb9a488, 0.4), (4, 1, 1))
    yy, xx = np.mgrid[0:Hh, 0:W]
    for y0, y1 in ((150, 226), (56, 126)):
        v = ((np.abs(xx - 32) < 9) & (yy > y0 + 9) & (yy < y1)) | (((xx - 32) / 9.0) ** 2 + ((yy - y0 - 9) / 9.0) ** 2 < 1)
        a[v] = (0.14, 0.12, 0.12)
    for f in (136, 40, 0):
        a[f:f + 6] = np.clip(a[f:f + 6] * 1.14, 0, 1); a[f + 6:f + 9] *= 0.66
    return guardar('torre-gdl', np.clip(a, 0, 1), 90)

def tex_aguja ():
    """El azulejo de las agujas: amarillo con espigas azules."""
    n = 64
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    m = ((xx + np.abs((yy % 16) - 8) * 1.4) % 16) < 5
    a = np.where(m[..., None], np.array((0.14, 0.26, 0.56), np.float32), np.array((0.9, 0.7, 0.14), np.float32))
    a *= (0.9 + 0.2 * nube(n, n, 4, 4))[..., None]
    return guardar('aguja-gdl', np.clip(a, 0, 1), 90)

PISTA = material('pista', tex_pista(), rug=0.9)
LOSA = material('losa', de_polyhaven('concrete_floor_worn_001', 512, 0xd2c0ac, 0.5), rug=0.9)
PORTADA = material('portada-gdl', tex_portada(), rug=0.9)
TORRE = material('torre-gdl', tex_torre(), rug=0.9)
AGUJA = material('aguja-gdl', tex_aguja(), rug=0.5)
CANTERA = material('cantera', de_polyhaven('yellow_stone_wall', 512, 0xb9a488, 0.4), rug=0.95)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x86a458, 0.5), rug=1.0)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xb0a696, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.6, 0.54, 0.46)))
# OJO: los colores lisos van en LINEAL.
PIEDRA = material('piedra', color=(0.44, 0.36, 0.26), rug=0.9)
ORO = material('oro', color=(0.7, 0.45, 0.1), rug=0.3)
HIERRO = material('hierro-verde', color=(0.03, 0.08, 0.06), rug=0.6)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
NARANJA = material('naranja', color=(0.9, 0.36, 0.03), rug=0.6)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.04, 0.12, 0.04), (0.06, 0.15, 0.05)])]
TRONCO = material('tronco', color=(0.1, 0.07, 0.05))
MONTE_L = material('monte-lejos', color=(0.36, 0.34, 0.4), rug=1.0)
FACHADAS = [material(f'f-gdl-{i}', tex_postigos(f'gdl-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.86, 0.76, 0.6), (0.3, 0.2, 0.14)), ((0.8, 0.6, 0.46), (0.3, 0.26, 0.2)), ((0.9, 0.86, 0.76), (0.2, 0.3, 0.26)), ((0.84, 0.72, 0.5), (0.36, 0.2, 0.14))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.94, 0.86, 0.72)), (0.07, (0.84, 0.86, 0.86)), (0.25, (0.56, 0.72, 0.9)), (0.6, (0.32, 0.52, 0.86)), (1.0, (0.18, 0.38, 0.78))],
    (SOL[0], SOL[2]), 0.3, (0.5, 0.36, 0.16), ((1.0, 0.94, 0.82), (0.86, 0.86, 0.9)), cuanta_nube=0.2), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA PLAZA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
PL = 60.0                                                                           # media plaza
PLZ0, PLZ1 = -70.0, 160.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSA, -PL, PX0, PLZ0, PLZ1, 0.0, 2.4)
suelo('GN', LOSA, PX1, PL, PLZ0, PLZ1, 0.0, 2.4)
suelo('GN', LOSA, PX0, PX1, PZ1, PLZ1, 0.0, 2.4)
suelo('GN', LOSA, PX0, PX1, PLZ0, PZ0, 0.0, 2.4)
JARDIN = material('jardin', imagen_de(CESPED), rug=1.0)
def naranjo (x, z, grupo='EV'):
    """El naranjo de la plaza: copa redonda, recortada, con sus naranjas."""
    barra(grupo, TRONCO, P(x, z, 0.0), P(x, z, 2.0), 0.22)
    copa(grupo, random.choice(HOJAS), x, z, 3.1, 1.5, 1.4, sub=1, baila=0.06)
    for _ in range(6):
        a_, b = random.uniform(0, 6.28), random.uniform(-0.5, 0.7)
        cubo(grupo, NARANJA, P(x + 1.4 * math.cos(a_) * math.cos(b), z + 1.4 * math.sin(a_) * math.cos(b), 3.1 + 1.3 * math.sin(b)), (0.22, 0.22, 0.22))
def banco (x, z, s):
    cubo('EV', HIERRO, P(x, z, 0.46), (0.5, 1.8, 0.07))
    cubo('EV', HIERRO, P(x + s * 0.24, z, 0.76), (0.06, 1.8, 0.5))
    for dz in (-0.7, 0.7):
        cubo('EV', HIERRO, P(x, z + dz, 0.22), (0.46, 0.08, 0.44))
def farola (x, z, alto=4.8):
    torno('EV', HIERRO, en(x, z), [(0.24, 0.0), (0.18, 0.5), (0.08, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    for d in (-0.5, 0.5):
        barra('EV', HIERRO, P(x, z, alto - 0.3), P(x + d, z, alto), 0.05)
        copa('EV', FAROL, x + d, z, alto + 0.2, 0.2, 0.26, sub=1, baila=0.0)
for z in np.arange(8.0, -62.0, -8.8):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 8.0:
            continue
        naranjo(s * 10.8, float(z))
for z in np.arange(4.0, -62.0, -17.6):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        farola(s * 8.7, float(z))
        banco(s * 9.6, float(z) - 4.4, s)
# El quiosco de la Plaza de Armas, a la izquierda: hierro verde, con su tejadillo.
QX, QZ = -18.0, -30.0
torno('P', CANTERA, en(QX, QZ), [(4.4, 0.0), (4.4, 1.0), (4.0, 1.0)], lados=8, u_rep=8, v_m=1.5, tapas=(False, True))
for i in range(8):
    a_ = 2 * math.pi * i / 8 + math.pi / 8
    barra('EV', HIERRO, P(QX + 3.6 * math.cos(a_), QZ + 3.6 * math.sin(a_), 1.0), P(QX + 3.6 * math.cos(a_), QZ + 3.6 * math.sin(a_), 4.2), 0.14)
    a2 = a_ + 2 * math.pi / 8
    barra('EV', HIERRO, P(QX + 3.6 * math.cos(a_), QZ + 3.6 * math.sin(a_), 1.9), P(QX + 3.6 * math.cos(a2), QZ + 3.6 * math.sin(a2), 1.9), 0.08)
torno('EV', HIERRO, en(QX, QZ, 4.2), [(4.4, 0.0), (4.4, 0.16), (3.0, 1.0), (1.0, 1.9), (0.0, 2.8)], lados=8, tapas=(True, False))
for s, zz in ((-1, -56.0), (-1, -6.0), (1, -66.0), (1, -18.0)):                       # cuadros de jardín
    x0, x1 = (13.0, 24.0) if s > 0 else (-36.0, -25.0)
    rect('GN', JARDIN, x0, x1, zz, zz + 12.0, 0.06, 6.0)
# El ruedo de la base alien.
torno('P', CANTERA, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.34), (4.8, 0.34), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(LOSA), rug=0.9)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.08) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. LA CATEDRAL
# ==================================================================================
def cara_tex (mat, a_, b, y0, y1, u0, u1, v0, v1, hacia):
    cara('P', mat, [P(a_[0], a_[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y1), P(a_[0], a_[1], y1)], uvs=[(u0, v0), (u1, v0), (u1, v1), (u0, v1)], hacia=hacia)
u_de = lambda x: (x + MF) / (2 * MF)
# La portada, en tres trozos: la puerta queda abierta de verdad.
cara_tex(PORTADA, (-MF, ZF), (-PUERTA, ZF), 0.0, H_CUERPO, 0.0, u_de(-PUERTA), 0.0, 1.0, V((0, -1, 0)))
cara_tex(PORTADA, (PUERTA, ZF), (MF, ZF), 0.0, H_CUERPO, u_de(PUERTA), 1.0, 0.0, 1.0, V((0, -1, 0)))
cara_tex(PORTADA, (-PUERTA, ZF), (PUERTA, ZF), H_PUERTA, H_CUERPO, u_de(-PUERTA), u_de(PUERTA), H_PUERTA / H_CUERPO, 1.0, V((0, -1, 0)))
extruido('P', CANTERA, en(0.0, ZF - 0.15), [(-MF, H_CUERPO), (MF, H_CUERPO), (0.0, H_CUERPO + 1.3)], 0.3, baldosa=2.0)     # el frontón
cara('EP', NEGRO, [P(0.5 * math.cos(a_), ZF + 0.02, H_CUERPO + 0.42 + 0.5 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 12, endpoint=False)], hacia=V((0, -1, 0)))   # el reloj
# Las dos torres: el fuste cuadrado y, encima, la aguja de azulejo sobre su tambor.
for s in (-1, 1):
    x = s * XT
    for (ax, az), (bx, bz), h in (((x - MT, ZF + 0.3), (x + MT, ZF + 0.3), V((0, -1, 0))), ((x + MT, ZF + 0.3), (x + MT, ZF - 2.0), V((1, 0, 0))),
                                  ((x + MT, ZF - 2.0), (x - MT, ZF - 2.0), V((0, 1, 0))), ((x - MT, ZF - 2.0), (x - MT, ZF + 0.3), V((-1, 0, 0)))):
        cara_tex(TORRE, (ax, az), (bx, bz), 0.0, H_TORRE, 0.0, 1.0, 0.0, 1.0, h)
    zt = ZF - 0.85
    viga('P', CANTERA, x - MT - 0.15, x + MT + 0.15, zt - MT - 0.15, zt + MT + 0.15, H_TORRE, H_TORRE + 0.25, u_m=2.0, techo=CANTERA)
    torno('P', CANTERA, en(x, zt, H_TORRE + 0.25), [(0.95, 0.0), (0.95, 0.9), (1.05, 1.0)], lados=8, u_rep=4, v_m=2.0, tapas=(False, False))
    torno('P', AGUJA, en(x, zt, H_TORRE + 1.25), [(1.0, 0.0), (0.16, 3.6), (0.0, 3.9)], lados=8, u_rep=8, v_m=1.0, tapas=(False, False))
    barra('EV', ORO, P(x, zt, H_TORRE + 5.1), P(x, zt, H_TORRE + 5.6), 0.06)
    for dx, dz in ((MT, MT), (MT, -MT), (-MT, MT), (-MT, -MT)):                       # los pináculos de las esquinas
        torno('EV', PIEDRA, en(x + dx, zt + dz, H_TORRE + 0.25), [(0.16, 0.0), (0.0, 0.9)], lados=4, tapas=(False, False))
# La nave, detrás, y su cúpula de azulejo.
LARGO = 16.0
caja('P', CANTERA, -MF - 2 * MT + 0.1, MF + 2 * MT - 0.1, ZF - LARGO, ZF - 2.0, 0.0, H_CUERPO - 0.6, techo=PIEDRA, baldosa=2.4)
torno('P', CANTERA, en(0.0, ZF - LARGO + 3.4, H_CUERPO - 0.6), [(1.7, 0.0), (1.7, 0.9)], lados=10, u_rep=5, v_m=2.0, tapas=(False, False))
torno('P', AGUJA, en(0.0, ZF - LARGO + 3.4, H_CUERPO + 0.3), [(1.8, 0.0), (1.6, 0.8), (1.0, 1.5), (0.3, 1.9), (0.0, 2.0)], lados=12, u_rep=12, v_m=1.0, tapas=(False, False))
# Por dentro: a oscuras. (El paño del fondo va DELANTE de la caja de la nave, que si no se veía clara por la puerta.)
cara('EP', NEGRO, [P(-PUERTA, ZF - 1.9, 0.0), P(PUERTA, ZF - 1.9, 0.0), P(PUERTA, ZF - 1.9, H_PUERTA), P(-PUERTA, ZF - 1.9, H_PUERTA)], hacia=V((0, -1, 0)))
for s in (-1, 1):
    cara('EP', NEGRO, [P(s * PUERTA, ZF, 0.0), P(s * PUERTA, ZF - 5.0, 0.0), P(s * PUERTA, ZF - 5.0, H_PUERTA), P(s * PUERTA, ZF, H_PUERTA)], hacia=V((-s, 0, 0)))
cara('EP', NEGRO, [P(-PUERTA, ZF - 5.0, 0.0), P(PUERTA, ZF - 5.0, 0.0), P(PUERTA, ZF - 5.0, H_PUERTA), P(-PUERTA, ZF - 5.0, H_PUERTA)], hacia=V((0, -1, 0)))
cara('EP', NEGRO, [P(-PUERTA, ZF, H_PUERTA), P(PUERTA, ZF, H_PUERTA), P(PUERTA, ZF - 5.0, H_PUERTA), P(-PUERTA, ZF - 5.0, H_PUERTA)], hacia=V((0, 0, -1)))
cara('EP', NEGRO, [P(-PUERTA, ZF, 0.01), P(PUERTA, ZF, 0.01), P(PUERTA, ZF - 5.0, 0.01), P(-PUERTA, ZF - 5.0, 0.01)], hacia=ARRIBA)
for x, y, r in ((-0.6, 1.0, 0.34), (0.5, 2.0, 0.26), (0.1, 0.5, 0.2)):
    cara('EP', BRILLO_HONDO if r > 0.3 else VERDE, [P(x + r * math.cos(a_), ZF - 1.86, y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(5):
    x = -1.0 + k * 0.5
    barra('EV', RESINA, P(x, ZF - 0.6, 0.05), P(x * 2.2 + random.uniform(-0.3, 0.3), ZF + random.uniform(3.0, 7.0), 0.04), 0.2)
# La reja del atrio, a los lados de la entrada.
for s in (-1, 1):
    for x in np.arange(XT + MT + 0.6, 12.0, 1.0):
        barra('EV', HIERRO, P(s * float(x), ZF + 2.4, 0.0), P(s * float(x), ZF + 2.4, 1.3), 0.06)
    barra('EV', HIERRO, P(s * (XT + MT + 0.6), ZF + 2.4, 1.2), P(s * 12.0, ZF + 2.4, 1.2), 0.07)
print('CATEDRAL', H_TORRE + 5.6, 'm; puerta de', 2 * PUERTA)

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'), z_lejos=-66.0)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO (a la escala de la catedral, y la ciudad lejos)
# ==================================================================================
# El Sagrario, pegado a la catedral, con su cúpula; el Palacio de Gobierno y el Teatro Degollado.
caja('T', CANTERA, MF + 2 * MT + 0.4, 12.0, ZF - 10.0, ZF - 1.0, 0.0, 4.4, techo=PIEDRA, baldosa=2.4)
torno('T', AGUJA, en(8.4, ZF - 5.6, 4.4), [(2.0, 0.0), (2.0, 0.8), (1.5, 1.8), (0.5, 2.5), (0.0, 2.7)], lados=12, u_rep=12, v_m=1.0, tapas=(False, False))
caja('T', CANTERA, 34.0, 56.0, -60.0, -20.0, 0.0, 5.0, techo=AZOTEA, baldosa=2.4)                        # el Palacio de Gobierno
caja('T', CANTERA, -10.0, 10.0, ZF - 70.0, ZF - 50.0, 0.0, 5.4, techo=AZOTEA, baldosa=2.4)               # el Teatro Degollado, detrás
for x in np.arange(-8.0, 8.1, 2.0):
    barra('T', PIEDRA, P(float(x), ZF - 49.6, 0.0), P(float(x), ZF - 49.6, 4.2), 0.5)
suelo('G', LOSA, -PL, PL, -200.0, PLZ0, 0.0, 2.4)                                                         # la cruz de plazas, por detrás
suelo('G', SOLAR, -1500.0, -PL, -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, PL, 1500.0, -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -PL, PL, PLZ1, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -PL, PL, -1500.0, -200.0, 0.0, 8.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 36.0):
    for gz in np.arange(-1250.0, 1250.0, 36.0):
        cx, cz = gx + 18 + random.uniform(-4, 4), gz + 18 + random.uniform(-4, 4)
        if math.hypot(cx, cz + 60.0) < 330.0 or random.random() < 0.2:                # lejos: a su tamaño, al lado, la catedral era una maqueta
            continue
        ax, az = random.choice((11.0, 12.5, 14.0)), random.choice((11.0, 12.5, 14.0))
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, random.choice([8, 11, 14, 17]), techo=AZOTEA)
        n_ed += 1
for _ in range(240):                                                                 # entre la plaza y la ciudad, arboledas
    a_, d = random.uniform(0, 6.28), random.uniform(90.0, 320.0)
    x, z = d * math.cos(a_), -60.0 + d * math.sin(a_)
    if abs(x) < PL + 4.0 and PLZ0 - 4.0 < z < PLZ1 + 4.0:
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.4, 2.4))
print('EDIFICIOS', n_ed)
for cx, cz, radio, alto in ((-1900.0, -1700.0, 1000.0, 140.0), (1800.0, -1900.0, 1000.0, 160.0), (200.0, 2400.0, 1200.0, 120.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=18, anillos=4, pico=0.8)

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
    exportes=[('lugar-guadalajara', ['P', 'GN', 'EV', 'EP']), ('lugar-guadalajara-ciudad', ['G', 'T', 'CP'])],
    # Media tarde: el sol de día, pero más dorado y algo más bajo.
    sol_hacia=SOL, sol_color=(1.0, 0.8, 0.56), sol_fuerza=7.0, cielo_fuerza=0.13, cielo_altura=30, cielo_giro=160,
    escala=0.66, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
