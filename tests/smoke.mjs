/**
 * Lanciatore delle asserzioni di fase.
 * Uso: node tests/smoke.mjs [n] [--html file]
 *   senza n: fasi 1-3 presenti; n da 1 a 3: fasi da 1 a n; 4: solo la fase 4.
 */
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { ROOT, abs, launch, openSession } from './lib.mjs'

const argv = process.argv.slice(2)
const hi = argv.indexOf('--html')
const htmlGiven = hi >= 0
const html = htmlGiven ? argv[hi + 1] : 'index.html'
const nArg = argv.find((a, i) => /^\d+$/.test(a) && !(hi >= 0 && i === hi + 1))
const n = nArg ? Number(nArg) : 3
const phases = n === 4 ? [4] : Array.from({ length: n }, (_, i) => i + 1)

const browser = await launch()
let failed = 0
try {
  for (const ph of phases) {
    const file = abs(`tests/phases/fase${ph}.mjs`)
    if (!existsSync(file)) { console.log(`fase ${ph}: file assente, saltata`); continue }
    const { assertions } = await import(pathToFileURL(file).href)
    for (const a of assertions) {
      const opened = []
      const ctx = {
        html, htmlGiven, root: ROOT, browser,
        open: async (o = {}) => {
          const s = await openSession(browser, { html, ...o })
          opened.push(s)
          return s
        },
      }
      try {
        let page = null
        if (!a.raw) {
          ctx.session = await ctx.open()
          page = ctx.session.page
        }
        const res = await a.run(page, ctx)
        if (res === 'DA FARE') console.log(`${a.id} DA FARE`)
        else console.log(`${a.id} OK${typeof res === 'string' ? ` (${res})` : ''}`)
      } catch (e) {
        failed++
        console.log(`${a.id} FALLITO: ${e.message}`)
      }
      for (const s of opened) {
        for (const w of s.warnings) console.log(`  avviso ${a.id}: ${w}`)
        await s.close()
      }
    }
  }
} finally {
  await browser.close()
}
process.exit(failed ? 1 : 0)
