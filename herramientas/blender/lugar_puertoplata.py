# Puerto Plata: el Malecón, al pie de la fortaleza de San Felipe, al atardecer (10/10/2026).
#   blender -b -P herramientas/blender/lugar_puertoplata.py              (entero)
#   blender -b -P herramientas/blender/lugar_puertoplata.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_puertoplata.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Se conserva el sitio de la misión —el Malecón y la fortaleza de San
# Felipe— y lo que cuenta: «el muelle nuevo está aquí, al pie de la vieja
# fortaleza». Es la misión de LA MADRE del Caribe: ella y los suyos SUBEN DEL MAR
# por una rampa, al pie de la muralla. Al ATARDECER.
#
# Cómo está puesto. Se mira a la fortaleza por el paseo:
#   · LA FORTALEZA VA A SU TAMAÑO (9 m: cabe entera): la cortina de sillares con
#     su talud, las garitas redondas en las esquinas, las troneras con cañones y
#     la torre del homenaje detrás;
#   · delante, la rampa de ±7,6 que baja 3,6 m hasta la poterna del agua, a
#     oscuras (`hueco` y `entrada`, como en Gizeh);
#   · a la izquierda, el pretil del Malecón y el Atlántico; a la derecha, las
#     palmeras y el césped del parque; la base alien, en un ruedo;
#   · solo en el vuelo: la punta entera con el faro de hierro, la bahía, el
#     pueblo de casas de madera de colores y la loma Isabel de Torres con su Cristo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.45, 0.34, 0.82)                # atardecer: bajo, a la espalda y a la izquierda (sobre el mar)
iniciar('puertoplata', 4332, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.3, 0.2, 0.12))

ZANJA = 7.6
Z_BOCA, Z_PIE = -62.0, -78.0
HONDO = 3.6
ZF = -80.0                               # la cortina de la fortaleza
MF, HF = 20.0, 6.4                       # medio ancho y alto de la cortina
PRETIL = -9.5
MAR_Y = -2.6
BASE = (12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_BOCA, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El paseo del Malecón: adoquín de hormigón en dos tonos, con su cenefa, la
    sal que deja el mar junto al pretil y las raíces negras que suben de la rampa."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    clara = tejar(foto('pavement_02', 256, 0xd8c8ac, 0.5))
    roja = tejar(foto('stone_pavers', 256, 0xc48a6c, 0.5))
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    mx, mz = xx / KX, yy / KZ
    onda = (np.sin(mz * 1.3 + np.sin(mx * 1.1) * 1.2) > 0.3)                      # el dibujo de olas del paseo
    a = np.where(onda[..., None], roja, clara)
    a[((mx % 0.4) < 0.03) | ((mz % 0.4) < 0.03)] *= 0.8
    a *= (0.9 + 0.16 * nube(PH_, PW, 16, 4))[..., None]
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    sal = np.clip((-6.4 - xs) / 2.6, 0, 1) * (0.5 + 0.5 * nube(PH_, PW, 40, 5))
    a = a * (1 - 0.3 * sal[..., None]) + 0.3 * sal[..., None]
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx_ = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx_ - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.4, -15.0, 1.5), (4.8, -34.0, 1.7), (-2.0, -51.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    for k in range(11):
        x, z = -6.6 + k * 1.32 + random.uniform(-0.4, 0.4), PZ0
        ang = math.pi / 2 + random.uniform(-0.5, 0.5)
        pasos = int(random.uniform(3.5, 10.0) * KZ)
        for i in range(pasos):
            ang += random.uniform(-0.12, 0.12) + 0.02 * (math.pi / 2 - ang)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            grosor = max(1, int(4.5 * (1 - i / pasos) ** 0.7))
            c, f_ = a_px(x, z)
            if 5 < c < PW - 6 and 0 <= f_ < PH_ - 1:
                a[f_, c - grosor:c + grosor + 1] = np.array((0.05, 0.07, 0.05), np.float32) * (1 + 0.5 * random.random())
                a[f_, c] = (0.1, 0.3, 0.16)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_muralla ():
    """La piedra de la fortaleza: sillarejo dorado, con manchas de salitre y de humedad."""
    n = 256
    a = foto('castle_wall_varriation', n, 0xd0b484, 0.5).copy()
    a *= (0.84 + 0.26 * nube(n, n, 5, 5))[..., None]
    a *= (0.9 + 0.14 * nube(2, n, 1, 24)[0])[None, :, None]
    a[n - 50:] *= np.linspace(1.0, 0.72, 50, dtype=np.float32)[:, None, None]      # el pie, oscuro de verdín
    return guardar('muralla-pp', np.clip(a, 0, 1), 88)

def tex_atlantico ():
    """El Atlántico al atardecer: azul acero con una calle de oro. Va sin luz."""
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    b = np.sin(yy / 4.0 + 2.0 * np.sin(xx / 21.0)) * 0.5 + 0.5
    a = np.stack([0.4 + 0.02 * b, 0.42 + 0.02 * b, 0.5 + 0.02 * b], axis=-1)
    a += (np.clip(b - 0.95, 0, 1) * 4.0)[..., None] * np.array((0.9, 0.56, 0.24))     # el oro, solo en el filo de las crestas
    return guardar('atlantico', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.9)
PASEO = material('paseo', de_polyhaven('pavement_02', 512, 0xd8c8ac, 0.5), rug=0.9)
MURALLA = material('muralla-pp', tex_muralla(), rug=0.95)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xc8ac80, 0.5), rug=0.95)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0x6e6860, 0.6), rug=1.0)
RAMPA = material('rampa', de_polyhaven('rock_ground', 512, 0x9a8a6c, 0.5), rug=1.0)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x86a050, 0.5), rug=1.0)
ATLANTICO = material('atlantico', tex_atlantico(), rug=0.1)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
SOLAR = material('solar', de_polyhaven('dirt_floor', 512, 0xb09a78, 0.4), rug=1.0)
TEJADO = material('tejado-zinc', de_polyhaven('rusty_metal_02', 256, 0xa46a52, 0.5), rug=0.8)
# OJO: los colores lisos van en LINEAL.
PIEDRA = material('piedra', color=(0.5, 0.38, 0.2), rug=1.0)
HIERRO = material('hierro', color=(0.03, 0.03, 0.035), rug=0.5)
BLANCO = material('blanco', color=(0.8, 0.78, 0.7), rug=0.7)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
ESPUMA = material('espuma', color=(0.86, 0.84, 0.8), rug=0.6)
CASITAS = [material(f'casita-{i}', color=c, rug=0.9) for i, c in enumerate([(0.7, 0.2, 0.16), (0.1, 0.4, 0.5), (0.8, 0.6, 0.14), (0.3, 0.5, 0.2), (0.8, 0.5, 0.56), (0.76, 0.74, 0.66)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.06, 0.16, 0.04), (0.09, 0.2, 0.05)])]
TRONCO = material('tronco', color=(0.2, 0.15, 0.1))
LOMA = material('monte-loma', color=(0.1, 0.2, 0.1), rug=1.0)
MONTE_L = material('monte-lejos', color=(0.3, 0.3, 0.36), rug=1.0)
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.72, 0.44)), (0.05, (0.98, 0.66, 0.48)), (0.16, (0.84, 0.6, 0.6)), (0.4, (0.46, 0.5, 0.76)), (1.0, (0.16, 0.26, 0.58))],
    (SOL[0], SOL[2]), 0.1, (0.9, 0.42, 0.08), ((1.0, 0.7, 0.46), (0.74, 0.6, 0.7)), cuanta_nube=0.24), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL PASEO, EL PRETIL, EL MAR Y LA RAMPA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
Z_ATRAS, PARQUE = 500.0, 60.0
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GP', PASEO, PRETIL, PX0, Z_PIE, Z_ATRAS, 0.0, 3.0)
suelo('GP', PASEO, PX0, PX1, PZ1, Z_ATRAS, 0.0, 3.0)
suelo('GP', PASEO, PX1, 11.0, Z_PIE, Z_ATRAS, 0.0, 3.0)
suelo('GP', PASEO, PX0, -ZANJA, Z_PIE, Z_BOCA, 0.0, 3.0)
suelo('GP', PASEO, ZANJA, PX1, Z_PIE, Z_BOCA, 0.0, 3.0)
suelo('GP', CESPED, 11.0, PARQUE, ZF - 40.0, Z_ATRAS, 0.0, 6.0)                       # el parque, a la derecha
rect('EP', ATLANTICO, -3200.0, PRETIL, -3200.0, 3200.0, MAR_Y, 60.0)
rect('EP', ATLANTICO, PRETIL, 3200.0, -3200.0, ZF - 40.0, MAR_Y, 60.0)                 # el mar da la vuelta a la punta
cara('P', SILLAR, [P(PRETIL, Z_ATRAS, MAR_Y - 1.0), P(PRETIL, ZF - 40.0, MAR_Y - 1.0), P(PRETIL, ZF - 40.0, 0.0), P(PRETIL, Z_ATRAS, 0.0)], hacia=V((-1, 0, 0)), baldosa=3.0)
z = 24.0
while z > Z_PIE + 1.0:                                                               # el pretil, con sus pilarotes
    viga('P', SILLAR, PRETIL, PRETIL + 0.4, z - 3.6, z - 0.4, 0.0, 0.8, u_m=2.0, techo=SILLAR)
    bloque('EV', PIEDRA, en(PRETIL + 0.2, z, 0.0), (0.56, 0.56, 1.1), mella=0.02)
    z -= 4.0
for z in np.arange(20.0, -110.0, -3.0):                                               # la escollera, al pie
    bloque('P', ROCA, en(PRETIL - random.uniform(1.0, 4.0), float(z), MAR_Y - 0.6, random.uniform(0, 3), (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4))),
           (random.uniform(1.2, 2.4), random.uniform(1.2, 2.2), random.uniform(1.0, 2.0)), baldosa=3.0, mella=0.15)
    if random.random() < 0.6:
        cara('EV', ESPUMA, [P(PRETIL - 4.0 - random.uniform(0, 2.0) + r * math.cos(a_), float(z) + r * math.sin(a_), MAR_Y + 0.06) for r in (random.uniform(0.8, 1.6),) for a_ in np.linspace(0, 6.28, 6, endpoint=False)], hacia=ARRIBA)
# La rampa que baja al agua, y la poterna a oscuras al pie de la muralla.
Z_TUNEL = Z_PIE - 10.0
cara('P', RAMPA, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)], uvs=[(0, 0), (4, 0), (4, 4.4), (0, 4.4)], hacia=ARRIBA)
cara('P', RAMPA, [P(-ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_TUNEL, -HONDO), P(-ZANJA, Z_TUNEL, -HONDO)], uvs=[(0, 4.4), (4, 4.4), (4, 8), (0, 8)], hacia=ARRIBA)
for s in (-1, 1):
    cara('P', SILLAR, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_PIE, 0.0)], hacia=V((-s, 0, 0)), baldosa=3.0)
    viga('P', SILLAR, min(s * ZANJA, s * (ZANJA + 0.6)), max(s * ZANJA, s * (ZANJA + 0.6)), Z_PIE, Z_BOCA - 0.2, 0.0, 0.6, u_m=3.0, techo=SILLAR)
cara('EP', NEGRO, [P(-ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, 0.0), P(-ZANJA, Z_PIE - 0.05, 0.0)], hacia=V((0, -1, 0)))
for x, y, r in ((-4.6, 1.0, 0.5), (-1.8, 2.2, 0.38), (1.2, 1.2, 0.6), (4.2, 2.4, 0.42), (0.2, 0.6, 0.3), (6.2, 0.9, 0.36), (-6.0, 2.6, 0.26)):
    cara('EP', BRILLO_HONDO if r > 0.4 else VERDE, [P(x + r * math.cos(a_), Z_PIE - 0.02, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(9):
    x = -6.4 + k * 1.6 + random.uniform(-0.4, 0.4)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, Z_PIE - 0.2, -HONDO + 0.1), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.42))

# ==================================================================================
# 3. LA FORTALEZA DE SAN FELIPE
# ==================================================================================
FONDO_F = 34.0
def cortina (grupo, x0, z0, x1, z1, hacia, y0=0.0, y1=HF, talud=1.2):
    """Un lienzo de muralla con talud: más ancho abajo que arriba."""
    n = hacia.normalized()
    cara(grupo, MURALLA, [P(x0 + n.x * talud, z0 - n.y * talud, y0), P(x1 + n.x * talud, z1 - n.y * talud, y0), P(x1, z1, y1), P(x0, z0, y1)], hacia=hacia + V((0, 0, 0.3)), baldosa=4.0)
cortina('P', -MF, ZF, MF, ZF, V((0, -1, 0)))                                           # la cortina de delante (el talud tapa la boca por arriba)
cortina('P', MF, ZF, MF, ZF - FONDO_F, V((1, 0, 0)))
cortina('P', -MF, ZF - FONDO_F, -MF, ZF, V((-1, 0, 0)))
cortina('T', MF, ZF - FONDO_F, -MF, ZF - FONDO_F, V((0, 1, 0)))
cara('P', PASEO, [P(-MF, ZF, HF), P(MF, ZF, HF), P(MF, ZF - FONDO_F, HF), P(-MF, ZF - FONDO_F, HF)], hacia=ARRIBA, baldosa=3.0)   # el adarve
for x in np.arange(-MF + 1.5, MF, 3.0):                                               # los merlones, y un cañón en cada tronera de delante
    bloque('P', MURALLA, en(float(x), ZF - 0.5, HF), (1.7, 1.0, 1.0), baldosa=3.0, mella=0.03)
    if abs(x) > 3.0 and int(x) % 2 == 0:
        barra('EV', HIERRO, P(float(x) + 1.5, ZF - 1.4, HF + 0.5), P(float(x) + 1.5, ZF + 0.5, HF + 0.6), 0.26)
def garita (x, z):
    """La garita de la esquina: un cubo redondo volado, con su cupulín."""
    torno('P', MURALLA, en(x, z, HF - 1.6), [(0.5, 0.0), (1.1, 1.2), (1.1, 3.4), (1.25, 3.5)], lados=10, u_rep=3, v_m=3.0, tapas=(False, False))
    torno('EV', PIEDRA, en(x, z, HF + 1.9), [(1.25, 0.0), (0.8, 0.6), (0.0, 1.0)], lados=10, tapas=(False, False))
    cara('EP', NEGRO, [P(x - 0.2, z + 1.12, HF + 0.4), P(x + 0.2, z + 1.12, HF + 0.4), P(x + 0.2, z + 1.12, HF + 1.3), P(x - 0.2, z + 1.12, HF + 1.3)], hacia=V((0, -1, 0)))
for s in (-1, 1):
    garita(s * (MF + 0.4), ZF + 0.4)
    garita(s * (MF + 0.4), ZF - FONDO_F - 0.4)
# La torre del homenaje, dentro, con su asta.
viga('P', MURALLA, -6.0, 6.0, ZF - 22.0, ZF - 10.0, HF, HF + 2.6, u_m=4.0, techo=PASEO)
torno('P', MURALLA, en(0.0, ZF - 16.0, HF + 2.6), [(3.0, 0.0), (3.0, 2.0), (3.3, 2.1), (3.3, 2.7)], lados=14, u_rep=5, v_m=3.0, tapas=(False, True))
barra('EV', BLANCO, P(0.0, ZF - 16.0, HF + 5.3), P(0.0, ZF - 16.0, HF + 9.0), 0.1)
print('FORTALEZA', HF + 1.0, 'm la cortina;', HF + 5.3, 'la torre')

# ==================================================================================
# 4. EL PARQUE Y LA BASE ALIEN
# ==================================================================================
def farola (x, z, alto=5.0):
    torno('EV', HIERRO, en(x, z), [(0.22, 0.0), (0.16, 0.5), (0.07, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', FAROL, x, z, alto + 0.24, 0.26, 0.3, sub=1, baila=0.0)
for z in np.arange(6.0, -60.0, -16.0):
    if abs(z - BASE[1]) > 9.0:
        farola(9.8, float(z))
z = 10.0
while z > -60.0:                                                                    # las palmeras del parque (a la derecha: el sol viene de la izquierda)
    if abs(z - BASE[1]) > 8.0:
        palmera('EV', TRONCO, PALMA, 12.4 + random.uniform(0, 1.0), z, alto=random.uniform(7.0, 9.0))
        palmera('EV', TRONCO, PALMA, 19.0 + random.uniform(0, 3.0), z - 3.0, alto=random.uniform(7.0, 10.0))
    z -= random.uniform(6.0, 8.0)
torno('P', SILLAR, en(BASE[0], BASE[1]), [(5.2, -0.1), (5.2, 0.34), (4.8, 0.34), (4.8, 0.05)], lados=28, u_rep=10, v_m=1.5, tapas=(False, False))
RUEDO = material('ruedo', imagen_de(PASEO), rug=0.9)
cara('P', RUEDO, [P(BASE[0] + 4.8 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.8 * math.sin(2 * math.pi * i / 28), 0.05) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.08) for r, a_ in ((4.5, a0), (4.5, a1), (4.3, a1), (4.3, a0))], hacia=ARRIBA)

comprobar_paso(('E', 'EP', 'P', 'EV', 'GP'), z_lejos=-61.5)

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO: LA PUNTA, EL FARO, EL PUEBLO Y LA LOMA
# ==================================================================================
# El faro de hierro, en el parque.
LX, LZ = 40.0, -40.0
for k in range(4):
    a_ = math.pi / 4 + math.pi / 2 * k
    barra('T', HIERRO, P(LX + 3.0 * math.cos(a_), LZ + 3.0 * math.sin(a_), 0.0), P(LX + 0.8 * math.cos(a_), LZ + 0.8 * math.sin(a_), 20.0), 0.4)
torno('T', BLANCO, en(LX, LZ, 20.0), [(1.6, 0.0), (1.6, 2.4), (1.0, 3.2), (0.0, 3.8)], lados=8, tapas=(True, False))
suelo('G', CALZADA, PARQUE, PARQUE + 12.0, -120.0, 1500.0, 0.0, carriles=(PARQUE, 4.0, 'z'))
suelo('G', SOLAR, PARQUE + 12.0, 1500.0, ZF - 40.0, 1500.0, 0.0, 8.0)
suelo('G', PASEO, PRETIL, PARQUE, Z_ATRAS, 1500.0, 0.0, 3.0)
n_ed = 0
for gx in np.arange(PARQUE + 20.0, 1100.0, 18.0):                                     # el pueblo: casas de madera de colores, de tejado de zinc
    for gz in np.arange(-100.0, 1100.0, 18.0):
        if random.random() < 0.3:
            continue
        cx, cz = gx + 9 + random.uniform(-2, 2), gz + 9 + random.uniform(-2, 2)
        ax, az = random.uniform(4.5, 6.5), random.uniform(4.5, 6.5)
        alto = random.choice((3.4, 3.8, 6.4))
        caja('T', random.choice(CASITAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, alto, baldosa=4.0)
        tejado('T', TEJADO, cx - ax - 0.5, cx + ax + 0.5, cz - az - 0.5, cz + az + 0.5, alto, 1.8)
        n_ed += 1
print('CASAS', n_ed)
for _ in range(260):
    palmera('T', TRONCO, PALMA, random.uniform(PARQUE + 14.0, 1000.0), random.uniform(-100.0, 1000.0), alto=random.uniform(7.0, 11.0))
# La loma Isabel de Torres, detrás del pueblo, con su Cristo.
monte('T', LOMA, 1300.0, 500.0, 900.0, 520.0, y0=0.0, seg=20, anillos=6, pico=0.9)
monte('T', LOMA, 900.0, 1300.0, 800.0, 300.0, y0=0.0, seg=18, anillos=5, pico=0.8)
barra('T', BLANCO, P(1300.0, 500.0, 520.0), P(1300.0, 500.0, 560.0), 8.0)
barra('T', BLANCO, P(1300.0, 480.0, 550.0), P(1300.0, 520.0, 550.0), 5.0)
for cx, cz, radio, alto in ((2200.0, -400.0, 1000.0, 360.0), (1600.0, 2200.0, 1100.0, 300.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=18, anillos=4, pico=0.8)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'GP': ('luzG-paseo', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-puertoplata', ['P', 'GP', 'EV', 'EP']), ('lugar-puertoplata-ciudad', ['G', 'T', 'CP'])],
    # Atardecer, como en Gizeh: sol muy naranja y fuerte, cielo flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.56, 0.24), sol_fuerza=7.5, sol_ancho=4.0, cielo_fuerza=0.3, cielo_altura=6, cielo_giro=200,
    escala=0.72, satura=1.0, no_alumbran=('CP',), suaves=('monte-loma', 'monte-lejos'), fundir=True)
