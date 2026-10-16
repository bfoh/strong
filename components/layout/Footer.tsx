import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Brand from './Brand';
import { site } from '@/lib/config';

const explore = [
  { href: '/properties', label: 'Properties' },
  { href: '/properties?category=land', label: 'Land' },
  { href: '/properties?category=residential', label: 'Residential' },
  { href: '/properties?category=commercial', label: 'Commercial' },
];
const company = [{ href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }, { href: '/book-viewing', label: 'Book a Viewing' }];

export default function Footer() {
  return <footer className="site-footer">
    <div className="site-footer-top">
      <div className="site-footer-brand">
        <Brand/>
        <p>Land, residential and commercial property opportunities in and around Kumasi, Ghana, presented with clarity and care.</p>
      </div>
      <nav className="site-footer-col" aria-label="Explore properties">
        <p className="site-footer-label">Explore</p>
        {explore.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <nav className="site-footer-col" aria-label="Company">
        <p className="site-footer-label">Company</p>
        {company.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <div className="site-footer-col">
        <p className="site-footer-label">Contact</p>
        <address>
          <span>{site.address || site.location}</span>
          {site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`}>{site.phone}</a>}
          {site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
        </address>
        {!site.phone && !site.email && <Link href="/contact">Contact page</Link>}
        {site.social.length > 0 && <ul className="site-footer-social" aria-label="Social media">{site.social.map(item => <li key={item.label}><a href={item.url} target="_blank" rel="noopener noreferrer me">{item.label}<ArrowUpRight size={12} aria-hidden="true"/></a></li>)}</ul>}
      </div>
    </div>
    <div className="site-footer-bottom">
      <small>© {new Date().getFullYear()} Strong Properties. All rights reserved.</small>
      <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#top">Back to top</a></div>
    </div>
  </footer>;
}
