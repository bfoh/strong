import type { Metadata } from 'next';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import InvestmentConfidence from '@/components/home/InvestmentConfidence';
import { siteUrl } from '@/lib/config';
import { brandAssets } from '@/lib/assets';
export const metadata: Metadata = { title: 'Our Philosophy', description: 'A considered approach to property across Ghana. Learn about the Strong Properties philosophy: clear information, purposeful locations and lasting possibilities.', alternates: siteUrl() ? { canonical: '/about' } : undefined };
export default function About() {
  return <main id="main-content"><section className="page-head"><span className="eyebrow">THE STRONG PROPERTIES PHILOSOPHY</span><h1>Strong foundations.<br/><em>Lasting legacies.</em></h1><p>Property is a beginning. What you build on it is your story.</p></section><section className="editorial-page"><div><span className="eyebrow">MORE THAN THE SPACE YOU OWN</span><h2>A foundation for<br/>what comes next.</h2><p>Strong Properties focuses on land, residential and commercial property opportunities across Ghana for local and international buyers.</p><p>Whether you are finding a home, considering land or planning for your business, a property decision deserves clear information and a thoughtful conversation.</p><p>We present the information available for each published property and provide a way to ask questions and request a viewing. Documentation, specifications, price and current availability should be discussed before making a commitment.</p><Button href="/properties">Explore the collection</Button></div><figure className="editorial-image"><Image src={brandAssets.philosophy.src} alt={brandAssets.philosophy.alt} fill sizes="(max-width:650px) 90vw, 45vw"/><figcaption>Concept image · Architectural brand illustration</figcaption></figure></section><InvestmentConfidence/></main>;
}
