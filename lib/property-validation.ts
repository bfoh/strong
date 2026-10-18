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
  if (d.status !== 'published') return;
  const missing: [string, boolean, string][] = [
    ['region', !d.region, 'Choose the confirmed Ghana region before publishing.'],
    ['city', !d.city, 'Enter the confirmed city or town before publishing.'],
    ['property_type', !d.property_type, 'Enter the confirmed property type before publishing.'],
    ['availability', d.availability !== 'available', 'Set Availability to Available only after confirming it is available.'],
    ['review_status', d.review_status !== 'approved', 'Complete the review and choose Approved by authorized staff before publishing.'],
    ['publication_authorized', !d.publication_authorized, 'Confirm permission to publish this property and its media before publishing.'],
  ];
  for (const [field, invalid, message] of missing) if (invalid) ctx.addIssue({code:'custom', message, path:[field]});
});
export type PropertyInput = z.infer<typeof propertyInputSchema>;

export const propertyFieldLabels: Record<string, string> = {
  id:'Property identifier',title:'Property title',slug:'URL slug',category:'Category',location:'Display location',price:'Price (GHS)',image:'Primary image',images:'Additional approved images',beds:'Bedrooms',baths:'Bathrooms',description:'Description',status:'Publication status',plot_size_sqm:'Land area',building_size_sqm:'Floor area',tenure:'Tenure',documentation_status:'Documentation information',amenities:'Key features',region:'Ghana region',city:'City / town',locality:'Locality',approximate_address:'Approximate address',property_type:'Property type',availability:'Availability',featured:'Featured listing',review_status:'Review status',publication_authorized:'Permission to publish',
};
