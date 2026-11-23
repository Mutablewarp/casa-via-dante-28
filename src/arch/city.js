/** Città intorno all'attico: via Dante, palazzi, retro, Palazzo Ziino, Politeama, fondale dei monti. */
import { Batch, rng } from './exterior-util.js'
import { getMats } from './exterior-mats.js'
import { buildStreet } from './city-street.js'
import { buildAcross, buildOurSide } from './city-blocks.js'
import { buildRear, buildCarpet } from './city-rear.js'
import { buildZiino } from './city-ziino.js'
import { buildPoliteama, buildCranes, buildBackdrop } from './city-far.js'

/**
 * Costruisce `ctx.groups.city`. Tre accumuli, una mesh per materiale ciascuno: `B` proietta e riceve ombra
 * (palazzi, tetti), `F` riceve soltanto (antenne, ringhiere, pezzi minuti), `G` è il suolo. Il resto è istanziato.
 * @param {object} ctx contesto condiviso
 */
export function init(ctx) {
  const t0 = performance.now()
  const M = getMats(ctx)
  const G = -ctx.plan.context.terraceLevel
  const group = ctx.groups.city
  const S = { B: new Batch(), F: new Batch(), G: new Batch(), M, rand: rng(3) }
  buildStreet(ctx, S, group, G)
  buildAcross(ctx, S, G)
  buildOurSide(ctx, S, G)
  buildRear(S, G)
  buildZiino(ctx, S, G)
  buildCarpet(S, G)
  const at = ctx.plan.context.landmarks.find((l) => l.id === 'politeama').at
  buildPoliteama(S, at, G)
  buildCranes(S, at, G)
  S.G.build(group, { cast: false, receive: true, name: 'city-ground' })
  S.B.build(group, { cast: true, receive: true, name: 'city' })
  S.F.build(group, { cast: false, receive: true, name: 'city-fine' })
  buildBackdrop(ctx, group)
  ctx.debug.cityMs = Math.round(performance.now() - t0)
}
