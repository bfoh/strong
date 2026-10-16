import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', dir='docs/visual-verification/cinematic-v3';
await mkdir(dir,{recursive:true});
const report={checkedAt:new Date().toISOString(),base,assetQuality:'temporary-camera-blocking-not-photorealistic',checks:[],profiles:[],finalVisualGate:'blocked-no-licensed-scene-or-Blender'};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const check=(value,message)=>{if(!value)throw Error(message);};
async function test(name,run){try{await run();report.checks.push({name,status:'passed'});console.log(`PASS: ${name}`);}catch(error){report.checks.push({name,status:'failed',message:error.message});console.log(`FAIL: ${name}: ${error.message}`);}}
async function position(page,p){await page.locator('#architecture').evaluate((el,p)=>{const sticky=el.querySelector('.sequence-sticky');const start=el.getBoundingClientRect().top+scrollY-document.querySelector('header').getBoundingClientRect().height;scrollTo({top:start+(el.clientHeight-sticky.clientHeight)*p,behavior:'instant'});},p);await page.waitForFunction(p=>Math.abs(Number(document.querySelector('#architecture')?.dataset.progress)-p)<.002,p,{timeout:10000});}
async function ready(page){await page.waitForFunction(()=>{const el=document.querySelector('#architecture');return el?.dataset.sequenceMode==='sequence'&&el.dataset.requestedFrame===el.dataset.renderedFrame;},null,{timeout:30000});}
async function frame(page){return page.locator('#architecture').evaluate(el=>({progress:Number(el.dataset.progress),requested:Number(el.dataset.requestedFrame),rendered:Number(el.dataset.renderedFrame),count:Number(el.dataset.frameCount),cachedFrames:Number(el.dataset.cachedFrames),peakCachedFrames:Number(el.dataset.peakCachedFrames),decodedBytes:Number(el.dataset.decodedBytes),peakDecodedBytes:Number(el.dataset.peakDecodedBytes),budget:Number(el.dataset.maxDecodedBytes),inFlight:Number(el.dataset.inFlight),canvasBytes:el.querySelector('canvas').width*el.querySelector('canvas').height*4}));}
function hash(data){return createHash('sha256').update(data).digest('hex');}
try{
 for(const [profile,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await test(`${profile}: forward, reverse, rapid, keyboard, layout and accessibility`,async()=>{
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{window.__sequenceMetrics={shifts:0,blockingMs:0};new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__sequenceMetrics.shifts+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.__sequenceMetrics.blockingMs+=Math.max(0,e.duration-50);}).observe({type:'longtask',buffered:true});});
   try{
    await page.goto(base);await page.locator('#architecture').scrollIntoViewIfNeeded();await ready(page);
    const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
    const heapBefore=(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
    const samples=[];let forwardHash;
    for(const p of [0,.25,.5,.75,1]){
     const start=performance.now();await position(page,p);await ready(page);const responseMs=Math.round(performance.now()-start);const measured=await frame(page);
     check(measured.requested===Math.round(measured.progress*(measured.count-1))&&measured.rendered===measured.requested,'Scroll frame mapping mismatch');
     check(measured.peakCachedFrames<=(profile==='mobile'?8:12)&&measured.peakDecodedBytes<=measured.budget,'Cache budget exceeded');
     await page.screenshot({path:`${dir}/${profile}-${String(p*100).padStart(3,'0')}.png`});
     if(p===.25)forwardHash=hash(await page.locator('canvas.sequence-canvas').evaluate(el=>el.toDataURL()));
     samples.push({requestedProgress:p,...measured,responseMs});
    }
    await position(page,.25);await ready(page);const reverseHash=hash(await page.locator('canvas.sequence-canvas').evaluate(el=>el.toDataURL()));check(forwardHash===reverseHash,'Reverse frame pixels differ');
    await page.screenshot({path:`${dir}/${profile}-reverse-025.png`});
    for(const p of [.95,.03,.8,.1,1,.5,.25])await position(page,p);
    await ready(page);check((await frame(page)).rendered===Math.round((await frame(page)).progress*((await frame(page)).count-1)),'Rapid scroll did not settle on exact frame');
    const button=page.getByRole('button',{name:'Reveal',exact:true});await button.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>{const p=Number(document.querySelector('#architecture')?.dataset.progress);return p>=.345&&p<.355;},null,{timeout:10000});await ready(page);check((await frame(page)).progress>=.345,'Keyboard stage control failed');
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();check(axe.violations.length===0,`Accessibility violations: ${axe.violations.map(v=>v.id).join(',')}`);
    if(profile==='desktop' && process.env.RECORD_CINEMATIC==='1'){
     await page.evaluate(()=>{const original=document.querySelector('canvas.sequence-canvas');const recordingCanvas=document.createElement('canvas');recordingCanvas.width=320;recordingCanvas.height=200;const ctx=recordingCanvas.getContext('2d');const timer=setInterval(()=>ctx.drawImage(original,0,0,320,200),125);const stream=recordingCanvas.captureStream(8);const chunks=[];window.__sequenceRecording=new Promise(resolve=>{const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:220000});window.__sequenceRecorder=recorder;recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.start();});});
     for(const p of [...Array.from({length:31},(_,i)=>i/30),...Array.from({length:30},(_,i)=>1-(i+1)/30)]){await position(page,p);await ready(page);await page.waitForTimeout(50);}
     const video=await page.evaluate(async()=>{window.__sequenceRecorder.stop();return await Promise.race([window.__sequenceRecording,new Promise((_,reject)=>setTimeout(()=>reject(Error('Optional recording export timed out')),15000))]);});await writeFile(`${dir}/scroll-sequence-forward-reverse.webm`,Buffer.from(video.split(',')[1],'base64'));
    }
    const heapAfter=(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
    const memory=await frame(page),metrics=await page.evaluate(()=>window.__sequenceMetrics);
    for(const [selector,name] of [['.hero-v2','hero'],['#collection','discovery'],['#possibilities','categories'],['#featured-properties','featured'],['.kumasi-v2','kumasi'],['.philosophy-v2','philosophy'],['.closing-v2','closing']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).evaluate(async el=>{for(const image of el.querySelectorAll('img'))await image.decode().catch(()=>{});});await page.waitForTimeout(350);await page.screenshot({path:`${dir}/${profile}-${name}.png`});}
    await position(page,.5);await ready(page);await page.getByRole('link',{name:'Skip to Properties',exact:true}).click();await page.waitForFunction(()=>{const rect=document.querySelector('#collection').getBoundingClientRect();return rect.top<innerHeight&&rect.bottom>0;});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');check(errors.length===0,`Browser errors: ${errors.join(';')}`);
    report.profiles.push({profile,frames:samples,reversePixelMatch:true,rapidScroll:true,keyboard:true,axeViolations:axe.violations.length,errors,metrics,memory:{...memory,jsHeapBefore:heapBefore,jsHeapAfter:heapAfter,note:'Heap is CDP JS heap, not total process memory. Decoded cache RGBA is estimated from dimensions; two transient decodes and canvas are additional.'}});
   }finally{await context.close();}
  });
 }
 await test('reduced motion: still poster, no frame downloads, no extended sticky range',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});let frames=0;page.on('request',r=>{if(/frame-\d+\.webp/.test(r.url()))frames++;});try{await page.goto(base);await page.locator('#architecture').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#architecture')?.dataset.sequenceMode==='reduced-motion');check(await page.locator('canvas.sequence-canvas').count()===0,'Reduced motion mounted a canvas');check(frames===0,'Reduced motion fetched animation frames');check(await page.locator('#architecture').evaluate(el=>el.clientHeight<innerHeight),'Reduced motion reserved an oversized section');await page.screenshot({path:`${dir}/reduced-motion.png`});}finally{await page.close();}
 });
 await test('failed frame: visible poster, collapsed fallback, catalogue accessible',async()=>{
  const page=await browser.newPage();await page.route('**/cinematic/**/frame-*.webp',route=>route.fulfill({status:404,body:'Missing test frame'}));try{await page.goto(base);await page.locator('#architecture').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#architecture')?.dataset.sequenceMode==='error');check(await page.locator('canvas.sequence-canvas').count()===0,'Failure canvas remained');check(await page.locator('.sequence-poster img').evaluate(el=>el.complete&&el.naturalWidth>0),'Fallback poster missing');await page.screenshot({path:`${dir}/failed-frame.png`});await page.getByRole('link',{name:'Skip to Properties',exact:true}).click();check(await page.locator('#collection').isVisible(),'Property discovery inaccessible');}finally{await page.close();}
 });
 await test('slow network: loading poster and exact target after decode',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();try{const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:350,downloadThroughput:100000,uploadThroughput:50000});await page.goto(base);await page.locator('#architecture').scrollIntoViewIfNeeded();await ready(page);const start=performance.now();await position(page,.9);await ready(page);report.slowNetwork={latencyMs:350,downloadMbps:.8,responseMs:Math.round(performance.now()-start),frame:await frame(page)};await page.screenshot({path:`${dir}/slow-network.png`});}finally{await context.close();}
 });
 await test('short landscape and narrow mobile controls fit',async()=>{
  const page=await browser.newPage();try{for(const [width,height]of[[844,390],[568,320],[320,740]]){await page.setViewportSize({width,height});await page.goto(base);await page.locator('#architecture').scrollIntoViewIfNeeded();await ready(page);await position(page,.5);await ready(page);const fit=await page.locator('.sequence-bottom').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});check(fit,`Controls clipped at ${width}x${height}`);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Narrow overflow');await page.screenshot({path:`${dir}/viewport-${width}x${height}.png`});}}finally{await page.close();}
 });
 await test('no JavaScript: poster and native catalogue links remain usable',async()=>{
  const page=await browser.newPage({javaScriptEnabled:false});try{await page.goto(base);check(await page.locator('canvas.sequence-canvas').count()===0,'No-JS canvas rendered');await page.locator('#architecture').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const img=document.querySelector('.sequence-poster img');return img.complete&&img.naturalWidth>0;});check(await page.locator('.sequence-poster img').evaluate(el=>el.complete&&el.naturalWidth>0),'No-JS poster missing');await page.getByRole('link',{name:'Skip to Properties',exact:true}).click();check(await page.locator('#collection').isVisible(),'No-JS skip failed');}finally{await page.close();}
 });
}finally{await browser.close();report.passed=report.checks.every(c=>c.status==='passed');await writeFile(`${dir}/verification.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
