import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
test('optional Google measurement stays behind consent and excludes contact data and search text',async({browser},info)=>{
 test.skip(info.project.name!=='desktop'||process.env.STRONG_CONSENT_QA!=='1');
 const context=await browser.newContext(),page=await context.newPage();let scripts=0;
 await context.route('https://www.googletagmanager.com/**',async route=>{scripts++;await route.fulfill({contentType:'text/javascript',body:'/* Local verification stub; no Google requests are sent. */'});});
 await context.route(/https:\/\/.*(?:google-analytics|googleadservices|doubleclick)\..*/,route=>route.abort());
 try{
  await page.goto('/tv?utm_source=tv&utm_medium=broadcast&utm_campaign=launch_oct2026');
  await expect(page.getByRole('region',{name:'Analytics and advertising choices'})).toBeVisible();expect(scripts).toBe(0);
  await page.getByRole('button',{name:'Essential only',exact:true}).click();expect(scripts).toBe(0);expect(await page.locator('#strong-google-tag').count()).toBe(0);
  await page.getByRole('button',{name:'Privacy choices',exact:true}).click();await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
  await expect(page.locator('#strong-google-tag')).toHaveCount(1);await expect.poll(()=>scripts).toBe(1);
  const commands=()=>page.evaluate(()=>window.dataLayer || []);
  await expect.poll(async()=>JSON.stringify(await commands())).toContain('page_view');
  await page.getByRole('link',{name:'Explore Properties ↗',exact:true}).click();await page.getByLabel('SEARCH',{exact:true}).fill('sensitive-search-text');await page.getByRole('button',{name:'Find your space'}).click();await expect(page).toHaveURL(/q=sensitive-search-text/);
  await page.getByRole('link',{name:'Contact',exact:true}).first().click();const form=page.locator('.general-enquiry');await form.locator('[name=name]').fill('PRIVATE CONTACT QA');await form.locator('[name=phone]').fill('+000 987 654 321');await form.locator('[name=email]').fill('private@example.invalid');
  await page.route('**/api/house-enquiries',route=>route.fulfill({status:201,json:{ok:true,status:'new'}}));await form.getByRole('button',{name:'Send my enquiry'}).click();await expect(form.getByRole('status')).toContainText('received');
  let events=JSON.stringify(await commands());expect(events).toContain('enquiry_submit');expect(events).not.toContain('conversion');for(const pii of ['PRIVATE CONTACT QA','+000 987 654 321','private@example.invalid','sensitive-search-text'])expect(events).not.toContain(pii);
  await page.getByRole('button',{name:'Privacy choices',exact:true}).click();await page.getByRole('button',{name:'Allow analytics & advertising'}).click();
  await form.locator('[name=name]').fill('PRIVATE SECOND QA');await form.locator('[name=phone]').fill('+000 987 654 322');await form.getByRole('button',{name:'Send my enquiry'}).click();await expect(form.getByRole('status')).toContainText('received');
  await expect.poll(async()=>JSON.stringify(await commands())).toContain('AW-123456789/qa_only');
  await page.getByRole('button',{name:'Privacy choices',exact:true}).click();await page.getByRole('button',{name:'Essential only',exact:true}).click();events=JSON.stringify(await commands());expect(events).toContain('denied');
  const after=(await commands()).filter((v:unknown)=>Array.isArray(v)&&v[0]==='event').length;await page.getByRole('link',{name:'Call Ghana',exact:true}).evaluate(el=>el.addEventListener('click',e=>e.preventDefault()));await page.getByRole('link',{name:'Call Ghana',exact:true}).click();expect((await commands()).filter((v:unknown)=>Array.isArray(v)&&v[0]==='event').length).toBe(after);
  await page.goto('/admin/login');await expect(page.getByRole('button',{name:'Privacy choices',exact:true})).toHaveCount(0);expect(await page.locator('#strong-google-tag').count()).toBe(0);
  await mkdir('docs/visual-verification/ghana-launch',{recursive:true});await writeFile('docs/visual-verification/ghana-launch/consent.json',JSON.stringify({localTestIds:true,googleScriptStubbed:true,externalMeasurementRequestsSent:false,noTagBeforeConsent:true,essentialOnlyNoTag:true,analyticsEventsAfterOptIn:true,adConversionRequiresAdConsent:true,contactDataAndSearchTextExcluded:true,revocationStopsEvents:true,adminHasNoTag:true},null,2));
 }finally{await context.close();}
});
