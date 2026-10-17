'use client';
import Image from 'next/image';
import { useState } from 'react';
import { safeMediaUrl } from '@/lib/data';
export default function PropertyImage({ src, alt, sizes, priority = false, className = '' }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false), url = safeMediaUrl(src);
  if (!url || failed) return <div className={`media-fallback ${className}`} role="img" aria-label={alt + ' — image unavailable'}><span>STRONG</span><small>Property imagery forthcoming</small></div>;
  // Remote listing hosts are administered by staff. Render them without a permissive optimizer allowlist.
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={className} unoptimized={url.startsWith('https:') || url.startsWith('/api/')} onError={() => setFailed(true)}/>;
}
