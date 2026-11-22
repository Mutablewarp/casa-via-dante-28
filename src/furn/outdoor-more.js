/** Esterni (E3): tavolo, lettino, dondolo e portaombrelli. Ferro e volute in Liberty, alluminio in Moderno, legno in Scandinavo. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { outdoorCtx, iron, plane } from './outdoor-seating.js'

/** `outdoor_table`: tavolo da terrazza con piano in pietra (Liberty), legno (Scandinavo) o lastra (Moderno). */
export function buildTable(item, env) {
  const [w, d, h] = item.size
  const c = outdoorCtx(env)
  const g = new THREE.Group()
  const t = 0.035
  const xs = w / 2 - 0.1
  const zs = d / 2 - 0.07
  g.add(kit.rbox(w, t, d, c.sca ? 0.012 : 0.004, c.lib ? c.stone : c.wood, { y: h - t }))
  if (c.lib) {
    g.add(kit.box(w - 0.04, 0.02, d - 0.04, c.frame, { y: h - t - 0.02 }))
    for (const sx of [-1, 1]) {
      g.add(iron(plane('x', sx * xs, [[-zs, 0.02], [-zs + 0.04, 0.35], [-zs + 0.1, h - t - 0.02]]), 0.012, c.frame))
      g.add(iron(plane('x', sx * xs, [[zs, 0.02], [zs - 0.04, 0.35], [zs - 0.1, h - t - 0.02]]), 0.012, c.frame))
      g.add(iron(plane('x', sx * xs, [[-zs + 0.04, 0.3], [-zs * 0.4, 0.42], [zs * 0.4, 0.3], [zs - 0.04, 0.42]]), 0.007, c.frame))
    }
    const rod = kit.cyl(0.01, 0.01, 2 * xs, c.frame, {}, 6)
    rod.rotation.z = Math.PI / 2
    rod.position.set(xs, 0.3, 0)
    g.add(rod)
  } else if (c.mod) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.box(0.04, h - t, 0.04, c.alu, { x: sx * xs, z: sz * zs }))
    g.add(kit.box(w - 0.2, 0.03, 0.03, c.alu, { y: h - t - 0.03 }))
  } else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.cyl(0.02, 0.032, h - t, c.wood, { x: sx * xs, z: sz * zs }, 8))
    g.add(kit.box(w - 0.3, 0.05, d - 0.2, c.wood, { y: h - t - 0.05 }))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/** `sunbed`: lettino con schienale reclinabile in alto (verso `-z`) e cuscino lungo. */
export function buildSunbed(item, env) {
  const [w, d, h] = item.size
  const c = outdoorCtx(env)
  const g = new THREE.Group()
  const sy = 0.3
  const xs = w / 2 - 0.03
  const hinge = -d / 2 + 0.78
  for (const sx of [-1, 1]) {
    for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) g.add(kit.cyl(0.014, 0.014, sy, c.frame, { x: sx * xs, z }, 8))
    g.add(kit.box(0.03, 0.03, d - 0.1, c.frame, { x: sx * xs, y: sy - 0.03 }))
    g.add(iron(plane('x', sx * xs, [[hinge, sy], [hinge - 0.2, sy + 0.2], [hinge - 0.36, sy + 0.34]]), 0.011, c.frame))
  }
  g.add(kit.box(w - 0.04, 0.02, d - hinge - d / 2 - 0.06, c.frame, { y: sy - 0.03, z: (hinge + d / 2) / 2 }))
  const legLen = d / 2 - hinge - 0.04
  g.add(kit.cushion(w - 0.08, legLen, 0.07, c.cush, { y: sy - 0.01, z: hinge + legLen / 2 }))
  const bl = 0.74
  const pivot = new THREE.Group()
  pivot.add(kit.cushion(w - 0.08, bl, 0.07, c.cush, { z: -bl / 2 }))
  pivot.position.set(0, sy - 0.01, hinge)
  pivot.rotation.x = 0.62
  g.add(pivot)
  g.add(kit.cushion(0.34, 0.2, 0.1, c.pillowA, { y: sy + 0.2, z: -d / 2 + 0.22 }))
  return kit.finalize(g, item)
}

/** Tettuccio in tela con frangia a festoni (Liberty) o lineare. */
function canopy(c, g, w, d, y) {
  const cw = w - 0.1
  const roof = kit.box(cw, 0.02, d + 0.12, c.cush, { y: y - 0.02 })
  roof.rotation.x = 0.0
  g.add(roof)
  if (c.lib) {
    const n = 12
    for (let i = 0; i < n; i++) g.add(kit.cyl(cw / n / 2, cw / n / 2 * 0.2, 0.09, c.cush, { x: -cw / 2 + (i + 0.5) * (cw / n), y: y - 0.1, z: d / 2 + 0.06 }, 8))
  } else g.add(kit.box(cw, 0.08, 0.02, c.cush, { y: y - 0.09, z: d / 2 + 0.06 }))
}

/** `swing_bench`: dondolo a due cavalletti ad arco, panca sospesa e tettuccio. */
export function buildSwing(item, env) {
  const [w, d, h] = item.size
  const c = outdoorCtx(env)
  const g = new THREE.Group()
  const xs = w / 2 - 0.05
  const topY = h - 0.05
  for (const sx of [-1, 1]) {
    const x = sx * xs
    if (c.lib) {
      g.add(iron(plane('x', x, [[-d / 2 + 0.02, 0], [-d / 4, topY * 0.5], [-0.03, topY]]), 0.016, c.frame))
      g.add(iron(plane('x', x, [[d / 2 - 0.02, 0], [d / 4, topY * 0.5], [0.03, topY]]), 0.016, c.frame))
      g.add(iron(plane('x', x, [[-d / 4, topY * 0.55], [0, topY * 0.78], [d / 4, topY * 0.55]]), 0.008, c.frame))
    } else {
      g.add(kit.box(0.05, 0.05, 0.05, c.frame, { x, z: -d / 2 + 0.03 }))
      for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
        const leg = kit.box(0.05, topY, 0.05, c.frame, { x, z })
        leg.rotation.z = 0
        g.add(leg)
      }
    }
  }
  const bar = kit.cyl(0.02, 0.02, w - 0.06, c.frame, {}, 8)
  bar.rotation.z = Math.PI / 2
  bar.position.set((w - 0.06) / 2, topY, 0)
  g.add(bar)
  const sy = 0.42
  const sw = w - 0.4
  for (const sx of [-1, 1]) for (const z of [-0.2, 0.2]) g.add(kit.cyl(0.004, 0.004, topY - sy, c.lib ? c.frame : c.rope, { x: sx * (sw / 2 - 0.02), y: sy, z: z * 0.3 }, 5))
  g.add(kit.box(sw, 0.04, 0.5, c.frame, { y: sy - 0.04 }))
  g.add(kit.cushion(sw - 0.04, 0.46, 0.1, c.cush, { y: sy }))
  const back = kit.cushion(sw - 0.06, 0.1, 0.4, c.cush, {})
  back.position.set(0, sy + 0.1, -0.22)
  back.rotation.x = -0.25
  g.add(back)
  for (const [s, m] of [[-1, c.pillowA], [1, c.pillowB]]) g.add(kit.cushion(0.34, 0.1, 0.3, m, { x: s * (sw / 2 - 0.35), y: sy + 0.18, z: -0.12 }))
  canopy(c, g, w, 0.5, topY + 0.05)
  return kit.finalize(g, item)
}

/** `umbrella_stand`: cilindro in ottone traforato con due ombrelli arrotolati. */
export function buildUmbrellaStand(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  const g = new THREE.Group()
  const r = w / 2 - 0.01
  const hh = h * 0.65
  g.add(kit.lathe([[0, 0], [r * 0.92, 0], [r, 0.02], [r, hh - 0.02], [r * 1.04, hh], [r * 0.9, hh]], mat('metal.accent'), {}, 16))
  const n = 12
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (row % 2) * 0.26
      g.add(kit.box(0.016, 0.07, 0.006, mat('black'), { x: Math.cos(a) * r, y: 0.08 + row * 0.12, z: Math.sin(a) * r, ry: -a + Math.PI / 2 }))
    }
  }
  const ribbed = [[mat('black'), -0.03, 0.03, 0.1], [mat('fabric.curtain'), 0.03, -0.02, -0.08]]
  for (const [m, x, z, tilt] of ribbed) {
    const u = new THREE.Group()
    u.add(kit.cyl(0.006, 0.006, h - 0.1, mat('wood.dark'), { y: 0.05 }, 6))
    u.add(kit.cyl(0.003, 0.03, 0.4, m, { y: h - 0.5 }, 8))
    u.add(kit.tube([[0, h - 0.1, 0], [0.02, h - 0.01, 0], [0.05, h - 0.01, 0], [0.06, h - 0.07, 0]], 0.006, mat('wood.dark'), { segments: 6, radial: 5 }))
    u.position.set(x, 0, z)
    u.rotation.z = tilt
    g.add(u)
  }
  return kit.finalize(g, item)
}
