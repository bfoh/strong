import HousePage, { houseMetadata } from '@/components/house/HousePage';
import { notFound } from 'next/navigation';
import { isHousePreviewRequest } from '@/lib/house/preview';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return houseMetadata({ preview: true }); }
export default async function HousePreview() {
  if (!await isHousePreviewRequest()) notFound();
  return <HousePage/>;
}
