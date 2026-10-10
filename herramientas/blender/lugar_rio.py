# Río de Janeiro: lo alto del Corcovado, ante el Cristo (10/10/2026, rehecho el mismo día).
#   blender -b -P herramientas/blender/lugar_rio.py              (entero)
#   blender -b -P herramientas/blender/lugar_rio.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_rio.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»): ARRIBA, en el mirador, con la estatua de frente; los alienz EN NAVE;
# por la MAÑANA. La primera versión llevaba el Cristo a un tercio de su tamaño,
# hecho de cilindros, y a Isidro no le valió: «se ve muy pequeño y poco
# detallado, haz más realista la pista también, las naves lo atraviesan, añade
# elementos típicos del lugar». Preguntado: EN BLENDER (no con Meshy) y «baja un
# poco la cámara para que quepa, pero hazlo grande».
#
# Cómo está puesto ahora:
#   · LA CÁMARA DE ESTE MAPA VA MÁS BAJA (`picado: 18` en el escenario; lo normal
#     son 25). Con eso al fondo caben 27 m de alto en vez de 13, y se ve cielo;
#   · EL CRISTO VA A 0,69 DE SU TAMAÑO (26 m con el pedestal) y es un modelo de
#     MESHY (herramientas/blender/modelos/cristo.glb). Está en su plazoleta, tres
#     metros por debajo del mirador, al final de una escalinata;
#   · la terraza: losas de granito de foto, cada una de su tono, con la cenefa
#     de olas de piedra portuguesa de las aceras de Río a los lados;
#   · lo típico: el tren rojo del Corcovado en su apeadero, la bandera, el
#     carrito de cocos, guacamayos en la balaustrada, ipês amarillos y palmeras;
#   · detrás, y esto se ve JUGANDO: la zona sur, la laguna, las playas, el Pan
#     de Azúcar, la bahía y las sierras del otro lado.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from horneado import *
import horneado as H

SOL = (0.42, 0.62, 0.66)                 # media mañana: a la espalda y a la derecha
iniciar('rio', 4433, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.1, 0.14, 0.2))

BORDE = 9.6                              # la balaustrada de la terraza
Z_FIN = -70.0                            # donde acaba la terraza y baja la escalinata
ZC = -100.0                              # el Cristo
Y_PLAZA = -3.0                           # su plazoleta
ESCALA = 0.687                           # la estatua, respecto a la de verdad (30 m de figura, 8 de pedestal)
ALTO_PED = 8.0 * ESCALA
ABAJO = -230.0                           # el nivel del mar, visto desde arriba (el Corcovado, a escala)
BASE = (12.6, -44.0)
R_MIR = 5.9
CAM = (0.0, 10.67, 23.83)                # la cámara de juego de este mapa (18° de picado)

def polar (grados, d):
    """Un punto del suelo a `d` metros de la cámara de juego y a tantos grados del eje
    (la pantalla del móvil abarca ±11,6°): así se coloca el fondo por lo que se VE."""
    a = math.radians(grados)
    return d * math.sin(a), CAM[2] - d * math.cos(a)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_FIN, 12.4
PW, PH_ = 768, 3072
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La terraza: losas de granito gris, cada una de su tono, a hiladas; un
    bordillo claro y, a cada lado, la cenefa de olas de piedra portuguesa (la
    calçada de las aceras de Río). Encima, lo que deja el tiempo: verdín junto a
    los bordes, charcos, grietas, rejillas y tres quemaduras."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    mezcla = nube(PH_, PW, 30, 8)[..., None]
    a = tejar(foto('concrete_floor_worn_001', 384, 0xb0aca2, 0.75)) * mezcla + tejar(foto('marble_01', 320, 0x9d9c99, 0.5)) * (1 - mezcla)
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    xs, zs = PX0 + xx / KX, PZ0 + yy / KZ
    X_LOSA = 7.25
    cA, cB = a_px(-X_LOSA, 0)[0], a_px(X_LOSA, 0)[0]
    z, alto_fila = PZ0, 0.86
    while z < PZ1:
        f0, f1 = int((z - PZ0) * KZ), int(min(PH_, (z + alto_fila - PZ0) * KZ))
        x = -X_LOSA - random.uniform(0.0, 1.0)
        while x < X_LOSA:
            largo = random.uniform(0.9, 1.9)
            c0, c1 = max(cA, a_px(x, 0)[0]), min(cB, a_px(x + largo, 0)[0])
            if c1 > c0 + 3:
                tono = random.uniform(0.9, 1.07) * (0.82 if random.random() < 0.06 else 1.0)       # alguna, repuesta con otra piedra
                a[f0:f1, c0:c1] *= tono * np.array((1 + random.uniform(-0.025, 0.025), 1.0, 1 + random.uniform(-0.03, 0.03)), np.float32)
                a[f0:f1, c0:c0 + 2] *= 0.52                                                      # la junta y su canto de luz
                a[f0:f1, c0 + 2:c0 + 3] *= 1.12
            x += largo
        a[f0:f0 + 2, cA:cB] *= 0.52
        a[f0 + 2:f0 + 3, cA:cB] *= 1.1
        z += alto_fila
    grano = E.rng.random((PH_, PW)).astype(np.float32)
    for s in (-1, 1):
        d = s * xs - X_LOSA
        bordillo = (d >= 0) & (d < 0.25)
        a[bordillo] = (np.array((0.74, 0.73, 0.7), np.float32) * (0.9 + 0.16 * grano[bordillo][..., None]))
        a[bordillo & ((zs * (1 / 1.2)) % 1 < 0.03)] *= 0.55
        banda = d >= 0.25
        # Las olas de Copacabana: franjas negras y blancas que serpentean a lo largo.
        negro = np.floor((d - 0.25 - 0.2 * np.sin(zs * 2 * math.pi / 3.4)) / 0.44) % 2 == 0
        tesela = np.where(((xs * 7) % 1 < 0.16) | ((zs * 7) % 1 < 0.16), 0.78, 1.0) * (0.86 + 0.24 * grano)
        a[banda & negro] = np.array((0.2, 0.2, 0.21), np.float32) * tesela[banda & negro][..., None] * 1.15
        a[banda & ~negro] = np.array((0.8, 0.78, 0.72), np.float32) * tesela[banda & ~negro][..., None]
    # El tiempo: suciedad a manchas grandes, el centro más pisado y verdín junto a los bordes.
    a *= (0.86 + 0.22 * nube(PH_, PW, 24, 6))[..., None]
    a *= (1 + 0.05 * np.exp(-(xs / 4.0) ** 2))[..., None]
    verdin = np.clip((np.abs(xs) - 5.2) / 2.0, 0, 1) * np.clip((nube(PH_, PW, 44, 11) - 0.42) * 4, 0, 1) * 0.42
    a = a * (1 - verdin[..., None]) + np.array((0.3, 0.36, 0.22), np.float32) * verdin[..., None]
    def mancha (x, z, r_, k, forma=1.0, hacia=None):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        m = ((1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
        a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - m) + (0 if hacia is None else np.array(hacia, np.float32) * m)
    for _ in range(46):
        mancha(random.uniform(-7, 7), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.1), random.uniform(0.8, 0.93), random.uniform(0.6, 1.6))
    for x, z, r_ in ((-4.4, -9.0, 1.2), (3.2, -27.0, 1.5), (-2.4, -47.0, 1.0), (5.4, 3.0, 0.9)):   # charcos: oscuros, con el cielo dentro
        mancha(x, z, r_ * 1.25, 0.72, 1.4)
        mancha(x, z, r_, 0.55, 1.4, hacia=(0.46, 0.58, 0.7))
    for x, z, r_ in ((-3.6, -16.0, 1.5), (4.4, -36.0, 1.6), (-0.8, -55.0, 1.4)):                   # quemaduras
        mancha(x, z, r_ * 1.6, 0.78, 1.1)
        mancha(x, z, r_, 0.38)
    for _ in range(26):                                                                         # grietas
        x, z, rumbo = random.uniform(-7, 7), random.uniform(PZ0 + 1, PZ1 - 1), random.uniform(0, 6.28)
        for _ in range(random.randint(30, 110)):
            c, f_ = a_px(x, z)
            if 2 < c < PW - 2 and 2 < f_ < PH_ - 2:
                a[f_ - 1:f_ + 1, c - 1:c + 1] *= 0.55
            rumbo += random.uniform(-0.5, 0.5)
            x += 0.025 * math.cos(rumbo); z += 0.025 * math.sin(rumbo)
    for x, z in ((-6.6, -4.0), (6.6, -22.0), (-6.6, -40.0), (6.6, -58.0)):                          # rejillas de desagüe
        (c0, f0), (c1, f1) = a_px(x - 0.3, z - 0.2), a_px(x + 0.3, z + 0.2)
        a[f0:f1, c0:c1] = (0.07, 0.07, 0.07)
        a[f0:f1, c0:c1:4] = (0.3, 0.3, 0.3)
    return guardar('pista', np.clip(a, 0, 1), 86)

def tex_esteatita ():
    """La piel del Cristo: teselas de esteatita, gris verdoso muy claro, con las aguas de la lluvia."""
    n = 256
    a = lienzo(n, n, (0.78, 0.8, 0.74)) * (0.88 + 0.16 * nube(n, n, 6, 6))[..., None]
    a *= (0.93 + 0.1 * E.rng.random((n, n)).astype(np.float32))[..., None]
    a *= (0.86 + 0.16 * nube(2, n, 1, 24)[0])[None, :, None]                # chorreras verticales
    return guardar('esteatita', np.clip(a, 0, 1), 88)

def tex_bandera ():
    a, elipse, poligono, trazo = lienzo_dibujo(180, 256, (0.0, 0.42, 0.18))
    poligono([(128, 16), (236, 90), (128, 164), (20, 90)], (0.98, 0.82, 0.05))
    elipse(128, 90, 42, 42, (0.04, 0.14, 0.5))
    trazo([(88, 82), (108, 80), (128, 84), (148, 92), (168, 104)], (0.95, 0.95, 0.95), 3.5)
    return guardar('bandera', a, 88)

def tex_tren ():
    """El costado del tren del Corcovado: rojo, con la franja de ventanas."""
    a, elipse, poligono, trazo = lienzo_dibujo(64, 256, (0.7, 0.07, 0.06))
    a[38:] = (0.5, 0.05, 0.05)
    a[58:] = (0.08, 0.08, 0.08)
    a[10:13] = (0.9, 0.86, 0.72)
    for c in range(8, 250, 30):
        a[15:34, c:c + 22] = (0.1, 0.14, 0.17)
        a[15:19, c:c + 22] = (0.36, 0.46, 0.52)
    return guardar('tren', a, 88)

def tex_ciudad ():
    """La zona sur desde arriba: manzanas de azoteas claras entre calles, con algún parque."""
    n = 512
    a = lienzo(n, n, (0.3, 0.31, 0.31))
    p = n // 8
    for i in range(8):
        for j in range(8):
            t = random.random()
            c = (0.2, 0.34, 0.16) if t < 0.1 else random.choice(((0.62, 0.6, 0.56), (0.56, 0.54, 0.5), (0.66, 0.6, 0.52), (0.5, 0.5, 0.52), (0.6, 0.44, 0.36)))
            a[i * p + 5:(i + 1) * p - 5, j * p + 5:(j + 1) * p - 5] = c
            for _ in range(5):                                             # las casas de cada manzana
                y, x = i * p + random.randint(6, p - 22), j * p + random.randint(6, p - 22)
                a[y:y + random.randint(8, 16), x:x + random.randint(8, 16)] *= random.uniform(0.8, 1.15)
    a *= (0.9 + 0.2 * nube(n, n, 5, 5))[..., None]
    return guardar('ciudad', np.clip(a, 0, 1), 84)

def tex_mar ():
    n = 256
    a = lienzo(n, n, (0.13, 0.4, 0.6)) * (0.9 + 0.2 * nube(n, n, 5, 5))[..., None]
    a *= (0.97 + 0.06 * E.rng.random((n, n)).astype(np.float32))[..., None]
    return guardar('mar', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.9)
GRANITO = material('granito', de_polyhaven('rock_tile_floor', 512, 0xb8b4ac, 0.5), rug=0.9)
ESTEATITA = material('esteatita', tex_esteatita(), rug=0.7)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0x74706a, 0.6), rug=1.0)
BANDERA = material('bandera', tex_bandera(), rug=0.9)
TREN = material('tren', tex_tren(), rug=0.5)
CIUDAD_S = material('ciudad-suelo', tex_ciudad(), rug=1.0)
MAR = material('mar', tex_mar(), rug=0.2)
# OJO: los colores lisos van en LINEAL.
PIEDRA_C = material('esteatita-lisa', color=(0.5, 0.52, 0.46), rug=0.7)
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
HIERRO = material('hierro', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
BRONCE = material('bronce', color=(0.08, 0.07, 0.04), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
SELVA = [material(f'selva-{i}', color=c, rug=1.0) for i, c in enumerate([(0.03, 0.1, 0.03), (0.04, 0.13, 0.04), (0.06, 0.16, 0.05)])]
IPE = material('ipe', color=(0.85, 0.6, 0.03), rug=1.0)                              # el ipê amarillo, en flor
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
MADERA = material('madera', color=(0.16, 0.1, 0.05), rug=0.9)
COCO = material('coco', color=(0.1, 0.3, 0.05), rug=0.7)
AMARILLO = material('amarillo', color=(0.9, 0.62, 0.02), rug=0.8)
VERDE_B = material('verde-bandera', color=(0.0, 0.3, 0.08), rug=0.8)
TECHO_T = material('techo-tren', color=(0.6, 0.58, 0.52), rug=0.6)
HORMIGON = material('hormigon', color=(0.42, 0.41, 0.39), rug=1.0)
PLUMA = {k: material(f'pluma-{k}', color=c, rug=0.8) for k, c in
         dict(rojo=(0.75, 0.03, 0.02), azul=(0.02, 0.16, 0.7), oro=(0.95, 0.6, 0.02), negro=(0.02, 0.02, 0.02), blanco=(0.9, 0.9, 0.86)).items()}
MONTE_S = material('monte-selva', color=(0.05, 0.14, 0.06), rug=1.0)
MONTE_R = material('monte-roca', color=(0.3, 0.28, 0.26), rug=1.0)
MONTE_L = material('monte-lejos', color=(0.22, 0.32, 0.4), rug=1.0)
LAGUNA = material('laguna', color=(0.14, 0.34, 0.44), rug=0.1)
ARENA = material('arena-playa', color=(0.86, 0.8, 0.62), rug=1.0)
BOSQUE = material('bosque-llano', color=(0.06, 0.17, 0.07), rug=1.0)
CIUDAD = [material(f'ciudad-{i}', color=c, rug=0.9) for i, c in enumerate([(0.42, 0.4, 0.37), (0.34, 0.34, 0.35), (0.44, 0.37, 0.3), (0.28, 0.3, 0.34), (0.5, 0.48, 0.44)])]   # apagados: claros y en fila parecían lápidas
FAVELA = [material(f'favela-{i}', color=c, rug=0.9) for i, c in enumerate([(0.6, 0.3, 0.2), (0.7, 0.55, 0.3), (0.3, 0.45, 0.6), (0.65, 0.62, 0.55), (0.5, 0.25, 0.3), (0.3, 0.5, 0.35)])]
ALA = [material(f'ala-{i}', color=c, rug=0.8) for i, c in enumerate([(0.9, 0.2, 0.05), (0.95, 0.8, 0.05)])]
NUBE = material('nube', color=(0.9, 0.92, 0.95), rug=1.0)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.9, 0.96)), (0.07, (0.66, 0.84, 0.98)), (0.25, (0.4, 0.68, 0.96)), (0.6, (0.2, 0.48, 0.9)), (1.0, (0.1, 0.34, 0.8))],
    (SOL[0], SOL[2]), 0.42, (0.3, 0.26, 0.16), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.16), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA TERRAZA
# ==================================================================================
Z_ATRAS = 60.0                                                                      # de aquí hacia atrás, las escaleras
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
rect('P', GRANITO, PX0, PX1, PZ1, Z_ATRAS, 0.0, 3.0)
for s in (-1, 1):
    rect('P', GRANITO, min(s * 9.2, s * (BORDE + 0.4)), max(s * 9.2, s * (BORDE + 0.4)), Z_FIN, Z_ATRAS, 0.0, 3.0)
def balaustrada (s, z0, z1):
    viga('P', GRANITO, min(s * BORDE, s * (BORDE + 0.36)), max(s * BORDE, s * (BORDE + 0.36)), z0, z1, 0.0, 0.3, u_m=2.0, techo=GRANITO)
    viga('P', GRANITO, min(s * BORDE, s * (BORDE + 0.36)), max(s * BORDE, s * (BORDE + 0.36)), z0, z1, 0.9, 1.06, u_m=2.0, techo=GRANITO)
    z = z0 + 0.3
    while z < z1:
        barra('EV', PIEDRA_C, P(s * (BORDE + 0.18), z, 0.3), P(s * (BORDE + 0.18), z, 0.9), 0.16)
        z += 0.6
balaustrada(-1, Z_FIN, Z_ATRAS)
balaustrada(1, Z_FIN, BASE[1] - R_MIR + 0.8)
balaustrada(1, BASE[1] + R_MIR - 0.8, Z_ATRAS)
def farola (x, z, alto=4.4):
    torno('EV', HIERRO, en(x, z), [(0.22, 0.0), (0.16, 0.5), (0.07, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', FAROL, x, z, alto + 0.24, 0.24, 0.3, sub=1, baila=0.0)
def catalejo (x, z, s):
    barra('EV', HIERRO, P(x, z, 0.0), P(x, z, 1.3), 0.12)
    barra('EV', BRONCE, P(x - s * 0.1, z, 1.4), P(x + s * 0.5, z, 1.56), 0.2)
for z in np.arange(4.0, -66.0, -16.0):
    farola(-9.0, float(z))
    catalejo(-9.1, float(z) - 6.0, -1)
    if abs(z - BASE[1]) > 9.0:
        farola(9.0, float(z))
# El mirador redondo de la base alien, volado sobre el vacío.
N_M = 28
circ = [(BASE[0] + R_MIR * math.cos(2 * math.pi * i / N_M), BASE[1] + R_MIR * math.sin(2 * math.pi * i / N_M)) for i in range(N_M)]
MIRADOR = material('mirador', imagen_de(GRANITO), rug=0.9)
prisma('P', ROCA, circ, -44.0, 0.05, techo=MIRADOR, baldosa=4.0)
for i in range(N_M):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_M]
    if (ax + bx) / 2 > BORDE + 0.6:
        barra('EV', PIEDRA_C, P(ax, az, 0.98), P(bx, bz, 0.98), 0.2)
        barra('EV', PIEDRA_C, P(ax, az, 0.05), P(ax, az, 0.98), 0.16)
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.08)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.82), f(ax, az, 0.82)], hacia=ARRIBA)

# --- lo típico -------------------------------------------------------------------
# La bandera, en su mástil (por encima de los cuatro metros: debajo andan los alienz).
barra('EV', HIERRO, P(-9.3, -34.0, 0.0), P(-9.3, -34.0, 7.6), 0.14)
cara('EP', BANDERA, [P(-9.2, -34.0, 5.6), P(-6.5, -34.0, 5.6), P(-6.5, -34.0, 7.5), P(-9.2, -34.0, 7.5)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
cara('EP', BANDERA, [P(-9.2, -34.02, 5.6), P(-6.5, -34.02, 5.6), P(-6.5, -34.02, 7.5), P(-9.2, -34.02, 7.5)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, 1, 0)))
# El carrito de agua de coco, con su sombrilla.
def carrito (x, z, s):
    viga('EV', MADERA, x - 0.6, x + 0.6, z - 0.4, z + 0.4, 0.35, 1.0, tapas=True)
    for dx, dz in ((-0.5, 0.45), (0.5, 0.45)):
        torno('EV', HIERRO, en(x + dx, z + dz, 0.3, 0.0, (math.pi / 2, 0.0)), [(0.3, -0.04), (0.3, 0.04)], lados=10)
    for k in range(9):
        elipsoide('EV', COCO, en(x - 0.4 + 0.2 * (k % 5), z - 0.15 + 0.3 * (k // 5), 1.1 + 0.02 * (k % 2)), (0.13, 0.13, 0.15))
    x_s = x + s * 0.7                                                                 # la sombrilla, del lado de la balaustrada
    barra('EV', HIERRO, P(x_s, z, 0.0), P(x_s, z, 2.5), 0.06)
    for k in range(8):                                                               # la sombrilla, a gajos verdes y amarillos
        a0, a1 = 2 * math.pi * k / 8, 2 * math.pi * (k + 1) / 8
        cara('EV', AMARILLO if k % 2 else VERDE_B, [P(x_s, z, 2.7), P(x_s + 1.05 * math.cos(a0), z + 1.05 * math.sin(a0), 2.3), P(x_s + 1.05 * math.cos(a1), z + 1.05 * math.sin(a1), 2.3)], hacia=ARRIBA)
carrito(-8.3, -11.0, -1)
carrito(8.3, -24.0, 1)
# Guacamayos en la balaustrada: el rojo y el azul y amarillo.
def guacamayo (x, z, y, cuerpo, pecho, giro):
    c, s = math.cos(giro), math.sin(giro)
    elipsoide('EV', PLUMA[cuerpo], en(x, z, y + 0.3, giro, (0.5, 0.0)), (0.13, 0.15, 0.26))
    elipsoide('EV', PLUMA[pecho], en(x - s * 0.05, z + c * 0.05, y + 0.28, giro, (0.5, 0.0)), (0.1, 0.12, 0.2))
    elipsoide('EV', PLUMA[cuerpo], en(x - s * 0.08, z + c * 0.08, y + 0.58), (0.11, 0.11, 0.11))
    elipsoide('EV', PLUMA['blanco'], en(x - s * 0.16, z + c * 0.16, y + 0.57), (0.06, 0.06, 0.07))
    barra('EV', PLUMA['negro'], P(x - s * 0.17, z + c * 0.17, y + 0.56), P(x - s * 0.27, z + c * 0.27, y + 0.46), 0.07)
    barra('EV', PLUMA[cuerpo], P(x + s * 0.1, z - c * 0.1, y + 0.16), P(x + s * 0.3, z - c * 0.3, y - 0.42), 0.09)
for x, z, cu, pe, g in ((-9.78, -18.0, 'rojo', 'oro', 1.4), (-9.78, -19.0, 'azul', 'oro', 1.8), (9.78, -30.5, 'azul', 'oro', -1.5), (-9.78, -52.0, 'rojo', 'azul', 1.2), (9.78, -8.0, 'rojo', 'oro', -1.7)):
    guacamayo(x, z, 1.06, cu, pe, g)
# Bancos de piedra, pegados a la balaustrada.
for s, z in ((-1, -2.0), (1, -14.0), (-1, -26.0), (-1, -44.0), (1, -58.0)):
    viga('P', GRANITO, min(s * 8.3, s * 9.1), max(s * 8.3, s * 9.1), z - 1.1, z + 1.1, 0.42, 0.56, u_m=2.0, techo=GRANITO)
    for dz in (-0.8, 0.8):
        viga('P', GRANITO, min(s * 8.45, s * 8.95), max(s * 8.45, s * 8.95), z + dz - 0.12, z + dz + 0.12, 0.0, 0.42, u_m=2.0, tapas=False)
# El tren del Corcovado en su apeadero, a la izquierda y por debajo de la terraza.
X_TREN, Y_VIA = -12.9, -4.3
viga('FV', HORMIGON, -15.6, -9.96, -66.0, -14.0, Y_VIA - 0.6, Y_VIA, u_m=3.0)
for dx in (-0.6, 0.6):
    barra('FV', HIERRO, P(X_TREN + dx, -66.0, Y_VIA + 0.08), P(X_TREN + dx, -14.0, Y_VIA + 0.08), 0.12)
for z0 in (-62.0, -47.0):
    viga('EV', TREN, X_TREN - 1.3, X_TREN + 1.3, z0, z0 + 14.0, Y_VIA + 0.35, Y_VIA + 3.1, u_m=14.0, techo=TECHO_T)
    viga('EV', TECHO_T, X_TREN - 0.9, X_TREN + 0.9, z0 + 0.6, z0 + 13.4, Y_VIA + 3.1, Y_VIA + 3.32, tapas=True)
for z in np.arange(-30.0, -15.0, 4.0):                                               # la marquesina del andén
    barra('FV', HIERRO, P(-10.6, float(z), Y_VIA), P(-10.6, float(z), Y_VIA + 3.0), 0.12)
viga('FV', TECHO_T, -12.2, -10.1, -31.0, -16.0, Y_VIA + 3.0, Y_VIA + 3.15, tapas=True)

# ==================================================================================
# 3. LA ESCALINATA Y EL CRISTO REDENTOR
# ==================================================================================
# Del final de la terraza baja una escalinata a la plazoleta de la estatua.
N_ESC = 15
for k in range(N_ESC):
    y1 = -k * (-Y_PLAZA / N_ESC)
    viga('K', GRANITO, -7.0, 7.0, Z_FIN - 0.42 * (k + 1), Z_FIN - 0.42 * k, y1 + Y_PLAZA / N_ESC - 0.4, y1 + Y_PLAZA / N_ESC, u_m=2.0, techo=GRANITO)
for s in (-1, 1):                                                                    # el frente de la terraza, a los lados de la escalinata
    viga('P', GRANITO, min(s * 7.0, s * (BORDE + 0.36)), max(s * 7.0, s * (BORDE + 0.36)), Z_FIN - 0.36, Z_FIN, 0.0, 1.06, u_m=2.0, techo=GRANITO)
R_PLAZA = 14.0
plaza = [(-7.0, Z_FIN - 6.0), (7.0, Z_FIN - 6.0)] + [(R_PLAZA * math.sin(a), ZC + R_PLAZA * math.cos(a)) for a in np.linspace(0.5, 2 * math.pi - 0.5, 30)]
PLAZA = material('plaza', imagen_de(GRANITO), rug=0.9)
prisma('K', ROCA, plaza, -40.0, Y_PLAZA, techo=PLAZA, baldosa=4.0)
for i in range(2, len(plaza) - 1):                                                   # su barandilla
    (ax, az), (bx, bz) = plaza[i], plaza[i + 1]
    barra('EV', PIEDRA_C, P(ax, az, Y_PLAZA + 1.0), P(bx, bz, Y_PLAZA + 1.0), 0.2)
    barra('EV', PIEDRA_C, P(ax, az, Y_PLAZA), P(ax, az, Y_PLAZA + 1.0), 0.16)
# --- la estatua ---------------------------------------------------------------------
# De MESHY (10/10, 60 créditos; Isidro: «haz todas estas con Meshy»): la esculpida
# aquí por código —piezas fundidas con un remallado por vóxeles— había mejorado
# mucho, pero la cara y las manos seguían siendo sencillas (está en el historial
# de git). El modelo trae su pedestal; va en un grupo `vert`: conserva su textura
# y le cae la luz del sitio en los vértices.
ALTO_CRISTO = 26.0
cristo = importar(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'cristo.glb'), 'KV', ALTO_CRISTO, 0.0, ZC)
cristo.data.transform(M.Translation((0, 0, Y_PLAZA)))
vs = np.array([v.co[:] for v in cristo.data.vertices])
print('CRISTO', len(cristo.data.polygons), 'caras; de mano a mano', round(float(vs[:, 0].max() - vs[:, 0].min()), 1), '; fondo', round(float(vs[:, 1].min()), 1), round(float(vs[:, 1].max()), 1))

comprobar_paso(('E', 'EP', 'P', 'EV', 'K'))

# ==================================================================================
# 4. EL MONTE Y LO QUE SE VE DESDE ARRIBA (jugando también: va en el modelo de juego)
# ==================================================================================
# La roca que sostiene la terraza: paredes a pico y, debajo, el monte.
contorno = [(-(BORDE + 0.4), Z_ATRAS), (BORDE + 0.4, Z_ATRAS), (BORDE + 0.4, Z_FIN - 0.4), (-(BORDE + 0.4), Z_FIN - 0.4)]
prisma('FV', ROCA, contorno, -44.0, -0.02, baldosa=5.0)
prisma('FV', ROCA, [(-7.0, Z_FIN - 0.3), (7.0, Z_FIN - 0.3), (7.0, Z_FIN - 6.4), (-7.0, Z_FIN - 6.4)], -44.0, Y_PLAZA - 0.3, baldosa=5.0)
monte('FV', MONTE_R, 0.0, -10.0, 190.0, -26.0 - ABAJO, y0=ABAJO, seg=16, anillos=6, pico=1.0)
monte('FV', MONTE_R, 0.0, -98.0, 150.0, -30.0 - ABAJO, y0=ABAJO, seg=16, anillos=6, pico=1.0)
monte('FV', MONTE_S, -30.0, -120.0, 760.0, 150.0, y0=ABAJO, seg=18, anillos=5, pico=0.9)
for cx, cz, radio, alto in ((-330.0, 180.0, 380.0, 170.0), (260.0, 330.0, 420.0, 190.0), (-520.0, -160.0, 360.0, 130.0), (520.0, 60.0, 380.0, 150.0), (-160.0, 620.0, 460.0, 210.0)):
    monte('FV', MONTE_S, cx, cz, radio, alto, y0=ABAJO, seg=18, anillos=5, pico=0.9)     # el macizo de Tijuca
def fuera_de_todo (x, z, margen=1.5):
    if abs(x) < BORDE + margen and Z_FIN - margen < z < Z_ATRAS + margen:
        return False
    if math.hypot(x, z - ZC) < R_PLAZA + margen or (abs(x) < 7.0 + margen and ZC < z < Z_FIN):
        return False
    if math.hypot(x - BASE[0], z - BASE[1]) < R_MIR + margen:
        return False
    return not (-17.0 - margen < x < -9.0 and -68.0 - margen < z < -12.0 + margen)    # el apeadero
n_copas = 0
for _ in range(900):                                                                 # la selva, pegada a la roca
    x, z = random.uniform(-70, 70), random.uniform(-150, 90)
    r = random.uniform(2.6, 5.0)
    if not fuera_de_todo(x, z, r + 0.6):                                             # que ninguna copa asome por un suelo
        continue
    d = max(abs(x) - BORDE, 0.0) if Z_FIN < z < Z_ATRAS else math.hypot(max(abs(x) - BORDE, 0.0), min(abs(z - Z_FIN), abs(z - Z_ATRAS)))
    if z < Z_FIN:
        d = min(d, max(0.0, math.hypot(x, z - ZC) - R_PLAZA))
    if d > 46 or random.random() < d / 60:
        continue
    y = -4.5 - d * 0.75 - random.uniform(0, 3) + (Y_PLAZA if z < Z_FIN else 0.0)
    copa('FV', IPE if random.random() < 0.05 else random.choice(SELVA), x, z, y, r, r * random.uniform(0.6, 0.85), sub=1)
    n_copas += 1
for x, z, alto, y in ((-12.4, -6.0, 9.0, -6.0), (-13.5, 4.0, 10.0, -7.0), (12.2, -12.0, 8.0, -6.5), (13.0, -64.0, 9.0, -7.0), (-12.0, -74.0, 9.0, -8.0), (12.6, 6.0, 9.5, -7.0), (-17.5, -40.0, 9.0, -9.0)):
    palmera('FV', TRONCO, SELVA[1:], x, z, alto=alto, y=y)
print('COPAS', n_copas)

# El mar, y la zona sur al frente: la ciudad entre los morros, la laguna y las playas.
rect('FP', MAR, -7600.0, 7600.0, -7600.0, 7600.0, ABAJO, 700.0)
rect('FP', BOSQUE, -2600.0, 2600.0, -1000.0, 2600.0, ABAJO + 3.0, 300.0)               # Tijuca, a la espalda y al pie
def costa (x):
    return -2560.0 - 110.0 * math.cos(x / 330.0) - 70.0 * math.sin(x / 140.0 + 1.0)
xs_c = list(np.arange(-2600.0, 2601.0, 100.0))
for x0, x1 in zip(xs_c, xs_c[1:]):
    cara('FP', CIUDAD_S if abs(x0 + 50) < 1500 else BOSQUE, [P(x0, -1000.0, ABAJO + 4.0), P(x1, -1000.0, ABAJO + 4.0), P(x1, costa(x1), ABAJO + 4.0), P(x0, costa(x0), ABAJO + 4.0)], hacia=ARRIBA, baldosa=480.0)
    cara('FP', ARENA, [P(x0, costa(x0) + 6.0, ABAJO + 6.0), P(x1, costa(x1) + 6.0, ABAJO + 6.0), P(x1, costa(x1) - 34.0, ABAJO + 6.0), P(x0, costa(x0) - 34.0, ABAJO + 6.0)], hacia=ARRIBA)
lx, lz = polar(-6.5, 2330.0)                                                         # la laguna Rodrigo de Freitas
cara('FP', LAGUNA, [P(lx + 230 * math.cos(a) * (1 + 0.12 * math.sin(3 * a)), lz + 130 * math.sin(a), ABAJO + 8.0) for a in np.linspace(0, 2 * math.pi, 22)[:-1]], hacia=ARRIBA)
morros = []
for grados, d, radio, alto, mat, pico in (
        (-10.4, 2640.0, 120.0, 200.0, MONTE_R, 0.55), (-8.9, 2570.0, 105.0, 150.0, MONTE_R, 0.6),      # Dois Irmãos
        (10.2, 2300.0, 170.0, 150.0, MONTE_S, 0.7), (3.4, 2380.0, 140.0, 100.0, MONTE_S, 0.7), (-2.6, 2470.0, 120.0, 90.0, MONTE_S, 0.7),
        (-17.0, 2200.0, 260.0, 190.0, MONTE_S, 0.8), (17.0, 2100.0, 260.0, 170.0, MONTE_S, 0.8), (150.0 / 20, 700.0, 130.0, 95.0, MONTE_S, 0.7)):
    x, z = polar(grados, d)
    morros.append((x, z, radio, monte('FV', mat, x, z, radio, alto, y0=ABAJO, seg=14, anillos=6, pico=pico)))
# El Pan de Azúcar y el morro de Urca, en la boca de la bahía, sobre su lengua de tierra.
px, pz = polar(6.6, 3300.0)
ux, uz = polar(4.3, 3080.0)
monte('FV', MONTE_R, px, pz, 115.0, 205.0, y0=ABAJO, seg=14, anillos=8, pico=0.4)
monte('FV', MONTE_R, ux, uz, 110.0, 95.0, y0=ABAJO, seg=14, anillos=5, pico=0.5)
cara('FP', BOSQUE, [P(ux - 150, costa(ux) + 10, ABAJO + 4.0), P(ux + 260, costa(ux) + 10, ABAJO + 4.0), P(px + 150, pz - 120, ABAJO + 4.0), P(px - 60, pz - 150, ABAJO + 4.0), P(ux - 170, uz - 60, ABAJO + 4.0)], hacia=ARRIBA)
barra('FV', HIERRO, P(ux, uz, ABAJO + 98.0), P(px, pz, ABAJO + 207.0), 0.8)            # el cable del bondinho
cubo('FV', AMARILLO, P((ux + px) / 2, (uz + pz) / 2, ABAJO + 148.0), (7.0, 7.0, 5.0))
def en_un_morro (x, z, margen=0.0):
    return any(math.hypot(x - mx, z - mz) < r + margen for mx, mz, r, _ in morros)
n_ed = 0
for gx in np.arange(-1500.0, 1500.0, 60.0):
    for gz in np.arange(-2640.0, -1040.0, 60.0):
        x, z = gx + 30.0, gz + 30.0
        orilla = z < costa(x) + 260.0
        if z < costa(x) + 30.0 or en_un_morro(x, z) or math.hypot((x - lx) / 250.0, (z - lz) / 150.0) < 1.0 or random.random() > (0.8 if orilla else 0.3):
            continue
        a = random.uniform(11.0, 17.0)
        alto = random.uniform(24.0, 46.0) if orilla else random.uniform(8.0, 24.0)
        cubo('FV', random.choice(CIUDAD), P(x + random.uniform(-16, 16), z + random.uniform(-16, 16), ABAJO + 4.0 + alto / 2), (a, a * random.uniform(0.7, 1.5), alto), random.choice((0.0, 0.0, 0.5)))
        n_ed += 1
# Las favelas, subiendo por la falda de dos morros.
n_fav = 0
for mx, mz, radio, altura in (morros[2], morros[7]):
    for _ in range(90):
        a, d = random.uniform(0.2, 2.9), random.uniform(0.45, 0.95) * radio                # la cara que mira a la cámara
        x, z = mx + d * math.cos(a), mz + d * math.sin(a)
        y = altura(x, z)
        if y is None:
            continue
        t = random.uniform(6.0, 10.0)
        cubo('FV', random.choice(FAVELA), P(x, z, y + t * 0.3), (t, t, t * 0.8), random.uniform(0, 1.5))
        n_fav += 1
print('EDIFICIOS', n_ed, 'FAVELA', n_fav)
# Las islas de fuera, y las sierras del otro lado de la bahía cerrando el horizonte.
for grados, d, radio, alto in ((-4.0, 4000.0, 100.0, 60.0), (-0.8, 4300.0, 80.0, 45.0), (2.6, 4500.0, 110.0, 70.0), (-13.0, 3900.0, 120.0, 60.0)):
    x, z = polar(grados, d)
    monte('FV', MONTE_L, x, z, radio, alto, y0=ABAJO, seg=12, anillos=4, pico=0.7)
for g0, d0, g1, d1, alto in ((-42.0, 5200.0, -9.0, 5600.0, 330.0), (-13.0, 5900.0, 14.0, 5700.0, 360.0), (10.0, 5500.0, 44.0, 5200.0, 340.0), (-80.0, 4200.0, -40.0, 5000.0, 300.0), (40.0, 5000.0, 80.0, 4200.0, 300.0)):
    (x0, z0), (x1, z1) = polar(g0, d0), polar(g1, d1)
    sierra('FV', MONTE_L, x0, z0, x1, z1, 520.0, alto, y0=ABAJO)
monte('FV', MONTE_L, -600.0, 3000.0, 1500.0, 400.0, y0=ABAJO, seg=18, anillos=5, pico=0.9)
for _ in range(16):                                                                  # jirones de nube por debajo de la terraza
    x, z = random.uniform(-900.0, 900.0), random.uniform(-1400.0, 500.0)
    if math.hypot(x, z + 20.0) < 160.0 or (abs(x) < 260.0 and z < 0.0):
        continue
    y = random.uniform(-170.0, -70.0)
    for _ in range(5):
        elipsoide('FV', NUBE, en(x + random.uniform(-40, 40), z + random.uniform(-30, 30), y + random.uniform(-6, 6)), (random.uniform(30, 60), random.uniform(24, 44), random.uniform(8, 14)))
# Dos alas delta, planeando sobre la selva.
for (x, z, y, giro, mat) in ((-52.0, -150.0, -12.0, 0.5, ALA[0]), (70.0, -230.0, -30.0, -0.7, ALA[1])):
    c, s = math.cos(giro), math.sin(giro)
    pt = lambda a, b, h=0.0: P(x + a * c - b * s, z + a * s + b * c, y + h)
    cara('EP', mat, [pt(0, 3.0, 0.4), pt(-5.0, -2.0), pt(0, -0.6, 0.2)], hacia=ARRIBA)
    cara('EP', mat, [pt(0, 3.0, 0.4), pt(0, -0.6, 0.2), pt(5.0, -2.0)], hacia=ARRIBA)
    barra('EV', NEGRO, pt(0, 0.6, -1.2), pt(0, -1.2, -1.3), 0.4)

cupula('CP', CIELO, 7000.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'K': ('luzK-plaza', 'atlas', 'luzK'),
        'KV': ('vert-cristo', 'vert', None),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'FV': ('vert-lejos', 'vert', None),
        'FP': ('planoF', 'plano', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-rio', ['P', 'K', 'KV', 'EV', 'EP', 'FV', 'FP']), ('lugar-rio-ciudad', ['CP'])],
    # De día, la receta de Salónica: sol fuerte y algo dorado, cielo muy flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.72), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP', 'FP'), suaves=('monte-selva', 'monte-roca', 'monte-lejos', 'nube'), fundir=True)
