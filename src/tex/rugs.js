/** Tappeti: composizione persiana (Liberty) e varianti Moderno / Scandinavo. */
import { rngFor, makeCanvas, shade, abrash, addNoise, diamond, rosette, plausibleHex } from './draw.js'
import { PERSIAN, RUG_ALIAS } from './rugs-config.js'
import { medallion, cantonal } from './rugs-motifs.js'
import { strip, fieldFill, halo } from './rugs-fill.js'
import { paintAlt, paintDoormat } from './rugs-alt.js'

/** Frange chiare sui due lati corti (a sinistra e a destra del campo annodato). */
function fringe(g, W, H, f, rnd) {
  g.fillStyle = '#b9ab8c'
  g.fillRect(0, 0, f, H)
  g.fillRect(W - f, 0, f, H)
  const n = Math.round(H / 2.6)
  g.lineWidth = Math.max(1, H / n * 0.7)
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.5) / n) * H
    for (const side of [0, 1]) {
      const x0 = side ? W - f : f
      const x1 = side ? W : 0
      g.strokeStyle = shade('#e8dfc6', (rnd() - 0.5) * 0.18)
      g.beginPath()
      g.moveTo(x0, y)
      g.quadraticCurveTo((x0 + x1) / 2, y + (rnd() - 0.5) * f * 0.5, x1 + (side ? -1 : 1) * rnd() * f * 0.12, y + (rnd() - 0.5) * f * 0.4)
      g.stroke()
    }
  }
}

/** Disegna un tappeto persiano orizzontale (W >= H). */
function paintPersian(g, W, H, cfg, rnd) {
  const p = cfg.pal
  const f = H * 0.05
  const K = { x: f, y: 0, w: W - 2 * f, h: H }
  const bw = H * cfg.bw
  fringe(g, W, H, f, rnd)
  // bordi annidati
  const nest = [[0, p.outline], [0.08, p.ivory], [0.1, p.band], [0.74, p.ivory], [0.77, p.guard], [0.94, p.outline], [0.97, p.guard]]
  for (const [t, c] of nest) {
    g.fillStyle = c
    g.fillRect(K.x + t * bw, K.y + t * bw, K.w - 2 * t * bw, K.h - 2 * t * bw)
  }
  // greca: quattro tratti e quattro cantonali
  const b0 = 0.1 * bw
  const mw = 0.64 * bw
  const x0 = K.x + b0
  const y0 = K.y + b0
  const iw = K.w - 2 * b0
  const ih = K.h - 2 * b0
  const sl = iw - 2 * mw
  const sh = ih - 2 * mw
  const place = (tx, ty, rot, len) => {
    g.save()
    g.translate(tx, ty)
    g.rotate(rot)
    strip(g, cfg.greca, len, mw, p)
    g.restore()
  }
  place(x0 + mw, y0, 0, sl)
  place(x0 + iw - mw, y0 + ih, Math.PI, sl)
  place(x0 + iw, y0 + mw, Math.PI / 2, sh)
  place(x0, y0 + ih - mw, -Math.PI / 2, sh)
  for (const [qx, qy] of [[x0, y0], [x0 + iw - mw, y0], [x0, y0 + ih - mw], [x0 + iw - mw, y0 + ih - mw]]) {
    g.fillStyle = p.band
    g.fillRect(qx, qy, mw, mw)
    if (cfg.greca === 'stripes') continue
    rosette(g, qx + mw / 2, qy + mw / 2, mw * 0.36, 8, p.m1, p.m2, p.gold)
  }
  // campo
  const F = { x: K.x + bw, y: K.y + bw, w: K.w - 2 * bw, h: K.h - 2 * bw }
  fieldFill(g, F, cfg.fill, p)
  const cx = F.x + F.w / 2
  const cy = F.y + F.h / 2
  const s = Math.min(F.w, F.h)
  g.save()
  g.beginPath()
  g.rect(F.x, F.y, F.w, F.h)
  g.clip()
  if (cfg.corners) {
    const r = s * 0.27
    for (const [qx, qy] of [[F.x, F.y], [F.x + F.w, F.y], [F.x, F.y + F.h], [F.x + F.w, F.y + F.h]]) cantonal(g, qx, qy, r, cfg.medal, p)
  }
  if (cfg.medal === 'repeat') {
    const n = Math.max(1, Math.round(F.w / (F.h * 1.25)))
    const cell = F.w / n
    for (let i = 0; i < n; i++) {
      const mx = F.x + (i + 0.5) * cell
      halo(g, 'lozenge', mx, cy, cell * 0.44, F.h * 0.46, p.field)
      medallion(g, mx, cy, cell * 0.4, F.h * 0.42, i % 2 ? 'lozenge' : 'oval', p)
      if (i < n - 1) diamond(g, mx + cell / 2, cy, F.h * 0.1, F.h * 0.1, p.ivory)
    }
  } else if (cfg.medal !== 'none') {
    const ry = s * 0.36
    const rx = cfg.medal === 'round' ? ry : Math.min(F.w * 0.3, ry * 1.55)
    halo(g, cfg.medal, cx, cy, rx, ry, p.field)
    medallion(g, cx, cy, rx, ry, cfg.medal, p)
  }
  g.restore()
  g.fillStyle = 'rgba(0,0,0,0.045)'
  for (let y = 0; y < H; y += 2) g.fillRect(K.x, y, K.w, 1)
  addNoise(g, W, H, rnd, 26)
}

/**
 * Dipinge un tappeto in un canvas orientato come richiesto (mai stirato).
 * @param {string} style id dello stile
 * @param {string} pattern nome del motivo
 * @param {number} aspect lato X diviso lato Z del tappeto
 * @returns {HTMLCanvasElement} canvas disegnato
 */
export function drawRug(style, pattern, aspect) {
  const small = pattern === 'bagno' || pattern === 'zerbino'
  const long = small ? 512 : 1024
  const portrait = aspect < 1
  const wL = portrait ? 1 / aspect : aspect // rapporto lungo/corto
  const LW = long
  const LH = Math.max(16, Math.round(long / wL))
  const rnd = rngFor(`rug:${style}:${pattern}`)
  const { canvas: land, g } = makeCanvas(LW, LH)
  if (pattern === 'zerbino') paintDoormat(g, LW, LH, rnd)
  else if (style === 'liberty') {
    const cfg = PERSIAN[RUG_ALIAS[pattern] ?? pattern] ?? PERSIAN.heriz
    // lana tinta: nemmeno il blu notte e il nero scendono sotto un albedo di 0,03
    const pal = Object.fromEntries(Object.entries(cfg.pal).map(([k, v]) => [k, Array.isArray(v) ? v.map(plausibleHex) : plausibleHex(v)]))
    paintPersian(g, LW, LH, { ...cfg, pal }, rnd)
  } else paintAlt(g, LW, LH, style, pattern, rnd)
  let out = land
  if (portrait) {
    // tappeto più lungo in Z: si ruota il disegno orizzontale
    const r = makeCanvas(LH, LW)
    r.g.translate(0, LW)
    r.g.rotate(-Math.PI / 2)
    r.g.drawImage(land, 0, 0)
    out = r.canvas
  }
  if (style === 'liberty' && pattern !== 'bagno' && pattern !== 'zerbino') {
    // «abrash»: fasce orizzontali di tono, solo sulla parte annodata (le frange restano chiare)
    const f = LH * 0.05
    const g3 = out.getContext('2d')
    g3.save()
    g3.beginPath()
    if (portrait) g3.rect(0, f, out.width, out.height - 2 * f)
    else g3.rect(f, 0, out.width - 2 * f, out.height)
    g3.clip()
    abrash(g3, out.width, out.height, rnd, pattern.startsWith('isfahan') ? 0.07 : 0.14)
    g3.restore()
  }
  return out
}
