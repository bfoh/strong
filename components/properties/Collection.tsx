import Link from '@/components/marketing/TrackedLink';
import PropertyCard from '@/components/PropertyCard';
import PropertyFilters from './PropertyFilters';
import { catalogue, propertyLocations, launchSchemaAvailable } from '@/lib/server';
import { PAGE_SIZE, catalogueUrl, type CatalogueFilters } from '@/lib/catalogue';
import { campaignUrl, type Attribution } from '@/lib/marketing';
import { categories } from '@/lib/data';
export default async function Collection({ filters, attribution = {} }: { filters: CatalogueFilters; attribution?: Attribution }) {
  const [result, locations, structured] = await Promise.all([catalogue(filters), propertyLocations(), launchSchemaAvailable()]);
  const pages = Math.ceil(result.total / PAGE_SIZE), start = (filters.page - 1) * PAGE_SIZE;
  const href = (filters: CatalogueFilters, page = 1) => campaignUrl(catalogueUrl(filters,page),attribution);
  return <section className="catalogue-section" aria-label="Property collection">
    <nav className="catalogue-tabs" aria-label="Property categories"><Link href={href({...filters,category:''})} aria-current={!filters.category ? 'page' : undefined}>All properties</Link>{categories.map(category=><Link key={category} href={href({...filters,category})} aria-current={filters.category===category ? 'page' : undefined}>{category.charAt(0).toUpperCase()+category.slice(1)}</Link>)}</nav>
    <PropertyFilters key={catalogueUrl(filters,1)} filters={filters} locations={locations} structured={structured} attribution={attribution}/>
    {filters.min && filters.max && Number(filters.min)>Number(filters.max) && <p className="preview-note" role="status">The minimum price is higher than the maximum. Adjust the range to see matching properties.</p>}
    <div className="catalogue-result-bar"><h2>{result.total} published {result.total===1?'property':'properties'}{result.items.length>0 && ` · ${start+1}–${start+result.items.length} shown`}</h2><span>Prices and availability subject to confirmation</span></div>
    {result.items.length ? <div className="cards">{result.items.map(p=><PropertyCard key={p.id} p={p} attribution={attribution}/>)}</div> : <div className="empty-state"><span className="eyebrow">YOUR NEXT CHAPTER</span><h3>{result.unavailable ? 'The collection is temporarily unavailable.' : 'No published properties match this search.'}</h3><p>{result.unavailable ? 'Please try again or contact the team.' : 'Broaden your search or tell the team what you are looking for. Only approved listings are offered here. Properties without a confirmed price are excluded from price-filtered results.'}</p><Link className="btn btn-outline" href={campaignUrl('/properties',attribution)}>Clear all filters</Link> <Link className="text-link" href={campaignUrl('/contact#enquiry',attribution)}>Make an enquiry ↗</Link>{filters.page>1 && <p><Link href={href(filters)}>Return to the first page</Link></p>}</div>}
    {pages>1 && <nav className="pagination" aria-label="Collection pages">{filters.page>1 && <Link href={href(filters,filters.page-1)}>← Previous</Link>}<span>Page {filters.page} of {pages}</span>{filters.page<pages && <Link href={href(filters,filters.page+1)}>Next →</Link>}</nav>}
  </section>;
}
