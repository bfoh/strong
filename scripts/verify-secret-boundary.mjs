// Compare values only in memory. Never output credential values or matching file contents.
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const envPath=process.env.STRONG_ENV_FILE || '.env.local';
process.loadEnvFile(envPath);
const secrets = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'LIVE_TEST_ADMIN_PASSWORD'].map(name => ({ name, value: process.env[name] })).filter(x => x.value);
const report = { checkedAt: new Date().toISOString(), localEnvPermissions: (await stat(envPath)).mode & 0o777, exampleContainsOnlyCredentialPlaceholders: true, localEnvExcluded: false, staticFilesChecked: 0, secretMatches: [], publicResponseSecretMatches: [], gitHistoryAvailable: false, remotePublicJsFilesChecked: 0, publicSecretPatternMatches: [] };
const placeholders = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'LIVE_TEST_ADMIN_EMAIL', 'LIVE_TEST_ADMIN_PASSWORD'];
for (const line of (await readFile('.env.example', 'utf8')).split('\n')) {
  const match = line.match(/^([^#=\s]+)=(.*)$/);
  if (match && placeholders.includes(match[1]) && match[2].trim()) report.exampleContainsOnlyCredentialPlaceholders = false;
}
const ignored = await readFile('.gitignore', 'utf8');
report.localEnvExcluded = ignored.includes('.env*') && !ignored.includes('!.env.local');
try { await stat('.git'); report.gitHistoryAvailable = true; } catch { /* No history to audit in this checkout. */ }
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else {
      report.staticFilesChecked++;
      const bytes = await readFile(path);
      for (const secret of secrets) if (bytes.includes(Buffer.from(secret.value))) report.secretMatches.push({ file: path, secretVariable: secret.name });
    }
  }
}
await scan('.next/static');
const base = process.env.LIVE_TEST_BASE_URL || 'http://127.0.0.1:3000';
const publicScripts = new Set();
function inspectPublicText(body, source) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(body)) report.publicSecretPatternMatches.push({ source, kind: 'Supabase secret-key format' });
  for (const match of body.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString()).role === 'service_role') { report.publicSecretPatternMatches.push({ source, kind: 'Supabase service-role JWT' }); break; } } catch {}
  }
}

for (const route of ['/', '/properties', '/about', '/contact', '/admin/login']) {
  const response = await fetch(`${base}${route}`); if (!response.ok) throw Error('Public route check failed: ' + route);
  const body = await response.text(); inspectPublicText(body, route);
  for (const match of body.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)) {
    const asset = new URL(match[1].replaceAll('&amp;', '&'), base);
    if (asset.origin === new URL(base).origin && asset.pathname.startsWith('/_next/static/')) publicScripts.add(asset.href);
  }
  for (const secret of secrets) if (body.includes(secret.value)) report.publicResponseSecretMatches.push({ route, secretVariable: secret.name });
}
if (publicScripts.size > 80) throw Error('Unexpected public-script count; inspect before expanding the scan.');
const assets = [...publicScripts];
for (let offset = 0; offset < assets.length; offset += 4) {
  await Promise.all(assets.slice(offset, offset + 4).map(async asset => {
    const response = await fetch(asset); if (!response.ok) throw Error('Public JavaScript check failed.');
    const body = await response.text(), route = new URL(asset).pathname;
    report.remotePublicJsFilesChecked++; inspectPublicText(body, route);
    for (const secret of secrets) if (body.includes(secret.value)) report.publicResponseSecretMatches.push({ route, secretVariable: secret.name });
  }));
}
await writeFile('docs/visual-verification/ghana-launch/secret-boundary.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
process.exitCode = report.secretMatches.length || report.publicResponseSecretMatches.length || report.publicSecretPatternMatches.length || !report.exampleContainsOnlyCredentialPlaceholders || !report.localEnvExcluded || report.localEnvPermissions !== 0o600 ? 1 : 0;
