import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import AdminShell from '@/components/AdminShell';
import PropertyEditor from '@/components/PropertyEditor';
import MediaManager from '@/components/admin/MediaManager';
import MediaReviewDecision from '@/components/admin/MediaReviewDecision';
import { propertyMediaReview } from '@/lib/media-review';
import { requireEditor } from '@/lib/admin-auth';
import { db, launchSchemaAvailable } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const person = await requireEditor(), parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data, client = db()!;
  const result = await client.from('properties').select('*').eq('id',id).maybeSingle();
  if (result.error) throw Error('Property could not be loaded.');
  if (!result.data) notFound();
  const [features,review,launch] = await Promise.all([client.from('property_features').select('*').eq('property_id',id).maybeSingle(),propertyMediaReview(id),launchSchemaAvailable()]);
  if (features.error) throw Error('Property specifications could not be loaded.');
  return <AdminShell person={person}><span className="eyebrow">INVENTORY / EDIT</span><h1>Edit property</h1>
    {review && <div className="admin-panel"><h2>{review.needsReview ? 'Imported media requires review' : 'Media identity confirmed'}</h2><p>Source group: {review.group.sourceMediaGroup}. Source captions are proposals. Keep unconfirmed values blank.</p><ul>{review.group.notes.map(note=><li key={note}>{note}</li>)}</ul><div className="admin-actions"><Link className="admin-outline" href={`/admin/properties/${id}/preview`}>Preview private draft ↗</Link><Link className="admin-outline" href={`/admin/media-review#group-${review.group.id}`}>Review source files ↗</Link></div></div>}
    <PropertyEditor item={{...result.data,features:features.data}} launch={launch}/><MediaManager propertyId={id}/>
    {review && <MediaReviewDecision propertyId={id} gallerySignature={review.gallerySignature} confirmed={!review.needsReview} evidence={review.decision?.evidence}/>}
  </AdminShell>;
}
