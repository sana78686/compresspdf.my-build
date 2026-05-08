/** Icon key → emoji for CMS-driven cards (shared server + client). */
export const CARD_ICON_EMOJI: Record<string, string> = {
  lightning: '⚡',
  quality: '🎚️',
  lock: '🔒',
  star: '✨',
  document: '📄',
  shield: '🛡️',
  heart: '❤️',
  cloud: '☁️',
  download: '⬇️',
  upload: '⬆️',
  check: '✅',
  image: '🖼️',
  'file-plus': '📎',
  layers: '📑',
  sparkle: '✨',
  zap: '⚡',
  settings: '⚙️',
  globe: '🌐',
  mobile: '📱',
  clock: '⏱️',
}

type MediaItem = {
  media_type?: string
  media_value?: string
  id?: number
  title?: string
  description?: string
  body?: string
}

export function LandingMediaIcon({
  item,
  idx,
  stepHeadingId,
}: {
  item: MediaItem
  idx: number
  /** When set with a non-empty step title, image is named by the heading (avoids duplicate SR text). */
  stepHeadingId?: string
}) {
  const type = String(item.media_type || '').toLowerCase()
  const val = String(item.media_value || '').trim()
  const title = String(item.title || '').trim()
  const desc = String(item.body || item.description || '').trim()
  if (type === 'number' || type === 'numbered') {
    return <span className="cp-my-landing-step-num" aria-hidden="true">{val || idx + 1}</span>
  }
  if (type === 'fa-icon' && val) {
    return <i className={val} aria-hidden="true" />
  }
  if (type === 'icon' && val && CARD_ICON_EMOJI[val]) {
    return <span className="cp-my-landing-card-icon" aria-hidden="true">{CARD_ICON_EMOJI[val]}</span>
  }
  if (type === 'image' && val) {
    const useLabelledBy = Boolean(stepHeadingId && title)
    const alt = useLabelledBy ? '' : title || desc.slice(0, 120) || `Step ${idx + 1} illustration`
    return (
      <img
        src={val}
        alt={alt}
        {...(useLabelledBy ? { 'aria-labelledby': stepHeadingId } : {})}
        width={800}
        height={500}
        className="cp-my-landing-step-img"
        loading="lazy"
        decoding="async"
      />
    )
  }
  return <span className="cp-my-landing-step-num" aria-hidden="true">{idx + 1}</span>
}
