import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';
process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const required = {
  properties: 'id,slug,title,category,location,price,currency,description,image,images,beds,baths,status,created_at,updated_at',
  property_media: 'id,property_id,kind,url,caption,sort_order,created_at',
  property_features: 'id,property_id,plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities',
  enquiries: 'id,property_id,name,phone,email,message,status,assigned_to,created_at',
  appointments: 'id,property_id,name,phone,email,message,preferred_date,preferred_time,status,assigned_to,created_at',
  staff_profiles: 'id,full_name,role',
  lead_activities: 'id,enquiry_id,appointment_id,staff_id,activity_type,notes,created_at',
  audit_logs: 'id,actor_id,entity_type,entity_id,action,details,created_at',
};
function keyType(value) {
  if (value?.startsWith('sb_publishable_')) return 'publishable';
  if (value?.startsWith('sb_secret_')) return 'secret';
  try { return `legacy JWT (${JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role || 'unrecognized role'})`; } catch { return 'unrecognized or missing'; }
}
const report = { checkedAt: new Date().toISOString(), configured: Boolean(url && serverKey && publicKey), reachable: false, keyTypes: { public: keyType(publicKey), server: keyType(serverKey) }, tables: [], admin: {}, storage: {}, catalogueHelper: {}, quota: {}, schema: {} };
if (report.configured) {
  try {
    const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (u, opts) => fetch(u, { ...opts, signal: AbortSignal.timeout(20000) }) } });
    const anon = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const [table, columns] of Object.entries(required)) {
      const [service, publicRead] = await Promise.all([admin.from(table).select(columns, { count: 'exact' }).limit(1), anon.from(table).select('id', { count: 'exact' }).limit(1)]);
      report.tables.push({ table, compatibleColumns: !service.error, code: service.error?.code || null, rowCount: service.count, anonymousRowCount: publicRead.count, anonymousReadCode: publicRead.error?.code || null });
      if (!service.error) report.reachable = true;
    }
    const [users, profiles, buckets, helper] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 100 }), admin.from('staff_profiles').select('id,role'), admin.storage.listBuckets(), admin.rpc('public_property_locations'),
    ]);
    const matched = (profiles.data || []).filter(p => users.data?.users.some(u => u.id === p.id));
    report.admin = { authUserCount: users.data?.users.length || 0, profileCount: profiles.data?.length || 0, matchingAdminCount: matched.filter(p => p.role === 'admin').length, orphanProfileCount: (profiles.data || []).length - matched.length, authListSucceeded: !users.error, profileQuerySucceeded: !profiles.error, passwordTestConfigured: Boolean(process.env.LIVE_TEST_ADMIN_EMAIL && process.env.LIVE_TEST_ADMIN_PASSWORD) };
    report.storage = { inspected: !buckets.error, bucketCount: buckets.data?.length || 0, buckets: (buckets.data || []).map(b => ({ name: b.name, public: b.public, fileSizeLimit: b.file_size_limit, allowedMimeTypes: b.allowed_mime_types })) };
    report.catalogueHelper = { works: !helper.error, errorCode: helper.error?.code || null };
    const quota = await admin.from('public_lead_rate_limits').select('quota_key').limit(0);
    report.quota = { tableAvailable: !quota.error, errorCode: quota.error?.code || null };
    const schema = await fetch(new URL('/rest/v1/', url), { headers: { apikey: serverKey, ...(!serverKey.startsWith('sb_secret_') ? { Authorization: `Bearer ${serverKey}` } : {}), Accept: 'application/openapi+json' }, signal: AbortSignal.timeout(20000) });
    if (schema.ok) {
      const openapi = await schema.json();
      for (const table of Object.keys(required)) report.schema[table] = Object.fromEntries(Object.entries(openapi.definitions?.[table]?.properties || {}).map(([key, value]) => [key, { type: value.type, format: value.format, enum: value.enum }]));
    }
  } catch { report.connectionError = 'Connection or API inspection failed; no secrets or raw server errors logged.'; }
}
await writeFile('docs/live-supabase-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ configured: report.configured, reachable: report.reachable, keyTypes: report.keyTypes, tables: report.tables, admin: report.admin, storage: report.storage, catalogueHelper: report.catalogueHelper, quota: report.quota, connectionError: report.connectionError }, null, 2));
