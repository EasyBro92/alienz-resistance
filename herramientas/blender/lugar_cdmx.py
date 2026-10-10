# Ciudad de México: el Paseo de la Reforma, con el Ángel, en primavera (10/10/2026).
#   blender -b -P herramientas/blender/lugar_cdmx.py              (entero)
#   blender -b -P herramientas/blender/lugar_cdmx.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_cdmx.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Se conserva el sitio de la misión —Reforma y la glorieta del Ángel—,
# ahora en Blender; LA MADRE y los suyos, EN NAVE; DE DÍA, con las jacarandas en
# flor, que es cuando la ciudad se pone morada.
#
# Cómo está puesto. Se mira avenida arriba:
#   · EL ÁNGEL VA A 0,28 DE SU TAMAÑO (12,7 m: la columna entera con su Victoria
#     dorada), en su glorieta, al fondo y en el eje;
#   · la calzada de Reforma, con su camellón; a los lados, las jacarandas, las
#     bancas de piedra, las farolas y las estatuas de los próceres;
#   · la base alien, en un ruedo a la derecha;
#   · solo en el vuelo: las torres de Reforma (lejos) y el bosque de Chapultepec.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.4, 0.74, 0.54)                 # mediodía de primavera: alto, algo a la izquierda y a la espalda
iniciar('cdmx', 4029, eje=(0.0, -80.0), encendidas=0.0, reflejo=(0.1, 0.12, 0.18))

ZA = -84.0                               # el Ángel
R_GLORIETA = 13.0
BASE = (12.6, -44.0)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La calzada de Reforma: asfalto con sus rayas, la ciclovía verde, los parches,
    y el suelo sembrado de flores moradas caídas de las jacarandas."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('asphalt_02', 256, 0x8e8c8a, 0.6))
    a *= (0.88 + 0.22 * nube(PH_, PW, 18, 5))[..., None]
    for _ in range(8):
        c, f = random.randrange(20, PW - 120), random.randrange(0, PH_ - 200)
        w, h = random.randint(50, 110), random.randint(70, 190)
        a[f:f + h, c:c + w] *= random.uniform(0.8, 0.92)
    gasta = np.clip(nube(PH_, PW, 60, 6) * 1.5, 0.3, 1)[..., None]
    blanca = np.array((0.84, 0.84, 0.8), np.float32)
    for x in (-5.4, -1.8, 1.8, 5.4):                                      # las discontinuas
        (c, _) = a_px(x, 0)
        for f in range(0, PH_, int(8.0 * KZ)):
            f1 = f + int(3.0 * KZ)
            a[f:f1, c:c + 3] = a[f:f1, c:c + 3] * (1 - gasta[f:f1, c:c + 3]) + blanca * gasta[f:f1, c:c + 3]
    for x0, x1 in ((-9.2, -7.8), (7.8, 9.2)):                             # la ciclovía, verde, con su raya
        (c0, _), (c1, _) = a_px(x0, 0), a_px(x1, 0)
        a[:, c0:c1] = a[:, c0:c1] * 0.4 + np.array((0.16, 0.42, 0.26), np.float32) * 0.6
        a[:, (c1 - 3 if x0 < 0 else c0):(c1 if x0 < 0 else c0 + 3)] = blanca
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
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
        mancha(random.uniform(-8, 8), random.uniform(PZ0, PZ1), random.uniform(0.3, 0.9), random.uniform(0.72, 0.9), random.uniform(0.5, 1.2))
    for x, z, r_ in ((-4.2, -14.0, 1.5), (4.6, -33.0, 1.6), (-1.2, -52.0, 1.4)):
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.4)
    # Las flores caídas: más cuanto más cerca de los árboles de los lados.
    prob = 0.004 + 0.05 * np.clip((np.abs(xs) - 4.0) / 5.2, 0, 1) ** 2
    cae = (E.rng.random((PH_, PW)) < prob)
    a[cae] = np.array((0.56, 0.34, 0.74), np.float32)
    a[np.roll(cae, 1, axis=1) & ~cae] = np.array((0.46, 0.26, 0.66), np.float32)
    return guardar('pista', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.95)
ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x8e8c8a, 0.6), rug=0.95)
BANQUETA = material('banqueta', de_polyhaven('pavement_02', 512, 0xb8b0a2, 0.5), rug=0.9)
CANTERA = material('cantera', de_polyhaven('yellow_stone_wall', 512, 0xc4b8a0, 0.4), rug=0.95)
MARMOL = material('marmol', de_polyhaven('marble_01', 512, 0xe2dccf, 0.3), rug=0.6)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x7fa256, 0.5), rug=1.0)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xa59c8c, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.5, 0.5, 0.5)))
# OJO: los colores lisos van en LINEAL.
ORO = material('oro', color=(0.86, 0.56, 0.1), rug=0.25)
BRONCE = material('bronce', color=(0.05, 0.08, 0.06), rug=0.5)
PIEDRA = material('piedra', color=(0.5, 0.46, 0.38), rug=0.9)
FUNDICION = material('fundicion', color=(0.03, 0.035, 0.03), rug=0.6)
FAROL = material('farol', color=(0.9, 0.86, 0.72), rug=0.3)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
JACARANDA = [material(f'jacaranda-{i}', color=c, rug=1.0) for i, c in enumerate([(0.34, 0.16, 0.6), (0.42, 0.22, 0.68), (0.28, 0.12, 0.5), (0.5, 0.3, 0.74)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.05, 0.13, 0.04), (0.07, 0.16, 0.05)])]
TRONCO = material('tronco', color=(0.08, 0.06, 0.05))
CHAPAS = [material(f'chapa-{i}', color=c, rug=0.35) for i, c in enumerate([(0.7, 0.7, 0.7), (0.02, 0.02, 0.022), (0.5, 0.05, 0.3), (0.3, 0.03, 0.03), (0.6, 0.6, 0.55)])]   # el rosa es el de los taxis
VIDRIO = material('vidrio', color=(0.03, 0.04, 0.05), rug=0.2)
MONTE_L = material('monte-lejos', color=(0.4, 0.42, 0.5), rug=1.0)
FACHADAS = [material(f'f-cdmx-{i}', tex_crema(f'cdmx-{i}', c, balcon=0.3)) for i, c in enumerate([(0.82, 0.78, 0.7), (0.76, 0.74, 0.72), (0.84, 0.74, 0.6)])]
TORRES = [material('t-vidrio-0', tex_vidrio('cdmx-0', (0.26, 0.36, 0.44))), material('t-vidrio-1', tex_vidrio('cdmx-1', (0.2, 0.3, 0.34))), material('t-oficina-0', tex_oficina('cdmx-of', (0.6, 0.58, 0.54), (0.16, 0.22, 0.28)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.86, 0.86, 0.84)), (0.07, (0.76, 0.82, 0.9)), (0.25, (0.5, 0.68, 0.9)), (0.6, (0.28, 0.5, 0.86)), (1.0, (0.16, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.5, (0.3, 0.25, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.2), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA AVENIDA
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z0, Z1 = -700.0, 500.0
BANQ0, BANQ1 = 9.2, 26.0                                                            # la banqueta ancha, con su andador
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', ASFALTO, PX0, PX1, PZ1, Z1, 0.0, 4.0)
suelo('GN', ASFALTO, PX0, PX1, ZA + R_GLORIETA + 9.0, PZ0, 0.0, 4.0)
for s in (-1, 1):
    x0, x1 = min(s * BANQ0, s * BANQ1), max(s * BANQ0, s * BANQ1)
    viga('P', BANQUETA, x0, x1, -66.0, 30.0, 0.0, 0.16, u_m=3.0, techo=BANQUETA)
    suelo('GN', BANQUETA, x0, x1, 30.0, Z1, 0.16, 3.0)
    suelo('GN', BANQUETA, x0, x1, ZA - R_GLORIETA - 9.0, -66.0, 0.0, 3.0)                # alrededor de la glorieta, a ras: la rotonda va encima
JARDIN = material('jardin', imagen_de(CESPED), rug=1.0)
def jacaranda (grupo, x, z, tam=1.0):
    """La jacaranda en flor: tronco oscuro que se abre, y la copa morada, ancha y a bollos."""
    barra(grupo, TRONCO, P(x, z, 0.0), P(x + random.uniform(-0.3, 0.3), z + random.uniform(-0.3, 0.3), 3.2 * tam), 0.34 * tam)
    for _ in range(4):
        copa(grupo, random.choice(JACARANDA), x + random.uniform(-1.4, 1.4) * tam, z + random.uniform(-1.4, 1.4) * tam, random.uniform(4.0, 5.4) * tam, random.uniform(1.8, 2.6) * tam, random.uniform(1.2, 1.7) * tam, sub=1)
def banca (x, z):
    bloque('EV', PIEDRA, en(x, z, 0.16), (0.7, 2.4, 0.5), mella=0.02)
def farola (x, z, alto=5.4):
    torno('EV', FUNDICION, en(x, z, 0.16), [(0.24, 0.0), (0.18, 0.5), (0.08, 0.8), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', FAROL, x, z, alto + 0.4, 0.26, 0.3, sub=1, baila=0.0)
def procer (x, z):
    """La estatua de un prócer, en su pedestal de cantera."""
    viga('P', CANTERA, x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0.16, 1.8, u_m=1.5, techo=CANTERA)
    elipsoide('EV', BRONCE, en(x, z, 2.7), (0.34, 0.3, 0.9))
    elipsoide('EV', BRONCE, en(x, z, 3.7), (0.17, 0.18, 0.2))
for z in np.arange(10.0, -64.0, -10.4):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 9.0:
            continue
        jacaranda('EV', s * 12.0, float(z), random.uniform(0.9, 1.15))
        jacaranda('EV', s * 21.0, float(z) + 5.0, random.uniform(0.9, 1.2))
        banca(s * 10.2, float(z) - 4.0)
        procer(s * 15.6, float(z) - 5.0)
for z in np.arange(5.0, -64.0, -15.6):
    farola(-9.8, float(z))
    if abs(z - BASE[1]) > 9.0:
        farola(9.8, float(z))
for z in np.arange(30.0, Z1, 10.4):                                                  # la arboleda sigue a la espalda…
    for s in (-1, 1):
        jacaranda('T', s * 12.0, float(z), random.uniform(0.9, 1.2))
for z in np.arange(ZA - R_GLORIETA - 12.0, Z0 + 300.0, -10.4):                        # …y pasada la glorieta
    for s in (-1, 1):
        jacaranda('T', s * 12.0, float(z), random.uniform(0.9, 1.2))
# El ruedo de la base alien, en la banqueta.
torno('P', CANTERA, en(BASE[0], BASE[1]), [(5.2, 0.0), (5.2, 0.4), (4.8, 0.4)], lados=28, u_rep=10, v_m=1.5, tapas=(False, True))
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.43) for r, a_ in ((4.6, a0), (4.6, a1), (4.4, a1), (4.4, a0))], hacia=ARRIBA)

# ==================================================================================
# 3. LA GLORIETA Y EL ÁNGEL
# ==================================================================================
N_G = 32
anillo = lambda r, y: [P(r * math.cos(2 * math.pi * i / N_G), ZA + r * math.sin(2 * math.pi * i / N_G), y) for i in range(N_G)]
GLORIETA = material('glorieta', imagen_de(ASFALTO), rug=0.95)                         # encima del asfalto de la avenida: material propio
cara('GN', GLORIETA, anillo(R_GLORIETA + 9.0, 0.03), hacia=ARRIBA, baldosa=4.0)        # la rotonda, que ensancha la calzada
torno('P', CANTERA, en(0.0, ZA), [(R_GLORIETA, 0.0), (R_GLORIETA, 0.4), (R_GLORIETA - 0.5, 0.4)], lados=N_G, u_rep=16, v_m=1.5, tapas=(False, False))
cara('P', JARDIN, anillo(R_GLORIETA - 0.5, 0.4), hacia=ARRIBA, baldosa=6.0)
# La escalinata y el basamento, con sus cuatro grupos de bronce.
for k, (r, y) in enumerate(((5.6, 0.7), (5.0, 1.0), (4.4, 1.3), (3.8, 1.6))):
    torno('P', MARMOL, en(0.0, ZA), [(r, y - 0.3), (r, y)], lados=24, u_rep=12, v_m=1.0, tapas=(False, True))
viga('P', MARMOL, -2.0, 2.0, ZA - 2.0, ZA + 2.0, 1.6, 4.0, u_m=2.0, techo=MARMOL)
viga('P', MARMOL, -2.3, 2.3, ZA - 2.3, ZA + 2.3, 4.0, 4.3, u_m=2.0, techo=MARMOL)
for dx, dz in ((1, 1), (1, -1), (-1, -1), (-1, 1)):
    elipsoide('EV', BRONCE, en(dx * 2.5, ZA + dz * 2.5, 2.2), (0.5, 0.5, 0.8))         # las figuras sentadas de las esquinas
    elipsoide('EV', BRONCE, en(dx * 2.5, ZA + dz * 2.5, 3.1), (0.2, 0.2, 0.22))
elipsoide('EV', BRONCE, en(0.0, ZA + 2.6, 2.3), (0.9, 0.6, 0.6))                       # el león, al frente
# La columna, su capitel y la Victoria alada, dorada.
torno('P', MARMOL, en(0.0, ZA, 4.3), [(0.85, 0.0), (0.72, 0.3), (0.66, 5.4), (0.9, 5.6), (1.05, 6.0), (1.05, 6.2)], lados=14, u_rep=4, v_m=2.0, tapas=(False, True))
YV = 10.5
# La Victoria es de MESHY (10/10, 30 créditos; Isidro: «haz todas estas con Meshy»):
# la de antes eran tres bolas doradas con dos alas planas (está en el historial).
victoria = importar(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'victoria.glb'), 'VV', 2.45, 0.0, ZA)
victoria.data.transform(M.Translation((0, 0, YV)))
print('ÁNGEL', YV + 2.45, 'm')

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN'), z_lejos=-61.0)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: REFORMA, SUS TORRES (LEJOS) Y CHAPULTEPEC
# ==================================================================================
suelo('G', ASFALTO, PX0, PX1, Z0, ZA - R_GLORIETA - 9.0, 0.0, 4.0)
for s in (-1, 1):
    x0, x1 = min(s * BANQ0, s * BANQ1), max(s * BANQ0, s * BANQ1)
    suelo('G', BANQUETA, x0, x1, Z0, ZA - R_GLORIETA - 9.0, 0.16, 3.0)
    suelo('G', SOLAR, min(s * BANQ1, s * 1500.0), max(s * BANQ1, s * 1500.0), -1500.0, 1500.0, 0.0, 8.0)
suelo('G', SOLAR, -BANQ1, BANQ1, Z1, 1500.0, 0.0, 8.0)
suelo('G', CESPED, -BANQ1, BANQ1, -1500.0, Z0, 0.0, 12.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 44.0):
    for gz in np.arange(-900.0, 1250.0, 44.0):
        cx, cz = gx + 22 + random.uniform(-5, 5), gz + 22 + random.uniform(-5, 5)
        if abs(cx) < BANQ1 + 20.0 or math.hypot(cx, cz + 80.0) < 520.0 or random.random() < 0.2:    # lejos: a su tamaño, al lado, el Ángel era una maqueta
            continue
        a = random.uniform(11.0, 16.0)
        if abs(cx) < 200.0 and random.random() < 0.5:                                  # las torres que flanquean Reforma
            caja('T', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, random.uniform(60.0, 150.0), techo=AZOTEA, baldosa=17.0)
        else:
            caja('T', random.choice(FACHADAS), cx - a, cx + a, cz - a, cz + a, 0.0, random.choice([12, 15, 21, 27, 36]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for _ in range(620):                                                                 # arbolado entre la avenida y las casas, y Chapultepec al fondo
    if random.random() < 0.5:
        a_, d = random.uniform(0, 6.28), random.uniform(40.0, 520.0)
        x, z = d * math.cos(a_), -80.0 + d * math.sin(a_)
        if abs(x) < BANQ1 + 2.0:
            continue
    else:
        x, z = random.uniform(-700.0, 700.0), random.uniform(-1400.0, Z0 - 10.0)
    arbol('T', TRONCO, HOJAS + JACARANDA[:1], x, z, random.uniform(1.4, 2.6))
for z in np.arange(60.0, 460.0, 9.0):                                                 # coches parados en la avenida, a la espalda
    if random.random() < 0.5:
        coche('T', CHAPAS, VIDRIO, random.choice((-5.4, -1.8, 1.8, 5.4)), float(z), 0.0)
for cx, cz, radio, alto in ((-1900.0, -1700.0, 1000.0, 260.0), (1800.0, -1900.0, 1000.0, 300.0), (200.0, -2600.0, 1300.0, 380.0), (-600.0, 2400.0, 1200.0, 240.0)):   # los volcanes y la sierra, alrededor del valle
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=18, anillos=5, pico=0.9)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'VV': ('vert-victoria', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-cdmx', ['P', 'GN', 'EV', 'VV', 'EP']), ('lugar-cdmx-ciudad', ['G', 'T', 'CP'])],
    # De día, la receta de Salónica: sol fuerte y algo dorado, cielo muy flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.74), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
