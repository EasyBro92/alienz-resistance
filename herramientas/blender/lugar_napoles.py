# Nápoles: el Lungomare con el Castel dell'Ovo y el Vesubio, hecho en Blender (06/10/2026).
#   blender -b -P herramientas/blender/lugar_napoles.py              (entero)
#   blender -b -P herramientas/blender/lugar_napoles.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_napoles.py -- --reusar  (retocar la luz)
#
# Isidro pidió para Italia «lo mismo que en los de España y Francia» y eligió para
# Nápoles: el sitio MÁS FAMOSO que no sean ruinas, los alienz EN NAVE como siempre,
# DE DÍA y llegada larga. El más famoso es la postal de la bahía: el paseo
# marítimo (Via Partenope) con el Castel dell'Ovo en su islote y el Vesubio al
# otro lado del agua. Misma receta que Madrid, Valencia, Marsella y Lyon
# (horneado.py).
#
# Cómo es de verdad: el Lungomare corre de oeste a este pegado al mar, que queda
# al sur. Aquí se juega en el paseo mirando al ESTE:
#   · a la DERECHA la balaustrada blanca, la escollera de rocas claras y el mar,
#     con las barcas de pesca; más allá, el Castel dell'Ovo de toba amarilla en su
#     islote, unido a tierra por su puente, con el Borgo Marinari al pie;
#   · a la IZQUIERDA la calzada con sus palmeras y la fila de grandes hoteles de
#     colores con terrazas y sombrillas;
#   · al FONDO el puerto con sus grúas y un crucero, la ciudad subiendo a la
#     colina del Vomero con el Castel Sant'Elmo arriba y, cerrando la bahía, el
#     Vesubio con sus dos cumbres.
#
# Jugando, en un móvil en vertical, la cámara mira al suelo: se ven el paseo, la
# balaustrada con el mar y el pie de los hoteles. El castillo, la bahía y el
# volcán los enseña el vuelo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.55, 0.74, -0.3)                # de día: del sur (el mar, a la derecha) y alto
iniciar('napoles', 1647, eje=(40.0, -120.0), encendidas=0.0, reflejo=(0.05, 0.1, 0.2))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_mar ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((5, 2, 0.0), (9, 3, 1.3), (14, 5, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.9 * np.sin(2 * np.pi * (u * 2 + v * 4)))
    b = np.clip(onda / 3, -1, 1)
    # Va sin luz (grupo `plano`): el color es el que se ve. Azul de Mediterráneo, claro.
    a = np.stack([0.16 + 0.05 * b, 0.47 + 0.07 * b, 0.68 + 0.07 * b], axis=-1)
    a += (np.clip(b - 0.72, 0, 1) * 1.6)[..., None] * np.array((0.6, 0.5, 0.35))
    return guardar('mar-napoles', a, 88)

def tex_basalto ():
    """El basolato: losas grandes de lava gris a matajunta."""
    a = lienzo(256, 256, (0.44, 0.44, 0.46)) + ruido(256, 256, 0.06)[..., None]
    for i in range(4):
        y0 = i * 64
        desp = (i % 2) * 48
        a[y0:y0 + 2] *= 0.7
        for x in range(desp, 256 + 96, 96):
            a[y0:y0 + 64, x % 256:(x % 256) + 2] *= 0.72
            a[y0 + 2:y0 + 64, (x % 256) + 2:min(256, (x % 256) + 96)] *= 0.93 + 0.12 * random.random()
    return guardar('basalto', a)

BASALTO = material('basalto', tex_basalto(), rug=0.8)
PIEDRA = material('piedra-clara', de_polyhaven('pavement_02', 512, 0xd8d2c4), rug=0.85)
BLANCO = material('piedra-blanca', de_polyhaven('sandstone_blocks_08', 512, 0xf1ede2), rug=0.8)
TUFO = material('tufo', de_polyhaven('sandstone_blocks_08', 512, 0xd9b76c), rug=0.9)
TUFO_VIEJO = material('tufo-viejo', de_polyhaven('castle_wall_varriation', 512, 0xb99a5e), rug=0.9)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0xd6d0c2), rug=0.95)
ROCA_ISLA = material('roca-isla', de_polyhaven('rock_face_03', 512, 0xa89a7c), rug=0.95)
MAR = material('mar', tex_mar(), rug=0.1)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xa9a39a), rug=0.9)
MONTE = material('monte', de_polyhaven('sparse_grass', 512, 0x6c7a4a), rug=1.0)
TIERRA = material('tierra', de_polyhaven('sparse_grass', 512, 0x9a9070), rug=1.0)
FALDA = material('falda', color=(0.4, 0.46, 0.4), rug=1.0)          # el Vesubio: viñas y pinar abajo, con la bruma de la bahía…
CONO = material('cono', color=(0.5, 0.42, 0.44), rug=1.0)            # …y lava pelada arriba
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xb0603c, contraste=0.9), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.6, 0.55, 0.48)))
HIERRO = material('hierro', color=(0.13, 0.15, 0.14), rug=0.5)
GRUA = material('grua', color=(0.9, 0.62, 0.12), rug=0.6)
NEGRO = material('negro', color=(0.03, 0.03, 0.035))
CASCO_AZUL = material('casco-azul', color=(0.1, 0.2, 0.42), rug=0.5)
BARCO_BLANCO = material('barco-blanco', color=(0.93, 0.93, 0.9), rug=0.5)
CHIMENEA = material('chimenea', color=(0.8, 0.16, 0.12), rug=0.5)
# Los colores de Nápoles: ocre, salmón, rojo pompeyano, crema y amarillo, con postigos verdes.
PALETA = [((0.9, 0.72, 0.42), (0.22, 0.38, 0.28)), ((0.9, 0.62, 0.5), (0.3, 0.42, 0.34)), ((0.74, 0.32, 0.25), (0.86, 0.82, 0.72)),
          ((0.93, 0.87, 0.72), (0.25, 0.4, 0.3)), ((0.95, 0.84, 0.52), (0.36, 0.3, 0.24)), ((0.86, 0.78, 0.7), (0.4, 0.26, 0.2))]
FACHADAS = [material(f'f-napoles-{i}', tex_postigos(f'napoles-{i}', b, p)) for i, (b, p) in enumerate(PALETA)]
HOTELES = [material(f'f-hotel-{i}', tex_crema(f'hotel-{i}', c, balcon=0.9)) for i, c in enumerate([(0.93, 0.88, 0.76), (0.92, 0.74, 0.6), (0.9, 0.8, 0.56), (0.88, 0.84, 0.8)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.16, 0.3, 0.1), (0.2, 0.36, 0.13), (0.25, 0.4, 0.15)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.2, 0.36, 0.12), (0.26, 0.42, 0.16)])]
TRONCO = material('tronco', color=(0.4, 0.31, 0.22))
COCHES = [material(f'coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.82, 0.82, 0.84), (0.12, 0.12, 0.13), (0.62, 0.1, 0.08), (0.1, 0.22, 0.5), (0.9, 0.86, 0.72), (0.9, 0.72, 0.1)])]
LUNA = material('coche-luna', color=(0.05, 0.07, 0.1), rug=0.2)
BARCAS = [material(f'barca-{i}', color=c, rug=0.6) for i, c in enumerate([(0.92, 0.92, 0.88), (0.12, 0.32, 0.62), (0.75, 0.16, 0.12), (0.1, 0.5, 0.46), (0.94, 0.8, 0.3)])]
MADERA = material('madera', color=(0.5, 0.36, 0.22), rug=0.9)
TOLDOS = [material(f'toldo-{i}', color=c, rug=0.9) for i, c in enumerate([(0.95, 0.94, 0.9), (0.78, 0.16, 0.14), (0.14, 0.4, 0.3), (0.95, 0.82, 0.3)])]
FAROLA = material('brillo-farola', color=(1.0, 0.9, 0.7), emite=1.5)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.84, 0.9, 0.95)), (0.07, (0.74, 0.85, 0.96)), (0.25, (0.46, 0.69, 0.94)), (0.6, (0.24, 0.5, 0.88)), (1.0, (0.13, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.6, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.14), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LO QUE RODEA AL CAMPO
# ==================================================================================
config_suelo(-1500, 1700, -1700, 1400, (-360, 300), (-480, 300))
IZQ, BALA = -8.8, 9.4                    # el paseo de juego va de la calzada a la balaustrada
Z_CERCA, Z_FIN = 34.0, -470.0            # el paseo acaba en el puerto
MAR_Y = -3.0
ESCOLLERA = 16.5                         # hasta dónde llegan las rocas

# --- el paseo: basalto con cenefas de piedra clara ------------------------------------
rect('S', BASALTO, IZQ, BALA, -175, Z_CERCA, 0.0, baldosa=4.0)
for z in np.arange(22.0, -175.0, -16.0):
    rect('S', PIEDRA, IZQ, BALA, z - 0.35, z + 0.35, 0.012, baldosa=2.0)
for x in (IZQ + 0.3, BALA - 0.3):
    rect('S', PIEDRA, x - 0.3, x + 0.3, -175, Z_CERCA, 0.014, baldosa=2.0)
suelo('GN', BASALTO, IZQ, BALA, Z_FIN, -175, 0.0, 4.0)

# --- la balaustrada blanca, con sus farolas de hierro -------------------------------------
caja('E', BLANCO, BALA, BALA + 0.55, Z_FIN, 300.0, MAR_Y, 0.34, baldosa=3)                  # el murete
caja('E', BLANCO, BALA - 0.05, BALA + 0.6, Z_FIN, 300.0, 0.92, 1.08, baldosa=3)             # el pasamanos
for z in np.arange(33.0, -180.0, -1.1):                                                     # los balaustres
    cubo('EV', BLANCO, P(BALA + 0.27, z, 0.63), (0.2, 0.2, 0.6))
for z in np.arange(30.0, -175.0, -17.0):
    caja('E', BLANCO, BALA - 0.12, BALA + 0.67, z - 0.4, z + 0.4, 0.0, 1.3, baldosa=3)      # el pilar
    barra('EV', HIERRO, P(BALA + 0.27, z, 1.3), P(BALA + 0.27, z, 5.6), 0.15)
    for dz in (-0.55, 0.55):
        barra('EV', HIERRO, P(BALA + 0.27, z, 5.2), P(BALA + 0.27, z + dz, 5.5), 0.08)
        cubo('EP', FAROLA, P(BALA + 0.27, z + dz, 5.35), (0.38, 0.38, 0.42))
for z in np.arange(24.0, -170.0, -17.0):                                                    # los bancos, del lado de la calzada
    caja('E', PIEDRA, IZQ + 0.25, IZQ + 0.95, z - 1.2, z + 1.2, 0.0, 0.45, baldosa=3)

# --- la escollera: rocas claras apiladas hasta el agua --------------------------------------
z = 300.0
while z > Z_FIN:
    for fila in range(4):
        x = BALA + 1.1 + fila * 1.7 + random.uniform(-0.3, 0.3)
        y = 0.1 - fila * 0.85 + random.uniform(-0.25, 0.25)
        t = random.uniform(1.5, 2.3)
        cubo('EV' if -180 < z < 40 else 'T', ROCA, P(x, z + random.uniform(-0.5, 0.5), y - t * 0.3), (t, t * random.uniform(0.9, 1.3), t * 0.75), random.uniform(0, 1.5))
    z -= random.uniform(1.5, 2.1)
rect('EP', MAR, BALA + 0.5, 1700, -900, 1400, MAR_Y, baldosa=26.0)

def barca (grupo, x, z, giro, largo=4.6):
    """Un gozzo: casco de dos puntas, borda y bancada."""
    c, s = math.cos(giro), math.sin(giro)
    def g (dx, dz, y):
        return P(x + dx * c - dz * s, z + dx * s + dz * c, y)
    m = random.choice(BARCAS)
    a = largo / 2
    b = largo * 0.19
    borde = [(-a, 0), (-a * 0.6, b), (a * 0.5, b), (a, 0), (a * 0.5, -b), (-a * 0.6, -b)]
    for i in range(6):
        (x0, z0), (x1, z1) = borde[i], borde[(i + 1) % 6]
        cara(grupo, m, [g(x0 * 0.82, z0 * 0.7, MAR_Y - 0.1), g(x1 * 0.82, z1 * 0.7, MAR_Y - 0.1), g(x1, z1, MAR_Y + 0.55), g(x0, z0, MAR_Y + 0.55)])
    cara(grupo, MADERA, [g(px * 0.92, pz * 0.86, MAR_Y + 0.3) for px, pz in borde], hacia=ARRIBA)
    cara(grupo, m, [g(-0.15, -b * 0.9, MAR_Y + 0.5), g(0.25, -b * 0.9, MAR_Y + 0.5), g(0.25, b * 0.9, MAR_Y + 0.5), g(-0.15, b * 0.9, MAR_Y + 0.5)], hacia=ARRIBA)
for _ in range(16):                                                                           # barcas fondeadas cerca del paseo
    barca('EV', random.uniform(20, 46), random.uniform(-150, 20), random.uniform(0, 6.3))

# --- la calzada, las palmeras y las terrazas -------------------------------------------------
suelo('GN', CALZADA, -18.0, IZQ, -520, 300, 0.0, carriles=(-18.0, 4.6, 'z'))
caja('E', PIEDRA, IZQ - 0.25, IZQ, -180, Z_CERCA, 0.0, 0.16, baldosa=3)                      # el bordillo
suelo('GN', ACERA, -21.5, -18.0, -520, 300, 0.06, 4.0)
for z in np.arange(28.0, -180.0, -13.0):
    palmera('EV', TRONCO, PALMA, IZQ - 0.9, z, alto=random.uniform(7.5, 9.5))
for z in np.arange(30.0, -180.0, -6.3):
    if random.random() < 0.3:
        continue
    coche('EV', COCHES, LUNA, -16.6, z, random.gauss(0, 0.04) + math.pi * (random.random() < 0.5))

def sombrilla (x, z):
    m = random.choice(TOLDOS)
    barra('EV', HIERRO, P(x, z, 0.06), P(x, z, 2.5), 0.07)
    cima = P(x, z, 2.75)
    borde = [P(x + 1.25 * math.cos(2 * math.pi * i / 8), z + 1.25 * math.sin(2 * math.pi * i / 8), 2.25) for i in range(8)]
    for i in range(8):
        cara('EV', m, [cima, borde[i], borde[(i + 1) % 8]], hacia=ARRIBA)
    cubo('EV', MADERA, P(x, z, 0.5), (0.8, 0.8, 0.06))
z = 26.0
while z > -176:
    if random.random() < 0.7:
        sombrilla(-19.9, z)
    z -= random.uniform(2.9, 4.2)

# --- los grandes hoteles de Via Partenope -----------------------------------------------------
def hotel (grupo, x0, x1, z0, z1, plantas, fach):
    alto = plantas * 3.0
    caja(grupo, fach, x0, x1, z0, z1, 0.0, alto, techo=AZOTEA)
    caja(grupo, BLANCO, x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, alto, alto + 0.7, techo=AZOTEA, baldosa=3)   # la cornisa
    # El toldo corrido de los bajos, sobre las terrazas.
    cara(grupo, random.choice(TOLDOS), [P(x1, z0 + 1, 3.3), P(x1, z1 - 1, 3.3), P(x1 + 2.6, z1 - 1, 2.6), P(x1 + 2.6, z0 + 1, 2.6)], hacia=ARRIBA)
z = 40.0
while z > -470:
    largo = random.choice([24.0, 30.0, 36.0])
    hotel('E' if z > -180 else 'C', -40.0, -21.5, z - largo, z, random.choice([6, 7, 7, 8]), random.choice(HOTELES + FACHADAS[:2]))
    z -= largo + 8.0

comprobar_paso(('E', 'EP', 'S', 'EV'))

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- el Castel dell'Ovo: toba amarilla sobre su islote, con el Borgo Marinari al pie -----------
ISLA = [(60, -146), (66, -170), (104, -178), (140, -166), (148, -140), (134, -116), (118, -100), (74, -98), (58, -118)]
prisma('C', ROCA_ISLA, ISLA, MAR_Y - 1, 1.6, techo=PIEDRA, baldosa=5)
MURO = [(68, -150), (74, -164), (110, -168), (134, -158), (139, -140), (127, -124), (92, -119), (70, -127)]
prisma('C', TUFO, MURO, 1.6, 27.0, techo=TUFO_VIEJO, baldosa=6)
def encoger (planta, k):
    cx = sum(p[0] for p in planta) / len(planta); cz = sum(p[1] for p in planta) / len(planta)
    return [(cx + (x - cx) * k, cz + (z - cz) * k) for x, z in planta]
prisma('C', TUFO_VIEJO, encoger(MURO, 0.8), 27.0, 33.0, techo=TUFO_VIEJO, baldosa=6)       # la segunda terraza
caja('C', TUFO, 80, 106, -158, -134, 33.0, 41.0, techo=AZOTEA, baldosa=6)                     # el cuerpo alto
prisma('C', TUFO, [(125 + 9 * math.cos(2 * math.pi * i / 12), -142 + 9 * math.sin(2 * math.pi * i / 12)) for i in range(12)], 1.6, 31.0, techo=TUFO_VIEJO, baldosa=6)
for i in range(22):                                                                          # las almenas del adarve
    f = i / 22
    n = len(MURO)
    k = int(f * n); t = f * n - k
    (ax, az), (bx, bz) = MURO[k], MURO[(k + 1) % n]
    cubo('T', TUFO, P(ax + (bx - ax) * t, az + (bz - az) * t, 27.6), (1.6, 1.6, 1.2))
# El puente que lo une al paseo, con su torre de entrada.
caja('C', TUFO_VIEJO, BALA + 0.55, 70, -147, -141, MAR_Y - 1, 1.1, techo=BASALTO, baldosa=4)
for x in np.arange(20.0, 62.0, 10.0):
    cara('CP', NEGRO, [P(x + 3.4 * math.cos(a), -140.95, MAR_Y + 3.0 * math.sin(a)) for a in np.linspace(0, math.pi, 9)], hacia=V((0, -1, 0)))   # los ojos del puente
    cara('CP', NEGRO, [P(x + 3.4 * math.cos(a), -147.05, MAR_Y + 3.0 * math.sin(a)) for a in np.linspace(0, math.pi, 9)], hacia=V((0, 1, 0)))
caja('C', TUFO, 62, 70, -149, -139, 1.1, 13.0, techo=TUFO_VIEJO, baldosa=6)
# El Borgo Marinari: casitas de pescadores y restaurantes, y su puertecito.
for k in range(9):
    x0 = 74 + k * 5.2
    alto = random.choice([6, 9, 9])
    f = random.choice(FACHADAS)
    caja('C', f, x0, x0 + 4.9, -112, -102, 1.6, 1.6 + alto, techo=AZOTEA)
    tejado('C', TEJA, x0, x0 + 4.9, -112, -102, 1.6 + alto, 1.6)
for _ in range(26):
    barca('T', random.uniform(64, 122), random.uniform(-94, -74), random.choice([0, math.pi]) + random.gauss(0, 0.1), largo=random.uniform(4, 8))
caja('C', ROCA_ISLA, 56, 126, -72, -69, MAR_Y - 1, 0.6, baldosa=4)                            # el espigón que lo abriga

# --- la tierra: la ciudad a la izquierda, el puerto al fondo y la costa del volcán --------------
suelo('G', ACERA, -1500, -21.5, -1700, 1400, 0.0, 6.0)
suelo('G', ACERA, -21.5, 520, -1700, Z_FIN, 0.0, 6.0)                                        # el puerto
suelo('G', TIERRA, 520, 1700, -1700, -900, 0.0, 10.0)                                        # la orilla de enfrente
cara('C', TUFO_VIEJO, [P(BALA + 0.55, Z_FIN, MAR_Y - 1), P(520, Z_FIN, MAR_Y - 1), P(520, Z_FIN, 0.0), P(BALA + 0.55, Z_FIN, 0.0)], hacia=V((0, 1, 0)), baldosa=4)
cara('C', TUFO_VIEJO, [P(520, Z_FIN, MAR_Y - 1), P(520, -900, MAR_Y - 1), P(520, -900, 0.0), P(520, Z_FIN, 0.0)], hacia=V((1, 0, 0)), baldosa=4)
cara('C', ROCA_ISLA, [P(520, -900, MAR_Y - 1), P(1700, -900, MAR_Y - 1), P(1700, -900, 0.0), P(520, -900, 0.0)], hacia=V((0, 1, 0)), baldosa=6)

# El puerto: tinglados, grúas y un crucero atracado.
for _ in range(26):
    x, z = random.uniform(60, 480), random.uniform(-640, -500)
    w, d = random.uniform(24, 46), random.uniform(14, 22)
    caja('C', random.choice(HOTELES), x, x + w, z, z + d, 0.0, random.choice([8, 10, 12]), techo=AZOTEA)
for x in (120.0, 210.0, 330.0, 430.0):
    for dx in (-6, 6):
        for dz in (-5, 5):
            barra('T', GRUA, P(x + dx, -488 + dz, 0), P(x + dx, -488 + dz, 34), 0.9)
    caja('T', GRUA, x - 7, x + 7, -494, -482, 34, 36.5, baldosa=4)
    barra('T', GRUA, P(x, -494, 37), P(x, -440, 44), 1.1)                                      # la pluma, sobre el agua
caja('C', CASCO_AZUL, 150, 410, -455, -425, MAR_Y - 1, 6.0, baldosa=6)                         # el crucero
caja('C', BARCO_BLANCO, 150, 410, -455, -425, 6.0, 12.0, baldosa=6)
caja('C', BARCO_BLANCO, 176, 392, -452, -428, 12.0, 24.0, techo=BARCO_BLANCO, baldosa=6)
for z0, z1 in ((-452.05, -452.0), (-428.0, -427.95)):
    for y in (14.0, 17.0, 20.0):
        caja('CP', NEGRO, 180, 388, z0, z1, y, y + 1.1, baldosa=6)                               # las filas de camarotes
caja('C', CHIMENEA, 300, 322, -446, -434, 24.0, 33.0, baldosa=6)

# --- la colina del Vomero, con el Castel Sant'Elmo arriba ----------------------------------------
def loma (x, z):
    f = min(1.0, max(0.0, (-250 - x) / 380))
    s = f * f * (3 - 2 * f)
    return 150.0 * s * (1 - 0.3 * min(1.0, max(0.0, (abs(z + 250) - 520) / 600)))
filas = []
for i in range(30):
    z = 1350 - i * 104
    filas.append([P(x, z, loma(x, z)) for x in np.linspace(-1500, -250, 30)])
malla('T', MONTE, filas, ARRIBA, u_rep=20, v_rep=40)
n_ed = 0
for _ in range(1100):                                                                         # la ciudad que sube por la ladera
    x, z = random.uniform(-1300, -255), random.uniform(-1500, 1200)
    y = loma(x, z)
    w, d = random.uniform(11, 20), random.uniform(11, 20)
    caja('T', random.choice(FACHADAS), x, x + w, z, z + d, y - 3, y + random.choice([9, 12, 15, 18]), techo=AZOTEA)
    n_ed += 1
EX, EZ = -640.0, -230.0                                                                       # Sant'Elmo: la estrella de toba en la cima
ey = loma(EX, EZ)
prisma('C', TUFO, [(EX + (62 if i % 2 == 0 else 40) * math.cos(2 * math.pi * i / 12), EZ + (62 if i % 2 == 0 else 40) * math.sin(2 * math.pi * i / 12)) for i in range(12)],
       ey - 6, ey + 26, techo=TUFO_VIEJO, baldosa=8)
caja('C', BLANCO, EX + 70, EX + 130, EZ + 30, EZ + 60, ey - 14, ey + 8, techo=TEJA, baldosa=6)   # la Certosa di San Martino, blanca, a su pie

# --- la ciudad llana: manzanas de colores con azotea ---------------------------------------------
PASO = 46.0
for x in np.arange(-250.0, 500.0, PASO):
    for z in np.arange(-1650.0, 1300.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if cx > -44 and cz > -660:                    # el paseo, el mar y el puerto
            continue
        if random.random() < 0.08:
            continue
        cerca = math.hypot(cx + 30, cz + 100) < 340
        hotel('C' if cerca else 'T', x + 6, x + PASO - 6, z + 6, z + PASO - 6, random.choice([5, 6, 6, 7]), random.choice(FACHADAS)) if cerca else \
            caja('T', random.choice(FACHADAS), x + 6, x + PASO - 6, z + 6, z + PASO - 6, 0.0, random.choice([15, 18, 18, 21]), techo=AZOTEA)
        n_ed += 1
for x in np.arange(-250.0, -40.0, PASO):
    suelo('G', CALZADA, x - 5, x + 5, -1700, 1400, 0.04, carriles=(x - 5, 5.0, 'z'))
for _ in range(120):                                                                          # pinos y palmeras entre las casas
    x, z = random.uniform(-240, -46), random.uniform(-460, 300)
    if random.random() < 0.5:
        arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.0, 1.5))

# --- el Vesubio: el Gran Cono y, a su izquierda, la cresta del Somma --------------------------------
# Su silueta es lo que lo hace reconocible: el cono, alto y truncado, a la derecha;
# la cresta del Somma, más baja, a la izquierda; y entre los dos, el collado. La
# primera versión, con laderas anchas y redondas, era una loma verde cualquiera.
VX, VZ = 300.0, -1500.0
def volcan (x, z):
    r = math.hypot(x - VX, z - VZ)
    cono = 470.0 * math.exp(-(r / 215.0) ** 1.25)
    borde = 470.0 * math.exp(-(46 / 215.0) ** 1.25)
    if r < 46:                                         # el cráter: la cima es un borde, no una punta
        cono = borde - (46 - r) * 0.8
    somma = 300.0 * math.exp(-((x - (VX - 265)) / 120) ** 2 - ((z - VZ - 30) / 230) ** 2)
    falda = 60.0 * math.exp(-r / 520.0)                # el pie ancho, que se pierde en la llanura
    return max(0.0, max(cono, somma) + falda - 9.0)
xs = np.linspace(VX - 1300, VX + 1300, 66)
zs = np.linspace(VZ + 590, VZ - 380, 26)
for i in range(len(zs) - 1):
    for j in range(len(xs) - 1):
        esq = [(xs[j], zs[i]), (xs[j + 1], zs[i]), (xs[j + 1], zs[i + 1]), (xs[j], zs[i + 1])]
        hs = [volcan(x, z) for x, z in esq]
        if max(hs) < 0.5:
            continue
        m = CONO if sum(hs) / 4 > 165 else FALDA
        cara('T', m, [P(x, z, h) for (x, z), h in zip(esq, hs)], hacia=ARRIBA)
for _ in range(420):                                                                          # los pueblos de su falda
    x, z = random.uniform(540, 1650), random.uniform(-1500, -905)
    y = volcan(x, z)
    if y > 70:
        continue
    w = random.uniform(10, 18)
    caja('T', random.choice(FACHADAS), x, x + w, z, z + w, y - 2, y + random.choice([7, 9, 12]), techo=AZOTEA)
    n_ed += 1
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3200.0, 40.0, -120.0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-paseo', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-napoles', ['S', 'E', 'GN', 'EV', 'EP']), ('lugar-napoles-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.86), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=50, cielo_giro=150,
    escala=0.42, satura=0.8, no_alumbran=('CP',))
