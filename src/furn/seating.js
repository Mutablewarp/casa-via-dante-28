/** Sedute (E1): registra divano, poltrone, sedie, panche, pouf e sgabello. */
import * as THREE from 'three'
import { buildSofa, buildArmchair } from './seating-sofa.js'
import { buildChair } from './seating-chair.js'
import { pick } from './seating-util.js'

/** Panca o banquette: con schienale se più alta di 0,6 m. */
function buildBench(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const lib = env.style === 'liberty'
  const g = new THREE.Group()
  const back = h > 0.6
  const seatTop = back ? 0.45 : h
  const legH = pick(env, 0.16, 0.1, 0.14)
  const wood = pick(env, mat('wood.dark'), mat('metal.chrome'), mat('wood.primary'))
  const fab = mat('fabric.sofa')
  const apron = pick(env, 0.1, 0.12, 0.1)
  const cushH = seatTop - legH - apron
  g.add(kit.legs4(shape.legs, w, d, legH, wood, 0.04))
  g.add(kit.rbox(w, apron, d, pick(env, 0.015, 0.01, 0.04), lib ? wood : fab, { y: legH }))
  const n = Math.max(1, Math.round(w / 1.1))
  const cw = w / n
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + cw * (i + 0.5)
    g.add(kit.cushion(cw - 0.015, d - 0.03 - (back ? 0.08 : 0), cushH, fab, { x, y: legH + apron, z: back ? 0.04 : 0 }, lib))
  }
  if (back) {
    const bh = h - seatTop - (lib ? 0.1 : 0.03)
    g.add(kit.rbox(w, bh, 0.1, pick(env, 0.025, 0.012, 0.04), fab, { y: seatTop - 0.04, z: -d / 2 + 0.05 }))
    if (lib) g.add(kit.crest(w - 0.02, 0.06, 0.06, wood, { y: h - 0.1, z: -d / 2 + 0.05 }))
  }
  return kit.finalize(g, item)
}

/** Pouf: cilindro imbottito (capitonné in liberty) su piedini. */
function buildPouf(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, shape } = env
  const lib = env.style === 'liberty'
  const g = new THREE.Group()
  const r = Math.min(w, d) / 2
  const legH = pick(env, 0.08, 0.02, 0.1)
  const fab = mat('fabric.armchair')
  g.add(kit.lathe([[0, legH], [r, legH], [r * 1.02, h * 0.55], [r * 0.95, h * 0.9], [r * 0.5, h * 0.99], [0, h]], fab, null, 24))
  if (lib) {
    const b = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 6, 4), fab, 7)
    const m = new THREE.Matrix4()
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2
      const rr = i === 6 ? 0 : r * 0.55
      b.setMatrixAt(i, m.makeTranslation(Math.cos(a) * rr, h * 0.97, Math.sin(a) * rr))
    }
    g.add(b)
  }
  const legMat = pick(env, mat('wood.dark'), mat('metal.chrome'), mat('wood.primary'))
  if (legH > 0.03) {
    for (let i = 0; i < 4; i++) {
      const a = (i + 0.5) * Math.PI / 2
      g.add(kit.leg(shape.legs, legH, legMat, { x: Math.cos(a) * r * 0.7, z: Math.sin(a) * r * 0.7, ry: -a }))
    }
  }
  return kit.finalize(g, item)
}

/** Sgabello da pianoforte: seduta rotonda su colonna a vite e tre gambe. */
function buildStool(item, env) {
  const [w, d, h] = item.size
  const { kit, mat } = env
  const lib = env.style === 'liberty'
  const g = new THREE.Group()
  const r = Math.min(w, d) / 2
  const seatH = 0.08
  const metal = pick(env, mat('metal.accent'), mat('metal.chrome'), mat('wood.primary'))
  const wood = pick(env, mat('wood.dark'), mat('black'), mat('wood.primary'))
  g.add(kit.cushion(r * 2, r * 2, seatH, mat('fabric.chair'), { y: h - seatH }, lib))
  g.add(kit.cyl(r * 0.95, r * 0.95, 0.025, wood, { y: h - seatH - 0.02 }, 24))
  g.add(kit.cyl(0.025, 0.025, h - 0.2, metal, { y: 0.14 }, 10))
  g.add(kit.cyl(0.04, 0.04, 0.03, metal, { y: h - 0.2 }, 10))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6
    const t = (k) => [Math.cos(a) * r * 0.85 * k, 0.012 + (1 - k) * 0.2 + (k > 0.98 ? 0 : 0), Math.sin(a) * r * 0.85 * k]
    g.add(kit.tube([[0, 0.34, 0], [t(0.35)[0], 0.2, t(0.35)[2]], [t(0.8)[0], 0.07, t(0.8)[2]], [t(1)[0], 0.012, t(1)[2]]], 0.014, wood, { segments: 10, radial: 5 }))
  }
  return kit.finalize(g, item)
}

/** @param {object} furn registro degli arredi (`ctx.furn`) */
export function register(furn) {
  furn.register('sofa', buildSofa)
  furn.register('armchair', buildArmchair)
  furn.register('chair_dining', (item, env) => buildChair(item, env, false))
  furn.register('chair_desk', (item, env) => buildChair(item, env, true))
  furn.register('bench', buildBench)
  furn.register('banquette', buildBench)
  furn.register('pouf', buildPouf)
  furn.register('stool_piano', buildStool)
}
