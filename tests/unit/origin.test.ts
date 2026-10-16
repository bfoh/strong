import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from '../../lib/origin';
test('origin checks accept browser Host when Next uses an internal localhost URL', () => {
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/admin/status', { headers: { origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' } })), true);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/admin/status', { headers: { origin: 'https://untrusted.test', host: '127.0.0.1:3000', 'x-forwarded-host': 'untrusted.test' } })), false);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/admin/status')), false);
});
