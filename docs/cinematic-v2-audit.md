# Cinematic V2 audit — 12 October 2026

Audited the homepage, every home component, `MotionShell`, all Three components, CSS, media references and the running Chrome preview **before edits**. Evidence: `visual-verification/cinematic-v2/before-audit.json`, `before-home-desktop.png`, `before-3d-desktop.png`.

| Confirmed issue | Actual cause |
| --- | --- |
| No 3D architectural scroll journey | `ArchitecturalReveal` immediately after the hero is a photograph. ScrollTrigger changes its clip path, scale and title offset. It never animates a Three camera. |
| Small, late 3D experience | `SceneCanvas` mounts in the third experience, inside the right-hand philosophy column. At 1440×1000 the study measures 588×564, rather than a viewport-scale scene. |
| Camera does not respond to scroll | `CameraRig` updates only when the manual angle slider changes. It orbits at a fixed height/radius; no scroll progress or camera target path exists. |
| Mobile shows no WebGL | `useScenePerformance` explicitly requires `min-width:950px`. At 390×844 Chrome displays the SVG fallback (346×318) even though this environment supports WebGL. |
| Architectural environment lacks depth/story | Geometry is genuine Three box/plane geometry, but consists of a small arrangement of planes and an infinite ground. There is no four-stage environment or walkthrough. |
| Repeated photography | The same `concept-courtyard.webp` appears five times on the homepage: hero, image reveal and all three categories. It also appears on About and global OG metadata. Cropping cannot change the property's visual identity or make it suitable land/commercial imagery. |
| Decorative numbering | Hero chapter counter, section-index labels, category numbers, study number, three trust-card numbers and mobile-navigation numbers are present in code/DOM. Closing CTA also contains a numbered eyebrow. Listing-card indices are decorative. |
| Repetitive compositions | Philosophy, Kumasi and confidence use similar two-column layouts. Identical section spacing, numbered top rules, and an unillustrated closing CTA repeat the rhythm. |
| Kumasi visual is generic | A large `K.` and decorative rings/grid provide no geographic context. Schema has no verified coordinates, so real property markers cannot be introduced. |
| Listing media limitations | Four supplied TV JPEGs and derivatives contain broadcast overlays; no original verified listing photography is available. The live database currently has no published inventory. Empty states must remain genuine; conceptual art cannot replace sale photos. |

No browser/console errors or failed dynamic imports occurred in the baseline desktop test. The canvas has nonzero dimensions, genuine WebGL renders, and no confirmed stacking/context-loss fault was observed. Reduced motion was **false**. Consequently the observed desktop deficiency is the scene's placement, scale and absent scroll-camera choreography—not a confirmed WebGL failure. GSAP's registration and photo animation exist; the missing camera linkage is evident in the actual code.

Correction: one prominent architectural scene directly after the hero; native sticky staging with a long, measurable scroll range; perspective camera position/target choreography and reverse scrolling; on-demand rendering and accessible reduced-motion/WebGL fallback. Then rebuild surrounding experiences, remove decorative numbering, introduce unique asset identities and preserve the live business routes.
