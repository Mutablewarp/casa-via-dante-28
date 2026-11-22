/** Tavolini, comodino, consolle e tavolo da bistrot (E1). */
import * as THREE from 'three'
import { pick, flat, superRect } from './seating-util.js'

/** Quattro traversine a telaio rettangolare (moderno). */
function railFrame(kit, w, d, y, mat, t = 0.02) {
  const g = new THREE.Group()
  for (const s of [-1, 1]) {
    g.add(kit.box(t, t, d, mat, { x: s * w / 2, y }))
    g.add(kit.box(w, t, t, mat, { y, z: s * d / 2 }))
  }
  return g
}

/**
 * Tavolino basso o d'appoggio: marmo su gambe incurvate con ripiano (liberty), piano sottile su telaio (moderno), piano tondo chiaro (scandinavo).
 * @param {{size:number[]}} item @param {object} env @param {boolean} round piano tondo in liberty (tavolini d'appoggio)
 * @returns {THREE.Group}
 */
export function buildLowTable(item, env, round) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  if (env.style === 'liberty') {
    const t = 0.035
    const dk = mat('wood.dark')
    const top = round ? flat(superRect(w, d, 2.6), t, mat('stone.top'), { y: h - t }) : kit.rbox(w, t, d, 0.012, mat('stone.top'), { y: h - t })
    g.add(top)
    g.add(round ? flat(superRect(w - 0.05, d - 0.05, 2.6), 0.03, dk, { y: h - t - 0.03 }) : kit.rbox(w - 0.04, 0.03, d - 0.04, 0.01, dk, { y: h - t - 0.03 }))
    g.add(kit.legs4(shape.legs, w - 0.02, d - 0.02, h - t - 0.03, dk, 0.045))
    g.add(flat(superRect(w - 0.16, d - 0.16, 3.2), 0.02, dk, { y: 0.1 }))
  } else if (env.style === 'moderno') {
    const t = 0.03
    const m = mat('metal.chrome')
    g.add(round ? flat(superRect(w, d, 2), t, mat('stone.top'), { y: h - t }) : kit.box(w, t, d, mat('stone.top'), { y: h - t }))
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.box(0.025, h - t, 0.025, m, { x: sx * (w / 2 - 0.05), z: sz * (d / 2 - 0.05) }))
    g.add(railFrame(kit, w - 0.1, d - 0.1, h * 0.25, m))
  } else {
    g.add(flat(superRect(w, d, 2.2), 0.035, wood, { y: h - 0.035 }))
    g.add(kit.legs4(shape.legs, w * 0.85, d * 0.85, h - 0.035, wood, 0.03))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/**
 * Comodino: cassetto con pomolo in ottone su gambe incurvate (liberty), cassa con gola su piedini (moderno), cassa su gambe coniche con pomolo di legno (scandinavo).
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildNightstand(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const lib = env.style === 'liberty'
  const wood = pick(env, mat('wood.dark'), mat('wood.painted'), mat('wood.primary'))
  const legH = pick(env, 0.17, 0.1, 0.18)
  const topT = 0.03
  g.add(kit.legs4(shape.legs, w, d, legH, pick(env, wood, mat('metal.chrome'), wood), 0.04))
  g.add(kit.rbox(w - 0.02, h - legH - topT, d - 0.02, pick(env, 0.012, 0.004, 0.02), wood, { y: legH }))
  g.add(lib ? kit.rbox(w, topT, d, 0.01, mat('stone.top'), { y: h - topT }) : kit.rbox(w, topT, d, pick(env, 0.01, 0.004, 0.02), wood, { y: h - topT }))
  const hh = (h - legH - topT) * 0.42
  const y1 = legH + (h - legH - topT) - hh - 0.025
  if (env.style === 'moderno') {
    g.add(kit.box(w - 0.1, 0.012, 0.01, mat('black'), { y: y1 + hh, z: d / 2 }))
    g.add(kit.box(w - 0.1, 0.012, 0.01, mat('black'), { y: legH + (h - legH - topT) * 0.46, z: d / 2 }))
  } else {
    const knob = lib ? mat('metal.accent') : wood
    g.add(kit.panel(w - 0.1, hh, 0.018, wood, { y: y1, z: d / 2 - 0.01 }, knob))
    g.add(kit.panel(w - 0.1, (h - legH - topT) * 0.42, 0.018, wood, { y: legH + 0.03, z: d / 2 - 0.01 }, knob))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/**
 * Consolle da parete: marmo su due gambe anteriori a S con traversa (liberty), mensola spessa su staffe (moderno, scandinavo).
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildConsole(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  if (env.style === 'liberty') {
    const wood = mat('wood.dark')
    const t = 0.035
    g.add(kit.rbox(w, t, d, 0.012, mat('stone.top'), { y: h - t }))
    g.add(kit.rbox(w - 0.04, 0.09, d - 0.04, 0.01, wood, { y: h - t - 0.09 }))
    const lh = h - t - 0.09
    for (const s of [-1, 1]) {
      g.add(kit.leg(shape.legs, lh, wood, { x: s * (w / 2 - 0.05), z: d / 2 - 0.05, ry: Math.atan2(-1, s) }))
      g.add(kit.box(0.05, lh, 0.04, wood, { x: s * (w / 2 - 0.05), z: -d / 2 + 0.04 }))
    }
    g.add(kit.rbox(w - 0.2, 0.025, 0.03, 0.01, wood, { y: 0.16, z: d / 2 - 0.05 }))
    g.add(kit.rbox(w - 0.2, 0.025, 0.03, 0.01, wood, { y: 0.16, z: -d / 2 + 0.04 }))
    g.add(kit.crest(w * 0.35, 0.05, 0.02, wood, { y: h - t - 0.09 - 0.005, z: -d / 2 + 0.03 }))
  } else {
    const slab = pick(env, mat('wood.primary'), mat('wood.primary'), mat('wood.primary'))
    const t = 0.06
    g.add(kit.rbox(w, t, d, env.style === 'moderno' ? 0.004 : 0.02, slab, { y: h - t }))
    const m = env.style === 'moderno' ? mat('metal.iron') : mat('wood.secondary')
    for (const s of [-1, 1]) {
      g.add(kit.box(0.02, h - t, d - 0.06, m, { x: s * (w / 2 - 0.1) }))
      g.add(kit.box(0.04, 0.02, d - 0.04, m, { x: s * (w / 2 - 0.1), y: h - t - 0.02 }))
    }
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/**
 * Tavolino da bistrot: piano tondo (marmo o legno) su colonna con base a tre piedi.
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildBistro(item, env) {
  const [w, d, h] = item.size
  const { kit, mat } = env
  const g = new THREE.Group()
  const lib = env.style === 'liberty'
  const r = Math.min(w, d) / 2
  const iron = pick(env, mat('metal.iron'), mat('metal.chrome'), mat('black'))
  const t = 0.025
  g.add(kit.cyl(r, r, t, pick(env, mat('stone.top'), mat('stone.top'), mat('wood.primary')), { y: h - t }, 32))
  if (lib) g.add(kit.cyl(r + 0.0, r - 0.01, 0.015, iron, { y: h - t - 0.015 }, 32))
  const colR = lib ? 0.03 : 0.018
  g.add(kit.lathe(lib
    ? [[0, 0.1], [0.045, 0.1], [0.025, 0.2], [0.035, 0.3], [0.022, 0.42], [0.03, 0.55], [0.05, h - t - 0.02], [0.0, h - t - 0.02]]
    : [[0, 0.02], [colR, 0.02], [colR, h - t], [0, h - t]], iron, null, 14))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(a)
    const z = Math.sin(a)
    const L = r * 0.95
    g.add(kit.tube([[x * 0.02, 0.12, z * 0.02], [x * L * 0.5, 0.09, z * L * 0.5], [x * L, 0.012, z * L]], lib ? 0.014 : 0.01, iron, { segments: 10, radial: 5 }))
  }
  g.userData.top = { y: h, w: r * 2 - 0.04, d: r * 2 - 0.04 }
  return kit.finalize(g, item)
}
