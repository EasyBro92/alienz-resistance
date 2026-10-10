# Shanghái: el estanque del Jardín Yuyuan y su casa de té, al anochecer (10/10/2026).
#   blender -b -P herramientas/blender/lugar_shanghai.py              (entero)
#   blender -b -P herramientas/blender/lugar_shanghai.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_shanghai.py -- --reusar  (retocar la luz)
#
# Sitio, entrada y hora elegidos por mí (Isidro, 10/10: «elige tú y sigue sin
# parar»). Shanghái es su perfil de rascacielos, pero jugando solo caben trece
# metros de alto al fondo: una torre de 600 no se ve. Lo que sí cabe ENTERO, y es
# igual de Shanghái, es la casa de té del lago (Huxinting) del Yuyuan, con sus
# tejados de puntas levantadas y los farolillos rojos; los rascacielos de Pudong
# quedan detrás, encendidos, para la llegada. Los alienz EN NAVE; al ANOCHECER.
#
# Cómo está puesto. Se juega en una terraza de piedra sobre el estanque:
#   · al fondo, la casa de té en sus pilotes (tres tejados, 12,4 m), con las
#     celosías encendidas; la nave se posa delante;
#   · a los lados, el agua oscura con los reflejos, las barandillas con farolillos,
#     el puente en zigzag a la izquierda y la base alien en una isleta a la derecha;
#   · alrededor, los pabellones del bazar; detrás, lejos, Pudong.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.4, 0.3, 0.86)                  # ya casi puesto: a la espalda y algo a la izquierda
iniciar('shanghai', 3221, eje=(0.0, -80.0), encendidas=0.24, reflejo=(0.2, 0.14, 0.2))

AGUA = -1.2
BORDE = 9.5                              # la barandilla
ORILLA = 26.0                            # donde acaba el estanque, a cada lado
ZT = -76.0                               # el centro de la casa de té
BASE = (12.6, -44.0)
R_ISLA = 5.9

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))
Z_FAROLES = [float(z) for z in np.arange(8.0, -62.0, -9.0)]

def tex_pista ():
    """La terraza: losas de granito gris, mojadas, con una cenefa de piedra más
    oscura y, a cada farol, su charco de luz cálida en el suelo."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('stone_pavers', 256, 0x8e8c90, 0.5))
    lz, lx = 0.9 * KZ, 0.9 * KX
    f, fila = 0.0, 0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + lz))
        c = -(fila % 2) * lx / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + lx))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.9, 1.07)
                a[f0:f1, c0:c0 + 1] *= 0.66
            c += lx
        a[f0:f0 + 1] *= 0.66
        fila += 1; f += lz
    for x in (-7.6, 7.6):                                                # la cenefa, a lo largo
        (c0, _), (c1, _) = a_px(x - 0.3, 0), a_px(x + 0.3, 0)
        a[:, c0:c1] *= 0.62
    a *= (0.88 + 0.2 * nube(PH_, PW, 16, 4))[..., None]
    mojado = np.clip((nube(PH_, PW, 24, 6) - 0.5) / 0.2, 0, 1)[..., None]   # lo mojado refleja el cielo malva
    a = a * (1 - 0.3 * mojado) + np.array((0.5, 0.42, 0.56), np.float32) * 0.3 * mojado
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    luz = np.zeros((PH_, PW), np.float32)
    for z in Z_FAROLES:                                                  # los charcos de luz de los farolillos
        for s in (-1, 1):
            c, f_ = a_px(s * 8.9, z)
            luz += np.exp(-(((xx - c) / (2.6 * KX)) ** 2 + ((yy - f_) / (2.6 * KZ)) ** 2))
    a += np.clip(luz, 0, 1)[..., None] * np.array((0.42, 0.2, 0.08), np.float32)
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.0, -15.0, 1.5), (-4.6, -34.0, 1.6), (1.4, -52.0, 1.4)):       # la guerra
        mancha(x, z, r_ * 1.5, 0.8, 1.1)
        mancha(x, z, r_, 0.42)
    for _ in range(40):
        mancha(random.uniform(-9, 9), random.uniform(PZ0, PZ1), random.uniform(0.3, 1.0), random.uniform(0.82, 0.93), random.uniform(0.6, 1.5))
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_celosia ():
    """Un paño de la casa de té (3 × 3 m): columnas rojas y, entre ellas, la celosía
    de madera con la luz de dentro. Va sin luz: es lo que brilla al anochecer."""
    n = 128
    a = lienzo(n, n, (0.2, 0.05, 0.04))
    yy, xx = np.mgrid[0:n, 0:n]
    dentro = (xx > 12) & (xx < n - 12) & (yy > 26) & (yy < 104)
    luz = np.array((1.0, 0.72, 0.34), np.float32) * (0.75 + 0.25 * nube(n, n, 3, 3))[..., None]
    a[dentro] = luz[dentro]
    reja = dentro & (((xx % 12) < 2) | ((yy % 12) < 2) | (((xx + yy) % 24) < 2))
    a[reja] = (0.12, 0.03, 0.02)
    a[:, :10] = (0.5, 0.07, 0.05); a[:, n - 10:] = (0.5, 0.07, 0.05)     # las columnas, bermellón
    a[:14] = (0.1, 0.24, 0.2); a[14:22] = (0.6, 0.42, 0.1)               # el dintel pintado, verde y oro
    a[104:] = (0.16, 0.04, 0.03)
    return guardar('celosia-china', np.clip(a, 0, 1), 90)

def tex_muro_blanco ():
    """La tapia encalada de los pabellones del bazar, con su zócalo gris y las ventanas encendidas."""
    n = 256
    a = lienzo(n, n, (0.62, 0.58, 0.6)) + ruido(n, n, 0.04)[..., None]
    for k in range(4):
        cx = k * 64 + 32
        a[60:150, cx - 18:cx + 18] = np.array((1.0, 0.7, 0.32)) * random.uniform(0.6, 1.0)
        a[60:150:10, cx - 18:cx + 18] = (0.14, 0.04, 0.03); a[60:150, cx - 18:cx + 18:9] = (0.14, 0.04, 0.03)
        a[52:60, cx - 22:cx + 22] = (0.3, 0.06, 0.05)
        a[150:n, cx + 28:cx + 36] = (0.4, 0.06, 0.05)
    a[n - 40:] *= 0.6
    return guardar('muro-bazar', np.clip(a, 0, 1), 88)

def tex_estanque ():
    """El estanque al anochecer: agua casi negra con el malva del cielo y los faroles estirados en reflejos."""
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    b = np.sin(yy / 5.0 + 2.0 * np.sin(xx / 23.0)) * 0.5 + 0.5
    a = np.stack([0.1 + 0.07 * b, 0.09 + 0.05 * b, 0.16 + 0.09 * b], axis=-1)
    for _ in range(26):
        c, f = random.randrange(8, W - 8), random.randrange(0, Hh - 60)
        largo = random.randint(24, 56)
        a[f:f + largo, c:c + 3] += np.array(random.choice(((0.7, 0.22, 0.08), (0.8, 0.5, 0.16), (0.6, 0.16, 0.2))), np.float32) * np.linspace(1, 0, largo, dtype=np.float32)[:, None, None]
    return guardar('estanque-yuyuan', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=0.7)
GRANITO = material('granito', de_polyhaven('stone_pavers', 512, 0x8e8c90, 0.5), rug=0.8)
PIEDRA_T = material('piedra-clara', de_polyhaven('rock_tile_floor', 512, 0xa6a2a4, 0.5), rug=0.85)
TEJA = material('teja-china', de_polyhaven('ceramic_roof_01', 256, 0x4c4a50, 0.8), rug=0.8)
CELOSIA = material('celosia-china', tex_celosia(), rug=0.8)
MURO_B = material('muro-bazar', tex_muro_blanco(), rug=0.9)
ESTANQUE = material('estanque', tex_estanque(), rug=0.1)
ROCA = material('roca-taihu', de_polyhaven('rock_face_03', 256, 0x8a878c, 0.6), rug=1.0)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0x6e6a72, 0.6), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.3, 0.3, 0.34)))
# OJO: los colores lisos van en LINEAL.
ROJO = material('bermellon', color=(0.36, 0.04, 0.03), rug=0.7)
MADERA = material('madera-oscura', color=(0.06, 0.03, 0.025), rug=0.9)
ORO = material('oro', color=(0.7, 0.45, 0.1), rug=0.3)
PIEDRA = material('piedra-gris', color=(0.3, 0.3, 0.33), rug=0.9)
FAROL = material('brillo-farol', color=(1.0, 0.2, 0.06), emite=2.6)
FAROL_O = material('brillo-farol-oro', color=(1.0, 0.7, 0.25), emite=2.4)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
SAUCE = [material(f'sauce-{i}', color=c, rug=1.0) for i, c in enumerate([(0.04, 0.09, 0.05), (0.05, 0.11, 0.05), (0.07, 0.12, 0.06)])]
TRONCO = material('tronco', color=(0.05, 0.04, 0.035))
NEON = [material(f'brillo-neon-{i}', color=c, emite=1.6) for i, c in enumerate([(0.9, 0.2, 0.7), (0.2, 0.6, 1.0), (1.0, 0.75, 0.3), (0.5, 0.3, 1.0)])]
MONTE_L = material('monte-lejos', color=(0.12, 0.1, 0.18), rug=1.0)
TORRES = [material('t-noche-0', tex_vidrio('sh-0', (0.08, 0.12, 0.22))), material('t-noche-1', tex_vidrio('sh-1', (0.1, 0.1, 0.2))),
          material('t-noche-2', tex_oficina('sh-of-0', (0.2, 0.2, 0.26), (0.06, 0.1, 0.16))), material('t-noche-3', tex_vidrio('sh-2', (0.14, 0.1, 0.16)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.96, 0.56, 0.44)), (0.06, (0.86, 0.5, 0.52)), (0.18, (0.56, 0.4, 0.64)), (0.45, (0.24, 0.24, 0.5)), (1.0, (0.07, 0.09, 0.26))],
    (SOL[0], SOL[2]), 0.04, (0.8, 0.3, 0.1), ((0.9, 0.5, 0.46), (0.36, 0.3, 0.5)), cuanta_nube=0.24), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA TERRAZA, EL ESTANQUE Y LO QUE HAY EN ÉL
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-200, 96))
Z_E0, Z_E1 = -96.0, 30.0                                                           # el estanque, de fondo a espalda
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
rect('P', GRANITO, PX0, PX1, -67.0, PZ0, 0.0, 3.6)
rect('P', GRANITO, PX0, PX1, PZ1, Z_E1, 0.0, 3.6)
for s in (-1, 1):                                                                   # el canto de la terraza, hasta debajo del agua
    cara('P', PIEDRA_T, [P(s * BORDE, Z_E1, AGUA - 0.6), P(s * BORDE, -67.0, AGUA - 0.6), P(s * BORDE, -67.0, 0.0), P(s * BORDE, Z_E1, 0.0)], hacia=V((s, 0, 0)), baldosa=3.0)
    rect('P', GRANITO, min(s * 9.2, s * BORDE), max(s * 9.2, s * BORDE), -67.0, Z_E1, 0.0, 3.6)
rect('EP', ESTANQUE, -ORILLA, ORILLA, Z_E0, Z_E1, AGUA, 14.0)

def farolillo (grupo, x, z, y, r=0.3):
    """El farolillo rojo: un huso encendido con sus dos tapas doradas y la borla."""
    torno('EP' if grupo == 'EV' else 'CP', FAROL, en(x, z, y), [(r * 0.45, 0.0), (r, r * 0.5), (r, r * 1.0), (r * 0.45, r * 1.5)], lados=8, tapas=(False, False))
    cubo(grupo, ORO, P(x, z, y - 0.04), (r * 0.9, r * 0.9, 0.08))
    cubo(grupo, ORO, P(x, z, y + r * 1.54), (r * 0.9, r * 0.9, 0.08))
    barra(grupo, ORO, P(x, z, y - 0.04), P(x, z, y - r * 1.2), 0.04)

en_isla = lambda z: abs(z - BASE[1]) < R_ISLA - 0.4
for s in (-1, 1):                                                                   # la barandilla de piedra, con su poste y su farolillo cada nueve metros
    z = Z_E1
    while z > -67.0:
        z1 = max(-67.0, z - 3.0)
        if not (s > 0 and en_isla((z + z1) / 2)):
            viga('P', PIEDRA_T, min(s * (BORDE - 0.3), s * BORDE), max(s * (BORDE - 0.3), s * BORDE), z1 + 0.2, z - 0.2, 0.3, 0.9, u_m=2.0, techo=PIEDRA_T)
            bloque('EV', PIEDRA, en(s * (BORDE - 0.15), z, 0.0), (0.34, 0.34, 1.15), mella=0.01)
        z = z1
    for z in Z_FAROLES:
        if s > 0 and en_isla(z):
            continue
        x = s * (BORDE - 0.15)
        barra('EV', MADERA, P(x, z, 0.0), P(x, z, 4.0), 0.14)
        barra('EV', MADERA, P(x, z, 3.9), P(x - s * 0.9, z, 4.1), 0.09)
        farolillo('EV', x - s * 0.85, z, 3.25, 0.34)

# La isleta de la base alien, a la derecha.
N_I = 28
circ = [(BASE[0] + R_ISLA * math.cos(2 * math.pi * i / N_I), BASE[1] + R_ISLA * math.sin(2 * math.pi * i / N_I)) for i in range(N_I)]
ISLA = material('isla', imagen_de(GRANITO), rug=0.8)
prisma('P', PIEDRA_T, circ, AGUA - 0.6, 0.05, techo=ISLA, baldosa=3.0)
for i in range(N_I):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_I]
    if (ax + bx) / 2 > BORDE + 0.3:
        barra('EV', PIEDRA, P(ax, az, 0.5), P(bx, bz, 0.5), 0.26)
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.08)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.82), f(ax, az, 0.82)], hacia=ARRIBA)

# El puente de las nueve vueltas, a la izquierda: en zigzag de la orilla a la casa de té.
zig = [(-ORILLA, -30.0), (-21.0, -30.0), (-21.0, -40.0), (-15.0, -40.0), (-15.0, -52.0), (-20.0, -52.0), (-20.0, -64.0), (-13.0, -64.0), (-13.0, -72.0), (-8.6, -72.0)]
for (ax, az), (bx, bz) in zip(zig, zig[1:]):
    x0, x1, z0, z1 = min(ax, bx) - 1.2, max(ax, bx) + 1.2, min(az, bz) - 1.2, max(az, bz) + 1.2
    caja('P', PIEDRA_T, x0, x1, z0, z1, -0.2, 0.0, techo=PIEDRA_T, baldosa=3.0)
    for px, pz in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
        barra('EV', PIEDRA, P(px, pz, AGUA - 0.4), P(px, pz, 0.9), 0.24)
    if abs(bx - ax) > abs(bz - az):
        for zz in (z0 + 0.1, z1 - 0.1):
            barra('EV', PIEDRA, P(x0, zz, 0.75), P(x1, zz, 0.75), 0.14)
    else:
        for xx in (x0 + 0.1, x1 - 0.1):
            barra('EV', PIEDRA, P(xx, z0, 0.75), P(xx, z1, 0.75), 0.14)
# Rocas de jardín y nenúfares.
for x, z, t in ((16.0, -18.0, 1.6), (18.5, -20.0, 1.1), (-17.0, -8.0, 1.5), (20.0, -62.0, 1.8), (17.5, -66.0, 1.2), (-22.0, -18.0, 1.3)):
    bloque('P', ROCA, en(x, z, AGUA - 0.3, random.uniform(0, 3), (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2))), (t * 1.2, t, t * 2.0), baldosa=2.0, mella=0.2)
NENUFAR = material('nenufar', color=(0.05, 0.16, 0.07), rug=0.8)
for _ in range(46):
    s = random.choice((-1, 1))
    x, z = s * random.uniform(10.5, 24.0), random.uniform(-90.0, 24.0)
    if s > 0 and math.hypot(x - BASE[0], z - BASE[1]) < R_ISLA + 0.6:
        continue
    r = random.uniform(0.3, 0.7)
    cara('EV', NENUFAR, [P(x + r * math.cos(a_), z + r * math.sin(a_), AGUA + 0.03) for a_ in np.linspace(0.4, 2 * math.pi, 7, endpoint=False)], hacia=ARRIBA)

# ==================================================================================
# 3. LA CASA DE TÉ Y LOS PABELLONES
# ==================================================================================
def tejado_chino (grupo, cx, cz, mx, mz, y, alto, vuelo, sube, cima=0.45, remate=True):
    """Un tejado a cuatro aguas con las puntas levantadas: el alero vuela `vuelo`
    del cuerpo (mx × mz medios) y sus esquinas suben `sube`; arriba queda una
    cumbrera a `cima` del tamaño."""
    ex, ez = mx + vuelo, mz + vuelo
    esq = [(-ex, ez), (ex, ez), (ex, -ez), (-ex, -ez)]
    top = [(-mx * cima, mz * cima), (mx * cima, mz * cima), (mx * cima, -mz * cima), (-mx * cima, -mz * cima)]
    for i in range(4):
        (ax, az), (bx, bz) = esq[i], esq[(i + 1) % 4]
        (tax, taz), (tbx, tbz) = top[i], top[(i + 1) % 4]
        A, B = P(cx + ax, cz + az, y + sube), P(cx + bx, cz + bz, y + sube)
        M_ = P(cx + (ax + bx) / 2, cz + (az + bz) / 2, y)
        TA, TB = P(cx + tax, cz + taz, y + alto), P(cx + tbx, cz + tbz, y + alto)
        fuera = V(((ax + bx) / 2, -(az + bz) / 2, 0)).normalized() + V((0, 0, 1.2))
        for tri in ((A, M_, TA), (M_, TB, TA), (M_, B, TB)):
            cara(grupo, TEJA, list(tri), hacia=fuera, baldosa=2.4)
        if remate:
            barra('EV' if grupo == 'P' else 'T', MADERA, TA, A + (A - TA) * 0.06 + V((0, 0, 0.25)), 0.18)       # el caballete de cada esquina, que acaba en punta
    cara(grupo, TEJA, [P(cx + x, cz + z, y + alto) for x, z in top], hacia=ARRIBA, baldosa=2.4)
    return y + alto

def cuerpo (grupo_luz, cx, cz, mx, mz, y0, y1, mat, u_m=3.0):
    """Las cuatro paredes de un cuerpo, con la celosía encendida (van sin luz)."""
    for (ax, az), (bx, bz), h in (((-mx, mz), (mx, mz), V((0, -1, 0))), ((mx, mz), (mx, -mz), V((1, 0, 0))), ((mx, -mz), (-mx, -mz), V((0, 1, 0))), ((-mx, -mz), (-mx, mz), V((-1, 0, 0)))):
        largo = math.hypot(bx - ax, bz - az)
        cara(grupo_luz, mat, [P(cx + ax, cz + az, y0), P(cx + bx, cz + bz, y0), P(cx + bx, cz + bz, y1), P(cx + ax, cz + az, y1)], uvs=[(0, 0), (round(largo / u_m), 0), (round(largo / u_m), 1), (0, 1)], hacia=h)

# La casa de té: la tarima sobre pilotes y tres cuerpos, cada uno con su tejado.
Y_T = 0.5
caja('P', PIEDRA_T, -8.4, 8.4, ZT - 6.6, ZT + 6.6, -0.1, Y_T, techo=PIEDRA_T, baldosa=3.0)
for x in np.arange(-7.6, 7.7, 3.8):
    for z in (ZT - 5.8, ZT, ZT + 5.8):
        barra('EV', PIEDRA, P(float(x), z, AGUA - 0.5), P(float(x), z, -0.1), 0.4)
viga('P', PIEDRA_T, -3.0, 3.0, ZT + 6.6, ZT + 9.0, -0.1, 0.25, u_m=2.0, techo=PIEDRA_T)        # el escalón que da a la terraza
cuerpo('EP', 0.0, ZT, 7.5, 6.0, Y_T, Y_T + 3.0, CELOSIA)
y = tejado_chino('P', 0.0, ZT, 7.5, 6.0, Y_T + 3.0, 2.0, 1.9, 0.9, cima=0.62)
cuerpo('EP', 0.0, ZT, 4.5, 3.6, y - 0.1, y + 2.0, CELOSIA)
y = tejado_chino('P', 0.0, ZT, 4.5, 3.6, y + 2.0, 1.8, 1.7, 0.85, cima=0.56)
cuerpo('EP', 0.0, ZT, 2.4, 2.0, y - 0.1, y + 1.3, CELOSIA, u_m=2.4)
y = tejado_chino('P', 0.0, ZT, 2.4, 2.0, y + 1.3, 1.9, 1.5, 0.8, cima=0.08)
torno('EV', ORO, en(0.0, ZT, y - 0.1), [(0.3, 0.0), (0.16, 0.3), (0.26, 0.5), (0.1, 0.8), (0.0, 1.1)], lados=8, tapas=(False, False))
for sx in (-1, 1):                                                                  # los farolillos de las esquinas del primer alero
    for sz in (-1, 1):
        farolillo('EV', sx * 9.0, ZT + sz * 7.5, Y_T + 2.6, 0.34)
for x in (-4.5, -1.5, 1.5, 4.5):
    farolillo('EV', x, ZT + 7.7, Y_T + 2.2, 0.3)
print('CASA DE TÉ', round(y + 1.0, 2), 'm')

def pabellon (grupo, x0, x1, z0, z1, plantas=2, alto_planta=3.4):
    """Un pabellón del bazar: tapia encalada con sus ventanas encendidas y tejados de puntas levantadas."""
    cx, cz, mx, mz = (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2
    y = 0.0
    luz = 'EP' if grupo == 'P' else 'CP'
    for p in range(plantas):
        k = 1.0 - 0.22 * p
        cuerpo(luz, cx, cz, mx * k, mz * k, y, y + alto_planta, MURO_B, u_m=8.0)
        y = tejado_chino(grupo, cx, cz, mx * k, mz * k, y + alto_planta, 1.8 if p < plantas - 1 else 2.6, 1.6, 0.8, cima=0.6 if p < plantas - 1 else 0.3, remate=grupo == 'P')
        y -= 0.1
    return y
for s in (-1, 1):                                                                   # los que cierran el estanque a los lados (se ven jugando)…
    z = 16.0
    while z > -92.0:
        largo = random.choice((14.0, 17.0, 20.0))
        x0, x1 = (ORILLA + 2.0, ORILLA + 14.0) if s > 0 else (-ORILLA - 14.0, -ORILLA - 2.0)
        pabellon('P', x0, x1, z - largo, z, plantas=random.choice((1, 2, 2)))
        for zz in np.arange(z - largo + 2.0, z, 4.0):
            farolillo('EV', s * (ORILLA + 1.0), float(zz), 3.0, 0.32)
        z -= largo + 1.4
for x in np.arange(-38.0, 38.0, 19.0):                                              # …y al fondo, detrás de la casa de té
    pabellon('P', float(x), float(x) + 17.0, Z_E0 - 16.0, Z_E0 - 3.0, plantas=2)
rect('P', GRANITO, -ORILLA - 2.0, ORILLA + 2.0, Z_E0 - 3.0, Z_E0, 0.0, 3.6)           # el paseo de la orilla del fondo
for s in (-1, 1):
    rect('P', GRANITO, min(s * ORILLA, s * (ORILLA + 2.0)), max(s * ORILLA, s * (ORILLA + 2.0)), Z_E0, Z_E1, 0.0, 3.6)
    cara('P', PIEDRA_T, [P(s * ORILLA, Z_E0, AGUA - 0.6), P(s * ORILLA, Z_E1, AGUA - 0.6), P(s * ORILLA, Z_E1, 0.0), P(s * ORILLA, Z_E0, 0.0)], hacia=V((-s, 0, 0)), baldosa=3.0)
cara('P', PIEDRA_T, [P(-ORILLA, Z_E0, AGUA - 0.6), P(ORILLA, Z_E0, AGUA - 0.6), P(ORILLA, Z_E0, 0.0), P(-ORILLA, Z_E0, 0.0)], hacia=V((0, -1, 0)), baldosa=3.0)
for s in (-1, 1):                                                                   # sauces en la orilla
    for z in (-12.0, -48.0, -84.0, 10.0):
        arbol('EV', TRONCO, SAUCE, s * (ORILLA + 0.6), z + random.uniform(-3, 3), random.uniform(1.1, 1.5))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-62.0)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: EL BAZAR, LA CIUDAD VIEJA Y PUDONG ENCENDIDO
# ==================================================================================
suelo('G', SOLAR, -1500.0, 1500.0, -1500.0, 1500.0, -0.05, 8.0)
for gx in np.arange(-190.0, 190.0, 22.0):                                           # el bazar: más pabellones alrededor
    for gz in np.arange(-230.0, 160.0, 24.0):
        if abs(gx + 9) < ORILLA + 18.0 and Z_E0 - 18.0 < gz + 10 < Z_E1 + 4.0:
            continue
        if random.random() < 0.8:
            pabellon('T', float(gx), float(gx) + 18.0, float(gz), float(gz) + 19.0, plantas=random.choice((1, 2, 2, 3)))
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 46.0):                                         # la ciudad alrededor
    for gz in np.arange(-1250.0, 1250.0, 46.0):
        cx, cz = gx + 23 + random.uniform(-6, 6), gz + 23 + random.uniform(-6, 6)
        if (abs(cx) < 430.0 and -500.0 < cz < 330.0) or random.random() < 0.45:      # lejos: pegadas al jardín eran una pared de ventanas
            continue
        a = random.uniform(11.0, 17.0)
        pudong = cz < -520.0 and abs(cx - 120.0) < 420.0
        alto = random.uniform(90.0, 260.0) if pudong and random.random() < 0.5 else random.uniform(20.0, 70.0)
        caja('CP', random.choice(TORRES), cx - a, cx + a, cz - a, cz + a, 0.0, alto, techo=AZOTEA, baldosa=28.0)
        n_ed += 1
for gx in np.arange(-420.0, 420.0, 30.0):                                           # casas bajas de la ciudad vieja, entre el bazar y las torres
    for gz in np.arange(-320.0, 320.0, 30.0):
        if (abs(gx + 12) < 205.0 and -245.0 < gz + 12 < 175.0) or random.random() < 0.2:
            continue
        caja('T', MURO_B, float(gx) + 2, float(gx) + 26, float(gz) + 2, float(gz) + 26, 0.0, random.choice([7.0, 10.0, 13.0]), techo=AZOTEA, baldosa=8.0)
print('EDIFICIOS', n_ed)
# Las tres que se reconocen: la Perla de Oriente, la Torre de Shanghái y el «abrebotellas».
PX_, PZ_ = -90.0, -560.0
torno('CP', NEON[0], en(PX_, PZ_), [(9.0, 0.0), (7.0, 90.0), (6.0, 250.0), (2.0, 300.0), (0.6, 400.0)], lados=10, tapas=(False, False))
for yb, rb in ((92.0, 26.0), (258.0, 20.0), (318.0, 8.0)):
    elipsoide('CP', NEON[3] if rb > 22 else NEON[0], en(PX_, PZ_, yb), (rb, rb, rb), sub=2)
for a_ in (0.5, 2.6, 4.7):
    barra('CP', NEON[0], P(PX_ + 40.0 * math.cos(a_), PZ_ + 40.0 * math.sin(a_), 0.0), P(PX_, PZ_, 86.0), 6.0)
torno('CP', NEON[1], en(190.0, -700.0), [(40.0, 0.0), (34.0, 200.0), (26.0, 420.0), (18.0, 560.0), (6.0, 632.0)], lados=9, tapas=(False, True))
prisma('CP', TORRES[0], [(300.0, -640.0), (352.0, -640.0), (352.0, -600.0), (300.0, -600.0)], 0.0, 430.0, techo=AZOTEA, baldosa=18.0)
prisma('CP', NEON[2], [(306.0, -641.0), (346.0, -641.0), (346.0, -640.0), (306.0, -640.0)], 380.0, 425.0)
prisma('CP', TORRES[3], [(90.0, -560.0), (128.0, -560.0), (128.0, -525.0), (90.0, -525.0)], 0.0, 380.0, techo=AZOTEA, baldosa=18.0)   # la Jin Mao
torno('CP', NEON[2], en(109.0, -542.0, 380.0), [(16.0, 0.0), (6.0, 30.0), (0.5, 60.0)], lados=4, tapas=(False, False))
rect('CP', ESTANQUE, -1500.0, 1500.0, -470.0, -330.0, 0.02, 60.0)                    # el Huangpu, entre la ciudad vieja y Pudong
for cx, cz, radio, alto in ((-1900.0, -1900.0, 900.0, 30.0), (1800.0, 2000.0, 900.0, 30.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.0, seg=16, anillos=4, pico=0.7)

cupula('CP', CIELO, 3300.0, 0.0, -80.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-shanghai', ['P', 'EV', 'EP']), ('lugar-shanghai-ciudad', ['G', 'T', 'CP'])],
    # Anochecer: el último sol, rojo y flojo, y el cielo malva mandando más que en los
    # mapas de atardecer. Lo que brilla (celosías, farolillos, torres) va sin luz.
    sol_hacia=SOL, sol_color=(1.0, 0.5, 0.34), sol_fuerza=4.5, sol_ancho=5.0, cielo_fuerza=0.5, cielo_altura=4, cielo_giro=200,
    escala=0.95, satura=0.85, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
