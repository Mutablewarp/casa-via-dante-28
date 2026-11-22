/** Letti: `bed_double` e `bed_canopy` (E2). */
import * as THREE from 'three'
import { bedFrame, mattressBox, FRAME_Y } from './beds-frame.js'
import { makeLinen } from './beds-linen.js'
import { buildCanopy } from './beds-canopy.js'

const HEAD_TALL = 1.4 // oltre questa altezza (retype di cb_letto) la testiera si ferma a HEAD_RETYPE
const HEAD_RETYPE = 1.25

/** Letto completo: telaio e biancheria. */
function bed(item, env, hh) {
  const [w, d] = item.size
  const g = new THREE.Group()
  const { mw, z0, len } = mattressBox(item, d)
  g.add(bedFrame(env, w, d, hh))
  g.add(makeLinen(env, FRAME_Y, mw, z0, len))
  g.userData.top = { y: FRAME_Y + 0.28, w: mw, d: len }
  return g
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('bed_double', (item, env) => {
    const hh = item.size[2] > HEAD_TALL ? HEAD_RETYPE : item.size[2]
    return env.kit.finalize(bed(item, env, hh), item)
  })
  furn.register('bed_canopy', (item, env) => {
    const g = bed(item, env, 1.35)
    g.add(buildCanopy(item, env))
    return env.kit.finalize(g, item)
  })
}
