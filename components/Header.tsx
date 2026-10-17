'use client';
import Link from '@/components/marketing/TrackedLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Brand from './layout/Brand';

const links = [
  { href: '/properties', label: 'Properties' },
  { href: '/properties?category=land', label: 'Buy Land' },
  { href: '/properties?category=residential', label: 'Residential' },
  { href: '/properties?category=commercial', label: 'Commercial' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const path = usePathname(), dialog = useRef<HTMLDialogElement>(null);
  const home = path === '/';
  // Over the cinematic hero the bar is transparent; once the hero has passed it settles onto ivory.
  const [overlay, setOverlay] = useState(home), [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    dialog.current?.close();
    const update = () => {
      const hero = document.querySelector('[data-hero]');
      setOverlay(Boolean(hero && hero.getBoundingClientRect().bottom > 84));
      setScrolled(scrollY > 12);
    };
    update();
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, [path]);
  const current = (href: string) => href === path ? 'page' : undefined;
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className={`site-header${home ? ' is-home' : ''}${overlay ? ' is-overlay' : ''}${scrolled ? ' is-scrolled' : ''}`}>
      <Brand/>
      <nav className="site-nav" aria-label="Main navigation">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}
      </nav>
      <Link className="site-cta" href="/book-viewing" aria-current={current('/book-viewing')}>Book a Viewing</Link>
      <button className="site-menu-toggle" type="button" onClick={() => dialog.current?.showModal()} aria-label="Open navigation" aria-haspopup="dialog"><Menu size={22} strokeWidth={1.5}/></button>
    </header>
    <dialog ref={dialog} className="site-menu" aria-label="Navigation" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="site-menu-top"><Brand/><button type="button" className="site-menu-close" onClick={() => dialog.current?.close()} aria-label="Close navigation"><X size={22} strokeWidth={1.5}/></button></div>
      <nav aria-label="Mobile navigation">
        {links.map(link => <Link key={link.href} href={link.href} onClick={() => dialog.current?.close()}>{link.label}<ArrowUpRight size={20} strokeWidth={1.4} aria-hidden="true"/></Link>)}
      </nav>
      <Link className="btn btn-gold site-menu-cta" href="/book-viewing" onClick={() => dialog.current?.close()}>Book a Viewing <ArrowUpRight size={16} aria-hidden="true"/></Link>
      <p className="site-menu-foot">Ghana · At home, and abroad</p>
    </dialog>
  </>;
}
