/** Add a separately supported candidate from an unassigned group; never publish or rewrite existing stock. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import sharp from 'sharp';
import {REVIEW_BUCKET,mediaReviewSchema,reviewIndexSchema,reviewGroupSchema} from '../../lib/media-review-model';
class Failure extends Error{}
const uuid=(value:string)=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
async function main(){
 const {values}=parseArgs({options:{plan:{type:'string'},apply:{type:'boolean',default:false}}});if(!values.plan)throw new Failure('Provide --plan.');
 const plan=z.object({batchId:z.string().uuid(),sourceGroupId:z.string().uuid(),key:z.string().regex(/^[a-z0-9-]+$/),title:z.string().min(3).max(160),sourceIds:z.array(z.string()).min(1).max(10),cover:z.object({sourceId:z.string(),frame:z.number().int().min(0).max(3).optional()}),proposed:reviewGroupSchema.shape.proposed,notes:z.array(z.string()),remainingGroupNotes:z.array(z.string()),resolvedDescriptions:z.array(z.string()).default([]),evidence:z.string().min(20).max(3000)}).strict().parse(JSON.parse(await readFile(values.plan,'utf8')));
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Failure('Use the existing server-only environment.');
 const client=createClient(url,key,{auth:{persistSession:false}});
 const bucket=await client.storage.getBucket(REVIEW_BUCKET),propertyBucket=await client.storage.getBucket('strong-property-media');if(bucket.error||propertyBucket.error||bucket.data.public!==false||propertyBucket.data.public!==false)throw new Failure('Both storage buckets must be private.');
 const downloadJson=async(key:string)=>{const r=await client.storage.from(REVIEW_BUCKET).download(key);if(r.error)throw new Failure('Private review data unavailable.');return JSON.parse(await r.data.text());};
 const report=mediaReviewSchema.parse(await downloadJson(`batches/${plan.batchId}/manifest.json`)),index=reviewIndexSchema.parse(await downloadJson('index.json'));
 const groupId=uuid(`${plan.batchId}:candidate:${plan.key}`),propertyId=uuid(`${groupId}:property`),marker=`batches/${plan.batchId}/addenda/${groupId}.json`;
 const completed=await client.storage.from(REVIEW_BUCKET).download(marker);if(completed.data){console.log('Candidate addendum already complete; no records changed.');return;}if(completed.error&&String(completed.error.statusCode)!=='404')throw new Failure('Could not check addendum completion.');
 const sourceGroup=report.groups.find(g=>g.id===plan.sourceGroupId),existingGroup=report.groups.find(g=>g.id===groupId);if(!sourceGroup||sourceGroup.propertyId)throw new Failure('Split only an unassigned group; existing properties are never rewritten.');
 const selected=plan.sourceIds.map(id=>report.assets.find(a=>a.sourceId===id));if(selected.some(a=>!a)||new Set(plan.sourceIds).size!==plan.sourceIds.length||!plan.sourceIds.includes(plan.cover.sourceId))throw new Failure('Invalid source selection.');
 for(const a of selected){if(!a||a.duplicateOf||a.sourceMediaGroup!==sourceGroup.sourceMediaGroup||(!existingGroup&&(!sourceGroup.assetIds.includes(a.id)||a.mediaId)))throw new Failure('A source is duplicated, already assigned, or belongs to another group.');}
 const pending: {key:string;bytes:Buffer;mime:string}[]=[],media:{id:string;property_id:string;kind:string;url:string;caption:string;sort_order:number}[]=[],posters:{propertyId:string;videoId:string;imageId:string}[]=[];let order=0,coverId='';
 const bytes=async(object:{bucket:string;path:string})=>{const r=await client.storage.from(object.bucket).download(object.path);if(r.error)throw new Failure('A private source object is missing.');return Buffer.from(await r.data.arrayBuffer());};
 const image=async(a:NonNullable<typeof selected[number]>,data:Buffer,tag:string,caption:string)=>{const id=uuid(`${propertyId}:${a.id}:${tag}`),key=`${propertyId}/public/${id}/${uuid(`${id}:v1`)}.webp`;pending.push({key,bytes:data,mime:'image/webp'});media.push({id,property_id:propertyId,kind:'image',url:`sp-storage://strong-property-media/${key}`,caption,sort_order:order++});coverId||=id;return id;};
 for(const a of [...selected].sort((a,b)=>Number(b!.sourceId===plan.cover.sourceId)-Number(a!.sourceId===plan.cover.sourceId))){
  if(!a)continue;
  if(a.kind==='image'){a.mediaId=await image(a,await sharp(await bytes(a.original)).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer(),'photo','Supplied property photograph');}
  else{if(a.frames.length!==4)throw new Failure('Reviewed video frames are required.');const first=a.sourceId===plan.cover.sourceId?plan.cover.frame??0:0;let poster='';for(const i of [first,...[0,1,2,3].filter(i=>i!==first)]){const id=await image(a,await bytes(a.frames[i]),`frame-${i}`,`Still from supplied property tour · sample ${i+1}`);poster||=id;}const id=uuid(`${propertyId}:${a.id}:video`),key=`${propertyId}/public/${id}/${uuid(`${id}:v1`)}.mp4`;const original=await bytes(a.original);if(createHash('sha256').update(original).digest('hex')!==a.sha256)throw new Failure('Original checksum mismatch.');pending.push({key,bytes:original,mime:'video/mp4'});media.push({id,property_id:propertyId,kind:'video',url:`sp-storage://strong-property-media/${key}`,caption:'Original supplied property tour',sort_order:order++});a.mediaId=id;posters.push({propertyId,videoId:id,imageId:poster});}
 }
 const assigned=selected.map(a=>a!.id);
 if(!existingGroup){sourceGroup.assetIds=sourceGroup.assetIds.filter(id=>!assigned.includes(id));sourceGroup.notes=plan.remainingGroupNotes;report.groups.push({id:groupId,sourceMediaGroup:sourceGroup.sourceMediaGroup,title:plan.title,confidence:'Visual match with clarified source caption',needsReview:true,propertyId,proposed:plan.proposed,notes:plan.notes,assetIds:assigned,assignedAssetIds:assigned});}
 report.missingDescriptions=report.missingDescriptions.filter(description=>!plan.resolvedDescriptions.includes(description));
 for(const asset of selected)if(asset&&!asset.notes.includes(plan.evidence))asset.notes.push(plan.evidence);
 mediaReviewSchema.parse(report);
 const property={id:propertyId,slug:`${plan.key}-${propertyId.slice(0,8)}`,title:plan.title,category:'residential',location:'Location awaiting confirmation',price:null,currency:'GHS',beds:null,baths:null,description:'Property details are being verified by Strong Properties. This private draft is not offered for sale.',status:'draft',image:`/api/media/${coverId}`,images:[]};
 const found=await client.from('properties').select('id,slug,status').or(`id.eq.${propertyId},slug.eq.${property.slug}`);if(found.error||found.data.some(p=>p.id!==propertyId||p.status!=='draft'))throw new Failure('Existing inventory conflicts with the new candidate.');
 console.log(JSON.stringify({mode:values.apply?'APPLY PRIVATE ADDENDUM':'DRY RUN',newDrafts:1,assignedOriginals:assigned.length,propertyMedia:media.length,publicReady:0}));if(!values.apply)return;
 const putJson=async(key:string,data:unknown,upsert=false)=>{const r=await client.storage.from(REVIEW_BUCKET).upload(key,JSON.stringify(data),{contentType:'application/json',upsert,cacheControl:'0'});if(r.error)throw new Failure('Private addendum metadata could not be saved.');};
 const baseline=`batches/${plan.batchId}/baseline-manifest.json`,old=await client.storage.from(REVIEW_BUCKET).download(baseline);if(old.error){if(String(old.error.statusCode)!=='404')throw new Failure('Could not check baseline provenance.');await putJson(baseline,await downloadJson(`batches/${plan.batchId}/manifest.json`));}
 for(const job of pending){const r=await client.storage.from('strong-property-media').upload(job.key,job.bytes,{contentType:job.mime,upsert:false,cacheControl:'0'});if(r.error){const info=await client.storage.from('strong-property-media').info(job.key);if(info.error||info.data.metadata?.size!==job.bytes.length)throw new Failure('A candidate media object could not be uploaded.');}}
 index.properties[propertyId]={batchId:plan.batchId,groupId,needsReview:true};await putJson(`batches/${plan.batchId}/manifest.json`,report,true);await putJson('index.json',index,true);
 if(!found.data.length){const r=await client.from('properties').insert(property);if(r.error)throw new Failure('The private candidate could not be saved. Rerun to resume.');}
 for(const row of media){const current=await client.from('property_media').select('id,url,property_id').eq('id',row.id).maybeSingle();if(current.error)throw new Failure('Could not check candidate gallery.');if(current.data){if(current.data.url!==row.url||current.data.property_id!==propertyId)throw new Failure('Edited candidate media will not be overwritten.');continue;}const r=await client.from('property_media').insert(row);if(r.error)throw new Failure('Candidate gallery could not be saved. Rerun to resume.');}
 for(const poster of posters){const file=`posters/${poster.videoId}.json`,current=await client.storage.from(REVIEW_BUCKET).download(file);if(current.error){if(String(current.error.statusCode)!=='404')throw new Failure('Could not check candidate poster.');await putJson(file,poster);}}
 await putJson(marker,{createdAt:new Date().toISOString(),propertyId,groupId,assigned,evidence:plan.evidence});console.log('Separate candidate draft created. Existing listings and source originals were preserved.');
}
main().catch(error=>{console.error(error instanceof Failure?error.message:'Candidate addendum stopped; raw exceptions withheld.');process.exitCode=1;});
