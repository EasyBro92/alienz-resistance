# Arena 2: el cráter de la nodriza.
#   blender -b -P herramientas/blender/arena_crater.py -- [--vista]
# Un cráter de roca volcánica alrededor del campo, con la nodriza estrellada y
# medio enterrada en la ladera de la derecha, grietas verdes que brillan y el
# público de pie por las laderas.

import sys, os, math, random
sys.path.append(os.path.dirname(__file__))
from comun import *

empezar(23)

M_ROCA = material('roca', 0x3d3430)
M_CENIZA = material('ceniza', 0x5e5048)
M_METAL = material('metal', 0x3a3f46, 0.5, metal=0.6)
# `brillo_…`: el juego no le apaga la emisión (a lo demás sí).
M_GRIETA = material('brillo-grieta', 0x3cff5a, 0.4, 0x3cff5a, 5.0)
M_FOCO = material('foco', 0xfff4d6, 0.3, 0xfff1cc, 6.0)

ZC = -22.0
A0, B0 = 17.0, 42.0
N = 112
RADIAL = [0, 1.5, 3, 4.5, 6, 8, 10, 12, 14, 17, 21, 26]
Z_CORTE = 14.0

# Ruido suave por ángulo: el cráter no es un anillo perfecto.
ruido = [random.uniform(-1, 1) for _ in range(N)]
def suave (k, pasadas=3):
    v = ruido[:]
    for _ in range(pasadas):
        v = [(v[(i - 1) % N] + v[i] + v[(i + 1) % N]) / 3 for i in range(N)]
    return v[k % N]
SUAVE = [suave(k) for k in range(N)]

def alto (d, k):
    # El perfil de la ladera: sube hasta la cresta (a 14 m del borde) y baja.
    crest = 13.5 * (1 + 0.25 * SUAVE[k])
    if d <= 14:
        return crest * math.sin(min(1, d / 14) * math.pi / 2) ** 1.4
    return crest - (d - 14) * 0.45

def punto (d, k):
    t = 2 * math.pi * k / N
    e = 1 + 0.06 * SUAVE[(k + 17) % N]
    return (A0 + d) * math.cos(t) * e, ZC + (B0 + d) * math.sin(t) * e

def visible (k):
    return punto(0, k)[1] < Z_CORTE and punto(0, (k + 1) % N)[1] < Z_CORTE

def ladera (bm):
    for k in range(N):
        if not visible(k):
            continue
        for j in range(len(RADIAL) - 1):
            d0, d1 = RADIAL[j], RADIAL[j + 1]
            vs = []
            for (d, kk) in ((d0, k), (d0, k + 1), (d1, k + 1), (d1, k)):
                x, z = punto(d, kk)
                vs.append(P(x, alto(d, kk % N) + random.uniform(-0.25, 0.25) * (d > 0), z))
            mat = 1 if (d0 >= 10 and d0 < 17) else 0
            f = bm.faces.new([bm.verts.new(v) for v in vs])
            f.material_index = mat

malla('ladera', ladera, [M_ROCA, M_CENIZA])

# Grietas: tiras que bajan por la ladera, pegadas al suelo.
def grietas (bm):
    for k in range(2, N, 7):
        if not visible(k) or random.random() < 0.3:
            continue
        prev = None
        kk = k
        for d in (0.5, 2.5, 4.5, 6.5, 8.5, 10.5):
            kk = kk + random.choice((-1, 0, 0, 1))
            x, z = punto(d, kk)
            y = alto(d, kk % N) + 0.12
            if prev:
                px, py, pz = prev
                ang = math.atan2(z - pz, x - px) + math.pi / 2
                w = 0.22
                ox, oz = math.cos(ang) * w, math.sin(ang) * w
                quad(bm, P(px - ox, py, pz - oz), P(px + ox, py, pz + oz), P(x + ox, y, z + oz), P(x - ox, y, z - oz), 0)
            prev = (x, y, z)

malla('brillo_grietas', grietas, [M_GRIETA])

# Torres de focos del ejército, clavadas en la cresta.
def torres (bm):
    for (fx, fz) in [(-27, -50), (27, -40), (-28, -6), (28, -2)]:
        caja(bm, (fx, 15, fz), (0.8, 30, 0.8), 0, 0)
        caja(bm, (fx, 30, fz), (5.2, 3.2, 0.6), 0, 0)
malla('torres', torres, [M_METAL])
for i, (fx, fz) in enumerate([(-27, -50), (27, -40), (-28, -6), (28, -2)]):
    panel_foco(i, (fx, 30, fz), mat=M_FOCO)

# La nodriza, estrellada de canto en la ladera de la derecha y medio enterrada.
modelo('nave-nodriza.glb', 'nodriza', 44, (23, -1.5, -66), giro=0.7, inclina=(0.42, 0.3), caras=4000)
# Restos de un platillo en la ladera izquierda.
modelo('nave-platillo.glb', 'platillo_roto', 9, (-19, 2.5, -34), giro=2.1, inclina=(-0.6, 0.3), caras=2000)
# Dos platillos vivos dando vueltas por encima (el juego los mueve).
modelo('nave-platillo.glb', 'platillo_0', 7, (-20, 30, -60), caras=2000)
modelo('nave-platillo.glb', 'platillo_1', 6, (22, 36, -74), caras=2000)

# Chatarra de la caída por la ladera de la nodriza.
def chatarra (bm):
    for _ in range(26):
        k = random.randint(N * 3 // 4 - 10, N * 3 // 4 + 26) % N
        d = random.uniform(1, 9)
        x, z = punto(d, k)
        if x < 4:
            continue
        caja(bm, (x, alto(d, k) + 0.3, z), (random.uniform(0.8, 2.6), random.uniform(0.3, 1.2), random.uniform(0.8, 2.2)),
             random.uniform(0, 6.28), 0, random.uniform(-0.5, 0.5))
malla('chatarra', chatarra, [M_METAL])

# Público por las laderas, de pie y mirando al campo; nadie en la zona de la nave.
sitios = []
for k in range(N):
    if not visible(k):
        continue
    for d in (3.0, 5.2, 7.4, 9.6, 11.8):
        if random.random() < 0.42:
            continue
        x, z = punto(d + random.uniform(-0.6, 0.6), k)
        if z > 6:
            continue
        if x > 7 and -80 < z < -42:
            continue
        sitios.append((x, alto(d, k) - 0.1, z, 0, ZC))
publico(sitios)

exportar('arena-crater')
vistas('crater', 0x1a0f1e)
