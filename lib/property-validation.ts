import { z } from 'zod';
import { ghanaRegions } from './ghana';
const optionalNumber = z.union([z.literal(''), z.coerce.number().finite().nonnegative().max(999999999999)]);
const count = z.union([z.literal(''), z.coerce.number().int().nonnegative().max(1000)]);
const imageUrl = z.string().max(1500).refine(s => !s || /^\/(?!\/)[\w/.,%+\-]+$/.test(s) || /^https:\/\//.test(s) && (() => { try { const u = new URL(s); return !u.username && !u.password; } catch { return false; } })(), 'Use a local image path or HTTPS URL.');
export const propertyInputSchema = z.object({
  id: z.union([z.string().uuid(), z.literal('')]), title: z.string().trim().min(3).max(160), slug: z.string().max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(['land','residential','commercial']), location: z.string().trim().min(2).max(200), price: optionalNumber,
  image: imageUrl, images: z.string().max(10000).refine(s => s.split(/\r?\n/).filter(Boolean).length <= 30 && s.split(/\r?\n/).every(s => imageUrl.safeParse(s.trim()).success), 'Use up to 30 valid image URLs.'),
  beds: count, baths: count, description: z.string().trim().min(10).max(10000), status: z.enum(['draft','published','under_offer','sold','archived']),
  plot_size_sqm: optionalNumber, building_size_sqm: optionalNumber, tenure: z.string().trim().max(200), documentation_status: z.string().trim().max(1500), amenities: z.string().max(5000),
  region: z.union([z.enum(ghanaRegions),z.literal('')]).optional().transform(value=>value || undefined), city: z.string().trim().max(100).optional(), locality: z.string().trim().max(100).optional(), approximate_address: z.string().trim().max(300).optional(), property_type: z.string().trim().max(100).optional(),
  availability: z.enum(['unknown','available','reserved','sold']).optional(), featured: z.literal('on').optional(), review_status: z.enum(['draft','review','approved']).optional(), publication_authorized: z.literal('on').optional(),
}).strict().superRefine((d, ctx) => {
  if (d.status === 'published' && (!d.publication_authorized || d.review_status !== 'approved' || d.availability !== 'available' || !d.region || !d.city || !d.property_type)) ctx.addIssue({code:'custom', message:'Publishing requires approved review, authorization, available status, region, city and property type.', path:['status']});
});
export type PropertyInput = z.infer<typeof propertyInputSchema>;
