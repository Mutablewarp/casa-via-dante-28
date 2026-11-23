/**
 * Facciate dei palazzi vicini con profondità vera: aperture incassate con imbotte, serramento dall'atlante,
 * persiane o avvolgibili, cornici, balconi con mensole e ringhiera, marcapiani, lesene, piano terra con vetrine.
 * Tutto finisce in due accumuli: `S.B` (proietta ombra) e `S.F` (pezzi minuti, senza ombra).
 */
import { Frame, rgb, shade } from './exterior-util.js'
import { UV, PAL } from './exterior-mats.js'
import { cell } from './city-tex-atlas.js'

const WHITE = [1, 1, 1]
const RAIL_V = { iron: [0.508, 0.992], stone: [0.008, 0.492] } // metà della texture delle ringhiere
const RAIL_H = 1.0
const LEAF_OUT = 0.08 // persiana aperta: scostamento dal muro (m)
const LEAF_IN = -0.07 // persiana chiusa: poco dentro il filo del muro
const COURSE = 0.46 // altezza di un corso di bugnato (m)
const SHOPS = ['shop0', 'shop1', 'sarac', 'shop0', 'shop1']
const AWNING = ['#7d2f2b', '#35513f', '#d9cfb6', '#2f3f5c', '#a8552e']
/** Tinte delle persiane (verde bottiglia, bruno, grigio). */
export const SHUT = {
  green: ['#2f4f3e', '#365846', '#2a4638', '#5d7a68'],
  brown: ['#5d4030', '#6a4a36', '#4e3526'],
  gray: ['#8a8d8c', '#9b9e9c', '#767978'],
  wood: ['#8a5a34', '#7a4e2c', '#96673f'],
  dark: ['#2c3833', '#26302c', '#3a4640'],
}

const pick = (r, a) => a[Math.floor(r() * a.length)]

/**
 * Completa uno stile di facciata con i valori di base e converte i colori in terne lineari.
 * @param {object} o campi dello stile (vedi i valori di base qui sotto)
 * @returns {object}
 */
export function style(o) {
  const st = {
    bay: 3.1, recess: 0.22, ow: 1.15, head: 2.6, sillWin: 0.95, sillDoor: 0.1, floors: 4,
    shut: 'louver', shutPal: SHUT.green, pClosed: 0.4, pOpen: 0.3, pLit: 0.4,
    wins: ['win0', 'win1', 'win3'], rail: 'iron', railTint: PAL.iron, surround: true, cimasa: true,
    pilaster: 0, marca: true, cornice: 0.5, balDepth: 0.95, balcony: () => 'window',
    ...o,
  }
  st.tint = rgb(st.tint)
  st.trim = rgb(st.trim ?? PAL.stone)
  st.railTint = rgb(st.railTint)
  st.base = { h: 4.4, kind: 'shops', bay: 3.7, open: 3.1, ...o.base }
  st.base.tint = rgb(st.base.tint ?? shade(st.tint, 0.9))
  return st
}

/** Ringhiera: pannello frontale e fianchi con la texture a bacchette (o a balaustri). */
function railing(S, ff, st, a, b, y, d, left, right) {
  const [v0, v1] = RAIL_V[st.rail]
  const k = UV.rail
  ff.face(S.M.rail, a, y, b, y + RAIL_H, d, st.railTint, [a * k, v0, b * k, v1])
  if (left) ff.flank(S.M.rail, a + 0.02, y, y + RAIL_H, 0, d, st.railTint, [0, v0, d * k, v1])
  if (right) ff.flank(S.M.rail, b - 0.02, y, y + RAIL_H, 0, d, st.railTint, [0, v0, d * k, v1])
}

/** Balcone: soletta con mensole e ringhiera; `petto` è la sola ringhiera a filo con una soglia. */
function balcony(S, fc, ff, st, kind, u0, u1, yf, j, bw, joinL, joinR) {
  const M = S.M
  const top = yf + st.sillDoor
  if (kind === 'petto') {
    fc.box(M.plain, u0 - 0.1, yf - 0.04, 0, u1 + 0.1, top, 0.2, st.trim, 'b')
    railing(S, ff, st, u0, u1, top, 0.16, false, false)
    return
  }
  const long = kind === 'long'
  const a = long ? j * bw : u0 - 0.5
  const b = long ? (j + 1) * bw : u1 + 0.5
  const d = st.balDepth
  fc.box(M.plain, a, yf - 0.08, 0, b, top, d, st.trim, (long && joinL ? 'l' : '') + (long && joinR ? 'r' : ''))
  for (const ub of [a + 0.2, b - 0.36]) fc.box(M.plain, ub, yf - 0.4, 0, ub + 0.16, yf - 0.08, d * 0.72, shade(st.trim, 0.92), 't')
  railing(S, ff, st, a, b, top, d - 0.04, !(long && joinL), !(long && joinR))
}

/** Un'apertura: imbotte, serramento, persiane o avvolgibile, cornice, cimasa, timpano, davanzale. */
function opening(S, fc, st, u0, ys, u1, yh, kind, ped) {
  const { M, rand } = S
  const r = st.recess
  const um = (u0 + u1) / 2
  fc.reveal(M.stucco, u0, ys, u1, yh, r, st.trim)
  const q = rand()
  const state = st.shut === 'none' ? 'bare' : q < st.pClosed ? 'closed' : q < st.pClosed + st.pOpen ? 'open' : 'bare'
  const tint = rgb(pick(rand, st.shutPal))
  const glass = () => fc.face(rand() < st.pLit ? M.win : M.winOff, u0, ys, u1, yh, -r, WHITE, cell(pick(rand, st.wins)))
  const leaf = cell('louver')
  if (st.shut === 'roller') {
    glass()
    const f = state === 'closed' ? 1 : state === 'open' ? 0.08 : 0.25 + rand() * 0.45
    const c = cell('roller')
    fc.face(M.winOff, u0, yh - (yh - ys) * f, u1, yh, -0.1, tint, [c[0], c[3] - (c[3] - c[1]) * f, c[2], c[3]])
  } else if (state === 'closed') {
    fc.face(M.winOff, u0, ys, um, yh, LEAF_IN, tint, leaf)
    fc.face(M.winOff, um, ys, u1, yh, LEAF_IN, tint, leaf)
  } else {
    glass()
    if (state === 'open') {
      const w = (u1 - u0) / 2
      fc.face(M.winOff, u0 - w, ys, u0, yh, LEAF_OUT, tint, leaf)
      fc.face(M.winOff, u1, ys, u1 + w, yh, LEAF_OUT, tint, leaf)
    }
  }
  if (st.surround) {
    const s = 0.14
    fc.face(M.plain, u0 - s, ys, u0, yh + s, 0.04, st.trim)
    fc.face(M.plain, u1, ys, u1 + s, yh + s, 0.04, st.trim)
    fc.face(M.plain, u0, yh, u1, yh + s, 0.04, st.trim)
    if (st.cimasa) {
      const yc = yh + s + 0.04
      fc.box(M.plain, u0 - s - 0.08, yc, 0, u1 + s + 0.08, yc + 0.1, 0.16, st.trim, 'b')
      if (ped) { // timpano triangolare sopra la cimasa
        const [a, b, c] = [fc.p(u0 - s - 0.08, yc + 0.1, 0.12), fc.p(u1 + s + 0.08, yc + 0.1, 0.12), fc.p(um, yc + 0.48, 0.12)]
        S.B.tri(M.plain, a, b, c, { color: st.trim, uv: [[0, 0], [1, 0], [0.5, 1]] })
        S.B.free(M.plain, a, c, fc.p(um, yc + 0.48, 0), fc.p(u0 - s - 0.08, yc + 0.1, 0), { color: shade(st.trim, 0.94), up: true })
        S.B.free(M.plain, c, b, fc.p(u1 + s + 0.08, yc + 0.1, 0), fc.p(um, yc + 0.48, 0), { color: shade(st.trim, 0.94), up: true })
      }
    }
  }
  if (kind === 'window') fc.box(M.plain, u0 - 0.12, ys - 0.08, 0, u1 + 0.12, ys, 0.1, st.trim, 'b')
}

/** Basamento a bugnato: corsi orizzontali in rilievo tra le aperture, portone al centro, finestre con inferriata. */
function rustic(S, fc, W, st, yb) {
  const { M } = S
  const { len, y0 } = W
  const b = st.base
  const nb = Math.max(1, Math.round(len / st.bay))
  const bw = len / nb
  const top = y0 + b.open
  const door = Math.floor(nb / 2)
  const joint = shade(b.tint, 0.6)
  const block = (u0, u1, ya, yc) => {
    fc.face(M.stucco, u0, ya, u1, yc, 0, joint)
    for (let i = Math.floor((ya - y0) / COURSE); y0 + i * COURSE < yc - 0.06; i++) {
      fc.face(M.stucco, u0, Math.max(ya, y0 + i * COURSE + 0.04), u1, Math.min(yc, y0 + (i + 1) * COURSE), 0.035, b.tint)
    }
  }
  let prev = 0
  for (let j = 0; j < nb; j++) {
    const isDoor = j === door
    const ow = isDoor ? 2.1 : 1.4
    const u0 = (j + 0.5) * bw - ow / 2
    const ys = y0 + (isDoor ? 0 : 1.1)
    const yh = top - (isDoor ? 0 : 0.35)
    block(prev, u0, y0, top)
    if (!isDoor) {
      block(u0, u0 + ow, y0, ys)
      block(u0, u0 + ow, yh, top)
    }
    prev = u0 + ow
    fc.reveal(M.stucco, u0, ys, prev, yh, 0.3, shade(b.tint, 0.9))
    fc.face(M.winOff, u0, ys, prev, yh, -0.3, WHITE, cell(isDoor ? 'portone' : 'win4'))
  }
  block(prev, len, y0, top)
  block(0, len, top, yb)
  fc.box(M.plain, 0, yb - 0.22, 0, len, yb + 0.1, 0.14, st.trim, 'lrb')
}

/** Piano terra: vetrine, saracinesche e un portone al centro, con qualche tenda da sole; oppure bugnato o muro liscio. */
function ground(S, fc, W, st, yb) {
  const { M, rand } = S
  const { len, y0 } = W
  const b = st.base
  if (b.kind === 'rustic') return rustic(S, fc, W, st, yb)
  if (b.kind !== 'shops') {
    fc.face(M.stucco, 0, y0, len, yb, 0, b.tint)
    return
  }
  const nb = Math.max(1, Math.round(len / b.bay))
  const bw = len / nb
  const top = y0 + b.open
  const door = Math.floor(nb / 2)
  fc.face(M.stucco, 0, top, len, yb, 0, b.tint)
  let prev = 0
  for (let j = 0; j < nb; j++) {
    const u0 = j * bw + 0.45
    const u1 = (j + 1) * bw - 0.45
    fc.face(M.stucco, prev, y0, u0, top, 0, b.tint)
    prev = u1
    fc.reveal(M.stucco, u0, y0, u1, top, 0.3, shade(b.tint, 0.92))
    const name = j === door && nb > 2 ? 'portone' : pick(rand, SHOPS)
    const d = name === 'portone' ? 0.9 : 0
    fc.face(name === 'shop1' && rand() < 0.5 ? M.win : M.winOff, u0 + d, y0, u1 - d, top, -0.3, WHITE, cell(name))
    if (d) for (const [a, c] of [[u0, u0 + d], [u1 - d, u1]]) fc.face(M.stucco, a, y0, c, top, -0.3, b.tint)
    if (name.startsWith('shop') && rand() < 0.5) { // tenda da sole inclinata
      const c = cell('awning')
      S.B.free(M.winOff, fc.p(u0 - 0.1, top - 0.5, 1.5), fc.p(u1 + 0.1, top - 0.5, 1.5), fc.p(u1 + 0.1, top + 0.15, 0.03), fc.p(u0 - 0.1, top + 0.15, 0.03),
        { up: true, color: pick(rand, AWNING), uv: [[c[0], c[1]], [c[2], c[1]], [c[2], c[3]], [c[0], c[3]]] })
    }
  }
  fc.face(M.stucco, prev, y0, len, top, 0, b.tint)
  fc.box(M.plain, 0, yb - 0.16, 0, len, yb + 0.1, 0.12, st.trim, 'lrb')
}

/**
 * Una parete dettagliata.
 * @param {{B: object, F: object, M: object, rand: () => number}} S accumuli, materiali, generatore
 * @param {{x: number, z: number, nx: number, nz: number, len: number, y0: number, y1: number, st: object}} W
 *   origine (spigolo sinistro visto da fuori), normale uscente, lunghezza, quote di base e di gronda, stile
 */
export function facade(S, W) {
  const { M, rand } = S
  const st = W.st
  const { len, y0, y1 } = W
  const fc = new Frame(S.B, W.x, W.z, W.nx, W.nz, UV.stucco, rand() * 8)
  const ff = new Frame(S.F, W.x, W.z, W.nx, W.nz, UV.stucco, 0)
  fc.face(M.stucco, 0, y0, len, y1, -(st.recess + 0.35), shade(st.tint, 0.6)) // fondo: chiude il volume dietro le aperture
  const yb = y0 + st.base.h
  const n = st.floors
  const fh = (y1 - (st.cornice ? 0.7 : 0.15) - yb) / n
  const nb = Math.max(1, Math.round(len / st.bay))
  const bw = len / nb
  ground(S, fc, W, st, yb)
  for (let k = 0; k < n; k++) {
    const yf = yb + k * fh
    const kinds = []
    for (let j = 0; j < nb; j++) kinds.push(st.balcony(j, k, nb, n, rand))
    let prev = 0
    for (let j = 0; j < nb; j++) {
      const kind = kinds[j]
      const ow = kind === 'window' ? st.ow : st.owDoor ?? st.ow
      const u0 = (j + 0.5) * bw - ow / 2
      const u1 = u0 + ow
      const ys = yf + (kind === 'window' ? st.sillWin : st.sillDoor)
      const yh = yf + st.head
      fc.face(M.stucco, prev, yf, u0, yf + fh, 0, st.tint)
      if (kind === 'window') fc.face(M.stucco, u0, yf, u1, ys, 0, st.tint)
      fc.face(M.stucco, u0, yh, u1, yf + fh, 0, st.tint)
      prev = u1
      opening(S, fc, st, u0, ys, u1, yh, kind, st.pediment?.(j, k))
      if (kind !== 'window') balcony(S, fc, ff, st, kind, u0, u1, yf, j, bw, kinds[j - 1] === 'long', kinds[j + 1] === 'long')
    }
    fc.face(M.stucco, prev, yf, len, yf + fh, 0, st.tint)
    if (st.marca && k > 0) fc.box(M.plain, 0, yf - 0.14, 0, len, yf + 0.04, 0.07, st.trim, 'lrb')
  }
  fc.face(M.stucco, 0, yb + n * fh, len, y1, 0, st.tint)
  if (st.pilaster) { // lesene agli spigoli e ogni `pilaster` campate
    const at = [nb]
    for (let j = 0; j < nb; j += st.pilaster) at.push(j)
    for (const j of at) {
      const u = Math.min(Math.max(j * bw, 0.3), len - 0.3)
      fc.box(M.stucco, u - 0.3, yb + 0.1, 0, u + 0.3, y1 - 0.7, 0.07, st.trim, 'tb')
    }
  }
  ff.box(M.plain, 0.3, y0, 0, 0.42, y1 - 0.6, 0.12, rgb('#8f8578'), 'tb') // pluviale
}

/** Parete cieca (muro di confine): un solo quad d'intonaco. */
function blank(S, W) {
  new Frame(S.B, W.x, W.z, W.nx, W.nz, UV.stucco, S.rand() * 8).face(S.M.stucco, 0, W.y0, W.len, W.y1, 0, shade(W.st.tint, 0.96))
}

/**
 * Un palazzo: quattro pareti (dettagliate, cieche o assenti) e cornicione aggettante tutt'intorno.
 * @param {object} S accumuli, materiali, generatore
 * @param {{r: number[], y0: number, y1: number, st: object, faces?: object}} o rettangolo [x0, z0, x1, z1], quote, stile;
 *   `faces` dice per '-z', '+z', '+x', '-x' se la parete è dettagliata (1), cieca (0, predefinito) o assente (-1)
 */
export function palazzo(S, o) {
  const [x0, z0, x1, z1] = o.r
  const sides = [['-z', x1, z0, 0, -1, x1 - x0], ['+z', x0, z1, 0, 1, x1 - x0], ['+x', x1, z1, 1, 0, z1 - z0], ['-x', x0, z0, -1, 0, z1 - z0]]
  for (const [id, x, z, nx, nz, len] of sides) {
    const mode = o.faces?.[id] ?? 0
    const W = { x, z, nx, nz, len, y0: o.y0, y1: o.y1, st: o.st }
    if (mode === 1) facade(S, W)
    else if (mode === 0) blank(S, W)
  }
  const p = o.st.cornice
  if (!p) return
  const c = { color: o.st.trim, skip: '+y' }
  S.B.box(S.M.plain, x0 - 0.07, o.y1 - 0.7, z0 - 0.07, x1 + 0.07, o.y1 - 0.3, z1 + 0.07, { ...c, skip: '+y-y' }) // fregio
  S.B.box(S.M.plain, x0 - p * 0.6, o.y1 - 0.3, z0 - p * 0.6, x1 + p * 0.6, o.y1 - 0.14, z1 + p * 0.6, c)
  S.B.box(S.M.plain, x0 - p, o.y1 - 0.14, z0 - p, x1 + p, o.y1, z1 + p, c)
}
