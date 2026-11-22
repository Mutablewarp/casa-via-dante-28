/** Edificio sotto la terrazza (sette piani fino alla strada) e piano superiore arretrato. */
import { Batch } from './exterior-util.js'
import { OURS_BAY, getMats } from './exterior-mats.js'

const TOP_FP = -0.02 // sommità del volume sotto le stanze (2 cm sotto il pavimento di B)
const TOP_OUT = -0.25 // sotto gli spazi esterni c'è la soletta
const TOP_PIT = -3.32 // sul vano scala il volume si ferma sotto il fondo del pozzo di B (-3,3)
const SLAB_TOP = -0.02
const BALCONY_DEPTH_MAX_GAP = 0.05 // i balconi si fermano 5 cm prima del filo della strada
const BALCONY_RAIL_H = 1.0
const BALCONY_RAIL_T = 0.06
const SHOP = { glassBottom: 0.35, glassTop: 2.5, fasciaH: 0.55, fasciaDrop: 0.2, pier: 0.7, glassW: 3.2, relief: 0.06 }
const UPPER_SETBACK = 1

const inRects = (rs, x, z) => rs.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3])

/** Quota della sommità della colonna di edificio in una cella, o null se non c'è edificio. */
function topAt(plan, x, z) {
  if (inRects([plan.stairs.rect], x, z)) return TOP_PIT
  if (inRects(plan.footprint, x, z)) return TOP_FP
  if (inRects(plan.outdoor.flatMap((o) => o.rects), x, z)) return TOP_OUT
  return null
}

/** Pareti ±z: fascia del piano terra liscia, sopra la facciata con le finestre. */
function wallZ(B, M, fixed, nz, x0, x1, z, y0, y1, yGround, uv) {
  const lo = Math.min(y1, yGround)
  if (lo > y0) B.solid.wall(fixed, 0, nz, x0, z, x1, z, y0, lo)
  const hi = Math.max(y0, yGround)
  if (y1 > hi) B.solid.wall(M.ours, 0, nz, x0, z, x1, z, hi, y1, uv)
}

/** Volumi sotto la casa, costruiti per colonne sulle celle della griglia (nessuna faccia interna). */
function columns(ctx, B, M, fixed, level, yGround, uv) {
  const { plan, grid } = ctx
  const { xs, zs } = grid
  const nx = xs.length - 1
  const nz = zs.length - 1
  const tops = new Array(nx * nz)
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) tops[j * nx + i] = topAt(plan, (xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)
  }
  const get = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? null : tops[j * nx + i])
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const t = tops[j * nx + i]
      if (t == null) continue
      const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]]
      if (t !== TOP_OUT) B.solid.horiz(fixed, x0, z0, x1, z1, t, true)
      for (const [di, dj] of dirs) {
        const nb = get(i + di, j + dj)
        if (t === TOP_PIT || nb === TOP_PIT) continue // il pozzo lo chiude B
        const y0 = nb == null ? -level : nb
        if (t <= y0) continue
        if (di !== 0) B.solid.wall(fixed, di, 0, di > 0 ? x1 : x0, z0, di > 0 ? x1 : x0, z1, y0, t)
        else wallZ(B, M, fixed, dj, x0, x1, dj > 0 ? z1 : z0, y0, t, yGround, uv)
      }
    }
  }
}

/** Fronte su via Dante: segmenti (x0, x1, z) dove il volume sotto la terrazza arriva al filo esterno. */
function frontSegments(plan) {
  const rects = plan.outdoor.find((o) => o.id === 'terrazza').rects
  const xs = [...new Set(rects.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b)
  const out = []
  for (let k = 0; k < xs.length - 1; k++) {
    const mid = (xs[k] + xs[k + 1]) / 2
    const z = Math.max(...rects.filter((r) => mid > r[0] && mid < r[2]).map((r) => r[3]))
    out.push([xs[k], xs[k + 1], z])
  }
  return out
}

/** Balconi continui (sei file), ringhiera a pannello e piano terra con vetrine e fascia rossa. */
function frontDetails(ctx, B, M, level, floorH, front) {
  const railing = ctx.mat.fixed('railing')
  const fixed = ctx.mat.fixed('facade')
  const zEdge = ctx.plan.context.street.zNear - BALCONY_DEPTH_MAX_GAP
  const floors = ctx.plan.context.building.floorsBelow
  const x0 = front[0][0]
  const x1 = front[front.length - 1][1]
  for (let j = 1; j < floors; j++) {
    const yBot = -0.25 - floorH * j
    for (const [a, b, z] of front) {
      B.solid.box(fixed, a, yBot, z, b, yBot + 0.25, zEdge)
      B.solid.box(railing, a, yBot + 0.25, zEdge - BALCONY_RAIL_T, b, yBot + 0.25 + BALCONY_RAIL_H, zEdge, { skip: '+y-y' })
    }
    const zMin = Math.min(...front.map((f) => f[2]))
    for (const x of [x0, x1 - BALCONY_RAIL_T]) {
      B.solid.box(railing, x, yBot + 0.25, zMin, x + BALCONY_RAIL_T, yBot + 0.25 + BALCONY_RAIL_H, zEdge, { skip: '+y-y' })
    }
  }
  // piano terra: vetrine scure e fascia rossa continua, senza scritte
  const yG = -level
  for (const [a, b, z] of front) {
    const n = Math.max(1, Math.floor((b - a) / (SHOP.glassW + SHOP.pier)))
    const pitch = (b - a) / n
    for (let k = 0; k < n; k++) {
      const gx0 = a + pitch * k + SHOP.pier / 2
      B.shop.box(M.shopGlass, gx0, yG + SHOP.glassBottom, z, gx0 + pitch - SHOP.pier, yG + SHOP.glassTop, z + SHOP.relief, { skip: '-z-y+y' })
    }
    const yTop = yG + floorH - SHOP.fasciaDrop
    B.shop.box(M.fascia, a, yTop - SHOP.fasciaH, z, b, yTop, z + SHOP.relief * 2, { skip: '-y' })
  }
}

/**
 * Costruisce l'edificio sotto la casa e il piano superiore.
 * @param {object} ctx contesto condiviso
 */
export function buildBuilding(ctx) {
  const { plan } = ctx
  const M = getMats(ctx)
  const fixed = ctx.mat.fixed('facade')
  const level = plan.context.terraceLevel
  const floorH = (level + TOP_OUT) / plan.context.building.floorsBelow
  const yGround = -level + floorH
  // la campata si ripete ogni piano a partire dal filo inferiore del solaio (y = -0,25 - n × piano)
  const uv = { su: 1 / OURS_BAY, sv: 1 / floorH, ox: 0, oz: 0, oy: TOP_OUT }
  const B = { solid: new Batch(), shop: new Batch() }
  columns(ctx, B, M, fixed, level, yGround, uv)
  const slabs = plan.outdoor.flatMap((o) => o.rects)
  for (const r of slabs) B.solid.box(fixed, r[0], TOP_OUT, r[1], r[2], SLAB_TOP, r[3], { skip: '+y-y' })
  frontDetails(ctx, B, M, level, floorH, frontSegments(plan))
  B.solid.build(ctx.groups.exterior, { cast: false, name: 'building' })
  B.shop.build(ctx.groups.exterior, { cast: false, name: 'shopfront' })

  // piano superiore, arretrato di 1 m rispetto al bordo di terrazza e casa; sparisce con i soffitti
  const all = [...plan.footprint, ...slabs]
  const bx0 = Math.min(...all.map((r) => r[0])) + UPPER_SETBACK
  const bz0 = Math.min(...all.map((r) => r[1])) + UPPER_SETBACK
  const bx1 = Math.max(...all.map((r) => r[2])) - UPPER_SETBACK
  const bz1 = Math.max(...all.map((r) => r[3])) - UPPER_SETBACK
  const yb = plan.meta.ceilingHeight + 0.25
  const yt = yb + floorH
  const U = new Batch()
  U.wall(M.ours, 0, 1, bx0, bz1, bx1, bz1, yb, yt, uv)
  U.wall(M.ours, 0, -1, bx0, bz0, bx1, bz0, yb, yt, uv)
  U.wall(fixed, -1, 0, bx0, bz0, bx0, bz1, yb, yt)
  U.wall(fixed, 1, 0, bx1, bz0, bx1, bz1, yb, yt)
  U.horiz(ctx.mat.fixed('wallcap'), bx0, bz0, bx1, bz1, yt, true)
  U.build(ctx.groups.ceilings, { cast: false, name: 'upper-floor' })
}
