import { CMS_API_BASE, normalizeSiteDomain, CMS_SITE_DOMAIN } from '@/config/cms'

const useDomainInApiPath = process.env.NEXT_PUBLIC_CMS_API_DOMAIN_PATH !== 'false'

function withLocaleQuery(path: string, locale?: string, publicPath?: string) {
  const parts: string[] = []
  if (locale) parts.push(`locale=${encodeURIComponent(locale)}`)
  if (publicPath) parts.push(`public_path=${encodeURIComponent(publicPath)}`)
  if (parts.length === 0) return path
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}${parts.join('&')}`
}

/**
 * Site domain for the CMS API. Resolved from `NEXT_PUBLIC_SITE_DOMAIN` (or the
 * static fallback in `@/config/cms`).
 *
 * **Important** — this used to call `headers()` from `next/headers` for
 * multi-tenant host detection, but doing so made every page that imports CMS
 * helpers render as `ƒ` (dynamic) and get a `Cache-Control: no-store`
 * response. That single header silently breaks back/forward cache and shows
 * up in Lighthouse as the "BFCache prevented" audit. Keeping this function
 * pure + sync lets the home/blog/legal/CMS pages render statically with ISR
 * (revalidate: 60) and become BFCache-eligible.
 *
 * If you ever genuinely need per-request multi-tenant routing, do the host
 * resolution inside a Route Handler or middleware, not here.
 */
export function getSiteDomainForRequest(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_DOMAIN
  if (fromEnv) return normalizeSiteDomain(fromEnv)
  return CMS_SITE_DOMAIN
}

async function fetchPublicJsonUncached(
  path: string,
  locale: string | undefined,
  host: string,
  publicPath?: string,
): Promise<unknown> {
  const rel = withLocaleQuery(path, locale, publicPath)
  const attempts: { root: string; headers: Record<string, string> }[] = []
  if (useDomainInApiPath) {
    attempts.push({
      root: `/${host}/api/public`,
      headers: { Accept: 'application/json' },
    })
    attempts.push({
      root: '/api/public',
      headers: { Accept: 'application/json', 'X-Domain': host },
    })
  } else {
    attempts.push({
      root: '/api/public',
      headers: { Accept: 'application/json', 'X-Domain': host },
    })
  }

  for (let i = 0; i < attempts.length; i += 1) {
    const { root, headers: h } = attempts[i]
    const url = `${CMS_API_BASE}${root}${rel}`
    const res = await fetch(url, { headers: h, next: { revalidate: 60 } })
    if (res.ok) return res.json()
    const retry =
      useDomainInApiPath &&
      i === 0 &&
      attempts.length > 1 &&
      (res.status === 404 || res.status === 403)
    if (retry) continue
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { message?: string }).message || `HTTP ${res.status}`)
  }
  throw new Error('Public API request failed')
}

export async function getHomePageContent(locale: string, publicPath: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/home-content', locale, host, publicPath) as Promise<{
    content?: string
    json_ld?: { '@graph'?: unknown[] }
  }>
}

export async function getBlogBySlug(slug: string, locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached(
    `/blogs/${encodeURIComponent(slug)}`,
    locale,
    host,
  ) as Promise<Record<string, unknown>>
}

export async function getBlogs(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/blogs', locale, host) as Promise<{
    blogs?: unknown[]
    json_ld?: unknown
    data?: unknown[]
  }>
}

export async function getPageBySlug(slug: string, locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached(`/pages/${encodeURIComponent(slug)}`, locale, host) as Promise<
    Record<string, unknown>
  >
}

export async function getLegalPage(slug: string, locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached(`/legal/${encodeURIComponent(slug)}`, locale, host) as Promise<
    Record<string, unknown>
  >
}

export async function getContactSettings(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/contact', locale, host) as Promise<Record<string, unknown>>
}

export async function getPages(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/pages', locale, host) as Promise<{ pages?: { id: number; title: string; slug: string; placement?: string }[] }>
}

export async function getLegalNav(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/legal-nav', locale, host) as Promise<{ legal?: Record<string, boolean> }>
}

export async function getFaq(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/faq', locale, host) as Promise<{ faq?: { question?: string; answer?: string }[] }>
}

export async function getHomeCards(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/home-cards', locale, host) as Promise<{
    cards?: unknown[]
    section?: { title?: string; description?: string }
  }>
}

export async function getSections(locale: string) {
  const host = getSiteDomainForRequest()
  return fetchPublicJsonUncached('/sections', locale, host) as Promise<{ sections?: unknown[] }>
}
