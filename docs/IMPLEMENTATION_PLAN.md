# Strong Properties — public experience milestone

## Repository audit (12 October 2026)
- Next.js 15 / React 19, App Router, TypeScript strict mode. Package ranges are unpinned; no original lockfile or installed dependencies.
- Public routes: homepage, category-only catalogue, basic detail pages. Global header has no mobile menu; no SEO routes, gallery controls or public loading/error boundaries.
- Supabase schema already contains properties, media, features, staff, enquiries, appointments and audit tables. Preserve these models and staff handlers.
- Staff routes authenticate Supabase users and check staff roles; admin editing and request status management exist.
- Public reads select published properties, but detail lookup fetches the whole collection. Forms validate with Zod; submissions do not verify publication. Date validation accepts impossible dates/times.
- Four 1170px-wide TV screenshots contain logos, overlays and phone numbers. Preserve originals. Demonstration entries are not verified inventory.
- Only an empty environment template exists. No configured database, domain, verified business contact, original photography or property coordinates. No lint/test scripts.

## Implementation sequence
1. Install existing dependencies; record baseline type check and build. Add only compatible motion/3D, lint and QA tools.
2. Establish ivory/gold tokens, local serif/sans fonts, accessible navigation, footer and reusable buttons/media.
3. Compose cinematic homepage chapters with explicitly labelled conceptual imagery, real-data collection and editorial Kumasi fallback.
4. Add bounded server-side catalogue queries, URL filters, sorting, pagination and clear loading/error/empty states.
5. Build published-only details with immersive accessible gallery, existing media/features, related collection and clear viewing/enquiry requests.
6. Add GSAP context-managed hero/reveals and one natural-scroll architectural sequence without pinning. Dynamically load an abstract architectural 3D study with static fallback, capped DPR and on-demand rendering.
7. Harden existing public submissions (publication checks, genuine dates/times, request limits), retaining existing database tables and staff infrastructure.
8. Add metadata, production-only published sitemap, robots, legal disclosure pages, run checks and browser/responsive QA; document actual results and launch dependencies.

## Constraints
No fictional listings, contacts, availability, coordinates, testimonials or credentials. Demo pages are noindex, demo forms disabled. Generated brand imagery never appears as listing photography. Backend schema and admin workflows stay intact. This is a local implementation; hosting and production credentials are outside this milestone.

## Execution status
All implementation stages completed. Baseline type check and build failed on the pre-existing admin editor syntax error; repaired. Final results and environment-dependent launch work are recorded in `docs/VERIFICATION.md`. No database models were replaced and no hosting deployment was attempted.
