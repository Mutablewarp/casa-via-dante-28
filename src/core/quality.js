/** Qualità adattiva: tre livelli, regola automatica sul tempo di fotogramma. */
const LEVELS = ['high', 'medium', 'low']
const PIXEL_CAP = { high: 1.5, medium: 1.25, low: 1 }
const SHADOWS = { high: true, medium: true, low: false }
const WINDOW = 90 // fotogrammi della media mobile
const MIN_FRAMES = 30 // sotto questo numero la media non è affidabile
const SKIP_MS = 250 // fotogrammi più lunghi: scheda in secondo piano
const WARMUP_MS = 3000
const SLOW_MS = 30
const SLOW_HOLD_MS = 3000
const FAST_MS = 18
const FAST_HOLD_MS = 10000
const COOLDOWN_MS = 5000
const MAX_CHANGES = 4
const CHANGES_SPAN_MS = 60000

/**
 * Applica il livello iniziale, registra il misuratore e le voci di API e debug.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const { renderer, scene, state } = ctx
  const win = []
  let auto = true
  let clock = 0 // ms di tempo misurato, avanza solo con fotogrammi validi
  let last = null
  let ignoreUntil = 0
  let cooldownUntil = 0
  let slowSince = null
  let fastSince = null
  const changes = [] // istanti (clock) dei cambi di livello

  const resetMeter = () => {
    win.length = 0
    slowSince = null
    fastSince = null
  }
  const warmUp = () => {
    ignoreUntil = clock + WARMUP_MS
    resetMeter()
  }

  /** Applica ciò che spetta al renderer; emette l'evento se il livello cambia. */
  function apply(level) {
    const changed = state.quality !== level
    state.quality = level
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_CAP[level]))
    ctx.resize()
    if (renderer.shadowMap.enabled !== SHADOWS[level]) {
      renderer.shadowMap.enabled = SHADOWS[level]
      // il programma shader dipende da shadowMap.enabled: ricompila i materiali
      scene.traverse((o) => {
        const m = o.material
        if (Array.isArray(m)) m.forEach((x) => { x.needsUpdate = true })
        else if (m) m.needsUpdate = true
      })
    }
    if (changed) ctx.events.emit('quality:changed', { quality: level })
    return changed
  }

  /** Cambio automatico di un livello (dir +1 peggiora, -1 migliora). */
  function step(dir) {
    const i = LEVELS.indexOf(state.quality) + dir
    resetMeter()
    if (i < 0 || i >= LEVELS.length) return
    while (changes.length && clock - changes[0] > CHANGES_SPAN_MS) changes.shift()
    if (changes.length >= MAX_CHANGES) return
    changes.push(clock)
    cooldownUntil = clock + COOLDOWN_MS
    apply(LEVELS[i])
  }

  function evaluate() {
    if (!auto || clock < ignoreUntil || clock < cooldownUntil || win.length < MIN_FRAMES) {
      slowSince = null
      fastSince = null
      return
    }
    const avg = win.reduce((a, b) => a + b, 0) / win.length
    if (avg > SLOW_MS) {
      fastSince = null
      slowSince ??= clock
      if (clock - slowSince >= SLOW_HOLD_MS) step(1)
    } else if (avg < FAST_MS) {
      slowSince = null
      fastSince ??= clock
      if (clock - fastSince >= FAST_HOLD_MS) step(-1)
    } else {
      slowSince = null
      fastSince = null
    }
  }

  function push(ms) {
    clock += ms
    win.push(ms)
    if (win.length > WINDOW) win.shift()
    evaluate()
  }

  const fromUrl = new URLSearchParams(window.location.search).get('quality')
  if (LEVELS.includes(fromUrl)) auto = false
  apply(LEVELS.includes(fromUrl) ? fromUrl : 'high')

  ctx.registry.updaters.push(() => {
    const now = performance.now()
    const dt = last === null ? 0 : now - last
    last = now
    if (dt <= 0) return
    if (dt > SKIP_MS) {
      resetMeter() // la pausa non conta: il misuratore riparte pulito
      return
    }
    if (clock + dt < ignoreUntil) clock += dt // riscaldamento: avanza l'orologio, niente misura
    else push(dt)
  })

  for (const ev of ['ready', 'style:changed', 'view:changed']) ctx.events.on(ev, warmUp)

  ctx.api.setQuality = (level) => {
    if (level === 'auto') {
      auto = true
      warmUp()
      return
    }
    if (!LEVELS.includes(level)) throw new Error(`qualità sconosciuta: ${level}`)
    auto = false
    resetMeter()
    apply(level)
  }

  ctx.debug.quality = () => ({
    level: state.quality,
    auto,
    avgFrameMs: win.length ? win.reduce((a, b) => a + b, 0) / win.length : 0,
    pixelRatio: renderer.getPixelRatio(),
    changes: changes.length,
  })
  // Per i test: il fotogramma finto salta il riscaldamento e fa avanzare l'orologio interno.
  ctx.debug.qualityFeed = (ms) => {
    ignoreUntil = 0
    push(ms)
  }
}
