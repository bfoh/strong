'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import Link from '@/components/marketing/TrackedLink';
import { HERO_FRAME_COUNT, HeroFrameLoader, heroFrameForProgress, heroFrameUrl, heroVariants, type HeroVariant } from '@/lib/cinematic/heroFrames';

export default function CinematicHero({ staticOnly = false }: { staticOnly?: boolean }) {
  const section = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [variant,setVariant] = useState<HeroVariant | null>(null), [motion,setMotion] = useState(true), [failed,setFailed] = useState(false), [posterFallback,setPosterFallback] = useState(false);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const network = (navigator as Navigator & { connection?: EventTarget & {saveData?:boolean}; deviceMemory?: number }).connection;
    let optedOut=false;
    const choose = () => setVariant(!motion || optedOut || staticOnly || reduced.matches || network?.saveData ? null : innerWidth / innerHeight < .9 ? 'mobile' : 'desktop');
    try { const stored = localStorage.getItem('strong-hero-motion'); if (stored === 'off' || stored === null && localStorage.getItem('strong-house-motion') === 'off') {optedOut=true;setMotion(false);} } catch {}
    choose();reduced.addEventListener('change',choose);network?.addEventListener('change',choose);addEventListener('resize',choose);
    return () => {reduced.removeEventListener('change',choose);network?.removeEventListener('change',choose);removeEventListener('resize',choose);};
  },[motion,staticOnly]);
  useEffect(() => {
    const root=section.current,view=stage.current,element=canvas.current;
    if (!variant || failed || !root || !view || !element) return;
    const context=element.getContext('2d',{alpha:false});if(!context){setFailed(true);return;}
    const source=heroVariants[variant], mobile=variant==='mobile';
    let raf=0,target=0,requested=-1,painted=-1,errors=0,disposed=false;
    const loader=new HeroFrameLoader(index=>heroFrameUrl(variant,index),HERO_FRAME_COUNT,{
      capacity:mobile?10:16,concurrency:mobile?2:3,stride:1,
      onFrame:()=>{if(!raf&&!disposed)raf=requestAnimationFrame(render);},
      onFailure:index=>{if(!disposed && (index===0 || ++errors>=3))setFailed(true);},
    });
    function render(){
      raf=0;if(disposed)return;
      const distance=Math.max(1,root!.offsetHeight-view!.clientHeight);
      target=Math.max(0,Math.min(1,-root!.getBoundingClientRect().top/distance));
      const index=heroFrameForProgress(target);
      if(index!==requested){const direction=index-requested;requested=index;loader.request(index,direction);}
      const exact=loader.get(index),frame=exact?{index,frame:exact}:loader.nearest(index);
      if(frame && frame.index!==painted){
        const scale=Math.max(element!.width/source.width,element!.height/source.height),width=source.width*scale,height=source.height*scale;
        context!.drawImage(frame.frame,(element!.width-width)/2,(element!.height-height)/2,width,height);
        painted=frame.index;view!.dataset.ready='true';
      }
      root!.dataset.requested=String(index+1);root!.dataset.frame=String(painted+1);root!.dataset.progress=target.toFixed(4);
      view!.style.setProperty('--p',String(target));
      const stats=loader.stats();root!.dataset.decoded=String(stats.decoded);root!.dataset.inflight=String(stats.inflight);
    }
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(render);};
    const size=()=>{
      const bounds=view.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.5);
      const width=Math.max(1,Math.round(bounds.width*dpr)),height=Math.max(1,Math.round(bounds.height*dpr));
      if(element.width!==width||element.height!==height){element.width=width;element.height=height;painted=-1;}
      context.imageSmoothingQuality='high';schedule();
    };
    let near=true;
    const visibility=()=>loader.setPaused(!near||document.hidden);
    const intersection=new IntersectionObserver(([entry])=>{near=entry.isIntersecting;visibility();},{rootMargin:'50% 0px'});intersection.observe(root);
    const observer=new ResizeObserver(size);observer.observe(view);
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',size);document.addEventListener('visibilitychange',visibility);size();
    return()=>{disposed=true;cancelAnimationFrame(raf);loader.dispose();observer.disconnect();intersection.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',size);document.removeEventListener('visibilitychange',visibility);delete view.dataset.ready;};
  },[variant,failed]);
  const enabled=Boolean(variant&&!failed);
  function toggle(){const next=!motion;setMotion(next);setFailed(false);try{localStorage.setItem('strong-hero-motion',next?'on':'off');}catch{}}
  return <section ref={section} className="cine ghana-hero" data-hero data-motion={enabled?'sequence':'static'} aria-labelledby="hero-title"><div ref={stage} className="cine-stage" data-phase="intro">
    <picture className="cine-poster"><source media="(max-aspect-ratio: 9/10)" srcSet={posterFallback?'/images/house-v1/exterior-mobile.webp':heroFrameUrl('mobile',0)}/><img src={posterFallback?'/images/house-v1/exterior-desktop.webp':heroFrameUrl('desktop',0)} alt="" width={1280} height={720} fetchPriority="high" decoding="async" onError={()=>{setPosterFallback(true);setFailed(true);}}/></picture>
    <canvas ref={canvas} className="cine-canvas" aria-hidden="true"/><div className="cine-scrim" aria-hidden="true"/>
    <div className="cine-intro"><p className="cine-eyebrow"><span/>GHANA · AT HOME, AND ABROAD</p><h1 id="hero-title">Find Your Place <em>in Ghana.</em></h1><p className="cine-lede">Discover homes, land and investment opportunities across Ghana, wherever in the world you call home.</p><div className="cine-actions"><Link className="btn btn-gold" href="/properties">Explore Properties <ArrowUpRight size={16} aria-hidden="true"/></Link><Link className="btn btn-ghost-light" href="/contact#enquiry">Make an Enquiry</Link></div><a className="hero-skip" href="#property-search" onClick={event=>{event.preventDefault();document.getElementById('property-search')?.scrollIntoView({behavior:'instant'});document.getElementById('property-search-title')?.focus({preventScroll:true});history.replaceState(null,'','#property-search');}}>Skip to property search <ArrowDown size={14}/></a></div>
    <div className="hero-bottom"><p>Concept architectural film · Illustrative, not a sale listing</p><span className="hero-scroll" aria-hidden="true">{enabled?'SCROLL TO EXPLORE':'YOUR NEXT CHAPTER STARTS HERE'}</span><button type="button" onClick={toggle} aria-pressed={enabled}>{enabled?<Pause size={13}/>:<Play size={13}/>} Motion {enabled?'on':'off'}</button></div>
  </div></section>;
}
