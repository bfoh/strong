import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='docs/visual-verification/ghana-launch';
test('Ghana homepage, TV campaign, catalogue and verified contacts render on deployed hosts',async({request},info)=>{
 test.skip(info.project.name!=='desktop');
 for(const path of ['/','/tv','/properties','/contact','/about','/book-viewing']) {
  const response=await request.get(path,{headers:{Host:'strong-properties.example'}});expect(response.status(),path).toBe(200);
  const html=await response.text();expect(html).not.toMatch(/(?:property="og:image"|rel="canonical")[^>]*(?:127\.0\.0\.1|localhost|strong-properties\.example)/);
  if(path==='/'){expect(html).toContain('Find Your Place');expect(html).toContain('in Ghana.');expect(html).not.toContain('The Garden Residence');}
  if(path==='/contact'){expect(html).toContain('+233546732018');expect(html).toContain('+4916090882654');expect(html).toContain('https://wa.me/233546732018');}
 }
 expect((await request.get('/locations/ashanti')).status()).toBe(404); // no approved inventory in the current live database
 expect((await request.get('/preview/house',{headers:{Host:'strong-properties.example'}})).status()).toBe(404);
 const map=await request.get('/sitemap.xml');expect(map.status()).toBe(200);expect(await map.text()).toContain('/tv');
});
test('hero pins, paints exact forward and reverse frames, remains bounded and never downloads the full sequence',async({page},info)=>{
 await mkdir(dir,{recursive:true});const frames=new Set<string>();page.on('request',r=>{if(/frame_\d+\.webp/.test(r.url()))frames.add(r.url());});
 await page.goto('/');const hero=page.locator('[data-hero]');await expect(hero).toHaveAttribute('data-motion','sequence');
 await expect(hero).toHaveAttribute('data-frame','1');
 const evidence=[];let quarter='';
 for(const p of [0,.25,.5,.75,1,.75,.5,.25,0]){
  await hero.evaluate((el,p)=>{const stage=el.querySelector('.cine-stage')!;window.scrollTo({top:el.getBoundingClientRect().top+scrollY+p*(el.clientHeight-stage.clientHeight),behavior:'instant'});},p);
  const expected=String(Math.round(p*450)+1);await expect(hero).toHaveAttribute('data-requested',expected);await expect(hero).toHaveAttribute('data-frame',expected);
  const value=await hero.evaluate(el=>{const c=el.querySelector('canvas')!;const v=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(let i=0;i<v.length;i+=37)hash=Math.imul(hash^v[i],16777619);return {frame:el.getAttribute('data-frame'),requested:el.getAttribute('data-requested'),cache:Number(el.getAttribute('data-decoded')),inflight:Number(el.getAttribute('data-inflight')),top:el.querySelector('.cine-stage')!.getBoundingClientRect().top,hash:String(hash)};});
  expect(value.top).toBeCloseTo(0,0);expect(value.cache).toBeLessThanOrEqual(info.project.name==='mobile'?10:16);expect(value.inflight).toBeLessThanOrEqual(info.project.name==='mobile'?2:3);
  if(p===.25){if(quarter)expect(value.hash).toBe(quarter);else quarter=value.hash;}
  if(evidence.length<5)await page.screenshot({path:`${dir}/${info.project.name}-frame-${expected}.png`});evidence.push({progress:p,...value});
 }
 // Fast alternating seeks exercise request cancellation and settle on the target.
 await hero.evaluate(el=>{const d=el.clientHeight-el.querySelector('.cine-stage')!.clientHeight;for(const p of [1,0,.8,.1,.7,.2])window.scrollTo(0,p*d);});
 await expect(hero).toHaveAttribute('data-frame','91');
 expect(frames.size).toBeLessThan(120);
 await writeFile(`${dir}/${info.project.name}-scroll.json`,JSON.stringify({samples:evidence,requestedFrameFiles:frames.size},null,2));
 await page.getByRole('link',{name:'Skip to property search'}).click();await expect(page.locator('#property-search-title')).toBeFocused();await expect(page.locator('#property-search input[name=q]')).toBeInViewport();for(let i=0;i<8 && !await page.getByRole('button',{name:'Find a property'}).evaluate(el=>el===document.activeElement);i++)await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Find a property'})).toBeFocused();await expect(page.getByRole('button',{name:'Find a property'})).toBeInViewport();
});
test('responsive layouts and navigation remain usable on narrow, short, tablet and desktop screens',async({page},info)=>{
 test.skip(info.project.name!=='desktop');test.setTimeout(120000);
 const sizes=[[320,568],[390,844],[844,390],[768,1024],[1280,800],[1920,1080]];
 for(const [width,height]of sizes){await page.setViewportSize({width,height});await page.goto('/');await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}x${height}`).toBe(true);
  await expect(page.locator('.cine-actions a').first()).toBeInViewport();await expect(page.locator('.cine-actions')).toHaveCSS('opacity','1');const actions=await page.locator('.cine-actions').boundingBox(),skip=await page.locator('.hero-skip').boundingBox();expect(skip!.y).toBeGreaterThanOrEqual(actions!.y+actions!.height);
  await page.screenshot({path:`${dir}/viewport-${width}x${height}.png`});
  for(const section of ['#property-search','.launch-collection','.ghana-discovery','.launch-contact']){await page.locator(section).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section).toBe(true);}
 }
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('dialog',{name:'Navigation'})).toBeVisible();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Residential'}).click();await expect(page).toHaveURL(/category=residential/);await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('reduced motion, save data, failed assets and no JavaScript retain a compact usable hero',async({browser},info)=>{
 test.skip(info.project.name!=='desktop');test.setTimeout(90000);
 for(const mode of ['reduced','save-data','failed','no-js']){
  const context=await browser.newContext({viewport:{width:390,height:844},...(mode==='reduced'?{reducedMotion:'reduce' as const}:{}),javaScriptEnabled:mode!=='no-js'});
  if(mode==='save-data')await context.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,addEventListener(){},removeEventListener(){}}}));
  if(mode==='failed')await context.route('**/cinematic/hero/**/frame_*.webp',route=>route.fulfill({status:404}));
  const page=await context.newPage();await page.goto('/');await expect(page.locator('[data-hero]')).toHaveAttribute('data-motion','static');
  expect(await page.locator('[data-hero]').evaluate(el=>el.clientHeight)).toBeLessThanOrEqual(844);
  await expect(page.getByRole('link',{name:/Explore Properties/}).first()).toBeVisible();await page.screenshot({path:`${dir}/fallback-${mode}.png`});await context.close();
 }
});
test('TV attribution survives catalogue navigation and submitted optional buyer preferences; form failures preserve entries',async({page},info)=>{
 await page.goto('/tv');expect(await page.locator('canvas').count()).toBe(0);
 await page.getByRole('link',{name:'Explore Properties ↗',exact:true}).click();await expect(page).toHaveURL(/utm_source=tv/);
 await page.getByRole('link',{name:'Contact',exact:true}).first().click();await expect(page).toHaveURL(/utm_campaign=launch_oct2026/);
 const form=page.locator('.general-enquiry');await form.getByLabel('YOUR NAME',{exact:true}).fill('Ghana launch browser QA');await form.getByLabel('PHONE NUMBER',{exact:true}).fill('+000 000 111 222');
 await form.getByLabel('COUNTRY OF RESIDENCE').fill('Germany');await form.locator('select[name=preferredContact]').selectOption('whatsapp');await form.locator('input[name=remoteViewing]').check();
 let payload:Record<string,unknown>={};await page.route('**/api/house-enquiries',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:503,json:{error:'Synthetic failure for browser verification'}});});
 await form.getByRole('button',{name:'Send my enquiry'}).click();await expect(form.getByRole('alert')).toContainText('Synthetic failure');await expect(form.getByLabel('YOUR NAME',{exact:true})).toHaveValue('Ghana launch browser QA');
 expect(payload.attribution).toEqual({utm_source:'tv',utm_medium:'broadcast',utm_campaign:'launch_oct2026'});expect(payload.countryOfResidence).toBe('Germany');expect(payload.remoteViewing).toBe(true);expect(payload.preferredContact).toBe('whatsapp');
 await page.unroute('**/api/house-enquiries');await page.route('**/api/house-enquiries',route=>route.fulfill({status:201,json:{ok:true,status:'new'}}));await form.getByRole('button',{name:'Send my enquiry'}).click();await expect(form.getByRole('status')).toContainText('received');
 expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
 await page.screenshot({path:`${dir}/${info.project.name}-contact.png`});
});
