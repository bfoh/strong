// Real Supabase verification. No mocks. All created fixtures have scoped UUIDs and explicit TEST labels.
// Never logs passwords, API keys, access tokens, private customer records, or raw exceptions.
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile, readFile, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.LIVE_TEST_BASE_URL || 'http://127.0.0.1:3000';
const origin = new URL(base).origin, run = randomUUID(), slug = `strong-integration-test-${run}`;
const service = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const serverMode = ['development', 'production'].includes(process.env.LIVE_TEST_SERVER_MODE) ? process.env.LIVE_TEST_SERVER_MODE : 'unspecified';
const report = { checkedAt: new Date().toISOString(), kind: 'LIVE SUPABASE — no mocks', serverMode, run, authenticationMethod: null, passwordLogin: 'not tested', steps: [], cleanup: {} };
const owned = { authUsers: [], properties: [], enquiries: [], appointments: [], objects: new Set(), media: [], quotas: new Set() };
let browser, context, visitor, token, account, propertyId;
class VerificationFailure extends Error {}
class VerificationBlocked extends VerificationFailure {}
function requireThat(value, label = 'Verification assertion failed') { if (!value) throw new VerificationFailure(label); }
async function step(name, task) {
  try { await task(); report.steps.push({ name, passed: true }); console.log(`PASS: ${name}`); return true; }
  catch (error) { const detail = error instanceof VerificationFailure ? error.message : 'Failed; no secrets, request bodies or raw exceptions logged.'; const blocked = error instanceof VerificationBlocked; report.steps.push({ name, passed: false, blocked, detail }); console.log(`${blocked ? 'BLOCKED' : 'FAIL'}: ${name}: ${detail}`); return false; }
}
async function leadStep(name, task) {
  return step(name, report.productionLeadsBlocked ? async () => { throw new VerificationBlocked('Production lead persistence awaits the atomic quota migration'); } : task);
}
const propertyForm = { title: `STRONG INTEGRATION TEST ${run.slice(0, 8)} — NOT FOR SALE`, slug, category: 'residential', location: 'Kumasi — automated test only', price: '', image: '', images: '', beds: '3', baths: '2', description: 'Automated live integration test. This temporary fixture is not company inventory and is not offered for sale.', status: 'draft' };
const leadPayload = (phone, message = 'Automated integration test only.') => ({ propertyId, name: `STRONG QA ${run}`, phone, email: `qa-${run}@example.invalid`, message });
function quotaKey(phone) { return createHash('sha256').update(`${propertyId}:${phone.replace(/\D/g, '')}`).digest('hex'); }
async function saveProperty(values) {
  const response = await context.request.post(`${base}/api/admin/properties`, { headers: { origin }, form: { ...propertyForm, id: propertyId || '', ...values }, maxRedirects: 0 });
  requireThat(response.status() === 303);
}
async function publicDetail() { return visitor.request.get(`${base}/properties/${slug}`); }
async function qaStaff(role) {
  const email = `strong-${role}-${run}@example.invalid`, password = randomUUID() + randomUUID();
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true }); requireThat(!created.error);
  owned.authUsers.push(created.data.user.id);
  const profile = await service.from('staff_profiles').insert({ id: created.data.user.id, role, full_name: `STRONG QA ROLE TEST ${run}` }); requireThat(!profile.error);
  return { email, password };
}
async function mediaUpload(file, kind = 'image', visibility = 'public', replaceId = '') {
  const response = await context.request.post(`${base}/api/admin/media`, { headers: { origin }, multipart: { propertyId, kind, visibility, replaceId, caption: `QA ${kind} ${run}`, file } });
  requireThat(response.status() === 201, `Media upload expected 201, received ${response.status()}`);
  const data = await response.json(); owned.media.push(data.mediaId);
  const row = await service.from('property_media').select('url').eq('id', data.mediaId).single(); requireThat(!row.error);
  const prefix = 'sp-storage://strong-property-media/'; requireThat(row.data.url.startsWith(prefix)); owned.objects.add(row.data.url.slice(prefix.length));
  return data.mediaId;
}
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext(); visitor = await browser.newContext();
  const quotaProbe = await service.rpc('consume_public_lead_quota', { p_key: 'invalid-probe-no-record-created', p_limit: 5, p_window_seconds: 600 });
  report.quotaFunctionAvailable = !quotaProbe.error;
  report.productionLeadsBlocked = serverMode === 'production' && quotaProbe.error?.code === 'PGRST202';
  await step('All administrative pages and mutations reject unauthenticated visitors', async () => {
    for (const path of ['/admin', '/admin/properties', '/admin/properties/new', '/admin/enquiries', '/admin/appointments']) {
      const response = await visitor.request.get(`${base}${path}`); requireThat(response.url().includes('/admin/login'));
    }
    for (const path of ['/api/admin/properties', '/api/admin/status', '/api/admin/media']) {
      const response = await visitor.request.post(`${base}${path}`, { headers: { origin }, data: {} }); requireThat([401, 403].includes(response.status()));
    }
    const response = await visitor.request.get(`${base}/api/admin/media?propertyId=${randomUUID()}`); requireThat(response.status() === 403);
  });
  const authorised = await step('Supabase Auth validates the administrator and matching staff profile', async () => {
    const users = await service.auth.admin.listUsers({ page: 1, perPage: 100 }), profiles = await service.from('staff_profiles').select('id,role');
    requireThat(!users.error && !profiles.error);
    const admins = users.data.users.filter(u => profiles.data.some(p => p.id === u.id && p.role === 'admin'));
    account = process.env.LIVE_TEST_ADMIN_EMAIL ? admins.find(u => u.email?.toLowerCase() === process.env.LIVE_TEST_ADMIN_EMAIL.toLowerCase()) : admins.length === 1 ? admins[0] : undefined;
    requireThat(account && account.email_confirmed_at);
    if (process.env.LIVE_TEST_ADMIN_EMAIL && process.env.LIVE_TEST_ADMIN_PASSWORD) {
      report.authenticationMethod = 'Existing administrator password through application login screen';
      const page = await context.newPage(); await page.goto(`${base}/admin/login`);
      await page.getByLabel('Email', { exact: true }).fill(process.env.LIVE_TEST_ADMIN_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(process.env.LIVE_TEST_ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign in securely' }).click();
      await page.waitForURL(/\/admin$/); report.passwordLogin = 'passed';
      const cookies = await context.cookies(); const cookie = cookies.find(c => c.name === 'sp_admin_token'); requireThat(cookie?.httpOnly && cookie.sameSite === 'Lax'); token = cookie.value;
      await page.close();
    } else {
      // Creates an OTP only for this confirmed existing admin; no email is sent and no account/role is created or changed.
      const link = await service.auth.admin.generateLink({ type: 'magiclink', email: account.email }); requireThat(!link.error);
      const session = await auth.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'email' }); requireThat(!session.error && session.data.session);
      token = session.data.session.access_token; report.authenticationMethod = 'Real Supabase-issued one-time session; password screen remains untested';
      await context.addCookies([{ name: 'sp_admin_token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    }
    const user = await auth.auth.getUser(token); requireThat(!user.error && user.data.user.id === account.id);
    const dashboard = await context.request.get(`${base}/admin`); requireThat(dashboard.ok() && !dashboard.url().includes('/login'));
  });
  if (!authorised) throw Error('No authorised test session');
  await step('Application password login and logout work with a temporary QA administrator', async () => {
    const credentials = await qaStaff('admin'), login = await browser.newContext();
    try {
      const page = await login.newPage(); await page.goto(`${base}/admin/login`);
      await page.getByLabel('Email', { exact: true }).fill(credentials.email);
      await page.getByLabel('Password', { exact: true }).fill('deliberately-incorrect-test-password');
      await page.getByRole('button', { name: 'Sign in securely' }).click(); await page.waitForURL(/error=1/);
      await page.getByLabel('Email', { exact: true }).fill(credentials.email);
      await page.getByLabel('Password', { exact: true }).fill(credentials.password);
      await page.getByRole('button', { name: 'Sign in securely' }).click(); await page.waitForURL(`${base}/admin`);
      const cookie = (await login.cookies()).find(c => c.name === 'sp_admin_token'); requireThat(cookie?.httpOnly && cookie.sameSite === 'Lax');
      requireThat((await login.request.get(`${base}/admin`)).ok());
      await login.request.post(`${base}/api/admin/logout`, { headers: { origin }, maxRedirects: 0 });
      requireThat(!(await login.cookies()).some(c => c.name === 'sp_admin_token' && c.value));
      requireThat((await login.request.get(`${base}/admin`)).url().includes('/admin/login'));
      report.applicationPasswordWorkflow = 'passed with a temporary QA administrator; existing administrator password is reported separately';
    } finally { await login.close(); }
  });
  await step('Authenticated nonstaff users cannot enter admin routes or mutate inventory', async () => {
    const email = `strong-nonstaff-${run}@example.invalid`, password = randomUUID() + randomUUID();
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true }); requireThat(!created.error); owned.authUsers.push(created.data.user.id);
    const nonstaff = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const session = await nonstaff.auth.signInWithPassword({ email, password }); requireThat(!session.error);
    const outsider = await browser.newContext();
    try {
      await outsider.addCookies([{ name: 'sp_admin_token', value: session.data.session.access_token, url: base, httpOnly: true, sameSite: 'Lax' }]);
      const dashboard = await outsider.request.get(`${base}/admin`); requireThat(dashboard.url().includes('/admin/login'));
      const update = await outsider.request.post(`${base}/api/admin/status`, { headers: { origin }, data: {} }); requireThat(update.status() === 401);
      const property = await outsider.request.post(`${base}/api/admin/properties`, { headers: { origin }, form: {} }); requireThat(property.status() === 403);
      const media = await outsider.request.get(`${base}/api/admin/media?propertyId=${randomUUID()}`); requireThat(media.status() === 403);
    } finally { await nonstaff.auth.signOut({ scope: 'local' }); await outsider.close(); }
  });
  const created = await step('Administrator creates a draft property through the real application endpoint', async () => {
    await saveProperty({}); const data = await service.from('properties').select('id,status').eq('slug', slug).single(); requireThat(!data.error && data.data.status === 'draft'); propertyId = data.data.id; owned.properties.push(propertyId);
  });
  if (!created) throw Error('No test property');
  await step('Draft is absent from public catalogue, detail, and anonymous database reads', async () => {
    requireThat((await publicDetail()).status() === 404);
    const catalogue = await visitor.request.get(`${base}/properties?q=${run.slice(0, 8)}`); requireThat(!(await catalogue.text()).includes(propertyForm.title));
    const rows = await anon.from('properties').select('id').eq('id', propertyId); requireThat(!rows.error && rows.data.length === 0);
  });
  await step('Administrator edits the draft and the edit persists', async () => {
    propertyForm.price = '123456'; propertyForm.description += ' Draft edited successfully.'; await saveProperty({});
    const row = await service.from('properties').select('price,description').eq('id', propertyId).single(); requireThat(Number(row.data.price) === 123456 && row.data.description.includes('Draft edited'));
  });
  let imageOne, imageTwo, documentId, videoId;
  const imageBytes = await readFile('public/images/executive-residence.jpeg');
  await step('Staff upload optimises an image into private Storage and draft media stays hidden', async () => {
    imageOne = await mediaUpload({ name: 'qa-photo.jpeg', mimeType: 'image/jpeg', buffer: imageBytes });
    requireThat((await visitor.request.get(`${base}/api/media/${imageOne}`)).status() === 404);
    const buckets = await service.storage.listBuckets(); requireThat(buckets.data.find(b => b.name === 'strong-property-media')?.public === false);
  });
  await step('Invalid file content and public-document uploads are rejected', async () => {
    const wrong = await context.request.post(`${base}/api/admin/media`, { headers: { origin }, multipart: { propertyId, kind: 'image', visibility: 'public', caption: 'QA invalid image', file: { name: 'malicious.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<script>invalid</script>') } } }); requireThat(wrong.status() === 400);
    const pdf = await context.request.post(`${base}/api/admin/media`, { headers: { origin }, multipart: { propertyId, kind: 'document', visibility: 'public', caption: 'QA invalid document visibility', file: { name: 'private.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') } } }); requireThat(pdf.status() === 400);
  });
  await step('Administrator publishes; catalogue and property detail become public', async () => {
    propertyForm.status = 'published'; await saveProperty({});
    const detail = await publicDetail(); requireThat(detail.ok() && (await detail.text()).includes(propertyForm.title));
    const listing = await visitor.request.get(`${base}/properties?q=${run.slice(0, 8)}`); requireThat((await listing.text()).includes(propertyForm.title));
    const rows = await anon.from('properties').select('id').eq('id', propertyId); requireThat(rows.data.length === 1);
  });
  await step('Existing property features support real typed records', async () => {
    const features = await service.from('property_features').insert({ property_id: propertyId, plot_size_sqm: 500, building_size_sqm: 200, tenure: 'QA tenure only', documentation_status: 'TEST documentation — not verified', amenities: ['QA fixture amenity only'] }); requireThat(!features.error);
    const html = await (await publicDetail()).text(); requireThat(html.includes('QA fixture amenity only') && html.includes('TEST documentation'));
  });
  await step('Published image streams publicly; direct anonymous Storage access remains denied', async () => {
    requireThat(imageOne);
    const photo = await visitor.request.get(`${base}/api/media/${imageOne}`); requireThat(photo.ok() && photo.headers()['content-type'].startsWith('image/webp'));
    requireThat(photo.headers()['cache-control'].includes('no-store'));
    const cached = await visitor.request.get(`${base}/_next/image?url=${encodeURIComponent(`/api/media/${imageOne}`)}&w=640&q=75`); requireThat(cached.status() === 400, 'Managed media must be denied by the image optimizer');
    const path = [...owned.objects][0]; const direct = await anon.storage.from('strong-property-media').download(path); requireThat(Boolean(direct.error));
    const publicUrl = anon.storage.from('strong-property-media').getPublicUrl(path).data.publicUrl;
    const exposed = await visitor.request.get(publicUrl); requireThat(!exposed.ok());
    const forbiddenPath = `${propertyId}/public/${randomUUID()}/${randomUUID()}.webp`; owned.objects.add(forbiddenPath);
    const forbidden = await anon.storage.from('strong-property-media').upload(forbiddenPath, await readFile('public/images/properties/executive-residence.webp'), { contentType: 'image/webp' }); requireThat(Boolean(forbidden.error));
  });
  await step('Gallery order, replacement, private PDF access and media deletion work', async () => {
    imageTwo = await mediaUpload({ name: 'qa-second.png', mimeType: 'image/png', buffer: await readFile('docs/qa/hero-mobile.png') });
    documentId = await mediaUpload({ name: 'qa-private.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF') }, 'document', 'private');
    const privateImage = await mediaUpload({ name: 'qa-private.jpeg', mimeType: 'image/jpeg', buffer: imageBytes }, 'image', 'private');
    const list = await service.from('property_media').select('id').eq('property_id', propertyId).order('sort_order');
    const ids = [imageTwo, imageOne, ...list.data.map(m => m.id).filter(id => id !== imageOne && id !== imageTwo)];
    const order = await context.request.patch(`${base}/api/admin/media`, { headers: { origin }, data: { propertyId, ids } }); requireThat(order.ok(), `Gallery reorder returned ${order.status()}`);
    const ordered = await service.from('property_media').select('id').eq('property_id', propertyId).order('sort_order'); requireThat(ordered.data[0].id === imageTwo, 'Gallery ordering did not persist');
    const before = (await service.from('property_media').select('url').eq('id', imageOne).single()).data.url;
    await mediaUpload({ name: 'replacement.jpeg', mimeType: 'image/jpeg', buffer: imageBytes }, 'image', 'public', imageOne);
    const oldPath = before.slice('sp-storage://strong-property-media/'.length); const old = await service.storage.from('strong-property-media').download(oldPath); requireThat(Boolean(old.error), 'Replaced storage object still exists');
    requireThat((await visitor.request.get(`${base}/api/media/${documentId}`)).status() === 404, 'Private document exposed to visitor');
    const privateDoc = await context.request.get(`${base}/api/media/${documentId}`); requireThat(privateDoc.ok() && privateDoc.headers()['content-disposition'].startsWith('attachment'), `Staff document download returned ${privateDoc.status()}`);
    const html = await (await publicDetail()).text(); requireThat(!html.includes(documentId) && !html.includes(privateImage), 'Private media identifier leaked in public page');
    requireThat((await visitor.request.get(`${base}/api/media/${privateImage}`)).status() === 404);
    requireThat((await context.request.get(`${base}/api/media/${privateImage}`)).ok());
    const page = await visitor.newPage();
    try {
      await page.goto(`${base}/properties/${slug}`); await page.getByRole('button', { name: 'Explore gallery' }).click();
      await page.getByRole('dialog').waitFor(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
      requireThat(!await page.getByRole('dialog').count());
    } finally { await page.close(); }
    const removed = await context.request.delete(`${base}/api/admin/media?id=${imageTwo}`, { headers: { origin } }); requireThat(removed.ok(), `Media deletion returned ${removed.status()}`);
    const gone = await service.from('property_media').select('id').eq('id', imageTwo); requireThat(gone.data.length === 0);
  });
  await step('Optional video upload and HTTP range playback work', async () => {
    let videoPath = process.env.LIVE_TEST_VIDEO_PATH;
    if (!videoPath) {
      const directory = await mkdtemp(join(tmpdir(), 'strong-qa-video-'));
      const recording = await browser.newContext({ viewport: { width: 320, height: 180 }, recordVideo: { dir: directory, size: { width: 320, height: 180 } } });
      try {
        const page = await recording.newPage();
        await page.setContent('<body style="background:#eee;color:#222;font:24px sans-serif;padding:16px">STRONG QA<br>TEST VIDEO ONLY</body>');
        await page.waitForTimeout(1000); const video = page.video();
        await recording.close();
        videoPath = 'docs/qa/live-upload-test.webm'; await copyFile(await video.path(), videoPath);
      } finally { await recording.close(); await rm(directory, { recursive: true, force: true }); }
    }
    videoId = await mediaUpload({ name: 'qa-clip.webm', mimeType: 'video/webm', buffer: await readFile(videoPath) }, 'video', 'public');
    const partial = await visitor.request.get(`${base}/api/media/${videoId}`, { headers: { range: 'bytes=0-127' } }); requireThat(partial.status() === 206 && partial.headers()['content-type'].startsWith('video/webm'));
    const page = await visitor.newPage();
    try {
      await page.goto(`${base}/properties/${slug}`);
      const loaded = await page.locator('video').first().evaluate(video => new Promise(resolve => {
        const timeout = setTimeout(() => resolve(false), 15000);
        video.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(video.duration > 0); }, { once: true });
        video.addEventListener('error', () => { clearTimeout(timeout); resolve(false); }, { once: true });
        video.load();
      }));
      requireThat(loaded, 'Native browser could not decode the uploaded QA video');
    } finally { await page.close(); }
  });
  await leadStep('Public enquiry saves once and duplicate retries do not add records', async () => {
    const id = randomUUID(); owned.enquiries.push(id); const phone = '233000000001'; owned.quotas.add(quotaKey(phone));
    const payload = leadPayload(phone);
    const first = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': id }, data: payload }); requireThat(first.status() === 201);
    const second = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': id }, data: payload }); requireThat(second.ok() && (await second.json()).duplicate === true);
    const saved = await service.from('enquiries').select('id,status').eq('id', id); requireThat(saved.data.length === 1 && saved.data[0].status === 'new');
  });
  await leadStep('Public viewing request saves as requested, not confirmed', async () => {
    const id = randomUUID(); owned.appointments.push(id); const phone = '233000000002'; owned.quotas.add(quotaKey(phone));
    const result = await visitor.request.post(`${base}/api/appointments`, { headers: { origin, 'idempotency-key': id }, data: { ...leadPayload(phone), preferredDate: '2099-01-15', preferredTime: '09:30' } });
    requireThat(result.status() === 201 && (await result.json()).status === 'requested');
    const saved = await service.from('appointments').select('id,status,preferred_time').eq('id', id).single(); requireThat(saved.data.status === 'requested' && saved.data.preferred_time.startsWith('09:30'));
  });
  await leadStep('Existing lead activities table accepts a private test activity', async () => {
    const saved = await service.from('lead_activities').insert({ enquiry_id: owned.enquiries[0], staff_id: account.id, activity_type: 'qa_verification', notes: 'STRONG integration verification test only' }); requireThat(!saved.error);
  });
  await leadStep('Admin sees incoming requests and can update enquiry and appointment statuses', async () => {
    for (const [kind, table, target] of [['enquiry', 'enquiries', 'qualified'], ['appointment', 'appointments', 'confirmed']]) {
      const html = await context.request.get(`${base}/admin/${table}`); requireThat((await html.text()).includes(`STRONG QA ${run}`));
      const id = owned[table][0]; const update = await context.request.post(`${base}/api/admin/status`, { headers: { origin }, data: { id, kind, status: target } }); requireThat(update.ok());
      const saved = await service.from(table).select('status').eq('id', id).single(); requireThat(saved.data.status === target);
    }
  });
  await step('Live editor and agent roles enforce separate inventory and customer-data permissions', async () => {
    for (const role of ['editor', 'agent']) {
      const credentials = await qaStaff(role), staffAuth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), staffContext = await browser.newContext();
      try {
        const session = await staffAuth.auth.signInWithPassword(credentials); requireThat(!session.error);
        await staffContext.addCookies([{ name: 'sp_admin_token', value: session.data.session.access_token, url: base, httpOnly: true, sameSite: 'Lax' }]);
        const leads = await staffContext.request.get(`${base}/admin/enquiries`);
        if (role === 'editor') {
          requireThat(leads.url().endsWith('/admin') && !(await leads.text()).includes(`STRONG QA ${run}`));
          const status = await staffContext.request.post(`${base}/api/admin/status`, { headers: { origin }, data: { kind: 'enquiry', id: owned.enquiries[0], status: 'closed' } }); requireThat(status.status() === 403);
          requireThat((await staffContext.request.get(`${base}/api/admin/media?propertyId=${propertyId}`)).ok());
        } else {
          requireThat(leads.ok() && !leads.url().includes('/login') && (report.productionLeadsBlocked || (await leads.text()).includes(`STRONG QA ${run}`)));
          const mutation = await staffContext.request.post(`${base}/api/admin/properties`, { headers: { origin }, form: { ...propertyForm, id: propertyId } }); requireThat(mutation.status() === 403);
          requireThat((await staffContext.request.get(`${base}/api/admin/media?propertyId=${propertyId}`)).status() === 403);
          if (documentId) requireThat((await staffContext.request.get(`${base}/api/media/${documentId}`)).status() === 404);
        }
        const direct = await staffAuth.from('enquiries').select('id'); requireThat(direct.error || direct.data.length === 0);
        const forbiddenPath = `${propertyId}/private/${randomUUID()}/${randomUUID()}.webp`; owned.objects.add(forbiddenPath);
        const upload = await staffAuth.storage.from('strong-property-media').upload(forbiddenPath, await readFile('public/images/properties/executive-residence.webp'), { contentType: 'image/webp' }); requireThat(Boolean(upload.error));
      } finally { await staffAuth.auth.signOut({ scope: 'local' }); await staffContext.close(); }
    }
  });
  await step('Anonymous visitors cannot read private requests, staff, activities or audit records', async () => {
    for (const table of ['enquiries', 'appointments', 'staff_profiles', 'lead_activities', 'audit_logs', 'property_media', 'property_features']) {
      const read = await anon.from(table).select('id'); requireThat(read.error || read.data.length === 0);
    }
  });
  await leadStep('Public browser forms show genuine database success and unconfirmed viewing feedback', async () => {
    const page = await visitor.newPage();
    try {
      await page.goto(`${base}/properties/${slug}`);
      await page.getByLabel('YOUR NAME', { exact: true }).fill(`STRONG QA ${run}`);
      await page.getByLabel('PHONE NUMBER', { exact: true }).fill('233000000006');
      await page.getByLabel('EMAIL (OPTIONAL)', { exact: true }).fill(`qa-${run}@example.invalid`);
      await page.getByLabel('PREFERRED DATE', { exact: true }).fill('2099-01-15');
      await page.getByLabel('PREFERRED TIME (GHANA)', { exact: true }).fill('10:30');
      await page.getByRole('button', { name: 'Send viewing request' }).click();
      await page.getByRole('status').filter({ hasText: 'not confirmed' }).waitFor();
      await page.getByRole('button', { name: 'Make an enquiry', exact: true }).click();
      await page.getByLabel('YOUR NAME', { exact: true }).fill(`STRONG QA ${run}`);
      await page.getByLabel('PHONE NUMBER', { exact: true }).fill('233000000007');
      await page.getByLabel('EMAIL (OPTIONAL)', { exact: true }).fill(`qa-${run}@example.invalid`);
      await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Your enquiry has been received' }).waitFor();
    } finally {
      for (const table of ['enquiries', 'appointments']) { const data = await service.from(table).select('id').eq('property_id', propertyId).eq('email', `qa-${run}@example.invalid`); for (const row of data.data || []) if (!owned[table].includes(row.id)) owned[table].push(row.id); }
      owned.quotas.add(quotaKey('233000000006')); owned.quotas.add(quotaKey('233000000007'));
      await page.close();
    }
  });
  if (report.productionLeadsBlocked) await step('Missing production quota shows accurate API/browser errors and inserts nothing', async () => {
    const id = randomUUID(); owned.enquiries.push(id);
    const response = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': id }, data: leadPayload('233000000008') }); requireThat(response.status() === 503);
    const page = await visitor.newPage();
    try {
      await page.goto(`${base}/properties/${slug}`); await page.getByRole('button', { name: 'Make an enquiry', exact: true }).click();
      await page.getByLabel('YOUR NAME', { exact: true }).fill(`STRONG QA ${run}`); await page.getByLabel('PHONE NUMBER', { exact: true }).fill('233000000008');
      await page.getByRole('button', { name: 'Send enquiry', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Request protection is temporarily unavailable' }).waitFor();
    } finally { await page.close(); }
    const saved = await service.from('enquiries').select('id').eq('property_id', propertyId); requireThat(!saved.error && saved.data.length === 0);
  });
  await step('Malicious fields, invalid dates and unrelated origins are rejected', async () => {
    const attack = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin }, data: { ...leadPayload('233000000004'), status: 'confirmed', assigned_to: account.id } }); requireThat(attack.status() === 400);
    const date = await visitor.request.post(`${base}/api/appointments`, { headers: { origin }, data: { ...leadPayload('233000000004'), preferredDate: '2099-02-30', preferredTime: '25:70' } }); requireThat(date.status() === 400);
    const foreign = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin: 'https://untrusted.example.invalid' }, data: leadPayload('233000000004') }); requireThat(foreign.status() === 403);
  });
  await leadStep('Excessive unique submissions hit the shared five-request quota', async () => {
    const phone = '233000000003'; owned.quotas.add(quotaKey(phone));
    for (let i = 0; i < 5; i++) { const id = randomUUID(); owned.enquiries.push(id); const response = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': id }, data: leadPayload(phone, `Rate test ${i} only`) }); requireThat(response.status() === 201); }
    const excess = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': randomUUID() }, data: leadPayload(phone, 'Excess rate test only') }); requireThat(excess.status() === 429);
  });
  await step('Atomic shared Supabase quota enforces sequential and concurrent limits', async () => {
    const phone = '233000000003';
    const atomic = await service.rpc('consume_public_lead_quota', { p_key: quotaKey(phone), p_limit: 5, p_window_seconds: 600 }); report.atomicQuotaLive = !atomic.error;
    if (atomic.error?.code === 'PGRST202') throw new VerificationBlocked('Awaiting application of 20261012_live_security.sql');
    requireThat(!atomic.error && atomic.data === false, 'Atomic quota verification failed');
    const publicRpc = await anon.rpc('consume_public_lead_quota', { p_key: quotaKey(phone), p_limit: 5, p_window_seconds: 600 }); requireThat(Boolean(publicRpc.error));
    const concurrentPhone = '233000000005'; owned.quotas.add(quotaKey(concurrentPhone));
    const concurrent = await Promise.all(Array.from({ length: 7 }, (_, index) => {
      const id = randomUUID(); owned.enquiries.push(id);
      return visitor.request.post(`${base}/api/enquiries`, { headers: { origin, 'idempotency-key': id }, data: leadPayload(concurrentPhone, `Concurrent QA request ${index}`) });
    }));
    requireThat(concurrent.filter(r => r.status() === 201).length === 5 && concurrent.filter(r => r.status() === 429).length === 2, 'Concurrent quota did not enforce exactly five submissions');
    const stored = await service.from('enquiries').select('id', { count: 'exact', head: true }).eq('property_id', propertyId).eq('phone', concurrentPhone); requireThat(stored.count === 5);
  });
  await step('Price and description updates are visible on the public site', async () => {
    propertyForm.price = '234567'; propertyForm.description += ' Published update verified.'; await saveProperty({});
    const detail = await publicDetail(); requireThat((await detail.text()).includes('Published update verified.'));
    const price = await service.from('properties').select('price').eq('id', propertyId).single(); requireThat(Number(price.data.price) === 234567);
  });
  await step('Unpublishing removes the listing, blocks media, and rejects new requests', async () => {
    propertyForm.status = 'draft'; await saveProperty({}); requireThat((await publicDetail()).status() === 404);
    const listing = await visitor.request.get(`${base}/properties?q=${run.slice(0, 8)}`); requireThat(!(await listing.text()).includes(propertyForm.title));
    if (imageOne) requireThat((await visitor.request.get(`${base}/api/media/${imageOne}`)).status() === 404);
    const rows = await anon.from('properties').select('id').eq('id', propertyId); requireThat(rows.data.length === 0);
    const request = await visitor.request.post(`${base}/api/enquiries`, { headers: { origin }, data: leadPayload('233000000009') }); requireThat(request.status() === 404);
  });
  await step('Admin logout clears the cookie and protects subsequent requests', async () => {
    const response = await context.request.post(`${base}/api/admin/logout`, { headers: { origin }, maxRedirects: 0 }); requireThat(response.status() === 303);
    const cookies = await context.cookies(); requireThat(!cookies.some(c => c.name === 'sp_admin_token' && c.value));
    const admin = await context.request.get(`${base}/admin`); requireThat(admin.url().includes('/admin/login'));
  });
} catch { report.executionInterrupted = 'Required setup or earlier step failed; later steps were not falsely reported as tested.'; }
finally {
  // Scoped cleanup: only this run's known IDs/paths. Never truncate, broadly delete customer data, or delete the existing administrator.
  try {
    const discovered = await service.from('properties').select('id').eq('slug', slug);
    requireThat(!discovered.error);
    for (const row of discovered.data || []) if (!owned.properties.includes(row.id)) owned.properties.push(row.id);
    if (!propertyId && owned.properties.length) propertyId = owned.properties[0];
    for (const table of ['enquiries', 'appointments']) if (propertyId) { const data = await service.from(table).select('id').eq('property_id', propertyId).eq('email', `qa-${run}@example.invalid`); requireThat(!data.error); for (const row of data.data || []) if (!owned[table].includes(row.id)) owned[table].push(row.id); }
    for (const id of owned.properties) await service.from('properties').update({ status: 'archived' }).eq('id', id).eq('slug', slug);
    for (const table of ['enquiries', 'appointments']) if (owned[table].length) {
      const relation = table === 'enquiries' ? 'enquiry_id' : 'appointment_id';
      const activities = await service.from('lead_activities').delete().in(relation, owned[table]); requireThat(!activities.error);
      const leads = await service.from(table).delete().in('id', owned[table]).eq('property_id', propertyId); requireThat(!leads.error);
    }
    if (owned.properties.length) {
      const rows = await service.from('property_media').select('id,url').in('property_id', owned.properties);
      for (const row of rows.data || []) if (row.url.startsWith('sp-storage://strong-property-media/') && owned.media.includes(row.id)) owned.objects.add(row.url.slice('sp-storage://strong-property-media/'.length));
      if (owned.objects.size) { const removed = await service.storage.from('strong-property-media').remove([...owned.objects]); requireThat(!removed.error); }
      const media = await service.from('property_media').delete().in('id', [...new Set(owned.media)]).eq('property_id', propertyId); requireThat(!media.error);
      const audit = await service.from('audit_logs').delete().in('entity_id', [...owned.properties, ...owned.enquiries, ...owned.appointments]); requireThat(!audit.error);
      const remaining = await Promise.all(['enquiries', 'appointments', 'property_media'].map(table => service.from(table).select('id', { count: 'exact', head: true }).eq('property_id', propertyId)));
      const safe = remaining.every(row => !row.error && row.count === 0);
      if (safe) { const removed = await service.from('properties').delete().eq('id', propertyId).eq('slug', slug); requireThat(!removed.error); }
      report.cleanup.fixturePropertyRemoved = safe;
      report.cleanup.unexpectedRowsPreserved = !safe;
    }
    if (owned.quotas.size) {
      const quotas = await service.from('public_lead_rate_limits').delete().in('quota_key', [...owned.quotas]);
      requireThat(!quotas.error || ['PGRST205', '42P01'].includes(quotas.error.code));
    }
    const remaining = owned.properties.length ? await service.from('properties').select('id', { head: true, count: 'exact' }).in('id', owned.properties) : { count: 0 };
    report.cleanup.remainingFixtureProperties = remaining.count;
    report.cleanup.verified = remaining.count === 0;
    for (const id of owned.authUsers) { const deleted = await service.auth.admin.deleteUser(id); requireThat(!deleted.error); }
    report.cleanup.testOnlyAuthUsersRemoved = owned.authUsers.length;
    const profiles = await service.from('staff_profiles').select('id', { count: 'exact', head: true }).in('id', owned.authUsers);
    requireThat(!profiles.error && profiles.count === 0); report.cleanup.testStaffProfilesRemoved = true;
  } catch { report.cleanup.verified = false; report.cleanup.detail = 'Some scoped cleanup needs a retry; unrelated records were preserved.'; }
  await auth.auth.signOut({ scope: 'local' }).catch(() => {});
  await browser?.close();
  await writeFile('docs/live-supabase-verification.json', JSON.stringify(report, null, 2) + '\n');
  if (serverMode !== 'unspecified') await writeFile(`docs/live-supabase-verification.${serverMode}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passwordLogin: report.passwordLogin, authenticationMethod: report.authenticationMethod, passed: report.steps.filter(s => s.passed).length, failed: report.steps.filter(s => !s.passed && !s.blocked).map(s => s.name), blocked: report.steps.filter(s => s.blocked).map(s => s.name), cleanup: report.cleanup }, null, 2));
}
process.exitCode = report.steps.some(s => !s.passed) || report.executionInterrupted || !report.cleanup.verified ? 1 : 0;
