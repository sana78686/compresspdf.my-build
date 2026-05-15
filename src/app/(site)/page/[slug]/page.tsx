import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPageBySlug } from '@/lib/cms/server'
import { absolutizeCmsHtmlServer, siteOriginFromEnv } from '@/lib/cms/html'
import { JsonLdScript } from '@/components/cms/JsonLdScript'
import CmsPageCompressToolSection from '@/components/compress/CmsPageCompressToolSection'
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
    const data = (await getPageBySlug(slug, 'ms')) as Record<string, string | undefined>
    if (data?._seo_redirect) return { title: 'Page' }
    return buildCmsMetadata({
      locale: 'ms',
      path: `/page/${encodeURIComponent(slug)}`,
      ogLocale: 'ms_MY',
      pageMeta: {
        title: data?.meta_title || data?.title,
        description:
          data?.meta_description || plainText(String(data?.content || '')).slice(0, 160),
        keywords: data?.meta_keywords,
        og_image: data?.og_image,
        image: data?.image,
      },
      fallbackTitle: slug,
      fallbackDescription: '',
    })
  } catch {
    return { title: 'Page' }
  }
}

export default async function CmsDynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'compress') redirect('/')
  let data: Record<string, unknown>
  try {
    data = (await getPageBySlug(slug, 'ms')) as Record<string, unknown>
  } catch {
    notFound()
  }

  const redir = data?._seo_redirect as { locale?: string; slug?: string } | undefined
  if (redir?.locale && redir?.slug) {
    const lp = langPrefix(redir.locale as 'ms' | 'en')
    redirect(`${lp}/page/${encodeURIComponent(String(redir.slug))}`)
  }

  const origin = siteOriginFromEnv()
  const html = absolutizeCmsHtmlServer(String(data?.content || ''), origin)
  const jsonLd = data?.json_ld
  const pageTitle = String(data?.title || slug)

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <section
        id="compress-tool"
        className="cp-my-landing-upload-section cp-my-landing-upload-section--first"
        aria-labelledby="page-main-h1"
      >
        <h1 id="page-main-h1" className="cp-my-landing-upload-h1">
          {pageTitle}
        </h1>
        <CmsPageCompressToolSection serverH1Rendered nestedUnderServerHeroSection />
      </section>
      <article className="cp-my-cms-page cp-my-wrap cp-my-cms-page--below-compress-tool">
        <div className="cp-my-cms-page-content" dangerouslySetInnerHTML={{ __html: html }} />
        <footer className="cp-my-cms-page-footer">
          <Link href="/" className="cp-my-cms-page-back">
            ← Back to home
          </Link>
        </footer>
      </article>
    </>
  )
}
