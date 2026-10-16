import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { property, relatedProperties } from '@/lib/server';
import { formatPrice, safeMediaUrl } from '@/lib/data';
import { siteUrl } from '@/lib/config';
import LeadForm from '@/components/LeadForm';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertySpecifications from '@/components/properties/PropertySpecifications';
import PropertyCard from '@/components/PropertyCard';
import Button from '@/components/ui/Button';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params, p = await property(slug);
  if (!p) return { title: 'Property not found', robots: { index: false, follow: false } };
  return { title: p.title, description: p.description.slice(0, 155), robots: p.preview ? { index: false, follow: false } : { index: true, follow: true }, alternates: siteUrl() && !p.preview ? { canonical: `/properties/${p.slug}` } : undefined, openGraph: { title: `${p.title} | Strong Properties`, description: p.description.slice(0, 155), ...(siteUrl() && safeMediaUrl(p.image) ? { images: [{ url: p.image, alt: p.title }] } : {}) } };
}
export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, p = await property(slug);
  if (!p) notFound();
  const related = await relatedProperties(p), preview = Boolean(p.preview);
  const urls = [...new Set([p.image, ...(p.images || []), ...p.media.filter(m => m.kind === 'image').map(m => m.url)].filter(url => safeMediaUrl(url)))];
  const images = urls.map((url, i) => ({ url, caption: p.media.find(m => m.url === url)?.caption || `${p.title} — ${preview ? 'unverified media preview' : `property image ${i + 1}`}` }));
  const videos = p.media.filter(m => m.kind === 'video' && safeMediaUrl(m.url));
  const documents = p.media.filter(m => m.kind === 'document' && safeMediaUrl(m.url));
  const amenities = Array.isArray(p.features?.amenities) ? p.features.amenities.filter((a): a is string => typeof a === 'string' && a.trim().length > 0) : [];
  return <main id="main-content"><nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/properties">The collection</Link><span aria-hidden="true">/</span><span aria-current="page">{p.title}</span></nav><section className="detail-intro"><div><span className="eyebrow">{p.category.toUpperCase()} / {preview ? 'DEVELOPMENT MEDIA PREVIEW' : 'THE STRONG COLLECTION'}</span><h1>{p.title}</h1><p><MapPin size={13}/>{p.location}</p></div><div className="detail-price"><strong>{formatPrice(p)}</strong><small>{preview ? 'Not offered for sale' : 'Published listing · Enquire for availability'}</small></div></section><PropertyGallery images={images} title={p.title} preview={preview}/><div className="detail-grid"><div><section className="detail-block"><span className="eyebrow">A CLOSER LOOK</span><h2>About this {preview ? 'preview' : 'property'}.</h2><p>{p.description}</p>{preview && <p className="preview-note">Images are supplied TV screenshots. Broadcast phone numbers and logos do not establish Strong Properties contact details. The originals remain unaltered.</p>}</section><section className="detail-block"><h2>At a glance.</h2><PropertySpecifications property={p}/>{preview && <p className="note">Specifications have not been verified.</p>}</section>{amenities.length > 0 && <section className="detail-block"><h2>Features & amenities.</h2><ul className="amenities">{amenities.map(a => <li key={a}>{a}</li>)}</ul></section>}{videos.length > 0 && <section className="detail-block"><h2>In motion.</h2><div className="video-gallery">{videos.map(video => <figure key={video.id}><video controls playsInline preload="none" aria-label={video.caption || `${p.title} property video`}><source src={safeMediaUrl(video.url)}/><a href={video.url}>Open property video</a></video>{video.caption && <figcaption>{video.caption}</figcaption>}</figure>)}</div></section>}<section className="detail-block"><h2>A sense of place.</h2><p>{p.location}</p><p className="note">{preview ? 'The exact property location has not been confirmed.' : 'Ask the team for precise directions and local context when arranging a viewing.'}</p></section><section className="detail-block"><h2>Documentation.</h2><p>{p.features?.documentation_status || 'Documentation information is available on enquiry. No title or legal verification is implied by this page.'}</p>{documents.length > 0 && <div className="document-links">{documents.map(doc => <a key={doc.id} href={safeMediaUrl(doc.url)} target="_blank" rel="noopener noreferrer">{doc.caption || 'View property document'} ↗</a>)}</div>}<p className="note">Review the relevant documents and obtain independent professional advice before committing to a purchase.</p></section></div><LeadForm propertyId={p.id} preview={preview}/></div>{related.length > 0 && <section className="detail-related section-wrap"><div className="related-heading"><h2>{preview ? 'More media previews.' : 'Continue discovering.'}</h2><Button href="/properties" variant="text">View the collection</Button></div><div className="cards">{related.map(item => <PropertyCard key={item.id} p={item}/>)}</div></section>}</main>;
}
