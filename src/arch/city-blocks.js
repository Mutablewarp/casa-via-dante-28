/**
 * Palazzi lungo via Dante. Quelli vicini (entro circa 90 m) hanno facciate con profondità vera (city-kit.js);
 * quelli lontani restano scatole con la texture di facciata. La disposizione segue le foto dell'annuncio:
 * lato opposto: … | Palazzo Ziino | traversa B | moderno grigio | crema | ocra a coppi | giallo | …
 * lato nostro:  … | traversa A | il nostro edificio | palazzo giallo d'epoca | …
 */
import * as THREE from 'three'
import { rng, rgb, shade } from './exterior-util.js'
import { CITY_BAY, CITY_FLOOR, PAL } from './exterior-mats.js'
import { style, palazzo, SHUT } from './city-kit.js'
import { hipRoof, flatRoof } from './city-roofs.js'

/** Traverse (m): A sul lato nostro, accanto all'angolo dell'edificio; B sul lato opposto, accanto a Palazzo Ziino. */
export const CROSS_A = [-19.5, -3.5]
export const CROSS_B = [6.5, 22.5]
const OCRA = ['#d9b77a', '#e3c675', '#e7d4a5', '#d8a98c', '#dcc08a', '#e0cc94']
const PALE = ['#e6e3dc', '#dad6ce', '#e9e4d6', '#d6d9d8']
const ROOFS = ['#ffffff', '#f0dcd2', '#e2cbc0', '#f6e6dc', '#d9c2b6']
const FAR_MIX = 450 // distanza (m) alla quale i colori si fondono con la foschia
const TILE_MEAN = '#b9623e' // colore medio della texture dei coppi
const _a = new THREE.Color()
const _b = new THREE.Color()

const alt = (j, k) => ((j + k) % 2 ? 'balcony' : 'petto')
/** Stili di facciata dei palazzi vicini. */
export const ST = {
  cream: style({ tint: '#e8dcc2', trim: '#f4eee0', shutPal: SHUT.brown, pClosed: 0.6, pOpen: 0.15, balcony: alt }),
  ocra: style({
    tint: '#dcb878', trim: '#f0e4c8', pilaster: 3, wins: ['win4', 'win0', 'win1'],
    balcony: (j, k) => (k === 0 ? 'long' : j % 2 ? 'balcony' : 'petto'), pediment: (j, k) => k === 0 && j % 2 === 0,
  }),
  yellow: style({
    tint: '#e6cf8e', trim: '#f5eed8', shutPal: SHUT.brown, pilaster: 2, cornice: 0.7, wins: ['win4', 'win1'],
    balcony: (j, k, nb) => (k === 1 && j > 0 && j < nb - 1 ? 'long' : j % 3 === 1 ? 'balcony' : 'petto'), pediment: (j, k) => k === 1,
  }),
  rosa: style({ tint: '#dfb7a0', trim: '#f3e9de', shutPal: SHUT.green, pilaster: 4, balcony: (j, k) => (j % 2 ? 'balcony' : k === 0 ? 'petto' : 'window') }),
  modern: style({
    tint: '#cfcbc2', trim: '#e6e3dc', floors: 6, bay: 3.6, ow: 1.7, owDoor: 1.9, head: 2.45, sillWin: 1.0, shut: 'roller',
    shutPal: ['#cfc7b6', '#b9b2a2', '#d8d2c4'], pClosed: 0.25, wins: ['win5'], surround: false, marca: false, cornice: 0, balDepth: 1.2,
    base: { h: 3.8, open: 2.9 }, balcony: (j) => (j % 3 === 1 ? 'long' : 'window'),
  }),
  pale: style({
    tint: '#e4dfd2', trim: '#f0ece2', floors: 6, bay: 3.4, ow: 1.5, owDoor: 1.5, head: 2.45, shut: 'roller', shutPal: SHUT.wood,
    wins: ['win2', 'win5'], surround: false, marca: false, cornice: 0, balDepth: 1.1, base: { h: 3.8, open: 2.9 },
    balcony: (j, k, nb) => (j > 0 && j < nb - 1 ? 'long' : 'window'),
  }),
}

const fade = (dist) => Math.min(1, dist / FAR_MIX) ** 1.2 * 0.85
const farScale = (dist) => (dist < 60 ? 1 : dist < 140 ? 1.3 : dist < 280 ? 1.7 : 2.2)

/** Colore sfumato verso la foschia in funzione della distanza dall'attico (prospettiva aerea). */
export function hazed(hex, dist) {
  return '#' + _a.set(hex).lerp(_b.set(PAL.haze), fade(dist)).getHexString()
}

/** Tinta dei coppi lontani: moltiplica la texture fino a portarne il colore medio verso la foschia. */
export function roofTint(dist) {
  const t = fade(dist)
  _a.set(TILE_MEAN)
  _b.set(PAL.haze)
  return [1 + (_b.r / _a.r - 1) * t, 1 + (_b.g / _a.g - 1) * t, 1 + (_b.b / _a.b - 1) * t]
}

/**
 * Edificio lontano: quattro pareti con la texture di facciata (campate e piani interi, sfasati a caso) e tetto semplice.
 * @param {object} S accumuli, materiali, generatore
 * @param {{x0:number,z0:number,x1:number,z1:number,y0:number,top:number,color:string,floors?:number,roof?:string,rise?:number,maxRidge?:number,roofTint?:string}} o
 */
export function farBlock(S, o) {
  const { B, M, rand } = S
  const w = o.x1 - o.x0
  const d = o.z1 - o.z0
  const k = farScale(o.dist ?? 0) // finestre più grandi da lontano: a distanza non diventano un puntinato
  const nbx = Math.max(1, Math.round(w / (CITY_BAY * k)))
  const nbz = Math.max(1, Math.round(d / (CITY_BAY * k)))
  const floors = o.floors ?? Math.max(1, Math.round((o.top - o.y0) / (CITY_FLOOR * k)))
  const fh = (o.top - o.y0) / floors
  const ku = Math.floor(rand() * 4)
  const kv = Math.floor(rand() * 4)
  B.box(M.far, o.x0, o.y0, o.z0, o.x1, o.top, o.z1, {
    skip: '+y-y', color: o.color, su: nbx / w, suz: nbz / d, sv: 1 / fh, ox: o.x0 - (ku * w) / nbx, oz: o.z0 - (ku * d) / nbz, oy: o.y0 - kv * fh,
  })
  if (o.roof === 'hip') {
    hipRoof(S, [o.x0, o.z0, o.x1, o.z1], o.top, Math.min(o.top + (o.rise ?? 2.2), o.maxRidge ?? 99), { tint: o.roofTint, trim: shade(rgb(o.color), 1.05) })
    return
  }
  B.box(M.plain, o.x0 - 0.25, o.top, o.z0 - 0.25, o.x1 + 0.25, o.top + 0.5, o.z1 + 0.25, { skip: '-y', color: o.roofColor ?? PAL.roofFlat })
  if (rand() < 0.7 && w > 8 && d > 8) {
    const bx = o.x0 + 1.5 + rand() * (w - 6)
    const bz = o.z0 + 1.5 + rand() * (d - 6)
    B.box(M.plain, bx, o.top + 0.5, bz, bx + 2.6, o.top + 2.9, bz + 2.6, { color: shade(rgb(o.color), 0.92), skip: '-y' })
  }
}

/**
 * Palazzo vicino completo: facciate dettagliate e tetto (a coppi con colmi e comignoli, o piano con parapetto e volumi tecnici).
 * @param {object} S accumuli, materiali, generatore
 * @param {{r:number[], y0:number, top:number, st:object, faces:object, roof?:string, rise?:number, garden?:boolean, tint?:string}} o
 */
export function nearBlock(S, o) {
  const st = o.tint ? { ...o.st, tint: rgb(o.tint), base: { ...o.st.base, tint: shade(rgb(o.tint), 0.9) } } : o.st
  palazzo(S, { r: o.r, y0: o.y0, y1: o.top, st, faces: o.faces })
  const p = st.cornice
  if (o.roof === 'hip') hipRoof(S, o.r, o.top, o.top + (o.rise ?? 2.4), { tint: ROOFS[Math.floor(S.rand() * ROOFS.length)], over: Math.max(p, 0.45), extras: 1, trim: st.trim })
  else flatRoof(S, o.r, o.top, { over: p, wall: shade(st.tint, 1.02), clutter: 1, garden: o.garden })
}

/** Fila di edifici lontani lungo x, a passo e altezza irregolari; `skip` è un intervallo di x da lasciare libero. */
function farRow(S, sp) {
  const { rand } = S
  let x = sp.xFrom
  while (x < sp.xTo - 6) {
    let w = sp.w[0] + rand() * (sp.w[1] - sp.w[0])
    if (sp.skip && x + w > sp.skip[0] && x < sp.skip[1]) {
      w = sp.skip[0] - x
      if (w < 10) { x = sp.skip[1]; continue }
    }
    if (x + w > sp.xTo) w = sp.xTo - x
    const z1 = sp.z0 + sp.dir * (sp.d[0] + rand() * (sp.d[1] - sp.d[0]))
    const dist = Math.hypot(x + w / 2 - 15, sp.z0 - 8)
    farBlock(S, {
      x0: x, x1: x + w, z0: Math.min(sp.z0, z1), z1: Math.max(sp.z0, z1), y0: sp.G, top: sp.G + sp.h[0] + rand() * (sp.h[1] - sp.h[0]),
      color: hazed(sp.colors[Math.floor(rand() * sp.colors.length)], dist), roof: rand() < (sp.hip ?? 0) ? 'hip' : 'flat', dist,
      roofTint: roofTint(dist), roofColor: hazed(PAL.roofFlat, dist),
    })
    x += w + sp.gap[0] + rand() * (sp.gap[1] - sp.gap[0])
  }
}

/**
 * Lato opposto della via: palazzi d'epoca e moderni di fronte, le file lontane e i condomini chiari dietro.
 * @param {object} ctx contesto condiviso
 * @param {object} S0 accumuli e materiali
 * @param {number} G quota della strada (y)
 */
export function buildAcross(ctx, S0, G) {
  const S = { ...S0, rand: rng(7) }
  const zF = ctx.plan.context.street.zFar
  const z = { '-z': 1 }
  const near = [
    { r: [CROSS_B[1] + 0.5, zF, 38, zF + 20], top: -0.5, st: ST.modern, faces: { '-z': 1, '-x': 1 }, garden: true },
    { r: [38.3, zF, 58, zF + 18], top: -4.2, st: ST.cream, faces: z },
    { r: [58.3, zF, 80, zF + 20], top: -5.4, st: ST.ocra, faces: z, roof: 'hip' },
    { r: [80.3, zF, 108, zF + 22], top: -3.6, st: ST.yellow, faces: z },
    { r: [-48, zF, -26.3, zF + 18], top: -5, st: ST.ocra, faces: z, roof: 'hip', tint: '#e1c98c' },
    { r: [-70, zF, -48.3, zF + 19], top: -4, st: ST.cream, faces: z, tint: '#e6d6bd' },
    { r: [-92, zF, -70.3, zF + 18], top: -5.6, st: ST.rosa, faces: z, roof: 'hip' },
  ]
  for (const o of near) nearBlock(S, { ...o, y0: G })
  const epoch = { G, z0: zF, dir: 1, d: [16, 22], h: [16, 20], w: [22, 30], gap: [0.3, 0.6], colors: OCRA, hip: 0.6 }
  farRow(S, { ...epoch, xFrom: -228, xTo: -92.3 })
  farRow(S, { ...epoch, xFrom: 108.4, xTo: 318 })
  // lungo la traversa B, dietro Ziino e dietro il moderno; poi i condomini chiari
  farBlock(S, { x0: -20, x1: CROSS_B[0] - 0.5, z0: zF + 18.5, z1: zF + 44, y0: G, top: G + 19, color: OCRA[2], roof: 'hip', dist: 70 })
  farBlock(S, { x0: CROSS_B[1] + 0.5, x1: 44, z0: zF + 20.5, z1: zF + 46, y0: G, top: G + 24, color: PALE[1], dist: 70 })
  const condo = { G, z0: zF + 28, dir: 1, d: [16, 20], h: [28, 32], w: [24, 34], gap: [4, 9], colors: PALE }
  farRow(S, { ...condo, xFrom: -200, xTo: -22 })
  farRow(S, { ...condo, xFrom: 46, xTo: 318 })
}

/**
 * Nostro lato della via: il volume sotto l'unità confinante, il palazzo giallo d'epoca addossato verso +x,
 * i palazzi oltre la traversa A verso -x e le file lontane, tutte più basse dello sguardo di chi sta in terrazza.
 * @param {object} ctx contesto condiviso
 * @param {object} S0 accumuli e materiali
 * @param {number} G quota della strada (y)
 */
export function buildOurSide(ctx, S0, G) {
  const S = { ...S0, rand: rng(11) }
  const zN = ctx.plan.context.street.zNear - 0.2
  const ours = style({ tint: ctx.styles.exterior.facade, floors: 6, base: { h: 3.25, kind: 'plain' }, shut: 'roller', shutPal: SHUT.wood, wins: ['win2'], surround: false, marca: false, cornice: 0, ow: 1.4, head: 2.4 })
  for (const blk of ctx.plan.context.blocks) {
    blk.rects.forEach((r, i) => {
      // sotto l'unità confinante: il fianco sulla traversa A e il retro hanno finestre vere
      palazzo(S, { r, y0: G, y1: -0.02, st: ours, faces: i === 0 ? { '-x': 1, '-z': 1, '+x': -1, '+z': -1 } : { '-x': 1, '+z': 1, '+x': -1, '-z': -1 } })
    })
  }
  const p = { '+z': 1 }
  const near = [
    { r: [29.15, -6, 54, zN], top: -5, st: ST.yellow, faces: p, tint: '#e9d38f' },
    { r: [54.3, -6, 76, zN], top: -1.2, st: ST.pale, faces: p },
    { r: [76.3, -6, 100, zN], top: -5.8, st: ST.ocra, faces: p, roof: 'hip', tint: '#dfc08a' },
    { r: [-44, -4, CROSS_A[0] - 0.5, zN], top: -3.6, st: ST.rosa, faces: { '+z': 1, '+x': 1 }, roof: 'hip', tint: '#e2c3a4' },
    { r: [-68, -4, -44.3, zN], top: -1.8, st: ST.pale, faces: p, tint: '#dcd8cc' },
  ]
  for (const o of near) nearBlock(S, { ...o, y0: G })
  const row = { G, z0: zN, dir: -1, d: [16, 20], w: [18, 30], gap: [0.2, 0.5] }
  farRow(S, { ...row, xFrom: -228, xTo: -68.3, h: [18, 22.6], colors: OCRA, hip: 0.4 })
  farRow(S, { ...row, xFrom: 100.4, xTo: 316, h: [18, 22.8], colors: PALE })
}
