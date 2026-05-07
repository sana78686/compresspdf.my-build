# Compress PDF (Next.js + SSR)

Next.js 15 app with **server-side rendering** for CMS pages (blog, legal, dynamic pages) while the **PDF compress tool** stays a **client** component (same behavior as the Vite SPA).

## Setup

```bash
cp .env.example .env.local
# Edit NEXT_PUBLIC_CMS_API_URL, NEXT_PUBLIC_SITE_DOMAIN, NEXT_PUBLIC_SITE_ORIGIN (see below)
npm install
npm run dev
```

### `NEXT_PUBLIC_SITE_ORIGIN` (recommended)

- **What it is:** The full public site URL **without a trailing slash**, e.g. `https://www.compresspdf.id` or `https://compresspdf.id`.
- **Why:** Next.js uses it for `metadataBase`, Open Graph, `sitemap.xml`, `robots.txt`, and SSR absolute URLs. It should be the **one canonical host** you want in Google (match **www** or **non-www** to your nginx/Plesk redirect).
- **Live deploy:** Copy **`.env.production.example`** → **`.env.production`** on the server, edit the values, then **`npm run build`** and restart Node. Or set the same keys in **Plesk → Node.js → Environment variables** (no file needed).
- **`NEXT_PUBLIC_*` note:** These are inlined at **build** time. If you change them on the server, run **`npm run build`** again before restarting.

After deploy, confirm the dynamic sitemap lists your preferred host (same value as `NEXT_PUBLIC_SITE_ORIGIN`), e.g. `curl -s https://compresspdf.id/sitemap.xml | head` should include `<loc>https://compresspdf.id/</loc>` and `<loc>https://compresspdf.id/blog</loc>`. If Ahrefs still reports “pages removed from sitemaps,” run a new crawl after DNS and env match.

### GlobalCMS (`robots.txt`, `sitemap.xml`, push from admin)

This app matches the **compressedPDF-react** contract with [GlobalCMS-app.apimstec.com](https://GlobalCMS-app.apimstec.com):

1. **Canonical URLs on the CMS host** — same as before: `https://{CMS_APP}/{NEXT_PUBLIC_SITE_DOMAIN}/robots.txt` and `.../sitemap.xml` (see Laravel routes `robots.by-domain` / `sitemap.by-domain`).
2. **Live site responses** — `/robots.txt` and `/sitemap.xml` are served by route handlers that, in order:
   - use files written under `public/` when the CMS **pushes** to the site, or
   - **fetch** the CMS canonical URL above (cached ~1h), or
   - fall back to a safe default (`robots`) or a **programmatic sitemap** (static routes + blogs/pages from the public API, like the old `app/sitemap.ts`).
3. **Push from CMS (“Write on live domain”)** — set **`CMS_SEO_SYNC_SECRET`** on the Node server to the **same** value as **`FRONTEND_SEO_SYNC_SECRET`** in the CMS `.env`. The CMS still POSTs to **`https://yoursite/cms-seo-sync.php`**; Next.js **rewrites** that to **`/api/cms-seo-sync`** (same fields: `secret`, `action`, `content`). Optional: set **`FRONTEND_SEO_SYNC_PATH=api/cms-seo-sync`** in the CMS if you prefer not to rely on the rewrite.

4. **Host check (tenant lock)** — After the secret is verified, the API checks that the request **`Host`** (or `X-Forwarded-Host`) matches **`NEXT_PUBLIC_SITE_DOMAIN`** and the hostname of **`NEXT_PUBLIC_SITE_ORIGIN`** (both normalized, no port). If they disagree with the URL the CMS posts to (e.g. **www** vs apex), the API returns **`403`** with JSON **`code: "HOST_MISMATCH"`** and does not write files. Add extra hostnames with **`CMS_PUSH_ALLOWED_HOSTS`** (comma-separated, e.g. `www.compresspdf.id`) if you need both.

On **serverless** hosts (e.g. Vercel), files written by the push API may not persist; in that case rely on the **CMS fetch** path (ensure `NEXT_PUBLIC_CMS_API_URL` and `NEXT_PUBLIC_SITE_DOMAIN` are correct) or run the app on a VPS with a writable filesystem.

Open **http://localhost:3001** (not 3000 — see below).

`postinstall` copies `pdf.worker.min.mjs` into `public/` for the client compressor.

### Blank page + 500 on `/_next/static/...` at port 3000

Your Laravel **CMS API** (`compressedPDF-react` / Vite) often uses **`http://localhost:3000`**. If that server is already running, **Next.js cannot use the same port**, and something else may respond with **500** for `/_next/*` (those are Next.js assets, not Laravel).

- **Fix:** Use the dev script as configured: **`npm run dev`** → **http://localhost:3001**
- Or stop the process on 3000, then run `next dev -p 3000` if you really need 3000.

## Scripts

- `npm run dev` — development
- `npm run build` — production build
- `npm run build:clean` — **delete `.next` then build** (use on **Windows** if you see `PageNotFoundError` / `ENOENT` / “Cannot find module for page” during `Collecting page data`)
- `npm run clean` — remove `.next` only
- `npm start` — run production server after build

### Windows: build fails with “Cannot find module for page” (ENOENT)

This usually means a **stale or half-written `.next` folder** (crash, antivirus, OneDrive, or path quirks). Run:

```bash
npm run build:clean
```

Or manually delete the **`compressedpdf-next/.next`** directory, then `npm run build` again. Close any running `npm run dev` first.

### Local dev: `Cannot find module './331.js'` (or similar chunk id)

That is almost always a **corrupted or half-written `.next` cache** while Webpack is mid-build. **Stop** `npm run dev`, then:

```bash
npm run dev:clean
```

(or `npm run clean && npm run dev`). If it still happens, delete `.next` manually, restart the terminal, and run `npm run dev` again. **Do not** run two Next dev servers in the same project folder at once.

### Live site looks unstyled (plain HTML) + browser shows `400` on `/_next/static/...`

The HTML loads from Node, but **CSS/JS chunks are not reaching the browser**. That is **hosting / proxy / cache**, not React code:

1. **Nginx / Plesk** must **proxy the entire site** to the Node process, including `/_next/static/*` and `/_next/image/*`. If only `/` is proxied and static files are served from `httpdocs`, requests for `/_next/...` may hit the wrong handler and return **400/404**.
2. After each deploy, run **`npm run build`** in the **same folder** as `server.js`, then **restart** the Node app. **Never** mix an old `.next` folder with a new `node_modules` or vice versa.
3. **Purge CDN / Cloudflare cache** if you use one — cached HTML can reference **old chunk filenames** that no longer exist after a new build (same symptom: lots of red errors for `.js` / `.css` under `/_next/static/`).
4. **`NEXT_PUBLIC_SITE_ORIGIN`** must match the hostname users open (with or without `www`). Rebuild after changing any `NEXT_PUBLIC_*` variable.

## Relation to `compressedPDF-react`

- **compressedPDF-react** — original Vite SPA (unchanged).
- **compressedpdf-next** — new app for SEO: crawlers get full HTML on blog/legal/CMS routes; home still hydrates the tool.

You can run one or the other during migration.

---

## Plesk / InterServer VPS (Node.js extension)

### Why `node_modules/next/dist/bin/next` was “file not found”

1. **Application Root** must be the folder that **contains `package.json` and `node_modules`** after `npm install`. If the repo is a monorepo, the root might be `Final-seo-projects/` but the Next app is in **`compressedpdf-next/`** — set Application Root to that inner folder (or deploy only that folder via Git).
2. **Run `npm install` (or `npm ci`) in that same folder** on the server. Until `node_modules/next` exists, no Next path will work.
3. Plesk is happier with a **real project file** as the startup entry. This repo includes **`server.js`** at the app root — use that instead of pointing at `node_modules/.../next` directly.

### Settings (typical)

| Field | Value |
|--------|--------|
| Application mode | production |
| Application root | e.g. `/var/www/vhosts/.../my.compresspdf.id` = folder with **`package.json`** |
| Application startup file | **`server.js`** (name only or relative path, per your Plesk version) |
| Node.js | Prefer **20.x or 22.x LTS**. Node **25** is very new; use LTS if anything breaks. |

### Deploy commands (SSH or Plesk “Run script”)

```bash
cd /path/to/app   # folder with package.json
npm ci --omit=dev   # or npm install --omit=dev
npm run build       # required before first start
```

Then **Restart App** in Plesk. The server reads **`PORT`** from the environment (Plesk usually sets this).

### After `npm run build` — make the site visible on the domain

1. Open the **Dashboard** tab (not only “Run Node.js commands”).
2. Set **Application startup file** to **`server.js`** (the file in the same folder as `package.json`). Do **not** leave a broken path to `node_modules/next/...`.
3. Set **Application mode** to **production**.
4. Under **environment variables** / **Custom environment variables**, add at least:
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_SITE_DOMAIN` = `my.compresspdf.id` (your real hostname)
   - `NEXT_PUBLIC_SITE_ORIGIN` = `https://www.my.compresspdf.id` or `https://my.compresspdf.id` (same host users type; no trailing slash)
   - `NEXT_PUBLIC_CMS_API_URL` = your Laravel API base, e.g. `https://app.apimstec.com` (no trailing slash)
5. **Apache & nginx** (or **Hosting Settings**): ensure the domain is set to **proxy** to the Node.js app (wording varies: e.g. “Serve Node.js application”, “Proxy mode”, or nginx `proxy_pass` to the port/socket Plesk shows). If the domain still shows a default Plesk/Apache page, the request is not reaching Node yet.
6. Click **Restart App** (or **Enable Node.js** if it was off).
7. Wait a few seconds, then open **https://my.compresspdf.id** (or HTTP first if SSL is not ready).

If you see **502 / 503 / connection refused**, check the Node app **logs** in Plesk (same Node.js screen) and confirm **`server.js`** exists in the application root and **`npm run build`** was run in that same folder.

### Plesk “default webpage” (robot) instead of your app

That page is **not** from Next.js — the domain is still serving **Plesk’s static default** `index.html`, so traffic **never reaches** Node.

1. **File Manager** → domain’s document root (often `httpdocs`) → **delete or rename** the default **`index.html`** (welcome page).
2. **Domain → Apache & nginx** (or hosting): enable **proxy to Node.js** / **Proxy mode** (exact name depends on Plesk version) so requests go to the Node port, not only static files.
3. Set **Document root** to the **`public`** subfolder under your app if Plesk asks (see orange warning on the Dashboard).
4. Add **custom environment variables** (`NODE_ENV`, `NEXT_PUBLIC_*`), then **Restart App** and load the site again.

Until the vhost **proxies** to Node, “Application will be restarted after the first request” never helps — the first request never hits Node.

### Env on the server

Add **`NODE_ENV=production`** and your CMS keys in Plesk “Custom environment variables” or `.env.production`:

- `NEXT_PUBLIC_CMS_API_URL`
- `NEXT_PUBLIC_SITE_DOMAIN` (e.g. `my.compresspdf.id`)

### Security (npm warnings)

Keep **Next.js** on a current **patched** 15.x release (see [Next.js security advisories](https://nextjs.org/blog)). This project pins a recent 15.5.x in `package.json`; run `npm update next` periodically after checking the advisory page.
