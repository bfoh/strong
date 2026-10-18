import { propertyMediaReview } from '@/lib/media-review';
import { randomUUID } from 'node:crypto';
import { sameOrigin } from '@/lib/origin';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { db, launchSchemaAvailable } from '@/lib/server';
import { boundedBody, BodyTooLargeError } from '@/lib/request-body';
import { propertyInputSchema } from '@/lib/property-validation';
import {propertyFormFailure,propertyFormSuccess} from '@/lib/property-form-response';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return propertyFormFailure(req,'Invalid origin.',403,'invalid_origin');
  const person = await staff();
  if (!person || !canEditProperties(person)) return propertyFormFailure(req,'Your staff session is unavailable or does not allow property editing. Sign in and try again.',403,'unauthorized');
  let form: FormData;
  try { const bytes=await boundedBody(req,65536); form=await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type') || ''},body:bytes}).formData(); }
  catch(e) { return propertyFormFailure(req,e instanceof BodyTooLargeError ? 'Property details exceed 64 KB.' : 'The form could not be read. Please try again.',400,'invalid_form'); }
  const parsed=propertyInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return propertyFormFailure(req,'Please correct the highlighted fields. Your changes have not been saved.',400,'invalid_fields',parsed.error.flatten(),String(form.get('id') || ''));
  const d=parsed.data,client=db()!;
  let launch: boolean;
  try {launch=await launchSchemaAvailable();}
  catch {return propertyFormFailure(req,'Publication checks are temporarily unavailable. Your changes have not been saved. Please try again.',503,'backend_unavailable',undefined,d.id);}
  if (!launch && (d.status==='published' || d.region || d.review_status || d.publication_authorized)) return propertyFormFailure(req,'Publication controls are not ready. Contact your administrator; drafts and media remain available.',409,'migration_required',undefined,d.id);
  const id=d.id || randomUUID();
  if (d.status === 'published') {
    try {if ((await propertyMediaReview(id))?.needsReview) return propertyFormFailure(req,'Confirm the media match for this property before publishing. Your changes have not been saved.',409,'media_review_required',undefined,d.id);}
    catch {return propertyFormFailure(req,'The media review could not be checked. Your changes have not been saved. Please try again.',503,'backend_unavailable',undefined,d.id);}
  }
  const core={title:d.title,slug:d.slug,category:d.category,location:d.location,price:d.price===''?null:d.price,currency:'GHS',image:d.image,images:d.images.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),beds:d.beds===''?null:d.beds,baths:d.baths===''?null:d.baths,description:d.description,status:d.status,updated_at:new Date().toISOString()};
  const features={plot_size_sqm:d.plot_size_sqm===''?null:d.plot_size_sqm,building_size_sqm:d.building_size_sqm===''?null:d.building_size_sqm,tenure:d.tenure,documentation_status:d.documentation_status,amenities:d.amenities.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,60)};
  if (launch) {
    const {data:savedId,error}=await client.rpc('save_property_launch',{actor:person.id,p:{...core,...features,id:d.id,region:d.region,city:d.city||'',locality:d.locality||'',approximate_address:d.approximate_address||'',property_type:d.property_type||'',availability:d.availability||'unknown',featured:d.featured==='on',review_status:d.review_status||'draft',publication_authorized:d.publication_authorized==='on'}});
    if (error?.code==='23505') return propertyFormFailure(req,'This URL slug is already used. Choose a different slug and save again.',409,'slug_conflict',{fieldErrors:{slug:['Choose a unique URL slug.']}},d.id);
    if (error) return propertyFormFailure(req,'This property could not be saved. Your changes were not committed. Please try again or contact your administrator.',400,'save_failed',undefined,d.id);
    return propertyFormSuccess(req,savedId,d.status);
  }
  const result=d.id ? await client.from('properties').update(core).eq('id',id).select('id').single() : await client.from('properties').insert({...core,id}).select('id').single();
  if (result.error) return propertyFormFailure(req,'This property could not be saved. Check that its URL slug is unique and try again.',400,'save_failed',undefined,d.id);
  const spec=await client.from('property_features').upsert({property_id:id,...features},{onConflict:'property_id'});
  if(spec.error) return propertyFormFailure(req,`Property saved as ${d.status}, but specifications could not be saved. Reopen the editor and retry.`,503,'specifications_failed',undefined,id);
  await client.from('audit_logs').insert({actor_id:person.id,entity_type:'property',entity_id:id,action:d.id?'update':'create',details:{status:d.status}});
  return propertyFormSuccess(req,id,d.status);
}
