import 'server-only';
import { randomUUID } from 'node:crypto';
import { privateHouseStorage } from './house/storage';
/** Five create-only reservations provide a cross-instance quota, without an SQL migration. */
export async function consumePrivateQuota(key: string, limit = 5, milliseconds = 600000) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw Error('Invalid quota key.');
  const storage = await privateHouseStorage(), window = Math.floor(Date.now() / milliseconds);
  for (let slot = 0; slot < limit; slot++) {
    const result = await storage.upload(`quotas/leads-${key}-${window}-${slot}.json`, JSON.stringify({ id: randomUUID(), expires: (window + 1) * milliseconds }), { contentType: 'application/json', upsert: false });
    if (!result.error) return true;
    if (String(result.error.statusCode) !== '409' && !/already exists|duplicate/i.test(result.error.message)) throw Error('Quota storage unavailable.');
  }
  return false;
}
