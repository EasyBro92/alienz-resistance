# Chongqing: el paseo del río al pie de Hongyadong, de noche (10/10/2026).
#   blender -b -P herramientas/blender/lugar_chongqing.py              (entero)
#   blender -b -P herramientas/blender/lugar_chongqing.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_chongqing.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Chongqing es Hongyadong: once pisos de casas sobre pilotes colgadas del
# acantilado, encendidas en oro. Los alienz EN NAVE (es la misión grande de
# China); DE NOCHE, que es cuando el sitio es el sitio.
#
# Cómo está puesto. Se juega en el paseo del Jialing, mirando al acantilado:
#   · HONGYADONG LLENA EL FONDO, a su tamaño (55 m y más de 200 de largo): jugando
#     se ven sus tres primeros pisos de aleros encendidos, de lado a lado, y en la
#     llegada entero, con las torres de la ciudad encima.
#   · A la izquierda, el pretil y el río, negro, con los reflejos; a la derecha,
#     los puestos con sus farolillos y sus rótulos, y la base alien en un ruedo.
#   · Solo en el vuelo: el puente de Qiansimen encendido y la ciudad en el risco.
#   · LA LUZ: casi no hay (una luna azulada). Lo que brilla va sin luz, y la
#     claridad que echa Hongyadong sobre el paseo va PINTADA en el suelo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.3, 0.75, 0.6)                  # la luna: alta, a la espalda y algo a la izquierda
iniciar('chongqing', 3322, eje=(0.0, -80.0), encendidas=0.2, reflejo=(0.2, 0.14, 0.1))

RIO_Y = -8.0
PRETIL = 9.5                             # a la izquierda, el río
ZH = -92.0                               # la cara del primer piso de Hongyadong
PISOS, ALTO_P, REMETE = 11, 5.0, 2.4
BASE = (12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))
Z_FAROLAS = [float(z) for z in np.arange(6.0, -62.0, -13.0)]

def tex_pista ():
    """El paseo: losas oscuras, mojadas. De noche lo que se ve es la LUZ: el oro de
    Hongyadong que entra desde el fondo estirado en reflejos, y el charco blanco
    de cada farola."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('stone_pavers', 256, 0x8a8890, 0.5))
    lz, lx = 0.7 * KZ, 1.4 * KX
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + lz))
        c = -(fila % 2) * lx / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + lx))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.88, 1.08)
                a[f0:f1, c0:c0 + 1] *= 0.6
            c += lx
        a[f0:f0 + 1] *= 0.6
        fila += 1; f += lz
    a *= (0.85 + 0.25 * nube(PH_, PW, 16, 4))[..., None]
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    zs = PZ0 + yy / KZ                                                   # la z de cada fila
    # El oro que viene del fondo: más fuerte cuanto más cerca, y a rayas largas (el suelo está mojado).
    cerca = np.clip((10.0 - zs) / 72.0, 0, 1) ** 1.6
    rayas = 0.55 + 0.45 * nube(4, PW, 1, 40)[0][None, :] * (0.7 + 0.3 * nube(PH_, PW, 50, 3))
    a = a * (0.46 + 0.5 * cerca[..., None]) + (cerca * rayas)[..., None] * np.array((0.5, 0.3, 0.08), np.float32) * 1.0
    luz = np.zeros((PH_, PW), np.float32)
    for z in Z_FAROLAS:                                                  # las farolas del pretil y las de los puestos
        for x, k in ((-8.9, 1.0), (8.9, 0.8)):
            c, f_ = a_px(x, z)
            luz += k * np.exp(-(((xx - c) / (3.2 * KX)) ** 2 + ((yy - f_) / (3.2 * KZ)) ** 2))
    a += np.clip(luz, 0, 1)[..., None] * np.array((0.34, 0.33, 0.3), np.float32) * tejar(foto('stone_pavers', 256, 0xd0d0d0, 0.5))
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.0, -16.0, 1.5), (4.6, -35.0, 1.6), (-1.4, -53.0, 1.4)):      # la guerra
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_piso ():
    """Un tramo de piso de Hongyadong (6 × 3,6 m): pilares de madera, la barandilla
    y, detrás, todo encendido en oro. Va sin luz."""
    W, Hh = 256, 128
    a = lienzo(Hh, W, (0.1, 0.04, 0.02))
    oro = np.array((1.0, 0.68, 0.22), np.float32)
    for k in range(4):
        x0 = k * 64
        v = random.uniform(0.7, 1.0)
        a[26:100, x0 + 6:x0 + 58] = oro * v * (0.8 + 0.2 * nube(74, 52, 3, 3))[..., None]
        a[26:100:9, x0 + 6:x0 + 58] = (0.22, 0.07, 0.03)
        a[26:100, x0 + 6:x0 + 58:13] = (0.22, 0.07, 0.03)
        a[:, x0:x0 + 5] = (0.3, 0.07, 0.04)                               # el pilar
    a[100:112] = (0.34, 0.1, 0.05); a[100:112:4] = (0.7, 0.4, 0.12)       # la barandilla
    a[112:] = (0.08, 0.03, 0.02)
    a[:10] = oro * 0.95; a[10:18] = (0.5, 0.12, 0.05)                     # la línea de luz bajo el alero
    return guardar('piso-hongya', np.clip(a, 0, 1), 90)

def tex_rio ():
    """El Jialing de noche: negro, con los oros y los neones estirados."""
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    b = np.sin(yy / 4.0 + 2.0 * np.sin(xx / 19.0)) * 0.5 + 0.5
    a = np.stack([0.02 + 0.03 * b, 0.025 + 0.03 * b, 0.05 + 0.05 * b], axis=-1)
    for _ in range(16):
        c, f = random.randrange(8, W - 8), random.randrange(0, Hh - 80)
        largo = random.randint(20, 50)
        a[f:f + largo, c:c + 2] += 0.6 * np.array(random.choice(((0.8, 0.5, 0.14), (0.8, 0.5, 0.14), (0.7, 0.14, 0.3), (0.14, 0.4, 0.8))), np.float32) * np.linspace(1, 0, largo, dtype=np.float32)[:, None, None]
    return guardar('rio-jialing', np.clip(a, 0, 1), 88)

def tex_rotulos ():
    """Los rótulos de los puestos: neón de colores con sus letras a bulto. Sin luz."""
    a = lienzo(64, 256, (0.03, 0.02, 0.03))
    for k in range(4):
        x0 = k * 64
        color = np.array(random.choice(((1.0, 0.16, 0.12), (1.0, 0.7, 0.14), (0.2, 0.7, 1.0), (1.0, 0.25, 0.7))), np.float32)
        a[8:56, x0 + 4:x0 + 60] = color * 0.24
        for c in range(x0 + 9, x0 + 54, 12):
            a[16:48, c:c + 8] = color
            a[random.randint(20, 40):, c + 2:c + 6][:6] = color * 0.24
        a[8:10, x0 + 4:x0 + 60] = color; a[54:56, x0 + 4:x0 + 60] = color
    return guardar('rotulos', np.clip(a, 0, 1), 90)

PISTA = material('pista', tex_pista(), rug=0.6)
LOSA = material('losa', de_polyhaven('stone_pavers', 512, 0x2c2c34, 0.5), rug=0.8)
PIEDRA_T = material('sillar-oscuro', de_polyhaven('rock_tile_floor', 512, 0x5e5c64, 0.5), rug=0.9)
ROCA = material('risco', de_polyhaven('rock_face_03', 512, 0x4a4650, 0.6), rug=1.0)
TEJA = material('teja-china', de_polyhaven('ceramic_roof_01', 256, 0x3c3a42, 0.8), rug=0.8)
PISO = material('piso-hongya', tex_piso(), rug=0.8)
ROTULOS = material('rotulos', tex_rotulos(), rug=0.8)
RIO = material('rio', tex_rio(), rug=0.1)
AZOTEA = material('azotea', tex_azotea((0.14, 0.14, 0.18)))
# OJO: los colores lisos van en LINEAL.
MADERA = material('madera-oscura', color=(0.05, 0.025, 0.02), rug=0.9)
HIERRO = material('hierro', color=(0.03, 0.03, 0.04), rug=0.5)
PIEDRA = material('piedra-gris', color=(0.16, 0.16, 0.2), rug=0.9)
LONA = [material(f'lona-{i}', color=c, rug=0.9) for i, c in enumerate([(0.3, 0.04, 0.03), (0.05, 0.1, 0.24), (0.3, 0.2, 0.04)])]
FAROL = material('brillo-farol', color=(1.0, 0.2, 0.06), emite=2.6)
ORO_L = material('brillo-oro', color=(1.0, 0.7, 0.25), emite=2.4)
BLANCA = material('brillo-farola', color=(1.0, 0.95, 0.85), emite=2.6)
NEON = [material(f'brillo-neon-{i}', color=c, emite=1.6) for i, c in enumerate([(0.9, 0.2, 0.7), (0.2, 0.6, 1.0), (1.0, 0.75, 0.3), (0.5, 0.3, 1.0)])]
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.05, 0.03), (0.03, 0.07, 0.035)])]
TRONCO = material('tronco', color=(0.04, 0.03, 0.03))
MONTE_L = material('monte-lejos', color=(0.04, 0.04, 0.08), rug=1.0)
TORRES = [material('t-noche-0', tex_vidrio('cq-0', (0.06, 0.09, 0.18))), material('t-noche-1', tex_vidrio('cq-1', (0.09, 0.08, 0.16))),
          material('t-noche-2', tex_oficina('cq-of-0', (0.16, 0.16, 0.22), (0.05, 0.08, 0.14))), material('t-noche-3', tex_vidrio('cq-2', (0.12, 0.08, 0.12)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.34, 0.2, 0.3)), (0.08, (0.2, 0.14, 0.28)), (0.3, (0.08, 0.08, 0.2)), (1.0, (0.02, 0.03, 0.1))],
    (SOL[0], SOL[2]), 0.6, (0.1, 0.1, 0.16), ((0.3, 0.26, 0.36), (0.14, 0.12, 0.2)), cuanta_nube=0.3), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL PASEO, EL PRETIL Y EL RÍO
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z_ATRAS = 140.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSA, -PRETIL, 60.0, ZH, PZ0, 0.0, 3.6)                                  # la plazuela de delante de Hongyadong
suelo('GN', LOSA, -PRETIL, PX0, PZ0, Z_ATRAS, 0.0, 3.6)
suelo('GN', LOSA, PX1, 60.0, PZ0, Z_ATRAS, 0.0, 3.6)
suelo('GN', LOSA, PX0, PX1, PZ1, Z_ATRAS, 0.0, 3.6)
cara('P', PIEDRA_T, [P(-PRETIL, Z_ATRAS, RIO_Y - 1.0), P(-PRETIL, ZH - 60.0, RIO_Y - 1.0), P(-PRETIL, ZH - 60.0, 0.0), P(-PRETIL, Z_ATRAS, 0.0)], hacia=V((-1, 0, 0)), baldosa=4.0)
rect('EP', RIO, -1500.0, -PRETIL, -1500.0, 1500.0, RIO_Y, 40.0)
z = 24.0
while z > ZH + 4.0:                                                                  # el pretil del río, de piedra, a tramos
    viga('P', PIEDRA_T, -PRETIL, -PRETIL + 0.35, z - 2.8, z - 0.2, 0.25, 0.95, u_m=2.0, techo=PIEDRA_T)
    bloque('EV', PIEDRA, en(-PRETIL + 0.18, z, 0.0), (0.4, 0.4, 1.2), mella=0.01)
    z -= 3.0
def farola (x, z, s):
    """Farola moderna: báculo y la pantalla encendida."""
    barra('EV', HIERRO, P(x, z, 0.0), P(x, z, 6.4), 0.14)
    barra('EV', HIERRO, P(x, z, 6.3), P(x + s * 1.4, z, 6.6), 0.09)
    cubo('EP', BLANCA, P(x + s * 1.5, z, 6.52), (0.7, 0.3, 0.08))
for z in Z_FAROLAS:
    farola(-PRETIL + 0.3, z, 1)

# ==================================================================================
# 3. LOS PUESTOS DE LA DERECHA Y LA BASE ALIEN
# ==================================================================================
def farolillo (x, z, y, r=0.3):
    torno('EP', FAROL, en(x, z, y), [(r * 0.45, 0.0), (r, r * 0.5), (r, r * 1.0), (r * 0.45, r * 1.5)], lados=8, tapas=(False, False))
def puesto (x, z, largo=5.0):
    """Un puesto de comida: cuatro palos, la lona, el mostrador, su rótulo de neón y una ristra de farolillos."""
    lona = random.choice(LONA)
    for dz in (-largo / 2, largo / 2):
        barra('EV', HIERRO, P(x - 1.3, z + dz, 0.0), P(x - 1.3, z + dz, 2.7), 0.08)
        barra('EV', HIERRO, P(x + 1.3, z + dz, 0.0), P(x + 1.3, z + dz, 2.4), 0.08)
    cara('EV', lona, [P(x - 1.6, z - largo / 2 - 0.2, 2.75), P(x - 1.6, z + largo / 2 + 0.2, 2.75), P(x + 1.6, z + largo / 2 + 0.2, 2.4), P(x + 1.6, z - largo / 2 - 0.2, 2.4)], hacia=ARRIBA)
    caja('EV', MADERA, x - 1.0, x - 0.3, z - largo / 2 + 0.3, z + largo / 2 - 0.3, 0.0, 1.0, baldosa=4.0)
    cara('EP', ROTULOS, [P(x - 1.62, z + largo / 2, 2.8), P(x - 1.62, z - largo / 2, 2.8), P(x - 1.62, z - largo / 2, 3.7), P(x - 1.62, z + largo / 2, 3.7)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((-1, 0, 0)))
    for dz in np.arange(-largo / 2 + 0.5, largo / 2, 1.0):
        farolillo(x - 1.6, z + float(dz), 2.2, 0.2)
for z in (2.0, -6.0, -14.5, -23.0, -58.0, -66.0, -74.0):
    puesto(12.2 + random.uniform(-0.2, 0.3), z)
for z in Z_FAROLAS:
    if abs(z - BASE[1]) > 8.0:
        farola(9.9, z, -1)
# El ruedo de la base alien, entre los puestos.
torno('P', PIEDRA_T, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.3), (4.8, 0.3), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(LOSA), rug=0.8)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.07) for r, a_ in ((4.6, a0), (4.6, a1), (4.4, a1), (4.4, a0))], hacia=ARRIBA)
for z in (-30.0, -84.0, 10.0):                                                       # algún árbol entre puestos
    arbol('EV', TRONCO, HOJAS, 15.5, z, 1.3)

# ==================================================================================
# 4. HONGYADONG
# ==================================================================================
HX0, HX1 = -40.0, 190.0                                                              # de dónde a dónde llega
def piso (k):
    """Un piso entero: su fila de salas encendidas, el alero de teja con las puntas levantadas y los farolillos."""
    z = ZH - k * REMETE
    y0 = k * ALTO_P
    juego = k < 3                                                                    # los tres de abajo son los que se ven jugando
    g_luz, g_teja, g_fino = ('EP', 'P', 'EV') if juego else ('CP', 'T', 'T')
    x = HX0 + random.uniform(0, 6.0) + k * 4.0
    fin = HX1 - k * random.uniform(3.0, 9.0)
    while x < fin:
        largo = random.choice((12.0, 18.0, 24.0, 30.0))
        x1 = min(fin, x + largo)
        cara(g_luz, PISO, [P(x, z, y0 + 0.9), P(x1, z, y0 + 0.9), P(x1, z, y0 + 4.2), P(x, z, y0 + 4.2)], uvs=[(0, 0), (round((x1 - x) / 6.0), 0), (round((x1 - x) / 6.0), 1), (0, 1)], hacia=V((0, -1, 0)))
        # el alero: baja hacia fuera, con las dos puntas arriba
        vuela, cae = 2.0, 0.9
        a0, a1 = P(x - 0.6, z, y0 + 5.2), P(x1 + 0.6, z, y0 + 5.2)
        b0, b1 = P(x - 1.2, z + vuela, y0 + 5.2 - cae + 0.8), P(x1 + 1.2, z + vuela, y0 + 5.2 - cae + 0.8)
        bm = P((x + x1) / 2, z + vuela, y0 + 5.2 - cae)
        am = P((x + x1) / 2, z, y0 + 5.2)
        for tri in ((a0, b0, bm), (a0, bm, am), (am, bm, b1), (am, b1, a1)):
            cara(g_teja, TEJA, list(tri), hacia=V((0, -1, 1.5)), baldosa=2.4)
        cara(g_luz, ORO_L, [b0 + V((0, 0, -0.12)), b1 + V((0, 0, -0.12)), b1 + V((0, 0, -0.02)), bm + V((0, 0, -0.02)), b0 + V((0, 0, -0.02))], hacia=V((0, -1, 0)))   # el filo encendido del alero
        if juego:
            for xx in np.arange(x + 1.5, x1 - 1.0, 3.0):
                farolillo(float(xx), z + vuela - 0.1, y0 + 5.2 - cae - 0.5, 0.26)
                barra(g_fino, MADERA, P(float(xx) - 1.5, z + 0.1, y0), P(float(xx) - 1.5, z + 0.1, y0 + 0.9), 0.3)
        x = x1 + random.choice((0.0, 0.0, 1.2))
    caja(g_teja, ROCA, HX0 - 30.0, HX1 + 30.0, z - REMETE - 0.4, z - 0.15, y0 - 0.05, y0 + ALTO_P, baldosa=7.0)     # el risco y el forjado de detrás
for k in range(PISOS):
    piso(k)
Y_ALTO = PISOS * ALTO_P
viga('P', PIEDRA_T, HX0 - 30.0, HX1 + 30.0, ZH + 0.1, ZH + 0.6, 0.0, 0.9, u_m=3.0, techo=PIEDRA_T)                   # el zócalo de sillar del primer piso
# el risco sigue a la izquierda, sobre el río, y a la derecha
caja('T', ROCA, HX0 - 400.0, HX0 - 30.0, ZH - 40.0, ZH - 4.0, RIO_Y - 2.0, Y_ALTO * 0.8, baldosa=9.0)
caja('T', ROCA, HX1 + 30.0, HX1 + 500.0, ZH - 40.0, ZH - 4.0, 0.0, Y_ALTO * 0.8, baldosa=9.0)
print('HONGYADONG', Y_ALTO, 'm;', HX1 - HX0, 'de largo')

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'))

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO: LA CIUDAD EN EL RISCO, EL PUENTE Y LA OTRA ORILLA
# ==================================================================================
suelo('G', LOSA, -PRETIL, 1500.0, Z_ATRAS, 1500.0, 0.0, 6.0)
suelo('G', LOSA, 60.0, 1500.0, ZH, Z_ATRAS, 0.0, 6.0)
suelo('G', LOSA, -1500.0, 1500.0, -1500.0, ZH - 40.0, Y_ALTO * 0.8, 6.0)             # la meseta de arriba, donde está la ciudad
n_ed = 0
for gx in np.arange(-420.0, 900.0, 44.0):
    for gz in np.arange(-900.0, ZH - 70.0, 44.0):
        if random.random() < 0.2:
            continue
        cx, cz = gx + 22 + random.uniform(-6, 6), gz + 22 + random.uniform(-6, 6)
        a = random.uniform(11.0, 16.0)
        caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, Y_ALTO * 0.8, Y_ALTO * 0.8 + random.uniform(60.0, 230.0), techo=AZOTEA, baldosa=17.0)
        n_ed += 1
for gx in np.arange(70.0, 900.0, 40.0):                                              # y la de este lado, río abajo
    for gz in np.arange(ZH + 20.0, 700.0, 40.0):
        if random.random() < 0.3:
            continue
        cx, cz = gx + 20 + random.uniform(-5, 5), gz + 20 + random.uniform(-5, 5)
        a = random.uniform(10.0, 14.0)
        caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, random.uniform(30.0, 150.0), techo=AZOTEA, baldosa=17.0)
        n_ed += 1
print('EDIFICIOS', n_ed)
# El puente de Qiansimen, sobre el río: tablero, pilono y los tirantes encendidos.
QZ = -20.0
caja('T', PIEDRA_T, -700.0, -PRETIL - 30.0, QZ - 8.0, QZ + 8.0, 26.0, 29.0, baldosa=8.0)
QX = -230.0
for dz in (-9.0, 9.0):
    barra('T', PIEDRA, P(QX, QZ + dz, RIO_Y - 2.0), P(QX, QZ + dz * 0.2, 150.0), 7.0)
for k in range(12):
    for s in (-1, 1):
        barra('CP', NEON[2], P(QX + s * (24.0 + 15.0 * k), QZ, 29.5), P(QX, QZ, 70.0 + 6.0 * k), 0.9)
cara('CP', ORO_L, [P(-700.0, QZ + 8.1, 26.0), P(-PRETIL - 30.0, QZ + 8.1, 26.0), P(-PRETIL - 30.0, QZ + 8.1, 27.2), P(-700.0, QZ + 8.1, 27.2)], hacia=V((0, -1, 0)))
# La otra orilla (Jiangbei), con su línea de luces.
suelo('G', LOSA, -1500.0, -640.0, -1500.0, 1500.0, 0.0, 6.0)
for gz in np.arange(-900.0, 900.0, 46.0):
    for gx in (-700.0, -760.0, -830.0):
        if random.random() < 0.7:
            a = random.uniform(12.0, 18.0)
            caja('CP', random.choice(TORRES), gx - a, gx + a, float(gz), float(gz) + 2 * a, 0.0, random.uniform(60.0, 220.0), techo=AZOTEA, baldosa=17.0)
for cx, cz, radio, alto in ((-300.0, -2300.0, 1300.0, 260.0), (1500.0, -1900.0, 1000.0, 220.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=18, anillos=4, pico=0.8)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
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
    exportes=[('lugar-chongqing', ['P', 'GN', 'EV', 'EP']), ('lugar-chongqing-ciudad', ['G', 'T', 'CP'])],
    # Noche: una luna azulada y poco cielo. La escala va alta para que lo que no
    # brilla se distinga; la luz de Hongyadong sobre el paseo va pintada en el suelo.
    sol_hacia=SOL, sol_color=(0.7, 0.8, 1.0), sol_fuerza=2.4, sol_ancho=6.0, cielo_fuerza=0.12, cielo_altura=30, cielo_giro=150,
    escala=1.5, satura=0.8, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
