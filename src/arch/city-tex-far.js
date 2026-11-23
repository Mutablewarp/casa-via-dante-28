/**
 * Facciata dei palazzi lontani: 4 × 4 campate diverse tra loro (3,0 × 3,4 m l'una, 256 px su 1024),
 * con ombra dell'imbotte dipinta, persiane, balconi, marcapiano e colature. Stesso tracciato per colore,
 * luce notturna (solo alcune finestre) e altezze (da cui la mappa di normali).
 */
import { canvas, hash, normalMap, heightOf } from './city-tex.js'

const BAYS = 4
const SHUT = ['#5d7a66', '#8a6a52', '#9a9d9b', '#6f8f84'] // persiane: verde, bruno, grigio (verranno tinte dall'intonaco)
const GLOW = ['#ffd9a0', '#ffe6bd', '#ffc98a', '#ffdcae', '#cfe0ff']

/** Carattere di una campata, deciso da un seme: tipo di apertura, persiane, luce. */
function bayOf(i, j) {
  const r = (k) => hash(i * 7 + j * 13, k, 53)
  const kind = r(1) < 0.36 ? 'balcony' : r(1) < 0.66 ? 'petto' : 'window'
  const shut = r(2) < 0.3 ? 'open' : r(2) < 0.62 ? 'closed' : r(2) < 0.8 ? 'none' : 'roller'
  return { kind, shut, tint: SHUT[Math.floor(r(3) * SHUT.length)], lit: shut !== 'closed' && r(4) < 0.42, glow: GLOW[Math.floor(r(5) * GLOW.length)], dim: 0.55 + r(6) * 0.45, ac: r(7) < 0.14 }
}

function louvers(g, x, y, w, h, tint) {
  g.fillStyle = tint
  g.fillRect(x, y, w, h)
  g.fillStyle = 'rgba(0,0,0,0.22)'
  for (let yy = y + 3; yy < y + h - 2; yy += 5) g.fillRect(x + 3, yy, w - 6, 2)
  g.strokeStyle = 'rgba(0,0,0,0.3)'
  g.lineWidth = 1
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

/** Una campata: m = 0 colore, 1 luce, 2 altezze (grigi: 128 = filo del muro). */
function drawBay(g, m, X, Y, b, first) {
  const ow = 92
  const ox = X + 82
  const top = Y + 52
  const bot = Y + (b.kind === 'window' ? 170 : 236)
  const oh = bot - top
  const rect = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h) }
  const grad = (y0, y1, a, c) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, c); return q }
  if (m === 1) {
    if (!b.lit) return
    g.globalAlpha = b.dim
    const gh = b.shut === 'roller' ? oh * 0.55 : oh
    rect(b.glow, ox + 5, bot - gh + 5, ow / 2 - 7, gh - 10)
    rect(b.glow, ox + ow / 2 + 2, bot - gh + 5, ow / 2 - 7, gh - 10)
    g.globalAlpha = 1
    return
  }
  const H = m === 2
  // marcapiano in fondo al piano, con la sua ombra sul piano di sotto
  rect(H ? '#b0b0b0' : '#f3f1ea', X, Y + 246, 256, 10)
  if (!H) rect(grad(Y, Y + 9, 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0)'), X, Y, 256, 9)
  if (first) rect(H ? '#a8a8a8' : '#a69c8e', X + 4, Y, 5, 256) // pluviale
  // cornice dell'apertura e cimasa
  rect(H ? '#9a9a9a' : '#f6f4ec', ox - 9, top - 9, ow + 18, oh + 9)
  rect(H ? '#bcbcbc' : '#fbfaf4', ox - 15, top - 17, ow + 30, 8)
  if (!H) rect('rgba(0,0,0,0.22)', ox - 13, top - 9, ow + 26, 3)
  // serramento
  rect(H ? '#3c3c3c' : '#ece7dc', ox, top, ow, oh)
  if (!H) {
    for (const k of [0, 1]) rect(grad(top, bot, '#8394a4', '#56636f'), ox + 5 + k * (ow / 2 - 2), top + 5, ow / 2 - 8, oh - 10)
    rect(grad(top, top + 16, 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0)'), ox, top, ow, 16) // ombra dell'imbotte
    rect('rgba(0,0,0,0.14)', ox, top, 6, oh)
  }
  if (b.shut === 'closed') louvers(g, ox + 1, top + 1, ow - 2, oh - 2, H ? '#585858' : b.tint)
  else if (b.shut === 'roller') {
    rect(H ? '#505050' : '#d2c8b4', ox + 3, top + 3, ow - 6, oh * 0.45)
    if (!H) for (let yy = top + 6; yy < top + oh * 0.45; yy += 5) rect('rgba(0,0,0,0.12)', ox + 3, yy, ow - 6, 1.5)
  } else if (b.shut === 'open') {
    for (const lx of [ox - ow / 2 - 3, ox + ow + 3]) {
      if (!H) rect('rgba(0,0,0,0.25)', lx + 3, top + 4, ow / 2, oh)
      louvers(g, lx, top, ow / 2, oh, H ? '#989898' : b.tint)
    }
  }
  if (b.kind === 'window') { // davanzale e colature
    rect(H ? '#b4b4b4' : '#f4f2ea', ox - 13, bot, ow + 26, 7)
    if (!H) {
      rect('rgba(0,0,0,0.25)', ox - 11, bot + 7, ow + 22, 3)
      for (const dx of [-9, ow + 5]) rect(grad(bot + 8, bot + 60, 'rgba(60,50,40,0.2)', 'rgba(60,50,40,0)'), ox + dx, bot + 8, 5, 52)
    }
  } else {
    const wide = b.kind === 'balcony' ? 30 : 5
    const ry = bot - 72
    if (b.kind === 'balcony') {
      rect(H ? '#e6e6e6' : '#f3f1ea', ox - wide, bot - 6, ow + wide * 2, 9)
      if (!H) rect(grad(bot + 3, bot + 20, 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0)'), ox - wide, bot + 3, ow + wide * 2, 17)
    }
    if (!H) { // ringhiera in ferro
      g.fillStyle = '#5e5a55'
      g.fillRect(ox - wide, ry, ow + wide * 2, 2.5)
      g.fillRect(ox - wide, bot - 9, ow + wide * 2, 2)
      for (let x = ox - wide + 1; x < ox + ow + wide; x += 7) g.fillRect(x, ry, 1.5, 64)
    }
  }
  if (b.ac) {
    rect(H ? '#d0d0d0' : '#dfe0de', ox + ow + 20, bot - 34, 28, 20)
    if (!H) {
      rect('rgba(0,0,0,0.3)', ox + ow + 21, bot - 14, 28, 4)
      rect('#b4b6b5', ox + ow + 24, bot - 30, 13, 12)
    }
  }
}

/**
 * Disegna la facciata nei tre modi.
 * @param {HTMLCanvasElement} stuccoCv intonaco ripetibile da stendere come fondo
 * @returns {{ map: HTMLCanvasElement, lit: HTMLCanvasElement, nor: HTMLCanvasElement }}
 */
export function farFacade(stuccoCv) {
  const make = (size, m) => {
    const [cv, g] = canvas(size)
    g.scale(size / 1024, size / 1024)
    g.fillStyle = ['#e9e7e0', '#000', '#808080'][m]
    g.fillRect(0, 0, 1024, 1024)
    if (m === 0) {
      g.globalCompositeOperation = 'multiply'
      for (let k = 0; k < 4; k++) g.drawImage(stuccoCv, (k % 2) * 512, (k >> 1) * 512, 512, 512)
      g.globalCompositeOperation = 'source-over'
    }
    for (let j = 0; j < BAYS; j++) for (let i = 0; i < BAYS; i++) drawBay(g, m, i * 256, j * 256, bayOf(i, j), i === 0)
    return cv
  }
  const hf = heightOf(make(512, 2))
  return { map: make(1024, 0), lit: make(512, 1), nor: normalMap(512, (x, y) => hf(x, y) + hash(x, y, 55) * 0.025, 2.2) }
}
