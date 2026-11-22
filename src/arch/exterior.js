/** Terrazza, balconi e giardino d'inverno: pavimenti, solette, soffitti, ringhiere, vetrata, edificio. */
import { Batch } from './exterior-util.js'
import { buildRailings } from './exterior-rail.js'
import { buildBuilding } from './exterior-facade.js'

const SOFFIT_THICK = 0.25
const BEAM = { w: 0.2, h: 0.35 } // trave sopra i pilastri della terrazza

/** Pavimenti degli spazi esterni: un piano per rettangolo, UV in metri. */
function floors(ctx) {
  const B = new Batch()
  for (const o of ctx.plan.outdoor) {
    const mat = ctx.mat.fixed('outdoorFloor:' + o.id)
    for (const r of o.rects) B.horiz(mat, r[0], r[1], r[2], r[3], 0, true)
  }
  B.build(ctx.groups.exterior, { cast: false, receive: true, name: 'outdoor-floors' })
}

/** Soffitti dei rettangoli coperti (bianchi sotto) e trave sopra i sei pilastri; sparisce dall'alto. */
function ceilings(ctx) {
  const { plan } = ctx
  const H = plan.meta.ceilingHeight
  const facade = ctx.mat.fixed('facade')
  const B = new Batch()
  for (const o of plan.outdoor) {
    for (const r of o.covered) {
      B.box(facade, r[0], H, r[1], r[2], H + SOFFIT_THICK, r[3], { skip: '-y' })
      B.horiz(ctx.mat.fixed('soffit'), r[0], r[1], r[2], r[3], H, false)
    }
  }
  const pillars = plan.solids.filter((s) => s.id.startsWith('pilastro_terrazza'))
  if (pillars.length) {
    const x0 = Math.min(...pillars.map((p) => p.rect[0]))
    const x1 = Math.max(...pillars.map((p) => p.rect[2]))
    const zc = pillars.reduce((a, p) => a + (p.rect[1] + p.rect[3]) / 2, 0) / pillars.length
    B.box(ctx.mat.fixed('pillar'), x0, H - BEAM.h, zc - BEAM.w / 2, x1, H, zc + BEAM.w / 2)
  }
  B.build(ctx.groups.ceilings, { cast: true, receive: true, name: 'outdoor-ceilings' })
}

/**
 * Costruisce gli esterni dell'attico in `ctx.groups.exterior` e `ctx.groups.ceilings`.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  floors(ctx)
  ceilings(ctx)
  buildRailings(ctx)
  buildBuilding(ctx)
}
