# Cinematic v2 category asset prompts

Tool: built-in `image_gen.imagegen`, one generation call per category. No CLI/API fallback was used. All images are original fictional conceptual imagery; they do not represent actual listings or identified Kumasi locations.

Sources were copied from the built-in tool output into the project. Derived assets use only Sharp resize to width 1600 and WebP encoding at quality 84; no compositing, cropping, or image edits were performed. Each source was visually inspected using `view_image`.

## Land

- Selected original: `public/images/cinematic-v2/land-source.png` (1024 × 1536).
- Compressed delivery asset: `public/images/cinematic-v2/land.webp` (1600 × 2400, width 1600, WebP quality 84).

Final prompt:

```text
Use case: photorealistic-natural
Asset type: original conceptual land category photograph for a luxury property website, cropped to a tall immersive panel.
Primary request: A distinctive high oblique aerial landscape of an undeveloped tropical land opportunity, with warm red earth access road curving through natural greenery and rolling contours.
Scene/backdrop: Believable tropical countryside, mature trees and open grassy natural terrain, gently rising distant wooded hills. No recognisable real place.
Subject: The land itself, entirely undeveloped; a narrow warm red earth road runs from foreground toward the centered middle distance.
Style/medium: Sophisticated editorial aerial photography, realistic soil and foliage detail, premium architectural magazine atmosphere.
Composition/framing: Broad landscape 3:2 composition, high oblique view rather than directly overhead, dominant access road and beautiful rolling land centered so a portrait crop retains the narrative. Layer foreground, middle distance, and distant hills. No buildings anywhere.
Lighting/mood: Luminous natural afternoon sun, subtle atmospheric distance, relaxed aspirational mood.
Color palette: Natural deep and olive greens, warm terracotta red earth, softly sunlit dry grasses, pale ivory atmosphere.
Constraints: Original fictional conceptual art only, no claimed actual listing or actual Kumasi location. No villa, pavilion, house, construction, boundary labels, cars, people, text, logos, or watermarks. Natural believable geography, no exaggerated drone HDR.
```

## Residential

- Selected original: `public/images/cinematic-v2/residential-source.png` (1536 × 1024).
- Compressed delivery asset: `public/images/cinematic-v2/residential.webp` (1600 × 1067, width 1600, WebP quality 84).

Final prompt:

```text
Use case: photorealistic-natural
Asset type: original conceptual residential category photograph for a luxury property website.
Primary request: A beautiful modern tropical two-storey residence viewed from eye level across its garden. A distinctive centered house with sculpted pale ivory limestone volumes, deeply recessed timber doors and window openings, restrained champagne-bronze trim, and lush deep green natural planting.
Scene/backdrop: Fictional tropical garden setting with mature trees, neatly composed palms and a calm lawn in the foreground. No recognizable real location.
Subject: An elegant private residence, generously proportioned but intimate, with a solid textured ivory upper floor, deep shaded loggia beneath, and warm timber vertical details. No pool or floating pavilion.
Style/medium: Photorealistic luxury architectural editorial photography, tactile material surfaces and fine natural foliage.
Composition/framing: LANDSCAPE format, aspect ratio 3:2, a broad photographic frame. Eye level view from the garden toward the complete two-storey residence. Center the principal house facade and entrance so a narrow tall crop preserves an attractive architectural subject. Slightly asymmetric architectural composition, no dramatic exaggerated wide-angle distortion. Foreground garden supplies depth.
Lighting/mood: Luminous natural late afternoon sunlight, bright cream stone with beautiful soft shadow, fresh peaceful invitation.
Color palette: Pale limestone and ivory, muted champagne metallic accents, warm brown timber, natural deep and emerald greens.
Materials/textures: Subtle porous limestone, fine vertical timber slats, glass reflections, lush planted garden.
Constraints: Original fictional conceptual art only, no asserted actual listing or actual Kumasi location. No people, cars, written signs, logos, text, watermarks, or pavilion composition. Realistic architectural joins and proportions; no repeated mirrored structures.
```

## Commercial

- Selected original: `public/images/cinematic-v2/commercial-source.png` (1536 × 1024).
- Compressed delivery asset: `public/images/cinematic-v2/commercial.webp` (1600 × 1067, width 1600, WebP quality 84).

Final prompt:

```text
Use case: photorealistic-natural
Asset type: original conceptual commercial category photograph for a luxury property website.
Primary request: A premium four-storey commercial office courtyard facade with warm ivory limestone and champagne stone vertical louvers, broad clear glass storefronts at ground level, and refined restrained courtyard trees.
Scene/backdrop: Fictional contemporary tropical business district, framed entirely around the elegant office building and its modest stone-paved forecourt. No recognizable real location.
Subject: A distinctly commercial four-storey office building, a centered recessed glass main lobby beneath stacked levels of tall office glazing and regular pale stone fins. Architectural scale clearly commercial: generous floor heights, long glass ground-floor frontage, precise facade grid. No balconies or residential furniture.
Style/medium: Photorealistic luxury architecture editorial photography, premium materials, real glass reflections and tactile stone detail.
Composition/framing: LANDSCAPE aspect ratio 3:2. Eye-level three-quarter facade view across a calm paved courtyard, principal recessed lobby and tower centered so a tall portrait crop retains a strong office-building subject. Show four floors and a portion of courtyard foreground with a few restrained trees. Clean architectural perspective, no extreme wide-angle distortion.
Lighting/mood: Luminous afternoon sunlight with ivory planes and soft long courtyard shadows, calm prestige, quietly active architecture without people.
Color palette: Pale limestone/ivory, soft warm champagne accents, clear blue glass reflections, restrained natural deep green trees.
Materials/textures: Warm subtly textured limestone, pale stone vertical louvers, bronze window trims, broad smooth glass storefronts, finely cut paving.
Constraints: Original fictional conceptual art only, no asserted real listing or actual Kumasi location. No villa, pool, pavilion, residential balconies, couches, cars, people, text, signage, logos, or watermarks. Believable commercial architectural proportions and details.
```

The land generation returned a portrait composition despite the landscape prompt. Its centered winding road remains well suited to the requested tall category panel. Residential and commercial images returned landscape compositions with centered architecture for portrait crops. Captions in the consuming UI must identify these as conceptual art.
