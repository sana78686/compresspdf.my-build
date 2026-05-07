/**
 * One-off: prefix CompressPDF.my styles with cp-my- (CSS selectors + className strings).
 * Skips Tailwind utility-looking tokens (contains `:` or `[`) and a small allowlist.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PREFIX = 'cp-my-'

const SKIP_CLASS_TOKENS = new Set(['antialiased', 'sr-only'])

function prefixCss(css) {
  return css.replace(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g, (match, cls) => {
    if (cls.startsWith('cp-my-')) return match
    return '.' + PREFIX + cls
  })
}

const CSS_FILES = [
  'src/app/globals.css',
  'src/components/compress/HomePage.css',
  'src/components/site/Footer.css',
  'src/components/site/Breadcrumbs.css',
  'src/styles/cms-page.css',
  'src/styles/BlogListPage.css',
  'src/styles/ContactPage.css',
  'src/styles/ComingSoonPage.css',
  'src/styles/AllToolsPage.css',
]

for (const rel of CSS_FILES) {
  const fp = path.join(ROOT, rel)
  if (!fs.existsSync(fp)) continue
  fs.writeFileSync(fp, prefixCss(fs.readFileSync(fp, 'utf8')))
}

function prefixClassValue(inner) {
  return inner
    .split(/\s+/)
    .map((t) => {
      const x = t.trim()
      if (!x) return ''
      if (x.startsWith(PREFIX)) return x
      if (SKIP_CLASS_TOKENS.has(x)) return x
      if (x.includes(':') || x.includes('[')) return x
      return PREFIX + x
    })
    .filter(Boolean)
    .join(' ')
}

function processJsx(fp) {
  let s = fs.readFileSync(fp, 'utf8')
  const orig = s
  s = s.replace(/className=\"([^\"]*)\"/g, (_, inner) => `className="${prefixClassValue(inner)}"`)
  s = s.replace(/className=\{'([^']*)'\}/g, (_, inner) => `className={'${prefixClassValue(inner)}'}`)
  if (s !== orig) fs.writeFileSync(fp, s)
}

function walk(dir, pred) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'cms') continue
      walk(p, pred)
    } else if (pred(p)) processJsx(p)
  }
}

walk(path.join(ROOT, 'src/app'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/components/compress'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/components/site'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/components/blog'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/components/contact'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/components/tools'), (p) => /\.(tsx|jsx)$/.test(p))
walk(path.join(ROOT, 'src/templates'), (p) => /\.(tsx|jsx)$/.test(p))

console.log('prefix-cp-my: done')
