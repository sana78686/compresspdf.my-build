import type { Metadata } from 'next'
import ContactPageClient from '@/components/contact/ContactPageClient'
import { translations } from '@/i18n/translations'
import { buildCmsMetadata } from '@/lib/cmsMeta'

const c = translations.en.contact

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata({
    locale: 'en',
    path: '/en/contact',
    ogLocale: 'en_US',
    fallbackTitle: c.title,
    fallbackDescription: c.intro,
  })
}

export default function EnContactPage() {
  return <ContactPageClient />
}
