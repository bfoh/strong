'use client';
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { navigationAttribution, type Attribution } from '@/lib/marketing';
type Consent = { analytics: boolean; ads: boolean };
type EventName = 'page_view' | 'property_search' | 'property_view' | 'whatsapp_click' | 'phone_click' | 'viewing_request' | 'enquiry_submit';
type Params = Record<string, string | number | boolean>;
type Context = { analyticsReady: boolean; attribution: Attribution; track: (name: EventName, params?: Params) => void };
const Marketing = createContext<Context>({ analyticsReady: false, attribution: {}, track: () => {} });
export const useMarketing = () => useContext(Marketing);
declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }
const allowed = new Set(['property_id','category','region','has_query','page_path','page_location','campaign_source','campaign_medium','campaign_name']);

function NavigationEvents({ update }: { update: (value: Attribution) => void }) {
  const pathname = usePathname(), search = useSearchParams(), { track, analyticsReady } = useMarketing(), last = useRef('');
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/preview')) return;
    const attribution = navigationAttribution(pathname,new URLSearchParams(search.toString()));
    if (Object.keys(attribution).length) update(attribution);
    const key = pathname + '?' + search.toString();
    if (!analyticsReady || last.current === key) return;
    last.current = key;
    track('page_view', { page_path: pathname, page_location: location.origin + pathname, campaign_source: attribution.utm_source || '', campaign_medium: attribution.utm_medium || '', campaign_name: attribution.utm_campaign || '' });
    if (pathname === '/properties' && search.size) track('property_search', { category: search.get('category') || '', region: search.get('region') || '', has_query: Boolean(search.get('q')) });
  }, [pathname, search, track, update, analyticsReady]);
  return null;
}
export default function MarketingProvider({ children, gaId, adsId, conversionLabel }: { children: React.ReactNode; gaId: string; adsId: string; conversionLabel: string }) {
  const [attribution, setAttribution] = useState<Attribution>({}), [consent, setConsent] = useState<Consent | null>(null), [settings, setSettings] = useState(false), [ready, setReady] = useState(false);
  const pathname = usePathname(), publicPage = !pathname.startsWith('/admin') && !pathname.startsWith('/preview');
  const configured = Boolean(gaId || adsId);
  const update = useCallback((value: Attribution) => setAttribution(current => Object.keys(current).length ? current : value), []);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem('strong-marketing-consent') || 'null'); if (value && typeof value.analytics === 'boolean' && typeof value.ads === 'boolean') setConsent(value); } catch {}
  }, []);
  useEffect(() => {
    if (!publicPage) { window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}); return; }
    if (!configured || !consent) return;
    const permissions = { analytics_storage: consent.analytics ? 'granted' : 'denied', ad_storage: consent.ads ? 'granted' : 'denied', ad_user_data: consent.ads ? 'granted' : 'denied', ad_personalization: consent.ads ? 'granted' : 'denied' };
    if (window.gtag) window.gtag('consent','update', permissions);
    if (!consent.analytics && !consent.ads) return;
    window.dataLayer ||= [];
    window.gtag ||= (...args: unknown[]) => { window.dataLayer!.push(args); };
    window.gtag('consent','default', permissions);
    window.gtag('js',new Date());
    if (gaId) window.gtag('config',gaId,{ send_page_view: false, allow_google_signals: consent.ads, allow_ad_personalization_signals: consent.ads, page_location: location.origin + location.pathname, page_referrer: document.referrer ? new URL(document.referrer).origin : '' });
    if (adsId && consent.ads) window.gtag('config',adsId);
    const existing = document.getElementById('strong-google-tag');
    if (existing) { setReady(true); return; }
    const script = document.createElement('script'); script.id = 'strong-google-tag'; script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId || adsId);
    script.onload = () => setReady(true); document.head.append(script);
  }, [configured, consent, gaId, adsId, publicPage]);
  const track = useCallback((name: EventName, params: Params = {}) => {
    if (!publicPage || !ready || !window.gtag || !consent?.analytics) return;
    const safe = Object.fromEntries(Object.entries(params).filter(([key,value]) => allowed.has(key) && (typeof value !== 'string' || value.length <= 250)));
    window.gtag('event',name,{ page_path: location.pathname, page_location: location.origin + location.pathname, ...safe, ...(attribution.utm_source ? { campaign_source: attribution.utm_source, campaign_medium: attribution.utm_medium, campaign_name: attribution.utm_campaign } : {}) });
    if (consent.ads && adsId && conversionLabel && ['enquiry_submit','viewing_request'].includes(name)) window.gtag('event','conversion',{ send_to: adsId + '/' + conversionLabel });
  }, [ready, consent, attribution, adsId, conversionLabel, publicPage]);
  function choose(value: Consent) { setConsent(value); setSettings(false); try { localStorage.setItem('strong-marketing-consent',JSON.stringify(value)); } catch {} }
  return <Marketing.Provider value={{ attribution, track, analyticsReady: ready && Boolean(consent?.analytics) }}>{children}<Suspense fallback={null}><NavigationEvents update={update}/></Suspense>{configured && publicPage && <><button className="marketing-preferences" onClick={() => setSettings(true)}>Privacy choices</button>{(!consent || settings) && <section className="consent-banner" aria-label="Analytics and advertising choices"><h2>Your privacy choices</h2><p>Optional analytics helps us understand visits and enquiries. Advertising measurement is separate. Your property enquiry works with either choice.</p><div><button onClick={() => choose({analytics:false,ads:false})}>Essential only</button><button onClick={() => choose({analytics:true,ads:false})}>Allow analytics</button>{adsId && <button onClick={() => choose({analytics:true,ads:true})}>Allow analytics & advertising</button>}</div><a href="/privacy">Read the privacy notice</a></section>}</>}</Marketing.Provider>;
}
