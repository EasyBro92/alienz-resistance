# Manaos: la plaza de São Sebastião, ante el Teatro Amazonas, con tormenta (10/10/2026).
#   blender -b -P herramientas/blender/lugar_manaos.py              (entero)
#   blender -b -P herramientas/blender/lugar_manaos.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_manaos.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Es la ÚLTIMA misión («Se acabó.»): se conserva el sitio —la plaza del
# Teatro Amazonas—, ahora en Blender; las dos MADRES y los suyos, EN NAVE; al
# ATARDECER, con el último sol entrando por debajo de una tormenta.
#
# Cómo está puesto. Se mira al teatro:
#   · EL TEATRO VA A 0,3 DE SU TAMAÑO (13 m hasta lo alto de la cúpula): la
#     fachada rosa con sus columnas blancas y su frontón, y la cúpula de azulejos
#     verdes, amarillos y azules —los colores de la bandera—;
#   · la plaza es su mosaico de olas blancas y negras (el encuentro de las aguas);
#     farolas de hierro, bancos y, a la izquierda, el monumento; la base alien, en
#     un ruedo a la derecha;
#   · solo en el vuelo: la ciudad baja, la selva cerrando por todas partes y el
#     río Negro, ancho como un mar.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.42, 0.3, 0.86)                 # el último sol: bajo, a la espalda y algo a la izquierda
iniciar('manaos', 4534, eje=(0.0, -80.0), encendidas=0.12, reflejo=(0.3, 0.2, 0.14))

ZF = -78.0                               # la fachada del teatro
MT, HT = 9.0, 6.6                        # medio ancho y alto del cuerpo
FONDO_T = 20.0
BASE = (12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def olas (mx, mz):
    """El mosaico de la plaza: bandas onduladas, blanca y negra, a lo ancho."""
    return np.sin(mz * 1.6 + 0.9 * np.sin(mx * 0.8)) > 0                      # olas anchas: estrechas eran una cebra y no se veía a nadie encima

def tex_pista ():
    """La plaza: piedra portuguesa en olas blancas y negras, mojada por la tormenta que viene, con charcos."""
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    mx, mz = xx / KX, yy / KZ
    m = olas(mx, mz)
    grano = (0.86 + 0.24 * nube(PH_, PW, 300, 80))[..., None]
    a = np.where(m[..., None], np.array((0.3, 0.3, 0.31), np.float32), np.array((0.72, 0.7, 0.64), np.float32)) * grano
    a[((mx % 0.25) < 0.02) | ((mz % 0.25) < 0.02)] *= 0.86                # las teselas
    a *= (0.88 + 0.2 * nube(PH_, PW, 16, 4))[..., None]
    ch = nube(PH_, PW, 26, 7)
    charco = np.clip((ch - 0.74) / 0.04, 0, 1)[..., None]
    a = a * (1 - 0.7 * charco) + np.array((0.6, 0.44, 0.4), np.float32) * 0.7 * charco    # el cielo de la tormenta en el agua
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx_ = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx_ - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.2, -14.0, 1.5), (4.6, -33.0, 1.6), (-1.2, -52.0, 1.4), (5.6, -8.0, 1.2), (-6.0, -44.0, 1.3)):   # la guerra, que aquí ha sido larga
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    for _ in range(14):                                                  # raíces negras que cruzan la plaza desde el teatro
        x, z = random.uniform(-8.0, 8.0), PZ0
        ang = math.pi / 2 + random.uniform(-0.6, 0.6)
        pasos = int(random.uniform(6.0, 30.0) * KZ)
        for i in range(pasos):
            ang += random.uniform(-0.1, 0.1) + 0.015 * (math.pi / 2 - ang)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            grosor = max(1, int(4.0 * (1 - i / pasos) ** 0.7))
            c, f_ = a_px(x, z)
            if 5 < c < PW - 6 and 0 <= f_ < PH_ - 1:
                a[f_, c - grosor:c + grosor + 1] = np.array((0.03, 0.06, 0.04), np.float32)
                a[f_, c] = (0.1, 0.34, 0.18)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_olas ():
    """El mismo mosaico, en baldosa cuadrada que repite (7,85 m: un periodo a lo ancho y dos a lo largo), para el resto de la plaza."""
    W, Hh = 256, 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    m = olas(xx / W * (2 * math.pi / 0.8), yy / Hh * (2 * math.pi / 0.8))
    a = np.where(m[..., None], np.array((0.3, 0.3, 0.31), np.float32), np.array((0.72, 0.7, 0.64), np.float32)) * (0.9 + 0.16 * nube(Hh, W, 20, 30))[..., None]
    return guardar('olas-manaos', np.clip(a, 0, 1), 88)

def tex_fachada ():
    """La fachada (18 × 6,6 m): rosa, con el pórtico de columnas blancas en dos pisos, las ventanas de arco y la cornisa."""
    W, Hh = 512, 192
    a = lienzo(Hh, W, (0.86, 0.56, 0.52)) + ruido(Hh, W, 0.04)[..., None]
    blanco = np.array((0.94, 0.92, 0.86), np.float32)
    yy, xx = np.mgrid[0:Hh, 0:W]
    fy = lambda y: int((1 - y / HT) * Hh)
    fx = lambda x: int((x / (2 * MT) + 0.5) * W)
    for k in range(9):                                                   # nueve vanos
        cx = fx(-8.0 + 2.0 * k)
        central = 2 <= k <= 6
        for y0, y1 in ((0.3, 2.7), (3.4, 5.6)):
            medio = (fx(0.62) - fx(0)) if central else (fx(0.5) - fx(0))
            v = ((np.abs(xx - cx) < medio) & (yy <= fy(y0)) & (yy >= fy(y1 - 0.5))) | ((((xx - cx) / medio) ** 2 + ((yy - fy(y1 - 0.5)) / (fy(y1 - 0.5) - fy(y1))) ** 2 < 1) & (yy <= fy(y1 - 0.5)))
            marco = ((np.abs(xx - cx) < medio + 3) & (yy <= fy(y0)) & (yy >= fy(y1 - 0.5))) | ((((xx - cx) / (medio + 3)) ** 2 + ((yy - fy(y1 - 0.5)) / (fy(y1 - 0.5) - fy(y1) + 3)) ** 2 < 1) & (yy <= fy(y1 - 0.5)))
            a[marco] = blanco
            a[v] = np.array((0.5, 0.36, 0.2), np.float32) if random.random() < 0.3 else np.array((0.12, 0.1, 0.1), np.float32)
    for x in np.arange(-5.0, 5.1, 2.0):                                  # las columnas del pórtico, pareadas en los dos pisos
        c = fx(x)
        a[fy(5.9):fy(0.2), c - 4:c + 4] = blanco
        a[fy(5.9):fy(0.2), c + 4:c + 6] *= 0.7
    for y in (3.0, 5.9):                                                 # las cornisas
        a[fy(y + 0.3):fy(y)] = blanco
        a[fy(y):fy(y) + 3] *= 0.7
    a[fy(0.3):] = blanco * 0.86
    return guardar('fachada-amazonas', np.clip(a, 0, 1), 90)

def tex_cupula ():
    """La cúpula: escamas de azulejo en verde, amarillo y azul, en rombos, con el oro de los nervios."""
    n = 128
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    u, v = xx / n, yy / n
    rombo = (np.abs(((u * 8) % 1.0) - 0.5) + np.abs(((v * 8) % 1.0) - 0.5))
    a = np.where((rombo < 0.2)[..., None], np.array((0.1, 0.24, 0.6), np.float32),
                 np.where((rombo < 0.38)[..., None], np.array((0.9, 0.72, 0.12), np.float32), np.array((0.1, 0.5, 0.26), np.float32)))
    a[:, ::16] = (0.7, 0.5, 0.12)
    a *= (0.9 + 0.2 * nube(n, n, 4, 4))[..., None]
    return guardar('cupula-amazonas', np.clip(a, 0, 1), 90)

PISTA = material('pista', tex_pista(), rug=0.6)
OLAS = material('olas-manaos', tex_olas(), rug=0.7)
FACHADA = material('fachada-amazonas', tex_fachada(), rug=0.9)
CUPULA = material('cupula-amazonas', tex_cupula(), rug=0.4)
ROSA = material('muro-rosa', de_polyhaven('painted_plaster_wall', 512, 0xdc9088, 0.3), rug=0.9)
PIEDRA_C = material('piedra-clara', de_polyhaven('concrete_floor_worn_001', 512, 0xd8d2c4, 0.5), rug=0.9)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('dirt_floor', 512, 0x9a7a5a, 0.4), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.5, 0.4, 0.34)))
# OJO: los colores lisos van en LINEAL.
BLANCO = material('blanco', color=(0.8, 0.78, 0.72), rug=0.7)
ORO = material('oro', color=(0.7, 0.45, 0.1), rug=0.3)
HIERRO = material('hierro', color=(0.03, 0.035, 0.03), rug=0.6)
BRONCE = material('bronce', color=(0.05, 0.08, 0.06), rug=0.5)
FAROL = material('brillo-farol', color=(1.0, 0.8, 0.5), emite=2.2)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
SELVA = [material(f'selva-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.09, 0.03), (0.03, 0.12, 0.04), (0.05, 0.15, 0.05)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.04, 0.13, 0.04), (0.06, 0.16, 0.05)])]
TRONCO = material('tronco', color=(0.08, 0.06, 0.04))
RIO = material('rio-negro', color=(0.07, 0.06, 0.07), rug=0.1)                        # el río Negro, que lo es (va sin luz)
SELVA_L = material('monte-selva', color=(0.03, 0.1, 0.04), rug=1.0)
CASAS = [material(f'f-manaos-{i}', tex_postigos(f'manaos-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.86, 0.7, 0.4), (0.2, 0.3, 0.26)), ((0.6, 0.76, 0.8), (0.9, 0.9, 0.86)), ((0.86, 0.56, 0.5), (0.3, 0.2, 0.16)), ((0.8, 0.82, 0.7), (0.2, 0.36, 0.3))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.6, 0.3)), (0.05, (0.9, 0.46, 0.3)), (0.14, (0.5, 0.3, 0.36)), (0.4, (0.22, 0.2, 0.32)), (1.0, (0.1, 0.11, 0.2))],
    (SOL[0], SOL[2]), 0.05, (0.9, 0.4, 0.06), ((0.9, 0.5, 0.3), (0.2, 0.18, 0.26)), cuanta_nube=0.66), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA PLAZA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
PL, PLZ0, PLZ1 = 44.0, -66.0, 90.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', OLAS, -PL, PX0, PLZ0, PLZ1, 0.0, 7.854)
suelo('GN', OLAS, PX1, PL, PLZ0, PLZ1, 0.0, 7.854)
suelo('GN', OLAS, PX0, PX1, PZ1, PLZ1, 0.0, 7.854)
suelo('GN', PIEDRA_C, PX0, PX1, PLZ0, PZ0, 0.0, 3.0)
suelo('GN', PIEDRA_C, -PL, PL, ZF - 4.0, PLZ0, 0.0, 3.0)                              # la terraza del teatro
def farola (x, z, alto=5.0):
    """La farola de hierro de la plaza, de cinco globos, encendida ya."""
    torno('EV', HIERRO, en(x, z), [(0.26, 0.0), (0.2, 0.6), (0.09, 0.9), (0.07, alto)], lados=6, tapas=(False, False))
    copa('EP', FAROL, x, z, alto + 0.3, 0.24, 0.28, sub=1, baila=0.0)
    for dx, dz in ((0.6, 0), (-0.6, 0), (0, 0.6), (0, -0.6)):
        barra('EV', HIERRO, P(x, z, alto - 0.4), P(x + dx, z + dz, alto - 0.1), 0.06)
        copa('EP', FAROL, x + dx, z + dz, alto + 0.08, 0.18, 0.22, sub=1, baila=0.0)
for z in np.arange(4.0, -62.0, -16.5):
    farola(-9.0, float(z))
    if abs(z - BASE[1]) > 9.0:
        farola(9.0, float(z))
for z in (-4.0, -24.0, -56.0):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        cubo('EV', HIERRO, P(s * 10.4, z, 0.46), (0.5, 1.8, 0.07))
        cubo('EV', HIERRO, P(s * 10.64, z, 0.76), (0.06, 1.8, 0.5))
# El monumento a la Apertura de los Puertos, a la izquierda: el pedestal con sus barcas de bronce y el ángel arriba.
MX_, MZ_ = -18.0, -30.0
torno('P', PIEDRA_C, en(MX_, MZ_), [(4.4, 0.0), (4.4, 0.5), (3.8, 0.5), (3.8, 0.9), (2.4, 1.0), (2.0, 3.6), (2.4, 3.8), (1.4, 4.0), (1.0, 7.0), (1.3, 7.2)], lados=8, u_rep=6, v_m=2.0, tapas=(False, True))
for k in range(4):
    a_ = math.pi / 2 * k + math.pi / 4
    elipsoide('EV', BRONCE, en(MX_ + 3.0 * math.cos(a_), MZ_ + 3.0 * math.sin(a_), 1.5, -a_), (0.5, 1.4, 0.5))
elipsoide('EV', BRONCE, en(MX_, MZ_, 8.1), (0.36, 0.32, 0.9))
elipsoide('EV', BRONCE, en(MX_, MZ_, 9.15), (0.17, 0.17, 0.2))
for s in (-1, 1):
    cara('EV', BRONCE, [P(MX_ + s * 0.1, MZ_ - 0.1, 8.5), P(MX_ + s * 1.2, MZ_ - 0.3, 9.4), P(MX_ + s * 0.9, MZ_ - 0.3, 8.0)], hacia=V((0, -1, 0)))
    cara('EV', BRONCE, [P(MX_ + s * 0.1, MZ_ - 0.12, 8.5), P(MX_ + s * 0.9, MZ_ - 0.32, 8.0), P(MX_ + s * 1.2, MZ_ - 0.32, 9.4)], hacia=V((0, 1, 0)))
for _ in range(230):                                                                 # entre la plaza y las casas, arbolado
    a_, d = random.uniform(0, 6.28), random.uniform(70.0, 250.0)
    x, z = d * math.cos(a_), -40.0 + d * math.sin(a_)
    if abs(x) < PL + 4.0 and ZF - FONDO_T - 6.0 < z < PLZ1 + 4.0:
        continue
    arbol('T', TRONCO, SELVA, x, z, random.uniform(1.4, 2.6))
for _ in range(16):                                                                  # los árboles de la plaza: mangos y palmeras reales
    s = random.choice((-1, 1))
    x, z = s * random.uniform(13.0, 36.0), random.uniform(-60.0, 8.0)
    if (s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < 8.5) or (s < 0 and math.hypot(x - MX_, z - MZ_) < 7.0):
        continue
    if random.random() < 0.4:
        palmera('EV', TRONCO, PALMA, x, z, alto=random.uniform(8.0, 11.0))
    else:
        arbol('EV', TRONCO, SELVA, x, z, random.uniform(1.2, 1.8))
# El ruedo de la base alien.
torno('P', PIEDRA_C, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.34), (4.8, 0.34), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(PIEDRA_C), rug=0.9)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.08) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. EL TEATRO AMAZONAS
# ==================================================================================
Y_Z = 0.8                                                                           # el zócalo, con su escalinata
viga('P', PIEDRA_C, -MT - 1.4, MT + 1.4, ZF - FONDO_T - 1.0, ZF + 1.4, 0.0, Y_Z, u_m=2.0, techo=PIEDRA_C)
for k in range(3):
    viga('P', PIEDRA_C, -6.0, 6.0, ZF + 1.4, ZF + 2.0 + k * 0.5, 0.0, Y_Z * (3 - k) / 4, u_m=2.0, techo=PIEDRA_C)
cara('P', FACHADA, [P(-MT, ZF, Y_Z), P(MT, ZF, Y_Z), P(MT, ZF, Y_Z + HT), P(-MT, ZF, Y_Z + HT)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
caja('P', ROSA, -MT, MT, ZF - FONDO_T, ZF - 0.05, Y_Z, Y_Z + HT, techo=AZOTEA, baldosa=4.0)
viga('P', PIEDRA_C, -MT - 0.3, MT + 0.3, ZF - 0.3, ZF + 0.3, Y_Z + HT, Y_Z + HT + 0.4, u_m=2.0, techo=PIEDRA_C)
extruido('P', PIEDRA_C, en(0.0, ZF + 0.1), [(-5.6, Y_Z + HT + 0.4), (5.6, Y_Z + HT + 0.4), (0.0, Y_Z + HT + 2.0)], 0.4, baldosa=2.0)      # el frontón
for x in np.arange(-5.0, 5.1, 2.0):                                                  # las columnas del pórtico, de bulto
    barra('EV', BLANCO, P(float(x), ZF + 0.45, Y_Z), P(float(x), ZF + 0.45, Y_Z + HT), 0.36)
for x in (-MT, MT, -5.6, 5.6):                                                       # las figuras del remate
    elipsoide('EV', BLANCO, en(x, ZF, Y_Z + HT + 0.9), (0.2, 0.2, 0.5))
# La cúpula: el tambor y el casquete de azulejo, con su linterna.
ZD = ZF - 9.0
YD = Y_Z + HT
viga('P', ROSA, -4.4, 4.4, ZD - 4.4, ZD + 4.4, YD, YD + 1.0, u_m=4.0, techo=AZOTEA)
torno('P', ROSA, en(0.0, ZD, YD + 1.0), [(3.6, 0.0), (3.6, 1.1), (3.8, 1.2)], lados=18, u_rep=6, v_m=2.0, tapas=(False, False))
torno('P', CUPULA, en(0.0, ZD, YD + 2.2), [(3.8, 0.0), (3.6, 0.9), (3.0, 1.8), (2.0, 2.5), (0.9, 2.9), (0.5, 3.0)], lados=20, u_rep=5.0, v_m=1.6, tapas=(False, True))
torno('EV', ORO, en(0.0, ZD, YD + 5.2), [(0.5, 0.0), (0.5, 0.5), (0.3, 0.8), (0.0, 1.3)], lados=8, tapas=(False, False))
print('TEATRO', YD + 6.5, 'm')

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'))

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: LA CIUDAD, LA SELVA Y EL RÍO NEGRO
# ==================================================================================
# La iglesia de São Sebastião, a un lado de la plaza, y las casas de alrededor: bajas, a la escala del teatro.
caja('T', CASAS[1], PL + 6.0, PL + 16.0, -40.0, -22.0, 0.0, 5.0, techo=AZOTEA, baldosa=6.0)
torno('T', BLANCO, en(PL + 11.0, -40.0), [(1.6, 0.0), (1.6, 7.0), (0.0, 9.6)], lados=4, tapas=(False, False))
suelo('G', SOLAR, -1500.0, -PL, -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, PL, 1500.0, -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -PL, PL, PLZ1, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -PL, PL, -1500.0, ZF - FONDO_T - 1.0, 0.0, 8.0)
Z_RIO = 520.0                                                                       # el río Negro, a la espalda
n_ed = 0
for gx in np.arange(-700.0, 700.0, 22.0):
    for gz in np.arange(-420.0, Z_RIO - 30.0, 22.0):
        cx, cz = gx + 11 + random.uniform(-2, 2), gz + 11 + random.uniform(-2, 2)
        if math.hypot(cx, cz + 40.0) < 250.0 or random.random() < 0.26:               # lejos: a su tamaño, al lado, el teatro era una maqueta
            continue
        ax, az = random.uniform(6.0, 8.6), random.uniform(6.0, 8.6)
        caja('T', random.choice(CASAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, random.choice([3.6, 4.4, 5.2, 7.0]), techo=AZOTEA, baldosa=8.0)
        n_ed += 1
print('CASAS', n_ed)
rect('CP', RIO, -3200.0, 3200.0, Z_RIO, 3200.0, -2.0, 300.0)
# La selva: un muro verde alrededor de la ciudad, y lomas de copas hasta el horizonte.
for _ in range(900):
    a_, d = random.uniform(0, 6.28), random.uniform(700.0, 1300.0)
    x, z = d * math.cos(a_), -60.0 + d * math.sin(a_) * 0.8
    if z > Z_RIO - 40.0:
        continue
    copa('T', random.choice(SELVA), x, z, random.uniform(8.0, 16.0), random.uniform(14.0, 26.0), random.uniform(9.0, 14.0), sub=1)
for cx, cz, radio, alto in ((-1700.0, -900.0, 900.0, 60.0), (1700.0, -1100.0, 900.0, 70.0), (0.0, -2000.0, 1200.0, 80.0), (-1900.0, 500.0, 800.0, 50.0), (1900.0, 400.0, 800.0, 50.0), (0.0, 2600.0, 1400.0, 60.0)):
    monte('T', SELVA_L, cx, cz, radio, alto, y0=-2.0, seg=18, anillos=4, pico=0.6)

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
    exportes=[('lugar-manaos', ['P', 'GN', 'EV', 'EP']), ('lugar-manaos-ciudad', ['G', 'T', 'CP'])],
    # El último sol bajo la tormenta: muy rojo y rasante, y un cielo oscuro que casi no alumbra.
    sol_hacia=SOL, sol_color=(1.0, 0.5, 0.2), sol_fuerza=8.0, sol_ancho=4.0, cielo_fuerza=0.22, cielo_altura=5, cielo_giro=200,
    escala=0.74, satura=0.9, no_alumbran=('CP',), suaves=('monte-selva',), fundir=True)
