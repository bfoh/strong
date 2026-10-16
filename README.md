# Strong Properties — Architectural Light

The approved interactive house experience is the public `/` homepage. Vercel production URL: [strong-eta.vercel.app](https://strong-eta.vercel.app/). Its three rooms, property-angle viewer, editable dashboard controls and private enquiry storage are documented in the [House homepage handoff](docs/HOUSE_HOMEPAGE_HANDOFF.md). Run `npm run build` and `npm run start` for a normal production server; no local-preview flag is required for the homepage, its images or enquiry endpoint. `/preview/house` is a separate local-only preview, available with `STRONG_HOUSE_LOCAL_PREVIEW=1`. Source is maintained at [bfoh/strong](https://github.com/bfoh/strong). The previous homepage source is retained in `production/house-v1/previous-homepage.tsx.txt`; the sections below include historical homepage work.

The repository contains application code, required public assets, generated house sources and house verification evidence. Local credentials, build output, reference-video downloads and raw recordings are excluded. The compact integration ZIP is generated locally with `python3 scripts/house/package-source.py`; the GitHub repository itself contains the full application source.

A Next.js public-property experience for Kumasi, Ghana, with an ivory/gold design, locally hosted Cormorant Garamond and Manrope fonts, GSAP storytelling and a lazy React Three Fiber architectural study. The existing Supabase schema, staff authentication and administration remain in place.

## Run locally

Use Node.js **22 or newer** (the installed Supabase client requires it). From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without database credentials, the site shows three explicitly labelled TV media previews. They are **not sale inventory**; request forms are disabled, robots disallows crawling, and previews never enter the sitemap.

For a local production preview:

```sh
npm run build
npm run start
```

The application is connected to the configured live Supabase project. Hosting and domain deployment remain separate.

## Configure the existing database

1. Store real values only in `.env.local` (ignored by Git). `.env.example` is a placeholder-only template. The integration accepts the modern `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` pair or the existing JWT `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` pair. Both require `NEXT_PUBLIC_SUPABASE_URL`. Server keys must never use a `NEXT_PUBLIC_` name.
2. The original eight tables from `supabase/schema.sql` already exist in the live project. Do not rerun its non-idempotent policy creation or replace existing tables.
3. Apply `supabase/migrations/20261012_live_security.sql` through Supabase SQL Editor. This additive migration installs the atomic shared lead quota and restrictive Storage policy without deleting application records. SQL migrations require a database connection or SQL Editor; REST API keys cannot run DDL.
4. `supabase/catalogue.sql` supplies the optional distinct published-location helper. The catalogue has a bounded fallback if the helper is unavailable.
5. Set the verified origin in `NEXT_PUBLIC_SITE_URL` and confirmed contact fields before building. Static company pages/configuration require a rebuild when those values change.

The administrator must have a real Supabase Auth user and a matching `staff_profiles` record with an allowed role. Draft, under-offer, sold and archived properties are excluded from public reads and submissions.

Authorized admin/manager/editor staff can upload, replace, order and delete media on a saved property's edit screen. Images (JPEG/PNG/WebP, 12MB) are decoded, stripped of metadata, resized to at most 2400px and converted to WebP. Optional MP4/WebM videos support range playback (50MB). PDF documents (10MB) remain staff-only. Multipart requests are bounded while streaming; declared MIME types and file signatures are checked.

Uploads use the **private** `strong-property-media` bucket. Managed references live in the existing `property_media.url` column; no duplicate media model or public document bucket is introduced. Public image/video requests go through `/api/media/[id]`, which rechecks media visibility and the parent property's published status every time. Private media and documents require an authorized editor session. Responses use `no-store`; managed images bypass Next's image cache, and optimizer configuration rejects all `/api/media/` URLs, so unpublishing also closes media access. Direct anonymous and authenticated Storage operations are denied; server authorization controls uploads. Replacement retires the previous object; failed cleanup is surfaced and recorded for administrator reconciliation.

Only public image/video rows are fetched for public rendering, including development RSC diagnostics. Approved legacy image URLs remain supported. Local static/third-party media cannot be revoked once distributed; use managed uploads for publication-controlled listing media.

## Public experience

- `/`: full-screen scroll-scrubbed cinematic hero (the supplied 451-frame villa visualisation), brand introduction, Land/Residential/Commercial categories, the newest published listings, land spotlight, the four-step approach, Kumasi story with published-location links, and a viewing/enquiry invitation.
- `/book-viewing`: choose any published property and send a viewing request or enquiry through the existing `/api/appointments` and `/api/enquiries` endpoints (appointments require a property). Shows an empty state when nothing is published.
- `/properties`: server-side search, category/type, published location, price range, sorting and nine-record pagination. All filters are shareable URL parameters; changing filters returns to page one. Unknown prices do not match price ranges.
- `/properties/[slug]`: published-only property details, fullscreen gallery with focus containment, Escape/arrow keys, thumbnails and horizontal touch gestures; features, documentation information, optional video, related properties and request forms.
- `/land`, `/residential`, `/commercial`: redirect to filtered catalogues.
- `/about`, `/contact`, `/privacy`, `/terms`: company story, genuine contact slots and explicitly provisional website notices.
- `/robots.txt`, `/sitemap.xml`: exclude administration, APIs and all development fixtures. The sitemap paginates published database slugs.

The schema contains no verified property coordinates. The Kumasi chapter therefore uses editorial art and links derived from published location labels, with no invented markers. A map is a future enhancement when genuine coordinates and a configured map provider exist.

## Cinematic hero (current)

`components/landing/CinematicHero.tsx` pins a 100svh stage inside a 400svh section (340svh on phones). Scroll progress is eased in a single `requestAnimationFrame` loop and written to one `--p` CSS variable that drives every overlay, so React never re-renders while scrolling. Frame 1 is server-rendered as the poster (no blank first paint); the canvas takes over once frames decode, covering the viewport at up to 2× DPR.

`lib/cinematic/heroFrames.ts` keeps a bounded set of decoded bitmaps (24 desktop / 18 mobile / 10 on Save-Data or ≤2 GB devices, which also use every third frame), loads ahead in the scroll direction, draws the nearest decoded frame while the exact one arrives, and warms the remaining frames into the HTTP cache coarse-to-fine at low priority. `next.config.ts` gives `/cinematic/hero/*` a 30-day cache; rename the folder if the footage changes. Reduced motion shows the poster only, at 100svh.

Frames live in `public/cinematic/hero/{desktop,mobile}/frame_0001…0451.webp`, re-encoded from the supplied 1280×720 JPEGs by `node scripts/cinematic/build-hero-frames.mjs "hero video/frames"` (desktop keeps 16:9; mobile is a centred 576×720 crop for portrait screens). The footage is 720p conceptual visualisation, labelled as such on the page, and is never presented as a listing.

Editorial photography for the land and Kumasi sections comes from Wikimedia Commons under CC BY / CC BY-SA licences; credits are rendered beside each image and recorded in `lib/assets.ts`. Footer social links appear only when `NEXT_PUBLIC_SOCIAL_*` URLs are set.

## Cinematic V2 motion and 3D (historical)

The following describes the retained V2 evidence. V3 replaces the live WebGL journey with the canvas frame player described below.

`components/motion/MotionShell.tsx` dynamically loads GSAP/ScrollTrigger, scopes/reverts animations with contexts and matchMedia, and provides masked headings, image expansion and measured parallax. Essential content is server-rendered and visible without motion.

`components/three/ArchitecturalJourney.tsx` sits directly after the fullscreen hero. One perspective camera moves along position/target splines through a genuine limestone pavilion, columns, openings, pool and restrained landscaping. A native sticky viewport gives ScrollTrigger a 360svh desktop / 310svh mobile range. Camera interpolation supports reverse scrolling and keyboard-accessible viewpoint controls. The final composition leads into the genuine published collection.

The WebGL module loads only when its viewport enters view. R3F uses on-demand frames, DPR capped at 1.5, a small 256px procedural stone texture and static shadow-map updates. Frames settle and stop; hidden/offscreen scenes suspend updates. Reduced motion, unavailable WebGL, context loss and constrained/data-saving devices show a labelled static architectural fallback with no extended sticky range. Native geometry is conceptual artwork, never actual inventory. No additional animation library was installed.

Original ImageGen artwork is centralized in `lib/assets.ts`: separate hero, land, residential, commercial, philosophy and closing identities. Native-resolution WebP derivatives and untouched PNG sources are under `public/images/cinematic-v2/`. Kumasi uses a public-domain Natural Earth Ghana border and verified city locator; there are no fabricated property pins. Hero/social metadata and Home/About philosophy reuse are intentional and documented.

See `docs/cinematic-v2-audit.md`, `docs/cinematic-v2-assets.json`, the three `docs/cinematic-v2-prompts-*.md` files. Actual browser camera values and five progress screenshots, reverse scrolling, desktop/mobile sections, fallback tests and recorded WebM evidence are retained under `docs/visual-verification/cinematic-v2/`.

## Enquiries and viewing requests

The `/api/enquiries` and `/api/appointments` endpoints insert into the original tables. Server checks enforce strict fields, bounded JSON bodies, genuine calendar dates, future preferences in Ghana time, published-property eligibility, permitted origins, a honeypot and phone normalization. Idempotency identifiers prevent duplicate inserts and reject reuse for different payloads. Database failures produce errors instead of success. Viewing requests remain `requested`; the UI explicitly says the time is **not confirmed**.

The migrated Supabase quota is atomic across server processes and both lead types: five requests per normalized contact/property in ten minutes. A bounded process-local burst guard adds protection. Production fails closed when the quota RPC is unavailable. The non-atomic persisted-count fallback is intended for local development only; `ALLOW_LEGACY_LEAD_LIMIT=true` is an explicit production override and should remain unset for deployment. This per-contact quota does not prevent attackers rotating phone numbers; add an edge/IP limiter and bot protection for an internet-facing launch. Slot capacity, automatic confirmations and notification delivery are not implemented.

## Staff administration

Every private page and mutation checks Supabase's authenticated user and a recognized matching staff role on the server. Admin/manager/editor roles can edit inventory and media; admin/manager/agent roles can manage customer requests. Editors cannot see lead pages; agents cannot mutate inventory or access private property documents. Staff pages are noindex. No server key is imported by client components.

Password login uses the real Supabase Auth API. Sessions use HTTP-only, SameSite=Lax cookies, secure in production, with a maximum one-hour lifetime. Logout clears the application cookie; token refresh is not implemented, so staff must sign in again after expiration. Redirects preserve the validated browser origin, including local `127.0.0.1` previews.

## Checks and reproducible QA

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

For a real backend audit and scoped integration verification, run the local application, then:

```sh
node scripts/audit-supabase.mjs
node scripts/verify-live-supabase.mjs
npx playwright test tests/browser/public.spec.ts --grep 'architectural study'
LIVE_PUBLIC_TEST_URL=http://127.0.0.1:3000 npx playwright test tests/browser/live-public.spec.ts
```

The live script uses installed Google Chrome. Its video fixture generator needs `npx playwright install ffmpeg` once. It creates an explicitly labelled temporary property, media, leads and QA Auth users, then removes only their tracked IDs/paths. Run against a development or maintenance environment where publishing that labelled temporary fixture is acceptable. Never use database-wide cleanup commands.

To test your existing administrator's password screen, put `LIVE_TEST_ADMIN_EMAIL` and `LIVE_TEST_ADMIN_PASSWORD` in `.env.local`; do not paste them into chat. Without them, verification uses a real one-time Supabase session for the existing authorized admin and tests password login/logout with a temporary QA administrator. The report distinguishes those methods. Secrets, customer records and raw exceptions are never included in the reports. Live results are in `docs/live-supabase-audit.json` and `docs/live-supabase-verification.json`. Set `LIVE_TEST_SERVER_MODE=development` or `production` when running the verifier to also retain a separately labelled report for that server mode.

`npm test` includes isolated unit tests using synthetic HTTP mocks; those are separate from live Supabase verification. The full `npm run test:e2e` preview suite expects an **unconfigured** QA server and preview fixtures, so do not run it blindly against the live environment. The optional `configured.spec.ts` suite uses `tests/support/mock-supabase.mjs`; those results are also local mocks, not live evidence.

With an idle production preview on port 3000, `node scripts/measure-performance.mjs` records three cold desktop and three simulated mobile samples to `docs/qa/performance.json`. These are lab results, not field p75 Core Web Vitals or a claim of measured INP compliance.

See [implementation plan](docs/IMPLEMENTATION_PLAN.md), [original frontend verification report](docs/VERIFICATION.md), [live backend verification report](docs/LIVE_SUPABASE_REPORT.md), and [media provenance, ImageGen prompt and launch replacement checklist](docs/MEDIA_CHECKLIST.md). Screenshots are in `docs/qa/`.

## Launch dependencies

Production readiness still requires the live security migration, genuine inventory and original listing media, verified company contacts, approved privacy/terms, edge abuse controls, notifications, monitoring and physical-device/field performance validation. No client testimonials, awards, business statistics, verified titles or social profiles were invented.

The PostCSS runtime advisory was addressed with a compatible 8.x override; the runtime audit reports no vulnerabilities at the time of verification. Development lint tooling still has the reported braces/fast-glob advisory chain, for which the installed registry has no patched braces release; do not run lint on untrusted glob patterns. Revisit the toolchain when a compatible patch is available.


## Cinematic production V3

The homepage now uses `CinematicScrollSequence`: a GSAP-driven Canvas2D frame player with exact bidirectional frame mapping, bounded decode/cache, portrait assets, loading/poster/error fallbacks and a visible Skip to Properties link. The current72-frame sequence is explicitly labelled **temporary camera blocking**, not photorealistic footage. Three.js is used by the offline preview script and is not the homepage renderer.

The host has no Blender installation or licensed architectural scene. The final visual gate remains open. Research, scene specification, storyboard and the executable external production workflow are in [the production README](production/cinematic/README.md). Render five proof frames and a camera playblast before approving a full240-frame Cycles render. The exporter selects a versioned manifest without rewriting the player.

Browser evidence, performance limits, business regression results and remaining gates are documented in [the V3 verification report](docs/cinematic-v3-verification.md). Existing Supabase migrations, authentication, admin, enquiries/viewings and media controls are retained.
