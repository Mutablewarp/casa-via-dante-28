/** Mobili lavabo: Liberty in noce con piano in marmo e lavabi da appoggio, Moderno/Scandinavo sospesi. */
import * as THREE from 'three'
import { edgeR, handle, feet } from './storage-util.js'

/** Catino ovale da appoggio, alto `hh`. */
function basin(env, bw, bd, hh, at) {
  const prof = [[0.001, 0], [0.4, 0.004], [0.8, 0.03 * hh / 0.12], [1.0, 0.1 * hh / 0.12], [1.0, hh], [0.9, hh], [0.84, 0.7 * hh], [0.5, 0.3 * hh], [0.001, 0.25 * hh]]
  const m = env.kit.lathe(prof, env.mat('ceramic.white'), at, 28)
  m.scale.set(bw / 2, 1, bd / 2)
  return m
}

/** Rubinetto: a croce in ottone (Liberty), a leva cromato altrimenti. */
function tap(env, x, y, z) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const m = mat(style === 'liberty' ? 'metal.accent' : 'metal.chrome')
  g.add(kit.cyl(0.02, 0.025, 0.025, m, null, 12))
  if (style === 'liberty') {
    g.add(kit.cyl(0.01, 0.012, 0.1, m, { y: 0.02 }, 8))
    g.add(kit.tube([[0, 0.1, 0], [0, 0.17, 0.04], [0, 0.17, 0.11], [0, 0.12, 0.13]], 0.009, m, { radial: 6 }))
    for (const s of [-1, 1]) {
      g.add(kit.cyl(0.006, 0.006, 0.04, m, { x: s * 0.07, y: 0.02 }, 6))
      g.add(kit.box(0.04, 0.008, 0.008, m, { x: s * 0.07, y: 0.062 }))
      g.add(kit.box(0.008, 0.008, 0.04, m, { x: s * 0.07, y: 0.062 }))
    }
  } else {
    g.add(kit.cyl(0.013, 0.013, 0.16, m, { y: 0.02 }, 10))
    g.add(kit.box(0.022, 0.02, 0.1, m, { y: 0.15, z: 0.04 }))
    g.add(kit.box(0.012, 0.012, 0.05, m, { x: 0.02, y: 0.18, z: 0.0 }))
  }
  g.position.set(x, y, z)
  return g
}

/**
 * @param {{size:number[]}} item @param {object} env @param {number} nb numero di lavabi
 * @returns {THREE.Group}
 */
export function buildVanity(item, env, nb) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const front = style === 'scandinavo' ? mat('wood.painted') : wood
  const topT = lib ? 0.035 : 0.05
  const leg = lib ? 0.15 : 0.22
  const bodyH = h - leg - topT
  if (lib) g.add(feet(env, w, d, leg, 0.05))
  g.add(kit.rbox(w - 0.02, bodyH, d - 0.03, edgeR(env, 0.015), wood, { y: leg, z: -0.01 }))
  const cols = nb === 1 ? 2 : 4
  const dw = (w - 0.06) / cols
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + 0.03 + dw * (i + 0.5)
    const z = d / 2 - 0.03
    if (lib) g.add(kit.panel(dw - 0.012, bodyH - 0.1, 0.02, wood, { x, y: leg + 0.05, z }))
    else g.add(kit.rbox(dw - 0.008, bodyH - 0.06, 0.02, edgeR(env, 0.012), front, { x, y: leg + 0.03, z }))
    g.add(handle(env, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), leg + bodyH * 0.7, z + 0.012, 0.12, false))
  }
  if (lib) {
    g.add(kit.rbox(w, topT, d, 0.012, mat('stone.bath'), { y: h - topT }))
    g.add(kit.box(w - 0.02, 0.05, 0.02, mat('stone.bath'), { y: h, z: -d / 2 + 0.012 }))
  } else {
    g.add(kit.rbox(w, topT, d, edgeR(env, 0.015), mat('ceramic.white'), { y: h - topT }))
  }
  const bw = nb === 1 ? Math.min(0.5, w - 0.2) : Math.min(0.5, (w - 0.2) / 2)
  const bd = Math.min(0.38, d - 0.1)
  for (let i = 0; i < nb; i++) {
    const x = nb === 1 ? 0 : (i === 0 ? -1 : 1) * w * 0.25
    g.add(basin(env, bw, bd, lib ? 0.12 : 0.06, { x, y: h, z: 0.03 }))
    g.add(tap(env, x, h, -d / 2 + 0.06))
  }
  g.userData.top = { y: h, w: w - 0.06, d: d - 0.04 }
  return g
}
