import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd(), concepts = path.join(root, 'docs/concepts/interactive-homepage-v1'), output = path.join(root, 'public/images/house-v1');
await mkdir(output, { recursive: true });
const originals = {
 exterior: path.join(concepts, '01-exterior.png'), hallway: path.join(concepts, '02-hallway.png'),
 listings: path.join(concepts, '03-listings-room.png'), team: path.join(concepts, '05-team-room.png'),
 contact: path.join(concepts, '06-contact-room.png'), rear: path.join(concepts, '04-exterior-gallery.png'),
 'front-left': path.join(concepts, 'production-front-left.png'), left: path.join(concepts, 'production-left.png'),
 right: path.join(concepts, 'production-right.png'), 'front-right': path.join(concepts, 'production-front-right.png'),
};
const records = [];
for (const [name, source] of Object.entries(originals)) {
 await sharp(source).resize({ width: 1672, withoutEnlargement: true }).webp({ quality: 85, effort: 6 }).toFile(path.join(output, name + '-desktop.webp'));
 const mobile = name === 'exterior' ? { width: 720, height: 960, fit: 'cover', position: 'centre' } : { width: 960, withoutEnlargement: true };
 await sharp(source).resize(mobile).webp({ quality: 80, effort: 6 }).toFile(path.join(output, name + '-mobile.webp'));
 await sharp(source).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(path.join(output, name + '-thumb.webp'));
 await sharp(source).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(path.join(output, name + '-gallery.webp'));
 records.push({ name, desktopBytes: (await stat(path.join(output, name + '-desktop.webp'))).size, mobileBytes: (await stat(path.join(output, name + '-mobile.webp'))).size });
}
await sharp(originals.exterior).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(path.join(output, 'social.jpg'));
await writeFile(path.join(concepts, 'asset-manifest.json'), JSON.stringify({ method: 'Built-in image_gen; sharp responsive encoding', conceptual: true, records }, null, 2));
console.log(JSON.stringify({ assets: records, initialMobileHeroBytes: records[0].mobileBytes }, null, 2));
