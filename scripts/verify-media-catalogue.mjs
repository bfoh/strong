// Read-only live QA. Never confirms property identities, publishes stock, or sends enquiries.
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base=process.env.MEDIA_QA_BASE_URL||'http://127.0.0.1:3001',origin=new URL(base).origin;
const output=path.resolve(process.env.MEDIA_QA_SOURCE||'../property-media','qa');await mkdir(output,{recursive:true});
const config={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,config);
const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,config);
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,config);
class Failure extends Error{}const check=(value,label)=>{if(!value)throw new Failure(label);};
const result={checkedAt:new Date().toISOString(),base,checks:[],counts:{}};let browser,session;
async function step(name,action){await action();result.checks.push(name);console.log('PASS '+name);}
try{
 const indexObject=await service.storage.from('strong-media-review').download('index.json');check(indexObject.data,'Private index available');const index=JSON.parse(await indexObject.data.text());
 const reports=[];for(const id of index.batches){const found=await service.storage.from('strong-media-review').download(`batches/${id}/manifest.json`);check(found.data,'Private manifest available');reports.push(JSON.parse(await found.data.text()));}
 const groups=reports.flatMap(r=>r.groups),assets=reports.flatMap(r=>r.assets),ids=groups.filter(g=>g.propertyId).map(g=>g.propertyId);
 const rows=await service.from('properties').select('id,slug,status,price,beds,baths,image').in('id',ids);check(!rows.error&&rows.data.length===ids.length,'Every imported draft exists');
 const media=await service.from('property_media').select('id,property_id,kind,url,caption,sort_order').in('property_id',ids);check(!media.error,'Managed gallery metadata loads');
 result.counts={originals:assets.length,reviewGroups:groups.length,sourceFolders:new Set(assets.map(a=>a.sourceMediaGroup)).size,drafts:ids.length,publicImported:rows.data.filter(p=>p.status==='published').length,propertyImages:media.data.filter(m=>m.kind==='image').length,propertyVideos:media.data.filter(m=>m.kind==='video').length};
 await step('Imported candidates remain drafts with unknown facts blank',async()=>{check(rows.data.every(p=>p.status==='draft'&&p.price===null&&p.beds===null&&p.baths===null),'No inferred property facts or public stock');check(new Set(ids).size===ids.length,'Unique property IDs');check(assets.filter(a=>a.duplicateOf).every(a=>!a.mediaId),'Duplicate sources do not create duplicate tours');});
 await step('All original bytes match the audited SHA-256 checksums',async()=>{
  const originals=[...new Map(assets.map(a=>[a.sha256,a])).values()];
  for(let i=0;i<originals.length;i+=4)await Promise.all(originals.slice(i,i+4).map(async a=>{const source=await service.storage.from(a.original.bucket).download(a.original.path);check(source.data,'Private original exists');const bytes=Buffer.from(await source.data.arrayBuffer());check(bytes.length===a.bytes&&createHash('sha256').update(bytes).digest('hex')===a.sha256,'Original bytes preserved exactly');}));
 });
 await step('Anonymous database and private storage reads reveal no imported stock',async()=>{const found=await anon.from('properties').select('id').in('id',ids);check(!found.error&&found.data.length===0,'Anonymous properties hidden');const asset=assets[0];const object=await anon.storage.from(asset.original.bucket).download(asset.original.path);check(object.error&&!object.data,'Original requires authorized staff');});
 const profiles=await service.from('staff_profiles').select('id,role').eq('role','admin');check(profiles.data?.length===1,'Exactly one existing administrator selected');
 const account=await service.auth.admin.getUserById(profiles.data[0].id);check(account.data.user?.email,'Administrator account exists');
 const link=await service.auth.admin.generateLink({type:'magiclink',email:account.data.user.email});check(!link.error&&link.data.properties?.hashed_token,'No-email temporary sign-in generated');
 const signed=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'});check(!signed.error&&signed.data.session,'Existing administrator authenticated');session=signed.data.session;
 browser=await chromium.launch({channel:'chrome',headless:true});const visitor=await browser.newContext(),staff=await browser.newContext({viewport:{width:1440,height:1000}});
 await staff.addCookies([{name:'sp_admin_token',value:session.access_token,url:origin,httpOnly:true,secure:new URL(base).protocol==='https:',sameSite:'Lax'}]);
 await step('Anonymous visitors cannot open reports, draft previews or any managed asset',async()=>{
  const report=await visitor.request.get(base+'/admin/media-review');check(report.url().includes('/admin/login'),'Report requires staff');
  for(const p of rows.data){const detail=await visitor.request.get(base+'/properties/'+p.slug);check(detail.status()===404,'Draft detail not public');const preview=await visitor.request.get(base+`/admin/properties/${p.id}/preview`);check(preview.url().includes('/admin/login'),'Private preview requires staff');}
  for(let i=0;i<media.data.length;i+=6)await Promise.all(media.data.slice(i,i+6).map(async m=>{const response=await visitor.request.get(base+'/api/media/'+m.id);check(response.status()===404,'Draft managed asset hidden');}));
  const r=reports[0],a=r.assets[0];const response=await visitor.request.get(base+`/api/admin/media-review/${r.id}/${a.id}`);check(response.status()===404,'Source thumbnail hidden');
  const mutation=await visitor.request.post(base+'/api/admin/media-review/decision',{headers:{origin},form:{}});check(mutation.status()===403,'Unauthenticated review mutation rejected');
 });
 await step('Staff source review lists every original and desktop layout stays within the viewport',async()=>{
  const page=await staff.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.name));await page.goto(base+'/admin/media-review');await page.getByRole('heading',{name:'Media review',exact:true}).waitFor();check(await page.locator('.review-assets>figure').count()===assets.length,'All originals represented');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desktop report has no horizontal overflow');check(errors.length===0,'No review page exceptions');await page.screenshot({path:path.join(output,'review-desktop.png')});await page.close();
 });
 await step('Every assigned photograph and tour still decodes through the authorized proxy',async()=>{
  for(let i=0;i<media.data.length;i+=4)await Promise.all(media.data.slice(i,i+4).filter(m=>m.kind==='image').map(async m=>{const response=await staff.request.get(base+'/api/media/'+m.id);check(response.status()===200,'Image resolves');check(response.headers()['cache-control']?.includes('private'),'No public image cache');const metadata=await sharp(await response.body()).metadata();check(metadata.width>0&&metadata.height>0,'Image decodes');}));
 });
 await step('Mobile preview preserves image aspect ratios, gallery navigation and page width',async()=>{
  const page=await staff.newPage();await page.setViewportSize({width:390,height:844});const photoGroup=groups.find(g=>g.assignedAssetIds.length===4);check(photoGroup,'Photo group available');await page.goto(base+`/admin/properties/${photoGroup.propertyId}/preview`);await page.locator('.gallery-stage img').first().waitFor();await page.screenshot({path:path.join(output,'preview-mobile-before.png'),fullPage:true});result.mobileOverflow=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,className:e.className,width:e.getBoundingClientRect().width})));check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile preview has no horizontal overflow');check(await page.locator('.gallery-stage img').first().evaluate(img=>getComputedStyle(img).objectFit)==='contain','Gallery preserves original aspect ratios');await page.getByRole('button',{name:'Explore gallery'}).click();await page.keyboard.press('ArrowRight');check((await page.getByRole('dialog').textContent()).includes('02 / 04'),'Fullscreen gallery advances');await page.keyboard.press('Escape');await page.evaluate(()=>{scrollTo(0,0);document.activeElement?.blur();});await page.screenshot({path:path.join(output,'preview-mobile.png'),fullPage:true});await page.goto(base+'/admin/media-review');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile report has no horizontal overflow');await page.screenshot({path:path.join(output,'review-mobile.png')});await page.close();
 });
 await step('Every property tour supports byte ranges and plays; previews download no video before play',async()=>{
  for(const item of media.data.filter(m=>m.kind==='video')){
   const ranged=await staff.request.get(base+'/api/media/'+item.id,{headers:{range:'bytes=0-1023'}});check(ranged.status()===206&&ranged.headers()['content-range']?.startsWith('bytes 0-'),'Video byte ranges supported');
   const bytes=await ranged.body();check(bytes.toString('ascii',4,8)==='ftyp','Original MP4 signature');
   const page=await staff.newPage(),videoIds=new Set(media.data.filter(m=>m.kind==='video').map(m=>m.id)),requested=[];page.on('request',r=>{if(videoIds.has(new URL(r.url()).pathname.split('/').pop()))requested.push(r.url());});
   await page.goto(base+`/admin/properties/${item.property_id}/preview`);await page.locator('.gallery-stage img').first().waitFor();check(requested.length===0,'No full tour requested before play');
   const video=page.locator('video').first();check(await video.getAttribute('preload')==='none','Lazy video preload');check(await video.getAttribute('poster'),'Faithful video poster present');
   await video.evaluate(async v=>{v.muted=true;await v.play();});await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.2,{},{timeout:30000});await video.evaluate(v=>v.pause());check(requested.length>0,'Play requests the original video');await page.close();
  }
 });
 await step('Review mutation rejects missing evidence, cross-origin and stale gallery confirmations',async()=>{
  const id=ids[0];const invalid=await staff.request.post(base+'/api/admin/media-review/decision',{headers:{origin},form:{propertyId:id}});check(invalid.status()===400,'Incomplete identity claim rejected');const cross=await staff.request.post(base+'/api/admin/media-review/decision',{headers:{origin:'https://untrusted.example'},form:{}});check(cross.status()===403,'Cross-origin rejected');const stale=await staff.request.post(base+'/api/admin/media-review/decision',{headers:{origin},form:{propertyId:id,gallerySignature:'0'.repeat(64),confirmed:'yes',evidence:'Automated stale-form rejection only, no identity approval.'}});check(stale.status()===409,'Stale confirmation cannot approve a property');
 });
 await step('Public catalogue contains no source filenames, proposed facts or private review metadata',async()=>{
  const response=await visitor.request.get(base+'/properties');check(response.status()===200,'Catalogue available');const html=await response.text();for(const forbidden of ['sourceMediaGroup','assignedAssetIds','sourceFilename',...assets.map(a=>a.sourceFilename),...rows.data.map(p=>p.slug)])check(!html.includes(forbidden),'Public payload excludes private provenance and draft slugs');check(!html.includes('<video'),'Catalogue contains no video players');const sitemap=await visitor.request.get(base+'/sitemap.xml');const xml=await sitemap.text();check(rows.data.every(p=>!xml.includes(p.slug)),'Drafts absent from sitemap');
 });
 await staff.close();await visitor.close();
 result.passed=true;
}catch(error){result.passed=false;result.failure=error instanceof Failure?error.message:'QA stopped; raw exceptions withheld to protect credentials and private source metadata.';console.error('FAIL '+result.failure);process.exitCode=1;}
finally{if(browser)await browser.close();if(session)await auth.auth.signOut({scope:'local'});await writeFile(path.join(output,new URL(base).hostname==='127.0.0.1'?'local-verification.json':'production-verification.json'),JSON.stringify(result,null,2));}
