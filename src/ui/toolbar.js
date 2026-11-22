/** Barra in basso: tour, vista, stili, ora del giorno, musica, comandi. */

const VEIL_MS = 250
const HIDE_AFTER_MS = 4000
const TIME_STEP = 0.05
const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  view: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5-9-5zM3 14l9 5 9-5"/></svg>',
  walk: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="2.5"/><path d="M12 9v6M12 15l-3 6M12 15l3 6M8 12l4-3 4 3"/></svg>',
  musicOn: '<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
  musicOff: '<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/><path d="M3 3l18 18"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.3a2.5 2.5 0 115 0c0 1.6-2.5 1.9-2.5 3.7M12 17v.01"/></svg>',
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Crea la barra e la lega allo stato.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLElement, veil: HTMLElement, changeStyle: (id: string) => Promise<void>, measure: () => void, nudgeTime: (delta: number) => void }}
 */
export function createToolbar(ctx, ui) {
  const { h, call } = ui
  const { state, events, styles, lighting, registry } = ctx
  const [tMin, tMax] = lighting.range

  const btn = (testid, label, icon, extra = '') => {
    const lbl = h('span', { class: 'k-lbl', text: label })
    const ico = h('span', { class: 'k-ico', html: icon, 'aria-hidden': 'true' })
    return { el: h('button', { type: 'button', class: `k-btn ${extra}`.trim(), testid, 'aria-label': label }, ico, lbl), lbl, ico }
  }
  const tour = btn('btn-tour', 'Avvia tour', ICONS.play)
  const view = btn('btn-view', 'Vista dall\'alto', ICONS.view, 'k-hide-tour')
  const music = btn('btn-music', 'Musica', ICONS.musicOff)
  const help = btn('btn-help', 'Comandi', ICONS.help, 'k-hide-tour')
  music.el.setAttribute('aria-pressed', 'false')

  const styleBtns = styles.order.map((id) => {
    const s = styles.styles[id]
    const b = h('button', { type: 'button', class: 'k-btn', testid: `style-${id}`, 'aria-label': s.name, title: s.tagline, 'aria-pressed': String(state.style === id), text: s.name })
    b.addEventListener('click', () => changeStyle(id))
    return b
  })

  const timeLabel = h('span', { class: 'k-time-label', testid: 'time-label', 'aria-hidden': 'true' })
  const slider = h('input', {
    type: 'range', class: 'k-slider', testid: 'slider-time', min: tMin, max: tMax, step: TIME_STEP,
    value: state.hourTarget, 'aria-label': 'Ora del giorno',
  })

  const el = h('div', { class: 'k-panel k-toolbar', testid: 'toolbar', role: 'toolbar', 'aria-label': 'Comandi' },
    h('div', { class: 'k-group k-g-actions' }, tour.el, view.el),
    h('div', { class: 'k-group k-g-styles k-hide-tour', role: 'group', 'aria-label': 'Stile d\'arredo' }, ...styleBtns),
    h('div', { class: 'k-group k-g-time k-time k-hide-tour' }, timeLabel, slider),
    h('div', { class: 'k-group k-g-misc' }, music.el, help.el))
  const veil = h('div', { class: 'k-veil', 'aria-hidden': 'true' })

  // --- tour e vista ---
  tour.el.addEventListener('click', () => call(state.tour === 'idle' ? 'startTour' : 'stopTour'))
  view.el.addEventListener('click', () => call('setView', state.view === 'fps' ? 'dollhouse' : 'fps'))
  music.el.addEventListener('click', () => call('toggleMusic'))
  help.el.addEventListener('click', () => ui.help.toggle())

  function syncButtons() {
    const idle = state.tour === 'idle'
    tour.lbl.textContent = idle ? 'Avvia tour' : 'Ferma tour'
    tour.el.setAttribute('aria-label', tour.lbl.textContent)
    tour.ico.innerHTML = idle ? ICONS.play : ICONS.stop
    const fps = state.view === 'fps'
    view.lbl.textContent = fps ? 'Vista dall\'alto' : 'Prima persona'
    view.el.setAttribute('aria-label', view.lbl.textContent)
    view.ico.innerHTML = fps ? ICONS.view : ICONS.walk
    music.el.setAttribute('aria-pressed', String(!!state.music))
    music.ico.innerHTML = state.music ? ICONS.musicOn : ICONS.musicOff
    for (const [i, id] of styles.order.entries()) styleBtns[i].setAttribute('aria-pressed', String(state.style === id))
  }
  for (const name of ['tour:state', 'view:changed', 'music:changed', 'style:changed']) events.on(name, syncButtons)
  syncButtons()

  // --- stile con velo avorio ---
  let changing = false
  /**
   * Cambia stile dietro il velo; ignora le richieste mentre un cambio è in corso.
   * @param {string} id stile di `styles.order`
   */
  async function changeStyle(id) {
    if (changing || id === state.style || !styles.order.includes(id)) return
    changing = true
    for (const b of styleBtns) b.disabled = true
    try {
      veil.classList.add('on')
      await sleep(ui.reduced() ? 0 : VEIL_MS)
      await call('setStyle', id)
    } finally {
      veil.classList.remove('on')
      for (const b of styleBtns) b.disabled = false
      changing = false
      syncButtons()
    }
  }

  // --- ora del giorno ---
  const pad = (n) => String(n).padStart(2, '0')
  function labelFor(hour) {
    const band = lighting.bands.find((b) => hour >= b.from && hour < b.to) ?? lighting.bands[lighting.bands.length - 1]
    let hh = Math.floor(hour)
    let mm = Math.round((hour - hh) * 60)
    if (mm === 60) { hh += 1; mm = 0 }
    return `${band.label} · ${pad(hh)}:${pad(mm)}`
  }
  let dragging = false
  let lastTarget = NaN
  let lastLabel = ''
  function syncTime() {
    const text = labelFor(state.hour)
    if (text !== lastLabel) {
      lastLabel = text
      timeLabel.textContent = text
      slider.setAttribute('aria-valuetext', text)
    }
    // il cursore segue il bersaglio, non l'ora che lo insegue; durante il trascinamento comanda l'utente
    if (!dragging && state.hourTarget !== lastTarget) {
      lastTarget = state.hourTarget
      slider.value = state.hourTarget
    }
  }
  slider.addEventListener('input', () => {
    lastTarget = Number(slider.value)
    call('setTime', lastTarget)
  })
  slider.addEventListener('pointerdown', () => { dragging = true })
  slider.addEventListener('pointerup', (e) => {
    dragging = false
    lastTarget = NaN
    if (e.pointerType === 'mouse') slider.blur()
  })
  window.addEventListener('pointerup', () => { dragging = false }, true)
  window.addEventListener('pointercancel', () => { dragging = false }, true)
  events.on('time:changed', syncTime)
  registry.updaters.push(syncTime)
  syncTime()

  /** Sposta l'ora di `delta` ore (tasti `,` e `.`). */
  function nudgeTime(delta) {
    const v = Math.min(tMax, Math.max(tMin, state.hourTarget + delta))
    call('setTime', v)
  }

  // --- altezza della barra per il joystick ---
  function measure() {
    if (!el.offsetHeight) return
    ui.host.style.setProperty('--toolbar-h', `${Math.round(ui.root.clientHeight - el.offsetTop)}px`)
  }
  window.addEventListener('resize', measure)
  if (window.ResizeObserver) new ResizeObserver(measure).observe(el)

  // --- nascondi la barra dopo 4 s di quiete con il puntatore bloccato ---
  let hideTimer = 0
  const locked = () => !!document.pointerLockElement
  function arm() {
    clearTimeout(hideTimer)
    if (!locked() || state.view !== 'fps' || state.tour !== 'idle') return
    hideTimer = setTimeout(() => el.classList.add('autohide'), HIDE_AFTER_MS)
  }
  function reveal() {
    el.classList.remove('autohide')
    arm()
  }
  document.addEventListener('mousemove', () => { if (locked()) arm(); else reveal() })
  window.addEventListener('keydown', reveal)
  document.addEventListener('pointerlockchange', reveal)
  events.on('view:changed', reveal)
  events.on('tour:state', reveal)

  return { el, veil, changeStyle, measure, nudgeTime }
}
