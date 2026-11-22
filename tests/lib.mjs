/** Funzioni comuni dei test nel browser: apertura pagina, raccolta errori, screenshot, statistiche pixel. */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Percorso assoluto di un file indicato relativamente alla radice del progetto. */
export const abs = (p) => resolve(ROOT, p)

/** Avvia Chrome senza interfaccia. */
export function launch() {
  return chromium.launch({ channel: 'chrome', headless: true })
}

/**
 * Apre `html` con ?debug e raccoglie errori, avvisi e richieste.
 * @param {import('playwright-core').Browser} browser
 * @param {{ html?: string, size?: string, quality?: string, touch?: boolean, readyTimeout?: number }} [opts]
 * @returns {Promise<{ page: import('playwright-core').Page, context: any, url: string, errors: string[], warnings: string[], requests: string[], readyMs: number|null, close: () => Promise<void> }>}
 */
export async function openSession(browser, opts = {}) {
  const { html = 'index.html', size = '1280x720', quality, touch = false, readyTimeout = 30000 } = opts
  const [width, height] = size.split('x').map(Number)
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch })
  const page = await context.newPage()
  const errors = []
  const warnings = []
  const requests = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
    else if (m.type() === 'warning') warnings.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('request', (r) => requests.push(r.url()))
  const base = pathToFileURL(abs(html)).href
  const url = `${base}?debug${quality ? `&quality=${quality}` : ''}`
  const t0 = Date.now()
  await page.goto(url)
  let readyMs = null
  try {
    await page.waitForFunction(() => window.CASA && window.CASA.state.ready, null, { timeout: readyTimeout })
    readyMs = Date.now() - t0
  } catch (e) {
    warnings.push(`ready non raggiunto entro ${readyTimeout} ms`)
  }
  return { page, context, url: base, errors, warnings, requests, readyMs, close: () => context.close() }
}

/** Richieste di rete diverse dal documento stesso (e dai data:/blob:). */
export function foreignRequests(session) {
  return session.requests.filter((u) => u !== session.url && !u.startsWith(`${session.url}?`) && !/^(data|blob):/.test(u))
}

/** Salva uno screenshot PNG in `dir/name.png` e ne restituisce il percorso. */
export async function shot(page, dir, name) {
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${name}.png`)
  await page.screenshot({ path })
  return path
}

/** Mostra o nasconde l'interfaccia #ui. */
export function setUiVisible(page, on) {
  return page.evaluate((v) => {
    const ui = document.getElementById('ui')
    if (ui) ui.style.display = v ? '' : 'none'
  }, on)
}

/**
 * Luminanza media, deviazione standard e rapporto rosso/blu di un PNG (buffer).
 * La luminanza è su scala 0-255 con i pesi Rec.709 applicati ai valori sRGB.
 * @returns {Promise<{ mean: number, std: number, rb: number }>}
 */
export async function imageStats(page, png) {
  const b64 = png.toString('base64')
  return page.evaluate(async (data) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, c.width, c.height).data
    let sum = 0, sum2 = 0, r = 0, b = 0
    const n = px.length / 4
    for (let i = 0; i < px.length; i += 4) {
      const y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
      sum += y
      sum2 += y * y
      r += px[i]
      b += px[i + 2]
    }
    const mean = sum / n
    return { mean, std: Math.sqrt(Math.max(sum2 / n - mean * mean, 0)), rb: r / Math.max(b, 1) }
  }, b64)
}

/** Statistiche di un file PNG su disco, calcolate in una pagina vuota di servizio. */
export async function fileStats(browser, path) {
  const { readFileSync } = await import('node:fs')
  const ctx = await browser.newContext()
  try {
    const page = await ctx.newPage()
    return await imageStats(page, readFileSync(path))
  } finally {
    await ctx.close()
  }
}
