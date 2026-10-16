import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { defaultHouseSettings } from '../../lib/house/config';
test.use({ trace: 'off', video: 'off', screenshot: 'off' });
test('live private enquiry storage, existing staff editor and image upload', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(120000);
  const base = 'http://127.0.0.1:3000', bucket = 'strong-homepage-private', settingsPath = 'settings/homepage-v1.json';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  expect(Boolean(url && key && publicKey)).toBe(true);
  const service = createClient(url, key, { auth: { persistSession: false } });
  const auth = createClient(url, publicKey, { auth: { persistSession: false } });
  const anonymous = createClient(url, publicKey, { auth: { persistSession: false } });
  const storage = service.storage.from(bucket), owned = new Set<string>(), ownIds = new Set<string>(), hashes = new Set<string>();
  const context = await browser.newContext(), admin = await browser.newContext(), plain = await browser.newContext({ javaScriptEnabled: false });
  const previous = await storage.download(settingsPath);
  const baseline = previous.data ? JSON.parse(await previous.data.text()) : defaultHouseSettings;
  let changed = false;
  const report: Record<string, unknown> = { liveSupabase: true, notificationsSent: false, accountCreated: false, passwordLoginTested: false };
  try {
    const page = await context.newPage(); await page.goto(base + '/preview/house#contact');
    await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
    const phone = '+000 000 ' + String(Math.floor(Math.random() * 900000) + 100000), name = 'STRONG HOMEPAGE QA ' + randomUUID().slice(0,8);
    hashes.add(createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex'));
    await page.getByLabel('Your name', { exact: true }).fill(name); await page.getByLabel('Phone number', { exact: true }).fill(phone);
    await page.getByLabel('Your message', { exact: false }).fill('Owned verification fixture. No communication requested.');
    const pending = page.waitForRequest(r => r.url().endsWith('/api/house-enquiries') && r.method() === 'POST');
    await page.getByRole('button', { name: 'Send my enquiry', exact: true }).click();
    const submitted = await pending, id = submitted.headers()['idempotency-key'];
    expect(Boolean(id)).toBe(true); ownIds.add(id); owned.add('enquiries/' + id + '.json');
    await expect(page.getByRole('status')).toContainText('Your enquiry has been received');
    const record = await storage.download('enquiries/' + id + '.json'); expect(record.error).toBeNull();
    expect(JSON.parse(await record.data!.text()).name === name).toBe(true);
    const replay = await context.request.post(base + '/api/house-enquiries', { headers: { Origin: base, 'Idempotency-Key': id }, data: submitted.postDataJSON() });
    expect(replay.status()).toBe(200); expect((await replay.json()).duplicate).toBe(true);
    const privateRead = await anonymous.storage.from(bucket).download('enquiries/' + id + '.json');
    expect(Boolean(privateRead.error)).toBe(true);
    const imageBypass = await context.request.get(base + '/api/house-images/' + id); expect(imageBypass.status()).toBe(404);
    report.formStored = true; report.retryIdempotent = true; report.anonymousReadDenied = true; report.enquiryCannotBeServedAsImage = true;

    const p = await plain.newPage(); await p.goto(base + '/preview/house#contact');
    const nativeId = await p.locator('input[name=requestId]').getAttribute('value');
    ownIds.add(nativeId!); owned.add('enquiries/' + nativeId + '.json');
    const nativePhone = '+000 001 ' + String(Math.floor(Math.random() * 900000) + 100000);
    hashes.add(createHash('sha256').update(nativePhone.replace(/\D/g, '')).digest('hex'));
    await p.getByLabel('Your name', { exact: true }).fill('STRONG NATIVE FORM QA');
    await p.getByLabel('Phone number', { exact: true }).fill(nativePhone);
    await p.getByRole('button', { name: 'Send my enquiry', exact: true }).click();
    await expect(p.getByRole('heading', { name: 'Your enquiry has been received.' })).toBeVisible();
    const nativeRecord = await storage.download('enquiries/' + nativeId + '.json'); expect(nativeRecord.error).toBeNull();
    report.noJavaScriptSubmissionStored = true;

    // Reuse the existing account/session verification mechanism in this repository.
    // No email is sent, no user is created and no staff role is changed.
    const profile = await service.from('staff_profiles').select('id').eq('role', 'admin').limit(1).maybeSingle();
    expect(Boolean(profile.data?.id)).toBe(true);
    const account = await service.auth.admin.getUserById(profile.data!.id);
    const link = await service.auth.admin.generateLink({ type: 'magiclink', email: account.data.user!.email! });
    expect(link.error === null).toBe(true);
    const session = await auth.auth.verifyOtp({ token_hash: link.data.properties!.hashed_token, type: 'email' });
    expect(session.error === null && Boolean(session.data.session)).toBe(true);
    await admin.addCookies([{ name: 'sp_admin_token', value: session.data.session!.access_token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    const editor = await admin.newPage(); await editor.goto(base + '/admin');
    await editor.locator('.house-editor summary').click();
    await expect(editor.getByLabel('Exterior headline', { exact: true })).toBeVisible();
    await editor.getByLabel('Exterior headline', { exact: true }).fill('Temporary verification headline');
    await editor.getByLabel('Page title', { exact: true }).fill('Temporary verification title');
    await editor.getByLabel('Phone tap transition (ms)', { exact: true }).fill('350');
    changed = true;
    await editor.getByRole('button', { name: 'Save homepage settings', exact: true }).click();
    await expect(editor.locator('.house-editor [role=status]')).toContainText('Saved.');
    await page.goto(base + '/preview/house'); await expect(page.locator('h1')).toHaveText('Temporary verification headline');
    await expect(page).toHaveTitle('Temporary verification title');
    expect(await page.locator('.house-home').evaluate(el => el.getAttribute('style')?.includes('350ms'))).toBe(true);
    report.editorTextMetadataAndMotionPersisted = true;
    const uploadResponse = editor.waitForResponse(r => r.url().endsWith('/api/admin/house-images') && r.request().method() === 'POST');
    await editor.locator('.house-editor input[type=file]').first().setInputFiles('public/images/house-v1/exterior-thumb.webp');
    const uploaded = await uploadResponse; expect(uploaded.status()).toBe(201);
    const imageUrl = (await uploaded.json()).url as string; const imageId = imageUrl.split('/').pop()!;
    owned.add('assets/' + imageId + '.webp');
    await expect(editor.locator('.house-editor [role=status]')).toContainText('Image uploaded.');
    await editor.getByRole('button', { name: 'Save homepage settings', exact: true }).click();
    await expect(editor.locator('.house-editor [role=status]')).toContainText('Saved.');
    const image = await context.request.get(base + imageUrl + '?variant=thumb');
    expect(image.status()).toBe(200); expect(image.headers()['content-type']).toContain('image/webp');
    report.visualImageUploadAndSave = true;
    await editor.goto(base + '/admin/enquiries'); await expect(editor.getByText(name, { exact: true })).toBeVisible();
    report.staffPrivateInbox = true;
  } finally {
    if (changed) {
      const restored = await storage.upload(settingsPath, JSON.stringify(baseline), { contentType: 'application/json', upsert: true });
      expect(restored.error === null).toBe(true);
    }
    const quotas = await storage.list('quotas', { limit: 1000 });
    for (const file of quotas.data || []) if ([...hashes].some(hash => file.name.startsWith(hash + '-'))) {
      const object = await storage.download('quotas/' + file.name);
      if (object.data && ownIds.has(JSON.parse(await object.data.text()).id)) owned.add('quotas/' + file.name);
    }
    if (owned.size) { const removed = await storage.remove([...owned]); expect(removed.error === null).toBe(true); }
    await auth.auth.signOut({ scope: 'local' }); await context.close(); await admin.close(); await plain.close();
    report.ownedFixturesRemoved = true; report.settingsRestored = true;
    await mkdir('docs/visual-verification/house-v1', { recursive: true });
    await writeFile('docs/visual-verification/house-v1/live-integration.json', JSON.stringify(report, null, 2));
  }
});
