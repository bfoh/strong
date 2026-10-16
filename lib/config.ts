export const site = {
  name: 'Strong Properties', tagline: 'Strong Foundations. Lasting Legacies.', location: 'Kumasi, Ghana',
  // Populate only with verified company details. Broadcast overlays are not contact evidence.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '',
  // Rendered only when a verified profile URL is configured.
  social: ([['Instagram', process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM], ['Facebook', process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK], ['LinkedIn', process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN], ['X', process.env.NEXT_PUBLIC_SOCIAL_X], ['YouTube', process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE], ['TikTok', process.env.NEXT_PUBLIC_SOCIAL_TIKTOK]] as const)
    .flatMap(([label, url]) => url && /^https:\/\/[^\s]+$/.test(url) ? [{ label, url }] : []),
};
export function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.origin : undefined; } catch { return undefined; }
}
export function databaseConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)); }
