/** Interpolazione dei fotogrammi di `lighting.keyframes`: tutte le grandezze del cielo a una data ora. */

// lighting.moonSwap: ora in cui la luce direzionale passa dal sole alla luna, a intensità zero
export const MOON_SWAP_HOUR = 20.2
const COLOR_KEYS = ['skyTop', 'skyHorizon', 'hemiSky', 'hemiGround']
const NUM_KEYS = ['hemiI', 'exposure', 'night', 'stars']

/** @param {number} a @param {number} b @param {number} x @returns {number} smoothstep di three */
export function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

const lerp = (a, b, t) => a + (b - a) * t

/** Fotogrammi con i colori già convertiti in `THREE.Color` (spazio lineare). */
function parse(THREE, frames) {
  return frames.map((k) => {
    const o = { ...k, sunColor: new THREE.Color(k.sunColor) }
    for (const c of COLOR_KEYS) o[c] = new THREE.Color(k[c])
    return o
  })
}

/** Trova i due fotogrammi vicini a `hour` (fuori intervallo: tiene il primo o l'ultimo). */
function bracket(frames, hour) {
  if (hour <= frames[0].hour) return [frames[0], frames[0], 0]
  const last = frames[frames.length - 1]
  if (hour >= last.hour) return [last, last, 0]
  let i = 0
  while (frames[i + 1].hour < hour) i++
  const a = frames[i], b = frames[i + 1]
  return [a, b, (hour - a.hour) / (b.hour - a.hour)]
}

/**
 * Crea il campionatore dei fotogrammi.
 * @param {object} THREE namespace three
 * @param {object} lighting contenuto di spec/lighting.json
 * @returns {(hour: number) => object} grandezze interpolate; gli oggetti restituiti sono riusati a ogni chiamata
 */
export function createSampler(THREE, lighting) {
  const all = parse(THREE, lighting.keyframes)
  const dayFrames = all.filter((k) => !k.moon)
  const moonFrames = all.filter((k) => k.moon)
  const out = { az: 0, el: 0, sunI: 0, moonPhase: false, moonVis: 0, sunVis: 1, sunColor: new THREE.Color() }
  out.sun = { az: 0, el: 0, color: new THREE.Color() }
  out.moon = { az: 0, el: 0, color: new THREE.Color() }
  for (const c of COLOR_KEYS) out[c] = new THREE.Color()

  /** Direzione e colore del corpo celeste che segue i fotogrammi `frames` (tiene i valori agli estremi). */
  function body(target, frames, hour) {
    const [a, b, t] = bracket(frames, hour)
    target.az = lerp(a.az, b.az, t)
    target.el = lerp(a.el, b.el, t)
    target.color.copy(a.sunColor).lerp(b.sunColor, t)
    return [a, b, t]
  }

  /** Luce direzionale: sole prima dello scambio, luna dopo; sole e luna per il cielo restano sempre definiti. */
  function directional(hour) {
    const [da, db, dt] = body(out.sun, dayFrames, hour)
    const [ma, mb, mt] = body(out.moon, moonFrames, hour)
    const moonPhase = hour >= MOON_SWAP_HOUR
    const src = moonPhase ? out.moon : out.sun
    out.moonPhase = moonPhase
    out.az = src.az
    out.el = src.el
    out.sunColor.copy(src.color)
    if (!moonPhase) out.sunI = lerp(da.sunI, db.sunI, dt)
    else if (hour < moonFrames[0].hour) out.sunI = moonFrames[0].sunI * smoothstep(MOON_SWAP_HOUR, moonFrames[0].hour, hour)
    else out.sunI = lerp(ma.sunI, mb.sunI, mt)
    out.moonVis = smoothstep(MOON_SWAP_HOUR, moonFrames[0].hour, hour)
    // l'alone del sole svanisce piano dopo l'ultimo fotogramma del giorno
    out.sunVis = 1 - smoothstep(dayFrames[dayFrames.length - 1].hour, moonFrames[0].hour, hour)
  }

  return (hour) => {
    const [a, b, t] = bracket(all, hour)
    for (const c of COLOR_KEYS) out[c].copy(a[c]).lerp(b[c], t)
    for (const n of NUM_KEYS) out[n] = lerp(a[n], b[n], t)
    directional(hour)
    out.hour = hour
    return out
  }
}
