import type { Metadata } from 'next'
import { BlogListView } from '@/components/blog/BlogListView'
import { translations } from '@/i18n/translations'
import { buildCmsMetadata } from '@/lib/cmsMeta'

export const revalidate = 60

const b = translations.id.blog

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata({
    locale: 'ms',
    path: '/blog',
    ogLocale: 'ms_MY',
    fallbackTitle: b.listTitle,
    fallbackDescription: b.listIntro,
  })
}

export default function BlogListPage() {
  return <BlogListView locale="ms" />
}
