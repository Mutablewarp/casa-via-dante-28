/** Tasti dell'interfaccia: T, Spazio, 1 2 3, virgola e punto, N, H e ?, Esc. Il movimento e M sono di H. */

const QUARTER = 0.25
const BUTTON_LIKE = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'color', 'file'])

/** Vero se il tasto appartiene all'elemento che ha il fuoco (campi di testo, pulsanti per Invio e Spazio). */
function ownedByElement(el, key) {
  if (!el || !el.tagName) return false
  const tag = el.tagName
  if (el.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase()
    if (type === 'range') return false
    if (BUTTON_LIKE.has(type)) return key === 'Enter' || key === ' '
    return true
  }
  return tag === 'BUTTON' && (key === 'Enter' || key === ' ')
}

/**
 * Collega la tastiera alle azioni dell'interfaccia.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 */
export function initKeys(ctx, ui) {
  const { state, styles } = ctx
  const { call } = ui

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
    const key = e.key
    if (ownedByElement(e.target, key)) return

    if (key === 'Escape') {
      ui.help.close()
      return
    }
    const k = key.length === 1 ? key.toLowerCase() : key
    let act = null
    if (k === 't' && !e.repeat) act = () => call(state.tour === 'idle' ? 'startTour' : 'stopTour')
    else if (k === ' ' && state.tour !== 'idle') {
      e.preventDefault()
      if (!e.repeat) act = () => call(state.tour === 'paused' ? 'resumeTour' : 'pauseTour')
    } else if ((k === '1' || k === '2' || k === '3') && !e.repeat) act = () => ui.toolbar.changeStyle(styles.order[Number(k) - 1])
    else if (k === ',') act = () => ui.toolbar.nudgeTime(-QUARTER)
    else if (k === '.') act = () => ui.toolbar.nudgeTime(QUARTER)
    else if (k === 'n' && !e.repeat) act = () => call('toggleMusic')
    else if ((k === 'h' || k === '?') && !e.repeat) act = () => ui.help.toggle()
    if (!act) return
    ui.splash.dismiss() // un tasto vale come scelta di esplorare
    act()
  })
}
