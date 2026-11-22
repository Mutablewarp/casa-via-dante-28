/** Vetrata Liberty a piombi e dorsi dei libri. */
import { makeCanvas, rngFor, addNoise, shade } from './draw.js'

const LEAD = 'rgb(26,23,21)'

/** Riempie una forma di vetro colorato semitrasparente con piombo opaco. */
function pane(g, path, color, lw) {
  g.save()
  g.globalCompositeOperation = 'destination-out'
  path()
  g.fillStyle = '#000'
  g.fill()
  g.restore()
  path()
  g.fillStyle = color
  g.fill()
  g.strokeStyle = LEAD
  g.lineWidth = lw
  g.lineJoin = 'round'
  g.stroke()
}

/** Anta Liberty: iris alto su fondo ambra e celeste. */
function libertyGlass(g, W, H) {
  const lw = W * 0.026
  const bands = [[0, 'rgba(236,176,72,0.62)'], [0.2, 'rgba(160,206,228,0.6)'], [0.42, 'rgba(240,190,92,0.62)'], [0.64, 'rgba(160,206,228,0.6)'], [0.84, 'rgba(236,176,72,0.62)']]
  const edge = (f) => (x) => H * f + Math.sin((x / W) * Math.PI * 2) * H * 0.025
  bands.forEach(([f, col], i) => {
    const top = i === 0 ? () => 0 : edge(f)
    const bot = i < bands.length - 1 ? edge(bands[i + 1][0]) : () => H
    pane(g, () => {
      g.beginPath()
      g.moveTo(0, top(0))
      for (let x = 0; x <= W; x += 8) g.lineTo(x, top(x))
      for (let x = W; x >= 0; x -= 8) g.lineTo(x, bot(x))
      g.closePath()
    }, col, lw)
  })
  const sx = W * 0.5
  const stem = (y) => sx + Math.sin(((H * 0.95 - y) / H) * 3.2) * W * 0.12
  // foglie lunghe che salgono dalla base
  for (const s of [-1, 1]) {
    pane(g, () => {
      g.beginPath()
      g.moveTo(stem(H * 0.95), H * 0.95)
      g.quadraticCurveTo(sx + s * W * 0.5, H * 0.72, sx + s * W * 0.34, H * 0.42)
      g.quadraticCurveTo(sx + s * W * 0.14, H * 0.7, stem(H * 0.95), H * 0.95)
    }, 'rgba(70,140,70,0.68)', lw)
  }
  // stelo curvo
  g.beginPath()
  g.moveTo(stem(H * 0.95), H * 0.95)
  for (let y = H * 0.95; y >= H * 0.3; y -= 6) g.lineTo(stem(y), y)
  g.strokeStyle = LEAD
  g.lineWidth = lw * 1.6
  g.stroke()
  // fiore: tre petali alti e tre cadenti
  const fx = stem(H * 0.3)
  const fy = H * 0.3
  const petal = (a, len, wid, col) => pane(g, () => {
    g.save()
    g.translate(fx, fy)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(len * 0.45, -wid, len, 0)
    g.quadraticCurveTo(len * 0.45, wid, 0, 0)
    g.restore()
  }, col, lw)
  for (const a of [-Math.PI / 2, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75]) petal(a, H * 0.15, W * 0.2, 'rgba(120,96,188,0.68)')
  for (const a of [Math.PI / 2 + 0.6, Math.PI / 2 - 0.6, Math.PI / 2]) petal(a, H * 0.12, W * 0.22, 'rgba(78,62,150,0.72)')
  pane(g, () => { g.beginPath(); g.arc(fx, fy, W * 0.05, 0, Math.PI * 2) }, 'rgba(244,210,80,0.78)', lw * 0.8)
  g.strokeStyle = LEAD
  g.lineWidth = lw * 2
  g.strokeRect(lw, lw, W - 2 * lw, H - 2 * lw)
}

/** Vetro satinato uniforme con un filetto (Moderno e Scandinavo). */
function satin(g, W, H, rnd, style) {
  g.fillStyle = style === 'moderno' ? 'rgba(226,234,238,0.6)' : 'rgba(240,238,230,0.6)'
  g.fillRect(0, 0, W, H)
  addNoise(g, W, H, rnd, 10)
  g.strokeStyle = style === 'moderno' ? 'rgba(90,100,106,0.9)' : 'rgba(150,130,100,0.9)'
  g.lineWidth = 3
  g.strokeRect(W * 0.07, W * 0.07, W * 0.86, H - W * 0.14)
}

/**
 * Un'anta di vetrata, 256 x 768, con canale alfa.
 * @param {string} style id dello stile
 * @returns {HTMLCanvasElement} canvas
 */
export function drawGlass(style) {
  const { canvas, g } = makeCanvas(256, 768)
  if (style === 'liberty') libertyGlass(g, 256, 768)
  else satin(g, 256, 768, rngFor('glass:' + style), style)
  return canvas
}

const SPINES = {
  liberty: ['#6e1a1f', '#2f5a3a', '#223a6a', '#7a4a26', '#4a2a1e', '#8a2a2e', '#1f4a4a'],
  moderno: ['#d9dbdb', '#8d9499', '#2a6370', '#1f1f22', '#b9bdbf', '#e8e6e0'],
  scandinavo: ['#efe9dc', '#cfc6b4', '#a9b8bd', '#c9a27a', '#f6f3ec', '#3a3a3c'],
}

/**
 * Fila di dorsi di libri, 512 x 128, ripetibile in orizzontale.
 * @param {string} style id dello stile
 * @returns {HTMLCanvasElement} canvas
 */
export function drawSpines(style) {
  const W = 512
  const H = 128
  const { canvas, g } = makeCanvas(W, H)
  const rnd = rngFor('spines:' + style)
  const pal = SPINES[style] ?? SPINES.liberty
  g.fillStyle = '#16110d'
  g.fillRect(0, 0, W, H)
  let x = 0
  while (x < W) {
    let w = 8 + Math.floor(rnd() * 15)
    if (W - x - w < 8) w = W - x
    const top = Math.floor(rnd() * 16)
    const col = pal[Math.floor(rnd() * pal.length)]
    const gr = g.createLinearGradient(x, 0, x + w, 0)
    gr.addColorStop(0, shade(col, -0.28))
    gr.addColorStop(0.35, shade(col, 0.08))
    gr.addColorStop(1, shade(col, -0.3))
    g.fillStyle = gr
    g.fillRect(x, top, w, H - top)
    if (style === 'liberty') {
      g.fillStyle = '#c9a24a'
      for (const y of [top + 8, top + 12, H - 14, H - 10]) g.fillRect(x + 1, y, w - 2, 1.5)
      if (rnd() < 0.5) g.fillRect(x + 2, top + 28 + rnd() * 30, w - 4, 14)
    } else if (rnd() < 0.5) {
      g.fillStyle = shade(col, rnd() < 0.5 ? 0.35 : -0.4)
      g.fillRect(x + 2, top + 20 + rnd() * 40, w - 4, 3)
    }
    g.fillStyle = 'rgba(0,0,0,0.5)'
    g.fillRect(x + w - 1, top, 1, H - top)
    x += w
  }
  return canvas
}
