/** Texture di superficie generate una volta: cache, velatura e intonaco delle pareti, legno, marmo, trama dei tessuti. */
import { rng, vnoise, rgb, fillPixels, fillPixelsG, drain, makeCanvas, meanSrgb, srgbToLinear, linearToSrgb, drawVeins, hash2 } from './noise.js'
import { normalMap } from './relief.js'

/** Metri coperti da una ripetizione della velatura (lungo il muro, in altezza) e della grana fine. */
export const CLOUD_METERS = [16, 4]
export const FINE_METERS = 1
/** Grigio medio (lineare) delle mappe che modulano il colore: alto, così la compensazione non satura il colore. */
const MID = 0.86

/**
 * Cache di texture per chiave. `sweep` libera dalla GPU quelle non più usate, ma le tiene in memoria:
 * se servono di nuovo vengono ricaricate senza ridisegnare il canvas. Il rilievo di una mappa di colore
 * (`userData.normalMap`, `userData.roughnessMap`) segue la stessa sorte.
 */
export function createStore() {
  const map = new Map()
  const ms = {} // millisecondi spesi a generare ogni texture nel momento della richiesta (per `ctx.debug.mat`)
  return {
    /** Restituisce la texture in cache o la crea con `make()`. */
    get(key, make) {
      let t = map.get(key)
      if (!t) {
        const t0 = performance.now()
        t = make()
        ms[key.slice(0, 40)] = Math.round(performance.now() - t0)
        map.set(key, t)
      }
      return t
    },
    ms,
    has: (key) => map.has(key),
    set: (key, t) => { map.set(key, t) },
    /** `dispose()` di ogni texture (e del suo rilievo) che non è nell'insieme `used`. */
    sweep(used) {
      for (const t of map.values()) {
        for (const x of [t, t.userData.normalMap, t.userData.roughnessMap]) if (x && !used.has(x)) x.dispose()
      }
    },
    size: () => map.size,
  }
}

/**
 * Trasforma un canvas in texture: sRGB, ripetizione, anisotropia.
 * @param {object} THREE
 * @param {HTMLCanvasElement} canvas
 * @param {{ meters?: number|[number, number], aniso?: number, gray?: number, albedo?: boolean }} o `meters`: lato reale
 *   coperto (1 unità UV = 1 m, quindi repeat = 1 / meters); `gray`: media sRGB per compensare il colore
 *   (userData.gain); `albedo`: il canvas porta il colore vero, i bianchi si fermano a 0,85 lineare.
 */
export function canvasTexture(THREE, canvas, o = {}) {
  if (o.albedo) {
    const g = canvas.getContext('2d')
    g.globalCompositeOperation = 'darken' // minimo canale per canale: 237 = 0,85 lineare
    g.fillStyle = '#ededed'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.globalCompositeOperation = 'source-over'
  }
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
 * Terre Fiorentine: velatura morbida a nuvola, bassa frequenza (macchie di 0,7-1,3 m) e basso contrasto
 * (luminanza entro ±6 %), senza direzione dominante. Una ripetizione copre 16 m di muro per 4 m di altezza:
 * nessuna parete della casa la vede due volte. Il colore della stanza si moltiplica sulla mappa.
 * @param {object} THREE @param {number} contrast da `wallFinish.contrast`
 */
export function* wallCloudG(THREE, contrast) {
  const W = 1024, H = 256, PPM = W / CLOUD_METERS[0]
  const cv = makeCanvas(W, H)
  const amp = Math.min(0.06, contrast * 0.5)
  const img = yield* fillPixelsG(cv, (x, y, out) => {
    const u = x / PPM, v = y / PPM // metri
    // una deformazione lenta scioglie l'allineamento al reticolo del rumore
    const a = u + (vnoise(u * 0.5, v * 0.5, 8, 11, 2) - 0.5)
    const b = v + (vnoise(u * 0.5, v * 0.5, 8, 12, 2) - 0.5)
    const n = vnoise(a * 0.75, b * 0.75, 12, 21, 3) * 0.55 + vnoise(a * 1.5, b * 1.5, 24, 22, 6) * 0.3 + vnoise(a * 3, b * 3, 48, 23, 12) * 0.15
    const t = (n - 0.5) * 4.2
    const k = t / Math.sqrt(1 + t * t) // limite morbido: mai oltre ±amp, senza piatti
    // il rumore di mezzo livello evita le curve di livello degli 8 bit sulle sfumature lente
    out[0] = out[1] = out[2] = linearToSrgb(MID * (1 + amp * k)) * 255 + hash2(x, y, 5) - 0.5
  })
  return canvasTexture(THREE, cv.canvas, { meters: CLOUD_METERS, gray: meanSrgb(img), aniso: 2 })
}

/** Versione sincrona di `wallCloudG`. */
export const wallCloud = (THREE, contrast) => drain(wallCloudG(THREE, contrast))

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

/**
 * Intonaco: normalMap finissima condivisa da pareti, soffitti e facciata. Ondulazione lenta della stesura
 * (decimi di millimetro su 10-25 cm) e grana minuta: si legge appena, in luce radente.
 */
export function plasterNormal(THREE) {
  const N = 512, M = 2.1
  const hm = new Float32Array(N * N)
  for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i++) {
    const u = x / N, v = y / N
    hm[i] = 0.00035 * vnoise(u * 9, v * 9, 9, 31) + 0.00016 * vnoise(u * 28, v * 28, 28, 32)
      + 0.00007 * vnoise(u * 110, v * 110, 110, 33) + 0.00003 * hash2(x, y, 34)
  }
  // periodi diversi lungo il muro e in altezza: la ripetizione non cade mai allineata
  return normalMap(THREE, hm, N, N, M, M, { repeat: [1 / M, 1 / 1.7], aniso: 2 })
}

/**
 * Legno dei mobili: fibre fini allungate lungo v, striature e qualche fiamma morbida, contrasto entro ±8 %
 * di luminanza. Moltiplica il colore del token; `userData.normalMap` è la sua venatura in leggerissimo rilievo.
 * Le UV dei mobili coprono l'intera faccia (non 1 m): il disegno regge sia stirato su un piano sia stretto su una gamba.
 */
export function woodGrain(THREE) {
  const N = 512
  const cv = makeCanvas(N, N)
  const hm = new Float32Array(N * N)
  const img = fillPixels(cv, (x, y, out) => {
    const u = x / N, v = y / N
    const a = u + (vnoise(u * 3, v * 2, 3, 25, 2) - 0.5) * 0.05 // le fibre non sono mai dritte
    const f1 = vnoise(a * 180, v * 5, 180, 21, 5) - 0.5 // fibre fini
    const f2 = vnoise(a * 48, v * 3, 48, 22, 3) - 0.5 // striature
    const f3 = vnoise(a * 12 + vnoise(a * 3, v * 2, 3, 24, 2) * 2.5, v * 2, 12, 23, 2) - 0.5 // fiamme larghe
    const k = Math.max(-0.08, Math.min(0.08, 0.07 * f1 + 0.06 * f2 + 0.07 * f3))
    out[0] = out[1] = out[2] = linearToSrgb(MID * (1 + k)) * 255
    hm[y * N + x] = 0.00004 * f1 + 0.00002 * f2
  })
  const t = canvasTexture(THREE, cv.canvas, { gray: meanSrgb(img), aniso: 4 })
  t.userData.normalMap = normalMap(THREE, hm, N, N, 0.6, 0.6, { aniso: 4 })
  return t
}

/**
 * Marmo e pietra dei piani: colore pieno con nuvola leggera e venature fini, chiare o scure secondo il fondo.
 * Colore già dentro il canvas: il materiale resta bianco. @param {string} hex colore base
 */
export function* marbleG(THREE, hex, seed = 1) {
  const N = 512
  const base = rgb(hex)
  const cv = makeCanvas(N, N)
  const img = yield* fillPixelsG(cv, (x, y, out) => {
    const n = cloud(x / N, y / N, seed, 3)
    const k = 1 + (n - 0.5) * 0.09
    out[0] = Math.min(255, base[0] * k); out[1] = Math.min(255, base[1] * k); out[2] = Math.min(255, base[2] * k)
  })
  const rand = rng(seed * 13 + 5)
  drawVeins(cv.g, img, N, rand, { count: 9, len: 420, width: 1.1, light: 'rgba(255,255,255,0.42)', dark: 'rgba(70,72,76,0.3)' })
  drawVeins(cv.g, img, N, rand, { count: 34, len: 170, width: 0.55, light: 'rgba(255,255,255,0.34)', dark: 'rgba(70,72,76,0.24)' })
  return canvasTexture(THREE, cv.canvas, { aniso: 4, albedo: true })
}

/** Versione sincrona di `marbleG`. */
export const marble = (THREE, hex, seed = 1) => drain(marbleG(THREE, hex, seed))

let weave = null
/** Metri coperti dalla trama: 64 fili da 1,2 mm. */
export const WEAVE_METERS = 0.077

/**
 * Trama dei tessuti: normalMap di una tela (64 fili per lato, ordito e trama che si scavalcano) su una stoffa
 * che non è mai tesa del tutto: una lieve ondulazione di qualche centimetro resta leggibile anche da lontano,
 * dove i fili non si distinguono più. Una sola per tutti i tessuti: ogni uso ne regola la scala con una copia
 * (`fitRepeat`) e la forza con `relief`.
 */
export function weaveNormal(THREE) {
  if (weave) return weave
  const N = 512, T = 64
  const hm = new Float32Array(N * N)
  for (let y = 0, k = 0; y < N; y++) for (let x = 0; x < N; x++, k++) {
    const u = x / N, v = y / N
    const fx = u * T, fy = v * T
    const i = Math.floor(fx), j = Math.floor(fy)
    const sx = Math.sin(Math.PI * (fx - i)), sy = Math.sin(Math.PI * (fy - j))
    const p = (i + j) & 1 ? 1 : -1 // quale dei due fili passa sopra in questo incrocio
    const warp = sx * (0.5 + 0.5 * p * sy) * (0.8 + 0.4 * hash2(i, 0, 41))
    const weft = sy * (0.5 - 0.5 * p * sx) * (0.8 + 0.4 * hash2(0, j, 42))
    hm[k] = 0.00012 * Math.max(warp, weft) + 0.0005 * vnoise(u * 5, v * 5, 5, 43) + 0.0002 * vnoise(u * 13, v * 13, 13, 44)
  }
  weave = normalMap(THREE, hm, N, N, WEAVE_METERS, WEAVE_METERS, { aniso: 2 })
  return weave
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
