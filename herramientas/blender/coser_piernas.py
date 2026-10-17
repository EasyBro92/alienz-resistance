# Coser a un cuerpo de Hunyuan3D que sale cortado las piernas de otro.
#
# Isidro, 17/10/2026: rehízo la ballestera con la cara seria, pero Hunyuan la
# sacó cortada a medio muslo: «¿puedes coger las otras y ajustarlas para que no
# se noten? Las que te pasé con la cara sonriente». Las dos llevan media negra
# hasta el muslo, así que la costura va DENTRO de la media, donde no se ve:
#   - la escala sale del grosor de los muslos justo bajo la entrepierna (las dos
#     vienen normalizadas a su caja, y a la cortada le falta media figura);
#   - de la vieja se queda lo que hay por debajo del corte, con 3,5 cm de más que
#     se meten por dentro de la nueva;
#   - cada pierna se lleva al centro de su anillo del corte y en sus 15 cm de
#     arriba se estrecha hasta el radio de la nueva (un 4 % menos: va por dentro).
# Sale UN objeto con los dos materiales: `cuerpo_de_fuera.py` hornea del mayor.
#
#   blender -b -P herramientas/blender/coser_piernas.py -- <cortada.glb> <con-piernas.glb> <salida.glb>
import bpy, bmesh, sys, math, mathutils
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
NUEVA, VIEJA, SALIDA = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)

def cargar(ruta):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    ms = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
    o = max(ms, key=lambda x: len(x.data.vertices))
    # dejar la transformación aplicada en los vértices
    o.data.transform(o.matrix_world); o.parent = None; o.matrix_world = mathutils.Matrix()
    return o

n = cargar(NUEVA); v = cargar(VIEJA)
def coords(o):
    c = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', c); return c.reshape(-1, 3)
N, V = coords(n), coords(v)
print('NUEVA', N.min(0).round(3), N.max(0).round(3), len(N))
print('VIEJA', V.min(0).round(3), V.max(0).round(3), len(V))

def anillo(P, z0, z1, lado):
    m = (P[:, 2] >= z0) & (P[:, 2] <= z1) & ((P[:, 0] > 0) == (lado > 0))
    q = P[m]
    if len(q) < 10: return None
    c = q[:, :2].mean(0)
    r = np.sqrt(((q[:, :2] - c) ** 2).sum(1))
    return c, np.median(r), len(q)

def entrepierna(P):
    # lo más bajo de lo que cruza el eje x≈0 entre las piernas
    zmin, zmax = P[:, 2].min(), P[:, 2].max()
    m = (np.abs(P[:, 0]) < 0.01) & (P[:, 2] < zmin + (zmax - zmin) * 0.7)
    return P[m, 2].min()

# --- la nueva: dónde está el corte y cómo son los muslos ahí
cn = N[:, 2].min()
cr_n = entrepierna(N)
print('corte nueva', round(cn, 3), 'entrepierna', round(cr_n, 3))
cr_v = entrepierna(V)
print('entrepierna vieja', round(cr_v, 3), 'suelo', round(V[:, 2].min(), 3))
# grosor del muslo justo bajo la entrepierna, en las dos
def muslo(P, cr, alto):
    rs = [anillo(P, cr - alto * 0.06, cr - alto * 0.03, l)[1] for l in (-1, 1)]
    return sum(rs) / 2
alto_n = N[:, 2].max() - cn
alto_v = V[:, 2].max() - V[:, 2].min()
s = muslo(N, cr_n, alto_v * 0.7) / muslo(V, cr_v, alto_v)
print('escala', round(s, 4))
# altura de la vieja que corresponde al corte de la nueva (con 3 cm de solape hacia arriba)
SOLAPE = 0.035
h_v = cr_v + (cn - cr_n) / s
h_corte = cr_v + (cn + SOLAPE - cr_n) / s

# --- quitar de la vieja todo lo que esté por encima del corte
bm = bmesh.new(); bm.from_mesh(v.data)
fuera = [f for f in bm.faces if max(x.co.z for x in f.verts) > h_corte]
bmesh.ops.delete(bm, geom=fuera, context='FACES')
sueltos = [x for x in bm.verts if not x.link_faces]
bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
bm.to_mesh(v.data); bm.free()
V = coords(v)

# --- colocar cada pierna: escalar, subir y llevar su centro al anillo del corte
for lado in (-1, 1):
    an = anillo(N, cn, cn + 0.02, lado)
    av = anillo(V, h_v - 0.02 / s, h_v, lado)
    print('lado', lado, 'nueva', an[0].round(3), round(an[1], 4), 'vieja', av[0].round(3), round(av[1] * s, 4))
    m = (V[:, 0] > 0) == (lado > 0)
    P = V[m].copy()
    # en la vieja, en su sitio: centro del anillo como origen
    P[:, :2] -= av[0]; P[:, 2] -= h_v
    P *= s
    # el radio: en el corte igual que la nueva (un 4 % menos: va por dentro), y a 15 cm ya el suyo
    k_arriba = an[1] * 0.96 / (av[1] * s)
    t = np.clip(1 + P[:, 2] / 0.15, 0, 1)  # 1 en el corte, 0 a 15 cm por debajo
    k = 1 + (k_arriba - 1) * t
    P[:, :2] *= k[:, None]
    P[:, :2] += an[0]; P[:, 2] += cn
    V[m] = P
v.data.vertices.foreach_set('co', V.ravel()); v.data.update()

# --- juntar en un solo objeto (dos materiales)
bpy.ops.object.select_all(action='DESELECT')
n.select_set(True); v.select_set(True); bpy.context.view_layer.objects.active = n
bpy.ops.object.join()
for o in list(bpy.data.objects):
    if o != n: bpy.data.objects.remove(o)
P = coords(n)
print('JUNTA', P.min(0).round(3), P.max(0).round(3), len(P))
bpy.ops.export_scene.gltf(filepath=SALIDA, export_format='GLB')
