import type { Metadata } from 'next'

/**
 * Default OG/Twitter image. Used when no per-page image is provided so social
 * shares always have a valid preview. Override via env (set in Plesk and rebuild):
 *   NEXT_PUBLIC_DEFAULT_OG_IMAGE=/og-default.png
 *   NEXT_PUBLIC_DEFAULT_OG_IMAGE_WIDTH=1200
 *   NEXT_PUBLIC_DEFAULT_OG_IMAGE_HEIGHT=630
 *
 * Drop the actual file at `compressedpdf-next/public/og-default.png` (or whichever
 * path you point at). 1200×630 PNG/JPEG/WebP is the recommended size.
 */
const DEFAULT_OG_IMAGE = String(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE || '/og-default.png')
const DEFAULT_OG_IMAGE_WIDTH = Number(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE_WIDTH || 1200)
const DEFAULT_OG_IMAGE_HEIGHT = Number(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE_HEIGHT || 630)

/** Open Graph + Twitter cards (use with `metadataBase` in root layout). */
export function socialMetadata(input: {
  title: string
  description: string
  /** Path on this site, e.g. `/blog` — resolved with `metadataBase`. */
  path: string
  /** e.g. `id_ID`, `en_US` */
  ogLocale?: string
  /**
   * Per-page image URL (absolute or `/path` on this site). When omitted we fall
   * back to the project default so every page has a valid social preview.
   * Pass `null` to opt out completely (no image emitted).
   */
  image?: string | null
  imageAlt?: string
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const { title, description, path, ogLocale, image, imageAlt } = input

  const resolvedImage = image === null ? null : image || DEFAULT_OG_IMAGE
  const ogImage = resolvedImage
    ? [
        {
          url: resolvedImage,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: imageAlt || title,
        },
      ]
    : undefined

  return {
    openGraph: {
      title,
      description,
      type: 'website',
      url: path,
      ...(ogLocale ? { locale: ogLocale } : {}),
      ...(ogImage ? { images: ogImage } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(resolvedImage ? { images: [resolvedImage] } : {}),
    },
  }
}
