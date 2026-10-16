import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import PropertyImage from '@/components/ui/PropertyImage';
import { formatPrice } from '@/lib/data';
import type { FeaturedProperty } from '@/lib/server';

const area = (value: number) => `${value.toLocaleString('en-GH', { maximumFractionDigits: 0 })} m²`;
function details(p: FeaturedProperty) {
  const list: string[] = [];
  if (p.beds) list.push(`${p.beds} bed${p.beds === 1 ? '' : 's'}`);
  if (p.baths) list.push(`${p.baths} bath${p.baths === 1 ? '' : 's'}`);
  if (p.buildingSize && p.category !== 'land') list.push(`${area(p.buildingSize)} interior`);
  if (p.plotSize) list.push(`${area(p.plotSize)} plot`);
  return list;
}
const statusLabel = (p: FeaturedProperty) => p.preview ? 'Media preview' : p.status === 'published' ? 'Listed' : p.status.replaceAll('_', ' ');

export default function FeaturedCollection({ items, preview }: { items: FeaturedProperty[]; preview: boolean }) {
  // Never show the same photograph twice: fall through each gallery, else use the branded placeholder.
  const used = new Set<string>();
  const listings = items.map(p => {
    const image = [p.image, ...(p.images || [])].find(url => url && !used.has(url)) || '';
    if (image) used.add(image);
    return { p, image, details: details(p) };
  });
  return <section id="featured" className="curated" aria-labelledby="featured-title">
    <header className="section-head">
      <div>
        <p className="kicker" data-reveal>Curated Opportunities</p>
        <h2 id="featured-title" className="display" data-reveal>Exceptional Places. <em>Considered Choices.</em></h2>
      </div>
      <div className="section-aside" data-reveal>
        <p>Explore selected opportunities across Kumasi and beyond.</p>
        <Link className="link-arrow" href="/properties">View All Properties <ArrowUpRight size={15} aria-hidden="true"/></Link>
      </div>
    </header>
    {preview && items.length > 0 && <p className="notice"><strong>Development preview.</strong> These entries use supplied TV imagery and are not offered for sale. Connect the database to show published listings.</p>}
    {listings.length ? <ul className={`listing-grid listing-count-${Math.min(listings.length, 5)}`}>
      {listings.map(({ p, image, details }, index) => <li key={p.id} className="listing" data-reveal>
        <Link href={`/properties/${p.slug}`} className="listing-link" aria-label={`${p.title}, ${p.location}. View details`}>
          <span className="listing-media">
            <PropertyImage src={image} alt={p.preview ? `${p.title}, unverified media preview` : `${p.title} in ${p.location}`} sizes={index === 0 ? '(max-width: 800px) 92vw, 58vw' : '(max-width: 800px) 92vw, 34vw'} priority={false}/>
            <span className="listing-status">{statusLabel(p)}</span>
          </span>
          <span className="listing-body">
            <span className="listing-meta"><span className="listing-category">{p.category}</span><span className="listing-location"><MapPin size={12} aria-hidden="true"/>{p.location}</span></span>
            <span className="listing-title">{p.title}</span>
            {details.length > 0 && <span className="listing-details">{details.map(d => <span key={d}>{d}</span>)}</span>}
            <span className="listing-foot"><span className="listing-price">{formatPrice(p)}</span><span className="listing-cta">View Details <ArrowUpRight size={15} aria-hidden="true"/></span></span>
          </span>
        </Link>
      </li>)}
    </ul> : <div className="curated-empty" data-reveal>
      <div className="curated-empty-frame" aria-hidden="true"><span/><span/></div>
      <div>
        <h3>New opportunities are being prepared.</h3>
        <p>Listings appear here as soon as they are published. Browse the full catalogue, or tell the team what you are looking for and they will be in touch.</p>
        <div className="button-row">
          <Link className="btn btn-dark" href="/properties">View All Properties <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link className="btn btn-outline" href="/contact">Tell Us What You Need</Link>
        </div>
      </div>
    </div>}
  </section>;
}
