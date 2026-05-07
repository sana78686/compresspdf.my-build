import HtmlLangSetter from '@/components/site/HtmlLangSetter'
import SiteHeaderIsland from '@/components/site/SiteHeaderIsland'
import SiteFooterIsland from '@/components/site/SiteFooterIsland'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import { getPages, getLegalNav } from '@/lib/cms/server'
/** One layout CSS graph → fewer render-blocking `<link>` chains vs importing again from client pages */
import '@/components/compress/HomePage.css'
import '@/styles/cms-page.css'
import '@/styles/BlogListPage.css'
import '@/components/site/Footer.css'
import '@/components/site/Breadcrumbs.css'

export const revalidate = 60

export default async function SiteRouteLayout({ children }: { children: React.ReactNode }) {
  let footerPages: { id: number; title: string; slug: string; placement?: string }[] = []
  let legalVisibility: Record<string, boolean> = {}
  try {
    const [pagesRes, legalNavRes] = await Promise.all([getPages('ms'), getLegalNav('ms')])
    footerPages = Array.isArray(pagesRes?.pages) ? pagesRes.pages : []
    const legal = legalNavRes?.legal
    legalVisibility =
      legal && typeof legal === 'object' && !Array.isArray(legal)
        ? (legal as Record<string, boolean>)
        : {}
  } catch {
    /* CMS down — shell still renders */
  }

  return (
    <div className="cp-my-home-page">
      <HtmlLangSetter />
      <SiteHeaderIsland footerPages={footerPages} />
      <main id="main-content" className="cp-my-main cp-my-cms-main" tabIndex={-1}>
        <Breadcrumbs />
        {children}
      </main>
      <SiteFooterIsland footerPages={footerPages} legalVisibility={legalVisibility} />
    </div>
  )
}
