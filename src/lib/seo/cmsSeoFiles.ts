import { readFile } from 'fs/promises'
import { join } from 'path'
import { CMS_API_BASE, CMS_SITE_DOMAIN } from '@/config/cms'
import { siteOriginFromEnv } from '@/lib/cms/html'

const CMS_FETCH_REVALIDATE_SEC = 3600

/** Reject SPA/HTML error pages mistaken for XML (same idea as Vite fetch-seo-static). */
export function looksLikeHtmlDocument(body: string): boolean {
  const head = body.slice(0, 500).trimStart()
  return /<!doctype html|<html[\s>]/i.test(head)
}

function cmsTenantSeoUrl(file: 'robots.txt' | 'sitemap.xml'): string {
  const base = CMS_API_BASE.replace(/\/+$/, '')
  const domain = encodeURIComponent(CMS_SITE_DOMAIN)
  return `${base}/${domain}/${file}`
}

async function readPublicRootFile(name: string): Promise<string | null> {
  try {
    const p = join(process.cwd(), 'public', name)
    const text = await readFile(p, 'utf8')
    const t = text.trim()
    return t.length > 0 ? text : null
  } catch {
    return null
  }
}

/**
 * Align every `<loc>` with `NEXT_PUBLIC_SITE_ORIGIN` (fixes Ahrefs “non-canonical page in sitemap”
 * when synced XML uses apex `https://compresspdf.my` but HTML canonical is `https://www.…`).
 */
export function normalizeSitemapXmlLocations(xml: string, preferredOrigin: string): string {
  const base = preferredOrigin.replace(/\/+$/, '')
  let apex: string
  try {
    apex = new URL(base.includes('://') ? base : `https://${base}`).hostname.replace(/^www\./i, '')
  } catch {
    return xml
  }
  const esc = apex.replace(/\./g, '\\.')
  return xml.replace(
    new RegExp(`<loc>\\s*(https?:\\/\\/(?:www\\.)?${esc}[^<]*)</loc>`, 'gi'),
    (_full, inner: string) => {
      try {
        const u = new URL(inner.trim())
        const out = new URL(`${u.pathname}${u.search}${u.hash}`, `${base}/`).href
        return `<loc>${out}</loc>`
      } catch {
        return _full as string
      }
    },
  )
}

/** Point `Sitemap:` lines at the preferred origin (same host as canonical). */
export function normalizeRobotsSitemapLines(body: string, preferredOrigin: string): string {
  const base = preferredOrigin.replace(/\/+$/, '')
  let apex: string
  try {
    apex = new URL(base.includes('://') ? base : `https://${base}`).hostname.replace(/^www\./i, '')
  } catch {
    return body
  }
  const esc = apex.replace(/\./g, '\\.')
  return body.replace(
    new RegExp(`^([Ss]itemap:\\s*)(https?:\\/\\/(?:www\\.)?${esc}\\S*)`, 'gim'),
    `$1${base}/sitemap.xml`,
  )
}

/** 1) `public/robots.txt` after CMS POST sync. 2) Laravel `{CMS}/{domain}/robots.txt`. 3) null. */
export async function resolveRobotsTxtBody(): Promise<string | null> {
  const pref = siteOriginFromEnv()
  const synced = await readPublicRootFile('robots.txt')
  if (synced) return normalizeRobotsSitemapLines(synced, pref)

  const url = cmsTenantSeoUrl('robots.txt')
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/plain,*/*' },
      next: { revalidate: CMS_FETCH_REVALIDATE_SEC },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim()) return null
    if (looksLikeHtmlDocument(text)) return null
    return normalizeRobotsSitemapLines(text, pref)
  } catch {
    return null
  }
}

/** 1) `public/sitemap.xml` after sync. 2) Laravel `{CMS}/{domain}/sitemap.xml`. 3) null. */
export async function resolveSitemapXmlBody(): Promise<string | null> {
  const pref = siteOriginFromEnv()
  const synced = await readPublicRootFile('sitemap.xml')
  if (synced) return normalizeSitemapXmlLocations(synced, pref)

  const url = cmsTenantSeoUrl('sitemap.xml')
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/xml,text/xml,*/*' },
      next: { revalidate: CMS_FETCH_REVALIDATE_SEC },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim()) return null
    if (looksLikeHtmlDocument(text)) return null
    return normalizeSitemapXmlLocations(text, pref)
  } catch {
    return null
  }
}

export function buildFallbackRobotsTxt(): string {
  const base = siteOriginFromEnv().replace(/\/+$/, '')
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
}
