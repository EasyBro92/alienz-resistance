# Pekín: encima de la Gran Muralla, en Badaling, un día de otoño (10/10/2026).
#   blender -b -P herramientas/blender/lugar_pekin.py              (entero)
#   blender -b -P herramientas/blender/lugar_pekin.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_pekin.py -- --reusar  (retocar la luz)
#
# Desde el 10/10 Isidro deja a mi elección el sitio, la entrada y la hora de cada
# mapa («elige tú y sigue sin parar»). Para Pekín: LA GRAN MURALLA, que es lo más
# famoso de China; los alienz SALEN DE LA TORRE de vigilancia; DE DÍA, en otoño.
#
# Cómo está puesto. Se juega ENCIMA de la muralla, por su camino de ronda:
#   · El adarve va ensanchado (18 m; el de verdad mide seis) para que quepan los
#     cinco carriles: almenas altas a la izquierda, pretil bajo a la derecha.
#   · Al fondo, la torre (16 × 11,6 m: a su tamaño, cabe entera) con su puerta de
#     arco de 3 m: los alienz nacen dentro y salen en abanico (`abanico`).
#   · A los lados, la ladera cae con el bosque de otoño. La base alien, en un
#     cubo redondo que sale de la muralla a la derecha.
#   · Solo en el vuelo: la muralla serpenteando por las crestas, con sus torres,
#     hasta perderse.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.3, 0.7, 0.65)                   # media mañana: alto, a la espalda y algo a la derecha
iniciar('pekin', 3120, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.1, 0.1, 0.12))

ADARVE = 9.4                             # medio camino de ronda
MURO = 10.3                              # la cara de fuera de la muralla
ALTO_M = 7.0                             # lo que levanta sobre la ladera
VALLE = -70.0
ZT0, ZT1 = -70.0, -82.0                  # la torre: su cara y su espalda
MT, HT = 8.0, 7.4                        # media torre y su alto hasta el adarve de arriba
BASE = (12.6, -44.0)
R_CUBO = 5.9

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El camino de ronda: ladrillo gris grande a matajunta, gastado en el centro
    por los pies, con hierba en las juntas de los lados, el canalillo y las gárgolas."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('stone_pavers', 256, 0xb2aa9c, 0.5))
    lz, lx = 0.4 * KZ, 0.8 * KX
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + lz))
        c = -(fila % 2) * lx / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + lx))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.88, 1.08)
                a[f0:f1, c0:c0 + 1] *= 0.66
            c += lx
        a[f0:f0 + 1] *= 0.66
        fila += 1; f += lz
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    a *= (0.9 + 0.16 * nube(PH_, PW, 18, 5))[..., None]
    a *= (1.06 - 0.1 * np.clip(np.abs(xs) / 9.0, 0, 1) ** 2)[..., None]             # más claro donde se pisa
    verde = np.array((0.34, 0.42, 0.2), np.float32)
    musgo = np.clip((nube(PH_, PW, 30, 9) + 0.5 * np.clip((np.abs(xs) - 6.0) / 3.2, 0, 1) - 0.72) / 0.12, 0, 1)[..., None]
    a = a * (1 - 0.4 * musgo) + verde * 0.4 * musgo
    for x in (-8.7, 8.7):                                                # el canalillo de desagüe
        (c, _) = a_px(x, 0)
        a[:, c - 2:c + 3] *= 0.6
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.4, -14.0, 1.5), (-4.8, -33.0, 1.6), (1.6, -52.0, 1.4)):       # la guerra
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.42)
        for _ in range(40):
            ang, d = random.uniform(0, 6.28), r_ * random.uniform(0.3, 1.8)
            c, f = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                a[f:f + 2, c:c + 2] = random.choice(((0.1, 0.1, 0.1), (0.66, 0.62, 0.56)))
    for _ in range(46):
        mancha(random.uniform(-9, 9), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.0), random.uniform(0.8, 0.92), random.uniform(0.6, 1.5))
    for _ in range(500):                                                 # hojas caídas
        c, f = random.randrange(1, PW - 3), random.randrange(1, PH_ - 3)
        a[f:f + 2, c:c + 2] = random.choice(((0.7, 0.3, 0.08), (0.75, 0.5, 0.1), (0.5, 0.14, 0.06)))
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_ladrillo ():
    """El ladrillo de la muralla: hiladas largas, grises, con sus desconchones y el verdín de abajo."""
    n = 256
    a = foto('castle_wall_varriation', n, 0xb0a898, 0.5).copy()
    for f in range(0, n, 16):
        c = -random.randint(0, 30) + (f // 16 % 2) * 20
        while c < n:
            c0, c1 = max(0, c), min(n, c + 40)
            a[f:f + 16, c0:c1] *= random.uniform(0.86, 1.08)
            a[f:f + 16, c0:c0 + 1] *= 0.66
            c += 40
        a[f:f + 1] *= 0.66
    a *= (0.88 + 0.2 * nube(n, n, 5, 5))[..., None]
    return guardar('ladrillo-muralla', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.95)
LADRILLO = material('ladrillo-muralla', tex_ladrillo(), rug=0.95)
SOLADO = material('solado', de_polyhaven('stone_pavers', 512, 0xb2aa9c, 0.5), rug=0.95)
LADERA = material('ladera', de_polyhaven('sparse_grass', 512, 0x9a9460, 0.5), rug=1.0)
TEJA_G = material('teja-gris', de_polyhaven('ceramic_roof_01', 256, 0x77746e, 0.8), rug=0.9)
# OJO: los colores lisos van en LINEAL.
PIEDRA = material('piedra-muralla', color=(0.4, 0.37, 0.31), rug=1.0)
PIEDRA_L = material('muralla-lejos', color=(0.4, 0.37, 0.31), rug=1.0)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
SOMBRA = material('sombra-vano', color=(0.05, 0.045, 0.04), rug=1.0)
MADERA_R = material('madera-roja', color=(0.36, 0.06, 0.04), rug=0.8)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
BANDERA = material('bandera', color=(0.6, 0.04, 0.03), rug=0.8)
# El bosque de otoño: verdes, amarillos, naranjas y granates.
OTONO = [material(f'otono-{i}', color=c, rug=1.0) for i, c in enumerate([(0.07, 0.15, 0.04), (0.1, 0.19, 0.05), (0.5, 0.36, 0.04), (0.56, 0.2, 0.03), (0.4, 0.07, 0.04), (0.62, 0.42, 0.06)])]
PINOS = [material(f'pino-{i}', color=c, rug=1.0) for i, c in enumerate([(0.03, 0.08, 0.035), (0.04, 0.1, 0.04)])]
TRONCO = material('tronco', color=(0.09, 0.07, 0.05))
MONTES = [material('monte-cerca', color=(0.22, 0.2, 0.07), rug=1.0), material('monte-medio', color=(0.3, 0.2, 0.08), rug=1.0), material('monte-lejos', color=(0.3, 0.33, 0.36), rug=1.0)]
VALLE_M = material('valle', color=(0.2, 0.22, 0.1), rug=1.0)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.84, 0.88, 0.92)), (0.07, (0.72, 0.83, 0.95)), (0.25, (0.44, 0.67, 0.94)), (0.6, (0.22, 0.47, 0.88)), (1.0, (0.12, 0.33, 0.78))],
    (SOL[0], SOL[2]), 0.48, (0.3, 0.25, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.1), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA MURALLA DONDE SE JUEGA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z_ATRAS = 70.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
rect('P', SOLADO, PX0, PX1, ZT0, PZ0, 0.0, 3.2)
rect('P', SOLADO, PX0, PX1, PZ1, Z_ATRAS, 0.0, 3.2)
def en_cubo (z):
    return abs(z - BASE[1]) < R_CUBO - 0.6
for s in (-1, 1):
    # la cara de fuera, de arriba abajo, y lo que queda de adarve bajo el pretil
    cara('P', LADRILLO, [P(s * MURO, Z_ATRAS, -ALTO_M - 1.0), P(s * MURO, ZT1, -ALTO_M - 1.0), P(s * MURO, ZT1, 0.0), P(s * MURO, Z_ATRAS, 0.0)], hacia=V((s, 0, 0)), baldosa=4.0)
    rect('P', SOLADO, min(s * 9.2, s * MURO), max(s * 9.2, s * MURO), ZT0, Z_ATRAS, 0.0, 3.2)
    # el pretil: almenas altas a la izquierda (el lado de fuera), murete con aspilleras a la derecha
    alto = 1.9 if s < 0 else 1.0
    z = Z_ATRAS
    while z > ZT0 + 0.5:
        z1 = max(ZT0, z - 2.6)
        if not (s > 0 and en_cubo((z + z1) / 2)):
            viga('P', LADRILLO, min(s * (MURO - 0.6), s * MURO), max(s * (MURO - 0.6), s * MURO), z1, z, 0.0, 0.9, u_m=2.0, techo=LADRILLO)
            if s < 0:
                viga('P', LADRILLO, -MURO, -MURO + 0.6, z1 + 0.5, z - 0.5, 0.9, alto, u_m=2.0, techo=LADRILLO)   # la almena
        z = z1

# El cubo de la base alien: un torreón macizo, redondo, a ras del adarve.
N_C = 28
circ = [(BASE[0] + R_CUBO * math.cos(2 * math.pi * i / N_C), BASE[1] + R_CUBO * math.sin(2 * math.pi * i / N_C)) for i in range(N_C)]
SOLADO_C = material('solado-cubo', imagen_de(SOLADO), rug=0.95)
prisma('P', LADRILLO, circ, -ALTO_M - 3.0, 0.05, techo=SOLADO_C, baldosa=4.0)
for i in range(N_C):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_C]
    if (ax + bx) / 2 > MURO + 0.3:
        barra('EV', PIEDRA, P(ax, az, 0.45), P(bx, bz, 0.45), 0.5)
        if i % 2 == 0:
            barra('EV', PIEDRA, P(ax, az, 1.1), P(bx, bz, 1.1), 0.5)
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.08)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.82), f(ax, az, 0.82)], hacia=ARRIBA)

# ==================================================================================
# 3. LA TORRE
# ==================================================================================
ZTC = (ZT0 + ZT1) / 2
def medio_punto (medio, y_arr, n=7):
    return [(medio * math.cos(t), y_arr + medio * math.sin(t)) for t in np.linspace(0, math.pi, 2 * n - 1)]
PUERTA = 1.5
contorno = [(-MT, 0.0), (-PUERTA, 0.0)] + [(x, y) for x, y in reversed(medio_punto(PUERTA, 2.2))] + [(PUERTA, 0.0), (MT, 0.0), (MT, HT), (-MT, HT)]
extruido('P', LADRILLO, en(0.0, ZTC), contorno, ZT0 - ZT1, baldosa=4.0)
viga('P', LADRILLO, -MT - 0.25, MT + 0.25, ZT1 - 0.25, ZT0 + 0.25, HT - 0.5, HT, u_m=4.0, techo=SOLADO)         # la cornisa
for cx in (-5.6, -3.2, 3.2, 5.6):                                                  # las ventanas de arco de la cámara
    for zc, d in ((ZT0 + 0.03, 1), (ZT1 - 0.03, -1)):
        cara('EP', SOMBRA, [P(cx + x, zc, y) for x, y in [(-0.55, 3.4), (0.55, 3.4)] + [(0.55 * math.cos(t), 4.6 + 0.55 * math.sin(t)) for t in np.linspace(0, math.pi, 7)]], hacia=V((0, -d, 0)))
for lado in (-1, 1):
    for cz in (ZTC - 3.0, ZTC, ZTC + 3.0):
        cara('EP', SOMBRA, [P(lado * (MT + 0.03), cz + x, y) for x, y in [(-0.55, 3.4), (0.55, 3.4)] + [(0.55 * math.cos(t), 4.6 + 0.55 * math.sin(t)) for t in np.linspace(0, math.pi, 7)]], hacia=V((lado, 0, 0)))
# Las almenas de arriba, por los cuatro lados, y la caseta con su tejado de teja gris.
for i in range(9):
    x = -MT + 0.9 + i * (2 * MT - 1.8) / 8
    for zc in (ZT0 - 0.3, ZT1 + 0.3):
        bloque('P', LADRILLO, en(x, zc, HT), (1.1, 0.6, 1.0), baldosa=2.0, mella=0.02)
for i in range(1, 6):
    z = ZT0 - i * (ZT0 - ZT1) / 6
    for s in (-1, 1):
        bloque('P', LADRILLO, en(s * (MT - 0.3), z, HT), (0.6, 1.1, 1.0), baldosa=2.0, mella=0.02)
viga('P', LADRILLO, -3.4, 3.4, ZTC - 2.4, ZTC + 2.4, HT, HT + 2.3, u_m=4.0, techo=SOLADO)
tejado('P', TEJA_G, -4.1, 4.1, ZTC - 3.0, ZTC + 3.0, HT + 2.3, 1.7, piñon=LADRILLO)
cara('EP', SOMBRA, [P(-0.6, ZTC + 2.43, HT), P(0.6, ZTC + 2.43, HT), P(0.6, ZTC + 2.43, HT + 1.7), P(-0.6, ZTC + 2.43, HT + 1.7)], hacia=V((0, -1, 0)))
barra('EV', MADERA_R, P(3.6, ZTC, HT + 2.3), P(3.6, ZTC, HT + 6.4), 0.09)            # el asta, con su bandera roja
cara('EV', BANDERA, [P(3.66, ZTC, HT + 5.0), P(5.6, ZTC + 0.2, HT + 5.0), P(5.6, ZTC + 0.2, HT + 6.3), P(3.66, ZTC, HT + 6.3)], hacia=V((0, -1, 0)))
cara('EV', BANDERA, [P(3.66, ZTC + 0.02, HT + 5.0), P(3.66, ZTC + 0.02, HT + 6.3), P(5.6, ZTC + 0.22, HT + 6.3), P(5.6, ZTC + 0.22, HT + 5.0)], hacia=V((0, 1, 0)))
# Dentro del paso: resina y el resplandor de lo que viene.
for x, y, r in ((-0.7, 1.0, 0.3), (0.5, 2.0, 0.22), (0.1, 0.5, 0.18)):
    cara('EP', BRILLO_HONDO if r > 0.25 else VERDE, [P(x + r * math.cos(a_), ZT1 + 0.4, y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
cara('EP', NEGRO, [P(-PUERTA, ZT1 + 0.3, 0.0), P(PUERTA, ZT1 + 0.3, 0.0), P(PUERTA, ZT1 + 0.3, 3.7), P(-PUERTA, ZT1 + 0.3, 3.7)], hacia=V((0, -1, 0)))
for k in range(5):
    x = -1.0 + k * 0.5
    barra('EV', RESINA, P(x, ZT0 - 1.0, 0.05), P(x * 2.2 + random.uniform(-0.3, 0.3), ZT0 + random.uniform(3.0, 6.5), 0.04), 0.22)
print('TORRE', HT + 2.3 + 1.7, 'm')

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-66.0)

# ==================================================================================
# 4. LA LADERA Y EL BOSQUE DE AL LADO
# ==================================================================================
Y_PIE = -ALTO_M
CAE = 0.62                                                                           # lo que baja la ladera por metro
ladera_y = lambda x: Y_PIE - (abs(x) - MURO) * CAE
for s in (-1, 1):
    xa, xb = s * (MURO - 0.2), s * 110.0
    cara('P', LADERA, [P(xa, Z_ATRAS + 30.0, Y_PIE), P(xa, ZT1 - 40.0, Y_PIE), P(xb, ZT1 - 40.0, ladera_y(xb)), P(xb, Z_ATRAS + 30.0, ladera_y(xb))], hacia=ARRIBA, baldosa=9.0)
def arbol_otono (grupo, x, z, y, tam):
    if random.random() < 0.25:
        pino(grupo, TRONCO, PINOS, x, z, tam, y=y)
    else:
        arbol(grupo, TRONCO, OTONO, x, z, tam, y=y)
for _ in range(150):
    s = random.choice((-1, 1))
    x, z = s * random.uniform(MURO + 2.0, 50.0), random.uniform(ZT1 - 30.0, Z_ATRAS + 20.0)
    if s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < R_CUBO + 2.5:
        continue
    arbol_otono('EV' if abs(x) < 30.0 and -84.0 < z < 14.0 else 'T', x, z, ladera_y(x) - 0.3, random.uniform(0.9, 1.5))

# ==================================================================================
# 5. LA MURALLA POR LAS CRESTAS (solo en el vuelo)
# ==================================================================================
rect('CP', VALLE_M, -3200.0, 3200.0, -3200.0, 3200.0, VALLE, 400.0)
def tramo (a, b):
    """Un tramo de muralla de lejos, entre dos puntos (x, z, y de su adarve), y el monte que la lleva."""
    (ax, az, ay), (bx, bz, by) = a, b
    # Va SIN luz (`plano`): con la luz en los vértices, sus puntas quedan dentro de las torres y salía negra.
    barra('CP', PIEDRA_L, P(ax, az, ay - 1.5), P(bx, bz, by - 1.5), 6.0)                 # sobresale del monte: de lejos tiene que verse la raya clara
    n = max(1, int(math.hypot(bx - ax, bz - az) / 70.0))
    for i in range(n + 1):
        t = i / n
        x, z, y = ax + (bx - ax) * t, az + (bz - az) * t, ay + (by - ay) * t
        lejos_ = math.hypot(x, z + 80.0)
        monte('T', MONTES[0] if lejos_ < 260 else MONTES[1], x, z, random.uniform(120.0, 170.0), y - 10.0 - VALLE, y0=VALLE, seg=14, anillos=5, pico=0.85)
def torre_lejos (x, z, y):
    cubo('T', PIEDRA, P(x, z, y + 3.0), (11.0, 11.0, 10.0))
    cubo('T', PIEDRA, P(x, z, y + 9.0), (9.0, 9.0, 2.4))
ADELANTE = [(0.0, ZT1 + 0.5, 0.0), (8.0, -140.0, 20.0), (-30.0, -215.0, 52.0), (-95.0, -285.0, 66.0), (-165.0, -385.0, 44.0), (-205.0, -520.0, 92.0), (-120.0, -690.0, 124.0), (40.0, -860.0, 150.0)]
ATRAS = [(0.0, Z_ATRAS - 0.5, 0.0), (-18.0, 125.0, -14.0), (30.0, 205.0, -28.0), (120.0, 275.0, -8.0), (205.0, 385.0, 32.0), (265.0, 525.0, 12.0), (380.0, 700.0, 60.0)]
for camino in (ADELANTE, ATRAS):
    for a, b in zip(camino, camino[1:]):
        tramo(a, b)
    for x, z, y in camino[1:]:
        torre_lejos(x, z, y)
# El monte de la muralla donde se juega, por debajo de la ladera, y las sierras del fondo.
# (Sin monte debajo del tramo de juego: tapaba la ladera y sus árboles y los dejaba a oscuras. La ladera baja sola hasta el valle.)
for cx, cz, radio, alto in ((-700.0, -900.0, 520.0, 260.0), (500.0, -1100.0, 560.0, 300.0), (-200.0, -1500.0, 700.0, 340.0), (-1100.0, -200.0, 520.0, 240.0), (1150.0, -400.0, 540.0, 260.0),
                            (900.0, 700.0, 520.0, 230.0), (-800.0, 800.0, 560.0, 250.0), (100.0, 1400.0, 600.0, 260.0), (420.0, -330.0, 300.0, 170.0), (-430.0, -60.0, 300.0, 150.0)):
    monte('T', MONTES[2] if math.hypot(cx, cz) > 800 else MONTES[1], cx, cz, radio, alto, y0=VALLE, seg=18, anillos=6, pico=0.85)
cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-pekin', ['P', 'EV', 'EP']), ('lugar-pekin-ciudad', ['T', 'CP'])],
    # De día, la receta de Salónica: sol fuerte y algo dorado, cielo muy flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.88, 0.7), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP',), suaves=('monte-cerca', 'monte-medio', 'monte-lejos'), fundir=True)
