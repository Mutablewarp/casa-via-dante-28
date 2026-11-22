/** Tavolo da pranzo, scrittoio e toeletta (E1). */
import * as THREE from 'three'
import { pick, flat, superRect } from './seating-util.js'

/** Cavalletto a due gambe divaricate con traversa e piede, largo `d`, centrato in x = 0. */
function trestle(kit, d, h, mat) {
  const g = new THREE.Group()
  const spread = 0.1
  for (const s of [-1, 1]) {
    const leg = new THREE.Group()
    leg.position.set(0, 0, s * (d / 2 - 0.12))
    leg.rotation.x = -s * 0.1
    leg.add(kit.box(0.045, h, 0.045, mat))
    g.add(leg)
  }
  g.add(kit.box(0.04, 0.03, d - 0.2 + spread, mat, { y: 0.02 }))
  g.add(kit.box(0.03, 0.03, d - 0.3, mat, { y: h * 0.45 }))
  return g
}

/** Gamba tornita a balaustro. */
function turnedLeg(kit, h, mat, at) {
  const f = h / 0.7
  const prof = [[0, 0], [0.026, 0], [0.032, 0.04 * f], [0.02, 0.1 * f], [0.03, 0.17 * f], [0.046, 0.28 * f], [0.03, 0.42 * f], [0.046, 0.52 * f], [0.036, 0.6 * f], [0.042, 0.7 * f], [0, 0.7 * f]]
  return kit.lathe(prof, mat, at, 14)
}

/**
 * Tavolo da pranzo: piano ovale-rettangolare su gambe a balaustro (liberty), lastra su cavalletti (moderno), legno chiaro su gambe coniche (scandinavo).
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildDiningTable(item, env) {
  const [w, d, h] = item.size
  const { kit, mat } = env
  const g = new THREE.Group()
  if (env.style === 'liberty') {
    const wood = mat('wood.primary')
    const dk = mat('wood.dark')
    const t = 0.04
    g.add(flat(superRect(w, d, 5), t, wood, { y: h - t }))
    g.add(flat(superRect(w - 0.06, d - 0.06, 5), 0.02, dk, { y: h - t - 0.02 }))
    g.add(kit.rbox(w - 0.34, 0.1, d - 0.24, 0.01, wood, { y: h - t - 0.12 }))
    const lh = h - t - 0.12
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(turnedLeg(kit, lh + 0.04, dk, { x: sx * (w / 2 - 0.2), z: sz * (d / 2 - 0.14) }))
  } else if (env.style === 'moderno') {
    const t = 0.05
    g.add(kit.rbox(w, t, d, 0.004, mat('stone.top'), { y: h - t }))
    for (const s of [-1, 1]) {
      const tr = trestle(kit, d, h - t, mat('metal.iron'))
      tr.position.x = s * (w / 2 - 0.3)
      g.add(tr)
    }
  } else {
    const wood = mat('wood.primary')
    const t = 0.04
    g.add(flat(superRect(w, d, 6), t, wood, { y: h - t }))
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - 0.16)
      const z = sz * (d / 2 - 0.12)
      g.add(kit.cyl(0.04, 0.02, h - t, wood, { x, z }, 10))
    }
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/**
 * Scrittoio: piano in pelle con alzatina a cassettini e gambe a sciabola (liberty), piano su cavalletti (moderno), piano di legno con cassetto (scandinavo).
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildDesk(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const t = 0.035
  if (env.style === 'liberty') {
    const wood = mat('wood.dark')
    const brass = mat('metal.accent')
    g.add(kit.rbox(w, t, d, 0.01, wood, { y: h - t }))
    g.add(kit.box(w - 0.1, 0.004, d - 0.1, mat('leather'), { y: h - 0.001, z: 0.02 }))
    const ah = 0.09
    g.add(kit.rbox(w - 0.1, ah, d - 0.06, 0.01, wood, { y: h - t - ah }))
    g.add(kit.legs4(shape.legs, w - 0.02, d - 0.02, h - t - ah, wood, 0.05))
    for (const s of [-1, 1]) g.add(kit.panel(w * 0.2, 0.06, 0.016, wood, { x: s * w * 0.2, y: h - t - ah + 0.015, z: d / 2 - 0.03 }, brass))
    // alzatina a cassettini
    const aw = w - 0.2
    const az = -d / 2 + 0.07
    g.add(kit.rbox(aw, 0.065, 0.1, 0.006, wood, { y: h, z: az }))
    const n = 4
    for (let i = 0; i < n; i++) g.add(kit.panel(aw / n - 0.02, 0.045, 0.01, wood, { x: -aw / 2 + (i + 0.5) * aw / n, y: h + 0.012, z: az + 0.05 }, brass))
    g.add(kit.crest(aw * 0.5, 0.025, 0.02, wood, { y: h + 0.065, z: az }))
  } else if (env.style === 'moderno') {
    g.add(kit.rbox(w, 0.04, d, 0.004, mat('wood.primary'), { y: h - 0.04 }))
    for (const s of [-1, 1]) {
      const tr = trestle(kit, d, h - 0.04, mat('black'))
      tr.position.x = s * (w / 2 - 0.12)
      g.add(tr)
    }
  } else {
    const wood = mat('wood.primary')
    g.add(kit.rbox(w, t, d, 0.015, wood, { y: h - t }))
    g.add(kit.rbox(w * 0.3, 0.1, d - 0.12, 0.01, wood, { x: -w * 0.28, y: h - t - 0.1 }))
    g.add(kit.sphere(0.015, wood, { x: -w * 0.28, y: h - t - 0.065, z: d / 2 - 0.05 }))
    g.add(kit.legs4(shape.legs, w - 0.1, d - 0.1, h - t, wood, 0.04))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/**
 * Toeletta: piano con cassettini e gambe incurvate (liberty), mensola su gambe sottili (moderno), legno chiaro su gambe coniche (scandinavo).
 * Lo specchio è un oggetto d'appoggio (`mirror_triptych`) messo da chi allestisce.
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildVanity(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const lib = env.style === 'liberty'
  const wood = pick(env, mat('wood.dark'), mat('wood.painted'), mat('wood.primary'))
  const t = pick(env, 0.035, 0.05, 0.035)
  const ah = lib ? 0.12 : 0.07
  g.add(kit.rbox(w, t, d, pick(env, 0.012, 0.004, 0.018), lib ? mat('wood.primary') : wood, { y: h - t }))
  g.add(kit.rbox(w - 0.04, ah, d - 0.04, 0.008, wood, { y: h - t - ah }))
  g.add(kit.legs4(shape.legs, w - 0.02, d - 0.02, h - t - ah, pick(env, wood, mat('metal.chrome'), wood), 0.04))
  if (lib) {
    const brass = mat('metal.accent')
    for (const x of [-0.36, 0, 0.36]) g.add(kit.panel(0.3, 0.09, 0.016, wood, { x: x * w / 1.2, y: h - t - 0.105, z: d / 2 - 0.02 }, brass))
  } else {
    g.add(kit.box(w - 0.2, 0.012, 0.01, mat('black'), { y: h - t - ah + 0.02, z: d / 2 - 0.02 }))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}
