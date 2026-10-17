import 'server-only';
import { z } from 'zod';
import { db } from './server';
import { REVIEW_BUCKET } from './media-review-model';
export const videoPosterSchema = z.object({ propertyId: z.string().uuid(), videoId: z.string().uuid(), imageId: z.string().uuid() }).strict();
export async function videoPoster(videoId: string, propertyId: string) {
  const client = db(); if (!client) return undefined;
  const result = await client.storage.from(REVIEW_BUCKET).download(`posters/${videoId}.json`);
  if (result.error) {
    if (['400', '404'].includes(String(result.error.statusCode))) return undefined;
    throw Error('Video poster could not be loaded.');
  }
  const poster = videoPosterSchema.parse(JSON.parse(await result.data.text()));
  return poster.videoId === videoId && poster.propertyId === propertyId ? `/api/media/${poster.imageId}` : undefined;
}
