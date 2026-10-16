# Live Supabase verification — 12 October 2026

The application is connected to the real Supabase project. The cinematic website, GSAP motion and architectural 3D study are preserved. Live publishing, authentication/authorization and media operations work. **Production enquiry/viewing submission is deliberately blocked until `supabase/migrations/20261012_live_security.sql` is applied.** The last explicit REST audit returned `PGRST205` for the quota table and `PGRST202` for the quota function; an empty HEAD response was insufficient to establish table existence and was corrected with explicit REST reads.

| Area | Live result |
| --- | --- |
| Environment | Real values moved into `.env.local`, mode `0600`, excluded by `.gitignore`. `.env.example` has empty credential placeholders. Legacy JWT roles match `anon` and `service_role`; modern publishable/secret aliases are supported. |
| Database | All eight requested tables exist. REST OpenAPI types and required query columns match the application. Actual fixtures exercise properties, media, features, enquiries, appointments, staff profiles, activities and audit logging. |
| Administrator | The existing confirmed Auth user matches its authorized `admin` profile. A real Supabase one-time session verifies that user's admin access. Password login, invalid-password feedback, HTTP-only cookies and logout pass through the application UI with a disposable QA administrator. **The existing administrator's password remains untested because local test credentials were not supplied.** |
| Property lifecycle | Draft creation/edit, public invisibility, publication, catalogue search/detail, price/description updates and unpublication succeed against live data. Unpublication also blocks media and new customer requests. |
| Enquiries / appointments | In development, real public browser forms save enquiries as `new` and viewing preferences as `requested`, show genuine success feedback, and admins can see/update both. Idempotent retries save once; malicious fields/dates/origins are rejected. Production correctly displays an error and inserts nothing while the atomic quota RPC is absent. |
| Media | Private bucket created with size/MIME restrictions. Staff image uploads are decoded, optimized to WebP and stripped of metadata. Gallery ordering, replacement/old-object removal, deletion, private PDF access and optional video streaming/range responses and native Chrome decoding pass live checks. Public queries exclude private images/documents before rendering. |
| Privacy / roles | Anonymous and authenticated nonstaff requests cannot access admin data or mutations. Editor and agent permissions are separated. Anonymous customer-table reads are tested with populated fixtures in development. Direct anonymous/authenticated Storage uploads/reads are denied; managed public delivery rechecks published status. |

Managed media also bypasses the image optimizer, and `images.localPatterns` rejects `/api/media/` URLs, preventing cached optimizer delivery after unpublication. The media endpoint sends `no-store` and documents are staff-only attachments. Gallery ordering changes only ranks, preserving concurrent URL/caption edits; it is retryable if a partial rank update fails. Replacement/deletion cleanup failures are surfaced; retired object references are recorded in audit entries for reconciliation.

## Verification evidence

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: **16 passed**. These are isolated unit tests, including HTTP mocks; they are not counted as live database tests.
- `npm run build`: passed with the live `.env.local` environment.
- Production Chrome browser tests: **6 passed** across desktop/mobile, covering cinematic motion, responsive/navigation/accessibility checks, architectural 3D/fallback and protected admin access.
- Real backend results: **26 passed, 1 blocked** in development; **21 passed, 7 blocked** in production, with **no failing available checks**. Production blocked steps depend on the missing quota migration. See `live-supabase-verification.development.json` and `live-supabase-verification.production.json`. Blocked tests are explicitly recorded and produce a nonzero verifier exit code; they are never reported as successful live operations.
- `live-secret-verification.json`: **133 production client files** and public responses scanned against actual server secret values; no matches. Example placeholders and local file permissions verified.
- `live-supabase-audit.json`: safe schema/role/bucket metadata and final row counts, without credentials or private customer records.

All fixtures use explicit STRONG QA/INTEGRATION TEST labels and random owned IDs. Cleanup removes only those properties, linked test requests/activities/media/audits, known object paths and four temporary QA Auth users. The original administrator is retained. Each final run verifies scoped cleanup; no table was dropped, truncated or broadly cleared.

## Remaining dependencies

1. Apply **`supabase/migrations/20261012_live_security.sql`** in SQL Editor and reply **applied**. It installs the atomic five-submission contact/property quota shared across processes and lead types, and a restrictive server-only Storage policy. Supplied REST/Auth/Storage keys cannot execute SQL DDL. Concurrent quota enforcement and final production persistence require this migration. Do not set `ALLOW_LEGACY_LEAD_LIMIT=true` for deployment to conceal this dependency.
2. To verify your existing administrator's password, set `LIVE_TEST_ADMIN_EMAIL` and `LIVE_TEST_ADMIN_PASSWORD` in `.env.local`, then rerun the verifier. Never paste the password into chat. QA password login already works; this remaining check is account-specific.
3. The per-contact quota is not comprehensive bot protection: rotating phone numbers can bypass it. Add an edge/IP limiter or CAPTCHA before internet-facing launch. Confirm the deployment origin/contact details, approved privacy/terms and genuine listing media. Session refresh, notifications and automatic appointment confirmation are not implemented.

This checkout has no Git history, so prior credential commits cannot be established. No exposure was found in current client assets or public responses. If the earlier credential-bearing `.env.example` was committed or shared elsewhere, rotate the affected Supabase server key before deployment; removing it from the current file does not revoke prior copies.

SQL constraints/policy definitions were not inspected through a database connection; compatibility is established by REST metadata and actual live operations/access tests. The restrictive migration policy cannot be claimed applied until the migration is available and verified.

Implementation references: [Supabase API key types](https://supabase.com/docs/guides/getting-started/api-keys), [private Storage and RLS](https://supabase.com/docs/guides/storage/security/access-control), [Next.js image local patterns](https://nextjs.org/docs/15/pages/api-reference/components/image#localpatterns).
