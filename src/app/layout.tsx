import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CmsClientBootstrap } from '@/components/CmsClientBootstrap'
import { siteOriginFromEnv } from '@/lib/cms/html'

/**
 * No `next/font` remote fonts — avoids the Lighthouse “Network dependency tree”
 * HTML→CSS→woff2 chain and cuts font-swap reflow work on mobile lab runs.
 * Typography matches native UI fonts via `globals.css` system stack.
 */

const siteUrl = siteOriginFromEnv()
const metadataBase = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
const siteDomain = (() => {
  try {
    return new URL(siteUrl).hostname
  } catch {
    return 'compresspdf.my'
  }
})()

export const metadata: Metadata = {
  metadataBase,
  title: { default: siteDomain, template: '%s' },
  description: 'Reduce PDF file size in your browser.',
  applicationName: siteDomain,
  icons: {
    icon: [
      { url: '/compresspdf.my-fevicon.png', type: 'image/png', sizes: '48x48' },
      { url: '/compresspdf.my-fevicon.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/compresspdf.my-fevicon.png',
    apple: '/compresspdf.my-fevicon.png',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    siteName: siteDomain,
    locale: 'ms_MY',
    alternateLocale: ['en_US'],
    images: [
      {
        url: '/compresspdf.my-logo.png',
        width: 560,
        height: 144,
        alt: siteDomain,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
}

/**
 * Viewport + PWA-style hints. Lighthouse expects this as a separate export in
 * Next.js 14+. Without it, mobile Performance and SEO both lose points and
 * the browser falls back to non-responsive rendering.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1b4d3e' },
    { media: '(prefers-color-scheme: dark)', color: '#142921' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <CmsClientBootstrap />
        {children}
      </body>
    </html>
  )
}
