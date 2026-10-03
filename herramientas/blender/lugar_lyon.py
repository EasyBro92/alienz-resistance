# Lyon: el muelle del Saona bajo Fourvière, hecho en Blender (03/10/2026).
#   blender -b -P herramientas/blender/lugar_lyon.py              (entero)
#   blender -b -P herramientas/blender/lugar_lyon.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_lyon.py -- --reusar  (retocar la luz)
#
# Isidro eligió: se juega en el MUELLE DEL SAONA, los alienz BAJAN DE FOURVIÈRE
# y cruzan la pasarela hasta el muelle, DE DÍA. Misma receta que Madrid, Valencia
# y Marsella (horneado.py).
#
# Cómo es de verdad: el Saona baja de norte a sur entre la Presqu'île (al este) y
# el Viejo Lyon (al oeste), con sus casas renacentistas de colores al pie de la
# colina de Fourvière, que tiene arriba la basílica blanca de cuatro torres y la
# torre metálica. Aquí se juega en el muelle de la Presqu'île mirando río abajo
# (al sur):
#   · a la DERECHA el parapeto con los plátanos, el puerto bajo, el río y, al otro
#     lado, el Viejo Lyon, la catedral de Saint-Jean, el Palacio de Justicia de las
#     veinticuatro columnas y la colina;
#   · a la IZQUIERDA la calzada del muelle con coches y las fachadas de piedra con
#     mansardas de zinc;
#   · al FONDO, la pasarela Saint-Georges, colgada de sus dos pórticos de acero,
#     que llega a este muelle: por ella entran los que bajan de Fourvière.
#
# Jugando, en un móvil en vertical, a la derecha solo cabe el parapeto y algo de
# río al fondo; Fourvière y el Viejo Lyon los enseña el vuelo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.5, 0.72, -0.48)               # de día: del este (izquierda) y del sur (de frente), alto
iniciar('lyon', 1543, eje=(30.0, -60.0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_rio ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((1, 6, 0.0), (2, 11, 1.3), (3, 17, 2.1)):           # la corriente, a lo largo
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.8 * np.sin(2 * np.pi * (u * 4 - v * 2)))
    b = np.clip(onda / 3, -1, 1)
    a = np.stack([0.17 + 0.04 * b, 0.3 + 0.06 * b, 0.3 + 0.07 * b], axis=-1)
    a += (np.clip(b - 0.7, 0, 1) * 1.4)[..., None] * np.array((0.55, 0.62, 0.65))
    return guardar('rio', a, 88)

def tex_losa ():
    a = lienzo(256, 256, (0.7, 0.68, 0.64)) + ruido(256, 256, 0.07)[..., None]
    for i in range(8):                        # adoquín largo de granito, en hiladas
        y0 = i * 32
        desp = (i % 2) * 24
        a[y0:y0 + 2] *= 0.75
        for x in range(desp, 256 + 48, 48):
            a[y0:y0 + 32, x % 256:(x % 256) + 2] *= 0.78
            a[y0 + 2:y0 + 32, (x % 256) + 2:min(256, (x % 256) + 48)] *= 0.95 + 0.09 * random.random()
    return guardar('losa', a)

def tex_arena_roja ():
    """La arena roja de la plaza Bellecour."""
    a = lienzo(256, 256, (0.72, 0.42, 0.3)) + ruido(256, 256, 0.1)[..., None]
    return guardar('arena-roja', a)

LOSA = material('losa', tex_losa(), rug=0.85)
LOSA_CLARA = material('losa-clara', imagen_de(LOSA), tinte=0xe2ddd4, rug=0.85)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xd9cdb6), rug=0.9)
SILLAR_GRIS = material('sillar-gris', de_polyhaven('castle_wall_varriation', 512, 0xa49f96), rug=0.9)
BLANCO = material('piedra-blanca', imagen_de(SILLAR), tinte=0xf4f1ea, rug=0.8)
RIO = material('rio', tex_rio(), rug=0.1)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xa59f95), rug=0.9)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x5d7f3a), rug=1.0)
MONTE = material('monte', de_polyhaven('leafy_grass', 512, 0x46622e), rug=1.0)
ARENA_ROJA = material('arena-roja', tex_arena_roja(), rug=1.0)
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xa65a3c, contraste=0.9), rug=0.9)
ZINC = material('zinc', color=(0.3, 0.33, 0.37), rug=0.5)
AZOTEA = material('azotea', tex_azotea((0.5, 0.46, 0.42)))
ACERO = material('acero', color=(0.32, 0.36, 0.38), rug=0.5)
TORRE_METAL = material('torre-metal', color=(0.58, 0.6, 0.6), rug=0.5)
NEGRO = material('negro', color=(0.03, 0.03, 0.035))
ORO = material('oro', color=(0.95, 0.72, 0.28), rug=0.3)
F_VIEJO = [material(f'f-viejo-{i}', tex_postigos(f'viejo-{i}', b, p)) for i, (b, p) in enumerate([
    ((0.88, 0.6, 0.55), (0.45, 0.35, 0.3)), ((0.88, 0.68, 0.42), (0.35, 0.42, 0.36)), ((0.92, 0.8, 0.52), (0.4, 0.38, 0.34)),
    ((0.86, 0.55, 0.36), (0.5, 0.5, 0.48)), ((0.85, 0.74, 0.62), (0.3, 0.4, 0.5))])]
F_PRESQUILE = [material(f'f-presquile-{i}', tex_crema(f'presquile-{i}', c, balcon=0.8)) for i, c in enumerate([(0.86, 0.82, 0.72), (0.82, 0.78, 0.7), (0.9, 0.86, 0.78)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.18, 0.33, 0.11), (0.23, 0.38, 0.13), (0.28, 0.42, 0.16)])]
TRONCO = material('tronco', color=(0.55, 0.5, 0.42))            # el plátano, de corteza clara
COCHES = [material(f'coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.8, 0.81, 0.83), (0.12, 0.12, 0.13), (0.55, 0.1, 0.08), (0.12, 0.2, 0.45), (0.85, 0.83, 0.77)])]
LUNA = material('coche-luna', color=(0.05, 0.07, 0.1), rug=0.2)
FAROLA = material('brillo-farola', color=(1.0, 0.86, 0.6), emite=1.5)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.88, 0.94)), (0.07, (0.74, 0.84, 0.95)), (0.25, (0.48, 0.69, 0.93)), (0.6, (0.26, 0.5, 0.86)), (1.0, (0.15, 0.36, 0.75))],
    (SOL[0], SOL[2]), 0.55, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.22), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LO QUE RODEA AL CAMPO
# ==================================================================================
config_suelo(-1400, 1400, -1500, 1300, (-360, 300), (-480, 300))
IZQ, PARAPETO = -8.8, 11.6               # el muelle de juego va de la calzada al parapeto
Z_CERCA, Z_PASARELA = 34.0, -133.0
ABAJO_Y, RIO_Y = -4.0, -5.0              # el puerto bajo y el agua
RIO_X0, RIO_X1 = 17.0, 45.0              # el Saona

# --- el muelle: granito en hiladas, con la hilera de plátanos y los bancos ---------------
rect('S', LOSA, IZQ, PARAPETO, -175, Z_CERCA, 0.0, baldosa=4.0)
suelo('GN', LOSA, IZQ, PARAPETO, -520, -175, 0.0, 4.0)
# el parapeto de piedra, cortado donde llega la pasarela
for (a, b) in ((Z_PASARELA + 2.6, 300.0), (-520.0, Z_PASARELA - 2.6)):
    caja('E', SILLAR, PARAPETO, PARAPETO + 0.6, a, b, ABAJO_Y, 1.0, baldosa=3)
for z in np.arange(26.0, -175.0, -9.0):
    if abs(z - Z_PASARELA) < 5:
        continue
    arbol('EV', TRONCO, HOJAS, 10.2, z, 0.95, fino=True)
for z in np.arange(22.0, -170.0, -18.0):                  # bancos y farolas del lado de la calzada
    caja('E', LOSA_CLARA, IZQ + 0.3, IZQ + 1.0, z - 1.3, z + 1.3, 0.0, 0.45, baldosa=3)
    barra('EV', ACERO, P(IZQ + 0.5, z - 6, 0), P(IZQ + 0.5, z - 6, 4.8), 0.14)
    cubo('EP', FAROLA, P(IZQ + 0.5, z - 6, 4.95), (0.45, 0.45, 0.35))

# --- la calzada del muelle y las fachadas de la Presqu'île, a la izquierda -------------------
BASE = (-12.6, -44.0)
suelo('GN', CALZADA, -18.0, IZQ, -520, 300, 0.0, carriles=(-18.0, 4.6, 'z'))
disco = [(BASE[0] + 4.9 * math.cos(2 * math.pi * i / 24), BASE[1] + 4.9 * math.sin(2 * math.pi * i / 24)) for i in range(24)]
cara('S', LOSA_CLARA, [P(x, z, 0.04) for x, z in disco], hacia=ARRIBA, baldosa=4.0)        # la isleta de la base alien
suelo('GN', ACERA, -21.0, -18.0, -520, 300, 0.05, 4.0)
for z in np.arange(30.0, -180.0, -6.5):
    if abs(z - BASE[1]) < 8 or random.random() < 0.3:
        continue
    coche('EV', COCHES, LUNA, -16.4, z, random.gauss(0, 0.04) + math.pi * (random.random() < 0.5))
def edificio_mansarda (grupo, x0, x1, z0, z1, plantas, fach):
    alto = plantas * 3.0
    caja(grupo, fach, x0, x1, z0, z1, 0.0, alto, techo=AZOTEA)
    # La mansarda: un faldón empinado de zinc con la cumbrera casi plana.
    m = 1.6
    caja(grupo, ZINC, x0 + m, x1 - m, z0 + m, z1 - m, alto, alto + 3.2, techo=AZOTEA, baldosa=3)
    tejado(grupo, ZINC, x0, x1, z0, z1, alto, 1.0)
z = 40.0
while z > -260:
    largo = random.choice([24.0, 30.0, 36.0])
    edificio_mansarda('E' if z > -180 else 'C', -38.0, -21.5, z - largo, z, random.choice([6, 6, 7]), random.choice(F_PRESQUILE))
    z -= largo + 9.0

# --- el río, el puerto bajo y la otra orilla ---------------------------------------------
cara('E', SILLAR_GRIS, [P(PARAPETO + 0.6, -520, ABAJO_Y), P(PARAPETO + 0.6, 300, ABAJO_Y), P(PARAPETO + 0.6, 300, 0.0), P(PARAPETO + 0.6, -520, 0.0)], hacia=V((1, 0, 0)), baldosa=3)
suelo('GN', LOSA_CLARA, PARAPETO + 0.6, RIO_X0, -520, 300, ABAJO_Y, 4.0)                     # el puerto bajo
cara('E', SILLAR_GRIS, [P(RIO_X0, -520, RIO_Y - 1), P(RIO_X0, 300, RIO_Y - 1), P(RIO_X0, 300, ABAJO_Y), P(RIO_X0, -520, ABAJO_Y)], hacia=V((1, 0, 0)), baldosa=3)
rect('EP', RIO, RIO_X0, RIO_X1, -1500, 1300, RIO_Y, baldosa=20.0)
cara('C', SILLAR_GRIS, [P(RIO_X1, -1500, RIO_Y - 1), P(RIO_X1, 1300, RIO_Y - 1), P(RIO_X1, 1300, 0.0), P(RIO_X1, -1500, 0.0)], hacia=V((-1, 0, 0)), baldosa=3)
suelo('G', CALZADA, RIO_X1, RIO_X1 + 8, -1500, 1300, 0.0, carriles=(RIO_X1, 4.0, 'z'))
suelo('G', ACERA, RIO_X1 + 8, 76, -1500, 1300, 0.02, 4.0)

# --- la pasarela Saint-Georges: el tablero, los dos pórticos y los cables ----------------
PZ0, PZ1 = Z_PASARELA - 2.2, Z_PASARELA + 2.2
caja('E', LOSA_CLARA, PARAPETO, RIO_X1 + 4, PZ0, PZ1, -0.35, 0.05, tapa_abajo=True, baldosa=3)
for z in (PZ0, PZ1):
    caja('E', ACERO, PARAPETO, RIO_X1 + 4, z - 0.06, z + 0.06, 0.05, 1.1, baldosa=3)          # las barandillas
PORTICOS = (PARAPETO + 2.0, RIO_X1 - 1.0)
for x in PORTICOS:
    for z in (PZ0 - 0.4, PZ1 + 0.4):
        barra('EV', ACERO, P(x, z, ABAJO_Y), P(x, z, 12.0), 0.5)
    barra('EV', ACERO, P(x, PZ0 - 0.4, 11.4), P(x, PZ1 + 0.4, 11.4), 0.5)
for z in (PZ0 - 0.2, PZ1 + 0.2):                                                               # el cable colgado
    pts = []
    for i in range(13):
        f = i / 12
        x = PORTICOS[0] + (PORTICOS[1] - PORTICOS[0]) * f
        pts.append(P(x, z, 12.0 - 10.0 * 4 * f * (1 - f)))
    for a, b in zip(pts, pts[1:]):
        barra('EV', ACERO, a, b, 0.14)
        barra('EV', ACERO, b, V((b.x, b.y, 0.05)), 0.05)

comprobar_paso(('E', 'EP', 'S', 'EV'))

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- el Viejo Lyon: casas renacentistas de colores al pie de la colina --------------------
def casa (grupo, x0, x1, z0, z1, plantas, fach=None):
    alto = plantas * 3.0
    caja(grupo, fach or random.choice(F_VIEJO), x0, x1, z0, z1, 0.0, alto, techo=AZOTEA)
    tejado(grupo, TEJA, x0, x1, z0, z1, alto, random.uniform(1.8, 2.8))
z = 300.0
while z > -900:
    largo = random.choice([8.0, 10.0, 12.0, 14.0])
    if 25 < z < 70 or -100 < z < -55:      # el Palacio de Justicia y Saint-Jean
        z -= largo
        continue
    casa('C' if -400 < z < 200 else 'T', 59.0, 72.0 + random.uniform(-2, 2), z - largo + 0.4, z, random.choice([4, 5, 5, 6]))
    z -= largo
# El Palacio de Justicia: las veinticuatro columnas mirando al río.
caja('C', SILLAR, 62, 80, 30, 64, 0.0, 13.0, techo=AZOTEA)
for k in range(24):
    zc = 31.5 + k * (31 / 23)
    barra('T', BLANCO, P(60.0, zc, 1.2), P(60.0, zc, 11.2), 0.9)
caja('C', BLANCO, 58.8, 62, 30, 64, 11.2, 13.4, baldosa=4)
caja('C', BLANCO, 58.8, 62, 30, 64, 0.0, 1.2, baldosa=4)
# La catedral de Saint-Jean: la fachada gótica con sus dos torres cuadradas y el rosetón.
caja('C', SILLAR, 62, 100, -96, -60, 0.0, 22.0, techo=TEJA)
for zt in (-64.0, -92.0):
    caja('C', SILLAR, 60, 68, zt - 4, zt + 4, 0.0, 27.0, techo=AZOTEA)
cara('EP', NEGRO, [P(59.9, -78 + 4 * math.cos(2 * math.pi * i / 16), 15 + 4 * math.sin(2 * math.pi * i / 16)) for i in range(16)], hacia=V((-1, 0, 0)))
tejado('C', TEJA, 62, 100, -96, -60, 22.0, 6.0)

# --- la colina de Fourvière, con su bosque ------------------------------------------------
def alto_colina (x, z):
    f = min(1.0, max(0.0, (x - 76) / 95))
    s = f * f * (3 - 2 * f)
    return 62.0 * s * (1 - 0.25 * max(0.0, (abs(z + 40) - 250) / 400))
filas = []
for i in range(25):                       # de norte a sur
    z = 360 - i * 50
    filas.append([P(x, z, alto_colina(x, z) + (0.8 * math.sin(x * 0.07 + z * 0.05) if 80 < x < 165 else 0)) for x in np.linspace(74, 1400, 40)])
malla('T', MONTE, filas, ARRIBA, u_rep=18, v_rep=24)
n_arb = 0
for _ in range(900):                      # el bosque de la ladera
    x, z = random.uniform(84, 300), random.uniform(-700, 340)
    if 120 < x < 196 and -80 < z < 60:   # la explanada de la basílica
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.0, 1.7), y=alto_colina(x, z) - 0.4)
    n_arb += 1
for _ in range(70):                        # casas sueltas en la ladera baja
    x, z = random.uniform(78, 105), random.uniform(-600, 300)
    y = alto_colina(x, z)
    caja('T', random.choice(F_VIEJO), x, x + 9, z, z + 10, y - 2, y + 9, techo=AZOTEA)
    tejado('T', TEJA, x, x + 9, z, z + 10, y + 9, 2.2)

for _ in range(520):                       # el barrio de la meseta, detrás de la basílica
    x, z = random.uniform(200, 900), random.uniform(-800, 450)
    y = alto_colina(x, z)
    w, d = random.uniform(10, 18), random.uniform(10, 18)
    caja('T', random.choice(F_VIEJO), x, x + w, z, z + d, y - 1, y + random.choice([9, 12, 15]), techo=AZOTEA)

# --- la basílica de Fourvière y la torre metálica -----------------------------------------
BY = alto_colina(150, -40)
caja('C', BLANCO, 124, 194, -78, -2, BY - 4, BY + 0.5, techo=LOSA_CLARA, baldosa=4)          # la explanada
caja('C', BLANCO, 136, 176, -51, -27, BY, BY + 20, techo=BLANCO)                                # la nave
tejado('C', ZINC, 136, 176, -51, -27, BY + 20, 5.0)
prisma('C', BLANCO, [(176 + 12 * math.cos(a), -39 + 12 * math.sin(a)) for a in np.linspace(-math.pi / 2, math.pi / 2, 9)], BY, BY + 18, techo=ZINC)   # el ábside
for (x, z) in ((136, -51), (136, -27), (160, -51), (160, -27)):                                  # las cuatro torres octogonales
    prisma('C', BLANCO, [(x + 4 * math.cos(2 * math.pi * i / 8 + math.pi / 8), z + 4 * math.sin(2 * math.pi * i / 8 + math.pi / 8)) for i in range(8)], BY, BY + 32, techo=BLANCO)
    for i in range(8):                                                                            # las almenas
        a = 2 * math.pi * i / 8
        cubo('T', BLANCO, P(x + 3.6 * math.cos(a), z + 3.6 * math.sin(a), BY + 32.8), (1.0, 1.0, 1.6))
for k in range(6):                                                                                # el pórtico de columnas
    zc = -47 + k * 3.8
    barra('T', BLANCO, P(133.8, zc, BY), P(133.8, zc, BY + 12), 1.0)
caja('C', BLANCO, 132.6, 136, -48, -30, BY + 12, BY + 15, baldosa=4)
caja('C', BLANCO, 172, 177, -26, -21, BY, BY + 26, techo=BLANCO)                                 # el campanario de la capilla
barra('T', ORO, P(174.5, -23.5, BY + 26), P(174.5, -23.5, BY + 31), 1.3)                         # la Virgen dorada
TX, TZ = 168.0, 46.0                                                                              # la torre metálica
ty = alto_colina(TX, TZ)
for (dx, dz) in ((-4, -4), (4, -4), (4, 4), (-4, 4)):
    barra('T', TORRE_METAL, P(TX + dx, TZ + dz, ty), P(TX + dx * 0.2, TZ + dz * 0.2, ty + 44), 0.5)
for h, w in ((10, 3.2), (22, 2.1), (34, 1.2)):
    caja('T', TORRE_METAL, TX - w, TX + w, TZ - w, TZ + w, ty + h, ty + h + 0.6, baldosa=3)
barra('T', TORRE_METAL, P(TX, TZ, ty + 44), P(TX, TZ, ty + 60), 0.4)

# --- puentes de piedra río arriba y río abajo -----------------------------------------------
for zp in (210.0, -330.0, -640.0):
    caja('C', SILLAR, PARAPETO, RIO_X1 + 6, zp - 7, zp + 7, -0.6, 0.6, techo=CALZADA, baldosa=4, tapa_abajo=True)
    for x in (24.0, 31.0, 38.0):
        caja('C', SILLAR, x - 1.4, x + 1.4, zp - 6.5, zp + 6.5, RIO_Y - 1, -0.6, baldosa=3)

# --- la Presqu'île: manzanas con mansarda, Bellecour y el Ródano -------------------------------
suelo('G', ACERA, -1400, -21.0, -1500, 1300, 0.0, 6.0)
suelo('G', ARENA_ROJA, -260, -140, -170, -70, 0.03, 6.0)                                   # la plaza Bellecour
caja('C', SILLAR_GRIS, -203, -197, -123, -117, 0.0, 3.0, baldosa=3)                           # el pedestal de Luis XIV
cubo('T', ACERO, P(-200, -120, 4.4), (2.6, 1.0, 2.8))
RHONE = (-420.0, -360.0)
rect('CP', RIO, RHONE[0], RHONE[1], -1500, 1300, RIO_Y, baldosa=20.0)
PASO = 46.0
n_ed = 0
for x in np.arange(-1350.0, -40.0, PASO):
    for z in np.arange(-1450.0, 1250.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if -266 < cx < -134 and -176 < cz < -64:
            continue
        if RHONE[0] - 30 < cx < RHONE[1] + 30:
            continue
        if cx > -45:
            continue
        dist = math.hypot(cx + 30, cz + 60)
        if dist > 1300 or (dist > 800 and random.random() < 0.4):
            continue
        edificio_mansarda('C' if dist < 330 else 'T', x + 6, x + PASO - 6, z + 6, z + PASO - 6, random.choice([5, 6, 6, 7]), random.choice(F_PRESQUILE))
        n_ed += 1
for x in np.arange(-1350.0, -40.0, PASO):
    suelo('G', CALZADA, x - 6, x + 6, -1500, 1300, 0.04, carriles=(x - 6, 6.0, 'z'))
print('EDIFICIOS', n_ed, 'ARBOLES', n_arb)

cupula('CP', CIELO, 3000.0, 30.0, -60.0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-muelle', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-lyon', ['S', 'E', 'GN', 'EV', 'EP']), ('lugar-lyon-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.86), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=50, cielo_giro=150,
    escala=0.42, satura=0.8, no_alumbran=('CP',))
