/** Regia del tour: cammino lungo il percorso, sguardo, soste e luce. */

const DEG = Math.PI / 180
const MAX_TURN = 87 * DEG // limite di rotazione (rad/s), sotto i 90°/s richiesti
const TURN_ACCEL = 260 * DEG // accelerazione angolare (rad/s²)
const RAMP = 0.8 // lunghezza di partenza e arrivo morbidi (m)
const LOOK_AHEAD = 1.2 // quanto avanti guarda in cammino (m)
const ARRIVE_LEAD = 1.5 // da qui all'arresto lo sguardo ruota verso la sosta (m)
const WALK_PITCH = -4 * DEG
const START_TURN = 35 * DEG // la camera riparte solo se lo sguardo è entro questo angolo
const SWAY = 6 * DEG // panoramica durante la sosta
const SWAY_PERIOD = 14 // secondi
const SKIP_SECONDS = 0.6
const LIGHT_EVERY = 0.25
const SUBSTEP = 1 / 30

const wrap = (a) => {
  const t = (a + Math.PI) % (2 * Math.PI)
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI
}
const smooth = (x) => { const u = Math.min(Math.max(x, 0), 1); return u * u * (3 - 2 * u) }

/**
 * Crea il regista del tour.
 * @param {object} ctx contesto condiviso
 * @param {ReturnType<import('./path.js').buildPath>} built percorso costruito
 * @param {{ onStop: (i:number)=>void, onWalk: (i:number)=>void, onEnd: ()=>void }} cb notifiche a `index.js`
 */
export function createDirector(ctx, built, cb) {
  const { stops, sections } = built
  const { settings } = ctx.tour
  const eye = settings.eyeHeight
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const d = {
    phase: 'idle', k: 0, li: 0, s: 0, dist: 0, v: 0, dwell: 0, started: false, sway: true, skipV: 0, lightAcc: 0, h0: 0,
    yaw: 0, pitch: 0, omega: 0, x: 0, z: 0,
  }

  const lookAtYaw = (st) => Math.atan2(st.stop.lookAt[0] - d.x, st.stop.lookAt[2] - d.z)
  const lookAtPitch = (st) => {
    const [lx, ly, lz] = st.stop.lookAt
    return Math.atan2(ly - eye, Math.hypot(lx - d.x, lz - d.z))
  }
  const leg = () => sections[d.k - 1].legs[d.li]

  /** Direzione di marcia verso un punto poco più avanti. */
  function heading(l, s) {
    const a = l.at(s)
    const b = l.at(s + LOOK_AHEAD)
    const dx = b.x - a.x
    const dz = b.z - a.z
    if (Math.hypot(dx, dz) < 0.3) { const t = l.tangent(s); return Math.atan2(t.x, t.z) }
    return Math.atan2(dx, dz)
  }

  /** Porta lo sguardo verso `target` con velocità e accelerazione angolari limitate. */
  function turnTo(target, pitchTarget, h) {
    const diff = wrap(target - d.yaw)
    const want = Math.sign(diff) * Math.min(MAX_TURN, Math.sqrt(2 * TURN_ACCEL * 0.7 * Math.abs(diff)), Math.abs(diff) / h)
    const dv = Math.max(-TURN_ACCEL * h, Math.min(TURN_ACCEL * h, want - d.omega))
    d.omega += dv
    d.yaw = wrap(d.yaw + d.omega * h)
    d.pitch += (pitchTarget - d.pitch) * (1 - Math.exp(-4 * h))
  }

  function setLight(frac, final) {
    if (!settings.cinematicLight) return
    const st = stops[d.k]
    if (st.stop.hour == null) return
    ctx.api.setTime(final ? st.stop.hour : d.h0 + (st.stop.hour - d.h0) * frac)
  }

  function pose() {
    return { x: d.x, y: eye, z: d.z, yaw: d.yaw, pitch: d.pitch }
  }

  function arrive(k) {
    d.k = k
    d.phase = 'dwell'
    d.dwell = 0
    d.v = 0
    d.omega = 0
    const l = k > 0 ? leg() : null
    if (l) { const e = l.at(l.length); d.x = e.x; d.z = e.z }
    setLight(1, true)
    cb.onStop(k)
  }

  function leave() {
    if (d.k >= stops.length - 1) { d.phase = 'idle'; cb.onEnd(); return }
    d.k += 1
    d.li = 0
    d.s = 0
    d.dist = 0
    d.v = 0
    d.skipV = 0
    d.started = false
    d.lightAcc = 0
    d.h0 = ctx.state.hourTarget
    d.phase = 'walk'
    cb.onWalk(d.k - 1)
  }

  /** Avanza di un passo di simulazione di `h` secondi. */
  function step(h) {
    if (d.phase === 'dwell') {
      d.dwell += h
      const st = stops[d.k]
      const sway = d.sway ? SWAY * Math.sin((2 * Math.PI * d.dwell) / SWAY_PERIOD) : 0
      turnTo(lookAtYaw(st) + sway, lookAtPitch(st), h)
      if (d.dwell >= st.stop.dwell) leave()
      return
    }
    if (d.phase !== 'walk') return
    const sec = sections[d.k - 1]
    const l = leg()
    const last = d.li === sec.legs.length - 1
    const st = stops[d.k]
    const fast = d.skipV > 0
    const startHead = heading(l, d.s)
    let ty = startHead
    let tp = WALK_PITCH
    if (last && d.started && l.length - d.s <= ARRIVE_LEAD && !fast) { ty = lookAtYaw(st); tp = lookAtPitch(st) }
    turnTo(ty, tp, h)
    // al riavvio, dopo una sosta o un'inversione, aspetta che lo sguardo sia nella direzione giusta
    const held = !fast && !d.started && Math.abs(wrap(startHead - d.yaw)) > START_TURN
    if (!held) {
      d.started = true
      const edge = Math.min(d.s, l.length - d.s)
      const speed = fast ? d.skipV : settings.walkSpeed * Math.max(0.12, smooth(edge / RAMP))
      const ds = Math.min(speed * h, l.length - d.s)
      d.s += ds
      d.dist += ds
    }
    const p = l.at(d.s)
    d.x = p.x
    d.z = p.z
    d.lightAcc += h
    if (d.lightAcc >= LIGHT_EVERY) { d.lightAcc = 0; setLight(Math.min(d.dist / (sec.length || 1), 1), false) }
    if (d.s >= l.length - 1e-6) {
      if (!last) { d.li += 1; d.s = 0; d.started = false } else arrive(d.k)
    }
  }

  return {
    /** Inizia dalla prima sosta e restituisce la posa iniziale. */
    start() {
      const st = stops[0]
      d.x = st.p[0]
      d.z = st.p[1]
      d.k = 0
      d.sway = !reduced()
      d.yaw = lookAtYaw(st)
      d.pitch = lookAtPitch(st)
      d.omega = 0
      d.phase = 'dwell'
      d.dwell = 0
      setLight(1, true)
      ctx.nav.setPose(pose())
      cb.onStop(0)
    },
    /** Spegne la regia senza notifiche. */
    halt() { d.phase = 'idle' },
    /** Un fotogramma di tempo `dt` (già scalato da `timeScale`). */
    update(dt) {
      if (d.phase === 'idle') return
      let rem = dt
      while (rem > 1e-9 && d.phase !== 'idle') {
        const h = Math.min(rem, SUBSTEP)
        rem -= h
        step(h)
      }
      if (d.phase !== 'idle') ctx.nav.setPose(pose())
    },
    /** In cammino accelera fino alla sosta successiva; in sosta la termina. */
    skip() {
      if (d.phase === 'dwell') { leave(); return }
      if (d.phase !== 'walk') return
      const sec = sections[d.k - 1]
      d.skipV = Math.max(sec.length - d.dist, 0.01) / SKIP_SECONDS
    },
    /** Indice della sosta più vicina già raggiunta. */
    get stopIndex() { return d.phase === 'walk' ? d.k - 1 : d.k },
    get phase() { return d.phase },
  }
}
