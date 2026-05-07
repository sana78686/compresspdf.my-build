import { resolveCmsMediaUrlWithOrigin } from '@/utils/cmsAssetUrl'

/**
 * Blog card cover image (server component — no client JS for listing grids).
 * @param {{ src?: string, title?: string, siteOrigin: string }} props
 */
export default function BlogCardCover({ src, title, siteOrigin }) {
  const url = src ? resolveCmsMediaUrlWithOrigin(src, siteOrigin) : ''
  if (!url) {
    return <div className="cp-my-blog-card-image-placeholder" aria-hidden="true" />
  }
  return (
    <img
      src={url}
      alt={title ? `Cover image for ${title}` : 'Blog post'}
      className="cp-my-blog-card-image"
      width={640}
      height={400}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  )
}
