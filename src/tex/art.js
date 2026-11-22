/** Quadri: sceglie lo stile e delega il disegno ai file art-*.js. */
import { rng, openFrame, SUBJECTS } from './art-draw.js'
import { drawLiberty } from './art-liberty.js'
import { drawModerno } from './art-moderno.js'
import { drawScandinavo } from './art-scandinavo.js'

let warned = false

/**
 * Disegna un quadro. g è un contesto 2D già creato, w e h le sue misure in pixel.
 * @param {string} id soggetto: uno dei nove identificativi dei quadri
 * @param {{ id?: string, name?: string }|string} style stile corrente (oggetto di ctx.currentStyle() o suo nome)
 * @param {CanvasRenderingContext2D} g contesto 2D
 * @param {number} w larghezza in pixel
 * @param {number} h altezza in pixel
 */
export function drawArt(id, style, g, w, h) {
  const key = typeof style === 'string' ? style : (style && (style.id || style.name || style.key)) || ''
  const kind = /moder/i.test(key) ? 'moderno' : /scand/i.test(key) ? 'scandinavo' : 'liberty'
  const rnd = rng(`${id}:${kind}`)
  g.save()
  if (!SUBJECTS.includes(id)) {
    if (!warned) { warned = true; globalThis.CASA?.debug?.ctx?.log?.warn?.(`quadro sconosciuto: ${id}`) }
    openFrame(g, w, h, kind === 'liberty' ? 'liberty' : kind, {})
    g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, w, h)
    g.restore(); g.restore()
    return
  }
  if (kind === 'moderno') drawModerno(id, g, w, h, rnd)
  else if (kind === 'scandinavo') drawScandinavo(id, g, w, h, rnd)
  else drawLiberty(id, g, w, h, rnd)
  g.restore()
}
