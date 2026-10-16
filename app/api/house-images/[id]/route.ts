import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isHousePreviewRequest } from '@/lib/house/preview';
import { privateHouseStorage } from '@/lib/house/storage';
export const runtime = 'nodejs';
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isHousePreviewRequest()) return new NextResponse(null, { status: 404 });
  const id = z.string().uuid().safeParse((await context.params).id);
  if (!id.success) return new NextResponse(null, { status: 404 });
  try {
    const storage = await privateHouseStorage();
    const { data, error } = await storage.download('assets/' + id.data + '.webp');
    if (error || !data || data.type !== 'image/webp') return new NextResponse(null, { status: 404 });
    const variant = new URL(req.url).searchParams.get('variant');
    const width = variant === 'thumb' ? 480 : variant === 'mobile' || variant === 'gallery' ? 960 : 1920;
    const bytes = await sharp(Buffer.from(await data.arrayBuffer())).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
  } catch { return new NextResponse(null, { status: 503 }); }
}
