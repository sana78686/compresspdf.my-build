import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogBySlug } from '@/lib/cms/server'
import { absolutizeCmsHtmlServer, siteOriginFromEnv } from '@/lib/cms/html'
import { JsonLdScript } from '@/components/cms/JsonLdScript'
import { buildCmsMetadata } from '@/lib/cmsMeta'
import { langPrefix } from '@/i18n/translations'

export const revalidate = 60

function plainText(html: string) {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = (await getBlogBySlug(slug, 'en')) as Record<string, string | undefined>
    if (data?._seo_redirect) return { title: 'Blog' }
    const description =
      String(data?.meta_description || data?.excerpt || '').trim() ||
      plainText(String(data?.content || '')).slice(0, 160)
    return buildCmsMetadata({
      locale: 'en',
      path: `/en/blog/${encodeURIComponent(slug)}`,
      ogLocale: 'en_US',
      ogType: 'article',
      pageMeta: {
        title: data?.meta_title || data?.title,
        description,
        keywords: data?.meta_keywords,
        og_image: data?.og_image,
        image: data?.image,
      },
      fallbackTitle: 'Blog',
      fallbackDescription: '',
    })
  } catch {
    return { title: 'Blog' }
  }
}

export default async function EnBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let data: Record<string, unknown>
  try {
    data = (await getBlogBySlug(slug, 'en')) as Record<string, unknown>
  } catch {
    notFound()
  }

  const redir = data?._seo_redirect as { locale?: string; slug?: string } | undefined
  if (redir?.locale && redir?.slug) {
    const lp = langPrefix(redir.locale as 'ms' | 'en')
    redirect(`${lp}/blog/${encodeURIComponent(String(redir.slug))}`)
  }

  const title = String(data?.title || 'Blog')
  const origin = siteOriginFromEnv()
  const html = absolutizeCmsHtmlServer(String(data?.content || ''), origin)
  const jsonLd = data?.json_ld as { '@graph'?: unknown[] } | undefined

  return (
    <article className="cp-my-cms-page cp-my-cms-blog cp-my-wrap">
      <JsonLdScript data={jsonLd} />
      <header className="cp-my-cms-blog-header">
        <h1 className="cp-my-cms-blog-title">{title}</h1>
      </header>
      <div className="cp-my-cms-page-content cp-my-cms-blog-content" dangerouslySetInnerHTML={{ __html: html }} />
      <footer className="cp-my-cms-page-footer">
        <Link href="/en/blog" className="cp-my-cms-page-back">
          ← Blog
        </Link>
        <span className="cp-my-cms-page-footer-sep"> · </span>
        <Link href="/en" className="cp-my-cms-page-back">
          Home
        </Link>
      </footer>
    </article>
  )
}
