/** Quadri in stile Liberty: manifesti a campiture piatte con cornice dorata. */
import { openFrame } from './art-draw.js'
import { drawIris, drawGlicine, drawGlicineWide, drawNinfee, drawPavone } from './art-liberty-flora.js'
import { drawConca, drawPalermo, drawAgrumi, drawDama } from './art-liberty-scene.js'

const TABLE = {
  manifesto_iris: drawIris,
  manifesto_glicine: drawGlicine,
  manifesto_ninfee: drawNinfee,
  manifesto_pavone: drawPavone,
  glicine_orizzontale: drawGlicineWide,
  conca_doro: drawConca,
  veduta_palermo: drawPalermo,
  natura_morta_agrumi: drawAgrumi,
  dama_liberty: drawDama,
}

/**
 * Disegna un quadro Liberty; soggetto sconosciuto: campitura neutra con cornice.
 * @param {string} id soggetto
 * @param {CanvasRenderingContext2D} g contesto 2D
 * @param {number} w larghezza in pixel
 * @param {number} h altezza in pixel
 * @param {() => number} rnd generatore con seme
 * @returns {boolean} falso se il soggetto non esiste
 */
export function drawLiberty(id, g, w, h, rnd) {
  const fn = TABLE[id]
  const arch = id.startsWith('manifesto_') && w < h
  const r = openFrame(g, w, h, 'liberty', { arch })
  const lw = Math.min(3, Math.max(1.8, Math.min(w, h) / 90))
  if (fn) fn(g, r, lw, rnd)
  else { g.fillStyle = '#d8cdb0'; g.fillRect(r.x, r.y, r.w, r.h) }
  g.restore()
  if (arch) { // bordo scuro che segue l'arco
    const t = Math.min(w, h) * 0.06, rr = r.w / 2
    g.strokeStyle = '#3a2a10'; g.lineWidth = lw * 1.2
    g.beginPath(); g.moveTo(r.x, r.y + r.h); g.lineTo(r.x, r.y + rr); g.arc(r.x + rr, r.y + rr, rr, Math.PI, 0); g.lineTo(r.x + r.w, r.y + r.h); g.stroke()
    void t
  } else {
    g.strokeStyle = '#3a2a10'; g.lineWidth = lw * 1.2; g.strokeRect(r.x, r.y, r.w, r.h)
  }
  return !!fn
}
