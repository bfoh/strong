'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { campaignUrl } from '@/lib/marketing';
import { useMarketing } from './MarketingProvider';
type Props = ComponentProps<typeof Link> & { eventName?: 'whatsapp_click' | 'phone_click'; propertyId?: string };
export default function TrackedLink({ href, eventName, propertyId, onClick, ...props }: Props) {
  const { attribution, track } = useMarketing();
  return <Link {...props} href={typeof href === 'string' ? campaignUrl(href,attribution) : href} onClick={event => { onClick?.(event); if (eventName) track(eventName, propertyId ? {property_id:propertyId} : {}); }}/>;
}
