/** Quadri in stile Moderno: tele astratte a campiture con un segno gestuale. */
import { openFrame, SUBJECTS } from './art-draw.js'

const C = { w: '#ebe8e0', g: '#8c9094', d: '#3a3f44', p: '#2f5d66', o: '#c99a3e', l: '#cfcdc6' }

// Composizioni: [tipo, colore, ...parametri in frazioni]. r = rettangolo (x,y,w,h), c = cerchio (x,y,raggio).
const LAYOUTS = [
  [['r', 'w', 0, 0, 1, 1], ['r', 'p', 0, 0, 0.64, 1], ['r', 'o', 0.64, 0.58, 0.36, 0.42]],
  [['r', 'g', 0, 0, 1, 0.45], ['r', 'w', 0, 0.45, 1, 0.22], ['r', 'p', 0, 0.67, 1, 0.33]],
  [['r', 'g', 0, 0, 1, 1], ['c', 'p', 0.45, 0.5, 0.34], ['r', 'w', 0.55, 0.12, 0.33, 0.2]],
  [['r', 'o', 0, 0, 1, 1], ['r', 'g', 0, 0.55, 0.7, 0.45], ['r', 'p', 0.7, 0.3, 0.3, 0.3]],
  [['r', 'w', 0, 0, 1, 1], ['r', 'd', 0, 0, 0.3, 1], ['r', 'p', 0.3, 0, 0.45, 0.62], ['r', 'o', 0.75, 0.45, 0.25, 0.55]],
  [['r', 'l', 0, 0, 1, 1], ['t', 'p', 0, 0, 1, 0, 0, 1], ['t', 'w', 1, 0, 1, 1, 0.3, 1]],
  [['r', 'w', 0, 0, 1, 1], ['r', 'g', 0.08, 0.1, 0.5, 0.45], ['r', 'o', 0.38, 0.38, 0.5, 0.5], ['r', 'd', 0.55, 0.05, 0.12, 0.3]],
  [['r', 'w', 0, 0, 1, 1], ['c', 'p', 0.3, 0.7, 0.42], ['c', 'o', 0.72, 0.28, 0.2], ['r', 'g', 0, 0, 1, 0.14]],
  [['r', 'g', 0, 0, 1, 1], ['r', 'p', 0.2, 0.12, 0.3, 0.76], ['c', 'o', 0.7, 0.4, 0.2], ['r', 'w', 0.58, 0.68, 0.34, 0.2]],
]

/**
 * Disegna una tela astratta.
 * @param {string} id soggetto (sceglie la composizione)
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} w larghezza
 * @param {number} h altezza
 * @param {() => number} rnd generatore con seme
 */
export function drawModerno(id, g, w, h, rnd) {
  const r = openFrame(g, w, h, 'moderno')
  const X = (f) => r.x + r.w * f, Y = (f) => r.y + r.h * f, m = Math.min(r.w, r.h)
  const idx = Math.max(0, SUBJECTS.indexOf(id))
  g.fillStyle = C.w; g.fillRect(r.x, r.y, r.w, r.h)
  for (const s of LAYOUTS[idx]) {
    g.fillStyle = C[s[1]]
    g.beginPath()
    if (s[0] === 'r') g.rect(X(s[2]), Y(s[3]), r.w * s[4], r.h * s[5])
    else if (s[0] === 'c') g.arc(X(s[2]), Y(s[3]), m * s[4], 0, Math.PI * 2)
    else { g.moveTo(X(s[2]), Y(s[3])); g.lineTo(X(s[4]), Y(s[5])); g.lineTo(X(s[6]), Y(s[7])); g.closePath() }
    g.fill()
  }
  g.globalAlpha = 0.5 // segno gestuale: pennellata a più setole
  const dark = idx % 2 ? C.d : C.w
  const x0 = X(0.1 + rnd() * 0.2), y0 = Y(0.2 + rnd() * 0.6), x1 = X(0.7 + rnd() * 0.25), y1 = Y(0.2 + rnd() * 0.6)
  g.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = i % 3 ? dark : C.o; g.lineWidth = Math.max(1, m * (0.035 - i * 0.004))
    g.beginPath(); g.moveTo(x0, y0 + i * m * 0.012)
    g.bezierCurveTo(X(0.35), Y(rnd()), X(0.55), Y(rnd()), x1, y1 + i * m * 0.012); g.stroke()
  }
  g.globalAlpha = 1
  g.restore()
}
