import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const [profile,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();
  try{
   await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:3000');await page.locator('#architecture').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#architecture')?.dataset.sequenceMode==='sequence');
   await page.evaluate(()=>{window.__sequenceBench={blockingMs:0,longTasks:0,shifts:0};window.__sequenceObservers=[new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__sequenceBench.blockingMs+=Math.max(0,e.duration-50);window.__sequenceBench.longTasks++;}}),new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__sequenceBench.shifts+=e.value;})];window.__sequenceObservers[0].observe({type:'longtask'});window.__sequenceObservers[1].observe({type:'layout-shift'});});
   const latency=[];
   for(const progress of [0,.25,.5,.75,1,.75,.5,.25,0]){
    const sample=await page.evaluate(p=>new Promise((resolve,reject)=>{
     const el=document.querySelector('#architecture'),sticky=el.querySelector('.sequence-sticky'),start=performance.now();
     scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('header').getBoundingClientRect().height+(el.clientHeight-sticky.clientHeight)*p,behavior:'instant'});
     const tick=()=>{if(performance.now()-start>15000){reject(Error('Seek timeout'));return;}if(Math.abs(Number(el.dataset.progress)-p)<.002&&el.dataset.requestedFrame===el.dataset.renderedFrame){resolve({progress:p,targetToDrawMs:Number((performance.now()-start).toFixed(1)),renderedFrame:Number(el.dataset.renderedFrame)});}else requestAnimationFrame(tick);};requestAnimationFrame(tick);
    }),progress);latency.push(sample);await page.waitForTimeout(150);
   }
   const metrics=await page.evaluate(()=>{window.__sequenceObservers.forEach(o=>o.disconnect());return {...window.__sequenceBench,cache:{peakFrames:Number(document.querySelector('#architecture').dataset.peakCachedFrames),peakDecodedBytes:Number(document.querySelector('#architecture').dataset.peakDecodedBytes)}};});
   results.push({profile,latency,...metrics});
  }finally{await context.close();}
 }
}finally{await browser.close();}
const directory='docs/visual-verification/cinematic-v3';await mkdir(directory,{recursive:true});
await writeFile(`${directory}/responsiveness.json`,JSON.stringify({methodology:'Isolated production Chrome software rendering; no Axe or recording in the measured interval. Browser performance.now from native scroll command to exact canvas draw, not physical display latency or certified INP. Local network, desktop1440x1000/mobile390x844 at DPR1. Forward and reverse steps with150ms pauses. Cached RGBA estimates exclude transient decodes, canvas and browser overhead.',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
