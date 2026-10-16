import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import ViewingRequest from '@/components/ViewingRequest';
import { viewingOptions } from '@/lib/server';
import { databaseConfigured, siteUrl } from '@/lib/config';
import type { SearchParams } from '@/lib/catalogue';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Book a Viewing', description: 'Request a viewing of a published Strong Properties listing in Kumasi. Share your preferred date and time and the team will confirm with you.', alternates: siteUrl() ? { canonical: '/book-viewing' } : undefined };

export default async function BookViewing({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams, options = await viewingOptions();
  const initial = typeof params.property === 'string' ? params.property : undefined;
  return <main id="main-content" className="booking">
    <section className="booking-head">
      <p className="kicker">Book a Viewing</p>
      <h1 className="display">See it <em>for yourself.</em></h1>
      <p className="lead">Choose a published property and share a preferred date and time. Your request is sent to the Strong Properties team, who will contact you to confirm the arrangements.</p>
    </section>
    <section className="booking-body" aria-label="Viewing request">
      {options.length > 0 ? <ViewingRequest options={options} initial={initial}/> : <div className="booking-empty">
        <h2>No properties are open for viewing requests right now.</h2>
        <p>{databaseConfigured() ? 'New listings are published as they are verified. Browse the catalogue, or contact the team about what you are looking for.' : 'Viewing requests are available once the property database is connected.'}</p>
        <div className="button-row">
          <Link className="btn btn-dark" href="/properties">Browse Properties <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link className="btn btn-outline" href="/contact">Contact Strong Properties</Link>
        </div>
      </div>}
      <aside className="booking-aside">
        <h2>What happens next</h2>
        <ol>
          <li>Your preferred date and time are shared with the team.</li>
          <li>A member of the team contacts you to confirm or suggest an alternative.</li>
          <li>The viewing or site inspection is arranged once confirmed.</li>
        </ol>
        <p>Times are in Ghana time (GMT). A request is not a confirmed appointment.</p>
      </aside>
    </section>
  </main>;
}
