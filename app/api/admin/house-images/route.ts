import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/origin';
import { prepareUpload, UploadValidationError } from '@/lib/media-files';
import { boundedBody, BodyTooLargeError } from '@/lib/request-body';
import { privateHouseStorage } from '@/lib/house/storage';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const person = await staff();
  if (!person || !canEditProperties(person)) return NextResponse.json({ error: 'An authorized editor session is required.' }, { status: 403 });
  if (!req.headers.get('content-type')?.startsWith('multipart/form-data;')) return NextResponse.json({ error: 'Use a file upload.' }, { status: 415 });
  try {
    const body = await boundedBody(req, 13 * 1024 * 1024);
    const form = await new Response(body, { headers: { 'content-type': req.headers.get('content-type')! } }).formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a JPEG, PNG or WebP image.' }, { status: 400 });
    const prepared = await prepareUpload(file, 'image'), id = randomUUID();
    const storage = await privateHouseStorage();
    const saved = await storage.upload('assets/' + id + '.webp', prepared.bytes, { contentType: prepared.mime, upsert: false, cacheControl: '0' });
    if (saved.error) return NextResponse.json({ error: 'The homepage image could not be saved.' }, { status: 503 });
    return NextResponse.json({ ok: true, url: '/api/house-images/' + id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof UploadValidationError ? error.message : 'The image could not be processed.' }, { status: error instanceof BodyTooLargeError ? 413 : error instanceof UploadValidationError ? 400 : 503 });
  }
}
