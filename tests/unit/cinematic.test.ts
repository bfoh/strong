import test from 'node:test';
import assert from 'node:assert/strict';
import { frameForProgress, cameraAt } from '../../lib/cinematic/timeline';
import { validSequenceManifest } from '../../lib/cinematic/manifest';
import { FrameCache } from '../../lib/cinematic/FrameCache';
import shot from '../../production/cinematic/shot.json';

test('scroll mapping clamps invalid inputs and preserves exact endpoint/reverse indices', () => {
  assert.equal(frameForProgress(-1,240),0); assert.equal(frameForProgress(1,240),239);
  assert.equal(frameForProgress(Infinity,240),0); assert.equal(frameForProgress(.25,240),60);
  const indices=[0,.25,.5,.75,1,.75,.5,.25,0].map(p=>frameForProgress(p,240));
  assert.deepEqual(indices,[0,60,120,179,239,179,120,60,0]);
});
test('camera path stays continuous at stage joins and has no zero-length look direction', () => {
  for(const key of shot.camera.slice(1,-1)){
    const before=cameraAt(shot.camera,key.progress-1e-7),after=cameraAt(shot.camera,key.progress+1e-7);
    assert.ok(Math.hypot(...before.position.map((v,i)=>v-after.position[i]))<.0001);
    assert.ok(Math.hypot(...before.target.map((v,i)=>v-after.target[i]))<.0001);
  }
  for(let i=0;i<240;i++) { const view=cameraAt(shot.camera,i/239); assert.ok(Math.hypot(...view.position.map((v,n)=>v-view.target[n]))>.1); }
});
test('sequence manifest rejects mismatched counts, oversized dimensions and remote frame URLs', () => {
  const variant={width:8,height:8,frameCount:2,fps:24,poster:'/cinematic/test/poster.webp',frames:['/cinematic/test/frame-0.webp','/cinematic/test/frame-1.webp']};
  const m={version:1,id:'test',status:'blocking-preview',description:'Test',provenance:'Owned',variants:{desktop:variant,mobile:variant}};
  assert.ok(validSequenceManifest(m)); assert.ok(!validSequenceManifest({...m,variants:{...m.variants,desktop:{...variant,frameCount:240}}}));
  assert.ok(!validSequenceManifest({...m,variants:{...m.variants,desktop:{...variant,width:8000}}}));
  assert.ok(!validSequenceManifest({...m,variants:{...m.variants,desktop:{...variant,frames:['https://unsafe.example/frame.webp',variant.frames[1]]}}}));
});
test('bounded cache cancels stale seeks, releases evictions and cleans late resources', async () => {
  const originalFetch=globalThis.fetch, originalBitmap=globalThis.createImageBitmap;
  let opened=0,closed=0,active=0,peakActive=0,errors=0;
  const painted:number[]=[];
  globalThis.fetch=async (_url,options)=> {
    active++;peakActive=Math.max(peakActive,active);
    try {await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,3);options?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});return new Response(new Blob(['test']));} finally {active--;}
  };
  globalThis.createImageBitmap=async ()=>{opened++;return {width:8,height:8,close:()=>{closed++;}} as ImageBitmap;};
  const cache=new FrameCache({width:8,height:8,frameCount:72,fps:24,poster:'/cinematic/test/poster.webp',frames:Array.from({length:72},(_,i)=>`/cinematic/test/frame-${i}.webp`)},{maxFrames:3,maxBytes:768,onFrame:i=>painted.push(i),onError:()=>errors++});
  const settle=async(index:number)=>{for(let i=0;i<100&&!cache.get(index);i++)await new Promise(r=>setTimeout(r,2));assert.ok(cache.get(index));};
  try {
    cache.request(0);cache.request(71);cache.request(0);await settle(0);
    for(const index of [20,40,71,2,0]){cache.request(index);await settle(index);}
    assert.equal(painted.at(-1),0);assert.equal(errors,0);assert.ok(peakActive<=2);
    assert.ok(cache.stats().peakCachedFrames<=3);assert.ok(cache.stats().peakDecodedBytes<=768);assert.ok(closed>0);
    cache.request(60);cache.dispose();await new Promise(r=>setTimeout(r,20));
    assert.equal(cache.stats().cachedFrames,0);assert.equal(opened,closed);
  } finally {cache.dispose();globalThis.fetch=originalFetch;globalThis.createImageBitmap=originalBitmap;}
});
