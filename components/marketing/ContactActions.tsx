import { site, whatsappUrl } from '@/lib/config';
import Link from './TrackedLink';
export default function ContactActions({ message, propertyId, enquiry = '/contact#enquiry' }: { message?: string; propertyId?: string; enquiry?: string }) {
  const whatsapp = whatsappUrl(message), phone = site.phone.replace(/[^+\d]/g,'');
  return <div className="button-row contact-actions">{whatsapp && <Link className="btn btn-dark" href={whatsapp} target="_blank" rel="noopener noreferrer" eventName="whatsapp_click" propertyId={propertyId}>Enquire on WhatsApp ↗</Link>}{phone && <Link className="btn btn-outline" href={'tel:'+phone} eventName="phone_click" propertyId={propertyId}>Call Ghana</Link>}{site.internationalPhone&&<Link className="btn btn-outline" href={'tel:'+site.internationalPhone.replace(/[^+\d]/g,'')} eventName="phone_click" propertyId={propertyId}>Call international</Link>}<Link className="btn btn-outline" href={enquiry}>Make an enquiry ↗</Link></div>;
}
