'use client';
import { useEffect, useState } from 'react';
import { safeMediaUrl } from '@/lib/data';
import { parseStorageReference, type MediaRecord } from '@/lib/media';
export default function MediaManager({ propertyId }: { propertyId: string }) {
  const [media, setMedia] = useState<MediaRecord[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function load() {
    const response = await fetch(`/api/admin/media?propertyId=${propertyId}`, { cache: 'no-store' });
    if (!response.ok) throw Error('The gallery could not be loaded.');
    setMedia((await response.json()).media);
  }
  useEffect(() => { let active = true; fetch(`/api/admin/media?propertyId=${propertyId}`, { cache: 'no-store' }).then(async response => { if (!response.ok) throw Error(); const data = await response.json(); if (active) setMedia(data.media); }).catch(() => { if (active) setMessage('The gallery could not be loaded.'); }); return () => { active = false; }; }, [propertyId]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage('');
    try {
      const body = new FormData(form); body.set('propertyId', propertyId);
      if (body.get('kind') === 'document') body.set('visibility', 'private');
      const response = await fetch('/api/admin/media', { method: 'POST', body }); const result = await response.json();
      if (!response.ok) throw Error(result.error || 'The upload failed.');
      form.reset(); await load(); setMessage(result.cleanupPending ? 'Replacement saved. Old-file cleanup needs attention; please contact your administrator.' : 'Media saved. Public media appears only while the property is published.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The upload failed.'); } finally { setBusy(false); }
  }
  async function move(index: number, direction: number) {
    const next = [...media], target = index + direction; if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; setBusy(true); setMessage('');
    try { const response = await fetch('/api/admin/media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId, ids: next.map(m => m.id) }) }); if (!response.ok) throw Error(); await load(); setMessage('Gallery order saved.'); } catch { setMessage('The order could not be saved. Refresh and try again.'); } finally { setBusy(false); }
  }
  async function remove(item: MediaRecord) {
    if (!window.confirm('Permanently remove this file from the property gallery and storage?')) return;
    setBusy(true); setMessage('');
    try { const response = await fetch(`/api/admin/media?id=${item.id}`, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) throw Error(result.error); await load(); setMessage('Media removed.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Media could not be removed.'); } finally { setBusy(false); }
  }
  return <section className="admin-panel media-manager" aria-labelledby="media-heading"><h2 id="media-heading">Property media</h2><p className="note">JPEG, PNG or WebP images up to 12MB; MP4/WebM videos up to 50MB; private PDFs up to 10MB. Images are optimised automatically. Uploads remain in private storage. The first public image in the gallery becomes the listing cover.</p><form className="admin-form" onSubmit={upload}><label>Media type<select name="kind"><option value="image">Image</option><option value="video">Video</option><option value="document">Private document</option></select></label><label>File<input name="file" type="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"/></label><label>Caption<textarea name="caption" maxLength={300} rows={2}/></label><label>Visibility<select name="visibility" defaultValue="private"><option value="private">Staff only</option><option value="public">Public when the property is published</option></select></label><label>Replace existing media (optional)<select name="replaceId" defaultValue=""><option value="">Add a new file</option>{media.map(m => <option key={m.id} value={m.id}>{m.caption || m.kind} · #{m.sort_order + 1}</option>)}</select></label><button className="gold-btn" disabled={busy}>{busy ? 'Working…' : 'Upload media'}</button></form>{message && <p role="status" className="note">{message}</p>}<ol className="admin-media-list">{media.map((item, index) => { const stored = parseStorageReference(item.url); return <li key={item.id}><div><strong>{item.caption || `${item.kind} ${index + 1}`}</strong><small>{item.kind} · {stored?.visibility === 'public' && item.kind !== 'document' ? 'Public when published' : 'Staff only'}</small></div><div><a className="admin-outline" href={stored ? `/api/media/${item.id}` : safeMediaUrl(item.url)} target="_blank" rel="noopener noreferrer">View</a><button disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Move media ${index + 1} up`}>↑</button><button disabled={busy || index === media.length - 1} onClick={() => move(index, 1)} aria-label={`Move media ${index + 1} down`}>↓</button><button disabled={busy} onClick={() => remove(item)}>Remove</button></div></li>; })}</ol>{media.length === 0 && <p className="note">No uploaded media yet. Save the property first, then add its gallery.</p>}</section>;
}
