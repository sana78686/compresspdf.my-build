import type { Metadata } from 'next'
import { getHomePageContent } from '@/lib/cms/server'
import { siteOriginFromEnv } from '@/lib/cms/html'
import { resolveCmsMediaUrlWithOrigin } from '@/utils/cmsAssetUrl'

const DEFAULT_OG_IMAGE = String(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE || '/og-default.png')
const DEFAULT_OG_IMAGE_WIDTH = Number(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE_WIDTH || 1200)
const DEFAULT_OG_IMAGE_HEIGHT = Number(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE_HEIGHT || 630)

export type CmsMetaInput = {
  title?: string
  description?: string
  keywords?: string
  og_image?: string
  image?: string
}

type HomeMetaShape = {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
  image?: string
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Bare hostname fallback for `<title>` when neither page nor home CMS provides one. */
function siteDomainPlain(): string {
  const explicit = String(process.env.NEXT_PUBLIC_SITE_ORIGIN || '').trim()
  if (explicit) {
    try {
      return new URL(explicit).hostname
    } catch {
      /* fall through */
    }
  }
  return String(process.env.NEXT_PUBLIC_SITE_DOMAIN || 'compresspdf.my')
    .trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
}

/** Pull meta_title / meta_description / meta_keywords (and OG image) from /home-content. */
export async function fetchHomeMeta(locale: string): Promise<CmsMetaInput> {
  try {
    const res = (await getHomePageContent(locale, '/')) as HomeMetaShape
    return {
      title: res.meta_title,
      description: res.meta_description,
      keywords: res.meta_keywords,
      og_image: res.og_image,
      image: res.image,
    }
  } catch {
    return {}
  }
}

/**
 * Build a Next.js Metadata object from CMS data with fallback to the home page CMS meta.
 * Title precedence: pageMeta.title → home CMS meta_title → site domain.
 * Description precedence: pageMeta.description → home CMS meta_description → fallbackDescription.
 * Keywords tag is omitted entirely if neither pageMeta nor home provides it.
 */
export async function buildCmsMetadata(opts: {
  locale: string
  /** Path on this site (used for canonical + og:url). */
  path: string
  /** e.g. id_ID, en_US. */
  ogLocale?: string
  /** website (default) or article. */
  ogType?: 'website' | 'article'
  /** Page-specific CMS meta (preferred over home). */
  pageMeta?: CmsMetaInput
  /** Optional last-resort title (ignored — kept for backward compat; site domain is used instead). */
  fallbackTitle?: string
  /** Last-resort description when neither page nor home CMS sets one. */
  fallbackDescription: string
  /** Pass home meta if already loaded to skip a redundant fetch. */
  homeMeta?: CmsMetaInput
}): Promise<Metadata> {
  const {
    locale,
    path,
    ogLocale,
    ogType = 'website',
    pageMeta,
    fallbackDescription,
    homeMeta,
  } = opts

  const home = homeMeta ?? (await fetchHomeMeta(locale))

  const title = s(pageMeta?.title) || s(home.title) || siteDomainPlain()
  const description =
    s(pageMeta?.description) || s(home.description) || fallbackDescription
  const keywords = s(pageMeta?.keywords) || s(home.keywords) || ''

  const origin = siteOriginFromEnv()
  const rawImg =
    s(pageMeta?.og_image) || s(pageMeta?.image) || s(home.og_image) || s(home.image)
  const ogImageUrl = rawImg ? resolveCmsMediaUrlWithOrigin(rawImg, origin) : DEFAULT_OG_IMAGE

  const ogImageEntry: { url: string; width?: number; height?: number; alt: string } = {
    url: ogImageUrl,
    alt: title,
  }
  if (!rawImg) {
    ogImageEntry.width = DEFAULT_OG_IMAGE_WIDTH
    ogImageEntry.height = DEFAULT_OG_IMAGE_HEIGHT
  }

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: ogType,
      url: path,
      ...(ogLocale ? { locale: ogLocale } : {}),
      images: [ogImageEntry],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}
