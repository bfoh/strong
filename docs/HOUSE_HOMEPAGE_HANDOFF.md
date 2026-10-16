# Strong House Experience — version 1.0.1

Delivered 16 October 2026 in the existing Strong Properties Next.js application. After the user requested to proceed, the house experience was assigned to the local `/` homepage, with the previous preview URL retained. It remains loopback-only and noindex. The user selected [bfoh/strong](https://github.com/bfoh/strong) for the source push. No connected hosted Site, deployment configuration or verified public origin was found; pushing source does not deploy the website. No public website deployment has occurred. The previous homepage source is preserved in `production/house-v1/previous-homepage.tsx.txt`.

## Open and edit

- [Walk through the local homepage](http://127.0.0.1:3000/)
- [Retained preview alias](http://127.0.0.1:3000/preview/house)
- [Staff dashboard and homepage editor](http://127.0.0.1:3000/admin): sign in with an existing authorized staff account, then expand **House homepage · content, images & motion**.
- [Private enquiries](http://127.0.0.1:3000/admin/enquiries): general submissions appear under **Homepage conversations**. Property-specific enquiries retain the existing table; viewing requests retain the existing appointments workflow.
- [Approved concept and project brief](concepts/interactive-homepage-v1/storyboard.md)
- [Full application source](https://github.com/bfoh/strong)
- [Generate the compact integration package locally](../scripts/house/package-source.py)

The editor saves the exterior headline, introduction, room headings, team biography, three door labels, SEO title/description, five scene images, focal positions, motion default, zoom strength, desktop travel and desktop/phone transition durations. Images can be selected from the approved set or uploaded as JPEG/PNG/WebP, up to 12 MB. Save settings and reload the preview to see the result. Uploading alone does not select the replacement permanently. Existing property administration controls the genuine listing content and photography.

Visitors can use **View content**, direct Listings/Our Team/Contact Us navigation, or the keyboard-accessible skip link. **Motion on/off** switches the visitor experience and saves that preference locally. A system reduced-motion preference overrides animation. This does not change the site's saved editor settings.

## What is built

The exterior greets visitors with the business offering and Kumasi service area. On a suitable desktop, finite scrolling moves through the entrance into a hallway. Each of its three open doorways shows the same destination photograph used in that room. The buttons enter the listings lounge, team consultation lounge or contact signing room. The room's text and controls appear after arrival. Return buttons lead back to the hallway and restore focus. Browser Back, direct navigation and Escape are supported; entered form values and useful reading positions are retained during the journey.

The listings room includes category filters, genuine published records from the existing backend where available, and a clearly labelled demonstration residence. Selecting a property opens a full-image viewer within this homepage, with facts, enquiry action and return navigation. The demonstration has six discrete exterior photographs: front, front left, left side, rear, right side and front right. Arrow keys and horizontal swipes change photographs; vertical reading scroll remains available. Genuine properties use their actual available media, rather than fabricated additional angles.

The team room uses the approved generated professional at the far end of a walnut table. He is an illustrative stand-in, not the owner's likeness or a verified employee. Trophy props do not establish real awards. The contact form resembles a refined business document, while clearly explaining that it requests contact and does not buy or reserve a house.

## Actual motion and mobile policy

| Interaction | Implemented behavior |
| --- | --- |
| Desktop eligibility | At least 1100 px wide, 600 px tall and a 3:2 aspect ratio, with motion enabled and scene assets available |
| Arrival travel | 2.4 viewport heights; 2160 px at a 900 px viewport height. The 100svh visual stage sits in a 340svh wrapper. One screen of scrolling advances about 41.7%. |
| Arrival progression | Source exterior enlarges and pans toward its masked entrance; the hallway is visible through the opening. The source clears the viewport at about 73.3% of total travel, the hallway settles by 94%, and door controls appear above 99.5%. |
| Stop / reverse | Stopping holds the painted progress. Reverse scrolling retraces it; browser screenshots at identical midpoint progress matched exactly. No wheel/touch scroll cancellation is used. |
| Desktop room entry / return | 900 ms by default. The doorway grows to fill the viewport during the first 78%, then its destination photograph settles. Return reverses this composition. |
| Phone / small-tablet navigation | Ordinary scrolling and taps. **Zero mandatory cinematic scroll travel.** Optional Explore the House opens the compact hallway. Default navigation uses a 300 ms fade, without the desktop camera zoom or doorway masks. |
| Gallery | Approximately 200 ms photograph reveal; full images use contain rather than cropping away the house |
| Reduced motion / motion off | Immediate navigation and no extended arrival scroll range |
| Missing desktop scene / unavailable canvas / browser data saver | Collapses the extended sequence into compact navigation; useful content and contact remain available. Data saver avoids preloading the desktop doorway scene set. |

This is an image-based Canvas2D composition using pan, scale and doorway masks. It is not a film or a reconstructed 3D building. Destination photographs are composited into the same openings before travel, avoiding a switch to an unrelated room after the threshold. Enlarged source foregrounds can soften during the closest approach. The earlier storyboard's intermediate porch/near-threshold plates and provisional 1.65× source-scale cap were not produced as a separate frame sequence; this implementation uses the approved photographs with masks. The gallery's generated sides/rear are conceptual interpretations, not survey evidence or a geometrically verified reconstruction. Browser continuity evidence should be assessed with those limits.

## Content, forms and storage

Strong Properties, Kumasi, and the existing land/residential/commercial offering are used in the business copy. The Garden Residence is explicitly illustrative and not for sale. Its four-bedroom specifications and areas are samples. No verified price, availability, award, testimonial, licence or employee identity has been invented.

The form requires name and phone, with optional email and message. A genuine published property can be selected; viewing requests require one and a valid future date/time, and remain **requested**, not confirmed. Demo enquiries ask about a similar home rather than treating the concept as inventory.

General enquiries are stored in the existing Supabase project's private `strong-homepage-private` bucket at `enquiries/<uuid>.json`. There is no configured email/SMS provider or recipient: staff must review the inbox and follow up manually. No test communications were sent. Property-specific enquiries and viewings delegate to the existing secured backend handlers and retain their existing database requirements.

General submissions have bounded input, same-origin checks, validation, a honeypot, idempotent retries, a local burst guard and five atomic create-only quota slots per normalized phone in a fixed ten-minute window. Failure to verify private storage fails closed. The bucket also stores validated editor settings at `settings/homepage-v1.json` and processed images under `assets/`. The image endpoint accepts UUIDs and reads only the image prefix; it cannot expose enquiry JSON. Anonymous direct reads were denied in the live verification.

Quota objects expire logically after their window but are not automatically deleted. Old quota objects and unused uploaded images need an administrator retention task if this feature becomes public. The inbox currently lists the latest 200 general records; pagination and CRM/status management are outside this homepage draft. Retention and deletion policy remains a business decision. Existing privacy/terms pages remain provisional.

## Components, dependencies and maintenance

**Component:** Strong House Experience, `HOUSE_VERSION = 1.0.1`. This uses the existing platform's React components and staff dashboard; it is not a WordPress plugin or a whole-page HTML embed. No new package dependency was installed.

- Node.js 22 or newer; existing Next.js 15, React 19, Supabase client, Zod, Sharp, Lucide and locally hosted Cormorant Garamond/Manrope fonts.
- `components/house/HouseExperience.tsx`: native sections, navigation, gallery, state, focus and history.
- `components/house/VisualStage.tsx`, `lib/house/portal.ts`: Canvas2D rendering and normalized doorway masks.
- `components/house/HouseEnquiryForm.tsx`, `lib/house/enquiries.ts`: enquiry form and private general storage; native POST also works without JavaScript.
- `components/house/HouseEditor.tsx`: actual visual/text/motion controls. `lib/house/config.ts` defines defaults and validated limits.
- `components/house/HousePage.tsx`: shared server-rendered page, data and metadata. `app/page.tsx` and `app/preview/house/page.tsx` select that same page; `app/preview/house/house.css` supplies scoped layout.
- `components/layout/SiteChrome.tsx`: scopes the draft's header/footer to this namespace.
- `scripts/house/prepare-assets.mjs`: rebuild responsive WebP derivatives from the recorded PNG sources. `public/images/house-v1/` holds versioned delivery assets.
- `docs/concepts/interactive-homepage-v1/`: original generated PNGs, prompts, source manifest and concept. The source ZIP includes delivery assets and prompts; the larger original PNGs remain in this folder.

Doorway geometry, responsive breakpoints, gallery angle labels/order, illustration disclosures, component destinations and privacy text are code-maintained. Changing an entrance/hallway photograph may require adjusting the normalized masks in `portal.ts`; focal sliders do not automatically discover new door geometry. Recheck continuity after replacing connected photographs. The logo is a crisp native SVG component based on the generated concept.

The source ZIP is an integration package for this existing app, not a standalone fresh application. It includes the exact modified layout/admin files for review; merge those intentionally when applying it to a different revision. It excludes credentials, dependencies, build caches, customer records and authentication artifacts. Its manifest lists each included file's SHA-256. Existing auth, property, media and lead modules remain required. The archive includes JSON diagnostics and representative screenshots; the complete capture set and original PNG sources remain in the workspace. Rebuild the archive with `python3 scripts/house/package-source.py`.

To run after configuring the existing application's environment securely:

```sh
npm ci
# One-time private bucket setup; already completed for the configured project.
node --env-file=.env.local scripts/house/setup-storage.mjs
npm run build
STRONG_HOUSE_LOCAL_PREVIEW=1 npm run start -- --hostname 127.0.0.1 --port 3000
```

Do not copy `.env.local` into a source archive or public upload. The preview's production guard requires the explicit local flag and a loopback Host. It is intended to run on loopback, not behind a public proxy. New uploaded scene images are also preview-gated. A public launch requires a deliberate route/configuration change and the current project's publication authorization.

## Verification and evidence

The final production build passed compilation, lint and TypeScript checks. All 28 unit tests passed, including existing business regressions and new origin/validation/quota/idempotency/portal tests. Unit storage and property-handler cases use controlled mocks; they are distinct from the real-service check below.

Version 1.0.1 assigns the same shared server page to `/` and the retained `/preview/house` alias. The build and 28 unit tests were repeated for that change. Dedicated desktop and phone checks cover one header/footer, direct contact, hallway/listings return paths, browser Back, the preview alias, noindex, remote-Host rejection and the native acknowledgement's homepage return URL. The broader journey, live-storage and performance reports below were recorded before this routing-only change, on the shared experience at `/preview/house`.

Two bounded browser phases used installed Google Chrome through Playwright because no enabled interactive browser surface was available. [Checkpoint 1](visual-verification/house-v1/checkpoint1/) captured the first arrival/room transition, exact reverse, phone first screen and direct actions, with fixes applied before expanding the journey. [Checkpoint 2](visual-verification/house-v1/checkpoint2/) covers the completed journey, six angles, return paths, browser Back, keyboard, interruption, retained form values, simulated server failure, 320×568 and 844×390 layouts, enlarged text, reduced motion, failed imagery, initial HTML, no-JavaScript navigation, indexing directives and protected editing. Captured frames were visually inspected, including quarter/midpoint/three-quarter arrival and in-motion doorway views.

The completed suite has seven applicable journey/accessibility/fallback cases plus two performance cases; three deliberate cross-project skips avoid duplicate desktop-only checks. A final [phone entry observation](visual-verification/house-v1/mobile-fade.json) recorded the scene visibly fading during the configured 300 ms transition before arrival in the hallway. Canvas-unavailable and data-saving browser cases verify direct contact access and collapsed scroll travel. Automated Axe checks in the completed contact state reported zero violations on desktop and simulated phone. This is a scoped result, not an audit of every state or a WCAG certification.

[Live integration report](visual-verification/house-v1/live-integration.json): actual JavaScript and native form submissions were stored privately; retry idempotency, denied anonymous reads, image-prefix isolation, existing staff access, text/metadata/motion persistence, image processing/upload/save and inbox visibility passed against the configured Supabase project. Verification reused an existing authorized administrator's one-time session mechanism. No account or role was created, no email sent, and password login was not tested. Only tracked verification records/images/quota objects were removed; prior settings were restored.

Reproduce focused checks with the local production server running:

```sh
npm test
npx playwright test tests/browser/house-complete.spec.ts tests/browser/house-performance.spec.ts
# Intentional owned writes and cleanup against the configured real service:
node --env-file=.env.local node_modules/@playwright/test/cli.js test tests/browser/house-live.spec.ts --project=desktop
```

Read the live test before running it; it temporarily edits the draft settings and restores them. Do not run the repository's entire historical preview suite against a configured live service without inspecting its assumptions.

## Performance and search

Three cold local-production samples per viewport were recorded with browser caching disabled. [Desktop diagnostic report](visual-verification/house-v1/performance-desktop.json) uses 1440×900, DPR 1, normal CPU, 20 ms latency and 1,250,000 bytes/s download. [Phone report](visual-verification/house-v1/performance-mobile.json) uses 390×844, DPR 1, 4× CPU slowdown, 150 ms latency and 200,000 bytes/s download. A second desktop batch added document/image timing to investigate an earlier slow sample; the [original outlier batch](visual-verification/house-v1/performance-desktop-outlier.json) is retained rather than discarded. These are emulator/lab diagnostics, not physical-device results, real-user p75, or measured field INP.

| Median of three samples | Desktop diagnostic batch | Simulated phone |
| --- | ---: | ---: |
| Browser-reported LCP | 296 ms | 884 ms |
| CLS | 0.00626 | 0.00000337 |
| Initial imagery | 1,412,294 bytes | 112,840 bytes |
| Direct-navigation completion including transition/test overhead | 402 ms | 403 ms |
| Largest observed startup long task across samples | 165 ms | 218 ms |

LCP samples were 996/296/284 ms on desktop and 924/884/852 ms on simulated phone. The largest sampled Event Timing duration was 112 ms; this is not a field INP result.

The preceding desktop batch recorded LCP of 2300/7088/1576 ms (median 2300 ms). The 7088 ms outlier was not reproduced in the diagnostic batch, and its cause remains unisolated because the earlier batch did not record document timing. The diagnostic first-byte times were 84–152 ms; the exterior image completed download at 1337–1450 ms. Browser-reported LCP can reflect the headline before the full photograph/Canvas scene is ready, so its sub-second samples are not a measurement of complete visual-stage readiness. Stable desktop performance remains unproven.

Phone startup requests its 82,046-byte portrait exterior and 30,794-byte thumbnail, rather than the desktop transition photographs. Deferred gallery imagery is excluded from the initial imagery figure. Desktop loads the five scene photographs for its doorway composition. The renderer retains a bounded five-image scene set and caps canvas DPR at 1.5. For five 1672×941 sources, raw RGBA pixels are about 30 MiB; at 1440×900 and DPR 1.5, one canvas pixel buffer is about 11.1 MiB. These are calculated pixel estimates only: additional poster/gallery decodes, transient decodes, compositor allocations, measured JS heap and total process memory were not profiled. The phone's observed long-task outliers remain an optimization target; navigation completion includes the deliberate transition and test overhead and is not INP.

Meaningful business copy, headings, listings, form and actions exist in the initial server response, without completing the journey. The editor exposes accurate page title and description. Social metadata uses the conceptual exterior. Organization JSON-LD contains only Strong Properties, Kumasi and the verified offering; there are no invented addresses, ratings, offers or credentials. Rooms/hashes remain states of one homepage, not independent indexable pages.

The draft returns `noindex, nofollow, noarchive`, has no canonical to an unverified domain, and is absent from the sitemap. The site's existing crawler restriction remains because no publication origin is configured. No site-wide indexing setting was removed. Rich Results Test, Search Console/URL Inspection, public-origin canonical/robots/sitemap checks, physical-device testing and real-user performance remain unperformed. After an authorized launch and verified domain, set the true canonical/social origin and deliberately verify the public status, crawl directives and sitemap through the existing system. No ranking, indexing or rich-result result is promised.

Implementation references reviewed: [Search Essentials](https://developers.google.com/search/docs/essentials), [mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [accessible motion](https://web.dev/learn/accessibility/motion).

## Remaining publication decisions

The local homepage is installed and ready for review. Public deployment is waiting on an identified hosting project/domain. Genuine team identity, recognition, property media, business contacts and approved privacy/terms remain pending content; email notifications can be configured if wanted. Existing property-specific lead security requirements still apply. The image-based camera's soft close approaches and conceptual exterior-angle continuity are documented above. No public deployment has occurred.
