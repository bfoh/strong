import { Suspense } from 'react';
import Loading from '@/components/layout/Loading';
import type { CatalogueFilters } from '@/lib/catalogue';
import type { Metadata } from 'next';
import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import PropertyFilters from '@/components/properties/PropertyFilters';
import { catalogue, propertyLocations } from '@/lib/server';
import { PAGE_SIZE, catalogueUrl, parseFilters, type SearchParams } from '@/lib/catalogue';
import { siteUrl } from '@/lib/config';
import { categories } from '@/lib/data';
import Button from '@/components/ui/Button';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The Property Collection', description: 'Explore land, residential and commercial property in Kumasi. Search by location, type and price, and request your next viewing.', alternates: siteUrl() ? { canonical: '/properties' } : undefined };
export default async function Listings({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  return <main id="main-content"><section className="page-head"><span className="eyebrow">THE STRONG COLLECTION</span><h1>Find a space.<br/><em>Build a future.</em></h1><p>Prime land, residences and commercial opportunities. A considered way to explore what comes next.</p></section><Suspense fallback={<Loading/>}><Collection filters={filters}/></Suspense></main>;
}
async function Collection({ filters }: { filters: CatalogueFilters }) {
  const [result, locations] = await Promise.all([catalogue(filters), propertyLocations()]);
  const pages = Math.ceil(result.total / PAGE_SIZE), start = (filters.page - 1) * PAGE_SIZE;
  return <section className="catalogue-section" aria-label="Property collection"><nav className="catalogue-tabs" aria-label="Property categories"><Link href={catalogueUrl({ ...filters, category: '' }, 1)} aria-current={!filters.category ? 'page' : undefined}>All properties</Link>{categories.map(category => <Link key={category} href={catalogueUrl({ ...filters, category }, 1)} aria-current={filters.category === category ? 'page' : undefined}>{category.charAt(0).toUpperCase() + category.slice(1)}</Link>)}</nav><PropertyFilters key={catalogueUrl(filters, 1)} filters={filters} locations={locations}/>{result.preview && <p className="preview-note"><span>DEVELOPMENT MEDIA PREVIEWS</span> These entries are unverified TV screenshots, not live inventory. Prices, specifications and availability have not been established.</p>}{filters.min && filters.max && Number(filters.min) > Number(filters.max) && <p className="preview-note" role="status">The minimum price is higher than the maximum. Adjust the range to see matching properties.</p>}<div className="catalogue-result-bar"><h2>{result.total} {result.preview ? `media preview${result.total === 1 ? '' : 's'}` : `published ${result.total === 1 ? 'property' : 'properties'}`}{result.items.length > 0 && ` · ${start + 1}–${start + result.items.length} shown`}</h2><span>{result.preview ? 'Preview mode · Not offered for sale' : 'Prices subject to confirmation'}</span></div>{result.items.length ? <div className="cards">{result.items.map(p => <PropertyCard key={p.id} p={p}/>)}</div> : <div className="empty-state"><span className="eyebrow">ROOM FOR A DIFFERENT SEARCH</span><h3>No spaces found this time.</h3><p>Try a different location or property type, or broaden your price range. Properties without a published price are excluded from price-filtered results.</p><Button href="/properties" variant="secondary">Clear all filters</Button>{filters.page > 1 && <p><Link className="text-link" href={catalogueUrl(filters, 1)}>Return to the first page</Link></p>}</div>}{pages > 1 && <nav className="pagination" aria-label="Collection pages">{filters.page > 1 && <Link href={catalogueUrl(filters, filters.page - 1)}>← Previous</Link>}<span>Page {filters.page} of {pages}</span>{filters.page < pages && <Link href={catalogueUrl(filters, filters.page + 1)}>Next →</Link>}</nav>}</section>;
}
