import msTranslations from './translations.ms.js'

/**
 * UI strings: ms (Bahasa Melayu — Malaysia default), en (English).
 * Missing keys fall back to English (see getTranslation).
 */
export const translations = {
  en: {
    logoMark: 'CompressPDF.my',
    nav: {
      merge: 'MERGE PDF',
      split: 'SPLIT PDF',
      compress: 'COMPRESS PDF',
      convert: 'CONVERT PDF',
      allTools: 'ALL PDF TOOLS',
      login: 'Login',
      dashboard: 'Dashboard',
      signUp: 'Sign up',
      home: 'Home',
    },
    title: 'CompressPDF.my — Malaysia & English',
    /** Home `<title>`, Open Graph, and landing `<h1>`. */
    seoHeroH1: 'Compress PDF',
    subtitle: 'Shrink PDFs in-browser while keeping clarity — tuned for readers and teams using CompressPDF.my.',
    selectPdf: 'Select PDF files',
    orDrop: 'or drop PDFs here',
    fromCloud: 'From cloud',
    otherSources: 'Other sources',
    fileProtection: '✓ File protection is active',
    addMoreFiles: 'Add more files',
    removeFile: 'Remove',
    dpi: 'DPI',
    imageQuality: 'Image quality',
    color: 'Color',
    colorNoChange: 'No change',
    colorGray: 'Gray',
    compress: 'Compress',
    compressing: 'Compressing…',
    resultReduced: 'The size has been reduced by',
    shareOrContinue: 'Share or continue',
    download: 'Download',
    preview: 'Preview',
    erase: 'Erase',
    restart: 'Restart',
    googleDrive: 'Google Drive',
    dropbox: 'Dropbox',
    email: 'Email',
    mailSubject: 'Compressed PDF',
    mailBody: 'Download:',
    footer: '© 2026 – Powered by ApimsTec',
    footerProduct: 'PRODUCT',
    footerResources: 'RESOURCES',
    footerLegal: 'LEGAL',
    footerCompany: 'COMPANY',
    footerTagline:
      'Malaysia-friendly PDF tools — fast, private, and free in your browser.',
    footerHome: 'Home',
    footerFeatures: 'Features',
    footerPricing: 'Pricing',
    footerFaq: 'FAQ',
    footerTools: 'Tools',
    footerSolutions: 'SOLUTIONS',
    footerBusiness: 'Business',
    footerEducation: 'Education',
    footerSecurity: 'Security',
    footerPress: 'Press',
    footerPrivacy: 'Privacy policy',
    footerTerms: 'Terms & conditions',
    footerDisclaimer: 'Disclaimer',
    footerCookies: 'Cookies',
    footerAbout: 'About us',
    footerContact: 'Contact us',
    footerBlog: 'Blog',
    /** Visible compress link (header + footer) → home `#compress-tool`. */
    footerCompress: 'Compress PDF',
    footerOther: 'OTHER',
    footerCopyrightPrefix: '© CompressPDF.my 2026 ® – ',
    footerPoweredBy: 'powered by Apimstec',
    footerLanguage: 'English',
    footerGetGooglePlay: 'GET IT ON Google Play',
    footerDownloadAppStore: 'Download on the App Store',
    footerDownloadMacStore: 'Download on the Mac App Store',
    footerMicrosoftStore: 'Microsoft Store',
    ariaSelectPdf: 'Select PDF files',
    ariaColorMode: 'Color mode',
    ariaRemove: 'Remove',
    compressionSettings: 'Compression settings',
    compressionResult: 'Compression result',
    progressInitializing: 'Initializing…',
    progressLoading: 'Loading PDF…',
    progressPage: 'Compressing page',
    progressFinalizing: 'Finalizing…',
    progressGrayscale: 'Applying grayscale…',
    maxFilesReached: 'You already have the maximum of 10 PDFs. Remove one to add another.',
    maxFilesPartial: 'Only the first files that fit were added (maximum 10 PDFs).',
    maxFilesHint: 'Maximum 10 PDFs per session.',
    fileCountHint: '{count} of {max} PDFs selected',
    settingsRequiredHint: 'Enter DPI (72–300) and image quality (1–100%) to enable Compress.',
    compressionModeLegend: 'Compression mode',
    compressionModeBalanced: 'Balanced (recommended)',
    compressionModeMaximum: 'Maximum size reduction',
    compressionModeMaximumWarn:
      'Maximum mode aggressively shrinks files: text and images may look soft, blurry, or pixelated; scans and photos are affected most. Use only when the smallest file matters more than visual quality. Compression may take longer.',
    compressionModeShort: 'Mode',
    compressionModeBalancedBanner: 'Balanced',
    compressionModeMaximumBanner: 'Maximum reduction',
    progressMaximumRefine: 'Refining for smaller size — {name}',
    targetPdfSizeKb: 'PDF size:',
    targetKbPlaceholder: 'Optional — max KB',
    targetKbHint: 'Enter a target size between 10 and 524288 KB.',
    progressShrinkingTarget: 'Adjusting quality toward target size — {name}',
    compressTenPdfNote: "Note:- You can compress 10 PDF's at once.",
    targetKbMissedAria: 'Target file size not reached',
    targetKbNotReachedSingle:
      'You asked for about {target} KB, but this PDF could only be reduced to about {actual}. Very aggressive targets are often impossible for image-heavy, multi-page, or scanned PDFs.',
    targetKbNotReachedMultiLead: 'These outputs are still larger than your target KB:',
    targetKbNotReachedRow: '{name} — smallest size {actual} (you targeted ~{target} KB).',
    targetKbNotReachedReason:
      'Why: compression balances readability with size. Embedded fonts, vectors, high-resolution images, and page count set a practical minimum. Try a higher target KB, reduce DPI and image quality before running compression, or split the PDF into smaller files.',
    fileDone: 'Done',
    compressFileProgress: 'File {current} of {total}: {name}',
    resultMultiTitle: 'Your compressed PDFs are ready',
    resultSavedSuffix: 'smaller',
    fromTheBlog: 'From the blog',
    viewAllPosts: 'View all posts',
    downloadAll: 'Download all',
    otherTools: 'Other tools',
    landing: {
      heroTitle: 'Editorial PDF hub for Malaysia & beyond',
      heroSubtitle:
        'Lightweight guides, bilingual pages, and CMS-driven blocks — separate from our Indonesia or US experiences.',
      ctaCompress: 'Go to homepage',
      featuresTitle: 'Why CompressPDF.my?',
      feature1Title: 'Snappy delivery',
      feature1Desc: 'Static-first routes with ISR so blogs and legal pages load quickly.',
      feature2Title: 'Honest typography',
      feature2Desc: 'System fonts keep CLS low while CMS writers control headings.',
      feature3Title: 'Privacy-minded UX',
      feature3Desc: 'When compression ships again it stays client-side — today this site focuses on reading.',
      feature4Title: 'Free knowledge base',
      feature4Desc: 'No paywall on articles or FAQs written for Malaysian SMEs.',
      howTitle: 'How to use this site',
      howStep1: 'Pick a language',
      howStep1Desc: 'Bahasa Melayu on `/` or English on `/en`.',
      howStep2: 'Browse blog',
      howStep2Desc: 'Follow PDF productivity notes curated for MY readers.',
      howStep3: 'Reach out',
      howStep3Desc: 'Use Contact for enterprise licensing or bug reports.',
      faqTitle: 'FAQ',
      faq1Q: 'Is there a PDF compressor here?',
      faq1A: 'This MY deployment highlights editorial content; tooling may return later.',
      faq2Q: 'Where is data processed?',
      faq2A: 'CMS HTML is cached — interactive demos never touch our disks.',
      faq3Q: 'Can I share articles?',
      faq3A: 'Yes, canonical URLs match compresspdf.my.',
      faq4Q: 'Who maintains the site?',
      faq4A: 'ApimsTec operates CompressPDF.my alongside other regional brands.',
      readyTitle: 'Explore content',
      readySubtitle: 'Start from the hero section below or jump into the blog.',
      cmsSectionAria: 'Site introduction',
    },
    tools: {
      pageTitle: 'All PDF Tools',
      frequentlyUsed: 'Frequently used',
      comingSoonTitle: 'Coming soon — not available yet',
      mergePdf: 'Merge PDF',
      splitPdf: 'Split PDF',
      compressPdf: 'Compress PDF',
      editPdf: 'Edit PDF',
      signPdf: 'Sign PDF',
      convertPdf: 'PDF Converter',
      imagesToPdf: 'Images to PDF',
      pdfToImages: 'PDF to Images',
      extractImages: 'Extract PDF images',
      protectPdf: 'Protect PDF',
      unlockPdf: 'Unlock PDF',
      rotatePdf: 'Rotate PDF pages',
      removePages: 'Remove PDF pages',
      extractPages: 'Extract PDF pages',
      rearrangePages: 'Rearrange PDF pages',
      webpageToPdf: 'Webpage to PDF',
      pdfOcr: 'PDF OCR',
      addWatermark: 'Add watermark',
      addPageNumbers: 'Add page numbers',
      pdfOverlay: 'PDF Overlay',
      comparePdfs: 'Compare PDFs',
      webOptimize: 'Web optimize PDF',
      redactPdf: 'Redact PDF',
      createPdf: 'Create PDF',
      translatePdf: 'Translate PDF',
      jpgToPdf: 'JPG to PDF',
      wordToPdf: 'WORD to PDF',
      powerpointToPdf: 'POWERPOINT to PDF',
      excelToPdf: 'EXCEL to PDF',
      htmlToPdf: 'HTML to PDF',
      pdfToJpg: 'PDF to JPG',
      pdfToWord: 'PDF to WORD',
      pdfToPowerpoint: 'PDF to POWERPOINT',
      pdfToExcel: 'PDF to EXCEL',
      pdfToPdfa: 'PDF to PDF/A',
    },
    megaMenu: {
      organizePdf: 'ORGANIZE PDF',
      optimizePdf: 'OPTIMIZE PDF',
      convertToPdf: 'CONVERT TO PDF',
      convertFromPdf: 'CONVERT FROM PDF',
      editPdf: 'EDIT PDF',
      pdfSecurity: 'PDF SECURITY',
      pdfIntelligence: 'PDF INTELLIGENCE',
    },
    contact: {
      title: 'Contact',
      description: 'Get in touch – contact form and details.',
      intro:
        'Reach the CompressPDF.my crew for partnerships, accessibility feedback, or content ideas — we answer within business hours (GMT+8).',
      detailsHeading: 'Contact details',
      sendAnother: 'Send another message',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      backHome: 'Back to home',
      noDetails: 'Contact details are not set yet. They can be added in the content manager.',
      yourName: 'Your Name',
      yourEmail: 'Your Email',
      subject: 'Subject',
      chooseSubject: 'Choose a subject…',
      message: 'Message',
      writeMessage: 'Write a message',
      iAccept: 'I accept',
      termsAndConditions: 'Terms & Conditions',
      legalPrivacy: 'Legal & Privacy',
      sendMessage: 'Send message',
      successMessage: 'Your message has been sent. We will get back to you soon.',
      errorSend: 'Unable to send message. Please try again.',
      errorTerms: 'You must accept the Terms & Conditions and Legal & Privacy to send the form.',
      subjectGeneral: 'General inquiry',
      subjectSupport: 'Support',
      subjectFeedback: 'Feedback',
      subjectOther: 'Other',
    },
    breadcrumb: {
      result: 'Result',
      page: 'Page',
      legal: 'Legal',
    },
    blog: {
      listTitle: 'Blog',
      listIntro: 'Latest articles and updates.',
      readMore: 'Read more',
      noPosts: 'No blog posts yet.',
      emptyTitle: 'No articles yet',
      emptyBody:
        'No posts yet on CompressPDF.my — check back for bilingual PDF tips aimed at Malaysian teams. Explore the homepage for highlights or drop us a note via Contact.',
      backHome: 'Back to home',
      backToBlog: 'Back to blog',
    },
  },
  ms: msTranslations,
}

/** Public site default until the visitor picks another language (stored in localStorage). */
export const defaultLang = 'ms'

export const supportedLangs = ['ms', 'en']

/** URL prefix for a language: empty for default (ms), `/en` for English, etc. */
export function langPrefix(lang) {
  return lang === defaultLang ? '' : `/${lang}`
}

const OG_LOCALE_MAP = {
  ms: 'ms_MY',
  en: 'en_US',
}

export function langToOgLocale(lang) {
  return OG_LOCALE_MAP[lang] || lang || ''
}

/** Strings always resolve from English if missing in the active locale (avoids recursion when defaultLang is ms). */
const TRANSLATION_FALLBACK = 'en'

/** User-chosen UI language (persists across visits; survives refresh). */
const LOCALE_STORAGE_KEY = 'compresspdf_my_user_locale'

/** Legacy session hint from old geo detection — migrated once into localStorage. */
const LOCALE_HINT_KEY = 'compresspdf_my_locale_hint'
const LOCALE_HINT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function readUserLocalePreference() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (!raw) return null
    const lang = String(raw).trim().toLowerCase()
    return supportedLangs.includes(lang) ? lang : null
  } catch {
    return null
  }
}

export function writeUserLocalePreference(lang) {
  if (typeof localStorage === 'undefined') return
  if (!supportedLangs.includes(lang)) return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lang)
  } catch {
    /* private mode / quota */
  }
}

export function readLocaleHintCache() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LOCALE_HINT_KEY)
    if (!raw) return null
    const { lang, t } = JSON.parse(raw)
    if (typeof lang !== 'string' || typeof t !== 'number') return null
    if (Date.now() - t > LOCALE_HINT_TTL_MS) {
      sessionStorage.removeItem(LOCALE_HINT_KEY)
      return null
    }
    return supportedLangs.includes(lang) ? lang : null
  } catch {
    return null
  }
}

export function writeLocaleHintCache(lang) {
  if (typeof sessionStorage === 'undefined') return
  if (!supportedLangs.includes(lang)) return
  try {
    sessionStorage.setItem(LOCALE_HINT_KEY, JSON.stringify({ lang, t: Date.now() }))
  } catch {
    /* private mode */
  }
}

/** Language option for dropdown: flag emoji + label */
export const langOptions = {
  ms: { flag: '🇲🇾', label: 'Bahasa Melayu' },
  en: { flag: '🇬🇧', label: 'English' },
}

/** Map full browser locale tags to app lang (ISO 639-1). */
const BROWSER_LANG_ALIASES = {
  'ms-my': 'ms',
  ms: 'ms',
  'id-id': 'ms',
  'en-us': 'en',
  'en-gb': 'en',
}

/**
 * Browser language list only (no geo cache). Used inside async geo resolver.
 */
export function getPreferredLangFromBrowser() {
  if (typeof navigator === 'undefined') return defaultLang
  const locales = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language]
  for (const locale of locales) {
    const full = (locale || '').toLowerCase().replace(/_/g, '-')
    if (BROWSER_LANG_ALIASES[full]) return BROWSER_LANG_ALIASES[full]
    const code = full.split('-')[0]
    if (BROWSER_LANG_ALIASES[code]) return BROWSER_LANG_ALIASES[code]
    if (supportedLangs.includes(code)) return code
  }
  return defaultLang
}

/**
 * Preferred lang for redirects / invalid URL recovery:
 * 1) explicit user choice (localStorage)
 * 2) one-time migration from legacy session geo hint
 * 3) default Malay (no IP lookup — fast first paint)
 */
export function getPreferredLang() {
  if (typeof window === 'undefined') return defaultLang
  const stored = readUserLocalePreference()
  if (stored) return stored
  const legacy = readLocaleHintCache()
  if (legacy) {
    writeUserLocalePreference(legacy)
    try {
      sessionStorage.removeItem(LOCALE_HINT_KEY)
    } catch {
      /* ignore */
    }
    return legacy
  }
  return defaultLang
}

export function getTranslation(lang, keyPath) {
  const langData = translations[lang] ?? translations[TRANSLATION_FALLBACK]
  const keys = keyPath.split('.')
  let value = langData
  for (const k of keys) {
    value = value?.[k]
  }
  if (value !== undefined && value !== null) return value
  if (lang !== TRANSLATION_FALLBACK) return getTranslation(TRANSLATION_FALLBACK, keyPath)
  return keyPath
}
