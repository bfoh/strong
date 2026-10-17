'use client';
import { usePathname } from 'next/navigation';
export default function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const house = pathname.startsWith('/preview/house');
  return <>{!house && header}{children}{!house && footer}</>;
}
