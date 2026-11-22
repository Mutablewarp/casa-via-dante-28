/** Texture generate da canvas: tappeti, quadri, piastrelle, vetrata, dorsi (A2). */
import { makeCanvas } from './draw.js'
import { drawRug } from './rugs.js'
import { drawTile, TILE_METERS } from './tiles.js'
import { drawGlass, drawSpines } from './glass.js'
import { drawArt } from './art.js'

/** Nomi dei rivestimenti accettati da `ctx.tex.tile`. */
export const TILE_NAMES = Object.keys(TILE_METERS)

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE } = ctx
  const cache = new Map() // chiave `stile|nome` -> texture

  /** Prende dalla cache o crea la texture; `build` restituisce il canvas e `setup` la configura. */
  const get = (name, build, setup) => {
    const key = `${ctx.state.style}|${name}`
    let t = cache.get(key)
    if (!t) {
      const res = build()
      t = new THREE.CanvasTexture(res.canvas ?? res)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      setup?.(t, res)
      cache.set(key, t)
    }
    return t
  }
  const ratio = (a) => Math.max(0.1, Math.round(a * 10) / 10)

  ctx.tex.rug = (pattern, aspect) => {
    const a = ratio(aspect)
    return get(`rug:${pattern}:${a}`, () => drawRug(ctx.state.style, pattern, a))
  }

  ctx.tex.art = (id, aspect) => {
    const a = Math.max(0.2, ratio(aspect))
    return get(`art:${id}:${a}`, () => {
      const w = a >= 1 ? 512 : Math.round(512 * a)
      const h = a >= 1 ? Math.round(512 / a) : 512
      const { canvas, g } = makeCanvas(w, h)
      drawArt(id, ctx.currentStyle(), g, w, h)
      return canvas
    })
  }

  ctx.tex.tile = (name) => {
    if (!(name in TILE_METERS)) throw new Error(`tex.tile: rivestimento sconosciuto "${name}"`)
    return get(`tile:${name}`, () => drawTile(ctx.state.style, name), (t, res) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.userData.tileMeters = res.meters
      t.repeat.set(1 / res.meters, 1 / res.meters)
    })
  }

  ctx.tex.stainedGlass = () => get('glass', () => drawGlass(ctx.state.style))

  ctx.tex.bookSpines = () => get('spines', () => drawSpines(ctx.state.style), (t) => {
    t.wrapS = THREE.RepeatWrapping
  })

  // al cambio di stile si liberano le texture degli altri stili
  ctx.events.on('style:changed', ({ style }) => {
    for (const [key, t] of cache) {
      if (key.startsWith(`${style}|`)) continue
      t.dispose()
      cache.delete(key)
    }
  })

  ctx.debug.texCache = () => [...cache.keys()]
}
