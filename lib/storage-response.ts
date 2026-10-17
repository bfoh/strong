import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseConfig } from './supabase-config';

// Callers authorize ownership and visibility before passing an object to this helper.
export async function storageResponse(req: Request, object: { bucket: string; path: string; mime: string }) {
  const range = req.headers.get('range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new NextResponse(null, { status: 416 });
  const { url, serverKey } = supabaseConfig();
  if (!url || !serverKey) return new NextResponse(null, { status: 503 });
  const headers: Record<string, string> = { apikey: serverKey };
  if (!serverKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serverKey}`;
  if (range) headers.Range = range;
  try {
    const target = new URL(`/storage/v1/object/authenticated/${object.bucket}/${object.path.split('/').map(encodeURIComponent).join('/')}`, url);
    const asset = await fetch(target, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    const output = new Headers({ 'Content-Type': object.mime, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie', 'Content-Disposition': object.mime === 'application/pdf' ? 'attachment; filename="property-document.pdf"' : 'inline' });
    if (asset.status === 416) { const value = asset.headers.get('content-range'); if (value) output.set('content-range', value); return new NextResponse(null, { status: 416, headers: output }); }
    if (!asset.ok && asset.status !== 206) return new NextResponse(null, { status: 404, headers: output });
    for (const name of ['content-length', 'content-range', 'accept-ranges']) { const value = asset.headers.get(name); if (value) output.set(name, value); }
    return new NextResponse(asset.body, { status: asset.status, headers: output });
  } catch { return NextResponse.json({ error: 'Media is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
