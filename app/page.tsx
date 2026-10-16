import HousePage, { houseMetadata } from '@/components/house/HousePage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return houseMetadata(); }
export default HousePage;
