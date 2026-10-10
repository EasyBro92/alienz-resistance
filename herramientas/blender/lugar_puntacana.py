# Punta Cana: la playa de Bávaro, a mediodía (10/10/2026).
#   blender -b -P herramientas/blender/lugar_puntacana.py              (entero)
#   blender -b -P herramientas/blender/lugar_puntacana.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_puntacana.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Se conserva el sitio y lo que cuenta la misión: la playa de Bávaro,
# «un muelle nuevo que nadie construyó» y los alienz que «salen del mar y cruzan
# la arena». A MEDIODÍA, con el Caribe turquesa.
#
# Cómo está puesto. Se juega EN LA ARENA, a lo largo de la orilla:
#   · el mar, pegado al campo por la izquierda (la orilla va en x = -6,8: si no
#     está dentro de la cuña del móvil, no existe), con su espuma;
#   · a la derecha, las palmeras, las hamacas, las tumbonas con sus sombrillas de
#     cana y un chiringuito; la base alien, en una tarima de tablas;
#   · al fondo, el muelle alien, que entra del mar a la playa: los alienz nacen
#     en él y bajan a la arena (`entrada` con `abanico`: mide 8 m);
#   · solo en el vuelo: la playa entera, el palmeral, los hoteles bajos y la
#     barrera de coral.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.3, 0.85, 0.42)                  # mediodía: casi encima, algo a la derecha y a la espalda
iniciar('puntacana', 4130, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.1, 0.2, 0.26))

ORILLA = -6.8                            # donde rompe la ola
MAR_Y = -0.25
Z_PUNTA = -66.0                          # donde acaba la arena por delante y empieza el muelle
MUELLE = 4.0                             # medio muelle
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
    """La arena: blanca y fina arriba, mojada y oscura hacia la orilla, con la
    espuma, la raya de algas que deja la marea, pisadas y conchas."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('sand_01', 256, 0xf2e6cc, 0.3))
    a *= (0.94 + 0.1 * nube(PH_, PW, 20, 5))[..., None]
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    xs = PX0 + xx / KX
    borde = ORILLA + 0.5 * np.sin(yy / 90.0) + 0.3 * np.sin(yy / 37.0 + 1.0)       # la orilla, que no es recta
    moja = np.clip((borde + 3.2 - xs) / 3.2, 0, 1)                                 # arena mojada, hasta tres metros arriba
    a *= (1 - 0.34 * moja)[..., None]
    a = a * (1 - 0.2 * moja[..., None]) + np.array((0.7, 0.66, 0.5), np.float32) * 0.2 * moja[..., None]
    agua = np.clip((borde - xs) / 0.5, 0, 1)                                       # el agua, ya
    turquesa = np.array((0.42, 0.86, 0.84), np.float32)
    a = a * (1 - 0.8 * agua[..., None]) + turquesa * 0.8 * agua[..., None]
    espuma = np.exp(-((xs - borde) / 0.22) ** 2) * (0.6 + 0.4 * nube(PH_, PW, 120, 6))
    espuma += 0.6 * np.exp(-((xs - borde - 0.9) / 0.12) ** 2) * (nube(PH_, PW, 90, 5) > 0.5)   # y la raya de la ola anterior
    a = a * (1 - np.clip(espuma, 0, 1)[..., None]) + np.clip(espuma, 0, 1)[..., None]
    algas = np.exp(-((xs - borde - 2.3 - 0.3 * np.sin(yy / 50.0)) / 0.16) ** 2) * (nube(PH_, PW, 200, 8) > 0.45)
    a = a * (1 - 0.7 * algas[..., None]) + np.array((0.26, 0.24, 0.1), np.float32) * 0.7 * algas[..., None]
    for _ in range(300):                                                 # pisadas
        x, z = random.uniform(-5.5, 9.0), random.uniform(PZ0, PZ1)
        ang = random.uniform(-0.5, 0.5)
        for k in range(random.randint(4, 14)):
            c, f = a_px(x + (0.16 if k % 2 else -0.16), z)
            if 2 < c < PW - 4 and 2 < f < PH_ - 6:
                a[f:f + 5, c:c + 3] *= 0.9
            x += 0.6 * math.sin(ang); z -= 0.6 * math.cos(ang)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.0, -14.0, 1.5), (-2.6, -33.0, 1.6), (2.6, -52.0, 1.4)):       # la guerra: arena quemada, vidriada
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.45)
    for k in range(9):                                                   # el rastro que baja del muelle
        x, z = -3.0 + k * 0.75 + random.uniform(-0.3, 0.3), PZ0
        for i in range(int(random.uniform(4.0, 13.0) * KZ)):
            x += random.uniform(-0.02, 0.02); z += 1 / KZ
            c, f = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f < PH_:
                a[f, c - 2:c + 3] = a[f, c - 2:c + 3] * 0.6 + np.array((0.04, 0.14, 0.08), np.float32) * 0.4
    for _ in range(500):                                                 # conchas y coral
        c, f = random.randrange(1, PW - 2), random.randrange(1, PH_ - 2)
        a[f, c] = random.choice(((0.96, 0.9, 0.86), (0.9, 0.7, 0.66), (0.7, 0.66, 0.6)))
    return guardar('pista', np.clip(a, 0, 1), 90)

def tex_caribe ():
    """El Caribe: de la orilla (u = 0), casi blanco de puro claro, al turquesa y al azul hondo. Va sin luz."""
    W, Hh = 256, 128
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u = xx / W
    paradas = [(0.0, (0.62, 0.93, 0.88)), (0.12, (0.3, 0.84, 0.82)), (0.4, (0.1, 0.66, 0.78)), (0.7, (0.05, 0.42, 0.72)), (1.0, (0.03, 0.26, 0.6))]
    a = np.zeros((Hh, W, 3), np.float32)
    for (u0, c0), (u1, c1) in zip(paradas, paradas[1:]):
        m = (u >= u0) & (u <= u1)
        t = ((u - u0) / (u1 - u0))[..., None]
        a = np.where(m[..., None], np.array(c0, np.float32) * (1 - t) + np.array(c1, np.float32) * t, a)
    b = np.sin(yy / 3.0 + 2.0 * np.sin(xx / 17.0))
    a *= (1.0 + 0.04 * b)[..., None]
    a += (np.clip(b - 0.9, 0, 1) * 2.0)[..., None] * 0.4
    return guardar('caribe', np.clip(a, 0, 1), 90)

PISTA = material('pista', tex_pista(), rug=1.0)
ARENA = material('arena', de_polyhaven('sand_01', 512, 0xf2e6cc, 0.3), rug=1.0)
CARIBE = material('caribe', tex_caribe(), rug=0.1)
TABLA = material('tabla', de_polyhaven('plywood', 256, 0xb89668, 0.6), rug=0.95)
CANA = material('cana', de_polyhaven('plywood', 256, 0xa8905c, 0.7), rug=1.0)        # el techo de hoja de palma seca
JARDIN = material('jardin', de_polyhaven('leafy_grass', 512, 0x6f9a4c, 0.5), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.8, 0.76, 0.68)))
# OJO: los colores lisos van en LINEAL.
MADERA = material('madera', color=(0.2, 0.12, 0.06), rug=0.9)
BLANCO = material('blanco', color=(0.86, 0.84, 0.8), rug=0.7)
ALIEN = material('casco-alien', color=(0.025, 0.035, 0.03), rug=0.5)
ALIEN_2 = material('cubierta-alien', color=(0.05, 0.065, 0.055), rug=0.6)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
TELAS = [material(f'tela-{i}', color=c, rug=0.9) for i, c in enumerate([(0.8, 0.3, 0.04), (0.04, 0.3, 0.6), (0.8, 0.76, 0.66), (0.7, 0.08, 0.2), (0.1, 0.5, 0.4)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.2, 0.04), (0.1, 0.24, 0.05), (0.14, 0.26, 0.06)])]
TRONCO = material('tronco', color=(0.26, 0.2, 0.14))
COCO = material('coco', color=(0.14, 0.09, 0.04), rug=0.9)
CASCOS = [material(f'casco-{i}', color=c, rug=0.6) for i, c in enumerate([(0.86, 0.86, 0.8), (0.04, 0.3, 0.6), (0.8, 0.3, 0.04)])]
ESPUMA = material('espuma', color=(0.9, 0.94, 0.94), rug=0.6)
MONTE_L = material('monte-lejos', color=(0.3, 0.44, 0.4), rug=1.0)
HOTELES = [material(f'f-hotel-{i}', tex_crema(f'hotel-{i}', c, balcon=0.95)) for i, c in enumerate([(0.94, 0.9, 0.8), (0.92, 0.8, 0.62), (0.86, 0.9, 0.9)])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.8, 0.92, 0.96)), (0.07, (0.62, 0.86, 0.98)), (0.25, (0.36, 0.7, 0.98)), (0.6, (0.16, 0.5, 0.94)), (1.0, (0.08, 0.34, 0.84))],
    (SOL[0], SOL[2]), 0.6, (0.3, 0.26, 0.18), ((1.0, 1.0, 1.0), (0.94, 0.96, 1.0)), cuanta_nube=0.22), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA ARENA Y EL MAR
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z_ATRAS, DUNA = 700.0, 40.0                                                          # hasta dónde sigue la playa a la espalda, y su ancho
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', ARENA, PX1, DUNA, Z_PUNTA, Z_ATRAS, 0.0, 5.0)
suelo('GN', ARENA, ORILLA, PX1, PZ1, Z_ATRAS, 0.0, 5.0)
suelo('GN', ARENA, ORILLA, PX1, Z_PUNTA, PZ0, 0.0, 5.0)
# El mar: un paño a la izquierda (la orilla en u = 0) y otro por delante, donde acaba la arena.
ANCHO_MAR = 420.0
cara('EP', CARIBE, [P(ORILLA + 0.4, Z_ATRAS, MAR_Y), P(ORILLA + 0.4, -1500.0, MAR_Y), P(ORILLA - ANCHO_MAR, -1500.0, MAR_Y), P(ORILLA - ANCHO_MAR, Z_ATRAS, MAR_Y)],
     uvs=[(0, 0), (0, 60), (1, 60), (1, 0)], hacia=ARRIBA)
# Por delante, entre la orilla y la arena que sigue a la derecha del muelle: agua de orilla, clara (u casi 0).
cara('EP', CARIBE, [P(ORILLA + 0.4, Z_PUNTA + 0.4, MAR_Y + 0.01), P(PX1, Z_PUNTA + 0.4, MAR_Y + 0.01), P(PX1, -1500.0, MAR_Y + 0.01), P(ORILLA + 0.4, -1500.0, MAR_Y + 0.01)],
     uvs=[(0.0, 0), (0.03, 0), (0.03, 60), (0.0, 60)], hacia=ARRIBA)
rect('CP', material('mar-hondo', color=(0.03, 0.26, 0.6), rug=0.1), -3200.0, 3200.0, -3200.0, 3200.0, MAR_Y - 0.3, 400.0)
for z in np.arange(-56.0, Z_ATRAS, 5.0):                                              # la espuma de la rompiente, fuera de la pista
    if PZ0 - 1.0 < z < PZ1 + 1.0:
        continue
    cara('EV' if z < 40 else 'T', ESPUMA, [P(ORILLA + 0.5 + random.uniform(-0.3, 0.3), float(z) + dz, 0.02) for dz in (0.0, 5.0)] + [P(ORILLA - 0.3 + random.uniform(-0.3, 0.3), float(z) + dz, 0.02) for dz in (5.0, 0.0)], hacia=ARRIBA)
for x in np.arange(ORILLA, 60.0, 5.0):                                                # y la de la punta
    if abs(x) > MUELLE + 0.5:
        cara('EV', ESPUMA, [P(float(x), Z_PUNTA + 0.6, 0.02), P(float(x) + 5.0, Z_PUNTA + 0.6, 0.02), P(float(x) + 5.0, Z_PUNTA - 0.3, 0.02), P(float(x), Z_PUNTA - 0.3, 0.02)], hacia=ARRIBA)

# ==================================================================================
# 3. LO QUE HAY EN LA PLAYA
# ==================================================================================
def cocotero (grupo, x, z, alto=8.0, cae=1.6):
    """El cocotero de playa: el tronco curvado hacia el mar y la corona de hojas largas, con sus cocos."""
    pts = [P(x - cae * (t ** 1.8), z + 0.3 * t, alto * t) for t in np.linspace(0, 1, 5)]
    for a_, b in zip(pts, pts[1:]):
        barra(grupo, TRONCO, a_, b, 0.3)
    cima = pts[-1]
    hoja = random.choice(PALMA)
    g0 = random.random() * 6.28
    for i in range(9):
        a_ = g0 + 2 * math.pi * i / 9
        d = V((math.cos(a_), math.sin(a_), 0))
        lado = V((-d.y, d.x, 0))
        largo = random.uniform(3.2, 4.2)
        p1 = cima + d * largo * 0.5 + V((0, 0, 0.7))
        p2 = cima + d * largo + V((0, 0, -1.2))
        cara(grupo, hoja, [cima - lado * 0.14, cima + lado * 0.14, p1 + lado * 0.6, p1 - lado * 0.6], hacia=ARRIBA)
        cara(grupo, hoja, [p1 - lado * 0.6, p1 + lado * 0.6, p2 + lado * 0.08, p2 - lado * 0.08], hacia=ARRIBA)
    for k in range(3):
        elipsoide(grupo, COCO, M.Translation(cima + V((0.25 * math.cos(k * 2.1), 0.25 * math.sin(k * 2.1), -0.3))), (0.17, 0.17, 0.2))
def palapa (x, z):
    """La sombrilla de cana: un palo y el cono de hoja seca, con sus dos tumbonas."""
    barra('EV', MADERA, P(x, z, 0.0), P(x, z, 2.5), 0.14)
    torno('P', CANA, en(x, z, 2.1), [(1.9, 0.0), (1.2, 0.5), (0.2, 1.1), (0.0, 1.2)], lados=10, u_rep=6, v_m=1.5, tapas=(False, False))
    tela = random.choice(TELAS)
    for dz in (-1.0, 1.0):
        cubo('EV', BLANCO, P(x + 0.3, z + dz, 0.32), (1.9, 0.62, 0.1))
        cubo('EV', tela, P(x + 0.3, z + dz, 0.4), (1.7, 0.54, 0.06))
        cubo('EV', BLANCO, P(x + 1.1, z + dz, 0.6), (0.5, 0.62, 0.08), 0.0)
def hamaca (x, z0, z1):
    tela = random.choice(TELAS)
    n = 6
    pts = [P(x, z0 + (z1 - z0) * i / n, 1.5 - 0.9 * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for a_, b in zip(pts, pts[1:]):
        cara('EV', tela, [a_ + V((-0.45, 0, 0)), a_ + V((0.45, 0, 0)), b + V((0.45, 0, 0)), b + V((-0.45, 0, 0))], hacia=ARRIBA)
        cara('EV', tela, [a_ + V((-0.45, 0, -0.02)), b + V((-0.45, 0, -0.02)), b + V((0.45, 0, -0.02)), a_ + V((0.45, 0, -0.02))], hacia=V((0, 0, -1)))
z = 8.0
while z > -62.0:                                                                    # la fila de cocoteros del borde de la arena
    if abs(z - BASE[1]) > 8.0:
        cocotero('EV', 10.6 + random.uniform(0, 0.6), z, random.uniform(7.0, 9.0), random.uniform(1.0, 2.0))
    z -= random.uniform(5.0, 7.0)
for z in (0.0, -22.0, -58.0):                                                        # hamacas entre palmeras
    cocotero('EV', 14.4, z, 7.6, 0.6); cocotero('EV', 14.4, z - 4.4, 7.6, 0.6)
    hamaca(14.2, z, z - 4.4)
for x, z in ((17.0, -10.0), (16.5, -30.0), (19.0, -18.0), (18.0, -52.0), (16.6, -64.0), (20.0, -40.0)):
    if math.hypot(x - BASE[0], z - BASE[1]) > 8.0:
        palapa(x, z)
# El chiringuito: cuatro postes, la barra y el techo de cana a cuatro aguas.
CX, CZ = 24.0, -4.0
for dx, dz in ((-2.4, -2.4), (2.4, -2.4), (2.4, 2.4), (-2.4, 2.4)):
    barra('EV', MADERA, P(CX + dx, CZ + dz, 0.0), P(CX + dx, CZ + dz, 2.8), 0.2)
caja('P', TABLA, CX - 2.2, CX + 2.2, CZ - 2.2, CZ + 2.2, 0.0, 1.1, baldosa=3.0)
torno('P', CANA, en(CX, CZ, 2.7), [(4.0, 0.0), (2.4, 1.0), (0.4, 2.2), (0.0, 2.4)], lados=4, u_rep=8, v_m=1.5, tapas=(False, False))
# Un catamarán varado en la orilla, más acá.
bx, bz = -6.4, 8.5
for s in (-1, 1):
    bloque('EV', random.choice(CASCOS), en(bx + s * 1.0, bz, 0.25, 0.2), (0.5, 5.0, 0.5), mella=0.1)
cubo('EV', TELAS[2], P(bx, bz, 0.56), (2.2, 2.6, 0.06), 0.2)
barra('EV', BLANCO, P(bx, bz + 0.6, 0.5), P(bx - 0.3, bz + 0.5, 7.0), 0.1)
cara('EV', TELAS[0], [P(bx, bz + 0.4, 1.2), P(bx + 0.5, bz - 2.2, 1.3), P(bx - 0.3, bz + 0.5, 6.6)], hacia=V((1, 0, 0)))
cara('EV', TELAS[0], [P(bx - 0.02, bz + 0.4, 1.2), P(bx - 0.32, bz + 0.5, 6.6), P(bx + 0.48, bz - 2.2, 1.3)], hacia=V((-1, 0, 0)))
# La tarima de la base alien.
torno('P', TABLA, en(BASE[0], BASE[1]), [(5.2, 0.0), (5.2, 0.36), (4.8, 0.36)], lados=28, u_rep=10, v_m=1.5, tapas=(False, True))
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.39) for r, a_ in ((4.6, a0), (4.6, a1), (4.4, a1), (4.4, a0))], hacia=ARRIBA)

# ==================================================================================
# 4. EL MUELLE QUE NADIE CONSTRUYÓ
# ==================================================================================
Z_FIN = -150.0
caja('P', ALIEN_2, -MUELLE, MUELLE, Z_FIN, Z_PUNTA - 3.0, MAR_Y - 0.6, 0.0, baldosa=4.0)               # la calzada del muelle, a ras de la arena
cara('P', ALIEN_2, [P(-MUELLE, Z_PUNTA - 3.0, 0.0), P(MUELLE, Z_PUNTA - 3.0, 0.0), P(MUELLE + 1.6, Z_PUNTA + 2.0, 0.02), P(-MUELLE - 1.6, Z_PUNTA + 2.0, 0.02)], hacia=ARRIBA, baldosa=4.0)   # la lengua que monta en la playa
for s in (-1, 1):
    z = Z_PUNTA - 4.0
    while z > Z_FIN:                                                                # las costillas de resina, a los lados
        barra('EV' if z > -100 else 'T', RESINA, P(s * MUELLE, z, MAR_Y - 0.6), P(s * (MUELLE + 0.9), z - 0.4, 2.4), 0.36)
        cubo('EP' if z > -100 else 'CP', VERDE, P(s * (MUELLE + 0.9), z - 0.4, 2.5), (0.3, 0.3, 0.3))
        z -= 6.0
    cara('EP', VERDE, [P(s * MUELLE, Z_PUNTA - 3.0, 0.03), P(s * MUELLE, -100.0, 0.03), P(s * (MUELLE - 0.16), -100.0, 0.03), P(s * (MUELLE - 0.16), Z_PUNTA - 3.0, 0.03)], hacia=ARRIBA)
for cx in (-9.0, 9.0):                                                              # las barcazas amarradas a su punta
    caja('T', ALIEN, cx - 4.0, cx + 4.0, Z_FIN + 4.0, Z_FIN + 24.0, MAR_Y - 0.5, 3.0, techo=ALIEN_2, baldosa=4.0)
    caja('CP', VERDE, cx - 4.05, cx + 4.05, Z_FIN + 4.0, Z_FIN + 24.0, 2.6, 2.8)
print('MUELLE de', 2 * MUELLE, 'm')

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'), z_lejos=-62.0)

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO: EL PALMERAL, LOS HOTELES Y EL ARRECIFE
# ==================================================================================
suelo('G', JARDIN, DUNA, 1500.0, -1500.0, 1500.0, 0.3, 10.0)
suelo('G', ARENA, PX1, DUNA, -1500.0, Z_PUNTA, 0.0, 5.0)                               # la playa sigue pasada la punta
suelo('G', ARENA, ORILLA, DUNA, Z_ATRAS, 1500.0, 0.0, 5.0)
for _ in range(520):
    x, z = random.uniform(DUNA - 12.0, 420.0), random.uniform(-900.0, 900.0)
    if x < 30.0 and -70.0 < z < 14.0:
        continue
    cocotero('T', x, z, random.uniform(7.0, 11.0), random.uniform(0.4, 1.6))
n = 0
for gz in np.arange(-800.0, 800.0, 90.0):                                             # los hoteles: bajos, largos, entre las palmeras
    x0 = random.uniform(80.0, 120.0)
    caja('T', random.choice(HOTELES), x0, x0 + 70.0, float(gz), float(gz) + 26.0, 0.3, 0.3 + random.choice([9, 12, 15]), techo=AZOTEA)
    rect('CP', material(f'piscina-{n}', color=(0.2, 0.7, 0.86), rug=0.1), x0 - 34.0, x0 - 8.0, float(gz) + 4.0, float(gz) + 20.0, 0.36, 10.0)
    n += 1
for z in np.arange(-1300.0, 900.0, 26.0):                                             # la rompiente del arrecife, mar adentro
    x = ORILLA - 330.0 + 30.0 * math.sin(z / 170.0)
    cara('T', ESPUMA, [P(x, float(z), MAR_Y + 0.05), P(x + random.uniform(4.0, 9.0), float(z), MAR_Y + 0.05), P(x + random.uniform(4.0, 9.0), float(z) + 26.0, MAR_Y + 0.05), P(x, float(z) + 26.0, MAR_Y + 0.05)], hacia=ARRIBA)
for cx, cz, radio, alto in ((1900.0, -1200.0, 1000.0, 90.0), (2000.0, 900.0, 1000.0, 110.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.3, seg=18, anillos=4, pico=0.8)

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
    exportes=[('lugar-puntacana', ['P', 'GN', 'EV', 'EP']), ('lugar-puntacana-ciudad', ['G', 'T', 'CP'])],
    # Mediodía del Caribe: sol blanco y fuerte, casi a plomo; la arena es muy clara, así que la escala va baja.
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.84), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=60, cielo_giro=150,
    escala=0.54, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
