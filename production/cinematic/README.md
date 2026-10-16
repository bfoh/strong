# External cinematic production

There is no Blender installation or licensed architectural scene in this workspace. The included player currently uses a labelled procedural camera-blocking preview. Do not promote it to final footage.

1. On a rendering workstation, install Blender4.2+ and obtain/build a licensed architectural `.blend` matching [the scene specification](../../docs/cinematic-scene-specification.md). Pack dependencies, freeze geometry/lighting/material animation, align metres and coordinates to `shot.json`. Keep source files outside public assets.
2. Create `licenses.json` from `licenses.example.json`, replacing every placeholder and recording every architecture, texture, HDRI and vegetation source. `webRenderPermitted` must truthfully be true for all assets.
3. Render five proof stills for each master from the project root:

```sh
blender --background --python scripts/cinematic/render_blender.py -- --scene /absolute/source/scene.blend --licenses /absolute/source/licenses.json --variant desktop --output /absolute/renders/proof-desktop --proof
blender --background --python scripts/cinematic/render_blender.py -- --scene /absolute/source/scene.blend --licenses /absolute/source/licenses.json --variant mobile --output /absolute/renders/proof-mobile --proof
```

These commands also save `animated-shot.blend` and baked camera telemetry. Open the project and make a continuous playblast. Review both masters across the entire shot. Check that the camera never crosses the wall/roof/glass; do not accept five attractive stills without continuity. `--device GPU` requires Cycles devices configured on that workstation; CPU is the default.

4. After visual and continuity review, copy `approval.example.json` to a source approval file, supply reviewer/date/notes and the SHA-256 of the exact source `.blend` (`shasum -a 256 /absolute/source/scene.blend`). Only then set both approvals true. If the scene changes, rerun proof and approve the new digest.
5. Full render:

```sh
blender --background --python scripts/cinematic/render_blender.py -- --scene /absolute/source/scene.blend --licenses /absolute/source/licenses.json --approval /absolute/source/approval.json --variant desktop --output /absolute/renders/desktop
blender --background --python scripts/cinematic/render_blender.py -- --scene /absolute/source/scene.blend --licenses /absolute/source/licenses.json --approval /absolute/source/approval.json --variant mobile --output /absolute/renders/mobile
node scripts/cinematic/export-sequence.mjs /absolute/renders/desktop /absolute/renders/mobile strong-pavilion-final-v1
```

The exporter validates every frame/master and matching scene hashes, creates WebPs/posters in a new version directory, and atomically selects `public/cinematic/manifest.json`. Existing version assets remain available. The homepage reads that manifest; no component rewrite is needed. Benchmark the real renders before deployment.

6. Optional promotional video (requires ffmpeg) never replaces the scroll player:

```sh
python3 scripts/cinematic/export-video.py /absolute/renders/desktop /absolute/exports/strong-pavilion.mp4
python3 scripts/cinematic/export-video.py /absolute/renders/desktop /absolute/exports/strong-pavilion.webm
```

7. Run `node scripts/verify-cinematic-v3.mjs` against the production Next server. Check forward/reverse/rapid frames, portrait, reduced motion, keyboard, failure and slow-network paths; inspect evidence and performance. Final visual approval is still a human review of the rendered architecture.

To regenerate only the owned temporary preview: `node scripts/cinematic/render-preview.mjs` (installed Chrome/WebGL required). It deliberately writes status `blocking-preview`, never `production`.

Blender execution, actual Cycles render quality, GPU support and optional external ffmpeg commands cannot be verified on the present host. Python syntax can be checked without Blender; that does not certify a render.
