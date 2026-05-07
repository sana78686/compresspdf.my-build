'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { langPrefix } from '@/i18n/translations'
import { usePathLang } from '@/hooks/usePathLang'
import '../compress/HomePage.css'
import '@/styles/ComingSoonPage.css'

export default function ComingSoonClient() {
  const lang = usePathLang()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const lp = langPrefix(lang)

  return (
    <div className="cp-my-coming-soon-page cp-my-home-page">
      <main className="cp-my-coming-soon-main">
        <h1 className="cp-my-coming-soon-title">Coming soon</h1>
        <p className="cp-my-coming-soon-text">
          We&apos;re polishing this PDF workflow for CompressPDF.my. Explore the homepage for articles or drop us a note via Contact.
        </p>
        <Link href={lp || '/'} className="cp-my-coming-soon-btn">
          Back to home
        </Link>
      </main>
    </div>
  )
}
