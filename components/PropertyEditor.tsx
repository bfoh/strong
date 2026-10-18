'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type { Property, PropertyFeatures } from '@/lib/data';
import { ghanaRegions } from '@/lib/ghana';
import {propertyInputSchema,propertyFieldLabels} from '@/lib/property-validation';
type Item = Partial<Property> & { features?: PropertyFeatures };
type FieldErrors = Record<string,string[] | undefined>;
export default function PropertyEditor({ item, launch = false }: { item?: Item; launch?: boolean }) {
  const f = item?.features,router=useRouter(),feedbackRef=useRef<HTMLDivElement>(null);
  const [errors,setErrors]=useState<FieldErrors>({}),[attempted,setAttempted]=useState(false),[busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<{kind:'error'|'success';text:string;code?:string}|null>(null);
  const issues=Object.entries(errors).filter(([,messages])=>messages?.length);
  const field=(name:string)=>({id:`property-${name}`,'aria-invalid':errors[name]?.length ? true as const : undefined,'aria-describedby':errors[name]?.length ? `property-error-${name}` : undefined});
  const errorFor=(name:string)=>errors[name]?.length ? <span className="property-field-error" id={`property-error-${name}`}>{errors[name]!.join(' ')}</span> : null;
  function showError(text:string,fields:FieldErrors={},code?:string){setErrors(fields);setFeedback({kind:'error',text,code});requestAnimationFrame(()=>feedbackRef.current?.focus());}
  function change(event:React.FormEvent<HTMLFormElement>){
    setFeedback(null);
    if(attempted){const checked=propertyInputSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));setErrors(checked.success?{}:checked.error.flatten().fieldErrors);}
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setAttempted(true);
    const body=new FormData(event.currentTarget),checked=propertyInputSchema.safeParse(Object.fromEntries(body));
    if(!checked.success){showError('Please complete the fields listed below. Your entries are still here. To save unfinished details, choose Draft.',checked.error.flatten().fieldErrors,'invalid_fields');return;}
    setBusy(true);setErrors({});setFeedback(null);
    try{
      const response=await fetch('/api/admin/properties',{method:'POST',headers:{Accept:'application/json'},body});
      const result=await response.json();
      if(!response.ok){showError(result.error||'The property could not be saved. Your entries are still here.',result.details?.fieldErrors||{},result.code);return;}
      if(result.ok!==true||typeof result.id!=='string'||!/^[a-f0-9-]{36}$/i.test(result.id))throw Error('Invalid save response');
      setFeedback({kind:'success',text:`Property saved as ${String(result.status).replaceAll('_',' ')}.`});
      if(result.id!==item?.id)router.replace(`/admin/properties/${result.id}`);else router.refresh();
    }catch{showError('The save could not be confirmed. Your entries are still here. Check your connection and try again.');}
    finally{setBusy(false);}
  }
  return <form className="admin-form property-editor" method="post" action="/api/admin/properties" noValidate onSubmit={submit} onChange={change} aria-busy={busy}>
    <input type="hidden" name="id" value={item?.id || ''}/>
    {!launch && <p className="preview-note">The Ghana launch database migration is pending. Drafts, specifications and media uploads are available. Apply the migration to enable structured locations, approval and publication.</p>}
    <label>Property title<input {...field('title')} name="title" required maxLength={160} defaultValue={item?.title || ''}/></label>{errorFor('title')}
    <label>URL slug<input {...field('slug')} name="slug" required maxLength={180} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={item?.slug || ''} placeholder="confirmed-property-name"/></label>{errorFor('slug')}
    <label>Category<select {...field('category')} name="category" defaultValue={item?.category || 'residential'}><option value="residential">Residential</option><option value="land">Land</option><option value="commercial">Commercial</option></select></label>{errorFor('category')}
    <fieldset disabled={!launch}><legend>Structured location & type</legend><label>Ghana region<select {...field('region')} name="region" defaultValue={item?.region || ''}><option value="">Choose confirmed region</option>{ghanaRegions.map(r => <option key={r}>{r}</option>)}</select></label>{errorFor('region')}<label>City / town<input {...field('city')} name="city" maxLength={100} defaultValue={item?.city || ''}/></label>{errorFor('city')}<label>Locality<input {...field('locality')} name="locality" maxLength={100} defaultValue={item?.locality || ''}/></label>{errorFor('locality')}<label>Approximate address (public)<input {...field('approximate_address')} name="approximate_address" maxLength={300} defaultValue={item?.approximate_address || ''}/></label>{errorFor('approximate_address')}<label>Property type<input {...field('property_type')} name="property_type" maxLength={100} defaultValue={item?.property_type || ''} placeholder="e.g. Detached house, serviced plot, office"/></label>{errorFor('property_type')}</fieldset>
    <label>Display location<input {...field('location')} name="location" required maxLength={200} defaultValue={item?.location || ''} placeholder="Confirmed locality, city"/></label>{errorFor('location')}
    <label>Price (GHS; blank if unconfirmed)<input {...field('price')} name="price" type="number" min="0" max="999999999999" step="0.01" defaultValue={item?.price ?? ''}/></label>{errorFor('price')}
    <label>Primary image path or HTTPS URL<input {...field('image')} name="image" maxLength={1500} defaultValue={item?.image || ''}/></label>{errorFor('image')}<label>Additional approved image URLs (one per line)<textarea {...field('images')} name="images" rows={4} maxLength={10000} defaultValue={(item?.images || []).join('\n')}/></label>{errorFor('images')}
    <label>Bedrooms<input {...field('beds')} name="beds" type="number" min="0" max="1000" defaultValue={item?.beds ?? ''}/></label>{errorFor('beds')}<label>Bathrooms<input {...field('baths')} name="baths" type="number" min="0" max="1000" defaultValue={item?.baths ?? ''}/></label>{errorFor('baths')}
    <label>Land area (m²)<input {...field('plot_size_sqm')} name="plot_size_sqm" type="number" min="0" step="0.01" defaultValue={f?.plot_size_sqm ?? ''}/></label>{errorFor('plot_size_sqm')}<label>Floor area (m²)<input {...field('building_size_sqm')} name="building_size_sqm" type="number" min="0" step="0.01" defaultValue={f?.building_size_sqm ?? ''}/></label>{errorFor('building_size_sqm')}
    <label>Tenure (only if confirmed)<input {...field('tenure')} name="tenure" maxLength={200} defaultValue={f?.tenure || ''}/></label>{errorFor('tenure')}<label>Documentation information (public; no unsupported verification claims)<textarea {...field('documentation_status')} name="documentation_status" maxLength={1500} defaultValue={f?.documentation_status || ''}/></label>{errorFor('documentation_status')}
    <label>Key features (one per line)<textarea {...field('amenities')} name="amenities" rows={4} maxLength={5000} defaultValue={Array.isArray(f?.amenities) ? f.amenities.join('\n') : ''}/></label>{errorFor('amenities')}
    <label>Description<textarea {...field('description')} name="description" rows={7} minLength={10} maxLength={10000} required defaultValue={item?.description || ''}/></label>{errorFor('description')}
    <fieldset disabled={!launch}><legend>Review & availability</legend><label>Availability<select {...field('availability')} name="availability" defaultValue={item?.availability || 'unknown'}><option value="unknown">Unconfirmed</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label>{errorFor('availability')}<label>Review status<select {...field('review_status')} name="review_status" defaultValue={item?.review_status || 'draft'}><option value="draft">Draft</option><option value="review">Ready for review</option><option value="approved">Approved by authorized staff</option></select></label>{errorFor('review_status')}<label className="check-field"><input {...field('featured')} type="checkbox" name="featured" defaultChecked={item?.featured}/>Feature this listing</label>{errorFor('featured')}<label className="check-field"><input {...field('publication_authorized')} type="checkbox" name="publication_authorized" defaultChecked={item?.publication_authorized}/>I confirm this is a genuine property with permission to publish its details and media.</label>{errorFor('publication_authorized')}</fieldset>
    <label>Publication status<select {...field('status')} name="status" defaultValue={item?.status || 'draft'}><option value="draft">Draft</option><option value="published" disabled={!launch}>Published</option><option value="under_offer">Under offer</option><option value="sold">Sold</option><option value="archived">Archived</option></select></label>{errorFor('status')}
    {item?.id && <p className="note">ID: {item.id}<br/>Last updated: {item.updated_at || 'Not recorded'}</p>}
    <p className="note">Choose Draft to save details that still need confirmation. Publishing requires a confirmed region, city or town, property type, available status, approved review, permission and confirmed media. Areas are stored in square metres. Do not publish private ownership documents.</p>
    {(feedback || issues.length>0) && <div className={`form-feedback ${feedback?.kind || 'error'}`} ref={feedbackRef} tabIndex={-1} role={feedback?.kind==='success'?'status':'alert'}><p>{feedback?.text || 'Please correct the following fields.'}</p>{issues.length>0 && <ul>{issues.map(([name,messages])=><li key={name}><a href={`#property-${name}`} onClick={event=>{event.preventDefault();document.getElementById(`property-${name}`)?.focus();}}>{propertyFieldLabels[name] || 'Property field'}: {messages!.join(' ')}</a></li>)}</ul>}{feedback?.code==='media_review_required' && <a href="#media-confirmation">Go to media confirmation</a>}</div>}
    <button className="gold-btn" disabled={busy}>{busy?'Saving property…':'Save property'}</button>
  </form>;
}
