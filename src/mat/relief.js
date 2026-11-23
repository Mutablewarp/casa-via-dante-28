/**
 * Rilievo delle superfici: da una mappa di altezze ripetibile ai bordi a normalMap (Sobel con avvolgimento)
 * e roughnessMap. Le normali valgono senza tangenti: bastano le UV (three ricava il riferimento dalle derivate).
 *
 * Convenzioni: i buffer sono `Float32Array` riga per riga con la riga 0 in alto, come un canvas (indice `y * w + x`);
 * le altezze sono in metri; la rugosità è un fattore 0..1 che moltiplica `material.roughness` (canale G).
 */
import { makeCanvas } from './noise.js'

/** Texture di dati (non colore) da pixel RGBA, ripetibile. */
function dataTexture(THREE, px, w, h, o) {
  const cv = makeCanvas(w, h)
  cv.g.putImageData(new ImageData(px, w, h), 0, 0)
  const t = new THREE.CanvasTexture(cv.canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = o.aniso ?? 1
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1])
  return t
}

/**
 * NormalMap da una mappa di altezze. Le pendenze sono codificate amplificate, così anche un rilievo
 * minimo usa bene gli 8 bit; `userData.normalScale` è il valore di `material.normalScale` che le riporta al vero.
 * @param {object} THREE @param {Float32Array} hm altezze in metri @param {number} w @param {number} h
 * @param {number} mx @param {number} my metri coperti dalla mappa
 * @param {{ repeat?: [number, number], aniso?: number }} [o]
 */
export function normalMap(THREE, hm, w, h, mx, my, o = {}) {
  const kx = w / mx / 8, ky = h / my / 8 // Sobel: somma dei pesi 8, passo del texel in metri
  const sx = new Float32Array(w * h), sy = new Float32Array(w * h)
  let max = 1e-6
  for (let y = 0; y < h; y++) {
    const a = ((y + h - 1) % h) * w, b = y * w, c = ((y + 1) % h) * w
    for (let x = 0; x < w; x++) {
      const l = (x + w - 1) % w, r = (x + 1) % w
      const gx = (hm[a + r] + 2 * hm[b + r] + hm[c + r] - hm[a + l] - 2 * hm[b + l] - hm[c + l]) * kx
      const gy = (hm[c + l] + 2 * hm[c + x] + hm[c + r] - hm[a + l] - 2 * hm[a + x] - hm[a + r]) * ky
      sx[b + x] = gx; sy[b + x] = gy
      if (gx > max) max = gx; else if (-gx > max) max = -gx
      if (gy > max) max = gy; else if (-gy > max) max = -gy
    }
  }
  const gain = 1.5 / max // la pendenza massima sta a circa 56° nella mappa
  const px = new Uint8ClampedArray(w * h * 4)
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    // riga 0 in alto e flipY: v cresce verso l'alto, quindi -dh/dv = +dh/dy
    const nx = -sx[i] * gain, ny = sy[i] * gain
    const k = 127.5 / Math.sqrt(nx * nx + ny * ny + 1)
    px[j] = 127.5 + nx * k; px[j + 1] = 127.5 + ny * k; px[j + 2] = 127.5 + k; px[j + 3] = 255
  }
  const t = dataTexture(THREE, px, w, h, o)
  t.userData.normalScale = 1 / gain
  return t
}

/**
 * RoughnessMap da fattori 0..1 (moltiplicano `material.roughness`).
 * @param {object} THREE @param {Float32Array} rm @param {number} w @param {number} h @param {{ repeat?: [number, number], aniso?: number }} [o]
 */
export function roughnessMap(THREE, rm, w, h, o = {}) {
  const px = new Uint8ClampedArray(w * h * 4)
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    px[j] = px[j + 1] = px[j + 2] = rm[i] * 255
    px[j + 3] = 255
  }
  return dataTexture(THREE, px, w, h, o)
}

/** Dimezza un buffer (media 2 x 2); `w` e `h` devono essere pari. */
function halve(b, w, h) {
  const W = w >> 1, H = h >> 1, out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = 2 * y * w + 2 * x
    out[y * W + x] = (b[i] + b[i + 1] + b[i + w] + b[i + w + 1]) / 4
  }
  return out
}

const shared = new Map() // geometria del motivo -> { n, r }
const fits = new WeakMap() // texture base -> copie con un'altra `repeat`

/** La stessa immagine con la `repeat` di `tex`: le copie condividono la sorgente, quindi in GPU c'è una texture sola. */
export function fitRepeat(base, repeat) {
  if (base.repeat.equals(repeat)) return base
  const key = `${repeat.x},${repeat.y}`
  let m = fits.get(base)
  if (!m) fits.set(base, (m = new Map()))
  let t = m.get(key)
  if (!t) {
    t = base.clone()
    t.repeat.copy(repeat)
    t.needsUpdate = true
    m.set(key, t)
  }
  return t
}

/**
 * Buffer in cui un generatore scrive il rilievo del motivo `key` mentre disegna il colore; `null` se quel
 * motivo ha già le sue mappe (due pavimenti con la stessa posa e colori diversi condividono il rilievo).
 * @param {string} key geometria del motivo @param {number} w @param {number} h @param {boolean} [rough] serve anche la rugosità
 * @returns {{ hm: Float32Array, rm: Float32Array|null, w: number, h: number }|null}
 */
export function reliefBuffers(key, w, h, rough = false) {
  if (shared.has(key)) return null
  return { hm: new Float32Array(w * h), rm: rough ? new Float32Array(w * h).fill(1) : null, w, h }
}

/**
 * Chiude il rilievo di `key` (se `buf` non è null) e lo aggancia alla mappa di colore:
 * `tex.userData.normalMap` e `tex.userData.roughnessMap`, con la stessa `repeat` di `tex`.
 * @param {object} THREE @param {object} tex mappa di colore @param {string} key @param {object|null} buf da `reliefBuffers`
 * @param {[number, number]} meters metri coperti @param {{ aniso?: number, half?: boolean, halfRough?: boolean }} [o]
 *   `half`: mappe a metà risoluzione; `halfRough`: solo la rugosità (varia piano, non serve fine).
 */
export function attachRelief(THREE, tex, key, buf, meters, o = {}) {
  if (buf) {
    let { hm, rm, w, h } = buf
    const even = !(w & 1) && !(h & 1)
    let rw = w, rh = h
    if (rm && even && (o.half || o.halfRough)) { rm = halve(rm, w, h); rw = w >> 1; rh = h >> 1 }
    if (o.half && even) { hm = halve(hm, w, h); w >>= 1; h >>= 1 }
    const t = { repeat: [1 / meters[0], 1 / meters[1]], aniso: o.aniso }
    shared.set(key, { n: normalMap(THREE, hm, w, h, meters[0], meters[1], t), r: rm ? roughnessMap(THREE, rm, rw, rh, t) : null })
  }
  const s = shared.get(key)
  tex.userData.normalMap = fitRepeat(s.n, tex.repeat)
  tex.userData.roughnessMap = s.r ? fitRepeat(s.r, tex.repeat) : null
  return tex
}

/** Profilo di una fuga: fondo piatto largo `gw` e profondo `depth`, poi spalla arrotondata larga `sw` (metri). */
export function joint(edge, gw, depth, sw) {
  if (edge < gw) return -depth
  if (edge >= gw + sw) return 0
  const t = 1 - (edge - gw) / sw
  return -depth * t * t
}
