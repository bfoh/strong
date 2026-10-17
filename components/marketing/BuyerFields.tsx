'use client';
export default function BuyerFields() {
  return <><label>COUNTRY OF RESIDENCE (OPTIONAL)<input name="countryOfResidence" autoComplete="country-name" maxLength={100} placeholder="Where you currently live"/></label><label>PREFERRED CONTACT METHOD<select name="preferredContact" defaultValue="phone"><option value="phone">Phone</option><option value="email">Email, if supplied</option><option value="whatsapp">WhatsApp using my number</option></select></label><label className="buyer-checkbox"><input type="checkbox" name="remoteViewing" value="true"/> I’m interested in a remote consultation or viewing assistance</label></>;
}
