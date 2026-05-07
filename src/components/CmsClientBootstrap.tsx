'use client'

import { useEffect } from 'react'

/**
 * Optional client-side CMS revision polling.
 *
 * Disabled by default because:
 *   1. The page-level `revalidate: 60` (ISR) already publishes new CMS content
 *      within ~60 s — polling adds no real freshness benefit on public pages.
 *   2. The `/content-revision` endpoint correctly returns
 *      `Cache-Control: no-store`, and any single no-store fetch kills the
 *      browser's back/forward cache (Lighthouse BFCache audit).
 *
 * To re-enable (e.g. in a CMS editor preview build), set:
 *   NEXT_PUBLIC_CMS_REVISION_POLL=true
 *
 * When enabled, the bootstrap is still deferred to `requestIdleCallback` so it
 * never lands in the initial main-thread budget that Lighthouse measures (TBT).
 */
export function CmsClientBootstrap() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CMS_REVISION_POLL !== 'true') return undefined

    let cancelled = false
    const run = () => {
      if (cancelled) return
      void import('@/lib/cms-client').then((mod) => {
        if (cancelled) return
        void mod.prepareCmsClient().then(() => {
          if (!cancelled) mod.startRevisionPolling()
        })
      })
    }

    if (typeof window === 'undefined') return undefined

    if (typeof window.requestIdleCallback !== 'undefined') {
      const id = window.requestIdleCallback(run, { timeout: 4000 })
      return () => {
        cancelled = true
        if (typeof window.cancelIdleCallback !== 'undefined') {
          window.cancelIdleCallback(id)
        }
      }
    }

    const timer = window.setTimeout(run, 1500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])
  return null
}
