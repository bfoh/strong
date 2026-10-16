# Cinematic V3 — current verification and production gates

Status13October2026: the complete Canvas2D scroll player and external production workflow are implemented. The active72-frame desktop/mobile assets are explicitly labelled **temporary camera blocking**. A final photorealistic architectural film has not been produced or approved.

## Delivered production work

- [Reference research](cinematic-reference-research.md), supplemented by the user's actual [local video analysis](video-reference/1nGx7WR8YLE/analysis.md).
- [Production audit](cinematic-production-audit.md), [scene specification](cinematic-scene-specification.md), [storyboard](cinematic-storyboard.md) and machine-readable camera keys in `production/cinematic/shot.json`.
- External Blender camera/render, frame export and promotional video scripts, documented in [the production workflow](../production/cinematic/README.md). Their Python/JavaScript syntax was checked. Blender and a licensed source scene are absent; no actual Cycles execution is claimed.
- Reusable `CinematicScrollSequence`, bounded `FrameCache`, manifest validation, source/poster variants and homepage integration. The homepage uses frame rendering rather than the former real-time procedural WebGL scene. Actual frame allocation/loading starts only when at least1% of its viewport is visible.
- Updated homepage flow and a native, keyboard-accessible Skip to Properties action. Business routes and Supabase server code are retained.
- Installed and discoverable `$strong-cinematic-production` skill. It records the observed asset-first workflow and continuity/pacing critique while retaining Strong Properties' identity and functional constraints.

## Browser proof

Latest [verification.json](visual-verification/cinematic-v3/verification.json): **all7 acceptance groups passed** against the production build. Desktop1440×1000 and mobile390×844 selected and painted frames0,18,36,53,71 at the five required progress positions. Reverse scrolling restored identical canvas pixels. Rapid seeks settled on the exact target. Keyboard stage controls worked. Both profiles reported zero browser errors and zero Axe WCAG2/2.1/2.2AA violations in the measured homepage check.

Reduced motion used a still poster without frame downloads or an extended sticky range. A deliberately missing frame produced a visible poster and useful collapsed fallback. The slow-network test used350ms latency and0.8Mbps; the final target drew correctly, with an observed627ms wait in the latest run. Controls fit844×390,568×320 and320×740. The no-JavaScript poster and native property link remained usable.

Evidence: first/25/50/75/last and reverse screenshots for both profiles, major homepage section screenshots, source proof contact sheets and [actual forward/reverse canvas recording](visual-verification/cinematic-v3/scroll-sequence-forward-reverse.webm). The recording depicts the temporary sequence; it is not final promotional footage. Desktop/mobile section images and their contact sheets were visually inspected.

[Asset integrity evidence](visual-verification/cinematic-v3/asset-verification.json) verifies all144 delivered files exist, decode, match dimensions and contain non-black imagery, with per-file checksums. The geometry/lighting of the owned blocking scene stays fixed while its camera changes. Its primitive landscaping, simplified materials and limited realism are not accepted as final architectural quality.

## Memory and performance limits

Latest browser proof observed12 cached desktop frames, estimated24,883,200RGBAbytes, and8 mobile frames, estimated16,588,800bytes, within32MiB/16MiB cache caps. Canvas backing stores were5,218,560bytes desktop and1,198,080bytes mobile at DPR1. Up to two transient decodes are additional bounded allocations. CDP JS-heap samples are stored separately in the report; none of these values represents total browser-process memory.

[Cold-load measurements](visual-verification/cinematic-v3/performance.json) were taken **before the final visibility-gating optimization**. Their mobile median LCP was3.204seconds, with significant blocking in some samples. Those observations triggered deferral of canvas, frame decoding and ScrollTrigger setup until the scene becomes visible. The final seven browser acceptance groups were rerun successfully after that change. Cold-load and isolated sustained-seek measurements after the optimization remain to be completed; do not reuse the earlier numbers as the optimized result. Accessibility/recording work in the visual suite must not be treated as an isolated animation benchmark.

The current assets are a72-frame7.2fps technical preview. Actual final240-frame renders will have different transfer/decode costs and must be benchmarked. No field p75 Core Web Vitals, certified INP, physical-device performance or overall performance certification is claimed.

## Technical and business checks

TypeScript, lint, production build and20 unit tests passed for the implemented player. Unit tests include meaningful cancellation, stale seek, bounded caching, bitmap-release, frame mapping and camera continuity checks, plus existing server validation/security tests. The production build reports118kB home first-load JS. The added video-analysis helpers subsequently ran successfully; no new application dependency was installed.

The earlier live Supabase development suite recorded26 passes,0 failures and1 blocked atomic-quota migration, with exact owned-fixture cleanup. These are previous live regression results, not a new V3 backend run. The V3 code does not change authentication, admin mutations, lead handlers or Storage policies. Current live backend regression and secret-boundary checks still need a final rerun before deployment. The existing administrator's password was not supplied; the prior suite verified its session/profile and temporary-account password login/logout separately.

## Remaining gates

| Gate | Current result |
|---|---|
| A — research/architecture | Documented, including actual local tutorial frames and audio-analysis limits. |
| B — final architectural visual proof | Open: no licensed detailed source scene or reviewed final conceptual shot. |
| C — final shot continuity | Open: shared camera math and temporary preview exist; no final film approved. |
| D — scroll proof | Passed for the temporary sequence, forward/reverse/rapid and both viewports. |
| E — final integration | Preview integrated; final asset replacement awaits B/C. |
| F — final production QA | Preview browser/technical checks pass; final-asset performance and fresh live regression remain open. |

Topview is registered at the requested endpoint. The latest read-only Codex registry verification found `notLoggedIn` and zero tools because browser callback waits expired. Complete [the local authorization guide](TOPVIEW_MCP_SETUP.md), then discover the actual model/configuration and credit capabilities before generating any candidate. No Topview generation job was launched.

The existing quota/restrictive-Storage migration `supabase/migrations/20261012_live_security.sql` also remains unverified as applied. Recheck the real RPC before reporting production enquiry/viewing persistence ready. No database migration or unrelated data deletion was performed in this creative work.
