/**
 * Tetti: falde in coppi con UV orientate lungo la pendenza, colmi, comignoli e lucernari;
 * tetti piani con parapetto, vano scala, serbatoi, antenne, unità esterne e pannelli.
 */
import * as THREE from 'three'
import { rgb, shade } from './exterior-util.js'
import { UV, PAL } from './exterior-mats.js'
import { cell } from './city-tex-atlas.js'

const CYL = new THREE.CylinderGeometry(1, 1, 1, 8)
const RIDGE = rgb('#b06a4c')
const CHIMNEY = rgb('#c9b9a2')
const METAL = rgb('#8d9296')
const TANKS = ['#3f6f9f', '#4a7fae', '#9aa0a4', '#b7b2a6']
const _m = new THREE.Matrix4()
const _x = new THREE.Vector3()
const _y = new THREE.Vector3()
const _z = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

const uvOf = (c) => [[c[0], c[1]], [c[2], c[1]], [c[2], c[3]], [c[0], c[3]]]

/** Falda di tre o quattro punti: normale verso l'alto, u lungo la gronda e v lungo la pendenza. */
function slope(S, pts, col) {
  const [a, b, c] = pts
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
  const l = Math.hypot(n[0], n[1], n[2]) * Math.sign(n[1] || 1)
  n = [n[0] / l, n[1] / l, n[2] / l]
  const P = l < 0 ? [...pts].reverse() : pts
  const el = Math.hypot(n[0], n[2]) || 1
  const e = [n[2] / el, -n[0] / el] // direzione orizzontale della gronda (x, z)
  const s = [(-n[1] * n[0]) / el, el, (-n[1] * n[2]) / el] // verso il colmo
  const k = UV.coppi
  const uv = P.map((q) => [(q[0] * e[0] + q[2] * e[1]) * k, (q[0] * s[0] + q[1] * s[1] + q[2] * s[2]) * k])
  if (P.length === 4) S.B.quad(S.M.tile, P, n, uv, col)
  else S.B.tri(S.M.tile, P[0], P[1], P[2], { uv, color: col })
}

/** Scatola orientata lungo un segmento nello spazio (colmi e displuvi). */
function beam(S, p, q, w, h, col) {
  _x.set(q[0] - p[0], q[1] - p[1], q[2] - p[2])
  const len = _x.length()
  _x.normalize()
  _z.crossVectors(_x, UP).normalize()
  _y.crossVectors(_z, _x)
  _m.makeBasis(_x, _y, _z).setPosition((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2)
  S.B.box(S.M.plain, -len / 2, -0.03, -w / 2, len / 2, h, w / 2, { m: _m, color: col, skip: '-y' })
}

/** Cilindro verticale (serbatoi, canne fumarie) nell'accumulo indicato. */
function cyl(B, mat, x, y, z, r, h, col) {
  B.geo(mat, CYL, { m: _m.makeScale(r, h, r).setPosition(x, y + h / 2, z), color: col })
}

/** Antenna: palo sottile con tre traverse, senza ombra. */
function antenna(S, x, y, z, h) {
  const c = shade(METAL, 0.8)
  S.F.box(S.M.plain, x - 0.025, y, z - 0.025, x + 0.025, y + h, z + 0.025, { color: c, skip: '-y' })
  for (let k = 0; k < 3; k++) {
    const yy = y + h - 0.25 - k * 0.32
    const w = 0.55 - k * 0.1
    S.F.box(S.M.plain, x - w, yy, z - 0.015, x + w, yy + 0.03, z + 0.015, { color: c })
  }
}

/** Comignolo in muratura con cappello. */
function chimney(S, x, y, z, h) {
  S.B.box(S.M.plain, x - 0.3, y - 0.5, z - 0.3, x + 0.3, y + h, z + 0.3, { color: CHIMNEY, skip: '-y' })
  S.B.box(S.M.plain, x - 0.4, y + h, z - 0.4, x + 0.4, y + h + 0.1, z + 0.4, { color: RIDGE })
}

/**
 * Tetto a padiglione in coppi su un rettangolo, con gronda, colmi, comignoli, lucernari e antenne.
 * @param {object} S accumuli, materiali, generatore
 * @param {number[]} r [x0, z0, x1, z1] della muratura
 * @param {number} yE quota di gronda @param {number} yR quota di colmo
 * @param {{tint?: string|number[], over?: number, extras?: number, trim?: number[]}} [o] `extras` da 0 (nudo) a 1
 */
export function hipRoof(S, r, yE, yR, o = {}) {
  const over = o.over ?? 0.45
  const [x0, z0, x1, z1] = [r[0] - over, r[1] - over, r[2] + over, r[3] + over]
  const w = x1 - x0
  const d = z1 - z0
  const half = Math.min(w, d) / 2
  const col = rgb(o.tint ?? '#ffffff')
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const c = [[x0, yE, z0], [x1, yE, z0], [x1, yE, z1], [x0, yE, z1]]
  const wide = w >= d
  const a = wide ? [x0 + half, yR, cz] : [cx, yR, z0 + half]
  const b = wide ? [x1 - half, yR, cz] : [cx, yR, z1 - half]
  if (wide) {
    slope(S, [c[0], c[1], b, a], col)
    slope(S, [c[2], c[3], a, b], col)
    slope(S, [c[3], c[0], a], col)
    slope(S, [c[1], c[2], b], col)
  } else {
    slope(S, [c[0], c[1], a], col)
    slope(S, [c[2], c[3], b], col)
    slope(S, [c[1], c[2], b, a], col)
    slope(S, [c[3], c[0], a, b], col)
  }
  S.B.box(S.M.plain, x0, yE - 0.14, z0, x1, yE, z1, { color: o.trim ?? rgb('#d8cdbb'), skip: '+y' }) // gronda
  const ex = o.extras ?? 0
  if (!ex) return
  const rc = shade(RIDGE, 0.9 + S.rand() * 0.2)
  beam(S, a, b, 0.26, 0.1, rc)
  for (const [p, q] of wide ? [[c[0], a], [c[3], a], [c[1], b], [c[2], b]] : [[c[0], a], [c[1], a], [c[2], b], [c[3], b]]) beam(S, p, q, 0.22, 0.08, rc)
  const hAt = (x, z) => yE + (Math.min(x - x0, x1 - x, z - z0, z1 - z, half) * (yR - yE)) / half
  const { rand } = S
  const n = Math.round(ex * (1 + rand() * 2))
  for (let k = 0; k < n; k++) {
    const x = x0 + w * (0.2 + rand() * 0.6)
    const z = z0 + d * (0.25 + rand() * 0.5)
    if (rand() < 0.6) chimney(S, x, hAt(x, z), z, 0.9 + rand() * 0.6)
    else antenna(S, x, hAt(x, z), z, 2.2 + rand() * 1.5)
  }
  if (rand() < 0.75 * ex && half > 3.5) { // lucernario o pannelli sulla falda più grande
    const lw = 1.4 + rand() * 1.6
    const u = (wide ? a[0] : a[2]) + ((wide ? b[0] - a[0] : b[2] - a[2]) - lw) * rand()
    const side = rand() < 0.5 ? 1 : -1
    const [t0, t1] = [half * 0.3, half * 0.7].map((t) => (side > 0 ? t : (wide ? d : w) - t))
    const P = (uu, t) => (wide ? [uu, hAt(uu, z0 + t) + 0.07, z0 + t] : [x0 + t, hAt(x0 + t, uu) + 0.07, uu])
    S.B.free(S.M.winOff, P(u, t0), P(u + lw, t0), P(u + lw, t1), P(u, t1), { up: true, uv: uvOf(cell(rand() < 0.6 ? 'sky' : 'solar')) })
  }
}

/**
 * Tetto piano: lastrico, parapetto con copertina e, secondo `clutter`, vano scala, serbatoi, antenne, macchine.
 * @param {object} S accumuli, materiali, generatore
 * @param {number[]} r [x0, z0, x1, z1] della muratura @param {number} y quota del lastrico
 * @param {{over?: number, parapet?: number, tint?: string, wall?: number[], clutter?: number, garden?: boolean}} [o]
 */
export function flatRoof(S, r, y, o = {}) {
  const { M, B, rand } = S
  const over = o.over ?? 0
  const [x0, z0, x1, z1] = r
  B.horiz(M.pave, x0 - over, z0 - over, x1 + over, z1 + over, y, true, { su: UV.paving, color: o.tint ?? PAL.roofFlat })
  const ph = o.parapet ?? 0.9
  const t = 0.22
  const wall = o.wall ?? rgb('#d9d2c4')
  if (ph) {
    const cap = shade(wall, 1.08)
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0 + t, x0 + t, z1 - t], [x1 - t, z0 + t, x1, z1 - t]]) {
      B.box(M.stucco, a, y, b, c, y + ph, d, { color: wall, skip: '+y-y', su: UV.stucco })
      B.horiz(M.plain, a - 0.03, b - 0.03, c + 0.03, d + 0.03, y + ph, true, { color: cap })
    }
  }
  const cl = o.clutter ?? 0
  const w = x1 - x0
  const d = z1 - z0
  if (!cl || w < 7 || d < 7) return
  const at = (m) => [x0 + m + rand() * (w - 2 * m), z0 + m + rand() * (d - 2 * m)]
  // vano scala con porta e cornice di gronda
  const [bx, bz] = at(3.2)
  B.box(M.stucco, bx - 1.6, y, bz - 2, bx + 1.6, y + 2.7, bz + 2, { color: wall, skip: '-y+y', su: UV.stucco })
  B.box(M.plain, bx - 1.75, y + 2.7, bz - 2.15, bx + 1.75, y + 2.85, bz + 2.15, { color: rgb(PAL.roofFlat) })
  const dc = cell('door')
  B.quad(M.winOff, [[bx - 0.45, y, bz + 2.02], [bx + 0.45, y, bz + 2.02], [bx + 0.45, y + 2, bz + 2.02], [bx - 0.45, y + 2, bz + 2.02]], [0, 0, 1], uvOf(dc))
  for (let k = 0; k < Math.round(cl * (1 + rand() * 2)); k++) { // serbatoi su basamento
    const [tx, tz] = at(1.5)
    B.box(M.plain, tx - 0.7, y, tz - 0.7, tx + 0.7, y + 0.35, tz + 0.7, { color: wall, skip: '-y' })
    cyl(B, M.plain, tx, y + 0.35, tz, 0.55, 1.25, rgb(TANKS[Math.floor(rand() * TANKS.length)]))
  }
  for (let k = 0; k < Math.round(cl * (1 + rand() * 3)); k++) { // unità esterne
    const [ax, az] = at(1)
    B.box(M.plain, ax - 0.45, y + 0.1, az - 0.2, ax + 0.45, y + 0.8, az + 0.2, { color: rgb('#d5d6d3') })
  }
  for (let k = 0; k < Math.round(cl * (1 + rand() * 2)); k++) {
    const [ax, az] = at(0.8)
    antenna(S, ax, y, az, 2.6 + rand() * 1.8)
  }
  if (rand() < 0.5 * cl) { // canna fumaria in lamiera
    const [fx, fz] = at(1)
    cyl(S.F, M.plain, fx, y, fz, 0.09, 2.2 + rand(), METAL)
  }
  if (rand() < 0.45 * cl) { // pannelli inclinati
    const [sx, sz] = at(2.5)
    const c = uvOf(cell('solar'))
    for (let k = 0; k < 3; k++) {
      const zz = sz + k * 1.3 - 1.3
      B.free(M.winOff, [sx - 1.6, y + 0.25, zz], [sx + 1.6, y + 0.25, zz], [sx + 1.6, y + 0.85, zz + 0.9], [sx - 1.6, y + 0.85, zz + 0.9], { up: true, uv: c })
    }
  }
  if (o.garden) garden(S, r, y + 0.02)
}

/** Giardino pensile: pergola leggera, vasi e siepi lungo il parapetto (masse verdi squadrate). */
function garden(S, r, y) {
  const { M, B, rand } = S
  const [x0, z0, x1] = r
  const green = ['#4f7a3c', '#5d8a45', '#3f6a35', '#6b9450']
  for (let x = x0 + 0.6; x < x1 - 1.2; x += 1.1 + rand() * 0.9) {
    const h = 0.5 + rand() * 0.9
    const wd = 0.5 + rand() * 0.5
    B.box(M.plain, x, y, z0 + 0.3, x + wd, y + 0.45, z0 + 0.75, { color: rgb('#a8623e'), skip: '-y' })
    B.box(M.leaf, x - 0.1, y + 0.4, z0 + 0.22, x + wd + 0.1, y + 0.4 + h, z0 + 0.85, { color: green[Math.floor(rand() * green.length)], skip: '-y', su: 0.5 })
  }
  const px = x0 + 2 + rand() * 3
  const c = rgb('#e9e6de')
  for (const [dx, dz] of [[0, 1.2], [4, 1.2], [0, 4.2], [4, 4.2]]) S.F.box(M.plain, px + dx, y, z0 + dz, px + dx + 0.09, y + 2.4, z0 + dz + 0.09, { color: c })
  for (let k = 0; k <= 5; k++) S.F.box(M.plain, px - 0.2, y + 2.4, z0 + 1.2 + k * 0.6, px + 4.3, y + 2.47, z0 + 1.26 + k * 0.6, { color: c })
}
