import { z } from 'zod';
export const HOUSE_VERSION = '1.0.1';
export const HOUSE_BASE = '/';
export const ASSET_BASE = '/images/house-v1';
export const imageOptions = ['exterior', 'hallway', 'listings', 'team', 'contact'] as const;
const sceneImage = z.string().max(200).refine(value => imageOptions.includes(value as typeof imageOptions[number]) || /^\/api\/house-images\/[0-9a-f-]{36}$/.test(value), 'Choose a scene or upload a homepage image.');
const focal = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).strict();
export const houseSettingsSchema = z.object({
  seoTitle: z.string().trim().min(1).max(120),
  seoDescription: z.string().trim().min(1).max(300),
  headline: z.string().trim().min(1).max(100),
  introduction: z.string().trim().min(1).max(240),
  listingTitle: z.string().trim().min(1).max(100),
  teamTitle: z.string().trim().min(1).max(100),
  teamDescription: z.string().trim().min(1).max(1200),
  contactTitle: z.string().trim().min(1).max(100),
  labels: z.object({ listings: z.string().min(1).max(30), team: z.string().min(1).max(30), contact: z.string().min(1).max(30) }).strict(),
  images: z.object({ exterior: sceneImage, hallway: sceneImage, listings: sceneImage, team: sceneImage, contact: sceneImage }).strict(),
  focus: z.object({ exterior: focal, hallway: focal, listings: focal, team: focal, contact: focal }).strict(),
  motion: z.object({
    enabled: z.boolean(), scrollScreens: z.number().min(1.5).max(4),
    roomDuration: z.number().int().min(600).max(1500),
    mobileDuration: z.number().int().min(200).max(450),
    arrivalZoom: z.number().min(1).max(1.65),
  }).strict(),
}).strict();
export type HouseSettings = z.infer<typeof houseSettingsSchema>;
export type Room = 'listings' | 'team' | 'contact';
export type HouseView = 'exterior' | 'hallway' | Room | 'property';
export const defaultHouseSettings: HouseSettings = {
  seoTitle: 'Strong Properties | Land, Homes & Commercial Property in Kumasi',
  seoDescription: 'Explore homes, land and commercial property in Kumasi with Strong Properties. Browse listings, meet the team and make a property enquiry.',
  headline: 'A place for what’s next.',
  introduction: 'Land, homes and commercial property in Kumasi. Explore your next chapter with Strong Properties.',
  listingTitle: 'Find your next chapter.',
  teamTitle: 'A personal approach. A strong foundation.',
  teamDescription: 'Meet Strong Properties in Kumasi. Tell us what you are looking for in a home, a plot of land or a commercial space, and start a conversation about your next step.',
  contactTitle: 'Let’s make your next move.',
  labels: { listings: 'Listings', team: 'Our Team', contact: 'Contact Us' },
  images: { exterior: 'exterior', hallway: 'hallway', listings: 'listings', team: 'team', contact: 'contact' },
  focus: { exterior: { x: 50, y: 50 }, hallway: { x: 50, y: 50 }, listings: { x: 50, y: 50 }, team: { x: 75, y: 50 }, contact: { x: 50, y: 50 } },
  motion: { enabled: true, scrollScreens: 2.4, roomDuration: 900, mobileDuration: 300, arrivalZoom: 1.4 },
};
export const photo = (name: string, size: 'mobile' | 'desktop' | 'thumb' | 'gallery' = 'desktop') => name.startsWith('/api/house-images/') ? name + '?variant=' + size : `${ASSET_BASE}/${name}-${size}.webp`;
export type HouseListing = {
  id: string; slug: string; title: string; category: 'land' | 'residential' | 'commercial';
  location: string; description: string; price: string; beds: number | null; baths: number | null;
  images: { url: string; label: string }[]; facts: { label: string; value: string }[]; demo: boolean;
};
export const conceptListing: HouseListing = {
  id: 'concept-residence', slug: 'concept-residence', title: 'The Garden Residence',
  category: 'residential', location: 'Kumasi · Illustrative setting',
  description: 'A warm contemporary residence imagined around light, garden views and generous living spaces. This architectural example demonstrates the viewing experience; it is not a property offered for sale.',
  price: 'Price to be confirmed', beds: 4, baths: 4, demo: true,
  images: [
    { url: photo('exterior'), label: 'Front' }, { url: photo('front-left'), label: 'Front left' },
    { url: photo('left'), label: 'Left side' }, { url: photo('rear'), label: 'Rear' },
    { url: photo('right'), label: 'Right side' }, { url: photo('front-right'), label: 'Front right' },
  ],
  facts: [
    { label: 'Property type', value: 'Concept residence' }, { label: 'Bedrooms / bathrooms', value: '4 / 4 · sample specifications' },
    { label: 'Internal area', value: '340 m² · sample specification' }, { label: 'Plot', value: '600 m² · sample specification' },
    { label: 'Outdoor space', value: 'Illustrative garden and terrace' }, { label: 'Parking', value: 'To be confirmed' },
    { label: 'Tenure & documentation', value: 'Not applicable to this concept' }, { label: 'Availability', value: 'Demonstration only · not for sale' },
  ],
};
