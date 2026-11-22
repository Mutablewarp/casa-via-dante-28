/** Via Dante: terreno, carreggiata, marciapiedi, strisce, alberi, lampioni e auto (tutto istanziato o fuso). */
import * as THREE from 'three'
import { instanced, rng } from './exterior-util.js'
import { PAL } from './exterior-mats.js'

const STREET_X = [-260, 320] // estensione della via (m)
const CROSS = { x0: 29, x1: 45, zNear: -100, zFar: 100 } // via Principe di Villafranca, all'angolo
const WALK_W = 3.6
const PARK_W = 2.3
const TREE_STEP = 9
const LAMP_STEP = 27
const FAR = 880 // il terreno arriva fin quasi al fondale
const INNER = [-300, -140, 420, 130]
const ZEBRA_X = [-130, -50, 10, 62, 150, 230]
const CAR_COLORS = ['#e8e6e0', '#c8ccd0', '#2e3036', '#8b3a35', '#2f4a6b', '#bfa77a', '#e0dcd2', '#6d7378']
const CROWN_COLORS = ['#8fb55a', '#9bc063', '#7fa84f', '#a6c872', '#86ad58']

/**
 * Costruisce la via: pavimentazioni nei batch, istanze nel gruppo.
 * @param {object} ctx contesto condiviso
 * @param {object} M materiali
 * @param {import('./exterior-util.js').Batch} B batch unico della città (una mesh per materiale)
 * @param {THREE.Object3D} group gruppo della città
 * @param {number} G quota della strada (y)
 * @returns {{ treeCount: number, carCount: number, lampCount: number }}
 */
export function buildStreet(ctx, M, B, group, G) {
  const st = ctx.plan.context.street
  const [x0, x1] = STREET_X
  const road0 = st.zNear + WALK_W
  const road1 = st.zFar - WALK_W
  const mid = (road0 + road1) / 2
  const lane = (road1 - road0 - 2 * PARK_W) / 2
  const rand = rng(28)

  // terreno
  const [ix0, iz0, ix1, iz1] = INNER
  const g = PAL.ground
  const h = PAL.haze
  const ring = [
    [ix0, iz0, ix1, iz1, [g, g, g, g]],
    [-FAR, -FAR, ix0, FAR, [h, g, g, h]],
    [ix1, -FAR, FAR, FAR, [g, h, h, g]],
    [ix0, -FAR, ix1, iz0, [g, g, h, h]],
    [ix0, iz1, ix1, FAR, [h, h, g, g]],
  ]
  for (const [a, b, c, d, vcol] of ring) B.horiz(M.plain, a, b, c, d, G, true, { vcol })

  // marciapiedi e carreggiata (con polygonOffset, sopra il terreno senza sfarfallio)
  const sw = { color: PAL.sidewalk }
  const as = { color: PAL.asphalt }
  for (const [a, b] of [[x0, CROSS.x0], [CROSS.x1, x1]]) {
    B.horiz(M.road, a, 8, b, road0, G, true, sw)
    B.horiz(M.road, a, road1, b, st.zFar, G, true, sw)
  }
  B.horiz(M.road, x0, road0, x1, road1, G, true, as)
  B.horiz(M.road, CROSS.x0, CROSS.zNear, CROSS.x1, road0, G, true, as)
  B.horiz(M.road, CROSS.x0, road1, CROSS.x1, CROSS.zFar, G, true, as)

  // strisce pedonali e mezzeria tratteggiata
  const mk = { color: PAL.mark }
  for (const xc of ZEBRA_X) {
    for (let z = road0 + 0.6; z < road1 - 0.3; z += 1) B.horiz(M.marks, xc - 1.5, z, xc + 1.5, z + 0.5, G + 0.01, true, mk)
  }
  for (let x = x0 + 3; x < x1 - 3; x += 6) {
    if (ZEBRA_X.some((c) => Math.abs(x - c) < 5) || (x > CROSS.x0 - 2 && x < CROSS.x1)) continue
    B.horiz(M.marks, x, mid - 0.08, x + 2.4, mid + 0.08, G + 0.01, true, mk)
  }

  // alberi e lampioni, a passo regolare e fuori dall'incrocio
  const free = (x) => x < CROSS.x0 - 3 || x > CROSS.x1 + 3
  const trees = []
  for (const z of [st.zNear + 2.0, st.zFar - 2.0]) {
    for (let x = x0 + 5; x < x1 - 5; x += TREE_STEP) {
      const xx = x + (rand() - 0.5) * 2.2
      if (free(xx)) trees.push({ x: xx, z: z + (rand() - 0.5) * 0.4, s: 0.85 + rand() * 0.35, c: CROWN_COLORS[Math.floor(rand() * CROWN_COLORS.length)] })
    }
  }
  const crowns = trees.map((t) => ({ p: [t.x, G + 5.4 * t.s, t.z], s: [2.6 * t.s, 2.3 * t.s, 2.6 * t.s], color: t.c }))
  const trunks = trees.map((t) => ({ p: [t.x, G + 2.2 * t.s, t.z], s: [t.s, 4.4 * t.s, t.s] }))
  group.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.crown, crowns, { name: 'tree-crowns' }))
  group.add(instanced(new THREE.CylinderGeometry(0.14, 0.2, 1, 6), M.trunk, trunks, { name: 'tree-trunks' }))

  const poles = []
  for (const z of [road0 - 0.3, road1 + 0.3]) {
    for (let x = x0 + 12; x < x1 - 5; x += LAMP_STEP) if (free(x)) poles.push({ p: [x, G + 3.3, z] })
  }
  group.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, 6.6, 6), M.lampPole, poles, { name: 'lamp-poles' }))
  const heads = poles.map((q) => ({ p: [q.p[0], G + 6.7, q.p[2]], s: [1, 0.7, 1] }))
  group.add(instanced(new THREE.SphereGeometry(0.3, 8, 6), M.lampHead, heads, { name: 'lamp-heads' }))

  // auto in sosta sui due lati e qualcuna in marcia
  const cars = []
  const park = [road0 + PARK_W / 2, road1 - PARK_W / 2]
  for (const z of park) {
    for (let x = x0 + 4; x < x1 - 4; x += 5.7) {
      if (rand() < 0.38 || ZEBRA_X.some((c) => Math.abs(x - c) < 3.6)) continue
      cars.push({ x: x + (rand() - 0.5) * 0.6, z: z + (rand() - 0.5) * 0.2, c: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)] })
    }
  }
  for (const z of [road0 + PARK_W + lane / 2, road0 + PARK_W + lane * 1.5]) {
    for (let x = x0 + 30; x < x1 - 20; x += 40 + rand() * 60) cars.push({ x, z, c: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)] })
  }
  const body = cars.map((c) => ({ p: [c.x, G + 0.66, c.z], s: [4.2, 0.72, 1.75], color: c.c }))
  const cabin = cars.map((c) => ({ p: [c.x - 0.2, G + 1.3, c.z], s: [2.3, 0.58, 1.55] }))
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), M.carBody, body, { name: 'cars' }))
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), M.carGlass, cabin, { name: 'car-cabins' }))
  return { treeCount: trees.length, carCount: cars.length, lampCount: poles.length }
}
