/**
 * Capitalize the first letter of each word (for navbar labels).
 * @param {string} str
 * @returns {string}
 */
export function ucWords(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
