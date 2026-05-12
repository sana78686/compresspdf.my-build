import { NextResponse } from 'next/server'
import { getProgrammaticSitemapEntries, sitemapEntriesToXml } from '@/lib/seo/programmaticSitemap'

export const runtime = 'nodejs'

export async function GET() {
  const entries = await getProgrammaticSitemapEntries()
  const body = sitemapEntriesToXml(entries)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}