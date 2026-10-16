// Test-only Supabase REST substitute. Never used by the public application or a live database.
import { createServer } from 'node:http';
const id = '11111111-1111-4111-8111-111111111111';
const draftId = '22222222-2222-4222-8222-222222222222';
const published = { id, slug: 'qa-residence', title: 'QA Residence — Test Only', category: 'residential', location: 'QA Location — Test Only', price: 123456, currency: 'GHS', description: 'A synthetic property exclusively for automated local tests. This is not company inventory.', image: '/images/properties/executive-residence.webp', images: ['/images/properties/executive-residence.webp', '/images/properties/executive-residence.webp?test-gallery=2'], beds: 3, baths: 2, status: 'published', updated_at: '2026-10-12T10:00:00Z' };
const draft = { ...published, id: draftId, slug: 'qa-private-draft', status: 'draft' };
const requests = [], queries = [];
function json(res, data, status = 200, count) { res.writeHead(status, { 'content-type': 'application/json', ...(count != null ? { 'content-range': `0-${Math.max(0, count - 1)}/${count}` } : {}) }); res.end(JSON.stringify(data)); }
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/_qa/requests') return json(res, { requests, queries });
  if (url.pathname === '/rest/v1/rpc/public_property_locations') return json(res, [{ location: published.location }]);
  if (url.pathname === '/rest/v1/properties') {
    queries.push(Object.fromEntries(url.searchParams));
    const rows = [published, draft].filter(p => [...url.searchParams].every(([key, value]) => {
      if (['status', 'id', 'slug', 'category', 'location'].includes(key)) return value.startsWith('eq.') ? p[key] === value.slice(3) : value.startsWith('neq.') ? p[key] !== value.slice(4) : true;
      return true;
    }));
    return json(res, rows, 200, rows.length);
  }
  if (url.pathname === '/rest/v1/property_features') return json(res, [{ plot_size_sqm: 500, building_size_sqm: 200, tenure: 'QA tenure — test only', documentation_status: 'QA documentation — test only', amenities: ['QA feature — test only'] }]);
  if (url.pathname === '/rest/v1/property_media') return json(res, []);
  if (['/rest/v1/enquiries', '/rest/v1/appointments'].includes(url.pathname) && req.method === 'POST') {
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    if (payload.name === 'QA Storage Failure') return json(res, { message: 'Synthetic storage failure', code: 'QA_ERROR' }, 500);
    requests.push({ kind: url.pathname.split('/').at(-1), ...payload });
    res.writeHead(201); return res.end();
  }
  return json(res, { message: 'Unknown test endpoint' }, 404);
}).listen(3002, '127.0.0.1', () => console.log('Test-only database mock ready on 127.0.0.1:3002'));
