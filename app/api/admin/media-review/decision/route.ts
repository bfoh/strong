import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/origin';
import { boundedBody } from '@/lib/request-body';
import { db } from '@/lib/server';
import { propertyMediaReview } from '@/lib/media-review';
import { REVIEW_BUCKET, reviewDecisionSchema } from '@/lib/media-review-model';
import { mediaSignature } from '@/lib/media-signature';

function failure(req: Request, error: string, status: number, code: string, propertyId?: string) {
  const headers = {'Cache-Control':'private, no-store'};
  if (!req.headers.get('accept')?.includes('text/html')) return NextResponse.json({error,code},{status,headers});
  // Messages are fixed server text; only validated UUIDs are used in the return link.
  const href = propertyId ? `/admin/properties/${propertyId}#media-confirmation` : '/admin/properties';
  const escaped = error.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Strong Properties — Media review</title></head><body style="background:#f9f5ec;color:#242320;font:18px/1.7 system-ui;padding:8vh 7vw;max-width:800px"><main><p>STRONG PROPERTIES · STAFF ONLY</p><h1>Media confirmation was not saved.</h1><p>${escaped}</p><p>Use your browser’s Back button to copy your explanation if needed. Then reopen the property, review its current gallery and confirm again.</p><a href="${href}" style="color:inherit">Reopen the property editor</a></main></body></html>`,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'}});
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return failure(req,'Invalid origin.',403,'invalid_origin');
  const person = await staff();
  if (!person || !canEditProperties(person)) return failure(req,'Your staff session is unavailable or does not allow media review. Sign in and try again.',403,'unauthorized');
  let input;
  try {
    const bytes = await boundedBody(req, 12000);
    const form = await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type') || ''},body:bytes}).formData();
    input = z.object({propertyId:z.string().uuid(),gallerySignature:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal('yes'),evidence:z.string().trim().min(20).max(2000)}).strict().parse(Object.fromEntries(form));
  } catch { return failure(req,'Confirm the media identity and provide supporting evidence (20–2,000 characters).',400,'invalid_form'); }
  const review = await propertyMediaReview(input.propertyId), client = db()!;
  if (!review) return failure(req,'Imported media review not found.',404,'review_missing',input.propertyId);
  const media = await client.from('property_media').select('id,kind,url,caption,sort_order').eq('property_id',input.propertyId);
  if (media.error || !media.data?.some(m=>m.kind==='image') || review.group.assignedAssetIds.some(id=>!media.data?.some(m=>m.id===review.batch.assets.find(a=>a.id===id)?.mediaId))) return failure(req,'The assigned originals or cover are missing from the gallery. Resolve the gallery before confirming.',409,'gallery_incomplete',input.propertyId);
  if (mediaSignature(media.data) !== input.gallerySignature) return failure(req,'The gallery changed since this page opened. Your confirmation was not saved. Reload the gallery and review its current photos and videos before confirming again.',409,'gallery_changed',input.propertyId);
  const decision = reviewDecisionSchema.parse({version:1,propertyId:input.propertyId,batchId:review.batch.id,groupId:review.group.id,assetIds:review.group.assignedAssetIds,mediaSignature:mediaSignature(media.data),reviewedBy:person.id,reviewedAt:new Date().toISOString(),evidence:input.evidence});
  const audit = await client.from('audit_logs').insert({actor_id:person.id,entity_type:'property',entity_id:input.propertyId,action:'media_identity_confirmation',details:decision});
  if (audit.error) return failure(req,'The review audit could not be recorded. No confirmation was saved.',503,'audit_failed',input.propertyId);
  const saved = await client.storage.from(REVIEW_BUCKET).upload(`decisions/${input.propertyId}.json`,JSON.stringify(decision),{contentType:'application/json',upsert:true,cacheControl:'0'});
  if (saved.error) return failure(req,'The media confirmation could not be saved. Please retry.',503,'storage_failed',input.propertyId);
  if (req.headers.get('accept')?.includes('application/json')) return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  return NextResponse.redirect(new URL(`/admin/properties/${input.propertyId}`,req.headers.get('origin')!),303);
}
