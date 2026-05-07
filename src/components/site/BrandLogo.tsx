import Image from 'next/image'

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
 * Site wordmark from branded PNGs (header full-color, footer white).
 */
export default function BrandLogo({ href, ariaLabel, variant = 'header' }: BrandLogoProps) {
  const src = variant === 'footer' ? FOOTER_SRC : HEADER_SRC

  return (
    <a href={href} className="cp-my-logo cp-my-logo--image cp-my-logo--brand" dir="ltr" aria-label={ariaLabel}>
      <Image
        src={src}
        alt=""
        width={320}
        height={72}
        className="cp-my-logo-img"
        priority={variant === 'header'}
        sizes="(max-width: 480px) 200px, 280px"
      />
    </a>
  )
}
