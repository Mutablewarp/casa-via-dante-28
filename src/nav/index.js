/** Navigazione: stato delle viste, teletrasporto, transizioni, API per il tour. */
import { createFps } from './fps.js'
import { createDollhouse } from './dollhouse.js'
import { createInput } from './input.js'

const START = { x: 16.98, z: 4.75, yaw: 0, pitch: 0 } // posa iniziale, sul pianerottolo
const VIEWS = ['fps', 'dollhouse', 'top']
const CEILING_HIDE_Y = 2.9 // sopra questa quota i soffitti spariscono
const TELEPORT_RADIUS = 1.5 // ricerca del punto libero (m)
const RESTORE_RADIUS = 1.0 // ricerca dopo un cambio di stile (m)

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const mix = (a, b, e) => a + (b - a) * e

/** Interpola due angoli lungo la via più breve. */
function mixAngle(a, b, e) {
  let d = (b - a) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d < -Math.PI) d += 2 * Math.PI
  return a + d * e
}

/**
 * Inizializza prima persona, vista dall'alto e API di navigazione.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const { camera, state, groups, plan, events, registry, debug, grid } = ctx
  const eye = ctx.tour.settings.eyeHeight
  const fps = createFps(ctx)
  const doll = createDollhouse(ctx)
  const P = fps.pose // posa in prima persona, valida anche mentre si guarda dall'alto
  const C = { x: 0, y: eye, z: 0, yaw: 0, pitch: 0 } // posa mostrata dalla camera
  let locked = false
  let tween = null // transizione tra viste in corso
  let orbitAnim = null // rotazione guidata dal tour

  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /** Scrive una posa sulla camera. */
  function applyCam(p) {
    Object.assign(C, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch })
    camera.position.set(p.x, p.y, p.z)
    camera.rotation.set(p.pitch, p.yaw + Math.PI, 0)
  }

  /** Aggiorna `state.room` in prima persona; sulle aperture tiene la stanza precedente. */
  function updateRoom() {
    if (state.view !== 'fps') return
    const s = grid.spaceAt(P.x, P.z)
    if (!s && grid.openingAt(P.x, P.z)) return
    const id = s ? s.id : null
    if (id !== state.room) {
      state.room = id
      events.emit('room:changed', { room: id })
    }
  }

  /** Conclude un cambio di vista: soffitti al valore definitivo, poi l'evento. */
  function completeView(view) {
    state.view = view
    groups.ceilings.visible = view === 'fps'
    input.joystick.setVisible(view === 'fps')
    events.emit('view:changed', { view })
    updateRoom()
  }

  function leavePointerLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock()
    } catch (e) {
      ctx.log.debug('uscita dal blocco del puntatore non riuscita:', e?.message)
    }
  }

  function cancelOrbit() {
    const a = orbitAnim
    orbitAnim = null
    if (a) a.resolve()
  }

  function cancelTween() {
    const t = tween
    tween = null
    if (t) t.resolve()
  }

  /** Porta a termine subito la transizione in corso. */
  function finishTween() {
    const t = tween
    if (!t) return
    tween = null
    applyCam(t.to)
    completeView(t.view)
    t.resolve()
  }

  /** Ridisegna la camera dell'orbita corrente. */
  function refreshDollhouse() {
    if (state.view === 'dollhouse' && !tween) applyCam(doll.poseOf('dollhouse'))
  }

  /** @returns {{x:number,y:number,z:number,yaw:number,pitch:number}} */
  const getPose = () => ({ x: C.x, y: C.y, z: C.z, yaw: C.yaw, pitch: C.pitch })

  // --- posa iniziale ---
  Object.assign(P, { x: START.x, y: eye, z: START.z, yaw: START.yaw, pitch: START.pitch })
  const first = fps.findFree(P.x, P.z, RESTORE_RADIUS)
  if (first) Object.assign(P, first)
  applyCam(P)

  // --- azioni richieste dagli input ---
  const host = {
    view: () => state.view,
    locked: () => locked,
    busy: () => !!tween,
    look(dx, dy, sens) {
      fps.look(dx, dy, sens)
      applyCam(P)
    },
    orbit(dx, dy) { doll.orbit(dx, dy); refreshDollhouse() },
    zoom(f) { doll.zoom(f); refreshDollhouse() },
    pan(dx, dy) { doll.pan(dx, dy); refreshDollhouse() },
    dblclick(x, y) {
      if (state.view !== 'dollhouse' || locked || tween) return
      const pt = doll.pick(x, y)
      if (pt && grid.spaceAt(pt.x, pt.z)) teleport({ x: pt.x, z: pt.z })
    },
    toggleView() {
      const now = tween ? tween.view : state.view
      setView(now === 'fps' ? 'dollhouse' : 'fps').catch((e) => ctx.log.error('cambio vista:', e))
    },
    userInput(kind) { events.emit('nav:userinput', { kind }) },
  }
  const input = createInput(ctx, host)

  /**
   * Cambia vista: `'fps'`, `'dollhouse'` o `'top'` (zenitale, sempre senza animazione).
   * @param {'fps'|'dollhouse'|'top'} view
   * @param {{ animate?: boolean, duration?: number }} [opts]
   * @returns {Promise<void>} risolta a transizione finita
   */
  function setView(view, opts = {}) {
    if (!VIEWS.includes(view)) return Promise.reject(new Error(`vista sconosciuta: ${view}`))
    if (tween) {
      if (tween.view === view) return tween.promise
      finishTween()
    }
    if (view === state.view) return Promise.resolve()
    cancelOrbit()
    if (view !== 'fps') {
      leavePointerLock()
      input.reset()
      fps.stop()
    }
    if (view === 'dollhouse') doll.reset()
    const to = view === 'fps' ? { ...P } : doll.poseOf(view)
    const duration = opts.duration ?? 1.6
    if (opts.animate === false || view === 'top' || duration <= 0 || reducedMotion()) {
      applyCam(to)
      completeView(view)
      return Promise.resolve()
    }
    let resolve
    const promise = new Promise((r) => { resolve = r })
    tween = { from: { ...C }, to, view, t: 0, duration, resolve, promise }
    return promise
  }

  /**
   * Porta il visitatore in prima persona in un punto libero dello stesso spazio.
   * @param {string|{x:number,z:number,yaw?:number,pitch?:number}} target id di stanza/spazio esterno oppure coordinate
   * @returns {{x:number,y:number,z:number,yaw:number,pitch:number}} posa raggiunta
   */
  function teleport(target) {
    let x
    let z
    let { yaw, pitch } = P
    let spaceId = null
    if (typeof target === 'string') {
      const space = [...plan.rooms, ...plan.outdoor].find((s) => s.id === target)
      if (!space) throw new Error(`spazio sconosciuto: ${target}`)
      ;[x, z] = space.spawn
      spaceId = space.id
    } else if (target && Number.isFinite(target.x) && Number.isFinite(target.z)) {
      ;({ x, z } = target)
      yaw = target.yaw ?? yaw
      pitch = target.pitch ?? pitch
      spaceId = grid.spaceAt(x, z)?.id ?? null
    } else {
      throw new Error('teleport: destinazione non valida')
    }
    const spot = fps.findFree(x, z, TELEPORT_RADIUS, spaceId)
    if (!spot) {
      ctx.log.warn(`teleport: nessun punto libero vicino a (${x}, ${z})`)
      return getPose()
    }
    cancelTween()
    cancelOrbit()
    fps.stop()
    Object.assign(P, { x: spot.x, y: eye, z: spot.z, yaw, pitch })
    applyCam(P)
    if (state.view !== 'fps') completeView('fps')
    else {
      groups.ceilings.visible = true // il tween interrotto può averli nascosti
      updateRoom()
    }
    return getPose()
  }

  // --- API e interfacce interne ---
  ctx.api.setView = setView
  ctx.api.teleport = teleport
  ctx.api.getPose = getPose

  ctx.nav.setPose = (p) => {
    const next = {
      x: p.x ?? C.x, y: p.y ?? eye, z: p.z ?? C.z, yaw: p.yaw ?? C.yaw, pitch: p.pitch ?? C.pitch,
    }
    if (state.view === 'fps' && !tween) Object.assign(P, next)
    applyCam(next)
    updateRoom()
  }

  ctx.nav.lock = (on) => {
    locked = !!on
    if (locked) leavePointerLock() // i pulsanti della scheda del tour devono essere cliccabili
    input.reset()
    fps.stop()
    if (!locked && state.view === 'fps' && !tween) {
      P.y = eye
      applyCam(P)
    }
  }

  ctx.nav.orbitBy = async (degrees, seconds) => {
    if (tween) await tween.promise
    if (state.view !== 'dollhouse') return
    const total = (degrees * Math.PI) / 180
    cancelOrbit()
    if (!(seconds > 0)) {
      doll.params.theta += total
      refreshDollhouse()
      return
    }
    await new Promise((resolve) => { orbitAnim = { total, t: 0, duration: seconds, prev: 0, resolve } })
  }

  debug.step = (inputState, seconds) => {
    fps.advance(inputState ?? {}, seconds)
    if (state.view === 'fps' && !tween) {
      applyCam(P)
      updateRoom()
    }
    return { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch }
  }
  debug.nav = () => ({ view: state.view, locked, tween: !!tween, orbit: { ...doll.params }, fps: { ...P } })

  // --- ciclo ---
  registry.updaters.push((dt) => {
    if (tween) {
      tween.t += dt / tween.duration
      const done = tween.t >= 1
      const e = ease(Math.min(tween.t, 1))
      const { from, to } = tween
      if (done) finishTween()
      else {
        applyCam({
          x: mix(from.x, to.x, e), y: mix(from.y, to.y, e), z: mix(from.z, to.z, e),
          yaw: mixAngle(from.yaw, to.yaw, e), pitch: mix(from.pitch, to.pitch, e),
        })
        groups.ceilings.visible = C.y < CEILING_HIDE_Y
      }
      return
    }
    if (orbitAnim) {
      const a = orbitAnim
      a.t += dt
      const e = ease(Math.min(a.t / a.duration, 1))
      doll.params.theta += (e - a.prev) * a.total
      a.prev = e
      refreshDollhouse()
      if (a.t >= a.duration) cancelOrbit()
    }
    if (state.view === 'fps' && !locked && fps.advance(input.read(), dt)) {
      applyCam(P)
      updateRoom()
    }
  })

  // dopo un cambio di stile gli ingombri cambiano: se la posizione è occupata si sposta
  events.on('furnished', () => {
    if (fps.isFree(P.x, P.z)) return
    const f = fps.findFree(P.x, P.z, RESTORE_RADIUS, grid.spaceAt(P.x, P.z)?.id ?? null) ?? fps.findFree(P.x, P.z, RESTORE_RADIUS)
    if (!f) return
    Object.assign(P, f)
    if (state.view === 'fps' && !tween) applyCam(P)
    updateRoom()
  })
  // la stanza iniziale è nota prima che l'interfaccia ascolti: la si ripete a partenza avvenuta
  events.on('ready', () => events.emit('room:changed', { room: state.room }))
  updateRoom()
}
