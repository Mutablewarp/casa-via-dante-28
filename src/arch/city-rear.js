/** Retro (tetti a falde in coppi), condominio grigio e Palazzo Ziino. */
import * as THREE from 'three'
import { rng } from './exterior-util.js'
import { PAL } from './exterior-mats.js'
import { walls, hipRoof, flatRoof } from './city-blocks.js'

const WALLS = ['#d8c3a0', '#e0cfb0', '#c9b79a', '#e6d9c0', '#d6bfa2']
const ROOFS = ['#c65f3e', '#bc5435', '#cc6b47', '#c4623f', '#b85a3b']
const ROWS = [[-6, -24], [-29, -48], [-52, -71], [-76, -90]] // fasce z dei file di edifici bassi
const CROSS_X0 = 27 // il retro lascia libera la via Principe di Villafranca
const CROSS_X1 = 47
const RISE = [1.8, 2.6]
const ZIINO = { floors: 4, plinth: 3.4, eave: 0.55, window: 3.0 }

/**
 * Edifici bassi dietro la casa: tetti a falde in coppi rossi, colmi tra y = -14 e y = -8.
 * @param {object} B batch della città
 * @param {object} M materiali
 * @param {number} G quota della strada (y)
 */
export function buildRear(B, M, G) {
  const rand = rng(41)
  const lerp = (a, b) => a + rand() * (b - a)
  ROWS.forEach(([z0, z1], r) => {
    const segs = []
    let x = -72 + r * 3 + rand() * 6
    for (let k = 0; k < 2; k++) {
      const w = lerp(34, 46)
      segs.push([x, Math.min(x + w, CROSS_X0)])
      x += w + lerp(4, 7)
    }
    const xr = CROSS_X1 + 1 + rand() * 6
    segs.push([xr, xr + lerp(40, 52)])
    segs.forEach(([x0, x1], k) => {
      const floors = rand() < 0.5 ? 3 : 4
      const eave = G + floors * 3.3
      const o = { x0, x1, z0: z1, z1: z0, y0: G, top: eave, color: WALLS[Math.floor(rand() * WALLS.length)] }
      walls(B, M, o)
      if (r === 1 && k === 1) flatRoof(B, M, o, rand) // qualche terrazzo tra i tetti
      else hipRoof(B, M, [x0, z1, x1, z0], eave, Math.min(eave + lerp(...RISE), -8), ROOFS[Math.floor(rand() * ROOFS.length)])
    })
  })
  // condominio grigio di sette piani, verso -x
  const o = { x0: -114, x1: -76, z0: -56, z1: -34, y0: G, top: G + 7 * 3.1, color: '#a7a9aa', floors: 7 }
  walls(B, M, o)
  flatRoof(B, M, o, rand)
}

/**
 * Palazzo Ziino: intonaco rosa, quattro piani su zoccolo scuro, finestre con cornici chiare,
 * balconi bianchi, cornicione e tetto a padiglione in coppi (visto dall'alto dalla terrazza).
 * @param {object} ctx contesto condiviso
 * @param {object} M materiali
 * @param {object} B batch della città
 * @param {number} G quota della strada (y)
 */
export function buildZiino(ctx, M, B, G) {
  const lm = ctx.plan.context.landmarks.find((l) => l.id === 'palazzo_ziino')
  const [x0, z0, x1, z1] = lm.rect
  const yBase = G + ZIINO.plinth
  walls(B, M, { x0, z0, x1, z1, y0: yBase, top: lm.eavesY - ZIINO.eave, color: '#e2b9a0', bay: ZIINO.window, floors: ZIINO.floors })
  B.box(M.plain, x0 - 0.15, G, z0 - 0.15, x1 + 0.15, yBase, z1 + 0.15, { skip: '+y-y', color: '#b58f7a' }) // zoccolo
  B.box(M.plain, x0 - 0.15, yBase - 0.2, z0 - 0.15, x1 + 0.15, yBase, z1 + 0.15, { skip: '-y', color: '#f0e6d8' })
  const top = lm.eavesY - ZIINO.eave
  B.box(M.plain, x0 - 0.55, top, z0 - 0.55, x1 + 0.55, lm.eavesY, z1 + 0.55, { skip: '-y', color: '#f2ebe0' }) // cornicione
  const fh = (top - yBase) / ZIINO.floors
  const nbx = Math.max(1, Math.round((x1 - x0) / ZIINO.window))
  const bw = (x1 - x0) / nbx
  for (let k = 0; k < nbx; k++) {
    const cx = x0 + bw * (k + 0.5)
    for (let f = 0; f < ZIINO.floors; f++) {
      const y = yBase + fh * f
      const lint = k % 2 ? 0.28 : 0.5 // timpani alternati: architrave piano o più alto
      B.box(M.plain, cx - 0.85, y + fh * 0.82, z0 - 0.12, cx + 0.85, y + fh * 0.82 + lint, z0, { color: '#f4f0e8' })
      if ((f === 1 || f === 2) && k % 3 === 1) {
        B.box(M.plain, cx - 1.1, y + 0.02, z0 - 1.0, cx + 1.1, y + 0.2, z0, { color: '#f6f2ea' })
        B.box(M.plain, cx - 1.1, y + 0.2, z0 - 1.0, cx + 1.1, y + 1.0, z0 - 0.94, { skip: '+y-y', color: '#f6f2ea' })
      }
    }
  }
  hipRoof(B, M, [x0, z0, x1, z1], lm.eavesY, lm.ridgeY, '#c9694a', 0.55)
  B.box(M.plain, (x0 + x1) / 2 - 3, lm.ridgeY, (z0 + z1) / 2 - 0.25, (x0 + x1) / 2 + 3, lm.ridgeY + 0.2, (z0 + z1) / 2 + 0.25, { color: '#9a5038' })
  for (const f of [0.3, 0.7]) {
    const cx = x0 + (x1 - x0) * f
    B.box(M.plain, cx - 0.4, lm.eavesY, (z0 + z1) / 2 + 2, cx + 0.4, lm.ridgeY + 1.6, (z0 + z1) / 2 + 2.8, { color: '#c8a58f' })
  }
}

const FAR_MIX = 450 // distanza (m) alla quale i colori si fondono con la foschia
const _a = new THREE.Color()
const _b = new THREE.Color()

/** Colore sfumato verso la foschia in funzione della distanza dall'attico (prospettiva aerea). */
function hazed(hex, dist) {
  const t = Math.min(1, dist / FAR_MIX) ** 1.2 * 0.85
  return '#' + _a.set(hex).lerp(_b.set(PAL.haze), t).getHexString()
}

/**
 * Distesa di edifici lontani (retro e dietro i condomini): file a passo irregolare fino al fondale.
 * Colori sfumati verso la foschia; a -z tetti a falde, a +z blocchi con tetto piano.
 * @param {object} B batch della città
 * @param {object} M materiali
 * @param {number} G quota della strada (y)
 */
export function buildCarpet(B, M, G) {
  const rand = rng(77)
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
        const wallHex = hazed(WALLS[Math.floor(rand() * WALLS.length)], dist)
        const floors = low ? (rand() < 0.5 ? 3 : 4) : 5 + Math.floor(rand() * 5)
        const top = G + floors * 3.3
        const o = { x0: x, x1: x + w, z0: za, z1: zb, y0: G, top, color: wallHex }
        walls(B, M, o)
        if (low) hipRoof(B, M, [x, za, x + w, zb], top, Math.min(top + lerp(...RISE), -8), hazed(ROOFS[Math.floor(rand() * ROOFS.length)], dist))
        else flatRoof(B, M, o, rand)
        x += w + lerp(4, 9)
      }
      z += dir * (d + lerp(5, 9))
    }
  }
  fill(-96, -1, -440, true)
  fill(112, 1, 440, false)
}
