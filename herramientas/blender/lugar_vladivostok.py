# Vladivostok: encima del puente Zolotói, un día de invierno con nieve (19/10/2026).
#   blender -b -P herramientas/blender/lugar_vladivostok.py              (entero)
#   blender -b -P herramientas/blender/lugar_vladivostok.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_vladivostok.py -- --reusar  (retocar la luz)
#
# Era uno de los tres tramos que seguían hechos de piezas en escenarios.js. Isidro
# eligió (19/10): se juega ENCIMA DEL PUENTE como antes (la calzada, tres carriles
# entre las barreras), los alienz llegan ANDANDO desde el otro lado saliendo de la
# niebla, INVIERNO CON NIEVE DE DÍA (la bahía medio helada, cielo gris) y llegada
# LARGA como Madrid.
#
# Cómo está puesto. Se mira hacia el sur, hacia la península de Churkin:
#   · el tablero: la calzada con la nieve pisada y las rodadas, las barreras de
#     hormigón con su capa de nieve que cierran el campo a tres carriles, los dos
#     carriles de fuera enterrados en nieve con coches abandonados y el pretil;
#   · el pilono cercano EN UVE, como el de verdad: las dos patas pasan por fuera
#     del tablero y se abren hacia arriba; de ellas bajan los abanicos de tirantes
#     blancos al borde del tablero (nunca cruzan los carriles);
#   · abajo, a 40 m, el Cuerno de Oro helado: hielo con grietas, el canal negro que
#     abre un rompehielos y los barcos de guerra atrapados;
#   · a la izquierda, colgada por fuera del pretil, la base alien: un nido de resina
#     pegado al canto del tablero;
#   · solo en el vuelo: el segundo pilono, las dos orillas con sus colinas nevadas,
#     los bloques soviéticos y la torre de la tele en el Nido del Águila.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.4, 0.42, 0.8)                  # sol de invierno, bajo y detrás, velado por las nubes
iniciar('vladivostok', 4119, eje=(0.0, -80.0), encendidas=0.08, reflejo=(0.22, 0.23, 0.26))

ANCHO = 7.8                              # medio tablero (el pretil va en 7,6)
BARRERA = 4.05                           # entre el carril de en medio y los de fuera, como antes
HIELO_Y = -40.0                          # la bahía, muy abajo
Z_NORTE, Z_SUR = 150.0, -520.0           # donde el tablero toca tierra en cada orilla
PILONOS = (-26.0, -380.0)
BASE = (-12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -ANCHO, ANCHO, -64.0, 14.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_nieve (n=256):
    a = lienzo(n, n, (0.86, 0.88, 0.91)) * (0.94 + 0.08 * nube(n, n, 5, 5))[..., None]
    a += ruido(n, n, 0.03)[..., None]
    return a

def tex_pista ():
    """La calzada del puente: asfalto con la nieve pisada, las rodadas a la vista,
    la raya discontinua asomando, los carriles de fuera enterrados y la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('asphalt_02', 256, 0x4a4b4e, 0.7))
    a *= (0.88 + 0.2 * nube(PH_, PW, 16, 4))[..., None]
    nieve = tejar(tex_nieve())
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    # Cuánta nieve: poca en el centro de cada carril, más en las juntas, toda fuera de las barreras.
    cubre = 0.42 + 0.22 * nube(PH_, PW, 60, 14) + 0.1 * nube(PH_, PW, 200, 40)     # pareja: con manchas grandes parecían charcos blancos
    cubre = np.maximum(cubre, np.clip((np.abs(xs) - 3.5) / 0.4, 0, 1))
    for x in (-2.9, -1.9, -0.5, 0.5, 1.9, 2.9):                        # las rodadas: el asfalto mojado a la vista
        c, _ = a_px(x, 0)
        ancho_r = 6
        cubre[:, c - ancho_r:c + ancho_r] *= (0.15 + 0.35 * nube(PH_, 2 * ancho_r, 40, 2))
    a = a * (1 - cubre[..., None]) + nieve * cubre[..., None]
    for x in (-1.2, 1.2):                                                # la raya discontinua, medio tapada
        c, _ = a_px(x, 0)
        for z in np.arange(PZ0, PZ1, 6.0):
            _, f0 = a_px(0, z); _, f1 = a_px(0, z + 3.0)
            tapa = 0.35 + 0.5 * random.random()
            a[min(f0, f1):max(f0, f1), c - 3:c + 3] = a[min(f0, f1):max(f0, f1), c - 3:c + 3] * tapa + np.array((0.72, 0.66, 0.42), np.float32) * (1 - tapa)
    def mancha (x, z, r_, k, color=None, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        w = np.clip(1 - d, 0, 1) ** 1.5 * (0.7 + 0.5 * nube(y1 - y0, x1 - x0, 3, 3))
        if color is None:
            a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(w, 0, 1))[..., None]
        else:
            w = np.clip(w * k, 0, 1)[..., None]
            a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - w) + np.array(color, np.float32) * w
    for x, z, r_ in ((1.8, -12.0, 1.6), (-2.6, -31.0, 1.8), (0.6, -50.0, 1.5), (-0.4, 6.0, 1.2)):   # quemaduras en la nieve
        mancha(x, z, r_ * 1.6, 0.75, forma=1.1)
        mancha(x, z, r_, 0.35)
    for _ in range(22):                                                  # babas de alien, verdes
        mancha(random.uniform(-3.4, 3.4), random.uniform(PZ0 + 2, PZ1 - 2), random.uniform(0.2, 0.5), 0.8, (0.1, 0.32, 0.12))
    for _ in range(240):                                                 # huellas en la nieve de los lados
        x, z = random.uniform(-3.4, 3.4), random.uniform(PZ0, PZ1)
        ang = random.uniform(-0.3, 0.3)
        for k in range(random.randint(4, 10)):
            c, f = a_px(x + (0.16 if k % 2 else -0.16), z)
            if 2 < c < PW - 4 and 2 < f < PH_ - 6:
                a[f:f + 5, c:c + 3] *= 0.84
            x += 0.7 * math.sin(ang); z -= 0.7 * math.cos(ang)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_tablero ():
    """La calzada lejos del campo: lo mismo sin detalle, para repetir."""
    a = foto('asphalt_02', 256, 0x4a4b4e, 0.7)
    n = tex_nieve()
    xs = np.linspace(-1, 1, 256, dtype=np.float32)[None, :]
    cubre = np.clip(0.3 + 0.5 * nube(256, 256, 6, 4) + np.clip((np.abs(xs) - 0.45) / 0.1, 0, 1), 0, 1)
    return guardar('tablero', np.clip(a * (1 - cubre[..., None]) + n * cubre[..., None], 0, 1), 86)

def tex_hielo (n=512):
    """La bahía helada: blanca de nieve, con el hielo gris azulado asomando y grietas."""
    a = lienzo(n, n, (0.84, 0.87, 0.9)) * (0.92 + 0.1 * nube(n, n, 6, 6))[..., None]
    limpio = np.clip((nube(n, n, 9, 9) - 0.55) / 0.2, 0, 1)[..., None]
    a = a * (1 - limpio) + np.array((0.5, 0.6, 0.68), np.float32) * limpio
    for _ in range(26):
        c, f = random.uniform(0, n), random.uniform(0, n)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(60, 260)):
            ang += random.uniform(-0.25, 0.25)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c) % n, int(f) % n
            a[fi, ci] *= 0.72
    return guardar('hielo-bahia', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.7)
TABLERO = material('tablero', tex_tablero(), rug=0.75)
HIELO = material('hielo-bahia', tex_hielo(), rug=0.6)
NIEVE = material('nieve', guardar('nieve-vlad', np.clip(tex_nieve(128), 0, 1), 88), rug=1.0)
HORMIGON = material('hormigon', de_polyhaven('concrete_floor_worn_001', 512, 0xd8d6d0, 0.5), rug=0.9)
HORMIGON_V = material('hormigon-viejo', de_polyhaven('cracked_concrete_wall', 512, 0x9c9a94, 0.6), rug=0.95)
OXIDO_T = material('casco-oxido', de_polyhaven('rusty_metal_02', 256, 0x6a4a3c, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.78, 0.8, 0.84)))
# OJO: los colores lisos van en LINEAL.
BLANCO = material('nieve-lisa', color=(0.74, 0.77, 0.82), rug=1.0)
TIRANTE = material('tirante', color=(0.8, 0.8, 0.78), rug=0.4)
ACERO = material('acero', color=(0.32, 0.34, 0.36), rug=0.5)
NEGRO = material('negro', color=(0.004, 0.005, 0.006))
AGUA = material('agua-canal', color=(0.012, 0.03, 0.045), rug=0.08)
RESINA = material('resina', color=(0.02, 0.035, 0.022), rug=0.45)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
LUNA = material('luna-coche', color=(0.03, 0.04, 0.05), rug=0.2)
CHAPAS = [material(f'chapa-{i}', color=c, rug=0.5) for i, c in enumerate([(0.36, 0.04, 0.03), (0.04, 0.1, 0.26), (0.42, 0.42, 0.4), (0.12, 0.14, 0.16), (0.24, 0.26, 0.08)])]
GRIS_NAVAL = material('gris-naval', color=(0.2, 0.22, 0.24), rug=0.6)
ROJO_CASCO = material('rojo-casco', color=(0.32, 0.03, 0.02), rug=0.6)
BLANCO_CASCO = material('blanco-casco', color=(0.62, 0.63, 0.64), rug=0.6)
VENTANA = material('brillo-ventana', color=(1.0, 0.72, 0.36), emite=1.6)
ROJO_LUZ = material('brillo-baliza', color=(1.0, 0.12, 0.08), emite=3.0)
ABETO = [material(f'abeto-{i}', color=c, rug=1.0) for i, c in enumerate([(0.02, 0.05, 0.04), (0.03, 0.07, 0.05)])]
TRONCO = material('tronco', color=(0.05, 0.04, 0.035))
MONTE_L = material('monte-lejos', color=(0.42, 0.46, 0.52), rug=1.0)
# Los bloques soviéticos: paneles claros y pastel, como los de las colinas de Vladivostok.
BLOQUES = [material(f'bloque-{i}', tex_crema(f'vl-bloque-{i}', c, 0.2)) for i, c in enumerate([(0.74, 0.72, 0.68), (0.7, 0.62, 0.52), (0.62, 0.66, 0.7), (0.76, 0.7, 0.6)])]
TORRES = [material('vl-of-0', tex_oficina('vl-of-0', (0.58, 0.6, 0.62), (0.2, 0.26, 0.32))), material('vl-vidrio', tex_vidrio('vl-vidrio', (0.22, 0.3, 0.38)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.88, 0.89, 0.9)), (0.08, (0.82, 0.84, 0.87)), (0.3, (0.68, 0.72, 0.78)), (0.7, (0.56, 0.6, 0.68)), (1.0, (0.46, 0.52, 0.62))],
    (SOL[0], SOL[2]), 0.14, (0.16, 0.12, 0.08), ((0.94, 0.94, 0.94), (0.8, 0.82, 0.86)), cuanta_nube=0.55), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL TABLERO
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-160, 160), (-460, 200))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
for z0, z1 in [(z, min(z + 40.0, Z_NORTE)) for z in np.arange(PZ1, Z_NORTE, 40.0)] + [(max(z - 40.0, Z_SUR), z) for z in np.arange(PZ0, Z_SUR, -40.0)]:
    rect('P', TABLERO, -ANCHO, ANCHO, float(z0), float(z1), 0.0, uvs=[(0, 0), (1, 0), (1, (z1 - z0) / 12.0), (0, (z1 - z0) / 12.0)])
# Por debajo, el cajón del tablero: desde la cámara se le ve el canto, y desde el vuelo la panza.
for z0 in np.arange(Z_SUR, Z_NORTE, 40.0):
    z1 = min(z0 + 40.0, Z_NORTE)
    caja('P', HORMIGON_V, -ANCHO, ANCHO, float(z0), float(z1), -3.0, -0.02, baldosa=10.0, tapa_abajo=True)
# Las barreras que cierran el campo a tres carriles, con su capa de nieve encima.
for s in (-1, 1):
    for z0 in np.arange(Z_SUR, Z_NORTE, 20.0):
        z1 = min(z0 + 20.0, Z_NORTE)
        caja('P', HORMIGON, s * BARRERA - 0.31, s * BARRERA + 0.31, float(z0), float(z1), 0.0, 0.42, baldosa=4.0)
        caja('P', HORMIGON, s * BARRERA - 0.17, s * BARRERA + 0.17, float(z0), float(z1), 0.42, 0.82, techo=NIEVE, baldosa=4.0)
    # Los carriles de fuera, cerrados: la nieve amontonada contra la barrera.
    # Lomos largos, bajos y redondos que se solapan: con bolas de 20 caras salían
    # piedras blancas en vez de nieve amontonada.
    for z in np.arange(-130.0, 40.0, 2.6):
        elipsoide('EV', BLANCO, en(s * random.uniform(5.5, 6.4), float(z) + random.uniform(-0.6, 0.6), 0.0, random.uniform(-0.1, 0.1)), (random.uniform(0.9, 1.15), random.uniform(2.6, 3.6), random.uniform(0.3, 0.5)), sub=2)
# El pretil: montantes, dos largueros y las farolas, altas y cada mucho.
for s in (-1, 1):
    x = s * 7.6
    for z in np.arange(Z_SUR, Z_NORTE, 2.5):
        barra('EV', ACERO, P(x, float(z), 0.0), P(x, float(z), 1.15), 0.09)
    for y in (0.7, 1.15):
        barra('EV', ACERO, P(x, Z_SUR, y), P(x, Z_NORTE, y), 0.1)
    for z in np.arange(Z_SUR + 10, Z_NORTE, 32.0):
        barra('EV', ACERO, P(s * 7.3, float(z), 0.0), P(s * 7.3, float(z), 8.0), 0.18)
        barra('EV', ACERO, P(s * 7.3, float(z), 8.0), P(s * 6.0, float(z), 8.3), 0.12)
        cubo('EV', BLANCO, P(s * 5.7, float(z), 8.25), (0.7, 0.3, 0.16))

# Coches abandonados en los carriles de fuera, enterrados hasta las ruedas.
for x, z, g in ((-5.9, -8.0, 0.1), (-5.8, -29.0, -0.08), (5.9, -18.0, 0.06), (6.0, -52.0, -0.12), (-5.9, -95.0, 0.1), (5.9, -120.0, 0.0), (5.8, 22.0, 0.08)):
    coche('EV', CHAPAS, LUNA, x, z, g)
    # La nieve encima: una manta redonda sobre el techo y el capó, y amontonada
    # contra las ruedas, que no se ven.
    elipsoide('EV', BLANCO, en(x, z, 1.18, g), (0.9, 1.25, 0.24), sub=2)
    elipsoide('EV', BLANCO, en(x, z - 1.4 * math.cos(g), 0.74, g), (0.95, 0.9, 0.14), sub=2)
    elipsoide('EV', BLANCO, en(x, z, 0.0, g), (1.25, 2.6, 0.42), sub=2)
# Un autobús del ayuntamiento cruzado al fondo de los carriles de fuera (no toca los de dentro).
cubo('EV', CHAPAS[4], P(5.95, -78.0, 1.5), (2.5, 10.0, 2.8), 0.02)
cubo('EV', LUNA, P(5.95, -78.0, 2.1), (2.55, 9.0, 0.9), 0.02)
cubo('EV', BLANCO, P(5.95, -78.0, 2.95), (2.4, 9.6, 0.14), 0.02)

# ==================================================================================
# 3. LOS PILONOS EN UVE Y LOS TIRANTES
# ==================================================================================
PATA_ABAJO, PATA_ARRIBA, ALTO_P = 5.0, 21.0, 96.0        # x de la pata en el hielo y arriba; altura sobre el tablero
def x_pata (y):
    return PATA_ABAJO + (PATA_ARRIBA - PATA_ABAJO) * (y - HIELO_Y) / (ALTO_P - HIELO_Y)
print('PATA a la altura del tablero en x =', round(x_pata(0.0), 2))
for zp in PILONOS:
    caja('P', HORMIGON_V, -12.0, 12.0, zp - 9.0, zp + 9.0, HIELO_Y - 2.0, HIELO_Y + 6.0, techo=NIEVE, baldosa=8.0)   # la zapata en el hielo
    for s in (-1, 1):
        # La pata: un prisma inclinado de 2,4 x 3,2 de sección, de la zapata a la cima,
        # con cada cara mirando hacia fuera de su eje.
        y0, y1 = HIELO_Y + 4.0, ALTO_P
        seccion = lambda xx, yy: [P(xx - 1.2, zp - 1.6, yy), P(xx + 1.2, zp - 1.6, yy), P(xx + 1.2, zp + 1.6, yy), P(xx - 1.2, zp + 1.6, yy)]
        tramos = np.linspace(y0, y1, 9)
        for ya, yb in zip(tramos[:-1], tramos[1:]):
            xa, xb = s * x_pata(ya), s * x_pata(yb)
            A, B = seccion(xa, ya), seccion(xb, yb)
            eje_m = (P(xa, zp, ya) + P(xb, zp, yb)) / 2
            for i in range(4):
                j = (i + 1) % 4
                c_ = (A[i] + A[j] + B[j] + B[i]) / 4
                cara('P', HORMIGON, [A[i], A[j], B[j], B[i]], hacia=c_ - eje_m, baldosa=6.0)
        cara('P', HORMIGON, seccion(s * x_pata(y1), y1), hacia=ARRIBA, baldosa=6.0)
    # El travesaño bajo el tablero, donde se apoya.
    caja('P', HORMIGON, -x_pata(-3.0) - 1.2, x_pata(-3.0) + 1.2, zp - 2.0, zp + 2.0, -6.0, -3.0, baldosa=6.0)
    cubo('EP', ROJO_LUZ, P(-x_pata(ALTO_P), zp, ALTO_P + 0.6), (0.8, 0.8, 0.8))
    cubo('EP', ROJO_LUZ, P(x_pata(ALTO_P), zp, ALTO_P + 0.6), (0.8, 0.8, 0.8))
    # Los abanicos: de la parte alta de cada pata al borde del tablero, a los dos lados.
    for s in (-1, 1):
        for sentido in (-1, 1):
            for k in range(1, 15):
                y_arriba = ALTO_P - 3.0 - k * 2.2
                arriba = P(s * x_pata(y_arriba), zp, y_arriba)
                abajo = P(s * 7.15, zp + sentido * (6.0 + k * 9.5), 0.6)
                barra('EV', TIRANTE, arriba, abajo, 0.16)
comprobar_paso(('P', 'EV', 'EP'), ancho=3.6, z_lejos=-130.0)

# ==================================================================================
# 4. EL NIDO: LA BASE ALIEN, COLGADA POR FUERA DEL PRETIL
# ==================================================================================
bx, bz = BASE
for i in range(36):                                                   # el plato de resina, a ras del tablero
    a0, a1 = 2 * math.pi * i / 36, 2 * math.pi * (i + 1) / 36
    cara('P', RESINA, [P(bx, bz, 0.02), P(bx + 5.0 * math.cos(a0), bz + 5.0 * math.sin(a0), 0.02), P(bx + 5.0 * math.cos(a1), bz + 5.0 * math.sin(a1), 0.02)], hacia=ARRIBA, baldosa=3.0)
    cara('EP', VERDE, [P(bx + r * math.cos(a_), bz + r * math.sin(a_), 0.05) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)
torno('P', RESINA, en(bx, bz, -0.02), [(0.0, -14.0), (1.6, -11.0), (3.4, -6.0), (4.8, -2.4), (5.1, -0.6), (5.0, -0.02)], lados=20, tapas=(False, False))
for _ in range(14):                                                   # lo que gotea hacia el hielo
    a_ = random.uniform(0, 6.28); r = random.uniform(1.0, 4.0)
    elipsoide('EV', RESINA, en(bx + r * math.cos(a_), bz + r * math.sin(a_), -random.uniform(4.0, 11.0)), (random.uniform(0.3, 0.7), random.uniform(0.3, 0.7), random.uniform(1.2, 3.0)))
for k in range(9):                                                    # los zarcillos que se agarran al pretil y al canto
    z = bz - 5.0 + k * 1.25
    barra('EV', RESINA, P(bx + 4.0, bz + (z - bz) * 0.7, -0.4), P(-7.6, z, random.uniform(0.6, 1.2)), random.uniform(0.18, 0.32))
    barra('EV', RESINA, P(bx + 4.4, bz + (z - bz) * 0.7, -1.8), P(-ANCHO, z, -2.4), random.uniform(0.22, 0.4))
for _ in range(10):
    a_ = random.uniform(0, 6.28); r = random.uniform(1.2, 3.6)
    elipsoide('EP', BRILLO_HONDO if random.random() < 0.5 else VERDE, en(bx + r * math.cos(a_), bz + r * math.sin(a_), -random.uniform(1.0, 8.0)), (0.35, 0.35, 0.35))

# ==================================================================================
# 5. LA BAHÍA HELADA
# ==================================================================================
# El hielo, de orilla a orilla. Primero la base y luego lo de encima (ver horneado.py).
suelo('GP', HIELO, -1500.0, 1500.0, Z_SUR + 60.0, Z_NORTE - 30.0, HIELO_Y, 30.0)
# El canal que abrió el rompehielos: agua negra que se mueve, de lado a lado de la bahía.
CANAL = (-150.0, -168.0)
cara('EP', AGUA, [P(-1500.0, CANAL[0], HIELO_Y + 0.05), P(1500.0, CANAL[0], HIELO_Y + 0.05), P(1500.0, CANAL[1], HIELO_Y + 0.05), P(-1500.0, CANAL[1], HIELO_Y + 0.05)], hacia=ARRIBA)
for zc in CANAL:                                                      # los cantos del hielo partido, con trozos sueltos
    for _ in range(90):
        x = random.uniform(-600.0, 600.0)
        bloque('EV', BLANCO, en(x, zc + random.uniform(-3.0, 3.0), HIELO_Y - 0.2, random.uniform(0, 3.1)), (random.uniform(1.5, 5.0), random.uniform(1.0, 3.0), random.uniform(0.4, 0.9)), baldosa=5.0, mella=0.15)

def barco (grupo, casco, x, z, largo, ancho, alto, giro=0.0, puente=None, color_puente=BLANCO_CASCO):
    """Un barco atrapado: casco en punta, la cubierta nevada, la superestructura y el mástil."""
    c, s_ = math.cos(giro), math.sin(giro)
    loc = lambda u, v: (x + u * c - v * s_, z + u * s_ + v * c)
    planta = [loc(-largo / 2, -ancho / 2), loc(largo / 2 - ancho, -ancho / 2), loc(largo / 2, 0.0), loc(largo / 2 - ancho, ancho / 2), loc(-largo / 2, ancho / 2)]
    prisma(grupo, casco, planta, HIELO_Y - 1.0, HIELO_Y + alto, techo=NIEVE, baldosa=6.0)
    if puente:
        u0, u1, h = puente
        pc = [loc(u0, -ancho * 0.32), loc(u1, -ancho * 0.32), loc(u1, ancho * 0.32), loc(u0, ancho * 0.32)]
        prisma(grupo, color_puente, pc, HIELO_Y + alto, HIELO_Y + alto + h, techo=NIEVE, baldosa=4.0)
        mx, mz = loc((u0 + u1) / 2, 0.0)
        barra(grupo, ACERO, P(mx, mz, HIELO_Y + alto + h), P(mx, mz, HIELO_Y + alto + h + h * 1.4), 0.5)
        for k in range(3):
            vx, vz = loc(u1 + 0.02, (k - 1) * ancho * 0.18)
            cubo('EP', VENTANA, P(vx, vz, HIELO_Y + alto + h * 0.7), (0.3, 1.2, 0.6), giro)
# Los barcos de guerra de la Flota del Pacífico, grises, a la derecha; el rompehielos rojo
# abriendo el canal, a la izquierda; un carguero y un remolcador por la bahía.
barco('EV', GRIS_NAVAL, 62.0, -96.0, 120.0, 15.0, 5.0, 0.04, (-10.0, 18.0, 9.0), GRIS_NAVAL)
barco('EV', GRIS_NAVAL, 120.0, -70.0, 100.0, 13.0, 4.5, -0.03, (-14.0, 10.0, 8.0), GRIS_NAVAL)
barco('EV', ROJO_CASCO, -96.0, -159.0, 90.0, 20.0, 7.0, 0.0, (10.0, 34.0, 11.0), BLANCO_CASCO)
barco('EV', OXIDO_T, -150.0, -60.0, 140.0, 20.0, 8.0, 0.1, (-60.0, -40.0, 12.0), BLANCO_CASCO)
barco('EV', ROJO_CASCO, 40.0, -250.0, 26.0, 8.0, 3.0, 1.2, (-4.0, 6.0, 4.0), BLANCO_CASCO)

# ==================================================================================
# 6. LAS ORILLAS, LA CIUDAD Y EL NIDO DEL ÁGUILA (solo en el vuelo)
# ==================================================================================
def orilla (z_borde, hacia, cuantos_bloques):
    """Una orilla: el muelle, las colinas nevadas con abetos y los bloques soviéticos por las laderas."""
    z_lejos = z_borde + hacia * 900.0
    suelo('G', NIEVE, -1500.0, 1500.0, min(z_borde, z_lejos), max(z_borde, z_lejos), HIELO_Y + 4.0, 14.0)
    for x in np.arange(-1500.0, 1500.0, 60.0):                        # el muelle de hormigón, con su canto
        caja('T', HORMIGON_V, float(x) + 0.3, float(x) + 59.7, min(z_borde, z_borde + hacia * 4.0), max(z_borde, z_borde + hacia * 4.0), HIELO_Y - 1.0, HIELO_Y + 4.0, techo=NIEVE, baldosa=8.0)
    alturas = []
    for _ in range(9):
        cx = random.uniform(-900.0, 900.0)
        if abs(cx) < 60.0:
            continue
        cz = z_borde + hacia * random.uniform(160.0, 420.0)
        r, h = random.uniform(160.0, 280.0), random.uniform(70.0, 150.0)
        alturas.append(monte('T', NIEVE, cx, cz, r, h, y0=HIELO_Y + 4.0, seg=18, anillos=5, pico=0.85))
    def alto_en (x, z):
        y = HIELO_Y + 4.0
        for f in alturas:
            v = f(x, z)
            if v is not None:
                y = max(y, v)
        return y
    n = 0
    for _ in range(cuantos_bloques):
        x, z = random.uniform(-900.0, 900.0), z_borde + hacia * random.uniform(30.0, 600.0)
        if abs(x) < 26.0:
            continue
        y = alto_en(x, z)
        a, b = random.uniform(8.0, 12.0), random.uniform(28.0, 60.0)
        giro_l = random.random() < 0.5
        x0, x1, z0, z1 = (x - b / 2, x + b / 2, z - a / 2, z + a / 2) if giro_l else (x - a / 2, x + a / 2, z - b / 2, z + b / 2)
        caja('T', random.choice(BLOQUES + TORRES[:1]), x0, x1, z0, z1, y - 3.0, y + random.choice([15.0, 15.0, 27.0, 27.0, 42.0]), techo=AZOTEA, baldosa=17.0)
        n += 1
    for _ in range(260):
        x, z = random.uniform(-900.0, 900.0), z_borde + hacia * random.uniform(40.0, 700.0)
        if abs(x) < 26.0:
            continue
        pino('T', TRONCO, ABETO, x, z, random.uniform(1.8, 3.2), y=alto_en(x, z))
    return alto_en, n
alto_norte, n1 = orilla(Z_NORTE - 30.0, 1.0, 420)
alto_sur, n2 = orilla(Z_SUR + 60.0, -1.0, 260)
print('BLOQUES', n1 + n2)
# Los estribos: el tablero baja a tierra sobre pilas en las dos orillas.
for z in list(np.arange(40.0, Z_NORTE, 36.0)) + list(np.arange(-430.0, Z_SUR, -36.0)):
    for s in (-1, 1):
        caja('P' if z > -60 else 'T', HORMIGON_V, s * 4.0 - 1.4, s * 4.0 + 1.4, float(z) - 1.6, float(z) + 1.6, HIELO_Y - 1.0, -3.0, baldosa=8.0)
# La torre de la tele en el Nido del Águila, sobre la colina de la orilla norte, a la derecha.
TX, TZ = 260.0, 420.0
ty = alto_norte(TX, TZ)
torno('T', BLANCO_CASCO, en(TX, TZ, ty), [(6.0, 0.0), (4.0, 40.0), (2.6, 110.0), (1.6, 170.0), (0.4, 205.0)], lados=12, tapas=(False, True))
for k in range(4):
    cubo('CP', ROJO_LUZ, P(TX, TZ, ty + 50.0 + k * 45.0), (5.0 - k, 5.0 - k, 1.2))
for cx, cz, radio, alto in ((-2000.0, 2100.0, 1000.0, 260.0), (2100.0, -2000.0, 1000.0, 240.0), (-2200.0, -1900.0, 900.0, 200.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=HIELO_Y, seg=16, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 7. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'GP': ('luzG-hielo', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-vladivostok', ['P', 'GP', 'EV', 'EP']), ('lugar-vladivostok-ciudad', ['G', 'T', 'CP'])],
    # Día de invierno nublado: sol bajo y velado, mucho cielo. Lo de Moscú vale de
    # punto de partida (la sombra azulada sobre la nieve es lo que la hace nieve),
    # con menos sol y algo más de cielo porque aquí está cubierto.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.78), sol_fuerza=4.5, sol_ancho=6.0, cielo_fuerza=0.3, cielo_altura=10, cielo_giro=200,
    escala=0.85, satura=0.85, no_alumbran=('CP',), suaves=('monte-lejos', 'nieve', 'nieve-lisa'), fundir=True)
