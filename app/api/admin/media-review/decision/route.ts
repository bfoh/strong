import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/origin';
import { boundedBody } from '@/lib/request-body';
import { db } from '@/lib/server';
import { propertyMediaReview } from '@/lib/media-review';
import { REVIEW_BUCKET, reviewDecisionSchema } from '@/lib/media-review-model';
import { mediaSignature } from '@/lib/media-signature';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({error:'Invalid origin.'},{status:403});
  const person = await staff();
  if (!person || !canEditProperties(person)) return NextResponse.json({error:'Unauthorized.'},{status:403});
  let input;
  try {
    const bytes = await boundedBody(req, 12000);
    const form = await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type') || ''},body:bytes}).formData();
    input = z.object({propertyId:z.string().uuid(),gallerySignature:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal('yes'),evidence:z.string().trim().min(20).max(2000)}).strict().parse(Object.fromEntries(form));
  } catch { return NextResponse.json({error:'Confirm the media identity and provide supporting evidence (20–2,000 characters).'}, {status:400}); }
  const review = await propertyMediaReview(input.propertyId), client = db()!;
  if (!review) return NextResponse.json({error:'Imported media review not found.'},{status:404});
  const media = await client.from('property_media').select('id,kind,url,caption,sort_order').eq('property_id',input.propertyId);
  if (media.error || !media.data?.some(m=>m.kind==='image') || review.group.assignedAssetIds.some(id=>!media.data?.some(m=>m.id===review.batch.assets.find(a=>a.id===id)?.mediaId))) return NextResponse.json({error:'The assigned originals or cover are missing from the gallery. Resolve the gallery before confirming.'},{status:409});
  if (mediaSignature(media.data) !== input.gallerySignature) return NextResponse.json({error:'The gallery changed since the review page loaded. Reload and review the current media.'},{status:409});
  const decision = reviewDecisionSchema.parse({version:1,propertyId:input.propertyId,batchId:review.batch.id,groupId:review.group.id,assetIds:review.group.assignedAssetIds,mediaSignature:mediaSignature(media.data),reviewedBy:person.id,reviewedAt:new Date().toISOString(),evidence:input.evidence});
  const audit = await client.from('audit_logs').insert({actor_id:person.id,entity_type:'property',entity_id:input.propertyId,action:'media_identity_confirmation',details:decision});
  if (audit.error) return NextResponse.json({error:'The review audit could not be recorded. No confirmation was saved.'},{status:503});
  const saved = await client.storage.from(REVIEW_BUCKET).upload(`decisions/${input.propertyId}.json`,JSON.stringify(decision),{contentType:'application/json',upsert:true,cacheControl:'0'});
  if (saved.error) return NextResponse.json({error:'The media confirmation could not be saved. Please retry.'},{status:503});
  return NextResponse.redirect(new URL(`/admin/properties/${input.propertyId}`,req.headers.get('origin')!),303);
}
