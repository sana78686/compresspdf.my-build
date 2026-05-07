import { defaultLang, supportedLangs, langPrefix } from '../i18n/translations'

/**
 * Build hreflang link descriptors for a CMS page or blog (same slug across locales).
 * Default locale uses no prefix; non-default locales use /{lang}/...
 */
export function buildHreflangAlternates(slug, alternateLocales, kind, origin) {
  const locs = Array.isArray(alternateLocales) ? [...new Set(alternateLocales)] : []
  if (locs.length === 0) return []

  const segment = kind === 'blog' ? 'blog' : 'page'
  const enc = encodeURIComponent(slug)
  const base = `${origin.replace(/\/$/, '')}`

  const out = []
  for (const loc of locs) {
    if (!supportedLangs.includes(loc)) continue
    out.push({ hreflang: loc, href: `${base}${langPrefix(loc)}/${segment}/${enc}` })
  }

  const order = [defaultLang, ...supportedLangs.filter((l) => l !== defaultLang)]
  const defaultPick = order.find((l) => locs.includes(l)) ?? locs[0]
  out.push({ hreflang: 'x-default', href: `${base}${langPrefix(defaultPick)}/${segment}/${enc}` })

  return out
}
