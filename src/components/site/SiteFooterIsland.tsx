'use client'

import { usePathname } from 'next/navigation'
import { useTranslation } from '@/i18n/useTranslation'
import { usePathLang } from '@/hooks/usePathLang'
import Footer from './Footer'
import type { CmsNavPage } from './SiteHeaderIsland'

type Props = {
  footerPages: CmsNavPage[]
  legalVisibility: Record<string, boolean>
}

export default function SiteFooterIsland({ footerPages, legalVisibility }: Props) {
  const lang = usePathLang()
  const pathname = usePathname() || '/'
  const t = useTranslation(lang)

  return (
    <Footer
      lang={lang}
      pathname={pathname}
      t={t}
      footerPages={footerPages}
      legalVisibility={legalVisibility}
    />
  )
}
