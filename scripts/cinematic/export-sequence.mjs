// Validate both externally rendered masters, then atomically select a new
// versioned manifest. No preview can be promoted through this exporter.
import { readFile, mkdir, writeFile, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const [desktopDir,mobileDir,version] = process.argv.slice(2);
if (!desktopDir || !mobileDir || !/^[a-z0-9-]+$/.test(version || '') || version.startsWith('blocking')) throw Error('Usage: node scripts/cinematic/export-sequence.mjs DESKTOP_RENDER_DIR MOBILE_RENDER_DIR VERSION');
const first=JSON.parse(await readFile(resolve(desktopDir,'render-provenance.json'),'utf8'));
const count=first.shot.frameCount;
if (!Number.isInteger(count) || count < 192 || count > 360 || first.shot.fps < 24 || first.shot.fps > 30) throw Error('Approved source must have192–360 frames at24–30fps.');
const root = resolve(`public/cinematic/${version}`), evidenceRoot=resolve(`docs/cinematic-production/${version}`);
let exists=false; try { await stat(root); exists=true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (exists) throw Error('Version directory already exists. Choose a new immutable asset version.');
await mkdir(evidenceRoot,{recursive:true});
const manifest = {version:1,id:version,status:'production',description:'A single conceptual tropical architectural environment, rendered with Cycles.',provenance:'Reviewed licensed scene; source and render provenance are stored with the production evidence.',variants:{}};
for (const [key,input,width,height] of [['desktop',desktopDir,1280,720],['mobile',mobileDir,720,1280]]) {
  const evidence = JSON.parse(await readFile(resolve(input,'render-provenance.json'),'utf8'));
  if (evidence.proofOnly || evidence.engine !== 'Cycles' || evidence.shot.frameCount !== count || evidence.shot.fps !== first.shot.fps || evidence.approval?.visualApproved !== true || evidence.approval?.continuityApproved !== true || evidence.approval?.sceneSha256 !== evidence.sceneSha256) throw Error('Full approved Cycles renders are required.');
  const otherKey = key === 'desktop' ? 'mobile' : 'desktop';
  if (manifest[`${otherKey}Hash`] && manifest[`${otherKey}Hash`] !== evidence.sceneSha256) throw Error('Masters must use the same scene.');
  manifest[`${key}Hash`] = evidence.sceneSha256;
  await mkdir(`${root}/${key}`,{recursive:true}); const frames = []; let bytes = 0;
  for (let index=0;index<count;index++) {
    const file = `frame-${String(index).padStart(4,'0')}`;
    const source = resolve(input,`${file}.png`), metadata = await sharp(source).metadata();
    const master = evidence.shot.masters[key];
    if (metadata.width !== master.width || metadata.height !== master.height) throw Error(`Master dimensions mismatch at ${key}/${file}`);
    const result = await sharp(source).resize(width,height,{fit:'cover'}).webp({quality:80,effort:5}).toFile(`${root}/${key}/${file}.webp`);
    if (result.size > 2*1024*1024) throw Error('Individual encoded frame exceeds client limit.');
    bytes += result.size; frames.push(`/cinematic/${version}/${key}/${file}.webp`);
  }
  await sharp(resolve(input,`frame-${String(Math.round((count-1)*.5)).padStart(4,'0')}.png`)).resize(width,height,{fit:'cover'}).webp({quality:87}).toFile(`${root}/${key}/poster.webp`);
  manifest.variants[key] = {width,height,frameCount:count,fps:evidence.shot.fps,poster:`/cinematic/${version}/${key}/poster.webp`,frames};
  await writeFile(`${evidenceRoot}/${key}-delivery-report.json`,JSON.stringify({encodedBytes:bytes,decodedFrameBytes:width*height*4,renderProvenance:evidence},null,2)+'\n');
}
delete manifest.desktopHash; delete manifest.mobileHash;
await writeFile('public/cinematic/manifest.next.json',JSON.stringify(manifest,null,2)+'\n');
await rename('public/cinematic/manifest.next.json','public/cinematic/manifest.json');
console.log('Exported both consistent approved masters and selected their versioned manifest. Benchmark before deployment.');
