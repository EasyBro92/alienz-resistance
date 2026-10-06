# Atenas: arriba, en la Acrópolis, con el Partenón al fondo (06/10/2026).
#   blender -b -P herramientas/blender/lugar_atenas.py              (entero)
#   blender -b -P herramientas/blender/lugar_atenas.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_atenas.py -- --reusar  (retocar la luz)
#
# Isidro: «ahora me quiero centrar en los mapas que no hemos tocado». Para Atenas
# eligió: se juega ARRIBA («hay muchas columnas en una zona alta»: la Acrópolis),
# los alienz SALEN DEL PARTENÓN, al ATARDECER y con llegada larga. Misma receta
# que los demás lugares de luz horneada (horneado.py).
#
# Cómo está puesto. Se mira al ESTE, con el sol poniéndose a la espalda: la
# fachada oeste del Partenón —las ocho columnas y el frontón— queda de frente y
# dorada, al fondo del campo.
#   · EL PARTENÓN VA A 0,7 DE SU TAMAÑO, y no es capricho. Con la cámara del juego
#     en un móvil, lo que hay al fondo solo enseña sus primeros trece metros de
#     alto (medido: el horizonte queda por encima del borde de la pantalla). A su
#     tamaño se verían ocho fustes y nada más; a 0,7 cabe entero, con el frontón,
#     que es lo que lo hace el Partenón. Y de eje a eje de columna quedan 3 m:
#     los cinco carriles pasan por los cinco huecos del centro.
#   · Los alienz nacen DENTRO, sobre un pozo de resina verde donde estuvo la
#     estatua, cruzan el pórtico y la columnata y bajan los tres escalones
#     (`entrada`, `columnas` y `hueco` en el juego, con estos mismos números).
#   · A la IZQUIERDA, a medio campo, el pórtico de las Cariátides del Erecteion,
#     mirando al campo; a la DERECHA, la base alien sobre un círculo de mármol.
#   · A la ESPALDA, los Propileos: por encima entra la cámara.
#   · Solo en el vuelo: la roca con sus murallas, el Odeón de Herodes Ático al
#     pie, la ciudad blanca alrededor, el Licabeto y el mar.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.36, 0.38, 0.9)                  # atardecer: bajo, a la espalda de los soldados y algo a su derecha
CENTRO = (-4.0, -62.0)                   # el centro de la meseta
ABAJO_Y = -72.0                          # la ciudad, setenta metros más abajo
iniciar('atenas', 1687, eje=CENTRO, encendidas=0.3, reflejo=(0.32, 0.18, 0.1))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
PENTELICO = 0xe9dfc9                     # el mármol del Pentélico: blanco tirando a miel

def tex_fuste ():
    """El fuste dórico: mármol con sus veinte estrías y las juntas de los tambores."""
    a = foto('cracked_concrete_wall', 256, PENTELICO, 0.55)
    u = np.linspace(0, 1, 256, endpoint=False, dtype=np.float32)[None, :, None]
    a *= 0.78 + 0.22 * np.abs(np.cos(np.pi * 20 * u)) ** 0.6
    for y in (84, 170):
        a[y:y + 2] *= 0.62
    a *= (0.92 + 0.16 * nube(256, 256, 5, 3))[..., None]
    return guardar('fuste', np.clip(a, 0, 1), 88)

def tex_friso ():
    """Un tramo del friso: el triglifo (tres barras) y la metopa, con su relieve gastado."""
    a = foto('marble_01', 256, PENTELICO, 0.4)[:128].copy()
    a[:, :96] *= 1.04
    for x0 in (26, 58):                                             # los dos canales del triglifo
        a[16:, x0:x0 + 10] *= np.array((0.5, 0.48, 0.46), np.float32)
        a[16:, x0 + 10:x0 + 12] *= 1.12
    a[16:, 0:5] *= 0.62; a[16:, 91:96] *= 0.62
    a[16:, 96:] *= 0.9                                              # la metopa, un dedo hundida
    a[16:20, 96:] *= 0.7
    bulto = nube(112, 160, 3, 4)
    a[16:, 96:] *= (0.86 + 0.3 * bulto)[..., None]                  # lo que queda de las figuras
    a[:12] *= 1.1; a[12:16] *= 0.6                                  # la tenia
    return guardar('friso', np.clip(a, 0, 1), 88)

def tex_roca (nombre, lado=512):
    """La roca de la meseta: caliza gris clara, pulida a trozos, con tierra en las hoyas."""
    roca = foto('rock_ground', lado, 0xc6bca8, 0.8)
    lisa = foto('cracked_concrete_wall', lado, 0xd6cdba, 0.6)
    tierra = foto('dry_ground_rocks', lado, 0xc6b494, 0.45)
    m1 = np.clip((nube(lado, lado, 7, 7) - 0.42) / 0.2, 0, 1)[..., None]
    m2 = np.clip((nube(lado, lado, 5, 5) - 0.7) / 0.12, 0, 1)[..., None] * 0.7
    a = roca * (1 - m1) + lisa * m1
    return guardar(nombre, np.clip(a * (1 - m2) + tierra * m2, 0, 1))

# --- la pista: una sola textura para la roca donde se juega ---------------------------------
PX0, PX1, PZ0, PZ1 = -9.2, 9.2, -60.9, 13.0
PW, PH_ = 512, 2048
def a_px (x, z):
    return int((x - PX0) / (PX1 - PX0) * PW), int((z - PZ0) / (PZ1 - PZ0) * PH_)

def tex_pista ():
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0], PW // t.shape[1], 1))
    roca = tejar(foto('rock_ground', 128, 0xc6bca8, 0.8))
    lisa = tejar(foto('cracked_concrete_wall', 128, 0xd8cfbc, 0.6))
    tierra = tejar(foto('dry_ground_rocks', 128, 0xc8b696, 0.45))
    # La roca viva, pulida por donde pasa la gente, con tierra en las hoyas.
    m1 = np.clip((nube(PH_, PW, 40, 10) - 0.4) / 0.22, 0, 1)[..., None]
    m2 = np.clip((nube(PH_, PW, 26, 7) - 0.7) / 0.12, 0, 1)[..., None] * 0.7
    a = roca * (1 - m1) + lisa * m1
    a = a * (1 - m2) + tierra * m2
    a *= (0.95 + 0.1 * nube(PH_, PW, 18, 5))[..., None]
    xs = np.linspace(-1, 1, PW, dtype=np.float32)[None, :, None]
    a *= 1 + 0.1 * np.exp(-(xs / 0.45) ** 2)                        # el centro, más pisado y más claro
    # Las grietas de la caliza: rayas finas que van torciendo.
    for _ in range(90):
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(30, 140)):
            ang += random.uniform(-0.35, 0.35)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.6
                a[fi + 1, ci + 1] *= 1.08
    # Los rebajes tallados en la roca para las estelas y los pedestales que ya no están.
    for _ in range(26):
        x = random.choice((-1, 1)) * random.uniform(5.2, 8.6)
        z = random.uniform(PZ0 + 3, PZ1 - 3)
        (c0, f0), (c1, f1) = a_px(x - random.uniform(0.3, 0.8), z - random.uniform(0.3, 0.7)), a_px(x + random.uniform(0.3, 0.8), z + random.uniform(0.3, 0.7))
        a[f0:f1, c0:c1] *= 0.86
        a[f0:f0 + 2, c0:c1] *= 0.6; a[f0:f1, c0:c0 + 2] *= 0.6
        a[f1 - 1:f1, c0:c1] *= 1.12
    # Esquirlas de mármol: un punto claro con su sombra al lado.
    for _ in range(1100):
        c, f = random.randrange(2, PW - 4), random.randrange(2, PH_ - 4)
        s = random.choice((1, 1, 2))
        a[f + 1:f + 1 + s, c + 1:c + 2 + s] *= 0.68
        a[f:f + s, c:c + 1 + s] = a[f:f + s, c:c + 1 + s] * 0.35 + np.array((0.86, 0.83, 0.76), np.float32) * random.uniform(0.6, 0.75)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_bandera ():
    a = lienzo(180, 270, (0.93, 0.94, 0.96))
    azul = np.array((0.05, 0.28, 0.6), np.float32)
    for k in range(0, 9, 2):
        a[k * 20:(k + 1) * 20] = azul
    a[:100, :100] = azul
    a[40:60, :100] = (0.93, 0.94, 0.96); a[:100, 40:60] = (0.93, 0.94, 0.96)
    return guardar('bandera', a, 90)

def tex_odeon ():
    """El muro del Odeón: sillares oscuros con sus arcos abiertos, uno por baldosa."""
    a = foto('castle_wall_varriation', 256, 0xa8926e, 0.9)
    yy, xx = np.mgrid[0:256, 0:256]
    arco = ((xx - 128) ** 2 + (yy - 120) ** 2 < 66 ** 2) & (yy < 120) | ((np.abs(xx - 128) < 66) & (yy >= 120) & (yy < 236))
    a[arco] = (np.broadcast_to(np.linspace(0.1, 0.3, 256, dtype=np.float32)[:, None, None] * np.array((1.0, 0.85, 0.7), np.float32), (256, 256, 3)))[arco]
    a[:10] *= 1.15; a[10:18] *= 0.65
    return guardar('odeon', np.clip(a, 0, 1), 86)

PISTA = material('pista', tex_pista(), rug=1.0)
ROCA = material('roca', tex_roca('roca'), rug=1.0)
FUSTE = material('fuste', tex_fuste(), rug=0.7)
FRISO = material('friso', tex_friso(), rug=0.7)
MARMOL = material('marmol', guardar('marmol', foto('marble_01', 256, PENTELICO, 0.5)), rug=0.7)
MARMOL_V = material('marmol-viejo', guardar('marmol-viejo', foto('marble_01', 256, 0xd6ccb6, 0.6) * (0.86 + 0.28 * nube(256, 256, 5, 5))[..., None]), rug=0.8)
MARMOL_L = material('marmol-liso', guardar('marmol-liso', foto('cracked_concrete_wall', 256, 0xe3d9c4, 0.5)), rug=0.7)
MURALLA = material('muralla', de_polyhaven('yellow_stone_wall', 512, 0xc4b08a, 0.8), rug=0.95)
PENA = material('pena', de_polyhaven('rock_face_03', 512, 0xa39a8b, 0.9), rug=1.0)
TIERRA = material('tierra', de_polyhaven('dry_ground_rocks', 512, 0xb39d78, 0.7), rug=1.0)
HIERBA = material('hierba', de_polyhaven('sparse_grass', 512, 0x9a9066, 0.6), rug=1.0)   # hierba agostada: en Atenas no hay césped
CALLE = material('calle', de_polyhaven('pavement_02', 512, 0x9a958c, 0.8), rug=0.95)
ODEON = material('odeon', tex_odeon(), rug=0.95)
BANDERA = material('bandera', tex_bandera(), rug=0.9)
RESINA = material('resina', color=(0.05, 0.07, 0.05), rug=0.5)
NEGRO = material('negro', color=(0.03, 0.03, 0.035))
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
HIERRO = material('hierro', color=(0.2, 0.2, 0.21), rug=0.6)
MAR = material('mar', color=(0.78, 0.5, 0.36), emite=1.0)
# OJO: los colores lisos van en LINEAL (0,34 lineal es un gris claro, no un verde
# oscuro): los primeros olivos salieron de color menta por darlos como si fueran sRGB.
MONTE_L = material('monte-lejos', color=(0.22, 0.15, 0.3), rug=1.0)          # el Himeto, que al atardecer se pone violeta
PINAR = material('pinar', de_polyhaven('sparse_grass', 512, 0x5c6044, 0.55), rug=1.0)
OLIVOS = [material(f'olivo-{i}', color=c, rug=1.0) for i, c in enumerate([(0.12, 0.155, 0.085), (0.15, 0.18, 0.09), (0.095, 0.13, 0.07)])]
PINOS = [material(f'pino-{i}', color=c, rug=1.0) for i, c in enumerate([(0.045, 0.085, 0.035), (0.06, 0.1, 0.04), (0.035, 0.07, 0.035)])]
CIPRES = material('cipres', color=(0.025, 0.05, 0.03), rug=1.0)
TRONCO = material('tronco', color=(0.09, 0.065, 0.045))
# Atenas es blanca y crema: bloques de pisos con toldos y persianas.
PALETA = [((0.95, 0.93, 0.88), (0.36, 0.44, 0.5)), ((0.9, 0.87, 0.8), (0.42, 0.36, 0.28)), ((0.97, 0.95, 0.9), (0.3, 0.42, 0.36)),
          ((0.86, 0.82, 0.74), (0.5, 0.44, 0.36)), ((0.92, 0.9, 0.86), (0.55, 0.3, 0.24))]
FACHADAS = [material(f'f-atenas-{i}', tex_postigos(f'atenas-{i}', b, p)) for i, (b, p) in enumerate(PALETA)]
AZOTEA = material('azotea', tex_azotea((0.74, 0.72, 0.68)))
CIELO = material('cielo', tex_cielo(
    [(0.0, (1.0, 0.7, 0.46)), (0.05, (0.99, 0.66, 0.45)), (0.16, (0.86, 0.62, 0.58)), (0.4, (0.46, 0.52, 0.76)), (1.0, (0.17, 0.27, 0.56))],
    (SOL[0], SOL[2]), 0.09, (0.9, 0.42, 0.08), ((1.0, 0.7, 0.46), (0.72, 0.6, 0.7)), cuanta_nube=0.08), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL PARTENÓN
# ==================================================================================
PASO = 3.0                               # de eje a eje de columna
XS8 = [-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5]
XS6 = XS8[1:-1]
ZT = -62.0                               # el canto del estilóbato, hacia el campo
YS = 1.15                                # su altura: tres escalones de 0,38
ZC = ZT - 0.95                           # el eje de la columnata de delante
NF = 17                                  # columnas por costado
ZF = ZC - (NF - 1) * PASO                # el eje de la de atrás
ZP = ZC - 3.2                            # el pórtico: la segunda fila
R_COL, H_COL = 0.665, 7.3
Y_CAP = YS + H_COL                       # donde apoya el arquitrabe
H_ARQ, H_FRI, H_COR = 0.95, 0.95, 0.42
Y_FRI = Y_CAP + H_ARQ
Y_COR = Y_FRI + H_FRI
Y_ENT = Y_COR + H_COR                    # lo alto del entablamento
H_FRONTON = 2.65
MX = 11.35                               # media anchura del estilóbato
ZB = ZF - 0.95                           # su canto de atrás

def dorica (grupo, x, z, alto=H_COL, r=R_COL, y=YS, lados=14, rota=False):
    """Una columna dórica: sin basa, el fuste estriado que se estrecha, el equino y el ábaco.
    `rota`: solo el arranque, con el corte mellado."""
    k = r / 0.665
    giro = random.uniform(0, 0.3)
    if rota:
        torno(grupo, FUSTE, en(x, z, y, giro), [(r, 0.0), (r * (1 - 0.2 * alto / H_COL), alto)], lados=lados, tapas=(False, True), roto=0.12)
        return
    hs = alto - 0.5 * k
    torno(grupo, FUSTE, en(x, z, y, giro), [(r, 0.0), (r * 0.985, hs * 0.3), (r * 0.92, hs * 0.65), (r * 0.8, hs)], lados=lados, tapas=(False, False))
    torno(grupo, MARMOL_L, en(x, z, y + hs, giro), [(r * 0.8, 0.0), (r * 0.84, 0.05 * k), (r * 1.2, 0.2 * k), (r * 1.27, 0.26 * k)], lados=lados, tapas=(False, False), v_m=1.0)
    bloque(grupo, MARMOL_L, en(x, z, y + hs + 0.26 * k), (2.62 * r, 2.62 * r, 0.24 * k), mella=0.01)

def entablamento (grupo, x0, x1, z0, z1):
    """Arquitrabe, friso de triglifos y cornisa volada sobre un tramo de columnata."""
    viga(grupo, MARMOL, x0, x1, z0, z1, Y_CAP, Y_FRI, u_m=2.4)
    viga(grupo, FRISO, x0, x1, z0, z1, Y_FRI, Y_COR, u_m=PASO / 2, tapas=False)
    viga(grupo, MARMOL_L, x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3, Y_COR, Y_ENT, u_m=2.0)

def marco (grupo, mat, ext, inte, y, baldosa=2.4):
    """El suelo entre dos rectángulos, uno dentro de otro: la huella de un escalón."""
    (a0, a1, c0, c1), (b0, b1, d0, d1) = ext, inte
    rect(grupo, mat, a0, a1, d1, c1, y, baldosa)                    # delante
    rect(grupo, mat, a0, a1, c0, d0, y, baldosa)                    # detrás
    rect(grupo, mat, a0, b0, d0, d1, y, baldosa)                    # un costado
    rect(grupo, mat, b1, a1, d0, d1, y, baldosa)                    # y el otro

# --- los tres escalones y el suelo del templo -------------------------------------------------
# De cada escalón solo se hace lo que se ve: la contrahuella y la huella que asoma.
contorno = lambda k: (-MX - 0.55 * k, MX + 0.55 * k, ZB - 0.55 * k, ZT + 0.55 * k)
for k in (2, 1, 0):
    x0, x1, z0, z1 = contorno(k)
    y1 = YS - 0.3833 * k
    viga('P', MARMOL, x0, x1, z0, z1, y1 - 0.3833, y1, u_m=2.4, v_rep=0.16, tapas=False)
    if k:
        marco('P', MARMOL, (x0, x1, z0, z1), contorno(k - 1), y1)
# El suelo de arriba, en dos trozos: lo de delante va con la pista (más detalle de luz).
rect('P', MARMOL, -MX, MX, ZP - 3.0, ZT, YS, 2.4)
rect('E', MARMOL_V, -MX, MX, ZB, ZP - 3.0, YS, 2.4)

# --- la columnata de fuera ------------------------------------------------------------------
for x in XS8:
    dorica('P', x, ZC)
    dorica('E', x, ZF)
# El costado norte (la izquierda) está entero; el sur (la derecha) lo abrió la
# explosión de 1687 y sigue con el hueco en medio.
ROTO_SUR = range(6, 11)
for i in range(1, NF - 1):
    z = ZC - i * PASO
    cerca = 'P' if i <= 2 else 'E'
    dorica(cerca, -10.5, z)
    if i in ROTO_SUR:
        if i in (6, 10):
            dorica('E', 10.5, z, alto=random.uniform(1.4, 3.2), rota=True)
    else:
        dorica(cerca, 10.5, z)
entablamento('P', -MX + 0.1, MX - 0.1, ZC - 0.72, ZC + 0.72)                      # el frente
entablamento('E', -MX + 0.1, MX - 0.1, ZF - 0.72, ZF + 0.72)                      # el testero
entablamento('E', -10.5 - 0.72, -10.5 + 0.72, ZF + 0.72, ZC - 0.72)               # el costado norte
entablamento('E', 10.5 - 0.72, 10.5 + 0.72, ZC - 5 * PASO - 1.0, ZC - 0.72)       # el sur, a trozos
entablamento('E', 10.5 - 0.72, 10.5 + 0.72, ZF + 0.72, ZC - 11 * PASO + 1.0)

# --- el frontón: el triángulo entero, con el tímpano roto en medio ----------------------------
def frontón (grupo, z_cara, hacia_z, roto=True):
    alto_en = lambda x: Y_ENT + H_FRONTON * (1 - abs(x) / 11.0)
    zt = z_cara - 0.4 * hacia_z                                                  # el tímpano, remetido
    n = V((0, -hacia_z, 0))
    trozos = [[(-11.0, Y_ENT), (-1.4, Y_ENT), (-1.4, Y_ENT + 0.8), (-2.4, Y_ENT + 0.8), (-2.4, Y_ENT + 1.5), (-3.3, Y_ENT + 1.5), (-3.3, alto_en(-3.3))],
              [(11.0, Y_ENT), (2.2, Y_ENT), (2.2, Y_ENT + 1.1), (3.0, Y_ENT + 1.1), (3.0, alto_en(3.0))],
              [(-1.4, Y_ENT), (2.2, Y_ENT), (2.2, Y_ENT + 0.45), (-1.4, Y_ENT + 0.45)]] if roto else \
             [[(-11.0, Y_ENT), (-6.0, Y_ENT), (-6.0, alto_en(-6.0))], [(11.0, Y_ENT), (7.0, Y_ENT), (7.0, alto_en(7.0))]]
    for t in trozos:
        cara(grupo, MARMOL_V, [P(x, zt, y) for x, y in t], uvs=[(x / 2.4, y / 2.4) for x, y in t], hacia=n)
    if not roto:
        return
    # Las dos cornisas inclinadas: lo que dibuja el triángulo contra el cielo.
    z0, z1 = z_cara - 1.5 * hacia_z, z_cara + 0.3 * hacia_z
    for s in (-1, 1):
        a, b = (s * 11.65, Y_ENT), (0.0, Y_ENT + H_FRONTON + 0.12)
        g = 0.45
        largo = math.hypot(b[0] - a[0], b[1] - a[1])
        uv = [(0, 0), (largo / 2.0, 0), (largo / 2.0, 0.25), (0, 0.25)]
        for z, d in ((z1, hacia_z), (z0, -hacia_z)):                                # las dos caras
            cara(grupo, MARMOL_L, [P(a[0], z, a[1]), P(b[0], z, b[1]), P(b[0], z, b[1] + g), P(a[0], z, a[1] + g)], uvs=uv, hacia=V((0, -d, 0)))
        cara(grupo, MARMOL_L, [P(a[0], z0, a[1] + g), P(b[0], z0, b[1] + g), P(b[0], z1, b[1] + g), P(a[0], z1, a[1] + g)], uvs=uv, hacia=V((s * 0.25, 0, 1)))   # el lomo
        cara(grupo, MARMOL_L, [P(a[0], z0, a[1]), P(b[0], z0, b[1]), P(b[0], z1, b[1]), P(a[0], z1, a[1])], uvs=uv, hacia=V((-s * 0.25, 0, -1)))              # por debajo
        cara(grupo, MARMOL_L, [P(a[0], z0, a[1]), P(a[0], z1, a[1]), P(a[0], z1, a[1] + g), P(a[0], z0, a[1] + g)], hacia=V((s, 0, 0)), baldosa=2.0)           # el alero
frontón('P', ZC + 0.72, 1)
frontón('E', ZF - 0.72, -1, roto=False)                                          # del de atrás solo quedan las esquinas

# --- por dentro: los dos pórticos, los muros de la cella y el pozo -----------------------------
for x in XS6:
    dorica('P', x, ZP, alto=6.8, r=0.6)
    dorica('E', x, ZF + 3.2, alto=6.8, r=0.6)
viga('P', MARMOL, -8.3, 8.3, ZP - 0.6, ZP + 0.6, YS + 6.8, YS + 7.7, u_m=2.4)        # la viga del pórtico
viga('E', MARMOL, -8.3, 8.3, ZF + 2.6, ZF + 3.8, YS + 6.8, YS + 7.7, u_m=2.4)
Z_CELLA0, Z_CELLA1 = ZF + 6.4, ZP - 3.2                                           # de atrás a delante
def alto_muro (lado, z):
    """Lo que queda de cada muro: el norte casi entero; el sur, caído en medio."""
    t = (z - Z_CELLA0) / (Z_CELLA1 - Z_CELLA0)
    if lado < 0:
        return 7.5 - 1.2 * abs(math.sin(z * 0.37)) - 2.5 * sm(0.3, 0.5, t) * sm(0.75, 0.55, t)
    return 7.5 - 5.6 * sm(0.18, 0.36, t) * sm(0.86, 0.66, t) - 0.9 * abs(math.sin(z * 0.53))
for lado in (-1, 1):
    z = Z_CELLA0
    while z < Z_CELLA1 - 0.2:
        tramo = min(Z_CELLA1 - z, random.uniform(2.4, 3.6))
        h = alto_muro(lado, z + tramo / 2)
        caja('P' if z + tramo > ZP - 9 else 'E', MARMOL_V, lado * 7.45, lado * 8.35, z, z + tramo, YS, YS + h, baldosa=2.4)
        z += tramo
    # Lo que queda del muro de la puerta: dos machones. Lo demás se cayó hace siglos
    # (aquí, para que quepan los cinco carriles).
    caja('P', MARMOL_V, lado * 6.95, lado * 8.35, Z_CELLA1 - 0.9, Z_CELLA1, YS, YS + 7.5, baldosa=2.4)
caja('E', MARMOL_V, -8.35, 8.35, Z_CELLA0 - 0.9, Z_CELLA0, YS, YS + 7.2, baldosa=2.4)   # el muro del fondo
cara('EP', NEGRO, [P(-1.7, Z_CELLA0 + 0.02, YS), P(1.7, Z_CELLA0 + 0.02, YS), P(1.7, Z_CELLA0 + 0.02, YS + 5.4), P(-1.7, Z_CELLA0 + 0.02, YS + 5.4)], hacia=V((0, -1, 0)))
# El pozo: donde estuvo la Atenea de oro y marfil, una boca de resina con luz verde.
POZO = (0.0, -88.0)
torno('E', RESINA, en(POZO[0], POZO[1], YS), [(5.0, 0.0), (4.7, 0.55), (3.9, 0.8), (3.5, 0.35), (3.4, 0.02)], lados=22, tapas=(False, False))
cara('EP', VERDE, [P(POZO[0] + 3.4 * math.cos(a), POZO[1] + 3.4 * math.sin(a), YS + 0.05) for a in np.linspace(0, 2 * math.pi, 22, endpoint=False)], hacia=ARRIBA)
for i in range(9):                                                               # las raíces que salen de él
    a = random.uniform(0, 6.28)
    d = random.uniform(5.5, 9.0)
    x1, z1 = POZO[0] + d * math.cos(a), POZO[1] + d * math.sin(a)
    if abs(x1) < 7.0:
        barra('E', RESINA, P(POZO[0] + 4.6 * math.cos(a), POZO[1] + 4.6 * math.sin(a), YS + 0.25), P(x1, z1, YS + 0.05), 0.4)
for lado in (-1, 1):                                                             # y su resplandor al pie de los muros
    cara('EP', VERDE, [P(lado * 7.4, Z_CELLA1 - 1.0, YS + 0.25), P(lado * 7.4, Z_CELLA1 - 14, YS + 0.25), P(lado * 7.4, Z_CELLA1 - 14, YS + 0.5), P(lado * 7.4, Z_CELLA1 - 1.0, YS + 0.5)], hacia=V((-lado, 0, 0)))

# ==================================================================================
# 3. LA PISTA Y LO QUE LA ACOMPAÑA
# ==================================================================================
config_suelo(-1400, 1400, -1400, 1400, (-82, 76), (-206, 86))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])

# --- el pórtico de las Cariátides, a la izquierda, mirando al campo ----------------------------
KX0, KX1, KZ0, KZ1 = -13.8, -9.5, -43.6, -36.4
caja('P', MARMOL_V, KX0, KX1, KZ0, KZ1, 0.0, 1.45, techo=MARMOL, baldosa=2.4)
viga('P', MARMOL_L, KX0 - 0.1, KX1 + 0.1, KZ0 - 0.1, KZ1 + 0.1, 1.45, 1.62, u_m=2.0)
DONCELLA = [(0.25, 0.0), (0.21, 0.22), (0.2, 0.5), (0.255, 0.78), (0.2, 1.0), (0.245, 1.2), (0.265, 1.33), (0.1, 1.42), (0.135, 1.52), (0.125, 1.62), (0.21, 1.65), (0.25, 1.74)]
for x, z in [(KX1 - 0.5, KZ0 + 0.75), (KX1 - 0.5, KZ0 + 2.55), (KX1 - 0.5, KZ1 - 2.55), (KX1 - 0.5, KZ1 - 0.75), (KX0 + 1.7, KZ0 + 0.75), (KX0 + 1.7, KZ1 - 0.75)]:
    torno('P', MARMOL_L, en(x, z, 1.62, random.uniform(0, 3)), DONCELLA, lados=10, tapas=(False, True), v_m=1.74)
viga('P', MARMOL, KX0 + 1.1, KX1 + 0.05, KZ0 + 0.2, KZ1 - 0.2, 3.36, 3.8, u_m=2.0)       # el arquitrabe que sostienen
viga('P', MARMOL_L, KX0 + 0.95, KX1 + 0.25, KZ0, KZ1, 3.8, 4.05, u_m=2.0)
for z in np.arange(KZ0 + 0.3, KZ1 - 0.2, 0.42):                                          # los dentículos
    caja('P', MARMOL_L, KX1 + 0.05, KX1 + 0.2, z, z + 0.2, 3.62, 3.8, baldosa=1.0)
# Detrás, el cuerpo del Erecteion y sus dos pórticos jónicos (se ven en el vuelo).
caja('E', MARMOL_V, -31.0, KX0, -46.5, -33.5, 0.0, 6.2, techo=MARMOL_V, baldosa=2.4)
for z in np.linspace(-45.6, -34.4, 6):
    torno('E', FUSTE, en(-32.4, z, 0.0), [(0.34, 0.0), (0.3, 5.4), (0.42, 5.6)], lados=10, tapas=(False, True))
viga('E', MARMOL, -33.2, -31.0, -46.5, -33.5, 5.6, 6.5, u_m=2.0)
for x in np.linspace(-27.5, -20.5, 4):
    torno('E', FUSTE, en(x, -31.9, -1.2), [(0.38, 0.0), (0.33, 6.4), (0.46, 6.6)], lados=10, tapas=(False, True))
viga('E', MARMOL, -28.4, -19.6, -33.5, -31.0, 5.4, 6.3, u_m=2.0)

# --- el olivo de Atenea, junto al Erecteion ----------------------------------------------------
def copa (grupo, mat, x, z, y, rx, ry, sub=1, baila=0.12):
    """Una masa de hojas: una bola de caras planas, algo deformada."""
    bm, _, _ = lote(grupo, mat)
    r = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0,
        matrix=M.Translation(P(x, z, y)) @ M.Rotation(random.random() * 6.3, 4, 'Z') @ M.Diagonal((rx, rx, ry, 1)))
    for v in r['verts']:
        v.co += V((random.uniform(-1, 1) * rx, random.uniform(-1, 1) * rx, random.uniform(-1, 1) * ry)) * baila

def olivo (grupo, x, z, tam=1.0, y=0.0):
    """Tronco corto y retorcido que se abre en dos, y la copa en varias masas plateadas."""
    a = random.uniform(0, 6.28)
    cruz = P(x + 0.18 * tam * math.cos(a), z + 0.18 * tam * math.sin(a), y + 1.3 * tam)
    barra(grupo, TRONCO, P(x, z, y - 0.3), cruz, 0.42 * tam)
    for k in range(5):
        b = a + 2 * math.pi * k / 5 + random.uniform(-0.3, 0.3)
        d = random.uniform(0.7, 1.25) * tam * (k > 0)
        px, pz, py = x + d * math.cos(b), z + d * math.sin(b), y + random.uniform(2.2, 2.9) * tam + (0.5 * tam if k == 0 else 0)
        if k in (1, 3):
            barra(grupo, TRONCO, cruz, P(px, pz, py - 0.3 * tam), 0.2 * tam)
        copa(grupo, OLIVOS[k % 3], px, pz, py, random.uniform(1.0, 1.35) * tam, random.uniform(0.75, 0.95) * tam)

def pino (grupo, x, z, tam=1.0, y=0.0):
    """Pino piñonero: tronco largo y la copa ancha y chata, como un paraguas."""
    alto = random.uniform(4.2, 6.0) * tam
    dx, dz = random.uniform(-0.5, 0.5) * tam, random.uniform(-0.5, 0.5) * tam
    barra(grupo, TRONCO, P(x, z, y - 0.8), P(x + dx, z + dz, y + alto), 0.36 * tam)
    copa(grupo, random.choice(PINOS), x + dx, z + dz, y + alto + 0.6 * tam, random.uniform(2.4, 3.3) * tam, random.uniform(1.0, 1.4) * tam)

def cipres (grupo, x, z, tam=1.0, y=0.0):
    torno(grupo, CIPRES, en(x, z, y - 0.6), [(0.85 * tam, 0.0), (1.0 * tam, 2.4 * tam), (0.6 * tam, 6.5 * tam), (0.0, random.uniform(9, 12) * tam)], lados=6, tapas=(False, False))

olivo('EV', -10.1, -30.6, 0.95)
# --- la base alien, a la derecha, sobre el pedestal redondo de la Atenea de bronce -------------
BASE = (13.2, -47.0)
circulo = [(BASE[0] + 5.3 * math.cos(2 * math.pi * i / 28), BASE[1] + 5.3 * math.sin(2 * math.pi * i / 28)) for i in range(28)]
cara('P', MARMOL, [P(x, z, 0.03) for x, z in circulo], hacia=ARRIBA, baldosa=2.4)
prisma('P', MARMOL_L, [(BASE[0] + 5.6 * math.cos(2 * math.pi * i / 28), BASE[1] + 5.6 * math.sin(2 * math.pi * i / 28)) for i in range(28)], -0.2, 0.02, baldosa=2.0)

# --- la bandera, a la derecha y cerca: la del mirador --------------------------------------------
FX, FZ = 10.4, -15.0
barra('EV', HIERRO, P(FX, FZ, 0.0), P(FX, FZ, 7.6), 0.12)
bloque('P', MARMOL_V, en(FX, FZ), (1.1, 1.1, 0.5))
for dz, d in ((0.0, 1), (0.02, -1)):
    cara('EV', BANDERA, [P(FX + 0.06, FZ + dz, 5.9), P(FX + 2.6, FZ + dz + 0.25, 5.8), P(FX + 2.6, FZ + dz + 0.25, 7.45), P(FX + 0.06, FZ + dz, 7.5)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))

# --- las piezas sueltas: tambores, capiteles y sillares numerados, como los tienen hoy ----------
def tambor (grupo, x, z, r=0.6, largo=1.0, de_pie=True):
    if de_pie:
        torno(grupo, FUSTE, en(x, z, 0.0, random.uniform(0, 3)), [(r, 0.0), (r * 0.98, largo)], lados=14, roto=0.05)
    else:
        torno(grupo, FUSTE, en(x, z, r, random.uniform(0, 3), (math.pi / 2, 0.0)), [(r, -largo / 2), (r * 0.97, largo / 2)], lados=14, roto=0.05)
for i, z in enumerate(np.arange(-56.0, 9.0, 5.4)):
    for lado in (-1, 1):
        x = lado * random.uniform(8.35, 9.0)
        if (lado < 0 and KZ0 - 1.5 < z < KZ1 + 1.5) or (lado > 0 and abs(z - BASE[1]) < 6.5) or (lado > 0 and abs(z - FZ) < 1.6):
            continue
        tipo = (i * 2 + (lado > 0) * 3) % 5
        if tipo == 0:
            tambor('P', x, z, random.uniform(0.5, 0.62), random.uniform(0.7, 1.2))
        elif tipo == 1:
            tambor('P', x, z, 0.5, random.uniform(1.0, 1.5), de_pie=False)
        elif tipo == 2:
            bloque('P', MARMOL_V, en(x, z, 0.0, random.uniform(-0.3, 0.3)), (0.95, 1.25, 0.5))
            bloque('P', MARMOL_L, en(x + lado * 0.1, z + 0.1, 0.5, random.uniform(-0.5, 0.5)), (0.7, 0.9, 0.42))
        elif tipo == 3:
            torno('P', MARMOL_L, en(x, z, 0.0, random.uniform(0, 3)), [(0.5, 0.0), (0.52, 0.04), (0.74, 0.16), (0.78, 0.22)], lados=14, tapas=(True, False), v_m=1.0)
            bloque('P', MARMOL_L, en(x, z, 0.22), (1.6, 1.6, 0.2))                 # un capitel, del revés no: de pie
        else:
            bloque('P', MARMOL_V, en(x, z, 0.0, random.uniform(-0.4, 0.4)), (1.0, 0.75, 0.62))
# Esquirlas por la pista: se pisan. Van con la luz en los vértices: en el mapa de luz
# cada una es menos de un píxel y salían como confeti negro.
for _ in range(46):
    bloque('EV', MARMOL_L, en(random.uniform(-7.2, 7.2), random.uniform(-58, 8), 0.0, random.uniform(0, 3), (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2))),
           (random.uniform(0.12, 0.26), random.uniform(0.1, 0.22), random.uniform(0.06, 0.14)), mella=0.2)

comprobar_paso(('E', 'EP', 'P', 'EV'), salvo=('marmol-liso',), z_lejos=-60.5)

# ==================================================================================
# 4. LA MESETA, LOS PROPILEOS Y LA ROCA
# ==================================================================================
MESETA = [(-14, 68), (12, 70), (28, 60), (40, 30), (50, -10), (56, -60), (54, -110), (44, -160), (20, -188), (-12, -192), (-40, -178),
          (-58, -140), (-66, -90), (-64, -40), (-54, 5), (-38, 40), (-24, 60)]
def crecer (pts, k, ruido=0.0):
    return [(CENTRO[0] + (x - CENTRO[0]) * k * (1 + random.uniform(-ruido, ruido)), CENTRO[1] + (z - CENTRO[1]) * k * (1 + random.uniform(-ruido, ruido))) for x, z in pts]
def afinar (pts, n=3):
    """Más puntos por lado, para que la roca no baje en facetas enormes."""
    out = []
    for i in range(len(pts)):
        (ax, az), (bx, bz) = pts[i], pts[(i + 1) % len(pts)]
        out += [(ax + (bx - ax) * t / n, az + (bz - az) * t / n) for t in range(n)]
    return out
MESETA = afinar(MESETA)
# La meseta, un pelo por debajo de la pista (que va encima) y en el modelo de juego.
cara('GP', ROCA, [P(x, z, -0.04) for x, z in MESETA], hacia=ARRIBA, baldosa=17.0)
# El pretil y la muralla: sillares ocres, diez metros a plomo sobre la peña.
DENTRO = crecer(MESETA, 0.985)
franja('C', MURALLA, MESETA, 0.95, MESETA, -11.0, 'fuera', u_baldosa=7.0, v0=0.0, v1=1.7)
franja('E', MURALLA, DENTRO, -0.04, DENTRO, 0.95, 'dentro', u_baldosa=7.0, v0=1.55, v1=1.7)
franja('E', MURALLA, DENTRO, 0.95, MESETA, 0.95, ARRIBA, u_baldosa=7.0, v0=0.0, v1=0.1)
# La peña, que se abre hacia abajo hasta la ciudad.
MEDIA, PIE = crecer(MESETA, 1.2, 0.03), crecer(MESETA, 1.62, 0.05)
franja('C', PENA, MESETA, -11.0, MEDIA, -40.0, 'fuera', u_baldosa=16.0, v0=0.0, v1=2.0)
franja('C', PENA, MEDIA, -40.0, PIE, ABAJO_Y, 'fuera', u_baldosa=16.0, v0=2.0, v1=4.5)

# --- los Propileos, a la espalda: por encima entra la cámara -----------------------------------
for z in (44.0, 58.0):
    for x in (-6.5, -3.9, -1.5, 1.5, 3.9, 6.5):
        dorica('E', x, z, alto=6.2, r=0.56, y=0.0, lados=12)
    viga('E', MARMOL, -7.4, 7.4, z - 0.6, z + 0.6, 6.2, 7.0, u_m=2.4)
    viga('E', FRISO, -7.4, 7.4, z - 0.6, z + 0.6, 7.0, 7.8, u_m=PASO / 2, tapas=False)
    viga('E', MARMOL_L, -7.7, 7.7, z - 0.9, z + 0.9, 7.8, 8.15, u_m=2.0)
for lado in (-1, 1):
    caja('E', MARMOL_V, lado * 7.0, lado * 7.9, 44.6, 57.4, 0.0, 7.0, baldosa=2.4)       # los muros del paso
caja('E', MARMOL_V, -17.5, -8.6, 45.0, 57.5, 0.0, 5.6, techo=MARMOL_V, baldosa=2.4)      # el ala norte (la Pinacoteca)
for x in (-15.6, -13.0, -10.4):
    dorica('E', x, 44.2, alto=4.6, r=0.42, y=0.0, lados=10)
# El templo de Atenea Niké, en su bastión, al suroeste.
caja('E', MURALLA, 9.5, 20.0, 49.0, 62.0, -6.0, 0.6, techo=MARMOL_V, baldosa=4.0)
caja('E', MARMOL, 11.5, 16.0, 52.0, 58.5, 0.6, 3.6, techo=MARMOL_L, baldosa=2.0)
for z in (51.2, 59.3):
    for x in np.linspace(11.9, 15.6, 4):
        torno('E', FUSTE, en(x, z, 0.6), [(0.22, 0.0), (0.2, 2.8), (0.3, 3.0)], lados=8, tapas=(False, True))
    viga('E', MARMOL_L, 11.3, 16.2, z - 0.4, z + 0.4, 3.6, 4.1, u_m=2.0)
# El mirador del extremo este, con su bandera grande.
MIR = (4.0, -180.0)
prisma('E', MURALLA, [(MIR[0] + 6 * math.cos(2 * math.pi * i / 14), MIR[1] + 6 * math.sin(2 * math.pi * i / 14)) for i in range(14)], 0.0, 1.6, techo=MARMOL_V, baldosa=4.0)
barra('EV', HIERRO, P(MIR[0], MIR[1], 1.6), P(MIR[0], MIR[1], 14.0), 0.2)
for dz, d in ((0.0, 1), (0.03, -1)):
    cara('EV', BANDERA, [P(MIR[0] + 0.1, MIR[1] + dz, 10.4), P(MIR[0] + 5.4, MIR[1] + dz + 0.5, 10.2), P(MIR[0] + 5.4, MIR[1] + dz + 0.5, 13.7), P(MIR[0] + 0.1, MIR[1] + dz, 13.8)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))
# Sillares en hileras por la meseta, como los tienen ordenados los restauradores.
for _ in range(120):
    x, z = random.uniform(-58, 50), random.uniform(-175, 40)
    if abs(x) < 11 and z > -62 or (abs(x) < 14 and -116 < z < -60) or (-34 < x < -8 and -48 < z < -30) or math.hypot(x - BASE[0], z - BASE[1]) < 7:
        continue
    if (x / 60) ** 2 + ((z + 62) / 128) ** 2 > 0.72:
        continue
    for k in range(random.randint(2, 5)):
        bloque('E', random.choice((MARMOL_V, MARMOL_L)), en(x + k * 1.3, z, 0.0, random.uniform(-0.1, 0.1)), (1.05, random.uniform(0.7, 1.4), random.uniform(0.4, 0.7)))

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
suelo('G', CALLE, -1400, 1400, -1400, 1400, ABAJO_Y, 14.0)
suelo('G', TIERRA, -270, 250, -420, 300, ABAJO_Y + 0.05, 12.0)                   # las laderas y los parques de alrededor
suelo('G', HIERBA, -520, -140, 30, 300, ABAJO_Y + 0.08, 12.0)                    # el Ágora antigua, al noroeste

def fuera_de_la_roca (x, z, k=1.0):
    return ((x - CENTRO[0]) / (105 * k)) ** 2 + ((z - CENTRO[1]) / (215 * k)) ** 2 > 1

# --- el Odeón de Herodes Ático, al pie de la ladera sur ---------------------------------------
OX, OZ, OY = 118.0, 6.0, ABAJO_Y + 6
# Las gradas son ESCALONES (contrahuella y huella), y por fuera llevan su muro
# hasta el suelo: en rampa lisa y sin muro parecía un platillo posado en la ladera.
N_GR = 11
def aro_odeon (r):
    return [(OX + r * math.cos(a), OZ + r * math.sin(a)) for a in np.linspace(math.pi * 0.5, math.pi * 1.5, 25)]
def tira_odeon (mat, pts, y0, y1, hacia_dentro, baldosa=2.4):
    c = P(OX, OZ)
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        m = (P(ax, az) + P(bx, bz)) / 2
        d = V((c.x - m.x, c.y - m.y, 0)) * (1 if hacia_dentro else -1)
        cara('C', mat, [P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1)], hacia=d, baldosa=baldosa)
for j in range(N_GR):
    y = OY + j * 1.2
    tira_odeon(MARMOL_L, aro_odeon(12 + 2.8 * j), y, y + 1.2, True)
    franja('C', MARMOL_V, aro_odeon(12 + 2.8 * j), y + 1.2, aro_odeon(12 + 2.8 * (j + 1)), y + 1.2, ARRIBA, u_baldosa=3.0, cerrada=False)
tira_odeon(MURALLA, aro_odeon(12 + 2.8 * N_GR), ABAJO_Y, OY + N_GR * 1.2, False, baldosa=7.0)
caja('C', ODEON, OX + 0.5, OX + 5.0, OZ - 44, OZ + 44, OY - 6, OY + 20, baldosa=8.0)
rect('C', MARMOL_V, OX - 12, OX + 0.5, OZ - 12, OZ + 12, OY, 2.4)
# El teatro de Dioniso, más al este: solo las gradas.
TX, TZ = 100.0, -120.0
for j in range(7):
    a0 = [(TX + (10 + 4 * j) * math.cos(a), TZ + (10 + 4 * j) * math.sin(a)) for a in np.linspace(math.pi * 0.55, math.pi * 1.45, 15)]
    a1 = [(TX + (14 + 4 * j) * math.cos(a), TZ + (14 + 4 * j) * math.sin(a)) for a in np.linspace(math.pi * 0.55, math.pi * 1.45, 15)]
    franja('T', MARMOL_V, a0, ABAJO_Y + 2 + j * 1.6, a1, ABAJO_Y + 3.6 + j * 1.6, ARRIBA, u_baldosa=3.0, cerrada=False)

# --- los montes: el Licabeto con su capilla, Filopapo y las sierras de lejos --------------------
def monte (cx, cz, radio, alto, mat, seg=18, anillos=7, y0=ABAJO_Y, grupo='T', pico=0.75, baldosa=26.0):
    """Un cerro. Devuelve una función con su altura en (x, z) —o None fuera de él—,
    para plantarle árboles encima. La textura va proyectada en planta: dándole la
    vuelta al cerro se apretaba en la cima y de cerca era una mancha borrosa."""
    fases = [random.uniform(0, 6.28) for _ in range(3)]
    def r_en (t, a):
        return radio * (1 - t) ** pico * (1 + 0.14 * math.sin(a * 2 + fases[0]) + 0.08 * math.sin(a * 5 + fases[1] + t * 3))
    def y_en (t, a):
        return y0 + alto * math.sin(t * math.pi / 2) * (1 + 0.05 * math.sin(a * 3 + fases[2]))
    angs = [2 * math.pi * i / seg for i in range(seg)]
    filas = [[P(cx + r_en(j / anillos, a) * math.cos(a), cz + r_en(j / anillos, a) * math.sin(a), y_en(j / anillos, a)) for a in angs] for j in range(anillos + 1)]
    for j in range(anillos):
        for i in range(seg):
            k = (i + 1) % seg
            pts = [filas[j][i], filas[j][k], filas[j + 1][k], filas[j + 1][i]]
            cara(grupo, mat, pts[:3] if j == anillos - 1 else pts, hacia=ARRIBA, baldosa=baldosa)
    def altura (x, z):
        a, d = math.atan2(z - cz, x - cx), math.hypot(x - cx, z - cz)
        if d >= r_en(0, a):
            return None
        for j in range(anillos):                                  # entre qué dos anillos cae
            r0, r1 = r_en(j / anillos, a), r_en((j + 1) / anillos, a)
            if d >= r1:
                f = (r0 - d) / max(1e-6, r0 - r1)
                return y_en(j / anillos, a) * (1 - f) + y_en((j + 1) / anillos, a) * f
        return y_en(1, a)
    return altura

def sierra (x0, z0, x1, z1, ancho, alto, n=28, m=4):
    """Una sierra de lejos: una loma larga, con la cresta que sube y baja."""
    largo = math.hypot(x1 - x0, z1 - z0)
    ux, uz = (x1 - x0) / largo, (z1 - z0) / largo
    f = [random.uniform(0, 6.28) for _ in range(4)]
    filas = []
    for j in range(-m, m + 1):                                    # de un pie al otro, pasando por la cresta
        s = j / m
        fila = []
        for i in range(n + 1):
            t = i / n
            cresta = alto * math.sin(math.pi * t) ** 0.55 * (0.74 + 0.15 * math.sin(t * 8 + f[0]) + 0.11 * math.sin(t * 21 + f[1]))
            lado = ancho * (0.8 + 0.2 * math.sin(t * 6 + f[2])) * s
            comba = 0.05 * largo * math.sin(math.pi * t) * math.sin(f[3])
            fila.append(P(x0 + ux * largo * t - uz * (lado + comba), z0 + uz * largo * t + ux * (lado + comba), ABAJO_Y + 0.5 + cresta * (1 - abs(s) ** 1.4)))
        filas.append(fila)
    malla('T', MONTE_L, filas, ARRIBA)

# El Licabeto, al noreste: la falda de pinos y, arriba, la peña pelada con San Jorge.
# Está donde está para que al arrancar el vuelo asome a la IZQUIERDA de la Acrópolis:
# justo detrás, el Partenón se recortaba contra un cerro en vez de contra el cielo.
LX, LZ = -1450.0, -1040.0
h_lic = monte(LX, LZ, 225, 170, PINAR, seg=26, anillos=7, pico=1.3)
monte(LX, LZ, 80, 207, PENA, seg=12, anillos=5, pico=1.3, baldosa=30.0)
caja('T', FACHADAS[2], LX - 8, LX + 8, LZ - 5.5, LZ + 5.5, ABAJO_Y + 198, ABAJO_Y + 207, techo=AZOTEA, baldosa=8)
torno('T', MARMOL_L, en(LX, LZ, ABAJO_Y + 207), [(3.6, 0.0), (3.2, 2.0), (1.8, 3.4), (0.0, 4.0)], lados=10, tapas=(False, False))
# Filopapo, al suroeste: de ahí sale la cámara. Hierba agostada, pinos y su monumento.
FILO = (330.0, 260.0)
h_filo = monte(FILO[0], FILO[1], 215, 80, HIERBA, seg=30, anillos=8)
caja('T', MARMOL_V, 327, 333, 258, 262, ABAJO_Y + 78, ABAJO_Y + 90, baldosa=4)
monte(-125, 108, 62, 46, PENA, seg=14, anillos=5)                                # el Areópago
# Las sierras que cierran la cuenca: el Himeto al este, el Pentélico al noreste y el Parnés al norte.
sierra(-900, -2650, 1900, -2150, 560, 330)
sierra(-2550, -1750, -1150, -2750, 480, 270)
sierra(-2850, 900, -2700, -1350, 520, 300)
# Y hasta su pie, la ciudad que ya no se distingue: un llano del color de las azoteas
# al sol. Sin luz ('plano'): con la luz en los vértices, los de dentro quedaban
# debajo del suelo de la ciudad, a oscuras, y dibujaban una franja negra tras ella.
LLANO = material('llano', color=(0.435, 0.352, 0.262), rug=1.0)
aro = lambda r: [(CENTRO[0] + r * math.cos(2 * math.pi * i / 28), CENTRO[1] + r * math.sin(2 * math.pi * i / 28)) for i in range(28)]
franja('CP', LLANO, aro(1300), ABAJO_Y - 1.5, aro(2050), ABAJO_Y - 1.5, ARRIBA, u_baldosa=200)
franja('CP', LLANO, aro(2050), ABAJO_Y - 1.5, aro(2950), ABAJO_Y - 1.5, ARRIBA, u_baldosa=200)
# El mar, al suroeste, con el sol encima.
cara('CP', MAR, [P(250, 1150, ABAJO_Y + 1), P(2900, 1150, ABAJO_Y + 1), P(2900, 2900, ABAJO_Y + 1), P(-600, 2900, ABAJO_Y + 1), P(-600, 1700, ABAJO_Y + 1)], hacia=ARRIBA)

# --- olivos, pinos y cipreses por las laderas y los parques ------------------------------------
def planta_uno (x, z, y, tam=1.0):
    r = random.random()
    if r < 0.45:
        pino('T', x, z, random.uniform(0.8, 1.15) * tam, y)
    elif r < 0.78:
        arbol('T', TRONCO, OLIVOS, x, z, random.uniform(0.75, 1.15) * tam, y=y - 0.4)
    else:
        cipres('T', x, z, random.uniform(0.7, 1.0) * tam, y)

for _ in range(520):
    x, z = random.uniform(-265, 245), random.uniform(-415, 295)
    if not fuera_de_la_roca(x, z, 0.92) or math.hypot(x - OX, z - OZ) < 55 or math.hypot(x - TX, z - TZ) < 44 or math.hypot(x + 125, z - 108) < 66:
        continue
    planta_uno(x, z, ABAJO_Y, 1.25)
for _ in range(110):
    planta_uno(random.uniform(-515, -145), random.uniform(35, 295), ABAJO_Y, 1.3)
# Los de Filopapo. Por donde arranca el vuelo, ni uno: la cámara sale de entre ellos.
VUELO0 = ((262.0, 192.0), (150.0, 240.0))
def lejos_del_vuelo (x, z, margen=12.0):
    (ax, az), (bx, bz) = VUELO0
    t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)))
    return math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t) > margen
def delante_de_la_camara (x, z, grados=9.0, hasta=210.0):
    """En la cuña por la que la primera imagen mira a la Acrópolis: un pino ahí la tapa."""
    (ax, az) = VUELO0[0]
    dx, dz, mx, mz = x - ax, z - az, CENTRO[0] - ax, CENTRO[1] - az
    largo = math.hypot(dx, dz)
    if largo < 1 or largo > hasta:
        return largo < 1
    return (dx * mx + dz * mz) / (largo * math.hypot(mx, mz)) > math.cos(math.radians(grados))
for _ in range(620):
    a, d = random.uniform(0, 6.28), 212 * math.sqrt(random.random())
    x, z = FILO[0] + d * math.cos(a), FILO[1] + d * math.sin(a)
    y = h_filo(x, z)
    if y is not None and lejos_del_vuelo(x, z) and not delante_de_la_camara(x, z) and math.hypot(x - FILO[0], z - FILO[1]) > 9:
        planta_uno(x, z, y)
# El pinar del Licabeto. Está a kilómetro y medio: copas sin tronco, que con él
# parecían setas clavadas en la ladera.
for _ in range(360):
    a, d = random.uniform(0, 6.28), 35 + 185 * math.sqrt(random.random())
    x, z = LX + d * math.cos(a), LZ + d * math.sin(a)
    y = h_lic(x, z)
    if y is not None:
        r = random.uniform(6.0, 9.5)
        torno('T', random.choice(PINOS), en(x, z, y - 1.5, random.uniform(0, 1.2)), [(r, 0.0), (r * 0.85, r * 0.6), (0.0, r * 1.05)], lados=5, tapas=(False, False))
print('SUELO BAJO LA CÁMARA DEL VUELO', round(h_filo(*VUELO0[0]) or -99, 1))
# El templo de Hefesto, entero, en el Ágora.
HX, HZ = -330.0, 150.0
caja('T', MARMOL_V, HX - 8, HX + 8, HZ - 16, HZ + 16, ABAJO_Y + 4, ABAJO_Y + 5.5, baldosa=3)
for z in np.linspace(HZ - 14.5, HZ + 14.5, 11):
    for x in (HX - 7, HX + 7):
        barra('T', MARMOL_L, P(x, z, ABAJO_Y + 5.5), P(x, z, ABAJO_Y + 11.5), 1.0)
caja('T', MARMOL_V, HX - 8, HX + 8, HZ - 16, HZ + 16, ABAJO_Y + 11.5, ABAJO_Y + 13.5, baldosa=3)
tejado('T', MARMOL_L, HX - 8, HX + 8, HZ - 16, HZ + 16, ABAJO_Y + 13.5, 2.4)

# --- la ciudad: bloques blancos de pisos, hasta donde alcanza la vista -------------------------
# Atenas no es una cuadrícula. Las manzanas van GIRADAS respecto al eje del juego,
# cada una de su tamaño y un poco descolocada: derechas y todas iguales, desde
# arriba las calles eran pasillos rectos hasta el horizonte y parecía una maqueta.
PASO_C = 46.0
GIRO_C = math.radians(23)
n_ed = 0
for gx in np.arange(-1900.0, 1900.0, PASO_C):
    for gz in np.arange(-1900.0, 1900.0, PASO_C):
        cx = gx * math.cos(GIRO_C) - gz * math.sin(GIRO_C) + random.uniform(-4, 4)
        cz = gx * math.sin(GIRO_C) + gz * math.cos(GIRO_C) + random.uniform(-4, 4)
        if abs(cx) > 1320 or abs(cz) > 1320 or not fuera_de_la_roca(cx, cz, 1.45):
            continue
        if -545 < cx < -120 and 5 < cz < 320:                    # el Ágora
            continue
        if math.hypot(cx - LX, cz - LZ) < 240 or math.hypot(cx - FILO[0], cz - FILO[1]) < 300 or math.hypot(cx + 125, cz - 108) < 86:
            continue
        if cz > 1100 and cx > 200 - (cz - 1100) * 0.5:           # el mar
            continue
        if random.random() < 0.06:
            continue
        alto = random.choice([10, 13, 16, 16, 19, 22])
        ax, az = random.choice((12.0, 13.5, 15.0, 16.5, 18.0)), random.choice((12.0, 13.5, 15.0, 16.5, 18.0))
        g = GIRO_C + random.uniform(-0.07, 0.07)
        planta = [(cx + dx * math.cos(g) - dz * math.sin(g), cz + dx * math.sin(g) + dz * math.cos(g)) for dx, dz in ((-ax, az), (ax, az), (ax, -az), (-ax, -az))]
        prisma('T', random.choice(FACHADAS), planta, ABAJO_Y, ABAJO_Y + alto, techo=AZOTEA)
        n_ed += 1
print('EDIFICIOS', n_ed)

cupula('CP', CIELO, 3000.0, CENTRO[0], CENTRO[1])

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'P': ('luzS-pista', 'atlas', 'luzS'),
        'E': ('luzE', 'atlas', 'luzE'),
        'GP': ('luzG-meseta', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-atenas', ['P', 'E', 'GP', 'EV', 'EP']), ('lugar-atenas-ciudad', ['C', 'G', 'T', 'CP'])],
    # El atardecer está en el COLOR del sol, no en su altura: con un naranja suave
    # (1, 0,74, 0,46) y el cielo a 0,5, el azul del cielo mandaba y la roca salía
    # fría, de mediodía nublado. Sol muy naranja y fuerte, cielo flojo.
    sol_hacia=SOL, sol_color=(1.0, 0.56, 0.24), sol_fuerza=7.5, sol_ancho=4.0, cielo_fuerza=0.3, cielo_altura=6, cielo_giro=200,
    escala=0.6, satura=1.0, no_alumbran=('CP',), suaves=('monte-lejos', 'pinar', 'hierba', 'pena'))
