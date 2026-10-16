import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
// Requires installed Chrome/WebGL, not Blender. Never promoted to production.
const compiled = await build({ entryPoints: ['scripts/cinematic/preview-scene.ts'], bundle: true, write: false, platform: 'browser', format: 'iife', minify: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const manifest = { version: 1, id: 'strong-pavilion-blocking-v3', status: 'blocking-preview', description: 'Temporary camera blocking preview. Final licensed scene and Cycles renders pending.', provenance: 'Owned procedural Three.js scene rendered once to a consistent frame sequence. Not photorealistic footage or a property listing.', variants: {} };
const output = 'public/cinematic/blocking-v3';
const evidence = 'docs/visual-verification/cinematic-v3';
await mkdir(evidence, { recursive: true });
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: compiled.outputFiles[0].text });
  for (const [key, width, height] of [['desktop',960,540],['mobile',540,960]]) {
    await mkdir(`${output}/${key}`, { recursive: true });
    const count = 72, files = [], frames = [];
    for (let index = 0; index < count; index++) {
      const p = index / (count-1);
      const data = await page.evaluate(({p,width,height}) => window.renderBlockingFrame(p,width,height), {p,width,height});
      const buffer = Buffer.from(data.split(',')[1],'base64');
      const stats = await sharp(buffer).stats();
      if (stats.channels.slice(0,3).every(channel => channel.max < 10) || stats.channels.slice(0,3).every(channel => channel.stdev < 1)) throw Error('Blocking render failed: black or empty frame; no successful render claimed.');
      const filename = `frame-${String(index).padStart(4,'0')}.webp`;
      const info = await sharp(buffer).webp({quality:78,effort:4}).toFile(`${output}/${key}/${filename}`);
      frames.push(`/cinematic/blocking-v3/${key}/${filename}`); files.push({ index, bytes:info.size, sourcePngSha256:createHash('sha256').update(buffer).digest('hex') });
      if ([0,18,36,53,71].includes(index)) await writeFile(`${evidence}/source-${key}-${String(index).padStart(3,'0')}.png`,buffer);
    }
    await sharp(`${output}/${key}/frame-0036.webp`).webp({quality:85}).toFile(`${output}/${key}/poster.webp`);
    manifest.variants[key] = {width,height,frameCount:count,fps:7.2,poster:`/cinematic/blocking-v3/${key}/poster.webp`,frames};
    await writeFile(`${evidence}/assets-${key}.json`,JSON.stringify({previewOnly:true,files,totalBytes:files.reduce((s,f)=>s+f.bytes,0)},null,2)+'\n');
  }
  await mkdir('public/cinematic',{recursive:true});
  await writeFile('public/cinematic/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log('Rendered 72 consistent temporary blocking frames per master. Production visual gate remains blocked.');
} finally { await browser.close(); }
