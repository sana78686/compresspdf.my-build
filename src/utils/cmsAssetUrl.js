import { CMS_API_BASE, CMS_SITE_DOMAIN, normalizeSiteDomain } from '../config/cms'

/** Dev / emergency: use CMS API media proxy (URLs contain the CMS host). */
const USE_LEGACY_CMS_MEDIA_PROXY = process.env.NEXT_PUBLIC_USE_CMS_MEDIA_PROXY === 'true'

function apiHostname() {
  try {
    return new URL(CMS_API_BASE).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** Match cms.js: tenant domain segment for /{domain}/api/public/... */
function resolveSiteDomainForMedia() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = normalizeSiteDomain(window.location.hostname)
    if (h === 'localhost' || h === '127.0.0.1') {
      return normalizeSiteDomain(CMS_SITE_DOMAIN)
    }
    return h
  }
  return normalizeSiteDomain(CMS_SITE_DOMAIN)
}

function encodePathSegments(rel) {
  return String(rel || '')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join('/')
}

/**
 * Legacy: public API URL that streams files from CMS (no friendly domain).
 * @param {string} storageRelativePath - e.g. uploads/editor/file.png
 */
export function publicMediaProxyUrl(storageRelativePath) {
  const rel = String(storageRelativePath || '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!rel) return ''
  const site = resolveSiteDomainForMedia()
  const base = String(CMS_API_BASE).replace(/\/$/, '')
  return `${base}/${site}/api/public/media?path=${encodeURIComponent(rel)}`
}

function storageRelativePathFromUrl(urlString) {
  const s = String(urlString || '').trim()
  if (!s) return null
  if (s.startsWith('/storage/')) {
    return s.replace(/^\/storage\//, '').replace(/^\/+/, '')
  }
  try {
    const u = new URL(s)
    const host = u.hostname.toLowerCase()
    if (host !== apiHostname()) return null
    const p = u.pathname || ''
    if (!p.startsWith('/storage/')) return null
    return p.replace(/^\/storage\//, '').replace(/^\/+/, '')
  } catch {
    return null
  }
}

/**
 * Image URL for SSR or explicit site origin (e.g. from NEXT_PUBLIC_SITE_ORIGIN).
 * Same rules as {@link resolveCmsMediaUrl} in the browser.
 * @param {string} url
 * @param {string} [origin] - e.g. https://compresspdf.my (no trailing slash)
 */
export function resolveCmsMediaUrlWithOrigin(url, origin) {
  if (url == null || url === '') return ''
  const s = String(url).trim()
  const o = origin === undefined || origin === null ? '' : String(origin).trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(s) || s.startsWith('//')) {
    try {
      const u = new URL(s.startsWith('//') ? `https:${s}` : s)
      if (o && u.origin === new URL(o).origin) {
        if (u.pathname.startsWith('/uploads/') || u.pathname.startsWith('/cms-uploads/')) {
          return publicMediaProxyUrl(u.pathname.replace(/^\/+/, ''))
        }
        return u.pathname + (u.search || '')
      }
    } catch {
      /* continue */
    }

    const rel = storageRelativePathFromUrl(s)
    if (rel) {
      if (USE_LEGACY_CMS_MEDIA_PROXY) {
        return publicMediaProxyUrl(rel)
      }
      if (o) {
        return `${o}/${encodePathSegments(rel)}`
      }
      return publicMediaProxyUrl(rel)
    }
    try {
      const u = new URL(s.startsWith('//') ? `https:${s}` : s)
      if (u.pathname.startsWith('/cms-uploads/')) {
        const relCms = u.pathname.replace(/^\/+/, '')
        return publicMediaProxyUrl(relCms)
      }
    } catch {
      /* keep raw URL */
    }
    return s
  }

  const path = s.startsWith('/') ? s : `/${s}`
  if (path.startsWith('/uploads/')) {
    return publicMediaProxyUrl(path.replace(/^\/+/, ''))
  }
  if (path.startsWith('/cms-uploads/')) {
    const relCms = path.replace(/^\/+/, '')
    return publicMediaProxyUrl(relCms)
  }
  if (path.startsWith('/storage/')) {
    const inner = path.replace(/^\/storage\//, '').replace(/^\/+/, '')
    if (USE_LEGACY_CMS_MEDIA_PROXY) {
      return publicMediaProxyUrl(inner)
    }
    return o ? `${o}/${encodePathSegments(inner)}` : publicMediaProxyUrl(inner)
  }
  if (path.startsWith('/media/')) {
    const base = String(CMS_API_BASE).replace(/\/$/, '')
    return `${base}${path}`
  }
  if (path.startsWith('/')) {
    return o ? `${o}${path}` : path
  }
  return path
}

/**
 * Image URL for the live React site: same origin /uploads/... (nginx proxies to CMS /storage).
 * CMS + API return https://{frontend}/uploads/editor/... when Domain.frontend_url is set.
 */
export function resolveCmsMediaUrl(url) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
  return resolveCmsMediaUrlWithOrigin(url, origin)
}

/**
 * Fix rich-text HTML: storage URLs → same-origin /uploads/...
 */
export function absolutizeCmsHtml(html) {
  if (!html || typeof html !== 'string') return html
  return html.replace(
    /\b(src|href)=(["'])((?:https?:\/\/[^"']+)?\/(?:storage|uploads|media|cms-uploads)\/[^"']+)\2/gi,
    (_, attr, q, urlPart) => {
      const resolved = resolveCmsMediaUrl(urlPart)
      return `${attr}=${q}${resolved}${q}`
    },
  )
}
