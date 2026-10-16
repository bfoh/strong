'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
export default function LeadForm({ propertyId, preview = false }: { propertyId: string; preview?: boolean }) {
  const locked = useRef(false), request = useRef<{ signature: string; id: string } | null>(null);
  const [kind, setKind] = useState<'enquiries' | 'appointments'>('appointments'), [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return; locked.current = true; const form = event.currentTarget;
    const payload = { ...Object.fromEntries(new FormData(form)), propertyId };
    const signature = JSON.stringify({ kind, payload });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch(`/api/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.current.id }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Your request could not be sent. Please try again.');
      setFeedback({ text: kind === 'appointments' ? 'Your viewing request has been received. Your preferred date and time are not confirmed. The team will contact you to arrange the details.' : 'Your enquiry has been received. The team will follow up using the contact details you provided.', success: true });
      form.reset(); request.current = null;
    } catch (error) { setFeedback({ text: error instanceof Error ? error.message : 'Unable to send your request. Please try again.', success: false }); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="lead-box" id="viewing" aria-labelledby="viewing-title"><span className="eyebrow">LET’S TAKE THE NEXT STEP</span><h2 id="viewing-title">A closer look<br/><em>starts here.</em></h2>{preview ? <div className="preview-form-note"><p>This is an unverified media preview. Enquiries and viewing requests will be available for published properties.</p><Link href="/properties" className="button button-secondary">Explore the collection <ArrowUpRight size={16}/></Link></div> : <><p>Ask a question or request a preferred viewing time. A request becomes an appointment only after the team confirms it.</p><div className="switch" role="group" aria-label="Request type"><button type="button" disabled={busy} className={kind === 'appointments' ? 'active' : ''} aria-pressed={kind === 'appointments'} onClick={() => { setKind('appointments'); setFeedback(null); }}>Request a viewing</button><button type="button" disabled={busy} className={kind === 'enquiries' ? 'active' : ''} aria-pressed={kind === 'enquiries'} onClick={() => { setKind('enquiries'); setFeedback(null); }}>Make an enquiry</button></div><form onSubmit={submit} aria-busy={busy}><label>YOUR NAME<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Full name"/></label><label>PHONE NUMBER<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} placeholder="Your contact number"/></label><label>EMAIL (OPTIONAL)<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/></label>{kind === 'appointments' && <div className="lead-date-time"><label>PREFERRED DATE<input name="preferredDate" type="date" required min={new Date().toISOString().slice(0, 10)}/></label><label>PREFERRED TIME (GHANA)<input name="preferredTime" type="time" required/></label></div>}<label>YOUR MESSAGE<textarea name="message" rows={3} maxLength={2000} placeholder="Tell us what you would like to know"/></label><div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div><button disabled={busy} className="gold-btn" type="submit">{busy ? 'Sending your request…' : kind === 'appointments' ? 'Send viewing request' : 'Send enquiry'}<ArrowUpRight size={16}/></button><p className="form-privacy">We use your details to respond to this request. Read our <Link href="/privacy">privacy notice</Link>.</p>{feedback && <p className={`form-feedback ${feedback.success ? 'success' : 'error'}`} role={feedback.success ? 'status' : 'alert'}>{feedback.text}</p>}</form></>}</section>;
}
