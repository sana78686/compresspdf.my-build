/**
 * FUTURE: “Coming soon” tool route for English (`/en/{tool}`).
 *
 * To enable: copy this file to `src/app/en/[tool]/page.tsx` (create `[tool]` folder if needed).
 * While disabled, `app/en/[tool]/page.tsx` should not exist so crawlers do not index placeholder URLs.
 */
import type { Metadata } from 'next'
import ComingSoonClient from '@/components/tools/ComingSoonClient'

export const metadata: Metadata = {
  title: 'Coming Soon',
  description: 'Feature coming soon on CompressPDF.my — browse the homepage for guides and blog posts.',
  robots: { index: false, follow: true },
}

export default function EnToolComingSoonPage() {
  return <ComingSoonClient />
}
