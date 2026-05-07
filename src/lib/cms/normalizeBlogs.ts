export type BlogPostPreview = {
  id: number
  title: string
  slug: string
  excerpt?: string
  published_at?: string
  og_image?: string
  image?: string
}

export function normalizeBlogsResponse(res: unknown): BlogPostPreview[] {
  if (Array.isArray(res)) return res as BlogPostPreview[]
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>
    const raw = Array.isArray(o.blogs)
      ? o.blogs
      : Array.isArray(o.data)
        ? o.data
        : []
    return raw as BlogPostPreview[]
  }
  return []
}
