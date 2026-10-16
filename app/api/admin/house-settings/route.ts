import { NextResponse } from 'next/server';
import { staff, canEditProperties } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/origin';
import { boundedBody } from '@/lib/request-body';
import { houseSettingsSchema } from '@/lib/house/config';
import { privateHouseStorage, SETTINGS_PATH } from '@/lib/house/storage';
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'This request origin is not allowed.' }, { status: 403 });
  const person = await staff();
  if (!person || !canEditProperties(person)) return NextResponse.json({ error: 'An authorized editor session is required.' }, { status: 403 });
  try {
    const content = houseSettingsSchema.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req, 16000))));
    const storage = await privateHouseStorage();
    const result = await storage.upload(SETTINGS_PATH, JSON.stringify(content), { contentType: 'application/json', upsert: true, cacheControl: '0' });
    if (result.error) return NextResponse.json({ error: 'Settings could not be saved.' }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Check your settings and try again.' }, { status: 400 }); }
}
