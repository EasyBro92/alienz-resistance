# Salónica: el paseo de Nikis con la Torre Blanca al fondo (06/10/2026).
#   blender -b -P herramientas/blender/lugar_salonica.py              (entero)
#   blender -b -P herramientas/blender/lugar_salonica.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_salonica.py -- --reusar  (retocar la luz)
#
# Isidro eligió para Salónica «la más reconocible» (el paseo marítimo con la Torre
# Blanca), los alienz EN NAVE como siempre, DE DÍA y con llegada larga. Misma
# receta que los demás lugares de luz horneada (horneado.py).
#
# Cómo es de verdad: la avenida Nikis corre pegada al mar, del puerto (al
# noroeste) a la Torre Blanca (al sureste), sin barandilla: el paseo acaba en el
# agua. Del otro lado de la calzada, la pared de bloques de pisos con los cafés
# abajo. Aquí se juega en el PASEO mirando al sureste, hacia la torre:
#   · a la DERECHA el canto del muelle y el mar, con barcas amarradas y la goleta
#     de madera de los paseos por el golfo;
#   · a la IZQUIERDA la calzada de Nikis con sus coches (los taxis de Salónica son
#     azules con el techo blanco), la acera de las terrazas y los bloques;
#   · al FONDO, casi en el eje, la TORRE BLANCA en su jardín.
#   · LA TORRE VA A 0,36 DE SU TAMAÑO (12,3 m en vez de 34). Jugando solo caben
#     unos trece metros de alto al fondo, a la distancia que sea (ver CLAUDE.md), y
#     la torre sin sus almenas y su torreón es un cilindro cualquiera. Va casi en
#     el eje porque arriba, en el centro, es donde el marcador deja un hueco: la
#     nave se posa delante y la torre asoma por encima. La base alien, por eso, va
#     a un lado, plantada en la bocacalle de la izquierda.
#   · Solo en el vuelo: la plaza de Aristóteles abierta al mar, la ciudad subiendo
#     a la Ciudad Alta con sus murallas, la Rotonda, la torre de la OTE, el
#     puerto, los Paraguas del paseo nuevo y el monte Jortiatis.

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (0.62, 0.72, 0.5)                  # la tarde: del oeste, sobre el mar (a la derecha y algo a la espalda)
iniciar('salonica', 2310, eje=(0.0, -60.0), encendidas=0.0, reflejo=(0.07, 0.11, 0.2))

MUELLE = 8.6                             # el canto: de ahí a la derecha, el mar
MAR_Y = -1.7
BORD = -8.8                              # donde acaba el paseo y empieza el bordillo
CALLE0, CALLE1 = -9.2, -16.4             # la calzada de Nikis
FX = -19.6                               # la línea de fachadas
TORRE = (-1.2, -86.0)
ESC = 0.36                               # la torre, a esta escala
BASE = (-12.8, -44.0)                    # la base alien, en la bocacalle
BOCA = (-55.0, -33.0)                    # esa bocacalle: de z a z. Por ella tuerce la avenida tierra adentro…
Z_FIN = BOCA[0]                          # …y de ahí en adelante, a la izquierda, ya es el jardín de la torre
Z_PUERTO = 430.0

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_mar ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((5, 2, 0.0), (9, 3, 1.3), (14, 5, 2.1)):
        onda += np.sin(2 * np.pi * (u * fx + v * fy) + f + 0.9 * np.sin(2 * np.pi * (u * 2 + v * 4)))
    b = np.clip(onda / 3, -1, 1)
    # Va sin luz (grupo `plano`): el color es el que se ve. El golfo Termaico, azul algo verdoso.
    a = np.stack([0.2 + 0.04 * b, 0.44 + 0.05 * b, 0.58 + 0.06 * b], axis=-1)
    a += (np.clip(b - 0.74, 0, 1) * 1.5)[..., None] * np.array((0.6, 0.55, 0.4))
    return guardar('mar-salonica', a, 88)

# --- la pista: el paseo de Nikis, entero en una textura ---------------------------------------
PX0, PX1, PZ0, PZ1 = BORD, MUELLE, -61.6, 12.4
PW, PH_ = 512, 2048
KX, KZ = PW / (PX1 - PX0), PH_ / (PZ1 - PZ0)             # píxeles por metro
def a_px (x, z):
    return int(round((x - PX0) * KX)), int(round((z - PZ0) * KZ))

def tex_pista ():
    """Losas claras a matajunta con cenefas de granito, el carril bici, el canto
    del muelle con sus argollas y lo que deja el uso: manchas, tapas de registro,
    juntas rotas y alguna quemadura de la guerra."""
    tejar = lambda t: np.tile(t, (PH_ // t.shape[0] + 1, PW // t.shape[1] + 1, 1))[:PH_, :PW].copy()
    clara = tejar(foto('concrete_floor_worn_001', 256, 0xcfc9bc, 0.5))
    otra = tejar(foto('pavement_02', 256, 0xc6bfb1, 0.45))
    m = np.clip((nube(PH_, PW, 30, 8) - 0.45) / 0.2, 0, 1)[..., None]
    a = clara * (1 - m) + otra * m
    # Losas de 1,2 × 0,6: la junta, y cada losa de su tono.
    lz, lx = 0.6 * KZ, 1.2 * KX
    fila, f = 0, 0.0
    while f < PH_:
        f0, f1 = int(f), int(min(PH_, f + lz))
        c = -(fila % 2) * lx / 2
        while c < PW:
            c0, c1 = int(max(0, c)), int(min(PW, c + lx))
            if c1 > c0:
                a[f0:f1, c0:c1] *= random.uniform(0.94, 1.05)
                a[f0:f1, c0:c0 + 1] *= 0.76
            c += lx
        a[f0:f0 + 1] *= 0.76
        fila += 1; f += lz
    a *= (0.95 + 0.1 * nube(PH_, PW, 16, 4))[..., None]
    # Las cenefas de granito, de lado a lado, cada 9,6 m.
    gran = tejar(foto('rock_tile_floor', 128, 0x8e8b87, 0.6))
    for z in np.arange(-57.6, 12.0, 9.6):
        (_, f0), (_, f1) = a_px(0, z - 0.25), a_px(0, z + 0.25)
        f0, f1 = max(0, f0), min(PH_, f1)
        a[f0:f1] = gran[f0:f1]
        a[f0:f0 + 1] *= 0.7; a[f1 - 1:f1] *= 0.7
    # El carril bici, pegado a la calzada: almagre con sus rayas.
    (c0, _), (c1, _) = a_px(-8.15, 0), a_px(-6.75, 0)
    rojo = np.array((0.67, 0.34, 0.26), np.float32)
    a[:, c0:c1] = a[:, c0:c1] * 0.3 + rojo * 0.7 * (0.88 + 0.24 * nube(PH_, c1 - c0, 70, 2))[..., None]
    for c in (c0, c1 - 2):
        a[:, c:c + 2] = (0.9, 0.9, 0.86)
    cm = (c0 + c1) // 2
    for f in range(0, PH_, int(3.0 * KZ)):
        a[f:f + int(1.2 * KZ), cm:cm + 1] = (0.88, 0.88, 0.84)
    def aro (c, f, r, color, grosor=1.0):
        y0, y1, x0, x1 = max(0, int(f - r - 3)), min(PH_, int(f + r + 4)), max(0, int(c - r - 3)), min(PW, int(c + r + 4))
        yy, xx = np.mgrid[y0:y1, x0:x1]
        a[y0:y1, x0:x1][np.abs(np.hypot(xx - c, yy - f) - r) < grosor] = color
    def linea (c0_, f0_, c1_, f1_, color):
        for t in np.linspace(0, 1, int(max(abs(c1_ - c0_), abs(f1_ - f0_))) * 2 + 2):
            ci, fi = int(round(c0_ + (c1_ - c0_) * t)), int(round(f0_ + (f1_ - f0_) * t))
            if 0 <= ci < PW and 0 <= fi < PH_:
                a[fi, ci] = color
    BL = (0.9, 0.9, 0.86)
    for z in np.arange(-52.0, 10.0, 14.0):                           # la bicicleta pintada
        c, f = a_px(-7.45, z)
        aro(c, f - 8, 5.5, BL); aro(c, f + 8, 5.5, BL)
        linea(c, f - 8, c + 1, f + 1, BL); linea(c + 1, f + 1, c, f + 8, BL); linea(c + 1, f + 1, c - 5, f - 1, BL); linea(c - 5, f - 1, c, f - 8, BL)
        linea(c - 4, f + 8, c + 4, f + 8, BL)
    # El canto del muelle: sillares de granito claro, y la canaleta por dentro.
    (c0, _) = a_px(7.75, 0)
    cop = tejar(foto('rock_tile_floor', 128, 0xa5a199, 0.5))
    a[:, c0:] = cop[:, c0:]
    a[:, c0:c0 + 2] *= 0.6
    for f in range(0, PH_, int(1.5 * KZ)):
        a[f:f + 1, c0:] *= 0.62
    (cd, _) = a_px(7.4, 0)
    a[:, cd:cd + 4] *= 0.5
    a[::4, cd:cd + 4] *= 1.6
    # Manchas de trabajo en una ventana pequeña: multiplicar por una mancha redonda y suave.
    def mancha (x, z, r, k, forma=1.0):
        c, f = a_px(x, z)
        rc, rf = int(r * KX * forma) + 2, int(r * KZ) + 2
        y0, y1, x0, x1 = max(0, f - rf), min(PH_, f + rf), max(0, c - rc), min(PW, c + rc)
        if y1 <= y0 or x1 <= x0:
            return
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot((xx - c) / (r * KX * forma), (yy - f) / (r * KZ))
        a[y0:y1, x0:x1] *= (1 - (1 - k) * np.clip(1 - d, 0, 1) ** 1.5)[..., None]
    # Lo mojado junto al canto, donde salpica.
    for z in np.arange(PZ0, PZ1, 2.2):
        mancha(7.6 + random.uniform(-0.5, 0.3), z + random.uniform(-1, 1), random.uniform(0.7, 1.5), random.uniform(0.82, 0.92), 0.8)
    for _ in range(26):                                              # aceite, óxido, lo que cae
        mancha(random.uniform(-6.3, 7.0), random.uniform(PZ0 + 1, PZ1 - 1), random.uniform(0.25, 0.9), random.uniform(0.72, 0.9), random.uniform(0.6, 1.6))
    # Las argollas de amarre del canto, con su chorrera de óxido.
    for z in np.arange(-56.0, 12.0, 9.5):
        c, f = a_px(8.2, z)
        aro(c, f, 4.5, (0.16, 0.13, 0.11), 1.3)
        mancha(8.2, z, 0.5, 0.78)
    # Tapas de registro de fundición.
    for x, z in ((5.4, -12.0), (-4.6, -30.5), (3.3, -49.0), (-1.8, 6.5)):
        c, f = a_px(x, z)
        yy, xx = np.mgrid[max(0, f - 14):min(PH_, f + 14), max(0, c - 14):min(PW, c + 14)]
        d = np.hypot((xx - c) / (0.3 * KX), (yy - f) / (0.3 * KZ))
        zona = a[max(0, f - 14):min(PH_, f + 14), max(0, c - 14):min(PW, c + 14)]
        zona[d < 1] = np.array((0.42, 0.41, 0.4), np.float32) * (0.88 + 0.24 * ((xx + yy) % 4 < 2))[d < 1][..., None]
        zona[np.abs(d - 1) < 0.16] = (0.26, 0.25, 0.25)
    # La guerra: tres quemaduras, con su ceniza y sus cascotes.
    for x, z, r in ((5.6, -23.0, 1.5), (-5.0, -40.5, 1.2), (3.6, -57.0, 1.7)):
        mancha(x, z, r * 1.5, 0.84, 1.1)
        mancha(x, z, r, 0.5, 1.0)
        mancha(x + 0.2, z - 0.1, r * 0.5, 0.6, 1.2)
        for _ in range(40):
            ang, d = random.uniform(0, 6.28), r * random.uniform(0.3, 1.7)
            c, f = a_px(x + d * math.cos(ang), z + d * math.sin(ang))
            if 1 < c < PW - 2 and 1 < f < PH_ - 2:
                a[f:f + 2, c:c + 2] = random.choice(((0.1, 0.1, 0.1), (0.62, 0.6, 0.56)))
    # Juntas rotas: grietas finas que van torciendo.
    for _ in range(46):
        c, f = random.uniform(0, PW), random.uniform(0, PH_)
        ang = random.uniform(0, 6.28)
        for _ in range(random.randint(20, 90)):
            ang += random.uniform(-0.4, 0.4)
            c += math.cos(ang); f += math.sin(ang)
            ci, fi = int(c), int(f)
            if 1 <= ci < PW - 1 and 1 <= fi < PH_ - 1:
                a[fi, ci] *= 0.62
    # Chicles y cagadas de gaviota.
    for _ in range(900):
        c, f = random.randrange(1, PW - 2), random.randrange(1, PH_ - 2)
        a[f:f + 2, c:c + 1] *= 0.7
    for _ in range(160):
        c, f = random.randrange(1, PW - 2), random.randrange(1, PH_ - 2)
        a[f:f + random.choice((1, 2)), c:c + random.choice((1, 2))] = (0.9, 0.9, 0.88)
    return guardar('pista', np.clip(a, 0, 1), 88)

def tex_losas ():
    """Las mismas losas en baldosa que repite (2,4 × 2,4 m), para el paseo fuera de la pista."""
    n = 256
    a = foto('concrete_floor_worn_001', n, 0xcfc9bc, 0.5) * 0.5 + foto('pavement_02', n, 0xc6bfb1, 0.45) * 0.5
    for i in range(4):
        f0 = i * 64
        desp = (i % 2) * 64
        for k in range(2):
            c0 = (desp + k * 128) % n
            ancho = min(128, n - c0)
            a[f0:f0 + 64, c0:c0 + ancho] *= random.uniform(0.95, 1.04)
            a[f0:f0 + 64, c0:c0 + 2] *= 0.76
        a[f0:f0 + 2] *= 0.76
    return guardar('losas', np.clip(a, 0, 1), 86)

def tex_torre ():
    """La piel de la Torre Blanca, que da la vuelta entera: mampostería clara con
    restos del enlucido que le dio el nombre, las ventanas subiendo en espiral
    (por dentro lleva una rampa), los mechinales y la puerta. u = 0,75 mira al
    campo."""
    W, Hh = 1024, 512
    piedra = np.tile(foto('old_stone_wall', 128, 0xcbc2ae, 0.55), (4, 8, 1))
    cal = np.tile(foto('plastered_stone_wall', 128, 0xdcd5c6, 0.3), (4, 8, 1))
    m = np.clip((nube(Hh, W, 7, 12) - 0.48) / 0.22, 0, 1)[..., None]
    a = piedra * (1 - m * 0.75) + cal * m * 0.75
    yy = np.linspace(0, 1, Hh, dtype=np.float32)[:, None, None]      # 0 arriba, 1 abajo
    a *= 1 - 0.2 * np.clip((yy - 0.78) / 0.22, 0, 1)                 # la humedad del pie
    a *= (0.93 + 0.12 * nube(2, W, 1, 90)[0])[None, :, None]         # chorreras
    fila = lambda h: int((1 - h) * Hh)                               # h: altura de 0 (pie) a 1 (arriba)
    for h in np.arange(0.12, 0.92, 0.115):                           # mechinales: hileras de agujeros de andamio
        f = fila(h)
        for c in range(random.randrange(0, 40), W, 46):
            a[f:f + 4, c:c + 4] *= 0.35
    def hueco (u, h0, h1, ancho, arco=False):
        c = int(u * W) % W
        f0, f1 = fila(h1), fila(h0)
        for dc in range(-ancho // 2 - 3, ancho // 2 + 4):
            cc = (c + dc) % W
            dentro = abs(dc) <= ancho // 2
            for f in range(f0 - 3, f1):
                if f < 0 or f >= Hh:
                    continue
                arriba = f - f0
                if arco and arriba < ancho // 2:                     # medio punto
                    fuera_arco = (dc / (ancho / 2)) ** 2 + ((ancho / 2 - arriba) / (ancho / 2)) ** 2 > 1
                    if fuera_arco:
                        continue
                if dentro and arriba >= 0:
                    a[f, cc] = np.array((0.1, 0.09, 0.08)) * (1 + 0.5 * (f1 - f) / max(1, f1 - f0))
                else:
                    a[f, cc] = np.clip(a[f, cc] * 1.14, 0, 1)        # el recerco de sillar
        a[f1:f1 + 3, [(c + dc) % W for dc in range(-ancho // 2 - 3, ancho // 2 + 4)]] *= 0.7
    for nivel, h in enumerate((0.28, 0.41, 0.54, 0.67, 0.8)):
        for k in range(5):
            hueco(0.75 + k / 5 + nivel * 0.07, h, h + 0.055, 14, arco=True)
    hueco(0.75, 0.0, 0.17, 38, arco=True)                            # la puerta
    f = fila(0.9)
    a[f:f + 5] = np.clip(a[f:f + 5] * 1.12, 0, 1); a[f + 5:f + 8] *= 0.66   # el cordón de arriba
    return guardar('torre', np.clip(a, 0, 1), 90)

def tex_matacan ():
    """El adarve volado: ménsulas con su arquillo entre cada dos, y encima el pretil."""
    a = foto('old_stone_wall', 128, 0xd3cab7, 0.5)[:64, :64].copy()
    yy, xx = np.mgrid[0:64, 0:64]
    arco = (((xx - 32) / 20.0) ** 2 + ((yy - 44) / 16.0) ** 2 < 1) & (yy <= 44) | ((np.abs(xx - 32) < 20) & (yy > 44))
    a[arco] *= 0.36
    a[30:, :6] *= 1.1; a[30:, 58:] *= 1.1
    a[24:28] *= 0.62; a[20:24] = np.clip(a[20:24] * 1.14, 0, 1)
    return guardar('matacan', np.clip(a, 0, 1), 88)

def tex_tiendas ():
    """Los bajos de Nikis: cuatro locales por baldosa (12 × 4 m), con su rótulo y su cristalera."""
    a = lienzo(128, 512, (0.78, 0.76, 0.72)) + ruido(128, 512, 0.04)[..., None]
    rotulos = [(0.12, 0.3, 0.5), (0.65, 0.12, 0.1), (0.1, 0.36, 0.26), (0.85, 0.6, 0.1), (0.2, 0.2, 0.22), (0.5, 0.2, 0.4)]
    for k in range(4):
        x0 = k * 128
        a[30:128, x0 + 8:x0 + 120] = np.array((0.09, 0.11, 0.13)) + np.linspace(0.14, 0.0, 98, dtype=np.float32)[:, None, None] * np.array((0.5, 0.7, 0.9))
        a[30:128, x0 + 62:x0 + 66] = (0.3, 0.3, 0.31)
        a[8:28, x0 + 6:x0 + 122] = random.choice(rotulos)
        for c in range(x0 + 16, x0 + 110, random.randint(9, 14)):       # las letras del rótulo, a bulto
            a[13:23, c:c + random.randint(4, 7)] = (0.93, 0.92, 0.88)
        a[118:128, x0:x0 + 128] *= 0.8
    return guardar('tiendas', np.clip(a, 0, 1), 86)

def tex_arcada ():
    """Los soportales de la plaza de Aristóteles: cuatro arcos por baldosa (12 × 6 m)."""
    a = lienzo(256, 512, (0.9, 0.84, 0.7)) + ruido(256, 512, 0.04)[..., None]
    yy, xx = np.mgrid[0:256, 0:512]
    for k in range(4):
        cx = k * 128 + 64
        arco = (((xx - cx) / 44.0) ** 2 + ((yy - 110) / 60.0) ** 2 < 1) & (yy <= 110) | ((np.abs(xx - cx) < 44) & (yy > 110))
        a[arco] = (np.linspace(0.34, 0.12, 256, dtype=np.float32)[:, None, None] * np.array((1.0, 0.9, 0.8)) * np.ones((1, 512, 1), np.float32))[arco]
        a[30:256, cx + 58:cx + 70] *= 0.93
    a[14:22] *= 0.7; a[:14] = np.clip(a[:14] * 1.06, 0, 1)
    return guardar('arcada', np.clip(a, 0, 1), 86)

def tex_bandera ():
    a = lienzo(180, 270, (0.93, 0.94, 0.96))
    azul = np.array((0.05, 0.28, 0.6), np.float32)
    for k in range(0, 9, 2):
        a[k * 20:(k + 1) * 20] = azul
    a[:100, :100] = azul
    a[40:60, :100] = (0.93, 0.94, 0.96); a[:100, 40:60] = (0.93, 0.94, 0.96)
    return guardar('bandera', a, 90)

PISTA = material('pista', tex_pista(), rug=0.9)
LOSAS = material('losas', tex_losas(), rug=0.9)
GRANITO = material('granito', de_polyhaven('rock_tile_floor', 512, 0x9a968f, 0.6), rug=0.85)
ADOQUIN = material('adoquin', de_polyhaven('cobblestone_floor_04', 512, 0xb0a99c, 0.6), rug=0.9)
TORRE_M = material('torre', tex_torre(), rug=0.95)
MATACAN = material('matacan', tex_matacan(), rug=0.95)
PIEDRA_T = material('piedra-torre', de_polyhaven('old_stone_wall', 512, 0xcfc6b2, 0.55), rug=0.95)
SILLAR = material('sillar', de_polyhaven('sandstone_blocks_08', 512, 0xb9b1a0, 0.6), rug=0.9)
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xb4ada2, 0.6), rug=0.9)
SOLAR = material('solar', de_polyhaven('pavement_02', 512, 0x9d978d, 0.6), rug=0.9)          # el suelo de la ciudad, entre manzanas
CESPED = material('cesped', de_polyhaven('leafy_grass', 512, 0x6f8a48, 0.6), rug=1.0)
LADERA = material('ladera', de_polyhaven('sparse_grass', 512, 0x8f8a66, 0.5), rug=1.0)
MAR = material('mar', tex_mar(), rug=0.1)
AZOTEA = material('azotea', tex_azotea((0.62, 0.6, 0.57)))
TEJA = material('teja', de_polyhaven('ceramic_roof_01', 512, 0xb0603c, contraste=0.9), rug=0.9)
LADRILLO = material('ladrillo', de_polyhaven('red_brick', 512, 0xb58264, 0.7), rug=0.95)
MURALLA = material('muralla', de_polyhaven('castle_wall_varriation', 512, 0xb5a488, 0.8), rug=0.95)
TIENDAS = material('tiendas', tex_tiendas())
ARCADA = material('arcada', tex_arcada())
BANDERA = material('bandera', tex_bandera(), rug=0.9)
# OJO: los colores lisos van en LINEAL (0,2 lineal ya es un gris medio).
HIERRO = material('hierro', color=(0.03, 0.035, 0.035), rug=0.5)
FUNDICION = material('fundicion', color=(0.045, 0.06, 0.05), rug=0.6)                        # el verde oscuro de farolas y bancos
BLANCO = material('blanco', color=(0.8, 0.8, 0.77), rug=0.6)
HORMIGON = material('hormigon', color=(0.42, 0.41, 0.38), rug=0.9)
MADERA = material('madera', color=(0.2, 0.12, 0.06), rug=0.9)
MADERA_CLARA = material('madera-clara', color=(0.42, 0.28, 0.14), rug=0.9)
NARANJA = material('naranja', color=(0.85, 0.2, 0.02), rug=0.6)
NEGRO = material('negro', color=(0.01, 0.01, 0.012))
VIDRIO = material('vidrio', color=(0.02, 0.03, 0.04), rug=0.2)
GOMA = material('goma', color=(0.012, 0.012, 0.014), rug=0.9)
CARBON = material('carbon', color=(0.012, 0.011, 0.01), rug=0.95)
OXIDO = material('oxido', color=(0.1, 0.04, 0.02), rug=0.95)
BRASA = material('brillo-brasa', color=(1.0, 0.42, 0.08), emite=3.0)
RESINA = material('resina', color=(0.02, 0.03, 0.022), rug=0.5)
VERDE = material('brillo-verde', color=(0.25, 1.0, 0.45), emite=2.2)
CHAPAS = [material(f'chapa-{i}', color=c, rug=0.35) for i, c in enumerate([(0.75, 0.75, 0.74), (0.02, 0.02, 0.022), (0.3, 0.32, 0.35), (0.35, 0.03, 0.03), (0.03, 0.07, 0.25), (0.6, 0.58, 0.5)])]
TAXI = material('taxi', color=(0.02, 0.1, 0.42), rug=0.35)
BUS = material('bus', color=(0.03, 0.16, 0.45), rug=0.4)
BUS_BLANCO = material('bus-blanco', color=(0.8, 0.8, 0.78), rug=0.4)
PILOTO = material('piloto', color=(0.5, 0.02, 0.02), rug=0.4)
FARO = material('faro', color=(0.85, 0.82, 0.7), rug=0.3)
TOLDOS = [material(f'toldo-{i}', color=c, rug=0.9) for i, c in enumerate([(0.82, 0.8, 0.74), (0.75, 0.25, 0.04), (0.03, 0.2, 0.1), (0.05, 0.13, 0.36), (0.3, 0.03, 0.04), (0.8, 0.62, 0.2)])]
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.07, 0.14, 0.04), (0.09, 0.17, 0.05), (0.12, 0.2, 0.06)])]
PINOS = [material(f'pino-{i}', color=c, rug=1.0) for i, c in enumerate([(0.04, 0.09, 0.035), (0.05, 0.1, 0.04)])]
CIPRES = material('cipres', color=(0.025, 0.05, 0.03), rug=1.0)
TRONCO = material('tronco', color=(0.1, 0.07, 0.05))
BARCAS = [material(f'barca-{i}', color=c, rug=0.6) for i, c in enumerate([(0.82, 0.82, 0.76), (0.03, 0.12, 0.4), (0.5, 0.05, 0.04), (0.02, 0.25, 0.22), (0.85, 0.62, 0.12)])]
CASCO_NEGRO = material('casco-negro', color=(0.02, 0.02, 0.022), rug=0.6)
CASCO_ROJO = material('casco-rojo', color=(0.3, 0.03, 0.025), rug=0.6)
OCRE = material('ocre', color=(0.7, 0.42, 0.06), rug=0.6)
VELA = material('vela', color=(0.75, 0.7, 0.58), rug=0.9)
CABO = material('cabo', color=(0.3, 0.26, 0.2), rug=0.9)
ACERO = material('acero', color=(0.6, 0.62, 0.65), rug=0.3)
BRONCE = material('bronce', color=(0.05, 0.08, 0.07), rug=0.5)
GRUA = material('grua', color=(0.75, 0.3, 0.02), rug=0.6)
MONTE_L = material('monte-lejos', color=(0.2, 0.27, 0.26), rug=1.0)                         # el Jortiatis, azulado por la calima
# Los bloques de Nikis: blancos, cremas y grises claros, todo balcones con toldo.
PISOS = [material(f'f-nikis-{i}', tex_crema(f'nikis-{i}', c, balcon=0.95)) for i, c in enumerate(
    [(0.93, 0.92, 0.88), (0.9, 0.86, 0.76), (0.86, 0.86, 0.84), (0.92, 0.88, 0.72), (0.84, 0.8, 0.74)])]
FACHADAS = PISOS + [material(f'f-salonica-{i}', tex_postigos(f'salonica-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.9, 0.86, 0.78), (0.4, 0.34, 0.28)), ((0.88, 0.8, 0.66), (0.3, 0.4, 0.36))])]
CASAS = [material(f'f-alta-{i}', tex_postigos(f'alta-{i}', b, p)) for i, (b, p) in enumerate(
    [((0.9, 0.82, 0.62), (0.34, 0.26, 0.2)), ((0.85, 0.66, 0.55), (0.3, 0.36, 0.4)), ((0.93, 0.9, 0.84), (0.25, 0.36, 0.5)), ((0.8, 0.74, 0.6), (0.4, 0.2, 0.16))])]
F_PLAZA = material('f-plaza', tex_crema('plaza', (0.92, 0.85, 0.68), balcon=0.3))
F_TEATRO = material('f-teatro', tex_crema('teatro', (0.93, 0.92, 0.9), balcon=0.0))
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.86, 0.9, 0.93)), (0.07, (0.76, 0.85, 0.95)), (0.25, (0.48, 0.7, 0.94)), (0.6, (0.26, 0.5, 0.88)), (1.0, (0.14, 0.36, 0.78))],
    (SOL[0], SOL[2]), 0.47, (0.3, 0.25, 0.15), ((1.0, 1.0, 1.0), (0.92, 0.94, 0.98)), cuanta_nube=0.16), emite=1.0)
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. EL PASEO, EL MUELLE Y EL MAR
# ==================================================================================
config_suelo(-1500, 1500, -1500, 1500, (-76, 62), (-200, 90))
rect('P', PISTA, PX0, PX1, PZ0, PZ1, 0.0, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
suelo('GN', LOSAS, BORD, MUELLE, PZ1, Z_PUERTO, 0.0, 2.4)                          # el paseo, a la espalda
suelo('GN', LOSAS, BORD, MUELLE, -74.0, PZ0, 0.0, 2.4)                             # y hasta el jardín de la torre

def orilla (z):
    """Por dónde va el canto del muelle: recto, con la panza donde está la torre."""
    if -104.0 < z < -68.0:
        return MUELLE + 9.5 * math.sin(math.pi * (-68.0 - z) / 36.0) ** 0.8
    return MUELLE
PANZA = [(orilla(z), z) for z in np.linspace(-68.0, -104.0, 21)]
# El muro del muelle, hasta debajo del agua.
for z0, z1, g in ((PZ1 + 22, -68.0, 'E'), (Z_PUERTO, PZ1 + 22, 'C'), (-104.0, -900.0, 'C')):
    cara(g, SILLAR, [P(MUELLE, z0, MAR_Y - 1.5), P(MUELLE, z1, MAR_Y - 1.5), P(MUELLE, z1, 0.0), P(MUELLE, z0, 0.0)], hacia=V((1, 0, 0)), baldosa=3.0)
franja('E', SILLAR, PANZA, 0.0, PANZA, MAR_Y - 1.5, V((1, 0, 0)), u_baldosa=3.0, v0=1.0, v1=0.0, cerrada=False)
rect('EP', MAR, MUELLE - 0.4, 3000.0, -3000.0, 3000.0, MAR_Y, baldosa=26.0)

# --- lo que hay en el canto: norays, farolas, salvavidas ---------------------------------------
def noray (x, z):
    torno('EV', HIERRO, en(x, z), [(0.2, 0.0), (0.15, 0.1), (0.14, 0.42), (0.24, 0.5), (0.22, 0.6), (0.0, 0.66)], lados=8, tapas=(False, False))

def farola_paseo (x, z, alto=5.2):
    """La farola de fundición del paseo: fuste con su basa, dos brazos y dos globos."""
    torno('EV', FUNDICION, en(x, z), [(0.2, 0.0), (0.16, 0.5), (0.08, 0.7), (0.065, alto)], lados=6, tapas=(False, False))
    for s in (-1, 1):
        barra('EV', FUNDICION, P(x, z, alto - 0.5), P(x, z + s * 0.7, alto - 0.15), 0.06)
        copa('EV', BLANCO, x, z + s * 0.7, alto + 0.08, 0.2, 0.24, sub=1, baila=0.0)
    copa('EV', FUNDICION, x, z, alto + 0.1, 0.1, 0.16, sub=1, baila=0.0)

def banco (x, z, mira=1):
    """Banco de listones: `mira` = 1 mirando al mar (+x), -1 a la ciudad."""
    for dz in (-0.75, 0.75):
        cubo('EV', FUNDICION, P(x, z + dz, 0.22), (0.5, 0.07, 0.44))
        cubo('EV', FUNDICION, P(x - mira * 0.24, z + dz, 0.62), (0.07, 0.07, 0.5))
    cubo('EV', MADERA_CLARA, P(x, z, 0.46), (0.48, 1.8, 0.06))
    cubo('EV', MADERA_CLARA, P(x - mira * 0.25, z, 0.76), (0.06, 1.8, 0.3))

for z in np.arange(8.0, -70.0, -9.5):
    noray(8.05, z + 2.4)
for z in np.arange(4.0, -70.0, -19.0):
    farola_paseo(7.72, z)
for z in (-8.5, -46.5):                                                            # los salvavidas
    barra('EV', FUNDICION, P(7.9, z, 0.0), P(7.9, z, 1.35), 0.07)
    cubo('EV', BLANCO, P(7.9, z, 1.1), (0.14, 0.62, 0.62))
    cubo('EV', NARANJA, P(7.93, z, 1.1), (0.12, 0.5, 0.5))
# Del lado de la calzada: el bordillo, los bancos mirando al mar, las papeleras y las farolas altas.
rect('P', GRANITO, CALLE0, BORD, PZ0, PZ1, 0.0, 1.6)
suelo('GN', GRANITO, CALLE0, BORD, PZ1, Z_PUERTO, 0.0, 1.6)
for z in np.arange(1.0, -60.0, -15.0):
    if abs(z - BASE[1]) < 8:
        continue
    banco(-8.25, z, 1)
    cubo('EV', FUNDICION, P(-8.3, z - 2.2, 0.42), (0.38, 0.38, 0.84))            # la papelera
for z in np.arange(9.0, Z_FIN, -22.0):
    if abs(z - BASE[1]) < 9:
        continue
    barra('EV', HORMIGON, P(CALLE0 + 0.15, z, 0.0), P(CALLE0 + 0.15, z, 8.2), 0.18)
    barra('EV', HORMIGON, P(CALLE0 + 0.15, z, 8.1), P(CALLE0 - 1.6, z, 8.4), 0.1)
    cubo('EV', BLANCO, P(CALLE0 - 1.7, z, 8.32), (0.7, 0.3, 0.14))

# --- las barcas amarradas y la goleta de los paseos ----------------------------------------------
def barca (grupo, x, z, giro, largo=4.6):
    """Una barca de pesca: casco de dos puntas, borda y bancada."""
    c, s = math.cos(giro), math.sin(giro)
    g = lambda dx, dz, y: P(x + dx * c - dz * s, z + dx * s + dz * c, y)
    m = random.choice(BARCAS)
    a_, b = largo / 2, largo * 0.19
    borde = [(-a_, 0), (-a_ * 0.6, b), (a_ * 0.5, b), (a_, 0), (a_ * 0.5, -b), (-a_ * 0.6, -b)]
    centro = g(0, 0, MAR_Y)
    for i in range(6):
        (x0, z0), (x1, z1) = borde[i], borde[(i + 1) % 6]
        q = [g(x0 * 0.82, z0 * 0.7, MAR_Y - 0.1), g(x1 * 0.82, z1 * 0.7, MAR_Y - 0.1), g(x1, z1, MAR_Y + 0.55), g(x0, z0, MAR_Y + 0.55)]
        cara(grupo, m, q, hacia=H._girado((q[0] + q[2]) / 2 - centro))
    cara(grupo, MADERA_CLARA, [g(px * 0.92, pz * 0.86, MAR_Y + 0.3) for px, pz in borde], hacia=ARRIBA)
    cara(grupo, m, [g(-0.15, -b * 0.9, MAR_Y + 0.5), g(0.25, -b * 0.9, MAR_Y + 0.5), g(0.25, b * 0.9, MAR_Y + 0.5), g(-0.15, b * 0.9, MAR_Y + 0.5)], hacia=ARRIBA)
    return g
for z in (-17.0, -29.0, -40.5):
    g = barca('EV', 10.1 + random.uniform(0, 0.4), z, math.pi / 2 + random.uniform(-0.08, 0.08))
    barra('EV', CABO, g(1.6, 0.4, MAR_Y + 0.5), P(8.2, z - 1.2, 0.3), 0.04)

def goleta (grupo, x, z_popa, largo=16.0, manga=4.6):
    """El barco de madera de los paseos por el golfo, amarrado de costado: casco
    negro con su franja ocre, dos palos con las velas aferradas y el bauprés."""
    g = lambda f, s, y: P(x + s, z_popa - f * largo, y)              # f: de popa (0) a proa (1); s: hacia +x
    semi = lambda f: manga / 2 * (0.72 + 0.28 * min(1.0, f / 0.18)) * (1 - max(0.0, (f - 0.6) / 0.4) ** 2.2)
    borda = lambda f: MAR_Y + 1.5 + 1.7 * (f - 0.45) ** 2
    est = [0.0, 0.08, 0.2, 0.36, 0.52, 0.66, 0.78, 0.88, 0.95, 1.0]
    capas = [(CASCO_ROJO, 0.3, lambda f: MAR_Y - 0.45, 0.93, lambda f: MAR_Y + 0.18),
             (CASCO_NEGRO, 0.93, lambda f: MAR_Y + 0.18, 1.0, lambda f: borda(f) - 0.5),
             (OCRE, 1.0, lambda f: borda(f) - 0.5, 1.0, lambda f: borda(f) - 0.32),
             (CASCO_NEGRO, 1.0, lambda f: borda(f) - 0.32, 1.02, lambda f: borda(f) + 0.4)]
    for a_, b in zip(est, est[1:]):
        for s in (-1, 1):
            for mat, k0, y0, k1, y1 in capas:
                cara(grupo, mat, [g(a_, s * semi(a_) * k0, y0(a_)), g(b, s * semi(b) * k0, y0(b)), g(b, s * semi(b) * k1, y1(b)), g(a_, s * semi(a_) * k1, y1(a_))], hacia=V((s, 0, 0)))
        cara(grupo, MADERA_CLARA, [g(a_, -semi(a_), borda(a_)), g(b, -semi(b), borda(b)), g(b, semi(b), borda(b)), g(a_, semi(a_), borda(a_))], hacia=ARRIBA)
    cara(grupo, CASCO_NEGRO, [g(0, -semi(0) * 0.3, MAR_Y - 0.45), g(0, -semi(0), MAR_Y + 0.18), g(0, -semi(0), borda(0) + 0.4), g(0, semi(0), borda(0) + 0.4), g(0, semi(0), MAR_Y + 0.18), g(0, semi(0) * 0.3, MAR_Y - 0.45)],
         hacia=V((0, -1, 0)))                                        # el espejo de popa
    yd = borda(0.2)
    caja(grupo, MADERA, x - manga * 0.3, x + manga * 0.3, z_popa - 0.3 * largo, z_popa - 0.07 * largo, yd, yd + 1.25, techo=MADERA_CLARA, baldosa=4)   # la caseta
    for f, alto in ((0.4, 11.5), (0.7, 9.6)):                         # los dos palos, con sus vergas y la vela aferrada
        pie, tope = g(f, 0, borda(f)), g(f, 0, borda(f) + alto)
        barra(grupo, MADERA, pie, tope, 0.24)
        for k, medio in ((0.5, 3.4), (0.82, 2.4)):
            y = borda(f) + alto * k
            barra(grupo, MADERA, g(f, -medio, y), g(f, medio, y), 0.13)
            barra(grupo, VELA, g(f, -medio * 0.92, y - 0.24), g(f, medio * 0.92, y - 0.24), 0.34)
        barra(grupo, CABO, tope, g(max(0.0, f - 0.36), 0, borda(f) + 0.4), 0.04)
        barra(grupo, CABO, tope, g(min(1.0, f + 0.3), 0, borda(1.0) + 0.5), 0.04)
        for s in (-1, 1):
            barra(grupo, CABO, g(f, 0, borda(f) + alto * 0.8), g(f - 0.03, s * semi(f), borda(f) + 0.4), 0.035)
    barra(grupo, MADERA, g(0.95, 0, borda(1.0) + 0.3), g(1.27, 0, borda(1.0) + 1.5), 0.18)    # el bauprés
    barra(grupo, CABO, g(0.7, 0, borda(0.7) + 9.6), g(1.27, 0, borda(1.0) + 1.5), 0.04)
    barra(grupo, MADERA, g(0.0, 0, borda(0) + 0.4), g(-0.03, 0, borda(0) + 2.6), 0.07)         # el asta de popa
    for dz, d in ((0.0, 1), (0.02, -1)):
        cara(grupo, BANDERA, [g(-0.03, 0.05 + dz, borda(0) + 1.7), g(-0.03, 1.35 + dz, borda(0) + 1.75), g(-0.03, 1.35 + dz, borda(0) + 2.6), g(-0.03, 0.05 + dz, borda(0) + 2.6)],
             uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))
    for f in (0.15, 0.85):                                             # las amarras
        barra(grupo, CABO, g(f, -semi(f), borda(f) + 0.3), P(8.1, z_popa - f * largo + (1.5 if f < 0.5 else -1.5), 0.45), 0.05)
goleta('EV', 11.5, -49.5)

# ==================================================================================
# 3. LA CALZADA DE NIKIS, LAS TERRAZAS Y LOS BLOQUES
# ==================================================================================
suelo('GN', CALZADA, CALLE1, CALLE0, Z_FIN, Z_PUERTO, 0.0, carriles=(CALLE1, 3.6, 'z'))
suelo('GN', ACERA, FX, CALLE1, BOCA[1], Z_PUERTO, 0.0, 3.0)
suelo('GN', CALZADA, FX, CALLE1, BOCA[0], BOCA[1], 0.0, carriles=(BOCA[0], 4.5, 'x'))    # la boca de la calle
suelo('GN', CALZADA, -330.0, FX, BOCA[0] + 3.0, BOCA[1] - 3.0, 0.06, carriles=(BOCA[0] + 3.0, 4.0, 'x'))   # sobre el suelo de la ciudad
# El bordillo de la acera de los cafés.
viga('E', GRANITO, CALLE1 - 0.3, CALLE1, BOCA[1], 60.0, 0.0, 0.14, u_m=1.6)
# La base alien cayó en el cruce: un disco de resina negra con su borde encendido.
disco_base = [(BASE[0] + 5.3 * math.cos(2 * math.pi * i / 28), BASE[1] + 5.3 * math.sin(2 * math.pi * i / 28)) for i in range(28)]
cara('P', RESINA, [P(x, z, 0.06) for x, z in disco_base], hacia=ARRIBA, baldosa=2.0)
for i in range(28):
    (ax, az), (bx, bz) = disco_base[i], disco_base[(i + 1) % 28]
    k = 0.955
    cara('EP', VERDE, [P(ax, az, 0.07), P(bx, bz, 0.07), P(BASE[0] + (bx - BASE[0]) * k, BASE[1] + (bz - BASE[1]) * k, 0.07), P(BASE[0] + (ax - BASE[0]) * k, BASE[1] + (az - BASE[1]) * k, 0.07)], hacia=ARRIBA)
for i in range(7):                                                               # las raíces que va echando por el asfalto
    a_ = 2 * math.pi * i / 7 + 0.3
    d = random.uniform(6.6, 8.6)
    x1, z1 = BASE[0] + d * math.cos(a_), BASE[1] + d * math.sin(a_)
    if x1 < BORD - 0.3:
        barra('EV', RESINA, P(BASE[0] + 5.0 * math.cos(a_), BASE[1] + 5.0 * math.sin(a_), 0.1), P(x1, z1, 0.03), 0.34)

def coche (x, z, chapa=None, techo=None, grupo='EV'):
    """Un utilitario a lo largo de z: carrocería, lunas, techo, ruedas, faros y pilotos."""
    chapa = chapa or random.choice(CHAPAS)
    largo, ancho = random.uniform(3.8, 4.4), 1.75
    z0, z1 = z - largo / 2, z + largo / 2
    caja(grupo, chapa, x - ancho / 2, x + ancho / 2, z0, z1, 0.3, 0.85, baldosa=4)
    caja(grupo, VIDRIO, x - ancho / 2 + 0.08, x + ancho / 2 - 0.08, z0 + largo * 0.3, z1 - largo * 0.22, 0.85, 1.3, baldosa=4)
    caja(grupo, techo or chapa, x - ancho / 2 + 0.1, x + ancho / 2 - 0.1, z0 + largo * 0.33, z1 - largo * 0.25, 1.3, 1.38, baldosa=4)
    for zr in (z0 + 0.75, z1 - 0.75):
        for s in (-1, 1):
            cubo(grupo, GOMA, P(x + s * (ancho / 2 - 0.08), zr, 0.32), (0.26, 0.64, 0.64))
    for s in (-1, 1):
        cubo(grupo, FARO, P(x + s * 0.6, z0 + 0.02, 0.68), (0.32, 0.06, 0.12))
        cubo(grupo, PILOTO, P(x + s * 0.65, z1 - 0.02, 0.7), (0.26, 0.06, 0.14))
    if techo is not None:                                                         # el taxi lleva su piloto en el techo
        cubo(grupo, OCRE, P(x, z, 1.46), (0.5, 0.2, 0.14))

def autobus (x, z):
    caja('EV', BUS, x - 1.25, x + 1.25, z - 12.0, z, 0.35, 1.5, baldosa=4)
    caja('EV', BUS_BLANCO, x - 1.25, x + 1.25, z - 12.0, z, 1.5, 3.2, baldosa=4)
    caja('EV', VIDRIO, x - 1.27, x + 1.27, z - 11.6, z - 0.4, 1.7, 2.7, baldosa=4)
    for zr in (z - 2.2, z - 9.4):
        for s in (-1, 1):
            cubo('EV', GOMA, P(x + s * 1.12, zr, 0.45), (0.3, 0.95, 0.95))

def coche_quemado (x, z):
    """La guerra: lo que queda de un coche, en la llanta y con rescoldos dentro."""
    caja('EV', CARBON, x - 0.88, x + 0.88, z - 2.0, z + 2.0, 0.16, 0.72, baldosa=4)
    for zz in (z - 0.9, z + 1.1):
        for s in (-1, 1):
            barra('EV', OXIDO, P(x + s * 0.8, zz, 0.72), P(x + s * 0.72, zz + 0.1, 1.2), 0.08)
    caja('EV', OXIDO, x - 0.74, x + 0.74, z - 0.95, z + 1.2, 1.2, 1.26, baldosa=4)
    cubo('EP', BRASA, P(x, z + 0.1, 0.76), (1.3, 1.6, 0.05))
    for zr in (z - 1.25, z + 1.25):
        for s in (-1, 1):
            cubo('EV', CARBON, P(x + s * 0.8, zr, 0.2), (0.24, 0.5, 0.4))

# Tramos de calzada que se quedan libres: la base alien y el coche quemado.
LIBRE_CALLE = [(BOCA[0] - 2.0, BOCA[1] + 2.0), (-33.0, -23.0)]
ocupada = lambda a_, b: any(c < b and a_ < d for c, d in LIBRE_CALLE)
cerca, lejos_ = CALLE0 - 1.85, CALLE1 + 1.75
z = 26.0
while z > Z_FIN + 3:                                                              # la fila de aparcados, junto a la acera
    if not ocupada(z - 5.0, z) and random.random() < 0.82:
        taxi = random.random() < 0.2
        coche(lejos_ + 0.15, z - 2.4, TAXI if taxi else None, BLANCO if taxi else None)
    z -= 5.2
z = 20.0
while z > Z_FIN + 6:                                                              # y los que se quedaron parados en el carril
    if ocupada(z - 13.0, z):
        z -= 3.0
        continue
    if random.random() < 0.22:
        autobus(cerca, z)
        z -= 12.0 + random.uniform(5, 10)
    else:
        coche(cerca + random.uniform(-0.2, 0.2), z - 2.2)
        z -= 4.4 + random.uniform(4, 15)
coche_quemado(cerca + 0.3, -28.0)
for capa, r in ((0.5, 3.0), (0.62, 2.1), (0.74, 1.2)):                            # su quemadura en el asfalto
    cara('EP', material(f'hollin-{r}', color=(0.012, 0.011, 0.01), alfa=1 - capa), [P(cerca + 0.3 + r * math.cos(a_), -28.0 + r * 1.3 * math.sin(a_), 0.03 + r * 0.004) for a_ in np.linspace(0, 2 * math.pi, 14, endpoint=False)], hacia=ARRIBA)

# --- las terrazas de los cafés ----------------------------------------------------------------
def mesa (x, z):
    cubo('EV', HIERRO, P(x, z, 0.74), (0.7, 0.7, 0.04))
    barra('EV', HIERRO, P(x, z, 0), P(x, z, 0.74), 0.06)
    for s in (-1, 1):
        cubo('EV', MADERA_CLARA, P(x, z + s * 0.62, 0.45), (0.42, 0.42, 0.05))
        cubo('EV', MADERA_CLARA, P(x, z + s * 0.84, 0.72), (0.42, 0.05, 0.5))

def sombrilla (x, z, mat):
    centro = P(x, z, 2.5)
    barra('EV', HIERRO, P(x, z, 0), centro, 0.07)
    for i in range(4):                                                             # cuadrada, como las de las terrazas de Nikis
        a0, a1 = math.pi / 4 + math.pi / 2 * i, math.pi / 4 + math.pi / 2 * (i + 1)
        cara('EV', mat, [centro, centro + V((1.9 * math.cos(a0), 1.9 * math.sin(a0), -0.45)), centro + V((1.9 * math.cos(a1), 1.9 * math.sin(a1), -0.45))], hacia=ARRIBA)

z = 24.0
while z > Z_FIN + 2:
    if BOCA[0] - 1 < z < BOCA[1] + 1:
        z -= 3.0
        continue
    lona = random.choice(TOLDOS)
    for k in range(random.randint(2, 4)):
        zz = z - k * 2.9
        if zz < Z_FIN + 2 or BOCA[0] - 1 < zz < BOCA[1] + 1:
            break
        mesa(-18.0, zz)
        sombrilla(-18.0, zz, lona)
    z -= random.uniform(12.0, 15.0)
for z in np.arange(18.0, Z_FIN, -14.0):                                           # los árboles de la acera
    if BOCA[0] - 3 < z < BOCA[1] + 3:
        continue
    platano('EV', TRONCO, HOJAS, CALLE1 - 0.9, z, random.uniform(0.95, 1.2))

# --- los bloques de pisos de Nikis --------------------------------------------------------------
def edificio (grupo, x0, x1, z0, z1, plantas, fach, toldo=True, tiendas=TIENDAS):
    """Un bloque: los bajos comerciales, los pisos con sus balcones, la cornisa y el ático remetido."""
    alto = 4.0 + plantas * 3.0
    viga(grupo, tiendas, x0, x1, z0, z1, 0.0, 4.0, u_m=12.0, tapas=False)
    caja(grupo, fach, x0, x1, z0, z1, 4.0, alto, techo=AZOTEA)
    viga(grupo, HORMIGON if grupo != 'T' else BLANCO, x0 - 0.35, x1 + 0.35, z0 - 0.35, z1 + 0.35, alto, alto + 0.5, u_m=3.0, techo=AZOTEA)
    if (x1 - x0) > 12 and (z1 - z0) > 12:
        caja(grupo, fach, x0 + 3, x1 - 3, z0 + 3, z1 - 3, alto + 0.5, alto + 3.5, techo=AZOTEA)
    if toldo:                                                                      # el toldo corrido de los bajos, hacia el mar
        m = random.choice(TOLDOS)
        cara('EV' if grupo == 'E' else 'T', m, [P(x1, z0 + 0.6, 3.5), P(x1, z1 - 0.6, 3.5), P(x1 + 2.3, z1 - 0.6, 2.75), P(x1 + 2.3, z0 + 0.6, 2.75)], hacia=ARRIBA)

# Acaban en la bocacalle: de ahí a la torre, jardín. Con la torre a 0,36 de su
# tamaño, un bloque de pisos a veinte metros de ella la dejaba en maqueta.
z = 62.0
n_ed = 0
while z > BOCA[1] + 1:
    z0 = z - random.choice([24.0, 27.0, 30.0, 36.0])
    if z0 < BOCA[1] + 10:
        z0 = BOCA[1]
    edificio('E', FX - 18.0, FX, z0, z, random.choice([6, 7, 7]), random.choice(PISOS))
    n_ed += 1
    z = z0 - 0.4

comprobar_paso(('E', 'EP', 'P', 'EV'), z_lejos=-61.0)

# ==================================================================================
# 4. LA TORRE BLANCA Y SU JARDÍN
# ==================================================================================
TX, TZ = TORRE
R0, R1 = 11.4 * ESC, 11.0 * ESC                                                  # el cuerpo: algo más ancho abajo
H_C = 26.5 * ESC                                                                  # hasta el adarve
torno('P', PIEDRA_T, en(TX, TZ), [(R0 + 0.55, 0.0), (R0 + 0.55, 0.22), (R0 + 0.2, 0.3)], lados=24, u_rep=10, v_m=2.4, tapas=(False, False))    # el zócalo
torno('P', TORRE_M, en(TX, TZ, 0.0), [(R0 * 1.03, 0.0), (R0, H_C * 0.12), (R1, H_C - 0.9)], lados=28, u_rep=1.0, v_m=H_C, tapas=(False, False))
torno('P', MATACAN, en(TX, TZ, H_C - 0.9), [(R1, 0.0), (R1 + 0.4, 0.45), (R1 + 0.4, 1.3)], lados=28, u_rep=28, v_m=1.3, tapas=(False, False))   # el adarve volado y su pretil
cara('P', PIEDRA_T, [P(TX + (R1 + 0.4) * math.cos(2 * math.pi * i / 28), TZ + (R1 + 0.4) * math.sin(2 * math.pi * i / 28), H_C + 0.4) for i in range(28)], hacia=ARRIBA, baldosa=2.0)
def almenas (r, y, n, tam):
    for i in range(n):
        a_ = 2 * math.pi * (i + 0.5) / n
        bloque('EV', PIEDRA_T, en(TX + r * math.cos(a_), TZ + r * math.sin(a_), y, -a_ + math.pi / 2), tam, baldosa=1.2, mella=0.02)
almenas(R1 + 0.25, H_C + 0.4, 22, (0.62, 0.3, 0.42))
RT = 6.0 * ESC                                                                    # el torreón de arriba
H_T = 6.4 * ESC
torno('P', PIEDRA_T, en(TX, TZ, H_C + 0.4), [(RT, 0.0), (RT * 0.98, H_T - 0.35), (RT + 0.2, H_T - 0.15), (RT + 0.2, H_T + 0.22)], lados=18, u_rep=7, v_m=2.2, tapas=(False, True))
almenas(RT + 0.08, H_C + 0.4 + H_T + 0.22, 12, (0.44, 0.24, 0.32))
for k in range(5):                                                                # las ventanas del torreón
    a_ = 2 * math.pi * k / 5 + math.pi * 1.5
    c, s = math.cos(a_), math.sin(a_)
    px, pz = TX + (RT + 0.01) * c, TZ - (RT + 0.01) * s
    cara('EP', NEGRO, [P(px + 0.16 * s, pz + 0.16 * c, H_C + 1.1), P(px - 0.16 * s, pz - 0.16 * c, H_C + 1.1), P(px - 0.16 * s, pz - 0.16 * c, H_C + 1.7), P(px + 0.16 * s, pz + 0.16 * c, H_C + 1.7)],
         hacia=V((c, s, 0)))
Y_TOPE = H_C + 0.4 + H_T + 0.22
barra('EV', BLANCO, P(TX, TZ, Y_TOPE), P(TX, TZ, Y_TOPE + 3.4), 0.09)                # el asta y la bandera
for dz, d in ((0.0, 1), (0.02, -1)):
    cara('EV', BANDERA, [P(TX + 0.06, TZ + dz, Y_TOPE + 2.1), P(TX + 1.9, TZ + dz + 0.2, Y_TOPE + 2.05), P(TX + 1.9, TZ + dz + 0.2, Y_TOPE + 3.3), P(TX + 0.06, TZ + dz, Y_TOPE + 3.35)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], hacia=V((0, -d, 0)))
print('TORRE', round(Y_TOPE, 2), 'm de alto')

# --- el jardín: la plazuela de adoquín, el césped, los caminos y la arboleda ---------------------
suelo('GN', CESPED, -70.0, MUELLE, -140.0, -74.0, 0.0, 6.0)
cara('GN', LOSAS, [P(x, z, 0.0) for x, z in PANZA], hacia=ARRIBA, baldosa=2.4)                 # la panza del muelle, a la derecha de la torre
suelo('GN', CESPED, -70.0, CALLE0, -74.0, Z_FIN, 0.0, 6.0)                              # el jardín llega hasta la bocacalle
suelo('GN', LOSAS, CALLE0, BORD, -74.0, PZ0, 0.0, 2.4)
plazuela = [(TX + 12.5 * math.cos(2 * math.pi * i / 32), TZ + 12.5 * math.sin(2 * math.pi * i / 32)) for i in range(32)]
cara('GN', ADOQUIN, [P(x, z, 0.06) for x, z in plazuela], hacia=ARRIBA, baldosa=3.0)
# Los caminos van con un material PROPIO, creado ahora: en el mapa de luz del suelo
# gana la última capa, pero el orden es el de los MATERIALES, no el de las
# llamadas. Con el material de las losas del paseo (creado antes que el césped),
# el césped de debajo se horneaba después y el camino salía negro.
CAMINO = material('camino', imagen_de(LOSAS), rug=0.9)
rect('GN', CAMINO, -3.0, MUELLE, -140.0, -98.0, 0.06, 2.4)                             # el paseo sigue junto al mar
rect('GN', CAMINO, -40.0, TX - 12.0, TZ - 2.2, TZ + 2.2, 0.06, 2.4)                    # y un camino hacia la ciudad
for i in range(10):                                                                # bancos alrededor de la plazuela
    a_ = 2 * math.pi * i / 10 + 0.31
    x, z = TX + 11.3 * math.cos(a_), TZ + 11.3 * math.sin(a_)
    if abs(x) < 8.2 and z > TZ:                                                     # ninguno en el camino de los alienz
        continue
    cubo('EV', MADERA_CLARA, P(x, z, 0.46), (0.5, 1.8, 0.07), giro=math.pi - a_)
    cubo('EV', FUNDICION, P(x, z, 0.22), (0.44, 1.5, 0.44), giro=math.pi - a_)
for i in range(6):                                                                 # y cuatro farolas
    a_ = 2 * math.pi * i / 6 + 0.9
    x, z = TX + 12.0 * math.cos(a_), TZ + 12.0 * math.sin(a_)
    if abs(x) < 8.4 and z > TZ:
        continue
    farola_paseo(x, z, 4.4)

def en_jardin (x, z):
    """Dónde cabe un árbol: fuera de la plazuela, de los caminos y de lo que se pisa."""
    # Del lado del mar, ninguno: desde el agua (el primer plano del vuelo) tapaban la torre.
    if math.hypot(x - TX, z - TZ) < 15.0 or (x > 3.0 and z > -99.0) or x > MUELLE - 2.0:
        return False
    if -5.0 < x < MUELLE and z < -96.0:                                             # el paseo de la orilla
        return False
    if abs(z - TZ) < 4.0 and x < TX:                                                # el camino
        return False
    return x > -68.0 and z < (Z_FIN - 3.0 if x < CALLE0 - 2.0 else -76.5)
arboles = 0
while arboles < 140:
    x, z = random.uniform(-68.0, 18.0), random.uniform(-139.0, Z_FIN - 3.0)
    if not en_jardin(x, z):
        continue
    # Detrás de la torre, pinos: el fondo oscuro contra el que se recorta.
    if abs(x - TX) < 22 and z < TZ - 10 and random.random() < 0.7:
        pino('EV', TRONCO, PINOS, x, z, random.uniform(1.1, 1.45))
    elif random.random() < 0.25:
        cipres('EV', CIPRES, x, z, random.uniform(0.75, 0.95))
    else:
        platano('EV', TRONCO, HOJAS, x, z, random.uniform(0.95, 1.3))
    arboles += 1

# ==================================================================================
# 5. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
# --- el paseo nuevo, al otro lado de la torre: los jardines, Alejandro y los Paraguas ------------
suelo('G', LOSAS, -3.0, MUELLE, -1500.0, -140.0, 0.0, 2.4)
suelo('G', CESPED, -70.0, -3.0, -1500.0, -140.0, 0.0, 6.0)
for _ in range(170):
    x, z = random.uniform(-66.0, -6.0), random.uniform(-700.0, -142.0)
    if -62.0 < x < -20.0 and -196.0 < z < -148.0:                                   # el teatro
        continue
    if random.random() < 0.6:
        platano('T', TRONCO, HOJAS, x, z, random.uniform(1.0, 1.4))
    else:
        pino('T', TRONCO, PINOS, x, z, random.uniform(1.0, 1.4))
# El Teatro Real: el bloque blanco con su pórtico de pilares, mirando al mar.
caja('C', F_TEATRO, -60.0, -24.0, -194.0, -150.0, 0.0, 17.0, techo=AZOTEA)
for z in np.linspace(-190.0, -154.0, 10):
    barra('T', BLANCO, P(-21.5, z, 0.0), P(-21.5, z, 13.0), 0.9)
caja('C', F_TEATRO, -25.0, -20.5, -194.0, -150.0, 13.0, 15.0, techo=AZOTEA, baldosa=6)
# Alejandro Magno a caballo, en su pedestal, con las sarisas y los escudos detrás.
AX, AZ = -8.0, -228.0
caja('C', HORMIGON, AX - 3.0, AX + 3.0, AZ - 4.5, AZ + 4.5, 0.0, 4.2, baldosa=3)
cubo('T', BRONCE, P(AX, AZ, 6.0), (1.5, 4.6, 1.9))                                 # el caballo
for dz in (-1.7, 1.6):
    for s in (-1, 1):
        barra('T', BRONCE, P(AX + s * 0.5, AZ + dz, 4.2), P(AX + s * 0.5, AZ + dz * 1.15, 5.4), 0.34)
barra('T', BRONCE, P(AX, AZ - 2.0, 6.6), P(AX, AZ - 3.3, 8.3), 0.9)                 # el cuello y la cabeza
cubo('T', BRONCE, P(AX, AZ + 0.2, 7.9), (1.1, 1.0, 2.2))                           # el jinete
for k in range(8):
    z = AZ + 14.0 + k * 2.6
    barra('T', BRONCE, P(AX - 2.0, z, 0.0), P(AX + 0.6, z - 0.8, 11.0), 0.14)
    torno('T', BRONCE, en(AX + 2.4, z, 1.0, 0.0, (0.0, math.pi / 2)), [(0.95, -0.06), (0.95, 0.06)], lados=10)
# Los Paraguas de Zongolópulos: un bosque de varillas con sus paraguas de acero, sobre el agua.
PX_, PZ_ = 5.0, -330.0
for k in range(22):
    x, z = PX_ + random.uniform(-4.5, 4.5), PZ_ + random.uniform(-9, 9)
    alto = random.uniform(7.0, 13.0)
    cima = P(x + random.uniform(-0.8, 0.8), z + random.uniform(-0.8, 0.8), alto)
    barra('T', ACERO, P(x, z, 0.0), cima, 0.1)
    torno('T', ACERO, M.Translation(cima) @ mathutils.Euler((random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), 0)).to_matrix().to_4x4(),
          [(1.7, -0.5), (1.1, -0.1), (0.0, 0.2)], lados=8, tapas=(False, False))

# --- el frente de Nikis hasta el puerto, con la plaza de Aristóteles abierta al mar -------------
ARIS = (166.0, 226.0)                                                               # la plaza: de z a z
z = 62.4
while z < Z_PUERTO - 30:
    largo = random.choice([24.0, 27.0, 30.0, 36.0])
    z1 = z + largo
    if z < ARIS[1] + 22.0 and z1 > ARIS[0] - 22.0:                                  # la plaza y sus dos edificios
        z = ARIS[1] + 22.4
        continue
    edificio('T', FX - 18.0, FX, z, z1, random.choice([6, 7, 7, 8]), random.choice(PISOS))
    n_ed += 1
    z = z1 + 0.4
# La plaza: losa clara hasta la ciudad, y a cada lado los edificios de soportales,
# con la esquina curva hacia el mar (el Electra Palace y el Olympion).
suelo('G', LOSAS, -330.0, FX, ARIS[0], ARIS[1], 0.0, 2.4)
for lado, z_cara in ((-1, ARIS[0]), (1, ARIS[1])):
    zf = z_cara + lado * 22.0                                                       # el fondo del edificio
    for x0 in np.arange(-330.0, -50.0, 35.0):
        x1 = x0 + 34.0
        viga('C', ARCADA, x0, x1, min(z_cara, zf), max(z_cara, zf), 0.0, 6.0, u_m=12.0, tapas=False)
        caja('C', F_PLAZA, x0, x1, min(z_cara, zf), max(z_cara, zf), 6.0, 24.0, techo=TEJA)
    # la rotonda de la esquina, mirando al mar
    cx, cz = FX - 16.0, z_cara + lado * 11.0
    curva = [(cx + 16.0 * math.cos(a_), cz + 11.0 * math.sin(a_)) for a_ in np.linspace(-math.pi / 2, math.pi / 2, 11)]
    planta = curva + [(cx - 14.0, cz + 11.0), (cx - 14.0, cz - 11.0)]
    prisma('C', ARCADA, planta, 0.0, 6.0, baldosa=12.0)
    prisma('C', F_PLAZA, planta, 6.0, 27.0, techo=TEJA)
for x in np.arange(-330.0, FX - 30.0, 26.0):                                        # los parterres del centro
    rect('G', CESPED, x, x + 14.0, ARIS[0] + 22.0, ARIS[1] - 22.0, 0.06, 6.0)
    platano('T', TRONCO, HOJAS, x + 7.0, (ARIS[0] + ARIS[1]) / 2, 1.2)

# --- el puerto, al noroeste: el muelle, los tinglados, las grúas y un transbordador ---------------
suelo('G', SOLAR, MUELLE, 420.0, Z_PUERTO, 1500.0, 0.0, 6.0)
cara('C', SILLAR, [P(MUELLE, Z_PUERTO, MAR_Y - 1.5), P(420.0, Z_PUERTO, MAR_Y - 1.5), P(420.0, Z_PUERTO, 0.0), P(MUELLE, Z_PUERTO, 0.0)], hacia=V((0, 1, 0)), baldosa=4)
cara('C', SILLAR, [P(420.0, Z_PUERTO, MAR_Y - 1.5), P(420.0, 1500.0, MAR_Y - 1.5), P(420.0, 1500.0, 0.0), P(420.0, Z_PUERTO, 0.0)], hacia=V((1, 0, 0)), baldosa=4)
for x in np.arange(40.0, 380.0, 62.0):
    caja('T', LADRILLO, x, x + 50.0, Z_PUERTO + 40.0, Z_PUERTO + 66.0, 0.0, 11.0, baldosa=6)
    tejado('T', TEJA, x, x + 50.0, Z_PUERTO + 40.0, Z_PUERTO + 66.0, 11.0, 4.0)
for x in (110.0, 220.0, 330.0):
    for dx in (-6, 6):
        for dz in (-5, 5):
            barra('T', GRUA, P(x + dx, Z_PUERTO + 12 + dz, 0), P(x + dx, Z_PUERTO + 12 + dz, 34), 0.9)
    caja('T', GRUA, x - 7, x + 7, Z_PUERTO + 6, Z_PUERTO + 18, 34, 36.5, baldosa=4)
    barra('T', GRUA, P(x, Z_PUERTO + 18, 37), P(x, Z_PUERTO - 34, 44), 1.1)

def mercante (x, z, largo, color):
    """Un barco de carga fondeado, a lo largo de z: casco, cubierta, contenedores y el puente a popa."""
    caja('T', color, x - largo * 0.075, x + largo * 0.075, z - largo / 2, z + largo / 2, MAR_Y - 1, 5.0, techo=HORMIGON, baldosa=8)
    caja('T', BLANCO, x - largo * 0.06, x + largo * 0.06, z + largo * 0.32, z + largo * 0.44, 5.0, 17.0, techo=BLANCO, baldosa=8)
    for k in range(5):
        caja('T', random.choice(CHAPAS + TOLDOS), x - largo * 0.06, x + largo * 0.06, z - largo * 0.42 + k * largo * 0.14, z - largo * 0.42 + (k + 0.9) * largo * 0.14, 5.0, random.choice([8.0, 10.5, 10.5]), baldosa=8)
mercante(520.0, -260.0, 150.0, CASCO_NEGRO)
mercante(820.0, 140.0, 170.0, CASCO_ROJO)
mercante(360.0, 330.0, 120.0, material('casco-azul', color=(0.03, 0.08, 0.2), rug=0.6))
caja('T', BLANCO, MUELLE + 6.0, MUELLE + 30.0, Z_PUERTO - 150.0, Z_PUERTO - 30.0, MAR_Y - 1, 9.0, techo=BLANCO, baldosa=8)   # el transbordador
caja('T', BUS, MUELLE + 6.0, MUELLE + 30.0, Z_PUERTO - 150.0, Z_PUERTO - 30.0, MAR_Y - 1, 3.0, baldosa=8)
caja('T', BLANCO, MUELLE + 10.0, MUELLE + 26.0, Z_PUERTO - 130.0, Z_PUERTO - 60.0, 9.0, 16.0, techo=BLANCO, baldosa=8)
for _ in range(26):                                                                 # velas por el golfo
    x, z = random.uniform(60.0, 700.0), random.uniform(-900.0, 380.0)
    g = barca('T', x, z, random.uniform(0, 6.28), largo=random.uniform(7, 11))
    barra('T', BLANCO, g(0.3, 0, MAR_Y + 0.5), g(0.3, 0, MAR_Y + 11.0), 0.14)
    cara('T', BLANCO, [g(0.2, 0, MAR_Y + 1.6), g(-3.6, 0, MAR_Y + 1.6), g(0.2, 0, MAR_Y + 10.6)])
    cara('T', BLANCO, [g(0.5, 0, MAR_Y + 1.4), g(3.4, 0, MAR_Y + 1.2), g(0.4, 0, MAR_Y + 9.6)])

# --- la ciudad: la cuadrícula del centro y, ladera arriba, la Ciudad Alta ------------------------
def loma (x, z):
    """La ladera: llana hasta 300 m del mar y de ahí sube hasta la muralla."""
    f = sm(-330.0, -1080.0, x)
    return 150.0 * f * (1 - 0.25 * sm(500.0, 1300.0, abs(z - 100.0)))
# El suelo de la ciudad, a trozos que no se pisan con lo ya puesto (dos suelos a la
# misma altura parpadean): del jardín para acá, de la plaza para allá y el puerto.
suelo('G', SOLAR, -330.0, FX, Z_FIN, ARIS[0], 0.0, 6.0)
suelo('G', SOLAR, -330.0, FX, ARIS[1], 1500.0, 0.0, 6.0)
suelo('G', SOLAR, -330.0, -70.0, -1500.0, Z_FIN, 0.0, 6.0)
suelo('G', SOLAR, FX, MUELLE, Z_PUERTO, 1500.0, 0.0, 6.0)
filas = []
for i in range(34):
    z = 1500.0 - i * (3000.0 / 33)
    filas.append([P(x, z, loma(x, z)) for x in np.linspace(-1500.0, -330.0, 22)])
malla('T', LADERA, filas, ARRIBA, u_rep=30, v_rep=80)

OTE = (-250.0, -250.0)                                                              # la torre de la OTE, en la Feria
ROT = (-430.0, -150.0)                                                              # la Rotonda
PASO_C = 44.0
# La cuadrícula va paralela al mar, como la trazó Hébrard tras el incendio de 1917;
# la columna más cercana queda a su calle de la primera línea (x = -41).
for gx in np.arange(-1316.0, -83.0, PASO_C):
    for gz in np.arange(-1250.0, 1250.0, PASO_C):
        cx, cz = gx + PASO_C / 2 + random.uniform(-3, 3), gz + PASO_C / 2 + random.uniform(-3, 3)
        if cx > -92.0 and cz < Z_FIN + 12:                                          # el jardín y el paseo nuevo
            continue
        if ARIS[0] - 44 < cz < ARIS[1] + 44 and cx > -372.0:                        # la plaza de Aristóteles
            continue
        if abs(cz - (BOCA[0] + BOCA[1]) / 2) < 30 and cx > -350.0:                  # la calle de la bocacalle
            continue
        if math.hypot(cx - OTE[0], cz - OTE[1]) < 95 or math.hypot(cx - ROT[0], cz - ROT[1]) < 46:
            continue
        if cx < -1060.0 and random.random() < 0.6:                                  # más allá de la muralla, monte
            continue
        if random.random() < 0.05:
            continue
        y = loma(cx, cz)
        if cx > -700.0:                                                             # el centro: bloques de pisos
            ax, az = random.choice((12.0, 13.5, 15.0, 16.5, 18.0)), random.choice((12.0, 13.5, 15.0, 16.5, 18.0))
            alto = random.choice([16, 19, 19, 22, 25]) if cx > -420 else random.choice([13, 16, 16, 19])
            caja('T', random.choice(FACHADAS), cx - ax, cx + ax, cz - az, cz + az, y - 4, y + alto, techo=AZOTEA)
            n_ed += 1
        else:                                                                       # la Ciudad Alta: casas bajas con tejado
            for _ in range(3):
                hx, hz = cx + random.uniform(-13, 13), cz + random.uniform(-13, 13)
                w, d = random.uniform(5, 8), random.uniform(5, 8)
                yy_ = loma(hx, hz)
                alto = random.choice([6, 6, 9])
                caja('T', random.choice(CASAS), hx - w, hx + w, hz - d, hz + d, yy_ - 4, yy_ + alto)
                tejado('T', TEJA, hx - w - 0.4, hx + w + 0.4, hz - d - 0.4, hz + d + 0.4, yy_ + alto, 2.4)
                n_ed += 1
print('EDIFICIOS', n_ed)

# La torre de la OTE: el fuste de hormigón, el platillo del restaurante y la antena.
torno('T', HORMIGON, en(OTE[0], OTE[1]), [(7.0, 0.0), (5.0, 12.0), (4.2, 46.0), (10.5, 50.0), (11.0, 56.0), (6.0, 58.0), (3.0, 62.0), (2.4, 70.0), (0.5, 76.0)], lados=14, tapas=(False, False))
caja('T', BLANCO, OTE[0] - 70, OTE[0] + 70, OTE[1] - 60, OTE[1] - 20, 0.0, 12.0, techo=AZOTEA, baldosa=8)     # los pabellones de la Feria
caja('T', BLANCO, OTE[0] - 70, OTE[0] - 20, OTE[1] + 10, OTE[1] + 70, 0.0, 14.0, techo=AZOTEA, baldosa=8)
# La Rotonda de Galerio: el tambor de ladrillo con su tejado bajo, y el minarete que le quedó.
ry = loma(*ROT)
torno('T', LADRILLO, en(ROT[0], ROT[1], ry - 2), [(15.0, 0.0), (15.0, 22.0), (13.0, 23.0), (12.4, 27.0)], lados=20, u_rep=12, v_m=6.0, tapas=(False, False))
torno('T', TEJA, en(ROT[0], ROT[1], ry + 25), [(13.2, 0.0), (0.0, 5.0)], lados=20, u_rep=10, v_m=6.0, tapas=(False, False))
torno('T', LADRILLO, en(ROT[0] + 22, ROT[1] + 8, ry - 2), [(1.9, 0.0), (1.5, 26.0), (2.2, 27.0), (1.2, 28.0), (1.2, 33.0), (0.0, 38.0)], lados=8, tapas=(False, False))
viga('T', F_PLAZA, ROT[0] + 60, ROT[0] + 66, ROT[1] + 40, ROT[1] + 52, loma(ROT[0] + 60, ROT[1] + 46) - 2, loma(ROT[0] + 60, ROT[1] + 46) + 12.5, u_m=6.0)   # el arco de Galerio

# La muralla de la Ciudad Alta, por lo alto de la ladera, con sus torres, la del
# Trigonio en la esquina y el Heptapirgio arriba.
MX_ = -1065.0
for z0 in np.arange(-380.0, 560.0, 47.0):
    y0, y1 = loma(MX_, z0), loma(MX_, z0 + 47.0)
    cara('T', MURALLA, [P(MX_, z0, y0 - 4), P(MX_, z0 + 47.0, y1 - 4), P(MX_, z0 + 47.0, y1 + 9), P(MX_, z0, y0 + 9)], hacia=V((1, 0, 0)), baldosa=8)
    cara('T', MURALLA, [P(MX_ - 2.4, z0, y0 - 4), P(MX_ - 2.4, z0 + 47.0, y1 - 4), P(MX_ - 2.4, z0 + 47.0, y1 + 9), P(MX_ - 2.4, z0, y0 + 9)], hacia=V((-1, 0, 0)), baldosa=8)
    cara('T', MURALLA, [P(MX_ - 2.4, z0, y0 + 9), P(MX_, z0, y0 + 9), P(MX_, z0 + 47.0, y1 + 9), P(MX_ - 2.4, z0 + 47.0, y1 + 9)], hacia=ARRIBA, baldosa=8)
    caja('T', MURALLA, MX_ - 4.5, MX_ + 3.0, z0 - 3.5, z0 + 3.5, y0 - 4, y0 + 14.0, baldosa=8)                  # una torre cuadrada en cada quiebro
torno('T', MURALLA, en(MX_, -392.0, loma(MX_, -392.0) - 4), [(12.0, 0.0), (11.0, 22.0), (12.0, 23.0), (12.0, 25.0)], lados=16, u_rep=9, v_m=8.0, tapas=(False, True))   # el Trigonio
hy = loma(-1190.0, 60.0)
prisma('T', MURALLA, [(-1190.0 + 62 * math.cos(2 * math.pi * i / 7), 60.0 + 50 * math.sin(2 * math.pi * i / 7)) for i in range(7)], hy - 6, hy + 13.0, techo=LADERA, baldosa=8)
for i in range(7):
    caja('T', MURALLA, -1190.0 + 62 * math.cos(2 * math.pi * i / 7) - 5, -1190.0 + 62 * math.cos(2 * math.pi * i / 7) + 5,
         60.0 + 50 * math.sin(2 * math.pi * i / 7) - 5, 60.0 + 50 * math.sin(2 * math.pi * i / 7) + 5, hy - 6, hy + 20.0, baldosa=8)

# --- los montes: el Jortiatis detrás de la ciudad y la costa que cierra el golfo al sur -----------
sierra('T', MONTE_L, -2700.0, -1500.0, -2500.0, 1700.0, 620.0, 470.0, y0=120.0)
sierra('T', MONTE_L, -2500.0, -1700.0, -700.0, -2700.0, 520.0, 300.0, y0=1.0)
sierra('T', MONTE_L, -500.0, -2750.0, 1700.0, -2950.0, 380.0, 120.0, y0=1.0)
LLANO = material('llano', color=(0.36, 0.37, 0.34), rug=1.0)                              # la ciudad que ya no se distingue (sin luz: 'plano')
for x0, x1, z0, z1 in ((-3000.0, -1500.0, -3000.0, 1500.0), (-1500.0, MUELLE, -3000.0, -1500.0), (-3000.0, 420.0, 1500.0, 3000.0)):
    rect('CP', LLANO, x0, x1, z0, z1, -0.5, 200.0)

cupula('CP', CIELO, 3200.0, 0.0, -60.0)

# ==================================================================================
# 6. HORNEAR Y EXPORTAR
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
    exportes=[('lugar-salonica', ['P', 'E', 'GN', 'EV', 'EP']), ('lugar-salonica-ciudad', ['C', 'G', 'T', 'CP'])],
    # El cielo de Blender pesa mucho: a 0,55 (lo de los otros mapas de día) la luz
    # que salía era AZUL hasta al sol (0,44 / 0,52 / 0,62 de media) y el paseo, de
    # un gris frío de día nublado. Sol fuerte y algo dorado, cielo muy flojo: la
    # luz al sol queda neutra tirando a cálida y la sombra, azulada.
    sol_hacia=SOL, sol_color=(1.0, 0.86, 0.66), sol_fuerza=7.5, cielo_fuerza=0.12, cielo_altura=42, cielo_giro=150,
    escala=0.62, satura=0.9, no_alumbran=('CP',), suaves=('monte-lejos', 'ladera'), fundir=True)
