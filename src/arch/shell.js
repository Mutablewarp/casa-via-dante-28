/** Involucro: muri, sommità, pavimenti, soffitti e travi, dalla griglia della pianta. */
import { K } from '../core/grid.js'
import { Batch, meshOf, slot } from './shell-geo.js'

const EPS = 1e-6

/** Descrittore del materiale di una faccia: { room } oppure { fixed }. */
function classify(f, H) {
  const { solid, air } = f
  if (solid.kind === K.CONTEXT) return { fixed: 'contextWall' }
  if (air.kind === K.STAIRS) return { fixed: 'common' }
  if (air.kind === K.ROOM) {
    if (air.id === 'pianerottolo') return { fixed: 'common' }
    return solid.kind === K.BUILTIN ? { fixed: 'builtin' } : { room: air.id }
  }
  if (air.kind === K.OPENING) return { fixed: 'trim' }
  if (air.kind === K.OUTDOOR && air.id === 'terrazza') return { fixed: solid.kind === K.SOLID ? 'pillar' : 'klinker' }
  return { fixed: 'facade' }
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE, grid, plan } = ctx
  const H = plan.meta.ceilingHeight
  const arch = ctx.groups.architecture
  const ceil = ctx.groups.ceilings
  const add = (g, m) => { if (m) g.add(m) }

  // --- Muri: smistamento delle facce ---
  const fixedB = new Map()
  const roomFaces = new Map()
  for (const f of grid.faces()) {
    const c = classify(f, H)
    if (c.fixed) {
      const b = slot(fixedB, c.fixed)
      b.wall(f.x0, f.z0, f.x1, f.z1, f.y0, f.y1, f.nx, f.nz)
    } else {
      if (!roomFaces.has(c.room)) roomFaces.set(c.room, [])
      roomFaces.get(c.room).push(f)
    }
  }

  // --- Sommità e orizzontali ---
  const capB = new Batch(), sillB = new Batch()
  for (const c of grid.caps()) {
    if (!c.up) slot(fixedB, 'trim').flat(c.rect, c.y, false)
    // Tetto dell'edificio confinante: intonaco chiaro, non il nero delle sezioni di muro (dall'alto era una lastra nera).
    else if (c.solid && c.solid.kind === K.CONTEXT) slot(fixedB, 'context').flat(c.rect, c.y, true)
    else if (c.y >= H - EPS) capB.flat(c.rect, c.y, true)
    else sillB.flat(c.rect, c.y, true)
  }

  // --- Muri per stanza (ricostruibili al cambio di stile) ---
  const roomMeshes = new Map()
  const wainscotRooms = new Set()
  for (const st of Object.values(ctx.styles.styles)) {
    for (const id of Object.keys(st.wainscot ?? {})) if (id !== 'height') wainscotRooms.add(id)
  }

  /** Costruisce le mesh dei muri di una stanza con i materiali correnti. */
  function buildRoom(id) {
    const faces = roomFaces.get(id)
    if (!faces) return
    const rm = ctx.mat.room(id)
    const wh = rm.wainscot ? ctx.currentStyle().wainscot.height : 0
    const wall = new Batch(), wain = new Batch()
    for (const f of faces) {
      const lo = Math.min(f.y1, wh)
      if (wh > f.y0) wain.wall(f.x0, f.z0, f.x1, f.z1, f.y0, lo, f.nx, f.nz)
      if (f.y1 > Math.max(f.y0, wh)) wall.wall(f.x0, f.z0, f.x1, f.z1, Math.max(f.y0, wh), f.y1, f.nx, f.nz)
    }
    const list = [
      meshOf(THREE, wall, rm.wall, { cast: true, room: id, name: `wall:${id}` }),
      rm.wainscot ? meshOf(THREE, wain, rm.wainscot, { cast: true, room: id, name: `wainscot:${id}` }) : null,
    ].filter(Boolean)
    for (const m of list) arch.add(m)
    roomMeshes.set(id, list)
  }

  function rebuildRoom(id) {
    for (const m of roomMeshes.get(id) ?? []) { arch.remove(m); m.geometry.dispose() }
    roomMeshes.delete(id)
    buildRoom(id)
  }

  for (const id of roomFaces.keys()) buildRoom(id)
  ctx.events.on('style:changed', () => { for (const id of wainscotRooms) rebuildRoom(id) })

  // --- Mesh fisse (una per materiale) ---
  for (const [name, b] of fixedB) {
    add(arch, meshOf(THREE, b, ctx.mat.fixed(name), { cast: true, name: `fixed:${name}` }))
  }
  add(arch, meshOf(THREE, capB, ctx.mat.fixed('wallcap'), { cast: true, name: 'caps' }))

  // --- Pavimenti per stanza e soglie ---
  for (const room of plan.rooms) {
    const b = new Batch()
    for (const r of grid.rectsOf(room.id)) b.flat(r, 0, true)
    add(arch, meshOf(THREE, b, ctx.mat.room(room.id).floor, { room: room.id, name: `floor:${room.id}` }))
  }
  for (const o of plan.openings) if (o.sill === 0) sillB.flat(o.rect, 0, true)
  add(arch, meshOf(THREE, sillB, ctx.mat.fixed('sill'), { cast: true, name: 'sills' }))

  // --- Soffitti e travi: una mesh per materiale ---
  const ceilMat = new Map()
  const into = (roomId) => {
    const m = ctx.mat.room(roomId).ceiling
    if (!ceilMat.has(m)) ceilMat.set(m, new Batch())
    return ceilMat.get(m)
  }
  for (const room of plan.rooms) for (const r of grid.rectsOf(room.id)) into(room.id).flat(r, H, false)
  for (const be of plan.beams) {
    const [x0, z0, x1, z1] = be.rect
    into(be.room).box([x0, be.y0, z0, x1, H, z1], 't')
  }
  for (const [m, b] of ceilMat) add(ceil, meshOf(THREE, b, m, { cast: true, name: 'ceiling' }))
}
