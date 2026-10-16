// Re-encodes the supplied 451-frame villa sequence (1280×720 JPEG) for scroll playback.
// Desktop keeps the native 16:9 frame; mobile is a centred 4:5 crop at full source height.
// Usage: node scripts/cinematic/build-hero-frames.mjs "hero video/frames"
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = process.argv[2] || 'hero video/frames';
const out = 'public/cinematic/hero';
const files = (await fs.readdir(source)).filter(name => /^frame_\d{4}\.jpg$/.test(name)).sort();
if (files.length !== 451) throw new Error(`Expected 451 frames, found ${files.length}`);
const variants = {
  desktop: image => image.webp({ quality: 74, effort: 5 }),
  mobile: image => image.extract({ left: 352, top: 0, width: 576, height: 720 }).webp({ quality: 70, effort: 5 }),
};
for (const name of Object.keys(variants)) await fs.mkdir(path.join(out, name), { recursive: true });
let bytes = { desktop: 0, mobile: 0 };
for (let i = 0; i < files.length; i += 8) {
  await Promise.all(files.slice(i, i + 8).map(async file => {
    const input = await fs.readFile(path.join(source, file));
    const { width, height } = await sharp(input).metadata();
    if (width !== 1280 || height !== 720) throw new Error(`${file} is ${width}×${height}`);
    for (const [name, encode] of Object.entries(variants)) {
      const target = path.join(out, name, file.replace('.jpg', '.webp'));
      await encode(sharp(input)).toFile(target);
      const { size } = await fs.stat(target); bytes[name] += size;
    }
  }));
}
console.log(`${files.length} frames`, Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, `${(v / 1048576).toFixed(1)}MB, avg ${(v / files.length / 1024).toFixed(0)}KB`])));
