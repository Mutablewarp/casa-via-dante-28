/** Quadri in stile Scandinavo: disegni botanici al tratto nero su fondo bianco caldo. */
import { openFrame, oval, petal } from './art-draw.js'

const INK = '#232323'

function leafPair(g, x, y, len, ang, lw) {
  petal(g, x, y, len, len * 0.28, ang - 0.7, null, INK, lw)
  petal(g, x, y, len, len * 0.28, ang + 0.7, null, INK, lw)
}

function curve(g, p, lw) {
  g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = 'round'
  g.beginPath(); g.moveTo(p[0], p[1]); g.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]); g.stroke()
}

/**
 * Disegna un disegno botanico al tratto.
 * @param {string} id soggetto
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} w larghezza
 * @param {number} h altezza
 * @param {() => number} rnd generatore con seme
 */
export function drawScandinavo(id, g, w, h, rnd) {
  const r = openFrame(g, w, h, 'scandinavo')
  const X = (f) => r.x + r.w * f, Y = (f) => r.y + r.h * f
  const m = Math.min(r.w, r.h), lw = Math.max(1, m / 150)
  g.fillStyle = '#fbf8f1'; g.fillRect(r.x, r.y, r.w, r.h)
  g.strokeStyle = INK; g.lineWidth = lw
  const wide = r.w > r.h * 1.15
  switch (id) {
    case 'manifesto_iris':
      curve(g, [X(0.5), Y(0.98), X(0.46), Y(0.7), X(0.55), Y(0.5), X(0.5), Y(0.32)], lw)
      petal(g, X(0.5), Y(0.98), r.h * 0.5, m * 0.07, -1.9, null, INK, lw); petal(g, X(0.5), Y(0.98), r.h * 0.45, m * 0.07, -1.25, null, INK, lw)
      for (const a of [-2.4, -0.75]) petal(g, X(0.5), Y(0.32), m * 0.3, m * 0.1, a, null, INK, lw)
      petal(g, X(0.5), Y(0.32), m * 0.3, m * 0.09, -1.57, null, INK, lw)
      break
    case 'manifesto_glicine':
    case 'glicine_orizzontale': {
      curve(g, [X(0.02), Y(0.16), X(0.3), Y(0.04), X(0.6), Y(0.3), X(0.98), Y(0.14)], lw * 1.4)
      const n = wide ? 6 : 3
      for (let i = 0; i < n; i++) {
        const x = X(0.12 + (i / n) * 0.8), y = Y(0.12 + 0.05 * Math.sin(i)), L = r.h * (0.4 + rnd() * 0.3)
        for (let k = 0; k < 9; k++) oval(g, x + Math.sin(k) * m * 0.02, y + (k / 9) * L, m * 0.045 * (1 - k / 11), m * 0.05 * (1 - k / 11), null, INK, lw)
        leafPair(g, x + m * 0.05, y, m * 0.14, -0.4, lw)
      }
      break
    }
    case 'manifesto_ninfee':
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r.x, Y(0.85 + i * 0.04)); g.lineTo(r.x + r.w, Y(0.85 + i * 0.04)); g.stroke() }
      g.beginPath(); g.moveTo(X(0.34), Y(0.7)); g.arc(X(0.34), Y(0.7), m * 0.3, 0.4, 6.0); g.closePath(); g.stroke()
      for (let i = 0; i < 7; i++) petal(g, X(0.66), Y(0.45), m * 0.28, m * 0.06, -1.57 + (i - 3) * 0.42, null, INK, lw)
      curve(g, [X(0.66), Y(0.45), X(0.7), Y(0.6), X(0.6), Y(0.75), X(0.62), Y(0.86)], lw)
      break
    case 'manifesto_pavone':
      curve(g, [X(0.5), Y(0.98), X(0.46), Y(0.7), X(0.56), Y(0.4), X(0.5), Y(0.08)], lw * 1.3)
      for (let i = 0; i < 12; i++) {
        const y = Y(0.2 + i * 0.065), k = Math.sin((i / 12) * Math.PI) * m * 0.3 + m * 0.06
        g.beginPath(); g.moveTo(X(0.5), y); g.lineTo(X(0.5) - k, y + m * 0.1); g.moveTo(X(0.5), y); g.lineTo(X(0.5) + k, y + m * 0.1); g.stroke()
      }
      oval(g, X(0.5), Y(0.34), m * 0.1, m * 0.14, null, INK, lw)
      oval(g, X(0.5), Y(0.34), m * 0.04, m * 0.06, INK, null, 0)
      break
    case 'conca_doro':
      oval(g, X(0.7), Y(0.25), m * 0.12, m * 0.12, null, INK, lw)
      g.beginPath(); g.moveTo(r.x, Y(0.55)); g.bezierCurveTo(X(0.2), Y(0.3), X(0.35), Y(0.3), X(0.5), Y(0.55)); g.bezierCurveTo(X(0.6), Y(0.45), X(0.8), Y(0.5), X(1), Y(0.55)); g.stroke()
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(X(0.1 + i * 0.05), Y(0.66 + i * 0.07)); g.lineTo(X(0.9 - i * 0.05), Y(0.66 + i * 0.07)); g.stroke() }
      break
    case 'veduta_palermo': {
      g.beginPath(); g.moveTo(r.x, Y(0.75))
      g.lineTo(X(0.15), Y(0.75)); g.lineTo(X(0.15), Y(0.5)); g.lineTo(X(0.2), Y(0.38)); g.lineTo(X(0.25), Y(0.5)); g.lineTo(X(0.25), Y(0.75))
      g.lineTo(X(0.4), Y(0.75)); g.arc(X(0.52), Y(0.75), r.w * 0.12, Math.PI, 0)
      g.lineTo(X(0.8), Y(0.75)); g.lineTo(X(0.8), Y(0.45)); g.lineTo(X(0.85), Y(0.33)); g.lineTo(X(0.9), Y(0.45)); g.lineTo(X(0.9), Y(0.75)); g.lineTo(X(1), Y(0.75))
      g.stroke()
      g.beginPath(); g.moveTo(r.x, Y(0.82)); g.lineTo(r.x + r.w, Y(0.82)); g.stroke()
      break
    }
    case 'natura_morta_agrumi':
      curve(g, [X(0.1), Y(0.12), X(0.4), Y(0.05), X(0.7), Y(0.2), X(0.95), Y(0.1)], lw * 1.3)
      for (const [fx, fy] of [[0.4, 0.38], [0.68, 0.5]]) {
        curve(g, [X(fx), Y(0.12), X(fx), Y(0.2), X(fx), Y(fy - 0.12), X(fx), Y(fy - 0.1)], lw)
        oval(g, X(fx), Y(fy), m * 0.14, m * 0.17, null, INK, lw)
      }
      leafPair(g, X(0.55), Y(0.2), m * 0.2, 1.4, lw); leafPair(g, X(0.25), Y(0.15), m * 0.18, 1.6, lw)
      break
    case 'dama_liberty':
      curve(g, [X(0.5), Y(0.98), X(0.45), Y(0.7), X(0.55), Y(0.4), X(0.5), Y(0.1)], lw * 1.2)
      for (let i = 0; i < 7; i++) {
        const y = Y(0.18 + i * 0.11), s = i % 2 ? 1 : -1
        oval(g, X(0.5) + s * m * 0.1, y, m * 0.1, m * 0.065, null, INK, lw, s * 0.4)
      }
      break
    default:
      leafPair(g, X(0.5), Y(0.7), m * 0.4, -1.57, lw)
  }
  g.restore()
}
