/** Oggetti d'appoggio: tavola, cucina, arredo, ripiani e specchi (costruttori nei file `props-*.js`). */
import { registerTable } from './props-table.js'
import { registerFood } from './props-food.js'
import { registerMisc } from './props-misc.js'
import { registerStore } from './props-store.js'
import { registerWall } from './props-wall.js'

/**
 * Registra tutti gli oggetti d'appoggio con `furn.registerProp`.
 * @param {object} furn registro degli arredi (`ctx.furn`)
 */
export function register(furn) {
  registerTable(furn)
  registerFood(furn)
  registerMisc(furn)
  registerStore(furn)
  registerWall(furn)
}
