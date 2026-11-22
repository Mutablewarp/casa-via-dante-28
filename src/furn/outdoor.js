/** Esterni (E3): registrazione di sedie, poltrone, divano, tavolo, lettino, dondolo e portaombrelli. */
import { buildChair, buildArmchair, buildSofa } from './outdoor-seating.js'
import { buildTable, buildSunbed, buildSwing, buildUmbrellaStand } from './outdoor-more.js'

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('outdoor_chair', buildChair)
  furn.register('outdoor_armchair', buildArmchair)
  furn.register('outdoor_sofa', buildSofa)
  furn.register('outdoor_table', buildTable)
  furn.register('sunbed', buildSunbed)
  furn.register('swing_bench', buildSwing)
  furn.register('umbrella_stand', buildUmbrellaStand)
}
