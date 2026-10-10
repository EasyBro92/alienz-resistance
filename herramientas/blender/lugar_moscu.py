# Moscú: la Plaza Roja nevada, con San Basilio al fondo (10/10/2026).
#   blender -b -P herramientas/blender/lugar_moscu.py              (entero)
#   blender -b -P herramientas/blender/lugar_moscu.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_moscu.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). La Plaza Roja ya era el sitio; ahora en Blender: SAN BASILIO de frente
# al fondo, un día de invierno con sol bajo. Es la misión de LA MADRE del norte, y
# «la señal sale de debajo del Kremlin»: los alienz salen DE DEBAJO de la catedral.
#
# Cómo está puesto:
#   · SAN BASILIO VA A 0,27 DE SU TAMAÑO (12,8 m; mide 47): es su silueta entera
#     —la torre de la tienda y las ocho cúpulas de colores— o no es nada.
#   · Delante se abre una rampa de ±7,6 que baja 4,6 m a una boca a oscuras bajo
#     la catedral (`hueco` y `entrada`, como en Gizeh): por ahí sube LA MADRE.
#   · El adoquín con la nieve pisada; a la derecha la muralla del Kremlin, el
#     mausoleo y la base alien en un ruedo; a la izquierda, los GUM.
#   · Solo en el vuelo: la torre Spásskaya, el Kremlin por dentro, el Museo de
#     Historia a la espalda, el río y la ciudad nevada.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.4, 0.34, 0.85)                 # sol de invierno: bajo, a la espalda y algo a la izquierda
iniciar('moscu', 3423, eje=(0.0, -80.0), encendidas=0.06, reflejo=(0.2, 0.2, 0.24))

ZANJA = 7.6
Z_BOCA, Z_PIE = -62.0, -78.0
HONDO = 4.6
ZC = -86.0                               # el centro de la catedral
BASE = (12.6, -44.0)
MURALLA = 21.0                           # la cara de la muralla del Kremlin, a la derecha

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_BOCA, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_nieve (n=256):
    a = lienzo(n, n, (0.86, 0.88, 0.92)) * (0.94 + 0.08 * nube(n, n, 5, 5))[..., None]
    a += ruido(n, n, 0.03)[..., None]
    return a

def tex_pista ():
    """El adoquín de la plaza: gris oscuro, con la nieve pisada en el centro y
    amontonada a los lados, las rodadas y las huellas."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('cobblestone_floor_04', 256, 0x77736f, 0.6))
    a *= (0.86 + 0.24 * nube(PH_, PW, 16, 4))[..., None]
    nieve = tejar(tex_nieve())
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    cubre = np.clip((nube(PH_, PW, 26, 7) + 0.42 * np.clip((np.abs(xs) - 2.0) / 7.0, 0, 1) - 0.5) / 0.1, 0, 1)
    for x in (-5.0, -3.2, 3.2, 5.0):                                      # las rodadas, que dejan el adoquín a la vista
        (c, _) = a_px(x, 0)
        cubre[:, c - 7:c + 7] *= (0.25 + 0.5 * nube(PH_, 14, 30, 2))
    cubre = 0.16 + 0.8 * cubre                                           # siempre queda algo de nieve entre los adoquines
    a = a * (1 - cubre[..., None]) + nieve * cubre[..., None]
    for _ in range(260):                                                 # huellas
        x, z = random.uniform(-8.5, 8.5), random.uniform(PZ0, PZ1)
        ang = random.uniform(-0.4, 0.4)
        for k in range(random.randint(4, 12)):
            c, f = a_px(x + (0.18 if k % 2 else -0.18), z)
            if 2 < c < PW - 4 and 2 < f < PH_ - 6:
                a[f:f + 5, c:c + 3] *= 0.8
            x += 0.7 * math.sin(ang); z -= 0.7 * math.cos(ang)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.4, -15.0, 1.5), (4.8, -34.0, 1.7), (-2.0, -51.0, 1.4)):       # la guerra: nieve derretida y hollín
        mancha(x, z, r_ * 1.6, 0.6, 1.1)
        mancha(x, z, r_, 0.3)
    for k in range(11):                                                  # las raíces de lo que hay debajo
        x, z = -6.6 + k * 1.32 + random.uniform(-0.4, 0.4), PZ0
        ang = math.pi / 2 + random.uniform(-0.5, 0.5)
        pasos = int(random.uniform(3.5, 10.0) * KZ)
        for i in range(pasos):
            ang += random.uniform(-0.12, 0.12) + 0.02 * (math.pi / 2 - ang)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            grosor = max(1, int(4.5 * (1 - i / pasos) ** 0.7))
            c, f_ = a_px(x, z)
            if 5 < c < PW - 6 and 0 <= f_ < PH_ - 1:
                a[f_, c - grosor:c + grosor + 1] = np.array((0.05, 0.07, 0.05), np.float32) * (1 + 0.5 * random.random())
                a[f_, c] = (0.1, 0.3, 0.16)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_ladrillo_rojo ():
    """El ladrillo de San Basilio y del Kremlin: rojo, con las fajas y los arquillos blancos y nieve en las repisas."""
    n = 256
    a = foto('red_brick', n, 0xa24a3a, 0.6).copy()
    for f in (0, 96, 176):
        a[f:f + 8] = (0.88, 0.86, 0.82)
        a[f + 8:f + 11] *= 0.6
        if f:
            a[f - 5:f] = (0.9, 0.92, 0.96)                               # la nieve que se queda en cada repisa
    yy, xx = np.mgrid[0:n, 0:n]
    for k in range(4):
        cx = k * 64 + 32
        arco = (((xx - cx) / 16.0) ** 2 + ((yy - 140) / 16.0) ** 2 < 1) & (yy <= 140) | ((np.abs(xx - cx) < 16) & (yy > 140) & (yy < 170))
        marco = (((xx - cx) / 20.0) ** 2 + ((yy - 140) / 20.0) ** 2 < 1) & (yy <= 140) | ((np.abs(xx - cx) < 20) & (yy > 140) & (yy < 172))
        a[marco] = (0.88, 0.86, 0.82)
        a[arco] = (0.12, 0.08, 0.07)
    a *= (0.9 + 0.16 * nube(n, n, 5, 5))[..., None]
    return guardar('ladrillo-basilio', np.clip(a, 0, 1), 88)

def tex_cebolla (nombre, c0, c1, dibujo):
    """La piel de una cúpula: gajos en espiral, rombos o rayas, en dos colores, con la nieve arriba."""
    n = 128
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    u, v = xx / n, 1 - yy / n
    if dibujo == 'espiral':
        m = ((u * 4 + v * 1.5) % 1.0) < 0.5
    elif dibujo == 'rombos':
        m = (np.abs(((u * 8) % 1.0) - 0.5) + np.abs(((v * 5) % 1.0) - 0.5)) < 0.36
    elif dibujo == 'gajos':
        m = ((u * 8) % 1.0) < 0.5
    else:                                                                # puntas
        m = ((u * 8 + np.abs(((v * 6) % 1.0) - 0.5) * 0.9) % 1.0) < 0.5
    a = np.where(m[..., None], np.array(c0, np.float32), np.array(c1, np.float32))
    a *= (0.8 + 0.3 * (1 - np.abs(((u * 8) % 1.0) - 0.5) * 2))[..., None]   # el bulto de cada gajo
    nieve = np.clip((v - 0.7) / 0.2 + 0.3 * (nube(n, n, 4, 8) - 0.5), 0, 1)[..., None]
    a = a * (1 - nieve * 0.7) + np.array((0.9, 0.92, 0.96), np.float32) * nieve * 0.7
    return guardar(f'cebolla-{nombre}', np.clip(a, 0, 1), 90)

def tex_gum ():
    """La fachada de los GUM: crema, con tres pisos de ventanas de arco y los escaparates encendidos abajo."""
    a = lienzo(256, 256, (0.8, 0.74, 0.62)) + ruido(256, 256, 0.04)[..., None]
    yy, xx = np.mgrid[0:256, 0:256]
    for k in range(4):
        cx = k * 64 + 32
        for y0, alto in ((30, 44), (104, 44)):
            arco = (((xx - cx) / 14.0) ** 2 + ((yy - y0 - 14) / 14.0) ** 2 < 1) & (yy <= y0 + 14) | ((np.abs(xx - cx) < 14) & (yy > y0 + 14) & (yy < y0 + alto))
            a[arco] = (0.16, 0.18, 0.22)
        a[184:244, cx - 22:cx + 22] = (0.95, 0.76, 0.42)
        a[184:244, cx - 1:cx + 1] = (0.3, 0.24, 0.16)
    a[92:98] *= 0.7; a[168:176] *= 0.7; a[:8] = (0.9, 0.92, 0.96); a[86:92] = (0.9, 0.92, 0.96)
    return guardar('gum', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.95)
NIEVE = material('nieve', guardar('nieve', np.clip(tex_nieve(), 0, 1), 88), rug=1.0)
ADOQUIN = material('adoquin', de_polyhaven('cobblestone_floor_04', 512, 0x77736f, 0.6), rug=0.95)
LADRILLO = material('ladrillo-basilio', tex_ladrillo_rojo(), rug=0.95)
MURO_K = material('muro-kremlin', de_polyhaven('red_brick', 512, 0x9a4436, 0.6), rug=0.95)
GRANITO_R = material('granito-rojo', de_polyhaven('marble_01', 256, 0x7a3530, 0.4), rug=0.5)
GUM = material('gum', tex_gum(), rug=0.9)
RAMPA = material('rampa', de_polyhaven('cobblestone_floor_04', 512, 0x5e5a58, 0.6), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.8, 0.82, 0.86)))                           # los tejados, nevados
CEBOLLAS = [material(f'cebolla-{i}', tex_cebolla(str(i), c0, c1, d), rug=0.6) for i, (c0, c1, d) in enumerate([
    ((0.1, 0.42, 0.2), (0.86, 0.7, 0.14), 'espiral'), ((0.12, 0.26, 0.62), (0.9, 0.9, 0.86), 'gajos'), ((0.66, 0.12, 0.1), (0.1, 0.4, 0.22), 'rombos'),
    ((0.7, 0.14, 0.1), (0.9, 0.88, 0.8), 'espiral'), ((0.86, 0.5, 0.1), (0.1, 0.36, 0.2), 'puntas'), ((0.1, 0.4, 0.42), (0.86, 0.66, 0.14), 'rombos'),
    ((0.2, 0.3, 0.66), (0.86, 0.4, 0.1), 'puntas'), ((0.1, 0.4, 0.2), (0.7, 0.14, 0.1), 'gajos')])]
# OJO: los colores lisos van en LINEAL.
ORO = material('oro', color=(0.8, 0.52, 0.12), rug=0.3)
BLANCO = material('blanco', color=(0.78, 0.78, 0.76), rug=0.8)
VERDE_T = material('verde-tejado', color=(0.05, 0.22, 0.14), rug=0.6)
ROJO_L = material('rojo-liso', color=(0.36, 0.08, 0.06), rug=0.9)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
ESTRELLA = material('brillo-estrella', color=(1.0, 0.12, 0.08), emite=2.0)
FUNDICION = material('fundicion', color=(0.03, 0.03, 0.035), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
ABETO = [material(f'abeto-{i}', color=c, rug=1.0) for i, c in enumerate([(0.03, 0.09, 0.06), (0.04, 0.11, 0.07)])]
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
RIO = material('rio', color=(0.42, 0.5, 0.62), rug=0.3)                              # el Moscova, helado (va sin luz)
MONTE_L = material('monte-lejos', color=(0.6, 0.64, 0.7), rug=1.0)
FACHADAS = [material(f'f-moscu-{i}', tex_postigos(f'moscu-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.82, 0.74, 0.58), (0.3, 0.3, 0.3)), ((0.74, 0.6, 0.5), (0.26, 0.24, 0.22)), ((0.78, 0.8, 0.78), (0.3, 0.36, 0.4)), ((0.84, 0.7, 0.5), (0.3, 0.24, 0.2))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.96, 0.88, 0.8)), (0.07, (0.9, 0.86, 0.86)), (0.25, (0.66, 0.76, 0.9)), (0.6, (0.42, 0.6, 0.86)), (1.0, (0.26, 0.44, 0.78))],
    (SOL[0], SOL[2]), 0.12, (0.5, 0.34, 0.16), ((1.0, 0.96, 0.9), (0.84, 0.86, 0.92)), cuanta_nube=0.22), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA PLAZA, LA RAMPA Y LA BOCA DE DEBAJO DE LA CATEDRAL
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
PLX0, PLX1, PLZ0, PLZ1 = -30.0, MURALLA, -120.0, 230.0                              # la plaza entera
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GP', NIEVE, PLX0, PX0, PLZ0, PLZ1, 0.0, 5.0)
suelo('GP', NIEVE, PX1, PLX1, PLZ0, PLZ1, 0.0, 5.0)
suelo('GP', NIEVE, PX0, PX1, PZ1, PLZ1, 0.0, 5.0)
suelo('GP', NIEVE, PX0, -ZANJA, Z_PIE, Z_BOCA, 0.0, 5.0)
suelo('GP', NIEVE, ZANJA, PX1, Z_PIE, Z_BOCA, 0.0, 5.0)
suelo('GP', NIEVE, PX0, PX1, PLZ0, Z_PIE, 0.0, 5.0)
Z_TUNEL = Z_PIE - 14.0
cara('P', RAMPA, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)], uvs=[(0, 0), (4, 0), (4, 4.4), (0, 4.4)], hacia=ARRIBA)
cara('P', RAMPA, [P(-ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_TUNEL, -HONDO), P(-ZANJA, Z_TUNEL, -HONDO)], uvs=[(0, 4.4), (4, 4.4), (4, 8), (0, 8)], hacia=ARRIBA)
for s in (-1, 1):
    cara('P', MURO_K, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_PIE, 0.0)], hacia=V((-s, 0, 0)), baldosa=3.0)
    viga('P', GRANITO_R, min(s * ZANJA, s * (ZANJA + 0.6)), max(s * ZANJA, s * (ZANJA + 0.6)), Z_PIE, Z_BOCA - 0.2, 0.0, 0.5, u_m=3.0, techo=NIEVE)
Y_BOCA = -0.5
viga('P', MURO_K, -ZANJA - 0.6, ZANJA + 0.6, Z_PIE - 1.4, Z_PIE, Y_BOCA, 0.0, u_m=3.0, techo=NIEVE)
cara('EP', NEGRO, [P(-ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, Y_BOCA), P(-ZANJA, Z_PIE - 0.05, Y_BOCA)], hacia=V((0, -1, 0)))
for x, y, r in ((-4.6, 1.0, 0.5), (-1.8, 2.4, 0.38), (1.2, 1.2, 0.62), (4.2, 2.6, 0.42), (0.2, 0.6, 0.3), (-6.0, 2.9, 0.26), (6.2, 0.9, 0.36), (2.8, 3.4, 0.22)):
    cara('EP', BRILLO_HONDO if r > 0.4 else VERDE, [P(x + r * math.cos(a_), Z_PIE - 0.02, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(9):
    x = -6.4 + k * 1.6 + random.uniform(-0.4, 0.4)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, Z_PIE - 0.2, -HONDO + 0.1), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.42))

# ==================================================================================
# 3. SAN BASILIO
# ==================================================================================
def cebolla (x, z, y, r, mat, cruz=True):
    """Una cúpula de cebolla con su tambor y su cruz."""
    torno('P', mat, en(x, z, y), [(r * 0.62, 0.0), (r * 0.95, r * 0.35), (r * 1.0, r * 0.75), (r * 0.8, r * 1.2), (r * 0.42, r * 1.6), (r * 0.12, r * 1.95), (0.0, r * 2.2)], lados=14, u_rep=1.0, v_m=r * 2.2, tapas=(False, False))
    if cruz:
        barra('EV', ORO, P(x, z, y + r * 2.1), P(x, z, y + r * 2.1 + 0.8), 0.06)
        barra('EV', ORO, P(x - 0.2, z, y + r * 2.1 + 0.55), P(x + 0.2, z, y + r * 2.1 + 0.55), 0.05)
def torre (x, z, r, alto, mat_cupula, r_cupula):
    torno('P', LADRILLO, en(x, z), [(r * 1.08, 0.0), (r, alto * 0.5), (r * 1.12, alto * 0.54), (r * 0.9, alto * 0.6), (r * 0.9, alto - 0.5), (r * 1.05, alto - 0.4), (r * 0.66, alto)], lados=8, u_rep=4, v_m=3.2, tapas=(False, False))
    cebolla(x, z, alto, r_cupula, mat_cupula)
# El zócalo, con su galería, y la escalera de la entrada (a un lado: delante está la rampa).
viga('P', LADRILLO, -5.6, 5.6, ZC - 5.6, ZC + 5.6, 0.0, 2.2, u_m=3.2, v_rep=0.7, techo=NIEVE)
# La torre central: ocho lados, la tienda y su cupulín dorado.
torno('P', LADRILLO, en(0.0, ZC), [(2.0, 2.2), (1.9, 5.6), (2.15, 5.8), (1.7, 6.4), (1.7, 7.2), (1.9, 7.3)], lados=8, u_rep=4, v_m=3.2, tapas=(False, False))
TIENDA = material('tienda', tex_cebolla('tienda', (0.5, 0.14, 0.1), (0.1, 0.34, 0.2), 'gajos'), rug=0.7)
torno('P', TIENDA, en(0.0, ZC, 7.3), [(1.9, 0.0), (0.42, 3.6), (0.42, 4.0)], lados=8, u_rep=1.0, v_m=4.0, tapas=(False, False))
cebolla(0.0, ZC, 11.3, 0.42, material('cebolla-oro', tex_cebolla('oro', (0.86, 0.6, 0.14), (0.8, 0.5, 0.1), 'gajos'), rug=0.3))
# Las cuatro torres grandes, en cruz, y las cuatro pequeñas, en las diagonales.
for i, (dx, dz) in enumerate(((0, 1), (1, 0), (0, -1), (-1, 0))):
    torre(dx * 3.6, ZC + dz * 3.6, 1.05, 6.0 + (0.5 if dz == 0 else 0.0), CEBOLLAS[i], 1.12)
for i, (dx, dz) in enumerate(((1, 1), (1, -1), (-1, -1), (-1, 1))):
    torre(dx * 3.3, ZC + dz * 3.3, 0.72, 4.6, CEBOLLAS[4 + i], 0.84)
# El campanario, a un lado, con su tejado de tienda verde.
torno('P', LADRILLO, en(6.6, ZC - 3.8), [(1.1, 0.0), (1.0, 5.0), (1.2, 5.2)], lados=8, u_rep=4, v_m=3.2, tapas=(False, False))
torno('EV', VERDE_T, en(6.6, ZC - 3.8, 5.2), [(1.2, 0.0), (0.2, 2.6), (0.0, 2.9)], lados=8, tapas=(False, False))
print('SAN BASILIO', 11.3 + 0.42 * 2.1 + 0.8, 'm')

# ==================================================================================
# 4. LOS LADOS DE LA PLAZA
# ==================================================================================
def almenas (z0, z1, x, y):
    """Las almenas en cola de golondrina de la muralla."""
    z = z0
    while z < z1:
        bloque('EV', ROJO_L, en(x, z + 0.5, y), (0.7, 0.9, 1.3), mella=0.0)
        z += 1.9
z = 60.0
while z > -116.0:                                                                    # la muralla del Kremlin, a tramos (de una pieza salía negra)
    z1 = max(-116.0, z - 30.0)
    g = 'P' if z1 > -96.0 and z < 30.0 else 'T'
    caja(g, MURO_K, MURALLA, MURALLA + 3.0, z1 + 0.2, z - 0.2, -0.1, 7.0, techo=NIEVE, baldosa=4.0)
    if g == 'P':
        almenas(z1 + 0.6, z - 0.6, MURALLA + 0.4, 7.0)
    z = z1
# El mausoleo: la pirámide escalonada de granito rojo y negro, delante de la muralla.
MZ0 = -18.0
for k, (m, alto) in enumerate(((5.2, 1.2), (4.4, 1.1), (3.6, 1.0), (2.6, 1.6))):
    y0 = sum(a_ for _, a_ in ((5.2, 1.2), (4.4, 1.1), (3.6, 1.0), (2.6, 1.6))[:k])
    viga('P', GRANITO_R, MURALLA - 1.6 - 2 * m, MURALLA - 1.6, MZ0 - m, MZ0 + m, y0, y0 + alto, u_m=3.0, techo=NIEVE)
# Abetos azules a lo largo de la muralla.
for z in np.arange(26.0, -96.0, -7.0):
    if abs(z - MZ0) < 8.0:
        continue
    pino('EV' if z > -70 else 'T', TRONCO, ABETO, MURALLA - 1.6, float(z), random.uniform(1.0, 1.4))
# El ruedo de la base alien.
torno('P', GRANITO_R, en(BASE[0], BASE[1]), [(5.15, -0.1), (5.15, 0.4), (4.7, 0.4), (4.7, 0.04)], lados=28, u_rep=12, v_m=1.2, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(ADOQUIN), rug=0.95)
cara('P', RUEDO, [P(BASE[0] + 4.7 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.7 * math.sin(2 * math.pi * i / 28), 0.04) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
# Los GUM, a la izquierda: la galería larga, con sus torrecillas.
GX = -30.0
z = 70.0
while z > -110.0:
    z1 = max(-110.0, z - 36.0)
    g = 'E' if z1 > -96.0 and z < 40.0 else 'C'
    viga(g, GUM, GX - 22.0, GX, z1 + 0.3, z - 0.3, 0.0, 9.0, u_m=9.0, techo=AZOTEA)
    torno('EV' if g == 'E' else 'T', VERDE_T, en(GX - 3.0, (z + z1) / 2, 9.0), [(2.4, 0.0), (1.2, 2.0), (0.2, 4.0), (0.0, 4.6)], lados=4, tapas=(False, False))
    z = z1
def farola (x, z, alto=5.0):
    torno('EV', FUNDICION, en(x, z), [(0.26, 0.0), (0.2, 0.6), (0.09, 0.9), (0.07, alto)], lados=6, tapas=(False, False))
    for d in (-0.5, 0.5):
        barra('EV', FUNDICION, P(x, z, alto - 0.3), P(x, z + d, alto), 0.06)
        copa('EV', FAROL, x, z + d, alto + 0.2, 0.2, 0.26, sub=1, baila=0.0)
for z in np.arange(6.0, -60.0, -16.0):
    farola(-9.0, float(z))
    if abs(z - BASE[1]) > 9.0:
        farola(9.0, float(z))
for _ in range(14):                                                                  # montones de nieve apartada
    s = random.choice((-1, 1))
    x, z = s * random.uniform(10.0, 16.0), random.uniform(-58.0, 8.0)
    if s > 0 and (math.hypot(x - BASE[0], z - BASE[1]) < 7.0 or abs(z - MZ0) < 8.0):
        continue
    elipsoide('EV', BLANCO, en(x, z, 0.0), (random.uniform(0.9, 1.6), random.uniform(0.9, 1.6), random.uniform(0.4, 0.7)))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-61.5)

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO: LA SPÁSSKAYA, EL KREMLIN, EL RÍO Y LA CIUDAD
# ==================================================================================
# La torre Spásskaya, en la muralla, junto a la catedral: cuerpo, reloj, aguja y estrella.
# Va a la escala de la catedral (0,3): a su tamaño, a su lado, San Basilio era una maqueta.
SX, SZ = MURALLA + 1.5, -70.0
viga('C', LADRILLO, SX - 1.8, SX + 1.8, SZ - 1.8, SZ + 1.8, 0.0, 9.0, u_m=3.2, v_rep=2.0, techo=NIEVE)
viga('C', LADRILLO, SX - 1.3, SX + 1.3, SZ - 1.3, SZ + 1.3, 9.0, 13.0, u_m=3.2, v_rep=1.0, techo=NIEVE)
cara('CP', NEGRO, [P(SX - 1.32, SZ + 0.7 * math.cos(a_), 11.4 + 0.7 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 14, endpoint=False)], hacia=V((-1, 0, 0)))
cara('CP', NEGRO, [P(SX + 0.7 * math.cos(a_), SZ + 1.32, 11.4 + 0.7 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 14, endpoint=False)], hacia=V((0, -1, 0)))
torno('T', VERDE_T, en(SX, SZ, 13.0), [(1.2, 0.0), (0.6, 2.6), (0.2, 7.0), (0.0, 8.4)], lados=8, tapas=(False, False))
elipsoide('CP', ESTRELLA, en(SX, SZ, 21.8), (0.5, 0.14, 0.5))
# Dentro del Kremlin: las catedrales de cúpulas doradas, el campanario de Iván el Grande y el Gran Palacio.
for x, z, m, alto in ((70.0, -30.0, 4.0, 6.0), (86.0, -10.0, 3.6, 5.4), (74.0, 6.0, 3.2, 5.0)):
    caja('T', BLANCO, x - m, x + m, z - m, z + m, 0.0, alto, techo=AZOTEA)
    for dx, dz in ((0, 0), (-0.5, -0.5), (0.5, -0.5), (-0.5, 0.5), (0.5, 0.5)):
        r = 1.3 if dx == 0 else 0.8
        torno('T', BLANCO, en(x + dx * m, z + dz * m, alto), [(r * 0.7, 0.0), (r * 0.7, r * 1.6)], lados=8, tapas=(False, False))
        torno('T', ORO, en(x + dx * m, z + dz * m, alto + r * 1.6), [(r * 0.62, 0.0), (r * 0.95, r * 0.35), (r, r * 0.75), (r * 0.8, r * 1.2), (r * 0.42, r * 1.6), (0.0, r * 2.2)], lados=10, tapas=(False, False))
torno('T', BLANCO, en(104.0, -36.0), [(1.7, 0.0), (1.5, 10.0), (1.2, 10.4), (1.1, 17.0), (0.9, 17.4), (0.8, 22.0)], lados=8, tapas=(False, False))
torno('T', ORO, en(104.0, -36.0, 22.0), [(0.7, 0.0), (1.1, 0.4), (1.1, 0.9), (0.9, 1.4), (0.4, 1.9), (0.0, 2.5)], lados=10, tapas=(False, False))
caja('T', FACHADAS[0], 60.0, 140.0, 40.0, 58.0, 0.0, 10.0, techo=AZOTEA)
for z0, z1 in ((60.0, 230.0), (-320.0, -116.0)):                                     # el resto de la muralla y sus torres
    z = z0
    while z < z1:
        caja('T', MURO_K, MURALLA, MURALLA + 3.0, z + 0.2, min(z1, z + 34.0) - 0.2, -0.1, 7.0, techo=NIEVE, baldosa=4.0)
        z += 34.0
for z in (130.0, 228.0, -180.0, -318.0):
    caja('T', MURO_K, MURALLA - 0.6, MURALLA + 3.6, z - 2.1, z + 2.1, 0.0, 10.0, techo=NIEVE, baldosa=4.0)
    torno('T', VERDE_T, en(MURALLA + 1.5, z, 10.0), [(2.4, 0.0), (0.7, 5.0), (0.0, 8.0)], lados=4, tapas=(False, False))
# El Museo de Historia, a la espalda: rojo, con sus torres de punta nevada.
caja('C', LADRILLO, -26.0, 16.0, 232.0, 252.0, 0.0, 9.6, techo=AZOTEA, baldosa=6.4)
for x in (-26.0, 16.0, -12.0, 2.0):
    torno('T', BLANCO, en(x, 232.0, 9.6), [(2.4, 0.0), (0.9, 5.0), (0.0, 10.0)], lados=4, tapas=(False, False))
# El suelo de alrededor, el río helado y la ciudad nevada.
suelo('G', NIEVE, MURALLA, 520.0, -320.0, 320.0, 0.0, 5.0)                           # el Kremlin por dentro
suelo('G', NIEVE, -1500.0, PLX0, -1500.0, 1500.0, 0.0, 5.0)
suelo('G', NIEVE, PLX0, 1500.0, 320.0, 1500.0, 0.0, 5.0)
suelo('G', NIEVE, 520.0, 1500.0, -320.0, 320.0, 0.0, 5.0)
suelo('G', NIEVE, PLX0, MURALLA, PLZ1, 320.0, 0.0, 5.0)
suelo('G', NIEVE, PLX0, MURALLA, -200.0, PLZ0, 0.0, 5.0)
suelo('G', NIEVE, PLX0, 1500.0, -1500.0, -420.0, 0.0, 5.0)
rect('CP', RIO, -3200.0, 3200.0, -420.0, -200.0, -2.0, 200.0)
rect('CP', RIO, MURALLA, 3200.0, -420.0, -320.0, -2.0, 200.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 38.0):
    for gz in np.arange(-1250.0, 1250.0, 38.0):
        cx, cz = gx + 19 + random.uniform(-4, 4), gz + 19 + random.uniform(-4, 4)
        if math.hypot(cx, cz + 80.0) < 560.0 or (-60.0 < cx < 540.0 and -340.0 < cz < 340.0) or -430.0 < cz < -190.0 or random.random() < 0.2:   # lejos: con casas de su tamaño al lado, la catedral era una maqueta
            continue
        ax, az = random.choice((11.0, 12.5, 14.0)), random.choice((11.0, 12.5, 14.0))
        lejos_ = math.hypot(cx, cz) > 700.0
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, random.choice([12, 15, 18, 21]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for cx, cz, radio, alto in ((-1900.0, -1900.0, 900.0, 30.0), (1800.0, 2000.0, 900.0, 30.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=16, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-plaza', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-moscu', ['P', 'E', 'GP', 'EV', 'EP']), ('lugar-moscu-ciudad', ['C', 'G', 'T', 'CP'])],
    # Sol de invierno, bajo y algo dorado; el cielo, un poco más que de costumbre: la
    # sombra azul sobre la nieve es lo que hace que parezca nieve.
    sol_hacia=SOL, sol_color=(1.0, 0.84, 0.66), sol_fuerza=6.0, sol_ancho=4.0, cielo_fuerza=0.2, cielo_altura=10, cielo_giro=200,
    escala=0.8, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
