import type { Metadata } from 'next';
import { randomUUID } from 'node:crypto';
import { notFound } from 'next/navigation';
import { featuredProperties, property } from '@/lib/server';
import { formatPrice } from '@/lib/data';
import { houseSettings } from '@/lib/house/storage';
import { isHousePreviewRequest } from '@/lib/house/preview';
import { conceptListing, type HouseListing } from '@/lib/house/config';
import HouseExperience from '@/components/house/HouseExperience';
import '@/app/preview/house/house.css';
export async function houseMetadata(): Promise<Metadata> {
 const settings = await houseSettings();
 return {
  metadataBase: new URL('http://127.0.0.1:3000'),
  title: { absolute: settings.seoTitle },
  description: settings.seoDescription,
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null },
  openGraph: { title: settings.seoTitle, description: settings.seoDescription, images: [{ url: '/images/house-v1/social.jpg', width: 1200, height: 630, alt: 'Conceptual contemporary residence for Strong Properties' }] },
 };
}
export default async function HousePage() {
  if (!await isHousePreviewRequest()) notFound();
  const [settings, recent] = await Promise.all([houseSettings(), featuredProperties(6).catch(() => [])]);
  const live = await Promise.all(recent.filter(item => !item.preview).map(async (p): Promise<HouseListing> => {
    const detail = await property(p.slug).catch(() => undefined);
    const f = detail?.features;
    const urls = [...new Set([p.image, ...(detail?.images || p.images)].filter(Boolean))];
    return {
      id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location,
      description: p.description, price: formatPrice(p), beds: p.beds, baths: p.baths, demo: false,
      images: urls.map((url, i) => ({ url, label: detail?.media.find(m => m.url === url)?.caption || `Property photo ${i + 1}` })),
      facts: [
        { label: 'Property type', value: p.category },
        { label: 'Bedrooms / bathrooms', value: `${p.beds ?? 'Confirm'} / ${p.baths ?? 'Confirm'}` },
        { label: 'Internal area', value: f?.building_size_sqm ? `${f.building_size_sqm} m²` : 'Awaiting details' },
        { label: 'Plot', value: f?.plot_size_sqm ? `${f.plot_size_sqm} m²` : 'Awaiting details' },
        { label: 'Tenure', value: f?.tenure || 'Awaiting details' },
        { label: 'Documentation', value: f?.documentation_status || 'Awaiting details' },
        { label: 'Availability', value: 'Published listing · confirm with the team' },
        { label: 'Features', value: Array.isArray(f?.amenities) ? f.amenities.filter(a => typeof a === 'string').join(', ') || 'Awaiting details' : 'Awaiting details' },
      ],
    };
  }));
  return <><HouseExperience settings={settings} listings={[...live, conceptListing]} requestId={randomUUID()}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Strong Properties', areaServed: { '@type': 'City', name: 'Kumasi' }, description: 'Land, residential and commercial property in Kumasi, Ghana.' }).replace(/</g, '\\u003c') }}/></>;
}
