import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {parseStorageReference} from '../../lib/media';
test.use({trace:'off',video:'off',screenshot:'off'});
test('owned live campaign enquiries, staff inbox, draft editor, private media and anonymous denial',async({browser},info)=>{
 test.skip(info.project.name!=='desktop'||process.env.STRONG_LIVE_QA!=='1');test.setTimeout(180000);
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3001',url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY!,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 const service=createClient(url,key,{auth:{persistSession:false}}),auth=createClient(url,publicKey,{auth:{persistSession:false}}),anon=createClient(url,publicKey,{auth:{persistSession:false}});
 const storage=service.storage.from('strong-homepage-private'),owned=new Set<string>(),ids=new Set<string>();
 const slug='private-launch-qa-'+randomUUID().slice(0,8),phone='+000 111 '+String(Math.floor(Math.random()*900000)+100000),name='PRIVATE LAUNCH QA '+randomUUID().slice(0,8),hash=createHash('sha256').update(phone.replace(/\D/g,'')).digest('hex');
 const visitor=await browser.newContext(),admin=await browser.newContext(),native=await browser.newContext({javaScriptEnabled:false});
 let propertyId='',mediaPath='';const report:Record<string,unknown>={liveSupabase:true,notificationsSent:false,accountsCreated:false,passwordLoginTested:false,publicTestInventoryCreated:false};
 try{
  const page=await visitor.newPage();await page.goto(base+'/tv');const form=page.locator('.general-enquiry');
  await form.locator('[name=name]').fill(name);await form.locator('[name=phone]').fill(phone);await form.locator('[name=countryOfResidence]').fill('Germany');await form.locator('[name=preferredContact]').selectOption('whatsapp');await form.locator('[name=remoteViewing]').check();await form.locator('[name=message]').fill('Owned automated verification. Do not contact; removed after verification.');
  const pending=page.waitForRequest(r=>r.url().endsWith('/api/house-enquiries')&&r.method()==='POST');await form.getByRole('button',{name:'Send my enquiry'}).click();const req=await pending,id=req.headers()['idempotency-key'];owned.add('enquiries/'+id+'.json');ids.add(id);
  await expect(form.getByRole('status')).toContainText('received');const object=await storage.download('enquiries/'+id+'.json');expect(object.error).toBeNull();const saved=JSON.parse(await object.data!.text());expect(saved.attribution.utm_source).toBe('tv');expect(saved.remoteViewing).toBe(true);expect(saved.countryOfResidence).toBe('Germany');
  const replay=await visitor.request.post(base+'/api/house-enquiries',{headers:{Origin:base,'Idempotency-Key':id},data:req.postDataJSON()});expect(replay.status()).toBe(200);expect((await replay.json()).duplicate).toBe(true);
  expect((await anon.storage.from('strong-homepage-private').download('enquiries/'+id+'.json')).error).not.toBeNull();report.campaignGeneralEnquiryStored=true;report.retryIdempotent=true;report.generalEnquiryAnonymousReadDenied=true;
  const plain=await native.newPage();await plain.goto(base+'/tv');const form2=plain.locator('.general-enquiry'),nativeId=await form2.locator('[name=requestId]').inputValue();owned.add('enquiries/'+nativeId+'.json');ids.add(nativeId);
  await form2.locator('[name=name]').fill('PRIVATE NATIVE LAUNCH QA');await form2.locator('[name=phone]').fill(phone);await form2.getByRole('button',{name:'Send my enquiry'}).click();await expect(plain.getByRole('heading',{name:'Your enquiry has been received.'})).toBeVisible();
  const nativeRecord=await storage.download('enquiries/'+nativeId+'.json');expect(nativeRecord.error).toBeNull();expect(JSON.parse(await nativeRecord.data!.text()).attribution.utm_campaign).toBe('launch_oct2026');report.noJavaScriptCampaignSubmissionStored=true;
  const profile=await service.from('staff_profiles').select('id').eq('role','admin').limit(1).single();expect(profile.error).toBeNull();const user=await service.auth.admin.getUserById(profile.data!.id);
  const link=await service.auth.admin.generateLink({type:'magiclink',email:user.data.user!.email!});expect(link.error).toBeNull();const session=await auth.auth.verifyOtp({token_hash:link.data.properties!.hashed_token,type:'email'});expect(session.error).toBeNull();
  await admin.addCookies([{name:'sp_admin_token',value:session.data.session!.access_token,url:base,httpOnly:true,sameSite:'Lax'}]);
  const editor=await admin.newPage();await editor.goto(base+'/admin/properties/new');await expect(editor.getByText('The Ghana launch database migration is pending.',{exact:false})).toBeVisible();
  const propertyForm=editor.locator('.property-editor');await propertyForm.locator('[name=title]').fill('PRIVATE QA — NOT OFFERED FOR SALE');await propertyForm.locator('[name=slug]').fill(slug);await propertyForm.locator('[name=location]').fill('Private QA fixture');await propertyForm.locator('[name=description]').fill('Owned draft only. No buyer offering. Removed after verification.');await propertyForm.locator('[name=plot_size_sqm]').fill('250');await propertyForm.locator('[name=amenities]').fill('Owned QA feature');
  await propertyForm.getByRole('button',{name:'Save property'}).click();await expect(editor).toHaveURL(/\/admin\/properties\/[0-9a-f-]{36}$/);propertyId=editor.url().split('/').pop()!;ids.add(propertyId);await expect(editor.locator('[name=plot_size_sqm]')).toHaveValue('250');report.draftAndSquareMetreSpecificationsSaved=true;report.structuredFieldsAndPublishGated=true;
  const anonDraft=await anon.from('properties').select('id').eq('id',propertyId);expect(anonDraft.error).toBeNull();expect(anonDraft.data).toEqual([]);expect((await visitor.request.get(base+'/properties/'+slug)).status()).toBe(404);report.draftAnonymousReadDenied=true;
  const manager=editor.locator('.media-manager');await manager.locator('[name=file]').setInputFiles('public/images/house-v1/exterior-thumb.webp');await manager.locator('[name=caption]').fill('Owned private QA image');const uploaded=editor.waitForResponse(r=>r.url().endsWith('/api/admin/media')&&r.request().method()==='POST');await manager.getByRole('button',{name:'Upload media'}).click();expect((await uploaded).status()).toBe(201);
  const media=await service.from('property_media').select('id,url').eq('property_id',propertyId).single();expect(media.error).toBeNull();mediaPath=parseStorageReference(media.data!.url)!.path;
  expect((await visitor.request.get(base+'/api/media/'+media.data!.id)).status()).toBe(404);expect((await admin.request.get(base+'/api/media/'+media.data!.id)).status()).toBe(200);expect((await anon.storage.from('strong-property-media').download(mediaPath)).error).not.toBeNull();report.privateMediaUploadAndAuthorization=true;
  const leadId=randomUUID();ids.add(leadId);const inserted=await service.from('enquiries').insert({id:leadId,property_id:propertyId,name,phone,message:'Owned private RLS fixture'});expect(inserted.error).toBeNull();
  const anonLead=await anon.from('enquiries').select('id').eq('id',leadId);expect(anonLead.error).toBeNull();expect(anonLead.data).toEqual([]);report.propertyLeadAnonymousReadDenied=true;
  const denied=await visitor.request.post(base+'/api/enquiries',{headers:{Origin:base},data:{propertyId,name,phone}});expect(denied.status()).toBe(404);report.draftPublicEnquiryRejected=true;
  await editor.goto(base+'/admin/enquiries');await expect(editor.getByRole('heading',{name:'Enquiries',exact:true})).toBeVisible();await expect(editor.getByText(name,{exact:true})).toHaveCount(2);await expect(editor.getByText('Residence: Germany')).toBeVisible();report.staffInboxWithAttribution=true;
  await editor.goto(base+'/admin/marketing');await expect(editor.getByRole('heading',{name:'Marketing & enquiries'})).toBeVisible();await expect(editor.getByRole('cell',{name:'launch_oct2026',exact:true})).toBeVisible();report.actualCampaignReport=true;
  expect((await visitor.request.get(base+'/admin/marketing')).url()).toContain('/admin/login');report.reportingRequiresStaff=true;
 }finally{
  if(!propertyId){const found=await service.from('properties').select('id').eq('slug',slug).maybeSingle();propertyId=found.data?.id||'';if(propertyId)ids.add(propertyId);}
  if(!mediaPath&&propertyId){const media=await service.from('property_media').select('url').eq('property_id',propertyId).maybeSingle();mediaPath=media.data?parseStorageReference(media.data.url)?.path||'':'';}
  if(mediaPath)expect((await service.storage.from('strong-property-media').remove([mediaPath])).error).toBeNull();
  if(propertyId){expect((await service.from('enquiries').delete().eq('property_id',propertyId)).error).toBeNull();expect((await service.from('audit_logs').delete().in('entity_id',[...ids])).error).toBeNull();expect((await service.from('properties').delete().eq('id',propertyId).eq('slug',slug)).error).toBeNull();}
  const quotas=await storage.list('quotas',{limit:1000});for(const file of quotas.data||[])if(file.name.startsWith(hash+'-')){const obj=await storage.download('quotas/'+file.name);if(obj.data&&ids.has(JSON.parse(await obj.data.text()).id))owned.add('quotas/'+file.name);}
  if(owned.size)expect((await storage.remove([...owned])).error).toBeNull();
  await auth.auth.signOut({scope:'local'});await visitor.close();await admin.close();await native.close();
  report.ownedFixturesRemoved=true;await mkdir('docs/visual-verification/ghana-launch',{recursive:true});await writeFile('docs/visual-verification/ghana-launch/live-integration.json',JSON.stringify(report,null,2));
 }
});
