import Link from 'next/link'
import { getBlogs } from '@/lib/cms/server'
import { JsonLdScript } from '@/components/cms/JsonLdScript'
import { siteOriginFromEnv } from '@/lib/cms/html'
import { normalizeBlogsResponse, type BlogPostPreview } from '@/lib/cms/normalizeBlogs'
import { translations, langPrefix } from '@/i18n/translations'
import BlogCardCover from '@/components/blog/BlogCardCover'

type Locale = 'ms' | 'en'

type BlogPost = BlogPostPreview

function formatDate(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })
  } catch {
    return iso
  }
}

export async function BlogListView({ locale }: { locale: Locale }) {
  const res = await getBlogs(locale)
  const blogs = normalizeBlogsResponse(res)
  const jsonLd =
    res && typeof res === 'object' && 'json_ld' in res ? (res as { json_ld?: unknown }).json_ld : null
  const b = translations[locale].blog
  const lp = langPrefix(locale)
  const origin = siteOriginFromEnv()

  return (
    <article className="cp-my-blog-list-page cp-my-wrap">
      <JsonLdScript data={jsonLd} />
      <header className="cp-my-blog-list-header">
        <h1 className="cp-my-blog-list-title">{b.listTitle}</h1>
        <p className="cp-my-blog-list-intro">{b.listIntro}</p>
      </header>
      {blogs.length === 0 ? (
        <div className="cp-my-blog-list-empty-state" role="status" aria-live="polite">
          <h2 className="cp-my-blog-list-empty-title">{b.emptyTitle}</h2>
          <p className="cp-my-blog-list-empty-text">{b.emptyBody}</p>
        </div>
      ) : (
        <div className="cp-my-blog-list-grid">
          {blogs.map((post) => (
            <Link
              key={post.id}
              href={`${lp}/blog/${encodeURIComponent(post.slug)}`}
              className="cp-my-blog-card"
            >
              <div className="cp-my-blog-card-image-wrap">
                <BlogCardCover
                  src={post.og_image || post.image}
                  title={post.title}
                  siteOrigin={origin}
                />
              </div>
              <div className="cp-my-blog-card-body">
                {post.published_at && (
                  <time className="cp-my-blog-card-date" dateTime={post.published_at}>
                    {formatDate(post.published_at)}
                  </time>
                )}
                <h2 className="cp-my-blog-card-title">{post.title}</h2>
                {post.excerpt && <p className="cp-my-blog-card-excerpt">{post.excerpt}</p>}
                <span className="cp-my-blog-card-link">{b.readMore} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <footer className="cp-my-blog-list-footer">
        <Link href={`${lp}/`} className="cp-my-blog-list-back">
          ← {b.backHome}
        </Link>
      </footer>
    </article>
  )
}
