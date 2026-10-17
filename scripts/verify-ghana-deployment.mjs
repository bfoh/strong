// Read-only production verification. The only POSTs contain invalid input and must be rejected before storage.
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const base=process.env.STRONG_VERIFY_URL||'https://strong-eta.vercel.app',directory='docs/visual-verification/ghana-launch';
const report={checkedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base,routes:{},browser:[],mutations:false,backendReady:true,issues:[]};
function check(condition,message){if(!condition)throw Error(message);}
await mkdir(directory,{recursive:true});
for(const route of ['/','/tv','/properties','/contact','/about','/book-viewing','/privacy','/sitemap.xml','/robots.txt','/campaign/tv-launch.svg']){
 const response=await fetch(base+route,{cache:'no-store'}),body=await response.text();report.routes[route]=response.status;check(response.status===200,route+' did not return 200');
 if(route==='/'){check(body.includes('Find Your Place')&&body.includes('in Ghana.'),'New Ghana homepage is missing');check(!body.includes('The Garden Residence'),'Legacy house root is still present');}
 if(route==='/properties' && body.includes('The collection is temporarily unavailable.')){report.backendReady=false;report.issues.push('Production Supabase configuration is missing or unavailable.');}
 if(route==='/contact' && !report.backendReady){report.contactFallbackVisible=body.includes('Online enquiries are temporarily unavailable.');}
 if(route==='/contact')check(body.includes('tel:+233546732018')&&body.includes('tel:+4916090882654')&&body.includes('https://wa.me/233546732018'),'Verified contacts missing');
 if(route==='/robots.txt' && /^Disallow: \/$/m.test(body)){report.backendReady=false;report.issues.push('Indexing remains disabled until production configuration is ready.');}
 if(route==='/sitemap.xml')check(body.includes(base+'/tv')&&!body.includes('/preview/house'),'Sitemap incorrect');
 if(route==='/campaign/tv-launch.svg')check(body===await readFile('public/campaign/tv-launch.svg','utf8'),'Deployed QR differs from the verified asset');
}
check((await fetch(base+'/preview/house')).status===404,'Private preview must return 404');
const restricted=await fetch(base+'/admin/marketing',{redirect:'manual'});check([302,303,307,308].includes(restricted.status)&&restricted.headers.get('location')?.includes('/admin/login'),'Reporting authorization missing');
const invalid=await fetch(base+'/api/house-enquiries',{method:'POST',headers:{origin:base,'content-type':'application/json','idempotency-key':randomUUID()},body:JSON.stringify({name:'',phone:''})});check(invalid.status===400,'Invalid submission was not rejected');
report.invalidSubmissionRejected=true;report.privatePreviewDenied=true;report.adminReportingProtected=true;report.deployedQrMatches=true;
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');const hero=page.locator('[data-hero]');await page.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-frame')==='1',null,{timeout:20000});
  const canonical=await page.locator('link[rel=canonical]').getAttribute('href');check(canonical&&new URL(canonical).href===new URL(base).href,'Wrong homepage canonical');
  const samples=[];for(const progress of [0,.25,.5,1,.25]){await hero.evaluate((el,p)=>scrollTo({top:p*(el.clientHeight-el.querySelector('.cine-stage').clientHeight),behavior:'instant'}),progress);const frame=Math.round(progress*450)+1;await page.waitForFunction(frame=>document.querySelector('[data-hero]')?.getAttribute('data-frame')===String(frame),frame,{timeout:20000});samples.push({progress,painted:await hero.getAttribute('data-frame')});}
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${directory}/production-${mobile?'mobile':'desktop'}.png`});
  await page.goto(base+'/tv');check(await page.locator('canvas').count()===0,'TV page must stay lightweight');await page.getByRole('link',{name:'Explore Properties ↗',exact:true}).click();await page.waitForURL(url=>url.pathname==='/properties'&&url.searchParams.get('utm_campaign')==='launch_oct2026',{timeout:20000});check(errors.length===0,'Browser errors');
  report.browser.push({device:mobile?'emulated mobile':'desktop',samples,canonicalVerified:true,noOverflow:true,tvHasNoCanvas:true,tvAttributionVerified:true,pageErrors:errors});await context.close();
 }
}finally{await browser.close();}
report.frontendVerified=true;report.launchStatus=report.backendReady?'Needs attention: inventory, SQL and business review':'Blocked: production Supabase configuration';
await writeFile(directory+'/production.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

if(!report.backendReady)process.exitCode=2;
