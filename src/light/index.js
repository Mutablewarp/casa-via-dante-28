/** Illuminazione dinamica: ora della giornata, sole e luna, cielo, riflessi e lampade. */
import { createSampler } from './keys.js'
import { createSun } from './sun.js'
import { createSky } from './sky.js'
import { createEnv } from './env.js'
import { createLamps, lampOnFromNight } from './lamps.js'

// Fattori di taratura: un solo numero per grandezza, i valori di spec/lighting.json restano intatti
const SUN_GAIN = 1
const HEMI_GAIN = 1.2
const LAMP_GAIN = 0.33
const EXPOSURE_GAIN = 1
const ENV_GAIN = 1.2
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
// Stili con pareti molto chiare: di giorno si toglie luce ambiente (emisfero) invece di abbassare tutta l'esposizione,
// così il sole e le ombre danno contrasto e i bianchi restano bianchi, non grigio-azzurri.
const STYLE_DAY = { moderno: { exposure: 0.92, hemi: 0.55, env: 0.85 }, scandinavo: { exposure: 0.95, hemi: 0.55, env: 0.6 } }
// Di giorno il cielo dell'emisfero si scalda verso il bianco caldo: dentro casa la luce rimbalza su muri e pavimenti,
// e il solo azzurro del cielo rendeva grigio-blu i bianchi e il legno chiaro.
const DAY_SKY_WARM = '#FFF1DE'
const DAY_SKY_WARM_MIX = 0.45

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE, renderer, scene, state, lighting, registry } = ctx
  const sample = createSampler(THREE, lighting)
  const sun = createSun(ctx, { gain: SUN_GAIN })
  const sky = createSky(ctx)
  const env = createEnv(ctx, { envGain: ENV_GAIN, floorGain: FLOOR_ENV_GAIN, glassGain: GLASS_ENV_GAIN, styleTrim: () => STYLE_DAY[state.style]?.env ?? 1 })
  const lamps = createLamps(ctx, { gain: LAMP_GAIN })
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 0)
  ctx.groups.lights.add(hemi)
  const ceilingTint = new THREE.Color(CEILING_TINT)
  const nightTint = new THREE.Color(NIGHT_SKY_TINT)
  const dayWarm = new THREE.Color(DAY_SKY_WARM)

  const omega = 3 / lighting.transition.easeSeconds
  let velocity = 0
  let applied = Infinity
  let emitted = Infinity
  let lampOn = 0
  let ceilingsVisible = ctx.groups.ceilings.visible

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
    hemi.color.copy(st.hemiSky).lerp(dayWarm, DAY_SKY_WARM_MIX * (1 - st.night)).lerp(nightTint, NIGHT_SKY_MIX * st.night)
    hemi.groundColor.copy(st.hemiGround).lerp(ceilingTint, CEILING_BOUNCE * (1 - st.night))
    hemi.groundColor.multiplyScalar(1 + (CEILING_FILL - 1) * (1 - st.night))
    const trim = STYLE_DAY[state.style] ?? { exposure: 1, hemi: 1 }
    const day = 1 - st.night
    hemi.intensity = st.hemiI * HEMI_GAIN * (1 + NIGHT_HEMI_LIFT * st.night) * (1 - (1 - trim.hemi) * day)
    renderer.toneMappingExposure = st.exposure * EXPOSURE_GAIN * (1 - (1 - trim.exposure) * day)
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
  applyQuality()
  const first = apply(state.hour)
  env.regenerate(first, state.hour)
  sun.refreshShadow()

  ctx.events.on('ready', () => {
    sun.refreshShadow()
    lamps.precompile()
  })
  // dopo il ripristino del contesto WebGL la mappa PMREM è vuota: va rigenerata
  ctx.canvas.addEventListener('webglcontextrestored', () => {
    env.regenerate(sample(state.hour), state.hour)
    sun.refreshShadow()
  })
  ctx.events.on('furnished', () => {
    refreshMaterials()
    lamps.markDirty()
    sun.refreshShadow()
  })
  ctx.events.on('style:changed', () => {
    refreshMaterials()
    apply(state.hour)
    env.regenerate(sample(state.hour), state.hour) // l'intensità dell'ambiente dipende dallo stile
  })
  ctx.events.on('quality:changed', () => {
    applyQuality()
    apply(state.hour)
  })
  ctx.events.on('view:changed', () => {
    ceilingsVisible = ctx.groups.ceilings.visible
    sun.refreshShadow()
    lamps.markDirty()
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
    }
    lamps.update(dt)
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
