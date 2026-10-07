# Heraclión: el patio central del palacio de Cnosos, con el laberinto al fondo (06/10/2026).
#   blender -b -P herramientas/blender/lugar_cnosos.py              (entero)
#   blender -b -P herramientas/blender/lugar_cnosos.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_cnosos.py -- --reusar  (retocar la luz)
#
# Isidro eligió para Heraclión «lo más famoso» (el palacio de Cnosos, a cinco
# kilómetros de la ciudad), los alienz SALEN DEL LABERINTO, por la MAÑANA TEMPRANO
# y con llegada larga. Misma receta que los demás lugares de luz horneada.
#
# Cómo está puesto. Se juega en el patio central mirando al NORTE, con el sol
# recién salido a la derecha y algo a la espalda (sombras largas hacia la
# izquierda):
#   · Al FONDO, la boca del laberinto: una rampa ancha que baja a los sótanos
#     del palacio (lo excavado queda por debajo del patio, como en el de verdad)
#     hasta una puerta a oscuras. Encima de la puerta, lo que hace de Cnosos
#     Cnosos: una galería reconstruida con sus columnas ROJAS que se estrechan
#     hacia abajo, el fresco del salto del toro, el friso de discos y los cuernos
#     de la consagración en la cornisa. Las alturas están echadas para el móvil:
#     arriba, el marcador solo deja libre el centro, y ahí caen el fresco (entre
#     60 y 83 px) y la puerta (de 115 a 156), con el rótulo de la oleada sobre el
#     paño de muro que queda entre los dos.
#   · Los alienz nacen dentro, a oscuras, y suben la rampa (`entrada` y `hueco`
#     en el juego, con estos mismos números). LA MADRE también: por eso la
#     puerta no lleva pilares.
#   · A los lados del patio, lo que cabe en la cuña que ve el móvil: tinajas
#     (píthoi), columnas, los cuernos grandes, muretes de ruina. A la derecha, la
#     base alien dentro de una kulura (un silo redondo de piedra).
#   · Solo en el vuelo: el palacio entero como lo que es, un LABERINTO de muros a
#     medio caer, con sus almacenes, el pórtico sur, el ala del trono y la gran
#     escalera; el cerro con pinos y cipreses, los olivares y viñas del valle, el
#     monte Juktas al sur, y al norte Heraclión y el mar.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.78, 0.47, 0.41)                 # recién salido: del este-sureste, a 28°
iniciar('cnosos', 1900, eje=(0.0, -40.0), encendidas=0.0, reflejo=(0.2, 0.16, 0.12))

PATIO = 12.6                             # media anchura del patio central
ZANJA = 7.6                              # media anchura de la rampa del laberinto
Z_BOCA, Z_PIE = -62.0, -80.0             # donde empieza a bajar y donde llega abajo
Z_ALA = -82.0                            # la cara del ala norte (la puerta y, encima, la galería)
HONDO = 3.6
Y_GAL = 3.4                              # el suelo de la galería
BASE = (12.6, -44.0)                     # con el brocal de 5,15 de radio roza el pasillo sin pisarlo; más afuera, el centro de la base cae en el borde de la pantalla
VALLE_Y = -13.0                          # el fondo del valle, alrededor del cerro

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def voronoi (Hh, W, celda):
    """Losas irregulares: una rejilla con una semilla movida por celda. Devuelve,
    por píxel, cuánto le falta para llegar a la junta (0 en la junta) y un número
    fijo por losa (para darle su tono, o para quitarla entera)."""
    ny, nx = Hh // celda + 2, W // celda + 2
    jy, jx = E.rng.random((ny + 2, nx + 2)), E.rng.random((ny + 2, nx + 2))
    tono = E.rng.random((ny + 2, nx + 2)).astype(np.float32)
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    cy, cx = (yy // celda).astype(int), (xx // celda).astype(int)
    d1 = np.full((Hh, W), 1e9, np.float32)
    d2 = d1.copy()
    t1 = np.zeros((Hh, W), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            iy, ix = cy + dy + 1, cx + dx + 1
            d = np.hypot(yy - (cy + dy + jy[iy, ix]) * celda, xx - (cx + dx + jx[iy, ix]) * celda).astype(np.float32)
            mejor = d < d1
            d2 = np.where(mejor, d1, np.minimum(d2, d))
            t1 = np.where(mejor, tono[iy, ix], t1)
            d1 = np.where(mejor, d, d1)
    return d2 - d1, t1

PX0, PX1, PZ0, PZ1 = -9.2, 9.2, Z_BOCA, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)             # píxeles por metro
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """El patio central: losas irregulares de caliza y de yeso, gastadas, con la
    tierra apisonada donde faltan (más hacia los lados), hierba en las juntas, y
    cerca de la boca del laberinto las raíces negras que salen de él."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    caliza = tejar(foto('rock_ground', 256, 0xd3c6a8, 0.5))
    yeso = tejar(foto('marble_01', 256, 0xddd5c4, 0.4))
    tierra = tejar(foto('dry_ground_rocks', 256, 0xc6aa82, 0.36))
    grava = tejar(foto('gravel_stones', 256, 0xc2b08e, 0.36))
    falta_junta, tono = voronoi(PH_, PW, 23)
    a = caliza * (0.84 + 0.26 * tono[..., None])
    palidas = (tono * 7.3 % 1 > 0.7)[..., None]                       # una de cada tres, de yeso
    a = np.where(palidas, yeso * (0.9 + 0.14 * tono[..., None]), a)
    a *= 1 - 0.5 * np.clip(1 - falta_junta / 1.9, 0, 1)[..., None]      # las juntas, con su tierra
    a *= 1 + 0.07 * np.clip(1 - np.abs(falta_junta - 3.6) / 1.6, 0, 1)[..., None]   # y el canto de cada losa, algo más claro
    # Donde faltan losas ENTERAS: más cuanto más lejos del eje.
    xs = np.abs(np.linspace(PX0, PX1, PW, dtype=np.float32))[None, :]
    quitar = nube(PH_, PW, 24, 6) + 0.3 * (tono * 3.1 % 1 - 0.5) + 0.2 * np.clip((xs - 3.5) / 5.5, 0, 1)
    falta = (quitar > 0.72)[..., None]
    g = np.clip((nube(PH_, PW, 60, 16) - 0.4) / 0.25, 0, 1)[..., None]
    a = np.where(falta, tierra * (1 - g) + grava * g, a)
    a *= (0.93 + 0.14 * nube(PH_, PW, 14, 4))[..., None]
    # Grietas en las losas y piedrecillas sueltas.
    for _ in range(70):
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(14, 60)):
            ang += random.uniform(-0.45, 0.45)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.66
    for _ in range(1300):
        c, f = random.randrange(2, PW - 4), random.randrange(2, PH_ - 4)
        s = random.choice((1, 1, 2))
        a[f + 1:f + 1 + s, c + 1:c + 2 + s] *= 0.7
        a[f:f + s, c:c + 1 + s] = a[f:f + s, c:c + 1 + s] * 0.4 + np.array((0.8, 0.75, 0.64), np.float32) * random.uniform(0.5, 0.65)
    # Hierba seca en las juntas, hacia los lados.
    for _ in range(520):
        x = random.choice((-1, 1)) * random.uniform(3.0, 9.0)
        c, f = a_px(x, random.uniform(PZ0, PZ1))
        if 2 < c < PW - 3 and 2 < f < PH_ - 3 and falta_junta[f, c] < 5:
            a[f - 1:f + 2, c - 1:c + 2] = a[f - 1:f + 2, c - 1:c + 2] * 0.45 + np.array(random.choice(((0.42, 0.44, 0.2), (0.55, 0.5, 0.26), (0.36, 0.4, 0.2))), np.float32) * 0.55
    def mancha (x, z, r, k, forma=1.0):
        c, f = a_px(x, z)
        rc, rf = int(r * KX * forma) + 2, int(r * KZ) + 2
        y0, y1, x0, x1 = max(0, f - rf), min(PH_, f + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((xx - c) / (r * KX * forma), (yy - f) / (r * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r in ((-5.4, -18.0, 1.4), (4.6, -36.0, 1.6), (-3.0, -52.0, 1.2)):     # la guerra: quemaduras
        mancha(x, z, r * 1.5, 0.84, 1.1)
        mancha(x, z, r, 0.5)
        mancha(x + 0.2, z - 0.1, r * 0.5, 0.6, 1.2)
    # Las raíces del laberinto: salen de la rampa y se van afinando patio adentro.
    for k in range(11):
        x, z = -6.6 + k * 1.32 + random.uniform(-0.4, 0.4), PZ0
        ang = math.pi / 2 + random.uniform(-0.5, 0.5)                   # hacia la cámara (z creciente)
        largo = random.uniform(3.5, 11.0)
        pasos = int(largo * KZ)
        for i in range(pasos):
            ang += random.uniform(-0.12, 0.12) + 0.02 * (math.pi / 2 - ang)
            x += math.cos(ang) / KX; z += math.sin(ang) / KZ
            grosor = max(1, int(4.5 * (1 - i / pasos) ** 0.7))
            c, f = a_px(x, z)
            if 3 < c < PW - 4 and 0 <= f < PH_ - 1:
                a[f, c - grosor:c + grosor + 1] = np.array((0.06, 0.09, 0.07), np.float32) * (1 + 0.5 * random.random())
                a[f, c] = (0.1, 0.3, 0.16)
                if c - grosor - 1 > 0:
                    a[f, c - grosor - 1] *= 0.7; a[f, min(PW - 1, c + grosor + 1)] *= 0.7
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_suelo ():
    """El suelo del resto del cerro: tierra apisonada y grava, con alguna losa suelta."""
    n = 512
    tierra = np.tile(foto('dry_ground_rocks', 256, 0xb99a72, 0.5), (2, 2, 1))
    grava = np.tile(foto('gravel_stones', 256, 0xb8a685, 0.45), (2, 2, 1))
    g = np.clip((nube(n, n, 9, 9) - 0.4) / 0.25, 0, 1)[..., None]
    a = (tierra * (1 - g) + grava * g) * 0.95
    falta_junta, tono = voronoi(n, n, 40)
    losa = ((tono * 5.7 % 1 > 0.8) & (falta_junta > 3.0))[..., None]
    a = np.where(losa, np.tile(foto('rock_ground', 256, 0xcdbf9f, 0.5), (2, 2, 1)) * (0.86 + 0.2 * tono[..., None]), a)
    return guardar('suelo', np.clip(a, 0, 1), 86)

def tex_rampa ():
    """La rampa del laberinto: peldaños anchos de losa, comidos, con la resina en medio."""
    a = np.tile(foto('rock_ground', 128, 0xcabd9f, 0.5), (2, 2, 1))
    for f in range(0, 256, 32):
        a[f:f + 3] *= 0.5
        a[f + 3:f + 7] = np.clip(a[f + 3:f + 7] * 1.12, 0, 1)
    a *= (0.86 + 0.22 * nube(256, 256, 6, 6))[..., None]
    v = nube(256, 256, 3, 16)
    a = np.where((v > 0.78)[..., None], np.array((0.07, 0.1, 0.08), np.float32), a)
    return guardar('rampa', np.clip(a, 0, 1), 86)

def lienzo_dibujo (Hh, W, fondo):
    """Un lienzo con utilidades para pintar frescos: elipses, polígonos y trazos."""
    a = lienzo(Hh, W, fondo)
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    def elipse (cx, cy, rx, ry, color, giro=0.0):
        c, s = math.cos(giro), math.sin(giro)
        u, v = (xx - cx) * c + (yy - cy) * s, -(xx - cx) * s + (yy - cy) * c
        a[(u / rx) ** 2 + (v / ry) ** 2 < 1] = color
    def poligono (pts, color):
        dentro = np.zeros((Hh, W), bool)
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if y0 == y1:
                continue
            cruza = ((yy >= min(y0, y1)) & (yy < max(y0, y1))) & (xx < x0 + (yy - y0) * (x1 - x0) / (y1 - y0))
            dentro ^= cruza
        a[dentro] = color
    def trazo (pts, color, grosor=2.0):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            lx, ly = x1 - x0, y1 - y0
            t = np.clip(((xx - x0) * lx + (yy - y0) * ly) / max(1e-6, lx * lx + ly * ly), 0, 1)
            a[np.hypot(xx - x0 - t * lx, yy - y0 - t * ly) < grosor] = color
    return a, elipse, poligono, trazo

def cenefa (a, f0, f1, colores, paso=14):
    """Una banda de «lenguas» de colores montadas unas sobre otras, como el marco del salto del toro."""
    W = a.shape[1]
    yy, xx = np.mgrid[f0:f1, 0:W].astype(np.float32)
    a[f0:f1] = (0.9, 0.86, 0.74)
    for k, cx in enumerate(range(-paso, W + paso, paso)):
        dentro = ((xx - cx) / (paso * 0.85)) ** 2 + ((yy - f0) / (f1 - f0 - 1)) ** 2 < 1
        a[f0:f1][dentro] = colores[k % len(colores)]
    a[f0:f0 + 2] = (0.1, 0.1, 0.12); a[f1 - 2:f1] = (0.1, 0.1, 0.12)

def tex_toro ():
    """El fresco del salto del toro: el toro pío al galope tendido sobre fondo azul,
    los tres saltadores (dos blancos, uno rojo) y su marco de lenguas de colores."""
    W, Hh = 512, 256
    AZUL, PARDO, CREMA = (0.36, 0.52, 0.72), (0.56, 0.3, 0.16), (0.93, 0.89, 0.78)
    a, elipse, poligono, trazo = lienzo_dibujo(Hh, W, AZUL)
    a += (nube(Hh, W, 9, 18) - 0.5)[..., None] * 0.1                    # el enlucido, desigual
    # el toro, mirando a la izquierda
    elipse(268, 138, 128, 44, PARDO, 0.05)                              # el cuerpo
    elipse(160, 118, 48, 40, PARDO, -0.5)                               # la cruz y el cuello
    elipse(112, 138, 34, 20, PARDO, 0.35)                               # la cabeza, gacha
    poligono([(160, 160), (198, 168), (120, 214), (64, 220), (60, 211), (108, 200)], PARDO)       # manos, tendidas
    poligono([(350, 150), (392, 150), (462, 204), (490, 206), (488, 216), (446, 216)], PARDO)     # patas, atrás
    trazo([(386, 116), (424, 86), (452, 58), (470, 60)], PARDO, 4.0)    # el rabo, en alto
    for cx, cy, rx, ry, g in ((250, 128, 34, 20, 0.3), (320, 150, 26, 16, -0.2), (190, 126, 18, 12, 0.6), (366, 128, 16, 10, 0.1), (286, 164, 20, 9, 0.0)):
        elipse(cx, cy, rx, ry, CREMA, g)                                # las manchas de la capa
    trazo([(96, 124), (70, 104), (54, 78), (62, 60)], (0.95, 0.92, 0.8), 3.2)   # los cuernos
    trazo([(104, 120), (86, 96), (80, 74)], (0.86, 0.82, 0.7), 2.6)
    elipse(84, 150, 15, 10, (0.82, 0.66, 0.54), 0.35)                   # el morro, más claro
    poligono([(126, 112), (140, 98), (146, 116)], PARDO)                # la oreja
    elipse(104, 132, 4, 3, (0.08, 0.06, 0.05))                          # el ojo
    def saltador (x, y, color, postura):
        pelo = (0.08, 0.07, 0.07)
        if postura == 'agarra':                                         # de pie, cogido a los cuernos
            trazo([(x, y + 44), (x + 4, y + 18), (x + 2, y - 4)], color, 4.4)
            trazo([(x + 2, y), (x + 22, y - 12), (x + 34, y - 26)], color, 2.6)
            trazo([(x, y + 44), (x - 8, y + 70)], color, 3.2); trazo([(x, y + 44), (x + 10, y + 70)], color, 3.2)
            elipse(x + 1, y - 12, 6, 7, color); trazo([(x - 4, y - 16), (x - 10, y + 6)], pelo, 2.2)
        elif postura == 'salta':                                        # en el aire, de espaldas sobre el lomo
            trazo([(x - 34, y + 6), (x - 10, y - 12), (x + 16, y - 10), (x + 40, y + 8)], color, 4.2)
            trazo([(x + 40, y + 8), (x + 46, y + 30)], color, 3.0); trazo([(x - 34, y + 6), (x - 56, y - 6)], color, 3.0)
            trazo([(x - 34, y + 6), (x - 52, y + 20)], color, 3.0)
            elipse(x + 46, y + 2, 6, 6, color); trazo([(x + 50, y - 2), (x + 62, y + 12)], pelo, 2.2)
        else:                                                           # detrás, con los brazos tendidos
            trazo([(x, y + 40), (x - 2, y + 14), (x - 4, y - 6)], color, 4.4)
            trazo([(x - 4, y), (x - 26, y - 6), (x - 40, y - 10)], color, 2.6); trazo([(x - 4, y + 4), (x - 24, y + 4)], color, 2.6)
            trazo([(x, y + 40), (x - 6, y + 66)], color, 3.2); trazo([(x, y + 40), (x + 8, y + 66)], color, 3.2)
            elipse(x - 5, y - 14, 6, 7, color); trazo([(x, y - 18), (x + 6, y + 6)], pelo, 2.2)
    saltador(38, 122, (0.95, 0.93, 0.86), 'agarra')
    saltador(276, 66, (0.62, 0.25, 0.14), 'salta')
    saltador(476, 128, (0.95, 0.93, 0.86), 'recibe')
    lenguas = [(0.2, 0.34, 0.58), (0.8, 0.6, 0.22), (0.92, 0.9, 0.82), (0.12, 0.12, 0.14), (0.62, 0.2, 0.14)]
    cenefa(a, 0, 26, lenguas); cenefa(a, Hh - 26, Hh, lenguas[::-1])
    a[:, :10] = (0.12, 0.12, 0.14); a[:, W - 10:] = (0.12, 0.12, 0.14)
    a *= (0.9 + 0.16 * nube(Hh, W, 5, 10))[..., None]                   # tres mil quinientos años
    return guardar('fresco-toro', np.clip(a, 0, 1), 90)

def tex_escudos ():
    """El fresco de los escudos: los grandes escudos en ocho de piel de vaca, bajo una greca de espirales."""
    W, Hh = 256, 256
    a, elipse, poligono, trazo = lienzo_dibujo(Hh, W, (0.93, 0.89, 0.78))
    for cx in (48, 128, 208):
        for (cy, rx, ry) in ((104, 26, 30), (166, 34, 44)):
            elipse(cx, cy, rx + 3, ry + 3, (0.12, 0.1, 0.1)); elipse(cx, cy, rx, ry, (0.92, 0.88, 0.8))
        for _ in range(14):                                             # las manchas de la piel
            elipse(cx + random.uniform(-24, 24), random.uniform(86, 196), random.uniform(3, 8), random.uniform(3, 7), (0.2, 0.16, 0.14))
        a[78:212, cx - 2:cx + 3] = (0.56, 0.3, 0.16)
    a[:60] = (0.2, 0.34, 0.58)
    for cx in range(16, W, 32):                                         # la espiral corrida
        elipse(cx, 30, 12, 12, (0.93, 0.9, 0.8)); elipse(cx, 30, 8, 8, (0.2, 0.34, 0.58)); elipse(cx + 2, 30, 3.5, 3.5, (0.93, 0.9, 0.8))
        trazo([(cx + 10, 22), (cx + 22, 38)], (0.93, 0.9, 0.8), 1.6)
    a[56:62] = (0.62, 0.2, 0.14); a[0:5] = (0.62, 0.2, 0.14)
    a[222:] = (0.62, 0.2, 0.14); a[216:222] = (0.12, 0.1, 0.1)
    a *= (0.9 + 0.16 * nube(Hh, W, 6, 6))[..., None]
    return guardar('fresco-escudos', np.clip(a, 0, 1), 88)

def tex_espirales ():
    """La greca de espirales corridas del dintel: blanco sobre azul, entre dos filetes rojos."""
    a, elipse, poligono, trazo = lienzo_dibujo(64, 128, (0.2, 0.34, 0.58))
    for cx in (32, 96):
        elipse(cx, 32, 19, 19, (0.93, 0.9, 0.8)); elipse(cx, 32, 13, 13, (0.2, 0.34, 0.58)); elipse(cx + 4, 32, 6, 6, (0.93, 0.9, 0.8))
        trazo([(cx + 17, 20), (cx + 47, 44)], (0.93, 0.9, 0.8), 2.4)
    a[:8] = (0.62, 0.2, 0.14); a[56:] = (0.62, 0.2, 0.14)
    a *= (0.9 + 0.14 * nube(64, 128, 3, 6))[..., None]
    return guardar('espirales', np.clip(a, 0, 1), 88)

def tex_discos ():
    """El friso de la cornisa: los discos (las cabezas de las vigas del techo), uno por baldosa."""
    a, elipse, poligono, trazo = lienzo_dibujo(64, 64, (0.9, 0.84, 0.68))
    elipse(32, 34, 21, 21, (0.1, 0.09, 0.09)); elipse(32, 34, 17, 17, (0.58, 0.2, 0.13)); elipse(32, 34, 6, 6, (0.9, 0.84, 0.68))
    a[:8] = (0.2, 0.34, 0.58); a[8:11] = (0.1, 0.09, 0.09); a[60:] = (0.1, 0.09, 0.09)
    return guardar('discos', np.clip(a, 0, 1), 88)

def tex_pithos ():
    """La tinaja: barro cocido con sus cordones en relieve y las ondas pintadas."""
    a = np.tile(foto('painted_plaster_wall', 128, 0xb8794e, 0.5), (2, 2, 1))
    xx = np.arange(256)
    for f in (36, 92, 148, 204):
        a[f:f + 9] *= 0.72
        a[f + 9:f + 12] = np.clip(a[f + 9:f + 12] * 1.14, 0, 1)
        onda = (f + 26 + 9 * np.sin(xx / 256 * 2 * np.pi * 8)).astype(int)
        for k in range(3):
            a[np.clip(onda + k, 0, 255), xx] *= 0.6
    a *= (0.85 + 0.25 * nube(256, 256, 4, 5))[..., None]
    return guardar('pithos', np.clip(a, 0, 1), 86)

def tex_zocalo ():
    """El zócalo pintado de la galería: bandas de colores imitando piedra veteada."""
    a = lienzo(64, 128, (0.9, 0.84, 0.68))
    a[0:14] = (0.62, 0.2, 0.14); a[14:18] = (0.1, 0.09, 0.09); a[18:40] = (0.84, 0.66, 0.3); a[40:44] = (0.1, 0.09, 0.09); a[44:64] = (0.2, 0.34, 0.58)
    a *= (0.86 + 0.24 * nube(64, 128, 4, 9))[..., None]
    return guardar('zocalo', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=1.0)
SUELO = material('suelo', tex_suelo(), rug=1.0)
RAMPA = material('rampa', tex_rampa(), rug=1.0)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xd6c59c, 0.6), rug=0.9)            # la caliza dorada, en sillares
MAMPUESTO = material('mampuesto', de_polyhaven('old_stone_wall', 512, 0xd2c4a0, 0.6), rug=0.95)
ENLUCIDO = material('enlucido', de_polyhaven('plastered_stone_wall', 512, 0xe2d2a8, 0.3), rug=0.9)
YESO = material('yeso', de_polyhaven('marble_01', 512, 0xdcd4c2, 0.4), rug=0.8)
PITHOS = material('pithos', tex_pithos(), rug=0.9)
TORO = material('fresco-toro', tex_toro(), rug=0.9)
ESCUDOS = material('fresco-escudos', tex_escudos(), rug=0.9)
ESPIRALES = material('espirales', tex_espirales(), rug=0.9)
DISCOS = material('discos', tex_discos(), rug=0.9)
ZOCALO = material('zocalo', tex_zocalo(), rug=0.9)
TIERRA_ROJA = material('tierra-roja', de_polyhaven('dry_ground_rocks', 512, 0xb08258, 0.5), rug=1.0)      # la tierra de Creta
HIERBA = material('hierba', de_polyhaven('sparse_grass', 512, 0x9a9462, 0.5), rug=1.0)
CAMPO = material('campo', de_polyhaven('sparse_grass', 512, 0x8f9258, 0.5), rug=1.0)
ASFALTO = material('asfalto', de_polyhaven('asphalt_02', 512, 0x6a6a6c, 0.5), rug=0.95)
AZOTEA = material('azotea', tex_azotea((0.8, 0.78, 0.72)))
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xb0603c, contraste=0.9), rug=0.9)
# OJO: los colores lisos van en LINEAL.
ROJO = material('rojo-minoico', color=(0.42, 0.045, 0.03), rug=0.7)
NEGRO_C = material('negro-capitel', color=(0.018, 0.018, 0.022), rug=0.6)
VIGA = material('viga-ocre', color=(0.4, 0.27, 0.12), rug=0.8)                                              # las «maderas» de Evans, pintadas
MADERA = material('madera', color=(0.14, 0.07, 0.035), rug=0.9)
BRONCE = material('bronce', color=(0.42, 0.26, 0.07), rug=0.4)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BLANCO = material('blanco', color=(0.8, 0.79, 0.75), rug=0.7)
PINOS = [material(f'pino-{i}', color=c, rug=1.0) for i, c in enumerate([(0.045, 0.1, 0.035), (0.06, 0.12, 0.04), (0.035, 0.08, 0.035)])]
OLIVOS = [material(f'olivo-{i}', color=c, rug=1.0) for i, c in enumerate([(0.13, 0.17, 0.09), (0.16, 0.2, 0.1), (0.1, 0.14, 0.075)])]
CIPRES = material('cipres', color=(0.025, 0.055, 0.03), rug=1.0)
VIÑA = material('vina', color=(0.1, 0.2, 0.05), rug=1.0)
TRONCO = material('tronco', color=(0.09, 0.065, 0.045))
MONTE_L = material('monte-lejos', color=(0.3, 0.27, 0.34), rug=1.0)                                        # las sierras, malva a esa hora
MONTE_C = material('monte-cerca', de_polyhaven('sparse_grass', 512, 0x8a8a5c, 0.5), rug=1.0)
MAR = material('mar', color=(0.5, 0.62, 0.76), rug=0.2)        # sin luz ('plano'): el color va en la base, que con emisión el juego lo pinta negro
LLANO = material('llano', color=(0.42, 0.33, 0.22), rug=1.0)
FACHADAS = [material(f'f-heraclion-{i}', tex_postigos(f'heraclion-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.95, 0.93, 0.88), (0.3, 0.42, 0.5)), ((0.92, 0.88, 0.78), (0.4, 0.34, 0.28)), ((0.9, 0.84, 0.7), (0.3, 0.4, 0.36))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.99, 0.84, 0.66)), (0.05, (0.97, 0.84, 0.72)), (0.16, (0.8, 0.84, 0.9)), (0.45, (0.46, 0.64, 0.9)), (1.0, (0.22, 0.42, 0.8))],
    (SOL[0], SOL[2]), 0.3, (0.55, 0.32, 0.1), ((1.0, 0.86, 0.7), (0.86, 0.84, 0.9)), cuanta_nube=0.1), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. PIEZAS MINOICAS
# ==================================================================================
def columna (grupo, x, z, y=0.0, alto=3.4, r=0.27, negra=False):
    """La columna minoica: basa baja de piedra, fuste que se ESTRECHA HACIA ABAJO,
    el toro del capitel y el ábaco. Rojas con el capitel negro, o al revés."""
    fuste, cap = (NEGRO_C, ROJO) if negra else (ROJO, NEGRO_C)
    torno(grupo, YESO, en(x, z, y), [(r * 1.55, 0.0), (r * 1.55, 0.14)], lados=12, tapas=(False, True), v_m=1.0)
    torno(grupo, fuste, en(x, z, y + 0.14), [(r, 0.0), (r * 1.3, alto - 0.66)], lados=12, tapas=(False, False))
    torno(grupo, cap, en(x, z, y + alto - 0.52), [(r * 1.3, 0.0), (r * 1.34, 0.05), (r * 1.8, 0.17), (r * 1.86, 0.26), (r * 1.62, 0.32)], lados=12, tapas=(False, False))
    bloque(grupo, cap, en(x, z, y + alto - 0.2), (r * 4.0, r * 4.0, 0.2), mella=0.0)

def pithos (grupo, x, z, tam=1.0, y=0.0, rota=False, lados=12):
    """Una tinaja de almacén, de las de la altura de un hombre."""
    perfil = [(0.22, 0.0), (0.3, 0.1), (0.52, 0.5), (0.62, 0.95), (0.57, 1.32), (0.42, 1.58), (0.34, 1.66), (0.43, 1.77), (0.41, 1.82)]
    if rota:
        perfil = perfil[:5]
    torno(grupo, PITHOS, en(x, z, y, random.uniform(0, 6.28)), [(r * tam, h * tam) for r, h in perfil], lados=lados, u_rep=3, v_m=1.82 * tam, tapas=(False, False), roto=0.12 if rota else 0.0)
    if not rota:
        cara('EP' if grupo in ('P', 'E', 'EV') else 'CP', NEGRO, [P(x + 0.33 * tam * math.cos(a_), z + 0.33 * tam * math.sin(a_), y + 1.74 * tam) for a_ in np.linspace(0, 2 * math.pi, 10, endpoint=False)], hacia=ARRIBA)

def extruido (grupo, mat, m4, contorno, grueso, baldosa=1.2):
    """Una silueta con fondo: `contorno` es una lista de (x, alto) en el plano de
    `m4`, en sentido ANTIHORARIO (así se sabe hacia dónde mira cada canto aunque
    la figura tenga entrantes, como los cuernos)."""
    q = m4.to_3x3()
    a_ = [m4 @ V((x, -grueso / 2, y)) for x, y in contorno]
    b = [m4 @ V((x, grueso / 2, y)) for x, y in contorno]
    cara(grupo, mat, a_, hacia=q @ V((0, -1, 0)), baldosa=baldosa)
    cara(grupo, mat, b, hacia=q @ V((0, 1, 0)), baldosa=baldosa)
    n = len(contorno)
    for i in range(n):
        j = (i + 1) % n
        dx, dy = contorno[j][0] - contorno[i][0], contorno[j][1] - contorno[i][1]
        cara(grupo, mat, [a_[i], a_[j], b[j], b[i]], hacia=q @ V((dy, 0, -dx)), baldosa=baldosa)

CUERNOS = [(-1.0, 0.0), (1.0, 0.0), (1.0, 0.34), (0.96, 1.6), (0.74, 1.5), (0.5, 0.7), (0.0, 0.46), (-0.5, 0.7), (-0.74, 1.5), (-0.96, 1.6), (-1.0, 0.34)]
def cuernos (grupo, x, z, y, tam=1.0, giro=0.0, mat=None):
    """Los cuernos de la consagración."""
    extruido(grupo, mat or YESO, en(x, z, y, giro), [(px * tam, py * tam) for px, py in CUERNOS], 0.34 * tam)

HACHA = [(0.0, -0.11), (0.5, -0.42), (0.64, 0.0), (0.5, 0.42), (0.0, 0.11), (-0.5, 0.42), (-0.64, 0.0), (-0.5, -0.42)]
def labrys (grupo, x, z, alto=3.0):
    """El hacha doble en su peana: el labrys, que le dio el nombre al laberinto."""
    bloque(grupo, SILLAR, en(x, z), (0.9, 0.9, 0.55), mella=0.04)
    bloque(grupo, YESO, en(x, z, 0.55), (0.6, 0.6, 0.3), mella=0.04)
    barra('EV', MADERA, P(x, z, 0.85), P(x, z, alto + 0.5), 0.09)
    extruido('EV', BRONCE, en(x, z, alto), HACHA, 0.05)

def muro_roto (grupo, x0, z0, x1, z1, alto, grueso=0.7, mat=None, tramo=1.6):
    """Un muro de ruina entre dos puntos (a lo largo de x o de z): tramos de altura desigual."""
    mat = mat or MAMPUESTO
    largo = math.hypot(x1 - x0, z1 - z0)
    n = max(1, int(round(largo / tramo)))
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        h = alto * random.uniform(0.45, 1.0)
        ax, az, bx, bz = x0 + (x1 - x0) * t0, z0 + (z1 - z0) * t0, x0 + (x1 - x0) * t1, z0 + (z1 - z0) * t1
        if abs(x1 - x0) > abs(z1 - z0):
            caja(grupo, mat, ax, bx, az - grueso / 2, az + grueso / 2, -0.1, h, baldosa=2.4)
        else:
            caja(grupo, mat, ax - grueso / 2, ax + grueso / 2, az, bz, -0.1, h, baldosa=2.4)

# ==================================================================================
# 3. EL PATIO, LA RAMPA DEL LABERINTO Y EL ALA NORTE
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-84, 84), (-190, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
# El resto del cerro, a trozos que no pisan ni la pista ni la zanja.
CERRO = (-118.0, 118.0, -176.0, 96.0)                                              # x0, x1, z0, z1
suelo('GP', SUELO, CERRO[0], PX0, CERRO[2], CERRO[3], 0.0, 12.0)
suelo('GP', SUELO, PX1, CERRO[1], CERRO[2], CERRO[3], 0.0, 12.0)
suelo('GP', SUELO, PX0, PX1, PZ1, CERRO[3], 0.0, 12.0)
suelo('GP', SUELO, PX0, -ZANJA, Z_ALA, Z_BOCA, 0.0, 12.0)
suelo('GP', SUELO, ZANJA, PX1, Z_ALA, Z_BOCA, 0.0, 12.0)
suelo('GP', SUELO, PX0, PX1, CERRO[2], Z_ALA - 12.0, 0.0, 12.0)

# --- la rampa: baja de la boca al pie, entre dos muros de sillar --------------------------------
cara('P', RAMPA, [P(-ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_BOCA, 0.0), P(ZANJA, Z_PIE, -HONDO), P(-ZANJA, Z_PIE, -HONDO)],
     uvs=[(0, 0), (4, 0), (4, 5), (0, 5)], hacia=ARRIBA)
cara('P', RAMPA, [P(-ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_PIE, -HONDO), P(ZANJA, Z_ALA - 12.0, -HONDO), P(-ZANJA, Z_ALA - 12.0, -HONDO)],
     uvs=[(0, 5), (4, 5), (4, 8.6), (0, 8.6)], hacia=ARRIBA)
for s in (-1, 1):
    # El muro de la zanja, que crece según baja la rampa, y su pretil por arriba.
    cara('P', SILLAR, [P(s * ZANJA, Z_BOCA, 0.0), P(s * ZANJA, Z_PIE, -HONDO), P(s * ZANJA, Z_ALA, -HONDO), P(s * ZANJA, Z_ALA, 0.0)], hacia=V((-s, 0, 0)), baldosa=3.0)
    viga('P', SILLAR, min(s * ZANJA, s * (ZANJA + 0.6)), max(s * ZANJA, s * (ZANJA + 0.6)), Z_ALA, Z_BOCA - 0.2, 0.0, 0.7, u_m=3.0)
    bloque('P', YESO, en(s * (ZANJA + 0.3), Z_BOCA + 0.25), (0.9, 0.9, 1.0), mella=0.03)                # el remate de la boca
    labrys('P', s * 8.55, Z_BOCA + 1.5)
# La puerta: el hueco a oscuras bajo la galería, con su resplandor.
Y_DINTEL = 1.2
cara('EP', NEGRO, [P(-ZANJA, Z_ALA - 11.9, -HONDO), P(ZANJA, Z_ALA - 11.9, -HONDO), P(ZANJA, Z_ALA - 11.9, Y_DINTEL), P(-ZANJA, Z_ALA - 11.9, Y_DINTEL)], hacia=V((0, -1, 0)))
cara('EP', NEGRO, [P(-ZANJA, Z_ALA - 12.0, Y_DINTEL - 0.02), P(ZANJA, Z_ALA - 12.0, Y_DINTEL - 0.02), P(ZANJA, Z_ALA, Y_DINTEL - 0.02), P(-ZANJA, Z_ALA, Y_DINTEL - 0.02)], hacia=ABAJO)
for s in (-1, 1):
    cara('EP', NEGRO, [P(s * (ZANJA - 0.02), Z_ALA - 12.0, -HONDO), P(s * (ZANJA - 0.02), Z_ALA - 0.4, -HONDO), P(s * (ZANJA - 0.02), Z_ALA - 0.4, Y_DINTEL), P(s * (ZANJA - 0.02), Z_ALA - 12.0, Y_DINTEL)], hacia=V((-s, 0, 0)))
    cara('EP', VERDE, [P(s * (ZANJA - 0.05), Z_ALA - 11.0, -HONDO + 0.2), P(s * (ZANJA - 0.05), Z_ALA - 1.0, -HONDO + 0.2), P(s * (ZANJA - 0.05), Z_ALA - 1.0, -HONDO + 0.5), P(s * (ZANJA - 0.05), Z_ALA - 11.0, -HONDO + 0.5)], hacia=V((-s, 0, 0)))
# Lo que alumbra al fondo: unos nódulos de resina encendidos, no un paño de luz
# (el primero era un trapecio verde que parecía una pantalla).
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
for x, y, r in ((-3.4, 0.9, 0.55), (-1.0, 1.9, 0.4), (1.6, 1.1, 0.7), (4.0, 2.2, 0.45), (0.3, 0.5, 0.35), (-5.2, 2.4, 0.3), (5.6, 0.8, 0.4)):
    cara('EP', BRILLO_HONDO if r > 0.42 else VERDE, [P(x + r * math.cos(a_), Z_ALA - 11.85, -HONDO + y + r * 0.8 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 9, endpoint=False)], hacia=V((0, -1, 0)))
for k in range(9):                                                                 # las raíces, por la rampa arriba
    x = -6.4 + k * 1.6 + random.uniform(-0.4, 0.4)
    z0 = Z_ALA - random.uniform(0.5, 3.0)
    z1 = random.uniform(Z_PIE + 3, Z_BOCA - 1.0)
    alto_en = lambda z: -HONDO * min(1.0, (Z_BOCA - z) / (Z_BOCA - Z_PIE))
    barra('EV', RESINA, P(x, z0, alto_en(z0) + 0.08), P(x + random.uniform(-0.8, 0.8), z1, alto_en(z1) + 0.05), random.uniform(0.2, 0.42))

# --- el ala norte: el paño de la puerta, la galería de las columnas rojas y su cornisa -------------
AX = 9.2                                                                           # media anchura del ala
# El paño: sillares, y el dintel con su greca de espirales.
for x0, x1 in ((-AX, -ZANJA), (ZANJA, AX)):
    caja('P', SILLAR, x0, x1, Z_ALA - 12.0, Z_ALA, -0.1, Y_GAL, baldosa=3.0)
viga('P', SILLAR, -ZANJA, ZANJA, Z_ALA - 1.4, Z_ALA, Y_DINTEL, Y_GAL - 0.5, u_m=3.0)
viga('P', ESPIRALES, -AX - 0.1, AX + 0.1, Z_ALA - 1.5, Z_ALA + 0.12, Y_GAL - 0.5, Y_GAL, u_m=1.0, tapas=False)
rect('P', YESO, -AX, AX, Z_ALA - 12.0, Z_ALA + 0.12, Y_GAL, 2.4)                    # el suelo de la galería
# El muro del fondo, con el zócalo pintado y los frescos.
Z_MURO = Z_ALA - 4.2
Y_TECHO = Y_GAL + 3.6
viga('P', ENLUCIDO, -AX, AX, Z_MURO - 0.6, Z_MURO, Y_GAL, Y_TECHO, u_m=3.0, tapas=False)
viga('P', ZOCALO, -AX + 0.02, AX - 0.02, Z_MURO - 0.5, Z_MURO + 0.03, Y_GAL, Y_GAL + 0.7, u_m=1.4, tapas=False)
def fresco (mat, x0, x1, y0, y1):
    cara('P', mat, [P(x0, Z_MURO + 0.05, y0), P(x1, Z_MURO + 0.05, y0), P(x1, Z_MURO + 0.05, y1), P(x0, Z_MURO + 0.05, y1)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -1, 0)))
fresco(TORO, -3.1, 3.1, Y_GAL + 0.75, Y_GAL + 3.4)
fresco(ESCUDOS, -8.4, -5.4, Y_GAL + 0.75, Y_GAL + 3.4)
fresco(ESCUDOS, 5.4, 8.4, Y_GAL + 0.75, Y_GAL + 3.4)
for s in (-1, 1):                                                                  # los dos testeros
    caja('P', SILLAR, s * AX - 0.45, s * AX + 0.45, Z_MURO - 0.6, Z_ALA + 0.1, Y_GAL, Y_TECHO, baldosa=3.0)
for x in (-6.4, -3.6, 3.6, 6.4):
    columna('P', x, Z_ALA - 0.45, Y_GAL, alto=Y_TECHO - Y_GAL)
# La viga, el friso de discos, la cornisa y los cuernos.
viga('P', VIGA, -AX - 0.2, AX + 0.2, Z_MURO - 0.6, Z_ALA + 0.2, Y_TECHO, Y_TECHO + 0.45, u_m=2.0)
viga('P', DISCOS, -AX - 0.2, AX + 0.2, Z_MURO - 0.6, Z_ALA + 0.2, Y_TECHO + 0.45, Y_TECHO + 1.05, u_m=0.6, tapas=False)
viga('P', YESO, -AX - 0.5, AX + 0.5, Z_MURO - 0.9, Z_ALA + 0.5, Y_TECHO + 1.05, Y_TECHO + 1.3, u_m=2.4)
Y_CORNISA = Y_TECHO + 1.3
cuernos('P', 0.0, Z_ALA + 0.1, Y_CORNISA, 1.25)
for x in (-5.6, 5.6):
    cuernos('P', x, Z_ALA + 0.1, Y_CORNISA, 0.8)
print('ALA NORTE', round(Y_CORNISA + 1.6 * 1.25, 2), 'm de alto')
# Detrás y a los lados, el resto del ala: dos cuerpos más bajos, de mampuesto con sus vigas.
for s in (-1, 1):
    x0, x1 = (AX + 0.45, AX + 9.0) if s > 0 else (-AX - 9.0, -AX - 0.45)
    caja('E', MAMPUESTO, x0, x1, Z_ALA - 10.0, Z_ALA - 1.0, -0.1, 4.4, techo=YESO, baldosa=3.0)
    viga('E', VIGA, x0 - 0.05, x1 + 0.05, Z_ALA - 10.05, Z_ALA - 0.95, 2.1, 2.4, u_m=2.0, tapas=False)
    viga('E', VIGA, x0 - 0.05, x1 + 0.05, Z_ALA - 10.05, Z_ALA - 0.95, 4.1, 4.4, u_m=2.0, tapas=False)
    cara('EP', NEGRO, [P(s * (AX + 3.6), Z_ALA - 0.98, 0.0), P(s * (AX + 5.2), Z_ALA - 0.98, 0.0), P(s * (AX + 5.2), Z_ALA - 0.98, 2.1), P(s * (AX + 3.6), Z_ALA - 0.98, 2.1)], hacia=V((0, -1, 0)))
caja('E', MAMPUESTO, -AX, AX, Z_ALA - 20.0, Z_ALA - 12.0, -0.1, Y_GAL + 2.2, techo=YESO, baldosa=3.0)

# --- los lados del patio: lo que cabe en la cuña que ve el móvil ------------------------------------
# A la IZQUIERDA (el ala del trono): un estilóbato con columnas en pie, tinajas y su murete.
viga('P', YESO, -PATIO, -8.5, -58.0, -16.0, 0.0, 0.32, u_m=2.4)
for z, negra in ((-22.0, False), (-34.0, True), (-46.0, False)):
    columna('P', -9.15, z, 0.32, alto=3.3, r=0.25, negra=negra)
for z in (-4.5, -13.0, -27.0, -29.0, -40.0, -52.5, -54.6):
    pithos('P', -8.15 if z > -20 else -9.6 + random.uniform(-0.2, 0.2), z, random.uniform(0.88, 1.03), 0.0 if z > -20 else 0.32, rota=(z == -29.0))
muro_roto('P', -PATIO, -58.0, -PATIO, -16.0, 2.6, 0.8)
# A la DERECHA (el lado de la gran escalera): ruina baja, los cuernos grandes y la kulura de la base.
for z in (-3.0, -11.0, -19.0, -20.9, -31.5, -57.0):
    pithos('P', 8.15 if z > -16 else 9.2 + random.uniform(-0.2, 0.3), z, random.uniform(0.88, 1.03), rota=(z == -20.9))
bloque('P', SILLAR, en(10.5, -31.0), (2.5, 0.9, 0.5), mella=0.03)
cuernos('P', 10.5, -31.0, 0.5, 1.1, giro=0.25)                                     # de frente al patio
muro_roto('P', 11.4, -27.0, 11.4, -22.0, 1.2, 0.7)
muro_roto('P', 10.6, -58.0, 10.6, -52.0, 1.5, 0.7)
muro_roto('P', 10.6, -52.0, 16.0, -52.0, 1.2, 0.7)
# La kulura: el brocal de un silo redondo, con la base alien dentro.
torno('P', MAMPUESTO, en(BASE[0], BASE[1]), [(5.15, -0.1), (5.15, 0.5), (4.7, 0.5), (4.7, 0.04)], lados=28, u_rep=14, v_m=1.2, tapas=(False, False))
cara('P', YESO, [P(BASE[0] + 4.7 * math.cos(2 * math.pi * i / 28), BASE[1] + 4.7 * math.sin(2 * math.pi * i / 28), 0.04) for i in range(28)], hacia=ARRIBA, baldosa=2.4)
# Sillares caídos y basas sueltas por los bordes.
for z in np.arange(-56.0, 6.0, 6.3):
    for s in (-1, 1):
        x = s * random.uniform(7.9, 8.3)
        zz = z + random.uniform(-1, 1)
        if (s > 0 and abs(zz - BASE[1]) < 6.6) or random.random() < 0.35 or (zz > -16 and min(abs(zz - t_) for t_ in (-3.0, -4.5, -11.0, -13.0)) < 1.5):
            continue
        if random.random() < 0.5:
            bloque('P', random.choice((SILLAR, YESO)), en(x, zz, 0.0, random.uniform(-0.4, 0.4)), (random.uniform(0.5, 0.65), random.uniform(0.5, 0.9), random.uniform(0.3, 0.5)), mella=0.06)
        else:
            torno('P', YESO, en(x, zz), [(0.36, 0.0), (0.36, 0.16)], lados=12, tapas=(False, True), v_m=1.0)

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-61.5)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: EL PALACIO, QUE ES EL LABERINTO
# ==================================================================================
# --- los muros: una retícula de estancias a medio caer --------------------------------------------
def protegido (x, z, margen=0.0):
    """Donde no va ningún muro del laberinto: el patio, la rampa, el ala norte y lo ya puesto."""
    if abs(x) < PATIO + 0.6 + margen and -60.0 - margen < z < 34.0 + margen:
        return True
    if abs(x) < AX + 9.6 + margen and Z_ALA - 21.0 - margen < z < Z_BOCA + margen:
        return True
    return math.hypot(x - BASE[0], z - BASE[1]) < 6.2 + margen
PASO_L = 5.6
n_muros = 0
for gx in np.arange(-72.0, 72.1, PASO_L):
    for gz in np.arange(-150.0, 70.1, PASO_L):
        if (gx / 78.0) ** 2 + ((gz + 40.0) / 116.0) ** 2 > 1:                       # el contorno del palacio, redondeado
            continue
        for dx, dz in ((PASO_L, 0.0), (0.0, PASO_L)):
            if random.random() < 0.42:
                continue
            x1, z1 = gx + dx, gz + dz
            if protegido(gx, gz, 0.3) or protegido(x1, z1, 0.3) or protegido((gx + x1) / 2, (gz + z1) / 2, 0.3):
                continue
            # De pie quedan más los de dentro; hacia el borde, hiladas sueltas.
            borde = (gx / 78.0) ** 2 + ((gz + 40.0) / 116.0) ** 2
            muro_roto('T', gx, gz, x1, z1, random.uniform(1.2, 3.0) * (1 - 0.55 * borde), 0.75, random.choice((MAMPUESTO, MAMPUESTO, SILLAR)), tramo=2.8)
            n_muros += 1
print('MUROS', n_muros)
# Los almacenes del oeste: los pasillos largos y estrechos de las tinajas.
for z in np.arange(-56.0, 30.0, 4.2):
    muro_roto('T', -52.0, z, -22.0, z, random.uniform(1.4, 2.4), 0.8, SILLAR, tramo=3.0)
    for x in np.arange(-49.0, -24.0, 3.1):
        if random.random() < 0.22:
            pithos('T', x, z + 2.1, 0.95, lados=8)
muro_roto('T', -20.6, -58.0, -20.6, 30.0, 2.6, 0.9, SILLAR, tramo=3.0)                # el corredor largo
# El ala del trono, reconstruida: dos plantas con su pórtico al patio.
caja('C', ENLUCIDO, -20.0, -PATIO - 0.4, -58.0, -18.0, 0.0, 7.0, techo=YESO, baldosa=3.0)
viga('C', VIGA, -20.05, -PATIO - 0.35, -58.05, -17.95, 3.3, 3.7, u_m=2.0, tapas=False)
viga('C', VIGA, -20.05, -PATIO - 0.35, -58.05, -17.95, 6.6, 7.0, u_m=2.0, tapas=False)
for z in np.arange(-56.0, -19.0, 3.4):
    cara('CP', NEGRO, [P(-PATIO - 0.38, z, 0.2), P(-PATIO - 0.38, z + 1.5, 0.2), P(-PATIO - 0.38, z + 1.5, 2.9), P(-PATIO - 0.38, z, 2.9)], hacia=V((1, 0, 0)))
for x in (-18.0, -15.0):
    cuernos('T', x, -38.0, 7.0, 0.9, giro=math.pi / 2)
# El propileo sur: pilares blancos, columnas rojas y el fresco del copero al fondo.
caja('C', ENLUCIDO, -17.0, -5.0, 44.0, 46.0, 0.0, 5.4, techo=YESO, baldosa=3.0)
for x in (-15.2, -11.0, -6.8):
    columna('T', x, 49.5, 0.0, alto=4.2, r=0.34)
viga('C', VIGA, -17.2, -4.8, 44.0, 50.4, 4.2, 4.7, u_m=2.0)
viga('C', YESO, -17.6, -4.4, 43.6, 50.8, 4.7, 5.0, u_m=2.4)
cuernos('T', -11.0, 36.0, 0.0, 1.5)                                                # los cuernos del lado sur
# La gran escalera, al este: el pórtico del pozo de luz, con sus columnas negras.
# Va BAJO y apartado del patio (x de 22 a 36): con el sol a 28°, un cuerpo de ocho
# metros junto al patio echaba una sombra de quince sobre los carriles de la
# derecha… y jugando no se ve qué la da, porque esto solo sale en el vuelo.
caja('C', SILLAR, 22.0, 36.0, -30.0, -10.0, -0.1, 0.6, techo=YESO, baldosa=3.0)
for z in (-28.0, -24.0, -16.0, -12.0):
    columna('T', 23.2, z, 0.6, alto=3.0, r=0.26, negra=True)
viga('C', VIGA, 22.4, 35.6, -29.6, -10.4, 3.6, 4.05, u_m=2.0, techo=YESO)
caja('C', ENLUCIDO, 29.0, 35.6, -29.6, -10.4, 0.6, 3.6, baldosa=3.0)
# El patio oeste, con sus calzadas de losa y las tres kuluras, y el área teatral al noroeste.
for a_, b in (((-112.0, 20.0), (-56.0, -30.0)), ((-112.0, -60.0), (-56.0, -12.0))):
    d = math.hypot(b[0] - a_[0], b[1] - a_[1])
    nx, nz = -(b[1] - a_[1]) / d * 0.9, (b[0] - a_[0]) / d * 0.9
    cara('T', YESO, [P(a_[0] - nx, a_[1] - nz, 0.05), P(b[0] - nx, b[1] - nz, 0.05), P(b[0] + nx, b[1] + nz, 0.05), P(a_[0] + nx, a_[1] + nz, 0.05)], hacia=ARRIBA, baldosa=2.4)
for z in (26.0, 12.0, -3.0):
    torno('T', MAMPUESTO, en(-96.0, z), [(4.2, 0.0), (4.2, 0.4), (3.6, 0.4), (3.2, -1.6)], lados=18, u_rep=10, v_m=1.4, tapas=(False, False))
for k in range(7):
    viga('T', YESO, -98.0 + k * 0.0, -78.0, -152.0 + k * 1.1, -150.9 + k * 1.1, 0.0, 0.3 + k * 0.3, u_m=2.4)
    viga('T', YESO, -100.0 - k * 1.1, -98.9 - k * 1.1, -146.0, -128.0, 0.0, 0.3 + k * 0.3, u_m=2.4)

# --- el cerro, el valle y lo que crece en ellos ------------------------------------------------------
# El cerro es una meseta ancha (radio 520, casi llana por arriba): con uno más
# pequeño, el suelo de las ruinas asomaba por los bordes como una losa en el aire.
h_cerro = monte('T', HIERBA, 0.0, -40.0, 520.0, -VALLE_Y - 0.7, y0=VALLE_Y, seg=36, anillos=9, pico=0.5, baldosa=22.0)
suelo('G', CAMPO, -1500.0, 1500.0, -1500.0, 1500.0, VALLE_Y, 30.0)
def arbol_de_cerro (x, z, y):
    r = random.random()
    if r < 0.5:
        pino('T', TRONCO, PINOS, x, z, random.uniform(1.0, 1.5), y)
    elif r < 0.8:
        cipres('T', CIPRES, x, z, random.uniform(0.8, 1.1), y)
    else:
        arbol('T', TRONCO, OLIVOS, x, z, random.uniform(0.8, 1.1), y=y - 0.4)
n = 0
while n < 520:                                                                      # el pinar que rodea las ruinas
    x, z = random.uniform(-420.0, 420.0), random.uniform(-460.0, 380.0)
    dentro = (x / 86.0) ** 2 + ((z + 40.0) / 124.0) ** 2
    y = h_cerro(x, z)
    if y is None or dentro < 1 or (dentro < 2.2 and random.random() < 0.5):
        continue
    if -130.0 < x < -100.0:                                                          # la carretera
        continue
    arbol_de_cerro(x, z, y if abs(x) > CERRO[1] or not (CERRO[2] < z < CERRO[3]) else 0.0)
    n += 1
for x, z in ((-16.0, -30.0), (-17.5, -8.0), (-26.0, 40.0), (44.0, 24.0), (40.0, -46.0), (-40.0, -70.0), (30.0, -96.0), (20.0, 52.0)):   # y los que crecen dentro
    cipres('T', CIPRES, x, z, random.uniform(0.8, 1.0)) if random.random() < 0.5 else pino('T', TRONCO, PINOS, x, z, random.uniform(1.0, 1.3))
# La carretera de Heraclión, al oeste, con su aparcamiento y la taquilla.
suelo('G', ASFALTO, -127.0, -119.0, -1500.0, 1500.0, VALLE_Y + 0.5, 8.0)
zs_c = [float(z) for z in np.linspace(-640.0, 560.0, 25)]
ys_c = [(h_cerro(-123.0, z) if h_cerro(-123.0, z) is not None else VALLE_Y + 0.3) + 0.25 for z in zs_c]
franja('T', ASFALTO, [(-127.0, z) for z in zs_c], ys_c, [(-119.0, z) for z in zs_c], ys_c, ARRIBA, u_baldosa=8.0, cerrada=False)
caja('T', FACHADAS[0], -116.0, -104.0, 60.0, 78.0, -1.0, 3.6, techo=AZOTEA)

# Olivares y viñas: las hileras del valle, y alguna casa de labor.
def altura_campo (x, z):
    return h_cerro(x, z) if h_cerro(x, z) is not None else VALLE_Y
for _ in range(40):
    cx, cz = random.uniform(-1250.0, 1250.0), random.uniform(-1200.0, 1200.0)
    if h_cerro(cx, cz) is not None or math.hypot(cx, cz + 40.0) < 700.0:           # solo en lo llano del valle
        continue
    giro = random.uniform(0, math.pi)
    c, s = math.cos(giro), math.sin(giro)
    if random.random() < 0.6:                                                       # un olivar: copas en marco real
        for i in range(-3, 4):
            for j in range(-2, 3):
                x, z = cx + (i * 11.0) * c - (j * 11.0) * s, cz + (i * 11.0) * s + (j * 11.0) * c
                copa('T', random.choice(OLIVOS), x, z, VALLE_Y + 2.4, 3.2, 2.2)
    else:                                                                           # una viña: hileras verdes sobre la tierra roja
        cara('T', TIERRA_ROJA, [P(cx + dx * c - dz * s, cz + dx * s + dz * c, VALLE_Y + 0.12) for dx, dz in ((-56, -40), (56, -40), (56, 40), (-56, 40))], hacia=ARRIBA, baldosa=14.0)
        for j in range(-9, 10):
            a_, b = (cx - 54 * c - j * 4.2 * s, cz - 54 * s + j * 4.2 * c), (cx + 54 * c - j * 4.2 * s, cz + 54 * s + j * 4.2 * c)
            barra('T', VIÑA, P(a_[0], a_[1], VALLE_Y + 0.6), P(b[0], b[1], VALLE_Y + 0.6), 1.1)
for _ in range(60):
    x, z = random.uniform(-1200.0, 1200.0), random.uniform(-1300.0, 1100.0)
    if math.hypot(x, z + 40.0) < 300.0:
        continue
    w, d = random.uniform(5, 9), random.uniform(5, 9)
    y = altura_campo(x, z)
    caja('T', random.choice(FACHADAS), x - w, x + w, z - d, z + d, y - 2, y + random.choice([3.5, 6.5]), techo=AZOTEA)

# --- los montes: las lomas de alrededor, el Juktas al sur y las sierras grandes -----------------------
monte('T', MONTE_C, 430.0, -120.0, 300.0, 110.0, y0=VALLE_Y, seg=22, anillos=6, pico=0.9, baldosa=30.0)        # Ailiás, al este
monte('T', MONTE_C, -90.0, 520.0, 330.0, 95.0, y0=VALLE_Y, seg=22, anillos=6, pico=0.9, baldosa=30.0)          # Gipsades, al sur
monte('T', MONTE_C, -520.0, -260.0, 300.0, 80.0, y0=VALLE_Y, seg=22, anillos=6, pico=0.9, baldosa=30.0)
sierra('T', MONTE_L, -1150.0, 1500.0, -450.0, 2500.0, 420.0, 470.0, y0=VALLE_Y + 0.5)                          # el Juktas, la cara de Zeus dormido
sierra('T', MONTE_L, -2900.0, 300.0, -2300.0, 2300.0, 700.0, 620.0, y0=VALLE_Y + 0.5)                          # el Ida, al oeste
sierra('T', MONTE_L, 2300.0, 2400.0, 2900.0, 100.0, 700.0, 560.0, y0=VALLE_Y + 0.5)                            # el Dikti, por donde sale el sol
sierra('T', MONTE_L, 300.0, 2700.0, 2000.0, 2700.0, 600.0, 330.0, y0=VALLE_Y + 0.5)
# Al norte, Heraclión y el mar, con la isla de Día.
n_ed = 0
for x in np.arange(-1300.0, 1300.0, 46.0):
    for z in np.arange(-2350.0, -1250.0, 46.0):
        if random.random() < 0.12 + 0.5 * max(0.0, (z + 1500.0) / 250.0):
            continue
        ax, az = random.choice((12.0, 15.0, 18.0)), random.choice((12.0, 15.0, 18.0))
        caja('T', random.choice(FACHADAS), x + 23 - ax, x + 23 + ax, z + 23 - az, z + 23 + az, VALLE_Y, VALLE_Y + random.choice([10, 13, 16, 19]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)
rect('CP', MAR, -3200.0, 3200.0, -3200.0, -2380.0, VALLE_Y + 0.6, 200.0)
sierra('T', MONTE_L, -500.0, -3000.0, 500.0, -3050.0, 150.0, 130.0, y0=VALLE_Y + 0.7)
for x0, x1, z0, z1 in ((-3200.0, -1500.0, -2380.0, 3200.0), (1500.0, 3200.0, -2380.0, 3200.0), (-1500.0, 1500.0, 1500.0, 3200.0), (-1500.0, 1500.0, -2380.0, -1500.0)):
    rect('CP', LLANO, x0, x1, z0, z1, VALLE_Y - 0.4, 200.0)

cupula('CP', CIELO, 3300.0, 0.0, -40.0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-cerro', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-cnosos', ['P', 'E', 'GP', 'EV', 'EP']), ('lugar-cnosos-ciudad', ['C', 'G', 'T', 'CP'])],
    # La mañana temprano: el sol bajo y dorado manda, y el cielo, flojo, deja la sombra
    # fría. Con el sol tan bajo al suelo le llega poca luz directa (el seno de 28°) y
    # el azul del cielo se nota el doble: a 0,2 de cielo el patio salía frío.
    sol_hacia=SOL, sol_color=(1.0, 0.7, 0.42), sol_fuerza=6.5, sol_ancho=3.0, cielo_fuerza=0.16, cielo_altura=20, cielo_giro=120,
    escala=0.72, satura=0.95, no_alumbran=('CP',), suaves=('monte-lejos', 'monte-cerca', 'hierba'), fundir=True)
