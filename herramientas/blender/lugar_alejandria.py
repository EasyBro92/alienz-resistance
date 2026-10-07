# Alejandría: la explanada de la fortaleza de Qaitbay, con ella de frente al fondo (07/10/2026).
#   blender -b -P herramientas/blender/lugar_alejandria.py              (entero)
#   blender -b -P herramientas/blender/lugar_alejandria.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_alejandria.py -- --reusar  (retocar la luz)
#
# Isidro, tras Grecia («Atenas ha quedado espectacular»): «sigue con Egipto». Para
# Alejandría eligió la FORTALEZA DE QAITBAY (la que se levantó con las piedras del
# Faro, en la punta del puerto), los alienz SALEN DE LA FORTALEZA, DE DÍA y con
# llegada larga. Misma receta que los demás lugares de luz horneada (horneado.py).
#
# Cómo está puesto. Se llega a la fortaleza por un espigón largo; se juega en él,
# mirando hacia ella (al noreste), con el sol de media mañana a la espalda:
#   · al FONDO, el muro de fuera con su puerta entre dos cubos y, asomando por
#     encima, la torre del homenaje con sus cuatro torreones: lo que hace de
#     Qaitbay Qaitbay. La torre va a 0,7 de su tamaño (12 m: lo que cabe jugando).
#   · Los alienz nacen DENTRO de la torre, cruzan el patio y salen por la puerta
#     del muro, que es ESTRECHA: vienen en abanico cerrado hasta cruzarla y se
#     abren a sus carriles después (`entrada.abanico` en la misión).
#   · a la IZQUIERDA, el mar abierto rompiendo en la escollera; a la DERECHA, el
#     puerto del Este con sus barcas de pesca y una faluca, y la base alien en un
#     baluarte redondo del espigón.
#   · Solo en el vuelo: el puerto entero en su bahía redonda, la Corniche con su
#     pared de casas, la mezquita de Abu al-Abbas, la Biblioteca al otro lado, y
#     fondeado fuera el barco de Creta de la historia.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.42, 0.76, 0.5)                  # media mañana: del sureste, a la espalda y algo a la derecha
iniciar('alejandria', 1477, eje=(0.0, -88.0), encendidas=0.0, reflejo=(0.07, 0.11, 0.2))

PASEO = 9.4                              # media anchura del espigón (el pretil va de ahí a 10)
MAR_Y = -2.2
Z_MURO = -67.0                           # la cara del muro de fuera, la de la puerta
GROSOR = 2.2
PUERTA = 2.6                             # media anchura de la puerta
ALTO_MURO = 4.6
Z_TORRE = -88.0                          # la cara de la torre del homenaje
TORRE_X, TORRE_F, TORRE_H = 10.5, 21.0, 10.9
ISLA = 31.0                              # media anchura del recinto
Z_FONDO = -113.0
BASE = (12.6, -44.0)
BAHIA, RADIO = (650.0, -40.0), 640.0     # el puerto del Este: una bahía casi redonda a la derecha del espigón

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_mar (nombre, base):
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((5, 2, 0.0), (9, 3, 1.3), (14, 5, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.9 * np.sin(2 * np.pi * (u * 2 + v * 4)))
    b = np.clip(onda / 3, -1, 1)
    a = np.stack([base[0] + 0.04 * b, base[1] + 0.05 * b, base[2] + 0.06 * b], axis=-1)
    a += (np.clip(b - 0.74, 0, 1) * 1.5)[..., None] * np.array((0.6, 0.55, 0.4))
    return guardar(nombre, a, 88)

# --- la pista: el enlosado del espigón ---------------------------------------------------------
PX0, PX1, PZ0, PZ1 = -PASEO, PASEO, -62.0, 12.0
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def damero (Hh, W, kx, kz, x0, z0, lado=1.25):
    """Losas cuadradas puestas a cartabón (giradas 45°): devuelve qué losa es cada
    píxel (su paridad y un número fijo) y cuánto le falta para la junta, en metros."""
    xs = (x0 + np.arange(W, dtype=np.float32) / kx)[None, :]
    zs = (z0 + np.arange(Hh, dtype=np.float32) / kz)[:, None]
    u, v = (xs + zs) / (lado * 1.4142), (xs - zs) / (lado * 1.4142)
    iu, iv = np.floor(u), np.floor(v)
    fu, fv = u - iu, v - iv
    junta = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv)) * lado * 1.4142
    azar = (np.sin(iu * 12.9898 + iv * 78.233) * 43758.5453) % 1.0
    return ((iu + iv) % 2).astype(bool), azar.astype(np.float32), junta

def tex_pista ():
    """Caliza clara y caliza miel a cartabón, con la arena que mete el viento, una
    rosa de los vientos de basalto en medio y lo que deja la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    crema = tejar(foto('concrete_floor_worn_001', 256, 0xdfd3b6, 0.42))
    miel = tejar(foto('rock_ground', 256, 0xd0bb90, 0.42))
    arena = tejar(foto('sand_01', 256, 0xdcc79c, 0.35))
    par, azar, junta = damero(PH_, PW, KX, KZ, PX0, PZ0)
    a = np.where(par[..., None], crema, miel) * (0.92 + 0.14 * azar[..., None])
    a *= 1 - 0.42 * np.clip(1 - junta / 0.05, 0, 1)[..., None]
    a *= (0.94 + 0.12 * nube(PH_, PW, 16, 4))[..., None]
    # La rosa de los vientos: un aro y una estrella de ocho puntas, de basalto y mármol.
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    cx, cz = 0.0, -26.0
    dx, dz = (PX0 + xx / KX) - cx, (PZ0 + yy / KZ) - cz
    r, ang = np.hypot(dx, dz), np.arctan2(dz, dx)
    basalto = tejar(foto('rock_tile_floor', 128, 0x5c5b5e, 0.5))
    blanco = tejar(foto('marble_01', 128, 0xe6e0d0, 0.3))
    aro = (np.abs(r - 3.3) < 0.16) | (np.abs(r - 2.9) < 0.05)
    a = np.where(aro[..., None], basalto, a)
    for puntas, largo, ancho, giro in ((4, 2.75, 0.5, 0.0), (4, 1.9, 0.42, math.pi / 4)):
        t = ((ang - giro + math.pi / puntas) % (2 * math.pi / puntas)) - math.pi / puntas   # ángulo a la punta más cercana
        dentro = (np.abs(np.sin(t)) * r < ancho * (1 - r * np.cos(t) / largo)) & (r * np.cos(t) < largo) & (np.cos(t) > 0)
        a = np.where((dentro & (t < 0))[..., None], basalto, a)
        a = np.where((dentro & (t >= 0))[..., None], blanco, a)
    # La arena: más hacia los pretiles, y un poco en todas las juntas.
    xs = np.abs(np.linspace(PX0, PX1, PW, dtype=np.float32))[None, :]
    m = np.clip((nube(PH_, PW, 30, 8) + 0.5 * np.clip((xs - 5.0) / 4.4, 0, 1) - 0.62) / 0.16, 0, 1)[..., None]
    a = a * (1 - m * 0.85) + arena * m * 0.85
    def mancha (x, z, r_, k, forma=1.0):
        c, f = a_px(x, z)
        rc, rf = int(r_ * KX * forma) + 2, int(r_ * KZ) + 2
        y0, y1, x0, x1 = max(0, f - rf), min(PH_, f + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        my, mx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((mx - c) / (r_ * KX * forma), (my - f) / (r_ * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    for x, z, r_ in ((5.2, -14.0, 1.4), (-4.8, -41.0, 1.5), (3.0, -55.0, 1.2)):    # la guerra: quemaduras
        mancha(x, z, r_ * 1.5, 0.84, 1.1)
        mancha(x, z, r_, 0.52)
        mancha(x + 0.2, z - 0.1, r_ * 0.5, 0.62, 1.2)
    for _ in range(18):                                              # lo que gotea de las redes y los carros
        mancha(random.uniform(-7.5, 7.5), random.uniform(PZ0 + 1, PZ1 - 1), random.uniform(0.3, 0.8), random.uniform(0.8, 0.92), random.uniform(0.6, 1.6))
    for _ in range(60):                                              # grietas
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        g = random.uniform(0, 6.28)
        for _ in range(random.randint(16, 70)):
            g += random.uniform(-0.4, 0.4)
            c += math.cos(g); f += math.sin(g)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.66
    for _ in range(900):                                             # chinas
        c, f = random.randrange(2, PW - 4), random.randrange(2, PH_ - 4)
        a[f + 1:f + 2, c + 1:c + 2] *= 0.7
        a[f, c] = a[f, c] * 0.4 + np.array((0.85, 0.8, 0.68), np.float32) * 0.6
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_losas ():
    """El mismo enlosado en baldosa que repite, para el resto del espigón y el recinto."""
    n = 256
    lado = 1.25 * 1.4142
    par, azar, junta = damero(n, n, n / (2 * lado), n / (2 * lado), 0.0, 0.0)
    a = np.where(par[..., None], foto('concrete_floor_worn_001', n, 0xdfd3b6, 0.42), foto('rock_ground', n, 0xd0bb90, 0.42))
    a *= 1 - 0.42 * np.clip(1 - junta / 0.05, 0, 1)[..., None]
    return guardar('losas', np.clip(a, 0, 1), 86), 2 * lado

def tex_homenaje ():
    """La cara de la torre del homenaje: sillería clara, tres pisos de ventanas
    de medio punto, el cuerpo saliente de la entrada con su arco y las ménsulas
    del adarve arriba."""
    W, Hh = 1024, 512
    a = np.tile(foto('sandstone_blocks_08', 128, 0xe3d8b8, 0.5), (4, 8, 1))
    a *= (0.92 + 0.14 * nube(Hh, W, 6, 12))[..., None]
    yy = np.linspace(0, 1, Hh, dtype=np.float32)[:, None, None]
    a *= 1 - 0.14 * np.clip((yy - 0.8) / 0.2, 0, 1)                  # el salitre del pie
    fila = lambda h: int((1 - h) * Hh)
    def hueco (cx, h0, h1, ancho, arco=True):
        f0, f1 = fila(h1), fila(h0)
        for dc in range(-ancho // 2 - 3, ancho // 2 + 4):
            cc = cx + dc
            if cc < 0 or cc >= W:
                continue
            for f in range(max(0, f0 - 3), min(Hh, f1)):
                arriba = f - f0
                if arco and arriba < ancho // 2 and (dc / (ancho / 2)) ** 2 + ((ancho / 2 - arriba) / (ancho / 2)) ** 2 > 1:
                    continue
                if abs(dc) <= ancho // 2 and arriba >= 0:
                    a[f, cc] = np.array((0.1, 0.09, 0.08)) * (1 + 0.5 * (f1 - f) / max(1, f1 - f0))
                else:
                    a[f, cc] = np.clip(a[f, cc] * 1.12, 0, 1)
    # El cuerpo de la entrada, en el centro: un paño algo más claro con su gran arco.
    a[fila(0.72):, 372:652] = np.clip(a[fila(0.72):, 372:652] * 1.06, 0, 1)
    a[fila(0.72):fila(0.72) + 4, 372:652] *= 0.6
    a[fila(0.72):, 372:376] *= 0.62; a[fila(0.72):, 648:652] *= 0.62
    hueco(512, 0.0, 0.36, 214)
    for h in (0.46, 0.66):
        for cx in range(90, W, 140):
            if abs(cx - 512) < 150 and h < 0.6:
                continue
            hueco(cx, h, h + 0.1, 22)
    for cx in (442, 512, 582):
        hueco(cx, 0.44, 0.56, 20)
    f = fila(0.9)                                                    # las ménsulas del adarve
    a[f:f + 5] = np.clip(a[f:f + 5] * 1.1, 0, 1)
    for c in range(0, W, 26):
        a[fila(0.975):f, c:c + 13] *= 0.52
    a[fila(0.975) - 3:fila(0.975)] *= 0.62
    return guardar('homenaje', np.clip(a, 0, 1), 90)

def tex_bandera ():
    """La bandera de Egipto: roja, blanca y negra, con el águila dorada en medio."""
    a = lienzo(180, 270, (0.93, 0.93, 0.91))
    a[:60] = (0.78, 0.1, 0.12); a[120:] = (0.06, 0.06, 0.07)
    yy, xx = np.mgrid[0:180, 0:270]
    a[((xx - 135) / 13.0) ** 2 + ((yy - 90) / 20.0) ** 2 < 1] = (0.78, 0.62, 0.2)
    a[(np.abs(xx - 135) < 24) & (np.abs(yy - 84) < 5)] = (0.78, 0.62, 0.2)
    return guardar('bandera-egipto', a, 90)

PISTA = material('pista', tex_pista(), rug=0.95)
_losas, LADO_LOSAS = tex_losas()
LOSAS = material('losas', _losas, rug=0.95)
SILLERIA = material('silleria', de_polyhaven('sandstone_blocks_08', 512, 0xe0d5b4, 0.5), rug=0.9)      # la caliza clara de la fortaleza
SILLERIA_O = material('silleria-oscura', de_polyhaven('sandstone_blocks_08', 512, 0xc9bb98, 0.55), rug=0.9)
MAMPUESTO = material('mampuesto', de_polyhaven('yellow_stone_wall', 512, 0xd6c8a2, 0.55), rug=0.95)
HOMENAJE = material('homenaje', tex_homenaje(), rug=0.9)
PATIO = material('patio', de_polyhaven('sandy_gravel_02', 512, 0xd4c19a, 0.4), rug=1.0)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0x9a948a, 0.7), rug=0.95)
HORMIGON_T = material('hormigon-mar', de_polyhaven('concrete_floor_worn_001', 512, 0xaaa69c, 0.6), rug=0.95)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0xb5ab98, 0.5), rug=0.9)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ARENA = material('arena', de_polyhaven('sand_01', 512, 0xdcc79c, 0.35), rug=1.0)
MAR = material('mar', tex_mar('mar-alejandria', (0.14, 0.45, 0.6)), rug=0.1)
AZOTEA = material('azotea', tex_azotea((0.72, 0.68, 0.6)))
BANDERA = material('bandera', tex_bandera(), rug=0.9)
# OJO: los colores lisos van en LINEAL.
HIERRO = material('hierro', color=(0.02, 0.022, 0.025), rug=0.5)
FUNDICION = material('fundicion', color=(0.03, 0.035, 0.035), rug=0.6)
MADERA = material('madera', color=(0.16, 0.09, 0.045), rug=0.9)
MADERA_CLARA = material('madera-clara', color=(0.42, 0.28, 0.14), rug=0.9)
BLANCO = material('blanco', color=(0.8, 0.79, 0.74), rug=0.7)
VELA = material('vela', color=(0.8, 0.76, 0.64), rug=0.9)
CABO = material('cabo', color=(0.3, 0.26, 0.2), rug=0.9)
RED = material('red', color=(0.25, 0.08, 0.05), rug=1.0)
NEGRO = material('negro', color=(0.008, 0.01, 0.01))
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRILLO_HONDO = material('brillo-hondo', color=(0.06, 0.42, 0.18), emite=1.0)
ESPUMA = material('espuma', color=(0.86, 0.9, 0.9), rug=0.6)
BARCAS = [material(f'barca-{i}', color=c, rug=0.6) for i, c in enumerate([(0.03, 0.2, 0.5), (0.02, 0.3, 0.22), (0.75, 0.55, 0.06), (0.8, 0.8, 0.74), (0.5, 0.06, 0.04), (0.05, 0.4, 0.5)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.08, 0.17, 0.05), (0.11, 0.2, 0.06)])]
TRONCO = material('tronco', color=(0.14, 0.1, 0.07))
CASCO_NEGRO = material('casco-negro', color=(0.02, 0.02, 0.022), rug=0.6)
CASCO_ROJO = material('casco-rojo', color=(0.3, 0.03, 0.025), rug=0.6)
CONTENEDORES = [material(f'contenedor-{i}', color=c, rug=0.6) for i, c in enumerate([(0.5, 0.08, 0.05), (0.04, 0.16, 0.4), (0.6, 0.4, 0.05), (0.05, 0.3, 0.2), (0.5, 0.5, 0.48)])]
ALUMINIO = material('aluminio', color=(0.6, 0.64, 0.68), rug=0.3)
LLANO = material('llano', color=(0.5, 0.44, 0.34), rug=1.0)
# Alejandría: beige, crema y blanco gastado por el salitre.
FACHADAS = [material(f'f-alejandria-{i}', tex_crema(f'alejandria-{i}', c, balcon=0.8)) for i, c in enumerate(
    [(0.9, 0.84, 0.7), (0.86, 0.8, 0.66), (0.93, 0.9, 0.82), (0.84, 0.76, 0.6)])] + \
    [material(f'f-alejandria-p{i}', tex_postigos(f'alejandria-p{i}', b, p)) for i, (b, p) in enumerate(
        [((0.9, 0.82, 0.64), (0.3, 0.4, 0.34)), ((0.88, 0.84, 0.76), (0.36, 0.3, 0.24))])]
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.86, 0.9, 0.93)), (0.07, (0.76, 0.85, 0.95)), (0.25, (0.46, 0.69, 0.94)), (0.6, (0.24, 0.5, 0.88)), (1.0, (0.13, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.54, (0.28, 0.24, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.15), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL ESPIGÓN: EL ENLOSADO, LOS PRETILES Y LO QUE HAY EN ELLOS
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-70, 70), (-190, 96))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSAS, -PASEO, PASEO, PZ1, 200.0, 0.0, LADO_LOSAS)                       # el espigón, a la espalda
suelo('GN', LOSAS, -10.0, -PASEO, PZ0, 200.0, 0.0, LADO_LOSAS)                       # bajo los pretiles
suelo('GN', LOSAS, PASEO, 10.0, PZ0, 200.0, 0.0, LADO_LOSAS)
# El muro del espigón, hasta debajo del agua.
for s in (-1, 1):
    cara('E', MAMPUESTO, [P(s * 10.0, PZ0, MAR_Y - 1.5), P(s * 10.0, 200.0, MAR_Y - 1.5), P(s * 10.0, 200.0, 0.0), P(s * 10.0, PZ0, 0.0)], hacia=V((s, 0, 0)), baldosa=4.0)
# Un solo mar: con el del puerto de otro color, la raya entre los dos cruzaba la bocana en línea recta.
rect('EP', MAR, -3000.0, 3000.0, -3000.0, 3000.0, MAR_Y, baldosa=26.0)

def pretil (s, z0, z1):
    viga('P', SILLERIA, min(s * PASEO, s * 10.0), max(s * PASEO, s * 10.0), z0, z1, 0.0, 0.82, u_m=3.0, tapas=False)
    viga('P', SILLERIA_O, min(s * (PASEO - 0.08), s * 10.08), max(s * (PASEO - 0.08), s * 10.08), z0, z1, 0.82, 0.98, u_m=3.0)
# A la derecha se abre en el baluarte de la base alien.
pretil(-1, PZ0 + 2.0, 40.0)
pretil(1, BASE[1] + 4.4, 40.0)
pretil(1, PZ0 + 2.0, BASE[1] - 4.4)

# --- el baluarte redondo de la derecha, donde se plantó la base alien -----------------------------
baluarte = [(BASE[0] + 5.15 * math.cos(2 * math.pi * i / 28), BASE[1] + 5.15 * math.sin(2 * math.pi * i / 28)) for i in range(28)]
# Su suelo va con la pista (grupo 'P'): en el mapa de luz del suelo se pisaría con las tiras del espigón.
cara('P', LOSAS, [P(x, z, 0.05) for x, z in baluarte], hacia=ARRIBA, baldosa=LADO_LOSAS)
fuera = [baluarte[i % 28] for i in range(19, 38)]                                    # el arco que da al agua, seguido
franja('P', MAMPUESTO, fuera, 0.0, fuera, MAR_Y - 1.5, V((1, 0, 0)), u_baldosa=4.0, v0=1.0, v1=0.0, cerrada=False)
torno('P', SILLERIA, en(BASE[0], BASE[1]), [(5.15, 0.0), (5.15, 0.62), (4.7, 0.62), (4.7, 0.03)], lados=28, u_rep=12, v_m=1.2, tapas=(False, False))

def canon (x, z, giro):
    """Un cañón de hierro en su cureña de madera, apuntando hacia `giro` (0 = +x)."""
    c, s = math.cos(giro), math.sin(giro)
    Y0 = 0.42                                                                        # la explanada de piedra: la caña pasa por encima del pretil
    eje = lambda d, lado, y: P(x + d * c - lado * s, z - d * s - lado * c, y + Y0)
    bloque('P', SILLERIA_O, en(x - 0.1 * c, z), (2.3, 1.5, Y0), mella=0.02)
    for lado in (-0.36, 0.36):                                                       # las gualderas
        cara('P', MADERA, [eje(-1.0, lado, 0.2), eje(0.7, lado, 0.2), eje(0.7, lado, 0.75), eje(-1.0, lado, 0.5)])
        cara('P', MADERA, [eje(-1.0, lado * 0.72, 0.2), eje(0.7, lado * 0.72, 0.2), eje(0.7, lado * 0.72, 0.75), eje(-1.0, lado * 0.72, 0.5)])
        cara('P', MADERA, [eje(-1.0, lado, 0.5), eje(0.7, lado, 0.75), eje(0.7, lado * 0.72, 0.75), eje(-1.0, lado * 0.72, 0.5)], hacia=ARRIBA)
        for d in (-0.62, 0.42):
            torno('P', MADERA, M.Translation(eje(d, lado * 1.22, 0.24)) @ mathutils.Euler((math.pi / 2, 0, giro)).to_matrix().to_4x4(), [(0.24, -0.06), (0.24, 0.06)], lados=10)
    torno('P', HIERRO, M.Translation(eje(-1.05, 0, 0.82)) @ mathutils.Euler((0, math.pi / 2 - 0.06, -giro)).to_matrix().to_4x4(),
          [(0.0, -0.12), (0.2, 0.0), (0.24, 0.12), (0.22, 0.5), (0.19, 1.6), (0.21, 2.25), (0.17, 2.3), (0.11, 2.3)], lados=10, tapas=(False, False))

def balas (x, z):
    """Una pila de balas de cañón."""
    for dx, dz, y in ((-0.2, -0.2, 0.18), (0.2, -0.2, 0.18), (-0.2, 0.2, 0.18), (0.2, 0.2, 0.18), (0.0, 0.0, 0.46)):
        copa('EV', HIERRO, x + dx, z + dz, y, 0.2, 0.2, sub=1, baila=0.0)

def farola (x, z, alto=4.8):
    torno('EV', FUNDICION, en(x, z), [(0.2, 0.0), (0.15, 0.5), (0.08, 0.7), (0.06, alto)], lados=6, tapas=(False, False))
    copa('EV', BLANCO, x, z, alto + 0.25, 0.24, 0.3, sub=1, baila=0.0)
    cubo('EV', FUNDICION, P(x, z, alto + 0.6), (0.34, 0.34, 0.08))

# Las troneras del pretil, con su cañón asomado al agua.
for s, z in ((1, -12.0), (1, -27.0), (-1, -9.0), (-1, -31.0), (-1, -52.0), (1, -57.0)):
    canon(s * 8.85, z, 0.0 if s > 0 else math.pi)
    balas(s * 8.5, z + 1.7)
for z in np.arange(3.0, -60.0, -17.5):
    for s in (-1, 1):
        if s > 0 and abs(z - BASE[1]) < 6.5:
            continue
        farola(s * 9.05, z - 4.0)

# --- la escollera del mar abierto, a la izquierda, y las barcas del puerto, a la derecha -----------
z = 60.0
while z > PZ0 - 4:
    for fila in range(3):
        x = -10.9 - fila * 1.7 + random.uniform(-0.3, 0.3)
        y = -0.2 - fila * 0.75 + random.uniform(-0.25, 0.25)
        t = random.uniform(1.4, 2.1)
        cubo('EV', random.choice((ROCA, HORMIGON_T)), P(x, z + random.uniform(-0.5, 0.5), y - t * 0.3), (t, t * random.uniform(0.9, 1.3), t * 0.75), random.uniform(0, 1.5))
    z -= random.uniform(1.6, 2.3)
for z in np.arange(40.0, PZ0, -6.0):                                                 # donde rompe la ola
    cara('EP', ESPUMA, [P(-15.8 + random.uniform(-0.6, 0.6), z, MAR_Y + 0.05), P(-15.0, z - 6.0, MAR_Y + 0.05), P(-18.0 + random.uniform(-1, 1), z - 6.0, MAR_Y + 0.05), P(-18.6 + random.uniform(-1, 1), z, MAR_Y + 0.05)], hacia=ARRIBA)

def barca (grupo, x, z, giro, largo=4.6, color=None):
    """Una barca de pesca del puerto: casco de dos puntas, borda y bancada."""
    c, s = math.cos(giro), math.sin(giro)
    g = lambda dx, dz, y: P(x + dx * c - dz * s, z + dx * s + dz * c, y)
    m = color or random.choice(BARCAS)
    a_, b = largo / 2, largo * 0.19
    borde = [(-a_, 0), (-a_ * 0.6, b), (a_ * 0.5, b), (a_, 0), (a_ * 0.5, -b), (-a_ * 0.6, -b)]
    centro = g(0, 0, MAR_Y)
    for i in range(6):
        (x0, z0), (x1, z1) = borde[i], borde[(i + 1) % 6]
        q = [g(x0 * 0.82, z0 * 0.7, MAR_Y - 0.1), g(x1 * 0.82, z1 * 0.7, MAR_Y - 0.1), g(x1, z1, MAR_Y + 0.6), g(x0, z0, MAR_Y + 0.6)]
        cara(grupo, m, q, hacia=H._girado((q[0] + q[2]) / 2 - centro))
    cara(grupo, MADERA_CLARA, [g(px * 0.92, pz * 0.86, MAR_Y + 0.32) for px, pz in borde], hacia=ARRIBA)
    cara(grupo, m, [g(-0.15, -b * 0.9, MAR_Y + 0.52), g(0.25, -b * 0.9, MAR_Y + 0.52), g(0.25, b * 0.9, MAR_Y + 0.52), g(-0.15, b * 0.9, MAR_Y + 0.52)], hacia=ARRIBA)
    return g

def faluca (grupo, x, z, giro, largo=10.0):
    """La barca del Nilo y de la costa: un palo corto y la vela latina en su entena inclinada."""
    g = barca(grupo, x, z, giro, largo, BARCAS[3])
    pie, tope = g(largo * 0.12, 0, MAR_Y + 0.5), g(largo * 0.12, 0, MAR_Y + 5.2)
    barra(grupo, MADERA, pie, tope, 0.18)
    a_, b = g(largo * 0.5, 0, MAR_Y + 1.6), g(-largo * 0.42, 0, MAR_Y + 10.5)
    barra(grupo, MADERA, a_, b, 0.12)
    cara(grupo, VELA, [a_, b, g(-largo * 0.4, 0, MAR_Y + 1.5)], hacia=V((0, -1, 0)))   # de cara al sol, que la vela es blanca

for x, z, giro in ((11.6, -17.0, 1.5), (11.9, -27.5, 1.65), (15.5, -22.0, 0.4), (19.0, -34.0, 1.2), (20.5, -50.0, 2.0)):
    barca('EV', x, z, giro, random.uniform(4.2, 5.4))
# La faluca, de costado y pegada al espigón, que es donde se le ve la vela jugando.
# (La primera quedó DENTRO del recinto, en tierra: el casco no se veía y la vela
# asomaba por el patio como un triángulo negro.)
faluca('EV', 14.2, -57.0, 0.0, largo=7.0)
for z in (-8.0, -19.0):                                                              # redes y cajas de pescado junto al pretil del puerto
    cubo('EV', RED, P(8.5, z, 0.22), (1.0, 1.5, 0.44), random.uniform(-0.3, 0.3))
    cubo('EV', MADERA_CLARA, P(8.45, z - 1.6, 0.2), (0.6, 0.9, 0.4), random.uniform(-0.3, 0.3))

# ==================================================================================
# 3. LA FORTALEZA: EL MURO DE FUERA, LA PUERTA Y LA TORRE DEL HOMENAJE
# ==================================================================================
# El recinto, sobre su roca: del final del espigón se abre a lo ancho de la isla.
RECINTO = [(-PASEO - 0.6, PZ0), (PASEO + 0.6, PZ0), (ISLA + 2.0, Z_MURO + 2.5), (ISLA + 2.0, Z_FONDO - 2.0), (-ISLA - 2.0, Z_FONDO - 2.0), (-ISLA - 2.0, Z_MURO + 2.5)]
# Tres trozos que no se pisan con el enlosado de la puerta (en el mapa de luz del
# suelo gana la última capa, y la de debajo es la que sale a oscuras).
suelo('GN', PATIO, -ISLA - 2.0, ISLA + 2.0, Z_FONDO - 2.0, Z_MURO, 0.0, 6.0)
for s in (-1, 1):
    cara('GN', PATIO, [P(s * PASEO, PZ0, 0.0), P(s * (ISLA + 2.0), Z_MURO + 2.5, 0.0), P(s * (ISLA + 2.0), Z_MURO, 0.0), P(s * PASEO, Z_MURO, 0.0)], hacia=ARRIBA, baldosa=6.0)
franja('E', ROCA, RECINTO, -0.02, [(x * 1.05, -88.0 + (z + 88.0) * 1.08) for x, z in RECINTO], MAR_Y - 1.5, 'fuera', u_baldosa=6.0)
rect('GN', LOSAS, -PASEO, PASEO, Z_MURO, PZ0, 0.0, LADO_LOSAS)                         # el enlosado sigue hasta la puerta

def arco_de_muro (grupo, mat, z, medio, y_arranque, y_tope, mira, n=10):
    """El paño de muro que queda sobre una puerta de medio punto, en la cara `z`."""
    pts = [(medio * math.cos(math.pi * i / n), y_arranque + medio * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        cara(grupo, mat, [P(x0, z, y0), P(x1, z, y1), P(x1, z, y_tope), P(x0, z, y_tope)], hacia=V((0, -mira, 0)),
             uvs=[(x0 / 3.0, y0 / 3.0), (x1 / 3.0, y1 / 3.0), (x1 / 3.0, y_tope / 3.0), (x0 / 3.0, y_tope / 3.0)])
    return pts

Z_DENTRO = Z_MURO - GROSOR
Y_ARR = 1.5                                                                          # donde arranca el arco de la puerta
for s in (-1, 1):
    caja('P', SILLERIA, min(s * PUERTA, s * ISLA), max(s * PUERTA, s * ISLA), Z_DENTRO, Z_MURO, -0.1, ALTO_MURO, baldosa=3.0)
arco = arco_de_muro('P', SILLERIA, Z_MURO, PUERTA, Y_ARR, ALTO_MURO, 1)
arco_de_muro('P', SILLERIA, Z_DENTRO, PUERTA, Y_ARR, ALTO_MURO, -1)
for (x0, y0), (x1, y1) in zip(arco, arco[1:]):                                       # la bóveda del paso
    cara('P', SILLERIA_O, [P(x0, Z_MURO, y0), P(x1, Z_MURO, y1), P(x1, Z_DENTRO, y1), P(x0, Z_DENTRO, y0)], hacia=V((-(x0 + x1), 0, -1)), baldosa=2.0)
rect('P', SILLERIA_O, -PUERTA, PUERTA, Z_DENTRO, Z_MURO, ALTO_MURO, 3.0)
# El adarve y sus almenas.
for x in np.arange(-ISLA + 0.5, ISLA, 1.5):
    if 3.2 < abs(x) < 7.6:
        continue                                                                     # ahí van los dos cubos
    bloque('EV', SILLERIA, en(float(x), Z_MURO - 0.3, ALTO_MURO), (0.8, 0.5, 0.7), mella=0.02)
# Los dos cubos de la puerta: medias torres redondas, algo más altas que el muro.
def cubo_de_muralla (x, z, r, alto, n_almenas=10):
    torno('P', SILLERIA, en(x, z), [(r * 1.08, -0.1), (r, 1.0), (r, alto - 0.5), (r + 0.22, alto - 0.3), (r + 0.22, alto)], lados=18, u_rep=6, v_m=3.0, tapas=(False, False))
    cara('P', SILLERIA_O, [P(x + (r + 0.22) * math.cos(2 * math.pi * i / 18), z + (r + 0.22) * math.sin(2 * math.pi * i / 18), alto) for i in range(18)], hacia=ARRIBA, baldosa=2.0)
    for i in range(n_almenas):
        a_ = 2 * math.pi * (i + 0.5) / n_almenas
        bloque('EV', SILLERIA, en(x + (r + 0.02) * math.cos(a_), z + (r + 0.02) * math.sin(a_), alto, -a_ + math.pi / 2), (0.66, 0.4, 0.62), mella=0.02)
for s in (-1, 1):
    cubo_de_muralla(s * 5.4, Z_MURO - 0.9, 2.3, 6.3)
# La bandera, en el cubo de la derecha.
BX, BZ = 5.4, Z_MURO - 0.9
barra('EV', BLANCO, P(BX, BZ, 6.3), P(BX, BZ, 10.6), 0.1)
for dz, d in ((0.0, 1), (0.02, -1)):
    cara('EV', BANDERA, [P(BX + 0.06, BZ + dz, 8.9), P(BX + 2.5, BZ + dz + 0.25, 8.85), P(BX + 2.5, BZ + dz + 0.25, 10.45), P(BX + 0.06, BZ + dz, 10.5)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))

# --- la torre del homenaje -------------------------------------------------------------------------
ZT0, ZT1 = Z_TORRE - TORRE_F, Z_TORRE
caras_torre = [((-TORRE_X, ZT1), (TORRE_X, ZT1), V((0, -1, 0))), ((TORRE_X, ZT1), (TORRE_X, ZT0), V((1, 0, 0))),
               ((TORRE_X, ZT0), (-TORRE_X, ZT0), V((0, 1, 0))), ((-TORRE_X, ZT0), (-TORRE_X, ZT1), V((-1, 0, 0)))]
for (ax, az), (bx, bz), n in caras_torre:
    cara('P', HOMENAJE, [P(ax, az, 0.0), P(bx, bz, 0.0), P(bx, bz, TORRE_H), P(ax, az, TORRE_H)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=n)
rect('P', SILLERIA_O, -TORRE_X, TORRE_X, ZT0, ZT1, TORRE_H, 3.0)
for x in np.arange(-TORRE_X + 3.2, TORRE_X - 3.0, 1.5):                               # las almenas de la terraza
    for z in (ZT1 - 0.25, ZT0 + 0.25):
        bloque('EV', SILLERIA, en(float(x), z, TORRE_H), (0.8, 0.5, 0.6), mella=0.02)
for z in np.arange(ZT0 + 3.2, ZT1 - 3.0, 1.5):
    for x in (-TORRE_X + 0.25, TORRE_X - 0.25):
        bloque('EV', SILLERIA, en(x, float(z), TORRE_H), (0.5, 0.8, 0.6), mella=0.02)
for sx in (-1, 1):                                                                    # los cuatro torreones de las esquinas
    for z in (ZT1, ZT0):
        cubo_de_muralla(sx * TORRE_X, z, 2.3, TORRE_H + 0.7, 9)
print('TORRE DEL HOMENAJE', round(TORRE_H + 0.7 + 0.62, 2), 'm')
# Su puerta: el gran arco del cuerpo de la entrada, a oscuras, con lo que alumbra dentro.
MEDIO_T = 2.2
arco_t = [(MEDIO_T * math.cos(math.pi * i / 10), 1.9 + MEDIO_T * math.sin(math.pi * i / 10)) for i in range(11)]
cara('EP', NEGRO, [P(MEDIO_T, ZT1 + 0.04, 0.0)] + [P(x, ZT1 + 0.04, y) for x, y in arco_t] + [P(-MEDIO_T, ZT1 + 0.04, 0.0)], hacia=V((0, -1, 0)))
for x, y, r in ((-1.1, 1.0, 0.3), (0.6, 1.9, 0.36), (1.3, 0.8, 0.22), (-0.3, 2.9, 0.2), (0.1, 0.6, 0.18)):
    cara('EP', BRILLO_HONDO if r > 0.25 else VERDE, [P(x + r * math.cos(a_), ZT1 + 0.07, y + r * 0.85 * math.sin(a_)) for a_ in np.linspace(0, 2 * math.pi, 8, endpoint=False)], hacia=V((0, -1, 0)))

# --- el resto del recinto: los muros de los costados y del fondo, con sus cubos --------------------
for s in (-1, 1):
    caja('E', SILLERIA, min(s * ISLA, s * (ISLA - GROSOR)), max(s * ISLA, s * (ISLA - GROSOR)), Z_FONDO, Z_DENTRO, -0.1, ALTO_MURO, baldosa=3.0)
    for z in np.arange(Z_FONDO + 1.0, Z_DENTRO, 1.5):
        bloque('EV', SILLERIA, en(s * (ISLA - 0.3), float(z), ALTO_MURO), (0.5, 0.8, 0.7), mella=0.02)
    for z in (Z_MURO - 1.0, Z_FONDO + 1.0, (Z_MURO + Z_FONDO) / 2):
        torno('E', SILLERIA, en(s * ISLA, z), [(3.4, -0.1), (3.1, 1.0), (3.1, 6.0)], lados=16, u_rep=7, v_m=3.0, tapas=(False, True))
caja('E', SILLERIA, -ISLA, ISLA, Z_FONDO, Z_FONDO + GROSOR, -0.1, ALTO_MURO, baldosa=3.0)
# Dos palmeras en el patio de armas y cuatro en la explanada, que para eso estamos en Egipto.
for x, z in ((-19.0, -76.0), (20.0, -79.0), (-24.0, -96.0), (25.0, -100.0)):
    palmera('EV', TRONCO, PALMA, x, z, alto=random.uniform(6.0, 8.0))
for x, z in ((-13.5, -63.4), (13.6, -63.6)):
    palmera('EV', TRONCO, PALMA, x, z, alto=random.uniform(6.5, 7.5))

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-61.5)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO: EL PUERTO, LA CORNICHE Y LA CIUDAD
# ==================================================================================
def orilla (a_, r=0.0):
    """Un punto de la orilla de la bahía (o `r` metros tierra adentro), a `a_` grados: 0 = este, 90 = sur."""
    g = math.radians(a_)
    return BAHIA[0] + (RADIO + r) * math.cos(g), BAHIA[1] + (RADIO + r) * math.sin(g)

def caja_girada (grupo, mat, cx, cz, ax, az, giro, y0, y1, techo=None):
    c, s = math.cos(giro), math.sin(giro)
    prisma(grupo, mat, [(cx + dx * c - dz * s, cz + dx * s + dz * c) for dx, dz in ((-ax, az), (ax, az), (ax, -az), (-ax, -az))], y0, y1, techo=techo)

# El espigón, hasta la tierra, y la tierra: el arco de la Corniche y lo de detrás.
ARCO = [float(a_) for a_ in np.arange(-58.0, 171.1, 3.0)]
franja('T', SOLAR, [orilla(a_) for a_ in ARCO], -0.06, [orilla(a_, 1100.0) for a_ in ARCO], -0.06, ARRIBA, u_baldosa=6.0, cerrada=False)
franja('T', CALZADA, [orilla(a_, 3.0) for a_ in ARCO], 0.08, [orilla(a_, 17.0) for a_ in ARCO], 0.08, ARRIBA, u_baldosa=6.0, cerrada=False)
for a0, a1 in zip(ARCO, ARCO[1:]):                                                     # el muro de la Corniche, mirando al agua
    (x0, z0), (x1, z1) = orilla(a0), orilla(a1)
    q = [P(x0, z0, MAR_Y - 1.5), P(x1, z1, MAR_Y - 1.5), P(x1, z1, 0.0), P(x0, z0, 0.0)]
    cara('T', MAMPUESTO, q, hacia=P(BAHIA[0], BAHIA[1]) - (q[0] + q[2]) / 2, baldosa=4.0)
# La pared de casas de la Corniche, mirando al agua.
n_ed = 0
a_ = -56.0
while a_ < 168.0:
    ancho = random.choice([24.0, 27.0, 30.0, 36.0])
    paso_a = math.degrees((ancho + 2.0) / (RADIO + 36.0))
    cx, cz = orilla(a_ + paso_a / 2, 36.0)
    caja_girada('T', random.choice(FACHADAS), cx, cz, ancho / 2, 9.0, math.radians(a_ + paso_a / 2) + math.pi / 2, 0.0, random.choice([19, 22, 25, 28, 31]), techo=AZOTEA)
    n_ed += 1
    a_ += paso_a
# Y la ciudad detrás, en anillos.
for r in np.arange(86.0, 900.0, 46.0):
    a_ = -64.0
    while a_ < 176.0:
        paso_a = math.degrees(46.0 / (RADIO + r))
        cx, cz = orilla(a_ + random.uniform(-0.1, 0.1), r + random.uniform(-4, 4))
        a_ += paso_a
        if (cx < 24.0 and cz < 210.0) or random.random() < 0.07 or math.hypot(cx + 60.0, cz - 280.0) < 78:
            continue
        ax, az = random.choice((12.0, 13.5, 15.0, 16.5, 18.0)), random.choice((12.0, 13.5, 15.0, 16.5, 18.0))
        caja_girada('T', random.choice(FACHADAS), cx, cz, ax, az, math.radians(a_) + math.pi / 2, 0.0, random.choice([13, 16, 16, 19, 22, 28]), techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)

# La mezquita de Abu al-Abbas al-Mursi: el cuerpo ochavado, sus cúpulas y el alminar.
MX_, MZ_ = -60.0, 280.0
prisma('C', SILLERIA, [(MX_ + 30 * math.cos(2 * math.pi * i / 8 + 0.39), MZ_ + 30 * math.sin(2 * math.pi * i / 8 + 0.39)) for i in range(8)], 0.0, 15.0, techo=SILLERIA_O, baldosa=6.0)
torno('T', SILLERIA, en(MX_, MZ_, 15.0), [(11.0, 0.0), (11.0, 4.0), (10.2, 6.5), (8.0, 9.5), (4.5, 11.8), (0.0, 13.0)], lados=18, u_rep=8, v_m=5.0, tapas=(False, False))
for k in range(4):
    g = math.pi / 4 + k * math.pi / 2
    torno('T', SILLERIA, en(MX_ + 19 * math.cos(g), MZ_ + 19 * math.sin(g), 15.0), [(5.5, 0.0), (5.5, 2.0), (4.0, 5.0), (0.0, 6.6)], lados=14, u_rep=5, v_m=4.0, tapas=(False, False))
torno('T', SILLERIA, en(MX_ + 36.0, MZ_ - 10.0), [(3.2, 0.0), (2.8, 16.0), (3.6, 17.0), (3.6, 18.0), (2.3, 18.2), (2.1, 30.0), (2.9, 31.0), (2.9, 32.0), (1.5, 32.3), (1.4, 39.0), (2.0, 40.0), (0.0, 45.0)], lados=10, u_rep=4, v_m=5.0, tapas=(False, False))

# La Biblioteca, al otro lado de la bahía: el gran disco inclinado hacia el mar.
bx_, bz_ = orilla(-24.0, 70.0)
torno('T', ALUMINIO, en(bx_, bz_, 0.0, math.radians(-24.0) + math.pi / 2, (0.26, 0.0)), [(52.0, -16.0), (52.0, 5.0)], lados=30, tapas=(False, True))
caja_girada('T', BLANCO, bx_ + 60.0, bz_ + 30.0, 22.0, 14.0, 0.3, 0.0, 18.0, techo=AZOTEA)

# Las barcas del puerto, el dique de la bocana y, fondeado fuera, el barco de Creta.
for _ in range(46):
    g, r = random.uniform(95, 250), random.uniform(120, 560)
    x, z = BAHIA[0] + r * math.cos(math.radians(g)), BAHIA[1] + r * math.sin(math.radians(g))
    if x < 26.0:
        continue
    barca('T', x, z, random.uniform(0, 6.28), random.uniform(5, 9))
for a0, a1 in ((218.0, 246.0), (268.0, 296.0)):                                          # los dos brazos del dique
    arco_d = [orilla(a_) for a_ in np.arange(a0, a1 + 0.1, 2.0)]
    franja('T', HORMIGON_T, [(x - 6 * math.cos(math.radians(a0)), z) for x, z in arco_d], 1.4, arco_d, 1.4, ARRIBA, u_baldosa=6.0, cerrada=False)
    franja('T', HORMIGON_T, arco_d, 1.4, arco_d, MAR_Y - 1, V((0, 1, 0)), u_baldosa=6.0, cerrada=False)
    franja('T', HORMIGON_T, [(x - 6 * math.cos(math.radians(a0)), z) for x, z in arco_d], 1.4, [(x - 6 * math.cos(math.radians(a0)), z) for x, z in arco_d], MAR_Y - 1, V((0, -1, 0)), u_baldosa=6.0, cerrada=False)
def mercante (x, z, largo):
    """El barco de Creta, de proa a la fortaleza (a lo largo de x): casco negro,
    contenedores en cubierta y el puente a popa. De costado y cerca, tapaba media
    fortaleza en el plano que la mira desde el puerto."""
    caja('T', CASCO_NEGRO, x - largo / 2, x + largo / 2, z - largo * 0.075, z + largo * 0.075, MAR_Y - 1, 6.0, techo=CASCO_ROJO, baldosa=8)
    caja('T', BLANCO, x - largo * 0.43, x - largo * 0.3, z - largo * 0.06, z + largo * 0.06, 6.0, 20.0, techo=BLANCO, baldosa=8)
    for k in range(6):
        caja('T', random.choice(CONTENEDORES), x - largo * 0.26 + k * largo * 0.12, x - largo * 0.26 + (k + 0.9) * largo * 0.12, z - largo * 0.06, z + largo * 0.06, 6.0, random.choice([9.0, 11.5, 11.5, 14.0]), baldosa=8)
mercante(-420.0, -130.0, 150.0)

for x0, x1, z0, z1 in ((-3200.0, 3200.0, 1500.0, 3200.0), (1500.0, 3200.0, -700.0, 1500.0)):
    rect('CP', LLANO, x0, x1, z0, z1, 0.3, 200.0)
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
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-alejandria', ['P', 'E', 'GN', 'EV', 'EP']), ('lugar-alejandria-ciudad', ['C', 'G', 'T', 'CP'])],
    # Luz de día con el sol mandando (ver Salónica): el cielo de Blender, a poco que se suba, lo tiñe todo de azul.
    sol_hacia=SOL, sol_color=(1.0, 0.9, 0.72), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=49, cielo_giro=150,
    escala=0.6, satura=0.78, no_alumbran=('CP',), fundir=True)                # la sombra, menos azul: media Corniche da la espalda al sol
