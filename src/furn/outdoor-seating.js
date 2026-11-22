/** Esterni: sedia, poltrona e divano. Ferro battuto in Liberty, alluminio e corda in Moderno, legno in Scandinavo. */
import * as THREE from 'three'
import * as kit from './kit.js'

/**
 * Materiali e flag di stile per gli arredi da esterno.
 * @param {object} env ambiente del costruttore
 */
export function outdoorCtx(env) {
  const { mat, style } = env
  const lib = style === 'liberty'
  const mod = style === 'moderno'
  return {
    env, lib, mod, sca: !lib && !mod,
    frame: lib || mod ? mat('metal.iron') : mat('wood.primary'),
    rope: mat('wicker'), cush: mat('fabric.outdoor'), pillowA: mat('fabric.cushionA'), pillowB: mat('fabric.cushionB'),
    stone: mat('stone.bath'), wood: mat('wood.primary'), alu: mat('metal.chrome'),
  }
}

/** Tubo curvo con meno segmenti (ferro battuto); `pts` sono `[x, y, z]`. */
export function iron(pts, r, mat) {
  return kit.tube(pts, r, mat, { segments: pts.length * 3, radial: 5 })
}

/** Punti `[x, y, z]` da coppie `[a, y]` su un piano a x costante (`axis = 'x'`) oppure a z costante. */
export function plane(axis, k, list) {
  return list.map(([a, y]) => (axis === 'x' ? [k, y, a] : [a, y, k]))
}

/** Gamba tronco-conica: ferro e alluminio sottili, legno più grosso. */
function leg(c, h, at, r = 0.012) {
  return c.sca ? kit.cyl(r * 0.7, r * 1.5, h, c.frame, at, 8) : kit.cyl(r, r, h, c.frame, at, 8)
}

/** `outdoor_chair`: sedia da terrazza con schienale a volute (ferro), a pannello di corda (Moderno) o a listelli (Scandinavo). */
export function buildChair(item, env) {
  const [w, d, h] = item.size
  const c = outdoorCtx(env)
  const g = new THREE.Group()
  const sh = 0.45
  const zb = -d / 2 + 0.03
  const xs = w / 2 - 0.03
  for (const sx of [-1, 1]) {
    g.add(leg(c, sh, { x: sx * xs, z: d / 2 - 0.03 }))
    g.add(leg(c, h, { x: sx * xs, z: zb }))
  }
  if (c.sca) {
    for (let i = 0; i < 5; i++) g.add(kit.box(w - 0.04, 0.018, 0.058, c.wood, { y: sh - 0.02, z: -d / 2 + 0.07 + i * ((d - 0.14) / 4) }))
    for (let i = 0; i < 3; i++) g.add(kit.box(w - 0.06, 0.07, 0.016, c.wood, { y: 0.56 + i * 0.1, z: zb }))
  } else if (c.mod) {
    g.add(kit.box(w - 0.04, 0.03, d - 0.04, c.rope, { y: sh - 0.03 }))
    g.add(kit.box(w - 0.06, 0.3, 0.02, c.rope, { y: 0.5, z: zb }))
    g.add(iron(plane('z', zb, [[-xs, h - 0.02], [-xs / 2, h + 0.01], [xs / 2, h + 0.01], [xs, h - 0.02]]), 0.011, c.frame))
  } else {
    g.add(kit.box(w - 0.02, 0.02, d - 0.02, c.frame, { y: sh - 0.03 }))
    g.add(iron(plane('z', zb, [[-xs, h - 0.08], [-xs / 2, h - 0.01], [xs / 2, h - 0.01], [xs, h - 0.08]]), 0.01, c.frame))
    g.add(kit.box(w - 0.06, 0.012, 0.012, c.frame, { y: 0.52, z: zb }))
    g.add(kit.box(0.012, h - 0.52, 0.012, c.frame, { y: 0.52, z: zb }))
    for (const s of [-1, 1]) {
      g.add(iron(plane('z', zb, [[s * 0.15, 0.52], [s * 0.1, 0.6], [s * 0.15, 0.68], [s * 0.07, 0.74], [s * 0.02, 0.8]]), 0.007, c.frame))
    }
  }
  g.add(kit.cushion(w - 0.06, d - 0.08, c.sca ? 0.05 : 0.04, c.cush, { y: sh - 0.02, z: 0.01 }))
  return kit.finalize(g, item)
}

/** Braccio e fianco in ferro: due volute tra montante posteriore e anteriore a x = `x`. */
function ironArm(c, g, x, zb, zf, seatY, armY) {
  g.add(kit.cyl(0.012, 0.012, armY - 0.02, c.frame, { x, z: zf }, 8))
  g.add(iron(plane('x', x, [[zb, armY], [(zb + zf) / 2, armY + 0.01], [zf, armY - 0.02], [zf + 0.02, armY - 0.07]]), 0.011, c.frame))
  const a = zb + (zf - zb) * 0.12
  const b = zb + (zf - zb) * 0.88
  g.add(iron(plane('x', x, [[a, seatY + 0.02], [a + 0.06, seatY + 0.12], [(a + b) / 2, seatY + 0.06], [b - 0.06, seatY + 0.14], [b, seatY + 0.03]]), 0.008, c.frame))
}

/** Poltrona e divano da esterno con `n` posti (1 = poltrona). */
function lounge(item, env, n) {
  const [w, d, h] = item.size
  const c = outdoorCtx(env)
  const g = new THREE.Group()
  const seatY = 0.26
  const armY = 0.58
  const zb = -d / 2 + 0.04
  const zf = d / 2 - 0.04
  const xs = w / 2 - 0.03
  const inner = w - 0.1
  const lh = seatY
  for (const sx of [-1, 1]) for (const z of [zb, zf]) g.add(leg(c, lh, { x: sx * xs, z }, 0.016))
  if (n > 1) g.add(leg(c, lh, { x: 0, z: zb }, 0.016))
  g.add(kit.box(w - 0.04, 0.03, d - 0.04, c.frame, { y: seatY - 0.03 }))
  if (c.lib) {
    for (const s of [-1, 1]) {
      g.add(kit.cyl(0.013, 0.013, h - lh, c.frame, { x: s * xs, y: lh, z: zb }, 8))
      ironArm(c, g, s * xs, zb, zf, seatY, armY)
    }
    const cols = Math.max(3, Math.round(w / 0.1))
    const top = [...Array(cols + 1)].map((_, i) => {
      const u = i / cols
      return [-xs + u * 2 * xs, h - 0.05 + 0.05 * Math.sin(Math.PI * Math.min(1, n === 1 ? u : (u * n) % 1))]
    })
    g.add(iron(plane('z', zb, top), 0.011, c.frame))
    for (let i = 1; i < cols; i++) g.add(kit.cyl(0.005, 0.005, top[i][1] - 0.36 - 0.02, c.frame, { x: top[i][0], y: 0.36, z: zb }, 5))
    g.add(kit.box(w - 0.06, 0.012, 0.012, c.frame, { y: 0.36, z: zb }))
  } else {
    const fm = c.frame
    for (const s of [-1, 1]) {
      g.add(kit.box(0.04, armY - lh, d - 0.06, fm, { x: s * xs, y: lh }))
      g.add(kit.box(0.04, h - lh, 0.04, fm, { x: s * xs, y: lh, z: zb }))
    }
    g.add(kit.box(w - 0.04, 0.04, 0.04, fm, { y: h - 0.04, z: zb }))
    if (c.mod) g.add(kit.box(inner, 0.3, 0.02, c.rope, { y: 0.42, z: zb }))
    else for (let i = 0; i < 3; i++) g.add(kit.box(inner, 0.07, 0.018, c.wood, { y: 0.4 + i * 0.1, z: zb }))
  }
  const cw = (inner - 0.02) / n
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + 0.01 + cw / 2 + i * cw
    g.add(kit.cushion(cw - 0.01, d - 0.16, 0.12, c.cush, { x, y: seatY, z: 0.04 }, c.lib && n > 1))
    const back = kit.cushion(cw - 0.02, 0.12, 0.4, c.cush, {})
    back.rotation.x = -0.22
    back.position.set(x, seatY + 0.1, zb + 0.14)
    g.add(back)
  }
  if (n > 1) {
    for (const [s, m] of [[-1, c.pillowA], [1, c.pillowB]]) {
      const p = kit.cushion(0.3, 0.1, 0.3, m, {})
      p.rotation.x = -0.35
      p.position.set(s * (w / 2 - 0.3), seatY + 0.13, zb + 0.2)
      g.add(p)
    }
  }
  return kit.finalize(g, item)
}

/** `outdoor_armchair`: poltrona da esterno a un posto. */
export const buildArmchair = (item, env) => lounge(item, env, 1)
/** `outdoor_sofa`: divano da esterno a tre posti. */
export const buildSofa = (item, env) => lounge(item, env, 3)
