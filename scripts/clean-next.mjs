/**
 * Remove `.next` (and optional tool caches) before build — fixes Windows/Git Bash ENOENT /
 * "Cannot find module for page" / "Cannot find module './NNN.js'" when the cache is stale
 * or partially written (e.g. dev server stopped mid-compile, antivirus, OneDrive).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const nextDir = path.join(root, '.next')
const nodeCache = path.join(root, 'node_modules', '.cache')

function rmIfExists(dir, label) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`Removed ${label}`)
  }
}

rmIfExists(nextDir, '.next')
rmIfExists(nodeCache, 'node_modules/.cache')
