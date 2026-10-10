# Monterrey: la Macroplaza, con el Faro del Comercio, al amanecer (10/10/2026).
#   blender -b -P herramientas/blender/lugar_monterrey.py              (entero)
#   blender -b -P herramientas/blender/lugar_monterrey.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_monterrey.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Se conserva el sitio de la misión —la Macroplaza y el Faro del
# Comercio—, ahora en Blender; los alienz EN NAVE; al AMANECER, con el Cerro de la
# Silla recortado contra el cielo en la llegada.
#
# Cómo está puesto. Se mira al sur, hacia el Faro:
#   · EL FARO VA A LA MITAD DE SU TAMAÑO (35 m): es una losa naranja y nada más,
#     así que no hace falta verlo entero para saber qué es. Jugando llena el
#     centro del fondo hasta salirse por arriba; entero, con su láser verde, en
#     la llegada.
#   · A su izquierda, la catedral (también a la mitad: se ve su cuerpo bajo); la
#     explanada de losas claras con franjas rojas, jardineras y palmeras; la base
#     alien en un ruedo a la derecha.
#   · Solo en el vuelo: la plaza entera, la ciudad y el Cerro de la Silla.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.5, 0.42, 0.76)                   # recién salido: bajo, a la espalda y a la derecha
iniciar('monterrey', 3827, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.3, 0.2, 0.16))

FARO = (3.0, -90.0)                      # el pie del Faro
FA, FG, FH = 3.1, 0.5, 35.0              # medio ancho, medio grueso y alto
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
    """La explanada: losas grandes de cantera clara, con franjas de piedra roja
    cada diez metros, tapas, manchas y lo que dejó la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('concrete_floor_worn_001', 256, 0xd6ccba, 0.5))
    roja = tejar(foto('stone_pavers', 256, 0xb0644c, 0.5))
    l = 1.6
    f = 0.0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + l * KZ))
        c = 0.0
        while c < PW:
            c0, c1 = int(c), int(min(PW, c + l * KX))
            a[f0:f1, c0:c1] *= random.uniform(0.93, 1.05)
            a[f0:f1, c0:c0 + 1] *= 0.72
            c += l * KX
        a[f0:f0 + 1] *= 0.72
        f += l * KZ
    for z in np.arange(-56.0, 12.0, 9.6):
        (_, f0), (_, f1) = a_px(0, z - 0.4), a_px(0, z + 0.4)
        a[max(0, f0):f1] = roja[max(0, f0):f1]
    for x in (-6.4, 6.4):
        (c0, _), (c1, _) = a_px(x - 0.25, 0), a_px(x + 0.25, 0)
        a[:, c0:c1] = roja[:, c0:c1]
    a *= (0.9 + 0.16 * nube(PH_, PW, 16, 4))[..., None]
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
        mancha(random.uniform(-9, 9), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.1), random.uniform(0.8, 0.93), random.uniform(0.6, 1.5))
    for x, z, r_ in ((-4.2, -14.0, 1.5), (4.6, -33.0, 1.6), (-1.2, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
        for _ in range(46):
            ang, d = random.uniform(0, 6.28), r_ * random.uniform(0.3, 1.8)
            c, f = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                a[f:f + 2, c:c + 2] = random.choice(((0.1, 0.1, 0.1), (0.74, 0.7, 0.62)))
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_faro ():
    """El hormigón del Faro: naranja, con las marcas del encofrado y las chorreras."""
    n = 256
    a = foto('cracked_concrete_wall', n, 0xd8623a, 0.4).copy()
    a[::32] *= 0.86
    a[:, ::64] *= 0.9
    a *= (0.9 + 0.14 * nube(n, n, 3, 12))[..., None]
    return guardar('faro', np.clip(a, 0, 1), 88)

def tex_catedral ():
    """La fachada de la catedral: cantera amarilla, barroca, con su portada, las columnas y el óculo."""
    W, Hh = 256, 256
    a = np.tile(foto('yellow_stone_wall', 128, 0xd9c08c, 0.4), (2, 2, 1))
    yy, xx = np.mgrid[0:Hh, 0:W]
    puerta = (((xx - 128) / 26.0) ** 2 + ((yy - 190) / 26.0) ** 2 < 1) & (yy <= 190) | ((np.abs(xx - 128) < 26) & (yy > 190))
    a[puerta] = (0.14, 0.1, 0.07)
    for c in (84, 100, 156, 172):
        a[120:Hh, c - 5:c + 5] = np.clip(a[120:Hh, c - 5:c + 5] * 1.12, 0, 1)
        a[120:Hh, c + 5:c + 7] *= 0.7
    a[112:120] = np.clip(a[112:120] * 1.12, 0, 1); a[120:124] *= 0.7
    d = np.hypot(xx - 128, yy - 76)
    a[d < 16] = (0.16, 0.14, 0.16); a[(d >= 16) & (d < 20)] = np.clip(a[(d >= 16) & (d < 20)] * 1.14, 0, 1)
    for c in (40, 216):
        v = (np.abs(xx - c) < 9) & (yy > 60) & (yy < 110)
        a[v] = (0.16, 0.14, 0.16)
    a[:8] = np.clip(a[:8] * 1.1, 0, 1); a[8:12] *= 0.7
    return guardar('catedral-mty', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.9)
LOSA = material('losa', de_polyhaven('concrete_floor_worn_001', 512, 0xd6ccba, 0.5), rug=0.9)
FARO_M = material('faro', tex_faro(), rug=0.9)
CATEDRAL = material('catedral-mty', tex_catedral(), rug=0.9)
CANTERA = material('cantera', de_polyhaven('yellow_stone_wall', 512, 0xd9c08c, 0.4), rug=0.95)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x86a458, 0.5), rug=1.0)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xb0a696, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.62, 0.58, 0.52)))
# OJO: los colores lisos van en LINEAL.
LASER = material('brillo-laser', color=(0.2, 1.0, 0.3), emite=2.4)
BRONCE = material('bronce', color=(0.05, 0.08, 0.06), rug=0.5)
PIEDRA = material('piedra', color=(0.5, 0.42, 0.3), rug=0.9)
AGUA_F = material('agua-fuente', color=(0.36, 0.5, 0.56), rug=0.1)
FUNDICION = material('fundicion', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
ORO = material('oro', color=(0.7, 0.45, 0.1), rug=0.3)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.14, 0.04), (0.08, 0.17, 0.05), (0.11, 0.2, 0.06)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.15, 0.04), (0.09, 0.18, 0.05)])]
TRONCO = material('tronco', color=(0.1, 0.07, 0.05))
SILLA = material('monte-silla', color=(0.2, 0.22, 0.26), rug=1.0)                    # el cerro, a contraluz
MONTE_L = material('monte-lejos', color=(0.36, 0.34, 0.4), rug=1.0)
FACHADAS = [material(f'f-mty-{i}', tex_crema(f'mty-{i}', c, balcon=0.2)) for i, c in enumerate([(0.86, 0.8, 0.68), (0.8, 0.76, 0.7), (0.84, 0.7, 0.56)])]
TORRES = [material('t-vidrio-0', tex_vidrio('mty-0', (0.26, 0.34, 0.42))), material('t-oficina-0', tex_oficina('mty-of', (0.6, 0.56, 0.5), (0.16, 0.22, 0.28)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.78, 0.56)), (0.07, (0.98, 0.72, 0.6)), (0.22, (0.78, 0.68, 0.76)), (0.55, (0.46, 0.58, 0.84)), (1.0, (0.24, 0.4, 0.76))],
    (SOL[0], SOL[2]), 0.08, (0.9, 0.5, 0.2), ((1.0, 0.8, 0.62), (0.8, 0.7, 0.76)), cuanta_nube=0.14), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA EXPLANADA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
MX, MZ0, MZ1 = 46.0, -150.0, 330.0                                                  # la Macroplaza: larga y estrecha
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSA, -MX, PX0, MZ0, MZ1, 0.0, 3.2)
suelo('GN', LOSA, PX1, MX, MZ0, MZ1, 0.0, 3.2)
suelo('GN', LOSA, PX0, PX1, PZ1, MZ1, 0.0, 3.2)
suelo('GN', LOSA, PX0, PX1, MZ0, PZ0, 0.0, 3.2)
JARDIN = material('jardin', imagen_de(CESPED), rug=1.0)                              # encima de las losas: material propio
def jardinera (x0, x1, z0, z1, grupo='P'):
    """Un cuadro de césped con su bordillo de cantera."""
    rect('GN', JARDIN, x0, x1, z0, z1, 0.07, 6.0)
    for a0, a1, c0, c1 in ((x0 - 0.3, x1 + 0.3, z0 - 0.3, z0), (x0 - 0.3, x1 + 0.3, z1, z1 + 0.3), (x0 - 0.3, x0, z0, z1), (x1, x1 + 0.3, z0, z1)):
        viga(grupo, CANTERA, a0, a1, c0, c1, 0.0, 0.4, u_m=2.0, techo=CANTERA)
for s in (-1, 1):
    for z in (-58.0, -30.0, -2.0):
        if s > 0 and abs(z + 12.0 - BASE[1]) < 14.0:
            continue
        x0, x1 = (12.0, 26.0) if s > 0 else (-26.0, -12.0)
        jardinera(x0, x1, z, z + 20.0)
        for _ in range(4):
            arbol('EV', TRONCO, HOJAS, random.uniform(x0 + 2, x1 - 2), random.uniform(z + 2, z + 18.0), random.uniform(0.9, 1.3))
def farola (x, z, alto=5.2):
    torno('EV', FUNDICION, en(x, z), [(0.24, 0.0), (0.18, 0.5), (0.08, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', FAROL, x, z, alto + 0.24, 0.26, 0.3, sub=1, baila=0.0)
for z in np.arange(6.0, -62.0, -17.0):
    farola(-9.0, float(z))
    if abs(z - BASE[1]) > 9.0:
        farola(9.0, float(z))
for z in np.arange(10.0, -62.0, -12.0):                                               # las palmeras de la explanada
    palmera('EV', TRONCO, PALMA, -10.6, float(z) + 4.0, alto=random.uniform(6.5, 8.0))
    if abs(z + 4.0 - BASE[1]) > 9.0:
        palmera('EV', TRONCO, PALMA, 10.6, float(z) + 4.0, alto=random.uniform(6.5, 8.0))
# El ruedo de la base alien.
torno('P', CANTERA, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.34), (4.8, 0.34), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(LOSA), rug=0.9)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.08) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. EL FARO DEL COMERCIO Y LA CATEDRAL
# ==================================================================================
fx, fz = FARO
viga('P', CANTERA, fx - FA - 2.4, fx + FA + 2.4, fz - 3.0, fz + 3.0, 0.0, 0.5, u_m=2.0, techo=CANTERA)   # su peana
viga('P', FARO_M, fx - FA, fx + FA, fz - FG, fz + FG, 0.5, FH, u_m=4.0, v_rep=8.0, techo=FARO_M)
viga('P', FARO_M, fx - FA, fx - FA + 1.0, fz + FG, fz + FG + 1.6, 0.5, 9.0, u_m=4.0, v_rep=2.0, techo=FARO_M)  # el contrafuerte del pie
cubo('EP', LASER, P(fx, fz, FH + 0.3), (1.0, 0.5, 0.5))                                                    # el cañón del láser
barra('CP', LASER, P(fx, fz, FH + 0.3), P(fx - 900.0, fz + 500.0, FH + 160.0), 0.9)                         # y su rayo, que barre la ciudad
print('FARO', FH, 'm')
# La catedral, a la izquierda: el cuerpo con su portada y la torre.
CX0, CX1, CZ = -34.0, -14.0, -84.0
cara('E', CATEDRAL, [P(CX0, CZ, 0.0), P(CX1, CZ, 0.0), P(CX1, CZ, 14.0), P(CX0, CZ, 14.0)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
caja('E', CANTERA, CX0, CX1, CZ - 34.0, CZ - 0.05, 0.0, 14.0, techo=AZOTEA, baldosa=4.0)
viga('E', CANTERA, CX0 - 5.0, CX0 + 1.0, CZ - 6.0, CZ + 0.4, 0.0, 26.0, u_m=4.0, v_rep=4.0, techo=CANTERA)       # la torre del campanario
torno('EV', PIEDRA, en(CX0 - 2.0, CZ - 2.8, 26.0), [(2.6, 0.0), (2.6, 3.0), (2.0, 4.6), (0.8, 6.0), (0.0, 6.6)], lados=8, tapas=(False, False))
barra('EV', ORO, P(CX0 - 2.0, CZ - 2.8, 32.6), P(CX0 - 2.0, CZ - 2.8, 34.6), 0.14)
torno('EV', PIEDRA, en((CX0 + CX1) / 2, CZ - 22.0, 14.0), [(5.0, 0.0), (5.0, 2.0), (4.4, 4.4), (2.6, 6.2), (0.0, 7.0)], lados=12, tapas=(False, False))   # la cúpula del crucero
# La fuente de la Vida, a la derecha: el vaso y el grupo de bronce.
QX, QZ = 26.0, -84.0
torno('P', CANTERA, en(QX, QZ), [(9.0, 0.0), (9.0, 0.7), (8.4, 0.7), (8.4, 0.3)], lados=24, u_rep=10, v_m=1.5, tapas=(False, False))
cara('EP', AGUA_F, [P(QX + 8.4 * math.cos(2 * math.pi * i / 24), QZ + 8.4 * math.sin(2 * math.pi * i / 24), 0.4) for i in range(24)], hacia=ARRIBA)
bloque('EV', PIEDRA, en(QX, QZ, 0.0), (3.0, 3.0, 2.0), mella=0.1)
elipsoide('EV', BRONCE, en(QX, QZ, 3.4), (0.7, 0.6, 1.5))                             # Neptuno
barra('EV', BRONCE, P(QX + 0.5, QZ, 3.6), P(QX + 1.1, QZ, 5.8), 0.08)                  # y su tridente
for k in range(4):
    a_ = math.pi / 2 * k + 0.6
    elipsoide('EV', BRONCE, en(QX + 2.4 * math.cos(a_), QZ + 2.4 * math.sin(a_), 2.0, -a_), (0.5, 1.1, 0.7))   # los caballos

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'))

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: LA CIUDAD Y EL CERRO DE LA SILLA
# ==================================================================================
for s in (-1, 1):                                                                    # las avenidas que flanquean la plaza
    x0, x1 = min(s * MX, s * (MX + 16.0)), max(s * MX, s * (MX + 16.0))
    suelo('G', CALZADA, x0, x1, -1500.0, 1500.0, 0.0, carriles=(x0, 4.0, 'z'))
    suelo('G', SOLAR, min(s * (MX + 16.0), s * 1500.0), max(s * (MX + 16.0), s * 1500.0), -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -MX, MX, -1500.0, MZ0, 0.0, 8.0)
suelo('G', SOLAR, -MX, MX, MZ1, 1500.0, 0.0, 8.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 42.0):
    for gz in np.arange(-900.0, 1250.0, 42.0):
        cx, cz = gx + 21 + random.uniform(-5, 5), gz + 21 + random.uniform(-5, 5)
        if (abs(cx) < MX + 34.0 and MZ0 - 20.0 < cz < MZ1 + 20.0) or random.random() < 0.2:
            continue
        a = random.uniform(11.0, 15.0)
        # Con el sol tan bajo, lo que queda a la espalda y a la derecha (de donde viene) da sombras de cien
        # metros: las torres, solo por delante; de ese lado, casas bajas.
        del_sol = cz > -150.0 and cx > -60.0
        if cz < -200.0 and abs(cx) < 420.0 and cx > -40.0 and random.random() < 0.3:
            caja('T', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, random.uniform(50.0, 150.0), techo=AZOTEA, baldosa=17.0)
        else:
            caja('T', random.choice(FACHADAS), cx - a, cx + a, cz - a, cz + a, 0.0, random.choice([6, 9, 12]) if del_sol else random.choice([9, 12, 15, 21, 27]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
# El Cerro de la Silla: los dos picos y la silla entre ellos, al sureste (detrás del Faro, a la izquierda).
SX, SZ = -500.0, -1700.0
monte('T', SILLA, SX - 330.0, SZ, 420.0, 560.0, y0=0.0, seg=16, anillos=6, pico=1.25)       # el pico norte, el más alto y afilado
monte('T', SILLA, SX + 300.0, SZ + 40.0, 400.0, 500.0, y0=0.0, seg=16, anillos=6, pico=1.2)  # el pico sur
monte('T', SILLA, SX - 20.0, SZ + 20.0, 520.0, 330.0, y0=0.0, seg=16, anillos=5, pico=0.8)   # la silla
monte('T', SILLA, SX + 80.0, SZ + 200.0, 900.0, 170.0, y0=0.0, seg=18, anillos=4, pico=0.7)  # las faldas
for cx, cz, radio, alto in ((1500.0, -1700.0, 900.0, 300.0), (-1900.0, -600.0, 900.0, 260.0), (1900.0, 600.0, 900.0, 320.0), (600.0, 2200.0, 1100.0, 280.0)):   # la Sierra Madre, alrededor
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=18, anillos=5, pico=0.9)

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
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-monterrey', ['P', 'E', 'GN', 'EV', 'EP']), ('lugar-monterrey-ciudad', ['G', 'T', 'CP'])],
    # Amanecer: como el de Cnosos (sol dorado y fuerte, cielo flojo).
    sol_hacia=SOL, sol_color=(1.0, 0.7, 0.46), sol_fuerza=6.5, sol_ancho=4.0, cielo_fuerza=0.18, cielo_altura=8, cielo_giro=160,
    escala=0.8, satura=1.0, no_alumbran=('CP',), suaves=('monte-silla', 'monte-lejos'), fundir=True)
