import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import PropertyImage from '@/components/ui/PropertyImage';
import { requireEditor } from '@/lib/admin-auth';
import { mediaReview, mediaReviewIndex, propertyMediaReview, mediaReviewEvidence } from '@/lib/media-review';
import { formatPrice } from '@/lib/data';
export const dynamic = 'force-dynamic';

export default async function MediaReview() {
  const person = await requireEditor(), index = await mediaReviewIndex();
  const reports = (await Promise.all(index.batches.map(mediaReview))).filter(r => r !== undefined);
  const states = new Map((await Promise.all(reports.flatMap(r=>r.groups.filter(g=>g.propertyId).map(async g=>[g.propertyId!,await propertyMediaReview(g.propertyId!)] as const)))));
  const evidence = new Map(await Promise.all(reports.map(async r=>[r.id,await mediaReviewEvidence(r.id)] as const)));
  return <AdminShell person={person}><span className="eyebrow">INVENTORY / PRIVATE SOURCE REVIEW</span><h1>Media review</h1><p className="note">Source captions are proposals, not verified listing facts. Review each original, correct the draft, and confirm identity, current availability and permission before publication. This area is restricted to property editors.</p>
    {!reports.length && <div className="admin-panel"><h2>No media batches yet.</h2><p>Run the documented private media import after visual review.</p></div>}
    {reports.map(report => <section key={report.id} className="media-review-batch"><div className="admin-stats"><div className="admin-stat"><span>Originals retained</span><strong>{report.assets.length}</strong></div><div className="admin-stat"><span>Private draft candidates</span><strong>{report.groups.filter(g => g.propertyId).length}</strong></div><div className="admin-stat"><span>Exact duplicate files</span><strong>{report.assets.filter(a => a.duplicateOf).length}</strong></div></div>
      <div className="admin-panel"><h2>Source descriptions without a supported media match</h2><ul>{report.missingDescriptions.map(text => <li key={text}>{text}</li>)}</ul><p className="note">No listing is created for these descriptions. Missing values stay blank in the property editor.</p></div>
      {evidence.get(report.id) && <div className="admin-panel"><h2>Additional screenshot evidence</h2><p className="note">{evidence.get(report.id)!.source}. Visual matches support identification; captions do not verify current listing facts.</p><ul className="review-warnings">{evidence.get(report.id)!.findings.map((finding,i)=><li key={i}><strong>Originals {finding.sourceIds.join(', ')}:</strong> {finding.observation}{finding.proposedLabel && <> Proposed label: {finding.proposedLabel}.</>}{finding.requiresConfirmation && <> Caption association needs confirmation.</>}</li>)}</ul></div>}
      <nav className="review-index" aria-label="Media groups">{report.groups.map(group => <a key={group.id} href={`#group-${group.id}`}>{group.title}</a>)}</nav>
      {report.groups.map(group => <article key={group.id} id={`group-${group.id}`} className="admin-panel review-group"><div className="review-group-heading"><div><span className="eyebrow">{group.propertyId ? (states.get(group.propertyId)?.needsReview ? 'PRIVATE DRAFT · NEEDS REVIEW' : 'PRIVATE DRAFT · MEDIA IDENTITY CONFIRMED') : 'UNASSIGNED · NEEDS REVIEW'}</span><h2>{group.title}</h2><p className="note">Source group: {group.sourceMediaGroup}<br/>Manifest confidence: {group.confidence}</p></div>{group.propertyId && <div className="admin-actions"><Link className="admin-outline" href={`/admin/properties/${group.propertyId}/preview`}>Preview draft ↗</Link><Link className="admin-outline" href={`/admin/properties/${group.propertyId}`}>Edit verified details ↗</Link></div>}</div>
        <p><strong>Proposed source details:</strong> {group.proposed.location || 'Location unknown'}{group.proposed.city ? `, ${group.proposed.city}` : ''} · {group.proposed.beds == null ? 'Bedrooms unknown' : `${group.proposed.beds} bedrooms`} · {group.proposed.price == null ? 'Price unconfirmed' : formatPrice({ price: group.proposed.price, currency: 'GHS' })}</p>
        <ul className="review-warnings">{group.notes.map(note => <li key={note}>{note}</li>)}</ul><p className="note">{group.assignedAssetIds.length} originals assigned to draft · {group.assetIds.length} originals in source folder. Availability, publication rights, bathrooms and documentation require confirmation.</p>
        <div className="review-assets">{group.assetIds.map(id => {
          const asset = report.assets.find(a => a.id === id)!;
          const base = `/api/admin/media-review/${report.id}/${asset.id}`;
          return <figure key={asset.id}><a href={`${base}?variant=original`} target="_blank" rel="noopener noreferrer" className="review-thumb"><PropertyImage src={base} alt={`Original ${asset.sourceId}: ${asset.sourceFilename}`} sizes="(max-width:700px) 85vw, 300px"/><span>{asset.kind === 'video' ? `VIDEO · ${asset.duration?.toFixed(0) || '?'}s` : 'PHOTO'} · {asset.sourceId}</span></a><figcaption><strong>{asset.sourceFilename}</strong><span>{asset.duplicateOf ? 'Exact duplicate — retained, not added twice' : group.assignedAssetIds.includes(id) ? 'Assigned to private draft' : 'Unassigned — review required'}</span><small>{asset.sourceNotes}</small>{asset.notes.map(note => <small key={note} className="review-warning">{note}</small>)}<a href={`${base}?variant=original`} target="_blank" rel="noopener noreferrer">Open original {asset.kind} ↗</a></figcaption>{asset.kind === 'video' && <details><summary>Compare video frames</summary><div className="review-frames">{asset.frames.map((_, i) => <a key={i} href={`${base}?variant=frame-${i}`} target="_blank" rel="noopener noreferrer" className="review-frame"><PropertyImage src={`${base}?variant=frame-${i}`} alt={`Video ${asset.sourceId}, sample ${i + 1}`} sizes="150px"/></a>)}</div></details>}</figure>;
        })}</div>
      </article>)}
    </section>)}
  </AdminShell>;
}
