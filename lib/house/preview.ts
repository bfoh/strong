import 'server-only';
import { headers } from 'next/headers';
// Draft access is loopback-only; a deployment cannot accidentally expose the draft.
export async function isHousePreviewRequest() {
  if (process.env.NODE_ENV === 'production' && process.env.STRONG_HOUSE_LOCAL_PREVIEW !== '1') return false;
  const host = (await headers()).get('host') || '';
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}
