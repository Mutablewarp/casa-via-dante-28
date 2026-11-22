/** Funzioni di disegno comuni a tappeti, piastrelle e vetrata (A2). */

/**
 * Numero stabile ricavato da una stringa.
 * @param {string} str testo
 * @returns {number} intero a 32 bit senza segno
 */
export function hashStr(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  return h
}

/**
 * Generatore pseudo-casuale con seme (mulberry32): stesso seme, stessa sequenza.
 * @param {string|number} seed seme
 * @returns {() => number} funzione che restituisce numeri in [0, 1)
 */
export function rngFor(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashStr(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Crea un canvas con il suo contesto 2D. */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return { canvas: c, g: c.getContext('2d') }
}

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

/**
 * Mescola due colori esadecimali.
 * @param {string} a primo colore
 * @param {string} b secondo colore
 * @param {number} t 0 = a, 1 = b
 * @returns {string} colore esadecimale
 */
export function mix(a, b, t) {
  const ca = rgb(a)
  const cb = rgb(b)
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t))
}

/** Schiarisce (t > 0) o scurisce (t < 0) un colore. */
export function shade(hex, t) {
  return t >= 0 ? mix(hex, '#ffffff', t) : mix(hex, '#000000', -t)
}

/**
 * Disegna un poligono pieno (e contorno se `stroke`).
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number[][]} pts vertici [x, y]
 * @param {string} fill colore di riempimento
 * @param {string} [stroke] colore del contorno
 * @param {number} [lw] spessore del contorno
 */
export function poly(g, pts, fill, stroke, lw = 1) {
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
  g.closePath()
  if (fill) { g.fillStyle = fill; g.fill() }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke() }
}

/** Rombo centrato. */
export function diamond(g, x, y, rx, ry, fill, stroke, lw) {
  poly(g, [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]], fill, stroke, lw)
}

/** Cerchio pieno. */
export function disc(g, x, y, r, fill) {
  g.beginPath()
  g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
}

/**
 * Rosetta a petali tondi con cuore.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} x centro x
 * @param {number} y centro y
 * @param {number} r raggio totale
 * @param {number} n numero di petali
 * @param {string} c1 colore dei petali
 * @param {string} c2 colore del cuore
 * @param {string} [c3] colore del punto centrale
 */
export function rosette(g, x, y, r, n, c1, c2, c3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    disc(g, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.38, c1)
  }
  disc(g, x, y, r * 0.42, c2)
  if (c3) disc(g, x, y, r * 0.2, c3)
}

/** Foglia a goccia con base in (x, y) rivolta verso l'angolo `a`. */
export function leaf(g, x, y, len, wid, a, fill) {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -wid, len, 0)
  g.quadraticCurveTo(len * 0.5, wid, 0, 0)
  g.fillStyle = fill
  g.fill()
  g.restore()
}

/**
 * Esegue `fn` nei quattro quadranti attorno a (cx, cy), specchiando: la simmetria è esatta.
 * `fn` disegna nel quadrante positivo (x, y >= 0, origine in (cx, cy)).
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} cx centro x
 * @param {number} cy centro y
 * @param {number} hw semilarghezza dell'area
 * @param {number} hh semialtezza dell'area
 * @param {(g: CanvasRenderingContext2D) => void} fn disegno del quadrante
 */
export function mirror4(g, cx, cy, hw, hh, fn) {
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      g.save()
      g.translate(cx, cy)
      g.scale(sx, sy)
      g.beginPath()
      g.rect(-1, -1, hw + 1, hh + 1)
      g.clip()
      fn(g)
      g.restore()
    }
  }
}

/**
 * Rumore fine: perturba la luminosità di ogni pixel.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} w larghezza
 * @param {number} h altezza
 * @param {() => number} rnd generatore
 * @param {number} amount ampiezza (0-255)
 */
export function addNoise(g, w, h, rnd, amount) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  g.putImageData(img, 0, 0)
}

/**
 * Variazione di tono a fasce orizzontali («abrash»).
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} w larghezza
 * @param {number} h altezza
 * @param {() => number} rnd generatore
 * @param {number} strength opacità massima delle fasce (0-1)
 */
export function abrash(g, w, h, rnd, strength) {
  let y = 0
  while (y < h) {
    const bh = Math.max(2, (0.02 + rnd() * 0.05) * h)
    const dark = rnd() < 0.5
    g.fillStyle = dark ? `rgba(30,12,4,${rnd() * strength})` : `rgba(255,236,200,${rnd() * strength * 0.7})`
    g.fillRect(0, y, w, bh)
    y += bh
  }
}

/**
 * Ripete `fn` con gli scostamenti necessari a rendere continui i bordi (texture ripetibili).
 * @param {number} w larghezza del canvas
 * @param {number} h altezza del canvas
 * @param {(dx: number, dy: number) => void} fn disegno con scostamento
 */
export function wrapped(w, h, fn) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy)
}
