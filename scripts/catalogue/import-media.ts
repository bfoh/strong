/** Private, resumable import. Dry run unless --apply. Curation stays outside the public repository. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mediaReviewSchema, reviewIndexSchema, REVIEW_BUCKET, type MediaReview, type ReviewIndex } from '../../lib/media-review-model';
class ImportFailure extends Error {}
async function main() {
const { values } = parseArgs({ options: { source: { type: 'string' }, curation: { type: 'string' }, apply: { type: 'boolean', default: false } } });
if (!values.source || !values.curation) throw new ImportFailure('Provide --source and --curation paths.');
const root = path.resolve(values.source), output = path.join(root, 'prepared');
await mkdir(output, { recursive: true });
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const uuid = (value: string) => { const h = hash(value); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const auditSchema = z.array(z.object({ id: z.string(), property_group: z.string(), media_type: z.enum(['photo','video']), source_filename: z.string(), confidence: z.string(), notes: z.string(), sha256: z.string(), bytes: z.number(), path: z.string() }));
const audit = auditSchema.parse(JSON.parse(await readFile(path.join(root, 'audit.json'), 'utf8')));
const archive = z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), originalCount: z.number() }).parse(JSON.parse(await readFile(path.join(root, 'archive.json'), 'utf8')));
const curation = z.object({ groups: z.array(z.object({ sourceMediaGroup: z.string(), title: z.string(), proposed: z.object({ location: z.string().nullable(), city: z.string().nullable(), beds: z.number().int().nullable(), price: z.number().nullable(), currency: z.literal('GHS') }), assigned: z.array(z.string()), cover: z.object({ sourceId: z.string(), frame: z.number().int().min(0).max(3).optional() }).nullable(), notes: z.array(z.string()) })), assetNotes: z.record(z.string(), z.array(z.string())), missingDescriptions: z.array(z.string()) }).parse(JSON.parse(await readFile(values.curation, 'utf8')));
const videos = z.array(z.object({ id: z.string(), duration: z.number().positive(), frames: z.array(z.string()).length(4) })).parse((await readFile(path.join(root, 'videos.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)));
const groupNames = [...new Set(audit.map(a => a.property_group))];
if (archive.originalCount !== audit.length || new Set(curation.groups.map(g => g.sourceMediaGroup)).size !== groupNames.length || curation.groups.length !== groupNames.length || groupNames.some(n => !curation.groups.some(g => g.sourceMediaGroup === n))) throw new ImportFailure('Curation must account for every original group exactly once.');
const batchId = uuid(archive.sha256), assetIds = new Map(audit.map(a => [a.id, uuid(`${archive.sha256}:${a.property_group}:${a.source_filename}`)]));
const jobs: { bucket: string; key: string; file: string; mime: string; digest: string; bytes: number }[] = [];
const records: { id: string; property_id: string; kind: 'image' | 'video'; url: string; caption: string; sort_order: number }[] = [];
const properties: { id: string; slug: string; title: string; category: string; location: string; price: null; currency: string; beds: null; baths: null; description: string; status: string; image: string; images: string[] }[] = [];
const posters: { propertyId: string; videoId: string; imageId: string }[] = [];
const seen = new Map<string,string>();
const report: MediaReview = { version: 1, id: batchId, createdAt: new Date().toISOString(), archiveSha256: archive.sha256, groups: [], assets: [], missingDescriptions: curation.missingDescriptions };
const object = (key: string, mime: 'image/webp' | 'image/jpeg' | 'video/mp4') => ({ bucket: REVIEW_BUCKET as typeof REVIEW_BUCKET, path: `batches/${batchId}/${key}`, mime });
async function queue(buffer: Buffer, key: string, mime: string, bucket: string = REVIEW_BUCKET) {
  const local = path.join(output, hash(`${bucket}/${key}`));
  await writeFile(local, buffer); jobs.push({ bucket, key, file: local, mime, digest: hash(buffer), bytes: buffer.length });
}
for (const source of audit) {
  if (!path.resolve(source.path).startsWith(path.join(root, 'source') + path.sep)) throw new ImportFailure('Original escapes the extraction directory.');
  const bytes = await readFile(source.path);
  if (hash(bytes) !== source.sha256 || bytes.length !== source.bytes) throw new ImportFailure('An original has changed since the audit.');
  const id = assetIds.get(source.id)!, video = videos.find(v => v.id === source.id);
  if (source.media_type === 'video' && !video) throw new ImportFailure('Every video needs reviewed poster frames.');
  const original = object(`originals/${source.sha256}.${source.media_type === 'photo' ? 'jpeg' : 'mp4'}`, source.media_type === 'photo' ? 'image/jpeg' : 'video/mp4');
  if (!seen.has(source.sha256)) await queue(bytes, original.path, original.mime);
  const frames = [];
  for (let i = 0; i < (video?.frames.length || 0); i++) {
    const framePath = path.resolve(video!.frames[i]);
    if (!framePath.startsWith(path.join(root,'review') + path.sep)) throw new ImportFailure('Frame escapes the review directory.');
    const frame = object(`frames/${id}-${i}.webp`, 'image/webp');
    await queue(await sharp(framePath).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(), frame.path, frame.mime);
    frames.push(frame);
  }
  const thumbnail = object(`thumbnails/${id}.webp`, 'image/webp');
  await queue(await sharp(video ? video.frames[0] : bytes).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(), thumbnail.path, thumbnail.mime);
  report.assets.push({ id, sourceId: source.id, sourceMediaGroup: source.property_group, sourceFilename: source.source_filename, kind: source.media_type === 'photo' ? 'image' : 'video', sha256: source.sha256, bytes: source.bytes, confidence: source.confidence, sourceNotes: source.notes, notes: curation.assetNotes[source.id] || [], original, thumbnail, frames, duration: video?.duration || null, duplicateOf: seen.get(source.sha256) || null, mediaId: null });
  if (!seen.has(source.sha256)) seen.set(source.sha256,id);
}
for (const group of curation.groups) {
  const sourceAssets = report.assets.filter(a => a.sourceMediaGroup === group.sourceMediaGroup), groupId = uuid(`${batchId}:${group.sourceMediaGroup}`), propertyId = group.assigned.length ? uuid(`${batchId}:${groupId}:property`) : null;
  if (group.assigned.some(id => !sourceAssets.some(a => a.sourceId === id)) || new Set(group.assigned).size !== group.assigned.length || Boolean(group.cover) !== Boolean(propertyId) || group.cover && !group.assigned.includes(group.cover.sourceId)) throw new ImportFailure('Invalid curation assignment or cover.');
  const assignedAssetIds = group.assigned.map(sourceId => assetIds.get(sourceId)!);
  report.groups.push({ id: groupId, sourceMediaGroup: group.sourceMediaGroup, title: group.title, confidence: [...new Set(sourceAssets.map(a => a.confidence))].join(' / '), needsReview: true, propertyId, proposed: group.proposed, notes: group.notes, assetIds: sourceAssets.map(a => a.id), assignedAssetIds });
  if (!propertyId || !group.cover) continue;
  let order = 0;
  const addImage = async (assetId: string, file: Buffer | string, caption: string, tag: string) => {
    const id = uuid(`${propertyId}:${assetId}:${tag}`), key = `${propertyId}/public/${id}/${uuid(`${id}:v1`)}.webp`;
    const bytes = await sharp(file).rotate().resize({ width:2400, height:2400, fit:'inside', withoutEnlargement:true }).webp({ quality:85 }).toBuffer();
    await queue(bytes,key,'image/webp','strong-property-media');
    records.push({ id,property_id:propertyId,kind:'image',url:`sp-storage://strong-property-media/${key}`,caption,sort_order:order++ });
    return id;
  };
  const selected = [...group.assigned].sort((a,b) => Number(b === group.cover!.sourceId) - Number(a === group.cover!.sourceId));
  let coverId = '';
  for (const sourceId of selected) {
    const asset = report.assets.find(a => a.sourceId === sourceId)!, source = audit.find(a => a.id === sourceId)!;
    if (asset.duplicateOf) throw new ImportFailure('Do not assign duplicate originals twice.');
    if (asset.kind === 'image') {
      const id = await addImage(asset.id,source.path,'Supplied exterior photograph','photo'); asset.mediaId = id; coverId ||= id;
    } else {
      const video = videos.find(v => v.id === sourceId)!;
      const preferredFrame = sourceId === group.cover.sourceId ? group.cover.frame ?? 0 : 0;
      const indices = [preferredFrame,...[0,1,2,3].filter(i => i !== preferredFrame)];
      const imageIds = [];
      for (const index of indices) imageIds.push(await addImage(asset.id, video.frames[index], `Still from supplied property tour · sample ${index + 1}`, `frame-${index}`));
      coverId ||= imageIds[0];
      const id = uuid(`${propertyId}:${asset.id}:video`), key = `${propertyId}/public/${id}/${uuid(`${id}:v1`)}.mp4`;
      await queue(await readFile(source.path),key,'video/mp4','strong-property-media');
      records.push({id,property_id:propertyId,kind:'video',url:`sp-storage://strong-property-media/${key}`,caption:'Original supplied property tour',sort_order:order++});
      asset.mediaId = id; posters.push({ propertyId, videoId:id, imageId:imageIds[0] });
    }
  }
  properties.push({ id:propertyId, slug:`${group.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')}-${propertyId.slice(0,8)}`, title:group.title, category:'residential', location:'Location awaiting confirmation', price:null, currency:'GHS', beds:null, baths:null, description:'Property details are being verified by Strong Properties. This private draft is not offered for sale.', status:'draft', image:`/api/media/${coverId}`, images:[] });
}
mediaReviewSchema.parse(report);
await writeFile(path.join(root,'review-manifest.json'),JSON.stringify(report,null,2));
const totals={originals:report.assets.length,uniqueOriginals:seen.size,groups:report.groups.length,drafts:properties.length,publicReady:0,unassignedOriginals:report.assets.filter(a => !a.mediaId && !a.duplicateOf).length,duplicateOriginals:report.assets.filter(a => a.duplicateOf).length,propertyMedia:records.length,uploads:jobs.length,uploadMB:Math.round(jobs.reduce((n,j)=>n+j.bytes,0)/1048576)};
console.log(JSON.stringify({mode:values.apply?'APPLY PRIVATE DRAFTS':'DRY RUN',batchId,...totals},null,2));
if (!values.apply) process.exit(0);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new ImportFailure('Server credentials are required for --apply. Never use a NEXT_PUBLIC secret.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
async function uploadJson(key:string,value:unknown,upsert=false){const result=await client.storage.from(REVIEW_BUCKET).upload(key,JSON.stringify(value),{contentType:'application/json',upsert,cacheControl:'0'});if(result.error)throw new ImportFailure('Private review metadata could not be saved.');}
let index:ReviewIndex={version:1,batches:[],properties:{}};
const bucket=await client.storage.getBucket(REVIEW_BUCKET);
if(bucket.error){if(String(bucket.error.statusCode)!=='404')throw new ImportFailure('Could not inspect review bucket.');const created=await client.storage.createBucket(REVIEW_BUCKET,{public:false,fileSizeLimit:50*1024*1024,allowedMimeTypes:['application/json','image/jpeg','image/png','image/webp','video/mp4','video/webm']});if(created.error)throw new ImportFailure('Could not create the private review bucket.');await uploadJson('index.json',index);}
else{if(bucket.data.public!==false)throw new ImportFailure('Review bucket must be private.');const found=await client.storage.from(REVIEW_BUCKET).download('index.json');if(found.error)throw new ImportFailure('Existing review index is unavailable; refusing to overwrite.');index=reviewIndexSchema.parse(JSON.parse(await found.data.text()));}
const completed=await client.storage.from(REVIEW_BUCKET).download(`batches/${batchId}/completed.json`);
if(completed.data){const marker=JSON.parse(await completed.data.text());if(marker.archiveSha256!==archive.sha256)throw new ImportFailure('Completed batch hash mismatch.');console.log('This batch was already imported. No properties, media or review decisions were changed.');return;}
if(completed.error && String(completed.error.statusCode)!=='404')throw new ImportFailure('Could not verify import completion.');
const propertyBucket=await client.storage.getBucket('strong-property-media');if(propertyBucket.error||propertyBucket.data.public!==false)throw new ImportFailure('Private property storage is unavailable.');
for(const existingBatch of index.batches.filter(id=>id!==batchId)){
 const found=await client.storage.from(REVIEW_BUCKET).download(`batches/${existingBatch}/manifest.json`);if(found.error)throw new ImportFailure('Existing provenance could not be checked.');const previous=mediaReviewSchema.parse(JSON.parse(await found.data.text()));
 if(previous.assets.some(a=>report.assets.some(b=>b.sha256===a.sha256)))throw new ImportFailure('Originals overlap an existing batch. Reconcile identities before importing again.');
}
const existing=await client.from('properties').select('id,slug,status');if(existing.error)throw new ImportFailure('Existing inventory could not be checked.');
for(const p of properties){const row=existing.data.find(e=>e.id===p.id);if(row&&!index.properties[p.id])throw new ImportFailure('Property ID collision.');if(existing.data.some(e=>e.slug===p.slug&&e.id!==p.id))throw new ImportFailure('Property slug collision.');}
console.log(`Checked ${existing.data.length} existing properties; no inventory will be overwritten.`);
let done=0;
for(const job of jobs){
 const result=await client.storage.from(job.bucket).upload(job.key,await readFile(job.file),{contentType:job.mime,upsert:false,cacheControl:'0',metadata:{sha256:job.digest}});
 if(result.error){if(!['409','400'].includes(String(result.error.statusCode)))throw new ImportFailure('A private media upload failed. Retry the same batch.');const found=await client.storage.from(job.bucket).info(job.key);if(found.error||found.data.metadata?.size!==(await readFile(job.file)).length)throw new ImportFailure('Existing object differs or could not be verified.');}
 if(++done%25===0)console.log(`Private objects ready: ${done}/${jobs.length}`);
}
if(!index.batches.includes(batchId)){
 await uploadJson(`batches/${batchId}/manifest.json`,report);
 index.batches.push(batchId);for(const group of report.groups)if(group.propertyId)index.properties[group.propertyId]={batchId,groupId:group.id,needsReview:true};
 await uploadJson('index.json',index,true);
}
for(const p of properties)if(!existing.data.some(e=>e.id===p.id)){const result=await client.from('properties').insert(p);if(result.error)throw new ImportFailure('A private property draft could not be saved. Rerun to resume.');}
for(const record of records){const found=await client.from('property_media').select('id,property_id,url').eq('id',record.id).maybeSingle();if(found.error)throw new ImportFailure('Could not check existing media.');if(found.data){if(found.data.property_id!==record.property_id||found.data.url!==record.url)throw new ImportFailure('Existing media was edited; refusing to overwrite.');continue;}const result=await client.from('property_media').insert(record);if(result.error)throw new ImportFailure('A property media record could not be saved. Rerun to resume.');}
for(const poster of posters){const key=`posters/${poster.videoId}.json`;const found=await client.storage.from(REVIEW_BUCKET).download(key);if(found.error){if(String(found.error.statusCode)!=='404')throw new ImportFailure('Could not check video poster.');await uploadJson(key,poster);}}
const publicCheck=await client.from('properties').select('id',{count:'exact',head:true}).in('id',properties.map(p=>p.id)).eq('status','published');if(publicCheck.error||publicCheck.count)throw new ImportFailure('Import invariant failed: imported candidates must stay private.');
await uploadJson(`batches/${batchId}/completed.json`,{archiveSha256:archive.sha256,completedAt:new Date().toISOString(),...totals});
await writeFile(path.join(root,'import-result.json'),JSON.stringify({completedAt:new Date().toISOString(),batchId,...totals},null,2));
console.log('Private import complete. No source facts or publication approvals were inferred.');

}
main().catch(error => { console.error(error instanceof ImportFailure ? error.message : "Media import stopped. Check the local audit, curation and media decoder outputs; raw exceptions are withheld."); process.exitCode=1; });
