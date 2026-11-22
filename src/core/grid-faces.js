/** Facce verticali, sommità e bordi di stanza ricavati dalla griglia; usato da grid.js. */
import { solidAtY } from './grid-kinds.js'

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const TOL = 1e-9

/** Parti degli intervalli a che non sono coperte dagli intervalli b (entrambi ordinati). */
function subtract(a, b) {
  if (!b) return a
  const out = []
  for (const [lo, hi] of a) {
    let cur = lo
    for (const [b0, b1] of b) {
      if (b1 <= cur || b0 >= hi) continue
      if (b0 > cur) out.push([cur, b0])
      cur = Math.max(cur, b1)
    }
    if (cur < hi) out.push([cur, hi])
  }
  return out
}

/** Unisce gli intervalli [a, b] contigui o sovrapposti. */
function mergeRuns(list) {
  list.sort((p, q) => p[0] - q[0])
  const out = []
  for (const r of list) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1] + TOL) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

function push(map, key, extra, a, b) {
  let e = map.get(key)
  if (!e) map.set(key, (e = { extra, runs: [] }))
  e.runs.push([a, b])
}

function sideOf(g, i, j, di, dj) {
  const { xs, zs } = g
  if (di) { const x = di > 0 ? xs[i + 1] : xs[i]; return { axis: 'x', coord: x, a: zs[j], b: zs[j + 1] } }
  const z = dj > 0 ? zs[j + 1] : zs[j]
  return { axis: 'z', coord: z, a: xs[i], b: xs[i + 1] }
}

function neighbor(g, i, j, di, dj) {
  const ii = i + di, jj = j + dj
  return ii < 0 || jj < 0 || ii >= g.nx || jj >= g.nz ? -1 : jj * g.nx + ii
}

/** Facce verticali fuse: { x0, z0, x1, z1, y0, y1, nx, nz, solid, air }. */
export function computeFaces(g) {
  const groups = new Map()
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const c = j * g.nx + i
    const spans = g.spans[c]
    if (!spans) continue
    for (const [di, dj] of DIRS) {
      const nb = neighbor(g, i, j, di, dj)
      const pieces = nb < 0 ? spans : subtract(spans, g.spans[nb])
      if (!pieces.length) continue
      const s = sideOf(g, i, j, di, dj)
      const air = nb < 0 ? { kind: 0, ref: -1 } : g.tagOf(nb)
      for (const [y0, y1] of pieces) {
        const key = [s.axis, s.coord, di, dj, y0, y1, g.kind[c], g.ref[c], air.kind, air.ref].join('|')
        push(groups, key, { s, di, dj, y0, y1, c, air }, s.a, s.b)
      }
    }
  }
  const out = []
  for (const { extra: e, runs } of groups.values()) {
    for (const [a, b] of mergeRuns(runs)) {
      const alongX = e.s.axis === 'x'
      out.push({
        x0: alongX ? e.s.coord : a, z0: alongX ? a : e.s.coord,
        x1: alongX ? e.s.coord : b, z1: alongX ? b : e.s.coord,
        y0: e.y0, y1: e.y1, nx: e.di, nz: e.dj,
        solid: g.tagOf(e.c), air: e.air,
      })
    }
  }
  return out
}

/** Facce orizzontali dei pieni, fuse lungo x: { rect, y, up, solid }. */
export function computeCaps(g) {
  const groups = new Map()
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const c = j * g.nx + i
    const spans = g.spans[c]
    if (!spans) continue
    for (const [y0, y1] of spans) {
      const add = (y, up) => push(groups, [j, y, up, g.kind[c], g.ref[c]].join('|'), { j, y, up, c }, g.xs[i], g.xs[i + 1])
      add(y1, true)
      if (y0 > 0) add(y0, false)
    }
  }
  const out = []
  for (const { extra: e, runs } of groups.values()) {
    for (const [a, b] of mergeRuns(runs)) {
      out.push({ rect: [a, g.zs[e.j], b, g.zs[e.j + 1]], y: e.y, up: e.up, solid: { kind: g.kind[e.c], ref: g.ref[e.c] } })
    }
  }
  return out
}

/** Lati dello spazio che toccano un pieno alla quota y, con normale verso l'interno. */
export function computeRoomEdges(g, spaceId, y) {
  const sp = g.spaceIndex(spaceId)
  if (!sp) return []
  const groups = new Map()
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const c = j * g.nx + i
    if (g.kind[c] !== sp.kind || g.ref[c] !== sp.index) continue
    for (const [di, dj] of DIRS) {
      const nb = neighbor(g, i, j, di, dj)
      if (nb < 0 || !solidAtY(g.spans[nb], y)) continue
      const s = sideOf(g, i, j, di, dj)
      push(groups, [s.axis, s.coord, di, dj].join('|'), { s, di, dj }, s.a, s.b)
    }
  }
  const out = []
  for (const { extra: e, runs } of groups.values()) {
    for (const [a, b] of mergeRuns(runs)) {
      const alongX = e.s.axis === 'x'
      out.push({
        x0: alongX ? e.s.coord : a, z0: alongX ? a : e.s.coord,
        x1: alongX ? e.s.coord : b, z1: alongX ? b : e.s.coord,
        nx: -e.di, nz: -e.dj,
      })
    }
  }
  return out
}
