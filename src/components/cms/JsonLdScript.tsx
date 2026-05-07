/** JSON-LD in initial HTML for crawlers (Server Component). */
export function JsonLdScript({ data }: { data: unknown }) {
  if (data == null || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if ('@graph' in o && Array.isArray(o['@graph']) && o['@graph'].length === 0) return null
  let serialized = ''
  try {
    serialized = JSON.stringify(data)
  } catch {
    return null
  }
  if (!serialized || serialized === '{}') return null
  return (
    <script
      type="application/ld+json"
      data-cms-seo-prerender="1"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  )
}
