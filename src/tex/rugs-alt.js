/** Tappeti degli stili Moderno e Scandinavo, e zerbino (uguale in tutti gli stili). */
import { addNoise, diamond, disc, shade } from './draw.js'

const GREY = ['#d4d6d6', '#b9bdbf', '#8d9499']
const PETROL = ['#2a6370', '#1f5560', '#163d46']

/** Righe sottili di trama, comuni a tutti i tessuti. */
function weave(g, W, H, a = 0.05) {
  g.fillStyle = `rgba(0,0,0,${a})`
  for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1)
}

/** Moderno: tinta unita con grandi campiture geometriche in grigio e blu petrolio. */
function modern(g, W, H, pattern) {
  const short = Math.min(W, H)
  const variant = { heriz: 0, heriz_grande: 0, kashan: 0, tabriz: 1, isfahan_chiaro: 1, isfahan_seta: 2, bukhara: 3, passatoia: 4, bagno: 5 }[pattern] ?? 2
  g.fillStyle = variant === 4 ? PETROL[1] : variant === 5 ? '#e8e6e0' : GREY[0]
  g.fillRect(0, 0, W, H)
  if (variant === 0) {
    g.fillStyle = PETROL[1]
    g.fillRect(W * 0.12, H * 0.14, W * 0.5, H * 0.72)
    g.fillStyle = GREY[2]
    g.fillRect(W * 0.62, H * 0.14, W * 0.26, H * 0.72)
  } else if (variant === 1) {
    disc(g, W * 0.5, H * 0.5, short * 0.36, PETROL[0])
    disc(g, W * 0.5, H * 0.5, short * 0.2, GREY[1])
  } else if (variant === 2) {
    g.fillStyle = GREY[1]
    g.fillRect(0, H * 0.62, W, H * 0.38)
    g.fillStyle = PETROL[2]
    g.fillRect(W * 0.18, H * 0.2, W * 0.64, H * 0.3)
  } else if (variant === 3) {
    const n = 4
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      g.fillStyle = (r + c) % 2 ? PETROL[1] : GREY[1]
      g.fillRect((c * W) / n, (r * H) / n, W / n + 1, H / n + 1)
    }
  } else if (variant === 4) {
    g.fillStyle = GREY[0]
    g.fillRect(W * 0.03, H * 0.18, W * 0.94, H * 0.06)
    g.fillRect(W * 0.03, H * 0.76, W * 0.94, H * 0.06)
  } else {
    g.fillStyle = GREY[1]
    g.fillRect(0, 0, W, H * 0.08)
    g.fillRect(0, H * 0.92, W, H * 0.08)
  }
  weave(g, W, H)
}

/** Scandinavo: lana chiara a righe sottili oppure kilim a rombi. */
function nordic(g, W, H, pattern, rnd) {
  const f = H * 0.045
  g.fillStyle = '#ece6d8'
  g.fillRect(0, 0, W, H)
  const kilim = ['heriz', 'heriz_grande', 'kashan', 'bukhara'].includes(pattern)
  if (kilim) {
    const rows = 5
    const rh = H / rows
    const cols = Math.max(2, Math.round(W / rh))
    const cw = W / cols
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * cw
        const y = (r + 0.5) * rh
        diamond(g, x, y, cw * 0.46, rh * 0.46, r % 2 ? '#c9bfae' : '#a9b8bd')
        diamond(g, x, y, cw * 0.26, rh * 0.26, '#ece6d8')
        diamond(g, x, y, cw * 0.1, rh * 0.1, r % 2 ? '#8a9ca2' : '#b59f84')
      }
    }
  } else {
    const n = pattern === 'bagno' ? 5 : 9
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 3 === 1 ? '#a9b8bd' : '#cfc6b4'
      g.fillRect(0, (H * (i + 0.35)) / n, W, (H / n) * (i % 3 === 1 ? 0.2 : 0.12))
    }
  }
  weave(g, W, H, 0.06)
  addNoise(g, W, H, rnd, 20)
  if (pattern === 'bagno') return
  g.fillStyle = shade('#e8dfc6', -0.1)
  for (let y = 0; y < H; y += 3) {
    g.fillRect(0, y, f, 2)
    g.fillRect(W - f, y, f, 2)
  }
}

/**
 * Tappeto Moderno o Scandinavo orizzontale.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} W larghezza
 * @param {number} H altezza
 * @param {string} style moderno | scandinavo
 * @param {string} pattern nome del motivo
 * @param {() => number} rnd generatore con seme
 */
export function paintAlt(g, W, H, style, pattern, rnd) {
  if (style === 'moderno') modern(g, W, H, pattern)
  else nordic(g, W, H, pattern, rnd)
}

/**
 * Zerbino di cocco: tinta unita ruvida con filetto.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} W larghezza
 * @param {number} H altezza
 * @param {() => number} rnd generatore con seme
 */
export function paintDoormat(g, W, H, rnd) {
  g.fillStyle = '#a58a5e'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < W * H * 0.02; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(70,45,20,0.35)' : 'rgba(215,190,140,0.35)'
    const x = rnd() * W
    const y = rnd() * H
    g.fillRect(x, y, 2 + rnd() * 6, 1)
  }
  g.strokeStyle = '#6e5636'
  g.lineWidth = Math.max(2, H * 0.04)
  g.strokeRect(H * 0.12, H * 0.12, W - H * 0.24, H * 0.76)
  addNoise(g, W, H, rnd, 40)
}
