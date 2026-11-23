/** Retro: case basse con tetti a falde in coppi e cortili, condominio grigio, e la distesa lontana fino al fondale. */
import { rng, rgb, shade } from './exterior-util.js'
import { style, palazzo, SHUT } from './city-kit.js'
import { hipRoof, flatRoof } from './city-roofs.js'
import { farBlock, hazed, roofTint, CROSS_A } from './city-blocks.js'

const WALLS = ['#d8c3a0', '#e0cfb0', '#c9b79a', '#e6d9c0', '#d6bfa2', '#dcc7ae']
const ROOFS = ['#ffffff', '#f2ddd2', '#e4ccc0', '#f8e8de', '#d6beb2']
const ROWS = [[-24, -6], [-48, -29], [-71, -52], [-90, -76]] // fasce z delle file di case basse
const X_SPAN = [-74, 104]
const NEAR_ROWS = 2 // le prime file hanno facciate e tetti dettagliati
const BASE_H = 3.3
const FLOOR_H = 3.25
const RIDGE_MAX = -8 // plan.context.surroundings.rear: colmi tra y = -14 e y = -8
const RISE = [1.8, 2.6]

const some = (j, k, nb, n, r) => {
  const q = r()
  return q < 0.22 ? 'balcony' : q < 0.48 ? 'petto' : 'window'
}
const REAR = style({
  tint: WALLS[0], trim: '#ece5d6', bay: 3.3, ow: 1.05, head: 2.45, base: { kind: 'plain', h: BASE_H }, surround: false, marca: false, cornice: 0,
  balDepth: 0.8, pClosed: 0.45, pOpen: 0.3, shutPal: [...SHUT.green, ...SHUT.gray], wins: ['win0', 'win1', 'win3'], balcony: some,
})

/** Tratti di una fila lungo x: larghezze irregolari, piccoli vuoti (cortili), niente sulla traversa A. */
function segments(rand, r) {
  const out = []
  let x = X_SPAN[0] + r * 3 + rand() * 6
  while (x < X_SPAN[1] - 8) {
    let w = 13 + rand() * 13
    if (x + w > CROSS_A[0] - 0.5 && x < CROSS_A[1] + 0.5) {
      w = CROSS_A[0] - 0.5 - x
      if (w < 9) { x = CROSS_A[1] + 0.5; continue }
    }
    out.push([x, Math.min(x + w, X_SPAN[1])])
    x += w + (rand() < 0.3 ? 2.5 + rand() * 3 : 0.3)
  }
  return out
}

/**
 * Case basse dietro l'attico: tetti a falde in coppi di altezze diverse, qualche terrazzo, cortili tra le file.
 * @param {object} S0 accumuli e materiali
 * @param {number} G quota della strada (y)
 */
export function buildRear(S0, G) {
  const rand = rng(41)
  const S = { ...S0, rand }
  ROWS.forEach(([z0, z1], r) => {
    for (const [x0, x1] of segments(rand, r)) {
      const floors = rand() < 0.5 ? 2 : 3
      const eave = G + BASE_H + floors * FLOOR_H + 0.15
      const wall = WALLS[Math.floor(rand() * WALLS.length)]
      const terrace = rand() < 0.18
      const dz = rand() < 0.4 ? rand() * 3 : 0 // qualche casa è più corta: resta un cortile
      const rect = [x0, z0 + dz, x1, z1]
      const dist = Math.hypot((x0 + x1) / 2 - 15, (z0 + z1) / 2 - 8)
      if (r >= NEAR_ROWS) {
        farBlock(S, { x0, x1, z0: rect[1], z1, y0: G, top: eave, color: hazed(wall, dist * 0.5), roof: terrace ? 'flat' : 'hip', rise: RISE[0] + rand(), maxRidge: RIDGE_MAX, roofTint: roofTint(dist * 0.5), dist })
        continue
      }
      const tint = rgb(wall)
      const st = { ...REAR, floors, tint, base: { ...REAR.base, tint: shade(tint, 0.93) } }
      const faces = { '+z': 1, '+x': Math.abs(x1 - (CROSS_A[0] - 0.5)) < 0.1 ? 1 : 0, '-x': Math.abs(x0 - (CROSS_A[1] + 0.5)) < 0.1 ? 1 : 0 }
      palazzo(S, { r: rect, y0: G, y1: eave, st, faces })
      if (terrace) flatRoof(S, rect, eave, { wall: shade(tint, 1.02), clutter: 1, parapet: 0.9 })
      else hipRoof(S, rect, eave, Math.min(eave + RISE[0] + rand() * (RISE[1] - RISE[0]), RIDGE_MAX), { tint: ROOFS[Math.floor(rand() * ROOFS.length)], extras: 1, trim: shade(tint, 1.06) })
    }
  })
  // condominio grigio di sette piani, verso -x
  farBlock(S, { x0: -114, x1: -76, z0: -56, z1: -34, y0: G, top: G + 7 * 3.1, color: '#a7a9aa', dist: 120 })
}

/**
 * Distesa di edifici lontani (retro e dietro i condomini): file a passo irregolare fino al fondale.
 * Colori sfumati verso la foschia; a -z tetti a falde, a +z blocchi con tetto piano.
 * @param {object} S0 accumuli e materiali
 * @param {number} G quota della strada (y)
 */
export function buildCarpet(S0, G) {
  const rand = rng(77)
  const S = { ...S0, rand }
  const lerp = (a, b) => a + rand() * (b - a)
  const fill = (zStart, dir, zEnd, low) => {
    let z = zStart
    while (dir * (zEnd - z) > 0) {
      const d = lerp(16, 24)
      const [za, zb] = dir > 0 ? [z, z + d] : [z - d, z]
      let x = -330 + rand() * 20
      while (x < 440) {
        const w = lerp(26, 48)
        const dist = Math.hypot(x + w / 2, (za + zb) / 2)
        const floors = low ? (rand() < 0.5 ? 3 : 4) : 5 + Math.floor(rand() * 5)
        farBlock(S, {
          x0: x, x1: x + w, z0: za, z1: zb, y0: G, top: G + floors * 3.3, color: hazed(WALLS[Math.floor(rand() * WALLS.length)], dist),
          roof: low ? 'hip' : 'flat', rise: lerp(...RISE), maxRidge: RIDGE_MAX, roofTint: roofTint(dist), roofColor: hazed('#a39c8f', dist), dist,
        })
        x += w + lerp(4, 9)
      }
      z += dir * (d + lerp(5, 9))
    }
  }
  fill(-96, -1, -440, true)
  fill(112, 1, 440, false)
}
