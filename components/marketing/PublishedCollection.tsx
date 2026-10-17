import type { Property } from '@/lib/data';
import type { Attribution } from '@/lib/marketing';
import { campaignUrl } from '@/lib/marketing';
import PropertyCard from '@/components/PropertyCard';
import Link from './TrackedLink';
export default function PublishedCollection({ properties, error = false, attribution = {} }: { properties: Property[]; error?: boolean; attribution?: Attribution }) {
  const items=properties.filter(p=>!p.preview&&p.status==='published');
  return <section className="launch-collection" aria-labelledby="collection-title"><div className="section-head"><div><p className="kicker">The Strong collection</p><h2 id="collection-title" className="display">Places for your <em>next chapter.</em></h2></div><Link className="link-arrow" href={campaignUrl('/properties',attribution)}>Explore all properties ↗</Link></div>{items.length?<div className="cards">{items.map(p=><PropertyCard key={p.id} p={p} attribution={attribution}/>)}</div>:<div className="launch-empty"><span className="launch-empty-index">01 / THE NEXT CHAPTER</span><h3>{error?'The collection is temporarily unavailable.':'New opportunities are taking shape.'}</h3><p>{error?'Please try the catalogue again, or send the team an enquiry.':'Properties appear here after the team has received and approved their details and photographs. Tell us the place and property you have in mind.'}</p><Link className="btn btn-outline" href={campaignUrl('/contact#enquiry',attribution)}>Share what you’re looking for ↗</Link></div>}</section>;
}
