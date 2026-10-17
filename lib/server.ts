import 'server-only';
import { excludeUnreviewed } from './media-review';
import { videoPoster } from './media-posters';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { supabaseConfig } from './supabase-config';
import { publicMediaUrl, type MediaRecord } from './media';
import { type Property, type PropertyDetail, type PropertyFeatures } from './data';
import { PAGE_SIZE, type CatalogueFilters } from './catalogue';
const fields = 'id,slug,title,category,location,price,currency,description,image,images,beds,baths,status';
const launchFields = ',region,city,locality,approximate_address,property_type,availability,featured,review_status,publication_authorized,updated_at';
export const launchSchemaAvailable = cache(async () => {
  const client = db(); if (!client) return false;
  const result = await client.from('properties').select('region,review_status,publication_authorized,availability,featured').eq('status','published').limit(0);
  if(result.error && !['42703','PGRST204'].includes(result.error.code))throw Error('Publication controls could not be checked.');
  return !result.error;
});
// Filter before awaiting the query: development RSC diagnostics can serialize query results.
// Private documents and unpublished gallery assets must never enter a public render's data.
const publicMediaFilter = 'url.not.like.sp-storage:*,url.like.sp-storage://strong-property-media/*/public/*';
export function db() {
  const { url, serverKey: key } = supabaseConfig();
  return url && key ? createClient(url, key, { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }) : null;
}
export async function properties(limit = 6): Promise<Property[]> {
  const client = db();
  if (!client) return [];
  const launch = await launchSchemaAvailable();
  let query = client.from('properties').select(fields + (launch ? launchFields : '')).eq('status','published');
  if (launch) query = query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available').order('featured',{ascending:false});
  const {data,error} = await query.order('created_at',{ascending:false}).limit(limit);
  if (error) throw Error('The property collection could not be loaded. Please try again.');
  return withGalleryImages((data || []) as unknown as Property[]);
}
export async function catalogue(filters: CatalogueFilters) {
  const client = db(), start = (filters.page - 1) * PAGE_SIZE;
  if (!client) {
    return { items: [] as Property[], total: 0, preview: false, unavailable: true };
  }
  const launch = await launchSchemaAvailable();
  if (filters.region && !launch) return { items: [] as Property[], total: 0, preview: false, unavailable: false };
  let query = client.from('properties').select(fields + (launch ? launchFields : ''), { count: 'exact' }).eq('status', 'published');
  if (launch) query = query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available');
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.location) query = query.eq('location', filters.location);
  if (filters.region) query = query.eq('region',filters.region);
  if (filters.beds) query = query.gte('beds',Number(filters.beds));
  if (filters.q) query = query.or(`title.ilike.%${filters.q}%,location.ilike.%${filters.q}%${launch ? `,city.ilike.%${filters.q}%,locality.ilike.%${filters.q}%` : ''}`);
  if (filters.min) query = query.gte('price', Number(filters.min));
  if (filters.max) query = query.lte('price', Number(filters.max));
  if (filters.sort === 'title') query = query.order('title');
  else if (filters.sort.startsWith('price')) query = query.order('price', { ascending: filters.sort === 'price-asc', nullsFirst: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error, count } = await query.order('id').range(start, start + PAGE_SIZE - 1);
  if (error) throw Error('The property collection could not be loaded. Please try again.');
  return { items: await withGalleryImages((data || []) as unknown as Property[]), total: count || 0, preview: false, unavailable: false };
}
export const propertyLocations = cache(async (): Promise<string[]> => {
  const client = db();
  if (!client) return [];
  if (await launchSchemaAvailable()) {
    const {data,error} = await client.rpc('public_property_discovery');
    return error ? [] : [...new Set((data || []).map((p: {location:string})=>p.location))].sort() as string[];
  }
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
  if (!client) return undefined;
  const launch = await launchSchemaAvailable();
  let query = client.from('properties').select(fields + (launch ? launchFields : '')).eq('status','published').eq('slug',slug);
  if (launch) query = query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available');
  const { data: row, error } = await query.maybeSingle();
  const data = row as unknown as Property | null;
  if (error) throw Error('This property could not be loaded. Please try again.');
  if (!data || !(await excludeUnreviewed([data])).length) return undefined;
  const [features, media] = await Promise.all([
    client.from('property_features').select('plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities').eq('property_id', data.id).maybeSingle(),
    client.from('property_media').select('id,property_id,kind,url,caption,sort_order').eq('property_id', data.id).neq('kind', 'document').or(publicMediaFilter).order('sort_order').order('id'),
  ]);
  if (features.error || media.error) throw Error('Property details could not be loaded. Please try again.');
  const publicMedia = (await Promise.all(((media.data || []) as MediaRecord[]).map(async m => { const url = publicMediaUrl(m); return url ? { id: m.id, kind: m.kind, caption: m.caption, url, ...(m.kind === 'video' ? { poster: await videoPoster(m.id, data.id) } : {}) } : undefined; }))).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const gallery = publicMedia.filter(m => m.kind === 'image').map(m => m.url);
  return { ...data, image: gallery[0] || data.image, images: [...gallery, ...(data.images || []).filter((url: string) => !url.startsWith('/api/media/') && !url.startsWith('sp-storage:'))], features: features.data as PropertyFeatures | undefined, media: publicMedia } as PropertyDetail;
});
export async function relatedProperties(item: Property) {
  const client = db();
  if (!client) return [];
  let query = client.from('properties').select(fields).eq('status','published').eq('category',item.category).neq('id',item.id);
  if (await launchSchemaAvailable()) query = query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available');
  const {data,error}=await query.order('created_at',{ascending:false}).limit(3);
  return error ? [] : withGalleryImages((data || []) as unknown as Property[]);
}

async function withGalleryImages(items: Property[]): Promise<Property[]> {
  items = await excludeUnreviewed(items);
  const client = db(); if (!client || items.length === 0) return items;
  const { data, error } = await client.from('property_media').select('id,property_id,kind,url,caption,sort_order').in('property_id', items.map(p => p.id)).eq('kind', 'image').or(publicMediaFilter).order('sort_order').order('id').limit(500);
  if (error) throw Error('Property media could not be loaded.');
  return items.map(p => {
    const urls = ((data || []) as MediaRecord[]).filter(m => m.property_id === p.id).map(publicMediaUrl).filter((url): url is string => Boolean(url));
    return { ...p, image: urls[0] || p.image, images: [...urls, ...(p.images || []).filter(url => !url.startsWith('/api/media/') && !url.startsWith('sp-storage:'))] };
  });
}

export type FeaturedProperty = Property & { plotSize: number | null; buildingSize: number | null };
// Approved inventory is ordered by featured status when the launch schema is installed.
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
  let query = client.from('properties').select('id,slug,title,location,category').eq('status','published');
  if (await launchSchemaAvailable()) query = query.eq('review_status','approved').eq('publication_authorized',true).eq('availability','available');
  const { data, error } = await query.order('title').limit(300);
  if (error) throw Error('Published properties could not be loaded. Please try again.');
  return excludeUnreviewed((data || []) as ViewingOption[]);
}
export async function publishedDiscovery(): Promise<{region:string;location:string;city:string;count:number}[]> {
  const client=db();if(!client||!await launchSchemaAvailable())return [];
  const {data,error}=await client.rpc('public_property_discovery');
  return error?[]:(data||[]).map((p:{region:string;location:string;city:string;property_count:number})=>({...p,count:Number(p.property_count)}));
}
