"""Optional promotional export. Requires external ffmpeg; never powers scrolling."""
import argparse
import shutil
import subprocess
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('input'); p.add_argument('output'); p.add_argument('--fps',type=int,default=24); p.add_argument('--count',type=int,default=240)
a=p.parse_args()
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg: raise SystemExit('Install ffmpeg externally before promotional export.')
folder=Path(a.input).resolve(); output=Path(a.output).resolve()
for i in range(a.count):
    if not (folder/('frame-%04d.png'%i)).is_file(): raise SystemExit('Missing source render frame %d'%i)
if output.exists(): raise SystemExit('Output exists; choose a new export name.')
output.parent.mkdir(parents=True,exist_ok=True)
codec=['-c:v','libvpx-vp9','-crf','30','-b:v','0'] if output.suffix=='.webm' else ['-c:v','libx264','-crf','19','-movflags','+faststart']
subprocess.run([ffmpeg,'-n','-framerate',str(a.fps),'-start_number','0','-i',str(folder/'frame-%04d.png'),'-frames:v',str(a.count),*codec,'-pix_fmt','yuv420p',str(output)],check=True)
