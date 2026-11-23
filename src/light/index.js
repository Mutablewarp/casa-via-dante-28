/** Illuminazione dinamica: ora della giornata, sole e luna, cielo, riflessi e lampade. */
import { createSampler } from './keys.js'
import { createSun } from './sun.js'
import { createSky } from './sky.js'
import { createEnv } from './env.js'
import { createLamps, lampOnFromNight } from './lamps.js'
import { createPost } from './post.js'
import { createProbes } from './probes.js'
import { createFarShadow } from './far-shadow.js'

// Fattori di taratura: un solo numero per grandezza, i valori di spec/lighting.json restano intatti
// Il sole è circa cinque volte più forte del cielo, come in una giornata serena: il cielo entra dalla mappa
// d'ambiente a intensità piena, l'emisfero resta solo come leggero rimbalzo del suolo all'esterno.
const SUN_GAIN = 3.2
const HEMI_GAIN = 0.3
const LAMP_GAIN = 0.33
const EXPOSURE_GAIN = 1
const ENV_GAIN = 2.86 // lighting.environment.sceneIntensity (0,35) riportata a 1: gli interni non dipendono più dal cielo
const FLOOR_ENV_GAIN = 1
const GLASS_ENV_GAIN = 1
// Il soffitto prende la luce che rimbalza dal pavimento: il colore di terra dell'emisfero si avvicina al suo
const CEILING_TINT = '#F2E9D8'
const NIGHT_HEMI_LIFT = 3 // di notte l'emisfero (hemiI 0.07) lascia la città nera: lo si alza
const MOON_GAIN = 2
const NIGHT_SKY_TINT = '#7F92D0' // azzurro lunare verso cui sale il colore del cielo dell'emisfero
const NIGHT_SKY_MIX = 0.6
const CEILING_BOUNCE = 0.8
const CEILING_FILL = 1.5 // moltiplicatore del colore di terra di giorno: rimbalzo dal pavimento chiaro
const SETTLE_EPS = 0.002 // sotto questa distanza e velocità l'ora si ferma sul bersaglio
const TIME_EVENT_STEP = 0.01 // time:changed ogni variazione visibile dell'ora
const ENV_MOVING_EPS = 0.0005 // ore per fotogramma oltre cui l'ora si considera in movimento
const FALLBACK_LEVEL = 'high'
// Esposizione automatica, come una macchina fotografica: porta la luminanza media del fotogramma al grigio cercato,
// ma se le zone chiare (cielo, facciate al sole, una finestra grande) finirebbero bruciate cede in parte verso di loro.
// Il tetto dell'intervallo tiene i corridoi più scuri delle stanze; di notte il tetto scende e il grigio cercato
// cala un po', altrimenti la terrazza al buio verrebbe chiara come di giorno.
const EXPOSURE_KEY = 0.16 // radianza media a schermo cercata
const EXPOSURE_HIGH = 0.9 // radianza a schermo cercata per le zone chiare
const HIGH_WEIGHT = 0.4 // quanto conta il limite delle zone chiare (0 = solo la media, 1 = solo le zone chiare)
const EXPOSURE_RANGE = [0.1, 28]
const NIGHT_MAX_EXPOSURE = 2.4
const NIGHT_KEY_DIM = 0.2 // frazione tolta al grigio cercato a notte piena
const EXPOSURE_RATE = 3.5 // 1/s: l'occhio si adatta in mezzo secondo
const PROBE_HOUR_STEP = 0.02 // ore: oltre questo spostamento le sonde vanno ricatturate

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE, renderer, scene, state, lighting, registry } = ctx
  const sample = createSampler(THREE, lighting)
  const sun = createSun(ctx, { gain: SUN_GAIN })
  const sky = createSky(ctx)
  const env = createEnv(ctx, { envGain: ENV_GAIN, floorGain: FLOOR_ENV_GAIN, glassGain: GLASS_ENV_GAIN })
  const lamps = createLamps(ctx, { gain: LAMP_GAIN })
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 0)
  ctx.groups.lights.add(hemi)
  const ceilingTint = new THREE.Color(CEILING_TINT)
  const nightTint = new THREE.Color(NIGHT_SKY_TINT)

  const omega = 3 / lighting.transition.easeSeconds
  let velocity = 0
  let applied = Infinity
  let emitted = Infinity
  let lampOn = 0
  let ceilingsVisible = ctx.groups.ceilings.visible
  let keyExposure = 1
  let autoExposure = 1
  let probeHour = Infinity

  /** Livello di qualità effettivo (con 'auto' chiede a Q il livello corrente). */
  function level() {
    const q = state.quality
    if (lighting.sun.shadowMapSize[q] !== undefined) return q
    return ctx.debug.quality?.().level ?? FALLBACK_LEVEL
  }

  /** Imposta ogni grandezza luminosa per l'ora `hour`. */
  function apply(hour) {
    const st = sample(hour)
    state.night = st.night
    lampOn = lampOnFromNight(st.night)
    sun.apply(st, st.moonPhase ? MOON_GAIN : 1)
    sky.apply(st)
    hemi.color.copy(st.hemiSky).lerp(nightTint, NIGHT_SKY_MIX * st.night)
    hemi.groundColor.copy(st.hemiGround).lerp(ceilingTint, CEILING_BOUNCE * (1 - st.night))
    hemi.groundColor.multiplyScalar(1 + (CEILING_FILL - 1) * (1 - st.night))
    hemi.intensity = st.hemiI * HEMI_GAIN * (1 + NIGHT_HEMI_LIFT * st.night)
    keyExposure = st.exposure * EXPOSURE_GAIN
    renderer.toneMappingExposure = keyExposure * autoExposure
    lamps.setOn(lampOn)
    for (const m of registry.nightMaterials) m.emissiveIntensity = m.emissiveMap ? st.night : lampOn
    applied = hour
    if (Math.abs(hour - emitted) >= TIME_EVENT_STEP) {
      emitted = hour
      ctx.events.emit('time:changed', { hour, night: st.night })
    }
    return st
  }

  /** Smorzamento critico dell'ora mostrata verso `hourTarget` (lighting.transition). */
  function stepHour(dt) {
    let e = state.hour - state.hourTarget
    if (e === 0 && velocity === 0) return
    const k = Math.exp(-omega * dt)
    const a = velocity + omega * e
    e = (e + a * dt) * k
    velocity = (velocity - omega * a * dt) * k
    if (Math.abs(e) < SETTLE_EPS && Math.abs(velocity) < SETTLE_EPS) {
      e = 0
      velocity = 0
    }
    state.hour = state.hourTarget + e
  }

  /** Riapplica l'intensità dei paralumi e le mappe dei riflessi (cambio di stile o nuovo arredo). */
  function refreshMaterials() {
    lamps.refreshShade()
    env.applyReflections()
  }

  /** Livello di qualità: mappa d'ombra e numero di luci. */
  function applyQuality() {
    const lv = level()
    sun.setQuality(lv)
    lamps.setQuality(lv)
  }

  // --- avvio ---
  const post = createPost(ctx, level)
  ctx.render = post.render
  ctx.debug.post = post.info
  const probes = createProbes(ctx, level)
  ctx.debug.probes = probes.info
  const far = createFarShadow(ctx, level, sun)
  Object.assign(probes.uniforms, far.uniforms)
  ctx.debug.farShadow = far.info
  let snapFrames = 0

  let meterSeen = 0

  /** Esposizione automatica verso la luminanza media del fotogramma (esposimetro di post.js). */
  function stepExposure(dt) {
    const m = post.metered()
    const byMean = EXPOSURE_KEY * (1 - NIGHT_KEY_DIM * state.night) / Math.max(m.luminance, 1e-4)
    const byHigh = EXPOSURE_HIGH / Math.max(m.high, 1e-4)
    const raw = byHigh < byMean ? byMean ** (1 - HIGH_WEIGHT) * byHigh ** HIGH_WEIGHT : byMean
    const max = EXPOSURE_RANGE[1] + (NIGHT_MAX_EXPOSURE - EXPOSURE_RANGE[1]) * state.night
    const target = Math.min(Math.max(raw, EXPOSURE_RANGE[0]), max)
    if (snapFrames > 0) {
      // dopo un salto si aspetta una misura nuova e la si adotta senza transizione
      if (m.reads !== meterSeen) autoExposure = target
      snapFrames--
    } else autoExposure += (target - autoExposure) * (1 - Math.exp(-EXPOSURE_RATE * dt))
    meterSeen = m.reads
    renderer.toneMappingExposure = keyExposure * autoExposure
  }

  /**
   * Tutto ciò che sta nel gruppo dei soffitti proietta ombra, piano superiore compreso: l'ombra del solaio parte
   * così dal suo lato alto e cornici e rosoni a filo soffitto non prendono il sole attraverso il margine della mappa.
   */
  function solidCeilings() {
    ctx.groups.ceilings.traverse((o) => { if (o.isMesh && !o.material?.transparent) o.castShadow = true })
  }

  /** Dopo un salto (ora, stile, vista): sonde ricatturate subito ed esposizione senza transizione. */
  function relight() {
    probeHour = state.hour
    far.update()
    probes.converge()
    snapFrames = 12 // le luminanze tornano dalla GPU un paio di fotogrammi dopo
  }
  applyQuality()
  const first = apply(state.hour)
  env.regenerate(first, state.hour)
  sun.refreshShadow()

  ctx.events.on('ready', () => {
    sun.refreshShadow()
    lamps.precompile()
    solidCeilings()
    relight()
  })
  // dopo il ripristino del contesto WebGL la mappa PMREM, le sonde e le mappe d'ombra sono vuote: vanno rifatte
  ctx.canvas.addEventListener('webglcontextrestored', () => {
    env.regenerate(sample(state.hour), state.hour)
    sun.refreshShadow()
    if (state.ready) relight()
  })
  ctx.events.on('furnished', () => {
    refreshMaterials()
    lamps.markDirty()
    solidCeilings()
    sun.refreshShadow()
    if (state.ready) relight()
  })
  ctx.events.on('style:changed', () => {
    refreshMaterials()
    apply(state.hour)
    env.regenerate(sample(state.hour), state.hour) // l'intensità dell'ambiente dipende dallo stile
  })
  ctx.events.on('quality:changed', () => {
    applyQuality()
    apply(state.hour)
    probes.markDirty()
  })
  ctx.events.on('view:changed', () => {
    ceilingsVisible = ctx.groups.ceilings.visible
    sun.refreshShadow()
    lamps.markDirty()
    relight()
  })

  registry.updaters.push((dt) => {
    const before = state.hour
    stepHour(dt)
    if (Math.abs(state.hour - applied) > 1e-6) apply(state.hour)
    const moving = Math.abs(state.hour - before) > ENV_MOVING_EPS
    env.maybeRegenerate(() => sample(state.hour), state.hour, moving)
    // i soffitti nascosti non entrano nella mappa d'ombra: a ogni cambio la mappa va rifatta
    if (ctx.groups.ceilings.visible !== ceilingsVisible) {
      ceilingsVisible = ctx.groups.ceilings.visible
      sun.refreshShadow()
      probes.markDirty()
    }
    lamps.update(dt)
    if (Math.abs(state.hour - probeHour) > PROBE_HOUR_STEP) {
      probeHour = state.hour
      probes.markDirty()
    }
    far.update()
    probes.update()
    stepExposure(dt)
  })

  /**
   * Fissa l'ora bersaglio; con `immediate` l'ora mostrata salta subito.
   * @param {number} hour ora decimale, limitata a lighting.range
   * @param {{ immediate?: boolean }} [opts]
   */
  ctx.api.setTime = (hour, { immediate = false } = {}) => {
    const [lo, hi] = lighting.range
    const h = Math.min(Math.max(Number(hour), lo), hi)
    state.hourTarget = h
    if (immediate) {
      state.hour = h
      velocity = 0
      apply(h)
      lamps.snap()
      if (state.ready) relight()
    }
  }

  ctx.debug.lights = () => ({
    sun: { intensity: sun.light.intensity, elevation: sun.info.elevation, castShadow: sun.light.castShadow },
    hemi: hemi.intensity,
    lampOn,
    realLights: lamps.realLights,
    shadeEmissive: lamps.shade?.emissiveIntensity ?? 0,
    exposure: renderer.toneMappingExposure,
    night: state.night,
  })
}
