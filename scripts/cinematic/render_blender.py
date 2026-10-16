"""Run inside Blender 4.2+: renders a supplied, licensed .blend scene.
No architectural geometry is generated here. Full rendering requires signed
visual proof tied to the SHA-256 of the exact source scene.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path


def camera_at(knots, progress):
    p = max(0, min(1, progress))
    i = 0
    while i < len(knots) - 2 and p > knots[i + 1]['progress']:
        i += 1
    a, b = knots[i], knots[i + 1]
    before, after = knots[max(0, i - 1)], knots[min(len(knots) - 1, i + 2)]
    dt = b['progress'] - a['progress']
    t = (p - a['progress']) / dt
    h = (2*t**3-3*t*t+1, t**3-2*t*t+t, -2*t**3+3*t*t, t**3-t*t)
    def sample(key):
        return [h[0]*a[key][axis] + h[1]*dt*(0 if i == 0 else (b[key][axis]-before[key][axis])/(b['progress']-before['progress'])) + h[2]*b[key][axis] + h[3]*dt*(0 if i == len(knots)-2 else (after[key][axis]-a[key][axis])/(after['progress']-a['progress'])) for axis in range(3)]
    return sample('position'), sample('target')


def convert(v):
    return (v[0], -v[2], v[1])


def main():
    import bpy
    from mathutils import Vector
    parser = argparse.ArgumentParser()
    parser.add_argument('--shot', default='production/cinematic/shot.json')
    parser.add_argument('--scene', required=True)
    parser.add_argument('--licenses', required=True)
    parser.add_argument('--approval')
    parser.add_argument('--variant', choices=['desktop', 'mobile'], default='desktop')
    parser.add_argument('--output', required=True)
    parser.add_argument('--proof', action='store_true')
    parser.add_argument('--device', choices=['CPU', 'GPU'], default='CPU')
    parser.add_argument('--samples', type=int, default=256)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    scene_path = Path(args.scene).resolve()
    if not scene_path.is_file() or scene_path.suffix != '.blend':
        raise ValueError('Supply the reviewed architectural .blend scene.')
    licenses = json.loads(Path(args.licenses).read_text())
    if not licenses.get('assets') or any(not a.get('source') or not a.get('license') or a.get('webRenderPermitted') is not True for a in licenses['assets']):
        raise ValueError('Every geometry, texture, HDRI and vegetation asset needs its source and render license.')
    digest = hashlib.sha256(scene_path.read_bytes()).hexdigest()
    approval = None
    if not args.proof:
        approval = json.loads(Path(args.approval).read_text()) if args.approval else {}
        if approval.get('visualApproved') is not True or approval.get('continuityApproved') is not True or not approval.get('reviewedBy') or approval.get('sceneSha256') != digest:
            raise ValueError('Full rendering blocked: approve visual proof and camera continuity for this exact scene first.')
    shot = json.loads(Path(args.shot).read_text())
    output = Path(args.output).resolve(); output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(scene_path))
    scene = bpy.context.scene
    if not any(o.type == 'MESH' for o in scene.objects):
        raise ValueError('The supplied scene has no architectural geometry.')
    missing = [im.filepath for im in bpy.data.images if im.source == 'FILE' and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).is_file()]
    if missing:
        raise ValueError('Scene has missing external texture files; pack or resolve assets before rendering.')
    scene.render.engine = 'CYCLES'; scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True; scene.cycles.device = args.device
    if args.device == 'GPU':
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.get_devices()
        enabled = [d for d in prefs.devices if d.type != 'CPU']
        if not enabled:
            raise ValueError('No GPU render device is available. Configure Cycles preferences or select CPU.')
        for d in prefs.devices:
            d.use = d.type != 'CPU'
    scene.render.fps = shot['fps']; scene.frame_start = 1; scene.frame_end = shot['frameCount']
    master = shot['masters'][args.variant]
    scene.render.resolution_x = master['width']; scene.render.resolution_y = master['height']; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '16'
    scene.view_settings.view_transform = 'AgX'
    scene.render.film_transparent = False; scene.render.use_file_extension = True
    # Frozen lighting/materials/geometry; animate only a dedicated render camera.
    for object in scene.objects:
        if object.animation_data and object.type != 'CAMERA':
            raise ValueError('Scene contains animated non-camera objects. Freeze geometry and lighting first.')
    camera_data = bpy.data.cameras.new('Strong_Cinematic_Camera')
    camera = bpy.data.objects.new('Strong_Cinematic_Camera', camera_data); scene.collection.objects.link(camera); scene.camera = camera
    camera_data.lens = shot['lensMm']; camera_data.sensor_fit = master['sensorFit']; camera_data.sensor_width = 36; camera_data.sensor_height = 46 if args.variant == 'mobile' else 24
    camera_data.clip_start = .05; camera_data.clip_end = 500; camera_data.dof.use_dof = False
    for block in [*bpy.data.materials, *bpy.data.worlds, *bpy.data.shape_keys]:
        if getattr(block, 'animation_data', None) or getattr(getattr(block, 'node_tree', None), 'animation_data', None):
            raise ValueError('Scene has animated materials, lighting or shape keys. Freeze them before proof.')
    if any(o.particle_systems or any(m.type in {'CLOTH', 'SOFT_BODY', 'FLUID'} for m in o.modifiers) for o in scene.objects):
        raise ValueError('Scene has dynamic simulations. Freeze them for a consistent frame sequence.')
    camera.rotation_mode = 'QUATERNION'
    previous = None; telemetry = []
    for frame in range(1, shot['frameCount']+1):
        progress = (frame-1)/(shot['frameCount']-1)
        position, target = camera_at(shot['camera'], progress)
        camera.location = Vector(convert(position)); direction = Vector(convert(target)) - camera.location
        rotation = direction.to_track_quat('-Z', 'Y')
        if previous and previous.dot(rotation) < 0:
            rotation.negate()
        previous = rotation.copy(); camera.rotation_quaternion = rotation
        camera.keyframe_insert(data_path='location', frame=frame); camera.keyframe_insert(data_path='rotation_quaternion', frame=frame)
        telemetry.append({'frame':frame-1,'progress':progress,'position':position,'target':target})
    # Every rendered integer frame is baked exactly. No object/camera morphing.
    scene.render.filepath = str(output / 'frame-')
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'animated-shot.blend'))
    (output/'camera-telemetry.json').write_text(json.dumps(telemetry, indent=2)+'\n')
    (output/'render-provenance.json').write_text(json.dumps({'sceneSha256':digest,'variant':args.variant,'engine':'Cycles','samples':args.samples,'proofOnly':args.proof,'approval':approval,'licenses':licenses,'shot':shot},indent=2)+'\n')
    frames = [1, round((shot['frameCount']-1)*.25)+1, round((shot['frameCount']-1)*.5)+1, round((shot['frameCount']-1)*.75)+1, shot['frameCount']] if args.proof else range(1, shot['frameCount']+1)
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = str(output / ('frame-%04d' % (frame-1)))
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
