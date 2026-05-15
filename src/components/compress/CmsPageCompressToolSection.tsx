'use client'

import HomePageClient from './HomePageClient'

export type CmsPageCompressToolSectionProps = {
  /**
   * When server does not render the page `<h1>`, pass the title so the client hero can show it (legacy).
   * Prefer server `<h1>` in `page.tsx` + `serverH1Rendered` instead.
   */
  title?: string
  /** Server already rendered `<h1>` — client shows only subtitle + upload UI. */
  serverH1Rendered?: boolean
  /**
   * When `serverH1Rendered`, set true if a parent `<section id="compress-tool">` wraps server H1 + this client island (home, CMS pages).
   * Omit or false for blog: client renders its own `<section id="compress-tool">` below the article `<h1>`.
   */
  nestedUnderServerHeroSection?: boolean
}

/** Same PDF compress tool as the home hero; title source is either this prop (client H1) or a server `<h1>` in `page.tsx`. */
export default function CmsPageCompressToolSection({
  title,
  serverH1Rendered = false,
  nestedUnderServerHeroSection = false,
}: CmsPageCompressToolSectionProps) {
  const normalizedTitle = typeof title === 'string' ? title.trim() : ''
  return (
    <HomePageClient
      cmsPageTitle={serverH1Rendered ? undefined : normalizedTitle || undefined}
      suppressHeroH1={serverH1Rendered}
      embedCompressWithoutClientHero={serverH1Rendered}
      nestedUnderServerHeroSection={serverH1Rendered ? nestedUnderServerHeroSection : false}
    />
  )
}
