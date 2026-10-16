'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HERO_FRAME_COUNT, HeroFrameLoader, heroFrameForProgress, heroFrameUrl, heroVariants, warmOrder, type HeroVariant } from '@/lib/cinematic/heroFrames';

const chapters = [{ from: 0, name: 'Arrival' }, { from: .24, name: 'Living' }, { from: .48, name: 'Retreat' }, { from: .76, name: 'Return' }];
// Portrait viewports use the centred 4:5 crop; everything wider uses the native 16:9 frames.
const pickVariant = (): HeroVariant => innerWidth / innerHeight < .9 ? 'mobile' : 'desktop';

export default function CinematicHero() {
  const section = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), chapter = useRef<HTMLSpanElement>(null);
  const [variant, setVariant] = useState<HeroVariant | null>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const choose = () => setVariant(reduced.matches ? null : pickVariant());
    choose(); reduced.addEventListener('change', choose);
    const resize = () => { if (!reduced.matches) setVariant(pickVariant()); };
    addEventListener('resize', resize);
    return () => { reduced.removeEventListener('change', choose); removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const root = section.current, view = stage.current, element = canvas.current;
    const context = element?.getContext('2d', { alpha: false });
    if (!variant || !root || !view || !element || !context) return;
    const device = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const lite = Boolean(device.connection?.saveData || (device.deviceMemory && device.deviceMemory <= 2));
    const stride = lite ? 3 : 1, source = heroVariants[variant];
    let target = 0, current = 0, raf = 0, drawn = -1, requested = 0, chapterIndex = -1, warmed = false;

    const loader = new HeroFrameLoader(i => heroFrameUrl(variant, i), HERO_FRAME_COUNT, {
      capacity: lite ? 10 : variant === 'mobile' ? 18 : 24, concurrency: lite ? 2 : 4, stride,
      onFrame: () => { if (!raf) raf = requestAnimationFrame(tick); },
    });
    const draw = (frame: CanvasImageSource) => {
      const scale = Math.max(element.width / source.width, element.height / source.height);
      const w = source.width * scale, h = source.height * scale;
      context.drawImage(frame, (element.width - w) / 2, (element.height - h) / 2, w, h);
    };
    const render = () => {
      view.style.setProperty('--p', current.toFixed(4));
      view.dataset.phase = current < .15 ? 'intro' : current > .97 ? 'end' : 'journey';
      const index = heroFrameForProgress(current, HERO_FRAME_COUNT, stride);
      if (index !== requested) { loader.request(index, index - requested); requested = index; }
      const exact = loader.get(index), best = exact ? { index, frame: exact } : loader.nearest(index);
      if (best && best.index !== drawn) {
        draw(best.frame); drawn = best.index;
        if (!view.dataset.ready) {
          view.dataset.ready = 'true';
          if (!warmed) { warmed = true; setTimeout(() => loader.warm(warmOrder(HERO_FRAME_COUNT, stride)), 900); }
        }
      }
      root.dataset.frame = String(drawn + 1);
      const next = chapters.reduce((found, item, i) => current >= item.from ? i : found, 0);
      if (next !== chapterIndex && chapter.current) { chapterIndex = next; chapter.current.textContent = chapters[next].name; }
    };
    function tick() {
      raf = 0;
      const diff = target - current;
      current = Math.abs(diff) < .0005 ? target : current + diff * .2;
      render();
      if (current !== target) raf = requestAnimationFrame(tick);
    }
    const measure = () => {
      const bounds = root.getBoundingClientRect(), distance = root.offsetHeight - innerHeight;
      target = distance > 0 ? Math.max(0, Math.min(1, -bounds.top / distance)) : 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const size = () => {
      const bounds = element.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.max(1, Math.round(bounds.width * dpr)); element.height = Math.max(1, Math.round(bounds.height * dpr));
      context.imageSmoothingQuality = 'high'; drawn = -1; measure();
    };
    const resizer = new ResizeObserver(size); resizer.observe(element);
    // Stop fetching while the hero is far off-screen or the tab is hidden; resume where it left off.
    let near = true;
    const hidden = () => loader.setPaused(!near || document.hidden);
    const visibility = new IntersectionObserver(([entry]) => { near = entry.isIntersecting; hidden(); }, { rootMargin: '100% 0px' });
    visibility.observe(root);
    addEventListener('scroll', measure, { passive: true }); document.addEventListener('visibilitychange', hidden);
    measure(); current = target; loader.request(requested = heroFrameForProgress(target, HERO_FRAME_COUNT, stride), 1);
    return () => {
      cancelAnimationFrame(raf); resizer.disconnect(); visibility.disconnect();
      removeEventListener('scroll', measure); document.removeEventListener('visibilitychange', hidden);
      loader.dispose(); delete view.dataset.ready;
    };
  }, [variant]);

  return <section ref={section} className="cine" data-hero data-motion={variant ? 'sequence' : undefined} aria-labelledby="hero-title">
    <div ref={stage} className="cine-stage" data-phase="intro">
      <picture className="cine-poster">
        <source media="(max-aspect-ratio: 9/10)" srcSet={heroFrameUrl('mobile', 0)}/>
        {/* The first supplied frame paints with the HTML; the canvas takes over once frames decode. */}
        <img src={heroFrameUrl('desktop', 0)} alt="" width={1280} height={720} fetchPriority="high" decoding="async"/>
      </picture>
      <canvas ref={canvas} className="cine-canvas" aria-hidden="true"/>
      <div className="cine-scrim" aria-hidden="true"/>
      <div className="cine-intro">
        <p className="cine-eyebrow"><span aria-hidden="true"/>KUMASI · GHANA</p>
        <h1 id="hero-title"><span className="cine-line"><span>Spaces Worth</span></span>{' '}<span className="cine-line"><span><em>Living For.</em></span></span></h1>
        <p className="cine-lede">Discover exceptional land, residences and investment opportunities with Strong Properties.</p>
        <div className="cine-actions">
          <Link className="btn btn-gold" href="/properties">Explore Properties <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link className="btn btn-ghost-light" href="/book-viewing">Book a Viewing</Link>
        </div>
      </div>
      <div className="cine-captions" aria-hidden="true">
        <p className="cine-caption cine-caption-a"><span>Living</span>Spaces shaped around<br/>the way you <em>live.</em></p>
        <p className="cine-caption cine-caption-b"><span>Retreat</span>Every detail,<br/><em>considered.</em></p>
        <p className="cine-caption cine-caption-c">Now, find the space<br/><em>that’s yours.</em></p>
      </div>
      <div className="cine-cue" aria-hidden="true"><span className="cine-cue-line"/>Scroll to enter</div>
      <div className="cine-progress" aria-hidden="true">
        <span ref={chapter} className="cine-chapter">Arrival</span>
        <span className="cine-track"><span/></span>
      </div>
      <p className="cine-provenance">Conceptual architectural visualisation · Not a property listing</p>
    </div>
  </section>;
}
