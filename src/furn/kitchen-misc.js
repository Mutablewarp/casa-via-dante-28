/** Cucina: isola con rastrelliera di pentole, piattaia, colonna frigorifero. Convenzioni in kit.js. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { styleCtx, door, knob, cylX, cylZ } from './kitchen-parts.js'

/** Gamba tornita a balaustro: profilo scalato su altezza `h` e raggio massimo `r`. */
function turnedLeg(h, r, mat, at) {
  const prof = [[0.9, 0], [1, 0.03], [0.65, 0.06], [1, 0.13], [0.7, 0.2], [0.8, 0.5], [1, 0.72], [0.75, 0.8], [1, 0.95], [1, 1]]
  return kit.lathe(prof.map(([f, t]) => [r * f, t * h]), mat, at, 10)
}

/** Maniglia verticale a barra con due montanti, dal punto `(x, y0)` per `len` metri, a distanza `z`. */
function vbar(c, x, y0, len, z) {
  const g = new THREE.Group()
  g.add(kit.cyl(0.011, 0.011, len, c.handle, { x, y: y0, z: z + 0.04 }, 8))
  for (const y of [y0 + 0.03, y0 + len - 0.03]) g.add(cylZ(0.007, 0.04, c.handle, x, y, z))
  return g
}

/** Rastrelliera appesa al soffitto con cinque pentole in rame, centrata sopra l'origine. */
function potRack(c, w, d) {
  const g = new THREE.Group()
  const y = 2.05
  const rw = w * 0.9
  const rd = Math.min(d - 0.3, 0.3)
  const bars = c.lib ? c.iron : c.chrome
  for (const z of [-rd / 2, rd / 2]) g.add(cylX(0.012, rw, bars, -rw / 2, y, z, 8))
  for (const x of [-rw / 2, rw / 2]) {
    g.add(cylZ(0.012, rd, bars, x, y, -rd / 2, 8))
    for (const z of [-rd / 2, rd / 2]) g.add(kit.cyl(0.005, 0.005, c.ceiling - y, bars, { x, y, z }, 6))
  }
  const sizes = [[0.09, 0.1], [0.07, 0.08], [0.1, 0.11], [0.065, 0.07], [0.085, 0.09]]
  sizes.forEach(([r, ph], i) => {
    const x = -rw / 2 + 0.1 + i * ((rw - 0.2) / 4)
    const z = i % 2 ? rd / 2 : -rd / 2
    const top = y - 0.19
    g.add(kit.cyl(0.004, 0.004, 0.12, bars, { x, y: y - 0.12, z }, 6))
    g.add(kit.box(0.014, 0.12, 0.008, c.copper, { x, y: top, z }))
    g.add(kit.lathe([[0, 0], [r * 0.9, 0], [r, 0.012], [r, ph], [r * 1.05, ph + 0.006]], c.copper, { x, y: top - ph, z }, 12))
  })
  return g
}

/** `kitchen_island`: tavolo da lavoro con piano in marmo, ripiano basso, cassetto e, con `potRack`, rastrelliera. */
export function buildIsland(item, env) {
  const [w, d, h] = item.size
  const c = styleCtx(env)
  const g = new THREE.Group()
  const frame = c.lib ? c.wood : c.mod ? c.black : c.wood
  const top = c.mod ? c.stone : c.marble
  const ins = 0.05
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const at = { x: sx * (w / 2 - ins), z: sz * (d / 2 - ins) }
      if (c.lib) g.add(turnedLeg(h - 0.04, 0.032, frame, at))
      else if (c.mod) g.add(kit.box(0.045, h - 0.04, 0.045, c.chrome, at))
      else g.add(kit.cyl(0.02, 0.032, h - 0.04, frame, at, 10))
    }
  }
  g.add(kit.box(w - 0.1, 0.13, d - 0.1, frame, { y: h - 0.17 }))
  g.add(kit.box(w - 0.1, 0.025, d - 0.1, frame, { y: 0.2 }))
  g.add(kit.box(w, 0.04, d, top, { y: h - 0.04 }))
  const dz = d / 2 - ins + 0.01
  g.add(c.lib ? kit.panel(w - 0.3, 0.1, 0.02, frame, { y: h - 0.165, z: dz }) : kit.box(w - 0.3, 0.1, 0.02, frame, { y: h - 0.165, z: dz }))
  g.add(knob({ ...c, handle: c.lib ? c.brass : c.handle, mod: false }, 0, h - 0.115, dz + 0.01))
  if (item.opts?.potRack) g.add(potRack(c, w, d))
  g.userData.top = { y: h, w: w - 0.02, d: d - 0.02 }
  return kit.finalize(g, item)
}

/** Piatti in piedi su un ripiano, appoggiati allo schienale: dischi con disco blu al centro. */
function plateRow(c, g, x0, x1, y, z, n) {
  const lean = 0.2
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + 0.5) / n
    const p = new THREE.Group()
    p.add(kit.cyl(0.1, 0.1, 0.012, c.ceramic, {}, 12))
    p.add(kit.cyl(0.055, 0.055, 0.004, c.env.mat('fabric.cushionB'), { y: 0.01 }, 10))
    p.rotation.x = Math.PI / 2 - lean
    p.position.set(x, y + 0.1, z)
    g.add(p)
  }
}

/** `plate_rack`: credenza con ante e piattaia a giorno con due file di piatti. */
export function buildPlateRack(item, env) {
  const [w, d, h] = item.size
  const c = styleCtx(env)
  const g = new THREE.Group()
  const lh = 0.92
  const hd = 0.28
  g.add(kit.box(w - 0.02, 0.08, d - 0.06, c.plinth, { z: -0.03 }))
  g.add(kit.box(w, lh - 0.12, d - 0.02, c.body, { y: 0.08, z: -0.01 }))
  const n = Math.max(2, Math.round(w / 0.62))
  const dw = (w - 0.02) / n
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.01 + dw / 2 + i * dw
    g.add(door(c, dw - 0.008, lh - 0.12 - 0.02, x, 0.09, d / 2 - 0.01, i % 2 ? dw / 2 - 0.05 : -dw / 2 + 0.05, 0.55))
  }
  g.add(kit.box(w + 0.02, 0.04, d, c.stone, { y: lh - 0.04, z: 0 }))
  const zb = -d / 2 + hd / 2
  g.add(kit.box(w - 0.04, h - lh - 0.1, 0.02, c.body, { y: lh, z: -d / 2 + 0.01 }))
  for (const s of [-1, 1]) g.add(kit.box(0.03, h - lh - 0.1, hd, c.body, { x: s * (w / 2 - 0.025), y: lh, z: zb }))
  const shelves = [lh + 0.38, lh + 0.78]
  for (const y of shelves) {
    g.add(kit.box(w - 0.04, 0.025, hd, c.body, { y, z: zb }))
    g.add(kit.box(w - 0.04, 0.02, 0.02, c.body, { y: y + 0.025, z: -d / 2 + hd - 0.01 }))
    plateRow(c, g, -w / 2 + 0.1, w / 2 - 0.1, y + 0.025, -d / 2 + 0.1, Math.round((w - 0.2) / 0.14))
  }
  g.add(kit.box(w, 0.04, hd + 0.02, c.body, { y: h - 0.14, z: zb }))
  if (c.lib) g.add(kit.crest(w, 0.07, 0.03, c.body, { y: h - 0.1, z: -d / 2 + hd }))
  g.userData.top = { y: lh, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/** `fridge_column`: colonna con due ante (congelatore in alto), maniglie verticali. */
export function buildFridge(item, env) {
  const [w, d, h] = item.size
  const c = styleCtx(env)
  const g = new THREE.Group()
  const face = c.mod ? c.chrome : c.body
  const z0 = d / 2 - 0.015
  g.add(kit.box(w - 0.01, 0.08, d - 0.06, c.plinth, { z: -0.03 }))
  g.add(kit.box(w, h - 0.08 - 0.02, d - 0.03, c.body, { y: 0.08, z: -0.015 }))
  const split = 1.27
  const parts = [[0.085, split - 0.09], [split + 0.005, h - 0.025 - split - 0.005]]
  for (const [y, hh] of parts) {
    if (c.lib) g.add(kit.panel(w - 0.014, hh, 0.03, face, { y, z: z0 }))
    else g.add(kit.box(w - 0.014, hh, 0.03, face, { y, z: z0 }))
  }
  const hx = w / 2 - 0.07
  g.add(vbar(c, hx, 0.5, 0.5, z0 + 0.015))
  g.add(vbar(c, hx, split + 0.12, 0.35, z0 + 0.015))
  if (c.lib) g.add(kit.crest(w, 0.06, 0.03, c.body, { y: h - 0.03, z: -0.02 }))
  return kit.finalize(g, item)
}
