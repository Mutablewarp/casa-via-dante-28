/** Lavanderia: lavatrice con asciugatrice in colonna, lavatoio in ceramica. Convenzioni in kit.js. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { styleCtx, cylZ } from './kitchen-parts.js'

/** Elettrodomestico da incasso con oblò, pannello comandi e manopola; `y0` quota della base. */
function unit(c, g, w, d, y0, hh) {
  const ring = c.lib ? c.brass : c.chrome
  const z0 = d / 2
  g.add(kit.box(w, hh, d - 0.02, c.ceramic, { y: y0, z: -0.01 }))
  g.add(kit.box(w - 0.06, 0.09, 0.006, c.black, { y: y0 + hh - 0.12, z: z0 + 0.001 }))
  g.add(cylZ(0.024, 0.02, ring, w * 0.3, y0 + hh - 0.1, z0, 12))
  g.add(kit.box(0.1, 0.03, 0.008, c.glass, { x: -w * 0.15, y: y0 + hh - 0.095, z: z0 + 0.004 }))
  const cy = y0 + (hh - 0.14) / 2 + 0.02
  g.add(cylZ(0.215, 0.025, ring, 0, cy, z0 - 0.015, 16))
  g.add(cylZ(0.18, 0.03, c.black, 0, cy, z0 - 0.012, 16))
  g.add(cylZ(0.14, 0.032, c.glass, 0, cy, z0 - 0.01, 16))
}

/** `washer_stack`: lavatrice in basso, asciugatrice sopra, piastra di fissaggio in mezzo. */
export function buildWasher(item, env) {
  const [w, d, h] = item.size
  const c = styleCtx(env)
  const g = new THREE.Group()
  const hh = (h - 0.03) / 2
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.cyl(0.02, 0.02, 0.015, c.black, { x: sx * (w / 2 - 0.05), z: sz * (d / 2 - 0.05) }, 8))
  unit(c, g, w, d, 0.015, hh - 0.015)
  g.add(kit.box(w - 0.04, 0.03, d - 0.06, c.chrome, { y: hh, z: -0.02 }))
  unit(c, g, w, d, hh + 0.03, hh)
  return kit.finalize(g, item)
}

/** `laundry_sink`: vasca in ceramica con alzata e rubinetto su telaio in legno con ripiano basso. */
export function buildLaundrySink(item, env) {
  const [w, d, h] = item.size
  const c = styleCtx(env)
  const g = new THREE.Group()
  const base = 0.62
  const wood = c.lib ? c.wood : c.mod ? c.black : c.wood
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.box(0.045, base, 0.045, wood, { x: sx * (w / 2 - 0.04), z: sz * (d / 2 - 0.04) }))
  g.add(kit.box(w - 0.08, 0.025, d - 0.08, wood, { y: 0.2 }))
  g.add(kit.box(w - 0.06, 0.05, 0.03, wood, { y: base - 0.05, z: d / 2 - 0.05 }))
  const t = 0.045
  const wh = h - base
  g.add(kit.box(w, 0.05, d, c.ceramic, { y: base }))
  g.add(kit.box(w, wh - 0.05, t, c.ceramic, { y: base + 0.05, z: d / 2 - t / 2 }))
  g.add(kit.box(w, wh - 0.05 + 0.1, t, c.ceramic, { y: base + 0.05, z: -d / 2 + t / 2 }))
  for (const s of [-1, 1]) g.add(kit.box(t, wh - 0.05, d - 2 * t, c.ceramic, { x: s * (w / 2 - t / 2), y: base + 0.05 }))
  for (let i = 0; i < 4; i++) g.add(kit.box(w - 2 * t, 0.012, 0.012, c.ceramic, { y: base + 0.09 + i * 0.045, z: -d / 2 + t + 0.004 }))
  const tapMat = c.tap
  const zb = -d / 2 + 0.07
  const y = h + 0.1
  g.add(kit.tube([[0, y, zb], [0, y + 0.12, zb], [0, y + 0.19, zb + 0.04], [0, y + 0.19, zb + 0.1], [0, y + 0.12, zb + 0.14]], 0.011, tapMat, { segments: 12, radial: 6 }))
  g.add(kit.cyl(0.026, 0.03, 0.03, tapMat, { y: y - 0.02, z: zb }, 10))
  return kit.finalize(g, item)
}
