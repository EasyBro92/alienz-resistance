# Roma: dentro del Coliseo, como está hoy, hecho en Blender (06/10/2026).
#   blender -b -P herramientas/blender/lugar_roma.py              (entero)
#   blender -b -P herramientas/blender/lugar_roma.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_roma.py -- --reusar  (retocar la luz)
#
# Isidro pidió para Italia «lo mismo que en los de España y Francia» y eligió para
# Roma: se juega DENTRO DEL COLISEO, COMO ESTÁ HOY (en ruinas, con el sótano al
# aire), los alienz SALEN DEL PROPIO COLISEO, DE DÍA y llegada larga. Misma receta
# que Madrid, Valencia, Marsella y Lyon (horneado.py).
#
# Cómo es de verdad: una elipse de 188 × 156 m y 48 de alto, con la arena de
# 83 × 48 en el centro. Hoy la arena no tiene suelo: se ve el hipogeo, los muros
# de ladrillo de los pasillos y jaulas de debajo, y solo un extremo lleva una
# tarima de madera reconstruida. De las gradas quedan las bóvedas y los muros
# radiales de ladrillo, escalonados. El anillo de fuera, de travertino con sus
# tres pisos de arcos y el ático, solo sigue en pie en medio perímetro; en el
# otro medio se cayó y lo que se ve es el anillo interior, más bajo.
#
# Aquí el eje largo va a lo largo del campo:
#   · se juega sobre una TARIMA de madera que cruza la arena de punta a punta, con
#     el hipogeo abierto a los dos lados;
#   · a la IZQUIERDA y al FONDO, el muro exterior entero, con sus cuatro pisos;
#   · a la DERECHA, la mitad caída: solo el anillo interior, por donde entra el sol;
#   · al FONDO, en el eje, la puerta por la que salían los gladiadores: de su
#     túnel salen los alienz (`entrada` en la misión);
#   · a la ESPALDA, la brecha: ruinas bajas por las que entra la cámara.
# La base alien va sobre un tambor de piedra dentro del hipogeo, a la izquierda.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

Z0 = -22.0                              # el centro de la arena
SOL = (0.55, 0.72, -0.25)               # de día: por encima de la mitad caída (la derecha)
iniciar('roma', 1753, eje=(0.0, Z0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
TRAVERTINO = (0.83, 0.77, 0.66)

def sillares (h, w, color, hilada=20):
    a = lienzo(h, w, color) + ruido(h, w, 0.09)[..., None]
    for y in range(0, h, hilada):
        a[y:y + 1] *= 0.8
        for x in range((y // hilada % 2) * 16, w, 32):
            a[y:y + hilada, x:x + 1] *= 0.86
    return a

def tex_arcos ():
    """Un piso del Coliseo: el arco entre dos semicolumnas, con su cornisa. Un vano por baldosa."""
    a = sillares(128, 128, TRAVERTINO)
    yy, xx = np.mgrid[0:128, 0:128]
    arco = ((xx - 64) ** 2 + (yy - 68) ** 2 < 30 ** 2) | ((np.abs(xx - 64) < 30) & (yy >= 68))
    rosca = ((xx - 64) ** 2 + (yy - 68) ** 2 < 36 ** 2) & (yy < 68) & ~arco
    a[rosca] *= 1.08
    hueco = np.linspace(0.07, 0.2, 128, dtype=np.float32)[:, None, None] * np.array((1.0, 0.9, 0.8))
    a[arco] = np.broadcast_to(hueco, (128, 128, 3))[arco]
    for x0 in (0, 114):                              # las semicolumnas, con su luz y su sombra
        a[14:, x0:x0 + 14] = np.array(TRAVERTINO) * np.linspace(1.12, 0.78, 14, dtype=np.float32)[None, :, None]
        a[14:22, x0:x0 + 14] *= 1.08
    a[0:6] = np.array(TRAVERTINO) * 1.12             # la cornisa
    a[6:13] = np.array(TRAVERTINO) * 0.68
    a[122:128] *= 0.8
    return guardar('arcos', a, 88)

def tex_atico ():
    """El ático: paño liso con pilastras, una ventana cada dos vanos y las ménsulas arriba."""
    a = sillares(128, 256, TRAVERTINO, 18)
    for x0 in (0, 122, 128, 250):
        a[:, x0:x0 + 6] = np.array(TRAVERTINO) * 1.06
    a[52:84, 48:80] = (0.1, 0.09, 0.08)
    a[0:6] = np.array(TRAVERTINO) * 1.12
    for x in range(8, 256, 21):
        a[10:22, x:x + 7] = np.array(TRAVERTINO) * 0.6
    return guardar('atico', a, 88)

def tex_cavea ():
    """Lo que queda de las gradas: ladrillo, los muros radiales y las bocas de las bóvedas."""
    base = np.array((0.64, 0.47, 0.36))
    a = lienzo(128, 128, base) + ruido(128, 128, 0.16)[..., None]
    for y in range(0, 128, 6):
        a[y:y + 1] *= 0.86
    for x0 in (0, 64):                               # el muro radial y la sombra de su hueco
        a[:, x0:x0 + 9] = base * 1.18 + ruido(128, 9, 0.08)[..., None]
        a[:, x0 + 9:x0 + 15] *= 0.6
    for y0 in (26, 90):                              # las bocas de las bóvedas
        a[y0:y0 + 22, 24:54] = (0.13, 0.1, 0.09)
        a[y0 - 3:y0, 22:56] = base * 1.15
    return guardar('cavea', a, 86)

def tex_podio ():
    a = sillares(128, 128, (0.8, 0.74, 0.65), 22)
    a[40:128, 44:84] = (0.16, 0.13, 0.11)            # la boca de un pasadizo
    a[34:40, 40:88] = np.array((0.8, 0.74, 0.65)) * 1.1
    a[0:6] = np.array((0.8, 0.74, 0.65)) * 1.12
    return guardar('podio', a, 86)

def tex_tablas ():
    a = lienzo(256, 256, (0.6, 0.47, 0.32)) + ruido(256, 256, 0.1)[..., None]
    for x in range(0, 256, 32):                      # las tablas, a lo largo del campo
        a[:, x:x + 2] *= 0.62
        a[:, x + 2:x + 32] *= 0.9 + 0.2 * random.random()
        for _ in range(3):
            y = random.randrange(256)
            a[y:y + 2, x + 2:x + 32] *= 0.7
    return guardar('tablas', a)

ARCOS = material('arcos', tex_arcos(), rug=0.9)
ATICO = material('atico', tex_atico(), rug=0.9)
CAVEA = material('cavea', tex_cavea(), rug=0.95)
PODIO = material('podio', tex_podio(), rug=0.9)
TABLAS = material('tablas', tex_tablas(), rug=0.85)
PIEDRA = material('travertino', de_polyhaven('sandstone_blocks_08', 512, 0xd4c5a8), rug=0.9)
LADRILLO = material('ladrillo', de_polyhaven('castle_wall_varriation', 512, 0xa9714f), rug=0.95)
LADRILLO_OSC = material('ladrillo-oscuro', imagen_de(LADRILLO), tinte=0xb9a595, rug=0.95)
TIERRA = material('tierra', de_polyhaven('sparse_grass', 512, 0xa8926e), rug=1.0)
ADOQUIN = material('adoquin', de_polyhaven('cobblestone_floor_04', 512, 0x77736d), rug=0.9)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xaaa39a), rug=0.9)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x6a8540), rug=1.0)
MARMOL = material('marmol', de_polyhaven('sandstone_blocks_08', 512, 0xf2efe8), rug=0.7)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xb0633e, contraste=0.9), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.6, 0.5, 0.42)))
NEGRO = material('negro', color=(0.03, 0.03, 0.035))
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRONCE = material('bronce', color=(0.2, 0.32, 0.26), rug=0.6)
# Roma es ocre, naranja y siena, con postigos verdes y marrones.
PALETA = [((0.9, 0.68, 0.42), (0.3, 0.36, 0.26)), ((0.88, 0.56, 0.36), (0.36, 0.28, 0.2)), ((0.93, 0.8, 0.56), (0.28, 0.38, 0.3)),
          ((0.8, 0.46, 0.32), (0.86, 0.8, 0.68)), ((0.9, 0.84, 0.7), (0.4, 0.3, 0.22))]
FACHADAS = [material(f'f-roma-{i}', tex_postigos(f'roma-{i}', b, p)) for i, (b, p) in enumerate(PALETA)]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.13, 0.27, 0.12), (0.17, 0.32, 0.14), (0.21, 0.36, 0.15)])]
TRONCO = material('tronco', color=(0.38, 0.28, 0.2))
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.84, 0.9, 0.95)), (0.07, (0.74, 0.85, 0.96)), (0.25, (0.46, 0.69, 0.94)), (0.6, (0.24, 0.5, 0.88)), (1.0, (0.13, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.6, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.16), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL COLISEO
# ==================================================================================
config_suelo(-1400, 1400, -1400, 1400, (-300, 300), (-320, 300))
# El hipogeo, poco hondo y con pocos muros anchos: con seis metros y pasillos
# estrechos no entraba el sol y jugando se veía un foso negro a cada lado.
HONDO = -3.4
N = 160                                  # dos tramos por cada uno de los 80 arcos
T = [-math.pi + 2 * math.pi * i / N for i in range(N)]      # -π/2 = el fondo, +π/2 = la espalda
def anillo (rx, rz):
    return [(rx * math.cos(t), Z0 + rz * math.sin(t)) for t in T]
R0, R1, R2, R3, R4, R5 = anillo(24, 41.5), anillo(30, 47.5), anillo(40, 57.5), anillo(50, 67.5), anillo(58, 75), anillo(78, 94)

def desgaste (t, k=1.0):
    return k * (0.5 * math.sin(t * 13 + 1.3) + 0.3 * math.sin(t * 29 + 0.4) + 0.2 * math.sin(t * 53))
# La brecha de la espalda: ruinas bajas, por donde entra la cámara.
def techo_ruina (t):
    d = abs(t - 0.48 * math.pi)
    return 7.0 + 1.6 * desgaste(t) + 90.0 * sm_(0.14 * math.pi, 0.2 * math.pi, d)
def sm_ (a, b, x):
    f = max(0.0, min(1.0, (x - a) / (b - a)))
    return f * f * (3 - 2 * f)
# Dónde sigue en pie el muro de fuera: la izquierda y el fondo.
def en_pie (t):
    return sm_(0.62 * math.pi, 0.68 * math.pi, t) if t > 0 else sm_(-0.26 * math.pi, -0.32 * math.pi, t)

CAP = [techo_ruina(t) for t in T]
PIE = [en_pie(t) for t in T]
H1A = [min(6.5, c) for c in CAP];        H1B = [min(9.5, c + 1.0) for c in CAP]
H2A = [min(15.5, c + 2.0) for c in CAP]; H2B = [min(19.0, c + 2.5) for c in CAP]
H3A = [min(26.0, c + 3.0) for c in CAP]; H3B = [min(30.0, c + 3.5) for c in CAP]
H3T = [h + 0.5 for h in H3B]
H4 = [min(33.5 + 4.5 * p + 1.6 * desgaste(t) * (1 - p), c + 4.5) for t, p, c in zip(T, PIE, CAP)]
H5 = [48.5 * p for p in PIE]
CERO = [0.0] * N

# La puerta del fondo: los anillos de abajo se abren para dejar pasar el túnel.
PUERTA = 8.6
def en_la_puerta (pts, i):
    j = (i + 1) % N
    return (pts[i][1] + pts[j][1]) / 2 < Z0 and abs(pts[i][0] + pts[j][0]) / 2 < PUERTA

def pared (grupo, mat, pts, ya, yb, hacia, vanos=80.0, base=0.0, alto_v=11.5, hueco=False, solo=None):
    """Un muro que sigue un anillo, entre dos alturas que cambian a lo largo. La
    textura va por vanos a lo ancho y por METROS a lo alto: donde el muro está
    roto, el arco se corta, no se aplasta."""
    for i in range(N):
        j = (i + 1) % N
        if (hueco and en_la_puerta(pts, i)) or (solo and not solo(i)):
            continue
        if yb[i] - ya[i] < 0.08 and yb[j] - ya[j] < 0.08:
            continue
        u0, u1 = i / N * vanos, (i + 1) / N * vanos
        cara(grupo, mat, [P(pts[i][0], pts[i][1], ya[i]), P(pts[j][0], pts[j][1], ya[j]), P(pts[j][0], pts[j][1], yb[j]), P(pts[i][0], pts[i][1], yb[i])],
             uvs=[(u0, (ya[i] - base) / alto_v), (u1, (ya[j] - base) / alto_v), (u1, (yb[j] - base) / alto_v), (u0, (yb[i] - base) / alto_v)], hacia=hacia)

def rampa (grupo, mat, A, ya, B, yb, vanos=80.0, hueco=False, solo=None):
    """La superficie entre dos anillos: una grada, una terraza, un tejado."""
    for i in range(N):
        j = (i + 1) % N
        if (hueco and en_la_puerta(A, i)) or (solo and not solo(i)):
            continue
        u0, u1 = i / N * vanos, (i + 1) / N * vanos
        cara(grupo, mat, [P(A[i][0], A[i][1], ya[i]), P(A[j][0], A[j][1], ya[j]), P(B[j][0], B[j][1], yb[j]), P(B[i][0], B[i][1], yb[i])],
             uvs=[(u0, 0), (u1, 0), (u1, 1), (u0, 1)], hacia=ARRIBA)

# --- por dentro: el podio, las tres gradas en ruinas y el anillo interior ------------------
pared('E', LADRILLO, R0, [HONDO] * N, CERO, 'dentro', vanos=60, base=HONDO, alto_v=-HONDO)          # el muro del hipogeo
pared('E', PODIO, R0, CERO, [3.6] * N, 'dentro', vanos=40, alto_v=3.6, hueco=True)
rampa('E', CAVEA, R0, [3.6] * N, R1, H1A, hueco=True)
pared('E', PODIO, R1, H1A, H1B, 'dentro', vanos=80, base=6.5, alto_v=3.0, hueco=True)
rampa('E', CAVEA, R1, H1B, R2, H2A, hueco=True)
pared('E', ARCOS, R2, H2A, H2B, 'dentro', base=15.5, alto_v=3.5)
rampa('E', CAVEA, R2, H2B, R3, H3A)
pared('E', ARCOS, R3, H3A, H3B, 'dentro', base=26.0, alto_v=4.0)
rampa('E', LADRILLO_OSC, R3, H3B, R4, H3T, vanos=40)
pared('E', ARCOS, R4, H3T, H4, 'dentro', base=30.5, alto_v=7.5)
# Donde el muro de fuera sigue en pie: la galería de arriba y su cara interior.
arriba = lambda i: PIE[i] > 0.5 or PIE[(i + 1) % N] > 0.5
rampa('E', LADRILLO_OSC, R4, H4, R5, H4, vanos=40, solo=arriba)
pared('E', ATICO, R5, H4, H5, 'dentro', vanos=40, base=33.5, alto_v=15.0, solo=arriba)

# --- por fuera: tres pisos de arcos y el ático; en la mitad caída, el anillo interior ---------
PISOS = [(0.0, 10.5), (10.5, 22.0), (22.0, 33.5)]
for (y0, y1) in PISOS:
    pared('C', ARCOS, R5, [min(y0, h) for h in H5], [min(y1, h) for h in H5], 'fuera', base=y0, alto_v=y1 - y0)
    pared('C', ARCOS, R4, [min(y0, h) for h in H4], [min(y1, h) for h in H4], 'fuera', base=y0, alto_v=y1 - y0,
          solo=lambda i: PIE[i] < 0.98 or PIE[(i + 1) % N] < 0.98)
pared('C', ATICO, R5, [min(33.5, h) for h in H5], H5, 'fuera', vanos=40, base=33.5, alto_v=15.0)
pared('C', ARCOS, R4, [min(33.5, h) for h in H4], H4, 'fuera', base=33.5, alto_v=11.5, solo=lambda i: PIE[i] < 0.98)
rampa('C', LADRILLO_OSC, R5, H5, anillo(79.2, 95.2), H5, vanos=40, solo=arriba)                  # el canto del muro

# --- la puerta del fondo y su túnel: de aquí salen ------------------------------------------
ZP = Z0 - 41.5                           # donde la arena toca el podio: -63.5
caja('E', PIEDRA, -9.6, -6.0, -98, ZP + 0.6, 0.0, 10.5, baldosa=4)
caja('E', PIEDRA, 6.0, 9.6, -98, ZP + 0.6, 0.0, 10.5, baldosa=4)
caja('E', PIEDRA, -6.0, 6.0, -98, ZP + 0.6, 7.0, 10.5, baldosa=4, tapa_abajo=True)
cara('EP', NEGRO, [P(-6, -98, 0.0), P(6, -98, 0.0), P(6, -98, 7.0), P(-6, -98, 7.0)], hacia=V((0, -1, 0)))      # el fondo, a oscuras
for x in (-5.9, 5.9):                                                                              # y el resplandor de lo que hay dentro
    cara('EP', VERDE, [P(x, -96, 0.3), P(x, -84, 0.3), P(x, -84, 0.55), P(x, -96, 0.55)], hacia=V((-x, 0, 0)))
for k in range(9):                                                                                 # las dovelas del arco
    a = math.pi * k / 8
    cubo('EV', PIEDRA, P(6.6 * math.cos(a), ZP + 0.75, 7.0 + 1.5 * math.sin(a) * 0.0 + 0.9), (1.5, 0.5, 1.7))

# --- el hipogeo: los muros de los pasillos de debajo, al aire ---------------------------------
suelo('GN', TIERRA, -24, 24, Z0 - 41.5, Z0 + 41.5, HONDO, 6.0)
BASE = (-13.5, -44.0)
def largo_en (x, margen=1.2):
    return 41.5 * math.sqrt(max(0.0, 1 - (x / (24 - margen)) ** 2))
for x in (9.3, 12.6, 16.4, 20.2):
    for lado in (-1, 1):
        d = largo_en(x)
        if d < 3:
            continue
        tramos = [(Z0 - d, Z0 + d)]
        if lado < 0 and abs(-x - BASE[0]) < 6.5:        # el tambor de la base parte los muros
            tramos = [(Z0 - d, BASE[1] - 6.2), (BASE[1] + 6.2, Z0 + d)]
        for (a, b) in tramos:
            if b - a > 1:
                caja('EV', LADRILLO, lado * x - 0.6, lado * x + 0.6, a, b, HONDO, -0.3 if x > 10 else -0.12, baldosa=4)
for z in np.arange(Z0 - 36, Z0 + 37, 12.0):                                                        # los muros de través
    for lado in (-1, 1):
        ancho = 24 * math.sqrt(max(0.0, 1 - ((z - Z0) / 41.5) ** 2)) - 1.0
        if ancho < 10.5 or (lado < 0 and abs(z - BASE[1]) < 7):
            continue
        caja('EV', LADRILLO, lado * 9.9, lado * ancho, z - 0.5, z + 0.5, HONDO, -0.9, baldosa=4)
# El tambor de piedra de la base alien, que sube del hipogeo.
tambor = [(BASE[0] + 5.2 * math.cos(2 * math.pi * i / 20), BASE[1] + 5.2 * math.sin(2 * math.pi * i / 20)) for i in range(20)]
prisma('E', PIEDRA, tambor, HONDO, 0.0, techo=PIEDRA, baldosa=4)

# --- la tarima: madera de punta a punta, y la plataforma ancha de la espalda --------------------
rect('S', TABLAS, -8.9, 8.9, -98, Z0 + 26, 0.0, baldosa=3.2)
plataforma = [(-8.9, Z0 + 26)] + [(23.2 * math.cos(t), Z0 + 40.6 * math.sin(t)) for t in np.linspace(math.radians(140), math.radians(40), 15)] + [(8.9, Z0 + 26)]
cara('S', TABLAS, [P(x, z, 0.0) for x, z in plataforma], hacia=ARRIBA, baldosa=3.2)
cara('S', TABLAS, [P(x, z, 0.02) for x, z in tambor], hacia=ARRIBA, baldosa=6.0)
for x in (-8.9, 8.9):                                                                             # el canto de la tarima
    caja('E', LADRILLO_OSC, x - 0.12, x + 0.12, ZP, Z0 + 26, -0.5, -0.02, baldosa=3)

comprobar_paso(('E', 'EP', 'S', 'EV'), z_lejos=-62)

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- la plaza de adoquín y el césped alrededor ------------------------------------------------
# El suelo de fuera lleva un HUECO donde está la arena (queda debajo de las
# gradas): de una pieza, en el vuelo tapaba la tarima y el hipogeo con adoquín.
def con_hueco (mat, x0, x1, z0, z1, y, baldosa):
    hx, hz0, hz1 = 24.0, Z0 - 41.5, Z0 + 41.5
    suelo('G', mat, x0, -hx, z0, z1, y, baldosa)
    suelo('G', mat, hx, x1, z0, z1, y, baldosa)
    suelo('G', mat, -hx, hx, z0, hz0, y, baldosa)
    suelo('G', mat, -hx, hx, hz1, z1, y, baldosa)
con_hueco(ACERA, -1400, 1400, -1400, 1400, 0.0, 8.0)
con_hueco(ADOQUIN, -150, 150, -190, 150, 0.02, 5.0)
suelo('G', CESPED, 105, 330, -300, 200, 0.03, 8.0)                    # el Colle Oppio, a la derecha
suelo('G', CESPED, -420, -150, 60, 420, 0.03, 8.0)                    # el Palatino, a la izquierda y a la espalda
suelo('G', CALZADA, -520, -90, -205, -170, 0.04, carriles=(-205, 5.8, 'x'))     # Via dei Fori Imperiali

# --- el Arco de Constantino ---------------------------------------------------------------------
AX, AZ = -104.0, 62.0
caja('C', MARMOL, AX - 3.7, AX + 3.7, AZ - 13, AZ + 13, 0.0, 21.0, techo=MARMOL, baldosa=5)
for z, w, h in ((AZ, 3.3, 11.5), (AZ - 8, 1.8, 7.4), (AZ + 8, 1.8, 7.4)):
    for x, d in ((AX - 3.75, -1), (AX + 3.75, 1)):
        cara('CP', NEGRO, [P(x, z - w, 0.0), P(x, z + w, 0.0)] + [P(x, z + w * math.cos(a), h - w + w * math.sin(a)) for a in np.linspace(0, math.pi, 9)], hacia=V((d, 0, 0)))
for z in (AZ - 12, AZ - 4.6, AZ + 4.6, AZ + 12):
    for x in (AX - 4.3, AX + 4.3):
        barra('T', MARMOL, P(x, z, 0.0), P(x, z, 14.5), 0.9)

# --- el Foro y el Palatino: columnas sueltas, muros de ladrillo y pinos --------------------------
for _ in range(46):
    x, z = random.uniform(-520, -170), random.uniform(-150, 40)
    if random.random() < 0.5:
        n = random.choice([3, 4, 6])
        for k in range(n):
            barra('T', MARMOL, P(x + k * 3.2, z, 0.0), P(x + k * 3.2, z, 11.0), 1.0)
        caja('T', MARMOL, x - 0.8, x + (n - 1) * 3.2 + 0.8, z - 0.8, z + 0.8, 11.0, 12.6, baldosa=3)
    else:
        w = random.uniform(8, 22)
        caja('T', LADRILLO, x, x + w, z, z + random.uniform(3, 12), 0.0, random.uniform(3, 14), baldosa=4)
def colina (x, z):
    f = sm_(-150, -260, x) * sm_(40, 130, z)
    return 38.0 * f
filas = []
for i in range(14):
    z = 20 + i * 34
    filas.append([P(x, z, colina(x, z)) for x in np.linspace(-520, -140, 16)])
malla('T', CESPED, filas, ARRIBA, u_rep=10, v_rep=12)
for _ in range(260):                                                   # los pinos piñoneros
    x, z = random.uniform(-510, -150), random.uniform(30, 440)
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.4, 2.2), y=colina(x, z) - 0.4)
for _ in range(34):
    x, z = random.uniform(-470, -190), random.uniform(120, 380)
    y = colina(x, z)
    caja('T', LADRILLO, x, x + random.uniform(10, 28), z, z + random.uniform(8, 20), y - 2, y + random.uniform(5, 16), baldosa=4)
for _ in range(150):                                                   # el parque del Colle Oppio
    arbol('T', TRONCO, HOJAS, random.uniform(110, 325), random.uniform(-295, 195), random.uniform(1.2, 2.0))

# --- el Vittoriano, blanco, al final de la avenida -----------------------------------------------
VX, VZ = -640.0, -190.0
caja('C', MARMOL, VX - 60, VX, VZ - 65, VZ + 65, 0.0, 22.0, techo=MARMOL, baldosa=6)
caja('C', MARMOL, VX - 50, VX - 16, VZ - 58, VZ + 58, 22.0, 46.0, techo=MARMOL, baldosa=6)
for z in np.arange(VZ - 54, VZ + 55, 6.0):
    barra('T', MARMOL, P(VX - 14, z, 22.0), P(VX - 14, z, 44.0), 1.7)
for z in (VZ - 60, VZ + 60):
    cubo('T', BRONCE, P(VX - 32, z, 51.0), (9.0, 6.0, 9.0))

# --- la ciudad: manzanas ocres con tejado de teja ------------------------------------------------
PASO = 48.0
n_ed = 0
for x in np.arange(-1350.0, 1350.0, PASO):
    for z in np.arange(-1350.0, 1350.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if math.hypot(cx, (cz - Z0) * 0.85) < 190:              # la plaza del Coliseo
            continue
        if -545 < cx < -130 and -215 < cz < 440:                # el Foro, el Palatino y la avenida
            continue
        if 95 < cx < 340 and -310 < cz < 210:                   # el Colle Oppio
            continue
        if VX - 80 < cx < VX + 20 and VZ - 85 < cz < VZ + 85:
            continue
        if random.random() < 0.07:
            continue
        cerca = math.hypot(cx, cz - Z0) < 420
        alto = random.choice([15, 18, 18, 21])
        caja('C' if cerca else 'T', random.choice(FACHADAS), x + 6, x + PASO - 6, z + 6, z + PASO - 6, 0.0, alto, techo=AZOTEA)
        if cerca:
            tejado('C', TEJA, x + 6, x + PASO - 6, z + 6, z + PASO - 6, alto, 2.4)
        n_ed += 1
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3000.0, 0.0, Z0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-tarima', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-roma', ['S', 'E', 'GN', 'EV', 'EP']), ('lugar-roma-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.86), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=50, cielo_giro=150,
    escala=0.42, satura=0.8, no_alumbran=('CP',))
