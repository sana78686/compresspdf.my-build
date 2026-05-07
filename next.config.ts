import type { NextConfig } from 'next'

const CMS_API_URL = String(process.env.NEXT_PUBLIC_CMS_API_URL || 'https://app.apimstec.com').replace(/\/+$/, '')
const SITE_DOMAIN = String(process.env.NEXT_PUBLIC_SITE_DOMAIN || 'compresspdf.my')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/:\d+$/, '')
  .split('/')[0]

const nextConfig: NextConfig = {
  transpilePackages: ['@quicktoolsone/pdf-compress'],
  serverExternalPackages: ['pdfjs-dist'],
  poweredByHeader: false,
  compress: true,
  /**
   * Inline critical CSS via Critters so the head <link> stylesheets stop
   * render-blocking the first paint. Removes the "Render-blocking requests"
   * Lighthouse insight (~360 ms saving). Stable since Next.js 14.
   */
  experimental: {
    optimizeCss: true,
  },
  /**
   * Rewrites:
   * - cms-seo-sync.php: GlobalCMS pushes to `{site}/cms-seo-sync.php`; forward to App Router API.
   * - /cms-uploads/* and /uploads/*: proxy CMS media so OG / canonical URLs that point at
   *   the public site (e.g. `https://compresspdf.my/cms-uploads/...webp`) actually resolve
   *   instead of 404. Targets the same `/{site}/api/public/media?path=...` endpoint that
   *   `cmsAssetUrl.publicMediaProxyUrl` uses on the client.
   */
  async rewrites() {
    return [
      { source: '/cms-seo-sync.php', destination: '/api/cms-seo-sync' },
      {
        source: '/cms-uploads/:path*',
        destination: `${CMS_API_URL}/${SITE_DOMAIN}/api/public/media?path=cms-uploads/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${CMS_API_URL}/${SITE_DOMAIN}/api/public/media?path=uploads/:path*`,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
}

export default nextConfig
