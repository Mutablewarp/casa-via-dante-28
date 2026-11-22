/** Materiali e superfici: `ctx.mat.room`, `ctx.mat.fixed`, `ctx.mat.get`. Vedi surfaces.js per la convenzione UV. */
import { createStore } from './textures.js'
import { createSurfaces } from './surfaces.js'
import { createFixed } from './fixed.js'
import { createTokens } from './tokens.js'
import { startWarm } from './warm.js'

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const store = createStore()
  const link = { fixed: null, room: null }
  const surfaces = createSurfaces(ctx, store, link)
  const tokens = createTokens(ctx, store)
  const fixed = createFixed(ctx, store, link)
  link.fixed = fixed.get
  link.room = surfaces.room

  ctx.mat.room = surfaces.room
  ctx.mat.fixed = fixed.get
  ctx.mat.get = tokens.get

  /** Libera dalla GPU le texture che nessun materiale usa più (restano in cache per un eventuale ritorno). */
  const sweep = () => {
    const used = new Set()
    for (const m of [...surfaces.materials(), ...fixed.materials(), ...tokens.materials()]) if (m.map) used.add(m.map)
    store.sweep(used)
  }

  ctx.events.on('style:changed', () => {
    surfaces.refresh()
    fixed.refresh()
    tokens.reset()
    sweep()
    // le texture di A2 si aggiornano nel suo ascoltatore, che gira dopo il mio: le rileggo subito dopo
    queueMicrotask(() => {
      surfaces.refreshTiles()
      fixed.refreshTiles()
      sweep()
    })
  })

  ctx.events.on('ready', () => startWarm(ctx, store))

  ctx.debug.mat = () => ({ cachedTextures: store.size(), tokens: tokens.materials().length })
}
