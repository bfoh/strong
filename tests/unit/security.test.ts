import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { boundedBody, BodyTooLargeError } from '../../lib/request-body';
import { prepareUpload, UploadValidationError, uploadLimits } from '../../lib/media-files';
import { publicMediaUrl, parseStorageReference } from '../../lib/media';
import { staffSchema, canEditProperties, canManageLeads } from '../../lib/staff-roles';

const propertyId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
test('private documents, private images and mismatched ownership never become public media URLs', () => {
  const media = { id: mediaId, property_id: propertyId, kind: 'image' as const, url: `sp-storage://strong-property-media/${propertyId}/public/${mediaId}/${versionId}.webp` };
  assert.equal(publicMediaUrl(media), `/api/media/${mediaId}`);
  assert.equal(publicMediaUrl({ ...media, url: media.url.replace('/public/', '/private/') }), undefined);
  assert.equal(publicMediaUrl({ ...media, kind: 'document' }), undefined);
  assert.equal(publicMediaUrl({ ...media, property_id: versionId }), undefined);
  assert.equal(publicMediaUrl({ ...media, id: versionId }), undefined);
  assert.equal(parseStorageReference(media.url + '/../../private.pdf'), undefined);
  assert.equal(publicMediaUrl({ ...media, url: 'javascript:alert(1)' }), undefined);
});
test('staff roles require recognised profiles and separate property editing from lead management', () => {
  const profile = { id: propertyId, full_name: 'QA Staff' };
  for (const role of ['admin', 'manager', 'editor', 'agent'] as const) {
    const person = staffSchema.parse({ ...profile, role });
    assert.equal(canEditProperties(person), role !== 'agent');
    assert.equal(canManageLeads(person), role !== 'editor');
  }
  assert.equal(staffSchema.safeParse({ ...profile, role: 'owner' }).success, false);
  assert.equal(staffSchema.safeParse(null).success, false);
});
test('body limits cancel an oversized chunked stream before parsing it', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)); }, cancel() { cancelled = true; } });
  const req = new Request('https://example.test/api/upload', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(boundedBody(req, 10), BodyTooLargeError);
  assert.equal(cancelled, true);
  assert.equal(new TextDecoder().decode(await boundedBody(new Request('https://example.test', { method: 'POST', body: 'hello' }), 5)), 'hello');
});
test('uploads reject misleading content and oversized files; images are resized and stripped of metadata', async () => {
  await assert.rejects(prepareUpload(new File(['<script>invalid</script>'], 'fake.jpg', { type: 'image/jpeg' }), 'image'), UploadValidationError);
  await assert.rejects(prepareUpload(new File(['not-pdf'], 'fake.pdf', { type: 'application/pdf' }), 'document'), UploadValidationError);
  await assert.rejects(prepareUpload(new File(['not-video'], 'fake.mp4', { type: 'video/mp4' }), 'video'), UploadValidationError);
  await assert.rejects(prepareUpload(new File([new Uint8Array(uploadLimits.image + 1)], 'large.jpg', { type: 'image/jpeg' }), 'image'), UploadValidationError);
  const original = await sharp({ create: { width: 2500, height: 100, channels: 3, background: '#eee' } }).withMetadata({ orientation: 1 }).jpeg().toBuffer();
  const result = await prepareUpload(new File([new Uint8Array(original)], 'qa.jpg', { type: 'image/jpeg' }), 'image');
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(result.mime, 'image/webp'); assert.equal(metadata.width, 2400); assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
});
