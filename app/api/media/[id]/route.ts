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
  if (!isPublic) { const person = await staff(); if (!person || !canEditProperties(person)) return unavailable(); }
  const range = req.headers.get('range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new NextResponse(null, { status: 416 });
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = { apikey: key };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  if (range) headers.Range = range;
  try {
    const target = new URL(`/storage/v1/object/authenticated/${stored.bucket}/${stored.path.split('/').map(encodeURIComponent).join('/')}`, process.env.NEXT_PUBLIC_SUPABASE_URL);
    const asset = await fetch(target, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!asset.ok && asset.status !== 206) return unavailable();
    const output = new Headers({ 'Content-Type': mimeForExtension(stored.extension), 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie', 'Content-Disposition': media.kind === 'document' ? 'attachment; filename="property-document.pdf"' : 'inline' });
    for (const name of ['content-length', 'content-range', 'accept-ranges']) { const value = asset.headers.get(name); if (value) output.set(name, value); }
    return new NextResponse(asset.body, { status: asset.status, headers: output });
  } catch { return NextResponse.json({ error: 'Media is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
