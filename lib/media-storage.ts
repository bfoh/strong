import 'server-only';
import { db } from './server';
import { MEDIA_BUCKET, parseStorageReference, type MediaRecord } from './media';
export async function ensureMediaBucket() {
  const client = db(); if (!client) throw Error('Storage is not configured.');
  const { data, error } = await client.storage.getBucket(MEDIA_BUCKET);
  if (error) {
    const created = await client.storage.createBucket(MEDIA_BUCKET, { public: false, fileSizeLimit: 50 * 1024 * 1024, allowedMimeTypes: ['image/webp', 'video/mp4', 'video/webm', 'application/pdf'] });
    if (created.error) {
      const retry = await client.storage.getBucket(MEDIA_BUCKET);
      if (retry.error || retry.data?.public) throw Error('The private media bucket could not be configured.');
    }
  } else if (data.public) { throw Error('The media bucket must be private before uploads are allowed.'); }
  return client;
}
export async function removeStoredObject(media: Pick<MediaRecord, 'id' | 'property_id' | 'url'>) {
  const reference = parseStorageReference(media.url);
  if (!reference) return;
  if (reference.mediaId !== media.id || reference.propertyId !== media.property_id) throw Error('The stored media reference does not match this property.');
  const client = db(); if (!client) throw Error('Storage is not configured.');
  const { error } = await client.storage.from(MEDIA_BUCKET).remove([reference.path]);
  if (error) throw Error('The stored file could not be removed. Please retry.');
}
