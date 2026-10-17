import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome'}),report={conditions:{browser:'installed Chrome',server:'local production build',mobile:'390x844, DPR 2, 150ms RTT, 3Mbps down / 750Kbps up, CPU 4x slowdown',desktop:'1440x900, DPR 1, unthrottled',samples:3,fieldData:false,physicalIOS:false},samples:[]};
try{
 for(const mobile of [true,false])for(let sample=1;sample<=3;sample++){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});if(mobile){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:375000,uploadThroughput:93750});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  await page.addInitScript(()=>{window.__measure={lcp:0,cls:0,longTasks:[]};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__measure.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__measure.cls+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{window.__measure.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:true});});
  await page.goto(base+'/');await page.locator('[data-hero][data-frame="1"]').waitFor();await page.waitForTimeout(1500);
  const startup=await page.evaluate(()=>{const r=performance.getEntriesByType('resource');return {...window.__measure,imageBytes:r.filter(r=>r.initiatorType==='img'||/frame_\d/.test(r.name)).reduce((s,r)=>s+r.encodedBodySize,0),totalEncodedBytes:r.reduce((s,r)=>s+r.encodedBodySize,0),frameFiles:r.filter(r=>/frame_\d/.test(r.name)).length,decoded:Number(document.querySelector('[data-hero]').getAttribute('data-decoded')),jsHeapUsed:performance.memory?.usedJSHeapSize||null};});
  const seeks=[];for(const progress of [.25,.5,.75,1,.5,0]){const start=Date.now();await page.locator('[data-hero]').evaluate((el,p)=>scrollTo({top:p*(el.clientHeight-el.querySelector('.cine-stage').clientHeight),behavior:'instant'}),progress);await page.waitForFunction(frame=>document.querySelector('[data-hero]')?.getAttribute('data-frame')===String(frame),Math.round(progress*450)+1,{timeout:15000});seeks.push({progress,settleMs:Date.now()-start});}
  const cache=await page.locator('[data-hero]').evaluate(el=>({decoded:Number(el.dataset.decoded),inflight:Number(el.dataset.inflight)}));
  report.samples.push({device:mobile?'mobile':'desktop',sample,startup,seeks,cache});await context.close();
 }
 await mkdir('docs/visual-verification/ghana-launch',{recursive:true});await writeFile('docs/visual-verification/ghana-launch/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
