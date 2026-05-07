import { defaultLang, supportedLangs, langPrefix } from '../i18n/translations'
import { ucWords } from './ucWords'

/** Strip `/en`-style prefix; default locale (id) has no prefix. */
export function stripLocalePrefix(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/'
  for (const l of supportedLangs) {
    if (l === defaultLang) continue
    const prefix = `/${l}`
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      const rest = p === prefix ? '/' : p.slice(prefix.length) || '/'
      return { lang: l, rest }
    }
  }
  return { lang: defaultLang, rest: p }
}

function slugLabel(slug) {
  return slug ? ucWords(String(slug).replace(/-/g, ' ')) : ''
}

/**
 * @param {string} pathname
 * @param {(key: string) => string} t
 * @returns {{ label: string, to?: string }[] | null}
 */
export function buildCompressPdfBreadcrumbItems(pathname, t) {
  const { lang, rest } = stripLocalePrefix(pathname)
  const lp = langPrefix(lang)
  if (rest === '/') return null

  const home = { label: t('nav.home'), to: `${lp}/` }
  const join = (path) => `${lp}${path === '/' ? '' : path}`

  if (rest === '/blog') {
    return [home, { label: t('blog.listTitle') }]
  }
  if (rest.startsWith('/blog/')) {
    const slug = rest.slice('/blog/'.length).split('/')[0]
    return [
      home,
      { label: t('blog.listTitle'), to: join('/blog') },
      { label: slugLabel(slug) || t('blog.listTitle') },
    ]
  }
  if (rest.startsWith('/page/')) {
    const slug = rest.slice('/page/'.length).split('/')[0]
    return [home, { label: slugLabel(slug) || t('breadcrumb.page') }]
  }
  if (rest === '/contact') {
    return [home, { label: t('contact.title') }]
  }
  if (rest.startsWith('/legal/')) {
    const slug = rest.slice('/legal/'.length).split('/')[0]
    return [
      home,
      { label: t('breadcrumb.legal') },
      { label: slugLabel(slug) || t('breadcrumb.legal') },
    ]
  }

  const single = /^\/([^/]+)$/.exec(rest)
  if (single) {
    const seg = single[1]
    const known = new Set(['blog', 'contact'])
    if (!known.has(seg)) {
      return [home, { label: slugLabel(seg) }]
    }
  }

  return null
}
