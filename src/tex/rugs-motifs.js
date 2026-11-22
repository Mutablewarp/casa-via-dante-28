/** Medaglioni e cantonali dei tappeti persiani. */
import { diamond, disc, rosette, leaf } from './draw.js'

const TAU = Math.PI * 2

/** Rombo a gradini (disegno spigoloso alla Heriz). */
function steppedLozenge(g, cx, cy, rx, ry, steps, fill) {
  const bh = ry / steps
  g.fillStyle = fill
  for (let i = -(steps - 1); i <= steps - 1; i++) {
    const w = rx * (1 - Math.abs(i) / steps)
    g.fillRect(cx - w, cy + (i - 0.5) * bh, 2 * w, bh + 0.6)
  }
}

/**
 * Riempie la sagoma del medaglione.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {string} kind stepped | oval | lozenge | round
 * @param {number} cx centro x
 * @param {number} cy centro y
 * @param {number} rx semiasse x
 * @param {number} ry semiasse y
 * @param {string} fill colore
 */
export function fillShape(g, kind, cx, cy, rx, ry, fill) {
  if (kind === 'stepped') return steppedLozenge(g, cx, cy, rx, ry, 7, fill)
  g.beginPath()
  if (kind === 'lozenge') {
    const k = 0.34
    g.moveTo(cx - rx, cy)
    g.quadraticCurveTo(cx - rx * k, cy - ry * k, cx, cy - ry)
    g.quadraticCurveTo(cx + rx * k, cy - ry * k, cx + rx, cy)
    g.quadraticCurveTo(cx + rx * k, cy + ry * k, cx, cy + ry)
    g.quadraticCurveTo(cx - rx * k, cy + ry * k, cx - rx, cy)
  } else {
    const n = kind === 'oval' ? 18 : 14
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * TAU
      const r = 1 + 0.045 * Math.cos(n * a)
      const x = cx + rx * r * Math.cos(a)
      const y = cy + ry * r * Math.sin(a)
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
  }
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

const LAYERS = (p) => ({
  stepped: [[1, p.outline], [0.93, p.ivory], [0.84, p.dark], [0.66, p.main], [0.5, p.ivory], [0.34, p.dark]],
  oval: [[1, p.outline], [0.95, p.gold], [0.86, p.dark], [0.58, p.main], [0.44, p.ivory]],
  lozenge: [[1, p.outline], [0.95, p.gold], [0.86, p.main], [0.7, p.ivory], [0.52, p.dark], [0.34, p.main]],
  round: [[1, p.outline], [0.95, p.gold], [0.88, p.dark], [0.6, p.ivory], [0.46, p.main]],
})

/**
 * Disegna un medaglione centrato, con pendenti sulle punte.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} cx centro x
 * @param {number} cy centro y
 * @param {number} rx semiasse lungo
 * @param {number} ry semiasse corto
 * @param {string} kind stepped | oval | lozenge | round
 * @param {object} p tavolozza
 */
export function medallion(g, cx, cy, rx, ry, kind, p) {
  const both = rx / ry < 1.3
  const tips = both ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 0], [-1, 0]]
  // pendenti: piccoli rombi sulle punte
  for (const [tx, ty] of tips) {
    const px = cx + tx * rx * 1.14
    const py = cy + ty * ry * 1.14
    const k = Math.min(rx, ry) * 0.3
    if (kind === 'stepped') {
      steppedLozenge(g, px, py, k, k, 3, p.outline)
      steppedLozenge(g, px, py, k * 0.7, k * 0.7, 3, p.gold)
    } else {
      diamond(g, px, py, k, k * 1.1, p.outline)
      diamond(g, px, py, k * 0.72, k * 0.8, p.gold)
    }
  }
  for (const [s, c] of LAYERS(p)[kind]) fillShape(g, kind, cx, cy, rx * s, ry * s, c)
  const m = Math.min(rx, ry)
  if (kind === 'oval' || kind === 'round') {
    // corona di petali lungo l'ellisse
    const n = kind === 'oval' ? 14 : 16
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU
      const px = cx + Math.cos(a) * rx * 0.72
      const py = cy + Math.sin(a) * ry * 0.72
      leaf(g, px, py, m * 0.2, m * 0.07, Math.atan2(Math.sin(a) * rx, Math.cos(a) * ry), p.ivory)
    }
  }
  if (kind === 'stepped') {
    steppedLozenge(g, cx, cy, m * 0.2, m * 0.2, 3, p.gold)
    steppedLozenge(g, cx, cy, m * 0.1, m * 0.1, 2, p.outline)
  } else if (kind === 'lozenge') {
    for (const [tx, ty] of [[1, 0], [-1, 0]]) disc(g, cx + tx * rx * 0.99, cy + ty * ry * 0.99, m * 0.09, p.gold)
    rosette(g, cx, cy, m * 0.24, 8, p.ivory, p.gold, p.dark)
  } else {
    rosette(g, cx, cy, m * 0.26, 8, p.gold, p.main, p.dark)
  }
}

/**
 * Cantonale: quarto di medaglione nell'angolo del campo.
 * @param {CanvasRenderingContext2D} g contesto (già ritagliato sul campo)
 * @param {number} x angolo x
 * @param {number} y angolo y
 * @param {number} r raggio
 * @param {string} kind tipo di medaglione del tappeto
 * @param {object} p tavolozza
 */
export function cantonal(g, x, y, r, kind, p) {
  if (kind === 'stepped') {
    steppedLozenge(g, x, y, r, r, 5, p.outline)
    steppedLozenge(g, x, y, r * 0.86, r * 0.86, 5, p.ivory)
    steppedLozenge(g, x, y, r * 0.66, r * 0.66, 4, p.dark)
    steppedLozenge(g, x, y, r * 0.36, r * 0.36, 3, p.gold)
    return
  }
  const shape = kind === 'lozenge' ? 'lozenge' : 'round'
  for (const [s, c] of [[1, p.outline], [0.94, p.gold], [0.84, p.dark], [0.62, p.ivory], [0.44, p.main]]) {
    fillShape(g, shape, x, y, r * s, r * s, c)
  }
  rosette(g, x, y, r * 0.3, 6, p.gold, p.dark)
}
