import type { Metadata } from 'next'
import { BlogListView } from '@/components/blog/BlogListView'
import { translations } from '@/i18n/translations'
import { buildCmsMetadata } from '@/lib/cmsMeta'

export const revalidate = 60

const b = translations.en.blog

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata({
    locale: 'en',
    path: '/en/blog',
    ogLocale: 'en_US',
    fallbackTitle: b.listTitle,
    fallbackDescription: b.listIntro,
  })
}

export default function EnBlogListPage() {
  return <BlogListView locale="en" />
}
