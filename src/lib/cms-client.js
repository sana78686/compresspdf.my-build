import { CMS_API_BASE, CMS_SITE_DOMAIN, normalizeSiteDomain } from '../config/cms.js'

/**
 * false = always use /api/public/* + X-Domain (recommended on many nginx/Plesk setups).
 * true (default) = try /{domain}/api/public/* first, then fall back to legacy on 404/403
 * (some servers treat the first segment like `compresspdf.my` as a static file and never hit Laravel).
 */
const useDomainInApiPath = process.env.NEXT_PUBLIC_CMS_API_DOMAIN_PATH !== 'false'

/** Client-side cache TTL for public GET (ms). Same-tab revisits + navigations feel instant. */
const CMS_CACHE_TTL_MS = Math.max(
  0,
  Number.parseInt(String(process.env.NEXT_PUBLIC_CMS_CACHE_MS ?? '60000'), 10) || 60000,
)

/** Persist GET responses in sessionStorage (survives full reload in the same tab). */
const CMS_SESSION_CACHE =
  String(process.env.NEXT_PUBLIC_CMS_SESSION_CACHE ?? 'true').toLowerCase() !== 'false'

const STORAGE_PREFIX = 'cms:v1:'
const REVISION_STORAGE_KEY = 'cms:content-revision:v1'

/** @type {Map<string, { expires: number, data: unknown }>} */
const memoryCache = new Map()
/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map()

/** Current site host for public API path (browser) or env fallback (SSR/build tools). */
function resolveSiteDomainForApi() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = normalizeSiteDomain(window.location.hostname)
    if (h === 'localhost' || h === '127.0.0.1') {
      return CMS_SITE_DOMAIN
    }
    return h
  }
  return CMS_SITE_DOMAIN
}

function withLocaleQuery(path, locale, publicPath) {
  const parts = []
  if (locale) parts.push(`locale=${encodeURIComponent(locale)}`)
  if (publicPath) parts.push(`public_path=${encodeURIComponent(publicPath)}`)
  if (parts.length === 0) return path
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}${parts.join('&')}`
}

function cacheKey(host, path, locale, publicPath) {
  return `${host}|${withLocaleQuery(path, locale, publicPath)}`
}

function cloneJson(data) {
  if (data === null || typeof data !== 'object') return data
  return JSON.parse(JSON.stringify(data))
}

function readSessionCache(key) {
  if (!CMS_SESSION_CACHE || typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.expires !== 'number' || parsed.expires <= Date.now()) {
      sessionStorage.removeItem(STORAGE_PREFIX + key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function writeSessionCache(key, data, expiresAt) {
  if (!CMS_SESSION_CACHE || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ expires: expiresAt, data }),
    )
  } catch {
    // Quota exceeded — ignore
  }
}

/**
 * Drop all cached CMS GET responses (memory + session). Useful after publishing in CMS.
 */
export function clearCmsApiCache() {
  memoryCache.clear()
  inflight.clear()
  if (typeof sessionStorage === 'undefined') return
  try {
    const keys = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} path - e.g. `/legal/terms`
 * @param {Record<string, unknown>} options
 */
async function request(path, options = {}) {
  const { locale, publicPath, ...fetchOptions } = options
  const method = String(fetchOptions.method || 'GET').toUpperCase()
  const host = resolveSiteDomainForApi()

  if (method !== 'GET') {
    return uncachedRequest(path, { locale, publicPath, ...fetchOptions }, host)
  }

  const key = cacheKey(host, path, locale, publicPath)
  const now = Date.now()

  const mem = memoryCache.get(key)
  if (mem && mem.expires > now) {
    return cloneJson(mem.data)
  }

  const sessionHit = readSessionCache(key)
  if (sessionHit !== null) {
    memoryCache.set(key, { data: cloneJson(sessionHit), expires: now + CMS_CACHE_TTL_MS })
    return cloneJson(sessionHit)
  }

  const existing = inflight.get(key)
  if (existing) {
    return cloneJson(await existing)
  }

  const p = uncachedRequest(path, { locale, publicPath, ...fetchOptions }, host)
    .then((data) => {
      if (data != null && typeof data === 'object' && data._seo_redirect) {
        return cloneJson(data)
      }
      const exp = Date.now() + CMS_CACHE_TTL_MS
      const copy = cloneJson(data)
      memoryCache.set(key, { data: copy, expires: exp })
      writeSessionCache(key, copy, exp)
      return copy
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, p)
  return await p
}

/**
 * GET only — skips in-app cache (used for content-revision + build-time fetches).
 * @param {string} path
 * @param {string | undefined} locale
 * @param {string} host
 */
async function fetchPublicJsonUncached(path, locale, host, publicPath) {
  /** @type {{ root: string, headers: Record<string, string> }[]} */
  const attempts = []
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
    const { root, headers } = attempts[i]
    const url = `${CMS_API_BASE}${root}${withLocaleQuery(path, locale, publicPath)}`
    const res = await fetch(url, { headers })
    if (res.ok) {
      return res.json()
    }
    const retry =
      useDomainInApiPath &&
      i === 0 &&
      attempts.length > 1 &&
      (res.status === 404 || res.status === 403)
    if (retry) {
      continue
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
  throw new Error('Public API request failed')
}

function primeCmsPrefetchBundle(bundle) {
  const host = resolveSiteDomainForApi()
  const exp = Date.now() + CMS_CACHE_TTL_MS
  const locales = bundle.locales
  if (!locales || typeof locales !== 'object') return
  for (const locale of Object.keys(locales)) {
    const entries = locales[locale]
    if (!entries || typeof entries !== 'object') continue
    for (const apiPath of Object.keys(entries)) {
      if (!apiPath.startsWith('/')) continue
      const key = cacheKey(host, apiPath, locale, undefined)
      const copy = cloneJson(entries[apiPath])
      memoryCache.set(key, { data: copy, expires: exp })
      writeSessionCache(key, copy, exp)
    }
  }
}

/**
 * Before first paint: compare CMS content-revision to last visit; if newer, drop caches.
 * If `dist/cms-prefetch.json` exists and its revision matches, hydrate memory/session cache (no API round-trips).
 *
 * The JSON is produced at `vite build` (cmsPrefetchPlugin): per locale it contains API paths as keys
 * (e.g. `/home-content`, `/legal/privacy-policy`, optionally `/pages/{slug}`, `/blogs/{slug}`) — anything
 * the build included is primed here so `request()` hits memory/sessionStorage first.
 */
export async function prepareCmsClient() {
  if (typeof window === 'undefined') return
  try {
    const host = resolveSiteDomainForApi()
    const remote = await fetchPublicJsonUncached('/content-revision', undefined, host)
    const rev = Number(remote?.revision ?? 0)
    let stored = 0
    try {
      stored = Number.parseInt(window.localStorage.getItem(REVISION_STORAGE_KEY) || '0', 10) || 0
    } catch {
      /* ignore */
    }

    if (rev > stored) {
      clearCmsApiCache()
    }

    try {
      const base = String(process.env.NEXT_PUBLIC_BASE_PATH || '/')
      const originBase = base.endsWith('/') ? base : `${base}/`
      const prefetchHref = new URL('cms-prefetch.json', window.location.origin + originBase).href
      const res = await fetch(prefetchHref, { cache: 'no-cache' })
      if (res.ok) {
        const bundle = await res.json()
        const bundleRev = Number(bundle?.revision ?? 0)
        if (bundleRev === rev && bundle?.locales && typeof bundle.locales === 'object') {
          primeCmsPrefetchBundle(bundle)
        }
      }
    } catch {
      /* no prefetch file */
    }

    try {
      window.localStorage.setItem(REVISION_STORAGE_KEY, String(rev))
    } catch {
      /* quota */
    }
  } catch {
    /* offline / API error — keep existing cache */
  }
}

const REVISION_POLL_MS = 60_000
let _revisionPollTimer = null

/**
 * Poll /content-revision periodically; flush client cache when CMS publishes new content.
 * Runs every 60s while the tab is visible, pauses when hidden.
 */
export function startRevisionPolling() {
  if (typeof window === 'undefined' || _revisionPollTimer) return
  const poll = async () => {
    try {
      const host = resolveSiteDomainForApi()
      const remote = await fetchPublicJsonUncached('/content-revision', undefined, host)
      const rev = Number(remote?.revision ?? 0)
      let stored = 0
      try {
        stored = Number.parseInt(window.localStorage.getItem(REVISION_STORAGE_KEY) || '0', 10) || 0
      } catch { /* ignore */ }
      if (rev > stored) {
        clearCmsApiCache()
        try { window.localStorage.setItem(REVISION_STORAGE_KEY, String(rev)) } catch { /* quota */ }
      }
    } catch { /* offline */ }
  }
  _revisionPollTimer = setInterval(poll, REVISION_POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(_revisionPollTimer)
      _revisionPollTimer = null
    } else {
      poll()
      _revisionPollTimer = setInterval(poll, REVISION_POLL_MS)
    }
  })
}

async function uncachedRequest(path, options, host) {
  const { locale, publicPath, ...fetchOptions } = options
  const method = String(fetchOptions.method || 'GET').toUpperCase()

  if (method === 'GET') {
    return fetchPublicJsonUncached(path, locale, host, publicPath)
  }

  /** @type {{ root: string, headers: Record<string, string> }[]} */
  const attempts = []
  if (useDomainInApiPath) {
    attempts.push({
      root: `/${host}/api/public`,
      headers: { Accept: 'application/json', ...(fetchOptions.headers || {}) },
    })
    attempts.push({
      root: '/api/public',
      headers: {
        Accept: 'application/json',
        'X-Domain': host,
        ...(fetchOptions.headers || {}),
      },
    })
  } else {
    attempts.push({
      root: '/api/public',
      headers: {
        Accept: 'application/json',
        'X-Domain': host,
        ...(fetchOptions.headers || {}),
      },
    })
  }

  for (let i = 0; i < attempts.length; i += 1) {
    const { root, headers } = attempts[i]
    const url = `${CMS_API_BASE}${root}${withLocaleQuery(path, locale, publicPath)}`
    const res = await fetch(url, { ...fetchOptions, headers })
    if (res.ok) {
      return res.json()
    }
    const retry =
      useDomainInApiPath &&
      i === 0 &&
      attempts.length > 1 &&
      (res.status === 404 || res.status === 403)
    if (retry) {
      continue
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
  throw new Error('Public API request failed')
}

/** @param {string} [locale] - BCP-style code: id, en */
export function getPages(locale) {
  return request('/pages', { locale })
}

/** @param {string} slug @param {string} [locale] */
export function getPageBySlug(slug, locale) {
  return request(`/pages/${encodeURIComponent(slug)}`, { locale })
}

/**
 * Normalize API response to a blogs array. Handles { blogs }, { data }, Laravel pagination, or direct array.
 * @param {unknown} res - Raw API response
 * @returns {Array<{ id: number, title: string, slug: string, [key: string]: unknown }>}
 */
function normalizeBlogsResponse(res) {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    const raw =
      Array.isArray(res.blogs) ? res.blogs
      : Array.isArray(res.data) ? res.data
      : Array.isArray(res.posts) ? res.posts
      : Array.isArray(res.items) ? res.items
      : res.data && Array.isArray(res.data.data) ? res.data.data
      : []
    return raw
  }
  return []
}

/**
 * @param {string} [locale]
 * @returns {Promise<{ blogs: Array<{ id: number, title: string, slug: string, excerpt?: string, published_at?: string, og_image?: string, image?: string }> }>}
 */
export function getBlogs(locale) {
  return request('/blogs', { locale }).then((res) => ({
    blogs: normalizeBlogsResponse(res),
    json_ld: res && typeof res === 'object' && 'json_ld' in res ? res.json_ld : null,
  }))
}

/** @param {string} slug @param {string} [locale] */
export function getBlogBySlug(slug, locale) {
  return request(`/blogs/${encodeURIComponent(slug)}`, { locale })
}

/**
 * @param {string} [locale]
 * @returns {Promise<{ contact_email?: string, contact_phone?: string, contact_address?: string }>}
 */
export function getContactSettings(locale) {
  return request('/contact', { locale })
}

/**
 * Submit contact form. Email is sent to the address set in CMS Content Manager.
 * @param {{ name: string, email: string, subject: string, message: string, accepts_terms: boolean }} data
 * @param {string} [locale]
 */
export function submitContactForm(data, locale) {
  return request('/contact/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    locale,
  })
}

/** @param {string} [locale] */
export function getFaq(locale) {
  return request('/faq', { locale })
}

/** @param {string} [locale] */
export function getHomeCards(locale) {
  return request('/home-cards', { locale })
}

/** @param {string} [locale] */
export function getSections(locale) {
  return request('/sections', { locale })
}

/**
 * @param {string} [locale]
 * @param {string} [publicPath] - e.g. window.location.pathname for CMS SEO/tools schema resolution
 */
export function getHomePageContent(locale, publicPath) {
  return request('/home-content', { locale, publicPath })
}

/** JSON-LD for PDF tool route (WebApplication + FAQ + breadcrumb). Tenant comes from API host + X-Domain. */
export function getToolSchemaJsonLd(locale, publicPath) {
  return request('/schema/tool', { locale, publicPath })
}

/** @param {string} [locale] @param {string} [publicPath] */
export function getHomeSeo(locale, publicPath) {
  return request('/home-content', { locale, publicPath })
}

/**
 * Legal/content page by slug: terms, privacy-policy, disclaimer, about-us, cookie-policy.
 * @param {string} slug
 * @param {string} [locale]
 */
export function getLegalPage(slug, locale) {
  return request(`/legal/${encodeURIComponent(slug)}`, { locale })
}

/** @param {string} [locale] @returns {Promise<{ legal: Record<string, boolean> }>} */
export function getLegalNav(locale) {
  return request('/legal-nav', { locale })
}

/**
 * Locales that have at least one visible CMS page or published blog (for scoping the public language switcher).
 * @param {string} [locale] - optional; included for cache key consistency
 * @returns {Promise<{ locales: string[] }>}
 */
export function getContentLocales(locale) {
  return request('/content-locales', { locale })
}
