# Las cabezas de los soldados, hechas en Blender.
#
# Isidro, 05/10/2026: «están bien, pero son algo falsos; quiero que sus caras sean
# más reconocibles». Eligió: solo Blender (sin modelos nuevos), el estilo de ahora
# pero mejor hecho, casco ABIERTO con la cara despejada, y que cada soldado sea
# alguien distinto. La primera tanda —rasgos de un solo color pegados al cráneo—
# no le gustó nada: «texturas poco detalladas, dale caras más amigables».
#
# Así que ahora la cabeza lleva TEXTURA, y va en dos mitades:
#
#   1. `node herramientas/cabezas/caras.mjs` DIBUJA la cara de cada uno (ojos,
#      cejas, boca, colorete, pecas, barba de tres días) como una ilustración.
#   2. Este guion hace la cabeza —cráneo redondo y simpático, orejas, cuello,
#      pelo, barba y casco abierto del color de la unidad—, le pone la cara
#      dibujada encima, HORNEA las sombras (lo que tapa el casco, bajo la nariz,
#      bajo el mentón) y lo guarda todo en una sola textura.
#
#   blender -b -P herramientas/blender/cabezas.py -- [--vista] [clave ...]
#
# Deja `public/models/cabeza-<clave>.glb` (un objeto `h_Head` con su textura) y,
# con --vista, fotos en `herramientas/blender/vistas/`. El juego quita la cabeza
# vieja del cuerpo de Meshy y cuelga esta del hueso `Head` (`ponerCabeza` en
# assets.js).
#
# Quién es cada uno está en `cabezas.json`, que leen las dos mitades.
#
# La cabeza se construye en coordenadas PROPIAS —origen en el eje de la cabeza a
# la altura de los ojos, Z arriba, la cara hacia -Y, en metros— y al final se
# escala y se lleva a su sitio sobre cada cuerpo.

import bpy, bmesh, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELOS = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'models'))
VISTAS = os.path.join(AQUI, 'vistas')
CARAS = os.path.join(VISTAS, 'caras')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

# --- la textura: a la izquierda la piel desenrollada, a la derecha todo lo demás ------
ANCHO, ALTO, PIEL = 2048, 1024, 1024
# Las mismas cuentas que `donde` en caras.mjs: si se toca una, se toca la otra.
RADIO, CENTRO, PX_RAD, PX_RAD_LADO, ARRIBA = 0.094, 0.95, 380.0, 121.0, 0.118
K = PX_RAD / RADIO

def uv_de (q, a=None):
    # Dónde cae en la textura un punto de la piel: el arco alrededor de la cabeza
    # en horizontal y la altura en vertical.
    if a is None: a = math.atan2(q.x, -q.y)
    u = abs(a) * PX_RAD if abs(a) <= CENTRO else CENTRO * PX_RAD + (abs(a) - CENTRO) * PX_RAD_LADO
    u = PIEL / 2 + math.copysign(min(u, PIEL / 2 - 1), a)
    v = min(ALTO - 1, max(1, (ARRIBA - q.z) * K))
    return (u / ANCHO, 1 - v / ALTO)

# --- color ---
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

# --- piezas sueltas -------------------------------------------------------------------
class Piezas:
    def __init__ (self):
        self.bm = bmesh.new()
        self.bm.loops.layers.color.new('Col')
        self.bm.loops.layers.uv.new('UVMap')

    def _pintar (self, viejas, col, suave):
        bm = self.bm
        nuevas = [f for f in bm.faces if f not in viejas]
        bmesh.ops.recalc_face_normals(bm, faces=nuevas)
        capa = bm.loops.layers.color['Col']
        c = rgb(col) if not isinstance(col, tuple) else col
        for f in nuevas:
            f.smooth = suave
            for l in f.loops:
                l[capa] = c

    def caja (self, c, tam, col, giro=(0, 0, 0), base=None, bisel=0.0):
        bm = self.bm
        viejas = set(bm.faces)
        R = (base if base is not None else Euler(giro).to_matrix()).to_4x4()
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*tam, 1)))
        if bisel:
            aristas = {e for f in bm.faces if f not in viejas for e in f.edges}
            bmesh.ops.bevel(bm, geom=list(aristas), offset=bisel, segments=2, affect='EDGES')
        self._pintar(viejas, col, bool(bisel))

    def bola (self, c, radios, col, u=14, v=9, giro=(0, 0, 0), base=None):
        bm = self.bm
        viejas = set(bm.faces)
        if isinstance(radios, (int, float)): radios = (radios,) * 3
        R = (base if base is not None else Euler(giro).to_matrix()).to_4x4()
        bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0,
                                  matrix=Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*radios, 1)))
        self._pintar(viejas, col, True)

    def cil (self, a, b, r, col, lados=12, r2=None):
        bm = self.bm
        viejas = set(bm.faces)
        a = Vector(a); b = Vector(b)
        q = (b - a).to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r if r2 is None else r2,
                              depth=(b - a).length, matrix=Matrix.Translation((a + b) / 2) @ q)
        self._pintar(viejas, col, True)

    def tira (self, pts, anchos, grosor, col, normales):
        # Una cinta que sigue varios puntos, con su ancho en cada uno y de una
        # pieza (no cajas sueltas): correas, el ribete del casco, el bigote.
        bm = self.bm
        viejas = set(bm.faces)
        n = len(pts)
        aros = []
        for i in range(n):
            p = Vector(pts[i])
            t = (Vector(pts[min(n - 1, i + 1)]) - Vector(pts[max(0, i - 1)])).normalized()
            nor = Vector(normales[i]).normalized()
            lado = nor.cross(t).normalized()
            w = anchos[i] / 2
            aros.append([bm.verts.new(p + lado * w + nor * grosor), bm.verts.new(p - lado * w + nor * grosor),
                         bm.verts.new(p - lado * w - nor * grosor * 0.4), bm.verts.new(p + lado * w - nor * grosor * 0.4)])
        for i in range(n - 1):
            for j in range(4):
                bm.faces.new([aros[i][j], aros[i][(j + 1) % 4], aros[i + 1][(j + 1) % 4], aros[i + 1][j]])
        if (Vector(pts[0]) - Vector(pts[-1])).length > 1e-4:
            bm.faces.new(aros[0][::-1]); bm.faces.new(aros[-1])
        self._pintar(viejas, col, True)

def ejes (n):
    # Ejes de una pieza apoyada en una superficie: Y sale por la normal.
    y = Vector(n).normalized()
    z = Vector((0, 0, 1)) - y * y.z
    if z.length < 1e-5: z = Vector((1, 0, 0))
    z.normalize()
    return Matrix((y.cross(z), y, z)).transposed()

# --- la cabeza ------------------------------------------------------------------------
SEG = 72      # alrededor
ANI = 54      # de abajo arriba

class Cabeza:
    def __init__ (self, p):
        self.p = p
        self.pz = Piezas()                 # todo menos la piel
        self.cr = bmesh.new()              # la piel, con la cara dibujada
        self.cr.loops.layers.color.new('Col')
        self.cr.loops.layers.uv.new('UVMap')
        self.rx, self.ry = p['ancho'], 0.098
        self.rz_arriba, self.rz_abajo = 0.115, 0.108
        self.z_nariz, self.z_boca, self.z_menton = -0.038, -0.062, -0.09
        self.ojo_x = p['ojo']['sep'] / 1000 * 0.97
        # Las cabezas REALISTAS (`real` en cabezas.json: las cinco de la caja
        # alienígena; Isidro: «quiero que sean más realistas, copia mejor las
        # caras»). Proporciones de una cara de verdad: más larga de los ojos al
        # mentón, con la nariz, la boca y la barbilla donde las tiene una persona.
        # Los MISMOS números que `Xr` en caras.mjs (RY, RZA, RZB).
        self.real = p.get('real') or None
        if self.real:
            r = self.real if isinstance(self.real, dict) else {}
            self.ry = 0.097
            self.rz_arriba, self.rz_abajo = 0.112, 0.110
            self.z_nariz = r.get('nariz', {}).get('punta', -37.5) / 1000
            self.z_boca = r.get('boca', {}).get('z', -62.5) / 1000
            self.z_menton = -0.094
            self.ojo_x = r.get('ojo', {}).get('sep', 31.5) / 1000

    # Más malla en la cara que en la nuca, que es donde hay forma.
    @staticmethod
    def azimut (i):
        u = (i / SEG) * 2 - 1
        return math.pi * (0.4 * u + 0.6 * u ** 3)

    def punto_real (self, phi, th, fuera=0.0):
        # La cabeza realista. Lo que cambia respecto a la de muñeco: la cara no se
        # recoge hacia el mentón como un huevo (por delante el fondo baja con la
        # RAÍZ del coseno: la barbilla queda a centímetro y medio de los labios,
        # no a cinco), las cuencas hunden un poco, y la nariz tiene puente,
        # punta y aletas. La boca y la barbilla llevan su relieve.
        p = self.p
        d = Vector((math.sin(phi) * math.cos(th), -math.cos(phi) * math.cos(th), math.sin(th)))
        x = self.rx * d.x
        y = self.ry * d.y
        z = (self.rz_arriba if d.z > 0 else self.rz_abajo) * d.z
        f = sm(0.0, 0.55, -d.y)
        s = max(0.0, min(1.0, -z / self.rz_abajo))
        if d.y < 0 and d.z < 0: y /= math.sqrt(max(0.004, math.cos(th)))
        x *= 1 - p['mandibula'] * s ** 2.5
        y *= 1 - (0.42 if d.y > 0 else 0.05) * s ** 2
        x *= 1 - 0.04 * sm(0.03, 0.1, z)
        ax = abs(x)
        dy = 0.0
        dy += 0.0042 * G(ax - self.ojo_x, 0.019) * G(z - 0.001, 0.011) * f
        dy -= 0.0022 * G(z - 0.017, 0.008) * sm(0.07, 0.03, ax) * f
        zt = self.z_nariz
        puente = max(0.0, min(1.0, (0.012 - z) / (0.012 - zt))) if z >= zt else 0.0
        dy -= p['nariz'] * (0.5 * puente ** 0.8 * G(x, 0.0062 + 0.002 * puente) + 0.62 * G(x, p['nariz_ancho']) * G(z - zt, 0.0085)) * f
        dy -= 0.0042 * G(ax - 0.0125, 0.0058) * G(z - (zt - 0.003), 0.0062) * f
        zb = self.z_boca
        dy -= 0.0050 * G(x, 0.026) * G(z - zb, 0.013) * f
        dy -= 0.0016 * G(x, 0.016) * G(z - (zb + 0.0045), 0.0035) * f
        dy -= 0.0022 * G(x, 0.017) * G(z - (zb - 0.0055), 0.004) * f
        dy += 0.0022 * G(x, 0.02) * G(z - (zb - 0.0165), 0.005) * f
        dy -= p['menton'] * G(x, 0.02) * G(z - self.z_menton, 0.014) * f
        dy -= 0.0035 * G(ax - 0.047, 0.022) * G(z + 0.024, 0.02) * f
        y += dy
        q = Vector((x, y, z))
        if callable(fuera): fuera = fuera(d, z)
        if fuera:
            q += Vector((d.x / self.rx, d.y / self.ry, d.z / self.rz_arriba)).normalized() * fuera
        return q, d, f

    def punto (self, phi, th, fuera=0.0):
        if self.real: return self.punto_real(phi, th, fuera)
        p = self.p
        d = Vector((math.sin(phi) * math.cos(th), -math.cos(phi) * math.cos(th), math.sin(th)))
        x = self.rx * d.x
        y = self.ry * d.y
        z = (self.rz_arriba if d.z > 0 else self.rz_abajo) * d.z
        f = sm(0.0, 0.55, -d.y)                     # cuánto mira hacia delante
        s = max(0.0, min(1.0, -z / self.rz_abajo))  # cuánto baja de los ojos
        # Mofletes llenos y mandíbula que solo se estrecha al final: una cara
        # redonda, que es la que cae simpática. La nuca se mete hacia el cuello.
        x *= 1 - p['mandibula'] * s ** 2.5
        y *= 1 - (0.42 if d.y > 0 else 0.05) * s ** 2
        x *= 1 - 0.04 * sm(0.03, 0.1, z)
        ax = abs(x)
        dy = 0.0
        # Los ojos van DIBUJADOS: la cuenca es apenas un hueco, o el dibujo se arruga.
        dy += 0.003 * G(ax - self.ojo_x, 0.022) * G(z - 0.002, 0.014) * f
        dy -= 0.003 * G(z - 0.021, 0.01) * sm(0.075, 0.04, ax) * f
        # Nariz chata y redonda: una bola en la punta y un puente bajo.
        zt = self.z_nariz
        puente = max(0.0, (0.01 - z) / (0.01 - zt)) if z >= zt else 0.0
        dy -= p['nariz'] * (0.3 * puente * G(x, 0.0075) + G(x, p['nariz_ancho']) * G(z - zt, 0.0105)) * f
        # El bulto de la boca, el mentón y los mofletes.
        dy -= 0.0045 * G(x, 0.03) * G(z - self.z_boca, 0.018) * f
        dy -= p['menton'] * G(x, 0.024) * G(z - self.z_menton, 0.016) * f
        dy -= 0.005 * G(ax - 0.044, 0.026) * G(z + 0.032, 0.024) * f
        y += dy
        q = Vector((x, y, z))
        if callable(fuera):                         # un grosor que cambia según el sitio (el pelo sin casco)
            fuera = fuera(d, z)
        if fuera:
            q += Vector((d.x / self.rx, d.y / self.ry, d.z / self.rz_arriba)).normalized() * fuera
        return q, d, f

    def rejilla (self, fuera=0.0):
        filas = []
        for j in range(ANI + 1):
            th = math.radians(-86 + 172 * j / ANI)
            filas.append([self.punto(self.azimut(i), th, fuera) for i in range(SEG)])
        return filas

    def craneo (self):
        bm = self.cr
        uv = bm.loops.layers.uv['UVMap']
        filas = self.rejilla()
        vs = [[bm.verts.new(q) for (q, d, f) in fila] for fila in filas]
        def angulo (j, i, cose):
            # En la costura de la nuca la última columna vale +π y no -π, o el
            # cuadro que cierra la vuelta cruzaría la textura entera.
            a = math.atan2(filas[j][i][0].x, -filas[j][i][0].y)
            return a + 2 * math.pi if cose and a < 0 else a
        for j in range(ANI):
            for i in range(SEG):
                k = (i + 1) % SEG
                esq = ((j, i, False), (j, k, k == 0), (j + 1, k, k == 0), (j + 1, i, False))
                cara = bm.faces.new([vs[a][b] for a, b, _ in esq])
                cara.smooth = True
                for l, (a, b, cose) in zip(cara.loops, esq):
                    l[uv].uv = uv_de(filas[a][b][0], angulo(a, b, cose))
        # Tapas: la coronilla y debajo del mentón (no se ven: casco y cuello).
        for j, signo in ((ANI, 1), (0, -1)):
            centro = bm.verts.new(sum((filas[j][i][0] for i in range(SEG)), Vector()) / SEG + Vector((0, 0, 0.002 * signo)))
            for i in range(SEG):
                k = (i + 1) % SEG
                orden = [(i, False), (k, k == 0)] if signo > 0 else [(k, k == 0), (i, False)]
                cara = bm.faces.new([vs[j][orden[0][0]], vs[j][orden[1][0]], centro])
                cara.smooth = True
                us = [uv_de(filas[j][b][0], angulo(j, b, cose)) for b, cose in orden]
                for l, u in zip(cara.loops, us + [us[0]]): l[uv].uv = u
        bm.normal_update()
        self.bvh = BVHTree.FromBMesh(bm)

    # Sobre la cara: el punto a (x, z) visto de frente, y el de un azimut a una altura.
    def cara (self, x, z, fuera=0.0):
        q, n, _, _ = self.bvh.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
        if n.y > 0: n = -n
        return q + n * fuera, n

    def lado (self, a, z, fuera=0.0):
        d = Vector((math.sin(a), -math.cos(a), 0))
        q = None
        # Por debajo del mentón el rayo ya no toca: se sube hasta que toque.
        while q is None:
            q, n, _, _ = self.bvh.ray_cast(Vector((0, 0, z)) + d * 0.6, -d)
            z += 0.004
        if n.dot(d) < 0: n = -n
        return q + n * fuera, n

    def zona_pelo (self, q, d):
        # Positivo donde nace el pelo: sobre la frente, la patilla delante de la
        # oreja y la nuca. La misma línea que `lineaPelo` en caras.mjs.
        a = abs(math.atan2(d.x, -d.y))
        linea = 0.066 if a < 0.85 else (0.066 - (a - 0.85) / 0.35 * 0.09 if a < 1.2 else (-0.024 if a < 1.5 else -0.024 - sm(1.5, 2.2, a) * 0.05))
        linea += self.p.get('entradas', 0.0) * G(a - 0.62, 0.22)
        # El flequillo, para las que van sin casco: el pelo baja sobre la frente.
        fl = self.p.get('flequillo_pelo')
        if fl and a < 1.25:
            s = math.atan2(d.x, -d.y)                # con signo: + hacia su izquierda (la derecha de quien mira)
            cae = sm(1.25, 0.8, a)
            if fl['tipo'] == 'lado':
                # Ladeado: nace en la raya y va cayendo hacia el otro lado.
                t = sm(fl.get('raya', -0.5), fl.get('raya', -0.5) + 1.2, s * fl.get('hacia', 1))
                linea -= fl['baja'] * (0.15 + 0.85 * t) * cae
            else:
                # Recto, con la raya en medio si la lleva.
                linea -= (fl['baja'] - fl.get('raya_medio', 0.0) * G(s, 0.1)) * cae
        return q.z - linea

    def casquete (self, filas, campo, col):
        # La parte de la rejilla donde `campo(q, d)` es positivo. Los cuadros que
        # el borde cruza se RECORTAN por donde el campo vale cero: metiendo o
        # quitando cuadros enteros, la patilla y la barba salían en escalera.
        bm = self.pz.bm
        capa = bm.loops.layers.color['Col']
        vs = {}
        def v (j, i):
            if (j, i) not in vs: vs[(j, i)] = bm.verts.new(filas[j][i][0])
            return vs[(j, i)]
        val = [[campo(q, d) for (q, d, f) in fila] for fila in filas]
        for j in range(ANI):
            for i in range(SEG):
                k = (i + 1) % SEG
                esq = ((j, i), (j, k), (j + 1, k), (j + 1, i))
                vals = [val[a][b] for a, b in esq]
                if all(x <= 0 for x in vals): continue
                if all(x > 0 for x in vals):
                    cara = bm.faces.new([v(a, b) for a, b in esq])
                    cara.smooth = True
                    for l, (a, b) in zip(cara.loops, esq): l[capa] = col(*filas[a][b])
                    continue
                pol = []
                for n in range(4):
                    (a0, b0), (a1, b1) = esq[n], esq[(n + 1) % 4]
                    x0, x1 = vals[n], vals[(n + 1) % 4]
                    p0, p1 = filas[a0][b0], filas[a1][b1]
                    if x0 > 0: pol.append(p0)
                    if (x0 > 0) != (x1 > 0):
                        t = x0 / (x0 - x1)
                        pol.append((p0[0].lerp(p1[0], t), p0[1].lerp(p1[1], t), p0[2] + (p1[2] - p0[2]) * t))
                if len(pol) < 3: continue
                cara = bm.faces.new([bm.verts.new(q) for (q, d, f) in pol])
                cara.smooth = True
                for l, (q, d, f) in zip(cara.loops, pol): l[capa] = col(q, d, f)

    # --- lo que no es piel dibujada ---
    def orejas_y_cuello (self):
        p, pz = self.p, self.pz
        piel = hexa(p['piel'])
        # Con media melena las orejas van tapadas: si se hacen, asoman por fuera del pelo.
        tapadas = (p.get('suelto') or {}).get('lados', 0.0) >= 0.05
        for lado in (() if tapadas else (-1, 1)):
            q, n = self.lado(lado * 1.6, -0.02)
            giro = (0, lado * 0.2, lado * -0.3)
            if self.real:
                # Más pequeñas y pegadas: las de las demás son de muñeco, grandes y abiertas.
                pz.bola(q + n * 0.001, (0.007, 0.013, 0.026), rgb(piel, 0.97), 14, 10, giro=(0, lado * 0.1, lado * -0.2))
                pz.bola(q + n * 0.0065 + Vector((0, -0.003, 0.002)), (0.003, 0.007, 0.015), rgb(piel, 0.72), 10, 8, giro=(0, lado * 0.1, lado * -0.2))
                continue
            pz.bola(q + n * 0.005, (0.01, 0.018, 0.03), rgb(piel, 0.97), 14, 10, giro=giro)
            pz.bola(q + n * 0.012 + Vector((0, -0.004, 0.002)), (0.004, 0.009, 0.018), rgb(piel, 0.7), 10, 8, giro=giro)
        r = p['cuello']
        pz.cil((0, 0.024, -0.2), (0, 0.012, -0.075), r * 1.1, rgb(piel, 0.96), 20, r2=r)
        # La braga al cuello: tapa la unión con el cuerpo de Meshy, donde quedan
        # los restos del cuello alto que traía cada modelo. Con capucha no hace falta.
        # Ni con los cuerpos hechos aquí (`cuerpos.py`), que traen su cuello y
        # sus hombros al aire: `"braga": false`.
        if p.get('capucha') or p.get('braga') is False: return
        col = hexa(p.get('braga', '#5b6140'))
        bm = pz.bm
        capa = bm.loops.layers.color['Col']
        # Ceñida: más ancha quedaba como un babero por delante del pecho.
        perfil = [(r + 0.006, -0.106), (r + 0.016, -0.114), (r + 0.023, -0.132), (r + 0.026, -0.154), (r + 0.021, -0.176), (r + 0.008, -0.186)]
        N = 28
        aros = []
        for (radio, z) in perfil:
            aro = []
            for i in range(N):
                a = 2 * math.pi * i / N
                # Los pliegues de la tela, y algo más ancha de hombro a hombro.
                rr = radio * (1 + 0.05 * math.sin(a * 5 + z * 60))
                aro.append((bm.verts.new((rr * 1.1 * math.sin(a), 0.018 - rr * math.cos(a), z + 0.003 * math.sin(a * 3))), a, z))
            aros.append(aro)
        nuevas = []
        for j in range(len(aros) - 1):
            for i in range(N):
                k = (i + 1) % N
                esq = (aros[j][i], aros[j][k], aros[j + 1][k], aros[j + 1][i])
                cara = bm.faces.new([e[0] for e in esq])
                cara.smooth = True
                nuevas.append(cara)
                for l, e in zip(cara.loops, esq):
                    l[capa] = rgb(col, 0.9 + 0.12 * math.sin(e[1] * 5 + e[2] * 60) + 0.5 * (e[2] + 0.15))
        bmesh.ops.recalc_face_normals(bm, faces=nuevas)

    def pelo (self):
        p, pz = self.p, self.pz
        estilo = p.get('peinado', 'corto')
        if estilo == 'rapado': return
        col = hexa(p['pelo'])
        baja = 0.075 if estilo == 'melena' else 0.0
        # Sin casco (`suelto`): el pelo se ve entero, así que lleva volumen arriba
        # y, si es media melena, cae por los lados desde la sien hasta donde diga.
        suelto = p.get('suelto')
        lados = (suelto or {}).get('lados', 0.0)       # hasta dónde baja por los lados (m bajo los ojos)
        desde = (suelto or {}).get('desde', 1.05)       # a partir de qué ángulo cae (1 = por delante de la oreja)
        def campo (q, d):
            a = abs(math.atan2(d.x, -d.y))
            c = self.zona_pelo(q, d)
            # La melena baja por detrás de la oreja hasta la mandíbula.
            if baja: c = max(c, min((a - 1.75) * 0.05, q.z + baja + 0.02))
            if lados: c = max(c, min((a - desde) * 0.05, q.z + lados))
            return c
        def tono (q, d, f):
            # Mechones: bandas de tono que siguen la cabeza, más clara arriba, y el
            # brillo del pelo a media altura.
            a = math.atan2(d.x, -d.y)
            brillo = 0.16 * G(d.z - 0.62, 0.16) if suelto else 0.0
            if self.real:
                # Mechones más finos y menos marcados: con las bandas anchas de las
                # demás, el pelo de una cara realista parecía un gorro de lana.
                return rgb(col, (0.84 + 0.2 * d.z + brillo * 0.8) * (1 + 0.075 * math.sin(a * 31 + q.z * 55) * math.sin(q.z * 90 + a * 5) + 0.045 * math.sin(a * 17 - q.z * 30)))
            return rgb(col, (0.86 + 0.2 * d.z + brillo) * (1 + 0.16 * math.sin(a * 29 + q.z * 40) * math.sin(q.z * 120 + a * 3)))
        if suelto:
            vol = suelto.get('volumen', 0.012)
            # Más grueso en la coronilla y en las puntas (que se abren), fino en el nacimiento.
            grosor = lambda d, z: 0.005 + vol * sm(-0.25, 0.7, d.z) + (0.009 * sm(-0.01, -0.07, z) if lados else 0.0)
            self.casquete(self.rejilla(grosor), campo, tono)
        else:
            self.casquete(self.rejilla(0.007), campo, tono)
        for lado in (suelto or {}).get('mechones', ()):                 # mechones sueltos por delante de la oreja
            # Una cinta de una pieza que se afina hacia la punta: hecho de bolas
            # en fila parecía una trenza.
            pts, anchos, normales = [], [], []
            largo = suelto.get('mechon_largo', 0.115)
            for k in range(10):
                t = k / 9
                q, n = self.lado(lado * (1.0 - 0.07 * t), 0.04 - largo * t)
                pts.append(q + n * 0.002); normales.append(n)
                anchos.append(0.015 * (1 - 0.75 * t * t) * (0.55 + 0.45 * min(1, t * 5)))
            pz.tira(pts, anchos, 0.0035, rgb(col, 0.97), normales)
        atras = self.ry
        goma = hexa(p.get('goma', '#2a2a2a'))
        if estilo == 'coleta':
            # Muchas y muy solapadas: con seis se contaban las bolas, como una trenza.
            for k in range(13):
                t = k / 12
                pz.bola((0, atras + 0.014 + 0.024 * math.sin(t * 2.3), -0.018 - t * 0.14), (0.026 - 0.013 * t, 0.023 - 0.01 * t, 0.034), rgb(col, 1.0 - 0.12 * t), 12, 8)
            pz.bola((0, atras + 0.008, -0.01), (0.019, 0.015, 0.012), goma, 10, 6)
        if estilo == 'mono':
            pz.bola((0, atras + 0.014, -0.045), (0.038, 0.032, 0.035), rgb(col, 0.95), 14, 10)
            pz.bola((0, atras, -0.03), (0.023, 0.017, 0.014), goma, 10, 6)
        if estilo == 'melena':
            for lado in (-1, 1):
                for k in range(5):
                    t = k / 4
                    q, n = self.lado(lado * (1.9 + 0.12 * t), -0.015 - 0.085 * t)
                    pz.bola(q + n * 0.006, (0.017, 0.03 - 0.008 * t, 0.032), rgb(col, 1.0 - 0.1 * t), 12, 8)
        # Flequillo: mechones planos que asoman bajo el casco, cada uno hacia un lado.
        n = p.get('flequillo', 0)
        for k in range(n):
            t = (k + 0.5) / n * 2 - 1
            q, nor = self.cara(t * 0.052, 0.052 - 0.012 * abs(t), 0.006)
            giro = t * 0.55 + p.get('flequillo_giro', 0.0)
            pz.bola(q, (0.014, 0.0065, 0.027), rgb(col, 0.96 + 0.1 * math.sin(k * 2.3)), 10, 7, base=ejes(nor) @ Euler((0, giro, 0)).to_matrix())

    def barba (self):
        p = self.p
        estilo = p.get('barba')
        if not estilo: return
        col = hexa(p.get('barba_color', p['pelo']))
        if estilo == 'bigote':
            self.bigote(col)
            return
        zb, zn = self.z_boca, self.z_nariz
        # El hueco de la boca: la boca va dibujada debajo, y hay que dejarla ver.
        w = p['boca']['ancho'] / 1000 + 0.004
        alto = (p['boca'].get('abre', 12) + 5) / 1000 if p['boca']['tipo'] == 'risa' else 0.011
        def campo (q, d):
            a = abs(math.atan2(d.x, -d.y))
            x, z = abs(q.x), q.z
            frente = (0.95 - a) * 0.05
            bigote = min(w + 0.006 - x, z - (zb + 0.0075), (zn - 0.005) - z, frente)
            perilla = min(0.022 - x, (zb - alto - 0.004) - z, frente)
            if estilo == 'perilla':
                guias = min(x - w + 0.001, w + 0.009 - x, z - (zb - 0.034), (zb + 0.01) - z, frente)
                return max(bigote, perilla, guias)
            # Barba cerrada: de la patilla al mentón, dejando la boca y los mofletes.
            linea = -0.042 - 0.03 * sm(0.5, 1.5, a) + 0.035 * sm(1.2, 1.6, a)
            lleno = min(linea - z, (1.72 - a) * 0.05)
            boca = min(w - x, z - (zb - alto), (zb + 0.0075) - z)
            return max(bigote, min(lleno, -boca))
        def tono (q, d, f):
            return rgb(col, (0.9 + 0.12 * d.z) * (1 + 0.06 * math.sin(q.x * 180 + q.z * 40) * math.sin(q.z * 150)))
        self.casquete(self.rejilla(p.get('barba_largo', 0.0065)), campo, tono)

    def bigote (self, col):
        # Dos guías que salen de debajo de la nariz y caen más allá de las comisuras.
        zb, zn = self.z_boca, self.z_nariz
        w = self.p['boca']['ancho'] / 1000
        for lado in (-1, 1):
            pts, ns = [], []
            for x, z in ((0.0, zn - 0.0125), (0.008, zn - 0.014), (w * 0.75, zb + 0.0125), (w + 0.004, zb + 0.007), (w + 0.011, zb - 0.005), (w + 0.0135, zb - 0.014)):
                q, n = self.cara(lado * x, z, 0.003)
                pts.append(q); ns.append(n)
            self.pz.tira(pts, [0.0075, 0.0095, 0.0105, 0.0085, 0.0055, 0.002], 0.0045, rgb(col, 1.05), ns)

    def casco (self):
        p, pz = self.p, self.pz
        col = hexa(p['casco'])
        oscuro = rgb(col, 0.6)
        negro = 0x22252a
        cz, cy = 0.028, 0.004
        hx, hy, hz = self.rx + 0.023, self.ry + 0.025, 0.142
        def borde (a):
            # A qué altura acaba el casco: alto en la frente, baja por las sienes y cubre la nuca.
            a = abs(a)
            return 0.052 - 0.05 * sm(0.75, 1.5, a) - 0.024 * sm(1.9, 2.6, a)
        def sobre (a, z, fuera=0.0):
            th = math.asin(max(-1, min(1, (z - cz) / hz)))
            d = Vector((math.sin(a) * math.cos(th), -math.cos(a) * math.cos(th), math.sin(th)))
            return Vector((hx * d.x, cy + hy * d.y, cz + hz * d.z)) + d * fuera, d
        bm = pz.bm
        capa = bm.loops.layers.color['Col']
        N, M = 48, 12
        filas = []
        for j in range(M + 1):
            fila = []
            for i in range(N):
                a = -math.pi + 2 * math.pi * i / N
                th0 = math.asin(max(-1, min(1, (borde(a) - cz) / hz)))
                th = th0 + (math.radians(86) - th0) * j / M
                d = Vector((math.sin(a) * math.cos(th), -math.cos(a) * math.cos(th), math.sin(th)))
                # La visera: el borde de delante se adelanta y se abre un poco.
                vis = 0.014 * sm(1.0, 0.0, abs(a)) * (1 - j / M) ** 3
                fila.append((Vector((hx * d.x, cy + hy * d.y - vis, cz + hz * d.z)), d, a))
            filas.append(fila)
        vs = [[bm.verts.new(q) for (q, d, a) in fila] for fila in filas]
        def tono (q, d, a):
            # La funda de tela: más clara arriba, con sus costuras y un poco de desgaste.
            k = 0.84 + 0.2 * d.z
            k *= 1 - 0.14 * G(math.sin(a), 0.03) * sm(0.15, 0.5, d.z)
            k *= 1 - 0.1 * G(d.z - 0.55, 0.035)
            k *= 1 + 0.05 * math.sin(a * 7 + d.z * 9) * math.sin(d.z * 23 + a * 2)
            return rgb(col, k)
        for j in range(M):
            for i in range(N):
                k = (i + 1) % N
                cara = bm.faces.new([vs[j][i], vs[j][k], vs[j + 1][k], vs[j + 1][i]])
                cara.smooth = True
                for l, (jj, ii) in zip(cara.loops, ((j, i), (j, k), (j + 1, k), (j + 1, i))): l[capa] = tono(*filas[jj][ii])
        cima = bm.verts.new((0, cy, cz + hz))
        for i in range(N):
            cara = bm.faces.new([vs[M][i], vs[M][(i + 1) % N], cima])
            cara.smooth = True
            for l in cara.loops: l[capa] = rgb(col, 1.04)
        # Por dentro, para que bajo la visera no se vea hueco: la cáscara del revés y oscura.
        dentro = [bm.verts.new(Vector((q.x * 0.9, q.y * 0.9 + 0.004, q.z + 0.014))) for (q, d, a) in filas[0]]
        for i in range(N):
            k = (i + 1) % N
            cara = bm.faces.new([vs[0][k], vs[0][i], dentro[i], dentro[k]])
            for l in cara.loops: l[capa] = rgb(col, 0.3)
        # El ribete del borde, de una pieza.
        aro = [filas[0][i % N] for i in range(N + 1)]
        pz.tira([q for (q, d, a) in aro], [0.012] * (N + 1), 0.0045, oscuro, [d for (q, d, a) in aro])
        # Los tornillos de la funda y los carriles de los lados.
        for a in (-2.35, -0.95, 0.95, 2.35):
            q, d = sobre(a, 0.078, 0.001)
            pz.bola(q, (0.0065, 0.003, 0.0065), negro, 10, 5, base=ejes(d))
        for lado in (-1, 1):
            tramo = [sobre(lado * (1.15 + 0.85 * i / 6), 0.03, 0.0025) for i in range(7)]
            pz.tira([q for q, d in tramo], [0.011] * 7, 0.004, negro, [d for q, d in tramo])
        # El barboquejo: dos cintas que bajan de la sien y de detrás de la oreja, se
        # juntan bajo ella y van al mentón por detrás del moflete. No tapa la cara.
        if p.get('barboquejo', True):
            for lado in (-1, 1):
                nudo, _ = self.lado(lado * 1.42, -0.05, 0.004)
                for a0 in (1.12, 1.98):
                    arriba, d0 = sobre(lado * a0, borde(a0) + 0.004)
                    medio, n1 = self.lado(lado * (a0 * 0.4 + 1.42 * 0.6), -0.02, 0.005)
                    pz.tira([arriba, medio, nudo], [0.009, 0.0085, 0.008], 0.0022, negro, [d0, n1, n1])
                pts, ns = [], []
                for a, z in ((1.42, -0.05), (1.22, -0.074), (0.85, -0.094), (0.4, -0.104), (0.0, -0.107)):
                    q, n = self.lado(lado * a, z, 0.0035)
                    pts.append(q); ns.append(n)
                pz.tira(pts, [0.008] * 5, 0.0022, negro, ns)
            q, n = self.lado(1.3, -0.065, 0.006)
            pz.caja(q, (0.012, 0.005, 0.014), 0x8e959c, base=ejes(n), bisel=0.0015)
        # Lo que distingue un casco de otro.
        extra = p.get('casco_extra', ())
        if 'gafas' in extra:
            cinta = [sobre(-math.pi + 2 * math.pi * i / 32, 0.094, 0.003) for i in range(33)]
            pz.tira([q for q, d in cinta], [0.017] * 33, 0.003, 0x1d2024, [d for q, d in cinta])
            cristal = hexa(p.get('gafas_color', '#e0912a'))
            for lado in (-1, 1):
                q, d = sobre(lado * 0.36, 0.096)
                pz.caja(q + d * 0.012, (0.06, 0.024, 0.042), 0x2a2e33, base=ejes(d), bisel=0.009)
                pz.caja(q + d * 0.0235, (0.046, 0.008, 0.028), cristal, base=ejes(d), bisel=0.003)
            q, d = sobre(0.0, 0.096)
            pz.caja(q + d * 0.01, (0.03, 0.016, 0.02), 0x2a2e33, base=ejes(d), bisel=0.004)
        if 'red' in extra:
            # Banda de tela con hojas metidas: el casco del tirador.
            cinta = [sobre(-math.pi + 2 * math.pi * i / 32, 0.086, 0.003) for i in range(33)]
            pz.tira([q for q, d in cinta], [0.021] * 33, 0.003, 0x4c5332, [d for q, d in cinta])
            for i in range(11):
                q, d = sobre(-2.8 + i * 0.56, 0.1 + 0.02 * math.sin(i * 2.1), 0.005)
                pz.bola(q, (0.011, 0.004, 0.028), 0x5d6f3a if i % 2 else 0x7d8a4a, 10, 6, base=ejes(d) @ Euler((0, 0.6 * math.sin(i * 1.7), 0)).to_matrix())
        if 'placa' in extra:
            q, d = sobre(0.0, 0.12)
            pz.caja(q + d * 0.005, (0.036, 0.013, 0.03), 0x1d2024, base=ejes(d), bisel=0.004)
            pz.caja(q + d * 0.012, (0.02, 0.004, 0.012), 0x565c63, base=ejes(d), bisel=0.002)
        if 'estrella' in extra:
            q, d = sobre(0.0, 0.106)
            b = ejes(d)
            pz.bola(q + d * 0.002, (0.016, 0.004, 0.016), 0xf0cf52, 5, 3, base=b)
            pz.bola(q + d * 0.004, (0.007, 0.004, 0.007), 0xfff1a8, 8, 4, base=b)
        if 'cascos' in extra:
            for lado in (-1, 1):
                q, n = self.lado(lado * 1.6, -0.018, 0.014)
                pz.bola(q, (0.02, 0.031, 0.037), 0x1d2024, 14, 9)
                pz.bola(q + n * 0.012, (0.011, 0.02, 0.025), 0x3a3f46, 12, 7)
            q, n = self.lado(1.6, -0.04, 0.022)
            m, n1 = self.lado(1.0, -0.068, 0.02)
            b, n2 = self.cara(0.034, self.z_boca - 0.004, 0.022)
            pz.tira([q, m, b], [0.0045] * 3, 0.0022, 0x1d2024, [n, n1, n2])
            pz.bola(b, (0.011, 0.009, 0.009), 0x2c3036, 10, 7)

    def capucha (self):
        # El Arquero: capucha de tela en vez de casco, abierta por delante y con
        # su pico atrás. Cae hasta los hombros.
        p, pz = self.p, self.pz
        col = hexa(p['capucha'])
        bm = pz.bm
        capa = bm.loops.layers.color['Col']
        cz, cy = 0.02, 0.012
        hx, hy, hz = self.rx + 0.03, self.ry + 0.034, 0.15
        N, M = 48, 14
        def borde (a):
            a = abs(a)
            return 0.06 - 0.2 * sm(0.5, 1.25, a)      # abierta en la cara, hasta los hombros por los lados
        filas = []
        for j in range(M + 1):
            fila = []
            for i in range(N):
                a = -math.pi + 2 * math.pi * i / N
                z0 = borde(a)
                z = z0 + (cz + hz * 0.995 - z0) * (j / M) ** 0.8
                th = math.asin(max(-1, min(1, (max(z, cz - hz * 0.3) - cz) / hz)))
                r = math.cos(th)
                # Por debajo de la cabeza la tela cae recta y se abre hacia los hombros.
                cae = max(0.0, (cz - hz * 0.3) - z)
                ancho = 1 + cae * 1.6
                pico = 0.03 * sm(2.2, 3.1, abs(a)) * sm(0.05, 0.14, z)
                q = Vector((hx * math.sin(a) * r * ancho, cy + hy * -math.cos(a) * r * ancho + pico, z))
                # El borde de delante se adelanta, como una visera blanda.
                q.y -= 0.02 * sm(1.1, 0.2, abs(a)) * (1 - j / M) ** 2
                # Pliegues de la tela.
                q += Vector((math.sin(a), -math.cos(a), 0)) * 0.004 * math.sin(a * 9 + z * 30) * (1 - j / M)
                fila.append((q, Vector((math.sin(a) * r, -math.cos(a) * r, math.sin(th))), a))
            filas.append(fila)
        vs = [[bm.verts.new(q) for (q, d, a) in fila] for fila in filas]
        def tono (q, d, a):
            return rgb(col, (0.82 + 0.22 * max(0, d.z)) * (1 + 0.1 * math.sin(a * 9 + q.z * 30)))
        for j in range(M):
            for i in range(N):
                k = (i + 1) % N
                esq = ((j, i), (j, k), (j + 1, k), (j + 1, i))
                for orden, oscuro in ((esq, 1.0), (esq[::-1], 0.42)):       # por fuera y por dentro
                    if oscuro < 1:
                        # El forro: la misma tela, metida hacia dentro (hacia el eje, no
                        # hacia el origen: encogiéndola asomaba por fuera en la caída).
                        cara = bm.faces.new([bm.verts.new(filas[jj][ii][0] - Vector((math.sin(filas[jj][ii][2]), -math.cos(filas[jj][ii][2]), 0)) * 0.004) for jj, ii in orden])
                    else:
                        cara = bm.faces.new([vs[jj][ii] for jj, ii in orden])
                    cara.smooth = True
                    for l, (jj, ii) in zip(cara.loops, orden):
                        c = tono(*filas[jj][ii])
                        l[capa] = (c[0] * oscuro, c[1] * oscuro, c[2] * oscuro, 1.0)
        aro = [filas[0][i % N] for i in range(N + 1)]
        pz.tira([q for (q, d, a) in aro], [0.012] * (N + 1), 0.003, rgb(col, 0.66), [d for (q, d, a) in aro])

    def parche (self):
        # El parche del Capitán, con su cinta cruzando la frente.
        lado = self.p.get('parche')
        if not lado: return
        pz = self.pz
        q, n = self.cara(lado * self.ojo_x, 0.001, 0.004)
        pz.bola(q, (0.02, 0.0055, 0.017), 0x16171a, 16, 8, base=ejes(n))
        # Muchos puntos y bien separada de la piel: con seis, entre punto y punto
        # la cinta atajaba por dentro de la cara y solo asomaba a trozos.
        pts, ns = [], []
        for i in range(17):
            t = i / 16
            r, m = self.lado(lado * (1.45 - 2.85 * t), 0.046 - 0.086 * t, 0.0035)
            pts.append(r); ns.append(m)
        pz.tira(pts, [0.0055] * 17, 0.0016, 0x16171a, ns)

    def adornos (self):
        p, pz = self.p, self.pz
        if p.get('aros'):
            # Pendientes de aro: un anillo de cuentas doradas bajo cada oreja.
            for lado in (-1, 1):
                q, n = self.lado(lado * 1.6, -0.046, 0.008)
                for k in range(10):
                    a = 2 * math.pi * k / 10
                    pz.bola(q + Vector((0, 0.013 * math.cos(a), -0.013 + 0.013 * math.sin(a))), 0.0034, hexa(p['aros']), 6, 4)
        if p.get('gargantilla'):
            r = p['cuello'] + 0.003
            # En las cabezas realistas el mentón baja más y la cabeza va más alta:
            # la gargantilla se pone a media altura del cuello que queda a la vista.
            zg = -0.128 if self.real else -0.098
            aro = [(Vector((r * 1.02 * math.sin(2 * math.pi * k / 24), 0.019 - r * math.cos(2 * math.pi * k / 24), zg)),
                    Vector((math.sin(2 * math.pi * k / 24), -math.cos(2 * math.pi * k / 24), 0))) for k in range(25)]
            pz.tira([q for q, n in aro], [0.009] * 25, 0.0018, hexa(p['gargantilla']), [n for q, n in aro])
        if p.get('cinta'):
            # Una cinta en la frente, atada atrás: va por encima del pelo.
            aro = []
            for k in range(33):
                q, n = self.lado(-math.pi + 2 * math.pi * k / 32, 0.058, 0.019)
                aro.append((q, n))
            pz.tira([q for q, n in aro], [0.017] * 33, 0.0022, hexa(p['cinta']), [n for q, n in aro])

    def hacer (self):
        self.craneo()
        self.orejas_y_cuello()
        self.pelo()
        self.barba()
        self.parche()
        self.adornos()
        if self.p.get('capucha'): self.capucha()
        elif self.p.get('casco'): self.casco()

# ======================================================================================
def unir (a, b):
    r = dict(a)
    for k, v in b.items():
        r[k] = {**a[k], **v} if isinstance(v, dict) and isinstance(a.get(k), dict) else v
    return r

with open(os.path.join(AQUI, 'cabezas.json'), encoding='utf-8') as f:
    CFG = json.load(f)
PERSONAJES = {k: unir(CFG['base'][p['de']], p) for k, p in CFG['personajes'].items()}

# Cuánto hay que subir del arranque del cuello para dar algo por «cuello alto
# viejo» y quitarlo. Tres cuerpos lo traían grande y bajo (un cuello vuelto, una
# capucha recogida) y necesitan cortar antes; con el corte general asomaban
# picos alrededor de la braga. Los MISMOS números que `CUELLO_ALTO` en assets.js.
CUELLO_ALTO = {'soldado-escopeta-f': 0.02, 'soldado-escopeta-m': 0.03, 'soldado-fusil-f': 0.03}

def sin_cabeza (malla, cuello, alto=0.075):
    # Quita del cuerpo los triángulos de la cabeza y el cuello viejos: los que
    # mandan `Head` o `neck`, y lo que quede por encima del arranque del cuello
    # cerca de su eje (dos escalones: pegado al eje, todo lo que suba; algo más
    # lejos, solo lo que suba mucho —capuchas y cuellos altos—). La MISMA regla
    # que `quitarCabeza` en assets.js, o estas fotos no serían lo que se ve allí.
    cabeza = {g.index for g in malla.vertex_groups if g.name in ('Head', 'head_end', 'headfront', 'neck')}
    ev = malla.evaluated_get(bpy.context.evaluated_depsgraph_get())
    donde = [ev.matrix_world @ v.co for v in ev.data.vertices]
    quita = []
    for v, q in zip(malla.data.vertices, donde):
        manda = max(v.groups, key=lambda g: g.weight).group in cabeza if v.groups else False
        r = math.hypot(q.x - cuello.x, q.y - cuello.y)
        quita.append(manda or (r < 0.1 and q.z > cuello.z + 0.008) or (r < 0.2 and q.z > cuello.z + alto))
    bm = bmesh.new()
    bm.from_mesh(malla.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(quita[v.index] for v in f.verts)], context='FACES')
    bm.to_mesh(malla.data)
    bm.free()

def a_objeto (bm, nombre):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(o)
    return o

def solo (o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

def desplegar (o):
    # El resto de la cabeza (pelo, casco, orejas…) a la franja derecha de la textura.
    solo(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(72), island_margin=0.006)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = o.data.uv_layers.active.data
    for l in uv:
        l.uv = ((PIEL + 8 + l.uv[0] * (ANCHO - PIEL - 16)) / ANCHO, 0.006 + l.uv[1] * 0.988)

def material (nombre, imagen=None, color_vertice=False):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    n = m.node_tree.nodes
    bsdf = n['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.78
    if color_vertice:
        attr = n.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        m.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    if imagen:
        tex = n.new('ShaderNodeTexImage')
        tex.image = imagen
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m

def hornear (o, clave):
    # Dos pasadas sobre la textura entera: el COLOR de lo que no es piel (sale de
    # los vértices) y la OCLUSIÓN de todo (qué rincones quedan a la sombra).
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 96
    sc.render.bake.margin = 6
    # Solo cuenta lo que tapa de CERCA (el ala del casco, la nariz, el cuello de
    # la ropa): con la distancia por defecto, los hombros oscurecían toda la cara.
    if sc.world is None: sc.world = bpy.data.worlds.new('horno')
    sc.world.light_settings.distance = 0.16
    color =bpy.data.images.new('color', ANCHO, ALTO, alpha=False)
    oclusion = bpy.data.images.new('oclusion', ANCHO, ALTO, alpha=False)
    oclusion.colorspace_settings.name = 'Non-Color'
    nodos = []
    for m in o.data.materials:
        t = m.node_tree.nodes.new('ShaderNodeTexImage')
        m.node_tree.nodes.active = t
        nodos.append(t)
    solo(o)
    for t in nodos: t.image = color
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    for t in nodos: t.image = oclusion
    bpy.ops.object.bake(type='AO')

    def pixeles (img):
        return np.array(img.pixels[:], dtype=np.float32).reshape(ALTO, ANCHO, 4)
    C = pixeles(color)[:, :, :3]
    A = pixeles(oclusion)[:, :, 0]
    # La cara dibujada, tal cual, en su mitad: hornearla la emborronaría.
    cara = bpy.data.images.load(os.path.join(CARAS, clave + '.png'))
    C[:, :PIEL, :] = np.array(cara.pixels[:], dtype=np.float32).reshape(PIEL, PIEL, 4)[:, :, :3]
    # La oclusión, alisada (sale con grano) y llevada a un rango útil: lo que está
    # al aire, intacto; los rincones, a la sombra. La sombra tira a cálida, que
    # en gris ensucia la piel.
    for _ in range(3):
        A = (A + np.roll(A, 1, 0) + np.roll(A, -1, 0) + np.roll(A, 1, 1) + np.roll(A, -1, 1)) / 5
    A = np.clip((A - 0.18) / (0.86 - 0.18), 0, 1) ** 0.9
    tinte = np.array([0.5, 0.36, 0.38], dtype=np.float32)
    C *= tinte + (1 - tinte) * A[:, :, None]
    final = bpy.data.images.new('cabeza-' + clave, ANCHO, ALTO, alpha=False)
    final.pixels = np.dstack([C, np.ones((ALTO, ANCHO), dtype=np.float32)]).ravel()
    final.filepath_raw = os.path.join(CARAS, 'textura-' + clave + '.png')
    final.file_format = 'PNG'
    final.save()
    # Un solo material con la textura acabada: es lo que se exporta.
    mat = material('cabeza', imagen=final)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for pol in o.data.polygons: pol.material_index = 0

def fotos (nombre, centro, k):
    os.makedirs(VISTAS, exist_ok=True)
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
    def foto (sufijo, ang, alza, mira, escala, res):
        a = math.radians(ang)
        d = Vector((math.sin(a), -math.cos(a), alza)).normalized()
        cam.location = Vector(mira) + d * 6
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = escala
        sol.rotation_euler = (Vector((0.35, 0, -0.5)) - d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.resolution_x, sc.render.resolution_y = res
        sc.render.filepath = os.path.join(VISTAS, f'cabeza-{nombre}-{sufijo}.png')
        bpy.ops.render.render(write_still=True)
    c = Vector(centro)
    foto('1-cara', 0, 0, c, 0.36 * k, (900, 900))
    foto('2-trescuartos', 38, 0.12, c, 0.36 * k, (900, 900))
    foto('3-perfil', 90, 0, c, 0.36 * k, (900, 900))
    foto('4-busto', 20, 0.1, c - Vector((0, 0, 0.2 * k)), 0.95 * k, (900, 900))
    foto('5-juego', 160, 0.75, c - Vector((0, 0, 0.6 * k)), 2.1 * k, (700, 900))

claves = [a for a in ARGS if not a.startswith('--')] or list(PERSONAJES)
for clave in claves:
    p = PERSONAJES[clave]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, p['cuerpo'] + '.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.data.pose_position = 'REST'
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.parent is None: bpy.data.objects.remove(o)
    bpy.context.view_layer.update()
    cuerpo = max((x for x in bpy.data.objects if x.type == 'MESH'), key=lambda x: len(x.data.vertices))
    hueso = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
    # A la medida de este cuerpo: por su ALTURA (de la coronilla a la punta del
    # pie, 1,753 en el del Fusilero). La distancia de `Head` a la coronilla no
    # vale: depende del casco que traía cada modelo y baila de 0,85 a 1,14.
    k = (hueso['head_end'].z - hueso['LeftToeBase'].z) / 1.753 * p['talla']
    # Los ojos, a la altura que deja el mentón justo sobre el arranque del cuello.
    # `sube`: las cabezas realistas tienen el mentón dos dedos más abajo; sin
    # subirlas se comían el cuello.
    ojos = Vector((0.0, hueso['Head'].y - 0.004 * k + p.get('adelanta', 0.0), hueso['neck'].z + 0.022 + 0.1 * k + p.get('sube', 0.0)))

    cab = Cabeza(p)
    cab.hacer()
    M = Matrix.Translation(ojos) @ Matrix.Scale(k, 4)
    for bm in (cab.cr, cab.pz.bm):
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    piel = a_objeto(cab.cr, 'h_Head')
    resto = a_objeto(cab.pz.bm, 'resto')
    piel.data.materials.append(material('piel'))
    resto.data.materials.append(material('resto', color_vertice=True))
    desplegar(resto)
    solo(resto)
    piel.select_set(True)
    bpy.context.view_layer.objects.active = piel
    bpy.ops.object.join()
    o = piel
    # Antes de hornear, fuera la cabeza vieja: si no, su casco envuelve a la nueva
    # y la oclusión sale con media cara a oscuras.
    # Los cuerpos de `cuerpos.py` ya vienen sin cabeza: no hay nada que quitar.
    if not p['cuerpo'].startswith('cuerpo-'): sin_cabeza(cuerpo, hueso['neck'], CUELLO_ALTO.get(p['cuerpo'], 0.075))
    hornear(o, clave)

    solo(o)
    salida = os.path.join(MODELOS, f'cabeza-{clave}.glb')
    bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_apply=True, export_animations=False,
                              export_vertex_color='NONE', export_image_format='WEBP', export_image_quality=84,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print(f'EXPORTADO cabeza-{clave}.glb {os.path.getsize(salida)} bytes, {sum(len(q.vertices) - 2 for q in o.data.polygons)} triangulos, escala {k:.3f}')
    if '--vista' in ARGS:
        fotos(clave, ojos, k)
