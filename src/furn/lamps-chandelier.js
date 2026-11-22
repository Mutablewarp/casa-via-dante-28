/** Lampadario: ottone a bracci con tulipani (Liberty), anello luminoso (Moderno), campana di carta (Scandinavo). */
import * as THREE from 'three'
import * as kit from './kit.js'
import { shellProfile, tulip, bulb, canopy, line, ring } from './lamps-parts.js'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)

/** Rosone in stucco: gruppo a sé, nascosto nella vista dall'alto. */
function rose(R, mat) {
  const p = [[0, -0.06], [R * 0.25, -0.065], [R * 0.3, -0.045], [R * 0.5, -0.05], [R * 0.6, -0.03], [R * 0.85, -0.035], [R, -0.012], [R, 0], [0, 0]]
  const g = new THREE.Group()
  g.add(kit.lathe(p, mat, {}, 24))
  g.userData.ceiling = true
  return g
}

/** Elemento tornito centrale (urna) a quota `y`. */
function hub(brass, y, s) {
  const p = [[0, -0.07], [0.03, -0.07], [0.055, -0.04], [0.066, 0], [0.05, 0.04], [0.022, 0.07], [0, 0.07]].map(([r, h]) => [r * s, h * s])
  return kit.lathe(p, brass, { y }, 14)
}

function liberty(item, env) {
  const [d, , h] = item.size
  const { mat } = env
  const brass = mat('metal.accent'), shade = mat('paper.shade')
  const g = new THREE.Group()
  const s = clamp(d / 0.8, 0.6, 1.2)
  const n = d >= 0.85 ? 8 : 6
  const sr = clamp(d * 0.07, 0.035, 0.075), sh = clamp(d * 0.2, 0.1, 0.17)
  const R = d / 2 - sr - 0.01
  const hubY = -h * 0.55
  if (env.ctx.currentStyle().ceiling?.rose) g.add(rose(clamp(d * 0.3, 0.18, 0.3), mat('wood.painted')))
  g.add(kit.cyl(0.011, 0.011, -hubY, brass, { y: hubY }, 8))
  g.add(hub(brass, hubY, s))
  g.add(kit.cyl(0.02 * s, 0.004, Math.max(h * 0.45 - 0.07 * s - 0.03, 0.05), brass, { y: -h + 0.03 }, 8)) // pendaglio
  g.add(kit.sphere(0.022 * s, brass, { y: -h }))
  ring(g, n, (a) => {
    const arm = new THREE.Group()
    const e = hubY + 0.05 * s
    const pts = [[0.04, hubY - 0.01], [R * 0.3, hubY - 0.08 * s], [R * 0.58, hubY - 0.05 * s], [R * 0.85, hubY + 0.03 * s], [R, e]]
    arm.add(kit.tube(pts.map(([r, y]) => [r, y, 0]), 0.0075, brass, { segments: 8, radial: 4 }))
    arm.add(kit.cyl(0.018, 0.012, 0.025, brass, { x: R, y: e - 0.01 }, 6))
    arm.add(tulip(sr, sh, shade, { x: R, y: e - 0.01 - sh }, 10))
    arm.add(bulb(shade, e - 0.04 - sh * 0.3, 0.022, R))
    arm.rotation.y = a
    return arm
  })
  return g
}

function moderno(item, env) {
  const [d, , h] = item.size
  const { mat } = env
  const metal = mat('metal.accent'), shade = mat('paper.shade')
  const g = new THREE.Group()
  const ringY = -h
  g.add(canopy(metal, 0.06, 0.02))
  const t = clamp(d * 0.04, 0.015, 0.025)
  const geo = new THREE.TorusGeometry(d / 2 - t, t, 8, 36)
  geo.rotateX(Math.PI / 2)
  const r = new THREE.Mesh(geo, shade)
  r.position.y = ringY + t
  g.add(r)
  const inner = new THREE.Mesh(new THREE.TorusGeometry(d / 4, t * 0.7, 6, 24).rotateX(Math.PI / 2), shade)
  inner.position.y = ringY + t
  g.add(inner)
  for (const a of [0, 2.094, 4.189]) { // tre cavi dal baldacchino all'anello
    const x = Math.sin(a) * (d / 2 - t), z = Math.cos(a) * (d / 2 - t)
    g.add(kit.tube([[Math.sin(a) * 0.03, -0.02, Math.cos(a) * 0.03], [x, ringY + t, z]], 0.004, metal, { segments: 2, radial: 4 }))
  }
  return g
}

function scandinavo(item, env) {
  const [d, , h] = item.size
  const { mat } = env
  const wood = mat('wood.primary'), shade = mat('paper.shade'), cord = mat('black')
  const g = new THREE.Group()
  const bh = clamp(d * 0.55, 0.2, h * 0.6), R = d / 2
  const top = -h + bh
  g.add(kit.cyl(0.035, 0.04, 0.02, wood, { y: -0.02 }, 12))
  g.add(line(cord, 0.02, -top + 0.0, 0.004))
  const o = [[R, 0], [R * 0.97, bh * 0.25], [R * 0.82, bh * 0.55], [R * 0.45, bh * 0.85], [0.03, bh]]
  g.add(kit.lathe(shellProfile(o, 0.004), shade, { y: -h }, 20))
  g.add(kit.cyl(0.03, 0.03, 0.03, wood, { y: top - 0.005 }, 12))
  g.add(bulb(shade, -h + bh * 0.4, 0.035))
  return g
}

/** @param {object} furn registro degli arredi */
export function registerChandelier(furn) {
  furn.register('chandelier', (item, env) => {
    const style = env.shape.chandelier
    const g = style === 'ottone_a_bracci_con_tulipani' ? liberty(item, env) : style === 'anello_led_o_sfere' ? moderno(item, env) : scandinavo(item, env)
    return kit.finalize(g, item)
  })
}
