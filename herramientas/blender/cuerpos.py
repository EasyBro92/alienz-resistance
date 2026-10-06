# Los cuerpos de las cinco de la caja alienígena, hechos en Blender.
#
# Isidro, 06/10/2026: «estos personajes nuevos se sienten igual que los otros…
# hazlos más sexys y con un poco menos de ropa, como en las películas, que van
# con trajes y vestidos o como vayan». Eran el cuerpo de un soldado de Meshy con
# otra cabeza: mismo chaleco, mismas botas. Sin créditos para modelos nuevos, el
# cuerpo se hace aquí, a medida del ESQUELETO de un soldado (el del Fusilero
# chica), para que el juego lo mueva con la misma animación y las mismas manos al
# arma sin cambiar una línea.
#
#   node herramientas/cuerpos/montar.mjs --esqueleto          (una vez: dónde va cada hueso)
#   blender -b -P herramientas/blender/cuerpos.py -- [--vista] [--rapido] [clave …]
#   node herramientas/cuerpos/montar.mjs jill claire …        (mete malla y textura en el .glb)
#
# Aquí NO se exporta el .glb: el exportador de Blender rehace los huesos a su
# manera y el juego escribe en ellos dando por hechos los ejes de Meshy. Este
# guion deja en `vistas/cuerpos/` la malla (posiciones, normales, UV y pesos por
# NOMBRE de hueso) y su textura horneada, y `montar.mjs` las cambia dentro del
# .glb del soldado, que conserva esqueleto y animación byte a byte.
#
# Todo se construye en el espacio de la malla del .glb: metros, Y arriba, la cara
# hacia +Z y su izquierda en +X. El esqueleto NO está en pose de firmes: los
# antebrazos van hacia delante y la pierna izquierda abierta. Por eso cada
# miembro es un tubo que sigue SUS huesos estén como estén, y la ropa se hace con
# las mismas funciones que el cuerpo (más un margen), así que lo sigue igual.

import bpy, bmesh, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix

AQUI = os.path.dirname(os.path.abspath(__file__))
VISTAS = os.path.join(AQUI, 'vistas')
TRABAJO = os.path.join(VISTAS, 'cuerpos')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LADO_TEXTURA = 1024

with open(os.path.join(AQUI, 'cuerpos-esqueleto.json'), encoding='utf-8') as f:
    H = {n: Vector(h['pos']) for n, h in json.load(f)['huesos'].items()}
IND = {n: i for i, n in enumerate(H)}
NOMBRES = list(H)
with open(os.path.join(AQUI, 'cabezas.json'), encoding='utf-8') as f:
    CABEZAS = json.load(f)['personajes']

# --- cuentas pequeñas -----------------------------------------------------------------
def hexa (c):
    return int(c[1:], 16) if isinstance(c, str) else c

def rgb (h, k=1.0):
    h = hexa(h)
    return tuple(min(1, ((h >> s) & 255) / 255 * k) for s in (16, 8, 0)) + (1.0,)

def G (d, s):
    return math.exp(-(d / s) ** 2)

def sm (a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def curva (claves):
    # Una curva suave por los puntos (x, v1, v2…): Hermite con la pendiente de los
    # vecinos. Con tramos rectos la silueta salía a quiebros.
    xs = [c[0] for c in claves]
    vs = [np.array(c[1:], dtype=float) for c in claves]
    n = len(xs)
    ms = []
    for i in range(n):
        a, b = max(0, i - 1), min(n - 1, i + 1)
        ms.append((vs[b] - vs[a]) / (xs[b] - xs[a]))
    def f (x):
        if x <= xs[0]: return vs[0]
        if x >= xs[-1]: return vs[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x)
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        return ((2 * t ** 3 - 3 * t ** 2 + 1) * vs[i] + (t ** 3 - 2 * t ** 2 + t) * h * ms[i]
                + (-2 * t ** 3 + 3 * t ** 2) * vs[i + 1] + (t ** 3 - t ** 2) * h * ms[i + 1])
    return f

def pasar (w, nombre, f):
    # Mueve la fracción f de todo el peso al hueso `nombre`.
    r = {k: v * (1 - f) for k, v in w.items()}
    r[nombre] = r.get(nombre, 0.0) + f
    return r

def mezclar_pesos (a, b, t):
    r = {k: v * (1 - t) for k, v in a.items()}
    for k, v in b.items(): r[k] = r.get(k, 0.0) + v * t
    return r

def pasos (a, b, paso, cortes=()):
    # Las alturas (o distancias) de los anillos entre a y b, con uno exacto en cada
    # corte: ahí cambia de color una prenda pintada y el borde tiene que ser limpio.
    n = max(1, round(abs(b - a) / paso))
    ys = {round(a + (b - a) * k / n, 5) for k in range(n + 1)}
    lo, hi = min(a, b), max(a, b)
    for c in cortes:
        if lo < c < hi:
            ys = {y for y in ys if abs(y - c) > paso * 0.3} | {round(c, 5)}
    return sorted(ys, reverse=a > b)

# --- la malla: vértices con pesos, caras con color ------------------------------------
class Malla:
    def __init__ (self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new('Col')
        self.df = self.bm.verts.layers.deform.verify()

    def vert (self, pos, pesos):
        v = self.bm.verts.new(pos)
        d = v[self.df]
        for n, w in pesos.items():
            if w > 0.004: d[IND[n]] = w
        return v

    def cara (self, vs, cols, fuera=None, suave=True):
        if len(set(vs)) < 3: return None
        try: f = self.bm.faces.new(vs)
        except ValueError: return None
        f.smooth = suave
        if fuera is not None:
            f.normal_update()
            if f.normal.dot(fuera) < 0: f.normal_flip()
        m = dict(zip(vs, cols))
        for l in f.loops: l[self.col] = m[l.vert]
        return f

    def lamina (self, nu, nv, punto, color, cerrada=True, campo=None, tapas=(False, False)):
        # Una superficie en rejilla. `punto(i, j)` da (posición, pesos, centro del
        # anillo, datos); `color(p, medio)` pinta cada esquina sabiendo dónde cae
        # el CENTRO de su cara, para que una prenda acabe en una arista y no en un
        # degradado; `campo(p)` > 0 dice qué parte se queda, y los cuadros que el
        # borde cruza se recortan por donde vale cero (un escote, una raja).
        P = [[punto(i, j) for i in range(nu)] for j in range(nv)]
        val = [[campo(p) for p in fila] for fila in P] if campo else None
        vs = {}
        def v (j, i):
            if (j, i) not in vs: vs[(j, i)] = self.vert(P[j][i][0], P[j][i][1])
            return vs[(j, i)]
        def media (ps):
            n = len(ps)
            return (sum((p[0] for p in ps), Vector()) / n, None, sum((p[2] for p in ps), Vector()) / n,
                    tuple(sum(p[3][k] for p in ps) / n for k in range(len(ps[0][3]))))
        for j in range(nv - 1):
            for i in range(nu if cerrada else nu - 1):
                k = (i + 1) % nu
                esq = ((j, i), (j, k), (j + 1, k), (j + 1, i))
                ps = [P[a][b] for a, b in esq]
                med = media(ps)
                fuera = med[0] - med[2]
                if val is None or all(val[a][b] > 0 for a, b in esq):
                    self.cara([v(a, b) for a, b in esq], [color(p, med) for p in ps], fuera)
                    continue
                vals = [val[a][b] for a, b in esq]
                if all(x <= 0 for x in vals): continue
                pol = []
                for n in range(4):
                    x0, x1 = vals[n], vals[(n + 1) % 4]
                    p0, p1 = ps[n], ps[(n + 1) % 4]
                    if x0 > 0: pol.append((v(*esq[n]), color(p0, med)))
                    if (x0 > 0) != (x1 > 0):
                        t = x0 / (x0 - x1)
                        q = (p0[0].lerp(p1[0], t), mezclar_pesos(p0[1], p1[1], t), p0[2].lerp(p1[2], t),
                             tuple(a + (b - a) * t for a, b in zip(p0[3], p1[3])))
                        pol.append((self.vert(q[0], q[1]), color(q, med)))
                if len(pol) >= 3: self.cara([a for a, c in pol], [c for a, c in pol], fuera)
        for fin, j in ((0, 0), (1, nv - 1)):
            if not tapas[fin]: continue
            ps = P[j]
            med = media(ps)
            otro = media(P[1 if j == 0 else nv - 2])
            centro = self.vert(med[0], ps[0][1])
            for i in range(nu):
                k = (i + 1) % nu
                self.cara([v(j, i), v(j, k), centro], [color(ps[i], med), color(ps[k], med), color(med, med)], med[2] - otro[2])

    def pieza (self, hacer, pesos, col, suave=True, sombra=True):
        # Una pieza suelta (caja, bola, cilindro) hecha con las operaciones de
        # bmesh: `pesos` es un reparto fijo o una función de la posición. Sin
        # `sombra`, ni recibe ni da oclusión al hornear (va en el material 1).
        viejos = set(self.bm.verts)
        viejas = set(self.bm.faces)
        hacer(self.bm)
        nuevas = [f for f in self.bm.faces if f not in viejas]
        bmesh.ops.recalc_face_normals(self.bm, faces=nuevas)
        for vt in self.bm.verts:
            if vt in viejos: continue
            d = vt[self.df]
            for n, w in (pesos(vt.co) if callable(pesos) else pesos).items():
                if w > 0.004: d[IND[n]] = w
        for f in nuevas:
            f.smooth = suave
            f.material_index = 0 if sombra else 1
            for l in f.loops: l[self.col] = col(l.vert.co) if callable(col) else col

    def bola (self, c, radios, pesos, col, u=12, v=8, base=None, sombra=True):
        if isinstance(radios, (int, float)): radios = (radios,) * 3
        R = (base if base is not None else Matrix.Identity(3)).to_4x4()
        M = Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*radios, 1))
        self.pieza(lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0, matrix=M), pesos, col, sombra=sombra)

    def caja (self, c, tam, pesos, col, base=None, bisel=0.004):
        R = (base if base is not None else Matrix.Identity(3)).to_4x4()
        M = Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*tam, 1))
        def hacer (bm):
            viejas = set(bm.faces)
            bmesh.ops.create_cube(bm, size=1.0, matrix=M)
            if bisel:
                aristas = {e for f in bm.faces if f not in viejas for e in f.edges}
                bmesh.ops.bevel(bm, geom=list(aristas), offset=bisel, segments=2, affect='EDGES')
        self.pieza(hacer, pesos, col)

    def cil (self, a, b, r, pesos, col, lados=10, r2=None):
        a = Vector(a); b = Vector(b)
        q = (b - a).to_track_quat('Z', 'Y').to_matrix().to_4x4()
        M = Matrix.Translation((a + b) / 2) @ q
        self.pieza(lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r if r2 is None else r2,
                                                    depth=(b - a).length, matrix=M), pesos, col)

    def cinta (self, pts, ancho, grosor, col):
        # Una tira que sigue varios puntos apoyados en el cuerpo: cada punto es
        # (posición, pesos, hacia fuera). Correas, tirantes, ribetes.
        n = len(pts)
        aros = []
        for i in range(n):
            p, w, nor = pts[i]
            t = (pts[min(n - 1, i + 1)][0] - pts[max(0, i - 1)][0]).normalized()
            nor = nor.normalized()
            lado = nor.cross(t).normalized()
            a = (ancho[i] if isinstance(ancho, (list, tuple)) else ancho) / 2
            aros.append([self.vert(p + lado * a + nor * grosor, w), self.vert(p - lado * a + nor * grosor, w),
                         self.vert(p - lado * a - nor * grosor * 0.5, w), self.vert(p + lado * a - nor * grosor * 0.5, w)])
        c = col if isinstance(col, tuple) else rgb(col)
        for i in range(n - 1):
            for j in range(4):
                q = [aros[i][j], aros[i][(j + 1) % 4], aros[i + 1][(j + 1) % 4], aros[i + 1][j]]
                medio = sum((x.co for x in q), Vector()) / 4
                eje = (pts[i][0] + pts[i + 1][0]) / 2
                self.cara(q, [c] * 4, medio - eje)
        self.cara(aros[0], [c] * 4, pts[0][0] - pts[1][0])
        self.cara(aros[-1], [c] * 4, pts[-1][0] - pts[-2][0])

def ejes (z, x=None):
    # Una base con Z a lo largo de `z` y X cerca de `x`: para tumbar piezas.
    z = Vector(z).normalized()
    x = Vector(x) if x is not None else Vector((1, 0, 0))
    x = (x - z * x.dot(z))
    if x.length < 1e-5: x = Vector((0, 1, 0)) - z * z.y
    x.normalize()
    return Matrix((x, z.cross(x), z)).transposed()

# --- el tronco ------------------------------------------------------------------------
# Por alturas: media anchura, fondo por delante y fondo por detrás (desde el eje,
# que va algo por detrás del centro, donde está la columna). Mujer de 1,72,
# estilizada: cintura estrecha, cadera y hombros parecidos.
TRONCO = curva([
    (0.835, 0.040, 0.040, 0.040), (0.862, 0.112, 0.074, 0.080), (0.900, 0.158, 0.088, 0.098),
    (0.940, 0.172, 0.090, 0.104), (1.000, 0.165, 0.088, 0.097), (1.060, 0.142, 0.082, 0.084),
    (1.120, 0.121, 0.078, 0.075), (1.180, 0.125, 0.082, 0.079), (1.240, 0.137, 0.087, 0.087),
    (1.300, 0.147, 0.089, 0.092), (1.345, 0.153, 0.084, 0.092), (1.375, 0.146, 0.072, 0.086),
    (1.395, 0.112, 0.060, 0.074), (1.410, 0.075, 0.053, 0.060), (1.422, 0.054, 0.050, 0.053)])
Y_BAJO, Y_ALTO = 0.835, 1.422
Z_EJE = -0.090

def tronco (th, y, sale=0.0, busto=0.046, tensa=0.0):
    # Un punto del tronco: ángulo alrededor (0 = su costado izquierdo, 90° = el
    # frente) y altura. `sale` separa la ropa de la piel; `tensa` rellena el
    # canalillo, que una tela tirante no se mete entre los pechos.
    a, f, b = TRONCO(y)
    z0 = Z_EJE - 0.013 * sm(1.34, 1.42, y)
    c, s = math.cos(th), math.sin(th)
    x = (a + sale) * math.copysign(abs(c) ** 0.87, c)
    z = z0 + ((f if s > 0 else b) + sale) * math.copysign(abs(s) ** 0.87, s)
    p = Vector((x, y, z))
    if s > 0:
        dy = y - 1.290
        g = math.exp(-(dy / (0.056 if dy > 0 else 0.043)) ** 2)
        k = [busto * g * math.exp(-((x - lado * 0.070) / 0.053) ** 2) for lado in (-1, 1)]
        medio = busto * g * math.exp(-(x / 0.09) ** 2) * 0.82
        p.z += max(k[0] + k[1], medio * tensa)
        p.x += 0.2 * (k[1] - k[0])
    else:
        for lado in (-1, 1):
            p.z -= 0.030 * math.exp(-((x - lado * 0.078) / 0.062) ** 2 - ((y - 0.925) / 0.066) ** 2)
    return p, Vector((0.0, y, z0))

def pesos_tronco (p):
    # Por alturas entre la cadera y los tres huesos de la columna; arriba y a los
    # lados tira la clavícula, y abajo cada muslo se lleva algo de su lado.
    w = {'Hips': 1.0}
    for nombre in ('Spine02', 'Spine01', 'Spine'):
        w = pasar(w, nombre, sm(H[nombre].y - 0.045, H[nombre].y + 0.045, p.y))
    for lado, signo in (('Left', 1), ('Right', -1)):
        f = 0.85 * sm(0.05, 0.14, signo * p.x) * sm(1.28, 1.36, p.y)
        if f > 0: w = pasar(w, lado + 'Shoulder', f)
    f = 0.5 * sm(0.96, 0.86, p.y)
    if f > 0:
        izq = sm(-0.04, 0.04, p.x)
        w = {k: v * (1 - f) for k, v in w.items()}
        w['LeftUpLeg'] = f * izq
        w['RightUpLeg'] = f * (1 - izq)
    return w

def hacer_tronco (m, color, y0=Y_BAJO, y1=Y_ALTO, sale=0.0, campo=None, cortes=(), nu=32, paso=0.022, tapas=(False, False), busto=0.046, tensa=0.0):
    ys = pasos(y0, y1, paso, cortes)
    def punto (i, j):
        th = 2 * math.pi * i / nu
        p, c = tronco(th, ys[j], sale, busto, tensa)
        return (p, pesos_tronco(p), c, (th, ys[j]))
    m.lamina(nu, len(ys), punto, color, True, campo, tapas)

def en_tronco (th, y, sale=0.0, busto=0.046, tensa=0.0):
    # Un punto para una cinta apoyada en el tronco: posición, pesos y hacia fuera.
    p, c = tronco(th, y, sale, busto, tensa)
    q, _ = tronco(th, y, sale + 0.01, busto, tensa)
    return (p, pesos_tronco(p), q - p)

# --- los miembros: tubos que siguen sus huesos ----------------------------------------
class Cadena:
    def __init__ (self, pts, zona):
        self.p = [Vector(q) for q in pts]
        self.dir = [(b - a).normalized() for a, b in zip(self.p, self.p[1:])]
        self.lon = [(b - a).length for a, b in zip(self.p, self.p[1:])]
        self.acum = [0.0]
        for l in self.lon: self.acum.append(self.acum[-1] + l)
        self.zona = zona

    def en (self, s):
        # Centro y dirección a la distancia s del primer hueso. En los codos y las
        # rodillas (que en reposo ya vienen doblados) la esquina se redondea.
        for k in range(1, len(self.p) - 1):
            z = min(self.zona, self.lon[k - 1] * 0.45, self.lon[k] * 0.45)
            sj = self.acum[k]
            if sj - z < s < sj + z:
                t = (s - (sj - z)) / (2 * z)
                a = self.p[k] - self.dir[k - 1] * z
                b = self.p[k] + self.dir[k] * z
                return a.lerp(self.p[k], t).lerp(self.p[k].lerp(b, t), t), self.dir[k - 1].lerp(self.dir[k], t).normalized()
        if s <= 0: return self.p[0] + self.dir[0] * s, self.dir[0]
        for k in range(len(self.dir)):
            if s <= self.acum[k + 1] or k == len(self.dir) - 1:
                return self.p[k] + self.dir[k] * (s - self.acum[k]), self.dir[k]

class Miembro:
    # Un brazo o una pierna: su cadena de huesos, sus radios a lo largo (frente y
    # costado), el reparto de pesos y un marco que no se retuerce.
    def __init__ (self, cadena, radios, huesos, zonas, frente=(0, 0, 1), desvio=None, bulto=None):
        self.cad, self.radios, self.huesos, self.zonas = cadena, curva(radios), huesos, zonas
        self.desvio, self.bulto = desvio, bulto
        self.frente = Vector(frente)

    def pesos (self, s):
        w = {self.huesos[0]: 1.0}
        for k, nombre in enumerate(self.huesos[1:]):
            antes, despues = self.zonas[k]
            w = pasar(w, nombre, sm(self.cad.acum[k] - antes, self.cad.acum[k] + despues, s))
        return w

    def marcos (self, ss):
        out = []
        ref = self.frente.copy()
        # El marco se lleva desde el arranque, no desde el primer anillo pedido:
        # así una bota que empieza en la rodilla casa con la pierna de debajo.
        for s in sorted(set(list(np.arange(min(-0.1, min(ss)), max(ss) + 0.011, 0.01).round(4)) + [round(x, 4) for x in ss])):
            c, t = self.cad.en(s)
            ref = (ref - t * ref.dot(t)).normalized()
            if self.desvio: c = c + self.desvio(s)
            out.append((s, c, t, ref.copy(), t.cross(ref).normalized()))
        porS = {round(m[0], 4): m for m in out}
        return [porS[round(s, 4)] for s in ss]

    def punto (self, marco, th, sale=0.0):
        s, c, t, A, B = marco
        ra, rb = self.radios(s)
        extra = sale + (self.bulto(s, th) if self.bulto else 0.0)
        return (c + A * math.cos(th) * (ra + extra) + B * math.sin(th) * (rb + extra), self.pesos(s), c, (th, s))

    def hacer (self, m, color, s0, s1, sale=0.0, campo=None, cortes=(), nu=14, paso=0.024, tapas=(False, False)):
        ss = pasos(s0, s1, paso, cortes)
        marcos = self.marcos(ss)
        m.lamina(nu, len(ss), lambda i, j: self.punto(marcos[j], 2 * math.pi * i / nu, sale), color, True, campo, tapas)

    def en (self, s, th, sale=0.0):
        # Para cintas y piezas: posición, pesos y hacia fuera en un punto del miembro.
        marco = self.marcos([s])[0]
        p = self.punto(marco, th, sale)
        return (p[0], p[1], p[0] - p[2])

def pierna (lado, grosor=1.0):
    cad = Cadena([H[lado + 'UpLeg'], H[lado + 'Leg'], H[lado + 'Foot']], 0.06)
    L0, L1 = cad.lon
    g = grosor
    radios = [(-0.07, 0.078 * g, 0.078 * g), (0.0, 0.088 * g, 0.087 * g), (0.3 * L0, 0.083 * g, 0.080 * g), (0.7 * L0, 0.066 * g, 0.063 * g),
              (L0, 0.053 * g, 0.051 * g), (L0 + 0.25 * L1, 0.055 * g, 0.050 * g), (L0 + 0.6 * L1, 0.043 * g, 0.040 * g),
              (L0 + 0.92 * L1, 0.034 * g, 0.031 * g), (L0 + L1 + 0.03, 0.036 * g, 0.033 * g)]
    # El montador puso la cadera derecha cuatro centímetros más adentro que la
    # izquierda: los muslos se corren para que queden a la misma distancia del eje.
    desvio = lambda s: Vector((-0.022 * (1 - sm(0, L0, s)), 0, 0))
    bulto = lambda s, th: 0.011 * G(s - (L0 + 0.27 * L1), 0.075) * max(0.0, -math.cos(th)) ** 2
    M = Miembro(cad, radios, ['Hips', lado + 'UpLeg', lado + 'Leg', lado + 'Foot'], [(0.08, 0.05), (0.055, 0.055), (0.035, 0.02)], (0, 0, 1), desvio, bulto)
    M.L0, M.L1, M.fin = L0, L1, L0 + L1
    return M

HOMBRO_BAJA = 0.014

def brazo (lado, grosor=1.0):
    cad = Cadena([H[lado + 'Arm'], H[lado + 'ForeArm'], H[lado + 'Hand']], 0.045)
    L0, L1 = cad.lon
    g = grosor
    radios = [(-0.04, 0.032 * g, 0.032 * g), (0.0, 0.039 * g, 0.039 * g), (0.05, 0.041 * g, 0.040 * g), (0.6 * L0, 0.036 * g, 0.035 * g),
              (L0, 0.032 * g, 0.031 * g), (L0 + 0.25 * L1, 0.034 * g, 0.031 * g), (L0 + 0.75 * L1, 0.027 * g, 0.025 * g),
              (L0 + L1, 0.024 * g, 0.021 * g), (L0 + L1 + 0.02, 0.022 * g, 0.020 * g)]
    # El esqueleto trae los hombros encogidos (era de un soldado con chaleco): el
    # brazo arranca un dedo más abajo que su hueso, o no queda cuello que enseñar.
    desvio = lambda s: Vector((0, -HOMBRO_BAJA * (1 - sm(0, 0.13, s)), 0))
    M = Miembro(cad, radios, [lado + 'Shoulder', lado + 'Arm', lado + 'ForeArm', lado + 'Hand'], [(0.045, 0.04), (0.045, 0.045), (0.03, 0.015)], desvio=desvio)
    M.L0, M.L1, M.fin = L0, L1, L0 + L1
    return M

# Hacia dónde van los dedos y hacia dónde mira la palma con el esqueleto en
# reposo: medido en la mano del soldado (ejes principales de sus vértices), que
# es para la que están ajustados los agarres del juego.
def mano (m, lado, piel, guante=None, dedos=None):
    s = 1 if lado == 'Left' else -1
    F = Vector((0.45 * s, -0.44, 0.77)).normalized()
    N = Vector((-0.57 * s, 0.53, 0.63)).normalized()
    W = N.cross(F).normalized()
    o = H[lado + 'Hand']
    w = {lado + 'Hand': 1.0}
    base = Matrix((W, N, F)).transposed()
    m.bola(o + F * 0.036, (0.035, 0.0155, 0.046), w, rgb(guante if guante else piel, 0.98), 12, 8, base)
    curl = Matrix.Rotation(-0.35 * s, 3, W) @ base
    m.bola(o + F * 0.088 + N * 0.008, (0.031, 0.0125, 0.036), w, rgb(dedos if dedos else piel, 0.97), 12, 8, curl)
    pulgar = ejes(F + W * s * 0.75 + N * 0.3, N)
    m.bola(o + F * 0.046 + W * s * 0.034 + N * 0.011, (0.0115, 0.011, 0.028), w, rgb(dedos if dedos else piel, 0.97), 8, 6, pulgar)

def pie (m, lado, color, tacon=0.0, alto=0.135, ancho=1.0, suela=None, puntera=None):
    # El calzado, del talón a la punta siguiendo la línea tobillo → dedos. Con
    # `tacon`, el talón sube y lo sostiene un tacón aparte.
    a, b = H[lado + 'Foot'], H[lado + 'ToeBase']
    d = Vector((b.x - a.x, 0, b.z - a.z)).normalized()
    talon = Vector((a.x, 0, a.z)) - d * 0.068
    largo = (Vector((b.x, 0, b.z)) + d * 0.083 - talon).length
    lat = Vector((0, 1, 0)).cross(d).normalized()
    ancho_t = curva([(0, 0.022), (0.12, 0.038), (0.3, 0.043), (0.6, 0.048), (0.85, 0.045), (1.0, 0.026)])
    techo = curva([(0, alto * 0.8), (0.12, alto), (0.3, alto), (0.48, 0.085), (0.7, 0.060), (0.9, 0.048), (1.0, 0.032)])
    ts = [0, 0.06, 0.14, 0.24, 0.34, 0.44, 0.56, 0.68, 0.8, 0.9, 0.96, 1.0]
    nu = 12
    def pesos (p):
        w = {lado + 'Foot': 1.0}
        w = pasar(w, lado + 'ToeBase', sm(-0.03, 0.03, (p - b).dot(d) + 0.01))
        return pasar(w, lado + 'Leg', 0.55 * sm(0.115, 0.175, p.y))
    def punto (i, j):
        t = ts[j]
        base = tacon * (1 - sm(0.12, 0.62, t)) + (0.012 if t < 0.03 or t > 0.97 else 0.0)
        hi = float(techo(t)[0]) + tacon * 0.25 * (1 - sm(0.2, 0.6, t))
        c = talon + d * (largo * t) + Vector((0, (base + hi) / 2, 0))
        th = 2 * math.pi * i / nu
        co, si = math.cos(th), math.sin(th)
        # Por abajo más cuadrado: es una suela, no un huevo.
        ex = 0.6 if si < 0 else 0.9
        p = c + lat * float(ancho_t(t)[0]) * ancho * math.copysign(abs(co) ** ex, co) + Vector((0, (hi - base) / 2 * math.copysign(abs(si) ** ex, si), 0))
        return (p, pesos(p), c, (th, t))
    def col (p, med):
        if suela is not None and med[0].y < tacon * (1 - sm(0.12, 0.62, med[3][1])) + 0.022: return rgb(suela)
        if puntera is not None and med[3][1] > 0.78: return rgb(puntera)
        return color(p, med) if callable(color) else rgb(color)
    m.lamina(nu, len(ts), punto, col, True, None, (True, True))
    if tacon:
        arriba = talon + d * 0.03 + Vector((0, tacon * 0.95, 0))
        m.cil(arriba - Vector((0, tacon * 0.95, 0)), arriba, 0.007, {lado + 'Foot': 1.0}, rgb(suela if suela is not None else 0x15151a), 8, r2=0.017)

# --- la figura ------------------------------------------------------------------------
class Figura:
    def __init__ (self, clave, grosor_pierna=1.0, grosor_brazo=1.0, busto=0.046):
        self.clave = clave
        self.m = Malla()
        # El color de la piel es el de su cabeza, un punto más cálido: la cara va
        # dibujada con su colorete y al lado el cuerpo quedaba amarillento.
        r, g, b, _ = rgb(CABEZAS[clave + '-f']['piel'])
        self.piel = (round(r * 0.985 * 255) << 16) | (round(g * 0.95 * 255) << 8) | round(b * 0.935 * 255)
        self.busto = busto
        self.piernas = {l: pierna(l, grosor_pierna) for l in ('Left', 'Right')}
        self.brazos = {l: brazo(l, grosor_brazo) for l in ('Left', 'Right')}

    def color_piel (self, k=1.0):
        # Un punto más rosada en hombros, codos y rodillas no hace falta aquí: la
        # sombra la pone el horneado. Solo se oscurece un pelo hacia abajo.
        return lambda p, med: rgb(self.piel, k * (0.955 + 0.04 * sm(0.2, 1.4, p[0].y)))

    def tronco (self, color, **o):
        hacer_tronco(self.m, color, busto=self.busto, **o)

    def piel_tronco (self, tramos):
        # La piel del tronco solo donde se ve: lo que tapa la ropa no se hace.
        for y0, y1 in tramos:
            self.tronco(self.color_piel(), y0=y0, y1=y1, tapas=(y0 <= Y_BAJO, y1 >= Y_ALTO))

    def brazos_piel (self, s0=0.0, s1=None, cortes=(), color=None, hombro=None):
        # El tubo arranca EN la articulación, dentro de la bola del hombro. Con un
        # trozo por encima (que se queda con la clavícula), al bajar el brazo ese
        # trozo asomaba sobre el hombro como una hombrera cuadrada.
        for l, b in self.brazos.items():
            b.hacer(self.m, color or self.color_piel(), s0, b.fin + 0.012 if s1 is None else s1, cortes=cortes, tapas=(True, True))
            # El hombro, una bola en la articulación: al girar el brazo no asoma el
            # arranque del tubo, que en reposo va metido en el tronco. Fuera de la
            # oclusión: en reposo está medio enterrada, y horneada con sus sombras
            # salía como un bulto con cerco oscuro en cuanto el brazo bajaba.
            if s0 <= 0 or hombro is not None:
                self.m.bola(H[l + 'Arm'] - Vector((0, HOMBRO_BAJA, 0)), 0.0445, {l + 'Arm': 0.5, l + 'Shoulder': 0.5},
                            rgb(hombro if hombro is not None else self.piel, 0.985), 18, 12, sombra=False)

    def piernas_piel (self, s0=-0.07, s1=None, cortes=(), color=None):
        for l, p in self.piernas.items():
            p.hacer(self.m, color or self.color_piel(), s0, p.fin + 0.02 if s1 is None else s1, cortes=cortes, nu=16, tapas=(True, True))

    def manga (self, color, s0, s1, sale=0.005, lados=('Left', 'Right'), campo=None):
        for l in lados:
            self.brazos[l].hacer(self.m, color, s0, s1, sale, campo, paso=0.02)

    def pernera (self, color, s0, s1, sale=0.006, lados=('Left', 'Right'), campo=None, tapas=(False, False)):
        for l in lados:
            self.piernas[l].hacer(self.m, color, s0, s1, sale, campo, nu=16, paso=0.022, tapas=tapas)

    def aro_miembro (self, miembro, s, ancho, sale, col, grosor=0.003):
        # Una correa alrededor de un brazo o una pierna.
        pts = [miembro.en(s, 2 * math.pi * k / 16, sale) for k in range(17)]
        self.m.cinta(pts, ancho, grosor, col)

    def aro_tronco (self, y, ancho, sale, col, grosor=0.004, cae=0.0):
        # Un cinturón: `cae` lo ladea (más bajo por un costado).
        pts = [en_tronco(2 * math.pi * k / 40, y + cae * math.cos(2 * math.pi * k / 40), sale, self.busto) for k in range(41)]
        self.m.cinta(pts, ancho, grosor, col)

    def falda (self, color, y1, y0, sale=0.008, vuelo=0.0, campo=None, cortes=(), nu=36, cuelga=0.55):
        # Una falda o un vestido: arriba sigue la cadera; por debajo envuelve las
        # DOS piernas (que en reposo van abiertas), y cada lado se va con la suya,
        # como una tela, para que al andar no la atraviesen.
        Y_C = 0.95
        ys = pasos(y1, y0, 0.03, cortes)
        izq, der = self.piernas['Left'], self.piernas['Right']
        def donde (p, y):
            # Centro, radios y pesos de una pierna a la altura y.
            s = min(p.fin, max(0.0, (H[p.huesos[1]].y - y) / max(0.2, -p.cad.dir[0].y)))
            for _ in range(4):
                c, t = p.cad.en(s)
                s = min(p.fin, max(0.0, s + (c.y - y) / max(0.3, -t.y)))
            c, t = p.cad.en(s)
            if p.desvio: c = c + p.desvio(s)
            return c, p.radios(s), p.pesos(s)
        def punto (i, j):
            y = ys[j]
            th = 2 * math.pi * i / nu
            if y >= Y_C:
                p, c = tronco(th, y, sale, self.busto)
                return (p, pesos_tronco(p), c, (th, y))
            ci, ri, wi = donde(izq, y)
            cd, rd, wd = donde(der, y)
            baja = Y_C - y
            # La tela tirante alrededor de las DOS piernas: en cada dirección manda la
            # pierna que más sale hacia ahí, y entre una y otra el punto pasa de la
            # una a la otra en línea recta (el paño tendido entre los muslos). Con
            # un óvalo centrado entre las dos, las esquinas se comían cada pierna.
            mg = sale + 0.008 + vuelo * baja
            co, si = math.cos(th), math.sin(th)
            # Por detrás salen más el culo (arriba) y el gemelo que el tubo de la pierna.
            atras = (0.012 + 0.016 * sm(0.14, 0.0, baja)) if si < 0 else 0.0
            pi_ = Vector((ci.x + (ri[1] + mg) * co, y, ci.z + (ri[0] + mg + atras) * si))
            pd_ = Vector((cd.x + (rd[1] + mg) * co, y, cd.z + (rd[0] + mg + atras) * si))
            lado = 1 / (1 + math.exp(-70 * ((pi_.x - pd_.x) * co + (pi_.z - pd_.z) * si)))
            q = pd_.lerp(pi_, lado)
            medio = Vector(((ci.x + cd.x) / 2, y, (ci.z + cd.z) / 2))
            # Pegado a la cadera, la forma es la del tronco, sin escalón; el paso
            # acaba antes de donde arrancan los muslos, que en reposo van hacia delante.
            pt, _ = tronco(th, Y_C, sale, self.busto)
            q = Vector((pt.x, y, pt.z)).lerp(q, sm(0.0, 0.07, baja))
            w = mezclar_pesos(wd, wi, lado)
            w = mezclar_pesos(pesos_tronco(Vector((q.x, Y_C, q.z))), w, cuelga * sm(0.0, 0.12, baja) + (1 - cuelga) * sm(0.1, 0.45, baja))
            return (q, w, medio, (th, y))
        self.m.lamina(nu, len(ys), punto, color, True, campo)

    def cierre (self, clave_extra=None):
        return self.m

# --- las cinco ------------------------------------------------------------------------
def tela (col, fuerza=0.05):
    # Un color de tela con sus aguas: bandas suaves que siguen el cuerpo.
    c = hexa(col)
    return lambda p, med: rgb(c, 1.0 + fuerza * math.sin(p[0].y * 70 + p[0].x * 31) * math.sin(p[0].z * 53 + p[0].y * 17))

def cuero (col, fuerza=0.06):
    c = hexa(col)
    return lambda p, med: rgb(c, 0.94 + fuerza * math.sin(p[0].y * 37 + p[0].x * 59 + p[0].z * 41))

def cartuchera (f, lado, col, s=0.16, correa=0x1a1a1e):
    # La pistolera del muslo, por fuera, con sus dos correas.
    p = f.piernas[lado]
    th = math.pi / 2 if lado == 'Right' else -math.pi / 2
    q, w, n = p.en(s, th, 0.012)
    abajo = (p.en(s + 0.08, th, 0.012)[0] - q).normalized()
    f.m.caja(q + abajo * 0.03 + n.normalized() * 0.012, (0.05, 0.036, 0.11), w, rgb(col), ejes(abajo, n.cross(abajo)), 0.006)
    f.m.caja(q + abajo * -0.035 + n.normalized() * 0.02, (0.03, 0.03, 0.05), w, rgb(0x24262b), ejes(abajo, n.cross(abajo)), 0.005)
    for ds in (-0.02, 0.07): f.aro_miembro(p, s + ds, 0.018, 0.004, correa)

def bolsillos (f, y, col, ths, tam=(0.05, 0.03, 0.06), sale=0.014):
    for th in ths:
        q, w, n = en_tronco(th, y, sale, f.busto)
        f.m.caja(q, tam, w, rgb(col), ejes(Vector((0, 1, 0)), Vector((0, 1, 0)).cross(n)), 0.006)

def hebilla (f, y, sale=0.016, col=0xc9a94a):
    q, w, n = en_tronco(math.pi / 2, y, sale, f.busto)
    f.m.caja(q, (0.04, 0.03, 0.012), w, rgb(col), None, 0.004)

def ombligo (f, y=1.075):
    q, w, n = en_tronco(math.pi / 2, y, -0.003, f.busto)
    f.m.bola(q, (0.006, 0.009, 0.005), w, rgb(f.piel, 0.62), 8, 6)

def jill ():
    # La de Resident Evil 3: top azul sin tirantes, minifalda negra, el jersey
    # blanco anudado a la cintura y botas altas marrones.
    f = Figura('jill')
    m = f.m
    f.piel_tronco([(1.04, 1.17), (1.295, Y_ALTO)])
    f.brazos_piel()
    # El muslo empieza poco antes del bajo de la falda: lo de más arriba no se ve
    # y, al levantar la pierna, es lo que la atravesaría.
    f.piernas_piel(s0=0.10)
    # El top: el borde de arriba baja un poco en el centro, como un corazón.
    arriba = lambda p: 1.338 - 0.016 * G(p[0].x, 0.04) * (1 if p[0].z > Z_EJE else 0) + 0.006 * abs(p[0].x) / 0.15 - p[0].y
    f.tronco(tela(0x2f6fb8), y0=1.15, y1=1.36, sale=0.005, campo=arriba, tensa=1.0)
    f.aro_tronco(1.152, 0.012, 0.005, 0x275c9a, 0.0025)
    f.falda(tela(0x1b1c22, 0.08), 1.075, 0.775, sale=0.006, vuelo=0.10)
    f.aro_tronco(1.068, 0.022, 0.008, 0x101115)
    hebilla(f, 1.068, 0.014, 0xb9bcc4)
    # El jersey: la vuelta a la cintura, el nudo delante y el cuerpo colgando atrás.
    blanco = tela(0xe9e6dc, 0.07)
    f.tronco(blanco, y0=1.012, y1=1.052, sale=0.016, paso=0.013)
    f.falda(blanco, 1.03, 0.80, sale=0.014, vuelo=0.10, campo=lambda p: min((Z_EJE - 0.03 - p[0].z) * 4, 0.125 - abs(p[0].x), (p[0].y - 0.825 - 2.2 * p[0].x ** 2) * 4))
    for lado in (-1, 1):
        pts = [en_tronco(math.pi / 2 - lado * (0.10 + 0.16 * t), 1.03 - 0.19 * t, 0.022 - 0.004 * t, f.busto) for t in (0, 0.25, 0.5, 0.75, 1)]
        m.cinta(pts, [0.04, 0.044, 0.042, 0.04, 0.03], 0.007, rgb(0xe9e6dc))
    q, w, n = en_tronco(math.pi / 2, 1.03, 0.024, f.busto)
    m.bola(q, (0.03, 0.024, 0.018), w, rgb(0xe9e6dc, 0.96), 10, 6)
    # Botas hasta debajo de la rodilla, con algo de tacón.
    bota = cuero(0x6b4a32)
    for l, p in f.piernas.items():
        p.hacer(m, bota, p.L0 + 0.055, p.fin + 0.02, 0.006, nu=16)
        f.aro_miembro(p, p.L0 + 0.06, 0.02, 0.008, 0x57391f, 0.004)
        pie(m, l, bota, tacon=0.03, suela=0x2a1c12)
    cartuchera(f, 'Right', 0x1c1d22)
    for l in ('Left', 'Right'): mano(m, l, f.piel)
    return f

def claire ():
    # La de Resident Evil 2: chaleco rojo abierto sobre un top negro corto,
    # vaqueros cortos y botas de media caña.
    f = Figura('claire')
    m = f.m
    f.piel_tronco([(1.03, 1.215), (1.30, Y_ALTO)])
    f.brazos_piel()
    f.piernas_piel(s0=0.07)
    sisa = lambda p: min(math.hypot(abs(p[0].x) - 0.165, p[0].y - 1.385) - 0.062, 9)
    escote = lambda p: (math.hypot(p[0].x / 0.075, (p[0].y - 1.43) / 0.095) - 1) if p[0].z > Z_EJE else (math.hypot(p[0].x / 0.07, (p[0].y - 1.43) / 0.045) - 1)
    f.tronco(tela(0x1c1c20), y0=1.20, y1=Y_ALTO, sale=0.004, campo=lambda p: min(sisa(p), escote(p)) * 3, tensa=0.8)
    # El chaleco: abierto por delante (más abajo que arriba) y sin mangas.
    abierto = lambda p: (abs(p[0].x) - (0.034 + 0.05 * sm(1.38, 1.2, p[0].y))) if p[0].z > Z_EJE else 1.0
    sisa2 = lambda p: math.hypot(abs(p[0].x) - 0.17, p[0].y - 1.38) - 0.066
    cuello = lambda p: (math.hypot(p[0].x / 0.062, (p[0].y - 1.43) / 0.032) - 1)
    rojo = tela(0xc2262e, 0.07)
    f.tronco(rojo, y0=1.165, y1=Y_ALTO, sale=0.013, campo=lambda p: min(abierto(p) * 4, sisa2(p) * 3, cuello(p)), tensa=1.0)
    f.aro_tronco(1.168, 0.016, 0.0135, 0x9a1c24, 0.003)
    # El cuello del chaleco, levantado por detrás.
    pts = [en_tronco(math.pi * (1.5 + 0.42 * t), 1.404, 0.017, f.busto) for t in (-1, -0.66, -0.33, 0, 0.33, 0.66, 1)]
    m.cinta(pts, 0.035, 0.005, rgb(0xa81f27))
    # Vaqueros cortos: la cadera y un palmo de muslo.
    vaquero = tela(0x3f5f8a, 0.09)
    f.tronco(vaquero, y0=Y_BAJO, y1=1.045, sale=0.006, tapas=(True, False))
    f.pernera(vaquero, -0.07, 0.085, 0.007)
    for l, p in f.piernas.items(): f.aro_miembro(p, 0.082, 0.016, 0.009, 0x5f7fa8, 0.003)
    f.aro_tronco(1.036, 0.024, 0.009, 0x4a3120)
    hebilla(f, 1.036)
    bolsillos(f, 1.0, 0x3a2a1e, [math.pi * 0.86, math.pi * 1.16], (0.045, 0.03, 0.06), 0.014)
    ombligo(f)
    bota = cuero(0x5a3a26)
    for l, p in f.piernas.items():
        p.hacer(m, bota, p.L0 + 0.17, p.fin + 0.02, 0.007, nu=16)
        f.aro_miembro(p, p.L0 + 0.172, 0.022, 0.009, 0xd9d4c4, 0.004)      # el calcetín que asoma
        pie(m, l, bota, tacon=0.012, suela=0x1f1612)
        # Rodillera negra, como en el juego.
        q, w, n = p.en(p.L0 + 0.005, 0, 0.004)
        m.bola(q, (0.04, 0.045, 0.02), w, rgb(0x1a1a1e), 10, 6, ejes(n))
    cartuchera(f, 'Right', 0x3a2a1e, 0.15, 0x3a2a1e)
    for l, b in f.brazos.items():
        mano(m, l, f.piel, guante=0x1a1a1e)
        b.hacer(m, cuero(0x1a1a1e, 0.03), b.fin - 0.035, b.fin + 0.008, 0.004)
    return f

def ada ():
    # La de Resident Evil 4: vestido rojo de cuello alto, la espalda al aire, la
    # raja en la pierna izquierda y tacones.
    f = Figura('ada', busto=0.048)
    m = f.m
    f.piel_tronco([(1.11, Y_ALTO)])
    f.brazos_piel()
    f.piernas_piel(s0=0.06)
    rojo = tela(0xb3202a, 0.08)
    # El cuerpo: por delante sube estrechándose hasta el cuello; por detrás deja
    # la espalda al aire hasta la cintura.
    def cuerpo (p):
        x, y, z = p[0]
        if z > Z_EJE - 0.02:
            return (0.035 + 0.125 * sm(1.41, 1.29, y)) - abs(x)
        return (1.17 + 0.07 * (abs(x) / 0.14) ** 2) - y
    f.tronco(rojo, y0=1.09, y1=Y_ALTO, sale=0.005, campo=lambda p: cuerpo(p) * 4, tensa=1.0)
    # El cuello del vestido, cerrado atrás.
    pts = [en_tronco(2 * math.pi * k / 24, 1.413, 0.005, f.busto) for k in range(25)]
    m.cinta(pts, 0.022, 0.003, rgb(0x8f1820))
    # La falda larga con la raja: se abre desde lo alto del muslo izquierdo.
    def raja (p):
        th, y = p[3]
        d = abs(((th - 0.62 + math.pi) % (2 * math.pi)) - math.pi)
        return d - 0.34 * sm(0.86, 0.40, y) - 0.02 * sm(0.9, 0.86, y) + (0.02 if y > 0.875 else 0)
    f.falda(rojo, 1.10, 0.40, sale=0.006, vuelo=0.0, campo=lambda p: raja(p) * 3, cuelga=0.3)
    # Un ribete dorado en el bajo y el cinturón fino.
    f.aro_tronco(1.105, 0.02, 0.008, 0x1a1a1e, 0.003)
    hebilla(f, 1.105, 0.012, 0xd8b04a)
    cartuchera(f, 'Left', 0x1a1a1e, 0.13)
    negro = cuero(0x17171b, 0.03)
    for l, p in f.piernas.items():
        pie(m, l, lambda q, med: rgb(0x17171b) if (med[3][1] > 0.6 or med[3][1] < 0.24 or med[0].y < 0.03 + 0.07 * (1 - sm(0.12, 0.62, med[3][1]))) else rgb(f.piel, 0.95),
            tacon=0.075, alto=0.15, ancho=0.86, suela=0x101013)
        f.aro_miembro(p, p.fin - 0.02, 0.012, 0.003, 0x17171b, 0.002)
    for l in ('Left', 'Right'): mano(m, l, f.piel)
    # La pulsera.
    f.aro_miembro(f.brazos['Left'], f.brazos['Left'].fin - 0.02, 0.012, 0.003, 0xd8b04a, 0.002)
    return f

def rebecca ():
    # La de Resident Evil 0: la médica del equipo. Camiseta blanca, chaleco verde
    # con sus bolsillos, pantalón y la mochila del botiquín a la espalda.
    f = Figura('rebecca', busto=0.036, grosor_pierna=1.04)
    m = f.m
    f.piel_tronco([(1.385, Y_ALTO)])
    f.brazos_piel(s0=0.07, hombro=0xe8e6de)
    blanca = tela(0xe8e6de, 0.05)
    f.manga(blanca, 0.0, 0.105, 0.006)
    f.tronco(blanca, y0=1.02, y1=Y_ALTO, sale=0.004, campo=lambda p: (math.hypot(p[0].x / 0.066, (p[0].y - 1.43) / 0.04) - 1), tensa=1.0)
    verde = tela(0x3f7a4a, 0.07)
    sisa = lambda p: math.hypot(abs(p[0].x) - 0.178, p[0].y - 1.37) - 0.066
    pico = lambda p: (math.hypot(p[0].x / 0.066, (p[0].y - 1.43) / 0.12) - 1) if p[0].z > Z_EJE else (math.hypot(p[0].x / 0.066, (p[0].y - 1.43) / 0.04) - 1)
    f.tronco(verde, y0=1.11, y1=Y_ALTO, sale=0.014, campo=lambda p: min(sisa(p) * 3, pico(p)), tensa=1.0)
    f.aro_tronco(1.113, 0.016, 0.0145, 0x2f5f39, 0.003)
    # La cremallera y los bolsillos del pecho.
    m.cinta([en_tronco(math.pi / 2, y, 0.015, f.busto, 1.0) for y in (1.12, 1.18, 1.24, 1.29, 1.325)], 0.012, 0.003, rgb(0x24462b))
    bolsillos(f, 1.19, 0x356a40, [math.pi * 0.36, math.pi * 0.64], (0.062, 0.022, 0.07), 0.02)
    # Pantalón: pintado sobre las piernas, algo más anchas, y la cadera.
    pantalon = tela(0x4a6644, 0.08)
    f.tronco(pantalon, y0=Y_BAJO, y1=1.05, sale=0.005, tapas=(True, False))
    for l, p in f.piernas.items(): p.hacer(m, pantalon, -0.07, p.L0 + 0.26, 0.006, nu=16, tapas=(True, False))
    f.aro_tronco(1.04, 0.026, 0.009, 0x3a2a1e)
    hebilla(f, 1.04)
    # El botiquín del cinturón, con su cruz.
    q, w, n = en_tronco(math.pi * 0.08, 1.0, 0.03, f.busto)
    m.caja(q, (0.05, 0.075, 0.075), w, rgb(0xe8e6de), ejes(Vector((0, 0, 1)) - n * 0, None), 0.008)
    m.caja(q + n.normalized() * 0.027, (0.012, 0.04, 0.012), w, rgb(0x2f9a4a), None, 0.0)
    m.caja(q + n.normalized() * 0.027, (0.012, 0.012, 0.04), w, rgb(0x2f9a4a), None, 0.0)
    bolsillos(f, 0.95, 0x41593c, [math.pi * 0.98, math.pi * 1.9], (0.03, 0.07, 0.08), 0.012)
    # La mochila médica: es lo que más se ve jugando, que la cámara los mira por detrás.
    ws = {'Spine': 0.6, 'Spine01': 0.4}
    cz = Z_EJE - 0.155
    m.caja((0, 1.27, cz), (0.21, 0.24, 0.10), ws, rgb(0xe8e6de), None, 0.022)
    m.caja((0, 1.375, cz + 0.005), (0.19, 0.05, 0.095), ws, rgb(0x3f7a4a), None, 0.016)
    m.caja((0, 1.27, cz - 0.052), (0.035, 0.11, 0.008), ws, rgb(0x2f9a4a), None, 0.0)
    m.caja((0, 1.27, cz - 0.052), (0.11, 0.035, 0.008), ws, rgb(0x2f9a4a), None, 0.0)
    for lado in (-1, 1):
        pts = [en_tronco(math.pi / 2 - lado * 0.62, 1.2, 0.017, f.busto, 1.0), en_tronco(math.pi / 2 - lado * 0.72, 1.3, 0.017, f.busto, 1.0),
               en_tronco(math.pi / 2 - lado * 0.95, 1.385, 0.018, f.busto), en_tronco(math.pi / 2 - lado * 1.7, 1.415, 0.018, f.busto),
               en_tronco(math.pi * 1.5 + lado * 0.75, 1.36, 0.018, f.busto)]
        m.cinta(pts, 0.03, 0.004, rgb(0x2f5f39))
    bota = cuero(0x4a3524)
    for l, p in f.piernas.items():
        p.hacer(m, bota, p.L0 + 0.24, p.fin + 0.02, 0.011, nu=16)
        pie(m, l, bota, tacon=0.0, suela=0x1f1612, ancho=1.05)
    for l, b in f.brazos.items():
        mano(m, l, f.piel, guante=0x3a2a1e)
        b.hacer(m, cuero(0x3a2a1e, 0.03), b.fin - 0.03, b.fin + 0.008, 0.004)
    return f

def sheva ():
    # La de Resident Evil 5: camiseta lila de tirantes, pantalón claro ceñido,
    # el arnés de cuero, botas y el brazalete.
    f = Figura('sheva')
    m = f.m
    f.piel_tronco([(1.03, 1.2), (1.27, Y_ALTO)])
    f.brazos_piel()
    lila = tela(0x7a52b3, 0.07)
    sisa = lambda p: math.hypot(abs(p[0].x) - 0.182, p[0].y - 1.375) - 0.066
    pico = lambda p: (math.hypot(p[0].x / 0.058, (p[0].y - 1.44) / 0.14) - 1) if p[0].z > Z_EJE else (math.hypot(p[0].x / 0.06, (p[0].y - 1.44) / 0.07) - 1)
    # El bajo va en diagonal: enseña más cintura por su derecha.
    bajo = lambda p: p[0].y - (1.185 - 0.03 * p[0].x / 0.12)
    f.tronco(lila, y0=1.14, y1=Y_ALTO, sale=0.004, campo=lambda p: min(sisa(p) * 3, pico(p), bajo(p) * 6), tensa=0.9)
    claro = tela(0xb89a72, 0.07)
    f.tronco(claro, y0=Y_BAJO, y1=1.045, sale=0.005, tapas=(True, False))
    for l, p in f.piernas.items(): p.hacer(m, claro, -0.07, p.L0 + 0.2, 0.005, nu=16, tapas=(True, False))
    f.aro_tronco(1.035, 0.03, 0.009, 0x4a3120, 0.004, cae=0.008)
    hebilla(f, 1.035)
    bolsillos(f, 0.985, 0x4a3120, [math.pi * 0.1, math.pi * 0.9, math.pi * 1.5], (0.045, 0.035, 0.06), 0.016)
    ombligo(f)
    # El arnés: dos correas que cruzan la espalda y bajan por delante de los hombros.
    correa = rgb(0x4a3120)
    for lado in (-1, 1):
        pts = [en_tronco(math.pi / 2 - lado * 0.75, 1.22, 0.007, f.busto, 0.9), en_tronco(math.pi / 2 - lado * 0.8, 1.31, 0.007, f.busto, 0.9),
               en_tronco(math.pi / 2 - lado * 1.0, 1.39, 0.007, f.busto), en_tronco(math.pi / 2 - lado * 1.75, 1.412, 0.007, f.busto),
               en_tronco(math.pi * 1.5 + lado * 0.5, 1.33, 0.007, f.busto), en_tronco(math.pi * 1.5 - lado * 0.25, 1.24, 0.007, f.busto),
               en_tronco(math.pi * 1.5 - lado * 0.8, 1.2, 0.007, f.busto)]
        m.cinta(pts, 0.022, 0.0035, correa)
    cartuchera(f, 'Right', 0x4a3120, 0.15, 0x4a3120)
    bota = cuero(0x5a3d28)
    for l, p in f.piernas.items():
        p.hacer(m, bota, p.L0 + 0.13, p.fin + 0.02, 0.009, nu=16)
        for ds in (0.14, 0.24): f.aro_miembro(p, p.L0 + ds, 0.014, 0.011, 0x3a2617, 0.003)
        pie(m, l, bota, tacon=0.008, suela=0x1f1612)
    for l, b in f.brazos.items():
        mano(m, l, f.piel, guante=0x4a3120)
        b.hacer(m, cuero(0x4a3120, 0.03), b.fin - 0.05, b.fin + 0.008, 0.004)
    # El brazalete del brazo izquierdo y la pulsera dorada.
    f.aro_miembro(f.brazos['Left'], 0.085, 0.022, 0.003, 0xd8b04a, 0.0025)
    f.aro_miembro(f.brazos['Right'], f.brazos['Right'].fin - 0.07, 0.01, 0.003, 0xd8b04a, 0.002)
    return f

FIGURAS = {'jill': jill, 'claire': claire, 'ada': ada, 'rebecca': rebecca, 'sheva': sheva}

# --- de la malla a Blender, hornear y sacar los datos ---------------------------------
def a_objeto (bm, nombre):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nombre, me)
    # La malla está con Y arriba, como el .glb; en Blender arriba es Z.
    o.matrix_world = Matrix.Rotation(math.radians(90), 4, 'X')
    bpy.context.scene.collection.objects.link(o)
    # Los grupos con su nombre: al partir y volver a unir la malla (ver
    # `hornear`), Blender casa los pesos por nombre de grupo.
    for n in NOMBRES: o.vertex_groups.new(name=n)
    return o

def solo (o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

def material (nombre, imagen=None):
    mt = bpy.data.materials.new(nombre)
    mt.use_nodes = True
    n = mt.node_tree.nodes
    bsdf = n['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.72
    if imagen:
        tex = n.new('ShaderNodeTexImage')
        tex.image = imagen
        mt.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        attr = n.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        mt.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mt

def hornear (o, clave):
    # El color (sale de los vértices) y la oclusión (qué queda a la sombra: bajo
    # el pecho, entre la ropa y la piel, las axilas), en una sola textura.
    L = LADO_TEXTURA
    solo(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 64
    sc.render.bake.margin = 5
    if sc.world is None: sc.world = bpy.data.worlds.new('horno')
    sc.world.light_settings.distance = 0.14
    color = bpy.data.images.new('color', L, L, alpha=False)
    oclusion = bpy.data.images.new('oclusion', L, L, alpha=False)
    oclusion.colorspace_settings.name = 'Non-Color'
    t = o.data.materials[0].node_tree.nodes.new('ShaderNodeTexImage')
    o.data.materials[0].node_tree.nodes.active = t
    t.image = color
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    # La oclusión, sin las piezas «sin sombra» (material 1): se apartan en otro
    # objeto que no se hornea ni tapa, y luego se devuelven a la malla.
    for pol in o.data.polygons: pol.select = pol.material_index == 1
    aparte = None
    if any(pol.select for pol in o.data.polygons):
        bpy.context.tool_settings.mesh_select_mode = (False, False, True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        aparte = next(x for x in bpy.context.selected_objects if x is not o)
        aparte.hide_render = True
        solo(o)
    t.image = oclusion
    bpy.ops.object.bake(type='AO')
    if aparte:
        aparte.hide_render = False
        solo(aparte)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.join()
    C = np.array(color.pixels[:], dtype=np.float32).reshape(L, L, 4)[:, :, :3]
    A = np.array(oclusion.pixels[:], dtype=np.float32).reshape(L, L, 4)[:, :, 0]
    # Lo que en reposo queda DENTRO de otra pieza (el arranque del brazo metido en
    # el hombro, la piel bajo la ropa) sale negro del todo, y en cuanto el
    # esqueleto se mueve asoma: eso no es sombra, se deja a plena luz.
    A = np.where(A < 0.07, 1.0, A)
    for _ in range(2):
        A = (A + np.roll(A, 1, 0) + np.roll(A, -1, 0) + np.roll(A, 1, 1) + np.roll(A, -1, 1)) / 5
    # Y con suelo: una axila es sombra en reposo y deja de serlo al bajar el brazo.
    A = 0.42 + 0.58 * np.clip((A - 0.2) / (0.86 - 0.2), 0, 1) ** 0.9
    # La sombra tira a cálida: en gris ensucia la piel.
    tinte = np.array([0.5, 0.37, 0.39], dtype=np.float32)
    C *= tinte + (1 - tinte) * A[:, :, None]
    final = bpy.data.images.new('cuerpo-' + clave, L, L, alpha=False)
    final.pixels = np.dstack([C, np.ones((L, L), dtype=np.float32)]).ravel()
    final.filepath_raw = os.path.join(TRABAJO, clave + '.png')
    final.file_format = 'PNG'
    final.save()
    o.data.materials.clear()
    o.data.materials.append(material('cuerpo', final))
    for pol in o.data.polygons: pol.material_index = 0

def sacar (o, clave):
    # Un vértice por cada esquina distinta (posición + normal + UV), con sus
    # cuatro huesos por nombre: lo que `montar.mjs` mete en el .glb.
    me = o.data
    uv = me.uv_layers.active.data if me.uv_layers.active else None
    nor = me.corner_normals
    vistos, pos, normal, uvs, pesos, indices = {}, [], [], [], [], []
    for pol in me.polygons:
        for li in pol.loop_indices:
            vi = me.loops[li].vertex_index
            n = nor[li].vector
            u = uv[li].uv if uv else (0.0, 0.0)
            llave = (vi, round(n.x, 3), round(n.y, 3), round(n.z, 3), round(u[0], 5), round(u[1], 5))
            if llave not in vistos:
                vistos[llave] = len(pesos)
                v = me.vertices[vi]
                pos += [round(c, 5) for c in v.co]
                normal += [round(c, 4) for c in n]
                uvs += [round(u[0], 5), round(1 - u[1], 5)]
                gs = sorted(((g.weight, NOMBRES[g.group]) for g in v.groups), reverse=True)[:4]
                total = sum(w for w, _ in gs)
                pesos.append([[nombre, round(w / total, 4)] for w, nombre in gs])
            indices.append(vistos[llave])
    with open(os.path.join(TRABAJO, clave + '.json'), 'w', encoding='utf-8') as f:
        json.dump({'pos': pos, 'normal': normal, 'uv': uvs, 'pesos': pesos, 'indices': indices}, f, separators=(',', ':'))
    return len(pesos), len(indices) // 3

def fotos (clave):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.74, 0.76, 0.78, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.95
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
    sol.data.energy = 2.0
    sc.collection.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.62
    sc.render.resolution_x, sc.render.resolution_y = 620, 900
    for sufijo, ang, alza in (('1-frente', 0, 0.0), ('2-trescuartos', 40, 0.1), ('3-perfil', 90, 0.0), ('4-espalda', 180, 0.0), ('5-juego', 160, 0.75)):
        a = math.radians(ang)
        d = Vector((math.sin(a), -math.cos(a), alza)).normalized()
        cam.location = Vector((0.03, 0.05, 0.76)) + d * 6
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sol.rotation_euler = (Vector((0.35, 0, -0.5)) - d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(VISTAS, f'cuerpo-{clave}-{sufijo}.png')
        bpy.ops.render.render(write_still=True)

os.makedirs(TRABAJO, exist_ok=True)
for clave in ([a for a in ARGS if not a.startswith('--')] or list(FIGURAS)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fig = FIGURAS[clave]()
    o = a_objeto(fig.m.bm, 'cuerpo-' + clave)
    pintado = material('pintado')
    o.data.materials.append(pintado)
    o.data.materials.append(pintado)      # el hueco 1: las piezas «sin sombra»
    if '--rapido' not in ARGS:
        hornear(o, clave)
        nv, nt = sacar(o, clave)
        print(f'HECHO cuerpo {clave}: {nv} vertices, {nt} triangulos')
    else:
        print(f'PRUEBA cuerpo {clave}: {len(o.data.polygons)} triangulos')
    if '--vista' in ARGS: fotos(clave)
