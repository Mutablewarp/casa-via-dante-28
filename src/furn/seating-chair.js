/** Sedia da pranzo e da scrittoio (E1): liberty con schienale a lira, moderno a scocca, scandinavo in legno curvato. */
import * as THREE from 'three'

/** Schienale a lira: due volute e tre corde tra traversa e cimasa. */
function lyre(kit, mat, z, y0, y1) {
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const dy = y1 - y0
  for (const s of [-1, 1]) {
    const pts = [[0.04, 0], [0.085, 0.3], [0.075, 0.62], [0.035, 1]].map(([x, t]) => [s * x, y0 + t * dy, z])
    g.add(kit.tube(pts, 0.011, wood, { segments: 14, radial: 5 }))
  }
  for (const x of [-0.025, 0, 0.025]) g.add(kit.cyl(0.004, 0.004, dy * 0.92, mat('metal.accent'), { x, y: y0 + dy * 0.04, z }, 4))
  return g
}

/**
 * Sedia.
 * @param {{size:number[]}} item @param {object} env @param {boolean} [desk=false] con braccioli (sedia da scrittoio)
 * @returns {THREE.Group}
 */
export function buildChair(item, env, desk = false) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const fab = mat('fabric.chair')
  if (env.style === 'liberty') {
    const x0 = w / 2 - 0.03
    for (const s of [-1, 1]) {
      g.add(kit.leg(shape.legs, 0.38, wood, { x: s * x0, z: d / 2 - 0.03, ry: Math.atan2(-1, s) }))
      // gamba posteriore a sciabola che prosegue nel montante
      g.add(kit.tube([[s * x0, 0, -d / 2 + 0.04], [s * x0, 0.3, -d / 2 + 0.025], [s * x0, 0.55, -d / 2 + 0.02], [s * x0, h - 0.06, -d / 2 + 0.04]], 0.016, wood, { segments: 16, radial: 6 }))
    }
    g.add(kit.rbox(w - 0.04, 0.045, d - 0.04, 0.01, wood, { y: 0.35 }))
    g.add(kit.cushion(w - 0.06, d - 0.06, 0.07, fab, { y: 0.39, z: 0.005 }))
    g.add(kit.box(w - 0.06, 0.03, 0.025, wood, { y: 0.5, z: -d / 2 + 0.03 }))
    g.add(lyre(kit, mat, -d / 2 + 0.03, 0.52, h - 0.14))
    g.add(kit.crest(w - 0.04, 0.06, 0.028, wood, { y: h - 0.105, z: -d / 2 + 0.04 }))
    if (desk) {
      for (const s of [-1, 1]) {
        g.add(kit.tube([[s * x0, 0.62, -d / 2 + 0.04], [s * (x0 + 0.015), 0.65, -0.02], [s * x0, 0.62, d / 2 - 0.08]], 0.014, wood, { segments: 12, radial: 5 }))
        g.add(kit.cyl(0.013, 0.015, 0.16, wood, { x: s * x0, y: 0.46, z: d / 2 - 0.08 }, 6))
      }
    }
  } else if (env.style === 'moderno') {
    g.add(kit.legs4(shape.legs, w, d, 0.42, mat('metal.chrome'), 0.04))
    g.add(kit.rbox(w - 0.02, 0.05, d - 0.02, 0.02, fab, { y: 0.41 }))
    const wrap = new THREE.Group()
    wrap.position.set(0, 0.44, -d / 2 + 0.04)
    wrap.rotation.x = -0.14
    wrap.add(kit.rbox(w - 0.04, h - 0.5, 0.045, 0.02, fab))
    g.add(wrap)
    if (desk) for (const s of [-1, 1]) g.add(kit.rbox(0.035, 0.03, d * 0.55, 0.01, fab, { x: s * (w / 2 - 0.01), y: 0.62 }))
  } else {
    g.add(kit.legs4(shape.legs, w, d, 0.44, wood, 0.04))
    g.add(kit.rbox(w - 0.02, 0.035, d - 0.02, 0.015, wood, { y: 0.44 }))
    for (const s of [-1, 1]) {
      const wrap = new THREE.Group()
      wrap.position.set(s * (w / 2 - 0.04), 0.47, -d / 2 + 0.04)
      wrap.rotation.x = -0.14
      wrap.add(kit.cyl(0.013, 0.015, h - 0.5, wood, null, 8))
      g.add(wrap)
    }
    const band = new THREE.Group()
    band.position.set(0, h - 0.18, -d / 2 + 0.02)
    band.rotation.x = -0.16
    band.add(kit.rbox(w - 0.06, 0.14, 0.02, 0.008, wood))
    g.add(band)
    if (desk) for (const s of [-1, 1]) g.add(kit.rbox(0.03, 0.025, d * 0.5, 0.01, wood, { x: s * (w / 2 - 0.015), y: 0.62 }))
  }
  return kit.finalize(g, item)
}
