import {NextResponse} from 'next/server';
import {propertyFieldLabels} from './property-validation';

type Details = {fieldErrors: Record<string, string[] | undefined>; formErrors?: string[]};
const escapeHtml = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

export function propertyFormFailure(req: Request, error: string, status: number, code: string, details?: Details, propertyId?: string) {
  const headers = {'Cache-Control':'private, no-store'};
  if (!req.headers.get('accept')?.includes('text/html')) return NextResponse.json({error,code,...(details ? {details} : {})},{status,headers});
  const id = propertyId && /^[a-f0-9-]{36}$/i.test(propertyId) ? propertyId : undefined;
  const href = id ? `/admin/properties/${id}` : '/admin/properties';
  const issues = Object.entries(details?.fieldErrors || {}).flatMap(([field,messages]) => (messages || []).map(message => `<li><strong>${escapeHtml(propertyFieldLabels[field] || 'Property field')}:</strong> ${escapeHtml(message)}</li>`)).join('');
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Strong Properties — Property editor</title></head><body style="background:#f9f5ec;color:#242320;font:18px/1.7 system-ui;padding:8vh 7vw;max-width:800px"><main><p>STRONG PROPERTIES · STAFF ONLY</p><h1>Your property needs attention.</h1><p>${escapeHtml(error)}</p>${issues ? `<ul>${issues}</ul>` : ''}<p>Use your browser’s Back button to return to your entered details. To keep working before publication is ready, choose Draft and save again.</p><a href="${href}" style="color:inherit">Reopen the property editor</a></main></body></html>`,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'}});
}

export function propertyFormSuccess(req: Request, id: string, status: string) {
  if (req.headers.get('accept')?.includes('application/json')) return NextResponse.json({ok:true,id,status},{headers:{'Cache-Control':'private, no-store'}});
  return NextResponse.redirect(new URL(`/admin/properties/${id}`,req.headers.get('origin')!),303);
}
