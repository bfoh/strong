# Media provenance and launch replacement checklist

## Supplied source media
The original four JPEG files remain at `public/images/*.jpeg`. Their television logos, advertisement contact overlays and physical architecture have not been removed or replaced. WebP derivatives in `public/images/properties/` preserve image content; cards may crop their presentation, and the fullscreen gallery uses contain sizing. The pool capture is a separate unverified preview; the kitchen is not silently associated with that property.

## Conceptual architectural asset
The built-in ImageGen tool created a brand illustration. It is never used as a listing photograph. It appears only in the hero, architectural story, category storytelling and company page, with visible conceptual-image captions. Optimized asset: `public/images/architecture/concept-courtyard.webp`. Source: `public/images/architecture/concept-courtyard-source.png`.

Final prompt (built-in tool):
> Use case: photorealistic-natural. Asset type: wide editorial architectural brand storytelling image for Strong Properties, a light luxury real-estate website. This is an explicitly conceptual architectural image, not an actual property listing. Create a refined sunlit contemporary tropical residence courtyard, viewed from under a quiet limestone colonnade toward a low two-storey ivory villa, generous slender structural planes, warm limestone, recessed timber screens, large windows, subtle tropical greenery, a small reflective pool, warm late-afternoon sunlight and elegant diagonal shadows. International architectural magazine photography, natural textures, believable restrained architecture, no extravagant fantasy. Wide panoramic horizontal composition about 3:2 with architecture occupying the center and right and open bright sky above. Mostly ivory, pale warm stone, muted sage greenery, champagne sunlight, no heavy orange grading. No people, no text, no signage, no logos, no watermarks. Save the generated image as an asset accessible by local file path.

The abstract 3D study and static SVG fallback are original code-defined structural planes. Neither represents an actual property.

## Before public sales launch
- Obtain original property photography and permission to use it.
- Confirm each image's association with the correct property. Do not infer features from unrelated screenshots.
- Verify property title, location, category, status, specifications, price and documentation independently.
- Replace TV screenshots, including all broadcast contact overlays, with company-approved originals.
- Confirm phone, email, address and any social accounts before exposing them in site configuration.
- Confirm exact coordinates before introducing property map markers. No coordinates are currently in the schema.
- For video: provide original compressed media, poster, meaningful title, captions and a transcript as appropriate. No videos were supplied for this milestone.
- Keep property PDFs in staff-only managed storage. Publish only verified documentation-status information on the public detail page; private files never become buyer download links.
- Review crops, alt text and fullscreen rendering across mobile and desktop after replacement.
- Keep development previews excluded from search engines and do not present them as sale inventory.

## Cinematic V2 assets

Six additional original built-in ImageGen assets have distinct purposes and are labelled conceptual brand artwork. They never appear as verified sale inventory. `docs/cinematic-v2-assets.json` records source/derivative dimensions, paths and intentional same-story reuse; final derivatives do not upscale. Exact final prompts are in the hero, category and philosophy prompt documents. The older concept courtyard is retained for provenance but no longer appears on the public homepage.

The Kumasi locator uses Natural Earth public-domain Ghana boundaries and a Kumasi city coordinate from its populated-place dataset. This is a city locator, not an estate map. Source: https://github.com/nvkelso/natural-earth-vector ; licence: https://www.naturalearthdata.com/about/terms-of-use/ .
