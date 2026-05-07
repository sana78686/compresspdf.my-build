/**
 * ISO 3166-1 alpha-2 codes for flag images (flagcdn.com). Maps app lang → representative flag.
 */
export const langToCountryCode = {
  ms: 'my',
  en: 'gb',
}

/** Short label shown next to flag (avoid OS “GB” letter glyphs for emoji flags). */
export const langShortLabel = {
  ms: 'MS',
  en: 'EN',
}

/** Accessible `alt` for flag images (Ahrefs / WCAG). */
export const langFlagAlt = {
  ms: 'Malaysian flag',
  en: 'United Kingdom flag',
}
