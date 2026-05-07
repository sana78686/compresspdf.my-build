'use client'

import { useEffect } from 'react'
import { usePathLang } from '@/hooks/usePathLang'

/** Sets documentElement.lang/dir so crawlers and a11y match the URL locale. */
export default function HtmlLangSetter() {
  const lang = usePathLang()
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = 'ltr'
  }, [lang])
  return null
}
