# Un cuerpo de `cuerpo_de_fuera.py` (malla en .json y textura en .png) a un .glb
# corriente, sin esqueleto: lo que pide el montador de esqueletos de Meshy.
#   blender -b -P herramientas/blender/json_a_glb.py -- <clave> <salida.glb>
import bpy, sys, json, os
a = sys.argv[sys.argv.index('--') + 1:]
clave, salida = a[0], a[1]
dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vistas', 'cuerpos')
m = json.load(open(os.path.join(dir, clave + '.json'), encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
P, I, U = m['pos'], m['indices'], m['uv']
# glTF (y arriba, mira a +z) → Blender (z arriba, mira a -y)
verts = [(P[i], -P[i + 2], P[i + 1]) for i in range(0, len(P), 3)]
caras = [(I[i], I[i + 1], I[i + 2]) for i in range(0, len(I), 3)]
me = bpy.data.meshes.new(clave); me.from_pydata(verts, [], caras); me.update()
uv = me.uv_layers.new(name='UVMap')
for li, loop in enumerate(me.loops):
    v = loop.vertex_index
    uv.data[li].uv = (U[v * 2], 1 - U[v * 2 + 1])
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new(clave, me); bpy.context.scene.collection.objects.link(ob)
mat = bpy.data.materials.new(clave); mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.8; bsdf.inputs['Metallic'].default_value = 0
tx = mat.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(dir, clave + '.png'))
mat.node_tree.links.new(tx.outputs['Color'], bsdf.inputs['Base Color'])
me.materials.append(mat)
# Soldar lo que el .json trae partido por las costuras, para que el montador vea una sola piel.
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=88)
print('HECHO', salida, len(me.vertices), 'vertices')
