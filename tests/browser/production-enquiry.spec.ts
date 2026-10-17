import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
test.use({trace:'off',video:'off',screenshot:'off'});
test('production enquiries save privately, retain TV attribution and reach the existing staff inbox',async({browser},info)=>{
 test.skip(info.project.name!=='desktop'||process.env.STRONG_PRODUCTION_QA!=='1');test.setTimeout(150000);
 const base=process.env.TEST_BASE_URL||'https://strong-eta.vercel.app';
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY!,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 const service=createClient(url,key,{auth:{persistSession:false}}),auth=createClient(url,publicKey,{auth:{persistSession:false}}),anon=createClient(url,publicKey,{auth:{persistSession:false}});
 const bucket='strong-homepage-private',storage=service.storage.from(bucket),privateBucket=await service.storage.getBucket(bucket);
 expect(privateBucket.error===null&&privateBucket.data?.public===false).toBe(true);
 const marker=randomUUID().slice(0,8),name='PRODUCTION ENQUIRY QA '+marker,nativeName='PRODUCTION NATIVE QA '+marker;
 const phone='+000 555 '+String(Math.floor(Math.random()*900000)+100000),hash=createHash('sha256').update(phone.replace(/\D/g,'')).digest('hex');
 const owned=new Set<string>(),ids=new Set<string>();
 const visitor=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),native=await browser.newContext({javaScriptEnabled:false}),admin=await browser.newContext();
 const report:Record<string,unknown>={checkedAt:new Date().toISOString(),base,production:true,notificationsSent:false,accountsCreated:false,passwordLoginTested:false,publicInventoryCreated:false,status:'incomplete'};
 function own(id:string){expect(/^[a-f0-9-]{36}$/.test(id)).toBe(true);ids.add(id);owned.add('enquiries/'+id+'.json');}
 try{
  const page=await visitor.newPage();page.on('request',r=>{if(r.method()==='POST'&&r.url()===base+'/api/house-enquiries'){const id=r.headers()['idempotency-key'];if(id)own(id);}});
  await page.goto(base+'/tv');const form=page.locator('form.general-enquiry');await expect(form).toBeVisible();
  await form.locator('[name=name]').fill(name);await form.locator('[name=phone]').fill(phone);await form.locator('[name=countryOfResidence]').fill('Germany');await form.locator('[name=preferredContact]').selectOption('whatsapp');await form.locator('[name=remoteViewing]').check();await form.locator('[name=message]').fill('Owned production verification. Do not contact; removed after verification.');
  const pending=page.waitForRequest(r=>r.method()==='POST'&&r.url()===base+'/api/house-enquiries');await form.getByRole('button',{name:'Send my enquiry'}).click();const req=await pending,id=req.headers()['idempotency-key'];own(id);
  const response=await req.response();expect(response?.status()).toBe(201);await expect(form.getByRole('status')).toContainText('received');
  const saved=await storage.download('enquiries/'+id+'.json');expect(saved.error).toBeNull();const record=JSON.parse(await saved.data!.text());expect(record.name).toBe(name);expect(record.attribution).toEqual({utm_source:'tv',utm_medium:'broadcast',utm_campaign:'launch_oct2026'});expect(record.countryOfResidence).toBe('Germany');expect(record.preferredContact).toBe('whatsapp');expect(record.remoteViewing).toBe(true);
  report.mobileJavaScriptEnquiryStored=true;report.campaignAndBuyerPreferencesStored=true;
  const replay=await visitor.request.post(base+'/api/house-enquiries',{headers:{Origin:base,'Idempotency-Key':id},data:req.postDataJSON()});expect(replay.status()).toBe(200);expect((await replay.json()).duplicate).toBe(true);
  const changed=await visitor.request.post(base+'/api/house-enquiries',{headers:{Origin:base,'Idempotency-Key':id},data:{...req.postDataJSON(),message:'Different owned payload'}});expect(changed.status()).toBe(409);report.idempotentRetryAndConflictProtection=true;
  expect((await anon.storage.from(bucket).download('enquiries/'+id+'.json')).error).not.toBeNull();expect((await visitor.request.get(base+'/api/house-images/'+id)).status()).toBe(404);report.anonymousReadAndImageBypassDenied=true;
  const plain=await native.newPage();await plain.goto(base+'/tv');const form2=plain.locator('form.general-enquiry'),nativeId=await form2.locator('[name=requestId]').inputValue();own(nativeId);
  await form2.locator('[name=name]').fill(nativeName);await form2.locator('[name=phone]').fill(phone);await form2.getByRole('button',{name:'Send my enquiry'}).click();await expect(plain.getByRole('heading',{name:'Your enquiry has been received.'})).toBeVisible();
  const nativeSaved=await storage.download('enquiries/'+nativeId+'.json');expect(nativeSaved.error).toBeNull();expect(JSON.parse(await nativeSaved.data!.text()).attribution.utm_campaign).toBe('launch_oct2026');report.noJavaScriptEnquiryStoredWithAttribution=true;
  const profile=await service.from('staff_profiles').select('id').eq('role','admin').limit(1).single();expect(profile.error===null&&Boolean(profile.data?.id)).toBe(true);
  const user=await service.auth.admin.getUserById(profile.data!.id);expect(user.error===null&&Boolean(user.data.user?.email)).toBe(true);
  const link=await service.auth.admin.generateLink({type:'magiclink',email:user.data.user!.email!});expect(link.error===null).toBe(true);
  const session=await auth.auth.verifyOtp({token_hash:link.data.properties!.hashed_token,type:'email'});expect(session.error===null&&session.data.user?.id===profile.data!.id&&Boolean(session.data.session)).toBe(true);
  await admin.addCookies([{name:'sp_admin_token',value:session.data.session!.access_token,url:base,httpOnly:true,secure:true,sameSite:'Lax'}]);
  const inbox=await admin.newPage();await inbox.goto(base+'/admin/enquiries');await expect(inbox.getByText(name,{exact:true})).toBeVisible();await expect(inbox.getByText(nativeName,{exact:true})).toBeVisible();
  const row=inbox.getByRole('row').filter({hasText:name});await expect(row).toContainText('Residence: Germany');await expect(row).toContainText('launch_oct2026');report.productionStaffInboxAndAttribution=true;
  await inbox.goto(base+'/admin/marketing');await expect(inbox.getByRole('heading',{name:'Marketing & enquiries'})).toBeVisible();await expect(inbox.getByRole('cell',{name:'launch_oct2026',exact:true})).toBeVisible();report.productionStaffCampaignReport=true;
  expect((await visitor.request.get(base+'/admin/enquiries')).url()).toContain('/admin/login');report.anonymousInboxDenied=true;report.status='passed';
 }finally{
  const quotas=await storage.list('quotas',{limit:1000});expect(quotas.error).toBeNull();
  for(const file of quotas.data||[])if(file.name.startsWith(hash+'-')){const data=await storage.download('quotas/'+file.name);if(data.data&&ids.has(JSON.parse(await data.data.text()).id))owned.add('quotas/'+file.name);}
  if(owned.size)expect((await storage.remove([...owned])).error).toBeNull();
  for(const id of ids)expect((await storage.download('enquiries/'+id+'.json')).data).toBeNull();
  report.ownedFixturesRemoved=true;report.testEnquiries=ids.size;
  await auth.auth.signOut({scope:'local'});await visitor.close();await native.close();await admin.close();
  await mkdir('docs/visual-verification/ghana-launch',{recursive:true});await writeFile('docs/visual-verification/ghana-launch/production-enquiry.json',JSON.stringify(report,null,2));
 }
});
