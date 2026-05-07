/**
 * Laravel CMS public API — Next.js (browser + server) use the same env names.
 *
 * - NEXT_PUBLIC_CMS_API_URL — Laravel base (no trailing slash), e.g. https://app.apimstec.com
 * - NEXT_PUBLIC_SITE_DOMAIN — tenant domain in CMS (e.g. compresspdf.my)
 */

export function normalizeSiteDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .split('/')[0]
}

const API_FALLBACK_DEV = 'http://localhost:3000'
const API_FALLBACK_PROD = 'https://app.apimstec.com'

const isDev = process.env.NODE_ENV === 'development'

/** Base URL of Laravel (no trailing slash). */
export const CMS_API_BASE = String(
  process.env.NEXT_PUBLIC_CMS_API_URL ||
    (isDev ? API_FALLBACK_DEV : API_FALLBACK_PROD),
).replace(/\/$/, '')

/** Fallback when window is unavailable; browser code uses hostname when possible. */
export const CMS_SITE_DOMAIN = normalizeSiteDomain(
  process.env.NEXT_PUBLIC_SITE_DOMAIN || (isDev ? 'compresspdf.local' : 'compresspdf.my'),
)
