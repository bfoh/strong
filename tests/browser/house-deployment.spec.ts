import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const host = 'strong-properties.example';
const headers = { Host: host };

test('production homepage renders for a deployed host while the draft remains private', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop');
  const home = await request.get('/', { headers });
  expect(home.status()).toBe(200);
  const html = await home.text();
  for (const text of ['A place for what’s next.', 'Listings', 'Our Team', 'Contact Us', 'The Garden Residence']) expect(html).toContain(text);
  expect(html).not.toMatch(/(?:property="og:image"|rel="canonical")[^>]*(?:127\.0\.0\.1|localhost|strong-properties\.example)/);
  const exterior = await request.get('/images/house-v1/exterior-desktop.webp', { headers });
  expect(exterior.status()).toBe(200);
  expect(exterior.headers()['content-type']).toContain('image/webp');
  expect((await request.get('/preview/house', { headers })).status()).toBe(404);
});

test('deployed enquiry endpoint validates origin and input instead of returning the preview 404', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop');
  const invalid = { name: '', phone: '' };
  const rejected = await request.post('/api/house-enquiries', {
    headers: { ...headers, Origin: 'https://untrusted.example', 'Idempotency-Key': randomUUID() }, data: invalid,
  });
  expect(rejected.status()).toBe(403);
  const validated = await request.post('/api/house-enquiries', {
    headers: { ...headers, Origin: 'http://' + host, 'Idempotency-Key': randomUUID() }, data: invalid,
  });
  expect(validated.status()).toBe(400);
  expect((await validated.json()).error).toContain('Please check');
  const editor = await request.put('/api/admin/house-settings', { headers: { ...headers, Origin: 'http://' + host }, data: {} });
  expect(editor.status()).toBe(403);
});
