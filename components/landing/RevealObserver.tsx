'use client';
import { useEffect } from 'react';
// Content is server-rendered and visible by default; reveals only apply once this runs and motion is welcome.
export default function RevealObserver() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const root = document.documentElement, items = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    items.forEach(item => { if (item.getBoundingClientRect().top > innerHeight) observer.observe(item); else item.classList.add('is-revealed'); });
    root.classList.add('reveal-ready');
    return () => { observer.disconnect(); root.classList.remove('reveal-ready'); };
  }, []);
  return null;
}
