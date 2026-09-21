# Sondeo: qué hay dentro de cada .glb que vamos a reutilizar en las arenas.
# Uso: blender -b -P herramientas/blender/sondear.py -- modelo1.glb modelo2.glb ...
import bpy, sys, os

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
for ruta in args:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)
    caras = 0
    mallas = 0
    for o in bpy.data.objects:
        if o.type == 'MESH':
            mallas += 1
            caras += len(o.data.polygons)
    dims = [o.dimensions[:] for o in bpy.data.objects if o.type == 'MESH']
    imgs = [(i.name, i.size[0], i.size[1]) for i in bpy.data.images]
    print(f"SONDEO {os.path.basename(ruta)}: mallas={mallas} caras={caras} dims={[tuple(round(v,2) for v in d) for d in dims][:3]} imgs={imgs} mats={len(bpy.data.materials)} anim={len(bpy.data.actions)}")
