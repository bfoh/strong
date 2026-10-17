import type { MetadataRoute } from 'next';
import { db, launchSchemaAvailable, publishedDiscovery } from '@/lib/server';
import {regionSlug} from '@/lib/ghana';
import { siteUrl } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(), client = db();
  if (!base) return [];
  const entries: MetadataRoute.Sitemap = ['', '/properties', '/book-viewing', '/about', '/contact', '/tv'].map(path => ({ url: base + path, changeFrequency: 'weekly' as const }));
  if(!client)return entries;
  const launch=await launchSchemaAvailable();
  const regions=[...new Set((await publishedDiscovery()).filter(p=>p.count>0).map(p=>p.region))];
  for(const region of regions)entries.push({url:base+'/locations/'+regionSlug(region),changeFrequency:'weekly'});
  // Only published rows, requested in bounded pages. Fixtures are never indexed.
  for (let offset = 0; ; offset += 1000) {
    let query=client.from('properties').select('slug,updated_at').eq('status','published');
    if(launch)query=query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available');
    const {data,error}=await query.order('id').range(offset,offset+999);
    if (error) throw Error('Published sitemap data is temporarily unavailable.');
    for (const p of data || []) entries.push({ url: `${base}/properties/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at, changeFrequency: 'weekly' });
    if (!data || data.length < 1000) break;
  }
  return entries;
}
