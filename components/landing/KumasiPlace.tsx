import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { editorialAssets } from '@/lib/assets';
import { CreditLine } from './Credit';

export default function KumasiPlace({ locations }: { locations: string[] }) {
  const { manhyia, greatHall } = editorialAssets;
  return <section id="kumasi" className="place" aria-labelledby="kumasi-title">
    <div className="place-copy">
      <p className="kicker" data-reveal>Kumasi · Ashanti Region</p>
      <h2 id="kumasi-title" className="display" data-reveal>Rooted in Kumasi. <em>Focused on What Comes Next.</em></h2>
      <div className="place-text" data-reveal>
        <p className="lead">Kumasi, the historic capital of the Ashanti Region, is a city of deep heritage, busy commerce and neighbourhoods that keep evolving.</p>
        <p>It is where Strong Properties is based and where our attention lies: land, homes and commercial spaces in and around the city, presented for people who want to build here, live here or invest from afar.</p>
      </div>
      <nav className="locations" aria-label="Explore listings by location" data-reveal>
        <p className="locations-label">Explore by location</p>
        {locations.length > 0
          ? <ul>{locations.slice(0, 8).map(location => <li key={location}><Link href={`/properties?location=${encodeURIComponent(location)}`}>{location}<ArrowUpRight size={15} aria-hidden="true"/></Link></li>)}</ul>
          : <p className="locations-empty">Locations appear here as listings are published.</p>}
        <Link className="link-arrow" href="/properties">All published listings <ArrowUpRight size={15} aria-hidden="true"/></Link>
      </nav>
    </div>
    <div className="place-visual">
      <figure className="place-main" data-reveal data-parallax>
        <Image src={manhyia.src} alt={manhyia.alt} fill sizes="(max-width: 900px) 86vw, 40vw"/>
      </figure>
      <figure className="place-secondary" data-reveal>
        <Image src={greatHall.src} alt={greatHall.alt} fill sizes="(max-width: 900px) 52vw, 22vw"/>
      </figure>
      <CreditLine items={[{ credit: manhyia.credit, label: 'Manhyia Palace Museum' }, { credit: greatHall.credit, label: 'KNUST Great Hall' }]}/>
    </div>
  </section>;
}
