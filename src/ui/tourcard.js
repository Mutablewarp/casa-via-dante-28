/** Stanza corrente (in alto a sinistra) e scheda del tour (in basso a sinistra). */

/**
 * Nome della stanza, con le varianti attive di `furnishing.variants`.
 * @param {object} ctx contesto condiviso
 * @param {{ id: string, name: string }} space voce di `plan.rooms` o `plan.outdoor`
 * @returns {string}
 */
function displayName(ctx, space) {
  const v = ctx.furnishing.variants
  for (const key of Object.values(v?.active ?? {})) {
    const opt = v.options?.[key]
    if (opt && opt.room === space.id && opt.roomName) return opt.roomName
  }
  return space.name
}

/**
 * Nome e superficie dello spazio in cui si trova il visitatore.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLElement }}
 */
export function createRoomHud(ctx, ui) {
  const { h, fmtArea } = ui
  const el = h('div', { class: 'k-panel k-hud', testid: 'room-hud', role: 'status', 'aria-live': 'polite', hidden: true })
  const spaces = [...ctx.plan.rooms, ...ctx.plan.outdoor]

  function show(id) {
    const space = id ? spaces.find((s) => s.id === id) : null
    el.hidden = !space
    if (space) el.textContent = `${displayName(ctx, space)} · ${fmtArea(space.area)}`
  }
  ctx.events.on('room:changed', ({ room }) => show(room))
  show(ctx.state.room)
  return { el }
}

/**
 * Scheda delle soste: titolo, superficie, frase di valore, avanzamento e comandi.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLElement }}
 */
export function createTourCard(ctx, ui) {
  const { h, call } = ui
  const { state, events } = ctx
  const title = h('h2', { class: 'k-tour-title' })
  const area = h('p', { class: 'k-tour-area' })
  const hl = h('p', { class: 'k-tour-hl' })
  const dots = h('div', { class: 'k-dots', role: 'progressbar', 'aria-label': 'Avanzamento del tour', 'aria-valuemin': '0' })
  const pause = h('button', { type: 'button', class: 'k-btn', testid: 'tour-pause', 'aria-label': 'Pausa', text: 'Pausa' })
  const skip = h('button', { type: 'button', class: 'k-btn', testid: 'tour-skip', 'aria-label': 'Avanti', text: 'Avanti' })
  const exit = h('button', { type: 'button', class: 'k-btn', testid: 'tour-exit', 'aria-label': 'Esci dal tour', text: 'Esci' })
  const el = h('div', { class: 'k-panel k-tour', testid: 'tour-card', hidden: true },
    h('div', { class: 'k-tour-text' }, h('div', { class: 'k-tour-inner' }, title, area, hl)),
    dots,
    h('div', { class: 'k-tour-actions' }, pause, skip, exit))

  pause.addEventListener('click', () => call(state.tour === 'paused' ? 'resumeTour' : 'pauseTour'))
  skip.addEventListener('click', () => call('skipStop'))
  exit.addEventListener('click', () => call('stopTour'))

  let count = -1
  function drawDots(index, total) {
    if (count !== total) {
      count = total
      dots.replaceChildren(...Array.from({ length: total }, () => h('span', { class: 'k-dot' })))
      dots.setAttribute('aria-valuemax', String(total))
    }
    dots.setAttribute('aria-valuenow', String(Math.min(index, total)))
    Array.from(dots.children).forEach((d, i) => {
      d.classList.toggle('done', i < index)
      d.classList.toggle('now', i === index)
    })
  }

  events.on('tour:state', ({ state: st, stopIndex, stopCount, stop }) => {
    if (st === 'idle') {
      el.hidden = true
      return
    }
    el.hidden = false
    pause.textContent = st === 'paused' ? 'Riprendi' : 'Pausa'
    pause.setAttribute('aria-label', pause.textContent)
    drawDots(stopIndex, stopCount)
    if (!stop) {
      el.classList.add('walking') // in cammino restano solo i puntini
      return
    }
    title.textContent = stop.title ?? ''
    area.textContent = stop.areaText ?? ''
    area.hidden = !stop.areaText
    hl.textContent = stop.highlight ?? ''
    el.classList.remove('walking', 'fresh')
    void el.offsetWidth // rilancia la comparsa
    el.classList.add('fresh')
  })
  return { el }
}
