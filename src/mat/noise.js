/** Rumore, colori e utilità di canvas per i materiali. Tutto deterministico (seme fisso). */

/** Generatore pseudo-casuale mulberry32. @param {number} seed @returns {() => number} valori in [0,1) */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash intero 2D -> [0,1). */
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Hash di una stringa in intero senza segno. */
export function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

const smooth = (t) => t * t * (3 - 2 * t)
const mod = (a, n) => ((a % n) + n) % n

/**
 * Rumore di valore 2D. Con `period` > 0 è periodico sul reticolo (ripetibile senza giunture).
 * @param {number} x @param {number} y coordinate in unità di reticolo
 * @param {number} period lato del periodo lungo x (intero) o 0
 * @param {number} seed
 * @param {number} periodY periodo lungo y, se diverso (rumore stirato)
 */
export function vnoise(x, y, period = 0, seed = 0, periodY = period) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = smooth(x - xi), yf = smooth(y - yi)
  const x0 = period > 0 ? mod(xi, period) : xi, x1 = period > 0 ? mod(xi + 1, period) : xi + 1
  const y0 = periodY > 0 ? mod(yi, periodY) : yi, y1 = periodY > 0 ? mod(yi + 1, periodY) : yi + 1
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed)
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed)
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
}

/**
 * Fibra del legno, in circa [-1, 1]: striature fini e allungate più qualche fiamma morbida, senza bande regolari.
 * @param {number} c metri di traverso alla fibra @param {number} l metri lungo la fibra @param {number} key seme (listello)
 */
export function fiber(c, l, key) {
  const f1 = vnoise(c * 420, l * 6, 0, key) // fibre fini: circa 2,5 mm x 17 cm
  const f2 = vnoise(c * 95 + 7, l * 2.4, 0, key + 5) // striature: circa 1 cm x 40 cm
  const f3 = vnoise(c * 24 + Math.sin(l * 3.1 + key) * 0.9, l * 0.9, 0, key + 9) // fiamma: bande larghe che deviano
  return (f1 - 0.5) * 0.8 + (f2 - 0.5) * 0.8 + (f3 - 0.5) * 0.7
}

/** Converte "#RRGGBB" in [r,g,b] 0-255. */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Interpola due colori [r,g,b]. */
export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Luminanza approssimata 0-1 di un colore [r,g,b]. */
export function lum(c) {
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
}

/** Crea un canvas e ne restituisce contesto e dimensioni. */
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, g: canvas.getContext('2d'), w, h }
}

/**
 * Riempie un canvas pixel per pixel. `fn(x, y)` scrive un colore [r,g,b] in `out`.
 * @param {{g: CanvasRenderingContext2D, w: number, h: number}} cv
 * @param {(x: number, y: number, out: number[]) => void} fn
 * @returns {ImageData} i dati scritti (utili per campionare i colori)
 */
export function fillPixels(cv, fn) {
  const img = cv.g.createImageData(cv.w, cv.h)
  const d = img.data
  const out = [0, 0, 0]
  let i = 0
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      fn(x, y, out)
      d[i++] = out[0]; d[i++] = out[1]; d[i++] = out[2]; d[i++] = 255
    }
  }
  cv.g.putImageData(img, 0, 0)
  return img
}

/**
 * Come `fillPixels`, ma a fasce di `rows` righe con `yield` tra una fascia e l'altra:
 * chi la guida (`drain`, o il pre-riscaldamento) decide quando riprendere. Restituisce l'ImageData.
 * @param {{g: CanvasRenderingContext2D, w: number, h: number}} cv
 * @param {(x: number, y: number, out: number[]) => void} fn
 * @param {number} rows righe per fascia
 */
export function* fillPixelsG(cv, fn, rows = 32) {
  const img = cv.g.createImageData(cv.w, cv.h)
  const d = img.data
  const out = [0, 0, 0]
  let i = 0
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      fn(x, y, out)
      d[i++] = out[0]; d[i++] = out[1]; d[i++] = out[2]; d[i++] = 255
    }
    if (y % rows === rows - 1) yield
  }
  cv.g.putImageData(img, 0, 0)
  return img
}

/** Esegue un generatore fino in fondo e restituisce il suo valore di ritorno. */
export function drain(gen) {
  for (;;) {
    const r = gen.next()
    if (r.done) return r.value
  }
}

/** Media sRGB (0-1) di un canale del canvas; serve a compensare la moltiplicazione colore x mappa. */
export function meanSrgb(img) {
  const d = img.data
  let s = 0
  const step = 4 * 7
  let n = 0
  for (let i = 0; i < d.length; i += step) { s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++ }
  return s / n / 255
}

/** Valore lineare di un grigio sRGB 0-1. */
export function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** Grigio sRGB 0-1 di un valore lineare. */
export function linearToSrgb(v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

/**
 * Venature spezzate: segmenti a passo casuale, ripetuti sui bordi per restare periodiche.
 * Il colore del filo dipende dalla luminosità del fondo nel punto di partenza.
 * @param {CanvasRenderingContext2D} g
 * @param {ImageData} img fondo già disegnato (per campionare)
 * @param {number} size lato del canvas (quadrato)
 * @param {() => number} rand
 * @param {{count: number, len: number, width: number, light: string, dark: string}} o
 */
export function drawVeins(g, img, size, rand, o) {
  g.lineCap = 'round'
  for (let n = 0; n < o.count; n++) {
    let x = rand() * size, y = rand() * size
    let ang = rand() * Math.PI
    const base = img.data[((y | 0) * size + (x | 0)) * 4] / 255
    const color = base > 0.55 ? o.dark : o.light
    const total = o.len * (0.5 + rand())
    let done = 0
    const w = o.width * (0.5 + rand())
    while (done < total) {
      const seg = 6 + rand() * 22
      ang += (rand() - 0.5) * 0.7
      const nx = x + Math.cos(ang) * seg, ny = y + Math.sin(ang) * seg
      if (rand() > 0.22) {
        g.strokeStyle = color
        g.lineWidth = w * (0.6 + rand() * 0.8)
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          g.beginPath()
          g.moveTo(x + ox * size, y + oy * size)
          g.lineTo(nx + ox * size, ny + oy * size)
          g.stroke()
        }
      }
      x = nx; y = ny; done += seg
    }
  }
}
