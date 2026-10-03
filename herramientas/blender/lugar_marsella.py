# Marsella: el Vieux-Port, hecho en Blender (03/10/2026).
#   blender -b -P herramientas/blender/lugar_marsella.py              (entero)
#   blender -b -P herramientas/blender/lugar_marsella.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_marsella.py -- --reusar  (retocar la luz)
#
# Isidro eligió: se juega EN EL MUELLE, los alienz DESEMBARCAN DEL MAR y por la
# MAÑANA con sol. Con la misma receta que Madrid y Valencia (horneado.py).
#
# Cómo es de verdad: el puerto viejo es un rectángulo de agua de unos 900 × 300 m
# abierto al oeste, lleno de veleros amarrados a pantalanes. Aquí se juega en el
# Quai du Port (el muelle norte), mirando hacia la bocana (oeste):
#   · a la IZQUIERDA el agua del puerto con los barcos amarrados de popa al muelle;
#   · a la DERECHA el paseo con terrazas y las fachadas de Pouillon, de piedra clara
#     con soportales, y el Hôtel de Ville;
#   · al FONDO, una dársena donde han varado tres barcazas alienígenas con la rampa
#     echada sobre el muelle: de ahí bajan;
#   · más allá (solo en el vuelo): el fuerte Saint-Jean y el MuCEM en la bocana, la
#     catedral de La Major, el fuerte Saint-Nicolas enfrente, el muelle de Rive
#     Neuve al otro lado del agua y, en lo alto de su colina, Notre-Dame de la
#     Garde con la Bonne Mère dorada. A la espalda, el Quai des Belges con la
#     Ombrière, la marquesina de espejo.
#
# DADO LA VUELTA (03/10). Isidro, después de verlo: «quiero invertir de dónde
# vienen los aliens por el lado que vienen los soldados, lo mismo para los
# soldados; la antena tiene que quedar a un lado, pero bien integrada en el mar,
# junto a alguna barca, sin que se traspasen». Así que el guion sigue escrito
# como arriba (x = la derecha mirando a la bocana, z hacia el este), pero todo
# gira media vuelta alrededor de z = VUELTA (`dar_la_vuelta`): en el juego se
# mira al ESTE, al fondo del puerto, con la bocana y el mar a la espalda de los
# soldados; el agua queda a la DERECHA y las fachadas a la IZQUIERDA. Las
# barcazas han varado en la esquina del Quai des Belges, al fondo, y la antena
# va en una barcaza alienígena amarrada de popa al muelle entre los barcos.
# Cuentas: juego (x, z) = guion (-x, 2·VUELTA - z).
#
# Jugando, en un móvil en vertical, solo cabe hasta x ≈ 12 a mitad del campo y 20
# al fondo, y nada alto a lo lejos: Notre-Dame no se ve desde el muelle (está
# demasiado lejos y demasiado arriba para el encuadre); la enseña el vuelo.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.45, 0.52, 0.75)               # mañana: del este y algo del sur (en el guion, sin girar)
VUELTA = -50.0
dar_la_vuelta(VUELTA)
SOL_JUEGO = (-SOL[0], SOL[1], -SOL[2])  # el mismo sol visto desde el juego: de frente y por la derecha
iniciar('marsella', 1599, eje=(-60.0, -150.0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_postigos (nombre, base, postigo, plantas_bajo=False):
    """Fachada marsellesa: piedra clara, ventanas altas con contraventanas de
    color, algunas cerradas, y balcones de hierro."""
    a = lienzo(512, 512, base) + ruido(512, 512, 0.05)[..., None]
    for f in range(4):
        for c in range(4):
            x0, y0 = c * 128, f * 128
            cris = np.array((0.08, 0.1, 0.13)) * (0.8 + 0.5 * random.random())
            v = a[y0 + 16:y0 + 104, x0 + 40:x0 + 88]
            v[:] = (0.86, 0.84, 0.8)                                  # el marco
            grad = np.linspace(1.6, 0.8, 80, dtype=np.float32)[:, None, None]
            v[4:-4, 4:-4] = np.clip(cris * grad + np.array(H.E.reflejo) * (grad - 0.8), 0, 1)
            cerrada = random.random()
            pc = np.array(postigo) * (0.85 + 0.3 * random.random())
            if cerrada < 0.3:                                       # cerrada del todo
                v[2:-2, 2:-2] = pc
                for k in range(8, 84, 6):
                    v[k:k + 1, 2:-2] *= 0.7                          # las lamas
            else:
                for lado in (0, 1):                                  # abiertas, a los lados
                    x = x0 + (16 if lado == 0 else 90)
                    a[y0 + 16:y0 + 104, x:x + 22] = pc
                    for k in range(y0 + 20, y0 + 100, 6):
                        a[k:k + 1, x:x + 22] *= 0.72
            if random.random() < 0.45:                              # balcón de hierro
                a[y0 + 98:y0 + 101, x0 + 30:x0 + 98] = (0.1, 0.1, 0.11)
                for k in range(x0 + 30, x0 + 98, 5):
                    a[y0 + 80:y0 + 101, k:k + 1] = (0.1, 0.1, 0.11)
                a[y0 + 101:y0 + 106, x0 + 26:x0 + 102] = np.array(base) * 0.75
            a[y0 + 104:y0 + 108, x0 + 36:x0 + 92] = np.array(base) * 0.8   # el alféizar
        a[f * 128 + 124:f * 128 + 128] = np.array(base) * 0.85        # la imposta
    return guardar(nombre, a)

def tex_tiendas ():
    """El fondo de los soportales de Pouillon: escaparates con su rótulo y la
    puerta, cuatro tiendas por baldosa, cada una de un color."""
    a = lienzo(256, 512, (0.74, 0.69, 0.6)) + ruido(256, 512, 0.04)[..., None]
    for c in range(4):
        x0 = c * 128
        rot = np.array(random.choice([(0.55, 0.12, 0.1), (0.12, 0.25, 0.4), (0.15, 0.3, 0.2), (0.2, 0.18, 0.16), (0.6, 0.45, 0.15)]))
        a[30:62, x0 + 8:x0 + 120] = rot                                         # el rótulo
        a[36:56, x0 + 20:x0 + 108] = rot * 1.6                                  # las letras, a bulto
        a[70:246, x0 + 8:x0 + 120] = (0.2, 0.19, 0.18)                          # el marco
        vid = np.linspace(0.75, 0.35, 168, dtype=np.float32)[:, None, None] * np.array((0.55, 0.5, 0.4))
        a[74:242, x0 + 12:x0 + 82] = vid                                        # el escaparate con luz
        a[74:242, x0 + 88:x0 + 116] = (0.1, 0.09, 0.08)                         # la puerta
    a[246:] = (0.52, 0.5, 0.46)
    return guardar('tiendas', a)

def tex_soportal ():
    """Los soportales de la planta baja: arcos oscuros con escaparates."""
    a = lienzo(256, 512, (0.78, 0.72, 0.6)) + ruido(256, 512, 0.04)[..., None]
    yy, xx = np.mgrid[0:256, 0:512]
    for c in range(4):
        cx = c * 128 + 64
        dentro = ((np.abs(xx - cx) < 46) & (yy > 70)) | (((xx - cx) ** 2 + (yy - 70) ** 2) < 46 ** 2)
        a[dentro] = (0.13, 0.12, 0.11)
        a[(np.abs(xx - cx) < 34) & (yy > 120) & (yy < 236)] = (0.62, 0.5, 0.36)   # el escaparate con luz
    a[236:] = (0.6, 0.56, 0.5)
    return guardar('soportal', a)

def tex_agua ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((4, 1, 0.0), (7, 3, 1.3), (11, 2, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 1.2 * np.sin(2 * np.pi * (u * fy * 2 - v * fx)))
    brillo = np.clip(onda / 3, -1, 1)
    a = np.stack([0.07 + 0.05 * brillo, 0.3 + 0.08 * brillo, 0.38 + 0.1 * brillo], axis=-1)
    a += (np.clip(brillo - 0.75, 0, 1) * 1.6)[..., None] * np.array((0.6, 0.7, 0.75))
    return guardar('agua', a, 88)

def tex_losa ():
    """La piedra clara del muelle, en losas grandes."""
    a = lienzo(256, 256, (0.72, 0.68, 0.61)) + ruido(256, 256, 0.09)[..., None]
    for i in range(4):
        for j in range(4):                        # losas de dos tamaños, a matajunta
            x0 = j * 64 + (32 if i % 2 else 0)
            for x in (x0, x0 + 64):
                a[i * 64:(i + 1) * 64, x % 256:(x % 256) + 64] *= 0.94 + 0.08 * random.random()
    a[::64] *= 0.8; a[1::64] *= 0.9
    for i in range(4):
        a[i * 64:(i + 1) * 64, (i % 2) * 32::64] *= 0.82
    for _ in range(40):                           # manchas y desgaste
        x, y = random.randint(0, 240), random.randint(0, 240)
        a[y:y + random.randint(4, 14), x:x + random.randint(4, 14)] *= 0.9
    return guardar('losa', a)

def tex_rayado (nombre, a_col, b_col, franja=16):
    """Piedra a franjas (La Major, Notre-Dame): verde de Florencia y blanca de Calissanne."""
    a = lienzo(256, 256, a_col) + ruido(256, 256, 0.04)[..., None]
    for y in range(0, 256, franja * 2):
        a[y:y + franja] = np.array(b_col) + ruido(franja, 256, 0.04)[..., None]
    return guardar(nombre, a)

def tex_celosia ():
    """La piel del MuCEM: celosía de hormigón oscuro con huecos de formas de ramas."""
    a = lienzo(256, 256, (0.28, 0.25, 0.22))
    rng = H.E.rng
    for _ in range(140):
        x, y = rng.integers(0, 256, 2)
        r = rng.integers(4, 11)
        yy, xx = np.ogrid[-r:r, -r:r]
        m = (xx ** 2 + (yy * 1.6) ** 2) < r * r
        ys, xs = (np.arange(-r, r) + y) % 256, (np.arange(-r, r) + x) % 256
        sub = a[np.ix_(ys, xs)]
        sub[m] = (0.08, 0.08, 0.09)
        a[np.ix_(ys, xs)] = sub
    return guardar('celosia', a)

LOSA = material('losa', tex_losa(), rug=0.85)
LOSA_GRIS = material('losa-gris', imagen_de(LOSA), tinte=0xa9a59e, rug=0.85)
GRANITO = material('granito', de_polyhaven('cobblestone_floor_04', 512, 0x8d8a85), rug=0.8)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xcdb48c), rug=0.9)
SILLAR_OSCURO = material('sillar-oscuro', imagen_de(SILLAR), tinte=0xb39a7a, rug=0.9)
ROCA = material('roca', de_polyhaven('rock_face_03', 512, 0xb9b1a3), rug=0.95)
MONTE = material('monte', de_polyhaven('sparse_grass', 512, 0x7c7f5f), rug=1.0)
AGUA = material('agua', tex_agua(), rug=0.1)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xa49d92), rug=0.9)
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xa8583a, contraste=0.9), rug=0.9)
AZOTEA = material('azotea', tex_azotea((0.52, 0.47, 0.42)))
SOPORTAL = material('soportal', tex_soportal())
TIENDAS = material('tiendas', tex_tiendas())
TECHO_SOPORTAL = material('techo-soportal', color=(0.55, 0.52, 0.47), rug=0.9)
PINTURA = material('pintura-calle', color=(0.86, 0.86, 0.83), rug=0.8)
CHAPAS = [material(f'chapa-coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.85, 0.85, 0.84), (0.1, 0.1, 0.11), (0.55, 0.57, 0.6), (0.5, 0.08, 0.07), (0.12, 0.2, 0.42), (0.85, 0.85, 0.84)])]
BUS = material('bus-rtm', color=(0.9, 0.9, 0.88), rug=0.4)
BUS_FRANJA = material('bus-franja', color=(0.1, 0.35, 0.62), rug=0.4)
F_POUILLON = material('f-pouillon', tex_postigos('pouillon', (0.83, 0.77, 0.65), (0.42, 0.36, 0.3)))
F_PISOS = [material(f'f-pisos-{i}', tex_postigos(f'pisos-{i}', b, p)) for i, (b, p) in enumerate([
    ((0.86, 0.74, 0.55), (0.3, 0.45, 0.38)), ((0.9, 0.84, 0.72), (0.35, 0.47, 0.6)),
    ((0.8, 0.62, 0.44), (0.55, 0.32, 0.22)), ((0.88, 0.8, 0.66), (0.62, 0.62, 0.58))])]
F_AYUNTAMIENTO = material('f-ayuntamiento', tex_crema('ayuntamiento', (0.85, 0.8, 0.7), balcon=0.2))
RAYADO = material('rayado', tex_rayado('rayado', (0.87, 0.84, 0.76), (0.3, 0.38, 0.3)), rug=0.7)
CELOSIA = material('celosia', tex_celosia(), rug=0.9)
VIDRIO = material('vidrio', color=(0.1, 0.13, 0.16), rug=0.2)
ORO = material('oro', color=(0.95, 0.72, 0.28), rug=0.3)
ESPEJO = material('espejo', color=(0.82, 0.84, 0.86), rug=0.15)
MADERA = material('madera', color=(0.42, 0.32, 0.22), rug=0.8)
METAL = material('metal', color=(0.2, 0.21, 0.22), rug=0.5)
MASTIL = material('mastil', color=(0.82, 0.83, 0.85), rug=0.4)
CASCOS = [material(f'casco-{i}', color=c, rug=0.4) for i, c in enumerate([(0.93, 0.93, 0.92), (0.93, 0.93, 0.92), (0.9, 0.9, 0.88), (0.1, 0.17, 0.32), (0.6, 0.12, 0.1), (0.2, 0.32, 0.4)])]
CUBIERTA = material('cubierta-barco', color=(0.6, 0.48, 0.34), rug=0.7)
FONDOS = [material(f'fondo-barco-{i}', color=c, rug=0.6) for i, c in enumerate([(0.42, 0.09, 0.08), (0.08, 0.11, 0.2), (0.07, 0.07, 0.08)])]
VERDUGO = material('verduguillo', color=(0.22, 0.2, 0.19), rug=0.5)
TECA_OSCURA = material('teca-oscura', color=(0.42, 0.33, 0.24), rug=0.8)
DEFENSA = material('defensa', color=(0.14, 0.24, 0.52), rug=0.5)
CABO = material('cabo', color=(0.78, 0.72, 0.6), rug=0.9)
NEGRO_BARCO = material('negro-barco', color=(0.08, 0.08, 0.09), rug=0.4)
LONA = [material(f'lona-{i}', color=c, rug=0.9) for i, c in enumerate([(0.9, 0.9, 0.86), (0.75, 0.2, 0.15), (0.2, 0.4, 0.55), (0.9, 0.8, 0.3)])]
CHAPA_ALIEN = material('chapa-alien', color=(0.13, 0.15, 0.14), rug=0.5)
CHAPA_ALIEN_2 = material('chapa-alien-2', color=(0.2, 0.23, 0.21), rug=0.5)
LUZ_ALIEN = material('brillo-alien', color=(0.45, 1.0, 0.55), emite=4.0)
NEGRO = material('negro', color=(0.02, 0.025, 0.02))
FAROLA = material('brillo-farola', color=(1.0, 0.86, 0.6), emite=1.5)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.17, 0.3, 0.11), (0.22, 0.34, 0.13), (0.27, 0.38, 0.15)])]
TRONCO = material('tronco', color=(0.35, 0.29, 0.22))
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.82, 0.88, 0.94)), (0.07, (0.74, 0.84, 0.95)), (0.25, (0.48, 0.69, 0.93)), (0.6, (0.26, 0.5, 0.86)), (1.0, (0.15, 0.36, 0.75))],
    (SOL[0], SOL[2]), 0.35, (0.28, 0.24, 0.16), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.25), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LO QUE RODEA AL CAMPO (se ve toda la partida)
# ==================================================================================
# Grupos: S el muelle (luz del juego) · E lo cercano con mapa de luz · EV lo fino
# cercano (barcos, farolas, bolardos) · EP lo que no lleva luz (el agua, la
# bodega negra). Y para el vuelo: C, G, T y CP.
config_suelo(-1600, 1600, -1700, 1300, (-360, 260), (-560, 260))
# Como es el Quai du Port de verdad, del agua a las casas: el muelle ancho de
# losas claras (donde se juega), el bordillo, la calzada de dos carriles con su
# tráfico, la acera con las terrazas y los soportales de Pouillon, de pilares
# cuadrados, con las tiendas al fondo.
ORILLA = -8.4                            # el canto del agua
CALLE0, CALLE1 = 9.4, 16.4               # la calzada: dos carriles de 3,5
FX = 19.5                                # la línea de los pilares de los soportales
HONDO = 3.2                              # lo que se mete el soportal hasta las tiendas
DERECHA = FX - 2.0
# El muelle: Z_FONDO es donde acaba por el lado de las barcazas (en el juego,
# z = -124, el fondo) y Z_ATRAS donde deja de verse jugando (a la espalda de la
# cámara); más allá sigue, solo para el vuelo, hasta el fuerte Saint-Jean.
Z_FONDO, Z_ATRAS, Z_BOCANA = 24.0, -140.0, -400.0
AGUA_Y = -1.6

# --- el muelle: losas claras, cenefa de granito y el canto de piedra -------------------
rect('S', LOSA, ORILLA + 1.0, 9.0, Z_ATRAS, Z_FONDO, 0.0, baldosa=4.0)
rect('S', GRANITO, ORILLA, ORILLA + 1.0, Z_ATRAS, Z_FONDO, 0.0, baldosa=3.0)    # la cenefa del canto
rect('S', GRANITO, 9.0, CALLE0, Z_ATRAS, Z_FONDO, 0.0, baldosa=3.0)            # el bordillo
uv_calle = lambda x0, x1, z0, z1: [((x - CALLE0) / 3.5, zz / 12) for x, zz in ((x0, z1), (x1, z1), (x1, z0), (x0, z0))]
rect('S', CALZADA, CALLE0, CALLE1, Z_ATRAS, Z_FONDO, 0.0, uvs=uv_calle(CALLE0, CALLE1, Z_ATRAS, Z_FONDO))
rect('S', LOSA_GRIS, CALLE1, FX + HONDO, Z_ATRAS, Z_FONDO, 0.0, baldosa=4.0)    # la acera y el suelo del soportal
suelo('GN', LOSA, ORILLA + 1.0, 9.0, Z_BOCANA, Z_ATRAS, 0.0, 4.0)
suelo('GN', GRANITO, ORILLA, ORILLA + 1.0, Z_BOCANA, Z_ATRAS, 0.0, 3.0)
suelo('GN', LOSA_GRIS, 9.0, 60, Z_BOCANA, Z_ATRAS, 0.0, 4.0)
suelo('GN', LOSA_GRIS, 9.0, 60, Z_FONDO, 75, 0.0, 4.0)                          # junto a la dársena
suelo('GN', LOSA, -175, 60, 75, 122, 0.0, 4.0)                                  # la explanada del Quai des Belges
# La calzada sigue por detrás de la cámara hacia la bocana y, por el fondo, junto a
# la dársena hasta el Quai des Belges, donde tuerce delante de sus casas.
suelo('GN', CALZADA, CALLE0, CALLE1, Z_BOCANA, Z_ATRAS, 0.02, carriles=(CALLE0, 3.5, 'z'))
suelo('GN', CALZADA, CALLE0, CALLE1, Z_FONDO, 108, 0.02, carriles=(CALLE0, 3.5, 'z'))
suelo('GN', CALZADA, -175, CALLE1, 108, 119, 0.02, carriles=(108, 5.5, 'x'))
# El fondo del juego: el suelo de la ciudad que asoma detrás del Quai des Belges.
suelo('GN', ACERA, -175, 200, 119, 400, -0.01, 6.0)

# El muro del muelle, del agua al canto, y los de la dársena del fondo.
def muro (grupo, x, z0, z1):
    cara(grupo, SILLAR_OSCURO, [P(x, z0, AGUA_Y), P(x, z1, AGUA_Y), P(x, z1, 0), P(x, z0, 0)], hacia=V((-1, 0, 0)), baldosa=3)
muro('E', ORILLA, Z_ATRAS, Z_FONDO)
muro('C', ORILLA, Z_BOCANA, Z_ATRAS)
muro('E', 9.0, Z_FONDO, 75)
cara('E', SILLAR_OSCURO, [P(ORILLA, Z_FONDO, AGUA_Y), P(9.0, Z_FONDO, AGUA_Y), P(9.0, Z_FONDO, 0), P(ORILLA, Z_FONDO, 0)], hacia=V((0, -1, 0)), baldosa=3)
cara('E', SILLAR_OSCURO, [P(-175, 75, AGUA_Y), P(9.0, 75, AGUA_Y), P(9.0, 75, 0), P(-175, 75, 0)], hacia=V((0, 1, 0)), baldosa=3)

# --- el agua: todo el puerto y la dársena del fondo ---------------------------------
rect('EP', AGUA, -175, ORILLA, -470, 75, AGUA_Y, baldosa=18.0)
rect('EP', AGUA, ORILLA, 9.0, Z_FONDO, 75, AGUA_Y, baldosa=18.0)

# --- las barcazas alienígenas, varadas en la dársena con la rampa echada ------------
# La proa en z0, sobre el canto del muelle; el casco hacia el fondo (+z).
def barcaza (cx, z0, largo=17.0, ancho=8.6):
    z1 = z0 + largo
    x0, x1 = cx - ancho / 2, cx + ancho / 2
    # el casco: fondo, costados altos con la borda y la popa con su torre
    caja('E', CHAPA_ALIEN, x0, x0 + 0.6, z0, z1, AGUA_Y - 0.3, 3.6, baldosa=4)
    caja('E', CHAPA_ALIEN, x1 - 0.6, x1, z0, z1, AGUA_Y - 0.3, 3.6, baldosa=4)
    caja('E', CHAPA_ALIEN, x0, x1, z1 - 0.6, z1, AGUA_Y - 0.3, 3.6, baldosa=4)
    caja('E', CHAPA_ALIEN_2, x0 + 0.6, x1 - 0.6, z0, z1 - 0.6, -0.2, 0.0, baldosa=4)            # la cubierta
    caja('E', CHAPA_ALIEN_2, x0 + 1.4, x1 - 1.4, z1 - 4.6, z1 - 0.6, 0.0, 6.4, baldosa=4)        # la torre de popa
    for lado in (x0, x1):                                                                        # el reborde que brilla
        caja('EP', LUZ_ALIEN, lado - 0.05, lado + 0.05, z0, z1, 3.3, 3.5)
    caja('EP', LUZ_ALIEN, x0 + 1.3, x1 - 1.3, z1 - 4.7, z1 - 4.55, 4.6, 5.2)
    # la rampa de proa, echada sobre el canto del muelle
    cara('E', CHAPA_ALIEN_2, [P(x0 + 0.7, z0, 0.0), P(x1 - 0.7, z0, 0.0), P(x1 - 0.7, z0 - 4.2, 0.06), P(x0 + 0.7, z0 - 4.2, 0.06)], hacia=ARRIBA, baldosa=3)
    cara('E', CHAPA_ALIEN, [P(x0 + 0.7, z0 - 4.2, 0.06), P(x1 - 0.7, z0 - 4.2, 0.06), P(x1 - 0.7, z0 - 4.2, -0.3), P(x0 + 0.7, z0 - 4.2, -0.3)], hacia=V((0, 1, 0)), baldosa=3)
for cx in (-3.9, 4.4):
    barcaza(cx, Z_FONDO + 1.6)
barcaza(-17.0, Z_FONDO + 6.0, 15.0, 7.8)                                         # otra llegando, en el agua

# --- la barcaza de la antena, amarrada de popa al muelle entre los barcos ----------------
# La base alien se planta encima (baseX/baseZ de `marsellaPuerto`, ya girados).
# En el juego mide 0,059 × su distancia a la cámara de radio: unos 4,1 aquí, así
# que la cubierta mide 10 × 10 y la base queda a medio metro del canto y a más
# de uno de la borda; los dos barcos de al lado, a algo más de un metro.
BASE = (-13.0, -56.0)                    # en el juego (13, -44)
BX0, BX1 = ORILLA - 0.2, ORILLA - 10.2
BZ0, BZ1 = BASE[1] - 5.0, BASE[1] + 5.0
caja('E', CHAPA_ALIEN, BX1, BX0, BZ0, BZ1, AGUA_Y - 0.4, 0.0, techo=CHAPA_ALIEN_2, baldosa=4)   # el casco, la cubierta a ras del muelle
for (a0, a1, c0, c1) in ((BX1, BX1 + 0.3, BZ0, BZ1), (BX1, BX0, BZ0, BZ0 + 0.3), (BX1, BX0, BZ1 - 0.3, BZ1)):
    caja('E', CHAPA_ALIEN, a0, a1, c0, c1, 0.0, 0.35, baldosa=4)                                   # la borda, abierta hacia el muelle
caja('EP', LUZ_ALIEN, BX1 - 0.05, BX0, BZ0 - 0.05, BZ1 + 0.05, -0.75, -0.6)                       # la línea que brilla sobre el agua
for (x, z) in ((BX0 - 0.6, BZ0 + 0.8), (BX0 - 0.6, BZ1 - 0.8)):
    cubo('EV', METAL, P(x, z, 0.2), (0.3, 0.3, 0.4))                                               # las bitas de las amarras
    barra('EV', METAL, P(x, z, 0.3), P(ORILLA + 0.3, z, 0.3), 0.05)                                # la amarra al bolardo

# --- los soportales y las fachadas del Quai du Port --------------------------------
def bloque_pouillon (z0, z1, plantas=7, fondo=16.0, fach=None):
    """Un bloque de Pouillon: la planta baja abierta en soportal (pilares
    cuadrados cada cuatro metros, techo y las tiendas al fondo) y encima la
    fachada de piedra que vuela sobre él."""
    z0, z1 = max(z0, z1), min(z0, z1)
    caja('E', TIENDAS, FX + HONDO, FX + fondo, z1, z0, 0.0, 4.5, baldosa=8)          # las tiendas
    alto = 4.5 + plantas * 3.0
    caja('E', fach or F_POUILLON, FX - 0.3, FX + fondo, z1, z0, 4.5, alto, techo=AZOTEA, tapa_abajo=True)
    cara('E', TECHO_SOPORTAL, [P(FX - 0.3, z0, 4.49), P(FX + HONDO, z0, 4.49), P(FX + HONDO, z1, 4.49), P(FX - 0.3, z1, 4.49)], hacia=ABAJO)
    n = max(2, round((z0 - z1) / 4.0))
    for i in range(n + 1):                                                            # los pilares
        zp = z1 + 0.35 + (z0 - z1 - 0.7) * i / n
        caja('E', SILLAR, FX - 0.3, FX + 0.4, zp - 0.35, zp + 0.35, 0.0, 4.5, baldosa=4)
    caja('E', SILLAR, FX - 0.45, FX + 0.5, z1, z0, 4.5, 5.0, baldosa=4)                       # la imposta del soportal
    tejado('E', TEJA, FX - 0.3, FX + fondo, z1, z0, alto, 2.6)
z = 120.0                                 # desde la esquina del Quai des Belges
for largo in (44.0, 14.0, 46.0, 40.0, 50.0, 44.0):
    if largo == 14.0:                     # el Hôtel de Ville: bajo, de piedra, con su frontón
        caja('E', F_AYUNTAMIENTO, FX - 1.5, FX + 14, z - largo, z, 0.0, 13.0, techo=AZOTEA)
        tejado('E', TEJA, FX - 1.5, FX + 14, z - largo, z, 13.0, 3.0)
    else:
        bloque_pouillon(z, z - largo, plantas=random.choice([6, 7, 8]))
    z -= largo + 10.0                     # una calle que sube al Panier
    suelo('GN', CALZADA, CALLE1, FX + 40, z, z + 10, 0.02, carriles=(z, 5.0, 'x'))
    if Z_ATRAS < z < Z_FONDO:             # el paso de cebra en la boca de la calle
        for k in range(6):                # las bandas, a lo largo de la calzada
            xx = CALLE0 + 0.25 + k * 1.15
            rect('EP', PINTURA, xx, xx + 0.6, z + 3.0, z + 7.0, 0.03)

# --- el fondo: las fachadas del Quai des Belges, que cierran el puerto -------------------
# En el juego quedan al final del agua, a unos 200 de la cámara: lo que cierra
# la vista. Casas de cinco a siete plantas con tejado de teja; el hueco de la
# Canebière se deja abierto.
def casa (x0, x1, z0, z1, plantas, grupo='T'):
    alto = plantas * 3.0
    caja(grupo, random.choice(F_PISOS), x0, x1, z0, z1, 0.0, alto, techo=AZOTEA)
    tejado(grupo, TEJA, x0, x1, z0, z1, alto, random.uniform(1.8, 3.2))
x = -130.0
while x < FX:
    ancho = random.uniform(11.0, 17.0)
    if not (x + ancho < -40 or x >= -22):  # la Canebière
        x = -22.0
        continue
    casa(x, min(x + ancho, FX) - 0.6, 122.0, 150.0, random.choice([5, 6, 6, 7]), 'E')
    x += ancho
suelo('GN', CALZADA, -40, -22, 122, 300, 0.04, carriles=(-40, 4.5, 'z'))       # la Canebière

# --- terrazas, farolas, bolardos y árboles del paseo ----------------------------------
def mesa (x, z):
    cubo('EV', METAL, P(x, z, 0.74), (0.7, 0.7, 0.04))
    barra('EV', METAL, P(x, z, 0), P(x, z, 0.74), 0.06)
    for s in (-1, 1):                                                                   # dos sillas
        cubo('EV', MADERA, P(x, z + s * 0.62, 0.45), (0.42, 0.42, 0.05))
        cubo('EV', MADERA, P(x, z + s * 0.84, 0.72), (0.42, 0.05, 0.5))
for z in np.arange(19.0, Z_ATRAS, -9.0):
    # la terraza del café: mesas en la acera con su sombrilla y otras bajo el soportal
    for dz in (0.0, -2.2):
        mesa(17.3, z + dz)
        mesa(FX + 1.6, z + dz - 1.1)
    lona = random.choice(LONA[:3])
    centro = P(17.3, z - 1.1, 2.4)
    for i in range(6):
        a0, a1 = 2 * math.pi * i / 6, 2 * math.pi * (i + 1) / 6
        cara('EV', lona, [centro, centro + V((1.5 * math.cos(a0), 1.5 * math.sin(a0), -0.4)), centro + V((1.5 * math.cos(a1), 1.5 * math.sin(a1), -0.4))], hacia=ARRIBA)
    barra('EV', METAL, P(17.3, z - 1.1, 0), centro, 0.07)
# El tráfico parado del Quai du Port: coches en los dos carriles, un autobús y
# motos aparcadas junto al bordillo de la acera.
def coche_fino (x, z):
    """Un utilitario a lo largo de z: chasis, capó y maletero más bajos, la
    cabina de cristal con su techo, ruedas, faros y pilotos."""
    chapa = random.choice(CHAPAS)
    largo, ancho = random.uniform(3.8, 4.4), 1.75
    z0, z1 = z - largo / 2, z + largo / 2
    caja('EV', chapa, x - ancho / 2, x + ancho / 2, z0, z1, 0.3, 0.85, baldosa=4)                     # la carrocería
    caja('EV', VIDRIO, x - ancho / 2 + 0.08, x + ancho / 2 - 0.08, z0 + largo * 0.3, z1 - largo * 0.22, 0.85, 1.3, baldosa=4)  # las lunas
    caja('EV', chapa, x - ancho / 2 + 0.1, x + ancho / 2 - 0.1, z0 + largo * 0.33, z1 - largo * 0.25, 1.3, 1.38, baldosa=4)    # el techo
    for zr in (z0 + 0.75, z1 - 0.75):
        for s in (-1, 1):
            cubo('EV', NEGRO_BARCO, P(x + s * (ancho / 2 - 0.08), zr, 0.32), (0.26, 0.64, 0.64))     # las ruedas
    for s in (-1, 1):
        cubo('EP', FAROLA, P(x + s * 0.6, z0 + 0.02, 0.68), (0.32, 0.06, 0.12))                       # los faros
        cubo('EV', CHAPAS[3], P(x + s * 0.65, z1 - 0.02, 0.7), (0.26, 0.06, 0.14))                    # los pilotos

z = 14.0
while z > Z_ATRAS:
    carril = random.choice((CALLE0 + 1.75, CALLE1 - 1.75))
    if random.random() < 0.12:
        caja('EV', BUS, carril - 1.25, carril + 1.25, z - 12.0, z, 0.35, 3.2, baldosa=4)
        caja('EV', BUS_FRANJA, carril - 1.27, carril + 1.27, z - 12.0, z, 0.9, 1.3, baldosa=4)
        caja('EV', VIDRIO, carril - 1.27, carril + 1.27, z - 11.6, z - 0.4, 1.6, 2.7, baldosa=4)
        for zr in (z - 2.2, z - 9.4):
            for s in (-1, 1):
                cubo('EV', NEGRO_BARCO, P(carril + s * 1.12, zr, 0.45), (0.3, 0.95, 0.95))
        z -= 12.0 + random.uniform(4, 9)
    else:
        coche_fino(carril, z - 2.2)
        z -= 4.4 + random.uniform(2, 14)
for z in np.arange(17.0, Z_ATRAS, -11.0):
    for k in range(random.randint(1, 3)):                                              # las motos
        zm = z - k * 0.9
        cubo('EV', random.choice(CHAPAS), P(CALLE1 + 0.3, zm, 0.55), (1.7, 0.3, 0.5), giro=math.pi / 2)
        cubo('EV', NEGRO_BARCO, P(CALLE1 + 0.3, zm, 0.3), (1.6, 0.12, 0.6), giro=math.pi / 2)
for z in np.arange(12.0, Z_ATRAS, -22.0):                                              # las farolas de la calle
    barra('EV', METAL, P(CALLE1 + 0.3, z, 0), P(CALLE1 + 0.3, z, 7.5), 0.16)
    barra('EV', METAL, P(CALLE1 + 0.3, z, 7.4), P(CALLE1 - 1.2, z, 7.6), 0.1)
    cubo('EP', FAROLA, P(CALLE1 - 1.3, z, 7.45), (0.7, 0.35, 0.18))
for z in np.arange(20.0, Z_ATRAS, -14.0):
    if abs(z - BASE[1]) < 9.5:           # ninguna delante de la antena
        continue
    barra('EV', METAL, P(ORILLA + 0.7, z, 0), P(ORILLA + 0.7, z, 4.6), 0.14)                      # farola del canto
    cubo('EP', FAROLA, P(ORILLA + 0.7, z, 4.75), (0.4, 0.4, 0.35))
for z in np.arange(20.0, Z_ATRAS, -5.0):
    if abs(z - BASE[1]) < 6.5:
        continue
    cubo('EV', METAL, P(ORILLA + 0.3, z, 0.25), (0.34, 0.34, 0.5))                                # bolardo

# --- los barcos: veleros y lanchas amarrados de popa, entre pantalanes --------------------
def barco_fino (grupo, xp, z, largo, rumbo=-1):
    """El barco de cerca, el que se ve jugando (Isidro: «¿podrías detallar más
    las barcas?»): casco en V con la borda que sube hacia la proa, fondo de
    color, verduguillo, cubierta de teca, bañera, cabina con ventanas,
    candeleros y guardamancebos, púlpito, defensas y amarras al muelle; el
    velero con jarcia (estay, backstay, obenques y cruceta) y la vela en su
    funda, y la lancha con parabrisas, toldo y motor. Unas 200 caras."""
    xb = xp + rumbo * largo
    ancho = largo * 0.34
    casco = random.choice(CASCOS)
    fondo = random.choice(FONDOS)
    velero = random.random() < 0.7
    X = lambda f: xp + (xb - xp) * f
    semi = lambda f: ancho / 2 * (0.9 + 0.1 * min(1.0, f / 0.2)) * (1 - max(0.0, (f - 0.55) / 0.45) ** 1.8)
    borda = lambda f: AGUA_Y + 0.85 + 0.4 * max(0.0, (f - 0.45) / 0.55) ** 2
    pt = lambda f, s, k, y: P(X(f), z + s * semi(f) * k, y)
    # El casco por tramos: obra viva (quilla → pantoque), obra muerta y verduguillo.
    est = [0.0, 0.12, 0.3, 0.5, 0.66, 0.8, 0.91, 1.0]
    capas = [(fondo, 0.15, AGUA_Y - 0.35, 0.9, lambda f: AGUA_Y + 0.08),
             (casco, 0.9, lambda f: AGUA_Y + 0.08, 1.0, lambda f: borda(f) - 0.12),
             (VERDUGO, 1.0, lambda f: borda(f) - 0.12, 1.03, borda)]
    for a, b in zip(est, est[1:]):
        for s in (-1, 1):
            for mat, k0, y0, k1, y1 in capas:
                ya0, yb0 = (y0(a), y0(b)) if callable(y0) else (y0, y0)
                ya1, yb1 = y1(a), y1(b)
                cara(grupo, mat, [pt(a, s, k0, ya0), pt(b, s, k0, yb0), pt(b, s, k1, yb1), pt(a, s, k1, ya1)], hacia=V((0, -s, 0)))
        cara(grupo, CUBIERTA, [pt(a, -1, 1.0, borda(a)), pt(b, -1, 1.0, borda(b)), pt(b, 1, 1.0, borda(b)), pt(a, 1, 1.0, borda(a))], hacia=ARRIBA)
    espejo = [pt(0, -1, 0.15, AGUA_Y - 0.35), pt(0, -1, 0.9, AGUA_Y + 0.08), pt(0, -1, 1.0, borda(0)),
              pt(0, 1, 1.0, borda(0)), pt(0, 1, 0.9, AGUA_Y + 0.08), pt(0, 1, 0.15, AGUA_Y - 0.35)]
    cara(grupo, casco, espejo, hacia=V((-rumbo, 0, 0)))                                   # el espejo de popa
    y0 = borda(0.3)
    # la bañera: suelo más oscuro y la brazola alrededor
    cara(grupo, TECA_OSCURA, [pt(0.04, -1, 0.72, y0 + 0.01), pt(0.3, -1, 0.72, y0 + 0.01), pt(0.3, 1, 0.72, y0 + 0.01), pt(0.04, 1, 0.72, y0 + 0.01)], hacia=ARRIBA)
    for s in (-1, 1):
        cubo(grupo, casco, P(X(0.17), z + s * semi(0.17) * 0.76, y0 + 0.13), (largo * 0.26, 0.07, 0.26))
    # la cabina: paredes que se estrechan hacia el techo, con la franja de ventanas
    alto = 0.9 if not velero else 0.55
    fa, fb = 0.3, 0.6 if velero else 0.62
    base = [(fa, -0.72), (fb, -0.6), (fb, 0.6), (fa, 0.72)]
    techo = [(fa + 0.02, -0.6), (fb - 0.04, -0.48), (fb - 0.04, 0.48), (fa + 0.02, 0.6)]
    yb_, yt_ = borda(fb) + 0.0, borda(fb) + alto
    centro = P(X((fa + fb) / 2), z, yb_)
    for i in range(4):
        (f0, k0), (f1, k1) = base[i], base[(i + 1) % 4]
        (g0, j0), (g1, j1) = techo[i], techo[(i + 1) % 4]
        q = [pt(f0, 1, k0, yb_), pt(f1, 1, k1, yb_), pt(g1, 1, j1, yt_), pt(g0, 1, j0, yt_)]
        cara(grupo, casco, q, hacia=H._girado((q[0] + q[2]) / 2 - centro))   # ya girada: que no gire dos veces
    cara(grupo, casco, [pt(g, 1, j, yt_) for g, j in techo], hacia=ARRIBA)
    for s in (-1, 1):                                                                    # las ventanas
        k = 0.7 - 0.1 * (alto - 0.55)
        cara(grupo, VIDRIO, [pt(fa + 0.05, s, k + 0.03, yb_ + alto * 0.4), pt(fb - 0.08, s, k - 0.05, yb_ + alto * 0.4),
                             pt(fb - 0.08, s, k - 0.06, yb_ + alto * 0.75), pt(fa + 0.05, s, k + 0.02, yb_ + alto * 0.75)], hacia=V((0, -s, 0)))
    # candeleros y guardamancebos, el púlpito de proa y el balcón de popa
    yr = 0.6
    for s in (-1, 1):
        for f in (0.04, 0.3, 0.55, 0.8):
            barra(grupo, MASTIL, pt(f, s, 0.95, borda(f)), pt(f, s, 0.95, borda(f) + yr), 0.035)
        barra(grupo, MASTIL, pt(0.04, s, 0.95, borda(0.04) + yr), pt(0.8, s, 0.95, borda(0.8) + yr), 0.025)
        barra(grupo, MASTIL, pt(0.8, s, 0.95, borda(0.8) + yr), pt(0.98, s, 0.3, borda(0.98) + yr), 0.035)
    barra(grupo, MASTIL, pt(0.04, -1, 0.95, borda(0.04) + yr), pt(0.04, 1, 0.95, borda(0.04) + yr), 0.035)
    # las defensas colgadas por la borda y las amarras de popa al muelle
    for s in (-1, 1):
        for f in (0.32, 0.6):
            cubo(grupo, DEFENSA, P(X(f), z + s * (semi(f) + 0.13), AGUA_Y + 0.5), (0.22, 0.22, 0.55))
        barra(grupo, CABO, pt(0.02, s, 0.85, borda(0.02) + 0.05), P(ORILLA + 0.3, z + s * 1.1, 0.35), 0.04)
    if velero:
        mx, h0 = X(0.55), yt_
        top = h0 + largo * 1.25
        barra(grupo, MASTIL, P(mx, z, h0 - alto), P(mx, z, top), 0.13)                    # el mástil
        barra(grupo, MASTIL, P(mx, z, h0 + 0.5), P(X(0.06), z, h0 + 0.35), 0.09)          # la botavara
        barra(grupo, random.choice(LONA[:3]), P(mx, z, h0 + 0.72), P(X(0.1), z, h0 + 0.55), 0.3)   # la vela en su funda
        barra(grupo, MASTIL, P(mx, z, top), pt(1.0, 0, 0, borda(1.0)), 0.03)              # el estay
        barra(grupo, MASTIL, P(mx, z, top), pt(0.0, 0, 0, borda(0.0)), 0.03)              # el backstay
        hc = h0 + largo * 0.65
        barra(grupo, MASTIL, P(mx, z - semi(0.55) * 0.9, hc), P(mx, z + semi(0.55) * 0.9, hc), 0.05)   # la cruceta
        for s in (-1, 1):                                                                 # los obenques
            barra(grupo, MASTIL, P(mx, z, top - 0.6), P(mx, z + s * semi(0.55) * 0.9, hc), 0.025)
            barra(grupo, MASTIL, P(mx, z + s * semi(0.55) * 0.9, hc), pt(0.55, s, 1.0, borda(0.55)), 0.025)
    else:
        # el parabrisas inclinado, el toldo sobre la bañera y el fueraborda
        cara(grupo, VIDRIO, [pt(fb, -1, 0.55, yt_), pt(fb, 1, 0.55, yt_), pt(fb - 0.08, 1, 0.5, yt_ + 0.45), pt(fb - 0.08, -1, 0.5, yt_ + 0.45)], hacia=V((rumbo, 0, 0.5)))
        cubo(grupo, random.choice(LONA[:3]), P(X(0.18), z, y0 + 1.75), (largo * 0.3, semi(0.18) * 1.7, 0.06))
        for s in (-1, 1):
            for f in (0.05, 0.31):
                barra(grupo, MASTIL, pt(f, s, 0.85, borda(f)), pt(f, s, 0.85, y0 + 1.72), 0.035)
        cubo(grupo, NEGRO_BARCO, P(X(-0.035), z, AGUA_Y + 0.75), (0.45, 0.55, 0.95))     # el motor
        cubo(grupo, CUBIERTA, P(X(-0.02), z, AGUA_Y + 0.2), (0.35, semi(0) * 1.6, 0.08))  # la plataforma de baño

def barco (grupo, x_popa, z, largo, rumbo=-1):
    """Un barco amarrado: la popa en x_popa y la proa hacia `rumbo` (±x). Los de
    cerca, con detalle (`barco_fino`); los del vuelo, en cuatro caras."""
    if grupo == 'EV':
        return barco_fino(grupo, x_popa, z, largo, rumbo)
    ancho = largo * 0.32
    casco = random.choice(CASCOS)
    xp, xb = x_popa, x_popa + rumbo * largo
    def pt (f, lado, y):
        x = xp + (xb - xp) * f
        w = ancho / 2 * (1 - max(0.0, (f - 0.62) / 0.38) ** 1.6)
        return P(x, z + lado * w, y)
    perfil = [0.0, 0.3, 0.62, 0.82, 1.0]
    for a, b in zip(perfil, perfil[1:]):
        for lado in (-1, 1):
            cara(grupo, casco, [pt(a, lado, AGUA_Y - 0.2), pt(b, lado, AGUA_Y - 0.2), pt(b, lado, AGUA_Y + 1.0), pt(a, lado, AGUA_Y + 1.0)], hacia=V((0, -lado, 0)))
        cara(grupo, CUBIERTA, [pt(a, -1, AGUA_Y + 1.0), pt(b, -1, AGUA_Y + 1.0), pt(b, 1, AGUA_Y + 1.0), pt(a, 1, AGUA_Y + 1.0)], hacia=ARRIBA)
    cara(grupo, casco, [pt(0, -1, AGUA_Y - 0.2), pt(0, 1, AGUA_Y - 0.2), pt(0, 1, AGUA_Y + 1.0), pt(0, -1, AGUA_Y + 1.0)], hacia=V((-rumbo, 0, 0)))
    # la cabina
    cx = xp + (xb - xp) * 0.42
    cubo(grupo, casco, P(cx, z, AGUA_Y + 1.35), (largo * 0.28, ancho * 0.6, 0.7))
    if random.random() < 0.7:            # velero: mástil y botavara
        mx = xp + (xb - xp) * 0.55
        alto = largo * 1.35
        barra(grupo, MASTIL, P(mx, z, AGUA_Y + 1.0), P(mx, z, AGUA_Y + 1.0 + alto), 0.12)
        barra(grupo, MASTIL, P(mx, z, AGUA_Y + 2.4), P(xp + (xb - xp) * 0.12, z, AGUA_Y + 2.2), 0.09)
        if random.random() < 0.5:        # la vela recogida en su funda
            barra(grupo, random.choice(LONA), P(mx, z, AGUA_Y + 2.65), P(xp + (xb - xp) * 0.16, z, AGUA_Y + 2.45), 0.3)
    else:                                 # lancha: puente y toldo
        cubo(grupo, random.choice(LONA[:3]), P(cx, z, AGUA_Y + 2.1), (largo * 0.3, ancho * 0.7, 0.08))

def pantalan (grupo, x0, x1, z, grupo_barcos=None):
    """Una pasarela de madera hacia el agua con barcos a los dos lados."""
    caja(grupo, MADERA, min(x0, x1), max(x0, x1), z - 1.1, z + 1.1, AGUA_Y + 0.5, AGUA_Y + 0.9, baldosa=3)
    rumbo = -1 if x1 < x0 else 1
    paso = 3.4
    k = 0
    while True:
        xp = x0 + rumbo * (1.5 + k * paso)
        if (xp - x1) * rumbo > -2:
            break
        for lado in (-1, 1):
            if random.random() < 0.88:
                largo = random.uniform(7.0, 11.0)
                # amarrado de popa al pantalán, con la proa hacia fuera
                barco_lado(grupo_barcos or grupo, xp, z, lado, largo)
        k += 1

def barco_lado (grupo, x, z_pantalan, lado, largo):
    """Barco amarrado de popa al pantalán: perpendicular a él (a lo largo de z)."""
    # Se construye girado: popa junto al pantalán, proa hacia ±z. Reutiliza
    # `barco` cambiando ejes con un truco: se dibuja en x y se rota 90° la lista.
    ancho = largo * 0.32
    casco = random.choice(CASCOS)
    zp, zb = z_pantalan + lado * 1.4, z_pantalan + lado * (1.4 + largo)
    def pt (f, s, y):
        zz = zp + (zb - zp) * f
        w = ancho / 2 * (1 - max(0.0, (f - 0.62) / 0.38) ** 1.6)
        return P(x + s * w, zz, y)
    perfil = [0.0, 0.3, 0.62, 0.82, 1.0]
    for a, b in zip(perfil, perfil[1:]):
        for s in (-1, 1):
            cara(grupo, casco, [pt(a, s, AGUA_Y - 0.2), pt(b, s, AGUA_Y - 0.2), pt(b, s, AGUA_Y + 1.0), pt(a, s, AGUA_Y + 1.0)], hacia=V((s, 0, 0)))
        cara(grupo, CUBIERTA, [pt(a, -1, AGUA_Y + 1.0), pt(b, -1, AGUA_Y + 1.0), pt(b, 1, AGUA_Y + 1.0), pt(a, 1, AGUA_Y + 1.0)], hacia=ARRIBA)
    cara(grupo, casco, [pt(0, -1, AGUA_Y - 0.2), pt(0, 1, AGUA_Y - 0.2), pt(0, 1, AGUA_Y + 1.0), pt(0, -1, AGUA_Y + 1.0)], hacia=V((0, lado, 0)))
    cz = zp + (zb - zp) * 0.42
    cubo(grupo, casco, P(x, cz, AGUA_Y + 1.35), (ancho * 0.6, largo * 0.28, 0.7))
    if random.random() < 0.7:
        mz = zp + (zb - zp) * 0.55
        alto = largo * 1.35
        barra(grupo, MASTIL, P(x, mz, AGUA_Y + 1.0), P(x, mz, AGUA_Y + 1.0 + alto), 0.12)
        barra(grupo, MASTIL, P(x, mz, AGUA_Y + 2.4), P(x, zp + (zb - zp) * 0.12, AGUA_Y + 2.2), 0.09)
        if random.random() < 0.5:
            barra(grupo, random.choice(LONA), P(x, mz, AGUA_Y + 2.65), P(x, zp + (zb - zp) * 0.16, AGUA_Y + 2.45), 0.3)
    else:
        cubo(grupo, random.choice(LONA[:3]), P(x, cz, AGUA_Y + 2.1), (ancho * 0.7, largo * 0.3, 0.08))

# Junto al muelle donde se juega, los barcos van amarrados de popa al canto,
# apuntando al agua: son lo que se ve a la izquierda toda la partida.
n_barcos = 0
# Cada barco ocupa su manga más las defensas y deja un palmo al siguiente: así
# no se meten unos en otros (a paso fijo, los grandes se montaban).
z = 20.0
while z > Z_BOCANA:
    largo = random.uniform(7.0, 11.5)
    medio = largo * 0.34 / 2 + 0.25
    c = z - medio
    if c + medio > BZ0 - 4.7 and c - medio < BZ1 + 4.7:   # la barcaza de la antena y sus dos barcos
        z = BZ0 - 4.7
        continue
    if random.random() < 0.85:
        g = 'EV' if c > Z_ATRAS else 'T'
        barco(g, ORILLA - 1.2, c, largo, -1)          # la popa en el canto, la proa al agua
        n_barcos += 1
    z = c - medio - 0.35
# Los dos barcos de al lado de la barcaza de la antena, a 1,2 de su casco.
for z in (BZ0 - 2.64, BZ1 + 2.64):
    barco('EV', ORILLA - 1.2, z, 9.0, -1)
# Y más allá, los pantalanes del resto del puerto (solo en el vuelo).
for z in np.arange(60.0, -440.0, -24.0):
    pantalan('T', -42.0, -88.0, z)
    pantalan('T', -175.0 + 1.0, -130.0, z - 12)
print('BARCOS cerca', n_barcos)

comprobar_paso(('E', 'EP', 'S', 'EV'))

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- el Quai des Belges y la Ombrière, a la espalda ---------------------------------
suelo('G', ACERA, -1600, 1600, 75, 1300, -0.03, 6.0)                     # tierra: al este del puerto
suelo('G', ACERA, 9.0, 1600, -560, 75, -0.03, 6.0)                       # al norte (el Panier, la Joliette)
suelo('G', ACERA, -1600, -175, -560, 75, -0.03, 6.0)                     # al sur (Rive Neuve y la colina)
# Pasada la bocana, el Mediterráneo: el puerto se abre al oeste.
rect('CP', AGUA, -1700, 1700, -1800, -560, AGUA_Y, baldosa=30.0)
rect('CP', AGUA, -175, 9.0, -560, -470, AGUA_Y, baldosa=30.0)
suelo('G', LOSA, -190, -175, -470, 75, 0.02, 4.0)                      # el muelle de Rive Neuve
suelo('G', CALZADA, -40, -22, 300, 1300, 0.04, carriles=(-40, 4.5, 'z'))   # la Canebière
caja('C', ESPEJO, -95, -50, 82, 106, 6.0, 6.4, tapa_abajo=True, baldosa=6)  # la Ombrière: espejo por debajo
for x in (-92, -72.5, -53):
    for z in (85, 103):
        barra('T', ESPEJO, P(x, z, 0), P(x, z, 6), 0.14)

# --- la bocana: el fuerte Saint-Jean, el MuCEM y La Major ----------------------------
caja('C', SILLAR, 9.0, 70, -470, -405, 0.0, 12.0, techo=SILLAR, baldosa=6)                  # el fuerte Saint-Jean
for (x, z, r, h) in ((22, -455, 7, 26), (58, -418, 5.5, 18)):
    prisma('C', SILLAR, [(x + r * math.cos(2 * math.pi * i / 12), z + r * math.sin(2 * math.pi * i / 12)) for i in range(12)], 0, h, techo=SILLAR)
caja('C', SILLAR_OSCURO, 18, 28, -462, -448, 26, 31, techo=SILLAR, baldosa=4)
caja('C', VIDRIO, 76, 106, -505, -475, 0.0, 9.0, techo=CELOSIA)                            # el MuCEM
caja('C', CELOSIA, 74.5, 107.5, -506.5, -473.5, 0.0, 9.6, techo=CELOSIA, baldosa=8)
barra('T', CELOSIA, P(74, -480, 9.0), P(62, -440, 11.5), 1.4)                            # la pasarela al fuerte
for (x0, x1, z0, z1, h) in ((110, 160, -400, -372, 22), (112, 158, -405, -395, 26)):      # La Major
    caja('C', RAYADO, x0, x1, z1, z0, 0, h, techo=RAYADO, baldosa=10)
filas = [[P(135 + 9 * math.cos(2 * math.pi * j / 16) * math.cos(math.pi / 2 * i / 6), -386 + 9 * math.sin(2 * math.pi * j / 16) * math.cos(math.pi / 2 * i / 6), 26 + 11 * math.sin(math.pi / 2 * i / 6)) for j in range(17)] for i in range(7)]
malla('C', RAYADO, filas, ARRIBA, u_rep=4, v_rep=2)
for x in (114, 156):
    caja('C', RAYADO, x - 4, x + 4, -376, -368, 0, 34, techo=RAYADO, baldosa=10)
    caja('C', TEJA, x - 2.5, x + 2.5, -374.5, -369.5, 34, 39)
caja('C', SILLAR, -250, -175, -470, -400, 0.0, 9.0, techo=SILLAR, baldosa=6)               # el fuerte Saint-Nicolas

# --- Notre-Dame de la Garde en su colina ----------------------------------------------
NC, NR, NY = (-330.0, -250.0), 150.0, 62.0
filas = []
for i in range(21):                       # del pie a la cima
    f = i / 20
    r = NR * (1 - f) + 16 * f
    fila = []
    for j in range(49):
        a = 2 * math.pi * j / 48
        rugo = 1 + 0.08 * math.sin(a * 5 + f * 3) + 0.03 * math.sin(a * 11)
        y = NY * (1 - (1 - f) ** 1.7)
        fila.append(P(NC[0] + r * rugo * math.cos(a), NC[1] + r * rugo * math.sin(a), y))
    filas.append(fila)
malla('T', MONTE, filas[:12], ARRIBA, u_rep=16, v_rep=4)
malla('T', ROCA, filas[11:], ARRIBA, u_rep=10, v_rep=3)
caja('C', SILLAR, NC[0] - 18, NC[0] + 18, NC[1] - 14, NC[1] + 14, NY - 6, NY + 1.0, techo=LOSA_GRIS, baldosa=4)   # el bastión
caja('C', RAYADO, NC[0] - 4, NC[0] + 4, NC[1] - 10, NC[1] + 12, NY + 1, NY + 15, techo=TEJA)    # la nave, a lo largo
filas = [[P(NC[0] + 4.5 * math.cos(2 * math.pi * j / 12) * math.cos(math.pi / 2 * i / 5), NC[1] + 2 + 4.5 * math.sin(2 * math.pi * j / 12) * math.cos(math.pi / 2 * i / 5), NY + 15 + 6 * math.sin(math.pi / 2 * i / 5)) for j in range(13)] for i in range(6)]
malla('C', RAYADO, filas, ARRIBA, u_rep=3, v_rep=1)
caja('C', RAYADO, NC[0] - 4, NC[0] + 4, NC[1] + 12, NC[1] + 20, NY + 1, NY + 33, techo=RAYADO)  # el campanario
prisma('C', RAYADO, [(NC[0] + 3 * math.cos(2 * math.pi * i / 8), NC[1] + 16 + 3 * math.sin(2 * math.pi * i / 8)) for i in range(8)], NY + 33, NY + 39, techo=ORO)
barra('T', ORO, P(NC[0], NC[1] + 16, NY + 39), P(NC[0], NC[1] + 16, NY + 49), 1.6)               # la Bonne Mère

# --- Rive Neuve y la ciudad: casas de piedra clara con tejado de teja ------------------------
for z in np.arange(70.0, -470.0, -14.0):                                 # la fachada de Rive Neuve, frente al agua
    if random.random() < 0.9:
        casa(-206, -192, z - 13, z - 0.5, random.choice([5, 6, 6, 7]), 'C')
PASO = 52.0
n_ed = 0
for x in np.arange(-1500.0, 1500.0, PASO):
    for z in np.arange(-1600.0, 1250.0, PASO):
        cx, cz = x + PASO / 2, z + PASO / 2
        if cz < -530:                                                    # el mar
            continue
        if -215 < cx < 75 and -480 < cz < 170:                          # el puerto y sus muelles
            continue
        if math.hypot(cx - NC[0], cz - NC[1]) < NR + 10:                  # la colina
            continue
        if 0 < cx < 180 and -530 < cz < -360:                           # fuertes, MuCEM y catedral
            continue
        if -45 < cx < -17 and cz > 110:                                  # la Canebière
            continue
        dist = math.hypot(cx + 60, cz + 150)
        if dist > 1400 or (dist > 900 and random.random() < 0.4):
            continue
        partes = 2 if dist < 450 else 1
        for k in range(partes):
            a0 = x + 6 + (PASO - 12) * k / partes
            a1 = x + 6 + (PASO - 12) * (k + 1) / partes
            # Lo que se ve jugando por detrás del Quai des Belges va en el modelo de
            # juego (EF): sin eso, al acabar el vuelo la ciudad se apagaba de golpe.
            fondo_juego = -170 < cx < 170 and 140 < cz < 400
            casa(a0, a1 - 1.0, z + 6, z + PASO - 6, random.choice([4, 5, 5, 6, 7]), 'EF' if fondo_juego else 'C' if dist < 340 else 'T')
            n_ed += 1
for x in np.arange(-1500.0, 1500.0, PASO):                                # las calles
    suelo('G', CALZADA, x - 6, x + 6, -560, 1300, 0.03, carriles=(x - 6, 6.0, 'z')) if not -215 < x < 75 else None
print('EDIFICIOS', n_ed)

# --- las colinas que cierran la ciudad (Marseilleveyre, l'Étoile) ------------------------
for (cx, cz, r, h) in ((-1250, -200, 520, 95), (-950, 950, 480, 80), (1250, 200, 520, 110), (1000, -380, 360, 70)):
    filas = []
    for i in range(7):
        fila = []
        for j in range(25):
            a = 2 * math.pi * j / 24
            rr_ = r * (1 - i / 6) * (1 + 0.15 * math.sin(a * 3 + cx))
            fila.append(P(cx + rr_ * math.cos(a), cz + rr_ * math.sin(a), h * (1 - (1 - i / 6) ** 1.8)))
        filas.append(fila)
    malla('T', MONTE, filas[:4], ARRIBA, u_rep=20, v_rep=4)
    malla('T', ROCA, filas[3:], ARRIBA, u_rep=16, v_rep=3)

cupula('CP', CIELO, 3200.0, -60.0, -150.0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-muelle', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EF': ('vert-fondo', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-marsella', ['S', 'E', 'GN', 'EV', 'EF', 'EP']), ('lugar-marsella-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL_JUEGO, sol_color=(1.0, 0.94, 0.84), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=32, cielo_giro=20,
    escala=0.42, satura=0.8, no_alumbran=('CP',))
