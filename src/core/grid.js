/** Griglia della pianta: celle tipizzate, collisioni, facce dei muri. Modulo puro, senza three né DOM. */
import { K } from './grid-kinds.js'
import { computeFaces, computeCaps, computeRoomEdges } from './grid-faces.js'

export { K }

const EPS = 1e-6
const r3 = (v) => Math.round(v * 1000) / 1000
const inRect = (r, x, z) => r[0] - EPS <= x && x <= r[2] + EPS && r[1] - EPS <= z && z <= r[3] + EPS
const anyRect = (rects, x, z) => rects.some((r) => inRect(r, x, z))

/** Raccoglie tutti i rettangoli che definiscono gli assi. */
function allRects(plan) {
  const out = [...plan.footprint]
  for (const g of [plan.rooms, plan.outdoor]) for (const it of g) out.push(...it.rects)
  for (const g of [plan.openings, plan.solids, plan.builtins]) for (const it of g) out.push(it.rect)
  out.push(plan.stairs.rect)
  for (const b of plan.context.blocks) out.push(...b.rects)
  return out
}

function axisValues(rects, lo, hi) {
  const set = new Set()
  for (const r of rects) { set.add(r3(r[lo])); set.add(r3(r[hi])) }
  return Float64Array.from([...set].sort((a, b) => a - b))
}

/** Tipo e indice di riferimento della cella con centro (x, z), nell'ordine di priorità del contratto. */
function classify(plan, x, z) {
  let i = plan.solids.findIndex((s) => inRect(s.rect, x, z))
  if (i >= 0) return [K.SOLID, i]
  i = plan.openings.findIndex((o) => inRect(o.rect, x, z))
  if (i >= 0) return [K.OPENING, i]
  i = plan.builtins.findIndex((b) => inRect(b.rect, x, z))
  if (i >= 0) return [K.BUILTIN, i]
  i = plan.rooms.findIndex((r) => anyRect(r.rects, x, z))
  if (i >= 0) return [K.ROOM, i]
  if (inRect(plan.stairs.rect, x, z)) return [K.STAIRS, -1]
  i = plan.outdoor.findIndex((o) => anyRect(o.rects, x, z))
  if (i >= 0) return [K.OUTDOOR, i]
  if (anyRect(plan.footprint, x, z)) return [K.WALL, -1]
  i = plan.context.blocks.findIndex((b) => anyRect(b.rects, x, z))
  if (i >= 0) return [K.CONTEXT, i]
  return [K.OUTSIDE, -1]
}

/** Intervalli pieni in altezza di una cella; null se non è piena. */
function spansOf(plan, kind, ref, H) {
  switch (kind) {
    case K.WALL: case K.BUILTIN: case K.CONTEXT: return [[0, H]]
    case K.SOLID: return [[0, plan.solids[ref].h]]
    case K.OPENING: {
      const o = plan.openings[ref]
      return o.sill > 0 ? [[0, o.sill], [o.head, H]] : [[o.head, H]]
    }
    default: return null
  }
}

/** Indice del tratto [arr[k], arr[k+1]) che contiene v, oppure -1 (ricerca binaria). */
function locate(arr, v) {
  const n = arr.length
  if (!(v >= arr[0] && v < arr[n - 1])) return -1
  let lo = 0, hi = n - 2
  const t = v + EPS
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (arr[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Costruisce la griglia dalla pianta.
 * @param {object} plan contenuto di spec/plan.json
 * @returns {object} griglia con xs, zs, kind, ref e i metodi del contratto
 */
export function buildGrid(plan) {
  const H = plan.meta.ceilingHeight
  const rects = allRects(plan)
  const xs = axisValues(rects, 0, 2)
  const zs = axisValues(rects, 1, 3)
  const nx = xs.length - 1, nz = zs.length - 1
  const kind = new Uint8Array(nx * nz)
  const ref = new Int16Array(nx * nz)
  const spans = new Array(nx * nz).fill(null)
  const walk = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const c = j * nx + i
    const [k, r] = classify(plan, (xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)
    kind[c] = k; ref[c] = r
    spans[c] = spansOf(plan, k, r, H)
    walk[c] = k === K.ROOM || k === K.OUTDOOR || (k === K.OPENING && plan.openings[r].walk) ? 1 : 0
  }

  const cellAt = (x, z) => {
    const i = locate(xs, x)
    if (i < 0) return -1
    const j = locate(zs, z)
    return j < 0 ? -1 : j * nx + i
  }
  const isWalkable = (x, z) => { const c = cellAt(x, z); return c >= 0 && walk[c] === 1 }
  const idOf = (k, r) => {
    const list = k === K.ROOM ? plan.rooms : k === K.OUTDOOR ? plan.outdoor : k === K.OPENING ? plan.openings
      : k === K.SOLID ? plan.solids : k === K.BUILTIN ? plan.builtins : k === K.CONTEXT ? plan.context.blocks : null
    return list && r >= 0 ? list[r].id : undefined
  }
  const spaceIndex = (id) => {
    let i = plan.rooms.findIndex((r) => r.id === id)
    if (i >= 0) return { kind: K.ROOM, index: i, item: plan.rooms[i] }
    i = plan.outdoor.findIndex((o) => o.id === id)
    return i >= 0 ? { kind: K.OUTDOOR, index: i, item: plan.outdoor[i] } : null
  }

  const grid = {
    xs, zs, kind, ref, nx, nz, spans, plan, cellAt, isWalkable, spaceIndex,
    /** Etichetta { kind, ref, id } di una cella, usata da facce e sommità. */
    tagOf(c) {
      const id = idOf(kind[c], ref[c])
      return id === undefined ? { kind: kind[c], ref: ref[c] } : { kind: kind[c], ref: ref[c], id }
    },
    kindAt(x, z) { const c = cellAt(x, z); return c < 0 ? K.OUTSIDE : kind[c] },
    spaceAt(x, z) {
      const c = cellAt(x, z)
      if (c < 0 || (kind[c] !== K.ROOM && kind[c] !== K.OUTDOOR)) return null
      return { type: kind[c] === K.ROOM ? 'room' : 'outdoor', id: idOf(kind[c], ref[c]), index: ref[c] }
    },
    openingAt(x, z) { const c = cellAt(x, z); return c >= 0 && kind[c] === K.OPENING ? plan.openings[ref[c]] : null },
    canStand(x, z, r) {
      if (!isWalkable(x, z)) return false
      const d = r * Math.SQRT1_2
      return isWalkable(x + r, z) && isWalkable(x - r, z) && isWalkable(x, z + r) && isWalkable(x, z - r)
        && isWalkable(x + d, z + d) && isWalkable(x + d, z - d) && isWalkable(x - d, z + d) && isWalkable(x - d, z - d)
    },
    solidSpans(c) { return spans[c] || [] },
    rectsOf(id) { const s = spaceIndex(id); return s ? s.item.rects : [] },
    roomEdges(id, y) { return computeRoomEdges(grid, id, y) },
  }
  let facesCache = null, capsCache = null
  grid.faces = () => (facesCache ||= computeFaces(grid))
  grid.caps = () => (capsCache ||= computeCaps(grid))
  return grid
}
