import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import AdminShell from '@/components/AdminShell';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertySpecifications from '@/components/properties/PropertySpecifications';
import { requireEditor } from '@/lib/admin-auth';
import { db } from '@/lib/server';
import { propertyMediaReview } from '@/lib/media-review';
import { parseStorageReference } from '@/lib/media';
import { videoPoster } from '@/lib/media-posters';
import { formatPrice, type PropertyDetail, type PropertyMedia } from '@/lib/data';
export const dynamic = 'force-dynamic';

export default async function DraftPreview({ params }: { params: Promise<{ id: string }> }) {
  const person = await requireEditor(), parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const client = db()!, result = await client.from('properties').select('id,slug,title,category,location,price,currency,description,image,images,beds,baths,status').eq('id', parsed.data).maybeSingle();
  if (result.error || !result.data) notFound();
  const [media, review] = await Promise.all([client.from('property_media').select('id,kind,url,caption').eq('property_id', parsed.data).neq('kind', 'document').order('sort_order'), propertyMediaReview(parsed.data)]);
  if (media.error) throw Error('Draft media could not be loaded.');
  const safe = (media.data || []).flatMap(m => {
    const ref = parseStorageReference(m.url);
    return ref && ref.propertyId === parsed.data && ref.mediaId === m.id ? [{ id: m.id, kind: m.kind, url: `/api/media/${m.id}`, caption: m.caption } as PropertyMedia] : [];
  });
  const images = safe.filter(m => m.kind === 'image').map(m => ({ url: m.url, caption: m.caption || 'Supplied property image' }));
  const videos = await Promise.all(safe.filter(m => m.kind === 'video').map(async m => ({ ...m, poster: await videoPoster(m.id, parsed.data) })));
  const p = { ...result.data, media: safe } as PropertyDetail;
  return <AdminShell person={person}><div className="admin-actions"><Link href="/admin/media-review" className="admin-outline">← Media review</Link><Link href={`/admin/properties/${p.id}`} className="admin-outline">Edit draft ↗</Link></div><p className="preview-note">PRIVATE DRAFT · Not offered for sale. {review?.needsReview ? 'The media match and source captions require confirmation.' : 'Complete the normal publication review before making this property public.'}</p><div className="review-preview-title"><div><span className="eyebrow">RESIDENTIAL COLLECTION / STAFF PREVIEW</span><h1>{p.title}</h1><p>{p.location}</p></div><strong>{formatPrice(p)}</strong></div><PropertyGallery images={images} title={p.title} preview={false}/><section className="detail-block"><h2>Verified details</h2><p>{p.description}</p><PropertySpecifications property={p}/></section>{videos.length > 0 && <section className="detail-block"><h2>Property tours</h2><p className="note">Original source videos. Embedded captions and contact numbers are unverified and remain unaltered.</p><div className="video-gallery">{videos.map(v => <figure key={v.id}><video controls playsInline preload="none" poster={v.poster} aria-label={v.caption || 'Supplied property tour'}><source src={v.url}/></video><figcaption>{v.caption}</figcaption></figure>)}</div></section>}</AdminShell>;
}
