'use client'

import { useEffect, useMemo } from 'react'

/** Injects JSON-LD into document.head (client). Skip if SSR already injected. */
export default function JsonLd({
  data,
}: {
  data: { '@graph'?: unknown[] } | null | undefined
}) {
  const serialized = useMemo(() => {
    if (!data || !Array.isArray(data['@graph']) || data['@graph'].length === 0) {
      return ''
    }
    try {
      return JSON.stringify(data)
    } catch {
      return ''
    }
  }, [data])

  useEffect(() => {
    if (!serialized) return undefined
    if (typeof document !== 'undefined') {
      const ssr = document.querySelector('script[type="application/ld+json"][data-cms-seo-prerender="1"]')
      if (ssr) return undefined
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-cms-json-ld', '1')
    el.textContent = serialized
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [serialized])

  return null
}
