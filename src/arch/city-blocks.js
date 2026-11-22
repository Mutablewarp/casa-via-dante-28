/** Edifici della città: attrezzi comuni, palazzi di fronte, condomini, nostro lato della via. */
import { rng } from './exterior-util.js'
import { CITY_BAY, CITY_FLOOR, PAL } from './exterior-mats.js'

const OCRA = ['#d9b77a', '#e3c675', '#e7d4a5', '#d8a98c', '#dcc08a', '#e0cc94']
const PALE = ['#e6e3dc', '#dad6ce', '#e9e4d6', '#d6d9d8']
const ROOFS = ['#c65f3e', '#bc5435', '#cc6b47', '#c4623f', '#b85a3b']
const CROSS_X = [29, 45] // via Principe di Villafranca (coerente con city-street.js)
const ZIINO_SPAN = [-27, 7]
const RAIL_DARK = '#6a5848'
const LIGHT = '#f2eee4'

/**
 * Pareti con finestre di un volume: campate e piani interi, tinta con il colore di vertice.
 * @param {object} B batch della città
 * @param {object} M materiali
 * @param {{x0:number,z0:number,x1:number,z1:number,y0:number,top:number,color:string,bay?:number,floors?:number}} o
 */
export function walls(B, M, o) {
  const w = o.x1 - o.x0
  const d = o.z1 - o.z0
  const bay = o.bay ?? CITY_BAY
  const nbx = Math.max(1, Math.round(w / bay))
  const nbz = Math.max(1, Math.round(d / bay))
  const floors = o.floors ?? Math.max(1, Math.round((o.top - o.y0) / CITY_FLOOR))
  const fh = (o.top - o.y0) / floors
  B.box(M.cityWall, o.x0, o.y0, o.z0, o.x1, o.top, o.z1, {
    skip: '+y-y', color: o.color, su: nbx / w, suz: nbz / d, sv: 1 / fh, ox: o.x0, oz: o.z0, oy: o.y0,
  })
}

/** Tetto piano con cornicione e, a volte, un abbaino-torretta. */
export function flatRoof(B, M, o, rand) {
  B.box(M.plain, o.x0 - 0.2, o.top, o.z0 - 0.2, o.x1 + 0.2, o.top + 0.45, o.z1 + 0.2, { skip: '-y', color: PAL.roofFlat })
  const w = o.x1 - o.x0
  const d = o.z1 - o.z0
  if (rand() < 0.7 && w > 8 && d > 8) {
    const bx = o.x0 + 1.5 + rand() * (w - 6)
    const bz = o.z0 + 1.5 + rand() * (d - 6)
    B.box(M.plain, bx, o.top + 0.45, bz, bx + 2.6, o.top + 2.9, bz + 2.6, { color: '#b8b2a4' })
  }
}

/**
 * Tetto a padiglione (quattro falde) in coppi, con piccola sporgenza di gronda.
 * @param {object} B batch
 * @param {object} M materiali
 * @param {number[]} r [x0, z0, x1, z1] della muratura
 * @param {number} yE quota di gronda
 * @param {number} yR quota di colmo
 * @param {string} color tinta dei coppi
 * @param {number} [over] sporgenza (m)
 */
export function hipRoof(B, M, r, yE, yR, color, over = 0.4) {
  const [x0, z0, x1, z1] = [r[0] - over, r[1] - over, r[2] + over, r[3] + over]
  const w = x1 - x0
  const d = z1 - z0
  const o = { up: true, color, hs: 0.5 }
  const m = M.roofTile
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  if (w >= d) {
    const s = d / 2
    const a = [x0 + s, yR, cz]
    const b = [x1 - s, yR, cz]
    B.free(m, [x0, yE, z0], [x1, yE, z0], b, a, o)
    B.free(m, [x1, yE, z1], [x0, yE, z1], a, b, o)
    B.tri(m, [x0, yE, z1], [x0, yE, z0], a, o)
    B.tri(m, [x1, yE, z0], [x1, yE, z1], b, o)
  } else {
    const s = w / 2
    const a = [cx, yR, z0 + s]
    const b = [cx, yR, z1 - s]
    B.tri(m, [x0, yE, z0], [x1, yE, z0], a, o)
    B.tri(m, [x1, yE, z1], [x0, yE, z1], b, o)
    B.free(m, [x1, yE, z0], [x1, yE, z1], b, a, o)
    B.free(m, [x0, yE, z1], [x0, yE, z0], a, b, o)
  }
}

/** Balconi continui e lesene sul fronte che guarda -z (verso la nostra via, normale -z). */
function frontDetails(B, M, o) {
  const fh = (o.top - o.y0) / Math.max(1, Math.round((o.top - o.y0) / CITY_FLOOR))
  for (const k of [2, 3]) {
    const y = o.y0 + fh * k
    B.box(M.plain, o.x0 + 0.6, y - 0.15, o.z0 - 0.9, o.x1 - 0.6, y, o.z0, { color: LIGHT })
    B.box(M.plain, o.x0 + 0.6, y, o.z0 - 0.9, o.x1 - 0.6, y + 0.9, o.z0 - 0.84, { skip: '+y-y', color: RAIL_DARK })
  }
  for (const x of [o.x0, o.x1 - 0.5]) B.box(M.plain, x, o.y0, o.z0 - 0.15, x + 0.5, o.top, o.z0, { color: LIGHT })
}

/** Un edificio completo con muri, balconi e tetto (a coppi o a terrazza). */
function building(B, M, o, rand) {
  const hip = o.roof === 'hip'
  const rise = hip ? 2.4 : 0
  walls(B, M, { ...o, top: o.top - rise })
  if (o.front) frontDetails(B, M, { ...o, top: o.top - rise })
  if (hip) hipRoof(B, M, [o.x0, o.z0, o.x1, o.z1], o.top - rise, o.top, ROOFS[Math.floor(rand() * ROOFS.length)])
  else flatRoof(B, M, { ...o, top: o.top }, rand)
}

/** Fila di edifici lungo x: salta Palazzo Ziino e l'incrocio. `spec` dà z0, z1, altezze e tipo. */
function row(B, M, rand, spec) {
  let x = spec.xFrom
  while (x < spec.xTo) {
    let w = spec.w[0] + rand() * (spec.w[1] - spec.w[0])
    if (spec.skipZiino && x + w > ZIINO_SPAN[0] && x < ZIINO_SPAN[1]) { x = ZIINO_SPAN[1] + 0.5; continue }
    if (x + w > CROSS_X[0] - 0.5 && x < CROSS_X[1]) {
      w = CROSS_X[0] - 0.5 - x
      if (w < 12) { x = CROSS_X[1] + 1; continue }
    }
    if (x + w > spec.xTo) w = spec.xTo - x
    const top = spec.G + spec.h[0] + rand() * (spec.h[1] - spec.h[0])
    const colors = spec.colors
    building(B, M, {
      x0: x, x1: x + w, z0: spec.z0, z1: spec.z0 + spec.d[0] + rand() * (spec.d[1] - spec.d[0]),
      y0: spec.G, top, color: colors[Math.floor(rand() * colors.length)], roof: spec.roof(rand), front: spec.front,
    }, rand)
    x += w + spec.gap[0] + rand() * (spec.gap[1] - spec.gap[0])
  }
}

/**
 * Palazzi dall'altra parte della via (d'epoca, ocra) e condomini chiari dietro di loro.
 * @param {object} ctx contesto condiviso
 * @param {object} M materiali
 * @param {object} B batch della città
 * @param {number} G quota della strada (y)
 */
export function buildAcross(ctx, M, B, G) {
  const rand = rng(7)
  const zFar = ctx.plan.context.street.zFar
  const epoch = {
    G, z0: zFar, d: [16, 22], h: [16, 20], w: [22, 30], gap: [0.3, 0.6], colors: OCRA, front: true, skipZiino: true,
    roof: (r) => (r() < 0.65 ? 'hip' : 'flat'),
  }
  row(B, M, rand, { ...epoch, xFrom: -228, xTo: -27.5 })
  row(B, M, rand, { ...epoch, xFrom: 7.5, xTo: 122 })
  row(B, M, rand, { ...epoch, xFrom: 122, xTo: 318 })
  const condo = { G, z0: zFar + 28, d: [16, 20], h: [28, 32], w: [24, 34], gap: [4, 9], colors: PALE, roof: () => 'flat' }
  row(B, M, rand, { ...condo, xFrom: -200, xTo: 318 })
}

/**
 * Nostro lato della via: i volumi accanto all'attico e sotto i `context.blocks`.
 * A -x restano chiusi sul filo della parete, a +x (oltre l'incrocio) più bassi del piano della terrazza.
 * @param {object} ctx contesto condiviso
 * @param {object} M materiali
 * @param {object} B batch della città
 * @param {number} G quota della strada (y)
 */
export function buildOurSide(ctx, M, B, G) {
  const rand = rng(11)
  let xMin = 0
  for (const blk of ctx.plan.context.blocks) {
    for (const r of blk.rects) {
      // sotto la terrazza il corpo dell'edificio confinante ha finestre come gli altri palazzi
      walls(B, M, { x0: r[0], z0: r[1], x1: r[2], z1: r[3], y0: G, top: -0.02, color: ctx.styles.exterior.facade })
      xMin = Math.min(xMin, r[0])
    }
  }
  const back = ctx.plan.context.blocks[0].rects[0][1]
  const frontZ = Math.max(...ctx.plan.context.blocks.flatMap((b) => b.rects.map((r) => r[3])))
  const ceil = ctx.plan.meta.ceilingHeight
  let x = xMin
  while (x > -228) {
    const w = 18 + rand() * 12
    const top = G + (ceil + 22 - 0.8 * rand())
    building(B, M, {
      x0: x - w, x1: x, z0: back, z1: frontZ, y0: G, top, color: OCRA[Math.floor(rand() * OCRA.length)], roof: 'flat',
    }, rand)
    x -= w + 0.2
  }
  x = CROSS_X[1] + 0.4
  while (x < 316) {
    const w = 18 + rand() * 12
    const top = G + 22 + rand() * 1.4 // sotto lo sguardo di chi sta in terrazza (y = 1,6)
    building(B, M, {
      x0: x, x1: x + w, z0: back, z1: 14.5, y0: G, top, color: PALE[Math.floor(rand() * PALE.length)], roof: 'flat',
    }, rand)
    x += w + 0.3
  }
}
