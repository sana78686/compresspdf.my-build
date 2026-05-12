import type { MetadataRoute } from 'next'
import { siteOriginFromEnv } from '@/lib/cms/html'
import { getBlogs, getPages, getLegalNav } from '@/lib/cms/server'

/** Fallback legal slugs if API unavailable */
const FALLBACK_LEGAL_SLUGS = ['terms', 'privacy-policy', 'disclaimer', 'about-us', 'cookie-policy']

/** Extract enabled legal slugs from API response */
function normalizeLegalSlugs(res: unknown): string[] {
  if (!res || typeof res !== 'object') return []
  const legal = (res as { legal?: Record<string, boolean> }).legal
  if (!legal || typeof legal !== 'object') return []
  return Object.entries(legal)
    .filter(([, enabled]) => enabled === true)
    .map(([slug]) => slug)
}

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

function shouldOmitCompressPageSlug(slug: string): boolean {
  return slug === 'compress' || slug.startsWith('compress/')
}

function omitCompressUrlsFromSitemap(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const drop = new Set([
    '/compress',
    '/page/compress',
    '/en/compress',
    '/en/page/compress',
    '/es/compress',
    '/es/page/compress',
    '/ms/compress',
    '/ms/page/compress',
  ])
  return entries.filter((e) => {
    try {
      const path = new URL(e.url).pathname.replace(/\/+$/, '') || '/'
      return !drop.has(path)
    } catch {
      return true
    }
  })
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

  try {
    const [msRes, enRes, msPages, enPages, msLegal, enLegal] = await Promise.all([
      getBlogs('ms'),
      getBlogs('en'),
      getPages('ms'),
      getPages('en'),
      getLegalNav('ms'),
      getLegalNav('en'),
    ])

    // Dynamic legal pages from API (falls back to hardcoded if empty)
    const msLegalSlugs = normalizeLegalSlugs(msLegal)
    const enLegalSlugs = normalizeLegalSlugs(enLegal)
    const legalSlugsMs = msLegalSlugs.length > 0 ? msLegalSlugs : FALLBACK_LEGAL_SLUGS
    const legalSlugsEn = enLegalSlugs.length > 0 ? enLegalSlugs : FALLBACK_LEGAL_SLUGS

    for (const slug of legalSlugsMs) {
      entries.push({
        url: `${base}/legal/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
    for (const slug of legalSlugsEn) {
      entries.push({
        url: `${base}/en/legal/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
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
      if (shouldOmitCompressPageSlug(slug)) continue
      entries.push({
        url: `${base}/page/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }
    for (const slug of normalizePageSlugs(enPages)) {
      if (shouldOmitCompressPageSlug(slug)) continue
      entries.push({
        url: `${base}/en/page/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }
  } catch {
    /* CMS unavailable — use fallback legal slugs */
    for (const slug of FALLBACK_LEGAL_SLUGS) {
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
  }

  return omitCompressUrlsFromSitemap(entries)
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
