# Strong Properties — Phase One launch handoff

**Production finding:** the new homepage is deployed, but Vercel’s Supabase configuration is incomplete. Online catalogue/enquiry operation is blocked until the existing server variables are added and the project is redeployed. The code provides a clear telephone/WhatsApp fallback instead of collecting an enquiry it cannot save.

Updated 17 October 2026. TV campaign target: Sunday 18 October 2026. Existing repository: https://github.com/bfoh/strong. This report supersedes the earlier house-homepage reports for the public `/` route.

## 1. Audit findings

See [the pre-change audit](GHANA_LAUNCH_AUDIT.md). The actual root rendered `HousePage → HouseExperience`, while the 451-frame `CinematicHero` was unused. Phones used tap transitions. The existing Next.js 15 / React 19 / Supabase application already supported catalogue/detail/gallery, staff authentication, private uploads, enquiries and viewing requests. Those business routes were retained.

Read-only live inspection found zero properties and zero published listings. Both application storage buckets were private. The SQL quota RPC and Ghana listing fields were absent. No SQL connection or SQL Editor session was available. The owner explicitly requested prepared additive SQL and compatible fixes. The two contact numbers were supplied and authorized for display; no business email was supplied.

## 2. Files changed

- Public entry and layout: `app/page.tsx`, `app/layout.tsx`, `app/ghana.css`, `components/Header.tsx`, `components/layout/{SiteChrome,Footer}.tsx`, `components/landing/{CinematicHero,CategoryShowcase}.tsx`.
- New campaign and discovery: `app/tv/page.tsx`, `app/locations/[region]/page.tsx`, `components/marketing/*`, `public/campaign/{tv-launch.svg,README.md}`.
- Catalogue and contacts: `app/{properties,contact,about,book-viewing,privacy}/…`, `components/{PropertyCard,LeadForm,PropertyEditor}.tsx`, `components/properties/{Collection,PropertyFilters}.tsx`, `app/{sitemap,robots}.ts`.
- Staff and compatibility: `app/admin/marketing/page.tsx`, property editor pages, lead inbox pages, `components/admin/BuyerContext.tsx`, `components/AdminShell.tsx`, general enquiry inbox and legacy preview editor.
- Server foundation: `lib/{ghana,marketing,property-validation,private-quota,lead-context,lead-reporting}.ts`, `lib/{server,catalogue,config,data,public-leads,lead-validation}.ts`, `lib/house/{config,enquiries,storage}.ts`, `lib/cinematic/heroFrames.ts`, admin/property/media/enquiry routes.
- Migration, verification and operations: the SQL below, `tests/unit/ghana-launch.test.ts`, Ghana/consent/live browser suites, refreshed public/deployment/preview acceptance tests, `scripts/{measure-ghana-launch,prune-expired-lead-quotas,verify-secret-boundary}.mjs`, `.env.example`, README, this handoff and verification artifacts.

## 3. Features implemented

**Ready — public experience**

- Ghana-wide brand statement, search, category links, diaspora guidance, four-step service journey and direct enquiries.
- Fullscreen portrait/landscape architectural sequence with direct frame mapping, pinned viewport, exact reverse playback, keyboard Skip, reduced-motion/save-data/static/failure fallbacks. No automatic 451-frame download.
- Mobile decode cache: 10 frames / 2 concurrent requests. Desktop: 16 / 3. Stale seeks cancel, evictions and disposed bitmaps release resources. Frame assets are conceptual architecture, never represented as real inventory.
- Genuine published inventory only. Public fixture fallback removed. Honest empty/error states. Region pages and sitemap entries appear only with actual approved inventory.
- Ghana telephone/WhatsApp `+233546732018`; international telephone `+4916090882654`. No invented email, address, awards, testimonials, sales statistics or title guarantees.
- Fast static `/tv`, validated campaign tags, internal link/form attribution, native no-JavaScript general enquiry submission, and a locally generated/decode-verified QR code for the confirmed Vercel domain.

**Ready — compatible backend and operations**

- Voluntary residence/contact/remote-viewing preferences and UTM context persist privately with enquiries. Property-specific context uses immutable sidecars in the verified private bucket; existing relational lead tables remain compatible. General conversations remain private Storage records and appear in the staff inbox.
- Database quota RPC is preferred. If specifically absent, create-only private Storage reservations enforce the quota across instances; no non-atomic count fallback. Unknown backend failures fail closed. The private bucket must be verified before writes.
- Strict bounded property inputs, safe media URLs, GHS prices, explicit square-metre areas, key features and documentation information. Existing byte validation, WebP optimization and private media authorization retained.
- Draft and media preparation work on the current schema. New structured fields and publication remain visibly gated until migration. A validated browser-origin redirect fixes saving behind an internal hostname.
- Staff-only sampled campaign report: actual enquiry/viewing/qualified counts and sources. Missing traffic, spend, sales and commission data are labelled unavailable.
- Optional GA4/Google Ads tags load after opt-in; contact data and raw search text are excluded from application events. Configurable conversion measurement, revocation and admin exclusion were tested with intercepted Google requests. Production measurement is currently unconfigured.

## 4. Database migrations and maintenance

**Needs attention — prepared, not applied or database-executed**

1. Existing `supabase/migrations/20261012_live_security.sql`: atomic lead quota and restrictive private property-media policy.
2. New `supabase/migrations/20261016_ghana_launch.sql`: additive Ghana region/city/locality/type, availability, featured/review/authorization and approval audit fields; restrictive approved-property read and private-data/storage policies (features/media remain server-mediated); genuine public-location aggregation; transactional listing/specification/audit save RPC restricted to the service role and current authorized staff.

Apply in that order through Supabase SQL Editor or an authorized migration connection. Keep the existing tables and records. Existing listings are **not automatically approved**. After application, verify schema/RPC visibility, anonymous RLS and staff saves before reviewing and publishing real supplied inventory. The new RPC and migration-dependent publication path have not been executed against PostgreSQL here; SQL access remains unavailable.

Lead attribution does not depend on the new SQL: private Storage sidecars are the Phase One compatibility layer. A normalized CRM and commission ledger belong to Phase Two.

`node scripts/prune-expired-lead-quotas.mjs` is a dry-run maintenance tool; with server configuration it reports expired reservation count. Review before adding `--apply`. It only targets expired files under `quotas/`, never lead records. It has not been run against unrelated live objects. Enquiry retention/deletion remains a business process, not an automatic policy. Failed core lead inserts can leave private context sidecars; reconcile them by exact lead ID before any deletion.

## 5. Verification

Evidence lives in [visual-verification/ghana-launch](visual-verification/ghana-launch/).

- TypeScript, ESLint and production builds passed; unit suite includes filters, approval validation, immutable attribution/idempotency, atomic Storage quota, fail-closed capability detection and active-player resource lifetime.
- Browser frame evidence: first / quarter / midpoint / three-quarter / final; reverse canvas hashes match; cache and in-flight bounds hold. Rapid seeks settle on the exact target. Desktop and emulated mobile tested.
- Responsive checks: 320×568, 390×844, 844×390, 768×1024, 1280×800 and 1920×1080. Narrow button wrapping and Skip focus defects found by tests were corrected.
- Public pages: automated WCAG 2/2.1/2.2 A/AA checks with axe; mobile menu and keyboard form access; no-JavaScript, reduced motion, saving data and missing-frame fallbacks.
- Campaign links and successful/failing forms tested; failed forms preserve entered details. Optional analytics tested with synthetic local IDs and Google script stubbed; no real measurement requests sent.
- Real Supabase owned-fixture check passed: JS/native TV enquiry persistence and attribution, idempotent retry, existing staff-session access, staff inbox/report, private draft/specification save and media upload. Anonymous reads denied for real private draft, lead and upload fixtures. Public enquiries against drafts rejected. Exact owned records/files/audit entries removed. No email/WhatsApp messages sent, no accounts created, no synthetic listing published. Existing password login was not tested.
- Secret-boundary scan checked the client static build and public responses in memory; no service credential matches. Credentials were neither copied into this checkout nor committed.
- QR generation used `qrcode` 1.5.4; jsQR 1.4.0 decoded the exact campaign destination. Actual broadcast-size scanning remains an owner check.

Final normal-build acceptance: **36/36 unit tests; 15 browser checks passed, 5 desktop-only duplicates skipped; 1 real Supabase integration check passed; 1 intercepted analytics/consent check passed.** TypeScript, lint and optimized build passed. `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities. The preserved house preview was also exercised on desktop and emulated phone.

Cold lab results, three samples each (see `performance.json`):

| Measurement | Emulated mobile | Desktop |
| --- | --- | --- |
| Conditions | 390×844, DPR 2, 150 ms RTT, 3 Mbps down, CPU 4× | 1440×900, DPR 1, unthrottled |
| LCP observed | 1.052–1.132 s | 0.340–0.444 s |
| Startup image encoded bodies | 264,998 bytes | 750,558 bytes |
| Startup total resource encoded bodies | 549,123 bytes | 1,053,065 bytes |
| Initial frame resource entries | 7, including poster | 7, including poster |
| Exact seek settle observed | 69–495 ms | 61–134 ms |
| CLS observed | 0 | 0.000072 |

Startup includes six decoded neighbouring frames, never all 451. Mobile long tasks included a 434 ms cold-start outlier; desktop maximum observed was 108 ms. Seek timing includes automation/round-trip overhead and is not INP. JS heap at the startup sample was approximately 5.5 MB, excluding decoded-image and renderer memory. Dimension-derived retained bitmap estimates are 15.8 MiB mobile / 56.25 MiB desktop; transient decodes add up to 3.16 / 10.55 MiB, plus canvas and browser buffers. These are separate estimates, not total process memory. Performance was measured without other browser suites running. A subsequent CSS-only landscape Skip adjustment and blank-region admin safeguard do not change the player or assets.

The final readiness recheck found properties/enquiries/appointments counts at zero after cleanup, both buckets private, and the launch columns/quota RPC still absent. Public published lead success is covered by unit mocks; no genuine inventory was available for a live published-property enquiry/viewing run.

## 6. Remaining issues and launch gates

**Needs attention — overall campaign readiness**

- Supply genuine property details/media and publication permission, apply migration, then review/publish. Currently there is no public inventory. No fake listings were substituted.
- Business-approved controller identity, privacy/terms, retention schedule and supplier handling are outstanding. No regulatory registration, legal approval or ownership verification is claimed.
- Configure optional analytics IDs only after reviewing the privacy policy and consent wording. Disable GA4 enhanced measurement/automatic form collection and automatic history page views in the data stream to avoid collecting fields outside the application event allowlist. Real Google collection/conversion delivery is not verified.
- Test physical iOS Safari and Android Chrome, real mobile connections, and TV QR scanning. Chrome mobile emulation and lab timings do not establish field Core Web Vitals or accessibility certification.
- Confirm the operating team monitors the private inbox; automated email notifications are not configured.
- A real approved property detail → enquiry/viewing flow and new approval RPC need a post-migration end-to-end test. Existing schema paths have live private-fixture evidence; successful published lead API paths and quotas also have mocked unit coverage.

**Blocked — production backend configuration:** direct production checks found an unavailable catalogue and `robots.txt` disallowing all indexing. Local live integration passes with the existing Supabase environment. No authenticated Vercel session or token is available in this workspace; the owner has been asked to add the existing variables or connect access.

**Blocked — applying SQL:** no SQL Editor session or migration connection is available. The requested SQL is prepared; compatible Phase One flows work without it. No access or migration success is assumed.

**After launch — Phase Two:** full assigned CRM pipeline, negotiation/won/lost workflows, private commission ledger, offline qualified/sale conversion import, email automation, advertising execution, saved properties/comparison and expanded content. No commission rate or eligibility is hardcoded or exposed publicly.

## 7. Environment

Required existing server configuration: `NEXT_PUBLIC_SUPABASE_URL`, public anon/publishable key, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`. Both private storage buckets must remain private. Use the existing staff profile and auth setup.

In the Vercel **strong** project → Settings → Environment Variables, add the existing Supabase URL, public key and private server key for **Production**, then redeploy `main`. Do not paste service keys into chat, GitHub source or a `NEXT_PUBLIC_` variable. The existing values remain in the original local `.env.local`; no credentials were duplicated into this repository.

Set `NEXT_PUBLIC_SITE_URL=https://strong-eta.vercel.app` (or the verified future custom origin). Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is the validated fallback; arbitrary request Host is never a canonical source.

Optional verified overrides: `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_INTERNATIONAL_PHONE`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, business email/address/social URLs. Supplied telephone defaults are already in code. Keep unspecified details empty.

Optional measurement: `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`. No private advertising credentials are needed or hardcoded. `NEXT_PUBLIC_HERO_STATIC=1` enables the emergency static hero after rebuilding. `STRONG_HOUSE_LOCAL_PREVIEW=1` is for loopback-only legacy preview testing, not production publishing. `ALLOW_LEGACY_LEAD_LIMIT` is obsolete and unused.

## 8. Deployment

Commit and push the existing `main` branch to `bfoh/strong`; Vercel's existing GitHub integration deploys it. Do not replace the repository or create another hosting project. Verify the actual root, `/tv`, catalogue, contact links, QR asset, sitemap and private-route behavior after deployment. Keep secrets in hosting environment settings.

Changing to a custom domain requires setting the canonical production URL and regenerating the QR SVG. Do not air or print an outdated QR destination. Applying SQL is a separate authorized administrative action and is not performed by the GitHub deployment.

## 9. Final status

**Ready:** deployed Ghana homepage/TV frontend, contacts and QR; backend/enquiry/draft/media flows tested against real Supabase from a locally configured production build. This does not establish that production backend configuration is present.

**Needs attention:** the TV sales launch as a whole, pending genuine approved inventory, migration execution, business policy and device checks.

**Blocked:** production catalogue and online enquiry operation pending Vercel Supabase settings; direct SQL application is also unavailable in this workspace. Phase Two remains explicitly deferred.
