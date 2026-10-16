import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { editorialAssets } from '@/lib/assets';
import Credit from './Credit';

const considerations = [
  { title: 'Location', text: 'Access, surroundings and how a site connects to the places that matter to you.' },
  { title: 'Potential', text: 'What the land could support, from a family home to a longer-term development.' },
  { title: 'Documentation', text: 'The title and paperwork to review with the team before any commitment.' },
];

export default function LandSpotlight() {
  const image = editorialAssets.forest;
  return <section id="land" className="land" aria-labelledby="land-title">
    <figure className="land-media" data-parallax>
      <Image src={image.src} alt={image.alt} fill sizes="(max-width: 900px) 100vw, 62vw"/>
      <Credit credit={image.credit} label="Ashanti Region uplands"/>
    </figure>
    <div className="land-copy">
      <p className="kicker" data-reveal>Land &amp; Investment</p>
      <h2 id="land-title" className="display" data-reveal>Build Your Future <em>on Solid Ground.</em></h2>
      <p className="lead" data-reveal>Explore land opportunities selected for their location, potential and long-term relevance.</p>
      <dl className="land-points" data-reveal>
        {considerations.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}
      </dl>
      <div data-reveal><Link className="btn btn-gold" href="/properties?category=land">Explore Land <ArrowUpRight size={16} aria-hidden="true"/></Link></div>
    </div>
  </section>;
}
