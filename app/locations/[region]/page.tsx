import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { regionFromSlug } from '@/lib/ghana';
import { publishedDiscovery } from '@/lib/server';
import { parseFilters, type SearchParams } from '@/lib/catalogue';
import { attributionFromSearch } from '@/lib/marketing';
import Collection from '@/components/properties/Collection';
export const dynamic='force-dynamic';
async function available(slug:string) {
  const region=regionFromSlug(slug);
  return region && (await publishedDiscovery()).some(p=>p.region===region && p.count>0) ? region : undefined;
}
export async function generateMetadata({params}:{params:Promise<{region:string}>}):Promise<Metadata> {
  const {region:slug}=await params,region=await available(slug);
  return region ? {title:`Properties in ${region}, Ghana`,description:`Explore published homes, land and commercial property in ${region}, Ghana. Confirm current availability with Strong Properties.`,alternates:{canonical:`/locations/${slug}`}} : {title:'Location unavailable',robots:{index:false,follow:true}};
}
export default async function Location({params,searchParams}:{params:Promise<{region:string}>;searchParams:Promise<SearchParams>}) {
  const region=await available((await params).region); if(!region)notFound();
  const search=await searchParams;
  return <main id="main-content"><section className="page-head"><p className="eyebrow">EXPLORE GHANA</p><h1>A place in <em>{region}.</em></h1><p>Published property opportunities in {region}. Ask the team about the locality, documentation and current availability.</p></section><Collection filters={parseFilters({...search,region})} attribution={attributionFromSearch(search)}/></main>;
}
