'use client';
import { useRef, useState } from 'react';
import Link from './TrackedLink';
import BuyerFields from './BuyerFields';
import { useMarketing } from './MarketingProvider';
import type { Attribution } from '@/lib/marketing';
export default function GeneralEnquiry({ requestId, initialAttribution = {} }: { requestId: string; initialAttribution?: Attribution }) {
  const { attribution, track } = useMarketing(), [busy,setBusy] = useState(false), [feedback,setFeedback] = useState<{ok:boolean;text:string}|null>(null);
  const request = useRef<{ signature:string;id:string }|null>(null), lock = useRef(false);
  const campaign = Object.keys(attribution).length ? attribution : initialAttribution;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const form = event.currentTarget, fields = Object.fromEntries(new FormData(form));
    const { requestId: unused, ...values } = fields; void unused;
    const payload = { ...values, attribution: campaign, remoteViewing: fields.remoteViewing === 'true' };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature,id:crypto.randomUUID() };
    lock.current = true;setBusy(true);setFeedback(null);
    try {
      const response = await fetch('/api/house-enquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':request.current.id},body:JSON.stringify(payload)});
      const result = await response.json();if (!response.ok) throw Error(result.error || 'Your enquiry could not be saved. Please try again.');
      setFeedback({ok:true,text:'Your enquiry has been received. The team will use your contact details to follow up. A viewing is arranged only after confirmation.'});
      track('enquiry_submit');form.reset();request.current=null;
    } catch(error) {setFeedback({ok:false,text:error instanceof Error ? error.message : 'Unable to save your enquiry. Your details are still here; please try again.'});}
    finally {lock.current=false;setBusy(false);}
  }
  return <form className="general-enquiry" id="enquiry" action="/api/house-enquiries" method="post" onSubmit={submit} aria-busy={busy}><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="propertyId" value=""/><input type="hidden" name="attribution" value={JSON.stringify(campaign)}/><p className="kicker">Start a conversation</p><h2>Tell us what’s next.</h2><p>A home, land, a commercial space or a question about buying from abroad.</p><div className="buyer-fields"><label>YOUR NAME<input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Full name"/></label><label>PHONE NUMBER<input name="phone" type="tel" inputMode="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="Include your country code"/></label><label>EMAIL (OPTIONAL)<input name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com"/></label><BuyerFields/></div><label>YOUR MESSAGE<textarea name="message" rows={4} maxLength={2000} placeholder="Your preferred location, budget and questions…"/></label><div className="honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div><p className="form-privacy">We store your enquiry, voluntary preferences and campaign source to respond and understand how buyers find us. This does not subscribe you to marketing. <Link href="/privacy">Privacy notice</Link>.</p><button className="btn btn-dark" disabled={busy}>{busy?'Sending…':'Send my enquiry ↗'}</button>{feedback && <p className={'form-feedback '+(feedback.ok?'success':'error')} role={feedback.ok?'status':'alert'}>{feedback.text}</p>}</form>;
}
