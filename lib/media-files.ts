import 'server-only';
import sharp from 'sharp';
export const uploadLimits = { image: 12 * 1024 * 1024, video: 50 * 1024 * 1024, document: 10 * 1024 * 1024 };
export class UploadValidationError extends Error {}
export async function prepareUpload(file: File, kind: 'image' | 'video' | 'document') {
  if (file.size === 0 || file.size > uploadLimits[kind]) throw new UploadValidationError('The file is empty or exceeds the size limit.');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (kind === 'image') {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new UploadValidationError('Upload a JPEG, PNG or WebP image.');
    try {
      const image = sharp(bytes, { limitInputPixels: 36_000_000, failOn: 'error' });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw Error();
      const content = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      return { bytes: content, extension: 'webp', mime: 'image/webp' };
    } catch { throw new UploadValidationError('This image is invalid, animated or too large to process safely.'); }
  }
  if (kind === 'document') {
    if (file.type !== 'application/pdf' || bytes.subarray(0, 5).toString() !== '%PDF-') throw new UploadValidationError('Upload a valid PDF document. Documents are always private.');
    return { bytes, extension: 'pdf', mime: 'application/pdf' };
  }
  if (file.type === 'video/mp4' && bytes.subarray(4, 8).toString() === 'ftyp') return { bytes, extension: 'mp4', mime: file.type };
  if (file.type === 'video/webm' && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { bytes, extension: 'webm', mime: file.type };
  throw new UploadValidationError('Upload a valid MP4 or WebM video.');
}
