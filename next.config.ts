import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['three'],
  // Managed media must never enter the image optimizer's public cache.
  images: { localPatterns: [{ pathname: '/images/**', search: '' }] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ] }, {
      // Scroll-sequence frames are warmed into the HTTP cache; rename the folder when the footage changes.
      source: '/cinematic/hero/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
    }];
  },
};
export default config;
