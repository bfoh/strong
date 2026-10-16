// Original brand artwork only. Sale inventory/media always comes from Supabase.
const conceptual = 'Original AI-generated conceptual brand artwork; not a property listing or geographic photograph.';
export const brandAssets = {
  hero: { src: '/images/cinematic-v2/hero.webp', alt: 'Conceptual limestone colonnade and reflecting pool in warm natural sunlight', provenance: conceptual, purpose: 'Cinematic arrival and matching social metadata' },
  land: { src: '/images/cinematic-v2/land.webp', alt: 'Conceptual aerial view of undeveloped tropical terrain with a red earth access road', provenance: conceptual, purpose: 'Land category' },
  residential: { src: '/images/cinematic-v2/residential.webp', alt: 'Conceptual contemporary ivory residence in a tropical garden', provenance: conceptual, purpose: 'Residential category' },
  commercial: { src: '/images/cinematic-v2/commercial.webp', alt: 'Conceptual premium commercial architecture with stone louvers and glass storefronts', provenance: conceptual, purpose: 'Commercial category' },
  philosophy: { src: '/images/cinematic-v2/philosophy.webp', alt: 'Conceptual study of travertine, an ivory architectural opening and a champagne metal seam', provenance: conceptual, purpose: 'Philosophy materiality; matching About philosophy story' },
  closing: { src: '/images/cinematic-v2/closing.webp', alt: 'Conceptual sunlit limestone passage opening into a garden', provenance: conceptual, purpose: 'Final invitation' },
  kumasi: { src: '/data/ghana-kumasi.json', alt: 'Ghana country outline and verified Kumasi city locator', provenance: 'Natural Earth public domain geographic data. City location only; no property markers.', purpose: 'Editorial location composition' },
} as const;

export type Credit = { author: string; license: string; licenseUrl: string; source: string };
// Licensed documentary photography for place-specific editorial sections. Credits are rendered beside each image.
export const editorialAssets = {
  forest: { src: '/images/editorial/ashanti-forest.webp', width: 2000, height: 1330, alt: 'Forest and woodland canopy across the uplands of the Ashanti Region, Ghana', credit: { author: 'Joachim Huber', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Forests_and_Woodlands,_Ashanti_region,_South_Ghana.jpg' } },
  manhyia: { src: '/images/editorial/manhyia-palace.webp', width: 2000, height: 1333, alt: 'The colonnaded façade of the Manhyia Palace Museum in Kumasi', credit: { author: 'Dan Sloan', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Manhyia_Palace_Museum_(Kumasi,_Ghana_2017).jpg' } },
  greatHall: { src: '/images/editorial/kumasi-great-hall.webp', width: 2000, height: 1128, alt: 'The modernist concrete Great Hall at KNUST, Kumasi, photographed in warm monochrome', credit: { author: 'Pnlarbi', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'https://commons.wikimedia.org/wiki/File:An_architectural_study_of_the_Great_Hall_at_Kwame_Nkrumah_University_of_Science_and_Technology_(KNUST),_Kumasi,_showcasing_its_iconic_brutalist_design_through_a_series_of_ground-level_and_aerial_perspectives..jpg' } },
} as const satisfies Record<string, { src: string; width: number; height: number; alt: string; credit: Credit }>;
