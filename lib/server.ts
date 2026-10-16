import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { supabaseConfig } from './supabase-config';
import { publicMediaUrl, type MediaRecord } from './media';
import { demoProperties, type Property, type PropertyDetail, type PropertyFeatures } from './data';
import { PAGE_SIZE, filterFixtures, type CatalogueFilters } from './catalogue';
const fields = 'id,slug,title,category,location,price,currency,description,image,images,beds,baths,status';
// Filter before awaiting the query: development RSC diagnostics can serialize query results.
// Private documents and unpublished gallery assets must never enter a public render's data.
const publicMediaFilter = 'url.not.like.sp-storage:*,url.like.sp-storage://strong-property-media/*/public/*';
export function db() {
  const { url, serverKey: key } = supabaseConfig();
  return url && key ? createClient(url, key, { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }) : null;
}
export async function properties(limit = 6): Promise<Property[]> {
  const client = db();
  if (!client) return demoProperties.slice(0, limit);
  const { data, error } = await client.from('properties').select(fields).eq('status', 'published').order('created_at', { ascending: false }).limit(limit);
  if (error) throw Error('The property collection could not be loaded. Please try again.');
  return withGalleryImages((data || []) as Property[]);
}
export async function catalogue(filters: CatalogueFilters) {
  const client = db(), start = (filters.page - 1) * PAGE_SIZE;
  if (!client) {
    const all = filterFixtures(demoProperties, filters);
    return { items: all.slice(start, start + PAGE_SIZE), total: all.length, preview: true };
  }
  let query = client.from('properties').select(fields, { count: 'exact' }).eq('status', 'published');
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.location) query = query.eq('location', filters.location);
  if (filters.q) query = query.or(`title.ilike.%${filters.q}%,location.ilike.%${filters.q}%`);
  if (filters.min) query = query.gte('price', Number(filters.min));
  if (filters.max) query = query.lte('price', Number(filters.max));
  if (filters.sort === 'title') query = query.order('title');
  else if (filters.sort.startsWith('price')) query = query.order('price', { ascending: filters.sort === 'price-asc', nullsFirst: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error, count } = await query.order('id').range(start, start + PAGE_SIZE - 1);
  if (error) throw Error('The property collection could not be loaded. Please try again.');
  return { items: await withGalleryImages((data || []) as Property[]), total: count || 0, preview: false };
}
export const propertyLocations = cache(async (): Promise<string[]> => {
  const client = db();
  if (!client) return [];
  const { data, error } = await client.rpc('public_property_locations');
  if (error) {
    const fallback = await client.from('properties').select('location').eq('status', 'published').limit(1000);
    if (fallback.error) return [];
    return [...new Set((fallback.data || []).map(p => p.location as string))].sort();
  }
  return (data || []).map((p: { location: string }) => p.location);
});
export const property = cache(async (slug: string): Promise<PropertyDetail | undefined> => {
  const client = db();
  if (!client) {
    const item = demoProperties.find(p => p.slug === slug);
    return item ? { ...item, media: [] } : undefined;
  }
  const { data, error } = await client.from('properties').select(fields).eq('status', 'published').eq('slug', slug).maybeSingle();
  if (error) throw Error('This property could not be loaded. Please try again.');
  if (!data) return undefined;
  const [features, media] = await Promise.all([
    client.from('property_features').select('plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities').eq('property_id', data.id).maybeSingle(),
    client.from('property_media').select('id,property_id,kind,url,caption,sort_order').eq('property_id', data.id).neq('kind', 'document').or(publicMediaFilter).order('sort_order').order('id'),
  ]);
  if (features.error || media.error) throw Error('Property details could not be loaded. Please try again.');
  const publicMedia = ((media.data || []) as MediaRecord[]).flatMap(m => { const url = publicMediaUrl(m); return url ? [{ ...m, url }] : []; });
  const gallery = publicMedia.filter(m => m.kind === 'image').map(m => m.url);
  return { ...data, image: gallery[0] || data.image, images: [...gallery, ...(data.images || []).filter((url: string) => !url.startsWith('/api/media/') && !url.startsWith('sp-storage:'))], features: features.data as PropertyFeatures | undefined, media: publicMedia } as PropertyDetail;
});
export async function relatedProperties(item: Property) {
  const client = db();
  if (!client) return demoProperties.filter(p => p.id !== item.id).slice(0, 2);
  const { data, error } = await client.from('properties').select(fields).eq('status', 'published').eq('category', item.category).neq('id', item.id).order('created_at', { ascending: false }).limit(3);
  return error ? [] : withGalleryImages((data || []) as Property[]);
}

async function withGalleryImages(items: Property[]): Promise<Property[]> {
  const client = db(); if (!client || items.length === 0) return items;
  const { data, error } = await client.from('property_media').select('id,property_id,kind,url,caption,sort_order').in('property_id', items.map(p => p.id)).eq('kind', 'image').or(publicMediaFilter).order('sort_order').order('id').limit(500);
  if (error) throw Error('Property media could not be loaded.');
  return items.map(p => {
    const urls = ((data || []) as MediaRecord[]).filter(m => m.property_id === p.id).map(publicMediaUrl).filter((url): url is string => Boolean(url));
    return { ...p, image: urls[0] || p.image, images: [...urls, ...(p.images || []).filter(url => !url.startsWith('/api/media/') && !url.startsWith('sp-storage:'))] };
  });
}

export type FeaturedProperty = Property & { plotSize: number | null; buildingSize: number | null };
// The schema has no editorial "featured" flag, so the homepage presents the most recently published listings.
export async function featuredProperties(limit = 5): Promise<FeaturedProperty[]> {
  const items = await properties(limit), client = db();
  if (!client || items.length === 0) return items.map(p => ({ ...p, plotSize: null, buildingSize: null }));
  const { data } = await client.from('property_features').select('property_id,plot_size_sqm,building_size_sqm').in('property_id', items.map(p => p.id));
  const sizes = new Map((data || []).map(f => [f.property_id as string, f]));
  return items.map(p => ({ ...p, plotSize: Number(sizes.get(p.id)?.plot_size_sqm) || null, buildingSize: Number(sizes.get(p.id)?.building_size_sqm) || null }));
}

export type ViewingOption = Pick<Property, 'id' | 'slug' | 'title' | 'location' | 'category'>;
/** Published properties a visitor can request to view. Development fixtures are never offered. */
export async function viewingOptions(): Promise<ViewingOption[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = await client.from('properties').select('id,slug,title,location,category').eq('status', 'published').order('title').limit(300);
  if (error) throw Error('Published properties could not be loaded. Please try again.');
  return (data || []) as ViewingOption[];
}
