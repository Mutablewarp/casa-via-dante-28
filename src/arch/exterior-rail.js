/** Ringhiere a bacchette (terrazza, balcone) e vetrata del giardino d'inverno. */
import * as THREE from 'three'
import { Batch, instanced } from './exterior-util.js'

const RAIL_H = 1.05 // altezza ringhiera (m)
const BAR_STEP = 0.11 // passo bacchette
const BAR_W = 0.015
const HANDRAIL = { w: 0.06, h: 0.03 }
const LOW_RAIL = { y: 0.08, h: 0.05, t: 0.03 }
const POST = 0.05
const POST_MAX_GAP = 2.2
const VER = { parapet: 0.9, glassTop: 2.7, transom: 2.1, mullion: 0.04, bay: 0.8, thick: 0.12, arch: 0.14, archBase: 2.4 }

/** Segmento allineato agli assi: lunghezza, origine e funzione che crea un box in coordinate locali. */
function seg(s) {
  const [x0, z0, x1, z1] = s
  const alongX = x0 !== x1
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1)
  const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1)
  const c = alongX ? z0 : x0
  const box = (b, mat, p0, p1, y0, y1, t, o = {}) =>
    alongX ? b.box(mat, p0, y0, c - t / 2, p1, y1, c + t / 2, o) : b.box(mat, c - t / 2, y0, p0, c + t / 2, y1, p1, o)
  return { alongX, a0, a1, c, len: a1 - a0, box }
}

/** Ringhiera: bacchette istanziate, corrente basso, pali e corrimano. */
function railing(ctx, s, rails, hand, bars) {
  const { a0, a1, c, len, alongX, box } = seg(s)
  const mRail = ctx.mat.fixed('railing')
  const mHand = ctx.mat.fixed('handrail')
  const n = Math.max(1, Math.round(len / BAR_STEP))
  const step = len / n
  for (let k = 1; k < n; k++) {
    const a = a0 + step * k
    bars.push({ p: alongX ? [a, (LOW_RAIL.y + LOW_RAIL.h + RAIL_H - HANDRAIL.h) / 2, c] : [c, (LOW_RAIL.y + LOW_RAIL.h + RAIL_H - HANDRAIL.h) / 2, a] })
  }
  box(rails, mRail, a0, a1, LOW_RAIL.y, LOW_RAIL.y + LOW_RAIL.h, LOW_RAIL.t)
  box(hand, mHand, a0, a1, RAIL_H - HANDRAIL.h, RAIL_H, HANDRAIL.w)
  const posts = Math.max(1, Math.ceil(len / POST_MAX_GAP))
  for (let k = 0; k <= posts; k++) {
    const a = a0 + (len * k) / posts
    box(rails, mRail, a - POST / 2, a + POST / 2, 0, RAIL_H - HANDRAIL.h, POST)
  }
}

/** Matrice di un pezzo inclinato (arco): origine al centro, asse locale x lungo il segmento. */
function pieceMatrix(alongX, mid, angle) {
  const s = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const n = new THREE.Vector3().crossVectors(s, up)
  const rot = new THREE.Matrix4().makeRotationZ(angle)
  return new THREE.Matrix4().makeBasis(s, up, n).multiply(rot).setPosition(mid)
}

/** Vetrata del giardino d'inverno: parapetto, fascia, montanti, traverso, vetro e archetti Liberty. */
function veranda(ctx, s, B) {
  const { a0, a1, c, len, alongX, box } = seg(s)
  const H = ctx.plan.meta.ceilingHeight
  const mFacade = ctx.mat.fixed('facade')
  const mFrame = ctx.mat.fixed('verandaFrame')
  const mGlass = ctx.mat.fixed('glass')
  box(B.solid, mFacade, a0, a1, 0, VER.parapet, VER.thick)
  box(B.solid, mFacade, a0, a1, VER.glassTop, H, VER.thick)
  const bays = Math.max(1, Math.round(len / VER.bay))
  const bw = len / bays
  for (let k = 0; k <= bays; k++) {
    const a = a0 + bw * k
    box(B.frame, mFrame, a - VER.mullion / 2, a + VER.mullion / 2, VER.parapet, VER.glassTop, VER.mullion)
  }
  box(B.frame, mFrame, a0, a1, VER.transom - VER.mullion / 2, VER.transom + VER.mullion / 2, VER.mullion)
  box(B.frame, mFrame, a0, a1, VER.parapet, VER.parapet + VER.mullion, VER.mullion)
  box(B.frame, mFrame, a0, a1, VER.glassTop - VER.mullion, VER.glassTop, VER.mullion)
  // vetro: un quad per lato, così si vede da dentro e da fuori
  const y0 = VER.parapet + VER.mullion
  const y1 = VER.glassTop - VER.mullion
  const e = 0.002
  if (alongX) {
    B.glass.wall(mGlass, 0, 1, a0, c + e, a1, c + e, y0, y1)
    B.glass.wall(mGlass, 0, -1, a0, c - e, a1, c - e, y0, y1)
  } else {
    B.glass.wall(mGlass, 1, 0, c + e, a0, c + e, a1, y0, y1)
    B.glass.wall(mGlass, -1, 0, c - e, a0, c - e, a1, y0, y1)
  }
  // archetti ribassati in cima a ogni campata (solo Liberty): segmenti inclinati dello stesso profilato
  const parts = 8
  for (let k = 0; k < bays; k++) {
    for (let i = 0; i < parts; i++) {
      const ta = i / parts
      const tb = (i + 1) / parts
      const pt = (t) => [a0 + bw * (k + t), VER.archBase + VER.arch * (1 - (2 * t - 1) ** 2)]
      const [pa, ya] = pt(ta)
      const [pb, yb] = pt(tb)
      const dl = Math.hypot(pb - pa, yb - ya) + 0.01
      const mid = alongX ? new THREE.Vector3((pa + pb) / 2, (ya + yb) / 2, c) : new THREE.Vector3(c, (ya + yb) / 2, (pa + pb) / 2)
      const m = pieceMatrix(alongX, mid, Math.atan2(yb - ya, pb - pa))
      B.arch.box(mFrame, -dl / 2, -VER.mullion / 2, -VER.mullion / 2, dl / 2, VER.mullion / 2, VER.mullion / 2, { m })
    }
  }
}

/**
 * Costruisce ringhiere e vetrata degli spazi esterni in `ctx.groups.exterior`.
 * Gli archetti della vetrata compaiono solo in stile Liberty (si accendono al `style:changed`).
 * @param {object} ctx contesto condiviso
 */
export function buildRailings(ctx) {
  const rails = new Batch()
  const hand = new Batch()
  const bars = []
  const B = { solid: new Batch(), frame: new Batch(), glass: new Batch(), arch: new Batch() }
  for (const sp of ctx.plan.outdoor) {
    for (const s of sp.railings) {
      if (sp.enclosure === 'ringhiera') railing(ctx, s, rails, hand, bars)
      else if (sp.enclosure === 'veranda') veranda(ctx, s, B)
    }
  }
  const g = ctx.groups.exterior
  rails.build(g, { cast: true, name: 'railing' })
  hand.build(g, { cast: true, name: 'handrail' })
  B.solid.build(g, { cast: true, name: 'veranda-solid' })
  B.frame.build(g, { cast: true, name: 'veranda-frame' })
  B.glass.build(g, { cast: false, receive: false, name: 'veranda-glass' })
  const archGroup = new THREE.Group()
  archGroup.name = 'veranda-arches'
  B.arch.build(archGroup, { cast: true, name: 'veranda-arch' })
  g.add(archGroup)
  const barLen = RAIL_H - HANDRAIL.h - LOW_RAIL.y - LOW_RAIL.h
  const geo = new THREE.BoxGeometry(BAR_W, barLen, BAR_W)
  for (const b of bars) b.p[1] = LOW_RAIL.y + LOW_RAIL.h + barLen / 2
  g.add(instanced(geo, ctx.mat.fixed('railing'), bars, { cast: true, name: 'railing-bars' }))
  archGroup.visible = ctx.state.style === 'liberty'
  ctx.events.on('style:changed', ({ style }) => {
    archGroup.visible = style === 'liberty'
  })
}
