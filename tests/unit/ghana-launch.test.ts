import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {navigationAttribution,attributionFrom,campaignUrl,tvAttribution,attributionSchema} from '../../lib/marketing';
import {ghanaRegions,regionFromSlug,regionSlug} from '../../lib/ghana';
import {propertyInputSchema} from '../../lib/property-validation';
import {parseFilters} from '../../lib/catalogue';
import {properties} from '../../lib/server';
import {publicLeadHandler} from '../../lib/public-leads';
import {consumePrivateQuota} from '../../lib/private-quota';
import {HeroFrameLoader,heroFrameForProgress} from '../../lib/cinematic/heroFrames';
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
test('campaign navigation preserves filters and anchors, validates tags and leaves external destinations alone',()=>{
 assert.equal(campaignUrl('/properties?category=land#results',tvAttribution),'/properties?category=land&utm_source=tv&utm_medium=broadcast&utm_campaign=launch_oct2026#results');
 assert.equal(campaignUrl('https://wa.me/123',tvAttribution),'https://wa.me/123');
 assert.equal(campaignUrl('//external.test',tvAttribution),'//external.test');
 assert.deepEqual(attributionFrom(new URLSearchParams('utm_source=tv&utm_campaign=launch_oct2026&utm_term=buyer@example.com')),{utm_source:'tv',utm_campaign:'launch_oct2026'});
 assert.equal(attributionSchema.safeParse({utm_source:'x'.repeat(101)}).success,false);
 assert.equal(attributionSchema.safeParse({email:'not allowed'}).success,false);
 assert.deepEqual(navigationAttribution('/tv',new URLSearchParams()),tvAttribution);
 assert.equal(navigationAttribution('/tv',new URLSearchParams('utm_campaign=custom')).utm_campaign,'custom');
});
test('all 16 official regions round trip while catalogue excludes invented regions',()=>{
 assert.equal(ghanaRegions.length,16);for(const r of ghanaRegions)assert.equal(regionFromSlug(regionSlug(r)),r);
 assert.equal(parseFilters({region:'Kumasi'}).region,'');assert.equal(parseFilters({region:'Ashanti',beds:'3'}).beds,'3');
 assert.equal(parseFilters({beds:'-1'}).beds,'');
});
const draft={id:'',title:'A supplied genuine property',slug:'supplied-property',category:'residential',location:'Confirmed locality',price:'',image:'',images:'',beds:'',baths:'',description:'Information supplied for review.',status:'draft',plot_size_sqm:'',building_size_sqm:'',tenure:'',documentation_status:'',amenities:''};
test('publication requires approval, genuine permission, availability and structured location; drafts stay compatible',()=>{
 assert.equal(propertyInputSchema.safeParse(draft).success,true);assert.equal(propertyInputSchema.safeParse({...draft,region:''}).success,true);
 assert.equal(propertyInputSchema.safeParse({...draft,status:'published'}).success,false);
 const approved={...draft,status:'published',region:'Ashanti',city:'Kumasi',property_type:'Detached house',review_status:'approved',availability:'available',publication_authorized:'on'};
 assert.equal(propertyInputSchema.safeParse(approved).success,true);
 for(const changes of [{publication_authorized:undefined},{review_status:'review'},{availability:'reserved'},{city:''},{image:'javascript:alert(1)'},{price:'-5'}]) assert.equal(propertyInputSchema.safeParse({...approved,...changes}).success,false);
});
function storageMock() {
 const old=globalThis.fetch,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY,oldSecret=process.env.SUPABASE_SECRET_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://launch-unit.example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic';delete process.env.SUPABASE_SECRET_KEY;
 const objects=new Map<string,string>(),rows=new Map<string,unknown>();let publicBucket=false,fail=false;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),path=url.pathname;
  if(path.endsWith('/properties'))return url.searchParams.get('select')?.includes('review_status')?json({code:'42703'},400):json([{id:'11111111-1111-4111-8111-111111111111'}]);
  if(path.endsWith('/consume_public_lead_quota'))return json({code:'PGRST202',message:'function missing'},404);
  if(path.endsWith('/enquiries')) {if(init?.method==='POST'){const row=JSON.parse(String(init.body));rows.set(row.id,row);return new Response(null,{status:201});}return json(rows.has(url.searchParams.get('id')?.slice(3)||'')?[rows.get(url.searchParams.get('id')!.slice(3))]:[]);}
  if(path.endsWith('/bucket/strong-homepage-private'))return json({id:'strong-homepage-private',public:publicBucket});
  const key=path.split('/object/strong-homepage-private/')[1];if(!key)throw Error('Unexpected '+path);
  if(init?.method==='POST') {if(fail)return json({statusCode:'503',message:'outage'},503);if(objects.has(key))return json({statusCode:'409',message:'already exists'},409);objects.set(key,String(init.body));return json({Key:key});}
  return objects.has(key)?new Response(objects.get(key)):json({statusCode:'404',message:'Object not found'},404);
 };
 return {objects,rows,publicBucket:()=>publicBucket=true,fail:()=>fail=true,restore:()=>{globalThis.fetch=old;for(const [k,v]of [['NEXT_PUBLIC_SUPABASE_URL',oldUrl],['SUPABASE_SERVICE_ROLE_KEY',oldKey],['SUPABASE_SECRET_KEY',oldSecret]]){if(v===undefined)delete process.env[k!];else process.env[k!]=v;}}};
}
const id='11111111-1111-4111-8111-111111111111';
function lead(key:string,context={}){return new Request('http://localhost:3000/api/enquiries',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json','idempotency-key':key},body:JSON.stringify({propertyId:id,name:'Launch QA',phone:'+000 987 111 222',...context})});}
test('missing SQL quota uses atomic private reservations and attribution is immutable across retries',async()=>{
 const m=storageMock(),key=randomUUID();try{
  const context={attribution:tvAttribution,countryOfResidence:'Germany',preferredContact:'whatsapp',remoteViewing:true};
  assert.equal((await publicLeadHandler('enquiries')(lead(key,context))).status,201);
  assert.equal((await publicLeadHandler('enquiries')(lead(key,context))).status,200);
  assert.equal(m.rows.size,1);assert.equal([...m.objects.keys()].filter(k=>k.startsWith('quotas/')).length,1);
  const sidecar=JSON.parse(m.objects.get('lead-context/enquiries-'+key+'.json')!);assert.equal(sidecar.attribution.utm_source,'tv');assert.equal(sidecar.countryOfResidence,'Germany');
  assert.equal((await publicLeadHandler('enquiries')(lead(key,{...context,countryOfResidence:'Ghana'}))).status,503);
  assert.equal(JSON.parse(m.objects.get('lead-context/enquiries-'+key+'.json')!).countryOfResidence,'Germany');
 }finally{m.restore();}
});
test('private quota admits exactly five reservations and refuses public or unavailable storage',async()=>{
 const m=storageMock();try{
  const key='a'.repeat(64);for(let i=0;i<5;i++)assert.equal(await consumePrivateQuota(key),true);assert.equal(await consumePrivateQuota(key),false);
  m.publicBucket();await assert.rejects(()=>consumePrivateQuota('b'.repeat(64)));
 }finally{m.restore();}
 const outage=storageMock();try{outage.fail();await assert.rejects(()=>consumePrivateQuota('c'.repeat(64)));}finally{outage.restore();}
});
test('a request without browser origin is rejected before any backend request',async()=>{
 const req=new Request('http://localhost:3000/api/enquiries',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal((await publicLeadHandler('enquiries')(req)).status,403);
});
test('active hero loader cancels rapid seeks, bounds concurrent decoding and releases every bitmap',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;let opened=0,closed=0,active=0,peak=0,errors=0;
 globalThis.fetch=async(_url,init)=>{active++;peak=Math.max(peak,active);try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,4);init?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});return new Response(new Blob(['frame']));}finally{active--;}};
 globalThis.createImageBitmap=async()=>{opened++;return {width:8,height:8,close:()=>closed++} as ImageBitmap;};
 const loader=new HeroFrameLoader(i=>'/frame-'+i,451,{capacity:10,concurrency:2,stride:1,onFrame:()=>{},onFailure:()=>errors++});
 async function seek(i:number){loader.request(i,1);for(let n=0;n<100&&!loader.get(i);n++)await new Promise(r=>setTimeout(r,3));assert.ok(loader.get(i));assert.ok(loader.stats().decoded<=10);}
 try{loader.request(0,1);loader.request(450,1);loader.request(0,-1);await seek(0);for(const i of [113,225,338,450,225,0])await seek(i);assert.ok(peak<=2);assert.equal(errors,0);loader.dispose();await new Promise(r=>setTimeout(r,25));assert.equal(opened,closed);assert.equal(loader.stats().decoded,0);assert.deepEqual([0,.25,.5,.75,1].map(p=>heroFrameForProgress(p)),[0,113,225,338,450]);}
 finally{loader.dispose();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('an unavailable publication capability check never falls back to legacy public queries',async()=>{
 const m=storageMock();let queries=0;globalThis.fetch=async()=>{queries++;return json({code:'XX000',message:'Synthetic database outage'},403);};
 try{await assert.rejects(()=>properties(),/Publication controls/);assert.equal(queries,1);}finally{m.restore();}
});
