# Nueva York: la cubierta de un portaaviones fondeado en la bahía (10/10/2026).
#   blender -b -P herramientas/blender/lugar_portaaviones.py              (entero)
#   blender -b -P herramientas/blender/lugar_portaaviones.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_portaaviones.py -- --reusar  (retocar la luz)
#
# Isidro (10/10): «quiero una batalla en un portaaviones en el mar de Nueva York,
# que se vea la Estatua de la Libertad cerca y de fondo Nueva York con un skyline
# totalmente reconocible, con sus puentes». Sustituye al tramo de la Isla de la
# Libertad. Eligió: los alienz SUBEN POR EL ASCENSOR DEL HANGAR (sin nave) y al
# ATARDECER. Y es el mapa que estrena lo que pidió para todos: el fondo no
# desaparece al empezar la batalla (todo va en el modelo de juego), el agua se
# mueve, las banderas y los árboles se mecen y hay un ferry que cruza la bahía.
#
# Cómo está puesto. La cámara de este mapa va más baja (`picado: 16`), así que
# se ve cielo: el horizonte cae a 144 px de los 812 del móvil.
#   · Se juega en la banda de BABOR de la cubierta de vuelo, mirando a proa: el
#     mar a la izquierda (el canto está en x = -8,4), los cazas aparcados a la
#     derecha, y al fondo del pasillo el ascensor (z = -64 a -52), que baja al
#     hangar y sube cargado. Más allá, la proa con un caza en la catapulta y un
#     helicóptero.
#   · Detrás, lo que se ve por encima de la proa: la Estatua de la Libertad a su
#     tamaño, a 540 m y casi en el eje (el hueco que deja el marcador); Manhattan
#     de punta a punta, con el One World Trade Center, el Empire State y el
#     Chrysler; a la derecha, los puentes de Brooklyn y de Manhattan cruzando el
#     East River; y sobre la ciudad, la nodriza.
#   · La geografía es una POSTAL, no un plano: desde ningún punto de la bahía se
#     ven a la vez la estatua de frente, el sur de Manhattan y el puente de
#     Brooklyn así de cerca. Todo lo lejano se coloca con `polar(grados, metros)`
#     desde la cámara de juego (la pantalla abarca ±11,6°).

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from horneado import *
import horneado as H

SOL = (-0.76, 0.33, 0.55)                # atardecer: bajo (19°), desde la izquierda y algo a la espalda
iniciar('portaaviones', 9211, eje=(0.0, -60.0), encendidas=0.13, reflejo=(0.5, 0.3, 0.16))
AQUI = os.path.dirname(os.path.abspath(__file__))

MAR = -20.0                              # la cubierta de vuelo va a veinte metros del agua
TIERRA = MAR + 4.0
CAM = (0.0, 9.51, 24.18)                 # la cámara de juego de este mapa (16° de picado)
X_BABOR = -8.4                           # el canto de la cubierta, a la izquierda
Z_PROA, Z_POPA = -112.0, 170.0
ASC = dict(x=7.6, z0=-64.0, z1=-52.0, hondo=6.5)      # el ascensor (lo mismo en campana.js)
BASE = (-12.6, -44.0)
R_BASE = 5.4

def polar (grados, d):
    """Un punto a `d` metros de la cámara de juego y a tantos grados del eje."""
    a = math.radians(grados)
    return d * math.sin(a), CAM[2] - d * math.cos(a)

def x_estribor (z):
    """El canto de estribor, que se cierra hacia la proa."""
    for (z0, x0), (z1, x1) in zip(ESTRIBOR, ESTRIBOR[1:]):
        if z1 <= z <= z0:
            return x0 + (x1 - x0) * (z0 - z) / (z0 - z1)
    return ESTRIBOR[0][1]
ESTRIBOR = [(Z_POPA, 46.0), (-40.0, 46.0), (-84.0, 38.0), (-106.0, 28.0), (Z_PROA, 20.0)]
PLANTA = [(X_BABOR, Z_POPA), (X_BABOR, -90.0), (-5.0, -106.0), (2.0, Z_PROA), (20.0, Z_PROA), (28.0, -106.0), (38.0, -84.0), (46.0, -40.0), (46.0, Z_POPA - 20.0), (40.0, Z_POPA)]

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
H.LETRAS.update({'9': ['11111', '10001', '11111', '00001', '11111'], '2': ['11111', '00001', '11111', '10000', '11111'],
                 '1': ['00100', '01100', '00100', '00100', '01110']})
BLANCO, AMARILLO_P, ROJO_P = (0.82, 0.82, 0.8), (0.86, 0.68, 0.1), (0.62, 0.1, 0.08)

def antideslizante (alto, ancho):
    """La piel de la cubierta: gris oscuro y áspera, a manchas grandes."""
    tejar = lambda t: np.tile(t, (alto // t.shape[0] + 1, ancho // t.shape[1] + 1, 1))[:alto, :ancho].copy()
    a = tejar(foto('asphalt_02', 256, 0x62656a, 0.6))
    return a * (0.88 + 0.24 * nube(alto, ancho, max(2, alto // 90), max(2, ancho // 90)))[..., None]

class Lienzo:
    """Un trozo de cubierta que se pinta en metros."""
    def __init__ (self, x0, x1, z0, z1, ancho, alto):
        self.x0, self.z0, self.W, self.Hh = x0, z0, ancho, alto
        self.kx, self.kz = ancho / (x1 - x0), alto / (z1 - z0)
        self.a = antideslizante(alto, ancho)
        yy, xx = np.mgrid[0:alto, 0:ancho].astype(np.float32)
        self.xs, self.zs = x0 + xx / self.kx, z0 + yy / self.kz
        self.grano = E.rng.random((alto, ancho)).astype(np.float32)
    def px (self, x, z):
        return int(round((x - self.x0) * self.kx)), int(round((z - self.z0) * self.kz))
    def pintar (self, donde, color, gasto=0.3):
        """Pintura de cubierta: gastada a calvas, que deja ver el gris de debajo."""
        calva = np.clip((self.grano - (1 - gasto)) * 6, 0, 1) * 0.7 + 0.12
        m = donde[..., None] * (1 - calva[..., None])
        self.a = self.a * (1 - m) + np.array(color, np.float32) * m
    def mancha (self, x, z, r_, k, forma=1.0, hacia=None):
        c, f_ = self.px(x, z)
        rc, rf = int(r_ * self.kx * forma) + 2, int(r_ * self.kz) + 2
        y0, y1, x0, x1 = max(0, f_ - rf), min(self.Hh, f_ + rf), max(0, c - rc), min(self.W, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * self.kx * forma), (my - f_) / (r_ * self.kz))
        m = ((1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
        self.a[y0:y1, x0:x1] = self.a[y0:y1, x0:x1] * (1 - m) + (0 if hacia is None else np.array(hacia, np.float32) * m)
    def amarres (self, paso=2.2):
        """Los puntos de amarre: una estrella hundida cada dos metros, por toda la cubierta."""
        x = self.x0 + 0.7
        while x < self.x0 + self.W / self.kx:
            z = self.z0 + 0.7
            while z < self.z0 + self.Hh / self.kz:
                c, f_ = self.px(x, z)
                if 4 < c < self.W - 4 and 4 < f_ < self.Hh - 4:
                    self.a[f_ - 3:f_ + 4, c - 3:c + 4] *= 0.5
                    self.a[f_ - 1:f_ + 2, c - 1:c + 2] = (0.42, 0.42, 0.44)
                z += paso
            x += paso
    def costuras (self, cada_x=4.4, cada_z=6.0):
        self.a[((self.xs - self.x0) % cada_x) * self.kx < 1.6] *= 0.84
        self.a[((self.zs - self.z0) % cada_z) * self.kz < 1.6] *= 0.84
    def franjas (self, donde, a_, b_, paso=0.8):
        """Las rayas de peligro: en diagonal, de dos colores."""
        raya = np.floor((self.xs + self.zs) / paso) % 2 == 0
        self.pintar(donde & raya, a_, 0.2)
        self.pintar(donde & ~raya, b_, 0.2)

PX0, PX1, PZ0, PZ1 = X_BABOR, 9.2, ASC['z1'], 12.4
def tex_pista ():
    """Donde se juega: la banda de babor de la cubierta. Las líneas del área de
    toma, las huellas de goma de los aterrizajes, los puntos de amarre, las
    costuras de las planchas y lo que deja una batalla."""
    L = Lienzo(PX0, PX1, PZ0, PZ1, 768, 3072)
    L.costuras()
    L.amarres()
    for _ in range(70):                                                              # goma de los aterrizajes
        L.mancha(random.uniform(-6.5, 6.5), random.uniform(PZ0, PZ1), random.uniform(3.0, 9.0), random.uniform(0.6, 0.82), random.uniform(0.02, 0.05))
    xs, zs = L.xs, L.zs
    L.pintar((np.abs(np.abs(xs) - 7.15) < 0.11), BLANCO, 0.4)                          # los bordes del área de toma
    L.pintar((np.abs(xs) < 0.14) & ((zs % 6.0) < 3.0), AMARILLO_P, 0.45)                # el eje, a trazos
    L.pintar((xs < X_BABOR + 0.4), AMARILLO_P, 0.3)                                    # el canto de la cubierta
    foul = (xs > 7.75) & (xs < 8.15)                                                  # la línea de seguridad, roja y blanca
    L.pintar(foul & ((zs % 2.4) < 1.2), ROJO_P, 0.3)
    L.pintar(foul & ((zs % 2.4) >= 1.2), BLANCO, 0.3)
    L.franjas((zs < PZ0 + 0.7) & (np.abs(xs) < ASC['x']), AMARILLO_P, (0.06, 0.06, 0.06))   # el borde del ascensor
    for z in (-38.0, -22.0, -6.0):                                                    # marcas de distancia, a los lados
        for s in (-1, 1):
            L.pintar((np.abs(zs - z) < 0.12) & (s * xs > 5.6) & (s * xs < 7.0), BLANCO, 0.4)
    for _ in range(40):                                                              # aceite y líquido hidráulico
        L.mancha(random.uniform(-7.5, 8.5), random.uniform(PZ0, PZ1), random.uniform(0.25, 0.9), random.uniform(0.7, 0.9), random.uniform(0.6, 1.6))
    for x, z, r_ in ((-3.4, -14.0, 1.5), (4.2, -33.0, 1.7), (-0.8, -46.0, 1.3), (5.6, 2.0, 1.0)):   # quemaduras
        L.mancha(x, z, r_ * 1.6, 0.72, 1.1)
        L.mancha(x, z, r_, 0.3)
    for x, z, r_ in ((-5.2, -27.0, 1.1), (2.4, -8.0, 1.4)):                             # charcos, con el cielo del atardecer dentro
        L.mancha(x, z, r_ * 1.2, 0.75, 1.5)
        L.mancha(x, z, r_, 0.5, 1.5, hacia=(0.74, 0.5, 0.36))
    return guardar('pista', np.clip(L.a, 0, 1), 86)

QX0, QX1, QZ0, QZ1 = X_BABOR, 46.0, Z_PROA, ASC['z1']
def tex_proa ():
    """La proa: las dos catapultas, el número del barco, el cerco del ascensor."""
    L = Lienzo(QX0, QX1, QZ0, QZ1, 1024, 1024)
    L.costuras()
    L.amarres(2.4)
    xs, zs = L.xs, L.zs
    for (ax, az), (bx, bz) in (((-1.5, -66.0), (-1.5, -111.0)), ((13.0, -58.0), (9.0, -111.0))):   # las catapultas: la ranura y sus planchas
        lx, lz = bx - ax, bz - az
        t = np.clip(((xs - ax) * lx + (zs - az) * lz) / (lx * lx + lz * lz), 0, 1)
        d = np.hypot(xs - ax - t * lx, zs - az - t * lz)
        L.a[d < 0.9] *= 1.28
        L.a[d < 0.16] = (0.04, 0.04, 0.045)
        L.pintar((d > 0.9) & (d < 1.05), BLANCO, 0.5)
    cerco = (np.abs(xs) < ASC['x'] + 0.7) & (zs > ASC['z0'] - 0.7) & (zs < ASC['z1']) & ~((np.abs(xs) < ASC['x']) & (zs > ASC['z0']))
    L.franjas(cerco, AMARILLO_P, (0.06, 0.06, 0.06))
    L.pintar((np.abs(xs - 7.95) < 0.2) & ((zs % 2.4) < 1.2) & (zs < ASC['z0'] - 1), ROJO_P, 0.3)
    L.pintar((xs < X_BABOR + 0.4), AMARILLO_P, 0.3)
    for _ in range(40):
        L.mancha(random.uniform(QX0, QX1), random.uniform(QZ0, QZ1), random.uniform(3.0, 8.0), random.uniform(0.66, 0.84), random.uniform(0.03, 0.07))
    for _ in range(40):
        L.mancha(random.uniform(QX0, QX1), random.uniform(QZ0, QZ1), random.uniform(0.3, 1.2), random.uniform(0.7, 0.9), random.uniform(0.6, 1.6))
    a = L.a
    # El número, grande, para leerlo desde el aire viniendo de proa.
    num = np.zeros((5, 11), bool)
    for i, ch in enumerate('92'):
        for f, fila in enumerate(H.LETRAS[ch]):
            for c, bit in enumerate(fila):
                num[f, i * 6 + c] = bit == '1'
    bloque_m = 1.5
    for f in range(5):
        for c in range(11):
            if num[f, c]:
                (c0, f0), (c1, f1) = L.px(20.0 + c * bloque_m, -108.0 + f * bloque_m), L.px(20.0 + (c + 1) * bloque_m, -108.0 + (f + 1) * bloque_m)
                a[f0:f1, c0:c1] = a[f0:f1, c0:c1] * 0.25 + np.array(BLANCO, np.float32) * 0.75
    return guardar('proa', np.clip(a, 0, 1), 84)

def tex_ascensor ():
    L = Lienzo(-ASC['x'], ASC['x'], ASC['z0'], ASC['z1'], 512, 512)
    L.amarres(2.2)
    xs, zs = L.xs, L.zs
    borde = (np.abs(xs) > ASC['x'] - 0.5) | (zs < ASC['z0'] + 0.5) | (zs > ASC['z1'] - 0.5)
    L.franjas(borde, AMARILLO_P, (0.06, 0.06, 0.06))
    L.pintar((np.abs(np.abs(xs) - 4.0) < 0.1) & (zs > ASC['z0'] + 1.5) & (zs < ASC['z1'] - 1.5), BLANCO, 0.4)
    for _ in range(16):
        L.mancha(random.uniform(-7, 7), random.uniform(ASC['z0'], ASC['z1']), random.uniform(0.3, 1.2), random.uniform(0.6, 0.85), random.uniform(0.6, 1.6))
    escribir(L.a, 'EL 1', 380, 440, 4, AMARILLO_P)
    return guardar('ascensor', np.clip(L.a, 0, 1), 86)

def tex_cubierta ():
    """El resto de la cubierta, en baldosa (seis metros)."""
    L = Lienzo(0.0, 6.0, 0.0, 6.0, 512, 512)
    L.amarres(2.0)
    for _ in range(5):
        L.mancha(random.uniform(0, 6), random.uniform(0, 6), random.uniform(0.3, 0.9), random.uniform(0.75, 0.9), random.uniform(0.6, 1.6))
    return guardar('cubierta', np.clip(L.a, 0, 1), 84)

def tex_casco ():
    """La chapa del barco: gris naval, con chorreras de óxido y costuras."""
    n = 256
    a = lienzo(n, n, (0.36, 0.39, 0.42)) * (0.92 + 0.12 * nube(n, n, 5, 5))[..., None]
    chorro = (0.82 + 0.2 * nube(2, n, 1, 30)[0])[None, :, None]
    a *= chorro
    oxido = np.clip((nube(n, n, 3, 40) - 0.62) * 4, 0, 1)[..., None] * 0.35
    a = a * (1 - oxido) + np.array((0.34, 0.2, 0.12), np.float32) * oxido
    a[::64] *= 0.85; a[:, ::85] *= 0.9
    return guardar('casco', np.clip(a, 0, 1), 86)

def tex_isla ():
    """La pared de la isla: chapa con ojos de buey y una galería de ventanas."""
    n = 256
    a = lienzo(n, n, (0.4, 0.43, 0.46)) * (0.92 + 0.12 * nube(n, n, 4, 4))[..., None]
    a *= (0.86 + 0.16 * nube(2, n, 1, 24)[0])[None, :, None]
    a[::64] *= 0.82
    for c in range(20, n, 64):
        a[100:112, c:c + 10] = (0.05, 0.07, 0.09)
        a[98:100, c - 1:c + 11] = (0.5, 0.52, 0.54)
    return guardar('isla', np.clip(a, 0, 1), 86)

def tex_puente_mando ():
    a = lienzo(64, 256, (0.36, 0.39, 0.42))
    for c in range(4, 256, 18):
        a[14:50, c:c + 14] = (0.08, 0.12, 0.16)
        a[14:22, c:c + 14] = (0.6, 0.45, 0.34)                                         # el atardecer, en el cristal
    return guardar('puente-mando', a, 86)

def tex_numero ():
    a = lienzo(64, 128, (0.4, 0.43, 0.46))
    escribir(a, '92', 20, 10, 8, BLANCO)
    return guardar('numero', a, 88)

def tex_bandera ():
    a = lienzo(130, 247, (0.7, 0.08, 0.1))
    for f in range(13):
        if f % 2:
            a[f * 10:(f + 1) * 10] = (0.92, 0.92, 0.9)
    a[0:70, 0:99] = (0.1, 0.13, 0.36)
    for f in range(9):
        for c in range(11):
            if (f + c) % 2 == 0:
                a[4 + f * 7:7 + f * 7, 4 + c * 9:7 + c * 9] = (0.95, 0.95, 0.95)
    return guardar('bandera', a, 88)

def tex_ferry ():
    """El ferry de Staten Island: naranja, con sus tres cubiertas de ventanas."""
    a = lienzo(64, 256, (0.85, 0.42, 0.06))
    a[52:] = (0.1, 0.12, 0.16)
    for f0 in (8, 24, 38):
        for c in range(6, 252, 10):
            a[f0:f0 + 8, c:c + 6] = (0.1, 0.13, 0.17) if random.random() > 0.3 else (0.95, 0.8, 0.5)
    return guardar('ferry', a, 86)

def tex_mar ():
    """El color de fondo de la bahía; las olas y los brillos los pone el juego."""
    n = 256
    a = lienzo(n, n, (0.1, 0.2, 0.27)) * (0.94 + 0.12 * nube(n, n, 5, 5))[..., None]
    return guardar('mar', np.clip(a, 0, 1), 86)

def tex_piedra_puente ():
    """Los sillares del puente de Brooklyn: granito y caliza, de color miel."""
    n = 256
    a = lienzo(n, n, (0.56, 0.48, 0.38)) * (0.9 + 0.16 * nube(n, n, 6, 6))[..., None]
    for y in range(0, n, 16):
        a[y:y + 1] *= 0.7
        for x in range((y // 16 % 2) * 16, n, 32):
            a[y:y + 16, x:x + 1] *= 0.75
    return guardar('piedra-puente', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=0.95)
PROA = material('proa', tex_proa(), rug=0.95)
ASCENSOR = material('ascensor', tex_ascensor(), rug=0.95)
CUBIERTA = material('cubierta', tex_cubierta(), rug=0.95)
CASCO = material('casco', tex_casco(), rug=0.7)
ISLA_M = material('isla', tex_isla(), rug=0.7)
PUENTE_MANDO = material('puente-mando', tex_puente_mando(), rug=0.4)
NUMERO = material('numero', tex_numero(), rug=0.7)
# La bandera se mece: nada junto al mástil y todo en la punta. Cada bandera lleva
# su material (el mismo dibujo): lo que se mece se apunta por nombre de material.
BANDERA_IM = tex_bandera()
n_banderas = [0]
def tela_de_bandera (cuanto):
    n_banderas[0] += 1
    return mecer(material(f'bandera-{n_banderas[0]}', BANDERA_IM, rug=0.9), cuanto)
FERRY = material('ferry', tex_ferry(), rug=0.6)
AGUA = material('agua-bahia', tex_mar(), rug=0.1)
PIEDRA_P = material('piedra-puente', tex_piedra_puente(), rug=1.0)
GRANITO = material('granito', de_polyhaven('rock_tile_floor', 256, 0x9a968c, 0.5), rug=0.9)
VID = {k: material(f'vidrio-{k}', tex_vidrio(f'vidrio-{k}', c), rug=0.2) for k, c in
       dict(azul=(0.2, 0.29, 0.4), oscuro=(0.09, 0.11, 0.15), verde=(0.17, 0.27, 0.29), bronce=(0.3, 0.23, 0.17), plata=(0.36, 0.41, 0.47)).items()}
OFI = {k: material(f'oficina-{k}', tex_oficina(f'oficina-{k}', a_, c), rug=0.8) for k, (a_, c) in
       dict(piedra=((0.62, 0.56, 0.46), (0.12, 0.16, 0.22)), gris=((0.46, 0.46, 0.46), (0.1, 0.14, 0.2)), teja=((0.5, 0.32, 0.24), (0.1, 0.12, 0.16)), crema=((0.72, 0.66, 0.54), (0.14, 0.18, 0.22))).items()}
LAD = [material(f'ladrillo-{i}', tex_ladrillo(f'ladrillo-{i}', c), rug=0.9) for i, c in enumerate([(0.5, 0.26, 0.2), (0.6, 0.44, 0.32)])]
# OJO: los colores lisos van en LINEAL.
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
ACERO = material('acero', color=(0.2, 0.22, 0.24), rug=0.6)
ACERO_O = material('acero-oscuro', color=(0.05, 0.055, 0.06), rug=0.7)
GRIS_NAVAL = material('gris-naval', color=(0.14, 0.16, 0.18), rug=0.7)
BLANCO_M = material('blanco', color=(0.8, 0.8, 0.78), rug=0.5)
AMARILLO = material('amarillo', color=(0.8, 0.5, 0.02), rug=0.7)
ROJO = material('rojo', color=(0.5, 0.03, 0.02), rug=0.7)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.5, 0.2), emite=1.4)
AMBAR = material('brillo-ambar', color=(1.0, 0.55, 0.08), emite=2.0)
AZOTEA = material('azotea', color=(0.07, 0.07, 0.075), rug=1.0)
COBRE = material('cobre-verde', color=(0.2, 0.42, 0.34), rug=0.8)
CROMO = material('cromo', color=(0.6, 0.62, 0.66), rug=0.3)
ORO = material('oro', color=(0.75, 0.52, 0.12), rug=0.4)
AZUL_P = material('azul-puente', color=(0.1, 0.16, 0.24), rug=0.7)
CALLES = material('calles', color=(0.1, 0.1, 0.105), rug=1.0)
CESPED = material('cesped', color=(0.07, 0.17, 0.05), rug=1.0)
MUELLE = material('muelle', color=(0.24, 0.22, 0.2), rug=1.0)
# Las copas de los árboles se mecen la mitad que una bandera.
ARBOL = [mecer(material(f'arbol-{i}', color=c, rug=1.0), 0.5) for i, c in enumerate([(0.04, 0.12, 0.03), (0.06, 0.16, 0.04), (0.1, 0.16, 0.03)])]
TRONCO = material('tronco', color=(0.07, 0.05, 0.04))
VELA = material('vela', color=(0.85, 0.83, 0.78), rug=0.9)
NODRIZA = material('nodriza', color=(0.1, 0.11, 0.13), rug=0.4)
HAZ = material('brillo-haz', color=(0.3, 1.0, 0.5), emite=1.0, alfa=0.22)
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.98, 0.62, 0.36)), (0.05, (0.96, 0.6, 0.42)), (0.16, (0.78, 0.56, 0.58)), (0.4, (0.42, 0.44, 0.68)), (1.0, (0.16, 0.2, 0.44))],
    (SOL[0], SOL[2]), 0.1, (0.9, 0.42, 0.1), ((1.0, 0.7, 0.44), (0.62, 0.5, 0.62)), cuanta_nube=0.08), emite=1.0)
for m_ in list(VID.values()) + list(OFI.values()) + LAD:                              # las fachadas están a kilómetros: a la mitad
    imagen_de(m_).scale(256, 256)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LA CUBIERTA DE VUELO Y EL BARCO
# ==================================================================================
def cara_uv (grupo, mat, puntos, y, caja_):
    """Un trozo de cubierta con la textura colocada por su sitio: `caja_` es
    (x0, x1, z0, z1), lo que abarca el dibujo entero."""
    x0, x1, z0, z1 = caja_
    cara(grupo, mat, [P(x, z, y) for x, z in puntos], uvs=[((x - x0) / (x1 - x0), 1 - (z - z0) / (z1 - z0)) for x, z in puntos], hacia=ARRIBA)

rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
Q = (QX0, QX1, QZ0, QZ1)
cara_uv('P', PROA, [(X_BABOR, ASC['z1']), (X_BABOR, ASC['z0']), (-ASC['x'], ASC['z0']), (-ASC['x'], ASC['z1'])], 0.0, Q)                    # a babor del ascensor
cara_uv('P', PROA, [(ASC['x'], ASC['z1']), (ASC['x'], ASC['z0']), (x_estribor(ASC['z0']), ASC['z0']), (x_estribor(ASC['z1']), ASC['z1'])], 0.0, Q)   # a estribor
cara_uv('P', PROA, [(X_BABOR, ASC['z0']), (X_BABOR, -90.0), (-5.0, -106.0), (2.0, Z_PROA), (20.0, Z_PROA), (28.0, -106.0), (38.0, -84.0), (x_estribor(ASC['z0']), ASC['z0'])], 0.0, Q)
cara('D', CUBIERTA, [P(x, z, 0.0) for x, z in ((9.2, PZ1), (9.2, PZ0), (x_estribor(PZ0), PZ0), (46.0, -40.0), (46.0, PZ1))], hacia=ARRIBA, baldosa=6.0)
cara('D', CUBIERTA, [P(x, z, 0.0) for x, z in ((X_BABOR, Z_POPA), (X_BABOR, PZ1), (46.0, PZ1), (46.0, Z_POPA - 20.0), (40.0, Z_POPA))], hacia=ARRIBA, baldosa=6.0)
# El canto de la cubierta (la galería, tres metros y medio de chapa) y el casco, más estrecho.
def paredes (grupo, mat, planta, y0, y1, baldosa=12.0):
    cx = sum(p[0] for p in planta) / len(planta); cz = sum(p[1] for p in planta) / len(planta)
    u = 0.0
    for i in range(len(planta)):
        (ax, az), (bx, bz) = planta[i], planta[(i + 1) % len(planta)]
        largo = math.hypot(bx - ax, bz - az)
        nrm = V((bz - az, bx - ax, 0))                                                 # hacia fuera o hacia dentro: lo decide el centro
        medio = P((ax + bx) / 2, (az + bz) / 2)
        fuera = V((medio.x - P(cx, cz).x, medio.y - P(cx, cz).y, 0))
        cara(grupo, mat, [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)],
             uvs=[(u, y0 / baldosa), (u + largo / baldosa, y0 / baldosa), (u + largo / baldosa, y1 / baldosa), (u, y1 / baldosa)], hacia=fuera)
        u += largo / baldosa
paredes('D', CASCO, PLANTA, -3.4, 0.0)
cara('D', CASCO, [P(x, z, -3.4) for x, z in PLANTA], hacia=H.ABAJO, baldosa=12.0)
CASCO_P = [(4.0, Z_POPA - 6.0), (4.0, -74.0), (10.0, -100.0), (19.0, -117.0), (28.0, -100.0), (34.0, -74.0), (34.0, Z_POPA - 6.0), (28.0, Z_POPA + 4.0), (10.0, Z_POPA + 4.0)]
paredes('D', CASCO, CASCO_P, MAR - 1.0, -3.4)
crecer = lambda pts, k: [(19.0 + (x - 19.0) * k, 20.0 + (z - 20.0) * (1 + (k - 1) * 0.12)) for x, z in pts]
paredes('D', ACERO_O, crecer(CASCO_P, 1.012), MAR - 1.0, MAR + 1.4)                                    # la línea de flotación
# La pasarela de babor, por debajo del canto, con sus redes de seguridad.
rect('P', CUBIERTA, X_BABOR - 1.5, X_BABOR, -100.0, PZ1 + 20.0, -1.3, 6.0)
for z in np.arange(-98.0, PZ1 + 18.0, 3.0):
    if abs(z - BASE[1]) < R_BASE + 0.5:
        continue
    barra('EV', ACERO, P(X_BABOR - 0.1, float(z), -0.3), P(X_BABOR - 2.3, float(z), -0.9), 0.07)
for z0, z1 in ((-98.0, BASE[1] - R_BASE - 0.5), (BASE[1] + R_BASE + 0.5, PZ1 + 18.0)):
    barra('EV', ACERO, P(X_BABOR - 2.3, z0, -0.9), P(X_BABOR - 2.3, z1, -0.9), 0.08)
    barra('EV', ACERO, P(X_BABOR - 1.2, z0, -0.6), P(X_BABOR - 1.2, z1, -0.6), 0.05)
# Antenas de látigo, tumbadas hacia fuera, y los botes salvavidas en sus cunas.
for z in (-10.0, -24.0, -62.0, -86.0):
    barra('EV', ACERO, P(X_BABOR - 0.4, z, -0.2), P(X_BABOR - 4.6, z + 0.4, 5.6), 0.07)
    elipsoide('EV', ACERO_O, en(X_BABOR - 0.5, z, 0.0), (0.22, 0.22, 0.3))
for z_c in (-18.0, -68.0, -80.0):
    for k in range(5):
        torno('EV', BLANCO_M, en(X_BABOR - 1.9, z_c + k * 1.5 - 0.55, -0.55, 0.0, (math.pi / 2, 0.0)), [(0.0, 0.0), (0.42, 0.06), (0.42, 1.1), (0.0, 1.16)], lados=8, tapas=(False, False))
# El cañón de defensa cercana (la cúpula blanca), en su repisa.
CX, CZ = X_BABOR - 2.4, -76.0
prisma('P', CASCO, [(CX + 2.4 * math.cos(a), CZ + 2.4 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 13)[:-1]], -3.4, -0.4, techo=CUBIERTA, baldosa=6.0)
torno('EV', ACERO, en(CX, CZ, -0.4), [(1.1, 0.0), (1.1, 0.5), (0.7, 0.8), (0.7, 1.5)], lados=10, tapas=(False, True))
torno('EV', BLANCO_M, en(CX, CZ, 1.1), [(0.78, 0.0), (0.8, 1.6), (0.62, 2.2), (0.0, 2.5)], lados=12, tapas=(False, False))
barra('EV', ACERO_O, P(CX - 0.2, CZ - 0.4, 1.3), P(CX - 1.3, CZ - 2.4, 1.9), 0.22)
# La bandera, en un mástil del canto, sobre el mar (por encima de los cuatro metros no, que no estorba: va fuera).
def bandera (x0, z, y0, largo, alto, hacia_x=-1, grupo='EV'):
    """Una bandera de tela partida en trozos, para que al mecerse haga ondas."""
    n = 9
    tela = tela_de_bandera(lambda co, x0=x0, largo=largo, s=hacia_x: (s * (co.x - x0)) / largo)
    for i in range(n):
        for j in range(3):
            xa, xb = x0 + hacia_x * largo * i / n, x0 + hacia_x * largo * (i + 1) / n
            ya, yb = y0 + alto * j / 3, y0 + alto * (j + 1) / 3
            pts = [P(xa, z, ya), P(xb, z, ya), P(xb, z, yb), P(xa, z, yb)]
            uvs = [(i / n, j / 3), ((i + 1) / n, j / 3), ((i + 1) / n, (j + 1) / 3), (i / n, (j + 1) / 3)]
            cara(grupo, tela, pts, uvs=uvs, hacia=V((0, -1, 0)))
            cara(grupo, tela, [P(xa, z - 0.03, ya), P(xb, z - 0.03, ya), P(xb, z - 0.03, yb), P(xa, z - 0.03, yb)], uvs=uvs, hacia=V((0, 1, 0)))
barra('EV', ACERO, P(X_BABOR - 0.3, -30.0, -0.3), P(X_BABOR - 0.3, -30.0, 6.4), 0.12)
bandera(X_BABOR - 0.4, -30.0, 4.2, 3.4, 2.0)

# --- el ascensor: el hueco y la plataforma (que es una malla aparte: la mueve el juego) ------------
HX, HZ0, HZ1, HH = ASC['x'], ASC['z0'], ASC['z1'], ASC['hondo'] + 0.9
for (ax, az), (bx, bz), hacia_ in (((-HX, HZ1), (-HX, HZ0), (1, 0, 0)), ((HX, HZ0), (HX, HZ1), (-1, 0, 0)), ((-HX, HZ0), (HX, HZ0), (0, -1, 0)), ((HX, HZ1), (-HX, HZ1), (0, 1, 0))):
    cara('P', ACERO_O, [P(ax, az, -HH), P(bx, bz, -HH), P(bx, bz, 0.0), P(ax, az, 0.0)], hacia=V(hacia_))
rect('P', NEGRO, -HX, HX, HZ0, HZ1, -HH, 6.0)
# La boca del hangar, en la pared del fondo: lo que alumbra desde dentro es de ellos.
cara('EP', BRILLO_HONDO, [P(-HX + 0.4, HZ0 + 0.04, -ASC['hondo']), P(HX - 0.4, HZ0 + 0.04, -ASC['hondo']), P(HX - 0.4, HZ0 + 0.04, -0.7), P(-HX + 0.4, HZ0 + 0.04, -0.7)], hacia=V((0, -1, 0)))
for k in range(9):
    x = -6.4 + k * 1.6
    cara('EP', VERDE, [P(x - 0.2, HZ0 + 0.07, -2.4), P(x + 0.2, HZ0 + 0.07, -2.4), P(x + 0.2, HZ0 + 0.07, -0.9), P(x - 0.2, HZ0 + 0.07, -0.9)], hacia=V((0, -1, 0)))
rect('AS', ASCENSOR, -HX, HX, HZ0, HZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
for (ax, az), (bx, bz), hacia_ in (((-HX, HZ1), (HX, HZ1), (0, -1, 0)), ((HX, HZ0), (-HX, HZ0), (0, 1, 0)), ((-HX, HZ0), (-HX, HZ1), (-1, 0, 0)), ((HX, HZ1), (HX, HZ0), (1, 0, 0))):
    cara('AS', ACERO_O, [P(ax, az, -0.7), P(bx, bz, -0.7), P(bx, bz, 0.0), P(ax, az, 0.0)], hacia=V(hacia_))
# Las barandillas que se levantan alrededor del hueco (por delante no: por ahí salen) y sus balizas.
for s in (-1, 1):
    barra('EV', AMARILLO, P(s * (HX + 0.25), HZ0 - 0.25, 1.0), P(s * (HX + 0.25), HZ1 - 0.6, 1.0), 0.08)
    for z in np.arange(HZ0 - 0.25, HZ1 - 0.5, 2.3):
        barra('EV', AMARILLO, P(s * (HX + 0.25), float(z), 0.0), P(s * (HX + 0.25), float(z), 1.0), 0.07)
    elipsoide('EP', AMBAR, en(s * (HX + 0.25), HZ1 - 0.6, 1.2), (0.16, 0.16, 0.16))
    elipsoide('EP', AMBAR, en(s * (HX + 0.25), HZ0 - 0.25, 1.2), (0.16, 0.16, 0.16))
barra('EV', AMARILLO, P(-HX - 0.25, HZ0 - 0.25, 1.0), P(HX + 0.25, HZ0 - 0.25, 1.0), 0.08)

# --- la repisa de la base alien, crecida sobre el mar a babor ------------------------------------
N_M = 26
circ = [(BASE[0] + R_BASE * math.cos(2 * math.pi * i / N_M), BASE[1] + R_BASE * math.sin(2 * math.pi * i / N_M)) for i in range(N_M)]
REPISA = material('repisa', color=(0.035, 0.05, 0.04), rug=0.6)
prisma('P', RESINA, circ, -3.4, 0.04, techo=REPISA, baldosa=4.0)
for i in range(N_M):
    (ax, az), (bx, bz) = circ[i], circ[(i + 1) % N_M]
    f = lambda x, z, k: P(BASE[0] + (x - BASE[0]) * k, BASE[1] + (z - BASE[1]) * k, 0.07)
    cara('EP', VERDE, [f(ax, az, 0.86), f(bx, bz, 0.86), f(bx, bz, 0.81), f(ax, az, 0.81)], hacia=ARRIBA)
for k in range(7):                                                                   # raíces de resina, cubierta adentro y casco abajo
    a_ = math.pi * (0.62 + 0.13 * k)
    barra('EV', RESINA, P(BASE[0] + R_BASE * 0.9 * math.cos(a_), BASE[1] + R_BASE * 0.9 * math.sin(a_), 0.0), P(BASE[0] + (R_BASE + 3) * math.cos(a_), BASE[1] + (R_BASE + 3) * math.sin(a_), -9.0 - k), 0.4)

# --- los cazas, el helicóptero y los tractores ------------------------------------------------------
def modelo (nombre, alto, caras):
    """Un modelo de Meshy, a su altura y aligerado, para sacar copias."""
    o = importar(os.path.join(AQUI, 'modelos', nombre + '.glb'), '_', alto, 0.0, 0.0)
    H.importados.pop('_')                                                            # no es de ningún grupo: solo sirve de molde
    aligerar(o, caras)
    vs = np.array([v.co[:] for v in o.data.vertices])
    print('MODELO', nombre, len(o.data.polygons), 'caras; mide', np.round(vs.max(axis=0) - vs.min(axis=0), 1))
    return o
CAZA = modelo('caza', 4.4, 3400)
HELI = modelo('helicoptero', 4.9, 3600)
# Aparcados a estribor del pasillo, en batería, con el morro hacia la pista y algo hacia popa.
for k, z in enumerate(np.arange(-17.0, -100.0, -10.4)):
    copiar(CAZA, 'JV', en(16.6 + (0.5 if k % 2 else 0.0), float(z), 0.0, math.radians(24 + random.uniform(-4, 4))))
copiar(CAZA, 'JV', en(-1.5, -90.0, 0.0, math.radians(-90)))                            # uno en la catapulta, listo para salir
copiar(HELI, 'JV', en(14.5, -100.0, 0.0, math.radians(35)))
aligerar(CAZA, 1300)
aligerar(HELI, 1500)
for x, z, g in ((30.0, 40.0, 150), (36.0, 58.0, 160), (24.0, 70.0, 200), (10.0, 96.0, 180), (20.0, 120.0, 170)):   # y más, a popa (solo se ven en la llegada), con menos caras
    copiar(CAZA, 'XV', en(x, z, 0.0, math.radians(g)))
copiar(HELI, 'XV', en(2.0, 130.0, 0.0, math.radians(-90)))
for o in (CAZA, HELI):
    bpy.data.objects.remove(o)
# El deflector de chorro, levantado detrás del caza de la catapulta.
cara('EV', ACERO, [P(-4.6, -80.4, 0.0), P(1.6, -80.4, 0.0), P(1.6, -78.6, 2.5), P(-4.6, -78.6, 2.5)], hacia=V((0, 1, 0.6)))
cara('EV', ACERO_O, [P(-4.6, -80.38, 0.0), P(1.6, -80.38, 0.0), P(1.6, -78.58, 2.5), P(-4.6, -78.58, 2.5)], hacia=V((0, -1, -0.6)))
for x in (-3.6, -1.5, 0.6):
    barra('EV', ACERO_O, P(x, -78.7, 2.3), P(x, -77.0, 0.0), 0.14)
def tractor (x, z, giro):
    m = en(x, z, 0.0, giro)
    T = lambda dx, dz, dy: m @ V((dx, dz, dy))
    bm, _, _ = H.lote('EV', AMARILLO)
    bmesh.ops.create_cube(bm, size=1, matrix=m @ M.Translation((0, 0, 0.62)) @ M.Diagonal((1.6, 2.6, 0.7, 1)))
    bm, _, _ = H.lote('EV', BLANCO_M)
    bmesh.ops.create_cube(bm, size=1, matrix=m @ M.Translation((0, -0.5, 1.12)) @ M.Diagonal((1.3, 1.0, 0.3, 1)))
    for dx in (-0.8, 0.8):
        for dz in (-0.85, 0.85):
            torno('EV', ACERO_O, m @ M.Translation((dx - 0.12 * (1 if dx > 0 else -1), dz, 0.36)) @ M.Rotation(math.pi / 2, 4, 'Y'), [(0.36, -0.14), (0.36, 0.14)], lados=10)
tractor(9.3, -29.0, 0.4)
tractor(9.6, -57.0, -0.3)
tractor(22.0, 4.0, 1.2)
# Calzos, cadenas y un extintor de carro, junto a los cazas.
for z in (-22.0, -43.0, -64.0):
    viga('EV', ROJO, 9.0, 9.5, z - 0.3, z + 0.3, 0.0, 0.9, tapas=True)
    torno('EV', ROJO, en(9.25, z + 0.7, 0.0), [(0.2, 0.0), (0.2, 0.9), (0.08, 1.1)], lados=8, tapas=(False, True))

# --- la isla (solo se ve en la llegada) -------------------------------------------------------------
IX0, IX1, IZ0, IZ1 = 30.0, 41.0, -30.0, 10.0
caja('D', ISLA_M, IX0, IX1, IZ0, IZ1, 0.0, 9.0, techo=CUBIERTA, baldosa=8.0)
caja('D', ISLA_M, IX0 - 1.4, IX1, IZ0 + 3.0, IZ1 - 12.0, 9.0, 13.2, techo=CUBIERTA, baldosa=8.0)
viga('D', PUENTE_MANDO, IX0 - 1.5, IX1 + 0.1, IZ0 + 2.9, IZ1 - 11.9, 10.6, 12.4, u_m=9.0, tapas=False)
caja('D', ISLA_M, IX0 + 0.6, IX1 - 1.0, IZ0 + 6.0, IZ1 - 16.0, 13.2, 17.4, techo=CUBIERTA, baldosa=8.0)
viga('D', PUENTE_MANDO, IX0 + 0.5, IX1 - 0.9, IZ0 + 5.9, IZ1 - 15.9, 15.0, 16.6, u_m=9.0, tapas=False)
caja('D', GRIS_NAVAL, IX0 + 2.0, IX1 - 2.0, IZ1 - 10.0, IZ1 - 2.0, 9.0, 19.0, techo=AZOTEA, baldosa=8.0)        # la chimenea
cara('EP', NUMERO, [P(IX0 - 0.06, IZ1 - 1.0, 1.6), P(IX0 - 0.06, IZ1 - 11.0, 1.6), P(IX0 - 0.06, IZ1 - 11.0, 7.4), P(IX0 - 0.06, IZ1 - 1.0, 7.4)], uvs=[(1, 0), (0, 0), (0, 1), (1, 1)], hacia=V((-1, 0, 0)))
MX, MZ = 35.0, -14.0                                                                 # el mástil, con sus radares
for dx, dz in ((-1.6, -1.6), (1.6, -1.6), (1.6, 1.6), (-1.6, 1.6)):
    barra('EV', ACERO, P(MX + dx, MZ + dz, 17.4), P(MX + dx * 0.3, MZ + dz * 0.3, 40.0), 0.3)
for y in (23.0, 29.0, 35.0):
    cubo('EV', ACERO, P(MX, MZ, y), (4.6 - (y - 23) * 0.2, 4.6 - (y - 23) * 0.2, 0.3))
cubo('EV', ACERO_O, P(MX, MZ - 1.0, 31.5), (7.0, 0.5, 3.4), 0.5)                       # la antena de vigilancia
elipsoide('EV', BLANCO_M, en(MX + 2.6, MZ + 2.0, 24.6), (1.3, 1.3, 1.5))
elipsoide('EV', BLANCO_M, en(MX - 2.4, MZ - 2.6, 21.0), (1.6, 1.6, 1.8))
barra('EV', ACERO, P(MX, MZ, 40.0), P(MX, MZ, 46.0), 0.14)
barra('EV', ACERO, P(MX, MZ, 37.0), P(MX, MZ + 6.5, 35.5), 0.1)                          # el pico de la bandera
def bandera_z (x, z0, y0, largo, alto):
    """Como `bandera`, pero tendida a lo largo del barco (hacia popa)."""
    n = 9
    tela = tela_de_bandera(lambda co, y0_=-z0, largo=largo: (-(co.y - y0_)) / largo)
    for i in range(n):
        for j in range(3):
            za, zb = z0 + largo * i / n, z0 + largo * (i + 1) / n
            ya, yb = y0 + alto * j / 3, y0 + alto * (j + 1) / 3
            uvs = [(i / n, j / 3), ((i + 1) / n, j / 3), ((i + 1) / n, (j + 1) / 3), (i / n, (j + 1) / 3)]
            cara('EV', tela, [P(x, za, ya), P(x, zb, ya), P(x, zb, yb), P(x, za, yb)], uvs=uvs, hacia=V((-1, 0, 0)))
            cara('EV', tela, [P(x + 0.04, za, ya), P(x + 0.04, zb, ya), P(x + 0.04, zb, yb), P(x + 0.04, za, yb)], uvs=uvs, hacia=V((1, 0, 0)))
bandera_z(MX, MZ + 0.4, 31.2, 7.0, 4.0)
print('BARCO', round(time.time() - H.E.t0, 1), 's')

comprobar_paso(('P', 'EP', 'EV', 'AS'), z_lejos=-51.5)

# ==================================================================================
# 3. LA BAHÍA: EL AGUA, LA ESTATUA Y LO QUE NAVEGA
# ==================================================================================
rect('AG', AGUA, -9000.0, 9000.0, -9000.0, 9000.0, MAR, 500.0)

GIRO_M = math.radians(29)                                                            # la cuadrícula de Manhattan, torcida
def cajon (grupo, mat, cx, cz, ancho, fondo, y0, y1, giro=0.0, baldosa=14.0, techo=None):
    """Una caja girada, con la fachada pegada a la esquina y al suelo."""
    c, s = math.cos(giro), math.sin(giro)
    esq = [(cx + dx * c - dz * s, cz + dx * s + dz * c) for dx, dz in ((-ancho / 2, fondo / 2), (ancho / 2, fondo / 2), (ancho / 2, -fondo / 2), (-ancho / 2, -fondo / 2))]
    centro = P(cx, cz, (y0 + y1) / 2)
    for i in range(4):
        (ax, az), (bx, bz) = esq[i], esq[(i + 1) % 4]
        largo = math.hypot(bx - ax, bz - az)
        pts = [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)]
        medio = (pts[0] + pts[2]) / 2
        cara(grupo, mat, pts, uvs=[(0, 0), (largo / baldosa, 0), (largo / baldosa, (y1 - y0) / baldosa), (0, (y1 - y0) / baldosa)],
             hacia=V((medio.x - centro.x, medio.y - centro.y, 0)))
    cara(grupo, techo or AZOTEA, [P(x, z, y1) for x, z in esq], hacia=ARRIBA)

# --- la isla de la Libertad y la estatua --------------------------------------------------------------
LX, LZ = polar(-0.6, 545.0)
# (A su tamaño —trescientos metros— tapaba el mar de lado a lado de la pantalla.)
isla_l = [(LX + 82 * math.cos(a) * (1 + 0.08 * math.sin(3 * a)), LZ - 6 + 60 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 25)[:-1]]
prisma('FV', GRANITO, isla_l, MAR - 1.0, MAR + 3.0, techo=CESPED, baldosa=6.0)
estrella = [(LX + (46 if i % 2 == 0 else 31) * math.cos(2 * math.pi * i / 22 + 0.14), LZ + (46 if i % 2 == 0 else 31) * math.sin(2 * math.pi * i / 22 + 0.14)) for i in range(22)]
prisma('FV', GRANITO, estrella, MAR + 3.0, MAR + 12.0, baldosa=6.0)                        # el fuerte, en estrella de once puntas
cajon('FV', GRANITO, LX, LZ, 40.0, 40.0, MAR + 12.0, MAR + 18.0, baldosa=6.0, techo=GRANITO)
libertad = importar(os.path.join(AQUI, 'modelos', 'libertad.glb'), 'LV', 75.0, LX, LZ)
aligerar(libertad, 7000)
libertad.data.transform(M.Translation((0, 0, MAR + 18.0)))
print('ESTATUA: la antorcha a', round(MAR + 93.0, 1), 'sobre la cubierta')
for _ in range(40):                                                                  # la arboleda de la isla
    a_, d = random.uniform(0, 6.28), random.uniform(52, 74)
    x, z = LX + d * math.cos(a_) * 1.05, LZ - 6 + d * 0.72 * math.sin(a_)
    if z > LZ + 10 and abs(x - LX) < 46:
        continue                                                                     # por delante, despejado: que se vea el fuerte
    barra('FV', TRONCO, P(x, z, MAR + 3.0), P(x, z, MAR + 9.0), 0.8)
    copa('FV', random.choice(ARBOL), x, z, MAR + 12.0, random.uniform(5.0, 8.0), random.uniform(4.0, 6.0), sub=1)
barra('FV', BLANCO_M, P(LX + 66, LZ + 20, MAR + 3.0), P(LX + 66, LZ + 20, MAR + 26.0), 0.5)
bandera(LX + 65.5, LZ + 20, MAR + 19.0, 10.0, 6.0, grupo='FV')

# --- lo que navega ------------------------------------------------------------------------------------
def velero (x, z, giro, tam=1.0):
    m = en(x, z, MAR, giro)
    bm, _, _ = H.lote('FV', BLANCO_M)
    bmesh.ops.create_cube(bm, size=1, matrix=m @ M.Translation((0, 0, 0.8 * tam)) @ M.Diagonal((3.2 * tam, 11.0 * tam, 1.6 * tam, 1)))
    barra('FV', ACERO, m @ V((0, 0.5 * tam, 1.6 * tam)), m @ V((0, 0.5 * tam, 17.0 * tam)), 0.2 * tam)
    cara('FV', VELA, [m @ V((0, 0.2 * tam, 2.6 * tam)), m @ V((0, -5.0 * tam, 2.8 * tam)), m @ V((0, 0.2 * tam, 16.4 * tam))], hacia=m.to_3x3() @ V((1, 0, 0)))
    cara('FV', VELA, [m @ V((0.05, 0.2 * tam, 2.6 * tam)), m @ V((0.05, 0.2 * tam, 16.4 * tam)), m @ V((0.05, -5.0 * tam, 2.8 * tam))], hacia=m.to_3x3() @ V((-1, 0, 0)))
    cara('FV', VELA, [m @ V((0, 0.9 * tam, 2.4 * tam)), m @ V((0, 5.4 * tam, 2.2 * tam)), m @ V((0, 0.9 * tam, 13.0 * tam))], hacia=m.to_3x3() @ V((1, 0, 0)))
for grados, d, g in ((-8.0, 420.0, 0.6), (5.5, 700.0, -1.0), (9.5, 1100.0, 0.3), (-4.0, 1500.0, 1.2), (2.5, 1900.0, -0.4), (-9.5, 2100.0, 0.9)):
    x, z = polar(grados, d)
    velero(x, z, g, random.uniform(0.9, 1.4))
def barco (grupo, x, z, giro, eslora, manga, puntal, casco_m, cuerpos, palo=0.0):
    """Un barco a bulto: casco con la proa afilada y cuerpos encima (ancho, largo, alto, desde, material)."""
    m = en(x, z, MAR, giro)
    h, w = eslora / 2, manga / 2
    cont = [(-w, -h), (w, -h), (w, h * 0.55), (0.0, h), (-w, h * 0.55)]
    arriba = [m @ V((px, py, puntal)) for px, py in cont]
    abajo = [m @ V((px * 0.86, py * 0.98, -1.0)) for px, py in cont]
    cara(grupo, casco_m, arriba, hacia=ARRIBA)
    for i in range(5):
        j = (i + 1) % 5
        medio = (arriba[i] + arriba[j]) / 2 - m @ V((0, 0, puntal))
        cara(grupo, casco_m, [abajo[i], abajo[j], arriba[j], arriba[i]], hacia=V((medio.x, medio.y, 0)))
    y = puntal
    for ancho, largo, alto, desde, mat in cuerpos:
        bm, _, _ = H.lote(grupo, mat)
        bmesh.ops.create_cube(bm, size=1, matrix=m @ M.Translation((0, desde, y + alto / 2)) @ M.Diagonal((ancho, largo, alto, 1)))
        y += alto
    if palo:
        barra(grupo, ACERO, m @ V((0, 0, y)), m @ V((0, 0, y + palo)), 0.5)
    return m
# Un destructor de escolta, a babor y de costado.
dx_, dz_ = polar(-6.6, 980.0)
barco('FV', dx_, dz_, math.radians(82), 150.0, 18.0, 9.0, GRIS_NAVAL, [(14.0, 70.0, 5.0, 6.0, GRIS_NAVAL), (11.0, 30.0, 6.0, 16.0, GRIS_NAVAL), (6.0, 10.0, 5.0, 20.0, ACERO)], palo=16.0)
# Un portacontenedores, lejos, entrando en la bahía.
cx_, cz_ = polar(8.4, 1500.0)
m_ = barco('FV', cx_, cz_, math.radians(-70), 230.0, 32.0, 12.0, material('casco-rojo', color=(0.3, 0.05, 0.04)), [(26.0, 22.0, 26.0, -92.0, BLANCO_M)])
for i in range(7):
    for j in range(3):
        bm, _, _ = H.lote('FV', random.choice((ROJO, AMARILLO, GRIS_NAVAL, material('contenedor-azul', color=(0.05, 0.14, 0.3)), material('contenedor-verde', color=(0.05, 0.2, 0.1)))))
        alto = random.choice((5.0, 7.6, 10.2))
        bmesh.ops.create_cube(bm, size=1, matrix=m_ @ M.Translation(((j - 1) * 9.6, -66.0 + i * 24.0, 12.0 + alto / 2)) @ M.Diagonal((9.0, 22.0, alto, 1)))
# El ferry de Staten Island: una malla aparte, que el juego lleva de un lado a otro de la bahía.
FX, FZ = polar(0.0, 1250.0)
viga('FE', FERRY, FX - 46.0, FX + 46.0, FZ - 10.0, FZ + 10.0, MAR + 0.5, MAR + 13.0, u_m=92.0, techo=BLANCO_M)
viga('FE', BLANCO_M, FX - 30.0, FX + 30.0, FZ - 7.0, FZ + 7.0, MAR + 13.0, MAR + 16.0, tapas=True)
for s in (-1, 1):
    viga('FE', BLANCO_M, FX + s * 34.0 - 4.0, FX + s * 34.0 + 4.0, FZ - 5.0, FZ + 5.0, MAR + 13.0, MAR + 18.5, tapas=True)
viga('FE', ACERO_O, FX - 3.0, FX + 3.0, FZ - 2.0, FZ + 2.0, MAR + 16.0, MAR + 21.0, tapas=True)
print('BAHÍA', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 4. NUEVA YORK
# ==================================================================================
def tierra (grupo, puntos, techo=CALLES):
    prisma(grupo, MUELLE, puntos, MAR - 1.0, TIERRA, techo=techo, baldosa=20.0)
MANHATTAN = [polar(-6.5, 3300), polar(-3.0, 3050), polar(1.0, 2800), polar(4.6, 2500), polar(8.0, 2450), polar(11.0, 2550), polar(16.0, 2900), polar(24.0, 3600),
             polar(20.0, 7300), polar(-2.0, 7400), polar(-9.0, 6900), polar(-8.5, 4200)]
tierra('FV', MANHATTAN)
BROOKLYN = [polar(8.4, 1350), polar(9.2, 1780), polar(12.6, 1830), polar(17.0, 2150), polar(30.0, 2500), polar(42.0, 1700), polar(26.0, 1000)]
tierra('FV', BROOKLYN)
JERSEY = [polar(-9.5, 3000), polar(-10.3, 4400), polar(-11.0, 6800), polar(-32.0, 6500), polar(-28.0, 2700), polar(-13.0, 2600)]
tierra('FV', JERSEY)

def dentro_de (pts, x, z):
    n, c = len(pts), False
    for i in range(n):
        (x0, z0), (x1, z1) = pts[i], pts[(i + 1) % n]
        if (z0 > z) != (z1 > z) and x < x0 + (z - z0) * (x1 - x0) / (z1 - z0):
            c = not c
    return c

def torre (az, d, ancho, fondo, alto, mat, corona=None, giro=None, baldosa=None):
    """Un rascacielos. `corona`: None (azotea), 'escalones' (art déco),
    'piramide', 'aguja' o 'cuna' (el tejado en cuña)."""
    x, z = polar(az, d)
    g = GIRO_M + random.uniform(-0.03, 0.03) if giro is None else giro
    b = baldosa or (28.0 if mat in VID.values() else 14.0)
    y0 = TIERRA
    if corona == 'escalones':
        cajon('FV', mat, x, z, ancho, fondo, y0, y0 + alto * 0.6, g, b)
        cajon('FV', mat, x, z, ancho * 0.74, fondo * 0.74, y0 + alto * 0.6, y0 + alto * 0.82, g, b)
        cajon('FV', mat, x, z, ancho * 0.46, fondo * 0.46, y0 + alto * 0.82, y0 + alto, g, b)
    elif corona == 'piramide':
        cajon('FV', mat, x, z, ancho, fondo, y0, y0 + alto * 0.84, g, b)
        torno('FV', COBRE, en(x, z, y0 + alto * 0.84, -g + math.pi / 4), [(min(ancho, fondo) * 0.7, 0.0), (0.0, alto * 0.16)], lados=4, tapas=(False, False))
    elif corona == 'aguja':
        cajon('FV', mat, x, z, ancho, fondo, y0, y0 + alto * 0.8, g, b)
        cajon('FV', mat, x, z, ancho * 0.5, fondo * 0.5, y0 + alto * 0.8, y0 + alto * 0.88, g, b)
        barra('FV', CROMO, P(x, z, y0 + alto * 0.88), P(x, z, y0 + alto), 2.0)
    else:
        cajon('FV', mat, x, z, ancho, fondo, y0, y0 + alto, g, b)
        if alto > 60:
            cajon('FV', GRIS_NAVAL, x, z, ancho * 0.5, fondo * 0.5, y0 + alto, y0 + alto + 5.0, g, 14.0)
    return x, z

# --- los que se reconocen ---------------------------------------------------------------------------------
# One World Trade Center: de la base cuadrada a la azotea cuadrada girada, en ocho triángulos de cristal.
wx, wz = polar(-3.6, 3950.0)
cajon('FV', VID['plata'], wx, wz, 62.0, 62.0, TIERRA, TIERRA + 56.0, GIRO_M, 28.0)
c_, s_ = math.cos(GIRO_M), math.sin(GIRO_M)
gir = lambda dx, dz, y: P(wx + dx * c_ - dz * s_, wz + dx * s_ + dz * c_, TIERRA + y)
B = [gir(31, 31, 56), gir(-31, 31, 56), gir(-31, -31, 56), gir(31, -31, 56)]
T_ = [gir(31, 0, 417), gir(0, 31, 417), gir(-31, 0, 417), gir(0, -31, 417)]
eje_w = P(wx, wz, TIERRA + 236)
for i in range(4):
    j = (i + 1) % 4
    for pts in ([B[i], B[j], T_[j]], [T_[j], T_[(j + 1) % 4], B[j]]):
        cc = sum(pts, V((0, 0, 0))) / 3
        cara('FV', VID['azul'], pts, hacia=V((cc.x - eje_w.x, cc.y - eje_w.y, 0)), baldosa=28.0)
cara('FV', AZOTEA, T_, hacia=ARRIBA)
torno('FV', CROMO, en(wx, wz, TIERRA + 417.0), [(18.0, 0.0), (18.0, 6.0), (3.0, 10.0), (1.6, 60.0), (0.5, 124.0)], lados=8, tapas=(False, False))
torre(-2.9, 3800.0, 46.0, 40.0, 329.0, VID['azul'], 'cuna')                               # 3 WTC
torre(-2.5, 3640.0, 44.0, 44.0, 298.0, VID['plata'])                                     # 4 WTC
torre(-4.3, 4080.0, 42.0, 42.0, 226.0, VID['azul'])                                      # 7 WTC
for az, corona_, alto in ((-5.6, 'piramide', 225.0), (-5.15, 'escalones', 197.0), (-4.75, 'piramide', 176.0), (-5.95, 'escalones', 150.0)):   # Brookfield Place, con sus remates de cobre
    torre(az, 3620.0, 44.0, 44.0, alto, OFI['piedra'], corona_)
torre(-1.9, 3460.0, 30.0, 30.0, 290.0, OFI['crema'], 'aguja')                              # 70 Pine
torre(-1.2, 3380.0, 34.0, 34.0, 283.0, OFI['piedra'], 'piramide')                          # 40 Wall Street
torre(-0.2, 3520.0, 42.0, 30.0, 248.0, VID['oscuro'])                                    # 28 Liberty
torre(-2.2, 4250.0, 32.0, 28.0, 241.0, OFI['crema'], 'piramide')                           # el Woolworth
torre(0.6, 4300.0, 34.0, 30.0, 265.0, VID['plata'], 'cuna')                               # 8 Spruce, el de Gehry
torre(0.5, 3120.0, 50.0, 44.0, 196.0, VID['oscuro'])                                     # One New York Plaza
torre(-0.6, 3100.0, 40.0, 30.0, 165.0, VID['verde'])                                     # 17 State Street
torre(1.8, 3050.0, 46.0, 40.0, 180.0, OFI['gris'])                                       # 55 Water
torre(-2.2, 3200.0, 38.0, 34.0, 200.0, OFI['piedra'], 'escalones')
# Midtown, detrás: el Empire State, el Chrysler y los palillos nuevos de la calle 57.
ex, ez = polar(1.35, 5700.0)
cajon('FV', OFI['piedra'], ex, ez, 110.0, 60.0, TIERRA, TIERRA + 26.0, GIRO_M)
cajon('FV', OFI['piedra'], ex, ez, 66.0, 44.0, TIERRA + 26.0, TIERRA + 255.0, GIRO_M)
cajon('FV', OFI['piedra'], ex, ez, 50.0, 36.0, TIERRA + 255.0, TIERRA + 300.0, GIRO_M)
cajon('FV', OFI['piedra'], ex, ez, 36.0, 28.0, TIERRA + 300.0, TIERRA + 331.0, GIRO_M)
torno('FV', CROMO, en(ex, ez, TIERRA + 331.0), [(11.0, 0.0), (9.0, 30.0), (5.0, 42.0), (2.4, 50.0), (1.0, 112.0)], lados=8, tapas=(False, False))
hx, hz = polar(2.75, 6100.0)
cajon('FV', OFI['gris'], hx, hz, 40.0, 40.0, TIERRA, TIERRA + 205.0, GIRO_M)
torno('FV', CROMO, en(hx, hz, TIERRA + 205.0, -GIRO_M + math.pi / 8), [(21.0, 0.0), (18.0, 16.0), (14.5, 30.0), (10.5, 42.0), (6.5, 52.0), (2.5, 62.0), (0.6, 114.0)], lados=8, tapas=(False, False))   # el Chrysler
torre(-0.7, 6500.0, 30.0, 30.0, 426.0, VID['plata'])                                     # 432 Park
torre(-1.6, 6700.0, 34.0, 30.0, 472.0, VID['azul'], 'aguja')                              # Central Park Tower
torre(0.3, 6250.0, 44.0, 40.0, 427.0, VID['azul'], 'aguja')                               # One Vanderbilt
torre(3.9, 5900.0, 46.0, 40.0, 366.0, VID['azul'], 'aguja')                               # el del Bank of America
torre(-2.6, 6000.0, 60.0, 50.0, 387.0, VID['plata'], 'cuna')                              # Hudson Yards
torre(5.2, 6400.0, 36.0, 36.0, 259.0, VID['verde'])                                      # el de Naciones Unidas, de canto
torre(9.4, 2640.0, 36.0, 30.0, 258.0, VID['verde'])                                      # One Manhattan Square, junto al puente
torre(-10.6, 3500.0, 44.0, 40.0, 238.0, VID['verde'], 'piramide')                         # Jersey City: el de Goldman Sachs
# 'cuna': el remate en cuña se queda en azotea (de lejos no se distingue); se apunta por si se hace.

# --- el relleno: el resto de la ciudad -----------------------------------------------------------------------
n_t = 0
for _ in range(520):
    az, d = random.uniform(-9.0, 22.0), random.uniform(2500.0, 7000.0)
    x, z = polar(az, d)
    if not dentro_de(MANHATTAN, x, z) or not dentro_de(MANHATTAN, *polar(az, d - 70.0)):
        continue
    sur = d < 3900 and az < 4.0                                                      # el distrito financiero
    medio = d > 5300                                                                 # Midtown
    if sur:
        alto, ancho = random.uniform(70.0, 215.0), random.uniform(26.0, 46.0)
    elif medio:
        alto, ancho = random.uniform(60.0, 250.0) if abs(az - 1.0) < 6.0 else random.uniform(30.0, 110.0), random.uniform(26.0, 50.0)
    else:
        alto, ancho = random.uniform(16.0, 58.0), random.uniform(40.0, 90.0)        # el valle entre los dos, de ladrillo
    mat = random.choice(LAD) if alto < 60 else random.choice(list(VID.values()) + list(OFI.values()) + list(OFI.values()))
    corona_ = random.choice((None, None, None, 'escalones', 'piramide')) if alto > 120 and mat in OFI.values() else None
    torre(az, d, ancho, ancho * random.uniform(0.7, 1.2), alto, mat, corona_)
    n_t += 1
for _ in range(60):                                                                  # Brooklyn y Jersey
    az, d = random.choice(((random.uniform(9.0, 30.0), random.uniform(1500.0, 2400.0)), (random.uniform(-30.0, -9.6), random.uniform(2800.0, 6000.0))))
    x, z = polar(az, d)
    if not (dentro_de(BROOKLYN, x, z) or dentro_de(JERSEY, x, z)):
        continue
    alto = random.uniform(14.0, 40.0) if random.random() < 0.6 else random.uniform(60.0, 190.0)
    torre(az, d, random.uniform(30.0, 70.0), random.uniform(30.0, 60.0), alto, random.choice(LAD) if alto < 50 else random.choice(list(VID.values())), giro=random.uniform(0, 1.5))
    n_t += 1
print('TORRES', n_t)
# Battery Park, en la punta, con sus árboles.
for _ in range(40):
    az, d = random.uniform(-5.6, 0.6), random.uniform(2900.0, 3340.0)
    x, z = polar(az, d)
    if dentro_de(MANHATTAN, x, z) and dentro_de(MANHATTAN, *polar(az, d - 40.0)):
        copa('FV', random.choice(ARBOL), x, z, TIERRA + 9.0, random.uniform(9.0, 14.0), random.uniform(7.0, 10.0), sub=1)
# Ellis Island, a babor: el edificio de ladrillo con sus cuatro torres de cobre.
ix, iz = polar(-7.6, 1500.0)
tierra('FV', [(ix - 130, iz + 50), (ix + 130, iz + 50), (ix + 130, iz - 60), (ix - 130, iz - 60)], CESPED)
cajon('FV', LAD[0], ix, iz, 120.0, 46.0, TIERRA, TIERRA + 20.0)
for dx in (-22.0, 22.0):
    for dz in (-16.0, 16.0):
        cajon('FV', LAD[0], ix + dx, iz + dz, 12.0, 12.0, TIERRA + 20.0, TIERRA + 34.0)
        elipsoide('FV', COBRE, en(ix + dx, iz + dz, TIERRA + 34.0), (7.0, 7.0, 8.0))

# --- los puentes ---------------------------------------------------------------------------------------------
def colgante (p1, p2, alto, ancho, y_tab, piedra=None, acero=AZUL_P, cabo=260.0):
    """Un puente colgante entre dos torres (p1 la de cerca). De piedra, con dos
    arcos apuntados por torre (el de Brooklyn), o de acero (el de Manhattan)."""
    (x1, z1), (x2, z2) = p1, p2
    L_ = math.hypot(x2 - x1, z2 - z1)
    ux, uz = (x2 - x1) / L_, (z2 - z1) / L_
    nx, nz = -uz, ux
    giro = math.atan2(-ux, uz)                                                       # el fondo del cajón, a lo largo del puente
    pt = lambda t, lado, y: P(x1 + ux * t + nx * lado, z1 + uz * t + nz * lado, MAR + y)
    for t in (0.0, L_):
        cx, cz = x1 + ux * t, z1 + uz * t
        if piedra:
            for lado, w in ((-ancho * 0.5, ancho * 0.2), (0.0, ancho * 0.16), (ancho * 0.5, ancho * 0.2)):   # tres machones y, entre ellos, los dos arcos
                cajon('FV', piedra, cx + nx * lado, cz + nz * lado, w, 9.0, MAR - 1.0, MAR + alto - 10.0, giro, 8.0, techo=piedra)
            cajon('FV', piedra, cx, cz, ancho * 1.24, 9.6, MAR + alto - 16.0, MAR + alto, giro, 8.0, techo=piedra)
            cajon('FV', piedra, cx, cz, ancho * 1.3, 10.4, MAR - 1.0, MAR + y_tab - 4.0, giro, 8.0, techo=piedra)
        else:
            for lado in (-ancho * 0.5, ancho * 0.5):
                cajon('FV', acero, cx + nx * lado, cz + nz * lado, 5.0, 7.0, MAR - 1.0, MAR + alto, giro, 8.0, techo=acero)
            for y in (y_tab + 14.0, alto - 22.0, alto - 4.0):
                cajon('FV', acero, cx, cz, ancho, 5.0, MAR + y - 3.0, MAR + y + 3.0, giro, 8.0, techo=acero)
            for lado in (-ancho * 0.5, ancho * 0.5):
                elipsoide('FV', acero, en(cx + nx * lado, cz + nz * lado, MAR + alto + 2.0), (4.0, 4.0, 5.0))
    # El tablero, de anclaje a anclaje, y los estribos de piedra.
    xm, zm = x1 + ux * L_ / 2, z1 + uz * L_ / 2
    cajon('FV', acero, xm, zm, ancho, L_ + 2 * cabo, MAR + y_tab - 3.0, MAR + y_tab, giro, 8.0, techo=CALLES)
    for t in (-cabo, L_ + cabo):
        cajon('FV', piedra or MUELLE, x1 + ux * t, z1 + uz * t, ancho * 1.2, 50.0, MAR - 1.0, MAR + y_tab, giro, 8.0, techo=piedra or MUELLE)
    # Los cables: la catenaria del vano y las dos caídas a los anclajes; y los tirantes en abanico.
    for lado in (-ancho * 0.5, ancho * 0.5):
        n = 12
        for i in range(n):
            ta, tb = L_ * i / n, L_ * (i + 1) / n
            ya = y_tab + 4.0 + (alto - 4.0 - y_tab - 4.0) * (2 * ta / L_ - 1) ** 2
            yb = y_tab + 4.0 + (alto - 4.0 - y_tab - 4.0) * (2 * tb / L_ - 1) ** 2
            barra('FV', acero, pt(ta, lado, ya), pt(tb, lado, yb), 1.3)
            if i % 2 == 0 and 0 < i < n:
                barra('FV', acero, pt(ta, lado, ya), pt(ta, lado, y_tab), 0.6)
        barra('FV', acero, pt(0.0, lado, alto - 4.0), pt(-cabo, lado, y_tab + 2.0), 1.3)
        barra('FV', acero, pt(L_, lado, alto - 4.0), pt(L_ + cabo, lado, y_tab + 2.0), 1.3)
        if piedra:
            for t0 in (0.0, L_):
                for k in (1, 2, 3):
                    for sentido in (-1, 1):
                        barra('FV', acero, pt(t0, lado, alto - 8.0), pt(t0 + sentido * k * 34.0, lado, y_tab), 0.5)
colgante(polar(7.8, 1850.0), polar(4.6, 2260.0), 84.0, 26.0, 41.0, piedra=PIEDRA_P, acero=material('acero-puente', color=(0.2, 0.16, 0.13), rug=0.8))   # el de Brooklyn
colgante(polar(11.2, 1900.0), polar(8.3, 2330.0), 102.0, 30.0, 44.0)                                                                           # el de Manhattan

# --- la nodriza, parada sobre la ciudad ---------------------------------------------------------------------
nx_, nz_ = polar(5.6, 5200.0)
Y_N = 470.0
torno('FV', NODRIZA, en(nx_, nz_, Y_N), [(0.0, -22.0), (90.0, -14.0), (150.0, 0.0), (120.0, 12.0), (60.0, 24.0), (0.0, 30.0)], lados=20, tapas=(False, False))
for i in range(14):
    a_ = 2 * math.pi * i / 14
    elipsoide('EP', VERDE, en(nx_ + 120 * math.cos(a_), nz_ + 120 * math.sin(a_), Y_N - 9.0), (7.0, 7.0, 4.0))
torno('HZ', HAZ, en(nx_, nz_, TIERRA + 60.0), [(70.0, 0.0), (26.0, Y_N - TIERRA - 80.0)], lados=12, tapas=(False, False))

cupula('CP', CIELO, 7600.0, 0.0, -60.0)
print('CIUDAD', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'D': ('luzD-barco', 'atlas', 'luzD'),
        'AS': ('vert-ascensor', 'vert', None),
        'EV': ('vert-cerca', 'vert', None),
        'JV': ('vert-cazas', 'vert', None),
        'XV': ('vert-extra', 'vert', None),
        'LV': ('vert-estatua', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'FV': ('vert-lejos', 'vert', None),
        'FE': ('vert-ferry', 'vert', None),
        'HZ': ('plano-haz', 'plano', None),
        'AG': ('plano-agua', 'plano', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-portaaviones', ['P', 'D', 'AS', 'EV', 'JV', 'XV', 'LV', 'EP', 'FV', 'FE', 'HZ', 'AG', 'CP'])],
    # Atardecer, como en Atenas y Gizeh: está en el COLOR del sol. Muy naranja y fuerte, cielo flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.58, 0.26), sol_fuerza=7.5, sol_ancho=4.0, cielo_fuerza=0.3, cielo_altura=6, cielo_giro=200,
    escala=0.9, satura=1.0, no_alumbran=('CP', 'AG', 'HZ'), suaves=('JV', 'XV', 'LV'), fundir=True)
