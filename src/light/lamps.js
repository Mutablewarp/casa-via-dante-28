/** Lampade: curva di accensione, paralumi emissivi, insieme fisso di PointLight riassegnate alle lampade più vicine. */
import { smoothstep } from './keys.js'

// lighting.lamps.onCurve: lampOn = smoothstep(0.10, 0.60, night)
const ON_EDGE0 = 0.1
const ON_EDGE1 = 0.6
const SHADE_EMISSIVE = 2.2 // lighting.lamps.shadeEmissive
const SHADE_GAIN = 0.8 // taratura: paralumi non bruciati
const RESELECT_SECONDS = 0.5 // rivalutazione della scelta
const FADE_SECONDS = 0.3 // dissolvenza completa quando una luce cambia lampada
const DEFAULT_INTENSITY = 4
const MAX_PRIO = 2 // le lampade di priorità 3 restano solo emissive
const FALLBACK_LEVEL = 'high'
const TYPE_GAIN = { outdoor_lantern: 3 } // le lanterne a muro della terrazza sono le uniche luci di notte: sennò sedute nere

/** @param {number} night valore 0..1 di `state.night` @returns {number} accensione delle lampade 0..1 */
export function lampOnFromNight(night) {
  return smoothstep(ON_EDGE0, ON_EDGE1, night)
}

/**
 * @param {object} ctx contesto condiviso
 * @param {{ gain: number }} opts fattore di scala dell'intensità delle luci
 */
export function createLamps(ctx, { gain }) {
  const { THREE, camera, registry, lighting } = ctx
  const cfg = lighting.lamps
  const color = new THREE.Color(cfg.color)
  const slots = []
  const state = { lampOn: 0, clock: RESELECT_SECONDS, dirty: true, level: FALLBACK_LEVEL, byId: new Map() }
  const target = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2(0, 0)
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  let shade = null

  /** Porta l'insieme di luci al numero richiesto, senza crearne altre a ogni fotogramma. */
  function setCount(n) {
    while (slots.length < n) {
      const light = new THREE.PointLight(color, 0, cfg.distance, cfg.decay)
      light.castShadow = false
      light.visible = false
      ctx.groups.lights.add(light)
      slots.push({ light, id: null, want: null, m: 0 })
    }
    while (slots.length > n) {
      const s = slots.pop()
      ctx.groups.lights.remove(s.light)
      s.light.dispose()
    }
    state.dirty = true
  }

  /** Punto che la vista dall'alto guarda: il raggio centrale della camera sul piano y = 0. */
  function viewTarget() {
    ray.setFromCamera(ndc, camera)
    return ray.ray.intersectPlane(ground, target) ?? target.copy(camera.position)
  }

  /** Sceglie le lampade da accendere: priorità 1, poi 2, le più vicine prima. */
  function select() {
    const fps = ctx.state.view === 'fps'
    const ref = fps ? camera.position : viewTarget()
    const maxPrio = fps ? MAX_PRIO : 1
    state.byId = new Map(registry.lamps.map((l) => [l.id, l]))
    const list = registry.lamps
      .filter((l) => l.prio <= maxPrio)
      .map((l) => ({ l, d: Math.hypot(l.position[0] - ref.x, l.position[2] - ref.z) }))
      .sort((a, b) => a.l.prio - b.l.prio || a.d - b.d)
      .slice(0, slots.length)
      .map((x) => x.l)
    const wanted = new Set(list.map((l) => l.id))
    const keep = new Set(slots.filter((s) => s.id !== null && wanted.has(s.id)).map((s) => s.id))
    const free = list.filter((l) => !keep.has(l.id))
    for (const s of slots) {
      if (s.id !== null && wanted.has(s.id)) s.want = s.id
      else s.want = free.shift()?.id ?? null
    }
  }

  /** Aggiorna la scelta ogni mezzo secondo e dissolve le luci che cambiano lampada. */
  function update(dt) {
    state.clock += dt
    if (state.dirty || state.clock >= RESELECT_SECONDS) {
      state.clock = 0
      if (state.dirty) for (const s of slots) { s.id = null; s.m = 0 }
      state.dirty = false
      select()
    }
    const step = dt / (FADE_SECONDS / 2)
    const on = state.lampOn
    const { byId } = state
    for (const s of slots) {
      if (s.id !== s.want) {
        s.m = Math.max(0, s.m - step)
        if (s.m === 0) {
          s.id = s.want
          const l = s.id !== null ? byId.get(s.id) : null
          if (l) s.light.position.set(...l.position)
          else s.id = null
        }
      } else if (s.id !== null) s.m = Math.min(1, s.m + step)
      const l = s.id !== null ? byId.get(s.id) : null
      const base = l ? (cfg.byType[l.type] ?? DEFAULT_INTENSITY) * (TYPE_GAIN[l.type] ?? 1) : 0
      s.light.intensity = base * on * s.m * gain
      s.light.visible = on > 0
    }
  }

  /** Assegna subito le lampade alle luci, senza dissolvenza (salto dell'ora con `immediate`). */
  function snap() {
    state.dirty = true
    update(0)
    for (const s of slots) if (s.id !== null) s.m = 1
    update(0)
  }

  /** Imposta la qualità (numero di luci). */
  function setQuality(level) {
    state.level = cfg.maxRealLights[level] !== undefined ? level : FALLBACK_LEVEL
    setCount(cfg.maxRealLights[state.level])
  }

  /** Imposta `lampOn` e l'emissione dei paralumi. */
  function setOn(on) {
    state.lampOn = on
    if (!shade) shade = ctx.mat.get('paper.shade')
    shade.emissiveIntensity = SHADE_EMISSIVE * SHADE_GAIN * on
  }

  /** Il materiale dei paralumi cambia con lo stile: lo rilegge e riapplica l'emissione. */
  function refreshShade() {
    shade = ctx.mat.get('paper.shade')
    shade.emissiveIntensity = SHADE_EMISSIVE * SHADE_GAIN * state.lampOn
    state.dirty = true
  }

  /** Compila i programmi shader con tutte le luci visibili, così la prima accensione non blocca la pagina. */
  function precompile() {
    for (const s of slots) s.light.visible = true
    try {
      ctx.renderer.compile(ctx.scene, camera)
    } finally {
      for (const s of slots) s.light.visible = state.lampOn > 0
    }
  }

  return {
    precompile,
    setOn,
    snap,
    refreshShade,
    setQuality,
    update,
    markDirty() { state.dirty = true },
    get shade() { return shade },
    get realLights() { return slots.filter((s) => s.light.intensity > 0).length },
  }
}
