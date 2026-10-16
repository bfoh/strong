import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilters, filterFixtures, catalogueUrl } from '../../lib/catalogue';
import { demoProperties, safeMediaUrl } from '../../lib/data';
test('search input cannot inject PostgREST OR expressions or wildcard operators', () => {
  const result = parseFilters({ q: 'Kumasi%,status.eq.draft_(x)', category: 'draft', sort: 'unknown', min: '-5', page: '-1' });
  assert.equal(result.q, 'Kumasistatuseqdraftx'); assert.equal(result.category, ''); assert.equal(result.min, ''); assert.equal(result.sort, 'newest'); assert.equal(result.page, 1);
});
test('filters round-trip through shareable URLs', () => {
  const filters = parseFilters({ q: 'Family Residence', category: 'residential', location: 'Kumasi, Ghana', min: '1000', max: '250000', sort: 'price-desc', page: '2' });
  const url = new URL(catalogueUrl(filters, 2), 'https://example.test');
  assert.deepEqual(parseFilters(Object.fromEntries(url.searchParams)), filters);
});
test('unknown prices never match a price range, and category/search compose', () => {
  assert.equal(filterFixtures(demoProperties, parseFilters({ min: '1' })).length, 0);
  assert.equal(filterFixtures(demoProperties, parseFilters({ category: 'land' })).length, 0);
  assert.deepEqual(filterFixtures(demoProperties, parseFilters({ category: 'residential', q: 'family' })).map(p => p.id), ['demo-2']);
});
test('remote media cannot use unsafe protocols or protocol-relative URLs', () => {
  for (const url of ['javascript:alert(1)', '//evil.test/a.jpg', 'data:image/svg+xml,hi', 'http://host.test/a.jpg', 'https://user:secret@host.test/a.jpg', '/\\evil.test']) assert.equal(safeMediaUrl(url), undefined);
  assert.equal(safeMediaUrl('/images/property.webp'), '/images/property.webp');
  assert.equal(safeMediaUrl('https://media.test/p.webp'), 'https://media.test/p.webp');
});
