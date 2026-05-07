'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/i18n/useTranslation'
import { usePathLang } from '@/hooks/usePathLang'
import { buildCompressPdfBreadcrumbItems } from '@/utils/breadcrumbTrail'

export default function Breadcrumbs() {
  const lang = usePathLang()
  const pathname = usePathname() || '/'
  const t = useTranslation(lang)
  const items = useMemo(() => buildCompressPdfBreadcrumbItems(pathname, t), [pathname, t])

  if (!items?.length) return null

  return (
    <nav className="cp-my-site-breadcrumbs" aria-label="Breadcrumb">
      <ol className="cp-my-site-breadcrumbs-list">
        {items.map((crumb, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${crumb.label}-${i}-${crumb.to || ''}`} className="cp-my-site-breadcrumbs-item">
              {last || !crumb.to ? (
                <span className="cp-my-site-breadcrumbs-current" aria-current={last ? 'page' : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link className="cp-my-site-breadcrumbs-link" href={crumb.to}>
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
