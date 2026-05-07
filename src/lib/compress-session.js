/**
 * Persists PDF tool state across Next.js App Router remounts / client navigations.
 * The compressor UI lives on `/` and `/en`; session helpers keep files/results in sync with React state.
 *
 * Compression math (pdfjs, jsPDF, DPI, grayscale) is identical to `compressedPDF-react`
 * src/pages/HomePage.jsx — only routing/session differs.
 */

let sessionFiles = []
/** @type {Array<{ blob: Blob, fileName: string, originalSize: number, newSize: number, percentageSaved: number }> | null} */
let sessionResults = null

export function setSessionFiles(f) {
  sessionFiles = f && f.length ? [...f] : []
}

export function setSessionResults(r) {
  sessionResults = r && r.length ? [...r] : null
}

export function getSessionFiles() {
  return sessionFiles
}

export function getSessionResults() {
  return sessionResults
}

export function clearCompressionSession() {
  sessionFiles = []
  sessionResults = null
}
