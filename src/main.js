/** Avvio: crea il contesto, esegue le init dei moduli nell'ordine del contratto, avvia il ciclo. */
import * as THREE from 'three'
import plan from '../spec/plan.json'
import furnishing from '../spec/furnishing.json'
import tour from '../spec/tour.json'
import styles from '../spec/styles.json'
import lighting from '../spec/lighting.json'
import { createContext } from './core/context.js'
import { initDebug } from './core/debug.js'
import * as quality from './core/quality.js'
import * as mat from './mat/index.js'
import * as tex from './tex/index.js'
import * as shell from './arch/shell.js'
import * as common from './arch/common.js'
import * as openings from './arch/openings.js'
import * as details from './arch/details.js'
import * as exterior from './arch/exterior.js'
import * as city from './arch/city.js'
import * as registry from './furn/registry.js'
import * as layout from './furn/layout.js'
import * as light from './light/index.js'
import * as nav from './nav/index.js'
import * as tourMod from './tour/index.js'
import * as audio from './audio/index.js'
import * as ui from './ui/index.js'

const MODULES = [
  ['core/quality', quality], ['mat', mat], ['tex', tex],
  ['arch/shell', shell], ['arch/common', common], ['arch/openings', openings],
  ['arch/details', details], ['arch/exterior', exterior], ['arch/city', city],
  ['furn/registry', registry], ['furn/layout', layout],
  ['light', light], ['nav', nav], ['tour', tourMod], ['audio', audio], ['ui', ui],
]
const MAX_DT = 0.1

/** Mostra un messaggio leggibile nel riquadro #fatal. */
function showFatal(text) {
  const box = document.getElementById('fatal')
  if (!box) return
  box.hidden = false
  box.textContent += (box.textContent ? '\n\n' : '') + text
}

/** Registra un errore in debug.errors, nel registro e sulla pagina. */
function report(ctx, where, e) {
  const message = `${where}: ${e?.message ?? e}`
  ctx.debug.errors.push({ where, message, stack: e?.stack ?? '' })
  ctx.log.error(message, e)
  showFatal(message)
}

/** Ciclo di disegno: aggiorna il tempo, chiama gli updater, disegna. */
function startLoop(ctx) {
  const timer = new THREE.Timer()
  timer.connect(document)
  const broken = new Set()
  let time = 0
  // i contatori di renderer.info coprono il fotogramma mostrato (ombre, scena, passate finali), non la manutenzione
  // della luce fatta dagli updater (sonde, mappa dei riflessi, ombra lontana): si azzerano subito prima del disegno
  ctx.renderer.info.autoReset = false
  ctx.renderer.setAnimationLoop(() => {
    timer.update()
    const dt = Math.min(timer.getDelta(), MAX_DT) * ctx.state.timeScale
    time += dt
    for (const fn of ctx.registry.updaters) {
      if (broken.has(fn)) continue
      try {
        fn(dt, time)
      } catch (e) {
        broken.add(fn) // un updater rotto si segnala una volta sola
        report(ctx, 'updater', e)
      }
    }
    try {
      ctx.renderer.info.reset()
      if (ctx.render) ctx.render() // pipeline con occlusione ambientale e mappatura tonale (light/post.js)
      else ctx.renderer.render(ctx.scene, ctx.camera)
    } catch (e) {
      ctx.renderer.setAnimationLoop(null)
      report(ctx, 'render', e)
    }
  })
}

async function start() {
  const debugOn = /[?&]debug\b/.test(window.location.search)
  const canvas = document.getElementById('view')
  const ctx = createContext({ canvas, debugOn, data: { plan, furnishing, tour, styles, lighting } })
  window.CASA = { api: ctx.api, state: ctx.state, debug: ctx.debug }
  if (debugOn) ctx.debug.ctx = ctx
  window.addEventListener('error', (ev) => report(ctx, 'window', ev.error ?? ev.message))
  window.addEventListener('unhandledrejection', (ev) => report(ctx, 'promise', ev.reason))
  initDebug(ctx)

  for (const [name, mod] of MODULES) {
    try {
      await mod.init(ctx)
    } catch (e) {
      report(ctx, `init ${name}`, e)
    }
  }
  ctx.state.ready = true
  ctx.events.emit('ready')
  startLoop(ctx)
}

start().catch((e) => {
  showFatal(`avvio: ${e?.message ?? e}`)
  window.CASA = window.CASA ?? { api: {}, state: { ready: false }, debug: { errors: [] } }
  window.CASA.debug.errors.push({ where: 'start', message: String(e?.message ?? e), stack: e?.stack ?? '' })
})
