import { siteUrl } from './config';
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const url = new URL(req.url);
  const host = req.headers.get('host');
  const allowed = new Set([url.origin, siteUrl()]);
  // Next's internal URL may use localhost; Host represents the browser-facing host.
  // Browsers cannot spoof Host. Do not trust arbitrary X-Forwarded-Host values here.
  if (host && !/[\s/\\]/.test(host)) allowed.add(`${url.protocol}//${host}`);
  return allowed.has(origin);
}
