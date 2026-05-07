import { NextResponse } from 'next/server'
import { buildFallbackRobotsTxt, resolveRobotsTxtBody } from '@/lib/seo/cmsSeoFiles'

export const runtime = 'nodejs'

/** Prefer `public/robots.txt` (CMS POST sync), else Laravel `/{domain}/robots.txt`, else fallback. */
export async function GET() {
  const body = (await resolveRobotsTxtBody()) ?? buildFallbackRobotsTxt()
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
