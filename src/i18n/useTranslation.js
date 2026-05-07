import { useMemo } from 'react'
import { getTranslation } from './translations'

function interpolate(template, params) {
  if (params == null || typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

/**
 * Hook to get t(key) for the current language.
 * @param {string} lang - Language code (e.g. 'en', 'ms', 'de')
 * @returns {(key: string, params?: Record<string, string | number>) => string} t function
 */
export function useTranslation(lang) {
  return useMemo(() => {
    return (key, params) => {
      const raw = getTranslation(lang, key)
      return params ? interpolate(raw, params) : raw
    }
  }, [lang])
}
