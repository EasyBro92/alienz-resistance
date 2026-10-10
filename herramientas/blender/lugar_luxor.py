# Luxor: la avenida de las esfinges, con la gran puerta del templo al fondo (07/10/2026).
#   blender -b -P herramientas/blender/lugar_luxor.py              (entero)
#   blender -b -P herramientas/blender/lugar_luxor.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_luxor.py -- --reusar  (retocar la luz)
#
# Isidro eligió para Luxor la AVENIDA DE LAS ESFINGES con la gran puerta de Karnak
# al fondo, los alienz SALEN DEL TEMPLO, a MEDIODÍA con sol duro y llegada larga.
# Misma receta que los demás lugares de luz horneada (horneado.py).
#
# Cómo está puesto. Se mira al este, hacia el templo, con el sol casi en lo alto:
#   · a los LADOS, las dos filas de esfinges con cabeza de carnero (las de Karnak),
#     cada una en su pedestal y mirando a la calzada, y detrás las palmeras;
#   · al FONDO, el pilono: las dos torres en talud con sus relieves pintados y su
#     gola de colores, la puerta entre ellas con el disco solar alado en el dintel,
#     dos colosos sentados a los lados y un obelisco de granito rosa. Va a la
#     medida del juego (12,3 m de alto: lo que cabe en un móvil); el primer pilono
#     de Karnak mide 43.
#   · Los alienz nacen dentro, detrás de la puerta a oscuras, y salen por ella en
#     abanico cerrado (es estrecha: `entrada.abanico` en la misión); se abren a
#     sus carriles al pasar los colosos.
#   · La base alien, a la derecha, en un claro de la fila de esfinges.
#   · Solo en el vuelo: Karnak entero detrás del pilono —el patio, la sala de las
#     columnas gigantes, los obeliscos, el lago sagrado, la muralla de adobe—, el
#     palmeral, el Nilo y, al otro lado, la montaña tebana.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.25, 0.86, 0.45)                # mediodía: casi en lo alto, algo a la espalda
iniciar('luxor', 1350, eje=(0.0, -65.0), encendidas=0.0, reflejo=(0.2, 0.18, 0.12))

CALZADA = 8.4                            # media anchura de la calzada de losas
Z_P = -62.0                              # la cara del pilono
FONDO_P = 6.0                            # su grosor
ALTO_P = 12.3
VANO, ALTO_VANO = 2.2, 7.2               # la puerta: media anchura y alto
X_TORRE0, X_TORRE1 = 4.0, 15.5           # cada torre, de dentro afuera
BASE = (12.6, -44.0)
RIO_Z = 430.0                            # la orilla del Nilo, a la espalda

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -CALZADA, CALZADA, Z_P, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """La calzada de las procesiones: losas grandes de arenisca en hiladas, cada
    una de su largo, pulidas por el centro y medio comidas por la arena a los lados."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    piedra = tejar(foto('rock_ground', 256, 0xdcc79c, 0.45))
    otra = tejar(foto('concrete_floor_worn_001', 256, 0xd3bd90, 0.45))
    arena = tejar(foto('sand_01', 256, 0xe3c994, 0.35))
    m = np.clip((nube(PH_, PW, 30, 8) - 0.45) / 0.2, 0, 1)[..., None]
    a = piedra * (1 - m) + otra * m
    alto = 0.9 * KZ
    f = 0.0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + alto))
        c = -random.uniform(0, 1.2) * KX
        while c < PW:
            largo = random.uniform(1.2, 2.5) * KX
            c0, c1 = int(max(0, c)), int(min(PW, c + largo))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.9, 1.06)
                a[f0:f1, c0:c0 + 2] *= 0.66
                if random.random() < 0.12:                              # una esquina rota, con su arena
                    k = random.randint(5, 11)
                    a[f1 - k:f1, c1 - k:c1] = arena[f1 - k:f1, c1 - k:c1] * 0.82
            c += largo
        a[f0:f0 + 2] *= 0.66
        f += alto
    xs = np.linspace(PX0, PX1, PW, dtype=np.float32)[None, :]
    a *= (1 + 0.08 * np.exp(-(xs / 2.2) ** 2))[..., None]              # el centro, pulido por tres mil años de procesiones
    a *= (0.94 + 0.12 * nube(PH_, PW, 16, 4))[..., None]
    # La arena: lenguas largas que entran desde los lados.
    mar = np.clip((nube(PH_, PW, 22, 5) + 0.6 * np.clip((np.abs(xs) - 4.6) / 3.8, 0, 1) - 0.64) / 0.14, 0, 1)[..., None]
    a = a * (1 - mar * 0.9) + arena * mar * 0.9
    def mancha (x, z, r_, k, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((4.8, -12.0, 1.4), (-5.2, -33.0, 1.5), (2.6, -50.0, 1.3)):     # la guerra: quemaduras
        mancha(x, z, r_ * 1.5, 0.84, 1.1)
        mancha(x, z, r_, 0.5)
        mancha(x + 0.2, z - 0.1, r_ * 0.5, 0.6, 1.2)
    for _ in range(60):                                                 # grietas
        c, f_ = random.uniform(0, PW), random.uniform(0, PH_)
        g = random.uniform(0, 6.28)
        for _ in range(random.randint(16, 70)):
            g += random.uniform(-0.4, 0.4)
            c += math.cos(g); f_ += math.sin(g)
            ci, fi = int(c), int(f_)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.64
    for _ in range(1100):                                               # chinas
        c, f_ = random.randrange(2, PW - 4), random.randrange(2, PH_ - 4)
        a[f_ + 1:f_ + 2, c + 1:c + 2] *= 0.7
        a[f_, c] = a[f_, c] * 0.4 + np.array((0.86, 0.78, 0.6), np.float32) * 0.6
    return guardar('pista', np.clip(a, 0, 1), 88)

def glifos (a, c0, f0, c1, f1, paso=13, tono=0.5):
    """Rellena un paño de jeroglíficos a bulto: marcas pequeñas en columna."""
    for f in range(f0 + 4, f1 - 8, paso):
        for c in range(c0 + 4, c1 - 8, paso):
            t = random.randrange(6)
            if t == 0:
                a[f:f + 8, c:c + 2] *= tono; a[f:f + 2, c:c + 7] *= tono
            elif t == 1:
                a[f + 2:f + 7, c:c + 7] *= tono; a[f + 3:f + 6, c + 1:c + 6] /= max(tono, 0.01) * 1.02
            elif t == 2:
                a[f + 3:f + 5, c:c + 9] *= tono; a[f:f + 3, c + 6:c + 9] *= tono
            elif t == 3:
                for k in range(0, 8, 2):
                    a[f + (k % 4):f + (k % 4) + 2, c + k:c + k + 2] *= tono
            elif t == 4:
                a[f:f + 9, c + 3:c + 5] *= tono; a[f + 6:f + 9, c:c + 8] *= tono
            else:
                a[f + 1:f + 7, c + 1:c + 6] *= tono

def tex_relieve ():
    """La cara de una torre del pilono: el rey machacando a los enemigos ante el
    dios, en relieve hundido y con lo que queda de la pintura, entre columnas de
    jeroglíficos. u = 0 es el lado de la puerta."""
    n = 1024
    base = np.tile(foto('sandstone_blocks_08', 256, 0xdcc698, 0.45), (4, 4, 1))
    base *= (0.92 + 0.14 * nube(n, n, 7, 7))[..., None]
    a, elipse, poligono, trazo = lienzo_dibujo(n, n, base)
    SOMBRA = (0.52, 0.42, 0.28)
    def con_sombra (dibuja, color):
        dibuja(SOMBRA, 3); dibuja(color, 0)
    def figura (x, y, h, m, piel, tocado, que):
        Y = lambda f: y - f * h
        def cuerpo (color, d):
            poligono([(x + d + 0.02 * h * m, Y(0.5) + d), (x + d + 0.08 * h * m, Y(0.5) + d), (x + d + 0.2 * h * m, Y(0) + d), (x + d + 0.1 * h * m, Y(0) + d)], color)     # la pierna que avanza
            poligono([(x + d - 0.06 * h * m, Y(0.5) + d), (x + d + 0.0 * h * m, Y(0.5) + d), (x + d - 0.1 * h * m, Y(0) + d), (x + d - 0.18 * h * m, Y(0) + d)], color)    # y la de atrás
            poligono([(x + d - 0.13 * h, Y(0.82) + d), (x + d + 0.13 * h, Y(0.82) + d), (x + d + 0.07 * h, Y(0.6) + d), (x + d - 0.07 * h, Y(0.6) + d)], color)             # el torso, de frente
            elipse(x + d + 0.02 * h * m, Y(0.885) + d, 0.05 * h, 0.055 * h, color)
            trazo([(x + d + 0.11 * h * m, Y(0.8) + d), (x + d + 0.24 * h * m, Y(0.7) + d), (x + d + 0.34 * h * m, Y(0.72) + d)], color, 0.018 * h)                         # el brazo tendido
            if que == 'maza':
                trazo([(x + d - 0.11 * h * m, Y(0.8) + d), (x + d - 0.22 * h * m, Y(0.92) + d), (x + d - 0.14 * h * m, Y(1.04) + d)], color, 0.018 * h)                    # el brazo en alto
        con_sombra(cuerpo, piel)
        def faldellin (color, d):
            der, izq = (0.15, 0.1) if m > 0 else (0.1, 0.15)                 # el pico del faldellín, hacia donde mira
            poligono([(x + d - 0.08 * h, Y(0.62) + d), (x + d + 0.08 * h, Y(0.62) + d), (x + d + der * h, Y(0.44 if m > 0 else 0.46) + d), (x + d - izq * h, Y(0.46 if m > 0 else 0.44) + d)], color)
        con_sombra(faldellin, (0.9, 0.86, 0.74))
        if tocado == 'corona':                                           # la corona azul del rey
            poligono([(x - 0.06 * h, Y(0.93)), (x + 0.07 * h * m + 0.0, Y(0.92)), (x + 0.05 * h * m, Y(1.0)), (x - 0.07 * h * m, Y(1.01))], (0.3, 0.42, 0.6))
        else:                                                            # las dos plumas altas de Amón
            for k in (-0.025, 0.02):
                poligono([(x + (k - 0.02) * h, Y(0.93)), (x + (k + 0.02) * h, Y(0.93)), (x + (k + 0.02) * h, Y(1.16)), (x + (k - 0.02) * h, Y(1.16))], (0.82, 0.62, 0.26))
        if que == 'maza':
            trazo([(x - 0.14 * h * m, Y(1.04)), (x + 0.02 * h * m, Y(1.14))], (0.42, 0.3, 0.18), 0.012 * h)
            elipse(x + 0.03 * h * m, Y(1.145), 0.028 * h, 0.022 * h, (0.86, 0.82, 0.7))
        else:
            trazo([(x + 0.34 * h * m, Y(0.72)), (x + 0.42 * h * m, Y(0.82)), (x + 0.5 * h * m, Y(0.8))], (0.82, 0.62, 0.26), 0.012 * h)   # la espada curva que le tiende
    # El dios, a la izquierda (junto a la puerta), y el rey frente a él.
    figura(190, 800, 470, 1, (0.3, 0.44, 0.62), 'plumas', 'espada')
    figura(640, 800, 500, -1, (0.66, 0.32, 0.18), 'corona', 'maza')
    for k in range(7):                                                   # el racimo de enemigos, cogidos del pelo
        ex, ey = 420 + (k % 4) * 34 + (k // 4) * 16, 800 - (k // 4) * 26
        elipse(ex + 3, ey - 70 + 3, 15, 34, SOMBRA); elipse(ex, ey - 70, 15, 34, (0.74, 0.5, 0.26) if k % 2 else (0.42, 0.26, 0.16))
        elipse(ex, ey - 118, 11, 12, (0.74, 0.5, 0.26) if k % 2 else (0.42, 0.26, 0.16))
        trazo([(ex - 6, ey - 96), (ex - 22, ey - 132)], (0.52, 0.34, 0.2), 3.0)
    trazo([(476, 800 - 0.72 * 500), (470, 668)], (0.2, 0.16, 0.12), 3.0)
    # Los paños de jeroglíficos: columnas a los lados y un friso arriba.
    for c0 in (40, 78, 838, 876, 914, 952):
        a[150:830, c0:c0 + 2] *= 0.6
        glifos(a, c0 + 2, 150, c0 + 36, 830)
    a[150:830, 990:992] *= 0.6
    for f0 in (60, 100):
        a[f0:f0 + 2, 30:994] *= 0.6
        glifos(a, 30, f0, 994, f0 + 40, paso=14)
    a[140:142, 30:994] *= 0.6
    for cx in (330, 760):                                                # los cartuchos, sobre las figuras
        elipse(cx, 230, 30, 62, (0.56, 0.44, 0.28)); elipse(cx, 230, 25, 57, (0.86, 0.76, 0.52))
        glifos(a, cx - 18, 180, cx + 18, 284, paso=12)
    a[836:842, :] *= 0.62                                                # el suelo de la escena
    a[842:] *= 0.94                                                      # y el zócalo liso
    a *= (0.9 + 0.16 * nube(n, n, 5, 5))[..., None]
    return guardar('relieve', np.clip(a, 0, 1), 90)

def tex_gola ():
    """La gola: la cornisa egipcia de hojas de palma, a rayas de colores."""
    a = lienzo(64, 64, (0.86, 0.76, 0.54))
    for k, color in enumerate(((0.3, 0.44, 0.6), (0.86, 0.76, 0.54), (0.66, 0.3, 0.2), (0.86, 0.76, 0.54), (0.4, 0.52, 0.36), (0.86, 0.76, 0.54), (0.66, 0.3, 0.2), (0.86, 0.76, 0.54))):
        a[4:52, k * 8:k * 8 + 7] = color
    a[52:58] = (0.56, 0.44, 0.28); a[58:] = (0.82, 0.72, 0.5)
    a *= (0.88 + 0.2 * nube(64, 64, 4, 4))[..., None]
    return guardar('gola', np.clip(a, 0, 1), 88)

def tex_disco ():
    """El disco solar alado del dintel: el disco rojo con sus dos cobras y las alas tendidas."""
    W, Hh = 512, 128
    base = np.tile(foto('sandstone_blocks_08', 128, 0xdcc698, 0.3), (1, 4, 1))
    a, elipse, poligono, trazo = lienzo_dibujo(Hh, W, base)
    for m in (-1, 1):
        for fila, (color, y0, largo) in enumerate((((0.3, 0.44, 0.6), 40, 232), ((0.4, 0.54, 0.38), 60, 200), ((0.68, 0.32, 0.2), 78, 150))):
            poligono([(256 + m * 26, y0), (256 + m * largo, y0 + 4), (256 + m * (largo - 16), y0 + 20), (256 + m * 26, y0 + 20)], color)
            for cx in range(40, largo, 12):
                a[y0:y0 + 20, 256 + m * cx:256 + m * cx + 2] *= 0.6
        elipse(256 + m * 34, 74, 7, 22, (0.82, 0.62, 0.26))             # las cobras
    elipse(256, 64, 34, 34, (0.5, 0.36, 0.2)); elipse(256, 64, 30, 30, (0.74, 0.26, 0.14))
    a[:10] *= 0.8; a[118:] *= 0.8
    a *= (0.9 + 0.16 * nube(Hh, W, 3, 9))[..., None]
    return guardar('disco-alado', np.clip(a, 0, 1), 90)

def tex_glifos (nombre, tono, ancho=128, alto=512, columnas=2):
    """Un paño de jeroglíficos en columnas: para las jambas (arenisca) y el obelisco (granito)."""
    a = np.tile(foto('marble_01' if nombre == 'obelisco' else 'sandstone_blocks_08', 128, tono, 0.3), (alto // 128, max(1, ancho // 128), 1))[:alto, :ancho].copy()
    if nombre == 'obelisco':
        a += (E.rng.random((alto, ancho, 1)).astype(np.float32) - 0.5) * 0.08    # el grano del granito
    paso = ancho // (columnas + 1)
    for k in range(columnas):
        c0 = paso // 2 + k * paso + (paso - 30) // 2 if columnas > 1 else ancho // 2 - 17
        a[:, c0:c0 + 2] *= 0.6; a[:, c0 + 32:c0 + 34] *= 0.6
        glifos(a, c0 + 2, 0, c0 + 32, alto, paso=13, tono=0.55)
    return guardar(nombre, np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=1.0)
ARENISCA = material('arenisca', de_polyhaven('sandstone_blocks_08', 512, 0xdcc698, 0.45), rug=0.95)
ARENISCA_O = material('arenisca-oscura', de_polyhaven('sandstone_blocks_08', 512, 0xc7af84, 0.5), rug=0.95)
RELIEVE = material('relieve', tex_relieve(), rug=0.95)
GOLA = material('gola', tex_gola(), rug=0.9)
DISCO = material('disco-alado', tex_disco(), rug=0.9)
JAMBA = material('jamba', tex_glifos('jamba', 0xdcc698), rug=0.95)
OBELISCO = material('obelisco', tex_glifos('obelisco', 0xb98c78, columnas=1), rug=0.6)
LOSA = material('losa', de_polyhaven('rock_ground', 512, 0xd8c298, 0.45), rug=1.0)
ARENA = material('arena', de_polyhaven('sand_01', 512, 0xe3c994, 0.35), rug=1.0)
ADOBE = material('adobe', de_polyhaven('brown_mud_dry', 512, 0x9c7c58, 0.5), rug=1.0)
CAMPO = material('campo', de_polyhaven('leafy_grass', 512, 0x7c9258, 0.4), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.78, 0.7, 0.56)))
# OJO: los colores lisos van en LINEAL.
PIEDRA_LISA = material('piedra-lisa', color=(0.6, 0.46, 0.27), rug=0.95)            # la arenisca de las esfinges, sin dibujo
GRANITO = material('granito-gris', color=(0.24, 0.21, 0.2), rug=0.6)
ORO = material('oro', color=(0.8, 0.52, 0.1), rug=0.3)
MASTIL = material('mastil', color=(0.24, 0.13, 0.06), rug=0.8)
GALLARDETES = [material(f'gallardete-{i}', color=c, rug=0.9) for i, c in enumerate([(0.55, 0.05, 0.04), (0.8, 0.78, 0.7), (0.05, 0.16, 0.42), (0.06, 0.3, 0.14)])]
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.08, 0.17, 0.05), (0.11, 0.2, 0.06)])]
TRONCO = material('tronco', color=(0.16, 0.11, 0.07))
# Lo que va sin luz (grupo 'plano') lleva el color en la BASE: con emisión, y sin
# llamarse `brillo-…`, el juego se queda con la base, que es negra, y el Nilo salía negro.
RIO = material('rio', color=(0.14, 0.34, 0.38), rug=0.2)
LAGO = material('lago', color=(0.1, 0.28, 0.32), rug=0.2)
BLANCO = material('blanco', color=(0.8, 0.79, 0.74), rug=0.7)
VELA = material('vela', color=(0.82, 0.78, 0.66), rug=0.9)
MADERA = material('madera', color=(0.2, 0.12, 0.06), rug=0.9)
MONTE_L = material('monte-lejos', color=(0.62, 0.42, 0.3), rug=1.0)                  # la montaña tebana: caliza rosada, pelada
DESIERTO = material('desierto', color=(0.66, 0.5, 0.3), rug=1.0)
FACHADAS = [material(f'f-luxor-{i}', tex_postigos(f'luxor-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.9, 0.82, 0.64), (0.3, 0.42, 0.5)), ((0.86, 0.74, 0.56), (0.42, 0.3, 0.22)), ((0.93, 0.9, 0.82), (0.3, 0.44, 0.36))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.9, 0.88, 0.82)), (0.05, (0.74, 0.83, 0.93)), (0.22, (0.36, 0.6, 0.92)), (0.6, (0.15, 0.4, 0.85)), (1.0, (0.07, 0.26, 0.7))],
    (SOL[0], SOL[2]), 0.66, (0.3, 0.26, 0.16), ((1.0, 1.0, 1.0), (0.94, 0.95, 0.98)), cuanta_nube=0.5), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA CALZADA, LAS ESFINGES Y LAS PALMERAS
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-76, 76), (-200, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSA, -CALZADA, CALZADA, PZ1, 230.0, 0.0, 3.0)                          # la calzada sigue hasta el muelle del río
suelo('GN', ARENA, -76.0, -CALZADA, Z_P, 230.0, 0.0, 6.0)
suelo('GN', ARENA, CALZADA, 76.0, Z_P, 230.0, 0.0, 6.0)

def T (x, y, z):
    return M.Translation(V((x, y, z)))

def criosfinge (grupo, x, z, giro, fina=True):
    """Una esfinge de Karnak: cuerpo de león echado y cabeza de carnero, con el rey
    pequeño entre las patas, sobre su pedestal. `giro`: hacia dónde mira (0 = +x)."""
    m = en(x, z, 0.0, giro)
    bloque(grupo, ARENISCA, m, (2.7, 1.15, 0.72), baldosa=1.6, mella=0.02)
    bloque(grupo, ARENISCA_O, m @ T(0, 0, 0.72), (2.9, 1.3, 0.12), baldosa=1.6, mella=0.01)
    y = 0.84
    elipsoide(grupo, PIEDRA_LISA, m @ T(-0.2, 0, y + 0.38), (1.02, 0.4, 0.42))       # el lomo
    elipsoide(grupo, PIEDRA_LISA, m @ T(0.55, 0, y + 0.52), (0.42, 0.4, 0.56))       # el pecho
    elipsoide(grupo, PIEDRA_LISA, m @ T(0.84, 0, y + 1.16), (0.36, 0.3, 0.36))       # la cabeza
    if not fina:
        return
    for s in (-1, 1):
        elipsoide(grupo, PIEDRA_LISA, m @ T(-0.75, s * 0.3, y + 0.34), (0.42, 0.24, 0.4))                  # las ancas
        bloque(grupo, PIEDRA_LISA, m @ T(1.0, s * 0.3, y), (0.9, 0.22, 0.2), mella=0.02)                    # las patas de delante
        torno(grupo, PIEDRA_LISA, m @ T(0.74, s * 0.36, y + 1.08) @ mathutils.Euler((math.pi / 2, 0, 0)).to_matrix().to_4x4(),
              [(0.33, -0.07), (0.33, 0.07)], lados=8)                                                        # los cuernos, enroscados
    elipsoide(grupo, PIEDRA_LISA, m @ T(1.14, 0, y + 1.0), (0.22, 0.16, 0.17))       # el hocico
    bloque(grupo, PIEDRA_LISA, m @ T(1.16, 0, y), (0.24, 0.24, 0.62), mella=0.02)    # el rey, a su amparo
    elipsoide(grupo, PIEDRA_LISA, m @ T(1.16, 0, y + 0.72), (0.11, 0.11, 0.12))

X_ESF = 9.9
for z in np.arange(6.0, Z_P + 4.0, -4.4):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 6.4:
            continue                                                                # el claro de la base alien
        criosfinge('P', s * X_ESF, float(z), math.pi if s > 0 else 0.0)
for z in np.arange(14.8, 226.0, 4.4):                                                # y las de más allá, que solo salen en el vuelo
    for s in (-1, 1):
        criosfinge('T', s * X_ESF, float(z), math.pi if s > 0 else 0.0, fina=False)
for z in np.arange(8.0, Z_P + 6.0, -8.8):                                            # las palmeras, detrás de cada fila
    for s in (-1, 1):
        if s > 0 and abs(z - 2.2 - BASE[1]) < 7.5:
            continue
        palmera('EV', TRONCO, PALMA, s * (13.4 + random.uniform(-0.4, 0.6)), float(z) - 2.2, alto=random.uniform(8.0, 10.5))
# El claro de la base alien: un ruedo de losa con su bordillo.
torno('P', ARENISCA, en(BASE[0], BASE[1]), [(5.15, -0.1), (5.15, 0.42), (4.7, 0.42), (4.7, 0.04)], lados=28, u_rep=12, v_m=1.2, tapas=(False, False))
cara('P', LOSA, [P(BASE[0] + 4.7 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.7 * math.sin(2 * math.pi * i / 28), 0.04) for i in range(28)], hacia=ARRIBA, baldosa=3.0)

# ==================================================================================
# 3. EL PILONO: LAS DOS TORRES, LA PUERTA, LOS COLOSOS Y EL OBELISCO
# ==================================================================================
Z_ATRAS = Z_P - FONDO_P
H_C = ALTO_P - 1.0                                                                   # hasta donde arranca la gola
def torre (s):
    """Una torre del pilono: en talud por las cuatro caras, con su relieve delante."""
    b = [(s * X_TORRE0, Z_P), (s * X_TORRE1, Z_P), (s * X_TORRE1, Z_ATRAS), (s * X_TORRE0, Z_ATRAS)]            # la base
    t = [(s * (X_TORRE0 + 0.25), Z_P - 0.9), (s * (X_TORRE1 - 0.9), Z_P - 0.9), (s * (X_TORRE1 - 0.9), Z_ATRAS + 0.9), (s * (X_TORRE0 + 0.25), Z_ATRAS + 0.9)]
    centro = P(s * (X_TORRE0 + X_TORRE1) / 2, (Z_P + Z_ATRAS) / 2, H_C / 2)
    for i in range(4):
        j = (i + 1) % 4
        q = [P(b[i][0], b[i][1], 0.0), P(b[j][0], b[j][1], 0.0), P(t[j][0], t[j][1], H_C), P(t[i][0], t[i][1], H_C)]
        if i == 0:
            cara('P', RELIEVE, q, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0.15)))
        else:
            cara('P', ARENISCA, q, hacia=(q[0] + q[2]) / 2 - centro, baldosa=3.0)
    # La gola: se abre hacia fuera sobre la moldura.
    g = [(s * (X_TORRE0 - 0.25), Z_P - 0.35), (s * (X_TORRE1 - 0.35), Z_P - 0.35), (s * (X_TORRE1 - 0.35), Z_ATRAS + 0.35), (s * (X_TORRE0 - 0.25), Z_ATRAS + 0.35)]
    for i in range(4):
        j = (i + 1) % 4
        q = [P(t[i][0], t[i][1], H_C), P(t[j][0], t[j][1], H_C), P(g[j][0], g[j][1], ALTO_P), P(g[i][0], g[i][1], ALTO_P)]
        largo = math.hypot(t[j][0] - t[i][0], t[j][1] - t[i][1])
        cara('P', GOLA, q, uvs=[(0, 0), (largo / 0.9, 0), (largo / 0.9, 1), (0, 1)], hacia=(q[0] + q[2]) / 2 - centro)
    cara('P', ARENISCA_O, [P(x, z, ALTO_P) for x, z in g], hacia=ARRIBA, baldosa=3.0)
    for i in range(4):                                                               # el bocel de las aristas y el de debajo de la gola
        j = (i + 1) % 4
        barra('EV', PIEDRA_LISA, P(b[i][0], b[i][1], 0.0), P(t[i][0], t[i][1], H_C), 0.26)
        barra('EV', PIEDRA_LISA, P(t[i][0], t[i][1], H_C), P(t[j][0], t[j][1], H_C), 0.26)
    for x in (s * 8.6, s * 13.3):                                                    # los mástiles, entre las figuras del relieve, con el gallardete arriba
        pie, tope = P(x, Z_P + 0.28, 0.5), P(x, Z_P - 0.86, 15.2)
        barra('EV', MASTIL, pie, tope, 0.24)
        cara('EV', random.choice(GALLARDETES), [tope + V((0, 0, -0.2)), tope + V((2.3, -0.2, -0.55)), tope + V((0, 0, -0.95))], hacia=V((0, -1, 0)))
for s in (-1, 1):
    torre(s)
print('PILONO', ALTO_P, 'm')
# La puerta: jambas escritas, el dintel con su disco alado y su propia gola, más baja que las torres.
for s in (-1, 1):
    x0, x1 = (VANO, X_TORRE0 + 0.4) if s > 0 else (-X_TORRE0 - 0.4, -VANO)
    viga('P', JAMBA, x0, x1, Z_ATRAS + 0.4, Z_P + 0.22, 0.0, ALTO_VANO, u_m=1.2, v_rep=ALTO_VANO / 4.8, tapas=False)
viga('P', ARENISCA, -X_TORRE0 - 0.4, X_TORRE0 + 0.4, Z_ATRAS + 0.4, Z_P + 0.22, ALTO_VANO, ALTO_VANO + 1.35, u_m=3.0)
cara('P', DISCO, [P(-3.9, Z_P + 0.25, ALTO_VANO + 0.12), P(3.9, Z_P + 0.25, ALTO_VANO + 0.12), P(3.9, Z_P + 0.25, ALTO_VANO + 1.3), P(-3.9, Z_P + 0.25, ALTO_VANO + 1.3)],
     uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
Y_D = ALTO_VANO + 1.35
gd = [(-X_TORRE0 - 0.4, Z_P + 0.22), (X_TORRE0 + 0.4, Z_P + 0.22), (X_TORRE0 + 0.4, Z_ATRAS + 0.4), (-X_TORRE0 - 0.4, Z_ATRAS + 0.4)]
ga = [(-X_TORRE0 - 0.4, Z_P + 0.72), (X_TORRE0 + 0.4, Z_P + 0.72), (X_TORRE0 + 0.4, Z_ATRAS - 0.1), (-X_TORRE0 - 0.4, Z_ATRAS - 0.1)]
for i in (0, 2):
    j = i + 1
    cara('P', GOLA, [P(gd[i][0], gd[i][1], Y_D), P(gd[j][0], gd[j][1], Y_D), P(ga[j][0], ga[j][1], Y_D + 0.85), P(ga[i][0], ga[i][1], Y_D + 0.85)],
         uvs=[(0, 0), (9.8, 0), (9.8, 1), (0, 1)], hacia=V((0, -1 if i == 0 else 1, 0.4)))
cara('P', ARENISCA_O, [P(x, z, Y_D + 0.85) for x, z in ga], hacia=ARRIBA, baldosa=3.0)
rect('P', LOSA, -VANO, VANO, Z_ATRAS, Z_P, 0.03, 3.0)                                # el suelo del paso (un dedo sobre la arena del recinto)
# El paso, a oscuras, y lo que alumbra dentro.
cara('EP', NEGRO, [P(-VANO, Z_ATRAS + 0.9, 0.0), P(VANO, Z_ATRAS + 0.9, 0.0), P(VANO, Z_ATRAS + 0.9, ALTO_VANO), P(-VANO, Z_ATRAS + 0.9, ALTO_VANO)], hacia=V((0, -1, 0)))
for x, y, r in ((-1.1, 1.2, 0.32), (0.7, 2.6, 0.4), (1.3, 0.9, 0.22), (-0.4, 4.2, 0.26), (0.2, 0.7, 0.18), (-1.4, 5.6, 0.2), (1.0, 5.0, 0.16)):
    cara('EP', BRILLO_HONDO if r > 0.25 else VERDE, [P(x + r * math.cos(a_), Z_ATRAS + 0.93, y + r * 0.85 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 8, endpoint=False)], hacia=V((0, -1, 0)))

def coloso (x, z):
    """Un coloso sentado de granito, mirando a la avenida. De MESHY (10/10, 30
    créditos; Isidro: «haz todas estas con Meshy»): el de antes era de cajas (está
    en el historial). Con el frente de la peana donde estaba, que por delante
    pasan los alienz al abrirse."""
    o = importar(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'coloso.glb'), 'KV', 6.9, x, z)
    vs = np.array([v.co[:] for v in o.data.vertices])
    o.data.transform(M.Translation((0, -(z + 1.5) - float(vs[:, 1].min()), 0)))       # en Blender, hacia la cámara es -Y
    print('COLOSO: ancho', round(float(vs[:, 0].max() - vs[:, 0].min()), 2), 'fondo', round(float(vs[:, 1].max() - vs[:, 1].min()), 2))
for s in (-1, 1):
    coloso(s * 4.95, Z_P + 2.0)
# El obelisco de granito rosa, a la izquierda, con la punta dorada.
OX, OZ = -9.5, Z_P + 3.3
bloque('P', ARENISCA_O, en(OX, OZ), (2.2, 2.2, 0.7), mella=0.02)
torno('P', OBELISCO, en(OX, OZ, 0.7, math.pi / 4), [(1.02, 0.0), (0.7, 9.6)], lados=4, u_rep=4, v_m=9.6, tapas=(False, False))
torno('P', ORO, en(OX, OZ, 10.3, math.pi / 4), [(0.7, 0.0), (0.0, 1.15)], lados=4, tapas=(False, False))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-58.2)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: KARNAK, EL PALMERAL, EL NILO Y LA MONTAÑA TEBANA
# ==================================================================================
def columna_papiro (grupo, x, z, alto, r, abierta=False):
    """Una columna de papiro: el fuste hinchado abajo y el capitel, cerrado o abierto en campana."""
    cap = [(r * 0.9, alto * 0.8), (r * 1.7, alto * 0.97), (r * 1.7, alto)] if abierta else [(r * 0.95, alto * 0.8), (r * 1.1, alto * 0.88), (r * 0.8, alto)]
    torno(grupo, ARENISCA_O, en(x, z), [(r * 0.9, 0.0), (r * 1.08, alto * 0.12), (r * 0.9, alto * 0.78)] + cap, lados=8, u_rep=3, v_m=4.0, tapas=(False, True))

suelo('G', ARENA, -300.0, 300.0, -470.0, Z_P, 0.0, 8.0)                               # el recinto, por dentro
# El primer patio: las columnatas de los lados, la columna de Taharqa y el templete de Ramsés III.
for z in np.arange(-74.0, -146.0, -5.2):
    for s in (-1, 1):
        columna_papiro('T', s * 44.0, float(z), 7.4, 1.0)
for s in (-1, 1):
    viga('T', ARENISCA, min(s * 43.0, s * 45.0), max(s * 43.0, s * 45.0), -148.0, -72.0, 7.4, 8.5, u_m=3.0)
    caja('T', ARENISCA, min(s * 46.0, s * 52.0), max(s * 46.0, s * 52.0), -150.0, Z_ATRAS, 0.0, 9.4, baldosa=3.0)
columna_papiro('T', -7.0, -108.0, 19.0, 1.5, abierta=True)
caja('T', ARENISCA, 30.0, 52.0, -128.0, -96.0, 0.0, 8.0, techo=ARENISCA_O, baldosa=3.0)
# El segundo pilono, medio caído, y detrás la sala hipóstila: el bosque de columnas.
for s in (-1, 1):
    caja('T', ARENISCA, min(s * 5.0, s * 50.0), max(s * 5.0, s * 50.0), -160.0, -150.0, 0.0, random.uniform(9.0, 13.0), techo=ARENISCA_O, baldosa=3.0)
for z in np.arange(-166.0, -214.0, -8.0):
    for s in (-1, 1):
        columna_papiro('T', s * 4.6, float(z), 21.0, 1.7, abierta=True)               # la nave central, de capiteles abiertos
        for x in np.arange(11.0, 50.0, 6.4):
            columna_papiro('T', s * float(x), float(z) + 1.5, 13.0, 1.25)
for s in (-1, 1):
    viga('T', ARENISCA, min(s * 3.6, s * 5.6), max(s * 3.6, s * 5.6), -214.0, -164.0, 21.0, 22.6, u_m=3.0)
    caja('T', ARENISCA, min(s * 9.0, s * 52.0), max(s * 9.0, s * 52.0), -214.0, -164.0, 13.0, 14.0, techo=ARENISCA_O, baldosa=3.0)
# Los pilonos de dentro, los dos obeliscos y el santuario.
for z, alto in ((-226.0, 8.0), (-246.0, 6.5), (-268.0, 5.0)):
    for s in (-1, 1):
        caja('T', ARENISCA, min(s * 4.0, s * 40.0), max(s * 4.0, s * 40.0), z - 6.0, z, 0.0, alto * random.uniform(0.7, 1.2), techo=ARENISCA_O, baldosa=3.0)
for ox, oz, alto in ((7.0, -236.0, 17.0), (-8.5, -256.0, 23.0)):
    torno('T', OBELISCO, en(ox, oz, 0.0, math.pi / 4), [(1.5, 0.0), (1.0, alto - 1.8)], lados=4, u_rep=4, v_m=alto, tapas=(False, False))
    torno('T', ORO, en(ox, oz, alto - 1.8, math.pi / 4), [(1.0, 0.0), (0.0, 1.8)], lados=4, tapas=(False, False))
caja('T', ARENISCA, -36.0, 36.0, -340.0, -276.0, 0.0, 7.0, techo=ARENISCA_O, baldosa=3.0)
for z in np.arange(-336.0, -280.0, 7.0):
    for x in np.arange(-30.0, 31.0, 7.5):
        if random.random() < 0.5:
            columna_papiro('T', float(x), float(z), 9.5, 0.8)
# El lago sagrado, al sur, y la muralla de adobe que lo rodea todo.
rect('CP', LAGO, 70.0, 190.0, -330.0, -248.0, 0.25, 30.0)
franja('T', ARENISCA_O, [(66.0, -334.0), (194.0, -334.0), (194.0, -244.0), (66.0, -244.0)], 0.3, [(70.0, -330.0), (190.0, -330.0), (190.0, -248.0), (70.0, -248.0)], 0.3, ARRIBA, u_baldosa=3.0)
MURO = [(-290.0, Z_ATRAS + 1.0), (-X_TORRE1 - 0.2, Z_ATRAS + 1.0), (X_TORRE1 + 0.2, Z_ATRAS + 1.0), (290.0, Z_ATRAS + 1.0), (290.0, -460.0), (-290.0, -460.0)]
# A TRAMOS, y sin que un lienzo se meta en el de la esquina: con la luz en los
# vértices, un muro de 580 m de una pieza cuyas esquinas quedan DENTRO del muro
# de al lado se hornea entero a oscuras (salía una raya negra detrás del templo).
for i in (0, 2, 3, 4, 5):
    (ax, az), (bx, bz) = MURO[i], MURO[(i + 1) % 6]
    n = max(1, int(round(math.hypot(bx - ax, bz - az) / 45.0)))
    for k in range(n):
        x0, z0, x1, z1 = ax + (bx - ax) * k / n, az + (bz - az) * k / n, ax + (bx - ax) * (k + 1) / n, az + (bz - az) * (k + 1) / n
        if abs(bx - ax) > abs(bz - az):
            x0, x1 = max(-286.6, min(x0, x1)), min(286.6, max(x0, x1))
            caja('T', ADOBE, x0, x1, az - 6.0, az, 0.0, 9.0, baldosa=4.0)
        else:
            caja('T', ADOBE, ax - 3.0 if ax > 0 else ax, ax if ax > 0 else ax + 3.0, min(z0, z1), max(z0, z1), 0.0, 9.0, baldosa=4.0)

# El palmeral, las casas de Karnak y los campos hasta el río.
suelo('G', ARENA, -1500.0, -300.0, -1500.0, 230.0, 0.0, 10.0)
suelo('G', ARENA, 300.0, 1500.0, -1500.0, 230.0, 0.0, 10.0)
suelo('G', ARENA, -300.0, 300.0, -1500.0, -470.0, 0.0, 10.0)
suelo('G', ARENA, -300.0, -76.0, Z_P, 230.0, 0.0, 10.0)
suelo('G', ARENA, 76.0, 300.0, Z_P, 230.0, 0.0, 10.0)
suelo('G', CAMPO, -1500.0, 1500.0, 230.0, RIO_Z, 0.0, 12.0)                             # la vega, verde hasta el agua
for _ in range(420):
    x, z = random.uniform(-520.0, 520.0), random.uniform(-30.0, RIO_Z - 10.0)
    if abs(x) < 17.0 or (abs(x) < 300.0 and z < Z_P + 8.0):
        continue
    palmera('T', TRONCO, PALMA, x, z, alto=random.uniform(8.0, 12.0))
n_ed = 0
for _ in range(520):
    x, z = random.uniform(-1400.0, 1400.0), random.uniform(-900.0, 200.0)
    if abs(x) < 330.0 and z > -520.0:
        continue
    w, d = random.uniform(6, 11), random.uniform(6, 11)
    caja('T', random.choice(FACHADAS + [ADOBE]), x - w, x + w, z - d, z + d, 0.0, random.choice([4.0, 7.0, 7.0, 10.0]), techo=AZOTEA)
    n_ed += 1
print('EDIFICIOS', n_ed)
# El Nilo, con sus falucas, la otra orilla y la montaña tebana con su cima en pirámide.
rect('CP', RIO, -3200.0, 3200.0, RIO_Z, RIO_Z + 520.0, -0.6, 200.0)
for _ in range(14):
    x, z = random.uniform(-900.0, 900.0), random.uniform(RIO_Z + 40.0, RIO_Z + 480.0)
    g = random.uniform(-0.3, 0.3)
    caja('T', BLANCO, x - 7.0, x + 7.0, z - 1.6, z + 1.6, -0.6, 0.8, baldosa=4)
    barra('T', MADERA, P(x + 2.0, z, 0.8), P(x + 2.0, z, 7.0), 0.3)
    cara('T', VELA, [P(x + 6.0, z, 1.6), P(x - 5.0, z + g, 13.0), P(x - 4.6, z, 1.5)], hacia=V((0, -1, 0)))
suelo('G', CAMPO, -1500.0, 1500.0, RIO_Z + 520.0, 1500.0, 0.0, 12.0)
for x0, x1, z0, z1, mat in ((-3200.0, 3200.0, 1500.0, 2300.0, DESIERTO), (-3200.0, -1500.0, -3200.0, 1500.0, DESIERTO), (1500.0, 3200.0, -3200.0, 1500.0, DESIERTO), (-1500.0, 1500.0, -3200.0, -1500.0, DESIERTO)):
    rect('CP', mat, x0, x1, z0, z1, -0.3, 200.0)
sierra('T', MONTE_L, -2400.0, 2500.0, 2300.0, 2700.0, 520.0, 330.0, y0=0.5)
monte('T', MONTE_L, -260.0, 2450.0, 420.0, 470.0, y0=0.5, seg=14, anillos=5, pico=1.5)        # el-Qurn, la pirámide natural
sierra('T', MONTE_L, -2600.0, -2300.0, 2500.0, -2700.0, 600.0, 200.0, y0=0.5)                 # y el desierto de Arabia, al este

cupula('CP', CIELO, 3300.0, 0.0, -60.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'KV': ('vert-colosos', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-luxor', ['P', 'E', 'GN', 'EV', 'KV', 'EP']), ('lugar-luxor-ciudad', ['C', 'G', 'T', 'CP'])],
    # Mediodía: el sol casi a plomo, blanco y fuerte; sombras cortas y duras.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.72), sol_fuerza=7.0, sol_ancho=1.5, cielo_fuerza=0.09, cielo_altura=62, cielo_giro=150,
    escala=0.56, satura=0.85, no_alumbran=('CP',), suaves=('monte-lejos',), fundir=True)
