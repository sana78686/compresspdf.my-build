import { langToCountryCode, langFlagAlt } from '@/i18n/langMeta'

type LangFlagProps = {
  lang: string
  width?: number
  className?: string
}

/**
 * Renders a small flag image (reliable on Windows vs emoji flags).
 */
export default function LangFlag({ lang, width = 22, className = '' }: LangFlagProps) {
  const code = langToCountryCode[lang as keyof typeof langToCountryCode] || 'un'
  const h = Math.round((width * 15) / 20)
  const src = `https://flagcdn.com/w40/${code}.png`
  const alt =
    langFlagAlt[lang as keyof typeof langFlagAlt] ||
    (code === 'un' ? 'Language' : `Flag (${code})`)

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={h}
      className={`cp-my-lang-flag-img ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  )
}
