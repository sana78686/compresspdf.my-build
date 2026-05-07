import { NextResponse } from 'next/server'
import { resolveSitemapXmlBody } from '@/lib/seo/cmsSeoFiles'
import { getProgrammaticSitemapEntries, sitemapEntriesToXml } from '@/lib/seo/programmaticSitemap'

export const runtime = 'nodejs'

/** Prefer `public/sitemap.xml` (CMS POST sync), else Laravel `/{domain}/sitemap.xml`, else programmatic URLs. */
export async function GET() {
  const fromCms = await resolveSitemapXmlBody()
  const body = fromCms ?? sitemapEntriesToXml(await getProgrammaticSitemapEntries())
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
