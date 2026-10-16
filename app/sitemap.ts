import type { MetadataRoute } from 'next';
import { db } from '@/lib/server';
import { siteUrl } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(), client = db();
  if (!base || !client) return [];
  const entries: MetadataRoute.Sitemap = ['', '/properties', '/book-viewing', '/about', '/contact'].map(path => ({ url: base + path, changeFrequency: 'weekly' as const }));
  // Only published rows, requested in bounded pages. Fixtures are never indexed.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('properties').select('slug,updated_at').eq('status', 'published').order('id').range(offset, offset + 999);
    if (error) throw Error('Published sitemap data is temporarily unavailable.');
    for (const p of data || []) entries.push({ url: `${base}/properties/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at, changeFrequency: 'weekly' });
    if (!data || data.length < 1000) break;
  }
  return entries;
}
