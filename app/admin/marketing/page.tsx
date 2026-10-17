import AdminShell from '@/components/AdminShell';
import {requireLeadManager} from '@/lib/admin-auth';
import {db} from '@/lib/server';
import {generalEnquiries} from '@/lib/house/enquiries';
import {attachLeadContext} from '@/lib/lead-reporting';
import {siteUrl} from '@/lib/config';
import {campaignUrl,tvAttribution,type Attribution} from '@/lib/marketing';
export const dynamic='force-dynamic';
export default async function Marketing() {
 const person=await requireLeadManager(),client=db()!;
 const [enquiries,appointments,general]=await Promise.all([
  client.from('enquiries').select('id,status,created_at').order('created_at',{ascending:false}).limit(100),
  client.from('appointments').select('id,status,created_at').order('created_at',{ascending:false}).limit(100),
  generalEnquiries().catch(()=>null),
 ]);
 const leads=await attachLeadContext('enquiries',enquiries.data || []),viewings=await attachLeadContext('appointments',appointments.data || []);
 const groups=new Map<string,{source:string;campaign:string;enquiries:number;viewings:number;qualified:number}>();
 function add(attribution:Attribution|undefined,kind:'enquiries'|'viewings',qualified=false) {
  const source=attribution?.utm_source || 'Unattributed',campaign=attribution?.utm_campaign || 'No campaign recorded',key=JSON.stringify([source,campaign]);
  const group=groups.get(key)||{source,campaign,enquiries:0,viewings:0,qualified:0};group[kind]++;if(qualified)group.qualified++;groups.set(key,group);
 }
 leads.forEach(l=>add(l.buyerContext.attribution,'enquiries',l.status==='qualified'));
 viewings.forEach(l=>add(l.buyerContext.attribution,'viewings'));
 (general||[]).forEach(l=>add(l.attribution,'enquiries'));
 const tv=siteUrl()?campaignUrl(siteUrl()+'/tv',tvAttribution):'';
 // campaignUrl intentionally leaves external URLs alone; construct this confirmed absolute destination explicitly.
 const destination=tv?siteUrl()+campaignUrl('/tv',tvAttribution):'';
 return <AdminShell person={person}><p className="eyebrow">ACQUISITION / PHASE ONE</p><h1>Marketing & enquiries</h1><p>Recorded lead activity only. This report covers the latest 100 property enquiries, 100 viewing requests and 200 general enquiries, ordered by submission time. Counts are not all-time totals or unique people.</p>
 {(enquiries.error||appointments.error||general===null) && <p role="alert">Some records could not be loaded. The report below is incomplete.</p>}
 <div className="marketing-stats"><article><h2>{leads.length+(general?.length||0)}</h2><p>Enquiries in this sample</p></article><article><h2>{leads.filter(l=>l.status==='qualified').length}</h2><p>Property enquiries currently qualified</p></article><article><h2>{viewings.length}</h2><p>Viewing requests in this sample</p></article></div>
 <section className="admin-panel"><h2>Recorded campaign sources</h2><div className="table-scroll"><table className="admin-table"><thead><tr><th>Source</th><th>Campaign</th><th>Enquiries</th><th>Viewing requests</th><th>Qualified</th></tr></thead><tbody>{[...groups.values()].map(g=><tr key={JSON.stringify([g.source,g.campaign])}><td>{g.source}</td><td>{g.campaign}</td><td>{g.enquiries}</td><td>{g.viewings}</td><td>{g.qualified}</td></tr>)}</tbody></table></div>{!groups.size&&<p>No lead activity recorded in this sample.</p>}<p className="note">Sources come from submitted campaign tags and can be missing or self-reported. A viewing request does not confirm an appointment or sale. General enquiries await qualification in the private inbox.</p></section>
 <section className="admin-panel"><h2>Measurement connections</h2><p>Traffic and visit conversion rates: view your consented GA4 reports after configuring a measurement ID.</p><p>Ad spend, cost per qualified lead, won/lost sales and commission attribution: unavailable. No spend or sales ledger is connected in Phase One.</p><p>Qualified-lead and confirmed-sale advertising events are not sent automatically. Configure reviewed offline conversion workflows in Phase Two.</p></section>
 <section className="admin-panel"><h2>TV campaign · 18 October 2026</h2>{destination?<><p><a href={destination}>{destination}</a></p><p><a href="/campaign/tv-launch.svg" download>Download broadcast QR code (SVG)</a></p><p className="note">QR destination is the verified Vercel production domain. Regenerate and test before printing if the domain changes. Test scanning at the actual broadcast size and duration.</p></>:<p>Set the verified production URL before preparing broadcast materials.</p>}</section></AdminShell>;
}
