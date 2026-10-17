import { z } from 'zod';

export const REVIEW_BUCKET = 'strong-media-review';
const object = z.object({ bucket: z.enum([REVIEW_BUCKET, 'strong-property-media']), path: z.string().regex(/^[a-zA-Z0-9/_.-]+$/).refine(p => !p.includes('..') && !p.startsWith('/')), mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']) }).strict();
const proposed = z.object({ location: z.string().nullable(), city: z.string().nullable(), beds: z.number().int().nullable(), price: z.number().nullable(), currency: z.literal('GHS') }).strict();
export const reviewAssetSchema = z.object({
  id: z.string().uuid(), sourceId: z.string(), sourceMediaGroup: z.string(), sourceFilename: z.string(), kind: z.enum(['image', 'video']),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), confidence: z.string(), sourceNotes: z.string(), notes: z.array(z.string()),
  original: object, thumbnail: object, frames: z.array(object), duration: z.number().nullable(), duplicateOf: z.string().uuid().nullable(), mediaId: z.string().uuid().nullable(),
}).strict();
export const reviewGroupSchema = z.object({
  id: z.string().uuid(), sourceMediaGroup: z.string(), title: z.string(), confidence: z.string(), needsReview: z.boolean(), propertyId: z.string().uuid().nullable(),
  proposed, notes: z.array(z.string()), assetIds: z.array(z.string().uuid()), assignedAssetIds: z.array(z.string().uuid()),
}).strict();
export const mediaReviewSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), createdAt: z.string().datetime(), archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
  groups: z.array(reviewGroupSchema).max(100), assets: z.array(reviewAssetSchema).max(500), missingDescriptions: z.array(z.string()),
}).strict().superRefine((data, ctx) => {
  const ids = new Set(data.assets.map(a => a.id)), properties = data.groups.flatMap(g => g.propertyId ? [g.propertyId] : []), assigned = data.groups.flatMap(g => g.assignedAssetIds);
  if (ids.size !== data.assets.length || new Set(data.groups.map(g => g.id)).size !== data.groups.length || new Set(properties).size !== properties.length || new Set(assigned).size !== assigned.length) ctx.addIssue({ code: 'custom', message: 'Duplicate asset, group, property or assignment.' });
  for (const group of data.groups) {
    if (group.assetIds.some(id => !ids.has(id)) || group.assignedAssetIds.some(id => !group.assetIds.includes(id)) || (!group.propertyId && group.assignedAssetIds.length)) ctx.addIssue({ code: 'custom', message: 'Invalid group assignment.' });
    if (group.assignedAssetIds.some(id => data.assets.find(a => a.id === id)?.duplicateOf)) ctx.addIssue({ code: 'custom', message: 'Duplicate originals must not create duplicate gallery entries.' });
    if (group.assetIds.some(id => data.assets.find(a => a.id === id)?.sourceMediaGroup !== group.sourceMediaGroup)) ctx.addIssue({ code: 'custom', message: 'A source asset crosses property groups.' });
  }
  const grouped = data.groups.flatMap(g => g.assetIds);
  if (grouped.length !== ids.size || new Set(grouped).size !== ids.size) ctx.addIssue({ code:'custom', message:'Every original must belong to exactly one source group.' });
  for (const [i, asset] of data.assets.entries()) {
    const original = asset.duplicateOf && data.assets.slice(0,i).find(a => a.id === asset.duplicateOf);
    if (asset.duplicateOf && (!original || original.sha256 !== asset.sha256 || asset.mediaId)) ctx.addIssue({code:'custom',message:'Invalid duplicate reference.'});
    if (Boolean(asset.mediaId) !== assigned.includes(asset.id)) ctx.addIssue({code:'custom',message:'Gallery assignments do not match the provenance.'});
    if ([asset.original,asset.thumbnail,...asset.frames].some(o => o.bucket !== REVIEW_BUCKET || !o.path.startsWith(`batches/${data.id}/`))) ctx.addIssue({code:'custom',message:'Review objects must belong to the private batch.'});
  }
});
export type MediaReview = z.infer<typeof mediaReviewSchema>;
export type ReviewGroup = z.infer<typeof reviewGroupSchema>;
export const reviewIndexSchema = z.object({ version: z.literal(1), batches: z.array(z.string().uuid()).max(100), properties: z.record(z.string().uuid(), z.object({ batchId: z.string().uuid(), groupId: z.string().uuid(), needsReview: z.boolean() }).strict()) }).strict();
export type ReviewIndex = z.infer<typeof reviewIndexSchema>;
export const reviewDecisionSchema = z.object({
  version: z.literal(1), propertyId: z.string().uuid(), batchId: z.string().uuid(), groupId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()), mediaSignature: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: z.string().uuid(), reviewedAt: z.string().datetime(), evidence: z.string().trim().min(20).max(2000),
}).strict();
export const supplementalEvidenceSchema = z.object({
  batchId: z.string().uuid(), recordedAt: z.string().datetime(), source: z.string().min(10).max(300),
  findings: z.array(z.object({ sourceIds: z.array(z.string()).min(1), observation: z.string().min(10).max(2000), proposedLabel: z.string().nullable(), requiresConfirmation: z.boolean() }).strict()).min(1).max(100),
}).strict();
