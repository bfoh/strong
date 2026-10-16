import 'server-only';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from './server';
import { sameOrigin } from './origin';
import { consumeRequestLimit } from './request-limits';
import { appointmentSchema, enquirySchema, futurePreference } from './lead-validation';
import { boundedBody, BodyTooLargeError } from './request-body';
function stableUuid(value: string) {
  const hex = createHash('sha256').update(value).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function publicLeadHandler(kind: 'enquiries' | 'appointments') {
  return async (req: Request) => {
    if (req.headers.get('origin') && !sameOrigin(req)) return NextResponse.json({ error: 'This request origin is not allowed.' }, { status: 403 });
    if (!req.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Please submit the request as JSON.' }, { status: 415 });
    if (Number(req.headers.get('content-length')) > 10000) return NextResponse.json({ error: 'Your request is too large.' }, { status: 413 });
    try {
      const body = new TextDecoder().decode(await boundedBody(req, 10000));
      const input = JSON.parse(body);
      const base = kind === 'appointments' && input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).filter(([key]) => !['preferredDate', 'preferredTime'].includes(key))) : input;
      const parsed = enquirySchema.safeParse(base), preference = kind === 'appointments' ? appointmentSchema.safeParse(input) : undefined;
      if (!parsed.success || preference && !preference.success) return NextResponse.json({ error: 'Please check your name, phone, email and preferred date and time.' }, { status: 400 });
      const d = parsed.data;
      if (preference?.success && !futurePreference(preference.data.preferredDate, preference.data.preferredTime)) return NextResponse.json({ error: 'Choose a future date and time in Ghana time.' }, { status: 400 });
      const client = db();
      if (!client) return NextResponse.json({ error: 'Requests are temporarily unavailable. Please try again later.' }, { status: 503 });
      const phone = d.phone.replace(/\D/g, ''), contactHash = createHash('sha256').update(`${d.propertyId}:${phone}`).digest('hex');
      if (!consumeRequestLimit(`lead:${contactHash}`, 10)) return NextResponse.json({ error: 'Too many requests. Please wait ten minutes before trying again.' }, { status: 429, headers: { 'Retry-After': '600' } });
      const listing = await client.from('properties').select('id').eq('id', d.propertyId).eq('status', 'published').maybeSingle();
      if (listing.error) return NextResponse.json({ error: 'We could not check this property. Please try again.' }, { status: 503 });
      if (!listing.data) return NextResponse.json({ error: 'This property is not available for public enquiries.' }, { status: 404 });
      const payload = { property_id: d.propertyId, name: d.name, phone, email: d.email || null, message: d.message || null,
        ...(preference?.success ? { preferred_date: preference.data.preferredDate, preferred_time: preference.data.preferredTime, status: 'requested' } : { status: 'new' }) };
      const header = req.headers.get('idempotency-key');
      if (header && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(header)) return NextResponse.json({ error: 'Invalid request identifier.' }, { status: 400 });
      const id = header || stableUuid(`${kind}:${JSON.stringify(payload)}:${Math.floor(Date.now() / 600000)}`);
      const selected = kind === 'appointments' ? 'id,property_id,name,phone,email,message,preferred_date,preferred_time' : 'id,property_id,name,phone,email,message';
      const matches = (record: Record<string, unknown>) => Object.entries(payload).every(([key, value]) => key === 'status' || (key === 'preferred_time' ? String(record[key]).slice(0, 5) === value : record[key] === value));
      const acknowledgement = () => NextResponse.json({ ok: true, duplicate: true, status: kind === 'appointments' ? 'requested' : 'new' });
      const existing = await client.from(kind).select(selected).eq('id', id).maybeSingle();
      if (existing.error) return NextResponse.json({ error: 'Your request could not be checked. Please retry.' }, { status: 503 });
      if (existing.data) return matches(existing.data as unknown as Record<string, unknown>) ? acknowledgement() : NextResponse.json({ error: 'This request identifier was already used. Refresh the form and try again.' }, { status: 409 });
      const quota = await client.rpc('consume_public_lead_quota', { p_key: contactHash, p_limit: 5, p_window_seconds: 600 });
      if (quota.error) {
        if (quota.error.code !== 'PGRST202' || process.env.NODE_ENV === 'production' && process.env.ALLOW_LEGACY_LEAD_LIMIT !== 'true') return NextResponse.json({ error: 'Request protection is temporarily unavailable. Please try again later.' }, { status: 503 });
        // Development-only fallback until the additive atomic quota migration is applied.
        const since = new Date(Date.now() - 600000).toISOString();
        const counts = await Promise.all(['enquiries', 'appointments'].map(table => client.from(table).select('id', { count: 'exact', head: true }).eq('property_id', d.propertyId).eq('phone', phone).gte('created_at', since)));
        if (counts.some(result => result.error)) return NextResponse.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });
        if (counts.reduce((sum, result) => sum + (result.count || 0), 0) >= 5) return NextResponse.json({ error: 'Too many requests. Please wait ten minutes before trying again.' }, { status: 429, headers: { 'Retry-After': '600' } });
      } else if (quota.data !== true) return NextResponse.json({ error: 'Too many requests. Please wait ten minutes before trying again.' }, { status: 429, headers: { 'Retry-After': '600' } });
      const result = await client.from(kind).insert({ ...payload, id });
      if (result.error?.code === '23505') {
        const duplicate = await client.from(kind).select(selected).eq('id', id).maybeSingle();
        if (duplicate.data && matches(duplicate.data as unknown as Record<string, unknown>)) return acknowledgement();
        return NextResponse.json({ error: 'This request identifier was already used.' }, { status: 409 });
      }
      if (result.error) return NextResponse.json({ error: 'Your request could not be saved. Please try again.' }, { status: 503 });
      return NextResponse.json({ ok: true, status: kind === 'appointments' ? 'requested' : 'new' }, { status: 201 });
    } catch (error) {
      if (error instanceof BodyTooLargeError) return NextResponse.json({ error: 'Your request is too large.' }, { status: 413 });
      return NextResponse.json({ error: 'Invalid request. Please check the form and try again.' }, { status: 400 });
    }
  };
}
