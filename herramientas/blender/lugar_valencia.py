# Valencia: la Ciudad de las Artes y las Ciencias, hecha en Blender (02/10/2026).
#   blender -b -P herramientas/blender/lugar_valencia.py              (entero)
#   blender -b -P herramientas/blender/lugar_valencia.py -- --rapido  (un minuto)
#   blender -b -P herramientas/blender/lugar_valencia.py -- --reusar  (retocar la luz)
#
# Isidro: «te falta Valencia; antes estaba más o menos bien, con la Ciudad de las
# Ciencias y las Artes; rehazlo con Blender igual que Madrid». Eligió: se juega en
# el PASEO ENTRE ESTANQUES, los alienz llegan ANDANDO desde el fondo (salen del
# Palau), DE DÍA con sol y cinemática LARGA como la de Madrid.
#
# Cómo es de verdad: el conjunto ocupa el viejo cauce del Turia, hundido unos
# metros respecto a la ciudad. Mirando río arriba (noroeste), que es hacia donde
# mira el juego:
#   · al fondo, el Palau de les Arts: el casco blanco con sus dos cáscaras y la
#     pluma por encima;
#   · delante, el puente de Monteolivete cruzando el cauce;
#   · el Hemisfèric, el ojo, metido en su estanque (aquí, a la izquierda);
#   · el Museu de les Ciències, el esqueleto blanco de costillas, a la derecha y a
#     lo largo;
#   · l'Umbracle, la hilera de arcos con palmeras, a la izquierda del todo;
#   · a la espalda, el puente de l'Assut de l'Or (el del mástil), el Àgora azul y
#     l'Oceanogràfic.
#
# Jugando, en un móvil en vertical, solo cabe hasta x ≈ 12 a mitad del campo y 20
# al fondo: se ve el paseo, el agua turquesa a los dos lados, el pie de las
# costillas del Museo, la punta del Hemisfèric y, al fondo, el puente y la puerta
# del Palau por donde salen. Lo demás lo enseña el vuelo de llegada.
#
# Dos modelos: `lugar-valencia.glb` (lo que rodea al campo: se ve toda la partida)
# y `lugar-valencia-ciudad.glb` (el resto: solo en el vuelo). La luz, horneada
# (ver horneado.py).

import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from horneado import *
import horneado as H

SOL = (-0.55, 0.78, 0.36)               # hacia el sol: alto, a la izquierda y algo a la espalda
iniciar('valencia', 1998, eje=(0.0, -60.0), encendidas=0.0, reflejo=(0.05, 0.1, 0.18))

# ==================================================================================
# 1. TEXTURAS Y MATERIALES
# ==================================================================================
def tex_blanco ():
    """El trencadís: blanco roto en teselas irregulares."""
    Hh = W = 256
    a = lienzo(Hh, W, (0.93, 0.93, 0.91)) + ruido(Hh, W, 0.03)[..., None]
    yy, xx = np.mgrid[0:Hh, 0:W]
    for paso, fuerza in ((16, 0.07), (37, 0.04)):
        dx = (H.E.rng.random(W) * 6).astype(int)
        dy = (H.E.rng.random(Hh) * 6).astype(int)
        a[((yy + dx[xx]) % paso) == 0] *= 1 - fuerza
        a[((xx + dy[yy]) % paso) == 0] *= 1 - fuerza
    return guardar('blanco', a)

def tex_losa ():
    a = lienzo(256, 256, (0.8, 0.79, 0.76)) + ruido(256, 256, 0.05)[..., None]
    for i in range(2):                                           # cada losa, con su tono
        for j in range(2):
            a[i * 128:(i + 1) * 128, j * 128:(j + 1) * 128] *= 0.95 + 0.1 * random.random()
    for k in range(0, 256, 128):
        a[k:k + 2] *= 0.82; a[:, k:k + 2] *= 0.82
    for k in range(64, 256, 128):                                # la junta fina de en medio
        a[k:k + 1] *= 0.93; a[:, k:k + 1] *= 0.93
    return guardar('losa', a)

def tex_agua ():
    Hh = W = 256
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u, v = xx / W, yy / Hh
    onda = np.zeros((Hh, W), np.float32)
    for fx, fy, f in ((3, 2, 0.0), (5, 7, 1.3), (8, 3, 2.1)):
        onda += np.abs(np.sin(2 * np.pi * (u * fx + v * fy) + f + 1.5 * np.sin(2 * np.pi * (u * fy - v * fx))))
    reflejo = np.clip(1 - onda / 1.5, 0, 1) ** 3                   # las líneas de luz del fondo
    hondo = ruido(Hh, W, 0.08)
    a = np.stack([0.08 + hondo * 0.3 + 0.55 * reflejo, 0.5 + hondo + 0.42 * reflejo, 0.58 + hondo + 0.36 * reflejo], axis=-1)
    return guardar('agua', a, 88)

BLANCO = material('blanco', tex_blanco(), rug=0.5)
BLANCO_SUCIO = material('blanco-sombra', imagen_de(BLANCO), tinte=0xd9dade, rug=0.6)
LOSA = material('losa', tex_losa(), rug=0.85)
LOSA_GRIS = material('losa-gris', imagen_de(LOSA), tinte=0xb4b8bd, rug=0.85)
AGUA = material('agua', tex_agua(), rug=0.1)
VIDRIO_MUSEO = material('vidrio-museo', tex_vidrio('vidrio-museo', (0.16, 0.27, 0.36), montante=(0.86, 0.87, 0.88)), rug=0.2)
COSTILLAS = material('costillas', tex_nervios('costillas', (0.92, 0.92, 0.9), (0.12, 0.2, 0.28), paso=32, ancho=20, forjado=False), rug=0.4)
TERRAZAS = material('terrazas', tex_oficina('terrazas', (0.92, 0.92, 0.9), (0.12, 0.17, 0.24)))
AZUL = material('agora', tex_nervios('agora', (0.08, 0.2, 0.55), (0.88, 0.9, 0.94), paso=64, ancho=6, forjado=False), rug=0.4)
NEGRO = material('negro', color=(0.012, 0.014, 0.02))
HORMIGON = material('hormigon', de_polyhaven('concrete_floor_worn_001', 512, 0xb9b6ae))
CALZADA = material('calzada', tex_calzada(), rug=0.95)
ACERA = material('acera', de_polyhaven('pavement_02', 512, 0xa9a49a), rug=0.9)
PARQUE = material('parque', de_polyhaven('leafy_grass', 512, 0x56773a), rug=1.0)
AZOTEA = material('azotea', tex_azotea((0.5, 0.42, 0.36)))
CIELO = material('cielo', tex_cielo(
    [(0.0, (0.80, 0.88, 0.95)), (0.07, (0.72, 0.84, 0.95)), (0.25, (0.45, 0.68, 0.93)), (0.6, (0.24, 0.48, 0.86)), (1.0, (0.14, 0.34, 0.74))],
    (SOL[0], SOL[2]), 0.55, (0.25, 0.22, 0.15), ((1.0, 1.0, 1.0), (0.93, 0.95, 0.98)), cuanta_nube=0.2), emite=1.0)
HOJAS = [material(f'hojas-{i}', color=c, rug=1.0) for i, c in enumerate([(0.14, 0.3, 0.09), (0.18, 0.36, 0.1), (0.24, 0.4, 0.13)])]
PALMA = [material(f'palma-{i}', color=c, rug=1.0) for i, c in enumerate([(0.2, 0.38, 0.12), (0.26, 0.42, 0.14)])]
TRONCO = material('tronco', color=(0.32, 0.25, 0.18))
COCHES = [material(f'coche-{i}', color=c, rug=0.35) for i, c in enumerate([(0.8, 0.81, 0.83), (0.12, 0.12, 0.13), (0.55, 0.1, 0.08), (0.12, 0.2, 0.45), (0.85, 0.83, 0.77)])]
LUNA = material('coche-luna', color=(0.05, 0.07, 0.1), rug=0.2)
F_PISOS = ([material(f'f-crema-{i}', tex_crema(f'crema-{i}', c, 0.75)) for i, c in enumerate([(0.86, 0.8, 0.68), (0.9, 0.88, 0.84), (0.8, 0.7, 0.58)])]
           + [material(f'f-ladrillo-{i}', tex_ladrillo(f'ladrillo-{i}', c)) for i, c in enumerate([(0.62, 0.38, 0.27), (0.72, 0.52, 0.38)])])
F_TORRE = [material('f-oficina-0', tex_oficina('oficina-0', (0.9, 0.89, 0.86), (0.12, 0.18, 0.26))),
           material('f-vidrio-0', tex_vidrio('vidrio-0', (0.14, 0.24, 0.34)), rug=0.2),
           material('f-vidrio-1', tex_vidrio('vidrio-1', (0.2, 0.3, 0.34)), rug=0.2)]
print('TEXTURAS', round(time.time() - H.E.t0, 1), 's')

# ==================================================================================
# 2. LO QUE RODEA AL CAMPO (se ve toda la partida)
# ==================================================================================
# Grupos: S el paseo (luz del juego) · E los edificios y el agua · GN el césped del
# cauce · EP lo que no lleva luz. Y para el vuelo: C, G, T y CP.
config_suelo(-1400, 1400, -1500, 1300, (-330, 330), (-420, 340))
PASEO, BORDE = 8.8, 9.3                 # medio ancho del paseo y canto del estanque
Z_CERCA, Z_PUERTA = 34.0, -124.0

# --- el paseo, con la plataforma de la base alien metida en el estanque -------------
# Losas claras con una cenefa gris en los cantos y una banda cada catorce metros
# (sin pisarse: dos suelos a la misma altura parpadean).
for lado in (-1, 1):
    rect('S', LOSA_GRIS, lado * 7.6, lado * PASEO, Z_PUERTA, Z_CERCA, 0.0, baldosa=4.0)
z = Z_CERCA
while z > Z_PUERTA:
    fin = max(Z_PUERTA, z - 13.4)
    rect('S', LOSA, -7.6, 7.6, fin, z, 0.0, baldosa=4.0)
    if fin > Z_PUERTA:
        rect('S', LOSA_GRIS, -7.6, 7.6, max(Z_PUERTA, fin - 0.6), fin, 0.0, baldosa=4.0)
    z = fin - 0.6
# Isidro (02/10): «ponla un poco más dentro del agua, aquí no queda bien
# ajustada»: el aro de la base (radio 3,9) se salía de la plataforma y pisaba el
# canto y una farola. Ahora va más adentro y más al fondo —donde la pantalla del
# móvil es más ancha y sigue viéndose—, con la plataforma a su medida y sin
# canto, banco ni farola en ese tramo.
BASE, R_BASE = (-12.6, -44.0), 4.9
disco = [(BASE[0] + R_BASE * math.cos(2 * math.pi * i / 24), BASE[1] + R_BASE * math.sin(2 * math.pi * i / 24)) for i in range(24)]
cara('S', LOSA, [P(x, z, 0.02) for x, z in disco], hacia=ARRIBA, baldosa=4.0)
for i in range(24):                      # el canto de la plataforma
    (ax, az), (bx, bz) = disco[i], disco[(i + 1) % 24]
    if min(ax, bx) > -BORDE:
        continue
    cara('E', BLANCO, [P(ax, az, -0.3), P(bx, bz, -0.3), P(bx, bz, 0.02), P(ax, az, 0.02)],
         hacia=V((ax + bx - 2 * BASE[0], -(az + bz - 2 * BASE[1]), 0)), baldosa=4)

# --- los estanques --------------------------------------------------------------
POZA_X, POZA_Z = 58.0, -104.0
for lado in (-1, 1):
    rect('E', AGUA, lado * BORDE, lado * POZA_X, POZA_Z, 26, -0.25, baldosa=14.0)
    # el canto blanco, por dentro (junto al paseo) y por fuera
    if lado < 0:                         # el canto se abre donde la plataforma se une al paseo
        caja('E', BLANCO, -BORDE, -PASEO, POZA_Z, BASE[1] - 3.0, -0.3, 0.3, baldosa=4)
        caja('E', BLANCO, -BORDE, -PASEO, BASE[1] + 3.0, Z_CERCA, -0.3, 0.3, baldosa=4)
    else:
        caja('E', BLANCO, lado * PASEO, lado * BORDE, POZA_Z, Z_CERCA, -0.3, 0.3, baldosa=4)
    caja('E', BLANCO, lado * POZA_X, lado * (POZA_X + 1.2), POZA_Z - 1.2, 27.2, -0.3, 0.25, baldosa=4)
    caja('E', BLANCO, lado * BORDE, lado * POZA_X, 26, 27.2, -0.3, 0.25, baldosa=4)
    caja('E', BLANCO, lado * BORDE, lado * POZA_X, POZA_Z - 1.2, POZA_Z, -0.3, 0.25, baldosa=4)
# El césped del cauce, por debajo de todo.
suelo('GN', PARQUE, -92, 92, -420, 60, -0.32, 6.0)
for lado in (-1, 1):                     # los caminos blancos junto a los estanques
    suelo('GN', LOSA, lado * 60.5, lado * 66, -230, 60, -0.27, 4.0)
suelo('GN', LOSA, -92, 92, 27.5, 33, -0.27, 4.0)
suelo('GN', LOSA, -BORDE, BORDE, -420, Z_PUERTA, -0.27, 4.0)

# --- el Museu de les Ciències: el esqueleto de costillas, a la derecha ---------------
M0, M1 = 0.0, -100.0                    # de dónde a dónde, a lo largo
DX = -5.0                               # pegado al paseo: jugando se ve el pie de las costillas
PIE, HOMBRO, CUMBRE, ESPALDA, PIE_T = (21.0 + DX, 0.0), (16.5 + DX, 15.0), (31.0 + DX, 19.5), (47.0 + DX, 9.0), (50.0 + DX, 0.0)
def lado_museo (a, b, mat, hacia, baldosa_u=12.0, v=1.0):
    franja('E', mat, [(a[0], M0), (a[0], M1)], a[1], [(b[0], M0), (b[0], M1)], b[1], hacia, u_baldosa=baldosa_u, v0=0, v1=v, cerrada=False)
lado_museo(PIE, HOMBRO, VIDRIO_MUSEO, V((-1, 0, 0.2)), 12.0, 1.3)        # la fachada del paseo, inclinada hacia fuera
lado_museo(HOMBRO, CUMBRE, BLANCO, ARRIBA, 6.0, 3)
lado_museo(CUMBRE, ESPALDA, VIDRIO_MUSEO, V((0.5, 0, 1)), 12.0, 1.6)     # la gran cristalera del norte
lado_museo(ESPALDA, PIE_T, VIDRIO_MUSEO, V((1, 0, 0)), 12.0, 0.8)
for z, s in ((M0, 1), (M1, -1)):                                          # los dos testeros
    cara('E', VIDRIO_MUSEO, [P(x, z, y) for x, y in (PIE, HOMBRO, CUMBRE, ESPALDA, PIE_T)], hacia=V((0, -s, 0)), baldosa=12.0)
MODULO = 4.0
for k in range(int((M0 - M1) / MODULO) + 1):
    z = M0 - k * MODULO
    # la costilla inclinada de la fachada, con su jabalcón, y la del lado norte
    # (lo fino lleva la luz en los vértices: en el atlas cada barra sería un píxel)
    barra('EV', BLANCO, P(23.0 + DX, z, -0.3), P(15.6 + DX, z, 16.0), 0.95)
    barra('EV', BLANCO, P(19.4 + DX, z, 7.8), P(23.5 + DX, z, 17.3), 0.6)
    barra('EV', BLANCO, P(52.0 + DX, z, -0.3), P(47.4 + DX, z, 9.8), 0.8)
    # la espina del tejado: una aleta blanca que sigue la cubierta
    for (a, b) in (((15.6, 16.0), (31.0, 21.6)), ((31.0, 21.6), (47.6, 10.0))):
        barra('EV', BLANCO, P(a[0] + DX, z, a[1]), P(b[0] + DX, z, b[1]), 0.55)
# las galerías: dos líneas blancas a lo largo de la fachada
for (x, y) in ((19.2 + DX, 5.2), (17.8 + DX, 10.4)):
    caja('E', BLANCO, x - 1.3, x + 0.4, M1, M0, y - 0.22, y + 0.22, baldosa=4)
# Bancos de trencadís y farolas a lo largo de los cantos, fuera del paso.
for z in np.arange(22.0, -118.0, -14.0):
    for lado in (-1, 1):
        if not (lado < 0 and abs(z - BASE[1]) < 8.5):
            caja('E', BLANCO, lado * 7.75, lado * 8.7, z - 2.2, z + 2.2, 0, 0.5, baldosa=4)
        if not (lado < 0 and abs(z - 7 - BASE[1]) < 8.5):
            barra('EV', BLANCO, P(lado * 9.05, z - 7, 0.3), P(lado * 9.05, z - 7, 5.2), 0.16)
            barra('EV', BLANCO, P(lado * 9.05, z - 7, 5.2), P(lado * 8.2, z - 7, 5.5), 0.14)

# --- l'Hemisfèric: el ojo, a la izquierda ------------------------------------------
HC, HA, HB, HH = (-25.0, -70.0), 25.0, 13.0, 12.5
def casco (centro, a, b, alto, nt, nf, exp_w=0.75, exp_h=0.6, t0=-1.0, t1=1.0, punta=1.0):
    """Filas de puntos de un casco alargado según z: fila = sección, de un lado a otro."""
    filas = []
    for i in range(nt + 1):
        t = t0 + (t1 - t0) * i / nt
        w = b * max(0.0, 1 - t * t) ** exp_w
        hh = alto * max(0.0, 1 - t * t) ** exp_h
        fila = []
        for j in range(nf + 1):
            f = math.pi * j / nf
            fila.append(P(centro[0] + w * math.cos(f), centro[1] + a * t, hh * math.sin(f) ** punta))
        filas.append(fila)
    return filas
def trozo (filas, j0, j1):
    return [f[j0:j1 + 1] for f in filas]
def hacia_fuera_de (centro):
    c = P(centro[0], centro[1])
    return lambda p: V((p.x - c.x, (p.y - c.y) * 0.15, p.z + 0.5))
ojo = casco(HC, HA, HB, HH, 18, 12)
malla('E', COSTILLAS, trozo(ojo, 0, 4), hacia_fuera_de(HC), u_rep=1, v_rep=2.5, girar=True)   # el párpado de cristal, a un lado
malla('E', BLANCO, trozo(ojo, 4, 8), hacia_fuera_de(HC), u_rep=2, v_rep=8)                      # la cáscara blanca de arriba
malla('E', COSTILLAS, trozo(ojo, 8, 12), hacia_fuera_de(HC), u_rep=1, v_rep=2.5, girar=True)
# el canto de la cáscara: dos arcos blancos gruesos de punta a punta
for j in (4, 8):
    for a, b in zip([f[j] for f in ojo], [f[j] for f in ojo][1:]):
        barra('EV', BLANCO, a, b, 0.7)

# --- el puente de Monteolivete, cruzando el cauce delante del Palau -----------------
PZ0, PZ1, PY = -114.0, -106.0, 6.4
caja('E', HORMIGON, -92, 92, PZ0, PZ1, PY, PY + 1.1, techo=CALZADA, baldosa=6, tapa_abajo=True)
for x in (-76, -44, -13, 13, 44, 76):
    caja('E', BLANCO, x - 1.1, x + 1.1, PZ0 + 1.5, PZ1 - 1.5, -0.3, PY, baldosa=4)
for z in (PZ0, PZ1):
    caja('E', BLANCO, -92, 92, z - 0.15, z + 0.15, PY + 1.1, PY + 1.9, baldosa=4)

# --- el Palau de les Arts, al fondo: de su puerta salen ------------------------------
PL = 90.0                                # largo
def palau (s, f):
    """s: de la proa (0) a la popa (1); f: de un lado (0) al otro (π)."""
    w = 24.0 * math.sin(math.pi * (0.12 + 0.88 * s)) ** 0.7 if s < 1 else 0.0
    hh = 34.0 * math.sin(math.pi * (0.15 + 0.85 * s)) ** 0.8 if s < 1 else 0.0
    return P(w * math.cos(f), Z_PUERTA - PL * s, hh * math.sin(f) ** 0.9)
NS, NF = 16, 14
hull = [[palau(i / NS, math.pi * j / NF) for j in range(NF + 1)] for i in range(NS + 1)]
PC = (0.0, Z_PUERTA - PL / 2)
malla('E', TERRAZAS, hull, hacia_fuera_de(PC), u_rep=1.2, v_rep=7, girar=True)      # el núcleo: terrazas y cristal
cara('E', TERRAZAS, hull[0], hacia=V((0, -1, 0)), baldosa=12.0)                     # la proa
# Las dos cáscaras blancas, separadas del núcleo: son lo que se reconoce.
def cascara (lado):
    filas = []
    for i in range(NS + 1):
        s = 0.02 + 0.96 * i / NS
        fila = []
        for j in range(7):
            f = math.radians(4 + 60 * j / 6 * (0.55 + 0.45 * math.sin(math.pi * s)))
            p = palau(s, f if lado > 0 else math.pi - f)
            fila.append(V((p.x * 1.1 + lado * 1.6, p.y, p.z * 1.06 + 0.4)))
        filas.append(fila)
    return filas
for lado in (-1, 1):
    malla('E', BLANCO, cascara(lado), V((lado, 0, 0.3)), u_rep=3, v_rep=14)
# La puerta: un hueco negro. Los alienz nacen detrás y salen por él.
cara('EP', NEGRO, [P(-7, Z_PUERTA + 0.08, -0.2), P(7, Z_PUERTA + 0.08, -0.2), P(7, Z_PUERTA + 0.08, 4.8), P(-7, Z_PUERTA + 0.08, 4.8)])
for lado in (-1, 1):
    caja('E', BLANCO, lado * 7, lado * 8.4, Z_PUERTA, Z_PUERTA + 1.2, -0.3, 5.8, baldosa=4)
caja('E', BLANCO, -11.5, 11.5, Z_PUERTA - 0.5, Z_PUERTA + 2.6, 4.8, 5.8, baldosa=4)                  # la visera de la puerta
# La pluma: la lámina que vuela por encima, de la popa a la proa.
izq, der, izq_b, der_b = [], [], [], []
for i in range(21):
    s = -0.06 + 1.12 * i / 20
    z = Z_PUERTA - PL * s
    y = 7 + 34.5 * math.sin(math.pi * min(1.0, max(0.0, (s + 0.06) / 1.2 + 0.1))) ** 0.75 if s < 1.0 else max(0.0, 12 * (1.06 - s) / 0.06)
    ancho = 1.2 + 5.5 * min(1.0, max(0.0, s + 0.06))
    izq.append(P(-ancho, z, y)); der.append(P(ancho, z, y))
    izq_b.append(P(-ancho * 0.8, z, y - 1.4)); der_b.append(P(ancho * 0.8, z, y - 1.4))
malla('E', BLANCO, [izq, der], ARRIBA, u_rep=10, v_rep=1)
malla('E', BLANCO_SUCIO, [izq_b, der_b], ABAJO, u_rep=10, v_rep=1)
malla('E', BLANCO, [izq, izq_b], V((-1, 0, 0)), u_rep=10, v_rep=0.3)
malla('E', BLANCO, [der, der_b], V((1, 0, 0)), u_rep=10, v_rep=0.3)

comprobar_paso(('E', 'EP', 'S'))

# ==================================================================================
# 3. LO QUE SOLO SE VE EN EL VUELO
# ==================================================================================
ORILLA, ALTO_ORILLA = 92.0, 5.0        # el cauce va hundido: la ciudad queda cinco metros más arriba

# --- l'Umbracle: la hilera de arcos con el jardín de palmeras -----------------------
UX0, UX1, UZ0, UZ1 = -88.0, -70.0, 14.0, -100.0
caja('C', BLANCO, UX0, UX1, UZ1, UZ0, -0.3, 3.2, techo=PARQUE, baldosa=4)
for k in range(int((UZ0 - UZ1) / 4.2) + 1):
    z = UZ0 - k * 4.2
    pts = [P(UX0 + 1 + (UX1 - UX0 - 2) * i / 8, z, 3.2 + 10.5 * math.sin(math.pi * i / 8) ** 0.85) for i in range(9)]
    for a, b in zip(pts, pts[1:]):
        barra('T', BLANCO, a, b, 0.38 if k % 3 == 0 else 0.22)
for z in np.arange(UZ0 - 4, UZ1, -9.0):
    palmera('T', TRONCO, PALMA, (UX0 + UX1) / 2 + random.uniform(-4, 4), z, random.uniform(6, 8), y=3.2)

# --- el puente de l'Assut de l'Or: el mástil y su abanico de cables -----------------
AZ0, AZ1, AY = 80.0, 92.0, 8.0
caja('C', HORMIGON, -ORILLA, ORILLA, AZ0, AZ1, AY, AY + 1.5, techo=CALZADA, baldosa=6, tapa_abajo=True)
for x in (-70, 62, 84):
    caja('C', BLANCO, x - 1.5, x + 1.5, AZ0 + 2, AZ1 - 2, -0.3, AY, baldosa=4)
MASTIL = [(18.0, AY + 1.5), (26.0, 24.0), (34.0, 38.0), (41.0, 50.0), (48.0, 60.0)]
for (a, b), g in zip(zip(MASTIL, MASTIL[1:]), (3.6, 3.0, 2.4, 1.8)):
    barra('T', BLANCO, P(a[0], 86, a[1]), P(b[0], 86, b[1]), g)
def en_mastil (f):
    i = min(len(MASTIL) - 2, int(f * (len(MASTIL) - 1)))
    t = f * (len(MASTIL) - 1) - i
    return MASTIL[i][0] + (MASTIL[i + 1][0] - MASTIL[i][0]) * t, MASTIL[i][1] + (MASTIL[i + 1][1] - MASTIL[i][1]) * t
for k in range(14):                      # el abanico: del mástil al tablero, hacia la izquierda
    mx, my = en_mastil(0.4 + 0.6 * k / 13)
    for z in (82.0, 90.0):
        barra('T', BLANCO, P(mx, 86, my), P(6 - 76 * k / 13, z, AY + 1.5), 0.13)
for k in range(4):                       # los tirantes de atrás
    mx, my = en_mastil(0.7 + 0.3 * k / 3)
    barra('T', BLANCO, P(mx, 86, my), P(88 + k * 3, 86, AY + 1.5), 0.2)

# --- l'Àgora: la almendra azul ------------------------------------------------------
AG = (-34.0, 150.0)
agora = casco(AG, 24.0, 14.0, 32.0, 14, 12, exp_w=0.8, exp_h=0.45, punta=0.7)
malla('C', AZUL, agora, hacia_fuera_de(AG), u_rep=1, v_rep=5)
cara('C', BLANCO, [P(AG[0] + 16 * math.cos(2 * math.pi * i / 16), AG[1] + 27 * math.sin(2 * math.pi * i / 16), -0.2) for i in range(16)], hacia=ARRIBA, baldosa=4)

# --- el cauce: césped, caminos y las orillas (la BASE del suelo va antes que lo de encima) -----------------------------------------
suelo('G', PARQUE, -ORILLA, ORILLA, -1500, -420, -0.32, 6.0)
suelo('G', PARQUE, -ORILLA, ORILLA, 60, 1300, -0.32, 6.0)
suelo('G', LOSA, -ORILLA, ORILLA, 100, 200, -0.28, 4.0)          # la explanada del Àgora
for x in (-38.0, 0.0, 38.0):                                     # los caminos del jardín, cauce arriba y abajo
    suelo('G', LOSA, x - 2.5, x + 2.5, -1500, -420, -0.27, 4.0)
    suelo('G', LOSA, x - 2.5, x + 2.5, 200, 1300, -0.27, 4.0)
for lado in (-1, 1):
    suelo('G', LOSA, lado * 60.5, lado * 66, 60, 78, -0.27, 4.0)
    for z in np.arange(-1500, 1300, 40.0):                         # el muro del cauce, a tramos (luz en vértices)
        cara('T', HORMIGON, [P(lado * ORILLA, z, -0.32), P(lado * ORILLA, z + 40, -0.32), P(lado * ORILLA, z + 40, ALTO_ORILLA), P(lado * ORILLA, z, ALTO_ORILLA)],
             hacia=V((-lado, 0, 0)), baldosa=6)

# --- l'Oceanogràfic: las cubiertas en nenúfar y sus estanques -------------------------
for (ox, oz, r) in ((30, 250, 15), (-22, 300, 12), (48, 330, 10)):
    suelo('G', AGUA, ox - r * 1.9, ox + r * 1.9, oz - r * 1.9, oz + r * 1.9, -0.25, 14.0)
    lobulos = 8
    filas = []
    for i in range(7):                   # del centro al borde
        d = i / 6
        fila = []
        for j in range(lobulos * 4 + 1):
            a = 2 * math.pi * j / (lobulos * 4)
            onda = 0.5 + 0.5 * math.cos(a * lobulos)
            fila.append(P(ox + r * d * math.cos(a), oz + r * d * math.sin(a), 1.0 + r * 0.55 * (d ** 2) * onda + r * 0.12 * (1 - d)))
        filas.append(fila)
    malla('C', BLANCO, filas, ARRIBA, u_rep=8, v_rep=2)

# --- la ciudad, arriba, a los dos lados ------------------------------------------------
for lado in (-1, 1):
    suelo('G', ACERA, lado * ORILLA, lado * 1400, -1500, 1300, ALTO_ORILLA, 6.0)
    suelo('G', CALZADA, lado * 97, lado * 115, -1500, 1300, ALTO_ORILLA + 0.06, carriles=(lado * 97 if lado > 0 else -115, 4.5, 'z'))
PASO = 70.0
calles_x = [float(x) for x in np.arange(-1375.0, 1376.0, PASO) if abs(x) > 150]
calles_z = [float(z) for z in np.arange(-1460.0, 1280.0, PASO)]
for x in calles_x:
    suelo('G', CALZADA, x - 6, x + 6, -1500, 1300, ALTO_ORILLA + 0.06, carriles=(x - 6, 6.0, 'z'))
for z in calles_z:
    for a, b in ((-1400, -115), (115, 1400)):
        suelo('G', CALZADA, a, b, z - 6, z + 6, ALTO_ORILLA + 0.065, carriles=(z - 6, 6.0, 'x'))
    if z in (calles_z[len(calles_z) // 2 + 5], calles_z[len(calles_z) // 2 - 9]):   # dos puentes más, lejos
        caja('T', HORMIGON, -ORILLA, ORILLA, z - 6, z + 6, ALTO_ORILLA - 1, ALTO_ORILLA + 0.3, techo=CALZADA, baldosa=6)

def cerca (x, z):
    return math.hypot(x, z + 40) < 380
n_ed = 0
bordes_x = sorted(calles_x + [-115.0, 115.0])
for i in range(len(bordes_x) - 1):
    if bordes_x[i] == -115.0 and bordes_x[i + 1] == 115.0:
        continue
    for j in range(len(calles_z) - 1):
        ax, bx = bordes_x[i] + 10, bordes_x[i + 1] - 10
        az, bz = calles_z[j] + 10, calles_z[j + 1] - 10
        if bx - ax < 15 or bx - ax > 130:
            continue
        cx, cz = (ax + bx) / 2, (az + bz) / 2
        dist = math.hypot(cx, cz + 40)
        if dist > 1250 and random.random() < 0.4:
            continue
        junto = cerca(cx, cz)
        ribera = abs(cx) < 260                   # la primera línea, la de las torres nuevas
        partes = random.choice([2, 2, 3]) if junto else 1
        a_lo_largo = random.random() < 0.5
        for k in range(partes):
            if a_lo_largo:
                x0, x1 = ax, bx; z0 = az + (bz - az) * k / partes; z1 = az + (bz - az) * (k + 1) / partes
            else:
                z0, z1 = az, bz; x0 = ax + (bx - ax) * k / partes; x1 = ax + (bx - ax) * (k + 1) / partes
            x1 = x0 + max(9, round((x1 - x0) / 3) * 3); z1 = z0 + max(9, round((z1 - z0) / 3) * 3)
            if ribera and random.random() < 0.45:
                plantas = random.randint(13, 22); fach = random.choice(F_TORRE + F_PISOS[:2])
                if a_lo_largo: x0, x1 = x0 + (x1 - x0) * 0.2, x1 - (x1 - x0) * 0.2
                else: z0, z1 = z0 + (z1 - z0) * 0.2, z1 - (z1 - z0) * 0.2
                x1 = x0 + max(9, round((x1 - x0) / 3) * 3); z1 = z0 + max(9, round((z1 - z0) / 3) * 3)
            else:
                plantas = random.randint(6, 11); fach = random.choice(F_PISOS)
            alto = ALTO_ORILLA + plantas * 3.0
            g = 'C' if junto else 'T'
            caja(g, fach, x0, x1, z0, z1, ALTO_ORILLA, alto, techo=AZOTEA)
            if junto:
                cx2, cz2 = random.uniform(x0 + 2, x1 - 7), random.uniform(z0 + 2, z1 - 7)
                caja(g, HORMIGON, cx2, cx2 + random.uniform(3, 5), cz2, cz2 + random.uniform(3, 5), alto, alto + 2.6, baldosa=6)
            n_ed += 1
print('EDIFICIOS', n_ed)

# --- palmeras, árboles y coches -----------------------------------------------------
n = 0
for lado in (-1, 1):
    for z in np.arange(-225, 60, 7.0):           # las hileras de palmeras junto a los estanques
        palmera('T', TRONCO, PALMA, lado * 63.2 + random.uniform(-0.4, 0.4), z, random.uniform(6.5, 9)); n += 1
    for z in np.arange(-900, 900, 9.0):          # y la arboleda de la ribera, arriba
        if random.random() < 0.85:
            arbol('T', TRONCO, HOJAS, lado * (ORILLA + 2.2), z, random.uniform(0.9, 1.3), fino=abs(z + 40) < 260, y=ALTO_ORILLA); n += 1
for _ in range(520):                              # el jardín del Turia, cauce arriba y cauce abajo
    x = random.uniform(-86, 86)
    z = random.choice([random.uniform(-1300, -232), random.uniform(360, 1200)])
    if abs(x) < 12 and z > -420:
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(0.9, 1.6)); n += 1
for _ in range(60):
    x = random.choice([-1, 1]) * random.uniform(68, 88); z = random.uniform(-225, 55)
    if UX0 - 3 < x < UX1 + 3:
        continue
    arbol('T', TRONCO, HOJAS, x, z, random.uniform(0.9, 1.4), fino=True); n += 1
print('ARBOLES', n)
for _ in range(150):
    lado = random.choice([-1, 1])
    coche('T', COCHES, LUNA, lado * random.choice([101.5, 106, 110.5]), random.uniform(-700, 700), random.gauss(0, 0.1), y=ALTO_ORILLA + 0.06)
for _ in range(22):
    coche('T', COCHES, LUNA, random.uniform(-90, 90), random.choice([83, 89]), math.pi / 2 + random.gauss(0, 0.08), y=AY + 1.5)
    coche('T', COCHES, LUNA, random.uniform(-90, 90), random.choice([-112, -108]), math.pi / 2 + random.gauss(0, 0.08), y=PY + 1.1) if random.random() < 0.4 else None

cupula('CP', CIELO, 3000.0, 0.0, -40.0)

# ==================================================================================
# 4. HORNEAR Y EXPORTAR
# ==================================================================================
terminar(
    grupos={
        'S': ('suelo-paseo', 'juego', None),
        'E': ('luzE', 'atlas', 'luzE'),
        'GN': ('luzG-cerca', 'planta', 'luzG'),
        'EV': ('vert-cerca', 'vert', None),
        'EP': ('planoE', 'plano', None),
        'C': ('luzC', 'atlas', 'luzC'),
        'G': ('luzG', 'planta', 'luzG'),
        'T': ('vertT', 'vert', None),
        'CP': ('planoC', 'plano', None),
    },
    exportes=[('lugar-valencia', ['S', 'E', 'GN', 'EV', 'EP']), ('lugar-valencia-ciudad', ['C', 'G', 'T', 'CP'])],
    sol_hacia=SOL, sol_color=(1.0, 0.95, 0.86), sol_fuerza=3.6, cielo_fuerza=0.55, cielo_altura=50, cielo_giro=-120,
    escala=0.42, satura=0.75, no_alumbran=('CP',))
