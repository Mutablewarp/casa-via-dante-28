/** Sanitari e scaldasalviette: wc, bidet, towel_rail (E2). */
import * as THREE from 'three'
import { edgeR } from './storage-util.js'
import { rboxLo, ball } from './beds-util.js'

/** Catino tondo scalato in pianta: profilo (raggio, quota) già in metri, raggio 1 = metà larghezza. */
function bowl(env, w, depth, y, at) {
  const prof = [[0.001, y + 0.02], [0.5, y + 0.03], [0.85, y + 0.07], [1.0, y + 0.14], [1.0, y + 0.2], [0.9, y + 0.2], [0.82, y + 0.12], [0.45, y + 0.07], [0.001, y + 0.06]]
  const m = env.kit.lathe(prof, env.mat('ceramic.white'), at, 24)
  m.scale.set(w / 2, 1, depth / 2)
  return m
}

/** Anello del sedile. */
function seat(env, w, depth, y, z, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 22), mat)
  m.rotation.x = Math.PI / 2
  m.scale.set(w * 0.46, depth * 0.46, 0.4)
  m.position.set(0, y, z)
  return m
}

/** Water: Liberty a terra con cassetta bassa e sedile in legno; Moderno/Scandinavo sospesi con placca a muro. */
export function wc(item, env) {
  const [w, d] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const white = mat('ceramic.white')
  const zb = -d / 2
  const bl = d - 0.13
  const zc = zb + 0.13 + bl / 2
  if (lib) {
    g.add(kit.cyl(0.1, 0.12, 0.28, white, { z: zc - 0.02 }, 18))
    g.add(bowl(env, w - 0.01, bl, 0.24, { z: zc }))
    g.add(seat(env, w, bl, 0.44, zc, mat('wood.dark')))
    g.add(rboxLo(w - 0.03, 0.38, 0.16, 0.03, white, { y: 0.42, z: zb + 0.09 }))
    g.add(rboxLo(w - 0.01, 0.04, 0.18, 0.015, white, { y: 0.8, z: zb + 0.09 }))
    g.add(kit.tube([[0.1, 0.84, zb + 0.09], [0.1, 0.9, zb + 0.09], [0.14, 0.92, zb + 0.09]], 0.006, mat('metal.accent'), { radial: 5 }))
    g.add(ball(0.018, mat('metal.accent'), { x: 0.14, y: 0.9, z: zb + 0.09 }))
  } else {
    const r = edgeR(env, 0.07)
    const y = 0.22
    g.add(kit.rbox(w - 0.02, 1.1, 0.1, 0.01, white, { y: 0.02, z: zb + 0.05 }))
    g.add(kit.rbox(w - 0.03, 0.22, bl, r, white, { y, z: zc + 0.02 }))
    g.add(kit.rbox(w - 0.05, 0.035, bl - 0.03, r * 0.6, white, { y: y + 0.22, z: zc + 0.02 }))
    g.add(kit.cyl(0.03, 0.03, 0.008, mat('metal.chrome'), { y: 1.0, z: zb + 0.105 }, 14))
  }
  return kit.finalize(g, item)
}

/** Bidet: catino aperto con rubinetto sul bordo posteriore. */
export function bidet(item, env) {
  const [w, d] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const white = mat('ceramic.white')
  const zb = -d / 2
  const bl = d - 0.13
  const zc = zb + 0.13 + bl / 2
  const metal = mat(lib ? 'metal.accent' : 'metal.chrome')
  if (lib) {
    g.add(kit.cyl(0.09, 0.11, 0.26, white, { z: zc - 0.02 }, 18))
    g.add(bowl(env, w - 0.01, bl, 0.22, { z: zc }))
  } else {
    g.add(kit.rbox(w - 0.03, 0.14, bl, edgeR(env, 0.07), white, { y: 0.22, z: zc }))
    g.add(bowl(env, w - 0.06, bl - 0.04, 0.2, { z: zc }))
    g.add(kit.rbox(w - 0.02, 0.5, 0.1, 0.01, white, { y: 0.02, z: zb + 0.05 }))
  }
  g.add(kit.rbox(w - 0.03, 0.06, 0.1, 0.02, white, { y: lib ? 0.4 : 0.38, z: zb + 0.07 }))
  g.add(kit.cyl(0.013, 0.013, 0.1, metal, { y: lib ? 0.45 : 0.43, z: zb + 0.07 }, 8))
  g.add(kit.box(0.018, 0.014, 0.07, metal, { y: lib ? 0.53 : 0.51, z: zb + 0.1 }))
  return kit.finalize(g, item)
}

/** Scaldasalviette: tubi in ottone (Liberty) o cromati con asciugamano appeso. Origine al centro del riquadro a parete. */
export function towelRail(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const m = mat(lib ? 'metal.accent' : 'metal.chrome')
  const zb = d * 0.65
  const n = 5
  const bars = []
  for (let i = 0; i < n; i++) bars.push(h / 2 - 0.08 - ((h - 0.16) * i) / (n - 1))
  const horizontal = (y, z) => new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, w - 0.04, 8), m).translateX(0).translateY(y).translateZ(z)
  for (const y of bars) {
    const b = horizontal(y, zb)
    b.rotation.z = Math.PI / 2
    g.add(b)
  }
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.02)
    g.add(kit.box(0.025, h - 0.1, 0.012, m, { x, y: -h / 2 + 0.05, z: 0.006 }))
    for (const y of [bars[0], bars[n - 1]]) g.add(kit.box(0.018, 0.018, zb, m, { x, y: y - 0.009, z: zb / 2 }))
    if (lib) for (const y of [bars[0] + 0.03, bars[n - 1] - 0.03]) g.add(ball(0.018, m, { x, y: y - 0.018, z: 0.012 }))
  }
  // asciugamano sopra le due barre centrali
  const tw = mat('fabric.linen')
  const y1 = bars[1]
  const y2 = bars[2]
  const tl = w * 0.58
  g.add(kit.box(tl, y1 - y2 + 0.2, 0.012, tw, { y: y2 - 0.14, z: zb + 0.016 }))
  g.add(kit.box(tl, y1 - y2 + 0.2 - 0.07, 0.012, tw, { y: y2 - 0.14, z: zb - 0.016 }))
  g.add(kit.box(tl, 0.012, 0.045, tw, { y: y1 + 0.011, z: zb }))
  g.add(kit.box(tl, 0.02, 0.03, mat('fabric.bedAccent'), { y: y2 - 0.11, z: zb + 0.024 }))
  return kit.finalize(g, item)
}
