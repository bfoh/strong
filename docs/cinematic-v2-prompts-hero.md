# Cinematic V2 hero and closing image prompts

Tool: built-in `image_gen.imagegen` (two separate calls, one original asset per call).
Date: 2026-10-12.
Use: Original conceptual brand imagery for Strong Properties. These are imaginary architectural scenes; they do not depict actual inventory, a verified property, or a Kumasi photograph.
Processing: Sharp resizing to width 2000 and WebP quality 85 only. No synthesized editing or compositing. Source PNGs preserved.

## Hero

Source: `public/images/cinematic-v2/hero-source.png`
Web derivative: `public/images/cinematic-v2/hero.webp`

Final prompt:

```text
Use case: ads-marketing
Asset type: cinematic luxury property brand homepage hero image, original conceptual architecture.
Primary request: Create one original wide 16:9 photographic editorial architecture image of a contemporary tropical limestone residence/pavilion, viewed from a slightly low camera beneath a shaded colonnade. This is concept art for Strong Properties, not a photograph of a real property.
Scene/backdrop: Luminous architectural luxury, an open pavilion with disciplined rectangular structure and tranquil shallow water reflections. Strong layered structural planes and colonnade recede towards the right, with architecture concentrated in the center and right. Muted tropical garden greenery beyond.
Composition/framing: Wide 16:9 landscape, cinematic architectural photography, 28mm perspective, carefully aligned straight verticals, beautiful spatial depth. The left lower half must remain slightly shadowed warm stone and deep charcoal timber, calm with minimal visual detail and plenty of usable space for large white homepage typography to be added later. Do not add typography. Architecture center/right, long horizontal roof planes and layered thresholds; distinct from a courtyard composition.
Lighting/mood: Gorgeous controlled directional natural warm sunlight grazes ivory limestone and warm travertine. Bright sunlit planes contrasted with rich shaded areas, restrained golden reflections, serene and editorial rather than glossy CGI.
Color palette and materials: Ivory limestone, warm travertine, champagne metal details, deep charcoal timber, muted tropical greens. Natural tactile stone grain and precise craftsmanship, subtly atmospheric light.
Constraints: One coherent image, no collage. Original imaginary architecture only. No words, letters, logos, signage, watermarks, people, cars, real listing claims, location identifiers, or branded objects. Photographically convincing, understated, refined, no overly saturated colors.
```

## Closing

Source: `public/images/cinematic-v2/closing-source.png`
Web derivative: `public/images/cinematic-v2/closing.webp`

Final prompt:

```text
Use case: ads-marketing
Asset type: wide 16:9 closing brand image for a cinematic luxury property website, original conceptual architecture.
Primary request: Create one original photographic editorial architecture image of an intimate ivory limestone passage opening through a tall sculptural rectangular doorway to a tranquil sunlit tropical garden. This is conceptual brand artwork, not a photograph of an actual listing or location.
Scene/backdrop: A quiet narrow architectural passage with an exceptionally tall rectangular stone portal, framing a sunlit garden of muted tropical greenery. Warm travertine paving, subtle champagne metal details, occasional deep charcoal timber, lush greens softened by natural light. Entirely distinct scene from an exterior colonnaded residence.
Composition/framing: Wide 16:9 landscape, strongly designed asymmetrical architectural composition. Tall sculptural doorway near the center-right, close textured limestone walls and long crisp diagonal shadows cutting across the foreground floor; striking intersecting diagonal geometry, deeply dimensional view into the garden. Clean verticals, realistic architectural photography, restrained editorial elegance. No decorative clutter.
Lighting/mood: Natural warm sunlight from the garden, glowing ivory and pale gold planes, soft reflected light in the shaded passage, striking long shadows, calm and intimate.
Color palette and materials: Ivory limestone, warm travertine, champagne metal, deep charcoal timber accents and muted tropical greens. Photographic surface detail, subtle stone texture, no saturated synthetic colors.
Constraints: One coherent image, no collage. Original imaginary architecture only, no specific identifiable location. No words, letters, logos, signage, watermarks, people, cars, real listing claims, or branded objects. Photographically convincing architectural concept, no cartoon or excessively glossy CGI appearance.
```

## Review and limitations

Both outputs were visually inspected using `view_image`. Neither image includes people, text, logos, signage, or watermarks. The images share a restrained ivory, travertine, charcoal timber, champagne and tropical green palette. Hero provides a shaded left area suitable for later white text overlay; closing uses a distinct portal passage and diagonal shadows. These are AI generated concepts; architectural details have not been verified as buildable or representative of actual listings.

The built-in tool returned PNG sources at 1672 × 941 pixels (approximately 16:9). Requested web derivatives are 2000 × 1126 pixels at quality 85. This export enlarges the source width as requested; it does not add native image detail.

| Asset | Dimensions | Bytes |
| --- | --- | --- |
| `hero-source.png` | 1672 × 941 | 2,414,930 |
| `hero.webp` | 2000 × 1126 | 250,166 |
| `closing-source.png` | 1672 × 941 | 2,638,413 |
| `closing.webp` | 2000 × 1126 | 264,456 |
