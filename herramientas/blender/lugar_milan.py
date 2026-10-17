# Milán: la Piazza del Duomo, rehecha con texturas y luz horneada (17/10/2026).
#
#   blender -b -P herramientas/blender/lugar_milan.py              (entero)
#   blender -b -P herramientas/blender/lugar_milan.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_milan.py -- --reusar  (retocar la luz)
#
# Isidro, 17/10: «el mapa de Milán, ahora que tienes texturas, úsalas para
# mejorarlo pero SIN CAMBIAR LA DISTRIBUCIÓN del mapa, solo añade detalles, y hazlo
# un poco más apocalíptico». Era el primer mapa hecho en Blender (27/09, sobre
# comun.py): colores lisos y sin luz. Ahora va sobre horneado.py, como los demás.
#
# LA DISTRIBUCIÓN ES LA DE SIEMPRE (la eligió él, con dos fotos y un dibujo en
# Paint), y sus números no se tocan:
#   · el ARCO de la Galleria al fondo, en el eje, con la cara en z = -40, 16 m de
#     hueco que arranca a 10,5; los alienz salen por él andando desde el fondo de
#     la galería (nacen entre -120 y -130, dentro de la niebla);
#   · el DUOMO a la derecha, a lo largo del campo, con la fachada en x = 18
#     mirando a los carriles y el centro en z = -12;
#   · los PÓRTICOS en la línea de la Galleria, a su izquierda (cara en z = -40, de
#     x = -17 a -81);
#   · la LASTRA gris con la retícula y los rombos blancos;
#   · la torre alien en (-10,5, -35,5), y las farolas donde estaban.
#
# LO APOCALÍPTICO, sin tapar nada de eso: el suelo agrietado, con quemaduras,
# cráteres y el rastro verde de lo que sale de la galería; la bóveda de cristal
# reventada; escaparates rotos y alguno ardiendo; agujas del Duomo partidas y sus
# trozos en el sagrato; el tranvía naranja de Milán descarrilado y quemado; coches
# calcinados, la barricada de sacos y hormigón junto a la línea, escombros, una
# farola caída, y la resina alien trepando por el arco. El humo lo pone el juego
# (`humos` en escenarios.js). Al ATARDECER, con un sol naranja bajo el humo.
#
# Coordenadas del JUEGO; `P(x, z, y)` de horneado.py las pasa a Blender.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.8, 0.3, 0.52)                  # del oeste y algo a la espalda, bajo: dora la fachada del Duomo
iniciar('milan', 2709, eje=(0.0, -20.0), encendidas=0.1, reflejo=(0.16, 0.1, 0.06))

# --- los números que no se tocan ---------------------------------------------------
GAL_Z0, GAL_Z1 = -40.0, -48.0            # cara delantera y trasera del cuerpo del arco
GAL_X = 14.0                             # medio ancho de la fachada
ARCO_R, ARCO_Y = 8.0, 10.5               # hueco de 16 de ancho, arranca a 10,5 y remata a 18,5
GAL_ALTO = 30.0
GAL_FIN = -160.0                         # el fondo de la galería, dentro de la niebla
DX, DZ = 18.0, -12.0                     # la fachada del Duomo
BASE = (-10.5, -35.5)                    # la torre alien
Z_NACEN = -132.0

def D (u, y, w):
    """El marco del Duomo: u a lo ancho de la fachada, w hacia fuera de ella."""
    return P(DX - w, DZ + u, y)

def R (u, y, w):
    """El marco de los pórticos: u a lo largo (de 24 a -40), w hacia dentro (-17 es la fachada)."""
    return P(-57.0 - u, -23.0 + w, y)

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PX0, PX1, PZ0, PZ1 = -17.0, 16.0, -39.8, 24.0
PW, PH_ = 1024, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((PZ1 - z) * KZ))

def tex_pista ():
    """La lastra de la plaza: losas grises de granito con su junta, la retícula y los
    rombos de piedra blanca, y encima la guerra: grietas, quemaduras, dos cráteres
    aplastados, cascotes, papeles y el rastro verde que sale de la galería."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    a = tejar(foto('stone_pavers', 256, 0x8a8580, 0.55))
    b = tejar(foto('concrete_floor_worn_001', 256, 0x7e7a76, 0.6))
    mezcla = nube(PH_, PW, 16, 8)[..., None]
    a = a * mezcla + b * (1 - mezcla)
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    xs = PX0 + xx / KX
    zs = PZ1 - yy / KZ
    # Las losas: de 1,6 × 0,8 a matajunta, cada una de su tono.
    fila = np.floor(zs / 0.8)
    col = np.floor(xs / 1.6 + 0.5 * (fila % 2))
    tono = ((np.sin(fila * 12.9898 + col * 78.233) * 43758.5453) % 1.0)
    a *= (0.88 + 0.16 * tono)[..., None]
    junta = (np.abs(((zs / 0.8) % 1.0) - 0.5) > 0.47) | (np.abs(((xs / 1.6 + 0.5 * (fila % 2)) % 1.0) - 0.5) > 0.485)
    a[junta] *= 0.62
    # Las líneas de piedra blanca: la retícula y un rombo en cada tramo del centro.
    G = 0.18
    def linea (x0, z0, x1, z1):
        dx, dz = x1 - x0, z1 - z0
        L = math.hypot(dx, dz)
        t = np.clip(((xs - x0) * dx + (zs - z0) * dz) / (L * L), 0, 1)
        d = np.hypot(xs - (x0 + t * dx), zs - (z0 + t * dz))
        m = np.clip((G - d) / 0.04, 0, 1)[..., None]
        blanco = np.array((0.86, 0.83, 0.77), np.float32) * (0.9 + 0.1 * tono[..., None])
        a[:] = a * (1 - m) + blanco * m
    for x in (-15.5, -8.6, 8.6, 15.5):
        linea(x, 22, x, GAL_Z0 + 0.4)
    for z in (GAL_Z0 + 0.4, -28, -16, -4, 8, 20):
        linea(-16.8, z, 15.5, z)
    for z0, z1 in ((GAL_Z0 + 0.4, -28), (-16, -4), (8, 20)):
        zm = (z0 + z1) / 2
        linea(0, z0, 8.6, zm); linea(8.6, zm, 0, z1); linea(0, z1, -8.6, zm); linea(-8.6, zm, 0, z0)
    for z0, z1 in ((-28, -16), (-4, 8)):
        linea(-8.6, z0, 8.6, z1); linea(8.6, z0, -8.6, z1)
    # La mugre de una plaza que nadie barre: polvo y hollín a manchas.
    a *= (0.8 + 0.22 * nube(PH_, PW, 30, 14))[..., None]
    def mancha (x, z, r_, k, color=None, forma=1.0):
        c, f_ = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(PH_, f_ + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f_) / (r_ * KZ))
        borde = d + 0.25 * (nube(y1 - y0, x1 - x0, 5, 5) - 0.5)
        w = np.clip(1 - borde, 0, 1) ** 1.3
        if color is None:
            a[y0:y1, x0:x1] *= (1 - (1 - k) * w)[..., None]
        else:
            a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - k * w[..., None]) + np.array(color, np.float32) * k * w[..., None]
    # Quemaduras: de los fuegos y de las bombas.
    for x, z, r_ in ((-4.2, 6.0, 2.6), (5.6, -21.0, 3.0), (-12.0, -8.0, 4.2), (11.5, 12.0, 2.4), (-2.0, -33.0, 2.2), (13.0, -30.0, 3.0)):
        mancha(x, z, r_ * 1.6, 0.72)
        mancha(x, z, r_, 0.4)
    # Dos cráteres aplastados: el negro del centro, el anillo de losas levantadas y cascotes.
    for x, z, r_ in ((3.4, -6.0, 1.9), (-5.6, -25.0, 1.6)):
        mancha(x, z, r_ * 2.2, 0.75)
        mancha(x, z, r_, 0.12)
        for _ in range(int(220 * r_)):
            ang = random.uniform(0, 2 * math.pi); d = r_ * random.uniform(0.8, 2.6)
            c, f_ = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 2 < c < PW - 3 and 2 < f_ < PH_ - 3:
                g = random.uniform(0.25, 0.7)
                a[f_ - 1:f_ + 2, c - 1:c + 2] = (g, g * 0.97, g * 0.94)
    # Grietas: caminos quebrados que salen de los cráteres y cruzan las losas.
    for _ in range(34):
        x, z = random.uniform(PX0, PX1), random.uniform(PZ0, PZ1)
        ang = random.uniform(0, 2 * math.pi)
        for _ in range(random.randint(30, 110)):
            ang += random.uniform(-0.6, 0.6)
            x += math.cos(ang) * 0.04; z += math.sin(ang) * 0.04
            c, f_ = a_px(x, z)
            if 1 < c < PW - 2 and 1 < f_ < PH_ - 2:
                a[f_, c] *= 0.55
    # El rastro de lo que sale de la galería: regueros de icor verde, del arco hacia la línea.
    for k in range(14):
        x, z = -6.5 + k * 1.0 + random.uniform(-0.3, 0.3), GAL_Z0 + 0.2
        ancho = random.uniform(0.05, 0.16)
        for i in range(int(random.uniform(8.0, 30.0) / 0.04)):
            x += random.uniform(-0.03, 0.03); z += 0.04
            c, f_ = a_px(x, z)
            w = max(1, int(ancho * KX))
            if w < c < PW - w - 1 and 0 <= f_ < PH_:
                a[f_, c - w:c + w] = a[f_, c - w:c + w] * 0.45 + np.array((0.05, 0.2, 0.09), np.float32) * 0.55
            ancho *= 0.998
    for x, z, r_ in ((0.6, -36.5, 2.4), (-3.4, -37.0, 1.6), (4.2, -35.0, 1.4)):
        mancha(x, z, r_, 0.7, (0.04, 0.16, 0.07))
    # Papeles y cartones sueltos, y vidrio pisado.
    for _ in range(420):
        c, f_ = random.randrange(4, PW - 8), random.randrange(4, PH_ - 8)
        if random.random() < 0.6:
            g = random.uniform(0.6, 0.85)
            a[f_:f_ + random.randint(3, 6), c:c + random.randint(3, 7)] = (g, g * 0.97, g * 0.9)
        else:
            a[f_, c] = (0.85, 0.9, 0.92)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_mosaico ():
    """El suelo de la galería: el mosaico de mármoles, roto, con la resina encima."""
    W = 512
    a = foto('rock_tile_floor', W, 0xb39a78, 0.7)
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    rombo = (np.abs(((xx / 64) % 1) - 0.5) + np.abs(((yy / 64) % 1) - 0.5)) < 0.3
    a[rombo] = a[rombo] * 0.7 + np.array((0.55, 0.22, 0.16), np.float32) * 0.3
    a *= (0.55 + 0.4 * nube(W, W, 6, 6))[..., None]
    veta = np.clip((nube(W, W, 9, 3) - 0.55) / 0.08, 0, 1)[..., None]
    a = a * (1 - veta) + np.array((0.04, 0.12, 0.06), np.float32) * veta
    return guardar('mosaico', np.clip(a, 0, 1), 86)

def tex_tranvia ():
    """El costado del Ventotto, el tranvía de Milán: el naranja de siempre,
    quemado de abajo arriba, con las ventanas reventadas y el número."""
    W, Hh = 512, 128
    a = lienzo(Hh, W, (0.86, 0.55, 0.16))
    a[:24] = (0.86, 0.8, 0.66)                                            # el techo claro
    a[96:] = (0.2, 0.18, 0.16)                                            # el zócalo
    for k in range(9):
        x0 = 20 + k * 54
        a[30:72, x0:x0 + 40] = (0.03, 0.03, 0.035)                        # las ventanas, ya sin cristal
        a[30:72, x0 + 19:x0 + 21] = (0.3, 0.2, 0.1)
    quemado = np.clip((nube(Hh, W, 3, 8) - 0.35) / 0.3, 0, 1) * np.linspace(0.4, 1.0, Hh)[:, None]
    a = a * (1 - quemado[..., None] * 0.85) + np.array((0.03, 0.025, 0.02)) * quemado[..., None] * 0.85
    return guardar('tranvia', np.clip(a, 0, 1), 88)

LASTRA = material('pista', tex_pista(), rug=0.75)
LOSAS = material('losas', de_polyhaven('stone_pavers', 512, 0x857f78, 0.55), rug=0.8)
MOSAICO = material('mosaico', tex_mosaico(), rug=0.5)
GALLERIA = material('galleria', de_polyhaven('plastered_stone_wall', 512, 0xc8b28a, 0.7), rug=0.9)
GAL_CLARO = material('galleria-claro', de_polyhaven('marble_01', 512, 0xd8c8a6, 0.5), rug=0.8)
MARMOL = material('marmol', de_polyhaven('marble_01', 512, 0xe8e0d6, 0.55), rug=0.7)
MARMOL_S = material('marmol-sombra', de_polyhaven('marble_01', 512, 0xc9beb2, 0.6), rug=0.8)
PORTICI = material('portici', de_polyhaven('painted_plaster_wall', 512, 0xc6ae86, 0.7), rug=0.9)
PORTICI_S = material('portici-sombra', de_polyhaven('painted_plaster_wall', 512, 0x9c8664, 0.7), rug=0.9)
TEJADO = material('tejado', de_polyhaven('ceramic_roof_01', 512, 0x5c544e, 0.6), rug=0.9)
TRANVIA = material('tranvia', tex_tranvia(), rug=0.8)
HORMIGON = material('hormigon', de_polyhaven('cracked_concrete_wall', 512, 0x8a8782, 0.6), rug=0.9)
SACOS = material('sacos', de_polyhaven('plywood', 256, 0x6e624c, 0.4), rug=1.0)
ESCOMBRO = material('escombro', de_polyhaven('gravel_stones', 512, 0x7c766e, 0.7), rug=1.0)
OXIDO = material('oxido', de_polyhaven('rusty_metal_02', 256, 0x3a2c24, 0.6), rug=0.8)
AZOTEA = material('azotea', tex_azotea((0.4, 0.38, 0.36)))
# OJO: los colores lisos van en LINEAL.
HIERRO = material('hierro', color=(0.02, 0.022, 0.02), rug=0.6)
BRONCE = material('bronce', color=(0.04, 0.032, 0.022), rug=0.5)
VIDRIERA = material('vidriera', color=(0.02, 0.025, 0.035), rug=0.3)
NEGRO = material('negro', color=(0.006, 0.006, 0.007))
QUEMADO = material('quemado', color=(0.018, 0.016, 0.015), rug=0.95)
CHAPAS = [material(f'chapa-quemada-{i}', color=c, rug=0.9) for i, c in enumerate([(0.03, 0.025, 0.02), (0.06, 0.035, 0.02), (0.05, 0.05, 0.05)])]
CHAPA_OLIVA = material('chapa-oliva', color=(0.06, 0.07, 0.035), rug=0.8)
PIEDRA_BL = material('piedra-blanca', color=(0.6, 0.56, 0.5), rug=0.8)
RESINA = material('resina', color=(0.015, 0.035, 0.02), rug=0.4)
VIDRIO = material('vidrio-boveda', color=(0.2, 0.24, 0.24), rug=0.2)
PAPEL = material('papel', color=(0.5, 0.48, 0.42), rug=1.0)
ESCAPARATE = material('brillo-escaparate', color=(1.0, 0.72, 0.36), emite=1.6)
VENTANA = material('brillo-ventana', color=(0.95, 0.7, 0.4), emite=0.9)
FAROL = material('brillo-farol', color=(1.0, 0.84, 0.56), emite=2.6)
ORO = material('brillo-oro', color=(0.85, 0.6, 0.18), emite=0.8)
BRASA = material('brillo-brasa', color=(1.0, 0.36, 0.08), emite=2.6)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
VERDE_HONDO = material('brillo-hondo', color=(0.02, 0.16, 0.06), emite=1.0)
FACHADAS = [material(f'f-milan-{i}', tex_crema(f'milan-{i}', c, balcon=0.5)) for i, c in enumerate([(0.78, 0.68, 0.52), (0.72, 0.6, 0.46), (0.8, 0.74, 0.62), (0.66, 0.5, 0.4)])] + \
    [material('f-milan-o', tex_postigos('milan-o', (0.74, 0.56, 0.4), (0.24, 0.3, 0.2)))]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.9, 0.56, 0.32)), (0.06, (0.78, 0.48, 0.32)), (0.22, (0.5, 0.36, 0.34)), (0.5, (0.3, 0.27, 0.32)), (1.0, (0.18, 0.2, 0.28))],
    (SOL[0], SOL[2]), 0.14, (1.0, 0.56, 0.24), ((0.5, 0.42, 0.38), (0.22, 0.2, 0.22)), cuanta_nube=0.55), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL SUELO
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-120, 120), (-170, 130))
rect('P', LASTRA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
# Alrededor, la misma lastra sin dibujo (primero la base, después lo de encima).
suelo('GN', LOSAS, -170.0, PX0, -40.0, 130.0, 0.0, 6.4)
suelo('GN', LOSAS, PX1, 320.0, -40.0, 130.0, 0.0, 6.4)
suelo('GN', LOSAS, PX0, PX1, PZ1, 130.0, 0.0, 6.4)
suelo('GN', LOSAS, -170.0, -GAL_X - 3.0, -250.0, -40.0, 0.0, 6.4)
suelo('GN', LOSAS, GAL_X, 320.0, -250.0, -40.0, 0.0, 6.4)
# Dentro de la galería, el mosaico.
rect('P', MOSAICO, -7.9, 7.9, GAL_FIN, GAL_Z0, 0.0, baldosa=4.0)

# ==================================================================================
# 3. LA GALLERIA: la fachada del arco y la galería de dentro
# ==================================================================================
def muro_arco (grupo, mat, intrados, u0, u1, alto, w0, w1, uc, r, ya, n=18):
    """El muro de la fachada con el hueco del arco de medio punto (marco del juego:
    u = x, w = z). Las enjutas van en tiras, una por gajo del arco."""
    def p (u, y, w):
        return P(u, w, y)
    for w, hacia in ((w0, V((0, -1, 0))), (w1, V((0, 1, 0)))):
        cara(grupo, mat, [p(u0, 0, w), p(uc - r, 0, w), p(uc - r, alto, w), p(u0, alto, w)], hacia=hacia, baldosa=4.0)
        cara(grupo, mat, [p(uc + r, 0, w), p(u1, 0, w), p(u1, alto, w), p(uc + r, alto, w)], hacia=hacia, baldosa=4.0)
        for i in range(n):
            t0, t1 = math.pi - math.pi * i / n, math.pi - math.pi * (i + 1) / n
            a0 = (uc + r * math.cos(t0), ya + r * math.sin(t0)); a1 = (uc + r * math.cos(t1), ya + r * math.sin(t1))
            cara(grupo, mat, [p(a0[0], a0[1], w), p(a1[0], a1[1], w), p(a1[0], alto, w), p(a0[0], alto, w)], hacia=hacia, baldosa=4.0)
    for s in (-1, 1):
        cara(grupo, intrados, [p(uc + s * r, 0, w0), p(uc + s * r, ya, w0), p(uc + s * r, ya, w1), p(uc + s * r, 0, w1)], hacia=V((-s, 0, 0)), baldosa=3.0)
    for i in range(n):
        t0, t1 = math.pi - math.pi * i / n, math.pi - math.pi * (i + 1) / n
        a0 = (uc + r * math.cos(t0), ya + r * math.sin(t0)); a1 = (uc + r * math.cos(t1), ya + r * math.sin(t1))
        cara(grupo, intrados, [p(a0[0], a0[1], w0), p(a1[0], a1[1], w0), p(a1[0], a1[1], w1), p(a0[0], a0[1], w1)], hacia=V((0, 0, -1)), baldosa=3.0)
    cara(grupo, mat, [p(u0, alto, w0), p(u1, alto, w0), p(u1, alto, w1), p(u0, alto, w1)], hacia=ARRIBA, baldosa=6.0)
    for u, s in ((u0, -1), (u1, 1)):
        cara(grupo, mat, [p(u, 0, w0), p(u, alto, w0), p(u, alto, w1), p(u, 0, w1)], hacia=V((s, 0, 0)), baldosa=4.0)

muro_arco('E', GALLERIA, GAL_CLARO, -GAL_X, GAL_X, GAL_ALTO, GAL_Z0, GAL_Z1, 0.0, ARCO_R, ARCO_Y)
# La archivolta: el aro de piedra clara que enmarca el arco, en relieve.
for i in range(18):
    t0, t1 = math.pi - math.pi * i / 18, math.pi - math.pi * (i + 1) / 18
    for r0, r1 in ((ARCO_R, ARCO_R + 0.9),):
        pts = [P(r0 * math.cos(t0), GAL_Z0 + 0.3, ARCO_Y + r0 * math.sin(t0)), P(r0 * math.cos(t1), GAL_Z0 + 0.3, ARCO_Y + r0 * math.sin(t1)),
               P(r1 * math.cos(t1), GAL_Z0 + 0.3, ARCO_Y + r1 * math.sin(t1)), P(r1 * math.cos(t0), GAL_Z0 + 0.3, ARCO_Y + r1 * math.sin(t0))]
        cara('E', GAL_CLARO, pts, hacia=V((0, -1, 0)), baldosa=2.0)
# Las columnas pareadas a cada lado del arco, con su plinto y su capitel.
for s in (-1, 1):
    for x in (9.8, 12.6):
        bloque('E', GAL_CLARO, en(s * x, GAL_Z0 + 0.9), (1.9, 1.9, 1.4), baldosa=1.6)
        torno('E', GAL_CLARO, en(s * x, GAL_Z0 + 0.9, 1.4), [(0.62, 0.0), (0.6, 9.0), (0.56, 18.8)], lados=16, u_rep=2, v_m=3.0)
        bloque('E', GAL_CLARO, en(s * x, GAL_Z0 + 0.9, 20.2), (1.7, 1.7, 1.0), baldosa=1.6)
viga('E', GAL_CLARO, -GAL_X - 0.6, GAL_X + 0.6, GAL_Z0 - 0.2, GAL_Z0 + 2.0, 21.2, 23.0, u_m=3.0)    # el entablamento
viga('E', GAL_CLARO, -GAL_X - 0.9, GAL_X + 0.9, GAL_Z0 - 0.3, GAL_Z0 + 1.5, 29.0, 30.2, u_m=3.0)    # la cornisa
# Piso de arriba: pilastras, ventanas (a oscuras, alguna ardiendo) y la cartela.
for s in (-1, 1):
    for x in (9.8, 12.6):
        caja('E', GAL_CLARO, s * x - 0.6, s * x + 0.6, GAL_Z0, GAL_Z0 + 0.6, 23.0, 29.0, baldosa=3.0)
    for x, ancho, mat in ((11.2, 1.6, BRASA if s < 0 else NEGRO), (4.6, 2.4, NEGRO)):
        cara('EP', mat, [P(s * x - ancho / 2, GAL_Z0 - 0.04, 24.4), P(s * x + ancho / 2, GAL_Z0 - 0.04, 24.4),
                         P(s * x + ancho / 2, GAL_Z0 - 0.04, 28.0), P(s * x - ancho / 2, GAL_Z0 - 0.04, 28.0)], hacia=V((0, -1, 0)))
caja('E', GAL_CLARO, -2.8, 2.8, GAL_Z0, GAL_Z0 + 0.3, 24.4, 27.2, baldosa=3.0)
# El ático: el lado izquierdo ENTERO, con su balaustrada y sus estatuas; el derecho,
# reventado por un impacto (le falta un trozo de balaustrada y una estatua). A la
# derecha y no a la izquierda: al pie de la izquierda está la torre alien.
caja('E', GALLERIA, -GAL_X, GAL_X, GAL_Z0 - 1.1, GAL_Z0 + 0.3, 30.2, 32.2, baldosa=4.0)
for k in range(-11, 12):
    x = k * 1.2
    if 5.0 < x < 11.0:
        continue
    torno('EV', PIEDRA_BL, en(x, GAL_Z0 + 0.3, 30.2), [(0.16, 0.0), (0.22, 0.4), (0.12, 0.8), (0.16, 1.2)], lados=6)
for s in (-1, 1):
    for x in (9.8, 12.6):
        if s > 0 and x == 9.8:
            continue                                                             # la que cayó
        torno('E', PIEDRA_BL, en(s * x, GAL_Z0 - 0.2, 32.2), [(0.5, 0.0), (0.45, 0.6), (0.3, 1.6), (0.36, 2.2), (0.18, 2.8), (0.0, 3.1)], lados=10)
# Los cascotes del ático, al pie de la fachada (fuera del paso: x > 8,6).
for _ in range(26):
    x, z = random.uniform(8.8, 13.6), random.uniform(GAL_Z0 + 0.4, GAL_Z0 + 5.0)
    t = random.uniform(0.3, 1.1)
    bloque('E', random.choice((GAL_CLARO, GALLERIA)), en(x, z, 0.0, random.uniform(0, 3.1), (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4))), (t, t * 0.8, t * 0.6), baldosa=1.4, mella=0.2)
torno('E', PIEDRA_BL, en(11.4, GAL_Z0 + 3.2, 0.5, 0.6, (1.57, 0.0)), [(0.5, 0.0), (0.45, 0.6), (0.3, 1.6), (0.36, 2.2), (0.18, 2.8)], lados=10)
# El ala izquierda hasta la esquina de los pórticos.
caja('E', GALLERIA, -GAL_X - 3.0, -GAL_X, GAL_Z1, GAL_Z0, 0.0, GAL_ALTO - 2.0, baldosa=4.0)

# La resina alien: sale del arco y trepa por los machones, con bubones que laten.
for s in (-1, 1):
    for k in range(9):
        y0 = random.uniform(0.0, 3.0); y1 = y0 + random.uniform(3.0, 9.0)
        x0 = s * random.uniform(8.05, 8.6)
        barra('EV', RESINA, P(x0, GAL_Z0 - random.uniform(0.0, 0.3), y0), P(s * random.uniform(8.1, 9.6), GAL_Z0 - 0.15, y1), random.uniform(0.12, 0.3))
    for k in range(6):
        x, y = s * random.uniform(8.6, 13.6), random.uniform(1.0, 11.0)
        elipsoide('EV', RESINA, en(x, GAL_Z0 - 0.2, y), (random.uniform(0.4, 0.9), random.uniform(0.3, 0.6), random.uniform(0.4, 0.8)), sub=1)
        elipsoide('EP', VERDE if k % 2 else VERDE_HONDO, en(x, GAL_Z0 - 0.62, y), (0.14, 0.1, 0.14), sub=1)
for k in range(12):                                                                    # regueros por el suelo, bajos (los bichos pasan por encima)
    x = -7.0 + k * 1.25
    barra('EV', RESINA, P(x, GAL_Z0 - 2.0, 0.04), P(x * 1.1 + random.uniform(-0.6, 0.6), GAL_Z0 + random.uniform(1.0, 6.0), 0.03), random.uniform(0.12, 0.22))

def galeria_dentro ():
    """Lo de detrás del arco, por donde vienen: dos muros de escaparates (casi
    todos rotos y a oscuras; alguno encendido, otro ardiendo), la bóveda de hierro
    con la mitad de sus cristales caídos, y al fondo el resplandor verde del nido."""
    Z0, Z1 = GAL_Z1, GAL_FIN
    caja('E', GALLERIA, -9.0, 9.0, Z1 - 1.2, Z1, 0.0, 20.0, baldosa=4.0)
    cara('EP', NEGRO, [P(-3.5, Z1 + 0.05, 0.0), P(3.5, Z1 + 0.05, 0.0), P(3.5, Z1 + 0.05, 8.4), P(-3.5, Z1 + 0.05, 8.4)], hacia=V((0, 1, 0)))
    for x, y, r in ((-1.6, 1.4, 0.7), (1.2, 3.0, 0.5), (0.2, 0.8, 0.4), (2.4, 1.8, 0.45), (-0.8, 4.2, 0.3)):
        cara('EP', VERDE if r < 0.45 else VERDE_HONDO, [P(x + r * math.cos(a_), Z1 + 0.1, y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, 1, 0)))
    for s in (-1, 1):
        caja('E', GALLERIA, s * 8.0, s * 9.2, Z1, Z0, 0.0, 20.0, baldosa=4.0)
        viga('E', GAL_CLARO, min(s * 7.8, s * 8.1), max(s * 7.8, s * 8.1), Z1, Z0, 19.2, 20.0, u_m=3.0)
        z = Z0 - 3.0
        while z > Z1 + 3.0:
            r = random.random()
            mat = ESCAPARATE if r < 0.18 else BRASA if r < 0.26 else VERDE_HONDO if (r < 0.34 and z < -95) else NEGRO
            cara('EP', mat, [P(s * 7.96, z - 2.1, 0.6), P(s * 7.96, z + 2.1, 0.6), P(s * 7.96, z + 2.1, 5.8), P(s * 7.96, z - 2.1, 5.8)], hacia=V((-s, 0, 0)))
            viga('E', GAL_CLARO, min(s * 7.7, s * 8.0), max(s * 7.7, s * 8.0), z - 2.6, z + 2.6, 5.9, 6.5, u_m=3.0)
            for y in (9.5, 14.2):
                for dz in (-1.2, 1.2):
                    cara('EP', VENTANA if random.random() < 0.12 else NEGRO,
                         [P(s * 7.96, z + dz - 0.6, y - 1.2), P(s * 7.96, z + dz + 0.6, y - 1.2), P(s * 7.96, z + dz + 0.6, y + 1.2), P(s * 7.96, z + dz - 0.6, y + 1.2)], hacia=V((-s, 0, 0)))
            z -= 6.0
    # La bóveda: costillas de hierro cada cuatro metros, y vidrio solo en algunos tramos.
    Rb, Yb, N = 8.0, 20.0, 12
    z = Z0 - 0.5
    while z > Z1:
        for k in range(N):
            a0, a1 = math.pi * k / N, math.pi * (k + 1) / N
            barra('EV', HIERRO, P(Rb * math.cos(a0), z, Yb + Rb * math.sin(a0)), P(Rb * math.cos(a1), z, Yb + Rb * math.sin(a1)), 0.22)
            if random.random() < 0.45:
                zz = z - 4.0
                cara('EV', VIDRIO, [P(Rb * math.cos(a0), z, Yb + Rb * math.sin(a0)), P(Rb * math.cos(a1), z, Yb + Rb * math.sin(a1)),
                                    P(Rb * math.cos(a1), zz, Yb + Rb * math.sin(a1)), P(Rb * math.cos(a0), zz, Yb + Rb * math.sin(a0))], hacia=V((0, 0, -1)))
        if random.random() < 0.5:                                                      # un farol colgando, o su cable roto
            barra('EV', HIERRO, P(0, z, 21.0), P(0, z, 14.0 + random.uniform(0, 3)), 0.05)
            if random.random() < 0.6:
                cubo('EP', FAROL, P(0, z, 13.5), (0.7, 0.7, 1.0))
        z -= 4.0
    # El cristal caído, en el suelo y pegado a las paredes (fuera del paso, ±7,4).
    for _ in range(40):
        s = random.choice((-1, 1))
        x, z = s * random.uniform(7.45, 7.9), random.uniform(Z1 + 2, Z0 - 2)
        cubo('EV', VIDRIO, P(x, z, 0.05), (random.uniform(0.2, 0.6), random.uniform(0.3, 0.9), 0.04), random.uniform(0, 3.1))
galeria_dentro()

# ==================================================================================
# 4. LOS PÓRTICOS: los palazzi en la línea de la Galleria, a su izquierda
# ==================================================================================
PX = -17.0
def portici ():
    for u1, u0, alto in ((24, 3, 24.0), (3, -18, 26.0), (-18, GAL_Z0, 23.5)):
        largo = u1 - u0
        n = max(1, int(largo // 4.2))
        paso = largo / n
        # La fachada de la planta baja: machones entre arcos de 2,9.
        for k in range(n + 1):
            uc = u0 + paso * k
            a, b = max(u0, uc - (paso / 2 - 1.45)), min(u1, uc + (paso / 2 - 1.45))
            if b - a > 0.05:
                for (ua, ub), w in (((a, b), PX), ((b, a), PX - 0.9)):
                    cara('E', PORTICI, [R(ua, 0.0, w), R(ub, 0.0, w), R(ub, 6.6, w), R(ua, 6.6, w)], hacia=H._girado(R(0, 0, w + (0.5 if w == PX else -0.5)) - R(0, 0, w)), baldosa=4.0)
        for k in range(n):
            uc = u0 + paso * (k + 0.5)
            for i in range(10):
                t0, t1 = math.pi * i / 10, math.pi * (i + 1) / 10
                a0 = (uc + 1.45 * math.cos(t0), 3.9 + 1.45 * math.sin(t0)); a1 = (uc + 1.45 * math.cos(t1), 3.9 + 1.45 * math.sin(t1))
                cara('E', PORTICI, [R(a0[0], a0[1], PX), R(a1[0], a1[1], PX), R(a1[0], 6.6, PX), R(a0[0], 6.6, PX)], hacia=H._girado(R(0, 0, PX + 1) - R(0, 0, PX)), baldosa=4.0)
            # El fondo del pórtico, con sus escaparates: rotos, alguno encendido.
            mat = ESCAPARATE if random.random() < 0.2 else BRASA if random.random() < 0.12 else NEGRO
            cara('EP', mat, [R(uc - paso * 0.31, 0.8, PX - 3.95), R(uc + paso * 0.31, 0.8, PX - 3.95), R(uc + paso * 0.31, 4.5, PX - 3.95), R(uc - paso * 0.31, 4.5, PX - 3.95)],
                 hacia=H._girado(R(0, 0, PX) - R(0, 0, PX - 4)))
        cara('E', PORTICI_S, [R(u0, 0.0, PX - 4.2), R(u1, 0.0, PX - 4.2), R(u1, 6.6, PX - 4.2), R(u0, 6.6, PX - 4.2)], hacia=H._girado(R(0, 0, PX) - R(0, 0, PX - 4)), baldosa=4.0)
        # El cuerpo de arriba, con sus ventanas: oscuras, alguna encendida, alguna quemada.
        cara('E', PORTICI, [R(u0, 6.6, PX), R(u1, 6.6, PX), R(u1, alto, PX), R(u0, alto, PX)], hacia=H._girado(R(0, 0, PX + 1) - R(0, 0, PX)), baldosa=4.0)
        for piso in range(4):
            y = 8.6 + piso * 3.8
            if y + 2 > alto - 1.5:
                break
            for k in range(n):
                uc = u0 + paso * (k + 0.5)
                r = random.random()
                mat = VENTANA if r < 0.08 else BRASA if r < 0.11 else NEGRO
                cara('EP', mat, [R(uc - 0.62, y - 0.45, PX + 0.04), R(uc + 0.62, y - 0.45, PX + 0.04), R(uc + 0.62, y + 1.65, PX + 0.04), R(uc - 0.62, y + 1.65, PX + 0.04)],
                     hacia=H._girado(R(0, 0, PX + 1) - R(0, 0, PX)))
                if mat is BRASA:                                                       # el hollín que sube de la ventana que arde
                    cara('EP', QUEMADO, [R(uc - 0.9, y + 1.7, PX + 0.05), R(uc + 0.9, y + 1.7, PX + 0.05), R(uc + 0.5, y + 3.4, PX + 0.05), R(uc - 0.5, y + 3.4, PX + 0.05)],
                         hacia=H._girado(R(0, 0, PX + 1) - R(0, 0, PX)))
        # Los lados, la trasera y el tejado.
        cara('E', PORTICI_S, [R(u0, 0.0, PX - 9.4), R(u1, 0.0, PX - 9.4), R(u1, alto, PX - 9.4), R(u0, alto, PX - 9.4)], hacia=H._girado(R(0, 0, PX - 10) - R(0, 0, PX - 9)), baldosa=4.0)
        for u in (u0, u1):
            s = 1 if u == u1 else -1
            cara('E', PORTICI_S, [R(u, 0.0, PX), R(u, 0.0, PX - 9.4), R(u, alto, PX - 9.4), R(u, alto, PX)], hacia=H._girado(R(u + s, 0, PX - 4) - R(u, 0, PX - 4)), baldosa=4.0)
        cara('E', TEJADO, [R(u0, alto, PX), R(u1, alto, PX), R(u1, alto + 2.4, PX - 4.7), R(u0, alto + 2.4, PX - 4.7)], hacia=ARRIBA, baldosa=4.0)
        cara('E', TEJADO, [R(u0, alto, PX - 9.4), R(u1, alto, PX - 9.4), R(u1, alto + 2.4, PX - 4.7), R(u0, alto + 2.4, PX - 4.7)], hacia=ARRIBA, baldosa=4.0)
portici()

# ==================================================================================
# 5. EL DUOMO: el modelo de Meshy (17/10)
# ==================================================================================
# Isidro, viendo el de piezas: «¿la forma que hace el Duomo de Milán es correcta?
# Se ve algo cutre». Lo era: la silueta valía, pero con pocas agujas y gordas y la
# fachada lisa. Eligió hacerlo con Meshy (malla 20 créditos + textura 10):
# herramientas/blender/modelos/duomo.glb. Va en SU sitio de siempre: la fachada en
# x = 18 mirando a los carriles y centrado en z = -12, a lo largo del campo. Meshy
# lo da mirando a +z (glTF): un cuarto de vuelta lo pone mirando a -x.
DUOMO_ALTO = 40.0                        # hasta la Madonnina: 47 de ancho y 19 de fondo
DUOMO = importar(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'duomo.glb'), 'DV', DUOMO_ALTO, 0.0, 0.0, giro=-math.pi / 2)
# El ancho y el fondo de verdad que le han quedado, para ponerle la fachada en x = 18.
_vs = np.array([v.co[:] for v in DUOMO.data.vertices])
_lo, _hi = _vs.min(axis=0), _vs.max(axis=0)
DUOMO.data.transform(M.Translation((DX - _lo[0], -DZ - (_lo[1] + _hi[1]) / 2, 0.0)))
DUOMO.data.update()
print('DUOMO', round(_hi[0] - _lo[0], 1), 'de fondo,', round(_hi[1] - _lo[1], 1), 'de ancho,', round(_hi[2] - _lo[2], 1), 'de alto')
MARMOL_PL = material('marmol-liso', color=(0.62, 0.58, 0.54), rug=0.7)          # los trozos de agujas
# El sagrato: la plataforma de delante. El Duomo, ENTERO y limpio (Isidro: «el Duomo
# no quiero que esté destrozado»): la guerra se queda en la plaza.
caja('E', MARMOL_S, DX - 4.6, DX + 0.4, DZ - 25.0, DZ + 25.0, 0.0, 0.45, baldosa=4.0)


# ==================================================================================
# 6. LA PLAZA EN GUERRA: farolas, tranvía, coches, barricada, escombros, fuegos
# ==================================================================================
def farola (x, z, caida=False):
    """La farola de la plaza con su corona de cuatro faroles; la caída, tendida en el suelo."""
    if caida:
        a = P(x, z, 0.12); b = P(x - 7.0, z + 2.4, 0.18)
        barra('EV', HIERRO, a, b, 0.18)
        cubo('EV', HIERRO, P(x, z, 0.3), (1.0, 1.0, 0.6))
        for k in range(3):
            cubo('EV', VIDRIO, P(x - 7.2 + random.uniform(-0.5, 0.5), z + 2.4 + random.uniform(-0.6, 0.6), 0.05), (0.5, 0.5, 0.06), random.uniform(0, 3))
        return
    torno('EV', HIERRO, en(x, z), [(0.5, 0.0), (0.42, 1.3), (0.17, 1.4), (0.15, 8.1)], lados=8)
    for k in range(4):
        a_ = math.pi / 4 + k * math.pi / 2
        dx, dz = math.cos(a_) * 0.9, math.sin(a_) * 0.9
        barra('EV', HIERRO, P(x, z, 7.3), P(x + dx, z + dz, 7.3), 0.08)
        if k != 2:                                                                     # un farol reventado
            cubo('EP', FAROL, P(x + dx, z + dz, 6.9), (0.5, 0.5, 0.8))
    cubo('EP', FAROL, P(x, z, 8.5), (0.55, 0.55, 0.9))
farola(-10.2, 0.5, caida=True)                                                         # tendida hacia fuera del campo
farola(10.2, 0.5); farola(10.2, -30.0)

def tranvia (x, z, giro, vuelco):
    """El Ventotto descarrilado y quemado: la caja con su costado, el techo, los
    bogies sueltos y las brasas dentro."""
    m4 = en(x, z, 0.0, giro, (0.0, vuelco))
    L, A, Hh = 13.6, 2.4, 3.0
    esq = lambda u, v, h: m4 @ V((u, v, h))
    for v, s in ((-A / 2, -1), (A / 2, 1)):
        pts = [esq(-L / 2, v, 0.45), esq(L / 2, v, 0.45), esq(L / 2, v, 0.45 + Hh), esq(-L / 2, v, 0.45 + Hh)]
        cara('E', TRANVIA, pts, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=(m4.to_3x3() @ V((0, s, 0))))
    for u, s in ((-L / 2, -1), (L / 2, 1)):
        cara('E', CHAPAS[1], [esq(u, -A / 2, 0.45), esq(u, A / 2, 0.45), esq(u, A / 2, 0.45 + Hh), esq(u, -A / 2, 0.45 + Hh)], hacia=(m4.to_3x3() @ V((s, 0, 0))), baldosa=2.0)
    cara('E', QUEMADO, [esq(-L / 2, -A / 2, 0.45 + Hh), esq(L / 2, -A / 2, 0.45 + Hh), esq(L / 2, A / 2, 0.45 + Hh), esq(-L / 2, A / 2, 0.45 + Hh)], hacia=(m4.to_3x3() @ V((0, 0, 1))), baldosa=3.0)
    cara('E', QUEMADO, [esq(-L / 2, -A / 2, 0.45), esq(L / 2, -A / 2, 0.45), esq(L / 2, A / 2, 0.45), esq(-L / 2, A / 2, 0.45)], hacia=(m4.to_3x3() @ V((0, 0, -1))), baldosa=3.0)
    for u in (-L * 0.32, L * 0.32):
        cubo('EV', OXIDO, esq(u, 0, 0.24), (2.2, 1.7, 0.46), giro)
        for su in (-0.7, 0.7):
            for sv in (-0.8, 0.8):
                cubo('EV', NEGRO, esq(u + su, sv, 0.32), (0.64, 0.12, 0.64), giro)
    for k in range(4):
        cubo('EP', BRASA, esq(random.uniform(-L / 2.4, L / 2.4), random.uniform(-0.6, 0.6), 0.8), (0.6, 0.4, 0.3), giro)
    barra('EV', HIERRO, esq(-1.0, 0, 0.45 + Hh), esq(-2.6, 0.4, 0.45 + Hh + 2.2), 0.08)   # el pantógrafo, torcido
tranvia(-13.6, -9.0, math.radians(78), math.radians(5))

def coche_quemado (x, z, giro):
    """Un coche calcinado: la caja, la cabina sin lunas, las llantas en el suelo y los rescoldos."""
    m4 = en(x, z, 0.0, giro)
    cubo('EV', random.choice(CHAPAS), m4 @ V((0, 0, 0.55)), (1.8, 4.2, 0.7), giro)
    cubo('EV', NEGRO, m4 @ V((0, 0.2, 1.15)), (1.6, 2.1, 0.5), giro)
    for su, sv in ((-0.85, -1.3), (0.85, -1.3), (-0.85, 1.3), (0.85, 1.3)):
        cubo('EV', OXIDO, m4 @ V((su, sv, 0.3)), (0.22, 0.6, 0.6), giro)
    if random.random() < 0.6:
        cubo('EP', BRASA, m4 @ V((random.uniform(-0.5, 0.5), random.uniform(-1, 1), 0.95)), (0.5, 0.5, 0.2), giro)
coche_quemado(12.4, 18.0, 0.4); coche_quemado(-12.6, 16.0, 1.9); coche_quemado(12.8, -18.0, 2.8); coche_quemado(-14.6, -26.0, 1.2)

# La barricada junto a la línea: sacos terreros y bloques de hormigón, a los dos lados.
for s in (-1, 1):
    for k in range(9):
        x = s * (8.4 + (k % 3) * 1.1)
        z = 15.0 + (k // 3) * 0.55 * s
        bloque('E', SACOS, en(x + random.uniform(-0.1, 0.1), z, (k // 3) * 0.32, random.uniform(-0.2, 0.2)), (1.0, 0.5, 0.34), baldosa=0.8, mella=0.15)
    for k in range(3):
        bloque('E', HORMIGON, en(s * (12.6 + k * 2.1), 19.0 + random.uniform(-0.4, 0.4), 0.0, random.uniform(-0.3, 0.3)), (2.0, 0.6, 1.0), baldosa=2.0, mella=0.05)
# Un camión del ejército, abandonado junto al Duomo.
caja('E', CHAPA_OLIVA, 11.2, 13.6, 4.0, 10.6, 0.6, 3.2, baldosa=3.0)
caja('E', CHAPA_OLIVA, 11.2, 13.6, 2.2, 4.0, 0.6, 2.4, baldosa=3.0)
for zr in (3.0, 7.0, 9.4):
    for x in (11.0, 13.8):
        cubo('EV', NEGRO, P(x, zr, 0.5), (0.3, 1.0, 1.0))
# Escombros al pie de las fachadas y de las barricadas (siempre fuera del paso).
for x0, x1, z0, z1, n in ((9.0, 14.5, -34.0, -31.5, 12), (-15.5, -9.0, 6.0, 12.0, 14), (8.8, 11.0, -6.0, 2.0, 10)):
    for _ in range(n):
        t = random.uniform(0.25, 0.8)
        bloque('E', random.choice((ESCOMBRO, HORMIGON)), en(random.uniform(x0, x1), random.uniform(z0, z1), 0.0, random.uniform(0, 3), (random.uniform(-0.5, 0.5), random.uniform(-0.5, 0.5))),
               (t, t * random.uniform(0.6, 1.0), t * 0.5), baldosa=1.2, mella=0.25)
# Los rebordes de los dos cráteres: losas levantadas, bajas (por encima pasan los bichos).
for cx, cz, r_ in ((3.4, -6.0, 1.9), (-5.6, -25.0, 1.6)):
    for k in range(12):
        a_ = 2 * math.pi * k / 12 + random.uniform(-0.1, 0.1)
        bloque('EV', LOSAS, en(cx + math.cos(a_) * r_ * 1.15, cz + math.sin(a_) * r_ * 1.15, 0.0, a_, (random.uniform(0.05, 0.18), 0.0)), (0.7, 0.45, 0.1), baldosa=1.6, mella=0.1)
# Las mesas de un café, tumbadas, delante de los pórticos.
for _ in range(10):
    x, z = random.uniform(-16.0, -11.5), random.uniform(-6.0, 6.0)
    torno('EV', HIERRO, en(x, z, 0.35, random.uniform(0, 3), (1.57, 0)), [(0.04, 0.0), (0.04, 0.72), (0.4, 0.72), (0.4, 0.75)], lados=8)
# Los fuegos que quedan (los rescoldos; el humo lo pone el juego).
for x, z in ((-13.4, -9.0), (12.6, -18.0), (-12.0, 9.4), (11.0, -33.0)):
    for k in range(5):
        cubo('EP', BRASA, P(x + random.uniform(-0.9, 0.9), z + random.uniform(-0.9, 0.9), 0.1), (random.uniform(0.3, 0.7), random.uniform(0.3, 0.7), 0.1), random.uniform(0, 3))
# El disco de la torre alien, en su sitio de siempre: resina con un aro que brilla.
torno('P', HORMIGON, en(BASE[0], BASE[1]), [(4.8, 0.0), (4.8, 0.2), (4.5, 0.2)], lados=28, u_rep=8, v_m=1.5, tapas=(False, True))
for i in range(28):
    a0, a1 = 2 * math.pi * i / 28, 2 * math.pi * (i + 1) / 28
    cara('EP', VERDE, [P(BASE[0] + r * math.cos(a_), BASE[1] + r * math.sin(a_), 0.22) for r, a_ in ((4.4, a0), (4.4, a1), (4.2, a1), (4.2, a0))], hacia=ARRIBA)

comprobar_paso(('E', 'EP', 'P', 'EV', 'GN', 'DV'), z_lejos=Z_NACEN)

# ==================================================================================
# 7. LO QUE SOLO SE VE EN EL VUELO: la ciudad alrededor, ardiendo
# ==================================================================================
for x0, x1, z0, z1 in ((-170.0, 320.0, 130.0, 1500.0), (-1500.0, -170.0, -1500.0, 1500.0), (320.0, 1500.0, -1500.0, 1500.0), (-170.0, 320.0, -1500.0, -250.0)):
    suelo('G', LOSAS, x0, x1, z0, z1, 0.0, 8.0)
n_ed = 0
for gx in np.arange(-700.0, 900.0, 34.0):
    for gz in np.arange(-700.0, 700.0, 34.0):
        cx, cz = gx + random.uniform(-4, 4), gz + random.uniform(-4, 4)
        if -110 < cx < 120 and -200 < cz < 90:                                       # la plaza, el Duomo y la galería
            continue
        if random.random() < 0.15:
            continue
        a, b = random.uniform(11.0, 15.0), random.uniform(11.0, 15.0)
        alto = random.choice((18, 21, 24, 27, 30))
        if random.random() < 0.12:                                                     # en ruinas: más bajo y negro
            caja('T', QUEMADO, cx - a, cx + a, cz - b, cz + b, 0.0, alto * random.uniform(0.3, 0.6), techo=QUEMADO)
            if random.random() < 0.5:
                cubo('CP', BRASA, P(cx, cz, alto * 0.3), (a * 0.8, b * 0.8, 0.6))
        else:
            caja('T', random.choice(FACHADAS), cx - a, cx + a, cz - b, cz + b, 0.0, alto, techo=AZOTEA)
            tejado('T', TEJADO, cx - a, cx + a, cz - b, cz + b, alto, 3.0)
        n_ed += 1
print('EDIFICIOS', n_ed)
# La Torre Velasca y el Pirelli, a lo lejos, para que se sepa dónde se está.
caja('T', FACHADAS[3], 220.0, 236.0, 380.0, 396.0, 0.0, 74.0, techo=AZOTEA)
caja('T', FACHADAS[3], 212.0, 244.0, 372.0, 404.0, 74.0, 106.0, techo=AZOTEA)
caja('T', FACHADAS[2], -380.0, -310.0, -620.0, -600.0, 0.0, 127.0, techo=AZOTEA)
cupula('CP', CIELO, 3300.0, 0.0, -40.0)

# ==================================================================================
# 8. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'DV': ('vert-duomo', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-milan', ['P', 'E', 'GN', 'EV', 'EP', 'DV']), ('lugar-milan-ciudad', ['G', 'T', 'CP'])],
    # Atardecer bajo el humo: sol muy naranja y bajo, cielo flojo y la luz algo apagada.
    sol_hacia=SOL, sol_color=(1.0, 0.58, 0.28), sol_fuerza=6.5, sol_ancho=6.0, cielo_fuerza=0.16, cielo_altura=20, cielo_giro=200,
    escala=0.85, satura=0.75, no_alumbran=('CP', 'EP'), suaves=('DV',), fundir=True)
