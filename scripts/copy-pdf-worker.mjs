import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')

/**
 * Two destinations:
 *   1) public/pdf.worker.min.mjs        — used by our own code (HomePageClient)
 *   2) public/pdf.js/pdf.worker.min.mjs — expected by @quicktoolsone/pdf-compress
 *      (it falls back to CDN otherwise; local copy keeps the tool offline-safe).
 */
const destinations = [
  path.join(root, 'public', 'pdf.worker.min.mjs'),
  path.join(root, 'public', 'pdf.js', 'pdf.worker.min.mjs'),
]

if (fs.existsSync(src)) {
  for (const dest of destinations) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    console.log(`[copy-pdf-worker] Copied to ${path.relative(root, dest)}`)
  }
} else {
  console.warn('[copy-pdf-worker] pdf.worker.min.mjs not found — run npm install')
}
