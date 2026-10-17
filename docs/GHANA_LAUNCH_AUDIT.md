# Ghana-wide launch audit — 16 October 2026

Historical pre-change audit. For the deployed homepage, twelve private media candidates and migrations applied on 17 October, see [the current handoff](GHANA_LAUNCH_HANDOFF.md).

Target: Sunday 18 October 2026. Repository: bfoh/strong. Production: https://strong-eta.vercel.app/.

## Current implementation

- Next.js 15.5.27 App Router, React 19, TypeScript, Supabase, Sharp, Lucide; existing GSAP/Three dependencies retained for legacy work.
- Active root: `app/page.tsx → HousePage → HouseExperience`. It is an image-mask house journey, not the 451-frame player. Phone navigation intentionally uses taps; it has no scroll playback.
- `CinematicHero` and its bounded frame loader are present but unused on `/`. Both optimized 451-frame sets exist: desktop 1280×720 (22.9 MB total), mobile 576×720 (9.9 MB). Original JPGs are not required for playback. The old player automatically warms the complete sequence and uses catch-up smoothing; both need correction before activation.
- Published-only catalogue, detail gallery, GHS prices, category/location/price filters, staff roles/authentication, image processing, private media and viewing requests already exist.
- General enquiries are stored privately; no email/WhatsApp/contact number is configured in the available environment. Property-specific leads depend on an atomic quota RPC.
- Live aggregate audit: 0 properties, 0 published properties, 0 enquiries, 0 appointments, 1 staff profile. Both media/homepage buckets exist and are private. Anonymous lead reads returned no rows; this alone is not a complete RLS proof on empty tables.
- `consume_public_lead_quota` is absent from the live API. Property-specific production submissions currently fail closed. The existing security migration has not been verified applied. REST keys cannot apply SQL DDL; no database connection or SQL client is configured.
- Main branding and metadata remain Kumasi-only. Catalogue locations are free text. Admin lacks structured Ghana regions, formal review approval, featured flags and editable area/documentation fields.
- No analytics provider, consent UI, campaign attribution, `/tv`, commission ledger or full CRM exists. Existing privacy/terms remain provisional.
- GitHub main auto-deploys to Vercel. The previous local-preview 404 was corrected in a00a848. The old cinematic and house sources remain available; changing an unused component does not alter production.

## Phase one plan

1. Replace the root house hub with the Ghana-wide commercial homepage; retain the house journey only in its private local preview. Reuse the genuine frame sequence and existing catalogue/detail/admin architecture.
2. Make mobile scroll playback explicit, bounded and reversible, with target-first progressive loading, modest scroll travel, no automatic full-sequence download, readable direct CTAs, Skip and static/reduced-motion/error fallbacks.
3. Remove public demo inventory. Build search, genuine published collections, categories, actual-location discovery, diaspora guidance and general enquiry actions. Render phone/WhatsApp only when verified configuration is supplied.
4. Add a validated 16-region model, additive listing/review migration and a compatible private lead-attribution layer. Preserve core reads while an unapplied migration is reported explicitly to administrators. Never silently drop new listing data or publish an unapproved property.
5. Capture campaign attribution and voluntary residence/contact preferences; retain it with successful submissions. Use a verified private atomic Storage quota as a safe compatibility path when the SQL quota RPC is absent. Do not fall back to non-atomic counting in production.
6. Add a fast `/tv` campaign route, attribution propagation and a QR destination based on the verified production origin. Add opt-in analytics configuration and an honest staff reporting foundation without fabricated visits/conversions.
7. Run lint/type/build, unit/regression checks, focused browser and live owned-fixture checks, then commit/push and verify the actual Vercel result.

## Launch gates

**Needs attention at audit time:** genuine approved inventory/media, verified contact channels, production environment settings, business-approved legal/privacy details, retention ownership, physical iOS/Android checks and field performance. The owner subsequently supplied +233546732018 and +4916090882654; both are now displayed. No email was supplied.

**Blocked by missing SQL access:** applying the new regional fields, review controls and transactional save RPC. Additive SQL will be provided; application code must preserve existing inventory/admin behavior and clearly surface unavailable new schema rather than pretending it is installed.

**After launch:** full CRM/assignment automation, private commission ledger, advertising campaigns, nurture email, currency conversion, saved properties/comparison and useful indexed location content. No commission rate, eligibility or legal authority is assumed.

## Sources checked

- [Ghana Statistical Service region categories](https://microdata.statsghana.gov.gh/index.php/catalog/110/variable/F9/V417?name=region)
- [Search Essentials](https://developers.google.com/search/docs/essentials), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Ghana Data Protection Commission / Act 843](https://dataprotection.org.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf)

These are implementation references, not legal approval, accessibility certification or a ranking promise. Final implementation/results are recorded separately in the launch handoff.
