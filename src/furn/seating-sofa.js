/** Divano e poltrona (E1): un costruttore per tre stili, la sagoma cambia con `env.shape`. */
import * as THREE from 'three'
import { pick, hcyl, arcShell } from './seating-util.js'

const LEAN = 0.2

/** Cuscino di schienale appoggiato al fondo, inclinato all'indietro. */
function backCushion(kit, w, bh, bt, mat, x, y, z, tufted) {
  const wrap = new THREE.Group()
  wrap.position.set(x, y, z)
  wrap.rotation.x = Math.PI / 2 - LEAN
  wrap.add(kit.cushion(w, bh, bt, mat, null, tufted))
  return wrap
}

/** Cuscino decorativo appoggiato di traverso. @returns {THREE.Group} */
function throwCushion(kit, mat, x, y, z, yaw) {
  const wrap = new THREE.Group()
  wrap.position.set(x, y, z)
  wrap.rotation.set(Math.PI / 2 - 0.5, yaw, 0, 'YXZ')
  wrap.add(kit.cushion(0.38, 0.38, 0.13, mat))
  return wrap
}

/** Schienale a onda (liberty): sagoma estrusa con bordo a colpo di frusta. */
function waveBack(kit, w, y0, hTop, t, mat, z) {
  const n = 12
  const top = []
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const k = Math.pow(Math.sin(Math.PI * u), 0.9) * 0.9 + 0.1 * Math.sin(2 * Math.PI * u)
    top.push([(u - 0.5) * w, Math.min(hTop, hTop - 0.2 + 0.2 * k)])
  }
  return { mesh: kit.extrude([[-w / 2, y0], [w / 2, y0], ...top], t, mat, { y: y0, z }, { bevel: 0.01 }), top }
}

/**
 * Divano a più posti con schienale, braccioli, cuscini di seduta e di schienale.
 * @param {{size:number[], opts?:{seats?:number}}} item @param {object} env ambiente del registro
 * @returns {THREE.Group}
 */
export function buildSofa(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const lib = env.style === 'liberty'
  const g = new THREE.Group()
  const seats = item.opts?.seats ?? 3
  const upholstery = mat('fabric.sofa')
  const legMat = pick(env, mat('wood.dark'), mat('metal.chrome'), mat('wood.primary'))
  const legH = pick(env, 0.12, 0.14, 0.17)
  const cs = pick(env, 0.19, 0.17, 0.16)
  const seatTop = 0.45
  const frameH = seatTop - legH - cs
  const armW = pick(env, 0.17, 0.14, 0.15)
  const armTop = pick(env, 0.66, 0.62, 0.6)
  const hTop = pick(env, h, h * 0.86, h * 0.88)
  const backT = pick(env, 0.2, 0.16, 0.22)
  const r = pick(env, 0.02, 0.012, 0.06)

  // piedini: sei a sciabola in liberty, quattro agli angoli negli altri stili
  const fx = lib ? [-1, 0, 1] : [-1, 1]
  for (const sx of fx) {
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - 0.1)
      g.add(kit.leg(shape.legs, legH, legMat, { x, z: sz * (d / 2 - 0.08), ry: Math.atan2(-sz, sx || 0.001) }))
    }
  }
  g.add(kit.rbox(w, frameH, d - 0.02, r, lib ? mat('wood.dark') : upholstery, { y: legH }))

  // braccioli
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - armW / 2)
    g.add(kit.rbox(armW, armTop - legH - 0.03, d - 0.02, r, upholstery, { x, y: legH }))
    if (lib) g.add(hcyl(0.1, 0.1, d - 0.06, upholstery, { x: x + s * 0.01, y: armTop - 0.02 }, 'z', 14))
  }

  // schienale
  let backTop = null
  if (lib) {
    const wb = waveBack(kit, w - 0.04, legH + 0.04, hTop, backT, upholstery, -d / 2 + backT / 2)
    g.add(wb.mesh)
    backTop = wb.top
    const trim = backTop.map(([x, y]) => [x, y + 0.004, -d / 2 + backT / 2 + 0.06])
    g.add(kit.tube(trim, 0.011, mat('metal.accent'), { segments: 24, radial: 4 }))
  } else {
    g.add(kit.rbox(w, hTop - legH, backT, r, upholstery, { y: legH, z: -d / 2 + backT / 2 }))
  }

  // cuscini di seduta e di schienale
  const iw = w - 2 * armW
  const cw = iw / seats
  const z0 = -d / 2 + backT
  const cd = d / 2 - 0.01 - z0
  const cz = (z0 + d / 2 - 0.01) / 2
  const bh = (hTop - seatTop) * pick(env, 0.62, 0.6, 0.66)
  const bt = pick(env, 0.15, 0.14, 0.18)
  for (let i = 0; i < seats; i++) {
    const x = -iw / 2 + cw * (i + 0.5)
    g.add(kit.cushion(cw - 0.01, cd, cs, upholstery, { x, y: legH + frameH, z: cz }))
    g.add(backCushion(kit, cw - 0.015, bh, bt, upholstery, x, seatTop + bh / 2 - 0.02, z0 - 0.01, lib))
  }
  // cuscini decorativi
  for (const s of [-1, 1]) {
    const m = mat(s < 0 ? 'fabric.cushionA' : 'fabric.cushionB')
    g.add(throwCushion(kit, m, s * (iw / 2 - 0.2), seatTop + 0.17, z0 + 0.16, -s * 0.5))
  }
  return kit.finalize(g, item)
}

/**
 * Poltrona: bergère con guscio avvolgente (liberty), scocca in pelle su telaio nero (moderno), listelli e cuscini (scandinavo).
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildArmchair(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const g = new THREE.Group()
  const seatTop = pick(env, 0.45, 0.43, 0.44)
  const fab = mat('fabric.armchair')
  if (env.style === 'liberty') {
    const wood = mat('wood.dark')
    const legH = 0.17
    g.add(kit.legs4(shape.legs, w, d, legH, wood, 0.06))
    g.add(kit.rbox(w - 0.04, 0.12, d - 0.04, 0.02, wood, { y: legH }))
    g.add(kit.cushion(w - 0.16, d - 0.18, seatTop - legH - 0.12, fab, { z: 0.02, y: legH + 0.12 }, true))
    const R = w / 2 - 0.06
    g.add(arcShell({
      rIn: R, thick: 0.07, y0: legH + 0.06, span: Math.PI * 0.95, mat: fab, at: { z: -d / 2 + R + 0.07 },
      top: (a) => h - 0.05 - 0.2 * Math.min(1, (Math.abs(a) / (Math.PI * 0.47)) ** 1.6) + 0.03 * Math.sin(a * 3),
    }))
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 0.06)
      g.add(kit.rbox(0.1, 0.3, d * 0.62, 0.03, fab, { x, y: legH + 0.12, z: d * 0.1 }))
      g.add(hcyl(0.05, 0.05, d * 0.64, fab, { x, y: legH + 0.45, z: d * 0.1 }, 'z', 12))
    }
  } else if (env.style === 'moderno') {
    const leather = mat('leather')
    g.add(kit.legs4(shape.legs, w, d, 0.3, mat('black'), 0.05))
    g.add(kit.rbox(w - 0.02, 0.1, d - 0.04, 0.03, leather, { y: 0.3 }))
    g.add(kit.cushion(w - 0.14, d - 0.2, 0.08, leather, { y: 0.4, z: 0.02 }))
    const back = kit.rbox(w - 0.02, h - 0.36, 0.09, 0.04, leather, { y: 0, z: 0 })
    const wrap = new THREE.Group()
    wrap.position.set(0, 0.36, -d / 2 + 0.06)
    wrap.rotation.x = -0.14
    wrap.add(back)
    g.add(wrap)
    for (const s of [-1, 1]) g.add(kit.rbox(0.06, 0.2, d * 0.6, 0.025, leather, { x: s * (w / 2 - 0.04), y: 0.42, z: 0.03 }))
  } else {
    const wood = mat('wood.primary')
    g.add(kit.legs4(shape.legs, w, d, 0.25, wood, 0.05))
    g.add(kit.rbox(w - 0.02, 0.06, d - 0.02, 0.02, wood, { y: 0.25 }))
    g.add(kit.cushion(w - 0.16, d - 0.14, 0.14, fab, { y: 0.31, z: 0.03 }))
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * ((w - 0.14) / 4)
      const slat = kit.rbox(0.045, h - 0.34, 0.02, 0.008, wood, { x, y: 0 })
      const wrap = new THREE.Group()
      wrap.position.set(x, 0.3, -d / 2 + 0.05)
      wrap.rotation.x = -0.2
      slat.position.x = 0
      wrap.add(slat)
      g.add(wrap)
    }
    const bc = new THREE.Group()
    bc.position.set(0, 0.5, -d / 2 + 0.09)
    bc.rotation.x = Math.PI / 2 - 0.2
    bc.add(kit.cushion(w - 0.2, 0.34, 0.1, fab))
    g.add(bc)
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 0.03)
      g.add(kit.rbox(0.055, 0.035, d - 0.08, 0.012, wood, { x, y: 0.5 }))
      g.add(kit.rbox(0.04, 0.2, 0.04, 0.01, wood, { x, y: 0.31, z: d / 2 - 0.08 }))
    }
  }
  return kit.finalize(g, item)
}
