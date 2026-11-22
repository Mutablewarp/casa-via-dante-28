/** Cucina: componenti riusati dai mobili (ante, pomoli, maniglie, cappa, lavello, piano cottura, alzata). Convenzioni in kit.js. */
import * as THREE from 'three'
import * as kit from './kit.js'

/**
 * Raccoglie materiali e flag di stile usati da tutti i mobili di cucina.
 * @param {object} env ambiente del costruttore
 * @returns {object} contesto `c` con `lib`, `mod`, `sca` e i materiali
 */
export function styleCtx(env) {
  const { mat, style } = env
  const lib = style === 'liberty'
  const mod = style === 'moderno'
  return {
    env, lib, mod, sca: !lib && !mod,
    body: mat('wood.painted'), stone: mat('stone.top'), marble: mat('stone.bath'), black: mat('black'),
    ceramic: mat('ceramic.white'), glass: mat('glass.clear'), wood: mat('wood.primary'), dark: mat('wood.dark'),
    iron: mat('metal.iron'), copper: mat('metal.copper'), brass: mat('metal.accent'), chrome: mat('metal.chrome'),
    handle: lib ? mat('metal.accent') : mod ? mat('metal.chrome') : mat('wood.primary'),
    tap: lib ? mat('metal.accent') : mat('metal.chrome'),
    plinth: lib ? mat('wood.dark') : mod ? mat('black') : mat('wood.primary'),
    ceiling: env.ctx.plan.meta.ceilingHeight,
  }
}

/** Cilindro con asse lungo x, da `x0` a `x0 + len`. */
export function cylX(r, len, mat, x0, y, z, seg = 8) {
  const m = kit.cyl(r, r, len, mat, {}, seg)
  m.rotation.z = -Math.PI / 2
  m.position.set(x0, y, z)
  return m
}

/** Cilindro con asse lungo z, da `z0` a `z0 + len` (verso il fronte). */
export function cylZ(r, len, mat, x, y, z0, seg = 8) {
  const m = kit.cyl(r, r, len, mat, {}, seg)
  m.rotation.x = Math.PI / 2
  m.position.set(x, y, z0)
  return m
}

/** Pomolo sul piano frontale `z`: ottone tornito in Liberty, legno in Scandinavo, nessuno in Moderno. */
export function knob(c, x, y, z) {
  const g = new THREE.Group()
  if (c.mod) return g
  const m = c.lib
    ? kit.lathe([[0, 0], [0.011, 0], [0.006, 0.012], [0.016, 0.02], [0.01, 0.026], [0, 0.026]], c.handle, {}, 8)
    : kit.cyl(0.014, 0.014, 0.022, c.handle, {}, 8)
  m.rotation.x = Math.PI / 2
  m.position.set(x, y, z)
  g.add(m)
  return g
}

/**
 * Anta o frontale: a telaio con specchiatura in Liberty, liscia con gola in Moderno, liscia con pomolo in legno in Scandinavo.
 * @param {object} c contesto di stile @param {number} w @param {number} h
 * @param {number} x centro @param {number} y base @param {number} z piano di mezzeria dello spessore
 * @param {number} [kx=0] spostamento del pomolo in x @param {number} [ky] quota del pomolo (default metà)
 */
export function door(c, w, h, x, y, z, kx = 0, ky = h / 2) {
  const g = new THREE.Group()
  const t = 0.02
  if (c.lib) g.add(kit.panel(w, h, t, c.body, { x, y, z }))
  else g.add(kit.box(w, h, t, c.body, { x, y, z }))
  if (c.mod) g.add(kit.box(w, 0.012, 0.006, c.black, { x, y: y + h - 0.035, z: z + t / 2 }))
  g.add(knob(c, x + kx, y + ky, z + t / 2))
  return g
}

/** Modulo base con cassetto e una o due ante; `m = { x, w }`. */
export function baseModule(c, g, m, H, D) {
  const plinth = 0.1
  const top = H - 0.04 - 0.005
  const dh = 0.16
  const z0 = D / 2 - 0.01
  g.add(door(c, m.w - 0.012, dh, m.x, top - dh, z0))
  const y0 = plinth + 0.005
  const dTop = top - dh - 0.004
  const n = m.w > 0.75 ? 2 : 1
  const w = (m.w - 0.012 - (n - 1) * 0.004) / n
  for (let i = 0; i < n; i++) {
    const x = m.x - (m.w - 0.012) / 2 + w / 2 + i * (w + 0.004)
    const side = n === 1 ? 1 : i === 0 ? 1 : -1
    g.add(door(c, w, dTop - y0, x, y0, z0, side * (w / 2 - 0.05), dTop - y0 - 0.08))
  }
  g.add(kit.box(m.w, 0.04, D, c.stone, { x: m.x, y: H - 0.04 }))
}

/** Modulo cucina a cinque fuochi (quattro in Moderno e Scandinavo) con forno e maniglione. */
export function rangeModule(c, g, m, H, D) {
  const z0 = D / 2 - 0.01
  const front = c.mod ? c.chrome : c.ceramic
  g.add(kit.box(m.w, 0.04, D, c.black, { x: m.x, y: H - 0.04 }))
  // fuochi
  const burners = c.lib ? [[-0.22, -0.14], [0.22, -0.14], [-0.22, 0.14], [0.22, 0.14], [0, 0]] : [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]]
  for (const [bx, bz] of burners) {
    if (c.lib) g.add(kit.cyl(0.04, 0.045, 0.022, c.iron, { x: m.x + bx * (m.w / 0.9), y: H, z: bz }, 10))
    else g.add(kit.cyl(0.075, 0.075, 0.003, c.chrome, { x: m.x + bx * (m.w / 0.9), y: H, z: bz }, 14))
  }
  if (c.lib) {
    for (const bz of [-0.14, 0.14]) g.add(kit.box(m.w - 0.1, 0.012, 0.014, c.iron, { x: m.x, y: H + 0.022, z: bz }))
    for (const bx of [-0.22, 0.22]) g.add(kit.box(0.014, 0.012, D - 0.12, c.iron, { x: m.x + bx * (m.w / 0.9), y: H + 0.022 }))
  }
  // fascia comandi e forno
  const fh = 0.13
  g.add(kit.box(m.w - 0.01, fh, 0.03, front, { x: m.x, y: H - 0.04 - fh, z: z0 + 0.005 }))
  for (let i = 0; i < 5; i++) {
    const kx = m.x + (i - 2) * (m.w * 0.18)
    if (c.lib) g.add(knob(c, kx, H - 0.04 - fh / 2, z0 + 0.02))
    else g.add(kit.box(0.03, 0.03, 0.01, c.black, { x: kx, y: H - 0.04 - fh / 2 - 0.015, z: z0 + 0.02 }))
  }
  const oh = H - 0.04 - fh - 0.1 - 0.012
  g.add(kit.box(m.w - 0.01, oh, 0.03, front, { x: m.x, y: 0.1, z: z0 + 0.005 }))
  g.add(kit.box(m.w * 0.62, oh * 0.5, 0.004, c.black, { x: m.x, y: 0.1 + oh * 0.2, z: z0 + 0.022 }))
  const hy = 0.1 + oh - 0.07
  g.add(cylX(0.011, m.w - 0.2, c.handle, m.x - (m.w - 0.2) / 2, hy, z0 + 0.06))
  for (const s of [-1, 1]) g.add(cylZ(0.008, 0.05, c.handle, m.x + s * (m.w / 2 - 0.1), hy, z0 + 0.015))
}

/** Modulo lavello: piano a cornice attorno alla vasca, vasca, rubinetto, due ante. */
export function sinkModule(c, g, m, H, D) {
  const z0 = D / 2 - 0.01
  const ox = Math.min(0.56, m.w - 0.16)
  const oz = 0.36
  const zc = 0.02
  const t = 0.04
  const basin = c.mod ? c.chrome : c.ceramic
  const y = H - t
  const bw = (m.w - ox) / 2
  g.add(kit.box(m.w, t, zc - oz / 2 + D / 2, c.stone, { x: m.x, y, z: (-D / 2 + zc - oz / 2) / 2 }))
  g.add(kit.box(m.w, t, D / 2 - (zc + oz / 2), c.stone, { x: m.x, y, z: (D / 2 + zc + oz / 2) / 2 }))
  for (const s of [-1, 1]) g.add(kit.box(bw, t, oz, c.stone, { x: m.x + s * (ox / 2 + bw / 2), y, z: zc }))
  const bd = 0.2
  g.add(kit.box(ox, 0.02, oz, basin, { x: m.x, y: H - bd, z: zc }))
  for (const s of [-1, 1]) {
    g.add(kit.box(0.02, bd - 0.02, oz, basin, { x: m.x + s * (ox / 2 - 0.01), y: H - bd + 0.02, z: zc }))
    g.add(kit.box(ox, bd - 0.02, 0.02, basin, { x: m.x, y: H - bd + 0.02, z: zc + s * (oz / 2 - 0.01) }))
  }
  g.add(kit.cyl(0.025, 0.025, 0.004, c.black, { x: m.x, y: H - bd + 0.02, z: zc }, 10))
  // rubinetto
  const zb = -D / 2 + 0.07
  const pts = c.lib
    ? [[0, H, zb], [0, H + 0.2, zb], [0, H + 0.3, zb + 0.04], [0, H + 0.3, zb + 0.13], [0, H + 0.2, zb + 0.17], [0, H + 0.14, zb + 0.17]]
    : [[0, H, zb], [0, H + 0.28, zb], [0, H + 0.34, zb + 0.04], [0, H + 0.34, zb + 0.14]]
  const tap = kit.tube(pts, c.lib ? 0.011 : 0.014, c.tap, { segments: 14, radial: 6 })
  tap.position.x = m.x
  g.add(tap)
  g.add(kit.cyl(0.026, 0.032, 0.03, c.tap, { x: m.x, y: H, z: zb }, 10))
  const levers = c.lib ? [-0.08, 0.08] : [0.06]
  for (const lx of levers) {
    g.add(kit.cyl(0.009, 0.009, 0.05, c.tap, { x: m.x + lx, y: H, z: zb }, 6))
    g.add(kit.box(0.045, 0.012, 0.012, c.tap, { x: m.x + lx, y: H + 0.05, z: zb }))
  }
  const w = (m.w - 0.016) / 2
  for (const s of [-1, 1]) {
    g.add(door(c, w, H - 0.04 - 0.1 - 0.01, m.x + s * (w / 2 + 0.002), 0.105, z0, -s * (w / 2 - 0.05), H - 0.25))
  }
}

/** Tronco di piramide rettangolare con la base a `y = 0` (cappa). */
export function frustum(wB, dB, wT, dT, h, mat, at) {
  const geo = new THREE.BoxGeometry(1, 1, 1)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5
    p.setXYZ(i, p.getX(i) * (wB + (wT - wB) * t), t * h, p.getZ(i) * (dB + (dT - dB) * t))
  }
  geo.computeVertexNormals()
  return kit.place(new THREE.Mesh(geo, mat), at)
}

/** Cappa sopra il modulo `m`: campana in rame (Liberty), lastra e canna in acciaio (Moderno), scatola bianca con fascia in legno. */
export function hood(c, g, m, H, D) {
  const y0 = 1.55
  const hd = 0.55
  const z = -D / 2 + hd / 2
  const top = c.ceiling
  if (c.lib) {
    g.add(frustum(m.w, hd, 0.34, 0.3, 0.55, c.copper, { x: m.x, y: y0 + 0.04, z: -D / 2 + hd / 2 - 0.0 }))
    g.add(kit.box(m.w + 0.02, 0.04, hd + 0.02, c.brass, { x: m.x, y: y0, z }))
    g.add(kit.box(0.36, 0.03, 0.32, c.brass, { x: m.x, y: y0 + 0.58, z: -D / 2 + 0.16 }))
    const cy = y0 + 0.61
    g.add(kit.box(0.3, top - cy, 0.26, c.copper, { x: m.x, y: cy, z: -D / 2 + 0.13 }))
  } else if (c.mod) {
    g.add(kit.box(m.w, 0.05, hd - 0.05, c.chrome, { x: m.x, y: y0, z: z - 0.025 }))
    g.add(kit.box(0.3, top - y0 - 0.05, 0.2, c.chrome, { x: m.x, y: y0 + 0.05, z: -D / 2 + 0.1 }))
  } else {
    g.add(frustum(m.w, hd, 0.32, 0.28, 0.5, c.body, { x: m.x, y: y0 + 0.03, z }))
    g.add(kit.box(m.w + 0.02, 0.03, hd + 0.02, c.wood, { x: m.x, y: y0, z }))
    g.add(kit.box(0.3, top - y0 - 0.53, 0.26, c.body, { x: m.x, y: y0 + 0.53, z: -D / 2 + 0.13 }))
  }
}

/** Pensile sopra il modulo `m` da 1,45 m a 2,15 m, profondo 0,32 m a filo del muro. */
export function wallCabinet(c, g, m, D) {
  const y = 1.45
  const h = 0.7
  const dp = 0.32
  g.add(kit.box(m.w, h, dp - 0.02, c.body, { x: m.x, y, z: -D / 2 + (dp - 0.02) / 2 }))
  const n = m.w > 0.75 ? 2 : 1
  const w = (m.w - 0.012 - (n - 1) * 0.004) / n
  for (let i = 0; i < n; i++) {
    const x = m.x - (m.w - 0.012) / 2 + w / 2 + i * (w + 0.004)
    const side = n === 1 ? 1 : i === 0 ? 1 : -1
    g.add(door(c, w, h - 0.01, x, y + 0.005, -D / 2 + dp - 0.01, side * (w / 2 - 0.05), 0.12))
  }
}

/** Alzata di piastrelle dietro il piano: spessa 2 cm, da `H` a 1,45 m, UV in metri. */
export function backsplash(c, W, D, H, tileName) {
  const t = 0.02
  const h = 1.45 - H
  const geo = new THREE.BoxGeometry(W, h, t)
  const p = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + W / 2 + p.getZ(i), p.getY(i) + H + h / 2)
  const m = new THREE.Mesh(geo, kit.texMat(c.env.tex.tile(tileName)))
  m.position.set(0, H + h / 2, -D / 2 + t / 2)
  return m
}
