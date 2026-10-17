import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaReviewSchema, REVIEW_BUCKET } from '../../lib/media-review-model';
import { mediaSignature } from '../../lib/media-signature';
import { formatPrice } from '../../lib/data';
import { parseFilters } from '../../lib/catalogue';
import { excludeUnreviewed } from '../../lib/media-review';

const batch = '11111111-1111-4111-a111-111111111111', asset = '22222222-2222-4222-a222-222222222222', group = '33333333-3333-4333-a333-333333333333', property = '44444444-4444-4444-a444-444444444444', media = '55555555-5555-4555-a555-555555555555';
function fixture() {
  const object = {bucket:REVIEW_BUCKET,path:`batches/${batch}/originals/photo.jpeg`,mime:'image/jpeg'};
  return {version:1,id:batch,createdAt:'2026-10-17T12:00:00.000Z',archiveSha256:'a'.repeat(64),missingDescriptions:[],groups:[{id:group,sourceMediaGroup:'QA_GROUP',title:'QA private candidate',confidence:'Likely',needsReview:true,propertyId:property,proposed:{location:null,city:null,beds:null,price:null,currency:'GHS'},notes:[],assetIds:[asset],assignedAssetIds:[asset]}],assets:[{id:asset,sourceId:'01',sourceMediaGroup:'QA_GROUP',sourceFilename:'qa.jpeg',kind:'image',sha256:'b'.repeat(64),bytes:100,confidence:'Likely',sourceNotes:'Unverified fixture',notes:[],original:object,thumbnail:object,frames:[],duration:null,duplicateOf:null,mediaId:media}]};
}
test('review manifests require exhaustive, unique, same-group assignments and private batch paths', () => {
  assert.equal(mediaReviewSchema.safeParse(fixture()).success,true);
  const duplicate = fixture(); duplicate.groups[0].assignedAssetIds.push(asset); assert.equal(mediaReviewSchema.safeParse(duplicate).success,false);
  const crossed = fixture(); crossed.assets[0].sourceMediaGroup='DIFFERENT_PROPERTY'; assert.equal(mediaReviewSchema.safeParse(crossed).success,false);
  const orphan = fixture(); orphan.groups[0].assetIds=[]; assert.equal(mediaReviewSchema.safeParse(orphan).success,false);
  const unassigned = fixture(); unassigned.groups[0].assignedAssetIds=[]; assert.equal(mediaReviewSchema.safeParse(unassigned).success,false);
  const path = fixture(); path.assets[0].original.path='batches/another-batch/private.jpeg'; assert.equal(mediaReviewSchema.safeParse(path).success,false);
  const traversal = fixture(); traversal.assets[0].original.path=`batches/${batch}/../../secret`; assert.equal(mediaReviewSchema.safeParse(traversal).success,false);
});
test('a media review binds to exact gallery versions, captions and order, independent of query order', () => {
  const rows=[{id:asset,url:'/api/media/one',caption:'Exterior',kind:'image',sort_order:0},{id:media,url:'/api/media/two',caption:'Tour',kind:'video',sort_order:1}];
  assert.equal(mediaSignature(rows),mediaSignature([...rows].reverse()));
  for(const changed of [{...rows[0],url:'/api/media/replacement'},{...rows[0],caption:'Different property'},{...rows[0],sort_order:3}]) assert.notEqual(mediaSignature(rows),mediaSignature([changed,rows[1]]));
});
test('Ghana prices are explicit, unknown prices remain unknown, and ten-bedroom filtering is supported', () => {
  assert.equal(formatPrice({price:3500000,currency:'GHS'}),'GH₵3,500,000');
  assert.equal(formatPrice({price:null,currency:'GHS'}),'Price on Request');
  assert.equal(parseFilters({beds:'10'}).beds,'10');
  assert.equal(parseFilters({beds:'11'}).beds,'');
});
test('private review gates hide unresolved or changed media and fail closed if the index disappears', async () => {
  const previous = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://media-review.example.test';
  process.env.SUPABASE_SECRET_KEY='server-only-unit-test';
  const rows=[{id:media,kind:'image',url:'/api/media/qa',caption:'QA image',sort_order:0}];
  let confirmed=false,missingIndex=false;
  const signature=mediaSignature(rows);
  globalThis.fetch=async input => {
    const pathname=new URL(String(input)).pathname;
    const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
    if(pathname.endsWith('/bucket/strong-media-review'))return json({id:REVIEW_BUCKET,name:REVIEW_BUCKET,public:false});
    if(pathname.endsWith('/index.json'))return missingIndex?json({statusCode:'404',message:'Missing'},404):json({version:1,batches:[batch],properties:{[property]:{batchId:batch,groupId:group,needsReview:true}}});
    if(pathname.endsWith('/manifest.json'))return json(fixture());
    if(pathname.includes('/decisions/'))return confirmed?json({version:1,propertyId:property,batchId:batch,groupId:group,assetIds:[asset],mediaSignature:signature,reviewedBy:property,reviewedAt:'2026-10-17T12:00:00.000Z',evidence:'Owner-confirmed property identity for this QA fixture.'}):json({statusCode:'404',message:'Missing'},404);
    if(pathname.endsWith('/property_media'))return json(rows);
    throw Error('Unexpected test request');
  };
  try {
    assert.deepEqual(await excludeUnreviewed([{id:property}]),[]);
    confirmed=true;
    assert.deepEqual(await excludeUnreviewed([{id:property}]),[{id:property}]);
    rows[0].caption='A newly edited caption';
    assert.deepEqual(await excludeUnreviewed([{id:property}]),[]);
    missingIndex=true;
    await assert.rejects(excludeUnreviewed([{id:property}]),/could not be loaded/);
  } finally {globalThis.fetch=previous;delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;}
});
