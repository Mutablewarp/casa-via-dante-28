/**
 * Luminanza media a schermo nelle viste di T3.4, per tarare l'esposizione senza lanciare tutta la fase.
 * Uso: node tests/lum.mjs [--html file]
 */
import { readFileSync } from 'node:fs'
import { abs, launch, openSession, imageStats } from './lib.mjs'

const hi = process.argv.indexOf('--html')
const html = hi >= 0 ? process.argv[hi + 1] : 'index.html'
const tour = JSON.parse(readFileSync(abs('spec/tour.json'), 'utf8'))
const EYE = tour.settings.eyeHeight

/** Posa della sosta del tour in `room`, come in series.mjs. */
function poseOf(room) {
  const s = tour.path.find((e) => e.stop?.room === room)
  const [lx, ly, lz] = s.stop.lookAt
  const [x, z] = s.p
  return { x, z, yaw: Math.atan2(lx - x, lz - z), pitch: Math.atan2(ly - EYE, Math.hypot(lx - x, lz - z)) }
}
const VIEWS = [['salotto', 12], ['salotto', 18.6], ['salotto', 22], ['cucina', 10], ['gran_salone', 22], ['terrazza', 22]]

const browser = await launch()
try {
  const { page } = await openSession(browser, { html })
  for (const [room, hour] of VIEWS) {
    const info = await page.evaluate(async ({ hour, pose }) => {
      const C = window.CASA
      C.api.setTime(hour, { immediate: true })
      C.api.teleport(pose)
      await C.debug.settle(60)
      const ui = document.getElementById('ui')
      if (ui) ui.style.display = 'none'
      return { exposure: C.debug.lights().exposure, post: C.debug.post() }
    }, { hour, pose: poseOf(room) })
    const st = await imageStats(page, await page.screenshot())
    console.log(`${room} ${hour}: media ${st.mean.toFixed(1)}, rosso/blu ${st.rb.toFixed(2)}, esposizione ${info.exposure.toFixed(2)}, misurata ${info.post.metered}/${info.post.high}`)
  }
} finally {
  await browser.close()
}
