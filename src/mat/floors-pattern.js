/** Pavimenti a motivo: spina di pesce (parquet, cotto) e cementine. Ogni cella è ripetibile senza giunture. */
import { rgb, mix, fillPixelsG, makeCanvas, vnoise, hash2 } from './noise.js'
import { canvasTexture } from './textures.js'

const mod = (a, n) => ((a % n) + n) % n

/**
 * Spina di pesce: listelli a 90° nel sistema del motivo, poi il tutto ruotato di 45° così
 * il «dente» corre lungo gli assi della stanza. Cella quadrata di lato 2·l·√2/… (vedi `cell`).
 * @param {object} THREE
 * @param {{stave:[number, number], a:string, b:string, grain?:boolean, border?:string, roughness?:number}} def
 */
export function* herringbone(THREE, def) {
  const [w, l] = def.stave
  const n = Math.max(2, Math.round(l / w))
  const cell = n * 2 * w * Math.SQRT2
  const size = n >= 4 ? 1024 : 512
  const ppm = size / cell
  const cv = makeCanvas(size, size)
  const A = rgb(def.a), B = rgb(def.b)
  const groutC = def.border ? rgb(def.border) : [28, 20, 14]
  const gw = 0.0012
  const lenM = n * w
  const P = 2 * n
  const S = Math.SQRT1_2
  yield* fillPixelsG(cv, (px, py, out) => {
    const x = (px + 0.5) / ppm, y = (py + 0.5) / ppm
    const ui = ((x + y) * S) / w, vi = ((x - y) * S) / w
    const i = Math.floor(ui), j = Math.floor(vi)
    const d = mod(i - j, P)
    let isV = 0, k, along, across
    const shift = i - j - d // multiplo del periodo: la stessa fila di listelli si ripete ogni P celle
    if (d < n) { k = mod(j, P); along = (ui - j - shift) / n; across = vi - j }
    else { isV = 1; k = mod(i - n, P); along = (vi - (i - P + 1 - shift)) / n; across = ui - i }
    const key = isV * 64 + k
    const tone = 0.93 + hash2(key, 3, 11) * 0.14
    const c = mix(A, B, hash2(key, 5, 2) * (def.grain ? 1 : 0.8)) // toni a caso listello per listello
    let kf = tone
    const aM = along * lenM
    if (def.grain) {
      const wob = vnoise(aM * 3, key * 3.1, 0, key)
      kf *= 1 + 0.075 * Math.sin((across * 5 + wob * 2.2 + key * 0.37) * 2 * Math.PI)
        + 0.05 * (vnoise(across * 36, aM * 7, 0, key + 3) - 0.5)
    } else {
      kf *= 0.95 + hash2(px, py, 8) * 0.07 + 0.08 * (vnoise(px / 9, py / 9, 0, key) - 0.5)
    }
    const edge = Math.min(across * w, (1 - across) * w, along * lenM, (1 - along) * lenM)
    let r = c[0] * kf, g = c[1] * kf, b = c[2] * kf
    if (edge < gw) {
      const t = (1 - edge / gw) * 0.85
      r += (groutC[0] - r) * t; g += (groutC[1] - g) * t; b += (groutC[2] - b) * t
    }
    out[0] = r; out[1] = g; out[2] = b
  })
  return canvasTexture(THREE, cv.canvas, { meters: cell, aniso: 4 })
}

/** Stella a otto punte, cornice e rombi agli angoli. */
function stella(g, ts, c) {
  const h = ts / 2
  g.strokeStyle = c[3] ?? c[2]; g.lineWidth = ts * 0.03
  g.strokeRect(ts * 0.07, ts * 0.07, ts * 0.86, ts * 0.86)
  const star = (ro, ri) => {
    g.beginPath()
    for (let p = 0; p < 16; p++) {
      const a = (p * Math.PI) / 8 - Math.PI / 2, r = p % 2 ? ri : ro
      g[p ? 'lineTo' : 'moveTo'](h + Math.cos(a) * r, h + Math.sin(a) * r)
    }
    g.closePath()
  }
  star(ts * 0.41, ts * 0.17); g.fillStyle = c[1]; g.fill()
  g.strokeStyle = c[3] ?? c[2]; g.lineWidth = ts * 0.012; g.stroke()
  star(ts * 0.25, ts * 0.11); g.fillStyle = c[0]; g.fill()
  g.beginPath(); g.arc(h, h, ts * 0.085, 0, Math.PI * 2); g.fillStyle = c[2]; g.fill()
  for (let q = 0; q < 4; q++) {
    g.save(); g.translate(h, h); g.rotate((q * Math.PI) / 2); g.translate(-h, -h)
    g.beginPath(); g.moveTo(ts * 0.15, ts * 0.08); g.lineTo(ts * 0.22, ts * 0.15); g.lineTo(ts * 0.15, ts * 0.22); g.lineTo(ts * 0.08, ts * 0.15)
    g.closePath(); g.fillStyle = c[2]; g.fill()
    g.restore()
  }
}

/** Fiore a quattro petali con quarti di cerchio agli angoli. */
function fiore(g, ts, c) {
  const h = ts / 2
  for (let q = 0; q < 4; q++) {
    g.save(); g.translate(h, h); g.rotate((q * Math.PI) / 2); g.translate(-h, -h)
    g.fillStyle = c[1]
    g.beginPath(); g.ellipse(h, h - ts * 0.2, ts * 0.085, ts * 0.17, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(h + ts * 0.17, h - ts * 0.17, ts * 0.05, ts * 0.1, Math.PI / 4, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(0, 0, ts * 0.2, 0, Math.PI / 2); g.lineTo(0, 0); g.closePath(); g.fill()
    g.fillStyle = c[2]
    g.beginPath(); g.arc(0, 0, ts * 0.1, 0, Math.PI / 2); g.lineTo(0, 0); g.closePath(); g.fill()
    g.restore()
  }
  g.beginPath(); g.arc(h, h, ts * 0.075, 0, Math.PI * 2); g.fillStyle = c[2]; g.fill()
  g.strokeStyle = c[1]; g.lineWidth = ts * 0.02
  g.beginPath(); g.arc(h, h, ts * 0.11, 0, Math.PI * 2); g.stroke()
}

/** Scacco: quattro quadranti alternati, cornice sottile e rombo centrale. */
function scacco(g, ts, c) {
  const h = ts / 2
  g.fillStyle = c[1]; g.fillRect(0, 0, h, h); g.fillRect(h, h, h, h)
  g.strokeStyle = c[1]; g.lineWidth = ts * 0.025; g.strokeRect(ts * 0.06, ts * 0.06, ts * 0.88, ts * 0.88)
  g.beginPath(); g.moveTo(h, ts * 0.3); g.lineTo(ts * 0.7, h); g.lineTo(h, ts * 0.7); g.lineTo(ts * 0.3, h); g.closePath()
  g.fillStyle = c[0]; g.fill()
  g.strokeStyle = c[1]; g.lineWidth = ts * 0.015; g.stroke()
}

const MOTIFS = { stella, fiore, scacco }

/**
 * Cementine: cella 2 x 2 piastrelle, ognuna ruotata di 90° rispetto alla vicina, con fuga chiara.
 * @param {object} THREE
 * @param {{tile:number, motif:string, colors:string[]}} def
 */
export function cementine(THREE, def) {
  const ts = 256
  const cv = makeCanvas(ts * 2, ts * 2)
  const g = cv.g
  const draw = MOTIFS[def.motif] ?? scacco
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.save()
    g.translate(i * ts + ts / 2, j * ts + ts / 2)
    g.rotate(((i + j) % 2) * (Math.PI / 2))
    g.translate(-ts / 2, -ts / 2)
    g.fillStyle = def.colors[0]; g.fillRect(0, 0, ts, ts)
    draw(g, ts, def.colors)
    const t = hash2(i, j, 9) - 0.5
    g.fillStyle = t > 0 ? `rgba(255,255,255,${t * 0.12})` : `rgba(0,0,0,${-t * 0.14})`
    g.fillRect(0, 0, ts, ts)
    g.restore()
  }
  g.strokeStyle = 'rgba(214,208,194,0.9)'; g.lineWidth = 3
  for (let k = 0; k <= 2; k++) {
    g.beginPath(); g.moveTo(k * ts, 0); g.lineTo(k * ts, ts * 2); g.stroke()
    g.beginPath(); g.moveTo(0, k * ts); g.lineTo(ts * 2, k * ts); g.stroke()
  }
  return canvasTexture(THREE, cv.canvas, { meters: def.tile * 2, aniso: 4 })
}
