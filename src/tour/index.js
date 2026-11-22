/** Tour guidato: stato, API pubblica ed eventi. La camera la muove `director.js`. */
import { buildPath } from './path.js'
import { createDirector } from './director.js'

/** Superficie nel formato «32,7 m²». */
const areaText = (a) => `${a.toFixed(1).replace('.', ',')} m²`

/**
 * Inizializza il tour.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const { state, events, plan, api } = ctx
  const tour = ctx.tour
  const built = buildPath(tour.path)
  const count = built.stops.length
  let run = 0 // cambia a ogni avvio o arresto: annulla il finale in corso
  let selfView = false // vero mentre è il tour a chiamare setView
  let log = []
  let clock = 0
  let inStop = false // la camera è ferma in una sosta (la scheda va mostrata)

  /** Dati della scheda per la sosta `i`. */
  function stopInfo(i) {
    const st = built.stops[i].stop
    const space = [...plan.rooms, ...plan.outdoor].find((s) => s.id === st.room)
    return { room: st.room, title: st.title, highlight: st.highlight, areaText: space ? areaText(space.area) : '' }
  }

  function finaleInfo() {
    const f = tour.finale
    const t = plan.meta.totals
    const fill = (s) => s.replace('{interni}', Math.round(t.interni)).replace('{esterni}', Math.round(t.esterni))
    return { title: fill(f.title), highlight: fill(f.highlight), areaText: '' }
  }

  function emit(stopIndex, stop) {
    state.tourStop = state.tour === 'idle' ? -1 : stopIndex
    events.emit('tour:state', { state: state.tour, stopIndex: state.tour === 'idle' ? -1 : stopIndex, stopCount: count, stop })
  }

  const director = createDirector(ctx, built, {
    onStop(i) {
      inStop = true
      log.push({ stopIndex: i, room: built.stops[i].stop.room, t: clock })
      emit(i, stopInfo(i))
    },
    onWalk(i) {
      inStop = false
      emit(i, null)
    },
    onEnd() { runFinale() },
  })

  /** Chiama `setView` senza che il tour consideri il cambio come un intervento dell'utente. */
  async function ownView(view, opts) {
    selfView = true
    try {
      await api.setView(view, opts)
    } finally {
      selfView = false
    }
  }

  async function runFinale() {
    const token = run
    inStop = false
    state.tour = 'finale'
    api.setTime(tour.finale.hour)
    emit(count, finaleInfo())
    try {
      await ownView('dollhouse', { animate: true, duration: tour.finale.riseSeconds })
      if (token !== run) return
      await ctx.nav.orbitBy(25, 6)
    } catch (e) {
      ctx.log.error('finale del tour:', e)
    }
    if (token === run) api.stopTour()
  }

  api.startTour = async () => {
    const token = ++run
    director.halt()
    try {
      await ownView('fps', { animate: false })
    } catch (e) {
      ctx.log.error('avvio del tour:', e)
      return
    }
    if (token !== run) return
    ctx.nav.lock(true)
    log = []
    clock = 0
    state.tour = 'running'
    director.start()
  }

  api.stopTour = () => {
    run++
    director.halt()
    inStop = false
    ctx.nav.lock(false)
    const was = state.tour
    state.tour = 'idle'
    // se la camera si ferma su un punto non libero, la navigazione la sposta
    if (state.view === 'fps') {
      try {
        api.teleport(api.getPose())
      } catch (e) {
        ctx.log.warn('stopTour: posa non corretta:', e?.message)
      }
    }
    if (was !== 'idle') emit(-1, null)
  }

  api.pauseTour = () => {
    if (state.tour !== 'running') return
    state.tour = 'paused'
    emit(director.stopIndex, inStop ? stopInfo(director.stopIndex) : null)
  }

  api.resumeTour = () => {
    if (state.tour !== 'paused') return
    state.tour = 'running'
    emit(director.stopIndex, inStop ? stopInfo(director.stopIndex) : null)
  }

  api.skipStop = () => {
    if (state.tour === 'paused') api.resumeTour()
    if (state.tour === 'running') director.skip()
  }

  ctx.registry.updaters.push((dt) => {
    if (state.tour !== 'running') return
    clock += dt
    director.update(dt)
  })

  events.on('nav:userinput', () => { if (state.tour !== 'idle') api.stopTour() })
  events.on('view:changed', () => { if (state.tour !== 'idle' && !selfView) api.stopTour() })

  ctx.debug.tourLog = () => log.map((e) => ({ ...e }))
}
