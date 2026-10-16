import { NextResponse } from 'next/server';
import { houseEnquiryHandler } from '@/lib/house/enquiries';
import { boundedBody } from '@/lib/request-body';
export async function POST(req: Request) {
  if (req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
    let result: Response;
    try {
      const form = new URLSearchParams(new TextDecoder().decode(await boundedBody(req, 32000)));
      const headers = new Headers(req.headers);
      headers.set('content-type', 'application/json');
      headers.set('idempotency-key', form.get('requestId') || '');
      headers.delete('content-length'); form.delete('requestId');
      result = await houseEnquiryHandler(new Request(req.url, { method: 'POST', headers, body: JSON.stringify(Object.fromEntries(form)) }));
    } catch { result = new Response(null, { status: 400 }); }
    const heading = result.ok ? 'Your enquiry has been received.' : 'Your enquiry could not be saved.';
    const detail = result.ok ? 'The team will use your contact details to follow up.' : 'Please use your browser’s Back button to return to your entered details and try again.';
    return new NextResponse('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Strong Properties — Enquiry</title></head><body style="background:#f6f1e8;color:#30261f;font:18px/1.7 system-ui;padding:10vh 8vw;max-width:800px"><main><p>STRONG PROPERTIES · KUMASI</p><h1>' + heading + '</h1><p>' + detail + '</p><a href="/#contact" style="color:inherit">Return to Strong Properties</a></main></body></html>', { status: result.ok ? 200 : result.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private,no-store', 'X-Robots-Tag': 'noindex' } });
  }
  return houseEnquiryHandler(req);
}
