import 'server-only';
import { cache } from 'react';
import { db } from './server';
import { REVIEW_BUCKET, mediaReviewSchema, reviewIndexSchema, reviewDecisionSchema, supplementalEvidenceSchema } from './media-review-model';
import { mediaSignature } from './media-signature';

async function readPrivateJson(path: string, allowMissing = false): Promise<unknown> {
  const client = db();
  if (!client) return undefined;
  const bucket = await client.storage.getBucket(REVIEW_BUCKET);
  if (bucket.error && String(bucket.error.statusCode) === '404') return undefined;
  if (bucket.error || bucket.data?.public !== false) throw Error('Private media review storage could not be verified.');
  const result = await client.storage.from(REVIEW_BUCKET).download(path);
  if (allowMissing && result.error && String(result.error.statusCode) === '404') return undefined;
  if (result.error || !result.data) throw Error('Media review could not be loaded.');
  return JSON.parse(await result.data.text());
}
export const mediaReviewIndex = cache(async () => {
  const data = await readPrivateJson('index.json');
  return reviewIndexSchema.parse(data || { version: 1, batches: [], properties: {} });
});
export const mediaReview = cache(async (id: string) => {
  const index = await mediaReviewIndex();
  if (!index.batches.includes(id)) return undefined;
  return mediaReviewSchema.parse(await readPrivateJson(`batches/${id}/manifest.json`));
});
export const mediaReviewEvidence = cache(async (id: string) => {
  const report = await mediaReview(id); if (!report) return undefined;
  const raw = await readPrivateJson(`batches/${id}/supplemental-evidence.json`, true);
  if (!raw) return undefined;
  const evidence = supplementalEvidenceSchema.parse(raw);
  if (evidence.batchId !== id || evidence.findings.some(f => f.sourceIds.some(sourceId => !report.assets.some(a => a.sourceId === sourceId)))) throw Error('Supplemental evidence does not match this source batch.');
  return evidence;
});
export const propertyMediaReview = cache(async (id: string) => {
  const entry = (await mediaReviewIndex()).properties[id];
  if (!entry) return undefined;
  const batch = await mediaReview(entry.batchId), group = batch?.groups.find(g => g.id === entry.groupId && g.propertyId === id);
  if (!batch || !group) throw Error('The imported media assignment could not be verified.');
  const raw = await readPrivateJson(`decisions/${id}.json`, true);
  const decision = raw ? reviewDecisionSchema.parse(raw) : undefined;
  const media = await db()!.from('property_media').select('id,kind,url,caption,sort_order').eq('property_id', id);
  if (media.error) throw Error('The reviewed gallery could not be checked.');
  const gallerySignature = mediaSignature(media.data || []);
  let confirmed = false;
  if (decision && decision.propertyId === id && decision.batchId === batch.id && decision.groupId === group.id && JSON.stringify([...decision.assetIds].sort()) === JSON.stringify([...group.assignedAssetIds].sort())) {
    confirmed = decision.mediaSignature === gallerySignature;
  }
  return { batch, group, needsReview: !confirmed, gallerySignature, decision: confirmed ? decision : undefined };
});
export async function excludeUnreviewed<T extends { id: string }>(items: T[]): Promise<T[]> {
  if (!items.length) return items;
  const index = await mediaReviewIndex();
  // Read the private gate before returning any public property data. Never attach provenance to public props.
  const checks = await Promise.all(items.map(async p => !index.properties[p.id] || !(await propertyMediaReview(p.id))?.needsReview));
  return items.filter((_, i) => checks[i]);
}
