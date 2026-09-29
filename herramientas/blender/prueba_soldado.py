# El soldado del mapa de PRUEBA de la Guerra civil (29/09/2026).
#   blender -b -P herramientas/blender/prueba_soldado.py
#
# Sale del «Toon Shooter Game Kit» de Quaternius (CC0), que Isidro bajó a
# herramientas/paquetes/ (fuera de git). Trae cuerpo, cabeza, esqueleto, 17
# animaciones y trece armas colgadas de la mano: el juego enseña la de cada
# tipo de soldado y esconde las demás.
#
# Lo que se hace aquí:
#   · se quita la esfera suelta que trae el archivo (un ayudante del autor);
#   · se adelgaza a la mitad (20.700 triángulos → unos 10.000 con TODAS las
#     armas; con una sola a la vista, unos 3.500 por soldado);
#   · se quedan solo las animaciones que usa la partida;
#   · se exporta a public/models/prueba-soldado.glb SIN Draco: con esqueleto,
#     lo comprimido no compensa el riesgo de que los pesos lleguen mal.

import bpy, os

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORIGEN = os.path.join(RAIZ, 'herramientas', 'paquetes', 'quaternius', 'toon-shooter',
                      'Toon Shooter Game Kit - Dec 2022', 'Characters', 'glTF', 'Character_Soldier.gltf')
SALIDA = os.path.join(RAIZ, 'public', 'models', 'prueba-soldado.glb')
SE_QUEDAN = {'Idle', 'Idle_Shoot', 'Walk', 'Walk_Shoot', 'Run', 'Run_Shoot', 'Death', 'HitReact', 'Duck'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ORIGEN)

for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None:
        bpy.data.objects.remove(o)

antes = 0
despues = 0
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    antes += len(o.data.polygons)
    d = o.modifiers.new('menos', 'DECIMATE')
    d.ratio = 0.5
    # El modificador de adelgazar tiene que ir ANTES del de esqueleto.
    while o.modifiers[0].name != 'menos':
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_move_up(modifier='menos')
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='menos')
    despues += len(o.data.polygons)

for a in list(bpy.data.actions):
    if a.name not in SE_QUEDAN:
        bpy.data.actions.remove(a)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=SALIDA, export_format='GLB', use_selection=True,
    export_yup=True, export_lights=False, export_cameras=False,
    export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_draco_mesh_compression_enable=False
)
print('SOLDADO', antes, '->', despues, 'caras;', [a.name for a in bpy.data.actions], os.path.getsize(SALIDA), 'bytes')
