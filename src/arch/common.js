/** Vano scala condominiale: rampe, ripiani, pozzo sotto quota 0, ringhiera, porta dell'ascensore. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Batch, meshOf } from './shell-geo.js'

const LEVEL = 1.65 // dislivello di ogni rampa (plan.stairs.flights[].direction)
const SLAB = 0.15 // spessore dei ripiani
const PIT = -3.3 // fondo del pozzo
const POST = 0.035 // sezione dei montanti
const RAIL = 0.05 // sezione del corrimano
const POST_H = 0.9 // altezza montanti sopra il gradino
const FRAME = 0.06 // larghezza cornice ascensore
const DOOR_H = 2.1 // altezza porta ascensore

/** Barra orientata tra due punti, con UV standard di BoxGeometry. */
function bar(THREE, a, b, w) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
  const dir = vb.clone().sub(va)
  const g = new THREE.BoxGeometry(w, w, dir.length())
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize())
  g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)))
  return g
}

/** Gradini e ripiani delle due rampe in un accumulatore. */
function buildSteps(plan, b) {
  const { flights, halfLanding, well } = plan.stairs
  const [up, down] = [flights.find((f) => f.id === 'rampa_salita'), flights.find((f) => f.id === 'rampa_discesa')]
  const riser = LEVEL / up.treads
  for (const [fl, sign] of [[up, 1], [down, -1]]) {
    const [x0, z0, x1, z1] = fl.rect
    const run = (z1 - z0) / fl.treads
    for (let k = 1; k <= fl.treads; k++) {
      const zb = z1 - run * k, zt = z1 - run * (k - 1)
      const top = sign * riser * k
      // salita: blocco pieno da 0 al gradino; discesa: lastra sospesa
      b.box(sign > 0 ? [x0, 0, zb, x1, top, zt] : [x0, top - riser, zb, x1, top, zt], sign > 0 ? 'b' : '')
    }
  }
  const [hx0, hz0, hx1, hz1] = halfLanding
  const mid = (well[0] + well[2]) / 2
  b.box([hx0, LEVEL - SLAB, hz0, mid, LEVEL, hz1])
  b.box([mid, -LEVEL - SLAB, hz0, hx1, -LEVEL, hz1])
}

/** Montanti e corrimano lungo il pozzo; restituisce le due geometrie fuse. */
function buildRail(THREE, plan) {
  const { flights, well } = plan.stairs
  const posts = [], rails = []
  const riser = LEVEL / flights[0].treads
  for (const [fl, sign, x] of [[flights[0], 1, well[0] - 0.03], [flights[1], -1, well[2] + 0.03]]) {
    const [, z0, , z1] = fl.rect
    const run = (z1 - z0) / fl.treads
    const pts = []
    for (let k = 1; k <= fl.treads; k += 2) {
      const z = z1 - run * (k - 0.5), y = sign * riser * k
      pts.push([x, y + POST_H, z])
      posts.push(bar(THREE, [x, y, z], [x, y + POST_H, z], POST))
    }
    const last = fl.treads, zl = z1 - run * (last - 0.5)
    if (last % 2 === 0) { pts.push([x, sign * riser * last + POST_H, zl]) }
    for (let i = 1; i < pts.length; i++) rails.push(bar(THREE, pts[i - 1], pts[i], RAIL))
  }
  return [mergeGeometries(posts), mergeGeometries(rails)]
}

/** Pozzo sotto il pavimento: quattro pareti verso l'interno e fondo. */
function buildPit(plan, b) {
  const [x0, z0, x1, z1] = plan.stairs.rect
  b.wall(x0, z0, x0, z1, PIT, 0, 1, 0)
  b.wall(x1, z0, x1, z1, PIT, 0, -1, 0)
  b.wall(x0, z0, x1, z0, PIT, 0, 0, 1)
  b.wall(x0, z1, x1, z1, PIT, 0, 0, -1)
  b.flat([x0, z0, x1, z1], PIT, true)
}

/** Porta dell'ascensore: cornice in ottone e anta piena a filo muro. */
function buildElevator(ctx, arch) {
  const { THREE } = ctx
  const d = ctx.plan.common.elevatorDoor
  const zf = d.z - 0.04
  const frame = new Batch(), leaf = new Batch()
  frame.box([d.x0 - FRAME, 0, zf, d.x0, DOOR_H + FRAME, d.z])
  frame.box([d.x1, 0, zf, d.x1 + FRAME, DOOR_H + FRAME, d.z])
  frame.box([d.x0, DOOR_H, zf, d.x1, DOOR_H + FRAME, d.z])
  leaf.box([d.x0, 0, zf + 0.01, d.x1, DOOR_H, d.z], 'b')
  const f = meshOf(THREE, frame, ctx.mat.get('metal.accent'), { name: 'elevator:frame' })
  const l = meshOf(THREE, leaf, ctx.mat.fixed('door'), { name: 'elevator:door' })
  arch.add(f, l)
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE, plan } = ctx
  const arch = ctx.groups.architecture
  const steps = new Batch(), pit = new Batch()
  buildSteps(plan, steps)
  buildPit(plan, pit)
  arch.add(meshOf(THREE, steps, ctx.mat.fixed('sill'), { cast: true, name: 'stairs:steps' }))
  arch.add(meshOf(THREE, pit, ctx.mat.fixed('common'), { name: 'stairs:pit' }))

  const [posts, rails] = buildRail(THREE, plan)
  for (const [g, mat, name] of [[posts, 'railing', 'stairs:posts'], [rails, 'handrail', 'stairs:handrail']]) {
    const m = new THREE.Mesh(g, ctx.mat.fixed(mat))
    m.name = name; m.castShadow = true; m.receiveShadow = true
    arch.add(m)
  }

  buildElevator(ctx, arch)

  // soffitto del vano scala
  const ceil = new Batch()
  ceil.flat(plan.stairs.rect, plan.meta.ceilingHeight, false)
  ctx.groups.ceilings.add(meshOf(THREE, ceil, ctx.mat.room('pianerottolo').ceiling, { cast: true, name: 'stairs:ceiling' }))
}
