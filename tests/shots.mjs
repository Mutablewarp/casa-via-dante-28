/**
 * Screenshot: serie (`node tests/shots.mjs <serie>`) o scatto singolo (opzioni con --name).
 * Ordine fisso: apertura e ready, --click, --style, --hour, --at/--room/--view, --eval, settle(40), scatto.
 */
import { launch, openSession, shot, setUiVisible, abs } from './lib.mjs'
import { getSeries } from './series.mjs'

const EVAL_TIMEOUT_MS = 120000
const SETTLE_FRAMES = 40
const FLAGS = new Set(['--ui', '--click'])

function parseArgs(argv) {
  const o = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) o._.push(a)
    else if (FLAGS.has(a)) o[a.slice(2)] = true
    else o[a.slice(2)] = argv[++i]
  }
  return o
}

/** Pose da `--at "x,z,gradi[,inclinazione]"`, in radianti. */
function parseAt(text) {
  const [x, z, deg, tilt = '0'] = text.split(',').map(Number)
  if ([x, z, deg, tilt].some(Number.isNaN)) throw new Error(`--at non valido: ${text}`)
  return { x, z, yaw: (deg * Math.PI) / 180, pitch: (tilt * Math.PI) / 180 }
}

/** Esegue il codice di --eval come corpo di una funzione asincrona nella pagina. */
async function runEval(page, code) {
  let timer
  const work = page.evaluate(`(async () => {${code}\n})()`)
  const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('--eval oltre 120 s')), EVAL_TIMEOUT_MS) })
  let result
  try {
    result = await Promise.race([work, limit])
  } finally {
    clearTimeout(timer)
  }
  console.log(`EVAL ${JSON.stringify(result ?? null)}`)
}

/** Prepara la scena secondo `step` e, se c'è un nome, salva lo scatto. */
async function takeShot(s, step, outDir) {
  const { page } = s
  if (step.click) {
    const vp = page.viewportSize()
    await page.mouse.click(vp.width / 2, vp.height / 2)
  }
  if (step.style) await page.evaluate(async (id) => { await window.CASA.api.setStyle(id) }, step.style)
  if (step.hour != null) await page.evaluate((h) => window.CASA.api.setTime(h, { immediate: true }), Number(step.hour))
  if (step.room) await page.evaluate((id) => window.CASA.api.teleport(id), step.room)
  else if (step.pose) await page.evaluate((p) => window.CASA.api.teleport(p), step.pose)
  else if (step.view) await page.evaluate(async (v) => { await window.CASA.api.setView(v, { animate: false }) }, step.view)
  if (step.eval) await runEval(page, step.eval)
  if (!step.name) return null
  await page.evaluate((n) => window.CASA.debug.settle(n), SETTLE_FRAMES)
  await setUiVisible(page, !!step.ui)
  const path = await shot(page, outDir, step.name)
  console.log(`scatto ${path}`)
  return path
}

async function runSeries(browser, name, o) {
  const outDir = abs(o.out ?? `out/shots/${name}`)
  const list = getSeries(name)
  const errors = []
  let shared = null
  const sharedKey = (e) => `${e.size ?? '1280x720'}`
  for (const [i, e] of list.entries()) {
    let s
    if (e.fresh || !shared || shared.key !== sharedKey(e)) {
      if (shared && !e.fresh) await shared.s.close()
      s = await openSession(browser, { html: o.html ?? 'index.html', size: e.size, touch: e.touch, quality: o.quality })
      if (!e.fresh) shared = { key: sharedKey(e), s }
    } else s = shared.s
    console.log(`[${i + 1}/${list.length}] ${e.name}`)
    await takeShot(s, e, outDir)
    errors.push(...s.errors.splice(0))
    if (e.fresh) await s.close()
  }
  if (shared) await shared.s.close()
  return errors
}

async function runSingle(browser, o) {
  const s = await openSession(browser, { html: o.html ?? 'index.html', size: o.size, quality: o.quality })
  const step = {
    click: o.click, style: o.style, hour: o.hour, room: o.room, view: o.view, eval: o.eval,
    pose: o.at ? parseAt(o.at) : null, name: o.name, ui: o.ui,
  }
  try {
    await takeShot(s, step, abs(o.out ?? 'out/shots/singoli'))
  } finally {
    if (s.readyMs === null) console.log('ATTENZIONE: la pagina non ha raggiunto ready')
  }
  const errors = [...s.errors]
  await s.close()
  return errors
}

const o = parseArgs(process.argv.slice(2))
const browser = await launch()
let errors = []
try {
  errors = o._[0] ? await runSeries(browser, o._[0], o) : await runSingle(browser, o)
} finally {
  await browser.close()
}
if (errors.length) {
  console.log('ERRORI DI CONSOLE:')
  for (const e of errors) console.log(`  ${e}`)
  process.exit(1)
}
