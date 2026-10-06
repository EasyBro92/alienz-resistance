# Roma: dentro del Coliseo, como está hoy, hecho en Blender (06/10/2026).
#   blender -b -P herramientas/blender/lugar_roma.py              (entero)
#   blender -b -P herramientas/blender/lugar_roma.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_roma.py -- --reusar  (retocar la luz)
#
# Isidro pidió para Italia «lo mismo que en los de España y Francia» y eligió para
# Roma: se juega DENTRO DEL COLISEO, COMO ESTÁ HOY (en ruinas, con el sótano al
# aire), los alienz SALEN DEL PROPIO COLISEO, DE DÍA y llegada larga. Misma receta
# que Madrid, Valencia, Marsella y Lyon (horneado.py).
#
# Cómo es de verdad: una elipse de 188 × 156 m y 48 de alto, con la arena de
# 83 × 48 en el centro. Hoy la arena no tiene suelo: se ve el hipogeo, los muros
# de ladrillo de los pasillos y jaulas de debajo. De las gradas quedan las
# bóvedas y los muros radiales de ladrillo, escalonados. El anillo de fuera, de
# travertino con sus tres pisos de arcos y el ático, solo sigue en pie en medio
# perímetro; en el otro medio se cayó y se ve el anillo interior, más bajo.
#
# Aquí el eje largo va a lo largo del campo:
#   · se juega sobre una PISTA de tierra y arena que cruza la arena de punta a
#     punta, con el hipogeo abierto a los dos lados;
#   · en medio, una RUINA de columnas caídas que los alienz rodean (`ruina` en
#     la misión, con el mismo centro);
#   · a la IZQUIERDA y al FONDO, el muro exterior entero, con sus cuatro pisos;
#   · a la DERECHA, la mitad caída: solo el anillo interior, por donde entra el sol;
#   · al FONDO, en el eje, la puerta monumental: de su túnel salen los alienz
#     (`entrada` en la misión);
#   · a la ESPALDA, la brecha: ruinas bajas por las que entra la cámara.
# La base alien va sobre un tambor de piedra dentro del hipogeo, a la izquierda.
#
# LA PISTA VA A FONDO (Isidro, tras la primera versión: «detalla bien la pista,
# los objetos se ven muy cutres, el suelo también»). Aquella tenía el suelo de
# ruido con rayas y la ruina de cilindros y cajas grises sin textura. Ahora:
#   · el suelo es UNA textura para toda la pista, hecha con FOTOS de tierra y
#     arena, con su bordillo de travertino, sus trampillas, manchas y cascotes
#     (`tex_pista`), y no se repite;
#   · todo lo de la arena (pista, ruina, hipogeo, puerta) va en un grupo aparte
#     con SU mapa de luz (`luzS`), a unos 20 px por metro: las sombras de cada
#     columna y cada muro caen horneadas sobre el suelo;
#   · las piedras se hacen con `torno` y `bloque`, que llevan sus UV: fustes
#     estriados, basas, capiteles y sillares, no cajas de un color.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Euler
from horneado import *
import horneado as H

Z0 = -22.0                              # el centro de la arena
SOL = (0.55, 0.72, -0.25)               # de día: por encima de la mitad caída (la derecha)
iniciar('roma', 1753, eje=(0.0, Z0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def foto (nombre, lado=256, tono=None, contraste=0.85):
    """Una textura de Poly Haven como matriz (la fila 0 arriba), llevada a un tono."""
    ruta = os.path.join(H.PH, 'texturas', nombre, f'{nombre}_diff_1k.jpg')
    im = bpy.data.images.load(ruta)
    im.scale(lado, lado)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(lado, lado, 4)[::-1, :, :3].copy()
    bpy.data.images.remove(im)
    if tono is not None:
        px = np.array(rgb(tono), np.float32) + (px - px.mean(axis=(0, 1))) * contraste
    return np.clip(px, 0, 1)

def nube (h, w, cy, cx):
    """Manchas grandes y suaves, de 0 a 1: `cy` × `cx` celdas repartidas por la imagen."""
    r = H.E.rng.random((cy + 2, cx + 2)).astype(np.float32)
    ys, xs = np.linspace(0, cy, h, dtype=np.float32), np.linspace(0, cx, w, dtype=np.float32)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = (fy * fy * (3 - 2 * fy))[:, None], (fx * fx * (3 - 2 * fx))[None, :]
    return (r[y0][:, x0] * (1 - fy) * (1 - fx) + r[y0 + 1][:, x0] * fy * (1 - fx) + r[y0][:, x0 + 1] * (1 - fy) * fx + r[y0 + 1][:, x0 + 1] * fy * fx)

# --- la pista: una sola textura para todo el suelo donde se juega --------------------------
PX0, PX1, PZ0, PZ1 = -8.9, 8.9, -98.0, 12.0          # lo que cubre (x a lo ancho, z a lo largo): hasta detrás de los soldados, o se veía la costura
PW, PH_ = 512, 2048
def a_px (x, z):
    return int((x - PX0) / (PX1 - PX0) * PW), int((z - PZ0) / (PZ1 - PZ0) * PH_)

def tex_pista ():
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0], PW // t.shape[1], 1))
    tierra = tejar(foto('dirt_floor', 128, 0xa98d63, 0.95))
    arena = tejar(foto('sand_01', 128, 0xc9ad7a, 0.8))
    grava = tejar(foto('sandy_gravel_02', 128, 0x99835f, 0.95))
    # Tierra apisonada, con rodales de arena suelta y de grava: mezclando tres
    # fotos con manchas grandes no se nota que cada una se repite.
    m1 = np.clip((nube(PH_, PW, 44, 11) - 0.38) / 0.24, 0, 1)[..., None]
    m2 = np.clip((nube(PH_, PW, 30, 8) - 0.62) / 0.14, 0, 1)[..., None]
    a = tierra * (1 - m1) + arena * m1
    a = a * (1 - m2) + grava * m2
    a *= (0.88 + 0.24 * nube(PH_, PW, 18, 5))[..., None]
    xs = np.linspace(-1, 1, PW, dtype=np.float32)[None, :, None]
    a *= 1 + 0.12 * np.exp(-(xs / 0.42) ** 2)                      # el centro, más pisado y más claro
    a *= 1 - 0.2 * np.clip((np.abs(xs) - 0.7) / 0.3, 0, 1)         # los bordes, húmedos
    a *= (0.95 + 0.1 * nube(1, PW, 1, 70))[..., None]              # rodadas a lo largo
    yy, xx = np.mgrid[0:PH_, 0:PW]
    def mancha (x, z, radio, k, color=None):
        c, f = a_px(x, z)
        rx, rz = radio * PW / (PX1 - PX0), radio * PH_ / (PZ1 - PZ0)
        x0, x1, y0, y1 = max(0, int(c - rx * 2)), min(PW, int(c + rx * 2)), max(0, int(f - rz * 2)), min(PH_, int(f + rz * 2))
        if x1 <= x0 or y1 <= y0:
            return
        d = np.exp(-(((xx[y0:y1, x0:x1] - c) / rx) ** 2 + ((yy[y0:y1, x0:x1] - f) / rz) ** 2))[..., None]
        zona = a[y0:y1, x0:x1]
        zona[:] = zona * (1 - k * d) if color is None else zona * (1 - k * d) + np.array(color, np.float32) * k * d
    # Con mesura: la primera tanda, más cargada, dejaba el suelo a manchurrones negros.
    for _ in range(50):                                              # humedades y manchas viejas
        mancha(random.uniform(PX0, PX1), random.uniform(PZ0, PZ1), random.uniform(0.5, 1.8), random.uniform(0.06, 0.16))
    for _ in range(4):                                               # las quemaduras de la guerra
        x, z = random.uniform(-6, 6), random.uniform(-58, -10)
        mancha(x, z, random.uniform(1.1, 1.7), 0.3)
        mancha(x, z, 0.5, 0.35)
    for z in np.linspace(-96, -62, 9):                               # lo que rezuma del túnel
        mancha(random.uniform(-4, 4), z, random.uniform(1.2, 2.2), 0.22, (0.26, 0.46, 0.2))
    # Las trampillas por donde subían las fieras: tablones con herrajes, a ras de suelo.
    tabla = foto('plywood', 128, 0x6a5136, 0.9)
    for zc in np.arange(-56.0, 0.0, 11.5):
        for xc in (-6.35, 6.35):
            (c0, f0), (c1, f1) = a_px(xc - 1.15, zc - 1.6), a_px(xc + 1.15, zc + 1.6)
            t = np.tile(tabla, (2, 1, 1))[:f1 - f0, :c1 - c0].copy()
            for c in range(0, c1 - c0, 8):                           # los tablones
                t[:, c:c + 1] *= 0.5
                t[:, c + 1:c + 8] *= 0.85 + 0.25 * random.random()
            hierro = np.array((0.17, 0.16, 0.15), np.float32)
            for f in (int((f1 - f0) * 0.22), int((f1 - f0) * 0.76)):  # las dos pletinas
                t[f:f + 4] = hierro
                t[f + 1:f + 3, ::9] = hierro * 2.2
            t[:3] = hierro; t[-3:] = hierro; t[:, :3] = hierro; t[:, -3:] = hierro
            a[f0 - 2:f1 + 2, c0 - 2:c1 + 2] *= 0.6                   # la sombra del hueco
            a[f0:f1, c0:c1] = t
    # Losas de travertino atravesadas cada tanto, y el bordillo a los dos lados.
    piedra = tejar(foto('sandstone_blocks_08', 128, 0xcabd9f, 0.9))
    for z in np.arange(-88.0, 2.0, 23.0):
        f = a_px(0, z)[1]
        a[f - 5:f + 5, 18:-18] = piedra[f - 5:f + 5, 18:-18] * 0.9
        a[f - 6:f - 5, 18:-18] *= 0.55; a[f + 5:f + 6, 18:-18] *= 0.55
        for c in range(18, PW - 18, 46):
            a[f - 5:f + 5, c:c + 1] *= 0.6
    for lado in (slice(0, 16), slice(PW - 16, PW)):
        a[:, lado] = piedra[:, lado] * (0.92 + 0.14 * nube(PH_, 16, 60, 1))[..., None]
        for f in range(0, PH_, 30):
            a[f:f + 1, lado] *= 0.55
    a[:, 16:19] *= 0.6; a[:, PW - 19:PW - 16] *= 0.6
    # Piedrecillas: un punto claro con su sombra al lado.
    for _ in range(900):
        c, f = random.randrange(20, PW - 22), random.randrange(2, PH_ - 4)
        s = random.choice((1, 1, 2))
        a[f + 1:f + 1 + s, c + 1:c + 2 + s] *= 0.62
        a[f:f + s, c:c + 1 + s] = a[f:f + s, c:c + 1 + s] * 0.4 + np.array((0.62, 0.58, 0.5), np.float32) * random.uniform(0.5, 0.75)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_suelta (nombre, lado=256):
    """La misma tierra de la pista, en baldosa: para la plataforma de la espalda."""
    t = foto('dirt_floor', lado, 0xa98d63, 0.95)
    s = foto('sand_01', lado, 0xc9ad7a, 0.8)
    m = np.clip((nube(lado, lado, 4, 4) - 0.4) / 0.2, 0, 1)[..., None]
    return guardar(nombre, t * (1 - m) + s * m)

TRAVERTINO = 0xd2c5aa
def tex_arcos ():
    """Un piso del Coliseo: el arco entre dos semicolumnas, con su cornisa. Un vano por baldosa."""
    a = foto('sandstone_blocks_08', 256, TRAVERTINO, 0.9)
    yy, xx = np.mgrid[0:256, 0:256]
    cx, cy, r = 128, 136, 60
    arco = ((xx - cx) ** 2 + (yy - cy) ** 2 < r * r) | ((np.abs(xx - cx) < r) & (yy >= cy))
    rosca = ((xx - cx) ** 2 + (yy - cy) ** 2 < (r + 13) ** 2) & (yy < cy) & ~arco
    a[rosca] = a[rosca] * 1.1
    ang = np.arctan2(yy - cy, xx - cx)
    a[rosca & (np.abs(np.sin(ang * 9)) < 0.07)] *= 0.72              # las juntas de las dovelas
    # El hueco: a oscuras arriba, con algo de luz abajo, y la sombra del intradós a un lado.
    dentro = np.linspace(0.04, 0.2, 256, dtype=np.float32)[:, None, None] * np.array((1.0, 0.92, 0.82), np.float32)
    sombra = (1 - 0.55 * np.clip(1 - (xx - (cx - r)) / 24.0, 0, 1))[..., None]
    a[arco] = (np.broadcast_to(dentro, (256, 256, 3)) * sombra)[arco]
    for x0 in (0, 228):                                             # las semicolumnas, con su luz y su sombra
        a[28:, x0:x0 + 28] *= np.linspace(1.2, 0.7, 28, dtype=np.float32)[None, :, None]
        a[28:46, x0:x0 + 28] *= 1.1
    a[0:10] *= 1.15; a[10:24] *= 0.64; a[24:28] *= 1.05             # la cornisa
    a[28:52] *= np.linspace(0.75, 1.0, 24, dtype=np.float32)[:, None, None]   # y la sombra que echa
    a[244:256] *= 0.8
    return guardar('arcos', np.clip(a, 0, 1), 88)

def tex_atico ():
    """El ático: paño liso con pilastras, una ventana cada dos vanos y las ménsulas arriba."""
    a = np.tile(foto('sandstone_blocks_08', 256, TRAVERTINO, 0.9), (1, 2, 1))
    for x0 in (0, 244, 256, 500):
        a[:, x0:x0 + 12] *= 1.1
        a[:, x0 + 12:x0 + 16] *= 0.75
    a[104:168, 96:160] = (0.09, 0.08, 0.07)
    a[98:104, 90:166] *= 1.12
    a[0:10] *= 1.15
    for x in range(16, 512, 42):
        a[20:44, x:x + 14] *= 0.55
    return guardar('atico', np.clip(a, 0, 1), 88)

def tex_cavea ():
    """Lo que queda de las gradas: ladrillo, los muros radiales y las bocas de las bóvedas."""
    a = foto('red_brick', 256, 0x9a6648, 0.95)
    a *= (0.85 + 0.3 * nube(256, 256, 6, 6))[..., None]
    for x0 in (0, 128):                                             # el muro radial, de canto, y la sombra de su hueco
        a[:, x0:x0 + 18] = a[:, x0:x0 + 18] * 1.25
        a[:, x0 + 18:x0 + 30] *= np.linspace(0.5, 0.95, 12, dtype=np.float32)[None, :, None]
    for y0 in (52, 180):                                            # las bocas de las bóvedas, con su arco
        yy, xx = np.mgrid[0:256, 0:256]
        boca = ((xx - 78) ** 2 + (yy - (y0 + 20)) ** 2 < 28 ** 2) & (yy < y0 + 20) | ((np.abs(xx - 78) < 28) & (yy >= y0 + 20) & (yy < y0 + 44))
        a[boca] = (0.1, 0.08, 0.07)
    a[::32] *= 0.7                                                  # lo que queda de los escalones
    a[:40] *= np.array((0.86, 0.95, 0.78), np.float32)              # el verdín de arriba
    return guardar('cavea', np.clip(a, 0, 1), 86)

def tex_podio ():
    """El muro del podio: travertino, con la boca arqueada de un pasadizo en cada baldosa."""
    a = foto('sandstone_blocks_08', 256, 0xcdc0a6, 0.9)
    yy, xx = np.mgrid[0:256, 0:256]
    boca = ((xx - 128) ** 2 + (yy - 120) ** 2 < 44 ** 2) & (yy < 120) | ((np.abs(xx - 128) < 44) & (yy >= 120))
    marco = ((xx - 128) ** 2 + (yy - 120) ** 2 < 54 ** 2) & (yy < 120) & ~boca
    a[marco] = a[marco] * 1.12
    a[boca] = (np.broadcast_to(np.linspace(0.05, 0.16, 256, dtype=np.float32)[:, None, None] * np.array((1.0, 0.9, 0.8), np.float32), (256, 256, 3)))[boca]
    a[0:12] *= 1.15; a[12:22] *= 0.62
    a[236:256] *= 0.78
    return guardar('podio', np.clip(a, 0, 1), 86)

def tex_arcada ():
    """Los muros del hipogeo: ladrillo romano con un arco tapiado a medias en cada tramo."""
    a = foto('red_brick', 256, 0xa56d4c, 0.95)
    a *= (0.8 + 0.4 * nube(256, 256, 5, 5))[..., None]
    yy, xx = np.mgrid[0:256, 0:256]
    arco = ((xx - 128) ** 2 + (yy - 150) ** 2 < 52 ** 2) & (yy < 150) | ((np.abs(xx - 128) < 52) & (yy >= 150))
    rosca = ((xx - 128) ** 2 + (yy - 150) ** 2 < 64 ** 2) & (yy < 150) & ~arco
    a[rosca] = a[rosca] * 0.8 + np.array((0.78, 0.72, 0.62), np.float32) * 0.3      # dovelas de travertino
    a[arco] = (np.broadcast_to(np.linspace(0.06, 0.18, 256, dtype=np.float32)[:, None, None] * np.array((1.0, 0.9, 0.8), np.float32), (256, 256, 3)))[arco]
    a[220:256] *= np.array((0.8, 0.92, 0.74), np.float32)           # el verdín del pie
    return guardar('arcada', np.clip(a, 0, 1), 86)

def tex_fuste ():
    """El fuste de una columna: mármol gastado con sus veinte estrías y las juntas de los tambores."""
    a = foto('cracked_concrete_wall', 256, 0xddd4c0, 0.75)
    u = np.linspace(0, 1, 256, endpoint=False, dtype=np.float32)[None, :, None]
    a *= 0.74 + 0.26 * np.abs(np.cos(np.pi * 20 * u)) ** 0.6
    for y in (84, 170):
        a[y:y + 3] *= 0.55
    a *= (0.9 + 0.2 * nube(256, 256, 5, 3))[..., None]
    return guardar('fuste', np.clip(a, 0, 1), 88)

PISTA = material('pista', tex_pista(), rug=1.0)
TIERRA_P = material('tierra-pista', tex_suelta('tierra-pista'), rug=1.0)
FUSTE = material('fuste', tex_fuste(), rug=0.8)
MARMOL_R = material('marmol-roto', guardar('marmol-roto', foto('cracked_concrete_wall', 256, 0xd9cfba, 0.8)), rug=0.8)
TRAVERTINO_M = material('travertino-sillar', guardar('travertino-sillar', foto('sandstone_blocks_08', 256, 0xcfc2a7, 0.9)), rug=0.9)
ARCADA = material('arcada', tex_arcada(), rug=0.95)
LADRILLO_H = material('ladrillo-hipogeo', guardar('ladrillo-hipogeo', foto('red_brick', 256, 0xa56d4c, 0.95)), rug=0.95)
BOVEDA = material('boveda', guardar('boveda', foto('red_brick', 256, 0x6a4a38, 0.9)), rug=0.95)
TIERRA_H = material('tierra-hipogeo', guardar('tierra-hipogeo', foto('dirt_floor', 256, 0x8a7558, 0.95) * (0.82 + 0.36 * nube(256, 256, 5, 5))[..., None]), rug=1.0)
MUSGO = material('musgo', guardar('musgo', foto('leafy_grass', 256, 0x5f7340, 0.8)), rug=1.0)
MATA = material('mata', color=(0.24, 0.38, 0.16), rug=1.0)
HIERRO = material('hierro', color=(0.11, 0.11, 0.12), rug=0.6)
BRONCE_V = material('bronce-viejo', color=(0.28, 0.24, 0.16), rug=0.6)
BRASA = material('brillo-brasa', color=(1.0, 0.52, 0.12), emite=2.4)
ARCOS = material('arcos', tex_arcos(), rug=0.9)
ATICO = material('atico', tex_atico(), rug=0.9)
CAVEA = material('cavea', tex_cavea(), rug=0.95)
PODIO = material('podio', tex_podio(), rug=0.9)
PIEDRA = material('travertino', de_polyhaven('sandstone_blocks_08', 512, 0xd4c5a8), rug=0.9)
LADRILLO = material('ladrillo', de_polyhaven('castle_wall_varriation', 512, 0xa9714f), rug=0.95)
LADRILLO_OSC = material('ladrillo-oscuro', imagen_de(LADRILLO), tinte=0xb9a595, rug=0.95)
ADOQUIN = material('adoquin', de_polyhaven('cobblestone_floor_04', 512, 0x77736d), rug=0.9)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xaaa39a), rug=0.9)
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x6a8540), rug=1.0)
MARMOL = material('marmol', de_polyhaven('sandstone_blocks_08', 512, 0xf2efe8), rug=0.7)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xb0633e, contraste=0.9), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.6, 0.5, 0.42)))
NEGRO = material('negro', color=(0.03, 0.03, 0.035))
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
BRONCE = material('bronce', color=(0.2, 0.32, 0.26), rug=0.6)
# Roma es ocre, naranja y siena, con postigos verdes y marrones.
PALETA = [((0.9, 0.68, 0.42), (0.3, 0.36, 0.26)), ((0.88, 0.56, 0.36), (0.36, 0.28, 0.2)), ((0.93, 0.8, 0.56), (0.28, 0.38, 0.3)),
          ((0.8, 0.46, 0.32), (0.86, 0.8, 0.68)), ((0.9, 0.84, 0.7), (0.4, 0.3, 0.22))]
FACHADAS = [material(f'f-roma-{i}', tex_postigos(f'roma-{i}', b, p)) for i, (b, p) in enumerate(PALETA)]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.13, 0.27, 0.12), (0.17, 0.32, 0.14), (0.21, 0.36, 0.15)])]
TRONCO = material('tronco', color=(0.38, 0.28, 0.2))
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.84, 0.9, 0.95)), (0.07, (0.74, 0.85, 0.96)), (0.25, (0.46, 0.69, 0.94)), (0.6, (0.24, 0.5, 0.88)), (1.0, (0.13, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.6, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.16), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. PIEDRAS CON OFICIO: el torno y el bloque
# ==================================================================================
def torno (grupo, mat, m4, perfil, lados=18, u_rep=1.0, v_m=2.4, tapas=(True, True), roto=0.0):
    """Una pieza de revolución: `perfil` es una lista de (radio, altura) a lo largo
    del eje Z de `m4` (una matriz de Blender). Lleva sus UV: u da la vuelta y v sube
    en metros. Con `roto`, el último anillo sale mellado."""
    aros = []
    for k, (r, h) in enumerate(perfil):
        ultimo = k == len(perfil) - 1
        aros.append([m4 @ V((r * math.cos(2 * math.pi * i / lados), r * math.sin(2 * math.pi * i / lados),
                               h + (random.uniform(-roto, roto) if ultimo and roto else 0.0))) for i in range(lados)])
    for k in range(len(perfil) - 1):
        eje = m4 @ V((0, 0, (perfil[k][1] + perfil[k + 1][1]) / 2))
        for i in range(lados):
            j = (i + 1) % lados
            pts = [aros[k][i], aros[k][j], aros[k + 1][j], aros[k + 1][i]]
            cara(grupo, mat, pts, uvs=[(i / lados * u_rep, perfil[k][1] / v_m), ((i + 1) / lados * u_rep, perfil[k][1] / v_m),
                                       ((i + 1) / lados * u_rep, perfil[k + 1][1] / v_m), (i / lados * u_rep, perfil[k + 1][1] / v_m)],
                 hacia=(pts[0] + pts[2]) / 2 - eje)
    z = m4.to_3x3() @ V((0, 0, 1))
    if tapas[0]:
        cara(grupo, mat, aros[0], hacia=-z, baldosa=1.4)
    if tapas[1]:
        cara(grupo, mat, aros[-1], hacia=z, baldosa=1.4)

def bloque (grupo, mat, m4, tam, baldosa=1.5, mella=0.03):
    """Un sillar: una caja apoyada en la base de `m4`, con las esquinas algo
    comidas y sus UV por cara, a `baldosa` metros por repetición."""
    w, d, h = tam
    esq = {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (0, 1):
                esq[(sx, sy, sz)] = m4 @ V((sx * w / 2 * (1 - random.uniform(0, mella)), sy * d / 2 * (1 - random.uniform(0, mella)), sz * h * (1 - random.uniform(0, mella) * sz)))
    centro = m4 @ V((0, 0, h / 2))
    caras = [([(-1, -1, 0), (1, -1, 0), (1, -1, 1), (-1, -1, 1)], w, h), ([(1, 1, 0), (-1, 1, 0), (-1, 1, 1), (1, 1, 1)], w, h),
             ([(1, -1, 0), (1, 1, 0), (1, 1, 1), (1, -1, 1)], d, h), ([(-1, 1, 0), (-1, -1, 0), (-1, -1, 1), (-1, 1, 1)], d, h),
             ([(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)], w, d), ([(-1, 1, 0), (1, 1, 0), (1, -1, 0), (-1, -1, 0)], w, d)]
    for claves, a, b in caras:
        pts = [esq[c] for c in claves]
        cara(grupo, mat, pts, uvs=[(0, 0), (a / baldosa, 0), (a / baldosa, b / baldosa), (0, b / baldosa)], hacia=(pts[0] + pts[2]) / 2 - centro)

def en (x, z, y=0.0, giro=0.0, vuelco=(0.0, 0.0)):
    """La matriz de una pieza puesta en (x, z) del juego, a la altura y, girada y volcada."""
    return M.Translation(P(x, z, y)) @ Euler((vuelco[0], vuelco[1], giro)).to_matrix().to_4x4()

BASA = [(0.74, 0.0), (0.79, 0.07), (0.73, 0.15), (0.61, 0.19), (0.65, 0.26), (0.57, 0.32)]
CAPITEL = [(0.5, 0.0), (0.52, 0.1), (0.56, 0.14), (0.52, 0.18), (0.7, 0.34), (0.74, 0.4)]
def columna (grupo, x, z, alto, k=1.0, giro=0.0):
    """Una columna en pie y rota: plinto, basa y fuste estriado con el corte mellado."""
    bloque(grupo, MARMOL_R, en(x, z, 0.0, giro), (1.56 * k, 1.56 * k, 0.26 * k))
    torno(grupo, MARMOL_R, en(x, z, 0.26 * k, giro), [(r * k, h * k) for r, h in BASA], tapas=(False, False))
    torno(grupo, FUSTE, en(x, z, 0.58 * k, giro), [(0.55 * k, 0.0), (0.53 * k, alto * 0.5), (0.5 * k, alto)], lados=20, tapas=(False, True), roto=0.16 * k)

def tambor_caido (grupo, x, z, largo, giro, r=0.52, cabeceo=0.0, y=None):
    """Un tambor de fuste tumbado en el suelo."""
    m = en(x, z, r if y is None else y, giro, (math.pi / 2 + cabeceo, 0.0))
    torno(grupo, FUSTE, m, [(r, -largo / 2), (r * 0.97, largo / 2)], lados=20, roto=0.06)

def capitel (grupo, x, z, y=0.0, giro=0.0, tumbado=False, k=1.0):
    m = en(x, z, y + (0.75 * k if tumbado else 0.0), giro, (math.pi / 2 - 0.2, 0.0) if tumbado else (0.0, 0.0))
    torno(grupo, MARMOL_R, m, [(r * k, h * k) for r, h in CAPITEL], tapas=(True, False))
    bloque(grupo, MARMOL_R, m @ M.Translation((0, 0, 0.4 * k)), (1.5 * k, 1.5 * k, 0.2 * k))

def cascote (grupo, x, z, s, mat=None, y=0.0):
    bloque(grupo, mat or random.choice((MARMOL_R, TRAVERTINO_M)), en(x, z, y, random.uniform(0, 3), (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3))),
           (s * random.uniform(0.8, 1.5), s * random.uniform(0.7, 1.2), s * random.uniform(0.5, 0.9)), mella=0.2)

def mata (grupo, x, z, y, s=1.0):
    torno(grupo, MATA, en(x, z, y, random.uniform(0, 3)), [(0.3 * s, 0.0), (0.38 * s, 0.14 * s), (0.0, 0.5 * s)], lados=6, tapas=(False, False))

# ==================================================================================
# 3. EL COLISEO
# ==================================================================================
config_suelo(-1400, 1400, -1400, 1400, (-300, 300), (-320, 300))
# El hipogeo, poco hondo y con pocos muros anchos: con seis metros y pasillos
# estrechos no entraba el sol y jugando se veía un foso negro a cada lado.
HONDO = -3.4
N = 160                                  # dos tramos por cada uno de los 80 arcos
T = [-math.pi + 2 * math.pi * i / N for i in range(N)]      # -π/2 = el fondo, +π/2 = la espalda
def anillo (rx, rz):
    return [(rx * math.cos(t), Z0 + rz * math.sin(t)) for t in T]
R0, R1, R2, R3, R4, R5 = anillo(24, 41.5), anillo(30, 47.5), anillo(40, 57.5), anillo(50, 67.5), anillo(58, 75), anillo(78, 94)

def sm_ (a, b, x):
    f = max(0.0, min(1.0, (x - a) / (b - a)))
    return f * f * (3 - 2 * f)
def desgaste (t, k=1.0):
    return k * (0.5 * math.sin(t * 13 + 1.3) + 0.3 * math.sin(t * 29 + 0.4) + 0.2 * math.sin(t * 53))
# La brecha de la espalda: ruinas bajas, por donde entra la cámara.
def techo_ruina (t):
    d = abs(t - 0.48 * math.pi)
    return 7.0 + 1.6 * desgaste(t) + 90.0 * sm_(0.14 * math.pi, 0.2 * math.pi, d)
# Dónde sigue en pie el muro de fuera: la izquierda y el fondo.
def en_pie (t):
    return sm_(0.62 * math.pi, 0.68 * math.pi, t) if t > 0 else sm_(-0.26 * math.pi, -0.32 * math.pi, t)

CAP = [techo_ruina(t) for t in T]
PIE = [en_pie(t) for t in T]
H1A = [min(6.5, c) for c in CAP];        H1B = [min(9.5, c + 1.0) for c in CAP]
H2A = [min(15.5, c + 2.0) for c in CAP]; H2B = [min(19.0, c + 2.5) for c in CAP]
H3A = [min(26.0, c + 3.0) for c in CAP]; H3B = [min(30.0, c + 3.5) for c in CAP]
H3T = [h + 0.5 for h in H3B]
H4 = [min(33.5 + 4.5 * p + 1.6 * desgaste(t) * (1 - p), c + 4.5) for t, p, c in zip(T, PIE, CAP)]
H5 = [48.5 * p for p in PIE]
CERO = [0.0] * N

# La puerta del fondo: los anillos de abajo se abren para dejarle sitio.
PUERTA = 10.6
def en_la_puerta (pts, i):
    j = (i + 1) % N
    return (pts[i][1] + pts[j][1]) / 2 < Z0 and abs(pts[i][0] + pts[j][0]) / 2 < PUERTA

def pared (grupo, mat, pts, ya, yb, hacia, vanos=80.0, base=0.0, alto_v=11.5, hueco=False, solo=None):
    """Un muro que sigue un anillo, entre dos alturas que cambian a lo largo. La
    textura va por vanos a lo ancho y por METROS a lo alto: donde el muro está
    roto, el arco se corta, no se aplasta."""
    for i in range(N):
        j = (i + 1) % N
        if (hueco and en_la_puerta(pts, i)) or (solo and not solo(i)):
            continue
        if yb[i] - ya[i] < 0.08 and yb[j] - ya[j] < 0.08:
            continue
        u0, u1 = i / N * vanos, (i + 1) / N * vanos
        cara(grupo, mat, [P(pts[i][0], pts[i][1], ya[i]), P(pts[j][0], pts[j][1], ya[j]), P(pts[j][0], pts[j][1], yb[j]), P(pts[i][0], pts[i][1], yb[i])],
             uvs=[(u0, (ya[i] - base) / alto_v), (u1, (ya[j] - base) / alto_v), (u1, (yb[j] - base) / alto_v), (u0, (yb[i] - base) / alto_v)], hacia=hacia)

def rampa (grupo, mat, A, ya, B, yb, vanos=80.0, hueco=False, solo=None):
    """La superficie entre dos anillos: una grada, una terraza, un tejado."""
    for i in range(N):
        j = (i + 1) % N
        if (hueco and en_la_puerta(A, i)) or (solo and not solo(i)):
            continue
        u0, u1 = i / N * vanos, (i + 1) / N * vanos
        cara(grupo, mat, [P(A[i][0], A[i][1], ya[i]), P(A[j][0], A[j][1], ya[j]), P(B[j][0], B[j][1], yb[j]), P(B[i][0], B[i][1], yb[i])],
             uvs=[(u0, 0), (u1, 0), (u1, 1), (u0, 1)], hacia=ARRIBA)

def costillas (A, ya, B, yb, alto=0.9):
    """Los muros radiales de las gradas, en relieve: uno por vano, de canto."""
    for i in range(0, N, 2):
        if en_la_puerta(A, i) or yb[i] - ya[i] < 0.6:
            continue
        tx, tz = A[(i + 1) % N][0] - A[i - 1][0], A[(i + 1) % N][1] - A[i - 1][1]
        n = math.hypot(tx, tz)
        tx, tz = tx / n * 0.28, tz / n * 0.28
        q = [(A[i][0] - tx, A[i][1] - tz, ya[i]), (B[i][0] - tx, B[i][1] - tz, yb[i]), (B[i][0] + tx, B[i][1] + tz, yb[i]), (A[i][0] + tx, A[i][1] + tz, ya[i])]
        largo = math.hypot(B[i][0] - A[i][0], B[i][1] - A[i][1])
        uv = [(0, 0), (largo / 3, 0), (largo / 3, alto / 3), (0, alto / 3)]
        for a, b, lado in ((0, 1, V((-tx, tz, 0))), (3, 2, V((tx, -tz, 0)))):
            cara('E', LADRILLO, [P(q[a][0], q[a][1], q[a][2]), P(q[b][0], q[b][1], q[b][2]), P(q[b][0], q[b][1], q[b][2] + alto), P(q[a][0], q[a][1], q[a][2] + alto)], uvs=uv, hacia=lado)
        cara('E', LADRILLO, [P(x, z, y + alto) for x, z, y in q], hacia=ARRIBA, baldosa=3)

# --- por dentro: el podio, las tres gradas en ruinas y el anillo interior ------------------
pared('P', LADRILLO_H, R0, [HONDO] * N, CERO, 'dentro', vanos=60, base=HONDO, alto_v=3.4)          # el muro del hipogeo
pared('E', PODIO, R0, CERO, [3.6] * N, 'dentro', vanos=40, alto_v=3.6, hueco=True)
rampa('E', CAVEA, R0, [3.6] * N, R1, H1A, hueco=True)
pared('E', PODIO, R1, H1A, H1B, 'dentro', vanos=80, base=6.5, alto_v=3.0, hueco=True)
rampa('E', CAVEA, R1, H1B, R2, H2A, hueco=True)
pared('E', ARCOS, R2, H2A, H2B, 'dentro', base=15.5, alto_v=3.5)
rampa('E', CAVEA, R2, H2B, R3, H3A)
pared('E', ARCOS, R3, H3A, H3B, 'dentro', base=26.0, alto_v=4.0)
rampa('E', LADRILLO_OSC, R3, H3B, R4, H3T, vanos=40)
pared('E', ARCOS, R4, H3T, H4, 'dentro', base=30.5, alto_v=7.5)
costillas(R0, [3.6] * N, R1, H1A)
costillas(R1, H1B, R2, H2A)
# Donde el muro de fuera sigue en pie: la galería de arriba y su cara interior.
arriba = lambda i: PIE[i] > 0.5 or PIE[(i + 1) % N] > 0.5
rampa('E', LADRILLO_OSC, R4, H4, R5, H4, vanos=40, solo=arriba)
pared('E', ATICO, R5, H4, H5, 'dentro', vanos=40, base=33.5, alto_v=15.0, solo=arriba)

# --- por fuera: tres pisos de arcos y el ático; en la mitad caída, el anillo interior ---------
PISOS = [(0.0, 10.5), (10.5, 22.0), (22.0, 33.5)]
for (y0, y1) in PISOS:
    pared('C', ARCOS, R5, [min(y0, h) for h in H5], [min(y1, h) for h in H5], 'fuera', base=y0, alto_v=y1 - y0)
    pared('C', ARCOS, R4, [min(y0, h) for h in H4], [min(y1, h) for h in H4], 'fuera', base=y0, alto_v=y1 - y0,
          solo=lambda i: PIE[i] < 0.98 or PIE[(i + 1) % N] < 0.98)
pared('C', ATICO, R5, [min(33.5, h) for h in H5], H5, 'fuera', vanos=40, base=33.5, alto_v=15.0)
pared('C', ARCOS, R4, [min(33.5, h) for h in H4], H4, 'fuera', base=33.5, alto_v=11.5, solo=lambda i: PIE[i] < 0.98)
rampa('C', LADRILLO_OSC, R5, H5, anillo(79.2, 95.2), H5, vanos=40, solo=arriba)                  # el canto del muro

# --- la puerta del fondo: un arco monumental, y el túnel del que salen ------------------------
ZP = Z0 - 41.5                           # donde la arena toca el podio: -63.5
ZF = ZP + 0.8                            # el plano de la fachada de la puerta
LUZ, ARRANQUE, ALTO_P = 6.0, 2.5, 11.2   # media luz del arco, a qué altura arranca, y el alto del cuerpo
for lado in (-1, 1):                     # los machones, con su pilastra, su basa y su capitel
    caja('P', TRAVERTINO_M, lado * LUZ, lado * 9.8, -98, ZF, 0.0, ALTO_P, baldosa=2.4)
    caja('P', TRAVERTINO_M, lado * 7.25, lado * 8.55, ZF, ZF + 0.35, 0.7, 8.9, baldosa=2.4)
    caja('P', MARMOL_R, lado * 7.05, lado * 8.75, ZF, ZF + 0.55, 0.0, 0.7, baldosa=1.5)
    caja('P', MARMOL_R, lado * 7.05, lado * 8.75, ZF, ZF + 0.55, 8.9, 9.5, baldosa=1.5)
# El arco: la bóveda del túnel, las enjutas y las dovelas en resalte.
SEG = 16
arc = [(LUZ * math.cos(math.pi * k / SEG), ARRANQUE + LUZ * math.sin(math.pi * k / SEG)) for k in range(SEG + 1)]
ext = [(7.3 * math.cos(math.pi * k / SEG), ARRANQUE + 7.3 * math.sin(math.pi * k / SEG)) for k in range(SEG + 1)]
for k in range(SEG):
    (x0, y0), (x1, y1) = arc[k], arc[k + 1]
    (e0, f0), (e1, f1) = ext[k], ext[k + 1]
    cara('P', BOVEDA, [P(x0, ZF + 0.15, y0), P(x1, ZF + 0.15, y1), P(x1, -98, y1), P(x0, -98, y0)],
         uvs=[(k / 2, 0), ((k + 1) / 2, 0), ((k + 1) / 2, 12), (k / 2, 12)], hacia=V((-(x0 + x1) / 2, 0, ARRANQUE - (y0 + y1) / 2)))       # la bóveda
    cara('P', TRAVERTINO_M, [P(x0, ZF, y0), P(x1, ZF, y1), P(x1, ZF, ALTO_P), P(x0, ZF, ALTO_P)], hacia=V((0, -1, 0)), baldosa=2.4)   # la enjuta
    tono = MARMOL_R if k % 2 == 0 else TRAVERTINO_M
    cara('P', tono, [P(x0, ZF + 0.15, y0), P(x1, ZF + 0.15, y1), P(e1, ZF + 0.15, f1), P(e0, ZF + 0.15, f0)], hacia=V((0, -1, 0)), baldosa=1.6)   # la dovela
    cara('P', tono, [P(e0, ZF + 0.15, f0), P(e1, ZF + 0.15, f1), P(e1, ZF, f1), P(e0, ZF, f0)], hacia=V(((e0 + e1) / 2, 0, (f0 + f1) / 2 - ARRANQUE)), baldosa=1.6)
for lado in (-1, 1):                     # las jambas del túnel, de ladrillo
    cara('P', BOVEDA, [P(lado * LUZ, ZF + 0.15, 0.0), P(lado * LUZ, -98, 0.0), P(lado * LUZ, -98, ARRANQUE), P(lado * LUZ, ZF + 0.15, ARRANQUE)],
         uvs=[(0, 0), (12, 0), (12, 1), (0, 1)], hacia=V((-lado, 0, 0)))
bloque('P', MARMOL_R, en(0, ZF + 0.25, ARRANQUE + LUZ - 0.25), (1.1, 0.5, 1.9), mella=0.01)        # la clave
caja('P', MARMOL_R, -10.2, 10.2, -98, ZF + 0.6, ALTO_P, ALTO_P + 0.55, baldosa=1.8)               # la cornisa…
for x in np.arange(-9.9, 10.0, 0.62):                                                               # …con sus dentículos
    caja('P', MARMOL_R, x - 0.16, x + 0.16, ZF + 0.3, ZF + 0.52, ALTO_P - 0.36, ALTO_P, baldosa=1.0)
caja('P', TRAVERTINO_M, -9.6, 9.6, -98, ZF - 0.1, ALTO_P + 0.55, ALTO_P + 3.0, baldosa=2.4)         # el ático
caja('P', MARMOL_R, -4.6, 4.6, ZF - 0.1, ZF + 0.12, ALTO_P + 0.95, ALTO_P + 2.6, baldosa=3.0)       # la lápida
caja('P', MARMOL_R, -9.9, 9.9, -98, ZF + 0.25, ALTO_P + 3.0, ALTO_P + 3.4, baldosa=1.8)
cara('EP', NEGRO, [P(-LUZ, -97.9, 0.0), P(LUZ, -97.9, 0.0), P(LUZ, -97.9, 8.6), P(-LUZ, -97.9, 8.6)], hacia=V((0, -1, 0)))      # el fondo, a oscuras
for x in (-5.9, 5.9):                                                                              # y el resplandor de lo que hay dentro
    cara('EP', VERDE, [P(x, -96, 0.3), P(x, -80, 0.3), P(x, -80, 0.55), P(x, -96, 0.55)], hacia=V((-x, 0, 0)))
# El rastrillo, subido: los barrotes asoman bajo la clave.
for x in np.arange(-5.2, 5.3, 0.8):
    arriba_y = ARRANQUE + math.sqrt(max(0.0, LUZ * LUZ - x * x)) - 0.1
    if arriba_y > 6.9:
        barra('EV', HIERRO, P(x, ZF - 0.5, 6.6), P(x, ZF - 0.5, arriba_y), 0.13)
barra('EV', HIERRO, P(-4.4, ZF - 0.5, 6.85), P(4.4, ZF - 0.5, 6.85), 0.16)
# Dos braseros de bronce a los lados, encendidos.
for lado in (-1, 1):
    bx, bz = lado * 8.3, ZF + 2.4
    bloque('P', TRAVERTINO_M, en(bx, bz), (0.9, 0.9, 0.9))
    torno('P', BRONCE_V, en(bx, bz, 0.9), [(0.2, 0.0), (0.14, 0.5), (0.5, 0.75), (0.56, 0.95)], lados=12, tapas=(False, False))
    torno('EP', BRASA, en(bx, bz, 1.8), [(0.42, 0.0), (0.3, 0.3), (0.0, 0.85)], lados=8, tapas=(False, False))

# --- el hipogeo: los muros de los pasillos de debajo, al aire ---------------------------------
rect('P', TIERRA_H, -24, 24, Z0 - 41.5, Z0 + 41.5, HONDO, baldosa=5.0)
BASE = (-13.5, -44.0)
def dentro_arena (x, z, margen=1.0):
    return (x / (24 - margen)) ** 2 + ((z - Z0) / (41.5 - margen)) ** 2 < 1
def muro_roto (x0, x1, z0, z1):
    """Un muro de ladrillo con sus arcos, a tramos de alto distinto y con algún hueco: como han quedado."""
    a_lo_largo = (z1 - z0) > (x1 - x0)
    a, fin = (z0, z1) if a_lo_largo else (x0, x1)
    alto = random.choice((-0.25, -0.25, -0.7))
    while a < fin - 0.5:
        tramo = min(fin - a, random.uniform(2.6, 4.4))
        if random.random() < 0.12 and tramo > 2:                    # un hueco de paso
            a += tramo
            continue
        alto = random.choice((alto, alto, -0.25, -0.75, -1.35, -2.1))
        (cx0, cx1, cz0, cz1) = (x0, x1, a, a + tramo) if a_lo_largo else (a, a + tramo, z0, z1)
        mx, mz = (cx0 + cx1) / 2, (cz0 + cz1) / 2
        if dentro_arena(mx, mz) and math.hypot(mx - BASE[0], mz - BASE[1]) > 6.4:
            caja('P', ARCADA, cx0, cx1, cz0, cz1, HONDO, alto, techo=TRAVERTINO_M, baldosa=3.4)
            if random.random() < 0.3:                                # un sillar de travertino encima
                bloque('P', TRAVERTINO_M, en(mx, mz, alto, random.uniform(-0.2, 0.2) + (0 if a_lo_largo else math.pi / 2)), (0.95, 1.5, 0.5))
            if random.random() < 0.3:
                mata('P', mx + random.uniform(-0.3, 0.3), mz + random.uniform(-1, 1), alto, random.uniform(0.7, 1.2))
        a += tramo
for x in (10.2, 13.6, 17.2, 20.6):
    for lado in (-1, 1):
        d = 41.5 * math.sqrt(max(0.0, 1 - (x / 23.0) ** 2))
        muro_roto(lado * x - 0.6, lado * x + 0.6, Z0 - d, Z0 + d)
for z in np.arange(Z0 - 36, Z0 + 37, 9.0):                                                        # los muros de través
    for lado in (-1, 1):
        ancho = 24 * math.sqrt(max(0.0, 1 - ((z - Z0) / 41.5) ** 2)) - 1.0
        if ancho > 12:
            muro_roto(*((10.8, ancho) if lado > 0 else (-ancho, -10.8)), z - 0.5, z + 0.5)
for _ in range(70):                                                                                # matas, verdín y piedras caídas
    x, z = random.uniform(-23, 23), random.uniform(Z0 - 40, Z0 + 40)
    if abs(x) < 9.6 or not dentro_arena(x, z, 2.0) or math.hypot(x - BASE[0], z - BASE[1]) < 6.6:
        continue
    k = random.random()
    if k < 0.4:
        mata('P', x, z, HONDO, random.uniform(0.8, 1.6))
    elif k < 0.7:
        s = random.uniform(1.2, 2.6)
        rect('P', MUSGO, x - s, x + s, z - s * 0.7, z + s * 0.7, HONDO + 0.02, baldosa=3.0)
    else:
        cascote('P', x, z, random.uniform(0.4, 0.9), y=HONDO)
# Los muros que sostienen la pista, y el tambor de piedra de la base alien.
caja('P', ARCADA, PX0, PX0 + 0.5, ZP, PZ1, HONDO, -0.02, baldosa=3.4)
caja('P', ARCADA, PX1 - 0.5, PX1, ZP, PZ1, HONDO, -0.02, baldosa=3.4)
tambor = [(BASE[0] + 5.2 * math.cos(2 * math.pi * i / 24), BASE[1] + 5.2 * math.sin(2 * math.pi * i / 24)) for i in range(24)]
prisma('P', TRAVERTINO_M, tambor, HONDO, 0.0, techo=TRAVERTINO_M, baldosa=2.4)
prisma('P', MARMOL_R, [(BASE[0] + 5.5 * math.cos(2 * math.pi * i / 24), BASE[1] + 5.5 * math.sin(2 * math.pi * i / 24)) for i in range(24)], -0.4, -0.05, baldosa=1.6)

# --- la pista ---------------------------------------------------------------------------------
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
plataforma = [(PX0, PZ1)] + [(23.2 * math.cos(t), Z0 + 40.6 * math.sin(t)) for t in np.linspace(math.radians(140), math.radians(40), 15)] + [(PX1, PZ1)]
cara('P', TIERRA_P, [P(x, z, 0.0) for x, z in plataforma], hacia=ARRIBA, baldosa=5.0)

# --- la ruina del medio: columnas caídas que los alienz tienen que rodear ----------------------
# (`ruina` en la misión lleva el mismo centro y radio; zombie.js los aparta al pasar.)
RX, RZ = 0.0, -32.0
G = 1.25                                                                # todo un cuarto más grande: de lejos se quedaba en poca cosa
columna('P', RX - 1.4, RZ - 0.9, 4.3, k=G, giro=0.15)                   # una en pie, rota a media altura
columna('P', RX + 1.6, RZ + 1.1, 1.0, k=G, giro=-0.3)                   # el arranque de otra
tambor_caido('P', RX + 0.7, RZ - 1.95, 2.1, 0.55, r=0.52 * G)           # sus tambores, por el suelo
tambor_caido('P', RX + 2.5, RZ - 0.55, 1.55, 1.15, r=0.52 * G, cabeceo=0.1, y=0.75)
tambor_caido('P', RX - 0.25, RZ + 2.2, 1.25, -0.5, r=0.52 * G)
capitel('P', RX - 2.5, RZ + 1.25, giro=0.9, tumbado=True, k=G)          # el capitel, volcado
bloque('P', MARMOL_R, en(RX + 0.4, RZ + 0.3, 0.5, 0.35, (0.0, 0.36)), (2.9, 0.78, 0.68))          # un trozo de arquitrabe, apoyado en un tambor
bloque('P', TRAVERTINO_M, en(RX - 0.4, RZ - 2.6, 0.0, 1.1), (1.35, 0.95, 0.62))
for _ in range(18):
    a, d = random.uniform(0, 6.28), random.uniform(0.8, 3.5)
    cascote('P', RX + d * math.cos(a), RZ + d * math.sin(a), random.uniform(0.2, 0.45))

# --- las piezas sueltas a lo largo de la pista, como las tienen hoy expuestas ------------------
# Van fuera de los carriles (|x| > 7,5): no estorban, se ven al pasar.
for i, z in enumerate(np.arange(-56.0, 2.0, 7.2)):
    for lado in (-1, 1):
        if abs(z - (-44)) < 6 and lado < 0:
            continue                                                    # la base alien está ahí al lado
        x = lado * 8.25
        tipo = (i * 3 + (lado > 0) * 2) % 5
        if tipo == 0:
            capitel('P', x, z, giro=random.uniform(0, 1.5), k=0.72)
        elif tipo == 1:
            torno('P', FUSTE, en(x, z, 0.0, random.uniform(0, 3)), [(0.4, 0.0), (0.39, random.uniform(0.6, 1.1))], lados=16, roto=0.07)
        elif tipo == 2:
            bloque('P', MARMOL_R, en(x, z, 0.0, random.uniform(-0.4, 0.4), (lado * -0.25, 0.0)), (0.9, 0.22, 1.1))        # una lápida, apoyada
            bloque('P', TRAVERTINO_M, en(x + lado * 0.28, z, 0.0, random.uniform(-0.4, 0.4)), (0.8, 0.4, 0.35))
        elif tipo == 3:
            tambor_caido('P', x, z, 1.0, math.pi / 2 + random.uniform(-0.2, 0.2), r=0.38)
        else:
            bloque('P', TRAVERTINO_M, en(x, z, 0.0, random.uniform(-0.3, 0.3)), (0.85, 1.0, 0.45))
            bloque('P', TRAVERTINO_M, en(x, z + 0.1, 0.45, random.uniform(-0.5, 0.5)), (0.6, 0.7, 0.4))
for _ in range(60):                                                     # cascotes pequeños por toda la pista: se pisan
    cascote('P', random.uniform(-7.2, 7.2), random.uniform(-60, 2), random.uniform(0.1, 0.22))

comprobar_paso(('E', 'EP', 'P', 'EV'), salvo=('fuste', 'marmol-roto', 'travertino-sillar'), z_lejos=-62)

# ==================================================================================
# 4. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- la plaza de adoquín y el césped alrededor ------------------------------------------------
# El suelo de fuera lleva un HUECO donde está la arena (queda debajo de las
# gradas): de una pieza, en el vuelo tapaba la pista y el hipogeo con adoquín.
def con_hueco (mat, x0, x1, z0, z1, y, baldosa):
    hx, hz0, hz1 = 24.0, Z0 - 41.5, Z0 + 41.5
    suelo('G', mat, x0, -hx, z0, z1, y, baldosa)
    suelo('G', mat, hx, x1, z0, z1, y, baldosa)
    suelo('G', mat, -hx, hx, z0, hz0, y, baldosa)
    suelo('G', mat, -hx, hx, hz1, z1, y, baldosa)
con_hueco(ACERA, -1400, 1400, -1400, 1400, 0.0, 8.0)
con_hueco(ADOQUIN, -150, 150, -190, 150, 0.02, 5.0)
suelo('G', CESPED, 105, 330, -300, 200, 0.03, 8.0)                    # el Colle Oppio, a la derecha
suelo('G', CESPED, -420, -150, 60, 420, 0.03, 8.0)                    # el Palatino, a la izquierda y a la espalda
suelo('G', CALZADA, -520, -90, -205, -170, 0.04, carriles=(-205, 5.8, 'x'))     # Via dei Fori Imperiali

# --- el Arco de Constantino ---------------------------------------------------------------------
AX, AZ = -104.0, 62.0
caja('C', MARMOL, AX - 3.7, AX + 3.7, AZ - 13, AZ + 13, 0.0, 21.0, techo=MARMOL, baldosa=5)
for z, w, h in ((AZ, 3.3, 11.5), (AZ - 8, 1.8, 7.4), (AZ + 8, 1.8, 7.4)):
    for x, d in ((AX - 3.75, -1), (AX + 3.75, 1)):
        cara('CP', NEGRO, [P(x, z - w, 0.0), P(x, z + w, 0.0)] + [P(x, z + w * math.cos(a), h - w + w * math.sin(a)) for a in np.linspace(0, math.pi, 9)], hacia=V((d, 0, 0)))
for z in (AZ - 12, AZ - 4.6, AZ + 4.6, AZ + 12):
    for x in (AX - 4.3, AX + 4.3):
        barra('T', MARMOL, P(x, z, 0.0), P(x, z, 14.5), 0.9)

# --- el Foro y el Palatino: columnas sueltas, muros de ladrillo y pinos --------------------------
for _ in range(46):
    x, z = random.uniform(-520, -170), random.uniform(-150, 40)
    if random.random() < 0.5:
        n = random.choice([3, 4, 6])
        for k in range(n):
            barra('T', MARMOL, P(x + k * 3.2, z, 0.0), P(x + k * 3.2, z, 11.0), 1.0)
        caja('T', MARMOL, x - 0.8, x + (n - 1) * 3.2 + 0.8, z - 0.8, z + 0.8, 11.0, 12.6, baldosa=3)
    else:
        w = random.uniform(8, 22)
        caja('T', LADRILLO, x, x + w, z, z + random.uniform(3, 12), 0.0, random.uniform(3, 14), baldosa=4)
def colina (x, z):
    f = sm_(-150, -260, x) * sm_(40, 130, z)
    return 38.0 * f
filas = []
for i in range(14):
    z = 20 + i * 34
    filas.append([P(x, z, colina(x, z)) for x in np.linspace(-520, -140, 16)])
malla('T', CESPED, filas, ARRIBA, u_rep=10, v_rep=12)
for _ in range(260):                                                   # los pinos piñoneros
    x, z = random.uniform(-510, -150), random.uniform(30, 440)
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(1.4, 2.2), y=colina(x, z) - 0.4)
for _ in range(34):
    x, z = random.uniform(-470, -190), random.uniform(120, 380)
    y = colina(x, z)
    caja('T', LADRILLO, x, x + random.uniform(10, 28), z, z + random.uniform(8, 20), y - 2, y + random.uniform(5, 16), baldosa=4)
for _ in range(150):                                                   # el parque del Colle Oppio
    arbol('T', TRONCO, HOJAS, random.uniform(110, 325), random.uniform(-295, 195), random.uniform(1.2, 2.0))

# --- el Vittoriano, blanco, al final de la avenida -----------------------------------------------
VX, VZ = -640.0, -190.0
caja('C', MARMOL, VX - 60, VX, VZ - 65, VZ + 65, 0.0, 22.0, techo=MARMOL, baldosa=6)
caja('C', MARMOL, VX - 50, VX - 16, VZ - 58, VZ + 58, 22.0, 46.0, techo=MARMOL, baldosa=6)
for z in np.arange(VZ - 54, VZ + 55, 6.0):
    barra('T', MARMOL, P(VX - 14, z, 22.0), P(VX - 14, z, 44.0), 1.7)
for z in (VZ - 60, VZ + 60):
    cubo('T', BRONCE, P(VX - 32, z, 51.0), (9.0, 6.0, 9.0))

# --- la ciudad: manzanas ocres con tejado de teja ------------------------------------------------
PASO = 48.0
n_ed = 0
for x in np.arange(-1350.0, 1350.0, PASO):
    for z in np.arange(-1350.0, 1350.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if math.hypot(cx, (cz - Z0) * 0.85) < 190:              # la plaza del Coliseo
            continue
        if -545 < cx < -130 and -215 < cz < 440:                # el Foro, el Palatino y la avenida
            continue
        if 95 < cx < 340 and -310 < cz < 210:                   # el Colle Oppio
            continue
        if VX - 80 < cx < VX + 20 and VZ - 85 < cz < VZ + 85:
            continue
        if random.random() < 0.07:
            continue
        cerca = math.hypot(cx, cz - Z0) < 420
        alto = random.choice([15, 18, 18, 21])
        caja('C' if cerca else 'T', random.choice(FACHADAS), x + 6, x + PASO - 6, z + 6, z + PASO - 6, 0.0, alto, techo=AZOTEA)
        if cerca:
            tejado('C', TEJA, x + 6, x + PASO - 6, z + 6, z + PASO - 6, alto, 2.4)
        n_ed += 1
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3000.0, 0.0, Z0)

# ==================================================================================
# 5. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-roma', ['P', 'E', 'EV', 'EP']), ('lugar-roma-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.86), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=50, cielo_giro=150,
    escala=0.42, satura=0.8, no_alumbran=('CP',))
