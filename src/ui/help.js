/** Pannello dei comandi (tabella della sezione 7 del disegno). */

// [ ] marca i tasti da disegnare come <kbd>
const ROWS = [
  ['Muoversi', '[W] [A] [S] [D] o [frecce]', 'joystick a sinistra'],
  ['Guardare', 'mouse dopo un clic sulla scena, oppure trascinando', 'trascinare a destra'],
  ['Correre', '[Maiusc]', '—'],
  ['Vista dall\'alto / prima persona', '[M]', 'pulsante'],
  ['Avvia o ferma il tour', '[T]', 'pulsante'],
  ['Pausa del tour', '[Spazio]', 'pulsante'],
  ['Stile', '[1] [2] [3]', 'pulsanti'],
  ['Ora del giorno', '[,] e [.] di un quarto d\'ora', 'cursore'],
  ['Musica', '[N]', 'pulsante'],
  ['Comandi', '[H] oppure [?]', 'pulsante'],
  ['Liberare il mouse, chiudere i pannelli', '[Esc]', '—'],
]

/** Testo con i tasti tra parentesi quadre in elementi <kbd>. */
function keysCell(h, text) {
  const cell = h('span')
  text.split(/\[([^\]]+)\]/).forEach((part, i) => {
    if (part) cell.append(i % 2 ? h('kbd', { text: part }) : part)
  })
  return cell
}

/**
 * Crea il pannello `help`.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLElement, open: () => void, close: () => void, toggle: () => void, isOpen: () => boolean }}
 */
export function createHelp(ctx, ui) {
  const { h } = ui
  const closeBtn = h('button', { type: 'button', class: 'k-btn k-help-close', 'aria-label': 'Chiudi i comandi', text: '×' })
  const rows = ROWS.map(([action, keys, touch]) => {
    return h('div', { class: 'k-help-row' }, h('b', { text: action }), keysCell(h, keys), h('i', { text: touch }))
  })
  const el = h('div', { class: 'k-panel k-help', testid: 'help', role: 'dialog', 'aria-label': 'Comandi', tabindex: '-1', hidden: true },
    h('h2', { text: 'Comandi' }),
    closeBtn,
    h('div', { class: 'k-help-row k-help-head' }, h('span', { text: 'Azione' }), h('span', { text: 'Tastiera e mouse' }), h('span', { text: 'Touch' })),
    ...rows,
    h('p', { text: 'Nella vista dall\'alto: trascinare ruota, rotella o pizzico avvicina, tasto destro o due dita sposta, doppio clic su una stanza porta lì in prima persona.' }))

  const isOpen = () => !el.hidden
  function open() {
    el.hidden = false
    el.focus({ preventScroll: true })
  }
  function close() {
    if (el.hidden) return
    el.hidden = true
    if (el.contains(document.activeElement)) document.activeElement.blur()
  }
  closeBtn.addEventListener('click', close)
  return { el, open, close, toggle: () => (isOpen() ? close() : open()), isOpen }
}
