/** True if CMS HTML has visible text (not empty / tags-only). */
export function cmsHtmlHasVisibleText(html: string | undefined | null): boolean {
  if (!html || typeof html !== 'string') return false
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 0
}
