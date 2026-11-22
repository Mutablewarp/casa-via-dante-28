/** Greca del bordo e riempimento del campo dei tappeti persiani. */
import { diamond, disc, rosette, leaf, shade } from './draw.js'
import { fillShape } from './rugs-motifs.js'

const TAU = Math.PI * 2

/**
 * Disegna un tratto di greca nel rettangolo locale (0,0)-(len,bw); il lato esterno è y = 0.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {string} kind hook | vine | kufic | stripes
 * @param {number} len lunghezza
 * @param {number} bw larghezza
 * @param {object} p tavolozza
 */
export function strip(g, kind, len, bw, p) {
  g.fillStyle = p.band
  g.fillRect(0, 0, len, bw)
  const mid = bw / 2
  if (kind === 'stripes') {
    g.fillStyle = p.m1
    for (const f of [0.18, 0.46, 0.74]) g.fillRect(0, bw * f, len, bw * 0.1)
    return
  }
  const n = Math.max(1, Math.round(len / (bw * (kind === 'kufic' ? 0.95 : 1.2))))
  const step = len / n
  if (kind === 'vine') {
    g.beginPath()
    for (let x = 0; x <= len; x += 2) {
      const y = mid + Math.sin((x / step) * TAU) * bw * 0.2
      if (x) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.strokeStyle = p.m2
    g.lineWidth = Math.max(1, bw * 0.06)
    g.stroke()
  }
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * step
    if (kind === 'hook') {
      diamond(g, cx, mid, step * 0.46, bw * 0.44, p.m2)
      diamond(g, cx, mid, step * 0.34, bw * 0.32, p.m1)
      diamond(g, cx, mid, step * 0.14, bw * 0.14, p.m2)
      g.fillStyle = p.m1
      for (const s of [-1, 1]) g.fillRect(cx + s * step * 0.5 - bw * 0.07, mid - bw * 0.3, bw * 0.14, bw * 0.6)
    } else if (kind === 'vine') {
      rosette(g, cx, mid, bw * 0.3, 6, p.m1, p.m2, p.gold)
      const up = i % 2 ? 1 : -1
      leaf(g, cx + step * 0.12, mid + up * bw * 0.2, bw * 0.3, bw * 0.1, up * -0.9, p.m2)
      leaf(g, cx - step * 0.12, mid - up * bw * 0.2, bw * 0.3, bw * 0.1, Math.PI + up * 0.9, p.m1)
    } else {
      const s = bw * 0.5
      g.fillStyle = i % 2 ? p.m2 : p.m1
      g.fillRect(cx - s / 2, mid - s / 2, s, s)
      disc(g, cx, mid, s * 0.18, i % 2 ? p.m1 : p.m2)
      g.fillStyle = p.m1
      g.fillRect(cx + s / 2, mid - bw * 0.04, step - s, bw * 0.08)
    }
  }
}

/** Disegna la scacchiera di rosette o rombi, centrata e simmetrica. */
function lattice(g, F, sp, fn) {
  const cx = F.x + F.w / 2
  const cy = F.y + F.h / 2
  const nx = Math.ceil(F.w / 2 / sp) + 1
  const ny = Math.ceil(F.h / 2 / sp) + 1
  for (let iy = -ny; iy <= ny; iy++) {
    for (let ix = -nx; ix <= nx; ix++) {
      const off = iy % 2 ? sp / 2 : 0
      fn(cx + ix * sp + off, cy + iy * sp * 0.9, ix, iy)
    }
  }
}

/**
 * Riempie il campo secondo il tipo scelto.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {{x:number,y:number,w:number,h:number}} F rettangolo del campo
 * @param {string} kind sparse | flowers | lattice | vines | gul | plain
 * @param {object} p tavolozza
 */
export function fieldFill(g, F, kind, p) {
  g.save()
  g.beginPath()
  g.rect(F.x, F.y, F.w, F.h)
  g.clip()
  g.fillStyle = p.field
  g.fillRect(F.x, F.y, F.w, F.h)
  const s = Math.min(F.w, F.h)
  const cx = F.x + F.w / 2
  const cy = F.y + F.h / 2
  const dark = shade(p.field, -0.25)
  if (kind === 'sparse') {
    const sp = s * 0.12
    lattice(g, F, sp, (x, y, ix, iy) => {
      if ((ix + iy) % 2 === 0) {
        diamond(g, x, y, sp * 0.24, sp * 0.24, p.fl[0])
        diamond(g, x, y, sp * 0.12, sp * 0.12, p.fl[1])
      } else {
        g.fillStyle = p.fl[2]
        g.fillRect(x - sp * 0.05, y - sp * 0.05, sp * 0.1, sp * 0.1)
      }
    })
  } else if (kind === 'flowers') {
    const sp = s * 0.1
    lattice(g, F, sp, (x, y, ix, iy) => {
      for (let k = 0; k < 4; k++) leaf(g, x, y, sp * 0.46, sp * 0.1, (k + 0.5) * (TAU / 4), dark)
      rosette(g, x, y, sp * 0.26, 6, p.fl[(ix + iy * 2 + 8) % p.fl.length], p.fl[(ix + iy * 2 + 9) % p.fl.length], p.ivory)
    })
  } else if (kind === 'lattice') {
    const sp = s * 0.2
    g.strokeStyle = shade(p.field, 0.25)
    g.lineWidth = Math.max(1, s * 0.012)
    const n = Math.ceil((F.w + F.h) / sp)
    for (let k = -n; k <= n; k++) {
      g.beginPath()
      g.moveTo(cx + k * sp - F.h, cy - F.h)
      g.lineTo(cx + k * sp + F.h, cy + F.h)
      g.moveTo(cx + k * sp + F.h, cy - F.h)
      g.lineTo(cx + k * sp - F.h, cy + F.h)
      g.stroke()
    }
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const x = cx + i * sp / 2
        const y = cy + j * sp / 2
        if ((i + j) % 2) disc(g, x, y, sp * 0.04, p.fl[2])
        else rosette(g, x, y, sp * 0.15, 6, p.fl[0], p.fl[1], p.fl[2])
      }
    }
  } else if (kind === 'vines') {
    const sp = s * 0.17
    const lam = sp * 2.2
    const ny = Math.ceil(F.h / 2 / sp) + 1
    for (let j = -ny; j <= ny; j++) {
      const ph = (j % 2) * Math.PI
      const yy = (x) => cy + j * sp + Math.cos((x - cx) / lam * TAU + ph) * sp * 0.3
      g.beginPath()
      for (let x = F.x; x <= F.x + F.w; x += 2) (x === F.x ? g.moveTo(x, yy(x)) : g.lineTo(x, yy(x)))
      g.strokeStyle = p.dark
      g.lineWidth = Math.max(1, s * 0.01)
      g.stroke()
      for (let i = -Math.ceil(F.w / lam); i <= Math.ceil(F.w / lam); i++) {
        for (const h of [0, 0.5]) {
          const x = cx + (i + h) * lam
          const y = yy(x)
          if (h === 0) rosette(g, x, y, sp * 0.2, 6, p.fl[1], p.fl[0], p.gold)
          else {
            leaf(g, x, y, sp * 0.34, sp * 0.1, -1.1, p.fl[0])
            leaf(g, x, y, sp * 0.34, sp * 0.1, 1.1 + Math.PI, p.fl[2])
          }
        }
      }
    }
  } else if (kind === 'gul') {
    const cols = Math.max(2, Math.round(F.w / (s * 0.2)))
    const cell = F.w / cols
    const rows = Math.max(1, Math.round(F.h / cell))
    const ch = F.h / rows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = F.x + (c + 0.5) * cell
        const y = F.y + (r + 0.5) * ch
        const R = Math.min(cell, ch) * 0.4
        const oct = (rr, col) => {
          g.beginPath()
          for (let k = 0; k < 8; k++) {
            const a = (k + 0.5) * TAU / 8
            g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr)
          }
          g.closePath()
          g.fillStyle = col
          g.fill()
        }
        oct(R, p.dark)
        oct(R * 0.86, p.fl[2])
        oct(R * 0.74, p.field)
        for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.fillStyle = (qx * qy > 0) ? p.dark : p.ivory
          g.fillRect(qx > 0 ? x : x - R * 0.34, qy > 0 ? y : y - R * 0.34, R * 0.34, R * 0.34)
        }
        diamond(g, x, y, R * 0.14, R * 0.14, p.field)
        diamond(g, x + cell / 2, y + ch / 2, R * 0.2, R * 0.2, p.ivory)
        diamond(g, x + cell / 2, y + ch / 2, R * 0.1, R * 0.1, p.dark)
      }
    }
  } else if (kind === 'plain') {
    const sp = s * 0.2
    lattice(g, F, sp, (x, y) => diamond(g, x, y, sp * 0.1, sp * 0.1, p.fl[1]))
  }
  g.restore()
}

/** Sagoma d'alone attorno al medaglione, nel colore del campo, per ripulire il riempimento. */
export function halo(g, kind, cx, cy, rx, ry, color) {
  fillShape(g, kind, cx, cy, rx * 1.2, ry * 1.2, color)
}
