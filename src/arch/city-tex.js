/** Texture da canvas della città: intonaco, coppi, asfalto, lastre, fogliame, ringhiere (tutte ripetibili). */
import * as THREE from 'three'

/**
 * Canvas e contesto 2D.
 * @param {number} w @param {number} h
 * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
 */
export function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

/**
 * Texture ripetibile da canvas.
 * @param {HTMLCanvasElement} cv @param {number} aniso
 * @param {{ data?: boolean, clampT?: boolean }} [o] `data` = mappa non di colore (normali, rugosità)
 * @returns {THREE.CanvasTexture}
 */
export function texOf(cv, aniso, o = {}) {
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = o.clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping
  t.anisotropy = aniso
  return t
}

/** Numero pseudo-casuale in [0, 1) da due interi e un seme. */
export function hash(x, y, s = 0) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 362437)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Rumore a valori su reticolo periodico (`px` × `py` celle): si ripete senza giunte. */
export function vnoise(x, y, px, py, s = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const x0 = xi % px
  const x1 = (xi + 1) % px
  const y0 = yi % py
  const y1 = (yi + 1) % py
  const a = hash(x0, y0, s)
  const b = hash(x1, y0, s)
  const c = hash(x0, y1, s)
  const d = hash(x1, y1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Riempie un canvas pixel per pixel: `fn(x, y, out)` scrive r, g, b (0-255) in `out`. */
function pixels(n, fn) {
  const [cv, g] = canvas(n)
  const img = g.createImageData(n, n)
  const d = img.data
  const out = [0, 0, 0]
  for (let y = 0, i = 0; y < n; y++) {
    for (let x = 0; x < n; x++, i += 4) {
      fn(x, y, out)
      d[i] = out[0]
      d[i + 1] = out[1]
      d[i + 2] = out[2]
      d[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return [cv, g]
}

/**
 * Mappa di normali da un campo di altezze periodico.
 * @param {number} n lato @param {(x: number, y: number) => number} hf altezza in [0, 1] @param {number} k forza
 * @returns {HTMLCanvasElement}
 */
export function normalMap(n, hf, k) {
  const h = new Float32Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = hf(x, y)
  const at = (x, y) => h[((y + n) % n) * n + ((x + n) % n)]
  return pixels(n, (x, y, o) => {
    const dx = (at(x + 1, y) - at(x - 1, y)) * k
    const dy = (at(x, y + 1) - at(x, y - 1)) * k
    const l = 1 / Math.hypot(dx, dy, 1)
    o[0] = (-dx * l * 0.5 + 0.5) * 255
    o[1] = (dy * l * 0.5 + 0.5) * 255 // il canvas ha y verso il basso, la texture verso l'alto
    o[2] = (l * 0.5 + 0.5) * 255
  })[0]
}

/** Altezza di un canvas in grigi (canale rosso), per ricavarne le normali. */
export function heightOf(cv) {
  const n = cv.width
  const d = cv.getContext('2d').getImageData(0, 0, n, n).data
  return (x, y) => d[(y * n + x) * 4] / 255
}

const N = 512

/** Intonaco quasi bianco (da tingere): macchie larghe, grana e leggere colature verticali. Copre 4 × 4 m. */
export function stucco() {
  const f = (x, y) => {
    const blot = vnoise(x / 64, y / 64, 8, 8, 1) - 0.5
    const mid = vnoise(x / 16, y / 16, 32, 32, 2) - 0.5
    const streak = Math.max(0, vnoise(x / 4, y / 128, 128, 4, 3) - 0.62)
    return 0.925 + blot * 0.07 + mid * 0.04 + (hash(x, y, 4) - 0.5) * 0.035 - streak * 0.22
  }
  const map = pixels(N, (x, y, o) => {
    const v = f(x, y) * 255
    o[0] = v
    o[1] = v * 0.995
    o[2] = v * 0.985
  })[0]
  const nor = normalMap(N, (x, y) => vnoise(x / 4, y / 4, 128, 128, 5) * 0.6 + hash(x, y, 6) * 0.4, 1.1)
  return { map, nor }
}

const COPPI = [[200, 100, 62], [186, 86, 50], [208, 121, 76], [172, 78, 48], [204, 136, 94], [190, 106, 70]]

/** Coppi siciliani: 16 file convesse × 8 corsi sovrapposti su 3,2 × 3,2 m; v sale lungo la falda. */
export function coppi() {
  const COLS = 16
  const ROWS = 8
  const part = (x, y) => {
    const cu = (x / N) * COLS
    const cv = (y / N) * ROWS
    return [Math.floor(cu), Math.floor(cv), cu % 1, cv % 1]
  }
  const hf = (x, y) => {
    const [, , fu, fv] = part(x, y)
    return Math.sin(Math.PI * fu) ** 0.8 * 0.75 + fv * 0.25
  }
  const map = pixels(N, (x, y, o) => {
    const [c, r, fu, fv] = part(x, y)
    const base = COPPI[Math.floor(hash(c, r, 11) * COPPI.length)]
    const tone = 0.86 + hash(c, r, 12) * 0.26
    const weather = 0.9 + (vnoise(x / 128, y / 128, 4, 4, 13) - 0.5) * 0.3
    const prof = 0.5 + 0.5 * Math.sin(Math.PI * fu) ** 0.6 // canale in ombra tra due coppi
    const lap = fv < 0.07 ? 0.66 : 1 // ombra del corso sovrapposto
    const k = tone * weather * prof * lap * (0.95 + hash(x, y, 14) * 0.1)
    const lichen = vnoise(x / 32, y / 32, 16, 16, 15) > 0.74 ? 0.35 : 0
    for (let i = 0; i < 3; i++) o[i] = Math.min(255, (base[i] * (1 - lichen) + 150 * lichen) * k)
  })[0]
  return { map, nor: normalMap(N, hf, 3.2) }
}

/** Asfalto (16 × 16 m): grana, chiazze, rappezzi e crepe leggere. Grigio da tingere. */
export function asphalt() {
  const [cv, g] = pixels(N, (x, y, o) => {
    const blot = vnoise(x / 64, y / 64, 8, 8, 21) - 0.5
    const lane = vnoise(x / 256, y / 32, 2, 16, 22) - 0.5 // strisciate lungo il senso di marcia
    const v = (0.42 + blot * 0.07 + lane * 0.05 + (hash(x, y, 23) - 0.5) * 0.1) * 255
    o[0] = v
    o[1] = v
    o[2] = v * 1.03
  })
  const r = (s) => hash(s, 7, 24)
  for (let k = 0; k < 5; k++) { // rappezzi: rettangoli con bordo scuro
    const [x, y, w, h] = [40 + r(k) * 380, 40 + r(k + 9) * 380, 30 + r(k + 18) * 70, 18 + r(k + 27) * 40]
    g.fillStyle = `rgba(${k % 2 ? '30,30,34' : '150,150,152'},0.16)`
    g.fillRect(x, y, w, h)
    g.strokeStyle = 'rgba(20,20,22,0.3)'
    g.lineWidth = 1
    g.strokeRect(x, y, w, h)
  }
  g.strokeStyle = 'rgba(18,18,20,0.4)'
  for (let k = 0; k < 7; k++) { // crepe
    let [x, y] = [30 + r(k + 40) * 450, 30 + r(k + 50) * 450]
    g.beginPath()
    g.moveTo(x, y)
    for (let i = 0; i < 6; i++) g.lineTo((x += (r(k * 7 + i + 60) - 0.3) * 26), (y += (r(k * 7 + i + 90) - 0.5) * 22))
    g.stroke()
  }
  return cv
}

/** Lastre di marciapiede 40 × 40 cm (4 × 4 lastre su 1,6 m), chiare, con fughe e grana. */
export function paving() {
  const n = 256
  return pixels(n, (x, y, o) => {
    const [c, r] = [Math.floor(x / 64), Math.floor(y / 64)]
    const joint = x % 64 < 2 || y % 64 < 2 ? 0.72 : 1
    const v = (0.84 + (hash(c, r, 31) - 0.5) * 0.09 + (hash(x, y, 32) - 0.5) * 0.07 + (vnoise(x / 32, y / 32, 8, 8, 33) - 0.5) * 0.06) * joint * 255
    o[0] = o[1] = o[2] = v
  })[0]
}

/** Fogliame: macchie di foglie chiare e scure in grigio-verde, da tingere con il colore dell'istanza. */
export function foliage() {
  const n = 256
  const [cv, g] = canvas(n)
  g.fillStyle = '#5d6f52'
  g.fillRect(0, 0, n, n)
  for (let k = 0; k < 1500; k++) {
    const x = hash(k, 1, 41) * n
    const y = hash(k, 2, 41) * n
    const l = 110 + hash(k, 3, 41) * 145
    g.fillStyle = `rgb(${l * 0.86},${l},${l * 0.72})`
    for (const [dx, dy] of [[0, 0], [n, 0], [0, n], [-n, 0], [0, -n]]) {
      g.beginPath()
      g.ellipse(x + dx, y + dy, 3 + hash(k, 4, 41) * 5, 1.6 + hash(k, 5, 41) * 2.4, hash(k, 6, 41) * Math.PI, 0, Math.PI * 2)
      g.fill()
    }
  }
  return cv
}

/**
 * Ringhiere su fondo trasparente, bianche (da tingere), ripetibili in orizzontale ogni 1,76 m:
 * metà alta (v da 0,5 a 1) ferro a bacchette, metà bassa (v da 0 a 0,5) balaustra in pietra.
 */
export function rail() {
  const n = 256
  const h = 126 // altezza utile di ogni metà (2 px di margine trasparente)
  const [cv, g] = canvas(n)
  g.fillStyle = 'rgba(255,255,255,0.004)' // bianco invisibile: evita gli aloni scuri ai bordi nelle mip
  g.fillRect(0, 0, n, n)
  g.fillStyle = '#fff'
  // ferro: corrimano, due correnti, sedici bacchette con un ricciolo tra i correnti alti
  g.fillRect(0, 1, n, 5)
  g.fillRect(0, 17, n, 3)
  g.fillRect(0, h - 8, n, 4)
  for (let x = 8; x < n; x += 16) {
    g.fillRect(x - 1.5, 1, 3, h - 5)
    g.beginPath()
    g.arc(x + 8, 11.5, 4, 0, Math.PI * 2)
    g.lineWidth = 1.6
    g.strokeStyle = '#fff'
    g.stroke()
  }
  // pietra: cimasa, zoccolo e otto balaustri a vaso
  const y0 = 130
  g.fillRect(0, y0, n, 16)
  g.fillRect(0, y0 + h - 14, n, 14)
  for (let x = 16; x < n; x += 32) {
    const grad = g.createLinearGradient(x - 9, 0, x + 9, 0)
    grad.addColorStop(0, '#b9b9b9')
    grad.addColorStop(0.45, '#fff')
    grad.addColorStop(1, '#a8a8a8')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(x - 4, y0 + 16)
    g.bezierCurveTo(x - 5, y0 + 40, x - 13, y0 + 62, x - 8, y0 + 88)
    g.lineTo(x - 5, y0 + h - 14)
    g.lineTo(x + 5, y0 + h - 14)
    g.lineTo(x + 8, y0 + 88)
    g.bezierCurveTo(x + 13, y0 + 62, x + 5, y0 + 40, x + 4, y0 + 16)
    g.fill()
  }
  return cv
}
