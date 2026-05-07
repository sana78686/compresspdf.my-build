import type { MetadataRoute } from 'next'
import { siteOriginFromEnv } from '@/lib/cms/html'
import { getBlogs, getPages } from '@/lib/cms/server'

/** Keep in sync with `src/app/(site)/legal/[slug]/page.tsx` */
const LEGAL_SLUGS = ['terms', 'privacy-policy', 'disclaimer', 'about-us', 'cookie-policy']

function normalizeBlogSlugs(res: unknown): { slug: string }[] {
  if (Array.isArray(res)) {
    return (res as { slug?: string }[])
      .filter((b) => b && typeof b.slug === 'string')
      .map((b) => ({ slug: b.slug as string }))
  }
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>
    const raw = Array.isArray(o.blogs) ? o.blogs : Array.isArray(o.data) ? o.data : []
    return (raw as { slug?: string }[])
      .filter((b) => b && typeof b.slug === 'string')
      .map((b) => ({ slug: b.slug as string }))
  }
  return []
}

function normalizePageSlugs(res: unknown): string[] {
  if (!res || typeof res !== 'object') return []
  const pages = (res as { pages?: { slug?: string }[] }).pages
  if (!Array.isArray(pages)) return []
  return pages
    .map((p) => (p && typeof p.slug === 'string' ? p.slug : ''))
    .filter(Boolean)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Same URL set as the former `app/sitemap.ts` (blogs, pages, legal, static routes). */
export async function getProgrammaticSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = siteOriginFromEnv().replace(/\/+$/, '')
  const lastModified = new Date()

  const staticPaths = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/contact', priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/en', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/en/blog', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/en/contact', priority: 0.85, changeFrequency: 'monthly' as const },
  ]

  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority, changeFrequency }) => ({
    url: path === '' ? `${base}/` : `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))

  for (const slug of LEGAL_SLUGS) {
    entries.push({
      url: `${base}/legal/${encodeURIComponent(slug)}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
    entries.push({
      url: `${base}/en/legal/${encodeURIComponent(slug)}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  try {
    const [msRes, enRes, msPages, enPages] = await Promise.all([
      getBlogs('ms'),
      getBlogs('en'),
      getPages('ms'),
      getPages('en'),
    ])
    for (const b of normalizeBlogSlugs(msRes)) {
      entries.push({
        url: `${base}/blog/${encodeURIComponent(b.slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
    for (const b of normalizeBlogSlugs(enRes)) {
      entries.push({
        url: `${base}/en/blog/${encodeURIComponent(b.slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
    for (const slug of normalizePageSlugs(msPages)) {
      entries.push({
        url: `${base}/page/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }
    for (const slug of normalizePageSlugs(enPages)) {
      entries.push({
        url: `${base}/en/page/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }
  } catch {
    /* CMS unavailable — static URLs still listed */
  }

  return entries
}

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const lines = entries.map((e) => {
    const loc = escapeXml(e.url)
    const lastmod =
      e.lastModified != null
        ? `<lastmod>${escapeXml(new Date(e.lastModified).toISOString())}</lastmod>`
        : ''
    const cf =
      e.changeFrequency != null
        ? `<changefreq>${escapeXml(String(e.changeFrequency))}</changefreq>`
        : ''
    const pr = e.priority != null ? `<priority>${escapeXml(String(e.priority))}</priority>` : ''
    return `  <url><loc>${loc}</loc>${lastmod}${cf}${pr}</url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`
}
