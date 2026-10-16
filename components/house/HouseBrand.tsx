import Link from 'next/link';
export default function HouseBrand({ onClick }: { onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  return <Link href="#exterior" className="house-brand" onClick={onClick} aria-label="Strong Properties — return to the exterior">
    <svg viewBox="0 0 44 56" width="38" height="48" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="41" height="53" stroke="currentColor" strokeWidth="1.5"/><path d="M30 12C24 5 10 10 12 19c2 7 17 7 18 16 2 12-16 15-21 7M22 52V18h6c16 0 16 20 0 20h-6" stroke="currentColor" strokeWidth="2.2"/></svg>
    <span><strong>STRONG</strong><small>PROPERTIES</small></span>
  </Link>;
}
