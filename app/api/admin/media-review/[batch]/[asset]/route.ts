import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { mediaReview } from '@/lib/media-review';
import { storageResponse } from '@/lib/storage-response';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: { params: Promise<{ batch: string; asset: string }> }) {
  const unavailable = () => NextResponse.json({ error: 'Media not found.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  const person = await staff();
  if (!person || !canEditProperties(person)) return unavailable();
  const parsed = z.object({ batch: z.string().uuid(), asset: z.string().uuid() }).safeParse(await params);
  if (!parsed.success) return unavailable();
  const report = await mediaReview(parsed.data.batch), asset = report?.assets.find(a => a.id === parsed.data.asset);
  if (!asset) return unavailable();
  const variant = new URL(req.url).searchParams.get('variant') || 'thumbnail';
  const object = variant === 'original' ? asset.original : /^frame-[0-3]$/.test(variant) ? asset.frames[Number(variant.slice(-1))] : variant === 'thumbnail' ? asset.thumbnail : undefined;
  return object ? storageResponse(req, object) : unavailable();
}
