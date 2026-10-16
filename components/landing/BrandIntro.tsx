import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { brandAssets } from '@/lib/assets';

export default function BrandIntro() {
  return <section id="introduction" className="intro" aria-labelledby="intro-title">
    <div className="intro-copy">
      <p className="kicker" data-reveal>Strong Properties</p>
      <h2 id="intro-title" className="display" data-reveal>A Different Standard <em>of Property.</em></h2>
      <div className="intro-body" data-reveal>
        <p className="lead">From carefully selected land to exceptional residential and commercial opportunities, Strong Properties helps you discover spaces with lasting value.</p>
        <p>We present each published opportunity with the information you need to ask the right questions, arrange a visit and take your next step with clarity.</p>
        <Link className="link-arrow" href="/about">About Strong Properties <ArrowRight size={15} aria-hidden="true"/></Link>
      </div>
    </div>
    <div className="intro-visual">
      <figure className="intro-main" data-reveal data-parallax>
        <Image src={brandAssets.hero.src} alt={brandAssets.hero.alt} fill sizes="(max-width: 800px) 92vw, 46vw"/>
      </figure>
      <figure className="intro-detail" data-reveal>
        <Image src={brandAssets.philosophy.src} alt={brandAssets.philosophy.alt} fill sizes="(max-width: 800px) 44vw, 18vw"/>
      </figure>
      <p className="image-note">Concept studies · Brand imagery</p>
    </div>
  </section>;
}
