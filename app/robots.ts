import type { MetadataRoute } from 'next';
import { databaseConfigured, siteUrl } from '@/lib/config';
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  if (!base || !databaseConfigured()) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/preview/'] }, sitemap: `${base}/sitemap.xml` };
}
