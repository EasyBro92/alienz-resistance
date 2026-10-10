# Río de Janeiro: lo alto del Corcovado, a los pies del Cristo (10/10/2026).
#   blender -b -P herramientas/blender/lugar_rio.py              (entero)
#   blender -b -P herramientas/blender/lugar_rio.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_rio.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Río es el Cristo Redentor con los brazos abiertos sobre la bahía. La
# misión era Copacabana (el paseo, con el Cristo lejos, de adorno): ahora se juega
# ARRIBA, en el mirador, con la estatua de frente. Los alienz, EN NAVE; por la
# MAÑANA, con el día limpio.
#
# Cómo está puesto. Se mira a la estatua por la terraza:
#   · EL CRISTO VA A UN TERCIO DE SU TAMAÑO (12,6 m con el pedestal; mide 38):
#     entero, con los brazos abiertos (9,4 m de mano a mano), en el hueco que deja
#     el marcador;
#   · la terraza de piedra, ensanchada para los cinco carriles, con sus
#     balaustradas, las farolas y los catalejos; la base alien, en un mirador
#     redondo que vuela sobre el vacío a la derecha;
#   · alrededor, nada: el monte cae a pico. Abajo, en la llegada, la selva de
#     Tijuca, la ciudad, la laguna, el Pan de Azúcar y la bahía.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.42, 0.62, 0.66)                 # media mañana: a la espalda y a la derecha
iniciar('rio', 4433, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.1, 0.14, 0.2))

BORDE = 9.6                              # la balaustrada de la terraza
ZC = -84.0                               # el Cristo
ABAJO = -230.0                           # el nivel del mar, visto desde arriba (el Corcovado, a escala)
BASE = (12.6, -44.0)
R_MIR = 5.9

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La terraza: losas de granito gris claro con una greca de piedra negra y
    blanca —el dibujo de olas de las aceras de Río— a cada lado."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('rock_tile_floor', 256, 0xb8b4ac, 0.5))
    l = 1.0
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + l * KZ))
        c = -(fila % 2) * l * KX / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + l * KX))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.92, 1.06)
                a[f0:f1, c0:c0 + 1] *= 0.7
            c += l * KX
        a[f0:f0 + 1] *= 0.7
        fila += 1; f += l * KZ
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    xs, zs = PX0 + xx / KX, PZ0 + yy / KZ
    for s in (-1, 1):                                                    # la greca de olas, de piedra portuguesa
        d = s * xs - 7.3
        franja = np.abs(d) < 1.1
        ola = (d + 0.5 * np.sin(zs * 2.2)) > 0
        a[franja & ola] = np.array((0.1, 0.1, 0.1), np.float32) * (0.8 + 0.4 * nube(PH_, PW, 200, 60))[franja & ola][..., None]
        a[franja & ~ola] = np.array((0.86, 0.85, 0.82), np.float32) * (0.9 + 0.2 * nube(PH_, PW, 200, 60))[franja & ~ola][..., None]
    a *= (0.9 + 0.16 * nube(PH_, PW, 16, 4))[..., None]
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for _ in range(30):
        mancha(random.uniform(-6, 6), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.0), random.uniform(0.82, 0.93), random.uniform(0.6, 1.5))
    for x, z, r_ in ((-3.6, -14.0, 1.5), (4.0, -33.0, 1.6), (-1.0, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_esteatita ():
    """La piel del Cristo: teselas de esteatita, gris verdoso muy claro, con las aguas de la lluvia."""
    n = 128
    a = lienzo(n, n, (0.74, 0.76, 0.7)) * (0.9 + 0.14 * nube(n, n, 4, 4))[..., None]
    a[::8] *= 0.94; a[:, ::8] *= 0.94
    a *= (0.92 + 0.1 * nube(2, n, 1, 20)[0])[None, :, None]
    return guardar('esteatita', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.9)
GRANITO = material('granito', de_polyhaven('rock_tile_floor', 512, 0xb8b4ac, 0.5), rug=0.9)
ESTEATITA = material('esteatita', tex_esteatita(), rug=0.7)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0x74706a, 0.6), rug=1.0)
# OJO: los colores lisos van en LINEAL.
PIEDRA_C = material('esteatita-lisa', color=(0.5, 0.52, 0.46), rug=0.7)
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
HIERRO = material('hierro', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
BRONCE = material('bronce', color=(0.08, 0.07, 0.04), rug=0.5)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
SELVA = [material(f'selva-{i}', color=c, rug=1.0) for i, c in enumerate([(0.03, 0.1, 0.03), (0.04, 0.13, 0.04), (0.06, 0.16, 0.05)])]
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
MONTE_S = material('monte-selva', color=(0.05, 0.14, 0.06), rug=1.0)
MONTE_R = material('monte-roca', color=(0.3, 0.28, 0.26), rug=1.0)
MONTE_L = material('monte-lejos', color=(0.3, 0.38, 0.46), rug=1.0)
BAHIA = material('bahia', color=(0.16, 0.42, 0.6), rug=0.1)                           # el mar, desde arriba (va sin luz)
LAGUNA = material('laguna', color=(0.14, 0.34, 0.44), rug=0.1)
ARENA = material('arena-playa', color=(0.86, 0.8, 0.62), rug=1.0)
CIUDAD = [material(f'ciudad-{i}', color=c, rug=0.9) for i, c in enumerate([(0.52, 0.5, 0.46), (0.44, 0.44, 0.44), (0.54, 0.48, 0.4), (0.38, 0.4, 0.44)])]
NUBE = material('nube', color=(0.9, 0.92, 0.95), rug=1.0)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.9, 0.96)), (0.07, (0.66, 0.84, 0.98)), (0.25, (0.4, 0.68, 0.96)), (0.6, (0.2, 0.48, 0.9)), (1.0, (0.1, 0.34, 0.8))],
    (SOL[0], SOL[2]), 0.42, (0.3, 0.26, 0.16), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.16), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA TERRAZA
# ==================================================================================
Z_ATRAS = 60.0                                                                      # de aquí hacia atrás, las escaleras
Z_FIN = ZC - 10.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
rect('P', GRANITO, PX0, PX1, Z_FIN, PZ0, 0.0, 3.0)
rect('P', GRANITO, PX0, PX1, PZ1, Z_ATRAS, 0.0, 3.0)
for s in (-1, 1):
    rect('P', GRANITO, min(s * 9.2, s * (BORDE + 0.4)), max(s * 9.2, s * (BORDE + 0.4)), Z_FIN, Z_ATRAS, 0.0, 3.0)
    cara('P', ROCA, [P(s * (BORDE + 0.4), Z_ATRAS, -8.0), P(s * (BORDE + 0.4), Z_FIN, -8.0), P(s * (BORDE + 0.4), Z_FIN, 0.0), P(s * (BORDE + 0.4), Z_ATRAS, 0.0)], hacia=V((s, 0, 0)), baldosa=5.0)
en_mirador = lambda z: abs(z - BASE[1]) < R_MIR - 0.4
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
for z in np.arange(4.0, -62.0, -16.0):
    farola(-9.0, float(z))
    catalejo(-9.1, float(z) - 6.0, -1)
    if abs(z - BASE[1]) > 9.0:
        farola(9.0, float(z))
# El mirador redondo de la base alien, volado sobre el vacío.
N_M = 28
circ = [(BASE[0] + R_MIR * math.cos(2 * math.pi * i / N_M), BASE[1] + R_MIR * math.sin(2 * math.pi * i / N_M)) for i in range(N_M)]
MIRADOR = material('mirador', imagen_de(GRANITO), rug=0.9)
prisma('P', ROCA, circ, -8.0, 0.05, techo=MIRADOR, baldosa=4.0)
for i in range(N_M):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_M]
    if (ax + bx) / 2 > BORDE + 0.6:
        barra('EV', PIEDRA_C, P(ax, az, 0.98), P(bx, bz, 0.98), 0.2)
        barra('EV', PIEDRA_C, P(ax, az, 0.05), P(ax, az, 0.98), 0.16)
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.08)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.82), f(ax, az, 0.82)], hacia=ARRIBA)

# ==================================================================================
# 3. EL CRISTO REDENTOR
# ==================================================================================
# El pedestal, con la capilla dentro, y su escalinata.
for k, (m, y0, y1) in enumerate(((5.0, 0.0, 0.3), (4.5, 0.3, 0.6), (4.0, 0.6, 0.9))):
    viga('P', GRANITO, -m, m, ZC - m, ZC + m, y0, y1, u_m=2.0, techo=GRANITO)
Y_P = 2.9
torno('P', GRANITO, en(0.0, ZC, 0.9), [(1.9, 0.0), (1.8, 0.2), (1.55, Y_P - 1.1), (1.75, Y_P - 0.9)], lados=8, u_rep=4, v_m=2.0, tapas=(False, True))
cara('EP', NEGRO, [P(-0.4, ZC + 1.72, 0.9), P(0.4, ZC + 1.72, 0.9), P(0.4, ZC + 1.66, 2.0), P(0.0, ZC + 1.64, 2.3), P(-0.4, ZC + 1.66, 2.0)], hacia=V((0, -1, 0)))   # la puerta de la capilla
# La túnica: un cuerpo de revolución aplastado, que se abre abajo y se ciñe en la cintura.
m_cuerpo = en(0.0, ZC, Y_P) @ M.Diagonal((1.0, 0.72, 1.0, 1))
torno('P', ESTEATITA, m_cuerpo, [(1.25, 0.0), (1.12, 0.6), (0.98, 2.4), (0.9, 4.4), (0.96, 5.6), (1.1, 6.5), (0.86, 7.2), (0.42, 7.6)], lados=14, u_rep=6, v_m=2.0, tapas=(True, False))
for k in range(7):                                                                   # los pliegues de la túnica, a bulto
    a_ = math.pi * (0.2 + 0.1 * k)
    barra('EV', PIEDRA_C, P(1.1 * math.cos(a_), ZC + 0.82 * math.sin(a_), Y_P + 0.1), P(0.86 * math.cos(a_), ZC + 0.66 * math.sin(a_), Y_P + 4.6), 0.1)
# La cabeza, algo inclinada, con el pelo y la barba.
Y_H = Y_P + 8.3
elipsoide('P', ESTEATITA, en(0.0, ZC, Y_P + 7.7), (0.36, 0.34, 0.4))                   # el cuello
elipsoide('P', ESTEATITA, en(0.0, ZC + 0.12, Y_H, 0.0, (0.16, 0.0)), (0.5, 0.52, 0.66), sub=2)
elipsoide('EV', PIEDRA_C, en(0.0, ZC - 0.16, Y_H + 0.1), (0.56, 0.5, 0.62))            # el pelo
elipsoide('EV', PIEDRA_C, en(0.0, ZC + 0.34, Y_H - 0.42), (0.3, 0.26, 0.3))            # la barba
RASGO = material('rasgo', color=(0.2, 0.2, 0.17), rug=1.0)                          # ojos, cejas y boca: piezas pequeñas, sin luz
for s in (-1, 1):
    elipsoide('EP', RASGO, en(s * 0.19, ZC + 0.6, Y_H + 0.1), (0.09, 0.03, 0.04))
    bloque('EP', RASGO, en(s * 0.19, ZC + 0.58, Y_H + 0.2), (0.2, 0.04, 0.035), mella=0.0)
bloque('P', ESTEATITA, en(0.0, ZC + 0.6, Y_H - 0.12), (0.1, 0.14, 0.3), mella=0.0)    # la nariz
bloque('EP', RASGO, en(0.0, ZC + 0.56, Y_H - 0.3), (0.2, 0.04, 0.03), mella=0.0)
# Los brazos, abiertos en cruz, con las mangas colgando y las manos.
Y_B = Y_P + 6.7
for s in (-1, 1):
    hombro, codo, mano = P(s * 0.9, ZC, Y_B), P(s * 2.9, ZC, Y_B + 0.05), P(s * 4.3, ZC, Y_B - 0.05)
    barra('P', ESTEATITA, hombro, codo, 0.74)
    barra('P', ESTEATITA, codo, mano, 0.56)
    cara('P', ESTEATITA, [P(s * 0.9, ZC + 0.1, Y_B - 0.3), P(s * 3.9, ZC + 0.1, Y_B - 0.26), P(s * 3.5, ZC + 0.1, Y_B - 1.0), P(s * 1.0, ZC + 0.1, Y_B - 1.5)] if s > 0 else
         [P(s * 3.9, ZC + 0.1, Y_B - 0.26), P(s * 0.9, ZC + 0.1, Y_B - 0.3), P(s * 1.0, ZC + 0.1, Y_B - 1.5), P(s * 3.5, ZC + 0.1, Y_B - 1.0)], hacia=V((0, -1, 0)), baldosa=1.0)
    cara('P', ESTEATITA, [P(s * 3.9, ZC - 0.1, Y_B - 0.26), P(s * 0.9, ZC - 0.1, Y_B - 0.3), P(s * 1.0, ZC - 0.1, Y_B - 1.5), P(s * 3.5, ZC - 0.1, Y_B - 1.0)] if s > 0 else
         [P(s * 0.9, ZC - 0.1, Y_B - 0.3), P(s * 3.9, ZC - 0.1, Y_B - 0.26), P(s * 3.5, ZC - 0.1, Y_B - 1.0), P(s * 1.0, ZC - 0.1, Y_B - 1.5)], hacia=V((0, 1, 0)), baldosa=1.0)
    elipsoide('P', ESTEATITA, en(s * 4.62, ZC, Y_B - 0.08), (0.36, 0.12, 0.22))        # la mano, abierta
print('CRISTO', round(Y_H + 0.7, 2), 'm; de mano a mano', 2 * 4.98)

comprobar_paso(('E', 'EP', 'P', 'EV'))

# ==================================================================================
# 4. EL MONTE Y LO QUE SE VE DESDE ARRIBA (solo en el vuelo)
# ==================================================================================
# El Corcovado: el pico de roca que sostiene la terraza, y sus faldas de selva.
monte('T', MONTE_R, 0.0, -20.0, 210.0, -26.0 - ABAJO, y0=ABAJO, seg=16, anillos=6, pico=1.0)
monte('T', MONTE_S, -30.0, 30.0, 330.0, 150.0, y0=ABAJO, seg=18, anillos=5, pico=0.9)
for cx, cz, radio, alto in ((-330.0, 180.0, 380.0, 170.0), (260.0, 330.0, 420.0, 190.0), (-520.0, -160.0, 360.0, 130.0), (520.0, 60.0, 380.0, 150.0), (-160.0, 620.0, 460.0, 210.0)):
    monte('T', MONTE_S, cx, cz, radio, alto, y0=ABAJO, seg=18, anillos=5, pico=0.9)     # el macizo de Tijuca
for _ in range(90):                                                                  # las copas más altas, pegadas a la terraza
    a_, d = random.uniform(0, 6.28), random.uniform(16.0, 60.0)
    x, z = d * math.cos(a_), -20.0 + d * math.sin(a_) * 1.6
    if abs(x) < BORDE + 6.0 and Z_FIN - 4.0 < z < Z_ATRAS + 4.0:
        continue
    copa('T', random.choice(SELVA), x, z, -10.0 - 0.5 * math.hypot(x, z + 20.0) * 0.3, random.uniform(4.0, 7.0), random.uniform(3.0, 4.6), sub=1)
# La ciudad, abajo: la bahía, la laguna, las playas y los barrios entre los morros.
rect('CP', BAHIA, -3200.0, 3200.0, -3200.0, 3200.0, ABAJO, 400.0)
LLANO = material('llano', color=(0.3, 0.34, 0.3), rug=1.0)
rect('CP', LLANO, -900.0, 900.0, -1100.0, -170.0, ABAJO + 0.5, 200.0)                   # la zona sur, al frente
rect('CP', LAGUNA, -420.0, -120.0, -520.0, -300.0, ABAJO + 1.0, 100.0)                   # la laguna Rodrigo de Freitas
rect('CP', ARENA, -900.0, 500.0, -1140.0, -1100.0, ABAJO + 1.0, 100.0)                   # Ipanema y Copacabana
n_ed = 0
for gx in np.arange(-860.0, 860.0, 30.0):
    for gz in np.arange(-1080.0, -200.0, 30.0):
        if (-440.0 < gx < -100.0 and -540.0 < gz < -280.0) or random.random() < 0.3:
            continue
        a = random.uniform(6.0, 10.0)
        alto = random.uniform(8.0, 30.0)
        cubo('CP', random.choice(CIUDAD), P(gx + 15, gz + 15, ABAJO + 0.5 + alto / 2), (2 * a, 2 * a, alto))
        n_ed += 1
print('EDIFICIOS', n_ed)
# El Pan de Azúcar y el morro de Urca, en la boca de la bahía; y los morros de alrededor.
monte('T', MONTE_R, 620.0, -1350.0, 150.0, 260.0, y0=ABAJO, seg=14, anillos=7, pico=0.42)
monte('T', MONTE_R, 470.0, -1220.0, 130.0, 130.0, y0=ABAJO, seg=14, anillos=5, pico=0.5)
for cx, cz, radio, alto in ((-760.0, -900.0, 190.0, 180.0), (150.0, -760.0, 150.0, 120.0), (-200.0, -1020.0, 120.0, 100.0), (900.0, -700.0, 260.0, 160.0)):
    monte('T', MONTE_S, cx, cz, radio, alto, y0=ABAJO, seg=14, anillos=5, pico=0.6)
for cx, cz, radio, alto in ((1500.0, -2400.0, 1100.0, 260.0), (-1900.0, -1700.0, 1000.0, 300.0), (2400.0, -600.0, 1000.0, 320.0), (-600.0, 2400.0, 1300.0, 380.0)):   # las sierras del otro lado de la bahía
    monte('T', MONTE_L, cx, cz, radio, alto, y0=ABAJO, seg=18, anillos=5, pico=0.9)
for _ in range(14):                                                                  # jirones de nube por debajo de la terraza
    x, z = random.uniform(-700.0, 700.0), random.uniform(-900.0, 500.0)
    if math.hypot(x, z + 20.0) < 120.0:
        continue
    y = random.uniform(-150.0, -60.0)
    for _ in range(5):
        elipsoide('T', NUBE, en(x + random.uniform(-40, 40), z + random.uniform(-30, 30), y + random.uniform(-6, 6)), (random.uniform(30, 60), random.uniform(24, 44), random.uniform(8, 14)))

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-rio', ['P', 'EV', 'EP']), ('lugar-rio-ciudad', ['T', 'CP'])],
    # De día, la receta de Salónica: sol fuerte y algo dorado, cielo muy flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.72), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP',), suaves=('monte-selva', 'monte-roca', 'monte-lejos', 'nube'), fundir=True)
