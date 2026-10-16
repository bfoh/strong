import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const path=process.argv[2],output=process.argv[3];
if(!path||!output)throw Error('Usage: node scripts/inspect-local-reference-video.mjs VIDEO OUTPUT_DIRECTORY');
const bytes=await readFile(path);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.route('https://reference-video.test/**',async route=>{
  if(new URL(route.request().url()).pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="margin:0"><video id="video" muted preload="metadata" style="width:1280px;height:720px" src="/video.mp4"></video></body></html>'});
  const range=route.request().headers().range;
  const match=range?.match(/bytes=(\d+)-(\d*)/);const start=match?Number(match[1]):0,end=match?.[2]?Math.min(bytes.length-1,Number(match[2])):bytes.length-1;
  return route.fulfill({status:match?206:200,headers:{'content-type':'video/mp4','accept-ranges':'bytes','content-length':String(end-start+1),...(match?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})},body:bytes.subarray(start,end+1)});
 });
 await page.goto('https://reference-video.test/');
 await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
 const metadata=await page.locator('video').evaluate(v=>({durationSeconds:v.duration,width:v.videoWidth,height:v.videoHeight,decoder:'Installed Chrome; local file bytes only; no upload'}));
 await writeFile(`${output}/browser-metadata.json`,JSON.stringify(metadata,null,2)+'\n');
 const frames=[];
 for(let seconds=0;seconds<metadata.durationSeconds;seconds+=20){
  const data=await page.evaluate(async time=>{
   const v=document.querySelector('video');if(Math.abs(v.currentTime-time)>.001)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Seek timeout')),15000);v.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});v.currentTime=time;});
   await new Promise(resolve=>{if(v.readyState>=2)resolve();else v.addEventListener('loadeddata',resolve,{once:true});});
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/jpeg',.9);
  },seconds);
  const file=`frame-${String(seconds).padStart(5,'0')}.jpg`;await writeFile(`${output}/${file}`,Buffer.from(data.split(',')[1],'base64'));frames.push({seconds,file});
 }
 await writeFile(`${output}/sampled-frames.json`,JSON.stringify(frames,null,2)+'\n');console.log(`Decoded ${frames.length} local frames across ${metadata.durationSeconds.toFixed(2)} seconds.`);
}finally{await browser.close();}
