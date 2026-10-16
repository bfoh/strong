import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { brandAssets } from '@/lib/assets';

export default function ViewingInvitation() {
  return <section id="enquire" className="invite" aria-labelledby="invite-title">
    <div className="invite-copy">
      <p className="kicker" data-reveal>Viewings &amp; Enquiries</p>
      <h2 id="invite-title" className="display" data-reveal>Your Next Move <em>Starts Here.</em></h2>
      <p className="lead" data-reveal>Tell us what you’re looking for. We’ll help you take the next step.</p>
      <div className="button-row" data-reveal>
        <Link className="btn btn-gold" href="/book-viewing">Book a Viewing <ArrowUpRight size={16} aria-hidden="true"/></Link>
        <Link className="btn btn-ghost-light" href="/contact">Contact Strong Properties</Link>
      </div>
      <p className="invite-note" data-reveal>Viewing requests are confirmed personally by the team.</p>
    </div>
    <figure className="invite-media" data-reveal data-parallax>
      <Image src={brandAssets.closing.src} alt={brandAssets.closing.alt} fill sizes="(max-width: 900px) 92vw, 40vw"/>
    </figure>
  </section>;
}
