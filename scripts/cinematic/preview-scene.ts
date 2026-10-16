// Owned procedural CAMERA BLOCKING ONLY. This is not a production archviz asset.
import * as T from 'three';
import shot from '../../production/cinematic/shot.json';
import { cameraAt } from '../../lib/cinematic/timeline';
declare global { interface Window { renderBlockingFrame: (progress: number, width: number, height: number) => string } }
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.style.margin = '0'; document.body.append(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#ede7db');
scene.add(new T.HemisphereLight('#fff8ec', '#958774', 2));
const sun = new T.DirectionalLight('#ffefcf', 4); sun.position.set(-12, 19, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 70 }); sun.shadow.normalBias = .025; scene.add(sun);
const tile = document.createElement('canvas'); tile.width = tile.height = 256;
const paint = tile.getContext('2d')!, pixels = paint.createImageData(256,256);
let seed = 731;
for (let i=0;i<256*256;i++) { seed = (seed*16807)%2147483647; const grain = (seed/2147483647-.5)*22; pixels.data[i*4]=220+grain; pixels.data[i*4+1]=207+grain; pixels.data[i*4+2]=186+grain; pixels.data[i*4+3]=255; }
paint.putImageData(pixels,0,0); paint.strokeStyle='#bfb09b'; paint.lineWidth=1; paint.strokeRect(0,0,256,128); paint.strokeRect(0,128,256,128);
const texture = new T.CanvasTexture(tile); texture.colorSpace=T.SRGBColorSpace; texture.wrapS=texture.wrapT=T.RepeatWrapping; texture.repeat.set(3,3);
const stone = new T.MeshStandardMaterial({ color: '#d9c9ac', map:texture, bumpMap:texture, bumpScale:.025, roughness: .8 });
const pale = new T.MeshStandardMaterial({ color: '#efe6d5', roughness: .7 });
const bronze = new T.MeshStandardMaterial({ color: '#897250', roughness: .3, metalness: .8 });
const glass = new T.MeshPhysicalMaterial({ color: '#b5cac3', transparent: true, opacity: .3, roughness: .05, metalness: .1, side: T.DoubleSide });
const green = new T.MeshStandardMaterial({ color: '#64705a', roughness: 1 });
function box(position: number[], scale: number[], material = stone) {
  const mesh = new T.Mesh(new T.BoxGeometry(...scale as [number,number,number]), material); mesh.position.fromArray(position); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); return mesh;
}
box([0, -.2, 0], [120, .25, 120], pale);
box([0, .05, -3.5], [18, .3, 15], pale); box([0, .3, -5.5], [16, .2, 9], stone);
box([0, 4.5, -5.5], [16.5, .35, 9.5], pale); box([0, 4.3, -.7], [16.4, .08, .08], bronze);
box([-7.8, 2.3, -5.5], [.35, 4, 9]); box([7.8, 2.3, -6], [.35, 4, 8]); box([0, 2.3, -10], [16, 4, .35]);
for (const z of [-8.5, -6.2, -3.9, -1.6]) box([-4.5, 2.3, z], [.4, 4, .4]);
for (const x of [-2.5, 1, 4.5, 7.5]) { box([x, 2.3, -1], [.27, 4, .27], bronze); box([x-1.6, 2.3, -1], [3, 3.9, .06], glass); }
box([0, .16, 2], [17, .16, 1], pale); box([0, .06, 2.8], [18, .16, .7], pale);
box([.5, -.05, 6], [13, .3, 5.5], stone);
box([.5, .13, 6], [12.6, .015, 5.1], new T.MeshPhysicalMaterial({ color: '#7caaa6', roughness: .07, metalness: .35, clearcoat: 1 }));
box([2.5, .75, -6], [4.5, .25, 1.4], bronze);
for (const [x,z] of [[-10,-5],[10,-6],[11,3],[-11,8]]) {
  const trunk = new T.Mesh(new T.CylinderGeometry(.12,.18,5,12), bronze); trunk.position.set(x,2.5,z); scene.add(trunk);
  for (let n = 0; n < 9; n++) { const leaf = new T.Mesh(new T.SphereGeometry(1,12,6), green); leaf.scale.set(.4,.08,2); leaf.rotation.set(.2,n*Math.PI*2/9,0); leaf.position.set(x,5,z); leaf.castShadow = true; scene.add(leaf); }
}
const camera = new T.PerspectiveCamera(50, 16/9, .05, 200);
window.renderBlockingFrame = (progress, width, height) => {
  renderer.setSize(width,height); camera.aspect = width/height; camera.fov = width < height ? 68 : 52; camera.updateProjectionMatrix();
  const view = cameraAt(shot.camera,progress); camera.position.fromArray(view.position); camera.lookAt(new T.Vector3().fromArray(view.target)); renderer.render(scene,camera);
  return renderer.domElement.toDataURL('image/png');
};
