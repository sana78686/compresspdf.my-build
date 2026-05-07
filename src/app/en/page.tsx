import type { Metadata } from 'next'
import HomePageClient from '@/components/compress/HomePageClient'
import HomeLandingServerBlocks from '@/components/compress/HomeLandingServerBlocks'
import { JsonLdScript } from '@/components/cms/JsonLdScript'
import { translations } from '@/i18n/translations'
import { buildCmsMetadata } from '@/lib/cmsMeta'
import { getHomePageContent, getBlogs, getFaq, getHomeCards, getSections } from '@/lib/cms/server'
import { normalizeBlogsResponse } from '@/lib/cms/normalizeBlogs'
import { absolutizeCmsHtmlServer, siteOriginFromEnv } from '@/lib/cms/html'
import { cmsHtmlHasVisibleText } from '@/utils/cmsHtmlVisible'

const h = translations.en
const homeCmsAria = translations.en.landing.cmsSectionAria

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata({
    locale: 'en',
    path: '/en',
    ogLocale: 'en_US',
    fallbackTitle: h.seoHeroH1,
    fallbackDescription: h.subtitle,
  })
}

export default async function EnHomePage() {
  const origin = siteOriginFromEnv()

  let res: { content?: string; json_ld?: { '@graph'?: unknown[] } } = {}
  let blogsRes: unknown = null
  let faqRes: { faq?: { question?: string; answer?: string }[] } = { faq: [] }
  let cardsRes: {
    cards?: { id: number; title: string; description?: string; icon?: string }[]
    section?: { title?: string; description?: string }
  } = {}
  let sectionsRes: {
    sections?: { id: number; title?: string; description?: string; items?: unknown[] }[]
  } = {}

  try {
    ;[res, blogsRes, faqRes, cardsRes, sectionsRes] = await Promise.all([
      getHomePageContent('en', '/en') as Promise<typeof res>,
      getBlogs('en'),
      getFaq('en') as Promise<typeof faqRes>,
      getHomeCards('en') as Promise<typeof cardsRes>,
      getSections('en') as Promise<typeof sectionsRes>,
    ])
  } catch {
    /* partial failure */
  }

  const raw = typeof res?.content === 'string' ? res.content : ''
  const html = absolutizeCmsHtmlServer(raw, origin)
  const graph = res?.json_ld?.['@graph']
  const jsonLd =
    Array.isArray(graph) && graph.length > 0 ? (res.json_ld as Record<string, unknown>) : null

  const cards = Array.isArray(cardsRes?.cards) ? cardsRes.cards : []
  const sections = Array.isArray(sectionsRes?.sections) ? sectionsRes.sections : []
  const howSection =
    cardsRes?.section && typeof cardsRes.section === 'object' ? cardsRes.section : null
  const blogs = normalizeBlogsResponse(blogsRes)
  const faqRaw = Array.isArray(faqRes?.faq) ? faqRes.faq : []

  return (
    <>
      <JsonLdScript data={jsonLd} />
      {/* Visible <h1> is rendered inside HomePageClient (.landing-upload-h1) so crawlers see one real heading. */}
      <HomePageClient
        landingExtrasOnServer
        hideLandingCompressor
        homeCmsFromServer={{ html, jsonLd }}
      />
      {cmsHtmlHasVisibleText(html) ? (
        <section className="cp-my-landing-cms-body-section" aria-label={homeCmsAria}>
          <div
            className="cp-my-cms-home-cms-body cp-my-cms-page-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>
      ) : null}
      <HomeLandingServerBlocks
        lang="en"
        siteOrigin={origin}
        cards={cards}
        sections={sections as never}
        howSection={howSection}
        blogs={blogs}
        faqRaw={faqRaw}
      />
    </>
  )
}
