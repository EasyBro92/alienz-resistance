# Las cabezas de los soldados, hechas en Blender.
#
# Isidro, 05/10/2026: «están bien, pero son algo falsos; quiero que sus caras sean
# más reconocibles». Eligió: solo Blender (sin modelos nuevos), el estilo de ahora
# pero mejor hecho, casco ABIERTO con la cara despejada, y que cada soldado sea
# alguien distinto y se le vea bien la cara.
#
# Los cuerpos de Meshy traen la cara en una textura de 512 —cuatro manchas— y
# medio tapada por barboquejos y máscaras. Aquí se hace una cabeza NUEVA por
# soldado: cráneo modelado (nariz, cuencas, pómulos, mentón), ojos, cejas, boca,
# orejas, pelo, barba y un casco abierto del color de la unidad. El juego quita
# la cabeza vieja del cuerpo y cuelga esta del hueso `Head` (`ponerCabeza` en
# assets.js): es rígida, así que sigue al hueso sin pesos que repartir.
#
#   blender -b -P herramientas/blender/cabezas.py -- [--vista] [clave-sexo ...]
#
# Deja `public/models/cabeza-<clave>-<f|m>.glb` (un objeto `h_Head`, color en los
# vértices) y, con --vista, fotos en `herramientas/blender/vistas/`.
#
# La cabeza se construye en coordenadas PROPIAS —origen en el eje de la cabeza a
# la altura de los ojos, Z arriba, la cara hacia -Y, en metros de una cabeza de
# adulto— y al final se escala y se lleva al hueso de cada cuerpo, que no miden
# lo mismo.

import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELOS = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'models'))
VISTAS = os.path.join(AQUI, 'vistas')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

def canales (h):
    return [((h >> s) & 255) / 255 for s in (16, 8, 0)]

def rgb (h, k=1.0):
    r, g, b = canales(h)
    return (min(1, r * k), min(1, g * k), min(1, b * k), 1.0)

def mezcla (a, b, t):
    # De un color (tupla) a otro, t de 0 a 1.
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3)) + (1.0,)

def G (d, s):
    return math.exp(-(d / s) ** 2)

def sm (a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

# --- piezas sueltas (las mismas del equipo) -------------------------------------------
class Piezas:
    def __init__ (self):
        self.bm = bmesh.new()
        self.bm.loops.layers.color.new('Col')

    def _pintar (self, viejas, col, suave):
        bm = self.bm
        nuevas = [f for f in bm.faces if f not in viejas]
        bmesh.ops.recalc_face_normals(bm, faces=nuevas)
        capa = bm.loops.layers.color['Col']
        for f in nuevas:
            f.smooth = suave
            c = rgb(col, 0.88 + 0.12 * f.normal.z) if isinstance(col, int) else col
            for l in f.loops:
                l[capa] = c

    def caja (self, c, tam, col, giro=(0, 0, 0), base=None, bisel=0.0):
        bm = self.bm
        viejas = set(bm.faces)
        R = (base if base is not None else Euler(giro).to_matrix()).to_4x4()
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*tam, 1)))
        if bisel:
            aristas = {e for f in bm.faces if f not in viejas for e in f.edges}
            bmesh.ops.bevel(bm, geom=list(aristas), offset=bisel, segments=1, affect='EDGES')
        self._pintar(viejas, col, False)

    def bola (self, c, radios, col, u=12, v=8, giro=(0, 0, 0), base=None):
        bm = self.bm
        viejas = set(bm.faces)
        if isinstance(radios, (int, float)): radios = (radios,) * 3
        R = (base if base is not None else Euler(giro).to_matrix()).to_4x4()
        bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0,
                                  matrix=Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal((*radios, 1)))
        self._pintar(viejas, col, True)

    def cil (self, a, b, r, col, lados=10, r2=None):
        bm = self.bm
        viejas = set(bm.faces)
        a = Vector(a); b = Vector(b)
        q = (b - a).to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r if r2 is None else r2,
                              depth=(b - a).length, matrix=Matrix.Translation((a + b) / 2) @ q)
        self._pintar(viejas, col, True)

    def barra (self, a, b, ancho, grosor, col, normal=(0, -1, 0), bisel=0.0):
        a = Vector(a); b = Vector(b)
        z = (b - a).normalized()
        x = Vector(normal).cross(z)
        if x.length < 1e-5: x = Vector((1, 0, 0)).cross(z)
        x.normalize()
        y = z.cross(x)
        self.caja((a + b) / 2, (ancho, grosor, (b - a).length), col, base=Matrix((x, y, z)).transposed(), bisel=bisel)

    def tira (self, pts, anchos, grosor, col, normales):
        # Una tira que sigue varios puntos, con su ancho en cada uno: cejas, pestañas, correas.
        for i in range(len(pts) - 1):
            n = (Vector(normales[i]) + Vector(normales[i + 1])).normalized()
            self.barra(pts[i], pts[i + 1], (anchos[i] + anchos[i + 1]) / 2, grosor, col, normal=-n)

# --- el cráneo ------------------------------------------------------------------------
SEG = 64      # alrededor
ANI = 50      # de abajo arriba

class Cabeza:
    def __init__ (self, p):
        self.p = p
        self.pz = Piezas()
        self.rx, self.ry = p.get('ancho', 0.079), p.get('fondo', 0.097)
        self.rz_arriba, self.rz_abajo = 0.112, p.get('largo', 0.12)
        # Alturas de la cara, respecto a los ojos.
        self.z_nariz = -0.049
        self.z_boca = -0.079
        self.z_menton = -0.108
        self.ojo_x = p.get('ojos_sep', 0.031)

    # Azimut: más malla en la cara que en la nuca, que es donde hay rasgos.
    @staticmethod
    def azimut (i):
        u = (i / SEG) * 2 - 1
        return math.pi * (0.34 * u + 0.66 * u ** 3)

    def punto (self, phi, th, fuera=0.0):
        p = self.p
        d = Vector((math.sin(phi) * math.cos(th), -math.cos(phi) * math.cos(th), math.sin(th)))
        x = self.rx * d.x
        y = self.ry * d.y
        z = (self.rz_arriba if d.z > 0 else self.rz_abajo) * d.z
        f = sm(0.0, 0.55, -d.y)                     # cuánto mira hacia delante
        s = max(0.0, min(1.0, -z / self.rz_abajo))  # cuánto baja de los ojos
        # La mandíbula se estrecha hacia el mentón; la nuca se mete hacia el cuello.
        x *= 1 - p.get('mandibula', 0.36) * s ** 2.1
        y *= 1 - (0.40 if d.y > 0 else 0.07) * s ** 2
        # Sienes: la cabeza es algo más estrecha por encima de las orejas.
        x *= 1 - 0.05 * sm(0.02, 0.09, z)
        ax = abs(x)
        dy = 0.0
        # Cuencas de los ojos y arco de las cejas.
        dy += p.get('cuenca', 0.009) * G(ax - self.ojo_x, 0.017) * G(z, 0.011) * f
        dy -= p.get('ceno', 0.005) * G(z - 0.017, 0.009) * sm(0.075, 0.04, ax) * f
        # La nariz: sube desde el entrecejo hasta la punta y se corta debajo.
        zt, z0 = self.z_nariz, 0.012
        perfil = max(0.0, (z0 - z) / (z0 - zt)) if z >= zt else G(zt - z, 0.0075)
        ancho = p.get('nariz_ancho', 0.0085) + 0.0065 * min(1.0, perfil)
        dy -= p.get('nariz', 0.024) * (0.3 * perfil + 0.7 * perfil ** 2.6) * G(x, ancho) * f
        dy -= 0.005 * G(ax - 0.0125, 0.0055) * G(z - zt - 0.002, 0.006) * f      # aletas
        # El bulto de la boca, el mentón y los pómulos.
        dy -= 0.0065 * G(x, 0.03) * G(z - self.z_boca, 0.02) * f
        dy -= p.get('menton', 0.008) * G(x, 0.022) * G(z - self.z_menton, 0.014) * f
        dy -= p.get('pomulo', 0.004) * G(ax - 0.048, 0.02) * G(z + 0.026, 0.02) * f
        # El surco entre el labio de abajo y el mentón.
        dy += 0.003 * G(x, 0.02) * G(z - (self.z_boca - 0.016), 0.006) * f
        y += dy
        q = Vector((x, y, z))
        if fuera:
            q += Vector((d.x / self.rx, d.y / self.ry, d.z / self.rz_arriba)).normalized() * fuera
        return q, d, f

    def rejilla (self, fuera=0.0):
        filas = []
        for j in range(ANI + 1):
            th = math.radians(-86 + 172 * j / ANI)
            filas.append([self.punto(self.azimut(i), th, fuera) for i in range(SEG)])
        return filas

    def piel_de (self, q, d, f):
        p = self.p
        base = rgb(p['piel'])
        x, z = q.x, q.z
        ax = abs(x)
        k = 0.93 + 0.07 * d.z
        k *= 1 - 0.10 * G(ax - self.ojo_x, 0.02) * G(z - 0.002, 0.013) * f       # sombra de la cuenca
        k *= 1 - 0.10 * G(x, 0.014) * G(z - (self.z_nariz - 0.008), 0.005) * f   # bajo la nariz
        k *= 1 - 0.07 * G(x, 0.02) * G(z - (self.z_boca - 0.016), 0.006) * f     # bajo el labio
        k *= 1 - 0.16 * sm(-0.092, -0.122, z)                                    # bajo la mandíbula
        c = tuple(min(1, v * k) for v in base[:3]) + (1.0,)
        # Colorete en las mejillas y la punta de la nariz.
        rubor = (base[0] * 1.0, base[1] * 0.80, base[2] * 0.78, 1.0)
        c = mezcla(c, rubor, p.get('rubor', 0.45) * (G(ax - 0.046, 0.02) * G(z + 0.04, 0.02) + 0.5 * G(x, 0.012) * G(z - self.z_nariz, 0.01)) * f)
        # Sombra de barba: la mandíbula y el bigote, sin los labios.
        sb = p.get('sombra_barba', 0.0)
        if sb:
            zona = sm(-0.045, -0.07, z) * sm(1.0, 0.75, abs(math.atan2(d.x, -d.y)) / 1.75)
            zona = max(zona, G(x, 0.024) * G(z - (self.z_boca + 0.013), 0.007))
            zona *= 1 - G(x, 0.02) * G(z - self.z_boca, 0.007)
            c = mezcla(c, rgb(p['pelo'], 1.25), sb * zona)
        # Rapado: el pelo cortísimo es un tono en el cráneo, no un volumen.
        rp = p.get('rapado', 0.0)
        if rp:
            c = mezcla(c, rgb(p['pelo'], 1.2), rp * self.zona_pelo(q, d, 0.008))
        return c

    def zona_pelo (self, q, d, margen=0.0):
        # 1 donde nace el pelo: por encima de la frente, patilla delante de la oreja, nuca.
        a = abs(math.atan2(d.x, -d.y))
        z = q.z
        linea = 0.066 if a < 0.85 else (0.066 - (a - 0.85) / 0.35 * 0.09 if a < 1.2 else (-0.024 if a < 1.5 else -0.024 - sm(1.5, 2.2, a) * 0.05))
        linea += self.p.get('entradas', 0.0) * G(a - 0.62, 0.22)
        return sm(linea - margen - 0.004, linea + 0.004, z)

    def casquete (self, filas, campo, col, suave=True):
        # La parte de la rejilla donde `campo(q, d)` es positivo. Los cuadros que
        # el borde cruza se RECORTAN por donde el campo vale cero: metiendo o
        # quitando cuadros enteros, la patilla y la barba salían en escalera.
        bm = self.pz.bm
        capa = bm.loops.layers.color['Col']
        vs = {}
        def v (j, i):
            if (j, i) not in vs: vs[(j, i)] = bm.verts.new(filas[j][i][0])
            return vs[(j, i)]
        def pinta (q, d, f):
            return col(q, d, f) if callable(col) else rgb(col, 0.9 + 0.1 * d.z)
        val = [[campo(q, d) for (q, d, f) in fila] for fila in filas]
        for j in range(ANI):
            for i in range(SEG):
                k = (i + 1) % SEG
                esq = ((j, i), (j, k), (j + 1, k), (j + 1, i))
                vals = [val[a][b] for a, b in esq]
                if all(x <= 0 for x in vals): continue
                if all(x > 0 for x in vals):
                    cara = bm.faces.new([v(a, b) for a, b in esq])
                    cara.smooth = suave
                    for l, (a, b) in zip(cara.loops, esq): l[capa] = pinta(*filas[a][b])
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
                cara.smooth = suave
                for l, (q, d, f) in zip(cara.loops, pol): l[capa] = pinta(q, d, f)
        return vs
    def craneo (self):
        filas = self.rejilla()
        vs = self.casquete(filas, lambda q, d: 1.0, self.piel_de)
        bm = self.pz.bm
        capa = bm.loops.layers.color['Col']
        # Tapas: la coronilla y debajo del mentón.
        for j, signo in ((ANI, 1), (0, -1)):
            centro = sum((filas[j][i][0] for i in range(SEG)), Vector()) / SEG
            c = bm.verts.new(centro + Vector((0, 0, 0.002 * signo)))
            for i in range(SEG):
                k = (i + 1) % SEG
                orden = [vs[(j, i)], vs[(j, k)], c] if signo > 0 else [vs[(j, k)], vs[(j, i)], c]
                cara = bm.faces.new(orden)
                cara.smooth = True
                for l in cara.loops: l[capa] = rgb(self.p['piel'], 0.8 if signo < 0 else 1.0)
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

    # --- rasgos ---
    def ojos (self):
        p, pz = self.p, self.pz
        abre = p.get('ojo_abre', 1.0)
        for lado in (-1, 1):
            if p.get('parche') == lado: continue      # debajo del parche no hay ojo que dibujar
            c, n = self.cara(lado * self.ojo_x, 0.0)
            pz.bola(c + Vector((0, 0.0042, 0)), (0.0138, 0.0066, 0.0082 * abre), 0xf2efe8, 14, 8)
            ci = c + Vector((-lado * 0.0012, -0.0012, -0.0004))
            pz.bola(ci, (0.0064, 0.0022, 0.0064 * min(1.0, abre + 0.1)), p.get('iris', 0x5a3a1e), 12, 6)
            pz.bola(ci + Vector((0, -0.0012, 0)), (0.0028, 0.0016, 0.0028), 0x0c0a09, 8, 5)
            pz.bola(ci + Vector((0.0022, -0.0022, 0.0022)), 0.0013, 0xffffff, 6, 4)
            # La línea de las pestañas, más larga hacia fuera; y el párpado de abajo.
            oscuro = p.get('pestana', 0x1a1412)
            xs = [-0.0145, -0.007, 0.0, 0.0075, 0.0158]
            pts, ns = [], []
            for t in xs:
                q, m = self.cara(lado * (self.ojo_x + t), 0.0082 * abre - 0.0042 * (t / 0.015) ** 2 + (0.0012 if t > 0.01 else 0), 0.0038)
                pts.append(q); ns.append(m)
            pz.tira(pts, [0.0022, 0.0032, 0.0036, 0.0034, 0.0024] if p.get('pestanas_largas') else [0.002, 0.0026, 0.003, 0.0028, 0.002], 0.003, oscuro, ns)
            pts, ns = [], []
            for t in (-0.011, 0.0, 0.012):
                q, m = self.cara(lado * (self.ojo_x + t), -0.0082 * abre + 0.002 * (t / 0.012) ** 2, 0.003)
                pts.append(q); ns.append(m)
            pz.tira(pts, [0.0014] * 3, 0.002, rgb(p['piel'], 0.72), ns)

    def cejas (self):
        p, pz = self.p, self.pz
        g = p.get('ceja_grosor', 1.0)
        inclina = p.get('ceja_inclina', 0.0)       # positivo: ceño (bajan hacia la nariz)
        for lado in (-1, 1):
            pts, ns = [], []
            for t, dz in ((0.011, 0.0165 - inclina), (0.024, 0.0205 - inclina * 0.3), (0.039, 0.0215), (0.052, 0.0175 - p.get('ceja_cae', 0.0))):
                q, m = self.cara(lado * t, dz, 0.004)
                pts.append(q); ns.append(m)
            pz.tira(pts, [0.0078 * g, 0.0074 * g, 0.006 * g, 0.0036 * g], 0.0045, p['pelo'] if p.get('ceja') is None else p['ceja'], ns)

    def boca (self):
        p, pz = self.p, self.pz
        w = p.get('boca_ancho', 0.021)
        z = self.z_boca
        c, n = self.cara(0, z)
        labio = p.get('labio', None)
        arriba = rgb(labio, 0.82) if labio else rgb(p['piel'], 0.74)
        abajo = rgb(labio) if labio else mezcla(rgb(p['piel'], 0.86), (0.78, 0.42, 0.40, 1), 0.3)
        gr = p.get('labio_grosor', 1.0)
        pz.bola(c + Vector((0, 0.0015, 0.0036 * gr)), (w, 0.0062, 0.0036 * gr), arriba, 14, 6)
        pz.bola(c + Vector((0, 0.002, -0.0046 * gr)), (w * 0.8, 0.0066, 0.0048 * gr), abajo, 14, 6)
        # La línea de la boca, con las comisuras un poco arriba o abajo.
        com = p.get('comisura', 0.0)
        pts, ns = [], []
        for t in (-1, -0.5, 0, 0.5, 1):
            q, m = self.cara(t * w * 0.98, z - 0.0002 + com * t * t, 0.0052 - 0.003 * t * t)
            pts.append(q); ns.append(m)
        pz.tira(pts, [0.0014, 0.0018, 0.002, 0.0018, 0.0014], 0.0022, 0x3a1f1c, ns)

    def orejas_y_cuello (self):
        p, pz = self.p, self.pz
        for lado in (-1, 1):
            q, n = self.lado(lado * 1.62, -0.014)
            pz.bola(q + n * 0.004, (0.0085, 0.016, 0.028), rgb(p['piel'], 0.9), 10, 8, giro=(0, lado * 0.15, lado * -0.25))
            pz.bola(q + n * 0.009 + Vector((0, -0.003, 0)), (0.004, 0.008, 0.017), rgb(p['piel'], 0.72), 8, 6, giro=(0, lado * 0.15, lado * -0.25))
        r = p.get('cuello', 0.05)
        pz.cil((0, 0.022, -0.205), (0, 0.012, -0.085), r * 1.08, rgb(p['piel'], 0.84), 16, r2=r)

    def pelo (self):
        p, pz = self.p, self.pz
        estilo = p.get('peinado', 'corto')
        if estilo == 'rapado': return
        col = p['pelo']
        filas = self.rejilla(0.0045)
        baja = {'corto': 0.0, 'coleta': 0.0, 'melena': 0.075, 'mono': 0.0}[estilo]
        def cond (q, d):
            a = abs(math.atan2(d.x, -d.y))
            campo = self.zona_pelo(q, d) - 0.5
            # La melena baja por detrás de la oreja hasta la mandíbula.
            if baja: campo = max(campo, min((a - 1.75) * 0.05, q.z + baja + 0.02) * 30)
            return campo
        def tono (q, d, f):
            # Mechones: bandas de tono a lo largo de la cabeza.
            a = math.atan2(d.x, -d.y)
            return rgb(col, (0.9 + 0.1 * d.z) * (1 + 0.1 * math.sin(a * 23) * math.sin(q.z * 90)))
        self.casquete(filas, cond, tono)
        atras = self.ry
        if estilo == 'coleta':
            for k in range(5):
                t = k / 4
                pz.bola((0, atras + 0.012 + 0.02 * math.sin(t * 2.2), -0.02 - t * 0.13), (0.024 - 0.01 * t, 0.022 - 0.008 * t, 0.03), col, 10, 6)
            pz.bola((0, atras + 0.006, -0.012), (0.018, 0.014, 0.012), p.get('goma', 0x2a2a2a), 8, 5)
        if estilo == 'mono':
            pz.bola((0, atras + 0.012, -0.045), (0.036, 0.03, 0.033), col, 12, 8)
            pz.bola((0, atras - 0.002, -0.03), (0.022, 0.016, 0.014), p.get('goma', 0x2a2a2a), 8, 5)
        if estilo == 'melena':
            for lado in (-1, 1):
                for k in range(4):
                    t = k / 3
                    q, n = self.lado(lado * (1.95 + 0.1 * t), -0.02 - 0.075 * t)
                    pz.bola(q + n * 0.004, (0.016, 0.03 - 0.006 * t, 0.03), col, 10, 6)
        # Flequillo: unos mechones que asoman bajo el casco.
        fl = p.get('flequillo', 0)
        for k in range(fl):
            t = (k + 0.5) / fl * 2 - 1
            q, n = self.cara(t * 0.05 + p.get('flequillo_lado', 0.0), 0.05 - 0.01 * abs(t), 0.004)
            pz.bola(q, (0.012, 0.006, 0.022), col, 8, 5, giro=(0, t * 0.5 + p.get('flequillo_giro', 0.0), 0))

    def barba (self):
        p = self.p
        estilo = p.get('barba')
        if not estilo: return
        col = p.get('barba_color', p['pelo'])
        zb, zn = self.z_boca, self.z_nariz
        filas = self.rejilla(p.get('barba_largo', 0.0045))
        if estilo == 'bigote':
            self.bigote(col)
            return
        def cond (q, d):
            a = abs(math.atan2(d.x, -d.y))
            x, z = abs(q.x), q.z
            frente = (0.9 - a) * 0.05
            bigote = min(0.03 - x, z - (zb + 0.0055), (zn - 0.003) - z, frente)
            perilla = min(0.022 - x, (zb - 0.011) - z, frente)
            if estilo == 'perilla':
                guias = min(x - 0.019, 0.031 - x, z - (zb - 0.03), (zb + 0.006) - z, frente)
                return max(bigote, perilla, guias)
            # Barba cerrada: de la patilla al mentón, dejando los labios y las mejillas.
            linea = -0.05 - 0.035 * sm(0.5, 1.5, a) + 0.03 * sm(1.2, 1.6, a)
            lleno = min(linea - z, (1.7 - a) * 0.05)
            labios = min(0.024 - x, z - (zb - 0.01), (zb + 0.007) - z)
            return max(bigote, min(lleno, -labios))
        def tono (q, d, f):
            return rgb(col, (0.92 + 0.08 * d.z) * (1 + 0.08 * math.sin(q.x * 300) * math.sin(q.z * 260)))
        self.casquete(filas, cond, tono)

    def bigote (self, col):
        # Dos guías que salen de debajo de la nariz y caen más allá de las comisuras.
        zb, zn = self.z_boca, self.z_nariz
        for lado in (-1, 1):
            pts, ns = [], []
            for x, z in ((0.0, zn - 0.0125), (0.011, zn - 0.0155), (0.022, zb + 0.008), (0.031, zb + 0.001), (0.037, zb - 0.009)):
                q, n = self.cara(lado * x, z, 0.0045)
                pts.append(q); ns.append(n)
            self.pz.tira(pts, [0.0085, 0.0105, 0.0095, 0.0065, 0.003], 0.007, col, ns)

    def casco (self):
        p, pz = self.p, self.pz
        col = p['casco']
        oscuro = rgb(col, 0.62)
        cz = 0.03
        hx, hy, hz = 0.103, 0.121, 0.137
        cy = 0.004
        def borde (a):
            # A qué altura acaba el casco: alto en la frente, baja por las sienes, nuca cubierta.
            a = abs(a)
            return 0.05 - 0.058 * sm(0.75, 1.5, a) - 0.02 * sm(1.9, 2.6, a)
        bm = pz.bm
        capa = bm.loops.layers.color['Col']
        N, M = 40, 9
        filas = []
        for j in range(M + 1):
            fila = []
            for i in range(N):
                a = -math.pi + 2 * math.pi * i / N
                th0 = math.asin(max(-1, min(1, (borde(a) - cz) / hz)))
                th = th0 + (math.radians(84) - th0) * j / M
                d = Vector((math.sin(a) * math.cos(th), -math.cos(a) * math.cos(th), math.sin(th)))
                # La visera: el borde de delante se adelanta un poco.
                vis = 0.012 * sm(0.9, 0.0, abs(a)) * (1 - j / M) ** 3
                fila.append((Vector((hx * d.x, cy + hy * d.y - vis, cz + hz * d.z)), d, a))
            filas.append(fila)
        vs = [[bm.verts.new(q) for (q, d, a) in fila] for fila in filas]
        def tono (q, d, a):
            # Una costura a lo largo y el desgaste del borde.
            k = 0.88 + 0.14 * d.z
            k *= 1 - 0.12 * G(math.sin(a), 0.035) * sm(0.2, 0.6, d.z)
            return rgb(col, k)
        for j in range(M):
            for i in range(N):
                k = (i + 1) % N
                cara = bm.faces.new([vs[j][i], vs[j][k], vs[j + 1][k], vs[j + 1][i]])
                cara.smooth = True
                for l, (jj, ii) in zip(cara.loops, ((j, i), (j, k), (j + 1, k), (j + 1, i))):
                    l[capa] = tono(*filas[jj][ii])
        cima = bm.verts.new((0, cy, cz + hz * 1.0))
        for i in range(N):
            cara = bm.faces.new([vs[M][i], vs[M][(i + 1) % N], cima])
            cara.smooth = True
            for l in cara.loops: l[capa] = rgb(col, 1.0)
        # Por dentro, para que no se vea hueco bajo la visera: la misma cáscara, oscura y del revés.
        for i in range(N):
            k = (i + 1) % N
            a0, a1 = filas[0][i][0], filas[0][k][0]
            b0 = Vector((a0.x * 0.9, a0.y * 0.9 + 0.004, a0.z + 0.012)); b1 = Vector((a1.x * 0.9, a1.y * 0.9 + 0.004, a1.z + 0.012))
            cara = bm.faces.new([bm.verts.new(a1), bm.verts.new(a0), bm.verts.new(b0), bm.verts.new(b1)])
            for l in cara.loops: l[capa] = rgb(col, 0.38)
        # El ribete del borde.
        for i in range(N):
            a, b = filas[0][i], filas[0][(i + 1) % N]
            pz.barra(a[0], b[0], 0.011, 0.007, oscuro, normal=-(a[1] + b[1]))
        # Barboquejo fino: de la sien al mentón por detrás de la mejilla, sin tapar la cara.
        if p.get('barboquejo', True):
            for lado in (-1, 1):
                pts, ns = [], []
                for a, z in ((1.35, -0.006), (1.22, -0.05), (0.95, -0.092), (0.45, -0.119), (0.0, -0.126)):
                    q, n = self.lado(lado * a, z, 0.0025)
                    pts.append(q); ns.append(n)
                pz.tira(pts, [0.008] * 5, 0.003, 0x23262a, ns)
        # Lo que distingue un casco de otro.
        extra = p.get('casco_extra', ())
        def sobre (a, z, fuera=0.0):
            th = math.asin(max(-1, min(1, (z - cz) / hz)))
            d = Vector((math.sin(a) * math.cos(th), -math.cos(a) * math.cos(th), math.sin(th)))
            return Vector((hx * d.x, cy + hy * d.y, cz + hz * d.z)) + d * fuera, d
        def ejes (n):
            y = n.normalized(); z = Vector((0, 0, 1)) - y * y.z; z.normalize()
            return Matrix((y.cross(z), y, z)).transposed()
        if 'gafas' in extra:
            cinta = [sobre(-math.pi + 2 * math.pi * i / 24, 0.092, 0.003) for i in range(25)]
            for (a, da), (b, db) in zip(cinta, cinta[1:]):
                pz.barra(a, b, 0.016, 0.004, 0x1d2024, normal=-(da + db))
            for lado in (-1, 1):
                q, d = sobre(lado * 0.36, 0.094)
                pz.caja(q + d * 0.011, (0.058, 0.022, 0.04), 0x2a2e33, base=ejes(d), bisel=0.008)
                pz.caja(q + d * 0.022, (0.045, 0.007, 0.027), p.get('gafas_color', 0xe0912a), base=ejes(d), bisel=0.004)
        if 'red' in extra:
            # Banda de tela con hojas metidas: el casco del tirador.
            cinta = [sobre(-math.pi + 2 * math.pi * i / 24, 0.085, 0.003) for i in range(25)]
            for (a, da), (b, db) in zip(cinta, cinta[1:]):
                pz.barra(a, b, 0.02, 0.004, 0x4c5332, normal=-(da + db))
            for i in range(9):
                q, d = sobre(-2.6 + i * 0.65, 0.1 + 0.02 * math.sin(i * 2.1), 0.004)
                pz.bola(q, (0.01, 0.004, 0.026), 0x5d6f3a if i % 2 else 0x7d8a4a, 6, 4, base=ejes(d) @ Euler((0, 0.5 * math.sin(i), 0)).to_matrix())
        if 'placa' in extra:
            q, d = sobre(0.0, 0.118)
            pz.caja(q + d * 0.004, (0.032, 0.011, 0.028), 0x1d2024, base=ejes(d), bisel=0.003)
        if 'estrella' in extra:
            q, d = sobre(0.0, 0.105)
            pz.bola(q + d * 0.002, (0.013, 0.004, 0.013), 0xe2b93b, 5, 3, base=ejes(d))
        if 'cascos' in extra:
            for lado in (-1, 1):
                q, n = self.lado(lado * 1.6, -0.012, 0.012)
                pz.bola(q, (0.019, 0.03, 0.036), 0x1d2024, 10, 6)
            q, n = self.lado(1.6, -0.03, 0.02)
            b, _ = self.cara(0.03, self.z_boca - 0.002, 0.02)
            m, _ = self.lado(0.95, -0.07, 0.016)
            for a, c in ((q, m), (m, b)):
                pz.cil(a, c, 0.0032, 0x1d2024, 6)
            pz.bola(b, (0.01, 0.008, 0.008), 0x2c3036, 6, 4)

    def marcas (self):
        p, pz = self.p, self.pz
        for (x0, z0, x1, z1) in p.get('cicatrices', ()):
            pts, ns = [], []
            for t in (0, 0.33, 0.66, 1):
                q, n = self.cara(x0 + (x1 - x0) * t + 0.003 * math.sin(t * 9), z0 + (z1 - z0) * t, 0.0012)
                pts.append(q); ns.append(n)
            pz.tira(pts, [0.002, 0.0034, 0.0034, 0.002], 0.0022, 0xb5665c, ns)
        if p.get('parche'):
            # Parche en el ojo, con su cinta cruzada.
            lado = p['parche']
            q, n = self.cara(lado * self.ojo_x, 0.0, 0.006)
            pz.bola(q, (0.021, 0.0055, 0.017), 0x16171a, 12, 6)
            pts, ns = [], []
            for a, z in ((lado * 1.5, 0.04), (lado * 0.8, 0.02), (lado * 0.2, -0.002), (-lado * 0.5, -0.02), (-lado * 1.4, -0.04)):
                r, m = self.lado(a, z, 0.0025)
                pts.append(r); ns.append(m)
            pz.tira(pts, [0.005] * 5, 0.0025, 0x16171a, ns)
        for (x, z, r) in p.get('lunares', ()):
            q, n = self.cara(x, z, 0.0005)
            pz.bola(q, (r, r * 0.5, r), 0x4a2c20, 6, 4)
        pint = p.get('pintura')
        if pint:
            # Pintura de guerra: una franja bajo cada ojo.
            for lado in (-1, 1):
                pts, ns = [], []
                for t in (0.016, 0.03, 0.046):
                    q, n = self.cara(lado * t, -0.019 - 0.002 * (t > 0.04), 0.0012)
                    pts.append(q); ns.append(n)
                pz.tira(pts, [0.007, 0.0075, 0.006], 0.0018, pint, ns)

    def hacer (self):
        self.craneo()
        self.ojos()
        self.cejas()
        self.boca()
        self.orejas_y_cuello()
        self.pelo()
        self.barba()
        self.marcas()
        # El Arquero no lleva casco: el juego le pone la capucha encima.
        if self.p['casco'] is not None: self.casco()
        return self.pz.bm

# ======================================================================================
# QUIÉN ES CADA UNO
# ======================================================================================
# El casco va del color de la UNIDAD (`color` en config.js), no del cuerpo: el
# Ametrallador y la Misilera comparten el cuerpo rojo del Lanzallamas, y así se
# les distingue también por la cabeza.
AZUL, NARANJA, VERDE, GRANATE = 0x3d7dd8, 0xe58227, 0x49b88a, 0x9c2a20
MORADO, ROSA, AMARILLO, ORO = 0x7a6ad4, 0xe0559b, 0xd9c23a, 0xd8b04a

# Lo que cambia de un hombre a una mujer en este estilo: mandíbula, nariz,
# cejas, ojos y labios. Cada personaje parte de una de las dos y pone lo suyo.
EL = dict(mandibula=0.3, menton=0.009, nariz=0.024, nariz_ancho=0.009, ceno=0.006, ceja_grosor=1.1, ojo_abre=0.92, cuello=0.052)
ELLA = dict(ancho=0.075, mandibula=0.44, menton=0.005, nariz=0.017, nariz_ancho=0.007, ceno=0.002, ceja_grosor=0.72, ceja_cae=-0.002,
            ojo_abre=1.14, pestanas_largas=True, cuenca=0.007, cuello=0.043, labio_grosor=1.25, rubor=0.6, talla=1.06)

def el (cuerpo, **mas): return {**EL, 'cuerpo': 'soldado-' + cuerpo + '-m', **mas}
def ella (cuerpo, **mas): return {**ELLA, 'cuerpo': 'soldado-' + cuerpo + '-f', **mas}

PERSONAJES = {
    # --- El Fusilero. Él: el sargento, bigote negro y la ceja partida. Ella: coleta castaña y pecas.
    'rifle-m': el('fusil', piel=0xf0b690, pelo=0x1c1512, iris=0x4a2f1a, casco=AZUL, menton=0.011, nariz=0.027, ceno=0.007,
                  ceja_grosor=1.25, ceja_inclina=0.004, barba='bigote', sombra_barba=0.4, cicatrices=[(0.046, 0.034, 0.05, -0.038)],
                  comisura=-0.0012, ojo_abre=0.88, casco_extra=('gafas', 'cascos')),
    'rifle-f': ella('fusil', piel=0xf2c3a2, pelo=0x6b4226, iris=0x4f7a45, casco=AZUL, peinado='coleta', flequillo=3, labio=0xc9665f,
                    lunares=[(-0.03, -0.03, 0.0016), (-0.02, -0.036, 0.0013), (0.026, -0.032, 0.0016), (0.034, -0.026, 0.0012), (0.004, -0.02, 0.0012)],
                    casco_extra=('gafas',)),
    # --- El Escopetero. Él: grande, rapado, barba cerrada. Ella: pelo corto y pintura de guerra.
    'shotgun-m': el('escopeta', piel=0x8f5c3e, pelo=0x120d0b, iris=0x2e1c10, casco=NARANJA, ancho=0.084, mandibula=0.2, menton=0.012,
                    nariz=0.026, nariz_ancho=0.0115, ceja_grosor=1.3, ceja_inclina=0.003, peinado='rapado', rapado=0.5, barba='barba',
                    barba_largo=0.007, labio_grosor=1.3, cuello=0.058, casco_extra=('placa',)),
    'shotgun-f': ella('escopeta', piel=0xd9a47c, pelo=0x14100e, iris=0x3a2616, casco=NARANJA, peinado='corto', flequillo=4, flequillo_giro=0.3,
                      mandibula=0.38, ceja_grosor=0.95, ceja_inclina=0.003, pintura=0x1a1a1a, cicatrices=[(-0.05, -0.02, -0.036, -0.05)],
                      labio=0xa8564e, comisura=-0.001, casco_extra=('placa',)),
    # --- El Tirador. Él: rubio, ojos claros, barba de tres días. Ella: pelirroja de melena.
    'sniper-m': el('tirador', piel=0xf1c7a8, pelo=0xb89455, iris=0x5b8fb0, casco=VERDE, ancho=0.076, mandibula=0.36, nariz=0.025,
                   nariz_ancho=0.008, ceja_grosor=0.9, ceja=0x8d6f3c, sombra_barba=0.3, barba_color=0xb89455, ojo_abre=0.8, casco_extra=('red',)),
    'sniper-f': ella('tirador', piel=0xf6d2b8, pelo=0xa8431f, iris=0x4f8a55, casco=VERDE, peinado='melena', flequillo=2, flequillo_lado=0.02,
                     ceja=0x7d3a1f, labio=0xc76a5e, lunares=[(-0.028, -0.028, 0.0014), (0.03, -0.03, 0.0014), (0.02, -0.022, 0.0012)],
                     ojo_abre=1.0, casco_extra=('red',)),
    # --- El Lanzallamas. Él: calvo, perilla y media cara quemada. Ella: moño negro y gafas oscuras en el casco.
    'flamer-m': el('lanzallamas', piel=0xd79b78, pelo=0x2a1d16, iris=0x5c3b1c, casco=GRANATE, mandibula=0.26, peinado='rapado', rapado=0.15,
                   barba='perilla', barba_largo=0.006, ceja_grosor=1.15, ceja_inclina=0.002, sombra_barba=0.25,
                   cicatrices=[(-0.058, 0.01, -0.05, -0.045), (-0.046, -0.01, -0.036, -0.06), (-0.062, -0.03, -0.05, -0.07)],
                   casco_extra=('gafas',), gafas_color=0x2b3a44),
    'flamer-f': ella('lanzallamas', piel=0xf0c8a4, pelo=0x17120f, iris=0x3b2616, casco=GRANATE, peinado='mono', flequillo=3, flequillo_giro=-0.25,
                     ojo_abre=0.98, labio=0xb5524c, ceja_grosor=0.8, casco_extra=('gafas',), gafas_color=0x2b3a44),
    # --- El Arquero. Sin casco: lleva capucha. Él: joven, castaño, pintura verde. Ella: coleta cobriza.
    'archer-m': el('tirador', piel=0xe9b792, pelo=0x5a3a22, iris=0x6a7a3a, casco=None, mandibula=0.34, nariz=0.022, ceja_grosor=0.95,
                   sombra_barba=0.22, pintura=0x3f5a2a, ojo_abre=0.95),
    'archer-f': ella('tirador', piel=0xeab58f, pelo=0x8a4a22, iris=0x6a5a2a, casco=None, peinado='coleta',
                     pintura=0x3f5a2a, labio=0xb96258, ceja=0x5f3418),
    # --- El Mortero. Él: el veterano, canoso y de bigote blanco. Ella: moño rubio y un lunar.
    'mortar-m': el('escopeta', piel=0xe0a584, pelo=0xb9b6ae, ceja=0x8f8c86, iris=0x4d6a7a, casco=AMARILLO, mandibula=0.24, menton=0.01,
                   nariz=0.028, nariz_ancho=0.0105, barba='bigote', barba_color=0xd8d5cc, ceja_grosor=1.2, ceja_cae=0.003, ojo_abre=0.8,
                   rubor=0.7, entradas=0.02, casco_extra=('estrella',)),
    'mortar-f': ella('escopeta', piel=0xf3caa8, pelo=0xd2ad62, ceja=0x9a7a3c, iris=0x4f84a8, casco=AMARILLO, peinado='mono',
                     lunares=[(0.03, -0.062, 0.002)], labio=0xcb6a62, casco_extra=('estrella',)),
    # --- El Ametrallador. Él: pelirrojo de barba larga. Ella: piel oscura, pelo corto, cejas firmes.
    'gunner-m': el('lanzallamas', piel=0xf0bf9f, pelo=0xb5521c, iris=0x4f7a8a, casco=MORADO, ancho=0.083, mandibula=0.22, barba='barba',
                   barba_largo=0.011, ceja_grosor=1.25, nariz_ancho=0.0105, cuello=0.058,
                   lunares=[(-0.03, -0.026, 0.0014), (0.028, -0.03, 0.0014)], casco_extra=('placa', 'cascos')),
    'gunner-f': ella('lanzallamas', piel=0x7d4f36, pelo=0x100c0a, iris=0x2a190e, casco=MORADO, peinado='corto', mandibula=0.36,
                     nariz_ancho=0.009, ceja_grosor=1.0, labio=0x8f4038, labio_grosor=1.45, casco_extra=('placa', 'cascos')),
    # --- La Misilera. Ella: melena negra con flequillo recto. Él: moreno, perilla fina.
    'misil-f': ella('lanzallamas', piel=0xf5d3b6, pelo=0x15110f, iris=0x2f2018, casco=ROSA, peinado='melena', flequillo=5, ojo_abre=0.95,
                    labio=0xd0607a, ceja_grosor=0.7, casco_extra=('gafas',), gafas_color=0x8fd0e8),
    'misil-m': el('lanzallamas', piel=0xb57a52, pelo=0x16100d, iris=0x33200f, casco=ROSA, mandibula=0.34, barba='perilla', nariz=0.023,
                  ceja_grosor=1.05, casco_extra=('gafas',), gafas_color=0x8fd0e8),
    # --- El Capitán Cuervo. El parche en el ojo es suyo, sea él o ella.
    'capitan-m': el('fusil', piel=0xe3ab88, pelo=0x2b2623, ceja=0x1c1816, iris=0x55616a, casco=ORO, mandibula=0.24, menton=0.012, nariz=0.027,
                    ceja_grosor=1.3, ceja_inclina=0.005, sombra_barba=0.5, parche=-1, cicatrices=[(-0.03, 0.04, -0.034, 0.02), (-0.034, -0.02, -0.04, -0.05)],
                    comisura=-0.0015, ojo_abre=0.85, casco_extra=('estrella',)),
    'capitan-f': ella('fusil', piel=0xe8b592, pelo=0x1a1513, iris=0x55616a, casco=ORO, peinado='coleta', mandibula=0.38, ceja_grosor=0.95,
                      ceja_inclina=0.003, parche=-1, cicatrices=[(-0.034, -0.02, -0.04, -0.05)], labio=0xa9504a, comisura=-0.001,
                      ojo_abre=1.0, casco_extra=('estrella',))
}

# ======================================================================================
def sin_cabeza (malla, cuello):
    # Quita del cuerpo los triángulos de la cabeza vieja: los que tienen los tres
    # vértices mandados sobre todo por `Head` o `neck`. La misma regla que el juego.
    cabeza = {g.index for g in malla.vertex_groups if g.name in ('Head', 'head_end', 'headfront', 'neck')}
    manda = [max(v.groups, key=lambda g: g.weight).group in cabeza if v.groups else False for v in malla.data.vertices]
    # Y lo que quede por encima del arranque del cuello pegado a su eje: la piel del cuello, que cuelga del pecho. Como `quitarCabeza` en assets.js.
    ev = malla.evaluated_get(bpy.context.evaluated_depsgraph_get())
    donde = [ev.matrix_world @ v.co for v in ev.data.vertices]
    # Dos escalones: pegado al eje, todo lo que suba; algo más lejos, solo lo que suba mucho (capuchas y cuellos altos).
    lejos = [math.hypot(q.x - cuello.x, q.y - cuello.y) for q in donde]
    manda = [m or (r < 0.1 and q.z > cuello.z + 0.008) or (r < 0.2 and q.z > cuello.z + 0.075) for m, q, r in zip(manda, donde, lejos)]
    bm = bmesh.new()
    bm.from_mesh(malla.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(manda[v.index] for v in f.verts)], context='FACES')
    bm.to_mesh(malla.data)
    bm.free()

def material_color ():
    m = bpy.data.materials.new('cabeza')
    m.use_nodes = True
    n = m.node_tree.nodes
    n['Principled BSDF'].inputs['Roughness'].default_value = 0.8
    attr = n.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    m.node_tree.links.new(attr.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
    return m

def fotos (nombre, centro, k):
    os.makedirs(VISTAS, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.74, 0.76, 0.78, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
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
    hueso = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
    # La cabeza a la medida de este cuerpo: del hueso `Head` a la coronilla hay
    # 0,243 en el cuerpo sobre el que se dibujó (el del Fusilero).
    k = (hueso['head_end'].z - hueso['Head'].z) / 0.243 * p.get('talla', 1.0)
    ojos = Vector((0.0, hueso['Head'].y - 0.004 * k + p.get('adelanta', 0.0), hueso['Head'].z + 0.078 * k))
    bm = Cabeza(p).hacer()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(ojos) @ Matrix.Scale(k, 4), verts=bm.verts)
    me = bpy.data.meshes.new('h_Head')
    bm.to_mesh(me)
    bm.free()
    ca = me.color_attributes.get('Col')
    me.color_attributes.active_color = ca
    me.color_attributes.render_color_index = me.color_attributes.find('Col')
    me.materials.append(material_color())
    o = bpy.data.objects.new('h_Head', me)
    bpy.context.scene.collection.objects.link(o)

    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    salida = os.path.join(MODELOS, f'cabeza-{clave}.glb')
    comunes = dict(filepath=salida, export_format='GLB', use_selection=True, export_apply=True, export_animations=False,
                   export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    for extra in (dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
        try:
            bpy.ops.export_scene.gltf(**comunes, **extra)
            break
        except TypeError:
            continue
    print(f'EXPORTADO cabeza-{clave}.glb {os.path.getsize(salida)} bytes, {sum(len(q.vertices) - 2 for q in me.polygons)} triangulos, escala {k:.3f}')
    if '--vista' in ARGS:
        sin_cabeza(max((x for x in bpy.data.objects if x.type == 'MESH' and x is not o), key=lambda x: len(x.data.vertices)), hueso['neck'])
        fotos(clave, ojos, k)
