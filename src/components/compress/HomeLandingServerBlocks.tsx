import Link from 'next/link'
import { getTranslation, langPrefix } from '@/i18n/translations'
import type { BlogPostPreview } from '@/lib/cms/normalizeBlogs'
import { absolutizeCmsHtmlServer } from '@/lib/cms/html'
import { LandingMediaIcon, CARD_ICON_EMOJI } from '@/components/compress/landingFoldRender'
import BlogCardCover from '@/components/blog/BlogCardCover'

type Lang = 'ms' | 'en'

type Card = { id: number; title: string; description?: string; icon?: string }

type SectionItem = { id?: number; title?: string; description?: string; body?: string; media_type?: string; media_value?: string }

type Section = { id: number; title?: string; description?: string; items?: SectionItem[] }

type HowSection = { title?: string; description?: string } | null

const LANDING_BLOG_PREVIEW_MAX = 4

function t(lang: Lang, key: string): string {
  const v = getTranslation(lang, key)
  return typeof v === 'string' ? v : key
}

function formatBlogDate(iso: string, lang: Lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-US', {
      dateStyle: 'medium',
    })
  } catch {
    return iso
  }
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function faqItemHasContent(q: unknown, a: unknown) {
  const qs = stripHtml(String(q ?? ''))
  const as = stripHtml(String(a ?? ''))
  return qs.length > 0 || as.length > 0
}

type Props = {
  lang: Lang
  siteOrigin: string
  cards: Card[]
  sections: Section[]
  howSection: HowSection
  blogs: BlogPostPreview[]
  faqRaw: { question?: string; answer?: string }[]
}

/** Home landing blocks rendered on the server so CMS copy is in View Source (not only after JS). */
export default function HomeLandingServerBlocks({
  lang,
  siteOrigin,
  cards,
  sections,
  howSection,
  blogs,
  faqRaw,
}: Props) {
  const cardEmoji = (iconKey: string) => CARD_ICON_EMOJI[iconKey] ?? '✨'
  const lp = langPrefix(lang)
  const blogListHref = `${lp}/blog`
  const previewPosts = blogs.slice(0, LANDING_BLOG_PREVIEW_MAX)
  const readMore = t(lang, 'blog.readMore')
  const faqItems = (Array.isArray(faqRaw) ? faqRaw : []).filter((item) =>
    faqItemHasContent(item?.question, item?.answer),
  )

  return (
    <>
      {cards.length > 0 && (
        <section className="cp-my-landing-section cp-my-landing-features" aria-labelledby="landing-features-heading">
          <h2 id="landing-features-heading" className="cp-my-landing-section-title">
            {t(lang, 'landing.featuresTitle')}
          </h2>
          <div className="cp-my-landing-cards">
            {cards.map((card) => (
              <div key={card.id} className="cp-my-landing-card">
                <span className="cp-my-landing-card-icon" aria-hidden="true">
                  {cardEmoji(String(card.icon || ''))}
                </span>
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
            <h2 id={sectionId} className="cp-my-landing-section-title">
              {sec.title || ''}
            </h2>
            {sec.description ? <p className="cp-my-landing-section-subtitle">{sec.description}</p> : null}
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
                        __html: absolutizeCmsHtmlServer(String(item.body || item.description || ''), siteOrigin),
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {faqItems.length > 0 && (
        <section id="landing-faq" className="cp-my-landing-section cp-my-landing-faq" aria-labelledby="landing-faq-heading">
          <h2 id="landing-faq-heading" className="cp-my-landing-section-title">
            {t(lang, 'landing.faqTitle')}
          </h2>
          <div className="cp-my-landing-faq-list" role="list">
            {faqItems.map((item, i) => {
              const answerHtml = absolutizeCmsHtmlServer(String(item.answer || ''), siteOrigin)
              return (
                <details key={i} className="cp-my-landing-faq-item cp-my-landing-faq-item--details" role="listitem">
                  <summary className="cp-my-landing-faq-question">
                    <span>{stripHtml(String(item.question || ''))}</span>
                    <span className="cp-my-landing-faq-chevron" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="cp-my-landing-faq-answer cp-my-landing-faq-answer--details">
                    <div
                      className="cp-my-landing-faq-answer__inner cp-my-cms-page-content"
                      dangerouslySetInnerHTML={{ __html: answerHtml }}
                    />
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      )}

      {previewPosts.length > 0 && (
        <section id="landing-blog" className="cp-my-landing-section cp-my-landing-blog" aria-labelledby="landing-blog-heading">
          <div className="cp-my-landing-blog-header">
            <h2 id="landing-blog-heading" className="cp-my-landing-section-title cp-my-landing-blog-title">
              {t(lang, 'fromTheBlog')}
            </h2>
            <Link href={blogListHref} className="cp-my-landing-blog-view-all">
              {t(lang, 'viewAllPosts')}
            </Link>
          </div>
          <div className="cp-my-landing-blog-grid">
            {previewPosts.map((post) => (
              <Link
                key={post.id}
                href={`${lp}/blog/${encodeURIComponent(post.slug)}`}
                className="cp-my-blog-card cp-my-landing-blog-card"
              >
                <div className="cp-my-blog-card-image-wrap">
                  <BlogCardCover
                    src={post.og_image || post.image}
                    title={post.title}
                    siteOrigin={siteOrigin}
                  />
                </div>
                <div className="cp-my-blog-card-body">
                  {post.published_at && (
                    <time className="cp-my-blog-card-date" dateTime={post.published_at}>
                      {formatBlogDate(post.published_at, lang)}
                    </time>
                  )}
                  <h3 className="cp-my-blog-card-title">{post.title}</h3>
                  {post.excerpt ? <p className="cp-my-blog-card-excerpt">{post.excerpt}</p> : null}
                  <span className="cp-my-blog-card-link">
                    {readMore} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
