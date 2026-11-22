/** Quadri Liberty a soggetto floreale: iris, glicine, ninfee, pavone, fregio di glicini. */
import { petal, stroke, oval, paint } from './art-draw.js'

const INK = '#3a2a1c'

const bezPt = (p, t) => {
  const u = 1 - t
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  return [k[0] * p[0] + k[1] * p[2] + k[2] * p[4] + k[3] * p[6], k[0] * p[1] + k[1] * p[3] + k[2] * p[5] + k[3] * p[7]]
}

const fillBg = (g, r, c) => { g.fillStyle = c; g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2) }

/** Due volute a colpo di frusta negli angoli: decorazione del fondo. */
function whip(g, r, lw, col) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'
  for (const [sx, sy] of [[0, 0], [1, 1]]) {
    const X = (f) => r.x + (sx ? 1 - f : f) * r.w, Y = (f) => r.y + (sy ? 1 - f : f) * r.h
    g.beginPath(); g.moveTo(X(0), Y(0.30))
    g.bezierCurveTo(X(0.08), Y(0.18), X(0.28), Y(0.20), X(0.22), Y(0.08))
    g.bezierCurveTo(X(0.20), Y(0.03), X(0.12), Y(0.03), X(0.13), Y(0.08)); g.stroke()
  }
}

function irisFlower(g, cx, cy, s, lw) {
  for (const a of [-1.15, 1.15, 0]) {
    petal(g, cx, cy, s * 1.0, s * 0.36, Math.PI / 2 + a * 0.95, '#6a3f9a', INK, lw, a * -0.18)
  }
  for (const a of [-0.42, 0.42, 0]) {
    petal(g, cx, cy, s * (a ? 0.95 : 1.1), s * 0.3, -Math.PI / 2 + a, '#9b78c4', INK, lw, a * 0.2)
  }
  oval(g, cx, cy + s * 0.22, s * 0.1, s * 0.22, '#e0b13a', INK, lw * 0.6)
}

/** @param {CanvasRenderingContext2D} g @param {object} r area interna @param {number} lw spessore contorno */
export function drawIris(g, r, lw) {
  fillBg(g, r, '#efe3c4')
  oval(g, r.x + r.w / 2, r.y + r.h * 0.4, r.w * 0.42, r.h * 0.34, '#f4d9a0', null, 0)
  whip(g, r, lw, '#8c9a6a')
  const n = r.w / r.h > 0.9 ? 3 : 2
  const s = Math.min(r.w / (n * 1.9), r.h * 0.22)
  const heads = n === 3 ? [[0.2, 0.36], [0.5, 0.22], [0.8, 0.4]] : [[0.34, 0.3], [0.68, 0.2]]
  const base = n === 3 ? [0.38, 0.5, 0.62] : [0.4, 0.58]
  const bx = (i) => r.x + r.w * base[i], by = r.y + r.h * 1.02
  heads.forEach((h, i) => { // foglie a spada
    for (const k of [-1, 1]) {
      const a = -Math.PI / 2 + k * (0.22 + i * 0.05)
      petal(g, bx(i), by, r.h * (0.55 - i * 0.04), s * 0.2, a, '#8aa57a', INK, lw, k * 0.12)
    }
  })
  heads.forEach((h, i) => { // steli
    const cx = r.x + r.w * h[0], cy = r.y + r.h * h[1] + s * 0.4
    stroke(g, [bx(i), by, bx(i) - s * 0.5, r.y + r.h * 0.8, cx + s * 0.6, r.y + r.h * 0.55, cx, cy], lw * 1.6, '#6f8f5a', INK, lw * 0.7)
  })
  heads.forEach((h, i) => irisFlower(g, r.x + r.w * h[0], r.y + r.h * h[1], s, lw))
}

/** Grappolo di glicine che pende da (x, y). */
function raceme(g, x, y, len, wd, rnd, lw, sway) {
  const cols = ['#b79ad2', '#a58bc8', '#c9b3de', '#9478bb']
  const n = Math.max(4, Math.round(len / (wd * 0.42)))
  g.strokeStyle = '#6c8a52'; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y - wd * 0.2); g.lineTo(x + sway * 0.4, y + len * 0.2); g.stroke()
  for (let i = 0; i < n; i++) {
    const t = i / n
    const rr = Math.max(wd * 0.1, wd * 0.5 * (1 - t * 0.82))
    const px = x + Math.sin(t * 2.4) * sway + (rnd() - 0.5) * wd * 0.6 * (1 - t)
    const py = y + t * len
    oval(g, px, py, rr, rr * 1.1, cols[Math.floor(rnd() * cols.length)], INK, lw * 0.55)
  }
}

function leafAt(g, x, y, len, ang, lw) { petal(g, x, y, len, len * 0.28, ang, '#7d9b62', INK, lw, 0.1) }

function branch(g, r, lw, rnd, count, minL, maxL, bg) {
  fillBg(g, r, bg)
  const p = [r.x - r.w * 0.05, r.y + r.h * 0.12, r.x + r.w * 0.3, r.y - r.h * 0.04, r.x + r.w * 0.6, r.y + r.h * 0.26, r.x + r.w * 1.05, r.y + r.h * 0.1]
  const wd = Math.min(r.w / (count * 0.95), r.h * 0.2)
  stroke(g, p, lw * 3.2, '#6a4a30', INK, lw * 0.8)
  for (let i = 0; i < count; i++) {
    const t = (i + 0.6) / (count + 0.2)
    const [bx, by] = bezPt(p, t)
    const len = r.h * (minL + (maxL - minL) * rnd())
    leafAt(g, bx, by, r.h * 0.17, (i % 2 ? -0.5 : -2.6) + rnd() * 0.3, lw)
    raceme(g, bx, by, len, wd, rnd, lw, wd * (i % 2 ? 0.25 : -0.25))
  }
  leafAt(g, bezPt(p, 0.5)[0], bezPt(p, 0.5)[1], r.h * 0.15, 2.4, lw)
  g.strokeStyle = '#6a4a30'; g.lineWidth = lw
  g.beginPath(); g.moveTo(p[6] - r.w * 0.05, p[7]); g.bezierCurveTo(p[6], p[7] + r.h * 0.1, p[6] - r.w * 0.12, p[7] + r.h * 0.16, p[6] - r.w * 0.08, p[7] + r.h * 0.1); g.stroke()
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawGlicine(g, r, lw, rnd) {
  branch(g, r, lw, rnd, r.w / r.h > 0.7 ? 4 : 3, 0.45, 0.7, '#e9e1c6')
  whip(g, { x: r.x, y: r.y + r.h * 0.45, w: r.w, h: r.h * 0.55 }, lw, '#93a58a')
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawGlicineWide(g, r, lw, rnd) {
  const count = Math.max(5, Math.round(r.w / (r.h * 0.26)))
  branch(g, r, lw, rnd, count, 0.4, 0.8, '#ead9a8')
  g.fillStyle = 'rgba(125,155,98,0.35)'; g.fillRect(r.x, r.y + r.h * 0.92, r.w, r.h * 0.08)
}

function lilyFlower(g, x, y, R, tint, lw) {
  for (const [n, k, col] of [[9, 1, '#f7f0e4'], [7, 0.7, tint], [5, 0.42, '#fbf6ec']]) {
    for (let i = 0; i < n; i++) petal(g, x, y, R * k, R * k * 0.2, (i / n) * Math.PI * 2 + k, col, INK, lw * 0.8)
  }
  oval(g, x, y, R * 0.12, R * 0.12, '#e6b73a', INK, lw * 0.6)
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno @param {Function} rnd generatore */
export function drawNinfee(g, r, lw, rnd) {
  fillBg(g, r, '#6f9d86')
  g.strokeStyle = '#5a8b73'; g.lineWidth = lw
  for (let i = 0; i < 9; i++) {
    const y = r.y + r.h * (0.06 + i * 0.11)
    g.beginPath(); g.moveTo(r.x, y)
    g.bezierCurveTo(r.x + r.w * 0.3, y - r.h * 0.04, r.x + r.w * 0.6, y + r.h * 0.05, r.x + r.w, y - r.h * 0.01); g.stroke()
  }
  const m = Math.min(r.w, r.h)
  const leaves = [[0.24, 0.2, 0.23], [0.78, 0.24, 0.19], [0.26, 0.74, 0.21], [0.76, 0.8, 0.22], [0.55, 0.53, 0.15], [0.9, 0.55, 0.13]]
  for (const [fx, fy, fr] of leaves) {
    const x = r.x + r.w * fx, y = r.y + r.h * fy, R = m * fr, a = rnd() * 6.28
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, a + 0.35, a + 6.28 - 0.0); g.closePath()
    paint(g, '#3f7a4f', INK, lw)
    g.strokeStyle = '#2d5a38'; g.lineWidth = lw * 0.5
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + 0.35 + i * 0.95) * R * 0.9, y + Math.sin(a + 0.35 + i * 0.95) * R * 0.9); g.stroke() }
  }
  lilyFlower(g, r.x + r.w * 0.5, r.y + r.h * 0.36, m * 0.25, '#f2b7c0', lw)
  lilyFlower(g, r.x + r.w * 0.3, r.y + r.h * 0.57, m * 0.17, '#eea0b2', lw)
  lilyFlower(g, r.x + r.w * 0.7, r.y + r.h * 0.66, m * 0.2, '#f6cdd0', lw)
}

function ocellus(g, x, y, s, lw) {
  oval(g, x, y, s * 0.5, s * 0.72, '#c9a13a', INK, lw * 0.8)
  oval(g, x, y, s * 0.36, s * 0.55, '#2c6e91', null, 0)
  oval(g, x, y, s * 0.22, s * 0.38, '#1f8a82', null, 0)
  oval(g, x, y, s * 0.1, s * 0.2, '#14324a', null, 0)
}

/** @param {CanvasRenderingContext2D} g @param {object} r area @param {number} lw contorno */
export function drawPavone(g, r, lw) {
  fillBg(g, r, '#d3e0cf')
  const R = Math.min(r.w * 0.56, r.h * 0.5)
  const fx = r.x + r.w * 0.56, fy = r.y + r.h * 0.66
  const N = 13
  const ends = []
  for (let k = 0; k < N; k++) {
    const a = -Math.PI + 0.12 + (k / (N - 1)) * (Math.PI - 0.24)
    const L = R * (0.92 + (k % 2) * 0.08)
    ends.push([fx + Math.cos(a) * L, fy + Math.sin(a) * L, a])
    petal(g, fx, fy, L, R * 0.13, a, k % 2 ? '#6f9a62' : '#8cae68', INK, lw * 0.7)
  }
  for (const [ex, ey, a] of ends) ocellus(g, ex - Math.cos(a) * R * 0.1, ey - Math.sin(a) * R * 0.1, R * 0.26, lw)
  for (let k = 0; k < 4; k++) { // penne del traino verso il basso
    const a = 0.35 + k * 0.13
    petal(g, fx + R * 0.1, fy, R * 0.85, R * 0.07, a, '#6f9a62', INK, lw * 0.7, 0.05)
  }
  oval(g, fx - R * 0.06, fy, R * 0.46, R * 0.2, '#1f5f8a', INK, lw, -0.1)
  oval(g, fx - R * 0.05, fy - R * 0.02, R * 0.3, R * 0.1, '#2f86a8', null, 0, -0.1)
  const hx = fx - R * 0.74, hy = fy - R * 0.42
  stroke(g, [fx - R * 0.36, fy - R * 0.06, fx - R * 0.62, fy - R * 0.1, fx - R * 0.5, hy + R * 0.3, hx, hy], R * 0.13, '#2a74a6', INK, lw * 0.8)
  oval(g, hx, hy, R * 0.1, R * 0.08, '#1d5d88', INK, lw * 0.8)
  g.beginPath(); g.moveTo(hx - R * 0.08, hy); g.lineTo(hx - R * 0.2, hy + R * 0.03); g.lineTo(hx - R * 0.07, hy + R * 0.05); g.closePath(); paint(g, '#d9a441', INK, lw * 0.6)
  g.strokeStyle = INK; g.lineWidth = lw * 0.7
  for (let k = -1; k <= 1; k++) { // cresta
    g.beginPath(); g.moveTo(hx, hy - R * 0.07); g.lineTo(hx + k * R * 0.06 - R * 0.02, hy - R * 0.22); g.stroke()
    oval(g, hx + k * R * 0.06 - R * 0.02, hy - R * 0.23, R * 0.025, R * 0.025, '#2c6e91', INK, lw * 0.5)
  }
  oval(g, hx - R * 0.03, hy - R * 0.01, R * 0.012, R * 0.012, '#fff', INK, 1)
  g.strokeStyle = '#7a5a30'; g.lineWidth = lw
  for (const dx of [-0.12, 0.08]) { g.beginPath(); g.moveTo(fx + R * dx, fy + R * 0.18); g.lineTo(fx + R * dx - R * 0.03, fy + R * 0.42); g.stroke() }
}
