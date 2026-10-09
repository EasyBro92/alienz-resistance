# Lagos: sobre el puente atirantado de Lekki-Ikoyi, al atardecer (09/10/2026).
#   blender -b -P herramientas/blender/lugar_lagos.py              (entero)
#   blender -b -P herramientas/blender/lugar_lagos.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_lagos.py -- --reusar  (retocar la luz)
#
# Isidro dejó Nigeria en un solo mapa («la ciudad más famosa y más poblada») y
# pidió rehacerlo como los demás. El sitio lo dejó a mi elección («el que sea más
# bonito y reconocible»): el puente de Lekki-Ikoyi, que es la postal de Lagos. Los
# alienz EN NAVE como siempre, ATARDECER CON BRUMA, llegada larga.
#
# Cómo está puesto. Se juega ENCIMA del tablero, mirando al pilono:
#   · El pilono (una A de hormigón de la que sale un mástil, 62 m) va al fondo, a
#     z = -96, con las patas FUERA del tablero. Jugando solo caben trece metros de
#     alto: se ven sus patas y los tirantes subiendo en abanico; entero, con los
#     dos abanicos, lo enseña la llegada.
#   · A los lados, las aceras con su pretil y sus farolas, y los danfos amarillos
#     (los microbuses de Lagos) que se quedaron parados. Siete metros más abajo, la
#     laguna, con casas sobre pilotes y canoas (las de Makoko: de verdad están
#     junto a otro puente, pero son Lagos tanto como este).
#   · La base alien, en un mirador redondo que sale del tablero a la derecha.
#   · EL SOL VA A LA ESPALDA, como en Gizeh: el pilono y las torres del fondo
#     quedan dorados y las sombras se van hacia delante.
#   · Solo en el vuelo: el puente entero de orilla a orilla, las torres de Ikoyi
#     y, a la espalda, Lekki.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.45, 0.34, 0.82)                # atardecer: bajo, a la espalda y algo a la izquierda
iniciar('lagos', 2710, eje=(0.0, -100.0), encendidas=0.0, reflejo=(0.34, 0.2, 0.1))

AGUA = -7.0
ACERA = 9.2                              # de aquí al pretil, la acera
PRETIL = 11.6
CANTO = 12.6                             # el canto del tablero, donde anclan los tirantes
ZP = -96.0                               # el pilono
Z_IKOYI, Z_LEKKI = -430.0, 310.0         # las dos orillas
BASE = (12.6, -44.0)
R_MIRADOR = 5.9

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -ACERA, ACERA, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El asfalto del tablero: las rayas gastadas, los parches, las juntas de
    dilatación, rodadas, aceite y lo que dejó la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('asphalt_02', 256, 0x97938c, 0.6))
    a *= (0.9 + 0.2 * nube(PH_, PW, 18, 5))[..., None]
    for _ in range(9):                                                   # parches de otro asfalto
        c, f = random.randrange(20, PW - 120), random.randrange(0, PH_ - 200)
        w, h = random.randint(50, 110), random.randint(70, 190)
        a[f:f + h, c:c + w] *= random.uniform(0.78, 0.9)
        a[f:f + 2, c:c + w] *= 0.7; a[f:f + h, c:c + 2] *= 0.7
    for x in (-5.6, -2.8, 0.0, 2.8, 5.6):                                # las rodadas
        (c, _) = a_px(x, 0)
        a[:, c - 9:c + 9] *= (0.93 + 0.05 * nube(PH_, 18, 40, 2))[..., None]
    gasta = np.clip(nube(PH_, PW, 60, 6) * 1.5, 0.25, 1)[..., None]      # la pintura, comida a trozos
    blanca, amarilla = np.array((0.8, 0.8, 0.76), np.float32), np.array((0.82, 0.62, 0.1), np.float32)
    for x in (-8.5, 8.5):                                                # la raya del borde, continua
        (c, _) = a_px(x, 0)
        a[:, c:c + 4] = a[:, c:c + 4] * (1 - gasta[:, c:c + 4]) + blanca * gasta[:, c:c + 4]
    for x in (-0.22, 0.22):                                              # la doble amarilla del centro
        (c, _) = a_px(x, 0)
        a[:, c:c + 3] = a[:, c:c + 3] * (1 - gasta[:, c:c + 3]) + amarilla * gasta[:, c:c + 3]
    for x in (-4.3, 4.3):                                                # y las discontinuas
        (c, _) = a_px(x, 0)
        for f in range(0, PH_, int(9.0 * KZ)):
            f1 = f + int(3.0 * KZ)
            a[f:f1, c:c + 3] = a[f:f1, c:c + 3] * (1 - gasta[f:f1, c:c + 3]) + blanca * gasta[f:f1, c:c + 3]
    for z in np.arange(-52.0, 12.0, 20.0):                               # las juntas de dilatación: un peine de acero
        (_, f) = a_px(0, z)
        a[f:f + 9] = (0.2, 0.2, 0.21)
        a[f + 2:f + 7, ::6] = (0.42, 0.42, 0.43)
        a[f - 2:f] *= 0.7; a[f + 9:f + 11] *= 0.7
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for _ in range(34):                                                  # aceite
        mancha(random.uniform(-8.0, 8.0), random.uniform(PZ0 + 1, PZ1 - 1), random.uniform(0.25, 0.9), random.uniform(0.7, 0.9), random.uniform(0.5, 1.2))
    for x, z, r_ in ((-4.4, -14.0, 1.5), (5.2, -33.0, 1.7), (-1.6, -52.0, 1.4)):   # la guerra: quemaduras con sus cascotes
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
        for _ in range(50):
            ang, d = random.uniform(0, 6.28), r_ * random.uniform(0.3, 1.8)
            c, f = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                a[f:f + 2, c:c + 2] = random.choice(((0.05, 0.05, 0.05), (0.5, 0.5, 0.48)))
    for _ in range(60):                                                  # grietas
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(30, 120)):
            ang += random.uniform(-0.4, 0.4)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.55
    for x0, z0, largo in ((-3.4, -8.0, 9.0), (2.2, -40.0, 12.0), (5.8, -20.0, 7.0)):   # frenazos
        for dx in (0.0, 1.5):
            for i in range(int(largo * KZ)):
                c, f = a_px(x0 + dx + 0.5 * math.sin(i / 90.0), z0 - i / KZ)
                if 2 < c < PW - 3 and 0 <= f < PH_:
                    a[f, c:c + 3] *= 0.72
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_laguna ():
    """La laguna al atardecer: agua parda verdosa con el naranja del cielo en las crestas. Va sin luz."""
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((4, 2, 0.0), (9, 3, 1.3), (15, 5, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.9 * np.sin(2 * np.pi * (u * 2 + v * 4)))
    b = np.clip(onda / 3, -1, 1)
    a = np.stack([0.27 + 0.03 * b, 0.29 + 0.03 * b, 0.3 + 0.03 * b], axis=-1)                # gris verdoso, casi liso
    a += (np.clip(b - 0.7, 0, 1) * 2.2)[..., None] * np.array((0.8, 0.45, 0.2))             # y el cielo solo en las crestas
    return guardar('laguna', a, 88)

def tex_danfo ():
    """El costado de un danfo: amarillo con sus dos rayas negras, las ventanillas y lo que lleva pintado."""
    a = lienzo(128, 256, (0.95, 0.72, 0.05)) + ruido(128, 256, 0.05)[..., None]
    a[70:78] = (0.03, 0.03, 0.03); a[84:92] = (0.03, 0.03, 0.03)
    for c in range(14, 240, 46):
        a[18:56, c:c + 38] = np.array((0.1, 0.13, 0.16)) + np.linspace(0.2, 0.0, 38, dtype=np.float32)[:, None, None] * np.array((0.9, 0.6, 0.4))
    a[100:128] *= 0.8
    for _ in range(30):                                                  # abolladuras y óxido
        c, f = random.randrange(0, 250), random.randrange(56, 124)
        a[f:f + random.randint(2, 5), c:c + random.randint(3, 9)] *= random.uniform(0.5, 0.8)
    return guardar('danfo', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.95)
ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x97938c, 0.6), rug=0.95)
LOSA = material('losa', de_polyhaven('concrete_floor_worn_001', 512, 0xb9b3a6, 0.5), rug=0.9)
HORMIGON = material('hormigon', de_polyhaven('cracked_concrete_wall', 512, 0xc4bdb0, 0.5), rug=0.95)
SOLAR = material('solar', de_polyhaven('dirt_floor', 512, 0xa98f6c, 0.4), rug=1.0)
TABLA = material('tabla', de_polyhaven('plywood', 256, 0x9a7a52, 0.6), rug=1.0)
CHAPA_OX = material('chapa-ox', de_polyhaven('rusty_metal_02', 256, 0x9a6a48, 0.6), rug=0.9)
DANFO = material('danfo', tex_danfo(), rug=0.5)
LAGUNA = material('laguna', tex_laguna(), rug=0.1)
AZOTEA = material('azotea', tex_azotea((0.6, 0.56, 0.5)))
# OJO: los colores lisos van en LINEAL.
BLANCO_P = material('blanco-pilono', color=(0.74, 0.7, 0.62), rug=0.8)
CABLE = material('cable', color=(0.8, 0.78, 0.72), rug=0.5)
ACERO = material('acero', color=(0.34, 0.35, 0.36), rug=0.4)
FAROL = material('farol', color=(0.9, 0.84, 0.66), rug=0.3)
AMARILLO = material('amarillo', color=(0.9, 0.5, 0.02), rug=0.5)
NEGRO = material('negro', color=(0.012, 0.012, 0.014))
GOMA = material('goma', color=(0.012, 0.012, 0.014), rug=0.9)
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
CARBON = material('carbon', color=(0.012, 0.011, 0.01), rug=0.95)
OXIDO = material('oxido', color=(0.1, 0.04, 0.02), rug=0.95)
BRASA = material('brillo-brasa', color=(1.0, 0.42, 0.08), emite=3.0)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
MADERA = material('madera', color=(0.12, 0.08, 0.05), rug=0.95)
PINTADAS = [material(f'pintada-{i}', color=c, rug=0.9) for i, c in enumerate([(0.04, 0.2, 0.3), (0.3, 0.06, 0.04), (0.05, 0.22, 0.1), (0.5, 0.36, 0.08), (0.5, 0.5, 0.46)])]
CANOAS = [material(f'canoa-{i}', color=c, rug=0.8) for i, c in enumerate([(0.1, 0.06, 0.035), (0.04, 0.14, 0.26), (0.3, 0.05, 0.03), (0.4, 0.3, 0.06)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.14, 0.04), (0.08, 0.17, 0.05)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.12, 0.04), (0.07, 0.15, 0.05)])]
TRONCO = material('tronco', color=(0.12, 0.09, 0.06))
MONTE_L = material('monte-lejos', color=(0.3, 0.26, 0.24), rug=1.0)
TORRES = [material('t-vidrio-azul', tex_vidrio('lagos-azul', (0.22, 0.3, 0.38))), material('t-vidrio-verde', tex_vidrio('lagos-verde', (0.24, 0.32, 0.32))),
          material('t-vidrio-bronce', tex_vidrio('lagos-bronce', (0.4, 0.3, 0.2))),
          material('t-oficina-0', tex_oficina('lagos-of-0', (0.82, 0.78, 0.7), (0.16, 0.24, 0.3))), material('t-oficina-1', tex_oficina('lagos-of-1', (0.6, 0.56, 0.5), (0.14, 0.2, 0.24)))]
PISOS = [material(f'f-lagos-{i}', tex_crema(f'lagos-{i}', c, balcon=0.7)) for i, c in enumerate(
    [(0.9, 0.86, 0.76), (0.86, 0.78, 0.62), (0.8, 0.82, 0.8), (0.88, 0.7, 0.56), (0.74, 0.8, 0.7)])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.98, 0.7, 0.46)), (0.06, (0.96, 0.66, 0.48)), (0.18, (0.82, 0.6, 0.58)), (0.42, (0.5, 0.5, 0.72)), (1.0, (0.2, 0.26, 0.54))],
    (SOL[0], SOL[2]), 0.1, (0.9, 0.42, 0.08), ((1.0, 0.68, 0.42), (0.74, 0.6, 0.68)), cuanta_nube=0.2), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL TABLERO: CALZADA, ACERAS, PRETILES, FAROLAS Y EL MIRADOR DE LA BASE
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', ASFALTO, PX0, PX1, Z_IKOYI, PZ0, 0.0, 4.0)
suelo('GN', ASFALTO, PX0, PX1, PZ1, Z_LEKKI, 0.0, 4.0)
for s in (-1, 1):
    x0, x1 = min(s * ACERA, s * CANTO), max(s * ACERA, s * CANTO)
    viga('P', LOSA, x0, x1, PZ0 - 14.0, PZ1 + 8.0, 0.0, 0.16, u_m=2.4, techo=LOSA)                 # la acera, con su bordillo
    suelo('GN', LOSA, x0, x1, Z_IKOYI, PZ0 - 14.0, 0.16, 2.4)
    suelo('GN', LOSA, x0, x1, PZ1 + 8.0, Z_LEKKI, 0.16, 2.4)

en_mirador = lambda z: abs(z - BASE[1]) < R_MIRADOR + 0.4
def pretil (grupo, s, z0, z1):
    """El pretil: murete de hormigón y dos tubos de acero encima."""
    x0, x1 = min(s * PRETIL, s * (PRETIL + 0.3)), max(s * PRETIL, s * (PRETIL + 0.3))
    viga(grupo, HORMIGON, x0, x1, z0, z1, 0.16, 0.86, u_m=2.4)
    for y in (1.05, 1.3):
        barra('EV' if grupo == 'P' else 'T', ACERO, P(s * (PRETIL + 0.15), z0, y), P(s * (PRETIL + 0.15), z1, y), 0.07)
    z = z0 + 1.0
    while z < z1:
        barra('EV' if grupo == 'P' else 'T', ACERO, P(s * (PRETIL + 0.15), z, 0.86), P(s * (PRETIL + 0.15), z, 1.3), 0.06)
        z += 2.4
for s in (-1, 1):
    for z0, z1 in ((PZ0 - 14.0, PZ1 + 8.0),):
        if s > 0:                                                                   # a la derecha se abre al mirador
            pretil('P', s, z0, BASE[1] - R_MIRADOR + 0.9)
            pretil('P', s, BASE[1] + R_MIRADOR - 0.9, z1)
        else:
            pretil('P', s, z0, z1)
    for z0, z1 in ((Z_IKOYI, PZ0 - 14.0), (PZ1 + 8.0, Z_LEKKI)):                    # lejos, de una pieza cada tramo
        zz = z0
        while zz < z1:
            caja('T', HORMIGON, min(s * PRETIL, s * (PRETIL + 0.3)), max(s * PRETIL, s * (PRETIL + 0.3)), zz, min(z1, zz + 40.0), 0.16, 1.1, baldosa=3.0)
            zz += 40.0

def farola (grupo, s, z):
    """La farola del puente: báculo curvo hacia la calzada."""
    x = s * (PRETIL - 0.35)
    barra(grupo, ACERO, P(x, z, 0.16), P(x, z, 8.6), 0.16)
    barra(grupo, ACERO, P(x, z, 8.5), P(x - s * 2.2, z, 9.2), 0.1)
    cubo(grupo, FAROL, P(x - s * 2.3, z, 9.12), (0.8, 0.32, 0.12))
for z in np.arange(Z_IKOYI + 20.0, Z_LEKKI, 26.0):
    for s in (-1, 1):
        if s > 0 and en_mirador(float(z)):
            continue
        farola('EV' if -80.0 < z < 24.0 else 'T', s, float(z))

# El mirador: un balcón redondo que sale del tablero, con la base alien encima.
N_M = 28
circ = [(BASE[0] + R_MIRADOR * math.cos(2 * math.pi * i / N_M), BASE[1] + R_MIRADOR * math.sin(2 * math.pi * i / N_M)) for i in range(N_M)]
MIRADOR = material('mirador', de_polyhaven('concrete_floor_worn_001', 512, 0xa9a397, 0.5), rug=0.9)   # material propio: va encima de la acera
prisma('P', HORMIGON, circ, -1.4, 0.2, techo=MIRADOR, baldosa=3.0)
for i in range(N_M):                                                               # su pretil, por fuera del tablero
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_M]
    if (ax + bx) / 2 < CANTO + 0.4:
        continue
    barra('EV', HORMIGON, P(ax, az, 0.5), P(bx, bz, 0.5), 0.26)
    barra('EV', ACERO, P(ax, az, 1.1), P(bx, bz, 1.1), 0.07)
    barra('EV', ACERO, P(ax, az, 0.2), P(ax, az, 1.1), 0.07)
for i in range(N_M):                                                               # el aro encendido de la base
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_M]
    k0, k1 = 0.84, 0.8
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.22)
    cara('EP', VERDE, [f(ax, az, k0), f(bx, bz, k0), f(bx, bz, k1), f(ax, az, k1)], hacia=ARRIBA)
for i in range(5):                                                                 # y las raíces que echa por la acera
    a_ = math.pi * (0.62 + 0.19 * i)
    barra('EV', RESINA, P(BASE[0] + 4.6 * math.cos(a_), BASE[1] + 4.6 * math.sin(a_), 0.24),
          P(BASE[0] + random.uniform(4.9, 5.1) * math.cos(a_), BASE[1] + random.uniform(6.4, 7.4) * math.sin(a_), 0.2), 0.3)

# ==================================================================================
# 3. LOS DANFOS Y LO QUE DEJÓ LA GUERRA EN LAS ACERAS
# ==================================================================================
def danfo (x, z, grupo='EV', quemado=False):
    """El microbús amarillo de Lagos, a lo largo de z: caja alta, morro corto, la
    baca con sus bultos y la puerta corredera abierta."""
    largo, ancho, alto = 4.5, 1.8, 1.95
    z0, z1 = z - largo / 2, z + largo / 2
    cuerpo = CARBON if quemado else DANFO
    viga(grupo, cuerpo, x - ancho / 2, x + ancho / 2, z0, z1, 0.52, 0.16 + alto, u_m=largo, techo=OXIDO if quemado else AMARILLO)
    if quemado:
        cubo('EP', BRASA, P(x, z, 1.0), (ancho * 0.7, largo * 0.6, 0.05))
        for dz in (-1.2, 0.2, 1.4):
            barra(grupo, OXIDO, P(x - ancho / 2, z + dz, 0.6), P(x - ancho / 2, z + dz, 2.1), 0.09)
    else:
        cubo(grupo, VIDRIO, P(x, z1 - 0.02, 1.55), (ancho - 0.3, 0.06, 0.6))               # la luna de atrás
        cubo(grupo, VIDRIO, P(x, z0 + 0.02, 1.5), (ancho - 0.24, 0.06, 0.7))               # el parabrisas
        cubo(grupo, NEGRO, P(x, z0 - 0.04, 0.72), (ancho, 0.16, 0.22))                     # el parachoques
        for dx, dz in ((-0.4, -0.9), (0.3, 0.2), (-0.1, 1.1)):                             # los bultos de la baca
            cubo(grupo, random.choice(PINTADAS), P(x + dx, z + dz, 0.16 + alto + 0.24), (random.uniform(0.6, 0.9), random.uniform(0.7, 1.0), random.uniform(0.34, 0.5)))
    for zr in (z0 + 0.85, z1 - 0.9):
        for s in (-1, 1):
            cubo(grupo, GOMA, P(x + s * (ancho / 2 - 0.1), zr, 0.5), (0.26, 0.68, 0.68))

lado_danfo = {-1: [4.0, -9.0, -17.5, -31.0, -52.0, -59.5, -70.0], 1: [1.0, -12.0, -24.5, -58.0, -68.5]}
for s, zs in lado_danfo.items():
    for i, z in enumerate(zs):
        if s > 0 and abs(z - BASE[1]) < R_MIRADOR + 3.4:
            continue
        danfo(s * 10.35 + random.uniform(-0.12, 0.12), z, quemado=(s < 0 and i == 3))
for s, z in ((1, -6.0), (-1, -24.0), (1, -30.5), (-1, -44.5)):                       # bidones y cajas, lo que cargaban
    for k in range(3):
        if k < 2:
            torno('EV', random.choice(PINTADAS), en(s * (10.0 + 0.7 * k), z + random.uniform(-0.3, 0.3), 0.16), [(0.3, 0.0), (0.3, 0.88)], lados=8, tapas=(False, True))
        else:
            bloque('EV', TABLA, en(s * 10.6, z + 1.2, 0.16, random.uniform(0, 1.5)), (0.8, 0.8, 0.6), mella=0.0)

comprobar_paso(('E', 'EP', 'P', 'EV'))

# ==================================================================================
# 4. EL PILONO Y LOS TIRANTES
# ==================================================================================
Y_NUDO, Y_TOPE = 38.0, 62.0
for s in (-1, 1):
    barra('EV', BLANCO_P, P(s * 14.2, ZP, AGUA - 1.0), P(s * 0.8, ZP, Y_NUDO + 1.0), 2.5)             # las dos patas de la A
barra('EV', BLANCO_P, P(0.0, ZP, Y_NUDO - 3.0), P(0.0, ZP, Y_TOPE), 2.2)                              # el mástil
barra('EV', BLANCO_P, P(-12.9, ZP, -1.6), P(12.9, ZP, -1.6), 2.0)                                     # la riostra, bajo el tablero
barra('EV', ACERO, P(0.0, ZP, Y_TOPE), P(0.0, ZP, Y_TOPE + 5.0), 0.3)
cubo('EP', BRASA, P(0.0, ZP, Y_TOPE + 5.2), (0.5, 0.5, 0.5))                                          # la baliza
N_T = 14
for k in range(N_T):
    y = Y_NUDO + 2.0 + (Y_TOPE - Y_NUDO - 3.0) * k / (N_T - 1)
    for s in (-1, 1):
        for lado, grupo in ((1, 'EV'), (-1, 'T')):                                                    # hacia la cámara y hacia Ikoyi
            barra(grupo, CABLE, P(s * (CANTO - 0.2), ZP + lado * (15.0 + 13.0 * k), 0.3), P(s * 0.6, ZP, y), 0.15)
for s in (-1, 1):                                                                                     # el canto donde anclan
    viga('P', HORMIGON, min(s * (PRETIL + 0.3), s * CANTO), max(s * (PRETIL + 0.3), s * CANTO), PZ0 - 14.0, BASE[1] - R_MIRADOR if s > 0 else PZ1 + 8.0, -0.2, 0.4, u_m=2.4)
    if s > 0:
        viga('P', HORMIGON, PRETIL + 0.3, CANTO, BASE[1] + R_MIRADOR, PZ1 + 8.0, -0.2, 0.4, u_m=2.4)
print('PILONO', Y_TOPE, 'm; tirantes', N_T * 4)

# Debajo: la viga cajón y las pilas, a tramos (solo se ven en el vuelo).
z = Z_IKOYI
while z < Z_LEKKI:
    z1 = min(Z_LEKKI, z + 40.0)
    caja('T', HORMIGON, -CANTO, CANTO, z, z1, -2.2, -0.04, baldosa=6.0)
    if abs(z - ZP) > 150.0:                                                                           # el vano del pilono cuelga de los tirantes
        caja('T', HORMIGON, -5.0, 5.0, z + 18.0, z + 21.0, AGUA - 1.0, -2.2, baldosa=6.0)
    z = z1

# ==================================================================================
# 5. LA LAGUNA: LAS CASAS SOBRE PILOTES Y LAS CANOAS
# ==================================================================================
rect('EP', LAGUNA, -3200.0, 3200.0, -3200.0, 3200.0, AGUA, baldosa=64.0)

def palafito (grupo, x, z):
    """Una casa de Makoko: pilotes, tarima, cuatro tablas pintadas y la chapa encima."""
    ax, az = random.uniform(2.0, 3.0), random.uniform(2.2, 3.4)
    y0 = AGUA + random.uniform(1.1, 1.6)
    alto = random.uniform(2.0, 2.6)
    for dx in (-ax, ax):
        for dz in (-az, az):
            barra(grupo, MADERA, P(x + dx * 0.9, z + dz * 0.9, AGUA - 0.4), P(x + dx * 0.9, z + dz * 0.9, y0), 0.16)
    caja(grupo, TABLA, x - ax - 0.7, x + ax + 0.7, z - az - 0.5, z + az + 0.5, y0, y0 + 0.14, baldosa=3.0)
    pared = random.choice([TABLA, TABLA] + PINTADAS)
    caja(grupo, pared, x - ax, x + ax, z - az, z + az, y0 + 0.14, y0 + alto, baldosa=3.0)
    vuelo = 0.5
    cae = random.choice((-1, 1)) * random.uniform(0.3, 0.6)
    cara(grupo, CHAPA_OX, [P(x - ax - vuelo, z - az - vuelo, y0 + alto + 0.05 - cae), P(x + ax + vuelo, z - az - vuelo, y0 + alto + 0.05 + cae),
                           P(x + ax + vuelo, z + az + vuelo, y0 + alto + 0.05 + cae), P(x - ax - vuelo, z + az + vuelo, y0 + alto + 0.05 - cae)], hacia=ARRIBA, baldosa=3.0)
    cubo(grupo, NEGRO, P(x, z + az + 0.02, y0 + 1.1), (0.8, 0.06, 1.7))                                # la puerta, al sur

def canoa (grupo, x, z, giro, largo=5.2):
    c, s = math.cos(giro), math.sin(giro)
    g = lambda dx, dz, y: P(x + dx * c - dz * s, z + dx * s + dz * c, y)
    m = random.choice(CANOAS)
    a_, b = largo / 2, largo * 0.1
    borde = [(-a_, 0), (-a_ * 0.5, b), (a_ * 0.5, b), (a_, 0), (a_ * 0.5, -b), (-a_ * 0.5, -b)]
    centro = g(0, 0, AGUA)
    for i in range(6):
        (x0, z0), (x1, z1) = borde[i], borde[(i + 1) % 6]
        q = [g(x0 * 0.8, z0 * 0.6, AGUA - 0.1), g(x1 * 0.8, z1 * 0.6, AGUA - 0.1), g(x1, z1, AGUA + 0.4), g(x0, z0, AGUA + 0.4)]
        cara(grupo, m, q, hacia=H._girado((q[0] + q[2]) / 2 - centro))
    cara(grupo, MADERA, [g(px * 0.9, pz * 0.8, AGUA + 0.16) for px, pz in borde], hacia=ARRIBA)

n_casas = 0
for s in (-1, 1):                                                                   # las que se ven jugando, a los dos lados
    for z in np.arange(-84.0, 6.0, 8.6):
        for fila in range(3):
            x = s * (17.5 + fila * 8.4 + random.uniform(-0.8, 0.8))
            if s > 0 and fila == 0 and abs(z - BASE[1]) < 10.0:
                continue
            if random.random() < 0.86:
                palafito('EV', x, float(z) + random.uniform(-1.4, 1.4)); n_casas += 1
    for z in np.arange(-78.0, 4.0, 13.0):
        canoa('EV', s * (14.6 + random.uniform(0, 1.2)), float(z) + random.uniform(-3, 3), math.pi / 2 + random.uniform(-0.5, 0.5))
for x in np.arange(-330.0, -44.0, 12.5):                                             # el barrio entero, a la izquierda, para el vuelo
    for z in np.arange(-190.0, 150.0, 12.0):
        if (z > -90.0 and z < 12.0 and x > -46.0) or random.random() < 0.22:
            continue
        palafito('T', float(x) + random.uniform(-1.5, 1.5), float(z) + random.uniform(-1.5, 1.5)); n_casas += 1
for _ in range(90):
    x, z = random.uniform(-420.0, 420.0), random.uniform(-380.0, 280.0)
    if abs(x) > 15.0 and not (-336.0 < x < 46.0 and -196.0 < z < 156.0):
        canoa('T', x, z, random.uniform(0, 6.28), random.uniform(5.0, 9.0))
print('PALAFITOS', n_casas)

# ==================================================================================
# 6. LAS ORILLAS: IKOYI AL FONDO Y LEKKI A LA ESPALDA
# ==================================================================================
for z0, z1 in ((-1500.0, Z_IKOYI), (Z_LEKKI, 1500.0)):                              # la tierra, sin pisar la calzada
    suelo('G', SOLAR, -1500.0, -CANTO, z0, z1, -0.4, 8.0)
    suelo('G', SOLAR, CANTO, 1500.0, z0, z1, -0.4, 8.0)
    suelo('G', ASFALTO, -CANTO, CANTO, z0, z1, 0.0, 4.0)
    borde = z1 if z1 < 0 else z0
    for x0 in np.arange(-1500.0, 1500.0, 60.0):                                     # el muro de la orilla
        caja('T', HORMIGON, float(x0), float(x0) + 60.0, borde - 1.0, borde + 1.0, AGUA - 1.0, -0.38, baldosa=4.0)
n_ed = 0
for gx in np.arange(-1300.0, 1300.0, 46.0):                                         # Ikoyi: torres de cristal y bloques entre palmeras
    for gz in np.arange(-1250.0, Z_IKOYI - 30.0, 46.0):
        if abs(gx + 23) < 30.0 or random.random() < 0.2:
            continue
        cx, cz = gx + 23 + random.uniform(-6, 6), gz + 23 + random.uniform(-6, 6)
        primera = cz > Z_IKOYI - 220.0
        if random.random() < (0.3 if primera else 0.12):
            a = random.uniform(11.0, 16.0)
            caja('T', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, -0.4, random.uniform(55.0, 130.0), techo=AZOTEA, baldosa=16.0)
        else:
            ax, az = random.choice((10.5, 12.0, 13.5, 15.0)), random.choice((10.5, 12.0, 13.5))
            caja('T', random.choice(PISOS), cx - ax, cx + ax, cz - az, cz + az, -0.4, random.choice([12, 15, 18, 24, 30]), techo=AZOTEA)
        n_ed += 1
for gx in np.arange(-1300.0, 1300.0, 40.0):                                         # Lekki: más bajo
    for gz in np.arange(Z_LEKKI + 30.0, 1250.0, 40.0):
        if abs(gx + 20) < 28.0 or random.random() < 0.25:
            continue
        cx, cz = gx + 20 + random.uniform(-5, 5), gz + 20 + random.uniform(-5, 5)
        ax, az = random.choice((9.0, 10.5, 12.0)), random.choice((9.0, 10.5, 12.0))
        caja('T', random.choice(PISOS), cx - ax, cx + ax, cz - az, cz + az, -0.4, random.choice([6, 9, 12, 15]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for _ in range(150):                                                                # las palmeras de las dos orillas
    lejos_ = random.random() < 0.6
    x = random.uniform(-900.0, 900.0)
    if abs(x) < 16.0:
        continue
    z = random.uniform(Z_IKOYI - 26.0, Z_IKOYI - 4.0) if lejos_ else random.uniform(Z_LEKKI + 4.0, Z_LEKKI + 26.0)
    palmera('T', TRONCO, PALMA, x, z, alto=random.uniform(8.0, 13.0), y=-0.4)
for cx, cz, radio, alto in ((-1700.0, -1900.0, 900.0, 40.0), (1500.0, -2100.0, 1000.0, 46.0), (0.0, 2300.0, 1100.0, 40.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=AGUA, seg=20, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -100.0)

# ==================================================================================
# 7. HORNEAR Y EXPORTAR
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
    exportes=[('lugar-lagos', ['P', 'GN', 'EV', 'EP']), ('lugar-lagos-ciudad', ['G', 'T', 'CP'])],
    # Atardecer, como en Atenas y Gizeh: está en el COLOR del sol. Muy naranja y fuerte, cielo flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.56, 0.24), sol_fuerza=7.5, sol_ancho=4.0, cielo_fuerza=0.3, cielo_altura=6, cielo_giro=200,
    escala=0.72, satura=1.0, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
