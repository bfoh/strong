import type {LeadContext} from '@/lib/lead-context';
export default function BuyerContext({value:v}:{value:LeadContext}) {
 return <div className="buyer-context">{v.countryOfResidence && <small>Residence: {v.countryOfResidence}</small>}{v.preferredContact && <small>Contact preference: {v.preferredContact}</small>}{v.remoteViewing && <small>Remote viewing requested</small>}{v.attribution?.utm_source && <small>Source: {v.attribution.utm_source}{v.attribution.utm_medium ? ` / ${v.attribution.utm_medium}` : ''}</small>}{v.attribution?.utm_campaign && <small>Campaign: {v.attribution.utm_campaign}</small>}{v.attribution?.utm_content && <small>Content: {v.attribution.utm_content}</small>}{v.attribution?.utm_term && <small>Term: {v.attribution.utm_term}</small>}</div>;
}
