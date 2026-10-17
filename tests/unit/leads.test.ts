import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appointmentSchema, enquirySchema, futurePreference, validDate, validTime } from '../../lib/lead-validation';
import { publicLeadHandler } from '../../lib/public-leads';
import { property, catalogue } from '../../lib/server';
import { parseFilters } from '../../lib/catalogue';
const id = '11111111-1111-4111-8111-111111111111';
const lead = { propertyId: id, name: 'Test Buyer', phone: '+233 000 000 000', email: 'buyer@example.test', message: 'Local automated test only' };
function request(payload: unknown, origin = 'http://localhost:3000', requestId?: string) { return new Request('http://localhost:3000/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json', origin, ...(requestId ? { 'idempotency-key': requestId } : {}) }, body: JSON.stringify(payload) }); }
function configured() { process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://local-supabase.example.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'; }
function clearConfig() { for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'ALLOW_LEGACY_LEAD_LIMIT']) delete process.env[key]; }
const json = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
test('viewing preferences reject invalid calendar dates, impossible times and past slots', () => {
  assert.equal(validDate('2028-02-29'), true); assert.equal(validDate('2027-02-29'), false); assert.equal(validDate('2026-04-31'), false);
  assert.equal(validTime('24:00'), false); assert.equal(validTime('12:60'), false); assert.equal(validTime('09:30'), true);
  assert.equal(futurePreference('2030-01-01', '09:00', Date.parse('2030-01-01T10:00Z')), false);
  assert.equal(futurePreference('2030-01-01', '11:00', Date.parse('2030-01-01T10:00Z')), true);
  assert.equal(appointmentSchema.safeParse({ ...lead, preferredDate: '2030-02-30', preferredTime: '08:00' }).success, false);
  for (const extra of [{ website: 'bot' }, { status: 'confirmed' }, { assigned_to: id }]) assert.equal(enquirySchema.safeParse({ ...lead, ...extra }).success, false);
  assert.equal(enquirySchema.safeParse({ ...lead, phone: 'letters-only' }).success, false);
});
test('unconfigured database never returns fake enquiry success', async () => {
  clearConfig(); const res = await publicLeadHandler('enquiries')(request(lead)); assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, undefined);
});
test('cross-origin requests and malformed input are rejected before storage', async () => {
  assert.equal((await publicLeadHandler('enquiries')(request(lead, 'https://untrusted.test'))).status, 403);
  assert.equal((await publicLeadHandler('enquiries')(request({ ...lead, propertyId: 'demo-1' }))).status, 400);
});
test('published-only queries, gallery filtering, pagination and requested appointments', async () => {
  configured(); const original = globalThis.fetch; const calls: { url: URL; method: string; body?: string }[] = [];
  let published = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); const method = init?.method || 'GET'; calls.push({ url, method, body: init?.body as string });
    if (url.pathname.endsWith('/properties')) {
      assert.equal(url.searchParams.get('status'), 'eq.published');
      return json(published ? [{ id, image: '', images: [] }] : [], 200, { 'content-range': '0-0/1' });
    }
    if (url.pathname === '/storage/v1/bucket/strong-media-review') return json({message:'Bucket not found',statusCode:'404'},404);
    if (url.pathname.endsWith('/property_media')) { assert.match(url.searchParams.get('or') || '', /public/); return json([]); }
    if (url.pathname.endsWith('/property_features')) return json([]);
    if (url.pathname.endsWith('/consume_public_lead_quota')) return json(true);
    if (url.pathname.endsWith('/appointments')) return method === 'POST' ? new Response(null, { status: 201 }) : json([]);
    throw Error('Unexpected test request ' + url.pathname);
  };
  try {
    assert.equal(await property('private-draft'), undefined);
    assert.equal((await publicLeadHandler('enquiries')(request(lead))).status, 404);
    published = true;
    const res = await publicLeadHandler('appointments')(request({ ...lead, preferredDate: '2099-01-15', preferredTime: '09:30' }));
    assert.equal(res.status, 201); assert.equal((await res.json()).status, 'requested');
    const insert = calls.find(c => c.url.pathname.endsWith('/appointments') && c.method === 'POST');
    assert.equal(JSON.parse(insert!.body!).status, 'requested'); assert.equal(JSON.parse(insert!.body!).preferred_time, '09:30');
    await property('published-detail');
    const detailMedia = calls.find(c => c.url.pathname.endsWith('/property_media') && c.url.searchParams.has('property_id'));
    assert.equal(detailMedia!.url.searchParams.get('kind'), 'neq.document');
    await catalogue(parseFilters({ page: '3', category: 'land', min: '100' }));
    const query = calls.findLast(c => c.url.pathname.endsWith('/properties'))!.url;
    assert.equal(query.searchParams.get('offset'), '18'); assert.equal(query.searchParams.get('limit'), '9'); assert.equal(query.searchParams.get('category'), 'eq.land');
  } finally { globalThis.fetch = original; clearConfig(); }
});
test('database quota rejects excess submissions across enquiries and appointments', async () => {
  configured(); const original = globalThis.fetch; let consumed = 0, inserts = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/properties')) return json([{ id }]);
    if (url.includes('/consume_public_lead_quota')) return json(++consumed <= 5);
    if (init?.method === 'POST') { inserts++; return new Response(null, { status: 201 }); }
    return json([]);
  };
  try {
    for (let i = 0; i < 5; i++) assert.equal((await publicLeadHandler('enquiries')(request({ ...lead, phone: '+233 000 000 999', message: `Test ${i}` }, undefined, randomUUID()))).status, 201);
    const limited = await publicLeadHandler('appointments')(request({ ...lead, phone: '+233 000 000 999', preferredDate: '2099-01-15', preferredTime: '09:30' }, undefined, randomUUID()));
    assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '600'); assert.equal(inserts, 5);
  } finally { globalThis.fetch = original; clearConfig(); }
});
test('idempotent retries acknowledge the same request without consuming quota or inserting again', async () => {
  configured(); const original = globalThis.fetch; let inserts = 0, quotas = 0; let saved: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('/properties')) return json([{ id }]);
    if (String(input).includes('/consume_public_lead_quota')) { quotas++; return json(true); }
    if (init?.method === 'POST') { inserts++; saved = JSON.parse(String(init.body)); return new Response(null, { status: 201 }); }
    return json(saved ? [saved] : []);
  };
  try {
    const uuid = randomUUID(), payload = { ...lead, phone: '+233 000 000 888' };
    assert.equal((await publicLeadHandler('enquiries')(request(payload, undefined, uuid))).status, 201);
    const duplicate = await publicLeadHandler('enquiries')(request(payload, undefined, uuid)); assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).duplicate, true);
    const conflict = await publicLeadHandler('enquiries')(request({ ...payload, message: 'Different payload' }, undefined, uuid)); assert.equal(conflict.status, 409);
    assert.equal(inserts, 1); assert.equal(quotas, 1);
  } finally { globalThis.fetch = original; clearConfig(); }
});
test('quota backend failures fail closed without inserting a request', async () => {
  configured(); const original = globalThis.fetch; let inserts = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('/properties')) return json([{ id }]);
    if (String(input).includes('/consume_public_lead_quota')) return json({ code: '42501', message: 'test permission error' }, 403);
    if (init?.method === 'POST') inserts++;
    return json([]);
  };
  try { assert.equal((await publicLeadHandler('enquiries')(request({ ...lead, phone: '+233 000 000 777' }))).status, 503); assert.equal(inserts, 0); }
  finally { globalThis.fetch = original; clearConfig(); }
});
