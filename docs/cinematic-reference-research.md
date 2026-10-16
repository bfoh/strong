# Cinematic production reference research — V3

Research date: 13 October 2026. This document separates accessible source evidence from proposed production decisions. It does not claim that an inaccessible transcript or architectural film was viewed.

## Gate A: reference access and implementation decision

The supplied video is accessible through YouTube's public watch-page metadata and oEmbed endpoint. The supplied playlist cannot currently be enumerated: YouTube's playlist response contains an error saying “Die Playlist ist nicht vorhanden.” The video itself is an AI website-design workflow reference. Its accessible description does not establish a Blender, Three.js, or GSAP tutorial. The V3 implementation should therefore follow the owner's explicit production brief and the primary technical sources below, without attributing unverified camera or rendering techniques to this video.

The selected architecture is a separately produced, continuous architectural camera shot, exported as individually addressable frames, displayed by a reusable Canvas 2D player driven directly by normalized ScrollTrigger progress. A temporary preview must be labelled as such. Rendering the full final sequence remains behind the scene-quality and camera-continuity gates; implementing the player does not satisfy those gates by itself.

## Supplied video and playlist: what was retrieved

| Item | Verified result |
| --- | --- |
| Video | [How I build websites with AI that actually look good (3 step process)](https://www.youtube.com/watch?v=Jm5JKWmHUAk) |
| Creator | Payton Clark Smith, identified independently in watch-page metadata and [YouTube oEmbed](https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DJm5JKWmHUAk&format=json) |
| Duration and publication | 457 seconds; watch-page publication metadata: 22 September 2026 |
| Accessible material | Video title, creator, duration, description, chapter timestamps, and caption-track metadata |
| Transcript | English automatic captions are advertised in metadata. The public caption URL returned an empty body, including the JSON-caption request. No transcript content was obtained. |
| Repository | No repository link is present in the retrieved description. |
| Project demonstration | The description links a Framer promotional offer, rather than a directly inspectable project repository or architectural demonstration. No working project demo was verified. |
| Playlist | [Supplied playlist](https://www.youtube.com/playlist?list=PLUZv3XOLlRWQ): HTTP 200 with an explicit playlist-not-present error and no playlist video entries. A truncated, removed, or private playlist cannot be distinguished from this response. |
| Viewing claim | Metadata and description were inspected. The video was not watched, and its visual examples were not independently reviewed. |

The accessible description outlines beginning with a base, using Framer AI and Framer Skills in discrete steps, and applying human design judgment afterward. Its chapter timestamps place the three steps at 4:41, 5:39, and 6:06. The useful project lesson is to preserve the existing foundation and separate production stages from visual refinement. It supplies no verified scroll architecture, camera method, asset-generation method, rendering technique, or performance benchmark. Those details must remain unconfirmed. [Source video](https://www.youtube.com/watch?v=Jm5JKWmHUAk).

Access attempts: the web retrieval tool returned a cache miss for the watch URL and exact-ID searches produced no matching reference. A subsequent approved direct request to YouTube succeeded for the watch page, playlist page, and oEmbed. Caption-list requests and the advertised English caption URL returned empty bodies. These are access results, not evidence that the video contains no narration or has no captions in YouTube's own interface.

## Established technical references

### GSAP canvas sequence helper

GSAP publishes a working image-sequence helper and embedded demo. It animates a numeric playhead across an image array, rounds to an integer, draws that image into a canvas, and uses linear easing with ScrollTrigger scrubbing. Its sample creates every `Image` immediately. That loading strategy is unsuitable for this brief's full-resolution sequence; retain the progress-to-index principle and replace eager allocation with staged loading and bounded decoded storage. The linked Apple frames are demonstration inputs, not licensed Strong Properties production assets. [Official helper and source](https://gsap.com/docs/v3/HelperFunctions/helpers/imageSequenceScrub/).

### ScrollTrigger timing, layout, and cleanup

ScrollTrigger supports normalized progress callbacks, pinning, forward/reverse scrubbing, and resize refresh. Boolean scrubbing directly links progress; a numeric scrub adds catch-up time. For V3, frame selection must use current progress rather than a damped camera or delayed playhead. A pinned element's own geometry should remain stable; animate children. Native CSS sticky is also suitable when the section supplies its own stable scroll range. Avoid transformed ancestors that change fixed-position behavior. [ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

GSAP's React guidance emphasizes scoped animation cleanup, particularly under React Strict Mode, and supports client components in Next.js. A `gsap.context()` with explicit revert can use the project's existing GSAP dependency; adding `@gsap/react` is optional. Non-GSAP resources still need separate teardown: observers, network requests, decoded images, and animation-frame callbacks. [Official React integration](https://gsap.com/resources/React/).

### Blender continuous camera production

Blender's Follow Path constraint accepts a curve and either time-based evaluation or a normalized offset factor. It can be combined with a tracking constraint. A camera rig can therefore move along one continuous curve while a separate target controls the look direction. Reset rig offsets and inspect the entire path to avoid unintentional position or rotation offsets. [Follow Path manual](https://docs.blender.org/manual/id/5.2/animation/constraints/relationship/follow_path.html).

The Damped Track constraint aims toward a target using a swing rotation that minimizes rolling around the tracking axis. This is an orientation constraint, rather than a substitute for deliberate camera-path design. Stable target placement and a consistent horizon still require visual review. [Damped Track manual](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/damped_track.html).

Cycles is a physically based production path tracer with reflection, transmission, and shadow rays. Its availability does not automatically make an output photorealistic: geometry, texture scale, light transport, glass thickness, landscaping, and camera composition must withstand the visual gate. [Cycles introduction](https://docs.blender.org/manual/en/2.80/render/cycles/introduction.html).

Blender supports background rendering, single representative frames, numbered image output, and complete animation rendering. Command-line arguments are processed in order; render actions must follow configuration arguments. This supports proof-frame renders before a full sequence, resumable frame batches, and rendering on another machine. Pin a tested Blender version in the production record rather than relying on the changing `latest` manual. [Command-line rendering manual](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html).

### Three.js and React Three Fiber: an alternative, not the chosen final pipeline

R3F supports demand rendering and manual invalidation when a camera is mutated outside React. Reusing resources and instancing repeated objects reduce rendering work. These techniques can make a genuine interactive 3D alternative efficient, but they do not demonstrate architectural realism or a sufficiently detailed scene. [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Three.js requires explicit disposal of geometries, materials, and textures when no longer needed; removing an object alone does not release its GPU resources. Texture file size also differs substantially from decoded graphics memory. A real-time architectural experience adds model download, shader compilation, GPU variability, lighting compromises, and resource-management work. A rendered frame sequence exchanges those costs for image transfer and decode/cache management. This tradeoff favors the owner's chosen offline-render pipeline when the camera path is fixed. [Three.js cleanup manual](https://threejs.org/manual/pages/cleanup.html).

### Browser image decoding and resource lifetime

`HTMLImageElement.decode()` resolves after an image is ready and can reject for network or decoding failures. It provides a compatibility path for preparing frames without painting incomplete images. [Image decoding reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode).

`createImageBitmap()` asynchronously creates a drawable bitmap, including from a fetched blob. `ImageBitmap.close()` disposes its graphical resources. These support explicit eviction from a bounded cache, with an image-element fallback where necessary. Neither API guarantees that every browser performs all decoding off the main thread. [Bitmap creation](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [bitmap disposal](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close).

Fetch requests can be cancelled with AbortController; stale decode completions must also be rejected by an application generation/token check because cancellation and decode lifetime are different concerns. [AbortController reference](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort).

## Proposed player design and explicit budgets

These are engineering decisions for Strong Properties, not claims made by the supplied tutorial.

1. Use one normalized progress value, clamped to `[0, 1]`. For a uniform sequence with `N` frames, select `round(progress × (N − 1))`. The first and final positions select exactly the first and final assets. Bake cinematic acceleration into the source camera shot; avoid a second web easing layer that changes frame correspondence.
2. Keep `requestedFrame` and `displayedFrame` distinct. When the target is not decoded, retain the last successful image or poster and show buffering. Paint the exact current target when it arrives; do not silently label a nearby cached frame as the requested frame. Reverse scroll uses the same mapping.
3. Lazy-start frame requests near the cinematic viewport. Fetch/decode the target first, then a small directional neighborhood. Limit concurrency, discard obsolete queued work after large jumps, and never eagerly decode the complete sequence. A sparse look-ahead may improve seek readiness without keeping all frames in memory.
4. Limit decoded storage by estimated bytes as well as frame count. Keep the displayed frame protected during eviction. Close evicted bitmaps, abort obsolete fetches, and close any late bitmap after unmount or variant change. Release listeners, observers, ScrollTriggers, pending draws, and canvas backing storage on teardown.
5. Select independently composed desktop and portrait masters. Resize the canvas backing store using a capped device-pixel ratio, then draw with deterministic cover/contain and focal framing. Mobile should not fetch a desktop master simply to crop most of it away.
6. Keep an immediately visible poster underneath the canvas. Reduced motion, unavailable canvas, manifest failure, and repeated frame failures produce a useful static section with catalogue access; they must not leave an extended blank sticky range. The visible “Skip to Properties” link remains a regular keyboard-accessible anchor.

Decoded-memory arithmetic matters more than compressed file size. As a simple RGBA estimate, one 1920×1080 frame occupies about 7.91 MiB; 240 simultaneously decoded frames occupy about 1.85 GiB, before browser overhead. The implemented 32 MiB desktop and 16 MiB mobile cache budgets hold approximately nine 1280×720 frames or four 720×1280 portrait frames; transient decoding and canvas backing stores are additional allocations. Lower delivery dimensions can increase the neighborhood without increasing that budget. These are estimates of retained pixel data, not measured total browser or GPU memory.

A manifest should identify sequence version, production/temporary status, scene identifier, source-frame count, delivery variants, dimensions, frame URLs or numbering pattern, posters, source timestamps, render settings, byte totals, checksums, and asset provenance. If frames are removed during optimization, preserve their source-timeline positions instead of assuming that every remaining index is equally spaced.

## Architectural asset provenance

Poly Haven publishes HDRIs, textures, and models under CC0 and explicitly permits commercial use. This supports a documented source library for materials, lighting, and landscape assets. It does not confer permission to reuse its website branding or unrelated user-rendered examples, and its API/website terms are separate from the asset license. Record each selected asset, creator, source URL, license, downloaded version/hash, and required texture files. No asset was downloaded or represented as installed by this research task. [Asset license](https://polyhaven.com/license), [official FAQ](https://docs.polyhaven.com/en/faq).

## Proof and performance methodology

Automated checks must record requested and actually painted frame indices at 0%, 25%, 50%, 75%, 100%, and a reverse return. Add rapid jumps, asset failures, throttled network, mobile framing, reduced motion, keyboard skipping, and repeated mount/unmount or route changes. Pixel screenshots and a recording verify continuity; index assertions alone cannot prove photorealism or a coherent building.

Measure cold and warm target-to-paint latency, dropped/late target updates, transfer bytes, concurrent decodes, retained-cache byte estimates, main-thread long tasks, and CLS. Browser long-task entries describe uninterrupted UI-thread work of at least 50 ms; observe support and distinguish startup from sustained scrubbing. [Long Tasks reference](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming).

`measureUserAgentSpecificMemory()` is an experimental estimate requiring a secure, cross-origin-isolated context. Browser/version comparisons are not interchangeable. If unavailable, label JavaScript-heap samples and retained-pixel estimates separately; neither measures total browser memory. Record the unavailable measurement rather than reporting an invented number. [Browser memory measurement](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory).

## Remaining research limitations and gate criteria

- The supplied playlist cannot be expanded, and its additional tutorials are unknown. A corrected accessible playlist would allow per-video technique comparisons.
- The supplied video's description is accessible, but transcript and visual demonstration details remain unverified. No missing technique was inferred from its title.
- Blender manual pages sometimes failed through the web retrieval service. Search-indexed official manual content and directly accessible primary references were used; version-specific production APIs still require validation against the installed renderer.
- Scene quality and continuous camera proof remain production gates. A functional frame player and temporary preview must not be reported as final photorealistic footage.
- Full rendering should begin only after consistent representative frames and camera continuity pass review, followed by actual forward/reverse scroll proof and business-function regression checks.
