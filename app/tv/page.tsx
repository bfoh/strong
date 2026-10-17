import type { Metadata } from 'next';
import Image from 'next/image';
import { randomUUID } from 'node:crypto';
import Link from '@/components/marketing/TrackedLink';
import PublishedCollection from '@/components/marketing/PublishedCollection';
import ContactActions from '@/components/marketing/ContactActions';
import GeneralEnquiry from '@/components/marketing/GeneralEnquiry';
import { featuredProperties } from '@/lib/server';
import { siteUrl, databaseConfigured } from '@/lib/config';
import { attributionFrom, campaignUrl, tvAttribution } from '@/lib/marketing';
import type { SearchParams } from '@/lib/catalogue';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const base=siteUrl();return {title:'Find Your Place in Ghana | TV',description:'Discover Strong Properties, explore genuine published properties across Ghana and contact the team from home or abroad.',alternates:base?{canonical:base+'/tv'}:undefined};}
export default async function Tv({searchParams}:{searchParams:Promise<SearchParams>}){
 const params=await searchParams,urlParams=new URLSearchParams(Object.entries(params).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
 const attribution={...tvAttribution,...attributionFrom(urlParams)};
 const collection=await featuredProperties(6).then(items=>({items,error:!databaseConfigured()})).catch(()=>({items:[],error:true}));
 return <main id="main-content" className="tv-page"><section className="tv-intro"><div><p className="kicker">As seen on TV · Strong Properties</p><h1>Find Your Place <em>in Ghana.</em></h1><p>Homes, land and commercial opportunities across Ghana, for buyers at home and abroad.</p><div className="button-row"><Link className="btn btn-dark" href={campaignUrl('/properties',attribution)}>Explore Properties ↗</Link><Link className="btn btn-outline" href="#enquiry">Contact the team</Link></div><ContactActions enquiry="#enquiry" message={'Hello Strong Properties. I saw the TV campaign and would like to enquire about property in Ghana. Campaign: '+attribution.utm_campaign}/></div><figure><Image src="/images/house-v1/exterior-gallery.webp" alt="Concept residence illustrating the Strong Properties brand" fill priority sizes="(max-width:800px) 90vw, 40vw"/><figcaption>Illustrative architecture · Not a sale listing</figcaption></figure></section><PublishedCollection properties={collection.items} error={collection.error} attribution={attribution}/><section className="tv-contact"><div><p className="kicker">A conversation away</p><h2>Tell us what you<br/><em>have in mind.</em></h2><p>Share your preferred location, budget and property type. If you live abroad, ask about a remote consultation or viewing assistance.</p><p>Listing information and availability require confirmation. Obtain independent legal and professional advice before entering an agreement.</p></div><GeneralEnquiry available={databaseConfigured()} requestId={randomUUID()} initialAttribution={attribution}/></section></main>;
}
