import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { houseEnquiryHandler } from '../../lib/house/enquiries';
import { defaultHouseSettings, houseSettingsSchema } from '../../lib/house/config';
import { portalRect } from '../../lib/house/portal';
const input = { name: 'Homepage QA', phone: '+233 000 111 222', email: 'qa@example.invalid', message: 'Synthetic unit test', website: '', propertyId: '', interest: 'An illustrative home' };
function request(body: unknown, id = randomUUID(), origin = 'http://localhost:3000') { return new Request('http://localhost:3000/api/house-enquiries', { method: 'POST', headers: { origin, 'content-type': 'application/json', 'idempotency-key': id }, body: JSON.stringify(body) }); }
function setup(fail = false) {
  const oldFetch = globalThis.fetch, oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey = process.env.SUPABASE_SECRET_KEY, oldLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://house-unit.example.test'; process.env.SUPABASE_SECRET_KEY = 'synthetic-test-key'; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const objects = new Map<string, string>(); let reads = 0;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname; reads++;
    if (path.endsWith('/bucket/strong-homepage-private')) return json({ id: 'strong-homepage-private', public: false });
    const key = path.split('/object/strong-homepage-private/')[1];
    if (!key) throw Error('Unexpected synthetic storage request');
    if (init?.method === 'POST') {
      if (fail) return json({ message: 'Synthetic outage', statusCode: '503' }, 503);
      if (objects.has(key)) return json({ message: 'The resource already exists', statusCode: '409' }, 409);
      objects.set(key, String(init.body)); return json({ Key: key });
    }
    return objects.has(key) ? new Response(objects.get(key), { headers: { 'content-type': 'application/json' } }) : json({ message: 'Object not found', statusCode: '404' }, 404);
  };
  return { objects, reads: () => reads, restore: () => {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [['NEXT_PUBLIC_SUPABASE_URL', oldUrl], ['SUPABASE_SECRET_KEY', oldKey], ['SUPABASE_SERVICE_ROLE_KEY', oldLegacy]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
  } };
}
test('homepage settings reject unsupported image paths and motion outside mobile limits', () => {
  assert.equal(houseSettingsSchema.safeParse(defaultHouseSettings).success, true);
  assert.equal(houseSettingsSchema.safeParse({ ...defaultHouseSettings, images: { ...defaultHouseSettings.images, team: '/api/house-images/../../enquiries' } }).success, false);
  assert.equal(houseSettingsSchema.safeParse({ ...defaultHouseSettings, motion: { ...defaultHouseSettings.motion, mobileDuration: 900 } }).success, false);
});
test('general enquiries reject cross-origin, bot and invalid data before storage', async () => {
  const mock = setup();
  try {
    assert.equal((await houseEnquiryHandler(request(input, undefined, 'https://untrusted.test'))).status, 403);
    assert.equal((await houseEnquiryHandler(request({ ...input, website: 'bot' }))).status, 400);
    assert.equal((await houseEnquiryHandler(request({ ...input, phone: 'invalid' }))).status, 400);
    assert.equal(mock.reads(), 0);
  } finally { mock.restore(); }
});
test('general enquiry retries are idempotent; a changed payload cannot reuse an identifier', async () => {
  const mock = setup(), id = randomUUID();
  try {
    assert.equal((await houseEnquiryHandler(request(input, id))).status, 201);
    assert.equal((await houseEnquiryHandler(request(input, id))).status, 200);
    assert.equal((await houseEnquiryHandler(request({ ...input, message: 'Different request' }, id))).status, 409);
    assert.equal([...mock.objects.keys()].filter(k => k.startsWith('enquiries/')).length, 1);
    assert.equal([...mock.objects.keys()].filter(k => k.startsWith('quotas/')).length, 1);
  } finally { mock.restore(); }
});
test('general enquiry quota uses create-only storage slots across requests', async () => {
  const mock = setup();
  try {
    for (let i = 0; i < 5; i++) assert.equal((await houseEnquiryHandler(request({ ...input, phone: '+233 000 111 333', message: 'Synthetic request ' + i }))).status, 201);
    assert.equal((await houseEnquiryHandler(request({ ...input, phone: '+233 000 111 333' }))).status, 429);
    assert.equal([...mock.objects.keys()].filter(k => k.startsWith('enquiries/')).length, 5);
  } finally { mock.restore(); }
});
test('general enquiry storage failure never produces success', async () => {
  const mock = setup(true);
  try {
    const response = await houseEnquiryHandler(request({ ...input, phone: '+233 000 111 444' }));
    assert.equal(response.status, 503); assert.equal((await response.json()).ok, undefined);
    assert.equal(mock.objects.size, 0);
  } finally { mock.restore(); }
});
test('a viewing request must select a genuine property before any storage operation', async () => {
  const mock = setup();
  try {
    assert.equal((await houseEnquiryHandler(request({ ...input, requestType: 'viewing' }))).status, 400);
    assert.equal(mock.reads(), 0);
  } finally { mock.restore(); }
});
test('house viewing requests use the existing requested appointment workflow', async () => {
  const mock = setup(), id = randomUUID(); let saved: Record<string, unknown> | undefined;
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    if (path.endsWith('/properties')) return json([{ id }]);
    if (path.endsWith('/consume_public_lead_quota')) return json(true);
    if (path.endsWith('/appointments')) {
      if (init?.method === 'POST') { saved = JSON.parse(String(init.body)); return new Response(null, { status: 201 }); }
      return json([]);
    }
    throw Error('Unexpected viewing test request');
  };
  try {
    const response = await houseEnquiryHandler(request({ ...input, phone: '+000 000 123 456', propertyId: id, requestType: 'viewing', preferredDate: '2099-01-15', preferredTime: '09:30' }));
    assert.equal(response.status, 201); assert.equal(saved?.status, 'requested');
    assert.equal(saved?.preferred_date, '2099-01-15'); assert.equal(saved?.preferred_time, '09:30');
  } finally { mock.restore(); }
});
test('doorway travel keeps the source photograph covering the viewport until the threshold clears it', () => {
  const source = { x: 0, y: 0, width: 1440, height: 900 };
  for (const x of [150, 590, 1030]) {
    const hole = { x, y: 165, width: 275, height: 425 };
    for (let i = 0; i <= 20; i++) {
      const projected = portalRect(source, hole, i / 20), scale = projected.width / hole.width;
      const tx = projected.x - hole.x * scale, ty = projected.y - hole.y * scale;
      assert.ok(tx <= .00001 && ty <= .00001);
      assert.ok(tx + source.width * scale >= source.width - .00001);
      assert.ok(ty + source.height * scale >= source.height - .00001);
    }
    const arrived = portalRect(source, hole, 1);
    assert.ok(arrived.x < 0 && arrived.x + arrived.width > source.width);
    assert.ok(arrived.y < 0 && arrived.y + arrived.height > source.height);
  }
});
