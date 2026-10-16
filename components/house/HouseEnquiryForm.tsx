'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import type { HouseListing } from '@/lib/house/config';
export default function HouseEnquiryForm({ listings, interest, requestId, initialProperty }: { listings: HouseListing[]; interest: string; requestId: string; initialProperty: string }) {
  const request = useRef<{ signature: string; id: string } | null>(null), lock = useRef(false);
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [propertyId, setPropertyId] = useState(initialProperty), [kind, setKind] = useState<'enquiry' | 'viewing'>('enquiry');
  useEffect(() => { if (initialProperty) setPropertyId(initialProperty); }, [initialProperty]);
  const real = listings.filter(p => !p.demo);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const form = event.currentTarget;
    const payload = { ...Object.fromEntries(new FormData(form)), interest, requestType: kind };
    delete (payload as Record<string, unknown>).requestId;
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    lock.current = true; setBusy(true); setFeedback(null);
    try {
      const response = await fetch('/api/house-enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.current.id }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Your enquiry could not be saved. Please try again.');
      setFeedback({ ok: true, text: kind === 'viewing' ? 'Your viewing request has been received. Your preferred date and time are not confirmed. The team will contact you to arrange the details.' : 'Your enquiry has been received. The team will use your contact details to follow up.' });
      form.reset(); request.current = null;
    } catch (error) { setFeedback({ ok: false, text: error instanceof Error ? error.message : 'Unable to send. Your entered details are still here; please try again.' }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="house-contract" onSubmit={submit} aria-busy={busy} action="/api/house-enquiries" method="post">
    <input type="hidden" name="requestId" value={requestId}/>
    <input type="hidden" name="interest" value={interest}/>
    <div className="house-contract-heading"><span>STRONG PROPERTIES</span><span>KUMASI, GHANA</span></div>
    <p className="house-eyebrow">A NEW CHAPTER / AN OPEN CONVERSATION</p>
    <h3>Property enquiry</h3>
    <p className="house-form-intro">Tell us what you have in mind. We’ll take it from here.</p>
    {interest && <p className="house-interest"><Check size={15} aria-hidden="true"/> {interest}</p>}
    <div className="house-field-pair">
      <label>Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Full name"/></label>
      <label>Phone number<input name="phone" type="tel" inputMode="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="+233 …"/></label>
    </div>
    <label>Email <span>(optional)</span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/></label>
    <label>What are you looking for?<select name="propertyId" value={propertyId} onChange={event => { setPropertyId(event.target.value); if (!event.target.value) setKind('enquiry'); }}><option value="">A home, land or commercial opportunity</option>{real.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    {real.length > 0 && <><label className="house-viewing-choice"><input name="requestType" value="viewing" type="checkbox" disabled={!propertyId || busy} checked={kind === 'viewing'} onChange={event => setKind(event.target.checked ? 'viewing' : 'enquiry')}/> I’d like to request a viewing</label>{!propertyId && <p className="house-form-note">Choose a published property above to request a viewing.</p>}</>}
    {kind === 'viewing' && <div className="house-field-pair"><label>Preferred date<input name="preferredDate" type="date" required min={new Date().toISOString().slice(0,10)}/></label><label>Preferred time (Ghana)<input name="preferredTime" type="time" required/></label></div>}
    <label>Your message <span>(optional)</span><textarea name="message" rows={3} maxLength={2000} placeholder="A little about your plans, preferences or questions…"/></label>
    <div className="house-honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    <div className="house-contract-signoff"><span>Your next chapter begins with a conversation.</span><span aria-hidden="true">Strong Properties</span></div>
    <button className="house-button is-dark" type="submit" disabled={busy}>{busy ? 'Sending your request…' : kind === 'viewing' ? 'Send viewing request' : 'Send my enquiry'}<ArrowUpRight size={17} aria-hidden="true"/></button>
    <p className="house-form-note">This requests contact and does not purchase or reserve a property. We use your details to respond to your request. <Link href="/privacy">Privacy notice</Link>.</p>
    {feedback && <p className={'house-feedback ' + (feedback.ok ? 'is-success' : 'is-error')} role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
  </form>;
}
