import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/origin';
import { db } from '@/lib/server';
import { MEDIA_BUCKET, type MediaRecord } from '@/lib/media';
import { prepareUpload, UploadValidationError } from '@/lib/media-files';
import { boundedBody, BodyTooLargeError } from '@/lib/request-body';
import { ensureMediaBucket, removeStoredObject } from '@/lib/media-storage';
export const runtime = 'nodejs';
const idSchema = z.string().uuid().transform(id => id.toLowerCase());
const fields = z.object({ propertyId: idSchema, kind: z.enum(['image', 'video', 'document']), caption: z.string().trim().max(300), visibility: z.enum(['public', 'private']), replaceId: z.union([idSchema, z.literal('')]).optional() });
async function editor(req?: Request) {
  if (req && !sameOrigin(req)) return null;
  const person = await staff(); return person && canEditProperties(person) ? person : null;
}
export async function GET(req: Request) {
  if (!await editor()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const id = idSchema.safeParse(new URL(req.url).searchParams.get('propertyId'));
  if (!id.success) return NextResponse.json({ error: 'Invalid property.' }, { status: 400 });
  const { data, error } = await db()!.from('property_media').select('id,property_id,kind,url,caption,sort_order').eq('property_id', id.data).order('sort_order').order('id');
  if (error) return NextResponse.json({ error: 'Media could not be loaded.' }, { status: 503 });
  return NextResponse.json({ media: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(req: Request) {
  const person = await editor(req); if (!person) return NextResponse.json({ error: 'Unauthorized or invalid origin' }, { status: 403 });
  if (Number(req.headers.get('content-length')) > 52 * 1024 * 1024) return NextResponse.json({ error: 'The upload is too large.' }, { status: 413 });
  try {
    if (!req.headers.get('content-type')?.startsWith('multipart/form-data;')) return NextResponse.json({ error: 'Use a multipart file upload.' }, { status: 415 });
    const form = await new Response(await boundedBody(req, 52 * 1024 * 1024), { headers: { 'content-type': req.headers.get('content-type')! } }).formData(), file = form.get('file');
    const parsed = fields.safeParse(Object.fromEntries(['propertyId', 'kind', 'caption', 'visibility', 'replaceId'].map(k => [k, String(form.get(k) || (k === 'visibility' ? 'private' : ''))])));
    if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'Check the property, file and media settings.' }, { status: 400 });
    const input = parsed.data, client = db()!;
    if (input.kind === 'document' && input.visibility !== 'private') return NextResponse.json({ error: 'Documents must remain private.' }, { status: 400 });
    const property = await client.from('properties').select('id').eq('id', input.propertyId).maybeSingle();
    if (property.error || !property.data) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    const old = input.replaceId ? await client.from('property_media').select('id,property_id,kind,url,caption,sort_order').eq('id', input.replaceId).eq('property_id', input.propertyId).maybeSingle() : null;
    if (old && (!old.data || old.error)) return NextResponse.json({ error: 'Replacement media not found.' }, { status: 404 });
    if (old?.data?.kind && old.data.kind !== input.kind) return NextResponse.json({ error: 'Replace media with the same type.' }, { status: 400 });
    const count = await client.from('property_media').select('id', { head: true, count: 'exact' }).eq('property_id', input.propertyId);
    if (count.error) return NextResponse.json({ error: 'Media could not be checked.' }, { status: 503 });
    if (!old && (count.count || 0) >= 50) return NextResponse.json({ error: 'This property has reached the 50-file limit.' }, { status: 400 });
    const prepared = await prepareUpload(file, input.kind); await ensureMediaBucket();
    const mediaId = old?.data?.id || randomUUID(), path = `${input.propertyId}/${input.visibility}/${mediaId}/${randomUUID()}.${prepared.extension}`;
    const upload = await client.storage.from(MEDIA_BUCKET).upload(path, prepared.bytes, { contentType: prepared.mime, cacheControl: '0', upsert: false });
    if (upload.error) return NextResponse.json({ error: 'The file could not be uploaded.' }, { status: 503 });
    const last = await client.from('property_media').select('sort_order').eq('property_id', input.propertyId).order('sort_order', { ascending: false }).limit(1);
    const row = { id: mediaId, property_id: input.propertyId, kind: input.kind, caption: input.caption || null, url: `sp-storage://${MEDIA_BUCKET}/${path}`, sort_order: old?.data?.sort_order ?? ((last.data?.[0]?.sort_order ?? -1) + 1) };
    const saved = old ? await client.from('property_media').update(row).eq('id', mediaId).eq('property_id', input.propertyId) : await client.from('property_media').insert(row);
    if (saved.error) {
      const cleanup = await client.storage.from(MEDIA_BUCKET).remove([path]);
      if (cleanup.error) await client.from('audit_logs').insert({ actor_id: person.id, entity_type: 'property', entity_id: input.propertyId, action: 'media_cleanup_pending', details: { retired_storage_reference: `sp-storage://${MEDIA_BUCKET}/${path}` } });
      return NextResponse.json({ error: cleanup.error ? 'Media metadata could not be saved. Storage cleanup is pending; contact an administrator.' : 'Media metadata could not be saved; the new upload was removed.' }, { status: 503 });
    }
    let cleanupPending = false;
    if (old?.data) { try { await removeStoredObject(old.data as MediaRecord); } catch { cleanupPending = true; } }
    await client.from('audit_logs').insert({ actor_id: person.id, entity_type: 'property', entity_id: input.propertyId, action: old ? 'media_replace' : 'media_upload', details: { media_id: mediaId, kind: input.kind, visibility: input.visibility, cleanup_pending: cleanupPending, ...(cleanupPending && old?.data ? { retired_storage_reference: old.data.url } : {}) } });
    return NextResponse.json({ ok: true, mediaId, cleanupPending }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json({ error: 'The upload is too large.' }, { status: 413 });
    return NextResponse.json({ error: error instanceof UploadValidationError ? error.message : 'The upload could not be processed. Please retry.' }, { status: error instanceof UploadValidationError ? 400 : 503 });
  }
}
export async function PATCH(req: Request) {
  const person = await editor(req); if (!person) return NextResponse.json({ error: 'Unauthorized or invalid origin' }, { status: 403 });
  let input;
  try { input = z.object({ propertyId: idSchema, ids: z.array(idSchema).min(1).max(50) }).parse(await req.json()); } catch { return NextResponse.json({ error: 'Invalid gallery order.' }, { status: 400 }); }
  if (new Set(input.ids).size !== input.ids.length) return NextResponse.json({ error: 'Duplicate media IDs.' }, { status: 400 });
  const client = db()!, current = await client.from('property_media').select('id').eq('property_id', input.propertyId);
  if (current.error || current.data?.length !== input.ids.length || current.data.some(m => !input.ids.includes(m.id))) return NextResponse.json({ error: 'The gallery changed. Refresh and try again.' }, { status: 409 });
  // Change only ranks. A concurrent upload/replacement must never have its URL or caption overwritten.
  const results = await Promise.all(input.ids.map((id, sort_order) => client.from('property_media').update({ sort_order }).eq('id', id).eq('property_id', input.propertyId).select('id')));
  if (results.some(result => result.error || result.data?.length !== 1)) return NextResponse.json({ error: 'The gallery changed or the order was only partly saved. Refresh and retry the order.' }, { status: 503 });
  await client.from('audit_logs').insert({ actor_id: person.id, entity_type: 'property', entity_id: input.propertyId, action: 'media_reorder', details: { media_ids: input.ids } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  const person = await editor(req); if (!person) return NextResponse.json({ error: 'Unauthorized or invalid origin' }, { status: 403 });
  const id = idSchema.safeParse(new URL(req.url).searchParams.get('id'));
  if (!id.success) return NextResponse.json({ error: 'Invalid media.' }, { status: 400 });
  const client = db()!, media = await client.from('property_media').select('id,property_id,url').eq('id', id.data).maybeSingle();
  if (media.error || !media.data) return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  try { await removeStoredObject(media.data); } catch { return NextResponse.json({ error: 'The file could not be deleted. No metadata was removed; retry safely.' }, { status: 503 }); }
  const result = await client.from('property_media').delete().eq('id', id.data).eq('property_id', media.data.property_id);
  if (result.error) return NextResponse.json({ error: 'File removed, but metadata cleanup is pending. Retry deletion.' }, { status: 503 });
  await client.from('audit_logs').insert({ actor_id: person.id, entity_type: 'property', entity_id: media.data.property_id, action: 'media_delete', details: { media_id: id.data } });
  return NextResponse.json({ ok: true });
}
