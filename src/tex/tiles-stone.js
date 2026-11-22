/** Marmo di Carrara e gres effetto marmo. */
import { wrapped, rngFor, addNoise } from './draw.js'

/** Una venatura: passeggiata casuale con angolo che oscilla. */
function vein(g, rnd, x, y, ang, steps, step, width, color, dx = 0, dy = 0) {
  g.beginPath()
  g.moveTo(x + dx, y + dy)
  for (let i = 0; i < steps; i++) {
    ang += (rnd() - 0.5) * 0.7
    x += Math.cos(ang) * step
    y += Math.sin(ang) * step
    g.lineTo(x + dx, y + dy)
  }
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

/** Venature e nuvole su un'area; `w`/`h` servono per rendere i bordi continui. */
function marbleArea(g, ox, oy, w, h, rnd, base, cloud, veinRgb, repeat) {
  g.save()
  g.beginPath()
  g.rect(ox, oy, w, h)
  g.clip()
  g.fillStyle = base
  g.fillRect(ox, oy, w, h)
  const cl = []
  for (let i = 0; i < 16; i++) cl.push([rnd() * w, rnd() * h, w * (0.12 + rnd() * 0.25), rnd()])
  const veins = []
  for (let i = 0; i < 9; i++) veins.push([rnd() * w, rnd() * h, rnd() * Math.PI * 2, 40 + Math.floor(rnd() * 50), w * (0.012 + rnd() * 0.012), 0.8 + rnd() * 2.2, 0.18 + rnd() * 0.4, rnd() < 0.4])
  const offs = repeat ? (fn) => wrapped(w, h, fn) : (fn) => fn(0, 0)
  offs((dx, dy) => {
    for (const [x, y, r, a] of cl) {
      const gr = g.createRadialGradient(ox + x + dx, oy + y + dy, 0, ox + x + dx, oy + y + dy, r)
      gr.addColorStop(0, `rgba(${cloud},${0.1 + a * 0.12})`)
      gr.addColorStop(1, `rgba(${cloud},0)`)
      g.fillStyle = gr
      g.fillRect(ox, oy, w, h)
    }
    for (const [x, y, a, n, st, lw, al, branch] of veins) {
      const r2 = rngFor(`${x}${y}`)
      vein(g, r2, ox + x, oy + y, a, n, st, lw, `rgba(${veinRgb},${al})`, dx, dy)
      if (branch) vein(g, r2, ox + x, oy + y, a + 0.9, n >> 1, st, lw * 0.5, `rgba(${veinRgb},${al * 0.7})`, dx, dy)
    }
  })
  g.restore()
}

/**
 * Marmo di Carrara: lastra continua e ripetibile.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} S lato del canvas
 */
export function paintCarrara(g, S) {
  const rnd = rngFor('marmo_carrara')
  marbleArea(g, 0, 0, S, S, rnd, '#eceeed', '140,146,152', '120,126,134', true)
  addNoise(g, S, S, rnd, 8)
}

/**
 * Gres effetto marmo: 2 x 2 lastre da 60 cm con fughe sottili.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} S lato del canvas
 * @param {string} style id dello stile (cambia la tinta)
 */
export function paintGresMarmo(g, S, style) {
  const rnd = rngFor('gres_marmo:' + style)
  const h = S / 2
  const warm = style === 'scandinavo'
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      marbleArea(g, c * h, r * h, h, h, rnd, warm ? '#e6e3dc' : '#e1e1de', '150,148,142', warm ? '150,140,128' : '110,112,116', false)
    }
  }
  g.fillStyle = '#b8b6b0'
  g.fillRect(0, 0, S, 2)
  g.fillRect(0, 0, 2, S)
  g.fillRect(h - 1, 0, 2, S)
  g.fillRect(0, h - 1, S, 2)
  addNoise(g, S, S, rnd, 8)
}
