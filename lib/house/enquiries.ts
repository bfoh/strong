import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { enquirySchema } from '@/lib/lead-validation';
import { boundedBody } from '@/lib/request-body';
import { sameOrigin } from '@/lib/origin';
import { consumeRequestLimit } from '@/lib/request-limits';
import { publicLeadHandler } from '@/lib/public-leads';
import { privateHouseStorage } from './storage';
export const houseEnquirySchema = enquirySchema.omit({ propertyId: true }).extend({
  propertyId: z.union([z.string().uuid(), z.literal('')]).optional(),
  interest: z.string().trim().max(300).optional(),
  requestType: z.enum(['enquiry', 'viewing']).optional(),
  preferredDate: z.string().max(10).optional(),
  preferredTime: z.string().max(5).optional(),
}).strict();
export type GeneralEnquiry = z.infer<typeof houseEnquirySchema> & { id: string; createdAt: string; signature: string };
const uuid = z.string().uuid();
const missing = (error: { statusCode?: string | number; message?: string } | null) => error && (['400', '404'].includes(String(error.statusCode)) && /not found|does not exist/i.test(error.message || ''));
export async function houseEnquiryHandler(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'This request origin is not allowed.' }, { status: 403 });
  if (!req.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Please submit this form as JSON.' }, { status: 415 });
  let data: z.infer<typeof houseEnquirySchema>;
  try { data = houseEnquirySchema.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req, 10000)))); }
  catch { return NextResponse.json({ error: 'Please check your name, phone number, email and message.' }, { status: 400 }); }
  const id = req.headers.get('idempotency-key');
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: 'Please refresh the form and try again.' }, { status: 400 });
  if (data.requestType === 'viewing' && !data.propertyId) return NextResponse.json({ error: 'Choose a published property to request a viewing.' }, { status: 400 });
  if (data.propertyId) {
    const payload = { name: data.name, phone: data.phone, email: data.email || '', message: data.message || data.interest || '', website: data.website || '', propertyId: data.propertyId };
    const viewing = data.requestType === 'viewing';
    return publicLeadHandler(viewing ? 'appointments' : 'enquiries')(new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({ ...payload, ...(viewing ? { preferredDate: data.preferredDate, preferredTime: data.preferredTime } : {}) }) }));
  }
  const normalized = { ...data, phone: data.phone.replace(/\D/g, ''), propertyId: '' };
  const signature = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  const path = 'enquiries/' + id + '.json';
  try {
    const storage = await privateHouseStorage();
    const read = async () => {
      const existing = await storage.download(path);
      if (existing.data) return JSON.parse(await existing.data.text()) as GeneralEnquiry;
      if (existing.error && !missing(existing.error)) throw Error('Storage read failed.');
      return null;
    };
    const acknowledge = (existing: GeneralEnquiry) => existing.signature === signature
      ? NextResponse.json({ ok: true, duplicate: true, status: 'new' })
      : NextResponse.json({ error: 'This request identifier was already used. Please refresh the form.' }, { status: 409 });
    const existing = await read(); if (existing) return acknowledge(existing);
    const contactHash = createHash('sha256').update(normalized.phone).digest('hex');
    if (!consumeRequestLimit('house:' + contactHash, 10)) return NextResponse.json({ error: 'Too many requests. Please try again in ten minutes.' }, { status: 429 });
    // Storage create-only writes reserve five unique slots across server instances.
    // No schema migration or fake property record is needed for a general enquiry.
    const window = Math.floor(Date.now() / 600000);
    let reserved = false;
    for (let slot = 0; slot < 5; slot++) {
      const result = await storage.upload('quotas/' + contactHash + '-' + window + '-' + slot + '.json', JSON.stringify({ id, expires: (window + 1) * 600000 }), { contentType: 'application/json', upsert: false });
      if (!result.error) { reserved = true; break; }
      if (String(result.error.statusCode) !== '409' && !/already exists|duplicate/i.test(result.error.message)) throw Error('Quota protection unavailable.');
    }
    if (!reserved) return NextResponse.json({ error: 'Too many requests. Please try again in ten minutes.' }, { status: 429, headers: { 'Retry-After': '600' } });
    const record: GeneralEnquiry = { ...normalized, id: id!, signature, createdAt: new Date().toISOString() };
    const saved = await storage.upload(path, JSON.stringify(record), { contentType: 'application/json', upsert: false, cacheControl: '0' });
    if (saved.error) { const retry = await read(); if (retry) return acknowledge(retry); throw Error('Save failed.'); }
    return NextResponse.json({ ok: true, status: 'new' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Your enquiry could not be saved. Your details are still in the form; please try again.' }, { status: 503 }); }
}
export async function generalEnquiries() {
  const storage = await privateHouseStorage();
  const listed = await storage.list('enquiries', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  if (listed.error) throw Error('General enquiries could not be loaded.');
  return Promise.all((listed.data || []).filter(f => uuid.safeParse(f.name.replace('.json', '')).success).map(async f => {
    const { data, error } = await storage.download('enquiries/' + f.name);
    if (error || !data) throw Error('An enquiry could not be loaded.');
    const record = JSON.parse(await data.text());
    return { ...houseEnquirySchema.parse(recordWithoutInternal(record)), id: uuid.parse(record.id), createdAt: String(record.createdAt) };
  }));
}
function recordWithoutInternal(record: GeneralEnquiry) {
  const { id, createdAt, signature, ...fields } = record;
  void id; void createdAt; void signature;
  return fields;
}
