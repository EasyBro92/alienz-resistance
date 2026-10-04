# París: el Campo de Marte al pie de la torre, hecho en Blender (04/10/2026).
#   blender -b -P herramientas/blender/lugar_paris.py              (entero)
#   blender -b -P herramientas/blender/lugar_paris.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_paris.py -- --reusar  (retocar la luz)
#
# Isidro: «me gusta el mapa de París, me gustaría reconstruir algunas zonas».
# Eligió rehacer los lados del campo, el suelo y el fondo con la ciudad, en
# Blender y de día como estaba; la torre, la de Meshy («detállala mejor sin
# rehacerla»), y que los alienz SALGAN DE DEBAJO DE LA TORRE, sin nave: es el
# túnel que cuenta la historia («debajo había un túnel que baja»).
#
# Lo que le gustaba se conserva: se mira por el eje del campo hacia la torre,
# cuyo arco enmarca el final del césped. Cómo es de verdad, apretado al encuadre
# del móvil:
#   · en el centro, el paseo de gravilla clara (donde se juega);
#   · a cada lado los céspedes con sus arquitos de hierro, el paseo lateral con
#     bancos y farolas, y la doble hilera de castaños;
#   · más allá, las avenidas de Suffren y La Bourdonnais con sus fachadas
#     haussmannianas (piedra crema, balcones corridos, mansarda de zinc);
#   · al fondo la torre: el modelo de Meshy se hornea con el sitio (le caen la
#     luz y las sombras en los vértices y conserva su textura), sobre cuatro
#     basamentos de piedra, y entre sus patas el TÚNEL: una zanja con rampa que
#     sube al campo, con la boca negra al fondo. Los alienz nacen dentro, tres
#     metros bajo el suelo, y suben por la rampa (`hueco` de `parisMarte`);
#   · solo en el vuelo: el Sena con el puente de Iéna, el Trocadero y el Palacio
#     de Chaillot, la École Militaire a la espalda, los Inválidos con su cúpula
#     dorada, la torre Montparnasse y los tejados de zinc de París.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.42, 0.72, 0.55)                # de día: alto, por la derecha y a la espalda (la torre, de cara)
iniciar('paris', 1889, eje=(0.0, -60.0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# Los números que comparten guion y juego (`parisMarte` en escenarios.js).
TZ, TH = -116.0, 64.0                   # la torre: centro y altura (con 64, las patas empiezan a 8,8 del eje)
HX = 7.6                                # el túnel, tan ancho como el paseo
HZ_FONDO, HZ_BORDE, HONDO = -124.0, -106.0, 3.0
BASE = (-13.0, -50.0)                   # la base alien, en una glorieta del césped izquierdo
PASEO = 7.6                             # el paseo de gravilla: ±7,6
CESPED_X = 13.0                         # el césped, de 7,6 a 13
ALLEE_X = 16.5                          # el paseo lateral, de 13 a 16,5
ARBOLES = (17.6, 21.4)                  # la doble hilera de castaños
Z_CERCA = 34.0

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_rio ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((6, 1, 0.0), (11, 2, 1.3), (17, 3, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.8 * np.sin(2 * np.pi * (u * 2 - v * 4)))
    b = np.clip(onda / 3, -1, 1)
    a = np.stack([0.32 + 0.05 * b, 0.45 + 0.06 * b, 0.46 + 0.07 * b], axis=-1)   # va sin luz (plano): clara, o sale negra
    a += (np.clip(b - 0.7, 0, 1) * 1.3)[..., None] * np.array((0.55, 0.62, 0.65))
    return guardar('sena', a, 88)

def tex_losa ():
    a = lienzo(256, 256, (0.74, 0.71, 0.66)) + ruido(256, 256, 0.07)[..., None]
    for i in range(4):
        for j in range(4):
            a[i * 64:(i + 1) * 64, j * 64:(j + 1) * 64] *= 0.94 + 0.09 * random.random()
    a[::64] *= 0.8; a[:, ::64] *= 0.8
    return guardar('losa', a)

GRAVA = material('grava', de_polyhaven('sandy_gravel_02', 512, 0xcdbf9f), rug=1.0)
GRAVA_OSC = material('grava-osc', imagen_de(GRAVA), tinte=0xb3a688, rug=1.0)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x5f8a3a), rug=1.0)
LOSA = material('losa', tex_losa(), rug=0.85)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xd8ccb4), rug=0.9)
SILLAR_OSCURO = material('sillar-oscuro', imagen_de(SILLAR), tinte=0x8d8577, rug=0.9)
HORMIGON = material('hormigon', de_polyhaven('concrete_floor_worn_001', 512, 0x8a857c), rug=0.9)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xa59f95), rug=0.9)
SENA = material('sena', tex_rio(), rug=0.1)
ZINC = material('zinc', color=(0.36, 0.39, 0.43), rug=0.5)
AZOTEA = material('azotea', tex_azotea((0.5, 0.47, 0.44)))
F_HAUSS = [material(f'f-hauss-{i}', tex_crema(f'hauss-{i}', c, balcon=0.9)) for i, c in enumerate(
    [(0.88, 0.84, 0.74), (0.85, 0.81, 0.71), (0.9, 0.86, 0.77), (0.83, 0.79, 0.7)])]
HIERRO = material('hierro-verde', color=(0.12, 0.2, 0.15), rug=0.6)      # el verde de los bancos y arquitos de París
MADERA = material('madera-banco', color=(0.35, 0.27, 0.18), rug=0.8)
NEGRO = material('negro', color=(0.01, 0.012, 0.01))
LUZ_ALIEN = material('brillo-alien', color=(0.45, 1.0, 0.55), emite=4.0)
FAROLA = material('brillo-farola', color=(1.0, 0.86, 0.6), emite=1.5)
ORO = material('oro', color=(0.95, 0.72, 0.28), rug=0.3)
PIZARRA = material('pizarra', color=(0.24, 0.27, 0.31), rug=0.6)
VIDRIO = material('vidrio', color=(0.1, 0.13, 0.16), rug=0.2)
OSCURO = material('torre-oscura', color=(0.13, 0.13, 0.15), rug=0.5)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.17, 0.31, 0.11), (0.21, 0.36, 0.13), (0.25, 0.4, 0.15)])]
TRONCO = material('tronco', color=(0.33, 0.27, 0.21))
COCHES = [material(f'coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.8, 0.81, 0.83), (0.12, 0.12, 0.13), (0.55, 0.1, 0.08), (0.12, 0.2, 0.45)])]
LUNA = material('coche-luna', color=(0.05, 0.07, 0.1), rug=0.2)
BANDERA = [material(f'bandera-{i}', color=c, rug=0.9) for i, c in enumerate([(0.0, 0.14, 0.58), (0.95, 0.95, 0.95), (0.86, 0.1, 0.15)])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.88, 0.94)), (0.07, (0.74, 0.84, 0.95)), (0.25, (0.48, 0.69, 0.93)), (0.6, (0.26, 0.5, 0.86)), (1.0, (0.15, 0.36, 0.75))],
    (SOL[0], SOL[2]), 0.62, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.25), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LO QUE RODEA AL CAMPO (se ve toda la partida)
# ==================================================================================
config_suelo(-1400, 1400, -1500, 1400, (-300, 300), (-420, 260))

# El suelo de debajo de todo lo cercano (lo que asoma entre los árboles y bajo
# el arco de la torre): primero la base, encima lo demás (trampa 2 de horneado.py).
# (con el hueco del túnel abierto: tapado por esta capa, la zanja no se veía)
suelo('GN', ACERA, -220, 220, HZ_BORDE, 170, -0.06, 6.0)
suelo('GN', ACERA, -220, 220, -170, HZ_FONDO, -0.06, 6.0)
suelo('GN', ACERA, -220, -HX, HZ_FONDO, HZ_BORDE, -0.06, 6.0)
suelo('GN', ACERA, HX, 220, HZ_FONDO, HZ_BORDE, -0.06, 6.0)

# --- el paseo de gravilla, cortado por el túnel ------------------------------------------
rect('S', GRAVA, -PASEO, PASEO, HZ_BORDE, Z_CERCA, 0.0, baldosa=5.0)
rect('S', LOSA, -PASEO, PASEO, -150, HZ_FONDO, 0.0, baldosa=4.0)                 # pasado el túnel, la explanada de la torre
suelo('GN', GRAVA, -PASEO, PASEO, Z_CERCA, 160, 0.0, 5.0)                        # a la espalda, hasta la École Militaire

# --- céspedes, paseos laterales, castaños --------------------------------------------------
Z_TORRE = -98.0                                                                  # donde acaba el césped y empieza la explanada
for s in (-1, 1):
    a, b = sorted((s * PASEO, s * CESPED_X))
    suelo('GN', CESPED, a, b, Z_TORRE, 160, 0.0, 6.0)
    a, b = sorted((s * CESPED_X, s * ALLEE_X))
    suelo('GN', GRAVA_OSC, a, b, Z_TORRE, 160, 0.0, 5.0)
    a, b = sorted((s * ALLEE_X, s * 27.0))
    suelo('GN', GRAVA, a, b, Z_TORRE, 160, 0.0, 5.0)                             # bajo los castaños
    a, b = sorted((s * 27.0, s * 29.0))
    suelo('GN', ACERA, a, b, -150, 1400, 0.0, 4.0)
    a, b = sorted((s * 29.0, s * 39.0))
    suelo('GN', CALZADA, a, b, -150, 1400, 0.0, carriles=(a, 5.0, 'z'))          # las avenidas
    a, b = sorted((s * 39.0, s * 42.0))
    suelo('GN', ACERA, a, b, -150, 1400, 0.0, 4.0)
# La explanada de la torre (pavimento), sin pisar el túnel.
suelo('GN', LOSA, -27, -HX, HZ_FONDO, Z_TORRE, 0.0, 4.0)
suelo('GN', LOSA, HX, 27, HZ_FONDO, Z_TORRE, 0.0, 4.0)
suelo('GN', LOSA, -27, -PASEO, -150, HZ_FONDO, 0.0, 4.0)                       # (el centro es del paseo: S)
suelo('GN', LOSA, PASEO, 27, -150, HZ_FONDO, 0.0, 4.0)

def lejos_de_base (x, z, r=6.5):
    return math.hypot(x - BASE[0], z - BASE[1]) > r

# La glorieta de la base alien: pavimento redondo con un seto bajo alrededor.
disco = [(BASE[0] + 4.9 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.9 * math.sin(2 * math.pi * i / 28)) for i in range(28)]
cara('S', LOSA, [P(x, z, 0.03) for x, z in disco], hacia=ARRIBA, baldosa=4.0)

# Los arquitos de hierro que bordean los céspedes (los de todo París).
def arquitos (x, z0, z1):
    z = z0
    while z > z1:
        if lejos_de_base(x, z, 5.6):
            a, b = P(x, z, 0.0), P(x, z - 1.0, 0.0)
            c = P(x, z - 0.5, 0.38)
            barra('EV', HIERRO, a, c, 0.035)
            barra('EV', HIERRO, c, b, 0.035)
        z -= 1.0
for s in (-1, 1):
    arquitos(s * (PASEO + 0.25), Z_CERCA, Z_TORRE)
    arquitos(s * (CESPED_X - 0.25), Z_CERCA, Z_TORRE)

# Bancos de listones y farolas parisinas en el paseo lateral.
def banco (x, z, mira):
    caja('EV', MADERA, x - 0.25, x + 0.25, z - 1.0, z + 1.0, 0.42, 0.48, baldosa=2)
    caja('EV', MADERA, x + mira * 0.28 - 0.04, x + mira * 0.28 + 0.04, z - 1.0, z + 1.0, 0.5, 0.95, baldosa=2)
    for dz in (-0.85, 0.85):
        caja('EV', HIERRO, x - 0.25, x + 0.3, z + dz - 0.05, z + dz + 0.05, 0.0, 0.48, baldosa=2)
def farola (x, z):
    barra('EV', HIERRO, P(x, z, 0), P(x, z, 4.0), 0.16)
    caja('EV', HIERRO, x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0.0, 0.7, baldosa=2)           # el pie moldurado
    cubo('EP', FAROLA, P(x, z, 4.3), (0.42, 0.42, 0.55))
    cubo('EV', HIERRO, P(x, z, 4.65), (0.55, 0.55, 0.12))
for s in (-1, 1):
    for z in np.arange(26.0, Z_TORRE, -12.0):
        if lejos_de_base(s * (ALLEE_X - 0.6), z):
            banco(s * (ALLEE_X - 0.6), z, s)
    for z in np.arange(20.0, Z_TORRE, -16.0):
        if lejos_de_base(s * (CESPED_X + 0.5), z):
            farola(s * (CESPED_X + 0.5), z)
    for x in ARBOLES:
        for z in np.arange(30.0, Z_TORRE + 2, -7.0):
            if lejos_de_base(s * x, z, 7.5):
                arbol('EV', TRONCO, HOJAS, s * x + random.uniform(-0.2, 0.2), z + random.uniform(-0.3, 0.3), random.uniform(1.05, 1.25))   # copa sencilla: son setenta y dos
        for z in np.arange(Z_CERCA + 7, 160, 7.0):
            arbol('T', TRONCO, HOJAS, s * x, z, 1.15)

# --- las fachadas de las avenidas: piedra crema, balcones y mansarda de zinc ---------------
def haussmann (grupo, x0, x1, z0, z1, plantas, fach=None):
    alto = plantas * 3.0
    caja(grupo, fach or random.choice(F_HAUSS), x0, x1, z0, z1, 0.0, alto, techo=AZOTEA)
    m = 1.4
    caja(grupo, ZINC, x0 + m, x1 - m, z0 + m, z1 - m, alto, alto + 3.0, techo=AZOTEA, baldosa=3)
    tejado(grupo, ZINC, x0, x1, z0, z1, alto, 1.0)
for s in (-1, 1):
    z = 150.0
    while z > -168:
        largo = random.choice([18.0, 22.0, 26.0, 30.0])
        x0, x1 = sorted((s * 42.0, s * 58.0))
        haussmann('E' if -175 < z < 60 else 'C', x0, x1, z - largo, z, random.choice([6, 6, 7]))
        z -= largo + 8.0
    for z in np.arange(140.0, -150.0, -7.5):                                      # coches aparcados
        if random.random() < 0.7:
            coche('EV' if -150 < z < 40 else 'T', COCHES, LUNA, s * 30.3, z, math.pi * (s < 0))

# --- la torre: el modelo de Meshy, sus basamentos de piedra y el túnel -------------------
TORRE = importar(os.path.join(H.MODELOS, 'monumento-eiffel.glb'), 'TV', TH, 0.0, TZ)
for sx in (-1, 1):
    for sz in (-1, 1):
        x0, x1 = sorted((sx * 8.3, sx * 14.3))
        z0, z1 = sorted((TZ + sz * 8.3, TZ + sz * 14.3))
        caja('E', SILLAR, x0, x1, z0, z1, 0.0, 1.7, techo=SILLAR, baldosa=3)       # el basamento de cada pata
        caja('E', SILLAR_OSCURO, x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, 0.0, 0.35, baldosa=3)
# La antena y la bandera de la cima.
barra('EV', OSCURO, P(0, TZ, TH - 0.5), P(0, TZ, TH + 5.0), 0.25)
for i, mat in enumerate(BANDERA):
    cara('EV', mat, [P(0.15 + i * 0.7, TZ, TH + 3.6), P(0.85 + i * 0.7, TZ, TH + 3.6), P(0.85 + i * 0.7, TZ, TH + 4.9), P(0.15 + i * 0.7, TZ, TH + 4.9)], hacia=V((0, 1, 0)))
    cara('EV', mat, [P(0.15 + i * 0.7, TZ, TH + 3.6), P(0.85 + i * 0.7, TZ, TH + 3.6), P(0.85 + i * 0.7, TZ, TH + 4.9), P(0.15 + i * 0.7, TZ, TH + 4.9)], hacia=V((0, -1, 0)))

# El túnel: la rampa sube del fondo (y = -3) al borde del campo; muros de hormigón
# roto a los lados y la boca negra al fondo, por donde salen.
# Con luz por vértice (EV) y en tramos, que la luz baje en degradado hacia el
# fondo: en el atlas salía negra entera.
TRAMOS = 9
yr = lambda z: -HONDO * (HZ_BORDE - z) / (HZ_BORDE - HZ_FONDO)
zs = [HZ_FONDO + (HZ_BORDE - HZ_FONDO) * i / TRAMOS for i in range(TRAMOS + 1)]
xs = [-HX + 2 * HX * j / 6 for j in range(7)]
for za, zb in zip(zs, zs[1:]):
    for xa, xb in zip(xs, xs[1:]):
        cara('EV', HORMIGON, [P(xa, za, yr(za)), P(xb, za, yr(za)), P(xb, zb, yr(zb)), P(xa, zb, yr(zb))], hacia=ARRIBA, baldosa=3)
    for s in (-1, 1):
        cara('EV', HORMIGON, [P(s * HX, za, yr(za)), P(s * HX, zb, yr(zb)), P(s * HX, zb, 0.0), P(s * HX, za, 0.0)], hacia=V((-s, 0, 0)), baldosa=3)
for xa, xb in zip(xs, xs[1:]):
    cara('EV', HORMIGON, [P(xa, HZ_FONDO, -HONDO), P(xb, HZ_FONDO, -HONDO), P(xb, HZ_FONDO, 0.0), P(xa, HZ_FONDO, 0.0)], hacia=V((0, -1, 0)), baldosa=3)
boca = [(-6.4, -HONDO), (6.4, -HONDO), (6.4, -1.4), (5.2, -0.55), (2.5, -0.25), (-2.5, -0.25), (-5.2, -0.55), (-6.4, -1.4)]
cara('EP', NEGRO, [P(x, HZ_FONDO + 0.02, y) for x, y in boca], hacia=V((0, -1, 0)))
caja('EP', LUZ_ALIEN, -6.6, 6.6, HZ_FONDO + 0.02, HZ_FONDO + 0.12, -0.22, -0.12)             # el resplandor de dentro
# El borde roto: losas levantadas y cascotes a los lados de la zanja.
for _ in range(46):
    s = random.choice((-1, 1))
    x = s * random.uniform(HX + 0.3, HX + 4.5)
    z = random.uniform(HZ_FONDO - 2, HZ_BORDE + 1)
    t = random.uniform(0.3, 1.1)
    cubo('EV', random.choice((LOSA, HORMIGON, SILLAR_OSCURO)), P(x, z, t * 0.25), (t, t * random.uniform(0.6, 1.4), t * 0.45), giro=random.random() * 3)
for _ in range(14):                                                               # y alguna caída dentro
    x = random.uniform(-HX + 0.6, HX - 0.6)
    z = random.uniform(HZ_FONDO + 1, HZ_BORDE - 3)
    y = -HONDO * (HZ_BORDE - z) / (HZ_BORDE - HZ_FONDO)
    t = random.uniform(0.25, 0.6)
    cubo('EV', HORMIGON, P(x, z, y + t * 0.2), (t, t, t * 0.4), giro=random.random() * 3)

comprobar_paso(('E', 'EP', 'S', 'EV'))

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- el Quai Branly, el Sena y el puente de Iéna --------------------------------------------
SENA_Z0, SENA_Z1, SENA_Y = -172.0, -236.0, -4.0
suelo('GN', CALZADA, -220, 220, -168, -150, 0.0, carriles=(-168, 4.5, 'x'))
suelo('G', CALZADA, -1400, 1400, -168, -150, 0.0, carriles=(-168, 4.5, 'x'))
# Lo que se ve bajo el arco jugando (|x| < 160) va en el modelo de juego; el resto, en el vuelo.
for z, hacia in ((SENA_Z0, 1), (SENA_Z1, -1)):
    for (x0, x1, g) in ((-1400, -160, 'C'), (-160, 160, 'E'), (160, 1400, 'C')):
        cara(g, SILLAR_OSCURO, [P(x0, z, SENA_Y - 1), P(x1, z, SENA_Y - 1), P(x1, z, 0), P(x0, z, 0)], hacia=V((0, hacia, 0)), baldosa=4)
suelo('G', ACERA, -1400, 1400, SENA_Z0, -168, 0.0, 4.0)
rect('EP', SENA, -160, 160, SENA_Z1, SENA_Z0, SENA_Y, baldosa=20.0)
rect('CP', SENA, -1400, -160, SENA_Z1, SENA_Z0, SENA_Y, baldosa=20.0)
rect('CP', SENA, 160, 1400, SENA_Z1, SENA_Z0, SENA_Y, baldosa=20.0)
# El puente: tablero y cinco arcos de piedra sobre el agua.
caja('E', SILLAR, -14, 14, SENA_Z1 - 4, SENA_Z0 + 4, 0.0, 0.9, techo=LOSA, tapa_abajo=True, baldosa=4)
for k in range(5):
    zc = SENA_Z0 - 6 - k * 13
    caja('E', SILLAR, -14, 14, zc - 1.6, zc + 1.6, SENA_Y - 1, 0.0, techo=SILLAR, baldosa=4)        # las pilas
for x in (-14.2, 14.2):
    caja('E', SILLAR, x - 0.3, x + 0.3, SENA_Z1 - 4, SENA_Z0 + 4, 0.9, 1.9, baldosa=3)              # los pretiles

# --- el Trocadero: jardines en cuesta, fuentes y el Palacio de Chaillot ----------------------
def alto_troca (z):
    f = min(1.0, max(0.0, (-240 - z) / 90))
    return 26 * f * f * (3 - 2 * f)
filas = []
for i in range(13):
    z = -240 - i * 10
    filas.append([P(x, z, alto_troca(z)) for x in np.linspace(-110, 110, 12)])
malla('E', CESPED, filas, ARRIBA, u_rep=20, v_rep=10)                           # se ve bajo el arco
# La escalinata central de piedra, de la orilla a la terraza, y los bosquetes a los lados.
filas = [[P(x, z, alto_troca(z) + 0.08) for x in (-18.0, 18.0)] for z in np.arange(-240.0, -341.0, -10.0)]
malla('E', LOSA, filas, ARRIBA, u_rep=6, v_rep=20)
for s_ in (-1, 1):
    for z in np.arange(-250.0, -335.0, -9.0):
        for x in np.arange(32.0, 100.0, 11.0):
            arbol('T', TRONCO, HOJAS, s_ * x + random.uniform(-2, 2), z + random.uniform(-2, 2), 1.3, y=alto_troca(z))
for k in range(6):                                                                # los estanques de Varsovia, escalonados
    z = -250 - k * 9
    rect('EP', SENA, -10, 10, z - 6, z, alto_troca(z) + 0.15, baldosa=8.0)
y_pal = alto_troca(-340)
suelo('GN', LOSA, -130, 130, -420, -340, y_pal, 4.0)
caja('C', SILLAR_OSCURO, -130, 130, -420, -340, 0.0, y_pal - 0.05, baldosa=6)      # la terraza, maciza: que no flote
for s in (-1, 1):                                                                 # las dos alas curvas
    pts = []
    for i in range(10):
        a = math.radians(-10 + i * 9.5)
        pts.append((s * (24 + 110 * math.sin(a)), -332 - 70 * (1 - math.cos(a))))
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        prisma('E', SILLAR, [(ax, az), (bx, bz), (bx, bz - 18), (ax, az - 18)], y_pal, y_pal + 20, techo=AZOTEA)
    caja('E', SILLAR, s * 22 - 6, s * 22 + 6, -352, -330, y_pal, y_pal + 22, techo=AZOTEA)        # los pabellones

# --- la École Militaire, a la espalda -----------------------------------------------------------
caja('C', SILLAR, -90, 90, 165, 190, 0.0, 16.0, techo=AZOTEA)
tejado('C', PIZARRA, -90, 90, 165, 190, 16.0, 4.0)
caja('C', SILLAR, -14, 14, 160, 190, 0.0, 22.0, techo=AZOTEA)
filas = [[P(9 * math.cos(2 * math.pi * j / 16) * math.cos(math.pi / 2 * i / 5), 175 + 9 * math.sin(2 * math.pi * j / 16) * math.cos(math.pi / 2 * i / 5), 22 + 7 * math.sin(math.pi / 2 * i / 5)) for j in range(17)] for i in range(6)]
malla('C', PIZARRA, filas, ARRIBA, u_rep=4, v_rep=2)

# --- los Inválidos: la cúpula dorada ---------------------------------------------------------------
IX, IZ = 330.0, 120.0
caja('C', SILLAR, IX - 40, IX + 40, IZ - 30, IZ + 30, 0.0, 18.0, techo=AZOTEA)
prisma('C', SILLAR, [(IX + 14 * math.cos(2 * math.pi * i / 16), IZ + 14 * math.sin(2 * math.pi * i / 16)) for i in range(16)], 18.0, 34.0, techo=SILLAR)
filas = [[P(IX + 14 * math.cos(2 * math.pi * j / 20) * math.cos(math.pi / 2 * i / 6), IZ + 14 * math.sin(2 * math.pi * j / 20) * math.cos(math.pi / 2 * i / 6), 34 + 18 * math.sin(math.pi / 2 * i / 6)) for j in range(21)] for i in range(7)]
malla('C', ORO, filas, ARRIBA, u_rep=6, v_rep=2)
barra('T', ORO, P(IX, IZ, 52), P(IX, IZ, 60), 1.2)
# La torre Montparnasse, oscura, al sur.
caja('C', OSCURO, -260, -220, 640, 690, 0.0, 120.0, techo=AZOTEA, baldosa=8)

# --- la ciudad: manzanas haussmannianas con tejado de zinc ----------------------------------------
PASO = 50.0
n_ed = 0
for x in np.arange(-1350.0, 1350.0, PASO):
    for z in np.arange(-1450.0, 1350.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if abs(cx) < 64 and -160 < cz < 200:                                    # el Campo de Marte
            continue
        if -245 < cz < -145:                                                      # el Sena y sus muelles
            continue
        if abs(cx) < 140 and -430 < cz < -240:                                    # el Trocadero
            continue
        if math.hypot(cx - IX, cz - IZ) < 60 or (-280 < cx < -200 and 620 < cz < 710):
            continue
        dist = math.hypot(cx, cz + 60)
        if dist > 1350 or (dist > 850 and random.random() < 0.4):
            continue
        partes = 2 if dist < 420 else 1
        for k in range(partes):
            a0 = x + 6 + (PASO - 12) * k / partes
            a1 = x + 6 + (PASO - 12) * (k + 1) / partes
            haussmann('C' if dist < 330 else 'T', a0, a1 - 1.0, z + 6, z + PASO - 6, random.choice([5, 6, 6, 7]))
            n_ed += 1
for x in np.arange(-1350.0, 1350.0, PASO):                                      # las calles
    if abs(x) > 60:
        suelo('G', CALZADA, x - 6, x + 6, -168, 1400, 0.0, carriles=(x - 6, 6.0, 'z'))
        suelo('G', CALZADA, x - 6, x + 6, -1500, SENA_Z1, 0.0, carriles=(x - 6, 6.0, 'z'))
# Lo que quede, acera, menos el Sena (que va cuatro metros más abajo: tapado por
# la acera salía una franja negra en el vuelo).
suelo('G', ACERA, -1400, 1400, SENA_Z0, 1400, -0.03, 6.0)
suelo('G', ACERA, -1400, 1400, -1500, SENA_Z1, -0.03, 6.0)
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3200.0, 0.0, -60.0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-campo', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'TV': ('vert-torre', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-paris', ['S', 'E', 'GN', 'EV', 'TV', 'EP']), ('lugar-paris-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.96, 0.88), sol_fuerza=3.5, cielo_fuerza=0.6, cielo_altura=45, cielo_giro=40,
    escala=0.45, satura=0.8, no_alumbran=('CP',))
