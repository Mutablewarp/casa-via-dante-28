/** Pavimenti: scacchiera, lastre, doghe, esagoni. Spina di pesce e cementine sono in floors-pattern.js. */
import { rng, rgb, mix, fillPixelsG, drain, makeCanvas, vnoise, hash2, drawVeins, fiber } from './noise.js'
import { canvasTexture } from './textures.js'
import { reliefBuffers, attachRelief, joint } from './relief.js'
import { herringbone, cementine } from './floors-pattern.js'

const mod = (a, n) => ((a % n) + n) % n
const fract = (v) => v - Math.floor(v)
const even = (v) => Math.round(v / 2) * 2
const LIP = 0.0024 // marmo e gres: differenza massima di pendenza tra una lastra e l'altra

/** Fuga: mescola `c` verso `grout` secondo la distanza `edge` (m) dal bordo della piastrella. */
function withGrout(c, grout, edge, gw, strength) {
  if (edge >= gw) return c
  return mix(c, grout, (1 - edge / gw) * strength)
}

/** Scacchiera di marmo in diagonale (o diritta): cella di 2 x 2 piastrelle per variare i toni. Lucida, fuga sottilissima. */
function* checker(THREE, def) {
  const T = def.tile
  const diag = def.diagonal !== false
  const cell = diag ? 2 * T * Math.SQRT2 : 4 * T
  const size = 1024, ppm = size / cell
  const A = rgb(def.a), B = rgb(def.b)
  const grout = def.border ? mix(rgb(def.border), [90, 90, 92], 0.4) : mix(B, [20, 20, 20], 0.4)
  const cv = makeCanvas(size, size)
  const relKey = `checker:${diag}`
  const rel = reliefBuffers(relKey, size, size)
  const S = Math.SQRT1_2
  const img = yield* fillPixelsG(cv, (px, py, out) => {
    const x = (px + 0.5) / ppm, y = (py + 0.5) / ppm
    const s = diag ? (x + y) * S : x, t = diag ? (x - y) * S : y
    const i = Math.floor(s / T), j = Math.floor(t / T)
    const odd = mod(i + j, 2)
    // chiave periodica: le traslazioni del reticolo cambiano (i+j) e (i-j) di multipli di 4
    const ka = mod(i + j, 4), kb = mod(i - j, 4)
    const base = odd ? B : A
    const k = 0.95 + hash2(ka, kb, 5) * 0.08 + 0.05 * (vnoise(px / 40, py / 40, 0, 3) - 0.5)
    const fs = fract(s / T), ft = fract(t / T)
    const edge = Math.min(fs, 1 - fs, ft, 1 - ft) * T
    const c = withGrout([base[0] * k, base[1] * k, base[2] * k], grout, edge, 0.0016, 0.7)
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2]
    if (rel) rel.hm[py * size + px] = ((hash2(ka, kb, 61) - 0.5) * (fs - 0.5) + (hash2(ka, kb, 62) - 0.5) * (ft - 0.5)) * LIP * T + joint(edge, 0.0006, 0.0003, 0.001)
  })
  if (def.veins) {
    drawVeins(cv.g, img, size, rng(41), {
      count: 40, len: 340, width: 1.8, light: 'rgba(255,255,255,0.5)', dark: 'rgba(60,62,66,0.38)',
    })
  }
  const tex = canvasTexture(THREE, cv.canvas, { meters: cell, aniso: 4, albedo: true })
  return attachRelief(THREE, tex, relKey, rel, [cell, cell], { aniso: 4, half: true })
}

/** Lastre quadrate (gres, marmo): cella 2 x 2 lastre con tono e venature proprie. */
function* slab(THREE, def) {
  const T = def.tile, cell = 2 * T
  const size = 1024, ppm = size / cell
  const A = rgb(def.a)
  const grout = mix(A, [60, 60, 62], 0.45)
  const cv = makeCanvas(size, size)
  const rel = reliefBuffers('slab', size, size)
  const img = yield* fillPixelsG(cv, (px, py, out) => {
    const x = (px + 0.5) / ppm, y = (py + 0.5) / ppm
    const i = Math.floor(x / T), j = Math.floor(y / T)
    const k = 0.95 + hash2(i, j, 13) * 0.08 + 0.06 * (vnoise(px / 70, py / 70, size / 70, 9) - 0.5)
    const fx = fract(x / T), fy = fract(y / T)
    const edge = Math.min(fx, 1 - fx, fy, 1 - fy) * T
    const c = withGrout([A[0] * k, A[1] * k, A[2] * k], grout, edge, 0.0015, 0.6)
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2]
    if (rel) rel.hm[py * size + px] = ((hash2(i, j, 63) - 0.5) * (fx - 0.5) + (hash2(i, j, 64) - 0.5) * (fy - 0.5)) * LIP * T + joint(edge, 0.0008, 0.0004, 0.0012)
  })
  if (def.veins) {
    drawVeins(cv.g, img, size, rng(23), {
      count: 26, len: 300, width: 1.4, light: 'rgba(255,255,255,0.5)', dark: 'rgba(80,82,86,0.3)',
    })
  }
  const tex = canvasTexture(THREE, cv.canvas, { meters: cell, aniso: 4, albedo: true })
  return attachRelief(THREE, tex, 'slab', rel, [cell, cell], { aniso: 4, half: true })
}

/**
 * Doghe parallele (asse x) con giunti sfalsati: una sola doga per fila nella cella. Fibra fine lungo la doga,
 * fuga incisa con smusso, tono, pendenza e lucido diversi da una doga all'altra. Le doghe da esterno
 * (rugosità da 0,75 in su: il deck) hanno la fessura larga e la spazzolatura più marcata.
 */
function* planks(THREE, def) {
  const [w, l] = def.stave
  const rows = Math.max(4, Math.round(l / w))
  const W = l, H = rows * w
  const ppm = 1024 / Math.max(W, H)
  const cv = makeCanvas(even(W * ppm), even(H * ppm))
  const A = rgb(def.a), B = rgb(def.b)
  const deck = (def.roughness ?? 0) >= 0.75
  const gw = deck ? 0.0028 : 0.0012 // mezza fuga
  const relKey = `planks:${w}:${l}:${deck}`
  const rel = reliefBuffers(relKey, cv.w, cv.h, true)
  const rowOff = Array.from({ length: rows }, (_, r) => hash2(r, 1, 17) * W)
  yield* fillPixelsG(cv, (px, py, out) => {
    const x = (px + 0.5) * (W / cv.w), y = (py + 0.5) * (H / cv.h)
    const r = Math.min(rows - 1, Math.floor(y / w))
    const across = (y - r * w) / w
    const along = mod(x - rowOff[r], W)
    const c0 = mix(A, B, hash2(r, 2, 29))
    const fib = def.grain ? fiber(across * w, along, r * 7 + 1) : 0
    const k = (0.95 + hash2(r, 3, 31) * 0.1) * (1 + 0.04 * fib)
    const lat = Math.min(across * w, (1 - across) * w)
    const edge = Math.min(lat, along, W - along)
    const t = edge < gw ? Math.min(1, (1 - edge / gw) * (deck ? 3 : 1)) * (lat < gw ? 0.5 : 0.4) : 0
    out[0] = c0[0] * k * (1 - t); out[1] = c0[1] * k * (1 - t); out[2] = c0[2] * k * (1 - t)
    if (!rel) return
    const q = py * cv.w + px
    rel.hm[q] = (hash2(r, 4, 71) - 0.5) * 0.008 * (across - 0.5) * w
      + (deck ? joint(edge, 0.002, 0.004, 0.003) + fib * 0.00012 : joint(edge, 0.0004, 0.0004, 0.0016) + fib * 0.00003)
    rel.rm[q] = edge < gw ? 1 : Math.min(1, 0.74 + 0.24 * hash2(r, 5, 72) + 0.05 * fib)
  })
  const tex = canvasTexture(THREE, cv.canvas, { meters: [W, H], aniso: 4, albedo: true })
  return attachRelief(THREE, tex, relKey, rel, [W, H], { aniso: 4, halfRough: true })
}

/** Esagoni (reticolo triangolare): cella di 4 x 2 passi, la piastrella più vicina vince. Fuga incassata, bordo arrotondato. */
function* hex(THREE, def) {
  const d = def.tile
  const h = d * Math.sqrt(3) / 2
  const W = 4 * d, H = 4 * h
  const cv = makeCanvas(1024, even((H * 1024) / W))
  const A = rgb(def.a), B = rgb(def.b)
  const grout = mix(B, [120, 118, 110], 0.5)
  const rel = reliefBuffers('hex', cv.w, cv.h)
  yield* fillPixelsG(cv, (px, py, out) => {
    const x = (px + 0.5) * (W / cv.w), y = (py + 0.5) * (H / cv.h)
    const j0 = Math.round(y / h)
    let d1 = 1e9, d2 = 1e9, bi = 0, bj = 0
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const off = mod(j, 2) * d * 0.5
      const i = Math.round((x - off) / d)
      for (let ii = i - 1; ii <= i + 1; ii++) {
        const dx = x - (ii * d + off), dy = y - j * h
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < d1) { d2 = d1; d1 = dist; bi = ii; bj = j } else if (dist < d2) d2 = dist
      }
    }
    const n = hash2(mod(bi, 4), mod(bj, 4), 37)
    const c = mix(A, B, n * 0.9)
    const k = 0.97 + hash2(px, py, 2) * 0.04
    const edge = (d2 - d1) / 2
    const g = withGrout([c[0] * k, c[1] * k, c[2] * k], grout, edge, 0.0014, 0.8)
    out[0] = g[0]; out[1] = g[1]; out[2] = g[2]
    if (rel) rel.hm[py * cv.w + px] = joint(edge, 0.001, 0.0008, 0.003) + (n - 0.5) * 0.0002
  })
  const tex = canvasTexture(THREE, cv.canvas, { meters: [W, H], aniso: 4, albedo: true })
  return attachRelief(THREE, tex, 'hex', rel, [W, H], { aniso: 4, half: true })
}

/** Le cementine sono piccole: generatore finto che non cede mai il passo. */
function* cementineG(THREE, def) { return cementine(THREE, def) }

const PAINTERS = { checker, slab, planks, hex, herringbone, cementine: cementineG }

/**
 * Generatore della texture di un pavimento da una voce di `floorDefs`: cede il passo ogni poche righe.
 * @param {object} THREE @param {object} def voce di floorDefs @returns {Generator|null} null se `kind` è ignoto
 */
export function floorTextureG(THREE, def) {
  const fn = PAINTERS[def.kind]
  return fn ? fn(THREE, def) : null
}

/**
 * Disegna la texture di un pavimento (un metro di UV = un metro reale, repeat già impostata).
 * @param {object} THREE @param {object} def voce di floorDefs @returns {object|null} texture o null se `kind` è ignoto
 */
export function floorTexture(THREE, def) {
  const g = floorTextureG(THREE, def)
  return g ? drain(g) : null
}
