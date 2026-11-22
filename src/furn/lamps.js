/** Luci a sospensione, lanterne, lampade da terra, applique: solo geometria (le luci vere le crea G). */
import * as THREE from 'three'
import * as kit from './kit.js'
import { registerChandelier } from './lamps-chandelier.js'
import { shellProfile, tulip, dome, cup, drum, bulb, canopy, line, ring } from './lamps-parts.js'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)

function pendant(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  const brass = mat('metal.accent'), shade = mat('paper.shade'), cord = mat('black')
  const g = new THREE.Group()
  if (env.style === 'liberty') {
    const sh = clamp(w * 0.6, 0.12, h * 0.6)
    g.add(canopy(brass, 0.05))
    g.add(line(brass, 0.03, h - sh))
    g.add(kit.cyl(0.012, 0.02, 0.03, brass, { y: -(h - sh) - 0.025 }, 8))
    g.add(tulip(w / 2, sh, shade, { y: -h }))
    g.add(bulb(shade, -h + 0.04, 0.03))
  } else if (env.style === 'moderno') {
    const sh = Math.min(w * 0.9, h * 0.6)
    g.add(canopy(brass, 0.045, 0.02))
    g.add(line(cord, 0.02, h - sh, 0.004))
    g.add(drum(w / 2, sh, shade, { y: -h }))
    g.add(kit.cyl(w / 2, w / 2, 0.01, brass, { y: -(h - sh) - 0.01 }, 18))
    g.add(bulb(shade, -h + sh * 0.4, 0.03))
  } else {
    const r = Math.min(w / 2, h * 0.4)
    g.add(kit.cyl(0.03, 0.035, 0.02, mat('wood.primary'), { y: -0.02 }, 10))
    g.add(line(cord, 0.02, h - 2 * r, 0.004))
    g.add(kit.sphere(r, shade, { y: -h }))
  }
  return g
}

/** Gabbia a sei lati in ottone con vetri ambra (Liberty). */
function cageLantern(w, h, env) {
  const { mat } = env
  const brass = mat('metal.accent'), shade = mat('paper.shade')
  const g = new THREE.Group()
  const R = w / 2 * 0.9
  const bh = clamp(h * 0.5, 0.15, 0.4)
  const y0 = -h + 0.06
  g.add(kit.cyl(0.004, 0.025, 0.04, brass, { y: -h }, 8))
  g.add(kit.cyl(R, R * 0.8, 0.02, brass, { y: -h + 0.04 }, 6))
  g.add(kit.lathe(shellProfile([[R * 0.92, 0], [R * 0.92, bh]], 0.003), shade, { y: y0 }, 6))
  ring(g, 6, (a) => kit.cyl(0.005, 0.005, bh, brass, { x: Math.sin(a) * R * 0.94, y: y0, z: Math.cos(a) * R * 0.94 }, 6))
  g.add(kit.cyl(0.02, R * 1.02, 0.07, brass, { y: y0 + bh }, 6))
  g.add(kit.sphere(0.02, brass, { y: y0 + bh + 0.06 }))
  g.add(line(brass, 0.03, -(y0 + bh + 0.08)))
  g.add(canopy(brass, 0.05))
  g.add(bulb(shade, y0 + bh * 0.4, 0.03))
  return g
}

function lantern(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  if (env.style === 'liberty') return cageLantern(w, h, env)
  const shade = mat('paper.shade'), cord = mat('black'), frame = mat('metal.accent'), wood = mat('wood.primary')
  const g = new THREE.Group()
  const bh = clamp(h * 0.6, 0.18, 0.45), R = w / 2
  const y0 = -h
  if (env.style === 'moderno') {
    g.add(drum(R * 0.7, bh, shade, { y: y0 }))
    g.add(kit.cyl(R * 0.72, R * 0.72, 0.012, frame, { y: y0 + bh }, 18))
    g.add(kit.cyl(R * 0.72, R * 0.72, 0.012, frame, { y: y0 }, 18))
  } else {
    const o = [[R * 0.6, 0], [R, bh * 0.25], [R, bh * 0.75], [R * 0.6, bh]]
    g.add(kit.lathe(shellProfile(o, 0.004), shade, { y: y0 }, 16))
    g.add(kit.cyl(R * 0.62, R * 0.62, 0.015, wood, { y: y0 + bh }, 16))
    g.add(kit.cyl(R * 0.62, R * 0.62, 0.015, wood, { y: y0 - 0.01 }, 16))
  }
  g.add(bulb(shade, y0 + bh * 0.4, 0.03))
  g.add(line(cord, 0.02, h - bh - 0.015, 0.004))
  g.add(canopy(frame, 0.045, 0.02))
  return g
}

function floorLamp(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  const brass = mat('metal.accent'), shade = mat('paper.shade'), wood = mat('wood.primary')
  const g = new THREE.Group()
  const R = w / 2
  if (env.style === 'liberty') {
    const hd = 0.2, top = h - hd
    g.add(kit.lathe([[0, 0], [0.13, 0], [0.13, 0.02], [0.09, 0.05], [0.04, 0.1], [0.022, 0.14], [0, 0.14]], brass, {}, 20))
    g.add(kit.cyl(0.011, 0.011, top - 0.1, brass, { y: 0.1 }, 8))
    for (const k of [0.35, 0.7]) g.add(kit.sphere(0.022, brass, { y: 0.1 + (top - 0.1) * k - 0.022 }))
    g.add(kit.cyl(0.02, 0.012, 0.04, brass, { y: top - 0.03 }, 8))
    g.add(dome(R, hd, shade, { y: top }))
    g.add(bulb(shade, top + hd * 0.3, 0.03))
  } else if (env.style === 'moderno') {
    const sh = 0.3
    g.add(kit.cyl(0.14, 0.14, 0.015, brass, {}, 24))
    g.add(kit.cyl(0.008, 0.008, h - sh, brass, { y: 0.015 }, 8))
    g.add(drum(R, sh, shade, { y: h - sh }))
    g.add(kit.cyl(R, R, 0.008, brass, { y: h - 0.02 }, 18))
    g.add(bulb(shade, h - sh * 0.5, 0.035))
  } else {
    const sh = 0.32, top = h - sh - 0.05
    ring(g, 3, (a) => {
      const piv = new THREE.Group()
      const L = Math.hypot(top, 0.13)
      const leg = kit.cyl(0.008, 0.016, L, wood, { x: 0.15 }, 8)
      leg.rotation.z = Math.atan2(0.13, top)
      piv.add(leg)
      piv.rotation.y = a
      return piv
    })
    g.add(kit.sphere(0.03, wood, { y: top - 0.02 }))
    g.add(kit.cyl(0.006, 0.006, 0.1, wood, { y: top }, 6))
    g.add(kit.lathe(shellProfile([[R, 0], [R * 0.62, sh]], 0.004), shade, { y: h - sh }, 20))
    g.add(bulb(shade, h - sh * 0.45, 0.035))
  }
  return g
}

function sconce(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  const brass = mat('metal.accent'), shade = mat('paper.shade'), wood = mat('wood.primary')
  const g = new THREE.Group()
  if (env.style === 'liberty') {
    const x = Math.min(w * 0.38, 0.095)
    g.add(kit.rbox(0.07, h * 0.6, 0.014, 0.005, brass, { y: -h * 0.3, z: 0.007 }))
    g.add(kit.sphere(0.018, brass, { y: -0.018, z: 0.03 }))
    g.add(kit.cyl(0.003, 0.016, 0.07, brass, { y: -h * 0.3 - 0.06, z: 0.012 }, 8))
    for (const s of [-1, 1]) {
      g.add(kit.tube([[0, -0.03, 0.02], [s * x * 0.45, -0.05, 0.05], [s * x * 0.85, -0.01, 0.075], [s * x, 0.035, 0.085]], 0.006, brass, { segments: 10, radial: 5 }))
      g.add(kit.cyl(0.015, 0.01, 0.025, brass, { x: s * x, y: 0.02, z: 0.085 }, 8))
      g.add(cup(0.045, 0.1, shade, { x: s * x, y: 0.04, z: 0.085 }))
      g.add(bulb(shade, 0.075, 0.02, s * x, 0.085))
    }
  } else if (env.style === 'moderno') {
    g.add(kit.rbox(0.06, 0.14, 0.015, 0.004, brass, { y: -0.07, z: 0.0075 }))
    g.add(drum(0.04, 0.2, shade, { x: 0, y: -0.1, z: 0.055 }))
    g.add(bulb(shade, 0, 0.025, 0, 0.055))
  } else {
    const plate = kit.cyl(0.04, 0.04, 0.012, wood, { y: -0.05 }, 12)
    plate.rotation.x = Math.PI / 2
    g.add(plate)
    g.add(kit.tube([[0, -0.05, 0.01], [0, -0.04, 0.05], [0, -0.02, 0.075]], 0.006, wood, { segments: 4, radial: 5 }))
    g.add(kit.sphere(0.055, shade, { y: -0.06, z: 0.08 }))
  }
  return g
}

function outdoorLantern(item, env) {
  const [, , h] = item.size
  const { mat } = env
  const iron = mat('metal.iron'), shade = mat('paper.shade')
  const g = new THREE.Group()
  const R = 0.06, zc = 0.07, bh = h * 0.45, y0 = -h * 0.28
  g.add(kit.rbox(0.07, h, 0.012, 0.004, iron, { y: -h / 2, z: 0.006 }))
  g.add(kit.tube([[0, 0.17, 0.01], [0, 0.2, 0.04], [0, 0.17, zc]], 0.005, iron, { segments: 6, radial: 4 }))
  g.add(kit.tube([[0, -0.15, 0.01], [0, -0.17, 0.04], [0, -0.14, zc]], 0.005, iron, { segments: 6, radial: 4 }))
  g.add(kit.cyl(0.004, 0.03, 0.04, iron, { y: y0 - 0.05, z: zc }, 6))
  g.add(kit.cyl(R, R * 0.8, 0.02, iron, { y: y0 - 0.01, z: zc }, 6))
  g.add(kit.lathe(shellProfile([[R * 0.9, 0], [R * 0.9, bh]], 0.003), shade, { y: y0 + 0.01, z: zc }, 6))
  ring(g, 6, (a) => kit.cyl(0.004, 0.004, bh, iron, { x: Math.sin(a) * R * 0.93, y: y0 + 0.01, z: zc + Math.cos(a) * R * 0.93 }, 6))
  g.add(kit.cyl(0.015, R * 1.05, 0.07, iron, { y: y0 + 0.01 + bh, z: zc }, 6))
  g.add(kit.sphere(0.014, iron, { y: y0 + bh + 0.08, z: zc }))
  g.add(bulb(shade, y0 + bh * 0.4, 0.025, 0, zc))
  return g
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  registerChandelier(furn)
  const add = (type, fn) => furn.register(type, (item, env) => kit.finalize(fn(item, env), item))
  add('pendant', pendant)
  add('lantern', lantern)
  add('floor_lamp', floorLamp)
  add('sconce', sconce)
  add('outdoor_lantern', outdoorLantern)
}
