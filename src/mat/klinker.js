/** Klinker della facciata sulla terrazza: listelli verticali rigati con fuga incassata. */
import { rgb, fillPixels, makeCanvas, hash2 } from './noise.js'
import { canvasTexture } from './textures.js'
import { reliefBuffers, attachRelief, joint } from './relief.js'

/**
 * Listelli 24 x 48 cm rigati, in bruno con tono e rugosità che variano poco da un elemento all'altro.
 * Cella 4 x 2 listelli (0,96 x 0,96 m): 1 unità UV = 1 m. Le costole e la fuga stanno nella normalMap
 * (`userData.normalMap`), la fuga più ruvida nella `userData.roughnessMap`.
 * @param {object} THREE @param {string} hex colore base @param {{ribs:number, tile:[number, number]}} def
 */
export function klinker(THREE, hex, def) {
  const [tw, th] = def.tile
  const cols = 4, rows = 2
  const wM = tw * cols, hM = th * rows
  const ppm = 1024 / Math.max(wM, hM)
  const cv = makeCanvas(Math.round((wM * ppm) / 2) * 2, Math.round((hM * ppm) / 2) * 2)
  const base = rgb(hex)
  const rel = reliefBuffers('klinker', cv.w, cv.h, true)
  const GW = 0.0045 // mezza fuga
  fillPixels(cv, (x, y, out) => {
    const mx = x / ppm, my = y / ppm
    const ci = Math.floor(mx / tw), ri = Math.floor(my / th)
    const lx = mx - ci * tw, ly = my - ri * th
    const rib = (lx % def.ribs) / def.ribs
    const bump = 1 - (2 * rib - 1) * (2 * rib - 1) // costola tonda: 0 nel solco, 1 in cresta
    const edge = Math.min(lx, tw - lx, ly, th - ly)
    // il solco resta appena più scuro (sporco); l'ombra vera la dà il rilievo
    let k = (0.93 + hash2(ci, ri, 31) * 0.14) * (0.9 + 0.1 * bump) * (0.97 + hash2(x, y, 4) * 0.06)
    if (edge < GW) k *= 0.45
    out[0] = Math.min(255, base[0] * k); out[1] = Math.min(255, base[1] * k); out[2] = Math.min(255, base[2] * k)
    if (rel) {
      const i = y * cv.w + x
      rel.hm[i] = 0.0012 * bump + joint(edge, GW, 0.003, 0.003) + (hash2(ci, ri, 32) - 0.5) * 0.0006 + (hash2(x, y, 6) - 0.5) * 0.00006
      rel.rm[i] = edge < GW ? 1 : 0.8 + 0.2 * hash2(ci, ri, 33)
    }
  })
  const tex = canvasTexture(THREE, cv.canvas, { meters: [wM, hM], aniso: 4, albedo: true })
  return attachRelief(THREE, tex, 'klinker', rel, [wM, hM], { aniso: 4, half: true })
}
