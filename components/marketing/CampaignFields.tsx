'use client';
import { attributionKeys, type Attribution } from '@/lib/marketing';
import { useMarketing } from './MarketingProvider';
export default function CampaignFields({ initial = {} }: { initial?: Attribution }) {
  const { attribution }=useMarketing(), value=Object.keys(attribution).length?attribution:initial;
  return <>{attributionKeys.map(key=>value[key]?<input key={key} type="hidden" name={key} value={value[key]}/>:null)}</>;
}
