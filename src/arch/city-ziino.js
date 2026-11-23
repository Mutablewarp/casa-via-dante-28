/** Palazzo Ziino: intonaco rosa, basamento a bugnato, finestre alte con cornici e timpani, balconi a balaustra, cornicione, tetto in coppi. */
import * as THREE from 'three'
import { rgb, shade } from './exterior-util.js'
import { style, palazzo, SHUT } from './city-kit.js'
import { hipRoof } from './city-roofs.js'

const PINK = '#E2B9A0' // spec/03-DESIGN.md, sezione 6
const STONE = '#f3ebdf'
const BASE_H = 4.7
const DISH = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10)
const _m = new THREE.Matrix4()
const _r = new THREE.Matrix4()

const ZIINO = style({
  tint: PINK, trim: STONE, floors: 3, bay: 3.2, ow: 1.25, head: 3.05, sillWin: 0.95, recess: 0.28, shutPal: SHUT.dark, pClosed: 0.25, pOpen: 0.55,
  wins: ['win4'], rail: 'stone', railTint: '#f1e9dc', pilaster: 99, cornice: 0.8, balDepth: 0.9,
  base: { kind: 'rustic', h: BASE_H, open: 3.7, tint: '#d9b7a2' },
  // piano nobile con balconi lunghi al centro, poi balconi alterni, in alto finestre
  balcony: (j, k, nb) => (k === 0 ? (j > 0 && j < nb - 1 && j % 4 !== 0 ? 'long' : 'balcony') : k === 1 ? (j % 2 ? 'balcony' : 'window') : 'window'),
  pediment: (j, k) => k === 0 || (k === 1 && j % 2 === 1),
})

/**
 * Costruisce Palazzo Ziino sul rettangolo di `plan.context.landmarks`, con gronda e colmo alle quote date.
 * @param {object} ctx contesto condiviso
 * @param {object} S accumuli, materiali, generatore
 * @param {number} G quota della strada (y)
 */
export function buildZiino(ctx, S, G) {
  const lm = ctx.plan.context.landmarks.find((l) => l.id === 'palazzo_ziino')
  const [x0, z0, x1, z1] = lm.rect
  const { B, M } = S
  palazzo(S, { r: lm.rect, y0: G, y1: lm.eavesY, st: ZIINO, faces: { '-z': 1, '+x': 1, '-x': 0, '+z': 0 } })
  // mensoline sotto il cornicione, sui due fronti in vista
  const c = shade(rgb(STONE), 0.95)
  for (let x = x0 + 0.3; x < x1; x += 0.75) B.box(M.plain, x, lm.eavesY - 0.5, z0 - 0.42, x + 0.22, lm.eavesY - 0.3, z0, { color: c, skip: '+y+z' })
  for (let z = z0 + 0.3; z < z1; z += 0.75) B.box(M.plain, x1, lm.eavesY - 0.5, z, x1 + 0.42, lm.eavesY - 0.3, z + 0.22, { color: c, skip: '+y-x' })
  hipRoof(S, lm.rect, lm.eavesY, lm.ridgeY, { tint: '#fff2ea', over: 0.8, extras: 1.6, trim: rgb(STONE) })
  // sul tetto: il piccolo volume rosso dell'altana e le parabole
  const cx = x0 + (x1 - x0) * 0.62
  const cz = (z0 + z1) / 2
  B.box(M.stucco, cx - 2.2, lm.ridgeY - 1.4, cz - 1.8, cx + 2.2, lm.ridgeY + 1.5, cz + 1.8, { color: '#b8614a', skip: '-y', su: 0.25 })
  B.box(M.plain, cx - 2.4, lm.ridgeY + 1.5, cz - 2, cx + 2.4, lm.ridgeY + 1.65, cz + 2, { color: '#a3553f' })
  for (const [dx, dz, a] of [[-9, -3, 0.5], [-6.5, -3.4, 0.2], [5, -3, -0.4], [7.5, 2.6, 2.6]]) {
    const y = lm.eavesY + 1.6
    _m.makeRotationY(a).multiply(_r.makeRotationX(1.1)).setPosition(cx + dx, y + 0.7, cz + dz)
    S.F.geo(M.plain, DISH, { m: _m, color: '#e8e8e4' })
    S.F.box(M.plain, cx + dx - 0.03, y - 0.6, cz + dz - 0.03, cx + dx + 0.03, y + 0.6, cz + dz + 0.03, { color: '#8d9296' })
  }
}
