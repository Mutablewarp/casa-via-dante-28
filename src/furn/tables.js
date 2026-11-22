/** Tavoli (E1): registra tavolini, comodino, tavolo da pranzo, consolle, scrittoio, toeletta e bistrot. */
import { buildLowTable, buildNightstand, buildConsole, buildBistro } from './tables-low.js'
import { buildDiningTable, buildDesk, buildVanity } from './tables-big.js'

/** @param {object} furn registro degli arredi (`ctx.furn`) */
export function register(furn) {
  furn.register('coffee_table', (item, env) => buildLowTable(item, env, false))
  furn.register('side_table', (item, env) => buildLowTable(item, env, true))
  furn.register('nightstand', buildNightstand)
  furn.register('dining_table', buildDiningTable)
  furn.register('console', buildConsole)
  furn.register('desk', buildDesk)
  furn.register('vanity_table', buildVanity)
  furn.register('bistro_table', buildBistro)
}
