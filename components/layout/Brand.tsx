import Link from 'next/link';
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="38" height="46" viewBox="0 0 38 46" fill="none" aria-hidden="true"><path d="M2 44V15L19 3l17 12v29H2Z" stroke="currentColor" strokeWidth="1.4"/><path d="M10 44V20l9-6 9 6v24M19 14v30M2 30h34" stroke="currentColor" strokeWidth="1.4"/><path d="M10 8V2h5" stroke="currentColor" strokeWidth="1.4"/></svg>;
}
export default function Brand() {
  return <Link href="/" className="brand" aria-label="Strong Properties home"><BrandMark/><span><strong>STRONG</strong><small>PROPERTIES</small></span></Link>;
}
