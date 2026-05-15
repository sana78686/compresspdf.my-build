'use client'

import { useState, useCallback, useRef, useEffect, lazy, Suspense, startTransition, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/i18n/useTranslation'
import { langPrefix } from '@/i18n/translations'
import { usePathLang } from '@/hooks/usePathLang'
import {
  setSessionFiles,
  setSessionResults,
  getSessionFiles,
  getSessionResults,
  clearCompressionSession,
} from '@/lib/compress-session'
import JsonLd from '@/components/JsonLd'
import { cmsHtmlHasVisibleText } from '@/utils/cmsHtmlVisible'
import { patchCmsHtmlA11y, patchCmsHtmlImages, rewriteHtmlSiteOrigin, siteOriginFromEnv } from '@/lib/cms/html'
import { absolutizeCmsHtml } from '@/utils/cmsAssetUrl'

/** Served from /public/pdf.worker.min.mjs (copy from pdfjs-dist on install). */
const pdfWorkerUrl = '/pdf.worker.min.mjs'

/** CMS REST/cache helpers (~many KiB). Dynamic import keeps `/` off critical JS until fetch paths run. */
function loadCmsClient() {
  return import('@/lib/cms-client')
}

const LandingBelowFold = lazy(() => import('./LandingBelowFold'))

// Workaround for servers that serve .mjs as application/octet-stream: fetch worker as text
// and create a blob URL so the worker runs with correct MIME (works on live without Nginx fix).
let cachedWorkerBlobUrl = null
async function getPdfWorkerSrc() {
  if (cachedWorkerBlobUrl) return cachedWorkerBlobUrl
  try {
    const url = pdfWorkerUrl.startsWith('http') ? pdfWorkerUrl : `${window.location.origin}${pdfWorkerUrl}`
    const res = await fetch(url)
    const text = await res.text()
    const blob = new Blob([text], { type: 'application/javascript' })
    cachedWorkerBlobUrl = URL.createObjectURL(blob)
    return cachedWorkerBlobUrl
  } catch {
    return pdfWorkerUrl
  }
}

/** Run after first paint / when idle so file picker & navigation stay snappy. */
function scheduleIdle(callback, timeout = 2000) {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(callback, 0)
  return () => clearTimeout(id)
}

function scrollToAnchor(id) {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
  })
}

/** Scroll section into view then focus it (requires `tabIndex={-1}` on the element). */
function scrollAndFocusSection(id) {
  if (typeof window === 'undefined') return
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        /** `auto` avoids animated scroll reflow chains flagged as forced layout in Lighthouse */
        el?.scrollIntoView({ behavior: 'auto', block: 'start' })
        requestAnimationFrame(() => {
          el?.focus({ preventScroll: true })
        })
      })
    })
  })
}

const MAX_PDF_FILES = 10

/** Windows / some browsers omit MIME; accept by extension too. */
function isPdfFile(f) {
  const type = String(f?.type || '').toLowerCase()
  if (type === 'application/pdf' || type === 'application/x-pdf') return true
  return /\.pdf$/i.test(String(f?.name || ''))
}

/** Pretty-print a byte size. Pure function so it has zero impact on compression speed. */
function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(2)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

/** DPI and image quality must both be set to valid positive numbers before compress is enabled. */
function parseCompressionSettings(settings) {
  const d = parseFloat(String(settings.dpi ?? '').trim())
  const q = parseFloat(String(settings.imageQuality ?? '').trim())
  const dpiOk = Number.isFinite(d) && d > 0 && d >= 72 && d <= 300
  const qOk = Number.isFinite(q) && q > 0 && q <= 100
  return {
    dpi: dpiOk ? d : 144,
    qualityUnit: qOk ? q : 75,
    qualityFrac: qOk ? q / 100 : 0.75,
    valid: dpiOk && qOk,
  }
}

/** Target output size (KB). Empty string = no limit; otherwise iterative passes try to reach ≤ target. */
function parseTargetKb(raw) {
  const s = String(raw ?? '').trim()
  if (s === '') {
    return { kb: null, noLimit: true, valid: true }
  }
  const n = parseInt(s, 10)
  const valid = Number.isFinite(n) && n >= 10 && n <= 524288
  return { kb: valid ? n : null, noLimit: false, valid }
}

/** Balanced = current defaults + library `balanced`. Maximum = stronger preset + lower floors + more iterations. */
function getCompressionTuneParams(mode) {
  if (mode === 'maximum') {
    return {
      libraryPreset: 'max',
      minQ: 0.025,
      minDpi: 42,
      maxIterTarget: 44,
      maxIterRefinement: 26,
      qualityMult: 0.7,
      dpiStep: 34,
      stallAfterPoorIters: 4,
    }
  }
  return {
    libraryPreset: 'balanced',
    minQ: 0.06,
    minDpi: 72,
    maxIterTarget: 18,
    maxIterRefinement: 0,
    qualityMult: 0.76,
    dpiStep: 24,
    stallAfterPoorIters: 2,
  }
}

async function compressPdfOnce(compress, inputBuffer, dpi, jpegQualityFrac, onProgress, preset = 'balanced') {
  try {
    const result = await compress(inputBuffer, {
      preset,
      preserveMetadata: true,
      targetDPI: dpi,
      jpegQuality: jpegQualityFrac,
      gracefulDegradation: true,
      onProgress: onProgress ?? (() => {}),
    })
    return result?.pdf ?? null
  } catch {
    return null
  }
}

/**
 * @param {{
 *   homeCmsFromServer?: { html: string, jsonLd?: object | null },
 *   landingExtrasOnServer?: boolean,
 *   hideLandingCompressor?: boolean,
 *   cmsPageTitle?: string,
 *   suppressHeroH1?: boolean,
 *   embedCompressWithoutClientHero?: boolean,
 *   nestedUnderServerHeroSection?: boolean,
 * }} props
 * `hideLandingCompressor`: marketing-only home — hero text without upload/settings/results (PDFCompressor.us).
 */
export default function HomePageClient({
  homeCmsFromServer,
  landingExtrasOnServer = false,
  hideLandingCompressor = false,
  cmsPageTitle,
  suppressHeroH1 = false,
  embedCompressWithoutClientHero = false,
  nestedUnderServerHeroSection = false,
} = {}) {
  const lang = usePathLang()
  const pathname = usePathname() || '/'
  const t = useTranslation(lang)
  const lp = langPrefix(lang)
  const isHomePath = pathname === `${lp}/` || pathname === lp
  const hasCmsPageTitle = typeof cmsPageTitle === 'string' && cmsPageTitle.trim() !== ''
  const showCompressUi = isHomePath || hasCmsPageTitle || embedCompressWithoutClientHero
  const skipClientLandingExtras = Boolean(landingExtrasOnServer && isHomePath)
  const heroH1Text = hasCmsPageTitle ? cmsPageTitle.trim() : t('seoHeroH1')

  const COLOR_OPTIONS = [
    { value: 'no-change', label: t('colorNoChange') },
    { value: 'gray', label: t('colorGray') },
  ]

  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [settings, setSettings] = useState({
    dpi: '144',
    imageQuality: '75',
    color: 'no-change',
    compressionMode: 'balanced',
  })
  /** Optional max output size per file (KB). Blank = same behavior as before (no size targeting). */
  const [targetSizeKb, setTargetSizeKb] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState({ message: '', percent: 0 })
  const [progressVisible, setProgressVisible] = useState(false)
  const [compressFileRows, setCompressFileRows] = useState([])
  const [error, setError] = useState(null)
  /** @type {Array<{ blob: Blob, fileName: string, originalSize: number, newSize: number, percentageSaved: number }> | null} */
  const [compressionResults, setCompressionResults] = useState(null)
  const fileInputRef = useRef(null)
  /** Latest file list for handlers — sync with React state for compression runs. */
  const filesRef = useRef([])
  const dragDepthRef = useRef(0)
  const [showBelowFold, setShowBelowFold] = useState(false)
  const [landingCards, setLandingCards] = useState([])
  /** Optional CMS “how it works” block from home-cards when no dynamic sections */
  const [howSection, setHowSection] = useState(null)
  /** CMS “Home page” rich text — SSR on `/`, else client fetch on landing */
  const [cmsHomeHtml, setCmsHomeHtml] = useState(() =>
    homeCmsFromServer ? String(homeCmsFromServer.html ?? '') : '',
  )
  const [cmsSections, setCmsSections] = useState([])
  const [homeJsonLd, setHomeJsonLd] = useState(() =>
    homeCmsFromServer && homeCmsFromServer.jsonLd != null ? homeCmsFromServer.jsonLd : null,
  )
  const [toolJsonLd, setToolJsonLd] = useState(null)

  const showSettingsSection = showCompressUi && files.length > 0
  const showResultsSection = showCompressUi && compressionResults?.length > 0
  const toolEngaged = showCompressUi && (files.length > 0 || compressionResults?.length > 0)

  const parsedSettings = useMemo(() => parseCompressionSettings(settings), [settings.dpi, settings.imageQuality])
  const parsedTargetKb = useMemo(() => parseTargetKb(targetSizeKb), [targetSizeKb])
  const canCompress = parsedSettings.valid && parsedTargetKb.valid && files.length > 0

  /** After upload, section mounts async — focus in effect. */
  const pendingFocusSettingsRef = useRef(false)
  /** After successful compress only — avoid focusing results on session restore. */
  const pendingFocusResultsRef = useRef(false)

  useEffect(() => {
    if (!pendingFocusSettingsRef.current || files.length === 0) return
    pendingFocusSettingsRef.current = false
    scrollAndFocusSection('compress-settings')
  }, [files.length])

  useEffect(() => {
    if (!pendingFocusResultsRef.current || !compressionResults?.length) return
    pendingFocusResultsRef.current = false
    scrollAndFocusSection('compress-results')
  }, [compressionResults])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  /* Warm pdf.js + jspdf + worker while user adjusts DPI (first Compress click avoids cold import). */
  useEffect(() => {
    if (!(showCompressUi && files.length > 0)) return undefined
    let cancelled = false
    const cancel = scheduleIdle(() => {
      void Promise.all([import('pdfjs-dist'), import('jspdf')]).then(() => {
        if (!cancelled) void getPdfWorkerSrc()
      })
    }, 1200)
    return () => {
      cancelled = true
      cancel()
    }
  }, [showCompressUi, files.length])

  const publicPathForSeo = pathname.split('?')[0] || '/'

  /* Home landing: fetch CMS home HTML only when not already SSR. */
  useEffect(() => {
    if (!isHomePath) return undefined
    if (homeCmsFromServer !== undefined) return undefined
    let cancelled = false
    void loadCmsClient()
      .then(({ getHomePageContent }) => getHomePageContent(lang, publicPathForSeo))
      .then((res) => {
        if (cancelled) return
        const raw = typeof res?.content === 'string' ? res.content : ''
        const prepared = rewriteHtmlSiteOrigin(
          patchCmsHtmlA11y(patchCmsHtmlImages(absolutizeCmsHtml(raw))),
          siteOriginFromEnv(),
        )
        setCmsHomeHtml(prepared)
        const graph = res?.json_ld?.['@graph']
        setHomeJsonLd(Array.isArray(graph) && graph.length > 0 ? res.json_ld : null)
      })
      .catch(() => {
        if (!cancelled) {
          setCmsHomeHtml('')
          setHomeJsonLd(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isHomePath, lang, publicPathForSeo, homeCmsFromServer])

  useEffect(() => {
    if (!(showCompressUi && files.length > 0)) {
      setToolJsonLd(null)
      return undefined
    }
    let cancelled = false
    const cancel = scheduleIdle(() => {
      void loadCmsClient()
        .then(({ getToolSchemaJsonLd }) => getToolSchemaJsonLd(lang, publicPathForSeo))
        .then((res) => {
          if (cancelled) return
          const graph = res?.json_ld?.['@graph']
          setToolJsonLd(Array.isArray(graph) && graph.length > 0 ? res.json_ld : null)
        })
        .catch(() => {
          if (!cancelled) setToolJsonLd(null)
        })
    }, 2500)
    return () => {
      cancelled = true
      cancel()
    }
  }, [showCompressUi, files.length, lang, publicPathForSeo])

  /* Fetch cards / sections when below-the-fold is shown */
  useEffect(() => {
    if (skipClientLandingExtras) return undefined
    if (!showBelowFold) return
    let cancelled = false
    void loadCmsClient()
      .then(({ getHomeCards, getSections }) =>
        Promise.all([
          getHomeCards(lang).catch(() => ({ cards: [] })),
          getSections(lang).catch(() => ({ sections: [] })),
        ]),
      )
      .then(([cardsRes, sectionsRes]) => {
        if (cancelled) return
        setLandingCards(Array.isArray(cardsRes.cards) ? cardsRes.cards : [])
        setHowSection(cardsRes?.section && typeof cardsRes.section === 'object' ? cardsRes.section : null)
        setCmsSections(Array.isArray(sectionsRes.sections) ? sectionsRes.sections : [])
      })
      .catch(() => {
        if (cancelled) return
        setLandingCards([])
        setHowSection(null)
        setCmsSections([])
      })
    return () => { cancelled = true }
  }, [showBelowFold, lang, skipClientLandingExtras])

  /* Defer below-the-fold content to reduce TBT on mobile (Lighthouse Performance) */
  useEffect(() => {
    if (!isHomePath) return undefined
    if (skipClientLandingExtras) return undefined
    const schedule = () => startTransition(() => setShowBelowFold(true))
    const id =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(schedule, { timeout: 1500 })
        : setTimeout(schedule, 100)
    return () => (typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback(id) : clearTimeout(id))
  }, [isHomePath, skipClientLandingExtras])

  /* Do NOT sync files/results from React state into compress-session on every render:
   * a new route mount starts with files=[] and would clear the session before hydrate runs. */

  /* Restore PDF list / results from sessionStorage when opening home. */
  useEffect(() => {
    if (!showCompressUi) return undefined
    if (files.length === 0) {
      const sf = getSessionFiles()
      if (sf.length) {
        filesRef.current = sf
        setFiles(sf)
      }
    }
    if (!compressionResults?.length) {
      const sr = getSessionResults()
      if (sr?.length) setCompressionResults(sr)
    }
  }, [showCompressUi])

  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []).filter(isPdfFile)
    if (!selected.length) {
      e.target.value = ''
      return
    }
    const prev = filesRef.current
    const room = MAX_PDF_FILES - prev.length
    if (room <= 0) {
      setError(t('maxFilesReached'))
      e.target.value = ''
      return
    }
    const toAdd = selected.slice(0, room)
    if (selected.length > toAdd.length) setError(t('maxFilesPartial'))
    else setError(null)
    const merged = [...prev, ...toAdd]
    setSessionFiles(merged)
    filesRef.current = merged
    startTransition(() => setFiles(merged))
    pendingFocusSettingsRef.current = true
    e.target.value = ''
  }, [t])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files || []).filter(isPdfFile)
    if (!dropped.length) return
    const prev = filesRef.current
    const room = MAX_PDF_FILES - prev.length
    if (room <= 0) {
      setError(t('maxFilesReached'))
      return
    }
    const toAdd = dropped.slice(0, room)
    if (dropped.length > toAdd.length) setError(t('maxFilesPartial'))
    else setError(null)
    const merged = [...prev, ...toAdd]
    setSessionFiles(merged)
    filesRef.current = merged
    startTransition(() => setFiles(merged))
    pendingFocusSettingsRef.current = true
  }, [t])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current += 1
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDragging(false)
    }
  }, [])

  const removeFile = (index) => {
    const next = files.filter((_, i) => i !== index)
    filesRef.current = next
    setFiles(next)
    if (!next.length) {
      clearCompressionSession()
      setCompressionResults(null)
    } else {
      setSessionFiles(next)
    }
  }

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Load PDF via object URL so the worker fetches it — avoids transferring ArrayBuffer (detached buffer error)
  const loadPdfFromUrl = async (pdfjsLib, url) => {
    const pdf = await pdfjsLib.getDocument({ url }).promise
    return pdf
  }

  const applyGrayscaleToPdf = async (arrayBuffer, dpi, qualityFrac) => {
    const [pdfjsLib, { jsPDF }] = await Promise.all([
      import('pdfjs-dist'),
      import('jspdf'),
    ])
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc()
    }
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    try {
      const pdf = await loadPdfFromUrl(pdfjsLib, url)
      const numPages = pdf.numPages
      const doc = new jsPDF({ unit: 'px', compress: true })
      const scale = Math.min(2, dpi / 72)
      const quality = qualityFrac

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data
        for (let j = 0; j < data.length; j += 4) {
          const g = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]
          data[j] = data[j + 1] = data[j + 2] = g
        }
        ctx.putImageData(imgData, 0, 0)
        const dataUrl = String(canvas.toDataURL('image/jpeg', quality))
        const w = Number(viewport.width)
        const h = Number(viewport.height)
        if (i > 1) {
          doc.addPage([w, h])
        } else {
          doc.addPage([w, h])
          doc.deletePage(1)
        }
        doc.addImage(dataUrl, 'JPEG', 0, 0, w, h, undefined, 'FAST')
      }
      return doc.output('arraybuffer')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const runCompress = async () => {
    /** Same file list as UI (ref is authoritative; matches compressedPDF-react SPA state). */
    const fileList = filesRef.current.length ? filesRef.current : files
    if (!fileList.length || !parsedSettings.valid || !parsedTargetKb.valid) return
    setError(null)
    setCompressionResults(null)
    setSessionResults(null)
    setIsCompressing(true)
    setProgressVisible(false)
    setProgress({ message: t('progressInitializing'), percent: 0 })
    setCompressFileRows(fileList.map((f) => ({ name: f.name, status: 'waiting' })))

    const targetBytes =
      parsedTargetKb.noLimit || parsedTargetKb.kb == null ? null : parsedTargetKb.kb * 1024

    const tune = getCompressionTuneParams(settings.compressionMode === 'maximum' ? 'maximum' : 'balanced')

    const dpi = parsedSettings.dpi
    const quality = parsedSettings.qualityFrac
    const colorIsGray = settings.color === 'gray'
    const nFiles = fileList.length

    const showBarTimer = typeof window !== 'undefined'
      ? window.setTimeout(() => setProgressVisible(true), 220)
      : 0

    try {
      /**
       * @quicktoolsone/pdf-compress — preset `balanced` (default) or library `max` for strongest squeeze.
       * Maximum mode also lowers JPEG/DPI floors and runs extra refinement when no KB target is set.
       */
      const { compress } = await import('@quicktoolsone/pdf-compress')

      const results = []

      for (let fi = 0; fi < nFiles; fi++) {
        const file = fileList[fi]
        const originalSize = file.size
        const baseName = String(file.name || 'document').replace(/\.pdf$/i, '')

        setCompressFileRows((rows) => rows.map((row, i) => ({
          ...row,
          status: i < fi ? 'done' : i === fi ? 'active' : 'waiting',
        })))
        setProgress({
          message: t('compressFileProgress', { current: fi + 1, total: nFiles, name: file.name }),
          percent: Math.round((fi / Math.max(nFiles, 1)) * 100),
        })

        const inputBuffer = await file.arrayBuffer()

        const onPassProgress = (event) => {
          const base = fi / nFiles
          const fileFrac = (typeof event?.progress === 'number' ? event.progress : 0) / 100 / nFiles
          setProgress({
            message: event?.message
              ? `${event.message} — ${file.name}`
              : `${t('progressPage')} — ${file.name}`,
            percent: Math.min(99, Math.round((base + fileFrac) * 100)),
          })
        }

        /** Pass 1 + preset (`balanced` vs library `max`); tuneDpi/tuneQ track last aggressive settings for grayscale. */
        let tuneDpi = dpi
        let tuneQ = quality
        let compressedBuffer = await compressPdfOnce(
          compress,
          inputBuffer,
          dpi,
          quality,
          onPassProgress,
          tune.libraryPreset,
        )

        if (
          compressedBuffer != null
          && targetBytes != null
          && compressedBuffer.byteLength > targetBytes
          && originalSize > targetBytes
        ) {
          let q = quality
          let d = dpi
          let best = compressedBuffer
          for (let iter = 0; iter < tune.maxIterTarget && best.byteLength > targetBytes; iter++) {
            setProgress({
              message: t('progressShrinkingTarget', { name: file.name }),
              percent: Math.min(99, Math.round(((fi + 0.35) / nFiles) * 100)),
            })
            const prevLen = best.byteLength
            if (q > tune.minQ + 0.03) {
              q = Math.max(tune.minQ, q * tune.qualityMult)
            } else {
              d = Math.max(tune.minDpi, d - tune.dpiStep)
            }
            const next = await compressPdfOnce(compress, inputBuffer, d, q, undefined, tune.libraryPreset)
            if (!next) break
            if (next.byteLength < best.byteLength) {
              best = next
              tuneDpi = d
              tuneQ = q
            }
            if (best.byteLength <= targetBytes) break
            if (iter > tune.stallAfterPoorIters && next.byteLength >= prevLen) break
          }
          compressedBuffer = best
        }

        /** Maximum mode only: extra shrinking passes when no explicit KB target (balanced skips via maxIterRefinement 0). */
        if (
          tune.maxIterRefinement > 0
          && compressedBuffer != null
          && targetBytes == null
          && compressedBuffer.byteLength < originalSize
        ) {
          let q = tuneQ
          let d = tuneDpi
          let best = compressedBuffer
          let poorStreak = 0
          for (let iter = 0; iter < tune.maxIterRefinement; iter++) {
            setProgress({
              message: t('progressMaximumRefine', { name: file.name }),
              percent: Math.min(99, Math.round(((fi + 0.42) / nFiles) * 100)),
            })
            const prevBest = best.byteLength
            if (q > tune.minQ + 0.02) {
              q = Math.max(tune.minQ, q * tune.qualityMult)
            } else {
              d = Math.max(tune.minDpi, d - tune.dpiStep)
            }
            const next = await compressPdfOnce(compress, inputBuffer, d, q, undefined, tune.libraryPreset)
            if (!next) break
            if (next.byteLength < best.byteLength - 256) {
              best = next
              tuneDpi = d
              tuneQ = q
              poorStreak = 0
            } else {
              poorStreak += 1
              if (poorStreak >= tune.stallAfterPoorIters) break
            }
            if (iter > tune.stallAfterPoorIters && next.byteLength >= prevBest * 0.999) break
          }
          compressedBuffer = best
        }

        /** Optional grayscale post-process. Only keep it if it actually helps the size. */
        if (compressedBuffer && colorIsGray) {
          setProgress({
            message: t('progressGrayscale'),
            percent: Math.min(99, Math.round(((fi + 0.9) / nFiles) * 100)),
          })
          try {
            const grayBuffer = await applyGrayscaleToPdf(compressedBuffer, tuneDpi, tuneQ)
            if (grayBuffer && grayBuffer.byteLength < compressedBuffer.byteLength) {
              compressedBuffer = grayBuffer
            }
          } catch {
            /* keep color output if grayscale step fails */
          }
        }

        const compressedSize = compressedBuffer ? compressedBuffer.byteLength : Number.POSITIVE_INFINITY
        const alreadyOptimized = !compressedBuffer || compressedSize >= originalSize
        const finalBuffer = alreadyOptimized ? inputBuffer : compressedBuffer
        const finalSize = alreadyOptimized ? originalSize : compressedSize
        const finalName = alreadyOptimized ? `${baseName}.pdf` : `${baseName}-compressed.pdf`
        const percentageSaved = alreadyOptimized
          ? 0
          : originalSize > 0
            ? (1 - finalSize / originalSize) * 100
            : 0
        const requestedTargetKb = parsedTargetKb.noLimit ? null : parsedTargetKb.kb
        results.push({
          blob: new Blob([finalBuffer], { type: 'application/pdf' }),
          fileName: finalName,
          originalSize,
          newSize: finalSize,
          percentageSaved,
          alreadyOptimized,
          requestedTargetKb,
          targetKbNotReached: targetBytes != null && finalSize > targetBytes,
        })

        setCompressFileRows((rows) => rows.map((row, i) => ({
          ...row,
          status: i <= fi ? 'done' : 'waiting',
        })))
      }

      setProgress({ message: t('progressFinalizing'), percent: 100 })
      pendingFocusResultsRef.current = true
      setCompressionResults(results)
      setSessionFiles(fileList)
      setSessionResults(results)
    } catch (err) {
      const msg = err?.message != null ? String(err.message) : ''
      const cause = err?.underlyingError?.message ?? err?.cause?.message
      const causeStr = cause != null ? String(cause) : ''
      const message = causeStr
        ? `${msg || 'Compression failed'}: ${causeStr}`
        : (msg || 'Compression failed. Please try again.')
      setError(message)
    } finally {
      if (showBarTimer) clearTimeout(showBarTimer)
      setProgressVisible(false)
      setIsCompressing(false)
      setProgress({ message: '', percent: 0 })
      setCompressFileRows([])
    }
  }

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadOne = (blob, fileName) => {
    downloadBlob(blob, fileName)
  }

  const handleDownload = () => {
    if (!compressionResults?.length) return
    if (compressionResults.length === 1) {
      downloadBlob(compressionResults[0].blob, compressionResults[0].fileName)
      return
    }
    compressionResults.forEach((r) => downloadBlob(r.blob, r.fileName))
  }

  const handlePreview = () => {
    const first = compressionResults?.[0]
    if (!first?.blob) return
    const url = URL.createObjectURL(first.blob)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleErase = () => {
    setCompressionResults(null)
    setSessionResults(null)
    scrollAndFocusSection('compress-settings')
  }

  const handleRestart = () => {
    clearCompressionSession()
    filesRef.current = []
    setCompressionResults(null)
    setFiles([])
    setError(null)
    scrollToAnchor('compress-tool')
  }

  const missedTargetKbResults = useMemo(
    () => (compressionResults ?? []).filter((r) => r.targetKbNotReached),
    [compressionResults],
  )

  const uploadZoneEl = (
    <div
      className={`cp-my-upload-zone ${isDragging ? 'cp-my-upload-zone--dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <div className="cp-my-upload-actions cp-my-landing-upload-cta">
        <button
          type="button"
          className="cp-my-btn-select-pdf"
          onClick={triggerFileInput}
          aria-label={t('ariaSelectPdf')}
        >
          {t('selectPdf')}
        </button>
      </div>
      <p
        className="cp-my-upload-hint"
        role="button"
        tabIndex={0}
        onClick={triggerFileInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            triggerFileInput()
          }
        }}
      >
        {t('orDrop')}
      </p>
    </div>
  )

  const readySubtitleEl = (
    <p id="landing-select-heading" className="cp-my-landing-upload-heading">
      {t('landing.readySubtitle')}
    </p>
  )

  if (hideLandingCompressor && isHomePath) {
    return (
      <>
        <JsonLd data={homeJsonLd} />
        <div id="main-content-inner" className="cp-my-main cp-my-main--landing" tabIndex={-1}>
          <section
            className="cp-my-landing-upload-section cp-my-landing-upload-section--first"
            aria-labelledby="landing-upload-h1"
          >
            <h1 id="landing-upload-h1" className="cp-my-landing-upload-h1">
              {t('seoHeroH1')}
            </h1>
            <p id="landing-select-heading" className="cp-my-landing-upload-heading">
              {t('subtitle')}
            </p>
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <JsonLd data={toolEngaged ? toolJsonLd : isHomePath ? homeJsonLd : null} />
      <div id="main-content-inner" className="cp-my-main cp-my-main--landing" tabIndex={-1}>
        <input
          ref={fileInputRef}
          id="pdf-file-input"
          type="file"
          accept=".pdf,application/pdf,application/x-pdf"
          multiple
          onChange={handleFileSelect}
          className="sr-only"
          aria-label={t('ariaSelectPdf')}
        />

        {showCompressUi && (
          <>
            {suppressHeroH1 && nestedUnderServerHeroSection ? (
              <>
                {readySubtitleEl}
                {uploadZoneEl}
              </>
            ) : suppressHeroH1 ? (
              <section
                id="compress-tool"
                className="cp-my-landing-upload-section cp-my-landing-upload-section--first"
                aria-labelledby="landing-select-heading"
              >
                {readySubtitleEl}
                {uploadZoneEl}
              </section>
            ) : (
              <section
                id="compress-tool"
                className="cp-my-landing-upload-section cp-my-landing-upload-section--first"
                aria-labelledby="landing-upload-h1"
              >
                <h1 id="landing-upload-h1" className="cp-my-landing-upload-h1">
                  {heroH1Text}
                </h1>
                {readySubtitleEl}
                {uploadZoneEl}
              </section>
            )}

        {/* Step 2: Settings + file list */}
            {showSettingsSection && (
              <section
                id="compress-settings"
                className="cp-my-step-settings"
                aria-labelledby="compress-settings-h2"
                tabIndex={-1}
              >
                <h2 id="compress-settings-h2" className="cp-my-compress-step-heading">{t('compressionSettings')}</h2>
            <div
              className={`cp-my-file-display-zone ${isDragging ? 'cp-my-file-display-zone--dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className="cp-my-file-display-header">
                <span className="cp-my-file-badge">{t('fileProtection')}</span>
                <button
                  type="button"
                  className={`cp-my-link-add-more ${files.length >= MAX_PDF_FILES ? 'cp-my-link-add-more--disabled' : ''}`}
                  onClick={triggerFileInput}
                  disabled={files.length >= MAX_PDF_FILES}
                >
                  {t('addMoreFiles')}
                </button>
              </div>
              <p className="cp-my-file-count-hint" role="status">
                {t('fileCountHint', { count: String(files.length), max: String(MAX_PDF_FILES) })}
              </p>
              <ul className="cp-my-file-cards">
                {files.map((file, i) => (
                  <li key={`${file.name}-${file.lastModified}-${i}`} className="cp-my-file-card">
                    <div className="cp-my-file-card-preview">
                      <span className="file-card-icon">PDF</span>
                    </div>
                    <span className="cp-my-file-card-name" title={file.name}>{file.name}</span>
                    <button
                      type="button"
                      className="cp-my-file-card-remove"
                      onClick={() => removeFile(i)}
                      aria-label={`${t('ariaRemove')} ${file.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                        <line x1="10" y1="15" x2="14" y2="15" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="cp-my-settings-row">
                <label className="cp-my-setting-label">
                  <span>{t('dpi')}</span>
                  <input
                    type="number"
                    min="72"
                    max="300"
                    inputMode="numeric"
                    placeholder="72–300"
                    value={settings.dpi}
                    onChange={(e) => setSettings((s) => ({ ...s, dpi: e.target.value }))}
                    className="cp-my-setting-input"
                    aria-invalid={!parsedSettings.valid}
                  />
                </label>
                <label className="cp-my-setting-label">
                  <span>{t('imageQuality')}</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    inputMode="numeric"
                    placeholder="1–100"
                    value={settings.imageQuality}
                    onChange={(e) => setSettings((s) => ({ ...s, imageQuality: e.target.value }))}
                    className="cp-my-setting-input"
                    aria-invalid={!parsedSettings.valid}
                  />
                  <span className="cp-my-setting-suffix">%</span>
                </label>
                <label className="cp-my-setting-label">
                  <span>{t('color')}</span>
                  <select
                    value={settings.color}
                    onChange={(e) => setSettings((s) => ({ ...s, color: e.target.value }))}
                    className="cp-my-setting-select"
                    aria-label={t('ariaColorMode')}
                  >
                    {COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="cp-my-compression-mode-fieldset">
                <legend id="compression-mode-legend" className="cp-my-compression-mode-legend">
                  {t('compressionModeLegend')}
                </legend>
                <div className="cp-my-compression-mode-options" role="radiogroup" aria-labelledby="compression-mode-legend">
                  <label className="cp-my-compression-mode-option">
                    <input
                      type="radio"
                      name="compression-mode"
                      value="balanced"
                      checked={settings.compressionMode !== 'maximum'}
                      onChange={() => setSettings((s) => ({ ...s, compressionMode: 'balanced' }))}
                    />
                    <span>{t('compressionModeBalanced')}</span>
                  </label>
                  <label className="cp-my-compression-mode-option">
                    <input
                      type="radio"
                      name="compression-mode"
                      value="maximum"
                      checked={settings.compressionMode === 'maximum'}
                      onChange={() => setSettings((s) => ({ ...s, compressionMode: 'maximum' }))}
                    />
                    <span>{t('compressionModeMaximum')}</span>
                  </label>
                </div>
              </fieldset>
              {settings.compressionMode === 'maximum' && (
                <div id="compression-mode-warn" className="cp-my-compression-mode-warning" role="alert">
                  <p>{t('compressionModeMaximumWarn')}</p>
                </div>
              )}

              <div className="cp-my-settings-target-kb-block">
                <div className="cp-my-landing-target-kb-row cp-my-settings-target-kb-row">
                  <label htmlFor="settings-target-kb-input" className="cp-my-landing-target-kb-label">
                    {t('targetPdfSizeKb')}
                  </label>
                  <div className="cp-my-landing-target-kb-input-wrap">
                    <input
                      id="settings-target-kb-input"
                      type="number"
                      min={10}
                      max={524288}
                      inputMode="numeric"
                      className="cp-my-landing-target-kb-input"
                      placeholder={t('targetKbPlaceholder')}
                      value={targetSizeKb}
                      onChange={(e) => setTargetSizeKb(e.target.value)}
                      aria-invalid={!parsedTargetKb.valid}
                      aria-describedby="compress-settings-target-kb-note"
                    />
                    <span className="cp-my-landing-target-kb-unit" aria-hidden="true">
                      Kb
                    </span>
                  </div>
                </div>
                {!parsedTargetKb.valid && !parsedTargetKb.noLimit && (
                  <p className="cp-my-landing-target-kb-hint" role="note">
                    {t('targetKbHint')}
                  </p>
                )}
                <p id="compress-settings-target-kb-note" className="cp-my-landing-target-kb-note">
                  {t('compressTenPdfNote')}
                </p>
              </div>
              {!parsedSettings.valid && (
                <p className="cp-my-settings-hint" role="note">{t('settingsRequiredHint')}</p>
              )}
              <button
                type="button"
                className="cp-my-btn-compress-large"
                onClick={runCompress}
                disabled={isCompressing || !canCompress}
              >
                {isCompressing ? t('compressing') : t('compress')}
              </button>
            </div>
            {isCompressing && (
              <div className="cp-my-compress-progress-wrap" aria-live="polite">
                {progressVisible && (
                  <div className="cp-my-compress-progress-bar-track" aria-hidden="true">
                    <div
                      className="cp-my-compress-progress-bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
                    />
                  </div>
                )}
                {progress.message && (
                  <p className="cp-my-progress-message" role="status">{progress.message}</p>
                )}
                {compressFileRows.length > 0 && (
                  <ul className="cp-my-compress-file-progress-list">
                    {compressFileRows.map((row, idx) => (
                      <li
                        key={`${row.name}-${idx}`}
                        className={`cp-my-compress-file-progress-item cp-my-compress-file-progress-item--${row.status}`}
                      >
                        <span className="cp-my-compress-file-progress-status" aria-hidden="true">
                          {row.status === 'done' ? '✓' : row.status === 'active' ? '…' : '○'}
                        </span>
                        <span className="cp-my-compress-file-progress-name">{row.name}</span>
                        {row.status === 'done' && <span className="cp-my-compress-file-progress-label">{t('fileDone')}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {/* Step 3: Result + actions */}
            {showResultsSection && compressionResults && compressionResults.length > 0 && (
              <section
                id="compress-results"
                className="cp-my-step-result"
                aria-labelledby="compress-results-h2"
                tabIndex={-1}
              >
                <h2 id="compress-results-h2" className="cp-my-compress-step-heading">{t('compressionResult')}</h2>
            <div className="cp-my-result-banner">
              <span className="cp-my-result-settings">
                {t('compressionModeShort')}:{' '}
                {settings.compressionMode === 'maximum'
                  ? t('compressionModeMaximumBanner')
                  : t('compressionModeBalancedBanner')}
                {' · '}
                {t('dpi')}: {settings.dpi || '—'}, {t('imageQuality')}: {settings.imageQuality ? `${settings.imageQuality}%` : '—'}, {t('color')}: {settings.color === 'gray' ? t('colorGray') : t('colorNoChange')}
              </span>
            </div>
            {missedTargetKbResults.length > 0 && (
              <div className="cp-my-result-target-miss" role="region" aria-label={t('targetKbMissedAria')}>
                {missedTargetKbResults.length === 1 ? (
                  <p className="cp-my-result-target-miss-text">
                    {t('targetKbNotReachedSingle', {
                      target: String(missedTargetKbResults[0].requestedTargetKb ?? ''),
                      actual: formatBytes(missedTargetKbResults[0].newSize),
                    })}
                  </p>
                ) : (
                  <>
                    <p className="cp-my-result-target-miss-lead">{t('targetKbNotReachedMultiLead')}</p>
                    <ul className="cp-my-result-target-miss-list">
                      {missedTargetKbResults.map((r, idx) => (
                        <li key={`${r.fileName}-${idx}`}>
                          {t('targetKbNotReachedRow', {
                            name: r.fileName,
                            target: String(r.requestedTargetKb ?? ''),
                            actual: formatBytes(r.newSize),
                          })}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="cp-my-result-target-miss-text cp-my-result-target-miss-text--reason">{t('targetKbNotReachedReason')}</p>
              </div>
            )}
            {compressionResults.length === 1 ? (
              <>
                <p className="cp-my-result-title">
                  {compressionResults[0].alreadyOptimized ? (
                    <span>Already optimized — original file kept.</span>
                  ) : (
                    <>
                      {t('resultReduced')}{' '}
                      <strong>{compressionResults[0].percentageSaved?.toFixed(2) ?? 0}%</strong>.
                    </>
                  )}
                </p>
                <p className="cp-my-result-filename">
                  {compressionResults[0].fileName}
                </p>
                <p className="cp-my-result-size-line">
                  {compressionResults[0].alreadyOptimized ? (
                    <span className="cp-my-result-size-after">{formatBytes(compressionResults[0].originalSize)}</span>
                  ) : (
                    <>
                      <span className="cp-my-result-size-before">{formatBytes(compressionResults[0].originalSize)}</span>
                      <span className="cp-my-result-size-arrow" aria-hidden="true"> → </span>
                      <span className="cp-my-result-size-after">{formatBytes(compressionResults[0].newSize)}</span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="cp-my-result-title">{t('resultMultiTitle')}</p>
                <ul className="cp-my-result-multi-list">
                  {compressionResults.map((r, idx) => (
                    <li key={`${r.fileName}-${idx}`} className="cp-my-result-multi-row">
                      <div className="cp-my-result-multi-info">
                        <span className="cp-my-result-multi-name">{r.fileName}</span>
                        <span className="cp-my-result-multi-meta">
                          {r.alreadyOptimized ? (
                            <>
                              <span className="cp-my-result-size-after">{formatBytes(r.originalSize)}</span>
                              {' · already optimized'}
                            </>
                          ) : (
                            <>
                              <span className="cp-my-result-size-before">{formatBytes(r.originalSize)}</span>
                              <span className="cp-my-result-size-arrow" aria-hidden="true"> → </span>
                              <span className="cp-my-result-size-after">{formatBytes(r.newSize)}</span>
                              {' · '}
                              {r.percentageSaved?.toFixed(1) ?? 0}% {t('resultSavedSuffix')}
                            </>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cp-my-btn-action cp-my-btn-download cp-my-btn-download--compact"
                        onClick={() => handleDownloadOne(r.blob, r.fileName)}
                      >
                        {t('download')}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="cp-my-result-actions">
              {compressionResults.length > 1 && (
                <button type="button" className="cp-my-btn-action cp-my-btn-download" onClick={handleDownload}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  {t('downloadAll')}
                </button>
              )}
              {compressionResults.length === 1 && (
                <>
                  <button type="button" className="cp-my-btn-action cp-my-btn-download" onClick={handleDownload}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {t('download')}
                  </button>
                  <button type="button" className="cp-my-btn-action cp-my-btn-preview" onClick={handlePreview}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('preview')}
                  </button>
                </>
              )}
              <button type="button" className="cp-my-btn-action cp-my-btn-erase" onClick={handleErase}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
                {t('erase')}
              </button>
              <button type="button" className="cp-my-btn-action cp-my-btn-restart" onClick={handleRestart}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                {t('restart')}
              </button>
            </div>
            {compressionResults.length === 1 && (
              <div className="cp-my-result-share">
                <span className="cp-my-result-share-label">{t('shareOrContinue')}</span>
                <div className="cp-my-result-share-btns">
                  <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="cp-my-share-btn" aria-label={t('googleDrive')}>
                    <span className="cp-my-share-icon cp-my-gdrive" aria-hidden="true">G</span>
                    <span>{t('googleDrive')}</span>
                  </a>
                  <a href="https://dropbox.com" target="_blank" rel="noopener noreferrer" className="cp-my-share-btn" aria-label={t('dropbox')}>
                    <span className="cp-my-share-icon cp-my-dropbox" aria-hidden="true">D</span>
                    <span>{t('dropbox')}</span>
                  </a>
                  <a href="#" className="cp-my-share-btn" aria-label={t('email')} onClick={(e) => { e.preventDefault(); window.location.href = `mailto:?subject=${encodeURIComponent(t('mailSubject'))}&body=${encodeURIComponent(`${t('mailBody')} ${compressionResults[0].fileName}`)}`; }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>{t('email')}</span>
                  </a>
                </div>
              </div>
            )}
          </section>
            )}
          </>
        )}

        {isHomePath && (
          <>
            {homeCmsFromServer === undefined &&
              cmsHtmlHasVisibleText(cmsHomeHtml) && (
              <section
                className="cp-my-landing-cms-body-section"
                aria-label={t('landing.cmsSectionAria')}
              >
                <div
                  className="cp-my-cms-home-cms-body cp-my-cms-page-content"
                  dangerouslySetInnerHTML={{ __html: cmsHomeHtml }}
                />
              </section>
            )}

            {!skipClientLandingExtras && showBelowFold && (
              <Suspense fallback={null}>
                <LandingBelowFold t={t} cards={landingCards} howSection={howSection} sections={cmsSections} />
              </Suspense>
            )}
          </>
        )}

        {error && (
          <div className="cp-my-message cp-my-message--error" role="alert">
            {error}
          </div>
        )}

      </div>
    </>
  )
}
