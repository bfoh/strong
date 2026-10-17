import { excludeUnreviewed } from '@/lib/media-review';
import { storageResponse } from '@/lib/storage-response';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, launchSchemaAvailable } from '@/lib/server';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { parseStorageReference, mimeForExtension } from '@/lib/media';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id), client = db();
  const unavailable = () => NextResponse.json({ error: 'Media not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!id.success || !client) return unavailable();
  const { data: media, error } = await client.from('property_media').select('id,property_id,kind,url,properties(status)').eq('id', id.data).maybeSingle();
  if (error || !media) return unavailable();
  const stored = parseStorageReference(media.url);
  if (!stored || stored.mediaId !== media.id || stored.propertyId !== media.property_id) return unavailable();
  const property = media.properties as unknown as { status: string } | null;
  let isPublic = stored.visibility === 'public' && media.kind !== 'document' && property?.status === 'published';
  if (isPublic && await launchSchemaAvailable()) {
    const approved = await client.from('properties').select('id').eq('id',media.property_id).eq('status','published').eq('review_status','approved').eq('publication_authorized',true).eq('availability','available').maybeSingle();
    isPublic = !approved.error && Boolean(approved.data);
  }
  if (isPublic) isPublic = Boolean((await excludeUnreviewed([{ id: media.property_id }])).length);
  if (!isPublic) { const person = await staff(); if (!person || !canEditProperties(person)) return unavailable(); }
  return storageResponse(req, { bucket: stored.bucket, path: stored.path, mime: mimeForExtension(stored.extension) });
}
