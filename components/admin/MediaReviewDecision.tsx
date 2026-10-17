'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';

export default function MediaReviewDecision({propertyId, gallerySignature, confirmed = false, evidence}: {propertyId: string; gallerySignature: string; confirmed?: boolean; evidence?: string}) {
  const router = useRouter();
  const [explanation, setExplanation] = useState(evidence || '');
  const [checkedSignature, setCheckedSignature] = useState('');
  const [blockedSignature, setBlockedSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, refresh] = useTransition();
  const [feedback, setFeedback] = useState<{kind: 'success' | 'error' | 'info'; text: string; signature?: string} | null>(null);
  const stale = blockedSignature === gallerySignature;
  const notice = feedback?.kind === 'success' && feedback.signature !== gallerySignature
    ? {kind: 'info', text: 'The gallery has changed. Review the current photos and videos and confirm the updated gallery.'}
    : feedback;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch('/api/admin/media-review/decision', {method: 'POST', headers: {Accept: 'application/json'}, body});
      const result = await response.json();
      if (!response.ok) {
        setCheckedSignature('');
        if (result.code === 'gallery_changed') setBlockedSignature(gallerySignature);
        setFeedback({kind: 'error', text: result.error || 'The confirmation could not be saved. Your explanation is still here. Please try again.'});
        return;
      }
      setCheckedSignature('');
      setFeedback({kind: 'success', signature: gallerySignature, text: 'Media identity confirmation saved. This property still needs its publication review.'});
      router.refresh();
    } catch {
      setFeedback({kind: 'error', text: 'The confirmation could not be saved. Your explanation is still here. Check your connection and try again.'});
    } finally {setBusy(false);}
  }

  function reloadGallery() {
    setCheckedSignature('');
    setBlockedSignature('');
    setFeedback({kind: 'info', text: 'Your explanation is still here. Review the current gallery in the private preview, then check the confirmation box again.'});
    refresh(() => router.refresh());
  }

  return <form id="media-confirmation" className="admin-form media-decision" action="/api/admin/media-review/decision" method="post" onSubmit={submit} aria-busy={busy || refreshing}>
    <input type="hidden" name="propertyId" value={propertyId}/>
    <input type="hidden" name="gallerySignature" value={gallerySignature}/>
    <h2>{confirmed ? 'Media identity confirmed' : 'Confirm the media match'}</h2>
    {evidence && <p className="note">Recorded evidence: {evidence}</p>}
    <p>Review the original files and draft gallery first. This confirms the media identity only. Verified details, permission and availability still require the normal property publication review.</p>
    <label>Evidence resolving the identity and any conflicts<textarea name="evidence" minLength={20} maxLength={2000} rows={3} required value={explanation} onChange={event => setExplanation(event.target.value)}/></label>
    <label className="review-check"><input name="confirmed" type="checkbox" required value="yes" checked={checkedSignature === gallerySignature} onChange={event => setCheckedSignature(event.target.checked ? gallerySignature : '')} disabled={busy || refreshing || stale}/>I have checked every gallery item against this specific property and resolved the source conflicts.</label>
    <button className="gold-btn" disabled={busy || refreshing || stale}>{busy ? 'Saving confirmation…' : 'Save media identity confirmation'}</button>
    {notice && <p className={`form-feedback ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    {(stale || notice?.kind === 'info') && <div className="admin-actions"><button type="button" className="admin-outline" disabled={refreshing} onClick={reloadGallery}>{refreshing ? 'Reloading gallery…' : 'Reload gallery for review'}</button><a className="admin-outline" href={`/admin/properties/${propertyId}/preview`} target="_blank" rel="noopener noreferrer">Open current private preview ↗</a></div>}
    <p className="note">Changing the gallery, captions or media order requires a new confirmation. Your explanation stays in this form while the gallery reloads. Saving it does not publish the draft.</p>
  </form>;
}
