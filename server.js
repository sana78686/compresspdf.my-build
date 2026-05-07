/**
 * Production entry for hosts (Plesk, cPanel) that require a real .js "startup file".
 * Do NOT point Plesk at node_modules/next/dist/bin/next — that path is easy to get wrong
 * if Application Root or npm install is misaligned.
 *
 * Plesk sets PORT (and sometimes HOST / HOSTNAME). We bind 0.0.0.0 so nginx can proxy.
 */
const http = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = process.env.HOSTNAME || process.env.IP || '0.0.0.0'
const port = parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10)

const app = next({ dev, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })
    .listen(port, hostname, (err) => {
      if (err) throw err
      console.log(`> Next.js ready on http://${hostname}:${port}`)
    })
})
