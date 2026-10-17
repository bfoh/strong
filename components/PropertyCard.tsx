import Link from '@/components/marketing/TrackedLink';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { formatPrice, type Property } from '@/lib/data';
import PropertyImage from './ui/PropertyImage';
import { campaignUrl, type Attribution } from '@/lib/marketing';
export default function PropertyCard({ p, attribution = {} }: { p: Property; attribution?: Attribution }) {
  return <Link className="property-card" href={campaignUrl(`/properties/${p.slug}`,attribution)}><div className="card-photo"><PropertyImage src={p.image} alt={p.preview ? `${p.title}, supplied television screenshot; unverified media preview` : `${p.title} in ${p.location}`} sizes="(max-width: 650px) 92vw, (max-width: 950px) 45vw, 40vw"/><span className="card-status">{p.preview ? 'MEDIA PREVIEW' : p.status === 'published' ? 'PUBLISHED LISTING' : p.status.replaceAll('_', ' ').toUpperCase()}</span><span className="card-view">View {p.preview ? 'preview' : 'property'} <ArrowUpRight size={20}/></span></div><div className="card-info"><div className="card-category">{p.category}</div><h3>{p.title}<ArrowUpRight size={24}/></h3><p><MapPin size={12}/>{p.location}</p><div className="card-price"><span>{formatPrice(p)}</span>{!p.preview && p.category === 'residential' && <small>{p.beds != null && p.beds > 0 ? `${p.beds} beds` : ''}{p.baths != null && p.baths > 0 ? `${p.beds ? ' · ' : ''}${p.baths} baths` : ''}</small>}</div></div></Link>;
}
