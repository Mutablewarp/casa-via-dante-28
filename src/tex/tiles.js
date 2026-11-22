/** Piastrelle decorate, rivestimenti e tessuto floreale. */
import { makeCanvas, rngFor, addNoise, disc, diamond, leaf, wrapped, shade } from './draw.js'
import { paintCarrara, paintGresMarmo } from './tiles-stone.js'

/** Lato in metri del riquadro rappresentato da ogni texture. */
export const TILE_METERS = {
  maiolica_gialloblu: 0.4, maiolica_blu: 0.4, marmo_carrara: 1.2, piastrella_bianca: 0.4,
  gres_bianco: 0.4, gres_marmo: 1.2, tessuto_floreale: 0.35,
}

const TAU = Math.PI * 2

/** Piastrella siciliana 20 x 20 con rosone centrale e quarti di cerchio agli angoli. */
function maiolica(g, x0, y0, S, blue, yellow, accent, twelve) {
  g.fillStyle = '#f4efe0'
  g.fillRect(x0, y0, S, S)
  const cx = x0 + S / 2
  const cy = y0 + S / 2
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const px = x0 + qx * S
    const py = y0 + qy * S
    disc(g, px, py, S * 0.3, blue)
    disc(g, px, py, S * 0.22, '#f4efe0')
    disc(g, px, py, S * 0.13, accent)
  }
  for (const [mx, my] of [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]]) diamond(g, x0 + mx * S, y0 + my * S, S * 0.09, S * 0.09, blue)
  const n = twelve ? 12 : 8
  disc(g, cx, cy, S * 0.33, blue)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    leaf(g, cx + Math.cos(a) * S * 0.07, cy + Math.sin(a) * S * 0.07, S * 0.24, S * (twelve ? 0.05 : 0.08), a, i % 2 || !twelve ? yellow : '#f4efe0')
  }
  disc(g, cx, cy, S * 0.1, blue)
  disc(g, cx, cy, S * 0.05, '#f4efe0')
  g.strokeStyle = '#d9d0b6'
  g.lineWidth = 2
  g.strokeRect(x0 + 1, y0 + 1, S - 2, S - 2)
}

/** Piastrella a tinta unita con smusso e fuga. */
function plainTile(g, x, y, w, h, base, grout) {
  g.fillStyle = grout
  g.fillRect(x, y, w, h)
  const gr = g.createLinearGradient(x, y, x + w, y + h)
  gr.addColorStop(0, shade(base, 0.05))
  gr.addColorStop(1, shade(base, -0.04))
  g.fillStyle = gr
  g.fillRect(x + 2, y + 2, w - 4, h - 4)
}

/** Tessuto a fiori: iris e grappoli di glicine, ripetibile. */
function floral(g, S, rnd) {
  g.fillStyle = '#efe2bc'
  g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(160,130,60,0.07)'
  for (let i = -S; i < S * 2; i += 6) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i + S, S)
    g.stroke()
  }
  const iris = (x, y, k) => {
    g.beginPath()
    g.moveTo(x, y + k * 1.6)
    g.quadraticCurveTo(x - k * 0.5, y + k * 2.6, x + k * 0.1, y + k * 3.6)
    g.strokeStyle = '#4f7a3c'
    g.lineWidth = k * 0.13
    g.stroke()
    leaf(g, x, y + k * 3.0, k * 1.8, k * 0.22, -1.9, '#5f8c48')
    leaf(g, x, y + k * 2.8, k * 1.6, k * 0.2, -1.2, '#4f7a3c')
    for (const s of [-1, 1]) leaf(g, x, y + k * 0.5, k * 1.2, k * 0.5, s > 0 ? 0.5 : Math.PI - 0.5, '#6a4a9c')
    leaf(g, x, y + k * 0.6, k * 1.3, k * 0.45, -Math.PI / 2, '#8466b8')
    leaf(g, x, y + k * 0.6, k * 0.7, k * 0.2, Math.PI / 2, '#e2b83a')
  }
  const wist = (x, y, k) => {
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + k * 0.3, y + k * 1.2, x, y + k * 2.4)
    g.strokeStyle = '#6d8a50'
    g.lineWidth = k * 0.06
    g.stroke()
    for (let i = 0; i < 26; i++) {
      const t = i / 26
      const px = x + (rnd() - 0.5) * k * (0.5 - t * 0.4)
      const py = y + t * k * 2.4
      disc(g, px, py, k * (0.17 - t * 0.08), t < 0.5 ? '#9b7bc8' : '#b7a0dc')
    }
  }
  wrapped(S, S, (dx, dy) => {
    iris(S * 0.22 + dx, S * 0.1 + dy, S * 0.15)
    iris(S * 0.72 + dx, S * 0.6 + dy, S * 0.15)
    wist(S * 0.47 + dx, S * 0.05 + dy, S * 0.17)
    wist(S * 0.97 + dx, S * 0.55 + dy, S * 0.17)
  })
}

/**
 * Disegna il riquadro `name` nello stile dato.
 * @param {string} style liberty | moderno | scandinavo
 * @param {string} name nome del rivestimento
 * @returns {HTMLCanvasElement} canvas ripetibile
 */
export function drawTile(style, name) {
  const meters = TILE_METERS[name]
  const S = 512
  const { canvas, g } = makeCanvas(S, S)
  const rnd = rngFor(`tile:${style}:${name}`)
  const liberty = style === 'liberty'
  const grout = style === 'moderno' ? '#c4c6c4' : '#cdd0cc'
  if (name === 'marmo_carrara') paintCarrara(g, S)
  else if (name === 'gres_marmo') paintGresMarmo(g, S, style)
  else if (name === 'tessuto_floreale') {
    if (liberty) floral(g, S, rnd)
    else {
      g.fillStyle = style === 'moderno' ? '#e6e3dc' : '#efece4'
      g.fillRect(0, 0, S, S)
      g.fillStyle = 'rgba(0,0,0,0.04)'
      for (let i = 0; i < S; i += 3) g.fillRect(0, i, S, 1)
      addNoise(g, S, S, rnd, 14)
    }
  } else if (name === 'piastrella_bianca') {
    g.fillStyle = grout
    g.fillRect(0, 0, S, S)
    for (let r = 0; r < 4; r++) {
      const off = (r % 2) * (S / 4)
      for (const x of [off - S / 2, off, off + S / 2]) plainTile(g, x, (r * S) / 4, S / 2, S / 4, '#f4f5f2', grout)
    }
  } else if (name === 'gres_bianco') {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) plainTile(g, (c * S) / 2, (r * S) / 2, S / 2, S / 2, style === 'moderno' ? '#eeefec' : '#f3f3f0', grout)
    addNoise(g, S, S, rnd, 9)
  } else if (liberty) {
    const blue = '#1f4e9c'
    if (name === 'maiolica_gialloblu') for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) maiolica(g, (c * S) / 2, (r * S) / 2, S / 2, blue, '#e9b82e', '#e9b82e', false)
    else for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) maiolica(g, (c * S) / 2, (r * S) / 2, S / 2, '#1b4a96', '#7ba3d6', '#7ba3d6', true)
    addNoise(g, S, S, rnd, 8)
  } else {
    // fuori dal Liberty le maioliche non esistono: tinta unita chiara con fuga
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) plainTile(g, (c * S) / 2, (r * S) / 2, S / 2, S / 2, style === 'moderno' ? '#e6e8e8' : '#f3f3f0', grout)
  }
  return { canvas, meters }
}
