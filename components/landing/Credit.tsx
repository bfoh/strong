import type { Credit as CreditInfo } from '@/lib/assets';
function Attribution({ credit, label }: { credit: CreditInfo; label: string }) {
  return <>{label} · Photo: <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a>, <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license">{credit.license}</a></>;
}
/** Overlay caption inside a figure. */
export default function Credit({ credit, label }: { credit: CreditInfo; label: string }) {
  return <figcaption className="credit"><Attribution credit={credit} label={label}/></figcaption>;
}
/** Plain-text credit line for compositions where overlays would collide. */
export function CreditLine({ items }: { items: { credit: CreditInfo; label: string }[] }) {
  return <p className="credit-line">{items.map((item, i) => <span key={item.label}>{i > 0 && ' · '}<Attribution {...item}/></span>)}</p>;
}
