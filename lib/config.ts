export const site = {
  name: 'Strong Properties', tagline: 'Find Your Place in Ghana.', location: 'Ghana',
  // Populate only with verified company details. Broadcast overlays are not contact evidence.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+233546732018',
  internationalPhone: process.env.NEXT_PUBLIC_CONTACT_INTERNATIONAL_PHONE || '+4916090882654',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+233546732018',
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '',
  // Rendered only when a verified profile URL is configured.
  social: ([['Instagram', process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM], ['Facebook', process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK], ['LinkedIn', process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN], ['X', process.env.NEXT_PUBLIC_SOCIAL_X], ['YouTube', process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE], ['TikTok', process.env.NEXT_PUBLIC_SOCIAL_TIKTOK]] as const)
    .flatMap(([label, url]) => url && /^https:\/\/[^\s]+$/.test(url) ? [{ label, url }] : []),
};
export function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined);
  if (!value) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.origin : undefined; } catch { return undefined; }
}
export function databaseConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)); }
export function whatsappUrl(message = 'Hello Strong Properties. I would like to enquire about property in Ghana.') {
  const number = site.whatsapp.replace(/\D/g, '');
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : undefined;
}
