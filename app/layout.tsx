import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/layout/Footer';
import SiteChrome from '@/components/layout/SiteChrome';
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
const base = siteUrl();
export const metadata: Metadata = {
  ...(base ? { metadataBase: new URL(base) } : {}),
  title: { default: 'Strong Properties | Exceptional Properties in Kumasi', template: '%s | Strong Properties' },
  description: 'Discover land, residences and commercial property opportunities in Kumasi, Ghana with Strong Properties.',
  robots: databaseConfigured() ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: 'website', locale: 'en_GH', siteName: 'Strong Properties', title: 'Strong Properties — Exceptional Properties in Kumasi', description: 'Strong Foundations. Lasting Legacies.', ...(base ? { images: [{ url: `${base}${brandAssets.hero.src}`, alt: brandAssets.hero.alt }] } : {}) },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body id="top"><SiteChrome header={<Header/>} footer={<Footer/>}>{children}</SiteChrome></body></html>;
}
