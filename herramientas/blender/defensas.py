# Las defensas de la armería, hechas en Blender.
#
# Isidro, 27/09/2026: «en la defensa, los sacos se ven poco realistas». Y no
# solo los sacos: las TRES defensas eran el mismo modelo —cinco cápsulas y un
# poste— pintado de otro color, así que la alambrada y la carga enterrada no se
# distinguían de los sacos. Acordado: rehacerlas en Blender, cada una con su
# forma.
#
#   blender -b -P herramientas/blender/defensas.py -- [--vista]
#
# Deja `public/models/defensa-sacos.glb`, `defensa-alambrada.glb` y
# `defensa-carga.glb` y, con --vista, una foto de cada una desde la cámara del
# juego en `herramientas/blender/vistas/`.
#
# Coordenadas del JUEGO, como en todo `herramientas/blender/` (`P()` las pasa a
# Blender): origen en el centro de la casilla, en el suelo; los bichos vienen de
# -z, así que el frente de cada defensa mira a -z, y la cámara la ve desde +z y
# desde arriba. Un carril mide 2,4 de ancho: cada defensa ocupa menos de 2,2.
#
# El color va en los VÉRTICES y no en materiales: así cada defensa es una sola
# malla (una llamada de dibujado) aunque cada saco tenga su tono. Solo lleva
# material aparte lo que brilla (la luz de la carga, `brillo-luz`), que el
# juego hace parpadear y no apaga al cargar.

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import P, empezar, lin, material, MODELOS, ARGS, VISTAS
import bpy, bmesh
from mathutils import Vector, noise

esc = empezar(31)

# --- piezas ---------------------------------------------------------------------------
def color_capa (bm):
    return bm.loops.layers.color.get('Col') or bm.loops.layers.color.new('Col')

def rgb (h, k=1.0):
    # En sRGB, tal cual: la capa de color de los vértices es de bytes en sRGB y el
    # exportador ya la pasa a lineal. Pasándola a lineal aquí también, salía todo
    # el doble de oscuro (los sacos, marrón chocolate).
    r, g, b = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return (min(1, r * k), min(1, g * k), min(1, b * k), 1.0)

def pintar (bm, cara, col):
    capa = color_capa(bm)
    for l in cara.loops:
        l[capa] = col

def cara (bm, vs, col, mat=0, suave=True):
    f = bm.faces.new(vs)
    f.material_index = mat
    f.smooth = suave
    pintar(bm, f, col)
    return f

def tubo (bm, pts, r, lados, col, mat=0):
    # Un tubo que sigue una lista de puntos (del juego): alambre, cables.
    anillos = []
    for k, p in enumerate(pts):
        a = pts[max(0, k - 1)]
        b = pts[min(len(pts) - 1, k + 1)]
        t = (Vector(b) - Vector(a)).normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        n1 = t.cross(ref).normalized()
        n2 = t.cross(n1).normalized()
        fila = []
        for i in range(lados):
            ang = 2 * math.pi * i / lados
            q = Vector(p) + (n1 * math.cos(ang) + n2 * math.sin(ang)) * r
            fila.append(bm.verts.new(P(q.x, q.y, q.z)))
        anillos.append(fila)
    for k in range(len(anillos) - 1):
        for i in range(lados):
            j = (i + 1) % lados
            cara(bm, [anillos[k][i], anillos[k][j], anillos[k + 1][j], anillos[k + 1][i]], col, mat)

def viga (bm, a, b, grueso, col, lados=6, mat=0):
    tubo(bm, [a, b], grueso, lados, col, mat)
    # Tapas: sin ellas, desde arriba se ve el hueco del palo.
    for p, q in ((a, b), (b, a)):
        t = (Vector(q) - Vector(p)).normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        n1 = t.cross(ref).normalized()
        n2 = t.cross(n1).normalized()
        vs = [bm.verts.new(P(*(Vector(p) + (n1 * math.cos(2 * math.pi * i / lados) + n2 * math.sin(2 * math.pi * i / lados)) * grueso)))
              for i in range(lados)]
        cara(bm, vs, col, mat, suave=False)

def exportar_una (o, nombre):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    salida = os.path.join(MODELOS, nombre + '.glb')
    comunes = dict(filepath=salida, export_format='GLB', use_selection=True, export_apply=True,
                   export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    # El color de los vértices: según la versión de Blender, la opción se llama
    # de una forma u otra. Sin ella el exportador lo tira si ningún material lo usa.
    for extra in (dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
        try:
            bpy.ops.export_scene.gltf(**comunes, **extra)
            break
        except TypeError:
            continue
    print('EXPORTADO', nombre, os.path.getsize(salida), 'bytes',
          sum(len(p.vertices) - 2 for p in o.data.polygons), 'triangulos')

def objeto (nombre, construir, mats):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    color_capa(bm)
    construir(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    # La capa de color tiene que ser la ACTIVA y la de pintar: si no, el
    # exportador saca una blanca de relleno como COLOR_0 y la buena como COLOR_1,
    # y el juego solo mira la primera (salían blancas).
    ca = me.color_attributes.get('Col')
    if ca:
        me.color_attributes.active_color = ca
        me.color_attributes.render_color_index = me.color_attributes.find('Col')
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(nombre, me)
    esc.collection.objects.link(o)
    return o

# Un solo material para todo lo que no brilla: el color lo ponen los vértices.
# Rugoso: arpillera, tierra, madera y hierro viejo no brillan.
base = material('defensa', 0xffffff, 0.92)
def usar_color_vertice (m):
    # Para que Blender lo pinte en las fotos de prueba igual que el juego.
    nodos = m.node_tree.nodes
    attr = nodos.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    m.node_tree.links.new(attr.outputs['Color'], nodos['Principled BSDF'].inputs['Base Color'])
usar_color_vertice(base)
metal = material('defensa-metal', 0xffffff, 0.55, metal=0.35)
usar_color_vertice(metal)
luz = material('brillo-luz', 0xff2a1c, 0.4, emision=0xff2a1c, fuerza=6.0)

# ======================================================================================
# 1. SACOS TERREROS
# ======================================================================================
# Un parapeto de verdad: sacos de arpillera rellenos de tierra, aplastados por
# el peso de los de encima, trabados como ladrillos y en MEDIA LUNA, con la
# panza hacia los bichos. Cada saco tiene su tono (los hay de arpillera clara,
# tostada y alguno verde oliva del ejército), la base manchada de tierra, las
# arrugas de la tela y la oreja atada en una punta.
TONOS = [0xb49b6c, 0xa88f61, 0xc0a677, 0x9c8458, 0xb8a070, 0x7c7556, 0x6f6a4e]

def saco (bm, c, giro, L, H, D, tono, semilla, atado=1):
    NA, NL = 12, 7
    col_base = TONOS[tono]
    filas = []
    for j in range(NL + 1):
        t = -1 + 2 * j / NL
        # Las puntas redondas y un poco más estrechas: un saco lleno no es una
        # caja, se abomba en medio.
        f = max(0.22, (1 - abs(t) ** 5) ** 0.28)
        fila = []
        for i in range(NA):
            a = 2 * math.pi * i / NA
            sy = math.copysign(abs(math.sin(a)) ** 0.62, math.sin(a))
            sz = math.copysign(abs(math.cos(a)) ** 0.62, math.cos(a))
            x = t * L / 2
            y = H / 2 * sy * f
            z = D / 2 * sz * f
            # Aplastado por abajo contra lo que tiene debajo, y panzudo arriba.
            if y < -H * 0.36:
                y = -H * 0.36 + (y + H * 0.36) * 0.25
            if sy > 0:
                y += 0.025 * (1 - t * t) * sy
            # Las arrugas de la tela.
            n = noise.noise(Vector((x * 7 + semilla, y * 9, z * 7 - semilla)))
            y += n * 0.012
            z += n * 0.014 * sz
            # Al sitio: girado en y y colocado.
            ca, sa = math.cos(giro), math.sin(giro)
            gx = c[0] + x * ca + z * sa
            gz = c[2] - x * sa + z * ca
            v = bm.verts.new(P(gx, c[1] + H * 0.36 + y, gz))
            fila.append((v, sy, n))
        filas.append(fila)
    for j in range(NL):
        for i in range(NA):
            k = (i + 1) % NA
            ps = [filas[j][i], filas[j][k], filas[j + 1][k], filas[j + 1][i]]
            sy = sum(p[1] for p in ps) / 4
            n = sum(p[2] for p in ps) / 4
            # Más oscuro abajo (tierra, sombra) y en las puntas (la costura).
            k_luz = 0.78 + 0.22 * (sy + 1) / 2 + n * 0.25
            if j in (0, NL - 1):
                k_luz *= 0.86
            cara(bm, [p[0] for p in ps], rgb(col_base, k_luz))
    # Cierres de las dos puntas.
    for j, sentido in ((0, -1), (NL, 1)):
        centro_x = sentido * L / 2 * 1.02
        ca, sa = math.cos(giro), math.sin(giro)
        cv = bm.verts.new(P(c[0] + centro_x * ca, c[1] + H * 0.36, c[2] - centro_x * sa))
        for i in range(NA):
            k = (i + 1) % NA
            vs = [filas[j][i][0], filas[j][k][0], cv] if sentido > 0 else [filas[j][k][0], filas[j][i][0], cv]
            cara(bm, vs, rgb(col_base, 0.8))
    # La oreja atada: la tela sobrante de la boca del saco, fruncida.
    if atado:
        ca, sa = math.cos(giro), math.sin(giro)
        px = atado * L / 2
        base_c = (c[0] + px * ca, c[1] + H * 0.4, c[2] - px * sa)
        punta = (c[0] + (px + atado * 0.1) * ca, c[1] + H * 0.52, c[2] - (px + atado * 0.1) * sa)
        vb = [bm.verts.new(P(base_c[0] + math.cos(a) * 0.05 * sa, base_c[1] + math.sin(a) * 0.05, base_c[2] + math.cos(a) * 0.05 * ca))
              for a in [2 * math.pi * q / 5 for q in range(5)]]
        vp = bm.verts.new(P(*punta))
        for q in range(5):
            cara(bm, [vb[q], vb[(q + 1) % 5], vp], rgb(col_base, 0.72))

def sacos (bm):
    random.seed(7)
    L, H, D = 0.56, 0.25, 0.36
    R = 2.4                      # radio de la media luna
    PASO = 0.2                   # lo que sube cada hilada, ya aplastada
    hiladas = [
        [-0.78, -0.26, 0.26, 0.78],
        [-0.52, 0.0, 0.52],
        [-0.78, -0.26, 0.26, 0.78],
        [-0.4, 0.14, 0.62],
    ]
    for k, xs in enumerate(hiladas):
        for x in xs:
            x += random.uniform(-0.03, 0.03)
            fi = x / R
            cx = R * math.sin(fi)
            cz = R - R * math.cos(fi) + random.uniform(-0.03, 0.03)
            giro = -fi + random.uniform(-0.09, 0.09)
            esc_ = random.uniform(0.94, 1.06)
            # Casi todos de arpillera; alguno suelto verde oliva, del ejército.
            tono = random.choice([0, 1, 2, 3, 4, 0, 2, 4, 1, 5])
            saco(bm, (cx, k * PASO, cz), giro, L * esc_, H, D, tono, random.uniform(0, 50),
                 atado=random.choice([1, -1, 0]))
    # Detrás, la segunda fila de la base: un parapeto de una sola hilada de
    # fondo se caería, y desde la cámara (que lo ve por detrás) se nota.
    for x in (-0.5, 0.02, 0.54):
        fi = x / R
        cx = R * math.sin(fi)
        cz = R - R * math.cos(fi) + 0.36
        saco(bm, (cx, 0, cz), -fi + random.uniform(-0.1, 0.1), L, H * 0.95, D, random.choice([1, 3, 0]),
             random.uniform(0, 50), atado=0)

o_sacos = objeto('defensa-sacos', sacos, [base])
# Suavizado: con las caras planas cada saco se veía hecho de tablas.
o_sacos.data.shade_smooth()

# ======================================================================================
# 2. ALAMBRADA
# ======================================================================================
# Caballos de frisa: una viga de madera a lo largo del carril con tres aspas de
# estacas cruzadas, y la concertina de espino enrollada alrededor, con sus
# púas. Es lo que se reconoce de un vistazo como «alambrada de trinchera».
MADERA = [0x5d4833, 0x6b5339, 0x4f3d2b]
ESPINO = 0x8f959b

def alambrada (bm):
    random.seed(11)
    Y = 0.46
    viga(bm, (-1.0, Y, 0), (1.0, Y, 0), 0.07, rgb(MADERA[0]))
    for x in (-0.82, 0.0, 0.82):
        for s in (-1, 1):
            a = math.radians(48)
            d = (0, math.sin(a) * 0.62, s * math.cos(a) * 0.62)
            viga(bm, (x, Y - d[1], -d[2]), (x, Y + d[1], d[2]), 0.045, rgb(random.choice(MADERA)))
    # La concertina: una espiral de alambre alrededor de la viga, algo aplastada
    # y con los bucles abiertos al azar, como la de verdad.
    pts = []
    vueltas, por_vuelta = 15, 12
    for k in range(vueltas * por_vuelta + 1):
        u = k / por_vuelta
        a = 2 * math.pi * u
        r = 0.36 + 0.03 * math.sin(u * 2.3)
        pts.append((-0.98 + 1.96 * k / (vueltas * por_vuelta), Y + math.sin(a) * r * 0.92, math.cos(a) * r))
    tubo(bm, pts, 0.011, 3, rgb(ESPINO))
    # Las púas: una cada pocos tramos, dos pinchos cruzados.
    for k in range(0, len(pts), 3):
        p = Vector(pts[k])
        for dx, dy, dz in ((0.045, 0.03, 0.02), (-0.03, 0.045, -0.03)):
            a_ = p + Vector((dx, dy, dz))
            b_ = p - Vector((dx, dy, dz))
            tubo(bm, [tuple(a_), tuple(b_)], 0.006, 3, rgb(ESPINO, 0.8))
    # Dos alambres tensos de punta a punta de las aspas.
    for yy, zz in ((Y + 0.46, 0.41), (Y + 0.46, -0.41)):
        tubo(bm, [(-0.9, yy, zz), (0.9, yy, zz)], 0.008, 3, rgb(ESPINO, 0.9))

o_alambrada = objeto('defensa-alambrada', alambrada, [metal])

# ======================================================================================
# 3. CARGA ENTERRADA
# ======================================================================================
# Una mina contracarro (la redonda, verde oliva, con la espoleta en el centro)
# medio enterrada en un montón de tierra removida, otras dos más pequeñas
# asomando a los lados, y un cable que va a un detonador con su luz roja. La
# luz es lo que se lee desde lejos: parpadea (lo hace el juego).
# Tierra removida, más clara que el asfalto: si no, la carga era una mancha oscura.
TIERRA = [0x7a6246, 0x8a7050, 0x6a553c]
OLIVA = 0x4d5537

def montículo (bm, cx, cz, r, alto, semilla):
    NA, NR = 16, 4
    centro = bm.verts.new(P(cx, alto, cz))
    anillos = []
    for k in range(1, NR + 1):
        fr = k / NR
        fila = []
        for i in range(NA):
            a = 2 * math.pi * i / NA
            rr = r * fr * (1 + 0.12 * noise.noise(Vector((math.cos(a) * 2 + semilla, math.sin(a) * 2, fr))))
            y = alto * (1 - fr ** 2) + 0.015 * noise.noise(Vector((a * 3, fr * 5, semilla)))
            fila.append(bm.verts.new(P(cx + math.cos(a) * rr, max(0.005, y), cz + math.sin(a) * rr)))
        anillos.append(fila)
    for i in range(NA):
        cara(bm, [centro, anillos[0][(i + 1) % NA], anillos[0][i]], rgb(TIERRA[1], 1.05))
    for k in range(NR - 1):
        for i in range(NA):
            j = (i + 1) % NA
            cara(bm, [anillos[k][i], anillos[k][j], anillos[k + 1][j], anillos[k + 1][i]],
                 rgb(TIERRA[k % 3], 1 - 0.06 * k))

def disco (bm, cx, cy, cz, r, alto, lados, col, tapa_col=None, inclina=0.0):
    abajo, arriba = [], []
    for i in range(lados):
        a = 2 * math.pi * i / lados
        x, z = math.cos(a) * r, math.sin(a) * r
        # Inclinado un poco hacia la cámara: medio desenterrado, no plano.
        abajo.append(bm.verts.new(P(cx + x, cy + z * math.sin(inclina), cz + z * math.cos(inclina))))
        arriba.append(bm.verts.new(P(cx + x, cy + alto + z * math.sin(inclina), cz + z * math.cos(inclina))))
    for i in range(lados):
        j = (i + 1) % lados
        cara(bm, [abajo[i], abajo[j], arriba[j], arriba[i]], col, suave=False)
    cara(bm, arriba, tapa_col or col, suave=False)

def carga (bm):
    random.seed(19)
    montículo(bm, 0, 0.05, 0.78, 0.2, 1.3)
    # La grande en el centro, y la espoleta.
    disco(bm, 0, 0.1, 0.05, 0.33, 0.13, 18, rgb(OLIVA), rgb(OLIVA, 1.12), inclina=0.12)
    disco(bm, 0, 0.23, 0.07, 0.1, 0.05, 10, rgb(0x3c4230), rgb(0x8f8a70))
    # La franja amarilla del canto, la de las minas de verdad: es lo que hace que
    # se lea como una mina y no como una tapa de alcantarilla.
    disco(bm, 0, 0.165, 0.05, 0.338, 0.03, 18, rgb(0xd1a526), inclina=0.12)
    # Las dos pequeñas, más hundidas.
    for x, z in ((-0.62, 0.22), (0.6, -0.18)):
        montículo(bm, x, z, 0.36, 0.1, x)
        disco(bm, x, 0.05, z, 0.19, 0.08, 14, rgb(OLIVA, 0.92), rgb(OLIVA, 1.05), inclina=0.2)
    # El detonador: una caja con su antena, hacia la cámara, y el cable.
    bx, bz = 0.7, 0.48
    caja_c = [(bx - 0.1, 0, bz - 0.07), (bx + 0.1, 0.12, bz + 0.07)]
    lo, hi = caja_c
    vs = [bm.verts.new(P(x, y, z)) for y in (lo[1], hi[1]) for (x, z) in ((lo[0], lo[2]), (hi[0], lo[2]), (hi[0], hi[2]), (lo[0], hi[2]))]
    d, u = vs[:4], vs[4:]
    gris = rgb(0x3b3e3a)
    cara(bm, u, rgb(0x4a4e48), suave=False)
    for i in range(4):
        j = (i + 1) % 4
        cara(bm, [d[i], d[j], u[j], u[i]], gris, suave=False)
    tubo(bm, [(bx - 0.06, 0.12, bz), (bx - 0.06, 0.34, bz)], 0.008, 3, gris)
    tubo(bm, [(0.2, 0.16, 0.2), (0.38, 0.05, 0.36), (0.55, 0.03, 0.44), (bx - 0.1, 0.05, bz)], 0.014, 4, rgb(0x2a2a28))

def luz_carga (bm):
    # Aparte, con su material: es lo único que brilla y parpadea.
    bx, bz = 0.7, 0.48
    for x in (bx + 0.03,):
        lo, hi = (x - 0.035, 0.12, bz - 0.035), (x + 0.035, 0.17, bz + 0.035)
        vs = [bm.verts.new(P(xx, y, zz)) for y in (lo[1], hi[1]) for (xx, zz) in ((lo[0], lo[2]), (hi[0], lo[2]), (hi[0], hi[2]), (lo[0], hi[2]))]
        d, u = vs[:4], vs[4:]
        blanco = (1, 1, 1, 1)
        cara(bm, u, blanco, suave=False)
        for i in range(4):
            j = (i + 1) % 4
            cara(bm, [d[i], d[j], u[j], u[i]], blanco, suave=False)

o_carga = objeto('defensa-carga', carga, [base])
o_luz = objeto('brillo-luz', luz_carga, [luz])

# ======================================================================================
# 4. ERIZOS CHECOS
# ======================================================================================
# Tres vigas de acero en L cruzadas por el medio, cada una perpendicular a las
# otras dos, y apoyadas en tres puntas: el obstáculo de las playas de
# Normandía. No paran a nadie —se pasa entre ellos—, pero frenan. Dos, uno al
# lado del otro, algo girados.
from mathutils import Quaternion, Matrix
ACERO = [0x5f5851, 0x6a625a, 0x544e48]
OXIDO = 0x86512f

def caja_ejes (bm, c, u, v, w, mu, mv, mw, col, mat=0):
    # Caja orientada por tres ejes (vectores unitarios del juego) y sus medidas.
    esquinas = []
    for sv in (-1, 1):
        for su, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            p = Vector(c) + u * (su * mu / 2) + v * (sv * mv / 2) + w * (sw * mw / 2)
            esquinas.append(bm.verts.new(P(p.x, p.y, p.z)))
    d, a = esquinas[:4], esquinas[4:]
    cara(bm, d[::-1], col, mat, suave=False)
    cara(bm, a, col, mat, suave=False)
    for i in range(4):
        j = (i + 1) % 4
        cara(bm, [d[i], d[j], a[j], a[i]], col, mat, suave=False)

def erizo (bm, cx, cz, largo, giro, semilla):
    random.seed(semilla)
    # El giro que pone la diagonal (1, 1, 1) en vertical: así se apoya en tres
    # puntas y las otras tres miran arriba.
    q = Vector((1, 1, 1)).normalized().rotation_difference(Vector((0, 1, 0)))
    qy = Quaternion(Vector((0, 1, 0)), giro)
    alto = largo / 2 / math.sqrt(3) + 0.02
    c = Vector((cx, alto, cz))
    for k, e in enumerate(((1, 0, 0), (0, 1, 0), (0, 0, 1))):
        eje = qy @ (q @ Vector(e))
        otro = qy @ (q @ Vector(((0, 1, 0), (0, 0, 1), (1, 0, 0))[k]))
        tercero = eje.cross(otro).normalized()
        col = rgb(random.choice(ACERO), random.uniform(0.9, 1.08))
        # La L: dos alas finas que forman el ángulo.
        caja_ejes(bm, c + otro * 0.045, eje, otro, tercero, largo, 0.09, 0.022, col)
        caja_ejes(bm, c + tercero * 0.045, eje, otro, tercero, largo, 0.022, 0.09, col)
        # Óxido en las puntas: un tramo corto de otro color en cada extremo.
        for s in (-1, 1):
            caja_ejes(bm, c + eje * s * (largo / 2 - 0.08) + otro * 0.046, eje, otro, tercero, 0.14, 0.094, 0.026, rgb(OXIDO))

def erizos (bm):
    erizo(bm, -0.55, 0.05, 1.25, 0.35, 3)
    erizo(bm, 0.58, -0.08, 1.2, -0.5, 4)

o_erizos = objeto('defensa-erizos', erizos, [metal])

# ======================================================================================
# 5. TORRETA AUTOMÁTICA
# ======================================================================================
# Un nido de sacos en herradura (abierto por detrás, hacia la cámara) con una
# ametralladora de dos cañones sobre un pedestal. El CABEZAL es una pieza
# aparte con el origen en su eje: el juego lo gira hacia el blanco. La BOCA es
# un punto vacío colgado del cabezal, donde el juego pone el fogonazo.
# Tiene un ojo que brilla (`brillo-ojo`): es lo que dice que va sola.
PIVOTE = (0.0, 0.66, 0.0)
ojo = material('brillo-ojo', 0x6ef0ff, 0.3, emision=0x6ef0ff, fuerza=5.0)

def torreta_base (bm):
    random.seed(23)
    R = 0.62
    for k in range(7):
        a = math.radians(-160 + k * 40)            # herradura: abierta hacia +z
        cx, cz = math.sin(a) * R, -math.cos(a) * R
        saco(bm, (cx, 0, cz), -a + math.pi / 2 + random.uniform(-0.1, 0.1), 0.44, 0.2, 0.28,
             random.choice([0, 1, 2, 4]), random.uniform(0, 50), atado=0)
    for k in range(5):
        a = math.radians(-120 + k * 60)
        cx, cz = math.sin(a) * R * 0.98, -math.cos(a) * R * 0.98
        saco(bm, (cx, 0.16, cz), -a + math.pi / 2 + random.uniform(-0.1, 0.1), 0.42, 0.19, 0.27,
             random.choice([0, 2, 3, 5]), random.uniform(0, 50), atado=0)
    # El pedestal y sus tres patas.
    hierro = rgb(0x3a3d3f)
    viga(bm, (0, 0.02, 0), (0, PIVOTE[1], 0), 0.06, hierro, 8, mat=1)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        viga(bm, (0, 0.34, 0), (math.cos(a) * 0.32, 0.01, math.sin(a) * 0.32), 0.028, hierro, 5, mat=1)

def torreta_cabezal (bm):
    oliva = rgb(0x58624b)
    oscuro = rgb(0x2c2f30)
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    # El cuerpo, con la placa de blindaje delantera inclinada.
    caja_ejes(bm, (0, 0.84, 0.05), X, Y, Z, 0.42, 0.3, 0.5, oliva)
    inc = Quaternion(Vector((1, 0, 0)), math.radians(-28))
    caja_ejes(bm, (0, 0.86, -0.24), X, inc @ Y, inc @ Z, 0.56, 0.42, 0.05, rgb(0x4d5641))
    # La caja de munición a un lado, con la cinta entrando.
    caja_ejes(bm, (0.3, 0.78, 0.06), X, Y, Z, 0.16, 0.2, 0.28, rgb(0x6b6a45))
    caja_ejes(bm, (0.22, 0.85, -0.05), X, Y, Z, 0.08, 0.03, 0.1, rgb(0xa08a3a))
    # Los dos cañones con su camisa, hacia -z.
    for x in (-0.09, 0.09):
        viga(bm, (x, 0.8, -0.2), (x, 0.8, -0.62), 0.05, oscuro, 8)
        viga(bm, (x, 0.8, -0.62), (x, 0.8, -0.98), 0.028, oscuro, 8)
    # El ojo: un visor encima, que brilla.
    caja_ejes(bm, (0, 1.03, -0.08), X, Y, Z, 0.16, 0.08, 0.14, oscuro)
    caja_ejes(bm, (0, 1.03, -0.152), X, Y, Z, 0.1, 0.045, 0.01, (1, 1, 1, 1), mat=1)

o_tor_base = objeto('torreta-base', torreta_base, [base, metal])
o_tor_cab = objeto('torreta-cabezal', torreta_cabezal, [metal, ojo])
# El origen del cabezal en su eje de giro.
piv = P(*PIVOTE)
o_tor_cab.data.transform(Matrix.Translation(-piv))
o_tor_cab.location = piv
o_boca = bpy.data.objects.new('torreta-boca', None)
esc.collection.objects.link(o_boca)
o_boca.parent = o_tor_cab
o_boca.location = P(0, 0.8, -1.0) - piv

# --- las tres, por separado ----------------------------------------------------------
exportar_una(o_sacos, 'defensa-sacos')
exportar_una(o_alambrada, 'defensa-alambrada')
# La carga lleva dos mallas: la de tierra y minas, y la luz.
bpy.ops.object.select_all(action='DESELECT')
o_carga.select_set(True)
o_luz.select_set(True)
bpy.context.view_layer.objects.active = o_carga
salida = os.path.join(MODELOS, 'defensa-carga.glb')
for extra in (dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_apply=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, **extra)
        break
    except TypeError:
        continue
print('EXPORTADO defensa-carga', os.path.getsize(salida), 'bytes',
      sum(len(p.vertices) - 2 for p in o_carga.data.polygons), 'triangulos')

# ======================================================================================
# FOTOS DE PRUEBA: las tres en fila, desde donde las ve el jugador
# ======================================================================================
exportar_una(o_erizos, 'defensa-erizos')
bpy.ops.object.select_all(action='DESELECT')
for o in (o_tor_base, o_tor_cab, o_boca):
    o.select_set(True)
bpy.context.view_layer.objects.active = o_tor_base
salida = os.path.join(MODELOS, 'defensa-torreta.glb')
for extra in (dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_apply=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, **extra)
        break
    except TypeError:
        continue
print('EXPORTADO defensa-torreta', os.path.getsize(salida), 'bytes',
      sum(len(p.vertices) - 2 for o in (o_tor_base, o_tor_cab) for p in o.data.polygons), 'triangulos')

if '--vista' in ARGS:
    os.makedirs(VISTAS, exist_ok=True)
    o_sacos.location = P(-2.4, 0, 0)
    o_carga.location = P(2.4, 0, 0)
    o_luz.location = P(2.4, 0, 0)
    o_erizos.location = P(-1.2, 0, 2.6)
    o_tor_base.location = P(1.2, 0, 2.6)
    o_tor_cab.location = P(1.2, PIVOTE[1], 2.6)
    o_tor_cab.rotation_euler = (0, 0, math.radians(20))
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    suelo = bpy.context.active_object
    suelo.data.materials.append(material('suelo', 0x7d7a74, 0.95))
    mundo = bpy.data.worlds.new('dia')
    mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin(0xb9cde0), 1)
    mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    esc.world = mundo
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 30))
    sol = bpy.context.active_object
    sol.data.energy = 3.2
    sol.rotation_euler = (math.radians(50), 0, math.radians(30))
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
        esc.render.resolution_x = w
        esc.render.resolution_y = h
        esc.render.filepath = os.path.join(VISTAS, archivo)
        bpy.ops.render.render(write_still=True)
    # Como las ve el jugador (desde detrás y arriba, 25° de picado) y de cerca.
    foto('defensas-juego.png', (0, 4.2, 7.5), (0, 0.4, 0), 30, 900, 600)
    foto('defensas-frente.png', (0, 1.6, -5.5), (0, 0.4, 0), 30, 900, 600)
