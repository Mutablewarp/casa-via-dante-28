/** Texture di superficie generate una volta: cache, nuvole delle pareti, grana, marmo, klinker. */
import { rng, vnoise, rgb, fillPixels, fillPixelsG, drain, makeCanvas, meanSrgb, srgbToLinear, drawVeins, hash2 } from './noise.js'

/** Metri coperti da una ripetizione della texture delle pareti (nuvole) e di quella fine. */
export const CLOUD_METERS = 4
export const FINE_METERS = 1

/**
 * Cache di texture per chiave. `sweep` libera dalla GPU quelle non più usate, ma le tiene in memoria:
 * se servono di nuovo vengono ricaricate senza ridisegnare il canvas.
 */
export function createStore() {
  const map = new Map()
  return {
    /** Restituisce la texture in cache o la crea con `make()`. */
    get(key, make) {
      let t = map.get(key)
      if (!t) { t = make(); map.set(key, t) }
      return t
    },
    has: (key) => map.has(key),
    set: (key, t) => { map.set(key, t) },
    /** `dispose()` di ogni texture che non è nell'insieme `used`. */
    sweep(used) {
      for (const t of map.values()) if (!used.has(t)) t.dispose()
    },
    size: () => map.size,
  }
}

/**
 * Trasforma un canvas in texture: sRGB, ripetizione, anisotropia.
 * @param {object} THREE
 * @param {HTMLCanvasElement} canvas
 * @param {{ meters?: number|[number, number], aniso?: number, gray?: number }} o `meters`: lato reale coperto
 *   (1 unità UV = 1 m, quindi repeat = 1 / meters); `gray`: media sRGB per compensare il colore (userData.gain).
 */
export function canvasTexture(THREE, canvas, o = {}) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = o.aniso ?? 1
  if (o.meters) {
    const [mx, my] = Array.isArray(o.meters) ? o.meters : [o.meters, o.meters]
    t.repeat.set(1 / mx, 1 / my)
  }
  t.userData.gain = o.gray ? 1 / Math.max(0.2, srgbToLinear(o.gray)) : 1
  return t
}

/** Nuvola periodica a più ottave, in [0,1]. `cells`: celle di reticolo per periodo della prima ottava. */
function cloud(u, v, seed, cells) {
  let s = 0, wsum = 0
  const oct = [[cells, 0.5], [cells * 1.5, 0.3], [cells * 2.5, 0.2]]
  for (let k = 0; k < oct.length; k++) {
    const f = Math.round(oct[k][0])
    s += vnoise(u * f, v * f, f, seed + k * 17) * oct[k][1]
    wsum += oct[k][1]
  }
  return s / wsum
}

/**
 * Terre Fiorentine: nuvole larghe 0,6-1,2 m (periodo 4 m) con velo di pennellate larghe.
 * Il grigio centrale lascia spazio al contrasto: il colore della stanza si moltiplica sulla mappa.
 * @param {object} THREE @param {number} variant 0..2 @param {number} contrast da `wallFinish.contrast`
 */
export function* wallCloudG(THREE, variant, contrast) {
  const N = 512
  const cv = makeCanvas(N, N)
  const amp = contrast * 0.6
  const center = 0.935
  yield* fillPixelsG(cv, (x, y, out) => {
    const n = cloud(x / N, y / N, 100 + variant * 31, 4)
    const g = (center + (n - 0.5) * 1.8 * amp) * 255
    out[0] = out[1] = out[2] = g
  })
  // velo di pennellate larghe incrociate, appena visibili
  const rand = rng(900 + variant)
  const g = cv.g
  g.lineCap = 'butt'
  for (let i = 0; i < 70; i++) {
    const x = rand() * N, y = rand() * N, ang = (rand() < 0.5 ? 0.55 : -0.5) + (rand() - 0.5) * 0.4
    const len = 120 + rand() * 220
    g.lineWidth = 10 + rand() * 20
    g.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.018)'
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      g.beginPath()
      g.moveTo(x + ox * N, y + oy * N)
      g.lineTo(x + ox * N + Math.cos(ang) * len, y + oy * N + Math.sin(ang) * len)
      g.stroke()
    }
  }
  const mean = meanSrgb(g.getImageData(0, 0, N, N))
  return canvasTexture(THREE, cv.canvas, { meters: CLOUD_METERS, gray: mean, aniso: 4 })
}

/** Versione sincrona di `wallCloudG`. */
export const wallCloud = (THREE, variant, contrast) => drain(wallCloudG(THREE, variant, contrast))

/** Grana finissima (±1,5 %) per pittura liscia e intonaco: periodo 1 m. */
export function fineNoise(THREE) {
  const N = 256
  const cv = makeCanvas(N, N)
  const img = fillPixels(cv, (x, y, out) => {
    const n = hash2(x, y, 7) * 0.6 + vnoise(x / 4, y / 4, N / 4, 3) * 0.4
    out[0] = out[1] = out[2] = (0.985 - 0.03 * (n - 0.5) * 2) * 255
  })
  return canvasTexture(THREE, cv.canvas, { meters: FINE_METERS, gray: meanSrgb(img), aniso: 2 })
}

/** Venatura del legno: bande longitudinali (asse v), qualche nodo. Moltiplica il colore del token. */
export function woodGrain(THREE) {
  const W = 512, H = 512
  const cv = makeCanvas(W, H)
  // le UV dei mobili coprono l'intera faccia (non 1 m): per non vedere onde larghe le fibre sono fitte e poco ondulate
  fillPixels(cv, (x, y, out) => {
    const u = x / W, v = y / H
    const warp = vnoise(u * 3, v * 2, 0, 5) * 0.5
    const band = Math.sin((u * 90 + warp * 3 + vnoise(u * 16, v * 5, 0, 9) * 0.8) * Math.PI)
    const fine = vnoise(u * 220, v * 6, 0, 21)
    const g = 0.92 + 0.035 * band + 0.05 * (fine - 0.5)
    out[0] = out[1] = out[2] = Math.min(1, g) * 255
  })
  const rand = rng(77)
  for (let k = 0; k < 3; k++) {
    const x = rand() * W, y = rand() * H
    const gr = cv.g.createRadialGradient(x, y, 0, x, y, 16 + rand() * 12)
    gr.addColorStop(0, 'rgba(40,25,10,0.28)'); gr.addColorStop(1, 'rgba(40,25,10,0)')
    cv.g.fillStyle = gr
    cv.g.save(); cv.g.translate(x, y); cv.g.scale(0.45, 1.6); cv.g.translate(-x, -y)
    cv.g.fillRect(x - 40, y - 40, 80, 80)
    cv.g.restore()
  }
  const mean = meanSrgb(cv.g.getImageData(0, 0, W, H))
  return canvasTexture(THREE, cv.canvas, { gray: mean, aniso: 4 })
}

/**
 * Marmo: colore pieno con nuvola e venature chiare o scure (secondo il fondo). Colore già dentro il canvas:
 * il materiale resta bianco. @param {string} hex colore base
 */
export function* marbleG(THREE, hex, seed = 1) {
  const N = 512
  const base = rgb(hex)
  const cv = makeCanvas(N, N)
  const img = yield* fillPixelsG(cv, (x, y, out) => {
    const n = cloud(x / N, y / N, seed, 3)
    const k = 1 + (n - 0.5) * 0.12
    out[0] = Math.min(255, base[0] * k); out[1] = Math.min(255, base[1] * k); out[2] = Math.min(255, base[2] * k)
  })
  drawVeins(cv.g, img, N, rng(seed * 13 + 5), {
    count: 22, len: 260, width: 1.5, light: 'rgba(255,255,255,0.55)', dark: 'rgba(70,72,76,0.4)',
  })
  return canvasTexture(THREE, cv.canvas, { aniso: 4 })
}

/** Versione sincrona di `marbleG`. */
export const marble = (THREE, hex, seed = 1) => drain(marbleG(THREE, hex, seed))

/**
 * Klinker: listelli verticali rigati 24 x 48 cm, in bruno con tono variabile e fughe scure.
 * Cella 4 x 2 listelli (0,96 x 0,96 m): 1 unità UV = 1 m.
 * @param {string} hex colore base @param {{ribs:number, tile:[number, number]}} def
 */
export function klinker(THREE, hex, def) {
  const [tw, th] = def.tile
  const cols = 4, rows = 2
  const wM = tw * cols, hM = th * rows
  const ppm = 1024 / Math.max(wM, hM)
  const cv = makeCanvas(Math.round(wM * ppm), Math.round(hM * ppm))
  const base = rgb(hex)
  fillPixels(cv, (x, y, out) => {
    const mx = x / ppm, my = y / ppm
    const ci = Math.floor(mx / tw), ri = Math.floor(my / th)
    const lx = mx - ci * tw, ly = my - ri * th
    const tone = 0.88 + hash2(ci, ri, 31) * 0.24
    // rigatura: ogni costola è un profilo smussato, chiaro a sinistra e scuro a destra
    const rib = (lx % def.ribs) / def.ribs
    const shade = 1.08 - 0.3 * rib * rib
    const grain = 0.96 + hash2(x, y, 4) * 0.08
    const edge = Math.min(lx, tw - lx, ly, th - ly)
    let k = tone * shade * grain
    if (edge < 0.0045) k *= 0.35
    out[0] = Math.min(255, base[0] * k); out[1] = Math.min(255, base[1] * k); out[2] = Math.min(255, base[2] * k)
  })
  return canvasTexture(THREE, cv.canvas, { meters: [wM, hM], aniso: 4 })
}

/**
 * Facciata neutra dell'edificio confinante: intonaco chiaro con una finestra per campata (3,2 x 3 m),
 * cornice, davanzale e vetro scuro. UV dei muri: u lungo il muro, v = quota; il colore del token moltiplica la mappa.
 * @param {object} THREE @param {number} floorH altezza di un piano (m)
 */
export function contextFacade(THREE, floorH = 3) {
  const bay = 3.2, ppm = 80
  const cv = makeCanvas(Math.round(bay * ppm), Math.round(floorH * ppm))
  const g = cv.g
  const Y = (v) => (floorH - v) * ppm // quota -> pixel (v cresce verso l'alto)
  g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, cv.w, cv.h)
  g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, Y(0.35), cv.w, 0.35 * ppm) // zoccolo
  const cx = cv.w / 2, ww = 1.15 * ppm
  const top = Y(2.55), bot = Y(0.95)
  g.fillStyle = '#c9c2b4'; g.fillRect(cx - ww / 2 - 6, bot, ww + 12, 7) // davanzale
  g.fillStyle = '#fbfaf6'; g.fillRect(cx - ww / 2 - 5, top - 5, ww + 10, bot - top + 5) // cornice
  g.fillStyle = '#2f3b46'; g.fillRect(cx - ww / 2, top, ww, bot - top) // vetro
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(cx - ww / 2, top, ww * 0.45, (bot - top) * 0.5)
  g.fillStyle = '#fbfaf6'; g.fillRect(cx - 2, top, 4, bot - top); g.fillRect(cx - ww / 2, (top + bot) / 2 - 2, ww, 4)
  const mean = meanSrgb(g.getImageData(0, 0, cv.w, cv.h))
  return canvasTexture(THREE, cv.canvas, { meters: [bay, floorH], gray: mean, aniso: 4 })
}
