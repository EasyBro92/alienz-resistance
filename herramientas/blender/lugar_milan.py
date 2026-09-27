# Milán: la Piazza del Duomo, hecha en Blender.
#
# Isidro, 27/09/2026, con dos fotos de la plaza delante: «recrea el mapa de
# Milán con el Duomo al lado derecho y que los enemigos vengan debajo del arco,
# que no vengan en naves: tienen que ir apareciendo del fondo del arco hacia
# mí». El arco es el de la Galleria Vittorio Emanuele II.
#
#   blender -b -P herramientas/blender/lugar_milan.py -- [--vista]
#
# Deja `public/models/lugar-milan.glb` y, con --vista, tres fotos en
# `herramientas/blender/vistas/`: la cámara del juego, el plano del Duomo con el
# que empieza la llegada y una general.
#
# Cómo está puesto, mirando desde donde juega el jugador (hacia el norte):
#
#   · al fondo, la fachada de la Galleria con su ARCO en el eje de los carriles.
#     Por ahí salen los bichos: nacen dentro de la galería, entre los
#     escaparates, y salen andando por debajo del arco. El hueco mide 16 de
#     ancho, y los cinco carriles con el bicho más ancho ocupan ±7.
#   · a la derecha, el Duomo, girado para dar la cara a la plaza. Es lo que
#     enseña el vuelo de llegada; jugando queda fuera del cuadro, como cuando
#     uno está en la plaza mirando al arco.
#   · a la izquierda, los palazzi de los pórticos.
#   · el suelo, la lastra gris con las líneas blancas.
#
# Coordenadas: las del JUEGO (x a la derecha, y arriba, z hacia la cámara; la
# base del jugador está en z = 4). `P()` las pasa a Blender. Nada macizo puede
# entrar en el pasillo de los bichos: ±7,4 entre z = -60 y 5, de 0,35 a 4 de
# alto. El guion lo comprueba antes de exportar y se niega si algo entra.

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import P, empezar, lin, material, malla, quad, caja, cilindro, exportar, ARGS, VISTAS
import bpy, bmesh
from mathutils import Vector

esc = empezar(27)

# --- materiales ----------------------------------------------------------------------
# Colores sacados de las fotos: la lastra gris con líneas blancas, la piedra
# crema de la Galleria, el mármol de Candoglia del Duomo (blanco con un punto
# rosado) y el bronce verde oscuro de sus puertas.
M = {}
def mat (clave, *a, **k):
    M[clave] = material(clave, *a, **k)
    return M[clave]

mat('lastra', 0x8e8983, 0.85)
mat('linea', 0xebe6dc, 0.8)
mat('galleria', 0xe3cda2, 0.85)
mat('galleria-claro', 0xf0e0c3, 0.8)
mat('galleria-sombra', 0xb9a07a, 0.9)
mat('hueco', 0x2b2621, 0.95)
mat('mosaico', 0xb49872, 0.7)
mat('vidrio', 0xc9d7d6, 0.2, metal=0.4)
mat('hierro', 0x33332f, 0.6, metal=0.5)
mat('portici', 0xdcc7a0, 0.88)
mat('portici-sombra', 0xb7a17d, 0.9)
mat('tejado', 0x6a645c, 0.9)
mat('marmol', 0xf4ebe1, 0.7)
mat('marmol-sombra', 0xe0d2c3, 0.8)
mat('puerta', 0x2e4a3b, 0.6, metal=0.3)
mat('vidriera', 0x39404a, 0.3)
# Lo que brilla se llama brillo-*: el juego apaga la emisión de todo lo demás.
mat('brillo-escaparate', 0xffd08a, 0.5, emision=0xffb85a, fuerza=2.4)
mat('brillo-ventana', 0xf0c27e, 0.6, emision=0xf7c47a, fuerza=1.0)
mat('brillo-farol', 0xffe2a0, 0.4, emision=0xffd27a, fuerza=3.0)
mat('brillo-oro', 0xd9a93c, 0.35, emision=0xc9922b, fuerza=0.7, metal=0.6)

def indices (*claves):
    # Para `malla()`: la lista de materiales y un dict clave → índice.
    return [M[c] for c in claves], {c: i for i, c in enumerate(claves)}

# --- piezas ----------------------------------------------------------------------------
def prisma (bm, pts, w0, w1, aJuego, m):
    # Un polígono convexo (u, y) extruido de w0 a w1.
    a = [bm.verts.new(aJuego(u, y, w0)) for u, y in pts]
    b = [bm.verts.new(aJuego(u, y, w1)) for u, y in pts]
    for cara in (a, b[::-1]):
        f = bm.faces.new(cara)
        f.material_index = m
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new([a[i], a[j], b[j], b[i]])
        f.material_index = m

def muro_con_arcos (bm, aJuego, u0, u1, alto, w0, w1, arcos, m, m_intrados, n=12):
    # Un muro de u0 a u1 y de 0 a `alto`, grueso de w0 a w1, con huecos de arco
    # de medio punto: `arcos` = [(u_centro, radio, y_arranque), ...].
    arcos = sorted(arcos)
    macizos = []
    u = u0
    for uc, r, ya in arcos:
        if uc - r > u + 1e-4:
            macizos.append((u, uc - r))
        u = uc + r
    if u1 > u + 1e-4:
        macizos.append((u, u1))
    J = lambda u, y, w: aJuego(u, y, w)
    for w in (w0, w1):
        for a, b in macizos:
            quad(bm, J(a, 0, w), J(b, 0, w), J(b, alto, w), J(a, alto, w), m)
        for uc, r, ya in arcos:
            for i in range(n):
                t0 = math.pi - math.pi * i / n
                t1 = math.pi - math.pi * (i + 1) / n
                p0 = (uc + r * math.cos(t0), ya + r * math.sin(t0))
                p1 = (uc + r * math.cos(t1), ya + r * math.sin(t1))
                quad(bm, J(p0[0], p0[1], w), J(p1[0], p1[1], w), J(p1[0], alto, w), J(p0[0], alto, w), m)
    for uc, r, ya in arcos:
        # Las jambas y el intradós, que es lo que da grosor al hueco.
        for s in (-1, 1):
            quad(bm, J(uc + s * r, 0, w0), J(uc + s * r, ya, w0), J(uc + s * r, ya, w1), J(uc + s * r, 0, w1), m_intrados)
        for i in range(n):
            t0 = math.pi - math.pi * i / n
            t1 = math.pi - math.pi * (i + 1) / n
            p0 = (uc + r * math.cos(t0), ya + r * math.sin(t0))
            p1 = (uc + r * math.cos(t1), ya + r * math.sin(t1))
            quad(bm, J(p0[0], p0[1], w0), J(p1[0], p1[1], w0), J(p1[0], p1[1], w1), J(p0[0], p0[1], w1), m_intrados)
    quad(bm, J(u0, alto, w0), J(u1, alto, w0), J(u1, alto, w1), J(u0, alto, w1), m)
    for u in (u0, u1):
        quad(bm, J(u, 0, w0), J(u, alto, w0), J(u, alto, w1), J(u, 0, w1), m)

def caja_uvw (bm, aJuego, u0, u1, y0, y1, w0, w1, m):
    # Una caja alineada con los ejes del marco local (u, y, w).
    prisma(bm, [(u0, y0), (u1, y0), (u1, y1), (u0, y1)], w0, w1, aJuego, m)

def pinaculo (bm, aJuego, u, y, w, r, alto, m, lados=4, remate=None):
    # Una aguja: pirámide fina, con una bolita arriba si se le pide.
    base = []
    for i in range(lados):
        a = 2 * math.pi * i / lados + math.pi / lados
        base.append(bm.verts.new(aJuego(u + math.cos(a) * r, y, w + math.sin(a) * r)))
    punta = bm.verts.new(aJuego(u, y + alto, w))
    for i in range(lados):
        f = bm.faces.new([base[i], base[(i + 1) % lados], punta])
        f.material_index = m
    if remate is not None:
        rr = r * 0.9
        pinaculo(bm, aJuego, u, y + alto - rr * 0.2, w, rr * 0.6, rr * 1.4, remate, 4)

JUEGO = lambda u, y, w: P(u, y, w)          # marco = el del juego (u = x, w = z)

# --- las medidas de la Galleria, que usan también el suelo y los pórticos ---
# OJO CON LA Z DEL ARCO. Estaba en -60 y jugando no se veía: con la cámara del
# juego, a esa distancia lo que queda por debajo del marcador son los primeros
# 66 cm de lo que haya. A -40 quedan cuatro metros por debajo del marcador y
# trece hasta el borde de arriba, y los bichos, que nacen dentro de la galería,
# recorren lo mismo que en cualquier otro mapa (salen de -44 en los demás).
GAL_Z0, GAL_Z1 = -40.0, -48.0          # cara delantera y trasera del cuerpo del arco
GAL_X = 14.0                            # medio ancho de la fachada
# Y el arranque, a 10,5 y no a 14: el borde de arriba de la pantalla corta a
# unos 13,6 de alto a esa distancia, así que arrancando a 14 la curva no se veía
# NUNCA jugando y el arco era un pasillo entre dos muros.
ARCO_R, ARCO_Y = 8.0, 10.5              # hueco de 16 de ancho, arranca a 10,5 y remata a 18,5
GAL_ALTO = 30.0
GAL_FIN = -112.0                        # fondo de la galería

# ======================================================================================
# 1. EL SUELO: lastra gris y las líneas blancas
# ======================================================================================
def suelo (bm):
    i = IDX_SUELO
    quad(bm, P(-44, 0, 30), P(50, 0, 30), P(50, 0, -70), P(-44, 0, -70), i['lastra'])
    # Dentro de la galería, el mosaico.
    quad(bm, P(-7.9, 0.01, GAL_Z0), P(7.9, 0.01, GAL_Z0), P(7.9, 0.01, GAL_FIN), P(-7.9, 0.01, GAL_FIN), i['mosaico'])
    # Las líneas: la retícula grande y un rombo inscrito en cada tramo del
    # centro, que es el dibujo que se ve en la foto delante del Duomo.
    Y = 0.025
    G = 0.18
    def linea (x0, z0, x1, z1):
        dx, dz = x1 - x0, z1 - z0
        L = math.hypot(dx, dz)
        nx, nz = -dz / L * G, dx / L * G
        quad(bm, P(x0 + nx, Y, z0 + nz), P(x1 + nx, Y, z1 + nz), P(x1 - nx, Y, z1 - nz), P(x0 - nx, Y, z0 - nz), i['linea'])
    for x in (-15.5, -8.6, 8.6, 15.5):
        linea(x, 22, x, GAL_Z0 + 0.4)
    for z in (GAL_Z0 + 0.4, -28, -16, -4, 8, 20):
        linea(-16.8, z, 15.5, z)
    for z0, z1 in ((GAL_Z0 + 0.4, -28), (-16, -4), (8, 20)):
        zm = (z0 + z1) / 2
        linea(0, z0, 8.6, zm); linea(8.6, zm, 0, z1); linea(0, z1, -8.6, zm); linea(-8.6, zm, 0, z0)
    for z0, z1 in ((-28, -16), (-4, 8)):
        linea(-8.6, z0, 8.6, z1); linea(8.6, z0, -8.6, z1)

MATS_SUELO, IDX_SUELO = indices('lastra', 'linea', 'mosaico')
o_suelo = malla('suelo', suelo, MATS_SUELO)

# ======================================================================================
# 2. LA GALLERIA: la fachada del arco de triunfo y la galería de dentro
# ======================================================================================

def galleria (bm):
    i = IDX_GAL
    # El cuerpo con el hueco del arco.
    muro_con_arcos(bm, JUEGO, -GAL_X, GAL_X, GAL_ALTO, GAL_Z0, GAL_Z1, [(0, ARCO_R, ARCO_Y)], i['galleria'], i['galleria-sombra'], n=16)
    # Las columnas pareadas a cada lado del arco, con su plinto y su capitel.
    for s in (-1, 1):
        for x in (9.8, 12.6):
            caja(bm, (s * x, 0.7, GAL_Z0 + 0.9), (1.9, 1.4, 1.9), 0, i['galleria-claro'])
            cilindro(bm, (s * x, 1.4, GAL_Z0 + 0.9), 0.62, 18.8, 12, i['galleria-claro'])
            caja(bm, (s * x, 20.7, GAL_Z0 + 0.9), (1.7, 1.0, 1.7), 0, i['galleria-claro'])
    # El entablamento, corrido de lado a lado por delante de las columnas.
    caja(bm, (0, 22.1, GAL_Z0 + 0.9), (2 * GAL_X + 1.2, 1.8, 2.2), 0, i['galleria-claro'])
    # Piso de arriba: pilastras, ventanas y la cartela sobre la clave del arco.
    for s in (-1, 1):
        for x in (9.8, 12.6):
            caja(bm, (s * x, 26.1, GAL_Z0 + 0.3), (1.2, 6.2, 0.6), 0, i['galleria-claro'])
        caja(bm, (s * 11.2, 26.2, GAL_Z0 + 0.06), (1.6, 3.6, 0.12), 0, i['hueco'])
        caja(bm, (s * 4.6, 26.2, GAL_Z0 + 0.06), (2.4, 3.2, 0.12), 0, i['hueco'])
    caja(bm, (0, 25.8, GAL_Z0 + 0.15), (5.6, 2.8, 0.3), 0, i['galleria-claro'])
    # Cornisa, ático con balaustrada y las estatuas de arriba.
    caja(bm, (0, 29.6, GAL_Z0 + 0.6), (2 * GAL_X + 1.8, 1.2, 1.8), 0, i['galleria-claro'])
    caja(bm, (0, 31.2, GAL_Z0 - 0.4), (2 * GAL_X, 2.0, 1.4), 0, i['galleria'])
    for x in [k * 1.2 for k in range(-11, 12)]:
        caja(bm, (x, 30.9, GAL_Z0 + 0.3), (0.35, 1.2, 0.35), 0, i['galleria-claro'])
    for s in (-1, 1):
        for x in (9.8, 12.6):
            cilindro(bm, (s * x, 32.2, GAL_Z0 - 0.2), 0.45, 2.6, 8, i['galleria-claro'])
    # El ala izquierda hasta la esquina de los pórticos. A la derecha no hay: ahí
    # está la calle que la separa del Duomo.
    caja(bm, (-(GAL_X + 1.5), GAL_ALTO / 2 - 1, (GAL_Z0 + GAL_Z1) / 2), (3, GAL_ALTO - 2, GAL_Z0 - GAL_Z1), 0, i['galleria'])

def galeria_dentro (bm):
    # Lo de detrás del arco, que es por donde vienen: dos muros de escaparates
    # iluminados y la bóveda de cristal y hierro. Llega hasta la niebla.
    i = IDX_DENTRO
    Z0, Z1 = GAL_Z1, GAL_FIN
    # El fondo, cerrado: abierta, al final se veía el cielo y la galería parecía
    # una calle entre dos casas. Es el otro arco, el de la Piazza della Scala,
    # con su luz dentro.
    caja(bm, (0, 10, Z1 - 0.6), (18, 20, 1.2), 0, i['galleria'])
    caja(bm, (0, 4.2, Z1 + 0.05), (7, 8.4, 0.1), 0, i['brillo-escaparate'])
    for s in (-1, 1):
        caja(bm, (s * 8.6, 10, (Z0 + Z1) / 2), (1.2, 20, Z0 - Z1), 0, i['galleria'])
        caja(bm, (s * 8.05, 19.6, (Z0 + Z1) / 2), (0.3, 0.8, Z0 - Z1), 0, i['galleria-claro'])
        z = Z0 - 3
        while z > Z1 + 3:
            # Escaparate de la planta baja, con su arco de piedra encima.
            caja(bm, (s * 7.96, 3.2, z), (0.1, 5.2, 4.2), 0, i['brillo-escaparate'])
            caja(bm, (s * 7.9, 6.2, z), (0.25, 0.6, 5.2), 0, i['galleria-claro'])
            for y in (9.5, 14.2):
                caja(bm, (s * 7.96, y, z - 1.2), (0.1, 2.4, 1.2), 0, i['brillo-ventana'])
                caja(bm, (s * 7.96, y, z + 1.2), (0.1, 2.4, 1.2), 0, i['brillo-ventana'])
            z -= 6.0
    # La bóveda: costillas de hierro cada cuatro y el vidrio entre ellas.
    R, Yb, N = 8.0, 20.0, 12
    z = Z0 - 0.5
    arcos = []
    while z > Z1:
        arcos.append(z)
        z -= 4.0
    for zc in arcos:
        for k in range(N):
            a0 = math.pi * k / N
            a1 = math.pi * (k + 1) / N
            x0, y0 = R * math.cos(a0), Yb + R * math.sin(a0)
            x1, y1 = R * math.cos(a1), Yb + R * math.sin(a1)
            quad(bm, P(x0, y0, zc + 0.12), P(x1, y1, zc + 0.12), P(x1, y1, zc - 0.12), P(x0, y0, zc - 0.12), i['hierro'])
    for k in range(N):
        a0 = math.pi * k / N
        a1 = math.pi * (k + 1) / N
        x0, y0 = (R - 0.05) * math.cos(a0), Yb + (R - 0.05) * math.sin(a0)
        x1, y1 = (R - 0.05) * math.cos(a1), Yb + (R - 0.05) * math.sin(a1)
        quad(bm, P(x0, y0, Z0), P(x1, y1, Z0), P(x1, y1, Z1), P(x0, y0, Z1), i['vidrio'])
    # Faroles colgando en fila por el centro de la galería.
    for zc in arcos[1::2]:
        caja(bm, (0, 13.0, zc), (0.7, 1.0, 0.7), 0, i['brillo-farol'])
        caja(bm, (0, 17.5, zc), (0.06, 8.0, 0.06), 0, i['hierro'])

MATS_GAL, IDX_GAL = indices('galleria', 'galleria-claro', 'galleria-sombra', 'hueco')
o_gal = malla('galleria', galleria, MATS_GAL)
MATS_DENTRO, IDX_DENTRO = indices('galleria', 'galleria-claro', 'brillo-escaparate', 'brillo-ventana', 'hierro', 'vidrio', 'brillo-farol')
o_dentro = malla('galleria-dentro', galeria_dentro, MATS_DENTRO)

# ======================================================================================
# 3. LOS PÓRTICOS: la fila de palazzi del lado izquierdo
# ======================================================================================
PX = -17.0                               # la fachada da a la plaza en x = -17
def portici (bm):
    i = IDX_POR
    # Marco del muro: u = z (de la plaza hacia el fondo), w = x (hacia dentro).
    J = lambda u, y, w: P(w, y, u)
    tramos = [(24, 3, 24.0), (3, -18, 26.0), (-18, GAL_Z0, 23.5)]
    for z1, z0, alto in tramos:
        # Planta baja: el pórtico, arcos cada 4,2.
        largo = z1 - z0
        n = max(1, int(largo // 4.2))
        paso = largo / n
        arcos = [(z0 + paso * (k + 0.5), 1.45, 3.9) for k in range(n)]
        muro_con_arcos(bm, J, z0, z1, 6.6, PX, PX - 0.9, arcos, i['portici'], i['portici-sombra'], n=8)
        # El fondo del pórtico: muro oscuro con escaparates que brillan.
        caja(bm, (PX - 4.2, 3.3, (z0 + z1) / 2), (0.4, 6.6, largo), 0, i['portici-sombra'])
        for k in range(n):
            zc = z0 + paso * (k + 0.5)
            caja(bm, (PX - 3.95, 2.6, zc), (0.1, 3.8, paso * 0.62), 0, i['brillo-escaparate'])
        # El cuerpo de arriba, con sus cuatro plantas de ventanas.
        caja(bm, (PX - 4.6, 6.6 + (alto - 6.6) / 2, (z0 + z1) / 2), (9.2, alto - 6.6, largo), 0, i['portici'])
        for piso in range(4):
            y = 8.6 + piso * 3.8
            if y + 2 > alto - 1.5:
                break
            caja(bm, (PX + 0.06, y - 1.25, (z0 + z1) / 2), (0.16, 0.22, largo), 0, i['portici-sombra'])
            for k in range(n):
                zc = z0 + paso * (k + 0.5)
                caja(bm, (PX + 0.04, y + 0.6, zc), (0.12, 2.1, 1.25), 0, i['hueco'])
                caja(bm, (PX + 0.12, y + 1.85, zc), (0.2, 0.3, 1.7), 0, i['portici-sombra'])
        # Cornisa y tejado.
        caja(bm, (PX + 0.3, alto + 0.4, (z0 + z1) / 2), (1.4, 0.8, largo), 0, i['portici-sombra'])
        caja(bm, (PX - 5, alto + 1.4, (z0 + z1) / 2), (9.4, 1.4, largo), 0, i['tejado'])

MATS_POR, IDX_POR = indices('portici', 'portici-sombra', 'hueco', 'tejado', 'brillo-escaparate')
o_por = malla('portici', portici, MATS_POR)

# ======================================================================================
# 4. EL DUOMO
# ======================================================================================
# Se construye en su propio marco —fachada en w = 0 mirando a +w, de u = -22 a
# 22— y luego se gira para darle la cara a la plaza, como en la foto de la
# plaza al anochecer: la Galleria a la izquierda y el Duomo a la derecha.
# El extremo lejano de la fachada queda en (20, -42): a un paso de la Galleria,
# que acaba en x = 14, y fuera del cuadro del móvil mientras se juega.
DUOMO_CENTRO = (31.0, -23.0)
DUOMO_GIRO = -60.0                       # grados: la fachada mira a (-0,87, 0, +0,5)

def duomo (bm):
    i = IDX_DUO
    J = JUEGO                            # u a lo ancho, w hacia fuera de la fachada
    F0, F1 = -0.6, 0.6                   # grosor de la fachada
    # Los cinco tramos de la fachada: el central con su hastial de agujas, los
    # intermedios y los de los extremos con el remate inclinado.
    tramos = [
        [(-21, 0), (-12.5, 0), (-12.5, 23.5), (-21, 20.5)],
        [(-12.5, 0), (-4.5, 0), (-4.5, 27.5), (-12.5, 24.5)],
        [(-4.5, 0), (4.5, 0), (4.5, 30.5), (0, 37), (-4.5, 30.5)],
        [(4.5, 0), (12.5, 0), (12.5, 24.5), (4.5, 27.5)],
        [(12.5, 0), (21, 0), (21, 20.5), (12.5, 23.5)],
    ]
    for t in tramos:
        prisma(bm, t, F0, F1, J, i['marmol'])
    # Las agujitas a lo largo de los remates: lo que hace que la silueta sea la
    # de Milán y no la de una iglesia cualquiera.
    for t in tramos:
        arriba = [p for p in t if p[1] > 0]
        arriba.sort()
        for a, b in zip(arriba, arriba[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(2, int(L / 1.5))
            for k in range(1, n):
                f = k / n
                pinaculo(bm, J, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0, 0.28, 2.4, i['marmol'])
    # Los seis contrafuertes, cada uno con su linterna y su aguja grande.
    for u, alto, aguja in ((-21, 26, 8), (-12.5, 30, 10), (-4.5, 35, 12), (4.5, 35, 12), (12.5, 30, 10), (21, 26, 8)):
        caja_uvw(bm, J, u - 1.2, u + 1.2, 0, alto, F0, F1 + 1.3, i['marmol-sombra'])
        caja_uvw(bm, J, u - 1.3, u + 1.3, alto - 0.4, alto, F0 - 0.1, F1 + 1.4, i['marmol'])
        caja_uvw(bm, J, u - 0.9, u + 0.9, alto, alto + 3, F0 + 0.2, F1 + 0.9, i['marmol'])
        pinaculo(bm, J, u, alto + 3, 0.5, 0.95, aguja, i['marmol'], remate=i['brillo-oro'] if abs(u) < 5 else i['marmol'])
        for du in (-0.9, 0.9):
            pinaculo(bm, J, u + du, alto, 1.6, 0.3, 4.2, i['marmol'])
        # Estatuas en sus hornacinas, subiendo por el contrafuerte.
        y = 4.5
        while y < alto - 4:
            caja_uvw(bm, J, u - 0.45, u + 0.45, y, y + 1.9, F1 + 1.3, F1 + 1.7, i['marmol'])
            y += 4.6
    # La Virgen dorada en lo alto del hastial.
    cilindro(bm, (0, 37, 0), 0.35, 2.2, 8, i['brillo-oro'])
    # Las cinco puertas de bronce con su marco y su frontón.
    for u, ancho, alto in ((0, 4.8, 9.6), (-8.5, 3.4, 7.6), (8.5, 3.4, 7.6), (-16.75, 3.2, 7.2), (16.75, 3.2, 7.2)):
        caja_uvw(bm, J, u - ancho / 2, u + ancho / 2, 0, alto, F1, F1 + 0.08, i['puerta'])
        for s in (-1, 1):
            caja_uvw(bm, J, u + s * (ancho / 2 + 0.3) - 0.3, u + s * (ancho / 2 + 0.3) + 0.3, 0, alto + 0.6, F1, F1 + 0.5, i['marmol-sombra'])
        caja_uvw(bm, J, u - ancho / 2 - 0.6, u + ancho / 2 + 0.6, alto, alto + 0.8, F1, F1 + 0.5, i['marmol-sombra'])
        prisma(bm, [(u - ancho / 2 - 0.8, alto + 0.8), (u + ancho / 2 + 0.8, alto + 0.8), (u, alto + 2.4)], F1, F1 + 0.4, J, i['marmol-sombra'])
        # La ventana barroca de encima, con su frontón pequeño.
        vy, va, vw = (13.4, 5.6, 3.0) if u == 0 else (11.4, 4.0, 2.1)
        caja_uvw(bm, J, u - vw / 2, u + vw / 2, vy, vy + va, F1, F1 + 0.06, i['vidriera'])
        caja_uvw(bm, J, u - vw / 2 - 0.35, u + vw / 2 + 0.35, vy + va, vy + va + 0.4, F1, F1 + 0.35, i['marmol-sombra'])
        prisma(bm, [(u - vw / 2 - 0.5, vy + va + 0.4), (u + vw / 2 + 0.5, vy + va + 0.4), (u, vy + va + 1.4)], F1, F1 + 0.3, J, i['marmol-sombra'])
    # Las ventanas góticas de arriba, de punta.
    for u, y0, ancho, alto in ((0, 21.2, 4.0, 5.0), (-8.5, 18.6, 2.4, 3.4), (8.5, 18.6, 2.4, 3.4), (-16.75, 15.8, 2.0, 2.8), (16.75, 15.8, 2.0, 2.8)):
        prisma(bm, [(u - ancho / 2, y0), (u + ancho / 2, y0), (u + ancho / 2, y0 + alto), (u, y0 + alto + ancho * 0.75), (u - ancho / 2, y0 + alto)], F1, F1 + 0.06, J, i['vidriera'])
        for k in (-1, 1):
            caja_uvw(bm, J, u + k * ancho / 6 - 0.08, u + k * ancho / 6 + 0.08, y0, y0 + alto + 0.3, F1, F1 + 0.12, i['marmol'])
    # El sagrato: la plataforma de delante.
    caja_uvw(bm, J, -23, 23, 0, 0.45, F1, F1 + 4, i['marmol-sombra'])

    # El cuerpo de detrás: la nave alta y las naves laterales, con el bosque de
    # agujas sobre los contrafuertes y el cimborrio con la Madonnina.
    FONDO = -64
    prisma(bm, [(-6, 0), (6, 0), (6, 30), (0, 35.5), (-6, 30)], F0, FONDO, J, i['marmol-sombra'])
    for s in (-1, 1):
        prisma(bm, [(s * 6, 0), (s * 21, 0), (s * 21, 20), (s * 6, 24)], F0, FONDO, J, i['marmol-sombra'])
        w = F0 - 4
        while w > FONDO + 2:
            for u, y, h in ((s * 21, 20, 5.5), (s * 13.5, 22.2, 4.6), (s * 6, 30, 5.2)):
                caja_uvw(bm, J, u - 0.5, u + 0.5, y - 1.0, y + 1.2, w - 0.5, w + 0.5, i['marmol'])
                pinaculo(bm, J, u, y + 1.2, w, 0.45, h, i['marmol'])
            w -= 5.5
    TW = -44
    lados = 8
    for k in range(lados):
        a0 = 2 * math.pi * k / lados
        a1 = 2 * math.pi * (k + 1) / lados
        r = 5.4
        quad(bm, J(math.cos(a0) * r, 30, TW + math.sin(a0) * r), J(math.cos(a1) * r, 30, TW + math.sin(a1) * r),
             J(math.cos(a1) * r, 44, TW + math.sin(a1) * r), J(math.cos(a0) * r, 44, TW + math.sin(a0) * r), i['marmol'])
    pinaculo(bm, J, 0, 44, TW, 4.2, 26, i['marmol'], lados=8)
    for k in range(lados):
        a = 2 * math.pi * k / lados
        pinaculo(bm, J, math.cos(a) * 5.4, 44, TW + math.sin(a) * 5.4, 0.4, 7, i['marmol'])
    cilindro(bm, (0, 69.6, TW), 0.45, 2.8, 8, i['brillo-oro'])

MATS_DUO, IDX_DUO = indices('marmol', 'marmol-sombra', 'puerta', 'vidriera', 'brillo-oro')
o_duomo = malla('duomo', duomo, MATS_DUO)
o_duomo.location = P(DUOMO_CENTRO[0], 0, DUOMO_CENTRO[1])
o_duomo.rotation_euler = (0, 0, math.radians(DUOMO_GIRO))

# ======================================================================================
# 5. LAS FAROLAS de la plaza, con su corona de faroles
# ======================================================================================
def farolas (bm):
    i = IDX_FAR
    # A la izquierda solo una: la del fondo quedaba DENTRO de la torre alien,
    # que va en (-10,5, -35,5).
    for x, z in ((-10.2, -12), (10.2, -12), (10.2, -30)):
        cilindro(bm, (x, 0, z), 0.5, 1.3, 8, i['hierro'])
        cilindro(bm, (x, 1.3, z), 0.17, 6.8, 8, i['hierro'])
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            dx, dz = math.cos(a) * 0.9, math.sin(a) * 0.9
            caja(bm, (x + dx / 2, 7.3, z + dz / 2), (abs(dx) + 0.1, 0.1, abs(dz) + 0.1), 0, i['hierro'])
            caja(bm, (x + dx, 6.9, z + dz), (0.5, 0.8, 0.5), 0, i['brillo-farol'])
        caja(bm, (x, 8.5, z), (0.55, 0.9, 0.55), 0, i['brillo-farol'])
        pinaculo(bm, JUEGO, x, 8.95, z, 0.3, 0.6, i['hierro'])

MATS_FAR, IDX_FAR = indices('hierro', 'brillo-farol')
o_far = malla('farolas', farolas, MATS_FAR)

# ======================================================================================
# 6. COMPROBACIÓN: nada macizo dentro del pasillo de los bichos
# ======================================================================================
# Aquí los bichos no bajan de una nave, salen andando de la galería: el pasillo
# se mira hasta donde nacen, dentro de ella (la misión de campana.js los hace
# nacer entre z = -50 y -60), no solo hasta z = -52. Más al fondo no pisa nadie:
# ahí está el muro que cierra la galería.
Z_NACEN = -62.0
def pasillo_libre ():
    malos = []
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        mw = o.matrix_world
        for poly in o.data.polygons:
            pts = [mw @ o.data.vertices[v].co for v in poly.vertices]
            # Blender → juego: x = x, y = z, z = -y
            xs = [p.x for p in pts]; ys = [p.z for p in pts]; zs = [-p.y for p in pts]
            if max(ys) < 0.35 or min(ys) > 4.0:
                continue
            if max(xs) < -7.4 or min(xs) > 7.4:
                continue
            if max(zs) < Z_NACEN or min(zs) > 5:
                continue
            malos.append((o.name, round(min(xs), 2), round(max(xs), 2), round(min(zs), 1), round(max(zs), 1)))
    return malos

bpy.context.view_layer.update()
malos = pasillo_libre()
if malos:
    print('PASILLO INVADIDO:', len(malos), malos[:10])
    sys.exit(1)
print('PASILLO LIBRE')

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('TRIANGULOS', tris)

exportar('lugar-milan')

# ======================================================================================
# 7. FOTOS DE PRUEBA
# ======================================================================================
if '--vista' in ARGS:
    os.makedirs(VISTAS, exist_ok=True)
    mundo = bpy.data.worlds.new('anochecer')
    mundo.use_nodes = True
    fondo = mundo.node_tree.nodes['Background']
    fondo.inputs['Color'].default_value = (*lin(0x9db3d6), 1)
    fondo.inputs['Strength'].default_value = 0.9
    esc.world = mundo
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 50))
    sol = bpy.context.active_object
    sol.data.energy = 3.0
    sol.data.color = lin(0xffd9b0)
    sol.rotation_euler = (math.radians(58), 0, math.radians(-35))
    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    esc.collection.objects.link(cam)
    esc.camera = cam
    esc.render.engine = 'BLENDER_EEVEE'
    esc.view_settings.view_transform = 'Standard'
    def foto (archivo, pos, mira, fov, w, h):
        cam.location = P(*pos)
        d = (P(*mira) - cam.location).normalized()
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam_d.sensor_fit = 'VERTICAL'
        cam_d.angle = math.radians(fov)
        cam_d.clip_end = 400
        esc.render.resolution_x = w
        esc.render.resolution_y = h
        esc.render.filepath = os.path.join(VISTAS, archivo)
        bpy.ops.render.render(write_still=True)
    # La cámara del juego en el móvil vertical.
    foto('milan-juego.png', (0, 14.58, 22.27), (0, 0, -9), 48, 390, 844)
    # El primer plano de la llegada: el Duomo de frente, desde la plaza.
    foto('milan-duomo.png', (25, 14, 50), (31, 22, -23), 48, 390, 844)
    # Y una general desde lo alto.
    foto('milan-general.png', (-40, 70, 40), (5, 5, -45), 50, 900, 600)
