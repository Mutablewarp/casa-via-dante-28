/** Contenitori: armadio, colonna, scaffale e registrazione di tutti i tipi di storage (E2). */
import * as THREE from 'three'
import { edgeR, handle, onionFoot, feet } from './storage-util.js'
import * as cases from './storage-cases.js'
import * as low from './storage-low.js'

const DOOR_T = 0.022

/** Armadio a ante: Liberty con specchio centrale e cimasa, Moderno liscio a tutta altezza, Scandinavo su gambe. */
function cabinet(item, env, o) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const front = style === 'scandinavo' ? mat('wood.painted') : wood
  const r = edgeR(env, 0.02)
  const foot = lib ? 0.12 : style === 'moderno' ? 0.08 : 0.14
  const cima = o.crest && lib ? 0.17 : 0
  const bodyH = h - foot - cima
  const n = o.doors ?? (lib ? (w > 2.5 ? 5 : 3) : Math.max(2, Math.round(w / 0.62)))
  const dw = (w - 0.04) / n
  const zf = d / 2 - 0.035

  if (lib) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(onionFoot(env, foot, { x: sx * (w / 2 - 0.07), z: sz * (d / 2 - 0.07) }))
  } else if (style === 'moderno') g.add(kit.box(w - 0.1, foot, d - 0.12, mat('black')))
  else g.add(feet(env, w, d, foot, 0.07))
  g.add(kit.rbox(w, bodyH, d - 0.05, r, wood, { y: foot, z: -0.025 }))

  const tiers = o.tiers ?? 1
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.02 + dw * (i + 0.5)
    const mirror = o.mirror && lib && i === Math.floor(n / 2)
    for (let t = 0; t < tiers; t++) {
      const y0 = tiers === 1 ? foot + 0.02 : t === 0 ? foot + 0.02 : foot + bodyH * 0.38
      const hh = tiers === 1 ? bodyH - 0.04 : t === 0 ? bodyH * 0.38 - 0.04 : bodyH * 0.62 - 0.04
      if (lib) g.add(kit.panel(dw - 0.012, hh, DOOR_T, wood, { x, y: y0, z: zf }))
      else g.add(kit.rbox(dw - 0.008, hh, DOOR_T, r, front, { x, y: y0, z: zf }))
      if (mirror && t === tiers - 1) {
        g.add(kit.box(dw - 0.15, hh * 0.72, 0.008, mat('mirror'), { x, y: y0 + hh * 0.14, z: zf + DOOR_T * 0.75 + 0.004 }))
      }
      const side = i % 2 ? -1 : 1
      const hx = x + side * (dw / 2 - (lib ? 0.07 : 0.04))
      g.add(handle(env, hx, y0 + (t === 0 && tiers > 1 ? hh * 0.8 : hh * 0.55), zf + DOOR_T / 2 + (lib ? 0.008 : 0), 0.22, true))
    }
  }
  if (cima) {
    g.add(kit.box(w + 0.02, 0.025, d - 0.03, mat('wood.dark'), { y: foot + bodyH, z: -0.005 }))
    g.add(kit.crest(w - 0.04, 0.115, d - 0.12, wood, { y: foot + bodyH + 0.025, z: -0.01 }))
  }
  return g
}

/** Scaffale semplice a giorno; il ripiano più vicino a 1 m regge gli oggetti d'appoggio. */
function shelfUnit(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const t = style === 'liberty' ? 0.025 : 0.02
  const base = 0.08
  const n = Math.max(2, Math.round((h - base) / 0.4))
  g.add(kit.box(w - 0.02, base, d - 0.02, mat('wood.dark'), { z: 0 }))
  for (const s of [-1, 1]) g.add(kit.box(t + 0.01, h - base, d, wood, { x: s * (w / 2 - (t + 0.01) / 2), y: base }))
  g.add(kit.box(w - 0.06, h - base, 0.012, mat('wood.dark'), { y: base, z: -d / 2 + 0.006 }))
  let best = null
  for (let i = 0; i <= n; i++) {
    const y = base + ((h - base - t) * i) / n
    g.add(kit.box(w - 0.04, t, d - 0.01, wood, { y, z: 0.003 }))
    if (best === null || Math.abs(y + t - 1) < Math.abs(best - 1)) best = y + t
  }
  if (style === 'liberty') g.add(kit.box(w + 0.02, 0.03, d + 0.01, mat('wood.dark'), { y: h }))
  g.userData.top = { y: best, w: w - 0.06, d: d - 0.04 }
  return g
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('wardrobe', (item, env) => env.kit.finalize(cabinet(item, env, { mirror: true, crest: true }), item))
  furn.register('tall_cabinet', (item, env) => env.kit.finalize(cabinet(item, env, { tiers: 2, doors: Math.max(2, Math.round(item.size[0] / 0.48)) }), item))
  furn.register('shelf_unit', (item, env) => env.kit.finalize(shelfUnit(item, env), item))
  furn.register('bookcase', cases.bookcase)
  furn.register('display_cabinet', cases.displayCabinet)
  furn.register('wine_rack', cases.wineRack)
  furn.register('sideboard', low.sideboard)
  furn.register('chest', low.chest)
}
