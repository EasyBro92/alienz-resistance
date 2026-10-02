# Prueba de que Blender funciona en este PC y de cuánto tarda en hornear luz.
#   blender -b -P herramientas/blender/prueba_pc.py
#
# Hace lo mismo que los guiones de los mapas, en pequeño: una escena de cajas,
# un segundo juego de UV, y un horneado difuso con Cycles a 512 px y 24
# muestras. Si esto acaba y dice PRUEBA_OK, los mapas se pueden regenerar aquí.
# El tiempo sirve de vara de medir: en el portátil donde se hicieron Madrid y
# Valencia (i5-1335U, 16 GB) tarda unos 4,5 segundos.
import bpy, time, math, random

t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene
esc.render.engine = 'CYCLES'
esc.cycles.device = 'CPU'
esc.cycles.samples = 24
mundo = bpy.data.worlds.new('m'); esc.world = mundo; mundo.use_nodes = True
cielo = mundo.node_tree.nodes.new('ShaderNodeTexSky')
mundo.node_tree.links.new(cielo.outputs[0], mundo.node_tree.nodes['Background'].inputs[0])

random.seed(1)
bpy.ops.mesh.primitive_plane_add(size=200)
for i in range(40):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(random.uniform(-80, 80), random.uniform(-80, 80), 10))
    bpy.context.object.scale = (15, 15, 20)
mat = bpy.data.materials.new('m'); mat.use_nodes = True
objs = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in objs:
    o.select_set(True); o.data.materials.append(mat)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.join()
o = bpy.context.object
luz = o.data.uv_layers.new(name='luz')
o.data.uv_layers.active = luz
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.003)
bpy.ops.object.mode_set(mode='OBJECT')
im = bpy.data.images.new('luz', 512, 512, alpha=False, float_buffer=True)
nd = mat.node_tree.nodes.new('ShaderNodeTexImage'); nd.image = im
mat.node_tree.nodes.active = nd
t1 = time.time()
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=2)
print(f'PRUEBA_OK horneado {time.time() - t1:.1f} s, total {time.time() - t0:.1f} s, Blender {bpy.app.version_string}')
