/** Quadri Liberty a soggetto di paesaggio, natura morta e figura: conca d'oro, Palermo, agrumi, dama. */
import { petal, stroke, oval, paint } from './art-draw.js'

const INK = '#3a2a1c'

const fillBg = (g, r, c) => { g.fillStyle = c; g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2) }
const grad = (g, r, y0, y1, c0, c1) => {
  const gr = g.createLinearGradient(0, r.y + r.h * y0, 0, r.y + r.h * y1)
  gr.addColorStop(0, c0); gr.addColorStop(1, c1)
  return gr
}

function orangeTree(g, x, y, R, rnd, lw) {
  stroke(g, [x, y + R * 1.6, x - R * 0.1, y + R * 0.9, x + R * 0.1, y + R * 0.5, x, y], R * 0.16, '#6a4a30', INK, lw * 0.7)
  const blobs = [[0, 0, 1], [-0.62, 0.2, 0.62], [0.64, 0.18, 0.64], [-0.2, -0.5, 0.55], [0.3, -0.45, 0.5]]
  for (const [dx, dy, k] of blobs) oval(g, x + dx * R, y + dy * R, R * k, R * k * 0.92, '#4f7a45', INK, lw)
  for (const [dx, dy, k] of blobs) oval(g, x + dx * R - R * k * 0.2, y + dy * R - R * k * 0.25, R * k * 0.4, R * k * 0.25, '#6e9a55', null, 0)
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R * 1.15
    oval(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, R * 0.12, R * 0.12, '#ec8f2a', INK, lw * 0.7)
  }
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawConca(g, r, lw, rnd) {
  const X = (f) => r.x + r.w * f, Y = (f) => r.y + r.h * f, m = Math.min(r.w, r.h)
  fillBg(g, r, grad(g, r, 0, 0.5, '#e3b24c', '#f8e6ae'))
  oval(g, X(0.74), Y(0.2), m * 0.13, m * 0.13, '#fbefc2', '#d9a43e', lw)
  oval(g, X(0.74), Y(0.2), m * 0.2, m * 0.2, 'rgba(255,240,190,0.35)', null, 0)
  g.beginPath(); g.moveTo(X(0.62), Y(0.5)); g.bezierCurveTo(X(0.78), Y(0.4), X(0.9), Y(0.44), X(1.02), Y(0.36)); g.lineTo(X(1.02), Y(0.5)); g.closePath()
  paint(g, '#cfa97e', INK, lw)
  g.beginPath(); g.moveTo(X(-0.02), Y(0.5)); g.bezierCurveTo(X(0.1), Y(0.42), X(0.2), Y(0.3), X(0.3), Y(0.2))
  g.bezierCurveTo(X(0.36), Y(0.13), X(0.42), Y(0.1), X(0.47), Y(0.14)); g.bezierCurveTo(X(0.55), Y(0.2), X(0.52), Y(0.38), X(0.7), Y(0.5)); g.closePath()
  paint(g, '#b07f5c', INK, lw)
  g.beginPath(); g.moveTo(X(0.47), Y(0.14)); g.bezierCurveTo(X(0.55), Y(0.2), X(0.52), Y(0.38), X(0.7), Y(0.5)); g.lineTo(X(0.5), Y(0.5)); g.bezierCurveTo(X(0.46), Y(0.36), X(0.48), Y(0.22), X(0.47), Y(0.14))
  g.closePath(); paint(g, 'rgba(110,70,60,0.45)', null, 0)
  fillBg(g, { x: r.x, y: Y(0.5), w: r.w, h: r.h * 0.5 }, grad(g, r, 0.5, 0.72, '#5f95a6', '#86b7bd'))
  g.strokeStyle = '#f2e3b0'; g.lineWidth = lw
  for (let i = 0; i < 12; i++) {
    const y = Y(0.52 + rnd() * 0.16), x = X(0.05 + rnd() * 0.85), l = r.w * (0.05 + rnd() * 0.06)
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y - l * 0.18, x + l * 0.7, y + l * 0.18, x + l, y); g.stroke()
  }
  g.fillStyle = '#e8c76a'
  for (let i = 0; i < 5; i++) g.fillRect(X(0.74) - r.w * (0.05 - i * 0.008), Y(0.53 + i * 0.03), r.w * (0.1 - i * 0.016), Math.max(1.5, lw))
  g.beginPath(); g.moveTo(X(-0.02), Y(0.7)); g.bezierCurveTo(X(0.3), Y(0.62), X(0.6), Y(0.72), X(1.02), Y(0.64)); g.lineTo(X(1.02), Y(1.02)); g.lineTo(X(-0.02), Y(1.02)); g.closePath()
  paint(g, '#7d9b62', INK, lw)
  orangeTree(g, X(0.2), Y(0.74), m * 0.24, rnd, lw)
  orangeTree(g, X(0.74), Y(0.8), m * 0.3, rnd, lw)
  orangeTree(g, X(0.47), Y(0.7), m * 0.14, rnd, lw)
}

function dome(g, x, base, rad, col, lw) {
  g.beginPath(); g.moveTo(x - rad, base); g.arc(x, base, rad, Math.PI, 0); g.closePath(); paint(g, col, INK, lw)
  g.beginPath(); g.moveTo(x - rad * 0.22, base - rad * 0.96); g.lineTo(x, base - rad * 1.45); g.lineTo(x + rad * 0.22, base - rad * 0.96); g.closePath(); paint(g, col, INK, lw * 0.8)
}

function palm(g, x, y, h, lw) {
  stroke(g, [x, y, x + h * 0.08, y - h * 0.4, x - h * 0.06, y - h * 0.7, x + h * 0.03, y - h], h * 0.05, '#7a5a38', INK, lw * 0.6)
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 1.05 + i * (Math.PI * 1.1 / 7)
    petal(g, x + h * 0.03, y - h, h * 0.4, h * 0.05, a, '#4f7a45', INK, lw * 0.7, a < -1.57 ? 0.18 : -0.18)
  }
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawPalermo(g, r, lw, rnd) {
  const X = (f) => r.x + r.w * f, Y = (f) => r.y + r.h * f
  fillBg(g, r, grad(g, r, 0, 0.7, '#f1d9a0', '#f9efd2'))
  for (const [y0, col, amp] of [[0.5, '#9dbdd0', 0.16], [0.6, '#6f97b5', 0.12]]) {
    g.beginPath(); g.moveTo(X(-0.02), Y(0.8))
    let x = -0.02, up = true
    g.lineTo(X(x), Y(y0))
    while (x < 1.02) {
      const nx = x + 0.12 + rnd() * 0.16
      g.bezierCurveTo(X(x + (nx - x) * 0.4), Y(y0 - (up ? amp : 0) * (0.6 + rnd() * 0.6)), X(nx - (nx - x) * 0.3), Y(y0 - (up ? amp : 0) * 0.5), X(nx), Y(y0 + (up ? 0.02 : -0.03)))
      x = nx; up = !up
    }
    g.lineTo(X(1.04), Y(0.8)); g.closePath(); paint(g, col, INK, lw)
  }
  const base = Y(0.8)
  const pal = ['#dcb77f', '#c98b5c', '#ead7a4', '#d9a66c']
  let x = -0.03
  while (x < 1.03) {
    const w = 0.07 + rnd() * 0.06, hh = 0.07 + rnd() * 0.13
    g.beginPath(); g.rect(X(x), base - r.h * hh, r.w * w, r.h * hh); paint(g, pal[Math.floor(rnd() * 4)], INK, lw)
    g.fillStyle = '#5a3d2a'
    for (let i = 0; i < 2; i++) g.fillRect(X(x + w * (0.22 + i * 0.4)), base - r.h * (hh * 0.7), r.w * w * 0.16, r.h * hh * 0.22)
    x += w
  }
  for (const [fx, big] of [[0.36, 1], [0.5, 1.3], [0.62, 1]]) {
    g.beginPath(); g.rect(X(fx - 0.04), base - r.h * 0.2, r.w * 0.08, r.h * 0.2); paint(g, '#e8d3a0', INK, lw)
    dome(g, X(fx), base - r.h * 0.2, r.w * 0.04 * big, '#b8503a', lw)
  }
  for (const fx of [0.16, 0.82]) { // campanili
    g.beginPath(); g.rect(X(fx - 0.03), base - r.h * 0.4, r.w * 0.06, r.h * 0.4); paint(g, '#d9a66c', INK, lw)
    g.beginPath(); g.moveTo(X(fx - 0.04), base - r.h * 0.4); g.lineTo(X(fx), base - r.h * 0.54); g.lineTo(X(fx + 0.04), base - r.h * 0.4); g.closePath(); paint(g, '#a24a35', INK, lw)
    g.beginPath(); g.moveTo(X(fx - 0.012), base - r.h * 0.2); g.lineTo(X(fx - 0.012), base - r.h * 0.3); g.arc(X(fx), base - r.h * 0.3, r.w * 0.012, Math.PI, 0); g.lineTo(X(fx + 0.012), base - r.h * 0.2); g.closePath(); paint(g, '#4a3a2a', null, 0)
  }
  g.beginPath(); g.moveTo(X(-0.02), Y(0.82)); g.bezierCurveTo(X(0.3), Y(0.78), X(0.7), Y(0.86), X(1.02), Y(0.8)); g.lineTo(X(1.02), Y(1.02)); g.lineTo(X(-0.02), Y(1.02)); g.closePath()
  paint(g, '#7d9b62', INK, lw)
  palm(g, X(0.1), Y(1.0), r.h * 0.5, lw)
  palm(g, X(0.9), Y(1.0), r.h * 0.42, lw)
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawAgrumi(g, r, lw, rnd) {
  const X = (f) => r.x + r.w * f, Y = (f) => r.y + r.h * f, m = Math.min(r.w, r.h)
  fillBg(g, r, '#e7dbb8')
  g.fillStyle = '#9bb08a'; g.fillRect(r.x, Y(0.08), r.w, Y(0.05) - Y(0.0))
  g.beginPath(); g.rect(r.x, Y(0.64), r.w, r.h * 0.4); paint(g, '#8a3a40', INK, lw)
  g.strokeStyle = '#c99a4a'; g.lineWidth = lw; g.beginPath(); g.moveTo(r.x, Y(0.68)); g.lineTo(r.x + r.w, Y(0.68)); g.stroke()
  const jh = Math.min(r.h * 0.52, r.w * 0.5), jw = jh * 0.62, jx = X(0.27), jb = Y(0.8)
  g.beginPath(); g.moveTo(jx - jw * 0.28, jb - jh)
  g.bezierCurveTo(jx - jw * 0.25, jb - jh * 0.8, jx - jw * 0.62, jb - jh * 0.6, jx - jw * 0.5, jb - jh * 0.25)
  g.bezierCurveTo(jx - jw * 0.48, jb - jh * 0.05, jx - jw * 0.3, jb, jx, jb)
  g.bezierCurveTo(jx + jw * 0.3, jb, jx + jw * 0.48, jb - jh * 0.05, jx + jw * 0.5, jb - jh * 0.25)
  g.bezierCurveTo(jx + jw * 0.62, jb - jh * 0.6, jx + jw * 0.25, jb - jh * 0.8, jx + jw * 0.28, jb - jh)
  g.bezierCurveTo(jx + jw * 0.12, jb - jh * 1.04, jx - jw * 0.12, jb - jh * 1.04, jx - jw * 0.28, jb - jh); g.closePath()
  paint(g, '#2f5f9e', INK, lw * 1.2)
  stroke(g, [jx + jw * 0.4, jb - jh * 0.9, jx + jw * 1.0, jb - jh * 0.95, jx + jw * 0.95, jb - jh * 0.35, jx + jw * 0.48, jb - jh * 0.4], jw * 0.1, '#2f5f9e', INK, lw * 0.8)
  g.fillStyle = '#f1e7c8'; g.fillRect(jx - jw * 0.5, jb - jh * 0.5, jw, jh * 0.08)
  oval(g, jx - jw * 0.14, jb - jh * 0.55, jw * 0.08, jh * 0.2, 'rgba(255,255,255,0.28)', null, 0, 0.2)
  const fr = Math.min(r.w * 0.085, r.h * 0.12)
  const fruit = (fx, fy, k, lemon) => {
    if (lemon) {
      oval(g, X(fx), Y(fy), fr * 1.25 * k, fr * 0.9 * k, '#f0cf3a', INK, lw, -0.2)
      oval(g, X(fx) + fr * 1.2 * k, Y(fy) - fr * 0.2 * k, fr * 0.2 * k, fr * 0.16 * k, '#f0cf3a', INK, lw * 0.8)
    } else oval(g, X(fx), Y(fy), fr * k, fr * k, '#ec8a2c', INK, lw)
    oval(g, X(fx) - fr * 0.3 * k, Y(fy) - fr * 0.3 * k, fr * 0.25 * k, fr * 0.14 * k, 'rgba(255,255,255,0.4)', null, 0, -0.6)
  }
  petal(g, X(0.68), Y(0.7), r.w * 0.16, r.w * 0.04, -0.4, '#6f9a52', INK, lw)
  petal(g, X(0.72), Y(0.72), r.w * 0.14, r.w * 0.035, -1.3, '#7fa95c', INK, lw)
  fruit(0.62, 0.77, 1, false); fruit(0.8, 0.74, 1, true); fruit(0.72, 0.87, 1.05, false); fruit(0.54, 0.9, 0.9, true); fruit(0.88, 0.89, 0.9, false)
  void m; void rnd
}

function smooth(g, pts) {
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
  g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
}

function spiral(g, x, y, r0, dir, col, lw) {
  g.beginPath()
  for (let a = 0; a < 9; a += 0.2) {
    const rr = r0 * (1 - a / 10), px = x + Math.cos(a * dir) * rr, py = y + Math.sin(a * dir) * rr
    if (a) g.lineTo(px, py); else g.moveTo(px, py)
  }
  g.strokeStyle = INK; g.lineWidth = lw * 3.2; g.lineCap = 'round'; g.stroke()
  g.strokeStyle = col; g.lineWidth = lw * 1.6; g.stroke()
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawDama(g, r, lw, rnd) {
  fillBg(g, r, '#e5cf92')
  const H = Math.min(r.h * 0.5, r.w * 0.62)
  const hx = r.x + r.w * 0.56, hy = r.y + r.h * 0.38
  const P = (a, b) => [hx + a * H, hy + b * H]
  oval(g, hx - H * 0.05, hy, H * 0.78, H * 0.78, '#f2e4b8', '#c79a42', lw)
  const hair = '#7a2a3c'
  g.beginPath(); g.moveTo(...P(0.16, -0.42))
  g.bezierCurveTo(...P(-0.3, -0.7), ...P(-0.58, -0.2), ...P(-0.46, 0.25))
  g.bezierCurveTo(...P(-0.42, 0.8), ...P(-0.95, 0.7), ...P(-0.98, 1.1))
  g.bezierCurveTo(...P(-0.6, 0.95), ...P(-0.25, 0.8), ...P(-0.2, 0.3))
  g.bezierCurveTo(...P(-0.1, 0.05), ...P(0.05, -0.1), ...P(0.16, -0.42)); g.closePath(); paint(g, hair, INK, lw)
  spiral(g, ...P(-0.7, 0.86), H * 0.2, 1, '#a24a58', lw)
  spiral(g, ...P(-0.5, -0.38), H * 0.16, -1, '#a24a58', lw)
  spiral(g, ...P(-0.95, 0.35), H * 0.15, 1, '#a24a58', lw)
  const face = [[0.1, -0.46], [0.3, -0.3], [0.31, -0.15], [0.27, -0.1], [0.41, 0.02], [0.3, 0.07], [0.33, 0.12], [0.3, 0.15], [0.32, 0.2], [0.27, 0.25], [0.3, 0.32], [0.14, 0.4], [0.12, 0.7]].map(([a, b]) => P(a, b))
  g.beginPath(); smooth(g, face); g.lineTo(...P(-0.2, 0.7)); g.lineTo(...P(-0.2, 0.2)); g.lineTo(...P(-0.15, -0.4)); g.closePath(); paint(g, '#f1d3b0', INK, lw)
  g.beginPath(); g.moveTo(...P(0.12, -0.47)); g.bezierCurveTo(...P(0.3, -0.5), ...P(0.3, -0.34), ...P(0.26, -0.27)); g.bezierCurveTo(...P(0.2, -0.34), ...P(0.1, -0.38), ...P(0.12, -0.47)); g.closePath(); paint(g, hair, INK, lw * 0.8)
  g.strokeStyle = INK; g.lineWidth = lw
  g.beginPath(); g.moveTo(...P(0.14, -0.1)); g.quadraticCurveTo(...P(0.2, -0.14), ...P(0.27, -0.09)); g.stroke()
  g.beginPath(); g.moveTo(...P(0.11, -0.2)); g.quadraticCurveTo(...P(0.2, -0.24), ...P(0.29, -0.2)); g.stroke()
  oval(g, ...P(0.31, 0.155), H * 0.03, H * 0.02, '#b0404a', INK, lw * 0.6)
  const dress = [[-0.2, 0.62], [0.12, 0.62], [0.3, 0.7], [0.6, 0.85], [0.95, 1.5]].map(([a, b]) => P(a, b))
  g.beginPath(); g.moveTo(...P(-0.7, 1.7)); g.lineTo(...P(-0.55, 0.9)); g.lineTo(...P(-0.2, 0.62)); smooth(g, dress); g.lineTo(...P(0.95, 2.0)); g.closePath(); paint(g, '#5c8a7a', INK, lw)
  g.beginPath(); g.moveTo(...P(-0.2, 0.62)); g.bezierCurveTo(...P(-0.05, 0.9), ...P(0.25, 0.9), ...P(0.36, 0.74)); paint(g, null, '#d9a441', lw * 2.2)
  for (let i = 0; i < 6; i++) {
    const [fx, fy] = P(-0.1 + i * 0.1, 1.15 + (i % 2) * 0.1)
    oval(g, fx, fy, H * 0.04, H * 0.04, '#d9a441', INK, lw * 0.5)
  }
  for (const [a, b, k, col] of [[-0.3, -0.42, 1, '#c0523f'], [-0.08, -0.52, 0.8, '#b79ad2'], [-0.56, -0.05, 0.9, '#c0523f']]) {
    const [fx, fy] = P(a, b)
    for (let i = 0; i < 6; i++) petal(g, fx, fy, H * 0.14 * k, H * 0.05 * k, (i / 6) * 6.28 + rnd(), col, INK, lw * 0.7)
    oval(g, fx, fy, H * 0.03 * k, H * 0.03 * k, '#e0b13a', INK, lw * 0.5)
  }
  petal(g, ...P(-0.2, -0.45), H * 0.2, H * 0.05, -2.6, '#7d9b62', INK, lw * 0.8)
}
