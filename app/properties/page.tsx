import { Suspense } from 'react';
import type { Metadata } from 'next';
import Loading from '@/components/layout/Loading';
import Collection from '@/components/properties/Collection';
import { parseFilters, type SearchParams } from '@/lib/catalogue';
import { attributionFromSearch } from '@/lib/marketing';
export const dynamic='force-dynamic';
export const metadata: Metadata={title:'Properties in Ghana | Land, Homes & Commercial',description:'Explore genuine published land, residential and commercial property across Ghana. Filter by location, type and price, and request a viewing.',alternates:{canonical:'/properties'}};
export default async function Listings({searchParams}:{searchParams:Promise<SearchParams>}) {
 const params=await searchParams, filters=parseFilters(params);
 return <main id="main-content"><section className="page-head"><span className="eyebrow">THE STRONG COLLECTION · GHANA</span><h1>Find a space.<br/><em>Build a future.</em></h1><p>Land, residences and commercial opportunities across Ghana. A considered way to explore what comes next.</p></section><Suspense fallback={<Loading/>}><Collection filters={filters} attribution={attributionFromSearch(params)}/></Suspense></main>;
}
