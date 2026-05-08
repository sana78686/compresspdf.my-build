type BrandLogoProps = {
  href: string
  ariaLabel: string
  /** Image logos include the wordmark; kept for API compatibility only */
  text?: string
  variant?: 'header' | 'footer'
}

const HEADER_SRC = '/compresspdf.my-logo.png'
const FOOTER_SRC = '/compresspdf.my-logo-white.png'

/**
 * Site wordmark from branded PNGs (plain `<img>` — same URL as your files, no AVIF/WebP optimization).
 */
export default function BrandLogo({ href, ariaLabel, variant = 'header' }: BrandLogoProps) {
  const src = variant === 'footer' ? FOOTER_SRC : HEADER_SRC

  return (
    <a href={href} className="cp-my-logo cp-my-logo--image cp-my-logo--brand" dir="ltr" aria-label={ariaLabel}>
      {/* eslint-disable-next-line @next/next/no-img-element -- intentional: serve PNG as authored */}
      <img src={src} alt="" className="cp-my-logo-img" width={320} height={72} decoding="async" fetchPriority={variant === 'header' ? 'high' : 'auto'} />
    </a>
  )
}
