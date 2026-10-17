import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/layout/Footer';
import SiteChrome from '@/components/layout/SiteChrome';
import MarketingProvider from '@/components/marketing/MarketingProvider';
import { databaseConfigured, siteUrl } from '@/lib/config';
import { brandAssets } from '@/lib/assets';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './globals.css';
import './cinematic-v2.css';
import './cinematic-v3.css';
import './landing.css';
import './ghana.css';
const base = siteUrl();
export const metadata: Metadata = {
  ...(base ? { metadataBase: new URL(base) } : {}),
  title: { default: 'Strong Properties | Find Your Place in Ghana', template: '%s | Strong Properties' },
  description: 'Strong Properties connects local and international buyers with property opportunities across Ghana.',
  robots: databaseConfigured() ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: 'website', locale: 'en_GH', siteName: 'Strong Properties', title: 'Strong Properties — Find Your Place in Ghana', description: 'Homes, land and commercial property opportunities across Ghana.', ...(base ? { images: [{ url: `${base}/cinematic/hero/og.jpg`, alt: brandAssets.hero.alt }] } : {}) },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  const ga = process.env.NEXT_PUBLIC_GA4_ID || '', ads = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '', label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || '';
  return <html lang="en"><body id="top"><MarketingProvider gaId={/^G-[A-Z0-9]+$/.test(ga)?ga:''} adsId={/^AW-\d+$/.test(ads)?ads:''} conversionLabel={/^[A-Za-z0-9_-]+$/.test(label)?label:''}><SiteChrome header={<Header/>} footer={<Footer/>}>{children}</SiteChrome></MarketingProvider></body></html>;
}
