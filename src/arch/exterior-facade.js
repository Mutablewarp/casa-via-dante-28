/**
 * Il nostro edificio visto da fuori: sotto la terrazza sei piani di logge (soletta, pilastri bianchi, ringhiera,
 * parete in klinker con finestre incassate e avvolgibili), piano terra con vetrine e fascia rossa senza scritte,
 * fianchi e retro a texture; sopra, il piano arretrato.
 */
import { Batch, Frame, rng, rgb, shade } from './exterior-util.js'
import { CITY_BAY, PAL, UV, getMats } from './exterior-mats.js'
import { cell } from './city-tex-atlas.js'

const TOP_FP = -0.02 // sommità del volume sotto le stanze (2 cm sotto il pavimento di B)
const TOP_OUT = -0.25 // sotto gli spazi esterni c'è la soletta
const TOP_PIT = -3.32 // sul vano scala il volume si ferma sotto il fondo del pozzo di B (-3,3)
const SLAB_TOP = -0.02
const SLAB = 0.25
const RAIL_H = 1.0
const RAIL_V = [0.508, 0.992] // metà "ferro" della texture delle ringhiere
const OPEN = { head: 2.35, sill: 0.95, recess: 0.2, frame: 0.1 }
const SHOP = { bay: 3.6, pier: 0.4, top: 2.55, fasciaH: 0.6 }
const UPPER_SETBACK = 1
const WHITE = [1, 1, 1]

const inRects = (rs, x, z) => rs.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3])

/** Quota della sommità della colonna di edificio in una cella, o null se non c'è volume pieno (logge comprese). */
function topAt(plan, x, z) {
  if (inRects([plan.stairs.rect], x, z)) return TOP_PIT
  if (inRects(plan.footprint, x, z)) return TOP_FP
  if (inRects(plan.outdoor.filter((o) => o.id !== 'terrazza').flatMap((o) => o.rects), x, z)) return TOP_OUT
  return null
}

/** Volumi sotto la casa, per colonne sulle celle della griglia; il fronte sulle logge resta aperto (lo disegna `loggias`). */
function columns(ctx, B, M, fixed, level, frontZ, far) {
  const { plan, grid } = ctx
  const { xs, zs } = grid
  const nx = xs.length - 1
  const nz = zs.length - 1
  const tops = new Array(nx * nz)
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) tops[j * nx + i] = topAt(plan, (xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)
  }
  const get = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? null : tops[j * nx + i])
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const t = tops[j * nx + i]
      if (t == null) continue
      const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]]
      if (t !== TOP_OUT) B.horiz(fixed, x0, z0, x1, z1, t, true)
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nb = get(i + di, j + dj)
        if (t === TOP_PIT || nb === TOP_PIT) continue // il pozzo lo chiude B
        if (dj > 0 && nb == null && Math.abs(z1 - frontZ) < 0.01) continue // parete delle logge
        const y0 = nb == null ? -level : nb
        if (t <= y0) continue
        if (di !== 0) B.wall(M.far, di, 0, di > 0 ? x1 : x0, z0, di > 0 ? x1 : x0, z1, y0, t, far)
        else B.wall(M.far, 0, dj, x0, dj > 0 ? z1 : z0, x1, dj > 0 ? z1 : z0, y0, t, far)
      }
    }
  }
}

/** Ringhiera a bacchette (texture con trasparenza) lungo un segmento allineato agli assi, più il corrimano. */
function rail(S, s, y, tint) {
  const [x0, z0, x1, z1] = s
  const along = x0 !== x1
  const [v0, v1] = RAIL_V
  S.F.wall(S.M.rail, along ? 0 : 1, along ? 1 : 0, x0, z0, x1, z1, y, y + RAIL_H, { su: UV.rail, sv: (v1 - v0) / RAIL_H, oy: y, dv: v0, vcol: tint })
  const t = 0.03
  S.F.box(S.hand, Math.min(x0, x1) - t, y + RAIL_H - 0.03, Math.min(z0, z1) - t, Math.max(x0, x1) + t, y + RAIL_H, Math.max(z0, z1) + t)
}

/** Parete di una loggia: klinker, aperture come al nostro piano, serramenti in legno con avvolgibile. */
function loggiaWall(S, F, opens, len, yf, top, rand) {
  const { M } = S
  const yh = yf + OPEN.head
  const stone = rgb('#b9ad9a')
  let prev = 0
  for (const o of opens) {
    const ys = yf + (o.door ? 0 : OPEN.sill)
    F.face(S.klinker, prev, yf, o.u0, top, 0, WHITE)
    if (!o.door) F.face(S.klinker, o.u0, yf, o.u1, ys, 0, WHITE)
    F.face(S.klinker, o.u0, yh, o.u1, top, 0, WHITE)
    prev = o.u1
    F.reveal(M.plain, o.u0, ys, o.u1, yh, OPEN.recess, stone)
    F.face(rand() < 0.4 ? M.win : M.winOff, o.u0, ys, o.u1, yh, -OPEN.recess, WHITE, cell('win2'))
    const f = rand() < 0.3 ? 1 : 0.12 + rand() * 0.5 // avvolgibile più o meno abbassato
    const c = cell('roller')
    F.face(M.winOff, o.u0, yh - (yh - ys) * f, o.u1, yh, -0.09, rgb('#9a6a42'), [c[0], c[3] - (c[3] - c[1]) * f, c[2], c[3]])
    for (const [a, b, ya, yb] of [[o.u0 - OPEN.frame, o.u0, ys, yh + OPEN.frame], [o.u1, o.u1 + OPEN.frame, ys, yh + OPEN.frame], [o.u0, o.u1, yh, yh + OPEN.frame]]) F.face(M.plain, a, ya, b, yb, 0.03, stone)
  }
  F.face(S.klinker, prev, yf, len, top, 0, WHITE)
}

/** Logge sotto la terrazza, piano terra con vetrine e fascia rossa. */
function loggias(ctx, S, level, floorH, frontZ) {
  const { plan } = ctx
  const { M, B } = S
  const terr = plan.outdoor.find((o) => o.id === 'terrazza')
  const floors = plan.context.building.floorsBelow
  const x0 = Math.min(...plan.footprint.filter((r) => Math.abs(r[3] - frontZ) < 0.01).map((r) => r[0]))
  const x1 = Math.max(...terr.rects.map((r) => r[2]))
  const xl = Math.min(...terr.rects.map((r) => r[0]))
  const zs = Math.min(...terr.rects.map((r) => r[3])) // filo delle logge strette: lì sta il fronte del piano terra
  const opens = plan.openings.filter((o) => o.to === 'terrazza' || o.from === 'terrazza')
    .map((o) => ({ u0: o.rect[0] - x0, u1: o.rect[2] - x0, door: o.type !== 'window' })).sort((a, b) => a.u0 - b.u0)
  const rand = S.rand
  const F = new Frame(B, x0, frontZ, 0, 1, 1, x0)
  const tint = rgb(ctx.styles.exterior.railing.color)
  const yG = -level + floorH // sommità del piano terra
  F.face(S.fixed, 0, yG, x1 - x0, TOP_OUT, -(OPEN.recess + 0.35), WHITE) // fondo dietro le aperture
  for (let j = 1; j < floors; j++) {
    const yf = -floorH * j
    for (const r of terr.rects) B.box(S.fixed, r[0], yf - SLAB, r[1], r[2], yf, r[3])
    loggiaWall(S, F, opens, x1 - x0, yf, yf + floorH - SLAB, rand)
    for (const s of terr.railings) rail(S, s, yf, tint)
  }
  // pilastri bianchi dal piano terra fino alla soletta della terrazza, e testate cieche ai due capi
  for (const p of plan.solids.filter((s) => s.id.startsWith('pilastro_terrazza'))) B.box(S.pillar, p.rect[0], yG, p.rect[1], p.rect[2], TOP_OUT, p.rect[3], { skip: '+y-y' })
  // piano terra: zoccolo pieno fino al filo delle logge, vetrine incassate, fascia rossa continua senza scritte
  B.box(S.fixed, xl, -level, frontZ, x1, yG, zs, { skip: '-y-z' })
  const G = new Frame(B, xl, zs, 0, 1, UV.stucco, 0)
  const n = Math.max(1, Math.round((x1 - xl) / SHOP.bay))
  const bw = (x1 - xl) / n
  const names = ['shop1', 'shop0', 'sarac', 'shop1', 'shop0', 'shop1', 'sarac', 'shop0']
  for (let k = 0; k < n; k++) {
    const [u0, u1] = [k * bw + SHOP.pier, (k + 1) * bw - SHOP.pier]
    G.face(M.winOff, u0, -level + 0.15, u1, -level + SHOP.top, 0.02, WHITE, cell(names[k % names.length]))
  }
  G.box(M.plain, 0, -level + SHOP.top + 0.05, 0, x1 - xl, -level + SHOP.top + 0.05 + SHOP.fasciaH, 0.14, rgb(PAL.fascia))
}

/**
 * Costruisce l'edificio sotto la casa e il piano superiore.
 * @param {object} ctx contesto condiviso
 */
export function buildBuilding(ctx) {
  const t0 = performance.now()
  const { plan } = ctx
  const M = getMats(ctx)
  const fixed = ctx.mat.fixed('facade')
  const level = plan.context.terraceLevel
  const floorH = (level + TOP_OUT) / plan.context.building.floorsBelow
  const terr = plan.outdoor.find((o) => o.id === 'terrazza')
  const frontZ = Math.min(...terr.rects.map((r) => r[1]))
  const tint = rgb(ctx.styles.exterior.facade)
  // fianchi e retro: la texture di facciata dei palazzi lontani, una campata ogni 3 m e un piano ogni `floorH`
  const far = { su: 1 / CITY_BAY, sv: 1 / floorH, ox: 0, oz: 0, oy: TOP_OUT, color: shade(tint, 1.08) }
  const S = {
    B: new Batch(), F: new Batch(), M, fixed, rand: rng(28),
    klinker: ctx.mat.fixed('klinker'), pillar: ctx.mat.fixed('pillar'), hand: ctx.mat.fixed('handrail'),
  }
  columns(ctx, S.B, M, fixed, level, frontZ, far)
  for (const r of plan.outdoor.flatMap((o) => o.rects)) S.B.box(fixed, r[0], TOP_OUT, r[1], r[2], SLAB_TOP, r[3], { skip: '+y' })
  loggias(ctx, S, level, floorH, frontZ)
  S.B.build(ctx.groups.exterior, { cast: true, name: 'building' })
  S.F.build(ctx.groups.exterior, { cast: false, name: 'building-fine' })

  // piano superiore, arretrato di 1 m rispetto al bordo di terrazza e casa; sparisce con i soffitti
  const all = [...plan.footprint, ...plan.outdoor.flatMap((o) => o.rects)]
  const bx0 = Math.min(...all.map((r) => r[0])) + UPPER_SETBACK
  const bz0 = Math.min(...all.map((r) => r[1])) + UPPER_SETBACK
  const bx1 = Math.max(...all.map((r) => r[2])) - UPPER_SETBACK
  const bz1 = Math.max(...all.map((r) => r[3])) - UPPER_SETBACK
  const yb = plan.meta.ceilingHeight + SLAB
  const U = new Batch()
  U.box(M.far, bx0, yb, bz0, bx1, yb + floorH, bz1, { skip: '+y-y', color: far.color, su: far.su, sv: far.sv, oy: yb })
  U.horiz(ctx.mat.fixed('wallcap'), bx0, bz0, bx1, bz1, yb + floorH, true)
  U.build(ctx.groups.ceilings, { cast: false, name: 'upper-floor' })
  ctx.debug.buildingMs = Math.round(performance.now() - t0)
}
