/**
 * Via Dante e le due traverse: terreno, asfalto con rappezzi, marciapiedi rialzati con cordolo e aiuole,
 * mezzeria e strisce consumate; alberi, lampioni e auto istanziati, scooter e cassonetti.
 */
import * as THREE from 'three'
import { instanced, rng, rgb, shade } from './exterior-util.js'
import { PAL, UV } from './exterior-mats.js'
import { CROSS_A, CROSS_B } from './city-blocks.js'
import { treeGeometry, carGeometry, lampGeometry, scooter, dumpster } from './city-props.js'

const STREET_X = [-260, 320] // estensione della via (m)
const NEAR_X = [-85, 115] // tratto con alberi e auto dettagliati
const WALK = 3.6 // marciapiede di via Dante
const SIDE_WALK = 2.6 // marciapiede delle traverse
const CURB_H = 0.15
const CURB_W = 0.3
const PARK_W = 2.1
const TREE_STEP = 9
const LAMP_STEP = 27
const LAMP_H = 7.2
const FAR = 880 // il terreno arriva fin quasi al fondale
const INNER = [-300, -140, 420, 130]
const CROSS_LEN = [-140, 130] // fin dove arrivano le traverse (z)
const CAR_COLORS = ['#e8e6e0', '#c2c6ca', '#2e3036', '#16171a', '#2f4a6b', '#7a2f2b', '#bfa77a', '#6d7378']
const LEAF_TINTS = ['#7fa348', '#8eb152', '#6f9440', '#9aba5e', '#789c4c', '#86a858']
const SCOOTERS = ['#27282b', '#8a2f2a', '#d9d6ce', '#2f4a6b']

/** Pavimentazioni: terreno, carreggiate, marciapiedi con cordolo, segnaletica consumata e rappezzi. */
function paving(ctx, S, G, rand) {
  const { M, G: B } = S // B = accumulo che riceve soltanto le ombre
  const st = ctx.plan.context.street
  const [x0, x1] = STREET_X
  const road0 = st.zNear + WALK
  const road1 = st.zFar - WALK
  const [ix0, iz0, ix1, iz1] = INNER
  const g = PAL.ground
  const h = PAL.haze
  for (const [a, b, c, d, vcol] of [
    [ix0, iz0, ix1, iz1, [g, g, g, g]], [-FAR, -FAR, ix0, FAR, [h, g, g, h]], [ix1, -FAR, FAR, FAR, [g, h, h, g]],
    [ix0, -FAR, ix1, iz0, [g, g, h, h]], [ix0, iz1, ix1, FAR, [h, h, g, g]],
  ]) B.horiz(M.plain, a, b, c, d, G, true, { vcol })

  const as = { color: PAL.asphalt, su: UV.asphalt }
  const [a0, a1] = [CROSS_A[0] + SIDE_WALK, CROSS_A[1] - SIDE_WALK]
  const [b0, b1] = [CROSS_B[0] + SIDE_WALK, CROSS_B[1] - SIDE_WALK]
  B.horiz(M.road, x0, road0, x1, road1, G, true, as)
  B.horiz(M.road, a0, CROSS_LEN[0], a1, road0, G, true, as)
  B.horiz(M.road, b0, road1, b1, CROSS_LEN[1], G, true, as)
  for (let k = 0; k < 46; k++) { // rappezzi: toppe d'asfalto più scure o più chiare, solo dove si vedono da vicino
    const x = NEAR_X[0] + rand() * (NEAR_X[1] - NEAR_X[0])
    const z = road0 + 0.4 + rand() * (road1 - road0 - 3)
    const w = 1.5 + rand() * 6
    B.horiz(M.road, x, z, x + w, z + 0.8 + rand() * 1.8, G + 0.02, true, { color: shade(rgb(PAL.asphalt), rand() < 0.6 ? 0.72 + rand() * 0.14 : 1.12), su: UV.asphalt, ox: rand() * 9 })
  }

  // marciapiedi: lastre, striscia di cordolo più chiara e alzata verso la carreggiata
  const y = G + CURB_H
  const curb = rgb(PAL.curb)
  const walk = (xa, za, xb, zb, edge) => { // edge: lato del cordolo ('+z', '-z', '+x', '-x')
    B.horiz(M.pave, xa, za, xb, zb, y, true, { color: PAL.sidewalk, su: UV.paving })
    const [nx, nz] = edge === '+z' ? [0, 1] : edge === '-z' ? [0, -1] : edge === '+x' ? [1, 0] : [-1, 0]
    const ex = nx > 0 ? xb : xa
    const ez = nz > 0 ? zb : za
    if (nx) {
      B.horiz(M.marks, Math.min(ex, ex - nx * CURB_W), za, Math.max(ex, ex - nx * CURB_W), zb, y, true, { color: curb })
      B.wall(M.plain, nx, 0, ex, za, ex, zb, G, y, { color: shade(curb, 0.8) })
    } else {
      B.horiz(M.marks, xa, Math.min(ez, ez - nz * CURB_W), xb, Math.max(ez, ez - nz * CURB_W), y, true, { color: curb })
      B.wall(M.plain, 0, nz, xa, ez, xb, ez, G, y, { color: shade(curb, 0.8) })
    }
  }
  const zN = st.zNear - 1.4
  walk(x0, zN, CROSS_A[0], road0, '+z')
  walk(CROSS_A[1], zN, x1, road0, '+z')
  walk(x0, road1, CROSS_B[0], st.zFar, '-z')
  walk(CROSS_B[1], road1, x1, st.zFar, '-z')
  walk(CROSS_A[0], CROSS_LEN[0], a0, road0, '+x')
  walk(a1, CROSS_LEN[0], CROSS_A[1], road0, '-x')
  walk(CROSS_B[0], road1, b0, CROSS_LEN[1], '+x')
  walk(b1, road1, CROSS_B[1], CROSS_LEN[1], '-x')

  // segnaletica: mezzeria tratteggiata e strisce pedonali, sbiadite a tratti
  const mid = (road0 + road1) / 2
  const mark = rgb(PAL.mark)
  const worn = () => shade(mark, 0.55 + rand() * 0.45)
  const zebras = [CROSS_A[0] - 3.5, (CROSS_A[1] + CROSS_B[0]) / 2, CROSS_B[1] + 3.5, -130, 62, 150, 230]
  for (const xc of zebras) {
    for (let z = road0 + 0.5; z < road1 - 0.4; z += 1) {
      const cut = xc - 1.6 + rand() * 3.2
      B.horiz(M.marks, xc - 1.6, z, cut - 0.1, z + 0.5, G + 0.03, true, { color: worn() })
      B.horiz(M.marks, cut + 0.1, z, xc + 1.6, z + 0.5, G + 0.03, true, { color: worn() })
    }
  }
  for (let x = x0 + 3; x < x1 - 3; x += 6) {
    if (zebras.some((c) => Math.abs(x + 1.2 - c) < 4.5) || rand() < 0.12) continue
    B.horiz(M.marks, x, mid - 0.07, x + 2.4, mid + 0.07, G + 0.03, true, { color: worn() })
  }
  for (const [xa, xb, z] of [[a0, a1, road0 - 0.6], [b0, b1, road1 + 0.2]]) B.horiz(M.marks, xa + 0.3, z, xb - 0.3, z + 0.4, G + 0.03, true, { color: worn() }) // linee d'arresto
  return { road0, road1, mid, zebras, y }
}

/**
 * Costruisce la via: pavimentazioni negli accumuli, istanze nel gruppo.
 * @param {object} ctx contesto condiviso
 * @param {object} S accumuli (`G` riceve soltanto), materiali
 * @param {THREE.Object3D} group gruppo della città
 * @param {number} G quota della strada (y)
 * @returns {{ treeCount: number, carCount: number, lampCount: number }}
 */
export function buildStreet(ctx, S, group, G) {
  const rand = rng(28)
  const st = ctx.plan.context.street
  const { M } = S
  const [x0, x1] = STREET_X
  const { road0, road1, mid, zebras, y } = paving(ctx, S, G, rand)
  const inA = (x, m = 0) => x > CROSS_A[0] - m && x < CROSS_A[1] + m
  const inB = (x, m = 0) => x > CROSS_B[0] - m && x < CROSS_B[1] + m
  const isNear = (x) => x > NEAR_X[0] && x < NEAR_X[1]

  // alberi: lungo via Dante sui due lati e lungo le traverse; aiuola quadrata al piede
  const trees = []
  const tree = (x, z) => {
    if (rand() < 0.1) return
    const s = 0.7 + rand() * 0.6
    trees.push({ p: [x, y, z], s: [s * (0.9 + rand() * 0.25), s * (0.9 + rand() * 0.2), s * (0.9 + rand() * 0.25)], ry: rand() * 6.28, color: LEAF_TINTS[Math.floor(rand() * LEAF_TINTS.length)], v: Math.floor(rand() * 2), near: isNear(x) })
    S.G.horiz(M.marks, x - 0.7, z - 0.7, x + 0.7, z + 0.7, y + 0.005, true, { color: PAL.soil })
  }
  for (let x = x0 + 5; x < x1 - 5; x += TREE_STEP) {
    const xn = x + (rand() - 0.5) * 2.4
    const xf = x + 4 + (rand() - 0.5) * 2.4
    if (!inA(xn, 2.5)) tree(xn, road0 - 0.95)
    if (!inB(xf, 2.5)) tree(xf, road1 + 0.95)
  }
  for (let z = st.zFar + 4; z < 100; z += TREE_STEP) for (const x of [CROSS_B[0] + SIDE_WALK - 0.9, CROSS_B[1] - SIDE_WALK + 0.9]) tree(x, z + rand() * 3)
  for (let z = st.zNear - 8; z > -100; z -= TREE_STEP) for (const x of [CROSS_A[0] + SIDE_WALK - 0.9, CROSS_A[1] - SIDE_WALK + 0.9]) tree(x, z - rand() * 3)
  for (const v of [0, 1]) group.add(instanced(treeGeometry(11 + v * 7, false), M.leaf, trees.filter((t) => t.near && t.v === v), { cast: true, name: 'trees' }))
  group.add(instanced(treeGeometry(5, true), M.leaf, trees.filter((t) => !t.near), { cast: true, name: 'trees-far' }))

  // lampioni alternati sui due lati, con il braccio verso la carreggiata
  const poles = []
  for (let x = x0 + 12, k = 0; x < x1 - 5; x += LAMP_STEP / 2, k++) {
    if (k % 2 ? inB(x, 2) : inA(x, 2)) continue
    poles.push(k % 2 ? { p: [x, y, road1 + 0.5], ry: Math.PI } : { p: [x, y, road0 - 0.5] })
  }
  const lamp = lampGeometry(LAMP_H)
  group.add(instanced(lamp.pole, M.lampPole, poles, { cast: true, name: 'lamp-poles' }))
  group.add(instanced(lamp.head, M.lampHead, poles, { name: 'lamp-heads' }))

  // auto in sosta sui due lati e lungo le traverse, qualcuna in marcia; dove manca un'auto, scooter o cassonetti
  const cars = []
  const car = (x, z, ry) => cars.push({ p: [x, G, z], ry, s: [0.86 + rand() * 0.24, 0.92 + rand() * 0.3, 0.96 + rand() * 0.1], color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], near: isNear(x) })
  const lane = (road1 - road0 - 2 * PARK_W) / 2
  for (const [z, cross, flip] of [[road0 + PARK_W / 2, inA, 0], [road1 - PARK_W / 2, inB, Math.PI]]) {
    for (let x = x0 + 4; x < x1 - 4; x += 5.3) {
      if (cross(x, 3) || zebras.some((c) => Math.abs(x - c) < 4)) continue
      const q = rand()
      if (q < 0.7) car(x + (rand() - 0.5) * 0.5, z + (rand() - 0.5) * 0.2, flip + (rand() - 0.5) * 0.04)
      else if (q < 0.8 && isNear(x)) for (let k = 0; k < 3; k++) scooter(S, x - 1.4 + k * 1.1, G, z, Math.PI / 2 + flip + (rand() - 0.5) * 0.3, SCOOTERS[Math.floor(rand() * SCOOTERS.length)])
      else if (q < 0.86 && isNear(x)) for (const dx of [-0.9, 0.9]) dumpster(S, x + dx, G, z, rand() < 0.5 ? '#4b5a4f' : '#5c6064')
    }
  }
  for (const z of [road0 + PARK_W + lane / 2, road0 + PARK_W + lane * 1.5]) {
    for (let x = x0 + 30 + rand() * 30; x < x1 - 20; x += 35 + rand() * 60) car(x, z, z < mid ? 0 : Math.PI)
  }
  for (const [xs, z0, dir] of [[[CROSS_B[0] + SIDE_WALK + 1.05, CROSS_B[1] - SIDE_WALK - 1.05], st.zFar + 5, 1], [[CROSS_A[0] + SIDE_WALK + 1.05, CROSS_A[1] - SIDE_WALK - 1.05], st.zNear - 9, -1]]) {
    for (const x of xs) for (let k = 0; k < 11; k++) if (rand() < 0.72) cars.push({ p: [x, G, z0 + dir * k * 5.3], ry: Math.PI / 2, s: [0.9 + rand() * 0.2, 0.95 + rand() * 0.25, 1], color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], near: true })
  }
  const cg = carGeometry()
  const nearCars = cars.filter((c) => c.near)
  group.add(instanced(cg.body, M.carBody, nearCars, { cast: true, name: 'cars' }))
  group.add(instanced(cg.dark, M.carDark, nearCars.map((c) => ({ ...c, color: null })), { cast: true, name: 'car-parts' }))
  for (const c of cars) { // lontane: due scatole fuse, senza ruote
    if (c.near) continue
    const [cx, , cz] = c.p
    S.B.box(M.plain, cx - 2.05, G + 0.3, cz - 0.84, cx + 2.05, G + 0.92, cz + 0.84, { color: c.color })
    S.B.box(M.plain, cx - 1.3, G + 0.92, cz - 0.74, cx + 0.8, G + 1.4, cz + 0.74, { color: '#20262c' })
  }
  return { treeCount: trees.length, carCount: cars.length, lampCount: poles.length }
}
