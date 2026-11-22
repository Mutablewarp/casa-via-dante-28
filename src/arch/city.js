/** Città intorno all'attico: via Dante, palazzi, retro, Politeama, fondale dei monti. */
import { Batch } from './exterior-util.js'
import { getMats } from './exterior-mats.js'
import { buildStreet } from './city-street.js'
import { buildAcross, buildOurSide } from './city-blocks.js'
import { buildRear, buildZiino, buildCarpet } from './city-rear.js'
import { buildPoliteama, buildCranes, buildBackdrop } from './city-far.js'

/**
 * Costruisce `ctx.groups.city`: tutto fuso per materiale o istanziato (nessuna ombra proiettata).
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const M = getMats(ctx)
  const G = -ctx.plan.context.terraceLevel
  const B = new Batch()
  const lm = ctx.plan.context.landmarks
  const group = ctx.groups.city
  buildStreet(ctx, M, B, group, G)
  buildAcross(ctx, M, B, G)
  buildOurSide(ctx, M, B, G)
  buildRear(B, M, G)
  buildZiino(ctx, M, B, G)
  buildCarpet(B, M, G)
  const at = lm.find((l) => l.id === 'politeama').at
  buildPoliteama(B, M, at, G)
  buildCranes(B, M, at, G)
  B.build(group, { cast: false, receive: true, name: 'city' })
  buildBackdrop(ctx, group)
}
