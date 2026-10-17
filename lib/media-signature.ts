import { createHash } from 'node:crypto';
export function mediaSignature(rows: { id: string; url: string; caption: string | null; kind: string; sort_order: number }[]) {
  return createHash('sha256').update(JSON.stringify(rows.map(r => [r.id, r.kind, r.url, r.caption, r.sort_order]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))))).digest('hex');
}
