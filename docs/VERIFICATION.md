# Verification — 12 October 2026

## Actual technical state
Next.js 15.5.27, React/React DOM 19.3.0, TypeScript 5.9.3, Supabase JS 2.117.3, GSAP 3.15.0, React Three Fiber 9.8.1 and Three.js 0.180.0. Local fonts and optimized WebP assets are included. Node 22+ is required. No real Supabase credentials or verified inventory/contact data were present.

## Baseline
Both original `npm run typecheck` and `npm run build` failed on an unterminated newline literal in `components/PropertyEditor.tsx`. The original project had no lint/test commands or lockfile. This syntax defect was repaired without changing the editor workflow.

## Results
| Check | Result |
| --- | --- |
| TypeScript | Pass (`npm run typecheck`) |
| ESLint | Pass, zero warnings (`npm run lint`) |
| Production build | Pass (`npm run build`), including existing admin routes |
| Unit/integration tests | 10 passed (`npm test`) |
| Browser scenarios | 12 unique scenarios passed across desktop/mobile and targeted reruns |
| Automated accessibility | No axe WCAG A/AA violations on homepage, catalogue, preview detail, about, contact and configured mock detail |
| Responsive layouts | No horizontal overflow at 320, 390, 768, 1024 and 1440px across home, catalogue and detail |
| Keyboard and dialog behavior | Fullscreen gallery arrows/Escape/focus return; mobile navigation and camera slider passed |
| Reduced motion / WebGL fallback | Passed; mobile study uses SVG, desktop camera renders through WebGL and falls back on reduced motion |
| Public indexing | Fixtures excluded from sitemap, preview noindex, unconfigured robots disallow, missing property returns 404 |
| Staff protection | Unauthenticated admin redirects to login; protected status endpoint rejects anonymous mutation |
| Browser errors | No page exceptions or console errors in the tested cinematic homepage flow |
| Runtime dependency audit | Zero vulnerabilities (`npm audit --omit=dev`) |

The browser scenarios exercised shareable filters, clearing fields, Back navigation, empty states, property navigation, fullscreen gallery, published-only reads, index exclusion and genuine success/failure feedback. A separate test-only Supabase REST mock verified both successful inserts, appointment `requested` status and draft rejection. It never contacted a real database or customer.

Issues found and corrected during browser QA: decorative footer contrast, image-reveal title clipping/scroll spacer, streamed missing-property 200 response, browser-facing admin origin mismatch, stale uncontrolled filter values and gallery overflow at 320px. The result count is a semantic H2 preceding property-card H3s.

## Measured lab performance
Production homepage, installed Chrome in headless mode, three fresh browser contexts with cache disabled per profile. Mobile viewport 390×844, DPR 2, requested CDP 4× CPU slowdown, 150ms latency and 1.6Mbps download. Desktop viewport 1440×900 at DPR 1 uses local network/hardware. See the raw measurements in [performance.json](qa/performance.json) and the reproducible script in `scripts/measure-performance.mjs`.

| Profile | LCP range | Maximum CLS | Sampled click duration |
| --- | --- | --- | --- |
| Desktop / local | 0.152–0.656s | 0.0029 | 32–48ms |
| Mobile / DPR 2 / simulated 4G + 4× CPU | 1.908–1.920s | 0.0005 | 40–88ms |

These LCP/CLS lab samples meet the engineering targets in this local setup. Three samples are not field p75 Core Web Vitals. The click samples are Event Timing observations, **not a certified INP result**. The blocking-time estimate remains nonzero in some cold runs; monitor hydration/motion on physical mid-range devices and production networks. Transfer bytes are sampled after the first scroll-link interaction, not the whole site's total payload.

Next's build reports about 115kB first-load JavaScript for the homepage and property detail, with 103kB shared framework JavaScript. The WebGL scene is separately loaded near the viewport and uses on-demand frames. The main conceptual WebP is approximately 316kB; property derivatives are approximately 60–92kB before responsive optimization.

## Review artifacts
- `docs/qa/hero-desktop.png`, `hero-mobile.png`: first viewport.
- `docs/qa/home-desktop.png`, `home-mobile.png`: complete static/reduced-motion compositions.
- `docs/qa/catalogue-desktop.png`, `catalogue-mobile.png`.
- `docs/qa/detail-desktop.png`, `detail-mobile.png`: supplied-media preview, with unverified disclosure.
- `docs/qa/architectural-study-desktop.png`: rendered WebGL scene and keyboard control.
- `docs/qa/configured-detail-*.png`: synthetic QA inventory only.

The Codex in-app browser was unavailable; installed Chrome/Playwright provided browser verification and screenshots.

## Verification and launch limits
Real Supabase persistence, authenticated staff CRUD, real property media/video and exact locations were not available for live verification. The optional SQL location helper was not run against a live database. Physical iOS/Android, Safari and assistive-technology testing and field monitoring remain launch work; automated checks alone do not certify WCAG compliance.

Verified company contact details, original licensed listing media, confirmed inventory/documentation and approved business privacy/terms are required for public sales use. The process-local limiter needs a shared production equivalent; notifications, real-time viewing capacity and staff token refresh remain future work. See `docs/MEDIA_CHECKLIST.md` and `README.md`.

The full dependency audit still reports the development-only lint-tooling braces/fast-glob advisory chain (five high findings); no patched braces release was available in the installed registry. The compatible PostCSS override resolved the runtime chain. Reassess tooling advisories before CI or public launch.

No hosting deployment was performed, and no production-readiness or award claim is made.
