import { safeMediaUrl, type PropertyMedia } from './data';
export const MEDIA_BUCKET = 'strong-property-media';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const reference = new RegExp(`^sp-storage://${MEDIA_BUCKET}/(${uuid})/(public|private)/(${uuid})/(${uuid})\\.(webp|mp4|webm|pdf)$`, 'i');
export type MediaRecord = PropertyMedia & { property_id: string; sort_order: number };
export function parseStorageReference(value: string) {
  const match = reference.exec(value);
  if (!match) return undefined;
  return { bucket: MEDIA_BUCKET, propertyId: match[1], visibility: match[2] as 'public' | 'private', mediaId: match[3], path: value.slice(`sp-storage://${MEDIA_BUCKET}/`.length), extension: match[5] };
}
export function publicMediaUrl(media: Pick<MediaRecord, 'id' | 'kind' | 'url'> & { property_id?: string }) {
  if (media.kind === 'document') return undefined;
  const stored = parseStorageReference(media.url);
  if (stored) return stored.visibility === 'public' && stored.mediaId === media.id && (!media.property_id || stored.propertyId === media.property_id) ? `/api/media/${media.id}` : undefined;
  return safeMediaUrl(media.url);
}
export function mimeForExtension(extension: string) {
  return ({ webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' } as Record<string, string>)[extension];
}
