import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function Button({ href, children, variant = 'primary', className = '' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'text'; className?: string }) {
  return <Link className={`button button-${variant} ${className}`} href={href}>{children}<ArrowUpRight size={17} aria-hidden="true"/></Link>;
}
