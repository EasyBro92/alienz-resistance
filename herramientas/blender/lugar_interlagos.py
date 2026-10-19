# São Paulo: la recta de meta de Interlagos, al atardecer (20/10/2026).
#   blender -b -P herramientas/blender/lugar_interlagos.py              (entero)
#   blender -b -P herramientas/blender/lugar_interlagos.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_interlagos.py -- --reusar  (retocar la luz)
#
# Era el último de los tres tramos que seguían hechos de piezas (`circuito` en
# escenarios.js). Isidro eligió (20/10): EN EL CIRCUITO, como antes pero hecho de
# verdad; los alienz ANDANDO POR LA PISTA desde el fondo (saliendo de la calima
# de la ciudad), AL ATARDECER y llegada LARGA.
#
# Cómo está puesto. Se mira recta abajo, hacia la S de Senna:
#   · la pista de cuatro carriles: el muro de boxes cierra el de la derecha (como
#     antes); la parrilla pintada, la línea de meta a cuadros y, encima, el
#     pórtico del semáforo de salida (alto: por debajo pasa la línea de visión a
#     la antena de la base);
#   · a la izquierda, el piano rojo y blanco, la hierba, la grava con un coche de
#     carreras quemado, el muro de neumáticos, la valla con sus carteles y la
#     tribuna de colores; la base alien, en la escapatoria;
#   · a la derecha, el muro de boxes, el carril de boxes y los garajes abiertos,
#     con los salones acristalados encima;
#   · solo en el vuelo: el trazado entero, el lago y la ciudad hasta el horizonte.
#   · EL SOL va bajo y A LA ESPALDA: de lado, la tribuna o los boxes dejaban la
#     pista entera en sombra.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.15, 0.3, 0.94)                 # sol de tarde, bajo y casi a la espalda: la recta, de frente a la luz
iniciar('interlagos', 4311, eje=(0.0, -80.0), encendidas=0.1, reflejo=(0.3, 0.2, 0.14))

PISTA_I, PISTA_D = -7.0, 4.65            # bordes de la pista; el muro de boxes, de 4,65 a 5,15
MURO_X0, MURO_X1 = 4.65, 5.15
BOX_X = 13.0                             # la cara de los garajes
TRIB_X = -32.0                           # el pie de la tribuna
BASE = (-14.0, -44.0)
Z_META = -8.0

H.LETRAS.update({
    'B': ['11110', '10001', '11110', '10001', '11110'], 'R': ['11110', '10001', '11110', '10100', '10011'],
    'G': ['01111', '10000', '10011', '10001', '01111'], 'S': ['01111', '10000', '01110', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100'], 'O': ['01110', '10001', '10001', '10001', '01110'],
    'U': ['10001', '10001', '10001', '10001', '01110'], 'P': ['11110', '10001', '11110', '10000', '10000'],
    'C': ['01111', '10000', '10000', '10000', '01111'], 'D': ['11110', '10001', '10001', '10001', '11110'],
})
def rotulo (a, texto, y0, px, color):
    x0 = max(0, (a.shape[1] - len(texto) * 6 * px) // 2)
    escribir(a, texto, x0, y0, px, color)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -28.0, BOX_X, -64.0, 12.0
PW, PH_ = 1024, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """De la grava a los garajes, de una pieza: grava, hierba, piano, el asfalto de
    la pista con las gomas y la parrilla, el carril de boxes con su raya."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    asfalto = tejar(foto('asphalt_02', 256, 0x3c3c3e, 0.7))
    grava = tejar(foto('gravel_stones', 256, 0xa89c88, 0.7))
    hierba = tejar(foto('sparse_grass', 256, 0x4f6a2e, 0.7))
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :].repeat(PH_, 0)
    a = np.where((xs < -12.0)[..., None], grava, np.where((xs < -8.5)[..., None], hierba, asfalto))
    # El piano, rojo y blanco a franjas de 2,4 m.
    yy = np.arange(PH_, dtype=np.float32)[:, None].repeat(PW, 1)
    zs = PZ0 + yy / KZ
    piano = (xs >= -8.5) & (xs < PISTA_I)
    franja = ((zs // 2.4) % 2 == 0)
    a[piano & franja] = (0.62, 0.06, 0.05)
    a[piano & ~franja] = (0.78, 0.77, 0.74)
    # Las gomas: las rodadas oscuras de las salidas, en las trazadas.
    for x in (-3.6, -1.2, 1.4):
        c, _ = a_px(x, 0)
        a[:, c - 9:c + 9] *= (0.55 + 0.3 * nube(PH_, 18, 40, 2))[..., None]
    # La parrilla: los huecos pintados, de dos en dos, al tresbolillo.
    for k in range(10):
        x = -4.0 if k % 2 else 1.6
        z = Z_META + 4.0 + k * 4.0
        if z > PZ1 - 1:
            break
        c0, f0 = a_px(x - 1.0, z); c1, _ = a_px(x + 1.0, z)
        a[f0 - 3:f0 + 3, c0:c1] = (0.85, 0.85, 0.82)
        a[f0:min(PH_, f0 + int(1.6 * KZ)), c0:c0 + 5] = (0.85, 0.85, 0.82)
        a[f0:min(PH_, f0 + int(1.6 * KZ)), c1 - 5:c1] = (0.85, 0.85, 0.82)
    # La línea de meta a cuadros.
    _, f0 = a_px(0, Z_META - 0.6); _, f1 = a_px(0, Z_META + 0.6)
    c0, _ = a_px(PISTA_I, 0); c1, _ = a_px(PISTA_D, 0)
    cuad = max(4, (f1 - f0) // 2)
    for f in range(f0, f1):
        for c in range(c0, c1):
            a[f, c] = (0.9, 0.9, 0.88) if ((f - f0) // cuad + (c - c0) // cuad) % 2 == 0 else (0.03, 0.03, 0.03)
    # El carril de boxes: su raya blanca y el límite de velocidad.
    c, _ = a_px(MURO_X1 + 0.6, 0)
    a[:, c - 3:c + 3] = (0.82, 0.82, 0.8)
    a *= (0.85 + 0.25 * nube(PH_, PW, 14, 6))[..., None]
    def mancha (x, z, r_, k):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-2.0, -20.0, 1.6), (2.0, -40.0, 1.8), (-4.4, -55.0, 1.4), (-18.0, -30.0, 2.4)):    # la guerra
        mancha(x, z, r_ * 1.6, 0.75)
        mancha(x, z, r_, 0.35)
    for _ in range(18):                                                  # babas verdes
        x, z = random.uniform(-6.5, 4.0), random.uniform(PZ0 + 2, PZ1 - 2)
        c, f_ = a_px(x, z)
        r = int(random.uniform(0.2, 0.5) * KX)
        a[max(0, f_ - r):f_ + r, max(0, c - r):c + r] = a[max(0, f_ - r):f_ + r, max(0, c - r):c + r] * 0.4 + np.array((0.08, 0.3, 0.1), np.float32) * 0.6
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_cartel (i):
    """Los carteles de la valla: inventados, sin marcas."""
    Hh, W = 128, 512
    fondos = [(0.0, 0.42, 0.18), (0.95, 0.78, 0.05), (0.06, 0.2, 0.55), (0.85, 0.85, 0.85)]
    textos = ['INTERLAGOS', 'SAO PAULO', 'BRASIL', 'GP DO BRASIL']
    tintas = [(1.0, 0.85, 0.1), (0.0, 0.3, 0.12), (1.0, 1.0, 1.0), (0.06, 0.2, 0.55)]
    a = lienzo(Hh, W, fondos[i])
    rotulo(a, textos[i], 40, 7 if len(textos[i]) < 11 else 6, tintas[i])
    return guardar(f'cartel-{i}', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.8)
ASFALTO = material('asfalto-pista', de_polyhaven('asphalt_02', 512, 0x3c3c3e, 0.7), rug=0.8)
HIERBA = material('hierba', de_polyhaven('sparse_grass', 512, 0x4f6a2e, 0.7), rug=1.0)
GRAVA = material('grava', de_polyhaven('gravel_stones', 512, 0xa89c88, 0.7), rug=1.0)
HORMIGON = material('hormigon', de_polyhaven('concrete_floor_worn_001', 512, 0xc8c4bc, 0.5), rug=0.9)
CARTELES = [material(f'cartel-{i}', tex_cartel(i), rug=0.6) for i in range(4)]
OFICINAS = [material(f'sp-of-{i}', tex_oficina(f'sp-of-{i}', c, (0.18, 0.22, 0.28))) for i, c in enumerate([(0.74, 0.72, 0.68), (0.6, 0.58, 0.56), (0.82, 0.78, 0.7)])]
VIDRIO = material('sp-vidrio', tex_vidrio('sp-vidrio', (0.2, 0.28, 0.36)))
AZOTEA = material('azotea', tex_azotea((0.5, 0.48, 0.46)))
# OJO: los colores lisos van en LINEAL.
BLANCO = material('blanco', color=(0.7, 0.7, 0.68), rug=0.7)
ROJO = material('rojo', color=(0.55, 0.04, 0.03), rug=0.6)
ACERO = material('acero', color=(0.3, 0.32, 0.34), rug=0.5)
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
GOMA = material('goma', color=(0.015, 0.015, 0.018), rug=0.95)
GOMAS = [material(f'goma-{i}', color=c, rug=0.9) for i, c in enumerate([(0.55, 0.04, 0.03), (0.7, 0.7, 0.68), (0.03, 0.12, 0.45)])]
ASIENTOS = [material(f'asiento-{i}', color=c, rug=0.7) for i, c in enumerate([(0.7, 0.55, 0.02), (0.02, 0.3, 0.08), (0.03, 0.1, 0.42)])]
LUZ_BOX = material('brillo-box', color=(1.0, 0.95, 0.85), emite=1.8)
SEMAFORO = material('brillo-semaforo', color=(1.0, 0.06, 0.04), emite=3.0)
EQUIPOS = [material(f'equipo-{i}', color=c, rug=0.5) for i, c in enumerate([(0.6, 0.02, 0.02), (0.02, 0.05, 0.35), (0.6, 0.3, 0.0), (0.02, 0.25, 0.1), (0.4, 0.4, 0.42), (0.02, 0.02, 0.02)])]
QUEMADO = material('quemado', color=(0.012, 0.01, 0.01), rug=0.9)
RESINA = material('resina', color=(0.02, 0.035, 0.022), rug=0.45)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
AGUA = material('agua-lago', color=(0.05, 0.1, 0.14), rug=0.08)
ARBOL = [material(f'arbol-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.12, 0.03), (0.08, 0.15, 0.04)])]
TRONCO = material('tronco', color=(0.08, 0.05, 0.03))
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.72, 0.46)), (0.06, (0.98, 0.62, 0.42)), (0.2, (0.78, 0.56, 0.6)), (0.5, (0.44, 0.48, 0.74)), (1.0, (0.18, 0.26, 0.56))],
    (SOL[0], SOL[2]), 0.12, (0.9, 0.46, 0.14), ((1.0, 0.7, 0.48), (0.7, 0.58, 0.66)), cuanta_nube=0.3), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA RECTA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-80, 80), (-300, 140))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
for z0, z1 in ((PZ1, 160.0), (-180.0, PZ0)):                          # la recta sigue por los dos lados
    suelo('GP', GRAVA, PX0, -12.0, z0, z1, 0.0, 6.0)
    suelo('GP', HIERBA, -12.0, PISTA_I, z0, z1, 0.0, 6.0)
    suelo('GP', ASFALTO, PISTA_I, BOX_X, z0, z1, 0.0, 8.0)
# El muro de boxes: hormigón con su franja de colores y la valla encima. Es lo
# que cierra el carril de la derecha.
for z in np.arange(-180.0, 160.0, 4.0):
    caja('P', HORMIGON, MURO_X0, MURO_X1, float(z), float(z) + 3.98, 0.0, 1.05, baldosa=4.0)
    caja('P', random.choice(EQUIPOS[:4]) if int(z) % 24 == 0 else BLANCO, MURO_X0 - 0.02, MURO_X1 + 0.02, float(z), float(z) + 3.98, 1.05, 1.4)
for z in np.arange(-180.0, 160.0, 3.0):
    barra('EV', ACERO, P(MURO_X1 - 0.1, float(z), 1.4), P(MURO_X1 - 0.1, float(z), 3.4), 0.08)
for y in (2.4, 3.4):
    barra('EV', ACERO, P(MURO_X1 - 0.1, -180.0, y), P(MURO_X1 - 0.1, 160.0, y), 0.06)
# Los puestos de mando de los equipos, encima del muro (por el lado de boxes).
for z in np.arange(-56.0, 20.0, 14.0):
    caja('EV', random.choice(EQUIPOS), MURO_X1, MURO_X1 + 2.4, float(z) - 2.5, float(z) + 2.5, 1.4, 2.6)
    caja('EV', NEGRO, MURO_X1 + 0.1, MURO_X1 + 2.3, float(z) - 2.4, float(z) + 2.4, 2.6, 2.7)
# El pórtico del semáforo, sobre la línea de meta. A 14: por debajo pasa la
# línea de visión hasta la antena de la base (ver el `circuito` de antes).
for x in (-10.0, 8.0):
    caja('P', ACERO, x - 0.6, x + 0.6, Z_META - 0.6, Z_META + 0.6, 0.0, 15.6)
caja('P', NEGRO, -10.6, 8.6, Z_META - 0.8, Z_META + 0.8, 14.0, 15.6)
for k in range(5):
    x = -6.0 + k * 2.4
    caja('EV', NEGRO, x - 0.5, x + 0.5, Z_META + 0.8, Z_META + 1.0, 12.4, 14.0)
    for y in (12.9, 13.5):
        elipsoide('EP', SEMAFORO, en(x, Z_META + 1.05, y), (0.22, 0.05, 0.22), sub=1)

# ==================================================================================
# 3. LA IZQUIERDA: PIANO, GRAVA, NEUMÁTICOS, VALLA Y TRIBUNA
# ==================================================================================
for z in np.arange(-180.0, 160.0, 1.5):                               # el muro de neumáticos, tres alturas
    for k in range(3):
        m = GOMAS[(int(z * 2) // 3) % 3] if k == 2 else GOMA
        torno('EV', m, en(-26.8, float(z), 0.42 * k), [(0.55, 0.0), (0.55, 0.42)], lados=8, tapas=(False, True))
for z in np.arange(-180.0, 160.0, 6.0):                               # la valla de seguridad
    barra('EV', ACERO, P(-28.2, float(z), 0.0), P(-28.2, float(z), 5.6), 0.14)
for y in (1.4, 3.0, 4.6, 5.5):
    barra('EV', ACERO, P(-28.2, -180.0, y), P(-28.2, 160.0, y), 0.05)
for i, z in enumerate(np.arange(-150.0, 140.0, 9.0)):                 # los carteles, en la valla
    cara('EV', CARTELES[i % 4], [P(-28.0, float(z), 0.3), P(-28.0, float(z) - 8.6, 0.3), P(-28.0, float(z) - 8.6, 1.3), P(-28.0, float(z), 1.3)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((1, 0, 0)))
# La tribuna: gradas de colores (amarillo, verde, azul), la cubierta y sus pilares.
for z0 in np.arange(-130.0, 110.0, 30.0):
    z1 = z0 + 29.6
    for k in range(18):
        x0 = TRIB_X - k * 1.1
        caja('E', ASIENTOS[(k // 6) % 3], x0 - 1.1, x0, float(z0), float(z1), 0.0, 1.0 + k * 0.62, baldosa=3.0)
    # La espalda de la tribuna, de hormigón: vista desde fuera, la última fila de
    # asientos era una pared azul de doce metros.
    caja('E', HORMIGON, TRIB_X - 20.4, TRIB_X - 19.8, float(z0), float(z1), 0.0, 12.4, baldosa=6.0)
    for zz in np.arange(z0 + 2.0, z1, 9.0):
        barra('EV', BLANCO, P(TRIB_X - 19.0, float(zz), 0.0), P(TRIB_X - 19.0, float(zz), 22.0), 0.5)
    cara('E', BLANCO, [P(TRIB_X - 22.0, float(z0), 22.0), P(TRIB_X + 2.0, float(z0), 21.0), P(TRIB_X + 2.0, float(z1), 21.0), P(TRIB_X - 22.0, float(z1), 22.0)], hacia=V((0, 0, 1)), baldosa=8.0)
    cara('E', BLANCO, [P(TRIB_X - 22.0, float(z0), 21.6), P(TRIB_X + 2.0, float(z0), 20.6), P(TRIB_X + 2.0, float(z1), 20.6), P(TRIB_X - 22.0, float(z1), 21.6)], hacia=V((0, 0, -1)), baldosa=8.0)
# En la grava, un coche de carreras quemado y otro volcado más allá.
def coche_carreras (x, z, giro, m, vuelco=0.0):
    M_ = en(x, z, 0.0, giro, (vuelco, 0.0))
    bloque('EV', m, M_ @ M.Translation((0, 0, 0.35)), (1.0, 4.6, 0.5), mella=0.0)
    bloque('EV', m, M_ @ M.Translation((0, 1.9, 0.4)), (1.9, 0.6, 0.12), mella=0.0)        # alerón delantero
    bloque('EV', m, M_ @ M.Translation((0, -2.2, 0.95)), (1.6, 0.5, 0.12), mella=0.0)      # alerón trasero
    for dx, dy in ((-0.85, 1.4), (0.85, 1.4), (-0.85, -1.6), (0.85, -1.6)):
        torno('EV', GOMA, M_ @ M.Translation((dx, dy, 0.33)) @ M.Rotation(math.pi / 2, 4, 'Y'), [(0.34, -0.2), (0.34, 0.2)], lados=10, tapas=(True, True))
coche_carreras(-18.0, -26.0, 0.6, QUEMADO)
coche_carreras(-20.5, -60.0, -0.3, EQUIPOS[0], vuelco=2.6)
# La base alien, en la escapatoria: el plato de resina y su anillo.
bx, bz = BASE
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(bx + r * math.cos(a_), bz + r * math.sin(a_), 0.04) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)
for _ in range(10):
    a_ = random.uniform(math.pi * 0.6, math.pi * 1.4); r = random.uniform(4.8, 6.0)
    elipsoide('EV', RESINA, en(bx + r * math.cos(a_), bz + r * math.sin(a_), 0.0), (random.uniform(0.4, 0.8), random.uniform(0.4, 0.8), random.uniform(0.3, 0.7)), sub=2)

# ==================================================================================
# 4. LA DERECHA: EL CARRIL DE BOXES Y LOS GARAJES
# ==================================================================================
for z0 in np.arange(-140.0, 120.0, 8.0):
    z1 = z0 + 7.8
    caja('E', HORMIGON, BOX_X, BOX_X + 18.0, float(z0), float(z1), 0.0, 7.0, baldosa=6.0)
    # La boca del garaje: el fondo encendido y la franja del equipo encima.
    cara('EP', LUZ_BOX, [P(BOX_X - 0.02, float(z0) + 0.6, 0.0), P(BOX_X - 0.02, float(z1) - 0.6, 0.0), P(BOX_X - 0.02, float(z1) - 0.6, 4.8), P(BOX_X - 0.02, float(z0) + 0.6, 4.8)], hacia=V((-1, 0, 0)))
    eq = random.choice(EQUIPOS)
    caja('EV', eq, BOX_X - 0.3, BOX_X, float(z0), float(z1), 5.0, 6.6)
    if random.random() < 0.4 and -60 < z0 < 20:                      # un coche dentro, de morro a la pista
        coche_carreras(BOX_X + 4.0, float(z0) + 3.9, math.pi / 2, eq)
    for k in range(random.randint(0, 3)):                             # pilas de neumáticos en la puerta
        torno('EV', GOMA, en(BOX_X - 1.2 - k * 0.9, float(z0) + 1.2, 0.0), [(0.33, 0.0), (0.33, 1.1)], lados=8, tapas=(False, True))
# Encima, los salones acristalados.
for z0 in np.arange(-140.0, 120.0, 40.0):
    caja('E', VIDRIO, BOX_X + 1.0, BOX_X + 18.0, float(z0), float(z0) + 39.6, 7.0, 15.0, techo=AZOTEA, baldosa=8.0)
comprobar_paso(('P', 'E', 'EV', 'EP'), ancho=4.5, z_lejos=-130.0)

# ==================================================================================
# 5. EL TRAZADO ENTERO, EL LAGO Y LA CIUDAD (solo en el vuelo)
# ==================================================================================
suelo('G', HIERBA, -1500.0, 1500.0, -1500.0, 1500.0, -0.05, 12.0)
# El trazado: una cinta de asfalto por los puntos de la vuelta, de la S de Senna a la Subida de los Boxes.
VUELTA = [(0.0, -180.0), (-30.0, -230.0), (-90.0, -250.0), (-170.0, -225.0), (-260.0, -150.0), (-285.0, 60.0), (-255.0, 170.0),
          (-180.0, 205.0), (-120.0, 160.0), (-140.0, 90.0), (-90.0, 50.0), (-60.0, 100.0), (-40.0, 170.0), (-10.0, 200.0), (0.0, 160.0)]
for (ax, az), (bx_, bz_) in zip(VUELTA, VUELTA[1:]):
    d = V((bx_ - ax, bz_ - az, 0.0)); d.normalize()
    nx, nz = -d.y * 7.0, d.x * 7.0
    cara('C', ASFALTO, [P(ax - nx, az - nz, 0.03), P(ax + nx, az + nz, 0.03), P(bx_ + nx, bz_ + nz, 0.03), P(bx_ - nx, bz_ - nz, 0.03)], hacia=ARRIBA, baldosa=8.0)
cara('CP', AGUA, [P(-420.0 + 90.0 * math.cos(a_), 260.0 + 60.0 * math.sin(a_), 0.02) for a_ in np.linspace(0, 2 * math.pi, 24, endpoint=False)], hacia=ARRIBA)
for _ in range(240):                                                  # árboles del parque del circuito
    x, z = random.uniform(-340.0, -40.0), random.uniform(-260.0, 260.0)
    if abs(x - TRIB_X) < 30 and -150 < z < 150:
        continue
    arbol('T', TRONCO, ARBOL, x, z, random.uniform(1.4, 2.4))
n_ed = 0
for gx in np.arange(-1400.0, 1400.0, 60.0):                           # la ciudad, hasta el horizonte
    for gz in np.arange(-1400.0, 1400.0, 60.0):
        cx, cz = gx + 30.0 + random.uniform(-8, 8), gz + 30.0 + random.uniform(-8, 8)
        if -360.0 < cx < 60.0 and -300.0 < cz < 300.0:              # el circuito y su parque
            continue
        if 40.0 < cx < 80.0 and -200.0 < cz < 200.0:
            continue
        a, b = random.uniform(10.0, 18.0), random.uniform(10.0, 18.0)
        cerca_c = math.hypot(cx - 600.0, cz + 900.0) < 450.0           # el centro, con las torres altas
        alto = random.choice([30.0, 50.0, 80.0, 120.0, 160.0]) if cerca_c else random.choice([12.0, 18.0, 24.0, 36.0, 50.0])
        caja('T', random.choice(OFICINAS + [VIDRIO]), cx - a, cx + a, cz - b, cz + b, 0.0, alto, techo=AZOTEA, baldosa=16.0)
        n_ed += 1
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-interlagos', ['P', 'E', 'GP', 'EV', 'EP']), ('lugar-interlagos-ciudad', ['C', 'G', 'T', 'CP'])],
    # Atardecer: sol bajo, naranja y fuerte, a la espalda; el cielo de enfrente, azul y malva.
    sol_hacia=SOL, sol_color=(1.0, 0.68, 0.4), sol_fuerza=6.5, sol_ancho=4.0, cielo_fuerza=0.24, cielo_altura=5, cielo_giro=200,
    escala=0.8, satura=1.0, no_alumbran=('CP',), suaves=(), fundir=True)
