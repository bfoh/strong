import type { Metadata } from 'next';
import { randomUUID } from 'node:crypto';
import {attributionFromSearch} from '@/lib/marketing';
import type {SearchParams} from '@/lib/catalogue';
import { site, siteUrl, databaseConfigured } from '@/lib/config';
import GeneralEnquiry from '@/components/marketing/GeneralEnquiry';
import ContactActions from '@/components/marketing/ContactActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Contact Strong Properties | Property enquiries across Ghana',
  description: 'Speak to Strong Properties about homes, land, commercial property and remote viewings in Ghana.',
  alternates: { canonical: siteUrl() ? `${siteUrl()}/contact` : '/contact' },
};
export default async function ContactPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const attribution=attributionFromSearch(await searchParams);
  return <main id="main-content"><section className="page-head"><p className="eyebrow">Ghana · At home and abroad</p><h1>Your next chapter<br/><em>starts with a conversation.</em></h1></section>
    <section className="launch-contact contact-page"><div><p className="sp-kicker">Talk to Strong Properties</p><h2 className="sp-display">Let’s find your place.</h2><p>Tell us where you would like to buy, what you are looking for and how you prefer to hear from us. You can also request a remote consultation.</p>
      <dl className="contact-details"><dt>Ghana</dt><dd><a href={`tel:${site.phone}`}>{site.phone}</a></dd><dt>International</dt><dd><a href={`tel:${site.internationalPhone}`}>{site.internationalPhone}</a></dd>{site.email && <><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></>}</dl><ContactActions/>
      <p className="launch-note">Please do not include identity documents or payment information in this form. Property availability and documentation should be confirmed with the team before any commitment.</p></div><GeneralEnquiry available={databaseConfigured()} requestId={randomUUID()} initialAttribution={attribution}/></section></main>;
}
