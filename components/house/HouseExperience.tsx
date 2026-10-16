'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Bath, ChevronLeft, ChevronRight, Menu, Pause, Play, X } from 'lucide-react';
import { photo, type HouseSettings, type HouseView, type HouseListing, type Room } from '@/lib/house/config';
import { clamp } from '@/lib/house/portal';
import VisualStage, { type VisualHandle } from './VisualStage';
import HouseBrand from './HouseBrand';
import HouseEnquiryForm from './HouseEnquiryForm';
const desktopQuery = '(min-width: 1100px) and (min-height: 600px) and (min-aspect-ratio: 3/2)';
const rooms: Room[] = ['listings', 'team', 'contact'];
const hashes: Record<HouseView, string> = { exterior: '#exterior', hallway: '#hallway', listings: '#listings', team: '#our-team', contact: '#contact', property: '#property' };
const roomHints: Record<Room, string> = { listings: 'Find a space of your own', team: 'Meet Strong Properties', contact: 'Begin a conversation' };
export default function HouseExperience({ settings, listings, requestId }: { settings: HouseSettings; listings: HouseListing[]; requestId: string }) {
  const [view, setView] = useState<HouseView>('exterior'), [ready, setReady] = useState(false), [desktop, setDesktop] = useState(false);
  const [motion, setMotion] = useState(settings.motion.enabled), [reduced, setReduced] = useState(false), [busy, setBusy] = useState(false), [menu, setMenu] = useState(false), [arrived, setArrived] = useState(false);
  const [visualFailed, setVisualFailed] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const failVisual = useCallback(() => setVisualFailed(true), []);
  const [selected, setSelected] = useState(listings[0]?.id || ''), [angle, setAngle] = useState(0), [filter, setFilter] = useState('all'), [interest, setInterest] = useState('');
  const [enquiryProperty, setEnquiryProperty] = useState('');
  const root = useRef<HTMLElement>(null), arrival = useRef<HTMLElement>(null), stage = useRef<VisualHandle>(null);
  const active = useRef<HouseView>('exterior'), animation = useRef(0), transition = useRef(false), progress = useRef(0);
  const positions = useRef<Record<string, number>>({}), abort = useRef<() => void>(() => {});
  const item = listings.find(p => p.id === selected) || listings[0];
  const photoIndex = item ? Math.min(angle, item.images.length - 1) : 0;
  const currentPhoto = item?.images[photoIndex];
  const canAnimate = desktop && motion && !reduced && !visualFailed && !saveData;
  const hashFor = useCallback((target: HouseView, id?: string) => hashes[target] + (target === 'property' ? '=' + encodeURIComponent(id || selected) : ''), [selected]);

  const navigate = useCallback((target: HouseView, options: { history?: boolean; back?: boolean; id?: string; immediate?: boolean } = {}) => {
    if (transition.current) abort.current();
    const from = active.current;
    if (target === from && !options.id) { setMenu(false); return; }
    const oldPosition = scrollY; positions.current[from] = oldPosition;
    if (options.id) { setSelected(options.id); if (options.id !== selected) setAngle(0); }
    setMenu(false);
    if (options.history !== false) {
      if (options.back && history.state?.houseFrom === target) { history.back(); return; }
      history.pushState({ houseView: target, houseFrom: from, propertyId: options.id || selected }, '', hashFor(target, options.id));
    }
    const complete = () => {
      transition.current = false; setBusy(false); active.current = target; setView(target);
      if (target !== 'exterior') { progress.current = 1; setArrived(true); }
      stage.current?.scene(target);
      requestAnimationFrame(() => {
        const restore = options.back || options.history === false ? positions.current[target] || 0 : 0;
        window.scrollTo({ top: restore, behavior: 'instant' });
        if (target === 'hallway' && rooms.includes(from as Room)) document.getElementById('door-' + from)?.focus({ preventScroll: true });
        else if (target === 'listings' && from === 'property') document.getElementById('house-listing-' + selected)?.focus({ preventScroll: true });
        else document.getElementById('view-' + target)?.focus({ preventScroll: true });
      });
    };
    const forwardRoom = from === 'hallway' && rooms.includes(target as Room) || from === 'exterior' && arrived && rooms.includes(target as Room);
    const reverseRoom = rooms.includes(from as Room) && target === 'hallway';
    const physical = !options.immediate && canAnimate && stage.current?.ready() && (forwardRoom || reverseRoom);
    const duration = options.immediate || reduced || !motion ? 0 : physical ? settings.motion.roomDuration : settings.motion.mobileDuration;
    if (!duration) { complete(); return; }
    transition.current = true; setBusy(true);
    abort.current = () => {
      cancelAnimationFrame(animation.current); transition.current = false; setBusy(false);
      stage.current?.scene(from === 'exterior' && arrived ? 'hallway' : from);
      requestAnimationFrame(() => window.scrollTo({ top: oldPosition, behavior: 'instant' }));
    };
    const started = performance.now();
    const tick = (now: number) => {
      const p = clamp((now - started) / duration);
      if (physical) stage.current?.door((forwardRoom ? target : from) as Room, reverseRoom ? 1 - p : p);
      if (p < 1) animation.current = requestAnimationFrame(tick); else complete();
    };
    animation.current = requestAnimationFrame(tick);
  }, [arrived, canAnimate, hashFor, motion, reduced, selected, settings.motion]);

  useEffect(() => {
    const large = matchMedia(desktopQuery), reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const network = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const measure = () => { setDesktop(large.matches); setReduced(reduce.matches); setSaveData(Boolean(network?.saveData)); };
    measure(); large.addEventListener('change', measure); reduce.addEventListener('change', measure);
    network?.addEventListener('change', measure);
    try { if (localStorage.getItem('strong-house-motion') === 'off') setMotion(false); } catch {}
    setReady(true);
    return () => { large.removeEventListener('change', measure); reduce.removeEventListener('change', measure); network?.removeEventListener('change', measure); cancelAnimationFrame(animation.current); };
  }, []);
  useEffect(() => {
    const visitHash = () => {
      const hash = location.hash.split('=')[0], target = (Object.keys(hashes) as HouseView[]).find(v => hashes[v] === hash) || (!hash ? 'exterior' : undefined);
      if (target && target !== active.current) {
        const id = target === 'property' ? decodeURIComponent(location.hash.split('=')[1] || '') : undefined;
        navigate(target, { history: false, immediate: true, id: id && listings.some(p => p.id === id) ? id : undefined });
      }
    };
    visitHash(); addEventListener('popstate', visitHash);
    return () => removeEventListener('popstate', visitHash);
  }, [navigate, listings]);
  useEffect(() => {
    if (view !== 'exterior' || !canAnimate) return;
    let frame = 0;
    const measure = () => {
      if (frame || transition.current) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const section = arrival.current; if (!section || transition.current) return;
        const distance = section.offsetHeight - innerHeight;
        const p = distance > 0 ? clamp(-section.getBoundingClientRect().top / distance) : 0;
        progress.current = p; stage.current?.arrival(p);
        root.current?.style.setProperty('--arrival-p', String(p));
        root.current?.setAttribute('data-arrival', p > .995 ? 'complete' : p > .12 ? 'moving' : 'start');
        setArrived(previous => previous === (p > .995) ? previous : p > .995);
      });
    };
    addEventListener('scroll', measure, { passive: true }); addEventListener('resize', measure); measure();
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', measure); removeEventListener('resize', measure); };
  }, [view, canAnimate]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (menu) setMenu(false); else if (transition.current) { abort.current(); history.replaceState({ houseView: active.current }, '', hashes[active.current]); } else if (view === 'property') navigate('listings', { back: true }); }
      if (view === 'property' && !/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName) && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') && item?.images.length) {
        event.preventDefault(); setAngle(i => (i + (event.key === 'ArrowRight' ? 1 : -1) + item.images.length) % item.images.length);
      }
    };
    addEventListener('keydown', keyboard); return () => removeEventListener('keydown', keyboard);
  }, [view, menu, item, navigate]);
  useEffect(() => { if (!transition.current) stage.current?.scene(view); }, [view, desktop, motion, reduced]);
  useEffect(() => {
    if (!ready || canAnimate) return;
    if (transition.current) abort.current();
    if (view === 'exterior' && progress.current > .05) navigate('hallway', { immediate: true });
  }, [ready, canAnimate, view, navigate]);

  const link = (target: HouseView, options?: Parameters<typeof navigate>[1]) => (event: React.MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); navigate(target, options); };
  const visible = (target: HouseView) => !ready || view === target;
  const poster = view === 'property' ? settings.images.listings : settings.images[view === 'exterior' ? 'exterior' : view as keyof HouseSettings['images']] || settings.images.hallway;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const enquiry = () => { if (item) { setInterest(item.demo ? 'I’m interested in a home like The Garden Residence.' : 'I’m interested in ' + item.title + '.'); setEnquiryProperty(item.demo ? '' : item.id); } navigate('contact'); };
  const toggleMotion = () => {
    const next = !(motion && !visualFailed); setMotion(next); if (next) setVisualFailed(false);
    try { localStorage.setItem('strong-house-motion', next ? 'on' : 'off'); } catch {}
    if (!next && view === 'exterior' && progress.current > .05) navigate('hallway', { immediate: true });
  };

  return <main id="main-content" ref={root} className="house-home" data-enhanced={ready} data-view={view} data-motion={canAnimate ? 'cinematic' : 'compact'} data-transition={busy} data-arrival={arrived ? 'complete' : 'start'} style={{ '--house-travel': settings.motion.scrollScreens, '--house-mobile-ms': settings.motion.mobileDuration + 'ms' } as React.CSSProperties}>
    <a className="house-skip" href="#listings" onClick={link('listings', { immediate: true })}>Skip animation and view listings</a>
    <header className="house-header">
      <HouseBrand onClick={link('exterior')}/>
      <nav className={menu ? 'house-nav is-open' : 'house-nav'} aria-label="Homepage navigation">
        {rooms.map(room => <a href={hashes[room]} key={room} onClick={link(room)} aria-current={view === room ? 'location' : undefined}>{settings.labels[room]}</a>)}
      </nav>
      <a className="house-header-action" href="#contact" onClick={event => { event.preventDefault(); setInterest('I’d like to arrange a property viewing.'); navigate('contact'); }}>Book a viewing <ArrowUpRight size={15} aria-hidden="true"/></a>
      <button type="button" className="house-menu" aria-expanded={menu} aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </header>
    <section ref={arrival} id="exterior" className="house-arrival" aria-label="Explore the Strong Properties residence">
      <div className="house-visual">
        <picture className="house-poster">
          <source media="(max-width: 1099px)" srcSet={photo(poster, 'mobile')}/>
          <img src={photo(poster)} alt="" width={1672} height={941} fetchPriority="high" decoding="async" style={{ objectPosition: settings.focus[view === 'property' ? 'listings' : view === 'exterior' ? 'exterior' : view as keyof HouseSettings['focus']].x + '% ' + settings.focus[view === 'property' ? 'listings' : view === 'exterior' ? 'exterior' : view as keyof HouseSettings['focus']].y + '%' }}/>
        </picture>
        <VisualStage ref={stage} settings={settings} enabled={canAnimate && ready} onFailure={failVisual}/>
        <div className="house-shade" aria-hidden="true"/>
        <div className="house-intro" hidden={ready && view !== 'exterior'}>
          <p className="house-eyebrow"><span/> STRONG PROPERTIES / KUMASI, GHANA</p>
          <h1 id="view-exterior" tabIndex={-1}>{settings.headline}</h1>
          <p className="house-introduction">{settings.introduction}</p>
          <div className="house-actions"><a className="house-button" href="#listings" onClick={link('listings')}>View listings <ArrowUpRight size={17} aria-hidden="true"/></a><a className="house-button is-light-outline" href="#contact" onClick={link('contact')}>Contact us</a></div>
          <a href="#hallway" className="house-mobile-explore" onClick={link('hallway')}>Explore the house <ArrowRight size={16} aria-hidden="true"/></a>
        </div>
        <div className="house-scroll-cue" aria-hidden="true"><span>SCROLL TO ENTER</span><ArrowDown size={17}/></div>
        <div id="hallway" className="house-hallway" hidden={ready && !(view === 'hallway' || view === 'exterior' && arrived)}>
          <div className="house-hallway-title"><p className="house-eyebrow">MAKE YOURSELF AT HOME</p><h2 id="view-hallway" tabIndex={-1}>Where would you like to begin?</h2></div>
          <div className="house-mobile-hall-photo"><img src={photo(settings.images.hallway, 'mobile')} alt="Three open walnut doors into a residential listings lounge, team lounge and contact lounge" width={960} height={540} loading="lazy"/></div>
          <div className="house-doors">{rooms.map((room, i) => <a id={'door-' + room} className={'house-door door-' + room} href={hashes[room]} onClick={link(room)} key={room}>
            <span className="house-door-index">0{i + 1}</span><span><strong>{settings.labels[room]}</strong><small>{roomHints[room]}</small></span><ArrowUpRight size={20} aria-hidden="true"/>
          </a>)}</div>
          <a className="house-return-outside" href="#exterior" onClick={link('exterior')}><ArrowLeft size={14} aria-hidden="true"/> Back outside</a>
        </div>
        <p className="house-scene-note">AI-created concept residence · Illustrative imagery</p>
      </div>
    </section>

    <section id="listings" hidden={!visible('listings')} className="house-room house-listings" aria-labelledby="view-listings" inert={ready && (view !== 'listings' || busy)}>
      <div className="house-room-panel">
        <a className="house-back" href="#hallway" onClick={link('hallway', { back: true })}><ArrowLeft size={16} aria-hidden="true"/> Back to hallway</a>
        <p className="house-eyebrow">01 / THE LISTINGS ROOM</p><h2 id="view-listings" tabIndex={-1}>{settings.listingTitle}</h2>
        <p className="house-room-lede">Explore land, homes and commercial spaces in Kumasi. Find what feels right, then let’s talk.</p>
        <div className="house-filters" role="group" aria-label="Filter properties">{['all', 'residential', 'land', 'commercial'].map(category => <button type="button" aria-pressed={filter === category} key={category} onClick={() => setFilter(category)}>{category === 'all' ? 'All spaces' : category === 'residential' ? 'Homes' : category}</button>)}</div>
        <div className="house-property-grid">{listings.filter(p => filter === 'all' || p.category === filter).map(p => <article className="house-card" key={p.id}>
          <a id={'house-listing-' + p.id} href={hashFor('property', p.id)} onClick={link('property', { id: p.id })} className="house-card-photo" aria-label={'Explore ' + p.title}>
            <img src={p.demo ? photo('exterior', 'thumb') : p.images[0]?.url} srcSet={p.demo ? photo('exterior', 'thumb') + ' 480w, ' + photo('exterior', 'gallery') + ' 960w' : undefined} sizes="(min-width:1100px) 55vw, 100vw" alt={p.demo ? 'AI-created example of a contemporary residence' : p.title} width={760} height={450} loading="lazy"/>
            <span className="house-card-badge">{p.demo ? 'ILLUSTRATIVE PROPERTY' : p.category.toUpperCase()}</span><span className="house-card-arrow"><ArrowUpRight size={22} aria-hidden="true"/></span>
          </a>
          <div className="house-card-copy"><p>{p.location}</p><h3><a href={hashFor('property', p.id)} onClick={link('property', { id: p.id })}>{p.title}</a></h3><div className="house-card-specs">{p.beds !== null && <span><BedDouble size={15} aria-hidden="true"/>{p.beds} beds</span>}{p.baths !== null && <span><Bath size={15} aria-hidden="true"/>{p.baths} baths</span>}{p.demo && <span>Sample specifications</span>}</div><div className="house-card-bottom"><span>{p.demo ? 'Demonstration only · not for sale' : p.price}</span><a href={hashFor('property', p.id)} onClick={link('property', { id: p.id })}>Explore <ArrowUpRight size={14} aria-hidden="true"/></a></div></div>
        </article>)}</div>
        {!listings.some(p => filter === 'all' || p.category === filter) && <div className="house-empty"><h3>A space for your next opportunity.</h3><p>There are no published {filter} listings in this selection. Tell us what you’re looking for.</p><a href="#contact" className="house-button is-dark" onClick={link('contact')}>Make an enquiry <ArrowUpRight size={15}/></a></div>}
        <div className="house-collection-foot"><p>The Garden Residence is an AI-created demonstration. Its example specifications are not verified inventory.</p><Link href="/properties">Browse the full published collection <ArrowUpRight size={15} aria-hidden="true"/></Link></div>
      </div>
    </section>

    <section id="property" className="house-property-view" hidden={!visible('property')} aria-labelledby="view-property" inert={ready && (view !== 'property' || busy)}>
      {item && <div className="house-gallery-shell">
        <a className="house-back" href="#listings" onClick={link('listings', { back: true })}><ArrowLeft size={16} aria-hidden="true"/> Back to listings</a>
        <div className="house-property-heading"><div><p className="house-eyebrow">{item.demo ? 'ILLUSTRATIVE PROPERTY / NOT FOR SALE' : item.location}</p><h2 id="view-property" tabIndex={-1}>{item.title}</h2></div><button className="house-button is-dark" type="button" onClick={enquiry}>{item.demo ? 'Enquire about a similar home' : 'Enquire / request a viewing'}<ArrowUpRight size={16} aria-hidden="true"/></button></div>
        <div className="house-gallery" tabIndex={0} role="group" aria-label="Exterior photographs. Use left and right arrow keys to change photographs." onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => {
          if (!touch.current || !item.images.length) return;
          const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) setAngle(i => (i + (dx < 0 ? 1 : -1) + item.images.length) % item.images.length);
          touch.current = null;
        }}>
          {currentPhoto ? <picture key={currentPhoto.url}>{item.demo && <source media="(max-width: 1099px)" srcSet={currentPhoto.url.replace('-desktop.webp', '-gallery.webp')}/>}<img src={currentPhoto.url} alt={currentPhoto.label + ' of ' + item.title + (item.demo ? ', AI-created concept' : '')} width={1672} height={941} loading="lazy" decoding="async"/></picture> : <p>Property photographs are being confirmed.</p>}
          {item.images.length > 1 && <><button type="button" className="house-gallery-prev" aria-label="Previous exterior angle" onClick={() => setAngle(i => (i - 1 + item.images.length) % item.images.length)}><ChevronLeft/></button><button type="button" className="house-gallery-next" aria-label="Next exterior angle" onClick={() => setAngle(i => (i + 1) % item.images.length)}><ChevronRight/></button></>}
        </div>
        <div className="house-angle-bar"><p aria-live="polite">{String(photoIndex + 1).padStart(2, '0')} / {String(item.images.length).padStart(2, '0')} — {currentPhoto?.label}</p><div role="group" aria-label="Choose an exterior photograph">{item.images.map((p, i) => <button type="button" key={p.url} aria-pressed={photoIndex === i} onClick={() => setAngle(i)}>{p.label}</button>)}</div></div>
        <div className="house-property-info"><div><p className="house-eyebrow">A CLOSER LOOK</p><h3>Space, considered.</h3><p>{item.description}</p>{!item.demo && <Link href={'/properties/' + item.slug}>Published property details <ArrowUpRight size={15}/></Link>}</div><dl>{item.facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl></div>
        <div className="house-viewer-footer"><a className="house-back" href="#hallway" onClick={link('hallway')}><ArrowLeft size={16}/> Back to hallway</a><button className="house-button is-dark" type="button" onClick={enquiry}>Start a conversation <ArrowUpRight size={16}/></button></div>
      </div>}
    </section>

    <section id="our-team" hidden={!visible('team')} className="house-room house-team" aria-labelledby="view-team" inert={ready && (view !== 'team' || busy)}>
      <div className="house-room-panel">
        <a className="house-back" href="#hallway" onClick={link('hallway', { back: true })}><ArrowLeft size={16}/> Back to hallway</a>
        <div className="house-mobile-room-photo"><img src={photo(settings.images.team, 'mobile')} alt="Illustrative professional smiling at a consultation table in the concept residence" width={960} height={540} loading="lazy"/></div>
        <p className="house-eyebrow">02 / THE TEAM ROOM</p><h2 id="view-team" tabIndex={-1}>{settings.teamTitle}</h2><p className="house-room-lede">{settings.teamDescription}</p>
        <div className="house-team-details"><div><span>01</span><h3>A home in mind.</h3><p>Explore residential property and discuss what matters to you.</p></div><div><span>02</span><h3>An opportunity ahead.</h3><p>Discover land and commercial property in Kumasi.</p></div><div><span>03</span><h3>A conversation first.</h3><p>Ask questions and arrange a viewing of a published property.</p></div></div>
        <p className="house-disclosure">Illustrative team portrait and award props. Your real portrait, biography and verified awards are awaiting details.</p>
        <a className="house-button is-dark" href="#contact" onClick={link('contact')}>Let’s talk about your plans <ArrowUpRight size={16}/></a>
      </div>
    </section>

    <section id="contact" hidden={!visible('contact')} className="house-room house-contact" aria-labelledby="view-contact" inert={ready && (view !== 'contact' || busy)}>
      <div className="house-room-panel">
        <a className="house-back" href="#hallway" onClick={link('hallway', { back: true })}><ArrowLeft size={16}/> Back to hallway</a>
        <div className="house-mobile-room-photo"><img src={photo(settings.images.contact, 'mobile')} alt="Walnut signing desk and cream chairs in the concept residence" width={960} height={540} loading="lazy"/></div>
        <p className="house-eyebrow">03 / THE CONTACT ROOM</p><h2 id="view-contact" tabIndex={-1}>{settings.contactTitle}</h2>
        <HouseEnquiryForm listings={listings} interest={interest} requestId={requestId} initialProperty={enquiryProperty}/>
      </div>
    </section>

    <footer className="house-footer"><span>STRONG PROPERTIES · KUMASI, GHANA</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#hallway" onClick={link('hallway')}>Return to hallway <ArrowUpRight size={13}/></a></div><small>© {new Date().getFullYear()} Strong Properties</small></footer>
    <div className="house-utilities"><a href="#listings" onClick={link('listings', { immediate: true })}>View content <ArrowUpRight size={12}/></a><button type="button" aria-pressed={!motion || reduced || visualFailed} disabled={reduced} onClick={toggleMotion}>{motion && !reduced && !visualFailed ? <Pause size={12}/> : <Play size={12}/>} {motion && !reduced && !visualFailed ? 'Motion on' : 'Motion off'}</button></div>
    <span className="house-sr-only" aria-live="polite">{busy ? 'Opening the next view.' : ''}</span>
  </main>;
}
