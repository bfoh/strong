import { categories, type Category, type Property } from './data';
import { ghanaRegions, type GhanaRegion } from './ghana';
export type SearchParams = Record<string, string | string[] | undefined>;
export type CatalogueFilters = { q: string; category: Category | ''; location: string; region: GhanaRegion | ''; beds: string; min: string; max: string; sort: 'newest' | 'price-asc' | 'price-desc' | 'title'; page: number };
export const PAGE_SIZE = 9;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || '' : value || ''; }
function price(value: string) { return /^\d{1,12}(\.\d{1,2})?$/.test(value) ? value : ''; }
export function parseFilters(params: SearchParams): CatalogueFilters {
  const category = first(params.category), sort = first(params.sort), page = Number(first(params.page));
  return {
    q: first(params.q).replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 100),
    category: categories.includes(category as Category) ? category as Category : '',
    location: first(params.location).trim().slice(0, 200),
    region: ghanaRegions.includes(first(params.region) as GhanaRegion) ? first(params.region) as GhanaRegion : '',
    beds: /^[1-9]$/.test(first(params.beds)) ? first(params.beds) : '',
    min: price(first(params.min)), max: price(first(params.max)),
    sort: ['price-asc', 'price-desc', 'title'].includes(sort) ? sort as CatalogueFilters['sort'] : 'newest',
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}
export function filterFixtures(items: Property[], filters: CatalogueFilters) {
  const result = items.filter(p => (!filters.category || p.category === filters.category)
    && (!filters.q || `${p.title} ${p.location}`.toLowerCase().includes(filters.q.toLowerCase()))
    && (!filters.location || p.location === filters.location)
    && (!filters.region || p.region === filters.region)
    && (!filters.beds || p.beds != null && p.beds >= Number(filters.beds))
    && (!filters.min || p.price != null && p.price >= Number(filters.min))
    && (!filters.max || p.price != null && p.price <= Number(filters.max)));
  if (filters.sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
  if (filters.sort.startsWith('price')) result.sort((a, b) => {
    if (a.price == null) return b.price == null ? 0 : 1;
    if (b.price == null) return -1;
    return filters.sort === 'price-asc' ? a.price - b.price : b.price - a.price;
  });
  return result;
}
export function catalogueUrl(filters: CatalogueFilters, page: number) {
  const params = new URLSearchParams();
  for (const key of ['q', 'category', 'location', 'region', 'beds', 'min', 'max', 'sort'] as const) {
    if (filters[key] && !(key === 'sort' && filters[key] === 'newest')) params.set(key, filters[key]);
  }
  if (page > 1) params.set('page', String(page));
  return `/properties${params.size ? `?${params}` : ''}`;
}
