# Strong Properties — Phase One launch handoff

**Current status — 17 October 2026:** production configuration and the approved database migrations are complete. The live catalogue, enquiry forms, staff saves and private media review are connected. Twelve genuine media candidates are private drafts; none is approved or published. Their source claims, identity, current availability and publication permission still require business review. The dated audit and earlier verification sections below describe historical snapshots.

Updated 17 October 2026. TV campaign target: Sunday 18 October 2026. Existing repository: https://github.com/bfoh/strong. This report supersedes the earlier house-homepage reports for the public `/` route.

## 1. Audit findings

See [the pre-change audit](GHANA_LAUNCH_AUDIT.md). The actual root rendered `HousePage → HouseExperience`, while the 451-frame `CinematicHero` was unused. Phones used tap transitions. The existing Next.js 15 / React 19 / Supabase application already supported catalogue/detail/gallery, staff authentication, private uploads, enquiries and viewing requests. Those business routes were retained.

The initial read-only inspection found zero properties and zero published listings, private application storage buckets, and missing quota/launch functions. SQL access was initially unavailable. Since then, genuine source media was imported into twelve private candidates, the owner supplied a database connection, and explicitly approved the additive migrations. The two contact numbers were supplied and authorized for display; no business email was supplied.

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
- Draft/media preparation and structured location/review fields work on the migrated schema. Publication requires complete confirmed fields, approval, availability, permission and resolved imported-media identity. A validated browser-origin redirect fixes saving behind an internal hostname.
- Staff-only sampled campaign report: actual enquiry/viewing/qualified counts and sources. Missing traffic, spend, sales and commission data are labelled unavailable.
- Optional GA4/Google Ads tags load after opt-in; contact data and raw search text are excluded from application events. Configurable conversion measurement, revocation and admin exclusion were tested with intercepted Google requests. Production measurement is currently unconfigured.

## 4. Database migrations and maintenance

**Applied and verified — 17 October 2026, 18:54 UTC**

1. `supabase/migrations/20261012_live_security.sql`: atomic lead quota and restrictive private property-media policy were already present; this migration was not rerun.
2. `supabase/migrations/20261016_ghana_launch.sql`: applied additive Ghana region/city/locality/type, availability, featured/review/authorization and approval audit fields; restrictive approved-property read and private-data/storage policies; public-location aggregation; transactional listing/specification/audit save restricted to the service role and current authorized staff.
3. `supabase/migrations/20261017_media_review_private.sql`: applied the restrictive private source-review bucket policy.

The owner-approved SQL was applied over verified TLS in one transaction. Database checks covered service-only RPC access, quota limits, atomic saves, incomplete-publication rejection, feature-error rollback, discovery and anonymous/authenticated read restrictions. The approved publication/discovery fixture existed only inside the uncommitted transaction and was rolled back before commit. Existing twelve property drafts, gallery rows, specifications and audit records were unchanged. No migration-history record was fabricated. The sanitized receipt includes exact SQL hashes: [database-migrations.json](visual-verification/ghana-launch/database-migrations.json).

Production staff-form checks then created, updated and removed one clearly labelled private QA draft, verifying structured data, specifications, audit history and rejection of incomplete publication. The original twelve drafts remain private. Unknown price/bed/bath values remain null. All three storage buckets remain private. No source identity or business permission was approved by these tests.

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

The initial readiness recheck found an empty catalogue and missing SQL functions. That historical state is superseded by the applied-migration receipt and twelve private candidates above. A genuine approved property-specific enquiry/viewing still needs an end-to-end production check once the business approves inventory.

## 6. Remaining issues and launch gates

**Needs attention — overall campaign readiness**

- Review the twelve private candidates and unassigned source media. Confirm identity, exact location, factual details, current availability and publication permission before publishing. Currently there is no public inventory. No fake listings were substituted.
- Business-approved controller identity, privacy/terms, retention schedule and supplier handling are outstanding. No regulatory registration, legal approval or ownership verification is claimed.
- Configure optional analytics IDs only after reviewing the privacy policy and consent wording. Disable GA4 enhanced measurement/automatic form collection and automatic history page views in the data stream to avoid collecting fields outside the application event allowlist. Real Google collection/conversion delivery is not verified.
- Test physical iOS Safari and Android Chrome, real mobile connections, and TV QR scanning. Chrome mobile emulation and lab timings do not establish field Core Web Vitals or accessibility certification.
- Confirm the operating team monitors the private inbox; automated email notifications are not configured.
- A real approved property detail → enquiry/viewing flow still needs an end-to-end test after business approval. The new save RPC and database publication/discovery checks passed; no real listing was approved merely to test them.

**Resolved — production backend configuration:** after the owner configured Vercel and redeployed, the catalogue returned its genuine empty state, indexing was enabled, and two labelled production enquiries reached private storage and the production staff inbox. Both enquiries and their exact quota reservations were removed. See the configured production verification below.

**Resolved — applying SQL:** the owner supplied a connection and explicitly approved execution. The two pending migrations are applied, with database and production staff-form verification.

**After launch — Phase Two:** full assigned CRM pipeline, negotiation/won/lost workflows, private commission ledger, offline qualified/sale conversion import, email automation, advertising execution, saved properties/comparison and expanded content. No commission rate or eligibility is hardcoded or exposed publicly.

## 7. Environment

Required existing server configuration: `NEXT_PUBLIC_SUPABASE_URL`, public anon/publishable key, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`. All three application/review storage buckets must remain private. Use the existing staff profile and auth setup. Staff sign-in uses the staff account's email/password, never database credentials or API keys; existing passwords cannot be retrieved.

The owner has added the Supabase variables to Vercel **strong** → **Production** and redeployed `main`. For future configuration changes, update the project environment and redeploy; current deployments do not inherit newly saved values automatically. Do not paste service keys into chat, GitHub source or a `NEXT_PUBLIC_` variable. The existing values remain in the original local `.env.local`; no credentials were duplicated into this repository.

Set `NEXT_PUBLIC_SITE_URL=https://strong-eta.vercel.app` (or the verified future custom origin). Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is the validated fallback; arbitrary request Host is never a canonical source.

Optional verified overrides: `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_INTERNATIONAL_PHONE`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, business email/address/social URLs. Supplied telephone defaults are already in code. Keep unspecified details empty.

Optional measurement: `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`. No private advertising credentials are needed or hardcoded. `NEXT_PUBLIC_HERO_STATIC=1` enables the emergency static hero after rebuilding. `STRONG_HOUSE_LOCAL_PREVIEW=1` is for loopback-only legacy preview testing, not production publishing. `ALLOW_LEGACY_LEAD_LIMIT` is obsolete and unused.

## 8. Deployment

Commit and push the existing `main` branch to `bfoh/strong`; Vercel's existing GitHub integration deploys it. Do not replace the repository or create another hosting project. Verify the actual root, `/tv`, catalogue, contact links, QR asset, sitemap and private-route behavior after deployment. Keep secrets in hosting environment settings.

Changing to a custom domain requires setting the canonical production URL and regenerating the QR SVG. Do not air or print an outdated QR destination. Applying SQL is a separate authorized administrative action and is not performed by the GitHub deployment.

## 9. Final status

**Ready:** deployed Ghana homepage/TV frontend, contacts, QR, catalogue connection, production enquiry persistence, attribution, private staff inbox/reporting, migrated structured editor, transactional saves and private media review. Password login was not tested or changed.

**Needs attention:** the TV sales launch as a whole, pending business approval of genuine inventory, business policy and device checks.

**No database-access blocker remains.** Phase Two remains explicitly deferred.

## Initial production verification — 17 October 2026, 03:16 UTC

Implementation commit `3d66f73f76d359b4dbe109ef7df884e71ce7763c` and production fallback commit `af7e4741a65d9205222bc11e776c813d1a397bd6` were pushed to GitHub `main`. Vercel reported successful deployment for both.

Read-only verification against **https://strong-eta.vercel.app** at 03:16 UTC confirmed:

- Root, TV, catalogue, contact, about, booking, privacy, sitemap, robots and QR asset return 200.
- The new Ghana root is present; the old three-room homepage is not the public root.
- Actual desktop and emulated phone playback painted frames 1 → 114 → 226 → 451 → 114. No browser page errors or horizontal overflow; canonical URL is the correct production origin.
- `/tv` has no canvas and its Explore Properties action retains `tv / broadcast / launch_oct2026` attribution.
- Both verified telephone links and WhatsApp destination are present. The deployed QR bytes match the locally decoded asset.
- The private preview returns 404; marketing reporting redirects unauthenticated visitors to staff sign-in. Invalid submissions return 400 before storage.
- The deployed contact fallback is visible while backend configuration is incomplete. No production buyer/test lead was created by this verification.
- Client-build and deployed-response scans found no server credential matches.

That initial run intentionally exited **2** because `backendReady` was false. The owner subsequently added the Production configuration and redeployed; [`production.json`](visual-verification/ghana-launch/production.json) and the verification below supersede the original backend blocker. SQL application was subsequently completed as recorded above. Real inventory approval and business policy/device checks remain open.


## Configured production verification — 17 October 2026, 13:26–13:28 UTC

Vercel reported the owner’s successful redeployment of `c315cd27e0460f2fd2109f2f91e86a56b659840b` at 13:24 UTC. Direct checks at **https://strong-eta.vercel.app** then confirmed:

- All ten public route/asset checks returned 200; `backendReady` is now **true**, with no configuration issues. The catalogue shows zero genuine published properties rather than a service error. `robots.txt` allows public indexing and includes the production sitemap.
- Desktop and emulated mobile frame playback, canonical URLs, TV attribution, private preview protection and report authorization passed again on the configured deployment.
- The new opt-in `tests/browser/production-enquiry.spec.ts` passed against the actual production domain: mobile JavaScript submission and native no-JavaScript submission saved with TV attribution, optional residence/contact preferences and remote-viewing interest.
- An identical retry returned an idempotent acknowledgement; an altered payload with the same identifier was rejected. Anonymous private-object reads and image-route bypass were denied.
- Both enquiries were visible through the existing authorized staff session in the actual production inbox; attribution appeared in the private campaign report. No accounts were created and no email, phone or WhatsApp messages were sent. Password authentication was not tested.
- The two exact owned enquiry records and their quota files were deleted, with record absence verified afterward. No property was invented or published and unrelated business records were preserved.

Evidence: [`production.json`](visual-verification/ghana-launch/production.json), [`production-enquiry.json`](visual-verification/ghana-launch/production-enquiry.json), and [`secret-boundary.json`](visual-verification/ghana-launch/secret-boundary.json). Run the production fixture suite only with deliberate `STRONG_PRODUCTION_QA=1` and the existing server environment; it requires authorized cleanup access before testing.

This 13:26–13:28 UTC snapshot preceded the private media import and migration application. See the current status above and the post-migration evidence below. No commission eligibility or rate is assumed.

## Post-migration production verification — 17 October 2026

The approved migrations committed at 18:54 UTC. The existing deployed application detected the new schema without a code change or environment update.

- The staff editor enabled structured location, review and publication controls. Native form creation and update saved a private QA draft, specifications and two audit entries through the transactional RPC. Unknown price/bed/bath values stayed null. Anonymous reads and incomplete publication were rejected. Mobile editing and the imported-media review safeguard passed.
- Production mobile JavaScript and native no-JavaScript TV enquiries reached private storage, the staff inbox and campaign reporting with attribution. Retry/conflict handling and anonymous read restrictions passed under the new storage policies. The two owned enquiries and their exact quota files were removed.
- All 65 unique original-file hashes matched the private audit. The source report represented all 66 originals; all 48 assigned images decoded and all eleven original tours supported byte ranges and played. Previews requested no tour before playback. Anonymous access to every draft and managed asset was denied; private source review, mobile galleries and stale/cross-origin confirmation rejection passed. Public catalogue and sitemap responses contained no draft or provenance data.
- The owned draft and its audit rows were removed. The original twelve candidates remain draft, unapproved, unauthorized for publication and availability unknown. No account was created, password changed, message sent or synthetic property published.
- ESLint and whitespace checks passed for the verification/documentation update. The application source and assets were unchanged; earlier build, typecheck, unit and browser results above remain the application validation baseline.

Evidence: [database receipt](visual-verification/ghana-launch/database-migrations.json), [staff-form receipt](visual-verification/ghana-launch/post-migration-production.json), [media verification](visual-verification/ghana-launch/post-migration-media.json), and [production enquiry receipt](visual-verification/ghana-launch/production-enquiry.json). `scripts/verify-launch-migration.mjs` requires deliberate `STRONG_MIGRATION_QA=1`, existing server environment and cleanup access; it creates only a private owned draft and removes it afterward. Private screenshots and original-source records remain outside the public repository.
