export const categories = ['land', 'residential', 'commercial'] as const;
export type Category = typeof categories[number];
export type Property = {
  id: string; slug: string; title: string; category: Category; location: string;
  price: number | null; currency: string; description: string; image: string;
  images: string[]; beds: number | null; baths: number | null; status: string;
  preview?: boolean;
};
export type PropertyFeatures = {
  plot_size_sqm: number | null; building_size_sqm: number | null;
  tenure: string | null; documentation_status: string | null; amenities: unknown;
};
export type PropertyMedia = {
  id: string; kind: 'image' | 'video' | 'tour' | 'document'; url: string; caption: string | null;
};
export type PropertyDetail = Property & { features?: PropertyFeatures; media: PropertyMedia[] };

// Development fixtures only. No price, address, availability or specifications are inferred.
export const demoProperties: Property[] = [
  { id: 'demo-1', slug: 'executive-residence-preview', title: 'Executive Residence', category: 'residential', location: 'Location awaiting verification', price: null, currency: 'GHS', description: 'A residence shown in supplied television footage. The exact location, price, specifications and availability have not been verified. This is a development media preview, not a property offered for sale.', image: '/images/properties/executive-residence.webp', images: ['/images/properties/executive-residence.webp'], beds: null, baths: null, status: 'preview', preview: true },
  { id: 'demo-2', slug: 'family-residence-preview', title: 'Family Residence', category: 'residential', location: 'Location awaiting verification', price: null, currency: 'GHS', description: 'Residential architecture from supplied television footage. All listing details require confirmation. Broadcast overlays remain visible in the source media. This is a development media preview.', image: '/images/properties/family-residence.webp', images: ['/images/properties/family-residence.webp'], beds: null, baths: null, status: 'preview', preview: true },
  { id: 'demo-3', slug: 'pool-amenity-preview', title: 'Pool & Outdoor Space', category: 'residential', location: 'Property association unconfirmed', price: null, currency: 'GHS', description: 'An outdoor space from supplied television footage. Its association with a particular property is unconfirmed. The image does not establish any listed amenities or availability.', image: '/images/properties/pool.webp', images: ['/images/properties/pool.webp'], beds: null, baths: null, status: 'preview', preview: true },
];
export function formatPrice(p: Pick<Property, 'price' | 'currency' | 'preview'>) {
  if (p.preview) return 'Details awaiting verification';
  if (p.price == null) return 'Price on enquiry';
  try { return new Intl.NumberFormat('en-GH', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.price); }
  catch { return `${p.currency} ${Number(p.price).toLocaleString('en-GH')}`; }
}
export function safeMediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
