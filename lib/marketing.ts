import { z } from 'zod';
const tag = z.string().trim().max(100).regex(/^[\p{L}\p{N} ._-]*$/u);
export const attributionSchema = z.object({ utm_source: tag.optional(), utm_medium: tag.optional(), utm_campaign: tag.optional(), utm_content: tag.optional(), utm_term: tag.optional() }).strict();
export type Attribution = z.infer<typeof attributionSchema>;
export const attributionKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
export const tvAttribution: Attribution = { utm_source: 'tv', utm_medium: 'broadcast', utm_campaign: 'launch_oct2026' };
export function attributionFrom(params: URLSearchParams): Attribution {
  const result: Attribution = {};
  for (const key of attributionKeys) { const parsed = tag.safeParse(params.get(key) || ''); if (parsed.success && parsed.data) result[key] = parsed.data; }
  return result;
}
export function campaignUrl(href: string, attribution: Attribution) {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://internal.invalid');
  for (const key of attributionKeys) if (attribution[key] && !url.searchParams.has(key)) url.searchParams.set(key, attribution[key]!);
  return url.pathname + url.search + url.hash;
}
export const buyerContextSchema = {
  countryOfResidence: z.string().trim().max(100).optional(),
  preferredContact: z.enum(['phone','email','whatsapp']).optional(),
  remoteViewing: z.boolean().optional(),
  attribution: attributionSchema.optional(),
};

export function attributionFromSearch(params: Record<string,string|string[]|undefined>): Attribution {
  return attributionFrom(new URLSearchParams(Object.entries(params).filter((entry): entry is [string,string]=>typeof entry[1]==='string')));
}

export function navigationAttribution(pathname:string,params:URLSearchParams):Attribution {
 const attribution=attributionFrom(params);return pathname==='/tv'?{...tvAttribution,...attribution}:attribution;
}
