/**
 * Atlante dei serramenti dei palazzi vicini: finestre, persiane, avvolgibili, vetrine, saracinesche, portoni.
 * Griglia 8 × 4 (celle 128 × 256 px su 1024). Tre disegni con lo stesso tracciato: colore, luce notturna, rugosità.
 */
import { canvas } from './city-tex.js'

const COLS = 8
const ROWS = 4
/** Celle dell'atlante: [colonna, riga, larghezza in celle]. */
const CELLS = {
  win0: [0, 0], win1: [1, 0], win2: [2, 0], win3: [3, 0], win4: [4, 0], win5: [5, 0], louver: [6, 0], roller: [7, 0],
  shop0: [0, 1, 2], shop1: [2, 1, 2], sarac: [4, 1, 2], portone: [6, 1, 2],
  sky: [0, 2], solar: [1, 2], awning: [2, 2], door: [3, 2],
}
const EDGE = 0.002 // margine dentro la cella: le mip non mescolano le celle vicine

/**
 * Rettangolo UV di una cella: [u0, v0, u1, v1].
 * @param {string} name chiave di CELLS
 * @returns {number[]}
 */
export function cell(name) {
  const [c, r, w = 1] = CELLS[name]
  return [c / COLS + EDGE, 1 - (r + 1) / ROWS + EDGE, (c + w) / COLS - EDGE, 1 - r / ROWS - EDGE]
}

// Finestre: telaio, tende, tendina interna, sopraluce e riquadri (d'epoca), anta unica (alluminio)
const WINS = [
  { frame: '#f1ede4' },
  { frame: '#f1ede4', curtain: true },
  { frame: '#8a5a34' },
  { frame: '#f1ede4', blind: 0.5 },
  { frame: '#ebe6da', transom: true },
  { frame: '#aeb3b8', single: true },
]

/** Riempie con il colore del modo `m` (0 colore, 1 luce, 2 rugosità); `null` salta. */
function fill(g, m, cols, x, y, w, h) {
  if (cols[m] == null) return
  g.fillStyle = cols[m]
  g.fillRect(x, y, w, h)
}

function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  stops.forEach(([t, c]) => gr.addColorStop(t, c))
  return gr
}

/** Righe orizzontali alternate (lamelle di persiana, doghe di avvolgibile, lamiera ondulata). */
function slats(g, x, y, w, h, step, a, b) {
  for (let yy = y; yy < y + h; yy += step) {
    g.fillStyle = a
    g.fillRect(x, yy, w, Math.min(step, y + h - yy))
    g.fillStyle = b
    g.fillRect(x, yy + step * 0.62, w, Math.min(step * 0.38, Math.max(0, y + h - yy - step * 0.62)))
  }
}

function drawWin(g, m, x, y, w, h, o) {
  const f = 9
  fill(g, m, [o.frame, '#000', '#9c9c9c'], x, y, w, h)
  const n = o.single ? 1 : 2
  const lw = (w - f * (n + 1)) / n
  const gy = y + f
  const gh = h - 2 * f
  for (let k = 0; k < n; k++) {
    const gx = x + f + k * (lw + f)
    g.fillStyle = m === 0 ? vgrad(g, gy, gy + gh, [[0, '#62758a'], [0.42, '#1d252e'], [1, '#12171c']])
      : m === 1 ? vgrad(g, gy, gy + gh, [[0, '#fff0cf'], [1, '#ffcf86']]) : '#1c1c1c'
    g.fillRect(gx, gy, lw, gh)
    if (o.curtain) { // tenda raccolta verso il lato esterno
      const out = k === 0 ? gx : gx + lw
      const dir = k === 0 ? 1 : -1
      g.fillStyle = ['rgba(238,233,222,0.86)', 'rgba(255,248,230,1)', '#8c8c8c'][m]
      g.beginPath()
      g.moveTo(out, gy)
      g.lineTo(out + dir * lw * 0.85, gy)
      g.quadraticCurveTo(out + dir * lw * 0.5, gy + gh * 0.55, out + dir * lw * 0.22, gy + gh)
      g.lineTo(out, gy + gh)
      g.fill()
    }
    if (o.blind) {
      fill(g, m, ['#d8d0bd', '#a8834c', '#a8a8a8'], gx, gy, lw, gh * o.blind)
      if (m === 0) slats(g, gx, gy, lw, gh * o.blind, 7, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.1)')
    }
    if (o.transom) {
      fill(g, m, [o.frame, '#000', '#9c9c9c'], gx, gy + gh * 0.26, lw, 7)
      for (const t of [0.52, 0.76]) fill(g, m, [o.frame, '#000', '#9c9c9c'], gx, gy + gh * t, lw, 3)
    }
  }
  if (m === 0) { // ombra dell'architrave sul serramento
    g.fillStyle = vgrad(g, y, y + 44, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']])
    g.fillRect(x, y, w, 44)
  }
}

function drawLouver(g, m, x, y, w, h) {
  fill(g, m, ['#e9e9e9', '#000', '#b4b4b4'], x, y, w, h)
  if (m !== 0) return
  for (const [yy, hh] of [[y + 9, h * 0.5 - 14], [y + h * 0.5 + 5, h * 0.5 - 14]]) slats(g, x + 10, yy, w - 20, hh, 6, '#d6d6d6', '#8e8e8e')
  g.strokeStyle = 'rgba(0,0,0,0.3)'
  g.lineWidth = 2
  g.strokeRect(x + 1, y + 1, w - 2, h - 2)
}

function drawRoller(g, m, x, y, w, h) {
  fill(g, m, ['#dcdcdc', '#000', '#a6a6a6'], x, y, w, h)
  if (m !== 0) return
  slats(g, x, y, w, h - 8, 7, '#dedede', '#a2a2a2')
  fill(g, m, ['#b5b5b5'], x, y + h - 8, w, 8)
}

function drawShop(g, m, x, y, w, h, alu) {
  const fr = alu ? '#b3b7bb' : '#3a3836'
  fill(g, m, [fr, '#000', '#7a7a7a'], x, y, w, h)
  const top = y + 34
  const bot = y + h - 22
  const panes = alu ? [[8, 150], [166, 82]] : [[8, 82], [98, 150]] // la porta è l'anta stretta
  for (const [px, pw] of panes) {
    g.fillStyle = m === 0 ? vgrad(g, top, bot, [[0, '#55626e'], [0.3, '#28313a'], [1, '#171c21']])
      : m === 1 ? (alu ? '#ffe7b8' : '#5d4a2c') : '#161616'
    g.fillRect(x + px, top, pw, bot - top)
    if (m === 0) { // riflesso della strada e sagome dell'interno
      g.fillStyle = 'rgba(205,215,225,0.13)'
      g.fillRect(x + px, top + (bot - top) * 0.34, pw, (bot - top) * 0.2)
      g.fillStyle = 'rgba(230,215,190,0.1)'
      for (let k = 0; k < 3; k++) g.fillRect(x + px + 10 + k * (pw / 3.2), top + (bot - top) * 0.62, pw / 5, (bot - top) * 0.3)
    }
  }
  fill(g, m, [alu ? '#70757a' : '#252423', '#000', '#6c6c6c'], x + 8, y + 8, w - 16, 20) // cassonetto della serranda
  fill(g, m, ['#8c877d', '#000', '#9a9a9a'], x, y + h - 14, w, 14) // zoccolo
}

function drawSarac(g, m, x, y, w, h) {
  fill(g, m, ['#8d9093', '#000', '#7e7e7e'], x, y, w, h)
  if (m !== 0) return
  slats(g, x + 8, y + 22, w - 16, h - 36, 8, '#a0a3a6', '#77797c')
  g.fillStyle = vgrad(g, y + h * 0.6, y + h, [[0, 'rgba(40,36,30,0)'], [1, 'rgba(40,36,30,0.35)']])
  g.fillRect(x + 8, y + h * 0.6, w - 16, h * 0.4)
  fill(g, m, ['#5f6265'], x + 8, y + 6, w - 16, 16)
  fill(g, m, ['#6d7073'], x + 8, y + h - 14, w - 16, 8)
}

function drawPortone(g, m, x, y, w, h) {
  fill(g, m, ['#4b3221', '#000', '#6e6e6e'], x, y, w, h)
  const cx = x + w / 2
  // sopraluce con raggiera in ferro
  g.fillStyle = ['#1b2229', '#3c3220', '#1c1c1c'][m]
  g.fillRect(x + 10, y + 10, w - 20, 56)
  if (m !== 1) {
    g.strokeStyle = m === 0 ? '#2e2a26' : '#888'
    g.lineWidth = 3
    for (let a = 0; a <= 8; a++) {
      g.beginPath()
      g.moveTo(cx, y + 66)
      g.lineTo(cx + Math.cos((Math.PI * a) / 8) * (w / 2 - 10), y + 66 - Math.sin((Math.PI * a) / 8) * 56)
      g.stroke()
    }
  }
  if (m !== 0) return
  for (const lx of [x + 12, cx + 4]) { // due battenti con specchiature
    for (const [py, ph] of [[y + 80, 70], [y + 160, 80]]) {
      g.fillStyle = '#5c3f2a'
      g.fillRect(lx, py, w / 2 - 16, ph)
      g.strokeStyle = 'rgba(20,12,6,0.6)'
      g.lineWidth = 3
      g.strokeRect(lx + 8, py + 8, w / 2 - 32, ph - 16)
    }
  }
  fill(g, m, ['#2a1c12'], cx - 2, y + 72, 4, h - 72)
}

function drawSky(g, m, x, y, w, h) { // lucernario
  fill(g, m, ['#cdd1d4', '#000', '#8a8a8a'], x, y, w, h)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    g.fillStyle = m === 0 ? vgrad(g, y, y + h, [[0, '#a9c2d8'], [1, '#d4e1ec']]) : m === 1 ? '#40382a' : '#141414'
    g.fillRect(x + 7 + i * (w / 2 - 2), y + 7 + j * (h / 3 - 2), w / 2 - 12, h / 3 - 12)
  }
}

function drawSolar(g, m, x, y, w, h) {
  fill(g, m, ['#1a2742', '#000', '#2a2a2a'], x, y, w, h)
  if (m !== 0) return
  g.strokeStyle = '#6a7b9c'
  g.lineWidth = 1.5
  for (let i = 0; i <= 4; i++) g.strokeRect(x + (w * i) / 4, y, 0.1, h)
  for (let j = 0; j <= 8; j++) g.strokeRect(x, y + (h * j) / 8, w, 0.1)
}

function drawAwning(g, m, x, y, w, h) { // tenda a righe in grigio, da tingere
  fill(g, m, ['#f4f4f4', '#000', '#d0d0d0'], x, y, w, h)
  if (m !== 0) return
  for (let k = 0; k < 8; k += 2) fill(g, m, ['#c2c2c2'], x + (w * k) / 8, y, w / 8, h)
  g.fillStyle = vgrad(g, y + h - 30, y + h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']])
  g.fillRect(x, y + h - 30, w, 30)
}

function drawDoor(g, m, x, y, w, h) { // porta di servizio in lamiera
  fill(g, m, ['#82888e', '#000', '#7c7c7c'], x, y, w, h)
  if (m !== 0) return
  g.strokeStyle = 'rgba(0,0,0,0.3)'
  g.lineWidth = 3
  g.strokeRect(x + 12, y + 14, w - 24, h * 0.42)
  g.strokeRect(x + 12, y + h * 0.52, w - 24, h * 0.42)
}

const DRAW = {
  louver: drawLouver, roller: drawRoller, sarac: drawSarac, portone: drawPortone, sky: drawSky, solar: drawSolar, awning: drawAwning, door: drawDoor,
  shop0: (g, m, x, y, w, h) => drawShop(g, m, x, y, w, h, false),
  shop1: (g, m, x, y, w, h) => drawShop(g, m, x, y, w, h, true),
}

/**
 * Disegna l'atlante nei tre modi.
 * @returns {{ map: HTMLCanvasElement, lit: HTMLCanvasElement, rough: HTMLCanvasElement }}
 */
export function atlas() {
  const make = (size, m) => {
    const [cv, g] = canvas(size)
    g.scale(size / 1024, size / 1024)
    g.fillStyle = ['#8a8a8a', '#000', '#b0b0b0'][m]
    g.fillRect(0, 0, 1024, 1024)
    for (const [name, [c, r, w = 1]] of Object.entries(CELLS)) {
      const [x, y, cw, ch] = [c * 128, r * 256, w * 128, 256]
      if (name.startsWith('win')) drawWin(g, m, x, y, cw, ch, WINS[+name[3]])
      else DRAW[name](g, m, x, y, cw, ch)
    }
    return cv
  }
  return { map: make(1024, 0), lit: make(512, 1), rough: make(256, 2) }
}
