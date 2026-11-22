/** Interfaccia: schermata iniziale, barra, scheda del tour, minimappa, comandi, tasti. Tutto dentro #ui. */
import css from './ui.css'
import { createSplash } from './splash.js'
import { createToolbar } from './toolbar.js'
import { createRoomHud, createTourCard } from './tourcard.js'
import { createMinimap } from './minimap.js'
import { createHelp } from './help.js'
import { initKeys } from './keys.js'

const TOAST_MS = 4000
const STOPPED = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel', 'contextmenu', 'touchstart']

/**
 * Crea un elemento. `class`, `testid`, `text`, `html` (solo testo interno del codice) e `on<evento>` sono speciali.
 * @param {string} tag nome del tag
 * @param {Record<string, any>} [attrs] attributi
 * @param {...(Node|string|null)} kids figli
 * @returns {HTMLElement}
 */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'testid') el.dataset.testid = v
    else if (k === 'text') el.textContent = v
    else if (k === 'html') el.innerHTML = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids) if (kid != null) el.append(kid)
  return el
}

/**
 * Inizializza l'interfaccia.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const { state, events } = ctx
  const host = document.getElementById('ui') ?? document.body
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  const root = h('div', { class: 'k-root' })
  host.appendChild(root)
  const media = (q) => !!window.matchMedia?.(q).matches
  const ui = { ctx, host, root, h, media, reduced: () => media('(prefers-reduced-motion: reduce)') }

  // avviso breve in basso
  let toastTimer = 0
  const toastEl = h('div', { class: 'k-panel k-toast', role: 'status', hidden: true })
  ui.toast = (text) => {
    toastEl.textContent = text
    toastEl.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastEl.hidden = true }, TOAST_MS)
  }

  /** Chiama `ctx.api[name]`: le funzioni assenti (segnaposto) non fanno nulla, gli errori diventano un avviso. */
  ui.call = (name, ...args) => {
    const fail = (e) => {
      ctx.log.error(`api.${name}:`, e)
      ui.toast(`Operazione non riuscita (${name}).`)
    }
    const fn = ctx.api[name]
    if (typeof fn !== 'function') return Promise.resolve()
    try {
      return Promise.resolve(fn(...args)).catch(fail)
    } catch (e) {
      fail(e)
      return Promise.resolve()
    }
  }
  ui.fmtArea = (a) => `${a.toFixed(1).replace('.', ',')} m²`

  const toolbar = createToolbar(ctx, ui)
  ui.toolbar = toolbar
  const hud = createRoomHud(ctx, ui)
  const card = createTourCard(ctx, ui)
  const minimap = createMinimap(ctx, ui)
  const help = createHelp(ctx, ui)
  const splash = createSplash(ctx, ui)
  ui.splash = splash
  ui.help = help
  root.append(toolbar.veil, toolbar.el, hud.el, card.el, minimap.el, help.el, splash.hint, toastEl, splash.el)
  toolbar.measure()
  initKeys(ctx, ui)

  // i clic sull'interfaccia non toccano la scena (il joystick è di H)
  for (const type of STOPPED) {
    host.addEventListener(type, (e) => {
      if (e.target.closest?.('[data-testid="joystick"]')) return
      e.stopPropagation()
    })
  }
  // dopo un clic con il mouse il fuoco torna alla scena, così i tasti muovono il visitatore
  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('button')
    if (b && e.detail > 0) b.blur()
  })

  /** Durante il tour restano pochi comandi e il joystick sparisce. */
  function syncTour() {
    const on = state.tour !== 'idle'
    root.classList.toggle('is-tour', on)
    const joy = host.querySelector('[data-testid="joystick"]')
    if (joy) joy.hidden = on
    toolbar.measure()
  }
  events.on('tour:state', syncTour)
  events.on('view:changed', syncTour) // H può ricreare lo stato del joystick a ogni cambio di vista
  syncTour()
}
