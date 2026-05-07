import { mkdir, writeFile } from 'fs/promises'
import { timingSafeEqual } from 'crypto'
import { join } from 'path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_BYTES = 6 * 1024 * 1024

function normalizeHost(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/:\d+$/, '')
}

/**
 * Hosts that may receive a CMS push for this deployment. If empty, no Host check
 * (useful for local experiments). Otherwise `Host` must match one of them.
 */
function allowedPushHosts(): string[] | null {
  const set = new Set<string>()
  const primary = normalizeHost(process.env.NEXT_PUBLIC_SITE_DOMAIN ?? '')
  if (primary) set.add(primary)
  const origin = String(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '').trim()
  if (origin) {
    try {
      const h = normalizeHost(new URL(origin).hostname)
      if (h) set.add(h)
    } catch {
      /* ignore */
    }
  }
  for (const part of String(process.env.CMS_PUSH_ALLOWED_HOSTS ?? '').split(',')) {
    const h = normalizeHost(part)
    if (h) set.add(h)
  }
  if (set.size === 0) return null
  return [...set]
}

function requestHost(req: Request): string {
  const raw = req.headers.get('host') ?? req.headers.get('x-forwarded-host') ?? ''
  return normalizeHost(raw.split(',')[0] ?? raw)
}

function safeEqualString(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ab.length !== bb.length) return false
    return timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

/**
 * Same contract as `compressedPDF-react/public/cms-seo-sync.php`: CMS pushes SEO files to the frontend.
 * Body: JSON `{ secret, action, content }` or `multipart/form-data` / `x-www-form-urlencoded`
 * fields `secret`, `action`, `content`.
 *
 * Set `CMS_SEO_SYNC_SECRET` on the Next server (not NEXT_PUBLIC_*). Must match `FRONTEND_SEO_SYNC_SECRET` in CMS .env.
 *
 * Host lock: if `NEXT_PUBLIC_SITE_DOMAIN` and/or `NEXT_PUBLIC_SITE_ORIGIN` is set, the request
 * `Host` (or `X-Forwarded-Host`) must match that tenant (plus optional `CMS_PUSH_ALLOWED_HOSTS`
 * for www / staging). Stops a shared secret from writing files on the wrong box if mis-routed.
 */
export async function POST(req: Request) {
  const expected = String(process.env.CMS_SEO_SYNC_SECRET ?? '').trim()
  if (!expected) {
    return NextResponse.json(
      { ok: false, code: 'SECRET_NOT_CONFIGURED', message: 'CMS_SEO_SYNC_SECRET is not set on this host' },
      { status: 503 },
    )
  }

  const allowed = allowedPushHosts()
  if (allowed !== null) {
    const host = requestHost(req)
    if (!host || !allowed.includes(host)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'HOST_MISMATCH',
          message:
            'Request Host does not match this deployment (check Domain → frontend URL in CMS vs NEXT_PUBLIC_SITE_DOMAIN / NEXT_PUBLIC_SITE_ORIGIN).',
          detail: { host: host || null, allowed },
        },
        { status: 403 },
      )
    }
  }

  let secret = ''
  let action = ''
  let content = ''

  const ct = req.headers.get('content-type') ?? ''
  try {
    if (ct.includes('application/json')) {
      const j = (await req.json()) as Record<string, unknown>
      secret = String(j.secret ?? '')
      action = String(j.action ?? '')
      content = String(j.content ?? '')
    } else {
      const form = await req.formData()
      secret = String(form.get('secret') ?? '')
      action = String(form.get('action') ?? '')
      content = String(form.get('content') ?? '')
    }
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_BODY', message: 'Invalid body' }, { status: 400 })
  }

  if (!safeEqualString(secret, expected)) {
    return NextResponse.json({ ok: false, code: 'FORBIDDEN', message: 'Invalid secret' }, { status: 403 })
  }

  if (action !== 'robots' && action !== 'sitemap' && action !== 'home_seo') {
    return NextResponse.json({ ok: false, code: 'INVALID_ACTION', message: 'Invalid action' }, { status: 400 })
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) {
    return NextResponse.json({ ok: false, code: 'CONTENT_TOO_LARGE', message: 'Content too large' }, { status: 400 })
  }

  let file: string
  if (action === 'home_seo') {
    if (!content.trim()) {
      return NextResponse.json({ ok: false, code: 'EMPTY_HOME_SEO', message: 'Empty JSON for home_seo' }, { status: 400 })
    }
    try {
      JSON.parse(content)
    } catch {
      return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Invalid JSON for home_seo' }, { status: 400 })
    }
    file = 'cms-home-seo.json'
  } else {
    file = action === 'robots' ? 'robots.txt' : 'sitemap.xml'
  }

  const publicDir = join(process.cwd(), 'public')
  await mkdir(publicDir, { recursive: true })
  const outPath = join(publicDir, file)

  try {
    await writeFile(outPath, content, 'utf8')
  } catch {
    return NextResponse.json(
      { ok: false, code: 'WRITE_FAILED', message: 'Could not write file (check permissions on public/)' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    code: 'OK',
    file,
    action,
    bytesWritten: Buffer.byteLength(content, 'utf8'),
  })
}
