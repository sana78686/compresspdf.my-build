import { CARD_ICON_EMOJI, LandingMediaIcon } from '@/components/compress/landingFoldRender'
import { absolutizeCmsHtml } from '@/utils/cmsAssetUrl'

/**
 * Below-the-fold landing content: CMS feature cards (Use Cards) + dynamic Sections.
 * Lazy-loaded and mounted after first paint to reduce TBT on mobile.
 */
export default function LandingBelowFold({ t, cards = [], howSection = null, sections = [] }) {
  const cardEmoji = (iconKey) => CARD_ICON_EMOJI[iconKey] ?? '✨'

  return (
    <>
      {cards.length > 0 && (
        <section className="cp-my-landing-section cp-my-landing-features" aria-labelledby="landing-features-heading">
          <h2 id="landing-features-heading" className="cp-my-landing-section-title">{t('landing.featuresTitle')}</h2>
          <div className="cp-my-landing-cards">
            {cards.map((card) => (
              <div key={card.id} className="cp-my-landing-card">
                <span className="cp-my-landing-card-icon" aria-hidden="true">{cardEmoji(card.icon)}</span>
                <h3 className="cp-my-landing-card-title">{card.title}</h3>
                <p className="cp-my-landing-card-desc">{card.description || ''}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.map((sec) => {
        const items = Array.isArray(sec.items) ? sec.items : []
        if (!items.length) return null
        const sectionId = `cms-section-${sec.id}`
        return (
          <section key={sec.id} className="cp-my-landing-section cp-my-landing-how" aria-labelledby={sectionId}>
            <h2 id={sectionId} className="cp-my-landing-section-title">{sec.title || ''}</h2>
            {sec.description && <p className="cp-my-landing-section-subtitle">{sec.description}</p>}
            <div className="cp-my-landing-steps">
              {items.map((item, idx) => {
                const stepHeadingId = `landing-step-${sec.id}-${item.id ?? idx}-heading`
                return (
                  <div key={item.id ?? idx} className="cp-my-landing-step">
                    <LandingMediaIcon item={item} idx={idx} stepHeadingId={stepHeadingId} />
                    <h3 id={stepHeadingId} className="cp-my-landing-step-title">{item.title || ''}</h3>
                    <div
                      className="cp-my-landing-step-desc"
                      dangerouslySetInnerHTML={{
                        __html: absolutizeCmsHtml(String(item.body || item.description || '')),
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

    </>
  )
}
