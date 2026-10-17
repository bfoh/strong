import { NextResponse } from 'next/server';
import { propertyMediaReview } from '@/lib/media-review';
import { randomUUID } from 'node:crypto';
import { sameOrigin } from '@/lib/origin';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { db, launchSchemaAvailable } from '@/lib/server';
import { boundedBody, BodyTooLargeError } from '@/lib/request-body';
import { propertyInputSchema } from '@/lib/property-validation';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({error:'Invalid origin'},{status:403});
  const person = await staff();
  if (!person || !canEditProperties(person)) return NextResponse.json({error:'Unauthorized'},{status:403});
  let form: FormData;
  try { const bytes=await boundedBody(req,65536); form=await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type') || ''},body:bytes}).formData(); }
  catch(e) { return NextResponse.json({error:e instanceof BodyTooLargeError ? 'Property details exceed 64 KB.' : 'Invalid form.'},{status:400}); }
  const parsed=propertyInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.json({error:'Check the property fields.',details:parsed.error.flatten()},{status:400});
  const d=parsed.data,client=db()!,launch=await launchSchemaAvailable();
  if (!launch && (d.status==='published' || d.region || d.review_status || d.publication_authorized)) return NextResponse.json({error:'Apply the Ghana launch migration before publishing or saving structured fields. Drafts and media remain available.'},{status:409});
  const id=d.id || randomUUID();
  if (d.status === 'published' && (await propertyMediaReview(id))?.needsReview) return NextResponse.json({error:'Resolve the private media review and confirm the property identity before publication.'},{status:409});
  const core={title:d.title,slug:d.slug,category:d.category,location:d.location,price:d.price===''?null:d.price,currency:'GHS',image:d.image,images:d.images.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),beds:d.beds===''?null:d.beds,baths:d.baths===''?null:d.baths,description:d.description,status:d.status,updated_at:new Date().toISOString()};
  const features={plot_size_sqm:d.plot_size_sqm===''?null:d.plot_size_sqm,building_size_sqm:d.building_size_sqm===''?null:d.building_size_sqm,tenure:d.tenure,documentation_status:d.documentation_status,amenities:d.amenities.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,60)};
  if (launch) {
    const {data:savedId,error}=await client.rpc('save_property_launch',{actor:person.id,p:{...core,...features,id:d.id,region:d.region,city:d.city||'',locality:d.locality||'',approximate_address:d.approximate_address||'',property_type:d.property_type||'',availability:d.availability||'unknown',featured:d.featured==='on',review_status:d.review_status||'draft',publication_authorized:d.publication_authorized==='on'}});
    if (error) return NextResponse.json({error:'Could not save this property. Check the unique slug and migration. Your changes were not committed.'},{status:400});
    return NextResponse.redirect(new URL(`/admin/properties/${savedId}`,req.headers.get('origin')!),303);
  }
  const result=d.id ? await client.from('properties').update(core).eq('id',id).select('id').single() : await client.from('properties').insert({...core,id}).select('id').single();
  if (result.error) return NextResponse.json({error:'Could not save property. Check that the slug is unique.'},{status:400});
  const spec=await client.from('property_features').upsert({property_id:id,...features},{onConflict:'property_id'});
  if(spec.error) return NextResponse.json({error:`Property saved as ${d.status}, but specifications could not be saved. Reopen the editor and retry.`,id},{status:503});
  await client.from('audit_logs').insert({actor_id:person.id,entity_type:'property',entity_id:id,action:d.id?'update':'create',details:{status:d.status}});
  return NextResponse.redirect(new URL(`/admin/properties/${id}`,req.headers.get('origin')!),303);
}
