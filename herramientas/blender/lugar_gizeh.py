# El Cairo: a los pies de la Esfinge, con la pirámide detrás (07/10/2026).
#   blender -b -P herramientas/blender/lugar_gizeh.py              (entero)
#   blender -b -P herramientas/blender/lugar_gizeh.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_gizeh.py -- --reusar  (retocar la luz)
#
# Isidro eligió para la misión de las pirámides (la del jefe): DELANTE DE LA
# ESFINGE, los alienz salen DE DEBAJO de ella («una puerta entre sus patas que
# baja a la sala de debajo de la meseta, la de la historia»), al ATARDECER y con
# llegada larga. Misma receta que los demás lugares de luz horneada.
#
# Cómo está puesto. Se mira a la cara de la Esfinge:
#   · La Esfinge va a 0,6 de su tamaño (12 m hasta lo alto de la cabeza, 44 de
#     largo): jugando solo caben trece metros de alto al fondo, y la cabeza cae en
#     el centro de arriba, que es el hueco que deja el marcador.
#   · Delante de sus patas se abre una rampa de ±7,6 que baja 4,6 m hasta una boca
#     a oscuras bajo las patas: por ahí suben los alienz y LA MADRE, que por entre
#     las patas (cuatro metros) no cabría. `hueco` y `entrada` en el juego.
#   · Detrás, pegada (a 70 m: de verdad está a medio kilómetro), la pirámide de
#     Kefrén: jugando no cabe entera —mide 86 m— y lo que se ve son sus hiladas
#     llenando todo lo alto de la pantalla. Entera, con su remate liso, se ve en
#     la llegada.
#   · EL SOL VA DONDE CONVIENE, no donde toca: la Esfinge mira al este y el sol
#     se pone por detrás de ella; al atardecer de verdad, su cara está a
#     contraluz. Aquí viene de la espalda de los soldados y algo a la izquierda:
#     la cara y la pirámide quedan doradas y las sombras se van hacia el fondo.
#   · A los lados, los sillares del templo de la Esfinge (bajos a la izquierda,
#     que con el sol tan bajo su sombra se comería dos carriles) y, a la derecha,
#     la base alien en un ruedo.
#   · Solo en el vuelo: las tres pirámides, las de las reinas, las mastabas, la
#     calzada, el desierto y, a la espalda, las casas de Gizeh hasta el pie mismo
#     de la meseta.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.45, 0.34, 0.82)                # atardecer: bajo (20°), a la espalda y algo a la izquierda
iniciar('gizeh', 2560, eje=(0.0, -100.0), encendidas=0.0, reflejo=(0.3, 0.2, 0.12))

ZANJA = 7.6                              # media anchura de la rampa
Z_BOCA, Z_PIE = -62.0, -78.0             # donde empieza a bajar y donde llega abajo (el frente de la Esfinge)
HONDO = 4.6
Z_PATAS, Z_PECHO, Z_GRUPA = -79.4, -87.0, -123.8
BASE = (12.6, -44.0)
KEFREN = (0.0, -214.5, 64.5, 86.0)       # centro, media base y alto (a 0,6)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_BOCA, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El patio del templo de la Esfinge: losas enormes de caliza, más de media
    pista tapada por la arena, con sus ondas, y las raíces negras que salen de la rampa."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    piedra = tejar(foto('rock_ground', 256, 0xe0cba0, 0.42))
    arena = tejar(foto('sand_01', 256, 0xead09a, 0.32))
    a = piedra.copy()
    alto = 1.5 * KZ
    f = 0.0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + alto))
        c = -random.uniform(0, 2.0) * KX
        while c < PW:
            largo = random.uniform(1.8, 3.2) * KX
            c0, c1 = int(max(0, c)), int(min(PW, c + largo))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.88, 1.05)
                a[f0:f1, c0:c0 + 3] = arena[f0:f1, c0:c0 + 3] * 0.8          # las juntas, anchas y llenas de arena
            c += largo
        a[f0:f0 + 3] = arena[f0:f0 + 3] * 0.8
        f += alto
    a *= (0.92 + 0.14 * nube(PH_, PW, 16, 4))[..., None]
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    tapa = np.clip((nube(PH_, PW, 20, 5) + 0.35 * np.clip((np.abs(xs) - 3.0) / 6.0, 0, 1) - 0.5) / 0.14, 0, 1)
    zs = np.linspace(0, 1, PH_, dtype=np.float32)[:, None]
    ondas = 0.95 + 0.07 * np.sin(zs * PH_ / 5.5 + 3.0 * nube(PH_, PW, 8, 3))     # las ondas que deja el viento
    a = a * (1 - tapa[..., None] * 0.94) + arena * ondas[..., None] * tapa[..., None] * 0.94
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((-4.6, -15.0, 1.4), (5.0, -34.0, 1.6), (-2.4, -51.0, 1.3)):    # la guerra: quemaduras
        mancha(x, z, r_ * 1.5, 0.84, 1.1)
        mancha(x, z, r_, 0.5)
        mancha(x + 0.2, z - 0.1, r_ * 0.5, 0.6, 1.2)
    for k in range(11):                                                 # las raíces de lo que hay debajo
        x, z = -6.6 + k * 1.32 + random.uniform(-0.4, 0.4), PZ0
        ang = math.pi / 2 + random.uniform(-0.5, 0.5)
        pasos = int(random.uniform(3.5, 11.0) * KZ)
        for i in range(pasos):
            ang += random.uniform(-0.12, 0.12) + 0.02 * (math.pi / 2 - ang)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            grosor = max(1, int(4.5 * (1 - i / pasos) ** 0.7))
            c, f_ = a_px(x, z)
            if 5 < c < PW - 6 and 0 <= f_ < PH_ - 1:
                a[f_, c - grosor:c + grosor + 1] = np.array((0.07, 0.09, 0.07), np.float32) * (1 + 0.5 * random.random())
                a[f_, c] = (0.1, 0.3, 0.16)
    for _ in range(900):                                                # chinas
        c, f_ = random.randrange(2, PW - 4), random.randrange(2, PH_ - 4)
        a[f_ + 1:f_ + 2, c + 1:c + 2] *= 0.7
        a[f_, c] = a[f_, c] * 0.4 + np.array((0.86, 0.74, 0.52), np.float32) * 0.6
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_estratos ():
    """La roca viva de la Esfinge: caliza en capas, las duras salientes y claras y
    las blandas comidas por el viento. La imagen va de la base (abajo) al lomo."""
    n = 256
    a = foto('rock_face_03', n, 0xd2b684, 0.5)
    f = 0
    while f < n:
        alto = random.randint(7, 22)
        dura = random.random() < 0.5
        a[f:f + alto] *= (1.08 if dura else 0.82) * (0.94 + 0.12 * nube(min(alto, n - f), n, 1, 9))[..., None]
        a[min(n - 1, f + alto - 1)] *= 0.62                              # la sombra bajo cada capa
        f += alto
    a *= (0.9 + 0.16 * nube(n, n, 6, 6))[..., None]
    return guardar('estratos', np.clip(a, 0, 1), 86)

def tex_nemes ():
    """El tocado: las rayas del nemes, que en la piedra son surcos."""
    a = foto('rock_face_03', 128, 0xd4b886, 0.4)
    for f in range(0, 128, 13):
        a[f:f + 4] *= 0.74
        a[f + 4:f + 6] = np.clip(a[f + 4:f + 6] * 1.08, 0, 1)
    return guardar('nemes', np.clip(a, 0, 1), 86)

def tex_piramide ():
    """Las hiladas de una pirámide: bloques de medio metro, cada uno de su ancho,
    con la sombra del escalón y la arena que se queda en cada repisa."""
    n = 256
    a = foto('rock_ground', n, 0xd9bc82, 0.45)
    for f in range(0, n, 32):
        c = -random.randint(0, 40)
        while c < n:
            ancho = random.randint(34, 70)
            c0, c1 = max(0, c), min(n, c + ancho)
            a[f:f + 32, c0:c1] *= random.uniform(0.88, 1.06)
            a[f + 3:f + 32, c0:c0 + 2] *= 0.6
            c += ancho
        a[f:f + 3] = np.clip(a[f:f + 3] * 1.14, 0, 1)                    # la repisa, con su arena
        a[f + 27:f + 32] *= 0.6                                          # y la sombra del escalón de encima
    a *= (0.9 + 0.16 * nube(n, n, 5, 5))[..., None]
    return guardar('piramide', np.clip(a, 0, 1), 86)

def tex_estela ():
    """La estela del Sueño: granito rojo, con su escena arriba y las líneas de texto."""
    a = np.tile(foto('marble_01', 128, 0xa87060, 0.4), (2, 1, 1))
    a += (E.rng.random((256, 128, 1)).astype(np.float32) - 0.5) * 0.08
    for f in range(96, 250, 9):
        for c in range(10, 118, 7):
            if random.random() < 0.8:
                a[f:f + 5, c:c + random.randint(2, 5)] *= 0.55
    for cx in (40, 88):                                                  # las dos esfinges de la escena, espalda con espalda
        a[52:70, cx - 16:cx + 16] *= 0.6; a[40:54, cx - 6:cx + 4] *= 0.6
    a[84:88, 6:122] *= 0.5
    return guardar('estela', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=1.0)
ARENA = material('arena', de_polyhaven('sand_01', 512, 0xead09a, 0.32), rug=1.0)
ESTRATOS = material('estratos', tex_estratos(), rug=1.0)
NEMES = material('nemes', tex_nemes(), rug=1.0)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xd8bc88, 0.5), rug=0.95)             # los bloques con que la calzaron
CALIZA = material('caliza', de_polyhaven('rock_face_03', 512, 0xcfb482, 0.5), rug=1.0)
PIRAMIDE = material('piramide', tex_piramide(), rug=1.0)
ESTELA = material('estela', tex_estela(), rug=0.6)
RAMPA = material('rampa', de_polyhaven('rock_ground', 512, 0xc6aa78, 0.5), rug=1.0)
SOLAR = material('solar', de_polyhaven('sandy_gravel_02', 512, 0xc9a877, 0.4), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.62, 0.52, 0.42)))
# OJO: los colores lisos van en LINEAL.
PIEDRA = material('piedra-esfinge', color=(0.58, 0.42, 0.22), rug=1.0)                                     # la caliza, sin dibujo
REMATE = material('remate', color=(0.74, 0.6, 0.4), rug=0.8)                                               # el forro liso que le queda a Kefrén arriba
GRANITO_ROJO = material('granito-rojo', color=(0.34, 0.15, 0.1), rug=0.6)
RASGO = material('rasgo', color=(0.12, 0.08, 0.045), rug=1.0)                                              # ojos, boca y la nariz que le falta
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
MONTE_L = material('monte-lejos', color=(0.6, 0.42, 0.26), rug=1.0)                                        # las dunas
DESIERTO = material('desierto', color=(0.62, 0.44, 0.24), rug=1.0)
BLANCO = material('blanco', color=(0.8, 0.76, 0.66), rug=0.7)
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.08, 0.17, 0.05), (0.11, 0.2, 0.06)])]
TRONCO = material('tronco', color=(0.16, 0.11, 0.07))
# Gizeh: ladrillo visto y hormigón, que casi ninguna casa está terminada.
FACHADAS = [material(f'f-gizeh-{i}', tex_postigos(f'gizeh-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.66, 0.42, 0.3), (0.3, 0.3, 0.3)), ((0.7, 0.62, 0.52), (0.36, 0.3, 0.24)), ((0.6, 0.4, 0.3), (0.5, 0.46, 0.4)), ((0.8, 0.72, 0.58), (0.3, 0.4, 0.44))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.98, 0.72, 0.5)), (0.05, (0.96, 0.68, 0.52)), (0.16, (0.8, 0.6, 0.62)), (0.4, (0.44, 0.48, 0.74)), (1.0, (0.16, 0.24, 0.54))],
    (SOL[0], SOL[2]), 0.1, (0.9, 0.42, 0.08), ((1.0, 0.7, 0.46), (0.72, 0.6, 0.7)), cuanta_nube=0.1), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL PATIO, LA RAMPA Y LA BOCA DE DEBAJO DE LA ESFINGE
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-90, 90), (-300, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
# El resto de la meseta: arena, a trozos que no pisan ni la pista ni la rampa.
suelo('GP', ARENA, -1500.0, PX0, -1500.0, 60.0, 0.0, 9.0)
suelo('GP', ARENA, PX1, 1500.0, -1500.0, 60.0, 0.0, 9.0)
suelo('GP', ARENA, PX0, PX1, PZ1, 60.0, 0.0, 9.0)
suelo('GP', ARENA, PX0, -ZANJA, Z_PIE, Z_BOCA, 0.0, 9.0)
suelo('GP', ARENA, ZANJA, PX1, Z_PIE, Z_BOCA, 0.0, 9.0)
suelo('GP', ARENA, PX0, PX1, -1500.0, Z_PIE, 0.0, 9.0)

Z_TUNEL = Z_PIE - 14.0                                                              # hasta donde llega lo oscuro
cara('P', RAMPA, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)],
     uvs=[(0, 0), (4, 0), (4, 4.4), (0, 4.4)], hacia=ARRIBA)
cara('P', RAMPA, [P(-ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_TUNEL, -HONDO), P(-ZANJA, Z_TUNEL, -HONDO)],
     uvs=[(0, 4.4), (4, 4.4), (4, 8), (0, 8)], hacia=ARRIBA)
for s in (-1, 1):
    cara('P', SILLAR, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_PIE, 0.0)], hacia=V((-s, 0, 0)), baldosa=3.0)   # el muro de la rampa
    viga('P', SILLAR, min(s * ZANJA, s * (ZANJA + 0.7)), max(s * ZANJA, s * (ZANJA + 0.7)), Z_PIE, Z_BOCA - 0.2, 0.0, 0.6, u_m=3.0)        # y su pretil
    bloque('P', CALIZA, en(s * (ZANJA + 0.35), Z_BOCA + 0.3), (1.0, 1.0, 1.1), mella=0.05)
# El frente: la repisa de roca sobre la que apoyan las patas, y debajo la boca, a oscuras.
Y_BOCA = -0.6
viga('P', CALIZA, -ZANJA - 0.7, ZANJA + 0.7, Z_PIE - 1.6, Z_PIE, Y_BOCA, 0.0, u_m=3.0)
cara('EP', NEGRO, [P(-ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, -HONDO), P(ZANJA, Z_PIE - 0.05, Y_BOCA), P(-ZANJA, Z_PIE - 0.05, Y_BOCA)], hacia=V((0, -1, 0)))
for x, y, r in ((-4.6, 1.0, 0.5), (-1.8, 2.4, 0.38), (1.2, 1.2, 0.62), (4.2, 2.6, 0.42), (0.2, 0.6, 0.3), (-6.0, 2.9, 0.26), (6.2, 0.9, 0.36), (2.8, 3.4, 0.22)):
    cara('EP', BRILLO_HONDO if r > 0.4 else VERDE, [P(x + r * math.cos(a_), Z_PIE - 0.02, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(9):                                                                 # las raíces, rampa arriba
    x = -6.4 + k * 1.6 + random.uniform(-0.4, 0.4)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, Z_PIE - 0.2, -HONDO + 0.1), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.42))

# ==================================================================================
# 3. LA ESFINGE
# ==================================================================================
# De MESHY (10/10, 30 créditos; Isidro: «haz todas estas con Meshy»): la que se
# hacía aquí por piezas —el cuerpo por secciones, el nemes extruido, la cara una
# bola con los rasgos pegados— está en el historial de git. El modelo trae su
# zócalo de sillares; va en un grupo `vert` (su textura, y la luz en los vértices),
# con las patas donde estaban: en el borde de la rampa.
esfinge = importar(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'esfinge.glb'), 'SV', 12.4, 0.0, -100.0)
vs = np.array([v.co[:] for v in esfinge.data.vertices])
esfinge.data.transform(M.Translation((0, -Z_PATAS - float(vs[:, 1].min()), 0)))      # en Blender, hacia la cámara es -Y
print('ESFINGE: ancho', round(float(vs[:, 0].max() - vs[:, 0].min()), 1), 'largo', round(float(vs[:, 1].max() - vs[:, 1].min()), 1), len(esfinge.data.polygons), 'caras')
print('ESFINGE', 12.0, 'm')

# ==================================================================================
# 4. LOS LADOS DEL PATIO Y EL FOSO DE LA ESFINGE
# ==================================================================================
# El templo de la Esfinge: pilares de caliza gigantes, algunos con su forro de
# granito. A la IZQUIERDA no pasan de metro y medio: el sol viene de ahí, bajo, y
# la sombra de un pilar de tres metros llegaba a los carriles.
for z in np.arange(-56.0, 8.0, 6.2):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 6.6:
            continue
        x = s * random.uniform(8.6, 9.2)
        alto = random.uniform(0.7, 1.5) if s < 0 else random.uniform(1.2, 3.2)
        bloque('P', GRANITO_ROJO if random.random() < 0.25 else CALIZA, en(x + s * 0.4, float(z) + random.uniform(-0.8, 0.8), 0.0, random.uniform(-0.08, 0.08)), (1.5, 1.7, alto), baldosa=2.4, mella=0.05)
for s in (-1, 1):                                                                  # y el muro del recinto, detrás
    z = 10.0
    while z > -60.0:
        largo = random.uniform(2.6, 4.2)
        alto = random.uniform(1.2, 2.0) if s < 0 else random.uniform(2.2, 4.4)
        if not (s > 0 and z > BASE[1] - 6.0 and z - largo < BASE[1] + 6.0):             # ahí va el ruedo de la base alien
            caja('P', CALIZA, min(s * 11.6, s * 13.4), max(s * 11.6, s * 13.4), z - largo, z, -0.1, alto, baldosa=3.0)
        z -= largo
# El ruedo de la base alien.
torno('P', SILLAR, en(BASE[0], BASE[1]), [(5.15, -0.1), (5.15, 0.45), (4.7, 0.45), (4.7, 0.04)], lados=28, u_rep=12, v_m=1.2, tapas=(False, False))
cara('P', RAMPA, [P(BASE[0] + 4.7 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.7 * math.sin(2 * math.pi * i / 28), 0.04) for i in range(28)], hacia=ARRIBA, baldosa=3.0)
# El foso: las paredes de roca cortada a los lados y detrás de la Esfinge.
for s in (-1, 1):
    z = Z_BOCA - 1.0
    while z > Z_GRUPA - 8.0:
        largo = random.uniform(5.0, 9.0)
        caja('E', CALIZA, min(s * 15.0, s * 30.0), max(s * 15.0, s * 30.0), z - largo, z, -0.1, random.uniform(3.4, 5.6), techo=ARENA, baldosa=4.0)
        z -= largo
caja('E', CALIZA, -30.0, 30.0, Z_GRUPA - 22.0, Z_GRUPA - 7.0, -0.1, 5.2, techo=ARENA, baldosa=4.0)

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-61.5)

# ==================================================================================
# 5. LAS PIRÁMIDES
# ==================================================================================
def piramide (grupo, cx, cz, medio, alto, mat=None, remate=False):
    """Una pirámide de base cuadrada: cuatro caras con las hiladas a lo largo."""
    mat = mat or PIRAMIDE
    esq = [(cx - medio, cz + medio), (cx + medio, cz + medio), (cx + medio, cz - medio), (cx - medio, cz - medio)]
    apice = P(cx, cz, alto)
    cuesta = math.hypot(alto, medio)
    for i in range(4):
        (ax, az), (bx, bz) = esq[i], esq[(i + 1) % 4]
        q = [P(ax, az, 0.0), P(bx, bz, 0.0), apice]
        cara(grupo, mat, q, uvs=[(0, 0), (2 * medio / 4.0, 0), (medio / 4.0, cuesta / 4.0)], hacia=(q[0] + q[1]) / 2 - P(cx, cz, 0.0) + V((0, 0, medio * 0.6)))
    if remate:                                                                       # lo que le queda del forro liso, arriba
        k = 0.24
        e2 = [(cx + (x - cx) * k * 1.03, cz + (z - cz) * k * 1.03) for x, z in esq]
        y0 = alto * (1 - k)
        for i in range(4):
            (ax, az), (bx, bz) = e2[i], e2[(i + 1) % 4]
            q = [P(ax, az, y0), P(bx, bz, y0), P(cx, cz, alto + 0.4)]
            cara(grupo, REMATE, q, hacia=(q[0] + q[1]) / 2 - P(cx, cz, y0) + V((0, 0, medio * 0.2)))
piramide('E', *KEFREN, remate=True)                                                 # Kefrén, detrás de la Esfinge: la que se ve jugando
print('KEFRÉN: el pie a z =', KEFREN[1] + KEFREN[2])
piramide('T', 250.0, -330.0, 69.0, 83.0)                                             # Keops, la grande, a la derecha
piramide('T', -230.0, -470.0, 31.0, 39.0)                                            # Micerino, más allá
for k in range(3):                                                                   # y las de las reinas
    piramide('T', 345.0, -300.0 - k * 34.0, 12.0, 14.0)
    piramide('T', -285.0 + k * 30.0, -545.0, 9.0, 10.0)
# Las mastabas: las tumbas de los nobles, en hileras, al pie de Keops.
for x in np.arange(110.0, 180.0, 16.0):
    for z in np.arange(-420.0, -250.0, 12.0):
        if random.random() < 0.8:
            caja('T', CALIZA, float(x), float(x) + 11.0, float(z), float(z) + 7.0, 0.0, random.uniform(2.0, 3.4), techo=ARENA, baldosa=4.0)

# ==================================================================================
# 6. EL DESIERTO Y, A LA ESPALDA, GIZEH
# ==================================================================================
for cx, cz, radio, alto in ((-760.0, -900.0, 520.0, 60.0), (600.0, -1100.0, 600.0, 75.0), (-200.0, -1500.0, 700.0, 90.0), (-1200.0, -300.0, 500.0, 50.0), (1250.0, -500.0, 520.0, 55.0)):
    monte('T', MONTE_L, cx, cz, radio, alto, y0=0.3, seg=20, anillos=5, pico=0.7)
for x0, x1, z0, z1 in ((-3200.0, -1500.0, -3200.0, 3200.0), (1500.0, 3200.0, -3200.0, 3200.0), (-1500.0, 1500.0, -3200.0, -1500.0), (-1500.0, 1500.0, 1500.0, 3200.0)):
    rect('CP', DESIERTO, x0, x1, z0, z1, -0.3, 200.0)
# El pueblo llega hasta el pie mismo de la meseta: casas de ladrillo a medio hacer.
suelo('G', SOLAR, -1500.0, 1500.0, 60.0, 1500.0, 0.0, 8.0)
n_ed = 0
for gx in np.arange(-1250.0, 1250.0, 34.0):
    for gz in np.arange(74.0, 1300.0, 34.0):
        if random.random() < 0.12:
            continue
        cx, cz = gx + 17 + random.uniform(-4, 4), gz + 17 + random.uniform(-4, 4)
        ax, az = random.choice((9.0, 10.5, 12.0, 13.5)), random.choice((9.0, 10.5, 12.0, 13.5))
        cerca = min(1.0, (cz - 60.0) / 500.0)
        alto = random.choice([10, 13, 16]) + (random.choice([0, 6, 12]) if cerca > 0.3 else 0)
        caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, 0.0, alto, techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
for _ in range(60):
    x, z = random.uniform(-600.0, 600.0), random.uniform(62.0, 72.0)
    palmera('T', TRONCO, PALMA, x, z, alto=random.uniform(7.0, 10.0))
for x, z in ((-180.0, 150.0), (240.0, 260.0), (-420.0, 420.0), (60.0, 520.0)):          # y sus alminares
    torno('T', BLANCO, en(x, z), [(2.2, 0.0), (1.8, 22.0), (2.6, 23.0), (2.6, 24.0), (1.4, 24.3), (1.3, 32.0), (0.0, 37.0)], lados=8, tapas=(False, False))

cupula('CP', CIELO, 3300.0, 0.0, -100.0)

# ==================================================================================
# 7. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-meseta', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'SV': ('vert-esfinge', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-gizeh', ['P', 'E', 'GP', 'EV', 'SV', 'EP']), ('lugar-gizeh-ciudad', ['C', 'G', 'T', 'CP'])],
    # Atardecer, como en Atenas: está en el COLOR del sol. Muy naranja y fuerte, cielo flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.56, 0.24), sol_fuerza=7.5, sol_ancho=4.0, cielo_fuerza=0.3, cielo_altura=6, cielo_giro=200,
    # La escala va más alta que en Atenas: con el sol a 20° al suelo le llega un tercio
    # de la luz, y la arena, que es más subida de color que la roca, salía apagada.
    escala=0.72, satura=1.0, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
