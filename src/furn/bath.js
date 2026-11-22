/** Bagno: vasche, mobili lavabo, sanitari, doccia, scaldasalviette (E2). */
import { buildTub } from './bath-tub.js'
import { buildVanity } from './bath-vanity.js'
import { buildShower } from './bath-shower.js'
import * as fixtures from './bath-fixtures.js'

/** @param {object} furn registro degli arredi */
export function register(furn) {
  const wrap = (fn) => (item, env) => env.kit.finalize(fn(item, env), item)
  furn.register('bathtub_clawfoot', wrap((item, env) => buildTub(item, env, true)))
  furn.register('bathtub_freestanding', wrap((item, env) => buildTub(item, env, false)))
  furn.register('vanity_single', wrap((item, env) => buildVanity(item, env, 1)))
  furn.register('vanity_double', wrap((item, env) => buildVanity(item, env, 2)))
  furn.register('shower_walkin', wrap(buildShower))
  furn.register('wc', fixtures.wc)
  furn.register('bidet', fixtures.bidet)
  furn.register('towel_rail', fixtures.towelRail)
}
