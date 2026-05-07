import type { Metadata } from 'next'
import ContactPageClient from '@/components/contact/ContactPageClient'
import { translations } from '@/i18n/translations'
import { buildCmsMetadata } from '@/lib/cmsMeta'

const c = translations.id.contact

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata({
    locale: 'ms',
    path: '/contact',
    ogLocale: 'ms_MY',
    fallbackTitle: c.title,
    fallbackDescription: c.intro,
  })
}

export default function ContactPage() {
  return <ContactPageClient />
}
