import BuyerContext from '@/components/admin/BuyerContext';
import { generalEnquiries } from '@/lib/house/enquiries';
export default async function GeneralEnquiryInbox() {
  const rows = await generalEnquiries().catch(() => null);
  return <div className="admin-panel" style={{ marginTop: 32 }}><h2>General conversations</h2><p>Latest 200 general enquiries from the homepage, contact and TV pages. Stored privately; email notifications are not configured.</p>{rows === null ? <p>The general enquiry inbox could not be loaded.</p> : rows.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Contact</th><th>Interest / message</th><th>Received</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><strong>{r.name}</strong><small>{r.phone}</small><small>{r.email}</small><BuyerContext value={r}/></td><td><strong>{r.interest || 'General property enquiry'}</strong><small>{r.message || 'No additional message'}</small></td><td>{new Date(r.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}</td></tr>)}</tbody></table></div> : <p>No general enquiries yet.</p>}</div>;
}
