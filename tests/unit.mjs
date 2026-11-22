// Test unitari della griglia (S1). Uso: node tests/unit.mjs
import { readFileSync } from 'node:fs'
import { buildGrid, K } from '../src/core/grid.js'

const load = (n) => JSON.parse(readFileSync(new URL(`../spec/${n}.json`, import.meta.url), 'utf8'))
const plan = load('plan'), oracle = load('oracle'), tour = load('tour')
const g = buildGrid(plan)
const H = plan.meta.ceilingHeight
const near = (a, b, t = 0.01) => Math.abs(a - b) <= t
let failed = 0

function check(code, fn) {
  let msg = null
  try { msg = fn() } catch (e) { msg = `eccezione: ${e.stack}` }
  if (msg) { failed++; console.log(`${code} FALLITO: ${msg}`) } else console.log(`${code} OK`)
}

const kindName = Object.fromEntries(Object.entries(K).map(([n, v]) => [v, n.toLowerCase()]))
const spaces = [...plan.rooms.map((r) => ({ ...r, k: K.ROOM })), ...plan.outdoor.map((o) => ({ ...o, k: K.OUTDOOR }))]
const solidAt = (c, y) => g.solidSpans(c).some(([a, b]) => y >= a && y < b)

// Lunghezze di lato per spazio, secondo oracle.definition (quota 1.5).
function runs() {
  const out = {}
  for (const s of spaces) out[s.id] = { wallRun: 0, openRun: 0, area: 0 }
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const c = j * g.nx + i
    if (g.kind[c] !== K.ROOM && g.kind[c] !== K.OUTDOOR) continue
    const list = g.kind[c] === K.ROOM ? plan.rooms : plan.outdoor
    const o = out[list[g.ref[c]].id]
    const w = g.xs[i + 1] - g.xs[i], d = g.zs[j + 1] - g.zs[j]
    o.area += w * d
    for (const [di, dj, len] of [[-1, 0, d], [1, 0, d], [0, -1, w], [0, 1, w]]) {
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= g.nx || jj >= g.nz) continue
      const n = jj * g.nx + ii
      if (g.kind[n] === K.OPENING && !solidAt(n, 1.5)) o.openRun += len
      else if (solidAt(n, 1.5)) o.wallRun += len
    }
  }
  return out
}
const R = runs()

check('U01', () => {
  if (g.nx !== oracle.nx || g.nz !== oracle.nz) return `griglia ${g.nx}x${g.nz}, oracolo ${oracle.nx}x${oracle.nz}`
  const cnt = {}
  for (const k of g.kind) cnt[kindName[k]] = (cnt[kindName[k]] || 0) + 1
  const bad = Object.keys({ ...cnt, ...oracle.cellsByKind }).filter((k) => cnt[k] !== oracle.cellsByKind[k])
  return bad.length ? bad.map((k) => `${k}: ${cnt[k]} invece di ${oracle.cellsByKind[k]}`).join('; ') : null
})

check('U02', () => {
  const bad = Object.entries(oracle.areas).filter(([id, a]) => !R[id] || !near(R[id].area, a))
  return bad.length ? bad.map(([id, a]) => `${id}: ${R[id]?.area} invece di ${a}`).join('; ') : null
})

check('U03', () => {
  const bad = []
  for (const [id, r] of Object.entries(oracle.runs)) {
    if (!near(R[id].wallRun, r.wallRun)) bad.push(`${id} wallRun ${R[id].wallRun} invece di ${r.wallRun}`)
    if (!near(R[id].openRun, r.openRun)) bad.push(`${id} openRun ${R[id].openRun} invece di ${r.openRun}`)
  }
  return bad.length ? bad.join('; ') : null
})

check('U04', () => {
  const bad = []
  for (const o of plan.openings.filter((q) => q.walk)) {
    const [x0, z0, x1, z1] = o.rect
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    if (!g.isWalkable(cx, cz)) bad.push(`${o.id}: centro non calpestabile`)
    const [p, q] = o.wallAlong === 'x' ? [[cx, z0 - 0.02], [cx, z1 + 0.02]] : [[x0 - 0.02, cz], [x1 + 0.02, cz]]
    const a = g.spaceAt(...p)?.id, b = g.spaceAt(...q)?.id
    const ok = (a === o.from && b === o.to) || (a === o.to && b === o.from)
    if (!ok) bad.push(`${o.id}: lati ${a}/${b}, attesi ${o.from}/${o.to}`)
  }
  return bad.length ? bad.join('; ') : null
})

check('U05', () => {
  const seen = new Set(['pianerottolo'])
  const walk = plan.openings.filter((o) => o.walk)
  for (let changed = true; changed;) {
    changed = false
    for (const o of walk) {
      if (seen.has(o.from) !== seen.has(o.to)) { seen.add(o.from); seen.add(o.to); changed = true }
    }
  }
  const missing = spaces.filter((s) => !seen.has(s.id)).map((s) => s.id)
  return missing.length ? `non raggiunti: ${missing.join(', ')}` : null
})

check('U06', () => {
  const pts = tour.path.map((s) => s.p)
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05))
    for (let s = 0; s <= n; s++) {
      const x = ax + ((bx - ax) * s) / n, z = az + ((bz - az) * s) / n
      if (!g.isWalkable(x, z)) return `tratto ${k}->${k + 1}: (${x.toFixed(2)}, ${z.toFixed(2)}) non calpestabile`
    }
  }
  return null
})

check('U07', () => {
  const faces = g.faces()
  let area = 0
  for (const f of faces) {
    const len = Math.abs(f.x1 - f.x0) + Math.abs(f.z1 - f.z0)
    if (!(len > 0) || !(f.y1 - f.y0 > 0)) return `faccia degenere ${JSON.stringify(f)}`
    if (!near(Math.hypot(f.nx, f.nz), 1, 1e-9) || (f.nx !== 0 && f.nz !== 0)) return `normale non valida ${JSON.stringify(f)}`
    if (f.air.kind === K.ROOM && f.air.id === 'salotto' && f.y0 <= 1.5 && 1.5 < f.y1) area += (len * (f.y1 - f.y0)) / (f.y1 - f.y0)
  }
  const want = oracle.runs.salotto.wallRun
  return near(area, want) ? null : `lunghezza facce salotto ${area.toFixed(3)}, wallRun ${want}`
})

check('U08', () => {
  let caps = 0, cells = 0
  for (const c of g.caps()) if (c.up && c.y === H) caps += (c.rect[2] - c.rect[0]) * (c.rect[3] - c.rect[1])
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const c = j * g.nx + i, k = g.kind[c]
    const top = k === K.WALL || k === K.BUILTIN || k === K.CONTEXT || k === K.OPENING || (k === K.SOLID && plan.solids[g.ref[c]].h === H)
    if (top) cells += (g.xs[i + 1] - g.xs[i]) * (g.zs[j + 1] - g.zs[j])
  }
  return near(caps, cells) ? null : `sommità ${caps.toFixed(3)} m2, celle ${cells.toFixed(3)} m2`
})

check('U09', () => {
  const len = g.roomEdges('salotto', 1.5).reduce((s, e) => s + Math.abs(e.x1 - e.x0) + Math.abs(e.z1 - e.z0), 0)
  return near(len, oracle.runs.salotto.wallRun) ? null : `lunghezza ${len.toFixed(3)}, wallRun ${oracle.runs.salotto.wallRun}`
})

check('U10', () => {
  let s = 1, hits = 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const t0 = performance.now()
  for (let n = 0; n < 200000; n++) if (g.canStand(rnd() * 31, rnd() * 15, 0.25)) hits++
  const ms = performance.now() - t0
  return ms < 400 ? null : `${ms.toFixed(0)} ms per 200000 chiamate (${hits} vere)`
})

check('U11', () => {
  const bad = []
  for (const s of spaces) {
    const [x, z] = s.spawn
    if (!g.canStand(x, z, 0.3)) bad.push(`${s.id}: canStand falso`)
    if (g.spaceAt(x, z)?.id !== s.id) bad.push(`${s.id}: spaceAt dà ${g.spaceAt(x, z)?.id}`)
  }
  return bad.length ? bad.join('; ') : null
})

process.exit(failed ? 1 : 0)
