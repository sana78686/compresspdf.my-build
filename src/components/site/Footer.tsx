'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supportedLangs, langOptions, defaultLang, langPrefix as lp, writeUserLocalePreference } from '@/i18n/translations'
import LangFlag from './LangFlag'
import BrandLogo from './BrandLogo'
import { ucWords } from '@/utils/ucWords'

const LEGAL_SLUG_ORDER = ['terms', 'privacy-policy', 'disclaimer', 'about-us', 'cookie-policy']

const LEGAL_LABEL_KEY = {
  terms: 'footerTerms',
  'privacy-policy': 'footerPrivacy',
  disclaimer: 'footerDisclaimer',
  'about-us': 'footerAbout',
  'cookie-policy': 'footerCookies',
}

function buildLangSwitchHref(pathname: string, currentLang: string, targetLang: string) {
  let suffix = pathname || '/'
  if (currentLang !== defaultLang) {
    suffix = suffix.replace(new RegExp(`^/${currentLang}(/|$)`), '$1') || '/'
  }
  if (!suffix.startsWith('/')) suffix = '/' + suffix
  if (targetLang === defaultLang) return suffix
  return `/${targetLang}${suffix === '/' ? '' : suffix}`
}

type FooterPage = { id: number; title: string; slug: string; placement?: string }

type FooterProps = {
  lang: string
  pathname: string
  t: (key: string, params?: Record<string, string | number>) => string
  footerPages?: FooterPage[]
  legalVisibility?: Record<string, boolean>
}

export default function Footer({
  lang,
  pathname,
  t,
  footerPages = [],
  legalVisibility = {},
}: FooterProps) {
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement | null>(null)

  const cmsFooterLinks = footerPages.filter(
    (p) => p.placement === 'footer' || p.placement === 'both',
  )

  const legalLinksToShow = LEGAL_SLUG_ORDER.filter((slug) => legalVisibility[slug])
  const showLegalColumn = legalLinksToShow.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    if (langOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [langOpen])

  const effectiveLang = supportedLangs.includes(lang) ? lang : defaultLang
  const prefix = lp(effectiveLang)
  const homeHref = prefix || '/'

  return (
    <footer className="cp-my-footer cp-my-footer--dark">
      <div className="cp-my-footer-inner">
        <div className="cp-my-footer-top">
          <div className="cp-my-footer-brand">
            <BrandLogo href={homeHref} ariaLabel={t('nav.home')} variant="footer" />
            <p className="cp-my-footer-brand-tagline">{t('footerTagline')}</p>
          </div>
          <div className="cp-my-footer-columns">
            <div className="cp-my-footer-col">
              <h3 className="cp-my-footer-col-title">{t('footerCompany')}</h3>
              <a href={`${prefix || '/'}`}>{t('footerHome')}</a>
              <a href={`${prefix}/blog`}>{t('footerBlog')}</a>
              <a href={`${prefix}/contact`}>{t('footerContact')}</a>
            </div>
            {cmsFooterLinks.length > 0 && (
              <div className="cp-my-footer-col">
                <h3 className="cp-my-footer-col-title">{t('footerOther')}</h3>
                {cmsFooterLinks.map((p) => (
                  <a key={p.id} href={`${prefix}/page/${p.slug}`}>
                    {ucWords(p.title)}
                  </a>
                ))}
              </div>
            )}
            {showLegalColumn && (
              <div className="cp-my-footer-col">
                <h3 className="cp-my-footer-col-title">{t('footerLegal')}</h3>
                {legalLinksToShow.map((slug) => (
                  <a key={slug} href={`${prefix}/legal/${slug}`}>
                    {t(LEGAL_LABEL_KEY[slug as keyof typeof LEGAL_LABEL_KEY])}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cp-my-footer-divider" />

        <div className="cp-my-footer-bottom">
          <div className="cp-my-footer-lang-wrap" ref={langRef}>
            <button
              type="button"
              className="cp-my-footer-lang-btn"
              onClick={() => setLangOpen((o) => !o)}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label="Select language"
            >
              <span className="cp-my-footer-lang-icon" aria-hidden>
                <LangFlag lang={effectiveLang} width={20} />
              </span>
              <span>{langOptions[effectiveLang as keyof typeof langOptions]?.label || t('footerLanguage')}</span>
              <span className="cp-my-footer-lang-chevron" aria-hidden>▼</span>
            </button>
            {langOpen && (
              <ul className="cp-my-footer-lang-menu" role="listbox">
                {supportedLangs.map((l) => (
                  <li key={l} role="option" aria-selected={effectiveLang === l ? true : false}>
                    <Link
                      href={buildLangSwitchHref(pathname, effectiveLang, l)}
                      className="cp-my-footer-lang-item"
                      scroll={false}
                      onClick={() => writeUserLocalePreference(l)}
                    >
                      <span className="cp-my-footer-lang-item-flag" aria-hidden>
                        <LangFlag lang={l} width={18} />
                      </span>
                      <span>{langOptions[l as keyof typeof langOptions]?.label || l.toUpperCase()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="cp-my-footer-social-copy">
            {/* Social icons — restore when real profile URLs are ready
            <nav className="cp-my-footer-social" aria-label="Social links">
              <a href="#twitter" aria-label="X (Twitter)"><span className="cp-my-footer-social-icon">𝕏</span></a>
              <a href="#facebook" aria-label="Facebook"><span className="cp-my-footer-social-icon">f</span></a>
              <a href="#linkedin" aria-label="LinkedIn"><span className="cp-my-footer-social-icon">in</span></a>
              <a href="#instagram" aria-label="Instagram"><span className="cp-my-footer-social-icon">📷</span></a>
              <a href="#tiktok" aria-label="TikTok"><span className="cp-my-footer-social-icon">♪</span></a>
            </nav>
            */}
            <p className="cp-my-footer-copy">
              <span>{t('footerCopyrightPrefix')}</span>
              <a
                href="https://apimstec.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('footerPoweredBy')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
