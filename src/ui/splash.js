/** Schermata iniziale e invito al clic. */

const HINT_MS = 6000
const ORNAMENT = 'M6 30C38 30 50 8 82 8C102 8 110 22 100 29C92 34 83 27 90 20M234 30C202 30 190 8 158 8C138 8 130 22 140 29C148 34 157 27 150 20M98 31C108 36 114 34 120 22C126 34 132 36 142 31'

/**
 * Crea la schermata iniziale e l'invito `hint-lock`.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLElement, hint: HTMLElement, dismiss: () => void, isOpen: () => boolean }}
 */
export function createSplash(ctx, ui) {
  const { h, call } = ui
  const { state, events, plan } = ctx
  const totals = plan.meta.totals
  const surfaces = `${Math.round(totals.interni)} m² interni · ${Math.round(totals.esterni)} m² tra terrazza, balcone e giardino d'inverno`

  const bTour = h('button', { type: 'button', class: 'k-btn primary', testid: 'splash-tour', 'aria-label': 'Avvia tour', disabled: true, text: 'Avvia tour' })
  const bEnter = h('button', { type: 'button', class: 'k-btn', testid: 'splash-enter', 'aria-label': 'Esplora liberamente', disabled: true, text: 'Esplora liberamente' })
  const load = h('div', { class: 'k-load', role: 'progressbar', 'aria-label': 'Caricamento' })
  const el = h('div', { class: 'k-splash', testid: 'splash', role: 'dialog', 'aria-label': 'Attico Liberty' },
    h('div', { class: 'k-panel k-splash-card' },
      h('div', { html: `<svg class="k-orn" viewBox="0 0 240 44" aria-hidden="true"><path d="${ORNAMENT}"/></svg>` }),
      h('h1', { text: 'Attico Liberty' }),
      h('h2', { text: 'Via Dante 28 · Palermo · settimo piano' }),
      h('p', { class: 'k-splash-sub', text: surfaces }),
      h('div', { class: 'k-splash-btns' }, bTour, bEnter),
      load,
      h('p', { class: 'k-splash-note', text: 'Proposta d\'arredo. Misure indicative ricavate dalla planimetria catastale.' })))

  const hint = h('div', { class: 'k-panel k-hint', testid: 'hint-lock', hidden: true, text: 'Clicca per guardarti intorno · Esc per liberare il mouse' })
  let hintTimer = 0
  const hideHint = () => { clearTimeout(hintTimer); hint.hidden = true }
  function showHint() {
    if (ui.media('(pointer: coarse)')) return
    hint.hidden = false
    clearTimeout(hintTimer)
    hintTimer = setTimeout(hideHint, HINT_MS)
  }
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) hideHint() })
  events.on('view:changed', hideHint)
  events.on('tour:state', () => { if (state.tour !== 'idle') hideHint() })

  const isOpen = () => !el.hidden
  function dismiss() {
    if (el.hidden) return
    el.hidden = true
    if (el.contains(document.activeElement)) document.activeElement.blur()
  }
  /** Accende la musica se l'utente non l'ha rifiutata: va chiamata dentro il gesto di clic. */
  function musicOn() {
    if (ctx.api.musicPreference?.() !== false) call('setMusic', true)
  }
  bTour.addEventListener('click', () => {
    dismiss()
    musicOn()
    call('startTour')
  })
  bEnter.addEventListener('click', () => {
    dismiss()
    musicOn()
    showHint()
  })

  function ready() {
    bTour.disabled = false
    bEnter.disabled = false
    load.hidden = true
    if (isOpen() && !document.activeElement?.closest?.('.k-splash')) bTour.focus({ preventScroll: true })
  }
  if (state.ready) ready()
  else events.on('ready', ready)

  return { el, hint, dismiss, isOpen }
}
