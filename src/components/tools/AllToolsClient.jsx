'use client'

/**
 * All-tools grid UI — not mounted by any route right now (no `/tools` page).
 * Unfinished tools are not links (no `/en/[tool]` route until you copy from `src/templates/en-tool-coming-soon-page.tsx`).
 */

import { useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { usePathLang } from '@/hooks/usePathLang'
import { COMPRESS_PDF_EN } from '@/constants/brand'
import '../compress/HomePage.css'
import '@/styles/AllToolsPage.css'

const TOOLS_LIST = [
  { slug: 'merge', labelKey: 'tools.mergePdf', available: false },
  { slug: 'split', labelKey: 'tools.splitPdf', available: false },
  { slug: '', labelKey: 'tools.compressPdf', available: true },
  { slug: 'edit', labelKey: 'tools.editPdf', available: false },
  { slug: 'sign', labelKey: 'tools.signPdf', available: false },
  { slug: 'convert', labelKey: 'tools.convertPdf', available: false },
  { slug: 'images-to-pdf', labelKey: 'tools.imagesToPdf', available: false },
  { slug: 'pdf-to-images', labelKey: 'tools.pdfToImages', available: false },
  { slug: 'extract-images', labelKey: 'tools.extractImages', available: false },
  { slug: 'protect', labelKey: 'tools.protectPdf', available: false },
  { slug: 'unlock', labelKey: 'tools.unlockPdf', available: false },
  { slug: 'rotate', labelKey: 'tools.rotatePdf', available: false },
  { slug: 'remove-pages', labelKey: 'tools.removePages', available: false },
  { slug: 'extract-pages', labelKey: 'tools.extractPages', available: false },
  { slug: 'rearrange', labelKey: 'tools.rearrangePages', available: false },
  { slug: 'webpage-to-pdf', labelKey: 'tools.webpageToPdf', available: false },
  { slug: 'ocr', labelKey: 'tools.pdfOcr', available: false },
  { slug: 'watermark', labelKey: 'tools.addWatermark', available: false },
  { slug: 'page-numbers', labelKey: 'tools.addPageNumbers', available: false },
  { slug: 'overlay', labelKey: 'tools.pdfOverlay', available: false },
  { slug: 'compare', labelKey: 'tools.comparePdfs', available: false },
  { slug: 'optimize', labelKey: 'tools.webOptimize', available: false },
  { slug: 'redact', labelKey: 'tools.redactPdf', available: false },
  { slug: 'create', labelKey: 'tools.createPdf', available: false },
]

export default function AllToolsClient() {
  const lang = usePathLang()
  const t = useTranslation(lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const compressHref = lang === 'en' ? '/en' : '/'

  return (
    <div className="cp-my-all-tools-page cp-my-home-page">
      <main className="cp-my-all-tools-main">
        <h1 className="cp-my-all-tools-title">{t('tools.pageTitle')}</h1>
        <p className="cp-my-all-tools-subtitle">{t('tools.frequentlyUsed')}</p>

        <div className="cp-my-tools-grid">
          {TOOLS_LIST.map((tool) => {
            const key = tool.slug || 'compress'
            if (tool.available && tool.slug === '') {
              return (
                <a
                  key={key}
                  href={compressHref}
                  className="cp-my-tool-card cp-my-tool-card--available"
                >
                  <span className="cp-my-tool-card-icon" aria-hidden>
                    📦
                  </span>
                  <span className="cp-my-tool-card-label">{COMPRESS_PDF_EN}</span>
                  <span className="cp-my-tool-card-badge" aria-hidden>
                    ✓
                  </span>
                </a>
              )
            }
            return (
              <div
                key={key}
                className="cp-my-tool-card cp-my-tool-card--soon"
                title={t('tools.comingSoonTitle')}
              >
                <span className="cp-my-tool-card-icon" aria-hidden>
                  📄
                </span>
                <span className="cp-my-tool-card-label">{t(tool.labelKey)}</span>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
